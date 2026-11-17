<script lang="ts">
  /**
   * FIG C：各类任务的通过率与投入程度。
   *
   * 7 行任务类别 × 3 个模型，每行两根棒棒糖：空心点是低档（合并每个模型最低的两档），
   * 实心点是最高档（合并最高的三档）。当前模型画成实色，另外两个模型降成灰调，行尾写通过率变化。
   * 点模型标签切换，重播让实心点从低档位置慢慢走到最高档位置，鼠标停在一行上高亮整行并弹出
   * 该类别的逐任务明细，点一下可以钉住（再点收起，Esc 也能关）。
   *
   * 版式按原站公式算：宽度 ≥ 560 时类别名、任务数、百分比、两条图例分列在左右，
   * 窄屏时类别名和任务数并排、百分比贴着右侧。数值来自 payoff.json，逐个类别逐模型照抄原站。
   */
  import { onMount } from 'svelte';

  import { withBase } from '@/lib/format';

  import type { AnimationProps } from '../mount';
  import './base.css';
  import './charts/payoff.css';

  interface PayoffTask {
    title: string;
    /** 每个模型 [低档通过, 低档尝试, 最高档通过, 最高档尝试] */
    m: Record<string, [number, number, number, number]>;
  }

  interface PayoffCategory {
    name: string;
    zh: string;
    n: number;
    pct: Record<string, { low: number; high: number }>;
    tasks: PayoffTask[];
  }

  interface PayoffData {
    models: string[];
    categories: PayoffCategory[];
    settings: Record<string, { low: string[]; high: string[] }>;
    notes: Record<string, { en: string; zh: string }>;
    labels: { replay: string; low: string; top: string; tasksUnit: string; model: string };
    caption: { zh: string; en: string };
    aria: { zh: string; en: string };
  }

  interface Layout {
    W: number;
    M: number;
    wide: boolean;
    headH: number;
    padTop: number;
    laneGap: number;
    rowH: number;
    x0: number;
    x1: number;
    key: { x1: number; y1: number; x2: number; y2: number };
    top: number;
    bottom: number;
    tickY: number;
    H: number;
  }

  interface Hover {
    cat: string;
    pinned: boolean;
  }

  const { config = {} }: AnimationProps = $props();
  // 这个图不需要配置项，读一次让挂载层传进来的值有响应式身份
  $effect(() => {
    void config;
  });

  const uid = $props.id();

  /** 档位名的中文写法，没名字的档位（比如 raw 值 120）原样显示 */
  const EFFORT_ZH: Record<string, string> = {
    low: '低档',
    medium: '中档',
    high: '高档',
    xhigh: '超高档',
    max: '最高档',
  };

  /** 原站字号：类别名 14，其余 12 */
  const NAME_SIZE = 14;
  const SMALL_SIZE = 12;

  let data = $state<PayoffData | null>(null);
  let error = $state('');
  let model = $state('');
  let playing = $state(false);
  let progress = $state(1);
  let hover = $state<Hover | null>(null);
  let measuredWidth = $state(658);
  let tipLeft = $state('0px');
  let tipTop = $state('0px');

  let rootEl = $state<HTMLDivElement>();
  let chartEl = $state<HTMLDivElement>();
  let svgEl = $state<SVGSVGElement>();
  let rowsEl = $state<HTMLDivElement>();
  let controlsEl = $state<HTMLDivElement>();
  let tipEl = $state<HTMLDivElement>();
  let frame = 0;

  onMount(() => {
    let cancelled = false;
    fetch(withBase('/data/spending-your-effort/charts/payoff.json'))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<PayoffData>;
      })
      .then((json) => {
        if (cancelled) return;
        data = json;
        model = json.models[0];
      })
      .catch(() => {
        if (!cancelled) error = '这张图的数据没能加载，刷新页面再试一次。';
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  });

  const width = $derived(Math.max(300, Math.round(measuredWidth)));
  const layout = $derived(computeLayout(width, data?.categories.length ?? 7));
  /** 图例顺序：非当前模型先画（垫底），当前模型最后画（压在最上面） */
  const drawOrder = $derived(data ? [...data.models.filter((name) => name !== model), model] : []);
  /** 通过率最高的那一行铺一层淡底（原站的 band） */
  const bandIndex = $derived.by(() => {
    const current = data;
    if (!current) return -1;
    let best = 0;
    current.categories.forEach((category, index) => {
      if (category.pct[model].high > current.categories[best].pct[model].high) best = index;
    });
    return best;
  });
  const hoveredName = $derived(hover?.cat ?? null);

  function textWidth(text: string, size: number, factor = 0.56): number {
    return text.length * size * factor;
  }

  function computeLayout(containerWidth: number, count: number): Layout {
    const wide = containerWidth >= 560;
    const headH = wide ? 0 : 24;
    const padTop = wide ? 17 : 15;
    const laneGap = 18;
    const rowH = headH + padTop + 36 + (wide ? 17 : 12);
    const x0 = wide ? 138 : 24;
    const x1 = wide
      ? containerWidth - 124
      : containerWidth - 16 - Math.ceil(textWidth('100%', SMALL_SIZE) / 2) - 2;
    const base = wide ? x0 : 16;
    let keyX2 = base + 16 + textWidth('low effort', SMALL_SIZE) + 24;
    const stacked = keyX2 + 16 + textWidth('top effort', SMALL_SIZE) > containerWidth - 16;
    if (stacked) keyX2 = base;
    const keyY2 = stacked ? 44 : 22;
    const top = keyY2 + 14;
    const bottom = top + rowH * count;
    return {
      W: containerWidth,
      M: 16,
      wide,
      headH,
      padTop,
      laneGap,
      rowH,
      x0,
      x1,
      key: { x1: base, y1: 22, x2: keyX2, y2: keyY2 },
      top,
      bottom,
      tickY: 17,
      H: bottom + 17 + 16,
    };
  }

  /** 通过率 → 横坐标 */
  function position(pct: number): number {
    return layout.x0 + ((layout.x1 - layout.x0) * pct) / 100;
  }

  function lane(categoryIndex: number, laneIndex: number): number {
    return layout.top + layout.rowH * categoryIndex + layout.headH + layout.padTop + layout.laneGap * laneIndex;
  }

  function categoryClass(category: PayoffCategory, categoryIndex: number): string {
    const band = categoryIndex === bandIndex ? ' band' : '';
    const hot = category.name === hoveredName ? ' hot' : '';
    return band + hot;
  }

  function effortZh(raw: string): string {
    return EFFORT_ZH[raw] ?? raw;
  }

  const tip = $derived.by(() => {
    const active = hover;
    if (!active || !data) return null;
    const category = data.categories.find((entry) => entry.name === active.cat);
    if (!category) return null;
    const pct = category.pct[model];
    const rule = data.settings[model];
    const sorted = category.tasks
      .map((task) => {
        const value = task.m[model];
        return {
          title: task.title,
          low: value[1] ? Math.round((100 * value[0]) / value[1]) : 0,
          high: value[3] ? Math.round((100 * value[2]) / value[3]) : 0,
        };
      })
      .sort((a, b) => b.high - a.high || a.title.localeCompare(b.title));
    return { category, pct, rule, tasks: sorted, pinned: active.pinned };
  });

  const srText = $derived.by(() => {
    if (!data) return '';
    const list = data.categories
      .map((category) => `${category.zh} ${category.pct[model].low}% → ${category.pct[model].high}%`)
      .join('，');
    return `${model} 从低档投入（${data.labels.low}）到最高档投入（${data.labels.top}）的通过率：${list}。`;
  });

  function stop(): void {
    cancelAnimationFrame(frame);
    playing = false;
    progress = 1;
  }

  function play(): void {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(frame);
    playing = true;
    progress = 0;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      progress = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      if (t < 1) frame = requestAnimationFrame(tick);
      else playing = false;
    };
    frame = requestAnimationFrame(tick);
  }

  function selectModel(next: string): void {
    if (next === model) return;
    stop();
    model = next;
  }

  function showCategory(name: string): void {
    if (hover?.pinned) return;
    hover = { cat: name, pinned: false };
  }

  function clearHover(force = false): void {
    if (hover?.pinned && !force) return;
    hover = null;
  }

  function togglePin(name: string): void {
    hover = hover?.pinned && hover.cat === name ? null : { cat: name, pinned: true };
  }

  function closePinned(): void {
    const active = hover;
    hover = null;
    if (!active?.pinned || !rowsEl) return;
    const button = rowsEl.querySelector<HTMLButtonElement>(`button[data-cat="${CSS.escape(active.cat)}"]`);
    button?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      clearHover(true);
    }
  }

  // 容器宽度变了重算布局
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

  // 鼠标移出图表、或划过行与行之间的空白时收起 tooltip（和原站挂在指针事件上等价）
  $effect(() => {
    const chart = chartEl;
    const svg = svgEl;
    if (!chart || !svg) return;
    const onLeave = () => clearHover();
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && hover?.cat) clearHover();
    };
    chart.addEventListener('pointerleave', onLeave);
    svg.addEventListener('pointermove', onMove);
    return () => {
      chart.removeEventListener('pointerleave', onLeave);
      svg.removeEventListener('pointermove', onMove);
    };
  });

  // 第一次进入视野自动播一遍
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

  // 钉住以后点别处、按 Esc 都收起
  $effect(() => {
    if (!hover?.pinned) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      for (const host of [controlsEl, rowsEl, tipEl]) {
        if (host?.contains(target)) return;
      }
      hover = null;
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (tipEl?.contains(document.activeElement) || rowsEl?.contains(document.activeElement)) {
        const active = hover?.cat;
        hover = null;
        if (active && rowsEl) {
          const button = rowsEl.querySelector<HTMLButtonElement>(`button[data-cat="${CSS.escape(active)}"]`);
          button?.focus();
        }
      } else {
        hover = null;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeydown);
    };
  });

  // tooltip 贴在当前行右侧，空间不够时往上翻
  $effect(() => {
    const active = hover;
    const tipNode = tipEl;
    const chart = chartEl;
    const rows = rowsEl;
    if (!active || !tipNode || !chart || !rows) return;
    const button = rows.querySelector<HTMLButtonElement>(`button[data-cat="${CSS.escape(active.cat)}"]`);
    if (!button) return;
    const chartRect = chart.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    tipNode.style.maxHeight = `${Math.floor(chartRect.height)}px`;
    tipNode.scrollTop = 0;
    const tipWidth = tipNode.offsetWidth;
    const tipHeight = tipNode.offsetHeight;
    const below = buttonRect.bottom - chartRect.top + 6;
    const above = buttonRect.top - chartRect.top - tipHeight - 6;
    let top: number;
    if (below + tipHeight <= chartRect.height) top = below;
    else if (above >= 0) top = above;
    else top = Math.max(0, chartRect.height - tipHeight);
    tipLeft = `${Math.max(0, chartRect.width - tipWidth)}px`;
    tipTop = `${top}px`;
  });
</script>

<div class="sye-demo sye-payoff" bind:this={rootEl}>
  {#if error}
    <p class="sye-payoff-fallback">{error}</p>
  {:else if data}
    <div class="viz-controls" bind:this={controlsEl}>
      <div class="fig-tabs viz-pills" role="group" aria-label="模型">
        {#each data.models as name (name)}
          <button type="button" aria-pressed={name === model} onclick={() => selectModel(name)}>{name}</button>
        {/each}
      </div>
      <button type="button" class="viz-play" onclick={play}>{data.labels.replay}</button>
    </div>

    <div class="viz-chart" bind:this={chartEl}>
      <div class="viz-sr">{srText}</div>
      <svg
        bind:this={svgEl}
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        width={layout.W}
        height={layout.H}
        class="viz-svg"
        aria-hidden="true"
      >
        <g>
          <circle class="viz-key-ring" cx={layout.key.x1 + 5} cy={layout.key.y1} r="5" />
          <text
            x={layout.key.x1 + 16}
            y={layout.key.y1 + 4.5}
            font-size={SMALL_SIZE}
            class="viz-t-body">{data.labels.low}</text
          >
          <circle class="viz-key-dot" cx={layout.key.x2 + 5} cy={layout.key.y2} r="6" />
          <text
            x={layout.key.x2 + 16}
            y={layout.key.y2 + 4.5}
            font-size={SMALL_SIZE}
            class="viz-t-body">{data.labels.top}</text
          >

          {#each data.categories as category, categoryIndex (category.name)}
            <rect
              class={`viz-bg${categoryClass(category, categoryIndex)}`}
              x="0"
              y={layout.top + layout.rowH * categoryIndex + 1}
              width={layout.W}
              height={layout.rowH - 2}
            />
          {/each}

          {#each [0, 25, 50, 75, 100] as tick (tick)}
            {@const x = position(tick)}
            <g pointer-events="none">
              {#each layout.wide ? [[layout.top, layout.bottom]] : data.categories.map((_, index) => { const start = layout.top + layout.rowH * index + layout.headH + layout.padTop; return [start - 9, start + 2 * layout.laneGap + 9]; }) as segment (segment[0])}
                <line
                  class={tick === 0 ? 'viz-rule' : 'viz-grid'}
                  x1={x}
                  x2={x}
                  y1={segment[0]}
                  y2={segment[1]}
                />
              {/each}
              <text
                x={x}
                y={layout.bottom + layout.tickY}
                font-size={SMALL_SIZE}
                text-anchor="middle"
                class="viz-t-muted">{tick}%</text
              >
            </g>
          {/each}
        </g>

        {#each data.categories as category, categoryIndex (category.name)}
          {@const rowTop = layout.top + layout.rowH * categoryIndex}
          {@const rowClass = `viz-row${categoryClass(category, categoryIndex)}`}
          {@const pct = category.pct[model]}
          {@const note = data.notes[category.name]}
          {@const noteX = note
            ? position(Math.max(...data.models.flatMap((name) => [category.pct[name].low, category.pct[name].high]))) + 16
            : 0}
          <g class={rowClass}>
            {#if layout.wide}
              <text
                x={layout.M}
                y={lane(categoryIndex, 1) - 1}
                font-size={NAME_SIZE}
                font-weight="500"
                class="viz-t-ink">{category.zh}</text
              >
              <text x={layout.M} y={lane(categoryIndex, 1) + 16} font-size={SMALL_SIZE} class="viz-t-muted"
                >{category.n} {data.labels.tasksUnit}</text
              >
            {:else}
              <text x={layout.M} y={rowTop + 21}>
                <tspan font-size={NAME_SIZE} font-weight="500" class="viz-t-ink">{category.zh}</tspan>
                <tspan dx="8" font-size={SMALL_SIZE} class="viz-t-muted"
                  >{category.n} {data.labels.tasksUnit}</tspan
                >
              </text>
            {/if}

            <text
              x={layout.W - layout.M}
              y={layout.wide ? lane(categoryIndex, 1) + 6 : rowTop + 21}
              text-anchor="end"
              xml:space="preserve"
              class="viz-num"
            >
              <tspan font-size={SMALL_SIZE} class="viz-t-muted">{pct.low}%</tspan>
              <tspan font-size={SMALL_SIZE} class="viz-t-muted"> → </tspan>
              <tspan font-size={SMALL_SIZE} class="viz-t-ink">{pct.high}%</tspan>
            </text>

            {#each drawOrder as name (name)}
              {@const laneIndex = data.models.indexOf(name)}
              {@const y = lane(categoryIndex, laneIndex)}
              {@const value = category.pct[name]}
              {@const start = position(value.low)}
              {@const end = start + (position(value.high) - start) * progress}
              {@const active = name === model}
              <g class={`viz-mk m${laneIndex}${active ? '' : ' ghost'}`}>
                <line x1={start} x2={end} y1={y} y2={y} stroke-linecap="round" />
                <circle class="lo" cx={start} cy={y} r={active ? 5.5 : 4} />
                <circle class="hi" cx={end} cy={y} r={active ? 6 : 4.5} />
              </g>
            {/each}

            {#if categoryIndex === 0}
              {#each data.models as name, laneIndex (name)}
                {@const value = category.pct[name]}
                {@const left = Math.min(value.low, value.high)}
                {@const right = Math.max(value.low, value.high)}
                {@const fits = position(left) - 12 - textWidth(name, SMALL_SIZE, 0.5) >= layout.x0}
                <text
                  x={fits ? position(left) - 12 : position(right) + 12}
                  y={lane(categoryIndex, laneIndex) + 4.5}
                  text-anchor={fits ? 'end' : 'start'}
                  font-size={SMALL_SIZE}
                  class={`viz-halo ${name === model ? 'viz-t-ink' : 'viz-t-muted'}`}>{name}</text
                >
              {/each}
            {/if}

            {#if note}
              {#if noteX + textWidth(note.zh, SMALL_SIZE) <= layout.W - layout.M}
                <text
                  x={noteX}
                  y={lane(categoryIndex, 1) + 4.5}
                  font-size={SMALL_SIZE}
                  class="viz-halo viz-t-muted">{note.zh}</text
                >
              {/if}
            {/if}
          </g>
        {/each}
      </svg>

      <div class="viz-rows" bind:this={rowsEl}>
        {#each data.categories as category, categoryIndex (category.name)}
          {@const pct = category.pct[model]}
          <button
            type="button"
            class="viz-rowbtn"
            data-cat={category.name}
            style={`top:${(((layout.top + layout.rowH * categoryIndex + 1) / layout.H) * 100).toFixed(3)}%;height:${(((layout.rowH - 2) / layout.H) * 100).toFixed(3)}%`}
            aria-expanded={hover?.cat === category.name}
            aria-controls={`${uid}-tip`}
            aria-label={`${category.zh}，${category.n} ${data.labels.tasksUnit}。${model} 在低档通过 ${pct.low}%，在最高档通过 ${pct.high}%。按回车列出任务。`}
            onclick={() => togglePin(category.name)}
            onkeydown={onRowKeydown}
            onfocus={() => showCategory(category.name)}
            onblur={() => clearHover()}
            onpointerenter={(event) => {
              if (event.pointerType === 'mouse') showCategory(category.name);
            }}
          ></button>
        {/each}
      </div>

      <div
        bind:this={tipEl}
        id={`${uid}-tip`}
        class="viz-tip tasks"
        class:on={hover !== null}
        class:pinned={hover?.pinned === true}
        aria-live={hover?.pinned ? 'polite' : 'off'}
        style={`left:${tipLeft};top:${tipTop}`}
      >
        {#if tip}
          <div class="top">
            <div class="head">
              <b>{tip.category.zh}</b>，{model}：{tip.pct.low}% <span class="arr">→</span>
              {tip.pct.high}%
            </div>
            <button type="button" class="x" onclick={closePinned}>收起</button>
          </div>
          <div class="sub">
            每个任务的通过率。每个档位对每个任务各跑五次。低档投入合并 {tip.rule.low
              .map((raw) => effortZh(raw))
              .join('和')}（每个任务 {5 * tip.rule.low.length} 次尝试）。最高档投入合并 {tip.rule.high
              .map((raw) => effortZh(raw))
              .join('，')}（{5 * tip.rule.high.length} 次）。
          </div>
          <ol>
            {#each tip.tasks as task (task.title)}
              <li>
                <span>{task.title}</span>
                <span class="n"><span class="lo">{task.low}%</span> <span class="arr">→</span> <b>{task.high}%</b></span>
              </li>
            {/each}
          </ol>
        {/if}
      </div>
    </div>

    <div class="sye-cap">
      <b>FIG C</b>
      <span class="sye-cap-text">
        <span class="sye-zh">{data.caption.zh}</span><span class="sye-en" lang="en">{data.caption.en}</span>
      </span>
    </div>
  {/if}
</div>
