<script lang="ts">
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowClockwise } from '@/lib/icons.generated';
  import { createLowbitTrace, LOWBIT_LIMITS, type LowbitStep, type LowbitTrace } from '@/lib/animations/lowbit';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationField from './AnimationField.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import DataCell from './DataCell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();
  const defaults = untrack(() => ({
    value: typeof config.value === 'number' ? config.value : 12,
  }));

  let draftValue = $state(String(defaults.value));
  let trace = $state<LowbitTrace>(createLowbitTrace(defaults.value));
  let error = $state('');
  const player = createPlayback(() => trace.steps.length);
  const step = $derived<LowbitStep>(trace.steps[player.index]);
  const phase = $derived({
    start: '观察原数',
    invert: '按位取反',
    negative: '补码加一',
    and: '按位与',
    subtract: '清除最低位',
    done: '完成跳跃',
  }[step.phase]);
  const rows = $derived.by(() => {
    const all = [
      { key: 'x', label: 'x', bits: trace.bits, value: trace.value, visible: true },
      { key: 'complement', label: '~x', bits: trace.complementBits, value: (~trace.value) & 0xff, visible: step.phase !== 'start' },
      { key: 'negative', label: '-x = ~x + 1', bits: trace.negativeBits, value: (-trace.value) & 0xff, visible: ['negative', 'and', 'subtract', 'done'].includes(step.phase) },
      { key: 'lowbit', label: 'x & -x', bits: trace.lowbitBits, value: trace.lowbit, visible: ['and', 'subtract', 'done'].includes(step.phase) },
      { key: 'next', label: 'x - lowbit(x)', bits: trace.nextBits, value: trace.next, visible: ['subtract', 'done'].includes(step.phase) },
    ];
    return all.filter((row) => row.visible);
  });
  const activeRow = $derived({
    start: 'x',
    invert: 'complement',
    negative: 'negative',
    and: 'lowbit',
    subtract: 'next',
    done: 'next',
  }[step.phase]);

  function apply() {
    player.reset();
    try {
      trace = createLowbitTrace(Number(draftValue));
      player.reset();
      error = '';
    } catch (cause) {
      error = (cause as Error).message;
    }
  }

  function bitState(row: string, index: number) {
    if (index === trace.lowestBitIndex && row === activeRow) return 'current' as const;
    if (row === 'lowbit' && index === trace.lowestBitIndex && step.phase !== 'and') return 'found' as const;
    if (row === 'next' && step.phase === 'done') return 'found' as const;
    return 'idle' as const;
  }
</script>

<AnimationShell title="lowbit · 取出最低位的 1" meta="8 位二进制 · x & -x">
  {#snippet configuration()}
    <form class="inputs" onsubmit={(event) => { event.preventDefault(); apply(); }}>
      <AnimationField
        bind:value={draftValue}
        label="正整数 x"
        hint={`${LOWBIT_LIMITS.min} 到 ${LOWBIT_LIMITS.max}`}
        maxlength={3}
        invalid={Boolean(error)}
      />
      <button class="apply" type="submit"><Icon icon={iArrowClockwise} size={14} />重新演示</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/snippet}

  <div class="board-scroll">
    <div class="board" role="img" aria-label={`x 等于 ${trace.value}。${step.description}`}>
      <div class="low-marker-row" aria-hidden="true">
        <span></span><span></span>
        {#each trace.bits as _, index}<span>{index === trace.lowestBitIndex ? 'low ↓' : ''}</span>{/each}
        <span></span>
      </div>
      <div class="weights">
        <span></span><small>位权</small>
        {#each [128, 64, 32, 16, 8, 4, 2, 1] as weight}<b>{weight}</b>{/each}
        <span></span>
      </div>
      {#each rows as row (row.key)}
        <div class="bit-row" class:active={row.key === activeRow}>
          <span class="row-marker">{row.key === activeRow ? '当前' : ''}</span>
          <b class="row-label">{row.label}</b>
          {#each row.bits as bit, index}
            <DataCell value={bit} state={bitState(row.key, index)} />
          {/each}
          <span class="decimal"><small>无符号值</small>{row.value}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="legend">
    <span><i></i><b>low</b> 标出最低位的 1</span>
    <span>最右列是各行 8 位二进制的无符号值</span>
  </div>

  <StepExplanation {phase} description={step.description} tone={step.phase === 'done' ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .inputs { display: grid; grid-template-columns: minmax(0, 14rem) auto; align-items: end; justify-content: start; gap: 0.75rem; }
  .apply { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; height: 2.5rem; padding-inline: 0.85rem; border-radius: 8px; background: var(--accent-soft); color: var(--accent-strong); font-size: 0.75rem; font-weight: 600; white-space: nowrap; transition: background-color 160ms ease, transform 160ms var(--ease-out-expo); }
  .apply:hover { background: color-mix(in oklab, var(--accent) 18%, var(--surface)); }
  .apply:active { transform: translateY(1px); }
  .error { margin: 0.65rem 0 0; color: var(--danger); font-size: 0.75rem; }
  .board-scroll { overflow-x: auto; padding: 0.35rem 0.2rem 0.65rem; }
  .board { display: flex; flex-direction: column; gap: 0.5rem; width: max-content; min-width: 100%; }
  .low-marker-row, .weights, .bit-row { display: grid; grid-template-columns: 2.5rem 7.25rem repeat(8, 2.5rem) 4.5rem; gap: 0.35rem; align-items: center; }
  .low-marker-row { min-height: 1rem; color: var(--accent-strong); font-family: var(--font-mono); font-size: 0.62rem; font-weight: 700; text-align: center; white-space: nowrap; }
  .weights { min-height: 1rem; color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.6rem; text-align: center; }
  .weights small { grid-column: 2; }
  .weights b { font-weight: 400; }
  .bit-row { padding: 0.2rem; border-radius: 8px; }
  .bit-row.active { background: color-mix(in oklab, var(--accent) 5%, transparent); }
  .row-marker { color: var(--accent-strong); font-size: 0.6rem; text-align: center; }
  .row-label { overflow: hidden; color: var(--fg-muted); font-family: var(--font-mono); font-size: 0.72rem; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .bit-row.active .row-label { color: var(--accent-strong); }
  .decimal { display: flex; flex-direction: column; align-items: flex-end; color: var(--fg); font-family: var(--font-mono); font-size: 0.82rem; font-weight: 650; }
  .decimal small { color: var(--anim-muted); font-family: var(--font-sans); font-size: 0.52rem; font-weight: 400; }
  .legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem 1rem; padding-top: 0.65rem; border-top: 1px solid var(--anim-line); color: var(--anim-muted); font-size: 0.65rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .legend i { width: 0.6rem; height: 0.6rem; border: 2px solid var(--accent); border-radius: 3px; }
  .legend b { color: var(--accent-strong); font-family: var(--font-mono); font-size: 0.6rem; }
  @media (width < 40rem) {
    .inputs { grid-template-columns: minmax(0, 1fr) auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    .apply { transition: none; }
  }
</style>
