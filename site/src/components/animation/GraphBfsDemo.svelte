<script lang="ts">
  import {
    BFS_EDGES,
    createBfsTrace,
    type BfsPhase,
    type BfsStep,
  } from '@/lib/animations/graph-bfs';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import TreeDiagram from './TreeDiagram.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const _props: AnimationProps = $props();

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
  const TREE_EDGES = BFS_EDGES.map((edge) => [edge.from, edge.to] as [string, string]);

  const trace = createBfsTrace();
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<BfsStep>(trace.steps[player.index]);

  const PHASE_LABELS: Record<BfsPhase, string> = {
    start: '起点入队',
    dequeue: '出队并访问',
    enqueue: '发现并入队',
    done: '完成',
  };

  const phase = $derived(PHASE_LABELS[step.phase]);
  const phaseTone = $derived<'accent' | 'success'>(step.phase === 'done' ? 'success' : 'accent');
  const treeLabel = $derived(`广度优先遍历演示：${step.description}`);
  const queued = $derived(new Set(step.queue));
  const discovered = $derived(new Set([...step.visitOrder, ...step.queue]));
  const discoveryEdges = $derived(
    BFS_EDGES.filter((edge) => discovered.has(edge.to)).map(
      (edge) => [edge.from, edge.to] as [string, string],
    ),
  );

  function queueLabel(index: number) {
    if (index === 0) return '队头';
    if (index === step.queue.length - 1) return '队尾';
    return '';
  }
</script>

<AnimationShell
  title="BFS · 一层一层向外扩散"
  meta={`${trace.steps.length} 步 · ${trace.nodeIds.length} 个结点`}
>
  <div class="stage">
    <div class="tree-panel">
      <TreeDiagram
        ids={trace.nodeIds}
        nodes={TREE_NODES}
        edges={TREE_EDGES}
        focus={step.focus}
        activeEdge={step.activeEdge}
        pathEdges={discoveryEdges}
        visitOrder={step.visitOrder}
        members={queued}
        fresh={step.fresh}
        focusLabel={null}
        showVisitBadges={false}
        viewBoxWidth={520}
        viewBoxHeight={360}
        ariaLabel={treeLabel}
      />

      <div class="legend">
        <span><i class="line discovered"></i>已经发现的边</span>
        <span><i class="dot member"></i>在队列中</span>
        <span><i class="dot visited"></i>已访问</span>
        <span class="hint">访问次序见右侧序列</span>
      </div>
    </div>

    <aside class="side">
      <section class="side-panel">
        <div class="panel-head">
          <span>队列</span>
          <small>{step.level ? `第 ${step.level} 层` : '结束'} · {step.queue.length} 个</small>
        </div>
        <div class="queue-scroll">
          <div class="queue-track">
            {#each step.queue as id, index}
              <span class="queue-item" class:front={index === 0} class:rear={index === step.queue.length - 1}>
                <small>{queueLabel(index)}</small>
                <b>{id}</b>
              </span>
            {/each}
            {#if step.queue.length === 0}<span class="empty-text">队列已空</span>{/if}
          </div>
        </div>
        <p class="panel-note">先进先出：从队头取出结点，新发现的结点排到队尾。</p>
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
  .queue-scroll { overflow-x: auto; padding-bottom: 0.1rem; }
  .queue-track { display: flex; align-items: stretch; gap: 0.65rem; min-height: 2.8rem; width: max-content; min-width: 100%; }
  .queue-item { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.08rem; min-width: 1.8rem; padding: 0.2rem 0; border-bottom: 2px solid var(--anim-line); font-family: var(--font-mono); transition: border-color 180ms ease, color 180ms ease; }
  .queue-item:not(:last-child)::after { content: '→'; position: absolute; left: calc(100% + 0.15rem); top: 50%; color: var(--anim-muted); font-size: 0.65rem; transform: translateY(-50%); }
  .queue-item small { min-height: 0.65rem; color: var(--anim-muted); font-size: 0.5rem; line-height: 1.1; white-space: nowrap; }
  .queue-item b { color: var(--fg); font-size: 0.8rem; font-weight: 650; line-height: 1.2; }
  .queue-item.front { border-bottom-color: var(--accent); }
  .queue-item.front b { color: var(--accent-strong); }
  .queue-item.rear:not(.front) { border-bottom-color: color-mix(in oklab, var(--accent) 45%, var(--anim-line)); }
  .empty-text { display: flex; align-items: center; min-height: 2.7rem; width: 100%; color: var(--anim-muted); font-size: 0.68rem; }
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
    .queue-item, .visit-slot { transition: none; }
  }
</style>
