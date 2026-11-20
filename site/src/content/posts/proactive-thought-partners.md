---
title: '主动式思考伙伴：写作助手什么时候该主动开口'
description: '主动式 AI 在写作里目前只做到补全句子这一步。这篇论文把“主动性”和“认知支持”拆成两个维度，提出主动式思考伙伴：写作者自己配置伙伴的角色，事件触发和情境启发规则，再部署一周交给 16 名被试使用。最值得记的发现是事件不等于需求，同样的停顿可能意味着卡住也可能意味着专注，所以触发之后还需要一层情境判断。'
pubDate: 2026-11-20
author: 'Chao Zhang，Abe Davis，Chih-Wei Chen，Chin-Chia Hsu'
category: papers
tags: ['人机交互', '交互设计', '用户研究', 'LLM', '写作']
subcategory: 'paper-hci'
---

:::source
- **论文**：Designing Proactive Thought Partners for Writing
- **作者**：Chao Zhang，Abe Davis，Chih-Wei Chen，Chin-Chia Hsu
- **机构**：康奈尔大学，Google DeepMind（第一作者的工作在 Google DeepMind 实习期间完成）
- **发表**：arXiv 2609.01588，2026 年 9 月 1 日（30 页，5 图）
- **原文**：[arxiv.org/abs/2609.01588](https://arxiv.org/abs/2609.01588)
- **项目页**：[deepmind.google/research/publications/265605](https://deepmind.google/research/publications/265605/)
:::

> [!NOTE]
> 本文是论文《Designing Proactive Thought Partners for Writing》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文十节全译，从摘要到结论一节不落。原文没有附录，预配置伙伴，访谈提纲和完整提示词放在补充材料里，arXiv 正文没有附，这里也没有收。章节编号和图号都沿用原文，所以跨节引用（§4.1，图 3 这类）和原文对得上，但和本站目录的编号不一定一致。原文用作者年份制引用，正文里（Flower and Hayes, 1981）这类标记原样保留，没有附参考文献表。四张表都收了，表里的 RQ1，KF1，DG1，DI1，P / E / S 这类编号和标签保留英文，职位名和写作情境也保留英文。五张图都是论文原图，图注下面那行中文小字是我加的说明。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

## 摘要（Abstract）

:::bi

Writing involves diverse cognitive activities, from ideation to revision, and writers’ needs vary across individuals and moments. Proactive AI promises to provide the right support at the right time, yet existing proactive tools largely focus on generic textual assistance, such as autocomplete. This paper studies the design space of *proactive thought partners*: AI agents that proactively offer customizable, higher-level cognitive support during writing. We instantiated this concept in a technology probe and deployed it with 16 participants for one week. The probe allows users to create partners by configuring their roles and proactivity. As users write, relevant partners take the initiative at appropriate moments to offer suggestions. Our findings show that participants configured proactive support through prospective planning, used suggestions for both idea generation and self-monitoring, and valued lightweight visual representations alongside non-directive rhetorical framing for non-intrusive interventions. We derive implications for designing proactive writing assistants around customization, timing, engagement, and representation.

:::zh

写作涉及从构思到修改的多种认知活动，写作者的需求会因人和时刻而异。主动式 AI 有望在恰当的时刻提供恰当的支持，然而现有的主动式工具大多聚焦于通用的文本层面的辅助，例如自动补全。本文研究 *主动式思考伙伴* 的设计空间：这类 AI 智能体在写作过程中主动提供可定制且更高层次的认知支持。我们在一个技术探针中实例化了这一概念，并部署给 16 名被试使用了一周。该探针允许用户通过配置伙伴的角色和主动性来创建伙伴。随着用户写作，相关的伙伴会在恰当的时刻主动提出建议。我们的发现表明，被试通过前瞻性规划来配置主动式支持，把建议同时用于想法生成和自我监控，并认可轻量的视觉呈现和非指令性的修辞框架，因为二者能让干预不那么打扰。我们由此提炼出设计主动式写作助手的启示，涵盖定制，时机，参与和呈现。
:::

:::annotation
技术探针不是产品评测：一周部署的对象是探针本身，不是成品。所以本文的研究问题全部落在“人们怎么配置，怎么用，怎么想”上，没有写作质量的前后测，也没有对照组。
:::

## 引言（Introduction）

:::bi

Writing is a dynamic cognitive process (Flower and Hayes, 1981). From one moment to the next, a writer might shift between developing ideas, selecting prose, and evaluating written text in light of broader narrative goals. The support they need can therefore change throughout the writing process. At one moment, a writer may benefit from an example that makes an abstract claim concrete; at another, they may need help considering an alternative perspective or deciding how to develop the next section. These needs also vary across writers. Some writers may want support that helps them develop and evaluate their own ideas, while others may prefer information-seeking assistance, such as suggesting evidence from outside their domains. An ideal writing assistant should therefore support this shifting and personal cognitive work by *offering the right kind of help at the right moment*.

:::zh

写作是一个动态的认知过程 (Flower and Hayes, 1981)。写作者会在发展想法，挑选措辞，以及在更宏大的叙事目标下评估已写文本之间来回切换。因此，他们所需要的支持会在整个写作过程中不断变化。写作者有时可以从一个把抽象主张具体化的例子中获益，有时则需要帮助来考虑替代视角，或者决定如何展开下一节。这些需求也因人而异。有些写作者希望获得支持来发展并评估自己的想法，另一些写作者则更偏好信息查找类的辅助，例如提示来自其领域之外的证据。因此，理想的写作助手应当*在恰当的时刻提供恰当类型的帮助*，以支持这种不断变化且因人而异的认知工作。
:::

:::annotation
注意第一段埋的两个前提：帮助要在合适的时刻给，而且要是对的那一类。后半句的“那类”指的是认知层而不是文本层，补全句子解决不了这个需求。
:::

:::bi

Existing proactive writing assistance approaches this ideal in a narrower setting. At the level of local text production, writing is relatively structured and predictable: the surrounding text often provides strong signals about useful continuations, while observable interaction events, such as pauses, can provide natural opportunities for intervention (Chen et al., 2019). Prior work has therefore leveraged such signals to proactively provide local textual assistance, such as autocomplete and next-phrase suggestions (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023). However, writing involves more than choosing words. Higher-level cognitive activities such as ideation, reflection, and revision are more dependent on the writer’s preferences and evolving context (Flower and Hayes, 1981). In contrast to local textual assistance, support for these higher-level activities has largely relied on reactive interfaces, where tools respond only after users explicitly request assistance through prompts, buttons, or menus (Gero et al., 2022; Zhang et al., 2025a; Reza et al., 2023).

:::zh

现有的主动式写作辅助是在一个更窄的场景中逼近这一理想的。在局部的文本生产层面，写作相对结构化且可预测：周围的文本往往会对有用的后续内容给出很强的信号，而可观察的交互事件，例如停顿，则能提供自然的干预时机 (Chen et al., 2019)。因此，先前的工作利用这类信号主动提供局部文本层面的辅助，例如自动补全和下一短语建议 (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023)。然而，写作并不止于选择词语。构思，反思和修改这类更高层次的认知活动，更依赖于写作者的偏好和不断演变的情境 (Flower and Hayes, 1981)。与局部文本层面的辅助不同，面向这些更高层次活动的支持在很大程度上仍依赖被动的界面，也就是工具只有在用户通过提示词，按钮或菜单明确请求帮助之后才作出响应 (Gero et al., 2022; Zhang et al., 2025a; Reza et al., 2023)。
:::

:::annotation
这一段的缺口画得很清楚：主动的工具只碰文本，能碰认知的工具又得等人开口。本文的切入点就是这两件事的交集，而不是把补全做得更聪明。
:::

:::figure
![Proactive thought partners in the design space of intelligent writing…](./images/proactive-thought-partners/fig-01.jpg)

Figure 1: *Proactive thought partners in the design space of intelligent writing assistants.* We position intelligent writing assistants along two dimensions: initiative, distinguishing reactive user-invoked support from proactive system-initiated support, and level of support, distinguishing textual assistance from higher-level cognitive assistance. Proactive thought partners fall within the proactive and cognitive quadrant, where AI offers higher-level cognitive support during writing without requiring explicit user prompting.

:::zh
图 1：横轴是支持层级，纵轴是谁发起，两条轴互相独立。右下角那个格子是本篇的位置：系统主动出手，给的是认知层的帮助，而不是补全下一句。读的时候先看两条轴的意思，再看每个格子举的例子，就能看出作者要填的空白在哪里：左侧一列要的是文本，右侧一列要的是判断，而现有工具要么主动但只碰文本，要么能碰认知但要等人开口。
:::
:::

:::annotation
图 1 的两条轴是独立维度：谁发起，支持哪一层。补全式主动和认知式主动同属“主动”那一行，却分在两端，论文要占的就是“主动 + 认知”这个之前空着的格子。
:::

:::bi

We study proactive AI assistants that support these higher-level, personal cognitive needs in writing, which we call *proactive thought partners* (Fig. 1). We instantiated this concept in a technology probe (Hutchinson et al., 2003), using customization as both an interaction design mechanism and an inquiry instrument for exploring the design space. The probe allows users to create thought partners by customizing both their *roles* and *proactivity*. First, users define each partner’s role to specify the type of cognitive support they need. Second, users define timing conditions to specify when the partner should intervene. As users write, relevant partners take the initiative at appropriate moments to offer suggestions, which users can easily dismiss, use as inspiration, or ask the partner to apply directly to the document.

:::zh

我们研究的是在写作中支持这些更高层次且个性化认知需求的主动式 AI 助手，我们称之为*主动式思考伙伴*（图 1）。我们在一个技术探针中实例化了这一概念 (Hutchinson et al., 2003)，把定制同时当作交互设计机制和探索设计空间的探究工具。该探针允许用户通过定制伙伴的*角色*和*主动性*来创建思考伙伴。首先，用户定义每个伙伴的角色，以指明自己需要哪一类认知支持。其次，用户定义时机条件，以指明伙伴应当在什么时候介入。随着用户写作，相关的伙伴会在恰当的时刻主动提出建议，而用户可以轻松忽略这些建议，把它们当作灵感，或者请伙伴直接应用到文档中。
:::

:::bi

We deployed this probe with 16 participants in a one-week diary study followed by semi-structured interviews. Our findings show how users customized, engaged with, and experienced this new form of proactive support for writing. Participants used customization to translate anticipated needs and likely difficulties into different forms of cognitive support and timing conditions, treating configuration as an act of prospective planning. During writing, they often ignored interventions to preserve flow, while engaged suggestions supported both idea generation and self-monitoring. Participants also found proactive support less intrusive when it was presented through lightweight visual representations and non-directive rhetorical framing. Our findings suggest design implications for proactive thought partners across four dimensions of the design space: customization, timing, engagement, and representation.

:::zh

我们把这一探针部署给 16 名被试，进行为期一周的日记研究，随后进行半结构化访谈。我们的发现展示了用户如何定制，如何参与并如何体验这种面向写作的新型主动式支持。被试通过定制把预期需求和可能的困难转化为不同形式的认知支持与时机条件，把配置当作一种前瞻性规划的行为。在写作过程中，他们常常忽略干预以保持心流，而他们采纳的建议则同时支持了想法生成和自我监控。被试还发现，当主动式支持通过轻量的视觉呈现和非指令性的修辞框架来呈现时，干预的打扰感更弱。我们的发现为主动式思考伙伴的设计提出了启示，覆盖设计空间的四个维度：定制，时机，参与和呈现。
:::

:::bi

In this work, we contribute:

:::zh

本文的贡献如下：
:::

:::bi

- **Proactive thought partners**, a new design concept for intelligent writing assistants that proactively provide higher-level and personal cognitive support through customizable AI partners.
- **A technology probe** that enables writers to create proactive thought partners by configuring their roles and proactivity, allowing us to study customizable, proactive cognitive support in situated writing practice.
- **Empirical insights and design implications** from a one-week diary study with 16 participants, revealing how users customize proactive cognitive support to suit their needs and how they engage with proactive suggestions during writing. These findings articulate a design space for proactive thought partners in writing.

:::zh

- **主动式思考伙伴**，一种面向智能写作助手的新设计概念，通过可定制的 AI 伙伴主动提供更高层次且个性化的认知支持。
- **一个技术探针**，它让写作者能够通过配置角色和主动性来创建主动式思考伙伴，从而让我们得以研究真实写作实践中可定制的主动式认知支持。
- **经验洞察与设计启示**，来自与 16 名被试开展的一周日记研究，揭示了用户如何定制主动式认知支持以契合自身需求，以及他们在写作过程中如何与主动式建议互动。这些发现勾勒出写作中主动式思考伙伴的设计空间。
:::

## 相关工作（Related Work）

:::bi

In this section, we first situate our work within the broader landscape of intelligent writing tools. We then review prior research on proactive AI assistants and customizable AI agents to discuss how our work extends these lines of research.

:::zh

本节首先把我们的工作置于智能写作工具这一更广阔的背景之中。随后我们回顾关于主动式 AI 助手和可定制 AI 智能体的既有研究，以讨论我们的工作如何扩展了这些研究方向。
:::

### 智能写作工具（Intelligent Writing Tools）

:::bi

Flower and Hayes’s cognitive process theory of writing understands writing as a recursive cognitive process involving planning, translating ideas into text, and reviewing what has been written (Flower and Hayes, 1981). Intelligent writing tools have long supported parts of this process by helping writers produce, correct, or refine text (Lee et al., 2024). For example, autocomplete and predictive text systems offer word- or phrase-level continuations (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020), while spelling, grammar, and style checkers (Chang and Chang, 2015; Chung et al., 2025; Grammarly, 2025) help identify local errors or improve surface-level expression. These systems can reduce the effort of text production and revision by providing relatively narrow forms of (sometimes proactive) assistance focused on the immediate text.

:::zh

Flower 与 Hayes 的写作认知过程理论把写作理解为一种递归的认知过程，涉及规划，把想法转化为文本，以及回顾已经写下的内容 (Flower and Hayes, 1981)。智能写作工具长期以来通过帮助写作者产出，修正或润色文本，来支持这一过程的部分环节 (Lee et al., 2024)。例如，自动补全和预测输入系统提供词级或短语级的后续内容 (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020)，而拼写，语法和风格检查器 (Chang and Chang, 2015; Chung et al., 2025; Grammarly, 2025) 帮助识别局部错误，或改善表层表达。这些系统通过提供相对狭窄且聚焦于眼前文本的（有时是主动的）辅助，降低了文本生产和修改的负担。
:::

:::bi

Recent advances in large language models (LLMs) have expanded the scope of AI writing support. Rather than only correcting or completing text, LLM-based systems can help writers brainstorm ideas (Gero et al., 2022; Huang et al., 2020; Chou et al., 2023), generate outlines (Wan et al., 2023; Wan et al., 2025), draft passages (Zhang et al., 2026b; Zhang and Davis, 2026; Zhang et al., 2026a), rewrite text (Masson et al., 2025; Ito et al., 2023; Lee et al., 2022), provide feedback (Liu et al., 2026b; Benharrak et al., 2024; Zhang et al., 2025a), and explore alternatives (Reza et al., 2023; Zhang et al., 2025b) across a wide range of writing contexts (Zhang et al., 2023; Zhang et al., 2025a; Chung et al., 2022; Yuan et al., 2022; Huang et al., 2020; Shen et al., 2023; Sun et al., 2024). This line of work shows that AI writing assistants can support higher-level cognitive activities such as ideation (Gero et al., 2022; Huang et al., 2020), reflection (Zhang et al., 2025a), and revision (Zhang et al., 2025b) than accelerating text production. However, much of this richer cognitive support remains reactive. Writers often need to leave the flow of writing to compose prompts, select text, click buttons, or otherwise explicitly invoke the system. This places the burden on writers to recognize when they need help, formulate the right request, and decide which kind of support to seek. At the same time, more proactive writing support has largely been associated with predictive text, grammar diagnosis, and next-phrase suggestions (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020; Chang and Chang, 2015; Tsai et al., 2020). This creates a gap between two forms of assistance: systems that are proactive but focused on text continuation/correction, and systems that provide broader cognitive support but require explicit user initiation. Our work explores the design space in this gap that combines proactivity and cognitive support in writing, which we term “proactive thought partners.”

:::zh

大语言模型 (LLMs) 的最新进展扩展了 AI 写作支持的范围。基于 LLM 的系统不仅能修正或补全文本，还能在广泛的写作情境中帮助写作者头脑风暴想法 (Gero et al., 2022; Huang et al., 2020; Chou et al., 2023)，生成大纲 (Wan et al., 2023; Wan et al., 2025)，起草段落 (Zhang et al., 2026b; Zhang and Davis, 2026; Zhang et al., 2026a)，改写文本 (Masson et al., 2025; Ito et al., 2023; Lee et al., 2022)，提供反馈 (Liu et al., 2026b; Benharrak et al., 2024; Zhang et al., 2025a)，以及探索替代方案 (Reza et al., 2023; Zhang et al., 2025b)，这些能力覆盖广泛的写作情境 (Zhang et al., 2023; Zhang et al., 2025a; Chung et al., 2022; Yuan et al., 2022; Huang et al., 2020; Shen et al., 2023; Sun et al., 2024)。这一系列工作表明，AI 写作助手能够支持构思 (Gero et al., 2022; Huang et al., 2020)，反思 (Zhang et al., 2025a) 和修改 (Zhang et al., 2025b) 这类更高层次的认知活动，而不只是加速文本生产。然而，这些更丰富的认知支持大多仍是被动的。写作者常常需要离开写作心流去撰写提示词，选中文本，点击按钮，或以其他方式显式调用系统。这就把负担压在写作者身上：他们得意识到自己何时需要帮助，组织出正确的请求，并决定该寻求哪一类支持。与此同时，更为主动的写作支持在很大程度上仍与预测输入，语法诊断和下一短语建议联系在一起 (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020; Chang and Chang, 2015; Tsai et al., 2020)。这就造成了两类辅助之间的空白：一类主动但聚焦于文本续写和修正，另一类提供更广泛的认知支持却需要用户显式发起。我们的工作探索这一空白中把主动性与写作认知支持结合起来的设计空间，我们称之为“主动式思考伙伴”。
:::

### 主动式 AI 助手（Proactive AI Assistants）

:::bi

Rather than waiting for users to formulate a prompt or click a menu, proactive AI assistants take the initiative by offering assistance when they anticipate it may be useful. This idea builds on a long tradition of mixed-initiative interaction, where both users and systems can take initiative in pursuit of a shared task (Horvitz, 1999). Recent work has explored proactive AI in domains such as programming (Chen et al., 2025a; Pu et al., 2025; Kuo et al., 2026), meetings (Chen et al., 2025b), design (Son et al., 2026), surveys (Liu et al., 2026a), tool manipulation (Prasongpongchai et al., 2025), scholarly recommendation (Siangliulue et al., 2026), storytelling games (Kreminski et al., 2020), web search (Huang and Narechania, 2026), problem-solving (Luo et al., 2026), and group collaboration (Mukhopadhyay et al., 2026; Zhou et al., 2026), where systems may surface relevant information, reflect on goals, or suggest next steps. In line with the most recent work on proactive AI (Pu et al., 2025; Chen et al., 2025a; Chen et al., 2025b) and an early Wizard-of-Oz study simulating proactive AI for writing (Yin et al., 2026), we define proactivity as the system actively inferring user needs and offering suggestions without requiring explicit user prompting.

:::zh

主动式 AI 助手不会等待用户撰写提示词或点击菜单，而是在预判到帮助可能有用时主动提供辅助。这一想法建立在混合主动交互的悠久传统之上，即用户和系统都可以为共同的任务而采取主动 (Horvitz, 1999)。近期研究已在编程 (Chen et al., 2025a; Pu et al., 2025; Kuo et al., 2026)，会议 (Chen et al., 2025b)，设计 (Son et al., 2026)，调查 (Liu et al., 2026a)，工具操作 (Prasongpongchai et al., 2025)，学术推荐 (Siangliulue et al., 2026)，故事创作游戏 (Kreminski et al., 2020)，网络搜索 (Huang and Narechania, 2026)，问题解决 (Luo et al., 2026) 和群体协作 (Mukhopadhyay et al., 2026; Zhou et al., 2026) 等领域探索主动式 AI，在这些场景中，系统可以呈现相关信息，反思目标，或建议下一步行动。与最新的主动式 AI 工作 (Pu et al., 2025; Chen et al., 2025a; Chen et al., 2025b) 以及一项早期模拟写作主动式 AI 的绿野仙踪研究 (Yin et al., 2026) 一致，我们把主动性定义为系统主动推断用户需求，并在无需用户显式提示的情况下提供建议。
:::

:::annotation
混合主动交互的老问题是“系统什么时候该主动”。本文把它拆成两层：事件触发决定“什么时候看一眼”，情境启发规则决定“看到之后要不要出手”。后面所有发现都长在这个拆分上。
:::

:::bi

Timing is key to system initiative (Horvitz, 1999; Bailey et al., 2001). Existing proactive writing assistants often tie the timing of interventions to observable interaction events. For example, autocomplete systems surface continuations as writers type (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020; Chen et al., 2019), while Lehmann et al. (2026) allowed users to bundle autonomous tasks with triggers such as pauses, edits, or saves. In these systems, such events directly cue system action. However, the same event can reflect different writing states. A pause, for example, may indicate concentration, being stuck for ideas, or reviewing recently written text. For higher-level cognitive support, interaction events alone may therefore be insufficient to determine whether assistance is needed and what kind of support would be useful. Our work extends this event-based approach by introducing *contextual heuristics*, which specify more specific timing conditions under which a partner should intervene when a broader interaction event occurs. This distinction also allows us to study how users conceptualize these two forms of timing differently: event triggers as broad opportunities for the system to check whether support may be relevant, and contextual heuristics as more specific conditions for determining whether and which support should actually be provided. In doing so, we examine how users expect proactive cognitive support to interpret their evolving writing context when deciding whether and which support to provide.

:::zh

时机是系统主动性的关键 (Horvitz, 1999; Bailey et al., 2001)。现有的主动式写作助手往往把干预时机与可观察的交互事件绑定。例如，自动补全系统会在写作者输入时呈现后续内容 (Bhat et al., 2023; Buschek et al., 2021; Jakesch et al., 2023; Arnold et al., 2020; Chen et al., 2019)，而 Lehmann et al. (2026) 允许用户把自主任务与停顿，编辑或保存这类触发条件捆绑在一起。在这些系统中，此类事件直接触发系统行动。然而，同一个事件可能反映不同的写作状态。例如，一次停顿可能意味着专注，也可能意味着卡在想法上，或者是在回顾刚写下的文本。因此，对于更高层次的认知支持而言，仅凭交互事件可能不足以判断是否需要帮助，以及什么样的支持会有用。我们的工作通过引入*情境启发规则*扩展了这种基于事件的方法：当更宽泛的交互事件发生时，情境启发规则指明伙伴应当在哪些更具体的时机条件下介入。这一区分也让我们得以研究用户如何以不同方式理解这两类时机：事件触发是系统检查支持是否可能相关的宽泛机会，而情境启发规则则是判定是否应当提供支持以及提供何种支持的更具体条件。借此，我们考察用户在决定是否提供支持以及提供何种支持时，期待主动式认知支持如何解读他们不断演变的写作情境。
:::

:::bi

More closely aligned with our vision, Yin et al. (2026) conducted a Wizard-of-Oz study in which a human simulated proactive AI by interpreting the writing context and offering suggestions while another human wrote a story. The study provides quantitative evidence that proactive AI, as simulated by a human, can enhance creativity by serving as a catalyst for inspiration rather than as a direct content provider. However, it remains unclear how such proactive cognitive support should be designed in a functional system, how writing context should be interpreted to determine when support is appropriate, and how users might customize proactive thought partners to suit their own needs. In this paper, we instantiate proactive cognitive support in a functional system with customizable thought partners and deploy it in a diary study to investigate how users configure, experience, and evaluate such support in practice.

:::zh

与我们的设想更贴近的是，Yin et al. (2026) 开展了一项绿野仙踪研究：由一名人类扮演者通过解读写作情境来模拟主动式 AI 并给出建议，另一名人类则负责写故事。该研究提供了定量证据，表明由人类模拟的主动式 AI 能够提升创造力，因为它充当灵感的催化剂，而非直接的内容提供者。然而，这类主动式认知支持应当如何在功能性系统中设计，写作情境应当如何解读才能判断支持何时恰当，以及用户可能如何定制主动式思考伙伴以契合自身需求，这些都仍不清楚。在本文中，我们在一个带有可定制思考伙伴的功能性系统中实例化了主动式认知支持，并在日记研究中部署，以考察用户在真实实践中如何配置，体验和评价这类支持。
:::

### 可定制的 AI 智能体（Customizable AI Agents）

:::bi

A growing body of HCI research has explored customizable AI agents as a way to better align LLM-based systems with users’ goals, preferences, and contexts. Prior work has examined customization in domains such as writing (Lehmann et al., 2026; Benharrak et al., 2024), emotional support (Zheng et al., 2025), social chatbots (Ha et al., 2024), research ideation (Liu et al., 2026c), and collaborative brainstorming (Quan et al., 2026). Across these settings, customization allows users to shape how an AI system should behave, what role it should take, and how it should respond to domain-specific needs. For emerging AI interaction concepts, customization can also serve as a probe mechanism in a study (Zheng et al., 2025): by observing what users choose to customize, researchers can surface latent needs, preferences, and expectations that may be difficult to anticipate a priori.

:::zh

越来越多的 HCI 研究把可定制的 AI 智能体作为让基于 LLM 的系统更好地贴合用户目标，偏好和情境的一种方式。先前的工作已在写作 (Lehmann et al., 2026; Benharrak et al., 2024)，情感支持 (Zheng et al., 2025)，社交聊天机器人 (Ha et al., 2024)，研究构思 (Liu et al., 2026c) 和协作式头脑风暴 (Quan et al., 2026) 等领域考察了定制。在这些场景中，定制让用户能够塑造 AI 系统应当如何行为，应当扮演什么角色，以及应当如何回应特定领域的需求。对于新兴的 AI 交互概念，定制还可以在研究中充当探针机制 (Zheng et al., 2025)：通过观察用户选择定制什么，研究者可以揭示那些事先难以预料的潜在需求，偏好和期望。
:::

:::bi

Customization is particularly important for writing because useful support depends on the writer’s goals, genre, audience, voice, and stage in the writing process. Given so, prior work has explored writer-defined AI personas for on-demand feedback (Benharrak et al., 2024), multiple user-defined agents and tasks in collaborative document editing (Lehmann et al., 2026), and layered interfaces for aligning content development with rhetorical strategy (Siddiqui et al., 2025). Recent work on just-in-time objectives further shows how AI systems can infer a user’s in-the-moment goals from observed context, such as screenshots and webpage text, and use these objectives to generate specialized expert responses or customized tools for the user’s current task (Lam et al., 2025). These systems show that customization can help writers access diverse perspectives, delegate specialized tasks, generate situated tools, and better align AI support with their communicative intentions.

:::zh

定制对写作尤为重要，因为有用的支持取决于写作者的目标，体裁，读者，个人声音以及其所处的写作阶段。有鉴于此，先前的工作探索了由写作者定义的 AI 人设用于按需反馈 (Benharrak et al., 2024)，在协作文档编辑中的多个用户定义的智能体与任务 (Lehmann et al., 2026)，以及用于把内容开发与修辞策略对齐的分层界面 (Siddiqui et al., 2025)。近期关于即时目标的工作进一步表明，AI 系统可以从截图和网页文本等观察到的情境中推断用户当下的目标，并利用这些目标为用户当前任务生成专门的专家回应或定制工具 (Lam et al., 2025)。这些系统表明，定制可以帮助写作者获得多元视角，委派专门任务，生成情境化的工具，并让 AI 支持更好地贴合他们的表达意图。
:::

:::bi

However, existing customizable writing agents are primarily invoked on demand: writers can define who the AI should be, what it should do, or what objectives it should optimize for, but they must still invoke it manually. Our work introduces a new customization dimension: the *proactivity* of AI writing agents. In our probe, writers can shape both the type of cognitive support they receive and the moments when that support enters the writing process. These user configurations provide unique empirical insights into how writers imagine, configure, and bound proactive AI support, helping us map the broader design space of proactive cognitive support for writing.

:::zh

然而，现有的可定制写作智能体主要按需调用：写作者可以定义 AI 应当是谁，应当做什么，或者应当针对什么目标进行优化，但他们仍必须手动调用。我们的工作引入了一个新的定制维度：AI 写作智能体的*主动性*。在我们的探针中，写作者既能塑造自己获得的认知支持的类型，也能塑造这类支持进入写作过程的时间点。这些用户配置为理解写作者如何想象，配置和限定主动式 AI 支持提供了独特的经验洞察，帮助我们勾勒出写作中主动式认知支持更广阔的设计空间。
:::

## 设计目标（Design Goals）

:::bi

We designed our system as a technology probe: *an instrument deployed to investigate an open-ended design space and return useful or interesting data about users’ practices, needs, and values* (Hutchinson et al., 2003). Thus, rather than aiming to build an optimal writing system, our goal was to create a functional, deployable writing environment in which users could create and use proactive thought partners for their own writing tasks. This allowed us to surface insights into how users would appropriate proactive thought partners and how they would experience customizable, proactive AI support during writing. Specifically, we designed the probe around three goals.

:::zh

我们把系统设计成一个技术探针：*一件被部署到开放式设计空间中加以考察，并返回关于用户实践与需求，以及用户价值观的有用或有趣数据的工具*（Hutchinson et al., 2003）。因此，我们的目标不是构建一个最优的写作系统，而是创造一个可用且可部署的写作环境，让用户能在其中为自己的写作任务创建并使用主动式思考伙伴。这使我们得以揭示一些洞见：用户会如何挪用主动式思考伙伴，以及他们在写作过程中会如何体验可定制的主动式 AI 支持。具体而言，我们围绕三个目标设计了这个探针。
:::

:::annotation
DG1 到 DG3 分别对应后面 Findings 里的 RQ1 到 RQ3，可以拿着编号对读，能看出设计目标和研究问题是一一对应的。
:::

:::bi

**[DG1] Support user-configurable proactive partners:** We use customization as a lens to understand how users expect proactive thought partners to support their writing practices and needs. Based on prior work on customizable AI agents (Zheng et al., 2025; Lehmann et al., 2026; Benharrak et al., 2024) and mixed-initiative systems (Horvitz, 1999; Pu et al., 2025; Bailey et al., 2001; Bailey et al., 2000; Chen et al., 2025a; Luo et al., 2026), we focus on two basic forms of user customization: the role and proactivity of partners. The role specifies what kind of support the partner should provide, a dimension emphasized in much prior work on customizable AI agents. The proactivity, by contrast, specifies when and under what writing contexts the partner should intervene, including the moments that should be treated as candidates for support and the contextual conditions under which the partner should take the initiative.

:::zh

**[DG1] 支持用户可配置的主动式伙伴：** 我们把定制当作一种透镜，用来理解用户期望主动式思考伙伴如何支持他们的写作实践与需求。基于关于可定制 AI 智能体（Zheng et al., 2025; Lehmann et al., 2026; Benharrak et al., 2024）与混合主动系统（Horvitz, 1999; Pu et al., 2025; Bailey et al., 2001; Bailey et al., 2000; Chen et al., 2025a; Luo et al., 2026）的已有研究，我们关注两种基本的用户定制：伙伴的角色与伙伴的主动性。角色规定伙伴应提供何种支持，这是许多关于可定制 AI 智能体的研究所强调的维度。相比之下，主动性规定伙伴应在何时介入，以及在何种写作情境下介入，包括哪些时刻应被视为可供支持的候选时机，以及伙伴应在哪些情境条件下主动介入。
:::

:::bi

**[DG2] Enable flexible engagement with proactive support:** Proactive support can arrive at moments when users may or may not want assistance. At different moments, users may also desire different levels of AI involvement in their writing process (e.g., inspiration or direct text generation). Thus, the probe needs to preserve user agency over how AI engages in writing (Horvitz, 1999). Informed by prior work on human-AI co-writing (Carrera et al., 2025; Fundal and Bizzoni, 2026; Yeh et al., 2025; Yin et al., 2026; Draxler et al., 2024), we investigate three forms of engagement: users can ignore a suggestion, use it as inspiration, or ask the partner to apply changes directly to the document. Together, these options allow users to treat proactive suggestions as peripheral cues, sources of inspiration, or actionable edits, while allowing us to observe how users dismiss, accept, or use proactive AI support in practice.

:::zh

**[DG2] 支持对主动式支持的灵活参与：** 主动式支持可能出现在用户需要或不需要帮助的时刻。在不同时刻，用户也可能希望 AI 以不同程度参与自己的写作过程（例如只提供灵感，或直接生成文本）。因此，探针需要保留用户对 AI 如何参与写作的自主性（Horvitz, 1999）。受关于人机协同写作的已有研究（Carrera et al., 2025; Fundal and Bizzoni, 2026; Yeh et al., 2025; Yin et al., 2026; Draxler et al., 2024）启发，我们考察三种参与形式：用户可以忽略一条建议，把建议当作灵感，或要求伙伴直接把改动应用到文档中。这些选项合在一起，既让用户可以把主动式建议当作外围线索，当作灵感来源，或当作可直接执行的编辑，也让我们能够观察用户在真实实践中如何忽视或接受主动式 AI 支持，或如何使用它。
:::

:::bi

**[DG3] Embed proactive support in a lightweight writing environment:** To study proactive thought partners in use, the probe needs to support writing as an ongoing activity rather than a one-off interaction with an assistant. We therefore aim to embed proactive support in a lightweight but functional and deployable writing environment that provides the basic affordances needed for composing and revising text while minimizing additional interface complexity. This allows users to engage with proactive support during their own writing tasks without making the writing environment itself the primary focus of the study. At the same time, the environment should enable the partners to monitor writing traces, detect candidate moments for intervention, and surface proactive support in context.

:::zh

**[DG3] 把主动式支持嵌入轻量的写作环境：** 要研究使用中的主动式思考伙伴，探针需要支持把写作当作一项持续进行的活动，而非与助手的一次性交互。因此，我们力求把主动式支持嵌入一个轻量但可用且可部署的写作环境，它提供撰写和修改文本所需的基本可供性，同时尽量减少额外的界面复杂度。这让用户可以在自己的写作任务中接触主动式支持，而不会让写作环境本身成为研究的首要焦点。与此同时，环境应能让伙伴监控写作痕迹，检测可供介入的候选时机，并在情境中呈现主动式支持。
:::

## 主动式思考伙伴：一个技术探针（Proactive Thought Partners: A Technology Probe）

:::bi

In this section, we describe the design and implementation of our technology probe, guided by the design goals above and inspired by Horvitz’s principles of mixed-initiative user interfaces (Horvitz, 1999). The probe consists of three main interfaces. First, an onboarding panel allows users to log in and describe their writing goals for a writing session. Second, a partner configuration panel allows users to create, configure, and enable proactive thought partners (Fig. 3). Third, a lightweight Markdown editor allows users to write with their enabled partners (Fig. 2). The following subsections describe the probe in four parts: how users create and configure proactive thought partners (§4.1), how the probe activates relevant partners at opportune moments in the ongoing writing process (§4.2), how the activated partners generate thought-provoking suggestions (§4.3), and how users can engage with proactive suggestions once they appear (§4.4).

:::zh

本节介绍我们技术探针的设计与实现，它以上面的设计目标为指导，并受 Horvitz 的混合主动用户界面原则（Horvitz, 1999）启发。探针包含三个主要界面。第一，入职引导面板让用户登录，并描述自己在一次写作会话中的写作目标。第二，伙伴配置面板让用户创建主动式思考伙伴，配置它们，并启用它们（图 3）。第三，轻量的 Markdown 编辑器让用户与已启用的伙伴一起写作（图 2）。以下小节分四部分介绍这个探针：用户如何创建和配置主动式思考伙伴（§4.1），探针如何在持续进行的写作过程中于合适时机激活相关伙伴（§4.2），被激活的伙伴如何生成能引发思考的建议（§4.3），以及主动式建议出现后用户可以如何参与（§4.4）。
:::

:::figure
![Writing environment with proactive thought partners. The probe consists of a…](./images/proactive-thought-partners/fig-02.jpg)

Figure 2: *Writing environment with proactive thought partners.* The probe consists of a lightweight Markdown editor (A) and a side panel (B) for proactive suggestions. As writers compose text, relevant partners take the initiative to surface contextually relevant suggestions alongside the draft. Here, the Evidence Partner notices an unfinished example and suggests concrete ways to support the claim about training habits.

:::zh
图 2：左边是写作区，右边是伙伴面板。注意正文里“For example,”被高亮，右侧 Evidence Partner 说的是“你在用例子支撑训练习惯这个论点，要不要补一个具体的训练方案”。这张图要说明的是建议贴着当前草稿出现，不占正文位置。右侧面板里的点赞，点踩和对话框图标，是后面统计参与形式和后续追问的入口。
:::
:::

:::figure
![Configuring proactive thought partners. The configuration panel allows users to…](./images/proactive-thought-partners/fig-03.jpg)

Figure 3: *Configuring proactive thought partners.* The configuration panel allows users to design and enable their own proactive thought partners. Users first specify a name and emoji for a partner, then define the role (A), select event triggers (none is selected by default to avoid anchoring effects), (B), and specify a contextual heuristic that determines when the partner should take the initiative after a selected event (C). In this example, the Evidence Partner is configured to help strengthen claims by suggesting evidence when the writer pauses and the current context calls for examples.

:::zh
图 3：配置伙伴的三个字段：角色（A），事件触发（B），情境启发规则（C）。B 里三个触发都没有默认勾选，作者特意避免默认值把被试带偏。C 里那句“Help me when I need to add evidence to support my claims”是被试自己写的判断条件，它和 B 的“什么时候看一眼”是两件事，这个区分是全文的骨架。
:::
:::

### 伙伴定制（Partner Customization）

:::bi

In the configuration panel, users can create a proactive thought partner by specifying a name and emoji, a role, one or more event triggers, and a contextual heuristic. Together, these fields allow users to customize both the partner’s role and its proactivity (**DG1**): what kind of support the partner should provide, when it may intervene, and under what contextual conditions its intervention may be useful.

:::zh

在配置面板中，用户通过填写名称与表情符号，定义角色，选择一个或多个事件触发，并设定一条情境启发规则，来创建一个主动式思考伙伴。这些字段共同让用户可以定制伙伴的角色与主动性（**DG1**）：伙伴应提供何种支持，它可能在何时介入，以及在哪些情境条件下它的介入可能有用。
:::

:::bi

- **Partner Role** defines the partner’s expected responsibility and capability, such as helping generate ideas, identifying weak evidence, or challenging an argument. This field follows prior work on customizable AI agents by allowing users to define the kind of support they want from an AI collaborator (Zheng et al., 2025; Lehmann et al., 2026; Benharrak et al., 2024).
- **Event Trigger(s)** define an observable user action that may indicate an opportunity for proactive support, such as pausing, completing a sentence, or selecting text. Inspired by prior work on proactive AI (Pu et al., 2025; Bailey et al., 2001; Bailey et al., 2000; Chen et al., 2025a; Luo et al., 2026), this field allows users to specify broad candidate moments when a partner may consider intervening. Users can select one or more triggers for each partner.
- **Contextual Heuristic** defines the contextual criteria under which the partner should take the initiative following a triggering event. Drawing on work in context-aware computing (Dey, 2001; Byun and Cheverst, 2002), this field reflects how users expect the proactive system to interpret the writing context and make judgments. By specifying contextual heuristics, users define *specific* timing conditions (such as when a claim lacks evidence or an argument may need a counterpoint) under which a particular partner would be relevant and helpful when *broad* event triggers occur.

:::zh

- **伙伴角色**定义伙伴被期望承担的责任与能力，例如帮助生成想法，发现薄弱的证据，或质疑某个论点。该字段沿用关于可定制 AI 智能体的已有研究，让用户定义自己希望从 AI 协作者那里获得何种支持（Zheng et al., 2025; Lehmann et al., 2026; Benharrak et al., 2024）。
- **事件触发**定义一个可观察的用户动作，它可能表明一次主动式支持的机会，例如停顿，写完一句话或选中文本。受关于主动式 AI 的已有研究（Pu et al., 2025; Bailey et al., 2001; Bailey et al., 2000; Chen et al., 2025a; Luo et al., 2026）启发，该字段让用户指定伙伴可以考虑介入的宽泛候选时机。用户可以为每个伙伴选择一个或多个触发。
- **情境启发规则**定义在触发事件发生后伙伴应在哪些情境标准下主动介入。该字段借鉴情境感知计算的研究（Dey, 2001; Byun and Cheverst, 2002），反映用户期望主动式系统如何解读写作情境并作出判断。通过指定情境启发规则，用户定义的是*具体的*时机条件（例如当某个主张缺少证据，或某个论证可能需要一个对立观点时），在*宽泛的*事件触发发生时，特定伙伴在这些条件下才会相关且有帮助。
:::

### 伙伴激活（Partner Activation）

:::bi

Event triggers and contextual heuristics together determine when a partner may step in (Fig. 4): triggers identify broad candidate moments for intervention, while heuristics determine whether a partner is relevant to the current writing context in a more precise way. First, we implemented three event triggers, each grounded in a different rationale from prior work on proactive AI (Pu et al., 2025; Yin et al., 2026; Chen et al., 2025a), interruption management (Bailey et al., 2001; Czerwinski et al., 2000; Iqbal et al., 2005; Miyata and Norman, 1986), and keystroke analysis of writing (Baaijen et al., 2012; Matsuhashi, 1981; Schilperoord, 2022; Galbraith and Baaijen, 2019). These triggers are rule-based and operate on user keystrokes monitored in real time within the editor.

:::zh

事件触发与情境启发规则共同决定伙伴可能在何时介入（图 4）：触发识别宽泛的可介入候选时机，启发规则则以更精确的方式判断某个伙伴是否与当前写作情境相关。首先，我们实现了三种事件触发，每一种都基于不同依据，分别来自关于主动式 AI（Pu et al., 2025; Yin et al., 2026; Chen et al., 2025a）的研究，关于中断管理（Bailey et al., 2001; Czerwinski et al., 2000; Iqbal et al., 2005; Miyata and Norman, 1986）的研究，以及关于写作击键分析（Baaijen et al., 2012; Matsuhashi, 1981; Schilperoord, 2022; Galbraith and Baaijen, 2019）的研究。这些触发基于规则，作用于编辑器内实时监控的用户击键。
:::

:::annotation
这里把主动性的判断切成了两段：规则型的触发只看可观测的动作，情境启发规则才去看草稿和写作意图。这个分工的好处是系统可以“先注意再判断”，不必把事件直接当成需求。
:::

:::bi

- **Long Pause:** The first rationale is that opportune moments for interruption often occur during natural breaks in user activity (Bailey et al., 2001; Bailey et al., 2000; Czerwinski et al., 2000). In writing, pauses have long been seen as natural breaks in writers’ cognitive processes (Chenu et al., 2014; Barkaoui, 2019; Medimorec and Risko, 2017). In our probe, the pause trigger fires after a period of user inactivity in the editor, set to 5 seconds by default and customizable by users.
- **Sentence End:** The second rationale is that interventions are often perceived as less disruptive at task or subtask boundaries (Czerwinski et al., 2000; Iqbal et al., 2005; Miyata and Norman, 1986). We operationalize this rationale through a sentence-end trigger, because completing a sentence creates a natural boundary in the flow of writing. To avoid interrupting rapid typing, the system waits for a short idle period after sentence completion, set to 1 second by default and customizable.
- **Text Selection:** The third rationale draws from proactive AI tools that treat users’ implicit actions as signals of possible need (Pu et al., 2025; Nam et al., 2024). Although text selection is a more explicit signal than passive inactivity, we followed recent work on proactive AI (Pu et al., 2025) and included it as a trigger because it still enables a lightweight form of proactivity: the writer does not need to formulate a prompt or select a specific command for a partner to offer support. When a user selects text and remains idle for a short period, set to 5 seconds by default and customizable by users, the system treats the selected span as the local focus for possible partner intervention.

:::zh

- **长停顿：** 第一条依据是，适合打断的时机常常出现在用户活动的自然间隙（Bailey et al., 2001; Bailey et al., 2000; Czerwinski et al., 2000）。在写作中，停顿一直被视为写作者认知过程中的自然间隙（Chenu et al., 2014; Barkaoui, 2019; Medimorec and Risko, 2017）。在我们的探针里，停顿触发会在用户在编辑器中一段时间没有活动后生效，该时长默认设为 5 秒，用户可自行定制。
- **句末：** 第二条依据是，任务或子任务边界上的干预常被认为打断性更低（Czerwinski et al., 2000; Iqbal et al., 2005; Miyata and Norman, 1986）。我们通过句末触发把这一依据操作化，因为写完一句话会在写作流中形成一个自然边界。为避免打断快速打字，系统在句子完成后会等待一小段空闲时间，默认设为 1 秒，且可定制。
- **选中文本：** 第三条依据来自那些把用户的隐含动作视为可能需求信号的主动式 AI 工具（Pu et al., 2025; Nam et al., 2024）。尽管选中文本比被动地不活动是更明确的信号，我们仍沿用近期关于主动式 AI 的研究（Pu et al., 2025），把它作为一种触发，因为它仍能提供一种轻量的主动性：写作者无需组织提示词或选择具体命令，伙伴便会主动提供支持。当用户选中文本并短暂保持空闲（默认设为 5 秒，用户可自行定制）时，系统会把选中的片段视为伙伴可能介入的局部焦点。
:::

:::figure
![System pipeline for proactive thought partners. When an event trigger (e.g., a…](./images/proactive-thought-partners/fig-04.jpg)

Figure 4: *System pipeline for proactive thought partners.* When an event trigger (e.g., a pause, sentence end, or text selection) occurs, the system gathers contextual information about the writer’s session goal, current text, and writing behaviors, including keystroke logs. It then evaluates the user-defined contextual criteria of all enabled partners and activates the partner or partners, if any, whose criteria best match the current situation. Each activated partner generates a suggestion that includes both an acknowledgment of the inferred user intent and a question-style suggestion based on its role.

:::zh
图 4：一条建议从触发到生成的流水线。左边三类事件触发只是“候选时刻”，中间收集写作目标，正文和击键行为，决策引擎再从已启用的伙伴里挑出最匹配的一两个，最后生成时固定拆成“确认用户意图”和“提问式建议”两段。注意 Claim Partner 和 Rebuttal Partner 都打了叉：同一时刻只有条件被满足的伙伴会出手。
:::
:::

:::bi

When an event trigger occurs, the system sends the writer’s session goal, the current text in the editor, the recent writing behaviors, and the list of enabled partners associated with that event trigger to an LLM-based decision engine (Fig. 4). The writing behaviors include the current cursor position, the trigger event, and the keystroke logs from the 15 seconds (Footnote: We use a 15-second window, following prior keystroke-analysis studies that used similarly short windows to infer user states such as boredom and engagement (Kuvar et al., 2023; Bixler and D’Mello, 2013).) before the trigger. Based on this contextual information, the decision engine selects at most two enabled partners, if any, to intervene at that moment by checking whether their user-defined contextual heuristics are satisfied. Activated partners appear as small floating tags in the right-side panel (Fig. 5A.1), aligned with the user’s current cursor position. Each tag displays the partner’s emoji and name, providing a lightweight peripheral cue before users decide how to engage with it (§4.4).

:::zh

当某个事件触发发生时，系统会向一个基于 LLM 的决策引擎（图 4）发送以下信息：写作者的会话目标，编辑器中的当前文本，近期的写作行为，以及与该事件触发关联的已启用伙伴列表。写作行为包括当前光标位置，触发事件，以及触发前 15 秒的击键日志（脚注：我们采用 15 秒的窗口，沿用以往击键分析研究的做法，那些研究用类似的短窗口来推断无聊或投入等用户状态（Kuvar et al., 2023; Bixler and D’Mello, 2013）。）基于这些情境信息，决策引擎会检查由用户定义的情境启发规则是否满足，据此选择至多两个已启用的伙伴在该时刻介入。被激活的伙伴会以小浮动标签的形式出现在右侧面板中（图 5A.1），与用户当前的光标位置对齐。每个标签显示伙伴的表情符号与名称，在用户决定如何参与之前提供一个轻量的外围线索（§4.4）。
:::

:::annotation
决策引擎每次最多挑两个伙伴，这是成本约束，也顺手避免了同一时刻冒出多条建议把写作打断。15 秒的击键窗口是判断“停顿”的量程，不是产品参数。
:::

### 建议生成（Suggestion Generation）

:::bi

The activated partner will generate a suggestion based on the current writing context. Users see this suggestion after they click the floating tag (Fig. 5C). Each suggestion contains two components.

:::zh

被激活的伙伴会基于当前写作情境生成一条建议。用户点击浮动标签后即可看到这条建议（图 5C）。每条建议包含两个组成部分。
:::

:::bi

- **Acknowledgement**: First, the partner briefly acknowledges what the writer has just done, is currently doing, or may be trying to do next. This component is inspired by writing-feedback research emphasizing that effective feedback should first locate itself in the writer’s current draft and make visible what the responder understands the writer to be attempting, before offering guidance for next steps (Sommers, 1982; Nicol and Macfarlane-Dick, 2006).
- **Suggestion**: Second, the partner offers a thought-provoking suggestion tailored to the current context. We frame this suggestion as a question because prior work suggests that question-style AI suggestions can stimulate high-quality ideas while preserving users’ ownership (Maier et al., 2026).

:::zh

- **确认**：首先，伙伴会简短确认写作者刚刚做了什么，正在做什么，或接下来可能想做什么。这一部分受写作反馈研究启发，那些研究强调有效的反馈应先把自己定位到写作者当前的草稿中，让写作者看到回应者所理解的他的意图，然后再给出下一步的指引（Sommers, 1982; Nicol and Macfarlane-Dick, 2006）。
- **建议**：其次，伙伴会给出针对当前情境且能引发思考的建议。我们把这条建议表述为一个问题，因为已有研究提示，提问式的 AI 建议既能激发高质量的想法，又能保住用户的所有权（Maier et al., 2026）。
:::

:::bi

For example, the Evidence Partner responds to a writer who has just introduced the importance of elite players’ training habits:

:::zh

例如，当一位写作者刚刚论述了顶尖运动员训练习惯的重要性时，证据伙伴会这样回应：
:::

:::bi

> *It looks like you are moving from general principles to concrete examples from elite players. How might you introduce a specific anecdote or training philosophy from a top player, such as Rafael Nadal’s relentless drills or Roger Federer’s recovery routines, to illustrate the principles you just mentioned?*

:::zh

> *看起来你正在从一般原则转向顶尖运动员的具体例子。你会怎样引入一位顶尖运动员的具体轶事或训练理念，比如 Rafael Nadal 不知疲倦的反复练习，或 Roger Federer 的恢复流程，来说明你刚刚提到的那些原则？*
:::

:::figure
![Forms of engagement with proactive suggestions. When a writer pauses after…](./images/proactive-thought-partners/fig-05.jpg)

Figure 5: *Forms of engagement with proactive suggestions.* When a writer pauses after typing (A.1), an activated partner first appears as a lightweight floating tag (A.2). If the writer ignores the tag and continues writing (B.1), it gradually fades out and disappears (B.2). If the writer clicks the tag, it expands into a suggestion card (C.1), where the writer can inspect the suggestion and optionally click the message icon (C.2) to ask follow-up questions. If the writer hovers over the suggestion card and clicks the *Help Me Write* button (D.1), the partner directly inserts or revises text in the editor (D.2), after which the writer can accept or revert the change (D.3).

:::zh
图 5：四种参与方式的时间线。A 是暂停后浮出标签，B 是继续打字，标签自己淡出，C 是点开成卡片并可以追问，D 是点 Help Me Write 后 AI 直接改写，蓝色是插入的文字，最后还可以接受或回退。重点看 A.2 到 B.2 的对比：忽略不需要任何操作，这正是作者说的“忽略是一等公民”。
:::
:::

### 参与形式（Engagement Forms）

:::bi

Once the floating tags of activated partners appear, users can choose whether and how to engage with the proactive interventions in three ways (**DG2**).

:::zh

一旦被激活伙伴的浮动标签出现，用户就可以通过三种方式选择是否以及如何参与这些主动式干预（**DG2**）。
:::

:::bi

- **Ignoring** (Fig. 2B): If writers do not need support at that moment, they can simply continue writing. The floating tag gradually fades out and disappears after 15 seconds. This allows proactive support to remain optional and low-commitment: the system can make a bid for the writer’s attention without requiring an explicit dismissal or interrupting the writing flow. This also reflects the principle of allowing efficient direct termination for mixed-initiative user interfaces (Horvitz, 1999).
- **Inspiring** (Fig. 2C): Users can click the floating tag to reveal a suggestion. The tag expands into a floating card at the same position displaying the partner’s suggestion. The suggestion serves as inspiration for the user to continue developing or refining their prose. Users can also click a message icon to engage in a follow-up conversation with the partner. This allows them to clarify the suggestion, ask for alternatives, challenge the partner’s framing, or explore related ideas before continuing.
- **Executing** (Fig. 2D): If writers decide the suggestion should be incorporated into the document, they can optionally ask the partner to execute it by inserting or revising text directly in the editor. Executing represents the deepest form of engagement in our probe: the partner moves from offering cognitive scaffolding to temporarily taking over part of the writing work, while the writer retains control by explicitly initiating the action and reviewing the resulting change before accepting it.

:::zh

- **忽略**（图 2B）：如果写作者此刻不需要支持，直接继续写就好。浮动标签会在 15 秒内逐渐淡出并消失。这让主动式支持始终保持可选，且投入成本很低：系统可以向写作者争取注意力，却无需用户明确关闭，也不会打断写作心流。这也体现了混合主动用户界面中“允许高效地直接终止”的原则（Horvitz, 1999）。
- **启发**（图 2C）：用户可以点击浮动标签来展开一条建议。标签会在同一位置扩展成一张浮动卡片，显示伙伴的建议。这条建议作为灵感，供用户继续展开或打磨自己的文字。用户还可以点击消息图标，与伙伴进行后续对话。这让他们可以澄清建议，询问替代方案，质疑伙伴给出的框架，或在继续写作之前探索相关想法。
- **执行**（图 2D）：如果写作者认为这条建议应当纳入文档，可以选择让伙伴执行建议，即直接在编辑器中插入或修改文本。执行是探针中最深层的参与形式：伙伴从提供认知脚手架转为暂时接管一部分写作工作，而写作者通过明确发起该动作并在接受前审阅改动结果来保持控制权。
:::

:::bi

Together, these three forms of engagement represent increasing levels of AI involvement. Writers can ignore a partner’s intervention, treat it as inspiration, or delegate concrete writing actions. This graduated interaction design aims to preserve writer agency while still allowing proactive partners to provide more substantive support when writers want it. At the same time, these engagement options serve a probing function: by observing whether writers ignore, open, discuss, or execute proactive suggestions, we can examine how they prefer AI to engage in their writing process.

:::zh

这三种参与形式合在一起，代表逐级加深的 AI 参与程度。写作者可以忽略伙伴的干预，把它当作灵感，或者把具体的写作动作委托给伙伴。这种渐进式的交互设计旨在保留写作者的自主性，同时仍让主动式伙伴在写作者需要时提供更实质的支持。与此同时，这些参与选项还承担一种探究功能：通过观察写作者是否会忽略主动式建议，是否会点开或讨论它，或者是否会执行它，我们可以考察他们希望 AI 以何种方式参与自己的写作过程。
:::

### 实现（Implementation）

:::bi

Our probe is implemented with Next.js (Footnote: https://nextjs.org/), which supports server-side rendering and backend API routes for calling external services, including the Google Gemini APIs (Footnote: https://ai.google.dev/gemini-api/docs) for LLM-based functions and Firebase APIs (Footnote: https://firebase.google.com/) for logging user events. The Markdown editor is built with BlockNote (Footnote: https://www.blocknotejs.org/). We also adapted BlockNote’s AI SDK integration to support partners’ text insertion and revision in the editor when invoked by users. Keystroke logging is implemented with JavaScript event listeners, following prior implementation practices from Tian et al. (2025). For the decision engine that selects which partners should intervene, we use `gemini-2.5-flash-lite` to minimize latency. In practice, the decision engine takes less than one second to select partners after an event is triggered. The partner’s floating tag appears immediately (Fig. 5) after the decision is made to reduce participants’ perceived latency, while the partner agent takes approximately eight seconds to generate a suggestion. For other LLM-based tasks, including suggestion generation, follow-up discussion, and text insertion or revision, we use `gemini-2.5-flash`. The prompts are provided in the supplementary materials.

:::zh

我们的探针用 Next.js 实现（脚注：https://nextjs.org/），它支持服务端渲染和用于调用外部服务的后端 API 路由，包括用于 LLM 功能的 Google Gemini API（脚注：https://ai.google.dev/gemini-api/docs）和用于记录用户事件的 Firebase API（脚注：https://firebase.google.com/）。Markdown 编辑器用 BlockNote 构建（脚注：https://www.blocknotejs.org/）。我们还改造了 BlockNote 的 AI SDK 集成，以便在用户调用时支持伙伴在编辑器中插入和修改文本。击键日志用 JavaScript 事件监听器实现，沿用 Tian et al. (2025) 以往的实现做法。对于决定哪些伙伴应当介入的决策引擎，我们使用 `gemini-2.5-flash-lite` 来尽量降低延迟。在实践中，事件触发后决策引擎用不到一秒就能选出伙伴。决策完成后，伙伴的浮动标签会立即出现（图 5），以减少被试感知到的延迟，而伙伴智能体生成一条建议大约需要八秒。对于其他基于 LLM 的任务，包括建议生成，后续讨论，以及文本插入或修改，我们使用 `gemini-2.5-flash`。提示词见补充材料。
:::

## 用户研究（User Study）

:::bi

We conducted a one-week technology probe study with 16 participants to explore how writers customize, experience, and engage with proactive thought partners in writing practice. It is important to note that a technology probe study is not an evaluative study of a finished product’s efficacy. Instead, it is an exploratory deployment intended to inspire new design directions and uncover how users adapt to, appropriate, and make sense of a nascent technology in practice (Kaur et al., 2020; Seymour et al., 2020; Lu et al., 2024). In this spirit, our deployment aimed to investigate the following research questions:

:::zh

我们开展了一项为期一周的技术探针研究，共 16 名被试参与，旨在探索写作者在实践中如何定制和体验主动式思考伙伴，以及如何与它们互动。需要说明的是，技术探针研究并不是对成品有效性的评估性研究。相反，它是一次探索性部署，意在启发新的设计方向，并揭示用户在实践中如何适应并挪用一项新兴技术，以及如何理解它（Kaur et al., 2020; Seymour et al., 2020; Lu et al., 2024）。本着这一精神，我们的部署旨在考察以下研究问题：
:::

:::annotation
一周探针研究不是效果评估：没有对照组，也不测写作质量。用三个 RQ 去读，比用“这个方法有没有用”去读更贴近作者的意图。
:::

:::bi

- *Partner Creation.* How do users create and configure their proactive thought partners to suit their writing needs?
- *Suggestion Engagement.* How do users engage with proactive suggestions from these partners during writing?
- *User Experience.* How do users experience this new form of customizable, proactive cognitive support for writing?

:::zh

- *伙伴创建。* 用户如何创建并配置自己的主动式思考伙伴，以贴合自身的写作需求？
- *建议互动。* 用户在写作过程中如何与这些伙伴给出的主动建议互动？
- *用户体验。* 用户如何体验这种新的可定制主动认知支持形式？
:::

:::bi

Table 1: *Participant demographics and writing activity.* This table presents participants’ ages, genders, role, whether they are native English speakers (NES), self-reported frequency of AI usage for writing prior to the study, number of completed writing sessions, and writing contexts across sessions. Writing contexts are categorized based on the taxonomy (i.e., Academic, Creative, Journalistic, Technical, Professional, Personal) proposed by Lee et al. (2024).

| ID | Gender | Age | Job Title | NES? | AI Usage | Writing Sessions and Contexts |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | Male | 45 | Software Engineer | No | Daily | Creative, Professional, Personal, Technical |
| P02 | Male | 28 | Software Engineer | No | Weekly | Academic (3), Creative |
| P03 | Female | — | Program Manager | No | Daily | Academic (2), Creative, Personal |
| P04 | Female | 44 | Program Manager | No | Daily | Academic (2), Creative, Professional |
| P05 | Female | 29 | Software Engineer | No | Weekly | Academic (2), Personal, Creative |
| P06 | Male | 37 | Customer Engineer | Yes | Daily | Technical (2), Professional (2) |
| P07 | Female | 34 | Software Engineer | No | Weekly | Personal (3), Technical |
| P08 | Female | 31 | Commercial Strategist | Yes | Weekly | Personal (3), Academic |
| P09 | Female | 38 | Content Strategist | Yes | Daily | Academic (2) Journalistic, Creative |
| P10 | Female | 29 | Software Engineer | Yes | Daily | Academic (4) |
| P11 | Female | 26 | Systems Engineer | No | Weekly | Personal (2), Professional, Journalistic |
| P12 | Male | 38 | Pricing Specialist | No | Weekly | Professional (2), Creative, Journalistic |
| P13 | Female | 42 | Program Manager | Yes | Daily | Personal (3) Creative |
| P14 | Female | 35 | Communications Manager | No | Daily | Personal (2) Academic, Technical |
| P15 | Female | 53 | Executive Operations Lead | No | Daily | Personal (2), Academic (2) |
| P16 | Male | 53 | Application Engineer | No | Daily | Technical (3), Professional (2), Personal |

:::zh

Table 1: *被试人口统计与写作活动。* 本表呈现被试的年龄，性别与职位，是否以英语为母语（NES），研究开始前自报的 AI 写作使用频率，完成的写作会话数量，以及跨会话的写作情境。写作情境依据 Lee et al. (2024) 提出的分类体系（即 Academic, Creative, Journalistic, Technical, Professional, Personal）划分。

| ID | 性别 | 年龄 | 职位 | 英语母语者？ | AI 使用频率 | 写作会话与情境 |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | 男 | 45 | Software Engineer | 否 | 每天 | Creative, Professional, Personal, Technical |
| P02 | 男 | 28 | Software Engineer | 否 | 每周 | Academic (3), Creative |
| P03 | 女 | 无 | Program Manager | 否 | 每天 | Academic (2), Creative, Personal |
| P04 | 女 | 44 | Program Manager | 否 | 每天 | Academic (2), Creative, Professional |
| P05 | 女 | 29 | Software Engineer | 否 | 每周 | Academic (2), Personal, Creative |
| P06 | 男 | 37 | Customer Engineer | 是 | 每天 | Technical (2), Professional (2) |
| P07 | 女 | 34 | Software Engineer | 否 | 每周 | Personal (3), Technical |
| P08 | 女 | 31 | Commercial Strategist | 是 | 每周 | Personal (3), Academic |
| P09 | 女 | 38 | Content Strategist | 是 | 每天 | Academic (2) Journalistic, Creative |
| P10 | 女 | 29 | Software Engineer | 是 | 每天 | Academic (4) |
| P11 | 女 | 26 | Systems Engineer | 否 | 每周 | Personal (2), Professional, Journalistic |
| P12 | 男 | 38 | Pricing Specialist | 否 | 每周 | Professional (2), Creative, Journalistic |
| P13 | 女 | 42 | Program Manager | 是 | 每天 | Personal (3) Creative |
| P14 | 女 | 35 | Communications Manager | 否 | 每天 | Personal (2) Academic, Technical |
| P15 | 女 | 53 | Executive Operations Lead | 否 | 每天 | Personal (2), Academic (2) |
| P16 | 男 | 53 | Application Engineer | 否 | 每天 | Technical (3), Professional (2), Personal |
:::

### 被试（Participants）

:::bi

We recruited 16 participants through an organizational mailing list with more than 10,000 recipients at a large global software company (Table 1). Participants ranged in age from 26 to 53 years ($M=37.47$, $SD=8.57$; one participant preferred not to disclose their age), with 11 identifying as female and 5 as male. Because the study involved open-ended writing tasks in English, we required participants to be proficient in reading and writing in English; 5 were native speakers and 11 were non-native speakers. We did not stratify recruitment by level of professional writing expertise. Instead, we sought everyday writers with regular writing practices rather than focusing exclusively on expert or novice writers. Participants therefore came from diverse professional backgrounds, including content strategy, communications, software engineering, and program management.

:::zh

我们通过一家大型全球软件公司的内部邮件列表招募了 16 名被试，该列表有超过 10,000 名收件人（表 1）。被试年龄在 26 至 53 岁之间（$M=37.47$，$SD=8.57$，其中一名被试不愿透露年龄），其中 11 名自我认同为女性，5 名为男性。由于研究涉及英语的开放式写作任务，我们要求被试具备熟练的英语读写能力。其中 5 名是英语母语者，11 名是非母语者。我们没有按专业写作专长水平分层招募，而是寻找有规律写作实践的日常写作者，并不只关注专家或新手写作者。因此，被试来自多样的职业背景，包括内容策略，传播沟通，软件工程与项目管理。
:::

:::annotation
样本边界要记牢：16 人来自同一家大型软件公司，全员有 AI 写作经验，其中 5 名是英语母语者。这决定了结论的适用范围，作者在局限一节也承认了。
:::

:::bi

To ensure that participants could meaningfully engage with and reflect on the probe, we purposively sampled individuals with prior experience using AI tools for writing. During the three months preceding the study, 10 participants reported using AI tools on a daily basis, and 6 used them weekly. Participants shared their detailed experiences with AI-assisted writing, including specific tools used and their primary writing purposes. In summary, participants used various AI tools such as ChatGPT, Gemini, Claude, and Smart Compose in Gmail. They applied these tools to a wide range of tasks, including drafting technical and professional documentation (e.g., daily reports, policy documents, research papers), managing routine correspondence, and engaging in personal or creative writing (e.g., fiction, journaling, scripts). Across these contexts, participants used AI throughout the writing process to brainstorm outlines, draft content, and iteratively edit for tone, clarity, and conciseness.

:::zh

为确保被试能够有意义地使用探针并对其展开反思，我们有目的地抽样选取了此前有 AI 工具写作经验的人。在研究开始前的三个月里，10 名被试报告每天使用 AI 工具，6 名每周使用。被试分享了自己使用 AI 辅助写作的详细经历，包括所使用的具体工具和主要的写作目的。总体而言，被试使用了多种 AI 工具，例如 ChatGPT，Gemini，Claude 以及 Gmail 中的 Smart Compose。他们将这些工具用于范围广泛的任务，包括起草技术与专业文档（例如日报，政策文件，研究论文），处理常规通信，以及进行个人化或创意写作（例如小说，日记，剧本）。在这些情境中，被试在写作全过程中使用 AI 来头脑风暴大纲，起草内容，并反复修改语气，清晰度和简洁度。
:::

### 研究流程（Procedure）

:::bi

The study consisted of three phases: an onboarding session, a week-long diary study, and a concluding semi-structured interview. Before the onboarding session, participants provided informed consent and completed a demographics questionnaire. After the study, each participant was compensated \$140 for their participation.

:::zh

研究分为三个阶段：入职引导环节，为期一周的日记研究，以及最后的一次半结构化访谈。在入职引导环节之前，被试签署知情同意书并填写人口统计问卷。研究结束后，每位被试获得 \$140 的报酬。
:::

:::bi

**Phase 1: Onboarding (60 minutes):** We conducted a remote onboarding session with each participant. Participants first received a short tutorial on the probe’s core features. To help participants become familiar with the concept of proactive thought partners, we also provided four preconfigured partners during onboarding: an *Ideation Partner*, an *Evidence Partner*, a *Rebuttal Partner*, and a *Logical Fallacy Partner*. These partners were designed around the warm-up writing task below and informed by prior work on AI-assisted argumentative writing, such as VISAR (Zhang et al., 2023). Details of these preconfigured partners, including their configurations, are provided in the supplementary materials.

:::zh

**阶段 1：入职引导（60 分钟）：** 我们与每位被试进行了一次远程入职引导。被试首先接受关于探针核心功能的简短教程。为帮助被试熟悉主动式思考伙伴这一概念，我们还在入职引导期间提供了四个预配置伙伴：一个*构思伙伴*，一个*证据伙伴*，一个*反驳伙伴*和一个*逻辑谬误伙伴*。这些伙伴围绕下文的热身写作任务设计，并参考了此前关于 AI 辅助议论文写作的研究，例如 VISAR（Zhang et al., 2023）。这些预配置伙伴的细节（包括其配置）见补充材料。
:::

:::bi

After tutorial, they completed a warm-up writing task, in which they wrote a short essay of approximately 300 words on the positive and negative aspects of AI in daily life. This task was designed to familiarize participants with the probe before the diary study. During the warm-up task, participants were asked to (1) create two custom thought partners and optionally enable or update any preconfigured partners, and (2) complete the essay with their enabled partners to observe how proactive suggestions were triggered and to practice key interaction features. After the warm-up session, we provided instructions for the diary study.

:::zh

教程结束后，被试完成了一个热身写作任务：围绕 AI 在日常生活中的正面与负面方面写一篇约 300 词的短文。该任务旨在让被试在进入日记研究前熟悉探针。在热身任务中，被试需要（1）创建两个自定义思考伙伴，并可选地启用或更新任何预配置伙伴，（2）带着已启用的伙伴完成这篇短文，以观察主动建议如何被触发，并练习关键的交互功能。热身环节结束后，我们给出了日记研究的说明。
:::

:::bi

**Phase 2: Diary Study (7 days):** Participants began using the probe the following day for seven days. To capture how participants appropriate proactive thought partners in their own writing practices, we did not constrain the genre, topic, or purpose of their writing. However, we asked participants to complete at least four substantive writing sessions during the week to ensure sufficient exposure to the probe. We defined a *substantive session* as one that met two criteria: (1) at least 20 minutes of active writing or production of at least 300 words; and (2) completion of a self-contained piece of writing, rather than randomly connected sentences or artificial text written only for the study. To mitigate privacy risks associated with system logging, we explicitly instructed participants not to enter personally identifiable information, confidential workplace information, or other highly sensitive data into the probe.

:::zh

**阶段 2：日记研究（7 天）：** 被试从次日起连续七天使用探针。为捕捉被试如何在自身写作实践中挪用主动式思考伙伴，我们没有限制写作的体裁与主题，也没有限定写作目的。不过，我们要求被试在这一周内至少完成四次实质性写作会话，以确保对探针有足够的接触。我们将*实质性会话*定义为满足两个标准的会话：（1）至少 20 分钟的活跃写作，或至少 300 词的产出，（2）完成一篇完整的写作作品，而不是随机连接的句子或仅为研究而写的人造文本。为降低系统日志带来的隐私风险，我们明确指示被试不要在探针中输入可识别个人身份的信息，工作场所机密信息或其他高度敏感的数据。
:::

:::bi

During deployment, the probe collected interaction logs, including partner configurations, keystroke logs, and user interactions with proactive suggestions. For each proactive intervention they received, participants could optionally provide binary feedback by clicking a thumbs-up or thumbs-down icon (Fig. 2B). In addition, participants submitted a structured diary entry at the end of each writing session. The diary included three 10-point scales measuring satisfaction, perceived timeliness, and perceived helpfulness of the proactive support, as well as four open-ended prompts asking about (1) the partners they configured and why, (2) the proactive support they received and their feedback on it, (3) challenges encountered while using the probe, and (4) any other observations. Together, these data sources allowed us to triangulate automated system logs, immediate feedback on individual interventions, and longer-form reflections on each writing session.

:::zh

在部署期间，探针收集交互日志，包括伙伴配置，击键日志，以及用户与主动建议的交互。对于收到的每一次主动干预，被试可以选择通过点击点赞或点踩图标提供二元反馈（图 2B）。此外，被试在每次写作会话结束时提交结构化日记。日记包含三个 10 点量表，分别测量对主动支持的满意度，感知及时性和感知有用性，以及四个开放式问题，询问（1）他们配置了哪些伙伴以及为什么，（2）他们收到的主动支持及其反馈，（3）使用探针时遇到的挑战，（4）任何其他观察。这些数据来源合在一起，使我们能够对自动系统日志，对单次干预的即时反馈，以及针对每次写作会话的较长篇幅反思进行三角互证。
:::

:::bi

**Phase 3: Semi-Structured Interview (60 minutes):** In the final phase, participants first completed the short-form Usability Metric for User Experience (UMUX-LITE) (Lewis et al., 2013). We then conducted a semi-structured interview to probe participants’ week-long experiences and elicit their visions for future proactive thought partners for writing. We began by asking participants to describe their general experience using the probe during the week. We then asked them to compare the proactive AI features in our probe with their experiences using reactive AI chatbots, such as ChatGPT or Gemini, and proactive next-phrase suggestions, such as Smart Compose in Gmail (Chen et al., 2019). Next, we used diary entries, binary feedback logs, and system logs as elicitation artifacts, asking participants to elaborate on their strategies for configuring thought partners, specific instances in which proactive suggestions were helpful or intrusive, and their rationales for how they chose to engage with the proactive support they received. We also explored perceived benefits and challenges of working with proactive thought partners, as well as participants’ perceived ownership and agency during the writing process. Building on these reflections, we shifted the discussion beyond the current prototype’s constraints and asked participants to articulate their ideal future proactive writing assistants. The interview protocol is provided in the supplementary materials.

:::zh

**阶段 3：半结构化访谈（60 分钟）：** 在最后阶段，被试首先完成简版用户体验可用性指标（UMUX-LITE）（Lewis et al., 2013）。随后我们进行半结构化访谈，探查被试一周以来的体验，并引出他们对未来写作主动式思考伙伴的设想。我们首先请被试描述这一周使用探针的总体体验。接着请他们将探针中的主动式 AI 功能与自身使用反应式 AI 聊天机器人（例如 ChatGPT 或 Gemini）以及主动式下一句建议（例如 Gmail 中的 Smart Compose）（Chen et al., 2019）的经历进行比较。接下来，我们以日记和二元反馈日志，还有系统日志作为引出材料，请被试详述其配置思考伙伴的策略，主动建议有帮助或造成打扰的具体实例，以及他们选择如何参与所收到主动支持的理由。我们还探讨了与主动式思考伙伴合作时感知到的益处与挑战，以及被试在写作过程中的所有权与能动性。在这些反思的基础上，我们把讨论延伸到当前原型的局限之外，请被试阐述他们理想中的未来主动式写作助手。访谈提纲见补充材料。
:::

### 分析方法（Analysis）

:::bi

We analyzed multiple sources of qualitative and quantitative data, including partner configurations, interaction logs, diary entries, and semi-structured interview transcripts. The interaction logs were used to characterize participants’ partner creation behaviors and engagement with proactive interventions, while diary entries and interviews provided insight into participants’ rationales, experiences, and perceptions. Two researchers conducted a thematic analysis of the qualitative data (Braun and Clarke, 2013). They reviewed the interview transcripts and diary entries to identify recurring concepts, then met to compare, discuss, and consolidate the codes into a codebook. The researchers then collaboratively grouped related codes into higher-level themes that addressed our research questions through multiple rounds of discussion. Throughout the analysis, interaction logs and quantitative usage metrics were used to triangulate and contextualize the qualitative findings.

:::zh

我们分析了多来源的定性与定量数据，包括伙伴配置，交互日志，日记条目和半结构化访谈转录稿。交互日志用于刻画被试的伙伴创建行为及其对主动干预的参与，日记和访谈则揭示了被试的理由，体验和感知。两位研究者对定性数据进行了主题分析（Braun and Clarke, 2013）。他们审阅访谈转录稿和日记，识别反复出现的概念，然后会面比较和讨论，并将编码整合成一份编码手册。随后，研究者通过多轮讨论，协作地将相关编码归入更高层级的主题，以回应我们的研究问题。在整个分析过程中，交互日志和定量使用指标被用来对定性发现进行三角互证和情境化。
:::

## 研究发现（Findings）

:::bi

In this section, we present findings related to our research questions. We first provide an overview of participants’ use of the probe during the one-week deployment and their perceptions of its usability. We then examine how participants created proactive thought partners to anticipate writing needs (RQ1), how they engaged with proactive suggestions during writing (RQ2), and how they perceived the customized, proactive cognitive support (RQ3).

:::zh

本节呈现与研究问题相关的发现。我们首先概述被试在这为期一周的部署中对探针的使用情况及其对可用性的感知。接着考察被试如何创建主动式思考伙伴以预判写作需求（RQ1），如何在写作过程中与主动建议互动（RQ2），以及如何感知这种可定制的主动认知支持（RQ3）。
:::

:::annotation
Findings 用 KF1 到 KF10 编号，每个 KF 是一个具体发现，每个 RQ 末尾的 Takeaway 是把若干 KF 汇总成一句话，不是新的实证结果。
:::

### 探针使用情况与可用性（Probe Usage and Usability）

:::bi

Across the 16 participants, we collected 66 writing sessions, excluding onboarding sessions. Participants completed an average of 4.13 ($SD=0.50$) sessions each. Each session produced an average of 390.34 ($SD=151.41$) words and lasted an average of 17.09 ($SD=7.47$) minutes. Participants used the probe for a wide range of writing contexts. Based on the taxonomy from Lee et al. (2024), these sessions included personal writing ($N=19$), academic writing ($N=19$), professional writing ($N=9$), creative writing ($N=8$), technical writing ($N=8$), and journalistic writing ($N=3$). The writing sessions completed by each participant are summarized in Table 1.

:::zh

在 16 名被试中，我们共收集到 66 次写作会话，不含入职引导环节。被试平均每人完成 4.13 次会话（$SD=0.50$）。每次会话平均产出 390.34 词（$SD=151.41$），平均持续 17.09 分钟（$SD=7.47$）。被试将探针用于范围广泛的写作情境。依据 Lee et al. (2024) 的分类体系，这些会话包括个人写作（$N=19$），学术写作（$N=19$），专业写作（$N=9$），创意写作（$N=8$），技术写作（$N=8$）和新闻写作（$N=3$）。每位被试完成的写作会话汇总于表 1。
:::

:::bi

The System Usability Scale (SUS) scores calculated from UMUX-LITE collected during the exit interviews averaged 82.81 ($SD=11.97$). This score corresponds to the “Excellent” category defined by Bangor et al. (2009); Bangor et al. (2008), placing it in approximately the 90th-95th percentile. This is consistent with daily survey measures of overall satisfaction, which averaged 8.16/10 ($SD=1.76$). A linear mixed-effects model with participant as a random effect showed that satisfaction increased significantly with session index ($b=0.33$, $SE=0.16$, $p=.036$), indicating that participants became progressively more satisfied with the probe as they gained experience over the course of the deployment.

:::zh

根据结束访谈中收集的 UMUX-LITE 计算出的系统可用性量表（SUS）得分平均为 82.81（$SD=11.97$）。该得分对应 Bangor et al. (2009); Bangor et al. (2008) 定义的“Excellent”等级，约处于第 90 到 95 百分位。这与每日调查得到的总体满意度测量一致，其平均分为 8.16/10（$SD=1.76$）。以被试为随机效应的线性混合效应模型显示，满意度随会话序号显著上升（$b=0.33$，$SE=0.16$，$p=.036$），表明随着部署期间经验的积累，被试对探针越来越满意。
:::

:::annotation
SUS 82.81 属于“优秀”档，但这是探针本身的可用性评分，不是主动性设计带来的效果。同一段里 90 到 95 百分位的说法也要按这个口径理解。
:::

### RQ1：伙伴创建（RQ1: Partner Creation）

:::bi

Participants created 54 partners, with an average of 3.38 ($SD=1.96$) partners created per participant. Among these, 35 (64.81%) were enabled in only one writing session, while 19 (35.19%) were used across multiple sessions. Table 2 shows examples of these partners. We next examine the overarching strategies participants used to create partners (**KF1**), the types of roles these partners took on (**KF2**), and how participants configured their partners’ proactivity (**KF3**).

:::zh

被试共创建了 54 个伙伴，平均每人创建 3.38 个（$SD=1.96$）。其中，35 个（64.81%）只在一次写作会话中被启用，19 个（35.19%）跨多次会话使用。表 2 展示了这些伙伴的示例。接下来我们考察被试创建伙伴时使用的总体策略（**KF1**），这些伙伴承担的角色类型（**KF2**），以及被试如何配置伙伴的主动性（**KF3**）。
:::

:::annotation
平均每人配置 3.38 个伙伴，但 35 个伙伴只被用了一次。这个数字说明前瞻性规划往往配不准，可有意思的是被试仍然愿意先配置再写，这个张力在 7.1 节展开。
:::

:::bi

**KF1: Creating partners by anticipating writing needs:** Participants configured partners prospectively, reasoning about what cognitive support they would need before writing began. This took two forms. In **goal-driven design**, participants started from a mental image of the finished piece and worked backward to infer the expertise it required. P04 described the approach directly: “*I try to envision what the end product would look like and then, if I had a human writer, I imagine what that person’s expertise should be.*” In **difficulty-driven design**, participants instead began from self-knowledge of their own recurring writing difficulties and designed partners to preemptively address those gaps. P13 articulated this explicitly: “*I knew myself well enough to know what potential blockers I would have towards reaching that goal… where I anticipated myself struggling.*” Both strategies required participants to mentally simulate the writing task before it began: either from the perspective of the intended output or from the perspective of their own likely difficulties.

:::zh

**KF1：通过预判写作需求来创建伙伴：** 被试以前瞻性的方式配置伙伴，在写作开始之前推想自己需要何种认知支持。这有两种形式。在**目标驱动设计**中，被试从对成品的心理意象出发，反向推断它需要什么专长。P04 直接描述了这一做法：“*我会试着设想最终成品会是什么样，然后，如果我有一位人类写作者，我会想象那个人的专长应该是什么。*”在**困难驱动设计**中，被试则从对自身反复出现的写作困难的自我认知出发，设计伙伴来预先填补这些缺口。P13 明确阐述了这一点：“*我很了解自己，知道自己朝着那个目标可能会遇到哪些阻碍……也预想到自己会在哪里卡住。*”两种策略都要求被试在写作开始前对写作任务进行心理模拟：要么从预期产出的视角出发，要么从自身可能遇到的困难的视角出发。
:::

:::bi

Table 2: *Examples of proactive thought partners created by participants.* The examples illustrate variation in partner roles and contextual heuristics, as well as participants’ frequent use of all three event triggers. Triggers are abbreviated as P = Long Pause, E = Sentence End, and S = Text Selection.

| Partners | Roles | Triggers | Heuristics |
| --- | --- | --- | --- |
| Research Partner | [Information Seeking] Provide examples of similar research topics and findings to augment my essay. | P / E / S | [Writing-Activity & Anticipated-Need] When I’m trying to quote examples and trying to back it up with broader facts. |
| India Partner | [Information Seeking] Bring up India-centric market scenarios that drive pricing, including behavior of the Indian customer across industries. | P / E / S | [Draft-State & Writing-Activity] When I talk about India as a country and drill down into specific scenarios. |
| Internal Monologue Partner | [Ideation Support] Provides quotes for what could be running through a character’s head at certain moments within the story. | P / E / S | [Anticipated-Need] When it would be helpful to know what the protagonist is thinking. |
| Ethical partner | [Critical Reflection] You’re a senior ethical program manager. Defend the ethical boundaries of ideas without losing sights of values. | P / E / S | [Draft-State] When there are cases of challenging ethical issues when using AI. |
| Synthesis Partner | [Argument Development] Help integrate positive and negative arguments into a coherent conclusion. | P / E / S | [Draft-State & Writing-Activity & Anticipated-Need] When I have presented both sides of the argument, or will soon need to unify my points. |
| Corporate Speak Partner | [Textual Assistance] Up-level the language to make it more professional and integrate business speak. | E | [Draft-State] When my language is too casual and does not reference business talk. |

:::zh

Table 2: *被试创建的主动式思考伙伴示例。* 这些示例展示了伙伴角色与情境启发规则上的差异，以及被试对全部三种事件触发的频繁使用。触发方式缩写为 P = 长停顿（Long Pause），E = 句末（Sentence End），S = 选中文本（Text Selection）。

| 伙伴 | 角色 | 触发 | 情境启发规则 |
| --- | --- | --- | --- |
| 研究伙伴 | [Information Seeking] 提供相似研究主题与发现的示例，以充实我的文章。 | P / E / S | [Writing-Activity & Anticipated-Need] 当我想引用示例，并试图用更广泛的事实来佐证时。 |
| 印度伙伴 | [Information Seeking] 引出以印度为中心并影响定价的市场情境，包括印度客户在各行业中的行为。 | P / E / S | [Draft-State & Writing-Activity] 当我谈到印度这个国家，并深入具体情境时。 |
| 内心独白伙伴 | [Ideation Support] 为故事中某些时刻角色脑中可能闪过的想法提供引语。 | P / E / S | [Anticipated-Need] 当知道主角在想什么会有帮助时。 |
| 伦理伙伴 | [Critical Reflection] 你是一位资深伦理项目经理。在不忽视价值观的前提下捍卫想法的伦理边界。 | P / E / S | [Draft-State] 当使用 AI 时出现具有挑战性的伦理问题的情况下。 |
| 综合伙伴 | [Argument Development] 帮助将正面与反面的论点整合为连贯的结论。 | P / E / S | [Draft-State & Writing-Activity & Anticipated-Need] 当我已呈现论点的双方，或即将需要统一我的观点时。 |
| 商务话术伙伴 | [Textual Assistance] 提升语言层次，使其更专业，并融入商务表达。 | E | [Draft-State] 当我的语言过于随意，且没有引用商务表达时。 |
:::

:::bi

**KF2: Partner roles clustered around distinct forms of cognitive support:** Participants configured 43 of 54 partners (79.63%) for higher-level cognitive support and 11 (20.37%) for local **textual assistance** such as language and style refinement. This pattern aligns with our expectation that proactive thought partners would primarily support cognitive activities beyond phrasing and text production. Specifically, 14 partners (25.93%) focused on seeking evidence or domain knowledge (**information seeking**), 12 (22.22%) on argument development and reasoning (**argument development**), 10 (18.52%) on perspective-taking and critical reflection (**critical reflection**), and 7 (12.96%) on ideation and creative development (**ideation support**). These roles show that participants envisioned proactive partners as specialized sources of knowledge, reasoning support, reflective scaffolds, alternative perspectives, and inspiration that could assist different forms of cognitive work during writing.

:::zh

**KF2：伙伴角色集中在若干不同的认知支持形式上：** 被试将 54 个伙伴中的 43 个（79.63%）配置为提供更高层次的认知支持，将 11 个（20.37%）用于局部的**文本层面的辅助**，例如语言与风格润色。这一模式符合我们的预期，即主动式思考伙伴主要支持措辞与文本生产之外的认知活动。具体而言，14 个伙伴（25.93%）聚焦于寻求证据或领域知识（**信息寻求**），12 个（22.22%）聚焦于论证发展与推理（**论证发展**），10 个（18.52%）聚焦于换位思考与批判性反思（**批判性反思**），7 个（12.96%）聚焦于构思与创意发展（**构思支持**）。这些角色表明，被试把主动式伙伴设想为专门化的知识来源，推理支持，反思支架，替代视角与灵感来源，它们能够在写作过程中协助不同形式的认知工作。
:::

:::bi

**KF3: Partner proactivity is configured through broad event triggers and context-specific heuristics.:** We then analyzed how participants configured event triggers and contextual heuristics to control partners’ proactivity. We found that event triggers were generally configured broadly: 31 of 54 partners (57.41%) were enabled with all three triggers. Specifically, **pauses** were enabled for 40 of 54 partners (74.07%), **sentence endings** for 40 partners (74.07%), and **text selections** for 44 partners (81.48%). In contrast, participants used contextual heuristics to specify more particular writing situations in which a partner’s support would be relevant. We identified three recurring forms of contextual cues. First, **draft-state cues** described what was currently present in the text, such as language being too casual, an argument presenting only one perspective, or the writing becoming repetitive or boring 35/54 (64.81%). Second, **writing-activity cues** described what the writer was currently doing in the writing process, such as introducing a concept, developing a claim, analyzing an issue, or moving from listing arguments toward a conclusion 38/54 (70.37%). Third, **anticipated-need cues** described the support the writer might need at that moment or next, such as an example, another perspective, clarification of a concept, or a stronger argument 36/54 (66.67%). Together, these patterns suggest a division of labor between the two timing mechanisms: event triggers specified *when the system should look*, while contextual heuristics specified *what it should look for* when determining whether and which partner should intervene. Participants viewed interaction events as broader opportunities for support, while whether support was actually needed depended on how those events were interpreted in relation to the writer’s evolving state and goals.

:::zh

**KF3：伙伴的主动性通过宽泛的事件触发与针对具体情境的启发规则来配置：** 随后我们分析了被试如何配置事件触发与情境启发规则来控制伙伴的主动性。我们发现，事件触发通常配置得比较宽泛：54 个伙伴中有 31 个（57.41%）启用了全部三种触发。具体而言，54 个伙伴中有 40 个（74.07%）启用了**停顿**，40 个（74.07%）启用了**句末**，44 个（81.48%）启用了**选中文本**。相比之下，被试使用情境启发规则来指定更具体的写作情境，以判断伙伴的支持在何时才具有相关性。我们识别出三种反复出现的情境线索形式。第一，**草稿状态线索**描述文本中当前已存在的内容，例如语言过于随意，论点只呈现了一种视角，或写作变得重复乏味，共 35/54 个（64.81%）。第二，**写作活动线索**描述写作者当前在写作过程中的活动，例如引入一个概念，发展一个主张，分析一个问题，或从罗列论点转向形成结论，共 38/54 个（70.37%）。第三，**预期需求线索**描述写作者此刻或接下来可能需要的支持，例如一个示例，另一种视角，对某个概念的澄清，或更有力的论证，共 36/54 个（66.67%）。综合来看，这些模式表明两种时机机制之间存在分工：事件触发规定了*系统应该在何时查看*，而情境启发规则规定了在判断是否需要以及由哪个伙伴介入时，*系统应该查找什么*。被试把交互事件视为更宽泛的支持机会，而支持是否真的必要，取决于这些事件如何结合写作者不断演变的状态与目标来解读。
:::

:::bi

> **RQ1 Takeaway**
>
> Participants configured proactive thought partners through a form of prospective planning. They anticipated the goals and difficulties of an upcoming writing task, translated these expectations into specialized partner roles, and specified when those roles might become relevant. While event triggers were configured broadly as candidate moments for intervention, contextual heuristics encoded more specific expectations about the evolving draft, current writing activity, and anticipated support needs.

:::zh

> **RQ1 要点**
>
> 被试通过一种前瞻性规划来配置主动式思考伙伴。他们预判即将到来的写作任务的目标和困难，把这些预期转化为专门的伙伴角色，并规定这些角色在什么时候可能变得相关。虽然事件触发被宽泛地配置为干预的候选时机，但情境启发规则编码了关于演变中的草稿，当前写作活动，以及预期支持需求的更具体预期。
:::

### RQ2：建议互动（RQ2: Suggestion Engagement）

:::bi

The probe provided 1,100 proactive interventions across all participants and their writing sessions (Table 3). Among these, participants opened 41.73% of the surfaced interventions (459/1,100). Below, we first present our findings on how participants leveraged proactive suggestions in their writing process (KF4). We then examine why they ignored many surfaced interventions (KF5) and why, in some cases, they asked the AI to take over and execute edits directly in the document (KF6).

:::zh

技术探针在被试的全部写作会话中一共提供了 1,100 次主动干预（表 3）。其中，被试打开了 41.73% 的已呈现干预（459/1,100）。下面我们首先给出关于被试如何在写作过程中利用主动建议的发现（KF4）。接着我们考察他们为什么忽略了许多已呈现的干预（KF5），以及在有些情况下为什么请 AI 接管，直接在文档中执行修改（KF6）。
:::

:::annotation
1,100 次干预里 58.27% 被忽略，不要把这个数读成失败。作者的主张正好相反：忽略是写作者保持写作心流的正常反应，系统应该让它毫不费力。
:::

:::bi

Table 3: *Distribution of engagement forms across trigger events.* Each row describes interventions surfaced by a trigger event and how participants engaged with them: whether they ignored the intervention, used it as inspiration, or asked the partner to execute follow-up changes. Because Executing required first opening the suggestion, Executing cases are coded only under Executing rather than double-counted under Inspiring. Percentages are calculated within each row.

| Trigger Events | Ignoring (n) | Ignoring (%) | Inspiring (n) | Inspiring (%) | Executing (n) | Executing (%) | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pause | 425 | (64.39%) | 155 | (23.48%) | 80 | (12.12%) | 660 |
| Sentence | 165 | (55.93%) | 45 | (15.25%) | 85 | (28.81%) | 295 |
| Selection | 51 | (35.17%) | 15 | (10.34%) | 79 | (54.48%) | 145 |
| Total | 641 | (58.27%) | 215 | (19.55%) | 244 | (22.18%) | 1,100 |

:::zh

Table 3: *各事件触发下参与形式的分布。* 每一行描述由某一事件触发而呈现的干预，以及被试如何参与这些干预：他们忽略干预，把它当作启发，还是请伙伴执行后续修改。由于执行需要先打开建议，执行类案例只归入执行，而不会在启发下重复计数。百分比按行计算。

| 事件触发 | 忽略（n） | 忽略（%） | 启发（n） | 启发（%） | 执行（n） | 执行（%） | 合计 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 长停顿 | 425 | (64.39%) | 155 | (23.48%) | 80 | (12.12%) | 660 |
| 句末 | 165 | (55.93%) | 45 | (15.25%) | 85 | (28.81%) | 295 |
| 选中文本 | 51 | (35.17%) | 15 | (10.34%) | 79 | (54.48%) | 145 |
| 合计 | 641 | (58.27%) | 215 | (19.55%) | 244 | (22.18%) | 1,100 |
:::

:::annotation
按行读表 3 的百分比：停顿之后最常被忽略（64.39%），选中文本之后最常被执行（54.48%）。同样是“主动出手”，事件类型本身已经透露了意图的强弱。
:::

:::bi

**KF4: Suggestions supported both idea generation and self-monitoring:** Participants described using proactive suggestions primarily in two ways. First, suggestions were generative: they introduced ideas, connections, or directions that writers had not reached on their own. The most memorable cases involved unexpected connections that extended participants’ thinking. P12 described a suggestion linking Buddhist and Abrahamic religious concepts as “*an eye opener I hadn’t thought about it*,” while P01 recalled a suggestion connecting database behavior to memory leak debugging: “*I never related the database to memory leak…it just gave me some suggestion and then you know it became like a kind of my idea right.*”

:::zh

**KF4：建议同时支持了想法生成和自我监控：** 被试描述了使用主动建议的两种主要方式。第一，建议具有生成性：它们引入了新的想法，建立了新的联系，或指向了新的方向，而这些是写作者自己未曾想到的。最令人印象深刻的案例是那些拓展了被试思考的意外联系。P12 把一条将佛教与亚伯拉罕系宗教概念联系起来的建议描述为“*一个我从未想到的启发*”，P01 则回忆起一条把数据库行为与内存泄漏调试联系起来的建议：“*我从来没把数据库和内存泄漏联系起来……它只是给了我一些建议，然后你知道，它就变成了有点像我的想法，对吧。*”
:::

:::bi

Second, suggestions were regulatory: they helped writers assess whether their writing remained aligned with their goals and arguments. P13 valued prompts that surfaced when they were “*veering off track*,” and prompting them to reflect on whether their goal had changed. Others valued suggestions that surfaced gaps or neglected perspectives. For P06, even a simple prompt such as “*have you thought about it*” was useful because it prevented them from missing a potentially important point. Similarly, P04 found that the partner helped reveal when they were “*leaning on just one side of the coin*” rather than considering another point of view.

:::zh

第二，建议具有调节性：它们帮助写作者评估自己的写作是否仍然与目标和论点保持一致。P13 看重那些在自己“*偏离轨道*”时出现的提示，以及促使自己反思目标是否改变的提示。其他人看重的是能暴露空白或揭示被忽视视角的建议。对 P06 来说，哪怕只是“*你有没有想过这一点*”这样简单的提示也有用，因为它能让自己不错过一个可能重要的点。P04 同样发现，伙伴能帮助自己察觉什么时候“*只看到硬币的一面*”，而没有考虑另一种视角。
:::

:::bi

**KF5: Ignoring preserved writing flow and occurred more often after pauses:** Across all surfaced interventions (Table 3), the most common response was to ignore the displayed tag and continue writing without clicking to view the suggestion, accounting for 58.27% of interventions (641/1,100). Participants described keep typing as a natural, low-cost behavior to dismiss the interventions. When users already knew what to write next, they simply ignored the appeared interventions. As P13 noted, “*There are times I did not click on the little bubble thing and I was like, ‘No, I’m good.’*” P05 similarly characterized ignoring as part of the natural interaction rhythm: “*if I have time I will read it, or if I think I need it I will read it, and then it just helps in a more organic way.*” Interventions surfaced after a pause were especially likely to be ignored (64.39%), which echos the inherent ambiguity of event triggers: a pause in typing can signal genuine cognitive need, but equally indicates focused concentration (P01).

:::zh

**KF5：忽略保全了写作心流，且在长停顿之后更常出现：** 在所有已呈现的干预中（表 3），最常见的反应是忽略显示出来的浮动标签，继续写作而不点击查看建议，这类反应占干预总数的 58.27%（641/1,100）。被试把继续打字描述为一种自然且低成本的打发干预的方式。当用户已经知道接下来要写什么时，他们就干脆忽略出现的干预。正如 P13 所说：“*有时候我没有点那个小气泡，我心里想的是‘不用了，我挺好’。*” P05 同样把忽略描述为自然交互节奏的一部分：“*如果我有时间就会看，或者如果我觉得自己需要就会看，然后它就以一种更有机的方式帮上了忙。*” 在长停顿之后呈现的干预尤其容易被忽略（64.39%），这也呼应了事件触发固有的模糊性：打字中的停顿既可能表示真实的认知需求，也同样可能表示专注的投入（P01）。
:::

:::bi

**KF6: Executing was selective and depended on readiness to externalize text:** Executing represented a more committed form of engagement and accounted for 22.18% of interventions (244/1,100), with 84.43% (206/244) of the generated text accepted. Interventions triggered by text selection were more likely to lead to executing (54.48%) than those triggered by a pause (20.61%) or sentence end (28.81%). Participants described letting the AI to write for them in three situations. First, they sometimes used it out of curiosity, as a low-stakes way to preview how the AI might develop a direction before deciding whether to write it themselves (P03). Second, when they already knew what they wanted to say but struggled to phrase it, execution helped translate a clear intention into fluent text (P04, P11, P12). Third, after an idea had been sufficiently developed through a short back-and-forth with a partner, execution could become the natural final step of the interaction (P11).

:::zh

**KF6：执行是有选择的，取决于是否准备好把文本外化：** 执行代表了一种更投入的参与形式，占干预的 22.18%（244/1,100），其中 84.43%（206/244）的生成文本被接受。由选中文本触发的干预比由长停顿（20.61%）或句末（28.81%）触发的干预更可能走向执行（54.48%）。被试描述了三种让 AI 代写的情形。第一，他们有时出于好奇使用它，把它当作一种低风险的预览方式，先看看 AI 会如何展开一个方向，再决定要不要自己写（P03）。第二，当他们已经知道自己想说什么，却难以措辞时，执行有助于把清晰的意图转化为流畅的文本（P04, P11, P12）。第三，当一个想法在与伙伴的一小段来回交流中得到了充分展开后，执行就可能成为这次交互自然而然的最后一步（P11）。
:::

:::annotation
这里有一个值得留意的数字出入：正文说停顿触发的执行率是 20.61%，表 3 里同一格是 12.12%（80/660）。两处都按原文照录，没有改。想复算就以表 3 为准，正文的 20.61% 原文没有交代分母。
:::

:::bi

Participants’ willingness to have the AI write for them also depended on the partner’s role and the type of suggestion. For ideation-oriented partners, executing could serve as a useful shortcut once the content or direction was sufficiently settled (P06, P11). In contrast, participants were more hesitant to generate text from partners intended to provoke reflection, such as bias or rebuttal partners. P06 explained that when “*just testing an idea… I’m not like rewriting anything, I’m just saying do I really need this kind of stuff? So that is where I don’t really need help me write,*” while P10 avoided execution when further development would “*deviate us too much from what… we just want one nudge and move on from there.*” Several participants further cautioned that making the AI write for users available for every suggestion could encourage over-reliance and prematurely narrow the directions they might otherwise explore (P03, P05, P11). For example, P05 deliberately avoided generating text when he instead wanted to “*guide it to write deeper*” through further suggestions. He also argued that *not* always offering the button could be beneficial because otherwise “*we are prone to just maybe always click it and actually it would limit the creativity… the human part of it.*”

:::zh

被试让 AI 代写的意愿还取决于伙伴的角色和建议的类型。对于面向构思的伙伴，一旦内容或方向足够确定，执行可以充当一条有用的捷径（P06, P11）。相比之下，对于那些旨在引发反思的伙伴，例如偏见或反驳类伙伴，被试在让它生成文本时更为犹豫。P06 解释说，当自己“*只是在测试一个想法……我并没有在重写任何东西，我只是在说我真的需要这种东西吗？所以这种时候我并不太需要它帮我写*”时，就不太会请 AI 代写，而 P10 在继续展开会“*让我们偏离……我们只是想要一次推动，然后就继续往下走*”时避免执行。还有几位被试提醒说，如果每个建议都提供“让 AI 代写”的选项，可能会助长过度依赖，并过早收窄他们本来可能探索的方向（P03, P05, P11）。例如，当 P05 想通过更多的建议“*引导它写得更深入*”时，他会刻意避免生成文本。他还认为，*不*总是提供这个按钮可能是有益的，因为否则“*我们很容易就会一直点它，而实际上这会限制创造力……限制其中属于人的那部分。*”
:::

:::bi

> **RQ2 Takeaway**
>
> Participants engaged with proactive suggestions through graduated levels of attention and control. Ignoring was the most common response and used to preserve writing flow, especially after pauses. When support was needed, writers opened suggestions and treated them as prompts for idea generation and self-monitoring. Executing represented a more committed form of engagement and was most appropriate when writers had a clear direction or sufficiently developed idea to externalize, particularly after selecting text as a specific target for support; participants were more hesitant to let the AI execute suggestions intended primarily to provoke reflection.

:::zh

> **RQ2 要点**
>
> 被试以渐进投入的注意力与控制来参与主动建议。忽略是最常见的反应，用来保全写作心流，尤其是在长停顿之后。当需要支持时，写作者会打开建议，把它们当作想法生成和自我监控的提示。执行是一种更投入的参与形式，最适合写作者有明确方向或足够成熟的想法可以外化时使用，尤其是在把文本选为具体支持对象之后。而对于主要意在激发反思的建议，被试更不愿意让 AI 执行。
:::

### RQ3：用户体验（RQ3: User Experience）

:::bi

Participants’ overall impressions of this new form of customizable, proactive cognitive support were positive. In the daily diary surveys, participants gave an average rating of 8.11/10 ($SD=1.87$) for helpfulness and 7.85/10 ($SD=1.86$) for timeliness. We next present interview findings on how participants perceived system initiative (KF7), how they thought proactive cognitive support should be timed (KF8), and how they perceived the visual (KF9) and rhetorical (KF10) representations of proactive support.

:::zh

被试对这种新的可定制主动认知支持形式的总体印象是正面的。在每日日记调查中，被试对有用性的平均评分为 8.11/10（$SD=1.87$），对及时性的平均评分为 7.85/10（$SD=1.86$）。接下来我们呈现访谈发现：被试如何感知系统主动性（KF7），他们认为主动认知支持应当如何把握时机（KF8），以及他们如何感知主动支持在视觉（KF9）与修辞（KF10）上的呈现。
:::

:::bi

**KF7: Proactivity shifted support from pulling to pushing:** Participants contrasted proactive support with conventional chatbot interactions. Interacting with chatbots required writers to leave composition, formulate a prompt, wait for a response, and then re-enter the writing task; this was especially difficult when writers did not yet know what help to request. As P08 put it, “*sometimes it’s like I don’t even know what question to ask*.” P15 described chatbot interaction as a fragmented “*spot*” experience: “*working with Gemini, it’s kind of here’s a spot, there’s a spot, there’s a spot*.” Proactive support, by contrast, felt more continuous because partners could surface help from within the writing context; P15 described it as “*a kind of flow and then it’s a little bit like waves*.” This shift came from the context-aware “push mechanism” afforded by proactivity: as P10 explained, “*it’s a push mechanism rather than a pull mechanism… I don’t need to again click and put the information in a different thing and ask. It’s sort of automated on what I want to ask since it’s a partner.*”

:::zh

**KF7：主动性把支持从拉取变成了推送：** 被试把主动支持与常规聊天机器人交互做了对比。与聊天机器人交互要求写作者离开写作，组织一条提示，等待回应，然后再回到写作任务中，当写作者还不知道该请求什么帮助时，这一点尤其困难。正如 P08 所说：“*有时候我甚至不知道自己该问什么问题*。” P15 把聊天机器人交互描述为碎片化的“*点*”式体验：“*用 Gemini 的时候，感觉就是一个点在这里，一个点在那里，又一个点在那里*。” 相比之下，主动支持感觉更连续，因为伙伴可以从写作情境内部呈现帮助，P15 把它描述为“*一种流动，然后有点像波浪*”。这种转变来自主动性带来的具备情境感知的“推送机制”：正如 P10 所解释的，“*这是一种推送机制而不是拉取机制……我不需要再次点击，把信息放进另一个东西里再提问。既然它是伙伴，我要问什么在某种程度上就已经自动完成了。*”
:::

:::bi

**KF8: Good timing depended on contextual alignment with writers’ momentary intentions:** Participants define a good timing as whether the assistance matched what they were trying to do at that particular moment. They did not judge timing by whether a suggestion appeared after the “right” interaction event but more by the alignment with their defined contextual heuristics. The same observable event could correspond to different writing states and intentions. For example, a pause could reflect being stuck and needing help, but it could also reflect developing an idea or thinking through what to write next. P16 described a well-timed intervention as appearing when they were thinking “*this time I need a help*,” while P12 described pauses caused by “*brain fade or writer’s block mid-sentence*” as moments when a partner could help carry a thought forward. Similarly, P06 distinguished sentence endings as just textual boundaries and as moments when “*I wrote a sentence, I’m done with that, now I want to move on to the next one*.” Poor timing occurred when this alignment broke down, for example when the support did not match what the writer currently needed or when a relevant partner remain silent when they should appear. P13 recalled one such missed opportunity: “*Oh, come on. That was a good time for one to like pop in.*”

:::zh

**KF8：好的时机取决于与写作者当下意图的情境对齐：** 被试把好的时机定义为帮助是否与他们在那个特定时刻想做的事相匹配。他们判断时机时，看的不是建议是否出现在“正确”的交互事件之后，而更多是看它是否与自己定义的情境启发规则对齐。同一个可观察事件可能对应不同的写作状态和意图。例如，一次停顿可能反映卡住了需要帮助，也可能反映正在展开一个想法，或是在思考接下来写什么。P16 把时机恰当的干预描述为在自己想着“*这一次我需要帮助*”时出现，而 P12 把由“*脑子一片空白或者句子写到一半卡住*”引起的停顿描述为伙伴可以帮助把一个想法继续推进下去的时刻。同样，P06 把句末区分成单纯的文本边界，以及“*我写完了一句，这句就结束了，现在我想进入下一句*”的时刻。当这种对齐失效时，就会出现糟糕的时机，例如支持与写作者当下需要的不符，或者相关伙伴在本该出现时保持沉默。P13 回忆起一次这样的错失时机：“*拜托。那本来是个很适合它冒出来的好时机。*”
:::

:::bi

**KF9: Peripheral and fading visual representations made proactive support feel non-intrusive:** Participants emphasized that the visual representation of proactive suggestions shaped whether system initiative felt intrusive. Two design features were particularly important: peripheral placement, through the right-side panel and small floating tags, and fading presence, through automatic dismissal after periods of inaction. The right-side placement kept suggestions outside the main writing workspace and made them easy to ignore when writers wanted to stay focused. P10 noted that suggestions “*come on the right tab and not on the main writing screen… they’re very small which means that they don’t take up a lot of your space even on the right side.*” P16 similarly explained, “*it’s in the set panel right so it’s not blocked my main… if it’s good then I look at that if not I just ignore.*” The initial floating tags further reduced disruption by signaling a suggestion without immediately expanding its content. P13 valued that “*it’s just a little icon and it’s not opening this whole box like out of here.*” The fading presence of suggestions further reinforced this optionality: when writers did not engage, suggestions automatically disappeared rather than remaining in the workspace. As P12 put it, it was “*perfect because when I didn’t want them, it kind of disappeared.*”

:::zh

**KF9：外围与渐隐的视觉呈现让主动式支持显得不具侵入性：** 被试强调，主动式建议的视觉呈现决定了系统主动性是否显得侵入。有两个设计特征尤其重要：一是外围放置，通过右侧面板和小尺寸浮动标签来实现，二是渐隐，通过在一段时间没有操作后自动消失来实现。右侧放置让建议留在主要写作工作区之外，写作者想保持专注时可以轻松忽略它们。P10 提到，建议“*出现在右侧标签页上，而不在主写作屏幕上……它们非常小，所以即使放在右侧也不会占用你太多空间。*” P16 也解释说，“*它在侧边面板里，所以不会挡住我的主界面……如果它好我就看看，不好我就忽略。*” 最初的浮动标签进一步减少了干扰，它只是示意有一条建议，而不会立刻展开内容。P13 很看重这一点：“*它只是一个小图标，不会一上来就把整个框展开。*” 建议的渐隐进一步强化了这种可选性：当写作者不参与时，建议会自动消失，而不是一直留在工作区里。正如 P12 所说，这“*很完美，因为当我不想要它们时，它们就消失了。*”
:::

:::bi

**KF10: Acknowledgments built trust, while questions preserved sense of control:** Participants also reflected on how the rhetorical form of proactive suggestions shaped their experience. The acknowledgment at the beginning of each suggestion often served a trust-building function by showing that the partner had interpreted the current writing context before offering support. P12 described this as a “same wavelength” signal: “*that gives me the confidence that what it’s going to propose next will be relevant… otherwise it could just be like a random suggestion*.” P15 similarly noted that the acknowledgment prompted a useful check on whether the partner had correctly understood their intention. For writers with a clear sense of direction, however, this framing could feel unnecessary; P07 remarked, “*I know what I write; I just want to know what goes next*.” Participants also generally preferred the second part of the suggestion to be framed as a question rather than a directive because questions preserved room for interpretation and choice. As P13 explained, “*it’s a partner. it’s not telling me what to do; it’s just offering me suggestions,*” while P15 said that questions gave “*the impression that I have still everything under control and I can decide.*” This framing was less effective when writers lacked the knowledge needed to interpret the question. P08 described this as an “unknown unknowns” problem: “*You can tell me that I missed something, but you actually have to tell me what I missed because the reason why I didn’t think about it is because I don’t know about it.*” In such cases, participants often continued the interaction by asking the partner for examples or additional options.

:::zh

**KF10：确认建立了信任，而提问保留了掌控感：** 被试也回顾了主动式建议的修辞形式如何塑造他们的体验。每条建议开头的确认常常起到建立信任的作用，它表明伙伴在提供支持之前已经解读了当前的写作情境。P12 把这描述为“同一频率”的信号：“*这让我有信心，它接下来提出的内容会是相关的……否则它就可能像一条随机的建议。*” P15 同样指出，这种确认促使他们有效地检查伙伴是否理解了自己的意图。不过，对于方向感明确的写作者，这种框架可能显得多余，P07 说：“*我知道我在写什么，我只想知道接下来该写什么。*” 被试通常也更希望建议的后半部分以提问而不是指令的形式给出，因为提问为解读和选择留出了空间。正如 P13 解释的：“*它是一个伙伴，不是告诉我该做什么，只是给我建议，*” P15 则说，提问给人的“*印象是我仍然掌控着一切，我可以自己做决定。*” 当写作者缺乏解读问题所需的知识时，这种框架就没那么有效。P08 把这描述为“未知的未知”问题：“*你可以告诉我我漏掉了什么，但你得真的告诉我我漏掉的是什么，因为我没有想到它，原因就是我不了解它。*” 在这种情况下，被试常常会继续与伙伴互动，向它索要例子或更多选项。
:::

:::bi

> **RQ3 Takeaway**
>
> Participants valued proactive cognitive support because it reduced the effort of explicitly seeking help and allowed assistance to emerge within the flow of writing. However, system initiative was experienced positively when the support aligned with writers’ momentary intentions and remained easy to ignore or reject. Visual presentation and rhetorical framing all shaped this experience: peripheral and fading visual cues reduced disruption, acknowledgments signaled contextual understanding, and question-based suggestions preserved writers’ sense of control.

:::zh

> **RQ3 要点**
>
> 被试看重主动式认知支持，因为它减少了显式寻求帮助所花的精力，让辅助能够在写作心流中自然出现。不过，只有当支持与写作者当下的意图对齐，并且仍然容易忽略或拒绝时，系统主动性才会带来正面体验。视觉呈现与修辞框架共同塑造了这一体验：外围与渐隐的视觉线索减少了干扰，确认表明了对情境的理解，以提问形式给出的建议则保留了写作者的掌控感。
:::

## 讨论（Discussion）

:::bi

In this paper, we explored proactive thought partners, a design concept that combines system initiative with customizable, cognitive support for writing. Drawing on findings from our probe study, we discuss design implications for future proactive writing support across four dimensions: customization, timing, engagement, and representation (Table 4).

:::zh

本文探索了主动式思考伙伴这一设计概念，它把系统主动性与可定制且面向写作的认知支持结合起来。基于探针研究的结果，我们围绕四个维度讨论未来主动式写作支持的设计启示：定制，时机，参与和呈现（表 4）。
:::

:::bi

Table 4: *Design dimensions, factors, and implications.* This table summarizes the design dimensions of proactive thought partners explored through our probe, the design factors examined in the study, and the resulting implications for future customizable proactive writing support.

| Design Dimension | Design Factors | Design Implications |
| --- | --- | --- |
| Customization | Configuration Strategies: goal-driven or difficulty-driven planning. | [DI1] Support prospective planning by helping writers anticipate the goals, difficulties, and forms of assistance relevant to an upcoming writing task, and translate these expectations into partner configurations. |
| Customization | Partner Functionality: information seeking, argument development, critical reflection, and ideation support. | [DI2] Support specialized partners for distinct forms of cognitive work rather than defaulting to general-purpose assistants. Systems should make it easy to assemble partners around the knowledge, reasoning, reflection, or ideation support relevant to a particular writing task. |
| Timing | Event Triggers: long pause, sentence end, and text selection. | [DI3] Treat observable interaction events as candidate moments for intervention rather than sufficient evidence of need. The same event may reflect different writing states, so triggers should initiate further assessment rather than directly determine system action. |
| Timing | Contextual Cues: draft-state cues, writing-activity cues, and anticipated-need cues. | [DI4] Infer intervention opportunities from multiple contextual cues that capture what is present in the draft, what the writer is currently doing, and what support they may need next. Systems should align assistance with the writer’s momentary intention before deciding whether and which support to provide. |
| Engagement | Ignoring: users can naturally ignore proactive interventions by continuing to write. | [DI5] Make ignoring a first-class response to system initiative. Proactive suggestions should be easy to bypass without requiring explicit dismissal or disrupting the writing flow. |
| Engagement | Inspiring: users can inspect suggestions and optionally continue a dialogue. | [DI6] Provide low-commitment ways to use proactive suggestions as material for thinking. Writers should be able to inspect, question, elaborate, or adapt a suggestion without immediately incorporating AI-generated text into the draft. |
| Engagement | Executing: writers can ask partners to insert or revise text directly. | [DI7] Reserve direct text generation for moments when writers are ready to externalize a sufficiently settled intention. Systems should allow writers to escalate from cognitive support to execution when they have a clear direction or target for revision, while avoiding making execution the default for suggestions intended to provoke reflection or exploration. |
| Representation | Visual Form: peripheral placement and fading presence. | [DI8] Represent proactive suggestions as lightweight, peripheral bids for attention. Suggestions should remain noticeable without occupying the primary writing space and should recede when writers choose not to engage. |
| Representation | Suggestion Framing: acknowledgment of writer intention and thought-provoking questions. | [DI9] Make the system’s contextual interpretation visible while preserving room for writer judgment. Brief acknowledgments can communicate what the system believes the writer is doing, while question-based suggestions can invite reflection without prescribing a particular response. |

:::zh

Table 4: *设计维度，因素与启示。* 本表总结了通过我们的探针所探索的主动式思考伙伴设计维度，研究中考察的设计因素，以及由此得出的对未来可定制主动式写作支持的启示。

| 维度 | 因素 | 启示 |
| --- | --- | --- |
| 定制 | 配置策略：目标驱动或困难驱动的规划。 | [DI1] 支持前瞻性规划，帮助写作者预判与即将到来的写作任务相关的目标，困难与辅助形式，并把这些预期转化为伙伴配置。 |
| 定制 | 伙伴功能：信息检索，论证发展，批判性反思与构思等方面的支持。 | [DI2] 支持面向不同认知工作形式的专门化伙伴，而不是默认采用通用助手。系统应当让写作者能方便地围绕某一写作任务所需的知识，推理，反思或构思支持来组合伙伴。 |
| 时机 | 事件触发：长停顿，句末与选中文本。 | [DI3] 把可观察的交互事件当作干预的候选时机，而不是需要的充分证据。同一事件可能反映不同的写作状态，因此触发应当启动进一步评估，而不是直接决定系统的行动。 |
| 时机 | 情境线索：草稿状态线索，写作活动线索与预期需求线索。 | [DI4] 从多种情境线索推断干预机会，这些线索刻画草稿中已有的内容，写作者当前正在做什么，以及接下来可能需要什么支持。系统应当先让辅助与写作者当下的意图对齐，再决定是否提供支持以及提供哪种支持。 |
| 参与 | 忽略：用户可以继续写作，自然地忽略主动式干预。 | [DI5] 把忽略作为应对系统主动性的一种标准回应。主动式建议应当容易绕过，既不需要显式关闭，也不打断写作心流。 |
| 参与 | 启发：用户可以查看建议，并选择是否继续对话。 | [DI6] 提供低投入的方式，把主动式建议用作思考的素材。写作者应当可以查看，追问，展开或调整一条建议，而不必立刻把 AI 生成的文本并入草稿。 |
| 参与 | 执行：写作者可以让伙伴直接插入或修改文本。 | [DI7] 直接生成文本只留给写作者已准备好把足够确定的意图外化的时刻。当写作者有了清晰的方向或修改目标时，系统应当允许他们从认知支持升级到执行，同时避免把执行变成意在引发反思或探索的建议的默认选项。 |
| 呈现 | 视觉形式：外围放置与渐隐。 | [DI8] 把主动式建议呈现为轻量的外围注意力提示。建议应当保持可被注意到，但不占据主要的写作空间，并在写作者选择不参与时退到后台。 |
| 呈现 | 建议框架：对写作者意图的确认与引发思考的提问。 | [DI9] 让系统的情境解读可见，同时为写作者的判断留出空间。简短的确认可以传达系统认为写作者正在做什么，而以提问形式给出的建议可以邀请反思，而不规定某个特定回应。 |
:::

### 把定制设计为前瞻性规划（Designing Customization as Prospective Planning）

:::bi

Participants used customization to envision how proactive support could fit an upcoming writing task (**KF1**). Configuration externalized a situated model of forthcoming writing work: the goals they wanted to achieve, the difficulties they anticipated, and the kinds of cognitive support that might become useful. This extends prior work on customizable AI agents for writing feedback (Benharrak et al., 2024) after writing. In proactive writing contexts, however, writers needs to anticipate support before and/or during writing. Future systems should therefore support this prospective planning by helping writers translate anticipated goals and difficulties into specialized partners for different forms of cognitive work, such as information seeking, argument development, critical reflection, and ideation (**DI1–DI2**). Systems could help writers assemble a set of partners whose expertise and responsibilities reflect the demands of a particular writing task.

:::zh

被试把定制当作设想主动式支持如何契合即将到来的写作任务的方式（**KF1**）。配置把即将进行的写作工作外化成一个具体情境中的模型：他们想达成的目标，他们预见的困难，以及可能变得有用的各种认知支持。这拓展了此前关于写作完成后反馈的可定制 AI 智能体研究（Benharrak et al., 2024）。不过在主动式写作情境中，写作者需要在写作之前和/或写作过程中预判支持。因此，未来系统应当支持这种前瞻性规划，帮助写作者把预期的目标和困难转化为面向不同认知工作形式的专门化伙伴，例如信息检索，论证发展，批判性反思和构思（**DI1–DI2**）。系统可以帮助写作者组合出一组伙伴，使它们的专长与职责反映某一具体写作任务的需求。
:::

:::bi

At the same time, prospective planning is necessarily imperfect because writers may not know in advance which configurations will be useful once writing unfolds. Future systems should therefore treat partner configuration as an iterative design activity instead of a one-time setup step. Writers could preview a partner’s likely interventions on a sample passage, simulate how its role and timing conditions would behave in different writing situations, or revise configurations based on use. For example, a system might surface patterns such as a partner being repeatedly ignored, rarely activated, or frequently invoked for follow-up, and use these traces to suggest refinements to its role or scope. Such mechanisms could make proactive partners easier to test and adapt while preserving writers’ authority over what kinds of cognitive support they want in their writing process.

:::zh

与此同时，前瞻性规划必然是不完美的，因为写作者可能无法预先知道写作展开之后哪些配置会有用。因此，未来系统应当把伙伴配置当作一项迭代的设计活动，而不是一次性的设置步骤。写作者可以在样例段落上预览伙伴可能给出的干预，模拟它的角色和时机条件在不同写作情境中会如何表现，或者根据使用情况修改配置。例如，系统可以呈现诸如某位伙伴反复被忽略，很少被激活，或者经常被调用来继续追问等模式，并利用这些痕迹来建议对其角色或范围做出调整。这类机制可以让主动式伙伴更容易被检验和调整，同时保留写作者对自己在写作过程中想要何种认知支持的主导权。
:::

### 把时机设计为情境对齐（Designing Timing as Contextual Alignment）

:::bi

Our findings show that observable interaction events should be treated as candidate moments for proactive support, not as sufficient evidence that an intervention is needed (**DI3**). Participants frequently configured pauses, sentence endings, and text selections as triggers, yet the same event could correspond to different writing states (**KF3**, **KF8**). A pause might indicate writer’s block, focused reflection, or a moment when the writer already knows what to write next; a sentence ending might signal completion, extension, verification, or reconsideration. This distinction complements prior work on interruption management (Bailey et al., 2001; Czerwinski et al., 2000; Iqbal et al., 2005) and complicates proactive and autonomous writing systems that tie system action directly to predefined events (Lehmann et al., 2026; Pu et al., 2025). For higher-level cognitive support, an event can indicate when the system should assess the situation, but it does not by itself determine whether support is appropriate.

:::zh

我们的结果表明，可观察的交互事件应当被当作主动式支持的候选时机，而不是需要干预的充分证据（**DI3**）。被试经常把停顿，句末和选中文本配置为触发条件，但同一事件可能对应不同的写作状态（**KF3**，**KF8**）。停顿可能意味着写作卡壳，专注的反思，或者写作者已经知道接下来该写什么的时刻。句末可能意味着完成，延展，核对或重新考虑。这一区分补充了此前关于中断管理的研究（Bailey et al., 2001; Czerwinski et al., 2000; Iqbal et al., 2005），也让那些把系统行动直接绑定到预定义事件的主动式与自主写作系统面临更复杂的情况（Lehmann et al., 2026; Pu et al., 2025）。对于更高层次的认知支持，事件可以表明系统应当评估情境的时机，但它本身并不决定支持是否合适。
:::

:::annotation
“事件不等于需求”是本文最可迁移的一条：同一个停顿可能是卡住，也可能是专注，同一句话的句末可能是完成，也可能是犹豫。凡是把可观测事件直接当成系统动作开关的主动式系统，都绕不开这个问题。
:::

:::bi

Future proactive writing systems should therefore add a layer of contextual inference between event detection and intervention (**DI4**). Our participants’ contextual heuristics drew on draft-state cues, ongoing writing activities, and anticipated support needs, suggesting that systems should interpret interaction events in relation to what is currently in the draft, what the writer appears to be doing, and what kind of help may be useful next. Behavioral events such as pauses and selections remain informative, but their meaning is shaped by the recursive interplay of planning, translating, and reviewing in writing (Flower and Hayes, 1981). Systems could use triggers to initiate contextual assessment, then combine recent writing behavior, local and document-level content, and writer-defined goals to decide whether and which partner should intervene. They should also reassess this interpretation close to delivery time, since a need inferred at one moment may no longer be relevant after the writer has moved on.

:::zh

因此，未来的主动式写作系统应当在事件检测与干预之间加入一层情境推断（**DI4**）。被试的情境启发规则依托草稿状态线索，进行中的写作活动和预期的支持需求，这说明系统应当结合草稿中现有的内容，写作者看起来正在做什么，以及接下来可能需要哪种帮助来解读交互事件。停顿和选中文本这类行为事件仍然提供信息，但它们的意义受到写作中规划，转译和复查三者递归交互的塑造（Flower and Hayes, 1981）。系统可以用触发条件启动情境评估，再结合近期的写作行为，局部与文档层面的内容以及写作者定义的目标，来决定是否干预以及由哪位伙伴干预。系统还应当在接近呈现的时刻重新评估这一解读，因为某一时刻推断出的需求，在写作者继续推进之后可能已经不再相关。
:::

### 把参与设计为渐进投入（Designing Engagement as Graduated Commitment）

:::bi

Participants engaged with proactive suggestions through distinct levels of attention and commitment: ignoring them, opening them for inspiration or reflection, and selectively asking partners to execute changes directly in the document. This finding speaks to recent concerns about agency and ownership in AI co-writing. Prior work has shown that AI-generated text can complicate writers’ perceptions of authorship (Draxler et al., 2024), while interaction designs can preserve agency by giving writers meaningful control over how AI contributions enter a draft (Carrera et al., 2025; Yeh et al., 2025). In our study, ignoring was the most common response and functioned as a natural way to preserve writing flow when writers did not need help (**KF5**). Future systems should therefore make non-engagement an effortless and legitimate response to system initiative, allowing writers to continue composing without requiring explicit dismissal (**DI5**). When support was useful, participants opened suggestions as prompts for idea generation and self-monitoring (**KF4**), suggesting that proactive assistance should first offer low-commitment material that writers can inspect, question, or adapt without immediately changing the draft (**DI6**).

:::zh

被试以不同程度的注意力与投入来参与主动式建议：忽略它们，打开它们以获得启发或反思，以及有选择地让伙伴直接在文档中执行修改。这一发现回应了近来关于 AI 共同写作中能动性与所有权的关切。已有研究表明，AI 生成的文本会使写作者对作者身份的感知变得复杂（Draxler et al., 2024），而交互设计可以通过让写作者对 AI 贡献如何进入草稿拥有有意义的控制来保有能动性（Carrera et al., 2025; Yeh et al., 2025）。在我们的研究中，忽略是最常见的回应，它充当写作者不需要帮助时保持写作心流的自然方式（**KF5**）。因此，未来系统应当让不参与成为对系统主动性的一种毫不费力且正当的回应，让写作者无需显式关闭就能继续写作（**DI5**）。当支持有用时，被试会把建议打开，用作想法生成和自我监控的引子（**KF4**），这说明主动式辅助应当先提供低投入的材料，让写作者可以查看，追问或调整，而不必立刻改动草稿（**DI6**）。
:::

:::bi

Direct execution represented a deeper level of commitment and was most appropriate when writers were ready to externalize a sufficiently settled intention, such as when they had a clear direction or target for revision, or had developed an idea through interaction with a partner (**KF6**). At the same time, participants often preferred not to execute suggestions intended primarily to provoke reflection or exploration, where the suggestion itself could be sufficient. This suggests that proactive systems should separate the initiation of support from the authority to modify the document and treat execution as a selective escalation (**DI7**). A system may proactively surface an idea, question, or possible revision, while direct insertion or rewriting should remain a deliberate user action. Future interfaces could support smooth escalation across these levels, letting proactive AI take initiative without assuming control over whether or how its contributions ultimately enter the draft.

:::zh

直接执行代表着更深层次的投入，最适合写作者已准备好把足够确定的意图外化之时，例如他们有了清晰的方向或修改目标，或者在与伙伴的互动中发展出了一个想法（**KF6**）。与此同时，对于那些主要意在引发反思或探索的建议，被试往往不愿去执行，因为建议本身可能已经足够。这说明主动式系统应当把发起支持与修改文档的权限分开，把执行当作有选择的升级（**DI7**）。系统可以主动呈现一个想法，一个问题或一种可能的修改，而直接插入或重写应当仍然是用户的主动操作。未来的界面可以支持在这些层次之间平滑升级，让主动式 AI 能够主动发起，又不替用户决定它的贡献最终是否以及如何进入草稿。
:::

### 把呈现设计为轻量且非指令性（Designing Representation as Lightweight and Non-directive）

:::bi

Participants valued proactive support when its visual and rhetorical representation made system initiative feel optional and easy to assess (**KF9–KF10**). Peripheral placement, small floating tags, and fading presence allowed suggestions to remain available without competing with the main writing task, suggesting that proactive systems should present interventions as lightweight bids for attention that can recede when writers choose not to engage (**DI8**). Rhetorical framing also shaped how writers interpreted these interventions. Acknowledgments helped establish trust by making the system’s understanding of the local context visible, while non-directive suggestions (i.e., questioning) preserved room for interpretation and choice (**DI9**). Future systems should therefore communicate enough of their contextual interpretation for writers to judge whether a suggestion is relevant, while avoiding forms that make the intervention feel directive or demanding.

:::zh

当视觉与修辞呈现让系统主动性显得可选且容易评估时，被试很看重主动式支持（**KF9–KF10**）。外围放置，小尺寸浮动标签和渐隐让建议可以随时可得，又不与主要写作任务争夺注意力，这说明主动式系统应当把干预呈现为轻量的注意力提示，在写作者选择不参与时可以退场（**DI8**）。修辞框架同样塑造了写作者如何理解这些干预。确认通过让系统对局部情境的理解变得可见来帮助建立信任，而非指令性的建议（即提问）为解读和选择留出了空间（**DI9**）。因此，未来系统应当传达足够的情境解读，让写作者判断一条建议是否相关，同时避免让干预显得指令性或苛求。
:::

:::bi

This finding aligns with work on interruption management showing that interruption costs depend not only on timing but also on how an intervention is presented (Bailey et al., 2000; Czerwinski et al., 2000; Pu et al., 2025). Future representations could make this grounding visible at multiple levels of the document. Local interventions might reference the sentence or passage that motivated a suggestion, while partners concerned with argument flow, section coherence, or narrative direction could surface their interpretation of broader document structure through outlines, highlighted gaps, or cross-section references. Such representations could help writers understand why a proactive suggestion appeared while keeping the intervention lightweight and subordinate to the writing task.

:::zh

这一发现与中断管理方面的研究一致，后者表明中断的代价不仅取决于时机，也取决于干预如何呈现（Bailey et al., 2000; Czerwinski et al., 2000; Pu et al., 2025）。未来的呈现方式可以在文档的多个层级上让这种依据可见。局部干预可以引用激发某条建议的句子或段落，而关注论证脉络，节段连贯性或叙事方向的伙伴则可以通过大纲，标记出的缺口或跨节引用，把自身对更广文档结构的解读呈现出来。这类呈现可以帮助写作者理解某条主动式建议为何出现，同时让干预保持轻量，从属于写作任务。
:::

## 伦理考量（Ethical Considerations）

:::bi

Proactive writing support raises privacy concerns because providing timely assistance requires continuous observation of both the evolving document and the writer’s interaction traces. In our probe, the system used the current draft, cursor position, behavioral events, and recent keystroke logs to infer when support might be needed. Such data may expose sensitive content as well as distinctive writing habits that could reveal aspects of a writer’s identity. Although we instructed participants not to enter personally identifiable, confidential, or highly sensitive information, this mitigation places responsibility on users and may be unrealistic in everyday writing contexts. Future systems should therefore adopt privacy-by-design practices (Spiekermann, 2012), including data minimization, local or ephemeral processing of behavioral traces, strict retention limits, clear disclosure of what is monitored, and granular controls for pausing monitoring or deleting collected data. Proactive assistance should also avoid treating inferred cognitive states as definitive and should not reuse writing traces for model training, profiling, or identity inference without separate, explicit consent.

:::zh

主动式写作支持会引发隐私关切，因为及时提供辅助需要持续观察不断演变的文档和写作者的交互痕迹。在我们的探针中，系统使用当前草稿，光标位置，行为事件和最近的击键日志来推断何时可能需要支持。这类数据可能暴露敏感内容，也可能暴露独特的写作习惯，而这些习惯可能透露写作者身份的某些方面。尽管我们告知被试不要输入可识别个人身份的信息，保密信息或高度敏感的信息，但这种缓解措施把责任放在了用户身上，在日常写作情境中可能并不现实。因此，未来系统应当采用隐私保护设计实践（Spiekermann, 2012），包括数据最小化，对行为痕迹进行本地处理或临时处理，严格的留存期限，清楚披露被监测的内容，以及用于暂停监测或删除已收集数据的细粒度控制。主动式辅助还应当避免把推断出的认知状态当作确定结论，也不应在没有单独且明确同意的情况下，把写作痕迹用于模型训练，画像或身份推断。
:::

:::annotation
隐私代价是结构性的：要判断“此刻需不需要帮助”，就得持续观察草稿和击键，而这些数据能暴露内容也能暴露写作习惯。作者列出的六条实践可以当检查清单：数据最小化，本地或即时处理，严格保留期限，明确披露，可暂停监测，可删除。
:::

## 局限（Limitations）

:::bi

Our study has several limitations. First, as a probe study, it was intended to explore an emerging design space rather than evaluate a finished system. Accordingly, our findings do not establish causal effects on writing quality, productivity, learning, or long-term agency. Longer deployments or a larger scale of comparative, quantitative lab studies against reactive AI assistants and conventional writing tools can be valuable in the future. A related limitation is that our study can only offer preliminary insight into how proactive support may influence writers’ sense of ownership. Although participants retained control over whether to ignore, check, or execute suggestions, proactive interventions may still shape what writers notice, how they frame problems, and which directions they pursue. These effects may become more consequential over longer periods of use, especially if writers begin to rely on partners to identify writing problems or propose next steps. Future work could examine how proactive support affects perceived authorship, confidence, skill development, and dependence over time.

:::zh

我们的研究存在若干局限。首先，作为一项探针研究，它旨在探索一个正在浮现的设计空间，而不是评估一个成熟的系统。因此，我们的发现并不能确立对写作质量，生产力，学习或长期能动性的因果影响。未来可以开展更长时间的部署，或者更大规模的对照量化实验室研究，把主动式支持与反应式 AI 助手和传统写作工具进行比较，这些工作会很有价值。一个相关的局限是，我们的研究只能就主动式支持可能如何影响写作者的所有权感提供初步洞察。尽管被试保留了是否忽略，查看或执行建议的控制权，主动式干预仍可能塑造写作者注意到什么，如何界定问题，以及走向哪些方向。这些效应在更长时间的使用中可能变得更加重要，尤其是当写作者开始依赖伙伴来识别写作问题或提出下一步时。未来工作可以考察主动式支持在一段时间内如何影响感知到的作者身份，信心，技能发展和依赖。
:::

:::annotation
作者自己把边界划得很清楚：探针研究只能给设计启示，不能证明写作质量，生产力，学习效果或长期能动性的因果变化。客户端的那些“有帮助”评分只代表主观感受。
:::

:::bi

Our participant sample may limit generalizability. Participants were English-proficient daily writers who engaged with a range of writing genres during the study, and all had prior experience with AI writing tools. This background allowed them to compare proactive support with existing AI writing tools (e.g., chatbots, autocomplete) during interviews, but their expectations, comfort with AI, and willingness to engage with proactive support may differ from those of writers with less AI experience or different linguistic backgrounds. In addition, our privacy instruction to avoid confidential workplace content likely excluded the high-stakes writing these participants do most. Future work could address these limitations by evaluating proactive thought partners with a more demographically and linguistically diverse participant population, including writers with varying levels of AI experience, and across a broader range of professional and high-stakes writing contexts.

:::zh

我们的被试样本可能限制了可推广性。被试是英语熟练的日常写作者，在研究期间涉及多种写作体裁，并且都有使用 AI 写作工具的经验。这样的背景让他们能够在访谈中把主动式支持与现有的 AI 写作工具（例如聊天机器人，自动补全）进行比较，但他们的预期，对 AI 的适应程度以及参与主动式支持的意愿，可能与 AI 经验较少或语言背景不同的写作者不同。此外，我们关于避免输入涉密工作内容的隐私要求，很可能把这些被试最常进行的高风险写作排除在外。未来工作可以通过在人口学特征与语言背景更多样的被试群体中评估主动式思考伙伴来应对这些局限，这些被试包括 AI 经验水平各异的写作者，并且研究应覆盖更广泛的专业写作与高风险写作情境。
:::

:::bi

Our probe also has several limitations. First, current LLMs may not reliably interpret writing context well enough to infer writers’ momentary intentions or anticipated support needs. Our findings around contextual heuristics provide a starting point for future work by identifying three forms of contextual cues that may be useful for this inference: draft-state cues, writing-activity cues, and anticipated-need cues. Future research could develop models and benchmarks that evaluate whether AI systems can recognize these cues, distinguish among different writing states that produce similar interaction events, and determine which forms of support are appropriate in context. Second, suggestion quality and timing depended on a particular LLM-based implementation. Different models, prompts, contextual representations, or orchestration strategies may produce different intervention patterns and user experiences. Our findings should therefore be interpreted as reflecting both the broader interaction paradigm of proactive thought partners and the specific capabilities and limitations of the system we implemented.

:::zh

我们的探针也存在若干局限。首先，当前的大语言模型可能无法可靠地解读写作情境，不足以推断写作者当下的意图或预期的支持需求。我们关于情境启发规则的发现为未来工作提供了起点，它识别出三类可能有助于这种推断的情境线索：草稿状态线索，写作活动线索和预期需求线索。未来研究可以开发模型与基准测试，用来评估 AI 系统能否识别这些线索，区分会产生相似交互事件的不同写作状态，并判断在具体情境中哪种支持形式是合适的。其次，建议的质量与时机取决于特定的基于大语言模型的实现。不同的模型，提示，情境表征或编排策略可能产生不同的干预模式与用户体验。因此，我们的发现应当被理解为既反映了主动式思考伙伴这一更广的交互范式，也反映了我们所实现系统的具体能力与局限。
:::

## 结论（Conclusion）

:::bi

We introduced proactive thought partners, a design concept for AI writing assistants that proactively provide customizable, higher-level cognitive support during writing. Through a one-week deployment of our technology probe, we found that writers used customization as a form of prospective planning, engaged with proactive suggestions through graduated levels of commitment, and experienced good timing as contextual alignment between offered support and their momentary intentions. Our findings further show that effective proactivity depends on more than deciding when to intervene: writers need ways to shape the kinds of support they receive, ignore or deepen engagement with suggestions as needed, and receive proactive support through non-intrusive visual and rhetorical representations. We believe our design and insights can inform future proactive AI systems for complex cognitive work.

:::zh

我们提出了主动式思考伙伴这一设计概念，它面向在写作过程中主动提供可定制的更高层次认知支持的 AI 写作助手。通过为期一周的技术探针部署，我们发现写作者把定制用作一种前瞻性规划，以渐进投入的方式参与主动式建议，并把良好的时机体验为所提供支持与其当下意图之间的情境对齐。我们的发现进一步表明，有效的主动性不只取决于决定何时干预：写作者需要有能力塑造自己获得的支持类型，按需忽略建议或加深参与，并通过不具侵入性的视觉与修辞呈现来接受主动式支持。我们相信，我们的设计与洞见可以为面向复杂认知工作的未来主动式 AI 系统提供参考。
:::

:::annotation
收尾把“有效的主动性”拆成四件事：给什么（认知支持），什么时候给（情境对齐），怎么参与（渐进投入），怎么呈现（轻量且非指令）。这正好是开头的四维设计空间，首尾对上了。
:::
