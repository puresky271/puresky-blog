-- schema.sql — D1 结构。
--
-- 用 wrangler d1 execute 跑：
--   npm run db:local    本地
--   npm run db:remote   线上
--
-- 所有 DDL 都用 IF NOT EXISTS，所以这个文件可以重复执行。

-- ── 用户 ─────────────────────────────────────────────────────────────────────
--
-- 只存 GitHub 给的公开信息。不存邮箱，也不存 access token ——
-- OAuth 换到 token 之后立刻用它取一次用户信息就丢掉，
-- 后续会话靠自己签发的 session id，不需要长期持有 GitHub 凭证。

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,          -- github:<numeric_id>
  login         TEXT NOT NULL,
  avatar_url    TEXT,
  profile_url   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  -- 被封禁的用户仍然能登录和读，但发不出评论。
  blocked       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_login ON users (login);

-- ── 评论 ─────────────────────────────────────────────────────────────────────
--
-- status 三态：
--   approved  显示
--   pending   等审核，只有作者本人和站长能看到
--   rejected  不显示，保留记录用于判断是否该封禁

CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('approved', 'pending', 'rejected')),
  -- 审核判定的来源和理由，方便事后回看模型判错了什么。
  moderation_by     TEXT,
  moderation_reason TEXT,
  moderation_score  REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,
  -- 软删除。硬删会让楼层错乱，也丢掉了审核记录。
  deleted_at    TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 列表查询走 (slug, status, created_at)，所以按这个顺序建复合索引。
CREATE INDEX IF NOT EXISTS idx_comments_slug_status
  ON comments (slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user
  ON comments (user_id, created_at DESC);

-- 待审队列。
CREATE INDEX IF NOT EXISTS idx_comments_pending
  ON comments (status, created_at DESC) WHERE status = 'pending';

-- ── 浏览数 ───────────────────────────────────────────────────────────────────
--
-- 不做去重到人。只按 (slug, 日期, IP 哈希) 去重，
-- 目的是挡掉刷新和爬虫，不是做用户分析。IP 只存哈希且按天加盐。

CREATE TABLE IF NOT EXISTS views (
  slug          TEXT NOT NULL,
  day           TEXT NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, day)
);

CREATE TABLE IF NOT EXISTS view_dedupe (
  slug          TEXT NOT NULL,
  day           TEXT NOT NULL,
  visitor_hash  TEXT NOT NULL,
  PRIMARY KEY (slug, day, visitor_hash)
);

-- ── 反应 ─────────────────────────────────────────────────────────────────────
--
-- 每篇文章的反应计数。kind 对应四种能级跃迁，
-- 因为这是氢主题的博客，连点赞按钮也用谱线记号。

CREATE TABLE IF NOT EXISTS reactions (
  slug          TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('alpha', 'beta', 'gamma', 'delta')),
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, kind)
);

CREATE TABLE IF NOT EXISTS reaction_dedupe (
  slug          TEXT NOT NULL,
  kind          TEXT NOT NULL,
  visitor_hash  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, kind, visitor_hash)
);

-- ── 媒体 ─────────────────────────────────────────────────────────────────────
--
-- R2 里的对象索引。R2 本身能列举，但列举是 O(n) 且不能按上传时间排序，
-- 所以在 D1 里存一份元数据。

CREATE TABLE IF NOT EXISTS media (
  key           TEXT PRIMARY KEY,
  content_type  TEXT NOT NULL,
  size          INTEGER NOT NULL,
  width         INTEGER,
  height        INTEGER,
  alt           TEXT,
  uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_uploaded ON media (uploaded_at DESC);
