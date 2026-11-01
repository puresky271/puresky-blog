/**
 * origins.ts — 允许的前端来源。
 *
 * CORS、CSRF 来源校验、OAuth 回跳白名单都从这里取名单。
 * 以前三处各写一份 split(',')，改一处漏两处只是时间问题，集中到这一个地方。
 */

import type { Env } from '../types.ts';

export function allowedOrigins(env: Env): string[] {
  const origins = env.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // SITE_ORIGIN 是正式站点。配置里漏写时也补上，免得把自家站点挡在外面。
  if (env.SITE_ORIGIN && !origins.includes(env.SITE_ORIGIN)) {
    origins.push(env.SITE_ORIGIN);
  }

  return origins;
}
