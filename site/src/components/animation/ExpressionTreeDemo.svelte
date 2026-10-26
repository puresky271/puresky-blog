<script lang="ts">
  import { createExpressionTrace, type ExpressionStep } from '@/lib/animations/expression-tree';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import DataCell from './DataCell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import TreeDiagram from './TreeDiagram.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const _props: AnimationProps = $props();
  const trace = createExpressionTrace();
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<ExpressionStep>(trace.steps[player.index]);
  const labels = new Map(trace.nodes.map((node) => [node.id, node.label]));
  const members = $derived(new Set(step.nodeStack));
  const phase = $derived({
    operand: '创建叶结点',
    open: '进入括号',
    operator: '记录运算符',
    close: '完成括号',
    reduce: '归约子表达式',
    done: '建树完成',
  }[step.phase]);
  const fresh = $derived(step.phase === 'operand' || step.phase === 'reduce' ? step.focus : null);
  const treeLabel = $derived(`根据中缀表达式构建二叉树：${step.description}`);

  function tokenState(index: number) {
    if (index === step.tokenIndex) return 'current' as const;
    if (index < step.processed) return 'matched' as const;
    return 'idle' as const;
  }
</script>

<AnimationShell title="中缀表达式 · 构建表达式树" meta={`${trace.steps.length} 步 · 7 个结点`}>
  <div class="tokens" aria-label="中缀表达式读取进度">
    {#each trace.tokens as token, index}
      <DataCell value={token} state={tokenState(index)} />
    {/each}
  </div>

  <div class="stage">
    <div class="tree-wrap">
      {#if step.visibleIds.length === 0}<span class="tree-empty">读到操作数后，表达式树会从这里开始构建</span>{/if}
      <TreeDiagram
        ids={step.visibleIds}
        nodes={trace.nodes}
        edges={step.edges}
        focus={step.focus}
        activeEdges={step.activeEdges}
        {members}
        {fresh}
        focusLabel={step.phase === 'reduce' ? '新子树' : '当前'}
        ariaLabel={treeLabel}
      />
      <div class="legend">
        <span><i class="current"></i>当前节点</span>
        <span><i class="member"></i>子树栈中的根</span>
      </div>
    </div>

    <aside class="side">
      <section>
        <div class="panel-head"><span>运算符栈</span><small>{step.operatorStack.length} 个</small></div>
        <div class="stack-list">
          {#each [...step.operatorStack].reverse() as operator, index}
            <div class="stack-item" class:top={index === 0}>
              <b>{operator}</b>{#if index === 0}<small>栈顶</small>{/if}
            </div>
          {/each}
          {#if step.operatorStack.length === 0}<p class="empty-text">栈为空</p>{/if}
        </div>
      </section>

      <section>
        <div class="panel-head"><span>子树栈</span><small>{step.nodeStack.length} 棵</small></div>
        <div class="stack-list">
          {#each [...step.nodeStack].reverse() as id, index}
            <div class="stack-item" class:top={index === 0}>
              <b>{labels.get(id)}</b><span>子树</span>{#if index === 0}<small>栈顶</small>{/if}
            </div>
          {/each}
          {#if step.nodeStack.length === 0}<p class="empty-text">栈为空</p>{/if}
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
  .tokens { display: flex; gap: 0.3rem; overflow-x: auto; padding: 0.2rem 0.2rem 1rem; border-bottom: 1px solid var(--anim-line); }
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) 11.5rem; gap: 1.25rem; margin-top: 0.75rem; }
  .tree-wrap { position: relative; min-width: 0; overflow-x: auto; }
  .tree-empty { position: absolute; inset: 50% 0 auto; color: var(--anim-muted); font-size: 0.72rem; text-align: center; transform: translateY(-50%); }
  .legend { display: flex; flex-wrap: wrap; gap: 0.8rem; padding: 0.25rem 0.2rem 0; color: var(--anim-muted); font-size: 0.68rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .legend i { width: 0.6rem; height: 0.6rem; border-radius: 999px; }
  .legend .current { border: 2px solid var(--accent-strong); background: var(--accent); }
  .legend .member { border: 1px dashed var(--accent-strong); }
  .side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; padding-left: 1.1rem; border-left: 1px solid var(--anim-line); }
  .side > section + section { padding-top: 0.9rem; border-top: 1px solid var(--anim-line); }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; color: var(--fg-muted); font-size: 0.74rem; font-weight: 650; }
  .panel-head small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; font-weight: 400; }
  .stack-list { display: flex; flex-direction: column; }
  .stack-item { display: flex; align-items: center; gap: 0.4rem; min-height: 2rem; padding: 0.25rem 0.25rem 0.25rem 0.55rem; border-left: 2px solid var(--anim-line); color: var(--anim-muted); font-size: 0.68rem; }
  .stack-item b { color: var(--fg); font-family: var(--font-mono); font-size: 0.8rem; }
  .stack-item small { margin-left: auto; color: var(--accent-strong); font-size: 0.56rem; }
  .stack-item.top { border-left-color: var(--accent); }
  .stack-item.top b { color: var(--accent-strong); }
  .empty-text { margin: 0; color: var(--anim-muted); font-size: 0.68rem; }
  @media (width < 52rem) {
    .stage { grid-template-columns: 1fr; }
    .side { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.9rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
    .side > section + section { padding: 0 0 0 1rem; border-top: 0; border-left: 1px solid var(--anim-line); }
  }
  @media (width < 34rem) {
    .side { grid-template-columns: 1fr; }
    .side > section + section { padding: 0.8rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
  }
</style>
