<script lang="ts">
  let {
    ids,
    focus,
    activeEdge,
    visitOrder = [],
    members = new Set<string>(),
    fresh = null,
    focusLabel = '当前',
    ariaLabel,
  }: {
    ids: string[];
    focus: string | null;
    activeEdge: [string, string] | null;
    visitOrder?: string[];
    members?: Set<string>;
    fresh?: string | null;
    focusLabel?: string;
    ariaLabel: string;
  } = $props();

  const positions: Record<string, { x: number; y: number }> = {
    a: { x: 280, y: 48 },
    b: { x: 155, y: 140 },
    c: { x: 405, y: 140 },
    d: { x: 75, y: 238 },
    e: { x: 235, y: 238 },
    f: { x: 325, y: 238 },
    g: { x: 485, y: 238 },
  };
  const edges: Array<[string, string]> = [
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'd'],
    ['b', 'e'],
    ['c', 'f'],
    ['c', 'g'],
  ];

  const instanceId = $props.id();
  const markerId = `tree-arrow-${instanceId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const visible = $derived(new Set(ids));
  const visibleEdges = $derived(edges.filter(([from, to]) => visible.has(from) && visible.has(to)));
  const activeLine = $derived.by(() => {
    if (!activeEdge || !visible.has(activeEdge[0]) || !visible.has(activeEdge[1])) return null;
    const from = positions[activeEdge[0]];
    const to = positions[activeEdge[1]];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const offset = 29;
    return {
      x1: from.x + ((to.x - from.x) / length) * offset,
      y1: from.y + ((to.y - from.y) / length) * offset,
      x2: to.x - ((to.x - from.x) / length) * offset,
      y2: to.y - ((to.y - from.y) / length) * offset,
    };
  });

  function badgeOffset(id: string) {
    return id === 'b' || id === 'd' || id === 'f'
      ? { x: -30, y: -30 }
      : { x: 30, y: -30 };
  }
</script>

<svg viewBox="0 0 560 304" class="tree" role="img" aria-label={ariaLabel}>
  <defs>
    <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  </defs>
  <g class="edges">
    {#each visibleEdges as [from, to]}
      {@const start = positions[from]}
      {@const end = positions[to]}
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} class="edge" />
    {/each}
    {#if activeLine}
      <line {...activeLine} class="active-edge" marker-end={`url(#${markerId})`} />
    {/if}
  </g>
  <g class="nodes">
    {#each ids as id}
      {@const point = positions[id]}
      {@const order = visitOrder.indexOf(id)}
      {@const badge = badgeOffset(id)}
      <g
        class="node"
        class:visited={order >= 0}
        class:member={members.has(id) && focus !== id}
        class:focus={focus === id}
        class:fresh={fresh === id}
        transform={`translate(${point.x} ${point.y})`}
      >
        <circle class="halo" r="32" />
        <circle class="membership-ring" r="28" />
        <circle class="body" r="24" />
        <text class="label" y="0" dy="0.35em">{id}</text>
        {#if order >= 0}
          <g class="badge" transform={`translate(${badge.x} ${badge.y})`}>
            <circle r="9" />
            <text x="0" y="0" dy="0.35em">{order + 1}</text>
          </g>
        {/if}
        {#if focus === id}<text class="focus-label" y="43">{focusLabel}</text>{/if}
      </g>
    {/each}
  </g>
</svg>

<style>
  .tree { display: block; width: 100%; min-width: 25rem; height: auto; color: var(--fg); overflow: visible; }
  marker path { fill: var(--accent); }
  .edge { stroke: var(--anim-edge); stroke-width: 2; }
  .active-edge { stroke: var(--accent); stroke-width: 3; stroke-linecap: round; animation: edge-in 240ms ease-out; }
  .node .halo { fill: color-mix(in oklab, var(--accent) 15%, transparent); stroke: none; opacity: 0; transition: opacity 180ms ease; }
  .node .membership-ring { fill: none; stroke: var(--accent-strong); stroke-width: 1.8; stroke-dasharray: 4 3; opacity: 0; transition: opacity 180ms ease; }
  .node .body {
    fill: var(--anim-node-bg);
    stroke: var(--anim-line-strong);
    stroke-width: 1.8;
    transition: fill 180ms ease, stroke 180ms ease;
  }
  .node .label { fill: currentColor; font-family: var(--font-mono); font-size: 15px; font-weight: 700; text-anchor: middle; }
  .node.visited .body { fill: color-mix(in oklab, var(--accent) 18%, var(--anim-node-bg)); stroke: var(--accent); }
  .node.visited .label { fill: var(--accent-strong); }
  .node.member .membership-ring { opacity: 1; }
  .node.focus .halo { opacity: 1; }
  .node.focus .body { fill: var(--accent); stroke: var(--accent-strong); stroke-width: 2.4; }
  .node.focus .label { fill: var(--accent-fg); }
  .focus-label { fill: var(--accent-strong); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-anchor: middle; }
  .node.fresh .body { animation: visit-pop 320ms var(--ease-out-expo); }
  .badge circle { fill: var(--accent); stroke: var(--surface); stroke-width: 1.5; }
  .badge text { fill: var(--accent-fg); font-family: var(--font-mono); font-size: 9px; font-weight: 700; text-anchor: middle; }
  @keyframes edge-in { from { opacity: 0.35; } to { opacity: 1; } }
  @keyframes visit-pop { 50% { stroke-width: 4; } }
  @media (width < 34rem) { .tree { min-width: 22rem; } }
  @media (prefers-reduced-motion: reduce) {
    .active-edge, .node.fresh .body { animation: none; }
    .node .halo, .node .membership-ring, .node .body { transition: none; }
  }
</style>
