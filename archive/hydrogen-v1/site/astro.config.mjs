// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { remarkCallout } from './src/lib/remark-callout.mjs';
import { rehypeHeadingAnchors } from './src/lib/rehype-heading-anchors.mjs';

/*
 * 同一份代码要同时能部署到 Cloudflare Pages（根路径）和 GitHub Pages（仓库子路径），
 * 所以 site/base 从构建环境推导，而不是写死。
 */
const REPO_BASE = '/puresky-blog/';
const isCloudflarePages = Boolean(process.env.CF_PAGES);
const isGitHubPages =
  Boolean(process.env.GITHUB_ACTIONS) || process.env.DEPLOY_TARGET === 'github-pages';
const isProduction = process.env.NODE_ENV === 'production';

const runtimeBase = isCloudflarePages ? '/' : isGitHubPages && isProduction ? REPO_BASE : '/';
const runtimeSite = process.env.PUBLIC_SITE_ORIGIN || 'https://hydrogen.puresky.dev';

export default defineConfig({
  site: runtimeSite,
  base: runtimeBase,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/welcome/') &&
        !page.includes('/admin/') &&
        !/\/posts\/page\/\d+\/$/.test(page),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkCallout],
    rehypePlugins: [rehypeHeadingAnchors],
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
