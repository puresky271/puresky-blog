/**
 * /data/playlist.json — 构建期的歌单快照。
 *
 * 播放器先读这个同源静态文件，再在后台问 worker 要最新的，
 * 所以即使 worker 不可用，歌单也能打开。
 */
import type { APIRoute } from 'astro';

import { getPlaylistSnapshot } from '@/lib/snapshots';

export const GET: APIRoute = async () => {
  const playlist = await getPlaylistSnapshot();
  return new Response(JSON.stringify(playlist), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
