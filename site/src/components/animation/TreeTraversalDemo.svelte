<script lang="ts">
  import { untrack } from 'svelte';

  import {
    createTraversalTrace,
    type FrameStage,
    type TraversalMethod,
    type TraversalOrder,
    type TraversalStep,
  } from '@/lib/animations/tree-traversal';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import TraversalTree from './TraversalTree.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();

  const { order, method } = untrack(() => ({
    order: (config.order === 'inorder' || config.order === 'postorder' ? config.order : 'preorder') as TraversalOrder,
    method: (config.method === 'iterative' ? 'iterative' : 'recursive') as TraversalMethod,
  }));
  const orderLabel = { preorder: '先序', inorder: '中序', postorder: '后序' }[order];
  const methodLabel = method === 'recursive' ? '递归' : '迭代';
  const trace = createTraversalTrace(order, method);
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<TraversalStep>(trace.steps[player.index]);

  const phase = $derived.by(() => {
    if (step.phase === 'enter') {
      return order === 'preorder' || step.visitOrder.at(-1) === step.focus ? '访问结点' : '进入结点';
    }
    return {
      visit: '访问结点',
      descend: '进入子树',
      return: '回溯',
      push: '入栈',
      pop: '出栈并访问',
      'go-right': '转向右子树',
      done: '完成',
    }[step.phase];
  });

  const lastVisited = $derived(step.visitOrder.at(-1) ?? null);
  const fresh = $derived(['enter', 'visit', 'pop'].includes(step.phase) ? lastVisited : null);
  const onStack = $derived(new Set(step.stack.map((frame) => frame.id)));
  const treeLabel = $derived(`${orderLabel}遍历${methodLabel}演示：${step.description}`);

  function stageLabel(stage: FrameStage) {
    return { visit: '访问', left: '左', right: '右', return: '返回', pending: '' }[stage];
  }
</script>

<AnimationShell title={`${orderLabel}遍历 · ${methodLabel}`} meta={`${trace.steps.length} 步 · 7 个结点`}>
  <div class="stage">
    <TraversalTree
      ids={trace.result}
      focus={step.focus}
      activeEdge={step.activeEdge}
      visitOrder={step.visitOrder}
      members={onStack}
      membershipLabel="在栈中"
      {fresh}
      ariaLabel={treeLabel}
    />

    <aside class="side">
      <section class="side-panel">
        <div class="panel-head">
          <span>{method === 'recursive' ? '调用栈' : '显式栈'}</span>
          <small>{method === 'recursive' ? '系统维护' : '程序维护'}</small>
        </div>
        <div class="stack-list" class:empty={step.stack.length === 0}>
          {#each [...step.stack].reverse() as frame, depth}
            <div class="stack-frame" class:top={depth === 0}>
              <b>{method === 'recursive' ? `${order}(${frame.id})` : frame.id}</b>
              {#if method === 'recursive'}<small class="frame-stage">{stageLabel(frame.stage)}</small>{/if}
              {#if depth === 0}<small class="top-tag">栈顶</small>{/if}
            </div>
          {/each}
          {#if step.stack.length === 0}<span class="empty-text">栈已空</span>{/if}
        </div>
        <p class="panel-note">
          {method === 'recursive'
            ? '小标签表示当前停在哪一步；栈顶是正在执行的函数。'
            : order === 'postorder'
              ? `上次访问：${lastVisited ?? '无'}。只有右子树访问完，栈顶结点才会弹出。`
              : order === 'inorder'
                ? '一路向左入栈；弹出栈顶就访问它，然后转向右子树。'
                : '栈顶是下一个要访问的结点。'}
        </p>
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

  <StepExplanation {phase} description={step.description} tone={step.phase === 'done' ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) 13.5rem; gap: 1.25rem; align-items: stretch; }
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
  .visit-track { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.3rem; }
  .visit-slot { display: flex; flex-direction: column; align-items: center; gap: 0.08rem; padding: 0.2rem 0 0.3rem; border-bottom: 2px solid var(--anim-line); color: var(--anim-muted); font-family: var(--font-mono); transition: border-color 180ms ease, color 180ms ease; }
  .visit-slot small { font-size: 0.52rem; line-height: 1.1; }
  .visit-slot b { font-size: 0.78rem; font-weight: 650; line-height: 1.2; }
  .visit-slot.filled { border-bottom-color: color-mix(in oklab, var(--accent) 65%, var(--anim-line)); color: var(--fg); }
  .visit-slot.latest { border-bottom-color: var(--accent); color: var(--accent-strong); }
  @media (width < 52rem) {
    .stage { grid-template-columns: 1fr; }
    .side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.9rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
    .side-panel + .side-panel { padding: 0 0 0 1rem; border-top: 0; border-left: 1px solid var(--anim-line); }
  }
  @media (width < 34rem) {
    .side { grid-template-columns: 1fr; }
    .side-panel + .side-panel { padding: 0.8rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .stack-frame, .visit-slot { transition: none; }
  }
</style>
