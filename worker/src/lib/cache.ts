/**
 * cache.ts — 第三方接口响应的缓存。
 *
 * 用 KV 而不是 Cache API：Cache API 在 workers.dev 域名上不生效，KV 在哪都能用。
 * 缓存未命中时才请求上游，并且只在这时过一次代理限流（按 IP），缓存命中不计数。
 *
 * 过了新鲜期但还有旧值时，先把旧值返回，在后台刷新（stale-while-revalidate）：
 * 访客不用陪着等上游。GitHub 一个请求的超时就是 8 秒，几段串起来足以让前端放弃。
 * 上游失败时旧值原样留着（stale-if-error），面板不至于因为 GitHub 抖一下就空掉。
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

/** 本 isolate 里正在后台刷新的 key。同一时刻的多个请求只发一次上游请求。 */
const refreshing = new Set<string>();

/**
 * ttl：新鲜期（秒）。过了新鲜期会重新请求上游；旧值在 KV 里再保留 staleFor 秒用于兜底。
 * staleFor 为 0 时旧值随新鲜期一起过期（比如带时效签名的地址），不会先返回旧值再刷新。
 * load 会拿到缓存里的旧值（没有则为 null），可以用它补上这次没拉到的部分。
 */
export async function cached<T>(
  c: Ctx,
  key: string,
  ttl: number,
  load: (previous: T | null) => Promise<T>,
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

  const store = (value: T) =>
    c.env.CACHE.put(kvKey, JSON.stringify({ value, at: Date.now() } satisfies Entry<T>), {
      expirationTtl: Math.max(60, ttl + staleFor),
    });

  if (entry && staleFor > 0) {
    if (!refreshing.has(kvKey)) {
      refreshing.add(kvKey);
      c.executionCtx.waitUntil(
        load(entry.value)
          .then(store)
          .catch((error) => console.warn(`cache: ${key} 后台刷新失败，继续用旧值`, error))
          .finally(() => refreshing.delete(kvKey))
      );
    }
    return entry.value;
  }

  try {
    const value = await load(entry?.value ?? null);
    c.executionCtx.waitUntil(store(value));
    return value;
  } catch (error) {
    if (entry) return entry.value;
    throw new UpstreamError((error as Error).message || '上游接口不可用', 502);
  }
}
