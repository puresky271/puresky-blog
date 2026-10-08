/**
 * types.ts — Worker 环境绑定与共享类型。
 */

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  MEDIA: R2Bucket;
  AI: Ai;

  COMMENT_LIMITER: RateLimiter;
  AUTH_LIMITER: RateLimiter;

  /** 逗号分隔的允许来源。 */
  ALLOWED_ORIGINS: string;
  SITE_ORIGIN: string;
  OWNER_LOGIN: string;
  MODERATION_ENABLED: string;

  /** 以下由 wrangler secret put 注入。 */
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  /** 用于给 session id 和访客哈希加盐。 */
  SESSION_SECRET: string;
}

export interface SessionData {
  userId: string;
  login: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  createdAt: number;
}

export interface UserRow {
  id: string;
  login: string;
  avatar_url: string | null;
  profile_url: string | null;
  blocked: number;
}

export interface CommentRow {
  id: string;
  slug: string;
  user_id: string;
  body: string;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  login: string;
  avatar_url: string | null;
  profile_url: string | null;
}

/** 传给前端的评论形状。 */
export interface CommentDto {
  id: string;
  author: string;
  avatar: string | null;
  profile: string | null;
  body: string;
  createdAt: string;
  isOwner: boolean;
}

/** Hono 的上下文变量。 */
export interface Variables {
  session: SessionData | null;
  sessionId: string | null;
}
