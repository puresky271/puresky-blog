<script lang="ts">
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowClockwise } from '@/lib/icons.generated';
  import {
    createFenwickQueryTrace,
    createFenwickUpdateTrace,
    FENWICK_LIMITS,
    FENWICK_VALUES,
    type FenwickQueryTrace,
    type FenwickRange,
    type FenwickUpdateTrace,
  } from '@/lib/animations/fenwick';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationField from './AnimationField.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  interface OperationStep {
    phase: 'start' | 'apply' | 'done';
    index: number;
    lowbit: number;
    range: FenwickRange | null;
    nextIndex: number;
    values: number[];
    tree: number[];
    processedIndices: number[];
    sum: number | null;
    description: string;
  }

  type Edge = [number, number];

  const NODES = [
    { id: 0, x: 420, y: 48 },
    { id: 1, x: 111, y: 118 }, { id: 2, x: 163, y: 118 }, { id: 4, x: 267, y: 118 }, { id: 8, x: 475, y: 118 },
    { id: 3, x: 215, y: 190 }, { id: 5, x: 319, y: 190 }, { id: 6, x: 371, y: 190 },
    { id: 9, x: 527, y: 190 }, { id: 10, x: 579, y: 190 }, { id: 12, x: 683, y: 190 },
    { id: 7, x: 423, y: 262 }, { id: 11, x: 631, y: 262 }, { id: 13, x: 735, y: 262 }, { id: 14, x: 787, y: 262 },
  ];
  const EDGES: Edge[] = [
    [0, 1], [0, 2], [0, 4], [0, 8], [2, 3], [4, 5], [4, 6], [6, 7], [8, 9], [8, 10], [8, 12], [10, 11], [12, 13], [12, 14],
  ];
  const NODE_MAP = new Map(NODES.map((node) => [node.id, node]));

  let { config, operation }: AnimationProps & { operation: 'query' | 'update' } = $props();
  const instanceId = $props.id();
  const markerId = `fenwick-arrow-${instanceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const defaults = untrack(() => ({
    index: typeof config.index === 'number' ? config.index : operation === 'query' ? 13 : 3,
    delta: typeof config.delta === 'number' ? config.delta : 2,
  }));

  function createTrace(index: number, delta: number): FenwickQueryTrace | FenwickUpdateTrace {
    return operation === 'query' ? createFenwickQueryTrace(index) : createFenwickUpdateTrace(index, delta);
  }

  let draftIndex = $state(String(defaults.index));
  let draftDelta = $state(String(defaults.delta));
  let trace = $state<FenwickQueryTrace | FenwickUpdateTrace>(createTrace(defaults.index, defaults.delta));
  let error = $state('');
  const steps = $derived.by<OperationStep[]>(() => {
    if ('target' in trace) {
      const queryTrace = trace;
      return queryTrace.steps.map((step) => ({
        phase: step.phase === 'accumulate' ? 'apply' : step.phase,
        index: step.index,
        lowbit: step.lowbit,
        range: step.range,
        nextIndex: step.nextIndex,
        values: [...FENWICK_VALUES],
        tree: queryTrace.tree,
        processedIndices: step.coveredRanges.map((range) => range.end),
        sum: step.sum,
        description: step.description,
      }));
    }
    return trace.steps.map((step) => ({
      phase: step.phase === 'update' ? 'apply' : step.phase,
      index: step.index,
      lowbit: step.lowbit,
      range: step.range,
      nextIndex: step.nextIndex,
      values: step.values,
      tree: step.tree,
      processedIndices: step.updatedIndices,
      sum: null,
      description: step.description,
    }));
  });
  const player = createPlayback(() => steps.length);
  const step = $derived<OperationStep>(steps[player.index]);
  const isQuery = $derived('target' in trace);
  const activeIndex = $derived('target' in trace ? trace.target : trace.index);
  const title = $derived(isQuery ? '树状数组 · 查询前缀和' : '树状数组 · 单点更新');
  const phase = $derived({ start: '确定起点', apply: isQuery ? '拼接区间' : '同步区间', done: isQuery ? '查询完成' : '更新完成' }[step.phase]);
  const activeEdge = $derived.by<Edge | null>(() => {
    if (step.phase !== 'apply' || !NODE_MAP.has(step.nextIndex)) return null;
    return [step.index, step.nextIndex];
  });
  const visitedEdges = $derived.by(() => {
    const result = new Set<string>();
    const path = [...step.processedIndices];
    if (step.phase === 'done' && isQuery) path.push(0);
    for (let index = 0; index < path.length - 1; index++) {
      result.add(edgeKey(path[index], path[index + 1]));
    }
    return result;
  });

  function edgeKey(from: number, to: number) {
    return [from, to].sort((a, b) => a - b).join('-');
  }

  function edgeState(from: number, to: number) {
    if (activeEdge && edgeKey(from, to) === edgeKey(...activeEdge)) return 'current';
    return visitedEdges.has(edgeKey(from, to)) ? 'processed' : 'idle';
  }

  function arrowLine(edge: Edge) {
    const [fromId, toId] = edge;
    const from = NODE_MAP.get(fromId)!;
    const to = NODE_MAP.get(toId)!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const offset = 27;
    return {
      x1: from.x + ((to.x - from.x) / length) * offset,
      y1: from.y + ((to.y - from.y) / length) * offset,
      x2: to.x - ((to.x - from.x) / length) * offset,
      y2: to.y - ((to.y - from.y) / length) * offset,
    };
  }

  function nodeState(index: number) {
    if ((step.phase === 'start' && index === activeIndex) || (step.phase === 'apply' && index === step.index) || (step.phase === 'done' && isQuery && index === 0)) return 'current';
    if (step.processedIndices.includes(index)) return 'processed';
    return 'idle';
  }

  function apply() {
    player.reset();
    try {
      trace = createTrace(Number(draftIndex), Number(draftDelta));
      player.reset();
      error = '';
    } catch (cause) {
      error = (cause as Error).message;
    }
  }
</script>

<AnimationShell {title} meta="14 个元素 · O(log n)">
  {#snippet configuration()}
    <form class="inputs" class:update={!isQuery} onsubmit={(event) => { event.preventDefault(); apply(); }}>
      <AnimationField
        bind:value={draftIndex}
        label={isQuery ? '查询前缀 [1, index]' : '原数组下标 index'}
        hint={`${FENWICK_LIMITS.minIndex} 到 ${FENWICK_LIMITS.maxIndex}`}
        maxlength={2}
        invalid={Boolean(error)}
      />
      {#if !isQuery}
        <AnimationField
          bind:value={draftDelta}
          label="增量 delta"
          hint="非零，-9 到 9"
          maxlength={2}
          invalid={Boolean(error)}
        />
      {/if}
      <button class="apply" type="submit"><Icon icon={iArrowClockwise} size={14} />重新演示</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/snippet}

  <div class="summary">
    <div><small>{isQuery ? '累计和 sum' : '原数组变化'}</small><b>{isQuery ? step.sum : `a[${activeIndex}] = ${step.values[activeIndex - 1]}`}</b></div>
    <div><small>当前管辖区间</small><b>{step.range ? `[${step.range.start}, ${step.range.end}]` : step.phase === 'done' ? '全部完成' : '等待操作'}</b></div>
    <div><small>{step.phase === 'done' ? '结束下标' : '下一下标'}</small><b>{step.nextIndex}{#if step.phase === 'apply'}<span> = {step.index} {isQuery ? '-' : '+'} {step.lowbit}</span>{/if}</b></div>
  </div>

  <div class="tree-scroll">
    <svg viewBox="0 0 900 332" class="tree" role="img" aria-label={`树状数组隐式树。${step.description}`}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      <g class="edges">
        {#each EDGES as [from, to] (`${from}-${to}`)}
          {@const start = NODE_MAP.get(from)!}
          {@const end = NODE_MAP.get(to)!}
          {@const state = edgeState(from, to)}
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} class="edge" />
          {#if state !== 'idle'}
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} class="path-edge" class:playing={player.playing && state === 'current'} data-state={state} />
          {/if}
        {/each}
        {#if activeEdge}
          <line {...arrowLine(activeEdge)} class="active-arrow" marker-end={`url(#${markerId})`} />
        {/if}
      </g>
      <g class="nodes">
        {#each NODES as node (node.id)}
          {@const state = nodeState(node.id)}
          <g class="node" data-state={state} transform={`translate(${node.x} ${node.y})`}>
            {#if state === 'current'}<circle class="halo" class:playing={player.playing} r="28" />{/if}
            <circle class="body" r="21" />
            <text class="index" y="1" dominant-baseline="central">{node.id}</text>
            <text class="value" y="36">{node.id === 0 ? '根节点' : `tree = ${step.tree[node.id]}`}</text>
            {#if state !== 'idle'}
              <text class="status" y="51">{state === 'current' ? '当前' : isQuery ? '已取' : '已改'}</text>
            {/if}
          </g>
        {/each}
      </g>
    </svg>
  </div>

  <div class="legend">
    <span><i class="current"></i>当前节点与下一条边</span>
    <span><i class="processed"></i>{isQuery ? '已累加路径' : '已更新路径'}</span>
    <span>圆内是下标，下方是 tree 值</span>
  </div>

  <StepExplanation {phase} description={step.description} tone={step.phase === 'done' ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .inputs { display: grid; grid-template-columns: minmax(0, 16rem) auto; align-items: end; justify-content: start; gap: 0.75rem; }
  .inputs.update { grid-template-columns: minmax(0, 10rem) minmax(0, 10rem) auto; }
  .apply { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; height: 2.5rem; padding-inline: 0.85rem; border-radius: 8px; background: var(--accent-soft); color: var(--accent-strong); font-size: 0.75rem; font-weight: 600; white-space: nowrap; transition: background-color 160ms ease, transform 160ms var(--ease-out-expo); }
  .apply:hover { background: color-mix(in oklab, var(--accent) 18%, var(--surface)); }
  .apply:active { transform: translateY(1px); }
  .error { margin: 0.65rem 0 0; color: var(--danger); font-size: 0.75rem; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.65rem; margin-bottom: 0.75rem; }
  .summary > div { min-width: 0; padding: 0.65rem 0.75rem; border: 1px solid var(--anim-line); border-radius: 8px; background: var(--anim-inset); }
  .summary small { display: block; color: var(--anim-muted); font-size: 0.62rem; }
  .summary b { display: block; overflow: hidden; margin-top: 0.15rem; font-family: var(--font-mono); font-size: 0.82rem; text-overflow: ellipsis; white-space: nowrap; }
  .summary b span { color: var(--anim-muted); font-size: 0.65rem; font-weight: 400; }
  .tree-scroll { overflow-x: auto; padding: 0.1rem 0.1rem 0.5rem; }
  .tree { display: block; width: 100%; min-width: 42rem; height: auto; color: var(--fg); overflow: visible; }
  marker path { fill: var(--accent-strong); }
  .edge { stroke: var(--anim-edge); stroke-width: 1.7; }
  .path-edge { stroke: var(--success); stroke-width: 3.4; stroke-linecap: round; transition: stroke 180ms ease; }
  .path-edge[data-state='current'] { stroke: var(--accent); stroke-dasharray: 8 5; }
  .path-edge.playing { animation: dash-flow 700ms linear infinite; }
  .active-arrow { stroke: var(--accent-strong); stroke-width: 2; stroke-linecap: round; }
  .node .halo { fill: color-mix(in oklab, var(--accent) 14%, transparent); stroke: var(--accent); stroke-width: 1.5; opacity: 0.75; }
  .node .halo.playing { animation: halo-pulse 900ms ease-in-out infinite; }
  .node .body { fill: var(--anim-node-bg); stroke: var(--anim-line-strong); stroke-width: 1.7; transition: fill 180ms ease, stroke 180ms ease; }
  .node[data-state='processed'] .body { fill: color-mix(in oklab, var(--success) 17%, var(--anim-node-bg)); stroke: var(--success); }
  .node[data-state='current'] .body { fill: var(--accent); stroke: var(--accent-strong); stroke-width: 2.4; }
  .index { fill: var(--fg); font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-anchor: middle; }
  .node[data-state='processed'] .index { fill: var(--success); }
  .node[data-state='current'] .index { fill: var(--accent-fg); }
  .value { fill: var(--fg-muted); font-family: var(--font-mono); font-size: 9.5px; text-anchor: middle; }
  .status { fill: var(--accent-strong); font-size: 9px; font-weight: 700; text-anchor: middle; }
  .node[data-state='processed'] .status { fill: var(--success); }
  .legend { display: flex; flex-wrap: wrap; gap: 0.55rem 1rem; padding-top: 0.65rem; border-top: 1px solid var(--anim-line); color: var(--anim-muted); font-size: 0.65rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .legend span:last-child { margin-left: auto; }
  .legend i { width: 0.6rem; height: 0.6rem; border-radius: 999px; }
  .legend i.current { background: var(--accent); }
  .legend i.processed { background: var(--success); }
  @keyframes dash-flow { to { stroke-dashoffset: -26; } }
  @keyframes halo-pulse { 50% { opacity: 0.3; transform: scale(1.12); } }
  @media (width < 46rem) {
    .inputs, .inputs.update { grid-template-columns: 1fr 1fr; }
    .inputs .apply { grid-column: 1 / -1; }
    .inputs:not(.update) { grid-template-columns: 1fr; }
    .legend span:last-child { margin-left: 0; }
  }
  @media (width < 34rem) {
    .summary { grid-template-columns: 1fr; }
    .tree { min-width: 38rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .apply, .path-edge, .node .body { transition: none; }
    .path-edge.playing, .node .halo.playing { animation: none; }
  }
</style>
