/**
 * rss.xml.ts — RSS 订阅源。
 */

import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { SITE } from '../consts.ts';
import { allPosts } from '../lib/content.ts';
import { requireCategory } from '../lib/spectrum.ts';

export const GET: APIRoute = async (context) => {
  const posts = await allPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? 'https://hydrogen.puresky.dev',
    trailingSlash: true,
    customData: `<language>${SITE.lang}</language>`,
    items: posts.map((post) => {
      const category = requireCategory(post.data.category);
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/posts/${post.id}/`,
        // 分类和能级都带上，方便订阅端过滤。
        categories: [category.title, ...post.data.tags],
        customData: [
          `<hydrogen:shell>${post.data.shell}</hydrogen:shell>`,
          `<hydrogen:line>${category.line}</hydrogen:line>`,
          `<hydrogen:wavelength>${category.airWavelengthNm.toFixed(2)}</hydrogen:wavelength>`,
        ].join(''),
      };
    }),
    xmlns: { hydrogen: 'https://hydrogen.puresky.dev/ns/' },
  });
};
