<script lang="ts">
  /**
   * 实验 6 的围棋图，复刻原站 js/gohand.js。
   *
   * 左：Astra 写出的网络在 0 到 50 次前向各预算下的胜率。三条线分别是两个小 PPO 网络
   * （种子 0 和种子 2）以及一个与 Astra 同尺寸的 PPO（只测了 0 和 50 次，取三个种子的
   * 均值，竖线是最低到最高）。鼠标扫过时最近的那一列高亮，该列三个数值写在点旁边。
   *
   * 右：50 次那条运行逐回合播一遍。小图是练习赛胜率随前向次数的折线，下面每回合一个刻度，
   * 改过权重的回合是红色高刻度，刷新最好成绩的回合是红点。指着小图停在那一个回合，离开继续播。
   *
   * 图表按容器实际宽度画（原站就是 clientWidth），宽版心下图更大，比例和字号跟着原站走。
   */

  import { onMount, tick } from 'svelte';

  import { esc, loadJson, loadSetup, type SetupText } from './ws/data';
  import './ws/gohand.css';

  /* ---------- 数据类型 ---------- */

  interface GhOpp {
    [opponent: string]: [number, number];
  }

  interface GhStep {
    kind: 'edit' | 'games' | 'python' | 'positions' | 'final';
    used: number;
    note?: string;
    code?: string;
    said?: boolean;
    pass?: number;
    opp?: GhOpp;
    best?: boolean;
    positions?: number;
  }

  interface GhBudget {
    passes: number;
    runs: number;
    games: number;
    positions: number;
    ppo_s0: number;
    ppo_s2: number;
    same_size?: number[] | null;
    answer: string;
    steps: GhStep[];
  }

  interface GhData {
    source: string;
    budgets: GhBudget[];
  }

  /* ---------- 常量 ---------- */

  const GH_JSON = '/data/weight-space/gohand/gohand.json';
  const SETUP_KEY = 'exp6_go';

  const GREEN = 'var(--ws-green)';
  const LIGHT = 'var(--ws-green-light)';
  const GREEN_DEEP = 'var(--ws-green-deep)';
  const ORANGE = 'var(--ws-orange)';
  const RED = 'var(--ws-red)';
  const INK = 'var(--ws-ink)';
  const GRID = 'var(--ws-line-soft)';
  const AXIS = 'var(--ws-axis)';
  const STRONG = 'var(--ws-line-strong)';
  const CARD = 'var(--ws-card)';

  /** 左图的几何（原站的 300px 高、46/56/18/48 边距）。 */
  const CH = 300;
  const CM = { l: 46, r: 56, t: 18, b: 48 };

  /** 右面板小图的几何。 */
  const PH = 132;
  const PM = { l: 38, r: 8, t: 6, b: 34 };

  /** 回合类型的标签，界面文案走中文。 */
  const TAG: Record<string, string> = {
    edit: '改过权重',
    python: 'Python',
    games: '前向传播（对局）',
    positions: '前向传播（局面）',
    final: '最终答案',
  };

  /* ---------- 小工具 ---------- */

  const round = (value: number) => Math.round(value * 10) / 10;

  function node(tag: string, map: Record<string, string | number>, inner = ''): string {
    const list = Object.entries(map)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    return `<${tag} ${list}>${inner}</${tag}>`;
  }

  function text(
    x: number,
    y: number,
    value: string,
    extra: Record<string, string | number> = {},
  ): string {
    return node(
      'text',
      { x: round(x), y: round(y), 'font-size': 14, fill: INK, ...extra },
      esc(value),
    );
  }

  function clientToSvg(event: PointerEvent, svg: SVGSVGElement): { x: number; y: number } {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  }

  /** Astra 的最终答案：段落、列表、粗体。 */
  function md(source: string): string {
    const out: string[] = [];
    let open = false;
    for (const raw of source.split('\n')) {
      const line = raw.trim();
      const html = esc(line.replace(/^[-*]\s+/, '')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      if (/^[-*]\s+/.test(line)) {
        if (!open) {
          out.push('<ul>');
          open = true;
        }
        out.push(`<li>${html}</li>`);
      } else {
        if (open) {
          out.push('</ul>');
          open = false;
        }
        if (line) out.push(`<p>${html}</p>`);
      }
    }
    if (open) out.push('</ul>');
    return out.join('');
  }

  function budgetName(b: GhBudget): string {
    return b.passes ? `${b.passes} 次前向` : '一次成型（不用前向传播）';
  }

  function columnLabel(b: GhBudget): string {
    return b.passes ? String(b.passes) : '一次成型';
  }

  function mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /** 一个回合：它做了什么（一行），结果，代码，最后是 Astra 的答案。 */
  function turnHtml(b: GhBudget, t: GhStep, k: number): string {
    const tag = TAG[t.kind] ?? t.kind;
    const head =
      `<div class="gh-thead">回合 ${k + 1}${b.passes ? `，已用 ${t.used} 次前向` : ''}` +
      `<span class="me-tag${t.kind === 'edit' ? ' me-tag-edit' : ''}">${tag}</span></div>`;
    if (t.kind === 'final') return `${head}<div class="gh-ans">${md(b.answer)}</div>`;
    if (t.kind === 'games') {
      const opp = Object.entries(t.opp ?? {})
        .map(([who, [games, value]]) => `${who} <b>${value.toFixed(1)}%</b>（${games} 局）`)
        .join(' · ');
      return `${head}<div class="gh-note">第 ${t.pass} 次前向（对局）：它赢下 ${opp}</div>`;
    }
    if (t.kind === 'positions') {
      return (
        head +
        `<div class="gh-note">第 ${t.pass} 次前向（局面）：模型在 Astra 选的 ${t.positions} 个局面上的落子</div>`
      );
    }
    const lines = (t.code ?? '').split('\n').length;
    const note = t.said ? `“${esc(t.note ?? '')}”` : esc(t.note ?? '');
    return (
      head +
      `<div class="gh-note">${note}</div>` +
      `<details class="tp-fold"><summary><b>它的代码</b> · ${lines} 行</summary>` +
      `<pre class="tp-pre">${esc(t.code ?? '')}</pre></details>`
    );
  }

  /* ---------- 状态 ---------- */

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  let data = $state<GhData | null>(null);
  let setup = $state<SetupText | undefined>(undefined);
  let failed = $state(false);

  /** 左图当前高亮的那一列。 */
  let on = $state(0);
  let chartHtml = $state('');
  let plotHtml = $state('');
  let turnMarkup = $state('');
  let playing = $state(false);

  let rootEl: HTMLDivElement;
  let boxEl = $state<HTMLDivElement>();
  let plotEl = $state<HTMLDivElement>();

  // 播放器内部状态：不在模板里直接读，改完手动重画
  let stepIndex = 0;
  let exploring = false;
  let resumeAfterExplore = false;
  let autoplayPending = false;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shownBudget = -1;

  // 左图几何缓存：宽度变了才整张重画
  let drawnWidth = 0;
  let columnX: number[] = [];
  let colRect: SVGRectElement | null = null;
  let marksLayer: SVGGElement | null = null;
  // 小图几何缓存
  let plotPositions: number[] = [];

  const budget = $derived<GhBudget | null>(data ? (data.budgets[on] ?? null) : null);
  const plays = $derived(Boolean(budget && budget.passes > 0 && budget.steps.length > 2));
  const usedLine = $derived.by(() => {
    if (!budget) return '';
    const runs = `${budget.runs} 次 Python 运行`;
    if (!budget.passes) return `${runs}，然后是它的答案`;
    return (
      `${runs} 和 ${budget.passes} 次前向：${budget.games} 次对局` +
      `${budget.positions ? `，${budget.positions} 次局面` : ''}`
    );
  });

  /* ---------- 左：胜率折线图 ---------- */

  function renderChart(): void {
    if (!data || !boxEl) return;
    const width = Math.max(300, Math.round(boxEl.clientWidth));
    if (width === drawnWidth && chartHtml) return;
    drawnWidth = width;

    const budgets = data.budgets;
    const inner = width - CM.l - CM.r;
    const x = (i: number) => CM.l + 26 + (i / (budgets.length - 1)) * (inner - 52);
    const y = (v: number) => CM.t + (1 - v / 100) * (CH - CM.t - CM.b);
    columnX = budgets.map((_, i) => x(i));

    const parts: string[] = [
      `<svg viewBox="0 0 ${width} ${CH}" width="${width}" height="${CH}" class="gh-svg" role="img" ` +
        'aria-label="Astra 写出的网络在 0 到 50 次前向下的胜率，对手是三个 PPO 网络。">',
      `<rect class="gh-col" y="${CM.t}" height="${CH - CM.t - CM.b}" width="44" rx="4" fill="var(--ws-green-wash)"/>`,
    ];

    for (const v of [0, 25, 50, 75, 100]) {
      const stroke = v === 50 ? STRONG : v ? GRID : AXIS;
      const dash = v === 50 ? ' stroke-dasharray="5 4"' : '';
      parts.push(
        `<line x1="${CM.l}" x2="${width - CM.r + 10}" y1="${round(y(v))}" y2="${round(y(v))}" ` +
          `stroke="${stroke}"${dash}/>`,
      );
      parts.push(text(CM.l - 8, y(v) + 5, `${v}%`, { 'text-anchor': 'end' }));
    }
    parts.push(text(width - CM.r + 14, y(50) + 5, '均势', { 'font-weight': 600 }));

    budgets.forEach((b, i) =>
      parts.push(
        text(x(i), CH - CM.b + 22, columnLabel(b), {
          'text-anchor': 'middle',
          'font-weight': b.passes ? 400 : 600,
        }),
      ),
    );
    parts.push(
      text((x(0) + x(budgets.length - 1)) / 2, CH - 6, 'Astra 可用的前向次数', {
        'text-anchor': 'middle',
        'font-weight': 600,
      }),
    );

    for (const [key, color] of [
      ['ppo_s0', GREEN],
      ['ppo_s2', LIGHT],
    ] as const) {
      const points = budgets.map((b, i) => [x(i), y(b[key])] as const);
      parts.push(
        `<polyline points="${points.map(([cx, cy]) => `${round(cx)},${round(cy)}`).join(' ')}" ` +
          `fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`,
      );
      points.forEach(([cx, cy]) =>
        parts.push(
          `<circle cx="${round(cx)}" cy="${round(cy)}" r="4" fill="${color}" stroke="${CARD}" stroke-width="2"/>`,
        ),
      );
    }

    const same = budgets
      .map((b, i) => (b.same_size?.length ? { b, i, x: x(i), y: y(mean(b.same_size)) } : null))
      .filter((item): item is { b: GhBudget; i: number; x: number; y: number } => item !== null);
    if (same.length > 1) {
      parts.push(
        `<polyline points="${same.map((item) => `${round(item.x)},${round(item.y)}`).join(' ')}" ` +
          `fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="6 5"/>`,
      );
    }
    for (const item of same) {
      const values = item.b.same_size ?? [];
      parts.push(
        `<line x1="${round(item.x)}" x2="${round(item.x)}" y1="${round(y(Math.max(...values)))}" ` +
          `y2="${round(y(Math.min(...values)))}" stroke="${ORANGE}" stroke-width="2"/>`,
      );
      parts.push(
        `<rect x="${round(item.x - 4.5)}" y="${round(item.y - 4.5)}" width="9" height="9" ` +
          `fill="${ORANGE}" stroke="${CARD}" stroke-width="2"/>`,
      );
    }

    parts.push('<g class="gh-marks" pointer-events="none"></g>');
    parts.push('</svg>');
    chartHtml = parts.join('');
  }

  /** 把这一列的竖条移到位置，并把三个数值写出来（上下一列至少错开 16px）。 */
  function applyMarks(): void {
    const b = budget;
    if (!b || !colRect || !marksLayer) return;
    const cx = columnX[on];
    colRect.setAttribute('x', String(round(cx - 22)));

    const y = (v: number) => CM.t + (1 - v / 100) * (CH - CM.t - CM.b);
    const rows: { value: number; color: string; at: number }[] = [
      { value: b.ppo_s0, color: GREEN, at: y(b.ppo_s0) },
      { value: b.ppo_s2, color: LIGHT, at: y(b.ppo_s2) },
    ];
    if (b.same_size?.length) {
      const value = mean(b.same_size);
      rows.push({ value, color: ORANGE, at: y(value) });
    }
    rows.sort((a, c) => a.at - c.at);
    for (let i = 1; i < rows.length; i += 1) {
      rows[i].at = Math.max(rows[i].at, rows[i - 1].at + 16);
    }
    marksLayer.innerHTML = rows
      .map((row) =>
        text(cx + 10, row.at + 5, row.value.toFixed(1), {
          'font-weight': 700,
          fill: row.color === LIGHT ? GREEN_DEEP : row.color,
          class: 'me-halo',
        }),
      )
      .join('');
  }

  async function refreshChart(): Promise<void> {
    renderChart();
    await tick();
    const svg = boxEl?.querySelector('svg');
    colRect = svg?.querySelector<SVGRectElement>('.gh-col') ?? null;
    marksLayer = svg?.querySelector<SVGGElement>('.gh-marks') ?? null;
    applyMarks();
  }

  function handleChartMove(event: PointerEvent): void {
    if (!data || !boxEl) return;
    const svg = boxEl.querySelector('svg');
    if (!svg) return;
    const local = clientToSvg(event, svg);
    let best = 0;
    columnX.forEach((cx, i) => {
      if (Math.abs(cx - local.x) < Math.abs(columnX[best] - local.x)) best = i;
    });
    if (best === on) return;
    on = best;
    applyMarks();
    if (shownBudget !== best) {
      shownBudget = best;
      void selectBudget(best, false);
    }
  }

  /* ---------- 右：逐回合播放器 ---------- */

  function renderPlayer(): void {
    const b = budget;
    if (!b) return;
    const steps = b.steps;
    // 一次成型那条没有播放器，原站是把它的两个回合（改权重、最终答案）一起列出来
    if (!(b.passes > 0 && steps.length > 2)) {
      turnMarkup = steps.map((step, k) => turnHtml(b, step, k)).join('');
      return;
    }
    stepIndex = Math.max(0, Math.min(steps.length - 1, stepIndex));
    turnMarkup = turnHtml(b, steps[stepIndex], stepIndex);
    renderPlot();
  }

  function renderPlot(): void {
    const b = budget;
    if (!b || !plotEl) return;
    const steps = b.steps;
    const width = Math.max(260, Math.round(plotEl.clientWidth));
    const s0 = PH - PM.b + 4;
    const s1 = s0 + 12;

    const groups = new Map<number, number[]>();
    steps.forEach((step, k) => {
      const list = groups.get(step.used) ?? [];
      list.push(k);
      groups.set(step.used, list);
    });
    const positions: number[] = [];
    for (const [group, list] of groups) {
      list.forEach((k, j) => {
        positions[k] = group + j / list.length;
      });
    }
    plotPositions = positions;

    const x = (p: number) => PM.l + (p / (b.passes + 1)) * (width - PM.l - PM.r);
    const y = (v: number) => PM.t + (1 - (v - 30) / 70) * (s0 - 12 - PM.t);
    const dim = (k: number) => (k <= stepIndex || exploring ? 1 : 0.35);

    const parts: string[] = [
      `<svg viewBox="0 0 ${width} ${PH}" width="${width}" height="${PH}" class="gh-svg" role="img" ` +
        `aria-label="${b.passes} 次前向那条运行，逐回合。">`,
    ];
    for (const v of [50, 75, 100]) {
      const dash = v === 50 ? ' stroke-dasharray="4 4"' : '';
      parts.push(
        `<line x1="${PM.l}" x2="${width - PM.r}" y1="${round(y(v))}" y2="${round(y(v))}" ` +
          `stroke="${v === 50 ? STRONG : GRID}"${dash}/>`,
      );
      parts.push(text(PM.l - 6, y(v) + 5, `${v}%`, { 'text-anchor': 'end', 'font-size': 13 }));
    }
    parts.push(
      `<line x1="${PM.l}" x2="${width - PM.r}" y1="${s1}" y2="${s1}" stroke="${AXIS}"/>`,
    );
    const step = b.passes <= 10 ? 2 : b.passes <= 25 ? 5 : 10;
    for (let p = 0; p <= b.passes; p += step) {
      parts.push(text(x(p), s1 + 15, String(p), { 'text-anchor': 'middle', 'font-size': 13 }));
    }

    steps.forEach((item, k) => {
      const cx = round(x(positions[k]));
      parts.push(
        item.kind === 'edit'
          ? `<line x1="${cx}" x2="${cx}" y1="${s0}" y2="${s1}" stroke="${RED}" stroke-width="2" opacity="${dim(k)}"/>`
          : `<line x1="${cx}" x2="${cx}" y1="${s1 - 6}" y2="${s1}" stroke="var(--ws-line-strong)" stroke-width="1" opacity="${dim(k)}"/>`,
      );
    });
    steps.forEach((item, k) => {
      if (!item.best) return;
      parts.push(`<circle cx="${round(x(positions[k]))}" cy="${s0}" r="3" fill="${RED}"/>`);
    });

    const measured = steps
      .map((item, k) => {
        const strong = item.opp?.strong;
        return strong ? { k, cx: x(positions[k]), value: strong[1] } : null;
      })
      .filter((item): item is { k: number; cx: number; value: number } => item !== null);
    const seen = measured.filter((item) => item.k <= stepIndex);
    if (seen.length > 1) {
      parts.push(
        `<polyline points="${seen.map((item) => `${round(item.cx)},${round(y(item.value))}`).join(' ')}" ` +
          `fill="none" stroke="${GREEN}" stroke-width="2" stroke-linejoin="round"/>`,
      );
    }
    for (const item of seen) {
      parts.push(
        `<circle cx="${round(item.cx)}" cy="${round(y(item.value))}" r="${item.k === stepIndex ? 4.5 : 2.6}" fill="${GREEN}"/>`,
      );
    }
    const last = seen[seen.length - 1];
    if (last) {
      const flip = last.cx > width - PM.r - 48;
      parts.push(
        text(last.cx + (flip ? -6 : 6), y(last.value) - 7, `${last.value.toFixed(1)}%`, {
          'text-anchor': flip ? 'end' : 'start',
          'font-size': 13,
          'font-weight': 700,
          class: 'me-halo',
        }),
      );
    }
    const cursor = round(x(positions[stepIndex] ?? 0));
    parts.push(
      `<line x1="${cursor}" x2="${cursor}" y1="${PM.t}" y2="${s1}" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 3"/>`,
    );
    parts.push('</svg>');
    plotHtml = parts.join('');
  }

  function dwell(item: GhStep): number {
    if (item.best) return 1400;
    if (item.kind === 'edit') return 450;
    if (item.kind === 'games') return 220;
    return 120;
  }

  function tickStep(): void {
    clearTimeout(timer);
    const b = budget;
    if (!playing || !visible || !b) return;
    if (stepIndex >= b.steps.length - 1) {
      playing = false;
      return;
    }
    stepIndex += 1;
    renderPlayer();
    timer = setTimeout(tickStep, dwell(b.steps[stepIndex]));
  }

  function play(): void {
    exploring = false;
    resumeAfterExplore = false;
    playing = true;
    clearTimeout(timer);
    timer = setTimeout(tickStep, 500);
  }

  function pause(): void {
    playing = false;
    clearTimeout(timer);
  }

  function togglePlay(): void {
    const b = budget;
    if (!b) return;
    if (playing) {
      resumeAfterExplore = false;
      pause();
      return;
    }
    if (stepIndex >= b.steps.length - 1) {
      stepIndex = 0;
      renderPlayer();
    }
    exploring = false;
    play();
  }

  async function selectBudget(index: number, autoplay: boolean): Promise<void> {
    on = index;
    pause();
    await tick();
    const b = data?.budgets[index];
    if (!b) return;
    const canPlay = b.passes > 0 && b.steps.length > 2;
    stepIndex = canPlay && autoplay ? 0 : b.steps.length - 1;
    autoplayPending = canPlay && autoplay;
    exploring = false;
    resumeAfterExplore = false;
    renderPlayer();
  }

  function handlePlotMove(event: PointerEvent): void {
    const b = budget;
    if (!b || !plotEl) return;
    const svg = plotEl.querySelector('svg');
    if (!svg) return;
    const steps = b.steps;
    const local = clientToSvg(event, svg);
    const width = Math.max(260, Math.round(plotEl.clientWidth));
    const p = ((local.x - PM.l) / (width - PM.l - PM.r)) * (b.passes + 1);
    let best = 0;
    plotPositions.forEach((q, k) => {
      if (Math.abs(q - p) < Math.abs(plotPositions[best] - p)) best = k;
    });
    if (!exploring) {
      resumeAfterExplore = playing;
      pause();
      exploring = true;
    }
    if (best !== stepIndex) {
      stepIndex = best;
      renderPlayer();
    } else {
      renderPlot();
    }
  }

  function handlePlotLeave(): void {
    const b = budget;
    if (!exploring || !b) return;
    exploring = false;
    renderPlot();
    if (resumeAfterExplore && stepIndex < b.steps.length - 1) play();
  }

  /* ---------- 挂载 ---------- */

  onMount(() => {
    let disposed = false;
    let chartObserver: ResizeObserver | undefined;
    let plotObserver: ResizeObserver | undefined;
    let viewObserver: IntersectionObserver | undefined;

    void (async () => {
      try {
        const [loaded, setupText] = await Promise.all([
          loadJson<GhData>(GH_JSON),
          loadSetup(SETUP_KEY),
        ]);
        if (disposed) return;
        data = loaded;
        setup = setupText;
        on = Math.max(0, loaded.budgets.length - 1);
        await tick();
        await refreshChart();
        shownBudget = on;
        await selectBudget(on, true);

        chartObserver = new ResizeObserver(() => {
          void refreshChart();
        });
        if (boxEl) chartObserver.observe(boxEl);
        plotObserver = new ResizeObserver(() => {
          renderPlot();
        });
        if (plotEl) plotObserver.observe(plotEl);

        viewObserver = new IntersectionObserver(
          (entries) => {
            visible = entries[0]?.isIntersecting ?? false;
            if (!visible) return;
            if (autoplayPending && stepIndex === 0 && !playing && !exploring) {
              autoplayPending = false;
              play();
            } else if (playing) {
              clearTimeout(timer);
              timer = setTimeout(tickStep, 400);
            }
          },
          { threshold: 0.3 },
        );
        if (rootEl) viewObserver.observe(rootEl);
      } catch {
        failed = true;
      }
    })();

    return () => {
      disposed = true;
      chartObserver?.disconnect();
      plotObserver?.disconnect();
      viewObserver?.disconnect();
      clearTimeout(timer);
    };
  });
</script>

<div class="ws-demo gh-fig" bind:this={rootEl}>
  {#if data}
    {#if setup}
      <details class="ws-setup">
        <summary>Setup</summary>
        <div class="ws-setup-body">
          <div class="bi-en" lang="en">
            <ul>
              {#each setup.en as item}
                <li>{@html item}</li>
              {/each}
            </ul>
          </div>
          <div class="bi-zh">
            <ul>
              {#each setup.zh as item}
                <li>{@html item}</li>
              {/each}
            </ul>
          </div>
        </div>
      </details>
    {/if}

    <div class="gh-legend">
      <span class="gh-lhead">战胜对象</span>
      <span class="me-item"><span class="me-key" style="--c: {GREEN}"></span>小 PPO，种子 0</span>
      <span class="me-item"><span class="me-key" style="--c: {LIGHT}"></span>种子 2</span>
      <span class="me-item"><span class="me-key" style="--c: {ORANGE}"></span>与 Astra 同尺寸的 PPO（512 × 6）</span>
    </div>

    <!-- 指到哪一列只是鼠标增强，键盘等价物不需要：图表本身是 role=img 的静态图。 -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="gh-box" bind:this={boxEl} onpointermove={handleChartMove}>
      {@html chartHtml}
    </div>

    <div class="gh-panel">
      <div class="gh-ptitle">
        {budget ? budgetName(budget) : ''}
        {#if plays}
          <button type="button" class="tp-btn gh-play" onclick={togglePlay}>
            {playing ? '❚❚ 暂停' : '▶ 播放'}
          </button>
        {/if}
      </div>

      {#if plays}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="gh-plot"
          bind:this={plotEl}
          onpointermove={handlePlotMove}
          onpointerleave={handlePlotLeave}
        >
          {@html plotHtml}
        </div>
        <div class="gh-pkey">
          <span class="me-item">
            <span class="me-key" style="--c: {GREEN}"></span>对 PPO 的练习赛胜率，按已用前向次数
          </span>
          <span class="me-item"><span class="me-tick"></span>改过权重</span>
        </div>
      {:else}
        <div class="gh-pline">{usedLine}</div>
      {/if}

      <div class="gh-turn">{@html turnMarkup}</div>
    </div>
  {:else if failed}
    <p class="gh-failed">这张图加载失败了，刷新页面再试。</p>
  {/if}
</div>
