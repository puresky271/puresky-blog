/**
 * store.svelte.ts — 全局播放器状态。
 *
 * 整个站点只有一个 <audio>，由这个模块持有，而不是由某个组件持有：
 * 站内跳转时模块不会重新执行，所以音乐不会断；
 * 右下角浮动播放器和首页舞台读写的是同一份状态。
 *
 * 两个曲库：本地（构建期扫描，见 lib/local-media.ts）和网易云歌单。
 * 「当前队列」是其中一个，从哪个曲库点歌，队列就切到哪个。
 *
 * 视频过载（MV）是音乐过载的第二层：进入时记住音频播到哪、是否在播，暂停音频交给视频；
 * 退出时只在进入前正在播的情况下恢复音频。
 */

import type { Playlist } from '@shared/netease';

import { MUSIC } from '@/config';
import { api } from '@/lib/api';
import { withBase } from '@/lib/format';

import { lineAt, parseLrc, type LrcLine } from './lrc';
import { coverOf, fromNetease, type Library, type MediaTrack, type Source } from './types';

export type PlayMode = 'loop' | 'one' | 'shuffle';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'empty';
type LyricStatus = 'idle' | 'loading' | 'ready' | 'none' | 'error';

export interface LyricVariant {
  key: string;
  label: string;
}

export interface ResolvedVideo {
  kind: 'video' | 'iframe';
  url: string;
}

interface Saved {
  trackKey?: string;
  source?: Source;
  time?: number;
  volume?: number;
  muted?: boolean;
  mode?: PlayMode;
  lyricVariant?: string;
}

const STORAGE_KEY = 'player';
/** 连续失败这么多首就停下来，不在一个全是灰色歌曲的歌单里无限跳。 */
const MAX_CONSECUTIVE_FAILURES = 4;

const VARIANT_LABEL: Record<string, string> = { ja: '日', zh: '中', phonetic: '音', default: '原', orig: '原' };

function toLibrary(playlist: Playlist): Library {
  return {
    source: 'netease',
    name: playlist.name,
    tracks: playlist.tracks.map(fromNetease),
    hidden: playlist.hidden,
    url: `https://music.163.com/#/playlist?id=${playlist.id}`,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

class Player {
  libraries = $state<Record<Source, Library | null>>({ local: null, netease: null });
  /** 当前队列来自哪个曲库。 */
  source = $state<Source>('local');
  status = $state<LoadStatus>('idle');
  index = $state(0);
  playing = $state(false);
  buffering = $state(false);
  /** 秒。 */
  current = $state(0);
  /** 秒。元数据没到之前用曲目信息里的时长兜底。 */
  duration = $state(0);
  volume = $state<number>(MUSIC.defaultVolume);
  muted = $state(false);
  mode = $state<PlayMode>('loop');
  /** 本次会话里是否真正播放过。没播过时浮动播放器收成一个小按钮。 */
  started = $state(false);
  error = $state<string | null>(null);

  lyrics = $state<LrcLine[]>([]);
  lyricStatus = $state<LyricStatus>('idle');
  lyricVariants = $state<LyricVariant[]>([]);
  lyricVariant = $state('');

  /** 视频过载中。 */
  videoActive = $state(false);

  /** 浮动面板展开。 */
  panelOpen = $state(false);
  /** 首页舞台处于音乐（过载）模式且在视口内时，浮动播放器让位，屏幕上只留一个播放器。 */
  dockSuppressed = $state(false);

  playlist = $derived<Library | null>(this.libraries[this.source]);
  track = $derived<MediaTrack | null>(this.playlist?.tracks[this.index] ?? null);
  lyricIndex = $derived(lineAt(this.lyrics, this.current));
  progress = $derived(this.duration > 0 ? Math.min(1, this.current / this.duration) : 0);
  /** 两个曲库都有歌时，界面上才需要来源切换。 */
  sources = $derived((['local', 'netease'] as Source[]).filter((s) => this.libraries[s]?.tracks.length));

  #audio: HTMLAudioElement | null = null;
  #frame = 0;
  #failures = 0;
  #lyricCache = new Map<string, Record<string, string>>();
  #lyricRequest = 0;
  #shuffleHistory: number[] = [];
  #pendingSeek: number | null = null;
  #videoResume: { wasPlaying: boolean } | null = null;

  // ── 加载 ───────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    if (this.status !== 'idle') return;
    this.status = 'loading';
    const saved = this.#saved();
    this.#restorePrefs(saved);

    // 两份都是构建期快照（同源静态文件），快且总是可用。
    const [local, netease] = await Promise.all([
      fetchJson<Library>(withBase('/data/local-songs.json')),
      fetchJson<Playlist>(withBase('/data/playlist.json')),
    ]);
    if (local?.tracks?.length) this.libraries.local = local;
    if (netease?.tracks?.length) this.libraries.netease = toLibrary(netease);

    const preferred = saved.source && this.libraries[saved.source]?.tracks.length ? saved.source : null;
    this.source = preferred ?? (this.libraries.local?.tracks.length ? 'local' : 'netease');
    this.#restoreTrack(saved);
    this.status = this.playlist?.tracks.length ? 'ready' : 'empty';

    // 网易云歌单在后台问 worker 要最新的，拿到就替换，拿不到就沿用快照。
    void api<Playlist>(`/api/music/playlist/${MUSIC.playlistId}`, { timeoutMs: 10000 })
      .then((fresh) => {
        if (!fresh?.tracks?.length) return;
        const playingKey = this.source === 'netease' ? this.track?.key : null;
        this.libraries.netease = toLibrary(fresh);
        if (playingKey) {
          const found = this.libraries.netease.tracks.findIndex((t) => t.key === playingKey);
          if (found >= 0) this.index = found;
        }
        if (this.status === 'empty') {
          this.source = 'netease';
          this.status = 'ready';
        }
      })
      .catch(() => undefined);
  }

  #restoreTrack(saved: Saved): void {
    const tracks = this.playlist?.tracks ?? [];
    const found = saved.trackKey ? tracks.findIndex((t) => t.key === saved.trackKey) : -1;
    this.index = found >= 0 ? found : 0;
    if (this.track) this.duration = this.track.duration / 1000;
    if (found >= 0) this.current = saved.time ?? 0;
  }

  // ── 控制 ───────────────────────────────────────────────────────────────────

  async play(index?: number, source?: Source): Promise<void> {
    if (this.status === 'idle' || this.status === 'loading') await this.load();
    if (source && source !== this.source && this.libraries[source]) {
      this.source = source;
      this.#shuffleHistory = [];
      this.index = -1;
    }
    if (!this.playlist?.tracks.length) return;
    const audio = this.#ensureAudio();

    if (index !== undefined && index !== this.index) {
      this.#select(index);
    } else if (!audio.src) {
      this.#select(Math.max(0, this.index), this.started ? 0 : this.current);
    }

    if (this.videoActive) this.exitVideo(false);
    this.started = true;
    this.error = null;
    try {
      await audio.play();
    } catch (error) {
      // 浏览器拒绝自动播放（没有用户手势）时不算曲目失败。
      if ((error as DOMException).name !== 'NotAllowedError') this.#onTrackError();
    }
  }

  pause(): void {
    this.#audio?.pause();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else void this.play();
  }

  /** 硬退出：暂停并回到「没播放过」的状态，浮动播放器收回成小圆钮。进度保留，下次接着放。 */
  stop(): void {
    if (this.videoActive) this.exitVideo(false);
    this.#audio?.pause();
    this.started = false;
    this.panelOpen = false;
    this.error = null;
  }

  next(auto = false): void {
    const count = this.playlist?.tracks.length ?? 0;
    if (!count) return;
    if (auto && this.mode === 'one') {
      this.seek(0);
      void this.play();
      return;
    }
    let target: number;
    if (this.mode === 'shuffle' && count > 1) {
      this.#shuffleHistory.push(this.index);
      do target = Math.floor(Math.random() * count);
      while (target === this.index);
    } else {
      target = (this.index + 1) % count;
    }
    void this.play(target);
  }

  prev(): void {
    const count = this.playlist?.tracks.length ?? 0;
    if (!count) return;
    // 播过 3 秒以上时，「上一首」先回到本首开头，和主流播放器一致。
    if (this.current > 3) {
      this.seek(0);
      return;
    }
    const target =
      this.mode === 'shuffle' && this.#shuffleHistory.length
        ? this.#shuffleHistory.pop()!
        : (this.index - 1 + count) % count;
    void this.play(target);
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(seconds, this.duration || seconds));
    this.current = clamped;
    if (this.#audio?.src) this.#audio.currentTime = clamped;
    else this.#pendingSeek = clamped;
    this.#updatePosition();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.muted = this.volume === 0;
    if (this.#audio) {
      this.#audio.volume = this.volume;
      this.#audio.muted = this.muted;
    }
    this.#persist();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.#audio) this.#audio.muted = this.muted;
    if (!this.muted && this.volume === 0) this.setVolume(MUSIC.defaultVolume);
    this.#persist();
  }

  cycleMode(): void {
    this.mode = this.mode === 'loop' ? 'one' : this.mode === 'one' ? 'shuffle' : 'loop';
    this.#shuffleHistory = [];
    this.#persist();
  }

  /** 在可用的歌词版本之间轮换（原文 / 中文 / 注音）。 */
  cycleLyricVariant(): void {
    if (this.lyricVariants.length < 2 || !this.track) return;
    const i = this.lyricVariants.findIndex((v) => v.key === this.lyricVariant);
    this.lyricVariant = this.lyricVariants[(i + 1) % this.lyricVariants.length].key;
    const texts = this.#lyricCache.get(this.track.key);
    if (texts) this.#composeLyrics(texts);
    this.#persist();
  }

  cover(size: number): string {
    return coverOf(this.track, size);
  }

  // ── 视频过载 ───────────────────────────────────────────────────────────────

  /** 当前曲目的 MV 地址。网易云 MV 地址带时效签名，每次现取。 */
  async resolveVideo(): Promise<ResolvedVideo | null> {
    const video = this.track?.video;
    if (!video) return null;
    if (video.kind === 'file') return { kind: 'video', url: video.url };
    if (video.kind === 'bilibili') {
      return {
        kind: 'iframe',
        url: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(video.bvid)}&page=${video.page}&autoplay=1&high_quality=1&danmaku=0`,
      };
    }
    const data = await api<{ url: string | null }>(`/api/music/mv/${video.mv}`, { credentials: 'omit' });
    return data.url ? { kind: 'video', url: data.url } : null;
  }

  enterVideo(): void {
    if (this.videoActive || !this.track?.video) return;
    this.#videoResume = { wasPlaying: this.playing };
    this.#audio?.pause();
    this.videoActive = true;
  }

  /** resume 为 false 时只退出视频，不恢复音频（用于切歌、硬退出）。 */
  exitVideo(resume = true): void {
    if (!this.videoActive) return;
    this.videoActive = false;
    const shouldResume = resume && this.#videoResume?.wasPlaying;
    this.#videoResume = null;
    if (shouldResume) void this.#audio?.play().catch(() => undefined);
  }

  // ── 内部 ───────────────────────────────────────────────────────────────────

  #select(index: number, startAt = 0): void {
    const audio = this.#ensureAudio();
    if (this.videoActive) this.exitVideo(false);
    this.index = index;
    const track = this.track;
    if (!track) return;
    this.current = startAt;
    this.duration = track.duration / 1000;
    this.#pendingSeek = startAt > 0 ? startAt : null;
    audio.src = track.audio;
    audio.load();
    void this.#loadLyrics(track);
    this.#updateMediaSession();
    this.#persist();
  }

  #ensureAudio(): HTMLAudioElement {
    if (this.#audio) return this.#audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = this.volume;
    audio.muted = this.muted;

    audio.addEventListener('play', () => {
      this.playing = true;
      this.#tick();
      this.#updatePosition();
    });
    audio.addEventListener('pause', () => {
      this.playing = false;
      cancelAnimationFrame(this.#frame);
      this.current = audio.currentTime;
      this.#persist();
    });
    audio.addEventListener('waiting', () => (this.buffering = true));
    audio.addEventListener('playing', () => {
      this.buffering = false;
      this.#failures = 0;
    });
    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration)) this.duration = audio.duration;
      if (this.#pendingSeek !== null) {
        audio.currentTime = this.#pendingSeek;
        this.#pendingSeek = null;
      }
      this.#updatePosition();
    });
    audio.addEventListener('ended', () => this.next(true));
    audio.addEventListener('error', () => this.#onTrackError());

    this.#audio = audio;
    this.#bindMediaSession();

    // 关页面或切到后台时记一下进度，下次打开能接着放。
    window.addEventListener('pagehide', () => this.#persist());
    return audio;
  }

  /** 播放时用 rAF 推进进度，比 timeupdate 的 4Hz 平滑得多。后台标签页里浏览器会自动降频。 */
  #tick = (): void => {
    if (!this.#audio || this.#audio.paused) return;
    this.current = this.#audio.currentTime;
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #onTrackError(): void {
    // 首次进入页面、还没开始播放时，audio 上没有 src 也会触发 error，忽略。
    if (!this.#audio?.src) return;
    this.buffering = false;
    this.#failures += 1;
    if (this.#failures >= MAX_CONSECUTIVE_FAILURES) {
      this.playing = false;
      this.error = '连续几首都无法播放，可能是网络或版权限制。';
      this.#failures = 0;
      return;
    }
    this.error = `「${this.track?.name ?? '这首歌'}」无法播放，已跳到下一首`;
    setTimeout(() => this.next(), 900);
  }

  async #loadLyrics(track: MediaTrack): Promise<void> {
    const request = ++this.#lyricRequest;
    const cached = this.#lyricCache.get(track.key);
    if (cached) {
      this.#setVariants(track, cached);
      return;
    }
    this.lyrics = [];
    this.lyricVariants = [];
    this.lyricStatus = 'loading';
    try {
      let texts: Record<string, string>;
      if (track.source === 'netease') {
        const data = await api<{ lrc: string; tlrc: string }>(`/api/music/lyric/${track.id}`, { credentials: 'omit' });
        texts = { orig: data.lrc, zh: data.tlrc };
      } else {
        // 本地歌词是同源静态文件，直接取。
        const entries = await Promise.all(
          (track.lyrics ?? []).map(async (l) => [l.lang, await fetch(l.url).then((r) => (r.ok ? r.text() : ''))] as const)
        );
        texts = Object.fromEntries(entries);
      }
      this.#lyricCache.set(track.key, texts);
      // 用户切歌很快时，丢弃过期的响应。
      if (request !== this.#lyricRequest) return;
      this.#setVariants(track, texts);
    } catch {
      if (request === this.#lyricRequest) this.lyricStatus = 'error';
    }
  }

  #setVariants(track: MediaTrack, texts: Record<string, string>): void {
    const keys =
      track.source === 'netease'
        ? texts.orig
          ? ['orig']
          : []
        : ['ja', 'zh', 'phonetic', 'default'].filter((k) => texts[k]);
    this.lyricVariants = keys.map((key) => ({ key, label: VARIANT_LABEL[key] ?? key }));
    if (!keys.includes(this.lyricVariant)) {
      const saved = this.#saved().lyricVariant;
      this.lyricVariant = saved && keys.includes(saved) ? saved : (keys[0] ?? '');
    }
    this.#composeLyrics(texts);
  }

  /** 主行用选中的版本，副行：原文配中文翻译，注音配原文。 */
  #composeLyrics(texts: Record<string, string>): void {
    const variant = this.lyricVariant;
    const main = texts[variant] ?? '';
    const sub =
      variant === 'orig' || variant === 'ja' || variant === 'default'
        ? (texts.zh ?? '')
        : variant === 'phonetic'
          ? (texts.ja ?? texts.default ?? '')
          : '';
    const lines = main ? parseLrc(main, sub) : [];
    this.lyrics = lines;
    this.lyricStatus = lines.length ? 'ready' : 'none';
  }

  #bindMediaSession(): void {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    session.setActionHandler('play', () => void this.play());
    session.setActionHandler('pause', () => this.pause());
    session.setActionHandler('previoustrack', () => this.prev());
    session.setActionHandler('nexttrack', () => this.next());
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
  }

  #updateMediaSession(): void {
    if (!('mediaSession' in navigator) || !this.track) return;
    const track = this.track;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artists.join(' / '),
      album: track.album,
      artwork: track.cover
        ? [96, 256, 512].map((size) => ({ src: coverOf(track, size), sizes: `${size}x${size}` }))
        : [],
    });
  }

  #updatePosition(): void {
    if (!('mediaSession' in navigator) || !this.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: this.duration,
        position: Math.min(this.current, this.duration),
        playbackRate: 1,
      });
    } catch {
      // 部分浏览器在元数据未就绪时会抛错，忽略即可。
    }
  }

  #saved(): Saved {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Saved;
    } catch {
      return {};
    }
  }

  #restorePrefs(saved: Saved): void {
    if (typeof saved.volume === 'number') this.volume = saved.volume;
    if (typeof saved.muted === 'boolean') this.muted = saved.muted;
    if (saved.mode === 'loop' || saved.mode === 'one' || saved.mode === 'shuffle') this.mode = saved.mode;
    if (saved.lyricVariant) this.lyricVariant = saved.lyricVariant;
  }

  #persist(): void {
    try {
      const data: Saved = {
        trackKey: this.track?.key,
        source: this.source,
        time: Math.floor(this.#audio?.currentTime ?? this.current),
        volume: this.volume,
        muted: this.muted,
        mode: this.mode,
        lyricVariant: this.lyricVariant,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 存不进去就算了，只是下次不能接着放。
    }
  }
}

export const player = new Player();
