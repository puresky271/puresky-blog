<script lang="ts">
  import { untrack } from 'svelte';

  import {
    createRotationTrace,
    type RotationKind,
    type RotationPoint,
  } from '@/lib/animations/avl-rotation';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();
  const kind = untrack<RotationKind>(() => {
    const value = typeof config.kind === 'string' ? config.kind : 'right';
    return (['left', 'right', 'lr', 'rl'] as const).includes(value as RotationKind)
      ? (value as RotationKind)
      : 'right';
  });
  const trace = createRotationTrace(kind);
  const player = createPlayback(() => trace.steps.length);
  const step = $derived(trace.steps[player.index]);

  const RADIUS = 24;
  /** 旋转过渡时长，短于一步的播放间隔，动画不会互相追赶。 */
  const MORPH_MS = 560;

  const isDouble = kind === 'lr' || kind === 'rl';
  const cLabel = isDouble ? 'C' : 'β';
  const legend = isDouble
    ? [
        ['a', 'A 失衡结点'],
        ['b', 'B 第一次旋转的中心'],
        ['c', 'C 折角点，最后上位'],
      ]
    : [
        ['a', 'A 失衡结点'],
        ['b', 'B 上位结点'],
        ['c', 'β 要换边的子树'],
      ];

  let displayed = $state<Record<string, RotationPoint>>({ ...trace.steps[0].layout.positions });
  let fromEdges = $state(trace.steps[0].layout.edges);
  let toEdges = $state(trace.steps[0].layout.edges);
  let morph = $state(1);
  let frame = 0;

  /*
   * 切换步骤时，从当前画面补间到目标布局：结点位置线性插值，
   * 边按“旧边淡出，新边淡入”交叉过渡，这样 B 上位，A 下沉和换边是同一次运动。
   * 双旋有两段这样的过渡，中间夹一个静态的中间状态。
   * displayed 只在这里写入，effect 内部用 untrack 读它，避免每帧重跑。
   */
  $effect(() => {
    const target = step.layout;
    const from = untrack(() => ({ ...displayed }));
    const startEdges = untrack(() => toEdges);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cancelAnimationFrame(frame);
    fromEdges = startEdges;
    toEdges = target.edges;

    if (reduce) {
      displayed = { ...target.positions };
      morph = 1;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next: Record<string, RotationPoint> = {};
      for (const id of trace.nodeIds) {
        const fromPoint = from[id] ?? target.positions[id];
        const toPoint = target.positions[id];
        next[id] = {
          x: fromPoint.x + (toPoint.x - fromPoint.x) * eased,
          y: fromPoint.y + (toPoint.y - fromPoint.y) * eased,
        };
      }
      displayed = next;
      morph = eased;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  function lineFor([from, to]: readonly [string, string]) {
    const start = displayed[from];
    const end = displayed[to];
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  }

  function roleOf(id: string) {
    if (step.highlight.a && id === trace.roles.a) return 'a';
    if (step.highlight.b && id === trace.roles.b) return 'b';
    if (step.highlight.c && id === trace.roles.c) return 'c';
    if (step.highlight.done && id === trace.finalRoot) return 'done';
    return '';
  }
</script>

<AnimationShell title={trace.title} meta={`${trace.steps.length} 步 · ${isDouble ? '两次单旋' : '单次旋转'}`}>
  <div class="board">
    <div class="tree-panel">
      <svg
        viewBox="0 0 560 360"
        role="img"
        aria-label={`${trace.title}。第 ${player.index + 1} 步：${step.description}`}
      >
        <g class="edges">
          <g style={`opacity: ${(1 - morph).toFixed(3)}`}>
            {#each fromEdges as edge}
              <line {...lineFor(edge)} class="edge" />
            {/each}
          </g>
          <g style={`opacity: ${morph.toFixed(3)}`}>
            {#each toEdges as edge}
              <line {...lineFor(edge)} class="edge" />
            {/each}
          </g>
        </g>

        <g class="nodes">
          {#each trace.nodeIds as id}
            {@const point = displayed[id]}
            {@const role = roleOf(id)}
            <g class="node" data-role={role || undefined} transform={`translate(${point.x} ${point.y})`}>
              <circle class="body" r={RADIUS} />
              <text class="label" dy="0.35em">{id}</text>
              {#if role === 'a'}<text class="tag tag-a" y="-34">A</text>{/if}
              {#if role === 'b'}<text class="tag tag-b" y="-34">B</text>{/if}
              {#if role === 'c'}<text class="tag tag-c" y="-34">{cLabel}</text>{/if}
              {#if role === 'done'}<text class="tag tag-done" y="-34">新的根</text>{/if}
            </g>
          {/each}
        </g>
      </svg>

      <div class="legend">
        {#each legend as [role, text]}
          <span><i class="dot dot-{role}"></i>{text}</span>
        {/each}
      </div>
    </div>

    <aside class="side">
      <div class="chips">
        <span class="chip is-a"><em>A</em><b>{trace.roles.a}</b></span>
        <span class="chip is-b"><em>B</em><b>{trace.roles.b}</b></span>
        <span class="chip is-c"><em>{cLabel}</em><b>{trace.roles.c}</b></span>
      </div>

      <div class="balance">
        <span>{trace.roles.a} 的平衡因子</span>
        <b data-ok={step.highlight.done}>{step.balance}</b>
      </div>

      <ol class="ops" aria-label="指针操作">
        {#each trace.pseudocode as line, index}
          <li class:active={step.operators.includes(index)}>
            <span class="op-index">{index + 1}</span>
            <code>{line}</code>
          </li>
        {/each}
      </ol>

      <p class="hint">{trace.hint}</p>
    </aside>
  </div>

  <StepExplanation phase={step.phase} description={step.description} tone={step.highlight.done ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .board {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 14rem;
    align-items: start;
    gap: 1.25rem;
  }
  .tree-panel { min-width: 0; overflow-x: auto; padding-bottom: 0.4rem; }
  svg { display: block; width: 100%; min-width: 22rem; height: auto; overflow: visible; }

  .edge { stroke: var(--anim-edge); stroke-width: 2; stroke-linecap: round; }

  .node .body {
    fill: var(--anim-node-bg);
    stroke: var(--anim-line-strong);
    stroke-width: 1.8;
    transition: fill 200ms ease, stroke 200ms ease, stroke-width 200ms ease;
  }
  .node .label {
    fill: var(--fg);
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
  }
  .node[data-role='a'] .body {
    fill: color-mix(in oklab, var(--danger) 14%, var(--anim-node-bg));
    stroke: var(--danger);
    stroke-width: 2.2;
  }
  .node[data-role='a'] .label { fill: var(--danger); }
  .node[data-role='b'] .body {
    fill: var(--accent-soft);
    stroke: var(--accent);
    stroke-width: 2.2;
  }
  .node[data-role='b'] .label { fill: var(--accent-strong); }
  .node[data-role='c'] .body {
    fill: color-mix(in oklab, var(--warning) 14%, var(--anim-node-bg));
    stroke: var(--warning);
    stroke-width: 2.2;
  }
  .node[data-role='c'] .label { fill: var(--warning); }
  .node[data-role='done'] .body {
    fill: color-mix(in oklab, var(--success) 14%, var(--anim-node-bg));
    stroke: var(--success);
    stroke-width: 2.2;
  }
  .node[data-role='done'] .label { fill: var(--success); }

  .tag {
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 700;
    text-anchor: middle;
  }
  .tag-a { fill: var(--danger); }
  .tag-b { fill: var(--accent-strong); }
  .tag-c { fill: var(--warning); }
  .tag-done { fill: var(--success); }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.9rem;
    padding-top: 0.65rem;
    border-top: 1px solid var(--anim-line);
    color: var(--anim-muted);
    font-size: 0.68rem;
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .dot { width: 0.6rem; height: 0.6rem; border-radius: 999px; border: 1px solid currentcolor; }
  .dot-a { color: var(--danger); background: color-mix(in oklab, var(--danger) 20%, var(--surface)); }
  .dot-b { color: var(--accent); background: color-mix(in oklab, var(--accent) 20%, var(--surface)); }
  .dot-c { color: var(--warning); background: color-mix(in oklab, var(--warning) 20%, var(--surface)); }

  .side {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    min-width: 0;
    padding-left: 1.1rem;
    border-left: 1px solid var(--anim-line);
  }
  .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    padding: 0.22rem 0.5rem;
    border: 1px solid var(--anim-line);
    border-radius: 7px;
    background: var(--anim-panel);
    font-family: var(--font-mono);
    font-size: 0.7rem;
  }
  .chip em { font-style: normal; font-size: 0.62rem; font-weight: 700; }
  .chip b { font-weight: 650; }
  .chip.is-a em { color: var(--danger); }
  .chip.is-b em { color: var(--accent-strong); }
  .chip.is-c { border-style: dashed; }
  .chip.is-c em { color: var(--warning); }

  .balance {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0.55rem;
    border-radius: 7px;
    background: var(--anim-panel);
    color: var(--anim-muted);
    font-size: 0.7rem;
  }
  .balance b { color: var(--danger); font-family: var(--font-mono); font-size: 0.8rem; }
  .balance b[data-ok='true'] { color: var(--success); }

  .ops { display: flex; flex-direction: column; gap: 0.15rem; margin: 0; padding: 0; list-style: none; }
  .ops li {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0.28rem 0.45rem;
    border-left: 2px solid var(--anim-line);
    border-radius: 0 6px 6px 0;
    color: var(--anim-muted);
    font-size: 0.7rem;
    transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
  }
  .ops .op-index {
    width: 0.9rem;
    flex-shrink: 0;
    color: var(--fg-subtle);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-align: right;
  }
  .ops code { font-family: var(--font-mono); white-space: nowrap; }
  .ops li.active {
    border-left-color: var(--accent);
    background: color-mix(in oklab, var(--accent) 9%, transparent);
    color: var(--fg);
  }
  .ops li.active code { font-weight: 650; }

  .hint { margin: 0; color: var(--anim-muted); font-size: 0.65rem; line-height: 1.65; }

  @media (width < 52rem) {
    .board { grid-template-columns: 1fr; }
    .side {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 0.7rem 1rem;
      padding: 0.9rem 0 0;
      border-top: 1px solid var(--anim-line);
      border-left: 0;
    }
    .ops { grid-column: 1 / -1; }
    .hint { grid-column: 1 / -1; }
  }
  @media (width < 34rem) {
    .side { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    .node .body,
    .ops li { transition: none; }
  }
</style>
