---
name: article-animations
description: 在 puresky-blog 的 Markdown 文章中嵌入交互动画，或为数据结构、算法、关键操作新增可复用动画类型。用户提到文章动画、算法演示、交互演示、可视化播放、单步执行时使用。
---

# 文章交互动画

文章保持 `.md`。通过受限的 `:::animation` 容器嵌入已注册组件，不改用 MDX，不在文章里写脚本，也不为单个演示绕过共享挂载层。

## 嵌入已有动画

在正文中先解释要观察的问题，再在对应推导或操作附近插入容器。不要把动画集中堆到文章末尾。

```md
:::animation kmp
text: aabaabaafa
pattern: aabaaf
:::
```

```md
:::animation tree-traversal
order: inorder
method: iterative
:::
```

`kmp` 配置：

- `text`：必填的非空文本串，最多 60 个 Unicode 字符。
- `pattern`：必填的非空模式串，最多 24 个 Unicode 字符。

`tree-traversal` 配置：

- `order`：`preorder`、`inorder` 或 `postorder`。
- `method`：`recursive` 或 `iterative`；分别演示系统调用栈和显式栈，示例树固定为文章里的 7 结点二叉树。

`tree-levelorder` 不需要配置，类型行和结束标记之间留一个空行：

```md
:::animation tree-levelorder

:::
```

`tree-reconstruction` 配置：

- `order`：`preorder` 或 `postorder`，分别演示先序 + 中序、后序 + 中序重建文章里的 7 结点二叉树。

```md
:::animation tree-reconstruction
order: preorder
:::
```

`expression-tree` 不需要配置，演示用两个栈把 `(3 + 4) * (2 - 1)` 构建成表达式二叉树：

```md
:::animation expression-tree

:::
```

`rpn-eval` 可选配置 `tokens`（空格分隔的整数与 `+`、`-`、`*`、`/`，最多 24 个元素，默认 `3 4 2 * +`），演示逆波兰表达式求值：从左向右读，数字压入栈，运算符弹出右操作数再弹左操作数，算完压回。输入可编辑，应用新输入会重建快照。配置别加引号，`remark-smartypants` 会把直引号改成弯引号（插件里已经做了容错，但写成裸值最稳）：

```md
:::animation rpn-eval
tokens: 3 4 2 * +
:::
```

`lowerbit` 配置 `value` 为 1 到 255 的整数，用 8 位二进制演示 `x & -x` 取出最低位的 1，以及 `x - lowbit(x)` 清除这一位：

```md
:::animation lowerbit
value: 12
:::
```

`fenwick-query` 配置 `index` 为 1 到 14 的整数，演示文章示例数组的前缀和查询。`fenwick-update` 还需要 `delta` 为 -9 到 9 的非零整数，演示所有覆盖该下标的区间同步更新：

```md
:::animation fenwick-query
index: 13
:::
```

```md
:::animation fenwick-update
index: 3
delta: 2
:::
```

`circular-queue` 配置 `method` 为 `flag`、`count` 或 `sacrifice`，用五个格子的环依次演示三种判空判满办法：另设标志位、统计元素个数、牺牲一个存储单元。入队时对应格子点亮，出队时熄灭：

```md
:::animation circular-queue
method: sacrifice
:::
```

`sorting-trace` 配置 `algo` 为 `selection`、`insertion`、`bubble`、`shell`、`heap`、`merge` 或 `quick`，用同一组默认数据 `[5, 2, 8, 1, 9, 3, 7, 4]` 演示七种比较排序的推进过程，七种算法共用同一组数据，方便读者横向比较。画面里有柱子、数值、下标、指针标签、有序区着色、比较与移动次数计数器，每一步都有一句中文说明。选择排序和插入排序看有序区怎么从左往右长，冒泡排序看相邻交换怎么把最大值一轮一轮沉到末尾以及没有交换时的提前退出，希尔排序按减半的增量分组做插入排序并在侧栏显示当前增量，堆排序用色条标出有效堆区间，归并排序多一行辅助数组输出行，快速排序用挖坑法标出基准值和左右指针：

```md
:::animation sorting-trace
algo: selection
:::
```

`avl-rotate` 配置 `kind` 为 `right`、`left`、`lr` 或 `rl`，演示 AVL 树在失衡结点上的旋转：右旋处理 LL 型、左旋处理 RR 型（B 上位、A 下沉、夹在中间的 β 换边）；`lr` / `rl` 演示 LR / RL 型折角失衡的双旋，先对 B 转一次把折角扳直，再对 A 转一次让折角点 C 上位：

```md
:::animation avl-rotate
kind: right
:::

:::animation avl-rotate
kind: lr
:::
```

`thread-build` 配置 `order` 为 `inorder`、`preorder` 或 `postorder`，逐步演示线索化：`pre` 前驱指针在结点之间跳动，跳的顺序就是遍历序列，每访问一个结点，空着的左指针和 `pre` 空着的右指针上各长出一条虚线线索。中序和先序带上了头结点，后序不带头结点，所以后序演示里没有那个结点，画布也裁掉顶部一段：

```md
:::animation thread-build
order: inorder
:::
```

`thread-traverse` 配置 `order` 为 `inorder`、`preorder` 或 `postorder`，演示三种线索树的遍历：`p` 指针在结点之间跳，每一步把走过的孩子边或线索用实心高亮画一遍，右侧显示访问序列。中序和先序顺着后继走，后序从根开始顺着前驱倒着收集，最后一步把收集顺序反过来给出后序序列：

```md
:::animation thread-traverse
order: inorder
:::
```

`graph-dfs` 不需要配置，演示文章里那棵一般树的深度优先遍历：A 是根，B、C、D 是第二层，B 下面有 E、F、G，D 下面有 I、K。树图沿用二叉树那套 `TreeDiagram`，主色实线标出当前路径，虚线标出走过又退回的边，右侧是调用栈和访问序列，用来解释“一条路走到黑”和回溯：

```md
:::animation graph-dfs

:::
```

`graph-bfs` 不需要配置，在同一棵一般树上演示广度优先遍历。主色实线标出已经发现的树边，虚线圆圈表示仍在队列里的结点，右侧展示队列和访问序列，用来解释“先近后远，层层推进”和先进先出：

```md
:::animation graph-bfs

:::
```

`relation-anatomy` 不需要配置，用 CMU 15-445 Lecture #01 的 `Artist(id, name, year, country)` 表（101 Wu-Tang Clan 1992 USA / 102 Notorious BIG 1992 USA / 103 GZA 1990 USA）解剖关系模型：七步依次高亮整张 relation、一行 tuple、`year` 这一列 attribute、这一列允许取值的 domain 集合、表头与类型组成的 schema、全部数据行的 instance，最后高亮 `id` 列这个 primary key。表格下方有一条观察窗，随步骤显示当前概念对应的具体数据，主键列始终带钥匙图标、PK 标记和下划线：

```md
:::animation relation-anatomy

:::
```

`panorama-lyrics` 用于《端程山》随笔的日文原文、B站版翻译与网易云版翻译对照及音频/MV 分镜联动。不带参数时展示全曲 45 行工作台；可选配置 `lines`（如 `"16-19"`）、`stanza`（`verse-1` 至 `outro`）或 `title` 以展示局部精读卡：

```md
:::animation panorama-lyrics
lines: "16-19"
title: "主歌 B · 磨薄的鞋底与抬起头的视线"
:::
```

`cassiopeia-stars` 用于《仙后座五曜》随笔的定制星空观测台，包含三维光年纵深倾角变换、北天极周日视运动罗盘与恒星天体物理剖面三个视图。不带参数时展示完整三视图切换工作台；可选配置 `view`（`depth`、`polar` 或 `physics`）以锁定展示单一视图：

```md
:::animation cassiopeia-stars

:::
```

`tempura` 用于《天妇罗：水与油的四百年》的 lieflat 风四卡数据图版，不需要配置。整块图版按 lieflat-charts 的 porcelain 青瓷蓝绘制四张图：下锅油温区间（F12 哑铃图）、衣的含水率与吸油率随时间变化（F2 发丝折线）、八种食材的十二月旬期弧线矩阵（L4 Arc Matrix）和六种炸物的脂质对照（F1 Rung Bars）。卡片滚入视野才播，卡片右下角可重播，亮暗主题各自一套蓝阶，数据在 `site/src/lib/animations/tempura.ts`：

```md
:::animation tempura

:::
```

`geist-gallery` 是《Geist 设计系统》收录里渲染原站组件示例快照的画廊，必须配置 `group`（`actions`、`inputs`、`choices`、`data`、`feedback`、`overlays`、`containers`）：

```md
:::animation geist-gallery
group: actions
:::
```

`geist-palette`、`geist-type`、`geist-materials`、`geist-terminal`、`geist-grid` 是同一篇文章里的五个基础演示，都不需要配置：

```md
:::animation geist-palette

:::
```

它们的样式分层在 `components/animation/geist/`：`tokens.css` 是从原站抽出的设计令牌（`--ds-*`），`base.css` 是卡片外壳和元素重置，`utilities.css` 是按需筛出的原站 Tailwind 工具类和 CSS Modules 类。新增 Geist 演示时先把样式挂进 `.geist-demo` 作用域，再用 `geist-` 前缀的类名，别去改 `prose.css`。示例快照数据在 `public/data/geist/`（按分组懒加载），手写的可交互版本在 `components/animation/geist/interactive/`，用 `registry.ts` 按 slug 登记，画廊检测到就多挂一张可交互卡片。

这一套里有两层是通用的，别的「外部示例复刻」也能直接用：

- `@/lib/snapshot`：按组懒加载 JSON、自闭合标签展开、空示例离屏实测、媒体路径补 base、模拟 React Aria 的 `data-hover` / `data-pressed` / `data-focus`、`mountInteractiveComponents`。新写一个 `<Name>Gallery.svelte` 时照抄 `GeistGallery.svelte` 改数据路径和注册表即可。
- `components/animation/snapshot/base.css`：挡住文章正文排版外溢的规则（标题竖条、`pre` 强制底色、图片圆角边框、段落两端对齐、离屏测量容器），挂在演示根节点的 `snapshot-root` 类下面。新演示根节点记得同时带 `snapshot-root`。

从零复刻一套外部站点的示例，完整流程（抓页面、抽令牌和工具类、生成分组 JSON、脱敏、验收）见项目 skill `.agents/skills/external-snapshot-replica/SKILL.md`。

需要配置时，容器正文必须是单个 YAML 对象，不能混放 Markdown。未闭合容器、未知类型和非法配置不会被当作可执行内容。页面没有 JavaScript 时只显示静态提示。

配置值尽量写成裸标量，别用引号。`remark-smartypants` 会在 `remark-animation` 之前把直引号换成弯引号（`"3 4 2 * +"` 会变成 `“3 4 2 * +”`），带引号的值到了插件里已经不是原来的字符串。确实需要引号时，在校验器里先做容错。

## 新增动画类型

先确认演示能帮助理解一个具体操作，避免只加无信息量的装饰动效。沿用现有分层：

1. 在 `site/src/lib/animations/` 新建纯 TypeScript 算法模块。预生成不可变步骤快照，快照包含绘制当前画面所需全部状态和中文解释；不要让播放定时器直接修改算法内部状态。
2. 在 `site/src/components/animation/` 新建 Svelte 5 组件，接收 `AnimationProps.config`。提供播放暂停、前后单步、重置和进度控制；输入可编辑时，应用新输入必须停止旧播放并重建快照。
3. 在 `site/src/components/animation/mount.ts` 的注册表加动态 `import()`，键名使用小写 kebab-case。
4. 在 `site/src/lib/markdown/remark-animation.mjs` 的类型白名单登记同一键名，并完善该类型的配置校验。限制输入长度和步骤数量。
5. 在合适的现有文章中添加真实示例，默认数据应能展示核心行为，而不只是最理想路径。
6. 更新本 skill 的类型清单与 `CLAUDE.md` 的对应说明。

共享挂载和 Markdown 管线已经同时覆盖正式文章与本地编辑器，不要另写一套预览渲染器。

## 可复用资产

新动画优先组合 `site/src/components/animation/` 中这些资产，不复制控制区或原生控件样式：

- `playback.svelte.ts`：`createPlayback(() => steps.length)` 管理播放、单步、重播、调速、进度和计时器清理。
- `AnimationShell.svelte`：统一标题、元信息、配置区、内容区和播放区。
- `AnimationControls.svelte`：接收共享 `player` 与 `total`，提供完整播放控制。
- `AnimationField.svelte`：带标签、限制说明和错误状态的配置输入。
- `StepSlider.svelte`：保留原生 range 语义的自定义步骤进度。
- `SelectMenu.svelte`：支持键盘和焦点管理的自定义选项菜单，不直接放未打磨的原生 `select`。
- `DataCell.svelte`：数组、字符串、栈、队列等共用的数据格状态和指针。
- `StepExplanation.svelte`：统一的阶段名称和当前步骤中文说明。
- `TreeDiagram.svelte`：文章示例树共用的节点、连线、方向箭头和状态绘制。

算法特有的图形、连线和布局留在具体演示组件中；发现第二种动画也需要同一控件或画面元素时，先抽成共享资产，不在两个组件里各写一份。

## 界面要求

- 沿用 `AnimationShell.svelte` 的卡片结构、Svelte runes 写法和全站语义颜色令牌。
- 移动端允许图形区域横向滚动，不能挤破正文版心。
- 状态不能只靠颜色表达；提供文字、指针或形状线索。
- 控件有可访问名称，进度支持键盘，步骤说明使用适度的 `aria-live`。
- 尊重 `prefers-reduced-motion`，不自动播放，不让隐藏或已替换的预览实例留下计时器。
- 注释使用中文；界面文案不使用破折号「——」。

## 完成检查

- 单步到首尾、连续播放、暂停、倒退、拖动进度、重置和自定义输入均正确。
- 验证空输入、非法输入、无结果、连续回退或算法对应的最坏情况。
- 在正式文章和 `http://localhost:4321/__editor/` 分栏预览都实际操作，连续编辑不会重复挂载。
- 检查手机宽度、亮暗主题、键盘操作和控制台。
- 运行 `npm run check`；确认 dev server 未运行后再运行 `npm run build`。
