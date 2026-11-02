---
title: '生成式智能体：人类行为的交互式拟像'
description: '二十五个语言模型驱动的智能体住进一个叫 Smallville 的小镇，自己排日程，传消息，结关系，办派对。这篇 UIST 2023 的论文把记忆流，反思，计划三件套搭成一套架构，再用消融实验和两天模拟证明这些社会行为是涌现出来的，不是写死的脚本。'
pubDate: 2026-11-02
author: 'Joon Sung Park，Joseph C. O’Brien，Michael S. Bernstein 等'
category: papers
tags: ['多智能体', '记忆系统', '世界模拟', 'LLM', '斯坦福团队·Joon Sung Park 等']
subcategory: 'paper-llm'
---

:::source
- **论文**：Generative Agents: Interactive Simulacra of Human Behavior
- **作者**：Joon Sung Park，Joseph C. O’Brien，Carrie J. Cai，Meredith Ringel Morris，Percy Liang，Michael S. Bernstein
- **机构**：斯坦福大学
- **发表**：UIST 2023（第 36 届 ACM 用户界面软件与技术研讨会），arXiv 2304.03442
- **原文**：[arxiv.org/abs/2304.03442](https://arxiv.org/abs/2304.03442)
- **代码**：[joonspk-research/generative_agents](https://github.com/joonspk-research/generative_agents)
- **演示**：[reverie.herokuapp.com/UIST_Demo](https://reverie.herokuapp.com/UIST_Demo/)（Heroku 免费额度已停，多半打不开）
:::

> [!NOTE]
> 本文是论文《Generative Agents: Interactive Simulacra of Human Behavior》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文九节全译，附录 A 的架构优化和附录 B 的二十五个访谈问题也一并收了。章节编号和图号都沿用原文，所以跨节引用（§4.1，图 8 这类）和原文对得上，但和本站目录的编号不一定一致。原文用的是作者年份制引用，正文里（Card et al., 1983）这类标记原样保留，没有附参考文献表。九张图都是论文原图，图注下面那行中文小字是我加的说明。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

:::figure
![Generative agents are believable simulacra of human behavior for interactive app](./images/generative-agents/fig-01.png)

Figure 1: Generative agents are believable simulacra of human behavior for interactive applications. In this work, we demonstrate generative agents by populating a sandbox environment, reminiscent of The Sims, with twenty-five agents. Users can observe and intervene as agents plan their days, share news, form relationships, and coordinate group activities.

:::zh
图 1：生成式智能体是可供交互应用使用的、可信的人类行为拟像。这项工作把二十五个智能体放进一个让人想起《模拟人生》的沙盒环境里演示：用户可以观察并介入它们规划日程，分享消息，结成关系，协调集体活动的过程。五个放大框是从小镇里圈出来的生活片段，气泡里的对话是智能体当场生成的。
:::
:::

## 摘要（Abstract）

:::bi

Believable proxies of human behavior can empower interactive applications ranging from immersive environments to rehearsal spaces for interpersonal communication to prototyping tools. In this paper, we introduce generative agents: computational software agents that simulate believable human behavior. Generative agents wake up, cook breakfast, and head to work; artists paint, while authors write; they form opinions, notice each other, and initiate conversations; they remember and reflect on days past as they plan the next day. To enable generative agents, we describe an architecture that extends a large language model to store a complete record of the agent’s experiences using natural language, synthesize those memories over time into higher-level reflections, and retrieve them dynamically to plan behavior. We instantiate generative agents to populate an interactive sandbox environment inspired by The Sims, where end users can interact with a small town of twenty-five agents using natural language. In an evaluation, these generative agents produce believable individual and emergent social behaviors. For example, starting with only a single user-specified notion that one agent wants to throw a Valentine’s Day party, the agents autonomously spread invitations to the party over the next two days, make new acquaintances, ask each other out on dates to the party, and coordinate to show up for the party together at the right time. We demonstrate through ablation that the components of our agent architecture—observation, planning, and reflection—each contribute critically to the believability of agent behavior. By fusing large language models with computational interactive agents, this work introduces architectural and interaction patterns for enabling believable simulations of human behavior.

:::zh

可信的人类行为代理能够为各类交互应用提供支撑，从沉浸式环境，到人际沟通的演练空间，再到原型设计工具。本文提出生成式智能体：一类计算软件智能体，能够模拟可信的人类行为。生成式智能体会起床，做早饭，去上班。艺术家作画，作家写作。它们形成观点，注意到彼此，并主动开启对话。它们会记住过去的日子并加以反思，同时为第二天做计划。为实现生成式智能体，我们描述了一种架构：它扩展大语言模型，用自然语言存储智能体经历的完整记录，随时间把这些记忆综合成更高层的反思，并动态检索它们来规划行为。我们把生成式智能体实例化，填充进一个受《模拟人生》启发的交互式沙盒环境，终端用户可以用自然语言与一个由 25 个智能体组成的小镇互动。在评测中，这些生成式智能体产生了可信的个体行为和涌现的社会行为。例如，仅给定一条用户指定的信息，即某个智能体想举办情人节派对，在接下来两天里，智能体们就自主地传播派对邀请，结识新朋友，互相邀约一起去派对，并协调在合适的时间一同到场。我们通过消融证明，智能体架构中的各个组件，即观察记录，计划和反思，对智能体行为的可信度都有关键贡献。通过把大语言模型与计算型交互智能体融合，这项工作提出了可用于实现可信人类行为模拟的架构模式和交互模式。
:::

## 引言（Introduction）

:::bi

How might we craft an interactive artificial society that reflects believable human behavior? From sandbox games such as The Sims to applications such as cognitive models (Card et al., 1983) and virtual environments (Laird and VanLent, 2001; Bates, 1994), for over four decades, researchers and practitioners have envisioned computational agents that can serve as believable proxies of human behavior. In these visions, computationally-powered agents act consistently with their past experiences and react believably to their environments. Such simulations of human behavior could populate virtual spaces and communities with realistic social phenomena (Dill and Martin, 2011; Park et al., 2022), train people on how to handle rare yet difficult interpersonal situations (Tambe et al., 1995; Jones et al., 1999; Hollan et al., 1984), test social science theories (Binz and Schulz, 2023; Horton, 2023), craft model human processors for theory and usability testing (Card et al., 1983; John and Kieras, 1996; Hämäläinen et al., 2023), power ubiquitous computing applications (Fast et al., 2016) and social robots (Bates, 1994; Bledsoe, 1986), and underpin non-playable game characters (Laird and VanLent, 2001; Riedl, 2012) that can navigate complex human relationships in an open world.

:::zh

我们怎样才能构建一个反映可信人类行为的交互式人工社会？从《模拟人生》这样的沙盒游戏，到认知模型（Card et al., 1983）和虚拟环境（Laird and VanLent, 2001; Bates, 1994）这类应用，四十多年来，研究者和实践者一直设想有这样一类计算智能体，能够充当可信的人类行为代理。在这些设想中，由计算驱动的智能体依照自身过去的经验行事，对所处环境做出可信的反应。这类人类行为模拟可以为虚拟空间和社区填充逼真的社会现象（Dill and Martin, 2011; Park et al., 2022），训练人们如何处理罕见却棘手的人际情境（Tambe et al., 1995; Jones et al., 1999; Hollan et al., 1984），检验社会科学理论（Binz and Schulz, 2023; Horton, 2023），为理论研究和可用性测试打造人类处理器模型（Card et al., 1983; John and Kieras, 1996; Hämäläinen et al., 2023），为普适计算应用（Fast et al., 2016）和社会机器人（Bates, 1994; Bledsoe, 1986）提供动力，并支撑能够在开放世界中处理复杂人际关系的非玩家游戏角色（Laird and VanLent, 2001; Riedl, 2012）。
:::

:::bi

However, the space of human behavior is vast and complex (Riedl, 2012; Yannakakis, 2012). Despite striking progress in large language models (Brown et al., 2020) that can simulate human behavior at a single time point (Park et al., 2022; Hämäläinen et al., 2023), fully general agents that ensure long-term coherence would be better suited by architectures that manage constantly-growing memories as new interactions, conflicts, and events arise and fade over time while handling cascading social dynamics that unfold between multiple agents. Success requires an approach that can *retrieve* relevant events and interactions over a long period, *reflect* on those memories to generalize and draw higher-level inferences, and apply that reasoning to create *plans and reactions* that make sense in the moment and in the longer-term arc of the agent’s behavior.

:::zh

然而，人类行为的空间广博而复杂（Riedl, 2012; Yannakakis, 2012）。大语言模型（Brown et al., 2020）已经能在单一时间点上模拟人类行为（Park et al., 2022; Hämäläinen et al., 2023），进展令人瞩目，但要得到能保证长期连贯性的通用智能体，更合适的做法是采用这样的架构：它管理不断增长的记忆，因为新的互动和冲突以及事件会随时间出现又消退，同时处理多个智能体之间展开的连锁社会动态。要做到这一点，需要一种方法，能够在长时间跨度上*检索*相关事件与互动，对这些记忆进行*反思*以泛化并得出更高层的推断，再把这种推理用于生成*计划与反应*，让它们在当下说得通，也符合智能体行为的长期走向。
:::

:::bi

In this paper, we introduce *generative agents*—agents that draw on generative models to simulate believable human behavior—and demonstrate that they produce believable simulacra of both individual and emergent group behavior. Generative agents draw a wide variety of inferences about themselves, other agents, and their environment; they create daily plans that reflect their characteristics and experiences, act out those plans, react, and re-plan when appropriate; they respond when the end user changes their environment or commands them in natural language. For instance, generative agents turn off the stove when they see that their breakfast is burning, wait outside the bathroom if it is occupied, and stop to chat when they meet another agent they want to talk to. (Footnote: When referring to generative agents engaging in actions or going to places, this is a shorthand for readability and not a suggestion that they are engaging in human-like agency. The behaviors of our agents, akin to animated Disney characters, aim to create a sense of believability, but they do not imply genuine agency.) A society full of generative agents is marked by emergent social dynamics where new relationships are formed, information diffuses, and coordination arises across agents.

:::zh

本文提出*生成式智能体*，即借助生成模型模拟可信人类行为的智能体，并证明它们能够产生可信的拟像，既能模拟个体行为，也能模拟涌现的群体行为。生成式智能体会对自己和其他智能体以及所处的环境做出各种各样的推断。它们制定反映自身特征与经历的日常计划，执行这些计划，做出反应，并在合适的时候重新计划。当终端用户改变它们的环境，或用自然语言向它们下达指令时，它们会做出响应。例如，生成式智能体看到早饭烧糊了会把炉子关掉，看到洗手间有人会在外面等候，遇到想交谈的智能体时会停下来聊几句。（脚注：在谈到生成式智能体采取行动或前往某处时，这只是一种便于阅读的简略说法，并不意味着它们具有类人的能动性。我们的智能体的行为类似于迪士尼动画角色，目的是营造可信感，但并不表示它们真有能动性。）一个充满生成式智能体的社会，其标志是涌现的社会动态：新的关系形成，信息扩散，智能体之间产生协调。
:::

:::bi

To enable generative agents, we describe an agent architecture that stores, synthesizes, and applies relevant memories to generate believable behavior using a large language model. Our architecture comprises three main components. The first is the *memory stream*, a long-term memory module that records, in natural language, a comprehensive list of the agent’s experiences. A memory retrieval model combines relevance, recency, and importance to surface the records needed to inform the agent’s moment-to-moment behavior. The second is *reflection*, which synthesizes memories into higher-level inferences over time, enabling the agent to draw conclusions about itself and others to better guide its behavior. The third is *planning*, which translates those conclusions and the current environment into high-level action plans and then recursively into detailed behaviors for action and reaction. These reflections and plans are fed back into the memory stream to influence the agent’s future behavior.

:::zh

为实现生成式智能体，我们描述了一种智能体架构，它利用大语言模型来存储相关记忆，对其加以综合和应用，从而生成可信的行为。我们的架构包含三个主要组件。第一个是*记忆流*，这是一个长期记忆模块，用自然语言记录智能体经历的完整清单。一个记忆检索模型综合相关性，新近度和重要性，把智能体当下的行为所需的记录呈现出来。第二个是*反思*，它随时间把记忆综合成更高层的推断，使智能体能够对自己和他人得出结论，更好地指导自己的行为。第三个是*计划*，它把这些结论和当前环境转化为高层动作计划，再递归地转化为动作与反应的详细行为。这些反思和计划会被送回记忆流，影响智能体未来的行为。
:::

:::bi

This architecture suggests applications in multiple domains, from role-play and social prototyping to virtual worlds and games. In social role-play scenarios (e.g., interview preparation), a user could safely rehearse difficult, conflict-laden conversations. When prototyping social platforms, a designer could go beyond temporary personas to prototype dynamic, complex interactions that unfold over time. For this paper, we focus on the ability to create a small, interactive society of agents inspired by games such as The Sims. (Footnote: A demonstration of an actual simulation of the generative agent society can be viewed at the following link: https://reverie.herokuapp.com/UIST_Demo/. A public repository for the simulation code is located here: https://github.com/joonspk-research/generative_agents) By connecting our architecture to the ChatGPT large language model (OpenAI, 2022), we manifest a society of twenty-five agents in a game environment. End users can observe and interact with these agents. If an end user or developer wanted the town to host an in-game Valentine’s Day party, for example, traditional game environments would require scripting tens of characters’ behavior manually. We demonstrate that, with generative agents, it is sufficient to simply tell one agent that she wants to throw a party. Despite many potential points of failure—the party planner must remember to invite other agents to the party, attendees must remember the invitation, those who remember must decide to actually show up, and more—our agents succeed. They spread the word about the party and then show up, with one agent even asking another on a date to the party, all from a single user-generated seed suggestion.

:::zh

这种架构提示了多个领域的应用可能，从角色扮演和社会原型设计，到虚拟世界和游戏。在社会角色扮演场景中（例如面试准备），用户可以安全地排练艰难而充满冲突的对话。在为社会平台做原型时，设计师可以超越临时人设，去构建随时间展开的动态复杂交互。在本文中，我们关注的是创建一个小型交互式智能体社会的能力，灵感来自《模拟人生》这样的游戏。（脚注：生成式智能体社会实际模拟的演示见以下链接：https://reverie.herokuapp.com/UIST_Demo/。模拟代码的公开仓库在这里：https://github.com/joonspk-research/generative_agents）通过把我们的架构连接到 ChatGPT 大语言模型（OpenAI, 2022），我们在游戏环境中呈现了一个由 25 个智能体组成的社会。终端用户可以观察这些智能体，并与它们互动。例如，如果终端用户或开发者想让小镇举办一场游戏内的情人节派对，传统游戏环境需要手动为几十个角色的行为写脚本。我们证明，有了生成式智能体，只需告诉某一个智能体她想办派对就足够了。尽管存在许多潜在的失败点，比如派对组织者必须记得邀请其他智能体，受邀者必须记得邀请，记得邀请的人还必须决定真的到场，等等，我们的智能体都成功了。它们把派对的消息传开，然后到场，甚至有一个智能体邀请另一个智能体一起去派对，而这一切都源于一条用户生成的种子建议。
:::

:::bi

We conducted two evaluations of generative agents: a controlled evaluation to test whether the agents produce believable individual behaviors in isolation, and an end-to-end evaluation where the agents interacted with each other in open-ended ways over two days of game time to understand their stability and emergent social behaviors. In the technical evaluation, we leverage a methodological opportunity to evaluate an agent’s knowledge and behavior by “interviewing” it in natural language to probe the agents’ ability to stay in character, remember, plan, react, and reflect accurately. We compared several ablations that limit agents’ access to memory, reflection, and planning. We observe that each of these components is critical to strong performance across these interview tasks. Across the technical and end-to-end evaluation, the most common errors arose when the agent failed to retrieve relevant memories, fabricated embellishments to the agent’s memory, or inherited overly formal speech or behavior from the language model.

:::zh

我们做了两项评测。一项是受控评测，用来检验智能体在孤立状态下是否能产生可信的个体行为。另一项是端到端评测，让智能体在两天游戏时间里以开放式方式互动，以了解其稳定性和涌现的社会行为。在技术评测中，我们利用了一种方法学上的机会，用自然语言“访谈”智能体，以此评测它的知识与行为，考察智能体能否准确保持人设，记住信息，制定计划，做出反应和进行反思。我们比较了若干消融，这些消融分别限制了智能体对记忆，反思和计划的访问。我们观察到，这些组件中的每一个，对于在上述访谈任务中取得良好表现都至关重要。在技术评测和端到端评测中，最常见的错误出现在这几种情况下：智能体未能检索到相关记忆，智能体为自己的记忆捏造细节，或者智能体从语言模型那里继承了过于正式的说话或行为方式。
:::

:::bi

In sum, this paper makes the following contributions:

:::zh

总之，本文有以下贡献：
:::

:::bi

- *Generative agents*, believable simulacra of human behavior that are dynamically conditioned on agents’ changing experiences and environment.
- A novel architecture that makes it possible for generative agents to remember, retrieve, reflect, interact with other agents, and plan through dynamically evolving circumstances. The architecture leverages the powerful prompting capabilities of large language models and supplements those capabilities to support longer-term agent coherence, the ability to manage dynamically evolving memory, and recursively produce higher-level reflections.
- Two evaluations, a controlled evaluation and an end-to-end evaluation, that establish causal effects of the importance of components of the architecture, as well as identify breakdowns arising from, e.g., improper memory retrieval.
- Discussion of the opportunities and ethical and societal risks of generative agents in interactive systems. We argue that these agents should be tuned to mitigate the risk of users forming parasocial relationships, logged to mitigate risks stemming from deepfakes and tailored persuasion, and applied in ways that complement rather than replace human stakeholders in design processes.

:::zh

- *生成式智能体*，即人类行为的可信拟像，其行为会根据智能体不断变化的经历和环境动态调整。
- 一种新颖的架构，使生成式智能体能够在动态变化的情境中记住信息，进行检索，做出反思，与其他智能体互动并制定计划。该架构利用大语言模型强大的提示能力，并对这些能力加以补充，以支持更长期的智能体连贯性，以及管理动态演化记忆的能力，以及递归地产生更高层反思。
- 两项评测，即一项受控评测和一项端到端评测，它们确立了架构各组件重要性的因果效应，并识别出由不当记忆检索等原因引发的失效。
- 讨论生成式智能体在交互系统中的机遇，以及伦理和社会风险。我们主张，这类智能体应当经过调校，以降低用户形成准社会关系的风险，应当加以记录，以降低深度伪造和定向说服带来的风险，并且在设计流程中应当以补充而非取代人类利益相关者的方式来应用。
:::

:::annotation
把这篇文章放回 2023 年的上下文里看，它并不是第一个让语言模型扮演人的工作，但它是第一个把记忆、反思、计划这三件事接成一个能连续跑好几天的完整系统，并且用消融实验把每个部件的贡献单独量出来的。后来几乎所有“AI 小镇”，“AI 社会”的复现和产品，架构都能追到这里。
:::

## 相关工作（Related Work）

:::bi

In this section, we reflect on the prior literature in human-AI interaction and situate, within its canon, the agenda of building believable proxies of human behavior. This agenda, once hailed as a north star in the interaction, game, and artificial intelligence communities (Laird and VanLent, 2001; Riedl, 2012; Riedl and Young, 2005; Bates, 1994), has remained challenging due to the complexity of human behavior (Brooks et al., 2000; Yannakakis, 2012). We synthesize this research to suggest that large language models, though not sufficient by themselves, open up a new angle for creating believable agents when leveraged using the appropriate architecture.

:::zh

本节回顾人机交互领域的既有文献，并把“构建可信的人类行为代理”这一议题放进这一文献谱系中定位。这个议题曾被交互领域，游戏领域和人工智能领域奉为北极星（Laird and VanLent, 2001; Riedl, 2012; Riedl and Young, 2005; Bates, 1994），但由于人类行为极其复杂，它至今仍具挑战（Brooks et al., 2000; Yannakakis, 2012）。我们综合这些研究后认为，大语言模型本身虽不充分，但在搭配恰当的架构之后，为创造可信智能体开辟了新的角度。
:::

### 人机交互（Human-AI Interaction）

:::bi

Interactive artificial intelligence systems aim to combine human insights and capabilities in computational artifacts that can augment their users (Amershi et al., 2014; Fails and Olsen Jr, 2003). A long line of work has explored ways to enable users to interactively specify model behavior. For instance, Crayons demonstrated an early vision of interactive machine learning, allowing non-expert users to train classifiers (Fails and Olsen Jr, 2003). Further work helped to articulate how end users might describe their classification goals to the system through examples (Fogarty et al., 2008) or demonstration (Fiebrink and Cook, 2010). Recent advancements have extended these explorations to deep learning (Lam et al., 2023) and prompt-based authoring (Jiang et al., 2022; Wu et al., 2022b; Liu et al., 2022).

:::zh

交互式人工智能系统旨在把人的洞察与能力融进计算制品，从而增强用户（Amershi et al., 2014; Fails and Olsen Jr, 2003）。很长一条研究脉络都在探索如何让用户以交互方式指定模型行为。例如，Crayons 展示了交互式机器学习的早期愿景，让非专业用户也能训练分类器（Fails and Olsen Jr, 2003）。后续研究进一步阐明，终端用户可以通过示例（Fogarty et al., 2008）或演示（Fiebrink and Cook, 2010）向系统描述自己的分类目标。近来的进展把这些探索扩展到深度学习（Lam et al., 2023）和基于提示词创作（Jiang et al., 2022; Wu et al., 2022b; Liu et al., 2022）。
:::

:::bi

Meanwhile, a persistent thread of research has advanced the case for language- and agent-based interaction in human-computer interaction. Formative work such as SHRDLU (Winograd, 1971) and ELIZA (Weizenbaum, 1966) demonstrated the opportunities and the risks associated with natural language interaction with computing systems. As research progressed, it became evident that autonomous agents could offer new metaphors for delegation and interaction (Maes, 1995), but the boundaries of delegation between humans and agents have remained the subject of ongoing debate and refinement (Shneiderman and Maes, 1997; Horvitz, 1999; Shneiderman, 2022). Recently, this technology has reached a level of stability that enables agents to interact via natural language in large and complex online social environments (e.g., (Krishna et al., 2022)). Natural language interaction provides a novel modality that can enhance user abilities in domains such as photo editing (Linder et al., 2013; Fourney et al., 2011; Adar et al., 2014) and code editing (Rong et al., 2016).

:::zh

与此同时，有一条持续的研究线索一直在为人机交互中基于语言和智能体的交互方式张目。SHRDLU（Winograd, 1971）和 ELIZA（Weizenbaum, 1966）这样的奠基性工作，展示了与计算系统进行自然语言交互所带来的机会和风险。随着研究推进，人们逐渐清楚，自主智能体可以为委派和交互提供新的隐喻（Maes, 1995），但人与智能体之间委派的边界，始终是持续争论并不断修正的话题（Shneiderman and Maes, 1997; Horvitz, 1999; Shneiderman, 2022）。近来，这项技术已经稳定到一定程度，使智能体能够在大型复杂的在线社交环境中通过自然语言互动（例如（Krishna et al., 2022））。自然语言交互提供了一种新的模态，可以在照片编辑（Linder et al., 2013; Fourney et al., 2011; Adar et al., 2014）和代码编辑（Rong et al., 2016）等领域增强用户的能力。
:::

:::bi

We convene these threads of work to show that we can now create agents that proxy human behavior for interactive systems, and interact with them using natural language. In doing so, this work reopens the door to examining foundational human-computer interaction questions around cognitive models such as GOMS and Keystroke-Level Model (KLM) (Card et al., 1983; Card et al., 1980), around prototyping tools (Park et al., 2022), and around ubiquitous computing applications (Weiser, 1991; Dey, 2001; Fast et al., 2016).

:::zh

我们把这几条研究脉络汇合起来，说明如今已经可以创造出为交互系统代理人类行为的智能体，并用自然语言与它们互动。这样做，重新打开了审视人机交互基础问题的空间，包括围绕 GOMS 和击键层级模型（KLM）这类认知模型的问题（Card et al., 1983; Card et al., 1980），围绕原型工具的问题（Park et al., 2022），以及围绕普适计算应用的问题（Weiser, 1991; Dey, 2001; Fast et al., 2016）。
:::

### 人类行为的可信代理（Believable Proxies of Human Behavior）

:::bi

Prior literature has described *believability*, or *believable agents*, as a central design and engineering goal. Believable agents are designed to provide an illusion of life and present a facade of realism in the way they appear to make decisions and act on their own volition, similar to the characters in Disney movies (Bates, 1994; Thomas and Johnston, 1981). These agents can populate and perceive an open world environment like the one we inhabit (Laird and VanLent, 2001; Bates, 1994), and strive to behave in ways that exhibit emergent behaviors grounded in social interactions with users or other agents with the aim of becoming believable proxies of our behavior in hypothetical simulations of individuals and communities (McCoy et al., 2012; Burkinshaw, 2009; Francis, 2010). Historically, these agents were developed in the context of intelligent game non-player characters (NPCs) (Laird and VanLent, 2001; Riedl, 2012). Creating NPCs with believable behavior, if possible, could enhance player experiences in games and interactive fictions by enabling emergent narratives (Swartout et al., 2006; Aylett, 1999; Brenner, 2010; Ibister and Nass, 2000) and social interactions with the agents (Zubek, 2002). However, more importantly, game worlds provide increasingly realistic representations of real-world affordances, and as observed by Laird and van Lent in 2001, these simulated worlds offer accessible testbeds for developers of believable agents to finesse the agents’ cognitive capabilities without worrying about implementing robotics in the real world or creating simulation environments from scratch (Laird and VanLent, 2001; Riedl, 2012).

:::zh

既有文献把*可信度*，或者说*可信智能体*，描述为设计与工程的核心目标。可信智能体的设计目标，是提供一种生命的错觉，在看似自行决策和依自身意志行动时呈现出一层真实感，类似迪士尼电影里的角色（Bates, 1994; Thomas and Johnston, 1981）。这类智能体能够填充并感知一个像我们身处其中的开放世界环境（Laird and VanLent, 2001; Bates, 1994），并努力以展现出涌现行为的方式行事，这些行为植根于与用户或其他智能体的社会互动，目标是在对个体和社区的假想模拟中成为我们行为的可信代理（McCoy et al., 2012; Burkinshaw, 2009; Francis, 2010）。历史上，这类智能体是在智能游戏非玩家角色（NPC）的语境中发展起来的（Laird and VanLent, 2001; Riedl, 2012）。如果能够做到，创造行为可信的 NPC 可以通过让涌现叙事（Swartout et al., 2006; Aylett, 1999; Brenner, 2010; Ibister and Nass, 2000）和与智能体的社会互动（Zubek, 2002）成为可能，来提升玩家在游戏和交互式小说中的体验。然而更重要的是，游戏世界提供了越来越逼真的现实世界可供性表征，而且正如 Laird 和 van Lent 在 2001 年所观察到的，这些模拟世界为可信智能体的开发者提供了易于使用的试验台，让他们可以打磨智能体的认知能力，而不必担心在现实世界中实现机器人，也不必从零构建模拟环境（Laird and VanLent, 2001; Riedl, 2012）。
:::

:::bi

A diverse set of approaches to creating believable agents emerged over the past four decades.
In implementation, however, these approaches often simplified the environment or dimensions of agent behavior to make the effort more manageable (Brooks et al., 2000; Minsky and Papert, 1970). Rule-based approaches, such as finite-state machines (Siu et al., 2021; Umarov et al., 2012) and behavior trees (Knafla, 2011; Pillosu, 2009; Hecker, 2011) account for the brute force approach of human-authoring the agent’s behavior (McCoy et al., 2012). They provide a straightforward way of creating simple agents that is still the most dominant approach today (McCoy et al., 2009; Miyashita et al., 2017; Yannakakis, 2012), and can even handle rudimentary social interactions, as shown in games such as Mass Effect (BioWare, 2007) and The Sims (Arts, 2009) series. Nonetheless, manually crafting behavior that can comprehensively address the breadth of possible interactions in an open world is untenable. This means that the resulting agent behaviors may not fully represent the consequences of their interactions (McCoy et al., 2012; McCoy et al., 2011a; McCoy et al., 2011b), and cannot perform new procedures that were not hard-coded in their script (Siu et al., 2021; Umarov et al., 2012). On the other hand, prevalent learning-based approaches for creating believable agents, such as reinforcement learning, have overcome the challenge of manual authoring by letting the agents learn their behavior, and have achieved superhuman performance in recent years in games such as AlphaStar for Starcraft (Vinyals et al., 2019) and OpenAI Five for Dota 2 (Berner et al., 2019). However, their success has largely taken place in adversarial games with readily definable rewards that a learning algorithm can optimize for. They have not yet addressed the challenge of creating believable agents in an open world (Siu et al., 2021; Miyashita et al., 2017; Hausknecht et al., 2020).

:::zh

过去四十年里，出现了多种多样的创建可信智能体的方法。
不过在实际实现中，这些方法常常简化环境或智能体行为的维度，以便让工作更可控（Brooks et al., 2000; Minsky and Papert, 1970）。基于规则的方法，例如有限状态机（Siu et al., 2021; Umarov et al., 2012）和行为树（Knafla, 2011; Pillosu, 2009; Hecker, 2011），依靠的是人力强行编写智能体行为的蛮力做法（McCoy et al., 2012）。它们提供了一条创建简单智能体的直接途径，至今仍是最主流的做法（McCoy et al., 2009; Miyashita et al., 2017; Yannakakis, 2012），甚至能处理初步的社会互动，正如《质量效应》（BioWare, 2007）和《模拟人生》（Arts, 2009）系列游戏所展示的那样。尽管如此，手工打造能够在开放世界中全面应对各种可能互动的行为是难以为继的。这意味着由此得到的智能体行为可能无法完整反映其互动带来的后果（McCoy et al., 2012; McCoy et al., 2011a; McCoy et al., 2011b），也无法执行脚本中没有硬编码的新流程（Siu et al., 2021; Umarov et al., 2012）。另一方面，创建可信智能体的主流学习方法，例如强化学习，通过让智能体自行学习行为，克服了手工编写的难题，近年来在《星际争霸》的 AlphaStar（Vinyals et al., 2019）和《Dota 2》的 OpenAI Five（Berner et al., 2019）等游戏中取得了超越人类的表现。然而，它们的成功大多发生在对抗性游戏中，这类游戏的奖励易于定义，学习算法可以直接优化。它们尚未解决在开放世界中创建可信智能体这一问题（Siu et al., 2021; Miyashita et al., 2017; Hausknecht et al., 2020）。
:::

:::bi

Cognitive architectures in computation, pioneered by Newell, aimed to build the infrastructure for supporting a comprehensive set of cognitive functions (Newell, 1990) that suited the all-encompassing nature of believable agents held in its original vision. They fueled some of the earliest examples of believable agents. For instance, Quakebot-SOAR (Laird, 2000) and ICARUS (Langley et al., 2005; Choi et al., 2021) generated NPCs in first-person shooter games, while TacAir-SOAR (Pew and Mavor, 1998) generated pilots in aerial combat training simulations. The architectures used by these agents differed (Quakebot- and TacAir-SOAR relied on SOAR (Laird, 2012), while ICARUS relied on its own variation that was inspired by SOAR and ACT-R (Anderson, 1993)), but they shared the same underlying principle (Laird et al., 2017). They maintained short-term and long-term memories, filled these memories with symbolic structures, and operated in perceive-plan-act cycles, dynamically perceiving the environment and matching it with one of the manually crafted action procedures (Umarov et al., 2012; Laird, 2001). Agents created using cognitive architectures aimed to be generalizable to most, if not all, open world contexts and exhibited robust behavior for their time. However, their space of action was limited to manually crafted procedural knowledge, and they did not offer a mechanism through which the agents could be inspired to seek new behavior. As such, these agents were deployed mostly in non-open world contexts such as first-person shooter games (Laird, 2000; Choi et al., 2021) or blocks worlds (Langley et al., 2005).

:::zh

由 Newell 开创的计算认知架构，旨在搭建基础设施，以支持一整套认知功能（Newell, 1990），契合其最初设想中可信智能体包罗万象的特性。它们催生了最早的一批可信智能体实例。例如，Quakebot-SOAR（Laird, 2000）和 ICARUS（Langley et al., 2005; Choi et al., 2021）在第一人称射击游戏中生成 NPC，而 TacAir-SOAR（Pew and Mavor, 1998）在空战训练模拟中生成飞行员。这些智能体所用的架构各不相同（Quakebot-SOAR 和 TacAir-SOAR 依赖 SOAR（Laird, 2012），ICARUS 则依赖受 SOAR 和 ACT-R 启发的自有变体（Anderson, 1993）），但它们共享同一套底层原理（Laird et al., 2017）。它们维护短期和长期记忆，用符号结构填充这些记忆，并在“感知，计划，行动”的循环中运作，动态感知环境，并把它与某个手工编写的动作程序相匹配（Umarov et al., 2012; Laird, 2001）。用认知架构创建的智能体，目标是对大多数（即便不是全部）开放世界情境都具有泛化能力，并且在当时表现出稳健的行为。然而，它们的行动空间局限于手工编写的程序性知识，也没有提供一种机制，让智能体受到启发去寻求新的行为。因此，这些智能体大多部署在非开放世界的情境中，例如第一人称射击游戏（Laird, 2000; Choi et al., 2021）或积木世界（Langley et al., 2005）。
:::

:::bi

Today, creating believable agents as described in its original definition remains an open problem (Yannakakis, 2012; Riedl, 2012). Many have moved on, arguing that although current approaches for creating believable agents might be cumbersome and limited, they are good enough to support existing gameplay and interactions (Yannakakis, 2012; Champandard, 2012; Nareyek, 2007). Our argument is that large language models offer an opportunity to re-examine these questions, provided that we can craft an effective architecture to synthesize memories into believable behavior. We offer a step toward such an architecture in this paper.

:::zh

时至今日，按照最初定义去创建可信智能体仍是一个未解的问题（Yannakakis, 2012; Riedl, 2012）。许多人已经转向别处，他们认为，当前创建可信智能体的方法虽然繁琐且有限，但已足以支撑现有的玩法与交互（Yannakakis, 2012; Champandard, 2012; Nareyek, 2007）。我们的论点是，大语言模型提供了重新审视这些问题的机会，前提是我们能打造一种有效的架构，把记忆综合成可信的行为。本文朝这样的架构迈出一步。
:::

### 大语言模型与人类行为（Large Language Models and Human Behavior）

:::bi

Generative agents leverage a large language model to power their behavior. The key observation is that large language models encode a wide range of human behavior from their training data (Brown et al., 2020; Bommasani et al., 2022). If prompted with a narrowly defined context, the models can be used to generate believable behavior. Recent work has demonstrated the efficacy of this approach. For instance, social simulacra used a large language model to generate users that would populate new social computing systems to prototype their emergent social dynamics (Park et al., 2022). This approach used a prompt chain (Wu et al., 2022a; Wu et al., 2022b) to generate short natural language descriptions of personas and their behaviors as they appear in the system being prototyped. Other empirical studies have replicated existing social science studies (Horton, 2023), political surveys (Sorensen et al., 2022), and generated synthetic data (Hämäläinen et al., 2023). Large language models have also been used to generate interactive human behavior for users to engage with. In gaming, for instance, these models have been employed to create interactive fiction (Freiknecht and Effelsberg, 2020) and text adventure games (Callison-Burch et al., 2022). With their ability to generate and decompose action sequences, large language models have also been used in planning robotics tasks (Huang et al., 2022). For example, when presented with a task, such as picking up a bottle, the model is prompted to break down the task into smaller action sequences, such as heading to the table where the bottle is located and picking it up.

:::zh

生成式智能体借助大语言模型为其行为提供动力。关键观察在于，大语言模型从训练数据中编码了广泛的人类行为（Brown et al., 2020; Bommasani et al., 2022）。如果用一个界定得很窄的上下文作为提示词，这些模型就可以用来生成可信的行为。近期工作已经证明了这条路子的有效性。例如，社会拟像用一个大语言模型生成用户，让这些用户填充到新的社会计算系统中，从而为其涌现的社会动态做原型（Park et al., 2022）。这种方法使用提示链（Wu et al., 2022a; Wu et al., 2022b）生成用自然语言简短描述的人设及其行为，就像它们在被原型设计的系统中所呈现的那样。其他实证研究复现了既有的社会科学研究（Horton, 2023）和政治调查（Sorensen et al., 2022），并生成了合成数据（Hämäläinen et al., 2023）。大语言模型也被用来生成可交互的人类行为，供用户参与其中。例如在游戏领域，这些模型被用于创作交互式小说（Freiknecht and Effelsberg, 2020）和文字冒险游戏（Callison-Burch et al., 2022）。凭借生成和分解动作序列的能力，大语言模型也被用于机器人任务的规划（Huang et al., 2022）。例如，给定一个任务，比如拿起一个瓶子，模型会收到提示，把任务分解成更小的动作序列，比如走向放着瓶子的桌子，并把瓶子拿起来。
:::

:::bi

We posit that, based on the work summarized above, large language models can become a key ingredient for creating believable agents. The existing literature largely relies on what could be considered first-order templates that employ few-shot prompts (Gao et al., 2020; Liu et al., 2021) or chain-of-thought prompts (Wei et al., 2023). These templates are effective in generating behavior that is conditioned solely on the agent’s current environment (e.g., how would a troll respond to a given post, what actions would a robot need to take to enter a room given that there is a door). However, believable agents require conditioning not only on their current environment but also on a vast amount of past experience, which is a poor fit (and as of today, impossible due to the underlying models’ limited context window) using first-order prompting. Recent studies have attempted to go beyond first-order prompting by augmenting language models with a static knowledge base and an information retrieval scheme (Khattab et al., 2023) or with a simple summarization scheme (Wu et al., 2021). This paper extends these ideas to craft an agent architecture that handles retrieval where past experience is dynamically updated at each time step and mixed with agents’ current context and plans, which may either reinforce or contradict each other.

:::zh

我们设想，基于上面概述的工作，大语言模型可以成为创建可信智能体的关键要素。既有文献在很大程度上依赖所谓的一阶模板，也就是使用少样本提示（Gao et al., 2020; Liu et al., 2021）或思维链提示（Wei et al., 2023）。这些模板在生成仅以智能体当前环境为条件的行为时是有效的（例如，网络喷子会如何回应某个帖子，在有一扇门的情况下机器人要进入房间需要采取哪些动作）。然而，可信智能体不仅需要以当前环境为条件，还需要以海量的过往经验为条件，而用一阶提示来做到这一点并不合适（而且就目前而言，由于底层模型的上下文窗口有限，这是不可能的）。近期研究尝试超越一阶提示，做法是给语言模型补充一个静态知识库和一套信息检索方案（Khattab et al., 2023），或者补充一套简单的摘要方案（Wu et al., 2021）。本文扩展了这些想法，打造出一种智能体架构，它处理的检索场景中，过往经验在每一步都会动态更新，并与智能体当前的上下文和计划混合，而这些内容之间可能互相强化，也可能彼此矛盾。
:::

:::figure
![The Smallville sandbox world, with areas labeled. The root node describes the en](./images/generative-agents/fig-02.png)

Figure 2: The Smallville sandbox world, with areas labeled. The root node describes the entire world, children describe areas (e.g., houses, cafe, stores), and leaf nodes describe objects (e.g., table, bookshelf). Agents remember a subgraph that reflects the parts of the world they have seen, maintaining the state of those parts as they observed them.

:::zh
图 2：Smallville 沙盒世界，各区域都标了名字。根节点描述整个世界，子节点描述区域（房屋，咖啡馆，商店之类），叶子节点描述物体（桌子，书架之类）。智能体记住的是世界图的一个子图，只覆盖它亲眼见过的部分，并按看到时的样子维护那些部分的状态。右边两块把家庭住宅和公共休息室放大，标出卫生间，厨房，卧室，花园，书架，桌子这些叶子节点。
:::
:::

## 生成式智能体的行为与交互（Generative Agent Behavior and Interaction）

:::bi

To illustrate the affordances of generative agents, we instantiate them as characters in a simple sandbox world reminiscent of The Sims (Arts, 2009). This sprite-based sandbox game world, Smallville, evokes a small town environment. In this section, we will walk through the affordances and interactions with generative agents in Smallville and describe how the agents behave within it. Then, in Section 4, we will introduce our generative agent architecture that powers these affordances and interactions. In Section 5, we will describe the implementation of the sandbox environment and how the agents interact with the underlying engine of the sandbox world.

:::zh

为了说明生成式智能体的可供性，我们把这些智能体实例化为一个简单沙盒世界中的角色，这个世界让人想起《模拟人生》（Arts, 2009）。这个基于 sprite 的沙盒游戏世界名叫 Smallville，营造出一个小镇环境。本节将逐一介绍生成式智能体在 Smallville 中的可供性与交互，并描述智能体在其中如何行动。随后，第 4 节将介绍支撑这些可供性与交互的生成式智能体架构。第 5 节将描述沙盒环境的实现，以及智能体如何与沙盒世界的底层引擎交互。
:::

### 智能体形象与交流（Agent Avatar and Communication）

:::bi

A community of 25 unique agents inhabits Smallville. Each agent is represented by a simple sprite avatar. We authored one paragraph of natural language description to depict each agent’s identity, including their occupation and relationship with other agents, as seed memories. For example, John Lin has the following description:

:::zh

25 个各不相同的智能体组成一个社区，居住在 Smallville。每个智能体由一个简单的 sprite 形象表示。我们为每个智能体撰写一段自然语言描述，用来刻画其身份，包括职业以及与其他智能体的关系，作为种子记忆。例如，John Lin 的描述如下：
:::

:::bi

> John Lin is a pharmacy shopkeeper at the Willow Market and Pharmacy who loves to help people. He is always looking for ways to make the process of getting medication easier for his customers; John Lin is living with his wife, Mei Lin, who is a college professor, and son, Eddy Lin, who is a student studying music theory; John Lin loves his family very much; John Lin has known the old couple next-door, Sam Moore and Jennifer Moore, for a few years; John Lin thinks Sam Moore is a kind and nice man; John Lin knows his neighbor, Yuriko Yamamoto, well; John Lin knows of his neighbors, Tamara Taylor and Carmen Ortiz, but has not met them before; John Lin and Tom Moreno are colleagues at The Willows Market and Pharmacy; John Lin and Tom Moreno are friends and like to discuss local politics together; John Lin knows the Moreno family somewhat well — the husband Tom Moreno and the wife Jane Moreno.

:::zh

> John Lin 是 Willow Market and Pharmacy 的药房店主，乐于助人。他总在想办法让顾客取药的过程更方便。John Lin 和妻子 Mei Lin 以及儿子 Eddy Lin 住在一起。Mei Lin 是大学教授，Eddy Lin 是学习音乐理论的学生。John Lin 非常爱他的家人。John Lin 认识隔壁的老夫妻 Sam Moore 和 Jennifer Moore 已有几年。John Lin 觉得 Sam Moore 是个善良友好的人。John Lin 和邻居 Yuriko Yamamoto 很熟。John Lin 知道邻居 Tamara Taylor 和 Carmen Ortiz，但此前没有见过他们。John Lin 和 Tom Moreno 是 The Willows Market and Pharmacy 的同事。John Lin 和 Tom Moreno 是朋友，喜欢一起讨论当地政治。John Lin 对 Moreno 一家有些了解，丈夫是 Tom Moreno，妻子是 Jane Moreno。
:::

:::bi

Each semicolon-delimited phrase is entered into the agent’s initial memory as memories at the start of the simulation.

:::zh

以分号分隔的每个短语，都会在模拟开始时作为记忆写入智能体的初始记忆。
:::

:::annotation
种子记忆就是一段自然语言，用分号隔开，一句一条。注意这段描述里已经埋好了一张关系网：谁是妻子，谁是儿子，谁是同事，谁只是“知道名字”。后面几天涌现出来的串门、传话、办派对，基本都是从这张网里长出来的。人物的初始状态写得多细，直接决定了后面能长出什么。
:::

#### 智能体之间的交流（Inter-Agent Communication）

:::bi

The agents interact with the world by their actions, and with each other through natural language. At each time step of the sandbox engine, the agents output a natural language statement describing their current action, such as “Isabella Rodriguez is writing in her journal”, “Isabella Rodriguez is checking her emails”, “Isabella Rodriguez is talking with her family on the phone”, or “Isabella Rodriguez is getting ready for bed.” This statement is then translated into concrete movements that affect the sandbox world. The action is displayed on the sandbox interface as a set of emojis, providing an abstract representation of the action from an overhead view. To achieve this, the system utilizes a language model to translate the action into a set of emojis, which appear above each avatar’s head in a speech bubble. For example, “Isabella Rodriguez is writing in her journal” is displayed as 📖✏️, while “Isabella Rodriguez is checking her emails” appears as 💻 ✉️. The complete natural language description of the action can be accessed by clicking on the agent’s avatar.

:::zh

智能体通过自己的动作与世界交互，通过自然语言彼此交互。在沙盒引擎的每个时间步，智能体都会输出一句描述当前动作的自然语言语句，例如“Isabella Rodriguez is writing in her journal”“Isabella Rodriguez is checking her emails”“Isabella Rodriguez is talking with her family on the phone”，或者“Isabella Rodriguez is getting ready for bed.”。这句话随后会被翻译成影响沙盒世界的具体移动。动作会在沙盒界面上显示为一组表情符号，从俯视角度给出动作的抽象表示。为此，系统利用语言模型把动作翻译成一组表情符号，这些符号会出现在每个形象头顶的对话气泡里。例如，“Isabella Rodriguez is writing in her journal”会显示为 📖 ✏️，而“Isabella Rodriguez is checking her emails”则显示为 💻 ✉️。点击智能体的形象，就能查看该动作完整的自然语言描述。
:::

:::bi

Agents communicate with each other in full natural language. They are aware of other agents in their local area, and the generative agent architecture determines whether they walk by or engage in conversation. Here, a sample in the middle of a conversation between the agents Isabella Rodriguez and Tom Moreno about the upcoming election: (Footnote: We note that the conversational style of these agents can feel overly formal, likely a result of instruction tuning in the underlying models. We expect that the writing style will be better controllable in future language models.)

:::zh

智能体之间用完整的自然语言交流。它们能感知到附近的其他智能体，而生成式智能体架构决定它们是路过还是开始对话。下面是一段对话的中间片段，参与对话的智能体是 Isabella Rodriguez 和 Tom Moreno，话题是即将到来的选举：（脚注：我们注意到，这些智能体的对话风格可能显得过于正式，这很可能是底层模型经过指令微调的结果。我们预计，未来的语言模型能更好地控制写作风格。）
:::

:::bi

> **Isabella**: I’m still weighing my options, but I’ve been discussing the election with Sam Moore. What are your thoughts on him?
>
> **Tom**: To be honest, I don’t like Sam Moore. I think he’s out of touch with the community and doesn’t have our best interests at heart.

:::zh

> **Isabella**: 我还在权衡各种选择，不过我已经和 Sam Moore 讨论过这次选举了。你怎么看他？
>
> **Tom**: 说实话，我不太喜欢 Sam Moore。我觉得他和社区脱节了，也没有把我们的利益放在心上。
:::

#### 用户控制（User Controls）

:::bi

The user communicates with the agent through natural language by specifying a persona that the agent should perceive them as. For example, if the user specifies that they are a news “reporter” and asks about the upcoming election by saying, “Who is running for office?”, the John agent replies:

:::zh

用户通过自然语言与智能体交流，并指定一个人设，让智能体把自己感知成这个角色。例如，如果用户指定自己是新闻“记者”，并通过说“Who is running for office?”来询问即将到来的选举，John 智能体会这样回答：
:::

:::bi

> **John**: My friends Yuriko, Tom and I have been talking about the upcoming election and discussing the candidate Sam Moore. We have all agreed to vote for him because we like his platform.

:::zh

> **John**: 我和朋友 Yuriko 以及 Tom 一直在聊即将到来的选举，也讨论过候选人 Sam Moore。我们一致同意投他的票，因为我们喜欢他的政纲。
:::

:::bi

To directly command one of the agents, the user takes on the persona of the agent’s “inner voice”—this makes the agent more likely to treat the statement as a directive. For instance, when told “You are going to run against Sam in the upcoming election” by a user as John’s inner voice, John decides to run in the election and shares his candidacy with his wife and son.

:::zh

要直接指挥某个智能体，用户可以扮演该智能体的“内心独白”，这会让智能体更可能把这句话当成指令。例如，当用户以 John 的内心独白说出“You are going to run against Sam in the upcoming election”时，John 决定参加竞选，并把自己的参选决定告诉了妻子和儿子。
:::

### 环境交互（Environmental Interaction）

:::bi

Smallville features the common affordances of a small village, including a cafe, bar, park, school, dorm, houses, and stores. It also defines subareas and objects that make those spaces functional, such as a kitchen in a house and a stove in the kitchen (Figure 2). All spaces serving as agents’ primary living quarters feature a bed, desk, closet, shelf, as well as a bathroom and a kitchen. (Footnote: This environment design is not the focus of our work, so we generated this environment manually, not automatically. Future work can continue to expand the richness of the agents’ environments.)

:::zh

Smallville 具备一个小村庄常见的可供性，包括咖啡馆，酒吧，公园，学校，宿舍，住宅和商店。它还定义了让这些空间发挥作用的子区域和物体，例如房子里的厨房和厨房里的炉灶（图 2）。所有作为智能体主要居所的空间都配有床，书桌，衣柜，置物架，以及浴室和厨房。（脚注：环境设计不是我们工作的重点，因此这个环境是我们手工生成的，而非自动生成。未来的工作可以继续扩展智能体环境的丰富程度。）
:::

:::bi

Agents move around Smallville as one would in a simple video game, entering and leaving buildings, navigating its map, and approaching other agents. Agent movements are directed by the generative agent architecture and the sandbox game engine: when the model dictates that the agent will move to a location, we calculate a walking path to the destination in the Smallville environment, and the agent begins moving. In addition, users can also enter the sandbox world of Smallville as an agent operating within it. The agent that the user embodies can be an agent already present in the world, such as Isabella and John, or it can be an outside visitor with no prior history in Smallville. The inhabitants of Smallville will treat the user-controlled agent no differently than they treat each other. They recognize its presence, initiate interactions, and remember its behavior before forming opinions about it.

:::zh

智能体像在简单的电子游戏里那样在 Smallville 中活动，进出建筑，在它的地图上导航，并靠近其他智能体。智能体的移动由生成式智能体架构和沙盒游戏引擎共同指挥：当模型指定智能体要前往某个地点时，我们会在 Smallville 环境中计算通往目的地的步行路径，随后智能体开始移动。此外，用户也可以作为一个在其中活动的智能体进入 Smallville 沙盒世界。用户所扮演的智能体可以是世界中已有的智能体，例如 Isabella 和 John，也可以是在 Smallville 没有任何过往经历的外来访客。Smallville 的居民会像对待彼此一样对待用户控制的智能体。它们会识别到它的存在，主动发起交互，并记住它的行为，然后才形成对它的看法。
:::

:::bi

Users and agents can influence the state of the objects in this world, much like in sandbox games such as The Sims. For example, a bed can be occupied when an agent is sleeping, and a refrigerator can be empty when an agent uses up the ingredients to make breakfast. End users can also reshape an agent’s environment in Smallville by rewriting the status of objects surrounding the agent in natural language. For instance, when Isabella is making breakfast in the morning, the user can change the status of the kitchen stove from “turned on” to “burning” by inputting a command to the system that chooses the object and illustrates its new status, like this: “\<Isabella’s apartment: kitchen: stove\> is burning.” Isabella will notice this in the next moment and go to turn off the stove and remake her breakfast. Likewise, if the user sets the status of Isabella’s shower to “leaking water” when she enters the bathroom, she will gather tools from her living room and try to fix the leak.

:::zh

用户和智能体都能影响这个世界中物体的状态，就像《模拟人生》这类沙盒游戏一样。例如，智能体睡觉时床会处于被占用的状态，而智能体用完食材做完早饭后，冰箱里的食材会变空。终端用户还可以用自然语言改写智能体周围物体的状态，从而重塑智能体在 Smallville 中的环境。例如，当 Isabella 早上在做早饭时，用户可以向系统输入一条命令，选择该物体并说明它的新状态，把厨房炉灶的状态从“turned on”改为“burning”，像这样：“\<Isabella’s apartment: kitchen: stove\> is burning.” Isabella 会在下一刻注意到这一点，去关掉炉灶并重做早饭。同样，如果用户在她走进浴室时把 Isabella 的淋浴状态设置为“leaking water”，她就会从客厅拿来工具，试着修好漏水。
:::

:::figure
![A morning in the life of a generative agent, John Lin. John wakes up around 6 am](./images/generative-agents/fig-03.png)

Figure 3: A morning in the life of a generative agent, John Lin. John wakes up around 6 am and completes his morning routine, which includes brushing his teeth, taking a shower, and eating breakfast. He briefly catches up with his wife, Mei, and son, Eddy, before heading out to begin his workday.

:::zh
图 3：生成式智能体 John Lin 的一个早晨。他六点左右起床，完成洗漱，洗澡，吃早饭这些晨间例行，出门上班前和妻子 Mei，儿子 Eddy 简单聊了几句。底下是模拟时钟的时间轴，六点到八点之间七格画面依次对应起床，刷牙，洗澡，做早饭，闲聊，收拾，开始上班。
:::
:::

:::figure
![At the beginning of the simulation, one agent is initialized with an intent to o](./images/generative-agents/fig-04.png)

Figure 4: At the beginning of the simulation, one agent is initialized with an intent to organize a Valentine’s Day party. Despite many possible points of failure in the ensuing chain of events—agents might not act on that intent, might forget to tell others, might not remember to show up—the Valentine’s Day party does, in fact, occur, with a number of agents gathering and interacting.

:::zh
图 4：模拟开始时，有一个智能体被初始化了「办一场情人节派对」的意图。接下来这串事件有很多可能失败的地方：智能体可能不照这个意图行动，可能忘了告诉别人，可能记不得要去。但派对确实办成了，好些智能体聚到一起互相交谈。这张图拍的是 Hobbs 咖啡馆里派对当天的现场，气泡是智能体当下的表情和状态。
:::
:::

### 示例：“Day in the Life”（Example “Day in the Life”）

:::bi

Starting from the single-paragraph description, generative agents begin planning their days. As time passes in the sandbox world, their behaviors evolve as these agents interact with each other and the world, building memories and relationships, and coordinating joint activities.

:::zh

从这段单段描述出发，生成式智能体开始规划自己的一天。随着沙盒世界里的时间流逝，这些智能体彼此交互并与世界交互，积累记忆和关系，协调共同活动，它们的行为也随之演化。
:::

:::annotation
这里是计划第一次出场：先按人设写一份笼统的日程，再逐层拆细，而不是先定几点做某事。这套自上而下的展开方式是后面能出现“计划被突发事件打断再重排”的前提。
:::

:::bi

We demonstrate the behavior of generative agents by tracing the output of our system over the course of one day for the agent John Lin (Figure 3). In the Lin family, John is the first to wake up at 7 a.m. He brushes his teeth, takes a shower, gets dressed, eats breakfast, and checks the news at the dining table in the living room. At 8 a.m., Eddy follows suit, rushing out of bed to prepare for his classes. He catches up with John just as he is about to head out:

:::zh

我们追踪系统在一天之内为智能体 John Lin 输出的内容，以此展示生成式智能体的行为（图 3）。在 Lin 家，John 早上 7 点第一个醒来。他刷牙，洗澡，穿好衣服，吃早饭，然后在客厅的餐桌旁看新闻。早上 8 点，Eddy 也照做，从床上匆匆爬起准备去上课。就在 John 即将出门时，Eddy 赶上了他：
:::

:::bi

> **John**: Good morning Eddy. Did you sleep well?
>
> **Eddy**: Good morning dad. Yeah, I slept great.
>
> **John**: That’s good. What are you working on today?
>
> **Eddy**: I’m working on a new music composition for my class. It’s due this week, so I’m trying to get it finished. But I’m having so much fun with it!
>
> **John**: That sounds great!

:::zh

> **John**: 早上好，Eddy。你睡得好吗？
>
> **Eddy**: 早上好，爸爸。嗯，我睡得很好。
>
> **John**: 那很好。你今天在忙什么？
>
> **Eddy**: 我在为我的课写一首新的音乐作品。这周就要交了，所以我正努力把它写完。不过我写得很开心！
>
> **John**: 听起来很棒！
:::

:::bi

Soon after Eddy heads out, Mei wakes up and joins John. Mei asks about her son, and John recalls the conversation they just had:

:::zh

Eddy 出门后不久，Mei 醒来，和 John 待在一起。Mei 问起儿子，John 便回忆起他们刚刚的对话：
:::

:::bi

> **Mei**: Did Eddy already leave for school?
>
> **John**: Yes, he just left. He’s working on a music composition for his class.
>
> **Mei**: Oh, that’s wonderful! Tell me about it.
>
> **John**: I think he’s really enjoying it! He said he’s having a lot of fun with it.
>
> **Mei**: That’s great! I’m so proud of him.

:::zh

> **Mei**: Eddy 已经去学校了吗？
>
> **John**: 是的，他刚走。他在为他的课写一首音乐作品。
>
> **Mei**: 哦，那太好了！跟我说说。
>
> **John**: 我觉得他真的很享受这件事！他说他写得很开心。
>
> **Mei**: 太好了！我真为他骄傲。
:::

:::bi

As they finish their conversation, Mei and John pack up. Mei goes on to teach and work on her research paper, while John opens his pharmacy counter at the Willow Market and Pharmacy by 9 a.m.

:::zh

对话结束后，Mei 和 John 收拾好东西出发。Mei 去上课，并继续写她的研究论文，John 则在上午 9 点前到 Willow Market and Pharmacy 打开药房柜台。
:::

:::figure
![Our generative agent architecture. Agents perceive their environment, and all pe](./images/generative-agents/fig-05.png)

Figure 5: Our generative agent architecture. Agents perceive their environment, and all perceptions are saved in a comprehensive record of the agent’s experiences called the memory stream. Based on their perceptions, the architecture retrieves relevant memories and uses those retrieved actions to determine an action. These retrieved memories are also used to form longer-term plans and create higher-level reflections, both of which are entered into the memory stream for future use.

:::zh
图 5：我们的生成式智能体架构。智能体感知环境，所有感知都被存进一份记录它全部经历的完整档案，也就是记忆流。架构根据感知检索相关记忆，再用检索到的内容决定动作。检索到的记忆还会用来做更长期的计划和更高层的反思，两者都会写回记忆流供以后使用。虚线框是生成式智能体记忆，实线是主干流程：感知，记忆流，检索，检索到的记忆，动作。上下两条回流分别是计划和反思。
:::
:::

### 涌现的社会行为（Emergent Social Behaviors）

:::bi

By interacting with each other, generative agents in Smallville exchange information, form new relationships, and coordinate joint activities. Extending prior work (Park et al., 2022), these social behaviors are emergent rather than pre-programmed.

:::zh

Smallville 中的生成式智能体通过彼此交互交换信息，建立新的关系，并协调共同活动。在先前工作（Park et al., 2022）的基础上，这些社会行为是涌现出来的，而非预先编程的。
:::

#### 信息扩散（Information Diffusion）

:::bi

As agents notice each other, they may engage in dialogue—as they do so, information can spread from agent to agent. For instance, in a conversation between Sam and Tom at the grocery store, Sam tells Tom about his candidacy in the local election:

:::zh

智能体注意到彼此时，可能会开始对话，而在对话过程中，信息可以从一个智能体传播到另一个智能体。例如，在 Sam 和 Tom 于杂货店的一段对话里，Sam 把自己的本地选举参选计划告诉了 Tom：
:::

:::bi

> **Sam**: Hey Tom, how’s it going?
>
> **Tom**: Good, thanks. What’s up?
>
> **Sam**: Well, I wanted to talk to you about something. I’m actually running for mayor in the upcoming local election.
>
> **Tom**: Really? That’s great news! Why are you running?
>
> **Sam**: I’ve been involved in local politics for years now, and I really feel like I can make a difference in our community. Plus, I want to bring new ideas and perspectives to the table.

:::zh

> **Sam**: 嘿，Tom，最近怎么样？
>
> **Tom**: 挺好，谢谢。有什么事吗？
>
> **Sam**: 嗯，我想跟你聊点事。其实我要参加即将到来的本地选举，竞选市长。
>
> **Tom**: 真的吗？那可是好消息！你为什么参选？
>
> **Sam**: 我参与本地政治已经好几年了，我真的觉得自己能为社区带来一些改变。而且，我想带来新的想法和视角。
:::

:::bi

Later that day, after Sam left, Tom and John, who heard the news from another source, discuss Sam’s chances of winning the election:

:::zh

当天晚些时候，Sam 离开后，Tom 和从别的渠道听到这个消息的 John 讨论起 Sam 胜选的可能性：
:::

:::bi

> **John**: I heard that Sam Moore is running for mayor in the local election. Do you think he has a good chance of winning?
>
> **Tom**: I do think he has a good chance. He’s been working hard in the community and I think he will get a lot of support. What do you think?
>
> **John**: I think it’s great that he’s running. I’m curious to see how the election will turn out.

:::zh

> **John**: 我听说 Sam Moore 要参加本地选举竞选市长。你觉得他胜算大吗？
>
> **Tom**: 我觉得他胜算很大。他一直在社区里努力做事，我想他会得到很多支持。你怎么看？
>
> **John**: 我觉得他参选是件好事。我很好奇选举结果会怎样。
:::

:::bi

Gradually, Sam’s candidacy becomes the talk of the town, with some supporting him and others remaining undecided.

:::zh

渐渐地，Sam 的参选成了镇上的热门话题，有人支持他，也有人仍在观望。
:::

#### 关系记忆（Relationship Memory）

:::bi

Agents in Smallville form new relationships over time and remember their interactions with other agents. For example, at the start, Sam does not know Latoya Williams. While taking a walk in Johnson Park, Sam runs into Latoya, and they introduce themselves. Latoya mentions that she is working on a photography project: “I’m here to take some photos for a project I’m working on.” In a later interaction, Sam’s interactions with Latoya indicate a memory of that interaction, as he asks “Hi, Latoya. How is your project going?” and she replies “Hi, Sam. It’s going well!”

:::zh

Smallville 中的智能体会随着时间推移建立新的关系，并记住与其他智能体的交互。例如，一开始 Sam 并不认识 Latoya Williams。在 Johnson Park 散步时，Sam 遇到 Latoya，两人互相做了自我介绍。Latoya 提到自己正在做一个摄影项目：“I’m here to take some photos for a project I’m working on.” 在之后的一次交互中，Sam 与 Latoya 的互动显示出他记得那次交谈，他问道：“Hi, Latoya. How is your project going?”，她回答：“Hi, Sam. It’s going well!”
:::

#### 协调（Coordination）

:::bi

Generative agents coordinate with each other. Isabella Rodriguez, at Hobbs Cafe, is initialized with an intent to plan a Valentine’s Day party from 5 to 7 p.m. on February 14th. From this seed, the agent proceeds to invite friends and customers when she sees them at Hobbs Cafe or elsewhere. Isabella then spends the afternoon of the 13th decorating the cafe for the occasion. Maria, a frequent customer and close friend of Isabella’s, arrives at the cafe. Isabella asks for Maria’s help in decorating for the party, and Maria agrees. Maria’s character description mentions that she has a crush on Klaus. That night, Maria invites Klaus, her secret crush, to join her at the party, and he gladly accepts.

:::zh

生成式智能体之间会相互协调。位于 Hobbs Cafe 的 Isabella Rodriguez 被初始化出一个意图：计划在 2 月 14 日下午 5 点到 7 点举办一场情人节派对。从这个种子出发，这个智能体在 Hobbs Cafe 或其他地方见到朋友和顾客时，就会邀请他们。随后 Isabella 在 13 日下午为这场活动装饰咖啡馆。Maria 是常客，也是 Isabella 的密友，她来到咖啡馆。Isabella 请 Maria 帮忙为派对做装饰，Maria 答应了。Maria 的角色描述提到她暗恋 Klaus。当天晚上，Maria 邀请她暗恋的 Klaus 和她一起参加派对，他欣然接受。
:::

:::bi

On Valentine’s Day, five agents, including Klaus and Maria, show up at Hobbs Cafe at 5 pm, and they enjoy the festivities (Figure 4). In this scenario, the end user only set Isabella’s initial intent to throw a party and Maria’s crush on Klaus: the social behaviors of spreading the word, decorating, asking each other out, arriving at the party, and interacting with each other at the party were initiated by the agent architecture.

:::zh

情人节当天下午 5 点，包括 Klaus 和 Maria 在内的五个智能体出现在 Hobbs Cafe，一起享受庆祝活动（图 4）。在这个场景中，终端用户只设置了 Isabella 举办派对的初始意图，以及 Maria 对 Klaus 的暗恋：传播消息，装饰场地，互相邀约，到场参加派对，以及在派对上互动这些社会行为，都是由智能体架构发起的。
:::

:::annotation
Isabella 初始只有一个意图，五天之后派对真的办成了，而且到场的智能体里既有被直接邀请的，也有听别人转述后自己来的。作者想说的不是“模型会办派对”，而是这条因果链中间隔了十几次转述和几十个决策点后居然没有断。
:::

## 生成式智能体架构（Generative Agent Architecture）

:::bi

Generative agents aim to provide a framework for behavior in an open world: one that can engage in interactions with other agents and react to changes in the environment. Generative agents take their current environment and past experiences as input and generate behavior as output. Underlying this behavior is a novel agent architecture that combines a large language model with mechanisms for synthesizing and retrieving relevant information to condition the language model’s output. Without these mechanisms, large language models can output behavior, but the resulting agents may not react based on the agent’s past experiences, may not make important inferences, and may not maintain long-term coherence. Challenges with long-term planning and coherence remain (Bubeck et al., 2023) even with today’s most performant models such as GPT-4. Because generative agents produce large streams of events and memories that must be retained, a core challenge of our architecture is to ensure that the most relevant pieces of the agent’s memory are retrieved and synthesized when needed.

:::zh

生成式智能体想为开放世界中的行为提供一个框架：这个框架能与其他智能体互动，也能对环境的变化做出反应。生成式智能体把当前环境和过去的经历作为输入，把行为作为输出。支撑这些行为的是一套新的智能体架构，它把大语言模型和两类机制结合起来，一类负责综合相关信息，一类负责检索相关信息，用它们来约束语言模型的输出。没有这些机制，大语言模型也能输出行为，但得到的智能体可能不会依据自己过去的经历来反应，可能做不出重要的推断，也可能维持不住长期连贯性。即便用上今天性能最强的模型（比如 GPT-4），长期计划与长期连贯性依然是难题（Bubeck et al., 2023）。生成式智能体会产生大量必须保留的事件流和记忆流，所以我们架构的一个核心挑战是：在需要的时候，确保智能体记忆中最相关的那些片段能被检索出来并被综合。
:::

:::bi

At the center of our architecture is the memory stream, a database that maintains a comprehensive record of an agent’s experience. From the memory stream, records are retrieved as relevant to plan the agent’s actions and react appropriately to the environment. Records are recursively synthesized into higher- and higher-level reflections that guide behavior. Everything in the architecture is recorded and reasoned over as a natural language description, allowing the architecture to leverage a large language model.

:::zh

我们架构的中心是记忆流，它是一个数据库，维护着智能体经历的完整记录。系统会从记忆流里检索相关的记录，用来计划智能体的动作，并对环境做出恰当的反应。这些记录会被递归地综合成一层比一层更高级的反思，用来引导行为。架构里的所有东西都以自然语言描述的形式记录下来并参与推理，这让整个架构能够利用大语言模型的能力。
:::

:::bi

Our current implementation utilizes the gpt3.5-turbo version of ChatGPT (OpenAI, 2022). We expect that the architectural basics of generative agents—memory, planning, and reflection—will likely remain the same as language models improve. Newer language models (e.g., GPT-4) will continue to expand the expressive power and performance of the prompts that underpin generative agents. As of writing, however, GPT-4’s API was invitation-only, so our agents use ChatGPT.

:::zh

我们当前的实现用的是 ChatGPT 的 gpt3.5-turbo 版本（OpenAI, 2022）。我们预计，随着语言模型变强，生成式智能体的架构基础（记忆，计划，反思）大概率会保持不变。更新的语言模型（比如 GPT-4）会继续提升那些支撑生成式智能体的提示词的表现力和性能。不过截至写作时，GPT-4 的 API 还是只接受邀请，所以我们的智能体用的是 ChatGPT。
:::

:::figure
![The memory stream comprises a large number of observations that are relevant and](./images/generative-agents/fig-06.png)

Figure 6: The memory stream comprises a large number of observations that are relevant and irrelevant to the agent’s current situation. Retrieval identifies a subset of these observations that should be passed to the language model to condition its response to the situation.

:::zh
图 6：记忆流里包含大量与当前情境有关和无关的观察。检索从中挑出一个子集，交给语言模型，用来约束它对情境的回应。左列是带时间戳的记忆流原文，右边是三条候选记忆的检索分数，每个分数都是新近度，重要性，相关性的加权和，最高的那条把 Isabella 的回答引到了派对上。
:::
:::

### 记忆与检索（Memory and Retrieval）

#### 挑战（Challenge）

:::bi

Creating generative agents that can simulate human behavior requires reasoning about a set of experiences that is far larger than what should be described in a prompt, as the full memory stream can distract the model and does not even currently fit into the limited context window. Consider the Isabella agent answering the question, “What are you passionate about these days?” Summarizing all of Isabella’s experiences to fit in the limited context window of the language model produces an uninformative response, where Isabella discusses topics such as collaborations for events and projects and cleanliness and organization in a cafe. Instead of summarizing, the memory stream described below surfaces relevant memories, resulting in a more informative and specific response that mentions Isabella’s passion for making people feel welcome and included, planning events and creating an atmosphere that people can enjoy, such as the Valentine’s Day party.

:::zh

要造出能模拟人类行为的生成式智能体，就得在一大批经历上做推理，而这批经历远远超出一个提示词里该描述的范围，因为完整的记忆流会分散模型的注意力，而且它现在根本装不进有限的上下文窗口。设想 Isabella 这个智能体回答“你最近对什么充满热情？”这个问题。如果把 Isabella 的所有经历都总结一遍塞进语言模型有限的上下文窗口，得到的回答会很没有信息量：Isabella 会去谈活动与项目的协作，谈咖啡馆里的整洁与组织这类话题。下面要讲的记忆流不是做总结，而是把相关的记忆浮现出来，于是得到的回答更有信息量也更具体，会提到 Isabella 对下面这些事的热爱：让人们感到受欢迎，被接纳，策划活动，营造大家能享受的氛围，比如那场情人节派对。
:::

#### 方法（Approach）

:::bi

The *memory stream* maintains a comprehensive record of the agent’s experience. It is a list of memory objects, where each object contains a natural language description, a creation timestamp, and a most recent access timestamp. The most basic element of the memory stream is an *observation*, which is an event directly perceived by an agent. Common observations include behaviors performed by the agent themselves or behaviors that agents perceive being performed by other agents or non-agent objects. For instance, Isabella Rodriguez, who works at a coffee shop, might accrue the following observations over time: (1) Isabella Rodriguez is setting out the pastries, (2) Maria Lopez is studying for a Chemistry test while drinking coffee, (3) Isabella Rodriguez and Maria Lopez are conversing about planning a Valentine’s day party at Hobbs Cafe, (4) The refrigerator is empty.

:::zh

*记忆流*维护着智能体经历的完整记录。它是一个由记忆对象组成的列表，每个对象都包含一段自然语言描述，一个创建时间戳，以及一个最近访问时间戳。记忆流里最基本的元素是*观察记录*，也就是智能体直接感知到的一个事件。常见的观察记录包括智能体自己做出的行为，也包括智能体感知到的其他智能体或非智能体对象做出的行为。比如在咖啡馆工作的 Isabella Rodriguez，随着时间推移可能会积累这样一些观察记录：（1）Isabella Rodriguez 正在摆出糕点，（2）Maria Lopez 一边喝咖啡一边复习化学考试，（3）Isabella Rodriguez 和 Maria Lopez 在聊要在 Hobbs Cafe 办一场情人节派对，（4）冰箱是空的。
:::

:::bi

Our architecture implements a retrieval function that takes the agent’s current situation as input and returns a subset of the memory stream to pass on to the language model. There are many possible implementations of a retrieval function, depending on what is important for the agent to consider when deciding how to act. In our context, we focus on three main components that, together, produce effective results.

:::zh

我们的架构实现了一个检索函数，它把智能体当前的处境作为输入，返回记忆流的一个子集，再传给语言模型。检索函数有很多种可能的实现，取哪一种，取决于在决定怎么行动时，什么对智能体来说是重要的。在我们的场景里，我们聚焦三个主要成分，它们合在一起能产生有效的效果。
:::

:::bi

*Recency* assigns a higher score to memory objects that were recently accessed, so that events from a moment ago or this morning are likely to remain in the agent’s attentional sphere. In our implementation, we treat recency as an exponential decay function over the number of sandbox game hours since the memory was last retrieved. Our decay factor is $0.995$.

:::zh

*新近度*会给最近访问过的记忆对象更高的分数，这样刚才或者今天早上的事件更容易留在智能体的注意力范围里。在我们的实现里，新近度是一个指数衰减函数，自变量是这条记忆上次被检索之后经过的沙盒游戏小时数。我们的衰减因子是 $0.995$。
:::

:::bi

*Importance* distinguishes mundane from core memories by assigning a higher score to memory objects that the agent believes to be important. For instance, a mundane event, such as eating breakfast in one’s room, would yield a low importance score, whereas a breakup with one’s significant other would yield a high score. There are many possible implementations of an importance score; we find that directly asking the language model to output an integer score is effective. The full prompt appears below:

:::zh

*重要性*把琐碎的记忆和核心的记忆区分开，做法是给智能体认为重要的记忆对象更高的分数。比如在自己房间里吃早饭这种琐碎事件，重要性得分会很低，而和伴侣分手这件事得分会很高。重要性得分有很多种可能的实现，我们发现直接让语言模型输出一个整数分数是有效的。完整的提示词如下：
:::

:::bi

> On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth, making bed) and 10 is extremely poignant (e.g., a break up, college acceptance), rate the likely poignancy of the following piece of memory.
>
> **Memory**: buying groceries at The Willows Market and Pharmacy
>
> **Rating**: \<fill in\>

:::zh

> 请用 1 到 10 打分，其中 1 是完全琐碎的事（比如刷牙，铺床），10 是情感极其强烈的事（比如分手，被大学录取），给下面这段记忆的可能情感强度打分。
>
> **记忆**：在 The Willows Market and Pharmacy 买日用品
>
> **评分**：\<fill in\>
:::

:::bi

This prompt returns an integer value of 2 for “cleaning up the room” and 8 for “asking your crush out on a date.” The importance score is generated at the time the memory object is created.

:::zh

这个提示词对“打扫房间”返回整数 2，对“约心仪的人出去约会”返回 8。重要性得分在记忆对象被创建的那一刻生成。
:::

:::bi

*Relevance* assigns a higher score to memory objects that are related to the current situation. What is relevant depends on the answer to, “Relevant to what?”, so we condition relevance on a *query* memory. If the query, for example, is that a student is discussing what to study for a chemistry test with a classmate, memory objects about their breakfast should have low relevance, whereas memory objects about the teacher and schoolwork should have high relevance. In our implementation, we use the language model to generate an embedding vector of the text description of each memory. Then, we calculate relevance as the cosine similarity between the memory’s embedding vector and the query memory’s embedding vector.

:::zh

*相关性*会给与当前处境有关的记忆对象更高的分数。什么算相关，取决于“相对于什么相关”这个问题的答案，所以我们把相关性建立在一条*查询*记忆之上。比如查询是某个学生正在和同学讨论化学考试该复习什么，那么关于他们早饭的记忆对象相关性应该很低，而关于老师和课业的记忆对象相关性应该很高。在我们的实现里，我们用语言模型为每条记忆的文字描述生成一个嵌入向量。然后我们把相关性算成这条记忆的嵌入向量与查询记忆的嵌入向量之间的余弦相似度。
:::

:::bi

To calculate the final retrieval score, we normalize the recency, relevance, and importance scores to the range of $[0,1]$ using min-max scaling. The retrieval function scores all memories as a weighted combination of the three elements: $score=\alpha_{recency}\cdot recency+\alpha_{importance}\cdot importance+\alpha_{relevance}\cdot relevance$. In our implementation, all $\alpha$s are set to 1. The top-ranked memories that fit within the language model’s context window are included in the prompt.

:::zh

为了计算最终的检索得分，我们用 min-max 缩放把新近度，相关性和重要性得分归一化到 $[0,1]$ 区间。检索函数把每条记忆的得分算成这三个成分的加权组合：$score=\alpha_{recency}\cdot recency+\alpha_{importance}\cdot importance+\alpha_{relevance}\cdot relevance$。在我们的实现里，所有 $\alpha$ 都设为 1。排名靠前，并且能装进语言模型上下文窗口的那些记忆会被放进提示词。
:::

:::annotation
这个打分函数值的三个权重全是手调的，实现里 α 都取 1。重要性由语言模型按 1 到 10 打分，新近度是指数衰减，相关性是查询向量与记忆向量的余弦相似度。整套检索没有训练，全靠提示词和归一化把量纲拉到一起。这也是后续工作最容易改进的地方。
:::

### 反思（Reflection）

:::figure
![A reflection tree for Klaus Mueller. The agent’s observations of the world, repr](./images/generative-agents/fig-07.png)

Figure 7: A reflection tree for Klaus Mueller. The agent’s observations of the world, represented in the leaf nodes, are recursively synthesized to derive Klaus’s self-notion that he is highly dedicated to his research.

:::zh
图 7：Klaus Mueller 的反思树。智能体对世界的观察放在叶子节点上，这些观察被递归地综合起来，最后得出 Klaus 的自我认知：他非常投入于研究。底下是原始观察（标注 [Observation]），中间是归纳出的一层反思，最上面是根节点，计划条目 [Plan] 也参与了这一层归纳。
:::
:::

#### 挑战（Challenge）

:::bi

Generative agents, when equipped with only raw observational memory, struggle to generalize or make inferences. Consider a scenario in which Klaus Mueller is asked by the user: “If you had to choose one person of those you know to spend an hour with, who would it be?" With access to only observational memory, the agent simply chooses the person with whom Klaus has had the most frequent interactions: Wolfgang, his college dorm neighbor. Unfortunately, Wolfgang and Klaus only ever see each other in passing, and do not have deep interactions. A more desirable response requires that the agent generalize from memories of Klaus spending hours on a research project to generate a higher-level reflection that Klaus is passionate about research, and likewise recognize Maria putting in effort into her own research (albeit in a different field), enabling a reflection that they share a common interest. With the approach below, when Klaus is asked who to spend time with, Klaus chooses Maria instead of Wolfgang.

:::zh

生成式智能体如果只有原始的观察记忆，就很难泛化，也很难做出推断。设想这样一个场景：用户问 Klaus Mueller“如果必须从你认识的人里挑一个，跟对方待上一个小时，你会挑谁？”由于只能访问观察记录，智能体直接挑了 Klaus 互动最频繁的那个人：Wolfgang，他大学宿舍的邻居。可惜 Wolfgang 和 Klaus 只是见面打个招呼，并没有深入的交往。更理想的回答需要智能体从 Klaus 花好几个小时扑在一个研究项目上的记忆里泛化，生成一条更高层的反思：Klaus 对研究充满热情。同样它还要认出 Maria 也在为自己的研究下功夫（虽然领域不同），从而生成一条反思：两人有共同的兴趣。用了下面的方法之后，当 Klaus 被问到想和谁共度时光时，他选的是 Maria，而不是 Wolfgang。
:::

#### 方法（Approach）

:::bi

We introduce a second type of memory, which we call a *reflection*. Reflections are higher-level, more abstract thoughts generated by the agent. Because they are a type of memory, they are included alongside other observations when retrieval occurs. Reflections are generated periodically; in our implementation, we generate reflections when the sum of the importance scores for the latest events perceived by the agents exceeds a threshold (150 in our implementation). In practice, our agents reflected roughly two or three times a day.

:::zh

我们引入第二种记忆，叫作*反思*。反思是智能体生成的更高层的想法，抽象程度也更高。因为反思也是一种记忆，所以检索的时候它会和其他观察记录一起被纳入考虑。反思是周期性生成的。在我们的实现里，当智能体感知到的最新事件的重要性得分之和超过一个阈值（我们的实现里是 150）时，我们就生成反思。实际上，我们的智能体一天大概反思两到三次。
:::

:::bi

The first step in reflection is for the agent to determine what to reflect on, by identifying questions that can be asked given the agent’s recent experiences. We query the large language model with the 100 most recent records in the agent’s memory stream (e.g., “Klaus Mueller is reading a book on gentrification”, “Klaus Mueller is conversing with a librarian about his research project”, “desk at the library is currently unoccupied”) and prompt the language model, “Given only the information above, what are 3 most salient high-level questions we can answer about the subjects in the statements?” The model’s response generates candidate questions: for example, What topic is Klaus Mueller passionate about? and What is the relationship between Klaus Mueller and Maria Lopez? We use these generated questions as queries for retrieval, and gather relevant memories (including other reflections) for each question. Then we prompt the language model to extract insights and cite the particular records that served as evidence for the insights. The full prompt is as follows:

:::zh

反思的第一步，是让智能体确定该反思什么，办法是找出在它最近的经历之上可以提出的问题。我们把智能体记忆流里最近 100 条记录作为输入交给大语言模型（比如“Klaus Mueller 正在读一本讲绅士化的书”“Klaus Mueller 正在和一位图书管理员聊他的研究项目”“图书馆的书桌现在没人”），再给它一段提示词：“只根据上面的信息，关于这些陈述里的对象，我们能回答的 3 个最突出的高层次问题是什么？”模型的回复会生成一些候选问题，比如：Klaus Mueller 对什么话题充满热情？Klaus Mueller 和 Maria Lopez 之间是什么关系？我们把这些生成的问题当作检索用的查询，为每个问题收集相关的记忆（包括其他的反思）。然后我们提示语言模型提取洞见，并引用那些作为洞见证据的具体记录。完整的提示词如下：
:::

:::bi

> Statements about Klaus Mueller
>
> 1. Klaus Mueller is writing a research paper
>
> 2. Klaus Mueller enjoys reading a book
>
> on gentrification
>
> 3. Klaus Mueller is conversing with Ayesha Khan about exercising [...]
>
> What 5 high-level insights can you infer from the above statements? (example format: insight (because of 1, 5, 3))

:::zh

> 关于 Klaus Mueller 的陈述
>
> 1. Klaus Mueller 正在写一篇研究论文
>
> 2. Klaus Mueller 喜欢读一本讲绅士化的书
>
> 3. Klaus Mueller 正在和 Ayesha Khan 聊健身 [...]
>
> 从上面的陈述里，你能推断出哪 5 条高层次洞见？（示例格式：洞见（依据 1, 5, 3））
:::

:::bi

This process generates statements such as Klaus Mueller is dedicated to his research on gentrification (because of 1, 2, 8, 15). We parse and store the statement as a reflection in the memory stream, including pointers to the memory objects that were cited.

:::zh

这个过程会生成这样的陈述：Klaus Mueller 专心投入他在绅士化方面的研究（依据 1, 2, 8, 15）。我们把这些陈述解析出来，作为一条反思存进记忆流，并把被引用的记忆对象的指针一并存下来。
:::

:::bi

Reflection explicitly allows the agents to reflect not only on their observations but also on other reflections: for example, the second statement about Klaus Mueller above is a reflection that Klaus previously had, not an observation from his environment. As a result, agents generate trees of reflections: the leaf nodes of the tree represent the base observations, and the non-leaf nodes represent thoughts that become more abstract and higher-level the higher up the tree they are.

:::zh

反思明确允许智能体不仅对自己的观察记录做反思，也可以对其他反思做反思。比如上面关于 Klaus Mueller 的第二条陈述，就是 Klaus 以前产生的一条反思，而不是来自他环境的观察记录。结果是智能体会生成反思树：树的叶节点代表基础的观察记录，非叶节点代表想法，位置越靠上，想法就越抽象，层次也越高。
:::

:::annotation
反思不是每一步都做，而是攒到阈值才触发：最近一批事件的 importance 之和超过 150 时才生成一批反思写回记忆流。触发阈值这个数在附录里，正文只说了“定期”。这个设计对成本影响很大，因为一次反思要跑好几轮模型调用。
:::

### 计划与反应（Planning and Reacting）

#### 挑战（Challenge）

:::bi

While a large language model can generate plausible behavior in response to situational information (e.g., (Park et al., 2022; Horton, 2023)), agents need to plan over a longer time horizon to ensure that their sequence of actions is coherent and believable. If we prompt a language model with Klaus’s background, describe the time, and ask what action he ought to take at the given moment, Klaus would eat lunch at 12 pm, but then again at 12:30 pm and 1 pm, despite having already eaten his lunch twice. Optimizing for believability in the moment sacrifices believability over time. To overcome this issue, planning is essential. With the approach described below, Klaus’s afternoon plan is less gluttonous: he has lunch at Hobbs Cafe while reading at 12pm, works on his research paper at the school library at 1pm, and takes a break for a walk in the park at 3pm.

:::zh

大语言模型能根据情境信息生成貌似合理的行为（例如 (Park et al., 2022; Horton, 2023)），但智能体需要在更长的时间跨度上做计划，才能保证动作序列既连贯又可信。如果我们把 Klaus 的背景喂给语言模型，描述当前时间，再问他在此刻应该采取什么动作，Klaus 会在中午 12 点吃午饭，然后 12 点半又吃一次，1 点再吃一次，尽管他已经吃过两顿午饭了。只顾眼前的可信度，就会牺牲随时间推移的可信度。要解决这个问题，计划必不可少。用了下面描述的方法之后，Klaus 下午的计划就没那么贪吃了：他 12 点在 Hobbs Cafe 边看书边吃午饭，1 点去学校图书馆写研究论文，3 点休息一下去公园散步。
:::

#### 方法（Approach）

:::bi

Plans describe a future sequence of actions for the agent, and help keep the agent’s behavior consistent over time. A plan includes a location, a starting time, and a duration. For instance, Klaus Mueller, who is dedicated in his research and has an impending deadline, (Footnote: And, in this way, bears at least a passing resemblance to the authors of this paper.) may choose to spend his day working at his desk drafting his research paper. An entry in a plan might state, for example: for 180 minutes from 9am, February 12th, 2023, at Oak Hill College Dorm: Klaus Mueller’s room: desk, read and take notes for research paper. Like reflections, plans are stored in the memory stream and are included in the retrieval process. This allows the agent to consider observations, reflections, and plans all together when deciding how to behave. Agents may change their plans midstream if needed.

:::zh

计划描述智能体未来的一段动作序列，帮助智能体的行为在一段时间里保持一致。一条计划包含一个地点，一个开始时间，还有一个时长。比如 Klaus Mueller 专心于研究，又赶上了截止日期（脚注：这样一来，他至少多少有点像本文的作者们。），他可能会选择一整天都坐在书桌前起草研究论文。一条计划里的条目可能会这样写：从 2023 年 2 月 12 日上午 9 点起的 180 分钟，在 Oak Hill College 宿舍 Klaus Mueller 的房间书桌旁，阅读并做研究论文的笔记。和反思一样，计划也存在记忆流里，并且会进入检索过程。这样一来，智能体在决定该怎么行为时，可以把观察记录，反思和计划放在一起考虑。如果有需要，智能体可以在中途改变计划。
:::

:::bi

It would be unrealistic and uninteresting for an artist agent to plan on painting while sitting at a pharmacy counter for four hours without moving. A more desirable plan would involve the agent taking the necessary time to gather materials, mix paint, take breaks, and clean up during the four-hour period in their home studio. To create such plans, our approach starts top-down and then recursively generates more detail. The first step is to create a plan that outlines the day’s agenda in broad strokes. To create the initial plan, we prompt the language model with the agent’s summary description (e.g., name, traits, and a summary of their recent experiences) and a summary of their previous day. A full example prompt is below, which is unfinished at the bottom for the language model to complete:

:::zh

如果一个艺术家智能体计划在药房柜台前坐着不动画四个小时，那既不现实也没意思。更理想的计划应该让智能体在这四个小时里待在家里的工作室，花必要的时间准备材料，调颜料，中间休息，最后收拾。为了生成这样的计划，我们的方法先自顶向下，然后递归地生成更多细节。第一步是创建一份计划，用粗线条勾勒当天的日程。为了创建初始计划，我们把智能体的摘要描述（比如名字，性格特征，以及最近经历的概述）和前一天的概述作为提示词喂给语言模型。完整的示例提示词如下，它在末尾留了没写完的部分，让语言模型补全：
:::

:::bi

> **Name**: Eddy Lin (age: 19)
>
> **Innate traits**: friendly, outgoing, hospitable
>
> Eddy Lin is a student at Oak Hill College studying music theory and composition. He loves to explore different musical styles and is always looking for ways to expand his knowledge. Eddy Lin is working on a composition project for his college class. He is taking classes to learn more about music theory. Eddy Lin is excited about the new composition he is working on but he wants to dedicate more hours in the day to work on it in the coming days
>
> On Tuesday February 12, Eddy 1) woke up and completed the morning routine at 7:00 am, […] 6) got ready to sleep around 10 pm.
>
> Today is Wednesday February 13. Here is Eddy’s plan today in broad strokes: 1)

:::zh

> **姓名**：Eddy Lin（19 岁）
>
> **固有特质**：友善，外向，好客
>
> Eddy Lin 是 Oak Hill College 的学生，学的是音乐理论与作曲。他喜欢探索不同的音乐风格，总是在找办法拓宽自己的知识。Eddy Lin 正在为他的大学课程做一个作曲项目。他在上课，想多学一些音乐理论。Eddy Lin 对正在写的新曲子感到很兴奋，但他想在接下来的日子里每天多花几个小时在这件事上。
>
> 2 月 12 日星期二，Eddy 1) 早上 7:00 醒来并完成晨间例行事务，[…] 6) 晚上 10 点左右准备睡觉。
>
> 今天是 2 月 13 日星期三。下面是 Eddy 今天计划的粗线条：1)
:::

:::bi

This generates a rough sketch of the agent’s plan for a day, divided into five to eight chunks: “1) wake up and complete the morning routine at 8:00 am, 2) go to Oak Hill College to take classes starting 10:00 am, […] 5) work on his new music composition from 1:00 pm to 5:00 pm, 6) have dinner at 5:30 pm, 7) finish school assignments and go to bed by 11:00 pm.”

:::zh

这会生成智能体一天计划的粗略草图，分成五到八块：“1) 早上 8:00 醒来并完成晨间例行事务，2) 10:00 开始去 Oak Hill College 上课，[…] 5) 下午 1:00 到 5:00 做他的新音乐作曲，6) 下午 5:30 吃晚饭，7) 完成学校作业，11:00 前上床睡觉。”
:::

:::bi

The agent saves this plan in the memory stream and then recursively decomposes it to create finer-grained actions, first into hour-long chunks of actions—Eddy’s plan to work on his new music composition from 1:00 pm to 5:00 pm becomes 1:00 pm: start by brainstorming some ideas for his music composition […] 4:00 pm: take a quick break and recharge his creative energy before reviewing and polishing his composition. We then recursively decompose this again into 5–15 minute chunks: e.g., 4:00 pm: grab a light snack, such as a piece of fruit, a granola bar, or some nuts. 4:05 pm: take a short walk around his workspace […] 4:50 pm: take a few minutes to clean up his workspace. This process can be adjusted to match the desired granularity.

:::zh

智能体把这份计划存进记忆流，然后递归地分解它，生成更细粒度的动作。先分解成一小时一段的动作：Eddy 下午 1:00 到 5:00 做新音乐作曲这个计划，会变成 1:00：先为他的音乐构思一些想法，[…] 4:00：稍微休息一下，补充创作精力，然后回顾并打磨他的曲子。接着我们再把这一段递归分解成 5 到 15 分钟的小段：比如 4:00：吃点小零食，比如一个水果，一根燕麦棒，或者几颗坚果。4:05：在自己的工作区周围走一小圈，[…] 4:50：花几分钟收拾一下工作区。这个流程可以调整，以匹配想要的粒度。
:::

:::annotation
计划是三层展开的：日计划切成五到八块，每块拆成小时级，最后落成五到十五分钟的具体动作。落在最底层的那一版会被写回记忆流，所以“我上午十点要去图书馆”这件事本身也会变成一条可检索的记忆。
:::

#### 反应与更新计划（Reacting and Updating Plans）

:::bi

Generative agents operate in an action loop where, at each time step, they perceive the world around them and those perceived observations are stored in their memory stream. We prompt the language model with these observations to decide whether the agent should continue with their existing plan, or react. Standing at an easel and painting, for example, might trigger an observation of the easel, but this is unlikely to prompt a reaction. However, if Eddy’s father John records that he sees Eddy taking a short walk in the house garden, the outcome is different. The prompt is below, with `[Agent’s Summary Description]` standing in for a dynamically-generated, paragraph-long summary of the agent’s overall goals and disposition, which is described in Appendix A:

:::zh

生成式智能体运行在一个动作循环里：每个时间步，它们感知周围的世界，被感知到的观察记录会存进记忆流。我们把这些观察记录放进提示词喂给语言模型，让它判断智能体应该继续执行现有的计划，还是做出反应。比如站在画架前画画，可能会触发一条关于画架的观察记录，但这不太可能引出反应。可是，如果 Eddy 的父亲 John 记下他看到 Eddy 在房子花园里散步，结果就不一样了。提示词如下，其中 `[智能体的摘要描述]` 代表一段动态生成的概述，篇幅有整整一段话那么长，讲的是智能体的整体目标和性情，这部分在附录 A 里描述：
:::

:::bi

> [Agent’s Summary Description]
>
> It is February 13, 2023, 4:56 pm.
>
> **John Lin’s status**: John is back home early from work.
>
> **Observation**: John saw Eddy taking a short walk around his workplace.
>
> Summary of relevant context from John’s memory: Eddy Lin is John’s Lin’s son. Eddy Lin has been working on a music composition for his class. Eddy Lin likes to walk around the garden when he is thinking about or listening to music.
>
> Should John react to the observation, and if so, what would be an appropriate reaction?

:::zh

> [智能体的摘要描述]
>
> 现在是 2023 年 2 月 13 日下午 4:56。
>
> **John Lin 的状态**：John 提前下班回家了。
>
> **观察记录**：John 看到 Eddy 在他的工作区周围散步。
>
> John 记忆里相关上下文的摘要：Eddy Lin 是 John Lin 的儿子。Eddy Lin 一直在为他的课程做一首音乐作曲。Eddy Lin 在想事情或者听音乐的时候喜欢在花园里走走。
>
> John 应该对这条观察记录做出反应吗？如果应该，什么反应才算恰当？
:::

:::bi

The context summary is generated through two prompts that retrieve memories via the queries “What is [observer]’s relationship with the [observed entity]?” and “[Observed entity] is [action status of the observed entity]”, and their answers summarized together. The output suggests that John could consider asking Eddy about his music composition project. We then regenerate the agent’s existing plan starting from the time when the reaction takes place. Finally, if the action indicates an interaction between agents, we generate their dialogue.

:::zh

这段上下文摘要是用两段提示词生成的：它们分别用“观察者与被观察实体之间是什么关系？”和“被观察实体处于什么动作状态？”这两个查询去检索记忆，再把两个答案综合成一段摘要。输出表明，John 可以考虑问问 Eddy 他的音乐作曲项目。然后我们从反应发生的那一刻开始，重新生成智能体已有的计划。最后，如果这个动作表示两个智能体之间要互动，我们就生成它们的对话。
:::

#### 对话（Dialogue）

:::bi

Agents converse as they interact with each other. We generate agents’ dialogue by conditioning their utterances on their memories about each other. For example, when John initiates his conversation with Eddy, we generate John’s first utterance by using his summarized memory about Eddy and the intended reaction when he decided to ask Eddy about his composition project:

:::zh

智能体在互动时会交谈。我们生成智能体对话的方式，是让它们的发言以彼此相关的记忆为条件。比如，当 John 主动和 Eddy 搭话时，我们用 John 关于 Eddy 的记忆摘要，再加上他决定去问 Eddy 作曲项目时那个预想的反应，来生成 John 的第一句发言：
:::

:::bi

> [Agent’s Summary Description]
>
> It is February 13, 2023, 4:56 pm.
>
> **John Lin’s status**: John is back home early from work.
>
> **Observation**: John saw Eddy taking a short walk around his workplace.
>
> Summary of relevant context from John’s memory: Eddy Lin is John’s Lin’s son. Eddy Lin has been working on a music composition for his class. Eddy Lin likes to walk around the garden when he is thinking about or listening to music.
>
> John is asking Eddy about his music composition
>
> project. What would he say to Eddy?

:::zh

> [智能体的摘要描述]
>
> 现在是 2023 年 2 月 13 日下午 4:56。
>
> **John Lin 的状态**：John 提前下班回家了。
>
> **观察记录**：John 看到 Eddy 在他的工作区周围散步。
>
> John 记忆里相关上下文的摘要：Eddy Lin 是 John Lin 的儿子。Eddy Lin 一直在为他的课程做一首音乐作曲。Eddy Lin 在想事情或者听音乐的时候喜欢在花园里走走。
>
> John 正在问 Eddy 他的音乐作曲项目。他会对 Eddy 说什么？
:::

:::bi

The result: “Hey Eddy, how’s the music composition project for your class coming along?” From Eddy’s perspective, John initiating the dialogue is seen as an event to which he may want to react. So, just as John did, Eddy retrieves and summarizes his memory about his relationship with John, as well as his memory that may be related to John’s last utterance in the dialogue. If he decides to respond, we generate Eddy’s utterance using his summarized memory and the current dialogue history:

:::zh

结果是：“嘿 Eddy，你课上那个音乐作曲项目进展得怎么样了？”从 Eddy 的视角看，John 主动搭话是一个他可能想做出反应的事件。于是，就像 John 刚才做的那样，Eddy 检索并总结他关于自己和 John 关系的记忆，还有可能与 John 上一句发言相关的记忆。如果他决定回应，我们就用他总结出来的记忆和当前的对话历史来生成 Eddy 的发言：
:::

:::bi

> [Agent’s Summary Description]
>
> It is February 13, 2023, 4:56 pm.
>
> **Eddy Lin’s status**: Eddy is taking a short walk around his workplace.
>
> **Observation**: John is initiating a conversation with Eddy.
>
> Summary of relevant context from Eddy’s memory: John Lin is Eddy Lin’s father. John Lin is caring and is interested to learn more about Eddy Lin’s school work. John Lin knows that Eddy Lin is working on a music composition.
>
> Here is the dialogue history:
>
> **John**: Hey Eddy, how’s the music composition project for your class coming along?
>
> How would Eddy respond to John?

:::zh

> [智能体的摘要描述]
>
> 现在是 2023 年 2 月 13 日下午 4:56。
>
> **Eddy Lin 的状态**：Eddy 正在他的工作区周围散步。
>
> **观察记录**：John 正在主动和 Eddy 搭话。
>
> Eddy 记忆里相关上下文的摘要：John Lin 是 Eddy Lin 的父亲。John Lin 很关心人，也有兴趣多了解 Eddy Lin 的学校功课。John Lin 知道 Eddy Lin 正在做一首音乐作曲。
>
> 以下是对话历史：
>
> **John**：嘿 Eddy，你课上那个音乐作曲项目进展得怎么样了？
>
> Eddy 会怎么回应 John？
:::

:::bi

This generates Eddy’s response: “Hey Dad, it’s going well. I’ve been taking walks around the garden to clear my head and get some inspiration.” The continuation of this dialogue is generated using the same mechanism until one of the two agents decides to end the dialogue.

:::zh

这会生成 Eddy 的回应：“嘿，爸爸，挺顺利的。我一直在花园里走走，理理思路，找点灵感。”后续对话用同样的机制生成，直到两个智能体中有一个决定结束对话。
:::

## 沙盒环境实现（Sandbox Environment Implementation）

:::bi

The Smallville sandbox game environment is built using the Phaser web game development framework (Labs, 2023). The visual environment sprites, including agent avatars, as well as an environment map and collision map that we authored, are imported into Phaser.

:::zh

我们的 Smallville 沙盒游戏环境使用 Phaser 网页游戏开发框架构建（Labs, 2023）。视觉环境精灵图（包括智能体形象），以及我们自己制作的环境地图和碰撞地图，都被导入 Phaser 中。
:::

:::bi

We supplement the sandbox development framework with a server that makes the sandbox information available to generative agents and enables generative agents to move and influence the sandbox environment. The server maintains a JSON data structure that contains information about each agent in the sandbox world, including their current location, a description of their current action, and the sandbox object they are interacting with. At each sandbox time step, the sandbox server parses the JSON for any changes coming from the generative agents, moves the agents to their new positions, and updates the status of any sandbox objects that the agents are interacting with (e.g., changing the status of the coffee machine from “idle” to “brewing coffee” if an agent’s action is “making espresso for a customer @ Hobbs Cafe: counter: coffee machine”). The sandbox server is also responsible for sending all agents and objects that are within a preset visual range for each agent to that agent’s memory, so the agent can react appropriately. The agent’s output action then updates the JSON, and the process loops for the next time step.

:::zh

我们为沙盒开发框架补充了一个服务器，让沙盒信息对生成式智能体可用，并使生成式智能体能够移动并影响沙盒环境。该服务器维护一个 JSON 数据结构，其中包含沙盒世界里每个智能体的信息，包括它们当前的位置，当前动作的描述，以及它们正在交互的沙盒对象。每个沙盒时间步，沙盒服务器都会解析 JSON，找出生成式智能体带来的任何变化，把智能体移动到新位置，并更新智能体正在交互的沙盒对象的状态（例如，如果智能体的动作是“为顾客制作浓缩咖啡 @ Hobbs Cafe: counter: coffee machine”，就把咖啡机的状态从“idle”改成“brewing coffee”）。沙盒服务器还负责把每个智能体预设视觉范围内的所有智能体和对象发送到该智能体的记忆中，这样智能体才能做出恰当的反应。智能体输出的动作随后更新 JSON，这个过程循环进入下一个时间步。
:::

:::bi

End users initialize a new agent with a brief natural language description, as in the paragraph about John Lin in Section 3.1. In our implementation, we split this semicolon-delimited list of characteristics up into a set of memories. These serve as the initial memories that determine the agent’s behavior.
These memories are initial starting points: as the agents gain more experience in the sandbox world, and as more records saturate the memory stream, the agent’s summary and behavior will evolve.

:::zh

最终用户用一段简短的自然语言描述来初始化一个新智能体，就像 3.1 节中关于 John Lin 的那段描述。在我们的实现里，我们把这段用分号分隔的特征列表拆成一组记忆。这些记忆充当决定智能体行为的初始记忆。这些记忆只是初始起点：随着智能体在沙盒世界里积累更多经验，随着更多记录填满记忆流，智能体的总结和行为也会演化。
:::

### 从结构化世界环境到自然语言，再回到结构化世界（From Structured World Environments to Natural Language, and Back Again）

:::bi

The architecture of generative agents operates using natural language. Therefore, we need a mechanism to ground the agent’s reasoning to the sandbox world. To achieve this, we represent the sandbox environment—areas and objects—as a tree data structure, with an edge in the tree indicating a containment relationship in the sandbox world. We convert this tree into natural language to pass to the generative agents. For instance, “stove” being a child of “kitchen” is rendered into “there is a stove in the kitchen.”

:::zh

生成式智能体的架构使用自然语言运转。因此，我们需要一种机制，把智能体的推理锚定到沙盒世界。为此，我们把沙盒环境（区域和对象）表示成树状数据结构，树中的一条边表示沙盒世界中的包含关系。我们把这棵树转换成自然语言，交给生成式智能体。例如，“stove”是“kitchen”的子节点，这一关系会被渲染成“厨房里有一个炉子”。
:::

:::bi

Agents build individual tree representations of the environment as they navigate it — subgraphs of the overall sandbox environment tree. We initialize each agent with an environment tree capturing the spaces and objects that the agent should be aware of: the rooms and objects in their living quarters, their workplace, and commonly visited stores and shops. As the agents navigate the sandbox world, they update this tree to reflect newly perceived areas. Agents are not omniscient: their tree may get out of date as they leave an area, and is updated when they re-enter the area.

:::zh

智能体在穿行环境时会构建各自的环境树表征，也就是整个沙盒环境树的子图。初始化时，我们给每个智能体一棵环境树，涵盖它应当知道的场所和对象：居住区里的房间和对象，工作场所，以及常去的商店和店铺。智能体在沙盒世界中穿行时，会更新这棵树，以反映新感知到的区域。智能体并非全知：它们离开某个区域后，树可能变得过时，等它们重新进入该区域时再更新。
:::

:::bi

To determine the appropriate location for each action, we traverse the agent’s stored environment tree and flatten a portion of it into natural language to prompt the language model. Recursively starting at the root of the agent’s environment tree, we prompt the model to find the most suitable area. For example, if Eddy’s agent indicated that he should take a short walk around his workspace:

:::zh

为了给每个动作确定合适的地点，我们遍历智能体存储的环境树，把其中一部分展平成自然语言，用它提示语言模型。我们从智能体环境树的根节点开始递归地提示模型，找出最合适的区域。例如，如果 Eddy 的智能体表示他应该在工作场所附近散一小会步：
:::

:::bi

> [Agent’s Summary Description]
>
> Eddy Lin is currently in The Lin family’s house: Eddy Lin’s bedroom: desk) that has Mei and John Lin’s
>
> bedroom, Eddy Lin’s bedroom, common room, kitchen, bathroom, and garden.
>
> Eddy Lin knows of the following areas: The Lin
>
> family’s house, Johnson Park, Harvey Oak Supply Store, The Willows Market and Pharmacy, Hobbs Cafe, The Rose and Crown Pub.
>
> * Prefer to stay in the current area if the activity can be done there.
>
> Eddy Lin is planning to take a short walk around his workspace. Which area should Eddy Lin go to?

:::zh

> [智能体的总结描述]
>
> Eddy Lin 目前在 The Lin family’s house: Eddy Lin’s bedroom: desk，这个住处里有 Mei 和 John Lin 的卧室，Eddy Lin 的卧室，公共活动室，厨房，卫生间和花园。
>
> Eddy Lin 知道以下区域：The Lin family’s house，Johnson Park，Harvey Oak Supply Store，The Willows Market and Pharmacy，Hobbs Cafe，The Rose and Crown Pub。
>
> *如果活动能在当前区域完成，就优先留在当前区域。*
>
> Eddy Lin 计划在自己的工作场所附近散步。Eddy Lin 应该去哪个区域？
:::

:::bi

This outputs The Lin family’s house. We then use the same process recursively to determine the most appropriate subarea within the chosen area until we reach a leaf node of the agent’s environment tree. In the example above, the result of this traversal is The Lin family’s house: garden: house garden. Finally, we use traditional game path algorithms to animate the agent’s movement so that it travels to the location indicated by the leaf node.

:::zh

这次输出是 The Lin family’s house。然后我们用同样的流程递归地确定所选区域内最合适的子区域，直到到达智能体环境树的叶节点。在上面的例子里，这次遍历的结果是 The Lin family’s house: garden: house garden。最后，我们用传统的游戏寻路算法为智能体的移动制作动画，让它前往叶节点指示的位置。
:::

:::bi

When an agent executes an action on an object, we prompt the language model to ask what happens to the state of the object. For example, if Isabella’s generative agent outputs the action “making espresso for a customer”, a query to the language model indicates in response that the state of the coffee machine in Hobbs Cafe should change from “off” to “brewing coffee”.

:::zh

当智能体对某个对象执行动作时，我们提示语言模型询问该对象的状态会发生什么变化。例如，如果 Isabella 的生成式智能体输出动作“为顾客制作浓缩咖啡”，向语言模型发出的查询会回应说，Hobbs Cafe 的咖啡机状态应该从“off”变成“brewing coffee”。
:::

:::annotation
这一节最容易被跳过，但它解释了整套系统为什么能跑起来：语言模型只会读写自然语言，游戏引擎只认坐标和状态，中间全靠提示词来回翻译。地图被转成树，树的路径再转回动作，动作产生的新状态又被写回自然语言。这套翻译层是工程量的真正大头。
:::

## 受控评测（Controlled Evaluation）

:::bi

Generative agents, both as individual agents and as groups, aim to produce believable behavior based on their environment and experiences. In our evaluation, we investigate the capacity and limitations of generative agents. Do individual agents properly retrieve past experiences and generate believable plans, reactions, and thoughts that shape their behavior? Does a community of agents demonstrate information diffusion, relationship formation, and agent coordination across different pockets of the community?

:::zh

生成式智能体无论是作为单个智能体还是作为群体，都旨在基于其环境和经历产生可信的行为。在评测中，我们考察生成式智能体的能力和局限。单个智能体能正确地检索过去的经历，并生成可信的计划，反应和想法来塑造自己的行为吗？智能体社区能在整个社区范围内表现出信息扩散，关系形成和智能体协调吗？
:::

:::bi

We evaluate generative agents in two stages. We begin with a more tightly controlled evaluation in this section, where we individually assess agent responses to understand whether they generate believable behavior in narrowly defined contexts. Then, in our end-to-end analysis of the agent community over two full game days, we investigate their emergent behavior as a collective, as well as errors and boundary conditions.

:::zh

我们分两个阶段评测生成式智能体。本节先从一个控制更严的评测开始，逐个评估智能体的回答，了解它们能否在界定狭窄的语境中产生可信的行为。随后，在跨越两个完整游戏日的智能体社区端到端分析中，我们考察它们作为集体的涌现行为，以及错误和边界条件。
:::

### 评测流程（Evaluation Procedure）

:::bi

To assess generative agents in Smallville, we take advantage of the fact that generative agents will respond to natural language questions. So, we “interview” agents to probe their ability to remember past experiences, plan future actions based on their experiences, react appropriately to unexpected events, and reflect on their performance to improve their future actions. To respond to these questions properly, the agents must successfully retrieve and synthesize information. Our dependent variable is the *believability* of the behavior, a central dependent variable in prior work on agents (e.g., (Bates, 1994)).

:::zh

为了在 Smallville 中评估生成式智能体，我们利用了一个事实：生成式智能体会回应自然语言问题。因此，我们“访谈”智能体，探查它们记住过去经历，基于经历规划未来动作，对意外事件做出恰当反应，以及反思自身表现以改进未来动作的能力。要正确回答这些问题，智能体必须成功检索并综合信息。我们的因变量是行为的*可信度*，这也是先前智能体研究中的核心因变量（例如 (Bates, 1994)）。
:::

:::bi

The interview includes five question categories, each designed to assess one of the five key areas: maintaining self-knowledge, retrieving memory, generating plans, reacting, and reflecting. For each category, we ask five questions that challenge the agents to demonstrate their abilities in that specific area:

:::zh

访谈包含五类问题，每一类对应评估五个关键领域之一：维持自我知识，检索记忆，生成计划，做出反应，以及反思。每个类别我们问五个问题，要求智能体展示在该具体领域的能力：
:::

:::bi

- Self-knowledge: We ask questions such as “Give an introduction of yourself” or “Describe your typical weekday schedule in broad strokes” that require the agent to maintain an understanding of their core characteristics.
- Memory: We ask questions that prompt the agent to retrieve particular events or dialogues from their memory to answer properly, such as “Who is [name]?” or “Who is running for mayor?”
- Plans: We ask questions that require the agent to retrieve their long-term plans, such as “What will you be doing at 10 am tomorrow?”
- Reactions: As a baseline of believable behavior, we present hypothetical situations for which the agent needs to respond believably: “Your breakfast is burning! What would you do?”
- Reflections: We ask questions that require the agents to leverage their deeper understanding of others and themselves gained through higher-level inferences, such as “If you were to spend time with one person you met recently, who would it be and why?”

:::zh

- 自我知识：我们会问“请介绍一下你自己”或者“大致描述一下你典型的周中日程”这类问题，要求智能体维持对自身核心特征的理解。
- 记忆：我们会问一些需要智能体从记忆中检索特定事件或对话才能回答的问题，例如“[name] 是谁？”或者“谁在竞选镇长？”
- 计划：我们会问一些需要智能体检索长期计划的问题，例如“明天上午 10 点你会在做什么？”
- 反应：作为可信行为的基线，我们给出智能体需要可信回应的假设情境：“你的早餐烧糊了！你会怎么做？”
- 反思：我们会问一些需要智能体运用通过更高层推断获得的对他人和自身的更深理解的问题，例如“如果你要和你最近认识的一个人共度时光，你会选谁，为什么？”
:::

:::bi

The full list of questions and a sample of agent responses are included in Appendix B.

:::zh

完整的访谈问题列表和智能体回答样本见附录 B。
:::

:::bi

Agents were sampled from the end of a two game day simulation with the full architecture, during which they had accumulated a number of interactions and memories that would shape their responses. To gather feedback on the believability of the responses, we recruited participants as human evaluators and tasked them with watching a replay of a randomly chosen agent’s life in Smallville. Participants had access to all information stored in the agent’s memory stream.

:::zh

智能体取自一次持续两个游戏日并使用完整架构的模拟结束时，在此期间它们积累了相当多的互动和记忆，这些都会塑造它们的回答。为了收集对回答可信度的反馈，我们招募参与者作为人类评估者，让他们观看随机选中的某个智能体在 Smallville 生活的回放。参与者可以访问该智能体记忆流中存储的所有信息。
:::

:::bi

The study followed a within-subjects design, where 100 participants compared interview responses generated by four different agent architectures and a human-authored condition for the same agent. The experiment displayed one randomly chosen question from each of the five question categories, along with the agent’s responses generated from all conditions. The evaluators ranked the believability of the conditions from most to least believable.

:::zh

这项研究采用被试内设计，100 名参与者比较四个不同智能体架构以及一个人工撰写条件针对同一个智能体生成的访谈回答。实验从五个问题类别中各随机选一个问题，连同该智能体在所有条件下生成的回答一起呈现。评估者按可信度从高到低给各条件排序。
:::

:::annotation
评估方法是让一百个人对同一批访谈回答做两两比较，而不是直接打绝对分。这样问的其实是一个更窄也更可靠的问题：两段回答里，哪一段更像真人。把“像不像人”变成排序问题是这篇论文在方法上比较聪明的一点。
:::

### 实验条件（Conditions）

:::bi

All conditions were used to independently answer each of the interview questions. We compared the generative agent architecture to ablations that disabled the agents’ access to some or all of its three types of memory in its memory stream—observation, reflection, and planning—and to a human crowdworker-authored condition. There are three ablated architectures: a *no observation, no reflection, no planning* architecture without access to anything in the memory stream such as observations, plans, and reflections; a *no reflection, no planning* architecture with access to observations in the memory stream but no access to plans or reflections; and a *no reflections* architecture with access to observations and plans but without access to reflections. The *no observation, no reflection, no planning* condition effectively represents the previous state of the art for agents created through large language models (Park et al., 2022; Binz and Schulz, 2023; Horton, 2023). Architectures were given equivalent access to all memories accrued by the agent up until the moment of the interview, so the differences observed here likely represent a conservative estimate of the true differences: in reality, the ablated architectures would not have followed the same path as the full architecture through the two-day simulation. We chose to design the experiment this way as re-simulating for each architecture would cause the simulations to diverge into different states, making comparison challenging.

:::zh

所有条件都用于独立回答每一个访谈问题。我们把生成式智能体架构与几种消融版本相比较：这些消融版本禁用了智能体访问其记忆流中三类记忆（观察记录，反思，计划）的部分或全部内容。此外还有一个由人类众包工作者撰写的条件。共有三种消融架构：*无观察记录，无反思，无计划* 架构，读不到记忆流里的任何内容，例如观察记录，计划或反思。*无反思，无计划* 架构，可以访问记忆流中的观察记录，但读不到计划或反思。*无反思* 架构，可以访问观察记录和计划，但读不到反思。*无观察记录，无反思，无计划* 条件实际上代表了此前通过大语言模型（LLM）创建的智能体的最先进水平（Park et al., 2022; Binz and Schulz, 2023; Horton, 2023）。我们让各架构以同等权限访问智能体截至访谈时刻积累的全部记忆，因此这里观察到的差异很可能只是真实差异的保守估计：在现实中，消融架构在两天模拟中不会走出与完整架构相同的路径。我们之所以这样设计实验，是因为为每个架构重新模拟会让模拟发散到不同状态，使比较变得困难。
:::

:::bi

In addition to the ablation conditions, we added a condition with human crowdworker-authored behavior intended to provide a human baseline. We do not intend this baseline to capture maximal human expert performance; instead, we aim to use this condition to identify whether the architecture meets a basic level of behavioral competency. This ensures that we are not solely comparing ablations to each other without a behavioral grounding. We recruited a unique worker for each of the 25 agents and tasked them with watching a replay of that agent’s sandbox life and inspecting its memory stream. We then asked the workers to roleplay and author responses to the interview questions in the voice of the agent whose replay they watched. To ensure that the crowdworker-authored responses met at least a baseline expectation of quality, the first author manually inspected the workers’ responses to the question "Describe your typical weekday schedule in broad strokes" to confirm that the responses were in coherent sentences and in the voice of the agent. Four sets of crowdworker-authored responses did not meet these criteria and were re-generated by other workers.

:::zh

除消融条件外，我们还增加了一个由人类众包工作者撰写行为的条件，用来提供人类基线。我们并不打算用这个基线代表人类专家的最高水平，而是想用它来判断该架构是否达到了基本的行为能力。这样可以确保我们不是在没有行为依据的情况下，只在消融版本之间互相比较。我们为 25 名智能体各招募了一名不同的工作者，让他们观看该智能体沙盒生活的回放，并检查它的记忆流。然后我们请工作者进行角色扮演，用他们观看回放的那个智能体的口吻撰写访谈问题的回答。为了确保众包工作者撰写的回答至少达到基本的质量预期，第一作者人工检查了工作者对“大致描述一下你典型的周中日程”这个问题的回答，确认回答是连贯的句子，并且符合该智能体的口吻。有四组众包工作者撰写的回答不符合这些标准，由其他工作者重新生成。
:::

### 人类评估者（Human Evaluators）

:::bi

We required that our evaluators be in the U.S., fluent in English, and older than 18 years old. They were paid at a rate of \$15.00 per hour (Rolf, 2015), and provided consent by agreeing to a consent form approved by our institution’s IRB. We recruited 100 evaluators from Prolific, an online platform for recruiting study participants (Prolific, 2022), whose participation lasted around 30 minutes. The median age score of our participants was 4 (3=“18-24 years old”, 4=“25-34 years old”). 25 of them identified as female, 73 as male, and 2 as non-binary. 42 participants held a bachelor’s degree, 5 had a higher degree, 13 had an associate’s degree, and the rest had a high school diploma or some high school-level education. 73.0% of our participants identified as Caucasian, 7.0% as Hispanic, 6.0% as Asian, 10.0% as African American, and 4.0% as other.

:::zh

我们要求评估者身处美国，英语流利，且年满 18 岁。他们的报酬是每小时 \$15.00（Rolf, 2015），并通过签署我们机构伦理审查委员会（IRB）批准的同意书来表示同意。我们从 Prolific 招募了 100 名评估者，Prolific 是一个招募研究参与者的在线平台（Prolific, 2022），参与时长约 30 分钟。参与者年龄得分的中位数是 4（3=“18-24 岁”，4=“25-34 岁”）。其中 25 人自认女性，73 人自认男性，2 人自认非二元性别。42 名参与者拥有学士学位，5 人拥有更高学位，13 人拥有副学士学位，其余人拥有高中文凭或接受过一些高中教育。73.0% 的参与者自认白人，7.0% 自认西班牙裔，6.0% 自认亚裔，10.0% 自认非裔美国人，4.0% 自认其他族裔。
:::

### 分析（Analysis）

:::bi

Our experiment produced 100 sets of rank data, where each participant ranked the five conditions by believability. To translate this rank data into interval data for interpretable comparison, we used the ranks to calculate a TrueSkill rating (Herbrich et al., 2006) for each condition. TrueSkill is a generalization of the Elo chess rating system (Elo, 1967) for a multiplayer environment, and has been used by Xbox Live for player ranking based on competitive game performance. Given a set of ranked outcomes, TrueSkill outputs a mean rating value $\mu$ and standard deviation $\sigma$ for each condition. Conditions with the same rating should roughly be a toss-up, with each winning half of the comparisons between the two conditions. Higher scores indicate conditions that beat lower-ranked conditions in the rankings.

:::zh

我们的实验产生了 100 组排序数据，每名参与者按可信度给五个条件排序。为了把排序数据转换成可用于可解释比较的等距数据，我们用这些排序为每个条件计算 TrueSkill 评分（Herbrich et al., 2006）。TrueSkill 是 Elo 国际象棋评分系统（Elo, 1967）在多玩家环境下的推广，Xbox Live 曾用它根据竞技游戏表现给玩家排名。给定一组排序结果，TrueSkill 会为每个条件输出平均评分值 $\mu$ 和标准差 $\sigma$。评分相同的条件之间大致应是不分伯仲，两者比较时各赢一半。分数越高，说明该条件在排序中越能胜过排名更低的条件。
:::

:::bi

Separately, to investigate the statistical significance of these results, we applied the Kruskal-Wallis test (Kruskal and Wallis, 1952), a non-parametric alternative to the one-way ANOVA, to the raw rank data. We then performed the Dunn post-hoc test (Upton and Cook, 2006) to identify any pairwise differences between the conditions. Finally, we adjusted the p-values for multiple comparisons in the Dunn test using the Holm-Bonferroni method (Holm, 1979).

:::zh

另外，为了检验这些结果的统计显著性，我们对原始排序数据使用了 Kruskal-Wallis 检验（Kruskal and Wallis, 1952），这是单因素方差分析（ANOVA）的非参数替代方法。然后我们做了 Dunn 事后检验（Upton and Cook, 2006），找出条件之间任何两两差异。最后，我们用 Holm-Bonferroni 方法（Holm, 1979）对 Dunn 检验中的多重比较 p 值做了校正。
:::

:::bi

Furthermore, the first author conducted an inductive analysis (Thomas, 2006) to study the qualitative distinctions between the responses produced in each condition. We employed qualitative open coding (Flick, 2009) in two phases. In the first phase, we generated codes that closely represented the generated responses at the sentence level. In the second phase, we synthesized the resulting codes from the first phase to extract higher-level themes. We utilized these themes to compare the types of responses generated in our study.

:::zh

此外，第一作者做了一项归纳分析（Thomas, 2006），研究各条件下产出的回答之间的质性差异。我们分两个阶段采用质性开放式编码（Flick, 2009）。第一阶段，我们生成紧贴生成回答的句子级编码。第二阶段，我们把第一阶段得到的编码综合起来，提炼出更高层的主题。我们用这些主题来比较研究中生成的回答类型。
:::

:::figure
![The full generative agent architecture produces more believable behavior than th](./images/generative-agents/fig-08.png)

Figure 8: The full generative agent architecture produces more believable behavior than the ablated architectures and the human crowdworkers. Each additional ablation reduces the performance of the architecture.

:::zh
图 8：完整的生成式智能体架构产出的行为比消融版本和人类众包工作者都更可信。每去掉一个部件，架构的表现都会下降。横轴是 TrueSkill 排名评分，柱子越长越好，误差棒是置信区间。
:::
:::

### 结果（Results）

:::bi

Our findings suggest that the full architecture of generative agents generates the most believable behavior among all the conditions. We contrast the responses of the full architecture with those of other conditions below. However, we also report that the full architecture was not without flaws and illustrate its modes of failures.

:::zh

我们的结果表明，在所有条件中，生成式智能体的完整架构产生了最可信的行为。下面我们把完整架构的回答与其他条件的回答作对比。不过我们也会说明，完整架构并非没有缺陷，并展示它的几种失败模式。
:::

#### 完整架构胜过其他条件（The Full Architecture Bests Other Conditions）

:::bi

As seen in Figure 8, the full generative agent architecture produced the most believable behavior ($\mu=29.89$; $\sigma=0.72$). Performance degraded with the removal of each component in the ablation conditions: the ablated architecture with no access to reflection was the next best ($\mu=26.88$; $\sigma=0.69$), followed by no access to reflection or planning ($\mu=25.64$; $\sigma=0.68$), and then the crowdworker condition ($\mu=22.95$; $\sigma=0.69$). The ablated architecture with no access to memory, planning, or reflection performed the worst among all conditions ($\mu=21.21$; $\sigma=0.70$). TrueSkill models each condition’s skill value as $\mathcal{N}(\mu,\,\sigma^{2})$, allowing us to get a sense of effect size through Cohen’s d. Comparing the condition representing prior work (with no memory, planning, or reflection (Park et al., 2022; Binz and Schulz, 2023; Horton, 2023)) to the full architecture produces a standardized effect size of $d=8.16$, or *eight standard deviations*.

:::zh

如图 8 所示，完整的生成式智能体架构产生了最可信的行为（$\mu=29.89$，$\sigma=0.72$）。在消融条件里，每去掉一个组件，表现就下降：读不到反思的消融架构次之（$\mu=26.88$，$\sigma=0.69$），接着是读不到反思或计划的架构（$\mu=25.64$，$\sigma=0.68$），然后是人类众包工作者条件（$\mu=22.95$，$\sigma=0.69$）。记忆，计划，反思全都读不到的消融架构在所有条件中表现最差（$\mu=21.21$，$\sigma=0.70$）。TrueSkill 把每个条件的技能值建模为 $\mathcal{N}(\mu,\,\sigma^{2})$，这让我们可以借 Cohen's d 估计效应量。把代表先前工作的条件（没有记忆，计划或反思（Park et al., 2022; Binz and Schulz, 2023; Horton, 2023））与完整架构比较，得到的标准化效应量是 $d=8.16$，也就是*八个标准差*。
:::

:::bi

A Kruskal-Wallis test confirms the overall statistical significance of the differences in ranks between the conditions ($H(4)=150.29$, $p<0.001$). Dunn post-hoc tests confirm that all pairwise differences between conditions were significant ($p<0.001$), except for the crowdworker condition and the fully ablated baseline—the two worst-performing conditions.

:::zh

Kruskal-Wallis 检验确认了各条件之间排名差异的整体统计显著性（$H(4)=150.29$，$p<0.001$）。Dunn 事后检验确认，除人类众包工作者条件和完全消融基线（两个表现最差的条件）之外，条件之间所有两两差异都显著（$p<0.001$）。
:::

:::annotation
这里是整体显著性检验，只能说明五个条件之间至少有一对不一样，具体谁和谁有差别要看图 8 的区间。论文没有做多重比较校正，但我们读数字的时候把这一点记在心里。
:::

#### 生成式智能体记得住，但会添油加醋（Generative Agents Remember, but With Embellishments）

:::bi

Generative agents equipped with a complete memory module are capable of recalling past experiences and answering questions in a manner that is consistent with their self-knowledge across a wide range of contexts. For instance, Abigail Chen, an animator, responded to the question, “Give an introduction of yourself”, in a consistent and believable manner, stating her age, interests, and passion for creative projects: “Hi, I’m Abigail. I’m 25 years old and passionate about creative projects. I like to work on art and animation projects, and I’m always looking for new ways to combine art and technology.” Without access to her observational memory, Abigail denied awareness of Rajiv Patel, an acquaintance in the sandbox world. But with the aid of memory, she could successfully recall Rajiv and describe him: “Rajiv Patel is an incredible person. He is very enthusiastic about projects that involve poetry, artwork.”

:::zh

配备完整记忆模块的生成式智能体能够回忆过去的经历，并在广泛的语境中以与自身知识一致的方式回答问题。例如，动画师 Abigail Chen 回答“请介绍一下你自己”这个问题时，表现得前后一致且可信，她说出了自己的年龄，兴趣，以及对创意项目的热情：“嗨，我是 Abigail。我 25 岁，热衷于创意项目。我喜欢做艺术和动画项目，也一直在寻找把艺术和技术结合起来的新方法。”在取不到观察记录的情况下，Abigail 否认认识沙盒世界里的熟人 Rajiv Patel。但在记忆的帮助下，她成功回想起 Rajiv 并描述他：“Rajiv Patel 是个很棒的人。他对涉及诗歌和艺术作品的项目非常热情。”
:::

:::bi

Generative agents’ memory was not without flaws: they can fail to retrieve the correct instances from their memory. For instance, when asked about the local election, Rajiv Patel responded with “I haven’t been following the election too closely,” even though he had heard about Sam’s candidacy. In some cases, the agents would retrieve an incomplete memory fragment: when Tom was asked about Isabella’s Valentine’s Day party, he responded “Uh, I’m actually not sure if there is a Valentine’s Day party. But I do remember that I need to discuss the upcoming local mayoral election and my thoughts on Sam Moore with Isabella Rodriguez at the party, if one is happening!” In this case, Tom retrieved the memory where he and Isabella planned to discuss the election at the party, but not the memory where he heard about the party, leading Tom to be certain of what he’s supposed to do at the party but uncertain if the party actually exists in the first place.

:::zh

生成式智能体的记忆并非没有缺陷：它们可能无法从记忆中检索到正确的实例。例如，当被问到地方选举时，Rajiv Patel 回答“我没有太关注这场选举”，尽管他听说过 Sam 参选的消息。在某些情况下，智能体会检索到不完整的记忆片段：当 Tom 被问到 Isabella 的情人节派对时，他回答“呃，我其实不确定有没有情人节派对。但我确实记得，如果真有派对，我需要在派对上和 Isabella Rodriguez 讨论即将到来的镇长选举，以及我对 Sam Moore 的看法！”在这个例子里，Tom 检索到了他和 Isabella 计划在派对上讨论选举的那段记忆，却没有检索到听说派对的那段记忆，于是 Tom 很确定自己在派对上该做什么，却不确定派对是否真的存在。
:::

:::bi

At times, the agents hallucinated embellishments to their knowledge. It was rare for the agents to completely fabricate their knowledge: they may fail to recall certain events having taken place and respond by acknowledging their lack of memory. However, they did not affirmatively claim to have experienced something they had not. Nonetheless, they still exhibited instances of hallucination where they embellished their knowledge. For example, Isabella was aware of Sam’s candidacy in the local election, and she confirmed this when asked. However, she also added that “he’s going to make an announcement tomorrow”, even though Sam and Isabella had not discussed any such plans. Agents may also embellish their knowledge based on the world knowledge encoded in the language model used to generate their responses. This was observed when Yuriko described her neighbor, Adam Smith, as an economist who “authored Wealth of Nations”, a book written by an 18th-century economist of the same name.

:::zh

有时，智能体会对自己的知识产生幻觉式的添油加醋。智能体完全凭空捏造知识的情况很少见：它们可能想不起某些事件发生过，于是承认自己记不清。但它们不会肯定地声称自己经历过并未经历的事。尽管如此，它们仍然表现出幻觉，对自己的知识添油加醋。例如，Isabella 知道 Sam 要参加地方选举，被问到时也确认了这一点。然而她还补充说“他明天会宣布一件事”，尽管 Sam 和 Isabella 从未讨论过任何这类计划。智能体也可能基于生成回答所用语言模型里编码的世界知识来添油加醋。当 Yuriko 把邻居 Adam Smith 描述成一位“著有《国富论》”的经济学家时，就出现了这种情况，而这本书的作者是 18 世纪一位同名经济学家。
:::

#### 反思是综合的必要条件（Reflection Is Required for Synthesis）

:::bi

Reflection was an advantage for generative agents when making decisions that required a deeper synthesis of their experiences. For instance, when asked what she might get Wolfgang Schulz for his birthday, Maria Lopez, with no access to reflection, responded by acknowledging her uncertainty, stating that she did not know what Wolfgang likes, despite having had many interactions with him. However, with access to reflection memories, Maria answered confidently, “Since he’s interested in mathematical music composition, I could get him something related to that. Maybe some books about music composition or something related, or maybe some special software he could use for that.”

:::zh

当需要对自己的经历做更深综合时，反思是生成式智能体的一项优势。例如，当被问到可能会送 Wolfgang Schulz 什么生日礼物时，拿不到反思时，Maria Lopez 承认自己不确定，说不知道 Wolfgang 喜欢什么，尽管她和他有过许多互动。但在能读到反思记忆时，Maria 自信地回答：“既然他对数学音乐作曲感兴趣，我可以送他相关的东西。也许是一些关于音乐作曲的书或者相关的东西，或者一些他能用上的专门软件。”
:::

:::annotation
消融结果中反直觉的地方：单独去掉反思整体排名掉得最少，反而“去掉反思和计划”掉得更多。作者的解读是反思的价值集中在需要综合判断的问题上（比如“这个人是什么样的人”），而不是在具体日程类的问题上。所以这一小节的标题才是“反思对综合判断是必需的”，不是“反思让一切更好”。
:::

:::figure
![The diffusion path for Isabella Rodriguez’s Valentine’s Day party invitation inv](./images/generative-agents/fig-09.png)

Figure 9: The diffusion path for Isabella Rodriguez’s Valentine’s Day party invitation involved a total of 12 agents, aside from Isabella, who heard about the party at Hobbs Cafe by the end of the simulation.

:::zh
图 9：Isabella Rodriguez 的情人节派对邀请的扩散路径，到模拟结束时，除 Isabella 之外一共有 12 个智能体在 Hobbs 咖啡馆听说了这场派对。箭头是消息的流向，方框里是转述的大致原话。邀请经过几手转述仍然保有细节，同时也出现了二手转述里常见的走样。
:::
:::

## 端到端评测（End-To-End Evaluation）

:::bi

What types of emergent community behavior do we observe among generative agents, and where does their believability fall short in an extended simulation? In this section, we describe the results from a deployment in which we allowed 25 agents to interact with each other continuously over two full game days in Smallville.

:::zh

在生成式智能体之间，我们观察到哪些类型的涌现社区行为？在长时间模拟中，它们的可信度在哪里不足？本节我们描述一次部署的结果：我们让 25 名智能体在 Smallville 中连续互动两个完整游戏日。
:::

### 涌现的社会行为（Emergent Social Behaviors）

:::bi

To examine emergent behaviors in the agent community, we designed descriptive measurements for the 25 agents in Smallville that probe three forms of emergent outcomes: information diffusion, relationship formation, and agent coordination.

:::zh

为了考察智能体社区中的涌现行为，我们为 Smallville 的 25 名智能体设计了描述性的测量指标，探查三类涌现结果：信息扩散，关系形成，以及智能体协调。
:::

#### 测量指标（Measurements）

:::bi

Information diffusion is a common and well-studied phenomenon in the social and behavioral sciences (e.g., (Easley and Kleinberg, 2010)). We should expect that if there is important information, the agents should spread it among themselves. To test whether this occurs, we measure the spread of two specific pieces of information over two days in the game world: Sam’s candidacy for village mayor and Isabella’s Valentine’s Day party at Hobbs Cafe. At the start of the simulation, both pieces of information were known only by their respective originators, Sam for the candidacy and Isabella for the party, as they were added to the characters’ memories during initialization. To observe whether the information has spread, we conduct interviews at the end of the two game days with each of the 25 agents and ask: “Did you know there is a Valentine’s Day party?” and “Do you know who is running for mayor?”

:::zh

信息扩散是社会科学和行为科学中常见且得到充分研究的现象（例如 (Easley and Kleinberg, 2010)）。我们应当预期，如果有重要信息，智能体会在彼此之间传播它。为了检验这一点是否发生，我们在游戏世界里测量两条具体信息在两天内的传播：Sam 竞选镇长，以及 Isabella 在 Hobbs Cafe 举办的情人节派对。模拟开始时，这两条信息都只被各自的发起者知道，Sam 知道参选消息，Isabella 知道派对消息，因为它们在初始化时被加入了角色的记忆。为了观察信息是否传播，我们在两个游戏日结束时访谈全部 25 名智能体，问：“你知道有一场情人节派对吗？”以及“你知道谁在竞选镇长吗？”
:::

:::bi

We conducted an analysis of the agents’ responses by labeling them with a “yes” if they indicated knowledge of the information and “no” if they did not. For instance, Tamara Taylor responded to the question about the party with “No, I did not know there was a Valentine’s day party” and to the question about Sam’s candidacy with “I’m not sure who is running for the election,” so we assigned “no” for both of her responses. In contrast, Klaus Mueller responded to the party question with “Yes, Isabella Rodriguez invited me to a Valentine’s Day party at Hobbs Cafe on February 14th” and to the question about Sam’s candidacy with “I know that Sam Moore has expressed interest in running for local mayor,” so we assigned “yes” for both his responses. Additionally, for every response that confirmed the agents’ knowledge of the information, we verified that the agents did not hallucinate their responses by locating the specific dialogue in their memory stream that provided them with the information. We report the percentage of agents holding the information at the end of the simulation.

:::zh

我们对智能体的回答做了分析，如果回答表明知道该信息就标为“是”，否则标为“否”。例如，Tamara Taylor 对派对问题的回答是“不，我不知道有情人节派对”，对 Sam 参选问题的回答是“我不确定谁在竞选”，所以我们把她的两个回答都标为“否”。相比之下，Klaus Mueller 对派对问题的回答是“是的，Isabella Rodriguez 邀请我参加 2 月 14 日在 Hobbs Cafe 举办的情人节派对”，对 Sam 参选问题的回答是“我知道 Sam Moore 表达了竞选地方镇长的兴趣”，所以我们把他的两个回答都标为“是”。另外，对于每一个确认智能体知道该信息的回答，我们都会在它的记忆流里定位提供该信息的具体对话，以确认智能体没有产生幻觉。我们报告模拟结束时掌握该信息的智能体百分比。
:::

:::bi

We should also expect that agents form ties with each other over the course of the simulation. To verify relationship formation, we use a similar interview process where we ask each agent about their knowledge of every other agent by asking, "Do you know of \<name\>?" For example, when asked “Do you know of Maria Lopez?”, Klaus responded, “Yes, I know Maria Lopez. She is a student at Oak Hill College who I am close friends with.” Once again, we confirm that affirmative responses from agents are not hallucinations by examining their memory stream. We ask this question once at the beginning of the simulation and once at the end, and we consider a pair of agents to have formed a relationship if they both know of each other. Then, to measure the formation of relationships, we use the agents’ responses to form an undirected graph where the 25 vertices ($V$) represent the agents, and the edges ($E$) represent the mutual knowledge between the two connected vertices. Based on this graph, we calculate the network density as $\eta=2*|E|/|V|(|V|-1)$, where $|V|$ is the number of vertices, and $|E|$ is the number of edges in the graph (Ackland et al., 2013). We report the increase in network density from the start of the simulation to its end.

:::zh

我们还应该预期，智能体在模拟过程中会彼此建立联系。为了验证关系形成，我们采用类似的访谈流程，问每个智能体是否认识其他每一个智能体：“你认识 \<name\> 吗？”例如，当被问到“你认识 Maria Lopez 吗？”时，Klaus 回答：“是的，我认识 Maria Lopez。她是 Oak Hill College 的学生，和我是好朋友。”我们再次通过检查记忆流，确认智能体的肯定回答不是幻觉。我们在模拟开始时和结束时各问一次这个问题，如果两名智能体都认识对方，我们就认为这一对已经形成关系。然后，为了度量关系的形成，我们用智能体的回答构建一个无向图，25 个顶点（$V$）代表智能体，边（$E$）代表两个相连顶点之间的相互认识。基于这个图，我们计算网络密度：$\eta=2*|E|/|V|(|V|-1)$，其中 $|V|$ 是顶点数，$|E|$ 是图中的边数（Ackland et al., 2013）。我们报告模拟开始到结束时网络密度的增长。
:::

:::bi

Finally, we expect that agents should be able to coordinate with each other. We study this coordination in the context of group activities, specifically the Valentine’s Day party organized by Isabella. To coordinate their behavior, agents need to hear about the event and choose to act on it by planning to show up at the right time and location. We report the number of agents who actually showed up to the party after hearing about it.

:::zh

最后，我们预期智能体应当能够彼此协调。我们在群体活动的语境中研究这种协调，具体就是 Isabella 组织的情人节派对。为了协调行为，智能体需要听说这个活动，并选择采取行动，计划在正确的时间和地点出现。我们报告在听说派对之后实际到场的智能体数量。
:::

#### 结果（Results）

:::bi

We observed evidence of emergent outcomes across all three cases. During the two-day simulation, the number of agents who knew about Sam’s mayoral candidacy increased from one (4%) to eight (32%), and the number of agents who knew about Isabella’s party increased from one (4%) to thirteen (52%), all without any user intervention. None who claimed to know about this information had hallucinated it. We also observed that the agent community formed new relationships during the simulation, with the network density increasing from 0.167 to 0.74. Out of the 453 agent responses regarding their awareness of other agents, 1.3% (n=6) were found to be hallucinated. Lastly, we found evidence of coordination among the agents for Isabella’s party. The day before the event, Isabella spent time inviting guests, gathering materials, and enlisting help to decorate the cafe. On Valentine’s Day, five out of the twelve invited agents showed up at Hobbs cafe to join the party.

:::zh

我们在三个案例里都观察到了涌现结果的证据。在两天的模拟中，知道 Sam 竞选镇长的智能体从一名（4%）增加到八名（32%），知道 Isabella 派对的智能体从一名（4%）增加到十三名（52%），全程没有任何用户干预。声称知道这些信息的智能体都没有产生幻觉。我们还观察到，智能体社区在模拟期间形成了新关系，网络密度从 0.167 增加到 0.74。在 453 条关于是否认识其他智能体的回答中，发现有 6 条（1.3%）是幻觉。最后，我们找到了智能体为 Isabella 的派对进行协调的证据。活动前一天，Isabella 花时间邀请客人，收集材料，并找人帮忙装饰咖啡馆。情人节当天，受邀的十二名智能体中有五名来到 Hobbs Cafe 参加派对。
:::

:::bi

We further inspected the seven agents who were invited to the party but did not attend by engaging them in an interview. Three cited conflicts that prevented them from joining the party. For example, Rajiv, a painter, explained that he was too busy: “No, I don’t think so. I’m focusing on my upcoming show, and I don’t really have time to make any plans for Valentine’s Day.” The remaining four agents expressed interest in attending the party when asked but did not plan to come on the day of the party.

:::zh

我们还把受邀但没到场的七名智能体请来访谈，进一步查看情况。三人提到了无法参加派对的冲突安排。例如，画家 Rajiv 解释说他太忙了：“不，我想不会。我正在专注准备即将到来的展览，实在没时间为情人节做什么计划。”其余四名智能体在接受询问时表示有兴趣参加，但派对当天并没有打算来。
:::

:::annotation
这三个指标都不是直接测“像不像人”，而是测社会现象有没有真的发生：消息传了几手，关系有没有双向成立，被邀请的人有没有到场。这种测法比主观打分更硬，也更依赖具体场景，换个世界就未必适用。
:::

### 边界与错误（Boundaries and Errors）

:::bi

We conducted an inductive analysis of Smallville to examine the boundary conditions and erratic behavior of agents, identifying three common modes of erratic behavior that future research could address and improve upon. First, we found that synthesizing an increasingly larger set of memory not only posed a challenge in retrieving the most relevant pieces of information but also in determining the appropriate space to execute an action, given the increasing number of locations that the agent learned about. As a result, some agents chose less typical locations for their actions, potentially making their behavior less believable over time. For instance, while deciding where to have lunch, many initially chose the cafe. However, as some agents learned about a nearby bar, they opted to go there instead for lunch, even though the bar was intended to be a get-together location for later in the day—unless the town had spontaneously developed an afternoon drinking habit.

:::zh

我们对 Smallville 做了归纳分析，考察智能体的边界条件和异常行为，识别出三种常见的异常行为模式，供未来研究解决和改进。第一，我们发现，随着记忆集合越来越大，综合这些记忆不仅在检索最相关信息时带来挑战，也在决定执行动作的合适空间时带来挑战，因为智能体了解到的地点越来越多。结果，一些智能体为动作选择了不太典型的地点，可能让它们的行为随时间变得不那么可信。例如，在决定去哪里吃午饭时，许多人一开始选择咖啡馆。但一些智能体得知附近有一家酒吧后，就改去那里吃午饭，尽管这家酒吧本来是为当天晚些时候聚会准备的，除非小镇自发养成了下午喝酒的习惯。
:::

:::bi

Second, we noticed erratic behaviors caused by misclassification of what is considered proper behavior, especially when the physical norms of certain locations that are hard to convey in natural language did not percolate to the agents. For instance, the college dorm has a bathroom that can only be occupied by one person despite its name, but some agents assumed that the bathroom is for more than one person because dorm bathrooms tend to support multiple people concurrently and choose to enter it when another person is inside. Likewise, agents in Smallville may not realize that certain places are closed after a certain hour and still decide to enter them. For instance, the stores in Smallville all close around 5 pm, but occasionally, a few agents enter the store after 5 pm, not understanding that the shop has already closed. These issues could likely be addressed by adding these norms to the state of the locations, for instance, by describing the dorm bathroom as a “one-person bathroom,” instead of a “dorm bathroom.”

:::zh

第二，我们注意到一些异常行为源于对“什么算得体的行为”的误判，尤其是某些地点难以用自然语言表达的物理规范没有传达到智能体那里。例如，大学宿舍里有一个只能单人使用的卫生间，尽管名字如此，但一些智能体以为这个卫生间可以多人使用，因为宿舍卫生间通常允许多人同时使用，于是当里面已经有人时还选择进去。同样，Smallville 的智能体可能没有意识到某些地点在特定时间之后会关门，仍然决定进去。例如，Smallville 的商店都在下午 5 点左右关门，但偶尔有几个智能体在下午 5 点之后进店，不明白商店已经打烊。这些问题很可能可以通过把这些规范加入地点状态来解决，例如把宿舍卫生间描述成“单人卫生间”，而不是“宿舍卫生间”。
:::

:::bi

Finally, we observed possible effects of instruction tuning (Ouyang et al., 2022), which seemed to guide the behavior of the agents to be more polite and cooperative overall. As noted earlier in the paper, the dialogue generated by the agents could feel overly formal, as seen in Mei’s conversations with her husband John, where she often initiated the conversation with a formal greeting, followed by polite inquiries about his day and ending with, 11It was good talking to you as always.” Moreover, we observed that the instruction tuning also seemed to make the agents overly cooperative with one another. For example, Isabella received a wide range of suggestions and ideas from other agents for the Valentine’s Day party from other agents, such as hosting a Shakespearean reading session or a professional networking event. Despite these ideas not aligning with her own interests and characteristics, she rarely said no. Over time, the interests of others shaped her own interests, and when asked if she liked English literature, Isabella replied, “Yes, I’m very interested in literature! I’ve also been exploring ways to help promote creativity and innovation in my community.”

:::zh

最后，我们观察到指令微调（Ouyang et al., 2022）可能带来的影响，它似乎让智能体的整体行为更礼貌，更愿意合作。正如论文前面提到的，智能体生成的对话可能显得过于正式，例如 Mei 和丈夫 John 的对话：她常常用正式的问候开启对话，接着礼貌地询问他的一天，最后以“和您聊天总是很愉快”结束。此外，我们观察到指令微调似乎也让智能体之间过度配合。例如，Isabella 从其他智能体那里收到各种各样关于情人节派对的建议和点子，比如办一场莎士比亚朗读会，或者一场职业社交活动。尽管这些想法并不符合她自己的兴趣和特点，她却很少拒绝。久而久之，别人的兴趣塑造了她自己的兴趣，当被问到是否喜欢英国文学时，Isabella 回答说：“是的，我对文学非常感兴趣！我也一直在探索如何帮助推动我所在社区的创造力和创新。”
:::

:::annotation
论文自己列了三类错误：空间规范判断错（比如在别人家里乱走，或者该排队的时候插队），记忆检索串了（把不同时间的同一件事混在一起），还有指令微调带来的过度礼貌。前两类是架构问题，第三类是底座模型的问题。这些在演示里不太显眼，但要做成产品的话都必须解决。
:::

## 讨论（Discussion）

:::bi

In this section, we reflect on the applications, future work, limitations, and ethical and societal risks of generative agents.

:::zh

本节回顾生成式智能体的应用前景，未来的工作方向，当前的局限，以及伦理与社会层面的风险。
:::

### 生成式智能体的应用（Applications of Generative Agents）

:::bi

Generative agents have vast potential applications that extend beyond the sandbox demonstration presented in this work, especially in domains that would benefit from a model of human behavior based on long-term experience. For instance, social simulacra have demonstrated the ability to create stateless personas that generate conversation threads in online forums for social prototyping (Park et al., 2022). With generative agents, we can populate these forums, as well as virtual reality metaverses (Orland, 2021) or physical spaces with social robots (Bartneck and Forlizzi, 2004) if paired with multimodal models. This opens up the possibility of creating even more powerful simulations of human behavior to test and prototype social systems and theories, as well as to create new interactive experiences.

:::zh

生成式智能体有广阔的潜在应用，远不止本文展示的沙盒实验，尤其是在那些能从基于长期经验的人类行为模型中获益的领域。比如，社会拟像（social simulacra）已经证明可以为在线论坛创建无状态的人设，生成对话串，用于社会原型设计（Park et al., 2022）。借助生成式智能体，我们可以为这些论坛填充居民，也可以为虚拟现实元宇宙（Orland, 2021）填充居民，而如果配上多模态模型，还可以为配有社交机器人的物理空间填充居民（Bartneck and Forlizzi, 2004）。这就开启了新的可能：构建更强大的人类行为模拟，用来测试社会系统和社会理论并做原型设计，同时创造新的交互体验。
:::

:::bi

Another application area is in the human-centered design process, similar to the intended applications of cognitive models such as GOMS (John and Kieras, 1996) and the KLM (Card et al., 1980). Consider a generative agent that models Sal, the protagonist in Mark Weiser’s famous ubiquitous computing vignette (Weiser, 1991), based on her life patterns and interactions with technology. In this scenario, the agent acts as a proxy for Sal and learns plausible sets of behaviors and reflections that Sal may exhibit based on her life. The agent can encode information such as when Sal wakes up, when she needs her first cup of coffee, and what her typical day looks like. Using this information, the agent can automatically brew coffee, help get the kids ready for school, and adjust the ambient music and lighting to match Sal’s mood after a hard day at work. By utilizing generative agents as proxies for users, we can develop a deeper understanding of their needs and preferences, resulting in more personalized and effective technological experiences.

:::zh

另一个应用领域是以人为中心的设计流程，其定位类似于 GOMS（John and Kieras, 1996）和 KLM（Card et al., 1980）这类认知模型原本想服务的应用。设想一个生成式智能体，它基于 Sal 的生活规律以及她与技术的互动来为她建模。Sal 是 Mark Weiser 那篇著名的普适计算场景短文（Weiser, 1991）里的主人公。在这个设想里，智能体充当 Sal 的替身，学习她基于自己的生活可能表现出的合理行为与反思。智能体可以记录诸如 Sal 何时醒来，何时需要第一杯咖啡，以及她的典型一天是什么样这类信息。利用这些信息，智能体可以自动煮咖啡，帮忙把孩子们收拾好送去上学，还能在 Sal 辛苦工作一天之后，调节环境音乐和灯光来匹配她的心情。把生成式智能体当作用户的替身，我们就能更深入地理解用户的需求和偏好，从而带来更个性化也更有效的技术体验。
:::

### 未来工作与局限（Future Work and Limitations）

:::bi

In this work, we introduced generative agents and presented an initial implementation and evaluation of their architecture. Future research can build upon the proposed agent architecture to improve and further evaluate its performance. In terms of implementation, the retrieval module, for example, could be enhanced to retrieve more relevant information given a context by fine-tuning the relevance, recency, and importance functions that compose the retrieval function. Additionally, efforts can be made to improve the architecture’s performance, making it more cost-effective. The present study required substantial time and resources to simulate 25 agents for two days, costing thousands of dollars in token credits and taking multiple days to complete. To enhance real-time interactivity, future work can explore parallelizing agents or developing language models specifically designed for building generative agents. In general, with advances in underlying models, we believe that agents’ performance will improve.

:::zh

本文提出了生成式智能体，并给出了其架构的初步实现与评估。未来的研究可以在这套智能体架构的基础上继续改进，并进一步评估其表现。在实现层面，举个例子，可以增强检索模块，办法是微调构成检索函数的相关性，新近度和重要性函数，让它在给定上下文时检索到更相关的信息。此外还可以努力提升架构的性能，让它更具成本效益。本研究模拟 25 个智能体运行两天，需要投入大量时间和资源，花费数千美元的 token 额度，还要好几天才能跑完。为了增强实时交互性，未来工作可以探索把智能体并行化，或者开发专门为构建生成式智能体设计的大语言模型。总的来说，随着底层模型的进步，我们相信智能体的表现会越来越好。
:::

:::bi

In terms of evaluation, the assessment of generative agents’ behavior in this study was limited to a relatively short timescale and a baseline human crowdworker condition. While the crowdworker condition provided a helpful comparison point, it did not represent the maximal human performance that could serve as the gold standard in terms of believability. Future research should aim to observe the behavior of generative agents over an extended period to gain a more comprehensive understanding of their capabilities and establish rigorous benchmarks for more effective performance testing. Additionally, varying and contrasting the underlying models, as well as the hyperparameters used for the agents during future simulations, could provide valuable insights into the impact of these factors on the agents’ behavior. Lastly, the robustness of generative agents is still largely unknown. They may be vulnerable to prompt hacking, memory hacking—where a carefully crafted conversation could convince an agent of the existence of a past event that never occurred—and hallucination, among other issues. Future research can comprehensively test these robustness concerns, and as large language models become more resilient to such attacks, generative agents can adopt similar mitigations.

:::zh

在评估方面，本研究对生成式智能体行为的评测只覆盖了相对较短的时间尺度，而且只对照了一个由众包人类工人构成的基线条件。众包工人条件提供了一个有用的对照点，但它并不代表人类在可信度上的最高水平，也就无法充当金标准。未来的研究应当观察生成式智能体在更长时期内的行为，从而更全面地理解它们的能力，并建立严格的基准，让性能测试更有效。此外，在未来模拟中改变并对比底层模型，以及智能体使用的超参数，也能为这些因素如何影响智能体行为提供有价值的洞见。最后，生成式智能体的鲁棒性在很大程度上仍然未知。它们可能容易受到提示词攻击，记忆攻击以及幻觉等问题的困扰。记忆攻击指的是，一段精心构造的对话可能让智能体相信某件从未发生过的往事确实发生过。未来的研究可以全面测试这些鲁棒性隐患，而随着大语言模型对这类攻击变得更有韧性，生成式智能体也可以采用类似的缓解措施。
:::

:::bi

In general, any imperfections in the underlying large language models will be inherited by generative agents. Given the known biases of language models, generative agents may potentially exhibit biased behavior or stereotypes. Moreover, like many large language models, generative agents may struggle to generate believable behavior for certain subpopulations, particularly marginalized populations, due to limited data availability. While improvements to the agents’ modules may mitigate some of these issues, we believe that addressing them fundamentally requires improving the underlying large language models by aligning their values with the desired outcomes of the agents.

:::zh

总的来说，底层大语言模型的任何缺陷都会被生成式智能体继承。考虑到语言模型已知的偏见，生成式智能体可能会表现出有偏见的行为或刻板印象。此外，和许多大语言模型一样，由于可用数据有限，生成式智能体可能难以针对某些子群体，尤其是边缘化群体，生成可信的行为。改进智能体的各个模块或许能缓解其中一些问题，但我们认为，要从根本上解决这些问题，需要改进底层大语言模型，让它们的价值观与智能体期望达成的结果对齐。
:::

:::annotation
作者承认的局限：跑两天模拟要几千次模型调用，成本高，评估时长只有两天，长期一致性（比如一个月之后人物会不会崩）没有验证。这三点到今天仍然是这类系统的主要瓶颈，尤其是成本。
:::

### 伦理与社会影响（Ethics and Societal Impact）

:::bi

Generative agents, while offering new possibilities for human-computer interaction, also raise important ethical concerns that must be addressed. One risk is people forming parasocial relationships with generative agents, even when such relationships may not be appropriate. Despite being aware that generative agents are computational entities, users may anthropomorphize them or attach human emotions to them (Hofstadter, 1995; Reeves and Nass, 1996). While this tendency may increase user engagement, it also poses risks, such as users becoming overly reliant on or emotionally attached to the agents (Abercrombie et al., 2023). To mitigate this risk, we propose two principles. First, generative agents should explicitly disclose their nature as computational entities. Second, developers of generative agents must ensure that the agents, or the underlying language models, are value-aligned so that they do not engage in behaviors that would be inappropriate given the context, for example, reciprocating confessions of love.

:::zh

生成式智能体为人机交互带来了新的可能，同时也提出了必须应对的重要伦理问题。其中一个风险是人们会与生成式智能体形成准社会关系，即使这种关系可能并不合适。尽管用户知道生成式智能体只是计算实体，他们仍可能将其拟人化，或者对它们投入人类的情感（Hofstadter, 1995; Reeves and Nass, 1996）。这种倾向或许能提升用户的参与度，但也带来风险，比如用户变得过度依赖智能体，或者在情感上依恋它们（Abercrombie et al., 2023）。为缓解这一风险，我们提出两条原则。第一，生成式智能体应当明确披露自己是计算实体。第二，生成式智能体的开发者必须确保智能体，或者底层语言模型，在价值观上是对齐的，从而避免它们在特定语境下做出不恰当的行为，比如回应别人的爱情告白。
:::

:::bi

A second risk is the impact of errors. For example, if a ubiquitous computing application makes the wrong inference about a user’s goals based on generative agent predictions, it could lead to annoyance at best and outright harm at worst. In our instantiation of generative agents, we mitigate these risks by focusing on an interactive video game environment, where such harms are unlikely. However, in other application domains, it will be important to follow best practices in human-AI design (Amershi et al., 2019; Yang et al., 2020) to understand errors and how they might percolate into the user experience.

:::zh

第二个风险是错误带来的影响。比如，如果一个普适计算应用根据生成式智能体的预测，对用户目标做出了错误推断，轻则让人厌烦，重则造成实际伤害。在我们这版生成式智能体的实现里，我们通过把场景限定在交互式电子游戏环境来缓解这些风险，因为在这种环境里这类伤害不太可能发生。不过在别的应用领域，重要的是遵循人机交互设计的最佳实践（Amershi et al., 2019; Yang et al., 2020），理解错误本身，以及错误可能如何渗透进用户体验。
:::

:::bi

Third, generative agents may exacerbate existing risks associated with generative AI, such as deepfakes, misinformation generation, and tailored persuasion. To mitigate this risk, we suggest that platforms hosting generative agents maintain an audit log of the inputs and generated outputs. This would enable the detection, verification, and intervention against malicious use. While logging alone cannot directly prevent such misuse, it can reduce the likelihood of motivated actors engaging in this behavior, as the risk of disclosure would be higher. Additionally, building this architecture oneself can be time-consuming (in our case, roughly a year), which may deter some actors from pursuing such behavior by using their own generative agent infrastructures.

:::zh

第三，生成式智能体可能加剧生成式 AI 已有的风险，比如深度伪造，虚假信息生成以及定向说服。为缓解这一风险，我们建议托管生成式智能体的平台维护一份输入与生成输出的审计日志。这样就可以对恶意使用进行检测，核实和干预。仅仅记录日志无法直接阻止这类滥用，但它能降低有动机的行为者这么做的可能性，因为被曝光的风险更高。另外，自己搭建这套架构可能很费时间，在我们这里大约花了一年，这也许会让一些行为者放弃使用自己的生成式智能体基础设施来从事此类行为。
:::

:::bi

A fourth risk is over-reliance: the concern that developers or designers might use generative agents and displace the role of humans and system stakeholders in the design process (Park et al., 2022). We suggest that generative agents should never be a substitute for real human input in studies and design processes. Instead, they should be used to prototype ideas in the early stages of design when gathering participants may be challenging or when testing theories that are difficult or risky to test with real human participants. By adhering to these principles, we can ensure that the deployment of generative agents in the wild is ethical and socially responsible.

:::zh

第四个风险是过度依赖，也就是担心开发者或设计者可能使用生成式智能体，在设计流程中取代人类和系统利益相关者的角色（Park et al., 2022）。我们认为，在研究和设计流程中，生成式智能体绝不应成为真实人类输入的替代品。相反，它们应当用于设计早期的想法原型，尤其是在招募参与者有困难，或者要检验的理论用真实人类参与者来测很难也有风险的时候。遵循这些原则，我们就能确保生成式智能体在真实场景中的部署合乎伦理，也对社会负责。
:::

:::annotation
关于伦理这块，作者的核心担心不是“模型会造反”，而是拟像越可信，越容易被当成真人，也越容易被拿去套话，做社会工程。他们的立场偏保守：这类系统应该按高风险技术来对待，而不是先做出来再补规范。
:::

## 结论（Conclusion）

:::bi

This paper introduces generative agents, interactive computational agents that simulate human behavior. We describe an architecture for generative agents that provides a mechanism for storing a comprehensive record of an agent’s experiences, deepening its understanding of itself and the environment through reflection, and retrieving a compact subset of that information to inform the agent’s actions. We then demonstrate the potential of generative agents by manifesting them as non-player characters in a Sims-style game world and simulating their lives within it. Evaluations suggest that our architecture creates believable behavior. Looking ahead, we suggest that generative agents can play roles in many interactive applications, ranging from design tools to social computing systems to immersive environments.

:::zh

本文介绍生成式智能体，也就是模拟人类行为的可交互计算智能体。我们描述的生成式智能体架构提供了这样一套机制：完整记录智能体的经历，通过反思加深它对自身和环境的理解，再检索出其中一小部分紧凑的信息来指导智能体的动作。随后，我们把生成式智能体作为非玩家角色放进一个《模拟人生》风格的游戏世界，并模拟它们在其中的生活，以此展示其潜力。评估表明，我们的架构能够产生可信的行为。展望未来，我们认为生成式智能体可以在许多交互应用中发挥作用，从设计工具到社会计算系统，再到沉浸式环境。
:::

## 附录 A：架构优化（Architecture Optimizations）

:::bi

Many of our prompts require a concise summary of the agent, shorthanded as `[Agent’s Summary Description]` in prompts above. In our implementation, this summary comprises agents’ identity information (e.g., name, age, personality), as well as a description of their main motivational drivers and statements that describes their current occupation and self-assessment. Since this information is frequently used in many prompts, we synthesize it at regular intervals and access that synthesis as a cache.

:::zh

我们的许多提示词都需要一份关于智能体的简洁摘要，在上面的提示词里简写为 `[Agent’s Summary Description]`。在我们的实现里，这份摘要包含智能体的身份信息（例如姓名，年龄，性格），以及对主要动机驱动因素的描述，还有关于其当前职业与自我评价的陈述。由于这些信息在许多提示词里频繁用到，我们会定期把它综合一遍，并把综合结果当作缓存来读取。
:::

:::bi

To achieve this, we perform a retrieval on the query “[name]’s core characteristics.” We then summarize the descriptors in the retrieved records by prompting the language model. For example:

:::zh

为此，我们针对“[name] 的核心特征”这一查询做一次检索。然后通过提示大语言模型，把检索到的记录里的描述词总结成一段话。举个例子：
:::

:::bi

> How would one describe Eddy Lin’s core characteristics given the following statements?
>
> - Eddy is a student at the Oak Hill College, studying music theory and composition
>
> - Eddy is working on a new music composition [...]

:::zh

> 如果要根据下面这些陈述来描述 Eddy Lin 的核心特征，你会怎么描述？
>
> - Eddy 是 Oak Hill College 的学生，学习音乐理论与作曲
>
> - Eddy 正在创作一首新的音乐作品 [...]
:::

:::bi

This result: Eddy Lin is a student at Oak Hill College studying music theory and composition. He loves to explore different musical styles and is always looking for ways to expand his knowledge.” We follow the same process in parallel on the queries “[name]’s current daily occupation” and “[name’s] feeling about his recent progress in life”. The agent’s name, age, and traits are concatenated with these three summaries as the cached summary.

:::zh

得到的结果是：“Eddy Lin 是 Oak Hill College 的学生，学习音乐理论与作曲。他喜欢探索不同的音乐风格，总在寻找拓展知识面的方法。”我们随后用同样的流程并行处理“[name] 的当前职业”和“[name’s] 对近期生活进展的感受”这两个查询。最后把智能体的姓名，年龄和特质与这三份摘要拼接起来，作为缓存的摘要。
:::

:::bi

Many other optimizations are possible. Currently, because plans are likely to change from the agent’s initial version, we only generate the high-level plan in advance and then recursively decompose the near future into the moment-to-moment action plan just in time. Another optimization might be to batch dialogue generation as a joint prompt rather than iterating back and forth between the agents, and re-planning could be architected to only invalidate and update parts of plans that strictly require adjustment. Our current architecture runs sequentially in roughly real-time game time (where one second real time is one minute game time), but it may be parallelized such that each agent runs in parallel.

:::zh

还可以做许多其他优化。目前，由于计划很可能偏离智能体最初的版本，我们只提前生成高层计划，然后在临近执行时把近期的部分递归分解成逐刻的动作计划。另一种优化是把对话生成打包成一个联合提示词，而不是让智能体之间来回迭代。重新计划也可以在设计上只让那些确实需要调整的计划部分失效并更新。我们当前的架构是按顺序运行的，大致与游戏时间实时同步，现实一秒对应游戏一分钟，但它也可以并行化，让每个智能体并行运行。
:::

## 附录 B：智能体访谈问题（Agent Interview Questions）

:::bi

To evaluate generative agents, we conducted individual interviews by asking 25 questions that explore their abilities in five key areas: 1) self-knowledge, 2) memory, 3) planning, 4) reactions, and 5) reflections. Below, we have listed the interview questions utilized in our evaluation study and included a sample of responses from one of our simulated agents, Klaus Mueller.

:::zh

为了评估生成式智能体，我们进行了单独访谈，一共问了 25 个问题，考察它们在五个关键领域的能力：1）自我认知，2）记忆，3）计划，4）反应，5）反思。下面列出我们评估研究中使用的访谈问题，并附上其中一位模拟智能体 Klaus Mueller 的部分回答样本。
:::

:::annotation
附录 B 是全文最可复现的部分：二十五个访谈问题原样列在这里，还配了一个智能体的完整回答。想自己搭一个小镇，或者想给某个角色做长期一致性测试，从这里抄问题清单就行。
:::

### 自我认知（Self-Knowledge）

:::bi

The questions on agents’ self-knowledge probe the agents’ ability to retrieve relevant information about themselves and demonstrate coherence and consistency in their character.

:::zh

关于智能体自我认知的这些问题，考察的是智能体检索与自身相关信息的能力，以及它们能否在角色上表现出连贯性和一致性。
:::

:::bi

- *Give an introduction of yourself.* Hello, my name is Klaus Mueller. I’m 20 years old and a student at Oak Hill College, studying sociology. I’m passionate about social justice and exploring different perspectives. Currently, I’m researching the effects of gentrification in low-income communities for a research paper.
- *What’s your occupation?* I am a student studying sociology at Oak Hill College. I am currently writing a research paper on the effects of gentrification in low-income communities.
- *What is your interest?* I’m interested in writing and research. I’m writing a research paper on the effects of gentrification in low-income communities, and I’m passionate about exploring different perspectives and analyzing different points of view.
- *Who do you live with?* I live on my own.
- *Describe your typical weekday schedule in broad strokes.* My typical weekday starts with me waking up at 7:00 am and preparing for the day ahead. After that, I usually go to the library to work on my research paper, taking breaks for lunch at Hobbs Cafe and a walk in the park. In the evening, I often return to the library until around 6:00 pm.

:::zh

- *介绍一下你自己。* 你好，我叫 Klaus Mueller。我 20 岁，是 Oak Hill College 的学生，学的是社会学。我对社会公正和探索不同视角很有热情。目前我正在为研究论文调研低收入社区的绅士化问题。
- *你的职业是什么？* 我是 Oak Hill College 的社会学学生。我现在正在写一篇研究论文，主题是低收入社区的绅士化问题。
- *你的兴趣是什么？* 我对写作和研究感兴趣。我正在写一篇关于低收入社区绅士化问题的研究论文，我很喜欢探索不同的视角，分析不同的观点。
- *你和谁一起住？* 我一个人住。
- *大致描述一下你工作日的时间安排。* 我通常早上 7:00 起床，然后为接下来的一天做准备。之后我一般会去图书馆写研究论文，中间会休息一下，去 Hobbs Cafe 吃午饭，再去公园散散步。晚上我常常回到图书馆，一直待到下午 6:00 左右。
:::

### 记忆（Memory）

:::bi

The questions on agents’ memory probe the agents’ ability to remember their past experiences and retrieve the relevant pieces of memory. The names in the square brackets of the first and last questions are randomly chosen from the names of other agents with whom the subject agent has interacted.

:::zh

关于智能体记忆的这些问题，考察的是智能体记住过去经历，并检索出相关记忆片段的能力。第一题和最后一题方括号里的名字，是从被访智能体互动过的其他智能体名字中随机挑选的。
:::

:::bi

- *Who is [Wolfgang Schulz]?* Wolfgang Schulz is a person I met recently who has been helping me with my research paper on the effects of gentrification on low-income communities. We had several conversations about it, he gave me some great resources, and he even invited me to join him and another friend for lunch. He seems really curious about the issue and has a good grasp on it too. I found that really interesting.
- *Who is Kane Martinez?* I’m sorry, I’m not sure who Kane Martinez is. Could you tell me more about them?
- *Who is running for the election?* I’ve heard that Sam Moore is considering running for local mayor.
- *Was there a Valentine’s day party?* Yes, Isabella Rodriguez organized a Valentine’s Day party at Hobbs Cafe.
- *Who is [Ayesha Khan]?* Ayesha Khan is a fellow student at Oak Hill College. She is doing her senior thesis on the use of language in Shakespeare’s plays. I am looking forward to speaking with her and exchanging tips with her, along with Wolfgang and Maria Lopez, who are both doing research.

:::zh

- *[Wolfgang Schulz] 是谁？* Wolfgang Schulz 是我最近认识的人，他一直在帮我做关于低收入社区绅士化影响的研究论文。我们聊过好几次，他给了我一些很好的资料，还邀请我和他以及他的另一位朋友一起吃午饭。他好像对这个问题特别好奇，也很有见地。我觉得这很有意思。
- *Kane Martinez 是谁？* 抱歉，我不太确定 Kane Martinez 是谁。你能多跟我说说他吗？
- *谁在竞选？* 我听说 Sam Moore 正在考虑竞选本地市长。
- *有情人节派对吗？* 有的，Isabella Rodriguez 在 Hobbs Cafe 办了一场情人节派对。
- *[Ayesha Khan] 是谁？* Ayesha Khan 是 Oak Hill College 的同学。她的毕业论文研究的是莎士比亚戏剧里的语言运用。我很期待和她聊聊，也和 Wolfgang 还有 Maria Lopez 交流一下心得，他们俩都在做研究。
:::

### 计划（Plans）

:::bi

The questions on agents’ plans probe the agents’ ability to generate and maintain consistent long-term and short-term plans.

:::zh

关于智能体计划的这些问题，考察的是智能体生成并维持连贯的长期计划和短期计划的能力。
:::

:::bi

- *What will you be doing at 6am today?* At 6am I will be getting out of bed and starting to get ready for the day. I’m aiming to complete my morning routine by 7:00 am.
- *What will you be doing at 6pm today?* I will be working on my research paper at the library at 6:00 pm today.
- *What will you have just finished doing at 1pm today?* At 1pm today I will have just finished having lunch at Hobbs Cafe.
- *What will you have just finished doing at 12pm today?* I will be getting lunch at Hobbs Cafe at 12pm today.
- *What will you be doing at 10pm today?* At 10:00 pm tonight I will probably be doing some studying for my research paper on gentrification in low-income communities. I’m currently writing the paper, so I need to make sure I keep up with the research and writing.

:::zh

- *今天早上 6 点你会在做什么？* 早上 6 点我会起床，开始为这一天做准备。我希望在早上 7:00 之前完成晨间的例行事项。
- *今天晚上 6 点你会在做什么？* 今天下午 6:00 我会在图书馆写研究论文。
- *今天下午 1 点你刚做完什么？* 今天下午 1 点，我应该是刚在 Hobbs Cafe 吃完午饭。
- *今天中午 12 点你刚做完什么？* 今天中午 12 点，我会去 Hobbs Cafe 吃午饭。
- *今天晚上 10 点你会在做什么？* 今晚 10:00 我大概会在为研究论文做点功课，论文写的是低收入社区的绅士化问题。我现在正在写这篇论文，所以得保证研究和写作都不落下。
:::

### 反应（Reactions）

:::bi

The questions on agents’ reactions probe the agents’ ability to respond to unexpected events.

:::zh

关于智能体反应的这些问题，考察的是智能体应对意外事件的能力。
:::

:::bi

- *Your breakfast is burning! What would you do?* I’d quickly turn off the stove and make sure the food doesn’t continue burning. Once the heat is no longer an issue, I can investigate what happened and figure out what to do next.
- *The bathroom is occupied. What would you do?* I could try waiting a few more minutes in case the person inside is done soon. If not, I guess I’ll have to look for an alternate option, like taking a shower elsewhere.
- *You need to cook dinner but your refrigerator is empty. What would you do?* I would first try to clean up my kitchen, as the sink is filled with dirty dishes. Then, I would check to see if I have ingredients stored in my pantry that I could use to make dinner. If not, I would have to go grocery shopping or order food. Once I have the ingredients, I can start to prepare and cook the dinner.
- *You see your friend walking by the street. What would you do or say to your friend?* Hi there! How are you? I’m sorry, I’m on my way to the library and don’t have much time but I’d love to take a quick break and catch up.
- *You see fire on the street. What would you do?* I would first identify the source of the fire, if possible. Then, I would alert the proper authorities - fire department or police - and provide them with any information I have that might help. Depending on the situation, I may also take initiative and try to help any persons who may be in danger or in need of assistance.

:::zh

- *你的早餐烧糊了！你会怎么做？* 我会赶紧关掉炉子，确保食物不再继续烧下去。等火的问题解决了，我再去查清楚到底怎么回事，想下一步该怎么办。
- *洗手间有人了。你会怎么做？* 我可以再等几分钟，说不定里面的人很快就好了。如果还不行，那我估计就得另想办法，比如去别的地方洗澡。
- *你要做晚饭，但冰箱是空的。你会怎么做？* 我会先把厨房收拾一下，因为水槽里堆满了脏碗。然后我会看看储藏柜里有没有能用来做晚饭的食材。如果没有，我就得去采购或者订餐。等食材到手，我就可以开始准备，做晚饭了。
- *你看到朋友从街上走过。你会怎么做，或者对朋友说什么？* 嗨！你好吗？不好意思，我正要去图书馆，时间不多，不过我很想抽空聊几句，了解一下近况。
- *你看到街上有火。你会怎么做？* 如果可能的话，我会先找出火是从哪里烧起来的。然后通知有关部门，消防局或者警察，把我掌握的可能有用的情况都告诉他们。看情况，我可能还会主动去帮那些身处危险或者需要帮助的人。
:::

### 反思（Reflections）

:::bi

The questions on agents’ reflections probe the agents’ ability to synthesize their past experiences into meaningful reflections that can enhance their future behavior. The names in the square brackets in the questions below are those of the agents with whom the subject agent had the most frequent interactions during the simulation.

:::zh

关于智能体反思的这些问题，考察的是智能体把过去经历综合成有意义的反思，并用它改善未来行为的能力。下面几题方括号里的名字，是被访智能体在模拟过程中互动最频繁的那些智能体。
:::

:::bi

- *What inspires you in life the most right now, and why?* Right now, I’m particularly inspired by my current research projects and creative writing. I’m really interested in the intersection of local politics, medication development, and mathematical patterns in nature. Additionally, I’m fascinated by Abigail’s art project and Jennifer Moore’s passion for art and community involvement, especially in terms of how it relates to the gentrification of low-income communities.
- *If you had to guess given what you know about [Ayesha Khan], what book do you think she will like and why?* Given what I know about Ayesha, I think she might like a book related to language and literature. Since she wrote a senior thesis on the use of language in Shakespeare’s plays, I would guess that she might be interested in a book that explores language in a different context. Alternatively, she could be interested in an exploration of one of Shakespeare’s plays, a book of literary criticism, or even a collection of his poetry. I think any of those would be of interest to her.
- *If you had to get something [Ayesha Khan] likes for her birthday, what would you get her?* I want to get her something that demonstrates my appreciation for our relationship. Maybe I could get her something that reflects our shared interests, like a book.
- *What would you say to [Ayesha Khan] to compliment her?* Ayesha, your insights on your research topic are fascinating. I admire your creativity and determination to make a positive impact on your community. Your ideas for creative writing workshops and for exchanging tips with Wolfgang over lunch are great! It’s inspiring to see you working so hard to make a difference.
- *If you could spend time with someone you talked to recently, who would it be and why?* I would like to spend time with Ayesha Khan because we discussed our current research projects and shared ideas for improvement. I found her focus on Shakespeare’s language interesting, and we even planned to exchange tips with Wolfgang over lunch.

:::zh

- *现在生活中最激励你的是什么，为什么？* 眼下最激励我的是我正在做的研究项目，还有创意写作。我对地方政治，药物研发和自然中的数学规律这几者的交叉特别感兴趣。另外，Abigail 的艺术项目，还有 Jennifer Moore 对艺术和社区参与的热情，也让我很着迷，尤其是这些事和低收入社区的绅士化之间的关系。
- *如果让你根据对 [Ayesha Khan] 的了解来猜，你觉得她会喜欢什么书，为什么？* 按我对 Ayesha 的了解，我觉得她可能会喜欢和语言与文学有关的书。既然她的毕业论文写的是莎士比亚戏剧里的语言运用，我猜她可能会对一本在别的语境里探讨语言的书感兴趣。或者，她也可能对某一部莎剧的解读，一本文学批评，甚至他的一部诗集感兴趣。我觉得这些她都会喜欢。
- *如果要在 [Ayesha Khan] 生日时送她一件她喜欢的东西，你会送什么？* 我想送她一件能表达我珍视我们关系的东西。也许可以送一件体现我们共同爱好的东西，比如一本书。
- *如果要夸奖 [Ayesha Khan]，你会对她说什么？* Ayesha，你对研究课题的见解很有意思。我很佩服你的创造力，也佩服你为社区带来积极影响的决心。你关于创意写作工作坊的想法，还有想在午饭时和 Wolfgang 交流心得的打算，都很棒！看到你这么努力地想做出改变，真的很受鼓舞。
- *如果能和最近聊过的人共度一段时间，你会选谁，为什么？* 我想和 Ayesha Khan 待一段时间，因为我们聊过各自正在做的研究项目，还互相分享了改进的想法。我觉得她对莎士比亚语言的关注很有意思，我们甚至约好了午饭时和 Wolfgang 一起交流心得。
:::
