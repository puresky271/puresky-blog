<script lang="ts">
  interface DiagramNode {
    id: string;
    label: string;
    x: number;
    y: number;
  }
  type DiagramEdge = [string, string];

  const DEFAULT_NODES: DiagramNode[] = [
    { id: 'a', label: 'a', x: 280, y: 48 },
    { id: 'b', label: 'b', x: 155, y: 140 },
    { id: 'c', label: 'c', x: 405, y: 140 },
    { id: 'd', label: 'd', x: 75, y: 238 },
    { id: 'e', label: 'e', x: 235, y: 238 },
    { id: 'f', label: 'f', x: 325, y: 238 },
    { id: 'g', label: 'g', x: 485, y: 238 },
  ];
  const DEFAULT_EDGES: DiagramEdge[] = [
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'd'],
    ['b', 'e'],
    ['c', 'f'],
    ['c', 'g'],
  ];

  let {
    ids,
    focus,
    activeEdge = null,
    activeEdges = [],
    pathEdges = [],
    spentEdges = [],
    nodes = DEFAULT_NODES,
    edges = DEFAULT_EDGES,
    visitOrder = [],
    members = new Set<string>(),
    fresh = null,
    leaving = null,
    focusLabel = '当前',
    showVisitBadges = true,
    viewBoxWidth = 560,
    viewBoxHeight = 304,
    ariaLabel,
  }: {
    ids: string[];
    focus: string | null;
    activeEdge?: DiagramEdge | null;
    activeEdges?: DiagramEdge[];
    /** 当前路径上的边，画成主色实线，用来看清“这条路走到了哪”。 */
    pathEdges?: DiagramEdge[];
    /** 走过之后又退回来的边，画成虚线，和还在路径上的边区分开。 */
    spentEdges?: DiagramEdge[];
    nodes?: DiagramNode[];
    edges?: DiagramEdge[];
    visitOrder?: string[];
    members?: Set<string>;
    fresh?: string | null;
    /** 回溯时正在告别的结点，用警告色圈一下，不画箭头也能看出从哪退。 */
    leaving?: string | null;
    /** 传 null 就不在焦点结点下面写标签，图更安静。 */
    focusLabel?: string | null;
    showVisitBadges?: boolean;
    viewBoxWidth?: number;
    viewBoxHeight?: number;
    ariaLabel: string;
  } = $props();

  const instanceId = $props.id();
  const markerId = `tree-arrow-${instanceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const nodeMap = $derived(new Map(nodes.map((node) => [node.id, node])));
  const visible = $derived(new Set(ids));
  const visibleEdges = $derived(edges.filter(([from, to]) => visible.has(from) && visible.has(to)));
  const highlightedEdges = $derived(activeEdge ? [activeEdge] : activeEdges);

  /** 两个结点之间的连线，两端按结点半径留出空隙。 */
  function lineBetween(fromId: string, toId: string) {
    const from = nodeMap.get(fromId)!;
    const to = nodeMap.get(toId)!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const offset = 29;
    return {
      x1: from.x + ((to.x - from.x) / length) * offset,
      y1: from.y + ((to.y - from.y) / length) * offset,
      x2: to.x - ((to.x - from.x) / length) * offset,
      y2: to.y - ((to.y - from.y) / length) * offset,
    };
  }

  function linesOf(pairs: DiagramEdge[]) {
    return pairs
      .filter(([fromId, toId]) => visible.has(fromId) && visible.has(toId))
      .map(([fromId, toId]) => {
        const line = lineBetween(fromId, toId);
        return { key: `${fromId}>${toId}`, ...line };
      });
  }

  const activeLines = $derived(linesOf(highlightedEdges));
  const pathLines = $derived(linesOf(pathEdges));
  const spentLines = $derived(linesOf(spentEdges));

  function badgeOffset(id: string) {
    return id === 'b' || id === 'd' || id === 'f'
      ? { x: -30, y: -30 }
      : { x: 30, y: -30 };
  }
</script>

<svg
  viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
  class="tree"
  role="img"
  aria-label={ariaLabel}
>
  <defs>
    <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  </defs>
  <g class="edges">
    {#each visibleEdges as [from, to]}
      {@const start = nodeMap.get(from)!}
      {@const end = nodeMap.get(to)!}
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} class="edge" />
    {/each}
    {#each spentLines as line (line.key)}
      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} class="spent-edge" />
    {/each}
    {#each pathLines as line (line.key)}
      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} class="path-edge" />
    {/each}
    {#each activeLines as line (line.key)}
      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} class="active-edge" marker-end={`url(#${markerId})`} />
    {/each}
  </g>
  <g class="nodes">
    {#each ids as id}
      {@const point = nodeMap.get(id)!}
      {@const order = visitOrder.indexOf(id)}
      {@const badge = badgeOffset(id)}
      <g
        class="node"
        class:visited={order >= 0}
        class:member={members.has(id) && focus !== id}
        class:focus={focus === id}
        class:leaving={leaving === id && focus !== id}
        class:fresh={fresh === id}
        transform={`translate(${point.x} ${point.y})`}
      >
        <circle class="halo" r="32" />
        <circle class="membership-ring" r="28" />
        <circle class="body" r="24" />
        <text class="label" y="0" dy="0.35em">{point.label}</text>
        {#if showVisitBadges && order >= 0}
          <g class="badge" transform={`translate(${badge.x} ${badge.y})`}>
            <circle r="9" />
            <text x="0" y="0" dy="0.35em">{order + 1}</text>
          </g>
        {/if}
        {#if focus === id && focusLabel}<text class="focus-label" y="43">{focusLabel}</text>{/if}
      </g>
    {/each}
  </g>
</svg>

<style>
  .tree { display: block; width: 100%; min-width: 25rem; height: auto; color: var(--fg); overflow: visible; }
  marker path { fill: var(--accent); }
  .edge { stroke: var(--anim-edge); stroke-width: 1.8; }
  .spent-edge {
    stroke: var(--warning);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-dasharray: 5 4;
    opacity: 1;
    animation: spent-in 620ms ease-out;
  }
  .path-edge { stroke: var(--accent); stroke-width: 3.4; stroke-linecap: round; animation: edge-in 280ms ease-out; }
  .active-edge { stroke: var(--accent); stroke-width: 3; stroke-linecap: round; animation: edge-in 240ms ease-out; }
  .node .halo { fill: color-mix(in oklab, var(--accent) 15%, transparent); stroke: none; opacity: 0; transition: opacity 180ms ease; }
  .node .membership-ring { fill: none; stroke: var(--accent-strong); stroke-width: 2; stroke-dasharray: 4 3; opacity: 0; transition: opacity 180ms ease; }
  .node .body {
    fill: var(--anim-node-bg);
    stroke: var(--anim-line-strong);
    stroke-width: 1.8;
    transition: fill 220ms ease, stroke 220ms ease, stroke-width 220ms ease;
  }
  .node .label { fill: currentColor; font-family: var(--font-mono); font-size: 16px; font-weight: 700; text-anchor: middle; }
  .node.visited .body { fill: color-mix(in oklab, var(--accent) 16%, var(--anim-node-bg)); stroke: var(--accent); }
  .node.visited .label { fill: var(--accent-strong); }
  .node.member .membership-ring { opacity: 1; }
  .node.focus .halo { opacity: 1; }
  .node.focus .body {
    fill: var(--accent);
    stroke: var(--accent-strong);
    stroke-width: 2.4;
    filter: drop-shadow(0 0 6px color-mix(in oklab, var(--accent) 42%, transparent));
  }
  .node.focus .label { fill: var(--accent-fg); }
  .focus-label { fill: var(--accent-strong); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-anchor: middle; }
  .node.leaving .body { fill: color-mix(in oklab, var(--warning) 16%, var(--anim-node-bg)); stroke: var(--warning); }
  .node.leaving .label { fill: var(--warning); }
  .node.fresh .body { animation: visit-pop 320ms var(--ease-out-expo); }
  .badge circle { fill: var(--accent); stroke: var(--surface); stroke-width: 1.5; }
  .badge text { fill: var(--accent-fg); font-family: var(--font-mono); font-size: 9px; font-weight: 700; text-anchor: middle; }
  @keyframes edge-in { from { opacity: 0.35; } to { opacity: 1; } }
  /* 边离开当前路径时从主色渐变成警告色，让“退回”这一步在图上看得出来。 */
  @keyframes spent-in {
    0% { stroke: var(--accent); opacity: 0; }
    30% { opacity: 1; }
    100% { stroke: var(--warning); opacity: 1; }
  }
  @keyframes visit-pop { 50% { stroke-width: 4; } }
  @media (width < 34rem) { .tree { min-width: 22rem; } }
  @media (prefers-reduced-motion: reduce) {
    .active-edge, .path-edge, .spent-edge, .node.fresh .body { animation: none; }
    .node .halo, .node .membership-ring, .node .body { transition: none; }
  }
</style>
