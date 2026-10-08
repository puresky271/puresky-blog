/**
 * content.config.ts — 内容集合 schema。
 *
 * 关键点：category 和 shell 不是自由文本，它们被约束到物理 SSOT 上。
 * 写一个没在 spectrum.ts 里声明的分类，或者一个没在 shells.ts 里声明的能级，
 * 构建会直接失败，而不是渲染出一个没有颜色的分类。
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

import { CATEGORY_IDS } from './lib/spectrum.ts';
import { SHELL_NUMBERS } from './lib/shells.ts';
import { ISOTOPE_IDS } from './lib/isotopes.ts';

const shellEnum = z
  .number()
  .int()
  .refine((n) => SHELL_NUMBERS.includes(n), {
    message: `shell 必须是已声明的能级之一：${SHELL_NUMBERS.join(', ')}。见 src/lib/shells.ts。`,
  });

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(80),
      /** 摘要。列表页和 OG 卡片都用它，所以别留空。 */
      description: z.string().min(10).max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),

      /** 分类 = 一条氢谱线。取值见 spectrum.ts。 */
      category: z.enum(CATEGORY_IDS),

      /**
       * 能级 = 文章在玻尔模型里的层。1 是基态（全站只允许 2 篇）。
       * 默认放 3（记录层），因为大多数东西一开始都还没成型。
       */
      shell: shellEnum.default(3),

      tags: z.array(z.string().min(1).max(24)).default([]),

      /** 系列名。同系列文章在文末互相串联。 */
      series: z.string().optional(),
      /** 系列内序号。 */
      seriesOrder: z.number().int().positive().optional(),

      cover: image().optional(),
      coverAlt: z.string().optional(),

      draft: z.boolean().default(false),
      /** 关掉这篇文章的评论。 */
      commentsOff: z.boolean().default(false),

      /**
       * 标为 true 时正文顶部会显示一条时效提醒。
       * 用于结论可能已经过期但仍有参考价值的技术文。
       */
      mayBeStale: z.boolean().default(false),
    }),
});

/** 项目集合。首页和 /projects/ 用。 */
const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().max(60),
      tagline: z.string().max(120),
      /** 排序权重，大的在前。 */
      weight: z.number().int().default(0),
      status: z.enum(['active', 'maintained', 'paused', 'archived']),
      /** 起始年份。 */
      since: z.string(),
      stack: z.array(z.string()).default([]),
      repo: z.string().url().optional(),
      demo: z.string().url().optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      /** 关联的文章 slug，用于把项目和写过的文章串起来。 */
      relatedPosts: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
    }),
});

/** 友链集合。isotope 字段约束到 isotopes.ts。 */
const friends = defineCollection({
  loader: glob({ base: './src/content/friends', pattern: '**/*.{md,mdx,json,yaml}' }),
  schema: z.object({
    name: z.string().max(40),
    url: z.string().url(),
    blurb: z.string().max(80),
    isotope: z.enum(ISOTOPE_IDS),
    /** 建立友链的日期。氚档用它算剩余活度。 */
    since: z.coerce.date(),
    avatar: z.string().optional(),
    lastChecked: z.coerce.date().optional(),
  }),
});

export const collections = { posts, projects, friends };
