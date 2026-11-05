/**
 * archive.ts — 归档页的数据整理。
 *
 * 年月分组键用 formatDateISO（作者时区）取，不要用 Date 的本地年月：
 * 构建机时区不同会把月初的文章分错月份，首页日历依赖的 #YYYY-MM 锚点也会对不上。
 * 分组结果一次算好，页面和组件只负责渲染。
 */

import { categoryOf, postMinutes, postWords, subcategoryOf, type Post } from '@/lib/content';
import { formatDateISO } from '@/lib/format';

const MONTH_CN = new Intl.DateTimeFormat('zh-CN', { month: 'long', timeZone: 'UTC' });
const MONTH_EN = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export interface ArchiveEntry {
  post: Post;
  /** 两位补零的日号。条目里只显示它，年月由分组标题交代。 */
  day: string;
  /** 一级分类中文名，右侧 meta 和密视图的类型标签都用它。 */
  category: string;
  /** 二级分类中文名，只出现在舒视图的 meta 里。 */
  subcategory: string;
}

export interface ArchiveMonth {
  /** 锚点，YYYY-MM。首页日历点一天多篇的日子时直接跳这个。 */
  key: string;
  month: number;
  /** 「十一月 · NOV」形式的小标签。 */
  label: string;
  count: number;
  /** 概览视图里条形图的宽度百分比，按同一年的最多月份归一。 */
  percent: number;
  entries: ArchiveEntry[];
}

export interface ArchiveYear {
  year: string;
  count: number;
  months: ArchiveMonth[];
}

export interface ArchiveStats {
  posts: number;
  words: number;
  minutes: number;
  categories: number;
  tags: number;
}

export interface Archive {
  years: ArchiveYear[];
  stats: ArchiveStats;
  /** 最早的一篇，页头那句「从哪天写到现在」用它。 */
  first?: Post;
}

function monthLabel(month: string): string {
  // 月份名只和月份有关，用固定年份加 UTC 格式化，避免受构建机时区影响。
  const date = new Date(Date.UTC(2026, Number(month) - 1, 1));
  return `${MONTH_CN.format(date)} · ${MONTH_EN.format(date).toUpperCase()}`;
}

export function buildArchive(posts: Post[]): Archive {
  const years = new Map<string, { months: Map<string, ArchiveEntry[]>; count: number }>();

  for (const post of posts) {
    const [year, month, day] = formatDateISO(post.data.pubDate).split('-');
    const entry: ArchiveEntry = {
      post,
      day,
      category: categoryOf(post.data.category).label,
      subcategory: subcategoryOf(post.data.subcategory).label,
    };
    const bucket = years.get(year) ?? { months: new Map(), count: 0 };
    bucket.count += 1;
    bucket.months.set(month, [...(bucket.months.get(month) ?? []), entry]);
    years.set(year, bucket);
  }

  return {
    // getPosts 已按发布日期倒序，Map 的插入顺序天然就是年、月倒序。
    years: [...years].map(([year, bucket]) => {
      const months = [...bucket.months].map(([month, entries]) => ({
        key: `${year}-${month}`,
        month: Number(month),
        label: monthLabel(month),
        count: entries.length,
        percent: 0,
        entries,
      }));
      // 条形图最短也要有一小截，空月份不渲染，所以最大月的比例一定有 100。
      const most = Math.max(...months.map((m) => m.count), 1);
      for (const month of months) month.percent = Math.max(6, Math.round((month.count / most) * 100));
      return { year, count: bucket.count, months };
    }),
    stats: {
      posts: posts.length,
      words: posts.reduce((n, post) => n + postWords(post), 0),
      minutes: posts.reduce((n, post) => n + postMinutes(post), 0),
      categories: new Set(posts.map((post) => post.data.category)).size,
      tags: new Set(posts.flatMap((post) => post.data.tags)).size,
    },
    first: posts.at(-1),
  };
}
