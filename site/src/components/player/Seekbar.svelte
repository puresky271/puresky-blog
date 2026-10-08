<script lang="ts">
  /**
   * Seekbar.svelte — 可拖拽的进度条。
   *
   * 拖动过程中只预览时间，松手才真正 seek：边拖边 seek 会让音频反复缓冲。
   * 键盘：左右方向键 ±5 秒，Home/End 到首尾。
   */
  import { formatDuration } from '@/lib/format';
  import { player } from '@/lib/player/store.svelte';

  /** edge：贴在容器下沿的细进度条（首页舞台过载态用），不显示时间。 */
  let { compact = false, edge = false }: { compact?: boolean; edge?: boolean } = $props();

  let track = $state<HTMLDivElement>();
  let dragging = $state(false);
  let preview = $state(0);

  const shown = $derived(dragging ? preview : player.current);
  const ratio = $derived(player.duration > 0 ? Math.min(1, shown / player.duration) : 0);

  function valueAt(clientX: number): number {
    const rect = track!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * player.duration;
  }

  function onPointerDown(event: PointerEvent) {
    if (!player.duration) return;
    dragging = true;
    preview = valueAt(event.clientX);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) preview = valueAt(event.clientX);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    player.seek(preview);
  }

  function onKeyDown(event: KeyboardEvent) {
    const step = { ArrowRight: 5, ArrowLeft: -5, ArrowUp: 5, ArrowDown: -5 }[event.key];
    if (step !== undefined) player.seek(player.current + step);
    else if (event.key === 'Home') player.seek(0);
    else if (event.key === 'End') player.seek(player.duration - 1);
    else return;
    event.preventDefault();
  }
</script>

<div class="seek" class:compact class:edge>
  <div
    bind:this={track}
    class="track"
    class:dragging
    role="slider"
    tabindex="0"
    aria-label="播放进度"
    aria-valuemin={0}
    aria-valuemax={Math.round(player.duration)}
    aria-valuenow={Math.round(shown)}
    aria-valuetext={`${formatDuration(shown * 1000)} / ${formatDuration(player.duration * 1000)}`}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKeyDown}
  >
    <div class="rail">
      <div class="fill" style="transform: scaleX({ratio})"></div>
    </div>
    <div class="thumb" style="left: {ratio * 100}%; --at: {ratio * 100}%"></div>
  </div>
  {#if !compact && !edge}
    <div class="times tabular">
      <span>{formatDuration(shown * 1000)}</span>
      <span>{formatDuration(player.duration * 1000)}</span>
    </div>
  {/if}
</div>

<style>
  .track {
    position: relative;
    height: 18px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
    border-radius: 999px;
  }
  .rail {
    position: relative;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--fg) 12%, transparent);
    overflow: hidden;
    transition: height 160ms ease;
  }
  .fill {
    position: absolute;
    inset: 0;
    background: var(--accent);
    transform-origin: left;
  }
  .thumb {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    margin-left: -6px;
    margin-top: -6px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow:
      0 0 0 2px var(--accent),
      var(--shadow-sm);
    transform: scale(0);
    transition: transform 160ms var(--ease-spring);
  }
  .track:hover .rail,
  .track.dragging .rail,
  .track:focus-visible .rail {
    height: 6px;
  }
  .track:hover .thumb,
  .track.dragging .thumb,
  .track:focus-visible .thumb {
    transform: scale(1);
  }
  .compact .track {
    height: 12px;
  }
  /* 贴边：命中区 14px，轨道贴着底边，平时 2px，悬停 5px。 */
  .edge .track {
    height: 14px;
    align-items: flex-end;
    border-radius: 0;
  }
  .edge .rail {
    height: 2px;
    border-radius: 0;
    background: rgb(255 255 255 / 0.22);
  }
  .edge .track:hover .rail,
  .edge .track.dragging .rail,
  .edge .track:focus-visible .rail {
    height: 5px;
  }
  /*
   * 贴边时容器（舞台）是 overflow: hidden 的圆角卡片，滑块要整颗留在里面：
   * 底部和卡片下沿对齐，不再以轨道中线为中心；两端收进圆角以内，开头结尾也看得全。
   */
  .edge .thumb {
    top: auto;
    bottom: 0;
    width: 11px;
    height: 11px;
    margin-top: 0;
    margin-left: -5.5px;
    left: clamp(14px, var(--at), calc(100% - 14px)) !important;
  }
  .times {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
    font-size: 0.6875rem;
    color: var(--fg-subtle);
  }
</style>
