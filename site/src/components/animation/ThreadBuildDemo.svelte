<script lang="ts">
  import { untrack } from 'svelte';

  import {
    createThreadTrace,
    HEAD_ID,
    ORDER_LABELS,
    type ThreadOrder,
    type ThreadStep,
  } from '@/lib/animations/thread-build';

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
  const trace = createThreadTrace(order);
  const orderLabel = ORDER_LABELS[order];
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<ThreadStep>(trace.steps[player.index]);

  const preLabel = $derived(
    step.pre === null ? '空' : step.pre === HEAD_ID ? '头结点' : step.pre,
  );

  const preNote = $derived.by(() => {
    if (step.pre === null) return 'pre 一开始是空的，第一个访问的结点没有前驱，左指针保持空。';
    if (step.pre === HEAD_ID) return '头结点当作第一个结点的前驱，所以第一个结点的左线索会指向它。';
    return `${step.pre} 刚被访问过，它是下一个结点的前驱。`;
  });

  const phaseLabel = $derived.by(() => {
    switch (step.phase) {
      case 'init':
        return '初始化';
      case 'visit':
        return '访问结点';
      case 'thread-left':
        return '建前驱线索';
      case 'thread-right':
        return '建后继线索';
      case 'advance':
        return '前驱后移';
      case 'link-last':
        return '连最后一个结点';
      case 'link-head':
        return '接上头结点';
      case 'finish':
        return '收尾';
      default:
        return '完成';
    }
  });

  const treeLabel = $derived(`${orderLabel}线索化演示：${step.description}`);
</script>

<AnimationShell
  title={`${orderLabel}线索化`}
  meta={`${trace.steps.length} 步 · ${trace.visitOrder.length} 个结点 · ${trace.threadCount} 条线索`}
>
  <div class="stage-wrap">
    <div class="stage">
      <div class="tree-panel">
        <ThreadDiagram
          hasHead={trace.hasHead}
          threads={step.threads}
          tags={step.tags}
          focus={step.focus}
          visited={step.visited}
          pre={step.pre}
          fresh={step.fresh}
          reveal={true}
          ariaLabel={treeLabel}
        />

        <div class="legend">
          <span><i class="line solid"></i>孩子指针</span>
          <span><i class="line dashed"></i>线索</span>
          <span><i class="dot focus-dot"></i>当前访问</span>
          <span><i class="dot pre-dot"></i>pre 前驱</span>
          <span class="hint">结点里的小字是 ltag·rtag</span>
        </div>
      </div>

      <aside class="side">
        <section class="side-panel">
          <div class="panel-head"><span>前驱指针 pre</span><small>刚访问过的结点</small></div>
          <div class="pre-value" class:empty={step.pre === null} class:head={step.pre === HEAD_ID}>
            {preLabel}
          </div>
          <p class="panel-note">{preNote}</p>
        </section>

        <section class="side-panel">
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
        </section>

        <section class="side-panel">
          <div class="panel-head">
            <span>线索</span><small>{step.threads.length} / {trace.threadCount} 条</small>
          </div>
          <div
            class="thread-meter"
            role="progressbar"
            aria-label="已生成的线索数量"
            aria-valuemin="0"
            aria-valuemax={trace.threadCount}
            aria-valuenow={step.threads.length}
          >
            {#each Array.from({ length: trace.threadCount }) as _, index (index)}
              <i class="tick" class:on={index < step.threads.length}></i>
            {/each}
          </div>
          <p class="panel-note">
            每访问一个结点，最多长出两条：一条从它空着的左指针连向前驱，一条从前驱空着的右指针连向它。
          </p>
        </section>
      </aside>
    </div>
  </div>

  <StepExplanation
    phase={phaseLabel}
    description={step.description}
    tone={step.phase === 'done' ? 'success' : 'accent'}
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
  .legend .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 999px;
  }
  .legend .focus-dot {
    background: var(--accent);
  }
  .legend .pre-dot {
    border: 2px dashed var(--warning);
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
  .panel-head small {
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 400;
  }
  .pre-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 4.4rem;
    padding: 0.22rem 0.6rem;
    border: 1px solid color-mix(in oklab, var(--warning) 55%, var(--anim-line));
    border-radius: 10px;
    background: color-mix(in oklab, var(--warning) 12%, var(--anim-inset));
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.92rem;
    font-weight: 650;
  }
  .pre-value.head {
    min-width: 5rem;
  }
  .pre-value.empty {
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
  .thread-meter {
    display: flex;
    gap: 0.22rem;
  }
  .thread-meter .tick {
    flex: 1;
    height: 0.32rem;
    border-radius: 999px;
    background: var(--anim-line);
    transition: background-color 160ms ease;
  }
  .thread-meter .tick.on {
    background: var(--accent);
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
    .visit-slot,
    .thread-meter .tick {
      transition: none;
    }
  }
</style>
