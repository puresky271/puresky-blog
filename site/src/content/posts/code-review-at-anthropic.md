---
title: 'Claude Code 团队怎么做代码评审'
description: 'Claude 写了 Claude Code 九成的代码，那评审怎么做？Anthropic 团队把大部分阅读交给机器，把人的时间留给风险所在的地方，让每一层检查各管一段，也让评审能在几轮之内收敛。'
pubDate: 2026-11-01
author: 'Addy Osmani，Morgan Westlee Lunt，Qing Wang'
category: curation
tags: ['软件工程', 'Claude Code', '评测', '方法论', 'Anthropic团队·Addy Osmani 等']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 工程博客 [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2026 年 10 月 15 日，作者是 Addy Osmani，Morgan Westlee Lunt 和 Qing Wang。译文按原意译出，术语和小标题做了中文化，原文里的外链都保留着。版权归原作者和 Anthropic 所有，译文只作学习交流之用。文中带铅笔图标的注解是我加的补充说明，不属于原文。

:::bi
We've said before that Claude writes about 90 percent of Claude Code's own code. So how do we review code at the volume we produce it? Does anyone read code anymore? And if something breaks, who catches it?

:::zh
我们之前说过，Claude Code 自己的代码里大约 90% 是 Claude 写的。那么在这样一个产量下，我们怎么评审代码？现在还有人读代码吗？真出了问题，又由谁来接住？
:::

:::bi
This post covers the code review flow on the Claude Code team and how it has evolved. From June to September, merged pull requests to Claude Code's codebase more than doubled while the share that had to be reverted fell by more than 40 percent.

:::zh
这篇文章讲的是 Claude Code 团队的代码评审流程，以及它是怎么一步步变成现在这样的。从 6 月到 9 月，合并进 Claude Code 代码库的 PR 数量翻了一倍多，需要回滚的比例却下降了 40% 以上。
:::

:::bi
We didn't remove review. But we did move most of the reading to machines, optimized for human time and attention, and invested heavily in making it fast and easy to undo mistakes.

:::zh
我们没有把评审去掉。我们只是把大部分“读”的活交给了机器，把优化目标换成人的时间和注意力，还花了很大力气去让撤销错误这件事又快又轻。
:::

## 重新想一遍代码评审是为了什么 （Rethinking the purpose of code review）

:::bi
When agents write code, the number of changes goes up, fast. In Anthropic's monorepo, changes landing per day went from about [2,500 in May to more than 30,000 in September](https://www.anthropic.com/engineering/redesigning-source-control) this year.

:::zh
让 agent 来写代码，改动的数量会涨得很快。在 Anthropic 的 monorepo 里，每天落地的改动从今年 5 月的约 [2,500 个涨到 9 月的 30,000 多个](https://www.anthropic.com/engineering/redesigning-source-control)。
:::

:::bi
Claude Code lives in its own repository, separate from the monorepo, but it's seeing a lot of pressure too. When you are shipping this fast, manual, line-by-line code review is incredibly difficult if not impossible.

:::zh
Claude Code 住在自己的仓库里，和 monorepo 分开，但它感到的压力也不小。发布节奏这么快的时候，靠人工一行一行地评审，难到几乎不可能做到。
:::

:::bi
Code review does two jobs:

:::zh
代码评审干两件事：
:::

:::bi
1. Find and fix issues before they ship
2. Build shared context and codebase understanding across the team

:::zh
1. 在问题发布出去之前找到并修掉
2. 在团队里建立共享的上下文，让大家对代码库有共同的理解
:::

:::bi
This article mainly focuses on finding and fixing issues, but we will come back to the second job near the end.

:::zh
这篇文章主要讲第一件事，第二件事放到接近结尾再说。
:::

:::bi
We think "did a human read the code?" is an imprecise proxy for "what could go wrong with this change, and which check—automated or human—is the right one to catch it?"

:::zh
我们认为，“有没有人读过这段代码”这个问法，并不能准确替代真正该问的问题：这个改动可能坏在哪里，哪一道检查最该拦住它，是自动的还是人的？
:::

:::bi
Asking that question also changed *when* review happens. Before, review was a gate at the end of the road: write the code, open a PR, wait for your colleague.

:::zh
换成这个问题之后，评审发生的时机也变了。以前评审是路尽头的一道闸门：写完代码，开 PR，等同事来看。
:::

:::bi
Now, review runs continuously, more like spellcheck while you write. Most changes have been reviewed and fixed by Claude at least once before a human is asked to look. This catches most routine mistakes, and saves team attention for higher-level questions and scrutiny.

:::zh
现在评审是持续在跑的，更像写东西时的拼写检查。大多数改动在被交到人手上之前，已经被 Claude 评审并修过至少一遍。这样能拦住大部分常规错误，把团队的注意力省下来，留给更高层的问题和更严的推敲。
:::

## 真正稀缺的是人的时间和注意力（The scarce resource: human time and attention）

:::bi
We want to preserve human time and attention for issues only humans can solve and make sure automated checks catch the rest. At our current rate of change, there is still an incredible amount of work for humans to do, and our team encounters new and novel challenges almost daily.

:::zh
我们想把人的时间和注意力留给只有人能解决的问题，其余的都交给自动检查。按现在的改动速度，人要做的事还是多得惊人，团队几乎每天都会碰到新的麻烦，而且是以前没见过的那种。
:::

:::bi
Human time covers both sides of review's cost: the time people spend reviewing, and the time they spend fixing what bad code breaks. Cutting the first doesn't help if the time just shows up in the second.

:::zh
人的时间要算评审成本的两头：一头是人花在评审上的时间，另一头是人花在修烂代码造成的后果上的时间。如果省下第一头的时间又从第二头冒出来，那就不算省。
:::

:::bi
So the goal is that most pull requests in the Claude Code repos (the CLI, the desktop and web apps, and the mobile apps) merge with at most one human in the loop, who can be the author, with no increase in reverts or incidents. To measure human time, we track human approvals per PR (median and 95th percentile), human comments, and how long a PR waits on a person. Revert and incident rates are the guardrail: if they rise, we haven't saved human time, we've only moved it.

:::zh
所以我们的目标是：Claude Code 各个仓库（CLI，桌面端和 Web 版，移动端）里的大多数 PR，合并时链路里最多只有一个人，这个人可以是作者，同时回滚率和事故率不上升。为了衡量人的时间，我们统计每个 PR 的人工审批数（中位数和第 95 百分位），人工评论数，以及一个 PR 等人等了多久。回滚率和事故率是护栏：这两个数要是涨了，就说明我们没省下人的时间，只是把它挪了个地方。
:::

:::annotation
为什么要在中位数之外再设置一个第95百分位？因为中位数只能反映典型情况，却容易掩盖少数 PR 的极端等待和审批负担。第 95 百分位（P95）就是用来观察这些“尾部情况”的。

如果只看中位数，你可能会认为自动化做得很好。但实际上仍然有一批 PR 困在反复审批，修改，讨论的流程中。
:::


## 一个改动的一生（The life of a change）

:::bi
A typical change, from an engineer's laptop (or a Claude session in Slack), goes through multiple layers of code review.

:::zh
一个典型的改动，从工程师的笔记本（或者 Slack 里的一个 Claude 会话）出发，要穿过好几层代码评审。
:::

<figure>
<svg viewBox="0 0 780 672" width="100%" role="img" aria-label="一次改动的旅程，九道关卡分四段：提交 PR 之前先自行验证，每个 PR 上依次是必需的 CI，Claude 代码评审，安全评审和按风险分级的人工审批，合并时进入合并队列，合并后先藏在特性开关后面给内部用，再灰度发布，最后观察并按需向前修复或回滚。大部分环节是自动的，只有按风险分级的人工审批需要人介入" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <line x1="96" y1="98.8" x2="96" y2="175.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="201.8" x2="96" y2="222.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="248.8" x2="96" y2="269.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="295.8" x2="96" y2="316.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="342.8" x2="96" y2="419.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="445.8" x2="96" y2="505.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="531.8" x2="96" y2="535.4" style="stroke:var(--line);stroke-width:1.4"/>
    <line x1="96" y1="561.8" x2="96" y2="565.4" style="stroke:var(--line);stroke-width:1.4"/>
    <text x="124" y="60" font-size="12" style="fill:var(--fg-subtle);letter-spacing:0.18em">提交 PR 之前</text>
    <circle cx="96" cy="85.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 85.9 L94.8 88.8 L100.4 82.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="90" font-size="13.5" font-weight="600" style="fill:var(--fg)">工作先验证</text>
    <text x="392" y="90" font-size="12.5" style="fill:var(--fg-muted)">Claude 跑测试，构建和 lint，另一个 agent</text>
    <text x="392" y="107.5" font-size="12.5" style="fill:var(--fg-muted)">用全新上下文审 diff</text>
    <text x="124" y="163" font-size="12" style="fill:var(--fg-subtle);letter-spacing:0.18em">每个 PR 上</text>
    <circle cx="96" cy="188.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 188.9 L94.8 191.8 L100.4 185.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="193" font-size="13.5" font-weight="600" style="fill:var(--fg)">必需 CI</text>
    <text x="392" y="193" font-size="12.5" style="fill:var(--fg-muted)">lint，类型检查，各平台的测试，构建和打包。</text>
    <text x="392" y="210.5" font-size="12.5" style="fill:var(--fg-muted)">红了就挡住合并</text>
    <circle cx="96" cy="235.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 235.9 L94.8 238.8 L100.4 232.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="240" font-size="13.5" font-weight="600" style="fill:var(--fg)">Claude 代码评审</text>
    <text x="392" y="240" font-size="12.5" style="fill:var(--fg-muted)">多个 agent 并行找 bug，验证者投票，</text>
    <text x="392" y="257.5" font-size="12.5" style="fill:var(--fg-muted)">留下的按严重程度排序</text>
    <circle cx="96" cy="282.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 282.9 L94.8 285.8 L100.4 279.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="287" font-size="13.5" font-weight="600" style="fill:var(--fg)">安全评审</text>
    <text x="392" y="287" font-size="12.5" style="fill:var(--fg-muted)">单独一遍。两边任何未关闭的发现</text>
    <text x="392" y="304.5" font-size="12.5" style="fill:var(--fg-muted)">都挡住合并</text>
    <polygon points="96,321.2 102.9,329.6 96,338 89.1,329.6" style="fill:var(--accent)"/>
    <text x="124" y="334" font-size="13.5" font-weight="600" style="fill:var(--fg)">按风险分级的人工审批</text>
    <text x="392" y="334" font-size="12.5" style="fill:var(--fg-muted)">分类器定档：不需要人，一个人，或者两个人。</text>
    <text x="392" y="351.5" font-size="12.5" style="fill:var(--fg-muted)">有些路径永远需要人</text>
    <text x="124" y="407" font-size="12" style="fill:var(--fg-subtle);letter-spacing:0.18em">合并</text>
    <circle cx="96" cy="432.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 432.9 L94.8 435.8 L100.4 429.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="437" font-size="13.5" font-weight="600" style="fill:var(--fg)">合并队列</text>
    <text x="392" y="437" font-size="12.5" style="fill:var(--fg-muted)">在最新的 main 上带着改动再跑一遍检查</text>
    <text x="124" y="493" font-size="12" style="fill:var(--fg-subtle);letter-spacing:0.18em">合并之后</text>
    <circle cx="96" cy="518.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 518.9 L94.8 521.8 L100.4 515.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="523" font-size="13.5" font-weight="600" style="fill:var(--fg)">特性开关，先内部使用</text>
    <text x="392" y="523" font-size="12.5" style="fill:var(--fg-muted)">Anthropic 员工先用，再轮到所有人</text>
    <circle cx="96" cy="548.6" r="9.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M91.9 548.9 L94.8 551.8 L100.4 545.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="124" y="553" font-size="13.5" font-weight="600" style="fill:var(--fg)">灰度发布</text>
    <text x="392" y="553" font-size="12.5" style="fill:var(--fg-muted)">先走 latest 通道，stable 通道随后跟上</text>
    <path d="M100.2 571.3 A 8.4 8.4 0 1 1 88.7 574.4" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round"/>
    <path d="M88.7 574.4 L88 581.4 M88.7 574.4 L83 578.5" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round"/>
    <text x="124" y="583" font-size="13.5" font-weight="600" style="fill:var(--fg)">观察，向前修复或回滚</text>
    <text x="392" y="583" font-size="12.5" style="fill:var(--fg-muted)">作者和 on-call 盯着，开关能马上关，</text>
    <text x="392" y="600.5" font-size="12.5" style="fill:var(--fg-muted)">坏构建直接回滚</text>
    <circle cx="230.5" cy="645.6" r="8.6" style="fill:none;stroke:var(--fg-muted);stroke-width:1.4"/>
    <path d="M226.8 645.9 L229.4 648.5 L234.5 642.7" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"/>
    <text x="247.5" y="650" font-size="12.5" style="fill:var(--fg-muted)">自动</text>
    <polygon points="321.5,638 327.7,645.6 321.5,653.2 315.3,645.6" style="fill:var(--accent)"/>
    <text x="338.5" y="650" font-size="12.5" style="fill:var(--fg-muted)">由人决定，按风险分级</text>
    <path d="M516.3 639 A 7.6 7.6 0 1 1 505.9 641.8" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round"/>
    <path d="M505.9 641.8 L505.2 648.8 M505.9 641.8 L500.2 645.9" style="fill:none;stroke:var(--fg-muted);stroke-width:1.6;stroke-linecap:round"/>
    <text x="529.5" y="650" font-size="12.5" style="fill:var(--fg-muted)">恢复</text>
  </g>
</svg>
<figcaption><span class="bi-en" lang="en">Most of the path is automated; a person's attention goes where the risk is</span><span class="bi-zh">大部分路径是自动的，人的注意力只放在有风险的地方</span></figcaption>
</figure>

## 一层一层地拦（Layer by layer）

<figure>
<svg viewBox="0 0 780 540" width="100%" role="img" aria-label="六层检查是一叠倾斜的平面：从上到下是验证，必需的 CI，AI 评审，安全评审，人工审批，合并队列加开关，每层平面上开着几个椭圆形的洞。问题从上方进来，带着虚线从洞里往下掉，大多数都被某一层拦住，只有穿过全部六层的那一个最后落在底部的快速回滚上" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <path d="M140 114 L540 128 L540 145 L140 131 Z M184 124.8 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M286 128.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M388 132 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M448 134.1 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <path d="M140 176 L540 190 L540 207 L140 193 Z M184 186.8 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M286 190.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M388 194 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M448 196.1 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <path d="M140 238 L540 252 L540 269 L140 255 Z M286 252.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M388 256 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M148 247.6 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M458 258.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <path d="M140 300 L540 314 L540 331 L140 317 Z M286 314.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M388 318 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M168 310.3 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M458 320.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <path d="M140 362 L540 376 L540 393 L140 379 Z M286 376.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M168 372.3 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M448 382.1 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <path d="M140 424 L540 438 L540 455 L140 441 Z M286 438.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M188 435 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z M458 444.4 a22 7.4 0 1 0 44 0 a22 7.4 0 1 0 -44 0 Z" fill-rule="evenodd" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.2;stroke-linejoin:round"/>
    <text x="128" y="72" font-size="12.5" style="fill:var(--fg-subtle)">问题从这里进来</text>
    <line x1="206" y1="92" x2="206" y2="241.3" style="stroke:var(--accent);stroke-width:1.3;stroke-dasharray:4 4.5;stroke-linecap:round"/>
    <line x1="308" y1="92" x2="308" y2="470" style="stroke:var(--accent);stroke-width:1.3;stroke-dasharray:4 4.5;stroke-linecap:round"/>
    <line x1="410" y1="92" x2="410" y2="372.5" style="stroke:var(--accent);stroke-width:1.3;stroke-dasharray:4 4.5;stroke-linecap:round"/>
    <circle cx="206" cy="154.7" r="4.8" style="fill:var(--accent)"/>
    <circle cx="206" cy="216.7" r="4.8" style="fill:var(--accent)"/>
    <circle cx="308" cy="156.4" r="4.8" style="fill:var(--accent)"/>
    <circle cx="308" cy="280.4" r="4.8" style="fill:var(--accent)"/>
    <circle cx="308" cy="404.4" r="4.8" style="fill:var(--accent)"/>
    <circle cx="410" cy="220.2" r="4.8" style="fill:var(--accent)"/>
    <circle cx="410" cy="344.2" r="4.8" style="fill:var(--accent)"/>
    <path d="M264 470 Q308 503 352 470" style="fill:none;stroke:var(--accent);stroke-width:1.5;stroke-linecap:round"/>
    <circle cx="308" cy="486" r="5" style="fill:var(--accent)"/>
    <text x="568" y="134.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">验证</text>
    <text x="568" y="196.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">必需 CI</text>
    <text x="568" y="258.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">AI 评审</text>
    <text x="568" y="320.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">安全评审</text>
    <text x="568" y="382.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">人工审批</text>
    <text x="568" y="444.1" font-size="13.5" font-weight="500" style="fill:var(--fg)">合并队列 + 开关</text>
    <text x="568" y="491" font-size="13.5" font-weight="600" style="fill:var(--accent)">快速回滚</text>
  </g>
</svg>
<figcaption><span class="bi-en" lang="en">Each layer catches some problems and misses others. Few get through all of them, and rollback handles the rest.</span><span class="bi-zh">每一层都会漏掉一些，穿过所有层的问题最后落在快速回滚上</span></figcaption>
</figure>

:::annotation
这六层分别代表六种不同的视角。CI 回答的是“它跑得起来吗”，AI 评审回答“它符合意图吗”，安全评审看威胁面，人负责的是方向和责任。同一个改动会被不同层用不同的问题重新问一遍，漏过去的才有机会被下一层接住。不是说每层之间不能有重复的部分，而是要做到每层的盲区不重叠。
:::

### 1. 先验证，再让别人看（The work is verified before anyone else looks）

:::bi
Most review now happens before a PR exists. We give Claude something it can run—like tests, a build or a screenshot to compare against the design—and ask it to show the output instead of saying it's done. Then a subagent reviews the diff with fresh context. Both habits come from our [best-practices guide](https://code.claude.com/docs/en/best-practices).

:::zh
现在大部分评审发生在 PR 存在之前。我们给 Claude 一些它能跑的东西，比如测试，一次构建，或者一张拿去和设计稿对照的截图，然后要求它把输出拿出来，而不是只说一句“做完了”。接着让一个 subagent 用干净的上下文评审这份 diff。这两个习惯都来自我们的[最佳实践指南](https://code.claude.com/docs/en/best-practices)。
:::

:::annotation
为什么一定要用“全新上下文的子 Agent”来审代码？

如果你让刚才写代码的同一个 AI 会话“自己检查一下有没有写错”，它大概率会顺着刚才写代码时的错误假设一路点头说没问题——这跟人刚写完文章很难看清自己的错别字是一个道理。
:::


:::bi
Before opening a PR, many of us also run a few [internal skills](https://claude.dev/blog/lessons-from-building-claude-code-how-we-use-skills/): one hunts for bugs, one simplifies the diff, and one checks the behavior end to end. UI changes also get checked against our design guidelines.

:::zh
开 PR 之前，我们中很多人还会跑几个[内部 skill](https://claude.dev/blog/lessons-from-building-claude-code-how-we-use-skills/)：一个专门找 bug，一个负责把 diff 简化，还有一个做端到端的行为检查。涉及 UI 的改动还要对照设计规范过一遍。
:::

:::bi
Boris Cherny, who created Claude Code, has called giving Claude a way to verify its work [probably the most important thing](https://x.com/bcherny/status/2007179861115511237) for getting good results. He estimates it makes the final result two to three times better, and writes, "Verification looks different for each domain. It might be as simple as running a bash command, or running a test suite, or testing the app in a browser or phone simulator."

:::zh
Claude Code 的创造者 Boris Cherny 说，给 Claude 一条验证自己工作的路，[大概是拿到好结果最重要的一件事](https://x.com/bcherny/status/2007179861115511237)。他估计这能让最终结果好上两到三倍，还写道：“验证在每个领域长得都不一样。它可能只是跑一条 bash 命令，或者跑一套测试，又或者是在浏览器或者手机模拟器里把应用试一遍。”
:::

:::bi
**When the automated reviewer keeps flagging the same thing, we fix it at the source:** in the skill, with a lint rule, or with updates to instructional files such as:

:::zh
**自动评审反复挑同一个毛病时，我们就去源头把它修掉：**改 skill，加一条 lint 规则，或者更新下面这类说明文件：
:::

:::bi
- `CLAUDE.md` tells Claude what the project is: the stack, the conventions, the goals and the non-goals. Every review loads it, so in a large codebase we keep it short and point to other docs from there. The reviewer also flags code that breaks a convention in it, and changes that make a line in it out of date.
- `REVIEW.md`, written by code owners, tells the reviewer what matters in their part of the code. We check separately whether the reviewer actually follows it. The good ones are short. They say what failure looks like in that repo (for docs it's "it lies," for config it's "it misroutes"), cap the nits, list paths to skip, and ask for a file and line as evidence instead of a guess from a name. They also ask for a summary that starts with a count and says plainly when there's nothing to fix.

:::zh
- `CLAUDE.md` 告诉 Claude 这个项目是什么：用什么技术栈，有哪些约定，目标是什么，不做什么。每次评审都会加载它，所以在大型代码库里我们会把它写得很短，其他细节从它指到别的文档。评审员也会挑出违反其中约定的代码，以及那些让里面某一行过时的改动。
- `REVIEW.md` 由 code owner 写，告诉评审员他们负责的那部分代码里什么才重要。评审员是不是真的照着做，我们另外单独检查。写得好的都很短。它们会讲清楚在那个仓库里“出问题”是什么样（对文档来说是“它撒谎了”，对配置来说是“它把东西路由错了”），给挑小毛病设一个数量上限，列出该跳过的路径，并且要求以文件和行号作为证据，不接受从名字上猜出来的结论。它们还会要求一份摘要，摘要开头给出数量，没什么可修的时候就直接说没什么可修。
:::

### 2. 每个 PR 都过一遍 AI 评审（AI review on every pull request）

:::bi
Every pull request gets a Claude review before a person looks. It reads the diff against the whole repo and the PR's stated intent, and asks: does the change solve its problem, fit the system, or break something else?

:::zh
每个 PR 在人看之前都会先过一遍 Claude 评审。它会拿这份 diff 去对照整个仓库和 PR 声明要解决的问题，然后问：这个改动解决了它的问题吗，它和系统合得来吗，有没有弄坏别的东西？
:::

:::bi
On a bug fix, it looks for the root cause. The public version, [Code Review for Claude Code](https://code.claude.com/docs/en/code-review), is now generally available on Team and Enterprise plans, and `/code-review` runs a lighter version locally.

:::zh
遇到 bug 修复，它会去找根因。对外的版本是 [Code Review for Claude Code](https://code.claude.com/docs/en/code-review)，现在已经在 Team 和 Enterprise 套餐上正式可用，本地可以用 `/code-review` 跑一个更轻的版本。
:::

:::bi
When we [launched the research preview](https://claude.com/resources/articles/code-review), the share of internal PRs getting substantive review comments went from 16% to 54%. Most PRs over 1,000 lines get findings, and most small ones come back clean. Admins set each repo to Quick, Standard, or Deep. Deep is worth it where one missed bug costs more than the extra review time.

:::zh
我们[上线 research preview](https://claude.com/resources/articles/code-review)的时候，内部 PR 里拿到实质性评审意见的比例从 16% 涨到了 54%。超过 1,000 行的 PR 大多能查出问题，小 PR 大多回来是干净的。管理员把每个仓库设成 Quick，Standard 或 Deep 三档。在漏掉一个 bug 的代价高过额外评审时间的地方，Deep 是值得的。
:::

:::bi
**Findings get verified by other agents before humans review them.** Several agents look for bugs at the same time. Then a separate group votes on each finding, and it only gets posted if enough of them agree it's real. Findings that are only about style, diagnostics, or cleanup get dropped. We A/B tested those filters on our own PRs before keeping them. What's left shows up as inline comments sorted by severity. Each is tagged Important, Nit, or Pre-existing, so a bug the PR didn't introduce doesn't look like the author's fault.

:::zh
**在人来评审之前，发现的问题会先由别的 agent 核实。**几个 agent 同时找 bug。然后另一组 agent 对每条发现投票，同意它是真问题的人够多，这条才会被发出来。只涉及风格，诊断信息或者清理的发现会被丢掉。这些过滤器我们先在自己的 PR 上做过 A/B 测试，才留下来。剩下的会按严重程度排序，以行内评论的形式出现。每条都标成 Important，Nit 或 Pre-existing，这样不是这个 PR 引入的 bug，就不会看着像作者的错。
:::

:::bi
**Every finding has to be answered.** You either fix it or resolve the thread with a reason. Often an agent picks up the fix overnight, so the author comes back to a PR that's already been through another round.

:::zh
**每条发现都必须有人回应。**要么修掉，要么带着理由把讨论串标成已解决。很多时候过一夜就有 agent 把修复接手做了，作者回来时，这个 PR 已经又过了一轮。
:::

### 3. 能卡住合并的安全评审（Security review that can block）

:::bi
Security gets its own automated review too. A PR can't merge while any finding from the bug review or the security review is still open. You either fix it or close the thread with a short reason, which is how you clear a false positive.

:::zh
安全也有自己的自动评审。只要 bug 评审或者安全评审里还有任何一条发现没关，PR 就不能合并。你要么修掉它，要么用一句简短的理由把讨论串关掉，误报就是这样清掉的。
:::

:::bi
If a later commit fixes the issue, the finding clears on its own. You can set up the same thing with the open-source security review GitHub Action or the `/security-review` command. Setup is covered in [automated security reviews in Claude Code](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code).

:::zh
如果后面的提交把问题修好了，这条发现会自动消失。同样的东西也可以用开源的安全评审 GitHub Action，或者 `/security-review` 命令搭起来，配置方法见 Claude Code 的[自动安全评审](https://support.claude.com/en/articles/11932705-automated-security-reviews-in-claude-code)。
:::

### 4. 能卡住合并的自动检查（Automated checks that block）

:::bi
The usual: lint, type checks, tests on every platform, and a build. (We wrote about scaling CI for this volume [here](https://claude.com/resources/articles/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic).) A typical CLI pull request may run dozens of checks before anyone looks at it. The PR template asks how the change was tested and how to undo it. Claude can fill that in, but the person who asked for the change signs off on it.

:::zh
常规的那一套：lint，类型检查，每个平台上的测试，还有一次构建。（为了扛住这个量，我们怎么扩 CI 这件事写在[这里](https://claude.com/resources/articles/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic)。）一个典型的 CLI PR，在人看之前可能要跑几十项检查。PR 模板会问这个改动是怎么测的，以及怎么撤销。这一栏 Claude 可以填，但得由提出这个改动的人签字确认。
:::

### 5. 人工审批，按风险分级（Human approval, scaled by risk）

:::bi
A docs fix and an auto-updater change carry different risk, so they get different review.

:::zh
修一处文档，和改一次自动更新器，风险不一样，评审方式也不一样。
:::

:::bi
| Risk   | Examples                                                                                                      | Human approvals                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Low    | Docs, copy, internal-only features, additive changes behind a flag                                            | None required once automated review and security checks are green |
| Medium | Ordinary product changes, and changes to sensitive areas such as caching, the auto-updater, or system prompts | One person                                                        |
| High   | The highest-risk code, plus a small set of paths that always need two people                                  | Two people                                                        |

:::zh
| 风险 | 例子 | 需要几个人审批 |
| --- | --- | --- |
| <span style="white-space:nowrap">低风险</span> | 文档，文案，只对内使用的功能，以及藏在开关后面的增量改动 | 自动评审和安全检查都通过之后，不需要人审批 |
| <span style="white-space:nowrap">中风险</span> | 普通的产品改动，以及缓存，自动更新器，系统提示这类敏感区域的改动 | 一个人 |
| <span style="white-space:nowrap">高风险</span> | 风险最高的代码，加上一小批永远需要两个人看的路径 | 两个人 |
:::

:::bi
**The change sets the tier, not the author.** A classifier reads the change and picks its risk tier. A second classifier asks whether this particular change needs another person even when its tier says it doesn't. Some paths always need a person, anything owners have listed as sensitive and any CI workflow file.

:::zh
**决定等级的是改动本身，不是作者。**一个分类器读这个改动，定出它的风险等级。第二个分类器再问：这个具体改动是不是还需要一个人，即使按等级来看不需要。有些路径永远需要人看，owner 列为敏感的任何东西，以及任何 CI workflow 文件。
:::

:::bi
**Only trusted authors get the lighter paths.** Only authors on the repo's trusted list get the lighter paths, mostly the team that owns it. Everyone else needs a second person to approve. An agent's approval never counts as a person's, either. Automated review can clear a low-risk change, but it can't fill a slot that calls for a human.

:::zh
**只有受信任的作者能走轻的那条路。**只有在仓库信任名单上的作者才能走轻的审批路径，名单上基本是负责这个仓库的团队。其他人一律需要第二个人批准。agent 的批准也从来不算人的批准。自动评审可以放掉一个低风险改动，但它填不了要求由人来的那个位置。
:::

:::bi
**Whoever prompted the change is on the hook for it.** On an agent-written PR, the person directing the agent counts as one of the required reviewers, the same as if they'd typed the code themselves.

:::zh
**谁提的这个改动，谁就得对它负责。**在 agent 写的 PR 上，指挥这个 agent 的人算作要求的评审人之一，就跟他自己敲了这些代码一样。
:::

:::bi
**An approval covers one specific commit.** If new commits land that the system can't vouch for, like an agent's push or a merge someone resolved by hand, the approval has to be given again.

:::zh
**一次批准只覆盖一个具体的提交。**如果又有提交进来而系统没法为它背书，比如 agent 推的，或者有人手动解掉冲突的合并，那就得重新批准一次。
:::

:::annotation
风险分级最容易被学歪的地方是把它做成“按作者定信任”。这里的两个分类器分工是合理的，第一个只看改动本身，第二个专门问“这个具体改动还要不要人”。再叠上批准绑定具体提交，以及轻路径只对受信任作者开放。这才是一套能长期运行的规则。少任何一条分级都会退化成熟人免检。
:::

### 6. 合并队列，开关和渐进发布（Merge queue, flags and a gradual release）

:::bi
The merge queue re-runs every check against main with the change applied, so two PRs that pass separately can't combine into a broken main. New behavior usually ships behind a flag to Anthropic employees first, and our heavy use often surfaces regressions before users do. Public releases go to the `latest` channel first. The `stable` channel trails it.

:::zh
合并队列会把改动应用上去，对着 main 把所有检查重跑一遍，这样两个各自都通过的 PR 不会合起来把 main 弄坏。新行为通常会先藏在开关后面，先给 Anthropic 内部的员工用，我们这种高强度使用经常在用户之前就把回归问题顶出来。对外的发布先走 `latest` 通道，`stable` 通道跟在后面。
:::

### 7. 快速发现，快速回滚（Fast detection, fast rollback）

:::bi
Some mistakes will still get through, so the last layer is about catching them fast. Flags turn off without a deploy. Claude Code has a weekly on-call rotation, and incident reviews ask which layer should have caught the issue.

:::zh
有些错还是会漏过去，所以最后一层管的是尽快发现它们。开关不用发版就能关掉。Claude Code 有每周轮换的 on-call，事故复盘会问：这件事本来该由哪一层拦住。
:::

:::bi
Noticing a bad merge still depends on the author and on-call as well as the revert and incident dashboards. We don't yet have circuit breakers that tighten approval when those numbers move; engineers here want them before more code moves to zero-human merges.

:::zh
要发现一次坏的合并，还是得靠作者和 on-call，再加上回滚看板和事故看板。我们还没有那种在数字变化时自动收紧审批的熔断机制。在更多代码走向零人工合并之前，这边的工程师希望能先有这个东西。
:::

:::bi
One colleague said slowing down does lower your error rate, but mostly because you're doing less of everything. We'd rather get faster at noticing and fixing problems.

:::zh
有位同事说，放慢速度确实能降低出错率，但那主要是因为你什么都做得更少了。我们更想练的是更快地发现问题和修好问题。
:::

## 我们怎么把评审员调好（How we make the reviewer better）

:::bi
Our code review process is constantly improving in a loop.

:::zh
我们的代码评审流程是在一个循环里不停变好的。
:::

:::bi
**Any incidents are now an eval.** The team collected past PRs that caused incidents, with their fix-forwards and reverts, and had engineers who know that code confirm each bug and where it lived. The reviewer runs against that set daily.

:::zh
**每一起事故现在都是 eval 里的一个用例。**团队把过去引发事故的 PR 收集起来，连同它们的 fix-forward 和回滚，让熟悉那段代码的工程师确认每个 bug 以及它出在哪段代码里。评审员每天对着这个集合跑一遍。
:::

<figure>
<svg viewBox="0 0 780 372" width="100%" role="img" aria-label="事故即评测的闭环：上排从左边的事故或回滚开始，经箭头到专家确认的用例，再到加入用例集。用例集向下接进下排中间的每日评测。下排从修改评审器开始，经箭头到每日评测，再到分数上升了吗。每日评测对着每个用例打分，分数上升就留下，否则丢掉。最右边一条线绕回最左边，标着下一个改动" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <rect x="294" y="208" width="152" height="70" rx="10" style="fill:var(--accent-soft)"/>
    <circle cx="56" cy="66" r="5.4" style="fill:var(--fg-muted)"/>
    <text x="74" y="70.6" font-size="13.5" font-weight="600" style="fill:var(--fg)">事故或回滚</text>
    <text x="74" y="89.5" font-size="12.5" style="fill:var(--fg-muted)">一次弄坏了东西的改动</text>
    <circle cx="312" cy="66" r="5.4" style="fill:var(--fg-muted)"/>
    <text x="330" y="70.6" font-size="13.5" font-weight="600" style="fill:var(--fg)">专家确认的用例</text>
    <text x="330" y="89.5" font-size="12.5" style="fill:var(--fg-muted)">专家确认这是个 bug</text>
    <circle cx="568" cy="66" r="5.4" style="fill:var(--fg-muted)"/>
    <text x="586" y="70.6" font-size="13.5" font-weight="600" style="fill:var(--fg)">加入用例集</text>
    <text x="586" y="89.5" font-size="12.5" style="fill:var(--fg-muted)">每次事故加一个用例</text>
    <circle cx="56" cy="246" r="5.4" style="fill:var(--fg-muted)"/>
    <text x="74" y="250.6" font-size="13.5" font-weight="600" style="fill:var(--fg)">修改评审器</text>
    <text x="74" y="269.5" font-size="12.5" style="fill:var(--fg-muted)">改它的提示词，工具或模型</text>
    <circle cx="312" cy="246" r="5.4" style="fill:var(--accent)"/>
    <text x="330" y="250.6" font-size="13.5" font-weight="600" style="fill:var(--accent-strong)">每日评测</text>
    <text x="330" y="269.5" font-size="12.5" style="fill:var(--fg-muted)">对着每个用例打分</text>
    <circle cx="568" cy="246" r="5.4" style="fill:var(--fg-muted)"/>
    <text x="586" y="250.6" font-size="13.5" font-weight="600" style="fill:var(--fg)">分数上升了吗？</text>
    <text x="586" y="269.5" font-size="12.5" style="fill:var(--fg-muted)">上升就留下，否则丢掉</text>
    <line x1="224" y1="66" x2="297" y2="66" style="stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M304 66 L296 69.6 M304 66 L296 62.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <line x1="460" y1="66" x2="553" y2="66" style="stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M560 66 L552 69.6 M560 66 L552 62.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M568 78 L568 158 L312 158 L312 200" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M312 204 L308.4 196 M312 204 L315.6 196" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <line x1="224" y1="246" x2="281" y2="246" style="stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M288 246 L280 249.6 M288 246 L280 242.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <line x1="452" y1="246" x2="553" y2="246" style="stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M560 246 L552 249.6 M560 246 L552 242.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <path d="M568 276 L568 332 L56 332 L56 270" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M56 266 L59.6 274 M56 266 L52.4 274" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <text x="300" y="325" font-size="12.5" style="fill:var(--fg-subtle)">下一个改动</text>
  </g>
</svg>
<figcaption><span class="bi-en" lang="en">The eval grows with every incident, and every change to the reviewer is scored against all of it.</span><span class="bi-zh">用例集随着每次事故长大，评审器的每一次改动都要对着全部用例打分</span></figcaption>
</figure>

:::annotation
这个闭环和传统回归测试是一个思路，只是被测对象从代码换成了评审员的判断。每一起事故都要能复现成用例，评审员改提示词，换工具或者换模型之后，先对着全部历史事故打分，分数没涨就不算改好，这样让调评审员这件事从凭感觉变成了有账可查。
:::

:::bi
**We measure noise by watching what people do with the comments.** It's easy to catch more bugs if you don't mind flagging a lot of non-bugs, so we need a check on that. We sort every comment the reviewer leaves by how the person on the PR responded: they fixed it, said it was wrong, said the behavior was intentional, or decided it didn't matter. We also run the reviewer on PRs we know are clean and count how often it reports something that would have led someone to make a harmful change. Our priority, written down, is catching real bugs first and cutting review rounds second.

:::zh
**我们靠看人怎么处理评论来衡量噪音。**如果不介意标出一堆不是问题的东西，多抓 bug 是很容易的，所以这里需要有个约束。评审员留下的每条评论，我们按 PR 上那个人的反应来归类：他修了，他说这条错了，他说这个行为本来就是他想要的，或者他觉得无所谓。我们还会拿评审员去跑那些我们知道是干净的 PR，数一数它报出来的东西里，有多少次会让人做出有害的改动。我们的优先级是写下来的：先抓真 bug，其次才是减少评审轮次。
:::

:::bi
Noise costs more when the author is an agent. A person can wave off a nit in seconds. An agent fixes it, which means another commit and another round of review.

:::zh
作者是 agent 的时候，噪音的代价更高。人几秒钟就能把一条小毛病挥手放掉，agent 会去修，那就意味着又一个提交和又一轮评审。
:::

:::bi
**Review has to converge.** An agent author and an agent reviewer can keep each other busy indefinitely. One CLI PR went through more than fifty rounds of review and fixes overnight before its author stopped it.

:::zh
**评审必须收敛。**agent 作者和 agent 评审员可以让彼此无限忙下去。有一个 CLI PR 一晚上过了五十多轮评审和修复，最后是它的作者把它叫停的。
:::

:::bi
When we ran git blame on what the reviewer kept flagging, about 59% of it was code that had been there since the reviewer's first pass. The reviewer was rarely finding new bugs, it was finding a few more old ones each round.

:::zh
我们对评审员反复挑出来的东西跑了 git blame，其中约 59% 是自从评审员第一遍看过之后就没动过的代码。评审员很少在找新的 bug，它每一轮只是在多找几个旧 bug。
:::

:::bi
We made it worse ourselves. We'd gotten used to running several rounds by default, since each pass catches something new. This can be worthwhile on a risky change, but not on every PR. The team now tracks rounds-to-pass alongside recall, and changed re-review:

:::zh
这部分也有我们自己加重的成分。我们习惯了默认跑好几轮，因为每一遍都能抓到点新东西。对一个有风险的改动，这可能值得，但不是每个 PR 都值得。团队现在把通过所需轮数和召回率放在一起看，并且改了重新评审的做法：
:::

:::bi
- **A round cap.** After three rounds, the reviewer asks the author to step back and reconsider the approach.
- **Diff-only re-review** after the first few passes.
- **Flag the class of bug,** so the author fixes every instance, not one line.
- **No repeats** of findings already posted.

:::zh
- **设轮数上限。**超过三轮之后，评审员会请作者退一步，重新考虑一下做法。
- **之后只评审新 diff。**头几遍过后，重新评审只看新增的 diff。
- **标出这一类 bug，**让作者把所有实例都修掉，而不是只修一行。
- **不重复。**已经发过的发现不再发。
:::

:::bi
Review agents also run nightly over existing code, helping us catch old bugs before they show up somewhere else.

:::zh
评审 agent 每晚还会在既有代码上跑，帮我们在旧 bug 从别处冒出来之前就抓到它们。
:::

<figure>
<svg viewBox="0 0 780 400" width="100%" role="img" aria-label="评审收敛前后的对比，三组横条，灰色是之前，蓝色是收敛改动之后。前两组共用同一个百分比刻度：一轮评审加修复后通过的比例从 65% 升到 78%，需要五轮及以上的比例从 8.9% 降到 1.5%。第三组换单位，通过所需的平均评审轮数从 2.08 降到 1.32" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="64" y="42" font-size="13.5" font-weight="600" style="fill:var(--fg)">一轮评审加修复后通过</text>
    <rect x="64" y="57" width="429" height="20" rx="4" style="fill:var(--line-strong)"/>
    <text x="504" y="71" font-size="13" style="fill:var(--fg-subtle);font-family:var(--font-mono)">65%</text>
    <rect x="64" y="84" width="514.8" height="20" rx="4" style="fill:var(--accent)"/>
    <text x="589.8" y="98" font-size="13" font-weight="600" style="fill:var(--accent-strong);font-family:var(--font-mono)">78%</text>
    <line x1="64" y1="123" x2="736" y2="123" style="stroke:var(--line);stroke-width:1.2"/>
    <text x="64" y="155" font-size="13.5" font-weight="600" style="fill:var(--fg)">需要五轮及以上</text>
    <rect x="64" y="170" width="58.7" height="20" rx="4" style="fill:var(--line-strong)"/>
    <text x="133.7" y="184" font-size="13" style="fill:var(--fg-subtle);font-family:var(--font-mono)">8.9%</text>
    <rect x="64" y="197" width="9.9" height="20" rx="4" style="fill:var(--accent)"/>
    <text x="84.9" y="211" font-size="13" font-weight="600" style="fill:var(--accent-strong);font-family:var(--font-mono)">1.5%</text>
    <line x1="64" y1="236" x2="736" y2="236" style="stroke:var(--line);stroke-width:1.2"/>
    <text x="64" y="268" font-size="13.5" font-weight="600" style="fill:var(--fg)">通过所需的平均评审轮数</text>
    <rect x="64" y="283" width="453" height="20" rx="4" style="fill:var(--line-strong)"/>
    <text x="528" y="297" font-size="13" style="fill:var(--fg-subtle);font-family:var(--font-mono)">2.08</text>
    <rect x="64" y="310" width="287.5" height="20" rx="4" style="fill:var(--accent)"/>
    <text x="362.5" y="324" font-size="13" font-weight="600" style="fill:var(--accent-strong);font-family:var(--font-mono)">1.32</text>
    <rect x="64" y="360" width="12" height="12" rx="3" style="fill:var(--line-strong)"/>
    <text x="84" y="371" font-size="12.5" style="fill:var(--fg-muted)">之前</text>
    <rect x="182" y="360" width="12" height="12" rx="3" style="fill:var(--accent)"/>
    <text x="202" y="371" font-size="12.5" style="fill:var(--fg-muted)">收敛改动之后</text>
  </g>
</svg>
<figcaption><span class="bi-en" lang="en">Fewer review rounds per internal pull request after the convergence changes</span><span class="bi-zh">收敛改动之后，内部 PR 平均需要的评审轮数明显下降</span></figcaption>
</figure>

:::annotation
人评审慢天然会收敛，agent 评审快反而可能停不下来。如果59% 的发现落在没动过的旧代码上，就说明后面几轮在做重复劳动而不是在找新问题，边际收益是递减的。
:::

## 哪些地方还得人来（Where humans stay in the loop）

:::bi
Pulling a senior engineer out of deep work to catch a routine mistake costs far more than an automated review. People on the team are still responsible for:

:::zh
把一个资深工程师从深度工作里拽出来，只为了抓一个常规错误，代价比一次自动评审高得多。团队里的人仍然要负责这些事：
:::

:::bi
- **Deciding whether to build it.** Direction, taste and scope. One team that declared its review bottleneck solved still kept human review for changes from outside the team, so someone asks "should we even do this?"
- **Reviewing risky code** such as billing, the auto-updater and CI workflows.
- **Reviewing architecture** that sets a pattern others will copy.
- **Reading the evidence.** Test output, the command that ran and what it returned, a screenshot, the reviewer's findings. If you can't say what the checks would miss, ask for a real review rather than a quick approval.
- **Owning the outcome.** A person is accountable for every change that ships, whoever typed it.

:::zh
- **决定要不要做。**方向，品味，范围。有一个团队宣布自己的评审瓶颈已经解决了，但他们仍然保留了对来自团队外部的改动的人工评审，因为总得有人问出“这件事我们到底该不该做”这句话。
- **评审有风险的代码。**比如计费，自动更新器和 CI workflow。
- **评审架构。**尤其是那种会定下一个模式，被后面的人照抄的架构。
- **读证据。**测试输出，实际跑的命令和它的返回，一张截图，评审员的发现。如果你说不出这些检查会漏掉什么，那就去要一次真的评审，而不是一个快速批准。
- **对结果负责。**每一个上线的改动都有一个人在负责，不管代码是谁敲的。
:::

## 在团队里共享上下文（Sharing context across the team）

:::bi
Code review's second job has always been to spread codebase understanding. Reading a teammate's diff is how you learn what changed and how the pieces fit. If machines do most of the reading, how does anyone learn the code?

:::zh
代码评审的第二件事一直是把对代码库的理解摊开。读同事的 diff，是了解改了什么和各个部分怎么拼起来的途径。如果大部分的“读”都由机器做了，人还怎么学这套代码？
:::

:::bi
We don't have a formal process for this. Nobody on the team keeps a complete mental model of Claude Code in their head, and we don't think anyone needs to. When someone wants to understand a part of the codebase, they ask Claude to write an explainer for exactly that slice. It takes minutes and reflects the code as it is today.

:::zh
这件事我们没有什么正式流程。团队里没有谁的脑子里装着 Claude Code 的完整心智模型，我们也不觉得需要有人装着。谁想弄懂代码库的某一部分，就让 Claude 针对那一小块写一份讲解。几分钟就好，而且讲的是今天的代码。
:::

![一张示意图：机器包揽了大部分阅读之后，人怎么理解代码。左边是代码库的方格，其中几格是 managed settings。中间的问题是“怎么让 Claude Code 读取 managed settings”。右边是 Claude 写一份讲解，或者做一个小 artifact](./images/code-review-at-anthropic/sharing-context.jpg)

:::bi
Some of us go a step further and have Claude [build a small artifact](https://claude.dev/blog/using-claude-code-the-unreasonable-effectiveness-of-html/) that visualizes that part of the code and teaches it the way that person likes to learn.

:::zh
我们中有些人还往前走了一步，让 Claude [做一个小 artifact](https://claude.dev/blog/using-claude-code-the-unreasonable-effectiveness-of-html/)，把那一块代码可视化出来，按这个人喜欢的学习方式讲给他听。
:::

:::bi
If the goal is to spend human attention well, this beats reading trivial diffs line by line. A one-line copy change teaches you almost nothing. An explainer for the module you're about to change teaches you a lot. Our culture of defaulting to working on open Slack channels helps too, since you see what others are building while they build it.

:::zh
如果目标是把人的注意力花得更值，这比一行一行地读那些无关紧要的 diff 强。改一行文案，你几乎学不到什么。给你马上要动的那个模块写一份讲解，你能学到很多。我们习惯默认在开放的 Slack 频道里干活，这一点也有帮助，因为别人在搭东西的时候你就看得见。
:::

:::annotation
评审除了拦错，还在传递理解。机器接管了大部分阅读之后，“人怎么学会这套代码”没有消失，只是从读 diff 换成了需要的时候要一份讲解。我们需要把学习的入口从被动等评审变成主动提问。
:::

## “谁落地，谁负责”（"You land it, you own it"）

:::bi
If you land a small or medium change and something still goes wrong, it's a team norm that you usually fix it. A few things keep this from going badly:

:::zh
如果你合进去一个小改动或者中等改动，结果还是出了问题，团队的习惯是你来修。有几件事让这件事不至于变糟：
:::

:::bi
- **Changes are small,** so they're easy to review, debug and revert.
- **Everything is reversible.** Flags, reverts and staged releases undo most mistakes in minutes.
- **Blast radius sets the bar.** Expensive code gets more people and more checks.
- **Regressions surface fast** through telemetry and internal use.
- **It isn't blame.** Owning a fix means you have the most context; incident reviews look at the system.

:::zh
- **改动都小，**所以评审，调试和回滚都容易。
- **什么都能撤。**开关，回滚和分阶段发布能在几分钟内把大部分错误撤掉。
- **影响范围决定门槛。**代价高的代码就要更多人和更多检查。
- **回归问题露头快，**有遥测和内部使用顶着。
- **这不是追责。**负责修，是因为你手上的上下文最多。事故复盘看的是系统。
:::

:::bi
Ownership is also shared. Much of the team works in [open channels](https://claude.com/product/tag) where anyone can see what others are building, pick up a thread, or point a Claude at a gap, and feedback comes from people who don't own the code too. That openness is a big part of how quality stays high without a gate on every line.

:::zh
责任也是分摊的。团队里很多人都在[开放频道](https://claude.com/product/tag)里干活，谁都能看见别人在搭什么，可以接一个话头，也可以把一个 Claude 指向某个缺口，反馈也会来自那些并不拥有这段代码的人。这种开放，是不用对每一行都设一道闸门，质量还能保持在高位的重要原因。
:::

:::annotation
出问题时最该修的人是手里上下文最多的那个人，而不是把键盘敲得最响的人。换到在 agent 写的代码上，这个位置就是指挥 agent 的人。这样定责还有个好处：它同时说明了什么时候该找人帮忙，上下文不够的时候求助代表甩锅。
:::

## 什么时候该换方向（When we change direction）

:::bi
Agents make it cheap to start things, so some work shouldn't land. Usually someone in the channel asks why, points at an earlier decision, or suggests a simpler route, and the author closes or reshapes the PR.

:::zh
agent 让开始一件事变得很便宜，所以有些活就不该落地。通常频道里会有人问一句为什么，指出之前的一个决定，或者提一条更简单的路，然后作者把 PR 关掉或者重新调整一遍。
:::

:::bi
Since the code was fast to write, closing the PR doesn't feel like a loss. The trick is to raise a different direction in the thread early, not as a blocking comment on a finished PR.

:::zh
因为代码写得快，关掉 PR 不太有损失感。诀窍是早点在讨论串里提出另一个方向，而不是等 PR 做完了再挂一条阻塞性的评论。
:::

## 你的团队怎么照搬（How you can adopt this process）

:::bi
Most of the pieces to do this with your team exist today.

:::zh
想在自己的团队里做这件事，大部分零件今天都已经有了。
:::

### 提 PR 之前（Before the pull request）

:::bi
- Give your agent checks it can run, listed in a short `CLAUDE.md`, plus hooks that run formatters and linters.
- Run `/code-review` and `/security-review` locally, or a fresh-context subagent review.
- Add a `REVIEW.md`, and move repeated review comments into it.

:::zh
- 给你的 agent 一些它能跑的检查，写在一份短的 `CLAUDE.md` 里，再加上跑格式化和 linter 的 hook。
- 本地跑 `/code-review` 和 `/security-review`，或者让一个带干净上下文的 subagent 来评审。
- 加一份 `REVIEW.md`，把反复出现的评审意见挪进去。
:::

### 每个 PR 上（On every pull request）

:::bi
- Require CI, and add "Testing", "Risk" and "How to revert" to your PR template.
- Add an AI reviewer (Code Review for Claude Code, or the Claude Code GitHub Action) on one repo, tune `REVIEW.md` for a few weeks, then widen.
- Add automated security review, and require every review thread resolved before merge.
- Match review effort to risk: a quick pass on routine changes, a deep one where a missed bug is expensive (Quick, Standard or Deep in Code Review).
- Cap review rounds; after the first few, re-review only the new diff.

:::zh
- 强制要求 CI，在 PR 模板里加上“怎么测的”“风险”“怎么撤销”三栏。
- 在一个仓库上先加 AI 评审员（Code Review for Claude Code，或者 Claude Code GitHub Action），花几周调 `REVIEW.md`，然后再铺开。
- 加上自动安全评审，并且要求合并之前所有评审讨论串都已解决。
- 让评审的投入和风险匹配：常规改动快速过一遍，漏一个 bug 代价高的地方就走深的那一档（Code Review 里的 Quick，Standard，Deep 三档）。
:::

### 审批（Approval）

:::bi
- Write down risk tiers, set from the change rather than the author; start strict and loosen with evidence.
- Keep the lighter approval paths for authors you trust.
- Use CODEOWNERS and branch protection so auth, billing, CI and release workflows, and installers always need a person.
- Never let a bot's approval replace a required human's; dismiss approvals on new commits.

:::zh
- 把风险等级写下来，按改动定等级而不是按作者定。一开始严，有证据了再放松。
- 轻的审批路径只留给你信任的作者。
- 用 `CODEOWNERS` 和分支保护，让鉴权，计费，CI 和发布 workflow，以及安装器这几类永远需要一个人来批。
- 绝不让 bot 的批准替代必须由人来的批准。有新提交时把批准作废。
:::

### 合并和合并之后（Merge and after）

:::bi
- Use a merge queue, feature flags, internal use first, staged releases and one-step rollback.
- Turn incidents and reverts into an eval set, and rescore the reviewer whenever its prompts, tools or model change.
- Measure human time, with revert and incident rates as the guardrail.

:::zh
- 用合并队列，feature flag，先内部使用，分阶段发布，以及一步回滚。
- 把事故和回滚变成 eval 集合，评审员的 prompt，工具或者模型一有变化就重新打分。
- 衡量人的时间，把回滚率和事故率当作护栏。
:::

## 往哪走（Where this is going）

:::bi
Code Review's [announcement](https://claude.com/resources/articles/code-review) said approving a pull request is still a human call; the product posts findings, not approvals. Our own repos go further, letting owners decide which low-risk changes merge on automated checks alone, and that line keeps moving.

:::zh
Code Review 的[公告](https://claude.com/resources/articles/code-review)里说，批准一个 PR 仍然得由人来做决定。这个产品只发发现，不发批准。我们自己的仓库走得更远一些，让 owner 决定哪些低风险改动只靠自动检查就合并，这条线还在往前挪。
:::

:::bi
When a review misses something, we ask what the model didn't have in front of it and put the fix into a `CLAUDE.md`, a skill or a new check. The goal hasn't changed: less human time per change, and no more reverts than before.

:::zh
评审漏掉东西的时候，我们会问模型当时眼前缺了什么，然后把这个修复补进 `CLAUDE.md`，一个 skill 或者一道新的检查。目标没变：每个改动花的人的时间更少，回滚不比以前多。
:::

:::bi
If your team lets agents open pull requests, we'd like to hear which checks you've automated, which still need a person, and what you think we have wrong.

:::zh
如果你的团队也让 agent 提 PR，我们想听听：哪些检查你已经自动化了，哪些仍然需要人，以及你觉得我们哪里想错了。
:::

:::bi
*With thanks to Emma Webb, Michael Segner and Amie Rotherham for their reviews.*

:::zh
感谢 Emma Webb，Michael Segner 和 Amie Rotherham 的审阅。
:::
