/**
 * origins.ts — 允许的前端来源。
 *
 * CORS、CSRF 来源校验、OAuth 回跳白名单都从这里取名单。
 * 以前三处各写一份 split(',')，改一处漏两处只是时间问题，集中到这一个地方。
 */

import type { Env } from '../types.ts';

/** 归一化到 URL.origin：去掉尾斜杠、统一小写、省掉默认端口。 */
export function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    return new URL(trimmed).origin;
  } catch {
    // 配置写坏了也原样保留，至少不会静默把来源丢掉。
    return trimmed.replace(/\/+$/, '');
  }
}

export function allowedOrigins(env: Env): string[] {
  const origins = env.ALLOWED_ORIGINS.split(',').map(normalizeOrigin).filter(Boolean);

  // SITE_ORIGIN 是正式站点。配置里漏写时也补上，免得把自家站点挡在外面。
  const site = normalizeOrigin(env.SITE_ORIGIN);
  if (site && !origins.includes(site)) origins.push(site);

  return origins;
}

export function isAllowedOrigin(env: Env, origin: string | undefined | null): boolean {
  if (!origin) return false;
  return allowedOrigins(env).includes(normalizeOrigin(origin));
}
