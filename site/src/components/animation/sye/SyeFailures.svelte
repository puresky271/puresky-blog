<script lang="ts">
  /**
   * FIG B：Terminal-Bench 3.0 每次尝试的失败原因方阵。
   *
   * 左格固定是低档，右格跟着上方的档位滑块走。每个模型有 7 到 8 个档位，
   * 方阵按失败种类从上到下着色（通过、漏掉情况的四种、判断错了的四种、其他），每格是一次尝试。
   * 点模型标签切换模型，拖滑块换右格的档位，重播把右格从低档一路推到最高档，
   * 鼠标停在格子上显示这一次具体败在哪，方向键可以在方阵里走。
   *
   * 布局全部按原站公式算：先按容器宽度定列数（最多 20 列）和格子边长，再按最长的一档
   * （370 次尝试）铺格子，尝试次数不足 370 的档位尾部留空格。图例按宽度分两栏或一栏，
   * 计数显示「低档 → 当前档」。数据、失败种类目录、每次尝试的单元格计数都在 failures.json 里。
   */
  import { onMount } from 'svelte';

  import { withBase } from '@/lib/format';

  import type { AnimationProps } from '../mount';
  import './base.css';
  import './charts/failures.css';

  interface Setting {
    model: string;
    order: number;
    raw: string;
    label: string | null;
    attempts: number;
    passes: number;
    medianTokens: number;
    counts: Record<string, number>;
  }

  interface FailureTask {
    title: string;
    cells: Record<string, [number, number]>;
  }

  interface Kind {
    id: string;
    fam: string;
    color: string;
    label: { en: string; zh: string };
    detail: { en: string; zh: string } | null;
  }

  interface FailuresData {
    models: string[];
    settings: Setting[];
    tasks: FailureTask[];
    kinds: Kind[];
    families: { id: string; label: { en: string; zh: string } }[];
    labels: { effort: string; replay: string; model: string; attempt: string; medianEach: string; tokens: string };
    caption: { zh: string; en: string };
    aria: { zh: string; en: string };
  }

  interface Layout {
    W: number;
    PAD: number;
    wide: boolean;
    each: number;
    cols: number;
    c: number;
    gw: number;
    gh: number;
    xl: number;
    xr: number;
    y0: number;
  }

  interface LegendRow {
    kind: 'band' | 'family';
    id: string;
    x0: number;
    x1: number;
    y: number;
  }

  interface Legend {
    top: number;
    rows: LegendRow[];
    height: number;
  }

  interface Hover {
    p: number;
    i: number;
    key: boolean;
  }

  interface TipInfo {
    kind: 'passed' | 'failure';
    title?: string;
    passed?: number;
    total: number;
    label?: string;
    family?: string;
    detail?: string;
    count?: number;
    setting: string;
    lowCount?: number;
  }

  const { config = {} }: AnimationProps = $props();
  // 这个图不需要配置项，读一次让挂载层传进来的值有响应式身份
  $effect(() => {
    void config;
  });

  const uid = $props.id();

  /** 档位名的中文写法 */
  const EFFORT_ZH: Record<string, string> = {
    low: '低档',
    medium: '中档',
    high: '高档',
    xhigh: '超高档',
    max: '最高档',
  };

  /** 键盘在方阵里走：左右一格，上下换行 */
  const KEY_STEP: Record<string, (cols: number) => number> = {
    ArrowRight: () => 1,
    ArrowLeft: () => -1,
    ArrowDown: (cols: number) => cols,
    ArrowUp: (cols: number) => -cols,
  };

  let data = $state<FailuresData | null>(null);
  let error = $state('');
  let model = $state('');
  let index = $state(0);
  let playing = $state(false);
  let progress = $state(1);
  let hover = $state<Hover | null>(null);
  let measuredWidth = $state(658);
  let tipLeft = $state('0px');
  let tipTop = $state('0px');

  let rootEl = $state<HTMLDivElement>();
  let chartEl = $state<HTMLDivElement>();
  let svgEl = $state<SVGSVGElement>();
  let tipEl = $state<HTMLDivElement>();
  let panelEls = $state<SVGGElement[]>([]);

  let cursors: [number, number] = [0, 0];
  let frame = 0;

  onMount(() => {
    let cancelled = false;
    fetch(withBase('/data/spending-your-effort/charts/failures.json'))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<FailuresData>;
      })
      .then((json) => {
        if (cancelled) return;
        data = json;
        model = json.models[0];
        index = json.settings.filter((setting) => setting.model === json.models[0]).length - 1;
      })
      .catch(() => {
        if (!cancelled) error = '这张图的数据没能加载，刷新页面再试一次。';
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  });

  const settings = $derived(
    data ? data.settings.filter((setting) => setting.model === model).sort((a, b) => a.order - b.order) : [],
  );
  const lastIndex = $derived(Math.max(0, settings.length - 1));
  const clamped = $derived(Math.min(lastIndex, Math.max(0, index)));
  /** 播放时右格的档位是 0 → 当前档的插值，停了就是滑块上的档位 */
  const current = $derived(playing ? Math.round(progress * clamped) : clamped);
  const isLow = $derived(current === 0);
  const leftSetting = $derived(settings[0]);
  const rightSetting = $derived(settings[current]);
  const maxAttempts = $derived(data ? Math.max(...data.settings.map((setting) => setting.attempts)) : 370);
  const width = $derived(Math.max(300, Math.round(measuredWidth)));
  const layout = $derived(computeLayout(width, maxAttempts));
  const legend = $derived(computeLegend(layout, data?.kinds ?? []));
  const bands = $derived<number[][]>([
    leftSetting ? bandIndexes(leftSetting, data?.kinds ?? [], maxAttempts) : [],
    rightSetting ? bandIndexes(rightSetting, data?.kinds ?? [], maxAttempts) : [],
  ]);
  /** 通过格按任务排：同一个任务占连续的若干格，能看到哪几个任务拖了后腿 */
  const passedOrder = $derived<number[][]>([
    leftSetting ? sortPassed(leftSetting) : [],
    rightSetting ? sortPassed(rightSetting) : [],
  ]);
  const modelIndex = $derived(data ? data.models.indexOf(model) : 0);

  function computeLayout(containerWidth: number, attempts: number): Layout {
    const wide = containerWidth >= 560;
    const each = Math.floor((containerWidth - 32 - (wide ? 40 : 20)) / 2);
    const cols = Math.min(20, Math.floor((each + 2) / 11));
    const c = Math.min(14, Math.floor((each + 2) / cols));
    const gw = cols * c - 2;
    const gh = Math.ceil(attempts / cols) * c - 2;
    return {
      W: containerWidth,
      PAD: 16,
      wide,
      each,
      cols,
      c,
      gw,
      gh,
      xl: 16,
      xr: containerWidth - 16 - gw,
      y0: 64,
    };
  }

  function computeLegend(currentLayout: Layout, kinds: Kind[]): Legend {
    const base = currentLayout.y0 + currentLayout.gh + 34;
    const rows: LegendRow[] = [];
    const make = (x0: number, x1: number) => ({ x0, x1, y: base });
    const band = (pos: { x0: number; x1: number; y: number }, id: string) => {
      rows.push({ kind: 'band', id, x0: pos.x0, x1: pos.x1, y: pos.y });
      pos.y += 25;
    };
    const family = (pos: { x0: number; x1: number; y: number }, id: string) => {
      if (pos.y > base) pos.y += 6;
      rows.push({ kind: 'family', id, x0: pos.x0, x1: pos.x1, y: pos.y });
      pos.y += 23;
      for (const kind of kinds) {
        if (kind.fam === id) band(pos, kind.id);
      }
    };
    let bottom: number;
    if (currentLayout.wide) {
      const left = make(currentLayout.xl, currentLayout.xl + currentLayout.gw);
      const right = make(currentLayout.xr, currentLayout.W - currentLayout.PAD);
      band(left, 'passed');
      family(left, 'missedCase');
      left.y += 6;
      band(left, 'other');
      family(right, 'wrongCall');
      bottom = Math.max(left.y, right.y);
    } else {
      const column = make(currentLayout.PAD, currentLayout.W - currentLayout.PAD);
      band(column, 'passed');
      family(column, 'missedCase');
      family(column, 'wrongCall');
      column.y += 6;
      band(column, 'other');
      bottom = column.y;
    }
    return { top: base, rows, height: Math.ceil(bottom - 25 + 8 + currentLayout.PAD) };
  }

  /** 每个格子属于第几种失败：按通过 → 漏掉情况四种 → 判断错了四种 → 其他的累计数量切段 */
  function bandIndexes(setting: Setting, kinds: Kind[], attempts: number): number[] {
    const ids = kinds.map((kind) => kind.id);
    const out: number[] = [];
    let band = 0;
    let threshold = setting.counts[ids[0]] ?? 0;
    for (let cell = 0; cell < attempts; cell += 1) {
      while (band < ids.length && cell >= threshold) {
        band += 1;
        if (band < ids.length) threshold += setting.counts[ids[band]] ?? 0;
      }
      out.push(band < ids.length ? band : -1);
    }
    return out;
  }

  /** 通过格对应的任务序号，按该任务通过次数从多到少排 */
  function sortPassed(setting: Setting): number[] {
    if (!data) return [];
    const entries: { index: number; times: number; title: string }[] = [];
    data.tasks.forEach((task, taskIndex) => {
      const cell = task.cells[`${setting.model}|${setting.order}`];
      if (cell && cell[0] > 0) entries.push({ index: taskIndex, times: cell[0], title: task.title });
    });
    entries.sort((a, b) => b.times - a.times || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
    const out: number[] = [];
    for (const entry of entries) {
      for (let repeat = 0; repeat < entry.times; repeat += 1) out.push(entry.index);
    }
    return out;
  }

  function formatTokens(value: number): string {
    return value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : `${Math.round(value / 1e3)}k`;
  }

  /**
   * 这一档自己的名字。原站同一个名字出现多次时，只有最后一次算「有名字」，
   * 前面的同名档位退化成无名刻度（比如 Opus 5 的 effort-120 和 max 都叫 max）。
   */
  function namedOf(list: Setting[], position: number): string | null {
    const setting = list[position];
    if (!setting?.label) return null;
    for (let cursor = position + 1; cursor < list.length; cursor += 1) {
      if (list[cursor].label === setting.label) return null;
    }
    return setting.label;
  }

  /** 有名字的档位写中文名，没名字写「介于 X 和 Y 之间」 */
  function effortName(list: Setting[], position: number): string {
    if (!list[position]) return '';
    const own = namedOf(list, position);
    if (own) return EFFORT_ZH[own] ?? own;
    let low = '';
    let high = '';
    for (let cursor = position - 1; cursor >= 0 && !low; cursor -= 1) low = namedOf(list, cursor) ?? '';
    for (let cursor = position + 1; cursor < list.length && !high; cursor += 1) high = namedOf(list, cursor) ?? '';
    const lowName = low ? (EFFORT_ZH[low] ?? low) : '';
    const highName = high ? (EFFORT_ZH[high] ?? high) : '';
    return `介于${lowName}和${highName}之间`;
  }

  function headingOf(setting: Setting, position: number): { title: string; sub: string; size: number } {
    const own = namedOf(settings, position);
    const named = own ? (EFFORT_ZH[own] ?? own) : null;
    const title = named ? `${setting.model} ${named}` : setting.model;
    const size = Math.max(12, Math.min(18, Math.floor((layout.each - 16) / (0.54 * title.length))));
    if (!named) return { title, sub: effortName(settings, position), size };
    const tokens = formatTokens(setting.medianTokens);
    const sub = layout.wide ? `${setting.attempts} 次尝试，每次中位 ${tokens} token` : `${tokens} token`;
    return { title, sub, size };
  }

  function panelAria(position: number, setting: Setting): string {
    return `${setting.model}，${effortName(settings, position)}，${setting.attempts} 次尝试。方向键在方格之间移动。`;
  }

  function sideX(panel: number): number {
    return panel === 0 ? layout.xl : layout.xr;
  }

  /** 图例一行的两个计数。通过以外的家族会比 low → 当前，变多时数字加粗 */
  function rowCounts(id: string): { low: number; current: number; family: string } {
    return {
      low: leftSetting?.counts[id] ?? 0,
      current: rightSetting?.counts[id] ?? 0,
      family: data?.kinds.find((kind) => kind.id === id)?.fam ?? '',
    };
  }

  const srText = $derived.by(() => {
    if (!data || !leftSetting || !rightSetting) return '';
    const describe = (setting: Setting, position: number) => {
      const counts = data?.kinds.map((kind) => `${setting.counts[kind.id]} ${kind.label.zh}`).join('，') ?? '';
      return `${setting.model} ${effortName(settings, position)}：${counts}，共 ${setting.attempts} 次尝试。`;
    };
    return `${describe(leftSetting, 0)} ${describe(rightSetting, current)}`;
  });

  const highlights = $derived.by(() => {
    const active = hover;
    if (!active) return [] as { p: number; i: number }[];
    const order = passedOrder[active.p];
    const band = bands[active.p]?.[active.i];
    if (band === 0 && order) {
      const task = order[active.i];
      const out: { p: number; i: number }[] = [];
      order.forEach((value, cell) => {
        if (value === task) out.push({ p: active.p, i: cell });
      });
      return out;
    }
    return active.key ? [{ p: active.p, i: active.i }] : [];
  });

  const tip = $derived.by<TipInfo | null>(() => {
    const active = hover;
    if (!active || !data) return null;
    const setting = settings[active.p];
    const band = bands[active.p]?.[active.i];
    if (!setting || band === undefined || band < 0) return null;
    const kind = data.kinds[band];
    if (!kind) return null;
    const own = namedOf(settings, active.p);
    const named = own ? (EFFORT_ZH[own] ?? own) : null;
    const at = named ?? `档位 ${setting.raw}`;
    if (kind.id === 'passed') {
      const taskIndex = passedOrder[active.p][active.i];
      const task = data.tasks[taskIndex];
      const cell = task?.cells[`${setting.model}|${setting.order}`];
      if (!task || !cell) return null;
      return { kind: 'passed', title: task.title, passed: cell[0], total: cell[1], setting: at };
    }
    const family = data.families.find((entry) => entry.id === kind.fam);
    const info: TipInfo = {
      kind: 'failure',
      total: setting.attempts,
      label: kind.label.zh,
      family: family?.label.zh,
      detail: kind.detail?.zh,
      count: setting.counts[kind.id] ?? 0,
      setting: at,
    };
    if (active.p === 1 && !isLow) info.lowCount = leftSetting?.counts[kind.id] ?? 0;
    return info;
  });

  function stop(): void {
    cancelAnimationFrame(frame);
    playing = false;
    progress = 1;
  }

  function play(): void {
    hover = null;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(frame);
    playing = true;
    progress = 0;
    const start = performance.now();
    const duration = 2800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      progress = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      if (t < 1) frame = requestAnimationFrame(tick);
      else playing = false;
    };
    frame = requestAnimationFrame(tick);
  }

  function selectModel(next: string): void {
    if (next === model || !data) return;
    stop();
    model = next;
    index = data.settings.filter((setting) => setting.model === next).length - 1;
    hover = null;
    cursors = [0, 0];
  }

  function onEffort(event: Event): void {
    stop();
    index = Number((event.currentTarget as HTMLInputElement).value);
    hover = null;
  }

  function locate(event: PointerEvent): Hover | null {
    const svg = svgEl;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return null;
    const scale = layout.W / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    for (const panel of [0, 1]) {
      const localX = x - sideX(panel);
      const localY = y - layout.y0;
      if (localX < 0 || localY < 0 || localX >= layout.cols * layout.c || localY >= layout.gh + 2) continue;
      const cell = Math.floor(localY / layout.c) * layout.cols + Math.floor(localX / layout.c);
      return (bands[panel]?.[cell] ?? -1) >= 0 ? { p: panel, i: cell, key: false } : null;
    }
    return null;
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const next = locate(event);
    if (next) {
      cursors[next.p] = next.i;
      if (hover && hover.p === next.p && hover.i === next.i && !hover.key) return;
      hover = next;
      return;
    }
    const active = hover;
    hover = active?.key ? active : null;
  }

  function onPointerDown(event: PointerEvent): void {
    const next = locate(event);
    if (next) {
      cursors[next.p] = next.i;
      hover = next;
    }
  }

  function onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    hover = hover?.key ? hover : null;
  }

  function onPointerCancel(): void {
    hover = hover?.key ? hover : null;
  }

  function onPanelKey(panel: number, event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      hover = null;
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const max = settings[panel].attempts - 1;
    let position = cursors[panel];
    const step = KEY_STEP[event.key];
    if (step) position += step(layout.cols);
    else if (event.key === 'Home') position = 0;
    else if (event.key === 'End') position = max;
    else return;
    event.preventDefault();
    position = Math.max(0, Math.min(max, position));
    cursors[panel] = position;
    hover = { p: panel, i: position, key: true };
  }

  function onPanelFocus(panel: number): void {
    const position = Math.min(cursors[panel], settings[panel].attempts - 1);
    cursors[panel] = position;
    hover = hover && hover.p === panel ? hover : { p: panel, i: position, key: true };
  }

  function onPanelBlur(): void {
    hover = hover?.key ? null : hover;
  }

  /** 滑块刻度位置：和原站一样按档位序号均分，再按圆心修半个拇指宽 */
  function tickBase(position: number): string {
    const ratio = settings.length > 1 ? position / (settings.length - 1) : 0;
    return `left:calc(${(100 * ratio).toFixed(2)}% + ${((0.5 - ratio) * 18).toFixed(1)}px)`;
  }

  function tickStyle(position: number): string {
    const base = tickBase(position);
    if (!namedOf(settings, position)) return base;
    if (position === 0) return 'left:0;transform:none';
    if (position === settings.length - 1) return 'left:auto;right:0;transform:none';
    if (namedOf(settings, position - 1)) return `${base};transform:none`;
    if (namedOf(settings, position + 1)) return `${base};transform:translateX(-100%)`;
    return base;
  }

  // 容器宽度变了重算布局（和原站的 ResizeObserver 一样，初始回落到 658）
  $effect(() => {
    const host = chartEl;
    if (!host) return;
    const update = () => {
      const next = Math.round(host.clientWidth);
      if (next) measuredWidth = next;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  });

  // 方阵的指针和键盘监听挂到 DOM 上（两个 panel 都要各自处理，模板里只留 role 和 tabindex）
  $effect(() => {
    const svg = svgEl;
    const panels = panelEls.filter(Boolean);
    if (!svg || panels.length < 2) return;
    const onMove = (event: PointerEvent) => onPointerMove(event);
    const onDown = (event: PointerEvent) => onPointerDown(event);
    const onLeave = (event: PointerEvent) => onPointerLeave(event);
    const onCancel = () => onPointerCancel();
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointerleave', onLeave);
    svg.addEventListener('pointercancel', onCancel);
    const detach = panels.map((node, panel) => {
      const keydown = (event: KeyboardEvent) => onPanelKey(panel, event);
      const focus = () => onPanelFocus(panel);
      const blur = () => onPanelBlur();
      node.addEventListener('keydown', keydown);
      node.addEventListener('focus', focus);
      node.addEventListener('blur', blur);
      return () => {
        node.removeEventListener('keydown', keydown);
        node.removeEventListener('focus', focus);
        node.removeEventListener('blur', blur);
      };
    });
    return () => {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointerleave', onLeave);
      svg.removeEventListener('pointercancel', onCancel);
      for (const cleanup of detach) cleanup();
    };
  });

  // 第一次进入视野自动播一遍（原站用 IntersectionObserver，提前 40% 触发）
  $effect(() => {
    const element = rootEl;
    if (!element || !data) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        play();
      },
      { threshold: 0, rootMargin: '0px 0px -40% 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  });

  // tooltip 跟着格子走：优先放在格子上方，放不下改放下方
  $effect(() => {
    const active = hover;
    const tipNode = tipEl;
    const chart = chartEl;
    if (!active || !tipNode || !chart) return;
    const scale = chart.clientWidth / layout.W;
    const x = sideX(active.p) + (active.i % layout.cols) * layout.c;
    const y = layout.y0 + Math.floor(active.i / layout.cols) * layout.c;
    const size = (layout.c - 2) * scale;
    const tipWidth = tipNode.offsetWidth;
    const tipHeight = tipNode.offsetHeight;
    const left = Math.max(0, Math.min(chart.clientWidth - tipWidth, x * scale + size / 2 - tipWidth / 2));
    let top = y * scale - tipHeight - 10;
    if (top < 0) top = y * scale + size + 10;
    tipLeft = `${Math.round(left)}px`;
    tipTop = `${Math.round(top)}px`;
  });
</script>

<div class="sye-demo sye-failures" bind:this={rootEl}>
  {#if error}
    <p class="sye-failures-fallback">{error}</p>
  {:else if data && leftSetting && rightSetting}
    <div class="viz-controls">
      <div class="fig-tabs viz-pills" role="group" aria-label="模型">
        {#each data.models as name (name)}
          <button type="button" aria-pressed={name === model} onclick={() => selectModel(name)}>{name}</button>
        {/each}
      </div>
      <div class="viz-effort">
        <label for={`${uid}-effort`}>{data.labels.effort}</label>
        <div class="viz-track">
          <input
            id={`${uid}-effort`}
            type="range"
            min="0"
            max={lastIndex}
            step="1"
            value={current}
            aria-valuetext={effortName(settings, current)}
            oninput={onEffort}
          />
          <div class="viz-ticks" aria-hidden="true">
            {#each settings as setting, position (setting.order)}
              {@const tickName = namedOf(settings, position)}
              {#if tickName}
                <span class="tk named" style={tickStyle(position)}>{EFFORT_ZH[tickName] ?? tickName}</span>
              {:else}
                <span class="tk" style={tickBase(position)}></span>
              {/if}
            {/each}
          </div>
        </div>
      </div>
      <button type="button" class="viz-play" disabled={clamped === 0} onclick={play}>{data.labels.replay}</button>
    </div>

    <div class="viz-chart" bind:this={chartEl}>
      <div class="viz-sr">{srText}</div>
      <svg
        bind:this={svgEl}
        viewBox={`0 0 ${layout.W} ${legend.height}`}
        width={layout.W}
        height={legend.height}
        class="viz-svg"
      >
        {#each [0, 1] as panel (panel)}
          <!-- 两个方阵各是一个可用方向键浏览的分组。指针和键盘监听在脚本里挂，模板里只留 role 和 tabindex。 -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <g
            class="viz-panel"
            tabindex="0"
            role="group"
            aria-label={panelAria(panel, settings[panel])}
            bind:this={panelEls[panel]}
          >
            <rect
              class="viz-focus"
              x={sideX(panel) - 4}
              y={layout.y0 - 4}
              width={layout.gw + 8}
              height={layout.gh + 8}
            />
            {#each bands[panel] as band, cell (cell)}
              <rect
                x={sideX(panel) + (cell % layout.cols) * layout.c}
                y={layout.y0 + Math.floor(cell / layout.cols) * layout.c}
                width={layout.c - 2}
                height={layout.c - 2}
                class={band < 0 ? 'viz-sq bx' : `viz-sq b${band}`}
              />
            {/each}
          </g>
        {/each}
        <g aria-hidden="true">
          {#each highlights as highlight (highlight.p + '-' + highlight.i)}
            <rect
              class="viz-hl"
              x={sideX(highlight.p) + (highlight.i % layout.cols) * layout.c}
              y={layout.y0 + Math.floor(highlight.i / layout.cols) * layout.c}
              width={layout.c - 2}
              height={layout.c - 2}
            />
          {/each}

          {#each [{ setting: leftSetting, position: 0, x: layout.xl, alignEnd: false, ring: true }, { setting: rightSetting, position: current, x: layout.W - layout.PAD, alignEnd: true, ring: isLow }] as header (header.x)}
            <g>
              <circle
                class={header.ring ? `viz-ring m${modelIndex}` : `viz-dot m${modelIndex}`}
                cx={header.alignEnd ? header.x - 5 : header.x + 5}
                cy={25}
                r={header.ring ? 4 : 5}
              />
              <text
                x={header.alignEnd ? header.x - 16 : header.x + 16}
                y={31}
                text-anchor={header.alignEnd ? 'end' : 'start'}
                font-size={headingOf(header.setting, header.position).size}
                font-weight="500"
                class="viz-t-ink">{headingOf(header.setting, header.position).title}</text
              >
              <text
                x={header.alignEnd ? header.x - 16 : header.x + 16}
                y={51}
                text-anchor={header.alignEnd ? 'end' : 'start'}
                font-size="12"
                class="viz-t-muted">{headingOf(header.setting, header.position).sub}</text
              >
            </g>
          {/each}

          <line
            class="viz-rule"
            x1={layout.PAD}
            x2={layout.W - layout.PAD}
            y1={legend.top - 22}
            y2={legend.top - 22}
          />

          {#each legend.rows as row (row.kind + '-' + row.id)}
            {@const info = data.kinds.find((kind) => kind.id === row.id)}
            {@const colorIndex = Math.max(0, data.kinds.indexOf(info as Kind))}
            {@const counts = rowCounts(row.id)}
            <g transform={`translate(0 ${row.y})`}>
              {#if row.kind === 'family'}
                <text x={row.x0} font-size="14" font-weight="500" class="viz-t-ink"
                  >{data.families.find((entry) => entry.id === row.id)?.label.zh ?? row.id}</text
                >
                <text
                  x={row.x1}
                  text-anchor="end"
                  xml:space="preserve"
                  font-size="12"
                  class="viz-num viz-t-muted">{counts.low}{#if !isLow}<tspan class="viz-t-muted"
                      >{' → '}</tspan
                    ><tspan>{counts.current}</tspan>{/if}</text
                >
              {:else}
                <rect class={`viz-sq b${colorIndex}`} x={row.x0} y="-10" width="10" height="10" />
                <text x={row.x0 + 18} font-size="12" class="viz-t-body">{info?.label.zh ?? row.id}</text>
                <text
                  x={row.x1}
                  text-anchor="end"
                  xml:space="preserve"
                  font-size="12"
                  class="viz-num viz-t-ink">{counts.low}{#if !isLow}<tspan class="viz-t-muted"
                      >{' → '}</tspan
                    ><tspan font-weight={counts.family !== 'passed' && counts.current > counts.low ? 600 : undefined}
                      >{counts.current}</tspan
                    >{/if}</text
                >
              {/if}
            </g>
          {/each}
        </g>
      </svg>

      <div
        bind:this={tipEl}
        class="viz-tip"
        class:on={hover !== null}
        aria-live={hover?.key ? 'polite' : 'off'}
        style={`left:${tipLeft};top:${tipTop}`}
      >
        {#if tip}
          {#if tip.kind === 'passed'}
            <b>{tip.title}</b><br />
            {tip.passed} / {tip.total} 次尝试通过（{tip.setting}）
          {:else}
            <b>{tip.label}</b><br />
            <span class="k">{tip.family}</span><br />
            <span class="k">{tip.detail}</span><br />
            {tip.count} / {tip.total} 次尝试（{tip.setting}）
            {#if tip.lowCount !== undefined}
              <br /><span class="k">低档 {tip.lowCount} 次</span>
            {/if}
          {/if}
        {/if}
      </div>
    </div>

    <div class="sye-cap">
      <b>FIG B</b>
      <span class="sye-cap-text">
        <span class="sye-zh">{data.caption.zh}</span><span class="sye-en" lang="en">{data.caption.en}</span>
      </span>
    </div>
  {/if}
</div>
