---
title: '用“混沌循环”把 Claude Docs 的上线磨稳：20 亿次请求里只有 60 个服务端错误'
description: 'Claude Docs 上线前三周还只是单节点上的概念验证，上线六天后文档数突破 460 万份。这篇复盘讲了两个决定：把 Claude 放进一个持续两周的混沌循环里，让它自己压测，读遥测，写修复，再把服务做到足够可解读，让任何一个数字都能追回自己写的代码。上线后 20 亿次请求里只有 60 个服务端错误，一次都没回滚。'
pubDate: 2026-11-20
author: 'Vivek Nair'
category: curation
tags: ['软件工程', 'Claude Code', 'Agent', '方法论', 'Anthropic团队·Vivek Nair']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 工程博客 [Using a "chaos loop" to harden the Claude Docs launch: 60 server errors across billions of requests](https://claude.dev/blog/chaos-loop-claude-docs-launch/) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2026 年 11 月 17 日，作者是 Vivek Nair，全文逐段译出，没有略去章节。译文按原意译出，术语和小标题做了中文化，原文里的外链都保留着。原文配图三张，用的都是原图，图下加了一行中文小字，说明这张图该看哪里。版权归原作者和 Anthropic 所有，译文只作学习交流之用。文中带铅笔图标的注解是我加的补充说明，不属于原文。

:::bi

Three weeks before Claude Docs opened to the public, it was running as a proof of concept on a single node, used by a few thousand people inside Anthropic. We were racing toward an ambitious launch date, and our own estimate said we'd see millions of docs within the first few days.

:::zh

在 Claude Docs 正式对外开放的三周前，它还只是跑在单个节点上的一个概念验证，Anthropic 内部有几千人在用。当时我们正朝一个野心不小的上线日期猛赶，而我们自己的估算说，上线头几天就会有几百万份文档。
:::

:::bi

We launched on September 16. By September 22, people had created over 4.6 million docs. Across 2 billion requests we saw only 60 server errors, and we never had to roll back. The whole Docs service ran on about 50 memory-optimized pods.

:::zh

我们在 9 月 16 日上线。到 9 月 22 日，人们已经创建了超过 460 万份文档。20 亿次请求里我们只看到 60 个服务端错误，一次都没有回滚。整个 Docs 服务跑在大约 50 个内存优化型 Pod 上。
:::

:::annotation
60 个服务端错误对 20 亿次请求，大约是每 3300 万次请求出一个，比例在十亿分之三十。这个数字只统计服务端错误，客户端问题，被限流的请求都不在里面，读的时候别把它当成“总错误率”。
:::

:::bi

Two decisions got us there:

:::zh

能走到这一步，靠的是两个决定：
:::

:::bi

- **A chaos loop at launch scale.** We set up a test harness on our staging environment where Claude ran constantly for two weeks to try and break the service. It load tested every part of our infrastructure and fixed whatever fell over.
- **Improving legibility to Claude.** Claude could only close the loop effectively on fixes if our system produced accurate telemetry every iteration. We made a call early to avoid any runtime that uses memory or CPU in ways our code can't easily control (e.g. runtimes with garbage collection). When a telemetry signal looked concerning, Claude could easily trace it to a bug or a specific design decision.

:::zh

- **上线规模的混沌循环。** 我们在预发布环境上搭了一套测试装置，让 Claude 连续跑了两周，不停地试图把服务弄坏。它对我们基础设施的每一部分都做了压测，哪里倒了就修哪里。
- **让服务对 Claude 更可解读。** 只有我们的系统在每一轮迭代里都产出准确的遥测数据，Claude 才能在修复上真正闭环。我们很早就做了决定，避开那些内存或 CPU 的用法不受我们代码掌控的运行时（比如带垃圾回收的运行时）。当某个遥测信号看起来可疑时，Claude 能轻松追到它是一个 bug，还是某个具体的设计决定。
:::

:::bi

But honestly, this only worked because our frontier models have gotten much better recently (I used an internal research model roughly comparable to Claude Fable 5.2). In our experience, they can now stick with one goal through a run like this for weeks, which is what helped us hit launch scale in a tight timeline.

:::zh

但说实话，这套东西能成，只是因为我们最近的前沿模型进步了很多（我用的是一个内部研究模型，大致相当于 Claude Fable 5.2）。以我们的经验，它们现在能在这样一次长跑里盯住同一个目标好几周，正是这一点帮我们在很紧的时间表里做到了上线规模。
:::

## 混沌循环（The chaos loop）

:::bi

A few thousand internal users on one machine told us nothing about whether the service would survive launch, and we obviously didn't have launch traffic to test with.

:::zh

几千个内部用户跑在一台机器上，说明不了这个服务能不能扛过上线，而我们显然也没有上线级别的流量可以拿来测试。
:::

:::bi

We wanted real evidence to decide how fast we could roll out. So on September 4, about two weeks before launch, I had Claude drive a staging cluster that mirrored production at over a million synthetic docs a day and break core components on purpose. And then... I just left it running (I've included the full cost at the end of this article).

:::zh

我们需要真实的证据，来决定服务能以多快的速度推出去。于是在 9 月 4 日，离上线大约两周的时候，我让 Claude 去驱动一个镜像生产环境的预发布集群，每天造出一百多万份合成文档，并且故意弄坏核心组件。然后……我就那么让它一直跑着（完整的花费放在文章末尾了）。
:::

:::bi

My setup was pretty simple. The loop was a session in Claude Code that I left running: pick a scenario, run the harness, read the telemetry, propose a fix, ship it to staging, repeat. That session acted as a coordinator and handed most of the work to sub-agents. In the busiest week, that usually meant about 11 sub-agents running at a time, and 30 at the peak. The coordinator also talked to our internal variant of Claude Tag (beta) via the Slack MCP to learn from other infrastructure teams at Anthropic who had scaled similar services. Their agents checked our scaling approach for pitfalls they’d already hit.

:::zh

我的设置很简单。这个循环就是一个我一直开着的 Claude Code 会话：选一个场景，跑测试装置，读遥测，提出修复，发布到预发布环境，重复。那个会话充当协调者，把大部分工作分给子 agent。最忙的一周里，通常同时有大约 11 个子 agent 在跑，峰值到过 30 个。协调者还通过 Slack MCP 跟我们内部那个 Claude Tag (beta) 变体对话，向 Anthropic 其他扩过类似服务的基础设施团队取经。他们的 agent 帮我们检查扩容方案，看有没有他们早就踩过的坑。
:::

:::annotation
协调者加子 agent 的结构，值得注意的其实是上限：同时跑 11 个，峰值 30 个。再往上加，要算的是 token 账单和互相干扰，不是能力够不够。作者在结尾也说，退回单个 agent 一样能跑。
:::

:::bi

The fun part was picking scenarios I thought were paranoid:

:::zh

最过瘾的是挑场景，挑的都是我自己都觉得有点偏执的：
:::

:::bi

- 10M new docs created in a single day
- 22,000 live connections reconnecting at once
- One hot doc with hundreds of viewers, a server killed while it was still loading a doc, and the database stalling

:::zh

- 一天创建 1000 万份新文档
- 2.2 万条活跃连接同时重连
- 一份热文档有几百个查看者，一台服务器在加载文档的途中被杀掉，还有数据库卡住
:::

:::bi

Each iteration looked the same. Our testing harness selected a feature like document creation and pushed creation to saturation. Claude then read telemetry using the Datadog MCP and came back with a short menu of options and a recommendation.

:::zh

每一轮迭代都差不多。我们的测试装置会挑一个功能，比如文档创建，把创建压到饱和。然后 Claude 用 Datadog MCP 读遥测，回来时带着一份很短的选项清单和一条建议。
:::

:::bi

If the recommendation was easy to undo, Claude wrote and deployed the change to staging and reran the test. We had telemetry on every operation the service ran. Every database query, for example, reported its name and how many rows it scanned versus how many it returned, so Claude could spot a bad query and rewrite it.

:::zh

如果这个建议容易撤销，Claude 就自己写好改动，部署到预发布环境，再重跑测试。服务的每一个操作都有遥测。比如每条数据库查询都会报告自己的名字，扫描了多少行，返回了多少行，这样 Claude 就能发现写得差的查询并重写它。
:::

:::figure
![一轮混沌循环的八个步骤，标记哪几步由 Claude 做，哪两步由人做](./images/chaos-loop-claude-docs/fig-01.png)

One iteration of the loop, with two decisions made by a person

:::zh
图 1：从左上角的空心圆开始顺时针看，顶上一行是测试装置加负载，Claude 读遥测，Claude 给选项，由你来选。底下一行往回走：Claude 写改动，Claude 在另一个会话里评审，你来批准，Claude 部署到预发布环境。整条环里蓝色是 Claude 做的步骤，橙色是你做的，人只出现两次。
:::
:::

:::bi

Before the loop started, I told Claude which decisions needed my approval; basically anything hard to undo, like changing the database schema or key layout, or changing how a doc is stored and materialized.

:::zh

循环开始之前，我告诉 Claude 哪些决定需要我批准，基本上就是任何难以撤销的事，比如改数据库的 schema 或键的布局，或者改文档的存储和物化方式。
:::

:::bi

When Claude ran into one of those, it stopped and asked me, usually with a recommendation that I ended up approving. Schema changes were the classic case where I wanted to be consulted: there are usually a few reasonable answers, and changing directions is often painful.

:::zh

Claude 遇到这类决定就会停下来问我，通常还带着一个建议，最后我基本都批了。schema 变更就是最典型的例子，这种时候我希望先被问到：通常有几个说得通的答案，而中途换方向往往很痛苦。
:::

:::bi

And during the whole testing process, Claude had to conform to two invariants:

:::zh

整个测试过程中，Claude 都得守住两条不变量：
:::

:::bi

1. Docs had to open almost instantly (even ones with a long history)
2. Once the server acknowledged an edit, tests had to show the edit was still there

:::zh

1. 文档必须几乎瞬间打开（哪怕历史很长）
2. 服务器一旦确认了一次编辑，测试就必须证明这次编辑还在
:::

## 让服务对 Claude 可解读（Making the service legible to Claude）

:::bi

My colleague Felix Rieseberg recently wrote [a tutorial on being more ambitious with models](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/). His main idea is to raise the "altitude" you prompt Claude at: ask for the *outcome* you want, not the individual task.

:::zh

我的同事 Felix Rieseberg 最近写了[一篇教程，讲怎么对模型更有野心](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/)。他的核心想法是，把你向 Claude 提要求的“高度”抬上去：要的是你想要的*结果*，而不是一件件具体的任务。
:::

:::bi

So instead of asking Claude to fix individual crashes, you ask it to make your app crash-free. (Our own apps aren't all the way there yet, but this is how we're making real progress.) To work at that altitude, though, you have to set up your code so Claude can pull crash reports on its own and run a harness that reproduces each crash and checks the fix.

:::zh

所以与其让 Claude 去修一个个崩溃，不如让它把你的应用做到不再崩溃。（我们自己的应用也还没完全做到，但我们确实是这样一步步往前走的。）不过要在那个高度上工作，你得把代码准备好，让 Claude 能自己拉崩溃报告，还能跑一套测试装置，复现每一个崩溃并验证修复。
:::

:::bi

For us, the outcome was a service that could handle launch. To get there, we did two things to make the service as legible to Claude as we could:

:::zh

对我们来说，要的结果是一个能扛住上线的服务。为了走到那一步，我们做了两件事，让服务尽可能地可解读：
:::

:::bi

- **A diagnostic loop.** Claude read the telemetry on every iteration and added whatever it thought was missing.
- **Legible technology choices.** We picked a runtime and dependencies so any number Claude measured traced back to code we wrote.

:::zh

- **一个诊断循环。** Claude 在每一轮迭代里都读遥测，缺什么就补什么。
- **可解读的技术选型。** 我们挑运行时和依赖，是为了让 Claude 量到的每一个数字都能追到我们写的代码上。
:::

### 诊断循环（A diagnostic loop）

:::bi

Every iteration, Claude read the telemetry and added whatever it thought was missing. Writing telemetry by hand is tedious, so in practice most telemetry would go in after something broke. Now Claude just writes it as it goes.

:::zh

每一轮迭代，Claude 都读一遍遥测，觉得缺什么就补什么。手写遥测很枯燥，所以实际上，大部分遥测都是等某个东西坏了之后才补进去的。现在 Claude 边跑边写。
:::

:::bi

Memory is the best example.

:::zh

内存是最好的例子。
:::

:::bi

Early in the harness run, one large doc was using about 3 GB on its pod (not a fun number to see). Claude’s first stab at fixing it was to shrink one of our caches so our server would evict docs sooner. The next harness run showed the memory was actually in a *separate* cache inside one of our dependencies, so Claude dropped the change.

:::zh

测试装置刚跑没多久，一份大文档在它的 Pod 上占着大约 3 GB（这数字可不好看）。Claude 第一次动手修，是缩小我们的一个缓存，好让服务器更早淘汰文档。下一轮跑下来发现，内存其实在某个依赖里一个*单独的*缓存中，于是 Claude 把这个改动撤掉了。
:::

:::bi

From there Claude kept narrowing it down with finer-grained memory profiling. Eventually it found that every keystroke was copying the doc into several different data structures, adding a few MB each time. Claude switched those structures to copy-on-write, so they now share one reference instead of each holding its own copy.

:::zh

之后 Claude 用越来越细的内存剖析继续收窄范围。最后它发现，每次按键都会把文档复制进好几个不同的数据结构，每次多出几 MB。Claude 把这些结构改成写时复制，于是它们现在共享同一份引用，而不是各自持有一份拷贝。
:::

:::bi

After about three days of iterating, that doc topped out around 180 MB, and our estimate of what we’d need for launch dropped from more than 500 memory-optimized pods to about 50.

:::zh

就这样迭代了大约三天，那份文档的内存封顶在 180 MB 左右，我们对上线所需资源的估计，也从 500 多个内存优化型 Pod 降到了大约 50 个。
:::

:::annotation
内存从 3 GB 降到 180 MB，容量估算跟着从 500 多个 Pod 掉到 50 个。这一段值钱的是过程：先猜缓存猜错，再靠细分的内存分析排除依赖，最后定位到每次敲键盘都在把文档复制进好几个数据结构。每一步都有遥测撑着，没有一步是蒙对的。
:::

:::figure
![诊断循环的六个步骤，Claude 边跑边补遥测](./images/chaos-loop-claude-docs/fig-02.png)

The diagnostic loop

:::zh
图 2：六个步骤里唯一的灰点是从服务报遥测到 Claude 读它这一段，意思是信号先回来，判断在下一格。右下角高亮的那一格是这张图的主张：缺什么遥测就补什么，不等坏了再补。左下角写着难撤销的改动先交给你。
:::
:::

### 可解读的技术选型（Legible technology choices）

:::bi

We were picky about the service’s runtime and dependencies. We wanted any number Claude measured to trace back to code we wrote.

:::zh

我们对服务的运行时和依赖很挑剔。我们希望 Claude 量到的每一个数字，都能追到我们写的代码上。
:::

:::bi

This is because our models hill climb best with a clean signal. We expected a garbage collector to add noise, because memory and latency shift on the collector’s schedule.

:::zh

这是因为我们的模型在信号干净的时候爬坡最快。我们预料到垃圾回收器会添噪声，因为内存和延迟会跟着回收器的节奏波动。
:::

:::bi

Two choices helped the most.

:::zh

有两个选择帮助最大。
:::

:::bi

1. **We wrote the service in Rust**. With no garbage collector, all of a doc’s memory sits in structures we defined, so when it grew, Claude could point to the one responsible, change it, and see whether memory came down on the next iteration. We have great Go tooling at Anthropic too, and we didn’t bake off the two languages, so this is our experience with Rust. What I did appreciate, coming from past work in Go, was how little I had to think about memory sticking around after my code was done with it.
2. **We also kept dependencies to a minimum**. Every library brings data structures we didn’t write and can’t easily account for. For the few we really needed, we vendored the code so we could read and measure it ourselves.

:::zh

1. **我们用 Rust 写了这个服务**。在没有垃圾回收器的情况下，一份文档的内存全都放在我们自己定义的结构里，所以内存涨上去的时候，Claude 能指到负责的那个结构，改掉它，再看下一轮内存是不是降下来了。Anthropic 也有很好的 Go 工具链，我们并没有把这两种语言放在一起做过对比测试，所以这只是我们对 Rust 的体验。我过去写 Go，这次真正欣赏的一点是，代码处理完某块内存之后，我几乎不用去想它还会不会一直占着。
2. **我们尽量精简依赖**。每个库都会带来一些数据结构，这些结构不是我们写的，也不容易交代清楚。真正需要的那几个库，我们把源码拷进了自己的代码库，这样就能自己读，自己测。
:::

:::annotation
选 Rust 在这里不是为了跑得快，是为了可解读：没有垃圾回收器，文档占的内存都在自己定义的结构里，Claude 才能把异常的数字指到具体一段代码上。作者也承认这不是把两种语言放在一起比过的结论，只是用 Rust 的经验。
:::

:::bi

Rust is hard for people to write, and a few years ago that would have weighed heavily on the choice. Claude writes it and most other languages fine, so that matters a lot less now.

:::zh

Rust 对人来说不好写，几年前这一点会严重影响这个选择。Claude 写 Rust 和大多数其他语言都没问题，所以现在这一点已经没那么重要了。
:::

:::figure
![技术选型对照：内存能追溯到自己的代码，和追溯不了的那种](./images/chaos-loop-claude-docs/fig-03.png)

Legible technology choices: memory our code can explain, and memory it can't

:::zh
图 3：上下两条泳道对照。上面绿线是我们选的写法：Rust 加少量依赖，内存都在自己写的结构里，Claude 能找到原因，改完也容易验证。下面虚线加红叉是刻意回避的写法：垃圾回收器加别人的库，内存账算不清，信号更嘈杂。注意下面这条泳道标着“a bet, not a test”，那是判断不是实验。
:::
:::

## 上线周（Launch week）

:::bi

The service held at launch scale. The first million docs showed up in about 30 hours, and we were past 4.6 million by September 22. We rolled prod 629 times in September and never once rolled back.

:::zh

服务在上线规模下扛住了。头一百万份文档大约 30 小时就出现了，到 9 月 22 日已经超过 460 万份。9 月里我们往生产环境发布了 629 次，一次都没有回滚。
:::

:::bi

Launch week felt weirdly familiar. Claude is great at imagining ways a service can fail and had planned for most of them well before launch. Seven of the ten scenarios we’d rehearsed on staging actually happened in prod. By then the harness had already put staging through most of it, and Claude had shipped the fixes behind runtime flags. When part of the infra ran into pressure, we usually just flipped a flag.

:::zh

上线那一周有种诡异的熟悉感。Claude 很擅长设想一个服务可能怎么坏，在上线之前很久就想好了大多数情况的应对。我们在预发布环境排练过的十个场景中，有七个真的在生产环境发生了。到那时候，测试装置已经让预发布环境把大部分情况都过了一遍，Claude 也把对应的修复放进了运行时开关后面。当基础设施的某一部分吃紧时，我们通常只要拨一下开关。
:::

## 为什么现在才成（Why this works now）

:::bi

A few months ago this probably wouldn’t have worked. Older models were fine at reading telemetry through an MCP server, but ten or twenty iterations into a long loop, they’d start forgetting what we were optimizing for, and I’d end up restating the goal. Other Anthropic employees have called this [goal drift](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/#why-dynamic-workflows).

:::zh

几个月前，这套大概还跑不通。旧一些的模型通过 MCP 服务器读遥测没问题，但长循环跑到十几二十轮之后，它们就开始忘记我们在优化什么，结果我只好一遍遍重申目标。Anthropic 别的同事把这种现象叫作[目标漂移](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/#why-dynamic-workflows)。
:::

:::bi

Our newer frontier models are built for long-running work. Claude held all of our invariants across many compactions, and I never had to repeat them.

:::zh

我们更新的前沿模型是为长跑式的工作打造的。Claude 经历了很多次上下文压缩，仍然守住了我们所有的不变量，我一次都不用重复。
:::

:::bi

We're not the only ones doing this, either. Vercel [made Turborepo up to 96% faster](https://vercel.com/blog/making-turborepo-ninety-six-percent-faster-with-agents-sandboxes-and-humans) with a supervised agent loop a lot like ours.

:::zh

做这件事的也不只我们。Vercel 用一套很像我们的 agent 循环，同样是有人监督的，[让 Turborepo 快了最多 96%](https://vercel.com/blog/making-turborepo-ninety-six-percent-faster-with-agents-sandboxes-and-humans)。
:::

## 花了多少钱（What it cost）

:::bi

At Claude Fable 5.2's API list price (as of November 2026), I used roughly \$125,000 of inference from the end of August to launch day. A couple of years ago, work on this scale I'd guess would have taken a team of engineers about six months.

:::zh

按 Claude Fable 5.2 的 API 目录价（截至 2026 年 11 月）来算，从 8 月底到上线那天，我用掉了大约 12.5 万美元的推理。放在两年前，同样规模的工作我猜要一个工程师团队干上大约六个月。
:::

:::annotation
12.5 万美元按 Claude Fable 5.2 的列表价估算，时间只从八月底算到上线日，大概两个多星期。作者自己说，这笔钱里有相当一部分是摸流程的学费，知道该怎么做之后能省一半。
:::

:::bi

Most of that went to reading telemetry, writing proposals, generating fixes, and reviewing code.

:::zh

这些钱大部分花在四件事上：读遥测，写方案，生成修复，审查代码。
:::

:::bi

A couple of things about the cost:

:::zh

关于这笔花费，还有两点想说明：
:::

:::bi

- **Our launch was particularly massive.** A good chunk of the money went into infrastructure that only makes sense at that scale, and that infrastructure took more inference to reason about. Claude had to think a lot harder about how a growing set of services fit together and all the ways they could fail.
- **I also burned a lot of tokens figuring out the process.** The loop ran nonstop while I was experimenting with the setup. Knowing what I know now, I think we could have spent about half as much.

:::zh

- **我们的上线规模格外大。** 相当一部分钱花在了只有那个规模才说得通的基础设施上，而要理解这些基础设施，本身就要更多推理。Claude 得费更多脑子去想，一套不断增多的服务怎么拼在一起，以及它们可能以哪些方式出问题。
- **我在摸索流程上也烧掉了大量 token。** 我在试各种配置的时候，循环是不停跑的。以我现在知道的这些，我觉得我们本可以只花大约一半。
:::

## 怎么自己试一遍（Trying this out）

:::bi

This works for much smaller services too, and it should cost a lot less.

:::zh

服务小得多也能这么干，花费也应该少得多。
:::

:::bi

To get a rough number, I priced out a classic small team stack: a couple of reasonably sized Kubernetes nodes and a Postgres instance. Then I went through the changes I landed between the end of August and launch day and removed the work that setup wouldn’t need:

:::zh

为了估个大概的数，我给一套典型的小团队技术栈算了价：两个规模适中的 Kubernetes 节点，加一个 Postgres 实例。然后我过了一遍 8 月底到上线那天落地的改动，去掉那套配置用不上的部分：
:::

:::bi

- Fitting in with our other internal services
- Client and product work that was intermixed with the scale work
- Running across many pods
- Fine-grained rate limiting

:::zh

- 和我们其他内部服务的对接
- 和扩容工作混在一起的客户端与产品工作
- 跨多个 Pod 运行
- 细粒度的限流
:::

:::bi

About a third of the changes were left.

:::zh

最后剩下的改动大约占三分之一。
:::

:::bi

Scaling our spend down to that third and taking out the mistakes I made while I was still figuring out the setup, I’d put a two week push like this one at \$3,000 to \$10,000 at the same list price (I haven’t actually run this, so it’s only a rough sense).

:::zh

把花费按三分之一折算，再扣掉我还在摸索配置时犯的错误，同样按目录价算，像这样两周的冲刺我估在 3000 到 1 万美元（我并没有真的跑过，所以这只是个大概的感觉）。
:::

:::bi

The steps below assume one engineer with Claude Code, a staging environment, and an observability provider. The coordinator and sub-agents helped speed up the process, but if you find they’re burning too many tokens per hour, going back to a single agent should also work quite well. If you want to try it:

:::zh

下面的步骤假设你有一位工程师，手里有 Claude Code，另外还有一个预发布环境和一家可观测性服务商。协调者和子 agent 能加快这个过程，但如果你发现它们每小时烧的 token 太多，退回单个 agent 其实也能跑得不错。想试的话：
:::

:::bi

1. Give Claude access to your telemetry. Most observability providers have an MCP server that Claude can use.
2. Have Claude write a load script that throws ten times your real traffic at the staging copy of the service and breaks things on purpose. Killing an instance, stalling the database, and deploying in the middle of a spike are good places to start. Then let Claude keep fixing whatever falls over.
3. When you’re picking your stack, lean toward whatever Claude can measure most easily. For us that was Rust and as few dependencies as possible.
4. Before you start, write down your most important technical invariants and give them to Claude.
5. For anything that’s hard to undo, have Claude stop and give you a few options with a clear recommendation.

:::zh

1. 让 Claude 能访问你的遥测。大多数可观测性服务商都有 Claude 能用的 MCP 服务器。
2. 让 Claude 写一个压测脚本，往预发布环境的服务副本上灌十倍于真实流量的请求，并且故意弄坏东西。杀掉一个实例，把数据库卡住，在流量尖峰时做部署，都是不错的起点。然后就让它一直修，哪里倒了修哪里。
3. 挑技术栈的时候，尽量偏向 Claude 最容易测量的东西。对我们来说就是 Rust，以及尽可能少的依赖。
4. 开始之前，把你最重要的技术不变量写下来，交给 Claude。
5. 遇到任何难以撤销的事，就让 Claude 停下来，给你几个选项，并附上明确的建议。
:::

:::bi

*Huge thanks to the Docs team, who landed thousands of editor fixes in the same three weeks, and to the platform and storage teams who built everything this sits on.*

:::zh

*非常感谢 Docs 团队，他们在同样的三周里落地了成千上万个编辑器修复。也感谢平台和存储团队，这一切所依托的东西都是他们建的。*
:::

:::bi

**Further reading.** [How we made claude.ai 3x faster in two weeks](https://claude.dev/blog/how-we-made-claude-ai-faster/) (claude.dev) · [A harness for every task: dynamic workflows in Claude Code](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/) (claude.dev), on goal drift.

:::zh

**延伸阅读。** [我们如何在两周内让 claude.ai 快 3 倍](https://claude.dev/blog/how-we-made-claude-ai-faster/)（claude.dev）· [给每个任务一套测试装置：Claude Code 里的动态工作流](https://claude.dev/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code/)（claude.dev），讲的是目标漂移。
:::
