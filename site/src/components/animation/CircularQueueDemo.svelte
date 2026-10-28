<script lang="ts">
  import { untrack } from 'svelte';

  import {
    CIRCULAR_QUEUE_CAPACITY,
    CIRCULAR_QUEUE_METHOD_INFO,
    CIRCULAR_QUEUE_METHODS,
    createCircularQueueTrace,
    type CircularQueueMethod,
    type CircularQueueStep,
  } from '@/lib/animations/circular-queue';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();
  const method = untrack<CircularQueueMethod>(() => {
    const value = typeof config.method === 'string' ? config.method : 'flag';
    return (CIRCULAR_QUEUE_METHODS as readonly string[]).includes(value)
      ? (value as CircularQueueMethod)
      : 'flag';
  });

  const info = CIRCULAR_QUEUE_METHOD_INFO[method];
  const steps = createCircularQueueTrace(method);
  const player = createPlayback(() => steps.length);
  const step = $derived<CircularQueueStep>(steps[player.index]);
  const uid = $props.id();

  const SIZE = CIRCULAR_QUEUE_CAPACITY;
  const CX = 170;
  const CY = 172;
  const RING_OUT = 96;
  const RING_IN = 50;
  const round = (value: number) => Math.round(value * 10) / 10;

  function polar(radius: number, angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: round(CX + radius * Math.sin(rad)), y: round(CY - radius * Math.cos(rad)) };
  }

  /** 每个扇形的路径、值和下标文字的位置，角度 0 在正上方，顺时针增长。 */
  const sectors = Array.from({ length: SIZE }, (_, index) => {
    const each = 360 / SIZE;
    const start = 144 + each * index;
    const end = start + each;
    const outerStart = polar(RING_OUT, start);
    const outerEnd = polar(RING_OUT, end);
    const innerEnd = polar(RING_IN, end);
    const innerStart = polar(RING_IN, start);
    const middle = start + each / 2;
    return {
      index,
      d: `M${outerStart.x},${outerStart.y} A${RING_OUT},${RING_OUT} 0 0 1 ${outerEnd.x},${outerEnd.y} L${innerEnd.x},${innerEnd.y} A${RING_IN},${RING_IN} 0 0 0 ${innerStart.x},${innerStart.y} Z`,
      value: polar((RING_OUT + RING_IN) / 2, middle),
      label: polar(RING_OUT + 20, middle),
    };
  });

  const pointers = $derived.by(() => {
    const build = (index: number, offset: number) => {
      const angle = 180 + (360 / SIZE) * index + offset;
      return {
        tip: polar(RING_OUT + 6, angle),
        tail: polar(RING_OUT + 38, angle),
        label: polar(RING_OUT + 58, angle),
      };
    };
    return { front: build(step.front, -13), rear: build(step.rear, 13) };
  });

  function anchor(point: { x: number }) {
    if (point.x > CX + 18) return 'end';
    if (point.x < CX - 18) return 'start';
    return 'middle';
  }

  function sectorState(index: number) {
    if (step.activeSlot === index) return 'active';
    if (step.idleSlot === index) return 'idle';
    return step.slots[index] === null ? 'empty' : 'filled';
  }

  const verdictLabel = $derived(
    step.verdict === 'empty' ? '空队列' : step.verdict === 'full' ? '队列已满' : '队列里有元素',
  );
</script>

<AnimationShell title={`循环队列 · ${info.title}`} meta={info.meta}>
  <div class="board">
    <svg
      viewBox="0 0 340 340"
      role="img"
      aria-label={`${info.title}。第 ${player.index + 1} 步：${step.description}`}
    >
      <defs>
        <marker
          id={`${uid}-front`}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path class="head head-front" d="M0,0 L10,5 L0,10 z" />
        </marker>
        <marker
          id={`${uid}-rear`}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path class="head head-rear" d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>

      {#each sectors as sector (sector.index)}
        <path class="sector" data-state={sectorState(sector.index)} d={sector.d} />
      {/each}

      {#each sectors as sector (sector.index)}
        {#if step.slots[sector.index] !== null}
          <text class="slot-value" x={sector.value.x} y={sector.value.y + 5} text-anchor="middle">
            {step.slots[sector.index]}
          </text>
        {/if}
        <text class="slot-index" x={sector.label.x} y={sector.label.y + 4} text-anchor="middle">
          {sector.index}
        </text>
      {/each}

      <g class="pointers">
        <line
          class="pointer-line pointer-front"
          x1={pointers.front.tail.x}
          y1={pointers.front.tail.y}
          x2={pointers.front.tip.x}
          y2={pointers.front.tip.y}
          marker-end={`url(#${uid}-front)`}
        />
        <text
          class="pointer-label pointer-front"
          x={pointers.front.label.x}
          y={pointers.front.label.y + 4}
          text-anchor={anchor(pointers.front.label)}
        >front</text>

        <line
          class="pointer-line pointer-rear"
          x1={pointers.rear.tail.x}
          y1={pointers.rear.tail.y}
          x2={pointers.rear.tip.x}
          y2={pointers.rear.tip.y}
          marker-end={`url(#${uid}-rear)`}
        />
        <text
          class="pointer-label pointer-rear"
          x={pointers.rear.label.x}
          y={pointers.rear.label.y + 4}
          text-anchor={anchor(pointers.rear.label)}
        >rear</text>
      </g>
    </svg>

    <div class="state">
      <div class="chips">
        <span class="chip"><b>front</b><i>{step.front}</i></span>
        <span class="chip"><b>rear</b><i>{step.rear}</i></span>
        {#if method === 'flag'}
          <span class="chip"><b>flag</b><i>{step.flag}</i></span>
        {:else if method === 'count'}
          <span class="chip"><b>count</b><i>{step.count}</i></span>
        {:else if step.idleSlot !== null}
          <span class="chip"><b>留空</b><i>{step.idleSlot} 号格</i></span>
        {/if}
      </div>
      <span class="verdict" data-verdict={step.verdict}>{verdictLabel}</span>
      <p class="formula">{step.formula}</p>
    </div>
  </div>

  <div class="legend">
    <span><i class="dot filled"></i>已占用，格子点亮</span>
    <span><i class="dot active"></i>本步刚写入或刚取走</span>
    {#if method === 'sacrifice'}
      <span><i class="dot idle"></i>永远留空的那一格</span>
    {/if}
  </div>

  <StepExplanation
    phase={step.phase}
    description={step.description}
    tone={step.verdict === 'full' ? 'warning' : 'accent'}
  />

  {#snippet controls()}
    <AnimationControls {player} total={steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .board {
    display: grid;
    grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
    align-items: center;
    gap: 1.25rem;
  }
  svg {
    display: block;
    width: 100%;
    max-width: 340px;
    height: auto;
    margin-inline: auto;
    overflow: visible;
  }
  .sector {
    fill: none;
    stroke: var(--anim-line-strong, var(--line-strong));
    stroke-width: 1.4;
    transition: fill 260ms ease, stroke 260ms ease, stroke-width 260ms ease;
  }
  .sector[data-state='filled'] {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }
  .sector[data-state='active'] {
    fill: color-mix(in oklab, var(--accent) 28%, var(--surface));
    stroke: var(--accent-strong);
    stroke-width: 2.4;
  }
  .sector[data-state='idle'] {
    fill: none;
    stroke: var(--line-strong);
    stroke-dasharray: 4 4;
  }
  .slot-value {
    fill: var(--accent-strong);
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 650;
  }
  .slot-index {
    fill: var(--anim-muted, var(--fg-muted));
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .pointer-line {
    stroke-width: 1.7;
    fill: none;
  }
  .pointer-line.pointer-front { stroke: var(--accent); }
  .pointer-line.pointer-rear { stroke: var(--accent-strong); }
  .pointer-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }
  .pointer-label.pointer-front { fill: var(--accent); }
  .pointer-label.pointer-rear { fill: var(--accent-strong); }
  :global(.head-front) { fill: var(--accent); }
  :global(.head-rear) { fill: var(--accent-strong); }

  .state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.28rem 0.6rem;
    border: 1px solid var(--anim-line, var(--line));
    border-radius: 7px;
    background: var(--anim-panel, var(--surface-2));
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .chip b { color: var(--anim-muted, var(--fg-muted)); font-weight: 500; }
  .chip i { color: var(--fg); font-style: normal; font-weight: 650; }
  .verdict {
    padding: 0.26rem 0.7rem;
    border-radius: 999px;
    border: 1px solid currentcolor;
    font-size: 0.72rem;
    font-weight: 650;
  }
  .verdict[data-verdict='empty'] { color: var(--accent-strong); }
  .verdict[data-verdict='full'] { color: var(--warning); }
  .verdict[data-verdict='normal'] { color: var(--fg-muted); }
  .formula {
    flex-basis: 100%;
    margin: 0;
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.7;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.1rem;
    margin-top: 1.1rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--anim-line);
    color: var(--anim-muted, var(--fg-muted));
    font-size: 0.68rem;
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
  }
  .dot.filled { background: var(--accent-soft); border-color: var(--accent); }
  .dot.active { background: color-mix(in oklab, var(--accent) 28%, var(--surface)); border-color: var(--accent-strong); }
  .dot.idle { border-style: dashed; }

  @media (width < 46rem) {
    .board { grid-template-columns: 1fr; }
    .state { justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sector { transition: none; }
  }
</style>
