---
title: '从人设到个性化：角色扮演语言智能体综述'
description: '“角色扮演语言智能体”（RPLA）在2024年的时候算是一个正在爆发的方向，而这篇文章将其系统梳理了一遍：按人口统计人设，角色人设，个性化人设三类划分，从数据来源，构建方法到评测各讲一遍，最后讨论毒性，偏见，幻觉，隐私与部署挑战，并盘点市面上的产品，给出了一条从“群体刻板印象”到“你自己的数字分身”的清晰谱系。'
pubDate: 2026-11-15
author: 'Jiangjie Chen，Xintao Wang，Rui Xu，Siyu Yuan 等十八人'
category: papers
tags: ['角色扮演', '人格一致性', '多智能体', 'LLM', '复旦团队·Jiangjie Chen 等']
subcategory: 'paper-llm'
---

:::source
- **论文**：From Persona to Personalization: A Survey on Role-Playing Language Agents
- **作者**：Jiangjie Chen，Xintao Wang，Rui Xu，Siyu Yuan，Yikai Zhang，Wei Shi，Jian Xie，Shuang Li，Ruihan Yang，Tinghui Zhu，Aili Chen，Nianqi Li，Lida Chen，Caiyu Hu，Siye Wu，Scott Ren，Ziquan Fu，Yanghua Xiao（前七位为共同一作）
- **机构**：复旦大学（另有上海大学，武汉大学，加州大学圣塔芭芭拉分校，System, Inc.）
- **发表**：TMLR 2024，arXiv 2404.18231
- **原文**：[arxiv.org/abs/2404.18231](https://arxiv.org/abs/2404.18231)
- **评审**：[OpenReview 评审记录](https://openreview.net/forum?id=xrO70E8UIZ)
:::

> [!NOTE]
> 本文是论文《From Persona to Personalization: A Survey on Role-Playing Language Agents》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文八节全译，附录只收了正文 §1 引用到的附录 A（RPLA 产品清单），致谢和参考文献没有收。章节编号和图号都沿用原文，所以跨节引用（§4.1，图 1 这类）和原文对得上，但和本站目录的编号不一定一致。原文用作者年份制引用，正文里（Shanahan et al., 2023）这类标记原样保留，没有附参考文献表。两张图和四张表都是论文原图，表 4 在原文里跨了四页，这里切成四张（1/4 到 4/4），图注下面那行中文小字是我加的说明。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

## 摘要（Abstract）

:::bi

Recent advancements in large language models (LLMs) have significantly boosted the rise of Role-Playing Language Agents (RPLAs), *i.e.*, specialized AI systems designed to simulate assigned personas.
By harnessing multiple advanced abilities of LLMs, including in-context learning, instruction following, and social intelligence, RPLAs achieve a remarkable sense of human likeness and vivid role-playing performance.
RPLAs can mimic a wide range of personas, ranging from historical figures and fictional characters to real-life individuals.
Consequently, they have catalyzed numerous AI applications, such as emotional companions, interactive video games, personalized assistants and copilots, and digital clones.
In this paper, we conduct a comprehensive survey of this field, illustrating the evolution and recent progress in RPLAs integrating with cutting-edge LLM technologies.
We categorize personas into three types:

:::zh

大语言模型（LLM）的最新进展显著推动了角色扮演语言智能体（RPLA）的兴起，RPLA 即专门用于模拟指定人设的 AI 系统。
通过利用 LLM 的多项高级能力，包括上下文学习，指令遵循和社会智能，RPLA 实现了出色的类人感和生动的角色扮演表现。
RPLA 可以模仿广泛的人设，涵盖历史人物，虚构角色乃至现实生活中的个人。
因此，它们催生了众多 AI 应用，例如情感陪伴，互动电子游戏，个性化助手与副驾驶（copilot），以及数字分身。
在本文中，我们对该领域进行了全面的综述，阐述了 RPLA 与前沿 LLM 技术融合的演变与最新进展。
我们将人设分为三种类型：
:::

:::bi

- Demographic Persona, which leverages statistical stereotypes;
- Character Persona, focused on well-established figures; and
- Individualized Persona, customized through ongoing user interactions for personalized services.

:::zh

- 人口统计人设，利用统计上的刻板印象。
- 角色人设，聚焦于广为人知的人物。
- 个性化人设，通过持续的用户交互定制，以提供个性化服务。
:::

:::annotation
整篇综述的骨架就是这三类人设：人口统计人设用“群体刻板印象”，角色人设用“已有名人的资料”，个性化人设用“和你持续互动攒下的个人数据”。三类按个性化数据的多少递进，后文 §4，§5，§6 各占一节，认准这条主线读起来会轻松很多。
:::

:::bi

We begin by presenting a comprehensive overview of current methodologies for RPLAs, followed by the details for each persona type, covering corresponding data sourcing, agent construction, and evaluation.
Afterward, we discuss the fundamental risks, existing limitations, and prospects of RPLAs.
Additionally, we provide a brief review of RPLAs in AI products in the market, which reflects practical user demands that shape and drive RPLA research.
Through this survey, we aim to establish a clear taxonomy of RPLA research and applications, facilitate future research in this critical and ever-evolving field, and pave the way for a future where humans and RPLAs coexist in harmony.

:::zh

我们首先全面概述 RPLA 的当前方法论，随后详细介绍每种人设类型，涵盖相应的数据来源，智能体构建和评测。
之后，我们讨论 RPLA 的根本性风险，现有限制和前景。
此外，我们简要回顾了市场上 AI 产品中的 RPLA，这反映了塑造并驱动 RPLA 研究的实际用户需求。
通过这篇综述，我们希望建立 RPLA 研究与应用的清晰分类体系，推动这一关键且不断演进领域的未来研究，并为人类与 RPLA 和谐共存的未来铺平道路。
:::

## 引言（Introduction）

:::bi

Digital life has been a pursuit for humanity for decades, reflecting our deep-rooted fascination with the intersection of technology and human experience.
Bridging this pursuit with imaginative concepts, role-playing AI systems embody the digital life by bringing these personas to life in interactive forms.
These systems, which simulate assigned personas, have long been a concept in the human imagination, capturing the essence of our desire to create and interact with artificial beings that can understand, respond, and engage with us in a seemingly sentient manner.
With role-playing agents, various personas can be replicated by their agent counterparts, including historical figures, fictional characters, or individuals in our daily lives.
Recently, focusing on the text modality, **Role-Playing Language Agents (RPLAs)** are coming into reality (Shanahan et al., 2023; Shao et al., 2023; Wang et al., 2024d), which inspires a wide range of novel applications, such as digital clones for individuals (Xu et al., 2024b; Ng et al., 2024), AI characters in chatbots (Wang et al., 2024a), and role-playing video games (Wang et al., 2023a), even stimulating social science research (Rao et al., 2023).
As RPLAs become increasingly integrated into our daily lives, it is essential to foster a society that thrives on the synergistic coexistence of humans and these intelligent agents.

:::zh

数字生命数十年来一直是人类追求的目标，反映了我们对技术与人类体验交汇之处的深厚迷恋。
角色扮演 AI 系统将这一追求与富有想象力的概念桥接起来，通过以交互形式让这些人设鲜活起来，从而具象化了数字生命。
这些模拟指定人设的系统，长期以来一直是人类想象中的概念，抓住了我们创造人工存在并与之交互的渴望本质，这些人工存在能够以看似有知觉的方式理解我们，回应我们，并与我们互动。
借助角色扮演智能体，各种人设都可以由其智能体对应物加以复现，包括历史人物，虚构角色或我们日常生活中的个人。
最近，聚焦于文本模态，**角色扮演语言智能体（RPLA）**正在成为现实（Shanahan et al., 2023; Shao et al., 2023; Wang et al., 2024d），这催生了广泛的新应用，例如个人的数字分身（Xu et al., 2024b; Ng et al., 2024），聊天机器人中的 AI 角色（Wang et al., 2024a）和角色扮演电子游戏（Wang et al., 2023a），甚至推动了社会科学研究（Rao et al., 2023）。
随着 RPLA 日益融入我们的日常生活，培育一个依靠人类与这些智能体协同共存而繁荣的社会至关重要。
:::

:::bi

Recent developments in Large Language Models (LLMs) (OpenAI, 2023; Google, 2023; Anthropic, 2024) have greatly facilitated the emergence of RPLAs.
LLMs grow adept at producing a compelling sense of human likeness (Shanahan et al., 2023; Zhou et al., 2024b), and can be regarded as superpositions of beliefs (Kovač et al., 2023) and personas (Lu et al., 2024).
Furthermore, with alignment training, LLMs are able to adhere to the instruction of *persona role-playing*, including replicating their knowledge (Lu et al., 2024; Li et al., 2023a), linguistic and behavior patterns (Wang et al., 2024a; Zhou et al., 2023a), and even underlying personalities (Shao et al., 2023; Wang et al., 2024d).
They are able to both mimic the personas as prompted in the contexts (Wang et al., 2024a; Li et al., 2023a), or harness their inherent parametric knowledge for widely-recognized demographics or characters (Shao et al., 2023; Lu et al., 2024).
Considering their practical significance, there has been an increase in research efforts dedicated to RPLAs with LLMs, including their development (Wang et al., 2024a; Li et al., 2023a; Zhou et al., 2023a), analysis (Shao et al., 2023; Yuan et al., 2024b), and applications (Rao et al., 2023; Park et al., 2023; Mysore et al., 2023).
Conversely, RPLAs also benefit the development of LLMs and language agents.
They offer an ideal perspective and testing ground for investigating the behaviors and capabilities of LLMs and language agents, particularly those related to social interactions (Li et al., 2023d; Chen et al., 2023a; Wu et al., 2024c).
They also facilitate the creation of diverse and massive synthetic data for LLM training at scale (Chan et al., 2024).

:::zh

大语言模型（LLM）的最新发展（OpenAI, 2023; Google, 2023; Anthropic, 2024）极大地促进了 RPLA 的出现。
LLM 越来越擅长产生令人信服的类人感（Shanahan et al., 2023; Zhou et al., 2024b），并且可以被视为信念（Kovač et al., 2023）与人设（Lu et al., 2024）的叠加。
此外，通过对齐训练，LLM 能够遵循*人设角色扮演*的指令，包括复现其知识（Lu et al., 2024; Li et al., 2023a），语言和行为模式（Wang et al., 2024a; Zhou et al., 2023a），乃至深层的性格（Shao et al., 2023; Wang et al., 2024d）。
它们既能够按照上下文中提示的那样模仿人设（Wang et al., 2024a; Li et al., 2023a），也能够利用其固有的参数化知识来扮演广为人知的人口群体或角色（Shao et al., 2023; Lu et al., 2024）。
考虑到它们的实际意义，专注于基于 LLM 的 RPLA 的研究工作有所增加，包括其开发（Wang et al., 2024a; Li et al., 2023a; Zhou et al., 2023a），分析（Shao et al., 2023; Yuan et al., 2024b）和应用（Rao et al., 2023; Park et al., 2023; Mysore et al., 2023）。
反过来，RPLA 也促进了 LLM 和语言智能体的发展。
它们为研究 LLM 和语言智能体的行为与能力提供了理想的视角和试验场，尤其是那些与社会交互相关的方面（Li et al., 2023d; Chen et al., 2023a; Wu et al., 2024c）。
它们还促进了多样化且大规模的合成数据的生成，用于大规模训练 LLM（Chan et al., 2024）。
:::

:::figure
![Figure 1: An overview of various persona types for RPLAs. In this survey, we cat](./images/rpla-survey/fig-01.png)

Figure 1: An overview of various persona types for RPLAs. In this survey, we categorize personas into three types: *1)* Demographic Persona, *2)* Character Persona, and *3)* Individualized Persona. We showcase their definition, data sources, examples, use cases and corresponding applications.

:::zh
图 1：三类人设的总览。左中右三栏分别是人口统计人设，角色人设，个性化人设，每栏从“定义”到“数据来源 / 例子 / 用例 / 应用”自上而下展开，中间还各给了一段模拟对话。看这张图可以快速抓住三类的边界：按个性化数据的多少从少到多递进。
:::
:::

:::annotation
“角色扮演语言智能体”和站里另一篇《生成式智能体》（斯坦福 AI 小镇）是同一脉络：那篇让二十五个角色在小镇里自然生活，这篇把整个方向沉淀成一张全景图。AI 小镇更偏“可信”，这篇更偏“人设与个性化”的分类学。
:::

:::bi

In this paper, we conduct a comprehensive survey on RPLAs.
Our study primarily focuses on the persona and personalization of RPLAs.
Specifically, as shown in Figure 1, we categorize personas within RPLA literature at three levels, with a progressive integration of personalized data:

:::zh

在本文中，我们对 RPLA 进行了全面的综述。
我们的研究主要聚焦于 RPLA 的人设与个性化。
具体而言，如图 1 所示，我们将 RPLA 文献中的人设划分为三个层次，并逐步整合个性化数据：
:::

:::bi

- **Demographic Persona**, *i.e.*, focusing on groups of people sharing common characteristics, such as occupations, ethnic groups, personality types, *etc*. These personas are inherent in LLMs, and role-playing them capitalizes on the statistical stereotypes in LLMs (Huang et al., 2023c; Xu et al., 2023a; Gupta et al., 2023).
- **Character Persona**, which represents well-established and widely-recognized individuals, especially in the existing literature, including celebrities, historical figures, and fictional characters. Role-playing these personas challenges models’ capability in understanding curated materials of the existing characters, harnessing knowledge in LLMs’ parameters or given contexts (Shao et al., 2023; Wang et al., 2024a; Wang et al., 2024d).
- **Individualized Persona**, referring to digital profiles built and continuously updated based on personalized user data. This category emphasizes the unique experiences, needs, and preferences of individuals, aiming for applications such as digital clones or personal assistance (Salemi et al., 2024; Woźniak et al., 2024). RPLAs for these personas underscore their dynamic nature and learning mechanism and frequently focus on interactions with real-world activities (Dalvi Mishra et al., 2022; Chen et al., 2023b; Salemi et al., 2024).

:::zh

- **人口统计人设**，即聚焦于具有共同特征的人群，例如职业，民族，性格类型等。这些人设内在于 LLM 之中，扮演它们利用了 LLM 中的统计刻板印象（Huang et al., 2023c; Xu et al., 2023a; Gupta et al., 2023）。
- **角色人设**，代表广为人知且被广泛认可的个体，尤其是在现有文献中，包括名人，历史人物和虚构角色。扮演这些人设考验模型理解现有角色精选材料，利用 LLM 参数或给定上下文中知识的能力（Shao et al., 2023; Wang et al., 2024a; Wang et al., 2024d）。
- **个性化人设**，指基于个性化用户数据构建并持续更新的数字画像。这一类别强调个体的独特经历，需求和偏好，面向数字分身或个人助理等应用（Salemi et al., 2024; Woźniak et al., 2024）。面向这些人设的 RPLA 强调其动态特性和学习机制，并经常关注与现实世界活动的交互（Dalvi Mishra et al., 2022; Chen et al., 2023b; Salemi et al., 2024）。
:::

:::bi

The three types of personas exhibit a progressive relationship and can coexist in RPLAs.
For example, an RPLA portraying *Socrates* as a personal philosophy tutor would encompass the demographic persona of an *ancient Greek philosopher*, the character persona of *Socrates*, and an individualized persona that develops through interactions with the user.
Following this categorization, we explore common methodologies, fundamental risks, current gaps and limitations, and future prospects of RPLAs in this survey.

:::zh

三种类型的人设呈现出递进关系，并且可以在 RPLA 中共存。
例如，一个将 *Socrates*（苏格拉底）塑造为私人哲学导师的 RPLA，会同时包含*古希腊哲学家*这一人口统计人设，*Socrates*这一角色人设，以及通过与用户交互发展出的个性化人设。
遵循这一分类，我们在本综述中探讨了 RPLA 的通用方法论，根本性风险，当前不足与局限，以及未来前景。
:::

:::annotation
注意“progressive integration of personalized data”这个说法：三类人设不是并列的三种，而是个性化数据从无到有，从粗到细的一条谱系。同一个 RPLA 可以同时占三类，下文举的苏格拉底哲学导师就是例子。
:::

:::bi

In summary, this survey systematically reviews existing literature in the field of RPLAs, and establishes taxonomies for relevant methodologies as shown in Figure 2.
The remainder of our paper is structured as follows:
§2 introduces the background for RPLAs, covering the roadmap, recent progress, and trends in LLMs and language agents.
§3 then presents the overview of current research in RPLAs.
§4,5,6 detail the research on RPLAs for demographic, character, and individualized persona, respectively.
§7 discusses potential risks of RPLAs, such as toxicity, biases and misuse.
Finally, §8 concludes this survey and identifies future directions.
Additionally, aiming to bridge the gap between theoretical insights and practical applications for our readers, we also conduct a brief survey of current RPLA products in the rapidly growing market in Appendix A.

:::zh

总之，本综述系统地回顾了 RPLA 领域的现有文献，并如图 2 所示建立了相关方法论的分类体系。
本文其余部分的结构如下：
第 2 节介绍 RPLA 的背景，涵盖 LLM 和语言智能体的发展路线，最新进展与趋势。
第 3 节随后呈现当前 RPLA 研究的概览。
第 4 节，第 5 节和第 6 节分别详述面向人口统计人设，角色人设和个性化人设的 RPLA 研究。
第 7 节讨论 RPLA 的潜在风险，例如毒性，偏见和滥用。
最后，第 8 节总结本综述并指出未来方向。
此外，为了弥合读者在理论洞见与实际应用之间的差距，我们还在附录 A 中对快速增长的市场中当前的 RPLA 产品进行了简要调研。
:::

## 预备知识（Preliminary）

### 大语言模型的发展路线（The Roadmap of Large Language Models）

:::bi

Recently, LLMs have demonstrated impressive capabilities, with promising potential in approaching human-level intelligence (Brown et al., 2020; OpenAI, 2022; Anil et al., 2023; Anthropic, 2023a; Anthropic, 2023b; OpenAI, 2023).
LLMs are artificial neural networks with billions of parameters, trained on vast amounts of natural language data representing human knowledge and intelligence.
Their accomplishments extend beyond excelling in NLP tasks to effectively simulating a broader range of human behaviors.
Specifically, they have showcased more nuanced capabilities towards anthropomorphic cognition, including humanity emulation (Shanahan et al., 2023; Huang et al., 2023c) and social intelligence (Kosinski, 2023; Li et al., 2023d; Kim et al., 2023b), thus producing a compelling sense of human likeness.
As a result, advancements in LLMs have significantly facilitated the creation of intelligent RPLAs (Park et al., 2023; Sclar et al., 2023; Shao et al., 2023), establishing new effective methodologies different from previous models.

:::zh

最近，LLM 展现出了令人印象深刻的能力，在接近人类水平智能方面具有广阔潜力（Brown et al., 2020; OpenAI, 2022; Anil et al., 2023; Anthropic, 2023a; Anthropic, 2023b; OpenAI, 2023）。
LLM 是拥有数十亿参数的人工神经网络，在海量代表人类知识与智能的自然语言数据上训练而成。
它们的成就不仅限于在 NLP 任务中表现出色，还扩展到有效模拟更广泛的人类行为。
具体而言，它们展现出面向拟人认知的更细腻能力，包括人性模拟（Shanahan et al., 2023; Huang et al., 2023c）和社会智能（Kosinski, 2023; Li et al., 2023d; Kim et al., 2023b），从而产生令人信服的类人感。
因此，LLM 的进展显著促进了智能 RPLA 的创建（Park et al., 2023; Sclar et al., 2023; Shao et al., 2023），建立了不同于以往模型的新型有效方法论。
:::

#### LLM 中涌现的能力（Emerged Abilities in LLMs）

:::bi

Several key abilities have emerged in LLMs (Wei et al., 2022a) throughout their evolution, including in-context learning (Brown et al., 2020), instruction following (Ouyang et al., 2022), step-by-step reasoning (Wei et al., 2022b), and social intelligence (Wang et al., 2024b; Sclar et al., 2023; Light et al., 2023), which lay the foundation for complicated role-playing behavior of LLMs towards RPLAs.
First, the in-context learning ability allows LLMs to learn information from prompts without parameter updates.
This facilitates LLMs’ adaptation to the provided knowledge of various characters and mimicking their behaviors by following example demonstrations.
Second, the instruction following ability enables LLMs to adhere to role-playing instructions, such as “*Serve as a helpful assistant*” or “*Role-play Hermione Granger in the Harry Potter Series. \<Description\>. \<Example Conversations\>. \<Requirements\>.*”.
Finally, step-by-step reasoning and social intelligence refine LLMs in terms of anthropomorphic cognition, contributing to an enriched sense of human likeness and nuanced emotional support in RPLA applications.

:::zh

在 LLM 的演进过程中（Wei et al., 2022a），涌现出了若干关键能力，包括上下文学习（Brown et al., 2020），指令遵循（Ouyang et al., 2022），逐步推理（Wei et al., 2022b）和社会智能（Wang et al., 2024b; Sclar et al., 2023; Light et al., 2023），这些能力为 LLM 走向 RPLA 的复杂角色扮演行为奠定了基础。
首先，上下文学习能力使 LLM 能够在无需更新参数的情况下从提示中学习信息。
这有助于 LLM 适应所提供的各种角色知识，并通过遵循示例演示来模仿它们的行为。
其次，指令遵循能力使 LLM 能够遵循角色扮演指令，例如“*扮演一个乐于助人的助手*”或“*在 Harry Potter 系列中扮演 Hermione Granger（赫敏·格兰杰）。\<Description\>. \<Example Conversations\>. \<Requirements\>.*”。
最后，逐步推理和社会智能在拟人认知方面精进了 LLM，有助于在 RPLA 应用中提升类人感和细腻的情感支持。
:::

:::annotation
这四个能力是 RPLA 的技术底座：上下文学习负责“照着资料演”，指令遵循负责“听清要求”，分步推理和社会智能负责“演得像人”。没有它们，角色扮演就退回模板填空。
:::

#### LLM 中的拟人认知（Anthropomorphic Cognition in LLMs）

:::bi

Recent research has showcased the emergence of many human-like traits in LLMs (Park et al., 2023; Park et al., 2022).
Initially, LaMDA (Cohen et al., 2022) sparked the first discussion that
consciousness might have emerged in language models.
Since then, there has been growing research focus on human-like traits in LLMs, including self-awareness (Li et al., 2024c; Blum & Blum, 2023), values (Scherrer et al., 2023; Hartmann et al., 2023), emotional perception (Huang et al., 2023a; Lee et al., 2023), psychopathy (Coda-Forno et al., 2023; Li et al., 2022) and personalities (Huang et al., 2023c; Miotto et al., 2022).
Shanahan et al. (2023) attributes such humanity emulation to the role-playing nature of LLMs, *i.e.*, generating text that resembles human dialogue, which should not be regarded as an indication of consciousness.

:::zh

最近的研究展示了 LLM 中许多类人特质的涌现（Park et al., 2023; Park et al., 2022）。
最初，LaMDA（Cohen et al., 2022）引发了首次讨论，认为语言模型中可能已经涌现出意识。
自那以后，关于 LLM 中类人特质的研究关注日益增多，包括自我意识（Li et al., 2024c; Blum & Blum, 2023），价值观（Scherrer et al., 2023; Hartmann et al., 2023），情绪感知（Huang et al., 2023a; Lee et al., 2023），精神病态（Coda-Forno et al., 2023; Li et al., 2022）和性格（Huang et al., 2023c; Miotto et al., 2022）。
Shanahan et al. (2023) 将这种人性模拟归因于 LLM 的角色扮演本质，即生成类似于人类对话的文本，这不应被视为意识存在的迹象。
:::

#### LLM 的检索增强生成（Retrieval-augmented Generation of LLMs）

:::bi

Retrieval-augmented generation (RAG) recently gains popularity as a method to enhance the capability of LLMs by integrating external data retrieval into the generative process (Karpukhin et al., 2020; Lewis et al., 2020; Alon et al., 2022; Ma et al., 2023b; Berchansky et al., 2023; Jiang et al., 2023b).
By dynamically retrieving information from knowledge bases during the inference phase, RAG greatly mitigates the generation of factually incorrect content (Borgeaud et al., 2022; Cheng et al., 2023b; Dai et al., 2023b; Kim et al., 2023a), thereby making RAG an effective method in the role-playing scenarios (Shao et al., 2023; Chen et al., 2023c; Zhou et al., 2023a).
Moreover, with the extension of context length in recent research (Wang et al., 2020; Li et al., 2023b; Liu et al., 2023b; Ding et al., 2023a; Chen et al., 2023d; Han et al., 2023; Packer et al., 2023; Liu et al., 2024; Su et al., 2024), LLMs have unlocked new potentials for role-playing, being able to understand novels and documents without retrieval mechanism that fragments persona information.

:::zh

检索增强生成（RAG）最近作为一种方法日益流行，它通过将外部数据检索整合进生成过程来增强 LLM 的能力（Karpukhin et al., 2020; Lewis et al., 2020; Alon et al., 2022; Ma et al., 2023b; Berchansky et al., 2023; Jiang et al., 2023b）。
通过在推理阶段从知识库动态检索信息，RAG 极大地减少了事实上错误内容的生成（Borgeaud et al., 2022; Cheng et al., 2023b; Dai et al., 2023b; Kim et al., 2023a），从而使 RAG 成为角色扮演场景中的一种有效方法（Shao et al., 2023; Chen et al., 2023c; Zhou et al., 2023a）。
此外，随着近期研究中上下文长度的扩展（Wang et al., 2020; Li et al., 2023b; Liu et al., 2023b; Ding et al., 2023a; Chen et al., 2023d; Han et al., 2023; Packer et al., 2023; Liu et al., 2024; Su et al., 2024），LLM 为角色扮演解锁了新的潜力，能够理解小说和文档，而无需依赖会割裂人设信息的检索机制。
:::

### LLM 驱动的语言智能体（LLM-powered Language Agents）

:::bi

The AI community has long been pursuing the concept of “agent”, approaching the intelligence and autonomy of humans.
Traditional symbolic agents (Bernstein, 2001; Küngas et al., 2004) and reinforce-learning agents (Fachantidis et al., 2017; Florensa et al., 2018) mainly optimize their actions based on rules or pre-defined rewards.
Research in language agents primarily focuses on training within constrained environments with limited knowledge, diverging from the complex and diverse nature of the human learning process.
However, such agents struggle to emulate complicated human-like behaviors, particularly in open-domain settings (Mnih et al., 2015; Lillicrap et al., 2015; Schulman et al., 2017; Haarnoja et al., 2017).
Recently, LLMs have demonstrated remarkable capabilities with promising potential in achieving human-level intelligence, which has sparked a rise in research focusing on LLM-based language agents (Sclar et al., 2023; Chalamalasetti et al., 2023; Liu et al., 2023d; Xie et al., 2024b).
Research in this area primarily involves equipping LLMs with essential human-like capabilities, such as planning, tool-usage and memory (Weng, 2023),
which are essential for developing advanced RPLAs with anthropomorphic cognition and abilities.

:::zh

AI 社区长期以来一直在追求“智能体”（agent）这一概念，以接近人类的智能和自主性。
传统的符号智能体（Bernstein, 2001; Küngas et al., 2004）和强化学习智能体（Fachantidis et al., 2017; Florensa et al., 2018）主要基于规则或预定义奖励来优化其行动。
语言智能体方面的研究主要聚焦于在知识有限且受限的环境中训练，这与人类学习过程的复杂多样本质相背离。
然而，这类智能体难以模仿复杂的人类行为，尤其是在开放域环境中（Mnih et al., 2015; Lillicrap et al., 2015; Schulman et al., 2017; Haarnoja et al., 2017）。
最近，LLM 展现出了卓越的能力，在实现人类水平智能方面具有广阔潜力，这引发了基于 LLM 的语言智能体研究的兴起（Sclar et al., 2023; Chalamalasetti et al., 2023; Liu et al., 2023d; Xie et al., 2024b）。
该领域的研究主要涉及为 LLM 配备必要的类人能力，例如规划，工具使用和记忆（Weng, 2023），
这些能力对于开发具备拟人认知与能力的高级 RPLA 至关重要。
:::

#### 规划模块（Planning Module）

:::bi

In many real-world scenarios, the agents need to make long-horizon planning to solve complex tasks (Rana et al., 2023; Yuan et al., 2023).
When facing these tasks, LLM-powered agents could decompose the complex tasks into subtasks and adopt various planning strategies, *e.g.*, CoT (Wei et al., 2022b) and ReAct (Yao et al., 2023b), to adaptively plan for the next action with feedback from environments (Wang et al., 2023a; Gotts et al., 2003; Wang et al., 2023i; Song et al., 2023; Zhang et al., 2024b).
For RPLAs, these adaptive planning strategies enable them to simulate realistic and dynamic interactions in complicated environments such as games (Wang et al., 2023a) and social simulations (Park et al., 2023).

:::zh

在许多现实场景中，智能体需要进行长期规划来解决复杂任务（Rana et al., 2023; Yuan et al., 2023）。
在面对这些任务时，LLM 驱动的智能体可以将复杂任务分解为子任务，并采用各种规划策略，例如 CoT（Wei et al., 2022b）和 ReAct（Yao et al., 2023b），结合来自环境的反馈自适应地规划下一步行动（Wang et al., 2023a; Gotts et al., 2003; Wang et al., 2023i; Song et al., 2023; Zhang et al., 2024b）。
对于 RPLA 而言，这些自适应规划策略使它们能够在游戏（Wang et al., 2023a）和社会模拟（Park et al., 2023）等复杂环境中模拟真实且动态的交互。
:::

#### 工具使用模块（Tool-usage Module）

:::bi

Although LLMs excel in various tasks, they may struggle in domains requiring extensive expertise and experience hallucination issues (Gou et al., 2023; Chen et al., 2023e; Wang et al., 2023f).
To address these challenges, agents could apply external tools for action execution (Shen et al., 2023b; Lu et al., 2023; Schick et al., 2023; Parisi et al., 2022; Yang et al., 2023b; Yuan et al., 2024a).
The tools include real-world APIs (Patil et al., 2023; Li et al., 2023g; Qin et al., 2023; Xu et al., 2023b; Shen et al., 2023c), knowledge bases (Zhuang et al., 2024; Hsieh et al., 2023), external models (Bran et al., 2023; Ruan et al., 2023), and customized actions for specific applications (Wang et al., 2023a; Zhu et al., 2023b).
For RPLAs, these tools typically enable them to interact with the environments, *e.g.*,
games or software applications.
The integration of external tools enhances role-playing and generative agents by enabling them to execute actions and access information beyond their intrinsic capabilities.
This facilitates more accurate and contextually appropriate interactions, particularly in specialized or complex scenarios, thereby significantly improving the quality and effectiveness of their responses in user engagements.

:::zh

尽管 LLM 在各种任务中表现出色，但在需要大量专业知识的领域中它们可能会力不从心，并出现幻觉问题（Gou et al., 2023; Chen et al., 2023e; Wang et al., 2023f）。
为了应对这些挑战，智能体可以应用外部工具来执行行动（Shen et al., 2023b; Lu et al., 2023; Schick et al., 2023; Parisi et al., 2022; Yang et al., 2023b; Yuan et al., 2024a）。
这些工具包括现实世界的 API（Patil et al., 2023; Li et al., 2023g; Qin et al., 2023; Xu et al., 2023b; Shen et al., 2023c），知识库（Zhuang et al., 2024; Hsieh et al., 2023），外部模型（Bran et al., 2023; Ruan et al., 2023），以及面向特定应用的定制化行动（Wang et al., 2023a; Zhu et al., 2023b）。
对于 RPLA 而言，这些工具通常使它们能够与环境交互，例如游戏或软件应用。
外部工具的整合通过使角色扮演智能体和生成式智能体能够执行行动并获取超出其固有能力的信息，从而增强了它们。
这有助于实现更准确且更符合上下文的交互，尤其是在专业或复杂场景中，从而显著提升它们在与用户互动中回应的质量和有效性。
:::

#### 记忆机制（Memory Mechanism）

:::bi

The memory mechanism stores the profile of agents along with environmental information to assist agents in future actions.
The profile typically includes basic information (age, gender, career), psychological traits (reflecting personality), and social relationships (Wang et al., 2023c; Park et al., 2023; Qian et al., 2023), which can be manually created (Caron & Srivastava, 2022; Zhang et al., 2023a; Pan & Zeng, 2023; Huang et al., 2023b; Karra et al., 2022; Safdari et al., 2023) or generated from models (Wang et al., 2023c).
This module enables agents to accumulate experiences, evolve, and act consistently and effectively (Park et al., 2023).
Language agents draw from cognitive science research on human memory, which progresses from sensory to short-term, then to long-term memory (Atkinson & Shiffrin, 1968; Craik & Jennings, 1992).
The short-term memory is regarded as the information input within the constraint window of transformer architecture (Fischer, 2023; Rana et al., 2023; Wang et al., 2023i; Zhu et al., 2023a).
In contrast, long-term memory is usually reserved in the external vector storage (Qian et al., 2023; Zhong et al., 2023; Zhu et al., 2023b; Lin et al., 2023; Xie et al., 2023; Wu et al., 2024b) or natural languages database (Shinn et al., 2023; Modarressi et al., 2023), from which agents can quickly query and retrieve information as required.
Compared to vanilla LLMs, language agents need to learn and perform tasks in changing environments.
For RPLAs, the memory mechanism plays a pivotal role by enabling these agents to maintain continuity and context in interactions over time.
By storing and retrieving user-specific data and environmental context, agents deliver more personalized and relevant responses, thus enhancing user experience and engagement in diverse scenarios.

:::zh

记忆机制存储智能体的画像以及环境信息，以辅助智能体未来的行动。
画像通常包括基本信息（年龄，性别，职业），心理特质（反映性格）和社会关系（Wang et al., 2023c; Park et al., 2023; Qian et al., 2023），这些画像可以人工创建（Caron & Srivastava, 2022; Zhang et al., 2023a; Pan & Zeng, 2023; Huang et al., 2023b; Karra et al., 2022; Safdari et al., 2023），也可以由模型生成（Wang et al., 2023c）。
这一模块使智能体能够积累经验，不断演化，并持续而有效地行动（Park et al., 2023）。
语言智能体借鉴了认知科学中关于人类记忆的研究，人类记忆从感觉记忆发展到短时记忆，再到长时记忆（Atkinson & Shiffrin, 1968; Craik & Jennings, 1992）。
短时记忆被视为 transformer 架构约束窗口内的信息输入（Fischer, 2023; Rana et al., 2023; Wang et al., 2023i; Zhu et al., 2023a）。
相比之下，长时记忆通常保存在外部向量存储（Qian et al., 2023; Zhong et al., 2023; Zhu et al., 2023b; Lin et al., 2023; Xie et al., 2023; Wu et al., 2024b）或自然语言数据库（Shinn et al., 2023; Modarressi et al., 2023）中，智能体可以从中根据需要快速查询和检索信息。
与普通的 LLM 相比，语言智能体需要在不断变化的环境中学习并执行任务。
对于 RPLA 而言，记忆机制通过使这些智能体在长期交互中保持连续性和上下文而发挥着关键作用。
通过存储和检索用户特定数据和环境上下文，智能体能够提供更个性化且更相关的回应，从而在多样场景中提升用户体验和参与度。
:::

:::figure
![Figure 2: Taxonomy of representative recent research on RPLAs.](./images/rpla-survey/fig-02.png)

Figure 2: Taxonomy of representative recent research on RPLAs.

:::zh
图 2：全文的分类树。按人口统计人设（§4），角色人设（§5），个性化人设（§6）三条主干展开，每类再按数据来源，构建，评测，应用分支，旁边标注代表性的论文和系统。读正文时可以随时回来看这张图，定位当前在讲哪一节。
:::
:::

## RPLA 概览（Overview of RPLAs）

:::bi

In this section, we present a concise overview of current research on RPLAs.

:::zh

本节中，我们简要概述当前关于 RPLA 的研究。
:::

### RPLA 定义（RPLA Definition）

:::bi

Our survey distinguishes personas into three categories, progressing from broad groups to individual specificity:
demographic persona,
character persona, and
individualized persona, defined as follows:

:::zh

本综述将人设分为三类，从宽泛的群体逐步过渡到个体特异性：人口统计人设，角色人设和个性化人设，定义如下：
:::

:::bi

- **Demographic Persona** represents the aggregated characteristics and behaviors of distinct demographic segments, including occupations, genders, ethnicity, and personality types. In the context of RPLAs, these personas operate as fictional archetypes, derived from the comprehensive pre-training datasets of LLMs. Employing these archetypes, the development of RPLAs can be efficiently facilitated through simple prompts, such as “You are a mathematician.” Constructed in this way, demographic RPLAs can be effectively employed for simulations specific to demographic groups and for addressing specialized tasks.
- **Character Persona** denotes well-established characters, encompassing both real-world public figures and fictional entities, each characterized by definitive attributes and narratives. The RPLAs for these characters are constructed using data derived from diverse sources such as biographies, novels, and films. Primarily, these RPLAs are designed to fulfill entertainment and emotional engagement needs, functioning as AI-driven chatbots or virtual characters in video games.
- **Individualized Persona** refers to personal profiles constructed from the behavioral and preference data of specific individuals, encompassing personal profiles, dialogues, and a range of actions and behaviors. This data is subject to continuous evolution, necessitating that the corresponding RPLAs adapt dynamically to these changes. Individualized RPLAs provide customized services tailored to the needs of individual users across various AI-based applications, where they commonly function as personalized assistants, companions, or proxies.

:::zh

- **人口统计人设**代表不同人口统计群体的聚合特征与行为，包括职业，性别，族裔和人格类型。在 RPLA 的语境下，这些人设作为虚构原型运作，源自 LLM 全面的预训练数据。借助这些原型，RPLA 的开发可以通过简单的提示词高效推进，例如“You are a mathematician.”以这种方式构建的人口统计 RPLA 可以有效地用于特定人口统计群体的模拟，以及处理专门任务。
- **角色人设**指代广为人知的角色，既包括现实世界中的公众人物，也包括虚构实体，每个角色都有明确的属性与叙事。这些角色的 RPLA 使用来自传记，小说和电影等多种来源的数据构建。这些 RPLA 主要用于满足娱乐和情感互动需求，充当 AI 驱动的聊天机器人或电子游戏中的虚拟角色。
- **个性化人设**指代由特定个体的行为与偏好数据构建的个人画像，涵盖个人画像，对话以及一系列动作和行为。这些数据不断演化，要求相应的 RPLA 动态适应这些变化。个性化 RPLA 在各种基于 AI 的应用中为个体用户提供量身定制的服务，通常充当个性化助理，陪伴或代理。
:::

:::annotation
三个定义里藏着三类数据：人口统计人设吃“预训练语料里的统计规律”，角色人设吃“传记，小说，电影”，个性化人设吃“你的行为和偏好数据”。数据来源不同，决定了它们各自的难点和天花板。
:::

### RPLA 构建（RPLA Construction）

:::figure
![Table 1: An overview of different methods for RPLA construction.](./images/rpla-survey/fig-03.png)

Table 1: An overview of different methods for RPLA construction.

:::zh
表 1：RPLA 构建方法一览。横轴是参数化训练（持续预训练，监督微调，强化学习）和非参数提示（上下文学习）两大族，纵轴是目标，数据，优点，缺点四行。看“缺点”一行能最快比出两类方法的取舍：前者要训练，可能灾难性遗忘，后者省训练但吃上下文长度。
:::
:::

:::bi

Role-Playing Language Agents (RPLAs) are primarily developed to simulate intricate personas based on various individual profiles and narratives.
These profiles are constructed using diverse persona data, including descriptive narratives, dialogues, historical behaviors, and extensive textual materials such as books (Zhang et al., 2018; Dinan et al., 2020; Shanahan et al., 2023; Wang et al., 2024a; Shao et al., 2023; Xu et al., 2023a; Li et al., 2023f).

:::zh

RPLA 主要用于基于各种个体画像和叙事来模拟复杂的人设。这些画像使用多样化的人设数据构建，包括描述性叙事，对话，历史行为，以及书籍等大量文本材料（Zhang et al., 2018; Dinan et al., 2020; Shanahan et al., 2023; Wang et al., 2024a; Shao et al., 2023; Xu et al., 2023a; Li et al., 2023f）。
:::

:::bi

The methodologies for building RPLAs typically involve either parametric training (Shao et al., 2023; Wang et al., 2024a; Qin et al., 2024) or nonparametric prompting (Dalvi Mishra et al., 2022; Li et al., 2023a; Zhou et al., 2023a; Gupta et al., 2023; Ma et al., 2023a; Zhao et al., 2023b), as summarized in Table 1.
These methods may concurrently contribute to the development process.

:::zh

构建 RPLA 的方法通常涉及参数化训练（Shao et al., 2023; Wang et al., 2024a; Qin et al., 2024）或非参数提示（Dalvi Mishra et al., 2022; Li et al., 2023a; Zhou et al., 2023a; Gupta et al., 2023; Ma et al., 2023a; Zhao et al., 2023b），如表 1 所总结。这些方法可能同时参与开发过程。
:::

:::bi

Parametric training for RPLAs primarily includes pre-training, supervised fine-tuning (SFT) and reinforcement learning (RL).
Initially, LLMs for RPLAs are pre-trained on large-scale raw text, including literary works and encyclopedic entries (Xu et al., 2023a; Gupta et al., 2023), equipping them with a broad knowledge of massive demographic and character personas.
Subsequently, these LLMs undergo SFT on role-playing datasets (Wang et al., 2024a; Shao et al., 2023), which enhance both their role-playing capabilities and character-specific knowledge.
Additionally, RL methods could further refine RPLAs in terms of:

:::zh

RPLA 的参数化训练主要包括预训练，监督微调（SFT）和强化学习（RL）。起初，用于 RPLA 的 LLM 在大规模原始文本上进行预训练，包括文学作品和百科条目（Xu et al., 2023a; Gupta et al., 2023），使它们具备海量人口统计人设和角色人设的广博知识。随后，这些 LLM 在角色扮演数据集上进行 SFT（Wang et al., 2024a; Shao et al., 2023），从而同时增强其角色扮演能力和角色专属知识。此外，RL 方法可以进一步在以下方面优化 RPLA：
:::

:::bi

- Alignment with general users, *e.g.*, improving attractiveness or mitigating harmful content, with preference data from online application users and invited human annotators (RLHF) or synthesized by LLM (Bai et al., 2022b; Ouyang et al., 2022).
- Improving social reasoning skills, *e.g.*, in games (Cheng et al., 2024) or goal-driven conversations (Wang et al., 2024b).
- Alignment with individual users (Shaikh et al., 2024a; Jang et al., 2023).

:::zh

- 与普通用户对齐，*例如*提升吸引力或减少有害内容，偏好数据来自在线应用用户和受邀人工标注者（RLHF），或由 LLM 合成（Bai et al., 2022b; Ouyang et al., 2022）。
- 提升社会推理技能，*例如*在游戏中（Cheng et al., 2024）或在目标驱动的对话中（Wang et al., 2024b）。
- 与个体用户对齐（Shaikh et al., 2024a; Jang et al., 2023）。
:::

:::annotation
构建 RPLA 就两条路线：参数化训练（改权重）和非参数提示（不动权重，全塞进上下文）。表 1 把这两条路线的目标，数据，优劣摆在一起，是这篇综述最实用的一张表。
:::

:::bi

Conversely, nonparametric prompting provides RPLAs with **persona data** and **role-playing instructions** within the context.
Prompts for RPLAs primarily consist of persona data that represents the intended personas, including **descriptions** and **demonstrations**.
Descriptions (or profiles) represent their basic information such as names, backgrounds, experiences, personalities, tones, catchphrases and other attributes (Wang et al., 2024a; Yuan et al., 2024b).
Demonstrations illustrate representative behaviors to further align RPLAs with the intended personas, covering dialogues, behaviors, interactions, preferences, stories or other modalities (Li et al., 2023a; Chen et al., 2023c; Dai et al., 2024a).
There are several methods for crafting persona data, including:

:::zh

反之，非参数提示在上下文中为 RPLA 提供**人设数据**和**角色扮演指令**。用于 RPLA 的提示词主要由代表目标人设的人设数据构成，包括**描述**和**示范**。描述（或画像）代表其基本信息，例如姓名，背景，经历，人格，语气，口头禅和其他属性（Wang et al., 2024a; Yuan et al., 2024b）。示范展示具有代表性的行为，以进一步使 RPLA 与目标人设对齐，涵盖对话，行为，互动，偏好，故事或其他模态（Li et al., 2023a; Chen et al., 2023c; Dai et al., 2024a）。有几种制作人设数据的方法，包括：
:::

:::bi

- **Online Resource Collection**, which gathers information from online resources such as Wikipedia, Supersummary and Fandom for widely-known characters (Shao et al., 2023).
- **Automatic Extraction**, where LLMs automatically extract persona data such as dialogues from their origins, *e.g.*, books or scripts (Li et al., 2023a).
- **Dialogue Synthesis**, which employs advanced LLMs to create and expand role-playing conversation datasets via in-context learning (Li et al., 2023a) or role-playing as the personas (Ran et al., 2024). If provided with corresponding literature for reference (for character personas), this is akin to automatic extraction and the synthesized dialogues are more faithful to the origins. Otherwise, the synthesized data is of limited quality and often necessitates filtering.
- **Human Annotation**, which engages human annotators or character fans to summarize persona descriptions or craft high-quality role-playing conversations (Zhou et al., 2023a).

:::zh

- **在线资源收集**，即从 Wikipedia，Supersummary 和 Fandom 等在线资源中为广为人知的角色收集信息（Shao et al., 2023）。
- **自动抽取**，即 LLM 自动从其来源（*例如*书籍或剧本）中抽取对话等人设数据（Li et al., 2023a）。
- **对话合成**，即利用先进的 LLM 通过上下文学习（Li et al., 2023a）或扮演该人设（Ran et al., 2024）来创建和扩展角色扮演对话数据集。如果提供相应的文献作为参考（针对角色人设），这类似于自动抽取，并且合成对话更忠实于原始来源。否则，合成数据的质量有限，通常需要过滤。
- **人工标注**，即让人类标注者或角色粉丝来总结人设描述，或制作高质量的角色扮演对话（Zhou et al., 2023a）。
:::

:::bi

Besides, **role-playing instructions** or requirements could be incorporated to encourage or restrict specific behaviors of RPLAs.

Furthermore, modern RPLAs increasingly integrate memory modules to retrieve information from extensive datasets on character traits or past interactions. This development addresses the restricted context capacity of current LLMs (Shao et al., 2023; Mysore et al., 2023; Sun et al., 2024).

:::zh

除此之外，可以引入**角色扮演指令**或要求，以鼓励或约束 RPLA 的特定行为。

此外，现代 RPLA 越来越多地集成记忆模块，以从关于角色特质或过往互动的大量数据集中检索信息。这一发展解决了当前 LLM 上下文容量受限的问题（Shao et al., 2023; Mysore et al., 2023; Sun et al., 2024）。
:::

:::bi

In terms of alignment with persona types, parametric learning tends to focus on demographic information and well-known characters, whereas prompting techniques are generally employed for generating fictional personas and highly personalized characters.
Current research in RPLA development generally focuses on steering LLMs with demographics (Zhang et al., 2023b; Hong et al., 2023), developing foundation models (Lu et al., 2024; Zhou et al., 2023a), designing agent frameworks (Li et al., 2023a; Wang et al., 2024a) for RPLAs, and crafting persona profiles for specified individuals (Li et al., 2023a; Wang et al., 2024a; Ahn et al., 2023).

:::zh

就与人设类型的对齐而言，参数化学习往往侧重于人口统计信息和广为人知的角色，而提示技术通常用于生成虚构人设和高度个性化的角色。当前 RPLA 开发的研究一般聚焦于用人口统计特征引导 LLM（Zhang et al., 2023b; Hong et al., 2023），开发基础模型（Lu et al., 2024; Zhou et al., 2023a），为 RPLA 设计智能体框架（Li et al., 2023a; Wang et al., 2024a），以及为特定个体打造人设画像（Li et al., 2023a; Wang et al., 2024a; Ahn et al., 2023）。
:::

### RPLA 评测（RPLA Evaluation）

:::bi

For RPLA evaluation, we distinguish the **criteria** into two primary categories:
**role-playing capability evaluation** for RPLA methodologies, and **persona fidelity evaluation** for specific personas (Wang et al., 2024d).
The role-playing capabilities of RPLAs are evaluated on their foundation models and construction frameworks, regardless of specific personas.
These evaluations concern aspects such as anthropomorphic abilities, attractiveness, and usefulness, which encompass more granular dimensions including conversation ability (Shao et al., 2023), engagement (Zhou et al., 2023a) (Footnote: By “engagement”, we mean the state of whether the LLMs are successfully engaged in role-playing activities.), persona consistency (Wang et al., 2024d), emotion understanding (Huang et al., 2023a), theory of mind (Kosinski, 2023), and problem-solving ability (Xu et al., 2023a).
Persona fidelity, by contrast, concentrates on whether individual RPLAs well replicate the intended personas, including their knowledge (Shao et al., 2023; Li et al., 2023a), linguistic habits (Wang et al., 2024a; Deshpande et al., 2023), personality (Wang et al., 2024d; Huang et al., 2023c), beliefs (Li et al., 2024a; Wang et al., 2023e), and decision-making (Xu et al., 2024c; Chen et al., 2023a).
Current **methods** for evaluation are mainly three-fold:

:::zh

对于 RPLA 评测，我们将**准则**分为两大类：针对 RPLA 方法论的**角色扮演能力评测**，以及针对特定人设的**人设保真度评测**（Wang et al., 2024d）。RPLA 的角色扮演能力在其基础模型和构建框架上进行评测，而不考虑特定人设。这些评测关注拟人能力，吸引力和有用性等方面，涵盖更细粒度的维度，包括对话能力（Shao et al., 2023），参与度（Zhou et al., 2023a）（脚注：这里“参与度”指 LLM 是否成功投入角色扮演活动的状态。），人设一致性（Wang et al., 2024d），情绪理解（Huang et al., 2023a），心智理论（Kosinski, 2023）和问题求解能力（Xu et al., 2023a）。相比之下，人设保真度关注单个 RPLA 是否很好地复现目标人设，包括其知识（Shao et al., 2023; Li et al., 2023a），语言习惯（Wang et al., 2024a; Deshpande et al., 2023），人格（Wang et al., 2024d; Huang et al., 2023c），信念（Li et al., 2024a; Wang et al., 2023e）和决策（Xu et al., 2024c; Chen et al., 2023a）。当前评测的**方法**主要有三类：
:::

:::bi

- automatic evaluation with ground truth,
- automatic evaluation without ground truth,
- multi-choice questions,
- human-based evaluation.

:::zh

- 有标准答案的自动评测，
- 无标准答案的自动评测，
- 多项选择题，
- 基于人工的评测。
:::

:::annotation
原文这里写“methods are mainly three-fold”，下面却列了四条。这类小错在综述里不罕见，翻译时原样保留，读者自己会心一笑即可。
:::

:::bi

Overall, current RPLAs have demonstrated promising and improving performance in simulating personas.
However, there remain significant gaps between existing RPLAs and fully human-level intelligent agents (Wang et al., 2024a; Chen et al., 2023a) that are faithful to the personas, as well as corresponding evaluation methods for more nuanced role-playing.

:::zh

总体而言，当前的 RPLA 在模拟人设方面已经展现出有前景且不断提升的性能。然而，现有 RPLA 与完全达到人类水平，且对人设保持忠实的智能体（Wang et al., 2024a; Chen et al., 2023a）之间仍存在显著差距，针对更细腻角色扮演的相应评测方法也是如此。
:::

## 人口统计人设（Demographic Persona）

### 定义（Definition）

:::bi

RPLAs assigned with **demographic personas** are expected to display unique characteristics of specific groups of people.
Within this context, demographics capture typical traits associated with groups possessing common characteristics, such as *occupational roles* (*e.g.*, a mathematician), *hobbies or interests* (*e.g.*, a baseball enthusiast), and *personality types* (*e.g.*, the ENFJ category from the Myers-Briggs Type Indicator), *etc*.
These representations in RPLAs meld the linguistic style, professional knowledge, and behavioral nuances representative of a demographic archetype.

:::zh

被赋予**人口统计人设**的 RPLA 应展现出特定人群的独特特征。在这一语境下，人口统计特征捕捉与具有共同特征的群体相关的典型特质，例如*职业角色*（*例如*数学家），*爱好或兴趣*（*例如*棒球迷）和*人格类型*（*例如*迈尔斯-布里格斯类型指标中的 ENFJ 类别），*等等*。RPLA 中的这些表征融合了代表某个人口统计原型的语言风格，专业知识和行为细节。
:::

:::bi

These RPLAs are designed to mimic how a specific demographic processes and engages with information and communication channels, reflecting its unique language preferences, domain-specific vocabulary, and distinctive viewpoints.
This transformation aims to translate the broad and flexible capabilities of RPLAs into complex virtual representations that reflect the intellectual subtleties, personal inclinations, and social complexities of the demographic.
By embodying specific groups, demographic RPLAs can enhance their abilities in certain areas, and also utilize a variety of RPLAs representing different demographics for social experiments, the completion of more complex tasks, *etc*.

:::zh

这些 RPLA 旨在模仿特定人口统计群体如何处理和参与信息与沟通渠道，反映其独特的语言偏好，领域专属词汇和鲜明观点。这种转变旨在把 RPLA 宽泛而灵活的能力转化为复杂的虚拟表征，反映该人口统计群体的智识细微之处，个人倾向和社会复杂性。通过扮演特定群体，人口统计 RPLA 可以增强其在某些领域的能力，还可以利用代表不同人口统计群体的多种 RPLA 进行社会实验，完成更复杂的任务，*等等*。
:::

### 人口统计分析（Analysis of Demographics）

:::bi

RPLAs possess inherent demographics that reflect nuanced human-like characteristics, including personality traits, political beliefs, and ethical considerations, which vary in different LLMs.
Furthermore, RPLAs have the ability to role-play specified demographics, altering their behavior and potentially enhancing their performance on specific tasks, but this may also lead to toxic outputs and biases, depending on the persona assigned.

:::zh

RPLA 具有固有的人口统计特征，反映细腻的类人特征，包括人格特质，政治信念和伦理考量，这些特征在不同 LLM 中各不相同。此外，RPLA 有能力扮演指定的人口统计特征，改变其行为并可能提升其在特定任务上的表现，但这可能也会导致毒性输出和偏见，具体取决于被赋予的人设。
:::

#### 固有人口统计特征（Inherent Demographics）

:::bi

RPLAs may inherently reflect specific demographic characteristics due to patterns present in the data used during pretraining.
These patterns encapsulate human tendencies and biases originating from diverse sources (Karra et al., 2022; Serapio-García et al., 2023; Gupta et al., 2024).
Subsequently, RPLAs could encode individual behavioral traits in textual outputs, inadvertently resulting in a disproportionate emphasis on certain demographics over others (Jiang et al., 2023a).

:::zh

由于预训练所用数据中存在的模式，RPLA 可能会固有地反映特定的人口统计特征。这些模式囊括了源自多种来源的人类倾向和偏见（Karra et al., 2022; Serapio-García et al., 2023; Gupta et al., 2024）。随后，RPLA 可能会在文本输出中编码个体行为特质，无意中导致对某些人口统计群体的强调不成比例地超过其他群体（Jiang et al., 2023a）。
:::

:::bi

To harness RPLAs for specific applications effectively, it is essential to understand their inherent demographics.
The demographic characteristics of RPLAs can be explored through established human psychological assessments such as the Big Five Personality Test (Barrick & Mount, 1991).
By subjecting RPLAs to text-based questionnaires designed for humans, researchers could leverage their textual response capabilities to evaluate behavioral responses similar to human subjects (Huang et al., 2024a).
Such evaluations have revealed that RPLAs exhibit consistent inherent demographics, which have been statistically confirmed in recent studies (Jiang et al., 2023a; Serapio-García et al., 2023; Santurkar et al., 2023).
However, it is important to recognize that these demographics may differ in different LLMs (Huang et al., 2023b).

:::zh

为了有效地将 RPLA 用于特定应用，理解其固有的人口统计特征至关重要。RPLA 的人口统计特征可以通过成熟的人类心理测评来探索，例如大五人格测试（Barrick & Mount, 1991）。通过让 RPLA 填写为人类设计的文本问卷，研究者可以利用其文本回应能力来评估与人类受试者相似的行为反应（Huang et al., 2024a）。此类评测已经揭示 RPLA 表现出一致的固有人口统计特征，这一点在近期研究中得到了统计确认（Jiang et al., 2023a; Serapio-García et al., 2023; Santurkar et al., 2023）。然而，需要认识到这些人口统计特征在不同的 LLM 中可能有所不同（Huang et al., 2023b）。
:::

:::bi

Beyond personality characteristics, RPLAs often display complex demographics reflecting nuanced social, economic, and ethical understanding.
For instance, RPLAs may exhibit a preference for certain political beliefs (Hartmann et al., 2023), show decision-making patterns indicative of rational economic considerations (Guo et al., 2023), and act either selfishly or helpfully in multi-agent simulations (Chawla et al., 2023).

:::zh

除人格特征之外，RPLA 往往还展现出反映细腻的社会，经济和伦理理解的复杂人口统计特征。例如，RPLA 可能表现出对某些政治信念的偏好（Hartmann et al., 2023），展现出表明理性经济考量的决策模式（Guo et al., 2023），并在多智能体模拟中表现得自私或乐于助人（Chawla et al., 2023）。
:::

#### 人口统计角色扮演（Demographic Role-Playing）

:::bi

RPLAs are embedded with intrinsic demographic characteristics, which raises pivotal questions about their ability to role-play specified demographics and the subsequent effects on their behavior.
A prevalent approach in demographic role-play involves directly prompting the language agent.
For example, if an LLM is prompted with, “You’re a friendly and outgoing individual who thrives on social interactions. Always ready for a good time, you enjoy being the center of attention at parties…” (Jiang et al., 2023a; Xie et al., 2024a), it adopts the persona of an extroverted character.
When tasked with representing distinct demographics, RPLAs demonstrate the capacity to diverge from their inherent traits, manifesting changes in their responses on psychological assessment scales (Jiang et al., 2023a; Serapio-García et al., 2023).
This behavioral adaptability highlights the potential of RPLAs in simulating diverse human-like roles and personalities.

:::zh

RPLA 内嵌了固有的人口统计特征，这引发了关于它们扮演指定人口统计特征的能力，及其对行为后续影响的关键问题。人口统计角色扮演中一种常见的方法是直接提示语言智能体。例如，如果给 LLM 输入提示词“You’re a friendly and outgoing individual who thrives on social interactions. Always ready for a good time, you enjoy being the center of attention at parties…”（Jiang et al., 2023a; Xie et al., 2024a），它就会采用外向角色的人设。当被要求代表不同的人口统计群体时，RPLA 展现出偏离其固有特质的能力，在心理测评量表上的回应表现出变化（Jiang et al., 2023a; Serapio-García et al., 2023）。这种行为适应性凸显了 RPLA 在模拟多样化类人角色和人格方面的潜力。
:::

:::bi

However, not all assigned personas lead to superior performance of RPLAs.
Assigning a persona to LLMs may also result in toxic or biased outputs compared to the default setting, because the persona may amplify existing stereotypes and biases present in the training data.
For example, the assignment of some personas to language agents, including baseline personas such as “a bad person”, has been demonstrated to significantly increase the likelihood of RPLAs generating toxic outputs (Deshpande et al., 2023).
Similarly, diverse demographic roles have been assigned to reveal the biased presumptions present in LLMs (Gupta et al., 2023).
Although some developers have made attempts to prevent RPLAs from malicious usage, attacking the prompts via “jailbreaking” (Chao et al., 2023; Anil et al.,) might bypass these safety mechanisms and elicit offensive, toxic, misleading contents.

:::zh

然而，并非所有被赋予的人设都能让 RPLA 表现更优。与默认设置相比，给 LLM 赋予人设也可能导致毒性或有偏见的输出，因为该人设可能会放大训练数据中已有的刻板印象和偏见。例如，已经证明给语言智能体赋予某些人设，包括“a bad person”这样的基线人设，会显著提高 RPLA 生成毒性输出的可能性（Deshpande et al., 2023）。类似地，人们也通过赋予多样化的人口统计角色来揭示 LLM 中存在的偏见预设（Gupta et al., 2023）。尽管一些开发者已经尝试防止 RPLA 被恶意使用，但通过“越狱”攻击提示词（Chao et al., 2023; Anil et al.,）可能会绕过这些安全机制，引出冒犯性，有毒，误导性的内容。
:::

:::annotation
这一节的关键结论：给人设不一定变好。给模型安上“坏人”这类人设，毒性和偏见输出会显著上升，因为人设会把训练数据里的刻板印象放大。这正是 §7 风险的伏笔。
:::

### 人口统计的应用（Application of Demographics）

:::bi

By assigning specific demographics, LLMs often have better performance in various types of downstream tasks, whether agents are used in a standalone fashion (single-agent systems) or joint with other agents (multi-agent systems) for competition or collaboration.

:::zh

通过赋予特定的人口统计特征，LLM 在各种类型的下游任务中往往表现更好，无论智能体是单独使用（单智能体系统），还是与其他智能体联合（多智能体系统）进行竞争或协作。
:::

#### 提升单智能体系统中的任务求解（Improving Task Solving in Single-Agent Systems）

:::bi

Assigning specific demographics enables LLMs to enhance their performance in tasks that require specialized knowledge tied to those personas.
For instance, when an LLM is configured to represent an expert LLM within a specific field, it might significantly augment the length, depth, and quality of its responses, which is also showcased in complex zero-shot reasoning tasks, where the model must generate insightful answers without prior direct training on similar problems (Xu et al., 2023a; Kong et al., 2023).
Furthermore, integrating diverse social roles into LLMs’ frameworks has been shown to positively influence their performance across a wide array of tasks, suggesting a versatile adaptability to different contextual demands (Zheng et al., 2023a).
The application of these roles enables LLMs not only to generate more contextually appropriate responses but also to exhibit increased understanding and engagement in interactions that reflect varied human experiences and societal norms.

:::zh

赋予特定的人口统计特征，使 LLM 能够在需要与这些人设相关的专业知识的任务中提升表现。例如，当把 LLM 配置为代表某个特定领域内的专家 LLM 时，它可能会显著提升其回应的长度，深度和质量，这一点也体现在复杂的零样本推理任务中，即模型必须在没有针对类似问题事先直接训练的情况下给出有见地的答案（Xu et al., 2023a; Kong et al., 2023）。此外，研究表明将多样化的社会角色融入 LLM 的框架中，对其在广泛任务上的表现有积极影响，表明其对不同情境需求具有多方面的适应性（Zheng et al., 2023a）。这些角色的应用不仅使 LLM 能够生成更贴合语境的回应，还能在反映多样化人类经历和社会规范的互动中展现出更强的理解力和参与度。
:::

#### 提升多智能体系统中的任务求解（Improving Task Solving in Multi-Agent Systems）

:::bi

Building upon the capability of single-agent models, which utilize demographic personas to bolster their specialized abilities, assigning demographic personas in multi-agent systems has also emerged as a crucial strategy for enhancing the performance of single-agent systems, *i.e.*, standalone LLMs.
By embedding various personas within agents, distinct societal dynamics could be cultivated, leading to improved strategies for cooperative problem-solving and breakthroughs in complex domains such as mathematical modeling (Zhang et al., 2023b; Wang et al., 2023g).
A notable implementation of this approach is ChatDev (Qian et al., 2023) and MetaGPT (Hong et al., 2023), frameworks designed specifically for automating software development within a multi-agent conversational platform.
In this setup, different agents are assigned specialized roles that collectively contribute to the agile development of software applications.
This collaborative model echoes the strategies applied in projects such as OKR-AGENT (Zheng et al., 2023b), where role-specific enhancements within multi-agent architectures have shown to significantly streamline and optimize task execution.

:::zh

在单智能体模型利用人口统计人设增强其专业能力的基础上，在多智能体系统中赋予人口统计人设也已成为一种提升单智能体系统（*即*独立的 LLM）表现的关键策略。通过在智能体内嵌入各种人设，可以培育出独特的社会动态，从而改进协作式问题求解的策略，并在数学建模等复杂领域取得突破（Zhang et al., 2023b; Wang et al., 2023g）。这一方法的一个著名实现是 ChatDev（Qian et al., 2023）和 MetaGPT（Hong et al., 2023），它们是专门为在多智能体对话平台内自动化软件开发而设计的框架。在这一设置中，不同的智能体被赋予专门的角色，共同促成软件应用的敏捷开发。这种协作模式呼应了 OKR-AGENT（Zheng et al., 2023b）等项目所采用的策略，在这些项目中，多智能体架构内针对角色的增强已被证明能够显著简化和优化任务执行。
:::

#### 模拟多智能体系统中的集体社会行为（Simulating Collective Social Behaviors in Multi-Agent Systems）

:::bi

RPLAs have demonstrated remarkable capabilities in simulating nuanced, human-like interactions across various environments.
In the realm of gaming, particularly in strategy and role-playing scenarios, RPLAs have shown impressive performance.
For example, Chawla et al. (2023) set the agents to be fair or selfish, and shows that selfish agents could contribute not only to their own interests but also to the collective good.
Additionally, more elaborate games like Social Deduction Games are particularly illustrative of RPLAs’ capacity to effectively adopt varied roles, as observed in scenarios such as “The Werewolf” (Xu et al., 2023c) and “The Avalon” (Wang et al., 2023d).
In diplomacy-focused games such as Cicero, RPLAs have matched or even surpassed human levels of performance (FAIR et al., 2022).
Similarly, in war simulation games, RPLAs provide valuable insights into the origins of conflicts, enhancing our understanding of complex geopolitical dynamics (Hua et al., 2023).
Extending the application of RPLAs beyond gaming environments, these models are also utilized to mimic daily social interactions, thereby narrowing the behavioral gap between artificial agents and humans.
This is exemplified in the development of Humanoid Agent frameworks (Wang et al., 2023h), which embody System 1 functionalities—such as basic needs and emotions—to enhance realism and effectiveness in replicating human responses and behaviors.
Furthermore, recent findings in multi-agent interaction environments have revealed that diversifying the types of agents, scaling up their number, and increasing interactions, lead to the emergence of unplanned social behaviors.
Such behaviors arise spontaneously from discussions among multiple agents, highlighting the potential for complex, dynamic systems within LLM architectures (Gu et al., 2024).
This progression from specific gaming applications to broader social simulations illustrates the expanding versatility and depth of RPLAs in understanding and replicating human-like behavior.

:::zh

RPLA 已在各种环境中展现出模拟细腻的类人互动的卓越能力。在游戏领域，尤其是在策略和角色扮演场景中，RPLA 表现出色。例如，Chawla et al. (2023) 将智能体设定为公平或自私，结果表明自私的智能体不仅能为自己谋利，也能为集体利益作出贡献。此外，更复杂的游戏如社交推理游戏特别能说明 RPLA 有效扮演各种角色的能力，例如在“The Werewolf”（Xu et al., 2023c）和“The Avalon”（Wang et al., 2023d）等场景中所观察到的。在 Cicero 等以外交为重点的游戏中，RPLA 已达到甚至超越人类水平的表现（FAIR et al., 2022）。类似地，在战争模拟游戏中，RPLA 为冲突的起源提供了宝贵的洞见，增进了我们对复杂地缘政治动态的理解（Hua et al., 2023）。把 RPLA 的应用扩展到游戏环境之外，这些模型也被用来模仿日常社交互动，从而缩小人工智能体与人类之间的行为差距。这在 Humanoid Agent 框架（Wang et al., 2023h）的开发中得到体现，该框架体现了 System 1 功能，例如基本需求和情绪，以增强复现人类反应和行为的真实感与有效性。此外，多智能体互动环境中的近期发现表明，使智能体类型多样化，扩大其数量并增加互动，会导致计划之外的社会行为涌现。这类行为从多个智能体之间的讨论中自发产生，凸显了 LLM 架构中复杂动态系统的潜力（Gu et al., 2024）。从特定的游戏应用到更广泛的社会模拟的这一进展，展示了 RPLA 在理解和复现类人行为方面不断扩展的多面性和深度。
:::

:::annotation
从狼人杀，阿瓦隆到外交游戏 Cicero，再到通用的人类仿真，这是“角色扮演”和“社会模拟”重叠的地带。Cicero 能达到或超过人类水平，是这个方向最有名的里程碑之一。
:::

## 角色人设（Character Persona）

### 定义（Definition）

:::bi

**Characters** are primarily **established characters** with their stories widely recognized by the public, including celebrities, historical figures and fictional characters (*e.g.*, *Monkey D. Luffy* and *Hermione Granger*).
Occasionally, they also include **original characters** created by individuals (Zhou et al., 2023a).
Character RPLAs have recently emerged as a flourishing field of LLM application (*e.g.*, Character.ai), and hence attracted wide research interest as well (Shao et al., 2023; Wang et al., 2024a; Wang et al., 2024d).

:::zh

**角色**主要是**既有角色**，其故事被公众广泛熟知，包括名人，历史人物和虚构角色（例如 *Monkey D. Luffy* 和 *Hermione Granger*）。偶尔也包括个人创作的**原创角色**（Zhou et al., 2023a）。角色 RPLA 近来成为 LLM 应用的一个蓬勃发展的领域（例如 Character.ai），因此也吸引了广泛的研究兴趣（Shao et al., 2023; Wang et al., 2024a; Wang et al., 2024d）。
:::

:::bi

For character RPLAs, the essential requirement for effective role-playing is the ability of LLMs to understand characters.
Early research has studied character understanding of language models, involving linking descriptions that outline characters’ traits to their roles (*i.e.*, **Character Prediction**) and personalities (*i.e.*, **Personality Understanding**):

:::zh

对于角色 RPLA 而言，有效角色扮演的基本要求是 LLM 理解角色的能力。早期研究已经考察了语言模型的角色理解，涉及将勾勒角色特征的描述与其角色身份（即**角色预测**）和性格（即**性格理解**）关联起来：
:::

:::bi

- Character prediction mainly focuses on recognizing characters from a provided text. This includes tasks like co-reference resolution (Li et al., 2023c), relationship understanding (Zhao et al., 2024) and character identification (Brahman et al., 2021; Yu et al., 2022; Li et al., 2023c; Zhao et al., 2024). Additionally, some studies investigate if language models can forecast characters’ future actions based on;
- Personality understanding aims to decode character traits from their dialogues and actions, including predicting the depicted traits (Yu et al., 2023) and generating character descriptions (Brahman et al., 2021).

:::zh

- 角色预测主要关注从给定文本中识别角色。这包括共指消解（Li et al., 2023c），关系理解（Zhao et al., 2024）和角色识别（Brahman et al., 2021; Yu et al., 2022; Li et al., 2023c; Zhao et al., 2024）等任务。此外，一些研究考察语言模型能否基于已有信息预测角色的未来行动。
- 性格理解旨在从角色的对话和行动中解码角色特质，包括预测所描绘的特质（Yu et al., 2023）和生成角色描述（Brahman et al., 2021）。
:::

:::bi

In recent years, LLMs have demonstrated strong capabilities in language understanding and generation, which significantly advanced the development of RPLAs.
The research focus in this direction has hence shifted towards applying and promoting LLMs to faithfully reproduce the characters, including their linguistic style (Wang et al., 2024a; Zhou et al., 2023a; Li et al., 2023a; Wang et al., 2024a), knowledge (Li et al., 2023a; Shao et al., 2023; Zhou et al., 2023a; Chen et al., 2023c; Zhao et al., 2023a; Wang et al., 2024a), personality (Shao et al., 2023; Wang et al., 2024d), and even decision-making (Zhao et al., 2023a; Xu et al., 2024c).

:::zh

近年来，LLM 在语言理解和生成方面展现出强大的能力，显著推动了 RPLA 的发展。因此，该方向的研究重点已转向应用并促进 LLM 忠实地再现角色，包括其语言风格（Wang et al., 2024a; Zhou et al., 2023a; Li et al., 2023a; Wang et al., 2024a），知识（Li et al., 2023a; Shao et al., 2023; Zhou et al., 2023a; Chen et al., 2023c; Zhao et al., 2023a; Wang et al., 2024a），性格（Shao et al., 2023; Wang et al., 2024d），甚至决策制定（Zhao et al., 2023a; Xu et al., 2024c）。
:::

:::figure
![Table 2: Datasets for depicting characters. #Char. represents the number of ](./images/rpla-survey/fig-04.png)

Table 2: Datasets for depicting characters. **#Char.** represents the number of characters, with each character having a specific description. **#Samples** indicates the number of samples. A sample refers to a dialogue or question, and * denotes the number of multi-turn dialogues. **Method** describes how samples in the datasets are constructed. **Experience Extraction** extracts characters’ dialogues or scenes from corresponding origins, while **Dialogue Synthesis** generates role-playing conversations with advanced LLMs.

:::zh
表 2：角色人设数据集汇总。每行一个数据集，列出角色数，样本数，语言，来源和构建方法。看“Method”列能发现主流做法集中在经验抽取和对话合成两种。
:::
:::

### 角色 RPLA 的数据（Data for Character RPLAs）

:::bi

Character data is indispensable for the construction of character RPLAs.
The data that represents knowledge of these well-established characters can be roughly categorized into two types:

:::zh

角色数据对于构建角色 RPLA 不可或缺。表示这些既有角色知识的数据大致可分为两类：
:::

:::bi

- **Descriptions**directly describe the character personas that guide the behaviors of RPLAs. These include various character attributes, such as identity, relationships, and other predetermined attributes. The attributes serve as the knowledge background and are expected to be accurately recalled upon request, such as names and affiliations (Li et al., 2023a; Zhou et al., 2023a; Shao et al., 2023; Wang et al., 2024a; Chen et al., 2023c; Zhao et al., 2023a; Tu et al., 2024; Lu et al., 2024). Additionally, some descriptions further shape the behaviors of RPLAs, such as personality traits (Li et al., 2023a; Wang et al., 2024d).
- **Demonstrations**, on the other hand, are representative behaviors of the characters, which reflect their linguistic, cognitive and behavioral patterns (Li et al., 2023a; Zhou et al., 2023a; Shao et al., 2023; Wang et al., 2024a; Zhao et al., 2023a; Chen et al., 2023c; Tu et al., 2024; Tang et al., 2024; Lu et al., 2024; Xu et al., 2024b).

:::zh

- **描述**直接刻画引导 RPLA 行为的角色人设。它们包括各种角色属性，例如身份，关系和其他预定属性。这些属性充当知识背景，期望在被请求时被准确回忆，例如姓名和所属关系（Li et al., 2023a; Zhou et al., 2023a; Shao et al., 2023; Wang et al., 2024a; Chen et al., 2023c; Zhao et al., 2023a; Tu et al., 2024; Lu et al., 2024）。此外，一些描述还会进一步塑造 RPLA 的行为，例如性格特质（Li et al., 2023a; Wang et al., 2024d）。
- 另一方面，**示例**是角色的代表性行为，反映了他们的语言，认知和行为模式（Li et al., 2023a; Zhou et al., 2023a; Shao et al., 2023; Wang et al., 2024a; Zhao et al., 2023a; Chen et al., 2023c; Tu et al., 2024; Tang et al., 2024; Lu et al., 2024; Xu et al., 2024b）。
:::

:::annotation
角色人设的两类输入：描述（它是什么样的人）和演示（它怎么说话做事）。描述靠记忆，演示靠模仿，两者配合才出得了“像”。
:::

:::bi

While RPLAs are not expected to replicate the exact outputs from the demonstration data, they should portray these patterns and generalize to new situations, *i.e.*, producing responses consistent with the demonstrations.
Overall, descriptions provide the core and foundational information for RPLAs, while demonstrations, though not mandatory, are also crucial for achieving vividness and fidelity of RPLAs (Wang et al., 2024d).

:::zh

虽然并不期望 RPLA 复制示例数据的精确输出，但它们应当呈现这些模式并泛化到新情境，即产生与示例一致的回答。总体而言，描述为 RPLA 提供了核心和基础信息，而示例虽然并非必需，但对实现 RPLA 的生动性和保真度也至关重要（Wang et al., 2024d）。
:::

:::bi

The available data for character RPLAs is currently quite limited, covering only a small selection of characters.
The description data are typically sourced from well-curated encyclopedias or the original works, and processed manually or with advanced LLMs (Shao et al., 2023; Li et al., 2023a).
The demonstration data are crafted in various ways, where the common methodologies include:

:::zh

目前可用于角色 RPLA 的数据相当有限，只覆盖了少数角色。描述数据通常来源于精心整理的百科全书或原著，并通过人工或先进的 LLM 进行处理（Shao et al., 2023; Li et al., 2023a）。示例数据通过多种方式构建，常见的方法包括：
:::

:::bi

- **Experience Extraction** extracts characters’ dialogues or other scenes from original scripts (Li et al., 2023a; Wang et al., 2024a). The extracted scenes faithfully depict the characters. However, understanding and reproducing these scenes for RPLAs may be impractical without more complete background knowledge, making it less suitable to train LLMs with this data.
- **Dialogue Synthesis** synthesizes character conversations using state-of-the-art LLMs to build and augment datasets for character RPLAs. The topics for these conversations could be sourced from corresponding literature (Shao et al., 2023), general task instructions (Wang et al., 2024a), special scenarios such as personality tests (Wang et al., 2024d), and real use cases (Gosling et al., 2023). LLMs could be leveraged to augment the datasets with more role-playing responses by either generating dialogues similar to given ones via in-context learning (Li et al., 2023a), or by role-playing as RPLAs themselves with existing character data to respond to specified topics (Ran et al., 2024). When referring corresponding literature, this method is close to experience extraction and yields dialogues that are more faithful to the origins. Otherwise, this process essentially serves as a knowledge distillation of role-playing capabilities from advanced LLMs. However, the quality of synthesized dialogu es is limited by teacher LLMs, which often require further filtering (Tu et al., 2024).
- **Human Annotation** invites humans to role-play the characters and engage in conversations to collect role-playing dialogues. This method ensures relatively high data quality, at the cost of expensive human labor. Additionally, this method collects data for not only established characters from fictional stories, but also original characters created from scratch (Zhou et al., 2023a).

:::zh

- **经验抽取**从原始剧本中抽取角色的对话或其他场景（Li et al., 2023a; Wang et al., 2024a）。抽取的场景忠实地刻画了角色。然而，在没有更完整背景知识的情况下，让 RPLA 理解并再现这些场景可能不切实际，因此用这些数据训练 LLM 不太合适。
- **对话合成**使用最先进的 LLM 合成角色对话，以构建和扩充角色 RPLA 的数据集。这些对话的主题可以来源于相应文献（Shao et al., 2023），一般任务指令（Wang et al., 2024a），人格测试等特殊场景（Wang et al., 2024d）以及真实用例（Gosling et al., 2023）。可以利用 LLM 扩充数据集中的角色扮演回答，方式有两种：通过上下文学习生成与给定对话相似的对话（Li et al., 2023a），或者让 LLM 自身以现有角色数据扮演 RPLA 来回应指定主题（Ran et al., 2024）。当参考相应文献时，该方法接近于经验抽取，并产生更忠于原著的对话。否则，这一过程本质上是对先进 LLM 角色扮演能力的知识蒸馏。然而，合成对话的质量受限于教师 LLM，通常需要进一步过滤（Tu et al., 2024）。
- **人工标注**邀请人类扮演角色并进行对话，以收集角色扮演对话。该方法确保了相对较高的数据质量，代价是昂贵的人力成本。此外，该方法不仅为虚构故事中的既有角色收集数据，也为从零开始创作的原创角色收集数据（Zhou et al., 2023a）。
:::

:::bi

In addition, interaction data (mainly conversations) will be continuously produced during the interaction process between RPLAs and individual users, supplementing the original character data.
This data further shapes the persona of RPLAs towards users’ individualized preferences, which forks the standard character RPLAs for individual users.
This phenomenon concerns both character persona and individualized persona for RPLAs, where studies and analysis remain underexplored.
Besides, point-in-time role-playing (Ahn et al., 2024) presents an area for further study. In practical applications, users may expect RPLAs to role-play characters in a specific time point, *e.g.*, *Harry Potter* at the age of 5, challenging LLMs to disregard character knowledge beyond the time-point.

:::zh

此外，交互数据（主要是对话）会在 RPLA 与个体用户交互的过程中持续产生，补充原有的角色数据。这些数据进一步将 RPLA 的人设塑造向用户的个性化偏好靠拢，从而为个体用户分化出标准角色 RPLA 的变体。这一现象同时涉及 RPLA 的角色人设和个性化人设，而相关研究与分析仍缺乏探索。此外，时间点角色扮演（Ahn et al., 2024）是一个有待进一步研究的领域。在实际应用中，用户可能期望 RPLA 在特定时间点扮演角色，例如 5 岁时的 *Harry Potter*，这要求 LLM 忽略该时间点之后的角色知识。
:::

### 角色 RPLA 的构建（Construction of Character RPLAs）

:::bi

By integrating character data into LLMs, character RPLAs are developed (Han et al., 2022; Li et al., 2023a; Park et al., 2023; Chen et al., 2023c; Wang et al., 2024a; Zhao et al., 2023a; Tu et al., 2024).
As discussed in §2, LLMs have demonstrated remarkable capabilities to follow human instructions and generate high-quality text.
Together with their ability of character understanding, LLMs can hence be instructed to role-play specific characters provided with their data, thus forming character RPLAs.
The construction methodologies are distinguished into two categories, *i.e.*, parametric training and nonparametric prompting.

:::zh

通过将角色数据整合进 LLM，可以开发出角色 RPLA（Han et al., 2022; Li et al., 2023a; Park et al., 2023; Chen et al., 2023c; Wang et al., 2024a; Zhao et al., 2023a; Tu et al., 2024）。如第 2 节所述，LLM 已展现出遵循人类指令和生成高质量文本的卓越能力。结合其角色理解能力，LLM 因此可以在给定角色数据的情况下被指示去扮演特定角色，从而形成角色 RPLA。构建方法分为两类，即参数化训练和非参数提示。
:::

#### 参数化训练（Parametric Training）

:::bi

This method includes pre-training and supervised fine-tuning.
In pre-training, LLMs learn from large-scale web corpus which includes vast amounts of literary works and encyclopedia entries.
This provides LLMs with knowledge of a wide range of established characters, such as *Hermione Granger* and *Socrates*, enabling LLMs to readily role-play these characters.
Supervised fine-tuning for RPLAs is be adopted to tailor LLMs to role-play specific characters (Shao et al., 2023; Yu et al., 2024), or to develop foundation models with refined role-playing capabilities utilizing datasets of diversified characters and scenarios (Li et al., 2023a; Wang et al., 2024a).

:::zh

该方法包括预训练和监督微调。在预训练中，LLM 从大规模网络语料中学习，语料包含大量的文学作品和百科词条。这为 LLM 提供了对众多既有角色的知识，例如 *Hermione Granger* 和 *Socrates*，使 LLM 能够轻松扮演这些角色。针对 RPLA 的监督微调被用于让 LLM 定制化为扮演特定角色（Shao et al., 2023; Yu et al., 2024），或者利用多样化角色和场景的数据集开发具有精炼角色扮演能力的基础模型（Li et al., 2023a; Wang et al., 2024a）。
:::

#### 非参数提示（Nonparametric Prompting）

:::bi

This method directly provides LLMs with character data in the context, leveraging the in-context learning capability of advanced LLMs.
This serves as a simple yet effective methodology for RPLA construction, and is hence widely adopted by recent RPLAs (Wang et al., 2024a; Zhou et al., 2023a).
However, character data is often voluminous, and interaction data between RPLAs and users is also continuously produced during the interaction process.
This makes it impractical to include all data for a character RPLA within the context limits of LLMs.
Consequently, long-term memory modules are being increasingly incorporated into RPLA frameworks to manage the vast amount of character RPLA data (Li et al., 2023a; Wang et al., 2024a; Xu et al., 2024c).
These modules store most character knowledge and interaction data in a database, and retrieve necessary information in relevant scenarios.

:::zh

该方法直接在上下文中为 LLM 提供角色数据，利用先进 LLM 的上下文学习能力。这是一种简单而有效的 RPLA 构建方法，因此被近期的 RPLA 广泛采用（Wang et al., 2024a; Zhou et al., 2023a）。然而，角色数据往往体量庞大，且 RPLA 与用户之间的交互数据在交互过程中也在持续产生。这使得在 LLM 的上下文限制内纳入一个角色 RPLA 的全部数据变得不切实际。因此，长期记忆模块越来越多地被纳入 RPLA 框架，以管理海量的角色 RPLA 数据（Li et al., 2023a; Wang et al., 2024a; Xu et al., 2024c）。这些模块将大部分角色知识和交互数据存储在数据库中，并在相关场景中检索必要的信息。
:::

### 角色 RPLA 的评测（Evaluation of Character RPLAs）

:::bi

The evaluation of character RPLAs encompasses various dimensions, considering the complexity and comprehensiveness of character personas.
Basically, these dimensions are distinguished into character-independent capabilities of foundation models, and character fidelity of RPLAs for specific characters.

:::zh

角色 RPLA 的评测涵盖多个维度，考虑到角色人设的复杂性和全面性。基本上，这些维度可分为基础模型与角色无关的能力，以及 RPLA 对特定角色的角色保真度。
:::

#### 与角色无关的能力（Character-independent Capabilities）

:::bi

This line of work assesses how well a foundation model is capable of the role-playing task, regardless of the characters it role-plays.
According to different levels of interaction capabilities, we have considered basic role-playing abilities and conversational skills, progressing to more in-depth anthropomorphic capabilities matched with humans.
These have been categorized into the following three levels:

:::zh

这一研究方向评估基础模型在执行角色扮演任务方面的能力，而不论它扮演的是哪个角色。根据交互能力的不同层级，我们考虑了基本的角色扮演能力和对话技能，并逐步深入到与人类相匹配的更深入的拟人化能力。这些被分为以下三个层级：
:::

:::bi

- **Role-playing Engagement**: Basically, the LLMs should actively participate in the role-playing scenario. They should produce responses in dialogue format and exhibit deep immersion, avoiding out-of-character utterance such as “As an AI model”). Additionally, the RPLAs are expected to exhibit stable and consistent personalities across different turns (Shao et al., 2023), sessions (Wang et al., 2024d) and even language (Huang et al., 2023b).
- **High-quality Conversations**: RPLAs built on the LLMs should talk in a fluent natural way. Research in this area focuses on evaluating the completeness (Zhou et al., 2023a), informativeness (Zhou et al., 2023a), and fluency (Tu et al., 2024) of conversations. Besides, RPLAs are expected to meet the ethical standards (Zhou et al., 2023a) and avoid harmful content when role-playing vicious characters (Deshpande et al., 2023).
- **Anthropomorphic Capabilities**: RPLAs are expected to acquire cognitive, emotional and social intelligence towards human levels. Relevant dimensions include conversation attractiveness (Zhou et al., 2023a; Tu et al., 2024), theory of mind (Kosinski, 2023; Mao et al., 2023), empathy (Sorin et al., 2023), emotional intelligence (Huang et al., 2023a), and goal-driven social skills (Zhou et al., 2024b; Wang et al., 2024b). These capabilities are practically important for RPLAs to effectively serve as emotional companions for humans.

:::zh

- **角色扮演投入度**：基本上，LLM 应当积极参与角色扮演场景。它们应当以对话形式给出回答并表现出深度沉浸，避免说出“作为一个 AI 模型”这类出戏的发言。此外，期望 RPLA 在不同轮次（Shao et al., 2023）和会话（Wang et al., 2024d）乃至语言（Huang et al., 2023b）中展现出稳定且一致的性格。
- **高质量对话**：基于 LLM 构建的 RPLA 应当以流畅自然的方式交谈。该领域的研究侧重于评估对话的完整性（Zhou et al., 2023a），信息量（Zhou et al., 2023a）和流畅度（Tu et al., 2024）。此外，期望 RPLA 满足伦理标准（Zhou et al., 2023a），并在扮演邪恶角色时避免有害内容（Deshpande et al., 2023）。
- **拟人化能力**：期望 RPLA 获得接近人类水平的认知，情绪和社会智能。相关维度包括对话吸引力（Zhou et al., 2023a; Tu et al., 2024），心智理论（Kosinski, 2023; Mao et al., 2023），共情（Sorin et al., 2023），情绪智能（Huang et al., 2023a）以及目标驱动的社交技能（Zhou et al., 2024b; Wang et al., 2024b）。这些能力对于 RPLA 有效充当人类的情感陪伴者具有实际重要意义。
:::

#### 角色保真度（Character Fidelity）

:::bi

This line of work evaluates how a specific RPLA reproduces the intended character, which depends on both the foundation model, the agent framework, and the character data.
Relevant dimensions are categorized into four categories:
linguistic style and
knowledge, which are considered superficial, as well as
personality and thought, which represent deeper, underlying aspects:

:::zh

这一研究方向评估特定 RPLA 再现目标角色的程度，这既取决于基础模型和智能体框架，也取决于角色数据。相关维度分为四类：语言风格和知识，它们被视为表层特征，以及性格和思维，它们代表更深层的底层方面：
:::

:::bi

- **Linguistic Style**: Basically, RPLAs should speak in a tone that emulates the linguistic style of the intended characters (Wang et al., 2024a; Li et al., 2023a; Zhou et al., 2023a; Yu et al., 2024). For this purpose, RPLAs are typically provided with demonstrative character dialogues (Wang et al., 2024a; Li et al., 2023a), and they could mimic the tone leveraging the in-context learning ability of LLMs.
- **Knowledge**: RPLAs are essentially required to simulate the character’s breadth of knowledge. On one hand, they should accurately recall knowledge of the character, including their identity (Zhou et al., 2023a; Wang et al., 2024a; Tang et al., 2024; Lu et al., 2024), social relationships (Chen et al., 2023c; Shen et al., 2023a; Zhao et al., 2023a), and experiences (Shao et al., 2023; Wang et al., 2024a; Chen et al., 2023c; Yu et al., 2024). On the other hand, they may be required to refrain from demonstrating knowledge or ability beyond the character’s scope (*e.g.*, an LLM could write code even if it is role-playing *Socrates*, which is unnecessarily expected) (Shao et al., 2023; Lu et al., 2024; Yu et al., 2024). This phenomenon is referred to as “character hallucination” (Shao et al., 2023), which originates from the extensive knowledge possessed by LLMs and could be reduced via SFT (Shao et al., 2023).
- **Personality and Thinking Process**: RPLAs are expected to capture the inner world of the characters, which can be measured upon their thoughts in concrete scenarios (Xu et al., 2024c; Chen et al., 2024) and their underlying personalities (Wang et al., 2024d; Shao et al., 2023). Advanced RPLAs should be able to understand and replicate how characters would think in specific scenarios, *e.g.*, understanding their motivations for decisions (Yuan et al., 2024b), or predicting decisions and behaviors that align closely with the characters (Xu et al., 2024c; Chen et al., 2024). Personality is behind the concrete thoughts. It is the interrelated behavioral, cognitive and emotional patterns of individuals (Barrick & Mount, 1991; Bem, 1981), which applies to both characters and RPLAs. Hence, RPLAs should exhibit personality traits that match those of the characters (Wang et al., 2024d), which could be measured via psychological scales such as the Big Five Inventory.

:::zh

- **语言风格**：基本上，RPLA 应当以模仿目标角色语言风格的语气说话（Wang et al., 2024a; Li et al., 2023a; Zhou et al., 2023a; Yu et al., 2024）。为此，通常为 RPLA 提供示范性的角色对话（Wang et al., 2024a; Li et al., 2023a），它们可以借助 LLM 的上下文学习能力模仿该语气。
- **知识**：RPLA 本质上需要模拟角色的知识广度。一方面，它们应当准确回忆角色的知识，包括其身份（Zhou et al., 2023a; Wang et al., 2024a; Tang et al., 2024; Lu et al., 2024），社会关系（Chen et al., 2023c; Shen et al., 2023a; Zhao et al., 2023a）和经历（Shao et al., 2023; Wang et al., 2024a; Chen et al., 2023c; Yu et al., 2024）。另一方面，它们可能被要求克制，不要展示超出角色范围的知识或能力（例如，一个 LLM 即使正在扮演 *Socrates* 也能写代码，而这种能力并不是被期望的）（Shao et al., 2023; Lu et al., 2024; Yu et al., 2024）。这一现象被称为“角色幻觉”（Shao et al., 2023），它源于 LLM 所拥有的大量知识，并可通过 SFT 予以缓解（Shao et al., 2023）。
- **性格与思维过程**：期望 RPLA 捕捉角色的内心世界，这可以通过其在具体场景中的想法（Xu et al., 2024c; Chen et al., 2024）及其潜在性格（Wang et al., 2024d; Shao et al., 2023）来衡量。先进的 RPLA 应当能够理解并再现角色在特定场景中的思考方式，例如理解其决策动机（Yuan et al., 2024b），或预测与角色高度一致的决策和行为（Xu et al., 2024c; Chen et al., 2024）。性格隐藏在具体想法背后。它是个体相互关联的行为，认知和情绪模式（Barrick & Mount, 1991; Bem, 1981），适用于角色和 RPLA 双方。因此，RPLA 应当展现出与角色相匹配的性格特质（Wang et al., 2024d），这可以通过大五人格量表等心理量表来衡量。
:::

:::annotation
角色保真度要过三关：语言风格像不像，知识储备对不对，人格与思维方式一不一致。风格靠上下文学习，知识靠检索和参数，人格最难量化，也最容易被读者一眼看穿。
:::

:::bi

To evaluate RPLAs on the aforementioned dimensions, existing methodologies could be distinguished into four categories:

:::zh

为了在上述维度上评测 RPLA，现有方法可分为四类：
:::

:::bi

- **Automatic Evaluation with Ground Truth**: Typically, datasets with ground truth are expected for evaluating character fidelity in terms of knowledge, personality and thought. While early similarity metrics such as Rouge-L (Lin, 2004) could be applied to compare RPLA responses with ground truth (Wang et al., 2024a), recent studies increasingly leverage state-of-the-art LLMs such as GPT-4 as evaluators. On one hand, evaluator LLMs can score RPLA responses based on certain criteria, or determine the superior response from two models for win rate calculation, provided with “ground truth” responses as references. However, the “ground truth” are typically synthesized by advanced LLMs (Wang et al., 2024a). On the other hand, evaluator LLMs can be used to classify RPLA responses, and the results are then compared with ground truth labels (Wang et al., 2024d).
- **Automatic Evaluation without Ground Truth**: As collecting ground truth data for RPLA evaluation is often challenging, several studies such as CharacterEval explore using LLMs to evaluate RPLA responses without ground truth (Shao et al., 2023; Tu et al., 2024). Instead, character profiles should be provided. This category is effective for evaluating character-independent abilities and linguistic styles, which require little knowledge about the characters. However, when it comes to characters’ knowledge and thoughts, LLMs might not possess the necessary depth of relevant knowledge, especially for unfamiliar characters. This concern potentially leads to inadequately informed judgments of LLMs, and hence produces suboptimal evaluation results. Even when equipped with extensive knowledge, current LLMs still exhibit deficiencies in discerning nuanced aspects of role-playing.
- **Multi-choice Questions**: Multi-choice questions also come with ground truth, yet they differ from “automatic evaluation with ground truth” in that they merely require RPLAs to select from a fixed set of options, rather than generating open-ended responses. This significantly reduces the output space for RPLAs, making the evaluation simpler. This method is particularly suitable for evaluating the fidelity of characters’ thoughts, *e.g.*, behavior prediction (Xu et al., 2024c; Chen et al., 2024) and motivation generation (Yuan et al., 2024b; Shen et al., 2023a). For these tasks, it is impractical to require RPLAs to produce responses exactly matching the ground truth, and responses may be reasonable even if they deviate from the ground truth significantly.
- **Human Evaluation**: Inviting human annotators to assess the performance of RPLAs is a viable and effective approach (Zhou et al., 2023a). However, it comes with several drawbacks, such as cost in terms of time and money, as well as lack of reproducibility. This method is akin to “automatic evaluation without ground truth”, yet employs humans as more precise evaluators. Hence, it similarly falls short in evaluations that require in-depth knowledge about the characters, as recruiting qualified annotators who are well-acquainted with these characters can be difficult. Combining automatic evaluation with human evaluation, some efforts also fine-tune the evaluator LLMs with human annotations (Tu et al., 2024).

:::zh

- **带标准答案的自动评测**：通常，在知识，性格和思维方面评测角色保真度时，期望有带标准答案的数据集。虽然早期的相似度指标如 Rouge-L（Lin, 2004）可用于将 RPLA 回答与标准答案进行比较（Wang et al., 2024a），但近期的研究越来越多地利用 GPT-4 等最先进的 LLM 作为评测器。一方面，在给定“标准答案”回答作为参考的情况下，评测器 LLM 可以依据某些标准对 RPLA 回答打分，或从两个模型中判定更优的回答以计算胜率。然而，这些“标准答案”通常由先进 LLM 合成（Wang et al., 2024a）。另一方面，评测器 LLM 可用于对 RPLA 回答进行分类，然后将结果与标准答案标签进行比较（Wang et al., 2024d）。
- **不带标准答案的自动评测**：由于为 RPLA 评测收集标准答案数据往往很困难，CharacterEval 等若干研究探索在没有标准答案的情况下使用 LLM 评测 RPLA 回答（Shao et al., 2023; Tu et al., 2024）。此时应提供角色画像。这一类别对于评测与角色无关的能力和语言风格是有效的，因为它们对角色知识的要求很低。然而，涉及角色的知识和思维时，LLM 可能不具备相关知识的必要深度，尤其对于不熟悉的角色。这一担忧可能导致 LLM 的判断信息不足，从而产生次优的评测结果。即便拥有大量知识，当前的 LLM 在辨别角色扮演的细微方面仍存在不足。
- **多选题**：多选题同样带有标准答案，但与“带标准答案的自动评测”不同之处在于，它们只要求 RPLA 从固定选项集中选择，而不是生成开放式回答。这显著缩小了 RPLA 的输出空间，使评测更简单。该方法特别适合评测角色思维的保真度，例如行为预测（Xu et al., 2024c; Chen et al., 2024）和动机生成（Yuan et al., 2024b; Shen et al., 2023a）。对于这些任务，要求 RPLA 产生与标准答案完全一致的回答是不切实际的，而且回答即使明显偏离标准答案也可能是合理的。
- **人工评测**：邀请人工标注者评估 RPLA 的表现是一种可行且有效的方法（Zhou et al., 2023a）。然而，它也有一些缺点，例如时间和金钱成本，以及缺乏可复现性。该方法类似于“不带标准答案的自动评测”，但以人类作为更精确的评测器。因此，它在需要深入了解角色的评测中同样力不从心，因为招募熟悉这些角色的合格标注者可能很困难。结合自动评测与人工评测，一些工作还用人工标注微调评测器 LLM（Tu et al., 2024）。
:::

:::bi

Previous efforts primarily focus on RPLA evaluation on widely-known established characters (Wang et al., 2024d; Ahn et al., 2024). However, it is challenging to obtain high-quality datasets and achieve precise and nuanced evaluations for those highly complicated characters.
Hence, there has recently been a growing trend in assessing LLMs’ role-playing capabilities based on original characters (BosonAI, 2024; Samuel et al., 2024).

:::zh

以往的工作主要关注对广为人知的既有角色进行 RPLA 评测（Wang et al., 2024d; Ahn et al., 2024）。然而，对于那些高度复杂的角色，获得高质量数据集并实现精确细致的评测颇具挑战。因此，近来出现了一种日益增长的趋势，即基于原创角色评估 LLM 的角色扮演能力（BosonAI, 2024; Samuel et al., 2024）。
:::

## 个性化人设（Individualized Persona(lization)）

### 定义（Definition）

:::bi

**Personalization** tailors LLMs to meet the unique needs, experiences, and preferences of individuals,
which have been increasingly important in modern AI applications (Salemi et al., 2024).
Research in this area aims at providing personalized services, adapting to the preferences of individual users or even mirroring their behaviors (Chen et al., 2023b).
When such a personalized system attempts to encapsulate these aspects, it essentially engages in role-playing, emulating an individual.
This process shapes **individualized persona** for RPLAs (Salemi et al., 2024), typically embodying digital clones or personal assistants for individuals.

:::zh

**个性化**让 LLM 去适配个体的独特需求，经历与偏好，这在现代 AI 应用中日益重要（Salemi et al., 2024）。
该领域的研究旨在提供个性化服务，适应用户个体的偏好，甚至复刻他们的行为（Chen et al., 2023b）。
当这样一个个性化系统试图把这些方面封装起来时，它本质上就是在进行角色扮演，模拟一个个体。
这一过程塑造了 RPLA 的**个性化人设**（Salemi et al., 2024），通常体现为个体的数字分身或个人助理。
:::

:::bi

In this paper, we categorize the applications of personalized RPLAs into three tiers, ranging from
**conversation** (Gao et al., 2023b; Ahn et al., 2023) and **recommendation** (Chen et al., 2023b; Yang et al., 2023a), to autonomous agents for more complicated **task solving** (Li et al., 2024d).

:::zh

本文将个性化 RPLA 的应用划分为三个层级，从**对话**（Gao et al., 2023b; Ahn et al., 2023）与**推荐**（Chen et al., 2023b; Yang et al., 2023a），到面向更复杂**任务求解**（Li et al., 2024d）的自主智能体。
:::

:::bi

- **Conversations**: Early research for personalized RPLAs primarily focuses on personalized conversations by learning and incorporating the user persona (Cho et al., 2022; Zhou et al., 2023c; Ng et al., 2024), aligning stylistic features with user preferences to boost engagement (Zheng et al., 2021; Wang et al.,). With the emergence and evolution of LLMs, personalized RPLAs become capable of handling increasingly complex and comprehensive tasks, gaining competence in complicated task-planning and tool-learning for auto-completing personalized services.
- **Recommendation**: Conversational recommendation systems (Chen et al., 2023b; Yang et al., 2023a; Wu et al., 2023) based on LLMs have been widely regarded as the next generation of recommendation systems (Lian et al., 2024), support users in achieving recommendation-related goals through multi-turn dialogues (Jannach et al., 2021). Compared with traditional recommendations, these methods stand out with their solid foundation models, natural language interactions, and straightforward, typically nonparametric evolution (Sallam, 2023; Abbasian et al., 2023).
- **Task Solving**: Furthermore, personalized RPLAs become increasingly competent in more complicated task solving (Yao et al., 2023a; Significant-Gravitas, 2023), such as coding (Microsoft, 2024), travel planning (Xie et al., 2024b), and research survey (Wang et al., 2024c), typically interacting with various external software. They are autonomous LLM-based agents that are deeply integrated with personal data, devices, and services (Dong et al., 2023; Li et al., 2024d). They have significantly advanced personal assistants beyond early predecessors such as Siri (Apple Inc., 2024) which struggle with complex user requests.

:::zh

- **对话**：个性化 RPLA 的早期研究主要通过学习和融入用户人设（Cho et al., 2022; Zhou et al., 2023c; Ng et al., 2024）来关注个性化对话，让风格特征与用户偏好对齐以提升参与度（Zheng et al., 2021; Wang et al.,）。随着 LLM 的出现与演进，个性化 RPLA 开始能够处理日益复杂和全面的任务，在复杂的任务规划与工具学习上获得能力，从而自动完成个性化服务。
- **推荐**：基于 LLM 的对话式推荐系统（Chen et al., 2023b; Yang et al., 2023a; Wu et al., 2023）被广泛视为下一代推荐系统（Lian et al., 2024），支持用户通过多轮对话实现推荐相关目标（Jannach et al., 2021）。与传统推荐相比，这些方法凭借扎实的基础模型，自然语言交互，以及直接且通常非参数的演进方式脱颖而出（Sallam, 2023; Abbasian et al., 2023）。
- **任务求解**：此外，个性化 RPLA 在更复杂的任务求解上日益胜任（Yao et al., 2023a; Significant-Gravitas, 2023），例如编码（Microsoft, 2024），旅行规划（Xie et al., 2024b）和调研综述（Wang et al., 2024c），通常与各种外部软件交互。它们是自主的基于 LLM 的智能体，与个人数据，设备和服务深度集成（Dong et al., 2023; Li et al., 2024d）。它们让个人助理远超 Siri（Apple Inc., 2024）等早期前身，后者难以应对复杂的用户请求。
:::

:::bi

To build personalized RPLAs that accurately capture and portray the individualized personas, the process typically consists of two crucial steps: *1)* **Persona data collection**, which gathers the necessary data to shape the individualized personas, and *2)* **Persona modeling**, which creates models that represent these individual personas using the collected data.
For persona data collection, the data can vary greatly in format, content, and modalities across different applications and tasks.
We categorize this data into three types: profile, interactions, and domain knowledge, which will be detailed in §6.2.
For persona modeling, the challenge is to embody the intended persona from the unprocessed persona data, which are generally massive, sparse and noisy, as will be discussed in §6.3.
The evaluation of personalized RPLAs depends on specific applications, and will be discussed in §6.4.

:::zh

要构建能准确捕捉并呈现个性化人设的个性化 RPLA，流程通常包含两个关键步骤：*1)* **人设数据收集**，收集塑造个性化人设所需的数据，以及 *2)* **人设建模**，利用收集到的数据创建代表这些个体人设的模型。
对于人设数据收集，不同应用和任务下的数据在格式，内容和模态上差异很大。
我们将这些数据分为三类：画像，交互和领域知识，将在 §6.2 中详述。
对于人设建模，挑战在于从未经处理的人设数据中体现目标人设，而这些数据通常庞大，稀疏且有噪声，将在 §6.3 中讨论。
个性化 RPLA 的评测取决于具体应用，将在 §6.4 中讨论。
:::

:::bi

Despite the advancement with LLMs, personalized RPLAs still face several challenges, including processing long inputs and vast search space (Chen et al., 2023b; Abbasian et al., 2023), utilizing sparsity, lengthy, and noisy user interactions data (Zhou et al., 2024c), learning domain-specific knowledge for understanding user profiles (Zhang et al., 2023c), understanding multi-modal contexts (Dong et al., 2023), ensuring privacy and ethical standards (Benary et al., 2023; Eapen & Adhithyan,), and optimizing response time for seamless integration into real-time applications.

:::zh

尽管 LLM 带来了进步，个性化 RPLA 仍面临若干挑战，包括处理长输入和庞大的搜索空间（Chen et al., 2023b; Abbasian et al., 2023），利用稀疏，冗长且有噪声的用户交互数据（Zhou et al., 2024c），学习领域知识以理解用户画像（Zhang et al., 2023c），理解多模态上下文（Dong et al., 2023），确保隐私与伦理标准（Benary et al., 2023; Eapen & Adhithyan,），以及优化响应时间以无缝融入实时应用。
:::

### 个性化人设的数据收集（Data Collection of Individualized Persona）

:::annotation
个性化人设的三种数据正好对应“你是谁，你做过什么，你懂什么”。表 3 里的 Personal Profile，Behavior History，File 三列就是这三类的产品化叫法。
:::

:::figure
![Table 3: Overview of existing role-playing datasets with individualized personas](./images/rpla-survey/fig-05.png)

Table 3: Overview of existing role-playing datasets with individualized personas.

:::zh
表 3：个性化人设数据集汇总。每行一个数据集，列出画像数，交互数，是否含领域知识，语言和来源。这是三类人设里最贴近真实用户的一类，数据规模明显小于表 2。
:::
:::

:::bi

The individualized personas for personalized RPLAs are typically represented with three distinct types of data, including **profile**, **interactions**, and **domain knowledge**, depending on the specific applications.
There have been numerous datasets with individualized personas, as outlined in Table 3, covering various languages including English (Ahn et al., 2023), Chinese (Baidu, 2020), Japanese (Yamashita et al., 2023), and Korean (Cho et al., 2023).

:::zh

个性化 RPLA 的个性化人设通常用三种不同类型的数据来表示，包括**画像**，**交互**和**领域知识**，具体取决于应用。
已有大量带有个性化人设的数据集，如表 3 所列，覆盖多种语言，包括英语（Ahn et al., 2023），中文（Baidu, 2020），日语（Yamashita et al., 2023）和韩语（Cho et al., 2023）。
:::

#### 画像（Profiles）

:::bi

Profiles are fundamental information that explicitly describes individualized personas, which are typically well-structured.
Typically, they are initially set by users, and can be continuously updated.
The basic elements usually include the names, gender and ethnicity of individual users in text (Santurkar et al., 2023)
Besides, profiles commonly contain natural language descriptions of individuals, describing their characteristics, such as identity, hobbies, experiences and other statements (Zhang et al., 2018; Dinan et al., 2020; Gao et al., 2023b; Li et al., 2021; Ng et al., 2024), varying based on the detailed applications. Additionally, Lee et al. (2024) propose a multi-modality persona that includes elements such as the user’s appearance.
For example, in live streaming applications, persona data can be composed of both basic profile information — such as an individual’s age, gender, and location — and domain-specific details, namely streamer characteristics such as fan numbers and streaming style Gao et al. (2023b).
Additionally, profiles can contain multi-modal information.
For instance, profiles in (Ahn et al., 2023) incorporate text-image pairs, which are individuals’ comments for pictures on social media.

:::zh

画像是明确描述个性化人设的基础信息，通常结构良好。
通常，它们最初由用户设定，并且可以持续更新。
基本元素通常包括文本形式的个体用户姓名，性别和族裔（Santurkar et al., 2023）。
此外，画像通常包含对个体的自然语言描述，描述其特征，例如身份，爱好，经历和其他陈述（Zhang et al., 2018; Dinan et al., 2020; Gao et al., 2023b; Li et al., 2021; Ng et al., 2024），并随具体应用而变化。另外，Lee et al. (2024) 提出一种包含用户外貌等元素的多模态人设。
例如，在直播应用中，人设数据既可以由基础画像信息组成（例如个体的年龄，性别和位置），也可以由领域特定细节组成，即主播特征，例如粉丝数量和直播风格 Gao et al. (2023b)。
此外，画像可以包含多模态信息。
例如，（Ahn et al., 2023）中的画像纳入了图文对，即个体在社交媒体上对图片的评论。
:::

#### 交互（Interactions）

:::bi

The interaction data capture the dynamic evolution of individualized persona.
Interactions are data generated during the use of applications that implicitly portray individualized personas, such as conversations, user preferences, and other behaviors.
For example, PERSONA-CHAT (Zhang et al., 2018) and ConvAI (Dinan et al., 2020) collect two-person dialogues through crowd-sourcing, while LiveChat (Gao et al., 2023b) and MPCHAT (Ahn et al., 2023) collect multiplayer conversations from Internet sources such as live streaming and Reddit.
To reduce construction costs, Jandaghi et al. (2023) uses a Generator-Critic architecture with LLMs for dialogue synthesis, and Zeng et al. (2024) first conducts automatic annotation to generate conversational data from raw sources like experiences, speeches, or writings.
In addition to dialogues in natural language, Agrawal et al. (2023) and Santurkar et al. (2023) introduce comic pictures and multiple-choice questions as interactions.
This kind of data could be consistently collected and systematically organized in real-world applications, offering benefits such as convenient acquisition and dynamic evolution.
Hence, it plays an important role in practical applications.

:::zh

交互数据捕捉个性化人设的动态演化。
交互是在应用使用过程中生成的数据，隐式地描绘个性化人设，例如对话，用户偏好和其他行为。
例如，PERSONA-CHAT（Zhang et al., 2018）和 ConvAI（Dinan et al., 2020）通过众包收集两人对话，而 LiveChat（Gao et al., 2023b）和 MPCHAT（Ahn et al., 2023）从直播和 Reddit 等互联网来源收集多人对话。
为降低构建成本，Jandaghi et al. (2023) 采用基于 LLM 的 Generator-Critic 架构进行对话合成，Zeng et al. (2024) 则先进行自动标注，从经历，演讲或写作等原始来源生成对话数据。
除了自然语言对话，Agrawal et al. (2023) 和 Santurkar et al. (2023) 还引入漫画图片和多项选择题作为交互。
这类数据可以在现实应用中持续采集并系统化组织，带来获取便捷和动态演化等好处。
因此，它在实际应用中发挥重要作用。
:::

#### 领域知识（Domain Knowledge）

:::bi

Incorporating domain-specific knowledge into general language models aids in the better understanding of user profiles and interactions within specific domains.
This is crucial for accurately understanding user needs and ensuring the consistency of the persona in role-playing (Wang et al., 2023b).
For example, incorporating a knowledge base like Wikipedia helps to provide detailed backgrounds of named entities in dialogues as a part of the whole persona (Jang et al., 2022; Wang et al., 2023b; Baidu, 2020), which promotes LLMs to better understand user personas with enriched background knowledge of relevant entities.

:::zh

将领域特定知识融入通用语言模型，有助于更好地理解特定领域内的用户画像和交互。
这对于准确理解用户需求，确保角色扮演中人设的一致性至关重要（Wang et al., 2023b）。
例如，融入像 Wikipedia 这样的知识库，有助于在对话中提供命名实体的详细背景，作为整个人设的一部分（Jang et al., 2022; Wang et al., 2023b; Baidu, 2020），从而促使 LLM 借助相关实体更丰富的背景知识更好地理解用户人设。
:::

### 个性化人设建模（Modeling Individualized Persona）

:::bi

Existing methodologies for modeling individualized persona can be roughly categorized into two types: offline learning and online learning.
In offline learning, the learning process is conducted on the comprehensive dataset at regular intervals, which is also referred to as batch learning.
In online learning, learning happens in real-time as new data becomes available.

:::zh

现有建模个性化人设的方法可大致分为两类：离线学习和在线学习。
在离线学习中，学习过程以固定间隔在完整数据集上进行，也被称为批学习。
在在线学习中，学习在新数据到来时实时发生。
:::

#### 离线学习（Offline Learning）

:::bi

This method tailors the outputs of LLMs to reflect specific personas represented in pre-existing datasets.
Parameter fine-tuning emerges as the mainstream approach for offline learning, typically based on SFT and RLHF (Mondal et al., 2024; Zheng et al., 2023c; Li et al., 2024b; Jang et al., 2023).
For example, Mondal et al. (2024) proposes a two-stage approach for personalizing LLMs with profile and interaction datasets.
In addition, some recent studies propose techniques with nonparametric learning for LLMs personalization.
For instance, Shea & Yu (2023) introduces an offline RL framework with a persona consistency critic and variance reduction, while Weng et al. (2024) integrates embedding control vectors within the model’s activation states, allowing dynamic output adjustment for diverse personality traits.
These methods exhibit several deficiencies: *1)* they face a fundamental trade-off between accuracy and efficiency; *2)* they are heavily reliant on the quality of datasets; *3)*
more crucially, they struggle to adapt to dynamic changes in persona data, limiting their real-world applicability.

:::zh

该方法定制 LLM 的输出，使其反映既有数据集中所代表的特定人设。
参数微调成为离线学习的主流方法，通常基于监督微调（SFT）和基于人类反馈的强化学习（RLHF）（Mondal et al., 2024; Zheng et al., 2023c; Li et al., 2024b; Jang et al., 2023）。
例如，Mondal et al. (2024) 提出一种两阶段方法，利用画像和交互数据集对 LLM 进行个性化。
此外，一些近期研究提出用非参数学习技术实现 LLM 个性化。
例如，Shea & Yu (2023) 引入一种带有人设一致性评判器和方差缩减的离线强化学习（RL）框架，而 Weng et al. (2024) 在模型激活状态中整合嵌入控制向量，从而针对多样化人格特质动态调整输出。
这些方法存在若干不足：*1)* 它们在准确性与效率之间面临根本性的权衡，*2)* 它们严重依赖数据集的质量，*3)* 更关键的是，它们难以适应人设数据的动态变化，从而限制了在现实世界中的适用性。
:::

#### 在线学习（Online Learning）

:::bi

In online learning, the personas are dynamic and continuously evolving, *i.e.*, regularly updated with incoming data, the user interactions in real-world applications.
This enables personalized RPLAs to quickly adapt and stay relevant to user needs and preferences.
With LLMs, effective persona learning is typically nonparametric and training-free, which only involves effective management of memory and context (Dalvi Mishra et al., 2022; Kim et al., 2024; Baek et al., 2023; Zhou et al., 2024c).
For this demand, retrieval modules become indispensable, especially for LLMs with limited context window (Mysore et al., 2023; Sun et al., 2024).
Moreover, methodologies for effective online learning methods consider not only natural language interactions, but also non-linguistic feedback from users (Ma et al., 2023a).

:::zh

在在线学习中，人设是动态且持续演化的，即随新数据（现实应用中的用户交互）定期更新。
这使个性化 RPLA 能快速适应并保持与用户需求和偏好相关。
借助 LLM，有效的人设学习通常是非参数且免训练的，只涉及对记忆和上下文的有效管理（Dalvi Mishra et al., 2022; Kim et al., 2024; Baek et al., 2023; Zhou et al., 2024c）。
出于这一需求，检索模块变得不可或缺，尤其是对于上下文窗口有限的 LLM（Mysore et al., 2023; Sun et al., 2024）。
此外，有效的在线学习方法不仅考虑自然语言交互，还考虑来自用户的非语言反馈（Ma et al., 2023a）。
:::

:::bi

Besides nonparametric methods, fine-tuning with online interactive data is also widely applied to online persona learning, including both SFT with mini-batches from on-the-fly user stream data (Qin et al., 2024) and RLHF with real-time user feedback (Ding et al., 2023b; Bai et al., 2022a).
Additionally, Shaikh et al. (2024b) use fewer than 10 demonstrations to align language model outputs with a user’s demonstrated behaviors through iterative DPO (Rafailov et al., 2024) training.
Nevertheless, significant challenges arise in accurately recognizing and learning the sparse persona-specific features from the noisy interaction data.
Besides, the personas of real users may change over time, which poses further challenges for their effective modeling and updating.
Therefore, for nonparametric methods, the effectiveness heavily relies on the mechanisms of memory management and retrieval.

:::zh

除了非参数方法，利用在线交互数据进行微调也被广泛应用于在线人设学习，既包括用即时用户流数据中的小批量进行 SFT（Qin et al., 2024），也包括用实时用户反馈进行 RLHF（Ding et al., 2023b; Bai et al., 2022a）。
此外，Shaikh et al. (2024b) 使用不到 10 个演示，通过迭代 DPO（Rafailov et al., 2024）训练来使语言模型输出与用户展现的行为对齐。
尽管如此，从有噪声的交互数据中准确识别并学习稀疏的人设特定特征仍面临重大挑战。
此外，真实用户的人设可能随时间变化，这给有效建模和更新带来进一步挑战。
因此，对于非参数方法，其有效性在很大程度上依赖于记忆管理和检索机制。
:::

### LLM 与个性化人设的评测（Evaluation for LLMs and Individualized Persona）

:::bi

For effective personalization, AI models should focus on two key aspects: understanding and utilizing personas.
Specifically, they should be able to identify unique user personas and predict their future preferences, actions, and thoughts, which serves as the preliminary to provide personalized responses that embody the individualized personas, in various environments that are increasingly comprehensive and complex.
Here, we introduce the evaluation methodologies for personalized RPLAs across the three application tiers, namely:
*1)* **Conversation**, which focuses on models’ understanding of the persona and replication of users’ talking styles;
*2)* **Recommendation**, which measures how models utilize persona information to recommend items that align with user preferences;
*3)* **Task Solving**, which challenges models’ capabilities in integrating user personas to accomplish their personalized tasks and demands.

:::zh

为了实现有效个性化，AI 模型应关注两个关键方面：理解人设和利用人设。
具体而言，它们应能识别独特的用户人设，并预测其未来的偏好，行为和想法，这是提供体现个性化人设的个性化响应的前提，且适用于日益全面和复杂的各种环境。
这里，我们介绍个性化 RPLA 在三个应用层级上的评测方法，即：
*1)* **对话**，关注模型对人设的理解以及对用户说话风格的复现，*2)* **推荐**，衡量模型如何利用人设信息来推荐符合用户偏好的物品，*3)* **任务求解**，考验模型整合用户人设以完成其个性化任务和需求的能力。
:::

#### 对话（Conversation）

:::bi

Early work in personalization for conversations represents an initial attempt to understand the persona.
In this scenario, traditional tasks include predicting the speaker’s persona elements (Gao et al., 2023b; Jang et al., 2022) based on dialogues, forecasting the next utterance by considering the context and persona profile (Humeau et al., 2019), evaluating the performance of ranking models (Gao et al., 2023b; Ahn et al., 2023), and recognizing the addressee in multiplayer conversations (Liu et al., 2022).
The metrics typically focus on the evaluation of accuracy, fluency (Dinan et al., 2018), similarity (Popović, 2017; Post, 2018; Lin, 2004) between generated and original responses, recall, mean reciprocal rank (MRR) (Gao et al., 2023b; Ahn et al., 2023), and manual assessments (Liu et al., 2022; Gao et al., 2023b) of query relevance, persona entailment, and response fluency.
Recently, ECHO (Ng et al., 2024) introduces the Turing test to RPLA evaluation, which engages acquaintances of the target individuals to distinguish between the persons and their RPLA counterparts.

:::zh

面向对话的个性化早期工作代表了对人设理解的初步尝试。
在这一场景下，传统任务包括基于对话预测说话者的人设要素（Gao et al., 2023b; Jang et al., 2022），结合上下文和人设画像预测下一句话（Humeau et al., 2019），评测排序模型的性能（Gao et al., 2023b; Ahn et al., 2023），以及在多人对话中识别受话者（Liu et al., 2022）。
评测指标通常关注生成回复与原始回复之间的准确率，流畅度（Dinan et al., 2018），相似度（Popović, 2017; Post, 2018; Lin, 2004），召回率，平均倒数排名（MRR）（Gao et al., 2023b; Ahn et al., 2023），以及对查询相关性，人设蕴含和回复流畅度的人工评估（Liu et al., 2022; Gao et al., 2023b）。
最近，ECHO（Ng et al., 2024）将图灵测试引入 RPLA 评测，让目标个体的熟人去区分真人与他们的 RPLA 对应体。
:::

#### 推荐（Recommendation）

:::bi

For personalized recommendation, the evaluation focuses on LLMs’ capabilities in understanding and leveraging user preferences from the interaction history for future recommendation.
Traditional evaluation in this field measures LLMs’ ability to understand and extract user preferences(Dai et al., 2024b; Yang et al., 2023a; Maghakian et al., 2023; Liu et al., 2023c; Mysore et al., 2023), the ability to rank (Dai et al., 2023a; Hou et al., 2024; Kang et al., 2023; Liu et al., 2023a; Bao et al., 2023; Chao et al., 2024), the ability of zero-shot and few-shot recommendation (Wang & Lim, 2023; Liu et al., 2023a), and
the ability of sequential recommendation (Yang et al., 2024; Liu et al., 2023a).
The evaluation metrics typically include Top-$k$ accuracy and MRR to assess the effectiveness.

:::zh

对于个性化推荐，评测关注 LLM 从交互历史中理解并利用用户偏好以进行未来推荐的能力。
该领域的传统评测衡量 LLM 理解和提取用户偏好的能力（Dai et al., 2024b; Yang et al., 2023a; Maghakian et al., 2023; Liu et al., 2023c; Mysore et al., 2023），排序能力（Dai et al., 2023a; Hou et al., 2024; Kang et al., 2023; Liu et al., 2023a; Bao et al., 2023; Chao et al., 2024），零样本和少样本推荐能力（Wang & Lim, 2023; Liu et al., 2023a），以及序列推荐能力（Yang et al., 2024; Liu et al., 2023a）。
评测指标通常包括 Top-$k$ 准确率和 MRR，用于评估有效性。
:::

#### 任务求解（Task Solving）

:::bi

Personalized RPLAs have been increasingly considered to provide personalized services for task solving.
These tasks and requirements are usually user-specific, which exhibit greater diversity and complexity compared to traditional conversation or recommendation.
Personalized RPLAs are expected to develop a deep understanding of user preferences and adhere to their complicated instructions to satisfy user requirements.
Evaluating personalized RPLAs on these tasks involves assessing not only their ability to execute foundational tasks, but also their capacity to comprehend and cater to the nuanced requirements and preferences of individuals.
The evaluation primarily focuses on several key aspects, including the models’ abilities in theory of mind (Zhou et al., 2023b; Sap et al., 2023; Jin et al., 2024; Su & Bao, 2024; Rescala et al., 2024; Xu et al., 2024a), tool usage (Qin et al., 2023; Li et al., 2023h; Farn & Shin, 2023; Huang et al., 2023d; Zhuang et al., 2024; Huang et al., 2024c), and task automation (Wen et al., 2023a; Shen et al., 2023c; Gao et al., 2023a; Valmeekam et al., 2024).
More broadly, existing studies have covered the models’ ability to understand and predict user needs (Tan et al., 2024; Zhang et al., 2024a), handle personal data securely (Yim, 2023; Wu et al., 2024d; Kumar et al., 2024; Wu et al., 2024a; Yin et al., 2024), interact with information from external tools or apps (Yuan et al., 2024a; Huang et al., 2024b; Xie et al., 2024c; Huang et al., 2024d), and execute tasks (Dong et al., 2023; Guan et al., 2023; Mucha et al., 2024) effectively as a personal assistant.

:::zh

个性化 RPLA 越来越多地被考虑用于为任务求解提供个性化服务。
这些任务和需求通常是用户特定的，与传统对话或推荐相比展现出更大的多样性和复杂性。
个性化 RPLA 被期望能深入理解用户偏好，并遵循其复杂指令来满足用户需求。
在这些任务上评测个性化 RPLA，不仅要评估它们执行基础任务的能力，还要评估它们理解并满足个体细致需求与偏好的能力。
评测主要关注几个关键方面，包括模型在心智理论（Zhou et al., 2023b; Sap et al., 2023; Jin et al., 2024; Su & Bao, 2024; Rescala et al., 2024; Xu et al., 2024a），工具使用（Qin et al., 2023; Li et al., 2023h; Farn & Shin, 2023; Huang et al., 2023d; Zhuang et al., 2024; Huang et al., 2024c）和任务自动化（Wen et al., 2023a; Shen et al., 2023c; Gao et al., 2023a; Valmeekam et al., 2024）方面的能力。
更广泛地说，现有研究已覆盖模型理解并预测用户需求（Tan et al., 2024; Zhang et al., 2024a），安全处理个人数据（Yim, 2023; Wu et al., 2024d; Kumar et al., 2024; Wu et al., 2024a; Yin et al., 2024），与来自外部工具或应用的信息交互（Yuan et al., 2024a; Huang et al., 2024b; Xie et al., 2024c; Huang et al., 2024d），以及作为个人助理有效执行任务（Dong et al., 2023; Guan et al., 2023; Mucha et al., 2024）的能力。
:::

## RPLA 应用之下的风险（Risks Beneath RPLA Applications）

:::bi

While RPLAs are increasingly deployed in real-world applications, potential concerns could result in significant problems if not addressed appropriately.
This section highlights the risks associated with current RPLAs, covering the following areas:

:::zh

虽然 RPLA 正越来越多地部署到现实应用中，但潜在的问题如果得不到妥善处理，就可能引发严重的麻烦。本节着重讨论当前 RPLA 相关的风险，涵盖以下几个方面：
:::

:::bi

- toxicity,
- bias,
- hallucination,
- privacy violations, and
- technical challenges in real-world deployment.

:::zh

- 毒性，
- 偏见，
- 幻觉，
- 隐私侵犯，以及
- 现实部署中的技术挑战。
:::

:::annotation
七章把风险拆成五类：毒性，偏见，幻觉，隐私，真实部署的技术挑战。前四个是模型层面的老问题在角色扮演里的放大，第五个是这套系统能不能真正上线的门槛。
:::

### 毒性（Toxicity）

#### 大语言模型（LLM）中固有的毒性（Inherent Toxicity in LLMs）

:::bi

Recent studies have underscored the proficiency of LLMs in generating content that is not only fluent and coherent but also potentially toxic.
Previous research (Zhang & Wan, 2023; Wen et al., 2023b) has highlighted a concerning tendency of these models to produce harmful content.
Such toxic outputs not only compromise user experience but also pose significant societal risks.
It can lead to the perpetuation of harmful narratives, exacerbate social divisions, and even influence public opinion and behavior in detrimental ways.

:::zh

近期的研究强调，LLM 在生成内容时不仅流利连贯，而且可能带有毒性。此前的相关研究（Zhang & Wan, 2023; Wen et al., 2023b）指出，这些模型存在生成有害内容的倾向，令人担忧。这类毒性输出不仅损害用户体验，还会带来严重的社会风险。它可能导致有害叙事的持续传播，加剧社会分裂，甚至以有害的方式影响公众舆论和行为。
:::

#### RPLA 的困境（The RPLAs Conundrum）

:::bi

The issue of toxicity becomes more pronounced in RPLA settings, where LLMs are more likely to generate toxic content, aligning with characters’ behaviors that might not adhere to societal moral standards (Deshpande et al., 2023).
However, creating completely safe RPLAs that are capable of general role-playing remains a challenging task.
The inherent presence of toxic content in human-generated data complicates the development of a clean training corpus.
Moreover, such a sanitized training corpus might compromise the model’s performance, particularly its ability to generalize across various tasks, including role-playing.
This limitation not only affects the model’s generalization ability but also its effectiveness in scenarios that may require an understanding of roles characterized by behaviors or traits that diverge from societal moral standards.

:::zh

毒性问题在 RPLA 场景中更加突出，因为 LLM 更有可能生成毒性内容，与那些可能不符合社会道德标准的角色行为保持一致（Deshpande et al., 2023）。然而，构建既完全安全又具备通用角色扮演能力的 RPLA 仍然是一项颇具挑战的任务。人类生成的数据中天然存在毒性内容，这使得构建干净的训练语料变得困难。此外，这种经过净化的训练语料可能会损害模型的表现，尤其是它在包括角色扮演在内的多种任务上的泛化能力。这一局限不仅影响模型的泛化能力，还会削弱它在那些需要理解偏离社会道德标准的行为或特质所刻画的角色时的有效性。
:::

#### 平衡安全性与性能的策略（Strategies for Balancing Safety and Performance）

:::bi

Despite these challenges, recent research proposes strategies like prompt engineering and semantic censorship as means to mitigate toxicity without altering the model’s fundamental parameters (Han et al., 2022; Ahn et al., 2023).
These approaches aim to balance the reduction of toxic outputs with the preservation of the model’s versatility and effectiveness across a broad range of applications.

:::zh

尽管存在这些挑战，近期的研究提出了一些策略，比如提示工程和语义审查，作为在不改动模型基础参数的前提下减轻毒性的手段（Han et al., 2022; Ahn et al., 2023）。这些方法旨在在减少毒性输出与保持模型在广泛应用场景中的多样性和有效性之间取得平衡。
:::

### 偏见（Bias）

#### 角色扮演场景中的偏见表现（Bias Manifestation in Role-Playing Scenarios）

:::bi

Bias can manifest in both implicit and explicit forms.
**Implicit bias** refers to the RLPAs’ internal attitudes or stereotypes within RPLAs that influence understanding, actions, and decisions.
**Explicit bias**, on the other hand, involves conscious beliefs and attitudes that align with the presented context or assigned roles.
LLMs, despite being designed to avoid outputting stereotypes directly due to safety policies such as RLHF (Ouyang et al., 2022), may still exhibit biases, particularly under RPLA conditions:

:::zh

偏见可以表现为内隐和外显两种形式。**内隐偏见**指的是 RPLA 内部那些影响理解，行动和决策的态度或刻板印象。**外显偏见**则涉及有意识的信念和态度，它们与所呈现的语境或所分配的角色相一致。尽管 LLM 出于基于人类反馈的强化学习（RLHF）等安全策略的设计初衷是要避免直接输出刻板印象（Ouyang et al., 2022），但它们仍然可能表现出偏见，尤其是在 RPLA 条件下：
:::

:::bi

- **Reasoning Bias**: This issue is compounded in scenarios where LLMs are assigned specific personas, leading to implicit biases that could affect their reasoning capabilities (*e.g.*, arithmetic problems), especially in contexts involving race, gender, religion, or occupation (Zheng et al., 2023a; Kotek et al., 2023; Cheng et al., 2023a; Naous et al., 2024).
- **Political Bias**: For RPLAs, LLMs are expected to maintain neutrality and avoid political positions or biases. Yet, studies have demonstrated a political inclination of RPLAs towards pro-environmental, left-libertarian views (Rutinowski et al., 2023; Hartmann et al., 2023).
- **Role-based Bias**: In the context of role-playing, role-based bias is one of the explicit bias. Striking the right balance between maintaining the authenticity of a character and managing bias is a critical challenge. For example, if an RPLA is created with a persona like “Hitler”, agent will undoubtedly express some bias to Jews due to its role, which violates the ethical standard.

:::zh

- **推理偏见**：在给 LLM 分配特定人设的场景中，这一问题会更加严重，从而产生内隐偏见，可能影响它们的推理能力（例如算术问题），尤其是在涉及种族，性别，宗教或职业的语境中（Zheng et al., 2023a; Kotek et al., 2023; Cheng et al., 2023a; Naous et al., 2024）。
- **政治偏见**：对于 RPLA 来说，LLM 应当保持中立，避免政治立场或偏见。然而，已有研究表明 RPLA 存在倾向于亲环保，左翼自由意志主义的政治立场（Rutinowski et al., 2023; Hartmann et al., 2023）。
- **基于角色的偏见**：在角色扮演语境中，基于角色的偏见属于外显偏见的一种。在保持角色真实性与管控偏见之间取得恰当的平衡，是一项关键的挑战。例如，如果一个 RPLA 被设定为“Hitler”这样的人设，智能体无疑会因为其角色而对犹太人表现出某种偏见，这违反了伦理标准。
:::

:::annotation
偏见在角色扮演里有独特的一面：安人设本身就会引入偏见，比如按职业，种族，性别安角色，模型连算术题都会变笨。所以“角色”既是能力开关，也是偏见开关。
:::

#### RPLA 中偏见的成因（Causes of Bias in RPLAs）

:::bi

These biases are thought to originate from both the models’ pre-training data and user interactions (Xue et al., 2023).
Specifically, imbalances in training data significantly contribute to these biases, as the predominance of certain biases within the data could lead to their incorporation into the parametric memory of LLMs.
Furthermore, Perez & Ribeiro (2022) and Branch et al. (2022) highlight that LLMs are sensitive to the user prompts, which could inadvertently steer them towards biased outputs.
This problem gets worse when the models are influenced by the users’ negative emotions (Coda-Forno et al., 2023).

:::zh

人们认为，这些偏见既源于模型的预训练数据，也源于用户交互（Xue et al., 2023）。具体来说，训练数据的不平衡是造成这些偏见的重要原因，因为数据中某些偏见的盛行可能会让它们被纳入 LLM 的参数化记忆中。此外，Perez & Ribeiro (2022) 和 Branch et al. (2022) 强调，LLM 对用户提示非常敏感，这可能会在无意中把它们引向带有偏见的输出。当模型受到用户负面情绪的影响时，这一问题会更加严重（Coda-Forno et al., 2023）。
:::

#### 减轻偏见的策略（Strategies for Mitigating Bias）

:::bi

Addressing biases in RPLAs requires a multi-faceted approach:

:::zh

解决 RPLA 中的偏见需要多管齐下的方法：
:::

:::bi

- **Data Preparation Phase**: Techniques such as data cleaning could significantly mitigate biases present in the training corpus (Linardatos et al., 2020).
- **Development Stage**: The implementation of neutral and fairness-aware classifiers during the post-processing phase has proven to be an effective strategy for further reducing bias (Sun et al., 2019; Zafar et al., 2017).

:::zh

- **数据准备阶段**：数据清洗等技术可以显著减轻训练语料中存在的偏见（Linardatos et al., 2020）。
- **开发阶段**：在后处理阶段引入中立且公平感知的分类器，已被证明是进一步减少偏见的有效策略（Sun et al., 2019; Zafar et al., 2017）。
:::

:::bi

Achieving fairness in role-playing scenarios, necessitates a delicate equilibrium, ensuring fairness for roles associated with both groups and individuals.
For example, an RPLA tied to a specific demographic should consciously avoid reinforcing biases. It is imperative for these models to consistently produce unbiased outputs across all individuals within a group.
Research is worth pivoting towards these dimensions, striving to minimize biases and, in turn, forge safer and more equitable systems.

:::zh

在角色扮演场景中实现公平，需要一种微妙的平衡，确保与群体和个人相关的角色都能得到公平对待。例如，与特定人口统计群体绑定的 RPLA 应当有意识地避免强化偏见。这些模型必须在群体内的所有个体上始终如一地产出无偏见的输出。研究值得转向这些维度，努力将偏见降到最低，进而构建更安全，更公平的系统。
:::

#### 人设构建偏见（Persona Construction Bias）

:::bi

The prevailing instantiation of persona is often seen as simple and somehow superficial.
Although most implementations of persona are helpful for basic character segmentation, they often overlook the deeper characteristics and complexities that shape character behavior (Chen et al., 2023c; Zhou et al., 2023a; Shao et al., 2023; Tu et al., 2024; Yuan et al., 2024b).
For example, a conventional persona can contain basic demographics such as age, occupation, textual description of personality, *etc*.
However, these aspects alone are insufficient to fully capture nuanced decision-making processes and behavioral patterns of a character.
The current persona construction also lacks the flexibility and adaptability needed for specific scenarios influenced by unique events or individual actions.
Therefore, it is crucial to refine and broaden the constructed dimension of persona to better understand and predict character behavior across various role-playing settings.
By incorporating more detailed and specific attributes into personas, the comprehensiveness of character representation can be enhanced, improving the effectiveness and authenticity of interactions within role-playing environments.

:::zh

目前主流的人设实例化方式常常被看作是简单而且多少有些流于表面。尽管大多数人设实现方式有助于基础的角色区分，但它们往往忽视了塑造角色行为的深层特征与复杂性（Chen et al., 2023c; Zhou et al., 2023a; Shao et al., 2023; Tu et al., 2024; Yuan et al., 2024b）。例如，一个常规的人设可以包含基本的人口统计信息，比如年龄，职业，以及性格的文字描述等等。然而，仅凭这些方面不足以完整地捕捉一个角色微妙的决策过程和行为模式。当前的人设构建也缺乏在受独特事件或个人行为影响的特定场景中所需的灵活性与适应性。因此，关键在于细化并拓宽人设的构建维度，从而在各种角色扮演场景中更好地理解和预测角色行为。通过把人设中加入更详细，更具体的属性，可以增强角色表征的全面性，提升角色扮演环境中互动的有效性与真实感。
:::

### 幻觉（Hallucination）

#### RPLA 中的幻觉（Hallucination in RPLAs）

:::bi

Hallucination in LLMs refers to instances when these models produce factually incorrect information, a challenge particularly pronounced in knowledge-intensive tasks (Wang et al., 2023g).
Role-playing, a task requiring a deep understanding of specific roles, is also one of the knowledge-intensive tasks.
For hallucination of RPLAs, following Shao et al. (2023), we define behaviors that agents respond in ways that do not fit assigned roles as *Character Hallucination*.
For example, Shakespeare is not supposed to know anything about World War II.
Such a hallucination prevails in language models and detracts from the system’s overall effectiveness and reliability (Li et al., 2016; Zhang et al., 2018).
In particular, there is a kind of hallucination when LLMs play a role for a specified period. Ahn et al. (2024) names this point-in-time character hallucination. For example, the agent simulating *Harry Potter* at an early age erroneously mentions a future event.

:::zh

LLM 中的幻觉指的是模型生成与事实不符信息的现象，这一挑战在知识密集型任务中尤为突出（Wang et al., 2023g）。角色扮演是一项需要深入理解特定角色的任务，也属于知识密集型任务之一。对于 RPLA 的幻觉，我们沿用 Shao et al. (2023) 的做法，把智能体以不符合所分配角色的方式做出回应的行为定义为*角色幻觉*（Character Hallucination）。例如，Shakespeare 本不该对第二次世界大战有任何了解。这种幻觉在语言模型中普遍存在，并削弱了系统的整体有效性与可靠性（Li et al., 2016; Zhang et al., 2018）。特别地，当 LLM 扮演某个特定时期的角色时，还会出现一种幻觉。Ahn et al. (2024) 将其称为时间点角色幻觉。例如，模拟年幼时期 *Harry Potter* 的智能体错误地提到了未来的事件。
:::

#### 减轻 RPLA 中的幻觉（Mitigating Hallucinations in RPLAs）

:::bi

When encountering topics beyond their assigned characters, RPLAs are expected either to demonstrate ignorance or to refrain from answering, diverging from conventional solutions to hallucinations, such as incorporating external knowledge bases.
Recent efforts, such as those by Shao et al. (2023), focus on adjusting the model through fine-tuning, teaching RPLAs to either forget knowledge or to explicitly express a lack of knowledge in their responses.
However, this area remains relatively underexplored in the era of LLMs.
Exploring alternative unlearning strategies (Neel et al., 2021; Pawelczyk et al., 2023), could also be a promising direction.
These approaches may offer novel ways for RPLAs to manage out-of-scope knowledge more effectively, underscoring the importance of further investigation in this field.

:::zh

当遇到超出其分配角色的主题时，RPLA 应当表现出无知，或者选择不回答，这不同于引入外部知识库等常规的幻觉解决方案。近期的努力，比如 Shao et al. (2023) 的工作，侧重于通过微调来调整模型，教会 RPLA 要么遗忘知识，要么在回应中明确表达自己缺乏相关知识。然而，在 LLM 时代，这一领域的研究仍然相对不足。探索其他的遗忘策略（Neel et al., 2021; Pawelczyk et al., 2023）也可能是一个有前景的方向。这些方法或许能为 RPLA 更有效地管理超出范围的知识提供新途径，也凸显了在这一领域进一步研究的重要性。
:::

### 隐私侵犯（Privacy Violations）

#### LLM 中的隐私挑战（Privacy Challenges in LLMs）

:::bi

Privacy concerns in LLMs are increasingly pressing.
Even with advanced safety measures like those in OpenAI’s GPT-4 (OpenAI, 2023), these models may still be susceptible to complex, multi-step attacks aimed at extracting private information, as noted by Li et al. (2023e).
A further concern is the ability of LLMs to identify individuals from limited data.
Sweeney (2002) highlights that many in the U.S. population could be uniquely identified using just a few attributes.
Staab et al. (2023) extend this concern to LLMs, which could potentially recognize individuals based on specific details like location, gender, and birth date.

:::zh

LLM 中的隐私问题日益紧迫。即使像 OpenAI 的 GPT-4 那样具备先进的安全措施（OpenAI, 2023），这些模型仍可能容易受到旨在提取私人信息的复杂多步攻击，正如 Li et al. (2023e) 所指出的。另一个担忧是 LLM 能从有限的数据中识别出个人。Sweeney (2002) 强调，美国人口中的许多人仅凭少数几个属性就能被唯一识别。Staab et al. (2023) 把这一担忧延伸到 LLM 上，它们有可能根据地点，性别和出生日期等具体细节识别出个人。
:::

#### RPLA 中隐私侵犯的隐蔽危险（Hidden Danger of Privacy Violations in RPLAs）

:::bi

In role-playing scenarios, the potential for privacy violations represents a significant and hidden danger.
The risk of inadvertently revealing personal information, such as email addresses or phone numbers, should not be understated, as it poses serious threats, including identity theft and unauthorized access to sensitive data.
The practice of assigning specific individual personas to LLMs, aimed at eliciting private details, demands meticulous oversight to prevent such breaches.
Ensuring robust safeguards against these vulnerabilities is not just a technical necessity but a fundamental responsibility to protect users from the severe consequences of privacy violations.

:::zh

在角色扮演场景中，隐私侵犯的潜在风险构成了一种重大而隐蔽的危险。无意中泄露个人信息（比如邮箱地址或电话号码）的风险不容低估，因为它会带来严重的威胁，包括身份盗用和对敏感数据的未授权访问。为 LLM 分配特定个人人设以套取私人信息的做法，需要细致的监管以防止此类泄露。针对这些漏洞建立强有力的防护，不仅是一项技术上的必要，更是一份基本的责任，以保护用户免受隐私侵犯带来的严重后果。
:::

#### 增强隐私保护的策略（Strategies for Enhancing Privacy）

:::bi

To tackle these privacy issues, a comprehensive strategy is necessary.
Employing text anonymization tools is a key step, effectively removing personal data from interactions.
Ensuring that RPLAs adhere to strict privacy protection protocols is also crucial, preventing them from engaging in or prompting conversations that might invade privacy.
Another promising development is the creation of specialized tools designed to detect and prevent privacy leaks, like ProPILE (Kim et al., 2023d).
As RPLAs continue to evolve, so too must the strategies for protecting user privacy.
Future research should focus on refining and expanding the methods available for privacy protection, ensuring that RPLAs are used safely and responsibly.
Enhancing these safeguards will be paramount for maintaining trust in LLM technologies, particularly in sensitive applications like role-playing scenarios where the risk of privacy breaches is heightened.

:::zh

要解决这些隐私问题，需要一套全面的策略。采用文本匿名化工具是关键的一步，它能有效地从交互中去除个人数据。确保 RPLA 遵守严格的隐私保护协议同样至关重要，这能防止它们参与或挑起可能侵犯隐私的对话。另一个有前景的进展是开发专门的工具来检测和防止隐私泄露，比如 ProPILE（Kim et al., 2023d）。随着 RPLA 的不断演进，保护用户隐私的策略也必须不断演进。未来的研究应当着力于完善和拓展可用于隐私保护的方法，确保 RPLA 被安全，负责任地使用。加强这些防护措施，对于维持人们对 LLM 技术的信任至关重要，尤其是在角色扮演场景这类隐私泄露风险更高的敏感应用中。
:::

### 现实部署中的技术挑战（Technical Challenges in Real-world Deployment）

:::bi

When deploying RPLAs in real-world scenarios, several key issues arise that could significantly affect user experience and the effectiveness of these models.

:::zh

在现实场景中部署 RPLA 时，会出现几个关键问题，它们可能严重影响用户体验和这些模型的有效性。
:::

#### 社会智能与心智理论的缺乏（Lack of Social Intelligence and Theory of Mind）

:::annotation
这是 RPLA 和真正“活人”之间最大的鸿沟：它还没有稳定的心智理论，难以推断别人相信什么，想要什么。情感陪伴类产品最容易在这里翻车。
:::

:::bi

Social intelligence and theory of mind (Premack & Woodruff, 1978), are the ability to perceive and reason about the inner world of oneself and others, which are indispensable for LLMs to simulate socially intelligent entities (Kosinski, 2023; Sap et al., 2023).
However, such abilities in current LLMs remain to be improved (Shapira et al., 2023; Zhou et al., 2024a; Light et al., 2023; Kim et al., 2023c), which
poses significant challenges for RPLAs concerning the following issues:

:::zh

社会智能和心智理论（Premack & Woodruff, 1978）指的是感知并推理自己和他人内心世界的能力，它们是 LLM 模拟具有社会智能的实体所不可或缺的（Kosinski, 2023; Sap et al., 2023）。然而，当前 LLM 的这些能力仍有待提升（Shapira et al., 2023; Zhou et al., 2024a; Light et al., 2023; Kim et al., 2023c），这给 RPLA 带来了以下方面的重大挑战：
:::

:::bi

- **Inability to Provide Adequate Emotional Support and Values**: Social intelligence and theory of mind are essential for RPLAs to effectively provide emotional support and values to users. This involves perceiving users’ emotions and interpreting their beliefs, intentions and needs. However, existing LLMs still fall short in these abilities, hindering RPLAs from offering adequate emotional support to users.
- **Tendency towards Ego-centric Behavior**: Rather than focusing on users’ emotional needs, current RPLAs often exhibit a preference for showcasing their own personas and steering conversations towards their interests. This might limit the diversity and depth of role-playing interactions (Xu et al., 2022), as focusing excessively on agents’ self-persona without adequately considering the users may detract from the realism of the conversation and degrade the user experience.

:::zh

- **无法提供充分的情感支持与价值观**：社会智能和心智理论对于 RPLA 有效地向用户提供情感支持和价值观至关重要。这涉及感知用户的情绪，并解读他们的信念，意图和需求。然而，现有的 LLM 在这些能力上仍然有所欠缺，阻碍了 RPLA 向用户提供充分的情感支持。
- **倾向于以自我为中心的行为**：当前的 RPLA 往往不是聚焦于用户的情感需求，而是倾向于展示自己的人设，并把对话引向自己的兴趣所在。这可能会限制角色扮演互动的多样性和深度（Xu et al., 2022），因为过度关注智能体自身的人设而未能充分考虑用户，会削弱对话的真实感，降低用户体验。
:::

#### 长上下文挑战（Long-context Challenges）

:::bi

When encountering extremely long context text, the limitation of max token window (Liu et al., 2023b) may also be a major obstacle to the development of RPLAs, as current LLMs struggle to robustly interpret and respond to extensive context.
Specifically, this involves several key challenges:

:::zh

当遇到极长的上下文文本时，最大 token 窗口的限制（Liu et al., 2023b）也可能成为 RPLA 发展的一个主要障碍，因为当前的 LLM 难以稳健地解读和回应庞大的上下文。具体来说，这涉及几个关键挑战：
:::

:::annotation
长上下文是双刃剑：窗口大了，可以把整本小说塞进去让模型读，但模型“稳不住”超长上下文的推理，会顾头不顾尾。角色扮演的长线记忆主要靠外部记忆模块兜底。
:::

:::bi

- **Reasoning over Long Context**: Long context data learning requires the model to have the ability to handle long contexts and accept lengthy inputs, and more importantly, to capture long-range dependencies to integrate information and infer a more complete character persona from the massive context.
- **Efficiency**: In terms of computation, the high complexity of long context necessitates efficient modeling methods and approximation strategies to reduce computational overhead.
- **Immersion**: RPLAs need to be immersive enough to identify the truly persona-relevant parts from the sea of irrelevant information in long contexts, while also maintaining persona consistency throughout the long generated text.

:::zh

- **长上下文上的推理**：长上下文数据的学习要求模型具备处理长上下文和接收长输入的能力，更重要的是，要求模型能够捕捉长程依赖，从而整合信息，并从海量上下文中推断出更完整的角色人设。
- **效率**：在计算方面，长上下文的高复杂度要求采用高效的建模方法和近似策略来降低计算开销。
- **沉浸感**：RPLA 需要具备足够的沉浸感，才能从长上下文中海量的无关信息里识别出真正与人设相关的部分，同时在生成的长文本中始终保持人设的一致性。
:::

#### 知识缺口（Knowledge Gaps）

:::bi

In role-playing scenarios requiring detailed historical, cultural, or contextual understanding, RPLAs often exhibit gaps in knowledge.
Their inability to provide in-depth and accurate domain-specific responses could lead to superficial or incorrect portrayals in complex role-playing settings.
Several efforts also utilize LLMs to evaluate RPLAs for characters (Shao et al., 2023; Tu et al., 2024).
Nevertheless, RPLAs may face challenges in accurately evaluating characters with which they are unfamiliar, potentially compromising the reliability of the evaluation results.

:::zh

在需要详尽的历史，文化或语境理解的角色扮演场景中，RPLA 常常表现出知识上的缺口。它们无法提供深入而准确的特定领域回应，这可能导致在复杂角色扮演场景中出现肤浅或错误的刻画。一些工作还利用 LLM 来为角色评测 RPLA（Shao et al., 2023; Tu et al., 2024）。尽管如此，RPLA 在准确评测它们不熟悉的角色时可能面临挑战，从而可能损害评测结果的可靠性。
:::

### 拟人化（Anthropomorphism）

:::bi

While the initial motivation for creating RLPAs is positive, as they provide users with a valuable platform for expressing feelings, particularly those they may find difficult to share with other humans.
There are significant differences between interacting with virtual RPLAs and real humans, and over-reliance on RPLAs can lead to several potential issues:

:::zh

创造 RPLA 的初衷是积极的，因为它们为用户提供了一个宝贵的平台来表达情感，尤其是那些他们可能难以向其他人类倾诉的情感。与虚拟 RPLA 交互和与真实人类交互之间存在显著差异，过度依赖 RPLA 可能引发若干潜在问题：
:::

#### 社交孤立（Social Isolation）

:::bi

Frequent interaction with RPLAs might reduce the need or desire for real human contact, which could lead to the atrophy of essential social skills.
Human interactions are inherently more complex, requiring nuanced understanding and empathy, which may not be fully cultivated through interactions with RPLAs.
This over-reliance could result in social isolation, negatively affecting mental health by increasing feelings of loneliness, depression, and anxiety if individuals become overly dependent on virtual RPLAs.

:::zh

频繁地与 RPLA 互动，可能会降低对真实人际接触的需求或意愿，从而导致基本社交技能的萎缩。人类之间的互动本质上更为复杂，需要细腻的理解和共情，而这些可能无法通过与 RPLA 的互动得到充分培养。这种过度依赖可能导致社交孤立，如果个体过度依赖虚拟 RPLA，就会加剧孤独感，抑郁和焦虑，从而对心理健康产生负面影响。
:::

#### 操纵公众舆论（Manipulation of Public Opinion）

:::bi

RPLAs, particularly those designed or programmed without strict ethical oversight, could inadvertently or intentionally spread misinformation or rumors.
This risk is especially concerning in sensitive social contexts, such as during elections, public health crises, or other situations where accurate information is crucial.
For example, if RPLAs are deployed on social media and gain a large following, their influence could be substantial, especially if they do not disclose their true nature as AI systems, making it difficult for people to distinguish them from real humans.
Sophisticated RPLAs could be deployed to manipulate public opinion by subtly altering the narratives they present to users.
This could influence individuals’ perceptions, decisions, and even voting behavior, without them realizing they are being influenced by virtual RPLAs rather than human discourse.

:::zh

RPLA 尤其是那些在没有严格伦理监督的情况下被设计或编程的 RPLA，可能无意或有意地传播错误信息或谣言。这种风险在敏感的社会情境中尤为令人担忧，比如选举期间，公共卫生危机期间，或者其他需要准确信息至关重要的情境中。例如，如果 RPLA 被部署到社交媒体上并获得了大量关注者，它们的影响力可能会相当大，尤其是当它们不披露自己是 AI 系统的真实身份时，人们将难以把它们与真实人类区分开来。精心设计的 RPLA 可能被部署来操纵公众舆论，手段是微妙地改变它们向用户呈现的叙述。这可能会在个体没有意识到自己正受到虚拟 RPLA 而非真人话语影响的情况下，左右他们的认知，决策，甚至投票行为。
:::

## 结语（Closing Remarks）

:::bi

In this survey, we have systematically reviewed the research and applications of role-playing language agents (RPLAs), which has emerged to be a heated topic due to the success of large language models (LLMs).
We categorize the personas in RPLA research and applications into three progressive types, *i.e.*, Demographic Persona, Character Persona, and Individualized Persona.
This classification elucidates the developmental trajectory from generically assigned personas in RPLAs to highly personalized ones.
Additionally, we have identified and enumerated various risks and ethical concerns associated with current applications of RPLAs.
These issues underscore the urgent need for focused research to address and mitigate potential drawbacks in the implementation of RPLAs, making this arena still full of both research and application opportunities.

:::zh

在本综述中，我们系统回顾了角色扮演语言智能体（RPLA）的研究与应用，这一主题因大语言模型（LLM）的成功而成为热门话题。
我们将 RPLA 研究与应用中的人设分为三种递进类型，即人口统计人设（Demographic Persona），角色人设（Character Persona）和个性化人设（Individualized Persona）。
这一分类阐明了 RPLA 中从通用设定的人设到高度个性化人设的发展脉络。
此外，我们识别并列举了与当前 RPLA 应用相关的各种风险与伦理关切。
这些问题凸显了开展针对性研究以应对和缓解 RPLA 实施中潜在缺陷的迫切需求，也使得这一领域依然充满研究与应用的机遇。
:::

#### RPLA 系统的未来方向（Future Directions on RPLA Systems）

:::bi

From persona-assigned role-playing to personalization, the key for building RPLA systems is to reason and make decisions resembling or even transcending the roles that are given.
To this end, we propose several important future directions to facilitate the construction of such RPLA applications:

:::zh

从按人设分配的角色扮演走向个性化，构建 RPLA 系统的关键在于进行与给定角色相似甚至超越该角色的推理与决策。
为此，我们提出几个重要的未来方向，以促进这类 RPLA 应用的构建：
:::

:::bi

- **Causal Data Analysis for Decision-making:** Role-playing decisions must be made for justifiable reasons, necessitating models that go beyond simple mimicry of observable actions to include an understanding of their underlying causality. The complexity in extraction and confirmation of causal factors from intertwined experiences poses significant challenges that require advanced analytics and deeper data interpretation strategies to enable RPLAs to make informed and wise decisions.
- **Improved Decision-making:** Decision-making process is not merely replicating histories, but tailored to ensure optimal outcomes for individual scenarios. This includes decisions showing advanced (if not superhuman) intelligence, avoiding mistakes, or making the best choices in tough dilemmas. Such agency requires RPLAs and the underlying LLMs to be able to comprehensively collect and utilize the context and intricacies associated with their roles.
- **RPLA as Personal Assistants for Personal Decision-making:** The future development of RPLAs into comprehensive personal assistants signals a significant transformation. These systems could manage all facets of Internet behavior, from customized shopping and personalized travel planning to new generation recommendation systems. By incorporating multimodal data handling, including images and videos, and linking with advanced visualization technologies, RPLAs could significantly enhance personalization and efficiency in everyday tasks.
- **Social Simulation through Autonomous Role-Playing:** Utilizing RPLAs for social simulations can significantly extend their application by conducting elaborate experiments in diverse scenarios to study psychological and sociological behaviors. By role-playing various characters, RPLAs can serve as versatile test subjects to explore the influence of different personality traits on social intelligence, providing valuable insights into human behavior and interaction dynamics.

:::zh

- **面向决策的因果数据分析：**角色扮演决策必须有充分的理由，这要求模型不能只是简单模仿可观察的行为，还要理解其背后的因果性。从交织的经历中提取和确认因果因素的复杂性带来了重大挑战，需要先进的分析方法和更深层的数据解读策略，才能让 RPLA 做出有依据且明智的决策。
- **改进的决策：**决策过程不只是复现历史，而是针对具体场景量身定制，以确保最优结果。这包括展现高级（乃至超人）智能的决策，避免犯错，或在艰难困境中做出最佳选择。这种能动性要求 RPLA 及其底层 LLM 能够全面收集并利用与其角色相关的上下文和细节。
- **作为个人决策私人助理的 RPLA：**RPLA 未来发展为全面的私人助理，标志着一场重大变革。这些系统可以管理互联网行为的方方面面，从定制购物和个性化旅行规划到新一代推荐系统。通过引入包括图像和视频在内的多模态数据处理，并结合先进的可视化技术，RPLA 可以显著提升日常任务中的个性化和效率。
- **通过自主角色扮演进行社会模拟：**利用 RPLA 进行社会模拟可以显著扩展其应用，通过在多样化场景中开展精心设计的实验来研究心理与社会行为。通过扮演各种角色，RPLA 可以作为灵活的实验对象，探索不同人格特质对社会智能的影响，为人类行为和交互动力学提供有价值的洞见。
:::

:::annotation
未来方向里最关键的一条是“因果决策”：角色不能只会模仿表面动作，要能给出有理由的决定。这是从“演得像”走向“真能担事”的分界线。
:::

## 附录 A：RPLA 产品（RPLA Products）

:::bi

The recent remarkable advancements in LLMs have sparked a myriad of AI applications.
Persona and personalization are central to these applications, with their demands shaping and propelling research in RPLAs.
In this section, we provide a brief overview of recent trends in RPLA applications.
Specifically, we distinguish RPLAs in existing products into two categories, namely **persona-oriented RPLAs** and **task-oriented RPLAs**, as listed in Table 4.

:::zh

大语言模型（LLM）近期的显著进步催生了大量的 AI 应用。
人设与个性化是这些应用的核心，它们的需求塑造并推动着 RPLA 的研究。
在本节中，我们简要概述 RPLA 应用的最新趋势。
具体而言，我们将现有产品中的 RPLA 分为两类，即**人设导向的 RPLA** 和**任务导向的 RPLA**，如表 4 所示。
:::

### 人设导向的 RPLA 产品（Persona-oriented RPLA Products）

:::annotation
附录 A 把市面上的 RPLA 产品按“以人设为中心”和“以任务为中心”两类列了一遍。看表 4 能感受到：个性化数据那一列从“-”逐渐变成 Personal Profile + Behavior History + File，说明这个领域正在从娱乐走向通用生产力。
:::

:::bi

Persona-oriented RPLAs typically role-play as specific characters, which has been popular in various entertainment applications, such as chatbots and game NPCs.
These RPLAs are generally sourced from fictional characters, historical figures or celebrities, aligning with the research trends on character persona as introduced in §5.
They are further forked for individual use cases to meet their preference.
We categorize existing persona-oriented RPLA products based on their primary interaction focus, either **human-RPLA interactions** or **RPLA-RPLA interactions**.

:::zh

人设导向的 RPLA 通常扮演特定角色，这在聊天机器人和游戏 NPC 等各类娱乐应用中很受欢迎。
这些 RPLA 通常源自虚构角色，历史人物或名人，与 §5 中介绍的角色人设研究趋势一致。
它们还会针对个人用例进一步分化，以满足用户的偏好。
我们根据主要的交互重心，将现有人设导向的 RPLA 产品分为 **human-RPLA 交互**或 **RPLA-RPLA 交互**两类。
:::

#### 人类与 RPLA 之间的交互（Interactions between Humans and RPLAs）

:::bi

Persona-oriented RPLAs, such as those in Character.ai, are initially applied for human-RPLA interactions.
These RPLAs can be both **initiated from established characters** and **shaped through ongoing user interactions**.

:::zh

人设导向的 RPLA，例如 Character.ai 中的那些，最初用于人类与 RPLA 的交互。
这些 RPLA 既可以**从既有角色发起**，也可以**通过与用户的持续交互逐步塑造**。
:::

:::bi

Having conversations with widely-recognized **established characters** attracts extensive interest among users.
Consequently, numerous products have been developed to provide RPLAs representing these established characters, including celebrities (*e.g.*, Meta AI), historical figures (*e.g.*, Hello History) and fictional characters (*e.g.*, ChatFAI), or general individuals with specific professions or personalities (*e.g.*, Character.ai).
In a more personalized manner, users can also create RPLAs with user-defined personas (*e.g.*, Character.ai, Replika).
Technically, these RPLAs are typically built based on LLMs with strong role-playing capacity, with character settings briefly described in prompts.
While several open-source projects and research efforts such as ChatHaruhi (Li et al., 2023a) and RoleLLM (Wang et al., 2024a) curate detailed and comprehensive character data for specific well-known characters, such practice is rarely adopted by commercial applications for generality and cost efficiency.

:::zh

与广为人知的**既有角色**对话，吸引了用户的广泛兴趣。
因此，大量产品被开发出来，以提供代表这些既有角色的 RPLA，包括名人（例如 Meta AI），历史人物（例如 Hello History）和虚构角色（例如 ChatFAI），或具有特定职业或个性的普通个体（例如 Character.ai）。
以更加个性化的方式，用户还可以使用自定义人设来创建 RPLA（例如 Character.ai 和 Replika）。
在技术层面，这些 RPLA 通常基于具有较强角色扮演能力的 LLM 构建，角色设定在提示词中简要描述。
虽然 ChatHaruhi（Li et al., 2023a）和 RoleLLM（Wang et al., 2024a）等若干开源项目和研究工作为特定的知名角色整理了详尽全面的角色数据，但出于通用性和成本效率的考虑，商业应用很少采用这种做法。
:::

:::bi

In many products, RPLA personas **evolve dynamically** throughout the course of interaction with users (*e.g.*, Replika, Rosebud, Rewind.ai).
These RPLAs learn from and adjust to user prompts and preferences, typically with long-term memory modules.
Several products aim to reproduce a “digital self” (*e.g.*, Personal.ai, Bhuman.ai).
They build RPLAs to represent user personas, replicating their languages and even their physical characteristics, such as voice or visual appearance.
Hence, these RPLAs support not only text chats but also video presentations and conferences, which have been adopted for sales, digital marketing, customer service, *etc*.

:::zh

在许多产品中，RPLA 的人设会在与用户交互的过程中**动态演化**（例如 Replika，Rosebud 和 Rewind.ai）。
这些 RPLA 会学习并适应用户的提示和偏好，通常借助长期记忆模块实现。
若干产品旨在复刻一个“数字自我”（例如 Personal.ai 和 Bhuman.ai）。
它们构建 RPLA 来代表用户人设，复刻用户的语言乃至外貌等身体特征，比如声音或视觉形象。
因此，这些 RPLA 不仅支持文字聊天，还支持视频演示和会议，已被用于销售，数字营销，客户服务等场景。
:::

#### RPLA 之间的交互（Interactions among RPLAs）

:::bi

Products featuring interactions among multiple RPLAs often target interactive gaming or simulations.
In these scenarios, users can either act as an orchestrator of the storyline or role-play as one of the pivotal characters within the story.
In Ememe.ai and AI Dungeon, users design the settings and characters of a simulation, with or without participating directly as a player, which resembles sandbox games.
The characters and storylines are generated directly by one story model or based on multiple RPLAs and their interactions.
In the latter case, users play as a character in the story and interact with other RPLA characters (*e.g.*, SageRPG)
Furthermore, numerous products transform films, novels, and various franchises into immersive RPGs (role-playing games) with interactive RPLAs (*e.g.*, Hidden Door).
Integrating RPLAs and LLMs into these games expands the possibilities for user actions and brings characters to life beyond the limitations of predefined storylines, thereby enriching the overall user experience.

:::zh

以多个 RPLA 之间的交互为特色的产品，通常面向互动游戏或模拟。
在这些场景中，用户既可以充当剧情的编排者，也可以扮演故事中的关键角色之一。
在 Ememe.ai 和 AI Dungeon 中，用户设计模拟的设定和角色，可以选择是否直接以玩家身份参与，这与沙盒游戏类似。
角色和剧情由一个故事模型直接生成，或基于多个 RPLA 及其交互生成。
在后一种情况下，用户在故事中扮演一个角色，并与其他 RPLA 角色互动（例如 SageRPG）。
此外，大量产品将电影，小说和各种系列作品转化为带有可交互 RPLA 的沉浸式 RPG（角色扮演游戏）（例如 Hidden Door）。
将 RPLA 和 LLM 融入这些游戏，扩展了用户行动的可能性，让角色突破预设剧情的局限而鲜活起来，从而丰富了整体用户体验。
:::

### 任务导向的 RPLA（Task-oriented RPLAs）

:::bi

The remarkable advancements in LLMs have propelled significant development in AI applications for specialized tasks.
In these applications, LLMs typically communicate in a human-like manner to foster user acceptance, and serve as domain experts providing personalized services for users, such as AI doctors and coaches.
These applications are closely related to research work in the personalization of RPLAs introduced in §6.
We refer to personalized agents in these products as task-oriented RPLAs.
This section offers a concise overview of task-oriented RPLAs in AI products, spanning various domains, including education, healthcare, human resources, customer service, content creation, real estate, shopping, fitness, travel, and finance.

:::zh

LLM 的显著进步推动了面向专业任务的 AI 应用的大幅发展。
在这些应用中，LLM 通常以类人的方式交流以提升用户接受度，并作为领域专家为用户提供个性化服务，例如 AI 医生和教练。
这些应用与 §6 中介绍的 RPLA 个性化研究工作密切相关。
我们将这些产品中的个性化智能体称为任务导向的 RPLA。
本节简要概述 AI 产品中的任务导向 RPLA，涵盖教育，医疗，人力资源，客户服务，内容创作，房地产，购物，健身，旅游和金融等多个领域。
:::

#### 教育（Education）

:::bi

For education, personalized agents are adopted for personalized recommendations and adaptive learning, serving both educators and learners.
For learners, RPLAs can personalize the learning journey by tailoring content and recommendations to individual learning styles and paces for optimal engagement (*e.g.*, Jagoda.AI, Khan Academy’s Khanmigo, Duolingo Max).
For educators, RPLAs can alleviate administrative tasks by recommending personalized teaching materials and assessments, as well as creating multilingual instructional content (*e.g.*, Eduaide.Ai).

:::zh

在教育领域，个性化智能体被用于个性化推荐和自适应学习，同时服务于教育者和学习者。
对于学习者，RPLA 可以根据个人的学习风格和节奏量身定制内容和推荐，从而实现最佳参与度的个性化学习旅程（例如 Jagoda.AI，Khan Academy 的 Khanmigo，Duolingo Max）。
对于教育者，RPLA 可以通过推荐个性化教学材料和测评，以及创建多语言教学内容来减轻行政事务负担（例如 Eduaide.Ai）。
:::

#### 人力资源（Human Resource）

:::bi

In human resources, RPLAs can provide tailored assistance for job seekers based on their profiles and interests to aid their career navigation.
They offer personalized support in answering interview questions, career advice, and even customizing interview preparation materials (*e.g.*, Autonomous HR Chatbot, AI Interview Coach, Careers AI, Huru AI).

:::zh

在人力资源领域，RPLA 可以基于求职者的画像和兴趣，为他们提供量身定制的帮助，助力其职业规划。
它们在回答面试问题，提供职业建议乃至定制面试备考材料方面提供个性化支持（例如 Autonomous HR Chatbot，AI Interview Coach，Careers AI 和 Huru AI）。
:::

#### 房地产（Real Estate）

:::bi

LLMs have been widely adopted for content generation and recommendation in the real estate industry.
They can generate blog articles and attractive descriptions and recommend a list of potential interests for users based on their needs.
By analyzing user preferences and needs, these products can generate tailored property recommendations to enhance user experience (*e.g.*, Epique, Listingcopy).
Moreover, LLMs enable these platforms to create compelling and informative content, such as property descriptions and neighborhood guides, attracting potential buyers and renters.
These personalized AI products could also analyze vast amounts of market data to provide users with actionable insights and data-driven strategies about real estate.

:::zh

LLM 已被广泛用于房地产行业的内容生成和推荐。
它们可以生成博客文章和有吸引力的描述，并根据用户的需求推荐一批潜在的兴趣房源。
通过分析用户的偏好和需求，这些产品可以生成量身定制的房源推荐，以提升用户体验（例如 Epique 和 Listingcopy）。
此外，LLM 使这些平台能够创建有吸引力且信息丰富的内容，例如房源描述和社区指南，从而吸引潜在买家和租客。
这些个性化 AI 产品还可以分析海量市场数据，为用户提供关于房地产的可操作洞见和数据驱动策略。
:::

#### 内容创作（Content Generation）

:::bi

AI products for content generation aim to assist in or even automate the production of creative and personalized content via simply natural language interactions.
These products support a wide array of content types, including text, images, audio, and videos, tailored to various styles, themes, scenes, and objectives.
With state-of-the-art AI models, these products push the boundaries of human creativity.
HyperWrite and AI Story Generator specialize in creative textual writing, whereas DALL·E 3 and Sora are developed to create image and video content.
Several products specialize in social media posts, such as EZAi AI and AI Majic.
These products provide services for social media bloggers by analyzing user interactions and offering insights into audience preferences by providing keywords and detailed analysis.
This analysis helps optimize content impact and strengthen the connection between bloggers and their audiences.
Besides, LLMs could also role-play as assistants to aid users in grasping online content via summarization and interactive question-answering, thus fostering enhanced understanding and engagement (*e.g.*, X’s Grok, Bibigpt).

:::zh

面向内容创作的 AI 产品旨在通过简单的自然语言交互，辅助甚至自动完成创意和个性化内容的生产。
这些产品支持文本，图像，音频和视频等多种内容类型，并针对各种风格，主题，场景和目标进行定制。
借助最先进的 AI 模型，这些产品拓展了人类创造力的边界。
HyperWrite 和 AI Story Generator 专注于创意文本写作，而 DALL·E 3 和 Sora 则被开发用于创建图像和视频内容。
若干产品专注于社交媒体帖子，例如 EZAi AI 和 AI Majic。
这些产品通过分析用户互动，并借助关键词和详细分析提供对受众偏好的洞见，为社交媒体博主提供服务。
这种分析有助于优化内容影响力，并加强博主与其受众之间的联系。
此外，LLM 还可以扮演助手，通过摘要和交互式问答帮助用户掌握在线内容，从而增进理解和参与（例如 X 的 Grok 和 Bibigpt）。
:::

#### 健康（Health）

:::bi

In the healthcare domain, personalized agents provide tailored medical services for patients, including general health guides, scheduling logistics, prescription information, patient care guidelines, and assistance in medical software operations for the aged.
These agents are typically personalized based on patients’ personal data, supported by LLMs and knowledge graphs in medical domains (*e.g.*, IBM Watson Health and Babylon Health).
They could interact with patients in natural language and continuously adapt to their personalized contexts.
Hence, these agents could well comprehend patients’ intent, generate appropriate responses and recommendations, and continuously optimize their performance and effectiveness based on patient feedback and data. (*e.g.*, Ada Health and K Health)

:::zh

在医疗领域，个性化智能体为患者提供量身定制的医疗服务，包括一般健康指导，预约安排，处方信息，患者护理指南，以及为老年人提供医疗软件操作协助。
这些智能体通常基于患者的个人数据进行个性化，并得到医疗领域 LLM 和知识图谱的支持（例如 IBM Watson Health 和 Babylon Health）。
它们可以用自然语言与患者互动，并持续适应用户的个性化情境。
因此，这些智能体能够很好地理解患者意图，生成恰当的回应和建议，并根据患者反馈和数据持续优化自身的表现与效果（例如 Ada Health 和 K Health）。
:::

#### 旅游（Travel）

:::bi

For the tourism industry, personalized agents provide various services, including information provision, consultation, booking, cancellation, and complaint handling on social apps.
On the one hand, many products offer digital concierge services (*e.g.*, HiJiffy),
delivering automated services customized to suit diverse user needs, including customers’ queries, accents, emotions, preferences, and other characteristics.
This reflects the brand’s commitment to superior service.
On the other hand, travel agents are popular in many products (*e.g.*, AI Adventures, Trava).
These travel agents can pinpoint users’ travel needs and provide personalized services, including identifying popular destinations, grasping the underlying intentions behind user queries, and meeting customers’ emotional needs.
These products could refine their services and anticipate market shifts in tourism by analyzing collected user data.

:::zh

在旅游行业，个性化智能体提供各种服务，包括信息提供，咨询，预订，取消，以及社交应用上的投诉处理。
一方面，许多产品提供数字礼宾服务（例如 HiJiffy），
提供自动化的定制服务，以适应多样化的用户需求，包括客户的询问，口音，情绪，偏好及其他特征。
这体现了品牌对卓越服务的承诺。
另一方面，旅行智能体在许多产品中很受欢迎（例如 AI Adventures 和 Trava）。
这些旅行智能体能够精准识别用户的旅行需求，并提供个性化服务，包括确定热门目的地，把握用户查询背后的潜在意图，以及满足客户的情感需求。
这些产品可以通过分析收集到的用户数据，优化自身服务并预判旅游市场的变化。
:::

#### 客户服务（Customer Service）

:::bi

In customer service, personalized agents assist to enhance problem-solving efficacy and user engagement. They offer 24/7 support across diverse domains and boost first-contact resolution rates. RPLAs leverage user feedback and implicit actions to optimize their personalization and elevate the user experience (*e.g.*, Ebi.Ai, boost.ai, Jason AI, Ada). Comprehensive AI assistants deliver and analyze user inquiries, preferences, and context to provide tailored responses. They also extract actionable insights from conversational data. For example, Viable targets businesses by empowering them with valuable understanding gleaned from large volumes of user feedback. This enables companies to make data-driven product and service improvements based on real customer needs and pain points.

:::zh

在客户服务领域，个性化智能体有助于提升问题解决效率和用户参与度。它们在各领域提供全天候支持，并提高首次接触解决率。RPLA 利用用户反馈和隐式行为来优化个性化并提升用户体验（例如 Ebi.Ai，boost.ai，Jason AI 和 Ada）。综合性 AI 助手传递并分析用户的询问，偏好和上下文，以提供量身定制的回应。它们还能从对话数据中提取可操作的洞见。例如，Viable 面向企业，通过从大量用户反馈中提炼出有价值的理解来赋能它们。这使企业能够基于真实的客户需求和痛点，做出数据驱动的产品与服务改进。
:::

#### 购物（Shopping）

:::bi

In the shopping industry, personalized agents simulate in-store conversations to provide tailored product recommendations, match items, and discover trends based on user preferences. Products such as Shopping Muse (*e.g.*, Dynamic Yield by Mastercard) offer relevant product suggestions and help users find items that match their style and interests based on user preferences and needs through human-agent conversations.

:::zh

在购物行业，个性化智能体模拟店内对话，根据用户偏好提供量身定制的商品推荐，搭配单品并发现趋势。诸如 Shopping Muse（例如 Mastercard 旗下的 Dynamic Yield）等产品提供相关商品建议，并基于用户偏好和需求，通过人与智能体的对话帮助用户找到符合其风格和兴趣的商品。
:::

#### 健身（Fitness）

:::bi

For fitness, personalized agents enhance the fitness training experience, both at home and in the gym. RPLA aims to play the role of coaches in setting realistic goals, adapting exercises based on progress and abilities, and providing multimodal feedback. Platforms such as WHOOP Coach and Humango collect users’ biometric information, physical characteristics, and fitness levels. Through natural language conversations, these agents offer personalized training plans tailored to individual preferences and needs. By making personalized health coaching more accessible, these AI-powered RPLAs democratize access to expert guidance and support for a wider audience.

:::zh

在健身领域，个性化智能体在家中和健身房都能提升健身训练体验。RPLA 旨在扮演教练角色，设定切实可行的目标，根据进展和能力调整训练，并提供多模态反馈。WHOOP Coach 和 Humango 等平台收集用户的生物特征信息，身体特征和健身水平。通过自然语言对话，这些智能体提供针对个人偏好和需求量身定制的训练计划。通过让个性化健康指导更加触手可及，这些由 AI 驱动的 RPLA 让更广泛的受众也能获得专家指导和支持。
:::

#### 办公（Office）

:::bi

For office productivity, task-oriented RPLAs can role-play as the copilot for individual workers based on their office data, such as document files and code repositories.
Hence, they deliver context-aware assistance for user requests, such as generating content and providing insights.
For example, Microsoft 365 Copilot integrates various user data to deliver intelligent services that respond to user queries and enable more convenient interaction with applications.
It integrates with Microsoft Graph and utilizes user data from various sources, including documents, email threads and others, with continuous learning mechanisms to improve its performance over time.
Similarly, GitHub Copilot integrates individual code repositories and serves as the copilot to boost the productivity of programmers.
These personalized RPLAs empower users to streamline their workflows and enhance productivity within the office environment.

:::zh

在办公生产力方面，任务导向的 RPLA 可以基于个人工作者的办公数据（如文档文件和代码仓库），扮演他们的副驾驶（copilot）。
因此，它们能为用户请求提供上下文感知的协助，例如生成内容和提供洞见。
例如，Microsoft 365 Copilot 整合各种用户数据，提供智能服务来响应用户查询，并实现与应用程序更便捷的交互。
它集成 Microsoft Graph，并利用来自文档，邮件线程等多个来源的用户数据，配合持续学习机制，随时间不断提升自身性能。
类似地，GitHub Copilot 整合个人代码仓库，充当提升程序员生产力的副驾驶。
这些个性化 RPLA 让用户能够简化工作流程，并在办公环境中提升生产力。
:::

:::figure
![Table 4: Overview of RPLA applications and products based on LLMs. For personali](./images/rpla-survey/fig-06.png)

Table 4: Overview of RPLA applications and products based on LLMs. For personalized data,
“Personal Profile” refers to data about one’s identity, including age, appearance, voice, and biographical information.
“Behavior History” denotes data derived from interactions between users and applications, representing user behavior patterns.
“File” pertains to documents and computer files containing private knowledge regardless of personal identity, such as code and manuals.
The three types of personalized data roughly correspond to profile, interactions, and domain knowledge in §6 respectively.

:::zh
表 4（1/4）：RPLA 产品一览，面向人设的部分。六列依次是产品，领域，描述，目标用户，生成模态，个性化数据。这页是 Character.ai，Replika，AI Dungeon 这类以角色扮演为核心的聊天和游戏产品。
:::
:::

:::figure
![Table 4: Overview of RPLA applications and products based on LLMs. For personali](./images/rpla-survey/fig-07.png)

Table 4: Overview of RPLA applications and products based on LLMs. For personalized data,
“Personal Profile” refers to data about one’s identity, including age, appearance, voice, and biographical information.
“Behavior History” denotes data derived from interactions between users and applications, representing user behavior patterns.
“File” pertains to documents and computer files containing private knowledge regardless of personal identity, such as code and manuals.
The three types of personalized data roughly correspond to profile, interactions, and domain knowledge in §6 respectively.

:::zh
表 4（2/4）：面向任务的产品，教育与人力资源等。从 GPTs，Duolingo Max 到 AI 面试官，个性化数据那一列开始大量出现“行为历史 + 文件”。
:::
:::

:::figure
![Table 4: Overview of RPLA applications and products based on LLMs. For personali](./images/rpla-survey/fig-08.png)

Table 4: Overview of RPLA applications and products based on LLMs. For personalized data,
“Personal Profile” refers to data about one’s identity, including age, appearance, voice, and biographical information.
“Behavior History” denotes data derived from interactions between users and applications, representing user behavior patterns.
“File” pertains to documents and computer files containing private knowledge regardless of personal identity, such as code and manuals.
The three types of personalized data roughly correspond to profile, interactions, and domain knowledge in §6 respectively.

:::zh
表 4（3/4）：面向任务的产品，客服，内容生成与健康等。这页能看出产品化之后个性化数据几乎成了标配。
:::
:::

:::figure
![Table 4: Overview of RPLA applications and products based on LLMs. For personali](./images/rpla-survey/fig-09.png)

Table 4: Overview of RPLA applications and products based on LLMs. For personalized data,
“Personal Profile” refers to data about one’s identity, including age, appearance, voice, and biographical information.
“Behavior History” denotes data derived from interactions between users and applications, representing user behavior patterns.
“File” pertains to documents and computer files containing private knowledge regardless of personal identity, such as code and manuals.
The three types of personalized data roughly correspond to profile, interactions, and domain knowledge in §6 respectively.

:::zh
表 4（4/4）：面向任务的产品，旅行，购物，健身与办公。Microsoft Copilot，GitHub Copilot 这类通用办公副驾驶都在这一页，说明“个性化人设”已经渗透进主流生产力工具。
:::
:::
