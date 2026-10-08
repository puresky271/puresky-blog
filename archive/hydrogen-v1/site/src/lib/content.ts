/**
 * content.ts — 内容查询层。
 *
 * 所有页面通过这里读文章，不直接调 getCollection，好让草稿过滤、
 * 排序规则、壳层容量校验只有一处实现。
 */

import { getCollection, type CollectionEntry } from 'astro:content';

import { CJK_CHARS_PER_MINUTE, LATIN_WORDS_PER_MINUTE } from '../consts.ts';
import { requireCategory, type Category } from './spectrum.ts';
import { assertShellCapacity, requireShell, type Shell } from './shells.ts';

export type Post = CollectionEntry<'posts'>;
export type Project = CollectionEntry<'projects'>;
export type Friend = CollectionEntry<'friends'>;

/** 生产构建隐藏草稿；dev 下显示，方便预览。 */
const includeDrafts = import.meta.env.DEV;

function byDateDesc(a: Post, b: Post): number {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

/**
 * 取全部已发布文章，按日期倒序。
 *
 * 顺带执行壳层容量硬门：任一层超过 2n² 就抛错让构建失败。
 * 放在这里是因为它是唯一所有页面都会经过的入口。
 */
export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => includeDrafts || !data.draft);
  const counts = new Map<number, number>();
  for (const post of posts) {
    counts.set(post.data.shell, (counts.get(post.data.shell) ?? 0) + 1);
  }
  assertShellCapacity(counts);
  return posts.sort(byDateDesc);
}

export async function postsByCategory(categoryId: string): Promise<Post[]> {
  const posts = await allPosts();
  return posts.filter((p) => p.data.category === categoryId);
}

export async function postsByShell(n: number): Promise<Post[]> {
  const posts = await allPosts();
  return posts.filter((p) => p.data.shell === n);
}

export async function postsByTag(tag: string): Promise<Post[]> {
  const posts = await allPosts();
  const needle = tag.toLowerCase();
  return posts.filter((p) => p.data.tags.some((t) => t.toLowerCase() === needle));
}

export async function postsBySeries(series: string): Promise<Post[]> {
  const posts = await allPosts();
  return posts
    .filter((p) => p.data.series === series)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

export interface TagStat {
  tag: string;
  count: number;
  /** 这个标签下出现最多的分类，决定它在电子云里的颜色。 */
  dominantCategory: Category;
  /** 该标签涉及的最内层能级，决定它落在哪个轨道上。 */
  innermostShell: Shell;
}

/**
 * 标签统计。电子云的数据源。
 *
 * 两个派生量的用意：
 *   dominantCategory 决定散点颜色，所以云里的颜色分布反映真实的主题构成。
 *   innermostShell 决定轨道，标签涉及越核心的文章，它的云就越贴近原子核。
 */
export async function tagStats(): Promise<TagStat[]> {
  const posts = await allPosts();
  const buckets = new Map<string, { count: number; categories: string[]; shells: number[] }>();

  for (const post of posts) {
    for (const rawTag of post.data.tags) {
      const key = rawTag.trim();
      if (!key) continue;
      const bucket = buckets.get(key) ?? { count: 0, categories: [], shells: [] };
      bucket.count += 1;
      bucket.categories.push(post.data.category);
      bucket.shells.push(post.data.shell);
      buckets.set(key, bucket);
    }
  }

  const stats: TagStat[] = [];
  for (const [tag, bucket] of buckets) {
    const tally = new Map<string, number>();
    for (const c of bucket.categories) tally.set(c, (tally.get(c) ?? 0) + 1);
    // 并列时按分类在 spectrum.ts 里的声明顺序取第一个，保证结果确定。
    const dominant = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    stats.push({
      tag,
      count: bucket.count,
      dominantCategory: requireCategory(dominant),
      innermostShell: requireShell(Math.min(...bucket.shells)),
    });
  }

  // 先按出现次数降序，同次数按标签名排序，避免每次构建顺序抖动。
  return stats.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/** 分类统计，光谱页用。 */
export async function categoryStats(): Promise<
  Array<{ category: Category; count: number; latest: Post | null }>
> {
  const posts = await allPosts();
  const { CATEGORIES } = await import('./spectrum.ts');
  return CATEGORIES.map((category) => {
    const own = posts.filter((p) => p.data.category === category.id);
    return { category, count: own.length, latest: own[0] ?? null };
  });
}

/** 能级统计，玻尔模型页用。 */
export async function shellStats(): Promise<
  Array<{ shell: Shell; posts: Post[]; occupied: number }>
> {
  const posts = await allPosts();
  const { SHELLS } = await import('./shells.ts');
  return SHELLS.map((shell) => {
    const own = posts.filter((p) => p.data.shell === shell.n);
    return { shell, posts: own, occupied: own.length };
  });
}

export async function allProjects(): Promise<Project[]> {
  const projects = await getCollection('projects');
  return projects.sort(
    (a, b) => b.data.weight - a.data.weight || a.data.name.localeCompare(b.data.name)
  );
}

export async function allFriends(): Promise<Friend[]> {
  return getCollection('friends');
}

/**
 * 阅读时长估算。中英文分开算，因为按词数算中文会严重低估。
 * 返回分钟数，最少 1。
 */
export function readingMinutes(body: string): number {
  const cjkChars = (body.match(/[㐀-鿿぀-ヿ]/g) ?? []).length;
  const latinWords = (body.replace(/[㐀-鿿぀-ヿ]/g, ' ').match(/\b[\w'-]+\b/g) ?? [])
    .length;
  const minutes = cjkChars / CJK_CHARS_PER_MINUTE + latinWords / LATIN_WORDS_PER_MINUTE;
  return Math.max(1, Math.round(minutes));
}

/** 正文字数，中文按字算、西文按词算后相加。 */
export function contentLength(body: string): number {
  const cjkChars = (body.match(/[㐀-鿿぀-ヿ]/g) ?? []).length;
  const latinWords = (body.replace(/[㐀-鿿぀-ヿ]/g, ' ').match(/\b[\w'-]+\b/g) ?? [])
    .length;
  return cjkChars + latinWords;
}

/**
 * 相关文章。打分规则按可靠性从高到低：
 *   同系列 +6（最强信号，作者明确编排过）
 *   同标签 +2/个
 *   同分类 +2
 *   同能级 +1
 * 不引入向量检索，因为在几十篇的量级上，标签和系列这类人工信号更准。
 */
export async function relatedPosts(current: Post, limit = 3): Promise<Post[]> {
  const posts = await allPosts();
  const currentTags = new Set(current.data.tags.map((t) => t.toLowerCase()));

  const scored = posts
    .filter((p) => p.id !== current.id)
    .map((post) => {
      let score = 0;
      if (current.data.series && post.data.series === current.data.series) score += 6;
      for (const tag of post.data.tags) {
        if (currentTags.has(tag.toLowerCase())) score += 2;
      }
      if (post.data.category === current.data.category) score += 2;
      if (post.data.shell === current.data.shell) score += 1;
      return { post, score };
    })
    .filter((entry) => entry.score > 0);

  return scored
    .sort(
      (a, b) =>
        b.score - a.score || b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime()
    )
    .slice(0, limit)
    .map((entry) => entry.post);
}

/** 按年份分组，归档页用。 */
export function groupByYear(posts: Post[]): Array<{ year: number; posts: Post[] }> {
  const buckets = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.pubDate.getFullYear();
    const list = buckets.get(year) ?? [];
    list.push(post);
    buckets.set(year, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, posts: list.sort(byDateDesc) }));
}

/** 上一篇 / 下一篇，按发布时间。 */
export async function adjacentPosts(
  current: Post
): Promise<{ newer: Post | null; older: Post | null }> {
  const posts = await allPosts();
  const index = posts.findIndex((p) => p.id === current.id);
  if (index === -1) return { newer: null, older: null };
  return {
    newer: posts[index - 1] ?? null,
    older: posts[index + 1] ?? null,
  };
}
