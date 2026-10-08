/**
 * content.ts — 内容查询的唯一入口。
 *
 * 草稿过滤、排序、分类与标签统计只在这里实现一次。
 * 页面不要直接调 getCollection，否则草稿会在某个角落漏出去。
 */

import { getCollection, type CollectionEntry } from 'astro:content';

import { CATEGORIES, TAG_GROUPS, TAGS, type CategoryId } from '@/config';
import { formatDateISO, readingMinutes, wordCount } from '@/lib/format';

export type Post = CollectionEntry<'posts'>;
export type Illustration = CollectionEntry<'illustrations'>;
export type Project = CollectionEntry<'projects'>;
export type Friend = CollectionEntry<'friends'>;

const showDrafts = import.meta.env.DEV;

let postsCache: Promise<Post[]> | null = null;

/** 全部已发布文章，按发布日期倒序。开发模式下包含草稿。 */
export function getPosts(): Promise<Post[]> {
  postsCache ??= getCollection('posts', (p) => showDrafts || !p.data.draft).then((posts) =>
    posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
  );
  return postsCache;
}

export async function getPost(id: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.id === id);
}

export function postMinutes(post: Post): number {
  return readingMinutes(post.body ?? '');
}

export function postWords(post: Post): number {
  return wordCount(post.body ?? '');
}

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}

export async function getCategories() {
  const posts = await getPosts();
  return CATEGORIES.map((c) => ({
    ...c,
    count: posts.filter((p) => p.data.category === c.id).length,
  }));
}

/** 标签及其文章数，只含用到过的，按数量降序、同数量按字典序。 */
export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const post of await getPosts()) {
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export type TagEntry = (typeof TAGS)[number];
export type TagStat = TagEntry & { count: number };

/** 按名字查词表里的标签。 */
export function tagOf(name: string): TagEntry | undefined {
  return TAGS.find((t) => t.name === name);
}

/** 词表里的每个标签和它的文章数（没用到的为 0），保持词表里的顺序。 */
export async function getTagStats(): Promise<TagStat[]> {
  const counts = new Map((await getTags()).map(({ tag, count }) => [tag, count]));
  return TAGS.map((t) => ({ ...t, count: counts.get(t.name) ?? 0 }));
}

/** 按分组列出词表。标签页展示完整的词表，没写过的标签淡显。 */
export async function getTagGroups() {
  const stats = await getTagStats();
  return TAG_GROUPS.map((group) => ({ ...group, tags: stats.filter((t) => t.group === group.id) }));
}

/** 和某个标签一起出现得最多的标签（共现次数降序）。 */
export async function getRelatedTags(name: string, limit = 6): Promise<TagStat[]> {
  const together = new Map<string, number>();
  for (const post of await getPosts()) {
    if (!post.data.tags.includes(name as never)) continue;
    for (const tag of post.data.tags) if (tag !== name) together.set(tag, (together.get(tag) ?? 0) + 1);
  }
  const stats = await getTagStats();
  return stats
    .filter((t) => together.has(t.name))
    .sort((a, b) => together.get(b.name)! - together.get(a.name)! || b.count - a.count)
    .slice(0, limit);
}

/** 某个分类下最常用的标签。 */
export async function getCategoryTags(id: CategoryId, limit = 8): Promise<TagStat[]> {
  const counts = new Map<string, number>();
  for (const post of await getPosts()) {
    if (post.data.category !== id) continue;
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const stats = await getTagStats();
  return stats
    .filter((t) => counts.has(t.name))
    .sort((a, b) => counts.get(b.name)! - counts.get(a.name)!)
    .slice(0, limit)
    .map((t) => ({ ...t, count: counts.get(t.name)! }));
}

/** 时间上相邻的两篇。newer 是更新的那篇。 */
export async function getAdjacent(post: Post): Promise<{ newer?: Post; older?: Post }> {
  const posts = await getPosts();
  const index = posts.findIndex((p) => p.id === post.id);
  return { newer: posts[index - 1], older: posts[index + 1] };
}

/** 同系列文章，按系列序号排。 */
export async function getSeries(post: Post): Promise<Post[]> {
  if (!post.data.series) return [];
  return (await getPosts())
    .filter((p) => p.data.series === post.data.series)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

/**
 * 相关文章：共同标签数优先，同分类加一分，再按时间。
 * 不在系列里的才算，系列文章已经在系列导航里出现过了。
 */
export async function getRelated(post: Post, limit = 3): Promise<Post[]> {
  const series = new Set((await getSeries(post)).map((p) => p.id));
  const tags = new Set(post.data.tags);
  return (await getPosts())
    .filter((p) => p.id !== post.id && !series.has(p.id))
    .map((p) => ({
      post: p,
      score:
        p.data.tags.filter((t) => tags.has(t)).length +
        (p.data.category === post.data.category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime())
    .slice(0, limit)
    .map((x) => x.post);
}

/**
 * 日历用的「哪天发了什么」。键是作者时区下的 YYYY-MM-DD。
 * 只带标题和链接需要的字段，这份数据会序列化进页面。
 */
export async function getPostCalendar(): Promise<Record<string, { id: string; title: string }[]>> {
  const map: Record<string, { id: string; title: string }[]> = {};
  for (const post of await getPosts()) {
    const key = formatDateISO(post.data.pubDate);
    (map[key] ??= []).push({ id: post.id, title: post.data.title });
  }
  return map;
}

export async function getIllustrations(): Promise<Illustration[]> {
  const items = await getCollection('illustrations');
  return items.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** 首页 hero 用的插画：标了 featured 的最新一张，没有就取最新一张。 */
export async function getHeroIllustration(): Promise<Illustration | undefined> {
  const items = await getIllustrations();
  return items.find((i) => i.data.featured) ?? items[0];
}

export async function getProjects(): Promise<Project[]> {
  const items = await getCollection('projects');
  return items.sort((a, b) => b.data.weight - a.data.weight);
}

export async function getFriends(): Promise<Friend[]> {
  const items = await getCollection('friends');
  return items.sort((a, b) => a.data.since.getTime() - b.data.since.getTime());
}
