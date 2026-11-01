---
title: '别再盲目搭建多智能体系统'
description: '上下文工程是 agent 可靠性的第一要务。Cognition 的 Walden Yan 用 Flappy Bird 的例子讲清两件事：子 agent 必须共享完整上下文，动作里藏着没写出来的决定。所以别急着上多智能体，先试试单线程 agent。'
pubDate: 2026-11-01
author: 'Walden Yan'
category: curation
tags: ['多智能体', '上下文工程', 'Agent', '方法论', 'Cognition团队·Walden Yan']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Cognition 官方博客 [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2025 年 6 月 12 日，作者是 Walden Yan。译文按原意译出，术语做了中文化，原文里的外链都保留着，五张示意图按原图重画成了中文。版权归原作者和 Cognition 所有，译文只作学习交流之用。文中带铅笔图标的注解是我加的补充说明，不属于原文。

## 上下文工程的原则（Principles of Context Engineering）

:::bi
We’ll work our way up to the following principles:

:::zh
我们要一步步走到下面这两条原则：
:::

:::bi
1. Share context
2. Actions carry implicit decisions

:::zh
1. 共享上下文
2. 动作里带着隐含的决定
:::

:::bi
**Why think about principles?**

:::zh
**为什么要想原则？**
:::

:::bi
HTML was introduced in 1993. In 2013, Facebook released React to the world. It is now 2025 and React (and its descendants) dominates the way developers build sites and apps. Why? Because React is not just a scaffold for writing code. It is a philosophy. By using React, you embrace building applications with a pattern of reactivity and modularity, which people now accept to be a standard requirement, but this was not always obvious to early web developers.

:::zh
HTML 诞生于 1993 年。2013 年，Facebook 把 React 放了出来。现在是 2025 年，React 和它的后代主导了开发者搭网站做应用的方式。为什么？因为 React 不只是写代码的脚手架，它是一套哲学。用了 React，你就接受了用响应式和模块化的模式来搭应用。这套东西今天被当成标配，但早期的网页开发者并不觉得它理所当然。
:::

:::bi
In the age of LLMs and building AI Agents, it feels like we’re still playing with raw HTML & CSS and figuring out how to fit these together to make a good experience. No single approach to building agents has become the standard yet, besides some of the absolute basics.

:::zh
在大语言模型和 AI agent 的时代，感觉我们还在摆弄原生的 HTML 和 CSS，琢磨怎么把它们拼起来做出好的体验。除了最基础的几条，构建 agent 至今没有哪一套做法成为标准。
:::

:::bi
> In some cases, libraries such as [https://github.com/openai/swarm](https://github.com/openai/swarm) by OpenAI and [https://github.com/microsoft/autogen](https://github.com/microsoft/autogen) by Microsoft actively push concepts which I believe to be the wrong way of building agents. Namely, using multi-agent architectures, and I’ll explain why.

:::zh
> 有些情况下，OpenAI 的 [swarm](https://github.com/openai/swarm) 和微软的 [AutoGen](https://github.com/microsoft/autogen) 这类库在主动推广一些我认为方向错了的构建方式，也就是多智能体架构。下面我解释为什么。
:::

:::bi
That said, if you’re new to agent-building, there are lots of resources on how to set up the basic scaffolding [[1](https://www.anthropic.com/engineering/building-effective-agents)] [[2](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)]. But when it comes to building serious production applications, it's a different story.

:::zh
话说回来，如果你是刚入门做 agent，讲怎么搭基础骨架的资料有很多 [[1](https://www.anthropic.com/engineering/building-effective-agents)] [[2](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)]。但真要做正经的生产应用，就是另一回事了。
:::

## 构建长时运行 agent 的理论（A Theory of Building Long-running Agents）

:::bi
Let’s start with reliability. When agents have to actually be reliable while running for long periods of time and maintain coherent conversations, there are certain things you must do to contain the potential for compounding errors. Otherwise, if you’re not careful, things fall apart quickly. At the core of reliability is Context Engineering.

:::zh
先谈可靠性。agent 要在长时间运行里真的可靠，还要维持连贯的对话，有些事就非做不可，好把错误层层叠加的风险压住。一不小心，东西很快就散架。可靠性的核心是上下文工程。
:::

:::bi
*Context Engineering*

:::zh
**上下文工程**
:::

:::bi
In 2025, the models out there are extremely intelligent. But even the smartest human won’t be able to do their job effectively without the context of what they’re being asked to do. “Prompt engineering” was coined as a term for the effort needing to write your task in the ideal format for a LLM chatbot. “Context engineering” is the next level of this. It is about doing this automatically in a dynamic system. It takes more nuance and is effectively the #1 job of engineers building AI agents.

:::zh
2025 年的模型已经非常聪明。但再聪明的人，没有任务背景也干不好活。“提示词工程”这个词，说的是想办法把任务写成大语言模型聊天机器人最吃的格式。“上下文工程”是它的下一层，要在一个动态系统里自动做这件事。它更讲究分寸，实际上就是构建 AI agent 的工程师的头号工作。
:::

:::annotation
提示词工程解决的是“这一次要把话说对”，可以离线反复打磨。上下文工程解决的是“模型此刻应该看到什么”，必须在运行时持续做决定，而且决定会随着对话和工具结果不断过期。前者更像写作，后者更像操作系统里的调度。
:::

:::bi
Take an example of a common type of agent. This agent

:::zh
看一种常见的 agent。它会
:::

:::bi
1. breaks its work down into multiple parts
2. starts subagents to work on those parts
3. combines those results in the end

:::zh
1. 把工作拆成几块
2. 起子 agent 分别处理这几块
3. 最后把结果合起来
:::

<figure>
<svg viewBox="0 0 780 560" width="100%" role="img" aria-label="并行子 agent 架构：任务交给主 agent 拆解，分叉成子任务 1 和子任务 2，两个子 agent 分头做，各自的返回结果交给主 agent 合并，最后得到结果" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="24" y="38" font-size="14" font-weight="600" style="fill:var(--fg)">几乎必然不可靠</text>
    <text x="390" y="82" text-anchor="middle" font-weight="600" style="fill:var(--fg)">任务</text>
    <path d="M390 94 L390 106 M390 114 L385.8 106.4 M390 114 L394.2 106.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="240" y="118" width="300" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="390" y="150" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="390" y="178" text-anchor="middle" style="fill:var(--accent-strong)">拆解任务</text>
    <path d="M390 202 L390 226 L200 226 L200 240 M200 248 L195.8 240.4 M200 248 L204.2 240.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M390 202 L390 226 L580 226 L580 240 M580 248 L575.8 240.4 M580 248 L584.2 240.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <text x="186" y="244" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">子任务 1</text>
    <text x="594" y="244" font-size="12" style="fill:var(--fg-muted)">子任务 2</text>
    <rect x="100" y="252" width="200" height="64" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="200" y="290" text-anchor="middle" font-weight="500" style="fill:var(--fg)">子 agent 1</text>
    <rect x="480" y="252" width="200" height="64" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="580" y="290" text-anchor="middle" font-weight="500" style="fill:var(--fg)">子 agent 2</text>
    <path d="M200 316 L200 350 L330 350 L330 362 M330 370 L325.8 362.4 M330 370 L334.2 362.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M580 316 L580 350 L450 350 L450 362 M450 370 L445.8 362.4 M450 370 L454.2 362.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <text x="216" y="340" font-size="12" style="fill:var(--fg-muted)">结果 1</text>
    <text x="564" y="340" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">结果 2</text>
    <rect x="240" y="374" width="300" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="390" y="406" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="390" y="434" text-anchor="middle" style="fill:var(--accent-strong)">合并结果</text>
    <path d="M390 458 L390 490 M390 498 L385.8 490.4 M390 498 L394.2 490.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <text x="390" y="528" text-anchor="middle" font-weight="600" style="fill:var(--fg)">结果</text>
  </g>
</svg>
<figcaption>并行子 agent 各自拆任务，结果只能靠主 agent 合并</figcaption>
</figure>

:::bi
This is a tempting architecture, especially if you work in a domain of tasks with several parallel components to it. However, it is very fragile. The key failure point is this:

:::zh
这个架构很诱人，尤其当你做的任务本身就有好几个可以并行的部分。但它非常脆弱，关键的问题出在这里。
:::

:::bi
> Suppose your **Task** is “build a Flappy Bird clone”. This gets divided into **Subtask 1** “build a moving game background with green pipes and hit boxes” and **Subtask 2** “build a bird that you can move up and down”.
>
> It turns out subagent 1 actually mistook your subtask and started building a background that looks like Super Mario Bros. Subagent 2 built you a bird, but it doesn’t look like a game asset and it moves nothing like the one in Flappy Bird. Now the final agent is left with the undesirable task of combining these two miscommunications.

:::zh
> 假设你的**任务**是“做一个 Flappy Bird 的克隆”。它被拆成**子任务 1**“做一个有绿色管道和判定框的动态游戏背景”和**子任务 2**“做一只能上下移动的鸟”。
>
> 结果子 agent 1 理解错了自己的子任务，动手做了一个看起来像《超级马里奥兄弟》的背景。子 agent 2 给了你一只鸟，但它不像游戏里的素材，动起来也完全不像 Flappy Bird 里的那只。现在最后的 agent 就得硬着头皮把这两处误解合到一起。
:::

:::bi
This may seem contrived, but most real-world tasks have many layers of nuance that all have the potential to be miscommunicated. You might think that a simple solution would be to just copy over the original task as context to the subagents as well. That way, they don’t misunderstand their subtask. But remember that in a real production system, the conversation is most likely multi-turn, the agent probably had to make some tool calls to decide how to break down the task, and any number of details could have consequences on the interpretation of the task.

:::zh
这听起来像编出来的例子，但现实里大多数任务都有很多层细节，每一层都可能传歪。你也许觉得，简单的办法是把原始任务也抄进子 agent 的上下文，这样它们就不会误解自己的子任务。但要记住，在真实的生产系统里，对话多半是多轮的，agent 可能要先做几次工具调用才能决定怎么拆任务，任何一处细节都可能影响对任务的理解。
:::

:::annotation
子 agent 笨吗？其实并不，问题在于它只拿到了被裁过的一句话：它不知道“Flappy Bird”意味着什么画风和手感，也不知道另一个子任务正在做什么。所以“把原始任务也抄一份”并不够，拆任务时的判断，被否掉的方案，工具的返回值，这些都是理解任务的一部分，不能省。
:::

:::bi
> *Principle 1*
> Share context, and share full agent traces, not just individual messages

:::zh
> **原则 1**
> 共享上下文，而且要共享完整的 agent 轨迹，不是只共享单条消息
:::

:::annotation
“完整轨迹”不只是聊了什么，还包括调了哪些工具，拿到了什么中间结果，放弃了哪些方案。这些内容恰恰最容易在转交时被省掉，因为它们看起来像过程而不像结论。但子 agent 做决定时依赖的正是这些过程。
:::

:::bi
Let’s take another revision at our agent, this time making sure each agent has the context of the previous agents.

:::zh
我们再改一版 agent，这次让每个 agent 都拿到之前所有 agent 的上下文。
:::

<figure>
<svg viewBox="0 0 780 570" width="100%" role="img" aria-label="同一个并行架构加上上下文档位：主 agent 只有此前的对话与动作，两个子 agent 各自只有自己那份子任务的工作，合并 agent 才同时拿到四块上下文，所以子 agent 之间互相看不到对方做了什么" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="24" y="38" font-size="14" font-weight="600" style="fill:var(--fg)">仍然不可靠</text>
    <text x="390" y="82" text-anchor="middle" font-weight="600" style="fill:var(--fg)">任务</text>
    <path d="M390 94 L390 106 M390 114 L385.8 106.4 M390 114 L394.2 106.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="240" y="118" width="300" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="390" y="150" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="390" y="178" text-anchor="middle" style="fill:var(--accent-strong)">拆解任务</text>
    <rect x="556" y="148" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="588" y="165" font-size="12" style="fill:var(--fg-muted)">此前的对话与动作</text>
    <path d="M390 202 L390 226 L200 226 L200 240 M200 248 L195.8 240.4 M200 248 L204.2 240.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M390 202 L390 226 L540 226 L540 240 M540 248 L535.8 240.4 M540 248 L544.2 240.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <text x="186" y="244" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">子任务 1</text>
    <text x="556" y="244" font-size="12" style="fill:var(--fg-muted)">子任务 2</text>
    <rect x="110" y="252" width="180" height="64" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="200" y="290" text-anchor="middle" font-weight="500" style="fill:var(--fg)">子 agent 1</text>
    <rect x="450" y="252" width="180" height="64" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="540" y="290" text-anchor="middle" font-weight="500" style="fill:var(--fg)">子 agent 2</text>
    <rect x="306" y="272" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <text x="340" y="290" font-size="12" style="fill:var(--fg-muted)">子任务 1 的工作</text>
    <rect x="642" y="272" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <text x="676" y="290" font-size="12" style="fill:var(--fg-muted)">子任务 2 的工作</text>
    <path d="M200 316 L200 350 L320 350 L320 362 M320 370 L315.8 362.4 M320 370 L324.2 362.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <path d="M540 316 L540 350 L460 350 L460 362 M460 370 L455.8 362.4 M460 370 L464.2 362.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round"/>
    <text x="216" y="340" font-size="12" style="fill:var(--fg-muted)">结果 1</text>
    <text x="524" y="340" text-anchor="end" font-size="12" style="fill:var(--fg-muted)">结果 2</text>
    <rect x="240" y="374" width="300" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="390" y="406" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="390" y="434" text-anchor="middle" style="fill:var(--accent-strong)">合并结果</text>
    <rect x="552" y="370" width="22" height="22" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="552" y="395" width="22" height="22" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="552" y="420" width="22" height="22" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="552" y="445" width="22" height="22" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 68%, var(--surface-2));stroke:color-mix(in oklab, var(--accent-strong) 80%, var(--fg));stroke-width:1.2"/>
    <text x="584" y="461" font-size="12" style="fill:var(--fg-muted)">合并工作</text>
    <path d="M390 458 L390 490 M390 498 L385.8 490.4 M390 498 L394.2 490.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <text x="390" y="528" text-anchor="middle" font-weight="600" style="fill:var(--fg)">结果</text>
  </g>
</svg>
<figcaption>子 agent 之间互相看不到对方的上下文，合并时才拼到一起</figcaption>
</figure>

:::bi
Unfortunately, we aren’t quite out of the woods. When you give your agent the same Flappy Bird cloning task, this time, you might end up with a bird and background with completely different visual styles. Subagent 1 and subagent 2 cannot not see what the other was doing and so their work ends up being inconsistent with each other.

:::zh
可惜还没完全走出去。同样一个 Flappy Bird 克隆任务，这次你拿到的鸟和背景可能是完全不搭的两种视觉风格。子 agent 1 看不到子 agent 2 在做什么，子 agent 2 也看不到子 agent 1 在做什么，两边做出来的东西就对不上。
:::

:::bi
The actions subagent 1 took and the actions subagent 2 took were based on conflicting assumptions not prescribed upfront.

:::zh
子 agent 1 和子 agent 2 各自的动作，都建立在一开始没讲清楚的假设上，而这两套假设互相冲突。
:::

:::bi
> *Principle 2*
> Actions carry implicit decisions, and conflicting decisions carry bad results

:::zh
> **原则 2**
> 动作里带着隐含的决定，互相冲突的决定会带来糟糕的结果
:::

:::annotation
这句话是什么意思呢？比如说选了哪个库，怎么命名，错误怎么处理，界面用哪种风格，这些明明都没有写进任务说明，却在子agent的动作里被定死了。两个子 agent 各自定了一套，等到合并时才发现冲突，这时候返工的成本绝对比一开始就共享上下文高得多。
:::

:::bi
I would argue that Principles 1 & 2 are so critical, and so rarely worth violating, that you should by default rule out any agent architectures that don’t abide by them. You might think this is constraining, but there is actually a wide space of different architectures you could still explore for your agent.

:::zh
我认为原则 1 和原则 2 重要到这个程度：违反它们很少值得，所以默认就该先把不合这两条的 agent 架构排除掉。你可能觉得这很受限，但其实还剩很大的空间，可以继续探索不同的架构。
:::

:::bi
The simplest way to follow the principles is to just use a single-threaded linear agent:

:::zh
最简单的做法是只用一个单线程的线性 agent。
:::

<figure>
<svg viewBox="0 0 780 630" width="100%" role="img" aria-label="线性 agent：任务进来后同一个 agent 依次拆解任务，做子任务 1，做子任务 2，合并结果，右侧的上下文随每一步往上叠，始终是一条连续的链" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="24" y="38" font-size="14" font-weight="600" style="fill:var(--fg)">简单且可靠</text>
    <text x="325" y="78" text-anchor="middle" font-weight="600" style="fill:var(--fg)">任务</text>
    <path d="M325 90 L325 102 M325 110 L320.8 102.4 M325 110 L329.2 102.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="114" width="260" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="325" y="146" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="325" y="174" text-anchor="middle" style="fill:var(--accent-strong)">拆解任务</text>
    <rect x="471" y="144" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="505" y="162" font-size="12" style="fill:var(--fg-muted)">此前的对话与动作</text>
    <path d="M325 198 L325 216 M325 224 L320.8 216.4 M325 224 L329.2 216.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="226" width="260" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="325" y="258" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="325" y="286" text-anchor="middle" style="fill:var(--fg)">做子任务 1</text>
    <rect x="471" y="242" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="270" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <text x="505" y="288" font-size="12" style="fill:var(--fg-muted)">子任务 1 的工作</text>
    <path d="M325 310 L325 328 M325 336 L320.8 328.4 M325 336 L329.2 328.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="338" width="260" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="325" y="370" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="325" y="398" text-anchor="middle" style="fill:var(--fg)">做子任务 2</text>
    <rect x="471" y="340" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="368" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="471" y="396" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="505" y="414" font-size="12" style="fill:var(--fg-muted)">子任务 2 的工作</text>
    <path d="M325 422 L325 440 M325 448 L320.8 440.4 M325 448 L329.2 440.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="450" width="260" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="325" y="482" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="325" y="510" text-anchor="middle" style="fill:var(--accent-strong)">合并结果</text>
    <rect x="471" y="438" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="466" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="471" y="494" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="522" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 68%, var(--surface-2));stroke:color-mix(in oklab, var(--accent-strong) 80%, var(--fg));stroke-width:1.2"/>
    <text x="505" y="540" font-size="12" style="fill:var(--fg-muted)">合并工作</text>
    <path d="M325 534 L325 566 M325 574 L320.8 566.4 M325 574 L329.2 566.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <text x="325" y="602" text-anchor="middle" font-weight="600" style="fill:var(--fg)">结果</text>
  </g>
</svg>
<figcaption>一条连续的上下文链，每一步都在同一段历史里接着做</figcaption>
</figure>

:::bi
Here, the context is continuous. However, you might run into issues for very large tasks with so many subparts that context windows start to overflow.

:::zh
这样上下文是连续的。但任务很大，拆出来的子部分多到上下文窗口开始溢出时，就会出问题。
:::

<figure>
<svg viewBox="0 0 780 630" width="100%" role="img" aria-label="线性 agent 做长任务时上下文一路增长：拆解任务，做子任务 1，做子任务 2，做到子任务 3 时右侧叠起来的上下文已经溢出，用红色虚线框标出上下文溢出，下面用省略号表示还能继续往下做" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="24" y="38" font-size="14" font-weight="600" style="fill:var(--fg)">但长任务会吃力</text>
    <text x="325" y="74" text-anchor="middle" font-weight="600" style="fill:var(--fg)">任务</text>
    <path d="M325 86 L325 98 M325 106 L320.8 98.4 M325 106 L329.2 98.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="110" width="260" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="325" y="142" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="325" y="170" text-anchor="middle" style="fill:var(--accent-strong)">拆解任务</text>
    <rect x="471" y="140" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="505" y="158" font-size="12" style="fill:var(--fg-muted)">此前的对话与动作</text>
    <path d="M325 194 L325 212 M325 220 L320.8 212.4 M325 220 L329.2 212.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="222" width="260" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="325" y="254" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="325" y="282" text-anchor="middle" style="fill:var(--fg)">做子任务 1</text>
    <rect x="471" y="238" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="266" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <text x="505" y="284" font-size="12" style="fill:var(--fg-muted)">子任务 1 的工作</text>
    <path d="M325 306 L325 324 M325 332 L320.8 324.4 M325 332 L329.2 324.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="334" width="260" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="325" y="366" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="325" y="394" text-anchor="middle" style="fill:var(--fg)">做子任务 2</text>
    <rect x="471" y="336" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="364" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="471" y="392" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="505" y="410" font-size="12" style="fill:var(--fg-muted)">子任务 2 的工作</text>
    <path d="M325 418 L325 436 M325 444 L320.8 436.4 M325 444 L329.2 436.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="195" y="446" width="260" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.6"/>
    <text x="325" y="478" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="325" y="506" text-anchor="middle" style="fill:var(--fg)">做子任务 3</text>
    <rect x="462" y="426" width="42" height="124" rx="8" style="fill:none;stroke:var(--danger);stroke-width:1.3;stroke-dasharray:5 4"/>
    <rect x="471" y="434" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="462" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="471" y="490" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="471" y="518" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 68%, var(--surface-2));stroke:color-mix(in oklab, var(--accent-strong) 80%, var(--fg));stroke-width:1.2"/>
    <text x="512" y="536" font-size="12" style="fill:var(--fg-muted)">子任务 3 的工作</text>
    <text x="463" y="574" font-size="12.5" font-weight="600" style="fill:var(--danger)">上下文溢出</text>
    <circle cx="325" cy="552" r="2.4" style="fill:var(--fg-subtle)"/>
    <circle cx="325" cy="574" r="2.4" style="fill:var(--fg-subtle)"/>
    <circle cx="325" cy="596" r="2.4" style="fill:var(--fg-subtle)"/>
  </g>
</svg>
<figcaption>上下文一路涨下去，长任务到第三第四步就装不下了</figcaption>
</figure>

:::annotation
上下文溢出不是模型突然变笨，而是关键信息被挤出了窗口。前面的对话还在，但模型已经看不到，于是开始重复问，忘掉约定，改坏刚定好的东西。所以溢出往往表现为“怎么突然不靠谱了”，而不是报错。
:::

:::bi
To be honest, the simple architecture will get you very far, but for those who have truly long-duration tasks, and are willing to put in the effort, you can do even better. There are several ways you could solve this, but today I will present just one:

:::zh
说实话，简单的架构已经能走很远。但对那些任务真的跑得很久，又愿意下功夫的人来说，还能做得更好。解法有好几种，今天我只讲一种。
:::

<figure>
<svg viewBox="0 0 780 650" width="100%" role="img" aria-label="线性 agent 加上上下文压缩：每一步的关键时刻与决策用橙色虚线送进上下文压缩 LLM，历史被压成关键细节再接着往下做，长任务也能可靠但很难做对" style="max-width:780px;height:auto;margin:0 auto">
  <g font-size="13" fill="currentColor" style="font-family:var(--font-sans)">
    <text x="24" y="38" font-size="14" font-weight="600" style="fill:var(--fg)">长任务也能可靠（但很难做对）</text>
    <text x="170" y="78" text-anchor="middle" font-weight="600" style="fill:var(--fg)">任务</text>
    <path d="M170 90 L170 102 M170 110 L165.8 102.4 M170 110 L174.2 102.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="70" y="114" width="200" height="84" rx="10" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.5"/>
    <text x="170" y="146" text-anchor="middle" font-weight="600" style="fill:var(--accent-strong)">Agent</text>
    <text x="170" y="174" text-anchor="middle" style="fill:var(--accent-strong)">拆解任务</text>
    <rect x="282" y="144" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="340" y="162" font-size="12" style="fill:var(--fg-muted)">此前的对话与动作</text>
    <path d="M170 198 L170 216 M170 224 L165.8 216.4 M170 224 L174.2 216.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="70" y="226" width="200" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="170" y="258" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="170" y="286" text-anchor="middle" style="fill:var(--fg)">做子任务 1</text>
    <rect x="282" y="242" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="282" y="270" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <text x="340" y="288" font-size="12" style="fill:var(--fg-muted)">子任务 1 的工作</text>
    <path d="M170 310 L170 328 M170 336 L165.8 328.4 M170 336 L174.2 328.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="70" y="338" width="200" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="170" y="370" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="170" y="398" text-anchor="middle" style="fill:var(--fg)">做子任务 2</text>
    <rect x="282" y="340" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="282" y="368" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="282" y="396" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <text x="340" y="414" font-size="12" style="fill:var(--fg-muted)">子任务 2 的工作</text>
    <path d="M170 422 L170 440 M170 448 L165.8 440.4 M170 448 L174.2 440.4" style="fill:none;stroke:var(--line-strong);stroke-width:1.4;stroke-linecap:round"/>
    <rect x="70" y="450" width="200" height="84" rx="10" style="fill:var(--surface-2);stroke:var(--accent);stroke-width:1.4"/>
    <text x="170" y="482" text-anchor="middle" font-weight="600" style="fill:var(--fg)">Agent</text>
    <text x="170" y="510" text-anchor="middle" style="fill:var(--fg)">做子任务 3</text>
    <rect x="282" y="434" width="24" height="24" rx="8" style="fill:var(--accent-soft);stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="282" y="462" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent) 22%, var(--surface-2));stroke:var(--accent);stroke-width:1.2"/>
    <rect x="282" y="490" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 42%, var(--surface-2));stroke:var(--accent-strong);stroke-width:1.2"/>
    <rect x="282" y="518" width="24" height="24" rx="8" style="fill:color-mix(in oklab, var(--accent-strong) 68%, var(--surface-2));stroke:color-mix(in oklab, var(--accent-strong) 80%, var(--fg));stroke-width:1.2"/>
    <text x="340" y="536" font-size="12" style="fill:var(--fg-muted)">子任务 3 的工作</text>
    <text x="340" y="218" font-size="12" font-weight="600" style="fill:var(--warning)">关键时刻与决策</text>
    <text x="340" y="346" font-size="12" font-weight="600" style="fill:var(--warning)">关键时刻与决策</text>
    <text x="340" y="474" font-size="12" font-weight="600" style="fill:var(--warning)">关键时刻与决策</text>
    <path d="M432 214 C472 214 506 288 546 288 M554 288 L546.4 284.4 M554 288 L546.4 291.6" style="fill:none;stroke:var(--warning);stroke-width:1.3;stroke-dasharray:5 4;stroke-linecap:round"/>
    <path d="M432 342 C472 342 506 316 546 316 M554 316 L546.4 312.4 M554 316 L546.4 319.6" style="fill:none;stroke:var(--warning);stroke-width:1.3;stroke-dasharray:5 4;stroke-linecap:round"/>
    <path d="M432 470 C472 470 506 344 546 344 M554 344 L546.4 340.4 M554 344 L546.4 347.6" style="fill:none;stroke:var(--warning);stroke-width:1.3;stroke-dasharray:5 4;stroke-linecap:round"/>
    <rect x="560" y="264" width="190" height="96" rx="10" style="fill:color-mix(in oklab, var(--warning) 10%, transparent);stroke:var(--warning);stroke-width:1.3"/>
    <text x="655" y="318" text-anchor="middle" font-weight="600" style="fill:var(--fg)">上下文压缩 LLM</text>
    <circle cx="170" cy="556" r="2.4" style="fill:var(--fg-subtle)"/>
    <circle cx="170" cy="578" r="2.4" style="fill:var(--fg-subtle)"/>
    <circle cx="170" cy="600" r="2.4" style="fill:var(--fg-subtle)"/>
  </g>
</svg>
<figcaption>把历史压成关键细节再接着做，长任务才可能稳住</figcaption>
</figure>

:::bi
In this world, we introduce a new LLM model whose key purpose is to compress a history of actions & conversation into key details, events, and decisions. This is *hard to get right.* It takes investment into figuring out what ends up being the key information and creating a system that is good at this. Depending on the domain, you might even consider fine-tuning a smaller model (this is in fact something we’ve done at Cognition).

:::zh
这个方案里，我们引入一个新的模型，它的主要用途是把一段动作和对话的历史压缩成关键的细节，包括重要的事件和决定。这件事*很难做对*。你得投入精力搞清楚什么才算关键信息，再搭一套擅长做这件事的系统。看领域不同，甚至可以微调一个小模型，这其实正是我们在 Cognition 做过的事。
:::

:::bi
The benefit you get is an agent that is effective at longer contexts. You will still eventually hit a limit though. For the avid reader, I encourage you to think of better ways to manage arbitrarily long contexts. It ends up being quite a deep rabbit hole!

:::zh
换来的好处是 agent 在更长的上下文里也能干活。当然，迟早还是会碰到上限。爱琢磨的读者，我鼓励你去想怎么管任意长的上下文，这坑深得很。
:::

:::annotation
压缩模型做的事是把“让模型自己忘掉什么”变成“我们主动决定忘掉什么”。然而判断什么算关键时刻没有通用答案，只能靠对领域的理解慢慢调。写得好的话是续命，写差了就是把不该丢的上下文丢了。
:::

## 应用这些原则（Applying the Principles）

:::bi
If you’re an agent-builder, ensure your agent’s every action is informed by the context of all relevant decisions made by other parts of the system. Ideally, every action would just see everything else. Unfortunately, this is not always possible due to limited context windows and practical tradeoffs, and you may need to decide what level of complexity you are willing to take on for the level of reliability you aim for.

:::zh
如果你在构建 agent，就要保证它的每一个动作，都能拿到系统其他部分做出的相关决定的上下文。理想情况下，每个动作都能看到其他所有东西。可惜上下文窗口有限，现实中也有取舍，这并不总能做到。你想要多高的可靠性，就得自己决定愿意承担多高的复杂度。
:::

:::bi
As you think about architecting your agents to avoid conflicting decision-making, here are some real-world examples to ponder:

:::zh
在设计 agent 架构的时候，要想避开互相冲突的决策，有几个真实例子值得想一想。
:::

:::bi
**Claude Code Subagents**

:::zh
**Claude Code 的子 agent**
:::

:::bi
As of June 2025, Claude Code is an example of an agent that spawns subtasks. However, it never does work in parallel with the subtask agent, and the subtask agent is usually only tasked with answering a question, not writing any code. Why? The subtask agent lacks context from the main agent that would otherwise be needed to do anything beyond answering a well-defined question. And if they were to run multiple parallel subagents, they might give conflicting responses, resulting in the reliability issues we saw with our earlier examples of agents. The benefit of having a subagent in this case is that all the subagent’s investigative work does not need to remain in the history of the main agent, allowing for longer traces before running out of context. The designers of Claude Code took a purposefully simple approach.

:::zh
截至 2025 年 6 月，Claude Code 就是会起子任务的 agent 的一个例子。但它从不和子任务的 agent 并行干活，子任务的 agent 通常只负责回答一个问题，不写任何代码。为什么？因为它缺少主 agent 那边的上下文，除了回答一个边界清楚的问题，别的都干不了。如果同时跑多个并行的子 agent，它们可能给出互相冲突的回答，落到我们前面那些例子里说的可靠性问题上。这种情况下用子 agent 的好处，是它所有调查性的工作都不必留在主 agent 的历史里，于是上下文耗光之前能留出更长的轨迹。Claude Code 的设计者有意选了一条简单的路。
:::

:::bi
**Edit Apply Models**

:::zh
**编辑应用模型（Edit Apply Models）**
:::

:::bi
In 2024, many models were really bad at editing code. A common practice among coding agents, IDEs, app builders, etc. (including Devin) was to use an “edit apply model.” The key idea was that it was actually more reliable to get a small model to rewrite your entire file, given a markdown explanation of the changes you wanted, than to get a large model to output a properly formatted diff. So, builders had the large models output markdown explanations of code edits and then fed these markdown explanations to small models to actually rewrite the files. However, these systems would still be very faulty. Often times, for example, the small model would misinterpret the instructions of the large model and make an incorrect edit due to the most slight ambiguities in the instructions. Today, the edit decision-making and applying are more often done by a single model in one action.

:::zh
2024 年，很多模型改代码的能力还很差。编码 agent，IDE 和应用生成器这类工具（包括 Devin）普遍采用的一个做法，是配一个“编辑应用模型”。核心想法是，把你要的改动写成 markdown 说明，让一个小模型照着把整个文件重写一遍，比让一个大模型输出格式正确的 diff 更可靠。于是构建者让大模型输出改代码的 markdown 说明，再把这些说明喂给小模型，让它真的去重写文件。但这种系统仍然毛病很多。比如小模型经常误解大模型的指令，说明里只要有一丁点含糊，就会改错。今天，决定怎么改和真正动手改，更多是由同一个模型在一次动作里完成。
:::

:::bi
**Multi-Agents**

:::zh
**多智能体**
:::

:::bi
If we really want to get parallelism out of our system, you might think to let the decision makers “talk” to each other and work things out.

:::zh
如果真想在系统里拿到并行度，你可能会想让做决定的几方“聊一聊”，把事情商量清楚。
:::

:::bi
This is what us humans do when we disagree (in an ideal world). If Engineer A’s code causes a merge conflict with Engineer B, the correct protocol is to talk out the differences and reach a consensus. However, agents today are not quite able to engage in this style of long-context proactive discourse with much more reliability than you would get with a single agent. Humans are quite efficient at communicating our most important knowledge to one another, but this efficiency takes nontrivial intelligence.

:::zh
理想世界里，人类意见不一致时就是这么干的。工程师 A 的代码和工程师 B 的撞了合并冲突，正确的做法是把差异谈开，达成一致。但今天的 agent 还做不到这种长上下文里的主动沟通，而且比单 agent 可靠不了多少。人类把最重要的知识传给彼此，效率很高，但这种效率背后是相当不简单的智能。
:::

:::bi
Since not long after the launch of ChatGPT, people have been exploring the idea of multiple agents interacting with one another to achieve goals [[3](https://arxiv.org/abs/2304.03442)][[4](https://github.com/FoundationAgents/MetaGPT)]. While I’m optimistic about the long-term possibilities of agents collaborating with one another, it is evident that in 2025, running multiple agents in collaboration only results in fragile systems. The decision-making ends up being too dispersed and context isn’t able to be shared thoroughly enough between the agents. At the moment, I don’t see anyone putting a dedicated effort to solving this difficult cross-agent context-passing problem. I personally think it will come for free as we make our single-threaded agents even better at communicating with humans. When this day comes, it will unlock much greater amounts of parallelism and efficiency.

:::zh
ChatGPT 发布后不久，人们就在探索让多个 agent 互相交互来达成目标 [[3](https://arxiv.org/abs/2304.03442)][[4](https://github.com/FoundationAgents/MetaGPT)]。我对 agent 之间长期协作的可能性是乐观的，但 2025 年的现实很清楚：多个 agent 一起跑，只会得到脆弱的系统。决策太分散，上下文也没法在几个 agent 之间充分共享。眼下我没看到有谁在专门解决跨 agent 传上下文这个难题。我个人认为，等我们把这些单线程 agent 跟人沟通的能力做得更好，这个问题会顺带解决。到那天，并行度和效率会一下打开很多。
:::

:::bi
**Toward a More General Theory**

:::zh
**走向更一般的理论**
:::

:::bi
These observations on context engineering are just the start to what we might someday consider the standard principles of building agents. And there are many more challenges and techniques not discussed here. At Cognition, agent building is a key frontier we think about. We build our internal tools and frameworks around these principles we repeatedly find ourselves relearning as a way to enforce these ideas. But our theories are likely not perfect, and we expect things to change as the field advances, so some flexibility and humility is required as well.

:::zh
这些关于上下文工程的观察，只是我们将来也许算作构建 agent 标准原则的一个开头。还有不少挑战和技巧没在这篇里讨论。在 Cognition，构建 agent 是我们在意的关键前沿。我们围绕这些一再重新学到的原则，搭自己的内部工具和框架，用它们把想法落到实处。但我们的理论大概不完美，随着领域往前走，我们预期它会变，所以还得留点灵活和虚心。
:::

:::bi
We welcome you to try our work at [app.devin.ai](http://app.devin.ai). And if you would enjoy discovering some of these agent-building principles with us, reach out to [walden@cognition.ai](mailto:walden@cognition.ai)

:::zh
欢迎你来试试我们的产品 [app.devin.ai](http://app.devin.ai)。如果你想和我们一起发现更多构建 agent 的原则，写信给 [walden@cognition.ai](mailto:walden@cognition.ai)。
:::
