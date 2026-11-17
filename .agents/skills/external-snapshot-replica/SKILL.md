---
name: external-snapshot-replica
description: 把外部文档站（设计系统、组件库、产品文档）里的示例卡片、Show code 和交互演示 1:1 复刻进 puresky-blog 的精选收录：抓页面、抽设计令牌和工具类、生成快照数据、复用共享画廊、手写可交互版本，以及做脱敏和版权检查。用户要求复刻外部组件示例、把设计系统文档搬进文章、批量搬运外部演示时使用。不用于普通长文收录（用 curation-post），也不用于论文精读（用 paper-reading）。
---

# 外部示例快照复刻

把外部文档站（设计系统、组件库、产品文档）里的**示例卡片、Show code、交互演示**搬进文章，做成一比一的静态快照加手写可交互版本。适用对象是带 demo 的文档页，不是长文翻译（那用 `curation-post`），也不是论文（用 `paper-reading`）。

核心分工：

- **HTML + CSS 快照**负责「默认状态和全部变体长什么样」，颜色、圆角、阴影、字距和原站一致，读者翻文章就能看到组件库的全貌。
- **手写 Svelte 版本**负责「操起来什么感觉」，按钮、标签页、弹层、滑块这些能真的点、选、拖。
- **中英逐段对照**负责文档正文，和 `curation-post` 一样用 `:::bi` / `:::zh`。

第一条经验：**先把原站的样式拆成令牌和工具类，再决定哪些快照直接抄、哪些行为必须重写**。没有这一步，手写组件会花在反复对齐颜色和间距上。

## 何时使用

- 外部页面的正文里有「Show code」示例卡、可交互的组件演示、设计令牌表。
- 外部页面是设计系统或组件库文档，几十个组件要在一篇文章里完整呈现。
- 用户说「1:1 复刻」这页的代码和案例。

不适用：

- 普通技术长文、博客文章（`curation-post`）。
- 论文、带公式和实验章节的 PDF（`paper-reading`）。
- 只需要几张截图说明的问题：直接截图更省事。

## 成品长什么样

一篇文章 + 一个数据目录 + 一套演示组件：

```
site/src/content/posts/<slug>.md                      # 正文（双语 + 代码 + 交互嵌入）
site/public/data/<name>/<group>.json                   # 示例快照，按组懒加载
site/public/media/<name>/...                           # 脱敏后的占位图
site/public/fonts/<name>/... + OFL.txt                 # 字体（如果原站用了特别的开源字体）
site/src/components/animation/<Name>Gallery.svelte     # 画廊岛屿
site/src/components/animation/<name>/                  # 令牌、工具类、锋格样式、交互版本
site/src/lib/snapshot.ts                               # 通用快照工具（已有，直接用）
site/src/components/animation/snapshot/base.css        # 通用正文排版隔离层（已有，直接用）
```

先看 Geist 那篇的完整实现，照着改比从零写快：

- 文章：`site/src/content/posts/geist-design-system.md`
- 数据：`site/public/data/geist/`
- 画廊：`site/src/components/animation/GeistGallery.svelte`
- 令牌与工具类：`site/src/components/animation/geist/tokens.css`、`utilities.css`、`base.css`
- 基础演示：`site/src/components/animation/geist/foundations/`
- 可交互版本：`site/src/components/animation/geist/interactive/`
- 生成脚本：`_scratch/geist/`（一次性脚本，可以作为写法参考）

## 流程

### 0. 立项与目录

- slug、数据目录名（如 `geist`）、分组（按原站侧栏或自己的编辑口径，比如操作 / 输入 / 选择 / 展示 / 反馈 / 浮层 / 容器）。
- 工作目录 `_scratch/<slug>/`：`pages/`（抓下来的 HTML）、`extracted/`（结构 JSON）、`source/` 和 `zh/`（翻译流水线）、`shots/`（对照截图）。
- 先确认版权底细，见下面的「版权与许可」。

### 1. 抓页面

```powershell
$h=@{'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}
$urls = Get-Content _scratch\<slug>\urls.txt
foreach ($u in $urls) {
  $name = ($u -split '/')[-1]
  Invoke-WebRequest -Uri $u -Headers $h -TimeoutSec 90 -OutFile "_scratch\<slug>\pages\$name.html"
}
```

- 页面列表从 `sitemap.xml` 里筛该路径前缀的 URL，别手工列。
- 抓下来先看一页：正文是不是服务端渲染（`view-source` 里有没有内容）、示例卡片的「Show code」按钮在不在、代码是不是在 RSC payload（搜索 `__rawString__`）或 `<pre>` 里。
- 拿不到渲染后的 DOM 就上 Playwright 抓 `content()`，但那样拿到的 HTML 没有 hydration 前状态，示例可能是空壳，不如用服务端 HTML。
- 顺便把页面的 `<link rel="stylesheet">` 和字体文件都下载下来，后面要用。

### 2. 拆结构

用 `scripts/extract_demos.py` 作为起点（改文件头的 CONFIG）：

```bash
python .agents/skills/external-snapshot-replica/scripts/extract_demos.py --config _scratch/<slug>/config.json
```

产出 `extracted/<page>.json`：

```json
{
  "slug": "button",
  "title": "Button",
  "description": "...",
  "blocks": [
    { "kind": "h2", "text": "Sizes" },
    { "kind": "p", "text": "The default size is medium." },
    { "kind": "demo", "demo_html": "<div ...>", "code": "import { Button } ..." }
  ]
}
```

依次检查：

- `demo_count` 和 `code_count` 是否相等。对不上说明卡片检测或代码正则要调；代码顺序和卡片顺序是一一对应的。
- 示例卡片检测不能只看 class。稳妥做法：按「Show code」按钮文案找到 footer，再往上找卡片外壳（常见特征是 `bg-background-*`、`border-*` 这类 Tailwind 类），最后从卡片第一个子块取演示区。
- 代码如果是 RSC payload 里的模板字面量，注意**示例代码里的反引号和 `${}` 会被双重转义**（文件里是两个反斜杠 + 反引号）。先用占位符替换再跑正则，否则代码会在第一个模板字面量处截断。
- 正文块范围：标题 / 段落 / 列表 / 表格 / 代码块 / 图片 / 示例卡片。导航、侧栏、页脚、「Was this helpful」「Give feedback」这些是噪音，后面拼装时统一过滤。

### 3. 抽设计令牌

用 `scripts/extract_tokens.py`：

```bash
python .agents/skills/external-snapshot-replica/scripts/extract_tokens.py \
  --css _scratch/<slug>/main.css \
  --light ':root' --dark '.dark' \
  --prefix 'ds-,geist-,shadow-' \
  --scope '.geist-demo' \
  --out site/src/components/animation/<name>/tokens.css
```

- 令牌块的共同特征：亮色定义在 `:root` 或 `.light-theme` 上，暗色在 `.dark` 或 `[data-theme='dark']` 上，值大多写成 `hsl(var(--x-value), 1)` 或 `lab()/oklch()`。
- **保留原始层叠顺序**：同一变量可能在「fallback 块」和「现代值块」里各定义一次，顺序错了会把 hex 覆盖成 lab 回退值。
- 一条规则里**最后一条声明常常没有分号**，解析时要求 `[^;{}]+` 而不是 `[^;]+;`，否则每条规则都会丢最后一个变量（Geist 的 `--ds-background-200` 就是这样丢的）。
- 输出统一挂到组件的根类（如 `.geist-demo`），暗色用站点的 `[data-theme='dark']` 前缀重写，不要污染站点语义令牌。
- 字体族变量放在令牌文件里，`@font-face` 的 `src` 用站内路径。

### 4. 抽工具类和 CSS Modules

用 `scripts/scope_css.py`：

```bash
python .agents/skills/external-snapshot-replica/scripts/scope_css.py \
  --css _scratch/<slug>/a.css _scratch/<slug>/b.css \
  --modules _scratch/<slug>/modules.css \
  --demos _scratch/<slug>/extracted \
  --scope '.geist-demo.geist-demo' \
  --out site/src/components/animation/<name>/utilities.css
```

要点：

- 先收集示例 HTML 实际用到的 class，再按 class 过滤 CSS，不然整份 Tailwind 工具类几百 KB 全进来。
- Tailwind v4 的工具类在 `@layer utilities`，组件自己的类可能在图层外，CSS Modules 的哈希类在另一个文件里。三处都要收，按选择器是否命中用到的类过滤。
- 选择器加作用域前缀，**特异度要比重置高**：`.<root>.<root> .类名` 是 (0,3,0)，能压过 (0,2,0) 的重置；重置再压过 `.prose` 的 (0,1,1)。
- `@keyframes`、`@property` 原样保留。`pre` 背景这类文章里用 `!important` 写死的属性，作用域规则也要带 `!important`，并且选择器特异度更高。
- 类名匹配要处理 CSS 转义：`shadow-[var(--x)]` 在 CSS 里是 `.shadow-\[var\(--x\)\]`，把特殊字符全部 `\` 转义后再比对；逗号在 `var()` 里是 `\,` 或者 `\2c `，两种都见过。
- CSS Modules 的哈希类整份收，选择器同样加作用域前缀。

### 5. 生成分组 JSON

用 `scripts/build_group_json.py`：

```bash
python .agents/skills/external-snapshot-replica/scripts/build_group_json.py \
  --config _scratch/<slug>/groups.json \
  --extracted _scratch/<slug>/extracted \
  --out site/public/data/<name>
```

规则：

- 一个分组一个 JSON（`actions.json`、`inputs.json` ...），画廊按组懒加载，不要把几 MB 塞进一个文件。
- 每段示例 HTML 做三件事：把 `p` / `ul` / `li` / 标题换成 `div`（避免被文章正文的 `.prose` 排版命中）、给链接打 `data-<name>-link`、去抓取时加的临时属性。
- 外部图片全部换成本地路径：真人头像、第三方品牌 logo 用生成的占位 SVG（**脱敏**，也避免把别人的商标搬进站内）；视频改成静态窗口或者直接不放，别把几十 MB 的 mp4 放进仓库。
- 小标题和译文的对应：用 `source/<slug>.md` 里的块编号，和 `zh/<slug>.md` 对上，示例卡片取它前面最近的小标题。
- 示例里的代码留在 JSON 里（文章正文要用），画廊不渲染。

### 6. 画廊组件

不要另写一套渲染器。直接复用：

- `@/lib/snapshot`：`loadSnapshotJson` / `fetchSnapshotJson`、`normalizeSnapshotHtml`、`filterRenderableSections`（Suspense 空壳过滤，含离屏实测）、`fixSnapshotMedia`、`setupSnapshotInteractions`（模拟 React Aria 的 `data-hover` / `data-pressed` / `data-focus`）、`whenInViewport`（懒加载）、`mountInteractiveComponents`（挂可交互版本）。
- `site/src/components/animation/snapshot/base.css`：正文排版外溢的拦截规则（标题竖条、`pre` 强制底色、图片圆角边框、段落两端对齐、离屏测量容器）。
- `site/src/components/animation/GeistGallery.svelte`：直接把这份复制成 `<Name>Gallery.svelte`，改数据路径、`afterMount` 的媒体前缀、文案和组件注册表即可。

组件根节点记得带 `snapshot-root` 类，正文排版隔离才生效。画廊必须：

1. 进视口后再 fetch（`whenInViewport`），一页多个画廊不能一起发请求；
2. 卡片头写英文名 + 中文名 + 示例数；
3. 空示例过滤（`filterRenderableSections`），整张卡都空时给一句「这个示例依赖客户端运行时，静态快照里是空的」；
4. 可交互版本按 slug 注册表挂载，注册表为空时安静跳过。

### 7. 手写可交互版本

只挑「操作感强」的组件，一般 12 到 20 个够了，剩下的静态快照可以表达清楚。

- 目录 `site/src/components/animation/<name>/interactive/`，一个组件一个 Svelte 文件 + 一个公共 CSS，类名统一前缀（Geist 用 `gi-`）。
- `registry.ts` 只登记 slug → dynamic import，画廊按 slug 自动挂载。
- 颜色、圆角、阴影、字体全部用步骤 3 的令牌，暗色自动跟随，不要自己编色值。
- 无障碍按原站文档里写的角色来：`role="menu"` / `role="listbox"` / `role="dialog"` / `role="switch"` / `role="slider"`，焦点环用原站的 focus ring 令牌。
- 浮层（菜单、弹层、提示气泡）要处理被卡片 `overflow: hidden` 裁剪的问题：fixed 定位 + 靠近视口底部时上下翻转，滚动时跟随触发元素。
- 手写版本的目的不是复刻一份组件库源码，是复刻原站示例里的行为和观感；接口、props 不用对齐，示例里用到的状态做出来就行。

### 8. 文章拼装

正文和 `curation-post` 一样：frontmatter、编者按、中英逐段对照、原站代码块、注解。额外注意：

- 章节标题写成双语，比如 `## 色彩系统（Colors）`，不要手写「一、二、」编号，站内目录会自动编号。
- 每个组件一节（`#### Button（按钮）`），描述、原站示例里的说明、三段最佳实践按原文结构给。
- 原站示例代码放 `tsx` 代码块，注明「原站示例代码（React）」，代码不翻译。
- 个别示例是客户端渲染、空壳、或者视频没搬，就在组件条目后加一条 `:::annotation` 说明，别让读者以为演示坏了。
- 文章里正文出现 `<Input>` 这种组件名，Markdown 会当 HTML 标签吃掉，拼装脚本里统一包成行内代码；`$` 也会被 remark-math 当公式定界符，统一转义。
- 末尾写「复刻说明」和「版权与许可」，交代抓取方式、脱敏方式、字体许可证、原文版权归属。

### 9. 注册与验证

- `mount.ts` 注册动画类型；`remark-animation.mjs` 登记类型名、空配置白名单和 `group` 一类的配置校验。
- 本地 dev server 打开文章页，用 Playwright 跑 `scripts/audit_replica.mjs` 检查：卡片数、可交互挂载数、图片是否全部加载、悬停属性、页面无横向溢出、控制台无报错。卡片和交互组件的选择器用 `--card` / `--interactive` 传，默认值按 Geist 那套写。

```bash
node .agents/skills/external-snapshot-replica/scripts/audit_replica.mjs \
  --url=http://localhost:4321/posts/<slug>/ \
  --animation=geist-gallery \
  --card=.geist-card --interactive='.gi-demo' \
  --groups=_scratch/<slug>/groups.json
```
- 亮暗主题、390px 手机宽度、语言开关、目录都过一遍。
- `npm run check` 必须 0 错误 0 警告；build 前先停 dev server。
- 构建产物里确认数据 JSON、字体、占位图都上传了（`dist/data/<name>/`、`dist/fonts/<name>/`、`dist/media/<name>/`）。

## 版权与许可

复刻外部站点前先做一轮底细调查，结论写进文章的「版权与许可」：

1. **字体**：查仓库 LICENSE（GitHub API 的 `license` 字段最省事）、npm 包的 `license`、原站的字体下载页。OFL 字体可以自托管再分发，保留版权声明和许可文本，别单独售卖、别用保留字体名发布修改版。
2. **文档正文与示例**：看页面本身有没有 licence 声明、站点服务条款里知识产权归属怎么写。多数设计系统文档是「版权保留」，公开可读不等于可转载；个人学习用途的翻译和引用要保留署名、链接和版权声明，并写明如版权方有异议会删除。
3. **组件包**：示例代码 import 的包先在 npm 上查。查不到就是没公开，只能当文档示例看，文章里要说明「不能直接安装」。
4. **品牌与商标**：logo 和商标按原站品牌规范使用。复刻文章里一般不要转载 logo，示例里的第三方 logo 换占位图。
5. **个人数据**：示例里的真人头像、用户名、真实公司数据，一律换成占位内容。

## 硬规则（和站点 CLAUDE.md 对齐）

- 中文正文不用分号、顿号、破折号、直角引号；中英文之间加空格。
- 演示里的第三方资产先脱敏再入库；视频不进仓库；大文件放 R2。
- 示例快照 HTML/CSS 里的颜色和尺寸不要手改，改了就和原站截图对不上；要改就在外层包作用域规则。
- 演示样式必须挂在作用域类下面，不能漏到正文里；新增规则保持「重置 (0,2,0) < 工具类 (0,3,0)」的特异度约定。
- 截图和对照图放 `_scratch/`，不入库。

## 验收清单

- [ ] 每个分组 JSON 的组件数、示例数、代码数和原站页面一一对应。
- [ ] 所有示例卡片都能渲染，空壳有说明，图片全部加载（`naturalWidth > 0`）。
- [ ] 可交互版本全部挂载成功，键盘能操作，浮层不被裁切。
- [ ] 悬停、按下、聚焦状态和原站一致（`data-hover` / `data-pressed` / `data-focus`）。
- [ ] 亮暗主题、手机宽度、语言开关都正常。
- [ ] 文章 `:::bi` / `:::zh` 数量相等，没有漏译，没有漏出来的容器标记。
- [ ] 版权说明、字体许可、脱敏说明写清楚了。
- [ ] `npm run check` 0 错误 0 警告，构建通过，产物数据齐全。
