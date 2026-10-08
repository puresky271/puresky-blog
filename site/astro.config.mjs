// @ts-check
import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import remarkCjkFriendly from 'remark-cjk-friendly';

import { rehypeExternalLinks } from './src/lib/markdown/rehype-external-links.mjs';
import { rehypeHeadingAnchors } from './src/lib/markdown/rehype-heading-anchors.mjs';
import { remarkCallout } from './src/lib/markdown/remark-callout.mjs';
import { remarkCjkLines } from './src/lib/markdown/remark-cjk-lines.mjs';

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
const runtimeSite = process.env.PUBLIC_SITE_ORIGIN || 'https://puresky.dev';

export default defineConfig({
  site: runtimeSite,
  base: runtimeBase,
  trailingSlash: 'always',
  output: 'static',
  // Astro 7 默认按 JSX 规则吞掉行内元素之间的空白，中英混排里会把「中文 <code>x</code> 中文」粘在一起。
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  integrations: [
    svelte(),
    mdx(),
    sitemap({
      filter: (page) => !/\/posts\/\d+\/$/.test(page),
    }),
  ],
  markdown: {
    processor: unified({
      // cjk-friendly：让「**依赖。**不是」这类全角标点紧贴定界符的加粗也能成立。
      remarkPlugins: [remarkCjkFriendly, remarkCjkLines, remarkCallout],
      rehypePlugins: [rehypeHeadingAnchors, rehypeExternalLinks],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // shared/ 在站点根目录之外，dev server 默认不允许读取。
    server: { fs: { allow: ['..'] } },
  },
});
