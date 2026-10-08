/**
 * metrics.ts — 浏览数与点赞。
 *
 * 两者都不需要登录。去重靠按天加盐的访客哈希，
 * 目的是挡刷新和爬虫，不是识别用户。
 */

import { Hono } from 'hono';

import type { Env, Variables } from '../types.ts';
import { utcDay, visitorHash } from '../lib/crypto.ts';
import { isValidSlug } from '../lib/slug.ts';

const metrics = new Hono<{ Bindings: Env; Variables: Variables }>();

async function totalViews(db: D1Database, slug: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(SUM(count), 0) AS total FROM views WHERE slug = ?')
    .bind(slug)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

metrics.get('/views/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);
  return c.json({ slug, views: await totalViews(c.env.DB, slug) });
});

/** 记一次浏览。同一访客同一天同一篇只记一次。 */
metrics.post('/views/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const day = utcDay();
  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, day);

  /*
   * 先尝试插入去重记录。主键冲突说明今天已经记过了，这时 changes 为 0，直接跳过计数。
   * 用 INSERT OR IGNORE 而不是先 SELECT 再 INSERT：
   * 后者在并发下会两个请求都查到「没记录」然后都去加一。
   */
  const dedupe = await c.env.DB.prepare(
    'INSERT OR IGNORE INTO view_dedupe (slug, day, visitor_hash) VALUES (?, ?, ?)'
  )
    .bind(slug, day, hash)
    .run();

  if (dedupe.meta.changes > 0) {
    await c.env.DB.prepare(
      `INSERT INTO views (slug, day, count) VALUES (?, ?, 1)
       ON CONFLICT (slug, day) DO UPDATE SET count = count + 1`
    )
      .bind(slug, day)
      .run();
  }

  return c.json({ slug, views: await totalViews(c.env.DB, slug), counted: dedupe.meta.changes > 0 });
});

/** 读点赞数，以及当前访客今天是否已经点过。 */
metrics.get('/likes/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, utcDay());
  const [row, mine] = await Promise.all([
    c.env.DB.prepare('SELECT count FROM likes WHERE slug = ?').bind(slug).first<{ count: number }>(),
    c.env.DB.prepare('SELECT 1 AS hit FROM like_dedupe WHERE slug = ? AND visitor_hash = ?')
      .bind(slug, hash)
      .first<{ hit: number }>(),
  ]);

  return c.json({ count: row?.count ?? 0, liked: Boolean(mine) });
});

/**
 * 点赞。去重主键是 slug + 访客哈希，而哈希按天变化，
 * 所以实际效果是「每天能点一次」：技术文会被反复回看，允许重新表态。
 */
metrics.post('/likes/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidSlug(slug)) return c.json({ error: 'slug 格式不合法' }, 400);

  const hash = await visitorHash(c.req.raw, c.env.SESSION_SECRET, utcDay());
  const dedupe = await c.env.DB.prepare('INSERT OR IGNORE INTO like_dedupe (slug, visitor_hash) VALUES (?, ?)')
    .bind(slug, hash)
    .run();

  if (dedupe.meta.changes > 0) {
    await c.env.DB.prepare(
      `INSERT INTO likes (slug, count) VALUES (?, 1)
       ON CONFLICT (slug) DO UPDATE SET count = count + 1`
    )
      .bind(slug)
      .run();
  }

  return c.json({ ok: true, counted: dedupe.meta.changes > 0 });
});

export default metrics;
