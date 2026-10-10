/**
 * integration.mjs — 本地文章编辑器。只在 `astro dev` 里存在：
 *   /__editor        编辑器页面（injectRoute 注入，构建产物里没有这个页面）
 *   /__editor/api/*  读写文章、整理分类标签和系列、预览、上传图片、Git（Vite dev server 中间件，见 api.mjs）
 * `astro build` 时这个集成什么都不做，线上站点里既没有页面也没有接口。
 *
 * config.ts 登记为 watch file：分类和标签词表变了，dev server 会原地重启（两三秒）。
 * 不重启的话，内容集合的 schema 还是旧词表，用了新标签的文章会校验失败，新标签页也是 404。
 */

import { fileURLToPath } from 'node:url';

import { createEditorApi } from './api.mjs';

/** @param {{ markdown: import('@astrojs/markdown-remark').AstroMarkdownOptions }} options */
export default function editor({ markdown }) {
  let root = '';
  return {
    name: 'puresky-editor',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute, addWatchFile, logger }) => {
        if (command !== 'dev') return;
        root = fileURLToPath(config.root);
        injectRoute({ pattern: '/__editor', entrypoint: './src/editor/EditorPage.astro' });
        addWatchFile(new URL('./src/config.ts', config.root));
        logger.info('本地文章编辑器：/__editor（只对本机开放）');
      },
      'astro:server:setup': ({ server }) => {
        const handler = createEditorApi({ root, markdown });
        server.middlewares.use('/__editor/api', (req, res) => void handler(req, res));
      },
    },
  };
}
