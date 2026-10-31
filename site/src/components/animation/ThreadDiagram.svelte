<script lang="ts">
  import {
    HEAD_ID,
    THREAD_CANVAS,
    THREAD_NODES,
    THREAD_VIEWBOX_HEADLESS,
    THREAD_VIEWBOX_WITH_HEAD,
    TREE_EDGES,
    type ThreadEdge,
    type ThreadNodePos,
    type ThreadTagState,
  } from '@/lib/animations/thread-build';
  import type { ThreadTrail } from '@/lib/animations/thread-traverse';

  /**
   * 线索树的共享画法：线索化动画和遍历动画都用这一份。
   *
   * reveal 打开时虚线用遮罩从左往右长出来（线索化），关掉时直接画好（遍历）。
   * trail 是遍历时刚走过的那条线，用实心高亮盖在原线上，画一遍表示这次跳转。
   */
  let {
    hasHead,
    threads,
    tags,
    focus = null,
    visited = [],
    pre = null,
    fresh = null,
    reveal = false,
    trail = null,
    ariaLabel,
  }: {
    hasHead: boolean;
    threads: ThreadEdge[];
    tags: Record<string, ThreadTagState>;
    focus?: string | null;
    visited?: string[];
    pre?: string | null;
    fresh?: string | null;
    reveal?: boolean;
    trail?: ThreadTrail | null;
    ariaLabel: string;
  } = $props();

  const RADIUS = 25;
  const instanceId = $props.id();
  const uid = instanceId.replace(/[^a-zA-Z0-9_-]/g, '');
  const markerId = `thread-arrow-${uid}`;

  const pointMap = new Map<string, ThreadNodePos>(THREAD_NODES.map((node) => [node.id, node]));
  const visibleNodes = $derived(hasHead ? THREAD_NODES : THREAD_NODES.filter((node) => node.id !== HEAD_ID));
  const viewBox = $derived(hasHead ? THREAD_VIEWBOX_WITH_HEAD : THREAD_VIEWBOX_HEADLESS);
  const headPoint = pointMap.get(HEAD_ID)!;
  const rootPoint = pointMap.get('A')!;

  function normalize(x: number, y: number): { x: number; y: number } {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  /** 原树里存在孩子边的结点对。这些结点之间的线索要和实线错开，不能压在边上。 */
  const TREE_EDGE_PAIRS = new Set(
    TREE_EDGES.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)),
  );

  interface ThreadGeometry {
    path: string;
  }

  /**
   * 虚线从圆外出发、到圆外结束。互指的两条线索（比如 B 的后继是 E，E 的前驱是 B），
   * 以及和原树孩子边共线的那条线索，都往垂直方向让一点，画成一小片透镜或弧线，
   * 否则两条线会完全叠在一起，看起来像一条双头箭头或者压在原树边上。
   */
  function threadGeometry(edge: ThreadEdge, all: ThreadEdge[]): ThreadGeometry {
    const from = pointMap.get(edge.from);
    const to = pointMap.get(edge.to);
    if (!from || !to) return { path: '' };

    const mid = { cx: (from.x + to.x) / 2, cy: (from.y + to.y) / 2 };
    const dir = normalize(to.x - from.x, to.y - from.y);
    const pairKey = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`;
    const reciprocal = all.some((other) => other.from === edge.to && other.to === edge.from);
    const alongChildEdge = TREE_EDGE_PAIRS.has(pairKey);
    // 法线统一取 +1。互指的两条线索方向相反，法线自然也相反，正好分在两侧；
    // 如果再用 from < to 去翻一次符号，两条线又会叠回同一边。
    const control =
      edge.curve ??
      (reciprocal || alongChildEdge
        ? { cx: mid.cx - dir.y * 16, cy: mid.cy + dir.x * 16 }
        : mid);

    const startDir = normalize(control.cx - from.x, control.cy - from.y);
    const endDir = normalize(to.x - control.cx, to.y - control.cy);

    const startX = from.x + startDir.x * (RADIUS + 2);
    const startY = from.y + startDir.y * (RADIUS + 2);
    const endX = to.x - endDir.x * (RADIUS + 2);
    const endY = to.y - endDir.y * (RADIUS + 2);

    return {
      path: `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${control.cx.toFixed(1)} ${control.cy.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
    };
  }

  function childEdge(a: ThreadNodePos, b: ThreadNodePos) {
    const dir = normalize(b.x - a.x, b.y - a.y);
    return {
      x1: (a.x + dir.x * RADIUS).toFixed(1),
      y1: (a.y + dir.y * RADIUS).toFixed(1),
      x2: (b.x - dir.x * RADIUS).toFixed(1),
      y2: (b.y - dir.y * RADIUS).toFixed(1),
    };
  }

  const trailPath = $derived.by(() => {
    if (!trail) return '';
    const from = pointMap.get(trail.from);
    const to = pointMap.get(trail.to);
    if (!from || !to) return '';
    if (trail.kind === 'thread') {
      const edge =
        threads.find((item) => item.from === trail.from && item.to === trail.to) ??
        ({ id: `${trail.from}-${trail.to}`, from: trail.from, to: trail.to } as ThreadEdge);
      return threadGeometry(edge, threads).path;
    }
    const line = childEdge(from, to);
    return `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`;
  });

  const trailKey = $derived(trail ? `${trail.from}-${trail.to}-${trail.kind}` : '');
</script>

<svg viewBox={viewBox} class="tree" role="img" aria-label={ariaLabel}>
  <defs>
    <marker
      id={markerId}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
    {#if reveal}
      {#each threads as edge (edge.id)}
        {@const geometry = threadGeometry(edge, threads)}
        <mask
          id={`${uid}-${edge.id}`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={THREAD_CANVAS.width}
          height={THREAD_CANVAS.height}
        >
          <path
            d={geometry.path}
            class="thread-reveal"
            pathLength="100"
            stroke-dasharray="100"
            stroke-dashoffset="100"
          />
        </mask>
      {/each}
    {/if}
  </defs>

  <g class="child-edges">
    {#if hasHead}
      <line {...childEdge(headPoint, rootPoint)} class="child-edge" />
    {/if}
    {#each TREE_EDGES as [from, to] (from + to)}
      {@const start = pointMap.get(from)!}
      {@const end = pointMap.get(to)!}
      <line {...childEdge(start, end)} class="child-edge" />
    {/each}
  </g>

  <g class="thread-edges">
    {#each threads as edge (edge.id)}
      {@const geometry = threadGeometry(edge, threads)}
      {#if reveal}
        <path
          d={geometry.path}
          class="thread"
          class:fresh={fresh === edge.id}
          mask={`url(#${uid}-${edge.id})`}
          marker-end={`url(#${markerId})`}
        />
      {:else}
        <path d={geometry.path} class="thread" />
      {/if}
    {/each}
  </g>

  {#if trail && trailPath}
    {#key trailKey}
      <path
        d={trailPath}
        class="trail"
        pathLength="1"
        stroke-dasharray="1"
        stroke-dashoffset="1"
        marker-end={`url(#${markerId})`}
      />
    {/key}
  {/if}

  <g class="nodes">
    {#each visibleNodes as node (node.id)}
      {@const nodeTags = tags[node.id] ?? { ltag: 0, rtag: 0 }}
      <g
        class="node"
        class:visited={visited.includes(node.id)}
        class:focus={focus === node.id}
        transform={`translate(${node.x} ${node.y})`}
      >
        {#if pre === node.id}
          <circle class="pre-ring" r="32" />
        {/if}
        <circle class="body" r={RADIUS} />
        <text class="label" y="-2">{node.label}</text>
        <text class="tag-text" y="13"
          ><tspan class:on={nodeTags.ltag === 1}>{nodeTags.ltag}</tspan><tspan class="sep"
            >·</tspan
          ><tspan class:on={nodeTags.rtag === 1}>{nodeTags.rtag}</tspan></text
        >
      </g>
      {#if pre === node.id}
        <g class="pre-badge" transform={`translate(${node.x - 44} ${node.y})`}>
          <rect x="-17" y="-9" width="34" height="18" rx="9" />
          <text y="3.5">pre</text>
        </g>
      {/if}
    {/each}
  </g>
</svg>

<style>
  .tree {
    display: block;
    width: 100%;
    min-width: 30rem;
    height: auto;
    color: var(--fg);
    overflow: visible;
  }

  .child-edge {
    fill: none;
    stroke: var(--anim-edge);
    stroke-width: 2;
  }

  .thread {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-dasharray: 6 4;
    stroke-linecap: round;
  }
  .thread.fresh {
    stroke-width: 2.8;
  }
  /* 遮罩和虚线走同一条路径，太窄的话末端的箭头会被切掉，所以给到 18。 */
  .thread-reveal {
    fill: none;
    stroke: #fff;
    stroke-width: 18;
    stroke-linecap: round;
    stroke-dashoffset: 100;
    animation: thread-draw 420ms var(--ease-out-expo) forwards;
  }
  @keyframes thread-draw {
    from {
      stroke-dashoffset: 100;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  marker path {
    fill: var(--accent);
  }

  .trail {
    fill: none;
    stroke: var(--accent-strong);
    stroke-width: 3.2;
    stroke-linecap: round;
    opacity: 0.95;
    animation: trail-draw 260ms var(--ease-out-expo) forwards;
  }
  @keyframes trail-draw {
    from {
      stroke-dashoffset: 1;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  .node .body {
    fill: var(--anim-node-bg);
    stroke: var(--anim-line-strong);
    stroke-width: 2;
    transition:
      fill 180ms ease,
      stroke 180ms ease;
  }
  .node .label {
    fill: currentColor;
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
  }
  .node .tag-text {
    fill: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 500;
    text-anchor: middle;
  }
  .node .tag-text .sep {
    opacity: 0.45;
  }
  .node .tag-text .on {
    fill: var(--accent);
    font-weight: 700;
  }
  .node.visited .body {
    fill: color-mix(in oklab, var(--accent) 16%, var(--anim-node-bg));
    stroke: var(--accent);
  }
  .node.focus .body {
    fill: var(--accent);
    stroke: var(--accent-strong);
    stroke-width: 2.4;
  }
  .node.focus .label {
    fill: var(--accent-fg);
  }
  .node.focus .tag-text {
    fill: color-mix(in oklab, var(--accent-fg) 78%, var(--accent));
  }
  .node.focus .tag-text .on {
    fill: var(--accent-fg);
  }

  .pre-ring {
    fill: none;
    stroke: var(--warning);
    stroke-width: 2;
    stroke-dasharray: 5 4;
  }
  .pre-badge rect {
    fill: var(--warning);
  }
  .pre-badge text {
    fill: oklch(0.22 0.03 80);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    text-anchor: middle;
  }

  @media (prefers-reduced-motion: reduce) {
    .thread-reveal {
      animation: none;
      stroke-dashoffset: 0;
    }
    .trail {
      animation: none;
      stroke-dashoffset: 0;
    }
    .node .body {
      transition: none;
    }
  }
</style>
