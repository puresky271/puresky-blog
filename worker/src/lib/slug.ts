/**
 * slug.ts — 文章 slug 校验。
 *
 * slug 会进 SQL 参数（已参数化，没有注入风险），但也会被拼进缓存键和日志，所以限制字符集。
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9/-]{0,120}$/.test(slug);
}
