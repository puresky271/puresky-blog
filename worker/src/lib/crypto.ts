/**
 * crypto.ts — 会话 id、PKCE、访客哈希。
 *
 * 全部用 WebCrypto，Workers 运行时原生支持，不需要额外依赖。
 */

/** 生成一个 URL 安全的随机串。用于 session id 和 PKCE verifier。 */
export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256，返回 base64url。PKCE 的 code_challenge 就是这个。 */
export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(digest));
}

/** SHA-256，返回十六进制。用于访客哈希。 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 访客哈希。用于浏览数和反应的去重。
 *
 * 三个设计点：
 *   1. 盐里带日期，所以同一个 IP 每天的哈希都不同，无法跨天关联。
 *   2. 盐里带 SESSION_SECRET，所以拿到数据库也无法反查 IP。
 *   3. 只用 IP 和 UA，不设 cookie，不做指纹。
 * 目的只是挡刷新和爬虫，不是识别人。
 */
export async function visitorHash(
  request: Request,
  secret: string,
  day: string
): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = request.headers.get('user-agent') ?? '';
  return sha256Hex(`${day}:${secret}:${ip}:${ua}`);
}

/** 恒定时间字符串比较。避免通过响应时间差推断 token。 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** JST 无关，统一用 UTC 日期做去重键。 */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
