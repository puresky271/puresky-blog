<script lang="ts">
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowClockwise,
    iCaretLeft,
    iCaretRight,
    iPauseFill,
    iPlayFill,
  } from '@/lib/icons.generated';
  import { createKmpTrace, KMP_LIMITS, type KmpStep, type KmpTrace } from '@/lib/animations/kmp';

  import type { AnimationProps } from './mount';

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
  let index = $state(0);
  let playing = $state(false);
  let speed = $state(1);
  let error = $state('');

  const step = $derived<KmpStep>(trace.steps[index]);
  const columns = $derived(
    Math.max(trace.text.length, ...trace.steps.map((item) => item.offset + trace.pattern.length)) + 1,
  );
  const atEnd = $derived(index === trace.steps.length - 1);

  $effect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (index >= trace.steps.length - 1) playing = false;
      else index++;
    }, 900 / speed);
    return () => window.clearInterval(timer);
  });

  function togglePlay() {
    if (atEnd) index = 0;
    playing = !playing;
  }

  function goTo(value: number) {
    playing = false;
    index = Math.max(0, Math.min(trace.steps.length - 1, value));
  }

  function apply() {
    playing = false;
    try {
      trace = createKmpTrace(draftText, draftPattern);
      index = 0;
      error = '';
    } catch (cause) {
      error = (cause as Error).message;
    }
  }

  function reset() {
    goTo(0);
  }

  function textState(cell: number): string {
    if (step.foundStart !== undefined && cell >= step.foundStart && cell < step.foundStart + trace.pattern.length) return 'found';
    if (step.phase === 'compare' && cell === step.i) return step.equal ? 'current equal' : 'current mismatch';
    if (cell >= step.offset && cell < step.offset + step.j) return 'matched';
    return '';
  }

  function patternState(cell: number): string {
    if (step.phase === 'found') return 'found';
    if (step.phase === 'compare' && cell === step.j) return step.equal ? 'current equal' : 'current mismatch';
    if (cell < step.j) return 'matched';
    return '';
  }
</script>

<section class="kmp-demo" aria-label="KMP 字符串匹配交互动画">
  <header class="demo-head">
    <div>
      <span class="eyebrow">动画演示</span>
      <h3>KMP 字符串匹配</h3>
    </div>
    <span class="complexity">O(n + m)</span>
  </header>

  <form
    class="inputs"
    onsubmit={(event) => {
      event.preventDefault();
      apply();
    }}
  >
    <label>
      <span>文本串 text</span>
      <input bind:value={draftText} maxlength={KMP_LIMITS.text} spellcheck="false" autocomplete="off" />
    </label>
    <label>
      <span>模式串 pattern</span>
      <input bind:value={draftPattern} maxlength={KMP_LIMITS.pattern} spellcheck="false" autocomplete="off" />
    </label>
    <button class="apply" type="submit">重新演示</button>
  </form>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <div class="stage">
    <div class="board-scroll">
      <div class="board" style="--columns: {columns}">
        <div class="row">
          {#each trace.text as _, cell}<span class="index" style:grid-column={cell + 1}>{cell}</span>{/each}
        </div>
        <div class="row chars text-row">
          {#each trace.text as char, cell}
            <span class={'cell ' + textState(cell)} style:grid-column={cell + 1}>
              {char}
              {#if step.phase === 'compare' && step.i === cell}<i class="pointer">i</i>{/if}
            </span>
          {/each}
        </div>
        <div class="row chars pattern-row">
          {#each trace.pattern as char, cell}
            <span class={'cell ' + patternState(cell)} style:grid-column={step.offset + cell + 1}>
              {char}
              {#if step.phase === 'compare' && step.j === cell}<i class="pointer">j</i>{/if}
            </span>
          {/each}
        </div>
      </div>
    </div>

    <div class="labels" aria-hidden="true"><span>文本串</span><span>模式串</span></div>
    <div class="legend">
      <span><i class="matched"></i>已匹配</span>
      <span><i class="current"></i>当前比较</span>
      <span><i class="mismatch"></i>失配</span>
    </div>
  </div>

  <div class="prefix">
    <span class="prefix-title">前缀表 lps</span>
    <div class="prefix-values">
      {#each trace.lps as value, cell}
        <span class:active={cell === step.j}><small>{trace.pattern[cell]}</small>{value}</span>
      {/each}
    </div>
  </div>

  <div class="explanation" aria-live="polite" aria-atomic="true">
    <span class="phase">{step.phase === 'fallback' ? '关键回退' : step.phase === 'found' ? '匹配成功' : step.phase === 'not-found' ? '匹配结束' : `步骤 ${index + 1}`}</span>
    <p>{step.description}</p>
  </div>

  <div class="controls">
    <button type="button" class="reset" onclick={reset} aria-label="回到第一步" title="重置"><Icon icon={iArrowClockwise} size={17} /></button>
    <button type="button" onclick={() => goTo(index - 1)} disabled={index === 0} aria-label="上一步"><Icon icon={iCaretLeft} size={19} /></button>
    <button type="button" class="play" onclick={togglePlay} aria-label={playing ? '暂停' : atEnd ? '重新播放' : '播放'}>
      <Icon icon={playing ? iPauseFill : iPlayFill} size={17} />
      <span>{playing ? '暂停' : atEnd ? '重播' : '播放'}</span>
    </button>
    <button type="button" onclick={() => goTo(index + 1)} disabled={atEnd} aria-label="下一步"><Icon icon={iCaretRight} size={19} /></button>
    <span class="counter">{index + 1} / {trace.steps.length}</span>
    <label class="speed">速度
      <select bind:value={speed} aria-label="播放速度">
        <option value={0.5}>0.5×</option>
        <option value={1}>1×</option>
        <option value={1.5}>1.5×</option>
        <option value={2}>2×</option>
      </select>
    </label>
  </div>
  <input
    class="progress"
    type="range"
    min="0"
    max={trace.steps.length - 1}
    value={index}
    oninput={(event) => goTo(Number(event.currentTarget.value))}
    aria-label="动画步骤"
    aria-valuetext={`第 ${index + 1} 步，共 ${trace.steps.length} 步`}
  />
</section>

<style>
  .kmp-demo {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    background: var(--surface);
    color: var(--fg);
    font-size: 0.875rem;
    line-height: 1.6;
  }
  .demo-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.15rem;
    border-bottom: 1px solid var(--line);
    background: var(--surface-2);
  }
  .eyebrow {
    display: block;
    font-size: 0.6875rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    color: var(--accent);
  }
  h3 {
    margin: 0.1rem 0 0;
    font-size: 1rem;
    line-height: 1.4;
  }
  .complexity {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  .inputs {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.75fr) auto;
    align-items: end;
    gap: 0.65rem;
    padding: 1rem 1.15rem 0;
  }
  .inputs label > span {
    display: block;
    margin-bottom: 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--fg-muted);
  }
  input:not(.progress), select {
    min-height: 2.25rem;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
  }
  .inputs input {
    width: 100%;
    padding: 0.4rem 0.65rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  .inputs input:focus, select:focus {
    border-color: var(--accent);
    outline: 2px solid var(--accent-soft);
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    min-height: 2.25rem;
    border-radius: 8px;
    color: var(--fg-muted);
    transition: color 160ms ease, background-color 160ms ease, opacity 160ms ease;
  }
  button:hover:not(:disabled) {
    background: var(--surface-2);
    color: var(--fg);
  }
  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .apply {
    padding-inline: 0.85rem;
    background: var(--accent-soft);
    color: var(--accent-strong);
    font-size: 0.78rem;
    white-space: nowrap;
  }
  .error {
    margin: 0.6rem 1.15rem 0;
    color: var(--danger);
    font-size: 0.75rem;
  }
  .stage {
    position: relative;
    margin: 1rem 1.15rem 0;
    padding: 0.8rem;
    border-radius: 12px;
    background: var(--bg);
  }
  .board-scroll {
    overflow-x: auto;
    padding: 0.2rem 0 1rem 3.25rem;
  }
  .board {
    display: grid;
    gap: 0.55rem 0;
    width: max-content;
    min-width: calc(100% - 3.25rem);
  }
  .row {
    display: grid;
    grid-template-columns: repeat(var(--columns), 2.25rem);
    gap: 0.25rem;
    min-height: 1rem;
  }
  .index {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    color: var(--fg-subtle);
  }
  .cell {
    position: relative;
    display: grid;
    place-items: center;
    height: 2.25rem;
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-weight: 600;
    transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
  }
  .cell.matched {
    border-color: color-mix(in oklab, var(--success) 40%, var(--line));
    background: color-mix(in oklab, var(--success) 12%, var(--surface));
  }
  .cell.current {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }
  .cell.mismatch {
    border-color: var(--danger);
    background: color-mix(in oklab, var(--danger) 10%, var(--surface));
  }
  .cell.found {
    border-color: var(--success);
    background: color-mix(in oklab, var(--success) 17%, var(--surface));
  }
  .pointer {
    position: absolute;
    top: -1.35rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-style: normal;
    color: var(--accent);
  }
  .pattern-row .pointer {
    top: auto;
    bottom: -1.35rem;
  }
  .labels {
    position: absolute;
    left: 0.8rem;
    top: 2rem;
    display: grid;
    grid-template-rows: 2.25rem 2.25rem;
    gap: 0.55rem;
    font-size: 0.65rem;
    color: var(--fg-subtle);
  }
  .labels span {
    display: flex;
    align-items: center;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-top: 0.75rem;
    padding-left: 3.25rem;
    font-size: 0.65rem;
    color: var(--fg-subtle);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.25rem; }
  .legend i { width: 0.55rem; height: 0.55rem; border-radius: 2px; background: var(--line-strong); }
  .legend i.matched { background: var(--success); }
  .legend i.current { background: var(--accent); }
  .legend i.mismatch { background: var(--danger); }
  .prefix {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 0.85rem 1.15rem 0;
  }
  .prefix-title {
    flex-shrink: 0;
    font-size: 0.7rem;
    color: var(--fg-muted);
  }
  .prefix-values {
    display: flex;
    gap: 0.3rem;
    overflow-x: auto;
    padding: 0.15rem;
  }
  .prefix-values > span {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 1.8rem;
    padding: 0.15rem;
    border-radius: 5px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
  .prefix-values > span.active { background: var(--accent-soft); color: var(--accent-strong); }
  .prefix-values small { font-size: 0.625rem; color: var(--fg-subtle); }
  .explanation {
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    min-height: 3.6rem;
    margin: 0.85rem 1.15rem 0;
    padding: 0.65rem 0.75rem;
    border-left: 2px solid var(--accent);
    background: color-mix(in oklab, var(--accent) 5%, transparent);
  }
  .phase {
    flex-shrink: 0;
    font-size: 0.68rem;
    font-weight: 650;
    color: var(--accent-strong);
  }
  .explanation p { margin: 0; font-size: 0.75rem; text-align: left; }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.85rem 1.15rem 0.35rem;
  }
  .play {
    gap: 0.35rem;
    padding-inline: 0.85rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-fg);
  }
  .play:hover:not(:disabled) { background: var(--accent-strong); color: var(--accent-fg); }
  .counter {
    margin-left: 0.35rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-subtle);
    font-variant-numeric: tabular-nums;
  }
  .speed {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: auto;
    font-size: 0.65rem;
    color: var(--fg-subtle);
  }
  select { padding: 0.2rem; font-size: 0.7rem; }
  .progress {
    display: block;
    width: calc(100% - 2.3rem);
    height: 1.25rem;
    margin: 0 1.15rem 0.65rem;
    accent-color: var(--accent);
    cursor: pointer;
  }
  @media (width < 40rem) {
    .inputs { grid-template-columns: 1fr 1fr; }
    .apply { grid-column: 1 / -1; }
    .stage, .prefix, .explanation { margin-inline: 0.75rem; }
    .inputs, .demo-head { padding-inline: 0.85rem; }
    .controls { padding-inline: 0.75rem; }
    .counter { display: none; }
    .explanation { align-items: flex-start; flex-direction: column; gap: 0.2rem; }
    .row { grid-template-columns: repeat(var(--columns), 2rem); }
    .cell { height: 2rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cell, button { transition: none; }
  }
</style>
