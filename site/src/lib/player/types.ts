/**
 * types.ts — 播放器的统一曲目模型。
 *
 * 两个来源：本地媒体（构建期扫描目录生成，见 lib/local-media.ts）和网易云歌单。
 * 播放器、浮动面板、首页舞台只认这一种形状，不关心曲目从哪来。
 */

import type { Track as NeteaseTrack } from '@shared/netease';
import { coverAt, streamUrl } from '@shared/netease';

export type Source = 'local' | 'netease';

export interface LyricSource {
  /** ja / zh / phonetic / default */
  lang: string;
  url: string;
}

export type VideoSource =
  | { kind: 'file'; url: string }
  | { kind: 'netease'; mv: number }
  | { kind: 'bilibili'; bvid: string; page: number };

export interface MediaTrack {
  /** 全局唯一：`${source}:${id}`。 */
  key: string;
  source: Source;
  id: string;
  name: string;
  artists: string[];
  album: string;
  /** 封面原图地址。列表缩略图用 coverOf() 取合适尺寸。 */
  cover: string;
  /** 毫秒，0 表示未知（本地曲目等元数据加载后才知道）。 */
  duration: number;
  audio: string;
  /** 本地曲目的歌词文件；网易云曲目为 null，歌词经 worker 取。 */
  lyrics: LyricSource[] | null;
  video: VideoSource | null;
  /** 首页舞台过载时封面的取景，例如 { position: '50% 14%', size: 'cover' }。 */
  coverFit?: { position?: string; size?: string };
  /** 歌词压在封面上时用浅色字还是深色字。不填按浅色字加深色遮罩处理。 */
  tone?: 'light' | 'dark';
}

export interface Library {
  source: Source;
  name: string;
  tracks: MediaTrack[];
  /** 因为会员、版权或缺歌词被剔除的曲目数。 */
  hidden: number;
  /** 来源页面，例如网易云歌单的网页地址。 */
  url?: string;
}

export const SOURCE_LABEL: Record<Source, string> = { local: '本地', netease: '网易云' };

export function fromNetease(track: NeteaseTrack): MediaTrack {
  return {
    key: `netease:${track.id}`,
    source: 'netease',
    id: String(track.id),
    name: track.name,
    artists: track.artists,
    album: track.album,
    cover: track.cover,
    duration: track.duration,
    audio: streamUrl(track.id),
    lyrics: null,
    video: track.mv ? { kind: 'netease', mv: track.mv } : null,
  };
}

/** 指定尺寸的封面。网易云图床支持服务端缩放；本地封面原样返回。 */
export function coverOf(track: MediaTrack | null | undefined, size: number): string {
  if (!track?.cover) return '';
  return track.source === 'netease' ? coverAt(track.cover, size) : track.cover;
}
