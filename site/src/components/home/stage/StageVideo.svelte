<script lang="ts">
  /**
   * StageVideo.svelte — 舞台的视频过载（MV），音乐过载的第二层。
   *
   * 进入时播放器已经暂停音频并记住了状态（player.enterVideo），这里只负责视频本身。
   * 视频按原亮度播放，不压暗；背后用模糊的封面做一圈氛围光，填满 16:9 以外的空隙。
   * 视频就绪前显示转圈，就绪后 240ms 淡入。B 站视频走官方嵌入播放器。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { formatDuration } from '@/lib/format';
  import { iArrowLeft, iArrowsOutSimple, iPauseFill, iPlayFill, iSpeakerHigh, iSpeakerX } from '@/lib/icons.generated';
  import { player, type ResolvedVideo } from '@/lib/player/store.svelte';

  let { onexit }: { onexit: () => void } = $props();

  let source = $state<ResolvedVideo | null>(null);
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let video = $state<HTMLVideoElement>();
  let host = $state<HTMLDivElement>();
  let paused = $state(true);
  let waiting = $state(true);
  let time = $state(0);
  let duration = $state(0);
  let muted = $state(false);

  onMount(() => {
    let alive = true;
    player
      .resolveVideo()
      .then((resolved) => {
        if (!alive) return;
        source = resolved;
        status = resolved ? 'ready' : 'error';
      })
      .catch(() => alive && (status = 'error'));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) onexit();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
    };
  });

  $effect(() => {
    if (video) {
      video.volume = player.volume;
      muted = player.muted;
    }
  });

  function toggle() {
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  function seek(event: MouseEvent) {
    if (!video || !duration) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    video.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
  }

  function fullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host?.requestFullscreen?.();
  }
</script>

<div class="video-stage" bind:this={host}>
  <img class="ambient" src={player.cover(400)} alt="" aria-hidden="true" />

  {#if status === 'ready' && source?.kind === 'video'}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={video}
      class:shown={!waiting || time > 0}
      src={source.url}
      autoplay
      playsinline
      {muted}
      onclick={toggle}
      onplay={() => (paused = false)}
      onpause={() => (paused = true)}
      onwaiting={() => (waiting = true)}
      onplaying={() => (waiting = false)}
      oncanplay={() => (waiting = false)}
      ontimeupdate={(e) => (time = e.currentTarget.currentTime)}
      onloadedmetadata={(e) => (duration = e.currentTarget.duration)}
      onerror={() => (status = 'error')}
      onended={onexit}
    ></video>
  {:else if status === 'ready' && source?.kind === 'iframe'}
    <iframe
      src={source.url}
      title={`${player.track?.name ?? ''} MV`}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  {/if}

  {#if status === 'loading' || (status === 'ready' && source?.kind === 'video' && waiting)}
    <span class="spinner" role="status" aria-label="视频加载中"></span>
  {:else if status === 'error'}
    <div class="error">
      <p>这首歌的 MV 暂时放不了。</p>
      <button type="button" class="pill" onclick={onexit}>回到音乐</button>
    </div>
  {/if}

  <button type="button" class="back" onclick={onexit} aria-label="退出视频，回到音乐过载">
    <Icon icon={iArrowLeft} size={16} />
    <span>回到音乐</span>
  </button>

  {#if status === 'ready' && source?.kind === 'video'}
    <div class="bar">
      <button type="button" class="ctl" onclick={toggle} aria-label={paused ? '播放' : '暂停'}>
        <Icon icon={paused ? iPlayFill : iPauseFill} size={18} />
      </button>
      <button type="button" class="ctl" onclick={() => (muted = !muted)} aria-label={muted ? '取消静音' : '静音'}>
        <Icon icon={muted ? iSpeakerX : iSpeakerHigh} size={17} />
      </button>
      <span class="tabular text-[0.75rem] opacity-80">{formatDuration(time * 1000)} / {formatDuration(duration * 1000)}</span>
      <button type="button" class="ctl ml-auto" onclick={fullscreen} aria-label="全屏">
        <Icon icon={iArrowsOutSimple} size={16} />
      </button>
    </div>
    <button type="button" class="track" onclick={seek} aria-label="视频进度">
      <span class="fill" style="transform: scaleX({duration ? time / duration : 0})"></span>
    </button>
  {/if}
</div>

<style>
  .video-stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: #05070c;
    color: #fff;
    isolation: isolate;
  }
  .ambient {
    position: absolute;
    inset: -9%;
    z-index: -1;
    width: 118%;
    height: 118%;
    object-fit: cover;
    opacity: 0.34;
    filter: blur(34px) saturate(1.16) brightness(0.54);
    transform: scale(1.08);
  }
  video,
  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
  video {
    object-fit: contain;
    opacity: 0;
    transition: opacity 240ms ease;
    cursor: pointer;
  }
  video.shown {
    opacity: 1;
  }
  .spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    border-radius: 999px;
    border: 2px solid rgb(255 255 255 / 0.2);
    border-top-color: #fff;
    animation: spin 900ms linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .error {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.75rem;
    font-size: 0.9375rem;
  }
  .pill {
    height: 2rem;
    padding-inline: 0.9rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.16);
    font-size: 0.8125rem;
  }
  .back {
    position: absolute;
    top: 0.9rem;
    left: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: 2rem;
    padding-inline: 0.75rem;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.42);
    backdrop-filter: blur(8px);
    font-size: 0.8125rem;
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 1.5rem 0.9rem 0.8rem;
    background: linear-gradient(0deg, rgb(0 0 0 / 0.55), transparent);
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .video-stage:hover .bar,
  .video-stage:hover .back,
  .video-stage:focus-within .bar,
  .video-stage:focus-within .back {
    opacity: 1;
  }
  @media (hover: none) {
    .bar,
    .back {
      opacity: 1;
    }
  }
  .ctl {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    transition: background-color 160ms ease;
  }
  .ctl:hover {
    background: rgb(255 255 255 / 0.16);
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 10px;
    display: flex;
    align-items: flex-end;
    background: transparent;
  }
  .track::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: rgb(255 255 255 / 0.22);
    transition: height 140ms ease;
  }
  .fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: var(--accent);
    transform-origin: left;
    transition: height 140ms ease;
  }
  .track:hover::before,
  .track:hover .fill {
    height: 5px;
  }
</style>
