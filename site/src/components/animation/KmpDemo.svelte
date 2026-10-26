<script lang="ts">
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowClockwise } from '@/lib/icons.generated';
  import { createKmpTrace, KMP_LIMITS, type KmpStep, type KmpTrace } from '@/lib/animations/kmp';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationField from './AnimationField.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import DataCell from './DataCell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  const { config }: AnimationProps = $props();

  function initialValues(input: AnimationProps['config']) {
    return {
      text: typeof input.text === 'string' ? input.text : 'aabaabaafa',
      pattern: typeof input.pattern === 'string' ? input.pattern : 'aabaaf',
    };
  }
  const defaults = untrack(() => initialValues(config));

  let draftText = $state(defaults.text);
  let draftPattern = $state(defaults.pattern);
  let trace = $state<KmpTrace>(createKmpTrace(defaults.text, defaults.pattern));
  let error = $state('');
  const player = createPlayback(() => trace.steps.length);

  const step = $derived<KmpStep>(trace.steps[player.index]);
  const columns = $derived(
    Math.max(trace.text.length, ...trace.steps.map((item) => item.offset + trace.pattern.length)) + 1,
  );
  const phase = $derived({
    fallback: '关键回退',
    found: '匹配成功',
    'not-found': '匹配结束',
    compare: step.equal ? '字符相等' : '发现失配',
    advance: '移动文本指针',
    start: '开始比对',
  }[step.phase]);
  const tone = $derived(step.phase === 'found' ? 'success' : step.phase === 'fallback' ? 'warning' : step.phase === 'compare' && !step.equal ? 'danger' : 'accent');

  function apply() {
    player.reset();
    try {
      trace = createKmpTrace(draftText, draftPattern);
      player.reset();
      error = '';
    } catch (cause) {
      error = (cause as Error).message;
    }
  }

  function textState(cell: number) {
    if (step.foundStart !== undefined && cell >= step.foundStart && cell < step.foundStart + trace.pattern.length) return 'found' as const;
    if (step.phase === 'compare' && cell === step.i) return step.equal ? 'current' as const : 'mismatch' as const;
    if (cell >= step.offset && cell < step.offset + step.j) return 'matched' as const;
    return 'idle' as const;
  }

  function patternState(cell: number) {
    if (step.phase === 'found') return 'found' as const;
    if (step.phase === 'compare' && cell === step.j) return step.equal ? 'current' as const : 'mismatch' as const;
    if (cell < step.j) return 'matched' as const;
    return 'idle' as const;
  }
</script>

<AnimationShell title="KMP 字符串匹配" meta="O(n + m)">
  {#snippet configuration()}
    <form class="inputs" onsubmit={(event) => { event.preventDefault(); apply(); }}>
      <AnimationField bind:value={draftText} label="文本串 text" hint={`最多 ${KMP_LIMITS.text} 字符`} maxlength={KMP_LIMITS.text} invalid={Boolean(error)} />
      <AnimationField bind:value={draftPattern} label="模式串 pattern" hint={`最多 ${KMP_LIMITS.pattern} 字符`} maxlength={KMP_LIMITS.pattern} invalid={Boolean(error)} />
      <button class="apply" type="submit"><Icon icon={iArrowClockwise} size={14} />重新演示</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/snippet}

  <div class="stage">
    <div class="stage-body">
      <div class="row-labels" aria-hidden="true"><span>文本串</span><span>模式串</span></div>
      <div class="board-scroll">
        <div class="board" style="--columns: {columns}; --offset: {step.offset}" role="img" aria-label={step.description}>
          <div class="row indices">
            {#each trace.text as _, cell}<span style:grid-column={cell + 1}>{cell}</span>{/each}
          </div>
          <div class="row">
            {#each trace.text as char, cell}
              <span class="cell-slot" style:grid-column={cell + 1}>
                <DataCell value={char} state={textState(cell)} pointer={step.phase === 'compare' && step.i === cell ? 'i' : undefined} />
              </span>
            {/each}
          </div>
          <div class="pattern-row">
            <div class="pattern-track">
              {#each trace.pattern as char, cell}
                <DataCell
                  value={char}
                  state={patternState(cell)}
                  pointer={step.phase === 'compare' && step.j === cell ? 'j' : undefined}
                  pointerPosition="bottom"
                />
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="legend">
      <span><i data-state="matched"></i>已匹配</span>
      <span><i data-state="current"></i>当前比较</span>
      <span><i data-state="mismatch"></i>失配</span>
      <span class="stage-hint">观察 i 不动，模式串如何滑动</span>
    </div>
  </div>

  <div class="prefix">
    <span class="prefix-title"><b>前缀表</b><small>lps</small></span>
    <div class="prefix-values">
      {#each trace.lps as value, cell}
        <span class="prefix-item"><small>{trace.pattern[cell]}</small><DataCell {value} small state={cell === step.j ? 'current' : 'idle'} /></span>
      {/each}
    </div>
  </div>

  <StepExplanation {phase} description={step.description} {tone} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .inputs { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) auto; align-items: end; gap: 0.75rem; }
  .apply {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 2.5rem;
    padding-inline: 0.85rem;
    border-radius: 8px;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    transition: background-color 160ms ease, transform 160ms var(--ease-out-expo);
  }
  .apply:hover { background: color-mix(in oklab, var(--accent) 18%, var(--surface)); }
  .apply:active { transform: translateY(1px); }
  .error { margin: 0.65rem 0 0; color: var(--danger); font-size: 0.75rem; }
  .stage { --cell-size: 2.65rem; padding: 0.55rem 0 0.85rem; }
  .stage-body { display: grid; grid-template-columns: 3.25rem minmax(0, 1fr); gap: 0.65rem; }
  .row-labels { display: grid; grid-template-rows: 1rem var(--cell-size) var(--cell-size); gap: 0.75rem 0; padding-top: 0.1rem; color: var(--anim-muted); font-size: 0.7rem; }
  .row-labels span { display: flex; align-items: center; }
  .row-labels span:first-child { grid-row: 2; }
  .row-labels span:last-child { grid-row: 3; }
  .board-scroll { overflow-x: auto; padding: 0.35rem 0.2rem 1.25rem; }
  .board { display: grid; gap: 0.75rem 0; width: max-content; min-width: 100%; }
  .row { display: grid; grid-template-columns: repeat(var(--columns), var(--cell-size)); gap: 0.3rem; min-height: var(--cell-size); }
  .indices { min-height: 1rem; color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.64rem; text-align: center; }
  .cell-slot { display: block; width: var(--cell-size); }
  .pattern-row { position: relative; height: var(--cell-size); }
  .pattern-track {
    position: absolute;
    left: 0;
    display: flex;
    gap: 0.3rem;
    transform: translateX(calc(var(--offset) * (var(--cell-size) + 0.3rem)));
    transition: transform 360ms var(--ease-out-expo);
  }
  .legend { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.65rem; color: var(--anim-muted); font-size: 0.68rem; }
  .legend > span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .legend i { width: 0.55rem; height: 0.55rem; border-radius: 2px; }
  .legend i[data-state='matched'] { background: var(--success); }
  .legend i[data-state='current'] { background: var(--accent); }
  .legend i[data-state='mismatch'] { background: var(--danger); }
  .legend .stage-hint { margin-left: auto; }
  .prefix { display: flex; align-items: center; gap: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--anim-line); }
  .prefix-title { display: flex; flex-direction: column; flex-shrink: 0; min-width: 3.25rem; color: var(--fg-muted); font-size: 0.7rem; }
  .prefix-title b { font-weight: 600; }
  .prefix-title small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; }
  .prefix-values { display: flex; gap: 0.3rem; overflow-x: auto; padding: 0.15rem; }
  .prefix-item { display: flex; flex-direction: column; align-items: center; }
  .prefix-item > small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; }
  @media (width < 40rem) {
    .inputs { grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .apply { grid-column: 1 / -1; }
    .stage { --cell-size: 2.35rem; }
    .stage-body { grid-template-columns: 2.75rem minmax(0, 1fr); gap: 0.35rem; }
    .legend .stage-hint { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pattern-track, .apply { transition: none; }
  }
</style>
