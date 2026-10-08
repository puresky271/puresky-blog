/**
 * index.ts — Worker 入口。
 *
 * 路由分组：
 *   /api/auth/*      GitHub OAuth 与会话
 *   /api/comments/*  评论读写
 *   /api/views/*     浏览数
 *   /api/reactions/* 反应
 *   /api/admin/*     管理（仅站长）
 *   /media/*         R2 图片直出
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import type { Env, Variables } from './types.ts';
import { readSession } from './lib/session.ts';
import auth from './routes/auth.ts';
import comments from './routes/comments.ts';
import metrics from './routes/metrics.ts';
import admin from './routes/admin.ts';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', secureHeaders());

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
app.route('/api/admin', admin);

/** 健康检查。不暴露版本号和内部状态，只回一个 ok。 */
app.get('/api/health', (c) => c.json({ ok: true }));

/**
 * R2 图片直出。
 *
 * 只读，不需要认证。带强缓存头，因为 key 里含内容指纹时图片是不可变的。
 * 走 Worker 而不是 R2 公开域名，是为了能统一加缓存策略和 CORS。
 */
app.get('/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.MEDIA.get(key);

  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');

  // 支持条件请求，让浏览器能用 304 而不是重新下载。
  const ifNoneMatch = c.req.header('if-none-match');
  if (ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
  // 日志里留完整错误，响应里不回栈信息。
  console.error('unhandled', error);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
