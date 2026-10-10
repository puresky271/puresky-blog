# puresky-blog

puresky 的个人技术博客。仓库由静态站点、Cloudflare Worker API 和共享数据模块组成。

## 架构

- `site/`：Astro 静态站点。页面和文章内容在构建时生成，Svelte 用于播放器、主题等交互界面。
- `worker/`：Cloudflare Worker API，处理评论、浏览与点赞、登录会话，以及 GitHub、网易云等运行时数据代理。
- `shared/`：站点构建期和 Worker 共用的数据抓取与归一化代码。
- `archive/hydrogen-v1/`：旧版站点归档，仅供参考。

文章位于 `site/src/content/posts/`。`site/src/config.ts` 定义分类和标签词表，`site/src/content.config.ts` 校验文章；页面通过 `site/src/lib/content.ts` 查询内容。构建时会生成文章页和数据快照，浏览器再按需向 Worker 刷新动态数据，因此 API 暂时不可用时仍能显示最近一次构建的内容。

本地文章编辑器只在 `astro dev` 中注入：Svelte 和 CodeMirror 前端位于 `site/src/editor/`，本机 API 位于 `site/editor/`。预览复用站点的 Markdown 管线；文章、分类标签和系列写回内容文件或 `config.ts`。编辑器的 Git 面板将操作限制在文章目录和 `config.ts`。

## 开发

```sh
npm run setup
npm run dev
npm run dev:worker:offline
npm run check
npm run build
```

`npm run dev` 启动站点，编辑器地址为 `http://localhost:4321/__editor/`。站点和 Worker 各自维护依赖与锁文件；根目录脚本只转发常用命令。
