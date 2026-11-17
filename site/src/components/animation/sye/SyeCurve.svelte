<script lang="ts">
  /**
   * FIG A：Terminal-Bench 3.0 的投入程度曲线。
   *
   * 原站这张图是构建期就渲染好的静态 SVG，宽版窄版各一份，靠 CSS 断点切换。
   * 这里把两份 SVG 的元素树（坐标、路径、文字）原样抽进 curve.json，运行时按树重建，
   * 图内标签译成中文，坐标轴刻度、点位和路径逐字保留。宽版 640px 以下换窄版，和原站一致。
   *
   * 右上角的 png 按钮把当前可见的那张 SVG 拼成一张带标题栏的 PNG 下载：
   * 标题、副标题按显式文字重新排版，SVG 里的 CSS 变量先按计算值展开，
   * 背景取页面底色，最后以两倍分辨率画进 canvas，行为和原站的 ChartDownload 一致。
   */
  import { onMount } from 'svelte';

  import { withBase } from '@/lib/format';

  import type { AnimationProps } from '../mount';
  import './base.css';
  import './charts/curve.css';

  interface SvgNode {
    tag: string;
    attrs: Record<string, string>;
    text: string;
    children: SvgNode[];
  }

  interface CurveData {
    title: string;
    subtitle: { zh: string; en: string };
    download: { label: string; aria: string; file: string };
    aria: { zh: string; en: string };
    caption: { zh: string; en: string };
    wide: SvgNode;
    narrow: SvgNode;
  }

  interface TextBlock {
    lines: string[];
    size: number;
    lh: number;
    color: string;
    weight: string;
    family: string;
  }

  const { config = {} }: AnimationProps = $props();
  // 这个图不需要配置项，读一次让挂载层传进来的值有响应式身份
  $effect(() => {
    void config;
  });

  let data = $state<CurveData | null>(null);
  let error = $state('');
  let busy = $state(false);
  let figureEl = $state<HTMLDivElement>();

  /** SVG 元素树 → 一串标记。树是静态数据，直接拼字符串比递归渲染省事，也不用管命名空间。 */
  function toMarkup(node: SvgNode): string {
    const attrs = Object.entries(node.attrs)
      .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
      .join('');
    const inner = `${node.text ? escapeXml(node.text) : ''}${node.children.map(toMarkup).join('')}`;
    return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
  }

  function escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const markup = $derived(data ? toMarkup(data.wide) + toMarkup(data.narrow) : '');

  onMount(() => {
    let cancelled = false;
    fetch(withBase('/data/spending-your-effort/charts/curve.json'))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CurveData>;
      })
      .then((json) => {
        if (!cancelled) data = json;
      })
      .catch(() => {
        if (!cancelled) error = '这张图的数据没能加载，刷新页面再试一次。';
      });
    return () => {
      cancelled = true;
    };
  });

  /** 原站做法：在克隆的 SVG 树上把 style 里的 var(--x) 逐个换成源元素的计算值。 */
  function resolveVars(source: Element, clone: Element): void {
    const style = clone.getAttribute('style');
    if (style?.includes('var(')) {
      const computed = getComputedStyle(source);
      clone.setAttribute(
        'style',
        style.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (whole, name: string) => {
          return computed.getPropertyValue(name).trim() || whole;
        }),
      );
    }
    for (let index = 0; index < source.children.length; index += 1) {
      resolveVars(source.children[index], clone.children[index]);
    }
  }

  /** 把一段文字按容器宽度折行，尺寸按 SVG 缩放比换算。 */
  function measureText(element: Element | null, text: string, maxWidth: number, scale: number): TextBlock | null {
    if (!element || !text) return null;
    const computed = getComputedStyle(element);
    const baseSize = parseFloat(computed.fontSize);
    const size = baseSize * scale;
    const lh = (parseFloat(computed.lineHeight) || 1.35 * baseSize) * scale;
    const context = document.createElement('canvas').getContext('2d');
    const lines: string[] = [];
    if (context) {
      context.font = `${computed.fontWeight} ${size}px ${computed.fontFamily}`;
      let line = '';
      for (const word of text.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
    } else {
      lines.push(text);
    }
    return { lines, size, lh, color: computed.color, weight: computed.fontWeight, family: computed.fontFamily };
  }

  function textBlock(block: TextBlock, x: number, y: number): string {
    return block.lines
      .map((line, index) => {
        const lineY = y + index * block.lh + block.lh / 2 + 0.35 * block.size;
        const family = block.family.replace(/"/g, "'");
        return `<text x="${x}" y="${lineY.toFixed(1)}" font-size="${block.size}" font-weight="${block.weight}" style="fill:${block.color};font-family:${family}">${escapeXml(line)}</text>`;
      })
      .join('');
  }

  function pageBackground(): string {
    for (const element of [document.body, document.documentElement]) {
      const background = getComputedStyle(element).backgroundColor;
      if (background && background !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(background)) return background;
    }
    return '#fff';
  }

  function rasterize(svgText: string, width: number, height: number, file: string): Promise<void> {
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    return (async () => {
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 2 * width;
        canvas.height = 2 * height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('no 2d context');
        // 原站画两遍并中间等 300ms：第一遍字体可能还没就位
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        await new Promise((resolve) => setTimeout(resolve, 300));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed');
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${file}.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
  }

  async function downloadPng(): Promise<void> {
    const figure = figureEl;
    const current = data;
    if (!figure || !current || busy) return;
    busy = true;
    try {
      const source = [...figure.querySelectorAll<SVGSVGElement>('.fig-draw svg')].find(
        (svg) => svg.getBoundingClientRect().width > 0,
      );
      if (!source) throw new Error('no visible drawing');

      const viewBox = source.viewBox.baseVal;
      const rect = source.getBoundingClientRect();
      const scale = viewBox.width / rect.width;
      const padValue = parseFloat(getComputedStyle(figure).getPropertyValue('--fig-pad')) || 16;
      const pad = padValue * scale;
      const lang = document.documentElement.dataset.paperLang === 'en' ? 'en' : 'zh';

      const clone = source.cloneNode(true) as SVGSVGElement;
      resolveVars(source, clone);
      clone.style.color = getComputedStyle(source).color;
      // 导出文件里没有站内样式表，字体族要挂到根节点上继承
      clone.setAttribute('font-family', getComputedStyle(source).fontFamily);

      const titleEl = figure.querySelector('.fig-title');
      const subEl = figure.querySelector('.fig-sub');
      const headEl = figure.querySelector('.fig-head');

      let cursor = pad;
      let head = '';
      const title = measureText(titleEl, current.title, viewBox.width, scale);
      if (title) {
        head += textBlock(title, pad, cursor);
        cursor += title.lines.length * title.lh;
      }
      const sub = measureText(subEl, current.subtitle[lang], viewBox.width, scale);
      if (sub && subEl) {
        const marginTop = (parseFloat(getComputedStyle(subEl).marginTop) || 0) * scale;
        head += textBlock(sub, pad, cursor + marginTop);
        cursor += marginTop + sub.lines.length * sub.lh;
      }
      if (headEl) {
        cursor += Math.max(0, rect.top - headEl.getBoundingClientRect().bottom) * scale;
      }

      clone.removeAttribute('aria-hidden');
      clone.removeAttribute('focusable');
      clone.setAttribute('x', String(pad));
      clone.setAttribute('y', cursor.toFixed(1));
      clone.setAttribute('width', String(viewBox.width));
      clone.setAttribute('height', String(viewBox.height));

      const width = Math.ceil(viewBox.width + 2 * pad);
      const height = Math.ceil(cursor + viewBox.height + pad);
      const svgText =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<rect width="100%" height="100%" fill="${pageBackground()}"/>` +
        head +
        new XMLSerializer().serializeToString(clone) +
        '</svg>';

      await rasterize(svgText, width, height, current.download.file);
    } catch {
      // 下载失败不打断阅读，按钮状态复位即可
    } finally {
      busy = false;
    }
  }
</script>

<div class="sye-demo sye-curve" bind:this={figureEl}>
  {#if error}
    <p class="sye-curve-error">{error}</p>
  {:else if data}
    <div class="fig-head">
      <div class="fig-head-row">
        <div class="fig-title">{data.title}</div>
        <button
          type="button"
          class="fig-dl"
          aria-busy={busy || undefined}
          aria-label={data.download.aria}
          onclick={downloadPng}
        >
          {data.download.label}
        </button>
      </div>
      <div class="fig-sub">
        <span class="sye-zh">{data.subtitle.zh}</span><span class="sye-en" lang="en">{data.subtitle.en}</span>
      </div>
    </div>
    <div class="fig-draw" role="img" aria-label={data.aria.zh}>
      {@html markup}
    </div>
    <div class="sye-cap">
      <b>FIG A</b>
      <span class="sye-cap-text">
        <span class="sye-zh">{data.caption.zh}</span><span class="sye-en" lang="en">{data.caption.en}</span>
      </span>
    </div>
  {/if}
</div>
