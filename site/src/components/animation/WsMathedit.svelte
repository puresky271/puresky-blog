<script lang="ts">
  /**
   * 实验 8 的两张图，复刻原站 js/mathedit.js，一个组件两种形态（config.figure）：
   *
   * - bench：八个基准各一条折线（数学基准绿、其他橙），MATH-500 默认在前（粗线、点、渐变填充），
   *   鼠标靠近某条线或线尾的名字就切到它。线尾右侧写名字和最终分数，彼此错开 18px，有引导小线段。
   *   首次进入视野时线条自己画出来（stroke-dasharray 动画，每条错开 70ms），分数点随后出现。
   * - traj：一次训练运行逐回合播放。顶部三个标签页（50 / 25 / 10 次前向），下面工具栏，
   *   主区左边是曲线（编辑后实测与原始，之间绿色半透明填充带，下方每回合一个刻度），
   *   右边是当前回合（标签、一行摘要、pass 结果、said 原话、假设、更多内容折叠）。
   *   播放时关键编辑停 1.7 秒，改权重或测量停 280ms，其他 80ms；指着图表停在那一个回合。
   */

  import { onMount, tick } from 'svelte';

  import { esc, loadJson, loadSetup, type SetupText } from './ws/data';
  import './ws/mathedit.css';

  /* ---------- 数据类型 ---------- */

  interface BenchPoint {
    passes: number;
    score: number;
    note?: string | null;
  }

  interface BenchRow {
    name: string;
    group: 'math' | 'other';
    points: BenchPoint[];
  }

  interface BenchData {
    source: string;
    benchmarks: BenchRow[];
  }

  interface MePass {
    number?: number;
    type?: string;
    model?: string;
    items?: number;
    samples?: number;
    original?: number;
    edited?: number;
    difference?: number;
    se?: number;
    cut?: number;
    cut_original?: number;
    cut_edited?: number;
    texts?: number;
    failed?: boolean;
  }

  interface MeTurn {
    turn: number;
    used: number;
    used_after: number;
    kind: string;
    edit?: boolean | null;
    key?: boolean | null;
    summary?: string | null;
    said?: string | null;
    hypothesis?: string | null;
    error?: string | null;
    not_run?: boolean | null;
    pass?: MePass | null;
  }

  interface MeRun {
    run: string;
    budget: number;
    turns: MeTurn[];
    final: string;
  }

  interface MeData {
    source: string;
    runs: MeRun[];
  }

  /* ---------- 常量 ---------- */

  const BENCH_JSON = '/data/weight-space/mathedit/benchmarks.json';
  const TRAJ_JSON = '/data/weight-space/mathedit/trajectories.json';
  const SETUP_KEY = 'exp8_math';

  const GREEN = 'var(--ws-green)';
  const ORANGE = 'var(--ws-orange)';
  const GREY = 'var(--ws-grey)';
  const RED = 'var(--ws-red)';
  const INK = 'var(--ws-ink)';
  const GRID = 'var(--ws-line-soft)';
  const AXIS = 'var(--ws-axis)';
  const CARD = 'var(--ws-card)';

  const runTag = (budget: number) => `${budget} 次前向`;

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

  function mdInline(source: string): string {
    return esc(source)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  /** 最终答案：标题、段落、列表、表格、粗体、行内代码。 */
  function md(source: string): string {
    const out: string[] = [];
    let table: string[] | null = null;
    let list = false;
    const close = () => {
      if (table) {
        out.push(`<table>${table.join('')}</table>`);
        table = null;
      }
      if (list) {
        out.push('</ul>');
        list = false;
      }
    };
    for (const raw of source.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('|')) {
        if (/^[|\s:-]+$/.test(line)) continue;
        if (list) {
          out.push('</ul>');
          list = false;
        }
        table = table ?? [];
        const cells = line
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => mdInline(cell.trim()));
        table.push(`<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`);
        continue;
      }
      if (!line) {
        close();
        continue;
      }
      const heading = line.match(/^#+\s*(.*)$/);
      if (heading) {
        close();
        out.push(`<div class="me-h">${mdInline(heading[1])}</div>`);
        continue;
      }
      if (/^[-*]\s+/.test(line)) {
        if (table) {
          out.push(`<table>${table.join('')}</table>`);
          table = null;
        }
        if (!list) {
          out.push('<ul>');
          list = true;
        }
        out.push(`<li>${mdInline(line.replace(/^[-*]\s+/, ''))}</li>`);
        continue;
      }
      close();
      out.push(`<p>${mdInline(line)}</p>`);
    }
    close();
    return out.join('');
  }

  /** 这个回合发生的事，一行说完。界面文案走中文。 */
  function action(turn: MeTurn): string {
    if (turn.not_run) return '未运行：回复里没有解释，被退回了';
    if (turn.kind === 'final') return '最终答案';
    if (turn.kind === 'python') {
      if (turn.error) return `跑了 Python，在报错处停下（${turn.error.split(':')[0]}）`;
      return turn.edit ? '跑了 Python，改了权重' : '跑了 Python，看了权重和结果';
    }
    const pass = turn.pass ?? {};
    if (pass.failed && !pass.number) return '请求了一次前向，失败且未计入';
    const what =
      pass.type === 'generate'
        ? `生成，${pass.model === 'both' ? '原始与编辑后的权重' : `${pass.model} 权重`}，${pass.items} 道题${
            (pass.samples ?? 1) > 1 ? ` × ${pass.samples}` : ''
          }`
        : `teacher-forced，${pass.model} 权重，${pass.texts} 段文本`;
    return `第 ${pass.number} 次前向：${what}${pass.failed ? '（失败，未计入）' : ''}`;
  }

  /** 一次测量的结果。 */
  function passResult(pass?: MePass | null): string {
    if (!pass || pass.failed) return '';
    if (pass.model === 'both' && pass.edited != null) {
      const diff = pass.difference ?? 0;
      return (
        `原始 <b>${pass.original}%</b> → 编辑后 <b>${pass.edited}%</b>` +
        `（${diff > 0 ? '+' : ''}${diff} ± ${pass.se} 个百分点）` +
        `· 撞上 token 上限：${Math.round((pass.cut_original ?? 0) * 100)}% → ` +
        `${Math.round((pass.cut_edited ?? 0) * 100)}%`
      );
    }
    if (pass.type === 'generate') {
      const score = pass.model === 'original' ? pass.original : pass.edited;
      return (
        `${pass.model} 权重：<b>${score ?? 0}%</b> 正确` +
        `· 撞上 token 上限：${Math.round((pass.cut ?? 0) * 100)}%`
      );
    }
    return '';
  }

  /* ---------- 状态 ---------- */

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  const figure = $derived<'bench' | 'traj'>(config.figure === 'bench' ? 'bench' : 'traj');

  let failed = $state(false);
  let setup = $state<SetupText | undefined>(undefined);

  /* bench */
  let bench = $state<BenchData | null>(null);
  let benchHtml = $state('');
  let benchBox = $state<HTMLDivElement>();
  let benchWidth = 0;
  let benchFocus = 0;
  let benchDrawn = false;
  let benchSvg: SVGSVGElement | null = null;
  let benchMarks: SVGGElement | null = null;
  let benchWash: SVGPathElement | null = null;
  let benchScale: { W: number; H: number; X: (p: number) => number; Y: (v: number) => number } | null =
    null;
  let benchSeries: {
    index: number;
    group: SVGGElement;
    line: SVGPolylineElement;
    dots: SVGCircleElement[];
    label: SVGTextElement | null;
    points: [number, number][];
  }[] = [];

  /* traj */
  let traj = $state<MeData | null>(null);
  let trajHtml = $state('');
  let panelMarkup = $state('');
  let panelHeight = $state(0);
  let positionText = $state('');
  let runIndex = $state(0);
  let playing = $state(true);
  let rootEl = $state<HTMLDivElement>();
  let plotEl = $state<HTMLDivElement>();
  let panelEl = $state<HTMLDivElement>();
  let stepIndex = 0;
  let exploring = false;
  let resumeAfterExplore = false;
  let openMore = false;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let panelToken = 0;
  let pulsedTurn = -1;
  let trajScale: {
    W: number;
    H: number;
    M: { l: number; r: number; t: number; b: number };
    S0: number;
    S1: number;
    X: (p: number) => number;
    Y: (v: number) => number;
    pos: number[];
  } | null = null;
  let tickEls: SVGLineElement[] = [];
  let bandLayer: SVGGElement | null = null;
  let lineLayer: SVGGElement | null = null;
  let dotLayer: SVGGElement | null = null;
  let valueLayer: SVGGElement | null = null;
  let cursorEl: SVGLineElement | null = null;
  let markerEl: SVGPathElement | null = null;
  let pulseEl: SVGCircleElement | null = null;

  const currentRun = $derived<MeRun | null>(traj ? (traj.runs[runIndex] ?? null) : null);
  const edits = $derived(
    currentRun
      ? currentRun.turns.map((turn, index) => ({ turn, index })).filter((item) => item.turn.edit)
      : [],
  );

  /* ---------- bench：八个基准的折线 ---------- */

  function renderBench(): void {
    if (!bench || !benchBox) return;
    const W = Math.max(330, Math.round(benchBox.clientWidth));
    if (W === benchWidth && benchHtml) return;
    benchWidth = W;

    const H = Math.round(Math.min(440, Math.max(320, W * 0.46)));
    // 窄屏上右侧的名字列会顶到画布边缘，字号收小一点才放得下
    const narrow = W < 560;
    const nameSize = narrow ? 11.5 : 14;
    const M = { l: 52, r: narrow ? 152 : 178, t: 24, b: 60 };
    const X = (p: number) => M.l + 22 + (p / 50) * (W - M.l - M.r - 22);
    const YMAX = 75;
    const Y = (v: number) => M.t + (1 - v / YMAX) * (H - M.t - M.b);
    benchScale = { W, H, X, Y };
    const colorOf = (row: BenchRow) => (row.group === 'math' ? GREEN : ORANGE);

    // 线尾右侧的名字和最终分数，上下错开 18px 免得压在一起
    const endOf = new Map<BenchRow, { at: number; x: number }>();
    const ends = bench.benchmarks.map((row) => {
      const last = row.points[row.points.length - 1];
      return { row, at: Y(last.score), x: X(last.passes) };
    });
    ends.sort((a, b) => a.at - b.at);
    for (let i = 1; i < ends.length; i += 1) {
      ends[i].at = Math.max(ends[i].at, ends[i - 1].at + 18);
    }
    const over = ends[ends.length - 1].at - (H - M.b);
    if (over > 0) ends.forEach((end) => (end.at -= over));
    ends.forEach((end) => endOf.set(end.row, { at: end.at, x: end.x }));

    const parts: string[] = [
      `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
        `class="me-svg${benchDrawn ? '' : ' me-hidden'}" role="img" ` +
        'aria-label="八个基准在原始模型与 10、25、50 次前向编辑下的准确率。">',
      '<defs>',
      '<linearGradient id="me-wash-math" x1="0" x2="0" y1="0" y2="1">',
      `<stop offset="0%" stop-color="${GREEN}" stop-opacity="0.16"/>`,
      `<stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>`,
      '</linearGradient>',
      '<linearGradient id="me-wash-other" x1="0" x2="0" y1="0" y2="1">',
      `<stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.16"/>`,
      `<stop offset="100%" stop-color="${ORANGE}" stop-opacity="0"/>`,
      '</linearGradient>',
      '</defs>',
    ];

    for (const v of [0, 20, 40, 60]) {
      parts.push(
        `<line x1="${M.l}" x2="${W - M.r + 8}" y1="${round(Y(v))}" y2="${round(Y(v))}" ` +
          `stroke="${v ? GRID : AXIS}"/>`,
      );
      parts.push(text(M.l - 10, Y(v) + 5, `${v}%`, { 'text-anchor': 'end' }));
    }
    for (const p of [0, 10, 25, 50]) {
      parts.push(
        `<line x1="${round(X(p))}" x2="${round(X(p))}" y1="${M.t}" y2="${H - M.b}" stroke="${GRID}"/>`,
      );
      parts.push(
        text(X(p), H - M.b + 22, p ? String(p) : '原始', {
          'text-anchor': 'middle',
          'font-weight': p ? 400 : 600,
        }),
      );
    }
    parts.push(
      text((X(0) + X(50)) / 2, H - 8, 'Astra 可用的前向次数', {
        'text-anchor': 'middle',
        'font-weight': 600,
      }),
    );

    parts.push('<path class="me-wash" pointer-events="none"/>');

    for (const [index, row] of bench.benchmarks.entries()) {
      const end = endOf.get(row) ?? { at: Y(0), x: X(50) };
      const points = row.points.map(
        (point) => [X(point.passes), Y(point.score)] as [number, number],
      );
      const last = row.points[row.points.length - 1];
      parts.push(`<g class="me-series" data-i="${index}">`);
      parts.push(
        `<polyline points="${points.map(([cx, cy]) => `${round(cx)},${round(cy)}`).join(' ')}" ` +
          `fill="none" stroke="${colorOf(row)}" stroke-width="2" stroke-linejoin="round" ` +
          'stroke-linecap="round"/>',
      );
      points.forEach(([cx, cy]) =>
        parts.push(
          `<circle cx="${round(cx)}" cy="${round(cy)}" r="4" fill="${colorOf(row)}" ` +
            `stroke="${CARD}" stroke-width="2"/>`,
        ),
      );
      parts.push(
        `<line x1="${round(end.x + 7)}" y1="${round(Y(last.score))}" x2="${round(end.x + 15)}" ` +
          `y2="${round(end.at)}" stroke="${AXIS}" class="me-lead"/>`,
      );
      parts.push(
        `<text x="${round(end.x + 19)}" y="${round(end.at + 5)}" font-size="${nameSize}" fill="${INK}" ` +
          `class="me-name">${esc(row.name)}<tspan dx="6" class="me-val">${last.score.toFixed(1)}</tspan></text>`,
      );
      parts.push('</g>');
    }

    parts.push('<g class="me-marks-layer" pointer-events="none"></g>');
    parts.push('</svg>');
    benchHtml = parts.join('');
  }

  async function refreshBench(): Promise<void> {
    renderBench();
    await tick();
    benchSvg = benchBox?.querySelector('svg') ?? null;
    benchMarks = benchSvg?.querySelector<SVGGElement>('.me-marks-layer') ?? null;
    benchWash = benchSvg?.querySelector<SVGPathElement>('.me-wash') ?? null;
    benchSeries = [];
    if (!bench || !benchScale) return;
    bench.benchmarks.forEach((row, index) => {
      const group = benchSvg?.querySelector<SVGGElement>(`.me-series[data-i="${index}"]`);
      const line = group?.querySelector<SVGPolylineElement>('polyline') ?? null;
      if (!group || !line) return;
      benchSeries.push({
        index,
        group,
        line,
        dots: [...group.querySelectorAll<SVGCircleElement>('circle')],
        label: group.querySelector<SVGTextElement>('.me-name'),
        points: row.points.map(
          (point) => [benchScale!.X(point.passes), benchScale!.Y(point.score)] as [number, number],
        ),
      });
    });
    applyBenchFocus(benchFocus);
  }

  function applyBenchFocus(index: number): void {
    if (!bench || !benchScale || !benchMarks || !benchWash) return;
    benchFocus = index;
    const target = benchSeries.find((item) => item.index === index);
    if (!target) return;
    for (const item of benchSeries) {
      const active = item === target;
      item.group.classList.toggle('me-dim', !active);
      item.group.classList.toggle('me-on', active);
      item.line.setAttribute('stroke-width', active ? '3' : '2');
      item.dots.forEach((dot) => dot.setAttribute('r', active ? '5' : '3.5'));
    }
    target.group.parentNode?.insertBefore(target.group, benchMarks);

    const row = bench.benchmarks[index];
    const base = benchScale.Y(0);
    const washPath =
      `M${target.points.map(([cx, cy]) => `${round(cx)},${round(cy)}`).join(' L')} ` +
      `L${round(target.points[target.points.length - 1][0])},${round(base)} ` +
      `L${round(target.points[0][0])},${round(base)} Z`;
    benchWash.setAttribute('d', washPath);
    benchWash.setAttribute(
      'fill',
      `url(#${row.group === 'math' ? 'me-wash-math' : 'me-wash-other'})`,
    );

    benchMarks.innerHTML = row.points
      .slice(0, 3)
      .map((point, k) => {
        const [cx, cy] = target.points[k];
        return text(cx, cy - 12, `${point.score.toFixed(1)}${point.note ? '*' : ''}`, {
          'text-anchor': 'middle',
          'font-weight': 700,
          class: 'me-halo',
        });
      })
      .join('');
  }

  function nearestBench(event: PointerEvent): number | null {
    if (!benchSvg || !benchScale) return null;
    const local = clientToSvg(event, benchSvg);
    let best: number | null = null;
    let distance = 22;
    for (const item of benchSeries) {
      for (let k = 0; k < 3; k += 1) {
        const [x1, y1] = item.points[k];
        const [x2, y2] = item.points[k + 1];
        const span = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        const t = span
          ? Math.max(0, Math.min(1, ((local.x - x1) * (x2 - x1) + (local.y - y1) * (y2 - y1)) / span))
          : 0;
        const dd = Math.hypot(local.x - (x1 + t * (x2 - x1)), local.y - (y1 + t * (y2 - y1)));
        if (dd < distance) {
          distance = dd;
          best = item.index;
        }
      }
      if (item.label) {
        const box = item.label.getBBox();
        if (
          local.x >= box.x - 4 &&
          local.x <= box.x + box.width + 4 &&
          local.y >= box.y - 2 &&
          local.y <= box.y + box.height + 2
        ) {
          return item.index;
        }
      }
    }
    return best;
  }

  function handleBenchMove(event: PointerEvent): void {
    const index = nearestBench(event);
    if (index !== null && index !== benchFocus) applyBenchFocus(index);
  }

  function handleBenchLeave(): void {
    if (benchFocus !== 0) applyBenchFocus(0);
  }

  /** 首次进入视野：线条自己画出来，分数点随后淡入。 */
  function startBenchDraw(): void {
    const svg = benchSvg;
    if (!svg || benchDrawn) return;
    benchDrawn = true;
    svg.classList.remove('me-hidden');
    benchSeries.forEach((item, k) => {
      const length = item.line.getTotalLength();
      item.line.style.strokeDasharray = `${length}`;
      item.line.style.strokeDashoffset = `${length}`;
      void item.line.getBoundingClientRect();
      item.line.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.3,.7,.3,1) ${k * 70}ms`;
      item.line.style.strokeDashoffset = '0';
      item.group.style.setProperty('--delay', `${k * 70}ms`);
    });
    svg.classList.add('me-drawing');
    setTimeout(() => svg.classList.remove('me-drawing'), 2600);
  }

  /* ---------- traj：逐回合轨迹 ---------- */

  function renderScaffold(): void {
    const run = currentRun;
    if (!run || !plotEl) return;
    const W = Math.max(300, Math.round(plotEl.clientWidth));
    const H = Math.round(Math.min(390, Math.max(280, W * 0.7)));
    const M = { l: 58, r: 10, t: 10, b: 84 };
    const S0 = H - M.b + 10;
    const S1 = S0 + 24;
    const budget = run.budget;
    const turns = run.turns;

    // 每回合在 x 轴上有一个位置：第 k 次前向到第 k+1 次之间那些回合并排
    const groups = new Map<number, number[]>();
    turns.forEach((turn, k) => {
      const list = groups.get(turn.used_after) ?? [];
      list.push(k);
      groups.set(turn.used_after, list);
    });
    const pos: number[] = [];
    for (const [group, list] of groups) {
      list.forEach((k, j) => {
        pos[k] = group + j / list.length;
      });
    }
    const X = (p: number) => M.l + (p / (budget + 1)) * (W - M.l - M.r);
    const Y = (v: number) => M.t + (1 - v / 80) * (H - M.t - M.b);
    trajScale = { W, H, M, S0, S1, X, Y, pos };
    panelHeight = H;

    const parts: string[] = [
      `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="me-svg" role="img" ` +
        `aria-label="${budget} 次前向那次运行里 Astra 测到的练习赛准确率，以及它改权重的那些回合。">`,
    ];
    for (const v of [0, 20, 40, 60, 80]) {
      parts.push(
        `<line x1="${M.l}" x2="${W - M.r}" y1="${round(Y(v))}" y2="${round(Y(v))}" ` +
          `stroke="${v ? GRID : AXIS}"/>`,
      );
      parts.push(text(M.l - 8, Y(v) + 5, String(v), { 'text-anchor': 'end' }));
    }
    parts.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${S1}" y2="${S1}" stroke="${AXIS}"/>`);
    const step = budget <= 10 ? 2 : budget <= 25 ? 5 : 10;
    for (let p = 0; p <= budget; p += step) {
      parts.push(text(X(p), S1 + 20, String(p), { 'text-anchor': 'middle' }));
    }
    parts.push(
      text((M.l + W - M.r) / 2, H - 8, '已用前向次数', {
        'text-anchor': 'middle',
        'font-weight': 600,
      }),
    );
    parts.push(
      text(0, 0, '练习赛准确率（%）', {
        transform: `translate(20 ${(M.t + H - M.b) / 2}) rotate(-90)`,
        'text-anchor': 'middle',
        'font-size': 12.5,
        'font-weight': 600,
      }),
    );

    // 刻度条：每回合一小根灰刻度，改过权重的回合是红色长刻度，关键编辑还有红点
    parts.push('<g class="me-strip">');
    turns.forEach((turn, k) => {
      const cx = round(X(pos[k]));
      parts.push(
        turn.edit
          ? `<line x1="${cx}" x2="${cx}" y1="${S0}" y2="${S1}" stroke="${RED}" stroke-width="2.5"/>`
          : `<line x1="${cx}" x2="${cx}" y1="${S1 - 8}" y2="${S1}" stroke="var(--ws-line-strong)" stroke-width="1"/>`,
      );
    });
    turns.forEach((turn, k) => {
      if (!turn.key) return;
      parts.push(`<circle cx="${round(X(pos[k]))}" cy="${S0}" r="3.5" fill="${RED}"/>`);
    });
    parts.push('</g>');

    parts.push(
      `<circle class="me-pulse" r="4" fill="none" stroke="${RED}" stroke-width="2" opacity="0"/>`,
      '<g class="me-band"></g>',
      '<g class="me-lines"></g>',
      '<g class="me-dots"></g>',
      '<g class="me-vals"></g>',
      `<line class="me-cursor" y1="${M.t}" y2="${S1}" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 3"/>`,
      '<path class="me-marker"/>',
    );
    parts.push('</svg>');
    trajHtml = parts.join('');
  }

  async function refreshTraj(): Promise<void> {
    renderScaffold();
    await tick();
    const svg = plotEl?.querySelector('svg') ?? null;
    tickEls = [...(svg?.querySelectorAll<SVGLineElement>('.me-strip line') ?? [])];
    bandLayer = svg?.querySelector<SVGGElement>('.me-band') ?? null;
    lineLayer = svg?.querySelector<SVGGElement>('.me-lines') ?? null;
    dotLayer = svg?.querySelector<SVGGElement>('.me-dots') ?? null;
    valueLayer = svg?.querySelector<SVGGElement>('.me-vals') ?? null;
    cursorEl = svg?.querySelector<SVGLineElement>('.me-cursor') ?? null;
    markerEl = svg?.querySelector<SVGPathElement>('.me-marker') ?? null;
    pulseEl = svg?.querySelector<SVGCircleElement>('.me-pulse') ?? null;
    drawTraj();
  }

  function drawTraj(): void {
    const run = currentRun;
    const scale = trajScale;
    if (!run || !scale || !cursorEl || !markerEl || !pulseEl) return;
    const { X, Y, S0, pos, W, M } = scale;
    const turns = run.turns;
    const turn = turns[stepIndex];

    const cx = round(X(pos[stepIndex] ?? 0));
    cursorEl.setAttribute('x1', String(cx));
    cursorEl.setAttribute('x2', String(cx));
    markerEl.setAttribute('d', `M${cx - 6},${S0 - 10} L${cx + 6},${S0 - 10} L${cx},${S0 - 1} Z`);
    markerEl.setAttribute('fill', turn.edit ? RED : INK);

    tickEls.forEach((el, k) => el.setAttribute('opacity', k <= stepIndex ? '1' : '0.35'));

    // 到关键编辑时向外打一圈红环
    if (turn.key && pulsedTurn !== stepIndex) {
      pulseEl.setAttribute('cx', String(cx));
      pulseEl.setAttribute('cy', String(S0));
      pulseEl.classList.remove('me-pulse-on');
      void pulseEl.getBoundingClientRect();
      pulseEl.classList.add('me-pulse-on');
    }
    pulsedTurn = stepIndex;

    // 测量值：[回合序号, x, 原始, 编辑后]
    const measured = turns
      .map((item, k) => {
        const pass = item.pass;
        if (!pass || pass.failed || pass.type !== 'generate') return null;
        return {
          k,
          at: X(pos[k]),
          original: pass.original ?? null,
          edited: pass.edited ?? null,
        };
      })
      .filter(
        (item): item is { k: number; at: number; original: number | null; edited: number | null } =>
          item !== null,
      );
    const lastSeen = measured.reduce((acc, item) => (item.k <= stepIndex ? item.k : acc), -1);
    const shown = exploring ? measured : measured.filter((item) => item.k <= stepIndex);

    // 编辑后的线与原始之间那块绿色半透明填充
    const bandParts: string[] = [];
    for (const [part, opacity] of [
      [shown.filter((item) => item.k <= stepIndex), 0.12],
      [shown.filter((item) => item.k >= lastSeen), 0.05],
    ] as const) {
      const usable = part.filter((item) => item.original != null && item.edited != null);
      if (usable.length > 1) {
        bandParts.push(
          `<path d="M${usable
            .map((item) => `${round(item.at)},${round(Y(item.edited as number))}`)
            .join(' L')} L${usable
            .slice()
            .reverse()
            .map((item) => `${round(item.at)},${round(Y(item.original as number))}`)
            .join(' L')} Z" fill="${GREEN}" opacity="${opacity}"/>`,
        );
      }
    }
    if (bandLayer) bandLayer.innerHTML = bandParts.join('');

    // 最新那次的分数，写在点旁边
    const now = measured.find((item) => item.k === lastSeen);
    const valueParts: string[] = [];
    if (now) {
      const flip = now.at > W - M.r - 70;
      const put = (value: number, dy: number, bold: boolean) =>
        text(now.at + (flip ? -10 : 10), Y(value) + dy, `${value}%`, {
          'text-anchor': flip ? 'end' : 'start',
          'font-weight': bold ? 700 : 600,
          class: 'me-halo',
        });
      if (now.edited != null) {
        put(
          now.edited,
          now.original != null && now.edited - now.original < 6 ? -8 : 5,
          true,
        );
      }
      if (now.original != null) {
        put(
          now.original,
          now.edited != null && now.edited - now.original < 6 ? 18 : 5,
          false,
        );
      }
    }
    if (valueLayer) valueLayer.innerHTML = valueParts.join('');

    const lineParts: string[] = [];
    for (const [color, key] of [
      [GREY, 'original'],
      [GREEN, 'edited'],
    ] as const) {
      for (const [part, opacity] of [
        [shown.filter((item) => item.k <= stepIndex), 1],
        [shown.filter((item) => item.k >= lastSeen), 0.3],
      ] as const) {
        const points = part
          .filter((item) => item[key] != null)
          .map((item) => `${round(item.at)},${round(Y(item[key] as number))}`);
        if (points.length > 1) {
          lineParts.push(
            `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" ` +
              `stroke-width="2" stroke-linejoin="round" opacity="${opacity}"/>`,
          );
        }
      }
    }
    if (lineLayer) lineLayer.innerHTML = lineParts.join('');

    const dotParts: string[] = [];
    for (const item of shown) {
      for (const [color, key] of [
        [GREY, 'original'],
        [GREEN, 'edited'],
      ] as const) {
        if (item[key] == null) continue;
        dotParts.push(
          `<circle cx="${round(item.at)}" cy="${round(Y(item[key] as number))}" ` +
            `r="${item.k === stepIndex ? 6 : 4}" fill="${color}" stroke="${CARD}" stroke-width="1.5" ` +
            `opacity="${item.k <= stepIndex ? 1 : 0.3}"/>`,
        );
      }
    }
    if (dotLayer) dotLayer.innerHTML = dotParts.join('');

    positionText =
      `回合 ${stepIndex + 1} / ${turns.length} · ` +
      `已用 ${turn.used_after} / ${run.budget} 次前向`;
    void renderPanel();
  }

  function panelHtml(turn: MeTurn, k: number, final: string): string {
    const tag = turn.not_run
      ? '未运行'
      : turn.edit
        ? '改过权重'
        : turn.kind === 'final'
          ? '最终答案'
          : turn.kind === 'forward'
            ? '前向传播'
            : 'Python';
    const result = passResult(turn.pass);
    const extra: [string, string][] = [];
    let body = '';
    if (turn.kind === 'final') {
      body = `<div class="me-clip me-final">${md(final)}</div>`;
    } else if (turn.said) {
      body = `<p class="me-clip me-said">“${esc(turn.said)}”</p>`;
      if (turn.hypothesis) extra.push(['假设', esc(turn.hypothesis)]);
    } else if (turn.hypothesis) {
      body = `<p class="me-clip me-said">假设：${esc(turn.hypothesis)}</p>`;
    }
    if (turn.summary) extra.push(['步骤', esc(action(turn))]);
    if (turn.error) extra.push(['错误', esc(turn.error)]);

    return (
      `<div class="me-head">回合 ${k + 1}${
        turn.pass?.number ? `，第 ${turn.pass.number} 次前向` : ''
      }</div>` +
      `<span class="me-tag${turn.edit ? ' me-tag-edit' : ''}">${tag}</span>` +
      `<div class="me-sum">${esc(turn.summary || action(turn))}</div>` +
      `${result ? `<div class="me-res">${result}</div>` : ''}` +
      body +
      extra.map(([label, value]) => `<div class="me-extra"><b>${label}：</b> ${value}</div>`).join('') +
      '<button type="button" class="me-more" hidden></button>'
    );
  }

  async function renderPanel(): Promise<void> {
    const run = currentRun;
    if (!run) return;
    const token = ++panelToken;
    const turn = run.turns[stepIndex];
    panelMarkup = panelHtml(turn, stepIndex, run.final);
    await tick();
    if (token !== panelToken || !panelEl) return;
    panelEl.classList.toggle('me-open', openMore);
    // 每次重画都先摘掉升起动画，只有播放中走到关键编辑时才重新加上（和原站一致）
    panelEl.classList.remove('me-enter');
    if (turn.key && playing) {
      void panelEl.getBoundingClientRect();
      panelEl.classList.add('me-enter');
    }
    const clip = panelEl.querySelector<HTMLElement>('.me-clip');
    const more = panelEl.querySelector<HTMLButtonElement>('.me-more');
    if (!more) return;
    const extraCount = panelEl.querySelectorAll('.me-extra').length;
    const clipped = Boolean(clip && (openMore || clip.scrollHeight > clip.clientHeight + 1));
    more.hidden = !(clipped || extraCount > 0);
    more.textContent = openMore ? '▾ 收起' : '▸ 更多';
  }

  function handlePanelClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.me-more')) return;
    openMore = !openMore;
    hold();
    void renderPanel();
  }

  function dwellOf(turn: MeTurn): number {
    if (turn.key) return 1700;
    if (turn.edit || turn.pass?.edited != null) return 280;
    return 80;
  }

  function go(index: number): void {
    const run = currentRun;
    if (!run) return;
    stepIndex = Math.max(0, Math.min(run.turns.length - 1, index));
    drawTraj();
  }

  function tickStep(): void {
    clearTimeout(timer);
    const run = currentRun;
    if (!playing || !visible || !run) return;
    if (stepIndex >= run.turns.length - 1) {
      playing = false;
      return;
    }
    go(stepIndex + 1);
    timer = setTimeout(tickStep, dwellOf(run.turns[stepIndex]));
  }

  function play(): void {
    exploring = false;
    openMore = false;
    resumeAfterExplore = false;
    playing = true;
    clearTimeout(timer);
    timer = setTimeout(tickStep, 600);
  }

  function pause(): void {
    playing = false;
    clearTimeout(timer);
  }

  /** 读者在看某一回合：停在那里，并把整条曲线都显出来。 */
  function hold(): void {
    if (!exploring) resumeAfterExplore = playing || resumeAfterExplore;
    pause();
    exploring = true;
  }

  function togglePlay(): void {
    const run = currentRun;
    if (!run) return;
    if (playing) {
      resumeAfterExplore = false;
      pause();
      return;
    }
    if (stepIndex >= run.turns.length - 1) go(0);
    play();
  }

  function restart(): void {
    go(0);
    play();
  }

  async function selectRun(index: number): Promise<void> {
    runIndex = index;
    stepIndex = 0;
    exploring = false;
    openMore = false;
    pulsedTurn = -1;
    await tick();
    await refreshTraj();
    play();
  }

  function handlePlotMove(event: PointerEvent): void {
    const run = currentRun;
    const scale = trajScale;
    if (!run || !scale || !plotEl) return;
    const svg = plotEl.querySelector('svg');
    if (!svg) return;
    const local = clientToSvg(event, svg);
    const p = ((local.x - scale.M.l) / (scale.W - scale.M.l - scale.M.r)) * (run.budget + 1);
    let best = 0;
    scale.pos.forEach((q, k) => {
      if (Math.abs(q - p) < Math.abs(scale.pos[best] - p)) best = k;
    });
    // 靠近红色刻度时优先落在那个回合上，改过权重的回合才容易指中
    run.turns.forEach((turn, k) => {
      if (turn.edit && Math.abs(scale.X(scale.pos[k]) - scale.X(p)) < 5 && !run.turns[best].edit) {
        best = k;
      }
    });
    if (!exploring || best !== stepIndex) hold();
    go(best);
  }

  function handleRootLeave(): void {
    const run = currentRun;
    if (!exploring || !resumeAfterExplore || !run) return;
    if (stepIndex < run.turns.length - 1) play();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (figure !== 'traj') return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    hold();
    go(stepIndex + delta);
  }

  /* ---------- 挂载 ---------- */

  onMount(() => {
    let disposed = false;
    let boxObserver: ResizeObserver | undefined;
    let viewObserver: IntersectionObserver | undefined;

    void (async () => {
      try {
        if (figure === 'bench') {
          bench = await loadJson<BenchData>(BENCH_JSON);
          if (disposed) return;
          await tick();
          await refreshBench();
          boxObserver = new ResizeObserver(() => {
            void refreshBench();
          });
          if (benchBox) boxObserver.observe(benchBox);
          viewObserver = new IntersectionObserver(
            (entries, observer) => {
              if (!entries[0]?.isIntersecting) return;
              observer.disconnect();
              startBenchDraw();
            },
            { threshold: 0.4 },
          );
          if (benchSvg) viewObserver.observe(benchSvg);
          return;
        }

        const [loaded, setupText] = await Promise.all([
          loadJson<MeData>(TRAJ_JSON),
          loadSetup(SETUP_KEY),
        ]);
        if (disposed) return;
        traj = loaded;
        setup = setupText;
        runIndex = 0;
        await tick();
        await refreshTraj();
        await renderPanel();
        boxObserver = new ResizeObserver(() => {
          if (!plotEl) return;
          const width = Math.round(plotEl.clientWidth);
          if (Math.abs(width - (trajScale?.W ?? 0)) < 2) return;
          void refreshTraj();
        });
        if (plotEl) boxObserver.observe(plotEl);
        viewObserver = new IntersectionObserver(
          (entries) => {
            visible = entries[0]?.isIntersecting ?? false;
            if (visible && playing) {
              clearTimeout(timer);
              timer = setTimeout(tickStep, 600);
            }
          },
          { threshold: 0.35 },
        );
        if (rootEl) viewObserver.observe(rootEl);
      } catch {
        failed = true;
      }
    })();

    return () => {
      disposed = true;
      boxObserver?.disconnect();
      viewObserver?.disconnect();
      clearTimeout(timer);
    };
  });
</script>

<!-- 整块是一个自绘的播放器：role=application 表意正确，但 Svelte 的无障碍规则只认
     少数几个「可交互」角色，这里显式忽略，键盘行为（←/→ 逐回合）由 handleKeydown 提供。 -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="ws-demo me-fig"
  class:me-traj={figure === 'traj'}
  class:me-bench={figure === 'bench'}
  class:has-setup={Boolean(setup)}
  bind:this={rootEl}
  onpointerleave={handleRootLeave}
  onkeydown={handleKeydown}
  tabindex={figure === 'traj' ? 0 : undefined}
  role="application"
  aria-label="数学权重编辑的逐回合轨迹"
>
  {#if failed}
    <p class="me-failed">这张图加载失败了，刷新页面再试。</p>
  {:else if figure === 'bench'}
    <div class="me-legend">
      <span class="me-item"><span class="me-key" style="--c: {GREEN}"></span>数学基准</span>
      <span class="me-item"><span class="me-key" style="--c: {ORANGE}"></span>其他基准</span>
    </div>
    <!-- 鼠标靠近折线切换聚焦只是增强，图本身有 role=img 和 aria-label。 -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="me-box"
      bind:this={benchBox}
      onpointermove={handleBenchMove}
      onpointerleave={handleBenchLeave}
    >
      {@html benchHtml}
    </div>
  {:else}
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

    {#if traj}
      <div class="tp-tabs me-tabs" role="tablist">
        <div class="tp-tabrow">
          <span class="tp-tabset">
            {#each traj.runs as run, k}
              <button
                type="button"
                role="tab"
                class="tp-tab"
                aria-selected={k === runIndex}
                onclick={() => void selectRun(k)}
              >
                {runTag(run.budget)}
              </button>
            {/each}
          </span>
        </div>
      </div>

      <div class="me-bar">
        <button type="button" class="tp-btn me-play" onclick={togglePlay}>
          {playing ? '❚❚ 暂停' : '▶ 播放'}
        </button>
        <button type="button" class="tp-btn me-restart" aria-label="重新播放" onclick={restart}>
          ↻
        </button>
        <span class="me-pos">{positionText}</span>
        <span class="me-legend">
          <span class="me-item">
            <span class="me-key" style="--c: {GREEN}"></span>编辑后（Astra 当前编辑）
          </span>
          <span class="me-item"><span class="me-key" style="--c: {GREY}"></span>原始</span>
          <span class="me-item"><span class="me-tick"></span>改过权重</span>
        </span>
      </div>

      <div class="me-main">
        <div class="me-plotbox">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="me-plot" bind:this={plotEl} onpointermove={handlePlotMove}>
            {@html trajHtml}
          </div>
        </div>
        <!-- 面板里的「更多」是按钮，这里的点击只是整块转发给最近的按钮。 -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="me-panel"
          bind:this={panelEl}
          style="height: {panelHeight}px"
          onclick={handlePanelClick}
        >
          {@html panelMarkup}
        </div>
      </div>

      <details class="me-list">
        <summary>本轮全部 {edits.length} 处编辑</summary>
        <ol>
          {#each edits as item}
            <li>
              <button
                type="button"
                class="me-jump"
                onclick={() => {
                  hold();
                  go(item.index);
                }}
              >
                回合 {item.turn.turn}
              </button>
              <span>{esc(item.turn.summary ?? '')}</span>
            </li>
          {/each}
        </ol>
      </details>
    {/if}
  {/if}
</div>
