/**
 * metrics.ts — 浏览数与点赞。
 *
 * 两者都不需要登录。去重靠按天加盐的访客哈希，
 * 目的是挡刷新和爬虫，不是识别用户。
 *
 * 写接口按 IP 限流。去重键里有 UA，换个 UA 就能绕过去重继续写新行，
 * 不拦的话单个 IP 就能把 D1 的每日写配额烧光，两张去重表也会被灌大。
 */

import { Hono } from 'hono';
import type { Context } from 'hono';

import type { Env, Variables } from '../types.ts';
import { utcDay, visitorHash } from '../lib/crypto.ts';
import { isValidSlug } from '../lib/slug.ts';

const metrics = new Hono<{ Bindings: Env; Variables: Variables }>();

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * 按 IP 限流。浏览数和点赞分开计数：一篇文章的浏览不该挤掉点赞的额度。
 * 正常读者每分钟打开不了 30 个页面，共享出口被误伤的概率很低。
 */
async function allowWrite(c: Ctx, scope: 'views' | 'likes'): Promise<boolean> {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const { success } = await c.env.METRICS_LIMITER.limit({ key: `${scope}:${ip}` });
  return success;
}

/**
 * 去重表只对当天有意义（哈希按天加盐，昨天的行永远匹配不上），
 * 但 D1 没有定时任务，所以写入时顺手清一次。
 *
 * 每次写都清是白白多两行写操作，所以只有 2% 的请求触发清理，
 * 删除走 schema.sql 里的索引，成本摊薄到可以忽略。
 */
function maybeCleanup(c: Ctx): void {
  if (Math.random() > 0.02) return;
  c.executionCtx.waitUntil(
    c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM view_dedupe WHERE day < date('now', '-7 day')"),
      c.env.DB.prepare("DELETE FROM like_dedupe WHERE created_at < datetime('now', '-7 day')"),
    ]).catch((error) => console.warn('清理去重表失败', error))
  );
}

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

  if (!(await allowWrite(c, 'views'))) return c.json({ error: '请求过于频繁' }, 429);

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

  maybeCleanup(c);

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

  if (!(await allowWrite(c, 'likes'))) return c.json({ error: '请求过于频繁' }, 429);

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

  maybeCleanup(c);

  return c.json({ ok: true, counted: dedupe.meta.changes > 0 });
});

export default metrics;
