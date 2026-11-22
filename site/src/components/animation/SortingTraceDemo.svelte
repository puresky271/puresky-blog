<script lang="ts">
  import { untrack } from 'svelte';

  import {
    SORTING_ALGOS,
    SORTING_ALGO_INFO,
    createSortingTrace,
    type SortingAlgo,
    type SortingStep,
  } from '@/lib/animations/sorting-trace';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();
  const algo = untrack<SortingAlgo>(() => {
    const value = typeof config.algo === 'string' ? config.algo : 'selection';
    return (SORTING_ALGOS as readonly string[]).includes(value) ? (value as SortingAlgo) : 'selection';
  });

  const info = SORTING_ALGO_INFO[algo];
  const trace = createSortingTrace(algo);
  const steps = trace.steps;
  const values = trace.values;
  const total = values.length;
  const maxValue = Math.max(...values, 1);
  const columns = Array.from({ length: total }, (_, index) => index);
  const player = createPlayback(() => steps.length);
  const step = $derived<SortingStep>(steps[player.index]);
  const done = $derived(step.phase === '完成');
  const held = $derived(step.held);
  const heapSize = $derived(step.heapSize);
  const gap = $derived(step.gap);
  const mergeRange = $derived(step.mergeRange);
  const aux = $derived<readonly (number | null)[]>(step.aux ?? []);
  const hasAux = $derived(step.aux !== null);
  const auxIndex = $derived(step.auxIndex);

  const complexity = [
    { label: '最好', value: info.best },
    { label: '平均', value: info.average },
    { label: '最坏', value: info.worst },
    { label: '空间', value: info.space },
  ];

  function barHeight(index: number) {
    if (step.hole === index) return '0.75rem';
    return `${(0.9 + (step.values[index] / maxValue) * 5.1).toFixed(2)}rem`;
  }

  function isComparing(index: number) {
    return step.comparing.includes(index);
  }

  function isMoving(index: number) {
    return step.moving.includes(index);
  }

  function isSorted(index: number) {
    return step.sortedRanges.some(([from, to]) => index >= from && index <= to);
  }

  function columnState(index: number) {
    if (step.hole === index) return 'hole';
    if (isMoving(index)) return 'moving';
    if (isComparing(index)) return 'comparing';
    if (isSorted(index)) return 'sorted';
    return 'idle';
  }

  function markerOf(index: number) {
    if (step.hole === index) return '空';
    if (isMoving(index)) return '移';
    if (isComparing(index)) return '比';
    if (isSorted(index)) return '✓';
    return '';
  }

  function markerTone(index: number) {
    if (step.hole === index) return 'hole';
    if (isMoving(index)) return 'moving';
    if (isComparing(index)) return 'comparing';
    if (isSorted(index)) return 'sorted';
    return 'idle';
  }
</script>

<AnimationShell title={`排序轨迹 · ${info.title}`} meta={`${total} 个元素`}>
  <div class="stage">
    <div class="board-scroll">
      <div
        class="board"
        style={`--cols: ${total}`}
        role="img"
        aria-label={`${info.title}的柱子图，共 ${total} 个元素，${step.phase}`}
      >
        <div class="band-block">
          <div class="row band-row">
            <span class="gutter"></span>
            {#each step.bands as band, bandIndex (bandIndex)}
              <span
                class="band"
                data-tone={band.tone}
                style={`grid-column: ${band.from + 2} / ${band.to + 3}`}
                >{band.label}</span
              >
            {/each}
          </div>
        </div>

        <div class="pointer-block">
          {#each step.pointers as pointer, pointerIndex (pointerIndex)}
            <div class="row pointer-row">
              <span class="gutter">{pointer.label}</span>
              {#each columns as index (index)}
                <span class="cell">{#if pointer.index === index}<span class="arrow">▼</span>{/if}</span>
              {/each}
            </div>
          {/each}
        </div>

        <div class="row bars-row">
          <span class="gutter">数组</span>
          {#each columns as index (index)}
            <span class="column" data-state={columnState(index)} title={`a[${index}] = ${step.values[index]}`}>
              <span class="bar-value">{step.hole === index ? '坑' : step.values[index]}</span>
              <span class="bar" style:height={barHeight(index)}></span>
            </span>
          {/each}
        </div>

        <div class="row index-row">
          <span class="gutter">下标</span>
          {#each columns as index (index)}
            <span class="cell">{index}</span>
          {/each}
        </div>

        <div class="row marker-row">
          <span class="gutter">标记</span>
          {#each columns as index (index)}
            <span class="cell marker" data-tone={markerTone(index)}>{markerOf(index)}</span>
          {/each}
        </div>

        {#if hasAux}
          <div class="aux-block">
            <div class="row pointer-row aux-pointer-row">
              <span class="gutter">写 k</span>
              {#each columns as index (index)}
                <span class="cell">{#if auxIndex === index}<span class="arrow">▼</span>{/if}</span>
              {/each}
            </div>
            <div class="row aux-row">
              <span class="gutter">辅助</span>
              {#each columns as index (index)}
                <span
                  class="aux-cell"
                  data-filled={aux[index] !== null}
                  class:active={auxIndex === index}
                >{aux[index] === null ? '·' : aux[index]}</span
                >
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <aside class="side" aria-label={`${info.title}的统计信息`}>
      <div class="stats">
        <span class="stat"><span class="stat-label">比较</span><b>{step.comparisons}</b><span class="stat-unit">次</span></span>
        <span class="stat"><span class="stat-label">移动</span><b>{step.moves}</b><span class="stat-unit">次</span></span>
      </div>

      <dl class="complexity">
        {#each complexity as item (item.label)}
          <div><dt>{item.label}</dt><dd>{item.value}</dd></div>
        {/each}
        <div><dt>稳定</dt><dd data-stable={info.stable}>{info.stable ? '稳定' : '不稳定'}</dd></div>
        <div><dt>类型</dt><dd>比较排序</dd></div>
      </dl>

      {#if held}
        <p class="state-chip">手里的{held.label}：<b>{held.value}</b></p>
      {/if}
      {#if gap !== null}
        <p class="state-chip">增量 gap = <b>{gap}</b></p>
      {/if}
      {#if heapSize !== null}
        <p class="state-chip">
          {heapSize > 0 ? `堆区 0 到 ${heapSize - 1}，共 ${heapSize} 个` : '堆区已经空出'}
        </p>
      {/if}
      {#if mergeRange}
        <p class="state-chip">合并区间 {mergeRange[0]} 到 {mergeRange[1]}</p>
      {/if}
      <p class="brief">{info.brief}</p>
    </aside>
  </div>

  <div class="legend">
    <span><i class="swatch" data-tone="sorted"></i>有序区，色条上方写着已排好</span>
    <span><i class="swatch" data-tone="comparing"></i>正在比较</span>
    <span><i class="swatch" data-tone="moving"></i>正在交换或写入</span>
    {#if algo === 'quick'}<span><i class="swatch" data-tone="hole"></i>挖出来的坑</span>{/if}
    {#if algo === 'heap'}<span>色条标出当前堆区和已排序区</span>{/if}
    {#if algo === 'merge'}<span>下面一行是辅助数组，读指针在柱子上，写指针 k 在辅助数组上</span>{/if}
    {#if algo === 'bubble'}<span>一轮结束最大值固定到末尾</span>{/if}
    {#if algo === 'shell'}<span>当前增量为 k 时，间隔 gap 的元素互相比较</span>{/if}
  </div>

  <StepExplanation phase={step.phase} description={step.description} tone={done ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 12.5rem;
    align-items: start;
    gap: 1.1rem;
  }
  .board-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.15rem 0.15rem 0.6rem;
  }
  .board {
    --col: 2.55rem;
    --gap: 0.38rem;
    display: flex;
    width: max-content;
    min-width: 100%;
    flex-direction: column;
    gap: 0.22rem;
  }
  .row {
    display: grid;
    grid-template-columns: 3.4rem repeat(var(--cols), var(--col));
    align-items: center;
    gap: var(--gap);
  }
  .gutter {
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    line-height: 1.3;
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .band-block {
    min-height: 1.3rem;
  }
  .band-row {
    min-height: 1.3rem;
  }
  .band {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.15rem;
    overflow: hidden;
    border: 1px solid var(--anim-line);
    border-radius: 4px;
    background: var(--anim-panel);
    color: var(--anim-muted);
    font-size: 0.58rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    transition: background-color 220ms ease, color 220ms ease, border-color 220ms ease;
  }
  .band[data-tone='sorted'] {
    border-color: color-mix(in oklab, var(--success) 45%, var(--anim-line));
    background: color-mix(in oklab, var(--success) 14%, var(--surface));
    color: color-mix(in oklab, var(--success) 72%, var(--fg));
  }
  .band[data-tone='active'] {
    border-color: color-mix(in oklab, var(--accent) 45%, var(--anim-line));
    background: color-mix(in oklab, var(--accent) 12%, var(--surface));
    color: var(--accent-strong);
  }
  .band[data-tone='heap'] {
    border-color: color-mix(in oklab, var(--accent) 40%, var(--anim-line));
    background: color-mix(in oklab, var(--accent) 18%, var(--surface));
    color: var(--accent-strong);
  }

  .pointer-block {
    display: flex;
    min-height: 3.5rem;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.18rem;
  }
  .pointer-row {
    min-height: 0.95rem;
  }
  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0.95rem;
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.64rem;
    line-height: 1;
  }
  .arrow {
    color: var(--accent-strong);
    font-size: 0.58rem;
    line-height: 1;
  }

  .bars-row {
    align-items: end;
    margin-top: 0.15rem;
  }
  .column {
    display: flex;
    height: 8.1rem;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 0.22rem;
  }
  .bar-value {
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1;
  }
  .bar {
    width: 100%;
    border: 1px solid var(--anim-line-strong);
    border-radius: 5px 5px 2px 2px;
    background: color-mix(in oklab, var(--accent) 14%, var(--anim-panel));
    transition: height 220ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
  }
  .column[data-state='sorted'] .bar {
    border-color: color-mix(in oklab, var(--success) 50%, var(--anim-line));
    background: color-mix(in oklab, var(--success) 20%, var(--surface));
  }
  .column[data-state='comparing'] .bar {
    border-color: var(--accent-strong);
    background: color-mix(in oklab, var(--accent) 52%, var(--surface));
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 16%, transparent);
  }
  .column[data-state='moving'] .bar {
    border-color: var(--warning);
    background: color-mix(in oklab, var(--warning) 44%, var(--surface));
  }
  .column[data-state='hole'] .bar {
    border: 1.5px dashed var(--anim-line-strong);
    background: transparent;
  }
  .column[data-state='hole'] .bar-value {
    color: var(--anim-muted);
    font-size: 0.6rem;
  }

  .marker-row {
    margin-top: 0.1rem;
  }
  .marker {
    min-height: 0.9rem;
    font-size: 0.58rem;
    font-weight: 650;
  }
  .marker[data-tone='comparing'] {
    color: var(--accent-strong);
  }
  .marker[data-tone='moving'] {
    color: var(--warning);
  }
  .marker[data-tone='hole'] {
    color: var(--anim-muted);
  }
  .marker[data-tone='sorted'] {
    color: color-mix(in oklab, var(--success) 80%, var(--fg));
  }

  .aux-block {
    margin-top: 0.35rem;
    padding-top: 0.45rem;
    border-top: 1px dashed var(--anim-line);
  }
  .aux-pointer-row {
    min-height: 0.85rem;
  }
  .aux-cell {
    display: grid;
    height: 2rem;
    place-items: center;
    border: 1px dashed var(--anim-line);
    border-radius: 5px;
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
  }
  .aux-cell[data-filled='true'] {
    border-style: solid;
    border-color: color-mix(in oklab, var(--accent) 45%, var(--anim-line));
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-weight: 650;
  }
  .aux-cell.active {
    border-color: var(--accent-strong);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 18%, transparent);
  }

  .side {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }
  .stats {
    display: flex;
    gap: 0.45rem;
  }
  .stat {
    display: flex;
    flex: 1;
    align-items: baseline;
    gap: 0.16rem;
    padding: 0.42rem 0.5rem;
    border: 1px solid var(--anim-line);
    border-radius: 8px;
    background: var(--anim-panel);
    white-space: nowrap;
  }
  .stat-label {
    color: var(--anim-muted);
    font-size: 0.6rem;
  }
  .stat b {
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
  }
  .stat-unit {
    color: var(--anim-muted);
    font-size: 0.58rem;
  }
  .complexity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.28rem;
    margin: 0.7rem 0 0;
  }
  .complexity div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.3rem;
    padding: 0.26rem 0.42rem;
    border-radius: 6px;
    background: var(--anim-panel);
    font-size: 0.6rem;
  }
  .complexity dt {
    color: var(--anim-muted);
  }
  .complexity dd {
    margin: 0;
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .complexity dd[data-stable='false'] {
    color: var(--warning);
  }
  .state-chip {
    margin: 0.6rem 0 0;
    padding: 0.34rem 0.5rem;
    border-left: 2px solid var(--accent);
    background: color-mix(in oklab, var(--accent) 6%, transparent);
    color: var(--fg-muted);
    font-size: 0.66rem;
    line-height: 1.5;
  }
  .state-chip b {
    color: var(--accent-strong);
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
  .brief {
    margin: 0.7rem 0 0;
    color: var(--anim-muted);
    font-size: 0.66rem;
    line-height: 1.7;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
    margin-top: 0.9rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--anim-line);
    color: var(--anim-muted);
    font-size: 0.64rem;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .swatch {
    width: 0.7rem;
    height: 0.7rem;
    border: 1px solid var(--anim-line-strong);
    border-radius: 3px;
    background: color-mix(in oklab, var(--accent) 14%, var(--anim-panel));
  }
  .swatch[data-tone='sorted'] {
    border-color: color-mix(in oklab, var(--success) 50%, var(--anim-line));
    background: color-mix(in oklab, var(--success) 20%, var(--surface));
  }
  .swatch[data-tone='comparing'] {
    border-color: var(--accent-strong);
    background: color-mix(in oklab, var(--accent) 52%, var(--surface));
  }
  .swatch[data-tone='moving'] {
    border-color: var(--warning);
    background: color-mix(in oklab, var(--warning) 44%, var(--surface));
  }
  .swatch[data-tone='hole'] {
    border-style: dashed;
    background: transparent;
  }

  @media (width < 48rem) {
    .stage {
      grid-template-columns: 1fr;
    }
    .side {
      display: grid;
      grid-template-columns: 1fr;
    }
    .stats {
      max-width: 20rem;
    }
    .complexity {
      max-width: 22rem;
    }
    .brief {
      max-width: 30rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar,
    .band,
    .aux-cell {
      transition: none;
    }
  }
</style>
