/**
 * format.ts — 展示层格式化与路径拼接。
 *
 * 服务端和客户端都会 import，所以这里不能碰 astro:content 之类的构建期模块。
 */

import { CJK_CHARS_PER_MINUTE, LATIN_WORDS_PER_MINUTE, SITE } from '@/config';

const DATE_FULL = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: SITE.timeZone,
});

const DATE_ISO = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: SITE.timeZone,
});

const MONTH_DAY = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  timeZone: SITE.timeZone,
});

/** 2026年7月30日 */
export function formatDate(date: Date | string): string {
  return DATE_FULL.format(new Date(date));
}

/** 2026-07-30，按作者时区。也用作日历里「哪天有文章」的键。 */
export function formatDateISO(date: Date | string): string {
  return DATE_ISO.format(new Date(date));
}

/** 7月30日 */
export function formatMonthDay(date: Date | string): string {
  return MONTH_DAY.format(new Date(date));
}

/**
 * 相对时间。一周内用相对表述，更久给绝对日期：
 * 「3 个月前」对判断一篇技术文的时效没有帮助。
 */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const then = new Date(date);
  const diff = (now.getTime() - then.getTime()) / 1000;

  if (diff < 0) return formatMonthDay(then);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 172800) return '昨天';
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return then.getFullYear() === now.getFullYear() ? formatMonthDay(then) : formatDate(then);
}

/** 1234 → 1,234；大于一万用「万」。 */
export function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  return value.toLocaleString('zh-CN');
}

/** 毫秒 → 3:07 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 阅读时长。中文按字、西文按词分别估算再相加。
 * 代码块按西文算，比按字数估得准。
 */
export function readingMinutes(markdown: string): number {
  const text = markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~[\]()!|-]/g, ' ');
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return Math.max(1, Math.round(cjk / CJK_CHARS_PER_MINUTE + latin / LATIN_WORDS_PER_MINUTE));
}

/** 拼接 base path。站点可能部署在子路径下，站内链接一律经过这里。 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

export const postPath = (id: string) => withBase(`posts/${id}/`);
export const tagPath = (tag: string) => withBase(`tags/${encodeURIComponent(tag)}/`);
export const categoryPath = (id: string) => withBase(`categories/${id}/`);

/** 去掉 base 前缀后的路径，用于导航高亮比较。 */
export function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL || '/';
  if (base !== '/' && pathname.startsWith(base)) return `/${pathname.slice(base.length)}`;
  return pathname;
}
