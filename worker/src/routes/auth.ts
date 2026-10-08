/**
 * auth.ts — GitHub OAuth（带 PKCE）。
 *
 * 流程：
 *   1. /start   生成 state 和 PKCE verifier，存 KV，重定向到 GitHub
 *   2. /callback 校验 state，用 code + verifier 换 token，取用户信息，建会话
 *   3. /me      读当前会话
 *   4. /logout  销毁会话
 *
 * 为什么用 PKCE：GitHub 的 web flow 本来靠 client_secret 就够，
 * PKCE 是额外一层 —— 即使授权码在重定向链路上泄漏，
 * 没有 verifier 也换不到 token。成本几乎为零，加上。
 */

import { Hono } from 'hono';

import type { Env, SessionData, UserRow, Variables } from '../types.ts';
import { randomToken, sha256Base64Url } from '../lib/crypto.ts';
import {
  createSession,
  destroySession,
  putOAuthState,
  takeOAuthState,
} from '../lib/session.ts';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * 回跳地址白名单校验。
 *
 * 不校验的话这里就是一个开放重定向：攻击者构造
 * /start?redirect=https://evil.com 让用户登录后跳到钓鱼站。
 * 所以只允许跳回本站来源下的路径。
 */
function safeRedirect(env: Env, candidate: string | undefined): string {
  const fallback = env.SITE_ORIGIN;
  if (!candidate) return fallback;

  // 相对路径直接拼到站点来源上。
  if (candidate.startsWith('/')) return new URL(candidate, env.SITE_ORIGIN).href;

  try {
    const url = new URL(candidate);
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    return allowed.includes(url.origin) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

auth.get('/github/start', async (c) => {
  const { success } = await c.env.AUTH_LIMITER.limit({
    key: c.req.header('cf-connecting-ip') ?? 'unknown',
  });
  if (!success) return c.text('请求过于频繁', 429);

  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await sha256Base64Url(verifier);
  const redirect = safeRedirect(c.env, c.req.query('redirect'));

  await putOAuthState(c.env, state, { verifier, redirect });

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${new URL(c.req.url).origin}/api/auth/github/callback`);
  // 只要公开信息。不申请 email，也不申请任何 repo 权限。
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  return c.redirect(authorize.href, 302);
});

auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.text('缺少 code 或 state 参数', 400);
  }

  const stored = await takeOAuthState(c.env, state);
  if (!stored) {
    // state 不存在意味着过期、已被使用，或者是伪造的。三种情况处理方式一样。
    return c.text('登录状态无效或已过期，请重新登录', 400);
  }

  // ── 换 access token ────────────────────────────────────────────────────────
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: stored.verifier,
      redirect_uri: `${new URL(c.req.url).origin}/api/auth/github/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    return c.text('向 GitHub 换取令牌失败', 502);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenPayload.access_token) {
    return c.text(`GitHub 拒绝了这次授权：${tokenPayload.error ?? '未知原因'}`, 502);
  }

  // ── 取用户信息 ─────────────────────────────────────────────────────────────
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${tokenPayload.access_token}`,
      accept: 'application/vnd.github+json',
      // GitHub 要求带 UA，否则会拒。
      'user-agent': 'puresky-blog-worker',
    },
  });

  if (!userResponse.ok) {
    return c.text('读取 GitHub 用户信息失败', 502);
  }

  const profile = (await userResponse.json()) as {
    id: number;
    login: string;
    avatar_url: string | null;
    html_url: string | null;
  };

  // access_token 到这里就用完了，不存。后续会话靠自己签发的 session id。

  const userId = `github:${profile.id}`;

  await c.env.DB.prepare(
    `INSERT INTO users (id, login, avatar_url, profile_url)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       login = excluded.login,
       avatar_url = excluded.avatar_url,
       profile_url = excluded.profile_url`
  )
    .bind(userId, profile.login, profile.avatar_url, profile.html_url)
    .run();

  const session: SessionData = {
    userId,
    login: profile.login,
    avatarUrl: profile.avatar_url,
    profileUrl: profile.html_url,
    createdAt: Date.now(),
  };

  await createSession(c, session);

  return c.redirect(stored.redirect, 302);
});

auth.get('/me', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ viewer: null });

  // 每次都查一下封禁状态，这样封禁能立刻生效而不用等会话过期。
  const user = await c.env.DB.prepare('SELECT blocked FROM users WHERE id = ?')
    .bind(session.userId)
    .first<Pick<UserRow, 'blocked'>>();

  return c.json({
    viewer: {
      login: session.login,
      avatar: session.avatarUrl,
      profile: session.profileUrl,
      isOwner: session.login === c.env.OWNER_LOGIN,
      canComment: user?.blocked !== 1,
    },
  });
});

auth.post('/logout', async (c) => {
  await destroySession(c, c.get('sessionId'));
  return c.json({ ok: true });
});

export default auth;
