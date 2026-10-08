/**
 * /data/local-songs.json — 构建期扫描出的本地曲库。没有本地媒体时是 null。
 * 目录约定见 src/lib/local-media.ts。
 */
import type { APIRoute } from 'astro';

import { scanLocalSongs } from '@/lib/local-media';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await scanLocalSongs()), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
