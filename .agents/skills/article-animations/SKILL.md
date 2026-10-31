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

需要配置时，容器正文必须是单个 YAML 对象，不能混放 Markdown。未闭合容器、未知类型和非法配置不会被当作可执行内容。页面没有 JavaScript 时只显示静态提示。

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
