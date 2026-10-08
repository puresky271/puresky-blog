import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const sitemap = new URL(`${import.meta.env.BASE_URL}sitemap-index.xml`, context.site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
