<script lang="ts">
  import { untrack } from 'svelte';

  import { HEAD_ID, ORDER_LABELS, type ThreadOrder } from '@/lib/animations/thread-build';
  import { createTraverseTrace, type TraverseStep } from '@/lib/animations/thread-traverse';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import ThreadDiagram from './ThreadDiagram.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();

  const order: ThreadOrder = untrack(() =>
    config.order === 'preorder' || config.order === 'postorder' ? config.order : 'inorder',
  );
  const trace = createTraverseTrace(order);
  const orderLabel = ORDER_LABELS[order];
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<TraverseStep>(trace.steps[player.index]);

  const reverse = trace.reverse;
  const isDone = $derived(step.phase === 'done');

  const pointerLabel = $derived(
    step.focus === null ? '结束' : step.focus === HEAD_ID ? '头结点' : step.focus,
  );

  const ruleText = $derived(
    order === 'inorder'
      ? '后继：rtag 为 1 就顺着 rchild 线索跳，否则去右子树里找最左下的结点。'
      : order === 'preorder'
        ? '后继：ltag 为 0 就走左孩子，否则 rchild 要么是右孩子，要么是后继线索。'
        : '前驱：rtag 为 0 时是右孩子，否则是左孩子或者左线索。',
  );

  const phaseLabel = $derived.by(() => {
    if (isDone) return '完成';
    if (step.phase === 'descend') return '往左下走';
    if (step.phase === 'visit') return reverse ? '收集结点' : '访问结点';
    return reverse ? '开始收集' : '找到起点';
  });

  const treeLabel = $derived(`${orderLabel}线索树遍历演示：${step.description}`);
</script>

<AnimationShell
  title={`${orderLabel}线索树遍历`}
  meta={`${trace.steps.length} 步 · ${trace.nodeIds.length} 个结点${reverse ? ' · 倒序收集' : ''}`}
>
  <div class="stage-wrap">
    <div class="stage">
      <div class="tree-panel">
        <ThreadDiagram
          hasHead={trace.hasHead}
          threads={trace.threads}
          tags={trace.tags}
          focus={step.focus}
          visited={step.visited}
          trail={step.trail}
          ariaLabel={treeLabel}
        />

        <div class="legend">
          <span><i class="line solid"></i>孩子指针</span>
          <span><i class="line dashed"></i>线索</span>
          <span><i class="line trail"></i>这一步走的线</span>
          <span><i class="dot focus-dot"></i>当前 p</span>
          <span><i class="dot visited-dot"></i>{reverse ? '已收集' : '已访问'}</span>
          <span class="hint">结点里的小字是 ltag·rtag</span>
        </div>
      </div>

      <aside class="side">
        <section class="side-panel">
          <div class="panel-head"><span>指针 p</span><small>当前停在哪</small></div>
          <div class="pointer-value" class:empty={step.focus === null}>{pointerLabel}</div>
          <p class="panel-note">{ruleText}</p>
        </section>

        <section class="side-panel">
          {#if reverse}
            <div class="panel-head">
              <span>压栈顺序</span><small>{step.visited.length} / {trace.visitOrder.length}</small>
            </div>
            <div class="visit-track">
              {#each trace.visitOrder as _, index (index)}
                {@const filled = index < step.visited.length}
                {@const latest = filled && index === step.visited.length - 1}
                <span class="visit-slot" class:filled class:latest>
                  <small>{index + 1}</small>
                  <b>{filled ? step.visited[index] : '·'}</b>
                </span>
              {/each}
            </div>
            <div class="panel-head stacked">
              <span>出栈顺序·后序序列</span><small>{isDone ? '完成' : '等待'}</small>
            </div>
            <div class="visit-track">
              {#each trace.visitOrder as node, index (node)}
                <span class="visit-slot" class:filled={isDone}>
                  <small>{index + 1}</small>
                  <b>{isDone ? node : '·'}</b>
                </span>
              {/each}
            </div>
          {:else}
            <div class="panel-head">
              <span>访问序列</span><small>{step.visited.length} / {trace.visitOrder.length}</small>
            </div>
            <div class="visit-track">
              {#each trace.visitOrder as _, index (index)}
                {@const filled = index < step.visited.length}
                {@const latest = filled && index === step.visited.length - 1}
                <span class="visit-slot" class:filled class:latest>
                  <small>{index + 1}</small>
                  <b>{filled ? step.visited[index] : '·'}</b>
                </span>
              {/each}
            </div>
          {/if}
        </section>
      </aside>
    </div>
  </div>

  <StepExplanation
    phase={phaseLabel}
    description={step.description}
    tone={isDone ? 'success' : 'accent'}
  />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .stage-wrap {
    container-type: inline-size;
  }
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 13.5rem;
    gap: 1.25rem;
    align-items: start;
  }
  .tree-panel {
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 0.4rem;
  }

  .legend {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.8rem;
    margin-top: 0.3rem;
    padding-inline: 0.2rem;
    color: var(--anim-muted);
    font-size: 0.68rem;
  }
  .legend > span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .legend .line {
    width: 1.15rem;
    border-top: 2px solid var(--anim-edge);
  }
  .legend .line.dashed {
    border-top: 2px dashed var(--accent);
  }
  .legend .line.trail {
    border-top: 3px solid var(--accent-strong);
  }
  .legend .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 999px;
  }
  .legend .focus-dot {
    background: var(--accent);
  }
  .legend .visited-dot {
    border: 1px solid var(--accent);
    background: color-mix(in oklab, var(--accent) 24%, var(--surface));
  }
  .legend .hint {
    margin-left: auto;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-width: 0;
    padding-left: 1.1rem;
    border-left: 1px solid var(--anim-line);
  }
  .side-panel + .side-panel {
    padding-top: 0.9rem;
    border-top: 1px solid var(--anim-line);
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
    color: var(--fg-muted);
    font-size: 0.72rem;
    font-weight: 650;
  }
  .panel-head.stacked {
    margin-top: 0.7rem;
  }
  .panel-head small {
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 400;
  }
  .pointer-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 4.4rem;
    padding: 0.22rem 0.6rem;
    border: 1px solid color-mix(in oklab, var(--accent) 55%, var(--anim-line));
    border-radius: 10px;
    background: color-mix(in oklab, var(--accent) 10%, var(--anim-inset));
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.92rem;
    font-weight: 650;
  }
  .pointer-value.empty {
    border-style: dashed;
    background: transparent;
    color: var(--anim-muted);
  }
  .panel-note {
    margin: 0.4rem 0 0;
    color: var(--anim-muted);
    font-size: 0.64rem;
    line-height: 1.6;
  }
  .visit-track {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem;
  }
  .visit-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.06rem;
    padding: 0.15rem 0 0.25rem;
    border-bottom: 2px solid var(--anim-line);
    color: var(--anim-muted);
    font-family: var(--font-mono);
    transition:
      border-color 160ms ease,
      color 160ms ease;
  }
  .visit-slot small {
    font-size: 0.5rem;
    line-height: 1.1;
  }
  .visit-slot b {
    font-size: 0.75rem;
    font-weight: 650;
    line-height: 1.2;
  }
  .visit-slot.filled {
    border-bottom-color: color-mix(in oklab, var(--accent) 60%, var(--anim-line));
    color: var(--fg);
  }
  .visit-slot.latest {
    border-bottom-color: var(--accent);
    color: var(--accent-strong);
  }

  @container (width < 48rem) {
    .stage {
      grid-template-columns: 1fr;
    }
    .side {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding: 0.9rem 0 0;
      border-top: 1px solid var(--anim-line);
      border-left: 0;
    }
    .side-panel + .side-panel {
      padding-top: 0;
      border-top: 0;
    }
    .side-panel:first-child {
      grid-column: 1 / -1;
    }
    .legend .hint {
      display: none;
    }
  }
  @container (width < 32rem) {
    .side {
      grid-template-columns: 1fr;
    }
    .side-panel:first-child {
      grid-column: auto;
    }
    .side-panel + .side-panel {
      padding-top: 0.8rem;
      border-top: 1px solid var(--anim-line);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .visit-slot {
      transition: none;
    }
  }
</style>
