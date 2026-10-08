/**
 * index.ts — Worker 入口。
 *
 * 路由分组：
 *   /api/auth/*        GitHub OAuth 与会话
 *   /api/comments/*    评论读写
 *   /api/views/*       浏览数
 *   /api/likes/*       点赞
 *   /api/github/*      GitHub 概览代理（带缓存）
 *   /api/music/*       网易云歌单、歌词、MV 代理（带缓存）
 *   /api/admin/*       管理（仅站长）
 *   /media/*           R2 直出：文章图片和本地曲库的音视频
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import type { Env, Variables } from './types.ts';
import { readSession } from './lib/session.ts';
import admin from './routes/admin.ts';
import auth from './routes/auth.ts';
import comments from './routes/comments.ts';
import metrics from './routes/metrics.ts';
import proxy from './routes/proxy.ts';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('/api/*', secureHeaders());

/*
 * CORS。来源必须逐个白名单，不能用 *。
 *
 * 原因有两条：一是带 credentials 的请求浏览器会直接拒绝通配来源；
 * 二是即使浏览器允许，通配也意味着任何站点都能带着用户的 cookie 调这个 API。
 */
app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const handler = cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['content-type', 'x-alt-text'],
    maxAge: 86400,
  });
  return handler(c, next);
});

/** 会话解析。放在路由之前，让每个处理器都能直接 c.get('session')。 */
app.use('/api/*', async (c, next) => {
  const { session, sessionId } = await readSession(c);
  c.set('session', session);
  c.set('sessionId', sessionId);
  await next();
});

app.route('/api/auth', auth);
app.route('/api/comments', comments);
app.route('/api', metrics);
app.route('/api', proxy);
app.route('/api/admin', admin);

/** 健康检查。不暴露版本号和内部状态，只回一个 ok。 */
app.get('/api/health', (c) => c.json({ ok: true }));

/**
 * R2 直出。
 *
 * 只读、不需要认证。支持 Range 请求：音频和视频的拖动进度条靠它，
 * 没有 Range 浏览器只能从头下载到指定位置，大文件根本拖不动。
 * 带强缓存头，因为上传后的文件不会原地修改（改了就换文件名）。
 */
app.on(['GET', 'HEAD'], '/media/:key{.+}', async (c) => {
  if (!c.env.MEDIA) return c.notFound();
  const key = decodeURIComponent(c.req.param('key'));
  if (key.includes('..')) return c.notFound();

  const range = c.req.header('range');
  const object = await c.env.MEDIA.get(key, range ? { range: c.req.raw.headers, onlyIf: c.req.raw.headers } : { onlyIf: c.req.raw.headers });
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');

  // onlyIf 条件不满足时 R2 返回没有 body 的对象：对应 304。
  if (!('body' in object)) return new Response(null, { status: 304, headers });

  if (range && object.range && 'offset' in object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - offset;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(c.req.method === 'HEAD' ? null : object.body, { status: 206, headers });
  }

  headers.set('content-length', String(object.size));
  return new Response(c.req.method === 'HEAD' ? null : object.body, { headers });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
  // 日志里留完整错误，响应里不回栈信息。
  console.error('unhandled', error);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
