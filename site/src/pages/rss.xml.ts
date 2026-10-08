import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { AUTHOR, SITE } from '@/config';
import { getPosts } from '@/lib/content';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: new URL(import.meta.env.BASE_URL, context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `posts/${post.id}/`,
      categories: post.data.tags,
      author: AUTHOR.name,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
}
