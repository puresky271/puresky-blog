---
title: '用 Claude Code：把投入花在刀刃上'
description: '对同一个模型而言，投入的思考档位不同，做出来的东西差别很大。Anthropic 的 Thariq Shihipar 用三次构建实验和 Terminal-Bench 3.0 的全量失败分析说明：投入主要买到的是验证和边界情况测试，所以硬件，代码评审，安全这类任务吃投入，普通功能开发则适合低档起草，高档验证。'
pubDate: 2026-11-08
author: 'Thariq Shihipar'
category: curation
tags: ['Claude Code', 'LLM', '评测', 'AI 编程', 'Anthropic团队·Thariq Shihipar']
featured: true
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 工程师 Thariq Shihipar 2026 年 9 月 25 日发在 Anthropic 官方博客 [claude.dev 的《Using Claude Code: Spending your effort》](https://claude.dev/blog/spending-your-effort/) 的中英对照版。页面顶部的开关可以在中文译文和英文原文之间切换，逐段对照，标题，链接和脚注都留在原位。原文里的六个交互图都按原站的行为重做成站内的交互组件，标签页，滑块，重播，悬停和逐步骤播放都能用，图内文字译成中文，产品名，模型名和基准名保留英文。版权归原作者与 Anthropic 所有，译文只作学习交流之用。带铅笔图标的注解是我加的，只代表我的判断，中英两种模式下都会显示。

:::bi
One of the best parts of our newest Claude models is how they respond to effort without [breaking the prompt cache](https://claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything/) in Claude Code, but I’ve received a lot of questions on this from users. [What is effort](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) really, and when do you use which effort level? Why do we need effort at all?

:::zh
我们最新的几个 Claude 模型最出彩的地方之一，是它们能响应投入程度（effort）的设置，同时又不会破坏 Claude Code 里的[提示词缓存](https://claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything/)。不过关于这一点，我收到过用户的大量提问：[投入程度到底是什么](https://claude.com/blog/claude-model-and-effort-level-in-claude-code)，什么时候该用哪一档？我们为什么需要它？
:::

:::bi
To answer this, I decided to do a deep dive into the evals and do my own tests of effort across normal work.

:::zh
为了回答这些问题，我把评测仔细翻了一遍，也在日常工作里自己测了不同档位的投入。
:::

:::bi
At a high level, I found that effort was a great way of modulating how much verification and edgecase testing Claude did and how much of its own judgement it used. Extra effort gave better results in domains where verification and edgecase testing was more useful like hardware, code review, and security.

:::zh
总的来看，我发现投入程度是一个很好用的调节手段，它决定 Claude 花多少力气做验证和边界情况测试，也决定它多大程度上用上自己的判断。在硬件，代码评审，安全这类更需要验证和边界测试的领域，多给投入能换来更好的结果。
:::

:::bi
For normal software engineering, I’m running a loop of getting the model to interview me then implementing on low effort, reviewing what it built, and then running verification on high effort.

:::zh
日常的软件工程里，我现在跑的是这样一个循环：让模型先访谈我，用低档实现，看它做出来的东西，最后用高档做验证。
:::

## 投入程度是什么（What is effort?）

:::bi
At a high level, effort gives the model an approximation of how much compute you want it to spend on the task. It’s somewhat related to your modeling of the difficulty of the task.

:::zh
总的来讲，投入程度是给模型的一个大概估计，让它知道你希望它在这个任务上花多少算力。它和你心里对任务难度的估计多少有点对应。
:::

:::bi
Think of it this way, if someone asked you to do something in 12 hours straight, you might assume they just want you to do it and try very hard. If someone asked you to do the same task in 1 hour, you’d try to get them the best version that meets their task and then expect to iterate from there.

:::zh
可以这样想。如果有人让你连续 12 个小时做一件事，你大概会认为对方就是想让你把它做出来，那就拼命做好。如果同一个人让你在 1 个小时内做完同一件事，你会尽量交出一个满足要求的最好版本，然后指望再在这个版本上迭代。
:::

:::bi
Or, you might push back and say the task requires at *least* 3 hours and then work for 3 hours to deliver it.

:::zh
也可能你会顶回去，说这个任务*至少*要 3 个小时，然后用 3 个小时把它交出来。
:::

:::bi
You should think of effort in the same way. Claude will always try and do your task reasonably, but higher effort will involve Claude taking more independent action for judgement and verification.

:::zh
对投入程度也该这么理解。Claude 总会尽量合理地把你的任务做出来，但档位越高，它就越会自己拿主意，主动去做更多的判断和验证。
:::

:::annotation
这里容易误读成“投入越高模型想得越久”，更准确的说法是它愿意在验证和自动判断上多花 token，跑测试，读依赖的源码，构造对拍，这些才是高档真正买到的东西。想让它“再想想”和想让它“自己检查一遍”是两回事。
:::

## 投入曲线（Effort curves）

:::bi
Fable 5.1 and Opus 5.5’s effort curves are our best yet: at each level, there is an uptick in benchmark scores and tokens consumed.

:::zh
Fable 5.1 和 Opus 5.5 的投入曲线是我们目前做得最好的一版：每往上一档，基准测试的分数和消耗的 token 都会抬升。
:::

:::animation sye-curve
:::

:::bi
But what does this mean in practice? To evaluate this, I tried several tasks at different effort levels and pored over the benchmarks.

:::zh
但这些放到实践里是什么意思？为了弄清楚，我在不同档位上试了好几个任务，也把榜单仔细看了一遍。
:::

## 用投入程度搭东西（Building with effort）

:::bi
The best way to understand how models work is to run experiments. I tried doing the same tasks at several different effort levels on Opus 5.5 to understand the work it would do. I did this on a wide variety of work, but am illustrating this with a few toy examples.

:::zh
理解模型怎么工作，最好的办法是做实验。我在 Opus 5.5 上用几个不同的档位做同样的任务，看它会把活做成什么样。我试过的工作种类很杂，这里挑几个小例子来讲。
:::

### 规格没说清的构建任务（Underspecified build task）

:::bi
If I ask Claude to “build a personal fitness and workout tracker app,” effort changes dramatically how fleshed out the app is, but also results in Claude making more choices along the way. At low effort, the fitness app is just a log and a simple graph. At higher effort levels the app is more complex with additional detail. At max effort there’s a heat chart.

:::zh
如果我让 Claude“做一个个人健身和训练记录 app”，投入程度会极大改变这个 app 的完成度，也会让 Claude 沿途自己做更多选择。低档时，这个健身 app 只有一个训练日志和一张简单的图。档位越高，app 越复杂，细节越多。最高档时还多了一张热力图。
:::

:::animation sye-builds
:::

:::bi
If I wanted a simple base to iterate from, low effort would get it done. Max effort would be if I wanted Claude’s best one shot.

:::zh
如果我想要一个简单的底子，好在上面迭代，低档就够了。最高档是想要 Claude 一次就拿出它最好的版本时才用。
:::

### 规格只给个大概的设计任务（Lightly specified design task）

:::bi
What if I have a task that is fairly specified already but I want some exploration with Claude? As an example I tried to ask it to redesign the `/config` menu in [Claude Code](https://claude.com/product/claude-code). Every pass had roughly the same idea, to use submenus and better search.

:::zh
如果任务已经写得比较清楚，但我还想让 Claude 带一点探索呢？举个例子，我让它重新设计 [Claude Code](https://claude.com/product/claude-code) 里的 `/config` 菜单。每一轮的结果大方向都差不多，都是用子菜单和更好的搜索。
:::

:::bi
At low effort (which took 1 minute), I got an interactive sketch that conveyed the idea but didn’t look very much like Claude Code.

:::zh
低档时（花了 1 分钟），我拿到一个可以点着玩的草图，意思传达到了，但看起来不太像 Claude Code。
:::

:::bi
At max effort (which took 28 minutes), I got a mockup that looked very much like Claude Code, along with a bunch of walkthroughs for different flows.

:::zh
最高档时（花了 28 分钟），我拿到一份很像 Claude Code 的效果图，还附了几段不同流程的走查演示。
:::

:::bi
If my goal was to iterate and give feedback, low effort would get there much faster. But max effort gives me something much more polished right off the bat. For this particular task, I think I prefer using low effort to understand Claude’s vision.

:::zh
如果我的目标是先迭代，给反馈，低档能快得多地走到那一步。但最高档一上来就给我一个精致得多的东西。就这个任务来说，我觉得用低档先摸清 Claude 的设想更好。
:::

:::animation sye-config
:::

### 规格给得很细的构建任务（Highly specified build task）

:::bi
What if I gave Claude lots of details? I tried asking Claude to interview me in-depth about the fitness app and then gave that spec to be implemented by different models at different effort levels.

:::zh
如果我给 Claude 大量细节呢？我让 Claude 就这个健身 app 深度访谈我，然后把整理出的规格交给不同模型，在不同档位上实现。
:::

:::bi
I found that given this spec, the models behaved much more similarly. I got designs that looked fairly similar and had similar implementations but with different details, at max effort Claude took some time to simplify a few of the details.

:::zh
我发现有了这份规格之后，各模型的表现接近多了。几个设计长得挺像，实现也差不多，只是细节有出入。最高档时，Claude 还花时间把其中几处细节简化了。
:::

:::animation sye-phone
:::

### 几点结论（Takeaways）

:::bi
For regular software engineering, particularly new feature work, the effort level depends a lot on how in the loop I want to be. Low effort allows Claude to respond quickly with a starting point, higher effort levels will get more work done but Claude will also make more assumptions on my behalf.

:::zh
对日常的软件工程，尤其是新功能开发来说，用哪一档很大程度上取决于我想参与到什么程度。低档能让 Claude 很快给出一个起点，更高的档位能把更多活干完，但 Claude 也会替我做出更多假设。
:::

:::bi
A particularly fruitful loop for feature development I’ve been using is:

- Give Claude a spec and ask it to interview me about any details I’m missing
- Implement it on low effort
- Review to make sure it got the gist of it correct, iterate on low effort as needed
- Verify and test on high effort

:::zh
我最近做功能开发时用得挺顺的一套循环是：

- 给 Claude 一份规格，让它访谈我，问清我漏掉的细节
- 用低档实现
- 审一遍，确认它把大方向抓对了，需要的话在低档上迭代
- 在高档上做验证和测试
:::

:::annotation
低档起草，高档验证这个循环，本质上是把模型的两件事分开计价：写代码便宜，验证贵。低档省下的是生成时间，高档买到的是它愿意自己去找反例。两个价位差得很远，混在一起用反而两边都不划算。
:::

## 投入档位怎么影响难题上的产出（How effort levels impact output on difficult tasks）

:::bi
But these are obviously toy examples, where Claude is well able to complete them. What about when the difference is between Claude completing the task or not completing the task?

:::zh
但这些显然都是玩具级的例子，Claude 做起来不费劲。当差别在于 Claude 能不能把任务做完时，又是什么情况？
:::

:::bi
To find these difficult problems, you have to go to the benchmarks so I dove into one I like: Terminal-Bench 3.0, a community-sourced benchmark.

:::zh
要找这种难题，就得去基准测试里找。我细看了一个我喜欢的：Terminal-Bench 3.0，一个由社区出题的基准。
:::

:::bi
Terminal-Bench 3.0 problems can broadly be separated into categories like security, hardware, ML, science, software, operations and media. You can see all of the problems here: <https://github.com/harbor-framework/terminal-bench/releases/tag/v3.0.0>. They’re sourced from the community, so anyone can contribute.

:::zh
Terminal-Bench 3.0 的题目大致可以分成安全，硬件，机器学习，科学，软件，运维和多媒体这些类别。全部题目都在这里：<https://github.com/harbor-framework/terminal-bench/releases/tag/v3.0.0>。题目来自社区，谁都可以贡献。
:::

:::bi
It’s worth reading to get a sense of the type of problems these models face. I found I was surprised by the scope and ambition of a lot of these tasks. They are much more complicated than the average task I’d face.

:::zh
这些题值得读一读，能让你感受这些模型面对的是什么样的问题。我自己看的时候，被很多任务的规模和野心惊到了。它们比我平时遇到的一般任务复杂得多。
:::

:::bi
For example, some of the tasks included:

- **Hardware** (`retro-console-soc`): build an 8-bit game console in Verilog that fits a small FPGA and renders a test ROM.
- **Science** (`takens-embedding-lean`): formally prove Takens’ embedding theorem in Lean 4.
- **ML** (`mp-checkpoint-consolidation`): merge 16 shards of a mixture-of-experts checkpoint into one file that reproduces the reference logits.
- **Operations** (`intrastat-meldung`): run a company’s month-end EU trade-statistics filing end to end.
- **Media** (`layout-config-recreation`): rebuild a poster image as an editable layout file.

:::zh
举个例子，其中一些题目是这样的：

- **硬件**（`retro-console-soc`）：用 Verilog 造一台 8 位游戏机，要能塞进一块小 FPGA，还要能渲染测试 ROM。
- **科学**（`takens-embedding-lean`）：在 Lean 4 里形式化证明 Takens 嵌入定理。
- **机器学习**（`mp-checkpoint-consolidation`）：把一个混合专家模型 checkpoint 的 16 个分片合并成一个文件，并复现出参考 logits。
- **运维**（`intrastat-meldung`）：端到端跑完一家公司月末的欧盟贸易统计申报。
- **多媒体**（`layout-config-recreation`）：把一张海报图重建成可编辑的排版文件。
:::

### 边界情况多的时候，高投入更管用（Higher effort levels help when there are many edge cases）

:::bi
My main takeaway from reading the Terminal-Bench 3.0 results was that **higher effort is best for tasks with lots of hidden edge cases.**

:::zh
我读 Terminal-Bench 3.0 结果时最大的收获是：**对藏着很多边界情况的任务，更高的投入档位最管用。**
:::

:::bi
A clean example is `html-js-filter`, a Terminal-Bench 3.0 task that asks for an HTML sanitizer that strips every way of smuggling JavaScript into a page. Fable 5.1 went from 1/5 at low to 5/5 at xhigh.¹

:::zh
一个很干净的例子是 `html-js-filter`，一道 Terminal-Bench 3.0 题，要求写一个 HTML sanitizer，把往页面里夹带 JavaScript 的各种路子统统剥掉。Fable 5.1 从低档的 1/5 升到超高档的 5/5。¹
:::

:::bi
A typical attempt at low effort takes about 2 minutes. Each of these attempts wrote a filter in roughly one pass, then tested it against a single hand-written page.

:::zh
低档的一次典型尝试大约 2 分钟。这些尝试基本上都是一口气写完过滤器，然后拿一个手写的页面测一下。
:::

:::bi
A high-effort run finishes in about 33 minutes. In the run I traced, it adversarially reviewed its first draft, then read the installed parser’s source to check for bugs, ran many clean test cases until they gave the same output as the input, ran a standard XSS test suite, and finally, wrote a random-document fuzzer.

:::zh
高档的一次运行大约 33 分钟收尾。在我追踪的那次里，它先抱着找茬的态度复审了自己的初稿，然后去读已安装解析器的源码查 bug，跑了很多干净的测试用例，直到经过过滤之后输出和输入一模一样，又跑了一套标准的 XSS 测试，最后还写了一个随机文档的 fuzzer。
:::

:::bi
For something as edge-cased as a HTML sanitizer, this extra effort is well worth it. [Spending more tokens for thoroughness](https://claude.dev/blog/what-a-task-costs-on-opus-5-5/) also makes sense for complex tasks with high production requirements such as performance optimization or security review.

:::zh
对 HTML sanitizer 这种边界情况扎堆的东西，多花的这些力气很值。像性能优化或者安全评审这类生产要求高的复杂任务，[为了周全多花一些 token](https://claude.dev/blog/what-a-task-costs-on-opus-5-5/) 也是划算的。
:::

:::bi
But you don’t need this level of effort for every task.

:::zh
但并不是每个任务都需要这个级别的投入。
:::

:::bi
The diagram below shows every Terminal-Bench 3.0 result and how it failed, across different models and effort levels. Overall, increasing effort tends to reduce failures due to missing edgecases (purple blocks), but does not fix when the model has the wrong approach (blue blocks).

:::zh
下面这张图把 Terminal-Bench 3.0 的每一次结果都画了出来，按模型和投入档位分组，颜色标的是它怎么失败的。总体来看，提高投入能减少因为漏掉边界情况造成的失败（紫色格子），但改不了模型方向就错了的情况（蓝色格子）。
:::

:::animation sye-failures
:::

:::annotation
你可以看到蓝色格子几乎不随档位变化，投入能补上执行时的疏漏补不了路线选错。所以先花时间把需求和方向讲清楚比事后把档位拉满便宜得多。
:::

### 哪些问题领域更吃投入（Problem areas where effort helps）

:::bi
One of the most interesting takeaways for me from evaluating these models on Terminal-Bench 3.0 was that there were some problem areas that benefited from effort more than others. You can see a breakdown in the following diagram:

:::zh
在用 Terminal-Bench 3.0 评测这些模型的过程里，我最有意思的收获之一是：有些问题领域就是比其他领域更吃投入。下面的图做了拆解：
:::

:::animation sye-payoff
:::

:::bi
To illustrate this, I chose a few problems from different areas from Terminal-Bench 3.0 where Opus 5.5 failed at low effort but succeeded at high effort — mostly because it tested and accounted for edge cases:

:::zh
为了说明这一点，我从 Terminal-Bench 3.0 的不同领域里挑了几道题，都是 Opus 5.5 在低档失败而在高档做成的，原因多半是它在高档下测到了并把边界情况考虑了进去：
:::

:::bi
**`mvcc-lsm-compaction`**: a Terminal-Bench 3.0 task that asks for a fix to a storage-engine bug from its crash report, without breaking compaction. Opus 5.5 went from 0/5 at low to 4/5 at xhigh.

:::zh
**`mvcc-lsm-compaction`**：一道 Terminal-Bench 3.0 题，要求根据崩溃报告修好一个存储引擎的 bug，同时不能弄坏 compaction。Opus 5.5 从低档的 0/5 提到超高档的 4/5。
:::

:::bi
At low (about a minute per attempt), Claude would edit the code before building it or running the reproducer, and did not check that its new test would have caught the original bug.

:::zh
低档时（一次尝试大约 1 分钟），Claude 会先改代码，之后才去编译或者跑复现脚本，也没检查过自己新写的测试能不能抓住原来的 bug。
:::

:::bi
At xhigh (about 11 minutes), Claude reproduced the crash first, wrote a randomized test against a reference that never compacts, and checked that its tests failed on half-finished fixes.

:::zh
超高档时（大约 11 分钟），Claude 先把崩溃复现出来，再拿一个从不做 compaction 的参照实现写随机测试，还检查了自己的测试在半成品的修复上会不会失败。
:::

:::bi
**`cli-2ph-simplex`**: a Terminal-Bench 3.0 task that asks for a CLI linear-program solver written in Python. Opus 5.5 went from 0/5 at low to 5/5 at high.

:::zh
**`cli-2ph-simplex`**：一道 Terminal-Bench 3.0 题，要求用 Python 写一个命令行线性规划求解器。Opus 5.5 从低档的 0/5 提到高档的 5/5。
:::

:::bi
The low attempts wrote a solver in one pass, checked it with a few small problems and stopped around 10k tokens. In the final message, Claude warned it might be slow on big problems, but did not check.

:::zh
低档的几次尝试都是一口气写完求解器，拿几道小题目验一下，到 1 万 token 左右就收手了。最后一条消息里，Claude 提醒说在大问题上可能会慢，但没有去验证。
:::

:::bi
During the high attempts, Claude tested its solver on random problems against a separate brute-force solver, then timed bigger ones, hit cases that ran far too long or crashed, and reworked its search.

:::zh
高档的几次尝试里，Claude 拿一套独立的暴力求解器做对照，在随机题目上测自己的求解器，接着给更大的题目计时，碰到运行时间长到离谱或者直接崩掉的情况，再回头重做搜索部分。
:::

:::bi
**`gsea-proteomics`**: a Terminal-Bench 3.0 task that asks for a gene set enrichment analysis (GSEA) on proteomics data to find which of eight treatments resemble a target tissue. Opus 5.5 went from 0/5 at low to 4/5 at high.

:::zh
**`gsea-proteomics`**：一道 Terminal-Bench 3.0 题，要求对蛋白质组学数据做基因集富集分析（GSEA），找出八种处理里哪几种接近目标组织。Opus 5.5 从低档的 0/5 提到高档的 4/5。
:::

:::bi
At low effort, Claude picked a reasonable-sounding way to prep the data, ran the analysis that one way, and reported the result.

:::zh
低档时，Claude 挑了一种听起来合理的预处理方式，就按这一条路把分析跑完，然后报出结果。
:::

:::bi
At high, Claude tried two ways of prepping the data, noticed that the list of significant treatments changed, and dug into why before choosing the correct one.

:::zh
高档时，Claude 试了两种预处理数据的方式，注意到有显著差异的处理组会变，于是先弄清楚为什么会变，再选出正确的那种。
:::

:::bi
If a user were in the loop, Claude may have asked the user about the way to set up the problem, but without a user in the loop, high effort does better.

:::zh
如果回路里有用户，Claude 也许会问用户这个问题该怎么设定。但回路里没有用户时，高档做得更好。
:::

### 在 Claude Code 里什么时候用哪一档（When to use different effort levels in Claude Code）

:::bi
Here’s my rule of thumb on when to use which effort level:

:::zh
下面是我总结的什么时候用哪一档的经验法则：
:::

:::bi
- **Low**: for when I want quick responses that are in the loop, e.g. brainstorming, sketching, easy changes
- **Medium**: for most of my regular software engineering work, e.g. new feature implementation.
- **High**: for work where verification is important or there are edge cases, e.g. fixing a bug in a brownfield codebase.
- **Max**: When I want Claude to operate fully autonomously to solve difficult problems, e.g. end to end building and verification of an app, finding security vulnerabilities in critical software.

:::zh
- **低档**：想要快速响应，自己还留在回路里的时候用，比如头脑风暴，画草图，简单改动
- **中档**：大部分日常的软件工程工作，比如实现新功能。
- **高档**：验证很重要或者边界情况多的活，比如在历史包袱很重的老代码库里修 bug。
- **最高档**：想让 Claude 完全自主地解决难题的时候，比如把一个 app 从搭建到验证端到端做完，在关键软件里找安全漏洞。
:::

:::bi
Try varying effort for Opus 5.5 and Fable 5.1 based on your task or even mid-conversation by using `/effort` in Claude Code and let me know if this matches your intuition.

:::zh
不妨在 Opus 5.5 和 Fable 5.1 上按任务换换档位，甚至可以对话到一半直接用 Claude Code 里的 `/effort` 切，试完告诉我这是不是也符合你的直觉。
:::

:::bi
*¹ A note on the numbers: these come from our own internal runs, 5 attempts per task, with our production safety interventions off for Fable 5.1; in Claude products, Fable 5.1’s safeguards hand some security requests to Opus. The security tasks also ran without internet access, so the per-task counts here won’t line up with the public leaderboard or the launch post. The worked examples come from individual runs, some at intermediate effort settings.*

:::zh
*¹ 关于这些数字的说明：它们来自我们自己的内部运行，每个任务 5 次尝试。跑 Fable 5.1 时我们关掉了生产环境的安全干预。在 Claude 产品里，Fable 5.1 的防护机制会把一部分安全相关的请求交给 Opus。安全类任务同样是在没有网络访问的情况下跑的，所以这里每个任务的计数不会和公开榜单或者发布文章里的数字对上。文中的例子来自单次运行，有些用的是中间的投入档位。*
:::

:::annotation
这组数字和公开榜单对不上是正常的。因为样本只有每个任务 5 次，而且安全干预也关掉了。拿它判断方向即可，别当排名。
:::
