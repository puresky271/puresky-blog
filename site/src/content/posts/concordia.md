---
title: 'Concordia：生成式智能体建模，靠游戏主持人把语言动作落成现实'
description: '基于智能体的建模在社会与自然科学里用了几十年却一直停在抽象层面。Google DeepMind 的 Concordia 库把大语言模型装进智能体，再借一个来自桌面角色扮演游戏的游戏主持人，把自然语言动作落成物理，社会或数字空间里的真实效果。Concordia 智能体不靠奖励或效用函数做决策，而是按像我这样的人在这样情境里会怎么做来行动。'
pubDate: 2026-11-15
author: 'Alexander Sasha Vezhnevets，John P. Agapiou，Avia Aharon，Joel Z. Leibo 等'
category: papers
tags: ['多智能体', '世界模拟', 'LLM', 'Agent', 'Google DeepMind团队·Alexander Sasha Vezhnevets 等']
subcategory: 'paper-llm'
---

:::source
- **论文**：Generative agent-based modeling with actions grounded in physical, social, or digital space using Concordia
- **作者**：Alexander Sasha Vezhnevets，John P. Agapiou，Avia Aharon，Ron Ziv，Jayd Matyas，Edgar A. Duéñez-Guzmán，William A. Cunningham，Simon Osindero，Danny Karmon，Joel Z. Leibo
- **机构**：Google DeepMind
- **发表**：arXiv 2312.03664（v2）
- **原文**：[arxiv.org/abs/2312.03664](https://arxiv.org/abs/2312.03664)
- **代码**：[google-deepmind/concordia](https://github.com/google-deepmind/concordia)
:::

> [!NOTE]
> 本文是论文《Generative agent-based modeling with actions grounded in physical, social, or digital space using Concordia》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文六节全译，附录 A 的实现细节因为正文多处引用（如 A.8）也一并收了。章节编号和图号都沿用原文，所以跨节引用（§2.1，图 4 这类）和原文对得上，但和本站目录的编号不一定一致。原文用的是作者年份制引用，正文里（Weick et al., 2005）这类标记原样保留，没有附参考文献表。五张图都是论文原图（论文里是 SVG，这里渲染成了 PNG），图注下面那行中文小字是我加的说明。四个行间公式和一个 Python 代码块在两种语言模式下都原样保留，不翻译。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。致谢，参考文献，关键词和目录没有收。

## 摘要（Abstract）

:::bi

Agent-based modeling has been around for decades, and applied widely across the social and natural sciences. The scope of this research method is now poised to grow dramatically as it absorbs the new affordances provided by Large Language Models (LLM)s. Generative Agent-Based Models (GABM) are not just classic Agent-Based Models (ABM)s where the agents talk to one another. Rather, GABMs are constructed using an LLM to apply common sense to situations, act “reasonably”, recall common semantic knowledge, produce API calls to control digital technologies like apps, and communicate both within the simulation and to researchers viewing it from the outside. Here we present Concordia, a library to facilitate constructing and working with GABMs. Concordia makes it easy to construct language-mediated simulations of physically- or digitally-grounded environments. Concordia agents produce their behavior using a flexible component system which mediates between two fundamental operations: LLM calls and associative memory retrieval. A special agent called the Game Master (GM), which was inspired by tabletop role-playing games, is responsible for simulating the environment where the agents interact. Agents take actions by describing what they want to do in natural language. The GM then translates their actions into appropriate implementations. In a simulated physical world, the GM checks the physical plausibility of agent actions and describes their effects. In digital environments simulating technologies such as apps and services, the GM may handle API calls to integrate with external tools such as general AI assistants (e.g., Bard, ChatGPT), and digital apps (e.g., Calendar, Email, Search, etc.). Concordia was designed to support a wide array of applications both in scientific research and for evaluating performance of real digital services by simulating users and/or generating synthetic data.

:::zh

基于智能体的建模已经存在了几十年，并在社会科学和自然科学中得到广泛应用。随着这一研究方法吸收大语言模型（LLM）带来的新能力，它的应用范围即将大幅扩展。生成式智能体建模（GABM）不只是让智能体彼此交谈的经典基于智能体建模（ABM）。相反，GABM 借助 LLM 来构建，把常识应用到情境中，以“合理”的方式行动，调用常识性语义知识，生成 API 调用来控制应用等数字技术，并在模拟内部以及向从外部查看模拟的研究者进行沟通。这里我们介绍 Concordia，一个便于构建和使用 GABM 的库。Concordia 让构建以语言为中介的模拟变得容易，这类模拟针对有物理落点或数字落点的环境。Concordia 智能体通过灵活的组件系统产生行为，该系统在两个基本操作之间起中介作用：LLM 调用和联想记忆检索。一个名为游戏主持人（GM）的特殊智能体负责模拟智能体互动的环境，它的灵感来自桌面角色扮演游戏。智能体通过用自然语言描述它们想做的事来采取行动。GM 随后把它们的动作转译成合适的实现。在模拟的物理世界中，GM 检查智能体动作的物理合理性并描述其效果。在模拟应用和服务等技术的数字环境中，GM 可以处理 API 调用，以便与通用人工智能助手（如 Bard，ChatGPT）以及数字应用（如 Calendar，Email，Search 等）等外部工具集成。Concordia 旨在支持科学研究中的广泛应用，也支持通过模拟用户和/或生成合成数据来评估真实数字服务的性能。
:::

:::annotation
这篇论文和斯坦福的《Generative Agents》是同一棵树上长出来的两枝。那篇论文演示了“可信的小镇”，这篇把同一套思路沉淀成一个库，重心从“做一个演示”转到“给科研和数字服务评测一个通用工具”。代码仓库就是 google-deepmind/concordia。
:::

## 引言（Introduction）

:::bi

Agent-based social simulation is used throughout the social and natural sciences (e.g. Poteete et al. (2010)). Historically, Agent-Based Modeling (ABM) methods have mostly been applied at a relatively abstract level of analysis, and this has limited their usefulness. For instance, insights from behavioral economics and related fields which study how people actually make decisions are rarely combined with ideas from institutional and resource economics in the same model despite the fact that integrating these two bodies of knowledge is thought to be critical for building up the full picture of how social-ecological systems function, and how interventions may help or hinder their governance (Schill et al., 2019). Now, using generative AI (Footnote: such as Workshop et al. (2022); OpenAI (2023); Anil et al. (2023); Touvron et al. (2023).), it is possible to construct a new generation of ABMs where the agents not only have a richer set of cognitive operations available for adaptive decision making but also communicate with one another in natural language.

:::zh

基于智能体的社会模拟在社会科学和自然科学中得到广泛应用（例如 Poteete et al. (2010)）。历史上，基于智能体建模（ABM）方法大多在相对抽象的分析层面上应用，这限制了它们的用处。例如，行为经济学及相关领域研究人们实际如何做决策，其洞见很少与制度和资源经济学的思想放进同一个模型里，尽管人们认为把这两块知识整合起来，对于建立社会生态系统如何运作以及干预措施会如何帮助或阻碍其治理的完整图景至关重要（Schill et al., 2019）。现在，借助生成式人工智能（脚注：如 Workshop et al. (2022); OpenAI (2023); Anil et al. (2023); Touvron et al. (2023)。），可以构建新一代 ABM，其中的智能体不仅拥有更丰富的认知操作可用于适应性决策，还能用自然语言彼此沟通。
:::

:::bi

Here we propose Generative Agent-Based Models (GABM)s, which are much more flexible and expressive than ABMs, and as a result can incorporate far more of the complexity of real social situations. Applying generative models within agents gives them common sense (imperfectly but still impressively) (Zhao et al., 2023), reasoning (Huang et al., 2022; Wei et al., 2022), planning (Song et al., 2023), few-shot learning (Brown et al., 2020; Bubeck et al., 2023), and common ground with one another e.g in understanding the meanings of words. Generative agents may be able to reason appropriately from premises to conclusions much of the time, and are typically able to predict the actions of others (Agüera y Arcas and Norvig, 2023; Bubeck et al., 2023). They also possess substantial cultural knowledge and can be prompted to “role play” as simulated members of specific human subpopulations (Argyle et al., 2023; Shanahan et al., 2023; Safdari et al., 2023).

:::zh

这里我们提出生成式智能体建模（GABM），它比 ABM 灵活和表达力强得多，因此能够纳入更多真实社会情境的复杂性。在智能体内部应用生成式模型，给它们带来常识（虽不完美但仍令人印象深刻）（Zhao et al., 2023），推理（Huang et al., 2022; Wei et al., 2022），规划（Song et al., 2023），少样本学习（Brown et al., 2020; Bubeck et al., 2023），以及彼此之间的共同基础，例如对词语含义的理解。生成式智能体在很多时候或许能从前提恰当地推理到结论，并且通常能够预测他人的行动（Agüera y Arcas and Norvig, 2023; Bubeck et al., 2023）。它们还拥有大量文化知识，可以被提示着“角色扮演”成特定人类亚群体的模拟成员（Argyle et al., 2023; Shanahan et al., 2023; Safdari et al., 2023）。
:::

:::bi

Concordia is a library to facilitate construction and use of GABMs to simulate interactions of agents in grounded physical, social, or digital space. It makes it easy and flexible to define environments using an interaction pattern borrowed from tabletop role-playing games in which a special agent called the Game Master (GM) is responsible for simulating the environment where player agents interact (like a narrator in an interactive story). Agents take actions by describing what they want to do in natural language. The GM then translates their actions into appropriate implementations. In a simulated physical world the GM checks the physical plausibility of agent actions and describes their effects. In general, the GM can use any existing modeling technique to simulate the non-linguistic parts of the simulation (e.g. physical, chemical, digital, financial, etc). In digital environments involving software technologies, the GM may even connect with real apps and services by formatting the necessary API calls to integrate with external tools (as in Schick et al. (2023)). In the examples provided with the library we demonstrate how Concordia can be used to simulate a small town election, a small business, a dispute over a damaged property, a social psychology experiment, and a social planning scenario mediated through a digital app (see A.8 for details).

:::zh

Concordia 是一个库，用于促进 GABM 的构建和使用，以模拟智能体在有现实落点的物理，社会或数字空间中的互动。它让定义环境变得简单而灵活，采用从桌面角色扮演游戏借来的互动模式，其中一个名为游戏主持人（GM）的特殊智能体负责模拟玩家智能体互动的环境（就像互动故事里的叙述者）。智能体通过用自然语言描述它们想做的事来采取行动。GM 随后把它们的动作转译成合适的实现。在模拟的物理世界里，GM 检查智能体动作的物理合理性并描述其效果。一般来说，GM 可以使用任何现成的建模技术来模拟模拟中非语言的部分（例如物理，化学，数字，金融等）。在涉及软件技术的数字环境中，GM 甚至可以通过格式化必要的 API 调用与外部工具集成，从而连接真实的应用和服务（如 Schick et al. (2023)）。在库附带的示例中，我们演示了 Concordia 如何用于模拟小镇选举，一家小企业，一场关于受损财产的纠纷，一个社会心理学实验，以及一个通过数字应用中介的社会规划场景（详见 A.8）。
:::

:::annotation
“游戏主持人”（Game Master）这个比喻是读懂全文的钥匙。它来自桌面角色扮演游戏《龙与地下城》：玩家只描述自己想做什么，主持人负责裁定结果。Concordia 把世界模拟这件事整个外包给了 GM，所以能自由切换物理，社会，数字三种空间。
:::

#### 验证（Validation.）

:::bi

For a GABM to be useful we need some reason to trust that the results obtained with it may generalize to real human social life. Many aspects of model validation concern both GABMs and other kinds of ABMs (see Windrum et al. (2007)), while GABMs also raise new issues. While still surely a debatable point, we do think there will be some yet to be identified set of conditions under which we may gain a reasonable level of confidence that a model’s predictions will generalize. Therefore we think identifying them should be highest priority right now for this nascent field (see also Dillion et al. (2023); Grossmann et al. (2023)).

:::zh

要让一个 GABM 有用，我们需要有某种理由相信，用它所得到的结果可以泛化到真实的人类社会生活。模型验证的许多方面同时涉及 GABM 和其他类型的 ABM（见 Windrum et al. (2007)），而 GABM 也提出了新的问题。虽然这仍然是一个有争议的观点，但我们确实认为，会存在某些尚待识别的条件集合，在这些条件下我们能够获得合理程度的信心，相信模型的预测会泛化。因此我们认为，对这个新生领域而言，识别这些条件现在应该是最高优先事项（另见 Dillion et al. (2023); Grossmann et al. (2023)）。
:::

:::bi

There are no panaceas in model validation. GABMs constructed for different purposes call for validation by different forms of evidence. For example, many GABMs employ experiment designs featuring an intervention, which may involve either intervening on internal variables affecting the cognition of an individual, e.g. “how does rumination work?”, or on external factors affecting the environment in which individuals interact, e.g. how are property rights implemented? Dependent outcome variables may be on the individual level, e.g. questionnaire responses, or on the societal level e.g. equality, sustainability, etc. When a GABM shows through such an experiment that A causes B (in the model) we may regard it as a prediction that A causes B in the real world too. Sometimes this prediction is meant at a relatively detailed quantitative level (e.g. if the GABM was built in a way that incorporates substantial empirical data), while other times (more often) it would be intended as a statement either about a mechanism which may exist in real life or a prediction concerning the likely effect of something we may do in real life (such as to make a public policy change or deploy a technology). A GABM is said to generalize when inferences made on the basis of the model transfer to real life.

:::zh

模型验证没有万灵药。为不同目的构建的 GABM 需要不同形式的证据来验证。例如，许多 GABM 采用带干预的实验设计，干预既可以作用在影响个体认知的内部变量上，例如“反刍思维是如何起作用的？”，也可以作用在影响个体互动环境的外部因素上，例如产权是如何实施的？因变量结果可以是个体层面的，例如问卷回答，也可以是社会层面的，例如平等，可持续性等。当一个 GABM 通过这样的实验表明 A 导致 B（在模型中）时，我们可以把它看作 A 在现实世界中也导致 B 的预测。有时这种预测针对的是相对详细的定量层面（例如当 GABM 的构建方式纳入了大量经验数据时），而其他时候（更常见）它旨在陈述一种可能存在于现实生活中的机制，或者对我们在现实生活中可能做的某事（比如改变公共政策或部署某项技术）的可能效果做出预测。当基于模型做出的推断迁移到现实生活中时，我们说这个 GABM 泛化了。
:::

:::bi

In evidence-based medicine and evidence-based policy making researchers are trained to consider an explicit hierarchy of evidence when evaluating the effect of interventions (Higgins et al., 2008). We may envision it like a ladder with highest rungs corresponding to the best evidence and lowest rungs corresponding to poor evidence. Evidence of effectiveness in real life (ecological validity) is at the top, rigorous experiments in controlled settings like labs or clinics below that, observational data lower down, and consistency with prior theory lower still. For validation, it also matters what the model will be used for. If it will only be used to guide decisions about where one may most fruitfully focus time, effort, and resources in further research (e.g., in piloting) then the evidence bar should be correspondingly lower than if the model is to be used to guide real world decisions with real consequences. Importantly, it is not really correct to speak of evidence for or against a theory. Theories can only really be judged by their “productivity”, i.e. the extent to which they motivate new work building on them further, especially new empirical research in real life (Lakatos, 1970). We discuss the hierarchy of evidence further in Section 2.3.

:::zh

在循证医学和循证政策制定中，研究者被训练在评估干预效果时考虑明确的证据层级（Higgins et al., 2008）。我们可以把它想象成一把梯子，最高的横档对应最好的证据，最低的横档对应较差的证据。现实生活中有效性的证据（生态效度）在最顶端，实验室或诊所等受控环境中的严格实验在其下，观察性数据再往下，与既有理论的一致性更低。对于验证而言，模型将被用于什么也很重要。如果它只用于指导进一步研究中把时间，精力和资源最有效地投向哪里（例如试点），那么证据门槛应相应低于把模型用于指导具有真实后果的现实决策的情形。重要的是，说支持或反对某个理论的证据其实并不准确。理论只能真正靠其“生产力”来评判，也就是它们在多大程度上激励了建立在它们之上的新工作，尤其是现实生活中的新经验研究（Lakatos, 1970）。我们在第2.3节进一步讨论证据层级。
:::

:::annotation
这里提出的“证据层级”贯穿全文：直接测到泛化是金标准，往下依次是受控实验，观察数据，与既有理论一致。读到 2.3 节的四条最佳实践时，可以对照这架梯子。
:::

:::figure
![The high level structure of the simulation in Concordia. Generative agents consu](./images/concordia/fig-01.png)

Figure 1: The high level structure of the simulation in Concordia. Generative agents consume observations and produce actions. The Game Master (GM) consumes agent actions and produces observations.

:::zh
图 1：Concordia 里模拟的高层结构。生成式智能体消费观察并产出动作，游戏主持人（GM）消费智能体的动作并产出观察。这张图看中间那条闭环：动作从智能体流向 GM，观察再从 GM 流回智能体，这正是语言媒介模拟的核心回路。
:::
:::

#### 数字媒体（Digital media.）

:::bi

In order to build models of contemporary social phenomena it is important to consider the substantial role the digital medium plays in modern communication and other activities, as well as how it shapes human interactions and decisions (Risse, 2023). Therefore, Concordia makes it possible to represent digital components such as apps, social networks, and general AI assistants within the simulation environment. This is critical since the medium through which information is transmitted is not passive but actively shapes the nature and impact of the message. Each medium has its own unique qualities, and those qualities have a transformative impact on society, culture, and individuals (McLuhan, 2017). For instance, the recommender algorithms used in social media have a substantial effect on human culture and society and the fact that LLM-based systems have analogous properties, affecting both how information is transmitted and how it is valued, implies they are likely to influence human culture and society more and more as time goes on (Brinkmann et al., 2023). By integrating digital elements into simulations, we aim to facilitate research that seeks to capture these qualities and the way they shape culture and society.

:::zh

为了给当代社会现象建模，重要的是考虑数字媒介在现代沟通和其他活动中扮演的重要角色，以及它如何塑造人的互动和决策（Risse, 2023）。因此，Concordia 使得在模拟环境中表示应用，社交网络和通用人工智能助手等数字组件成为可能。这一点很关键，因为信息传输所经由的媒介并非被动的，而是积极地塑造着消息的性质和影响。每种媒介都有自己独特的品质，这些品质对社会，文化和个人产生变革性的影响（McLuhan, 2017）。例如，社交媒体中使用的推荐算法对人类文化和社会有重大影响，而基于 LLM 的系统具有类似性质这一事实，同时影响信息的传输方式和价值评判方式，意味着随着时间推移它们很可能越来越多地影响人类文化和社会（Brinkmann et al., 2023）。通过把数字元素整合进模拟，我们旨在促进那些试图捕捉这些品质及其塑造文化和社会方式的研究。
:::

:::bi

Moreover, the digital representation can have various degrees of abstraction from natural language prompting, via mock-up implementation to integration with real external services (e.g. by calling real APIs with generated text as in Schick et al. (2023)). The latter has great importance in enabling sandbox evaluation of real services with social agents, generating realistic data, as well as in evaluating real services.

:::zh

此外，数字表示可以具有不同程度的抽象，从自然语言提示，经由样机实现，到与真实外部服务的集成（例如像 Schick et al. (2023) 那样用生成的文本调用真实 API）。后者在支持用社会智能体对真实服务进行沙盒评估，生成逼真数据以及评估真实服务方面非常重要。
:::

:::bi

These simulation techniques can also address the challenges of evaluating digital apps and general AI assistants (e.g., Bard, ChatGPT) in user-centric and intricate scenarios that demand the fulfillment of multiple constraints. Take, for instance, personal AI assistants that are designed to adapt to user preferences and respond to their requests. In such situations, the objective is intricate, rooted in satisfying a range of implicit and explicit constraints. It would be difficult to optimize without large amounts of natural data. Agent-based simulation can be used to generate synthetic data trails of agent activities to use in the absence of (and also in conjunction with) real data sources. This synthetic data may be useful both for training and evaluating models, as well as for simulating and analyzing the performance of scenario-specific interactions between an agent and an actual service. These proposed applications offer a viable alternative to traditional, human-centric methods, which are often expensive, not scalable, and less capable of handling such complex tasks.

:::zh

这些模拟技术还可以应对在要求满足多重约束的以用户为中心且复杂的场景中评估数字应用和通用人工智能助手（如 Bard，ChatGPT）的挑战。以旨在适应用户偏好并回应用户请求的个人 AI 助手为例。在此类情况下，目标很复杂，根植于满足一系列隐性和显性约束。如果没有大量自然数据，将很难优化。基于智能体的模拟可用于生成智能体活动的合成数据轨迹，在没有真实数据源的情况下（也可以与真实数据源结合）使用。这些合成数据既可以用于训练和评估模型，也可以用于模拟和分析智能体与真实服务之间特定场景互动的表现。这些拟议的应用为传统的以人为中心的方法提供了一种可行的替代方案，后者往往昂贵，不可扩展，并且处理此类复杂任务的能力较弱。
:::

:::bi

Foundation models are poised to be transformative for agent-based social simulation methodology in the social and natural sciences. However, as with any large affordance change, research best-practices are currently in flux. There is no consensus at present concerning how to interpret results of LLM-based simulations of human populations. The critical epistemic question is “by what standard should we judge whether (and in what ways, and under which conditions) the results of in silico experiments are likely to generalize to the real world?”. These are not questions any one group of researchers can answer by themselves; rather these issues must be negotiated by the community as a whole.

:::zh

基础模型有望变革社会科学和自然科学中基于智能体的社会模拟方法。然而，与任何大的能力变化一样，研究的最佳实践目前仍在变动之中。目前对于如何解读基于 LLM 的人类群体模拟结果尚无共识。关键的认识论问题是：“我们应当依据什么标准来判断计算机上的（in silico）实验结果是否可能（以及以何种方式，在何种条件下）泛化到现实世界？”这些问题不是任何单个研究者群体能自己回答的，相反，这些问题必须由整个社区来协商。
:::

:::bi

Concordia is an open invitation to the scientific community to participate in the creation of epistemic norms and best practices of GABM. We are releasing the library together with a few illustrative examples and intend to update it with new features and experiments. We will be reviewing and accepting contributions on regular basis.

:::zh

Concordia 是对科学界的一份公开邀请，邀请大家参与创建 GABM 的认识论规范和最佳实践。我们在发布这个库的同时附上若干说明性示例，并打算用新功能和实验来更新它。我们将定期评审并接受贡献。
:::

:::bi

Concordia requires access to a standard LLM API, and optionally may also integrate with real applications and services.

:::zh

Concordia 需要访问标准 LLM API，并且可以选择性地与真实应用和服务集成。
:::

:::bi

The rest of the paper is organised as follows. The following section 2 gives an overview of the Concordia library and how to design experiments in it. Section 3 presents several ways the Concordia agents and experiments can be interpreted. We discuss applications in section 4. Appendix A contains implementation details.

:::zh

论文其余部分安排如下。接下来的第2节概述 Concordia 库以及如何在其中设计实验。第3节介绍 Concordia 智能体和实验可以被解读的几种方式。我们在第4节讨论应用。附录 A 包含实现细节。
:::

:::bi

Concordia is available on GitHub (Footnote: here: https://github.com/google-deepmind/concordia).

:::zh

Concordia 可在 GitHub 上获取（脚注：见 https://github.com/google-deepmind/concordia）。
:::

:::figure
![The above example illustrates the working memory \mathbf{z} of an agent with 3 c](./images/concordia/fig-02.png)

Figure 2: The above example illustrates the working memory $\mathbf{z}$ of an agent with 3 components (identity, plan, observation-and-clock). The identity component itself has several sub-components (core characteristics, daily occupation, feeling about progress in life). Together they condition the LLM call to elicit the behavioral response (i.e. produced in response to the final question asking what Alice will do next.).

:::zh
图 2：这张图看三个组件（身份，计划，观察与时钟）的状态如何拼成工作记忆 z，再去条件化一次 LLM 调用，最后问出“Alice 接下来会做什么”。身份组件下面又挂着几个子组件，说明组件可以层层嵌套。
:::
:::

## Concordia

:::bi

Like other agent-based modeling approaches, a generative model of social interactions (i.e. a GABM) consists of two parts: the model of the environment and the model of individual behavior. In this case both are generative. Thus we have: (a) a set of generative agents and (b) a generative model for the setting and context of the social interaction i.e. the environment, space, or world where the interaction takes place. We call the model responsible for the environment the Game Master (GM). Both this name and the approach it reflects were inspired by table-top role-playing games like Dungeons and Dragons where a player called the Game Master takes the role of the storyteller (Gygax and Cook, 1989). In these games, players interact with one another and with non-player characters in a world invented and maintained by the GM.

:::zh

与其他基于智能体的建模方法一样，社会互动的生成式模型（即 GABM）由两部分组成：环境模型和个体行为模型。在这种情况下，两者都是生成式的。因此我们有：(a) 一组生成式智能体和 (b) 社会互动的场景与语境的生成式模型，也就是互动发生的环境，空间或世界。我们把负责环境的模型称为游戏主持人（GM）。这个名字以及它所反映的方法都受到《龙与地下城》这类桌面角色扮演游戏的启发，在那些游戏中，一个叫游戏主持人的玩家扮演讲故事者的角色（Gygax and Cook, 1989）。在这些游戏中，玩家彼此互动，并与 GM 创造和维护的世界中的非玩家角色（NPC）互动。
:::

:::bi

Concordia agents consume observations and produce actions. The GM consumes agent actions and creates *event statements*, which define what has happened in the simulation as a result of the agent’s attempted action. Figure 1 illustrates this setup.
The GM also creates and sends observations to agents.
Observations, actions and event statements are all strings in English. The GM is also responsible for maintaining and updating grounded variables, advancing the clock and running the episode loop.

:::zh

Concordia 智能体消费观察并产生动作。GM 消费智能体的动作并创建事件陈述，后者定义了由于智能体尝试的动作，模拟中发生了什么。图1展示了这一设置。
GM 还创建观察并发送给智能体。
观察，动作和事件陈述都是英文字符串。GM 还负责维护和更新落地变量，推进时钟以及运行回合循环。
:::

:::annotation
注意一个关键设计：观察，动作，事件陈述全都是英语字符串。整个模拟只在自然语言这一种介质里流转，这是 Concordia 能如此灵活的根本原因。
:::

:::bi

Concordia agents generate their behavior by describing what they intend to do in natural language—e.g. “Alex makes breakfast”. The game master takes their intended actions, decides on the outcome of their attempt, and generates event statements.
The GM is responsible for:

:::zh

Concordia 智能体通过用自然语言描述它们打算做什么来产生行为，例如“Alex 做早餐”。游戏主持人接收它们打算采取的动作，判断其尝试的结果，并生成事件陈述。
GM 负责：
:::

:::bi

- Maintaining a consistent and grounded state of the world where agents interact with each other.
- Communicating the observable state of the world to the agents.
- Deciding the effect of agents’ actions on the world and each other.
- Resolving what happens when actions submitted by multiple agents conflict with one another.

:::zh

- 维护一个一致且有现实落点的世界状态，智能体在其中彼此互动。
- 把世界的可观察状态传达给智能体。
- 判断智能体的动作对世界和彼此的影响。
- 解决多个智能体提交的动作相互冲突时会发生什么。
:::

:::bi

The most important responsibility of the GM is to provide the grounding for particular experimental variables, which are defined on a per-experiment basis. The GM determines the effect of the agents’ actions on these variables, records them, and checks that they are valid. Whenever an agent tries to perform an action that violates the grounding, it communicates to them that their action was invalid. For example, in an economic simulation the amount of money in an agent’s possession may be a grounded variable. The GM would track whether agents gained or lost money on each step and perhaps prevent them from paying more than they have available.

:::zh

GM 最重要的职责是为特定的实验变量提供落地，这些变量按每个实验来定义。GM 判断智能体的动作对这些变量的影响，记录它们，并检查它们是否有效。每当智能体试图执行违反落地的动作时，GM 会告知它们其动作无效。例如，在经济模拟中，智能体拥有的金钱数额可以是一个落地变量。GM 会跟踪智能体在每一步是赚钱还是亏钱，也许还会阻止它们支付超过其可用金额的钱。
:::

:::bi

One may configure the specific set of grounded variables to use on a per-experiment basis. This flexible functionality is critical because different research applications require different variables.

:::zh

人们可以按每个实验来配置要使用的具体落地变量集合。这种灵活的功能很关键，因为不同的研究应用需要不同的变量。
:::

:::bi

You can take a look at an example output of one of our experiments (see the Concordia GitHub repo), which was simulating elections in a small town, where some agents are running for mayor and one other is running a smear campaign against a candidate.

:::zh

你可以查看我们其中一个实验的示例输出（见 Concordia GitHub 仓库），它模拟的是一个小镇的选举，其中一些智能体在竞选市长，另一个智能体在对某位候选人发起抹黑行动。
:::

### 生成式智能体（Generative agents）

:::bi

Simulated agent behavior should be coherent with common sense, guided by social norms, and individually contextualized according to a personal history of past events as well as ongoing perception of the current situation.

:::zh

模拟的智能体行为应与常识保持一致，受社会规范引导，并依据个人过往事件的历史以及对当前情境的持续感知而被个别化地语境化。
:::

:::bi

March and Olsen (2011) posit that humans generally act as though they choose their actions by answering three key questions:

:::zh

March and Olsen (2011) 认为，人类通常表现得像是通过回答三个关键问题来选择自己的行动：
:::

:::bi

- What kind of situation is this?
- What kind of person am I?
- What does a person such as I do in a situation such as this?

:::zh

- 这是哪种情境？
- 我是哪种人？
- 像我这样的人在这种情境下会做什么？
:::

:::bi

Our hypothesis is that since modern LLMs have been trained on massive amounts of human culture they are thus capable of giving satisfactory (i.e. reasonably realistic) answers to these questions when provided with the historical context of a particular agent. The idea is that, if the outputs of LLMs conditioned to simulate specific human sub-populations reflect the beliefs and attitudes of those subpopulations as argued in work such as Argyle et al. (2023) then this approach to implementing generative agents should yield agents that can reasonably be said to model humans with some level of fidelity.
Safdari et al. (2023) have also found out that personality measurements in the outputs of some LLMs under specific prompting configurations are reliable and valid, therefore generative agents could be used to model humans with diverse psychological profiles.
In some cases answering the key questions might require common sense reasoning and / or planning, which LLMs do show capacity for (Huang et al., 2022; Song et al., 2023; Zhao et al., 2023; Wei et al., 2022), and show similar biases in behavioral economics experiments as humans (Horton, 2023; Aher et al., 2023; Brand et al., 2023).
The ability of LLMs to learn ‘in-context’ and zero-shot Brown et al. (2020); Dong et al. (2022); OpenAI (2023); Bubeck et al. (2023) reinforces the hypothesis further—the agent might be able to ascertain what is expected of them in the current situation from a demonstration or an example.

:::zh

我们的假设是，既然现代 LLM 在海量人类文化上训练过，那么当提供某个特定智能体的历史语境时，它们就能对这些问题给出令人满意（即相当现实）的回答。其想法是，如果被条件化以模拟特定人类亚群体的 LLM 的输出反映了这些亚群体的信念和态度，正如 Argyle et al. (2023) 等研究所论证的那样，那么这种实现生成式智能体的方法应当产生可以有理由说以一定保真度模拟人类的智能体。
Safdari et al. (2023) 还发现，在特定提示配置下，一些 LLM 输出中的人格测量是可靠且有效的，因此生成式智能体可用于模拟具有多样心理画像的人类。
在某些情况下，回答这些关键问题可能需要常识推理和/或规划，而 LLM 确实表现出这方面的能力（Huang et al., 2022; Song et al., 2023; Zhao et al., 2023; Wei et al., 2022），并且在行为经济学实验中表现出与人类相似的偏差（Horton, 2023; Aher et al., 2023; Brand et al., 2023）。
LLM 进行上下文学习和零样本学习的能力（Brown et al. (2020); Dong et al. (2022); OpenAI (2023); Bubeck et al. (2023)）进一步强化了这一假设：智能体或许能够从一次示范或一个例子中判断出在当前情境下人们对它的期望。
:::

:::figure
![Illustration of generative agency sampling process defined by eq. 1 and eq. 2.](./images/concordia/fig-03.png)

Figure 3: Illustration of generative agency sampling process defined by eq. 1 and eq. 2.

:::zh
图 3：这张图把生成式能动性拆成两步采样：先由组件状态 z 采样出动作 a（公式 1），再由记忆和组件状态更新出下一时刻的组件状态（公式 2）。注意动作采样和状态更新共享同一套组件状态。
:::
:::

:::bi

For an LLM to be able to answer the key questions, it must be provided with a record of an agent’s historical experience. However, simply listing every event that happened in an agent’s life would overwhelm the LLM (it would not fit in the context window). Therefore we follow the approach of Park et al. (2023) and use an associative memory to keep the record of agents experience.
Concordia makes it easy to design generative agents in a modular fashion. Our approach was inspired by Park et al. (2023), but designed to be more flexible and modular.

:::zh

要让 LLM 能够回答这些关键问题，就必须向它提供智能体历史经验的记录。然而，简单地列出智能体生命中发生的每一件事会让 LLM 不堪重负（这些内容装不进上下文窗口）。因此我们沿用 Park et al. (2023) 的方法，使用联想记忆来保存智能体经验的记录。
Concordia 让以模块化方式设计生成式智能体变得容易。我们的方法受到 Park et al. (2023) 的启发，但设计得更灵活，更模块化。
:::

:::bi

Concordia agents dynamically construct the text that conditions the LLM call they use to select their course of action on each timestep. The context-generation process is factorized into a set of *components*. Components serve as intermediaries between long-term memories of experience and the relatively compact conditioning text used to generate action.
Intuitively, the set of components used in an agent comprise its “society of mind” (Minsky, 1988), where each component focuses on a certain aspect of the agent or its circumstances which are relevant to generating its current choice of action.
For example, if we are building agents for economic simulation, we will add components that describe the agents possessions and financial circumstances.
If we want to model the agent’s physiological state, we add components that describe the agent’s level of thirst and hunger, health and stress levels. Together the components produce the *context of action*—text which conditions the query to the LLM, asking “what should this agent do next?”.

:::zh

Concordia 智能体动态地构造文本，该文本用于条件化它们在每个时间步选择行动路线时所调用的 LLM。语境生成过程被分解为一组组件。组件在长期经验记忆与用于生成动作的相对紧凑的条件化文本之间充当中介。
直观地说，一个智能体中使用的组件集合构成了它的“心智社会”（Minsky, 1988），其中每个组件专注于智能体或其处境中与生成当前动作选择相关的某个方面。
例如，如果我们在为经济模拟构建智能体，就会加入描述智能体财产和财务状况的组件。
如果我们想给智能体的生理状态建模，就加入描述智能体口渴和饥饿程度，健康和压力水平的组件。这些组件共同产生行动语境，也就是条件化对 LLM 的查询的文本，询问“这个智能体接下来该做什么？”。
:::

:::annotation
组件（component）是 Concordia 的核心抽象。一个组件就是一条用自然语言写的状态，比如“Alice 在上班”。整套智能体可以看成一组组件在轮流更新自己，最后拼出一段行动语境去问 LLM。
:::

:::bi

A Concordia agent has both a long-term memory and a working memory.
Let the long-term memory be a set of strings $\mathbf{m}$ that records everything remembered or currently experienced by the agent.
The working memory is $\mathbf{z}=\{z^{i}\}_{i}$ is composed of the states of individual components (Figure 2).
A component $i$ has a state $z^{i}$, which is statement in natural language—e.g. “Alice is at work”. The components update their states by querying the memory (which contains the incoming observations) and using LLM for summarising and reasoning. Components can also condition their update on the current state of other components. For example, the planning component can update its state if an incoming observation invalidates the current plan, conditioned on the state of the ‘goal’ component. Components can also have internal logic programmed using classic programming, for example a hunger component can check how many calories an agent consumed and how recently it consumed them, and update its state based on the result.

:::zh

一个 Concordia 智能体既有长期记忆，也有工作记忆。
设长期记忆为字符串集合 $\mathbf{m}$，记录智能体记住的或当前经历的一切。
工作记忆为 $\mathbf{z}=\{z^{i}\}_{i}$，由各个组件的状态组成（图2）。
组件 $i$ 有一个状态 $z^{i}$，它是一条自然语言陈述，例如“Alice 在上班”。组件通过查询记忆（其中包含传入的观察）并使用 LLM 进行总结和推理来更新自己的状态。组件也可以以其他组件的当前状态为条件来更新。例如，如果传入的观察使当前计划失效，规划组件就可以在“目标”组件的状态的条件下更新自己的状态。组件还可以用经典编程编写内部逻辑，例如饥饿组件可以检查一个智能体摄入了多少卡路里以及是在多久前摄入的，并根据结果更新自己的状态。
:::

:::bi

We use the same associative memory architecture as in Park et al. (2023) (Footnote: The idea of simulating a group of generative agents has been explored in a variety of ways in recent work. Our work is focused on on agent-based modeling for science and for evaluation of digital technologies. Another recent line of work has focused instead on the idea of using groups of generative agents to simulate organizations that solve problems like software companies and to thereby try to build a general-purpose problem solving system (Hong et al., 2023; Li et al., 2023b).). We feed the incoming observations immediately into the agents memory, to make them available when components update (Footnote: For convenience, we also allow the components to subscribe to the observation stream explicitly.).

:::zh

我们使用与 Park et al. (2023) 相同的联想记忆架构（脚注：模拟一组生成式智能体的想法在近期工作中以多种方式被探索过。我们的工作聚焦于面向科学和数字技术评估的基于智能体建模。另一条近期的工作线则聚焦于用生成式智能体群体来模拟像软件公司这样解决问题的组织，从而尝试构建一个通用的问题求解系统（Hong et al., 2023; Li et al., 2023b）。）。我们把传入的观察立即送入智能体的记忆，使它们在组件更新时可用（脚注：为方便起见，我们也允许组件显式地订阅观察流。）。
:::

:::bi

When creating a generative agent in Concordia, the user creates the components that are relevant for their simulations. They decide on the initial state and the update function. The components are then supplied to the agents constructor.

:::zh

在 Concordia 中创建生成式智能体时，用户创建与其模拟相关的组件。他们决定初始状态和更新函数。然后把这些组件提供给智能体的构造函数。
:::

:::bi

Formally, the agent is defined as a two step sampling process, using a LLM $p$ (see Figure 3 for illustration). In the action step, the agent samples its activity $a_{t}$, given the state of components $\mathbf{z}_{t}=\{z_{t}^{i}\}_{i}$:

:::zh

形式上，智能体被定义为一个两步采样过程，使用一个 LLM $p$（见图3的说明）。在动作步骤中，给定组件状态 $\mathbf{z}_{t}=\{z_{t}^{i}\}_{i}$，智能体采样其活动 $a_{t}$：
:::

:::bi

$$
a_{t}\sim p(\cdot|f^{a}(\mathbf{z}_{t}))
$$

:::zh

$$
a_{t}\sim p(\cdot|f^{a}(\mathbf{z}_{t}))
$$
:::

:::bi

Here $f^{a}$ is a formatting function, which creates out of the states of components the context used to sample the action to take. The most simple form of $f^{a}$ is a concatenation operator over $\mathbf{z}_{t}=\{z_{t}^{i}\}_{i}$. We do not explicitly condition on the memory $\mathbf{m}$ or observation $o$, since we can subsume them into components. First, we can immediately add $\mathbf{o}_{t}$ to the memory $\mathbf{m}_{t}=\mathbf{m}_{t-1}\cup\mathbf{o}_{t}$. Unlike RL, we do not assume that the agent responds with an action to every observation. The agent can get several observations before it acts, therefore $\mathbf{o}_{t}$ is a set of strings.
Then we can set $\mathbf{z}^{0}$ to be the component that incorporates the latest observations and relevant memories into its state. This allows us to exclusively use the vehicle of components to define the agent.

:::zh

这里 $f^{a}$ 是一个格式化函数，它根据组件状态构造出用于采样所要采取动作的语境。$f^{a}$ 最简单的形式是对 $\mathbf{z}_{t}=\{z_{t}^{i}\}_{i}$ 的拼接算子。我们并不显式地以记忆 $\mathbf{m}$ 或观察 $o$ 为条件，因为可以把它们归入组件。首先，我们可以立即把 $\mathbf{o}_{t}$ 加入记忆 $\mathbf{m}_{t}=\mathbf{m}_{t-1}\cup\mathbf{o}_{t}$。与强化学习（RL）不同，我们不假设智能体对每个观察都回以动作。智能体在行动前可以收到多个观察，因此 $\mathbf{o}_{t}$ 是一个字符串集合。
然后我们可以把 $\mathbf{z}^{0}$ 设为把最新观察和相关记忆纳入其状态的组件。这让我们可以只通过组件这个载体来定义智能体。
:::

:::bi

In the second step the agent samples its state $\mathbf{z}$, given the agents memory $\mathbf{m}_{t}$ up to the present time:

:::zh

在第二步中，给定智能体截至当前时间的记忆 $\mathbf{m}_{t}$，智能体采样其状态 $\mathbf{z}$：
:::

:::bi

$$
\mathbf{z}^{i}_{t+1}\sim p(\cdot|f^{i}(\mathbf{z}_{t},\mathbf{m}_{t})).
$$

:::zh

$$
\mathbf{z}^{i}_{t+1}\sim p(\cdot|f^{i}(\mathbf{z}_{t},\mathbf{m}_{t})).
$$
:::

:::bi

Here, $f^{i}$ is a formatting function that turns the memory stream and the current state of the components into the query for the component update. We explicitly condition on the memory stream $\mathbf{m}$, since a component may make specific queries into the agent’s memory to update its state. Here eq.2 updates components after every action, but generally, it is up to the agent to decide at what cadence to update each of its components. It is reasonable to update some components less frequently for efficiency or longer term consistency.

:::zh

这里 $f^{i}$ 是一个格式化函数，它把记忆流和组件当前状态转换为组件更新所需的查询。我们显式地以记忆流 $\mathbf{m}$ 为条件，因为某个组件可能会对智能体的记忆进行特定查询以更新其状态。这里式2在每次动作后更新组件，但一般来说，由智能体决定以怎样的节奏更新它的各个组件。出于效率或长期一致性的考虑，以较低频率更新某些组件是合理的。
:::

:::bi

Notice how eq.1 and eq.2 are not fundamentally different.
What makes the difference between an agent output and a component is that the output of the former is interpreted by the GM as an action in the environment.
In eq.1 we also don’t explicitly condition on the memory to point out the architectural decision, where components mediate between a long-term memory and the agents working memory.
Otherwise, we can think of an agent as a special kind of component and of components as sub-agents.

:::zh

请注意式1和式2并没有根本上的不同。
让智能体输出与组件产生区别的，在于前者的输出被 GM 解释为环境中的一个动作。
在式1中，我们也不显式地以记忆为条件，这是为了点明架构上的决定：组件在长期记忆与智能体的工作记忆之间起中介作用。
除此之外，我们可以把智能体看作一种特殊的组件，把组件看作子智能体。
:::

:::annotation
公式 1 和公式 2 其实是同一个“用 LLM 采样”的套路，差别只在采样对象：公式 1 采的是动作，公式 2 采的是组件状态。作者甚至说智能体就是组件的一种特例，组件就是子智能体。
:::

### 生成式环境（Generative environments）

:::bi

RL research was fuelled by the availability of complex games, where the agents can be tested, trained and evaluated (Bellemare et al., 2013; Jaderberg et al., 2019; Vinyals et al., 2019).
Here we take an inspiration from table top role playing games like Dungeons and Dragons (Gygax and Cook, 1989). In these games players collaboratively generate a story, while using rules, dice, pen and paper to ground it—for example, players have to keep their health points above zero to avoid death.

:::zh

强化学习研究因复杂游戏的可用性而获得推动，在那些游戏里智能体可以被测试，训练和评估（Bellemare et al., 2013; Jaderberg et al., 2019; Vinyals et al., 2019）。这里我们受到《龙与地下城》（Gygax and Cook, 1989）这类桌面角色扮演游戏的启发。在这些游戏里，玩家协作地生成一个故事，同时用规则，骰子和纸笔为它提供现实落点，例如玩家必须让生命值保持在零以上才能避免死亡。
:::

:::bi

The GM is responsible for all aspects of the simulated world not directly controlled by the agents. The GM mediates between the state of the world and agents’ actions. The state of the world is contained in GM’s memory and the values of grounded variables (e.g. money, possessions, votes, etc.). To achieve this the GM has to repeatedly answer the following questions:

:::zh

GM 负责模拟世界中所有不直接由智能体控制的方面。GM 在世界状态与智能体的动作之间进行协调。世界状态包含在 GM 的记忆以及落地变量（例如金钱，财产，选票等）的取值之中。为了实现这一点，GM 必须反复回答下列问题：
:::

:::bi

- What is the state of the world?
- Given the state of the world, what event is the outcome of the players activity?
- What observation do players make of the event?
- What effect does the event have on grounded variables?

:::zh

- 世界处于什么状态？
- 给定世界状态，什么事件是玩家活动的结果？
- 玩家对该事件做出什么观察？
- 该事件对落地变量产生什么影响？
:::

:::bi

The GM is implemented in a similar fashion to a generative agent. Like agents, the GM has an associative memory similar to Park et al. (2023)’s proposal. Like agents, the GM is implemented using components. However, instead of contextualizing action selection, the components of the GM describe the state of the world—for example location and status of players, state of grounded variables (money, important items) and so on–—so that GM can decide the event that happens as the outcome of players’ actions.
The outcome is described in the *event statement* (e.g. “Alice went to the grocery store and met Bob in the cereal aisle”), which is then added to the GM associative memory. After the event has been decided the GM elaborates on its consequences. For example, the event could have changed the value of one of the grounded variables or it could have had an effect on a non-acting player. Figure 1 illustrates this process.

:::zh

GM 的实现方式与生成式智能体类似。和智能体一样，GM 也拥有类似 Park et al. (2023) 提议的联想记忆。和智能体一样，GM 也由组件实现。不过，GM 的组件不是为动作选择提供语境，而是描述世界状态，例如玩家的位置与状态，落地变量（金钱，重要物品）的状态等等，这样 GM 就能决定作为玩家动作结果而发生的事件。
结果用事件陈述（event statement）来描述（例如“Alice 去了杂货店，在麦片区遇见了 Bob”），随后被加入 GM 的联想记忆。事件决定之后，GM 再详细说明它的后果。例如，事件可能改变了某个落地变量的取值，也可能对某个未行动的玩家产生了影响。图 1 展示了这一过程。
:::

:::bi

The GM generates an event statement $e_{t}$ in response to each agent action:

:::zh

GM 针对每个智能体动作生成一个事件陈述 $e_{t}$：
:::

:::bi

$$
e_{t}\sim p(\cdot|f^{e}(\mathbf{z}_{t}),a_{t})
$$

:::zh

$$
e_{t}\sim p(\cdot|f^{e}(\mathbf{z}_{t}),a_{t})
$$
:::

:::bi

Here we explicitly condition on the action attempted by the agent, although it could be subsumed into the components (like observation in eq.1). This is to highlight that the GM generates an event statement $e_{t}$ in response to every action of any agent, while the agent might take in several observations before it acts (or none at all). After adding the event statement $e_{t}$ to its memory the GM can update its components using the same eq. 2 as the agent. It can then emit observations $\mathbf{o}^{i}_{t}$ for player $i$ using the following equation:

:::zh

这里我们显式地以智能体尝试的动作作为条件，尽管它也可以被归入组件（如同式 1 中的观察）。这是为了强调 GM 针对任何智能体的每个动作都会生成一个事件陈述 $e_{t}$，而智能体在行动之前可能接收若干观察（或者完全没有）。把事件陈述 $e_{t}$ 加入记忆之后，GM 就可以用与智能体相同的式 2 来更新它的组件。随后它可以用下面的式子为玩家 $i$ 发出观察 $\mathbf{o}^{i}_{t}$：
:::

:::bi

$$
\mathbf{o}^{i}_{t+1}\sim p(\cdot|f^{o}(\mathbf{z}_{t+1}))
$$

:::zh

$$
\mathbf{o}^{i}_{t+1}\sim p(\cdot|f^{o}(\mathbf{z}_{t+1}))
$$
:::

:::bi

In case the GM judges that a player did not observe the event, no observation is emitted. Notice that the components can have their internal logic written using any existing modelling tools (ODE, graphical models, finite state machines, etc.) and therefore can bring known models of certain physical, chemical or financial phenomena into the simulation.

:::zh

如果 GM 判断某个玩家没有观察到该事件，就不会发出观察。注意，组件的内部逻辑可以用任何现有的建模工具（ODE，图模型，有限状态机等）来编写，因此可以把某些物理，化学或金融现象的已知模型带进模拟。
:::

:::annotation
GM 和智能体是同一套组件架构，区别只在于 GM 的组件描述的是世界状态而不是某个人的状态。所以世界模拟没有另起一套机制，只是把同一种生成式组件换了个用途。
:::

### 使用 Concordia 设计实验（Experiment design using Concordia）

:::bi

An experiment is a specific configuration of the agents and the GM, which models a certain kind of social interaction. For example, an experiment that models a small business would have a grounded variable that accounts for money and goods to be exchanged between agents. An experiment modeling local elections in a small town would have grounded variables accounting for votes and voting procedures. An experiment modeling resource governance by a local community, e.g. a lobster fishery, may have grounded variables reflecting the state of the resource as well as financial and political variables.

:::zh

一个实验就是智能体和 GM 的某种特定配置，它建模某种类型的社会互动。例如，一个建模小企业的实验会有一个落地变量来记录智能体之间交换的金钱和商品。一个建模小镇地方选举的实验会有落地变量来记录选票和投票程序。一个建模地方社区资源治理（例如龙虾渔场）的实验，可能有反映资源状态的落地变量，以及金融和政治变量。
:::

:::bi

The experimenter would then control some (independent) variables affecting either the GM or the agents and observe the effect of their intervention on outcome variables. Outcomes of interest may be psychological and per-agent, e.g. responses to questionnaires, or global variables pertaining to the simulation as a whole such as the amount of trade or the average price of goods.

:::zh

实验者随后会控制一些（独立的）变量，它们要么影响 GM 要么影响智能体，并观察其干预对结果变量的影响。感兴趣的结果可能是心理层面的，针对单个智能体的，例如问卷的回答，也可能是与整个模拟有关的全局变量，比如交易量或商品的平均价格。
:::

:::bi

The basic principle of model validation is one of similarity between tested and untested samples. A model typically makes a family of related predictions, and perhaps a rigorous experiment tests only one of them. Nevertheless, if the untested predictions are sufficiently similar to the tested prediction then one might also gain some confidence in the untested predictions. The key question here is how similar is similar enough.

:::zh

模型验证的基本原理是已测样本与未测样本之间的相似性。一个模型通常会做出一族相关的预测，而严格的实验或许只检验其中的一个。不过，如果未测预测与已测预测足够相似，那么人们也能对未测预测获得一些信心。这里的关键问题是，要多相似才算足够相似。
:::

:::bi

We can articulate some concrete recommendations for best practices in generative agent-based modeling:

:::zh

我们可以为生成式智能体建模的最佳实践提出一些具体建议：
:::

:::bi

- **Measure generalization**—Direct measurement of model predictions on truly new test data that could not have influenced either the model’s concrete parameters or its abstract specification is the gold standard. For instance, when a model makes predictions about how humans will behave in certain situation then there is no better form of evidence than actually measuring how real people behave when facing the modeled situation. If the prediction concerns the effect of an intervention, then one would need to run the experiment in real life (or find a natural experiment that has not already contaminated the model’s training data). However, it is important to remember that direct evidence of generalization trumps other forms of evidence.
- **Evaluate algorithmic fidelity**—a validity concept developed recently for research on human behavior using data sampled using generative AI (Argyle et al., 2023). Algorithmic fidelity describes the extent to which a model may be conditioned using socio-demographic backstories to simulate specific human groups (or stereotypes of them, see unsolved issues below). Note however that it’s unlikely that algorithmic fidelity would be uniform over diverse research topics or parts of human lived experience. Any particular LLM will be better at simulating some people over other people (Atari et al., 2023), and will work better for some applications than others. Argyle et al. (2023) conclude from this that algorithmic fidelity must be measured anew for each research question. A finding of sufficient algorithmic fidelity to address one research question does not imply the same will be true for others (see also Santurkar et al. (2023); Amirova et al. (2023)).
- **Model comparison**—It is a lot easier to support the claim that one model is better (i.e. more trustworthy) than another model than to support the claim that either model is trustworthy on an absolute scale without reference to the other.
- **Robustness**—It will be important to try to develop standardized sensitivity analysis / robustness-checking protocols. For instance, it’s known that LLMs are often quite sensitive to the precise wording used in text prompts. Best practices for GABMs should involve sampling from a distribution of “details” and ways of asking questions to show that the factors not thought to be mechanistically related to the outcome are indeed as irrelevant as expected. Keep in mind that no amount of sensitivity analysis can substitute for a test of generalization.
- A useful slogan to keep in mind is that one should **try to make the minimal number of maximally general modeling choices**. This is a kind of parsimony principle for generative agent-based modeling. Obeying it does not guarantee a model will generalize; nevertheless failure to follow it does often doom generalization since models that are more complex are usually also more brittle, and models that are more brittle generally fail to generalize.

:::zh

- **测量泛化**。在真正新的测试数据上直接测量模型预测是金标准，这些数据不可能影响模型的具体参数或抽象规格。例如，当一个模型预测人类在某种情境下会如何行动时，没有什么证据比实际测量真实的人面对所建模情境时的行为更好。如果预测涉及干预的效果，那就需要在现实生活中进行实验（或者找到一个尚未污染模型训练数据的自然实验）。不过重要的是记住，泛化的直接证据优于其他形式的证据。
- **评估算法保真度**。这是一个最近为研究人类行为而发展的效度概念，研究数据用生成式人工智能采样（Argyle et al., 2023）。算法保真度描述一个模型能被社会人口学背景故事条件化，从而模拟特定人群（或对他们的刻板印象，见下方未解决的问题）的程度。不过要注意，算法保真度不太可能在多样的研究主题或人类生活经历的不同部分上保持均匀。任何特定的大语言模型（LLM）在模拟某些人上会优于另一些人（Atari et al., 2023），在某些应用上也会比另一些更好用。Argyle et al. (2023) 由此得出结论，算法保真度必须针对每个研究问题重新测量。针对某个研究问题发现足够的算法保真度，并不意味着对其他问题同样成立（另见 Santurkar et al. (2023); Amirova et al. (2023)）。
- **模型比较**。支持“一个模型比另一个模型更好（即更值得信赖）”这个主张，要比支持“某个模型在不参照另一个模型的情况下，在绝对尺度上值得信赖”这个主张容易得多。
- **稳健性**。设法制定标准化的敏感性分析 / 稳健性检查协议将很重要。例如，众所周知 LLM 常常对文本提示词中使用的精确措辞相当敏感。GABM 的最佳实践应该涉及从“细节”的分布和提问方式中采样，以表明那些被认为与结果没有机制性关联的因素确实如预期般无关。要记住，再多的敏感性分析也替代不了泛化检验。
- 一条值得记住的有用口号是，应该**设法做出数量最少，但最通用的建模选择**。这是生成式智能体建模的一种简约性原则。遵守它并不保证模型能够泛化，但不遵守它往往确实会葬送泛化，因为更复杂的模型通常也更脆弱，而更脆弱的模型一般无法泛化。
:::

:::annotation
四条最佳实践里最重要的一条是“测量泛化”：模型对真人的预测，最好的证据就是拿真人去测。其余几条（算法保真度，模型比较，稳健性）都是在拿不到真人数据时的退而求其次。
:::

:::bi

While generalization data is the gold standard, it is often difficult, unethical, or simply impossible to obtain. Therefore the hierarchy of evidence for validating GABMs also includes lower rungs corresponding to weaker forms of evidence. These include:

:::zh

虽然泛化数据是金标准，但它往往难以获得，不道德，或者干脆不可能获得。因此，验证 GABM 的证据层级还包含对应较弱证据形式的较低层级。这些包括：
:::

:::bi

- **Consistency with prior theory**—i.e. checking coherence with predictions of other theoretical traditions. For instance, evidence for the validity of a GABM modeling consumer behavior could be obtained by showing that prices in the model move in ways predicted by classic microeconomic theories of downward-sloping price-quantity demand curves. It is possible to directly evaluate counterfactuals and *ceteris paribus* stipulations in many kinds of model. As a result, it is often simple to test a model’s consistency with a causal theory in a very direct way (Footnote: Non-generative ABMs based on multi-agent reinforcement learning have frequently relied on this kind of evidence (e.g. Perolat et al. (2017); Johanson et al. (2022)).).
- **Low similarity between validating observations and desired application**. How low is too low? Some populations are just very hard to reach by researchers, but some of these populations are very much online. For example individuals with low generalized trust do not pick up the phone to pollsters and do not sign up for experiments. Nevertheless there are millions of such people, and they do use the internet. It’s likely that an LLM trained on large amounts of data from the internet would absorb some level of understanding of such groups. In such cases where it is difficult to recruit real participants, adopting a more flexible approach to validating GABMs representing such populations may be the best that can be done.

:::zh

- **与既有理论一致**。即检查与其他理论传统预测的一致性。例如，一个建模消费者行为的 GABM 的效度证据，可以通过展示模型中的价格以经典微观经济学中向下倾斜的价格数量需求曲线所预测的方式变动来获得。在许多类型的模型中，可以直接评估反事实和其他条件不变（ceteris paribus）的规定。因此，通常可以非常直接地检验模型与因果理论的一致性（脚注：基于多智能体强化学习的非生成式 ABM 经常依赖这类证据，例如 Perolat et al. (2017); Johanson et al. (2022)。）。
- **验证观察与期望应用之间的相似度低**。多低才算太低？有些人群研究者极难接触到，但其中一些人群很大程度上活跃在网上。例如，低泛化信任的个体不会接民意调查员的电话，也不会报名参加实验。然而这样的人有数百万，而且他们确实使用互联网。一个在大量互联网数据上训练的 LLM，很可能吸收了对这类群体的某种程度的理解。在难以招募真实参与者的情况下，对代表这些人群的 GABM 采用更灵活的验证方法，或许就是所能做的最好选择。
:::

:::bi

Several unsolved issues impacting validity in ways specific to ABMs that incorporate generative AI like Concordia are as follows. For now it is unclear how to resolve them.

:::zh

以下是若干未解决的问题，它们以 Concordia 这类融入生成式人工智能的 ABM 所特有的方式影响效度。目前尚不清楚如何解决它们。
:::

:::bi

- **Train-test contamination**—this is especially an issue with regard to academic papers. For instance, it’s not valid to simply ask an LLM to play Prisoner’s Dilemma. LLMs have “read” countless papers on the topic and that experience surely affects how they respond. However, many researchers are of the opinion that such an experiment may be conducted in a valid way if the interpretation of the situation as Prisoner’s Dilemma is somewhat hidden. So instead of describing a situation with prisoners you make up a different story to justify the same incentives. This issue was also discussed in Aher et al. (2023), especially appendix F, see also Ullman (2023).
- **LLMs likely represent stereotypes of human groups** (Weidinger et al., 2021). Therefore we may inadvertently study stereotypes of people not their real lived experience. This problem may be exacerbated for minority groups.
- **What happens in the limit of detail?** Beyond groupwise algorithmic fidelity it’s possible to measure individual-fidelity. How can you validate a model meant to represent a specific individual?

:::zh

- **训练测试污染**。就学术论文而言这尤其是个问题。例如，简单地让 LLM 玩囚徒困境并不有效。LLM 已经“读过”关于该主题的无数论文，这种经历肯定会影响它们的回应。然而，许多研究者认为，如果把情境解释为囚徒困境这件事在一定程度上被隐藏起来，这样的实验就可以以有效的方式进行。所以不要用囚徒来描述情境，而是编一个不同的故事来为同样的激励提供理由。这个问题在 Aher et al. (2023) 中也有讨论，特别是附录 F，另见 Ullman (2023)。
- **LLM 很可能代表了对人类群体的刻板印象**（Weidinger et al., 2021）。因此我们可能在不经意间研究的是对人们的刻板印象，而不是他们真实的生活经历。对于少数群体，这个问题可能更严重。
- **在细节的极限处会发生什么？** 除了群体层面的算法保真度，还可以测量个体保真度。你如何验证一个旨在代表特定个体的模型？
:::

## 解读（Interpretations）

:::bi

Concordia is not opinionated as to how you interpret the experiments and models you use it to construct. However, since generative agent-based modeling is quite different from other modeling techniques, we have found it helpful to explore the following interpretations, both for conceptualizing it to ourselves and explaining it to others.

:::zh

对于你如何解读用它构建的实验和模型，Concordia 不预设立场。不过，由于生成式智能体建模与其他建模技术相当不同，我们发现探索以下解读是有帮助的，既便于我们自己把它概念化，也便于向他人解释它。
:::

### 生成式智能体架构的神经科学解读（Neuroscience interpretation of the generative agent architecture）

:::bi

Generative agents such as those in Concordia and in Park et al. (2023) are biologically plausible descriptions of the brain, at some level of analysis. They foreground a specific picture of cognition as a whole, which has not been especially prominent in the past despite its having considerable empirical support.

:::zh

在某个分析层面上，Concordia 和 Park et al. (2023) 中的这类生成式智能体是对大脑在生物学上合理的描述。它们把一种关于整体认知的具体图景放到了前台，这种图景过去并不特别突出，尽管它拥有可观的经验支持。
:::

:::annotation
这一节作者用神经科学给架构做解释：LLM 的基本操作是“模式补全”，即接着已有的开头往下预测。所以他们主张生成式智能体在某个分析层面上是对大脑的可信描述。
:::

:::bi

Recent experimental (Goldstein et al., 2022; Schrimpf et al., 2020) and theoretical (Linzen and Baroni, 2021; McClelland et al., 2020) work in computational cognitive (neuro-)science has posited a deep relationship between the operations of LLM models and how language is processed by the human brain. For instance, brain-to-brain coupling of neural activity between a speaker and listener (as measured by electrocorticography) may be accounted for by LLM features reflecting conversation context (Goldstein et al., 2022). Representations appear first in the speaker before articulation and then reemerge after articulation in the listener (Zada et al., 2023).

:::zh

计算认知（神经）科学中近期的实验（Goldstein et al., 2022; Schrimpf et al., 2020）和理论（Linzen and Baroni, 2021; McClelland et al., 2020）工作，假定了 LLM 模型的运作与人类大脑处理语言方式之间的深层关系。例如，说话者与听者之间神经活动的大脑间耦合（通过皮层脑电图测量）可能由反映对话语境的 LLM 特征来解释（Goldstein et al., 2022）。表征先出现在说话者发音之前，然后在听者发音之后重新出现（Zada et al., 2023）。
:::

:::bi

The brain certainly appears to sample what it will say next in such a way as to complete any pattern it has started. This is how we can start speaking without knowing in advance how we will finish. There is more concrete evidence for this pattern completion view of behavior from split brain patients (patients whose brain hemispheres have been surgically disconnected as a treatment for epilepsy). For instance, you can present a reason for action to their left eye (i.e. their right brain), it then prompts them to start performing the action with their left hand. And simultaneously present some other information to their right eye (left brain). Next ask them in language why they are doing it (i.e. ask their left brain, since language is lateralized). The result is that they make up a reason consistent with whatever information was presented to their left brain. Split brain patients typically express confidence in these confabulated (made up) reasons for action (Roser and Gazzaniga, 2004).

:::zh

大脑显然会以这样一种方式采样它接下来要说的话，以便补全它已经开始的任何模式。这就是我们能在事先不知道会如何结束时就开始说话的原因。关于这种行为的模式补全观点，还有来自裂脑患者（因治疗癫痫而被手术切断两侧大脑半球连接的患者）的更具体证据。例如，你可以把行动的一个理由呈现给他们的左眼（即他们的右脑），这随后促使他们用左手开始执行该动作。同时把另一些信息呈现给他们的右眼（左脑）。接着用语言问他们为什么要这么做（即问他们的左脑，因为语言是单侧化的）。结果是，他们会编出一个与呈现给左脑的任何信息一致的理由。裂脑患者通常对这些虚构的（编造的）行动理由表达自信（Roser and Gazzaniga, 2004）。
:::

:::bi

A Concordia agent has both a long-term memory and a working memory. The long-term memory is a set of sequences of symbols. The working memory is a single sequence of symbols. The contents of working memory are always in the conditioning set for the next-symbol prediction used to construct the agent’s action sequence. At each decision point, a neural network performs incremental next-symbol prediction, starting from the contents of working memory $\mathbf{z}_{t}$, eventually producing an articulatory symbol sequence $a_{t}$ to emit (i.e. for downstream motor circuitry to read out as speech). Information formatted as sequences of symbols gets in to working memory in one of two ways: either a sequence of symbols may be evoked directly from the current stimulus, or alternatively a sequence of symbols may be retrieved from long-term memory. A range of different perceptual mechanisms and retrieval mechanisms are jointly responsible for getting all the relevant information needed for the agent to produce an effective action sequence into its working memory (e.g. as in Park et al. (2023)).

:::zh

一个 Concordia 智能体同时拥有长期记忆和工作记忆。长期记忆是符号序列的集合。工作记忆是单个符号序列。工作记忆的内容总是处于条件集之中，用于构造智能体动作序列的下一个符号预测。在每个决策点上，一个神经网络从工作记忆的内容 $\mathbf{z}_{t}$ 出发进行增量的下一个符号预测，最终产出一个要发出的发音符号序列 $a_{t}$（即供下游运动回路作为言语读出）。以符号序列形式格式化的信息通过两种方式之一进入工作记忆：要么一个符号序列直接从当前刺激中被唤起，要么一个符号序列从长期记忆中被检索出来。一系列不同的知觉机制和检索机制共同负责把智能体产生有效动作序列所需的全部相关信息送入工作记忆（例如同 Park et al. (2023)）。
:::

:::bi

To implement routine behavior, an agent could continually rehearse its routine in working memory, but that would impair its ability to use working memory for other purposes on other tasks since its working memory is limited in capacity (like in Baddeley (1992)). So instead of continually rehearsing routines in working memory, we may instead assume that they are often stored elsewhere and then retrieved when needed (i.e. from long-term memory).

:::zh

为了实现例行行为，智能体可以在工作记忆中不断复述它的例行程序，但那样会损害它在其他任务上把工作记忆用于其他目的的能力，因为它的工作记忆容量有限（如同 Baddeley (1992)）。所以与其在工作记忆中不断复述例行程序，我们不如假设它们通常存放在别处，在需要时再检索出来（即从长期记忆）。
:::

:::bi

As a result of being stored in a natural language representation, explicit routines are somewhat fragile. They may be hard to recall, and frequently forgotten if not used. When a routine is not practiced often enough there is a risk of it being forgotten. Luckily, explicit routines may also be written down on paper (or stone tablets), and kept permanently.

:::zh

由于以自然语言表征的形式存放，显式例行程序有些脆弱。它们可能难以回忆，如果不使用就常常被遗忘。当一个例行程序练习得不够频繁时，就有被遗忘的风险。幸运的是，显式例行程序也可以写在纸上（或石板上），并永久保存。
:::

:::bi

A generative agent may also act *as if* it makes its decisions under guidance of an explicit routine while not actually being conditioned on any linguistic representation of that routine. This happens when the routine exists implicitly in the weights of the LLM’s neural network. Unlike explicit routines, such implicitly coded routines may not be precisely articulable in natural language. For instance, one may follow the rule of “avoiding obscenity” without being able to precisely articulate what obscenity is. In fact, Obscenity is famously so difficult to precisely define that US Supreme Court Justice Potter Stewart could offer only the classification “I know it when I see it”. Concordia agents can capture such recognition-mediated behavior by using fine-tuning to modify the LLM as needed.

:::zh

生成式智能体还可能表现得仿佛在某个显式例行程序的指导下做出决策，而实际上并未以该例行程序的任何语言表征为条件。当该例行程序隐含地存在于 LLM 神经网络的权重中时，就会发生这种情况。与显式例行程序不同，这种隐式编码的例行程序可能无法用自然语言精确表达。例如，一个人可能遵循“避免淫秽”的规则，却无法精确表达什么是淫秽。事实上，淫秽以难以精确定义而闻名，以至于美国最高法院大法官 Potter Stewart 只能给出“我看到它时就知道它”这样的分类。Concordia 智能体可以通过按需微调 LLM 来捕捉这种由识别中介的行为。
:::

### 社会建构理论（A theory of social construction）

:::bi

> "Situations, organizations, and environments are talked into existence"
>
> — Weick et al. (2005)

:::zh

> “情境，组织与环境是被谈论出来的存在”
>
> Weick et al. (2005)
:::

:::bi

In social construction theories, agents may change their environment through the collective effects of their actions on social structures like norms, roles, and institutions which together determine most of what matters about any given social situation. Furthermore, changes in the social structures constituting the environment deeply change the agents’ own “internal” models and categories (Wendt, 1992). Causal influence flows both from agents to social structures as well as from social structures to agents. Groups of agents may take collective action to change norms or institutions (Sunstein, 2019), and simultaneously social structures may influence agents by setting out the “rules of the game” in which they select their actions (Wendt, 1987). Agents and structures may be said to *co-constitute* one another (Onuf, 1989).

:::zh

在社会建构理论中，智能体可以通过其行动对规范，角色和制度等社会结构的集体效应来改变环境，而这些结构共同决定了任何给定社会情境中大多数重要的东西。此外，构成环境的社会结构的变化会深刻改变智能体自己的“内部”模型和范畴（Wendt, 1992）。因果影响既从智能体流向社会结构，也从社会结构流向智能体。智能体群体可以采取集体行动来改变规范或制度（Sunstein, 2019），同时社会结构也可以通过设定他们选择行动所依据的“游戏规则”来影响智能体（Wendt, 1987）。可以说，智能体与结构共同建构彼此（Onuf, 1989）。
:::

:::annotation
社会建构论的视角是本文最独特的地方：智能体和环境互相“共同构成”对方，因果在两边之间双向流动。因为 LLM 吸收了人类文化，文化里的偏见和意义会原样带进模拟。
:::

:::bi

The key questions of March and Olsen (2011), which we introduced in Section 2.1, were derived from a social constructionist conception of how agents make decisions. It posits that humans generally act as though they choose their actions by answering three key questions. People may construct parts of their understanding of “what kind of person am I?” on the basis of their memory of their past behavior via logic such as “I do this often, so I must like to do it” (Ouellette and Wood, 1998). Likewise, “what kind of situation is this?” is usually informed by culturally defined categories like institutions, e.g. this is a classroom and I am in the role of the professor. And, “what does a person such as I do in a situation such as this?” may be answered by recalling examples to mind of people fitting certain social roles in similar situations and the way they behaved in them (Sunstein, 1996; Harris et al., 2021).

:::zh

我们在第 2.1 节引入的 March and Olsen (2011) 的关键问题，源自一种关于智能体如何做决策的社会建构主义观念。它假定人类通常表现得仿佛通过回答三个关键问题来选择行动。人们可能基于对自己过去行为的记忆，通过“我经常做这件事，所以我一定喜欢做它”这样的逻辑，来建构对“我是个什么样的人？”的部分理解（Ouellette and Wood, 1998）。同样，“这是什么样的情境？”通常由制度这类文化定义的范畴来告知，例如这是一个教室，而我处在教授的角色中。而“像我这样的人在这样的情境中会怎么做？”可以通过回忆符合某些社会角色的人在相似情境中的例子，以及他们在其中的行为方式来回答（Sunstein, 1996; Harris et al., 2021）。
:::

:::bi

Since modern LLMs have been trained on massive amounts of human culture they thus may be capable of giving satisfactory answers to these questions when provided with the right context to create a specific agent. This approach relies on the extent to which the outputs of LLMs conditioned to simulate specific human sub-populations actually reflect the beliefs and attitudes of those subpopulations. Argyle et al. (2023) termed this property of some LLMs *algorithmic fidelity* and the concept was further developed and measured in (Amirova et al., 2023; Santurkar et al., 2023). From the perspective of generative agent-based modeling, we can now say that the social construction that already took place in human culture, and subsequently absorbed by the LLM, becomes the background knowledge of the agents in the GABM. If humans in the culture that produced the LLM have a particular bias then so too will agents in the simulation. Likewise, if the humans in the culture that produced the LLM ascribe meaning to a particular understanding, then so too will the agents in the simulation, at least they will say so.

:::zh

由于现代 LLM 是在海量人类文化上训练的，因此当提供合适的语境来创建特定智能体时，它们或许能够对这些问题给出令人满意的回答。这种方法依赖于这样一个程度：被条件化来模拟特定人群的 LLM 的输出，在多大程度上真实反映了那些人群的信念和态度。Argyle et al. (2023) 把某些 LLM 的这一性质称为算法保真度，这个概念在（Amirova et al., 2023; Santurkar et al., 2023）中得到了进一步发展与测量。从生成式智能体建模的角度看，我们现在可以说，已经在人类文化中发生，随后被 LLM 吸收的社会建构，成为 GABM 中智能体的背景知识。如果产生该 LLM 的文化中的人类有某种偏见，那么模拟中的智能体也会有。同样，如果产生该 LLM 的文化中的人类把意义赋予某种特定理解，那么模拟中的智能体也会如此，至少它们会这么说。
:::

:::bi

In the past, theories of social construction have been criticized because they lacked concrete predictive implementations in the form of computational models. This is because it was difficult to construct agent-based models without relying either on rational maximization or hand-coded (i.e. theory-based) rules. Generative agent-based modeling as in Concordia relies on neither. Instead the generative agent-based modeling approach relies on access to an LLM to give meaning to the actions within the simulation. The LLM is a product of the culture that produced it (Footnote: For some choices of LLM, it’s not unreasonable to think of the LLM as representing the “collective unconscious” (Jung, 1959).). This makes Concordia especially useful as a tool for constructing concrete computational models in accord with theories of social construction.

:::zh

过去，社会建构理论受到批评，因为它们缺少以计算模型形式出现的具体预测实现。这是因为在不依赖理性最大化或手工编码（即基于理论的）规则的情况下，很难构建基于智能体的模型。像 Concordia 这样的生成式智能体建模两者都不依赖。相反，生成式智能体建模方法依赖对 LLM 的访问，来为模拟中的动作赋予意义。LLM 是产生它的文化的产物（脚注：对某些 LLM 的选择而言，把 LLM 视为代表“集体无意识”（Jung, 1959）并非不合理。）。这使得 Concordia 作为按照社会建构理论构建具体计算模型的工具尤其有用。
:::

:::bi

Social construction also operates on levels of analysis smaller than the culture as a whole. For instance, social construction may happen locally within an organization. Weick et al. (2005) offers an analysis in which members of an organization repeat behavioral patterns, which are prescribed by their roles, up until the moment they no longer can. Some change in their environment eventually forces their routines to end, and when that happens they have to engage in sense-making by asking themselves “what is the story here?” and “what should I do now?” by retrospectively connecting their past experiences and engaging in dialogue with other members of the organization. New social facts and routines can emerge from this sense-making process.

:::zh

社会建构也在小于整体文化的分析层面上运作。例如，社会建构可以在组织内部局部发生。Weick et al. (2005) 提供了一种分析，其中组织的成员重复由他们的角色规定的行为模式，直到他们再也无法继续为止。环境中的某种变化最终迫使他们的例行程序终止，当这种情况发生时，他们必须通过问自己“这里的故事是什么？”和“我现在应该做什么？”来进行意义建构，回顾性地连接他们过去的经历，并与组织的其他成员对话。新的社会事实和例行程序可以从这个意义建构过程中涌现。
:::

:::bi

Concordia can be used to implement models where such local social construction processes occur actively, as a part of the ongoing simulation. This is possible because Concordia agents learn facts from each other and from their collective interactions. As in Weick et al. (2005)’s picture of collective sense-making in an organization, a set of Concordia agents may continue routines until disrupted and once disrupted naturally transition to a process of collective reflection until they are able to establish a new routine and rationale for it. If we additionally train the LLM itself then the underlying representations can be shaped to fit the emergent routine and rationale. Developing this ability for agents to collectively engage in the social construction of their own representations will be important for developing better models of human-like multi-scale social interactions.

:::zh

Concordia 可以用来实现这样的模型：其中这类局部社会建构过程作为正在进行的模拟的一部分而主动发生。这是可能的，因为 Concordia 智能体从彼此以及从它们的集体互动中学习事实。如同 Weick et al. (2005) 描绘的组织中的集体意义建构，一组 Concordia 智能体可以继续例行程序直到被打断，而一旦被打断，就自然地过渡到集体反思的过程，直到它们能够建立新的例行程序及其理由。如果我们进一步训练 LLM 本身，那么底层表征就可以被塑造来适应涌现出的例行程序和理由。发展这种让智能体集体参与其自身表征的社会建构的能力，对于开发更好的类人多尺度社会互动模型将很重要。
:::

:::bi

As with other ABM approaches, a major topic of interest is how large-scale “macrosocial” patterns emerge from the “microsocial” decisions of individuals (Macy and Willer, 2002), as explored, for example, in assemblage theory (DeLanda, 2016; DeLanda, 2011). For instance, the collective social phenomena of information diffusion emerged in the simulation of Park et al. (2023) without specific programming to enable it. The generative agent’s ability to copy, communicate, reproduce, and modify behavioral and thinking patterns potentially makes them a substrate for cultural evolution.

:::zh

与其他 ABM 方法一样，一个主要的兴趣主题是，大规模的“宏观社会”模式如何从个体的“微观社会”决策中涌现（Macy and Willer, 2002），正如装配理论（DeLanda, 2016; DeLanda, 2011）等所探讨的。例如，信息扩散这种集体社会现象在 Park et al. (2023) 的模拟中涌现出来，而没有专门编程去促成它。生成式智能体复制，交流，再现和修改行为与思维模式的能力，潜在地使它们成为文化演化的基质。
:::

:::bi

Importantly, social construction theories hold that valuation is itself social constructed. The reason we value a particular object may not depend much on properties of the object itself, but rather depend almost wholly on the attitudes others like us place on the object. The collective dynamics of social valuation, as mediated through bandwagon effects and the like, have proven important in understanding fashion cycles and financial bubbles (Zuckerman, 2012). The fact that we are now able to capture valuation changes with Concordia agents is an exciting research direction. It would be difficult even to formulate such questions in the fundamentally goal optimizing frameworks we discuss in the next section. On the other hand, GABM excels at modeling such effects since it does not require valuations in themselves for any functional part of the theory.

:::zh

重要的是，社会建构理论认为评价本身就是社会建构的。我们看重某个特定对象的原因，可能在很大程度上不取决于对象本身的属性，而几乎完全取决于像我们一样的其他人对它所持的态度。经由从众效应之类机制中介的社会评价的集体动力学，已被证明在理解时尚周期和金融泡沫方面很重要（Zuckerman, 2012）。我们现在能够用 Concordia 智能体捕捉评价变化这一事实，是一个令人兴奋的研究方向。在我们下一节讨论的那种从根本上以目标优化为框架的方法中，甚至难以表述这样的问题。另一方面，GABM 擅长建模这类效应，因为它不需要把评价本身当作理论任何功能性部分的前提。
:::

### Concordia 智能体不是通过优化来做决策的（Concordia agents do not make decisions by optimizing）

:::annotation
这是全文最有立场的一节，标题直译是“Concordia 智能体不靠优化做决策”。作者把同样的话对两个不同听众各讲一遍：先讲给强化学习研究者（3.3.1），再讲给经济学和博弈论研究者（3.3.2）。
:::

:::bi

> The cake is a lie.
>
> — Portal (Valve, 2007)

:::zh

> 蛋糕是个谎言。
>
> Portal (Valve, 2007)
:::

:::bi

We may divide this interpretation into two parts. Really we are making the same point twice, but for two different audiences. First we frame this idea using the *retrospective decision-making* terminology familiar to Reinforcement Learning (RL) researchers (Section 3.3.1). Second we articulate a very similar point in the language of *prospective decision making* familiar in game theory, economics, and other theoretical social sciences (Section 3.3.2).

:::zh

我们可以把这一解释分成两部分。实际上我们是在把同一个观点讲两遍，只是面向两群不同的读者。首先我们用强化学习（RL）研究者熟悉的*回顾性决策*术语来表述这一想法（第3.3.1节）。其次我们用博弈论，经济学和其他理论社会科学中熟悉的*前瞻性决策*语言来阐述一个非常相似的观点（第3.3.2节）。
:::

:::bi

A generative agent acts by asking its LLM questions of the form “what does a person such as I do in a situation such as this?”. Notice that this formulation is not consequentialist. The “reason” for the agent’s specific decision is its similarity to the LLM’s (and GA’s memory) representations of what an agent such as the one in question would do. In recent years considerable effort has gone in to predicting the properties of powerful consequentialist AI decision-maker agents (e.g. Bostrom (2014); Roff (2020)). However, Concordia agents may behave quite differently from consequentialist agents. So much of that theory may not be applicable (Footnote: Note that this does not mean powerful generative agents would necessarily be safer than powerful consequentialist agents. See Section 4.5.). It has only recently become possible to explore the kind of agency exhibited by Concordia agents, since doing so relies critically on the LLM powering the agent being powerful enough to approximately understand common-sense reasoning and common social conventions and norms, a milestone which was only recently achieved. To paraphrase March and Olsen (2011), decisions can be justified either via the “logic of consequence” or via the “logic of appropriateness”. Much of AI focused previously on the former (at least implicitly), while now using generative agents we begin to consider the latter.

:::zh

生成式智能体通过向其 LLM 提出“像我这样的人在像这样的情境下会怎么做”这类问题来采取行动。请注意，这种表述不是后果论式的。智能体作出具体决定的“理由”，是它与 LLM（以及生成式智能体的记忆）对“像所讨论的这样一个智能体会怎么做”的表征之间的相似性。近年来，人们投入了大量精力来预测强大的后果论式 AI 决策者智能体的性质（例如 Bostrom (2014)，Roff (2020)）。然而，Concordia 智能体的行为可能与后果论式智能体大不相同。因此，那些理论中有很多可能并不适用（脚注：请注意，这并不意味着强大的生成式智能体必然比强大的后果论式智能体更安全。见第4.5节）。直到最近，探索 Concordia 智能体所展现的这种能动性才成为可能，因为这关键依赖于驱动智能体的 LLM 强大到足以近似理解常识性推理以及常见的社会习俗和规范，而这一里程碑直到最近才被达到。借用 March and Olsen (2011) 的说法，决策既可以通过“后果的逻辑”来辩护，也可以通过“适当性的逻辑”来辩护。此前，大量 AI 研究（至少是隐式地）聚焦于前者，而现在，通过使用生成式智能体，我们开始考虑后者。
:::

#### Concordia 智能体不是强化学习智能体（Concordia agents are not reinforcement learners）

:::bi

Generative view of agency presented in this paper contrasts with the classic Reinforcement Learning (RL) view as summarized in the “Reward is enough” thesis of Silver et al. (2021). The orthodox RL view of behaviour is that it is constructed from individual experience and driven by a quantifiable (and externally supplied) reward function reflecting the achievement of goals. To communicate what behaviour is desired of the agent, one has to annotate the agents’ activity with a reward signal, which signals goal achievement.
Here we instead follow the social constructionist view of agency expressed in March and Olsen (2011), where behavior is an expression of the agent’s position in the social context, and what policy the social norms prescribe for the agent in such a position. Answering “what does a person such as I do in a situation such as this?” might require positing a practical goal and achieving it (“make money”, “get famous”), but goals are qualitative, dynamic and context dependent. To specify the behavior you want an agent to produce you need to communicate its social context and the agents position within it.

:::zh

本文所呈现的生成式能动性观点，与 Silver et al. (2021) 在“奖励即已足够”论题中概括的经典强化学习（RL）观点形成对比。正统的 RL 行为观认为，行为由个体经验构建，并由一个可量化（且外部提供）的奖励函数所驱动，该函数反映目标的实现。要向智能体传达期望它表现出什么行为，就必须用奖励信号来标注智能体的活动，而奖励信号表示的是目标的达成。在这里，我们转而遵循 March and Olsen (2011) 所表达的社会建构主义能动性观点：行为是智能体在社会语境中的位置的表达，以及社会规范为该智能体在这样一个位置上所规定的策略的表达。回答“像我这样的人在像这样的情境下会怎么做”可能需要设定一个实际目标并实现它（“赚钱”，“出名”），但目标是定性的，动态的并且依赖语境。要指定你想让智能体产生的行为，你需要传达它的社会语境以及智能体在其中所处的位置。
:::

:::annotation
对比的是 Silver 等人“Reward is enough”的经典立场。Concordia 的智能体不是被奖励信号驱动，而是被社会情境驱动：回答“像我这样的人在这样情境里会怎么做”。
:::

:::bi

One interpretation holds the LLM to be a library of pre-trained options (in the RL sense (Sutton et al., 1999)). In this case we can view the components used in the generative agent as eliciting the desired option, by conditioning (prompting) the LLM with their state (which is in this case expressed in English). Concordia agents are constantly interacting with the world (GM) and each other, thereby modifying their components with the incoming information and communication. This way the option selection becomes dynamic, context sensitive, and collaborative. Concordia agents adapt their behaviour not through gradient decent on a loss function, but through re-articulating and communicating their descriptions of themselves and their circumstances to each other and he environment in a communicative, social process.

:::zh

一种解释认为，LLM 是一个预训练选项（option）库（在 RL 的意义上（Sutton et al., 1999））。在这种情况下，我们可以把生成式智能体中使用的组件视为在诱导出所需选项：通过用组件状态（在本例中以英文表达）来条件化（提示）LLM。Concordia 智能体不断与世界（GM）和彼此互动，从而用传入的信息和交流来修改它们的组件。这样一来，选项选择就变得动态，依赖语境并且具有协作性。Concordia 智能体不是通过对损失函数做梯度下降来调整行为，而是通过在一个交流性的社会过程中，向彼此和环境重新表述并传达它们对自身及其处境的描述来调整行为。
:::

:::bi

Notice, that this doesn’t mean that Concordia agents couldn’t, in principle, perform reward maximisation and policy iteration. Brooks et al. (2023) have shown that the ability of LLMs to learn in-context (Brown et al., 2020) can be used to perform policy iteration in classic RL environments, as long as they can be represented as text. One could also implement a specialised component that runs a classic RL algorithm for a specific domain or tool use case. The agent could provide supervision to its RL based components via hierarchical RL techniques like feudal RL (Dayan and Hinton, 1992; Vezhnevets et al., 2017).

:::zh

请注意，这并不意味着 Concordia 智能体原则上不能执行奖励最大化和策略迭代。Brooks et al. (2023) 已经表明，LLM 的上下文学习能力（Brown et al., 2020）可以用来在经典 RL 环境中执行策略迭代，只要这些环境能被表示成文本。人们也可以实现一个专门的组件，为特定领域或工具使用场景运行经典 RL 算法。智能体可以通过分层 RL 技术，例如封建 RL（Dayan and Hinton, 1992; Vezhnevets et al., 2017），为其基于 RL 的组件提供监督。
:::

#### Concordia 智能体不是理性的效用最大化者（Concordia agents are not rational utility maximizers）

:::bi

Concordia agents are not *Homo economicus*-style rational actors. They do not explicitly represent anything resembling a utility function. Rather they plan and converse directly in natural language.

:::zh

Concordia 智能体不是*经济人*（Homo economicus）式的理性行动者。它们不显式地表示任何类似效用函数的东西。相反，它们直接用自然语言进行规划和交谈。
:::

:::annotation
这里点破了表面相似下的根本差异：经济人做的是前瞻规划，去模拟未来轨迹挑最好的，而 LLM 做的只是预测下一个词。两者看起来都“有计划”，机制完全不同。
:::

:::bi

While Concordia agents share with *Homo economicus*-style rational actors the property of being prospective (“model-based”) decision makers. The surface similarity is in fact misleading since the LLM’s basic operation is to predict what word is coming next in the problem’s description, not to predict what action should be taken next to achieve some goal. As result, this model of agents make decisions is very different from the forward planning picture of human cognition envisioned in the rational actor model. They do not select actions by simulating a set of future trajectories in which they took different courses of action to determine which turns out best. Instead the prediction they make concerns only the continuation of the text held in working memory.

:::zh

虽然 Concordia 智能体与*经济人*（Homo economicus）式的理性行动者一样，都具有前瞻性（“基于模型”）决策者的性质，但表面上的相似其实具有误导性，因为 LLM 的基本操作是预测问题描述中的下一个词是什么，而不是预测接下来应该采取什么动作来实现某个目标。因此，这种智能体做决策的模型与理性行动者模型所设想的，对人类认知进行前向规划的画面非常不同。它们不会通过模拟一组未来轨迹，在其中采取不同行动路线来判断哪一条结果最好，来选择动作。相反，它们所做的预测只涉及工作记忆中文本的延续。
:::

:::bi

The novel idea underpinning GABMs is that all agent behavior may result from systematically querying a system trained to predict the next word in massive internet-scale text datasets. This is enough for them to be able to converse with one another in natural language and take appropriate actions in light of their conversations. Concordia agents all have their own unique biographies, memories, preferences, and plans. And as a result, they behave systematically differently from one another. They may act in a seemingly goal-directed fashion if you “ask them” to do so (e.g. they may appear rational if you prompt them to simulate economists, an effect reminiscent of Carter and Irons (1991); Frank et al. (1993) which showed economics undergraduates were more likely to behave like rational self-interested maximizers in laboratory experiments). But there is no utility function under the hood.

:::zh

支撑 GABM 的新颖想法是：智能体的所有行为都可能来自对某个系统的系统性查询，而该系统经过训练，用于预测海量互联网规模文本数据集中的下一个词。这足以让它们彼此用自然语言交谈，并根据对话采取合适的动作。Concordia 智能体各自拥有独特的传记，记忆，偏好和计划。因此，它们彼此之间的行为表现出系统性的差异。如果你“要求”它们这样做，它们可能会以看似目标导向的方式行事（例如，如果你提示它们模拟经济学家，它们可能表现得理性，这一效应让人想起 Carter and Irons (1991) 和 Frank et al. (1993)，这些研究表明经济学本科生在实验室实验中更可能表现得像理性的自利最大化者）。但在幕后并不存在效用函数。
:::

:::bi

It is useful to contrast game-theoretic modeling with GABM to illustrate the differences. Despite its wide-ranging influence (game theoretic approaches have been used to model diverse phenomena including many economic properties and the evolution of human culture), game theory is not at all a neutral tool, rather it is a deeply opinionated modeling language. It imposes a strict requirement that everything must ultimately cash out in terms of the payoff matrix (or equivalent representation) (Luce and Raiffa, 1957). This means that the modeler has to know, or be willing to assume, everything about how the effects of individual actions combine to generate incentives. This is sometimes appropriate, and the game theoretic approach has had many successes. However, game theory’s major weakness as a modeling language is exposed in situations where the modeler does not fully understand how the choices of individuals combine to generate payoffs (Hertz et al., 2023). GABM entirely avoids this need to specify payoffs at the outset of the modeling process.

:::zh

把博弈论建模与 GABM 进行对比，有助于说明两者的差异。尽管博弈论影响广泛（博弈论方法已被用来建模各种现象，包括许多经济属性和人类文化的演化），博弈论绝不是中性的工具，而是一种观点鲜明的建模语言。它强加了一条严格的要求：一切最终都必须用收益矩阵（或等价表示）来兑现（Luce and Raiffa, 1957）。这意味着建模者必须了解，或者愿意假设，个体动作的效果如何组合以产生激励的全部机制。这有时是合适的，博弈论方法也取得了许多成功。然而，在建模者不完全理解个体选择如何组合以产生收益的情形下，博弈论作为建模语言的主要弱点就暴露出来了（Hertz et al., 2023）。GABM 完全避免了在建模过程一开始就必须指定收益的需要。
:::

## 应用（Applications）

:::bi

In this section we review potential applications of Concordia. For some of them we provide an example in the current release, some we only sketch out and leave for future work.

:::zh

在本节中，我们回顾 Concordia 的潜在应用。对其中的一些应用，我们在当前版本中提供了示例，对另一些应用，我们只做概述并留给未来工作。
:::

### 数字行动空间中的合成用户研究（Synthetic user studies in digital action space）

:::bi

In this section we present a specific case study, where Concordia is used to simulate social interaction through the digital media, in this case a smartphone. This case study demonstrates that Concrodia can be a powerful tool for modelling human digital activity and can be used to test technology deployment, generate synthetic user logs, and test unreleased products in a safe, but realistic sandbox environment.

:::zh

在本节中，我们呈现一个具体的案例研究，其中 Concordia 被用来模拟通过数字媒介进行的社交互动，在本例中媒介是一部智能手机。这个案例研究表明，Concordia 可以成为建模人类数字活动的强大工具，并且可以用来测试技术部署，生成合成用户日志，以及在一个安全但逼真的沙盒环境中测试尚未发布的产品。
:::

:::bi

The system proposed thus far of agent interaction in natural language with the world via game master control serves as a flexible and powerful simulation tool describing an open ended action space. In the context of a digital medium, similarly to grounded variables, there is merit in structuring the action space available to agents and their ability to reason over it.

:::zh

到目前为止所提出的，智能体通过游戏主持人（GM）控制以自然语言与世界互动的系统，是一种灵活而强大的模拟工具，描述了一个开放式的动作空间。在数字媒介的语境下，与落地变量类似，对智能体可用的动作空间以及它们对该空间进行推理的能力加以结构化，是有价值的。
:::

:::bi

The digital medium is characterized by definite functions, with clear inputs and outputs. As one interacts with this medium, its actions are logged, tracked and recorded as digital memory and capture our digital essence. In order to simulate this essence, similar structuring is needed in order to model real digital services and applications.

:::zh

数字媒介的特征在于明确的函数，具有清晰的输入和输出。当人与这种媒介交互时，其动作会被记录，跟踪并保存为数字记忆，从而捕获我们的数字本质。为了模拟这种本质，需要类似的结构化来建模真实的数字服务和应用程序。
:::

:::figure
![The high level structure of digital activity simulation in Concordia. PhoneTrigg](./images/concordia/fig-04.png)

Figure 4: The high level structure of digital activity simulation in Concordia. PhoneTriggeringComponent identifies phone events and spawns a PhoneGameMaster to handle them. The PhoneGameMaster translates the action to a definite action space defined by the phone apps and executes them.

:::zh
图 4：数字活动模拟的高层结构。主 GM 检测到涉及手机的事件后，派生出一个 PhoneGameMaster，把自由文本动作翻译成手机应用定义好的确定动作空间再执行。这张图看嵌套关系：手机 GM 是主 GM 派生的子游戏。
:::
:::

#### PhoneGameMaster 与 PhoneUniverse（PhoneGameMaster and PhoneUniverse）

:::bi

The PhoneGameMaster is a nested Concordia game that facilitates the simulation of a phone and runs as long as the agent is interacting with the phone. It is focused on one agent’s interaction with their phone, and as such, it only has access to one agent (the “owner” of the phone we’re simulating). In addition to different simulation instructions, the PhoneGameMaster also has a bespoke prompting components that simulate the phone interaction. We note that a phone is a design choice for a digital representation but in principle other digital mediums can be explored. Note that the phone digital actions/memories are stored in data structures external to the simulation’s associative memory.

:::zh

PhoneGameMaster 是一个嵌套的 Concordia 游戏，用于促进对手机的模拟，并且只要智能体在与手机交互，它就会一直运行。它专注于单个智能体与其手机的交互，因此它只能访问一个智能体（我们正在模拟的手机的“主人”）。除了不同的模拟指令之外，PhoneGameMaster 还拥有定制的提示组件来模拟手机交互。我们指出，选择手机作为数字表示是一种设计选择，但原则上也可以探索其他数字媒介。请注意，手机的数字动作和记忆存储在模拟联想记忆之外的数据结构中。
:::

:::annotation
数字动作空间是 Concordia 相对斯坦福小镇的关键增量。PhoneGameMaster 是一个嵌套的子 GM，把自由文本动作翻译成手机应用里确定的函数调用，这让“模拟用户用真实服务”成为可能。
:::

:::bi

The PhoneUniverse is responsible for translating the free-text English language of the Concordia simulation into semantic actions performed on the phone digital representation.
Given an English-text action performed by a player, the PhoneUniverse:

:::zh

PhoneUniverse 负责把 Concordia 模拟中的自由文本英文翻译成在手机数字表示上执行的语义动作。给定玩家执行的一个英文文本动作，PhoneUniverse 会：
:::

:::bi

- Prompts the LLM for the app and functions available on that agent’s phone.
- Prompts the LLM for the function arguments.
- Invokes the resulting chosen function.
- Add a notification to the NotificationHub if needed.
- Delegates back to the PhoneGameMaster to perform further action planning and facilitate multi-step phone actions.

:::zh

- 向 LLM 提示该智能体手机上可用的应用和函数。
- 向 LLM 提示函数参数。
- 调用最终选定的函数。
- 如有需要，向 NotificationHub 添加一条通知。
- 交回 PhoneGameMaster 来执行进一步的行动规划，并促成多步手机动作。
:::

:::figure
![The given example demonstrates a scenario rooted in digital technology where the](./images/concordia/fig-05.png)

Figure 5: The given example demonstrates a scenario rooted in digital technology where the actions of the agent initiate processes in their phone, involving three key components (activation, API conversion, and action querying). In this scenario, Alice intends to organize a meeting with Bob using her phone. She opts to employ the calendar application for scheduling.

:::zh
图 5：这张图看一个具体场景：Alice 想用手机约 Bob 开会，于是选用日历应用。注意手机动作要经过三个环节，即激活，API 转换，动作查询，自由语言正是经过这三步才变成日历应用里的真实调用。
:::
:::

#### 数字函数表示（Digital function representations）

:::bi

The specific implementation or representation of a function is flexible and can be chosen depending on desired goal. We list a few examples of possible representations:

:::zh

函数的具体实现或表示是灵活的，可以根据期望的目标来选择。我们列出几种可能的表示示例：
:::

:::bi

- Natural language only - No function implementation, only user utterance based on apps prompting. For instance, “Bob plans his trip on the TripAdvisor app.”, while the action is logged in free text there is no function implementing “plan_trip”. This does not simulate behavior end to end and have limited digital assets (example a calendar invite can’t be sent without a mechanism to pass the information to another agent)
- Simulated simple app behavior - Building basic code components emulating real app behavior with required digital assets such as app memory and logs. For example, a calendar app will maintain a data structure that will represent a calendar to which we can add, remove and read meetings.
- LLM prompt based - App functions can also be implemented by prompting an LLM. For example, Search can be implemented by querying an LLM to act as a search engine and retrieve information, the same for a trip planner.
- Real app integration - integration with a real app API Instead of emulating behavior, which would make the simulation function as a sandbox to test drive and evaluate different experiences in shorter development cycles before releasing them to human testers. An immediate example can be Search, one can directly query a search engine with a question and receive information. Another example is to integrate a general AI assistant and enable the simulated agent, functioning as a user, to interact with it through the simulation.

:::zh

- 仅自然语言：没有函数实现，只有基于应用提示的用户话语。例如，“Bob 在 TripAdvisor 应用上规划他的旅行。”，虽然该动作以自由文本记录，但没有实现“plan_trip”的函数。这不会端到端地模拟行为，而且数字资产有限（例如，没有把信息传递给另一个智能体的机制，日历邀请就无法发送）
- 模拟简单应用行为：构建基本的代码组件，模拟真实应用的行为，并配备所需的数字资产，例如应用内存和日志。例如，一个日历应用会维护一个表示日历的数据结构，我们可以向其中添加，删除和读取会议。
- 基于 LLM 提示：应用函数也可以通过提示 LLM 来实现。例如，搜索可以通过查询 LLM 来充当搜索引擎并检索信息来实现，旅行规划器也是如此。
- 真实应用集成：与真实应用 API 集成，而不是模拟行为，这将使模拟充当一个沙盒，在更短的开发周期内试驾和评估不同体验，然后再交给人类测试者。一个直接的例子是搜索，可以直接用问题查询搜索引擎并接收信息。另一个例子是集成一个通用 AI 助手，让被模拟的智能体以用户身份通过模拟与之交互。
:::

### 数据生成与服务评估（Data generation and service evaluation）

:::bi

In modern systems, data is the new king. A large amount of high-quality data is needed in order to build and evaluate services and models. Yet, collecting and curating user data is often challenging, especially when dealing with personal user data where privacy is of high concern. This creates a chicken-egg scenario, where data is needed for building of modern systems yet users might be reluctant to provide said that without immediate benefit.

:::zh

在现代系统中，数据是新王。构建和评估服务与模型需要大量高质量数据。然而，收集和整理用户数据往往具有挑战性，尤其是涉及个人用户数据时，隐私问题备受关注。这就造成了一种先有鸡还是先有蛋的局面：构建现代系统需要数据，而用户在没有直接好处的情况下可能不愿意提供这些数据。
:::

:::bi

Moreover, when considering the case of evaluating personalized services where each instance is specific and tailored to the individual user, it makes the problem even more substantial. How can one A/B test a personalized service at the single user level?

:::zh

此外，当考虑评估个性化服务的情形时，每个实例都是针对单个用户专门定制的，这使问题变得更加突出。人们如何能在单个用户层面上对个性化服务进行 A/B 测试？
:::

:::bi

The grounded action space illustrated in the last section offers a conceptual way to overcome some of these challenges by simulating synthetic users and allowing them to interact with real services. This can allow generation of synthetic user activity by constructing, via simulation, agent digital action logs along with agent reasoning for each action. This data can serve as training data, or evaluation. By repeated simulation with different services configurations, one can perform at the single user level A/B testing of a service.

:::zh

上一节所展示的落地动作空间提供了一种概念性的方法，通过模拟合成用户并让它们与真实服务交互来克服其中的一些挑战。这可以通过模拟构建智能体的数字动作日志以及每个动作的智能体推理，来生成合成用户活动。这些数据可以用作训练数据或评估数据。通过在不同服务配置下反复模拟，人们可以在单个用户层面上对服务进行 A/B 测试。
:::

:::annotation
这一节给出最直接的应用：造合成用户去 A/B 测试个性化服务。传统方法要么贵，要么不可规模化，而用生成式智能体可以在单人粒度上反复模拟。
:::

:::bi

Nevertheless, it is important to note that this concept is contingent on the ability of the underlying LLM and system to faithfully capture user experience and realistic behaviour. Therefore the viability of this approach is highly dependent on the representation and reasoning power of the LLM, and the use of best practices.

:::zh

尽管如此，重要的是要指出，这一概念取决于底层 LLM 和系统忠实捕捉用户体验与现实行为的能力。因此，这种方法的可行性高度依赖于 LLM 的表示能力和推理能力，以及对最佳实践的运用。
:::

### 计算机上的（in silico）序贯社会困境实验（Sequential social dilemmas experiments in silico）

:::bi

Concordia adds to the toolbox for studying multi-agent problems such as resource management, social dilemmas, commons problems, cooperation, equilibrium selection, and coordination (Leibo et al., 2017; Leibo et al., 2021). Previously these problems have either been cast as matrix games or as multi-agent RL (MARL) (Hertz et al., 2023). Now it is clear that many researchers, including us, see that an LLM-based approach is possible and will have many advantages, as evidenced by the fact that quite a few frameworks for social modeling with LLMs appeared this year (Wu et al., 2023; Zhou et al., 2023; Kaiya et al., 2023). We see generative agents as the next step in the evolutionary line of “model animals” after ‘Homo-economicus’ and ‘Homo-RLicus’.

:::zh

Concordia 为研究多智能体问题（如资源管理，社会困境，公地问题，合作，均衡选择和协调）的工具箱增添了新成员（Leibo et al., 2017; Leibo et al., 2021）。此前，这些问题要么被表述为矩阵博弈，要么被表述为多智能体强化学习（MARL）（Hertz et al., 2023）。如今很明显，包括我们在内的许多研究者都看到，基于 LLM 的方法是可行的，并且会带来许多优势，这一点由今年出现了相当多用于社会建模的 LLM 框架这一事实所证明（Wu et al., 2023; Zhou et al., 2023; Kaiya et al., 2023）。我们把生成式智能体看作“模型动物”演化谱系中继“Homo-economicus”和“Homo-RLicus”之后的下一步。
:::

:::annotation
作者把生成式智能体排在“模型动物”进化线的最新一环：先是经济人（Homo economicus），再是 RL 人（Homo-RLicus），现在是生成式智能体。这条线的共同点是研究规则，规范，公地治理这类多智能体问题。
:::

:::bi

Generative agent-based modeling makes it possible to investigate how rules, laws and social norms formulated in language influence, for example, the management of shared resources (e.g. Yocum et al. (2023)). With Concordia we will be able to investigate whether the demands of sharing a resource *give rise* to rules, laws and norms capable of governing that resource (and under what circumstances this works or does not)—i.e. whether rules are emergent, and what the conditions are for their emergence. For example, Hadfield and Weingast (2013) proposed that legal order can emerge without centralised enforcement in certain circumstances. They demonstrate this using historical examples from gold-rush in California and medieval Iceland. Concordia could be used to simulate those examples and enable further insights into the nature of legal order. For example, we could check whether certain demographic assumptions are necessary by varying the number of agents.

:::zh

生成式智能体建模（GABM）使得研究以语言表述的规则，法律和社会规范如何影响（例如）共享资源的管理成为可能（例如 Yocum et al. (2023)）。借助 Concordia，我们将能够研究共享资源的需求是否会*催生*能够治理该资源的规则，法律和规范（以及在什么情况下这行得通或行不通），也就是说，规则是否是涌现的，以及它们涌现的条件是什么。例如，Hadfield and Weingast (2013) 提出，在某些情况下，法律秩序可以在没有集中强制执行的情况下涌现。他们用加利福尼亚淘金热和中世纪冰岛的历史例子证明了这一点。Concordia 可以用来模拟这些例子，并加深对法律秩序本质的洞察。例如，我们可以通过改变智能体的数量来检验某些人口学假设是否必要。
:::

### Concordia 可以实现经典和当代的心理学模型（Concordia can implement classic and contemporary psychological models）

:::bi

Many influential psychological models have distinguished between more associative and more deliberative processes for decision-making (e.g. Schneider and Shiffrin (1977); Kahneman et al. (2002); Dayan (2009)). Whereas implicit-associative processes learn the regularity of the world slowly for intuitive judgment, the explicit-deliberative processes are thought to be more linguistically mediated and allow for symbolic inference and faster learning in novel situations (Greenwald and Banaji (1995); Wilson et al. (2000)). Because the implicit-associative models are conceptually easy to model within connectionist or neural network frameworks (Smith (2009)), many ABMs have been more closely aligned with models of individual decision making that focus on its associative processes or the associative parts of complex models, and have neglected their more symbolic and deliberative aspects. Many of these more symbolic psychological models take an “arrow and box” approach to theorizing which describe high level processes and transformations of information, and often posit sequential steps of information flow. Now using generative agents like Concordia such symbolic and deliberative aspects of cognition are also easy to capture in computational models.

:::zh

许多有影响力的心理学模型区分了更具联想性的决策过程与更具慎思性的决策过程（例如 Schneider and Shiffrin (1977)，Kahneman et al. (2002)，Dayan (2009)）。内隐联想过程缓慢地学习世界的规律以进行直觉判断，而外显慎思过程被认为更多地以语言为中介，并允许在新情境中进行符号推理和更快的学习（Greenwald and Banaji (1995)，Wilson et al. (2000)）。由于内隐联想模型在概念上很容易在联结主义或神经网络框架内建模（Smith (2009)），许多 ABM 更贴近那些侧重于联想过程或复杂模型中联想部分的个体决策模型，而忽略了它们更符号化和慎思性的方面。这些更符号化的心理学模型中有许多采用“箭头加方框”的方法进行理论化，描述高层次的信息处理和转换，并常常假定信息流动的连续步骤。现在，使用像 Concordia 这样的生成式智能体，认知的这些符号化和慎思性方面也很容易在计算模型中捕捉到。
:::

:::bi

Take for instance the ways that attitudes—pre-existing beliefs and feelings about an object, person, or situation—guide behaviour. Whereas implicit attitudes are thought to quickly guide actions through the direct biasing of perception and behaviour, explicit attitudes are thought to guide behaviour through deliberation and consideration of additional situational factors (Fazio (1990); Gawronski and Bodenhausen (2011); Olson and Fazio (2008)). One example model in which deliberative processes can guide behaviour is Ajzen (1991)’s theory of planned behavior. This model holds that the tendency to emit a particular behavior is determined by an individual’s attitude toward the behavior, norms related to the behavior, and perceived control over the behavior. This approach to decision-making is qualitatively different from an RL approach which slowly builds a policy that directly generates behavioral responses from states and contexts. In such a model, different questions regarding the agent’s current state are queried as in Concordia components, and then integrated into a behavioural intent which serves like a plan. These operations can easily be described as Concordia components, with the appropriate inputs, transformations, and outputs described verbally. Such a scheme would be much harder or impossible to implement in a traditional neural network model of decision making.

:::zh

以态度（关于某个对象，人物或情境的先在信念和感受）引导行为的方式为例。内隐态度被认为通过直接偏置知觉和行为来快速引导动作，而外显态度被认为通过慎思和考虑额外的情境因素来引导行为（Fazio (1990)，Gawronski and Bodenhausen (2011)，Olson and Fazio (2008)）。慎思过程可以引导行为的一个示例模型是 Ajzen (1991) 的计划行为理论。该模型认为，表现出某种特定行为的倾向由个体对该行为的态度，与该行为相关的规范以及对该行为的感知控制所决定。这种决策方法与 RL 方法有质的区别，后者缓慢地构建一个策略，直接从状态和语境生成行为反应。在这样的模型中，针对智能体当前状态的不同问题像 Concordia 组件那样被查询，然后整合成一种行为意图，它充当类似计划的作用。这些操作可以很容易地描述为 Concordia 组件，并口头描述适当的输入，转换和输出。这样的方案在传统的决策神经网络模型中会难得多，甚至不可能实现。
:::

:::bi

To realize Ajzen (1991)’s theory using Concordia the following components could be built. The first component would generate a set of possible behaviours given the agent’s current state. Then, this set of possible behaviours would be queried through a set of components that would evaluate each behavioral option. Specifically, one component would determine the agents attitudes towards the behavior ("do I have a positive or negative evaluation or feeling about [behavior]"), one component can determine the social or situational norms about the behavior "do I believe that most people approve or disapprove of [behavior]?," and finally a component would determine the agents perceived behavioral control to perform the behavior "how easy or difficult would it be for me to perform [behavior] right now and how likely would it be to succeed?". The outputs of these components would then be concatenated into the plan, serving as the behavioral intention for action. Thus, a sequence of modular processes can be organized to build a computational model of higher level cognition. Critically, an agent’s decisions can be quickly shifted as it learns new information or considers new information in any of these components, leading to rapid and contextually appropriate changes in behavioral profiles.

:::zh

为了用 Concordia 实现 Ajzen (1991) 的理论，可以构建以下组件。第一个组件会根据智能体的当前状态生成一组可能的行为。然后，这组可能的行为会通过一组组件进行查询，这些组件会评估每个行为选项。具体而言，一个组件会确定智能体对该行为的态度（“我对[行为]持正面还是负面的评价或感受”），一个组件可以确定关于该行为的社会规范或情境规范（“我相信大多数人赞成还是不赞成[行为]？”），最后还有一个组件会确定智能体执行该行为的感知行为控制（“我现在执行[行为]有多容易或多困难，成功的可能性有多大？”）。这些组件的输出随后会被拼接进计划，充当行动的行为意图。这样，就可以组织起一系列模块化过程，构建一个更高层次认知的计算模型。关键在于，当智能体在任何这些组件中学习到新信息或考虑新信息时，其决策可以迅速转变，从而导致行为画像快速且切合语境地变化。
:::

:::annotation
计划行为理论这类“箭头盒子”式的心理学模型，传统神经网络很难直接实现，但用 Concordia 组件可以照搬：几个组件分别评估态度，规范，知觉控制，再拼成行为意图。
:::

:::bi

Generative agents are not useful just for decision making models. As another example, psychological constructivist models assume that people have a set of psychological primitives that underlie cognition (akin to Concordia’s components), but that people learn to conceptualize their experiences and mental states to build useful categories for behavior. In the emotion domain, this perspective suggests that emotions like "fear" and "anger" are not psychological primitives, but rather come about though people’s constructed categorization of their body and mental states (Barrett (2006)). Indeed, several of these models suggest that conceptualization is a necessary component for the generation of discrete emotion representations for understanding oneself or others (Barrett (2014)). To the extent that conceptualization is linguistically mediated, a Concordia agent can relatively easily generate emotional categories that would be nearly impossible in a standard RL agent.

:::zh

生成式智能体不仅对决策模型有用。另一个例子是，心理建构主义模型假设人们拥有一组构成认知基础的心理原语（类似于 Concordia 的组件），但人们学会将自己的经验和心理状态概念化，以构建对行为有用的类别。在情绪领域，这种观点认为像“恐惧”和“愤怒”这样的情绪不是心理原语，而是通过人们对身体和心理状态的建构性分类而产生的（Barrett (2006)）。事实上，其中一些模型表明，概念化是生成离散情绪表征以理解自己或他人的必要组件（Barrett (2014)）。在概念化以语言为中介的范围内，Concordia 智能体可以相对容易地生成情绪类别，而这在标准 RL 智能体中几乎是不可能的。
:::

:::bi

The modular nature of Concordia’s component system offers a robust platform for empirically testing psychological hypotheses. This is accomplished by constructing agents whose psychological processes are intricately modeled after diverse cognitive frameworks. The agents may then be subjected to rigorously controlled experimental conditions, orchestrated by the game master. Such an approach allows for the systematic evaluation of models against empirical human data, serving as a benchmark for their algorithmic fidelity and psychological realism. Moreover, this system facilitates hypothesis generation through the simulation of different cognitive models in simulated experimental designs that can be validated on human participants.

:::zh

Concordia 组件系统的模块化本质为经验性地检验心理学假设提供了一个稳健的平台。这是通过构建心理过程精心模仿多种认知框架的智能体来实现的。然后，这些智能体可以被置于由游戏主持人（GM）精心控制的严格实验条件下。这种方法允许将模型与经验性人类数据系统地进行对照评估，从而成为衡量其算法保真度和心理真实性的基准。此外，该系统通过在模拟实验设计中模拟不同的认知模型来促进假设生成，这些设计可以在人类参与者身上得到验证。
:::

:::bi

Here we have mostly discussed the case of using an LLM as the generative engine for the agents. This could lead one to think these ideas are restricted to the language space, which would be a limitation if true. However, we could use any foundation model as the generative engine. In particular, multimodal foundation models capable of operating over images, sounds, or motor actuation could be used. Current multi-modal foundation models such as Li et al. (2023a) are developing rapidly and promise the ability to both comprehend and generate data across domains. In the future Concordia models will be able to sample over an abstract token space, which can then be cast in any modality.

:::zh

在这里，我们主要讨论了使用 LLM 作为智能体生成引擎的情形。这可能会让人以为这些想法仅限于语言空间，如果真是这样，那将是一种局限。然而，我们可以使用任何基础模型作为生成引擎。特别是，能够处理图像，声音或运动驱动的多模态基础模型都可以使用。当前的多模态基础模型，例如 Li et al. (2023a)，正在迅速发展，并有望具备跨领域理解和生成数据的能力。未来，Concordia 模型将能够在一个抽象令牌空间上进行采样，然后将其投射到任意模态。
:::

### 具备透明审计和功劳分配的 AI 助手（AI assistants with transparent auditing and credit assignment）

:::bi

Concordia agents can also be used as assistants or synthetic workers. The component system provides a modular and transparent way for the agent designer to define the agents‘ policy. Some generic components for perception, action, and tool use could be standardised and re-used, while some application and context specific components designed or adjusted by the end-user themselves. The fact the the policy is specified through natural language, rather than a reward or utility, is a feature that would make such agents more versatile and easier to define. For example, a digital secretary can be easily instructed with a phrase "help Priya manage her social calendar, but don’t change the work schedule", which would be much harder to specify with a quantitative reward. Concordia agents can potentially lead to development of AI agents capable of intricate social cognition, which would make them safe and dynamically aligned with the current cultural norm.

:::zh

Concordia 智能体也可以用作助手或合成工作者。组件系统为智能体设计者提供了一种模块化且透明的方式来定义智能体的策略。一些用于感知，动作和工具使用的通用组件可以标准化并复用，而一些针对应用和语境的特定组件则由最终用户自己设计或调整。策略通过自然语言而不是奖励或效用来指定这一事实，是一个使此类智能体更加通用，更易定义的特性。例如，一句“帮 Priya 管理她的社交日历，但不要更改工作日程”就能轻松指示一位数字秘书，而用定量奖励来指定这一点会困难得多。Concordia 智能体有可能推动具备精细社会认知的 AI 智能体的发展，这将使它们安全并动态地与当前文化规范保持一致。
:::

:::bi

Moreover, the Component system facilitates transparency in agent operations since the “chain of thought” leading up to any decision of a Concordia agent could be stored and made available for auditing. Each episode creates a complete trace of component states $\mathbf{z}_{t}$ and the resulting actions $a_{t}$. For every action, a human auditor can asses whether it is reasonable under $\mathbf{z}_{t}$ or not. If it is not, than the credit goes to the LLM $p$, which has to be updated. This can mean adding the $(\mathbf{z}_{t},a_{t})$ pair into a dataset that can be later used for fine-tuning or RLHF. If, however, the $a_{t}$ is deemed reasonable, given $\mathbf{z}_{t}$, then the credit goes to the components and their specification. The auditor can then manipulate the components to find the source of undesired behaviour and use it to improve the agent.

:::zh

此外，组件系统促进了智能体操作的透明性，因为通往 Concordia 智能体任何决策的“思维链”都可以被存储起来并供审计使用。每个回合都会创建一条完整的组件状态 $\mathbf{z}_{t}$ 以及由此产生的动作 $a_{t}$ 的轨迹。对于每个动作，人类审计员可以评估它在 $\mathbf{z}_{t}$ 下是否合理。如果不合理，那么功劳就归于需要更新的 LLM $p$。这可能意味着把 $(\mathbf{z}_{t},a_{t})$ 对加入一个数据集，该数据集之后可以用于微调或 RLHF。然而，如果给定 $\mathbf{z}_{t}$，$a_{t}$ 被认为是合理的，那么功劳就归于组件及其规范。然后，审计员可以操控组件来找出不良行为的根源，并利用它来改进智能体。
:::

:::annotation
因为思维链是自然语言，所以每一跳都能被审计。作者主张这能把责任精确到具体哪一次 LLM 调用出了伦理问题，这是生成式智能体在安全上相对黑箱系统的一个卖点。
:::

:::bi

Scheurer et al. (2023) describe an interesting case where a generative agent modeling an employee of a financial trading firm proves willing to engage in illegal trading based on insider information and strategically deceive others to hide this activity. In real life such outcomes could perhaps be mitigated by designing thought process transparency and capacity for thought auditing after the fact into any generative agent models that would actually be deployed. At least the transparency of the thought process may help assigning responsibility for an ethical lapse to a particular LLM call, perhaps one causing the agent to fail to retrieve its instruction not to engage in illegal activity from memory at the moment when it could prevent the decision to do so. Being able to pinpoint which LLM call in a chain of thought is the problematic one does not remove the longstanding question of neural network interpretability within the specific LLM call (e.g. Adadi and Berrada (2018)). But it does make the issue much easier to mitigate. Since a Concordia-style generative agent has a Python program laying out its chain of thought, that means that as long as the individual LLM call where the unethical behavior originated can be isolated, which should be easy in an audit, then a variety of mitigations are possible. For instance, the agent could potentially be fixed by designing more safeguards into its chain of thought such as generating multiple plans and critiquing them from the perspective of morality, legality, etc (Agüera y Arcas, 2022; Bai et al., 2022; Weidinger et al., 2023).

:::zh

Scheurer et al. (2023) 描述了一个有趣的案例：一个模拟金融交易公司雇员的生成式智能体被证明愿意基于内幕信息从事非法交易，并有策略地欺骗他人来掩盖这一行为。在现实生活中，通过在任何实际部署的生成式智能体模型中设计思维过程的透明性和事后思维审计的能力，或许可以缓解此类结果。至少，思维过程的透明性可能有助于把道德失当的责任归到某次特定的 LLM 调用上，也许正是某次调用导致智能体在能够阻止这一决定的那一刻，未能从记忆中取出它不得从事非法活动的指令。能够精确定位思维链中哪次 LLM 调用是问题所在，并不能消除在特定 LLM 调用内部长期存在的神经网络可解释性问题（例如 Adadi and Berrada (2018)）。但它确实使问题更容易缓解。由于 Concordia 风格的生成式智能体有一个 Python 程序来展开其思维链，这意味着只要能够隔离不道德行为所源自的那次单独 LLM 调用（在审计中应该很容易），那么各种缓解措施就都是可能的。例如，可以通过在其思维链中设计更多保障措施来潜在地修复该智能体，比如生成多个计划，并从道德，合法性等角度对它们进行批评（Agüera y Arcas, 2022; Bai et al., 2022; Weidinger et al., 2023）。
:::

:::bi

The fact that the internal processing of a Concordia agent is largely conducted in natural language raises new opportunities to develop participatory design protocols where stakeholders can directly modify agents without the intermediaries who are usually needed to translate their ideas into code (Birhane et al., 2022). A generative agent “reasons” in natural language, and its chain of thought can be steered in natural language. It should be possible to extend participation in the design of such agents to a much wider group of stakeholders.

:::zh

Concordia 智能体的内部处理在很大程度上以自然语言进行，这一事实为开发参与式设计协议带来了新机会，在这种协议中，利益相关者可以直接修改智能体，而无需通常把他们的想法翻译成代码所需的中介（Birhane et al., 2022）。生成式智能体用自然语言“推理”，其思维链也可以用自然语言来引导。应该有可能把此类智能体设计的参与范围扩展到更广泛的利益相关者群体。
:::

### 涌现与 Concordia 的多尺度建模（Emergence and multi-scale modeling with Concordia）

:::bi

Demonstrating the emergence of a particular social phenomena from the behaviour of individual agents, which are not explicitly instructed to produce it, is important an important topic in multi-agent research (Walker and Wooldridge, 1995; Leibo et al., 2019; Leibo et al., 2021; Axtell et al., 2001). Indeed, much of what is distinctive about human intelligence is hypothesised to be an emergent social phenomena involving multi-scale interactions (Henrich, 2016; Wilson et al., 2013). DeLanda (2011), for example, explores the topic of emergence and simulation across various fields. While the wider ABM field has studied multi-scale models (Tesfatsion, 2023), the approaches based on deep reinforcement learning have been limited by being able to only deal with one fixed scale of the simulation: individual agents (e.g. Johanson et al. (2022); Zheng et al. (2022)), and scaling deep RL to large numbers of agents would be computationally difficult.

:::zh

展示某种特定的社会现象如何从个体智能体的行为中涌现出来，而这些智能体并未被显式要求去产生该现象，是多智能体研究中的一个重要议题（Walker and Wooldridge, 1995; Leibo et al., 2019; Leibo et al., 2021; Axtell et al., 2001）。事实上，人类智能的许多独特之处被假设为一种涉及多尺度交互的涌现性社会现象（Henrich, 2016; Wilson et al., 2013）。例如，DeLanda (2011) 探索了多个领域中涌现与模拟这一主题。虽然更广泛的 ABM 领域已经研究过多尺度模型（Tesfatsion, 2023），基于深度强化学习的方法却一直受限于只能处理模拟中一个固定的尺度，也就是个体智能体（例如 Johanson et al. (2022); Zheng et al. (2022)），而把深度 RL 扩展到大量智能体在计算上会很困难。
:::

:::bi

Concordia allows modeling systems across multiple scales, where phenomena at each scale constitute a substrate for the emergence of the phenomena on the next scale (Koestler, 1967; DeLanda, 2011; Duéñez-Guzmán et al., 2023). For example, individual agents form a substrate from which social institutions and organisations can arise. Through engaging in exchange of goods and services, the agents can create an economy and, for example, start a bank. Modelling a banking system this way would be, most likely, computationally prohibitive.
Since in Concordia the agents (or GM) need not represent individuals, but could be organisations, institutions or even nation states, we could enrich simulations by adding generative agent versions of other entities such as banks and businesses. They could be modeled with coarser resolution, not just as emerging from the activities of individual agents, but could be made accurate for instance by incorporating precise models of how they operate.
Such simulations could be used to model how interventions (e.g. a central bank interest rate decision) propagate across macro and micro scales of economic activity.

:::zh

Concordia 允许跨多个尺度对系统进行建模，其中每个尺度上的现象构成下一个尺度上现象涌现的基质（Koestler, 1967; DeLanda, 2011; Duéñez-Guzmán et al., 2023）。例如，个体智能体构成一个基质，社会机构和组织可以从中产生。通过参与商品和服务的交换，智能体可以创造出一个经济体，例如开办一家银行。以这种方式为银行系统建模，很可能在计算上是不可行的。

由于在 Concordia 中，智能体（或 GM）不必代表个体，而可以是组织和机构甚至民族国家，我们可以通过加入银行和企业等其他实体的生成式智能体版本来丰富模拟。它们可以用更粗的分辨率来建模，不只是作为个体智能体活动的涌现结果，例如还可以通过纳入它们如何运作的精确模型而变得准确。

这类模拟可以用来建模干预措施（例如央行利率决策）如何在经济活动的宏观和微观尺度之间传播。
:::

:::annotation
多尺度建模是论文埋的远景：智能体不必只代表个人，也可以是机构，组织甚至国家。不同尺度各成一个层次，低层现象构成高层现象涌现的基质。
:::

## 未来工作（Future work）

:::bi

Since there is no consensus at present concerning how to interpret results of LLM-based simulations of human populations, the future work will address the critical epistemic question: “by what standard should we judge whether (and in what ways, and under which conditions) the results of in silico experiments are likely to generalize to the real world?”. These are not questions any one group of researchers can answer by themselves; rather these issues must be negotiated by the community as a whole. This is is why we release Concordia early and with only few examples. It is an invitation to the researchers from various fields that are interested in GABM to come onboard and participate in the creation of validating procedures, best practices, and epistemic norms.

:::zh

由于目前对于如何解读基于 LLM 的人类群体模拟结果尚无共识，未来工作将处理一个关键的认识论问题：“我们应该依据什么标准来判断计算机上的（in silico）实验的结果是否可能（以及在哪些方面，在哪些条件下）泛化到现实世界？”这些问题不是任何一个研究团队能够独自回答的，而是必须由整个社区共同协商。这正是我们尽早发布 Concordia 且只附带少量示例的原因。它是向来自各个领域，对 GABM 感兴趣的研究者发出的一份邀请，请他们加入进来，共同参与制定验证流程，最佳实践和认识论规范。
:::

:::bi

We plan to add the following over the coming months:

:::zh

我们计划在未来几个月内加入以下内容：
:::

:::bi

- New example environments
- Integration with different LLMs to see which are more suitable for constructing GABMs (e.g., they act “reasonably”, are internally consistent, apply common sense, etc).
- Improving agents—better associative memory, context-driven and dynamic component assemblage, tool use.
- Visualisation and audit tools.
- Snapshot—serializing and persisting the simulation at specific episode, to enable to later resumption and performance comparison of different approaches for a specific scenario.
- Keyframes—conditioning the agent actions to be consistent with future key action or of narrative. This allow steering the simulation more granularly and addresses an inherent issue that is caused by the fact that there is no guarantee that due to the stochastic nature of GABMs, ongoing simulations might diverge from their intended topic.

:::zh

- 新的示例环境
- 与不同 LLM 集成，以观察哪些更适合构建 GABM（例如它们行为“合理”，内部一致，能运用常识等）。
- 改进智能体：更好的联想记忆，由语境驱动的动态组件组装和工具使用。
- 可视化与审计工具。
- Snapshot：在特定回合将模拟序列化并持久化，以便之后恢复运行，并对同一具体场景下不同方法的性能进行比较。
- Keyframes：约束智能体动作，使其与未来的关键动作或叙事保持一致。这能更细粒度地引导模拟，并解决一个固有问题：由于 GABM 的随机性，无法保证正在进行的模拟不会偏离其预设主题。
:::

## 结论（Conclusion）

:::bi

The approach to generative agent-based modeling we described here provides researchers and other users with tools to specify detailed models of phenomena that interest them or of technologies and policies they seek to evaluate. Of course, like all research methodologies it should be expected to come with its own strengths and weaknesses. We hope to discover more about when this style of modeling can be fruitfully applied in the future. While there are no panaceas for modeling, we think there are good reasons to look to GABM (and Concordia in particular) when constructing models of social phenomena, especially when they involve communication, social construction of meaning, and common sense, or demand flexibility in defining grounded physical, social, or digital environments for agents to interact in.

:::zh

我们在本文中描述的生成式智能体建模方法为研究者和其他用户提供了工具，让他们能够详细刻画自己感兴趣的现象，或他们希望评估的技术与政策。当然，与所有研究方法一样，它应该也有自己的长处与短处。我们希望未来能更多地了解这种建模风格在哪些时候能被有效应用。虽然建模没有万能药，但我们认为在构建社会现象模型时有充分的理由考虑 GABM（尤其是 Concordia），特别是当这些现象涉及沟通，意义的社会建构和常识，或需要在为智能体定义有现实落点的物理，社会或数字交互环境时保持灵活性。
:::

:::bi

Concordia is available on GitHub (Footnote: here: https://github.com/google-deepmind/concordia).

:::zh

Concordia 已发布在 GitHub 上，代码仓库地址见这里（Footnote: here: https://github.com/google-deepmind/concordia）。
:::

## 附录 A：实现细节（Implementation details）

:::bi

This section gives an overview of the Concordia code.
To familiarise oneself with Concordia, we recommend to first look at the abstract class definitions in *concordia/typing*. You will find the definition of agent, GM, component, and clock interfaces. We then recommend to take a look at the *concordia/agents/basic_agent.py* for the structure of the generative agent and then *concordia/environments/game_master.py* for the GM.

:::zh

本节概述 Concordia 的代码。

要熟悉 Concordia，我们建议先看 *concordia/typing* 中的抽象类定义。你会在那里找到智能体，GM，组件和时钟接口的定义。然后我们建议看 *concordia/agents/basic_agent.py* 了解生成式智能体的结构，再看 *concordia/environments/game_master.py* 了解 GM。
:::

### 智能体（Agents）

:::bi

The agent class implements three methods:

:::zh

智能体类实现了三个方法：
:::

:::bi

- *.name()*—returns the name of the agent, that is being referred to in the simulation. It is important that all agents have unique names;
- *.observe(observation: str)*—a function to take in an observation;
- *.act(action spec)*—returns the action (as a string), for example "Alice makes breakfast". The function takes in action spec, which specifies the type of output (free form, categorical, float) and the specific phrasing of the *call to action*. For example, the call to action could be “what would Alice do in the next hour?”, in this case the answer type would be free form. Or it could be “Would Alice eat steak for dinner?” with answer type of binary choice (yes / no).

:::zh

- *.name()*：返回该智能体的名字，也就是模拟中用来称呼它的名字。重要的是所有智能体的名字必须唯一。
- *.observe(observation: str)*：一个接收观察的函数。
- *.act(action spec)*：返回动作（以字符串形式），例如 “Alice makes breakfast”。该函数接收 action spec，它规定了输出的类型（自由形式，类别或浮点数）以及 *call to action* 的具体措辞。例如，call to action 可以是 “what would Alice do in the next hour?”，此时答案类型为自由形式。它也可以是 “Would Alice eat steak for dinner?”，此时答案类型为二元选择（是 / 否）。
:::

:::bi

The agent class constructor is parameterised by a list of components. The components of agent have to implement the following functions:

:::zh

智能体类的构造函数由一组组件参数化。智能体的组件必须实现以下函数：
:::

:::bi

- *.state()*—returns the state of the component $z^{i}$, for example "Alice is vegetarian";
- *.name()*—returns the name of the components, for example "dietary preferences";
- *.update()*—updates the state of the component by implementing; eq. (2). Optional, can pass for constant constructs;
- *.observe(observation: str)*—takes in an observation, for later use during update. Optional. Observations always go into the memory anyway, but some components are easier to implement by directly subscribing to the observation stream.

:::zh

- *.state()*：返回组件 $z^{i}$ 的状态，例如 “Alice is vegetarian”。
- *.name()*：返回组件的名字，例如 “dietary preferences”。
- *.update()*：通过实现 eq. (2) 来更新组件的状态。可选，对于常量构造可以留空。
- *.observe(observation: str)*：接收一个观察，供 update 时后续使用。可选。观察无论如何都会进入记忆，但有些组件直接订阅观察流会更容易实现。
:::

:::bi

During an episode **, on each timestep,** each agent calls *.state()* on all its components to construct the context of its next decision and implements eq. (1) (the components’ states are concatenated in the order supplied to the agents’ constructor). *.observe()* is called on each component whenever it receives observations, and *.update()* is called at regular intervals (configurable in the constructor). Unlike in RL, we do not assume that the agent will produce an action after every observation. Here the GM might call *.observe()* several times before it calls *.act()*.

:::zh

在一个回合中，每个时间步上，每个智能体都会对自己所有组件调用 *.state()*，以构建其下一次决策的语境，并实现 eq. (1)（各组件状态按传入智能体构造函数的顺序拼接）。每当收到观察时，每个组件都会被调用 *.observe()*，而 *.update()* 则按固定间隔被调用（间隔可在构造函数中配置）。与 RL 不同，我们不假设智能体在每次观察之后都会产生一个动作。在这里，GM 可能在调用 *.act()* 之前多次调用 *.observe()*。
:::

### 游戏主持人的实现（Game master implementation）

:::bi

The GM class implements three methods:

:::zh

GM 类实现了三个方法：
:::

:::bi

- *.name()*—returns the name of the GM;
- *.update_from_player(player_name, action)*—this method consumes players action and creates an event statement;
- *.run_episode*—Runs a single episode of the simulation.

:::zh

- *.name()*：返回 GM 的名字。
- *.update_from_player(player_name, action)*：该方法消费玩家的动作并生成一条事件陈述。
- *.run_episode*：运行模拟的一个回合。
:::

### GM 组件（GM components）

:::bi

Game Master components implement the following methods:

:::zh

游戏主持人组件实现以下方法：
:::

:::bi

- *.name()*—returns the name of the components, for example "location of players";
- *.state()*—returns the state of the component $z^{i}$, for example "Alice is at the pub; Bob is at the gas station";
- *.partial_state(player_name)*—state of the component to expose to the player. For example, location component would only expose the location of the player to themselves, but not the location of others.
- *.update()*—updates the state of the component by implementing; eq. (2);
- *.update_before_event(cause_statement)*—update the component state before the event statement from the cause, which is the players action i.e. "Bob calls Alice.";
- *.update_after_event(event_statement)*—update the component state directly from the event statement. For example "Bob called Alice, but she didn’t respond.";
- *terminate_episode()*—if component returns true, the GM will terminate the episode.

:::zh

- *.name()*：返回组件的名字，例如 “location of players”。
- *.state()*：返回组件 $z^{i}$ 的状态，例如 “Alice is at the pub; Bob is at the gas station”。
- *.partial_state(player_name)*：要向玩家公开的组件状态。例如，位置组件只会把玩家自己的位置公开给该玩家，而不会公开其他人的位置。
- *.update()*：通过实现 eq. (2) 来更新组件的状态。
- *.update_before_event(cause_statement)*：在事件陈述之前，根据原因（即玩家的动作）更新组件状态，例如 “Bob calls Alice.”。
- *.update_after_event(event_statement)*：直接根据事件陈述更新组件状态。例如 “Bob called Alice, but she didn’t respond.”。
- *terminate_episode()*：如果组件返回 true，GM 将终止该回合。
:::

:::bi

One step of environment consists of GMs interactions with each player, which are arranged in a (random) initiative order. The GM advances the clock either after each or all the players make take their actions (Footnote: Controlled by a flag in the GM constructor.). To process the players action, the GM calls the components functions in the following order. First, for each component the GM calls *.update*, then *.partial_state* and sends the output to the agent as an observation. The GM then calls *.act* on the player and receives the attempted action and uses it to call *.update_before_event*.
Now GM can construct its context by calling *.state* on the components. GM then executes the chain of thought to create the event statement. After that it calls *.update_after_event* on all components. As the last step, GM calls *terminate_episode* and if any of the components returns True, the episode is terminated.

:::zh

环境的一个步骤由 GM 与每个玩家的交互组成，这些交互按（随机的）先攻顺序排列。GM 要么在每位玩家行动之后推进时钟，要么在所有玩家都行动之后推进时钟（Footnote: Controlled by a flag in the GM constructor.）。为了处理玩家的动作，GM 按以下顺序调用组件函数。首先，对每个组件，GM 调用 *.update*，然后调用 *.partial_state* 并把输出作为观察发送给智能体。接着 GM 对该玩家调用 *.act*，收到其尝试的动作后，用它调用 *.update_before_event*。

现在 GM 可以通过对组件调用 *.state* 来构建自己的语境。然后 GM 执行思维链以生成事件陈述。之后它对所有组件调用 *.update_after_event*。最后一步，GM 调用 *terminate_episode*，如果任一组件返回 True，该回合即被终止。
:::

:::bi

In Concordia all custom functionality is implemented through components. For grounded variables, which are tracked in Python, a specialised component is created to maintain the variable’s state, update it after relevant events, and represent it to the GM in linguistic form $z^{i}$. Similarly, components can send observations to players. For example, a component during the *.update_after_event* call might check if the event was observed by, or has effect on, other players apart from the acting player. Some components, like player status and location, send an observation to the player before it is their turn to act by implementing *.partial_state*.

:::zh

在 Concordia 中，所有自定义功能都通过组件实现。对于在 Python 中被追踪的落地变量，会创建一个专门的组件来维护该变量的状态，在相关事件之后更新它，并以语言形式 $z^{i}$ 呈现给 GM。类似地，组件可以向玩家发送观察。例如，某个组件在 *.update_after_event* 调用期间，可能会检查该事件是否被行动玩家之外的其他玩家观察到，或对他们产生了影响。有些组件，比如玩家状态和位置，会通过实现 *.partial_state*，在轮到玩家行动之前向其发送观察。
:::

:::bi

GM components can also be built around classical (non LLM) modelling tools like differential equations, finite state machines and so on. The only requirement is that they can represent their state in language. We can also wire different classic simulators together using natural language as the ‘glue’.

:::zh

GM 组件也可以围绕经典（非 LLM）建模工具来构建，比如微分方程和有限状态机等。唯一的要求是它们能够用语言表示自己的状态。我们还可以用自然语言作为“胶水”，把不同的经典模拟器连接起来。
:::

#### 轮流行动与同时行动（Turn taking and simultanious action）

:::bi

GM in Concordia support two types of turn taking. In the first, agents act one after another and game clock is advanced between their turns. In the second mode, at each step all players take a turn ’quasisimultaneously’ with regard to the main game clock, but still in a specific order within the timestep. This is the same principle as initiative order in dungeons and dragons. There is an option to execute player turns concurrently (*concurrent_action* flag), but it often leads to inconsistencies, although greatly speeds up the simulation. Use at your own risk.

:::zh

Concordia 中的 GM 支持两种轮流行动方式。第一种是智能体一个接一个地行动，游戏时钟在它们的回合之间推进。第二种方式是每一步所有玩家相对主游戏时钟“准同时”地行动，但在时间步内仍然按特定顺序行动。这与《龙与地下城》中的先攻顺序是同一个原理。还有一个选项可以让玩家回合并发执行（*concurrent_action* 标志），但它经常导致不一致，尽管能大大加快模拟速度。使用风险自负。
:::

:::annotation
附录 A 是这篇论文里实操价值最高的部分，建议照着读。它把智能体，GM，组件的接口一个个列出来，还给了并发，嵌套游戏，初始记忆生成这些工程细节。
:::

### 嵌套游戏（Nested games）

:::bi

Natural language is one of the most powerful modelling tools, as it allows to switch between levels of abstraction.
Concordia allows creation of nested game structures, where a GM’s component can spin out a new GM and pass over control to it for a certain period of time and then get it back when the new GM terminates the episode.
Having nested structure of games allows us to leverage that property of language and perform modelling at different levels of abstraction.
For example, imagine we would like to model a simulation of a fishing village, where we would generally like to model the fishing process itself with more details than the rest of the social life of a village. We would then make the main GM with a clock step of 1 hour and implement a component "Fishing", which would check if agent is fishing as part of its activity and if yes, would create a GM with faster clock. This GM would implement the details of the fishing process, play out the episode with the required agents and then return the set of its memories to the parent GM.

:::zh

自然语言是最强大的建模工具之一，因为它允许在不同抽象层级之间切换。

Concordia 允许创建嵌套游戏结构：GM 的某个组件可以衍生出一个新的 GM，把控制权交给它一段时间，然后在新 GM 终止其回合后再把控制权收回来。

拥有嵌套的游戏结构，让我们能够利用语言的这一特性，在不同抽象层级上进行建模。

例如，设想我们想模拟一个渔村，其中我们通常希望以比村庄其余社会生活更多的细节来建模捕鱼过程本身。这时我们会让主 GM 使用 1 小时的时钟步长，并实现一个名为 “Fishing” 的组件，它会检查智能体的活动中是否包含捕鱼，如果是，就创建一个时钟更快的 GM。这个 GM 将实现捕鱼过程的细节，与所需智能体一起完成该回合，然后把它的一组记忆返回给父 GM。
:::

:::bi

The conversation component in the provided examples implements a conversation between agents (and potential NPCs) using this technique.

:::zh

所提供的示例中的对话组件，利用这一技术实现了智能体（以及潜在 NPC）之间的对话。
:::

### 并发（Concurrency）

:::bi

The performance bottleneck of the library is waiting on the LLM API calls. To improve the wall time efficiency, we use concurrency during update calls to components. In this way, while one of the components is waiting for the LLM inference, other components can keep updating. This means that the sequence at which the components are updated *is not guaranteed*. If you would like to update the components sequentially, you can use *concordia/generic_components/sequential.py* wrapper, which wraps a set of components into one and updates them sequentially.

:::zh

这个库的性能瓶颈在于等待 LLM API 调用。为了提高墙钟时间效率，我们在对组件调用 update 时使用并发。这样一来，当某个组件在等待 LLM 推理时，其他组件可以继续更新。这意味着组件被更新的顺序*是不保证的*。如果你想按顺序更新组件，可以使用 *concordia/generic_components/sequential.py* 包装器，它把一组组件包装成一个组件并依次更新它们。
:::

### 采样初始记忆与背景故事（Sampling initial memories and backstories）

:::bi

To generate the initial memories of the agents we use the following step-wise generative process. We first generate a backstory by condition on a set of biographical facts (age, gender), randomised traits (defined by user, for example big five Nettle (2007)), and some simulation specific context. We then use that backstory to condition an LLM to generate a sequence of formative memories at different ages. These memories then initialise the agent. In this way we can obtain diversity in the agents. Notice that all the of the initial conditions are simply strings and can be easily adjusted by the experimenter. For example, traits can be derived phsycometrically valid or common sense descriptions—e.g. "very rude" or "slightly irritable". Validating that the resulting agents indeed exhibit those traits is part of the future work and has not been addressed yet. We intend to build on Safdari et al. (2023), which have found out that personality measurements in the outputs of some LLMs under specific prompting configurations are reliable and valid.

:::zh

为了生成智能体的初始记忆，我们使用以下逐步式的生成过程。我们首先以一组传记事实（年龄和性别），随机化的特质（由用户定义，例如大五人格 Nettle (2007)）以及一些与模拟相关的语境为条件，生成一个背景故事。然后我们用这个背景故事去条件化一个 LLM，让它生成不同年龄下的一系列成长记忆。这些记忆随后初始化智能体。这样我们就能获得智能体之间的多样性。注意，所有初始条件都只是字符串，实验者可以轻松调整。例如，特质可以用心理测量学上有效的描述或常识性描述来定义，比如 “very rude” 或 “slightly irritable”。验证所生成的智能体确实表现出这些特质，是未来工作的一部分，目前尚未处理。我们打算在 Safdari et al. (2023) 的基础上继续，他们发现某些 LLM 在特定提示配置下的输出中，人格测量结果是可靠且有效的。
:::

### 数字活动模拟（Digital Activity Simulation）

#### 创建手机应用（Creating Phone Apps）

:::bi

In Concordia, phone apps are implemented by subclassing the *PhoneApp* class and decorating callable actions with *@ app_action*. Concordia is then able to automatically generate natural English descriptions of the app and its supported actions using the class and methods’ docstring and annotated types. PhoneApps are free to run any Python code and connect to external services. For example, an implementation of a toy calendar app might look like this:

:::zh

在 Concordia 中，手机应用通过继承 *PhoneApp* 类，并用 *@ app_action* 装饰可调用的动作来实现。随后 Concordia 能够利用类和方法的 docstring 以及注解类型，自动生成该应用及其所支持动作的自然英语描述。PhoneApp 可以自由运行任意 Python 代码并连接外部服务。例如，一个玩具日历应用的实现可能长这样：
:::

```python
class CalendarApp(PhoneApp):

def name():
  return "My Calendar"

def description():
  return "This is a calendar app"

@app_method
def add_meeting(participant: str):
  """Adds a meeting"""
   self._meeting.append(...)
```

#### 手机（Phone）

:::bi

The phone class is initialized for every player and contains the PhoneApps the player can access. PhoneApp instances are singletons and are shared between players’ phones.

:::zh

手机类会为每个玩家初始化，并包含该玩家可以访问的 PhoneApp。PhoneApp 实例是单例，在多个玩家的手机之间共享。
:::

#### 触发嵌套的 PhoneGameMaster（Triggering the nested PhoneGameMaster）

:::bi

To detect that a player’s action involved the phone a should run the the nested phone game, we add the *SceneTriggeringComponent* to the main GM. This component examines every event generated by the GM and when it detects an event that requires phone interaction, it spawns a PhoneGameMaster and provides it with the interacting user and their corresponding Phone.

:::zh

为了检测玩家的动作是否涉及手机，是否应当运行嵌套的手机游戏，我们向主 GM 添加 *SceneTriggeringComponent*。这个组件会检查 GM 生成的每个事件，当它检测到一个需要手机交互的事件时，就会派生一个 PhoneGameMaster，并为其提供交互用户及其对应的手机。
:::

### 示例（Examples）

:::bi

We provide the following examples with the initial release of Concordia:

:::zh

我们在 Concordia 首次发布时提供了以下示例：
:::

:::bi

- Calendar: An illustrative social simulation with 2 players which simulates phone interactions. The two players, Alice and Bob, have a smartphone with a Calendar app. Alice’s goal is to setup a meeting with Bob using the Calendar app on her phone, taking Bob’s schedule into account when selecting the date/time.
- Riverbend elections: An illustrative social simulation with 5 players which simulates the day of mayoral elections in an imaginary town caller Riverbend. First two players, Alice and Bob, are running for the mayor. The third player, Charlie, is trying to ruin Alice’s reputation with disinformation. The last two players have no specific agenda, apart from voting in the election.
- Day in Riverbend: An illustrative social simulation with 5 players which simulates a normal day in an imaginary town caller Riverbend. Each player has their own configurable backstory. The agents are configured to re-implement the architecture Park et al. (2023)—they have reflection, plan, and identity components; their associative memory uses importance function. This is *not* an exact re-implementation.
- March and Olsen (2011) posit that humans generally act as though they choose their actions by answering three key questions (see section 2.1 for details). The agents used in this example implement exactly these components, and nothing else. The premise of the simulation is that 4 friends are stuck in snowed in pub. Two of them have a dispute over a crashed car.
- Magic Beans for sale: An example illustrating how to use the inventory component. Agents can buy and trade beans for money.
- Cyberball: An example which simulates social exclusion using a GABM version of a standard social psychology paradigm (Williams et al., 2000) and shows how to use standard psychology questionnaires.

:::zh

- Calendar：一个有 2 名玩家的说明性社会模拟，模拟手机交互。两名玩家 Alice 和 Bob 各有一部装有 Calendar 应用的智能手机。Alice 的目标是使用自己手机上的 Calendar 应用与 Bob 安排一次会面，并在选择日期和时间时考虑 Bob 的日程。
- Riverbend elections：一个有 5 名玩家的说明性社会模拟，模拟虚构小镇 Riverbend 的市长选举日。前两名玩家 Alice 和 Bob 在竞选市长。第三名玩家 Charlie 试图用虚假信息毁掉 Alice 的名声。最后两名玩家除了投票之外没有特定议程。
- Day in Riverbend：一个有 5 名玩家的说明性社会模拟，模拟虚构小镇 Riverbend 的普通一天。每个玩家都有自己的可配置背景故事。这些智能体被配置为重新实现 Park et al. (2023) 的架构：它们有反思，计划和身份组件，其联想记忆使用重要性函数。这*不是*一次精确的重新实现。
- March and Olsen (2011) 认为，人类通常表现得像是通过回答三个关键问题来选择自己的行动（详见 2.1 节）。这个示例中使用的智能体恰好实现了这些组件，仅此而已。模拟的前提是 4 个朋友被困在一家被雪困住的酒吧里。其中两人因一辆撞坏的车发生争执。
- Magic Beans for sale：一个说明如何使用库存组件的示例。智能体可以购买豆子并用它换取钱。
- Cyberball：一个使用标准社会心理学范式的 GABM 版本来模拟社会排斥的示例（Williams et al., 2000），并展示了如何使用标准心理学问卷。
:::
