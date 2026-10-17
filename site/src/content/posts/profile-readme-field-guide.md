---
title: '从零搭一个GitHub个人主页README'
description: '让我们一起来用 Markdown 与 HTML 标签搭出好看、好玩又不容易烂掉的 GitHub 个人主页吧'
pubDate: 2026-10-17
category: technology
tags: ['github', '前端', '自动化', '方法论']
series: 'GitHub Actions 笔记'
seriesOrder: 2
subcategory: 'frontend-tools'
---

如果你经常逛 GitHub，肯定见过不少花里胡哨的个人主页：顶上一行字像有人在实时敲键盘，左边是个人状态和技术栈徽章，右边挂着圆角的统计卡片，底下甚至还有一条贪吃蛇在孜孜不倦地吃绿色的贡献格子。

第一次看到这种主页的时候，很多人的第一反应是去自己的账号设置（Settings）里翻一圈，看看是不是漏了哪个装修面板，但翻遍整个设置页，你也只能找到头像、Bio 和几个社交链接输入框。

因为 GitHub 压根没把个人主页做成一个表单，而是藏成了一个仓库级的彩蛋。这篇文章我们就从零开始，一步步把这个页面搭起来，顺便把里面用到的排版技巧、动态组件和自动更新机制拆开讲清楚。

## 第一步：解锁同名仓库

实际上，开启个人主页的方法非常简单，甚至朴素到有点反直觉：

1. 点击右上角的 `+` 号，选择 **New repository** 新建一个仓库；
2. 在 **Repository name**（仓库名）一栏，填入**和你的 GitHub 用户名一模一样的名字**（比如我的用户名是 `puresky271`，仓库名就填 `puresky271`）；
3. 将仓库可见性设为 **Public**（公开）；
4. 勾选底部的 **Add a README file**，然后点击创建。

当你把仓库名输完的那一刻，输入框下方会跳出一个平时见不到的绿色提示框，上面画着一只章鱼猫，写着：

> **puresky271/puresky271** is a special repository that you can use to add a `README.md` to your GitHub profile. Make sure it’s public and initialize it with a README to get started.

创建完成后，直接回到你的个人主页 `https://github.com/你的用户名`，你会发现那个原本只有置顶仓库和绿格子的单调页面上方，多出了一整块区域，里面展示的正是这个同名仓库根目录下的 `README.md`。

也就是说：**你的个人主页不是数据库里的一个简介字段，它本质上就是一个完整的 Git 仓库。**

平时普通仓库能干的事，它全都能干。你可以往里面传图片和音频文件，可以用 Commit 记录自己每一年研究方向的变化，也可以把它设成 Template repository（模板仓库）供别人一键复用，更重要的是，你可以在里面建一个 `.github/workflows/` 目录，让 GitHub Actions 每天定时帮你改写主页内容。

总之，只要你想通了它是一个仓库，后面的很多玩法就可以顺理成章的出来了。

## 第二步：搞清楚我们手头有哪些牌

在急着往 `README.md` 里塞东西之前，得先摸清 GitHub 渲染引擎能吃下的东西。

很多新手会兴冲冲地在本地用 Typora 直接写了一段带 `<style>` 的 HTML，本地预览酷炫无比，但一推上 GitHub 全变成了干巴巴的纯文本。这是因为 GitHub 渲染 Markdown 走的是一套极其严格的清洗流水线：**先按 GFM（GitHub Flavored Markdown）解析，再过一遍 HTML 过滤器（html-pipeline），把所有可能威胁页面安全或者破坏全局布局的东西全部扒掉。**

好吧，那经过这层过滤之后，究竟什么是不能用的，什么又是留给我们的后门？

**绝对行不通的路**：

- **所有的 CSS 样式都会被剥离。** 不管是 `<style>` 标签、行内的 `style="color: red;"`，还是 `class` 和 `id` 属性，上传之后全都会被静默删掉。
- **所有的 JavaScript 和交互事件都会被拦截。** `<script>`、`onclick`、`onload`、`<iframe>` 这些想都不用想，属于安全红线。
- **不能直接在 Markdown 里内联写 `<svg>` 代码。** 直接贴进去的 `<svg>` 标签会被过滤掉。

我去，听起来像是把前端开发者的手脚全绑住了吗。别急，我们再看**允许通过的白名单**：

1. **老派但好使的 HTML 排版标签**：
   虽然不让写 CSS，但 GitHub 保留了一批上古 HTML 标签和属性。比如 `<div align="center">` 可以控制居中，`<table>` 配合 `width` 和 `valign` 可以强行做出多栏布局，`<details>` 和 `<summary>` 可以做出点击展开的抽屉，`<picture>` 可以根据系统深浅色模式切换图片，`<code>`、`<kbd>`、`<sub>`、`<sup>`、`<br>` 也全都活着。
2. **万物皆可伪装成一张图片（`<img>` 外链 SVG）**：
   这是 GitHub 主页生态最核心的逃逸通道。虽然你不能直接在文档里写 `<svg>` 标签，但 GitHub 允许你用 `<img src="...">` 引用外部图片，**而且这张外部图片的格式可以是 `.svg`**！
   SVG 本质上是一段用 XML 写的矢量图形代码，它自己在内部是可以写 `<style>` 甚至 CSS `@keyframes` 关键帧动画的。当浏览器通过 `<img>` 标签加载一个外部 SVG 时，浏览器会把它当成受沙盒隔离的图像，不仅不会拦截里面的 CSS 动画，还会乖乖把它渲染出来。

现在把这两条拼在一起，GitHub 个人主页的所有魔术就全解密了：

**排版靠白名单里的原生 HTML 标签，动态视觉和实时数据靠指向外部服务的 SVG 图片链接。** 你在别人主页上看到的打字机字幕、实时刷新的 Star 统计卡、Spotify 正在播放的歌单、甚至贪吃蛇吃绿格子，无一例外，全都是一张张伪装成 `<img>` 的 SVG 动图。

## 第三步：搭骨架与排版技巧

知道了手里有哪些牌，我们现在打开 `README.md`，从最基础的文字骨架开始，一步步加上排版技巧。

### 1. 用 `<code>` 和 `<kbd>` 做轻量级身份标签

很多人一上来就喜欢贴二三十个五颜六色的徽章，页面花得像电线杆上的小广告。其实如果只是想展示自己的专业、所在城市或者几个核心关键词，Markdown 自带的行内代码标签 `<code>`（或者用反引号包起来）以及键盘按键标签 `<kbd>` 反而更耐看。

```html
<div align="center">
  <h1>青空</h1>
  <p>
    <code>计算机科学与技术</code>
    <code>沈阳</code>
    <kbd>AI Roleplay</kbd>
    <kbd>System Engineering</kbd>
  </p>
  <p>在做角色 AI 和长期记忆模拟，最近在折腾一个让角色记得住昨天发生了什么的世界模型。</p>
</div>
```

`<code>` 会给文字套上一层浅灰底色和等宽字体，`<kbd>` 则会带上一圈淡淡的立体边框，看起来就像一枚枚小巧的铭牌。最重要的是，它们是纯文本渲染，零外部请求，不管过多少年都绝不会变成裂开的图标。

### 2. 用 HTML `<table>` 打破单列限制，实现左右分栏

Markdown 默认是从上往下排的单列文档。如果你想左边写自我介绍和近况，右边并排放一张统计卡片或者插画，纯 Markdown 的表格语法（`| A | B |`）会非常难写，因为单元格里一旦出现换行或复杂列表，表格就会直接散架。

这时候直接上原生 HTML 的 `<table>` 标签是最稳的：

```html
<table>
  <tr>
    <td valign="top" width="55%">

### 最近在忙什么

- 维护 **mygo_chat**，一个多智能体认知仿真与长期记忆框架
- 啃《计算机程序的构造和解释》，顺手往博客里搬笔记
- 补 PyTorch 和底层算子，目标是自己从头手写一遍 GPT

    </td>
    <td valign="top" width="45%">

<img src="https://github-readme-stats.vercel.app/api?username=puresky271&show_icons=true&hide_border=true" width="100%" alt="stats" />

    </td>
  </tr>
</table>
```

这里有两个细节：

1. **`<td>` 标签和里面的 Markdown 内容之间，上下必须留出一整行空行。** 如果紧挨着写，GitHub 的解析器会把里面的 `###` 和 `-` 当成普通纯文本，不会渲染成标题和列表。
2. **`<td>` 上一定要加 `valign="top"`。** HTML 表格单元格默认是垂直居中的，如果不加这个属性，当左栏文字长、右栏图片短的时候，右边的卡片就会莫名其妙悬在半空中。

另外还有一种更取巧的图文混排写法，连 `<table>` 都不用建，直接在 `<img>` 标签上加 `align="right"`：

```html
<img align="right" width="38%" src="你的图片或卡片地址" alt="preview" />

这里直接写正常的 Markdown 列表和段落。
图片会自动浮动到右侧，文字则在左边自然排列。
等文字高度超过图片之后，下面的内容又会自动恢复成占满整行的宽度。

<br clear="both"/>
```

末尾那句 `<br clear="both"/>` 相当于 CSS 里的清除浮动，防止后面的标题也跟着挤在图片旁边。这种浮动写法的好处是：在窄屏手机上浏览时，它比硬分栏的 `<table>` 适应性更好。

### 3. 用 `<details>` 造抽屉，把长列表藏起来

随着你写的项目和掌握的工具越来越多，主页很容易越拉越长。把所有东西全摊在首屏，读者的注意力反而会被稀释。这时候可以用 `<details>` 和 `<summary>` 做一个折叠抽屉：

```html
<details>
  <summary><b>展开查看完整技术栈与工具箱</b></summary>
  <br>

  - **主力语言**：Python、TypeScript、C/C++
  - **后端与框架**：FastAPI、Astro、Svelte、Hono
  - **存储与基础设施**：SQLite、Cloudflare Workers / D1 / R2、Docker

</details>
```

默认状态下，页面上只会显示一行带小三角的“展开查看完整技术栈与工具箱”，点一下才会把里面的内容滑出来。`<details>` 甚至支持两层嵌套，适合拿来收纳“往年项目归档”或者“在读的书单”。同样记得在 `<summary>` 结束标签后面空一行再写 Markdown 语法。

### 4. 用 `<picture>` 做深浅色主题自适应

现在的开发者起码有一半常年开着 GitHub 的 Dark Mode（深色模式）。如果你在自己的浅色模式下精心挑选了一张黑字透明底的横幅图，或者配了一张纯白底的统计卡，等深色模式的访客点进来，要么黑字融进黑背景里彻底隐形，要么白花花的卡片像夜间手电筒一样晃眼。

GitHub 专门为此开放了 HTML5 的 `<picture>` 标签配合 `prefers-color-scheme` 媒体查询：

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://example.com/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://example.com/banner-light.svg">
  <img alt="Banner" src="https://example.com/banner-light.svg" width="100%">
</picture>
```

当访客的系统或 GitHub 处于深色模式时，浏览器会自动加载第一行的 `banner-dark.svg`；处于浅色模式时则加载 `banner-light.svg`；最底下的 `<img>` 是兜底。这一招无论拿来换顶部头图，还是拿来切两套不同配色的统计卡片，体验都会细腻很多。

## 第四步：接入好玩的动态组件

骨架立稳之后，我们可以往页面里加一点会动或者会随数据变化的元素了。前面说过，它们本质上都是通过 URL 参数实时生成 SVG 的外部服务。我们挑最经典、最好用的几个来讲怎么调参。

### 1. 打字机动态签名（Readme Typing SVG）

顶上那行像终端一样逐字敲出来的动画，用的是开源项目 `readme-typing-svg`。直接往主页里放一个 `<img>` 就能跑：

```html
<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=3000&pause=1000&color=38BDF8&vCenter=true&width=450&lines=Hello%2C+I'm+puresky.;Building+AI+roleplay+worlds." alt="Typing SVG" />
```

看着一长串地址好像很复杂，其实拆开看全是直白的键值对（Query Parameters）：

- `font=JetBrains+Mono`：指定字体（空格用 `+` 代替）；
- `size=20` & `weight=600`：字号与字重；
- `color=38BDF8`：文字的十六进制颜色（注意**不要加 `#` 号**）；
- `duration=3000` & `pause=1000`：花 3000 毫秒把一行字敲完，停留 1000 毫秒后再退格删掉敲下一行；
- `lines=...`：要敲出来的文字内容，空格写成 `+`，多行之间用分号 `;` 隔开。

这里分享一个我自己的实用技巧：**怎么让打字机敲完一句话之后就安静停在那里，不要没完没了地退格重敲？**

很多主页挂了三四行字在那里无限循环闪烁，读者看下面正文的时候余光一直被顶上的动画扯过去，非常干扰阅读。解决办法很简单：在 `lines` 里只放一行话，然后把停留时间 `pause` 设成一个极大的数字（比如 `pause=100000`）。这样访客刚点进你主页的那三秒钟，能看到一行字清脆地敲出来，敲完之后它就会像一句静态标语一样稳稳停住。

另外，如果你不想手拼 URL，可以直接去它的官方可视化生成器页面（`https://readme-typing-svg.demolab.com/demo/`），左边填表调颜色，右边实时预览，调好直接复制生成的 Markdown 代码就行。

### 2. Shields.io 徽章定制规律

几乎所有仓库和个人主页里的扁平小徽章，都出自 `shields.io` 这套基础设施。它的 URL 结构非常规整，背下这个公式就能随手捏出任何你想要的标签：

```text
https://img.shields.io/badge/左半边文字-右半边文字-背景颜色?style=样式&logo=图标名&logoColor=图标颜色
```

如果你想做一个不要左右分栏、只有纯色底加图标的技术栈徽章，只要把“左半边文字”留空，直接以连字符 `-` 开头即可：

```html
<p>
  <img src="https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/-Astro-BC52EE?style=flat-square&logo=astro&logoColor=white" alt="Astro" />
</p>
```

这里有三个新手常踩的小坑：
- **空格与特殊字符转义**：如果徽章文字里需要显示空格，在 URL 里要写成一个下划线 `_`；如果文字本身就需要显示一个下划线，要写成双下划线 `__`；如果文字里要显示连字符 `-`，得写成双连字符 `--`。
- **`style` 参数控制外貌**：默认是圆角小胶囊（`flat`），加上 `style=flat-square` 会变成方正利落的直角矩形，加上 `style=for-the-badge` 则会变成大号加粗的全大写铭牌。
- **`logo` 名字去哪查**：它对接的是 Simple Icons 图标库，几乎所有主流编程语言、框架、甚至 B 站（`bilibili`）、微信（`wechat`）都有现成的图标名。

### 3. GitHub 统计卡片与语言分布图

如果你想在主页放一张汇总 Star 数、Commit 数和常写语言比例的卡片，社区里用得最广的是 `github-readme-stats`。

默认生成的卡片带着白底和灰框，直接贴上去往往和周围格格不入。好看的关键在于三个参数：

```html
<img src="https://github-readme-stats.vercel.app/api?username=puresky271&show_icons=true&hide_border=true&bg_color=00000000&text_color=64748b&title_color=38bdf8&icon_color=38bdf8" alt="GitHub Stats" />
```

- `hide_border=true`：去掉外面那圈生硬的边框；
- `bg_color=00000000`：8 位十六进制颜色，后两位 `00` 代表完全透明（Alpha 通道为 0）。这样无论访客是深色还是浅色模式，卡片背景都能自然融进 GitHub 原生底色里；
- `hide=stars,issues`：如果你的账号刚建不久，某几项数据还比较少，可以用 `hide` 参数把特定条目藏起来，只展示你想让人看的部分。

## 第五步：通电自动化，养一条吃绿格子的贪吃蛇

前面讲的卡片都是靠外部服务器在访客打开网页时实时去拉接口。但还有一类更酷的玩法：**利用你自己同名仓库里的 GitHub Actions，定时跑脚本生成新的图片或文本，再自动提交回仓库里。**

最著名的例子就是那条会把你的年度贡献绿格子一颗颗吃光的贪吃蛇（`Platane/snk`）。

它的原理其实一点都不神秘：GitHub Actions 每天半夜启动一次，读取你账号最近的贡献日历数据，算出一条贪吃蛇走遍所有有颜色格子的路径，然后直接在后台渲染出深色和浅色两张 `.svg` 动图，推送到你同名仓库的一个独立分支（比如 `output` 分支）上。你的 `README.md` 只需要像引用普通图片一样引用那个分支里的 `.svg` 文件，就拥有了一条每天跟着你的真实提交记录更新的贪吃蛇。

如果你想给自己的主页装一条，只需要两步：

**第一步**：在你的同名仓库里新建文件 `.github/workflows/snake.yml`，贴入下面这份配置：

```yaml
name: Generate Snake

on:
  # 每天 UTC 时间 0 点自动跑一次
  schedule:
    - cron: "0 0 * * *"
  # 允许你在 Actions 页面手动点按钮立即触发
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Generate snake svg
        uses: Platane/snk/svg-only@v3
        with:
          github_user_name: ${{ github.repository_owner }}
          # 同时生成浅色版和深色版两张动图
          outputs: |
            dist/github-snake.svg
            dist/github-snake-dark.svg?palette=github-dark

      - name: Push to output branch
        uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

注意这里连私人 Token 都不需要配，直接把 `permissions` 设为 `contents: write`，用自带的 `GITHUB_TOKEN` 就能跑通。

**第二步**：去仓库的 Actions 页面手动点一次 **Run workflow**，等它跑绿之后，你的仓库里就会多出一个 `output` 分支。接着结合我们前面学过的 `<picture>` 主题自适应标签，在 `README.md` 里加上这一段：

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/你的用户名/你的用户名/output/github-snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/你的用户名/你的用户名/output/github-snake.svg" />
  <img alt="github-snake" src="https://raw.githubusercontent.com/你的用户名/你的用户名/output/github-snake.svg" width="100%" />
</picture>
```

刷新一下个人主页，一条贴合当前主题配色的贪吃蛇就开始在你的主页上爬了。

> [!TIP]
> 顺着这个思路，你还可以用 HTML 注释在 `README.md` 里埋下锚点，比如写一对 `<!-- BLOG-POST-LIST:START -->` 和 `<!-- BLOG-POST-LIST:END -->`。由于 HTML 注释在渲染后的页面上完全隐形，你可以写一个简单的脚本或者用现成的 `blog-post-workflow`，每天自动拉取你个人博客的 RSS 订阅，把最新写的五篇文章链接替换进这两个注释中间。

## 踩坑与维护：为什么很多漂亮主页过半年就烂了？

聊完了怎么往主页上加东西，最后我拿自己现在的真实主页（`github.com/puresky271`）当例子，聊聊做减法和防裂图的事。

![image](./images/profile-readme-field-guide/mvckhrq4-image.png)

（这就是我的主页readme，很简洁。）

如果你现在点进我的 GitHub 主页，会发现它的源码短得惊人，全部内容加起来不到 900 字节：

```markdown
<div align="left">
  <img src="https://readme-typing-svg.herokuapp.com?font=Cascadia+Code&weight=700&size=17&color=40E0D0&center=false&pause=100000&lines=Hello,+I'm+puresky." alt="Hi"/>
  <p>
    <code>Born 2006-07-11</code>
    <code>Student of Artificial Intelligence</code>
  </p>
</div>

- I'm deep diving in AI RP now
- welcome to exchange your works and ideas with me!

**即使迷茫，也要继续前进**
```

为什么我试过前面提到的几乎所有花活之后，最后却把页面删得只剩这么几行？

因为在长期维护里，有三个非常现实的坑：

### 1. 第三方免费服务随时会断气

仔细看上面我主页里的第一行代码，其实就藏着一个定时炸弹：我当时写下的打字机图片地址还是旧域名 `readme-typing-svg.herokuapp.com`。

早年 Heroku 提供免费容器托管，大批开源小工具都挂在 `herokuapp.com` 下面；后来 Heroku 彻底关停了免费计划，这个旧地址之所以今天还没裂开，纯粹是因为作者好心在上面留了一层转发，把它重定向到了新的 `demolab.com`。哪天旧域名到期或者转发停了，我主页头顶那句问候语就会瞬间变成一个灰底的破碎图片图标。

几乎所有第三方统计卡、访客计数器（Visitor Badge）、Spotify 实时听歌卡都面临同样的问题：它们大多是个人开发者用爱发电维护在 Vercel 或 Cloudflare 免费额度上的项目。一旦某个周末人家的接口被刷爆配额，或者作者毕业工作不再维护，你主页上精心排好的五六张卡片就会同时变成一排灰色问号。

此外，GitHub 渲染外部图片并不是让你的浏览器直连对方服务器，而是会强制经过一层叫 `camo.githubusercontent.com` 的官方图片代理。如果外部 SVG 接口响应慢，超过几秒没返回，Camo 代理就会直接放弃并缓存一张失败图。所以**外部动态卡片一定要少而精，能用原生 HTML 或静态文件解决的，尽量少挂一层外部接口。**

### 2. 别重复 GitHub 已经在替你算的东西

很多模板喜欢在 README 里塞满“编程语言占比饼图”、“年度提交总数”、“置顶仓库卡片列表”。但你只要往下滚半屏就会发现：GitHub 个人页原生就自带 6 个 Pinned 置顶仓库槽位，自带绿油油的年度贡献方阵，点进仓库就能看到语言分布条。

把页面下半截已经有的信息，用加载更慢、还可能裂图的第三方卡片在上面重画一遍，除了占满首屏空间，并没有给访客提供任何增量信息。

真正只有 README 能替你说清楚的，恰恰是 GitHub 自动统计不出来的东西：**你是谁，你最近这几个月正在死磕什么具体问题，你的代表作解决了什么痛点，以及怎么联系到你。**

### 3. 给你的内容区分“保质期”

你看我主页中间那句 `I'm deep diving in AI RP now`（我现在正深入研究 AI 角色扮演）。这种带着“此时此刻”状态的话，最能让点进来的人感觉到这个账号背后是个活生生、正在活跃写代码的人。

但它的副作用是**保质期很短**。如果半年后我已经转去做别的系统了，主页上还挂着去年的近况，熟人点进来一眼就知道这间屋子已经很久没打扫了。

所以在组织主页内容时，最好在心里把它们分成三层：
- **底层（按年更新）**：你的名字、学校或职业方向、个人博客地址、还有最后那句你真正喜欢的签名。
- **中间层（按季度更新）**：两三行“现在正在做的事（Now）”和两三个代表项目的一句话介绍。只留两三行，这样每过几个月打开网页顺手改十几个字，毫无心理负担。
- **表层（全自动或零维护）**：如果你真想放动态变化的数据，要么交给自己仓库里的 GitHub Actions 定时生成，要么只挂一两张最核心的卡片。

搭一个 GitHub 个人主页不需要攒齐所有组件才动工。现在就去建那个和自己同名的仓库，先用 `<code>` 和几行列表写下你最近正在折腾的事，留一句你喜欢的签名。等哪天有了新点子，随时回来往这间屋子里添一件新摆设就够了。
