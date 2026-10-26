<script lang="ts">
  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowClockwise,
    iCaretLeft,
    iCaretRight,
    iPauseFill,
    iPlayFill,
  } from '@/lib/icons.generated';

  import type { Playback } from './playback.svelte';
  import SelectMenu from './SelectMenu.svelte';
  import StepSlider from './StepSlider.svelte';

  let { player, total }: { player: Playback; total: number } = $props();
  const speeds = [
    { value: '0.5', label: '0.5×' },
    { value: '1', label: '1×' },
    { value: '1.5', label: '1.5×' },
    { value: '2', label: '2×' },
  ];
</script>

<div class="animation-controls">
  <div class="buttons" role="group" aria-label="动画播放控制">
    <button type="button" class="icon-control reset" onclick={player.reset} aria-label="回到第一步" title="重置">
      <Icon icon={iArrowClockwise} size={16} />
    </button>
    <button type="button" class="icon-control" onclick={player.previous} disabled={player.index === 0} aria-label="上一步">
      <Icon icon={iCaretLeft} size={18} />
    </button>
    <button type="button" class="play" onclick={player.toggle} aria-label={player.playing ? '暂停' : player.atEnd ? '重新播放' : '播放'}>
      <Icon icon={player.playing ? iPauseFill : iPlayFill} size={15} />
      <span>{player.playing ? '暂停' : player.atEnd ? '重播' : '播放'}</span>
    </button>
    <button type="button" class="icon-control" onclick={player.next} disabled={player.atEnd} aria-label="下一步">
      <Icon icon={iCaretRight} size={18} />
    </button>
  </div>

  <span class="counter"><b>{String(player.index + 1).padStart(2, '0')}</b><i>/</i>{String(total).padStart(2, '0')}</span>
  <div class="speed"><span>速度</span><SelectMenu options={speeds} value={String(player.speed)} label="播放速度" onchange={(value) => (player.speed = Number(value))} /></div>
  <div class="timeline"><StepSlider value={player.index} max={total - 1} onchange={player.goTo} /></div>
</div>

<style>
  .animation-controls { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.35rem 0.85rem; }
  .buttons { display: flex; align-items: center; gap: 0.15rem; }
  button { display: inline-flex; align-items: center; justify-content: center; height: 2.35rem; border-radius: 999px; transition: color 160ms ease, background-color 160ms ease, transform 160ms var(--ease-out-expo), opacity 160ms ease; }
  button:active:not(:disabled) { transform: scale(0.94); }
  button:disabled { opacity: 0.28; cursor: not-allowed; }
  .icon-control { width: 2.2rem; color: var(--fg-muted); }
  .icon-control:hover:not(:disabled) { background: var(--surface-2); color: var(--fg); }
  .reset { margin-right: 0.25rem; }
  .play { gap: 0.4rem; min-width: 5.25rem; margin-inline: 0.2rem; padding-inline: 0.95rem; background: var(--accent); color: var(--accent-fg); font-size: 0.78rem; font-weight: 650; }
  .play:hover { background: var(--accent-strong); }
  .counter { justify-self: start; display: flex; align-items: baseline; gap: 0.45rem; margin-left: 0.4rem; color: var(--anim-muted, var(--fg-muted)); font-family: var(--font-mono); font-size: 0.7rem; font-variant-numeric: tabular-nums; }
  .counter b { color: var(--fg); font-size: 0.8rem; font-weight: 600; }
  .counter i { color: var(--anim-line-strong, var(--line-strong)); font-style: normal; }
  .speed { display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: var(--anim-muted, var(--fg-muted)); }
  .timeline { grid-column: 1 / -1; }
  @media (width < 30rem) {
    .animation-controls { grid-template-columns: 1fr auto; }
    .counter { display: none; }
    .speed > span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
