<script lang="ts">
  /**
   * PanoramaLyricsDemo.svelte — 《端程山》日文原文、B站版翻译、网易云版翻译交互对照与进度联动阅读器。
   *
   * 两种嵌入形态（由 YAML config 决定）：
   *   1. 全曲工作台（省略配置）：顶栏带播放控制、实时进度、译文视图切换（双版对照 / B站版 / 网易云 / 纯日文）、
   *      振假名开关、仅看有批注句开关、跟随滚动开关、内嵌 MV 视频舱；下方按 6 个乐段排开，
   *      关键句右侧附带严格对齐该行日文硬字幕的 MV 分镜截图（点击截图走全站灯箱放大，不跳转音频进度）。
   *   2. 局部精读卡（lines: 16-19）：嵌在文章具体论述段落旁，只展示指定的几行对照、MV 帧与批注。
   */
  import { slide } from 'svelte/transition';

  import Icon from '@/components/ui/Icon.svelte';
  import PlayingBars from '@/components/player/PlayingBars.svelte';
  import { formatDuration, withBase } from '@/lib/format';
  import {
    PANORAMA_LINES,
    PANORAMA_STANZAS,
    type PanoramaLine,
  } from '@/lib/animations/panorama-lyrics';
  import {
    iCaretDown,
    iMonitor,
    iMusicNotes,
    iPauseFill,
    iPlayFill,
  } from '@/lib/icons.generated';
  import { player } from '@/lib/player/store.svelte';

  import type { AnimationProps } from './mount';

  const { config = {} }: AnimationProps = $props();

  const SONG_KEY = 'local:端程山';

  type ViewMode = 'compare' | 'bili' | 'netease' | 'ja';

  const isCompact = $derived(typeof config.lines === 'string' || typeof config.stanza === 'string');
  const cardTitle = $derived(typeof config.title === 'string' ? config.title : '');

  /** 解析要展示的行范围 */
  const visibleLines = $derived.by<PanoramaLine[]>(() => {
    if (typeof config.stanza === 'string') {
      const st = PANORAMA_STANZAS.find((s) => s.id === config.stanza);
      if (st) return PANORAMA_LINES.slice(st.startIndex, st.endIndex + 1);
    }
    if (typeof config.lines === 'string') {
      const m = config.lines.trim().match(/^(\d+)(?:\s*[-–~]\s*(\d+))?$/);
      if (m) {
        // config 里支持 1-based 行号（1..45）
        const start = Math.max(1, Number(m[1])) - 1;
        const end = m[2] ? Math.min(PANORAMA_LINES.length, Number(m[2])) - 1 : start;
        if (start <= end) return PANORAMA_LINES.slice(start, end + 1);
      }
    }
    return [...PANORAMA_LINES];
  });

  let viewMode = $state<ViewMode>('compare');
  let showRuby = $state(true);
  let showRomaji = $state(false);
  let onlyAnnotated = $state(false);
  let autoFollow = $state(true);
  let mvOpen = $state(false);
  let mvVideoEl = $state<HTMLVideoElement>();
  /** 记录用户手动展开/收起的批注行 */
  let openNotes = $state<Record<number, boolean>>({});
  let expandedInitialized = false;

  $effect(() => {
    if (expandedInitialized) return;
    expandedInitialized = true;
    const initial: Record<number, boolean> = {};
    for (const line of visibleLines) {
      if (line.note && (isCompact || line.index === 0 || line.index === 16 || line.index === 19 || line.index === 40)) {
        initial[line.index] = true;
      }
    }
    openNotes = initial;
  });

  const filteredLines = $derived(
    onlyAnnotated && !isCompact ? visibleLines.filter((l) => Boolean(l.note)) : visibleLines
  );

  /** 当前播放器是否在放《端程山》 */
  const isSongLoaded = $derived(
    player.track?.key === SONG_KEY || player.track?.name === '端程山'
  );
  const isSongPlaying = $derived(isSongLoaded && player.playing);

  /** 根据 player.current 计算当前高亮的《端程山》行下标（0..44） */
  const activeLineIndex = $derived.by<number>(() => {
    if (!isSongLoaded || !player.started) return -1;
    const t = player.current + 0.2;
    let lo = 0;
    let hi = PANORAMA_LINES.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (PANORAMA_LINES[mid].time <= t) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  });

  let listContainer = $state<HTMLDivElement>();
  let userScrollStamp = 0;

  $effect(() => {
    const idx = activeLineIndex;
    if (isCompact || !autoFollow || !isSongPlaying || idx < 0 || !listContainer) return;
    if (Date.now() - userScrollStamp < 3500) return;
    const el = listContainer.querySelector<HTMLElement>(`[data-lyric-idx="${idx}"]`);
    if (!el) return;
    const boxRect = listContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - boxRect.top + listContainer.scrollTop - listContainer.clientHeight * 0.34;
    listContainer.scrollTo({
      top: Math.max(0, offset),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });

  interface RubyPart {
    kanji?: string;
    rt?: string;
    plain?: string;
  }

  function parseRuby(input: string): RubyPart[] {
    const parts: RubyPart[] = [];
    const re = /([\u4e00-\u9fff々ヶ]+)[（(]([^）)]+)[）)]/g;
    let last = 0;
    for (const match of input.matchAll(re)) {
      const start = match.index ?? 0;
      if (start > last) parts.push({ plain: input.slice(last, start) });
      parts.push({ kanji: match[1], rt: match[2] });
      last = start + match[0].length;
    }
    if (last < input.length) parts.push({ plain: input.slice(last) });
    return parts;
  }

  function formatStamp(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function togglePlay() {
    if (mvOpen && mvVideoEl) {
      if (mvVideoEl.paused) await mvVideoEl.play().catch(() => undefined);
      else mvVideoEl.pause();
      return;
    }
    if (isSongLoaded && player.started) {
      player.toggle();
    } else {
      const firstLine = visibleLines[0];
      await player.playTrack(SONG_KEY, isCompact && firstLine ? firstLine.time : undefined);
    }
  }

  async function seekLine(line: PanoramaLine) {
    if (mvOpen && mvVideoEl) {
      mvVideoEl.currentTime = line.time;
      if (mvVideoEl.paused) await mvVideoEl.play().catch(() => undefined);
      return;
    }
    await player.playTrack(SONG_KEY, line.time);
  }

  function toggleNote(idx: number) {
    openNotes = { ...openNotes, [idx]: !openNotes[idx] };
  }

  function toggleMvDrawer() {
    mvOpen = !mvOpen;
    if (mvOpen && isSongPlaying) {
      player.pause();
    }
  }

  const annotatedCount = $derived(visibleLines.filter((l) => l.note).length);
</script>

<section
  class="pano-shell"
  class:compact={isCompact}
  aria-label={cardTitle || '《端程山》双版本歌词对照与音画联动'}
>
  <!-- 顶部控制栏 -->
  <header class="pano-bar">
    <div class="pano-bar-left">
      <button
        type="button"
        class="pano-play-btn"
        class:playing={isSongPlaying}
        onclick={togglePlay}
        aria-label={isSongPlaying ? '暂停《端程山》' : '播放《端程山》'}
      >
        <Icon icon={isSongPlaying ? iPauseFill : iPlayFill} size={13} />
        <span>{isSongPlaying ? '暂停' : isCompact ? '试听本段' : '播放原曲'}</span>
      </button>

      {#if cardTitle}
        <span class="pano-card-title">{cardTitle}</span>
      {:else}
        <span class="pano-time tabular">
          {#if isSongLoaded && player.started}
            <PlayingBars playing={isSongPlaying} size={10} />
            <span>{formatDuration(player.current * 1000)} / {formatDuration((player.duration || 261) * 1000)}</span>
          {:else}
            <Icon icon={iMusicNotes} size={12} />
            <span>点击时间戳或日文歌词可跳转唱段</span>
          {/if}
        </span>
      {/if}
    </div>

    <div class="pano-bar-right">
      <div class="pano-modes" role="tablist" aria-label="译文视图切换">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'compare'}
          onclick={() => (viewMode = 'compare')}
        >对照</button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'bili'}
          onclick={() => (viewMode = 'bili')}
        >B站版</button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'netease'}
          onclick={() => (viewMode = 'netease')}
        >网易云</button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'ja'}
          onclick={() => (viewMode = 'ja')}
        >原文</button>
      </div>

      <button
        type="button"
        class="pano-chip"
        class:active={showRuby}
        onclick={() => (showRuby = !showRuby)}
        title="开关日文汉字振假名注音"
      >注音</button>

      {#if !isCompact}
        <button
          type="button"
          class="pano-chip"
          class:active={showRomaji}
          onclick={() => (showRomaji = !showRomaji)}
          title="显示罗马音"
        >罗马音</button>

        <button
          type="button"
          class="pano-chip"
          class:active={onlyAnnotated}
          onclick={() => (onlyAnnotated = !onlyAnnotated)}
          title="只筛选带有翻译批注的句子"
        >只看批注 ({annotatedCount})</button>

        <button
          type="button"
          class="pano-chip"
          class:active={autoFollow}
          onclick={() => (autoFollow = !autoFollow)}
          title="播放时自动滚动到当前唱句"
        >跟随</button>

        <button
          type="button"
          class="pano-chip"
          class:active={mvOpen}
          onclick={toggleMvDrawer}
          title="展开或收起原版 MV 视频"
        >
          <Icon icon={iMonitor} size={12} />
          <span>{mvOpen ? '收起 MV' : '原版 MV'}</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- 可选展开的内嵌原版 1080p MV 视频舱 -->
  {#if mvOpen && !isCompact}
    <div class="pano-mv-drawer" transition:slide={{ duration: 220 }}>
      <div class="pano-mv-video-wrap">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={mvVideoEl}
          src={withBase('/media/songs/videos/%E7%AB%AF%E7%A8%8B%E5%B1%B1.mp4')}
          poster={withBase('/media/panorama/mv-004s-title.jpg')}
          controls
          playsinline
          preload="metadata"
        ></video>
      </div>
      <p class="pano-mv-caption">
        MyGO!!!!! 5th Single《端程山》1080p 原版 MV。打开视频舱时点击下方任意歌词时间戳，可直接让视频跳转到对应分镜。
      </p>
    </div>
  {/if}

  <!-- 歌词主体区 -->
  <div
    class="pano-body"
    role="region"
    aria-label="歌词对照列表"
    bind:this={listContainer}
    onwheel={() => (userScrollStamp = Date.now())}
    ontouchmove={() => (userScrollStamp = Date.now())}
  >
    {#each PANORAMA_STANZAS as stanza (stanza.id)}
      {@const stanzaLines = filteredLines.filter((l) => l.stanzaId === stanza.id)}
      {#if stanzaLines.length > 0}
        <div class="pano-stanza">
          {#if !isCompact}
            <div class="stanza-head">
              <span class="stanza-title">{stanza.title}</span>
              <span class="stanza-sub">{stanza.subtitle}</span>
            </div>
          {/if}

          <div class="stanza-rows">
            {#each stanzaLines as line (line.index)}
              {@const isCurrent = activeLineIndex === line.index}
              {@const noteOpen = Boolean(openNotes[line.index])}
              <div
                class="lyric-item"
                class:is-current={isCurrent}
                data-lyric-idx={line.index}
              >
                <div class="lyric-main-grid" class:with-shot={Boolean(line.mvFrame)}>
                  <div class="lyric-content">
                    <!-- 第一行：时间戳跳播按钮 + 日语原句 + 批注开关 -->
                    <div class="ja-row">
                      <button
                        type="button"
                        class="stamp-btn tabular"
                        onclick={() => seekLine(line)}
                        title={`从 ${formatStamp(line.time)} 播放`}
                      >
                        {#if isCurrent && isSongPlaying}
                          <PlayingBars playing size={9} />
                        {:else}
                          <span class="line-no">{String(line.index + 1).padStart(2, '0')}</span>
                        {/if}
                        <span>{formatStamp(line.time)}</span>
                      </button>

                      <button
                        type="button"
                        class="ja-text"
                        lang="ja"
                        onclick={() => seekLine(line)}
                      >
                        {#if showRuby}
                          {#each parseRuby(line.jaRuby) as part}
                            {#if part.kanji}
                              <ruby>{part.kanji}<rt>{part.rt}</rt></ruby>
                            {:else}
                              {part.plain}
                            {/if}
                          {/each}
                        {:else}
                          {line.ja}
                        {/if}
                      </button>

                      {#if line.note}
                        <button
                          type="button"
                          class="note-toggle"
                          class:open={noteOpen}
                          onclick={() => toggleNote(line.index)}
                          aria-expanded={noteOpen}
                        >
                          <span>{line.note.badge}</span>
                          <span class="caret" class:open={noteOpen}><Icon icon={iCaretDown} size={11} /></span>
                        </button>
                      {/if}
                    </div>

                    {#if showRomaji}
                      <p class="romaji-line">{line.romaji}</p>
                    {/if}

                    <!-- 译文对照行：干净克制的标签 + 文本对照 -->
                    {#if viewMode !== 'ja'}
                      <div class="trans-list" data-mode={viewMode}>
                        {#if viewMode === 'compare' || viewMode === 'bili'}
                          <div class="trans-row bili">
                            <span class="src-label">B站</span>
                            <span class="trans-text">{line.bili}</span>
                          </div>
                        {/if}
                        {#if viewMode === 'compare' || viewMode === 'netease'}
                          <div class="trans-row netease">
                            <span class="src-label">网易云</span>
                            <span class="trans-text">{line.netease}</span>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- 右侧伴随的 MV 关键画面帧：点击放大看高清原图（走 Lightbox），不跳转进度 -->
                  {#if line.mvFrame}
                    <figure class="mv-shot">
                      <div class="mv-shot-frame">
                        <img
                          src={withBase(`/media/panorama/${line.mvFrame.src}`)}
                          data-zoom={withBase(`/media/panorama/${line.mvFrame.src}`)}
                          alt={line.mvFrame.caption}
                          loading="lazy"
                          width="320"
                          height="180"
                        />
                        <span class="mv-shot-stamp tabular">{line.mvFrame.timeLabel}</span>
                      </div>
                      <figcaption>{line.mvFrame.caption}</figcaption>
                    </figure>
                  {/if}
                </div>

                <!-- 展开的深度点评区：去掉侧边粗彩条，采用温和的书页眉批卡片 -->
                {#if line.note && noteOpen}
                  <aside class="note-drawer" transition:slide={{ duration: 180 }} aria-label="译文批注">
                    <p class="note-title">{line.note.title}</p>
                    <div class="note-cols">
                      {#if line.note.grammar}
                        <div class="note-block">
                          <span class="note-dim-label">日文词法与句法</span>
                          <p>{line.note.grammar}</p>
                        </div>
                      {/if}
                      {#if line.note.imagery}
                        <div class="note-block">
                          <span class="note-dim-label">意境与叙事语感</span>
                          <p>{line.note.imagery}</p>
                        </div>
                      {/if}
                    </div>
                  </aside>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .pano-shell {
    margin-block: 1.6rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 75%, transparent);
    font-family: var(--font-sans);
    overflow: hidden;
  }

  /* 顶部控制栏 */
  .pano-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem 0.9rem;
    padding: 0.65rem 0.95rem;
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface-2) 45%, transparent);
  }
  .pano-bar-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .pano-play-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: 1.75rem;
    padding-inline: 0.7rem;
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--fg) 16%, var(--line));
    background: var(--surface);
    color: var(--fg);
    font-size: 0.75rem;
    font-weight: 600;
    transition:
      border-color 150ms ease,
      background-color 150ms ease,
      color 150ms ease;
  }
  .pano-play-btn:hover {
    border-color: var(--fg-muted);
  }
  .pano-play-btn.playing {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-fg);
  }
  .pano-card-title {
    font-family: var(--font-serif);
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--fg-muted);
  }
  .pano-time {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.73rem;
    color: var(--fg-subtle);
  }

  .pano-bar-right {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .pano-modes {
    display: inline-flex;
    padding: 2px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
  }
  .pano-modes button {
    height: 1.5rem;
    padding-inline: 0.52rem;
    border-radius: 6px;
    font-size: 0.71rem;
    color: var(--fg-muted);
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }
  .pano-modes button:hover {
    color: var(--fg);
  }
  .pano-modes button[aria-selected='true'] {
    background: var(--surface-2);
    color: var(--fg);
    font-weight: 600;
  }

  .pano-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    height: 1.62rem;
    padding-inline: 0.55rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: transparent;
    font-size: 0.71rem;
    color: var(--fg-muted);
    transition:
      border-color 140ms ease,
      background-color 140ms ease,
      color 140ms ease;
  }
  .pano-chip:hover {
    color: var(--fg);
    border-color: var(--line-strong);
  }
  .pano-chip.active {
    background: var(--surface-2);
    border-color: var(--line-strong);
    color: var(--fg);
    font-weight: 600;
  }

  /* MV 抽屉 */
  .pano-mv-drawer {
    padding: 0.9rem 1rem;
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklab, var(--bg) 50%, var(--surface));
  }
  .pano-mv-video-wrap {
    position: relative;
    width: 100%;
    max-width: 40rem;
    margin-inline: auto;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: #070a12;
  }
  .pano-mv-video-wrap video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .pano-mv-caption {
    margin: 0.5rem auto 0 !important;
    max-width: 40rem;
    text-indent: 0 !important;
    text-align: center !important;
    font-size: 0.74rem;
    color: var(--fg-subtle);
  }

  /* 歌词滚动容器 */
  .pano-body {
    max-height: 42rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.65rem 1rem 0.9rem;
  }
  .pano-shell.compact .pano-body {
    max-height: none;
    overflow-y: visible;
    padding: 0.55rem 0.95rem 0.75rem;
  }

  .pano-stanza + .pano-stanza {
    margin-top: 1.4rem;
    padding-top: 1.1rem;
    border-top: 1px solid var(--line);
  }
  .stanza-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed var(--line);
  }
  .stanza-title {
    font-family: var(--font-serif);
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--fg);
  }
  .stanza-sub {
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }

  .stanza-rows {
    display: flex;
    flex-direction: column;
  }

  .lyric-item {
    padding: 0.65rem 0.35rem;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 55%, transparent);
    transition: background-color 180ms ease;
  }
  .lyric-item:last-child {
    border-bottom: 0;
  }
  .lyric-item.is-current {
    border-radius: 8px;
    background: color-mix(in oklab, var(--accent) 5%, var(--surface-2));
    padding-inline: 0.6rem;
  }

  .lyric-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.85rem;
    align-items: start;
  }
  @media (width >= 42rem) {
    .lyric-main-grid.with-shot {
      grid-template-columns: minmax(0, 1fr) 12.25rem;
    }
  }

  .ja-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.55rem;
  }
  .stamp-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-subtle);
    transition: color 140ms ease;
  }
  .stamp-btn .line-no {
    opacity: 0.6;
  }
  .stamp-btn:hover,
  .lyric-item.is-current .stamp-btn {
    color: var(--accent);
  }

  .ja-text {
    text-align: left;
    font-family: var(--font-serif);
    font-size: 0.96rem;
    font-weight: 700;
    line-height: 1.95;
    color: var(--fg);
    transition: color 140ms ease;
  }
  .ja-text:hover {
    color: var(--accent);
  }
  .ja-text ruby {
    ruby-align: center;
  }
  .ja-text rt {
    font-family: var(--font-sans);
    font-size: 0.56em;
    font-weight: 400;
    color: var(--fg-subtle);
  }

  .romaji-line {
    margin: 0.05rem 0 0.2rem 3.4rem !important;
    text-indent: 0 !important;
    font-family: var(--font-mono);
    font-size: 0.69rem;
    color: var(--fg-subtle);
  }

  .note-toggle {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    height: 1.38rem;
    padding-inline: 0.48rem;
    border-radius: 6px;
    font-size: 0.68rem;
    color: var(--fg-muted);
    border: 1px solid var(--line);
    background: var(--surface);
    transition:
      border-color 140ms ease,
      color 140ms ease;
  }
  .note-toggle:hover,
  .note-toggle.open {
    border-color: var(--line-strong);
    color: var(--fg);
  }
  .note-toggle .caret {
    display: inline-flex;
    transition: transform 180ms ease;
  }
  .note-toggle .caret.open {
    transform: rotate(180deg);
  }

  /* 译文对照行：无彩色盒子，靠等宽小字签区分版本 */
  .trans-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.25rem;
    margin-top: 0.3rem;
    padding-left: 3.4rem;
  }
  @media (width < 36rem) {
    .trans-list,
    .romaji-line {
      padding-left: 0;
      margin-left: 0 !important;
    }
  }
  @media (width >= 38rem) {
    .trans-list[data-mode='compare'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
  }

  .trans-row {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    font-size: 0.84rem;
    line-height: 1.6;
  }
  .src-label {
    flex-shrink: 0;
    width: 2.5rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    color: var(--fg-subtle);
  }
  .trans-row.bili .trans-text {
    color: var(--fg-muted);
  }
  .trans-row.netease .trans-text {
    color: var(--fg);
  }

  /* 右侧 MV 分镜截图：点击触发全站 Lightbox 放大，不跳转音频 */
  .mv-shot {
    margin: 0 !important;
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }
  .mv-shot-frame {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: var(--surface-2);
  }
  .mv-shot-frame img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border: 0 !important;
    border-radius: 0 !important;
    cursor: zoom-in !important;
  }
  .mv-shot-stamp {
    position: absolute;
    right: 5px;
    bottom: 5px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgb(8 12 20 / 0.66);
    color: rgb(255 255 255 / 0.92);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    pointer-events: none;
  }
  .mv-shot figcaption {
    margin: 0 !important;
    max-width: none !important;
    text-align: left !important;
    font-size: 0.7rem !important;
    line-height: 1.45 !important;
    color: var(--fg-subtle) !important;
  }

  /* 深度批注面板：无侧边粗竖线，与歌词卡左缘对齐，用细框和纸面层次区隔 */
  .note-drawer {
    margin: 0.55rem 0 0.15rem;
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface-2) 55%, var(--surface));
  }
  @media (width < 36rem) {
    .note-drawer {
      margin-left: 0;
    }
  }
  .note-title {
    margin: 0 0 0.45rem !important;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed var(--line);
    text-indent: 0 !important;
    font-family: var(--font-serif);
    font-size: 0.84rem;
    font-weight: 800;
    color: var(--fg);
  }
  .note-cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.55rem;
  }
  @media (width >= 42rem) {
    .note-cols:has(> :nth-child(2)) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }
  }
  .note-block p {
    margin: 0.2rem 0 0 !important;
    text-indent: 0 !important;
    text-align: left !important;
    font-size: 0.78rem;
    line-height: 1.68;
    color: var(--fg-muted);
    white-space: pre-line;
  }
  .note-dim-label {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--fg-subtle);
  }
</style>
