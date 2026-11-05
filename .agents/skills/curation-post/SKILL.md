---
name: curation-post
description: 把一篇外部文章（研究博客、工程博客、公司长文）做成 puresky-blog 的「精选收录」中英对照长文：抓原文、提原图、逐段翻译、配中文小字图注和自己的注解。用户给出外部链接要求收录、翻译、导读，或说「精选收录这一篇」「处理这篇原文」时使用。不用于站内原创文章、算法题解，也不用于论文精读（论文用 paper-reading）。
---

# 精选收录

外部文章在站内以 `category: curation` 出现，形态是**中英逐段对照**：读者用文章顶部的「中文译文 / 英文原文」滑块切换。产物是一个 Markdown 文件加一个图片目录，只靠既有的 `remark-paper` 容器，不写组件、不改渲染管线。

核心原则：**英文那一半是原文，不动；中文那一半是译文，读起来要像中文写作而不是翻译腔；图用原图，图下那行中文小字写「这张图该看哪里」；注解是编辑判断，不放进译文。**

## 何时使用

- 用户给出一个外部链接，要求「收录」「精选收录」「翻译成中文」「做个导读」。
- 一篇值得留档的长文，站内需要能读中文、也能对照英文原文。
- 已有的精选收录文章要补图、补注解、改译文。

不适用：

- 论文、技术报告、带公式和实验章节的 PDF（用 `paper-reading`）。
- 站内自己写的文章（直接写 `.md`，不需要对照容器）。
- 只要一段摘要或书签式推荐（那只是普通文章里的一段）。

## 成品长什么样

```md
---
title: '中文标题，不超过 80 字'
description: '两到三句，讲清这篇写了什么、判断是什么'
pubDate: 2026-11-01
author: '原文作者，多人用中文逗号分隔'
category: curation
tags: ['可解释性', 'AI 安全', 'LLM', 'Anthropic团队·Wes Gurnee 等']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 <机构> <文章标题>（链接）的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 <日期>，作者是 <作者>。译文按原意译出，术语做了中文化，原文里的外链都保留着。N 张图用的都是原图，图下加了一行中文小字，说明这张图该看哪里。版权归原作者所有，译文只作学习交流之用。

:::bi
英文第一段。

:::zh
中文第一段。
:::

:::figure
![中文 alt](./images/<slug>/fig-01.png)

原文图注照抄。

:::zh
图 1：这张图该看哪里。
:::
:::

:::bi
- 列表项也用容器包起来。

:::zh
- 列表项。
:::
```

规矩：

- `:::bi` / `:::figure` 用单独一行的 `:::zh` 切成两半，两半都写，缺一半页面会显示原始标记。
- 分节标题写双语，放在容器**外面**：`## 中文标题（English Title）`。三级、四级同理。
- 精选收录**不放** `:::source` 出处卡片，出处写在编者按里。论文解读才放。
- 中英对照靠正文里有行首的 `:::bi` 才开启，删光了语言开关就不显示。

## 流程

工具依赖：抽取要 `lxml`，缩放图要 `Pillow`。本机直接敲 `python` 的那个解释器不一定装了，缺就用装了它们的解释器，或者临时 `pip install lxml pillow`。`paper-reading/scripts/check-chunk.py` 只用标准库，任何 Python 3 都能跑。

### 0. 立项

- slug：英文小写连字符，就是文件名 `site/src/content/posts/<slug>.md`。
- 图片目录 `site/src/content/posts/images/<slug>/`，文件名 `fig-01.png` 起。
- 工作目录 `_scratch/<slug>/`（已 gitignore）：`page.html`、`source.md`、`meta.json`、`zh/`、`shots/`。
- slug 先定死，后面所有路径都用它，中途改名会把图引用改断。

### 1. 抓原文

```powershell
New-Item -ItemType Directory -Force -Path _scratch\<slug> | Out-Null
Invoke-WebRequest -Uri '<url>' -Headers @{'User-Agent'='Mozilla/5.0'} -TimeoutSec 60 -OutFile _scratch\<slug>\page.html
```

同时记下：原始 URL、发布日期、页面署名（没有署名就看配套论文或页脚的作者列表）、版权声明。

抓不到正文的三种情况：正文靠 JS 渲染（要抓渲染后的 DOM，或站点给了 `?raw`、`/index.md`）、有付费墙（把链接交给用户，不要绕）、只剩 PDF（按论文处理，或者用 PDF 里的文字重排）。

### 2. 拆结构

产出两份东西：

- `_scratch/<slug>/source.md`：供人读的纯文本，段与段空一行，标题用 `##` / `###`，图写成独占一行的 `@@FIG n@@`。
- `_scratch/<slug>/meta.json`：块清单（`id`、`kind`、`level`、`fig`、原文图注）+ 图源列表。后面拼装、校验、字数统计都靠它。

做法是 python + lxml 按选择器抽，不熟站点就先打印一遍 `class` 频次和块级标签再定选择器，配方见 `references/extraction.md`。别用「正则去标签」糊过去：会吃掉 `<` 后面的正文、把行内公式和脚注一起扔掉。

范围决策：

- 略：导航、目录、分享按钮、订阅框、页脚、评论区、相关推荐。
- 收：正文每一段、每张图、每个脚注、正文里的外链。
- 拿不准的段落先收进来，翻完再决定删，反过来补更贵。

### 3. 落图

- **原图优先**：`<img>` 的 `src` 直接下载，宽度封到 1800px（Pillow `LANCZOS` + `optimize=True`），体积控制在 1–2 MB 一张。
- **交互图只能截图**：能拖动、点选、逐层展开的浏览器可视化，用 playwright 截图，截图前注入 CSS 把原图自带的图注 `display:none`，否则拼出来是双图注。内容为 0 宽或布局塌了的图，先强制给宽度再拍。
- 存成 `site/src/content/posts/images/<slug>/fig-01.png` 起，编号和正文顺序一致。
- 图片目录已 gitignore：本机构建有图，CI 和别人 clone 会自动跳过（`remark-local-images.mjs` 回退）。所以图别指望自动构建带出去。

### 4. 翻译

- 2k–5k 词的短文：一个人一次翻完。
- 8k 词以上、或图注很多：按节分包，`_scratch/<slug>/chunks/chunkN.md` 出英文包，`zh/chunkN.md` 收译文，两边用 `<<<B12>>>` 块号一一对齐。分包时可以直接借 `paper-reading/scripts/check-chunk.py` 做漏译和标点自检。
- 开译前先定术语表，同一篇里一个术语只有一种译法。
- 注解**不要**交给译者写。注解是编辑判断，自己写，挂在具体段落后面。
- 译文规则见下面的「硬规则」，和 `CLAUDE.md` 一致。

### 5. 拼装

顺序：frontmatter → `> [!NOTE]` 编者按 → 正文。

编者按要交代清楚七件事：这是什么文章、原文链接、发布日期、作者、版权归属（归原作者，译文只作学习交流）、译文范围（哪几节略了、图注和注解是谁加的）、页面顶部能切语言。

用脚本拼，别手抄。拼装脚本放 `_scratch/<slug>/assemble.py`，读 `meta.json` + `zh/` 输出整篇；手抄一次改起来要重来。骨架见 `references/extraction.md` 末尾。

### 6. 验证

1. 起 dev server（`npm run dev`，:4321），打开 `/posts/<slug>/`。
2. **新加的图片目录必须先 `astro dev --force` 重启一次**，否则 `<img>` 会输出成 `__ASTRO_IMAGE_="{…}"` 占位符，图全白。这不是浏览器缓存，改代码没用，只有重开 dev 且带 `--force` 才会重扫图片元数据。
3. 结构核对：`:::bi` 对数、`:::figure` 张数、`:::annotation` 条数、语言开关在不在、有没有漏出来的 `:::` 文本。
4. 截图看版式（亮暗各一遍，至少扫一张图、一段公式、一条注解）。截图脚本按 `CLAUDE.md` 的 `_scratch/shoot2.mjs` 用法，playwright-core 只在本机 npx 缓存里，别往 `package.json` 里加依赖。
5. `npm run check` 必须 0 错误 0 警告。dev server 开着时不要跑 `npm run build`。

## 硬规则

排版和措辞沿用 `CLAUDE.md`，这里只列最容易破的几条：

- 中文正文不用分号「；」、顿号「、」、直角引号「」『』、破折号「——」。需要停顿用逗号、冒号或另起一句，引号一律中文双引号“”。
- 中英文之间加空格（「25 个智能体」），数字和单位之间也跟着中文习惯。
- 原文的角色名、机构名、模型名保留英文（`Sam Moore`、`Claude`、`OpenAI`）；术语首次出现可以在中文后加英文括注，之后只用中文。
- 原文的外链、代码块、加粗斜体原样保留；代码块里不翻译。
- 图注：英文那半照抄原文图注，中文那半以「图 N：」开头，写这张图**该看哪里**，不复述图注本身。
- 注解：一条只说一件事，讲清楚「为什么值得注意」或者「这里容易误读」；中英两种模式下都会显示，所以别写「上一段英文里」这种只在一种语言下成立的话。

## 原文带交互动画时怎么复刻

原文页上的图如果是能点、能播、能指的（榜单、转盘、播放器、浏览器），截图会丢掉最值钱的部分。经验做法：

- 先把原站的脚本抓下来读。`_scratch/<slug>/` 里存一份格式化过的版本，别只看截图猜行为。原站常用 vanilla JS 或 Astro 岛脚本，逻辑通常能整体搬。
- 数据从原站 HTML 的 `data-*`、内联 `<script type="application/json">` 或 `fetch` 的 JSON 里抽出来，落到 `site/public/data/<slug>/`，组件运行时按需取，不进 bundle。数字和顺序逐字保留。
- 媒体（视频、任务缩略图）放 `site/public/media/<slug>/`，`withBase` 拼路径。交互才加载的用 `preload="none"`，别让首屏拖十几 MB。
- 一个交互一个组件，注册到 `components/animation/mount.ts` 和 `remark-animation.mjs`（加类型、文案、空配置白名单）。文章里只写 `:::animation <type>`。
- 原站的类名和尺寸可以照抄，但选择器要加自己的前缀（如 `.ws-demo`、`.bm-demo`）并用组件自己的 CSS 文件：文章正文的 `.prose` 全局样式会覆盖表格、按钮这些元素，必要时用更具体的选择器把 `display`、`padding`、`background` 复位。
- 站内版心 46rem，原站动辄 1376px。给演示加一条 `@media (min-width: 80rem)` 的放宽规则（如 `width: min(58rem, calc(100vw - 27rem))`），桌面端占满版心外的空白，手机上退回 100% 并允许组件内部横向滚动。
- 验收别只看截图：用 Playwright 点 tab、悬停格子、按住加速、拖进度、点阶段，断言 DOM 状态和关键读数（条数、数值、高亮行数、播放进度）。
- **视频验证要用系统 Chrome**（`C:/Program Files/Google/Chrome/Application/chrome.exe`）。`ChromiumForTesting` 不带 H.264，mp4 的 `readyState` 永远是 0，画面全黑，会把你引向错误结论。
- 原站如果用第三方 3D 播放器（viser、Three.js iframe）或视频流，站内做不了就换成同数据驱动的替代交互（时间轴、逐帧高亮），并在注解里诚实说明差异。

## 常见坑

- **图不显示、`<img>` 里是 `__ASTRO_IMAGE_`**：新图目录在 dev 启动之后才加进来。`astro dev --force` 重启，不是清浏览器缓存。
- **行间公式变成行内**：`:::bi` 后面紧跟 `$$…$$` 时，公式会被并进同一段。普通段落贴着标记写没问题（插件会把标记拆成独立段落），但 `$$`、列表、引用、表格这类块级内容，前面留一个空行最稳。
- **图注重复**：截图时没隐藏原图自带的图注。
- **字数和阅读时长不对**：双语文章的字数只算中文那一半（`stripBilingualEnglish`），如果统计翻倍，说明模板写成了两边都算的形态。
- **构建里没图**：图片目录 gitignore，这是预期行为，不是 bug。

## 完成检查

- [ ] frontmatter 全字段合法：`category: curation`、`subcategory` 属于 `curation-tech` / `curation-opinion` / `curation-tools`，`tags` 三到五个且全部在 `config.ts` 的 `TAGS` 里。
- [ ] 出处标签存在（`group: 'source'` 的那类，如「Anthropic团队·Wes Gurnee 等」）；没有就先去 `config.ts` 登记，slug 只增不改。
- [ ] 编者按交代了链接、日期、作者、版权、译文范围和注解归属。
- [ ] 正文段数、图数、注解数对得上原文，没有漏译的段落。
- [ ] 所有图都真实加载（`naturalWidth > 0`），没有占位符。
- [ ] 亮暗主题、手机宽度、语言切换都看过。
- [ ] `npm run check` 0 错误 0 警告。
