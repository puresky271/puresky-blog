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
    // API 和前端不是同一个源，但是同一个 site：dpdns.org 在公共后缀列表上，
    // pureskyblog.dpdns.org 和 api.pureskyblog.dpdns.org 的 eTLD+1 都是
    // pureskyblog.dpdns.org。所以 SameSite=Lax 的 cookie 在跨子域 XHR 里照常发送，
    // 而别的站点发起的请求带不上它，CSRF 从根上被挡住。
    // 不要改回 None：CORS 白名单只管响应能不能读，管不住请求发不发出。
    sameSite: 'Lax',
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
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true, sameSite: 'Lax' });
}

export const OAUTH_STATE_COOKIE = 'puresky_oauth_state';

/** 只挂在认证路径下，其他接口带不上这个 cookie。 */
const OAUTH_STATE_COOKIE_PATH = '/api/auth';

/**
 * OAuth state 同时写一份同值 cookie。
 *
 * 回调时要求 URL 里的 state 和这个 cookie 一致，state 才对「发起登录的那个浏览器」有效。
 * 少了这一步就是登录 CSRF：攻击者把自己登录流程的 code + state 拼成链接发给受害者，
 * 受害者点一下就会以攻击者的身份建会话。
 */
export function setOAuthStateCookie(c: Ctx, state: string): void {
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    path: OAUTH_STATE_COOKIE_PATH,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600,
  });
}

export function readOAuthStateCookie(c: Ctx): string | null {
  return getCookie(c, OAUTH_STATE_COOKIE) ?? null;
}

export function clearOAuthStateCookie(c: Ctx): void {
  deleteCookie(c, OAUTH_STATE_COOKIE, {
    path: OAUTH_STATE_COOKIE_PATH,
    secure: true,
    sameSite: 'Lax',
  });
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
