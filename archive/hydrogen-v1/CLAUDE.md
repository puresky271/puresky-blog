# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库概览

个人技术博客「puresky's blog」，主题代号 Hydrogen。两个独立包：

- `site/` — Astro 5 静态站（TypeScript + Tailwind 4），纯静态无 SSR。
- `worker/` — Cloudflare Worker 后端（Hono）。评论、GitHub OAuth、浏览数/反应、审核、R2 图片。

全部代码注释是中文的，本文件沿用这个惯例。

## 常用命令

### site（需 Node ≥ 22.18）

```bash
npm run dev        # astro dev，本地 :4321
npm run build      # astro build && pagefind --site dist（生成搜索索引）
npm run check      # astro check（类型 + 内容 schema 校验）
npm run preview    # 预览构建产物
node scripts/generate-tokens.mjs        # 从物理 SSOT 重新生成 spectrum.generated.css
node scripts/generate-tokens.mjs check  # 校验生成物没被手改（CI 用）
```

generate-tokens.mjs 靠 Node 原生 TS 剥离直接 import `src/lib/*.ts`，所以对 Node 版本有硬性要求。

### worker

```bash
npm run dev         # wrangler dev --port 8787
npm run typecheck   # tsc --noEmit
npm run deploy      # 部署
npm run db:local    # 把 schema.sql 灌进本地 D1
npm run db:remote   # 灌进线上 D1
```

本地 secret 放 `worker/.dev.vars`（已 gitignore）；线上用 `wrangler secret put GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / SESSION_SECRET`。`wrangler.toml` 里的 D1 库 id 和 KV namespace id 是占位符，建库后要替换。

### 视觉验证（本地工具，不入库）

`_scratch/shoot.mjs` 用 playwright 对每个页面在暗/亮两种主题、桌面/移动两个视口下截图并收集控制台报错与 404。需要先起 dev server（:4321），Chromium 路径硬编码在脚本里。

## 架构

### Hydrogen 主题：物理量 SSOT 链

整个站点的视觉语言从氢原子物理推导，不是设计选择。推导链：

1. `site/src/lib/physics.ts` — 第一性原理层。里德伯常数（含约化质量修正）、玻尔能级、里德伯公式 `transitionWavelengthNm`、波长→sRGB（Dan Bruton 算法）、WCAG 对比度、`deriveInk`（保色相、抬明度直到达标）、电子云径向波函数、seeded random。
2. `site/src/lib/spectrum.ts` — 主题分类 SSOT。5 个分类各对应一条真实氢谱线（Hα/Hβ/Hγ/Hδ 巴尔末系 + Paα 帕申系伪彩色）。分类颜色就是那条谱线波长经 Bruton 转出的 sRGB。
3. `site/src/lib/shells.ts` — 文章分层 SSOT（玻尔模型 n=1..4），容量 2n²。`assertShellCapacity` 是构建期硬门：任一层超容直接抛错让 build 失败。
4. `site/src/lib/isotopes.ts` — 友链分层（氕/氘/氚），氚按 12.32 年半衰期衰减，作为死链复查提醒。
5. `site/scripts/generate-tokens.mjs` — 从上述 SSOT 生成 `src/styles/spectrum.generated.css`（Tailwind @theme + CSS 变量），生成物入库，check 模式校验一致性。

**核心约定：物理 SSOT 不可为内容让步。** 新增分类要在 spectrum.ts 里声明一条真实谱线；某层满了要把文章降层，不能改容量常数。`src/content.config.ts` 把 frontmatter 的 `category`/`shell`/`isotope` 约束到这些 SSOT，写了未声明的值构建直接失败而不是渲染出坏样式。

### 内容模型

`site/src/content/` 下三个集合：`posts/`（mdx）、`projects/`、`friends/`（json）。文章 `category` 必填，`shell` 默认 3。页面一律通过 `src/lib/content.ts` 查内容（草稿过滤、排序、壳层容量校验只有这一处实现），不要直接调 `getCollection`。

`src/lib/remark-callout.mjs` 支持 GitHub 风格 `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`；`src/lib/rehype-heading-anchors.mjs` 给 h2–h4 加保留中文的锚点。

### Worker

`worker/src/index.ts` 是 Hono 入口，路由分组：`/api/auth/*`（GitHub OAuth + PKCE）、`/api/comments/*`、`/api/views/*` 与 `/api/reactions/*`、`/api/admin/*`、`/media/*`（R2 直出）。绑定：D1、KV（会话）、R2、Workers AI、两个限流器（`unsafe.bindings`）。

改动时务必保持的设计约定：

- **CORS 只放行 `ALLOWED_ORIGINS` 白名单，不能用 `*`** — 接口带 credentials，通配会被浏览器拒掉，且任何站点都能带着用户 cookie 调用。
- **会话存在 KV，cookie 只放不透明 id**（`SameSite=None`，因为 API 与前端不同源）。服务端可随时吊销。
- **审核 fail-closed**（`src/lib/moderation.ts`）：先跑确定性规则，规则拦不住的再问 Workers AI；模型输出无法解析或调用失败一律送审，不放行。
- **被拒的评论返回 200 + pending**，不暴露「你是垃圾」——否则垃圾发布者会立刻调整措辞重试。
- **admin 全部返回 404 而非 403**，不暴露端点存在；OWNER 校验集中在中间件。
- **浏览数/反应去重不追踪用户**：按天加盐的 IP+UA 哈希（`visitorHash`），不设 cookie 不做指纹。
- **评论软删**（`deleted_at`），不硬删。

### 部署

同一份 site 代码部署到 Cloudflare Pages（根路径）和 GitHub Pages（`/puresky-blog/` 子路径）。`astro.config.mjs` 从环境变量推导 base：`CF_PAGES` → `/`；`GITHUB_ACTIONS` 或 `DEPLOY_TARGET=github-pages` 且生产 → `/puresky-blog/`。链接要经 `src/lib/format.ts` 的 `withBase` 拼接，不要手写绝对路径。
