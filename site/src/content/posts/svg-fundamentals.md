---
title: 'SVG可不只能用来画傻鸟骑车'
description: 'SVG 是基于 XML 的可缩放矢量图形格式。那个广为流传的“鹈鹕骑自行车”大模型评测梗便是以 SVG 为基础的。本文将系统梳理位图与矢量的底层差异、坐标系与 viewBox、六种基本几何图形、path 路径指令、样式与 defs 复用机制，以及网页嵌入、无障碍与安全边界等工程实践。'
pubDate: 2026-11-22
category: technology
tags: ['SVG', '前端', 'HTML', 'CSS', '软件工程']
series: '编程知识扫盲'
seriesOrder: 3
subcategory: 'programming-basics'
---

如果你平时关注 AI 圈，每次有新的旗舰大模型发布时，大概率都在社交网络上刷到过同一个画面：**一只长着巨大喉囊的鹈鹕（~~一个傻鸟骑车还想有什么变化~~）歪歪扭扭地在海边骑着自行车**。

这个被开发者戏称为“傻鸟骑车”的保留节目源于 Django 联创 Simon Willison 在 2024 年底带火的一项非官方直觉测试（Vibe Check）[^1]。规则非常简单——只给模型一句提示词：

> `Generate an SVG of a pelican riding a bicycle`（生成一张鹈鹕骑自行车的 SVG 矢量图）

为什么偏偏挑中了“鹈鹕骑自行车”？因为这个组合在现实物理世界里足够荒诞，训练集里根本没有现成的代码可以靠“背题”蒙混过关。更要命的是，**自行车**讲究严谨的几何结构（两个车轮、菱形车架、车把、坐垫与曲柄踏板），而**鹈鹕**有着夸张的解剖学特征（大嘴喉囊、长脖子、羽毛翅膀和蹼足）。纯文本大模型在生成回答时其实“看不见”画面——它全靠在上下文里心算 `(x, y)` 坐标与贝塞尔曲线，把鸟屁股稳稳落到坐垫上、翅膀搭上车把、脚掌踩住旋转的踏板。

早期或参数较小的大模型画出来往往是轮子悬空、身首异处的“克苏鲁抽象画”；而前沿推理模型不仅能把车架和辐条画得严丝合缝，甚至能顺手加上夕阳、海浪和踩踏板的骑行动画——比如 *gemini-4-argon* 刚刚写出来的下面这只：

<figure class="db-figure">
<div class="db-scroll">
<svg viewBox="0 0 880 320" width="100%" role="img" style="max-width:880px;height:auto;margin:0 auto;overflow:visible" xmlns="http://www.w3.org/2000/svg">
<title>一只戴着条纹围巾的鹈鹕在海边骑自行车的无边框内嵌 SVG 动画，包含旋转车轮、联动踏板、海浪、夕阳与飞翔海鸥</title>
<style>
  @keyframes pl-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pl-counter-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes pl-bob {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-4.5px) rotate(-0.8deg); }
  }
  @keyframes pl-wing {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(-5.5deg); }
  }
  @keyframes pl-pouch {
    0%, 100% { transform: scaleY(1) rotate(0deg); }
    50% { transform: scaleY(1.06) rotate(1.2deg); }
  }
  @keyframes pl-scarf {
    0%, 100% { transform: rotate(0deg) skewY(0deg); }
    50% { transform: rotate(5deg) skewY(-3deg); }
  }
  @keyframes pl-wave-a {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(-22px); }
  }
  @keyframes pl-wave-b {
    0%, 100% { transform: translateX(0px); }
    50% { transform: translateX(26px); }
  }
  @keyframes pl-dash {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: 96; }
  }
  @keyframes pl-gull {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  .pl-wheel-rear {
    transform-origin: 310px 232px;
    animation: pl-spin 1.5s linear infinite;
  }
  .pl-wheel-front {
    transform-origin: 540px 232px;
    animation: pl-spin 1.5s linear infinite;
  }
  .pl-crank {
    transform-origin: 410px 232px;
    animation: pl-spin 1.5s linear infinite;
  }
  .pl-pedal-a {
    transform-origin: 410px 206px;
    animation: pl-counter-spin 1.5s linear infinite;
  }
  .pl-pedal-b {
    transform-origin: 410px 258px;
    animation: pl-counter-spin 1.5s linear infinite;
  }
  .pl-body-bob {
    transform-origin: 410px 150px;
    animation: pl-bob 0.75s ease-in-out infinite;
  }
  .pl-wing-anim {
    transform-origin: 405px 132px;
    animation: pl-wing 0.75s ease-in-out infinite;
  }
  .pl-pouch-anim {
    transform-origin: 472px 76px;
    animation: pl-pouch 0.75s ease-in-out infinite;
  }
  .pl-scarf-anim {
    transform-origin: 432px 112px;
    animation: pl-scarf 0.6s ease-in-out infinite;
  }
  .pl-wave-1 {
    animation: pl-wave-a 4.2s ease-in-out infinite;
  }
  .pl-wave-2 {
    animation: pl-wave-b 5.4s ease-in-out infinite;
  }
  .pl-road-flow {
    animation: pl-dash 0.9s linear infinite;
  }
  .pl-gull-1 {
    animation: pl-gull 2.8s ease-in-out infinite;
  }
  .pl-gull-2 {
    animation: pl-gull 3.4s ease-in-out infinite 0.9s;
  }
</style>

<defs>
  <linearGradient id="pl-sun-grad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" style="stop-color:var(--warning);stop-opacity:0.42"/>
    <stop offset="72%" style="stop-color:var(--danger);stop-opacity:0.15"/>
    <stop offset="100%" style="stop-color:var(--warning);stop-opacity:0"/>
  </linearGradient>
  <linearGradient id="pl-pouch-grad" x1="0" y1="0" x2="0.2" y2="1">
    <stop offset="0%" style="stop-color:var(--warning);stop-opacity:0.95"/>
    <stop offset="100%" style="stop-color:var(--danger);stop-opacity:0.75"/>
  </linearGradient>
  <clipPath id="pl-sun-clip">
    <rect x="60" y="0" width="320" height="202"/>
  </clipPath>
</defs>

<!-- 1. 远景：海平线落日与云丝（无外框，自然融入页面背景） -->
<g clip-path="url(#pl-sun-clip)">
  <circle cx="210" cy="198" r="96" fill="url(#pl-sun-grad)"/>
  <circle cx="210" cy="198" r="64" style="fill:var(--warning);fill-opacity:0.22"/>
</g>

<!-- 远方海鸥 -->
<g class="pl-gull-1" fill="none" stroke-width="1.8" stroke-linecap="round" style="stroke:var(--fg-muted)">
  <path d="M 145 78 Q 155 68 164 76 Q 173 68 183 78"/>
</g>
<g class="pl-gull-2" fill="none" stroke-width="1.5" stroke-linecap="round" style="stroke:var(--fg-subtle)">
  <path d="M 248 56 Q 255 48 262 54 Q 269 48 276 56"/>
  <path d="M 650 72 Q 658 63 666 70 Q 674 63 682 72"/>
</g>

<!-- 远景流云 -->
<g fill="none" stroke-linecap="round" style="stroke:var(--line-strong)">
  <path d="M 96 112 H 168 M 122 120 H 196" stroke-width="1.6" stroke-opacity="0.7"/>
  <path d="M 590 92 H 684 M 626 100 H 712" stroke-width="1.6" stroke-opacity="0.6"/>
</g>

<!-- 2. 中景：海平面波浪与落日波光 -->
<line x1="40" y1="202" x2="840" y2="202" stroke-width="1.2" style="stroke:var(--line-strong)"/>

<!-- 落日海面碎金倒影 -->
<g stroke-linecap="round" style="stroke:var(--warning);stroke-opacity:0.45">
  <line x1="162" y1="210" x2="258" y2="210" stroke-width="2.2"/>
  <line x1="176" y1="219" x2="244" y2="219" stroke-width="1.8"/>
  <line x1="192" y1="228" x2="228" y2="228" stroke-width="1.5"/>
</g>

<g class="pl-wave-1" fill="none" stroke-width="1.8" stroke-linecap="round" style="stroke:var(--accent);stroke-opacity:0.55">
  <path d="M 56 218 Q 88 210 120 218 T 184 218 T 248 218 T 312 218 T 376 218 T 440 218 T 504 218 T 568 218 T 632 218 T 696 218 T 760 218 T 824 218"/>
</g>
<g class="pl-wave-2" fill="none" stroke-width="1.5" stroke-linecap="round" style="stroke:var(--accent);stroke-opacity:0.35">
  <path d="M 34 234 Q 70 226 106 234 T 178 234 T 250 234 T 322 234 T 394 234 T 466 234 T 538 234 T 610 234 T 682 234 T 754 234 T 826 234"/>
</g>

<!-- 3. 近景：海滨骑行道与流动速度线 -->
<line x1="16" y1="286" x2="864" y2="286" stroke-width="2" stroke-linecap="round" style="stroke:var(--line-strong)"/>
<line class="pl-road-flow" x1="24" y1="298" x2="856" y2="298" stroke-width="1.8" stroke-dasharray="18 30" stroke-linecap="round" style="stroke:var(--fg-subtle);stroke-opacity:0.55"/>
<line class="pl-road-flow" x1="80" y1="308" x2="800" y2="308" stroke-width="1.2" stroke-dasharray="8 40" stroke-linecap="round" style="stroke:var(--fg-subtle);stroke-opacity:0.35"/>

<!-- 车底投影 -->
<ellipse cx="425" cy="286" rx="165" ry="5" style="fill:var(--fg);fill-opacity:0.08"/>

<!-- 4. 后侧鹈鹕左腿（随踏板与身体自然衔接） -->
<g fill="none" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--warning);opacity:0.75">
  <path d="M 382 152 L 424 182 L 410 206"/>
</g>

<!-- 5. 自行车：后轮 (310, 232) 与 前轮 (540, 232)，半径 r=52 -->
<g class="pl-wheel-rear">
  <circle cx="310" cy="232" r="52" fill="none" stroke-width="5.5" style="stroke:var(--fg)"/>
  <circle cx="310" cy="232" r="46" fill="none" stroke-width="1.6" style="stroke:var(--line-strong)"/>
  <g stroke-width="1.2" style="stroke:var(--fg-subtle)">
    <line x1="258" y1="232" x2="362" y2="232"/>
    <line x1="310" y1="180" x2="310" y2="284"/>
    <line x1="273" y1="195" x2="347" y2="269"/>
    <line x1="347" y1="195" x2="273" y2="269"/>
    <line x1="262" y1="212" x2="358" y2="252"/>
    <line x1="290" y1="184" x2="330" y2="280"/>
  </g>
  <!-- 气门嘴与反光片，让旋转清晰可见 -->
  <circle cx="310" cy="196" r="3.5" style="fill:var(--warning)"/>
  <circle cx="310" cy="268" r="2.5" style="fill:var(--accent)"/>
  <circle cx="310" cy="232" r="7" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.5"/>
</g>

<g class="pl-wheel-front">
  <circle cx="540" cy="232" r="52" fill="none" stroke-width="5.5" style="stroke:var(--fg)"/>
  <circle cx="540" cy="232" r="46" fill="none" stroke-width="1.6" style="stroke:var(--line-strong)"/>
  <g stroke-width="1.2" style="stroke:var(--fg-subtle)">
    <line x1="488" y1="232" x2="592" y2="232"/>
    <line x1="540" y1="180" x2="540" y2="284"/>
    <line x1="503" y1="195" x2="577" y2="269"/>
    <line x1="577" y1="195" x2="503" y2="269"/>
    <line x1="492" y1="212" x2="588" y2="252"/>
    <line x1="520" y1="184" x2="560" y2="280"/>
  </g>
  <circle cx="540" cy="196" r="3.5" style="fill:var(--warning)"/>
  <circle cx="540" cy="268" r="2.5" style="fill:var(--accent)"/>
  <circle cx="540" cy="232" r="7" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.5"/>
</g>

<!-- 链条与后飞轮 -->
<path d="M 310 225 L 410 216 L 410 248 L 310 239 Z" fill="none" stroke-width="1.6" stroke-dasharray="3 2" style="stroke:var(--fg-muted)"/>

<!-- 自行车经典菱形车架 (Diamond Frame) -->
<g fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--accent)">
  <!-- 后下叉 Chainstay & 后上叉 Seatstay -->
  <line x1="310" y1="232" x2="410" y2="232"/>
  <line x1="310" y1="232" x2="372" y2="156"/>
  <!-- 立管 Seat tube -->
  <line x1="410" y1="232" x2="372" y2="156"/>
  <!-- 下管 Down tube -->
  <line x1="410" y1="232" x2="494" y2="152"/>
  <!-- 上管 Top tube -->
  <line x1="372" y1="156" x2="490" y2="144"/>
  <!-- 前叉 Front fork -->
  <path d="M 488 136 L 496 156 L 540 232"/>
</g>

<!-- 坐管、复古皮质坐垫与车把 -->
<line x1="372" y1="156" x2="365" y2="140" stroke-width="4" stroke-linecap="round" style="stroke:var(--fg-muted)"/>
<path d="M 346 138 Q 365 133 384 140 Q 374 147 350 145 Z" style="fill:var(--fg);stroke:var(--fg);stroke-width:1.5;stroke-linejoin:round"/>
<path d="M 488 136 L 482 114 L 462 112" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--fg-muted)"/>
<path d="M 454 112 H 468" fill="none" stroke-width="6.5" stroke-linecap="round" style="stroke:var(--fg)"/>
<!-- 车头小车灯 -->
<path d="M 492 126 L 502 122 L 502 132 Z" style="fill:var(--warning)"/>
<path d="M 504 123 L 548 112 L 548 138 L 504 131 Z" style="fill:var(--warning);fill-opacity:0.16"/>

<!-- 6. 鹈鹕前侧右腿与蹼足 -->
<g class="pl-body-bob">
  <!-- 右腿大腿与小腿 -->
  <path d="M 380 148 L 392 198 L 410 256" fill="none" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--warning)"/>
  <!-- 踩在下方踏板上的橙色大蹼足 -->
  <path d="M 402 256 L 424 252 L 420 260 L 400 260 Z" style="fill:var(--warning);stroke:var(--warning);stroke-width:1.5;stroke-linejoin:round"/>
</g>

<!-- 牙盘、曲柄与始终保持水平的脚踏板 -->
<g class="pl-crank">
  <circle cx="410" cy="232" r="16" fill="none" stroke-width="3" style="stroke:var(--fg)"/>
  <circle cx="410" cy="232" r="11" style="fill:var(--surface);stroke:var(--fg-muted);stroke-width:1.5"/>
  <!-- 上下曲柄臂 -->
  <line x1="410" y1="206" x2="410" y2="258" stroke-width="3.8" stroke-linecap="round" style="stroke:var(--fg)"/>
  <circle cx="410" cy="232" r="4.5" style="fill:var(--fg)"/>
  <!-- 踏板 A (上方) -->
  <g class="pl-pedal-a">
    <rect x="399" y="202.5" width="22" height="7" rx="3" style="fill:var(--fg)"/>
    <rect x="403" y="204.5" width="14" height="3" rx="1" style="fill:var(--warning)"/>
  </g>
  <!-- 踏板 B (下方) -->
  <g class="pl-pedal-b">
    <rect x="399" y="254.5" width="22" height="7" rx="3" style="fill:var(--fg)"/>
    <rect x="403" y="256.5" width="14" height="3" rx="1" style="fill:var(--warning)"/>
  </g>
</g>

<!-- 7. 鹈鹕主角：随骑行节奏轻快起伏 -->
<g class="pl-body-bob">
  <!-- 迎风飘动的红色领巾 -->
  <path class="pl-scarf-anim" d="M 432 108 Q 395 110 368 100 Q 344 90 324 102 L 330 116 Q 350 106 374 115 Q 402 124 430 118 Z" style="fill:var(--danger)"/>

  <!-- 尾羽 -->
  <path d="M 352 136 L 322 124 L 330 136 L 318 142 L 348 146 Z" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.2;stroke-linejoin:round"/>

  <!-- 浑圆的鹈鹕躯干 -->
  <path d="M 346 136 C 344 104 388 92 426 106 C 446 114 452 138 434 152 C 412 166 356 162 346 136 Z" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.5"/>

  <!-- 腹部阴影层次 -->
  <path d="M 356 144 C 376 158 416 158 434 144 C 420 160 372 162 356 144 Z" style="fill:var(--fg-subtle);fill-opacity:0.18"/>

  <!-- S 形修长脖颈与头部 -->
  <path d="M 420 114 C 430 98 424 76 432 58 C 438 44 458 42 466 54 C 472 62 468 74 456 80 C 446 88 448 106 438 122 Z" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.5;stroke-linejoin:round"/>

  <!-- 后脑勺呆毛羽冠 -->
  <path d="M 434 52 L 418 42 L 426 54 L 414 52 L 429 60" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--fg)"/>

  <!-- 脖环系带 -->
  <path d="M 424 108 Q 434 114 443 108" fill="none" stroke-width="5.5" stroke-linecap="round" style="stroke:var(--danger)"/>

  <!-- 标志性巨大喉囊 (Gular Pouch) 与长喙 -->
  <g class="pl-pouch-anim">
    <!-- 下方鼓起的弹性大喉囊 -->
    <path d="M 458 66 C 464 102 516 108 552 72 C 520 68 486 66 458 66 Z" fill="url(#pl-pouch-grad)" style="stroke:var(--fg);stroke-width:2.2;stroke-linejoin:round"/>
    <!-- 喉囊内部纹理折线 -->
    <path d="M 468 76 Q 502 92 536 73" fill="none" stroke-width="1.3" stroke-linecap="round" style="stroke:var(--fg);stroke-opacity:0.35"/>
    <!-- 喉囊里偷藏的一条小鱼尾巴（彩蛋细节） -->
    <path d="M 536 69 L 548 59 L 545 67 L 553 71 L 538 72 Z" style="fill:var(--accent);stroke:var(--fg);stroke-width:1.4;stroke-linejoin:round"/>
    <!-- 上颚长直鸟喙与前端小钩 -->
    <path d="M 460 56 L 554 64 C 561 65 562 72 556 75 L 551 71 L 458 66 Z" style="fill:var(--warning);stroke:var(--fg);stroke-width:2.2;stroke-linejoin:round"/>
  </g>

  <!-- 眼睛与神态（专注看前方海滨路） -->
  <circle cx="452" cy="57" r="5" style="fill:var(--surface);stroke:var(--fg);stroke-width:2"/>
  <circle cx="454" cy="57" r="2.3" style="fill:var(--fg)"/>
  <circle cx="455" cy="56" r="0.9" style="fill:var(--surface)"/>

  <!-- 搭在车把上的主翼与飞羽 -->
  <g class="pl-wing-anim">
    <path d="M 382 114 C 408 106 438 106 460 112 C 454 126 432 132 406 134 C 384 136 372 126 382 114 Z" style="fill:var(--surface);stroke:var(--fg);stroke-width:2.4;stroke-linejoin:round"/>
    <path d="M 390 122 Q 418 122 446 116" fill="none" stroke-width="1.8" stroke-linecap="round" style="stroke:var(--fg-muted)"/>
    <path d="M 396 129 Q 418 129 436 124" fill="none" stroke-width="1.6" stroke-linecap="round" style="stroke:var(--fg-subtle)"/>
  </g>
</g>
</svg>
</div>
<figcaption>纯手写内联 SVG 动画：海边骑自行车的鹈鹕（嘴里还顺手兜了一条鱼），无外层边框容器，直接融入页面上下文并跟随亮暗主题自适应</figcaption>
</figure>

你可以通过右键“检查”上面这只骑车的鹈鹕——它根本不是什么 `.gif` 动图或视频文件，而是直接嵌在网页里的几十行 XML 标签与 CSS 关键帧。

如果你用文本编辑器打开一张 `.png` 或 `.jpg` 图片，屏幕上只会冒出一堆看不懂的乱码，因为它们存的是压缩后的二进制像素矩阵；但如果你用编辑器打开一张 `.svg` 图片，看到的却是一段结构整齐的 XML 标签。和我们前两篇聊过的 [JSON](/posts/post-20261105/)、[YAML 与 TOML](/posts/post-20261106/) 一样，**它是纯文本的**：人眼能直接读，Git 能按行对比差异，用脚本或大模型也能现场拼出来。

SVG 的全称是 **Scalable Vector Graphics（可缩放矢量图形）**，它是 W3C 制定的基于 XML 的二维矢量图形标准[^2]。无论是网页上的图标和 Logo、数据可视化里的折线图，还是技术文章里的架构示意图（包括本站几乎所有的技术配图），背后基本都是它。

这一篇作为“编程知识扫盲”系列的第三篇，不要求你先学过前端或设计软件。我们按**底层原理、核心语法、工程落地**的顺序，把 SVG 从头到尾理一遍。

## 位图和矢量图

在聊 SVG 语法之前，我们需要先搞清楚计算机表示图像的两种截然不同的思路：**位图（Raster）**与**矢量图（Vector）**。

PNG、JPEG、WebP 这些常见图片格式都属于**位图**。它们本质上是一张巨大的二维网格，记录网格里每一个像素点应该显示什么颜色。一张 $1920 \times 1080$ 的图片，无论画面内容是一张复杂的风景照，还是白底上的一个黑色圆环，它都要老老实实记录超过两百万个像素格的信息。当你不断放大位图时，每个像素格跟着变宽，边缘就会露出阶梯状的锯齿，或者糊成一片。

**矢量图**走的是另一条路。SVG 不记录“第 120 行第 88 列的格子是什么颜色”，它直接用数学几何公式描述画面：**在坐标 `(132, 88)` 处画一个半径为 `56` 的圆环，线宽 `14`，绿色描边**。屏幕渲染这张图时，渲染引擎会根据当前屏幕的物理分辨率和缩放倍率，在最后一步现场把这些几何描述光栅化（栅格化）成像素点。

<figure class="db-figure">
<div class="db-scroll">
<svg viewBox="0 0 920 340" width="100%" role="img" style="max-width:920px;height:auto;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
<title>位图与矢量图放大后的对比：位图由离散像素格子组成，放大后出现锯齿；矢量图由数学几何公式描述，任意放大边缘都清晰锐利</title>
<g>
<rect x="44" y="18" width="84" height="26" rx="13" style="fill:var(--warning);fill-opacity:0.14;stroke:var(--warning);stroke-width:1.2"/>
<text x="86" y="36" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--warning)">位图 Raster</text>
<text x="140" y="36" font-size="14" font-weight="600" style="fill:var(--fg)">PNG / JPEG / WebP</text>
<g transform="translate(98, 62)">
<rect width="264" height="176" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2"/>
<g style="fill:var(--accent)">
<rect x="110" y="22" width="22" height="22"/>
<rect x="132" y="22" width="22" height="22"/>
<rect x="154" y="22" width="22" height="22"/>
<rect x="88" y="44" width="22" height="22"/>
<rect x="176" y="44" width="22" height="22"/>
<rect x="66" y="66" width="22" height="22"/>
<rect x="198" y="66" width="22" height="22"/>
<rect x="66" y="88" width="22" height="22"/>
<rect x="198" y="88" width="22" height="22"/>
<rect x="88" y="110" width="22" height="22"/>
<rect x="176" y="110" width="22" height="22"/>
<rect x="110" y="132" width="22" height="22"/>
<rect x="132" y="132" width="22" height="22"/>
<rect x="154" y="132" width="22" height="22"/>
</g>
<g style="fill:var(--accent);fill-opacity:0.32">
<rect x="88" y="22" width="22" height="22"/>
<rect x="176" y="22" width="22" height="22"/>
<rect x="66" y="44" width="22" height="22"/>
<rect x="198" y="44" width="22" height="22"/>
<rect x="66" y="110" width="22" height="22"/>
<rect x="198" y="110" width="22" height="22"/>
<rect x="88" y="132" width="22" height="22"/>
<rect x="176" y="132" width="22" height="22"/>
</g>
<g style="stroke:var(--line);stroke-width:1">
<path d="M22 0 V176 M44 0 V176 M66 0 V176 M88 0 V176 M110 0 V176 M132 0 V176 M154 0 V176 M176 0 V176 M198 0 V176 M220 0 V176 M242 0 V176"/>
<path d="M0 22 H264 M0 44 H264 M0 66 H264 M0 88 H264 M0 110 H264 M0 132 H264 M0 154 H264"/>
</g>
</g>
<text x="230" y="272" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--fg)">按网格记录每个像素点的颜色值</text>
<text x="230" y="296" text-anchor="middle" font-size="12.5" style="fill:var(--fg-muted)">放大后像素块暴露，边缘出现锯齿，分辨率越高体积越大</text>
<line x1="460" y1="24" x2="460" y2="310" style="stroke:var(--line);stroke-width:1.2"/>
<circle cx="460" cy="150" r="18" style="fill:var(--surface);stroke:var(--line-strong);stroke-width:1.4"/>
<text x="460" y="155" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--fg-muted)">VS</text>
<rect x="504" y="18" width="90" height="26" rx="13" style="fill:var(--success);fill-opacity:0.14;stroke:var(--success);stroke-width:1.2"/>
<text x="549" y="36" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--success)">矢量 Vector</text>
<text x="606" y="36" font-size="14" font-weight="600" style="fill:var(--fg)">SVG</text>
<g transform="translate(558, 62)">
<rect width="264" height="176" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2"/>
<g style="stroke:var(--line);stroke-width:1">
<path d="M44 0 V176 M88 0 V176 M132 0 V176 M176 0 V176 M220 0 V176"/>
<path d="M0 44 H264 M0 88 H264 M0 132 H264"/>
</g>
<circle cx="132" cy="88" r="56" fill="none" style="stroke:var(--success);stroke-width:14"/>
<line x1="132" y1="88" x2="188" y2="88" stroke-width="1.8" stroke-dasharray="4 3" style="stroke:var(--warning)"/>
<circle cx="132" cy="88" r="4" style="fill:var(--warning)"/>
<circle cx="188" cy="88" r="3.5" style="fill:var(--warning)"/>
<text x="160" y="80" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--warning);font-family:var(--font-mono)">r="56"</text>
<text x="132" y="109" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted);font-family:var(--font-mono)">(cx, cy)</text>
</g>
<text x="690" y="272" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--fg)">按几何公式描述形状，渲染时现场光栅化</text>
<text x="690" y="296" text-anchor="middle" font-size="12.5" style="fill:var(--fg-muted)">任意缩放边缘始终平滑，体积只取决于图形的复杂程度</text>
</g>
</svg>
</div>
<figcaption>位图与矢量图对比：位图记录离散像素网格，放大后出现锯齿；矢量图用数学公式描述几何形状，任意缩放始终锐利</figcaption>
</figure>

这两种底层思路决定了它们各自统治的领地：

| 对比维度 | 位图（PNG / JPEG / WebP） | 矢量图（SVG） |
| --- | --- | --- |
| 存储内容 | 像素网格上的颜色值 | 几何图形、路径与样式的 XML 描述 |
| 放大表现 | 暴露像素块，边缘出现锯齿或模糊 | 重新按公式渲染，任意倍率都保持锐利 |
| 文件体积决定因素 | 图像宽高像素数与压缩率 | 图形元素数量与路径复杂程度 |
| 文本与版本控制 | 二进制文件，无法直接阅读或做文本 diff | 纯文本 XML，可直接编辑、检索与 Git diff |
| 适用场景 | 照片、写实插画、像素级复杂光影纹理 | 图标、Logo、图表、示意图、UI 装饰元素 |

> [!NOTE]
> 矢量图不是万能的。如果你要把一张单反相机拍的人像照片强行转成 SVG，图像里数百万个细微的色彩过渡会被拆成几十万个碎裂的多边形——不仅文件体积会暴涨到几十 MB，浏览器渲染时也会因为算不过来而直接卡死。**照片老老实实用 JPEG、WebP 或 AVIF，几何图形与图表才交给 SVG。**

## SVG 的本质：一份 XML 文档

前面我们在[《嗨，杰森（json）》](/posts/post-20261105/)里提过 XML，也就是“用成对尖括号标签描述树形结构”的标记语言，**SVG 正是 XML 家族的一员**。

一个最小的可独立打开的 SVG 文件长这样：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
  <rect x="10" y="10" width="180" height="100" rx="12" fill="#eaf0fa" stroke="#3b6fc2" stroke-width="2" />
  <circle cx="100" cy="60" r="30" fill="#2f7d55" />
</svg>
```

在我们动手写 SVG 前，有三条基本规矩需要一开始就立住，写着才能不烧心：

1. **命名空间 `xmlns` 不能丢**：如果这是一个单独保存的 `.svg` 文件，或者通过 `<img>` 标签引入，根元素 `<svg>` 上必须带上 `xmlns="http://www.w3.org/2000/svg"`，否则浏览器只会把它当成普通 XML 文档树，不会按图形渲染。只有直接把 `<svg>` 内联写进 HTML5 文档里时，HTML 解析器才会自动补全命名空间，此时可以省略 `xmlns`[^3]。
2. **严格遵守 XML 语法**：标签名和属性名区分大小写（比如 `viewBox` 的 `B`、`linearGradient` 的 `G` 必须大写），所有属性值都必须加引号，没有子节点的标签必须自闭合（`/>`）或者成对闭合。
3. **画家模型（Painter's Model）**：SVG 没有 CSS 里的 `z-index` 层级属性。**谁写在文档前面谁就先画，谁写在后面谁就盖在上面**[^4]，就像油画家往画布上一层一层叠颜料一样。比如开头那只骑车的鹈鹕，必须先画落日和海浪、再画左腿、接着画车架、最后画躯干和右腿，顺序一旦颠倒，车架就会诡异地横穿在鸟肚子外面。

## 坐标系、width/height 与 viewBox

写 SVG 最容易让人犯迷糊的往往不是画圆画线，而是搞不清“画面为什么突然被裁掉一半”或者“为什么改了尺寸图却没跟着放大”——这多半是因为混淆了两个概念：**外部视口（Viewport）**与**内部画布坐标系（viewBox）**[^5]。

### 1. 左上角向右下延展的坐标系

和数学课本里 $y$ 轴朝上的笛卡尔坐标系不同，计算机图形学与浏览器屏幕采用的是**左上角原点坐标系**：

- 原点 `(0, 0)` 在画布最左上角。
- `x` 轴正方向向右，数值越大越靠右。
- `y` 轴正方向向下，数值越大越靠下。
- 旋转角度按**顺时针**方向递增。

### 2. 视口和 `viewBox` 的分工

你可以把 SVG 想象成**一扇窗**和窗外的**一张世界地图**：

- `width` 和 `height`（或者 CSS 给 `<svg>` 设置的宽高）决定了**窗户有多大**，也就是它在网页布局里实际占据多少像素空间。
- `viewBox="min-x min-y width height"` 决定了**窗户对准了地图的哪一块区域**。

比如 `viewBox="0 0 100 100"` 的意思是：从内部坐标 `(0, 0)` 开始，截取宽 `100` 单位、高 `100` 单位的正方形区域，作为要展示的画布内容。至于这 `100` 个内部逻辑单位最终在屏幕上占 `24px` 还是 `480px`，完全由外层的 `width`/`height` 或 CSS 决定——内部所有坐标都会自动等比换算，不需要你改任何一行图形数字。

> [!TIP]
> 在响应式网页里，最稳妥的写法是**始终保留 `viewBox`**。如果你只写 `width="200" height="200"` 而漏掉 `viewBox`，哪怕后续用 CSS 把 `<svg>` 强行拉成 `width: 100%`，里面的图形也不会跟着缩放，只会在变大的框里孤零零地缩在左上角。

### 3. 宽高比对不上怎么办：preserveAspectRatio

如果内部画布 `viewBox` 是 `1:1` 的正方形，外层容器却是一个扁长的矩形，SVG 怎么把正方形塞进扁框里？这由根元素上的 `preserveAspectRatio` 属性控制，最常用的有三种模式：

- **`xMidYMid meet`（默认值）**：保持纵横比完整装下整个 `viewBox`，居中对齐，多余的空间留白，效果类似 CSS 的 `object-fit: contain`。
- **`xMidYMid slice`**：保持纵横比填满整个容器，把超出边界的部分裁掉，效果类似 CSS 的 `object-fit: cover`。
- **`none`**：放弃保持纵横比，直接把画面强行拉扁或拉长以贴合容器，效果类似 CSS 的 `object-fit: fill`。

<figure class="db-figure">
<div class="db-scroll">
<svg viewBox="0 0 920 370" width="100%" role="img" style="max-width:920px;height:auto;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
<title>SVG 坐标系方向与 preserveAspectRatio 三种适配模式示意图</title>
<defs>
<marker id="svg02-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
<path d="M0 1 L9 5 L0 9 z" style="fill:var(--fg-muted)"/>
</marker>
<clipPath id="svg02-slice-clip">
<rect x="0" y="0" width="140" height="72" rx="6"/>
</clipPath>
</defs>
<g>
<text x="28" y="34" font-size="16" font-weight="700" style="fill:var(--fg)">1. 坐标系方向</text>
<text x="28" y="56" font-size="12.5" style="fill:var(--fg-muted)">原点在左上角，x 向右增大，y 向下增大</text>
<g transform="translate(64, 86)">
<rect x="0" y="0" width="260" height="200" style="fill:var(--surface-2);stroke:var(--line);stroke-width:1"/>
<g style="stroke:var(--line);stroke-width:1">
<path d="M52 0 V200 M104 0 V200 M156 0 V200 M208 0 V200"/>
<path d="M0 50 H260 M0 100 H260 M0 150 H260"/>
</g>
<line x1="0" y1="0" x2="274" y2="0" stroke-width="2" marker-end="url(#svg02-arrow)" style="stroke:var(--fg-muted)"/>
<line x1="0" y1="0" x2="0" y2="214" stroke-width="2" marker-end="url(#svg02-arrow)" style="stroke:var(--fg-muted)"/>
<circle cx="0" cy="0" r="4.5" style="fill:var(--accent)"/>
<text x="-8" y="-10" font-size="12" font-weight="700" style="fill:var(--accent-strong);font-family:var(--font-mono)">(0, 0)</text>
<text x="278" y="5" font-size="13" font-weight="700" style="fill:var(--fg-muted);font-family:var(--font-mono)">x+</text>
<text x="-6" y="232" font-size="13" font-weight="700" style="fill:var(--fg-muted);font-family:var(--font-mono)">y+</text>
<line x1="104" y1="0" x2="104" y2="50" stroke-width="1.3" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<line x1="0" y1="50" x2="104" y2="50" stroke-width="1.3" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<rect x="104" y="50" width="104" height="75" rx="8" stroke-width="2" style="fill:var(--accent-soft);stroke:var(--accent)"/>
<circle cx="104" cy="50" r="4" style="fill:var(--warning)"/>
<text x="156" y="84" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">x="100" y="50"</text>
<text x="156" y="104" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted);font-family:var(--font-mono)">w="100" h="75"</text>
<text x="104" y="-8" text-anchor="middle" font-size="11" style="fill:var(--fg-subtle);font-family:var(--font-mono)">100</text>
<text x="-10" y="54" text-anchor="end" font-size="11" style="fill:var(--fg-subtle);font-family:var(--font-mono)">50</text>
</g>
<line x1="414" y1="20" x2="414" y2="346" style="stroke:var(--line);stroke-width:1"/>
<text x="442" y="34" font-size="16" font-weight="700" style="fill:var(--fg)">2. 宽高比不同时的三种适配模式</text>
<text x="442" y="56" font-size="12.5" style="fill:var(--fg-muted)">正方形画布 viewBox="0 0 100 100" 放进宽扁容器（160 × 72）</text>
<g transform="translate(442, 92)">
<text x="46" y="-8" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--fg-muted)">原画布 1:1</text>
<rect x="0" y="0" width="92" height="92" rx="8" stroke-width="1.4" stroke-dasharray="4 3" style="fill:var(--surface-2);stroke:var(--line-strong)"/>
<circle cx="46" cy="46" r="36" stroke-width="2.4" style="fill:var(--success);fill-opacity:0.14;stroke:var(--success)"/>
<circle cx="34" cy="38" r="4" style="fill:var(--fg)"/>
<circle cx="58" cy="38" r="4" style="fill:var(--fg)"/>
<path d="M32 54 Q46 66 60 54" fill="none" stroke-width="2.4" stroke-linecap="round" style="stroke:var(--fg)"/>
<text x="46" y="114" text-anchor="middle" font-size="11.5" style="fill:var(--fg-subtle);font-family:var(--font-mono)">0 0 100 100</text>
</g>
<path d="M542 138 H564 M564 118 V286 M564 118 H584 M564 202 H584 M564 286 H584" fill="none" stroke-width="1.6" style="stroke:var(--line-strong)"/>
<g transform="translate(590, 82)">
<rect x="0" y="0" width="140" height="72" rx="6" stroke-width="1.5" style="fill:var(--surface-2);stroke:var(--line-strong)"/>
<circle cx="70" cy="36" r="28" stroke-width="2" style="fill:var(--success);fill-opacity:0.14;stroke:var(--success)"/>
<circle cx="61" cy="30" r="3" style="fill:var(--fg)"/>
<circle cx="79" cy="30" r="3" style="fill:var(--fg)"/>
<path d="M59 42 Q70 51 81 42" fill="none" stroke-width="2" stroke-linecap="round" style="stroke:var(--fg)"/>
<text x="154" y="26" font-size="13" font-weight="700" style="fill:var(--success);font-family:var(--font-mono)">meet（默认）</text>
<text x="154" y="46" font-size="12" style="fill:var(--fg-muted)">完整装下，等比留白</text>
<text x="154" y="63" font-size="11" style="fill:var(--fg-subtle)">类似 object-fit: contain</text>
</g>
<g transform="translate(590, 166)">
<rect x="0" y="0" width="140" height="72" rx="6" stroke-width="1.5" style="fill:var(--surface-2);stroke:var(--line-strong)"/>
<g clip-path="url(#svg02-slice-clip)">
<circle cx="70" cy="36" r="56" stroke-width="3" style="fill:var(--accent-soft);stroke:var(--accent)"/>
<circle cx="51" cy="24" r="5.5" style="fill:var(--fg)"/>
<circle cx="89" cy="24" r="5.5" style="fill:var(--fg)"/>
<path d="M48 48 Q70 66 92 48" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--fg)"/>
</g>
<rect x="0" y="0" width="140" height="72" rx="6" fill="none" stroke-width="1.5" style="stroke:var(--line-strong)"/>
<text x="154" y="26" font-size="13" font-weight="700" style="fill:var(--accent-strong);font-family:var(--font-mono)">slice</text>
<text x="154" y="46" font-size="12" style="fill:var(--fg-muted)">铺满容器，裁掉溢出</text>
<text x="154" y="63" font-size="11" style="fill:var(--fg-subtle)">类似 object-fit: cover</text>
</g>
<g transform="translate(590, 250)">
<rect x="0" y="0" width="140" height="72" rx="6" stroke-width="1.5" style="fill:var(--surface-2);stroke:var(--line-strong)"/>
<ellipse cx="70" cy="36" rx="56" ry="28" stroke-width="2" style="fill:var(--warning);fill-opacity:0.14;stroke:var(--warning)"/>
<ellipse cx="51" cy="30" rx="5.5" ry="3" style="fill:var(--fg)"/>
<ellipse cx="89" cy="30" rx="5.5" ry="3" style="fill:var(--fg)"/>
<path d="M49 43 Q70 52 91 43" fill="none" stroke-width="2" stroke-linecap="round" style="stroke:var(--fg)"/>
<text x="154" y="26" font-size="13" font-weight="700" style="fill:var(--warning);font-family:var(--font-mono)">none</text>
<text x="154" y="46" font-size="12" style="fill:var(--fg-muted)">不保比例，强行拉伸</text>
<text x="154" y="63" font-size="11" style="fill:var(--fg-subtle)">类似 object-fit: fill</text>
</g>
</g>
</svg>
</div>
<figcaption>SVG 坐标系方向与 preserveAspectRatio 三种适配模式示意图</figcaption>
</figure>

上面的 `xMidYMid` 还可以拆成不同的对齐组合，比如 `xMinYMin meet` 表示“完整装下并紧贴左上角”，`xMaxYMax meet` 表示“紧贴右下角”。日常绝大多数场景保持默认的 `xMidYMid meet` 就够了。

## 六种基本几何图形

W3C 为 SVG 内置了六种最常用的基本几何图元，不用写复杂的曲线命令，就能拼出大量界面图标和结构图（比如前面鹈鹕自行车的两个车轮 `<circle>`、菱形车架 `<line>` 和脚踏板 `<rect>`）：

<figure class="db-figure">
<div class="db-scroll">
<svg viewBox="0 0 920 400" width="100%" role="img" style="max-width:920px;height:auto;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
<title>SVG 六种基本几何图形及关键定位属性参考图：rect、circle、ellipse、line、polyline、polygon</title>
<g>
<g transform="translate(20, 16)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;rect&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">矩形与圆角矩形</text>
<rect x="74" y="56" width="132" height="76" rx="14" stroke-width="2.2" style="fill:var(--accent-soft);stroke:var(--accent)"/>
<circle cx="74" cy="56" r="4" style="fill:var(--warning)"/>
<text x="66" y="52" text-anchor="end" font-size="11" font-weight="600" style="fill:var(--warning);font-family:var(--font-mono)">(x, y)</text>
<text x="140" y="152" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted);font-family:var(--font-mono)">width, height, rx, ry</text>
<text x="140" y="99" text-anchor="middle" font-size="11.5" style="fill:var(--accent-strong);font-family:var(--font-mono)">rx="14"</text>
</g>
<g transform="translate(320, 16)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;circle&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">圆</text>
<circle cx="140" cy="94" r="42" stroke-width="2.2" style="fill:var(--success);fill-opacity:0.14;stroke:var(--success)"/>
<line x1="140" y1="94" x2="182" y2="94" stroke-width="1.8" stroke-dasharray="4 3" style="stroke:var(--warning)"/>
<circle cx="140" cy="94" r="4" style="fill:var(--warning)"/>
<text x="161" y="88" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--warning);font-family:var(--font-mono)">r</text>
<text x="140" y="112" text-anchor="middle" font-size="11" style="fill:var(--fg-muted);font-family:var(--font-mono)">(cx, cy)</text>
<text x="140" y="156" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted);font-family:var(--font-mono)">cx, cy, r</text>
</g>
<g transform="translate(620, 16)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;ellipse&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">椭圆</text>
<ellipse cx="140" cy="94" rx="64" ry="36" stroke-width="2.2" style="fill:var(--tier-elite);fill-opacity:0.14;stroke:var(--tier-elite)"/>
<line x1="140" y1="94" x2="204" y2="94" stroke-width="1.7" stroke-dasharray="4 3" style="stroke:var(--warning)"/>
<line x1="140" y1="94" x2="140" y2="58" stroke-width="1.7" stroke-dasharray="4 3" style="stroke:var(--warning)"/>
<circle cx="140" cy="94" r="4" style="fill:var(--warning)"/>
<text x="174" y="88" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--warning);font-family:var(--font-mono)">rx</text>
<text x="130" y="78" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--warning);font-family:var(--font-mono)">ry</text>
<text x="140" y="156" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted);font-family:var(--font-mono)">cx, cy, rx, ry</text>
</g>
<g transform="translate(20, 208)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;line&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">直线段</text>
<line x1="68" y1="120" x2="212" y2="66" stroke-width="3" stroke-linecap="round" style="stroke:var(--accent)"/>
<circle cx="68" cy="120" r="4.5" style="fill:var(--warning)"/>
<circle cx="212" cy="66" r="4.5" style="fill:var(--warning)"/>
<text x="68" y="138" text-anchor="middle" font-size="11" font-weight="600" style="fill:var(--warning);font-family:var(--font-mono)">(x1, y1)</text>
<text x="212" y="54" text-anchor="middle" font-size="11" font-weight="600" style="fill:var(--warning);font-family:var(--font-mono)">(x2, y2)</text>
<text x="140" y="160" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">需设置 stroke 才可见</text>
</g>
<g transform="translate(320, 208)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;polyline&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">开放折线</text>
<polyline points="56,118 108,66 156,110 224,60" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--success)"/>
<circle cx="56" cy="118" r="4" style="fill:var(--warning)"/>
<circle cx="108" cy="66" r="4" style="fill:var(--warning)"/>
<circle cx="156" cy="110" r="4" style="fill:var(--warning)"/>
<circle cx="224" cy="60" r="4" style="fill:var(--warning)"/>
<text x="140" y="156" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">起点与终点不自动闭合</text>
</g>
<g transform="translate(620, 208)">
<rect width="280" height="176" rx="12" stroke-width="1.2" style="fill:color-mix(in oklab, var(--surface-2) 45%, transparent);stroke:var(--line)"/>
<text x="18" y="28" font-size="14.5" font-weight="700" style="fill:var(--fg);font-family:var(--font-mono)">&lt;polygon&gt;</text>
<text x="262" y="28" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">闭合多边形</text>
<polygon points="140,50 192,80 174,130 106,130 88,80" stroke-width="2.4" stroke-linejoin="round" style="fill:var(--warning);fill-opacity:0.14;stroke:var(--warning)"/>
<circle cx="140" cy="50" r="3.5" style="fill:var(--warning)"/>
<circle cx="192" cy="80" r="3.5" style="fill:var(--warning)"/>
<circle cx="174" cy="130" r="3.5" style="fill:var(--warning)"/>
<circle cx="106" cy="130" r="3.5" style="fill:var(--warning)"/>
<circle cx="88" cy="80" r="3.5" style="fill:var(--warning)"/>
<text x="140" y="156" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">末点自动连回起点闭合</text>
</g>
</g>
</svg>
</div>
<figcaption>SVG 六种基本几何图形及关键定位属性参考图：rect、circle、ellipse、line、polyline、polygon</figcaption>
</figure>

把它们写进代码里非常直观：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160">
  <!-- 1. 矩形（rx 控制圆角半径，ry 省略时默认等于 rx） -->
  <rect x="20" y="30" width="90" height="60" rx="10" fill="#eaf0fa" stroke="#3b6fc2" stroke-width="2" />

  <!-- 2. 正圆（圆心坐标 cx, cy 与半径 r） -->
  <circle cx="170" cy="60" r="32" fill="#eaf5ee" stroke="#2f7d55" stroke-width="2" />

  <!-- 3. 椭圆（水平半轴 rx 与垂直半轴 ry） -->
  <ellipse cx="275" cy="60" rx="46" ry="26" fill="#f2ecfa" stroke="#7c56b8" stroke-width="2" />

  <!-- 4. 直线段（起点与终点，必须设置 stroke 否则看不见） -->
  <line x1="345" y1="90" x2="405" y2="30" stroke="#3b6fc2" stroke-width="3" stroke-linecap="round" />

  <!-- 5. 开放折线（成对坐标用逗号或空格分隔，默认有黑色填充，通常显式设 fill="none"） -->
  <polyline points="425,90 450,35 475,75 500,30" fill="none" stroke="#2f7d55" stroke-width="3" />

  <!-- 6. 闭合多边形（自动从最后一个点连回第一个点） -->
  <polygon points="550,25 585,55 572,95 528,95 515,55" fill="#fef3e6" stroke="#d97706" stroke-width="2" />
</svg>
```

但新手使用这六个元素时容易踩中两个小坑：

- **`<line>` 默认不可见**：所有 SVG 图形默认的 `fill` 都是黑色（`black`），默认的 `stroke` 都是无（`none`）。矩形和圆因为有内部面积，不写颜色也能看到黑块；但 `<line>` 是一条没有面积的线段，如果不写 `stroke`，它就在画布上完全隐形了。
- **`<polyline>` 记得写 `fill="none"`**：因为 `fill` 默认是黑色，如果你只想画一条绿色折线却忘了关掉填充，浏览器会把折线拐弯围出来的凹槽也涂成实心黑色。

## `<path>` 路径语法：SVG 真正的灵魂

上面六种基本图形虽然好用，但遇到鹈鹕的喉囊、S 形长脖子、平滑折线图或者地图边界时就不够用了。这时候就需要 SVG 最核心的元素 `<path>` 登场[^6]。

`<path>` 只有一个核心属性 `d`（data 的缩写），里面装的是一套极其紧凑的**虚拟画笔指令字符串**。你可以想象手里捏着一支笔在画布上移动，每个字母代表一个动作，后面的数字是坐标参数。

### 大小写决定绝对还是相对

所有路径指令都分大小写，规则完全统一：

- **大写字母**表示**绝对坐标**：直接落笔到画布的 `(x, y)` 位置。
- **小写字母**表示**相对偏移**：从当前画笔所在位置出发，水平偏移 `dx`，垂直偏移 `dy`。

### 1. 直线类指令

| 指令 | 名称 | 参数 | 含义 |
| --- | --- | --- | --- |
| `M` / `m` | MoveTo | `x y` | 抬笔移动到目标点，不画线，通常作为路径开头 |
| `L` / `l` | LineTo | `x y` | 从当前点画一条直线段到 `(x, y)` |
| `H` / `h` | Horizontal LineTo | `x` | 保持 `y` 不变，水平画线到 `x` |
| `V` / `v` | Vertical LineTo | `y` | 保持 `x` 不变，垂直画线到 `y` |
| `Z` / `z` | ClosePath | 无参数 | 从当前点画直线回到当前子路径的起点，闭合图形 |

例如 `d="M10 10 H90 V60 H10 Z"` 就是用路径手写出来的 `80 × 50` 矩形。

> [!NOTE]
> `Z` 和直接用 `L` 连回起点并不完全等价。用 `Z` 闭合时，起点和终点的拐角会正常应用 `stroke-linejoin`（比如圆角或斜接），看起来是一体成型的闭环；如果只是用 `L` 回到原点而不写 `Z`，两条线段的接头处可能会留下一个细微的缺口。

### 2. 曲线与圆弧指令

<figure class="db-figure">
<div class="db-scroll">
<svg viewBox="0 0 920 376" width="100%" role="img" style="max-width:920px;height:auto;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
<title>SVG path 路径里的二次贝塞尔曲线 Q、三次贝塞尔曲线 C，以及椭圆弧 A 的四个开关组合</title>
<g>
<text x="28" y="34" font-size="16" font-weight="700" style="fill:var(--fg)">1. 贝塞尔曲线：控制点拉弯线条</text>
<g transform="translate(28, 56)">
<text x="0" y="14" font-size="13" font-weight="700" style="fill:var(--accent-strong);font-family:var(--font-mono)">二次贝塞尔 Q（1 个控制点）</text>
<rect x="0" y="24" width="382" height="104" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<line x1="48" y1="104" x2="191" y2="38" stroke-width="1.5" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<line x1="191" y1="38" x2="334" y2="104" stroke-width="1.5" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<path d="M48 104 Q191 38 334 104" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--accent)"/>
<circle cx="48" cy="104" r="4.5" style="fill:var(--fg)"/>
<circle cx="334" cy="104" r="4.5" style="fill:var(--fg)"/>
<circle cx="191" cy="38" r="5" stroke-width="2.2" style="fill:var(--surface);stroke:var(--warning)"/>
<text x="36" y="116" text-anchor="end" font-size="11" style="fill:var(--fg-muted)">起点</text>
<text x="344" y="116" font-size="11" style="fill:var(--fg-muted)">终点</text>
<text x="204" y="42" font-size="11.5" font-weight="600" style="fill:var(--warning)">控制点 (x1, y1)</text>
</g>
<g transform="translate(28, 198)">
<text x="0" y="14" font-size="13" font-weight="700" style="fill:var(--success);font-family:var(--font-mono)">三次贝塞尔 C（2 个控制点）</text>
<rect x="0" y="24" width="382" height="108" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<line x1="44" y1="96" x2="120" y2="38" stroke-width="1.5" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<line x1="338" y1="54" x2="262" y2="112" stroke-width="1.5" stroke-dasharray="4 3" style="stroke:var(--fg-subtle)"/>
<path d="M44 96 C120 38 262 112 338 54" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--success)"/>
<circle cx="44" cy="96" r="4.5" style="fill:var(--fg)"/>
<circle cx="338" cy="54" r="4.5" style="fill:var(--fg)"/>
<circle cx="120" cy="38" r="5" stroke-width="2.2" style="fill:var(--surface);stroke:var(--warning)"/>
<circle cx="262" cy="112" r="5" stroke-width="2.2" style="fill:var(--surface);stroke:var(--tier-elite)"/>
<text x="132" y="42" font-size="11" font-weight="600" style="fill:var(--warning)">控制点 1</text>
<text x="250" y="118" text-anchor="end" font-size="11" font-weight="600" style="fill:var(--tier-elite)">控制点 2</text>
</g>
<line x1="444" y1="20" x2="444" y2="348" style="stroke:var(--line);stroke-width:1"/>
<text x="472" y="34" font-size="16" font-weight="700" style="fill:var(--fg)">2. 椭圆弧 A 的四种开关组合</text>
<text x="472" y="56" font-size="12.5" style="fill:var(--fg-muted)">相同起点 P1、终点 P2 与半径，两项 0/1 开关决定四条弧</text>
<g transform="translate(472, 76)">
<rect width="194" height="122" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<path d="M64 62 A36 24 0 0 0 130 46" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--accent)"/>
<path d="M64 62 A36 24 0 1 1 130 46" fill="none" stroke-width="1.3" stroke-dasharray="3 3" style="stroke:var(--line-strong)"/>
<circle cx="64" cy="62" r="4" style="fill:var(--fg)"/>
<circle cx="130" cy="46" r="4" style="fill:var(--warning)"/>
<text x="97" y="110" text-anchor="middle" font-size="11.5" font-weight="600" style="fill:var(--fg);font-family:var(--font-mono)">large=0, sweep=0</text>
</g>
<g transform="translate(682, 76)">
<rect width="194" height="122" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<path d="M64 62 A36 24 0 0 1 130 46" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--success)"/>
<path d="M64 62 A36 24 0 1 0 130 46" fill="none" stroke-width="1.3" stroke-dasharray="3 3" style="stroke:var(--line-strong)"/>
<circle cx="64" cy="62" r="4" style="fill:var(--fg)"/>
<circle cx="130" cy="46" r="4" style="fill:var(--warning)"/>
<text x="97" y="110" text-anchor="middle" font-size="11.5" font-weight="600" style="fill:var(--fg);font-family:var(--font-mono)">large=0, sweep=1</text>
</g>
<g transform="translate(472, 212)">
<rect width="194" height="122" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<path d="M64 62 A36 24 0 1 0 130 46" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--tier-elite)"/>
<path d="M64 62 A36 24 0 0 1 130 46" fill="none" stroke-width="1.3" stroke-dasharray="3 3" style="stroke:var(--line-strong)"/>
<circle cx="64" cy="62" r="4" style="fill:var(--fg)"/>
<circle cx="130" cy="46" r="4" style="fill:var(--warning)"/>
<text x="97" y="110" text-anchor="middle" font-size="11.5" font-weight="600" style="fill:var(--fg);font-family:var(--font-mono)">large=1, sweep=0</text>
</g>
<g transform="translate(682, 212)">
<rect width="194" height="122" rx="8" stroke-width="1.2" style="fill:var(--surface-2);stroke:var(--line)"/>
<path d="M64 62 A36 24 0 1 1 130 46" fill="none" stroke-width="3" stroke-linecap="round" style="stroke:var(--warning)"/>
<path d="M64 62 A36 24 0 0 0 130 46" fill="none" stroke-width="1.3" stroke-dasharray="3 3" style="stroke:var(--line-strong)"/>
<circle cx="64" cy="62" r="4" style="fill:var(--fg)"/>
<circle cx="130" cy="46" r="4" style="fill:var(--warning)"/>
<text x="97" y="110" text-anchor="middle" font-size="11.5" font-weight="600" style="fill:var(--fg);font-family:var(--font-mono)">large=1, sweep=1</text>
</g>
</g>
</svg>
</div>
<figcaption>SVG path 路径里的二次贝塞尔曲线 Q、三次贝塞尔曲线 C，以及椭圆弧 A 的四个开关组合</figcaption>
</figure>

曲线是 `<path>` 最富表现力的部分，主要有三大家族：

1. **二次贝塞尔曲线 `Q` / `q`**（1 个控制点）：格式为 `Q x1 y1, x y`。`(x1, y1)` 是把线条往外拉的控制点，`(x, y)` 是曲线终点。如果要连续画几段平滑相接的二次贝塞尔曲线（比如开头动画里连绵起伏的海浪），下一段可以用简写命令 `T x y`，它会自动把上一段的控制点对称翻转过来当新控制点。
2. **三次贝塞尔曲线 `C` / `c`**（2 个控制点）：格式为 `C x1 y1, x2 y2, x y`。起点挂一个控制柄 `(x1, y1)`，终点挂另一个控制柄 `(x2, y2)`，能精准拉出复杂的 S 形曲线（比如鹈鹕的脖子和喉囊）。设计软件（Figma、Illustrator）里的钢笔工具导出的曲线几乎全是 `C` 命令。同样地，它也有对称延续控制点的简写 `S x2 y2, x y`。
3. **椭圆弧 `A` / `a`**：格式为 `A rx ry x-axis-rotation large-arc-flag sweep-flag x y`。给定起点、终点 `(x, y)` 和椭圆的两条半轴 `(rx, ry)`，几何上其实能画出两个一模一样大小的椭圆，从而切出**四条不同的弧**。因此 `A` 命令最后必须用两个 `0/1` 开关来二选一：
   - `large-arc-flag`：`0` 选短弧（小于 180 度），`1` 选长弧（大于 180 度）。
   - `sweep-flag`：`0` 逆时针绕，`1` 顺时针绕。

上面右半部分把同一对起点终点在 `(0,0)`、`(0,1)`、`(1,0)`、`(1,1)` 四种开关下的四条弧全部排了出来，遇到弧线画反时对照着改这两个 `0` 和 `1` 就行。

### 3. 镂空图形与 `fill-rule`

如果一个 `<path>` 里写了两个嵌套的闭合子路径（比如外圆套内圆做成一个甜甜圈，或者带窗口的门框），中间那块重叠区域到底算“里面”还是“外面”？这由 `fill-rule` 属性决定：

- **`nonzero`（默认）**：从某点往外射出一条射线，顺时针穿过路径边加 1，逆时针穿过减 1，总和不为 0 就填充。因此如果内外圈绘制方向相反（外顺内逆），中间会镂空；方向相同就会填满。
- **`evenodd`**：不管路径绘制方向，只数射线穿过边界的次数，奇数次在里面（填充），偶数次在外面（镂空）。做嵌套镂空图标时直接设 `fill-rule="evenodd"` 往往最省心，不用去纠结绘制绕向。

## 外观、分组与复用机制

把几何轮廓画出来之后，接下来就是上色、编组、排版与动画。

### 1. 填充与描边属性

SVG 图形的外观属性既可以直接写在标签属性里，也可以写进 `<style>` 用 CSS 控制：

- **填充**：`fill`（颜色值、`none`，或者 `url(#渐变id)`）与 `fill-opacity`。
- **描边**：`stroke`（颜色）、`stroke-width`（线宽，注意描边是**沿路径中心线向内外各扩一半宽度**的）、`stroke-opacity`。
- **端点与拐角**：`stroke-linecap` 控制线段两头形状（`butt` 平头、`round` 圆头、`square` 方头延伸），`stroke-linejoin` 控制折线拐角（`miter` 尖角、`round` 圆角、`bevel` 斜切）。
- **虚线与流动动画**：`stroke-dasharray="18 30"` 表示画 18 单位实线、空 30 单位。如果配合 CSS `@keyframes` 持续改变 `stroke-dashoffset`（虚线起点偏移量），就能做出开头海滨车道向后飞驰的速度线，或者经典的“线条自己长出来”的描边动画。

> [!TIP]
> 在网页 UI 图标里，把 `fill="currentColor"` 或 `stroke="currentColor"` 写进 SVG 是最实用的小技巧。`currentColor` 会直接继承父级 HTML 元素的 CSS `color` 属性——按钮悬停变色、亮暗主题切换都不需要准备两套图标文件。

### 2. 分组与变换：`<g>`

`<g>`（Group）就像设计软件里的“编组文件夹”。它本身不画任何图形，但有三个关键作用：

1. **批量继承样式**：写在 `<g>` 上的 `fill`、`stroke`、`stroke-width` 等属性会自动传给组里的所有子元素。
2. **整体几何变换**：在 `<g>` 上加 `transform="translate(88, 126)"`，组内所有图形就可以从局部坐标 `(0, 0)` 开始画，不必自己心算加上偏移量。`transform` 还支持 `rotate(角度, 中心x, 中心y)` 和 `scale(倍率)`。
3. **骨骼与层级动画**：把鹈鹕的躯干、脖子、大嘴和翅膀放进同一个 `<g class="pl-body-bob">` 里，再把翅膀单独套一层子分组 `<g class="pl-wing-anim">`，就能让翅膀在跟随身体上下颠簸的同时，叠加一层自己的扇动动画。

### 3. 定义区 `<defs>` 与实例复用 `<use>`

写在 `<defs>` 标签里的内容**不会直接画在画布上**，它相当于 SVG 的“后台素材库”，专门用来预先声明可引用的资源：

- **渐变**：`<linearGradient>`（线性渐变）与 `<radialGradient>`（径向渐变），定义好颜色停靠点 `<stop>` 后，图形用 `fill="url(#id)"` 引用。
- **裁剪与遮罩**：`<clipPath>` 硬裁剪出指定形状区域（比如开头把半圆落日齐刷刷截断在海平面以上），`<mask>` 按灰度明暗做软透明遮罩。
- **箭头标记**：`<marker>` 配合 `marker-end="url(#arrow)"`，一键给 `<line>` 或 `<path>` 端点加上箭头。
- **图形模板与 `<use>`**：在 `<defs>` 里放一个带 `id="data-dot"` 的圆点，正文里就可以写多条 `<use href="#data-dot" x="148" y="122" />` 反复实例化，一次修改定义，所有实例同步更新。如果还要跨不同尺寸复用图标，可以用 `<symbol id="icon" viewBox="...">` 搭配 `<use>`，每个实例还能自带独立坐标系。

### 4. 在 SVG 里写字：`<text>`

SVG 也能通过 `<text x="..." y="...">文字</text>` 渲染文本，文字同样是矢量的，而且支持直接用鼠标划选复制。写 `<text>` 时有两个细节和 HTML 盒子不一样：

- **`y` 默认是文字基线（baseline）位置**，而不是文本框的顶部。所以如果写 `y="0"`，整行字几乎会跑到画布顶边以外看不见。
- **对齐方式靠 `text-anchor` 和 `dominant-baseline`**：`text-anchor="middle"` 让文字以 `x` 为中心水平居中（`start` 左对齐、`end` 右对齐），`dominant-baseline="central"` 则用于垂直居中对齐。

## 一份完整的 SVG 数据卡片

前面所有零件凑齐了，我们看一份不到五十行的完整 SVG 代码。它用 `<defs>` 声明了一组面积渐变和一个可复用的采样点圆圈，用 `<rect>` 和 `<text>` 搭出卡片骨架，再用 `<path>` 的三次贝塞尔曲线 `C` 画出平滑的延迟趋势线，最后用四行 `<use>` 把数据点摆上去：

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 200" width="420" height="200" role="img">
  <title>接口 P95 响应延迟趋势卡片，最近四次采样呈下降趋势，当前为 68ms</title>
  <defs>
    <!-- 面积填充线性渐变：从半透明蓝渐变到接近透明 -->
    <linearGradient id="latency-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b6fc2" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#3b6fc2" stop-opacity="0.02"/>
    </linearGradient>
    <!-- 可复用的数据采样点圆圈 -->
    <circle id="data-dot" r="4" fill="#ffffff" stroke="#3b6fc2" stroke-width="2.2"/>
  </defs>

  <!-- 卡片底板 -->
  <rect x="8" y="8" width="404" height="184" rx="14" fill="#ffffff" stroke="#d8dde3" stroke-width="1.4"/>

  <!-- 顶部标题与当前读数 -->
  <g font-family="'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif">
    <text x="28" y="38" font-size="13" font-weight="600" fill="#64748b">API P95 响应延迟</text>
    <text x="28" y="66" font-size="26" font-weight="700" fill="#1f3a56">68 ms</text>

    <!-- 状态胶囊 -->
    <rect x="314" y="24" width="76" height="24" rx="12" fill="#eaf5ee" stroke="#bcd9c8" stroke-width="1"/>
    <circle cx="329" cy="36" r="3.5" fill="#2f7d55"/>
    <text x="340" y="40.5" font-size="12" font-weight="600" fill="#1f6f4a">运行正常</text>
  </g>

  <!-- 水平参考虚线 -->
  <g stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4">
    <line x1="28" y1="96" x2="392" y2="96"/>
    <line x1="28" y1="132" x2="392" y2="132"/>
    <line x1="28" y1="168" x2="392" y2="168"/>
  </g>

  <!-- 曲线下方的渐变面积 -->
  <path d="M28 112 C78 106 96 128 148 122 C200 116 226 146 270 144 C314 142 344 156 392 152 L392 168 L28 168 Z"
        fill="url(#latency-area)"/>

  <!-- 延迟趋势主曲线 -->
  <path d="M28 112 C78 106 96 128 148 122 C200 116 226 146 270 144 C314 142 344 156 392 152"
        fill="none" stroke="#3b6fc2" stroke-width="2.6" stroke-linecap="round"/>

  <!-- 用 use 复用同一个采样点图形 -->
  <use href="#data-dot" x="28" y="112"/>
  <use href="#data-dot" x="148" y="122"/>
  <use href="#data-dot" x="270" y="144"/>
  <use href="#data-dot" x="392" y="152"/>
</svg>
```

这段不到五十行的代码放进浏览器里渲染，就是下面这张卡片（这里把底板颜色接成了站点主题令牌，亮暗模式下都能清晰显示）：

<figure class="db-figure">
<svg viewBox="0 0 420 200" width="100%" role="img" style="max-width:420px;height:auto;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
<title>接口 P95 响应延迟趋势卡片完整渲染效果</title>
<defs>
<linearGradient id="svg05-latency-area" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" style="stop-color:var(--accent);stop-opacity:0.28"/>
<stop offset="100%" style="stop-color:var(--accent);stop-opacity:0.02"/>
</linearGradient>
<circle id="svg05-data-dot" r="4" stroke-width="2.2" style="fill:var(--surface);stroke:var(--accent)"/>
</defs>
<rect x="8" y="8" width="404" height="184" rx="14" stroke-width="1.4" style="fill:var(--surface);stroke:var(--line-strong)"/>
<g>
<text x="28" y="38" font-size="13" font-weight="600" style="fill:var(--fg-muted)">API P95 响应延迟</text>
<text x="28" y="66" font-size="26" font-weight="700" style="fill:var(--fg)">68 ms</text>
<rect x="314" y="24" width="76" height="24" rx="12" stroke-width="1" style="fill:var(--success);fill-opacity:0.14;stroke:var(--success)"/>
<circle cx="329" cy="36" r="3.5" style="fill:var(--success)"/>
<text x="340" y="40.5" font-size="12" font-weight="600" style="fill:var(--success)">运行正常</text>
</g>
<g stroke-width="1" stroke-dasharray="4 4" style="stroke:var(--line)">
<line x1="28" y1="96" x2="392" y2="96"/>
<line x1="28" y1="132" x2="392" y2="132"/>
<line x1="28" y1="168" x2="392" y2="168"/>
</g>
<path d="M28 112 C78 106 96 128 148 122 C200 116 226 146 270 144 C314 142 344 156 392 152 L392 168 L28 168 Z" fill="url(#svg05-latency-area)"/>
<path d="M28 112 C78 106 96 128 148 122 C200 116 226 146 270 144 C314 142 344 156 392 152" fill="none" stroke-width="2.6" stroke-linecap="round" style="stroke:var(--accent)"/>
<use href="#svg05-data-dot" x="28" y="112"/>
<use href="#svg05-data-dot" x="148" y="122"/>
<use href="#svg05-data-dot" x="270" y="144"/>
<use href="#svg05-data-dot" x="392" y="152"/>
</svg>
<figcaption>接口 P95 响应延迟趋势卡片完整渲染效果</figcaption>
</figure>

对照代码和渲染结果，能清楚看到前面几节的机制是怎么串起来的：先画底板，再画虚线网格，接着铺渐变面积，然后描主曲线，最后用 `<use>` 把四个采样点圆圈压在最上面。代码在文档里的书写顺序，正好对应画面从后到前的叠放层次。

## 工程实践：接入、优化、无障碍与安全边界

当然，看懂语法只是第一步，如果你真正要在生产项目里用好 SVG，下面这四件事往往决定你会不会踩坑。

### 1. 在网页里引入 SVG 的四种方式

| 引入方式 | 浏览器缓存 | CSS 控制内部颜色 | JS 操作内部节点 | 脚本执行能力 | 典型用途 |
| --- | --- | --- | --- | --- | --- |
| `<img src="a.svg">` / Markdown 图片 | 支持 | 不支持 | 不支持 | 禁止执行 | 独立配图、文章插画、防 XSS 外链图标 |
| CSS `background-image` / `mask-image` | 支持 | `mask-image` 可单色染色 | 不支持 | 禁止执行 | 装饰底纹、按钮单色小图标 |
| 内联 `<svg>...</svg>` | 随 HTML | 完全支持（可改多色与暗色令牌） | 完全支持 | 随页面脚本 | UI 核心图标、交互图表、主题自适应插图 |
| `<object data="a.svg">` | 支持 | 有限支持 | 同源下可访问 | 允许执行 | 极少数需要独立文档上下文的复杂交互图 |

大多数人最常纠结的是“用 `<img>` 还是内联 `<svg>`”。一句话判断：**静态插画或外部图片用 `<img>`（走独立文件缓存、省 HTML 体积且带安全沙箱），需要随亮暗主题变色、做悬停反馈或内嵌动画的图形（如本文全部插图）用内联 `<svg>`**。

### 2. 压缩优化与 `id` 冲突

设计软件（Figma、Illustrator、Sketch）直接导出的 SVG 往往塞满了编辑器私有元数据、冗余 `<g>` 分组、长串未合并的零散路径以及十几位的小数坐标。把这些文件放进生产项目前，通常跑一遍开源工具 **SVGO**[^7]，经常能把体积压掉一半以上而不损分毫画质。

不过如果你在同一个 HTML 页面里内联了多张 SVG，一定要提防 **`id` 命名空间冲突**。内联 SVG 共享整个 HTML 文档的全局 ID 作用域——假如两张图里分别都有一个 `<linearGradient id="grad">`，当第一张图在页面里被隐藏（`display: none`）或者被移除时，第二张图引用 `#grad` 的区域就会直接变黑或消失。工程里的标准做法是给每张图的 `id` 加上图名或唯一前缀（比如本文开头鹈鹕图的 `pl-sun-grad`、坐标系图的 `svg02-arrow`），或者在构建阶段让打包工具自动哈希化 `id`。

### 3. 无障碍（Accessibility）

屏幕阅读器读到一张内联 SVG 时，如果不加语义标注，可能会把里面几百个节点直接跳过去，或者把 `<text>` 里的碎片坐标散词胡乱念一遍[^8]：

- **传达信息的图形**：给 `<svg>` 加上 `role="img"`，再配一个 `<title>` 子元素（放在 `<svg>` 内部开头位置）或者 `aria-label="..."`，用一句完整的话描述整张图表达的含义。
- **纯装饰性图标**（比如旁边已经写了“保存”文字的软盘小图标）：加上 `aria-hidden="true"` 和 `focusable="false"`，让读屏器直接跳过，避免重复播报干扰视障用户。

### 4. 安全红线：SVG 可以藏 XSS 脚本

这是工程里最容易被忽略的一条红线。很多后端或全栈开发者下意识把 `.svg` 当成和 `.png` 一样的“无害图片”，允许用户直接作为头像或附件上传，并在同源域名下原样返回。但前面反复强调过，**SVG 本质上是 XML 文档，W3C 规范允许在其中内嵌 `<script>` 标签以及 `onload`、`onerror` 等事件处理器**[^9]：

```xml
<svg xmlns="http://www.w3.org/2000/svg" onload="alert('这里可以执行任意同源 JavaScript')">
  <circle cx="20" cy="20" r="10" fill="#3b6fc2" />
</svg>
```

> [!WARNING]
> 如果你把用户上传的未清洗 SVG 放到 `<img src="...">` 里展示，现代浏览器会拦截里面的脚本，表面上看相安无事；但只要攻击者把这张图片的直链发给其他用户点开（浏览器直接在新标签页打开同源 `.svg` URL），或者你的前端把 SVG 内容拉下来内联插进了页面 DOM，里面的恶意 JavaScript 就会在你的站点域名下畅通无阻地运行，直接构成高危存储型 XSS 漏洞。

因此只要业务允许用户上传或传入不可信的 SVG，必须至少落实下面三道防线之一：

1. **入库或输出前严格清洗**：使用成熟的白名单清洗库（如 `DOMPurify`[^10] 开启 SVG profile）剥离所有 `<script>`、`<foreignObject>` 以及 `on*` 事件属性。
2. **响应头沙箱隔离**：对用户上传的 SVG 静态资源强制返回 `Content-Security-Policy: sandbox` 或 `Content-Disposition: attachment` 响应头。
3. **独立域名托管**：把用户上传的所有静态文件放到与主站完全隔离的无 Cookie 独立域名上（例如独立的 OSS / S3 / R2 静态域名），彻底切断同源脚本读取主站凭证的可能。

[^1]: Simon Willison 在个人博客上维护的 `pelican-riding-a-bicycle` 评测专栏，收录了数十款大模型生成的鹈鹕骑自行车 SVG 对比：[Pelican Riding a Bicycle Tag — Simon Willison's Weblog](https://simonwillison.net/tags/pelican-riding-a-bicycle/)。
[^2]: W3C SVG 2 官方规范草案与 MDN 开发者文档入口：[W3C Scalable Vector Graphics (SVG) 2 Specification](https://www.w3.org/TR/SVG2/) 与 [MDN SVG: Scalable Vector Graphics](https://developer.mozilla.org/zh-CN/docs/Web/SVG)。
[^3]: 关于 HTML5 解析器自动为内联 `<svg>` 绑定命名空间的规范定义，参见 WHATWG HTML 标准：[HTML Standard — Foreign elements and namespaces](https://html.spec.whatwg.org/multipage/syntax.html#foreign-elements)。
[^4]: W3C SVG 2 渲染模型规范第 3.3 节“画家模型（The painters model）”：[W3C SVG 2 — Rendering Model](https://www.w3.org/TR/SVG2/render.html#PaintersModel)。
[^5]: W3C SVG 2 坐标系统、视口与 `viewBox` / `preserveAspectRatio` 规范定义：[W3C SVG 2 — Coordinate Systems, Transformations and Units](https://www.w3.org/TR/SVG2/coords.html) 以及 MDN 的 [`viewBox` 属性参考](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/viewBox)。
[^6]: W3C SVG 2 路径语法与椭圆弧数学参数化定义：[W3C SVG 2 — Paths](https://www.w3.org/TR/SVG2/paths.html) 以及 MDN 的 [SVG 路径 `<path>` 教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial/Paths)。
[^7]: SVGO（SVG Optimizer）是前端工程中最常用的基于 Node.js 的 SVG 压缩与清理工具：[svg/svgo — GitHub](https://github.com/svg/svgo)（也可直接使用其在线前端界面 [SVGOMG](https://jakearchibald.github.io/svgomg/)）。
[^8]: 关于 SVG 无障碍属性与屏幕阅读器兼容性的完整实践指南，参见 W3C WAI 规范 [WAI-ARIA Graphics Module](https://www.w3.org/TR/graphics-aria-1.0/) 与 Deque 的研究总结 [Creating Accessible SVGs](https://www.deque.com/blog/creating-accessible-svgs/)。
[^9]: 关于利用 SVG 文件实施跨站脚本攻击（XSS）的原理与文件上传防护建议，参见 [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) 及 PortSwigger 的 [Cross-site scripting (XSS) Cheat Sheet](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)。
[^10]: DOMPurify 是针对 HTML、MathML 与 SVG 的高安全性 DOM 消毒清洗库：[cure53/DOMPurify — GitHub](https://github.com/cure53/DOMPurify)。
