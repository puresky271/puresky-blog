/**
 * content.config.ts — 内容集合 schema。
 *
 * category 约束到 config.ts 里声明的分类，写了未声明的值构建直接失败，
 * 而不是渲染出一个没有名字的分类页。
 */

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { CATEGORY_IDS } from './config';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(80),
      /** 摘要。列表页、搜索结果和 OG 卡片都用它，所以别留空。 */
      description: z.string().min(10).max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      category: z.enum(CATEGORY_IDS),
      tags: z.array(z.string().min(1).max(24)).default([]),

      /** 系列名。同系列文章在文末互相串联。 */
      series: z.string().optional(),
      seriesOrder: z.number().int().positive().optional(),

      /** 封面插画。列表卡片和文章头部都会用到。 */
      cover: image().optional(),
      coverAlt: z.string().optional(),

      /** 置顶到首页「精选」。 */
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      commentsOff: z.boolean().default(false),
      /** 结论可能已过期但仍有参考价值时打开，正文顶部会显示一条时效提醒。 */
      mayBeStale: z.boolean().default(false),
    }),
});

/** 插画。画廊页全部展示，featured 的那张放首页 hero。 */
const illustrations = defineCollection({
  loader: glob({ base: './src/content/illustrations', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(40),
      image: image(),
      /** 暗色模式下替换显示的版本。可选，白天和夜晚各一张时首页 hero 会跟着主题切换。 */
      imageDark: image().optional(),
      alt: z.string().min(2),
      date: z.coerce.date(),
      description: z.string().max(160).optional(),
      /** 作者或出处。自己画的可以不填。 */
      credit: z.string().optional(),
      creditUrl: z.url().optional(),
      featured: z.boolean().default(false),
      /** 生成的占位图。页面上会标注，换成真插画后删掉这个字段。 */
      placeholder: z.boolean().default(false),
    }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().max(60),
      tagline: z.string().max(120),
      /** 排序权重，大的在前。 */
      weight: z.number().int().default(0),
      status: z.enum(['active', 'maintained', 'paused', 'archived']),
      since: z.string(),
      stack: z.array(z.string()).default([]),
      /** GitHub 仓库 owner/name。填了就显示实时 star、语言和最近推送。 */
      repo: z
        .string()
        .regex(/^[\w.-]+\/[\w.-]+$/, 'repo 写成 owner/name')
        .optional(),
      demo: z.url().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      relatedPosts: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
    }),
});

const friends = defineCollection({
  loader: glob({ base: './src/content/friends', pattern: '**/*.{json,yaml}' }),
  schema: z.object({
    name: z.string().max(40),
    url: z.url(),
    blurb: z.string().max(80),
    avatar: z.url().optional(),
    since: z.coerce.date(),
  }),
});

export const collections = { posts, illustrations, projects, friends };
