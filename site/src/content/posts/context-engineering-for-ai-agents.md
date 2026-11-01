---
title: 'AI agent 的高效上下文工程'
description: '上下文窗口是有限资源，agent 也要算注意力预算。Anthropic 应用 AI 团队讲了怎么给 agent 管上下文：系统提示和工具要刚刚好，能即时检索就别提前塞满，长任务靠压缩和结构化笔记顶住，或者拆给子 agent。'
pubDate: 2026-11-01
author: 'Prithvi Rajasekaran，Ethan Dixon，Carly Ryan，Jeremy Hadfield'
category: curation
tags: ['上下文工程', 'Agent', '方法论', 'Anthropic团队·Prithvi Rajasekaran 等']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 研究博客 [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) 的中英对照版。原文发布于 2025 年 9 月 29 日，作者是 Anthropic 应用 AI 团队的 Prithvi Rajasekaran，Ethan Dixon，Carly Ryan 和 Jeremy Hadfield。页面顶部的开关可以在中文译文和英文原文之间切换，逐段对照，插图，代码和链接都留在原位。版权归原作者和 Anthropic 所有，译文只作学习交流之用。中文译文里带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

:::bi
After a few years of prompt engineering being the focus of attention in applied AI, a new term has come to prominence: **context engineering**. Building with language models is becoming less about finding the right words and phrases for your prompts, and more about answering the broader question of “what configuration of context is most likely to generate our model’s desired behavior?”

:::zh
提示词工程作为应用 AI 的关注焦点已经有好几年了，现在有一个新词走到了台前：**上下文工程**。用语言模型做东西，重点正从为提示词找到对的词句，转向回答一个更宽的问题：“什么样的上下文配置最有可能让模型产出我们想要的行为？”
:::

:::bi
**Context** refers to the set of tokens included when sampling from a large-language model (LLM). The **engineering** problem at hand is optimizing the utility of those tokens against the inherent constraints of LLMs in order to consistently achieve a desired outcome. Effectively wrangling LLMs often requires *thinking in context* — in other words: considering the holistic state available to the LLM at any given time and what potential behaviors that state might yield.

:::zh
**上下文**指的是从大语言模型（LLM）采样时一并送进去的那组 token。这里的**工程**问题，是在 LLM 固有的约束之下优化这些 token 的效用，从而稳定拿到想要的结果。想把 LLM 用好，常常需要*在上下文里思考*，换句话说，要通盘考虑 LLM 在某个时刻能看到的整体状态，以及这个状态可能引出哪些行为。
:::

:::bi
In this post, we’ll explore the emerging art of context engineering and offer a refined mental model for building steerable, effective agents.

:::zh
这篇文章里，我们会聊聊正在成形的上下文工程这门手艺，并给出一个更精细的心智模型，用来构建可控且有效的 agent。
:::

## 上下文工程与提示词工程（Context engineering vs. prompt engineering）

:::bi
At Anthropic, we view context engineering as the natural progression of prompt engineering. Prompt engineering refers to methods for writing and organizing LLM instructions for optimal outcomes (see [our docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) for an overview and useful prompt engineering strategies). **Context engineering** refers to the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference, including all the other information that may land there outside of the prompts.

:::zh
在 Anthropic，我们把上下文工程看作提示词工程的自然延伸。提示词工程指的是编写和组织 LLM 指令以取得最优结果的一整套方法（概览和实用的提示词策略见[我们的文档](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)）。**上下文工程**指的是在 LLM 推理过程中策展并维护一组合适 token（信息）的策略，其中也包括提示词之外可能落进上下文的所有其他信息。
:::

:::bi
In the early days of engineering with LLMs, prompting was the biggest component of AI engineering work, as the majority of use cases outside of everyday chat interactions required prompts optimized for one-shot classification or text generation tasks. As the term implies, the primary focus of prompt engineering is how to write effective prompts, particularly system prompts. However, as we move towards engineering more capable agents that operate over multiple turns of inference and longer time horizons, we need strategies for managing the entire context state (system instructions, tools, [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) (MCP), external data, message history, etc).

:::zh
在用 LLM 做工程的早期，提示词是 AI 工程工作里最大的一块，因为日常聊天之外的大多数场景，都需要为一次性分类或文本生成任务优化过的提示词。顾名思义，提示词工程的主要关注点是怎么写出有效的提示词，尤其是系统提示。但随着我们开始构建能力更强且能在多轮推理和更长时间跨度上运转的 agent，就需要管理整个上下文状态的策略了（系统指令，工具，[Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)（MCP），外部数据，消息历史，等等）。
:::

:::bi
An agent running in a loop generates more and more data that *could* be relevant for the next turn of inference, and this information must be cyclically refined. Context engineering is the [art and science](https://x.com/karpathy/status/1937902205765607626?lang=en) of curating what will go into the limited context window from that constantly evolving universe of possible information.

:::zh
跑在循环里的 agent 会不断产出新数据，其中有些*可能*对下一轮推理有用，这些信息必须被循环地精炼。上下文工程是一门[艺术和科学](https://x.com/karpathy/status/1937902205765607626?lang=en)，它要做的，是从那个不断膨胀又充满各种可能信息的宇宙里，挑出哪些内容会进入有限的上下文窗口。
:::

:::figure
![提示词工程与上下文工程的对比](./images/context-engineering-for-ai-agents/prompting-vs-context.png)
Prompt engineering vs. context engineering

:::zh
提示词工程与上下文工程的对比
:::

:::bi
In contrast to the discrete task of writing a prompt, context engineering is iterative and the curation phase happens each time we decide what to pass to the model.

:::zh
和写一条提示词这种离散的任务不同，上下文工程是迭代的，每次我们决定往模型里送什么，策展这一步都会发生。
:::

## 上下文工程为什么对强力 agent 重要（Why context engineering is important to building capable agents）

:::bi
Despite their speed and ability to manage larger and larger volumes of data, we’ve observed that LLMs, like humans, lose focus or experience confusion at a certain point. Studies on needle-in-a-haystack style benchmarking have uncovered the concept of [context rot](https://research.trychroma.com/context-rot): as the number of tokens in the context window increases, the model’s ability to accurately recall information from that context decreases.

:::zh
尽管 LLM 速度很快，也能处理越来越大的数据量，但我们观察到，它们和人类一样，会在某个点上失去焦点，或者陷入混乱。针对 needle-in-a-haystack 式评测的研究揭示了[上下文腐化](https://research.trychroma.com/context-rot)（context rot）这个概念：上下文窗口里的 token 数增加时，模型准确回忆其中信息的能力反而下降。
:::

:::bi
While some models exhibit more gentle degradation than others, this characteristic emerges across all models. Context, therefore, must be treated as a finite resource with diminishing marginal returns. Like humans, who have [limited working memory capacity](https://journals.sagepub.com/doi/abs/10.1177/0963721409359277), LLMs have an “attention budget” that they draw on when parsing large volumes of context. Every new token introduced depletes this budget by some amount, increasing the need to carefully curate the tokens available to the LLM.

:::zh
有些模型的退化更平缓，但这个特征在所有模型上都会出现。所以上下文必须被当作一种有限资源，边际收益递减。人类有[有限的工作记忆容量](https://journals.sagepub.com/doi/abs/10.1177/0963721409359277)，LLM 也一样，它们在解析大量上下文时要消耗一份“注意力预算”。每多引入一个 token，这份预算就被消耗掉一些，也就越需要仔细策展交给 LLM 的 token。
:::

:::bi
This attention scarcity stems from architectural constraints of LLMs. LLMs are based on the [transformer architecture](https://arxiv.org/abs/1706.03762), which enables every token to [attend to every other token](https://huggingface.co/blog/Esmail-AGumaan/attention-is-all-you-need) across the entire context. This results in n² pairwise relationships for n tokens.

:::zh
这种注意力稀缺源于 LLM 的架构约束。LLM 基于 [transformer 架构](https://arxiv.org/abs/1706.03762)，每个 token 都能[注意到上下文里的其他所有 token](https://huggingface.co/blog/Esmail-AGumaan/attention-is-all-you-need)。对 n 个 token 来说，这带来了 n² 组两两关系。
:::

:::bi
As its context length increases, a model's ability to capture these pairwise relationships gets stretched thin, creating a natural tension between context size and attention focus. Additionally, models develop their attention patterns from training data distributions where shorter sequences are typically more common than longer ones. This means models have less experience with, and fewer specialized parameters for, context-wide dependencies.

:::zh
上下文变长时，模型捕捉这些两两关系的能力会被摊薄，上下文规模和注意力聚焦之间因此产生了天然的张力。另外，模型的注意力模式是从训练数据分布里学来的，而训练数据里短序列通常比长序列更常见。这意味着模型对跨上下文的依赖关系经验更少，专门为此准备的参数也更少。
:::

:::annotation
让我们来复习一下Transformer吧。一个 Token 在理解自己时，需要根据其他 Token 提供的信息，决定哪些信息值得关注。

Transformer 使用三个向量来完成这个过程：
- Query（Q）：我现在想寻找什么信息？
- Key（K）：我能提供什么信息？
- Value（V）：如果你关注我，我实际提供什么内容？

假设有一个 Token，它的 Query 和其他 Token 的 Key 进行相似度计算。
$$
Attention(Q,K,V)=
softmax\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

这个公式可以拆成三个步骤：
1. \(QK^T\)：计算每个 Token 对其他 Token 的关注程度
2. \(softmax\)：将关注程度转换为权重
3. 权重乘以 \(V\)：根据权重汇总其他 Token 提供的信息

在这里，每个 Token 都需要计算自己与其他 Token 的注意力关系，于是便形成了所谓的二次复杂度（由于因果掩码的原因，这里我们采用的其实就是等差数列求和）。

注意，这里说的是注意力矩阵的规模。更完整地说，对于隐藏维度为 \(d\) 的标准全注意力层：
- 注意力分数计算的时间复杂度约为 $$O(n^2d)$$
- 注意力矩阵的存储空间复杂度约为 $$O(n^2)$$
:::


:::bi
Techniques like [position encoding interpolation](https://arxiv.org/pdf/2306.15595) allow models to handle longer sequences by adapting them to the originally trained smaller context, though with some degradation in token position understanding. These factors create a performance gradient rather than a hard cliff: models remain highly capable at longer contexts but may show reduced precision for information retrieval and long-range reasoning compared to their performance on shorter contexts.

:::zh
像[位置编码插值](https://arxiv.org/pdf/2306.15595)这样的技术，可以让模型把更长的序列适配到原本训练时更小的上下文上，从而处理更长的输入，代价是 token 位置理解上的一些退化。这些因素叠加起来，形成的是一条性能渐变，而不是一道断崖：模型在长上下文上依然很有能力，但相比短上下文，信息检索和长程推理的精度可能会下降。
:::

:::annotation
位置编码插值（Position Interpolation） 是一种扩展大语言模型上下文长度的技术。模型在训练时通常只接触过一定范围内的 Token 位置，例如 4096 个 Token。如果直接将上下文扩展到 32768 个 Token，模型就需要处理大量训练时不熟悉的位置，可能导致位置感知能力下降。位置编码插值的思路是：将更长序列中的 Token 位置按比例压缩，映射回模型原本熟悉的位置范围。例如，将 32768 个 Token 的位置缩小为原来的 $$1/8$$，使其重新落在 4096 的位置范围内。这样可以减少位置外推带来的问题，但也会压缩不同 Token 之间的位置距离，因此通常还需要通过长上下文微调，让模型适应新的位置分布。
:::


:::bi
These realities mean that thoughtful context engineering is essential for building capable agents.

:::zh
这些现实意味着，要构建能干的 agent，深思熟虑的上下文工程是必不可少的。
:::

## 有效上下文的解剖（The anatomy of effective context）

:::bi
Given that LLMs are constrained by a finite attention budget, *good* context engineering means finding the *smallest possible* set of high-signal tokens that maximize the likelihood of some desired outcome. Implementing this practice is much easier said than done, but in the following section, we outline what this guiding principle means in practice across the different components of context.

:::zh
既然 LLM 受限于有限的注意力预算，*好的*上下文工程就意味着找到*尽可能小*的一组高信号 token，让想要的结果出现的可能性最大化。实践这件事说起来容易做起来难，但下面我们会讲清这条指导原则在上下文的各个组成部分上意味着什么。
:::

:::bi
**System prompts** should be extremely clear and use simple, direct language that presents ideas at the *right altitude *for the agent. The right altitude is the Goldilocks zone between two common failure modes. At one extreme, we see engineers hardcoding complex, brittle logic in their prompts to elicit exact agentic behavior. This approach creates fragility and increases maintenance complexity over time. At the other extreme, engineers sometimes provide vague, high-level guidance that fails to give the LLM concrete signals for desired outputs or falsely assumes shared context. The optimal altitude strikes a balance: specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics to guide behavior.

:::zh
**系统提示**应当极其清晰，用简单直接的语言，把想法放在对 agent 来说*正确的海拔*上。正确的海拔，是两种常见失败模式之间那个恰到好处的地带。一个极端是，工程师把复杂又脆弱的逻辑硬编码进提示词，想借此逼出精确的 agent 行为。这种做法会带来脆弱性，长期看维护复杂度也会上升。另一个极端是，工程师给出模糊的高层指引，既没给 LLM 提供想要输出的具体信号，又错误地假定双方共享上下文。最优的海拔取一个平衡点：具体到足以有效引导行为，又灵活到能给模型提供有力的启发式规则来引导行为。
:::

:::figure
![在上下文工程中校准系统提示](./images/context-engineering-for-ai-agents/calibrating-system-prompt.png)
Calibrating the system prompt in the process of context engineering.

:::zh
在上下文工程中校准系统提示
:::

:::bi
At one end of the spectrum, we see brittle if-else hardcoded prompts, and at the other end we see prompts that are overly general or falsely assume shared context.

:::zh
在光谱的一端，是脆弱的 if-else 硬编码提示词，另一端则是过度笼统，或者错误假定共享上下文的提示词。
:::

:::annotation
如果你把提示词写得太繁琐，全是原则，模型其实不太搞搞明白你到底要什么。而如果你写的太简单，搞成 if-else，那模型没有判断空间，改一点就崩。合适的提示词更像给同事的交接文档，说清楚目标，边界和判断标准，把具体执行留给对方。系统提示的长短不是关键，关键是它有没有给出可操作的启发式。
:::

:::bi
We recommend organizing prompts into distinct sections (like `<background_information>`, `<instructions>`, `## Tool guidance`, `## Output description`, etc) and using techniques like XML tagging or Markdown headers to delineate these sections, although the exact formatting of prompts is likely becoming less important as models become more capable.

:::zh
我们建议把提示词组织成几个界限分明的区段（比如 `<background_information>`，`<instructions>`，`## Tool guidance`，`## Output description`，等等），并用 XML 标签或 Markdown 标题这类手段把这些区段划清楚。不过随着模型越来越能干，提示词的具体格式大概会变得没那么重要。
:::

:::bi
Regardless of how you decide to structure your system prompt, you should be striving for the minimal set of information that fully outlines your expected behavior. (Note that minimal does not necessarily mean short; you still need to give the agent sufficient information up front to ensure it adheres to the desired behavior.) It’s best to start by testing a minimal prompt with the best model available to see how it performs on your task, and then add clear instructions and examples to improve performance based on failure modes found during initial testing.

:::zh
不管你决定怎么组织系统提示，都应该朝着“刚好完整勾勒出期望行为的最小信息集”去努力。（注意，最小不一定意味着短，你仍然需要在开头给 agent 足够的信息，确保它照着期望的行为走。）最好先用最好的模型试一版最小提示，看它在你的任务上表现如何，再根据初期测试暴露出的失败模式，加上清晰的指令和示例来提升表现。
:::

:::bi
**Tools** allow agents to operate with their environment and pull in new, additional context as they work. Because tools define the contract between agents and their information/action space, it’s extremely important that tools promote efficiency, both by returning information that is token efficient and by encouraging efficient agent behaviors.

:::zh
**工具**让 agent 能跟环境交互，并在工作过程中拉进新的额外上下文。因为工具定义了 agent 与其信息空间和行动空间之间的契约，工具能否促进效率就极其重要，一方面要返回 token 高效的信息，另一方面要鼓励 agent 采用高效的行为。
:::

:::bi
In [Writing tools for AI agents – with AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents), we discussed building tools that are well understood by LLMs and have minimal overlap in functionality. Similar to the functions of a well-designed codebase, tools should be self-contained, robust to error, and extremely clear with respect to their intended use. Input parameters should similarly be descriptive, unambiguous, and play to the inherent strengths of the model.

:::zh
在[为 AI agent 写工具，也让 AI agent 来写](https://www.anthropic.com/engineering/writing-tools-for-agents)一文里，我们讨论过怎么构建 LLM 好理解并且功能重叠最小的工具。就像设计良好的代码库里的函数一样，工具应当自包含，对错误鲁棒，并且在其预期用途上极其清晰。输入参数同样应当有描述性，没有歧义，并且发挥模型固有的长处。
:::

:::bi
One of the most common failure modes we see is bloated tool sets that cover too much functionality or lead to ambiguous decision points about which tool to use. If a human engineer can’t definitively say which tool should be used in a given situation, an AI agent can’t be expected to do better. As we’ll discuss later, curating a minimal viable set of tools for the agent can also lead to more reliable maintenance and pruning of context over long interactions.

:::zh
我们见到的一种最常见的失败模式，是臃肿的工具集，覆盖的功能太多，或者让“该用哪个工具”变成一个含糊的决策点。如果人类工程师都没法明确说出某个场景该用哪个工具，就不能指望 AI agent 做得更好。后面我们会谈到，为 agent 策展一组最小的可用工具，也有助于在长交互中更可靠地维护和裁剪上下文。
:::

:::bi
Providing examples, otherwise known as few-shot prompting, is a well known best practice that we continue to strongly advise. However, teams will often stuff a laundry list of edge cases into a prompt in an attempt to articulate every possible rule the LLM should follow for a particular task. We do not recommend this. Instead, we recommend working to curate a set of diverse, canonical examples that effectively portray the expected behavior of the agent. For an LLM, examples are the “pictures” worth a thousand words.

:::zh
提供示例，也就是常说的 few-shot 提示，是一条众所周知的最佳实践，我们也仍然强烈推荐。但团队常常会把一长串边缘情况塞进提示词，试图把某个任务下 LLM 应该遵守的每一条规则都讲清楚。我们不建议这么做。我们建议反过来，去策展一组多样又典型的示例，让它们有效呈现 agent 的期望行为。对 LLM 来说，示例就是“一图胜千言”里的那张图。
:::

:::bi
Our overall guidance across the different components of context (system prompts, tools, examples, message history, etc) is to be thoughtful and keep your context informative, yet tight. Now let's dive into dynamically retrieving context at runtime.

:::zh
贯穿上下文各个组成部分（**系统提示**，**工具**，**示例**，**消息历史**，等等）的总体建议是：多想一想，让上下文保持信息量充足，同时紧凑。接下来我们看看如何在运行时动态检索上下文。
:::

## 上下文检索与 agentic 搜索（Context retrieval and agentic search）

:::bi
In [Building effective AI agents](https://www.anthropic.com/research/building-effective-agents), we highlighted the differences between LLM-based workflows and agents. Since we wrote that post, we’ve gravitated towards a [simple definition](https://simonwillison.net/2025/Sep/18/agents/) for agents: LLMs autonomously using tools in a loop.

:::zh
在[构建有效的 AI agent](https://www.anthropic.com/research/building-effective-agents)一文里，我们强调了基于 LLM 的工作流和 agent 之间的区别。写完那篇之后，我们越来越倾向于一个[简单定义](https://simonwillison.net/2025/Sep/18/agents/)：agent 就是 LLM 在循环里自主使用工具。
:::

:::bi
Working alongside our customers, we’ve seen the field converging on this simple paradigm. As the underlying models become more capable, the level of autonomy of agents can scale: smarter models allow agents to independently navigate nuanced problem spaces and recover from errors.

:::zh
在和客户一起工作的过程中，我们看到这个领域正在向这个简单范式收敛。底层模型越来越能干，agent 的自主程度也能随之提升：更聪明的模型能让 agent 独立穿行于微妙的问题空间，并从错误中恢复。
:::

:::bi
We’re now seeing a shift in how engineers think about designing context for agents. Today, many AI-native applications employ some form of embedding-based pre-inference time retrieval to surface important context for the agent to reason over. As the field transitions to more agentic approaches, we increasingly see teams augmenting these retrieval systems with “just in time” context strategies.

:::zh
现在我们看到工程师对“怎么给 agent 设计上下文”的想法正在转变。今天，很多 AI 原生应用会用某种基于嵌入的推理前检索，把重要的上下文捞出来给 agent 推理。随着领域转向更 agentic 的做法，我们越来越多地看到团队用“即时”上下文策略来增强这些检索系统。
:::

:::bi
Rather than pre-processing all relevant data up front, agents built with the “just in time” approach maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools. Anthropic’s agentic coding solution [Claude Code](https://www.anthropic.com/claude-code) uses this approach to perform complex data analysis over large databases. The model can write targeted queries, store results, and leverage Bash commands like `head` and `tail` to analyze large volumes of data without ever loading the full data objects into context. This approach mirrors human cognition: we generally don’t memorize entire corpuses of information, but rather introduce external organization and indexing systems like file systems, inboxes, and bookmarks to retrieve relevant information on demand.

:::zh
采用“即时”做法的 agent 不会把所有相关数据都提前预处理，而是维护轻量的标识符（文件路径，已存查询，网页链接，等等），再在运行时用工具按这些引用动态把数据加载进上下文。Anthropic 的 agentic 编码方案 [Claude Code](https://www.anthropic.com/claude-code) 就用这种做法，在大型数据库上做复杂的数据分析。模型可以写有针对性的查询，存下结果，再借助 `head` 和 `tail` 这样的 Bash 命令去分析大量数据，全程不用把完整的数据对象加载进上下文。这种做法和人类认知很像：我们一般不会记住整库信息，而是引入文件系统，收件箱以及书签这样的外部组织和索引系统，按需检索相关信息。
:::

:::annotation
即时检索和预检索并不是替代关系，它们是两种不一样的成本结构。预先算好嵌入查得是快，但数据一改索引就旧。让 agent 带着文件路径和查询语句这些轻量引用现取能永远读到最新信息，代价是慢一点，还要模型会用工具（补充一点：传统RAG对于模型其实就是一个黑箱，这很不好）。到了现在，检索系统的设计难点已经从算得准变成了让模型知道去哪找。
:::

:::bi
Beyond storage efficiency, the metadata of these references provides a mechanism to efficiently refine behavior, whether explicitly provided or intuitive. To an agent operating in a file system, the presence of a file named `test_utils.py` in a `tests` folder implies a different purpose than a file with the same name located in `src/core_logic/`. Folder hierarchies, naming conventions, and timestamps all provide important signals that help both humans and agents understand how and when to utilize information.

:::zh
除了存储效率，这些引用的元数据也提供了一种高效细化行为的机制，不管是显式给出的还是凭直觉的。对一个在文件系统里工作的 agent 来说，`tests` 文件夹里存在一个叫 `test_utils.py` 的文件，和 `src/core_logic/` 里一个同名文件，暗示的用途是不一样的。目录层级，命名约定和时间戳，都是重要的信号，帮助人和 agent 理解如何以及何时使用信息。
:::

:::bi
Letting agents navigate and retrieve data autonomously also enables progressive disclosure—in other words, allows agents to incrementally discover relevant context through exploration. Each interaction yields context that informs the next decision: file sizes suggest complexity; naming conventions hint at purpose; timestamps can be a proxy for relevance. Agents can assemble understanding layer by layer, maintaining only what's necessary in working memory and leveraging note-taking strategies for additional persistence. This self-managed context window keeps the agent focused on relevant subsets rather than drowning in exhaustive but potentially irrelevant information.

:::zh
让 agent 自主导航和检索数据，也带来了渐进式披露，换句话说，让 agent 通过探索逐步发现相关上下文。每一次交互都会产出上下文，为下一个决定提供依据：文件大小暗示复杂度，命名约定提示用途，时间戳可以作为相关性的代理。agent 可以一层一层地拼起理解，只在工作记忆里保留必需的东西，并用笔记策略换取额外的持久化。这种自我管理的上下文窗口让 agent 专注于相关的子集，而不是淹没在详尽却可能无关的信息里。
:::

:::bi
Of course, there's a trade-off: runtime exploration is slower than retrieving pre-computed data. Not only that, but opinionated and thoughtful engineering is required to ensure that an LLM has the right tools and heuristics for effectively navigating its information landscape. Without proper guidance, an agent can waste context by misusing tools, chasing dead-ends, or failing to identify key information.

:::zh
当然，这里有权衡：运行时探索比直接取用预先算好的数据要慢。不止如此，还需要有主见且经过思考的工程，才能确保 LLM 手里有合适的工具和启发式规则，去高效穿行它的信息版图。没有恰当的引导，agent 可能会误用工具，一头撞进死胡同，或者认不出关键信息，白白浪费上下文。
:::

:::bi
In certain settings, the most effective agents might employ a hybrid strategy, retrieving some data up front for speed, and pursuing further autonomous exploration at its discretion. The decision boundary for the ‘right’ level of autonomy depends on the task. Claude Code is an agent that employs this hybrid model: [`CLAUDE.md`](http://claude.md) files are naively dropped into context up front, while primitives like `glob` and `grep` allow it to navigate its environment and retrieve files just-in-time, effectively bypassing the issues of stale indexing and complex syntax trees.

:::zh
在某些场景里，最有效的 agent 可能会采用混合策略，先取一部分数据换取速度，再按自己的判断做进一步的自主探索。“正确”的自主程度这条分界线取决于任务。Claude Code 就是采用这种混合模式的 agent：[`CLAUDE.md`](http://claude.md) 文件会先被直接丢进上下文，而 `glob` 和 `grep` 这样的原语让它能导航环境并且即时检索文件，从而有效绕开索引过时和语法树复杂的问题。
:::

:::bi
The hybrid strategy might be better suited for contexts with less dynamic content, such as legal or finance work. As model capabilities improve, agentic design will trend towards letting intelligent models act intelligently, with progressively less human curation. Given the rapid pace of progress in the field, "do the simplest thing that works" will likely remain our best advice for teams building agents on top of Claude.

:::zh
混合策略可能更适合内容变化不那么剧烈的上下文，比如法律或金融工作。随着模型能力提升，agentic 设计会倾向于让智能的模型自主行动，人工策展的成分逐步减少。考虑到这个领域进展很快，“做能跑通的最简单的事”很可能仍然是我们给基于 Claude 构建 agent 的团队的最好建议。
:::

### 长程任务的上下文工程（Context engineering for long-horizon tasks）

:::bi
Long-horizon tasks require agents to maintain coherence, context, and goal-directed behavior over sequences of actions where the token count exceeds the LLM’s context window. For tasks that span tens of minutes to multiple hours of continuous work, like large codebase migrations or comprehensive research projects, agents require specialized techniques to work around the context window size limitation.

:::zh
长程任务要求 agent 在一系列动作中保持连贯，保持上下文，保持目标导向，而这些动作的 token 数会超出 LLM 的上下文窗口。对于要持续几十分钟甚至几个小时的任务，比如大型代码库迁移或全面的研究项目，agent 需要专门的技术来绕开上下文窗口的容量限制。
:::

:::bi
Waiting for larger context windows might seem like an obvious tactic. But it's likely that for the foreseeable future, context windows of all sizes will be subject to context pollution and information relevance concerns—at least for situations where the strongest agent performance is desired. To enable agents to work effectively across extended time horizons, we've developed a few techniques that address these context pollution constraints directly: compaction, structured note-taking, and multi-agent architectures.

:::zh
等更大的上下文窗口看起来像是个显而易见的招。但在可预见的未来，各种规模的上下文窗口大概都要面对上下文污染和信息相关性的问题，至少在想让 agent 发挥最强性能的场景里是这样。为了让 agent 在更长的时间跨度上有效工作，我们开发了几种直接针对这些上下文污染约束的技术：压缩，结构化笔记，以及多 agent 架构。
:::

#### 压缩（Compaction）

:::bi
Compaction is the practice of taking a conversation nearing the context window limit, summarizing its contents, and reinitiating a new context window with the summary. Compaction typically serves as the first lever in context engineering to drive better long-term coherence. At its core, compaction distills the contents of a context window in a high-fidelity manner, enabling the agent to continue with minimal performance degradation.

:::zh
压缩是一种做法：拿一段快要触到上下文窗口上限的对话，总结它的内容，再用这份摘要开一个新的上下文窗口。压缩通常是上下文工程里用来提升长期连贯性的第一根杠杆。它的核心是以高保真方式提炼上下文窗口的内容，让 agent 带着尽可能小的性能退化继续工作。
:::

:::bi
In Claude Code, for example, we implement this by passing the message history to the model to summarize and compress the most critical details. The model preserves architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs or messages. The agent can then continue with this compressed context plus the five most recently accessed files. Users get continuity without worrying about context window limitations.

:::zh
比如在 Claude Code 里，我们的做法是把消息历史交给模型，让它总结并压缩其中最关键的细节。模型会保留架构决策，未解决的 bug 和实现细节，丢掉冗余的工具输出或消息。之后 agent 可以带着这份压缩后的上下文，加上最近访问的五个文件继续工作。用户因此获得了连续性，又不用操心上下文窗口的限制。
:::

:::bi
The art of compaction lies in the selection of what to keep versus what to discard, as overly aggressive compaction can result in the loss of subtle but critical context whose importance only becomes apparent later. For engineers implementing compaction systems, we recommend carefully tuning your prompt on complex agent traces. Start by maximizing recall to ensure your compaction prompt captures every relevant piece of information from the trace, then iterate to improve precision by eliminating superfluous content.

:::zh
压缩的手艺在于取舍：留下什么，丢掉什么。压缩得太激进，可能丢掉那些微妙却关键的上下文，而它们的重要性要到后面才显现出来。对实现压缩系统的工程师，我们建议在复杂的 agent 轨迹上仔细调提示词。先最大化召回，确保压缩提示能把轨迹里每一块相关信息都抓到，然后再迭代提升精度，删掉多余的内容。
:::

:::annotation
压缩的难点不在总结而在取舍。保什么丢什么只有改完了才能知道对错，所以文章建议先在复杂轨迹上把召回率拉满，再回头压精度。一个实用的判断标准是：这段信息以后还有没有机会重新拿到？工具调用的原始结果通常能重新取，架构决策和没解决的 bug 不能，这就是为什么清工具结果是最安全的第一刀。
:::

:::bi
An example of low-hanging superfluous content is clearing tool calls and results – once a tool has been called deep in the message history, why would the agent need to see the raw result again? One of the safest lightest touch forms of compaction is tool result clearing, most recently launched as a [feature on the Claude Developer Platform](https://www.anthropic.com/news/context-management).

:::zh
一个唾手可得的冗余内容例子，是清掉工具调用和结果：一个工具在消息历史深处早就调用过了，agent 为什么还要再看一遍原始结果？最安全也最轻微的一种压缩形式就是清理工具结果，最近刚作为 [Claude 开发者平台上的功能](https://www.anthropic.com/news/context-management)上线。
:::

#### 结构化笔记（Structured note-taking）

:::bi
Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes persisted to memory outside of the context window. These notes get pulled back into the context window at later times.

:::zh
结构化笔记，也叫 agentic 记忆，是一种让 agent 定期写笔记，把笔记持久化到上下文窗口之外的记忆里的做法。这些笔记之后会被重新拉回上下文窗口。
:::

:::bi
This strategy provides persistent memory with minimal overhead. Like Claude Code creating a to-do list, or your custom agent maintaining a `NOTES.md` file, this simple pattern allows the agent to track progress across complex tasks, maintaining critical context and dependencies that would otherwise be lost across dozens of tool calls.

:::zh
这个策略以极小的开销提供了持久记忆。就像 Claude Code 会建一份待办清单，或者你的自定义 agent 维护一个 `NOTES.md` 文件，这个简单的模式让 agent 能在复杂任务中追踪进度，保住那些否则会在几十次工具调用中丢失的关键上下文和依赖关系。
:::

:::bi
[Claude playing Pokémon](https://www.twitch.tv/claudeplayspokemon) demonstrates how memory transforms agent capabilities in non-coding domains. The agent maintains precise tallies across thousands of game steps—tracking objectives like "for the last 1,234 steps I've been training my Pokémon in Route 1, Pikachu has gained 8 levels toward the target of 10." Without any prompting about memory structure, it develops maps of explored regions, remembers which key achievements it has unlocked, and maintains strategic notes of combat strategies that help it learn which attacks work best against different opponents.

:::zh
[Claude 玩宝可梦](https://www.twitch.tv/claudeplayspokemon)展示了记忆如何改变 agent 在非编码领域的能力。agent 会在数千个游戏步骤中维持精确的记录，追踪诸如“在过去 1,234 步里我一直在 1 号道路训练宝可梦，皮卡丘已经升了 8 级，目标是 10 级”这样的目标。没有任何关于记忆结构的提示，它自己就长出了已探索区域的地图，记住了自己解锁了哪些关键成就，还维护着战斗策略方面的战略笔记，帮它学会不同对手该用哪些招式最有效。
:::

:::bi
After context resets, the agent reads its own notes and continues multi-hour training sequences or dungeon explorations. This coherence across summarization steps enables long-horizon strategies that would be impossible when keeping all the information in the LLM’s context window alone.

:::zh
上下文重置之后，agent 会读自己写的笔记，继续好几小时的训练序列或地牢探索。这种跨总结步骤的连贯性，让那些如果只把信息留在 LLM 上下文窗口里就做不到的长程策略成为可能。
:::

:::bi
As part of our [Sonnet 4.5 launch](https://www.anthropic.com/effective-context-engineering-for-ai-agents), we released [a memory tool](http://anthropic.com/news/context-management) in public beta on the Claude Developer Platform that makes it easier to store and consult information outside the context window through a file-based system. This allows agents to build up knowledge bases over time, maintain project state across sessions, and reference previous work without keeping everything in context.

:::zh
作为 [Sonnet 4.5 发布](https://www.anthropic.com/effective-context-engineering-for-ai-agents)的一部分，我们在 Claude 开发者平台上公测发布了一个[记忆工具](http://anthropic.com/news/context-management)，它通过基于文件的系统，让在上下文窗口之外存储和查询信息变得更容易。这让 agent 能随时间建立知识库，跨会话维持项目状态，并引用之前的工作，而不用把所有东西都留在上下文里。
:::

#### 子 agent 架构（Sub-agent architectures）

:::bi
Sub-agent architectures provide another way around context limitations. Rather than one agent attempting to maintain state across an entire project, specialized sub-agents can handle focused tasks with clean context windows. The main agent coordinates with a high-level plan while subagents perform deep technical work or use tools to find relevant information. Each subagent might explore extensively, using tens of thousands of tokens or more, but returns only a condensed, distilled summary of its work (often 1,000-2,000 tokens).

:::zh
子 agent 架构提供了另一种绕开上下文限制的方式。与其让一个 agent 试图在整个项目上维持状态，不如让专门的子 agent 用干净的上下文窗口处理聚焦的任务。主 agent 用一份高层计划协调，子 agent 则做深入的技术工作，或者用工具去找相关信息。每个子 agent 可能会大量探索，用掉几万甚至更多 token，但只返回一份浓缩提炼过的摘要（通常 1,000 到 2,000 token）。
:::

:::bi
This approach achieves a clear separation of concerns—the detailed search context remains isolated within sub-agents, while the lead agent focuses on synthesizing and analyzing the results. This pattern, discussed in [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), showed a substantial improvement over single-agent systems on complex research tasks.

:::zh
这种做法实现了清晰的关注点分离：详细的搜索上下文隔离在子 agent 内部，主 agent 专注于综合和分析结果。这种模式在[我们如何构建多 agent 研究系统](https://www.anthropic.com/engineering/multi-agent-research-system)一文里讨论过，在复杂研究任务上相比单 agent 系统有显著提升。
:::

:::annotation
子 agent 的思路是把上下文当成可以隔离的资源，搜索过程中的几万 token 留在子 agent 里，主 agent 只收一份一两千 token 的摘要。代价也很清楚，摘要必然丢信息，主 agent 没法回头检查细节。所以这种架构适合探索范围大，结论可以压缩的任务，不适合需要逐行推敲的工作。
:::

:::bi
The choice between these approaches depends on task characteristics. For example:

:::zh
在这几种做法之间怎么选，取决于任务特征。比如：
:::

:::bi
- Compaction maintains conversational flow for tasks requiring extensive back-and-forth;
- Note-taking excels for iterative development with clear milestones;
- Multi-agent architectures handle complex research and analysis where parallel exploration pays dividends.

:::zh
- 压缩适合需要大量来回对话的任务，能保持对话的流动
- 结构化笔记适合有清晰里程碑的迭代开发
- 多 agent 架构适合复杂的调研和分析，因为并行探索能带来额外收益
:::

:::bi
Even as models continue to improve, the challenge of maintaining coherence across extended interactions will remain central to building more effective agents.

:::zh
即使模型继续进步，在长交互中维持连贯性这个挑战，仍将是构建更有效 agent 的核心。
:::

## 结论（Conclusion）

:::bi
Context engineering represents a fundamental shift in how we build with LLMs. As models become more capable, the challenge isn't just crafting the perfect prompt—it's thoughtfully curating what information enters the model's limited attention budget at each step. Whether you're implementing compaction for long-horizon tasks, designing token-efficient tools, or enabling agents to explore their environment just-in-time, the guiding principle remains the same: find the smallest set of high-signal tokens that maximize the likelihood of your desired outcome.

:::zh
上下文工程代表了我们用 LLM 做东西方式上的一次根本转变。模型越来越能干，挑战就不只是打磨一条完美的提示词，而是在每一步都用心策展哪些信息能进入模型有限的注意力预算。不管是在为长程任务实现压缩，设计 token 高效的工具，还是让 agent 即时探索自己的环境，指导原则都一样：找到尽可能小的一组高信号 token，让你想要的结果出现的可能性最大化。
:::

:::bi
The techniques we've outlined will continue evolving as models improve. We're already seeing that smarter models require less prescriptive engineering, allowing agents to operate with more autonomy. But even as capabilities scale, treating context as a precious, finite resource will remain central to building reliable, effective agents.

:::zh
我们讲的这些技术会随着模型进步继续演化。我们已经看到，更聪明的模型需要的指令性工程更少，让 agent 能带着更多自主性运转。但即使能力不断扩展，把上下文当成一种宝贵且有限的资源，仍将是构建可靠且有效的 agent 的核心。
:::

:::bi
Get started with context engineering in the Claude Developer Platform today, and access helpful tips and best practices via our [memory and context management](https://platform.claude.com/cookbook/tool-use-memory-cookbook) cookbook.

:::zh
现在就可以在 Claude 开发者平台上开始做上下文工程，有用的技巧和最佳实践可以看我们的[记忆与上下文管理](https://platform.claude.com/cookbook/tool-use-memory-cookbook) cookbook。
:::

:::bi
Written by Anthropic's Applied AI team: Prithvi Rajasekaran, Ethan Dixon, Carly Ryan, and Jeremy Hadfield, with contributions from team members Rafi Ayub, Hannah Moran, Cal Rueb, and Connor Jennings. Special thanks to Molly Vorwerck, Stuart Ritchie, and Maggie Vo for their support.

:::zh
本文由 Anthropic 应用 AI 团队撰写：Prithvi Rajasekaran，Ethan Dixon，Carly Ryan 和 Jeremy Hadfield 执笔，团队成员 Rafi Ayub，Hannah Moran，Cal Rueb 和 Connor Jennings 亦有贡献。感谢 Molly Vorwerck，Stuart Ritchie 和 Maggie Vo 的支持。
:::
