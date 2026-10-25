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

`kmp` 配置：

- `text`：必填的非空文本串，最多 60 个 Unicode 字符。
- `pattern`：必填的非空模式串，最多 24 个 Unicode 字符。

容器正文必须是单个 YAML 对象，不能混放 Markdown。未闭合容器、未知类型和非法配置不会被当作可执行内容。页面没有 JavaScript 时只显示静态提示。

## 新增动画类型

先确认演示能帮助理解一个具体操作，避免只加无信息量的装饰动效。沿用现有分层：

1. 在 `site/src/lib/animations/` 新建纯 TypeScript 算法模块。预生成不可变步骤快照，快照包含绘制当前画面所需全部状态和中文解释；不要让播放定时器直接修改算法内部状态。
2. 在 `site/src/components/animation/` 新建 Svelte 5 组件，接收 `AnimationProps.config`。提供播放暂停、前后单步、重置和进度控制；输入可编辑时，应用新输入必须停止旧播放并重建快照。
3. 在 `site/src/components/animation/mount.ts` 的注册表加动态 `import()`，键名使用小写 kebab-case。
4. 在 `site/src/lib/markdown/remark-animation.mjs` 的类型白名单登记同一键名，并完善该类型的配置校验。限制输入长度和步骤数量。
5. 在合适的现有文章中添加真实示例，默认数据应能展示核心行为，而不只是最理想路径。
6. 更新本 skill 的类型清单与 `CLAUDE.md` 的对应说明。

共享挂载和 Markdown 管线已经同时覆盖正式文章与本地编辑器，不要另写一套预览渲染器。

## 界面要求

- 沿用 `site/src/components/animation/KmpDemo.svelte` 的卡片结构、Svelte runes 写法和全站语义颜色令牌。
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
