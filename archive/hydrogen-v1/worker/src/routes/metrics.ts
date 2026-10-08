/**
 * metrics.ts — 浏览数与反应。
 *
 * 两者都不需要登录。去重靠按天加盐的访客哈希，
 * 目的是挡刷新和爬虫，不是识别用户。
 */

import { Hono } from 'hono';

import type { Env, Variables } from '../types.ts';
import { utcDay, visitorHash } from '../lib/crypto.ts';

const metrics = new Hono<{ Bindings: Env; Variables: Variables }>();

const REACTION_KINDS = ['alpha', 'beta', 'gamma', 'delta'] as const;
type ReactionKind = (typeof REACTION_KINDS)[number];

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9/-]{0,120}$/.test(slug);
}

/** 读浏览数。返回累计值。 */
metrics.get('/views/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const row = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(count), 0) AS total FROM views WHERE slug = ?'
  )
    .bind(slug)
    .first<{ total: number }>();

  return c.json({ slug, views: row?.total ?? 0 });
});

/** 记一次浏览。同一访客同一天同一篇只记一次。 */
metrics.post('/views/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const day = utcDay();
  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, day);

  /*
   * 先尝试插入去重记录。主键冲突说明今天已经记过了，
   * 这时 changes 为 0，直接跳过计数。
   *
   * 用 INSERT OR IGNORE 而不是先 SELECT 再 INSERT：
   * 后者在并发下会两个请求都查到「没记录」然后都去加一。
   */
  const dedupe = await c.env.DB.prepare(
    'INSERT OR IGNORE INTO view_dedupe (slug, day, visitor_hash) VALUES (?, ?, ?)'
  )
    .bind(slug, day, hash)
    .run();

  if (dedupe.meta.changes === 0) {
    const existing = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(count), 0) AS total FROM views WHERE slug = ?'
    )
      .bind(slug)
      .first<{ total: number }>();
    return c.json({ slug, views: existing?.total ?? 0, counted: false });
  }

  await c.env.DB.prepare(
    `INSERT INTO views (slug, day, count) VALUES (?, ?, 1)
     ON CONFLICT (slug, day) DO UPDATE SET count = count + 1`
  )
    .bind(slug, day)
    .run();

  const row = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(count), 0) AS total FROM views WHERE slug = ?'
  )
    .bind(slug)
    .first<{ total: number }>();

  return c.json({ slug, views: row?.total ?? 0, counted: true });
});

/**
 * 读反应。
 *
 * 四种反应对应巴尔末系的四条谱线，因为这是氢主题的博客。
 * alpha 是最基本的「看过了」，往后依次表示更强的认可。
 */
metrics.get('/reactions/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const { results } = await c.env.DB.prepare(
    'SELECT kind, count FROM reactions WHERE slug = ?'
  )
    .bind(slug)
    .all<{ kind: ReactionKind; count: number }>();

  const counts: Record<ReactionKind, number> = { alpha: 0, beta: 0, gamma: 0, delta: 0 };
  for (const row of results ?? []) counts[row.kind] = row.count;

  // 同时返回当前访客已经点过哪些，让前端能把按钮标成已选。
  const day = utcDay();
  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, day);
  const { results: mine } = await c.env.DB.prepare(
    'SELECT kind FROM reaction_dedupe WHERE slug = ? AND visitor_hash = ?'
  )
    .bind(slug, hash)
    .all<{ kind: ReactionKind }>();

  return c.json({
    slug,
    counts,
    mine: (mine ?? []).map((r) => r.kind),
  });
});

metrics.post('/reactions/:slug/:kind', async (c) => {
  const slug = c.req.param('slug');
  const kind = c.req.param('kind') as ReactionKind;

  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);
  if (!REACTION_KINDS.includes(kind)) {
    return c.json({ error: `kind 必须是 ${REACTION_KINDS.join(' / ')} 之一` }, 400);
  }

  const day = utcDay();
  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, day);

  // 反应的去重不带日期维度（主键是 slug+kind+hash），
  // 但 hash 本身按天变化，所以实际效果是「每天每种反应能点一次」。
  // 这是有意的：技术文可能被反复回看，允许重新表态。
  const dedupe = await c.env.DB.prepare(
    'INSERT OR IGNORE INTO reaction_dedupe (slug, kind, visitor_hash) VALUES (?, ?, ?)'
  )
    .bind(slug, kind, hash)
    .run();

  if (dedupe.meta.changes === 0) {
    return c.json({ ok: true, counted: false });
  }

  await c.env.DB.prepare(
    `INSERT INTO reactions (slug, kind, count) VALUES (?, ?, 1)
     ON CONFLICT (slug, kind) DO UPDATE SET count = count + 1`
  )
    .bind(slug, kind)
    .run();

  return c.json({ ok: true, counted: true });
});

export default metrics;
