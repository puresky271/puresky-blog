/**
 * comments.ts — 评论读写。
 */

import { Hono } from 'hono';

import type { CommentDto, CommentRow, Env, SessionData, UserRow, Variables } from '../types.ts';
import { randomToken } from '../lib/crypto.ts';
import { moderate } from '../lib/moderation.ts';
import { isValidSlug } from '../lib/slug.ts';

const comments = new Hono<{ Bindings: Env; Variables: Variables }>();

const MAX_BODY_LENGTH = 2000;
const MIN_BODY_LENGTH = 2;

function toDto(row: CommentRow, ownerLogin: string, session: SessionData | null): CommentDto {
  return {
    id: row.id,
    parentId: row.parent_id,
    author: row.login,
    avatar: row.avatar_url,
    profile: row.profile_url,
    body: row.body,
    createdAt: `${row.created_at.replace(' ', 'T')}Z`,
    isOwner: row.login === ownerLogin,
    mine: session?.userId === row.user_id,
    pending: row.status === 'pending',
  };
}

const COLUMNS = `c.id, c.slug, c.parent_id, c.user_id, c.body, c.status, c.created_at,
                 u.login, u.avatar_url, u.profile_url`;

comments.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const session = c.get('session');
  const isOwner = session?.login === c.env.OWNER_LOGIN;

  /*
   * 可见性规则：
   *   已通过的评论所有人可见。
   *   待审的评论只有作者本人和站长可见 —— 否则作者会以为自己的评论丢了。
   *   被拒的评论谁都看不到，包括作者，因为告知「你被判为垃圾」没有好处。
   */
  const statement = isOwner
    ? c.env.DB.prepare(
        `SELECT ${COLUMNS} FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.slug = ? AND c.deleted_at IS NULL AND c.status IN ('approved', 'pending')
          ORDER BY c.created_at ASC`
      ).bind(slug)
    : c.env.DB.prepare(
        `SELECT ${COLUMNS} FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.slug = ? AND c.deleted_at IS NULL
            AND (c.status = 'approved' OR (c.status = 'pending' AND c.user_id = ?))
          ORDER BY c.created_at ASC`
      ).bind(slug, session?.userId ?? '');

  const { results } = await statement.all<CommentRow>();
  return c.json({ comments: (results ?? []).map((row) => toDto(row, c.env.OWNER_LOGIN, session)) });
});

comments.post('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const session = c.get('session');
  if (!session) return c.json({ error: '需要先登录' }, 401);

  // 限流按用户而不是按 IP。同一个 IP 后面可能有多个人（校园网、公司出口）。
  const { success } = await c.env.COMMENT_LIMITER.limit({ key: session.userId });
  if (!success) return c.json({ error: '发得太快了，歇一会儿再发' }, 429);

  const user = await c.env.DB.prepare('SELECT blocked FROM users WHERE id = ?')
    .bind(session.userId)
    .first<Pick<UserRow, 'blocked'>>();

  if (user?.blocked === 1) {
    // 不明说被封了。被封的人知道自己被封只会去换号。
    return c.json({ error: '当前账号无法发表评论' }, 403);
  }

  let payload: { body?: unknown; parentId?: unknown };
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是合法 JSON' }, 400);
  }

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (body.length < MIN_BODY_LENGTH) return c.json({ error: '内容太短' }, 400);
  if (body.length > MAX_BODY_LENGTH) return c.json({ error: `内容超过 ${MAX_BODY_LENGTH} 字上限` }, 400);

  /*
   * 楼中楼只有一层：回复一条回复时，挂到那条楼的根评论上。
   * 父评论必须属于同一篇文章、已通过且未删除，否则当作普通评论处理会让人困惑，直接拒绝。
   */
  let parentId: string | null = null;
  if (typeof payload.parentId === 'string' && payload.parentId) {
    const parent = await c.env.DB.prepare(
      `SELECT id, parent_id FROM comments
        WHERE id = ? AND slug = ? AND status = 'approved' AND deleted_at IS NULL`
    )
      .bind(payload.parentId, slug)
      .first<{ id: string; parent_id: string | null }>();
    if (!parent) return c.json({ error: '要回复的评论不存在' }, 400);
    parentId = parent.parent_id ?? parent.id;
  }

  const verdict = await moderate(c.env, body);

  // 被判为垃圾的评论仍然入库（status=rejected），不直接丢掉。
  // 保留记录才能事后判断某个账号是不是该封，以及回看模型判错了什么。
  const status =
    verdict.action === 'approve' ? 'approved' : verdict.action === 'hold' ? 'pending' : 'rejected';

  const id = randomToken(12);
  await c.env.DB.prepare(
    `INSERT INTO comments
       (id, slug, parent_id, user_id, body, status, moderation_by, moderation_reason, moderation_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, slug, parentId, session.userId, body, status, verdict.by, verdict.reason, verdict.score)
    .run();

  /*
   * 对被拒的评论也返回 200 + pending。
   *
   * 理由：如果明确告诉发布者「你被判为垃圾」，垃圾发布者会立刻调整措辞重试，
   * 审核就变成了一个可以被暴力试探的接口。返回 pending 让两种情况看起来一样，
   * 正常用户会等审核（然后确实会过），垃圾发布者以为成功了就不会立刻重试。
   */
  return c.json({ ok: true, pending: status !== 'approved', id: status === 'approved' ? id : undefined });
});

/** 删除评论。软删。站长能删任何评论，普通用户只能删自己的。 */
comments.delete('/:slug/:id', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: '需要先登录' }, 401);

  const id = c.req.param('id');
  const isOwner = session.login === c.env.OWNER_LOGIN;

  // 权限在 SQL 层面限制住，不靠应用层判断。
  const result = isOwner
    ? await c.env.DB.prepare(
        `UPDATE comments SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
      )
        .bind(id)
        .run()
    : await c.env.DB.prepare(
        `UPDATE comments SET deleted_at = datetime('now')
          WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
      )
        .bind(id, session.userId)
        .run();

  if (result.meta.changes === 0) return c.json({ error: '评论不存在或无权删除' }, 404);
  return c.json({ ok: true });
});

export default comments;
