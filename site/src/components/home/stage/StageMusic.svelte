<script lang="ts">
  /**
   * StageMusic.svelte — 舞台的音乐过载模式。
   *
   * 音乐接管整个舞台：封面模糊后铺满做底，右侧是清晰的唱片套，左侧是当前歌词的大字，
   * 精简控件压在下方，进度条贴着舞台下沿（2px，悬停 5px）。
   * 切歌时唱片套做 3D 飞出飞入；本地曲目可以用 coverFit 指定封面取景、tone 指定歌词用深色还是浅色字。
   *
   * 当前曲目有 MV（本地视频、网易云 MV 或 B 站视频）时，「MV」按钮进入第二层的视频过载。
   */
  import { fade, fly } from 'svelte/transition';

  import Icon from '@/components/ui/Icon.svelte';
  import Controls from '@/components/player/Controls.svelte';
  import PlayingBars from '@/components/player/PlayingBars.svelte';
  import Seekbar from '@/components/player/Seekbar.svelte';
  import { formatDuration } from '@/lib/format';
  import { iCaretLeft, iCaretRight, iMusicNotes, iPlayFill, iVinylRecord, iX } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';
  import { SOURCE_LABEL } from '@/lib/player/types';

  let { onexit, onvideo }: { onexit: () => void; onvideo: () => void } = $props();

  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track = $derived(player.track);
  const lines = $derived(player.lyrics);
  const i = $derived(player.lyricIndex);
  const currentLine = $derived(i >= 0 ? lines[i] : null);
  const prevLine = $derived(i > 0 ? lines[i - 1] : null);
  const nextLine = $derived(i >= 0 ? (lines[i + 1] ?? null) : (lines[0] ?? null));
  const dark = $derived(track?.tone === 'dark');

  // 唱片套 3D 换片：记录上一张封面和方向。
  let lastKey = '';
  let lastIndex = 0;
  let lastCover = '';
  let outgoing = $state<{ cover: string; dir: 1 | -1; key: string } | null>(null);
  let timer = 0;

  $effect(() => {
    const key = track?.key ?? '';
    if (key && lastKey && key !== lastKey && !reduced) {
      const count = player.playlist?.tracks.length ?? 1;
      const forward = (player.index - lastIndex + count) % count <= count / 2;
      outgoing = { cover: lastCover, dir: forward ? 1 : -1, key: lastKey };
      clearTimeout(timer);
      timer = window.setTimeout(() => (outgoing = null), 800);
    }
    lastKey = key;
    lastIndex = player.index;
    lastCover = player.cover(600);
  });

  // 本地曲目的封面取景：position 决定焦点，size 是百分比时按比例放大（例如 '110%'）。
  const coverStyle = $derived.by(() => {
    const fit = track?.coverFit;
    if (!fit) return '';
    const zoom = fit.size?.endsWith('%') ? parseFloat(fit.size) / 100 : 1;
    const position = fit.position ?? '50% 50%';
    return `object-position: ${position}; transform-origin: ${position};${zoom > 1 ? ` transform: scale(${zoom});` : ''}`;
  });
</script>

<div class="music" class:dark>
  {#if track}
    <!-- 底：封面模糊铺满，颜色就是这首歌的颜色。 -->
    {#key track.key}
      <img class="backdrop" src={player.cover(400)} alt="" aria-hidden="true" transition:fade={{ duration: 700 }} />
    {/key}
    <div class="scrim" aria-hidden="true"></div>

    <header class="top">
      <p class="label">
        {#if player.playing}<PlayingBars playing size={11} />{:else}<Icon icon={iMusicNotes} size={13} />{/if}
        <span>{player.playing ? '正在播放' : '已暂停'}</span>
        <span class="opacity-60">· {SOURCE_LABEL[track.source]}</span>
      </p>
      <div class="flex items-center gap-1.5">
        {#if track.video}
          <button type="button" class="mv" onclick={onvideo} aria-label="观看 MV（视频过载）">MV</button>
        {/if}
        <button type="button" class="ghost-btn" onclick={onexit} aria-label="退出过载并停止播放" title="退出过载">
          <Icon icon={iX} size={16} />
        </button>
      </div>
    </header>

    <div class="body">
      <div class="lyrics" aria-live="off">
        <p class="song">
          <span class="font-semibold">{track.name}</span>
          {#if track.artists.length}<span class="opacity-70"> · {track.artists.join(' / ')}</span>{/if}
        </p>

        {#if !player.started}
          <div class="idle">
            <button type="button" class="big-play" onclick={() => player.play()} aria-label="播放，进入过载">
              <Icon icon={iPlayFill} size={22} />
            </button>
            <p class="opacity-80">播放后，歌词会在这里展开。</p>
          </div>
        {:else if player.lyricStatus === 'ready' && lines.length}
          <div class="stack">
            <p class="aside-line">{prevLine?.text ?? ''}</p>
            {#key i}
              <div in:fly={{ y: reduced ? 0 : 14, duration: 420, opacity: 0 }}>
                <p class="current-line">{currentLine?.text ?? track.name}</p>
                {#if currentLine?.translation}<p class="translation">{currentLine.translation}</p>{/if}
              </div>
            {/key}
            <p class="aside-line">{nextLine?.text ?? ''}</p>
          </div>
        {:else}
          <div class="stack">
            <p class="current-line">{track.name}</p>
            <p class="translation">
              {player.lyricStatus === 'loading' ? '歌词加载中' : player.lyricStatus === 'error' ? '歌词暂时取不到' : '纯音乐'}
            </p>
          </div>
        {/if}
      </div>

      <div class="sleeve-wrap" aria-hidden="true">
        {#if outgoing}
          {#key outgoing.key}
            <div class="sleeve swap-out" style="--dir: {outgoing.dir}">
              {#if outgoing.cover}<img src={outgoing.cover} alt="" />{/if}
            </div>
          {/key}
        {/if}
        {#key track.key}
          <div class="sleeve" class:swap-in={!!outgoing} style="--dir: {outgoing?.dir ?? 1}">
            {#if track.cover}
              <img src={player.cover(600)} alt="" style={coverStyle} />
            {:else}
              <span class="sleeve-empty"><Icon icon={iVinylRecord} size={48} /></span>
            {/if}
          </div>
        {/key}
      </div>
    </div>

    <footer class="bottom">
      <div class="controls">
        <Controls size="sm">
          {#if player.lyricVariants.length > 1}
            <button
              type="button"
              class="variant"
              onclick={() => player.cycleLyricVariant()}
              aria-label="切换歌词版本"
            >
              {player.lyricVariants.find((v) => v.key === player.lyricVariant)?.label ?? '原'}
            </button>
          {/if}
        </Controls>
      </div>
      <p class="time tabular">
        {formatDuration(player.current * 1000)} / {formatDuration(player.duration * 1000)}
      </p>
    </footer>

    {#if (player.playlist?.tracks.length ?? 0) > 1}
      <button type="button" class="edge-arrow left" onclick={() => player.prev()} aria-label="上一首">
        <Icon icon={iCaretLeft} size={20} />
      </button>
      <button type="button" class="edge-arrow right" onclick={() => player.next()} aria-label="下一首">
        <Icon icon={iCaretRight} size={20} />
      </button>
    {/if}

    <div class="progress">
      <Seekbar edge />
    </div>
  {:else}
    <div class="empty">
      {#if player.status === 'empty'}
        <p>还没有可播放的曲目。</p>
        <p class="text-[0.8125rem] opacity-70">把音频放进 public/media/songs，或在 config.ts 里配置网易云歌单。</p>
      {:else}
        <div class="skeleton h-4 w-40 !bg-white/15"></div>
        <div class="skeleton mt-3 h-8 w-72 !bg-white/15"></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .music {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: oklch(0.2 0.03 262);
    color: rgb(255 255 255 / 0.96);
    isolation: isolate;
  }
  .backdrop {
    position: absolute;
    inset: -12%;
    z-index: -2;
    width: 124%;
    height: 124%;
    object-fit: cover;
    filter: blur(42px) saturate(1.35) brightness(0.62);
  }
  /* 左侧和底部压暗，保证白字可读；右侧留给唱片套。 */
  .scrim {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(90deg, rgb(6 10 18 / 0.5), rgb(6 10 18 / 0.18) 55%, rgb(6 10 18 / 0.05)),
      linear-gradient(0deg, rgb(6 10 18 / 0.45), transparent 40%);
  }
  /* 深色字的曲目：浅色遮罩 + 深色字，适合很亮的封面。 */
  .dark {
    color: rgb(28 24 22 / 0.92);
  }
  .dark .backdrop {
    filter: blur(42px) saturate(1.2) brightness(1.08);
  }
  .dark .scrim {
    background:
      linear-gradient(90deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.15) 55%, transparent),
      linear-gradient(0deg, rgb(255 255 255 / 0.4), transparent 40%);
  }

  .top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0 clamp(1.25rem, 4vw, 3rem);
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .mv {
    height: 1.9rem;
    padding-inline: 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    background: rgb(255 255 255 / 0.16);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.22);
    backdrop-filter: blur(8px);
    transition: background-color 160ms ease;
  }
  .mv:hover {
    background: rgb(255 255 255 / 0.26);
  }
  .ghost-btn {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.22);
    transition: background-color 160ms ease;
  }
  .ghost-btn:hover {
    background: rgb(0 0 0 / 0.38);
  }
  .dark .mv,
  .dark .ghost-btn {
    background: rgb(255 255 255 / 0.5);
  }

  .body {
    position: absolute;
    inset: 3.25rem clamp(1.25rem, 4vw, 3rem) 4.95rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(1rem, 4vw, 3rem);
  }
  .song {
    font-size: 0.875rem;
    opacity: 0.92;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stack {
    margin-top: 0.9rem;
    display: grid;
    gap: 0.55rem;
  }
  .aside-line {
    min-height: 1.4em;
    font-size: 0.9375rem;
    opacity: 0.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .current-line {
    font-size: clamp(1.35rem, 1rem + 1.6vw, 2.25rem);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.01em;
    text-shadow: 0 1px 10px rgb(0 0 0 / 0.35);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .dark .current-line {
    text-shadow: 0 1px 8px rgb(255 255 255 / 0.72);
  }
  .translation {
    margin-top: 0.3rem;
    font-size: 0.9375rem;
    opacity: 0.8;
  }
  .idle {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    font-size: 0.9375rem;
  }
  .big-play {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.95);
    color: oklch(0.3 0.05 260);
    box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.6);
    transition: transform 240ms var(--ease-spring);
  }
  .big-play:hover {
    transform: scale(1.06);
  }

  .sleeve-wrap {
    position: relative;
    height: 100%;
    aspect-ratio: 1;
    max-height: 17rem;
    perspective: 1200px;
  }
  .sleeve {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 14px;
    background: rgb(255 255 255 / 0.08);
    box-shadow:
      0 24px 50px -18px rgb(0 0 0 / 0.65),
      inset 0 0 0 1px rgb(255 255 255 / 0.12);
  }
  .sleeve img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .sleeve-empty {
    display: grid;
    place-items: center;
    height: 100%;
    opacity: 0.6;
  }
  .swap-out {
    z-index: 1;
    animation: sleeve-out 780ms cubic-bezier(0.16, 0.9, 0.14, 1) forwards;
  }
  .swap-in {
    z-index: 2;
    animation: sleeve-in 780ms cubic-bezier(0.16, 0.9, 0.14, 1);
  }
  @keyframes sleeve-out {
    to {
      transform: translateX(calc(var(--dir) * -44%)) rotateY(calc(var(--dir) * 15deg)) rotateZ(calc(var(--dir) * -1deg)) scale(0.955);
      opacity: 0;
    }
  }
  @keyframes sleeve-in {
    from {
      transform: translateX(calc(var(--dir) * 22%)) rotateY(calc(var(--dir) * -9deg)) scale(1.018);
      opacity: 0.58;
    }
    58% {
      transform: translateX(calc(var(--dir) * -1.6%));
      opacity: 1;
    }
  }

  .bottom {
    position: absolute;
    left: clamp(1.25rem, 4vw, 3rem);
    right: 1.25rem;
    /* 离贴边进度条留出一段距离，控件不压在进度条上。 */
    bottom: 1.6rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .controls {
    width: min(19rem, 100%);
  }
  .controls :global(.icon-btn) {
    color: inherit;
    opacity: 0.85;
  }
  .controls :global(.icon-btn:hover) {
    background: rgb(255 255 255 / 0.14);
    opacity: 1;
  }
  .controls :global(.play) {
    background: rgb(255 255 255 / 0.95);
    color: oklch(0.3 0.05 260);
    box-shadow: none;
  }
  .controls :global(.mode.active) {
    color: inherit;
    opacity: 1;
  }
  .variant {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: rgb(255 255 255 / 0.14);
  }
  .time {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.75;
  }

  .edge-arrow {
    position: absolute;
    top: 50%;
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 4.5rem;
    margin-top: -2.25rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.18);
    opacity: 0;
    transform: scale(0.88);
    transition:
      opacity 200ms ease,
      transform 340ms cubic-bezier(0.16, 0.9, 0.14, 1);
  }
  .edge-arrow.left {
    left: 0.4rem;
  }
  .edge-arrow.right {
    right: 0.4rem;
  }
  .music:hover .edge-arrow {
    opacity: 1;
    transform: scale(1);
  }
  .edge-arrow:active {
    transform: scale(0.86);
  }

  .progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .empty {
    display: grid;
    place-content: center;
    justify-items: center;
    height: 100%;
    gap: 0.4rem;
    text-align: center;
    font-size: 0.9375rem;
  }

  @media (width < 40rem) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }
    .sleeve-wrap {
      display: none;
    }
    .time {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .swap-out,
    .swap-in {
      animation: none;
    }
  }
</style>
