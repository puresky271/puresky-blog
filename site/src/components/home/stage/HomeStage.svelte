<script lang="ts">
  /**
   * HomeStage.svelte — 首页的横版舞台，一个位置承担三件事：
   *
   *   插画   默认。横版图，可左右切换，夜里换夜晚版本。
   *   天空   舞台变成看沈阳此刻天空的窗口。
   *   音乐   过载：音乐接管舞台（封面、歌词、控件、贴边进度条）；有 MV 时可进入第二层的视频过载。
   *
   * 规则（参照 mygo_chat 首页的过载约定）：
   *   播放器是全局单例。在别的页面开始放歌，回到首页时舞台直接处于过载；
   *   在首页从别处开始播放（浮动播放器、键盘媒体键）时，舞台自动进入过载；
   *   手动切到别的模式后，音乐继续由右下角浮动播放器接管；
   *   过载里的 × 是硬退出：停止播放，舞台回到插画。
   */
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  import Icon from '@/components/ui/Icon.svelte';
  import { withBase } from '@/lib/format';
  import { iArrowRight, iImage, iMoon, iMusicNotes, iPlaylist, iSun } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';
  import { SOURCE_LABEL } from '@/lib/player/types';
  import { getAmbient, startAmbient } from '@/lib/sky/ambient';

  import StageArt from './StageArt.svelte';
  import StageMusic from './StageMusic.svelte';
  import StageSky from './StageSky.svelte';
  import StageVideo from './StageVideo.svelte';
  import type { StageImage, StageMode } from './types';

  let { images }: { images: StageImage[] } = $props();

  const MODE_KEY = 'stage-mode';

  // 初始模式只取决于首屏有没有插画，之后由用户切换。
  // svelte-ignore state_referenced_locally
  let mode = $state<StageMode>(images.length ? 'art' : 'sky');
  let artIndex = $state(0);
  let stage = $state<HTMLDivElement>();
  let width = $state(0);
  let night = $state(false);
  let visible = false;

  const overload = $derived(mode === 'music' && player.started);
  const video = $derived(mode === 'music' && player.videoActive);

  /** 舞台比例：横版为主；手机上加高，过载时给歌词和控件留出空间；视频固定 16:9。 */
  const ratio = $derived.by(() => {
    if (video) return 16 / 9;
    if (width && width < 640) return mode === 'music' ? 4 / 5 : 4 / 3;
    if (width && width < 1024) return 16 / 8;
    return 21 / 8;
  });

  const modes = $derived([
    ...(images.length ? [{ id: 'art' as const, label: '插画', icon: iImage }] : []),
    { id: 'sky' as const, label: '天空', icon: night ? iMoon : iSun },
    { id: 'music' as const, label: '音乐', icon: iMusicNotes },
  ]);

  function setMode(next: StageMode) {
    if (next === mode) return;
    if (mode === 'music' && player.videoActive) player.exitVideo();
    mode = next;
    if (next === 'music') void player.load();
    try {
      sessionStorage.setItem(MODE_KEY, next);
    } catch {
      // 记不住也无妨。
    }
  }

  function hardExit() {
    player.stop();
    setMode(images.length ? 'art' : 'sky');
  }

  onMount(() => {
    startAmbient();
    night = getAmbient().phase === 'night';
    const onAmbient = () => (night = getAmbient().phase === 'night');
    window.addEventListener('ambient:change', onAmbient);

    // 全局播放器已经在放歌（从别的页面带过来的），直接进入过载。
    if (player.started && player.playing) mode = 'music';
    else {
      try {
        const saved = sessionStorage.getItem(MODE_KEY) as StageMode | null;
        if (saved && modes.some((m) => m.id === saved)) mode = saved;
      } catch {
        // 读不到就用默认。
      }
    }
    if (mode === 'music') void player.load();

    const ro = new ResizeObserver(([entry]) => (width = entry.contentRect.width));
    ro.observe(stage!);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      player.dockSuppressed = visible && mode === 'music';
    });
    io.observe(stage!);

    return () => {
      window.removeEventListener('ambient:change', onAmbient);
      ro.disconnect();
      io.disconnect();
      player.dockSuppressed = false;
      if (player.videoActive) player.exitVideo();
    };
  });

  // 从别处开始播放（浮动播放器、媒体键）时自动进入过载。只在「从停到播」的那一刻触发，
  // 播放中手动切走的选择会被尊重。
  let wasPlaying = player.playing;
  $effect(() => {
    const playing = player.playing;
    if (playing && !wasPlaying && mode !== 'music') mode = 'music';
    wasPlaying = playing;
  });

  $effect(() => {
    player.dockSuppressed = visible && mode === 'music';
  });

  // 过载时给整个页面打个标记，首页顶部的天空会被封面颜色染上一层。
  $effect(() => {
    document.documentElement.classList.toggle('is-overload', overload);
    return () => document.documentElement.classList.remove('is-overload');
  });

  function enterVideo() {
    player.enterVideo();
  }
</script>

<div class="stage-wrap">
  {#if overload && player.track?.cover}
    {#key player.track.key}
      <img class="aura" src={player.cover(300)} alt="" aria-hidden="true" transition:fade={{ duration: 900 }} />
    {/key}
  {/if}

  <div
    class="stage"
    bind:this={stage}
    data-mode={mode}
    class:sized={width > 0}
    style={width ? `height: ${Math.round(width / ratio)}px` : undefined}
  >
    {#key mode === 'music' ? (video ? 'video' : 'music') : mode}
      <div class="mode-layer" in:fade={{ duration: 380 }} out:fade={{ duration: 220 }}>
        {#if mode === 'art'}
          <StageArt {images} bind:index={artIndex} />
        {:else if mode === 'sky'}
          <StageSky />
        {:else if video}
          <StageVideo onexit={() => player.exitVideo()} />
        {:else}
          <StageMusic onexit={hardExit} onvideo={enterVideo} />
        {/if}
      </div>
    {/key}
  </div>

  <div class="stage-bar">
    <p class="context">
      {#if mode === 'art' && images[artIndex]}
        <span class="truncate text-fg">{images[artIndex].title}</span>
        {#if images[artIndex].id !== 'local-home'}
          <a href={withBase(`/gallery/#${images[artIndex].id}`)} class="more">画廊<Icon icon={iArrowRight} size={13} /></a>
        {/if}
      {:else if mode === 'sky'}
        <span class="truncate">天气来自 Open-Meteo，按日出日落划分时段</span>
      {:else if player.playlist}
        <span class="truncate">
          {SOURCE_LABEL[player.playlist.source]}
          {player.playlist.source === 'netease' ? `· ${player.playlist.name}` : ''}
          · {player.playlist.tracks.length} 首
        </span>
        <button type="button" class="more" data-player-opener onclick={() => (player.panelOpen = !player.panelOpen)}>
          <Icon icon={iPlaylist} size={14} />播放列表
        </button>
      {/if}
    </p>

    <div class="modes" role="tablist" aria-label="舞台内容">
      {#each modes as m}
        <button
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          onclick={() => setMode(m.id)}
          title={m.label}
        >
          <Icon icon={m.icon} size={15} />
          <span>{m.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .stage-wrap {
    position: relative;
  }
  /* 过载时舞台四周的一圈封面色光，把音乐的颜色带到页面上。 */
  .aura {
    position: absolute;
    left: -6%;
    right: -6%;
    top: -18%;
    z-index: -1;
    width: 112%;
    height: 120%;
    object-fit: cover;
    filter: blur(70px) saturate(1.4);
    opacity: 0.4;
    pointer-events: none;
  }
  :global([data-theme='dark']) .aura {
    opacity: 0.32;
  }

  /*
   * 首屏渲染时靠 aspect-ratio 定高；挂载后脚本按宽度写入 height（这样切换比例时高度能过渡），
   * 同时把 aspect-ratio 关掉。两者并存时浏览器会用高度反推宽度，舞台会越缩越窄。
   */
  .stage {
    position: relative;
    width: 100%;
    aspect-ratio: 21 / 8;
    border-radius: var(--radius-card);
    border: 1px solid var(--line);
    background: var(--surface-2);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    transition:
      height 560ms var(--ease-out-expo),
      background-color 400ms ease,
      box-shadow 400ms ease;
  }
  @media (width < 64rem) {
    .stage {
      aspect-ratio: 16 / 8;
    }
  }
  @media (width < 40rem) {
    .stage {
      aspect-ratio: 4 / 3;
    }
  }
  /* 天空模式：舞台是一扇透明的窗，背后的天空和粒子透出来。 */
  .stage.sized {
    aspect-ratio: auto;
  }
  .stage[data-mode='sky'] {
    background: transparent;
    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--surface) 40%, transparent);
    backdrop-filter: none;
  }
  .stage[data-mode='music'] {
    border-color: transparent;
  }
  .mode-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .stage-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    margin-top: 0.85rem;
  }
  .context {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .more {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
    color: var(--fg-muted);
    transition: color 160ms ease;
  }
  .more:hover {
    color: var(--accent);
  }
  .modes {
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 85%, transparent);
    backdrop-filter: blur(8px);
  }
  .modes button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: 1.9rem;
    padding-inline: 0.8rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    color: var(--fg-muted);
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }
  .modes button:hover {
    color: var(--fg);
  }
  .modes button[aria-selected='true'] {
    background: var(--accent);
    color: var(--accent-fg);
  }
</style>
