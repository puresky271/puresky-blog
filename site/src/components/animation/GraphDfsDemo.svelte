<script lang="ts">
  import {
    createDfsTrace,
    DFS_EDGES,
    DFS_NODE_MAP,
    type DfsPhase,
    type DfsStep,
  } from '@/lib/animations/graph-dfs';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import TreeDiagram from './TreeDiagram.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const _props: AnimationProps = $props();

  /** 树图画在 520×360 的自定义画布里，三层结点之间留足空隙，层级一眼能分开。 */
  const TREE_NODES = [
    { id: 'A', label: 'A', x: 270, y: 52 },
    { id: 'B', label: 'B', x: 150, y: 176 },
    { id: 'C', label: 'C', x: 270, y: 176 },
    { id: 'D', label: 'D', x: 390, y: 176 },
    { id: 'E', label: 'E', x: 80, y: 300 },
    { id: 'F', label: 'F', x: 150, y: 300 },
    { id: 'G', label: 'G', x: 220, y: 300 },
    { id: 'I', label: 'I', x: 340, y: 300 },
    { id: 'K', label: 'K', x: 440, y: 300 },
  ];

  const TREE_EDGES = DFS_EDGES.map((edge) => [edge.from, edge.to] as [string, string]);

  const trace = createDfsTrace();
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<DfsStep>(trace.steps[player.index]);

  const PHASE_LABELS: Record<DfsPhase, string> = {
    start: '出发',
    descend: '向下深入',
    backtrack: '回溯',
    done: '完成',
  };

  const phase = $derived(PHASE_LABELS[step.phase]);
  const phaseTone = $derived<'accent' | 'success'>(step.phase === 'done' ? 'success' : 'accent');
  const treeLabel = $derived(`深度优先遍历演示：${step.description}`);

  const onPath = $derived(new Set(step.path));

  /** 回溯那一步正在离开的结点，用警告色标一下，不画箭头也能看出从哪退。 */
  const leavingId = $derived(
    step.phase === 'backtrack' && step.activeEdge ? step.activeEdge[0] : null,
  );

  const pathEdgeKeys = $derived(
    new Set(step.path.slice(0, -1).map((id, index) => `${id}>${step.path[index + 1]}`)),
  );

  /** 当前路径上的边画实线，走过又退回来的边画虚线，一眼分得出还在路上的和已经退掉的。 */
  const pathEdges = $derived(
    step.path
      .slice(0, -1)
      .map((id, index) => [id, step.path[index + 1]] as [string, string]),
  );
  const spentEdges = $derived.by(() => {
    const visited = new Set(step.visitOrder);
    return DFS_EDGES.filter(
      (edge) => visited.has(edge.from) && visited.has(edge.to) && !pathEdgeKeys.has(edge.key),
    ).map((edge) => [edge.from, edge.to] as [string, string]);
  });

  /** 栈帧右侧的小字：这一层接下来要试哪个孩子。 */
  function frameNote(id: string, next: number) {
    const children = DFS_NODE_MAP.get(id)!.children;
    if (children.length === 0) return '叶子';
    if (next >= children.length) return '已探完';
    return `下一个 ${children[next]}`;
  }
</script>

<AnimationShell
  title="DFS · 一条路走到黑"
  meta={`${trace.steps.length} 步 · ${trace.nodeIds.length} 个结点`}
>
  <div class="stage">
    <div class="tree-panel">
      <TreeDiagram
        ids={trace.nodeIds}
        nodes={TREE_NODES}
        edges={TREE_EDGES}
        focus={step.current}
        {pathEdges}
        {spentEdges}
        visitOrder={step.visitOrder}
        members={onPath}
        fresh={step.fresh}
        leaving={leavingId}
        focusLabel={null}
        showVisitBadges={false}
        viewBoxWidth={520}
        viewBoxHeight={360}
        ariaLabel={treeLabel}
      />

      <div class="legend">
        <span><i class="line path"></i>当前路径</span>
        <span><i class="line spent"></i>走过又退回</span>
        <span><i class="dot member"></i>在栈中</span>
        <span><i class="dot visited"></i>已访问</span>
        <span class="hint">访问次序见右侧序列</span>
      </div>
    </div>

    <aside class="side">
      <section class="side-panel">
        <div class="panel-head">
          <span>调用栈</span>
          <small>栈顶是现在的位置</small>
        </div>
        <div class="stack-list" class:empty={step.stack.length === 0}>
          {#each [...step.stack].reverse() as frame, depth}
            <div class="stack-frame" class:top={depth === 0}>
              <b>{frame.id}</b>
              <small class="frame-stage">{frameNote(frame.id, frame.next)}</small>
              {#if depth === 0}<small class="top-tag">栈顶</small>{/if}
            </div>
          {/each}
          {#if step.stack.length === 0}<span class="empty-text">栈已空</span>{/if}
        </div>
        <p class="panel-note">栈里记着来时的分叉点。回溯就是弹出栈顶，回到上一层。</p>
      </section>

      <section class="side-panel">
        <div class="panel-head">
          <span>访问序列</span>
          <small>{step.visitOrder.length} / {trace.result.length}</small>
        </div>
        <div class="visit-track">
          {#each trace.result as _, index}
            {@const filled = index < step.visitOrder.length}
            {@const latest = filled && index === step.visitOrder.length - 1}
            <span class="visit-slot" class:filled class:latest>
              <small>{index + 1}</small>
              <b>{filled ? step.visitOrder[index] : '·'}</b>
            </span>
          {/each}
        </div>
      </section>
    </aside>
  </div>

  <StepExplanation {phase} description={step.description} tone={phaseTone} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) 13.5rem; gap: 1.25rem; align-items: stretch; }
  .tree-panel { min-width: 0; padding: 0 0 0.65rem; overflow-x: auto; }
  .side { display: flex; flex-direction: column; gap: 0.9rem; min-width: 0; padding-left: 1.1rem; border-left: 1px solid var(--anim-line); }
  .side-panel + .side-panel { padding-top: 0.9rem; border-top: 1px solid var(--anim-line); }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.55rem; color: var(--fg-muted); font-size: 0.74rem; font-weight: 650; }
  .panel-head small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; font-weight: 400; }
  .stack-list { display: flex; flex-direction: column; min-height: 2.1rem; }
  .stack-frame { display: flex; align-items: center; gap: 0.45rem; min-height: 2rem; padding: 0.25rem 0.35rem 0.25rem 0.55rem; border-left: 2px solid var(--anim-line); color: var(--fg-muted); font-family: var(--font-mono); font-size: 0.7rem; transition: border-color 180ms ease, color 180ms ease; }
  .stack-frame b { min-width: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .stack-frame small { flex-shrink: 0; font-size: 0.58rem; }
  .stack-frame .frame-stage { color: var(--anim-muted); }
  .stack-frame .top-tag { margin-left: auto; color: var(--accent-strong); }
  .stack-frame.top { border-left-color: var(--accent); color: var(--accent-strong); }
  .empty-text { display: flex; align-items: center; min-height: 2.1rem; color: var(--anim-muted); font-size: 0.68rem; }
  .panel-note { margin: 0.45rem 0 0; color: var(--anim-muted); font-size: 0.65rem; line-height: 1.6; }
  .visit-track { display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 0.3rem; }
  .visit-slot { display: flex; flex-direction: column; align-items: center; gap: 0.08rem; padding: 0.2rem 0 0.3rem; border-bottom: 2px solid var(--anim-line); color: var(--anim-muted); font-family: var(--font-mono); transition: border-color 180ms ease, color 180ms ease; }
  .visit-slot small { font-size: 0.52rem; line-height: 1.1; }
  .visit-slot b { font-size: 0.78rem; font-weight: 650; line-height: 1.2; }
  .visit-slot.filled { border-bottom-color: color-mix(in oklab, var(--accent) 65%, var(--anim-line)); color: var(--fg); }
  .visit-slot.latest { border-bottom-color: var(--accent); color: var(--accent-strong); }

  .legend { display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem 0.8rem; margin-top: 0.35rem; padding-inline: 0.2rem; color: var(--anim-muted); font-size: 0.68rem; }
  .legend > span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .dot { width: 0.6rem; height: 0.6rem; border-radius: 999px; }
  .dot.visited { border: 1px solid var(--accent); background: color-mix(in oklab, var(--accent) 24%, var(--surface)); }
  .dot.member { border: 1px dashed var(--accent-strong); }
  .line { width: 1.1rem; height: 0; border-top: 3px solid var(--accent); border-radius: 2px; }
  .line.spent { border-top: 2.4px dashed var(--warning); }
  .legend .hint { margin-left: auto; }

  @media (width < 52rem) {
    .stage { grid-template-columns: 1fr; }
    .side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.9rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
    .side-panel + .side-panel { padding: 0 0 0 1rem; border-top: 0; border-left: 1px solid var(--anim-line); }
  }
  @media (width < 34rem) {
    .side { grid-template-columns: 1fr; }
    .side-panel + .side-panel { padding: 0.8rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
    .legend .hint { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .stack-frame, .visit-slot { transition: none; }
  }
</style>
