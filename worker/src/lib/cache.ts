/**
 * cache.ts — 第三方接口响应的缓存。
 *
 * 用 KV 而不是 Cache API：Cache API 在 workers.dev 域名上不生效，KV 在哪都能用。
 * 缓存未命中时才请求上游，并且只在这时过一次代理限流（按 IP），缓存命中不计数。
 *
 * 上游失败时如果还有过期的旧值，返回旧值（stale-if-error），面板不至于因为 GitHub 抖一下就空掉。
 */

import type { Context } from 'hono';

import type { Env, Variables } from '../types.ts';

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

interface Entry<T> {
  value: T;
  /** 写入时间，毫秒。 */
  at: number;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * ttl：新鲜期（秒）。过了新鲜期会重新请求上游；旧值在 KV 里再保留 staleFor 秒用于兜底。
 */
export async function cached<T>(
  c: Ctx,
  key: string,
  ttl: number,
  load: () => Promise<T>,
  staleFor = 24 * 3600
): Promise<T> {
  const kvKey = `cache:${key}`;
  const entry = await c.env.CACHE.get<Entry<T>>(kvKey, 'json');
  if (entry && Date.now() - entry.at < ttl * 1000) return entry.value;

  const { success } = await c.env.PROXY_LIMITER.limit({ key: c.req.header('cf-connecting-ip') ?? 'unknown' });
  if (!success) {
    if (entry) return entry.value;
    throw new UpstreamError('请求过于频繁', 429);
  }

  try {
    const value = await load();
    c.executionCtx.waitUntil(
      c.env.CACHE.put(kvKey, JSON.stringify({ value, at: Date.now() } satisfies Entry<T>), {
        expirationTtl: Math.max(60, ttl + staleFor),
      })
    );
    return value;
  } catch (error) {
    if (entry) return entry.value;
    throw new UpstreamError((error as Error).message || '上游接口不可用', 502);
  }
}
