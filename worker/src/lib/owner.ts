/**
 * owner.ts — 站长身份判定。
 *
 * 只认 GitHub 的数值 id（会话里的 userId、users.id 都是 `github:<数字 id>`，
 * 见 routes/auth.ts 和 schema.sql），不认登录名。
 *
 * 登录名是可变量：可以改名，注销后还能被别人重新注册。按登录名判权的话，
 * 站长一改名，抢到旧名字的人登录一次就拿到全部管理权限（审批评论、写 R2、
 * 封禁用户）。数值 id 跟着账号走，改名不影响，所以权限判断一律比 id。
 */

import type { Env, SessionData } from '../types.ts';

/** 站长的 users.id / 会话 userId：github:<数字 id>。 */
export function ownerUserId(env: Env): string {
  return `github:${env.OWNER_GITHUB_ID}`;
}

/**
 * 当前会话是不是站长。
 * 未登录、或者没配 OWNER_GITHUB_ID 都按否处理（fail-closed），
 * 配错了是没人能进后台，不是所有人都能进。
 */
export function isOwner(env: Env, session: SessionData | null | undefined): boolean {
  if (!session || !env.OWNER_GITHUB_ID) return false;
  return session.userId === ownerUserId(env);
}
