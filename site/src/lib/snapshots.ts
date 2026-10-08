/**
 * snapshots.ts — 构建期的 GitHub 与网易云数据快照。
 *
 * 页面首屏直接渲染这份快照，运行时再由 worker 刷新。
 * 这样 worker 不可用时页面上是「上次构建时的数据」而不是一片骨架屏。
 *
 * 构建时设置环境变量 GITHUB_TOKEN 可以拿到贡献日历的精确数据和个人状态；
 * 不设也能工作，只是走公开接口。
 *
 * 开发模式下结果缓存到 node_modules/.cache，避免每次热更新都打一遍 API
 * （GitHub 未认证配额每小时只有 60 次）。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchGitHubOverview, type GitHubOverview } from '@shared/github';
import { fetchPlaylist, type Playlist } from '@shared/netease';

import { GITHUB, MUSIC } from '@/config';

const CACHE_DIR = path.resolve('node_modules/.cache/puresky');
const DEV_TTL_MS = 30 * 60 * 1000;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T | null> {
  const file = path.join(CACHE_DIR, `${key}.json`);

  if (import.meta.env.DEV) {
    try {
      const raw = JSON.parse(await readFile(file, 'utf8')) as { at: number; value: T };
      if (Date.now() - raw.at < DEV_TTL_MS) return raw.value;
    } catch {
      // 没有缓存或者缓存坏了，往下走正常抓取。
    }
  }

  try {
    const value = await load();
    if (import.meta.env.DEV) {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, JSON.stringify({ at: Date.now(), value }));
    }
    return value;
  } catch (error) {
    // 构建不能因为第三方接口挂了而失败，页面会显示对应的空状态。
    console.warn(`[snapshot] ${key} 抓取失败：${(error as Error).message}`);
    return null;
  }
}

let githubPromise: Promise<GitHubOverview | null> | null = null;
let playlistPromise: Promise<Playlist | null> | null = null;

export function getGitHubSnapshot(): Promise<GitHubOverview | null> {
  githubPromise ??= cached(`github-${GITHUB.username}`, () =>
    fetchGitHubOverview(GITHUB.username, {
      token: process.env.GITHUB_TOKEN || undefined,
      userAgent: 'puresky-blog-build',
    })
  );
  return githubPromise;
}

export function getPlaylistSnapshot(): Promise<Playlist | null> {
  playlistPromise ??= cached(`playlist-${MUSIC.playlistId}`, () => fetchPlaylist(MUSIC.playlistId));
  return playlistPromise;
}
