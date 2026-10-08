<script lang="ts">
  /**
   * PlayerPanel.svelte — 播放器展开面板：当前曲目、进度、控制、音量、歌词 / 播放列表。
   *
   * 歌词自动跟随当前行；用户手动滚动后暂停跟随 3 秒，免得和用户抢滚动条。
   */
  import { tick } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { formatDuration } from '@/lib/format';
  import {
    iBrandNeteasecloudmusic,
    iSpeakerHigh,
    iSpeakerLow,
    iSpeakerX,
    iVinylRecord,
    iX,
  } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';
  import { SOURCE_LABEL, type Source } from '@/lib/player/types';

  import Controls from './Controls.svelte';
  import PlayingBars from './PlayingBars.svelte';
  import Seekbar from './Seekbar.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let tab = $state<'lyrics' | 'list'>('lyrics');
  /** 列表里正在看的曲库，不一定是正在播的那个。 */
  let listSource = $state<Source>(player.source);
  const listLibrary = $derived(player.libraries[listSource] ?? player.playlist);
  let lyricBox = $state<HTMLDivElement>();
  let listBox = $state<HTMLDivElement>();
  let userScrolledAt = 0;

  const speaker = $derived(player.muted || player.volume === 0 ? iSpeakerX : player.volume < 0.5 ? iSpeakerLow : iSpeakerHigh);

  // 当前歌词行变化时滚到容器 40% 高度处。
  $effect(() => {
    const index = player.lyricIndex;
    if (tab !== 'lyrics' || !lyricBox || index < 0) return;
    if (Date.now() - userScrolledAt < 3000) return;
    const line = lyricBox.querySelector<HTMLElement>(`[data-line="${index}"]`);
    if (!line) return;
    lyricBox.scrollTo({
      top: line.offsetTop - lyricBox.clientHeight * 0.4 + line.offsetHeight / 2,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });

  async function showList() {
    tab = 'list';
    listSource = player.source;
    await tick();
    listBox?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
  }

  function markUserScroll() {
    userScrolledAt = Date.now();
  }
</script>

<div class="panel card" role="dialog" aria-label="音乐播放器">
  <header class="flex items-center gap-3">
    <div class="cover">
      {#if player.track}
        <img src={player.cover(160)} alt="" width="56" height="56" />
      {:else}
        <Icon icon={iVinylRecord} size={26} />
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      {#if player.track}
        <p class="truncate font-medium text-fg">{player.track.name}</p>
        <p class="truncate text-[0.8125rem] text-fg-muted">
          {player.track.artists.join(' / ')}{player.track.album ? ` · ${player.track.album}` : ''}
        </p>
      {:else if player.status === 'loading' || player.status === 'idle'}
        <div class="skeleton h-4 w-32"></div>
        <div class="skeleton mt-2 h-3 w-20"></div>
      {:else}
        <p class="font-medium text-fg">歌单暂时不可用</p>
        <p class="text-[0.8125rem] text-fg-muted">网易云接口没有响应，稍后再试。</p>
      {/if}
    </div>
    <button type="button" class="icon-btn -mr-1 self-start" onclick={onclose} aria-label="收起播放器">
      <Icon icon={iX} size={18} />
    </button>
  </header>

  <div class="mt-4">
    <Seekbar />
  </div>

  <div class="mt-2">
    <Controls />
  </div>

  <div class="volume">
    <button
      type="button"
      class="icon-btn"
      onclick={() => player.toggleMute()}
      aria-label={player.muted ? '取消静音' : '静音'}
    >
      <Icon icon={speaker} size={17} />
    </button>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={player.muted ? 0 : player.volume}
      oninput={(e) => player.setVolume(Number(e.currentTarget.value))}
      aria-label="音量"
      style="--value: {(player.muted ? 0 : player.volume) * 100}%"
    />
  </div>

  {#if player.error}
    <p class="mt-2 text-[0.8125rem] text-warning" role="status">{player.error}</p>
  {/if}

  <div class="flex items-center gap-2">
    <div class="tabs flex-1" role="tablist" aria-label="面板内容">
      <button type="button" role="tab" aria-selected={tab === 'lyrics'} onclick={() => (tab = 'lyrics')}>歌词</button>
      <button type="button" role="tab" aria-selected={tab === 'list'} onclick={showList}>
        播放列表
        {#if player.playlist}<span class="tabular text-fg-subtle">{player.playlist.tracks.length}</span>{/if}
      </button>
    </div>
    {#if tab === 'lyrics' && player.lyricVariants.length > 1}
      <button
        type="button"
        class="variant"
        onclick={() => player.cycleLyricVariant()}
        aria-label="切换歌词版本"
        title={player.lyricVariants.map((v) => v.label).join(' / ')}
      >
        {player.lyricVariants.find((v) => v.key === player.lyricVariant)?.label ?? '原'}
      </button>
    {/if}
  </div>

  {#if tab === 'lyrics'}
    <div
      class="pane lyrics"
      bind:this={lyricBox}
      onwheel={markUserScroll}
      ontouchmove={markUserScroll}
      role="tabpanel"
      tabindex="0"
    >
      {#if !player.started && !player.track}
        <p class="hint">选一首歌开始播放</p>
      {:else if player.lyricStatus === 'loading' || player.lyricStatus === 'idle'}
        <div class="space-y-3 py-6">
          {#each [72, 56, 64, 48] as width}
            <div class="skeleton mx-auto h-3.5" style="width: {width}%"></div>
          {/each}
        </div>
      {:else if player.lyricStatus === 'none'}
        <p class="hint">纯音乐，没有歌词</p>
      {:else if player.lyricStatus === 'error'}
        <p class="hint">歌词由后端服务提供，现在连不上</p>
      {:else}
        <ol class="py-[40%]">
          {#each player.lyrics as line, i}
            <li data-line={i} class:current={i === player.lyricIndex}>
              <button type="button" onclick={() => player.seek(line.time)}>
                <span class="block">{line.text}</span>
                {#if line.translation}<span class="block translation">{line.translation}</span>{/if}
              </button>
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  {:else}
    {#if player.sources.length > 1}
      <div class="sources" role="radiogroup" aria-label="曲库">
        {#each player.sources as source}
          <button type="button" role="radio" aria-checked={listSource === source} onclick={() => (listSource = source)}>
            {SOURCE_LABEL[source]}<span class="tabular">{player.libraries[source]?.tracks.length}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="pane list" bind:this={listBox} role="tabpanel" tabindex="0">
      {#if listLibrary}
        <ol>
          {#each listLibrary.tracks as track, i (track.key)}
            {@const isCurrent = listSource === player.source && i === player.index}
            <li>
              <button
                type="button"
                class="row"
                aria-current={isCurrent}
                onclick={() => player.play(i, listSource)}
              >
                <span class="idx tabular">
                  {#if isCurrent && player.started}
                    <PlayingBars playing={player.playing} size={12} />
                  {:else}
                    {i + 1}
                  {/if}
                </span>
                <span class="min-w-0 flex-1 text-left">
                  <span class="block truncate">{track.name}</span>
                  <span class="block truncate text-[0.75rem] text-fg-subtle">{track.artists.join(' / ')}</span>
                </span>
                <span class="tabular text-[0.75rem] text-fg-subtle">{track.duration ? formatDuration(track.duration) : ''}</span>
              </button>
            </li>
          {/each}
        </ol>
        {#if listLibrary.hidden > 0}
          <p class="hint !py-3">
            另有 {listLibrary.hidden} 首{listLibrary.source === 'netease' ? '会员或无版权歌曲' : '被隐藏的曲目'}未列出
          </p>
        {/if}
      {/if}
    </div>
  {/if}

  <footer>
    {#if player.playlist?.source === 'local'}
      <Icon icon={iVinylRecord} size={14} />
      <span class="truncate">本地曲库 · {player.playlist.tracks.length} 首</span>
    {:else}
      <Icon icon={iBrandNeteasecloudmusic} size={14} class="text-[#e60026]" />
      <a href={player.playlist?.url ?? 'https://music.163.com/'} target="_blank" rel="noopener noreferrer" class="truncate hover:text-fg">
        {player.playlist ? `网易云 · 歌单《${player.playlist.name}》` : '网易云音乐'}
      </a>
    {/if}
  </footer>
</div>

<style>
  .panel {
    width: min(380px, calc(100vw - 24px));
    padding: 1rem 1rem 0.75rem;
    box-shadow: var(--shadow-lg);
  }
  .cover {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-2);
    color: var(--fg-subtle);
    box-shadow: var(--shadow-sm);
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .volume {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.35rem;
    padding-right: 0.5rem;
  }
  .volume input {
    flex: 1;
    height: 18px;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  .volume input::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--fg-muted) var(--value),
      color-mix(in oklab, var(--fg) 12%, transparent) var(--value)
    );
  }
  .volume input::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: color-mix(in oklab, var(--fg) 12%, transparent);
  }
  .volume input::-moz-range-progress {
    height: 4px;
    border-radius: 999px;
    background: var(--fg-muted);
  }
  .volume input::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    margin-top: -4px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow:
      0 0 0 1.5px var(--fg-muted),
      var(--shadow-sm);
  }
  .volume input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: 0 0 0 1.5px var(--fg-muted);
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 3px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .tabs button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    height: 1.9rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    color: var(--fg-muted);
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }
  .tabs button[aria-selected='true'] {
    background: var(--surface);
    color: var(--fg);
    box-shadow: var(--shadow-sm);
  }

  .variant {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 1.9rem;
    height: 1.9rem;
    margin-top: 0.75rem;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fg-muted);
  }
  .variant:hover {
    color: var(--fg);
  }
  .sources {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }
  .sources button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    height: 1.6rem;
    padding-inline: 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--fg-muted);
    border: 1px solid var(--line);
  }
  .sources button span {
    color: var(--fg-subtle);
  }
  .sources button[aria-checked='true'] {
    color: var(--accent-strong);
    background: var(--accent-soft);
    border-color: transparent;
  }

  .pane {
    height: 15rem;
    margin-top: 0.5rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .lyrics {
    mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
  }
  .lyrics li button {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    text-align: center;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--fg-subtle);
    transition:
      color 300ms ease,
      transform 400ms var(--ease-out-expo);
  }
  .lyrics li button:hover {
    color: var(--fg-muted);
  }
  .lyrics li.current button {
    color: var(--fg);
    font-weight: 600;
    transform: scale(1.04);
  }
  .lyrics .translation {
    margin-top: 0.1rem;
    font-size: 0.8125rem;
    font-weight: 400;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.45rem 0.5rem;
    border-radius: 10px;
    font-size: 0.875rem;
    color: var(--fg);
    transition: background-color 120ms ease;
  }
  .row:hover {
    background: var(--surface-2);
  }
  .row[aria-current='true'] {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }
  .idx {
    display: grid;
    place-items: center;
    width: 1.5rem;
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  .row[aria-current='true'] .idx {
    color: var(--accent);
  }

  .hint {
    padding: 4rem 0;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--fg-subtle);
  }

  footer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
</style>
