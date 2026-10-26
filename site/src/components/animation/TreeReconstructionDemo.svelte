<script lang="ts">
  import { untrack } from 'svelte';

  import {
    createReconstructionTrace,
    type ReconstructionOrder,
    type ReconstructionStep,
    type SequenceRange,
  } from '@/lib/animations/tree-reconstruction';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import DataCell from './DataCell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import TreeDiagram from './TreeDiagram.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();
  const order = untrack(() => (config.order === 'postorder' ? 'postorder' : 'preorder') as ReconstructionOrder);
  const sourceLabel = order === 'preorder' ? '先序' : '后序';
  const trace = createReconstructionTrace(order);
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<ReconstructionStep>(trace.steps[player.index]);
  const phase = $derived({
    'select-root': '确定根结点',
    split: '划分左右子树',
    attach: '接入重建树',
    descend: '进入子树',
    complete: '子树完成',
    done: '重建完成',
  }[step.phase]);
  const fresh = $derived(step.phase === 'attach' ? step.root : null);
  const treeLabel = $derived(`${sourceLabel}加中序重建二叉树：${step.description}`);

  function rangeStyle(range: SequenceRange | null) {
    return range ? `grid-column: ${range[0] + 1} / span ${range[1] - range[0] + 1}` : '';
  }

  function inRange(index: number, range: SequenceRange | null) {
    return range !== null && index >= range[0] && index <= range[1];
  }

  function cellState(id: string, index: number, rootIndex: number | null) {
    if (index === rootIndex) return 'current' as const;
    if (step.placedIds.includes(id)) return 'matched' as const;
    return 'idle' as const;
  }
</script>

<AnimationShell title={`${sourceLabel} + 中序 · 重建`} meta={`${trace.steps.length} 步 · 7 个结点`}>
  <div class="stage">
    <div class="workspace">
      <section class="sequences" aria-label="用于重建的两条遍历序列">
        <div class="sequence">
          <div class="sequence-head"><span>{sourceLabel}序列</span><small>{order === 'preorder' ? '区间开头取根' : '区间末尾取根'}</small></div>
          <div class="range-labels source-ranges">
            {#if step.sourceRange}<span style={rangeStyle(step.sourceRange)}>当前区间</span>{/if}
          </div>
          <div class="cells">
            {#each trace.source as id, index}
              <span class:muted={step.sourceRange !== null && !inRange(index, step.sourceRange)}>
                <DataCell value={id} state={cellState(id, index, step.sourceRootIndex)} />
              </span>
            {/each}
          </div>
        </div>

        <div class="sequence">
          <div class="sequence-head"><span>中序序列</span><small>根的左侧归左子树，右侧归右子树</small></div>
          <div class="range-labels inorder-ranges">
            {#if step.leftRange}<span class="left" style={rangeStyle(step.leftRange)}>左子树</span>{/if}
            {#if step.inorderRootIndex !== null}<span class="root-range" style={rangeStyle([step.inorderRootIndex, step.inorderRootIndex])}>根</span>{/if}
            {#if step.rightRange}<span class="right" style={rangeStyle(step.rightRange)}>右子树</span>{/if}
          </div>
          <div class="cells">
            {#each trace.inorder as id, index}
              <span
                class:muted={step.inorderRange !== null && !inRange(index, step.inorderRange)}
                class:left-cell={inRange(index, step.leftRange)}
                class:right-cell={inRange(index, step.rightRange)}
              >
                <DataCell value={id} state={cellState(id, index, step.inorderRootIndex)} />
              </span>
            {/each}
          </div>
        </div>
      </section>

      <div class="tree-wrap">
        {#if step.placedIds.length === 0}<span class="tree-empty">确定根结点后，重建树会从这里开始生长</span>{/if}
        <TreeDiagram
          ids={step.placedIds}
          focus={step.root}
          activeEdge={step.activeEdge}
          {fresh}
          focusLabel={step.phase === 'attach' ? '新接入' : '当前'}
          ariaLabel={treeLabel}
        />
      </div>
    </div>

    <aside class="side">
      <section>
        <div class="panel-head"><span>递归任务</span><small>{step.callStack.length} 层</small></div>
        <div class="task-list">
          {#each [...step.callStack].reverse() as task, index}
            <div class="task" class:current={index === 0}>
              <b>{task.root}</b><span>{task.side}</span>{#if index === 0}<small>当前</small>{/if}
            </div>
          {/each}
          {#if step.callStack.length === 0}<p class="empty-text">所有递归任务已完成</p>{/if}
        </div>
      </section>
      <section class="rule">
        <div class="panel-head"><span>本步依据</span></div>
        <p>{order === 'preorder' ? '先序遵循“根，左，右”，当前区间最前面的结点就是根。' : '后序遵循“左，右，根”，当前区间最后面的结点就是根。'}</p>
      </section>
    </aside>
  </div>

  <StepExplanation {phase} description={step.description} tone={step.phase === 'done' ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) 12rem; gap: 1.25rem; }
  .workspace { min-width: 0; }
  .sequences { display: grid; gap: 1rem; }
  .sequence { min-width: 0; }
  .sequence-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.45rem; }
  .sequence-head > span { color: var(--fg); font-size: 0.75rem; font-weight: 650; }
  .sequence-head small { color: var(--anim-muted); font-size: 0.62rem; }
  .range-labels, .cells { display: grid; grid-template-columns: repeat(7, minmax(2rem, 1fr)); gap: 0.3rem; min-width: 25rem; }
  .range-labels { min-height: 1.15rem; color: var(--accent-strong); font-size: 0.58rem; text-align: center; }
  .range-labels span { border-bottom: 1px solid currentColor; }
  .range-labels .left { color: var(--success); }
  .range-labels .right { color: var(--warning); }
  .range-labels .root-range { color: var(--accent-strong); }
  .cells > span { display: flex; justify-content: center; padding-top: 0.35rem; border-bottom: 2px solid transparent; transition: opacity 180ms ease, border-color 180ms ease; }
  .cells > span.muted { opacity: 0.32; }
  .cells > span.left-cell { border-bottom-color: var(--success); }
  .cells > span.right-cell { border-bottom-color: var(--warning); }
  .tree-wrap { position: relative; margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px solid var(--anim-line); overflow-x: auto; }
  .tree-empty { position: absolute; inset: 50% 0 auto; color: var(--anim-muted); font-size: 0.72rem; text-align: center; transform: translateY(-50%); }
  .side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; padding-left: 1.1rem; border-left: 1px solid var(--anim-line); }
  .side > section + section { padding-top: 0.9rem; border-top: 1px solid var(--anim-line); }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.55rem; color: var(--fg-muted); font-size: 0.74rem; font-weight: 650; }
  .panel-head small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; font-weight: 400; }
  .task-list { display: flex; flex-direction: column; }
  .task { display: flex; align-items: center; gap: 0.45rem; min-height: 2rem; padding: 0.25rem 0.25rem 0.25rem 0.55rem; border-left: 2px solid var(--anim-line); color: var(--anim-muted); font-size: 0.68rem; }
  .task b { color: var(--fg); font-family: var(--font-mono); font-size: 0.78rem; }
  .task small { margin-left: auto; color: var(--accent-strong); font-size: 0.56rem; }
  .task.current { border-left-color: var(--accent); color: var(--accent-strong); }
  .empty-text, .rule p { margin: 0; color: var(--anim-muted); font-size: 0.66rem; line-height: 1.7; }
  @media (width < 52rem) {
    .stage { grid-template-columns: 1fr; }
    .sequences, .tree-wrap { overflow-x: auto; }
    .side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.9rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
    .side > section + section { padding: 0 0 0 1rem; border-top: 0; border-left: 1px solid var(--anim-line); }
  }
  @media (width < 34rem) {
    .sequence-head small { display: none; }
    .side { grid-template-columns: 1fr; }
    .side > section + section { padding: 0.8rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .cells > span { transition: none; } }
</style>
