/**
 * admin.ts — 管理接口。
 *
 * 全部要求登录用户是 OWNER_LOGIN。校验在这个文件的中间件里做一次，
 * 下面每个路由都不重复判断 —— 漏判一处就是一个提权漏洞，
 * 所以宁可让中间件统一挡住。
 */

import { Hono } from 'hono';

import type { CommentRow, Env, Variables } from '../types.ts';

const admin = new Hono<{ Bindings: Env; Variables: Variables }>();

admin.use('*', async (c, next) => {
  const session = c.get('session');
  if (!session || session.login !== c.env.OWNER_LOGIN) {
    // 统一返回 404 而不是 403，不暴露这些端点的存在。
    return c.json({ error: 'Not found' }, 404);
  }
  await next();
});

/** 待审队列。 */
admin.get('/comments/pending', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.slug, c.user_id, c.body, c.status, c.created_at,
            c.moderation_by, c.moderation_reason, c.moderation_score,
            u.login, u.avatar_url, u.profile_url
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.status = 'pending' AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT 200`
  ).all<CommentRow & { moderation_by: string; moderation_reason: string }>();

  return c.json({ comments: results ?? [] });
});

/** 被拒队列。用于回看审核判错了什么。 */
admin.get('/comments/rejected', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.slug, c.body, c.created_at,
            c.moderation_by, c.moderation_reason, c.moderation_score,
            u.login
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.status = 'rejected' AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 200`
  ).all();

  return c.json({ comments: results ?? [] });
});

/** 通过或拒绝一条评论。 */
admin.post('/comments/:id/:action', async (c) => {
  const id = c.req.param('id');
  const action = c.req.param('action');

  if (action !== 'approve' && action !== 'reject') {
    return c.json({ error: 'action 必须是 approve 或 reject' }, 400);
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  const result = await c.env.DB.prepare(
    `UPDATE comments
        SET status = ?, updated_at = datetime('now'),
            moderation_by = 'owner', moderation_reason = '人工复核'
      WHERE id = ? AND deleted_at IS NULL`
  )
    .bind(status, id)
    .run();

  if (result.meta.changes === 0) return c.json({ error: '评论不存在' }, 404);

  return c.json({ ok: true, status });
});

/** 封禁或解封用户。 */
admin.post('/users/:login/:action', async (c) => {
  const login = c.req.param('login');
  const action = c.req.param('action');

  if (action !== 'block' && action !== 'unblock') {
    return c.json({ error: 'action 必须是 block 或 unblock' }, 400);
  }

  // 不允许把站长自己封掉。
  if (login === c.env.OWNER_LOGIN) {
    return c.json({ error: '不能封禁站长账号' }, 400);
  }

  const blocked = action === 'block' ? 1 : 0;

  const result = await c.env.DB.prepare('UPDATE users SET blocked = ? WHERE login = ?')
    .bind(blocked, login)
    .run();

  if (result.meta.changes === 0) return c.json({ error: '用户不存在' }, 404);

  // 封禁时把该用户所有未删除的评论一并撤下。
  if (blocked === 1) {
    await c.env.DB.prepare(
      `UPDATE comments SET status = 'rejected', updated_at = datetime('now'),
              moderation_by = 'owner', moderation_reason = '用户被封禁'
         WHERE user_id = (SELECT id FROM users WHERE login = ?)
           AND status = 'approved' AND deleted_at IS NULL`
    )
      .bind(login)
      .run();
  }

  return c.json({ ok: true, blocked: blocked === 1 });
});

/** 概览统计。 */
admin.get('/stats', async (c) => {
  const [comments, users, views] = await Promise.all([
    c.env.DB.prepare(
      `SELECT status, COUNT(*) AS n FROM comments WHERE deleted_at IS NULL GROUP BY status`
    ).all<{ status: string; n: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(blocked) AS blocked FROM users`
    ).first<{ total: number; blocked: number }>(),
    c.env.DB.prepare(
      `SELECT slug, SUM(count) AS total FROM views
        GROUP BY slug ORDER BY total DESC LIMIT 20`
    ).all<{ slug: string; total: number }>(),
  ]);

  return c.json({
    comments: Object.fromEntries((comments.results ?? []).map((r) => [r.status, r.n])),
    users: { total: users?.total ?? 0, blocked: users?.blocked ?? 0 },
    topPosts: views.results ?? [],
  });
});

/** 图片上传。写 R2，同时在 D1 记一份元数据。 */
admin.put('/media/:key{.+}', async (c) => {
  const key = c.req.param('key');

  // 路径穿越防护。R2 的 key 是扁平字符串，但仍然限制字符集，
  // 因为这个 key 会被拼进公开 URL。
  if (!/^[a-z0-9][a-z0-9._/-]{0,200}$/i.test(key) || key.includes('..')) {
    return c.json({ error: 'key 格式不合法' }, 400);
  }

  if (!c.env.MEDIA) return c.json({ error: '还没有绑定 R2，见 wrangler.toml' }, 503);

  const contentType = c.req.header('content-type') ?? 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    return c.json({ error: '只接受图片' }, 415);
  }

  const body = await c.req.arrayBuffer();

  // 10MB 上限。
  if (body.byteLength > 10 * 1024 * 1024) {
    return c.json({ error: '文件超过 10MB' }, 413);
  }

  await c.env.MEDIA.put(key, body, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
  });

  await c.env.DB.prepare(
    `INSERT INTO media (key, content_type, size, alt) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET
       content_type = excluded.content_type,
       size = excluded.size,
       uploaded_at = datetime('now')`
  )
    .bind(key, contentType, body.byteLength, c.req.header('x-alt-text') ?? null)
    .run();

  return c.json({ ok: true, key, size: body.byteLength });
});

admin.delete('/media/:key{.+}', async (c) => {
  if (!c.env.MEDIA) return c.json({ error: '还没有绑定 R2，见 wrangler.toml' }, 503);
  const key = c.req.param('key');
  await c.env.MEDIA.delete(key);
  await c.env.DB.prepare('DELETE FROM media WHERE key = ?').bind(key).run();
  return c.json({ ok: true });
});

admin.get('/media', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT key, content_type, size, alt, uploaded_at FROM media ORDER BY uploaded_at DESC LIMIT 200'
  ).all();
  return c.json({ media: results ?? [] });
});

export default admin;
