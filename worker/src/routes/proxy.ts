/**
 * proxy.ts — GitHub 与网易云的只读代理。
 *
 * 浏览器直接调这两家的接口会被 CORS 拦下（网易云）或很快耗尽未认证配额（GitHub），
 * 所以由 worker 代理并缓存。为了不变成任意查询的开放代理：
 *   GitHub 只代理配置里的那一个账号；
 *   网易云歌单只代理配置里列出的歌单；歌词和 MV 只接受数字 id。
 *
 * 抓取和归一化逻辑在仓库根目录的 shared/ 里，site 构建期用的是同一份代码。
 */

import { Hono } from 'hono';

import { fetchGitHubOverview } from '../../../shared/github.ts';
import { fetchLyric, fetchMvUrl, fetchPlaylist } from '../../../shared/netease.ts';
import { cached, UpstreamError } from '../lib/cache.ts';
import type { Env, Variables } from '../types.ts';

const proxy = new Hono<{ Bindings: Env; Variables: Variables }>();

/** 给浏览器的缓存头。数据本身在 KV 里另有缓存，这里只是减少重复请求。 */
function browserCache(seconds: number) {
  return { 'cache-control': `public, max-age=${seconds}` };
}

proxy.onError((error, c) => {
  if (error instanceof UpstreamError) return c.json({ error: error.message }, error.status as 429 | 502);
  console.error('proxy', error);
  return c.json({ error: '上游接口不可用' }, 502);
});

proxy.get('/github/overview', async (c) => {
  const username = c.env.GITHUB_USERNAME;
  const data = await cached(c, `github:${username}`, 10 * 60, () =>
    fetchGitHubOverview(username, {
      token: c.env.GITHUB_TOKEN || undefined,
      userAgent: 'puresky-blog-worker',
    })
  );
  return c.json(data, 200, browserCache(120));
});

proxy.get('/music/playlist/:id', async (c) => {
  const id = c.req.param('id');
  const allowed = c.env.MUSIC_PLAYLISTS.split(',').map((s) => s.trim());
  if (!allowed.includes(id)) return c.json({ error: 'Not found' }, 404);
  const data = await cached(c, `netease:playlist:${id}`, 30 * 60, () => fetchPlaylist(id));
  return c.json(data, 200, browserCache(300));
});

proxy.get('/music/lyric/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^\d{1,20}$/.test(id)) return c.json({ error: 'id 不合法' }, 400);
  // 歌词几乎不会变，缓存一周。
  const data = await cached(c, `netease:lyric:${id}`, 7 * 24 * 3600, () => fetchLyric(id));
  return c.json(data, 200, browserCache(86400));
});

proxy.get('/music/mv/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^\d{1,20}$/.test(id)) return c.json({ error: 'id 不合法' }, 400);
  // MV 地址带签名，一小时后失效，缓存要明显短于这个时间，并且不能用过期值兜底。
  const url = await cached(c, `netease:mv:${id}`, 20 * 60, () => fetchMvUrl(id), 0);
  return c.json({ url }, 200, browserCache(300));
});

export default proxy;
