/**
 * local-media.ts — 构建期扫描本地媒体目录，生成本地曲库。
 *
 * 目录约定和 mygo_chat 的 lyrics_songs 一致，按文件名配对：
 *
 *   歌名.flac | .mp3 | .m4a | .ogg | .wav     音频（必需）
 *   covers/歌名.jpg | .png | .webp            封面
 *   lrc/歌名.ja.lrc  lrc/歌名.zh.lrc          多语言歌词，也可以是 lrc/歌名.lrc
 *   lrc/歌名.phonetic.lrc                     注音
 *   videos/歌名.mp4 | .webm                   MV，有它就能进入视频过载
 *   videos.json                               { "歌名.flac": { "local": "x.mp4", "bvid": "BV...", "page": 1 } }
 *   songs.json                                可选元信息覆盖，见下面的 SongMeta
 *
 * 歌词文件也可以和音频放在同一层。没有任何歌词的曲目照样收录（舞台显示纯音乐）。
 *
 * 目录位置和对外地址由环境变量决定：
 *   MEDIA_DIR          扫描的本地目录，默认 public/media/songs
 *   PUBLIC_MEDIA_BASE  浏览器访问这些文件的地址前缀，默认 /media/songs/（站点同源）
 * 大文件放 R2 时：把同样的目录结构上传到 R2，MEDIA_DIR 指向本地副本，PUBLIC_MEDIA_BASE 指向 R2 地址。
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { withBase } from '@/lib/format';
import type { Library, LyricSource, MediaTrack, VideoSource } from '@/lib/player/types';

interface SongMeta {
  title?: string;
  artist?: string | string[];
  album?: string;
  /** 越小越靠前，不填排在后面并按文件名排序。 */
  order?: number;
  coverFit?: { position?: string; size?: string };
  tone?: 'light' | 'dark';
  /** 设为 true 不收录。 */
  hidden?: boolean;
}

const AUDIO = ['.flac', '.mp3', '.m4a', '.ogg', '.wav'];
const IMAGE = ['.jpg', '.jpeg', '.png', '.webp'];
const VIDEO = ['.mp4', '.webm'];
const LYRIC_LANGS = ['ja', 'zh', 'phonetic'];

async function exists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function scanLocalSongs(): Promise<Library | null> {
  const dir = path.resolve(process.env.MEDIA_DIR || 'public/media/songs');
  const rawBase = import.meta.env.PUBLIC_MEDIA_BASE || withBase('/media/songs/');
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const url = (...segments: string[]) => base + segments.map(encodeURIComponent).join('/');

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  const meta = (await readJson<Record<string, SongMeta>>(path.join(dir, 'songs.json'))) ?? {};
  const videoMap =
    (await readJson<Record<string, { local?: string; bvid?: string; page?: number }>>(path.join(dir, 'videos.json'))) ?? {};

  const tracks: (MediaTrack & { order: number })[] = [];
  let hidden = 0;

  for (const file of entries) {
    const ext = path.extname(file).toLowerCase();
    if (!AUDIO.includes(ext)) continue;
    const name = file.slice(0, -ext.length);
    const info = meta[name] ?? meta[file] ?? {};
    if (info.hidden) {
      hidden += 1;
      continue;
    }

    let cover = '';
    for (const candidate of IMAGE.flatMap((e) => [['covers', `${name}${e}`], [`${name}${e}`]])) {
      if (await exists(path.join(dir, ...candidate))) {
        cover = url(...candidate);
        break;
      }
    }

    const lyrics: LyricSource[] = [];
    for (const lang of LYRIC_LANGS) {
      for (const candidate of [['lrc', `${name}.${lang}.lrc`], [`${name}.${lang}.lrc`]]) {
        if (await exists(path.join(dir, ...candidate))) {
          lyrics.push({ lang, url: url(...candidate) });
          break;
        }
      }
    }
    if (!lyrics.some((l) => l.lang === 'ja' || l.lang === 'zh')) {
      for (const candidate of [['lrc', `${name}.lrc`], [`${name}.lrc`]]) {
        if (await exists(path.join(dir, ...candidate))) {
          lyrics.unshift({ lang: 'default', url: url(...candidate) });
          break;
        }
      }
    }

    let video: VideoSource | null = null;
    const mapped = videoMap[file] ?? videoMap[name];
    if (mapped?.local && (await exists(path.join(dir, 'videos', mapped.local)))) {
      video = { kind: 'file', url: url('videos', mapped.local) };
    } else {
      for (const e of VIDEO) {
        if (await exists(path.join(dir, 'videos', `${name}${e}`))) {
          video = { kind: 'file', url: url('videos', `${name}${e}`) };
          break;
        }
      }
    }
    if (!video && mapped?.bvid) video = { kind: 'bilibili', bvid: mapped.bvid, page: mapped.page ?? 1 };

    const artists = Array.isArray(info.artist) ? info.artist : info.artist ? [info.artist] : [];
    tracks.push({
      key: `local:${name}`,
      source: 'local',
      id: name,
      name: info.title ?? name,
      artists,
      album: info.album ?? '',
      cover,
      duration: 0,
      audio: url(file),
      lyrics,
      video,
      coverFit: info.coverFit,
      tone: info.tone,
      order: info.order ?? Number.MAX_SAFE_INTEGER,
    });
  }

  if (tracks.length === 0) return null;
  tracks.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'zh-CN'));

  return {
    source: 'local',
    name: '本地曲库',
    tracks: tracks.map(({ order: _order, ...track }) => track),
    hidden,
  };
}
