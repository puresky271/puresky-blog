<script lang="ts">
  /**
   * Controls.svelte — 播放模式 / 上一首 / 播放暂停 / 下一首。
   * 浮动面板和首页卡片共用，保证两处的按钮行为和顺序一致。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import {
    iPauseFill,
    iPlayFill,
    iRepeat,
    iRepeatOnce,
    iShuffle,
    iSkipBackFill,
    iSkipForwardFill,
  } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';

  import type { Snippet } from 'svelte';

  let { size = 'md', children }: { size?: 'sm' | 'md'; children?: Snippet } = $props();

  const modeMeta = {
    loop: { icon: iRepeat, label: '列表循环' },
    one: { icon: iRepeatOnce, label: '单曲循环' },
    shuffle: { icon: iShuffle, label: '随机播放' },
  } as const;

  const mode = $derived(modeMeta[player.mode]);
</script>

<div class="controls {size}">
  <button
    type="button"
    class="icon-btn mode"
    class:active={player.mode !== 'loop'}
    onclick={() => player.cycleMode()}
    aria-label={`播放模式：${mode.label}`}
    title={mode.label}
  >
    <Icon icon={mode.icon} size={size === 'sm' ? 16 : 18} />
  </button>
  <button type="button" class="icon-btn" onclick={() => player.prev()} aria-label="上一首">
    <Icon icon={iSkipBackFill} size={size === 'sm' ? 18 : 20} />
  </button>
  <button
    type="button"
    class="play"
    class:buffering={player.buffering && player.playing}
    onclick={() => player.toggle()}
    aria-label={player.playing ? '暂停' : '播放'}
  >
    <Icon icon={player.playing ? iPauseFill : iPlayFill} size={size === 'sm' ? 18 : 22} />
  </button>
  <button type="button" class="icon-btn" onclick={() => player.next()} aria-label="下一首">
    <Icon icon={iSkipForwardFill} size={size === 'sm' ? 18 : 20} />
  </button>
  {@render children?.()}
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem;
  }
  .icon-btn {
    color: var(--fg-muted);
  }
  .mode.active {
    color: var(--accent);
  }
  .play {
    position: relative;
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-fg);
    box-shadow: 0 8px 20px -10px var(--accent);
    transition:
      transform 200ms var(--ease-spring),
      background-color 160ms ease;
  }
  .sm .play {
    width: 2.5rem;
    height: 2.5rem;
  }
  .play:hover {
    background: var(--accent-strong);
    transform: scale(1.04);
  }
  .play:active {
    transform: scale(0.94);
  }
  /* 缓冲中：按钮外圈转一道细弧。 */
  .play.buffering::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    border: 2px solid transparent;
    border-top-color: var(--accent);
    animation: spin 900ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
