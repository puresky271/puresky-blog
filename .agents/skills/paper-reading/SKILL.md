---
name: paper-reading
description: 把一篇外部论文做成 puresky-blog「论文解读」的中英逐段对照精读：原文落成块、图用论文原图配中文小字、附录按引用取舍、逐段翻译、关键处加注解。用户给出论文链接（arXiv、Transformer Circuits、会议论文）要求精读、逐段翻译、对照解读时使用。不用于精选收录的外部长文（用 curation-post），也不用于只写一段摘要的推荐。
---

# 论文精读

论文在站内以 `category: papers` 出现，形态是**中英逐段对照**：每个自然段都有英文原文和中文译文，读者用顶部滑块切换。产物是一个 Markdown 文件和一个图片目录，只靠既有的 `remark-paper` 容器。

核心原则：**英文那一半逐字保留原文（含公式、引用标记、占位符）；中文那一半逐段对译，一段对一段，不合并不拆分；图用论文原图；图注下面那行中文小字写「这张图该看哪里」；注解讲读法，不复述正文。**

## 何时使用

- 用户给出 arXiv / Transformer Circuits / 会议论文链接，要求「精读」「逐段翻译」「做对照」。
- 已有论文解读需要补图、补注解、修译文。
- 要判断一篇论文值不值得写到站里（先读一遍，再决定精读还是只做精选收录）。

不适用：

- 公司博客、工程长文、研究博客的导读文章（用 `curation-post`，形态更轻）。
- 只想在文章里引用论文的结论（那是普通文章里的一段话，不需要对照容器）。

## 成品长什么样

```md
---
title: '中文标题：一个能记住结论的短句'
description: '三到四句，讲清问题、方法、最值得记的发现'
pubDate: 2026-11-01
author: '原文作者，多人用中文逗号分隔'
category: papers
tags: ['多智能体', '记忆系统', '世界模拟', 'LLM', '斯坦福团队·Joon Sung Park 等']
subcategory: 'paper-llm'
---

:::source
- **论文**：Generative Agents: Interactive Simulacra of Human Behavior
- **作者**：Joon Sung Park，Joseph C. O’Brien，Carrie J. Cai，Meredith Ringel Morris，Percy Liang，Michael S. Bernstein
- **机构**：斯坦福大学
- **发表**：UIST 2023，arXiv 2304.03442
- **原文**：[arxiv.org/abs/2304.03442](https://arxiv.org/abs/2304.03442)
- **代码**：[joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents)
:::

> [!NOTE]
> 本文是论文《…》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文九节全译，附录只收了正文引用到的小节，致谢和作者贡献没有收。章节编号和图号都沿用原文，所以跨节引用（§4.1，图 8 这类）和原文对得上，但和本站目录的编号不一定一致。原文用作者年份制引用，正文里（Card et al., 1983）这类标记原样保留，没有附参考文献表。九张图都是论文原图，图注下面那行中文小字是我加的说明。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

## 摘要（Abstract）

:::bi

英文段落。

:::zh

中文段落。
:::

## 引言（Introduction）

### 相关工作（Related Work）
```

规矩：

- 分节标题放在容器**外面**，中文在前英文括注在后，层级跟论文一致（h2 / h3 / h4）。
- 附录标题带字母：`## 附录 A：架构优化（Architecture Optimizations）`。
- **每个段落都要成对出现**。列表、引文、提示词模板也按段落处理。
- `:::source` 卡片放论文、作者、机构、发表处、原文链接、代码仓库；演示站点若已下线要注明。
- 中英对照靠正文里有行首的 `:::bi` 才开启，删光了语言开关就不显示。

## 流程

工具依赖：抽取要 `lxml`，缩放图要 `Pillow`。本机直接敲 `python` 的那个解释器不一定装了，缺就用装了它们的解释器，或者临时 `pip install lxml pillow`。`scripts/check-chunk.py` 只用标准库，任何 Python 3 都能跑。

### 0. 立项与版本

- 先确认**取哪个版本**：arXiv 的 `arxiv.org/html/<id>vN`（官方 LaTeXML）、`ar5iv.labs.arxiv.org/html/<id>`、或论文官方站点的 HTML。三者排版差别不大，但图号和章节号可能不同，**以你要收的那个版本为准**，全程不要换。
- 版本号写进 `_scratch/<slug>/meta.json`，后面核对图号用得上。
- slug 用论文的短名（`generative-agents`、`j-space-global-workspace`），不是 arXiv 号。
- 工作目录 `_scratch/<slug>/`：`paper.html`、`source.md`、`meta.json`、`chunks/`、`zh/`、`figs/`、`shots/`。

### 1. 取原文

```powershell
New-Item -ItemType Directory -Force -Path _scratch\<slug> | Out-Null
Invoke-WebRequest -Uri 'https://arxiv.org/html/<id>vN' -Headers @{'User-Agent'='Mozilla/5.0'} -TimeoutSec 60 -OutFile _scratch\<slug>\paper.html
```

三类来源的优先级：

1. **LaTeXML HTML**（arXiv 官方、ar5iv）：最好用。段落、图、公式（`alttext` 里就是 LaTeX）、脚注、作者年份引用都在 DOM 里，可以直接抽。
2. **官方站点的 HTML**（Transformer Circuits 之类）：结构自定义，先探查再定选择器，公式常是 `<d-math>` 或 MathJax 片段。
3. **PDF**：最后手段。要么用文字层重排（会丢公式和图的对应关系），要么放弃逐段对照，只写导读。

### 2. 抽块

目标：一份 `source.md`（给人读）+ 一份 `meta.json`（给脚本读）。块从 `B0` 连续编号，整篇唯一，后面分包翻译、拼装、查漏译全靠这个编号。

- 块类型：`h`（带 `level`）、`p`、`ul`、`quote`、`fig`（带 `fig` 编号）。
- 图在 `source.md` 里写成独占一行的 `@@FIG n@@`，图注另存在 `meta.json`。
- 抽完先读一遍 `source.md`：段落有没有被拆碎、公式是不是 `$…$`、脚注有没有变成一串数字、引文是不是丢了说话人。

具体选择器和踩过的坑见 `references/extraction.md`。

### 3. 落图

- **原图优先**：`<img src>` 直接下载，宽度封到 1800px，存 `site/src/content/posts/images/<slug>/fig-01.png` 起（三位数 `fig-001.png` 只在超过 99 张时才用，和原文图号保持一致）。
- LaTeXML 的图基本都是 PNG，清晰度够，不需要截图。
- 只有一种情况要截图：图是 SVG / 画布 / 可拖动交互件（Transformer Circuits 的论文大量如此）。截图前注入 CSS 藏掉原图自带的图注，否则双图注。
- 图注里要写清「原文这张图可以拖动，这里只截了默认状态」，别让读者以为论文就长这样。
- 图片目录已 gitignore，本机构建有图，CI 和别人 clone 会跳过（`remark-local-images.mjs` 回退）。

### 4. 分包翻译

论文动辄两三万词，必须分包并发，一个人从头译到尾会超时也会走形。

- 边界按**一级或二级标题**切，不要切在段落中间；每包 1.5k–4k 英文词（约 10k–28k 字符）比较合适，正好一个译者一次能做完。
- 每包两个文件：`chunks/chunkN.md`（英文，`<<<B12>>>` 分隔）和 `zh/chunkN.md`（中文，同块号同顺序）。
- 分包时**只给块号，不要给标题井号和引文 `>` 前缀**——层级和容器由拼装脚本按 `meta.json` 重建。反过来也要交代清楚：译文里别自己补 `##` 和 `>`，否则拼装时前缀会重复。
- 每包翻完立刻跑自检，见下。
- 图注和注解**不要**交给译者：图注是编辑说明，注解是读法判断，自己写。

自检脚本（`scripts/check-chunk.py`，纯标准库）：

```powershell
python .agents/skills/paper-reading/scripts/check-chunk.py --dir _scratch/<slug> --name chunk3
python .agents/skills/paper-reading/scripts/check-chunk.py --dir _scratch/<slug> --all
```

它会查：块号缺漏/多余/顺序、空块、标题层级、`@@FIG` 占位、`$` 数量、`\<占位符\>`、列表项数、
引文行数、中文违禁标点、整块没译。**必须全部「通过」再进入下一步**。

### 5. 拼装

拼装脚本 `_scratch/<slug>/assemble.py` 读 `meta.json` + `zh/` + 图注 + 注解，输出整篇。

- 标题：`## 中文（English）`，附录加字母前缀。
- 正文：`:::bi` + 英文块 + `:::zh` + 中文块。
- 图：`:::figure` + 图片 + 英文图注 + `:::zh` + 中文小字。
- 注解：`:::annotation`，挂在被解释的那一段后面，不要集中堆到末尾。
- 行间公式：中文和英文两半都写同一份 LaTeX，`$$…$$` 前后各留一个空行。
- 拼完统计一遍容器数，和 `meta.json` 对，骨架和细节见 `references/assembly.md`。

### 6. 验证

1. dev server（`npm run dev`，:4321）打开 `/posts/<slug>/`。
2. **新加了图片目录就必须 `astro dev --force` 重启**，否则图输出成 `__ASTRO_IMAGE_="{…}"` 占位符，整页白图。改代码没用，只有重开 dev 且带 `--force`。
3. 结构核对：`:::bi` 对数、`:::figure` 张数、`:::annotation` 条数、`h2/h3` 数、公式数、语言开关、有没有漏出的 `:::`。
4. 四种组合各扫一眼：中文/英文 × 亮/暗。重点看图注、行内公式、引文块、附录列表。
5. 抽查五到十段译文，对照英文原文看有没有漏句、错译、术语不一致。
6. `npm run check` 必须 0 错误 0 警告；worker 有改动再跑 `npm run typecheck`。
7. dev server 开着时**不要**跑 `npm run build` / `npm run deploy`。

## 范围决策

论文不可能无限细。进来先定三件事，写进 `meta.json` 或笔记里，翻完不要临时改。

**正文**：全译。九节也好，十五节也好，一节不落。跳过某一节会让跨节引用断掉。

**附录**：按「正文引用到了才收」这条规则。

- 先把正文里的 `Appendix X`、`§A.3`、`Table 7` 这类引用列成清单，附录里对应的小节全收。
- 致谢、作者贡献、代码与复现信息、引用信息（Citation）一般不收。
- 附录 A/B 往往是可复现细节（提示词模板、访谈问题、参数设置），价值比正文还高，**优先收**。
- 不收的部分在编者按里写一句，读者知道去哪找。

**引用**：两种做法，选一种并在编者按里说明。

- 作者年份制（`(Card et al., 1983)`）：原样保留英文，不附参考文献表。信息量还在，读者能按名检索。
- 数字编号制（`[12]`）：全部从略，正文读起来更干净，但要在编者按里说「N 处文献引用从略，没有附参考文献表」。

**图**：全部收，一张不落。图注英文照抄，中文小字另外写。

## 硬规则

排版和措辞沿用 `CLAUDE.md`，这里只列最容易破的几条：

- 中文正文不用分号「；」、顿号「、」、直角引号「」『』、破折号「——」。原文的破折号拆成冒号、逗号或另起一句，引号一律中文双引号“”。
- 中英文之间加空格；术语全篇一致；人名、机构名、模型名、数据集名、代码标识符保留英文。
- 英文那一半是原文，**一个字都不要动**：不顺手改时态、不统一拼写、不删长句。
- 公式用 LaTeX，行内 `$…$`，行间 `$$…$$`；`$\alpha$` 这类希腊字母、上下标、矩阵都按原样。
- 占位符保留原样：`\<name\>`、`[Agent’s Summary Description]`、`[fill in]`。
- 引用的作者年份原样保留英文（含英文分号，那不是中文标点违规）。
- 图注：英文照抄，中文以「图 N：」开头，写「该看哪里 / 这张图证明了什么」，不复述图注。
- 注解：一条只说一件事，讲读法或容易被误读的地方；中英两种模式都显示，别写「上面那段英文里」。

## 常见坑

- **图全白、`<img>` 是 `__ASTRO_IMAGE_`**：新图目录在 dev 启动后才出现。`astro dev --force`，不是浏览器缓存问题。
- **标题变成双前缀**（`## ## 引言`）：分包时标题带了井号，拼装又按 `meta.json` 补了一次。拼装脚本里统一剥掉译文里的井号。
- **行间公式变行内**：`:::bi` 后直接跟 `$$` 会并进上一段，公式前后各留一个空行。普通段落贴着标记写没问题，插件会把标记拆成独立段落。
- **脚注变成「22 正文」**：脚注的 `sup` 编号和标签没去掉，抽的时候要把 `ltx_note_mark`、`ltx_tag_note` 一起删。
- **一张图注出现两次**：截图时没隐藏原图自带的图注。
- **引文块排成一排各自错开的框**：每段写成了独立引用块。整块用一个引用框，段间用一行裸 `>` 接。
- **阅读时长翻倍**：双语文章字数只算中文那一半（`stripBilingualEnglish`），翻倍说明容器写法不对（比如标题或图注漏在外面、或者用了不被识别的标记）。
- **构建里没图**：图片目录 gitignore，这是预期行为。

## 参考

- 抽取选择器与踩坑：`references/extraction.md`
- 拼装骨架与标题规则：`references/assembly.md`
- 术语对照表：`references/glossary.md`
- 分包自检：`scripts/check-chunk.py`

## 完成检查

- [ ] frontmatter 全字段合法：`category: papers`、`subcategory` 属于 `paper-llm` / `paper-rl` / `paper-systems` / `paper-theory`，`tags` 三到五个且都在 `config.ts` 的 `TAGS` 里。
- [ ] 出处标签存在（`group: 'source'`，如「斯坦福团队·Joon Sung Park 等」）；没有先去 `config.ts` 登记，slug 只增不改。
- [ ] `:::source` 卡片的论文名、作者、发表处、原文链接、代码仓库都对。
- [ ] 编者按交代了：译文范围（哪些没译）、引用处理方式、图注归属、注解归属。
- [ ] 正文段落数与原文一致，附图、附录、公式、脚注都在。
- [ ] 所有图真实加载（`naturalWidth > 0`），没有占位符，图注中文小字都在。
- [ ] 语言开关可用，中英两半段落数一致。
- [ ] 抽查译文，没有漏句、错译、术语漂移、英文残句。
- [ ] `npm run check` 0 错误 0 警告。
