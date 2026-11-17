<script lang="ts">
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowClockwise } from '@/lib/icons.generated';
  import { createRpnTrace, RPN_LIMITS, type RpnTrace } from '@/lib/animations/rpn-eval';

  import AnimationControls from './AnimationControls.svelte';
  import AnimationField from './AnimationField.svelte';
  import AnimationShell from './AnimationShell.svelte';
  import DataCell from './DataCell.svelte';
  import StepExplanation from './StepExplanation.svelte';
  import type { AnimationProps } from './mount';
  import { createPlayback } from './playback.svelte';

  let { config }: AnimationProps = $props();
  const DEFAULT_TOKENS = '3 4 2 * +';
  const defaults = untrack(() => ({
    tokens: typeof config.tokens === 'string' ? config.tokens : DEFAULT_TOKENS,
  }));

  let draft = $state(defaults.tokens);
  let trace = $state<RpnTrace>(createRpnTrace(defaults.tokens));
  let error = $state('');

  const player = createPlayback(() => trace.steps.length);
  const step = $derived(trace.steps[player.index]);
  const phase = $derived({
    start: '准备',
    operand: '读数字',
    operator: '算一步',
    done: '完成',
  }[step.phase]);
  const freshTop = $derived(step.phase !== 'start');

  function tokenState(index: number) {
    if (index === step.tokenIndex) return 'current' as const;
    if (index < step.processed) return 'matched' as const;
    return 'idle' as const;
  }

  function apply() {
    try {
      const next = createRpnTrace(draft);
      trace = next;
      player.reset();
      error = '';
    } catch (cause) {
      error = (cause as Error).message;
    }
  }
</script>

<AnimationShell title="逆波兰表达式求值" meta={`${trace.tokens.length} 个元素 · 从左向右`}>
  {#snippet configuration()}
    <form class="inputs" onsubmit={(event) => { event.preventDefault(); apply(); }}>
      <AnimationField
        bind:value={draft}
        label="表达式"
        hint="整数与 + - * /，最多 24 个"
        maxlength={RPN_LIMITS.maxInputLength}
        invalid={Boolean(error)}
      />
      <button class="apply" type="submit"><Icon icon={iArrowClockwise} size={14} />重新演示</button>
    </form>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  {/snippet}

  <div class="tokens" aria-label="逆波兰表达式读取进度">
    {#each trace.tokens as token, index}
      <DataCell value={token} state={tokenState(index)} />
    {/each}
  </div>

  <div class="stage">
    <div class="stack-panel">
      <div class="stack">
        <div class="stack-body">
          <span class="stack-mark top">栈顶</span>
          {#each [...step.stack].reverse() as value, index}
            <div class="cell" class:top={index === 0 && freshTop}>
              <b>{value}</b>
            </div>
          {/each}
          {#if step.stack.length === 0}<p class="stack-empty">栈为空</p>{/if}
        </div>
        <span class="stack-mark bottom">栈底</span>
      </div>
    </div>

    <aside class="side">
      <section>
        <div class="panel-head"><span>当前动作</span><small>{step.phase === 'operator' ? '先右后左' : ''}</small></div>
        {#if step.phase === 'start'}
          <p class="empty-text">准备从左向右读取表达式。</p>
        {:else if step.phase === 'operand'}
          <div class="op-row"><span>压入</span><b>{step.stack.at(-1)}</b></div>
        {:else if step.phase === 'operator'}
          <div class="op-row"><span>弹出右操作数</span><b>{step.right}</b></div>
          <div class="op-row"><span>弹出左操作数</span><b>{step.left}</b></div>
          <div class="formula">{step.left} {step.operator} {step.right} = {step.result}</div>
        {:else}
          <div class="formula">结果 = {step.result}</div>
        {/if}
      </section>
    </aside>
  </div>

  <StepExplanation {phase} description={step.description} tone={step.phase === 'done' ? 'success' : 'accent'} />

  {#snippet controls()}
    <AnimationControls {player} total={trace.steps.length} />
  {/snippet}
</AnimationShell>

<style>
  .inputs { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 0.75rem; }
  .apply { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; height: 2.5rem; padding-inline: 0.85rem; border-radius: 8px; background: var(--accent-soft); color: var(--accent-strong); font-size: 0.75rem; font-weight: 600; white-space: nowrap; transition: background-color 160ms ease, transform 160ms var(--ease-out-expo); }
  .apply:hover { background: color-mix(in oklab, var(--accent) 18%, var(--surface)); }
  .apply:active { transform: translateY(1px); }
  .error { margin: 0.65rem 0 0; color: var(--danger); font-size: 0.75rem; }
  .tokens { display: flex; flex-wrap: wrap; gap: 0.3rem; overflow-x: auto; padding: 0.2rem 0.2rem 1rem; border-bottom: 1px solid var(--anim-line); }
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) 15rem; gap: 1.25rem; margin-top: 0.75rem; }
  .stack-panel { display: flex; justify-content: center; min-width: 0; }
  /* 栈贴着底部长，所以整列底对齐；栈体自身的下边框就是栈底。 */
  .stack { display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; width: 7.5rem; min-height: 10.5rem; }
  .stack-body { display: flex; flex-direction: column; justify-content: flex-end; min-height: 8rem; border-bottom: 2px solid var(--anim-line-strong); }
  .stack-mark { padding: 0.32rem 0; color: var(--anim-muted); font-size: 0.68rem; text-align: center; }
  .stack-mark.top { color: var(--accent-strong); }
  .cell { display: grid; place-items: center; height: 2.6rem; border: 1px solid var(--anim-line); border-bottom: 0; background: var(--anim-inset); transition: background-color 180ms ease, border-color 180ms ease; }
  .cell:first-of-type { border-top-left-radius: 9px; border-top-right-radius: 9px; }
  .cell b { color: var(--fg); font-family: var(--font-mono); font-size: 1.05rem; font-weight: 600; }
  .cell.top { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 22%, var(--surface)); }
  .cell.top b { color: var(--accent-strong); }
  .stack-empty { margin: 0; padding: 0 0 0.85rem; color: var(--anim-muted); font-size: 0.72rem; text-align: center; }
  .empty-text { margin: 0; padding: 0.2rem 0 0; color: var(--anim-muted); font-size: 0.72rem; }
  .side { min-width: 0; padding-left: 1.1rem; border-left: 1px solid var(--anim-line); }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; color: var(--fg-muted); font-size: 0.74rem; font-weight: 650; }
  .panel-head small { color: var(--anim-muted); font-family: var(--font-mono); font-size: 0.62rem; font-weight: 400; }
  .op-row { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.45rem 0; border-bottom: 1px dashed var(--anim-line); color: var(--anim-muted); font-size: 0.72rem; }
  .op-row b { color: var(--fg); font-family: var(--font-mono); font-size: 0.95rem; font-weight: 600; }
  .formula { margin-top: 0.6rem; padding: 0.55rem 0.6rem; border: 1px solid var(--accent); border-radius: 8px; background: color-mix(in oklab, var(--accent) 12%, var(--surface)); color: var(--accent-strong); font-family: var(--font-mono); font-size: 0.88rem; font-weight: 600; text-align: center; }
  @media (width < 40rem) {
    .stage { grid-template-columns: 1fr; }
    .side { padding: 0.9rem 0 0; border-top: 1px solid var(--anim-line); border-left: 0; }
  }
  @media (width < 27rem) {
    .inputs { grid-template-columns: 1fr; }
    .apply { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .apply, .cell { transition: none; }
  }
</style>
