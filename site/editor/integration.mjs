/**
 * integration.mjs — 本地文章编辑器。只在 `astro dev` 里存在：
 *   /__editor        编辑器页面（injectRoute 注入，构建产物里没有这个页面）
 *   /__editor/api/*  读写文章、预览、上传图片、Git 提交推送（Vite dev server 中间件，见 api.mjs）
 * `astro build` 时这个集成什么都不做，线上站点里既没有页面也没有接口。
 */

import { fileURLToPath } from 'node:url';

import { createEditorApi } from './api.mjs';

/** @param {{ markdown: import('@astrojs/markdown-remark').AstroMarkdownOptions }} options */
export default function editor({ markdown }) {
  let root = '';
  return {
    name: 'puresky-editor',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute, logger }) => {
        if (command !== 'dev') return;
        root = fileURLToPath(config.root);
        injectRoute({ pattern: '/__editor', entrypoint: './src/editor/EditorPage.astro' });
        logger.info('本地文章编辑器：/__editor（只对本机开放）');
      },
      'astro:server:setup': ({ server }) => {
        const handler = createEditorApi({ root, markdown });
        server.middlewares.use('/__editor/api', (req, res) => void handler(req, res));
      },
    },
  };
}
