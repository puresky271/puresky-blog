/**
 * types.ts — Worker 环境绑定与共享类型。
 */

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  /** 可选：账号开通 R2 并绑定后才有。没有时 /media/* 返回 404。 */
  MEDIA?: R2Bucket;
  AI: Ai;

  COMMENT_LIMITER: RateLimiter;
  AUTH_LIMITER: RateLimiter;
  PROXY_LIMITER: RateLimiter;

  /** 逗号分隔的允许来源。 */
  ALLOWED_ORIGINS: string;
  SITE_ORIGIN: string;
  OWNER_LOGIN: string;
  MODERATION_ENABLED: string;
  GITHUB_USERNAME: string;
  /** 逗号分隔的允许代理的网易云歌单 id。 */
  MUSIC_PLAYLISTS: string;

  /** 以下由 wrangler secret put 注入。 */
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  /** 用于给 session id 和访客哈希加盐。 */
  SESSION_SECRET: string;
  /** 可选。有它 GitHub 概览走 GraphQL。 */
  GITHUB_TOKEN?: string;
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
  parent_id: string | null;
  user_id: string;
  body: string;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  login: string;
  avatar_url: string | null;
  profile_url: string | null;
}

/** 传给前端的评论形状。与 site/src/components/post/Comments.svelte 的 CommentItem 对应。 */
export interface CommentDto {
  id: string;
  parentId: string | null;
  author: string;
  avatar: string | null;
  profile: string | null;
  body: string;
  createdAt: string;
  /** 评论者是站长。 */
  isOwner: boolean;
  /** 评论者是当前访客自己。 */
  mine: boolean;
  /** 还在审核中（只有作者本人和站长能看到）。 */
  pending: boolean;
}

/** Hono 的上下文变量。 */
export interface Variables {
  session: SessionData | null;
  sessionId: string | null;
}
