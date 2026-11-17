---
title: 'Geist 设计系统全览：Vercel 的界面语言、令牌与 74 个组件'
description: 'Vercel 的 Geist 设计系统把配色、字体排印、材质、网格和组件收进了一套可以查、可以引、可以复用的规范里。这篇收录逐章对照原站文档，并把 74 个组件的示例搬进文章，能点、能切、能拖。'
pubDate: 2026-11-08
author: 'Vercel 设计团队'
category: curation
tags: ['前端', 'CSS', '设计系统', 'Vercel设计团队·Geist']
featured: true
subcategory: 'curation-tools'
---

> [!NOTE]
> 本文是 Vercel 官方 Geist 设计系统文档（https://vercel.com/geist/）的中文收录，覆盖六个基础章节（色彩，字体排印，字体，材质，终端，网格），品牌规范，以及组件库里 74 个组件的说明。页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文由 Vercel 设计团队维护，抓取并翻译自 2026 年 11 月的线上版本，**版权归 Vercel 所有，译文和注解只作学习交流之用。**

> [!NOTE]
> 组件示例做了两层复刻。一层是原站示例的 HTML 快照，默认状态、全部尺寸和变体都在，观感和原站一致。另一层是站内用 Svelte 重做的可交互版本，按钮、标签页、模态框、轻提示、下拉菜单、滑块这些能真的点、选、拖。原站示例里的第三方品牌 logo 和真人头像换成了本地生成的占位图，视频改成静态窗口；字体按 OFL 授权自托管。文中的注解是译者加的编辑判断，不是原文。


## Geist 是什么（What Geist Is）

Geist 是 Vercel 的公开设计系统。它不只是一套配色和字体，而是把界面里反复出现的决定，收成了一套可以查、可以引、可以复用的条目：十组色彩阶梯、二十多档字号、八种材质层级、一套网格系统，以及七十多个组件的完整规格。

读这份文档时最直观的感受是，它把“为什么”写在了“是什么”前面。几乎每个组件页的最后都跟着三段固定的最佳实践：适用场景（When to use）、行为（Behavior）、无障碍（Accessibility）。配色页也一样，先讲清楚 Color 1 到 10 各自负责哪一层，再给正反两个例子。这种写法值得单独拿出来学。

这篇收录按原站的结构走：先基础章节（色彩、字体排印、字体、材质、终端、网格），再品牌规范，最后是组件库的全部 74 个组件。组件示例做了两层复刻，一层是原站示例的 HTML 快照，另一层是站内用 Svelte 重做的可交互版本。

:::bi
Vercel design system for building consistent web experiences.

:::zh
Vercel 的设计系统，用来构建一致的 Web 体验。
:::

Geist 的组成可以直接从原站首页看出来：品牌资产、图标、组件库、色彩、网格，以及四款 Geist 字体（Sans、Mono、Serif、Pixel）。图标页在本篇抓取时已经并入其他入口，这里不单独成节。


## 色彩系统（Colors）

:::bi
Learn how to work with our color system. Right click to copy raw values.

:::zh
了解怎么使用我们的色彩系统。在色块上点右键即可复制原始色值。
:::

:::bi
There are 10 color scales in the system. P3 colors are used on supported browsers and displays.

:::zh
系统里一共有 10 组色阶。在支持 P3 的浏览器和显示器上会使用 P3 颜色。
:::

:::bi
Scales: Backgrounds, Gray, Gray alpha, Blue, Red, Amber, Green, Teal, Purple, Pink. Each scale has 10 steps.

:::zh
这 10 组是：背景，灰，带透明度的灰（gray alpha），蓝，红，琥珀色，绿，青绿，紫，粉。每组 10 个档位。
:::

:::animation geist-palette

:::

### 选灰还是透明灰（Choose Gray or Gray-Alpha）

:::bi
- Gray for text, icons, fills, borders, and dividers by default.
- Gray-alpha only when the background should show through, such as in shadows or overlays.

:::zh
- 文本，图标，填充，边框和分隔线，默认都用灰。
- 只有需要透出下面的背景时才用带透明度的灰，比如阴影和浮层。
:::

### 两条容易画错的线（Draw Each Border Once）

:::bi
Do: Keep the divider inside the border.

Avoid: Overlapping alpha borders make intersections stand out.

:::zh
正确做法：让分隔线收在边框里面。

错误做法：两条带透明度的边框叠在一起，交会处会明显跳出来。
:::

:::bi
Do: Transparent shadows blend with the background.

Avoid: Opaque shadows leave a gray halo.

:::zh
正确做法：半透明阴影会和背景自然融合。

错误做法：不透明阴影会留下一圈灰晕。
:::

### 背景与语义色（Backgrounds and Semantic Colors）

:::bi
There are two background colors for pages and UI components. In most instances, you should use Background 1, especially when color is being placed on top of the background. Background 2 should be used as a secondary background for large containers.

:::zh
页面和 UI 组件有两种背景色。绝大多数情况都该用 Background 1，尤其是要在背景上再叠颜色的时候。Background 2 留给大容器做次级背景。
:::

:::bi
Background 1: default element background. Background 2: secondary background.

:::zh
Background 1 是元素的默认背景，Background 2 是次级背景。
:::

:::bi
These three colors are designed for UI component backgrounds.

:::zh
这三个颜色专门用于 UI 组件的背景。
:::

:::bi
Color 1: default background. Color 2: hover background. Color 3: active background.

:::zh
Color 1 是默认背景，Color 2 是悬停背景，Color 3 是按下背景。
:::

:::bi
If your UI component’s default background is Background 1, you can use Color 1 as your hover background and Color 2 as your active background. On smaller UI elements like badges, you can use Color 2 as the default and Color 3 as the hover state.

:::zh
如果组件的默认背景是 Background 1，悬停背景可以用 Color 1，按下背景用 Color 2。换成徽标这类更小的 UI 元素，也可以拿 Color 2 当默认背景，Color 3 当悬停状态。
:::

:::bi
These three colors define default, hover, and active border strength. Use solid gray by default. Use the matching gray-alpha step only when the edge needs to blend with its surface.

:::zh
这三个颜色分别定义默认，悬停和按下三种状态的边框强度。默认用实色灰，只有边缘需要和它所在的表面融在一起时，才换成对应档位的带透明度的灰。
:::

:::bi
Color 4: default border. Color 5: hover border. Color 6: active border.

:::zh
Color 4 是默认边框，Color 5 是悬停边框，Color 6 是按下边框。
:::

:::bi
These two colors are designed for high contrast UI component backgrounds.

:::zh
这两个颜色是为高对比度的组件背景准备的。
:::

:::bi
Color 7: high contrast background. Color 8: hover high contrast background.

:::zh
Color 7 是高对比背景，Color 8 是高对比背景的悬停态。
:::

:::bi
These two colors are designed for accessible text and icons.

:::zh
这两个颜色用于满足无障碍要求的文本和图标。
:::

:::bi
Color 9: secondary text and icons. Color 10: primary text and icons.

:::zh
Color 9 是次级文本和图标，Color 10 是主要文本和图标。
:::

Color 1 到 10 的完整对照和 Background 1 / Background 2 的实色都在上面的色彩演示里，点色块可以复制色值，右上角能切亮暗。


## 字体排印与字体（Typography and Font）

### 排印规则（Typography Rules）

:::bi
Rules of typesetting throughout the system.

:::zh
贯穿整套系统的排版规则。
:::

:::bi
Our typography styles can be consumed as Tailwind classes. The classes below pre-set a combination of font-size, line-height, letter-spacing, and font-weight for you based on the Geist Core Figma system.

:::zh
我们的字体排印样式都可以直接当 Tailwind 类来用。下面这些类基于 Geist Core 的 Figma 系统，把字号，行高，字距和字重打包成一套预设，拿来就能用。
:::

:::bi
To make use of the Subtle and Strong modifiers, all you have to do is use the `<strong>` element nested as the descendant of a given typography class:

:::zh
要用上 Subtle 和 Strong 这两种修饰，只要在对应的排印类里嵌一个 `<strong>` 元素当后代：
:::

```tsx
<p className="text-copy-16">
  Copy 16 <strong>with Strong</strong>
</p>
```

:::animation geist-type

:::

### 四组字阶（Headings, Buttons, Label, Copy）

**标题（Headings）**
:::bi
Used to introduce pages or sections.

:::zh
用来引出页面或章节。
:::

**按钮（Buttons）**
:::bi
Only to be used within components that render buttons.

:::zh
只用在真正渲染按钮的组件里。
:::

**标签（Label）**
:::bi
Designed for single-lines, and given ample line-height for highlighting & marrying up with icons.

:::zh
专为单行设计，行高给得比较宽松，方便做高亮，也方便和图标对齐。
:::

**正文（Copy）**
:::bi
Designed for multiple lines of text, having a higher line height than Label.

:::zh
为多行文本设计，行高比 Label 更大。
:::

四组字阶的完整规格（字号、行高、字重、字距、用途说明）都在上面的演示里。原站的用法约定是：Heading 只用来引出页面或小节，Button 只在按钮组件内部使用，Label 是单行文本、行高留得宽，Copy 是多行正文、行高更高。
### Geist 字体家族（The Geist Typeface）

:::bi
At Vercel, we’ve developed Geist, a typeface specifically designed for developers and designers. We began by creating a monospace version that prioritized readability and seamlessly integrated into coding environments.

:::zh
在 Vercel，我们开发了 Geist，一套专为开发者和设计师设计的字体。我们先做的是等宽版本，把可读性放在第一位，让它能无缝融入写代码的环境。
:::

:::bi
After perfecting the monospace variant, we expanded Geist into a Sans, Serif, and Pixel version, adding versatility to its capabilities.

:::zh
等宽版本打磨好之后，我们把 Geist 扩展出 Sans，Serif 和 Pixel 三个版本，让它的适用范围更广。
:::

:::bi
Geist embodies our design principles of simplicity, minimalism, and speed, drawing inspiration from the renowned Swiss design movement.

:::zh
Geist 体现了我们简单，极简和快速的设计原则，灵感来自著名的瑞士设计运动。
:::

:::bi
With precision, clarity, and functionality at its core, Geist enhances the visual experience of developers and designers, empowering them to effectively communicate their ideas.

:::zh
Geist 把精确，清晰和功能作为内核，提升开发者和设计师的视觉体验，帮他们把想法清楚地表达出来。
:::

### 安装与像素变体（Install and Pixel Variants）

:::bi
Best for Next.js projects. Includes full glyph set and font-feature-settings support.

:::zh
最适合 Next.js 项目。包含完整字形集，也支持 font-feature-settings。
:::

```bash
npm i geist
```

:::bi
You can also load Geist Serif and Geist Pixel as variable fonts and choose a style with the ELSH axis. Include this code in app/layout.js. View the README for full instructions.

:::zh
也可以把 Geist Serif 和 Geist Pixel 作为可变字体加载，用 ELSH 轴来挑样式。把这段代码放进 app/layout.js，完整说明见 README。
:::

:::bi
Quick setup for web projects. Does not include full glyph set or font-feature-settings support for Geist Sans, Geist Mono, or Geist Pixel.

:::zh
面向 Web 项目的快速接入方式。对 Geist Sans，Geist Mono 和 Geist Pixel 来说，它不包含完整字形集，也不支持 font-feature-settings。
:::

```tsx
import { Geist, Geist_Mono, Geist_Pixel } from 'next/font/google'
```

:::bi
On Google Fonts, the five pixel shapes ship as one variable family selected through the ELSH axis. Keep the axis when importing the font, then map each stop to a utility.

:::zh
在 Google Fonts 上，五种像素形状被打包成一个可变字体家族，靠 ELSH 轴来选。导入字体时保留这个轴，再把轴上的每一个位置映射到一个工具类。
:::

:::bi
Apply font-pixel-square, font-pixel-grid, and the other utilities to switch between shapes.

:::zh
给元素套上 font-pixel-square，font-pixel-grid 这些工具类，就能在几种形状之间切换。
:::

:::bi
Manually download otf, woff2 and variable font files. Includes full glyph set and font-feature-settings support. Licensed under OFL. Use it on your sites and projects. Read the license.

:::zh
也可以手动下载 otf，woff2 和可变字体文件。这种方式包含完整字形集和 font-feature-settings 支持，字体以 OFL 协议授权，站点和项目里都可以用。使用前请阅读许可证。
:::


## 材质（Materials）

:::bi
Presets for radii, fills, strokes, and shadows.

:::zh
圆角，填充，描边和阴影的预设组合。
:::

:::animation geist-materials

:::

### 页面上的材质（Surface）

:::bi
On the page.

:::zh
位于页面上。
:::

### 浮起来的材质（Floating）

:::bi
Above the page.

:::zh
浮在页面之上。
:::

材质不是装饰，而是把“这个元素在页面的哪一层”编码成阴影和圆角。Surface 一档用于页面上的元素，Floating 一档用于浮起来的元素，层级越高阴影越深，圆角也越大。

**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Material instead of hand-rolling radii, fills, strokes, and shadows on a surface; the type encodes the elevation role.
- Pick the type from where the element sits in the layered hierarchy: base for resting cards, small–large for raised content, tooltip and menu for floating popovers, modal for dialogs, fullscreen for takeovers.
- Don’t stack two Materials on the same element; if a child needs more elevation, lift it into its own Material with a higher type.

:::zh
- 不要自己在表面上手写圆角，填充，描边和阴影，直接用 Material，类型本身就编码了这个表面在层级里该扮演的角色。
- 按元素在分层结构里的位置挑类型：静止的卡片用 base，抬起的内容用 small 到 large，浮层用 tooltip 和 menu，对话框用 modal，全屏接管用 fullscreen。
- 不要在同一个元素上叠两个 Material。子元素如果需要更高的层级，就让子元素自己套一个类型更高的 Material。
:::


**行为（Behavior）**

:::bi
- Align the elevation choice with the element’s z-index band so a tooltip-typed surface doesn’t sit visually below a base card.
- Favor the lowest elevation that still reads as elevated against its background; over-elevating is a common source of visual noise.
- Let the type drive chrome and use layout spacing for layout instead of overriding shadows on the same element.

:::zh
- 选的层级要和元素所在的 z-index 档位一致，别让一个用 tooltip 类型的表面在视觉上落到基础卡片下面去。
- 能用最低的层级就看得出抬起效果，就用最低的。层级给高了是视觉噪音最常见的来源之一。
- 让类型来决定装饰性外观，布局交给间距，不要在同一个元素上覆写阴影。
:::


**无障碍（Accessibility）**

:::bi
- Material is decorative chrome; semantics live on the role-bearing wrapper (role="dialog" on a modal, role="tooltip" on a tooltip, etc.).
- Don’t rely on shadow alone to communicate elevation; pair with the matching focus-visible ring on focusable children inside.
- Test materials in both themes: shadow contrast on dark backgrounds is weaker than on light, so confirm separation still reads.

:::zh
- Material 只是装饰性的外壳，语义放在带角色的外层容器上（模态框用 role="dialog"，提示气泡用 role="tooltip"，其他情况同理）。
- 别只靠阴影来传达层级，内部的子元素只要可聚焦，就给它配上对应的 focus-visible 焦点环。
- 两种主题下都要试一遍：深色背景上的阴影对比度比浅色背景弱，要确认元素还能看出分离。
:::

:::annotation
Material 把层级收成有限几档，牺牲了表达自由度，换来的是团队里不会冒出十种各自微调的阴影，层级也始终能和 z-index 档位对上。
:::


## 终端（Terminal）

:::bi
Color themes for your terminal, built from Geist. Available for Ghostty, iTerm2, Alacritty, and Windows Terminal.

:::zh
用 Geist 的颜色做出来的终端主题，提供 Ghostty，iTerm2，Alacritty 和 Windows Terminal 版本。
:::

:::animation geist-terminal

:::

### 设计细节（Design Details）

:::bi
Dark uses pure black, and Light uses a soft off-white. Three shades of gray separate primary text, secondary output, and details like timestamps and suggestions.

:::zh
深色主题用纯黑，浅色主题用柔和的米白。三档灰把主要文本，次级输出，以及时间戳和补全建议这类弱化信息区分开。
:::

:::bi
We give Dark’s six bright accents the same +0.10 lightness step in OKLCH before converting them to sRGB. In Light, they get darker for emphasis.

:::zh
在把颜色转成 sRGB 之前，我们先给深色主题的六个亮色强调色在 OKLCH 里统一加上 0.10 的亮度，这样它们的感知亮度就一致了。浅色主题里反过来，这些颜色会变深来获得强调效果。
:::

:::bi
We use Geist colors for familiar terminal states: red for errors, green for success, amber for warnings, and blue for information. Labels like FAIL and WARN reinforce the message.

:::zh
终端里那些熟悉的状态沿用 Geist 的颜色：报错用红，成功用绿，警告用琥珀色，信息用蓝。FAIL 和 WARN 这类标签会再强调一遍这条信息。
:::

:::bi
Dark: Primary #EDEDED, Secondary #A0A0A0, Quiet #8F8F8F. Light: Primary #24292F, Secondary #4F5359, Quiet #656A70.

:::zh
深色：主要 #EDEDED，次级 #A0A0A0，弱化 #8F8F8F。浅色：主要 #24292F，次级 #4F5359，弱化 #656A70。
:::

### 调色板与对比度（Palette and Contrast）

:::bi
The 16 ANSI colors in Vercel Light. Ratios show each color as text against its #FBFBFA background. All semantic colors, including bright variants, meet a minimum 4.5:1 contrast ratio.

:::zh
Vercel Light 主题里的 16 个 ANSI 颜色。对比度数值是各颜色作为文字压在 #FBFBFA 背景上测得的。所有语义色（包括亮色变体）都达到 4.5:1 的最低对比度要求。
:::

16 个 ANSI 颜色的色值和对比度在终端演示的下半部分，每一项都标了与实际背景的比值。
### 终端配置（Terminal Setup）

:::bi
Configure Ghostty with Geist Mono, Vercel themes, and a ▲ prompt.

:::zh
把 Ghostty 配好 Geist Mono 字体和 Vercel 主题，再给提示符换成 ▲。
:::

**1. 安装 Geist Mono（1. Install Geist Mono）**

:::bi
Install Geist Mono via npm or download the font files from Vercel. The terminal theme expects a Nerd Font build so the prompt glyphs render.

:::zh
可以通过 npm 安装 Geist Mono，也可以从 Vercel 下载字体文件。终端主题要求字体是 Nerd Font 版本，否则提示符里的字形渲染不出来。
:::

**2. 配置 Ghostty（2. Configure Ghostty）**

:::bi
Move both Ghostty themes from Downloads to ~/.config/ghostty/themes/, keeping their filenames. Add these settings to your Ghostty config for 14pt text, 16pt padding, and themes that follow the system appearance.

:::zh
把两个 Ghostty 主题文件从下载目录移到 ~/.config/ghostty/themes/，文件名保持不变。再往 Ghostty 配置里加上下面这些设置，分别是 14pt 字号，16pt 内边距，以及跟随系统外观切换的主题。
:::

```ini
font-family = GeistMono Nerd Font Mono
font-size = 14
theme = dark:vercel-dark.ghostty,light:vercel-light.ghostty
```

**3. 加一个三角提示符（3. Add the triangle prompt）**

:::bi
Install Starship (brew install starship on macOS). For Zsh, add the following to your shell and prompt configs.

:::zh
安装 Starship（macOS 上执行 brew install starship）。Zsh 用户把下面两段分别加到 shell 配置和提示符配置里。
:::

```bash
eval "$(starship init zsh)"
```

```toml
[character]
success_symbol = "▲"
error_symbol = "[▲](bold red)"
vimcmd_symbol = "[▲](bold blue)"
```

:::bi
Open a new terminal window to apply your setup. The triangle turns red when a command fails.

:::zh
新开一个终端窗口，配置就会生效。命令执行失败时，三角形会变红。
:::

:::annotation
在 OKLCH 里统一加 0.10 的亮度再转 sRGB，是这页最技术的一个细节：在 sRGB 里直接给六个颜色加同样的数值，感知上会有的亮有的暗，而 OKLCH 是感知均匀的，在它里面加的 0.10 才真的等量。
:::


## 网格（Grid）

:::bi
Display elements in a grid layout.

:::zh
用网格布局排列元素。
:::

:::animation geist-grid

:::

### 示例覆盖（Examples）

:::bi
- **Grid**: A non-responsive grid with no cells.
- **Basic grid**: A non-responsive single grid with auto flowing cells configuration.
- **Responsive grid**: Grid component with responsive rows and columns props at all 3 breakpoints.
- **Responsive Grid with responsive guide clipping cells**: Grid component with responsive rows and columns props at all 3 breakpoints as well as guide clipping on specific cells.
- **Grid with overlaying cells**: Grid component with cells that overlay another in various states.
- **Specific Grid with Guide Clipping**: Grid component with guide clipping enabled on specific cells.

:::zh
- **网格**：一个不随视口变化，也不带单元格的网格。
- **基础网格**：一个不随视口变化的单层网格，单元格采用自动流式排布。
- **响应式网格**：网格组件，rows 和 columns 这两个 props 在全部 3 个断点上都能取响应式值。
- **响应式网格，参考线按单元格裁切**：网格组件，rows 和 columns 这两个 props 在全部 3 个断点上都能取响应式值，还能对指定单元格裁切参考线。
- **叠放单元格的网格**：网格组件，单元格可以以不同状态叠在另一个单元格之上。
- **在指定单元格上裁切参考线的网格**：网格组件，可以对指定单元格开启参考线裁切。
:::

### 最佳实践（Best Practices）

**适用场景（When to use）**

:::bi
- Use Grid for two-dimensional cell-and-guide layouts in marketing pages, docs landing pages, and feature breakdowns where the rule lines and cell borders are part of the design.
- For plain n-column responsive content (cards, lists), use Tailwind grid grid-cols-* utilities directly; Grid is overkill when guides aren’t visible.
- Don’t nest Grids more than one level; the guide overlap reads as visual noise and breaks the cell math.

:::zh
- 像营销页，文档首页和功能拆解这类场景，如果参考线和单元格边框本身就是设计的一部分，就用 Grid 做二维的“单元格加参考线”布局。
- 如果只是普通的 n 列响应式内容（卡片，列表），直接用 Tailwind 的 grid grid-cols-* 工具类就行。参考线不可见的时候，Grid 就太重了。
- Grid 嵌套不要超过一层。参考线叠在一起会被读成视觉噪音，单元格的换算关系也会乱。
:::

**行为（Behavior）**

:::bi
- Set columns and rows at all three breakpoints so cells reflow predictably between mobile, tablet, and desktop.
- Use solid cells to occlude guides behind a tile when content needs an opaque background; without it, guides render through the cell.
- Hide row or column guides only when their absence improves clarity (single-axis layouts, hero rows). Hiding both usually means a plain Tailwind grid is the right tool.

:::zh
- 三个断点上的列数和行数都要设，这样单元格在手机，平板和桌面之间切换时才会按预期重排。
- 内容需要不透明背景时，用实色单元格把瓦片背后的参考线挡住。不加 solid，参考线会直接透到单元格上。
- 只有在去掉之后画面更清楚时才隐藏行或列参考线（单轴布局，首屏整行这类场景）。如果两个方向都要藏，通常说明该直接用普通的 Tailwind 网格。
:::

**无障碍（Accessibility）**

:::bi
- Guides are decorative; mark them aria-hidden="true" and let semantics live on cell content.
- When cells become tappable, give each its own focus ring and keep tab order matching reading order.
- Confirm guide contrast on both themes; the default tokens are tuned, but custom borders can drop below the 3:1 minimum.

:::zh
- 参考线只是装饰，标上 aria-hidden="true"，语义交给单元格里的内容。
- 单元格变成可点击元素之后，每个都要有自己的焦点环，Tab 顺序要和阅读顺序一致。
- 两种主题下都要确认参考线的对比度。默认令牌是调好的，但自定义边框可能低于 3:1 的下限。
:::


## 品牌资产（Brands）

:::bi
Guidelines for using Vercel brand and assets, including logos, content, and trademarks.

:::zh
使用 Vercel 品牌和素材（包括标志，内容和商标）的规范。
:::

:::bi
We’ve created the following guidelines to help others use our brand and assets, including our logo, content, and trademarks, without having to negotiate legal agreements for each use.

:::zh
我们整理了下面这份规范，方便大家使用 Vercel 的品牌和素材（包括标志，内容和商标），而不必每次使用都单独谈一份法律协议。
:::

### Vercel

:::bi
The Vercel trademark includes the Vercel name & logo, and any word, phrase, image, or other designation that identifies any Vercel products. Please don’t modify the logos or alter them in any way.

:::zh
Vercel 商标包括 Vercel 的名称和标志，以及任何用来指代 Vercel 产品的词，短语，图像或其他标识。请不要修改或改动这些标志。
:::

### 符号与 Unicode（Symbol and Unicode）

:::bi
The Vercel symbol should only be used in places where there is not enough room to display the full logo, or in cases where only brand symbols of multiple brands are meant to be shown.

:::zh
只有在空间不足以放下完整标志，或者场景里只需要并排展示多个品牌的符号时，才使用 Vercel 的符号。
:::

### 留白（Spacing Considerations）

:::bi
The safety area surrounding the Primary Logo is defined by the height of our symbol.

:::zh
主标志周围的安全留白，以我们符号的高度为单位来定义。
:::

### Next.js

:::bi
The Next.js trademark includes the Next.js name & logo, and any word, phrase, image, or other designation that identifies any Vercel products. Please don’t modify the logo or alter it in any way.

:::zh
Next.js 商标包括 Next.js 的名称和标志，以及任何用来指代 Vercel 产品的词，短语，图像或其他标识。请不要修改或改动这个标志。
:::

### Turbo

:::bi
Turbo includes the Turbo, Turborepo and Turbopack names & logos, and any word, phrase, image, or other designation that identifies any Vercel products. Please don’t modify the logos or alter them in any way.

:::zh
Turbo 涵盖 Turbo，Turborepo 和 Turbopack 的名称与标志，以及任何用来指代 Vercel 产品的词，短语，图像或其他标识。请不要修改或改动这些标志。
:::

### 拼写（Spelling）

:::bi
The preferred written format is Next.js. After the first instance of Next.js, Next is an accepted format if used at least several times on the same page. URLs may use nextjs or next.

:::zh
推荐的写法是 Next.js。同一个页面里第一次出现之后，只要能保证至少用上几次，简写成 Next 也是可以的。URL 里用 nextjs 或 next 都可以。
:::

:::annotation
这一节只收录了文字规范。原站品牌页上的 logo 和图形素材属于 Vercel 的商标，不在这里转载，需要使用时请从原站的品牌资产页下载，并按上面的规则使用。
:::


## 组件库（Components）

组件库是 Geist 的主体，一共 74 个组件，按用途分成七组。每个组件下面保留了原站的说明和最佳实践，示例则用两层方式复刻：先是一张原站示例的快照（默认状态和全部变体都在），如果这个组件也有站内重做的可交互版本，会再多一张卡片，能真的点、选、拖。

示例快照来自原站，所以按钮的颜色、圆角、阴影和字距都是原样的；`@vercel/geistcn` 组件包没有公开，示例代码展示的是原站的用法，不是可以直接安装的依赖。

### 操作与导航（Actions and Navigation）

按钮、复制、拆分、溢出菜单和分页加载，这些是一次操作的入口。原站把它们放在一起，是因为它们的共同任务是把用户的一个意图变成一次明确的执行。

:::animation geist-gallery
group: actions
:::

#### Button（按钮）

:::bi
Trigger an action or event, such as submitting a form or displaying a dialog.

:::zh
触发某个操作或事件，例如提交表单或打开对话框。
:::

**原站示例里的说明（Notes）**

:::bi
**Sizes**: The default size is medium.

:::zh
**尺寸**：默认尺寸是 medium。
:::

:::bi
**Shapes**: Icon-only buttons should include the svgOnly prop and an aria-label.

:::zh
**形状**：纯图标按钮要同时带上 svgOnly prop 和 aria-label。
:::

:::bi
**Rounded**: Combination of shape="rounded" and the shadow prop, often used on marketing pages.

:::zh
**圆角**：shape="rounded" 与 shadow prop 搭配使用，常见于营销页。
:::

:::bi
**Link**: Use ButtonLink for links with the same props as Button.

:::zh
**链接**：链接用 ButtonLink，它的 props 和 Button 完全一样。
:::

:::bi
**Custom**: Use CustomButton to override colors for foreground, background, and border across normal, hover, and active states.

:::zh
**自定义**：用 CustomButton 在默认状态，悬停状态和按下状态下分别覆盖前景色与背景色，以及边框颜色。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Button } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row items-start gap-4 flex-initial">
      <Button size="small">Upload</Button>
      <Button>Upload</Button>
      <Button size="large">Upload</Button>
    </div>
  );
}
```

```tsx
import { CustomButton } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row items-start gap-4 flex-initial">
      <CustomButton
        active={{
          foreground: '#fff',
          background: 'var(--ds-blue-700)',
          border: 'var(--ds-blue-700)',
        }}
        hover={{
          foreground: '#fff',
          background: '#0B7BFE',
          border: 'var(--ds-blue-700)',
        }}
        normal={{
          foreground: '#fff',
          background: 'var(--ds-blue-700)',
          border: 'var(--ds-blue-700)',
        }}
        width={160}
      >
        Upgrade to Pro
      </CustomButton>
    </div>
  );
}
```

#### Copy Button（复制按钮）

:::bi
A button that copies a given string to the clipboard and provides feedback when copied.

:::zh
把指定字符串复制到剪贴板，并在复制完成后给出反馈的按钮。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { CopyButton } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return <CopyButton textToCopy="lipsum" label="copy text" />;
}
```

#### Dots Menu（三点菜单）

:::bi
An overflow menu triggered by a three-dot icon that reveals additional actions in a dropdown.

:::zh
由三点图标触发的溢出菜单，用下拉菜单展示更多操作。
:::

#### Load More Button（加载更多按钮）

:::bi
A full-width button used to append more items to a paginated list, with loading and styling variants.

:::zh
整行宽度的按钮，用于向分页列表追加更多条目，带加载状态和多种样式变体。
:::

#### Show more（展开更多）

:::bi
Styling component to show expanded or collapsed content.

:::zh
用于展示展开或收起内容的样式组件。
:::

#### Split Button（拆分按钮）

:::bi
A button that offers a primary interaction coupled with a dropdown menu offering additional actions.

:::zh
由主操作按钮与提供附加操作的下拉菜单组合而成的按钮。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: The button's primary action should be the first item in the dropdown menu.

:::zh
**默认**：按钮的主操作应当同时是下拉菜单的第一项。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import type { ButtonProps } from '@vercel/geistcn/components';
import { SplitButton, SplitButtonMenuItem } from '@vercel/geistcn/components';
import type { JSX } from 'react';

const SIZES: ButtonProps['size'][] = ['small', 'medium', 'large'];
const TYPES: Extract<ButtonProps['variant'], 'default' | 'secondary'>[] = [
  'default',
  'secondary',
];

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col items-start justify-between gap-8 flex-initial">
      {TYPES.map((variant) => {
        return (
          <div
            key={variant}
            className="flex flex-row items-stretch justify-start gap-4 flex-initial"
          >
            {SIZES.map((size) => {
              return (
                <SplitButton
                  buttonProps={{
                    onClick: () => {
                      alert('Clicked Saved');
                    },
                    size,
                    variant,
                  }}
                  key={`${variant}`}
                  menuButtonLabel="Select save method"
                  menuItems={
                    <>
                      <SplitButtonMenuItem
                        description="Save changes"
                        menuItemProps={{
                          onClick: () => {
                            alert('Clicked Save');
                          },
                        }}
                        title="Save"
                      />
                      <SplitButtonMenuItem
                        description="Save changes and create a new production deployment"
                        menuItemProps={{
                          onClick: () => {
                            alert('Clicked Save + Redeploy');
                          },
                        }}
                        title="Save + Redeploy"
                      />
                    </>
                  }
                  menuProps={{ width: 264 }}
                >
                  Save
                </SplitButton>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
```

### 表单与输入（Forms and Inputs）

输入框、文本域、标签、字段组和筛选条。这一组的重点是错误、禁用、前缀后缀这些边缘状态怎么设计，以及同一行里几个控件怎么对齐。

:::animation geist-gallery
group: inputs
:::

#### Address Input（地址输入框）

:::bi
Search for an address or enter country-specific details.

:::zh
搜索地址，或手动填写与所选国家相关的详细字段。
:::

:::annotation
地址输入的示例里有完整的国家列表和搜索交互，快照只保留了初始状态和字段结构，实际输入体验请到原站试。
:::

**原站示例里的说明（Notes）**

:::bi
**Search and edit**: Type Lemon to try the mock search. Select an address to fill and review the remaining fields.

:::zh
**搜索与编辑**：输入 Lemon 试试模拟搜索。选中地址后会自动填充，你可以接着核对剩下的字段。
:::

:::bi
**Manual entry**: Omit provider to show all fields for the selected country.

:::zh
**手动输入**：省略 provider 时，会展示所选国家的全部字段。
:::

:::bi
**Lookup unavailable**: If lookup fails, users can continue with manual entry.

:::zh
**查询不可用**：查询失败时，用户可以继续手动填写。
:::

:::bi
**Validation**: Pass field messages through errors. Use getAddressErrors to check required fields.

:::zh
**校验**：字段信息通过 errors 传入。用 getAddressErrors 检查必填字段。
:::

#### Clearable Input（可清空输入框）

:::bi
Text input with a clear button that resets the value on Escape.

:::zh
带清空按钮的文本输入框，按 Esc 会重置取值。
:::

#### Fieldset（字段组）

:::bi
Groups related form controls inside a bordered card with optional footer actions.

:::zh
把相关的表单控件归到一张带边框的卡片里，底部可以选择性地放操作按钮。
:::

#### Filter Params（筛选参数）

:::bi
A URL-backed filter bar with searchable filter selection.

:::zh
筛选状态存在 URL 里的筛选栏，添加筛选条件时可以搜索。
:::

**原站示例里的说明（Notes）**

:::bi
**Suggestions**: Provide a suggestion for filters that have a useful starting value. Suggestions remain optional until users select them.

:::zh
**建议值**：有合适的初始值时，可以给筛选项提供一个建议值。建议值在用户主动选中之前始终只是建议，不会自动生效。
:::

:::bi
**AI**: Pass an ai callback to offer natural-language filter suggestions. This example simulates a request and always applies the Production environment filter.

:::zh
**AI**：传入 ai 回调即可给出自然语言筛选建议。这个示例模拟了一次请求，并且总是应用 Production 环境筛选。
:::

:::bi
**Readonly filters**: Use a readonly filter for page context that should be visible but cannot be changed or removed. The page passes its value through readonlyValues, keyed by the filter's key; it is never read from or written to the URL. A value can be a promise, such as one passed down from a server component, and only that filter's pill waits for it. Add a note to explain the context in a hover card.

:::zh
**只读筛选**：页面上下文这类需要展示但不能被改动或移除的条件，用只读筛选。页面通过 readonlyValues 传值，按筛选项的 key 索引。这个值不会从 URL 读取，也不会写回 URL。值可以是 promise，例如从服务端组件传下来的 promise，此时只有该筛选项的胶囊（pill）等待它。再用一条 note 在悬停卡片里解释这段上下文。
:::

:::bi
**Persistent filters**: Set persistent on a filter that belongs to the page rather than to something users opt into. Its pill is always in the bar and has no remove button. Persistent filters render ahead of every other pill and suggestion, in the order they are passed to params.

:::zh
**常驻筛选**：有些筛选属于页面本身，而不是用户主动添加的条件，这类筛选项要设 persistent。它的胶囊始终在栏里，没有移除按钮。常驻筛选会排在其他所有胶囊和建议值之前，顺序与传给 params 的顺序一致。
:::

:::bi
**Persistent filters**: A persistent filter is still editable — open its pill to change the value — but it cannot be turned off, so its options leave out the empty value: there is no All Environments entry to clear it with. Give it a default so the pill always reads as a real selection rather than an unfiltered label.

:::zh
**常驻筛选**：常驻筛选仍然可以编辑，点开胶囊就能改值，但它不能被关掉，所以选项里不包含空值，也就没有 All Environments 这一项用来清除筛选。给它一个默认值，胶囊才会始终读起来像一个真实的选择，而不是一个未筛选的标签。
:::

:::annotation
只读和常驻是两种不同的不可移除：只读是值由页面提供，常驻是用户不能关掉但可以改，API 上分别落在 readonlyValues 和 persistent。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use FilterParamsBar for list and search pages where the active constraints should be visible, linkable, and preserved on refresh.
- Keep filter names short and use option labels that explain the selected value without requiring users to reopen the menu.

:::zh
- 列表页和搜索页里，当前生效的筛选条件需要看得见，可分享链接，刷新后还能保留，这类场景用 FilterParamsBar。
- 筛选项名字保持简短，选项标签要能让用户不用重新打开菜单就明白选中了什么。
:::

**行为（Behavior）**

:::bi
- Encode only the URL parameters owned by each filter so removing a pill does not clear unrelated page state.
- Provide suggestions only when they are useful defaults, not as replacements for filters users have explicitly selected.

:::zh
- 每个筛选项只负责编码它自己的 URL 参数，这样移除一个胶囊不会清掉页面上无关的状态。
- 只在建议值确实是好用的默认项时才提供，不要用它替代用户已经明确选过的筛选。
:::

**无障碍（Accessibility）**

:::bi
- Make filter labels and option labels specific enough to identify the constraint and selected value when announced by a screen reader.

:::zh
- 筛选名和选项名都要足够具体，屏幕阅读器朗读时才能说清限制条件和选中的值。
:::

#### Input（输入框）

:::bi
Retrieve text input from a user.

:::zh
从用户那里获取文本输入。
:::

**原站示例里的说明（Notes）**

:::bi
**Search**: Automatically clears the input if escape is pressed.

:::zh
**搜索**：按下 Esc 时自动清空输入框。
:::

:::bi
**⌘K**: Displays the ⌘ K shortcut to indicate that the input supports a command palette.

:::zh
**⌘K**：显示 ⌘ K 快捷键，提示这个输入框支持命令面板。
:::

:::bi
**⌘K**: Transitions to showing Esc when the field is dirty.

:::zh
**⌘K**：输入框有内容之后，快捷键提示会切换成 Esc。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Pick `<Input>` for a single line of free-form text such as names, domains, or tokens.
- Switch to Textarea the moment content can wrap to multiple lines.
- Use Combobox when the value comes from a known list the user filters by typing.
- For an inline search box, set the search variant with a scoped placeholder like Search projects; don’t embed a `<SearchInput>` inside an unrelated form.

:::zh
- 名字，域名，令牌这类单行自由文本用 `<Input>`。
- 内容可能折成多行时，直接换 Textarea。
- 取值来自一份已知列表，并且用户会边打字边筛选时，用 Combobox。
- 内联搜索框用 search 变体，占位文案写清范围，例如 Search projects。不要在一个不相干的表单里塞 `<SearchInput>`。
:::

**行为（Behavior）**

:::bi
- Validate on blur, not on every keystroke; surface the message by passing a string to error.
- Trim leading and trailing whitespace before submit so example.com and example.com resolve to one value.
- Keep the field focusable while saving; pair disabled with a spinner only when input is impossible.
- Don’t wrap a labelled `<Input>` in a Tooltip; put the explainer on a sibling icon button so the label stays announced.

:::zh
- 在失焦时校验，不要每敲一个键就校验。错误信息通过给 error 传字符串来展示。
- 提交前去掉首尾空白，让 example.com 和 example.com 收敛为同一个值。
- 保存期间让输入框保持可聚焦，只有确实无法输入时才用 disabled 配加载指示器。
- 不要把带标签的 `<Input>` 包进 Tooltip，说明放到旁边的图标按钮上，标签才能被正常朗读。
:::

**内容（Content）**

:::bi
- Labels are short Title Case nouns: Project Name, Domain, Environment Variable Name.
- Placeholders show an example value (my-awesome-project, example.com), never instructions like Enter your project name.
- Helper text is sentence case, one sentence with a trailing period, on a sibling element wired through aria-describedby.
- Validation names the field and the constraint, ends in a period, and skips please (Project name is required., Code must be 6 digits.).

:::zh
- 标签是简短的 Title Case 名词：Project Name，Domain，Environment Variable Name。
- 占位符展示示例值（my-awesome-project，example.com），不要写成 Enter your project name 这类指示语。
- 辅助说明用 sentence case，一句话，结尾带句号，放在同级元素上并通过 aria-describedby 关联。
- 校验信息要写明字段和限制条件，以句号结尾，不要加 please（Project name is required.，Code must be 6 digits.）。
:::

**无障碍（Accessibility）**

:::bi
- Passing a string to label requires id; the InputPropsWithStringLabelAndId union won’t compile without it and screen readers lose the association.
- For icon-only affordances inside a row of inputs, use `<Button shape="circle" svgOnly aria-label="…">` rather than an unlabeled icon.
- A SearchInput placeholder names the scope (Search projects) so the role is clear without sighted context.

:::zh
- 给 label 传字符串时还必须传 id。InputPropsWithStringLabelAndId 这个联合类型缺了 id 就编译不过，屏幕阅读器也会丢失二者的关联。
- 一排输入框里的纯图标操作，用 `<Button shape="circle" svgOnly aria-label="…">`，不要放一个没有标签的图标。
- SearchInput 的占位符要写明范围（Search projects），这样即使看不到界面，也能知道它是做什么的。
:::

:::annotation
输入框的文案分三层：标签说明字段是什么，占位符给示例值，辅助说明补充上下文。三层各司其职，混用是表单文案最常见的毛病。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Input } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between gap-4 flex-initial">
      <Input aria-labelledby="Demo input" placeholder="Small" size="small" />
      <Input aria-labelledby="Demo input" placeholder="Default" />
      <Input aria-labelledby="Demo input" placeholder="Large" size="large" />
    </div>
  );
}
```

#### Keyboard Input（键盘输入）

:::bi
Display keyboard input that triggers an action.

:::zh
展示触发某个操作的键盘输入。
:::

#### Label（标签）

:::bi
Accessible text label for form controls.

:::zh
表单控件的无障碍文本标签。
:::

#### Search Input（搜索输入框）

:::bi
Pre-configured search input with a magnifying glass icon and clear button.

:::zh
预配置好的搜索输入框，带放大镜图标和清空按钮。
:::

#### Textarea（多行文本框）

:::bi
Retrieve multi-line user input.

:::zh
获取用户的多行输入。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Textarea } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <Textarea
      aria-label="Default"
      placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
      style={{ minHeight: 100 }}
    />
  );
}
```

### 选择控件（Selection Controls）

复选框、单选、开关、分段切换、滑块、下拉与组合框。选择的难点不在控件本身，而在选中、悬停、聚焦、禁用、错误这些状态加起来之后还能不能一眼看清。

:::animation geist-gallery
group: choices
:::

#### Checkbox（复选框）

:::bi
A control that toggles between two options, checked or unchecked.

:::zh
在选中与未选中两种状态之间切换的控件。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Multi-select inside a list, like table-row pickers, multi-pick filters, and opt-in preference groups.
- Acknowledgments where the user must affirm a specific statement (terms of service, irreversible export).
- For a single boolean setting like dark mode or password protection, use Toggle. The on/off mechanic is clearer there than a lone checkbox.

:::zh
- 列表里的多选，比如表格行选择器，多选筛选和需要用户主动勾选的偏好组。
- 需要用户明确确认某段声明的地方（服务条款，不可逆的导出）。
- 深色模式或密码保护这类单个布尔设置用 Toggle，开关的表示法比孤零零一个复选框更清楚。
:::

**行为（Behavior）**

:::bi
- Indeterminate is a visual state, not a third value. Drive it from a parent that knows partial selection, and clear it as soon as every child is fully checked or unchecked.
- Validation on a required acknowledgment fires on submit, not on blur, so checking and unchecking shouldn’t flash an error.
- Disabled checkboxes still need a Tooltip naming the reason; a greyed box with no explanation reads as a bug.

:::zh
- 半选是一种视觉状态，不是第三种取值。由掌握部分选中情况的父级来驱动它，子项全部选中或全部取消后立刻清掉。
- 必填确认项的校验在提交时触发，不在失焦时触发，这样来回勾选不应该闪出错误。
- 禁用的复选框同样需要一个 Tooltip 说明原因，一个变灰又没有任何解释的框看起来就是 bug。
:::

:::annotation
半选经常被实现成一个可以提交的值，但这里强调它只是视觉状态，表单数据里只有选中和未选中两种。
:::

**内容（Content）**

:::bi
- Group label above a `<fieldset>` is a Title Case noun like Notifications or Required Permissions. No trailing colon.
- Acknowledgment label is a full sentence ending in a period: I agree to the Terms of Service.
- Indeterminate copy names the partial count next to the group label (3 of 5 selected). Never leave the dash state unlabeled.

:::zh
- `<fieldset>` 上方的组标签是 Title Case 名词，例如 Notifications 或 Required Permissions，末尾不加冒号。
- 确认项的标签是一句完整的话，以句号结尾：I agree to the Terms of Service.
- 半选状态的文案在组标签旁边写出已选数量（3 of 5 selected）。不要留下一个没有说明的横杠状态。
:::

**无障碍（Accessibility）**

:::bi
- Wrap related checkboxes in `<fieldset>` with a `<legend>` so screen readers announce the group name before each option.
- Row-select checkbox in a table has no visible label. Set aria-label="Select {row name}" so the row stays identifiable out of context.
- The click target already extends to the label. Don’t override the `<label>`/htmlFor association with a custom wrapper that breaks the click region.

:::zh
- 把相关的复选框包进带 `<legend>` 的 `<fieldset>`，屏幕阅读器会在每个选项之前先读出组名。
- 表格里的行选择复选框没有可见标签，要设置 aria-label="Select {row name}"，这样离开上下文之后这一行仍然能被认出来。
- 点击区域已经覆盖到标签上，不要再用自定义包装元素覆盖 `<label>`/htmlFor 的关联，那会把点击区域弄坏。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Checkbox } from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox checked={checked} onChange={(): void => setChecked((b) => !b)}>
      Option 1
    </Checkbox>
  );
}
```

#### Choicebox（选择框）

:::bi
A larger form of Radio or Checkbox, where the user has a larger tap target and more details.

:::zh
放大版的单选按钮或复选框，点击区域更大，可以承载更多细节。
:::

**原站示例里的说明（Notes）**

:::bi
**Custom content**: Custom content is displayed when selecting the option.

:::zh
**自定义内容**：选中该选项时会展示自定义内容。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- A choice that benefits from a larger tap target plus a description or icon, like a framework picker, plan comparison, or deployment region with latency.
- Single-select for mutually exclusive choices, multi-select for additive ones. Don’t mix the two within one group.
- Cap at 4–6 tiles. Past that, switch to Select or Combobox so the page doesn’t scroll for a single field. For plain text labels with no description, use Radio.

:::zh
- 选项需要更大的点击区域，还要配描述或图标时，例如框架选择，套餐对比，带延迟数据的部署区域。
- 互斥的选项用单选，可累加的用多选。同一组里不要混用两种模式。
- 最多 4–6 个选项块，再多就换成 Select 或 Combobox，别为了一个字段让整页滚动。如果标签只是纯文本，没有描述，就用 Radio。
:::

**行为（Behavior）**

:::bi
- The whole tile is the click and focus target; tapping anywhere inside selects it. Don’t place nested buttons or links inside a tile that would steal the click.
- Selected state shows a check or filled dot in the corner. The border highlight alone isn’t enough on low-contrast screens.
- Disabled tiles need a Tooltip naming why (Available on Pro). A faded tile with no reason reads as broken.

:::zh
- 整个选项块就是点击和聚焦目标，点块内任何地方都会选中。不要在里面放按钮或链接，会把点击抢走。
- 选中状态在角上显示对勾或实心圆点。只靠边框高亮，在低对比度的屏幕上不够。
- 禁用的选项块需要 Tooltip 说明原因（Available on Pro）。一个变淡又没有理由的块看起来就是坏了。
:::

**内容（Content）**

:::bi
- Titles are parallel: one Title Case title plus one sentence-case description per tile, ending in a period.
- Don’t restate the title in the description. The description adds the differentiator (\$20/mo · 100 GB bandwidth), not a synonym.
- Icons are decorative when paired with a title; if the icon is the only label, give the tile an aria-label naming the choice.

:::zh
- 各块标题要对仗：每个块一个 Title Case 标题加一段 sentence case 描述，描述以句号结尾。
- 不要在描述里重复标题，描述要给出区分点（\$20/mo · 100 GB bandwidth），而不是换个说法。
- 配了标题时，图标只是装饰。如果图标是唯一的标签，要给选项块一个 aria-label 说明这个选择是什么。
:::

**无障碍（Accessibility）**

:::bi
- Tiles render as radios or checkboxes under the hood, so keep them inside a `<fieldset>` with a `<legend>` so screen readers announce the group.
- Arrow keys move within a single-select group, Space toggles in multi-select. Don’t override those keys with custom handlers.
- Color is not the selection signal. Pair the highlight border with the corner check so colorblind users still see what’s active.

:::zh
- 选项块底层渲染成单选按钮或复选框，所以要把它们放进带 `<legend>` 的 `<fieldset>`，屏幕阅读器才会读出组名。
- 单选组里用方向键移动，多选里用空格键切换。不要用自定义事件拦截这些按键。
- 颜色不是选中状态的唯一信号。高亮边框要配上角上的对勾，色盲用户才能看出哪个是选中的。
:::

#### Combobox（组合框）

:::bi
Filters large lists to selectable options based on the matching query.

:::zh
根据输入的查询词筛选长列表，得到可选中的选项。
:::

**原站示例里的说明（Notes）**

:::bi
**Clearable**: Set clearable to show a clear button when a value is selected.

:::zh
**可清空**：设置 clearable，选中值之后就会显示清空按钮。
:::

:::bi
**Used inside a Modal**: It is common to use Combobox inside a Modal. On mobile, the Modal automatically renders a Dialog instead.

:::zh
**在模态框内使用**：在模态框里使用 Combobox 很常见。移动端上，模态框会自动渲染成 Dialog。
:::

:::bi
**Inside a Sheet with multi-line options**: Options can opt out of the fixed row height with ignoreDefaultHeight to render multi-line content (e.g. a shared environment variable name plus its target). The list sizes each row to its content and stays scrollable.

:::zh
**面板内的多行选项**：选项可以通过 ignoreDefaultHeight 跳出固定行高，渲染多行内容，例如共享环境变量名加上它作用的目标。列表会按内容给每一行定高，同时保持可滚动。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Pick `<Combobox>` when users type to filter a known list of values (regions, frameworks, env-var names).
- For short, fixed lists where typing adds nothing, switch to Select.
- When more than one value can be chosen at once, use MultiSelect.
- For free-form filter strings that don’t resolve to a single option, drop in Input with the search variant.

:::zh
- 取值来自一份已知列表，用户会靠打字筛选时（区域，框架，环境变量名），用 `<Combobox>`。
- 列表短且固定，打字没什么用的话，换成 Select。
- 可以一次选多个值时，用 MultiSelect。
- 自由形式的筛选字符串，不会归到某一个具体选项的，用 search 变体的 Input。
:::

**行为（Behavior）**

:::bi
- Show a loading state for async results; don’t collapse the list while the request is in flight.
- Render a custom empty state of the form No {items} match "{query}" rather than a bare No results.
- Inside a Modal, Geist switches to a Dialog on mobile automatically; don’t layer a second portal.
- Keep arrow-key navigation through `<Combobox.Option>` items; don’t hijack Enter to submit the surrounding form while the list is open.

:::zh
- 异步结果要有加载状态。请求还在路上时，不要把列表收起来。
- 自定义空状态照 No {items} match "{query}" 这个格式写，不要只写一句 No results。
- 在模态框里，Geist 在移动端会自动切换成 Dialog，不要再套一层 portal。
- 方向键在 `<Combobox.Option>` 之间导航要保留。列表打开时，不要劫持 Enter 去提交外层表单。
:::

**内容（Content）**

:::bi
- Visible label is a short Title Case noun (Region, Environment Variable Name).
- Placeholder is the inline hint: Search regions, DATABASE_URL. Never bare Search… and never the label restated.
- Option text is Title Case for short values and matches canonical branding (Next.js, not NextJS); same register across the list.
- Validation names the field and constraint, sentence case with a period (Select a region.).

:::zh
- 可见标签是简短的 Title Case 名词（Region，Environment Variable Name）。
- 占位符是行内提示：Search regions，DATABASE_URL。不要只写 Search…，也不要把标签换个说法。
- 短选项用 Title Case，品牌名按官方写法（Next.js，不是 NextJS），整个列表语域一致。
- 校验信息写明字段和限制，用 sentence case，带句号（Select a region.）。
:::

**无障碍（Accessibility）**

:::bi
- `<Combobox>` has no label prop; pair a sibling `<Label htmlFor>` with the root id, or set aria-label on the root for icon-only triggers.
- The root accepts aria-label only; there is no aria-labelledby prop, so the sibling-label path is the way to reference visible text.
- Trap focus inside the popover when nested in a Modal so Tab cycles options instead of the page behind it.

:::zh
- `<Combobox>` 没有 label prop。用同级的 `<Label htmlFor>` 关联根节点的 id，纯图标触发器则在根节点上设置 aria-label。
- 根节点只接受 aria-label，没有 aria-labelledby prop。要通过可见文字建立名称，只能走同级标签这条路。
- 嵌在模态框里时，把焦点限制在浮层内，Tab 才会在选项之间循环，而不是跑到后面的页面上。
:::

:::annotation
Combobox 没有 label prop 这件事和 Select 正好相反，两个组件的表单写法不能照搬。
:::

#### Multi Select（多选下拉）

:::bi
A keyboard-navigable dropdown for selecting multiple items with advanced focus management.

:::zh
可用键盘导航的下拉菜单，用于选中多个条目，带进阶的焦点管理。
:::

**原站示例里的说明（Notes）**

:::bi
**Select Actions**: The component provides different selection behaviors based on current state:

:::zh
**选择操作**：组件会根据当前状态提供不同的选择行为：
:::

:::bi
**Keyboard Navigation**: The Multi Select component supports comprehensive keyboard navigation:

:::zh
**键盘导航**：Multi Select 支持完整的键盘导航：
:::

:::bi
**Controlled State**: Use controlled state to manage selections programmatically.

:::zh
**受控状态**：需要以编程方式管理选中项时，用受控状态。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Pick `<MultiSelect>` when users pick more than one value from a known list (regions, scopes, tags).
- For a single value from a short list, use Select.
- When typing to filter is more important than seeing every option at once, use Combobox.
- Skip `<MultiSelect>` for boolean settings; Toggle handles those.

:::zh
- 从已知列表里选多个值时（区域，作用域，标签），用 `<MultiSelect>`。
- 短列表里选单个值，用 Select。
- 打字筛选比一次看全所有选项更重要时，用 Combobox。
- 布尔设置不要用 `<MultiSelect>`，交给 Toggle。
:::

**行为（Behavior）**

:::bi
- Show the selected count in the trigger (3 regions selected); show the single name when only one is picked.
- Use controlled mode when state lives in the URL or syncs to the server so the trigger label and stored value stay in lockstep.
- Keep checkbox focus and button focus distinct so Up/Down navigates rows and Left/Right toggles between the row’s checkbox and action button.
- For empty filters, render No {items} match "{query}" rather than No results.

:::zh
- 触发器上显示选中数量（3 regions selected）。只选了一个时，直接显示那一个的名字。
- 状态放在 URL 里或要同步到服务端时，用受控模式，触发器的文案和存下来的值才能始终一致。
- 把复选框焦点和按钮焦点区分开，上下方向键负责换行，左右方向键在当前行的复选框和操作按钮之间切换。
- 筛选没有结果时，渲染 No {items} match "{query}"，不要只写 No results。
:::

**无障碍（Accessibility）**

:::bi
- Each row checkbox needs an aria-label that names the item (Select us-east-1); a bare Select is unanchored for screen readers.
- The trigger button needs a stable accessible name even when zero items are selected; don’t rely on the placeholder alone.
- Trap focus inside the menu while it’s open and return focus to the trigger on close.
- Announce bulk actions (Select All, Select Only) through the visible button label so the action matches what the screen reader speaks.

:::zh
- 每一行的复选框都要有 aria-label 指明条目（Select us-east-1）。只写一个 Select，对屏幕阅读器来说是没有落点的。
- 即使一个条目都没选，触发器按钮也要有稳定的可访问名称，不能只靠占位文案。
- 菜单打开期间把焦点限制在菜单内，关闭时把焦点还给触发器。
- 批量操作（Select All，Select Only）要通过可见的按钮标签说出来，屏幕阅读器读到的才能和实际操作对上。
:::

#### Radio（单选按钮）

:::bi
Provides single user input from a selection of options.

:::zh
从一组选项中取一个值。
:::

**原站示例里的说明（Notes）**

:::bi
**Radio headless**: Use the RadioGroup component without RadioGroup.Item.

:::zh
**无样式单选按钮**：用 RadioGroup 组件，但不使用 RadioGroup.Item。
:::

:::bi
**Radio standalone**: Standalone unlabelled radio input for use in custom UI.

:::zh
**独立单选按钮**：独立的无标签单选输入，用于自定义 UI。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- A single choice from 2–6 mutually exclusive options where seeing every option matters (deploy regions, plan tiers, billing cycle).
- Past 6 options, switch to Select or Combobox so the list doesn’t dominate the form.
- For binary on/off, use Toggle. For richer per-option content (icon, description, badge), use Choicebox.

:::zh
- 2–6 个互斥选项里选一个，并且每个选项都值得完整看到（部署区域，套餐档位，计费周期）。
- 超过 6 个选项就换成 Select 或 Combobox，别让选项列表占据整个表单。
- 二选一的开关用 Toggle。每个选项还需要图标，描述或徽标这类内容时，用 Choicebox。
:::

**行为（Behavior）**

:::bi
- Pre-select the safest default so the field reads as configured, never as required-but-empty. Skip the default only when the choice has real consequences and you want a deliberate pick.
- Required state goes on the RadioGroup, not on individual options. Required-against-a-single-radio is meaningless.
- Arrow keys move selection within the group and skip disabled options. Tab moves to the next field, not the next radio.

:::zh
- 预选最稳妥的默认项，让这个字段读起来是已经配置好的，而不是必填却空着。只有当选择有实际后果，需要用户刻意做决定时，才留空不选。
- 必填状态加在 RadioGroup 上，不要加在单个选项上，给单个单选按钮加必填没有意义。
- 方向键在组内移动选中项，并跳过禁用选项。Tab 跳到下一个字段，不是在单选按钮之间跳。
:::

**内容（Content）**

:::bi
- Group label is a Title Case noun like Deployment Region or Billing Cycle. Render it via `<legend>` or a sibling label tied with aria-labelledby.
- Option labels are parallel: same part of speech, same length range, same register. Monthly / Yearly, not Monthly / Pay yearly.
- Disabled options need a Tooltip naming why (Available on Pro and Enterprise). A greyed-out radio with no reason reads as broken.

:::zh
- 组标签是 Title Case 名词，例如 Deployment Region 或 Billing Cycle。用 `<legend>` 渲染，或者用同级 label 并通过 aria-labelledby 关联。
- 选项标签要对仗：词性一致，长度相近，语域相同。用 Monthly / Yearly，不要 Monthly / Pay yearly。
- 禁用的选项需要 Tooltip 说明原因（Available on Pro and Enterprise）。一个变灰又没有理由的单选按钮看起来就是坏了。
:::

**无障碍（Accessibility）**

:::bi
- Wrap related radios in `<fieldset>` + `<legend>` so screen readers announce the group name before each option.
- The standalone unlabeled radio (custom UI) needs an aria-label describing the choice. Never ship a radio with no accessible name.
- Don’t replace the native focus ring with a CSS hack that drops outline-offset; keyboard users lose track of which option is focused.

:::zh
- 把相关的单选按钮包进 `<fieldset>` + `<legend>`，屏幕阅读器会在每个选项之前读出组名。
- 独立使用的无标签单选按钮（自定义 UI）需要一个描述选项的 aria-label。任何单选按钮都不能没有可访问名称。
- 不要用丢掉 outline-offset 的 CSS 技巧替换原生聚焦环，那样键盘用户就不知道焦点落在哪个选项上了。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { RadioGroup, RadioGroupItem } from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [value, setValue] = useState('one');

  return (
    <RadioGroup label="Default Radio Example" onChange={setValue} value={value}>
      <div className="flex flex-col items-stretch justify-start gap-6 flex-initial">
        <RadioGroupItem value="one">Option 1</RadioGroupItem>
        <RadioGroupItem value="two">Option 2</RadioGroupItem>
      </div>
    </RadioGroup>
  );
}
```

#### Select（选择器）

:::bi
Display a dropdown list of items.

:::zh
用下拉列表展示一组选项。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Select } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex relative min-w-px max-w-full flex-col sm:flex-row sm:flex-wrap flex-1">
      <div className="flex relative min-w-px max-w-full flex-col items-start flex-1">
        {/* eslint-disable-next-line rulesdir/prefer-radio-for-few-static-options */}
        <Select aria-label="Small" placeholder="Small" size="small">
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
      </div>

      <div className="flex relative min-w-px max-w-full flex-col items-start flex-1">
        {/* eslint-disable-next-line rulesdir/prefer-radio-for-few-static-options */}
        <Select aria-label="Default" placeholder="Default">
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
      </div>

      <div className="flex relative min-w-px max-w-full flex-col items-start flex-1">
        {/* eslint-disable-next-line rulesdir/prefer-radio-for-few-static-options */}
        <Select aria-label="Large" placeholder="Large" size="large">
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
      </div>
    </div>
  );
}
```

#### Slider（滑块）

:::bi
Input to select a value from a given range.

:::zh
在给定范围内选取一个值的输入控件。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Slider } from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [value, setValue] = useState([50]);
  return (
    <form>
      <Slider
        onValueChange={(value) => setValue(value as number[])}
        value={value}
      />
    </form>
  );
}
```

#### Switch（分段切换器）

:::bi
Choose between a set of options.

:::zh
在一组选项之间做选择。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: Ensure the width of each item is wide enough to prevent jumping when active.

:::zh
**默认**：每段要留够宽度，避免选中时整组发生跳动。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Switch, SwitchControl } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex relative min-w-px max-w-full flex-col items-start flex-1">
      <Switch name="default">
        <SwitchControl defaultChecked label="Source" value="source" />
        <SwitchControl label="Output" value="output" />
      </Switch>
    </div>
  );
}
```

#### Toggle（开关）

:::bi
Displays a boolean value.

:::zh
展示一个布尔值。
:::

### 展示与数据（Display and Data）

头像、徽标、提示条、代码块、表格、状态点和截断文本。这一组大多出现在页面的信息层，负责把结构化内容排得能扫读。

:::animation geist-gallery
group: data
:::

#### Avatar（头像）

:::bi
Avatars represent a user or a team. Stacked avatars represent a group of people

:::zh
头像代表一个用户或一个团队。叠放的头像代表一组人。
:::

**原站示例里的说明（Notes）**

:::bi
**Stacking order**: By default the first member sits on top of the stack, so the first credited author stays the most prominent. Set reverse to flip the order so the last member sits on top instead. The visual left-to-right order is unchanged.

:::zh
**叠放顺序**：默认情况下第一位成员位于最上层，因此排在首位的作者最显眼。设置 reverse 可以翻转顺序，让最后一位成员位于最上层。视觉上的从左到右顺序不变。
:::

:::bi
**Overlap**: By default overlap="auto" scales the spacing with size, keeping a generous, evenly-spaced cluster at any size.

:::zh
**重叠**：默认 overlap="auto" 会随尺寸缩放间距，任何尺寸下都保持一组宽松且均匀分布的头像。
:::

:::bi
**Fixed overlap**: Pass a number to set the overlap in pixels instead. Lower values give more generous spacing; higher values pack tighter for dense, space-constrained UI.

:::zh
**固定重叠**：也可以传数字，按像素设置重叠量。数值越小间距越宽松，数值越大越紧凑，适合空间有限的密集界面。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { AvatarGroup } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <AvatarGroup
        members={[
          { username: 'evilrabbit' },
          { username: 'severinlandolt' },
          { username: 'rauchg' },
        ]}
        size={32}
      />
      <AvatarGroup
        limit={4}
        members={[
          { username: 'christopherkindl' },
          { username: 'rauno' },
          { username: 'shuding' },
          { username: 'skllcrn' },
          { username: 'almonk' },
        ]}
        size={32}
      />
    </div>
  );
}
```

#### Badge（徽标）

:::bi
A label that emphasizes an element that requires attention, or helps categorize with other similar elements.

:::zh
用来强调需要注意的元素，或者帮助把同类元素归类的标签。
:::

**原站示例里的说明（Notes）**

:::bi
**Pill**: A special link, not quite as prominent as a button, based on `<Badge />` styling.

:::zh
**胶囊**：一种特殊的链接，样式基于 `<Badge />`，但没有按钮那么醒目。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Badge } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Badge variant="gray">gray</Badge>
        <Badge variant="gray" contrast="low">
          gray-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="blue">blue</Badge>
        <Badge variant="blue" contrast="low">
          blue-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="purple">purple</Badge>
        <Badge variant="purple" contrast="low">
          purple-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="amber">amber</Badge>
        <Badge variant="amber" contrast="low">
          amber-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="red">red</Badge>
        <Badge variant="red" contrast="low">
          red-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="pink">pink</Badge>
        <Badge variant="pink" contrast="low">
          pink-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="green">green</Badge>
        <Badge variant="green" contrast="low">
          green-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="teal">teal</Badge>
        <Badge variant="teal" contrast="low">
          teal-subtle
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="inverted">inverted</Badge>
        <Badge variant="trial">Trial</Badge>
        <Badge variant="turbo">Turborepo</Badge>
      </div>
    </div>
  );
}
```

#### Banner（横幅）

:::bi
A prominent message that spans the full width of its container to announce important information.

:::zh
横跨容器整个宽度，用于宣布重要信息的醒目消息。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Banner } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <Banner button={{ href: '#', content: 'Read more' }} className="p-4">
      <b>Big News</b> \u2013 New components finally available
    </Banner>
  );
}
```

#### Code Block（代码块）

:::bi
Code Block component used across Vercel and Next.js.

:::zh
在 Vercel 和 Next.js 里通用的代码块组件。
:::

**原站示例里的说明（Notes）**

:::bi
**Referenced lines**: You can link to lines. Just press on any line number.

:::zh
**引用行**：可以链接到具体某一行，点击任意行号即可。
:::

:::bi
**Language switcher with tabs**: Use the tabs prop for a tabbed language switcher instead of the default select.

:::zh
**用标签页的语言切换器**：想要标签页形式的语言切换器而不是默认的下拉选择，用 tabs 属性。
:::

:::bi
**Open in v0**: Use the v0 prop to add an Open in v0 action to the toolbar.

:::zh
**在 v0 中打开**：传 v0 属性，工具栏里就会加上 “Open in v0” 操作。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use `<CodeBlock>` for multi-line, syntax-highlighted source the reader will scan or paste.
- For a single inline token (env var, function name, file path), use Inline Code.
- Pick Snippet for a copy-to-clipboard shell command or one-line key reveal; it ships with the prompt glyph and copy affordance built in.

:::zh
- 多行带语法高亮，读者会扫读或粘贴的源码用 `<CodeBlock>`。
- 单个行内记号（环境变量，函数名，文件路径）用 Inline Code。
- 要复制到剪贴板的 shell 命令，或者单行密钥展示，用 Snippet，它自带命令提示符和复制入口。
:::

**行为（Behavior）**

:::bi
- Always pass a language/syntax (tsx, bash, json, diff). Highlighting is the primary reason to choose `<CodeBlock>` over a plain `<pre>`.
- Highlight only the lines under discussion. A block where every line is highlighted reads the same as no highlight at all.
- Mark added or removed lines with the diff syntax or the dedicated added/removed props. Faking them with // added comments breaks copy-paste.
- Show the filename header when the snippet has a paste destination (app/page.tsx, vercel.json). Omit it for ephemeral examples.

:::zh
- 始终传语言或语法的名称（tsx，bash，json，diff）。语法高亮正是选 `<CodeBlock>` 而不是普通 `<pre>` 的主要理由。
- 只高亮正在讨论的行。整块全部高亮和完全不高亮看起来一样。
- 新增或删除的行用 diff 语法或专门的 added/removed 属性标记。用 // added 这类注释假造会破坏复制粘贴。
- 代码片段有明确的粘贴目标时（app/page.tsx，vercel.json），显示文件名头。一次性的示例可以省略。
:::

**内容（Content）**

:::bi
- Snippets stay runnable. Don’t paraphrase real code into pseudo-syntax, and don’t prepend \$ to shell commands. `<Snippet>` already renders the prompt, so text="\$ vercel deploy" doubles to \$ \$ vercel deploy.
- Keep prose around the block in sentence case and put backticks around CLI flags inline (`--prebuilt`).

:::zh
- 代码片段要保持可运行。不要把真实代码改写成伪语法，也不要给 shell 命令加 \$ 前缀。`<Snippet>` 已经会渲染命令提示符，所以 text="\$ vercel deploy" 会显示成 \$ \$ vercel deploy。
- 代码块周围的正文用句首大写，行内提到的 CLI 参数用反引号包起来（`--prebuilt`）。
:::

:::annotation
手写 \$ 是代码片段最常见的复制事故：复制出去的是双 \$，粘进终端会直接失败。让组件渲染提示符，作者只管写命令本身。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { CodeBlock } from '@vercel/geistcn/components';
import type { JSX } from 'react';

const code = `// Usage:
//   enabled by \\`--debug-prerender\\`
//   route patterns: [id...] or [...id]
//   NODE_OPTIONS='--debug-prerender' node
function MyComponent(props) {
  return (
    <div>
      <h1>Hello, {props.name}!</h1>
      <p>This is an example React component.</p>
    </div>
  );
}`;

export function Component(): JSX.Element {
  return (
    <CodeBlock aria-label="Hello world" filename="Table.jsx" language="jsx">
      {code}
    </CodeBlock>
  );
}
```

#### Code（代码）

:::bi
Display a snippet of code with syntax highlighting.

:::zh
展示一段带语法高亮的代码片段。
:::

#### Description（描述）

:::bi
Displays a brief heading and subheading to communicate any additional information or context a user needs to continue.

:::zh
显示简短的标题和副标题，传达用户继续操作前需要了解的补充信息或上下文。
:::

#### Entity（实体行）

:::bi
Displays up-to-two columns of content. The left column can contain arbitrary content, and the right column typically contains controls or actions related to the content in the left column.

:::zh
最多显示两列内容。左列可以放任意内容，右列通常放与左列内容相关的控件或操作。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use `<Entity>` for a row of descriptive content paired with one or two controls (member rows, integration rows, domain rows).
- For tabular data with sortable columns and shared row shape, use Table instead.
- For a static key/value metadata block on a detail page, use Description.

:::zh
- 一行描述性内容配一两个控件（成员行，集成行，域名行）用 `<Entity>`。
- 有可排序列，各行结构一致的表格数据改用 Table。
- 详情页上的静态键值元数据块用 Description。
:::

**行为（Behavior）**

:::bi
- The right column holds at most one or two controls. If the row needs more, move secondary actions into a Dots Menu.
- For multi-select rows, the leading Checkbox carries aria-label="Select {entity name}" so the row is selectable without relying on the visual label.
- Render the Skeleton variant (entity-with-skeleton) during load instead of an empty row, and swap to real content once data resolves.

:::zh
- 右列最多放一两个控件。需要更多时，把次要操作收进 Dots Menu。
- 多选行前面的 Checkbox 要带 aria-label="Select {entity name}"，这样不依赖视觉标签也能选中这一行。
- 加载时渲染骨架屏变体（entity-with-skeleton）而不是空行，数据到位后再换成真实内容。
:::

**内容（Content）**

:::bi
- Lead the left column with a scannable identifier: an Avatar or icon, a Title Case label, then sentence-case secondary metadata (Member since Mar 14, 2026).
- Keep right-column buttons Verb + Noun (Remove Member, Resend Invite). Bare verbs like Remove or Confirm lose context once the row scrolls offscreen.

:::zh
- 左列开头放一个便于扫读的标识：头像或图标，Title Case 的标签，然后是句首大写的次级元数据（Member since Mar 14, 2026）。
- 右列按钮用动词加名词（Remove Member，Resend Invite）。只有 Remove 或 Confirm 这样的光杆动词，行滚出屏幕后就丢了上下文。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Avatar, Entity, EntityContent } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <Entity
      left={<Avatar size={32} username="evilrabbit" />}
      right={<p className="text-copy-14 text-gray-900">Connected 1h ago</p>}
    >
      <EntityContent
        description="Glenn Hitchcock (@gln)"
        fill
        title="Evil Rabbit"
      />
    </Entity>
  );
}
```

#### JSON View（JSON 视图）

:::bi
Render JSON objects and arrays as a collapsible tree with syntax coloring, keyboard navigation, search highlighting, and selectable text.

:::zh
把 JSON 对象和数组渲染成可折叠的树，带语法着色，键盘导航，搜索高亮和可选中文本。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: JSON View expands levels strictly below defaultExpandDepth. Use defaultExpandDepth={1} when the first level helps users scan the object without opening every nested value.

:::zh
**默认**：JSON View 严格展开 defaultExpandDepth 以下的层级。如果展开第一层能让用户扫读对象，又不必打开每个嵌套值，就用 defaultExpandDepth={1}。
:::

:::bi
**Single line**: Expanded objects with one short primitive key-value pair render on one line. Nested and long values remain multiline.

:::zh
**单行**：展开后只含一个短基本类型键值对的对象会渲染成一行。嵌套值和长值仍然多行。
:::

:::bi
**Embedded**: JSON View follows surrounding text before and after expanded fields.

:::zh
**嵌入**：展开的字段前后可以接正文，JSON View 会顺着正文一起排版。
:::

:::bi
**Wrapped**: Long primitive values use the multiline layout and wrap within the available width.

:::zh
**换行**：长的基本类型值用多行布局，并在可用宽度内换行。
:::

:::bi
**Collapsed**: Use defaultExpandDepth={0} when the surrounding surface needs to stay compact and users can choose which object to inspect.

:::zh
**折叠**：周围表面需要保持紧凑，由用户自己选择查看哪个对象时，用 defaultExpandDepth={0}。
:::

:::bi
**Highlighted**: Use makeJsonViewHighlightPattern to build the highlightPattern prop from search terms. The pattern highlights matching field names and primitive values.

:::zh
**高亮**：用 makeJsonViewHighlightPattern 从搜索词构造 highlightPattern 属性，这个模式会高亮匹配的字段名和基本类型值。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use JSON View for JSON objects or arrays that users need to inspect, scan, collapse, expand, select, or copy.
- Prefer JSON View over a raw JSON string when nested structure matters or when log lines contain structured payloads.
- Use a regular code block when the value is static documentation, not an interactive product surface.

:::zh
- 用户需要查看，扫读，折叠，展开，选中或复制的 JSON 对象和数组用 JSON View。
- 嵌套结构重要时，或者日志行里带结构化负载时，优先用 JSON View 而不是直接显示原始 JSON 字符串。
- 值只是静态文档，并非可交互的产品界面时，用普通的代码块。
:::

**行为（Behavior）**

:::bi
- Start with defaultExpandDepth={1} for log and detail surfaces where the top-level fields are useful by default.
- Use defaultExpandDepth={0} for dense tables, compact previews, or rows where expanded JSON would compete with primary row content.
- Pass highlightPattern only for active search states. Leave it null when nothing is being searched.
- Keep the source data as an object or array. Do not pre-stringify JSON before passing it to data.

:::zh
- 日志和详情界面默认展开第一层字段就有用，可以从 defaultExpandDepth={1} 起步。
- 密集的表格，紧凑的预览，以及展开的 JSON 会和行内主要内容抢空间的行，用 defaultExpandDepth={0}。
- 只在搜索处于激活状态时传 highlightPattern。没有在搜索时让它保持 null。
- 源数据保持对象或数组。传给 data 之前不要把 JSON 预先字符串化。
:::

**无障碍（Accessibility）**

:::bi
- JSON View renders as a tree. Arrow keys move between visible nodes, Enter and Space toggle expandable nodes, and Home and End move to the first and last visible node.
- Keep the component near the text or control that introduces the JSON. The accessible tree label is JSON, so surrounding context should identify the object.
- Preserve selectable text. Users often copy JSON from logs or traces into search, support, or debugging tools.

:::zh
- JSON View 以树的语义渲染。方向键在可见节点之间移动，Enter 和 Space 展开或收起节点，Home 和 End 跳到第一个和最后一个可见节点。
- 组件要靠近引出这段 JSON 的文字或控件。无障碍树标签固定是 JSON，所以对象是什么要靠上下文说明。
- 保留文本可选中。用户经常把日志或链路里的 JSON 复制到搜索，客服或调试工具里。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { JsonView } from '@vercel/geistcn/components';
import type { JSX } from 'react';

const data = {
  deployment: {
    id: 'dpl_9WjH8QFQySx7',
    project: 'docs',
    target: 'production',
    state: 'ready',
  },
  request: {
    method: 'GET',
    path: '/api/search',
    status: 200,
    durationMs: 42,
  },
  cached: false,
  error: null,
};

export function Component(): JSX.Element {
  return <JsonView data={data} defaultExpandDepth={1} />;
}
```

#### MiddleTruncate（中间截断）

:::bi
Truncates text in the middle, preserving the start and end of the string for maximum readability.

:::zh
从中间截断文本，保留字符串的开头和结尾，尽可能保持可读性。
:::

**原站示例里的说明（Notes）**

:::bi
**Examples**: Covers strings that benefit from middle truncation.

:::zh
**示例**：列出了适合中间截断的字符串。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Middle Truncate for strings whose head and tail both carry information: file paths (apps/…/page.tsx), URLs, deployment IDs (dpl_…abc123), commit hashes, branch names with prefixes.
- For prose, descriptions, and headings, use end-truncation with … instead; cutting the middle of a sentence destroys meaning.
- For any truncated value the user might need verbatim, pair with a Tooltip showing the full string or a copy-on-click affordance.

:::zh
- 头尾都携带信息的字符串用 Middle Truncate：文件路径（apps/…/page.tsx），URL，部署 ID（dpl_…abc123），commit 哈希，带前缀的分支名。
- 正文，描述和标题改用 … 做末尾截断，从句子中间切开会破坏语义。
- 用户可能需要原样拿到被截断的值时，配一个显示完整字符串的提示气泡，或者点击复制的入口。
:::

**行为（Behavior）**

:::bi
- Middle Truncate renders a single ellipsis glyph (…) rather than three periods. This keeps monospace values, including environment variable keys, IDs, hashes, and paths, from reserving three character cells for the truncation marker.
- The component listens to its container width, so layouts that change width on hover (expanding cards, animated rows) cause the truncation point to jitter. Lock the width during interaction.
- Copying truncated text yields the full original string from the underlying value, not the visible ellipsis form. Confirm this stays true if wrapping with custom onCopy.
- Don’t wrap Middle Truncate in another text-overflow: ellipsis container; the two strategies fight each other and the inner ellipsis wins inconsistently.

:::zh
- Middle Truncate 渲染单个省略号字形（…）而不是三个句点。这样环境变量键，ID，哈希和路径这类等宽值就不会为截断标记占掉三个字符格。
- 组件会监听容器宽度，所以悬停时改变宽度的布局（展开卡片，动画行）会让截断点抖动。交互过程中把宽度固定住。
- 复制被截断的文本拿到的是底层值的完整原字符串，不是显示出来的省略形式。在外面包自定义 onCopy 时要确认这一点仍然成立。
- 不要把 Middle Truncate 放进另一个 text-overflow: ellipsis 容器，两种截断策略会互相打架，内层的省略号还会时有时无地胜出。
:::

:::annotation
中间截断真正省下的是字符格而不是像素。等宽字体里两个被省略的字符就是两列的宽度，这对对齐要求高的日志和表格很重要。
:::

**无障碍（Accessibility）**

:::bi
- Expose the full string to assistive tech via the wrapping element’s accessible name (the component already keeps the full value in the DOM for copy).
- Avoid Middle Truncate inside focusable controls without an explicit aria-label; the ellipsis on its own gives screen readers nothing to announce.
- Keep the visible string long enough on small viewports that the head still identifies the resource (path segment, ID prefix).

:::zh
- 通过外层元素的无障碍名称把完整字符串暴露给辅助技术（组件本来就把完整值留在 DOM 里供复制用）。
- 可聚焦控件里如果没写明确的 aria-label，就不要放 Middle Truncate，光一个省略号屏幕阅读器没有东西可念。
- 小视口下可见字符串要留得够长，头部仍能标识资源（路径片段，ID 前缀）。
:::

#### Note（提示条）

:::bi
Display text that requires attention or provides additional information.

:::zh
用来展示需要留意或补充说明的文本。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use a Note for inline contextual feedback next to the field, card, or section it describes: a region change warning above a region picker, a rate-limit notice next to a usage gauge.
- Pick Banner when the message is page-level or system-wide and needs a CTA, Toast for transient acknowledgments, Modal for destructive confirmations.
- Choose variant by meaning: error for a problem the user must fix, warning for a consequence to acknowledge, success for a passed check, secondary for neutral information.

:::zh
- 提示条用于描述对象旁边的行内上下文反馈，对象可以是字段，卡片或区块：区域选择器上方的区域变更警告，用量仪表盘旁的速率限制提示。
- 消息是整个页面或系统级别，并且需要 CTA 时用 Banner，只是短暂确认时用 Toast，破坏性操作的确认用 Modal。
- 按含义选变体：用户必须修复的问题用 error，要知悉后果的用 warning，检查通过的用 success，中性信息用 secondary。
:::

**行为（Behavior）**

:::bi
- A Note is persistent until the underlying state changes; don’t add an ad hoc dismiss control because it competes with the message.
- One Note per concept. Stacking three Notes on a card means the page architecture, not the Note copy, is wrong.
- The optional NoteAction holds a single inline CTA. Don’t pair it with a second button.

:::zh
- 提示条会一直显示，直到底层状态改变。不要临时加一个关闭控件，它会和消息本身抢注意力。
- 一个概念只用一个提示条。卡片上叠三个提示条，说明问题出在页面结构而不是提示文案。
- 可选的 NoteAction 只放一个行内 CTA，不要再配第二个按钮。
:::

**内容（Content）**

:::bi
- NoteLabel is a 1–2 word Title Case prefix that names the topic: Region Change, Rate Limit, Plan Limit. Cut hedges like Heads Up, FYI, and Note.
- NoteContent is one sentence in active voice that names the impact: Changing this region restarts all functions.
- No variant="info" exists; omit variant for the default info icon or use variant="secondary" for neutral copy.
- Single-fragment labels take no period; full descriptive sentences in the body do.

:::zh
- NoteLabel 是一到两个词且为 Title Case 的前缀，点明主题：Region Change，Rate Limit，Plan Limit。删掉 Heads Up，FYI，Note 这类铺垫。
- NoteContent 用主动语态写一句话，说清影响：“Changing this region restarts all functions.”
- 没有 variant="info" 这种写法。想要默认的信息图标就不传 variant，要中性文案就用 variant="secondary"。
- 单个短语的标签不加句号，正文里完整的描述句要加句号。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Note, NoteContent } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <Note>
      <NoteContent>A default note.</NoteContent>
    </Note>
  );
}
```

#### Relative Time Card（相对时间卡片）

:::bi
Popover to show a given date in local time.

:::zh
用浮层按本地时间显示给定日期。
:::

#### Separator（分隔线）

:::bi
A visual divider that separates content into distinct sections, with support for horizontal and vertical orientations.

:::zh
把内容分隔成不同区块的视觉分隔线，支持水平与垂直方向。
:::

**原站示例里的说明（Notes）**

:::bi
**Inset frames**: Use inset when a divider meets a 1px frame painted over the content. The separator reserves 1px at each end and uses solid gray-400. A physical parent border already reserves its edge space and does not need this inset.

:::zh
**内缩边框**：分隔线要和画在内容之上的 1px 边框相接时用 inset。分隔线会在两端各留出 1px，并使用实色的 gray-400。父级真实边框本身已经留了边缘空间，不需要这个内缩。
:::

#### Snippet（代码片段）

:::bi
Display a snippet of copyable code for the command line.

:::zh
展示一段可复制的命令行代码。
:::

**原站示例里的说明（Notes）**

:::bi
**Controlled Copied State**: Use the copied prop to control the copy button animation externally. This lets you copy different text (e.g. from a context card) while reusing the snippet's checkmark feedback.

:::zh
**受控的已复制状态**：用 copied 属性从外部控制复制按钮的动画。这样可以在复制另一段文本时（例如从上下文卡片里复制）复用代码片段的对勾反馈。
:::

:::bi
**Secret Value Exploration**: Use SecretValue for a retrievable secret that should stay masked until the user deliberately reveals it. These examples use the production component to show its masked, revealed, short-value, and overflow states.

:::zh
**密钥值查看**：有些密钥可以取回，但在用户主动显示之前应保持隐藏，这类场景用 SecretValue。下面的示例用的是线上组件，展示它从隐藏到显示，以及短值和溢出这几种状态。
:::

#### Status Dot（状态圆点）

:::bi
Display an indicator of deployment status.

:::zh
用来显示部署状态的指示器。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Deployment lifecycle only. state accepts QUEUED | BUILDING | READY | ERROR | CANCELED | DELETED.
- For non-deployment statuses (Workflow runs, Queue messages, Sandbox, Cron jobs), use a Badge with the canonical state vocabulary instead of repurposing the dot.
- For health summaries that need a number (uptime, hit rate), use Gauge; for in-flight work with a knowable total, use Progress.

:::zh
- 只用于部署生命周期。state 接受 QUEUED | BUILDING | READY | ERROR | CANCELED | DELETED。
- 非部署的状态（Workflow 运行，队列消息，Sandbox，Cron 任务）用 Badge 配规范的状态词汇，不要拿这个圆点改作他用。
- 需要数字的健康概览（在线时长，命中率）用 Gauge。总数可知的进行中工作用 Progress。
:::

**行为（Behavior）**

:::bi
- The dot animates while BUILDING or QUEUED and goes static once the deployment reaches a terminal state. Don’t add a separate spinner alongside it.
- Don’t flash the color through every transitional state on a polling tick; only update when the readyState changes.
- Pair with RelativeTimeCard when timing matters (Building · 12s ago); the dot alone doesn’t convey duration.

:::zh
- BUILDING 或 QUEUED 时圆点有动画，部署进入终态后静止。不要再在旁边加一个单独的加载指示器。
- 不要在每次轮询时把颜色依次闪一遍过渡状态，只在 readyState 变化时更新。
- 时间重要时配 RelativeTimeCard（Building · 12s ago），光靠圆点传达不了时长。
:::

**内容（Content）**

:::bi
- titlePrefix is a noun phrase, not a sentence. Default "This deployment" works for single-deployment surfaces; in lists, pass the entity (titlePrefix="vercel-site production"). Don’t end with a verb or punctuation.
- Use label only when the dot stands alone without surrounding text; Geist sentence-cases the state for you (Building, Ready, Error).
- Don’t wrap the dot in extra prose like Status: Ready. The label already names the state.

:::zh
- titlePrefix 是名词短语，不是句子。单个部署的界面用默认的 “This deployment” 就够了，列表里要传实体（titlePrefix="vercel-site production"）。不要以动词或标点结尾。
- 只有圆点单独出现，周围没有文字时才用 label，Geist 会帮你把状态转成句首大写（Building，Ready，Error）。
- 不要在圆点外面再包一层 “Status: Ready” 这样的文字，label 已经说明状态了。
:::

**无障碍（Accessibility）**

:::bi
- The component composes its own aria-label from titlePrefix plus the state message; don’t override it with a generic aria-label="status".
- When the dot sits inline with text that already names the state, mark the dot decorative with aria-hidden so screen readers don’t announce it twice.
- Color is not the only signal: every state ships with a distinct title and label so colorblind users get the same information.

:::zh
- 组件会用 titlePrefix 加状态消息自己拼出 aria-label，不要用通用的 aria-label="status" 覆盖它。
- 圆点和已经写明状态的文字排在一起时，用 aria-hidden 把圆点标记为装饰性内容，免得屏幕阅读器念两遍。
- 颜色不是唯一的信号：每个状态都有各自的 title 和 label，色盲用户也能得到同样的信息。
:::

#### Table（表格）

:::bi
A semantic HTML table component

:::zh
语义化的 HTML 表格组件。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use `<Table>` for tabular data where rows share the same shape and at least one column is sortable or comparable across rows.
- For a row of descriptive content paired with a single action (membership row, integration row), use Entity instead.
- For a key/value metadata block on a detail page, use Description, not a two-column table.

:::zh
- 各行结构一致，且至少有一列可排序或可跨行比较的表格数据用 `<Table>`。
- 一行描述性内容配一个操作（成员行，集成行）时，改用 Entity。
- 详情页上的键值元数据块用 Description，不要用两列表格。
:::

**行为（Behavior）**

:::bi
- When the underlying list is empty (filter cleared, never created), render Empty State outside the table rather than an empty `<Table.Body>`.
- Render — in cells where a value is unknown or not applicable. Don’t substitute N/A, null, or an empty string.
- Sortable column headers are buttons. The visible label stays Title Case; the sort-direction arrow is decorative and the button announces the next sort state to assistive tech.
- Apply tabular-nums (or Geist Mono) to numeric columns so digits align across rows for comparison.

:::zh
- 底层列表为空时（筛选后没有结果，或者从未创建过），在表格外面渲染 Empty State，而不是空的 `<Table.Body>`。
- 值未知或不适用时，单元格里渲染 —。不要用 N/A，null 或空字符串代替。
- 可排序的列头是按钮。可见标签保持 Title Case，排序方向箭头是装饰性的，按钮会向辅助技术播报下一个排序状态。
- 数字列用 tabular-nums（或 Geist Mono），让各行的数字对齐，便于比较。
:::

:::annotation
单元格里放一个真正的长破折号，是为了让“没有值”在视觉上比 N/A 更安静。它和空字符串的区别读者一眼能看出来，但不喧宾夺主。
:::

**内容（Content）**

:::bi
- Column headers (`<Table.Head>`) are Title Case nouns or noun phrases: Last Used, Requests (7d), Created, Status. Never sentences.
- Use the canonical short relative-time form in cells (2m ago, 5h ago); switch to Mar 14, 2026 past 7 days. See Relative Time Card.
- Pagination labels are Previous and Next. Page-count copy reads Page 2 of 7 or 21–40 of 142 with an en-dash inside the range.

:::zh
- 列头（`<Table.Head>`）用 Title Case 的名词或名词短语：Last Used，Requests (7d)，Created，Status。不要写成句子。
- 单元格里用规范的短相对时间（2m ago，5h ago），超过 7 天改成 Mar 14, 2026。参见 Relative Time Card。
- 分页按钮标签是 Previous 和 Next。页数文案写成 Page 2 of 7 或 21–40 of 142，范围中间用 en dash。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableRoot,
} from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <TableRoot>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Col 1</TableHead>
            <TableHead>Col 2</TableHead>
            <TableHead>Col 3</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Value 1.1</TableCell>
            <TableCell>Value 1.2</TableCell>
            <TableCell>Value 1.3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Value 2.1</TableCell>
            <TableCell>Value 2.2</TableCell>
            <TableCell>Value 2.3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Value 3.1</TableCell>
            <TableCell>Value 3.2</TableCell>
            <TableCell>Value 3.3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableRoot>
  );
}
```

#### Text With Copy Button（带复制按钮的文本）

:::bi
Display text alongside a button that copies the text to the clipboard.

:::zh
显示一段文本，旁边配一个把文本复制到剪贴板的按钮。
:::

### 反馈与状态（Feedback and Status）

加载指示器、骨架屏、进度条、仪表盘、空状态和轻提示。系统在等待、失败或没有内容时怎么说话，全看这一组。

:::animation geist-gallery
group: feedback
:::

#### Empty State（空状态）

:::bi
Fill spaces when no content has been added yet, or is temporarily empty due to the nature of the feature and should be designed to prevent confusion.

:::zh
在还没有添加内容，或者因功能特性暂时为空时填充空白区域，设计上应避免造成困惑。
:::

**原站示例里的说明（Notes）**

:::bi
**Empty state Design framework**: When designed thoughtfully, empty states become an essential part of a smooth user experience, providing enough context to keep users working in a productive way. There are several approaches to explore that will match the needs a developer in different situations:

:::zh
**空状态设计框架**：设计得当的空状态是顺畅体验中不可或缺的一部分，它提供足够的上下文，让用户能继续有产出地工作。有几种做法可供探索，对应开发者在不同场景下的需求：
:::

:::bi
**Blank slate**: The most basic empty state should convey the state of the view.

:::zh
**空白页**：最基础的空状态要传达当前视图的状态。
:::

:::bi
**Informational**: Help users by clearly explaining the benefit and utility of a product or feature, with a call to action and link to more information to help users progress.

:::zh
**信息型**：清楚说明产品或功能的益处和用途，配一个行动号召和了解更多信息的链接，帮用户继续前进。
:::

:::bi
**Informational**: Default to showing rather than telling the value of a feature. Certain entry points to a product may call for a unique empty state and a call to upgrade. Informational empty states will include a call to action.

:::zh
**信息型**：功能的价值观默认用展示而不是说教。某些产品入口可能需要专门的空状态并引导升级。信息型空状态都会带一个行动号召。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Pick the variant by what the user needs: no-results for a filtered list that returned zero rows, blank slate or informational for a resource the user hasn’t created, cleared for completed work, permission for role or tier denials, error for a failed load.
- Render the permission and tier-denial variants full-page when the user lands on a route they can’t view. Use a Note only when one tile inside an otherwise-accessible page is gated.
- Don’t put critical persistent warnings here. Empty states vanish when the list populates; persistent warnings belong in Note or the page header.

:::zh
- 按用户需要选变体：筛选后零结果的列表用 no-results，用户还没创建的资源用 blank slate 或 informational，已完成的工作用 cleared，角色或套餐档位被拒用 permission，加载失败用 error。
- 用户进到无权查看的路由时，permission 和档位拒绝变体按整页渲染。整页本来可以访问，只有一块内容受限时，才用 Note。
- 不要在这里放关键的常驻警告。列表有内容后空状态就消失了，常驻警告应该放在 Note 或页面头部。
:::

**行为（Behavior）**

:::bi
- The CTA must be a real Button or Link, not an onClick div, so it joins the tab order and exposes a role.
- Cap at one primary CTA, plus one secondary when the first action could legitimately be one of two paths (Import Repository and Deploy Template). Three CTAs is a smell.
- After an async filter change, wrap the region in aria-live="polite" so screen readers announce the new state.
- Don’t auto-launch a tour from the educational variant; pair Start Tour with Skip.

:::zh
- CTA 必须是真正的 Button 或 Link，而不是挂了 onClick 的 div，这样它才会进入 Tab 顺序并有角色。
- 最多一个主 CTA。如果第一个动作确实有两条合理路径，可以再加一个次要 CTA（Import Repository 和 Deploy Template）。三个 CTA 就是坏味道。
- 异步切换筛选条件后，把区域包进 aria-live="polite"，让屏幕阅读器播报新状态。
- 教学型变体不要自动启动导览，把 Start Tour 和 Skip 配在一起。
:::

**内容（Content）**

:::bi
- title is Title Case (No Logs Match Your Filter); description is sentence case and adds new information instead of restating the title.
- Quote a single typed query verbatim with curly quotes: No logs match “\${query}”. Clear the filter to see all logs. For multi-facet filters use the plural template No {Items} Match Your Filters and suggest widening or clearing.
- Onboarding bodies name the next action that creates the first item: Push to your Git repository to create your first one. Tier-gated bodies follow {Feature value} with the {Plan} plan.
- Error variant pairs the body with a copyable request ID and a Try Again button.
- CTA labels are Title Case Verb + Noun. Never Get Started, Continue, or OK.

:::zh
- title 用 Title Case（No Logs Match Your Filter），description 用句首大写，并且补充新信息，而不是重复标题。
- 用户输入的单个查询词要原样用中文引号引起来：No logs match “\${query}”。Clear the filter to see all logs. 多维筛选时用复数模板 No {Items} Match Your Filters，并提示放宽或清空条件。
- 新手引导的正文要说清创建第一项的下一个动作：Push to your Git repository to create your first one。档位限制的正文用 “{Feature value} with the {Plan} plan” 这个句式。
- error 变体的正文要配可复制的请求 ID 和 “Try Again” 按钮。
- CTA 标签用 Title Case 的动词加名词，绝不用 Get Started，Continue 或 OK。
:::

#### Error Card（错误卡片）

:::bi
A card used to communicate an error state with a title and message.

:::zh
用标题和消息说明错误状态的卡片。
:::

#### Error（错误）

:::bi
Good error design is clear, useful, and friendly. Designing concise and accurate error messages unblocks users and builds trust by meeting people where they are.

:::zh
好的错误设计要清晰，要能帮上忙，也要友好。设计简洁准确的错误消息，既帮用户解除阻塞，也在用户所处的处境里建立信任。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use the Error component as a block surface when a section or page-level resource failed to load: a panel, a dashboard card, a route boundary.
- Pick toasts.error() for transient action failures (Couldn’t save settings. Try again.) and the error prop on Input for field-level validation. Don’t replace either with this block.
- Always pair platform or system errors with a stable identifier (request ID x-vercel-id, deployment ID dpl_…, run ID, trace ID). Validation and permission denials are user-state, not system, and don’t need an ID.

:::zh
- 某个区块或页面级资源加载失败时，用 Error 组件作为块级界面：面板，仪表盘卡片，路由边界。
- 短暂的操作失败用 toasts.error()（Couldn’t save settings. Try again.），字段级校验用 Input 的 error 属性。这两种情况都不要用这个块级组件替代。
- 平台或系统错误一定要配一个稳定的标识（请求 ID x-vercel-id，部署 ID dpl_…，运行 ID，trace ID）。校验失败和权限拒绝属于用户侧状态，不是系统故障，不需要 ID。
:::

**行为（Behavior）**

:::bi
- The recovery action must do something concrete: a Try Again button when the operation is retry-safe, a named verb (Reconnect GitHub, Update Payment Method) when it isn’t.
- Don’t auto-retry in the background; the user came to this surface to decide.
- For full-page route errors (error.tsx), return focus to the Try Again button on appearance so a keyboard user can retry without hunting for it.

:::zh
- 恢复操作必须落到具体动作：重试安全的操作用 “Try Again” 按钮，不安全的用明确的动词（Reconnect GitHub，Update Payment Method）。
- 不要在后台自动重试，用户来到这个界面是要自己做决定。
- 整页路由错误（error.tsx）出现时把焦点移到 “Try Again” 按钮上，键盘用户不用去找就能重试。
:::

**内容（Content）**

:::bi
- State what happened and what to do next, in that order. Cut apologetic preambles (Unfortunately, Oops, We’re sorry).
- Use Couldn’t or Can’t for user-state errors (Couldn’t verify your passkey. Try again.); use Failed to for system or infra errors that mirror CLI output (Build failed. Bundle exceeds 50 MB.). Unable to is banned.
- Don’t fall back to Something Went Wrong as a title; name the resource that failed (Couldn’t Load Page, Couldn’t Load Deployments).
- Render the stable ID on a monospace sub-line under a collapsed `<details>` so the user can copy-paste it into a support thread.
- Never humor an error. Users hitting an error are frustrated; insincere copy makes it worse.

:::zh
- 先说发生了什么，再说接下来怎么办，顺序不要反。删掉道歉式的开头（Unfortunately，Oops，We’re sorry）。
- 用户侧错误用 Couldn’t 或 Can’t（Couldn’t verify your passkey. Try again.）。系统或基础设施错误用 Failed to，和 CLI 输出保持一致（Build failed. Bundle exceeds 50 MB.）。Unable to 是禁用的。
- 标题不要退回到 Something Went Wrong，要点名失败的资源（Couldn’t Load Page，Couldn’t Load Deployments）。
- 稳定 ID 用等宽字体单独一行，放在默认折叠的 `<details>` 下面，方便用户复制到支持论坛里。
- 永远不要在错误文案里开玩笑。遇到错误的用户已经很沮丧，不真诚的文案只会更糟。
:::

:::annotation
Couldn’t 和 Failed to 的分界线是故障归属：用户能自己再试一次的用前者，说给工程师听的用后者。这条规则在同一个流程里要贯彻到底。
:::

**无障碍（Accessibility）**

:::bi
- When the error appears asynchronously (after a failed fetch), wrap the region in aria-live="polite" so it’s announced. Reserve aria-live="assertive" for true blocking errors that interrupt input.

:::zh
- 错误是异步出现的（比如请求失败之后）时，给区域包上 aria-live="polite"，让它被播报。aria-live="assertive" 只留给真正阻塞且会打断输入的严重错误。
:::

#### Feedback（反馈）

:::bi
Gather text feedback with an associated emotion.

:::zh
收集文字反馈，并附带一个情绪。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: Should only be used on desktop.

:::zh
**默认**：只应在桌面端使用。
:::

:::bi
**Feedback with Select**: Feedback with pre-defined list of topics.

:::zh
**带 Select 的反馈**：带预定义主题列表的反馈。
:::

:::bi
**Feedback with metadata**: Feedback with arbitrary key-value metadata.

:::zh
**带元数据的反馈**：带任意键值元数据的反馈。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Place Feedback at the end of a page, doc, or completed flow where the user has formed an opinion. Don’t front-load it on a surface the user has only opened.
- Use the topic Select variant when feedback maps to actionable categories the team triages (Bug, Pricing, Documentation); skip it when the open textarea is enough.
- Don’t use Feedback as a substitute for a support form, a bug report intake, or NPS sampling. Those have dedicated surfaces.

:::zh
- 反馈放在页面，文档或已完成流程的末尾，这时用户才形成了看法。不要放在用户刚打开的界面上。
- 反馈要落到团队会分类处理的类别上时（Bug，Pricing，Documentation）用带主题 Select 的变体，一个开放式多行文本框就够时不用。
- 不要拿 Feedback 代替客服表单，bug 上报入口或 NPS 调研，这些都有专门的界面。
:::

**行为（Behavior）**

:::bi
- Keep the panel collapsed until the user clicks the trigger; auto-opening derails the work that prompted the feedback.
- Pair the metadata variant with non-PII context (route, build ID, plan, viewport) so the team can reproduce the report without a second round-trip.
- Submit closes the panel and returns focus to the trigger. Don’t replace the panel with a generic acknowledgment toast; the close itself is the acknowledgment.

:::zh
- 用户点击触发元素之前，面板保持收起。自动展开会打断促使他们想反馈的那件事。
- 元数据变体配非 PII 的上下文（路由，构建 ID，套餐，视口），团队不用再问一轮就能复现问题。
- 提交后面板关闭，焦点回到触发元素。不要用一条通用确认轻提示替换面板，关闭本身就是确认。
:::

**内容（Content）**

:::bi
- label is Title Case and short. Default Feedback is fine; override only when scoping to a flow: Feedback on Imports, Report a Bug. Don’t end the label with ?.
- copy overrides the prompt header next to the emoji row in sentence case (How did the import go?). Cut please and we’re sorry.
- The textarea placeholder (Your feedback...) is fixed by Geist; don’t try to override it with rich children.

:::zh
- label 用 Title Case 且要短。默认的 Feedback 就够，只有要限定到某个流程时才覆盖（Feedback on Imports，Report a Bug）。标签不要以问号结尾。
- copy 会覆盖表情行旁的提示标题，用句首大写（How did the import go?）。去掉 please 和 we’re sorry。
- 多行文本框的占位文案（Your feedback...）由 Geist 固定，不要试图用富文本 children 覆盖。
:::

:::annotation
反馈组件把“在什么场景问”看得比“问什么”更重：位置错了，问答设计得再细也只会让人烦。
:::

#### Gauge（仪表盘）

:::bi
A circular visual for conveying a percentage.

:::zh
用来表达百分比的圆形视觉元素。
:::

**原站示例里的说明（Notes）**

:::bi
**Arc priority**: When using the gauge to display a ratio, use the equal arc priority to make both arcs are equally sized.

:::zh
**弧形优先级**：用仪表盘显示比例时，arc 优先级设为 equal，让两段弧形一样长。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- A 0–100 ratio against a fixed maximum where the comparison is the point, like quota usage, build cache hit rate, uptime, or billing-period consumption.
- For determinate task progress with a known total (uploads, multi-step setup), use Progress.
- For binary or enumerated state, use Status Dot for deployments or Badge for everything else.

:::zh
- 用来做对比，基数是固定上限的 0–100 比例：配额用量，构建缓存命中率，在线时长，账单周期内的消耗。
- 总量已知的确定性任务进度（上传，多步设置）用 Progress。
- 二元状态或枚举状态，部署用 Status Dot，其他用 Badge。
:::

**行为（Behavior）**

:::bi
- Use arc="equal" for true ratios so 50% reads as exactly half. Use the default primary arc for single-percentage usage where the filled portion is the story.
- Threshold colors should match the same numeric breakpoints used elsewhere in the product (>=80% warning, >=95% error). Don’t invent gauge-only thresholds.
- Pair indeterminate with explanatory copy nearby (Calculating usage…) so the user knows the value is loading, not zero.

:::zh
- 真正的比例用 arc="equal"，这样 50% 看起来正好是一半。对于单一百分比用量，重点是填充了多少的场景，用默认的 primary 弧形。
- 阈值颜色要跟产品里别处用的数值断点一致（>=80% 警告，>=95% 错误），不要为仪表盘另造一套阈值。
- 不确定进度要在旁边配说明文案（Calculating usage…），让用户知道值在加载，而不是零。
:::

**内容（Content）**

:::bi
- Always pair the gauge with an adjacent label or Tooltip naming what the number represents (Build Cache Hit Rate). The gauge alone is not self-describing.
- Don’t put units inside children; the label carries the unit (Uptime · 99.97%). children is reserved for an icon overlay.
- When showValue is on, the rendered number is the value only. Never inject a % or unit string into the prop.

:::zh
- 仪表盘旁边始终要有标签或提示气泡，说明这个数字代表什么（Build Cache Hit Rate）。光一个仪表盘说明不了自己。
- 不要把单位放进 children，单位由标签承担（Uptime · 99.97%）。children 留给图标叠加。
- 打开 showValue 时，渲染出来的只是数值本身。永远不要把 % 或单位字符串塞进这个属性。
:::

**无障碍（Accessibility）**

:::bi
- The component sets role="progressbar" with aria-valuemin, aria-valuemax, and aria-valuenow. Don’t override those.
- The adjacent label is the gauge’s accessible name. Tie it with aria-labelledby on the gauge wrapper so screen readers read “Uptime, 99 percent.”
- Don’t use color to encode the threshold without redundant text; pair the warning tint with copy below or in the Tooltip.

:::zh
- 组件会设置 role="progressbar" 以及 aria-valuemin，aria-valuemax 和 aria-valuenow，不要覆盖它们。
- 旁边的标签就是仪表盘的无障碍名称，用 aria-labelledby 在仪表盘外层把它关联起来，屏幕阅读器会读成 “Uptime, 99 percent”。
- 不要只靠颜色表达阈值，要有额外的文字，警告色调下面或提示气泡里要配文案。
:::

#### Loading Dots（加载圆点）

:::bi
Indicate an action running in the background.

:::zh
表示后台有操作正在进行。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Loading Dots embedded in copy for short indeterminate waits, e.g. Saving`<LoadingDots />` or Building`<LoadingDots />`.
- For buttons, set the loading prop on Button instead of dropping dots inside the label.
- For layout placeholders use Skeleton; for known progress use Progress; for icon-sized indeterminate waits use Spinner.

:::zh
- 短时间且时长不确定的等待可以把 Loading Dots 嵌在文案里，例如 Saving`<LoadingDots />` 或 Building`<LoadingDots />`。
- 按钮上要给 Button 设 loading 属性，而不是往标签里塞圆点。
- 布局占位用 Skeleton，进度已知用 Progress，图标大小且时长不确定的等待用 Spinner。
:::

**行为（Behavior）**

:::bi
- Pass size (number, dot diameter in px) only when the default doesn’t match adjacent type size.
- Keep the trailing label specific to the work in flight (Saving, Deploying, Uploading) so a wait over ~1s still tells the user what’s happening.
- Don’t string Loading Dots after a completed verb (Saved`<LoadingDots />`); the dots imply ongoing work.

:::zh
- 只有默认尺寸和相邻文字尺寸不匹配时才传 size（数字，圆点直径，单位 px）。
- 后面的标签要针对当前进行中的工作（Saving，Deploying，Uploading），这样超过 1 秒左右的等待也能告诉用户正在发生什么。
- 不要把 Loading Dots 接在已完成的动词后面（Saved`<LoadingDots />`），这些圆点意味着工作还在进行。
:::

**无障碍（Accessibility）**

:::bi
- Mark the wrapping span with aria-live="polite" so screen readers pick up the in-progress label without interrupting.
- The dots are decorative; the surrounding text carries meaning, so don’t add aria-label to the component itself.
- Honor prefers-reduced-motion and avoid pairing Loading Dots with another animated indicator on the same line.

:::zh
- 给外层 span 标上 aria-live="polite"，让屏幕阅读器在不打断的情况下读到进行中的标签。
- 圆点是装饰性的，含义由周围文字承担，不要给组件本身加 aria-label。
- 尊重 prefers-reduced-motion，也不要在同一行把 Loading Dots 和另一个动画指示器配在一起。
:::

#### Pie Gauge（饼图仪表盘）

:::bi
An inline icon that displays a percentage as a pie inside a ring.

:::zh
一种行内图标，用环形里的饼图表达百分比。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: PieGauge fills clockwise from the top. Pass a value from 0 to 100. Values outside this range are clamped; non-finite values render as 0.

:::zh
**默认**：PieGauge 从顶部开始顺时针填充。value 传 0 到 100。超出范围的值会被截断，非有限值按 0 渲染。
:::

:::bi
**Sizes**: The default size is 16px. Compact surfaces, such as the build cache summary, use 13px. Use size to change both dimensions, or width and height to set them individually.

:::zh
**尺寸**：默认尺寸是 16px。紧凑界面（比如构建缓存摘要）用 13px。用 size 同时改宽高，或者用 width 和 height 分别设置。
:::

:::bi
**Colors**: The icon inherits the surrounding text color by default. Use color with a Geist color token for a standalone icon.

:::zh
**颜色**：图标默认继承周围的文字颜色。独立使用的图标用 color 配 Geist 颜色令牌。
:::

#### Progress（进度条）

:::bi
Display progress relative to a limit or related to a task.

:::zh
显示相对于某个上限，或与某项任务相关的进度。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Determinate work whose total is knowable, like file uploads, multi-step setup, build steps, or batch deletions.
- For short indeterminate waits (~1–3s), use Spinner; for inline copy like Saving, use Loading Dots.
- For usage against a quota or ratio, use Gauge; the circle reads as health, the bar reads as progress.

:::zh
- 总量可知的确定性工作，比如文件上传，多步设置，构建步骤或批量删除。
- 短且时长不确定的等待（约 1–3 秒）用 Spinner。Saving 这类行内文案用 Loading Dots。
- 用量的配额或比例用 Gauge，圆形读作健康度，条形读作进度。
:::

**行为（Behavior）**

:::bi
- Use max for the real ceiling (max={files.length}), not a hardcoded 100. The component computes the percentage from value / max.
- Threshold colors via dynamic colors should mirror the same breakpoints used elsewhere (warning at the same threshold a quota note fires).
- Use stops for genuine multi-stage work and label the stage next to the bar (Step 2 of 4 · Building); a stop with no label is decorative noise.

:::zh
- max 要用真实上限（max={files.length}），不要写死 100。组件会用 value / max 算出百分比。
- 动态颜色里的阈值颜色要和别处用的断点一致，比如告警和配额提示在同一个阈值触发。
- 真正的多阶段工作用 stops，并在进度条旁标出阶段（Step 2 of 4 · Building）。没有标签的节点只是装饰性的噪音。
:::

**内容（Content）**

:::bi
- Pair the bar with text naming the work and units: Uploading 12 of 30 files, Building · 1.2 GB / 4 GB. The bar alone doesn’t say what’s progressing.
- Don’t append successfully or complete once the bar fills; swap to a completion state (toast, success row, redirect).
- For long operations, name the work in the surrounding copy (Building deployment…) instead of leaving a bare percentage.

:::zh
- 进度条旁配文字，说明在做什么，单位是什么：Uploading 12 of 30 files，Building · 1.2 GB / 4 GB。光一个进度条说明不了在推进什么。
- 进度条填满后不要补一句 successfully 或 complete，换成完成状态（轻提示，成功行，跳转）。
- 长时间操作要在周围文案里点明工作内容（Building deployment…），不要只留一个百分比。
:::

**无障碍（Accessibility）**

:::bi
- Component sets role="progressbar" with aria-valuemin, aria-valuemax, and aria-valuenow; pass an accessible name through aria-label on the wrapper or a sibling `<label>` tied with aria-labelledby.
- Throttle aria-valuenow updates to roughly once a second so screen readers don’t announce every increment of a fast upload.
- Stops accept their own ariaLabel; name each one (Build complete, Tests complete) so the bar is navigable without sight.

:::zh
- 组件会设置 role="progressbar" 以及 aria-valuemin，aria-valuemax 和 aria-valuenow。无障碍名称通过外层元素的 aria-label 传入，也可以用相邻的 `<label>` 配 aria-labelledby 关联。
- aria-valuenow 的更新节流到大约每秒一次，免得快速上传时屏幕阅读器把每一次增量都念出来。
- stops 各自接受 ariaLabel，给每个节点起名（Build complete，Tests complete），看不见的用户也能在进度条上导航。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Progress } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return <Progress value={30} />;
}
```

#### Skeleton（骨架屏）

:::bi
Display a skeleton whilst another component is loading.

:::zh
另一个组件加载期间显示的骨架。
:::

**原站示例里的说明（Notes）**

:::bi
**Wrapping children**: If you do not pass a fixed size, it will be calculated automatically.

:::zh
**包裹子元素**：不传固定尺寸时会自动计算。
:::

:::bi
**Wrapping children with fixed size**: The skeleton will hide when children are not null, but the size is retained.

:::zh
**固定尺寸包裹子元素**：children 不为 null 时骨架会隐藏，但尺寸保留。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Show a Skeleton when async data fills a known layout: table rows, card grids, profile blocks, sidebars.
- For a single in-flight action, use Spinner; for an indeterminate inline wait, use LoadingDots; for known progress, use Progress.
- Don’t use Skeleton as permanent decoration or as a placeholder for empty states. When there’s no data to load, render an EmptyState.

:::zh
- 异步数据填充已知布局时显示骨架屏：表格行，卡片网格，资料块，侧边栏。
- 单个进行中的操作用 Spinner，行内时长不确定的等待用 LoadingDots，进度已知用 Progress。
- 不要把骨架屏当永久装饰，也不要拿它做空状态的占位。没有数据要加载时渲染 EmptyState。
:::

**行为（Behavior）**

:::bi
- Set width and height to match the final content so the layout doesn’t shift when data resolves. A 200×20 block becoming an 80×16 string reads as a glitch.
- Pick pill, rounded, or squared to mirror the eventual element’s shape (avatars pill, buttons and chips rounded, image tiles squared).
- When the skeleton wraps children, keep dimensions stable so the reveal swap doesn’t reflow surrounding content.

:::zh
- width 和 height 要设成最终内容的大小，数据到位后布局才不会跳动。一个 200×20 的块最后变成 80×16 的字符串，看起来就像故障。
- 按最终元素的形状选 pill，rounded 或 squared（头像用 pill，按钮和 chip 用 rounded，图片块用 squared）。
- 骨架屏包裹子元素时保持尺寸稳定，内容换上来时才不会把周围内容挤动。
:::

**无障碍（Accessibility）**

:::bi
- Wrap the loading region in aria-busy="true" and announce completion with aria-live="polite" on the destination container, not the skeleton itself.
- Disable the shimmer with the no animation variant on low-power surfaces and respect prefers-reduced-motion.
- Skeletons are decorative; avoid placing focusable controls inside them while loading.

:::zh
- 加载区域外面包一层 aria-busy="true"，完成时用 aria-live="polite" 在目标容器上播报，而不是在骨架屏本身上。
- 低功耗界面用无动画变体关掉微光效果，并尊重 prefers-reduced-motion。
- 骨架屏是装饰性的，加载时不要在里面放可聚焦控件。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Skeleton } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return <Skeleton width={160} />;
}
```

#### Spinner（加载指示器）

:::bi
Indicate an action running in the background. Unlike the loading dots, this should generally be used to indicate loading feedback in response to a user action, like for buttons, pagination, etc.

:::zh
表示后台有操作正在进行。和 Loading Dots 不同，它一般用于响应用户操作时的加载反馈，比如按钮，分页等。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use a Spinner for indeterminate, single-action waits of roughly one to three seconds: submit buttons, inline icon refresh, row-level retries.
- For submit buttons, set the loading prop on Button so the spinner, sizing, and busy state stay aligned; don’t hand-roll a Spinner inside a button.
- Pick Skeleton when async data fills a known layout, LoadingDots for inline copy, and Progress when total work is known.

:::zh
- 时长无法确定，大约一到三秒的单个操作等待用 Spinner：提交按钮，行内图标刷新，行级重试。
- 提交按钮要在 Button 上设 loading 属性，让加载指示器，尺寸和忙碌状态保持统一，不要自己在按钮里拼一个 Spinner。
- 异步数据填充已知布局时用 Skeleton，行内文案等待用 LoadingDots，总工作量已知时用 Progress。
:::

**行为（Behavior）**

:::bi
- Mount the Spinner only after the action starts. Pre-rendering and toggling visibility leaves a partial rotation visible at idle and reads as jank.
- Pair any wait longer than ~1s with copy that names the work (Verifying…, Deploying…) so the user knows what’s blocking.
- Match the Spinner size to the surrounding type or icon size, not the parent container.

:::zh
- 操作开始后再挂载 Spinner。预先渲染再切换可见性，空闲时会露出转了一半的状态，看起来像卡顿。
- 超过 1 秒左右的等待要配一句说明在做什么的文案（Verifying…，Deploying…），让用户知道卡在哪。
- Spinner 的尺寸要和周围的文字或图标尺寸匹配，而不是跟父容器匹配。
:::

**无障碍（Accessibility）**

:::bi
- Set aria-busy="true" on the element wrapping the in-flight action so screen readers announce the state change.
- Keep the trigger focusable while loading; swapping it for a separate spinner element loses keyboard focus.
- Honor prefers-reduced-motion and skip stacking extra animation around the Spinner.

:::zh
- 在外层包裹进行中操作的元素上设 aria-busy="true"，让屏幕阅读器播报状态变化。
- 加载过程中触发元素要保持可聚焦，把它换成一个单独的加载元素会丢失键盘焦点。
- 尊重 prefers-reduced-motion，也不要在 Spinner 周围再叠额外的动画。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Spinner } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return <Spinner />;
}
```

#### Toast（轻提示）

:::bi
A succinct message that is displayed temporarily.

:::zh
短暂显示的简洁消息。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use a toast for non-blocking acknowledgments of user-initiated actions: Domain added, Project archived, Deployment canceled.
- Don’t use a toast alone for billing failures, permission denials, or build failures the user has to triage. Pair a ≤6-word toast (Build failed) with a persistent row carrying the recovery step and a stable identifier.
- Field-level validation belongs on the Input, not in a toast. Persistent configuration warnings belong in Note or Banner.
- Pick the method by how the user experienced the event, not by HTTP status. A user-canceled deploy is toasts.message('Deployment canceled'), not success. A partial deploy with skipped routes is toasts.warning(...).

:::zh
- 用户发起动作后，不需要阻塞的确认用轻提示：Domain added，Project archived，Deployment canceled。
- 账单失败，权限被拒，或者需要用户排查的构建失败，不要只靠一条轻提示。用六个词以内的轻提示（Build failed）配一条常驻信息，写明恢复步骤和稳定标识。
- 字段级校验放在 Input 上，不放轻提示。常驻的配置警告放在 Note 或 Banner。
- 按用户的体验选方法，而不是按 HTTP 状态码。用户取消的部署用 toasts.message('Deployment canceled')，不是 success。部分部署，有路由被跳过时用 toasts.warning(...)。
:::

**行为（Behavior）**

:::bi
- Default toasts auto-dismiss; pass preserve only when the user must read or act on the message before it disappears.
- Undo snackbars stay on screen for 5–10 seconds and pair the past-tense toast with a single Undo action button.
- Don’t stack toasts to narrate one async flow; emit the success or error toast at the terminal step.

:::zh
- 默认的轻提示会自动消失，只有用户必须读完或操作完才能消失时才传 preserve。
- 撤销提示在屏幕上停留 5–10 秒，过去式的提示文案配一个 Undo 操作按钮。
- 不要用一串轻提示来讲一个异步流程，在最后一步发一条成功或错误提示就行。
:::

**内容（Content）**

:::bi
- One sentence, sentence case, no trailing period when the toast is a single sentence.
- Completion toasts follow {Noun} {past-participle}: Blob deleted, Domain added, Environment variable saved. Never include successfully; the action name implies it.
- Error toasts are two sentences with periods and end with a recovery step: Couldn’t verify domain. Try again. Use Couldn’t for user-state errors and Failed to for system or infra errors; match adjacent shipped copy and don’t flip mid-flow.
- Pair the toast verb 1:1 with the destructive button verb (Delete Project then Project deleted, never Project removed).
- Undo snackbars use the literal label Undo, never Restore, Bring Back, or Cancel. Only use the pattern when the rollback is safe.

:::zh
- 一句话，句首大写，单句轻提示不加句尾句号。
- 完成提示用 “名词加过去分词” 的结构：Blob deleted，Domain added，Environment variable saved。永远不要写 successfully，动作名已经说明成功。
- 错误提示写两句，带句号，最后给出恢复步骤：Couldn’t verify domain. Try again. 用户侧错误用 Couldn’t，系统或基础设施错误用 Failed to。要和相邻的已上线文案保持一致，不要在一个流程中间换说法。
- 轻提示的动词要和破坏性操作按钮的动词一一对应（Delete Project 之后是 Project deleted，绝不用 Project removed）。
- 撤销提示的按钮标签固定用 Undo，绝不用 Restore，Bring Back 或 Cancel。只有回滚安全时才用这种模式。
:::

:::annotation
轻提示最容易被当成状态栏来用，结果一句话里塞进动作，结果，下一步。界面上真正需要常驻的信息应该找自己的位置，而不是挤进会消失的浮层。
:::

**无障碍（Accessibility）**

:::bi
- The toast region announces with aria-live="polite"; reserve assertive for blocking errors that interrupt a flow.
- Don’t put primary navigation inside a toast; transient surfaces vanish before keyboard users can reach them.

:::zh
- 轻提示区域用 aria-live="polite" 播报，assertive 只留给会打断流程的阻塞性错误。
- 不要把主要导航放进轻提示，短暂出现的界面会在键盘用户够到之前消失。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Button, useToasts } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  const toasts = useToasts();

  return (
    <Button
      onClick={(): void => {
        toasts.message({
          text: 'The Evil Rabbit jumped over the fence.',
        });
      }}
    >
      Show Toast
    </Button>
  );
}
```

### 浮层与菜单（Overlays and Menus）

模态框、抽屉、面板、提示气泡、菜单和命令面板。它们共同处理一件事：让临时出现的内容和它背后的页面保持层级关系。

:::animation geist-gallery
group: overlays
:::

#### Command Menu（命令菜单）

:::bi
Launch a set of actions as a full-screen overlay.

:::zh
以全屏浮层的形式启动一组操作。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use CommandMenu for a global, keyboard-first command palette that finds resources and runs actions across the app.
- For a menu opened from a visible trigger on a single resource, use Menu; for right-click on a row, use ContextMenu.
- Group items into pages (Projects, Team Settings) when a single flat list would exceed roughly 30 items or span multiple resource types.

:::zh
- 需要全局而且键盘优先的命令面板，能跨应用查找资源并执行操作时，用 CommandMenu。
- 从看得见的触发入口在单个对象上展开菜单，用 Menu。在列表行上右键，用 ContextMenu。
- 一个扁平列表要是会超过 30 项左右，或者横跨多种资源类型，就把条目分到不同的页面里（Projects，Team Settings）。
:::

**行为（Behavior）**

:::bi
- Bind ⌘K on macOS and Ctrl+K elsewhere. Don’t reuse the binding for any in-page filter input; it’s a global shortcut.
- Open into the root page; preserve the search query when navigating back from a sub-page so the user’s typing isn’t lost.
- Trap focus inside the overlay while it’s open and return focus to the previously active element on close.
- Show a recent or default item set when the input is empty so the menu is useful before typing.

:::zh
- macOS 上绑 ⌘K，其他平台绑 Ctrl+K。这个组合键不要再给页面内的筛选输入框用，它是全局快捷键。
- 打开时进入根页面。从子页面返回时保留搜索词，用户输入的内容不能丢。
- 浮层打开时把焦点锁在内部，关闭时还给之前处于激活状态的元素。
- 输入为空时展示最近使用或默认的条目，让菜单在用户开始输入之前就有用。
:::

**内容（Content）**

:::bi
- `<CommandMenu.Item>` children are Title Case verb phrases (Deploy Project, Invite Team Member). Avoid navigation phrasing like Go to project page; CommandMenu commands act, not browse.
- CommandMenuPage.label is Title Case and names the scope (Projects, Team Settings).
- CommandMenuPage.placeholder is sentence case, action-oriented, and ends with … (Search projects…, Type a command or search…). Bare Search… is wrong because it doesn’t name the scope.
- `<CommandMenu.Group heading>` is Title Case, 1–2 words (Actions, Recent).

:::zh
- `<CommandMenu.Item>` 的子文案用 Title Case 的动词短语（Deploy Project，Invite Team Member）。不要写成 Go to project page 这类导航说法，CommandMenu 里的命令是执行操作，不是浏览。
- CommandMenuPage.label 用 Title Case，点明作用范围（Projects，Team Settings）。
- CommandMenuPage.placeholder 用 sentence case，以动作为导向，并以 … 结尾（Search projects…，Type a command or search…）。只写 Search… 是错的，因为它没有点明作用范围。
- `<CommandMenu.Group heading>` 用 Title Case，一到两个词（Actions，Recent）。
:::

**无障碍（Accessibility）**

:::bi
- Use aria-live="polite" on the result count so screen readers hear how the list narrows as the user types.
- Up/Down arrows move highlight, Enter activates, Escape closes. Backspace at an empty input pops the page stack.
- Display each item’s keybind as a Kbd slot so the shortcut is discoverable to sighted users and announced as a label to screen readers.

:::zh
- 结果数量上用 aria-live="polite"，屏幕阅读器就能在用户输入时听到列表范围如何收窄。
- 上下方向键移动高亮，Enter 激活，Escape 关闭。输入为空时按退格键，返回上一级页面。
- 把每一项的快捷键显示在 Kbd 插槽里，视力正常的用户能直接看到，屏幕阅读器也能把它当作标签念出来。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import {
  CommandMenu,
  Button,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuGroup,
  CommandMenuItem,
} from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [open, setOpen] = useState(false);

  function callback(): void {
    // no op
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
      <CommandMenu open={open} setOpen={setOpen}>
        <CommandMenuInput placeholder="What do you need?" />
        <CommandMenuList>
          <CommandMenuGroup heading="Suggestions">
            <CommandMenuItem callback={callback}>Figma Import</CommandMenuItem>
          </CommandMenuGroup>
          <CommandMenuGroup heading="Commands">
            <CommandMenuItem callback={callback}>
              Import Extension
            </CommandMenuItem>
            <CommandMenuItem callback={callback}>
              Manage Extensions
            </CommandMenuItem>
          </CommandMenuGroup>
          <CommandMenuGroup heading="Collaboration">
            <CommandMenuItem callback={callback}>
              Flags Explorer
            </CommandMenuItem>
          </CommandMenuGroup>
        </CommandMenuList>
      </CommandMenu>
    </>
  );
}
```

#### Context Card（上下文卡片）

:::bi
A floating card that appears on hover or focus. Capable of showing more complex UI than a tooltip.

:::zh
悬停或聚焦时浮起的卡片，能比提示气泡展示更复杂的界面。
:::

**原站示例里的说明（Notes）**

:::bi
**Alignment**: Use align to position the card at the start, center, or end of the trigger.

:::zh
**对齐**：用 align 决定卡片对齐到触发元素的起始，居中还是末尾。
:::

:::bi
**Render prop**: Use render to set the trigger as a custom element, such as a link, button, or badge. By default, it renders a `<div>`.

:::zh
**render 属性**：用 render 把触发元素指定为自定义元素，比如链接，按钮或徽标。默认渲染一个 `<div>`。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Context Card to reveal entity metadata on hover or focus: a user, a deployment, a project, an API key. The trigger is usually a name link or avatar in dense data.
- For a one-line "why" without metadata rows, use Tooltip. For long-form content, edit forms, or persistent navigation, route to a Drawer or a detail page.
- Don’t use Context Card to surface destructive actions; the panel can dismiss on cursor exit before the user commits.

:::zh
- 需要悬停或聚焦时展开对象元数据，用 Context Card：用户，部署，项目，API key。触发元素通常是密集数据里的名字链接或头像。
- 只需要一句“为什么”而不用元数据行时，用 Tooltip。长篇内容，编辑表单或常驻导航，走 Drawer 或详情页。
- 不要用 Context Card 承载危险操作。鼠标一移出面板就可能关掉，用户还没点下去就没了。
:::

**行为（Behavior）**

:::bi
- Context Card opens on hover and keyboard focus and closes on cursor exit or blur. Preserve the ~150ms entry delay so it doesn’t flash on a fast mouse sweep.
- Cap interactive content at one primary action (View Project, Open Settings). More than one CTA reads as a menu and belongs in Menu.
- Don’t nest a Context Card inside a Tooltip or another Context Card; the second layer steals focus and traps keyboard users.

:::zh
- Context Card 在悬停和键盘聚焦时打开，鼠标移出或失焦时关闭。保留约 150ms 的进入延迟，鼠标快速扫过时它才不会一闪而过。
- 可交互内容最多留一个主操作（View Project，Open Settings）。超过一个 CTA 就会被读成菜单，应该放进 Menu。
- 不要把 Context Card 嵌进 Tooltip 或另一个 Context Card 里。第二层会抢走焦点，把键盘用户困住。
:::

**内容（Content）**

:::bi
- Lead with the entity name as a Title Case heading and one identifying line in sentence case underneath (team slug, owner, deployment URL).
- Follow with 2–4 metadata rows of Label: value. Keys are Title Case noun phrases (Last Active, Created, Plan); values follow the same formatting rules as table cells. Use the em-dash character — for unknown values, never N/A or null.
- Don’t restate what the trigger already showed. If the row already renders the deployment URL, don’t repeat it as the first card line.

:::zh
- 开头是 Title Case 的对象名称，下面一行是 sentence case 的识别信息（团队 slug，所有者，部署 URL）。
- 后面跟二到四行元数据，每行是“标签：值”。键用 Title Case 的名词短语（Last Active，Created，Plan），值的格式规则和表格单元格一致。未知值用 em dash 字符，不要写 N/A 或 null。
- 触发元素上已经显示过的信息不要重复。如果行里已经渲染了部署 URL，就不要把它再写成卡片的第一行。
:::

**无障碍（Accessibility）**

:::bi
- The trigger keeps its own accessible name; the card is supplementary and shouldn’t replace it.
- Card content is reachable by keyboard once the trigger has focus; Escape closes the card and returns focus to the trigger.

:::zh
- 触发元素保留自己的无障碍名称。卡片是补充信息，不能取代它。
- 触发元素聚焦后，卡片内容要能用键盘到达。Escape 关闭卡片，并把焦点还给触发元素。
:::

#### Context Menu（右键菜单）

:::bi
A menu for contextual actions, revealed on right click or long press.

:::zh
用来放上下文操作的菜单，右键或长按呼出。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use ContextMenu for power-user shortcuts on right-click or long-press over a row, file, or canvas object.
- ContextMenu must never be the only entry point for an action. Mirror every item in a visible Menu trigger or row button so mouse-only and keyboard-only users have parity.
- For a global command palette, use CommandMenu; for a dropdown opened from a visible trigger, use Menu.

:::zh
- 给熟练用户准备的快捷入口，在列表行，文件或画布对象上右键或长按时，用 ContextMenu。
- ContextMenu 绝不能成为某个操作的唯一入口。每一项都要在看得见的 Menu 触发入口或行内按钮里再出现一次，只用鼠标和只用键盘的用户才能对等。
- 全局命令面板用 CommandMenu。从看得见的触发入口展开的下拉用 Menu。
:::

**行为（Behavior）**

:::bi
- Bind to right-click on desktop and long-press on touch. Suppress the native browser menu only on the trigger area, not the whole page.
- Position the menu at the pointer; if it would overflow the viewport, flip horizontally then vertically before clipping.
- Close on activation, Escape, and outside-click. Don’t close on hover-out.

:::zh
- 桌面端绑右键，触屏绑长按。只在触发区域屏蔽浏览器原生菜单，不要整页屏蔽。
- 菜单出现在指针位置。如果会超出视口，先水平翻转，再垂直翻转，最后才裁切。
- 激活某一项，按 Escape，点击外部时关闭。鼠标移出时不要关闭。
:::

**内容（Content）**

:::bi
- Items follow the same rules as Menu: Title Case Verb + Noun (Open in New Tab, Copy URL, Delete Deployment). Bare verbs are wrong.
- End with … only when activating opens a follow-up dialog (Rename…, Move to Folder…).
- Group destructive items at the bottom with a divider and keep the destructive label Verb + Noun. Delete alone never ships.

:::zh
- 菜单项规则和 Menu 一样：Title Case 的动词加名词（Open in New Tab，Copy URL，Delete Deployment）。光杆动词是错的。
- 只有激活后会再弹一个对话框时，才在末尾加 …（Rename…，Move to Folder…）。
- 危险操作项放到底部并用分隔线隔开，文案保持动词加名词。只有一个 Delete 的写法绝不能上线。
:::

**无障碍（Accessibility）**

:::bi
- Trigger the keyboard menu key (Shift+F10 on Windows/Linux, the menu key, or platform equivalent) to open the same menu without right-click.
- Up/Down arrows move focus, Enter/Space activates, Escape closes and returns focus to the row.
- Don’t bury destructive items behind nested submenus. One level deep keeps keyboard navigation predictable.

:::zh
- 键盘上的菜单键（Windows 和 Linux 上是 Shift+F10，或者菜单键，或者各平台对应的按键）要能呼出同一个菜单，不用右键。
- 上下方向键移动焦点，Enter 或空格键激活，Escape 关闭并把焦点还给那一行。
- 危险操作项不要藏进嵌套子菜单。只留一层，键盘导航才可预测。
:::

#### Destructive Action Modal（危险操作模态框）

:::bi
Confirm destructive actions with a required type-to-confirm gate and an optional irreversibility band.

:::zh
用强制的输入确认门槛和可选的不可逆提示条来确认危险操作。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: A type-to-confirm gate disables submit until the user types the verification phrase exactly. The red striped band at the bottom names what cannot be undone.

:::zh
**默认**：输入确认门槛会让提交按钮一直处于禁用状态，直到用户一字不差地打出验证短语。底部的红色斜纹条会写明哪些东西无法撤销。
:::

:::bi
**Reversible**: Omit irreversibleDescription for actions that can be re-enabled, undone, or rolled back. The type-to-confirm gate stays — the friction is still warranted — but the red band is skipped.

:::zh
**可逆操作**：可以重新启用，可以撤销，也可以回滚的操作，省略 irreversibleDescription。输入确认门槛保留（这点摩擦仍然值得），但不显示红色提示条。
:::

:::bi
**Loading**: loading disables both buttons and shows a spinner on the primary action. Use while the destructive API call is in flight. Caller controls open; don't dismiss the modal from inside.

:::zh
**加载中**：loading 会禁用两个按钮，并在主操作上显示加载指示器。危险操作的 API 请求还没返回时用它。打开状态由调用方控制，不要在模态框内部自己关闭自己。
:::

:::bi
**With error**: Pass error (a string or an Error) to surface an inline error under the input. The modal stays open so the user can retry.

:::zh
**带错误**：传入 error（字符串或 Error 对象），输入框下方就会显示内联错误。模态框保持打开，用户可以重试。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Reach for this over Modal when the action is destructive and warrants friction: delete, rotate, revoke, disconnect, downgrade, disable a security setting. The typed gate forces deliberate intent.
- Use it for reversible destructive actions too, when the consequence is serious enough to warrant a pause — disabling deployment protection, revoking a shared token. Keep the typed gate; drop irreversibleDescription.
- Don't use for routine confirmations (save draft, discard changes, close without saving). The typed gate reads as melodrama when the stakes are low — use a plain Modal instead.

:::zh
- 操作具有破坏性，需要一点摩擦时，用它代替 Modal：删除，轮换，吊销，断开连接，降级，关闭某项安全设置。输入门槛会迫使用户带着明确的意图操作。
- 后果足够严重，值得停一下的可逆破坏性操作也可以用它，比如关闭部署保护或吊销共享令牌。输入门槛保留，irreversibleDescription 去掉。
- 日常确认不要用它（保存草稿，放弃修改，不保存直接关闭）。风险很低时输入门槛显得小题大做，用一个普通的 Modal 就好。
:::

**行为（Behavior）**

:::bi
- The verification input gets focus on open so the user can start typing immediately. Submit stays disabled until the value matches verificationPhrase exactly.
- Enter submits only when the gate is open; it's a no-op otherwise. Cancel, outside-click, and Escape all dismiss.
- loading disables both buttons. The caller owns open — do not self-dismiss from onConfirm. Close the modal after the API settles (success or error), or keep it open on error so the user can retry.
- Pair the post-confirm success toast verb 1:1 with the primary button: Delete Project button, Project deleted toast. Never Project removed.

:::zh
- 打开时焦点落在验证输入框上，用户可以马上开始输入。在值和 verificationPhrase 完全一致之前，提交按钮一直禁用。
- 只有门槛已经打开时，Enter 才会提交，否则按了也没反应。Cancel，点击外部和 Escape 都能关闭。
- loading 会禁用两个按钮。打开状态由调用方持有，不要在 onConfirm 里自己关闭。API 完成（无论成功还是失败）之后再关闭模态框，或者在出错时保持打开让用户重试。
- 确认成功后的轻提示动词要和主按钮一一对应：按钮是 Delete Project，轻提示就是 Project deleted。绝不要写 Project removed。
:::

**内容（Content）**

:::bi
- title is Title Case, Verb + Noun, a statement — never a question. Delete Project, not Delete this project?.
- description is sentence case, names the consequence, and interpolates the specific resource when relevant. `<b>`my-project`</b>` and all its deployments will be permanently deleted. reads stronger than This project and all its deployments will be deleted..
- confirmLabel matches the title 1:1. Never generic (Confirm, OK, Continue), never a bare verb (Delete).
- cancelLabel defaults to Cancel. Override when Cancel is ambiguous, such as Keep Turn Running when the primary action is itself a cancellation.
- verificationPhrase: for entity deletes, type the resource name itself (my-project) and pair with verificationLabel="project name" so the prompt reads To confirm, type the project name "my-project". That's the canonical signal that the user knows which thing they're acting on. Fall back to a lowercase verb phrase (disable vercel authentication) only when there's no entity to name.
- irreversibleDescription names the specific action and resource and ends with cannot be undone. — Deleting my-project cannot be undone. rather than the generic This cannot be undone.. Omit the prop entirely for reversible actions; the prop's absence is the signal, not a falsy value.
- error surfaces the API failure verbatim in Vercel voice: Couldn't save settings. Try again.. Never dump a raw error object.

:::zh
- title 用 Title Case 的动词加名词，是陈述句，不要写成问句。写 Delete Project，不要写成 Delete this project? 这样的问句。
- description 用 sentence case，点明后果，相关时把具体资源写进去。`<b>`my-project`</b>` and all its deployments will be permanently deleted. 读起来就比 This project and all its deployments will be deleted. 更有分量。
- confirmLabel 要和 title 一一对应。不要用笼统的词（Confirm，OK，Continue），也不要用光杆动词（Delete）。
- cancelLabel 默认是 Cancel。Cancel 有歧义时要改，比如主操作本身就是取消动作时，可以写 Keep Turn Running。
- verificationPhrase：删除实体时直接填资源名（my-project），配合 verificationLabel="project name"，提示语就会读成 To confirm, type the project name "my-project"。这是用户清楚自己在操作哪个对象的标准信号。只有在没有实体可命名时，才退回到小写的动词短语（disable vercel authentication）。
- irreversibleDescription 要点明具体操作和资源，并以 cannot be undone. 结尾。写 Deleting my-project cannot be undone. 这样的句子，不要用笼统的 This cannot be undone. 这一句。可逆操作直接省略这个 prop，信号来自 prop 不存在，而不是传一个假值。
- error 会按 Vercel 的语气原样展示 API 失败信息（例如 Couldn't save settings. Try again.），绝不直接暴露原始错误对象。
:::

**无障碍（Accessibility）**

:::bi
- The verification input is associated with its prompt via aria-labelledby + htmlFor. Screen readers announce the full prompt (To confirm, type "delete my-project") on focus.
- The prompt label and the input set translate="no" and class="notranslate". Browser translation otherwise rewrites the phrase, or the text the user just typed, and the exact-match gate never opens. The phrase and the input also set lang="zxx" and dir="ltr" so the identifier stays a non-linguistic left-to-right string.
- The Warning icon in the irreversibility band is aria-hidden; the sentence carries the meaning so nothing is announced twice.
- Focus stays inside the modal across an error transition so the user can retry without losing context. After success, return focus to the trigger.

:::zh
- 验证输入框通过 aria-labelledby 加 htmlFor 和它的提示语关联起来。聚焦时屏幕阅读器会念出完整提示语（To confirm, type "delete my-project"）。
- 提示语的 label 和输入框都设置 translate="no" 和 class="notranslate"。否则浏览器翻译会把短语改掉，或者改掉用户刚输入的内容，精确匹配的门槛就永远打不开。短语和输入框还要设置 lang="zxx" 和 dir="ltr"，让这段标识符保持为非语言的从左到右字符串。
- 不可逆提示条里的 Warning 图标是 aria-hidden 的。含义由那句话承担，同一信息不会被念两遍。
- 出错切换时焦点留在模态框内部，用户重试时不会丢失上下文。成功之后把焦点还给触发元素。
:::

:::annotation
精确匹配的确认门槛最怕浏览器翻译插手：提示语或用户输入被改写一个字，门槛就永远打不开。translate="no" 和 lang="zxx" 不是锦上添花，而是这个组件能不能用的前提。
:::

#### Destructive Confirmation Input（危险操作确认输入框）

:::bi
Type-to-confirm field for destructive actions that keeps the verification phrase exactly as written.

:::zh
用于危险操作的输入确认字段，验证短语按原样保留。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: Renders the To confirm, type … prompt above an input. The verification phrase is shown verbatim: the prompt is never title cased, and neither the prompt nor the typed value is rewritten by browser translation, autocorrect, autocapitalization, spellcheck, or autocomplete.

:::zh
**默认**：在输入框上方渲染 To confirm, type … 提示语。验证短语原样展示：提示语永远不做 Title Case 处理，提示语和用户输入的值也不会被浏览器翻译，自动更正，自动大写，拼写检查或自动补全改写。
:::

:::bi
**With error**: The caller owns the value and the mismatch rule. Pass error to surface a message below the input.

:::zh
**带错误**：值和是否匹配的判断都由调用方负责。传入 error，输入框下方就会显示提示信息。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use DestructiveActionModal when the confirmation fits its fixed layout. Reach for this component only when a destructive flow needs content that modal can't render, such as a list of affected resources, a refund breakdown, or a sheet instead of a modal.
- Use it for every type-to-confirm gate. Don't hand-roll the prompt with an Input label: Label title cases its text, which changes the phrase the user is asked to type.

:::zh
- 确认内容能放进它固定的布局时，用 DestructiveActionModal。只有当危险操作流程需要模态框渲染不了的内容时，才单独用这个组件，比如受影响资源的列表，退款明细，或者要用面板而不是模态框。
- 所有输入确认门槛都应该用它。不要拿 Input 的 label 自己拼提示语：Label 会把文字套成 Title Case，用户被要求输入的短语就变了。
:::

**行为（Behavior）**

:::bi
- The caller decides when the gate opens. Compare the value to verificationPhrase with === and keep the destructive button disabled until it matches.
- The ref is forwarded to the `<input>`, so it works with react-hook-form's register and with manual focus management.

:::zh
- 门槛什么时候打开由调用方决定。用 === 把当前值和 verificationPhrase 比较，匹配之前危险操作按钮一直保持禁用。
- ref 会转发到 `<input>` 上，所以它能配合 react-hook-form 的 register 用，也能手动管理焦点。
:::

**内容（Content）**

:::bi
- verificationPhrase: for entity deletes, use the resource name itself (my-project) and pair it with verificationLabel="project name" so the prompt reads To confirm, type the project name "my-project". Fall back to a lowercase verb phrase (disable vercel authentication) only when there's no entity to name.
- Name the noun in mismatch errors: The project name must match exactly..

:::zh
- verificationPhrase：删除实体时直接填资源名（my-project），配合 verificationLabel="project name"，提示语就会读成 To confirm, type the project name "my-project"。只有在没有实体可命名时，才退回到小写的动词短语（disable vercel authentication）。
- 不匹配的错误信息要把名词说清楚，例如 The project name must match exactly. 这一句。
:::

**无障碍（Accessibility）**

:::bi
- The input is associated with its prompt via aria-labelledby and htmlFor, so screen readers announce the full prompt, including the phrase, on focus. Don't pass a separate aria-label.

:::zh
- 输入框通过 aria-labelledby 和 htmlFor 与提示语关联，屏幕阅读器聚焦时会念出包括短语在内的完整提示。不要另外传一个 aria-label。
:::

#### Drawer（抽屉）

:::bi
Display content in a separate view from the existing context.

:::zh
在独立于当前上下文的视图里展示内容。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: Only use a Drawer on small viewports. Shown here at any viewport for demonstration.

:::zh
**默认**：只在窄视口下用 Drawer。这里为了演示，在任何视口宽度下都展示。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Drawer renders as a bottom sheet on small viewports only. On desktop render Modal (or Sheet for lateral context) directly instead of forcing Drawer.
- Don’t use Drawer to confirm destructive actions. The lack of a fully blocking dim weakens the severity signal that delete and revoke flows need; route to Modal.
- A Drawer is good for short focused mobile actions: a single form, a filter sheet, a primary CTA paired with Cancel.

:::zh
- Drawer 只在窄视口下渲染成底部面板。桌面端直接渲染 Modal（需要侧向上下文时用 Sheet），不要硬套 Drawer。
- 不要用 Drawer 确认危险操作。它没有完全遮住页面的压暗层，会削弱删除和吊销流程需要的严重性提示，这类确认请改用 Modal。
- Drawer 适合移动端短小且聚焦的操作：单个表单，筛选面板，一个主 CTA 配一个 Cancel。
:::

**行为（Behavior）**

:::bi
- Tap-outside and swipe-down dismiss by default; preserve both unless the form has dirty input.
- Use verticalScroll so the drawer body scrolls inside its frame instead of the page behind it.
- Cap content height with customHeight only when the default height clips the primary action; the action and Cancel must stay above the fold.

:::zh
- 默认情况下点外部和下滑都能关闭，除非表单里有未保存的输入，否则这两个手势都要保留。
- 用 verticalScroll 让抽屉正文在自己的框架内滚动，而不是滚动后面那一页。
- 只有当默认高度把主操作裁掉时才用 customHeight 限制内容高度。主操作和 Cancel 必须留在首屏内。
:::

**内容（Content）**

:::bi
- DrawerTitle is a Title Case statement that names the entity (Deployment Details, Filter Logs).
- Body is sentence case prose. One primary Verb + Noun button and a literal Cancel; don’t cram a destructive cascade copy into the smaller frame.
- Don’t restate the page heading as the drawer title; name what this view does.

:::zh
- DrawerTitle 用 Title Case 的陈述句，点明具体对象（Deployment Details，Filter Logs）。
- 正文是 sentence case 的普通段落。一个动词加名词的主按钮，再加一个字面量为 Cancel 的按钮。不要把危险操作的连带后果说明硬塞进这个更小的框架里。
- 不要把页面标题照搬成抽屉标题，要说明这个视图是做什么的。
:::

**无障碍（Accessibility）**

:::bi
- Trap focus inside the drawer while open and return focus to the trigger on close.
- Escape closes the drawer; honor the system back gesture on mobile so users can dismiss without reaching for the close affordance.
- Lock body scroll on open and restore it on close so iOS rubber-band scroll doesn’t leak through.

:::zh
- 抽屉打开时把焦点锁在内部，关闭时还给触发元素。
- Escape 可以关闭抽屉，移动端要响应系统返回手势，用户不用特意去够关闭按钮。
- 打开时锁住页面滚动，关闭时恢复，避免 iOS 的橡皮筋回弹效果透到后面。
:::

#### Menu（菜单）

:::bi
Dropdown menu opened via button. Supports typeahead and keyboard navigation.

:::zh
通过按钮打开的下拉菜单。支持键入跳转和键盘导航。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: Menu extends the Button component.

:::zh
**默认**：Menu 继承自 Button 组件。
:::

:::bi
**Locked items**: Use MenuItemLocked to indicate an action that requires additional permissions. The item is rendered as disabled with a lock icon suffix.

:::zh
**锁定项**：某个操作需要额外权限时，用 MenuItemLocked 表示。这一项会渲染成禁用状态，并在末尾带一个锁图标。
:::

:::bi
**Custom trigger**: The trigger is still wrapped by an unstyled button.

:::zh
**自定义触发元素**：触发元素仍然被一个去掉样式的 button 包着。
:::

:::bi
**Prefix and suffix**: The trigger is still wrapped by an unstyled button.

:::zh
**前缀和后缀**：触发元素仍然被一个去掉样式的 button 包着。
:::

:::bi
**Menu position**: The position will automatically adapt based on the window bounds.

:::zh
**菜单位置**：位置会根据窗口边界自动适配。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Menu for a discoverable trigger that opens a list of actions on a single resource (a dots menu on a row, a dropdown on a primary entity).
- For right-click or long-press on a row, use ContextMenu. For global commands behind ⌘K, use CommandMenu. For two related primary actions, use a split button rather than burying the secondary action.
- Cap a Menu around 10 items. Past that, group with MenuSection or move secondary actions to a settings page.

:::zh
- 需要在单个对象上展开一组操作，而且触发入口是看得见的，就用 Menu（列表行尾的三点菜单，主对象上的下拉按钮）。
- 在列表行上右键或长按，用 ContextMenu。要放 ⌘K 后面的全局命令，用 CommandMenu。有两个相关的主操作时，用 split button，不要把次要操作藏起来。
- 一个 Menu 控制在 10 项左右。超过之后用 MenuSection 分组，或者把次要操作挪到设置页。
:::

**行为（Behavior）**

:::bi
- Open on click, not hover; hover-open menus collide with screen readers and trackpad scrolls.
- Position auto-flips based on window bounds; don’t hardcode a side that clips on narrow viewports.
- Close on item activation, Escape, and outside-click. Don’t auto-close on a hover-out.
- Use MenuItemLocked for permission-gated actions so the lock icon and disabled state explain why the row is inert.

:::zh
- 点击打开，不要在悬停时打开。悬停展开的菜单会和屏幕阅读器以及触控板滚动打架。
- 位置会按窗口边界自动翻转，不要写死一侧，否则窄视口下会被裁掉。
- 激活某一项，按 Escape，点击外部时关闭。鼠标移出去时不要自动关闭。
- 受权限限制的操作改用 MenuItemLocked，锁图标和禁用状态就能说明这一行为什么点不动。
:::

**内容（Content）**

:::bi
- Item children are Title Case Verb + Noun (Rename Project, Duplicate Deployment). Bare verbs like Rename or Edit are wrong outside obvious single-object context.
- End an item with … only when activating it opens a follow-up dialog (Rename…, Transfer to Team…).
- Group destructive items at the bottom, separated by a divider, and keep the destructive copy as Verb + Noun (Delete Project, never bare Delete).
- Section headers (MenuSection title) are Title Case, 1–2 words (Workspace, Recent Projects).

:::zh
- 菜单项文案用 Title Case 的动词加名词（Rename Project，Duplicate Deployment）。除非上下文里对象非常明确，否则只写 Rename 或 Edit 这种光杆动词是错的。
- 只有点击后会再弹一个对话框时，才在菜单项末尾加 …（Rename…，Transfer to Team…）。
- 危险操作项集中在底部，用分隔线隔开，文案保持动词加名词（Delete Project，不要只写 Delete）。
- 分组标题（MenuSection 的 title）用 Title Case，一到两个词（Workspace，Recent Projects）。
:::

:::annotation
这一页的文案规则有一半建立在英文大小写上。中文产品里能直接沿用的只有两条：动词加名词的写法，以及把危险操作项沉到底部。
:::

**无障碍（Accessibility）**

:::bi
- Up/Down arrows move focus through items, Home/End jump to first/last, Enter or Space activates.
- Typeahead jumps to the next item whose label starts with the typed character; keep the visible label first so typeahead matches what the user sees.
- Return focus to the trigger on close so keyboard users keep their place in the row.

:::zh
- 上下方向键在各项之间移动焦点，Home 和 End 跳到第一项和最后一项，Enter 或空格键激活。
- 键入跳转会跳到标签以所输入字符开头的下一项。把可见标签放在最前面，键入跳转才能和用户看到的一致。
- 关闭时把焦点还给触发元素，键盘用户在列表行里的位置就不会丢。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import {
  Menu,
  MenuButton,
  MenuContainer,
  MenuItem,
} from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <MenuContainer>
      <MenuButton>Actions</MenuButton>
      <Menu width={200}>
        <MenuItem onClick={() => undefined}>One</MenuItem>
        <MenuItem onClick={() => undefined}>Two</MenuItem>
        <MenuItem onClick={() => undefined}>Three</MenuItem>
        <MenuItem href="https://vercel.com">Test for Link</MenuItem>
        <MenuItem onClick={() => undefined} type="error">
          Delete
        </MenuItem>
      </Menu>
    </MenuContainer>
  );
}
```

#### Modal（模态框）

:::bi
Display popup content that requires attention or provides additional information.

:::zh
显示需要用户关注或提供补充信息的弹层内容。
:::

**原站示例里的说明（Notes）**

:::bi
**Combobox focus**: Focus should be trapped on the Combobox input, but the list of options should not jarringly open on modal open.

:::zh
**Combobox 焦点**：焦点应该锁在 Combobox 输入框上，但选项列表不应该在模态框打开时突兀地展开。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Modal when a decision must block the rest of the page. For persistent associated context where the underlying page stays readable, use Sheet on desktop or Drawer on mobile.
- Confirm destructive actions in a Modal. Drawer and Sheet don’t fully dim the page, so they read as too soft for a delete or revoke.
- Skip Modal for routine create flows that have a dedicated page; route to the page instead.

:::zh
- 需要某个决定打断整页操作时用 Modal。如果只是要展示与当前内容持续相关的信息，同时底层页面仍然可读，桌面端用 Sheet，移动端用 Drawer。
- 危险操作要在 Modal 里确认。Drawer 和 Sheet 不会把整页压暗，用它们做删除或吊销会显得太轻。
- 常规的创建流程如果有独立页面，就不要用 Modal，直接跳到那个页面。
:::

**行为（Behavior）**

:::bi
- Default focus to Cancel on any destructive Modal. Enter must never trigger the destructive action without a typed confirmation.
- Allow Escape and outside-click to dismiss non-destructive Modals; gate dismissal on destructive ones with unsaved input.
- Trap focus inside the Modal while it’s open and return focus to the trigger after close. Restore body scroll on the same tick the Modal unmounts.
- For high-stakes destructive actions (delete production resource, rotate signing key, downgrade plan), gate the primary button on a typed match of the resource name.

:::zh
- 任何危险操作的 Modal，初始焦点都放在 Cancel 上。没有输入确认文本，Enter 绝不能触发危险操作。
- 非危险的 Modal 允许用 Escape 和点击外部关闭。危险操作的 Modal 里如果有未保存的输入，关闭动作要先做确认。
- Modal 打开时把焦点锁在内部，关闭后把焦点还给触发元素。在 Modal 卸载的同一个 tick 恢复页面滚动。
- 影响大的危险操作（删除生产资源，轮换签名密钥，降级套餐）要求输入的资源名精确匹配之后，主按钮才可用。
:::

**内容（Content）**

:::bi
- Modal.Title is a Title Case statement, never a question. Transfer Project is correct; Transfer Project? is wrong.
- Modal.P body is sentence case, 1–3 sentences. State the consequence first, then any cascade.
- Primary button is Verb + Noun and matches the title verb (Transfer Project title pairs with Transfer Project button). Never Confirm, OK, or a bare verb on a destructive primary.
- Cancel literal stays Cancel. Acknowledgment-only Modals (after a key reveal, after a one-time-show) use Done, never OK or Close.
- Close irreversible bodies with This cannot be undone.; close cascade-only bodies with Some effects cannot be undone.. Don’t claim full irreversibility for a partial cascade.
- Pair the success toast verb 1:1 with the primary button: Delete Project button, Project deleted toast.

:::zh
- Modal.Title 用 Title Case 的陈述句，不要写成问句。Transfer Project 是对的，Transfer Project? 是错的。
- Modal.P 正文用 sentence case，一到三句。先说后果，再说连带影响。
- 主按钮用动词加名词，并且和标题里的动词一致（标题是 Transfer Project，按钮也写 Transfer Project）。危险操作的主按钮不要写 Confirm 或 OK，也不要用光秃秃一个动词。
- Cancel 这个字面量就保持 Cancel。只用来让用户确认知悉的 Modal（比如密钥展示之后，或者一次性展示之后）用 Done，不要用 OK 或 Close。
- 完全不可逆的正文用 This cannot be undone. 收尾，只有连带影响的正文用 Some effects cannot be undone. 收尾。部分级联的后果不要写成完全不可逆。
- 成功轻提示里的动词要和主按钮一一对应：按钮是 Delete Project，轻提示就是 Project deleted。
:::

:::annotation
原文反复用 Title Case 和 sentence case 约束文案格式：前者每个实词首字母大写，后者只有句首字母大写。中文没有大小写，译文保留这两个英文术语，规则本身仍按英文原文理解。
:::

**无障碍（Accessibility）**

:::bi
- Set aria-labelledby to the Modal.Title id so screen readers announce the title on open.
- Keep the Cancel button literally Cancel so screen-reader users hear a stable dismissal label across destructive flows.
- After an error inside the Modal, keep focus inside so the user can retry; after success, return focus to the trigger.

:::zh
- 把 aria-labelledby 指向 Modal.Title 的 id，屏幕阅读器在模态框打开时就会念出标题。
- Cancel 按钮的字面量保持 Cancel，这样使用屏幕阅读器的人在整套危险操作流程里听到的都是同一个关闭标签。
- Modal 内部报错后，焦点继续留在内部，方便用户重试。操作成功后，把焦点还给触发元素。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import {
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalTitle,
  ModalSubtitle,
  ModalActions,
  ModalAction,
} from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="small">
        Open Modal
      </Button>

      <Modal active={open} onClickOutside={() => setOpen(false)}>
        <ModalBody>
          <ModalHeader>
            <ModalTitle>Create Token</ModalTitle>
            <ModalSubtitle>
              Enter a unique name for your token to differentiate it from other
              tokens and then select the scope.
            </ModalSubtitle>
          </ModalHeader>

          <p className="text-copy-14">
            Some content contained within the modal.
          </p>
        </ModalBody>

        <ModalActions>
          <ModalAction onClick={() => setOpen(false)} variant="secondary">
            Cancel
          </ModalAction>

          <ModalAction onClick={() => setOpen(false)}>Submit</ModalAction>
        </ModalActions>
      </Modal>
    </>
  );
}
```

#### Sheet（面板）

:::bi
Display content in a side panel that slides in from the edge of the screen.

:::zh
在从屏幕边缘滑入的侧边面板里展示内容。
:::

**原站示例里的说明（Notes）**

:::bi
**Default**: In combination with styles overrides most commonly used in front apps.

:::zh
**默认**：搭配前端应用里最常见的样式覆盖一起使用。
:::

:::bi
**With Side**: Use the side prop to control which edge the sheet slides in from.

:::zh
**带 side 参数**：用 side 属性控制面板从哪条边滑入。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Sheet for persistent associated context like deployment details, log row inspection, or a member profile, where the underlying page stays useful.
- For a blocking decision, use Modal. For a mobile-only bottom sheet, use Drawer.
- Don’t use Sheet to confirm destructive actions. The default modal=false keeps the page interactive, which weakens severity for a delete or revoke.

:::zh
- 需要持续展示关联信息时用 Sheet，比如部署详情，单条日志的查看，成员资料，这类场景下底层页面仍然有用。
- 需要打断用户做决定时用 Modal。只在移动端出现的底部面板用 Drawer。
- 不要用 Sheet 确认危险操作。它默认 modal=false，页面仍然可以交互，会削弱删除或吊销的严重感。
:::

**行为（Behavior）**

:::bi
- Sheet defaults to modal=false so toasts and other high-z elements stay reachable. Keep that default unless the sheet owns the screen.
- Pick side from the trigger location: a row inspector slides from right, a global filter from left. Don’t change sides mid-session.
- Outside-click does not auto-close, so always render an explicit close affordance and honor Escape.

:::zh
- Sheet 默认 modal=false，这样轻提示和其他高 z-index 元素仍然可达。除非面板占满整屏，否则保留这个默认值。
- 根据触发位置选 side：行内查看器从右侧滑入，全局筛选用左侧。不要在会话中途换边。
- 点击外部不会自动关闭，所以一定要渲染明确的关闭入口，并且响应 Escape。
:::

**内容（Content）**

:::bi
- Title is Title Case and names the entity (Deployment Details, Member Profile), not the page action.
- Body is read-mostly: sentence case prose with Title Case sub-headings. Action buttons are optional; when present, follow Verb + Noun.
- Don’t duplicate the page header inside the sheet; the sheet is the detail layer.

:::zh
- 标题用 Title Case，点明具体对象（Deployment Details，Member Profile），不要写成页面动作。
- 正文以阅读为主：sentence case 的段落，配 Title Case 的小标题。操作按钮是可选的，有的话按动词加名词来写。
- 不要在面板里重复页面头部，面板是详情层。
:::

**无障碍（Accessibility）**

:::bi
- Trap focus inside the sheet while it’s open and return focus to the trigger row on close so keyboard users keep their place in the list.
- Provide a visible close button labeled Close (or an icon button with aria-label="Close") since clicking outside doesn’t dismiss.
- Announce the sheet with aria-labelledby pointing at the title; pair it with aria-describedby only when the body is short and load-bearing.

:::zh
- 面板打开时把焦点锁在内部，关闭时还给触发的那一行，键盘用户就不会在列表里丢失位置。
- 因为点击外部不会关闭，所以要提供一个看得见的关闭按钮，文字是 Close（或者一个带 aria-label="Close" 的图标按钮）。
- 用 aria-labelledby 指向标题，让屏幕阅读器念出面板名称。只有当正文很短且承担关键信息时，才再配一个 aria-describedby。
:::

#### Tooltip（提示气泡）

:::bi
A floating label that appears on hover or focus to provide additional context about an element.

:::zh
悬停或聚焦时浮起的标签，用来补充说明某个元素。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use a Tooltip to explain why something exists, not what it is. The visible label names the thing; the tooltip adds the constraint, scope, or limit.
- For an entity preview with metadata rows (avatar, identifier, 2–4 facts, optional action), use Context Card. For long-form content or actions that need persistence, route to a Drawer or page navigation.
- Use lifecycle Tooltips (Alpha, Experimental, Beta, Early Access) to name the limits that apply: API stability, SLA, support, pricing, retention.

:::zh
- Tooltip 用来解释某个东西为什么存在，而不是它是什么。可见的标签已经说明它是什么，提示气泡补充的是约束，范围或限制。
- 需要带元数据行的对象预览（头像，标识，二到四条事实，可选操作）时用 Context Card。长篇内容或者需要常驻的操作，走 Drawer 或页面跳转。
- 生命周期类的 Tooltip（Alpha，Experimental，Beta，Early Access）用来点名适用的限制：API 稳定性，SLA，支持，定价，数据保留。
:::

**行为（Behavior）**

:::bi
- Tooltips open on hover and on keyboard focus. Keep the default ~150ms entry delay so the tooltip doesn’t flicker on a sweeping mouse.
- Don’t wrap a labelled Input in a Tooltip. The trigger lands on the `<label>`, not the field, and the tooltip text becomes a second invisible label for screen readers. Put help on a sibling icon button.
- Keep primary actions outside the Tooltip; touch users can’t reach a hover-revealed control.

:::zh
- Tooltip 在悬停和键盘聚焦时打开。保留默认约 150ms 的进入延迟，这样鼠标快速扫过时不会一闪一闪。
- 不要给已经有标签的 Input 套 Tooltip。触发点会落在 `<label>` 上而不是输入框本身，提示文字还会变成屏幕阅读器读到的第二个隐形标签。帮助信息放到旁边的图标按钮上。
- 主操作不要放在 Tooltip 里，触屏用户根本够不到只有悬停才出现的控件。
:::

:::annotation
把帮助信息挪到输入框旁边的图标按钮上，这个做法在中文产品里不常见。但它同时解决了两个问题：提示气泡不抢输入框的标签语义，触屏用户也点得到。
:::

**内容（Content）**

:::bi
- One sentence or fragment in text. Sentence case, no period for a single fragment.
- Skip tooltips that repeat the visible label (text="Rate Limit" on a Rate Limit button) or describe the interaction (text="Click to override").
- Lifecycle Tooltips follow {Label}: {one-line meaning}. {Specific limit}. For a paid Beta feature, combine the lifecycle and pricing in one Tooltip rather than stacking two badges.

:::zh
- 一句话或一个短语。用 sentence case，单个短语结尾不加句号。
- 重复可见标签的提示气泡不要写（Rate Limit 按钮上再写 text="Rate Limit"），描述交互动作的也不要写（text="Click to override"）。
- 生命周期类 Tooltip 照这个格式写：{标签}：{一句话含义}。{具体限制}。付费的 Beta 功能把生命周期和定价合到同一个 Tooltip 里，不要叠两个徽标。
:::

**无障碍（Accessibility）**

:::bi
- An icon-only trigger needs an aria-label that names the action; the Tooltip body adds context, it doesn’t replace the label.
- Escape closes the tooltip and returns focus to the trigger.

:::zh
- 只有图标的触发元素需要 aria-label 说明动作。Tooltip 正文是补充上下文，不能代替这个标签。
- Escape 关闭提示气泡，并把焦点还给触发元素。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Tooltip } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex relative min-w-px max-w-full flex-row flex-wrap flex-1">
      <div className="flex relative min-w-px max-w-full flex-col justify-center items-center flex-1">
        <Tooltip text="The Evil Rabbit Jumped over the Fence">
          <span>Top</span>
        </Tooltip>
      </div>

      <div className="flex relative min-w-px max-w-full flex-col justify-center items-center flex-1">
        <Tooltip position="bottom" text="The Evil Rabbit Jumped over the Fence">
          <span>Bottom</span>
        </Tooltip>
      </div>

      <div className="flex relative min-w-px max-w-full flex-col justify-center items-center flex-1">
        <Tooltip position="left" text="The Evil Rabbit Jumped over the Fence">
          <span>Left</span>
        </Tooltip>
      </div>

      <div className="flex relative min-w-px max-w-full flex-col justify-center items-center flex-1">
        <Tooltip position="right" text="The Evil Rabbit Jumped over the Fence">
          <span>Right</span>
        </Tooltip>
      </div>
    </div>
  );
}
```

### 容器与场景（Containers and Scenes）

标签页、面包屑、分页、日历、折叠面板、文件树、主题切换器，还有浏览器、手机、书本这些把内容装进具体场景的容器。

:::animation geist-gallery
group: containers
:::

#### Book（书本）

:::bi
A responsive book component.

:::zh
一个响应式的书本组件。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Book for marketing pages, docs landing covers, and changelog hero shots where content needs the metaphor of a labeled volume.
- For in-product cards and dashboard tiles, use Card; Book is too decorative for repeated UI rows.
- Pick simple when the title alone carries the design and stripe when an icon or color stripe adds hierarchy or category cues.

:::zh
- 营销页面，文档落地页封面，以及更新日志的首图，在需要“一本有书名的书”这个隐喻时，用 Book。
- 产品内的卡片和仪表盘磁贴用 Card。Book 装饰性太强，不适合在界面里成排重复。
- 标题本身就能撑起设计时选 simple，图标或色条能补充层级或分类线索时选 stripe。
:::

**行为（Behavior）**

:::bi
- Set the color prop from design tokens (var(--ds-blue-700), var(--ds-amber-600)) instead of raw hex so the cover follows light/dark theme tokens.
- Reserve the textured variant for hero shots; on a row of multiple Books the texture competes with the labels.
- Use the responsive width prop to keep covers proportional across breakpoints; squashing aspect ratio breaks the metaphor.

:::zh
- color 属性用设计令牌（var(--ds-blue-700)，var(--ds-amber-600)）而不是原始色值，封面才能跟随亮暗主题令牌。
- textured 变体留给首图。一排摆好几本书时，材质会和书名抢注意力。
- 用响应式的 width 属性让封面在各个断点下保持比例。把宽高比压扁，书的隐喻就没了。
:::

**无障碍（Accessibility）**

:::bi
- Treat the cover as decorative chrome and surface the title via the underlying heading element so screen readers don’t double-announce.
- Inner illustrations need alt text only when they communicate something the title doesn’t; otherwise mark them aria-hidden.
- When the Book wraps a link, put the focus ring on the link itself, not the cover, so keyboard users see the actual hit target.

:::zh
- 把封面当作装饰性外框，标题通过底层的标题元素呈现，屏幕阅读器才不会重复播报。
- 内部插画只有在传达标题没有的信息时才需要 alt 文本，否则标成 aria-hidden。
- Book 包住一个链接时，聚焦轮廓放在链接本身而不是封面上，键盘用户才能看到真正的点击目标。
:::

#### Breadcrumbs（面包屑）

:::bi
Navigation aid that shows the user's location within a site's hierarchy, with text and menu variants.

:::zh
导航辅助，显示用户在当前站点层级中的位置，有文本和菜单两种形态。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Breadcrumb, BreadcrumbItem } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb type="text">
        <BreadcrumbItem>Home</BreadcrumbItem>
        <BreadcrumbItem>Dashboard</BreadcrumbItem>
        <BreadcrumbItem>Overview</BreadcrumbItem>
      </Breadcrumb>
      <Breadcrumb type="menu">
        <BreadcrumbItem>Home</BreadcrumbItem>
        <BreadcrumbItem>Dashboard</BreadcrumbItem>
        <BreadcrumbItem>Overview</BreadcrumbItem>
      </Breadcrumb>
    </div>
  );
}
```

#### Browser（浏览器）

:::bi
The Browser component lets you showcase website screenshots or any other content within a realistic browser-style frame.

:::zh
Browser 组件可以把网站截图或其他内容放进一个逼真的浏览器外框里展示。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Browser as marketing chrome around screenshots, demos, and recordings shown on landing pages, docs, and changelog posts.
- Don’t render real product UI inside a Browser frame; the chrome implies a screenshot, not a live surface.
- Compose from the building blocks (Dots, Controls, address bar) when the canned Browser shape doesn’t fit the layout; don’t fork the chrome.

:::zh
- Browser 适合给落地页和文档里的截图，以及更新日志文章里的演示和录屏做营销外框。
- 不要在 Browser 外框里渲染真实的产品界面。这个外框暗示的是一张截图，不是可交互的界面。
- 现成的 Browser 形态不适合布局时，用它的基础组件（Dots，Controls，地址栏）自己组合，不要去 fork 这套外框。
:::

**行为（Behavior）**

:::bi
- Match the variant to the surrounding theme: light chrome on light backgrounds, dark chrome on dark, so the frame doesn’t fight the page.
- For long URLs, use Middle Truncate inside the address bar so the host and path tail both remain visible.
- Lock the inner image aspect ratio so the chrome doesn’t reflow when an image is missing or slow to load.

:::zh
- variant 要和周围主题一致：亮色背景用亮色外框，暗色背景用暗色外框，外框才不会和页面打架。
- URL 很长时，在地址栏里用 Middle Truncate，域名和路径尾部都能保留。
- 锁住内部图片的宽高比，图片缺失或加载慢时外框不会重排。
:::

**无障碍（Accessibility）**

:::bi
- The browser chrome is decorative and should carry aria-hidden="true"; meaning lives on the inner image or video.
- Give the inner screenshot meaningful alt text describing what the user is seeing, not “browser screenshot”.
- Don’t add focusable dot controls or back/forward buttons; the chrome is a frame, and unreachable controls confuse keyboard users.

:::zh
- 浏览器外框是装饰，应该带 aria-hidden="true"。语义由里面的图片或视频承担。
- 给里面的截图写有意义的 alt 文本，描述用户看到的内容，而不是写“浏览器截图”。
- 不要加可聚焦的圆点控件或前进后退按钮。外框只是个框，点不到的控件会让键盘用户困惑。
:::

#### Calendar（日历）

:::bi
Displays a calendar from which users can select a date or range of dates.

:::zh
展示日历，用户可以从中选择某一天或一个日期范围。
:::

:::annotation
原站的日历示例是客户端组件，服务端渲染出来的快照是空的。站内另外用 Svelte 重做了一个可交互的月视图，就在上面的画廊里，可以切月份、点日期。
:::

**原站示例里的说明（Notes）**

:::bi
**Horizontal Layout**: Use horizontalLayout to align content horizontally within the calendar popover.

:::zh
**水平布局**：用 horizontalLayout 让日历浮层里的内容横向排列。
:::

:::bi
**Sizes**: Choose between medium (default) and small for size.

:::zh
**尺寸**：尺寸可以在 medium（默认）和 small 之间选。
:::

:::bi
**Presets**: Provide common date ranges.

:::zh
**预设**：提供常用日期范围。
:::

:::bi
**Presets with default value**: Provide common date ranges with an additional default value.

:::zh
**带默认值的预设**：提供常用日期范围，并额外给一个默认值。
:::

:::bi
**Min and max dates**: Provide common date ranges with an additional default value.

:::zh
**最小和最大日期**：提供常用日期范围，并额外给一个默认值。
:::

:::bi
**Pinned timezone**: Use pinnedTimezone to lock the calendar to a specific timezone. The timezone is shown as read-only text instead of a select.

:::zh
**固定时区**：用 pinnedTimezone 把日历锁定到指定时区。时区会显示成只读文本，而不是一个下拉选择。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Pick `<Calendar>` for analytics ranges and any picker where day-of-week and month context matter.
- For ISO dates pasted whole or relative shorthand like 7d, use a free-form Input.
- Provide `<Calendar.Presets>` for the common ranges (Last 7 Days, Month to Date) so users land on the right window in one click.
- Pair a horizontal layout with live results next to the calendar; in narrow surfaces like a sidebar, fall back to the stacked layout.

:::zh
- 分析用的时间范围，以及任何需要看到星期几和月份上下文的日期选择，都选 `<Calendar>`。
- 整段粘贴 ISO 日期，或者输入 7d 这类相对简写时，用自由格式的 Input。
- 为常用范围提供 `<Calendar.Presets>`（Last 7 Days，Month to Date），用户一下就能落到正确的时间窗口。
- 用水平布局时，把实时结果放在日历旁边。在侧边栏这种窄表面里，退回堆叠布局。
:::

**行为（Behavior）**

:::bi
- Set min and max to the data window so users can’t pick outside the retention range.
- Default to the user’s locale and timezone; never silently render UTC for a US-Pacific viewer.
- Keep the trigger label as the chosen range (Apr 1 – Apr 28, 2026); don’t fall back to Pick a date once a value is committed.
- Persist the selected range when the popover closes and re-opens so users can tweak the end date without re-picking the start.

:::zh
- 把 min 和 max 设成数据窗口，用户就选不到保留范围之外的日期。
- 默认用用户的区域设置和时区，绝不能让美西用户不知不觉看到 UTC 时间。
- 触发按钮上的标签保持为已选范围（Apr 1 – Apr 28, 2026），一旦选定了值，就不要退回去显示 Pick a date。
- 浮层关闭再打开时保留已选范围，用户只改结束日期时不用重新选开始日期。
:::

**无障碍（Accessibility）**

:::bi
- Trap focus inside the popover so Tab cycles day cells and presets instead of the page behind it.
- Support arrow-key day navigation, Shift + arrow for week jumps, and Page Up / Page Down for month jumps.
- Announce range changes through aria-live="polite" so a screen reader hears From Apr 1 to Apr 28 after the second click.
- Each preset is a real button with a Title Case label (Last 30 Days); don’t mark presets as menu items without keyboard handling.

:::zh
- 把焦点锁在浮层里，Tab 在日期单元格和预设之间循环，而不是跑到后面的页面上。
- 支持方向键逐日移动，Shift 加方向键按周跳，Page Up 和 Page Down 按月跳。
- 用 aria-live="polite" 播报范围变化，第二次点击之后屏幕阅读器会念出 From Apr 1 to Apr 28。
- 每个预设都是真正的按钮，标签用 Title Case（Last 30 Days）。不要把它标成菜单项却没有对应的键盘处理。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import type { DateValue } from '@vercel/geistcn/components';
import { Calendar } from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';
import type { RangeValue } from '@react-types/shared';

export function Component(): JSX.Element {
  const [date, setDate] = useState<RangeValue<DateValue>>();

  const now = new Date();

  const minDate = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    now.getDate(),
  );

  const maxDate = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    now.getDate(),
  );

  return (
    <div className="flex justify-center py-12">
      <Calendar
        allowClear
        onChange={setDate}
        value={date}
        minValue={minDate}
        maxValue={maxDate}
      />
    </div>
  );
}
```

#### Collapse（折叠面板）

:::bi
A set of headings, vertically stacked, that each reveal an related section of content. Commonly referred to as an accordion.

:::zh
一组纵向排列的标题，每个都能展开一段相关内容。通常也叫手风琴。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Collapse for optional, advanced, or repetitive content that most users skip on most visits (FAQ, advanced settings, request payload preview).
- For top-level structure that every user reads, use page sections with regular headings; collapsing primary content hides what the page is about.
- Single Collapse for one optional block. CollapseGroup for a related set; switch to Tabs when the items are sibling views, not optional drill-downs.

:::zh
- 可选内容，进阶内容，或者重复出现的内容，大多数用户大多数时候都会跳过，这些放进 Collapse（FAQ，高级设置，请求体预览）。
- 每个用户都会读的顶层结构，用普通标题的页面分节，不要折叠。把主要内容折起来，等于把页面在讲什么藏了起来。
- 单个可选区块用 Collapse。一组相关区块用 CollapseGroup。如果这些项是平级视图而不是可选的展开细看，改用 Tabs。
:::

**行为（Behavior）**

:::bi
- Default state is closed unless the first-time visitor must read the content to act.
- Inside a CollapseGroup, allow only one panel open at a time when items are mutually exclusive; allow multiple when items are independent.
- Animate the open/close transition; jump-cuts make the page feel like it teleported.
- Don’t nest Collapse more than one level deep. Two-level nesting hides too much and breaks the keyboard tab path.

:::zh
- 默认状态是收起，除非第一次来的用户必须读到内容才能继续操作。
- 在 CollapseGroup 里，各项互斥时一次只允许展开一个面板，各项独立时允许多个同时展开。
- 展开和收起的过渡要有动画。硬切会让页面像瞬移一样。
- Collapse 最多嵌套一层。两层嵌套藏得太多，还会打断键盘 Tab 的路径。
:::

**内容（Content）**

:::bi
- Heading is Title Case and names the topic, not the action (Advanced Settings, not Show Advanced Settings).
- Body is sentence case prose with normal section formatting; treat the panel as a small page, not a tooltip.
- Don’t put primary destructive actions inside a closed Collapse; the user has to click twice to reach the warning.

:::zh
- 标题用 Title Case，写主题而不是动作（写 Advanced Settings，不写 Show Advanced Settings）。
- 正文是 sentence case 的段落，按正常的分节格式排版。把面板当成一个小页面，而不是提示气泡。
- 主危险操作不要放进默认收起的 Collapse 里，用户得多点一次才能看到警告。
:::

**无障碍（Accessibility）**

:::bi
- The trigger is a `<button>` with aria-expanded that flips on toggle and aria-controls pointing at the panel id.
- Enter and Space toggle. Don’t bind any other key globally; arrow keys move focus inside the panel content.
- Render the panel content in the DOM when closed (with hidden or visibility) so search and find-in-page still hit it; lazy-render only for expensive content.

:::zh
- 触发元素是 `<button>`，带 aria-expanded 属性，展开收起时取反，再用 aria-controls 指向面板的 id。
- Enter 和空格键负责展开收起。不要在全局绑其他键，方向键留给面板内容内部的焦点移动。
- 收起时也把面板内容渲染在 DOM 里（用 hidden 或 visibility 控制），页面查找和搜索才能命中。只有渲染代价很高的内容才延迟渲染。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Collapse, CollapseGroup } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <CollapseGroup>
      <Collapse title="Question A">
        <p className="text-copy-16 mb-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
      </Collapse>
      <Collapse title="Question B">
        <p className="text-copy-16 mb-4">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>
      </Collapse>
    </CollapseGroup>
  );
}
```

#### File Tree（文件树）

:::bi
Display a hierarchical directory structure with expandable folders and files, useful for illustrating project layouts.

:::zh
展示可展开文件夹和文件的层级目录结构，适合说明项目结构。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Tree, Folder, File } from '@vercel/geistcn/components';
import type { JSX } from 'react';

export function Component(): JSX.Element {
  return (
    <Tree>
      <Folder name=".vercel" defaultOpen>
        <Folder name="output" defaultOpen>
          <Folder name="functions" defaultOpen>
            <Folder name="edge.func" defaultOpen>
              <File name=".vc-config.json" href="/" />
              <File name="index.js" />
            </Folder>
          </Folder>
        </Folder>
      </Folder>
      <Folder name="app">
        <File name="main.tsx" type="edge-function" />
        <File name="dashboard.tsx" type="lambda" />
        <File name="dashboard.tsx" type="middleware" />
      </Folder>
    </Tree>
  );
}
```

#### Pagination（分页）

:::bi
Navigate to the previous or next page.

:::zh
跳到上一页或下一页。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Pagination } from '@vercel/geistcn/components';
import type { JSX } from 'react';

const prev = {
  title: 'Home',
  href: '#',
};

const next = {
  title: 'Introduction',
  href: '#',
};

export function Component(): JSX.Element {
  return <Pagination next={next} previous={prev} />;
}
```

#### Phone（手机）

:::bi
The Phone component lets you showcase website screenshots or other content within a realistic phone-style frame.

:::zh
Phone 组件可以把网站截图或其他内容放进一个逼真的手机外框里展示。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Phone as marketing chrome around mobile screenshots, recordings, and demo images on landing pages and docs.
- Don’t render live mobile product UI inside the frame; the chrome implies a captured screen, not an interactive surface.
- Pair with Browser when showing parallel desktop and mobile views; keep both variants on the same theme.

:::zh
- Phone 适合给落地页和文档里的移动端截图，以及录屏和演示图做营销外框。
- 不要在手机外框里渲染真实的移动端产品界面。这个外框暗示的是一张截屏，不是可交互的界面。
- 要并排展示桌面端和移动端时，和 Browser 搭配使用，两个外框的 variant 保持同一主题。
:::

**行为（Behavior）**

:::bi
- Match the variant to the surrounding theme so the chrome doesn’t outshine the screenshot it’s framing.
- Lock the inner image aspect ratio to a real device ratio (typically 19.5:9 for modern phones) so the bezel doesn’t crop content.
- Avoid stacking shadows on the parent container; the Phone chrome already has its own elevation and additional shadow stacks read as a halo.

:::zh
- variant 和周围主题一致，外框才不会抢掉里面截图的注意力。
- 把内部图片的宽高比锁到真实设备比例（现代手机通常是 19.5:9），边框才不会裁掉内容。
- 不要在父容器上再叠阴影。Phone 外框自己已经有层级感，再叠阴影看起来像一圈光环。
:::

**无障碍（Accessibility）**

:::bi
- Treat the chrome as decorative (aria-hidden="true"); accessible naming belongs on the inner screenshot.
- Give the inner image alt text describing the screen content (Vercel dashboard on iPhone), not the device.
- For autoplay video inside the frame, respect prefers-reduced-motion and provide a paused poster fallback.

:::zh
- 把外框当作装饰（aria-hidden="true"），无障碍名称放在里面的截图上。
- 给内部图片写描述屏幕内容的 alt 文本（Vercel dashboard on iPhone），而不是描述设备。
- 外框里有自动播放的视频时，要遵循 prefers-reduced-motion，并提供暂停状态的封面图兜底。
:::

#### Project Banner（项目横幅）

:::bi
Used for temporary, project-wide notifications that require resolution

:::zh
用于需要处理的项目级临时通知。
:::

**原站示例里的说明（Notes）**

:::bi
**Success**: For positive, temporary mitigations put in place to protect a project, e.g., Attack Challenge Mode

:::zh
**成功**：为了保护项目而临时启用的正向缓解措施，比如 Attack Challenge Mode。
:::

:::bi
**Warning**: When a project is in an exceptional state which requires non-immediate action to exit, e.g., during a rollback

:::zh
**警告**：项目处于异常状态，需要非紧急的处理才能退出时，比如回滚过程中。
:::

:::bi
**Error**: When a project is approaching or experiencing critical downtime which requires immediate attention, e.g., when payment is overdue

:::zh
**错误**：项目即将或正在经历严重停机，需要立刻处理时，比如付款逾期。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Project Banner for project-wide states that need resolution: overdue billing, an active rollback, attack mitigation, an expiring trial blocking deploys.
- Pick Note for inline contextual messages tied to a single field or card, Toast for transient acknowledgments, Modal for confirmations.
- Match variant to severity: error for critical downtime or payment-blocking states, warning for an exceptional state with non-immediate action, success for a positive temporary mitigation, gray for routine project-wide notices.

:::zh
- 需要解决的项目级状态用 Project Banner：账单逾期，正在进行的回滚，攻击缓解，试用即将到期导致部署被拦。
- 只跟单个字段或卡片相关的内联上下文消息用 Note，暂时性的知悉提示用 Toast，确认用 Modal。
- variant 要和严重程度匹配：严重停机或阻塞付款的状态用 error，需要非紧急动作的异常状态用 warning，正向的临时缓解用 success，常规的项目级通知用 gray。
:::

**行为（Behavior）**

:::bi
- Project Banner is non-dismissible by design. If the message can be dismissed without resolving the underlying state, it isn’t banner-worthy; move it to a Note.
- Show one Project Banner at a time. Stacking competing banners drowns the most urgent state.
- Always pass a callToAction that resolves the state. A banner with no route is a dead end.

:::zh
- Project Banner 按设计就不能关掉。如果一条消息不用解决底层状态就能关掉，它就不该做成横幅，改成 Note。
- 一次只显示一个 Project Banner。几条横幅叠在一起，最紧急的状态反而被淹没。
- 始终传一个能解决该状态的 callToAction。没有去路的横幅是死胡同。
:::

**内容（Content）**

:::bi
- label is one sentence in sentence case that names the impact: Your Pro trial expires in 3 days. Don’t open with Heads up or apologetic preambles.
- callToAction.label is Title Case Verb + Noun and points at the resolver: Update Payment Method, Reactivate Project, Review Tokens.
- Name the affected entity when the project context isn’t obvious from the surrounding chrome (Production deployments are paused on my-project).
- Don’t encode severity in the copy with emoji or interjections; the variant carries that signal.

:::zh
- label 是一句 sentence case 的话，点明影响，比如 Your Pro trial expires in 3 days. 不要用 Heads up 之类的开场白，也不要道歉式的前言。
- callToAction.label 用 Title Case 的动词加名词，指向解决动作：Update Payment Method，Reactivate Project，Review Tokens。
- 周围界面看不出项目上下文时，要点明受影响的对象（Production deployments are paused on my-project）。
- 不要在文案里用 emoji 或感叹词表达严重程度，variant 已经承担了这个信号。
:::

#### Scroller（滚动容器）

:::bi
Display an overflowing list of items.

:::zh
展示超出容器长度的条目列表。
:::

**原站示例里的说明（Notes）**

:::bi
**Vertical with buttons**: Buttons will automatically scroll to a given direct child.

:::zh
**带按钮的纵向滚动**：按钮会自动滚动到指定的直接子元素。
:::

:::bi
**Horizontal with buttons**: Buttons will automatically scroll to a given direct child.

:::zh
**带按钮的横向滚动**：按钮会自动滚动到指定的直接子元素。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Scroller for an overflowing list of peer items along a single axis: chip rows, log streams, code snippets, command palettes.
- Pick vertical for stacked feeds, horizontal for chip and tile rails, free only when content genuinely scrolls in both directions (logs with very long lines).
- For paginated or virtualized data sets larger than a few hundred items, render with a virtualization library inside the Scroller rather than dumping every node into the DOM.

:::zh
- 同一轴向上溢出的一排平级条目，用 Scroller：标签芯片行，日志流，代码片段，命令面板。
- 堆叠的信息流选纵向，芯片和卡片轨道选横向，只有内容真的会横竖两个方向滚动时才用自由滚动（比如行特别长的日志）。
- 超过几百项的分页或虚拟化数据集，在 Scroller 里用虚拟化库渲染，不要把每个节点都塞进 DOM。
:::

**行为（Behavior）**

:::bi
- Auto-scroll buttons target direct children only. If items are wrapped in extra layout nodes the buttons won’t find their target.
- Show edge fade or shadow affordances on the clipped axis so users see there’s more content past the viewport.
- Keep item widths and gaps consistent in horizontal scrollers; ragged edges break the snap rhythm and make the rail feel broken.

:::zh
- 自动滚动按钮只认直接子元素。如果条目外面多包了一层布局节点，按钮就找不到目标。
- 在被裁切的那个轴向上做边缘淡出或阴影提示，用户能看出视口外还有内容。
- 横向滚动容器里，条目的宽度和间距保持一致。参差的边缘会打乱吸附节奏，整条轨道会显得坏掉。
:::

**无障碍（Accessibility）**

:::bi
- Tab order follows DOM order, so place items in reading order regardless of visual scroll direction.
- Scroller buttons need aria-labels that name the direction and content (Scroll customer logos left), not bare Previous/Next.
- Make sure focusing an off-screen item scrolls it into view; the default browser behavior covers this, but custom focus traps can break it.

:::zh
- Tab 顺序跟着 DOM 顺序走，所以不管视觉上往哪个方向滚，条目都按阅读顺序放进 DOM。
- 滚动容器的按钮需要 aria-label 说明方向和内容（Scroll customer logos left），不能只写 Previous 或 Next。
- 聚焦视口外的条目时，要确保它被滚进视野。浏览器默认行为已经处理了这一点，但自定义的焦点陷阱可能把它弄坏。
:::

#### Tabs（标签页）

:::bi
Display tab content.

:::zh
展示标签页内容。
:::


**最佳实践（Best Practices）**

**适用场景（When to use）**

:::bi
- Use Tabs to switch between sibling views inside a single page (Overview, Logs, Settings).
- For navigation between unrelated pages, use a sub-menu, not Tabs. Tabs imply the views share scope, URL parent, and data model.
- Cap a Tabs row at 5–7 entries on desktop and 3–4 on mobile. Past that, consolidate or move secondary views behind a Menu.

:::zh
- 在单个页面内部的平级视图之间切换时用 Tabs（Overview，Logs，Settings）。
- 在不相关的页面之间导航，用子菜单，不要用 Tabs。标签页意味着这些视图共享作用范围，URL 父级和数据模型。
- 一排标签页桌面端控制在 5 到 7 项，移动端 3 到 4 项。超过之后合并同类项，或者把次要视图放进 Menu。
:::

**行为（Behavior）**

:::bi
- Selecting a tab is instant; don’t trigger network confirmation or toast on tab change.
- Reflect the active tab in the URL (query param or path) so deep-links and refresh restore state.
- Disable individual tabs only for permission or empty-state reasons; pair the disabled tab with a tooltip that names the constraint.

:::zh
- 切换标签页是即时的，不要在切换时发起网络请求确认，也不要弹轻提示。
- 把当前激活的标签页反映到 URL 上（查询参数或路径），深链和刷新才能恢复状态。
- 只在权限不足或空状态的情况下禁用单个标签页。被禁用的标签配一个提示气泡，说明是什么限制。
:::

**内容（Content）**

:::bi
- tabs[].title is Title Case, 1–2 words, and names the destination noun (Overview, Logs, Settings). Verbs belong on buttons; View Logs is wrong on a tab.
- tabs[].tooltip is sentence case and explains the constraint (Only visible to project owners.), not the tab’s purpose.
- Don’t append a count to the title (Logs (12)); use a badge slot instead and drop the badge at zero.

:::zh
- tabs[].title 用 Title Case，一到两个词，写名词（Overview，Logs，Settings）。动词属于按钮，View Logs 放在标签页上是错的。
- tabs[].tooltip 用 sentence case，解释限制条件（Only visible to project owners.），不是解释标签页的用途。
- 不要在标题后面挂数量（Logs (12)）。改用 badge 插槽，数量为零时把徽标去掉。
:::

**无障碍（Accessibility）**

:::bi
- Keep Left/Right arrows moving focus across tabs and Enter/Space activating; don’t hijack with global shortcuts.
- Label the tablist with aria-label when no visible heading sits above it (aria-label="Sections").
- Maintain a visible focus ring on the active tab; don’t suppress focus styles for visual polish.

:::zh
- 左右方向键在标签之间移动焦点，Enter 或空格键激活，不要让全局快捷键把这两个键抢走。
- 上方没有可见标题时，给 tablist 加 aria-label（aria-label="Sections"）。
- 激活的标签页上保留可见的聚焦轮廓，不要为了画面好看去掉聚焦样式。
:::


原站示例代码（React，组件来自 @vercel/geistcn）：

```tsx
import { Tabs } from '@vercel/geistcn/components';
import { useState, type JSX } from 'react';

export function Component(): JSX.Element {
  const [selected, setSelected] = useState('apple');

  return (
    <Tabs
      selected={selected}
      setSelected={(t) => setSelected(t)}
      tabs={[
        { title: 'Apple', value: 'apple' },
        { title: 'Orange', value: 'orange' },
        { title: 'Mango', value: 'mango' },
      ]}
    />
  );
}
```

#### Theme Switcher（主题切换器）

:::bi
Component that allows users to switch between light and dark themes.

:::zh
让用户在亮色和暗色主题之间切换的组件。
:::

#### Video（视频）

:::bi
Embed a video with built-in playback controls and lazy loading support.

:::zh
嵌入视频，自带播放控件并支持懒加载。
:::

:::annotation
视频组件的示例是一段自动播放的 mp4，体积太大没有搬进仓库，所以静态快照里是空窗口。播放、循环、控制条这些行为按原站文档保留说明。
:::


## 复刻说明（How the Replica Was Built）

对于原站 81 个页面（六个基础章节、品牌页、74 个组件页），本文的做法是先整页抓成 HTML，再用 lxml 按选择器把正文块、示例区和代码拆出来。原站每张示例卡片右下角有一个 Show code，代码在 React Server Components 的 payload 里，跟着 `__rawString__` 一起抓，所以示例代码和页面上的截图是一一对应的。

示例快照不是截图，而是原站示例区的 HTML 加原站 CSS。为了让这些快照能在文章正文里安全地显示，本文做了三件事：

第一，把示例里的 p、ul、li、标题换成 div，避免被文章正文的排版规则命中。第二，把原站 Tailwind 生成的工具类和 CSS Modules 的类名按实际用到的筛选出来，统一加上作用域前缀。第三，把示例里引用的第三方品牌 logo 和真人头像换成本地生成的占位图，视频改成静态窗口。字体是 OFL 授权的 Geist Sans、Geist Mono、Geist Serif 和 Geist Pixel，自托管在站内。

操作感强的那些组件另外用 Svelte 重写了一版，包括按钮、复制按钮、拆分按钮、标签页、模态框、轻提示、提示气泡、菜单、选择器、开关、单选、复选、滑块、折叠面板和分页。它们和原站共用同一套设计令牌，行为和键盘操作按原站示例的意思重做，代码是站内自己写的。

### 版权与许可（Copyright and Licensing）

**字体是开源的。** Geist Sans、Geist Mono、Geist Serif、Geist Pixel 采用 SIL Open Font License 1.1，可以自由使用、嵌入和再分发，只要保留版权声明和许可文本，不单独售卖字体，修改后的版本不冒用保留字体名。站内把字体放在 `public/fonts/geist/` 下自托管，同目录附了完整的 OFL 文本。

**文档和示例没有公开许可。** Geist 文档页面本身没有声明任何 license。Vercel 的服务条款写的是 Vercel 保留 Services 及其相关知识产权的全部权利，所以正文、示例和截图按默认版权处理，没有可援引的开放授权。这篇收录是个人学习用途的中文翻译和引用，保留了署名和原文链接，没有拿去商用。如果 Vercel 认为哪里不合适，删掉文章或者删掉对应段落都可以。

**组件包没有开源。** 示例代码 import 的 `@vercel/geistcn` 和 `@vercel/geistcn-assets` 在 npm 上查不到，公开仓库里也没有，所以示例代码只能当文档看，不能直接安装使用。另外 npm 上很早的 `geist` 0.1.x 是别人的同名包，和 Vercel 这套没关系。

**品牌和商标另算。** Vercel、Next.js、Turbo、v0、eve、AI SDK 的名字和 logo 是商标，原站品牌页的规范要求不能修改、不能造成混淆。站内没有转载任何 logo，示例里的第三方 logo 和真人头像都换成了本地生成的占位图。站内手写的复刻代码和抓取脚本属于本站。

## 从 Geist 能带走什么（What to Take Away）

- **令牌先行。** 颜色、字号、行高、圆角、阴影、动效曲线全部收进变量，组件里不写死任何一个数值。换主题时只换令牌，不改组件。
- **灰阶承担大部分界面。** 10 级灰加 10 级带透明度的灰，够表达背景、边框、图标和三级文字；彩色只留给状态和强调。
- **按角色命名，不按外观命名。** Color 1 到 10 说的是这个颜色在界面里干什么，不是它长什么样。
- **一种材质对应一层。** Surface 和 Floating 两档，层级越高的元素阴影越深、圆角越大，不要让一个元素同时像两个层级。
- **每种文字风格都有适用范围。** 标题、按钮、标签、正文四组各自解决一类排版问题，Label 单行，Copy 多行，混用之前先想清楚。
- **边框只画一次，阴影保持半透明。** 带透明度的边框叠起来会变色，不透明阴影会留下灰晕，这两条是最容易翻车的细节。
- **暗色不是反色。** 暗色有自己的一套色板和对比度约束，不能把亮色值直接反转。
- **状态是设计的一部分。** 悬停、按下、聚焦、禁用、错误，每个状态都要有对应的令牌，而不是等开发时临时调。
- **示例就是文档。** 每个组件页都配可运行的示例和 Show code，规则写在示例旁边，比写在另一份规范里有效。
- **最佳实践写成三段。** 适用场景、行为、无障碍，回答的是“什么时候用、用起来什么样、对辅助技术怎么样”，这三段比任何形容词都清楚。

## 附：原文链接

- Geist 设计系统：https://vercel.com/geist/
- Geist 字体：https://vercel.com/font
- 品牌资产：https://vercel.com/geist/brands

**版权归 Vercel 所有，译文、注解和站内重做的演示只作学习交流之用。**
