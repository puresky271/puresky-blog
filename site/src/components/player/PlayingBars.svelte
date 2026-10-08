<script lang="ts">
  /**
   * PlayingBars.svelte — 播放状态指示：播放时几根竖条起伏，暂停时停在低位。
   * 只表示「正在播放」，不是频谱，不假装反映音频内容。
   */
  let { playing = false, size = 14 }: { playing?: boolean; size?: number } = $props();
</script>

<span class="bars" class:playing style="--size: {size}px" aria-hidden="true">
  <i></i><i></i><i></i>
</span>

<style>
  .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--size) * 0.14);
    width: var(--size);
    height: var(--size);
  }
  i {
    flex: 1;
    height: 100%;
    border-radius: 2px;
    background: currentColor;
    transform-origin: bottom;
    transform: scaleY(0.3);
    transition: transform 300ms ease;
  }
  .playing i {
    animation: bounce 900ms ease-in-out infinite alternate;
  }
  .playing i:nth-child(2) {
    animation-delay: -420ms;
    animation-duration: 760ms;
  }
  .playing i:nth-child(3) {
    animation-delay: -210ms;
    animation-duration: 1040ms;
  }
  @keyframes bounce {
    from {
      transform: scaleY(0.25);
    }
    to {
      transform: scaleY(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .playing i {
      animation: none;
      transform: scaleY(0.7);
    }
  }
</style>
