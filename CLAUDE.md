# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库概览

个人技术博客「puresky」第二版。三块：

- `site/` — Astro 7 静态站（TypeScript + Svelte 5 岛屿 + Tailwind 4），纯静态无 SSR。
- `worker/` — Cloudflare Worker 后端（Hono）。评论、GitHub OAuth、浏览数/点赞、审核、GitHub 与网易云代理、R2 媒体直出。
- `shared/` — site 构建期和 worker 运行时共用的数据抓取与归一化（GitHub、网易云、天气）。改这里两边同时生效。
- `archive/hydrogen-v1/` — 第一版（Hydrogen 主题）的完整归档，只读参考，不参与构建。

全部代码注释是中文的，沿用这个惯例。界面文案不用破折号「——」。

## 常用命令

### site（Node ≥ 22.12）

```bash
npm run dev       # astro dev，本地 :4321。.env.development 让 API 指向本地 worker :8787
npm run build     # astro build && pagefind（生成搜索索引；开发模式下没有搜索）
npm run check     # astro check + svelte-check，两者都应 0 错误 0 警告
npm run icons     # 改了 scripts/gen-icons.mjs 的图标列表后重新生成 src/lib/icons.generated.ts
```

构建时可设 `GITHUB_TOKEN`：有它 GitHub 快照走 GraphQL（精确贡献日历、个人状态），没有就走公开接口。
开发模式下 GitHub / 网易云快照缓存在 `node_modules/.cache/puresky/`（30 分钟），要强制刷新就删掉这个目录。

### worker

```bash
npm run dev           # 需要先 npx wrangler login（Workers AI 绑定只能连远端）
npm run dev:offline   # 不登录也能跑，用 wrangler.offline.toml（去掉了 AI，审核 fail-closed）
npm run typecheck
npm run db:local      # 把 schema.sql 灌进本地 D1（首次本地开发前跑一次）
npm run deploy
```

本地 secret 放 `worker/.dev.vars`（已 gitignore）；线上 `wrangler secret put GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / SESSION_SECRET / GITHUB_TOKEN(可选)`。
`wrangler.toml` 里 D1 和两个 KV 的 id 是占位符，建好后替换；改绑定时同步改 `wrangler.offline.toml`。

### 视觉验证（本地工具，不入库）

`_scratch/shoot2.mjs` 截图并收集控制台报错与失败请求：
`MSYS_NO_PATHCONV=1 node shoot2.mjs home=/ post=/posts/x/ --vp=desktop,mobile --themes=light,dark --full`。
路径参数里用 `~` 代替 `&`（shell 会吃掉 &）。`_scratch/sheet.mjs` 把多张截图拼成对照图。

## 架构

### 配置唯一入口

`site/src/config.ts`：作者信息、GitHub 账号与仓库、网易云歌单 id、天气地点（固定沈阳）、导航、分类。
页面和组件不写死任何个人信息。worker 侧对应的是 `wrangler.toml` 的 `[vars]`（GITHUB_USERNAME、MUSIC_PLAYLISTS 要和 config.ts 一致）。

### 内容

`site/src/content/` 四个集合：`posts`（mdx）、`illustrations`（md + `src/assets/illustrations` 里的图）、`projects`、`friends`（json）。
页面一律通过 `src/lib/content.ts` 查内容（草稿过滤、排序、统计只在这一处），不直接调 `getCollection`。
Markdown 走 `unified()` 处理器：`remark-cjk-friendly`（中文全角标点旁的加粗）、`remark-cjk-lines`（去掉汉字间软换行）、
`remark-callout`（`> [!NOTE]`）、`rehype-heading-anchors`（保留中文的锚点）、`rehype-external-links`。
正文排版在 `styles/prose.css`，必须在页面 frontmatter 里全局 import，不能放进作用域 `<style>`（Markdown 输出没有作用域属性）。

### 设计令牌

`styles/global.css`：全部颜色是 OKLCH 语义令牌（`--bg/--surface/--fg/--accent…`），亮暗各一套，组件只用 `bg-surface`、`text-fg-muted` 这类名字。
混色一律 `color-mix(in oklab, …)`，不要用 `in oklch`（和近乎无彩色混时会按色相插值，红色混出来偏蓝）。
圆角：卡片 18px、控件 10px、按钮/胶囊全圆角。z-index 只用文件头列出的几档。
主题三态（系统/亮/暗）在 `lib/theme.ts`；首屏主题由 Base.astro 的内联脚本在绘制前设定。
切主题的圆形揭示靠 `<html class="theme-vt">` 期间冻结过渡、去掉 view-transition-name 和毛玻璃（global.css），新增带 transition:name 的元素不需要额外处理。

- 组件里的自定义类名不能和 Tailwind 工具类重名（`outline`、`ring`、`container`、`shadow`…），否则会平白多出线框和阴影。
- 原生滚动条全部隐藏：页面级由 `layout/PageScrollbar.astro` 画，滚动容器用 global.css 的 `::-webkit-scrollbar`。
  组件里不要写 `scrollbar-width: thin`，Chromium 见到它就会忽略全局的滚动条样式，变回原生外观。
- 页脚：首页是幕布式的 `layout/CurtainFooter.astro`（`<Base footer="curtain">`，sticky 在 `.page-sheet` 后面），其他页面是普通的 `Footer.astro`。

### 天色（时间 + 天气）

`lib/sky/ambient.ts` 把沈阳此刻的时段（按日出日落分破晓/白天/黄昏/夜晚）和天气（Open-Meteo，浏览器直连）写到 `<html data-phase data-weather>`，并广播 `ambient:change`。
驱动：hero 天空底色（global.css 的 `--sky-*`，注册为 @property 可过渡）、粒子形态（`lib/sky/field.ts`：风/星/雨/雪 + 云层）、插画昼夜版本、时钟卡、终端。
亮暗主题只决定这些元素的深浅，和天色是两个独立维度。`?sky=dusk&weather=rain` 可预览任意组合，`?sky=auto` 恢复。

### 首页舞台（横版多功能区）

`components/home/stage/HomeStage.svelte`：插画 / 天空 / 音乐（过载）三种模式；过载里有 MV 时可进入第二层视频过载。规则参照 mygo_chat：
播放器是全局单例（`lib/player/store.svelte.ts`，持有唯一的 `<audio>`，跨页面不断）；在别处开始播放回到首页即为过载；
从停到播的瞬间自动进入过载，手动切走则尊重选择；过载里的 × 是硬退出（停止播放）。舞台处于过载并可见时右下角浮动播放器让位（`dockSuppressed`）。

### 播放器与曲库

两个来源统一成 `lib/player/types.ts` 的 `MediaTrack`：
- 本地曲库：构建期扫描 `site/public/media/songs/`（约定同 mygo_chat 的 `lyrics_songs`，见该目录 README），生成 `/data/local-songs.json`。大文件放 R2，用 `MEDIA_DIR` + `PUBLIC_MEDIA_BASE`。
- 网易云：构建期快照 `/data/playlist.json`，运行时经 worker 刷新；歌词和 MV 地址（带时效签名）经 worker 现取。
  音频由访客浏览器直接请求网易云外链（版权按请求方 IP 判断，经 worker 代理会变成海外 IP）。

### 快照 + 刷新

GitHub 与网易云数据在构建期抓一份快照渲染进页面（`lib/snapshots.ts`），运行时再由 worker 刷新（`lib/github-live.svelte.ts`、播放器 store）。
worker 挂了页面上仍是上次构建的数据，不会是一片骨架屏。构建不能因第三方接口失败而失败。

### Worker

改动时务必保持的设计约定：

- **CORS 只放行 `ALLOWED_ORIGINS` 白名单，不能用 `*`** — 接口带 credentials。
- **会话存在 KV，cookie 只放不透明 id**（`SameSite=None`，API 与前端不同源）。服务端可随时吊销。
- **审核 fail-closed**（`lib/moderation.ts`）：规则拦不住的再问 Workers AI；模型不可用或输出无法解析一律送审。
- **被拒的评论返回 200 + pending**，不暴露「你是垃圾」。
- **admin 全部返回 404 而非 403**，OWNER 校验集中在中间件。
- **浏览数/点赞去重不追踪用户**：按天加盐的 IP+UA 哈希，不设 cookie 不做指纹。
- **评论软删**（`deleted_at`）；楼中楼只有一层，回复回复时挂到根评论。
- **代理不做开放代理**：GitHub 只代理配置的账号，网易云歌单只代理白名单；第三方响应缓存在 KV（`lib/cache.ts`），只在缓存未命中时过 `PROXY_LIMITER`，上游失败时用过期值兜底（MV 除外）。
- **`/media/*` 支持 Range**，本地曲库放 R2 时音视频才能拖进度。

### 部署

同一份 site 部署到 Cloudflare Pages（根路径）和 GitHub Pages（`/puresky-blog/` 子路径），`astro.config.mjs` 从环境变量推导 base。
站内链接和 fetch 路径一律经 `src/lib/format.ts` 的 `withBase`，不手写绝对路径。
Cloudflare Pages 单文件上限 25MB：无损音频和视频不要放进 `public/`，放 R2。
