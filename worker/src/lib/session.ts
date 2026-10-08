/**
 * session.ts — 会话管理。
 *
 * 会话存在 KV，cookie 里只放一个不可猜的 id，不放任何用户数据。
 * 这样服务端随时能吊销会话（删 KV 键），而 JWT 那种自包含 token 做不到。
 */

import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

import type { Env, SessionData, Variables } from '../types.ts';
import { randomToken } from './crypto.ts';

export const SESSION_COOKIE = 'puresky_session';

/** 会话有效期 30 天。 */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

export async function createSession(c: Ctx, data: SessionData): Promise<string> {
  const sessionId = randomToken(32);
  await c.env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  setCookie(c, SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    // API 和前端不同源（api.puresky.dev 对 puresky.dev），
    // 所以必须 SameSite=None，否则跨站请求带不上 cookie。
    // 代价是必须配合严格的 CORS 来源白名单，见 index.ts。
    sameSite: 'None',
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

export async function readSession(c: Ctx): Promise<{
  session: SessionData | null;
  sessionId: string | null;
}> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return { session: null, sessionId: null };

  const raw = await c.env.SESSIONS.get(`session:${sessionId}`);
  if (!raw) return { session: null, sessionId: null };

  try {
    return { session: JSON.parse(raw) as SessionData, sessionId };
  } catch {
    // KV 里的值坏了，当成未登录处理并顺手清掉。
    await c.env.SESSIONS.delete(`session:${sessionId}`);
    return { session: null, sessionId: null };
  }
}

export async function destroySession(c: Ctx, sessionId: string | null): Promise<void> {
  if (sessionId) await c.env.SESSIONS.delete(`session:${sessionId}`);
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true, sameSite: 'None' });
}

/** OAuth 流程中间态：PKCE verifier 加回跳地址。10 分钟过期。 */
export interface OAuthState {
  verifier: string;
  redirect: string;
}

export async function putOAuthState(
  env: Env,
  state: string,
  data: OAuthState
): Promise<void> {
  await env.SESSIONS.put(`oauth:${state}`, JSON.stringify(data), { expirationTtl: 600 });
}

export async function takeOAuthState(env: Env, state: string): Promise<OAuthState | null> {
  const key = `oauth:${state}`;
  const raw = await env.SESSIONS.get(key);
  if (!raw) return null;
  // 一次性使用，取出即删。防止 state 被重放。
  await env.SESSIONS.delete(key);
  try {
    return JSON.parse(raw) as OAuthState;
  } catch {
    return null;
  }
}
