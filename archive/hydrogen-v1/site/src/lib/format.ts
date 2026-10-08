/**
 * format.ts — 展示层格式化。
 */

import { SITE } from '../consts.ts';

const DATE_FULL = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: SITE.timeZone,
});

const DATE_SHORT = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: SITE.timeZone,
});

const DATE_MONTH_DAY = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  timeZone: SITE.timeZone,
});

export function formatDate(date: Date): string {
  return DATE_FULL.format(date);
}

/** 等宽场景用的短日期，例如 2026-07-30。 */
export function formatDateISO(date: Date): string {
  return DATE_SHORT.format(date).replace(/\//g, '-');
}

export function formatMonthDay(date: Date): string {
  return DATE_MONTH_DAY.format(date).replace(/\//g, '-');
}

/** machine-readable，用于 <time datetime>。 */
export function toDatetimeAttr(date: Date): string {
  return date.toISOString();
}

/**
 * 相对时间。只在 7 天内用相对表述，更久就给绝对日期，
 * 因为「3 个月前」这种说法对读者判断技术文时效没有帮助。
 */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / 86_400_000;

  if (diffDays < 0) return formatDate(date);
  if (diffDays < 1 / 24) return '刚刚';
  if (diffDays < 1) return `${Math.floor(diffDays * 24)} 小时前`;
  if (diffDays < 2) return '昨天';
  if (diffDays < 7) return `${Math.floor(diffDays)} 天前`;
  return formatDate(date);
}

/** 拼接 base path，避免部署到子路径时链接断掉。 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

/** 文章 URL。 */
export function postPath(id: string): string {
  return withBase(`posts/${id}/`);
}

export function categoryPath(id: string): string {
  return withBase(`spectrum/${id}/`);
}

export function shellPath(n: number): string {
  return withBase(`shells/${n}/`);
}

export function tagPath(tag: string): string {
  return withBase(`cloud/${encodeURIComponent(tag.toLowerCase())}/`);
}

/** 数字补零，用于等宽场景对齐。 */
export function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** 截断到指定字数并补省略号。中文按字算。 */
export function truncate(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  return `${chars.slice(0, max - 1).join('')}…`;
}
