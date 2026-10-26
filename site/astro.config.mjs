// @ts-check
import './scripts/patch-fs-rename.mjs';

import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import rehypeKatex from 'rehype-katex';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkMath from 'remark-math';

import editor from './editor/integration.mjs';
import { remarkAnimation } from './src/lib/markdown/remark-animation.mjs';
import { rehypeExternalLinks } from './src/lib/markdown/rehype-external-links.mjs';
import { rehypeHeadingAnchors } from './src/lib/markdown/rehype-heading-anchors.mjs';
import { remarkCallout } from './src/lib/markdown/remark-callout.mjs';
import { remarkCjkLines } from './src/lib/markdown/remark-cjk-lines.mjs';
import { remarkCodeTabs } from './src/lib/markdown/remark-code-tabs.mjs';
import { remarkLocalImages } from './src/lib/markdown/remark-local-images.mjs';

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

/*
 * Markdown 管线。站点和本地编辑器的预览共用同一份，预览里看到的就是发布后的样子。
 * cjk-friendly：让「**依赖。**不是」这类全角标点紧贴定界符的加粗也能成立。
 * local-images：文章图片不进仓库，没有图的构建（CI、别人 clone）跳过缺的图，而不是构建失败。
 * code-tabs：:::tabs 容器里的相邻围栏代码块合成多语言选项卡（见 remark-code-tabs.mjs 头注释）。
 * animation：:::animation 容器里的 YAML 配置生成受限的内置动画挂载点。
 * math：$...$ 行内公式、$$...$$ 行间公式，渲染成 KaTeX（样式在 prose.css 顶部 @import）。
 */
const remarkPlugins = [remarkCjkFriendly, remarkMath, remarkCjkLines, remarkCallout, remarkLocalImages, remarkCodeTabs, remarkAnimation];
const rehypePlugins = [rehypeKatex, rehypeHeadingAnchors, rehypeExternalLinks];
const shikiConfig = /** @type {const} */ ({
  themes: { light: 'github-light', dark: 'github-dark-dimmed' },
  wrap: false,
  // shiki 自带的别名表没有这几个常见写法，不写别名的话围栏会静默退成纯文本。
  langAlias: { python3: 'python', golang: 'go', 'c++': 'cpp', 'c#': 'csharp' },
});
const runtimeSite = process.env.PUBLIC_SITE_ORIGIN || 'https://pureskyblog.dpdns.org';

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
    // 只在 astro dev 里生效，构建时什么都不注入。
    editor({ markdown: { remarkPlugins, rehypePlugins, shikiConfig } }),
  ],
  markdown: {
    processor: unified({ remarkPlugins, rehypePlugins }),
    shikiConfig,
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
    server: {
      fs: { allow: ['..'] },
      watch: {
        // Astro 的内容缓存不需要被 Vite 再监听；Windows 上自己监听自己会导致
        // data-store.json 的原子 rename 偶发 EPERM。
        ignored: ['**/.astro/**', '**/node_modules/.astro/**'],
      },
    },
  },
});
