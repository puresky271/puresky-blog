<script lang="ts">
  /**
   * PlayerDock.svelte — 右下角的浮动播放器。挂在 Base 布局的持久节点上，跨页面不卸载。
   *
   * 三种形态：
   *   没播放过：一个小圆钮，点开面板挑歌，不打扰阅读。若当前文章绑定了专属曲目（featuredTrack），
   *            圆钮呈现为嵌着该曲封面的精致黑胶唱片形态，点击后切换到该曲并展开。
   *   播放过：胶囊，显示旋转的封面、曲名和播放键。
   *   首页舞台处于音乐模式并且在视口内时：让位隐藏，避免同一个播放器在屏幕上出现两次。
   */
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  import Icon from '@/components/ui/Icon.svelte';
  import { iCaretUp, iPauseFill, iPlayFill, iVinylRecord } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';
  import { coverOf } from '@/lib/player/types';

  import PlayerPanel from './PlayerPanel.svelte';
  import PlayingBars from './PlayingBars.svelte';

  let root = $state<HTMLDivElement>();
  let opener = $state<HTMLButtonElement>();

  const hidden = $derived(player.dockSuppressed && !player.panelOpen);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const featured = $derived(player.featuredTrack);

  async function syncPostSong() {
    const marker = document.querySelector<HTMLElement>('[data-post-song]');
    const songKey = marker?.dataset.postSong?.trim() || null;
    player.featuredKey = songKey;
    if (songKey) {
      await player.load();
      // 如果播放器当前还没有开始放别的歌，预先把当前曲目对准文章专属曲目（不自动出声，保持收敛圆盘态）
      if (!player.started) {
        const idx = player.libraries.local?.tracks.findIndex(
          (t) => t.key === songKey || t.id === songKey || t.name === songKey
        ) ?? -1;
        if (idx >= 0) {
          player.source = 'local';
          player.index = idx;
        }
      }
    }
  }

  onMount(() => {
    void syncPostSong();
    // 空闲时预取歌单，点开面板时就不用等。
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1200));
    idle(() => void player.load());

    const onPageLoad = () => void syncPostSong();
    document.addEventListener('astro:page-load', onPageLoad);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && player.panelOpen) close();
    };
    const onPointer = (event: PointerEvent) => {
      if (!player.panelOpen || !root) return;
      const target = event.target as Element;
      // 首页卡片上的「展开」按钮也会打开面板，点它不算点外面。
      if (root.contains(target) || target.closest('[data-player-opener]')) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('astro:page-load', onPageLoad);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  });

  async function open() {
    await player.load();
    player.panelOpen = true;
    await tick();
    root?.querySelector<HTMLElement>('.panel button[aria-label="播放"], .panel button[aria-label="暂停"]')?.focus();
  }

  async function openFeaturedDisc() {
    if (featured && (!player.started || player.track?.key !== featured.key)) {
      await player.playTrack(featured.key);
    } else {
      if (player.panelOpen) close();
      else await open();
    }
  }

  function close() {
    player.panelOpen = false;
    opener?.focus();
  }
</script>

<div class="dock-root" class:hidden bind:this={root}>
  {#if player.panelOpen}
    <div class="panel-wrap" transition:fly={{ y: reduced ? 0 : 12, duration: 260, easing: cubicOut }}>
      <PlayerPanel onclose={close} />
    </div>
  {/if}

  {#if player.started && player.track}
    <div class="pill card" transition:fly={{ y: reduced ? 0 : 16, duration: 280, easing: cubicOut }}>
      <button
        type="button"
        class="pill-main"
        bind:this={opener}
        onclick={() => (player.panelOpen ? close() : open())}
        aria-expanded={player.panelOpen}
        aria-label="展开播放器"
      >
        <span class="disc" class:spinning={player.playing}>
          <img src={player.cover(96)} alt="" width="36" height="36" />
        </span>
        <span class="min-w-0 flex-1 text-left">
          <span class="flex items-center gap-1.5 truncate text-[0.8125rem] font-medium text-fg">
            {#if player.playing}<span class="text-accent"><PlayingBars playing size={11} /></span>{/if}
            <span class="truncate">{player.track.name}</span>
          </span>
          <span class="block truncate text-[0.75rem] text-fg-muted">{player.track.artists.join(' / ')}</span>
        </span>
        <span class="caret" class:open={player.panelOpen}><Icon icon={iCaretUp} size={14} /></span>
      </button>
      <button
        type="button"
        class="pill-play"
        onclick={() => player.toggle()}
        aria-label={player.playing ? '暂停' : '播放'}
      >
        <Icon icon={player.playing ? iPauseFill : iPlayFill} size={16} />
      </button>
    </div>
  {:else if featured}
    <button
      type="button"
      class="fab featured-fab card"
      bind:this={opener}
      onclick={openFeaturedDisc}
      aria-expanded={player.panelOpen}
      aria-label={`播放本文曲目《${featured.name}》`}
      title={`播放《${featured.name}》`}
    >
      <span class="vinyl-disc">
        {#if coverOf(featured, 96)}
          <img src={coverOf(featured, 96)} alt="" width="40" height="40" />
        {:else}
          <Icon icon={iVinylRecord} size={22} />
        {/if}
        <span class="vinyl-hole" aria-hidden="true"></span>
      </span>
      <span class="vinyl-tip" aria-hidden="true">《{featured.name}》</span>
    </button>
  {:else}
    <button
      type="button"
      class="fab card"
      bind:this={opener}
      onclick={() => (player.panelOpen ? close() : open())}
      aria-expanded={player.panelOpen}
      aria-label="打开音乐播放器"
      title="音乐"
    >
      <Icon icon={iVinylRecord} size={22} />
    </button>
  {/if}
</div>

<style>
  .dock-root {
    position: fixed;
    right: max(16px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
    z-index: var(--z-dock);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    transition:
      transform 360ms var(--ease-out-expo),
      opacity 240ms ease;
  }
  /* 页脚展开后让位，不挡页脚底栏的按钮；展开着的面板不受影响。 */
  :global(html[data-footer-open]) .dock-root:not(:has(.panel-wrap)),
  .dock-root.hidden {
    transform: translateY(calc(100% + 24px));
    opacity: 0;
    pointer-events: none;
  }
  @media (width >= 48rem) {
    .dock-root {
      right: 24px;
      bottom: 24px;
    }
  }

  .panel-wrap {
    transform-origin: bottom right;
  }

  .fab {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 999px;
    color: var(--fg-muted);
    box-shadow: var(--shadow-md);
    transition:
      color 160ms ease,
      transform 240ms var(--ease-spring);
  }
  .fab:hover {
    color: var(--accent);
    transform: translateY(-2px) rotate(-12deg);
  }
  .fab:active {
    transform: scale(0.94);
  }

  /* 文章专属曲目的收敛唱片态：保持 48x48 圆形唱片轮廓，内嵌封面盘面与黑胶纹路，点击后展开胶囊并播放 */
  .featured-fab {
    position: relative;
    padding: 4px;
  }
  .vinyl-disc {
    position: relative;
    display: block;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    overflow: hidden;
    background: #141821;
    box-shadow:
      0 0 0 2px #141821,
      0 0 0 3px var(--line-strong);
    animation: spin 18s linear infinite;
  }
  .vinyl-disc img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .vinyl-hole {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: 0 0 0 2px rgb(0 0 0 / 0.45);
  }
  .vinyl-tip {
    position: absolute;
    right: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%) translateX(4px);
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--fg-muted);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 180ms ease,
      transform 200ms var(--ease-out-expo);
  }
  .featured-fab:hover .vinyl-tip,
  .featured-fab:focus-visible .vinyl-tip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 4px;
    width: min(300px, calc(100vw - 32px));
    padding: 6px;
    border-radius: 999px;
    box-shadow: var(--shadow-md);
  }
  .pill-main {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 10px;
    padding-right: 4px;
    border-radius: 999px;
  }
  .disc {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--line);
    animation: spin 14s linear infinite;
    animation-play-state: paused;
  }
  .disc.spinning {
    animation-play-state: running;
  }
  .disc img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .caret {
    color: var(--fg-subtle);
    transition: transform 240ms var(--ease-out-expo);
  }
  .caret.open {
    transform: rotate(180deg);
  }
  .pill-play {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-fg);
    transition: transform 200ms var(--ease-spring);
  }
  .pill-play:active {
    transform: scale(0.92);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .disc,
    .vinyl-disc {
      animation: none;
    }
  }
</style>
