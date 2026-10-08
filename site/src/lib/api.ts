/**
 * api.ts — 浏览器端调用 worker 的唯一入口。
 *
 * 统一处理三件事：带 cookie（评论登录态）、超时、错误归一化。
 * 调用方只需要区分「成功拿到数据」和「ApiError」。
 */

import { API_BASE } from '@/config';

export class ApiError extends Error {
  constructor(
    message: string,
    /** 0 表示网络层失败（离线、超时、CORS），其余是 HTTP 状态码。 */
    readonly status: number
  ) {
    super(message);
  }

  get offline(): boolean {
    return this.status === 0;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...rest,
      headers: rest.body ? { 'content-type': 'application/json', ...rest.headers } : rest.headers,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('连不上服务器', 0);
  } finally {
    clearTimeout(timer);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 非 JSON 响应，下面按状态码处理。
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `请求失败（${response.status}）`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

/** 登录入口。登录完回到当前页面的指定锚点。 */
export function loginUrl(anchor = ''): string {
  const back = `${location.origin}${location.pathname}${anchor}`;
  return `${API_BASE}/api/auth/github/start?redirect=${encodeURIComponent(back)}`;
}
