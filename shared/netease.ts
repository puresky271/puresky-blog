/**
 * netease.ts — 网易云音乐歌单与歌词。
 *
 * 和 github.ts 一样，site 构建期和 worker 运行时共用。
 *
 * 只取元数据（曲目、封面、歌词），音频本身由访客浏览器直接请求网易云的外链地址：
 * 外链会按请求方 IP 判断版权区域，经 worker 代理会变成海外 IP，很多歌直接 404。
 */

export interface Track {
  id: number;
  name: string;
  artists: string[];
  album: string;
  /** https 封面地址，不带尺寸参数。用 coverAt() 取指定尺寸。 */
  cover: string;
  /** 毫秒。 */
  duration: number;
  /** MV id，没有 MV 时为 0。播放地址有时效，要在播放时经 worker 现取。 */
  mv: number;
}

export interface Playlist {
  id: string;
  name: string;
  cover: string;
  creator: string | null;
  description: string | null;
  tracks: Track[];
  /** 因为会员或版权原因被剔除的曲目数。 */
  hidden: number;
  fetchedAt: string;
}

export interface Lyric {
  /** 原文 LRC。纯音乐或无歌词时为空串。 */
  lrc: string;
  /** 翻译 LRC。没有翻译时为空串。 */
  tlrc: string;
}

export interface NeteaseFetchOptions {
  timeoutMs?: number;
  /** 最多保留多少首。歌单很长时前端列表也没必要全放。 */
  limit?: number;
}

const HEADERS = {
  // 网易云的接口会校验 referer，缺了直接返回空数据。
  referer: 'https://music.163.com/',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
};

export async function fetchPlaylist(id: string, options: NeteaseFetchOptions = {}): Promise<Playlist> {
  if (!/^\d{1,20}$/.test(id)) throw new Error(`歌单 id 不合法：${id}`);

  const response = await request(
    `https://music.163.com/api/v6/playlist/detail?id=${id}&n=1000`,
    options.timeoutMs
  );
  const payload = (await response.json()) as RawPlaylistResponse;
  if (payload.code !== 200 || !payload.playlist) {
    throw new Error(`网易云歌单 ${id} 返回 code=${payload.code}`);
  }

  const { playlist, privileges = [] } = payload;
  const privilegeById = new Map(privileges.map((p) => [p.id, p]));

  const tracks: Track[] = [];
  let hidden = 0;

  for (const raw of playlist.tracks ?? []) {
    // pl 是匿名用户可播放的最高码率，0 表示不能播（会员曲或下架），外链会 302 到 /404。
    const privilege = privilegeById.get(raw.id);
    if (privilege && (privilege.pl <= 0 || privilege.st < 0)) {
      hidden += 1;
      continue;
    }
    tracks.push({
      id: raw.id,
      name: raw.name,
      artists: (raw.ar ?? []).map((a) => a.name).filter(Boolean),
      album: raw.al?.name ?? '',
      cover: toHttps(raw.al?.picUrl ?? ''),
      duration: raw.dt ?? 0,
      mv: raw.mv ?? 0,
    });
  }

  const limit = options.limit ?? 200;

  return {
    id,
    name: playlist.name,
    cover: toHttps(playlist.coverImgUrl ?? ''),
    creator: playlist.creator?.nickname ?? null,
    description: playlist.description ?? null,
    tracks: tracks.slice(0, limit),
    hidden: hidden + Math.max(0, tracks.length - limit),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLyric(trackId: number | string, options: NeteaseFetchOptions = {}): Promise<Lyric> {
  if (!/^\d{1,20}$/.test(String(trackId))) throw new Error(`曲目 id 不合法：${trackId}`);

  const response = await request(
    `https://music.163.com/api/song/lyric?id=${trackId}&lv=1&tv=-1`,
    options.timeoutMs
  );
  const payload = (await response.json()) as {
    code: number;
    lrc?: { lyric?: string };
    tlyric?: { lyric?: string };
  };
  return {
    lrc: payload.lrc?.lyric ?? '',
    tlrc: payload.tlyric?.lyric ?? '',
  };
}

/**
 * MV 的播放地址。地址带签名，一小时后失效，所以不进快照，播放时经 worker 调用。
 * 网易云返回 http 地址，这里换成 https，避免 https 页面上的混合内容拦截。
 */
export async function fetchMvUrl(mvId: number | string, options: NeteaseFetchOptions = {}): Promise<string | null> {
  if (!/^\d{1,20}$/.test(String(mvId))) throw new Error(`MV id 不合法：${mvId}`);
  const response = await request(
    `https://music.163.com/api/song/enhance/play/mv/url?id=${mvId}&r=1080`,
    options.timeoutMs
  );
  const payload = (await response.json()) as { code: number; data?: { url?: string | null } };
  const url = payload.data?.url;
  return url ? toHttps(url) : null;
}

/** 外链播放地址。由浏览器直接请求，见文件头注释。 */
export function streamUrl(trackId: number): string {
  return `https://music.163.com/song/media/outer/url?id=${trackId}.mp3`;
}

/** 网易云图床支持 ?param=WxH 服务端缩放。列表缩略图别拉原图。 */
export function coverAt(url: string, size: number): string {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}param=${size}y${size}`;
}

async function request(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!response.ok) throw new Error(`网易云 ${url} → ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

interface RawPlaylistResponse {
  code: number;
  playlist?: {
    name: string;
    coverImgUrl?: string;
    description?: string | null;
    creator?: { nickname?: string };
    tracks?: {
      id: number;
      name: string;
      ar?: { name: string }[];
      al?: { name?: string; picUrl?: string };
      dt?: number;
      mv?: number;
    }[];
  };
  privileges?: { id: number; pl: number; st: number }[];
}
