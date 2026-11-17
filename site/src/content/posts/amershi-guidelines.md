---
title: '面向人机交互的 18 条设计指南：从 150 条建议到一张可检验的表'
description: 'AI 产品经常做出让用户困惑甚至受伤的行为，而设计指南却散落在不同圈子里。这篇 CHI 2019 论文把 150 多条 AI 设计建议收敛成 18 条可检验的人机交互指南，再用内部启发式评估，49 人用户研究和 11 人专家评审逐轮验证。'
pubDate: 2026-11-14
author: 'Saleema Amershi，Dan Weld 等十三人'
category: papers
tags: ['人机交互', '交互设计', '用户研究', '评测', '微软研究院·Saleema Amershi 等']
subcategory: 'paper-hci'
---

:::source
- **论文**：Guidelines for Human-AI Interaction
- **作者**：Saleema Amershi，Dan Weld，Mihaela Vorvoreanu，Adam Fourney，Besmira Nushi，Penny Collisson，Jina Suh，Shamsi Iqbal，Paul N. Bennett，Kori Inkpen，Jaime Teevan，Ruth Kikin-Gil，Eric Horvitz
- **机构**：微软研究院，华盛顿大学 Paul G. Allen 计算机科学与工程学院
- **发表**：CHI 2019，2019 年 5 月 4 日到 9 日，英国格拉斯哥
- **原文**：[doi.org/10.1145/3290605.3300233](https://doi.org/10.1145/3290605.3300233)
- **原始 PDF**：[microsoft.com 上的 camera-ready 版本](https://www.microsoft.com/en-us/research/uploads/prod/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf)
:::

> [!NOTE]
> 本文是 CHI 2019 论文《Guidelines for Human-AI Interaction》的中英逐段对照精读。正文九节全部翻译，表 1 到表 4 按原文内容重排为双语表格，图 1 到图 3 用原文 PDF 重新渲染。参考文献从略，正文里的数字引用标记原样保留，读者可以按编号回原文查阅。附录六页（18 条指南各自的应用与违背例子，共 108 条）没有收进来，因为表 1 已经给出每条指南的示例应用。页面顶部可以在中文译文和英文原文之间切换。图注下方那行中文小字和青绿色批注是我加的说明，两种语言模式下都会显示。原文版权归作者与 ACM 所有，译文只作学习交流之用。

## 摘要（Abstract）

:::bi

Advances in artificial intelligence (AI) frame opportunities and challenges for user interface design. Principles for human-AI interaction have been discussed in the human-computer interaction community for over two decades, but more study and innovation are needed in light of advances in AI and the growing uses of AI technologies in human-facing applications. We propose 18 generally applicable design guidelines for human-AI interaction. These guidelines are validated through multiple rounds of evaluation including a user study with 49 design practitioners who tested the guidelines against 20 popular AI-infused products. The results verify the relevance of the guidelines over a spectrum of interaction scenarios and reveal gaps in our knowledge, highlighting opportunities for further research. Based on the evaluations, we believe the set of design guidelines can serve as a resource to practitioners working on the design of applications and features that harness AI technologies, and to researchers interested in the further development of guidelines for human-AI interaction design.

:::zh

人工智能（AI）的进展为界面设计带来了机会与挑战。人与 AI 交互（human-AI interaction）的设计原则在人机交互（HCI）社区里已经被讨论二十多年，但面对 AI 的进步以及 AI 技术在人本应用中的广泛使用，仍需要更多研究与创新。我们提出 18 条普遍适用的人机交互设计指南。这些指南经过多轮评估验证，其中一轮是 49 位设计从业者参与的用户研究，他们拿 20 款流行的 AI 融合产品检验了这些指南。结果验证了指南在多种交互情境下的相关性，也暴露了知识上的空缺，指出了进一步研究的机会。基于这些评估，我们相信这套设计指南可以成为一份资源，既服务于用 AI 技术设计应用与功能的从业者，也服务于想继续发展人机交互设计指南的研究者。
:::

:::annotation

注意贡献声明的写法：摘要最后一句不是 “我们提出了 18 条指南”，而是把指南定位成一份对两类人（从业者和研究者）都有用的资源。这是 HCI 论文摘要里很常见的收尾方式，先说做了什么，再说对谁有用。
:::

## 引言（1 Introduction）

:::bi

Advances in artificial intelligence (AI) are enabling developers to integrate a variety of AI capabilities into user-facing systems. For example, increases in the accuracy of pattern recognition have created opportunities and pressure to integrate speech recognition, translation, object recognition, and face recognition into applications. However, as automated inferences are typically performed under uncertainty, often producing false positives and false negatives, AI-infused systems may demonstrate unpredictable behaviors that can be disruptive, confusing, offensive, and even dangerous. While some AI technologies are deployed in explicit, interactive uses, other advances are employed behind the scenes in proactive services acting on behalf of users such as automatically filtering content based on inferred relevance or importance. While such attempts at personalization may be delightful when aligned with users’ preferences, automated filtering and routing can be the source of costly information hiding and actions at odds with user goals and expectations. AI-infused systems1 can violate established usability guidelines of traditional user interface design (e.g., [31, 32]). For example, the principle of consistency advocates for minimizing unexpected changes with a consistent interface appearance and predictable behaviors. However, many AI components are inherently inconsistent due to poorly understood, probabilistic behaviors based on nuances of tasks and settings, and because they change via learning over time. AI-infused systems may react differently depending on lighting or noise conditions that are not recognized as distinct to end users. Systems may respond differently to the same text input over time (e.g., autocompletion systems suggesting different words after language model updates) or behave differently from one user to the next (e.g., search engines returning different results due to personalization). Inconsistent and unpredictable behaviors can confuse users, erode their confidence, and lead to abandonment of AI technology [7, 22]. Errors are common in AI-infused systems, rendering it difficult to reliably achieve the principle of error prevention. This has contributed to the large and growing body of work on AI explanations and interpretability to support human verification of proposed actions aimed at reducing the likelihood of unwarranted or potentially dangerous actions and costly outcomes (e.g., [14, 21, 23, 36, 38, 44]).

:::zh

人工智能（AI）的进展让开发者能把各种 AI 能力集成进面向用户的系统。例如，模式识别准确率的提高，既创造了机会，也带来了把语音识别，翻译，物体识别和人脸识别集成进应用的压力。然而，自动推理通常是在不确定的条件下进行的，常常产生误报和漏报，因此 AI 融合系统可能表现出不可预测的行为，这些行为会干扰用户，让人困惑，冒犯用户，甚至带来危险。有些 AI 技术以显式可交互的方式部署，另一些进展则被放在幕后，用在代表用户行事的主动服务里，比如根据推断出的相关性或重要性自动过滤内容。这类个性化尝试在与用户偏好一致时令人愉快，但自动过滤和路由也可能造成代价高昂的信息隐藏，做出与用户目标和期望相悖的行为。AI 融合系统[注 1]可能违背传统界面设计已有的可用性指南（例如 [31, 32]）。例如，一致性原则主张尽量减少意外的变化，保持一致的界面外观和可预测的行为。但许多 AI 组件天生就不一致，原因在于其概率行为难以被充分理解，取决于任务和环境的细节，而且会随着学习不断变化。AI 融合系统可能因为光照或噪声条件不同而做出不同反应，而这些条件在最终用户看来并没有区别。系统可能对同样的文本输入在不同时间给出不同回应（例如语言模型更新后，自动补全建议了不同的词），也可能对不同用户表现出不同行为（例如搜索引擎因为个性化而返回不同结果）。不一致，不可预测的行为会让用户困惑，侵蚀他们的信心，最终导致他们放弃 AI 技术 [7, 22]。AI 融合系统里的错误很常见，这让错误预防原则很难被可靠地实现。这也促成了一个庞大且仍在增长的研究领域，专门研究 AI 的解释与可解释性，目的是支持人对系统提议的动作进行验证，降低无根据或潜在危险的动作及其高昂后果出现的可能性（例如 [14, 21, 23, 36, 38, 44]）。
:::

:::bi

¹ In this paper we use AI-infused systems to refer to systems that have features harnessing AI capabilities that are directly exposed to the end user.

:::zh

¹  本文所说的 AI 融合系统，指带有直接暴露给最终用户的 AI 能力的系统。
:::

:::bi

For over 20 years, the human-computer interaction (HCI) community has proposed principles, guidelines, and strategies for designing user interfaces and interaction for applications employing AI inferences (e.g., [16, 17, 33]). However, the variability of AI designs (e.g., varying capabilities and interaction styles of commercial conversational agents impacting user engagement and usability [26]) and high-profile reports of failures, ranging from humorous and embarrassing (e.g., autocompletion errors [8]) to more serious harm when users cannot effectively understand or control an AI system (e.g., collaboration with semi-autonomous cars [41]), show that designers and developers continue to struggle with creating intuitive and effective AI-infused systems. Ongoing advances in AI technologies will generate a stream of challenges and opportunities for the HCI community. While such developments will require ongoing studies and vigilance, we also see value in developing reusable guidelines that can be shared, refined, and debated by the HCI community. The development and use of such shared guidelines can help with the design and evaluation of AI-infused systems that people can understand, trust, and can engage with effectively.

:::zh

二十多年来，人机交互（HCI）社区已经提出了许多原则，指南和策略，用来设计承载 AI 推理的应用的界面与交互（例如 [16, 17, 33]）。然而，AI 设计的多样性（例如商业对话智能体在能力与交互风格上的差异，会影响用户参与度和可用性 [26]），以及那些被广泛报道的失败，从滑稽尴尬的（例如自动补全出错 [8]）到更严重的伤害（例如用户无法有效理解或控制 AI 系统，例如与半自动驾驶汽车的协作 [41]），都表明设计师和开发者仍在为打造直观，有效的 AI 融合系统而挣扎。AI 技术的持续进步会给 HCI 社区带来一连串挑战与机会。这些发展固然需要持续的研究和警惕，但我们也看到，制定可共享，可改进，可争论的通用指南是有价值的。制定并使用这类共享指南，有助于设计和评估那些人们能理解，能信任，也能有效使用的 AI 融合系统。
:::

:::bi

In this work, we synthesize over 20 years of learning in AI design into a small set of generally applicable design guidelines for human-AI interaction. Specifically, our contributions are:

:::zh

在这项工作中，我们把过去 20 年 AI 设计上的经验综合成一组数量不多，普遍适用的人机交互设计指南。具体来说，我们的贡献是：
:::

:::bi

- A codification of over 150 AI-related design recommendations collected from academic and industry sources into a set of 18 generally applicable design guidelines for human-AI interaction (see Table 1).
- A systematic validation of the 18 guidelines through multiple rounds of iteration and testing.

:::zh

- 把从学术界和工业界收集到的 150 多条 AI 相关设计建议，整理成 18 条普遍适用的人机交互设计指南（见表 1）。
- 通过多轮迭代和测试，对这 18 条指南做了系统性验证。
:::

:::bi

We hope these guidelines, along with our examination of their applications in AI-infused systems, will serve as a resource for designers working with AI and will facilitate future research into the refinement and development of principles for human-AI interaction.

:::zh

我们希望这些指南，以及我们对它们在 AI 融合系统中应用情况的考察，能成为设计 AI 产品的人手边的一份资源，也能推动后续研究，去改进和发展人机交互的原则。
:::

## 相关工作（2 Related Work）

:::bi

For over 20 years, the academic community has proposed numerous guidelines and recommendations for how to design for effective human interaction with AI-infused systems. For example, Norman [33] and Höök [16] both recommended building in safeguards like verification steps or controlling levels of autonomy to help prevent unwanted adaptations or actions from intelligent systems. Others recommended managing expectations so as not to mislead or frustrate users during interaction with unpredictable adaptive agents [16, 20, 33]. Horvitz’s formative paper on mixed-initiative systems [17] proposed principles for balancing autonomous actions with direct manipulation constructs, such as supporting user-driven invocation of intelligent services, scoping actions based on inferred goals and confidences, and inferring ideal action in light of costs, benefits, and uncertainties. The latter guideline was operationalized via the introduction of a decision-theoretic methodology to guide decisions about acting on AI inferences versus waiting for user input, based on consideration of expected costs and benefits of performing AI automation under uncertainty.

:::zh

二十多年来，学术界提出了大量关于如何为 AI 融合系统设计有效人机交互的指南与建议。例如，Norman [33] 和 Höök [16] 都建议内置一些保护措施，比如验证步骤或对自主程度的控制，帮助防止智能系统做出不想要的适配或动作。另一些建议强调管理期望，避免用户在与不可预测的自适应智能体交互时被误导或受挫 [16, 20, 33]。Horvitz 关于混合主动式系统的开创性论文 [17] 提出了一些原则，用于在自主动作与直接操作之间取得平衡，例如支持用户主动发起智能服务，根据推断出的目标和置信度限定动作范围，以及结合成本，收益和不确定性推断理想动作。最后这条原则后来通过引入一种决策论方法得以落实，用预期成本和收益来判断什么时候该根据 AI 推理行动，什么时候该等待用户输入。
:::

:::bi

In some cases, specific AI design recommendations have received considerable attention within the academic community. For example, a large body of work exists and continues to grow around how to increase transparency or explain the behaviors of AI systems (e.g., [14, 21, 23, 36, 38, 44], to name a few). Similarly, when and how to automatically adapt or personalize interfaces has been studied extensively in a variety of scenarios (e.g., [9, 11–13]).

:::zh

在某些方面，特定的 AI 设计建议已经在学术界获得了相当多的关注。例如，如何提高透明度，如何解释 AI 系统的行为，已经形成了大量且仍在增长的研究（例如 [14, 21, 23, 36, 38, 44]，这里只举几例）。同样，何时以及如何自动适配或个性化界面，也在多种情境下被广泛研究（例如 [9, 11–13]）。
:::

:::bi

Others in the community have studied how to design for specific human-AI interaction scenarios. For example, researchers have been studying how to effectively interact with intelligent agents for many years (e.g., [18, 33]). This scenario has also had a recent resurgence of interest given advances in natural language processing and embedded devices driving the proliferation of conversational agents [26, 29, 35]. Similarly, researchers have for decades studied human interaction with intelligent context-aware computing systems including how to design for understandability and control of the underlying sensing systems [3, 23] and how to support ambiguity resolution [10]. Recent advances in sensing technologies and the widespread availability of commercial fitness and activity trackers have continued to drive interaction research in these domains [37, 45].

:::zh

社区中的另一些人研究的是特定人机交互场景下的设计。例如，研究者多年来一直在研究如何与智能体有效交互（例如 [18, 33]）。随着自然语言处理和嵌入式设备的进步推动对话智能体的普及，这个场景最近又重新受到关注 [26, 29, 35]。同样，研究者几十年来也在研究人与智能上下文感知计算系统的交互，包括如何设计底层感知系统以保证可理解性和可控性 [3, 23]，以及如何支持歧义的消解 [10]。传感技术的进步和商用健身与活动追踪器的普及，也在持续推动这些领域的交互研究 [37, 45]。
:::

:::bi

Despite all of this work, the ongoing stream of articles and editorials in the public domain about how to design in the face of AI (e.g., [2, 24, 25, 39, 42]) suggests designers need more guidance. This may be partly due to design suggestions being scattered throughout different academic circles and venues, making them difficult to find (e.g., there is relevant work in a wide variety of venues including AAAI, UbiComp, RecSys, SIGIR, HRI, KDD). Moreover, potential design suggestions for AI are often not presented explicitly as such. In many cases, researchers identify usability issues with AI systems and suggest possible solutions in the discussion or future work sections of their academic papers. For example, Lugar and Sellen [26] identify variability in user expectations of conversational agents as causing usability issues and propose setting realistic expectations as a possible solution in their discussion. Similarly, Lee et al [22] studied automatic changes to search result lists during user interaction and suggested caution in updating those lists to balance stability with presenting new content to users. While these proposed solutions could be generalized into principles for designers, not presenting them as such makes them difficult to discover.

:::zh

尽管有这么多工作，公共领域里仍在不断出现关于如何面对 AI 做设计的文章和评论（例如 [2, 24, 25, 39, 42]），这说明设计师需要更多指导。部分原因是设计建议散落在不同的学术圈子和发表场所里，很难找到（例如相关工作分布在 AAAI，UbiComp，RecSys，SIGIR，HRI，KDD 等各种场合）。此外，AI 的潜在设计建议往往没有以建议的形式被明确呈现。很多时候，研究者在学术论文的讨论或未来工作部分指出 AI 系统的可用性问题，顺带提出可能的解决方案。例如，Lugar 和 Sellen [26] 把用户对对话智能体期望的不稳定认定为可用性问题，并在讨论中提出设定现实期望这一可能解法。同样，Lee 等人 [22] 研究了用户交互过程中搜索结果列表的自动变化，建议在更新列表时要谨慎，在稳定性和向用户展示新内容之间取得平衡。这些被提出的解法本可以概括成面向设计师的原则，但没有被这样呈现，就让它们很难被发现。
:::

:::bi

It can also be difficult to understand if and how design guidance stemming from one community or interaction scenario extends to others. For example, Bunt et al. [4] showed that, while explanations of AI behaviors have shown promise in complex and high-risk scenarios such as sensor-based ubiquitous computing systems or decision-support systems for medical or financial domains, they may be less important for relatively low-cost scenarios such as search and music or movie recommenders.

:::zh

此外，也很难判断来自某个社区或某种交互场景的设计指导是否能延伸到其他场景，以及如何延伸。例如，Bunt 等人 [4] 指出，AI 行为的解释在复杂，高风险场景里已经显示出前景，比如基于传感器的普适计算系统，或医疗，金融领域的决策支持系统，但在搜索，音乐或电影推荐这类成本相对较低的场景里，它们可能没那么重要。
:::

:::bi

In this work we 1) synthesize a unified set of design guidelines from a variety of communities and sources and 2) systematically examine those guidelines in a variety of AI-infused systems to validate their applicability and relevance. The closest to our work is Horvitz’s set of principles for mixed-initiative systems [17], noting that 8 of our 18 guidelines map to principles outlined in that work. We celebrate its 20-year anniversary by reflecting on learnings from the community since its publication. Moreover, recent work has warned that the lack of rigorous validations of proposed design heuristics in specific domains makes it difficult to gauge the utility of those heuristics [15]. We developed the guidelines shown in Table 1 using a four-phase process. In Phase 1 we consolidated more than 150 design recommendations from multiple sources into a set of 20 guidelines. In Phase 2 we conducted an internal modified heuristic evaluation of the guidelines, revising the set down to 18. Phase 3 consisted of a user study in which 49 participants used heuristic evaluation to assess the guidelines’ relevance and clarity. Based on their feedback, we rephrased some of the guidelines to improve clarity and, in Phase 4, conducted an expert evaluation of the revisions to validate the final set.

:::zh

在这项工作中，我们做两件事：第一，从多个社区和来源综合出一套统一的设计指南。第二，在多款 AI 融合系统中系统性地检验这些指南，验证它们的适用性和相关性。与我们的工作最接近的是 Horvitz 关于混合主动式系统的原则 [17]，我们的 18 条指南中有 8 条可以对应到那篇论文里列出的原则。我们借它发表二十周年之际，回顾社区在这之后学到的东西。此外，最近的工作警告说，特定领域里提出的设计启发式缺乏严格验证，让人很难判断这些启发式的效用 [15]。我们用一套四阶段流程制定了表 1 中的指南。第一阶段，我们把来自多个来源的 150 多条设计建议整合成 20 条指南。第二阶段，我们对这些指南做了一次内部的改进型启发式评估，把数量缩减到 18 条。第三阶段是一次用户研究，49 位参与者用启发式评估来评价指南的相关性和清晰度。根据他们的反馈，我们改写了部分指南以提高清晰度，并在第四阶段对修订版本做了一次专家评估，用来验证最终版本。
:::

## 第一阶段：合并指南（3 Phase 1: Consolidating Guidelines）

:::bi

We gathered AI design recommendations from three sources:

:::zh

我们从三个来源收集 AI 设计建议：
:::

:::bi

- A review of AI products and guidelines originating from industry. We collected guidelines asserted internally in our company and externally, and grouped them into themes; we audited a sample of AI products within and outside our company against the themes; and cross-referenced themes with internal customer feedback (reviews and bugs reported about our company’s AI products).
- Recent public articles and editorials about AI design (e.g., [2, 24, 25, 39]).
- Relevant scholarly papers about AI design (see Related Work section).

:::zh

- 对来自工业界的 AI 产品和指南的回顾。我们收集了公司内部和外部的指南，把它们按主题归类，用这些主题审计了公司内外的一批 AI 产品，并把主题与内部客户反馈（关于公司 AI 产品的评论和 bug 报告）做了交叉参照。
- 近期关于 AI 设计的公开文章和评论（例如 [2, 24, 25, 39]）。
- 关于 AI 设计的相关学术论文（见相关工作一节）。
:::

:::bi

While we drew AI design guidelines from the academic literature, the list we captured may not be exhaustive because, as discussed in Related Work, potential design guidelines are often not presented explicitly as such, making them difficult to search for via terms or combinations of terms such as “AI”, “machine learning”, “design”, “principle” or “guideline”.

:::zh

虽然我们从学术文献中提取了 AI 设计指南，但这份清单可能并不完整。正如相关工作中讨论的，潜在的设计指南往往没有以指南的形式被明确呈现，因此很难用 “AI”“机器学习”“设计”“原则” 或 “指南” 这样的词或词组检索出来。
:::

:::bi

Further, as the field is evolving rapidly, we found the most up to date guidance about AI design in industry sources via articles published in the public domain.

:::zh

此外，由于这个领域演进很快，我们发现关于 AI 设计的最新指导更多出现在公共领域的行业文章里。
:::

:::bi

From these sources, we obtained 168 potential AI design guidelines. Three members of our team conducted an asynchronous affinity diagramming process, clustering the guidelines into related concepts. This resulted in 35 concepts which we then filtered by removing concepts we deemed to be either too vague to design for directly (e.g., “build trust”), too specific to a particular AI scenario (e.g., “establish that the bot is not human”), or not AI specific (e.g., “display output effectively”). Filtering reduced our set of concepts to 20, each of which we then summarized in a sentence or phrase, forming our first iteration of the guidelines. We organized the guidelines into four top-level categories based on when during the user’s interaction they applied: “Initially” (Guideline 1 & Guideline 2), “During interaction” (Guideline 3 - Guideline 6), “When wrong” (Guideline 7 - Guideline 11), and “Over time” (Guideline 12 - Guideline 18). Next, we tested the guidelines via a modified heuristic evaluation.

:::zh

从这些来源中，我们得到 168 条潜在的 AI 设计指南。团队中的三名成员进行了一次异步的亲和图流程，把这些指南聚成相关概念。这一步得到 35 个概念，随后我们通过删除一些概念来做过滤：有的太模糊，无法直接拿来设计（例如 “建立信任”），有的过于针对某种特定的 AI 场景（例如 “表明机器人不是人”），有的则不够 AI 专属（例如 “有效地展示输出”）。过滤后，概念集合缩减到 20 个，我们为每个概念写下一句话或一个短语的总结，形成指南的第一轮迭代版本。我们根据这些指南在用户交互过程中适用的时点，把它们组织成四个顶层类别：“初始阶段”（指南 1 和指南 2），“交互过程中”（指南 3 到指南 6），“出错时”（指南 7 到指南 11）和 “随时间推移”（指南 12 到指南 18）。接下来，我们通过一次改进型启发式评估来检验这些指南。
:::

## 第二阶段：改进的启发式评估（4 Phase 2: Modified Heuristic Evaluation）

:::bi

We conducted an evaluation to test and iterate on the initial set of 20 AI design guidelines. We modeled our study after a heuristic evaluation [31], a common discount usability testing method where evaluators examine an interface for violations of a given set of usability guidelines. As the primary goal was to evaluate our design guidelines rather than to evaluate an interface, we modified the heuristic evaluation by asking evaluators to attempt to identify both applications and violations of the proposed guidelines in an interface and to reflect on the guidelines themselves during the evaluation.

:::zh

我们做了一次评估，用来测试并迭代最初的 20 条 AI 设计指南。研究参照启发式评估 [31] 来设计，这是一种常见的廉价可用性测试方法，由评估者检查界面是否违反了某组可用性指南。由于主要目标是评估我们自己的设计指南，而不是评估某个界面，我们对启发式评估做了改动：让评估者同时找出界面中对这些指南的应用和违背，并在评估过程中反思指南本身。
:::

:::bi

Eleven members of our team participated in this evaluation. Team members selected AI-infused products or features of their choice and then looked for applications or violations of our initial set of design guidelines over a one-hour period. In total, we inspected 13 AI-infused products or features including: two different email products with a feature for filtering unimportant emails, a navigation system, an e-commerce website with product recommendations, two photo organization products, a design assistance feature in a productivity software, a research assistance feature in a productivity application, a social network news feed feature, a web search service, and an image search service. These products were different from the products used in Phase 3.

:::zh

团队中的 11 名成员参加了这次评估。成员们各自选择 AI 融合产品或功能，在一小时内寻找我们最初那套设计指南的应用或违背。我们总共检查了 13 款 AI 融合产品或功能，包括：两款带有过滤不重要邮件功能的邮件产品，一个导航系统，一个带商品推荐的电商网站，两款照片整理产品，一个生产力软件里的设计辅助功能，一个生产力应用里的研究辅助功能，一个社交网络信息流功能，一个网页搜索服务，以及一个图片搜索服务。这些产品与第三阶段使用的产品不同。
:::

:::bi

After the modified heuristic evaluation, we reviewed the findings and reflections about each guideline and discussed issues and revision strategies for conflicting interpretations and ambiguities. For example, our initial phrasing of Guideline 9 (“allow efficient correction”) and Guideline 17 (“allow coarse controls”) caused several evaluators to confuse instance-level corrections with global-level settings (several evaluators identified adjusting settings as applications of Guideline 9 rather than Guideline 17). We subsequently rephrased Guideline 17 to include the term “global”.

:::zh

改进型启发式评估结束后，我们回顾了针对每条指南的发现和反思，讨论了相互冲突的解释与歧义，并商量了修订策略。例如，我们最初对指南 9（“allow efficient correction”）和指南 17（“allow coarse controls”）的措辞，让几位评估者把实例层面的修正和全局层面的设置混在了一起（几位评估者把调整设置当成指南 9 的应用，而不是指南 17 的应用）。后来我们把指南 17 改写成包含 “global” 这个词。
:::

:::bi

We also identified opportunities for merging related or redundant guidelines. For example, the initial set included “informing the user when to take control” and “fallback to a human where appropriate”. Our evaluations found few applications of these guidelines, and we determined both of them to be instances of Guideline 10 (initially phrased “scope services when uncertain”) and therefore removed them as distinct guidelines. Similarly, applications of “enable users to change privacy permissions” and “allow private mode” were deemed as instances of Guideline 17 (initially phrased “allow coarse controls”) and were merged with that guideline.

:::zh

我们还发现了合并相关或冗余指南的机会。例如，最初的集合里有 “在适当的时候告知用户该何时接管” 和 “在适当的时候回退给人类” 这两条。评估中我们几乎找不到它们的应用，于是判定它们都属于指南 10（最初措辞为 “不确定时缩小服务范围”）的实例，因此不再把它们当作独立指南。同样，“让用户能修改隐私权限” 和 “允许隐私模式” 的应用，被判定为指南 17（最初措辞为 “允许粗粒度控制”）的实例，也并入了这条指南。
:::

:::bi

We also decided to remove some guidelines that resulted in few or no applications during our evaluations. For example, neither the guideline to “explore vs. exploit in moderation” nor to “be especially conservative in the beginning” resulted in any identifiable usage across the products or features we examined. While these guidelines are important at the AI modeling level, they appeared to be difficult to observe or design for in an interface.

:::zh

我们还决定删除一些在评估中几乎没有应用的指南。例如，“适度探索与利用” 和 “开始时格外保守” 这两条，在我们检查的产品或功能里都没有带来任何可识别的应用。这些指南在 AI 建模层面很重要，但在界面上似乎很难被观察到，也很难直接据此做设计。
:::

:::bi

After these sessions we reformulated the remaining guidelines to follow a consistent format and to clarify issues identified by evaluators. Specifically, we proposed that each guideline adhere to the following criteria:

:::zh

在这些讨论之后，我们把剩下的指南重新改写，让它们遵循一致的格式，并澄清评估者指出的问题。具体来说，我们提出每条指南都应满足以下标准：
:::

:::bi

- It should be written as a rule of action, containing about 3-10 words and starting with a verb.
- It should be accompanied by a one-sentence description that qualifies or clarifies any potential ambiguities.
- It should not contain conjunctions so that designers can clearly validate whether it is applied or violated in an interface.

:::zh

- 它应当写成一条行动规则，大约 3 到 10 个词，以动词开头。
- 它应当配一句说明，用来限定或澄清任何可能的歧义。
- 它不应包含连词，这样设计师才能清楚地判断它在一个界面上是被应用了还是被违背了。
:::

:::annotation

这三条格式要求可以直接照搬：动词开头，3 到 10 个词，不含连词。背后的原因是 HCI 评审要判断一条指南能不能在界面上被验证，而 “支持高效地发起，同时保持上下文相关” 这种带连词的句子，既没法验证，也没法据此设计。写指南或设计原则时，先按这三条改一遍。
:::

:::bi

Removing conjunctions meant splitting some guidelines. For example, an initial guideline to “allow efficient invocation, correction, and dismissal” became three (to “support efficient invocation,” “support efficient dismissal,” and “support efficient correction,” Guidelines 7-9).

:::zh

去掉连词意味着要拆分一些指南。例如，最初一条指南是 “允许高效地发起，修正和撤销”，后来被拆成三条，分别是指南 7 “支持高效地发起”，指南 8 “支持高效地撤销” 和指南 9 “支持高效地修正”。
:::

:::bi

Phase 2 produced a set of 18 guidelines that closely match the guidelines in Table 1. In the following sections we describe a user study that tested these 18 guidelines and a subsequent expert validation of the guidelines that we slightly rephrased after the user study (resulting in the final proposed set shown in Table 1).

:::zh

第二阶段产出了一套 18 条指南，与表 1 中的指南非常接近。接下来的几节里，我们介绍一次检验这 18 条指南的用户研究，以及随后对这些指南的专家验证。我们在用户研究之后又对指南做了轻微改写，最终形成了表 1 中给出的版本。
:::

:::annotation

这一节值得当成 “论文方法部分怎么写” 的范本：作者没有把 18 条指南当成天上掉下来的结论，而是把四轮评估（整合，内部启发式，用户研究，专家评审）当成一条证据链，逐条交代每个阶段改了什么，为什么改。
:::

## 18 条指南一览（Table 1）

:::bi

| When applied | Guideline | Example application |
| --- | --- | --- |
| Initially | **G1 Make clear what the system can do.** Help the user understand what the AI system is capable of doing. | [Activity Trackers, Product #1] “Displays all the metrics that it tracks and explains how. Metrics include movement metrics such as steps, distance traveled, length of time exercised, and all-day calorie burn, for a day.” |
| Initially | **G2 Make clear how well the system can do what it can do.** Help the user understand how often the AI system may make mistakes. | [Music Recommenders, Product #1] “A little bit of hedging language: ‘we think you’ll like’.” |
| During interaction | **G3 Time services based on context.** Time when to act or interrupt based on the user’s current task and environment. | [Navigation, Product #1] “In my experience using the app, it seems to provide timely route guidance. Because the map updates regularly with your actual location, the guidance is timely.” |
| During interaction | **G4 Show contextually relevant information.** Display information relevant to the user’s current task and environment. | [Web Search, Product #2] “Searching a movie title returns show times in near my location for today’s date” |
| During interaction | **G5 Match relevant social norms.** Ensure the experience is delivered in a way that users would expect, given their social and cultural context. | [Voice Assistants, Product #1] “[The assistant] uses a semi-formal voice to talk to you - spells out ‘okay’ and asks further questions.” |
| During interaction | **G6 Mitigate social biases.** Ensure the AI system’s language and behaviors do not reinforce undesirable and unfair stereotypes and biases. | [Autocomplete, Product #2] “The autocomplete feature clearly suggests both genders [him, her] without any bias while suggesting the text to complete.” |
| When wrong | **G7 Support efficient invocation.** Make it easy to invoke or request the AI system’s services when needed. | [Voice Assistants, Product #1] “I can say [wake command] to initiate.” |
| When wrong | **G8 Support efficient dismissal.** Make it easy to dismiss or ignore undesired AI system services. | [E-commerce, Product #2] “Feature is unobtrusive, below the fold, and easy to scroll past...Easy to ignore.” |
| When wrong | **G9 Support efficient correction.** Make it easy to edit, refine, or recover when the AI system is wrong. | [Voice Assistants, Product #2] “Once my request for a reminder was processed I saw the ability to edit my reminder in the UI that was displayed. Small text underneath stated ‘Tap to Edit’ with a chevron indicating something would happen if I selected this text.” |
| When wrong | **G10 Scope services when in doubt.** Engage in disambiguation or gracefully degrade the AI system’s services when uncertain about a user’s goals. | [Autocomplete, Product #1] “It usually provides 3-4 suggestions instead of directly auto completing it for you” |
| When wrong | **G11 Make clear why the system did what it did.** Enable the user to access an explanation of why the AI system behaved as it did. | [Navigation, Product #2] “The route chosen by the app was made based on the Fastest Route, which is shown in the subtext.” |
| Over time | **G12 Remember recent interactions.** Maintain short term memory and allow the user to make efficient references to that memory. | [Web Search, Product #1] “[The search engine] remembers the context of certain queries, with certain phrasing, so that it can continue the thread of the search (e.g., ‘who he married’ to after a search that surfaces Benjamin Bratt)” |
| Over time | **G13 Learn from user behavior.** Personalize the user’s experience by learning from their actions over time. | [Music Recommenders, Product #2] “I think this is applied because every action to add a song to the list triggers new recommendations.” |
| Over time | **G14 Update and adapt cautiously.** Limit disruptive changes when updating and adapting the AI system’s behaviors. | [Music Recommenders, Product #2] “Once we select a song they update the immediate song list below but keeps the above one constant.” |
| Over time | **G15 Encourage granular feedback.** Enable the user to provide feedback indicating their preferences during regular interaction with the AI system. | [Email, Product #1] “The user can directly mark something as important, when the AI hadn’t marked it as that previously.” |
| Over time | **G16 Convey the consequences of user actions.** Immediately update or convey how user actions will impact future behaviors of the AI system. | [Social Networks, Product #2] “[The product] communicates that hiding an Ad will adjust the relevance of future ads.” |
| Over time | **G17 Provide global controls.** Allow the user to globally customize what the AI system monitors and how it behaves. | [Photo Organizers, Product #1] “[The product] allows users to turn on your location history so the AI can group photos by where you have been.” |
| Over time | **G18 Notify users about changes.** Inform the user when the AI system adds or updates its capabilities. | [Navigation, Product #2] “[The product] does provide small in-app teaching callouts for important new features. New features that require my explicit attention are pop-ups.” |

Table 1: Our 18 human-AI interaction design guidelines, roughly categorized by when they are likely to be applied during interaction with users, along with illustrative applications (rated as “clearly applied” by participants) across products tested by participants in our user study.

:::zh

| 适用时点 | 指南 | 示例应用 |
| --- | --- | --- |
| 初始 | **G1 明确系统能做什么。** 帮助用户理解这个 AI 系统具备哪些能力。 | [活动追踪器，产品 1] “展示它追踪的所有指标，并说明是怎么追踪的。指标包括步数，移动距离，锻炼时长和全天卡路里消耗这类运动指标。” |
| 初始 | **G2 明确系统把这件事能做得多好。** 帮助用户理解 AI 系统出错的频率大概是多少。 | [音乐推荐，产品 1] “有一点对冲的语言：‘我们觉得你会喜欢’。” |
| 交互中 | **G3 根据上下文把握服务时机。** 根据用户当前的任务和环境，决定什么时候行动或打断。 | [导航，产品 1] “从我使用这个应用的体验看，它似乎能及时给出路线引导。因为地图会随着你的实际位置不断更新，所以引导是及时的。” |
| 交互中 | **G4 展示上下文相关的信息。** 展示与用户当前任务和环境相关的信息。 | [网页搜索，产品 2] “搜索一个电影名，会返回我附近今天上映的场次” |
| 交互中 | **G5 符合相关的社会规范。** 确保体验的呈现方式符合用户在特定社会与文化语境下的预期。 | [语音助手，产品 1] “[助手] 用半正式的语音和你说话，把 ‘okay’ 完整念出来，还会继续追问。” |
| 交互中 | **G6 减少社会偏见。** 确保 AI 系统的语言和行为不会强化不良，不公平的刻板印象与偏见。 | [自动补全，产品 2] “自动补全功能在补全文本时，清楚地同时建议了两种性别 [him, her]，没有任何偏向。” |
| 出错时 | **G7 支持高效地发起。** 让用户在需要时能轻松唤起或请求 AI 系统的服务。 | [语音助手，产品 1] “我可以说 [唤醒词] 来启动它。” |
| 出错时 | **G8 支持高效地撤销。** 让用户能轻松关闭或忽略不想要的 AI 系统服务。 | [电商，产品 2] “功能不打扰，在折叠线以下，很容易滚动过去……很容易忽略。” |
| 出错时 | **G9 支持高效地修正。** 当 AI 系统出错时，让用户能轻松编辑，改进或恢复。 | [语音助手，产品 2] “我的提醒请求处理完之后，界面上出现了编辑这条提醒的功能。下面有一行小字写着 ‘点击编辑’，旁边有个箭头，表示点下去会有反应。” |
| 出错时 | **G10 不确定时缩小服务范围。** 当无法确定用户目标时，进行消歧，或者体面地降低 AI 系统服务的程度。 | [自动补全，产品 1] “它通常给出 3 到 4 个建议，而不是直接替你补全” |
| 出错时 | **G11 明确说明系统为何这样做。** 让用户能获取关于 AI 系统为何如此行为的解释。 | [导航，产品 2] “应用选择的路线是基于最快路线，这一点写在副标题里。” |
| 随时间 | **G12 记住最近的交互。** 维护短期记忆，并让用户能高效地引用这段记忆。 | [网页搜索，产品 1] “[搜索引擎] 会记住某些查询的上下文和特定措辞，从而延续搜索的线索（例如搜出 Benjamin Bratt 之后，接着搜 ‘who he married’）” |
| 随时间 | **G13 从用户行为中学习。** 通过随时间学习用户的行为来个性化其体验。 | [音乐推荐，产品 2] “我觉得这一点被应用了，因为每次把一首歌加入列表，都会触发新的推荐。” |
| 随时间 | **G14 谨慎地更新与适配。** 在更新和适配 AI 系统行为时，限制破坏性的变化。 | [音乐推荐，产品 2] “选好一首歌之后，它会更新下面的歌曲列表，但保持上面那一栏不变。” |
| 随时间 | **G15 鼓励细粒度反馈。** 让用户在常规交互过程中就能给出表明偏好的反馈。 | [邮件，产品 1] “用户可以主动把某封邮件标为重要，而这是 AI 之前没有标记的。” |
| 随时间 | **G16 传达用户行为的后果。** 立即更新或传达用户行为将如何影响 AI 系统未来的行为。 | [社交网络，产品 2] “这个产品会说明，隐藏一条广告会调整未来广告的相关性。” |
| 随时间 | **G17 提供全局控制。** 允许用户全局定制 AI 系统监控什么，如何表现。 | [照片整理，产品 1] “这个产品允许你打开位置历史，这样 AI 就能按你去过的地方给照片分组。” |
| 随时间 | **G18 通知用户变更。** 当 AI 系统新增或更新能力时告知用户。 | [导航，产品 2] “这个产品确实会用应用内的小教程提示重要新功能。需要我明确注意的新功能则是弹窗。” |

表 1：我们的 18 条人机交互设计指南，按它们可能在交互中适用的时点做了粗略分类，并附上参与者在用户研究中给出的示例应用（被标记为 “明确应用”），这些例子分布在研究测试的不同产品上。
:::

## 第三阶段：用户研究（5 Phase 3: User Study）

:::bi

We conducted a user study with 49 HCI practitioners to 1) understand the guidelines’ applicability across a variety of products; and 2) get feedback about the guidelines’ clarity.

:::zh

我们对 49 位 HCI 从业者做了一次用户研究，目的有两个：第一，了解这些指南在不同产品上的适用性。第二，收集关于指南清晰度的反馈。
:::

## 流程（Procedure）

:::bi

We modeled the user study after a heuristic evaluation. We assigned each participant to an AI-driven feature of a product they were familiar with and asked them to find examples (applications and violations) of each guideline.

:::zh

用户研究参照启发式评估来设计。我们把每位参与者分配到一款他们熟悉的产品的某个 AI 驱动功能上，请他们为每条指南找出例子（应用和违背）。
:::

:::bi

First, we helped participants become familiar with the guidelines by providing a document that included at least one application and one violation for each. The examples came from a range of AI-infused products and were presented with a 1-2 sentence description and a screenshot where appropriate.

:::zh

首先，我们帮助参与者熟悉这些指南，发给他们一份文档，里面为每条指南至少列出一个应用和一个违背。这些例子取自多种 AI 融合产品，并且尽量配上一两句话的说明和截图。
:::

:::bi

Participants were then instructed to play around with their assigned feature and fill out a form asking a series of questions. For each guideline, the form asked participants to first determine if the guideline “does not apply” to their assigned feature (i.e., irrelevant or out of scope) and, if not, to explain why. If a participant judged that a guideline should apply to their assigned feature and they observed applications or violations, the form requested participants to provide their own examples, and, for each example, a rating of the extent of the application or violation on a 5-point semantic differential scale from “clearly violated” to “clearly applied”, along with an explanation of the rating. Participants were incentivized with an additional monetary gratuity to include screenshots to illustrate the examples. After completing the evaluation, participants submitted their examples and ratings and filled in a final questionnaire which asked them to rate each guideline on a 5-point semantic differential scale from “very confusing” to “very clear” and provide any additional comments about the guidelines.

:::zh

接着，参与者被要求把分配到的功能玩一玩，并填写一份包含一系列问题的表单。对每条指南，表单先让参与者判断这条指南是否 “不适用于” 他们分配到的功能（也就是无关或超出范围），如果不适用，就请他们解释原因。如果参与者判断某条指南应该适用于自己的功能，并且观察到了应用或违背，表单就请他们提供自己的例子，并为每个例子按 5 点语义差异量表打分，量表从 “明确违背” 到 “明确应用”，同时解释打分理由。为了鼓励参与者提供截图来说明例子，我们还额外提供了一笔金钱奖励。完成评估后，参与者提交例子和评分，并填写最后一份问卷，要求他们在 5 点语义差异量表上评价每条指南，从 “非常令人困惑” 到 “非常清晰”，并补充任何关于指南的评论。
:::

:::bi

We estimated the study would take approximately one hour to complete based on our modified heuristic evaluation study from Phase 2. Participants were given one week to complete the study on their own time and were compensated with an Amazon Gift Card worth a minimum of $50 and up to $70 based on the number of applications or violations for which they provided screenshots.

:::zh

根据第二阶段改进型启发式评估的经验，我们估计这项研究大约需要一小时完成。参与者有一周时间自行安排完成，报酬是亚马逊礼品卡，最低 50 美元，最多 70 美元，取决于他们提供了多少条带截图的例子。
:::

## 产品（Products）

:::bi

One objective of our study was to determine if and how each of our design guidelines manifests in a variety of AI-infused products. We used a maximum-variance sampling strategy [28] to select popular AI-infused products that covered a wide range of scenarios.

:::zh

我们研究的一个目标是判断每条设计指南在多种 AI 融合产品里是否出现，以及如何出现。我们采用最大差异抽样策略 [28]，挑选能覆盖广泛场景的流行 AI 融合产品。
:::

:::bi

First, we searched online for rankings of top apps, software, and websites in the U.S. for both mobile and desktop devices. This search resulted in 13 lists from sources such as app stores (Apple, Google Play, Windows), and Web traffic rankings [1, 6, 40]. From these lists, we selected the top 10 products in each and then filtered out any that were offensive, game related, or did not currently use AI to drive any of their main end-user facing services (determined by examination of the product or reading supplemental help documentation and news media articles when necessary).

:::zh

首先，我们上网查找美国市场上移动端和桌面端热门应用，软件和网站的排名。这次搜索得到 13 份清单，来源包括应用商店（Apple，Google Play，Windows）和网络流量排名 [1, 6, 40]。我们从每份清单里选出前 10 款产品，然后过滤掉冒犯性的，游戏类的，以及当前没有用 AI 驱动任何主要面向最终用户的服务的产品。判断依据是查看产品本身，必要时阅读补充帮助文档和新闻报道。
:::

:::bi

Next, we grouped the remaining products by their primary use case, resulting in 10 categories (e.g., email, e-commerce, social networking). We then selected two products per category based on market share as determined by recent online statistics reports (e.g., [19]). Finally, we selected a prominent AI-driven feature to evaluate per product. In total, we selected 20 products, two of which were from Microsoft.

:::zh

接下来，我们按主要用途给剩下的产品分组，得到 10 个类别（例如邮件，电商，社交网络）。然后根据近期在线统计报告（例如 [19]）里的市场份额，每个类别选两款产品。最后，为每款产品选一个突出的 AI 驱动功能作为评估对象。我们总共选了 20 款产品，其中两款来自微软。
:::

:::bi

Many of the products we selected were available on multiple platforms and devices. We attempted to evaluate products on a variety of platforms. Table 2 shows our final list of product categories, features and platforms.

:::zh

选出的产品中，很多都在多个平台和设备上可用。我们尽量在多种平台上评估产品。表 2 是我们最终的产品类别，功能和平台清单。
:::

:::bi

| Product Category | Feature | Participants |
| --- | --- | --- |
| E-commerce (Web) | Recommendations | 6 |
| Navigation (Mobile) | Route planning | 5 |
| Music Recommenders (Mobile) | Recommendations | 5 |
| Activity Trackers (Device) | Walking detection and step count | 5 |
| Autocomplete (Mobile) | Autocomplete | 5 |
| Social Networks (Mobile) | Feed filtering | 5 |
| Email (Web) | Importance filtering | 5 |
| Voice Assistants (Device) | Creating a reminder with a due date | 5 |
| Photo Organizers (Mobile) | Album suggestions | 4 |
| Web Search (Web) | Search | 4 |

Table 2: Product categories and features tested in the user study, and the number of participants assigned to each.

:::zh

| 产品类别 | 功能 | 参与者人数 |
| --- | --- | --- |
| 电商（网页） | 推荐 | 6 |
| 导航（移动端） | 路线规划 | 5 |
| 音乐推荐（移动端） | 推荐 | 5 |
| 活动追踪器（设备） | 步行检测与步数统计 | 5 |
| 自动补全（移动端） | 自动补全 | 5 |
| 社交网络（移动端） | 信息流过滤 | 5 |
| 邮件（网页） | 重要性过滤 | 5 |
| 语音助手（设备） | 创建带截止日期的提醒 | 5 |
| 照片整理（移动端） | 相册建议 | 4 |
| 网页搜索（网页） | 搜索 | 4 |

表 2：用户研究中测试的产品类别与功能，以及分配到每款产品的参与者人数。
:::

## 参与者（Participants）

:::bi

We recruited participants via HCI and design distribution lists at a large software company. During recruitment we screened for people with at least one year of experience working in or studying HCI (e.g., in roles such as user experience design and user experience research) and familiarity with discount usability testing methods (e.g., heuristic evaluation, cognitive walkthrough). We listed all possible product and platform combinations, and asked respondents to select the options they were familiar with and comfortable evaluating. We endeavored to assign 2-3 participants to each product according to recommendations for heuristic evaluations. Nielsen [30] recommends 2-3 evaluators when evaluators have both usability experience and familiarity with the product being tested. We also assigned participants so that each product was evaluated by people with a range of experience in discount usability techniques and no product was evaluated by participants with only limited experience. When participants dropped out of the study, we replaced them by assigning new participants from a wait list of eligible respondents, trying to maintain 2-3 evaluators per product.

:::zh

我们通过一家大型软件公司的 HCI 和设计邮件列表招募参与者。招募时我们筛选了在 HCI 领域工作或学习至少一年的人（例如担任用户体验设计，用户体验研究等角色），以及熟悉廉价可用性测试方法（例如启发式评估，认知走查）的人。我们列出了所有可能的产品与平台组合，请受访者选出自己熟悉，也愿意评估的选项。按照启发式评估的建议，我们尽量为每款产品分配 2 到 3 位参与者。Nielsen [30] 建议，当评估者既有可用性经验又熟悉被测产品时，配备 2 到 3 位评估者即可。我们还做了搭配，让每款产品的评估者覆盖不同水平的廉价可用性技术经验，同时避免让只有有限经验的人单独评估某款产品。当参与者中途退出时，我们从合格受访者的候补名单里补人，尽量维持每款产品 2 到 3 位评估者。
:::

:::bi

In the end, 49 people (29 female, 18 male, 2 preferred not to answer) participated in our study. Participants spanned ages 18-55: 5 were in the age range of 18-24, 24 were in the age range of 25-34, 13 were aged 35-44 and 7 were aged 45-54. Of these participants, 19 were researchers, 12 were designers, 11 were HCI or design interns from various universities worldwide, and the remaining 7 were a mix of engineers, product managers or vendors. The participants’ experience working in or studying HCI/UX was as follows: 1-4 years (23 participants), 5-9 years (14 participants), 10-14 years (9 participants), 15-19 years (1 participant), 20+ years (2 participants). Thirty-nine participants self-reported as being highly or very highly experienced at discount usability testing methods while 10 reported as having medium to low levels of experience (we screened out participants with “very low” levels of experience). Participants were from 4 different countries spanning 3 continents. While we recruited participants using internal mailing lists, we took steps to mitigate sampling bias to ensure the results do not exclusively represent one organization’s mindset, in addition to including the 11 external participants. Our questionnaires asked participants to rate the extent to which an example is illustrative of a guideline and the clarity of each guideline’s wording on Likert scales. These questions are unlikely to be influenced by company values. Moreover, our main sampling criterion was experience with discount usability methods. It is unlikely that the entirety of participants’ professional training and experience were internal.

:::zh

最终有 49 人参与研究（29 位女性，18 位男性，2 位不愿回答）。参与者年龄在 18 到 55 岁之间：18 到 24 岁 5 人，25 到 34 岁 24 人，35 到 44 岁 13 人，45 到 54 岁 7 人。在这 49 人中，19 人是研究员，12 人是设计师，11 人是来自世界各地多所大学的 HCI 或设计实习生，其余 7 人是工程师，产品经理或供应商的混合。参与者在 HCI/UX 领域工作或学习的年限分布是：1 到 4 年（23 人），5 到 9 年（14 人），10 到 14 年（9 人），15 到 19 年（1 人），20 年以上（2 人）。39 位参与者自评在廉价可用性测试方法上经验很高或非常高，10 位自评经验中等或偏低（经验 “非常低” 的人在筛选阶段已被排除）。参与者来自 4 个国家，分布在 3 个大洲。虽然我们是通过内部邮件列表招募的，但除了纳入 11 位外部参与者之外，我们还采取了一些措施来缓解抽样偏差，确保结果不会只代表一家机构的心态。我们的问卷要求参与者用李克特量表评价一个例子在多大程度上体现了某条指南，以及每条指南措辞的清晰度。这些问题不太可能受到公司价值观的影响。而且，我们主要的抽样标准是廉价可用性方法上的经验。参与者的专业训练和经验不太可能全部来自内部。
:::

## 调整与误解（Adjustments and Misinterpretations）

:::bi

To obtain accurate counts of examples of the proposed guidelines across products, we reviewed participant responses for the following cases:

:::zh

为了得到各类产品中指南实例的准确计数，我们检查了参与者回答中的以下几种情况：
:::

:::bi

- Duplicate applications or violations of a guideline for any given product (55 instances). For example, two different participants identified the same application of Guideline 1 for an activity tracker: “This guideline is applied in the activity summary view, where it shows a summary of my ‘move’, ‘exercise’ and ‘stand’ metrics.” and “Displays all the metrics that it tracks and explains how. Metrics include movement metrics such as steps, distance traveled...” The 55 duplications were removed from the analysis.
- Instances where participants used “does not apply” to indicate that they could not find examples of a guideline rather than to indicate that the guideline is not relevant for the product they were testing, as we intended by this designation (73 instances). For example, “To be quite honest I believe that this would apply, however I can’t think of a way to show it.” and “Cannot find examples of application or violation.”. These 73 instances were also removed from the analysis.
- Instances where participants used “does not apply” to indicate that a guideline was violated (20 instances). For example, “Even in the setting page, there’s no option for changing or customizing anything for the autocomplete function.” and “[Voice Assistant, Product #1] did not provide additional hints or tips to educate me on what the system is capable of achieving beyond the task I had already asked it to run.” We reclassified these instances as violations.
- Instances where participants misinterpreted one guideline for another, discussed further below (56 instances). We identified these cases using a two-pass process where participant responses were first reviewed by one member of our team to identify each case and then those cases were verified or invalidated by another member of our team. We removed 14 additional instances from our analysis when the two reviewers from our team disagreed on any of these cases.

:::zh

- 同一产品下同一条指南的重复应用或违背（55 条）。例如，两位不同的参与者为同一款活动追踪器识别出了指南 1 的同一个应用：“这条指南应用在活动摘要视图里，它展示了我 ‘移动’，‘锻炼’ 和 ‘站立’ 指标的摘要。” 以及 “展示它追踪的所有指标，并解释怎么用。指标包括步数，移动距离，锻炼时长和全天卡路里消耗这类运动指标。” 这 55 条重复被从分析中删除。
- 参与者用 “不适用” 表示他们找不到某条指南的例子，而不是像我们设计这个选项时希望的那样表示指南对他们的产品不相关（73 条）。例如，“说实话，我觉得这条是适用的，但我想不出怎么展示它。” 以及 “找不到应用或违背的例子。” 这 73 条也被从分析中删除。
- 参与者用 “不适用” 表示某条指南被违背了（20 条）。例如，“即使在设置页面里，自动补全功能也没有任何更改或定制的选项。” 以及 “[语音助手，产品 1] 没有给出额外的提示或建议，来告诉我除了刚才让它执行的任务之外，这个系统还能做什么。” 我们把这些重新归类为违背。
- 参与者把一条指南误当成另一条（56 条），下面会进一步讨论。我们用两轮流程来识别这些情况：先由团队中一位成员检查参与者回答，找出每个案例，再由另一位成员核实或否决。当两位评审意见不一致时，我们又从分析中去掉了 14 条。
:::

## 结果（Results）

:::bi

Our evaluation in this phase focused on two key questions, each addressed in one of the subsections below: 1) Are the guidelines relevant? That is, can we identify examples of each guideline across a variety of products and features? 2) Are the guidelines clear? That is, can participants understand and differentiate among them?

:::zh

这一阶段的评估围绕两个关键问题，分别在下面两个小节里讨论：第一，这些指南是否相关？也就是说，我们能否在多种产品和功能中找到每条指南的例子？第二，这些指南是否清晰？也就是说，参与者能否理解并区分它们？
:::

:::bi

Relevance. Across the 20 products they evaluated, participants identified 785 examples of the 18 guidelines, after the adjustments described earlier: 313 applications, 277 violations, 89 neutrals (rated at the mid-point between “clearly applied” and “clearly violated”), and 106 instances of “does not apply”. Figures 1a-1c show the guideline counts per product category for applications, violations, and “does not apply”, respectively. Figure 1d shows an aggregate of all applicable ratings, including neutral responses. Finally, Table 1 shows example applications participants provided for each guideline (marked as “clearly applied” by the participant).

:::zh

相关性。在他们评估的 20 款产品中，经过前面的调整后，参与者一共识别出 18 条指南的 785 个例子：313 个应用，277 个违背，89 个中立（评分落在 “明确应用” 和 “明确违背” 的中点），以及 106 个 “不适用”。图 1a 到 1c 分别展示了按产品类别统计的应用，违背和 “不适用” 计数。图 1d 是全部适用评分的汇总，包括中立回答。最后，表 1 给出了参与者为每条指南提供的示例应用（被参与者标记为 “明确应用”）。
:::

:::figure
![Figure 1: Counts of applications (top left), violations (top right), and “does not apply” (bottom left) responses in our user study. Rows show counts by guideline, while columns show counts by product category tested.](./images/amershi-guidelines/fig-01.png)

Figure 1: Counts of applications (top left), violations (top right), and “does not apply” (bottom left) responses in our user study. Rows show counts by guideline, while columns show counts by product category tested.

:::zh
图 1：四张热力图分别是应用（左上），违背（右上）和 “不适用”（左下）的计数，右下是排除 “不适用” 之后包括中立回答的全部计数。行是指南 G1 到 G18，列是研究里测试的十个产品类别，右边和下边的橙色条是总计。看的时候先扫哪几行颜色深，再看哪几列，能立刻看出哪条指南在哪些产品里更有存在感。
:::
:::

:::bi

In this analysis, we use the following interpretation constructs to better understand results from Figure 1. First, we use the total number of applications and violations as an indicator of the overall evidence of a guideline being relevant (e.g., Guidelines 1, 12, 17). Second, relevant guidelines with a high positive difference between the number of applications and violations are guidelines which are not only relevant but also widely implemented for the set of products in the study (e.g., Guidelines 1, 4, 12). Third, relevant guidelines with a high negative difference between the number of applications and violations are guidelines which, despite their importance, are still not widely implemented (e.g., Guidelines 2, 11, 17). Fourth, we discuss guidelines with the highest numbers of "does not apply" (e.g., Guidelines 3, 5, 6).

:::zh

在这部分分析中，我们使用以下几个解释性构念，以便更好地理解图 1 的结果。第一，我们把应用和违背的总数当作某条指南相关性的整体证据指标（例如指南 1，12，17）。第二，如果一条相关指南的应用数显著多于违背数，说明它不仅相关，而且在研究覆盖的产品上被广泛实现（例如指南 1，4，12）。第三，如果一条相关指南的违背数显著多于应用数，说明它尽管重要，但还没有被广泛实现（例如指南 2，11，17）。第四，我们讨论 “不适用” 数量最高的几条指南（例如指南 3，5，6）。
:::

:::annotation

这四个 “解释性构念” 是 Results 一节能立住的关键。原始数字（图 1 里的计数）本身不会说话，作者先定义四个解读数字的角度，再逐个讨论指南。写自己论文的 Results 时，可以先想清楚 “我的数字要按哪几个角度来读”，再动笔。
:::

:::bi

Participants found at least one application or violation of each of our guidelines in each product category we tested, suggesting broad evidence of the guidelines’ relevance. While participants were able to identify examples of each guideline in most of the product categories we tested, voice assistants had the largest number of “does not apply” instances reported, while photo organizers, activity trackers and voice assistants had the fewest numbers of total applications or violations. Interestingly, each of these product categories involves a mode of operation or input data type beyond simple graphical user interfaces and text (specifically, interaction over images or sensor data, or voice-based interaction).

:::zh

在我们测试的每个产品类别里，参与者都至少找到了每条指南的一个应用或违背，这为指南的相关性提供了广泛的证据。虽然参与者在大多数产品类别里都能找到每条指南的例子，但语音助手的 “不适用” 报告最多，而照片整理，活动追踪器和语音助手的应用或违背总数最少。有意思的是，这几个产品类别都涉及简单的图形界面和文本之外的某种操作方式或输入数据类型（具体来说，是基于图片或传感器数据的交互，或者基于语音的交互）。
:::

:::bi

No instances of Guideline 10 “Scope services when in doubt” were reported for the two social networks we tested and no instances of Guideline 14 “Update and adapt cautiously” were reported for the two activity trackers. Some participants reported that these guidelines were hard to observe in a single session or without knowledge about the underlying AI algorithms. For example, one participant noted that Guideline 10 was “More difficult to assess unless you have a lengthy period of time with the product - and potential guidance for understanding the behind-the-scenes mechanisms,” possibly referring to understanding when the AI system was “in doubt”. Similarly, for Guideline 14, one participant said, “It’s a bit difficult to assess this in a single session.” These guidelines were, however, observed in all other products that participants tested in our study, so such difficulty could be attributed to the guidelines not being applied or being difficult to observe in these particular products.

:::zh

在我们测试的两款社交网络上，没有出现指南 10 “不确定时缩小服务范围” 的任何实例，在两款活动追踪器上也没有出现指南 14 “谨慎地更新与适配” 的任何实例。一些参与者表示，这些指南很难在单次会话里观察到，或者在缺少对底层 AI 算法了解的情况下很难观察到。例如，一位参与者说指南 10 “很难评估，除非你和这个产品相处很长一段时间，并且对幕后机制有一定了解”，这大概是在说，要判断 AI 系统什么时候 “不确定” 并不容易。同样，对指南 14，一位参与者说：“在单次会话里有点难评估。” 不过，在我们研究中的其他产品上，这些指南都被观察到了。所以这种困难可能应归因于它们在这些特定产品上没有被应用，或者很难被观察到。
:::

:::bi

Relevant guidelines that have significantly (at least 40%) more applications than violations are evidence of being widely implemented across products. This is also an indicator that there exist current mechanisms in the intersection of AI and design that facilitate the implementation of such guidelines. For example, frequent item sets and location detection were two common mechanisms used to support Guideline 4 in showing contextually relevant information (e.g., [E-commerce, Product #2] “The feature assumes I’m about to buy a gaming console and shows accessories and games that would go with it...” or [Web Search, Product #2] “Searching a movie title returns show times near my location for today’s date”). For Guideline 12, multiple products leverage the history of user interactions to suggest a reduced cache of items that might be more useful to the user (e.g., [Navigation, Product #1] “Opening the app shows a list of recent destinations, as well as allows you to access ’favorite’ locations.”).

:::zh

如果一条相关指南的应用数明显（至少 40%）多于违背数，就说明它在产品中被广泛实现。这也意味着，在 AI 与设计的交叉处，目前已经存在一些机制来帮助实现这类指南。例如，频繁项集和位置检测是支持指南 4 展示上下文相关信息的两类常见机制（例如 [电商，产品 2] “这个功能假设我正要买一台游戏主机，于是展示会搭配的配件和游戏……” 或者 [网页搜索，产品 2] “搜索一个电影名，会返回我附近今天上映的场次”）。对指南 12 来说，多款产品利用用户交互历史，给出一个更精简的，可能对用户更有用的条目缓存（例如 [导航，产品 1] “打开应用会显示最近去过的地方列表，也能让你访问 ‘收藏’ 地点。”）。
:::

:::bi

Some guidelines emerged as relevant, but not widely implemented, as indicated by the large number of violations. For example, Guideline 11 “Make clear why the system did what it did” had one of the highest number of violations, despite the large volume of active research in the area of intelligibility and explanations. This guideline also had one of the fewest reported instances of “does not apply”, suggesting that participants could imagine opportunities for explanations, but were often unable to obtain them. In some cases, participants reported violations when they were unable to locate any explanation at all (e.g., [E-commerce, Product #1] “I have no idea why this is being shown to me. Is it trying to sell me stuff I do not need?” and [Music Recommender, Product #1] “Even when drilling down into a song there is no explanation for why this particular song was recommended.”). In other cases, participants reported violations when explanations were provided but were seemingly inadequate for their purposes (e.g., [Email, Product #1] “This does list out things which affect it, but they don’t explain it in a clear manner. Do each of these affect it equally?” and [Navigation, Product #1] “It always says the suggested route is the “best route” but it doesn’t give you the criteria for why that route is the best.”). These results suggest that participants could envision explanations being useful in most of the products we tested, but more work is necessary to understand the level of explanations people may desire and how designers can produce them. In some cases, explanations might be undesirable, for financial or business reasons (e.g. adversarial (gaming) behavior by Web page authors would be exacerbated if search engines explained their ranking.).

:::zh

有些指南被认定为相关，但尚未被广泛实现，表现为大量的违背。例如，指南 11 “明确说明系统为何这样做” 的违背数量最多，尽管可理解性和解释领域已经有大量活跃研究。这条指南的 “不适用” 报告又最少，说明参与者能够想象出解释的机会，但往往拿不到这些解释。有些情况下，参与者报告违背，是因为他们根本找不到任何解释（例如 [电商，产品 1] “我完全不知道为什么给我看这个。它是在向我推销我不需要的东西吗？” 以及 [音乐推荐，产品 1] “即使点进一首歌，也没有解释为什么推荐这首。”）。另一些情况下，解释提供了，但看起来不够用，参与者也会报告违背（例如 [邮件，产品 1] “它确实列出了影响推荐的因素，但没有清楚地解释。这些因素各自的影响一样大吗？” 以及 [导航，产品 1] “它总说建议路线是‘最佳路线’，但不告诉你为什么它最佳。”）。这些结果表明，参与者能够设想解释在我们测试的大多数产品里都有用，但还需要更多工作去理解人们想要什么程度的解释，以及设计师如何给出这些解释。有些情况下，解释可能因为财务或商业原因而不受欢迎（例如，如果搜索引擎解释排名，网页作者的对抗性（刷榜）行为会被放大）。
:::

:::bi

Guidelines 3, 5, and 6 had the highest number of "does not apply" ratings. Several participants indicated that Guideline 3 was not applicable because the products they were testing presented services only when explicitly requested by the user. For example, for one of the E-commerce products, one participant stated, “I feel this guideline does not apply for the recommendations page. It [is] a very ‘pull’ kind of interaction.”; i.e., the user views recommendations while browsing and there are no ‘push’ notifications. Similarly, for one of the Web Search engines we tested, one participant stated, “[the search engine] does not generally interrupt a user at any point. The mobile app has notifications, which might be relevant here, but the desktop website does not. Generally speaking, AI services pop up based on when the user searches and what he or she searches for, not based on an ongoing session.” This guideline is therefore likely more relevant for products that take proactive actions without explicit user requests, such as sending notifications.

:::zh

指南 3，5 和 6 的 “不适用” 评分最高。几位参与者表示，指南 3 不适用，因为他们测试的产品只在用户明确请求时才提供服务。例如，对其中一款电商产品，一位参与者说：“我觉得这条指南不适用于推荐页面。它是一种很 ‘拉取’ 的交互。” 也就是说，用户在浏览时看到推荐，但没有任何 ‘推送’ 通知。同样，对我们测试的其中一个网页搜索引擎，一位参与者说：“这个搜索引擎一般不会在任何时候打断用户。移动应用有通知，也许在这里相关，但桌面网站没有。一般来说，AI 服务是根据用户什么时候搜，搜什么弹出来的，而不是基于一个持续的会话。” 因此，这条指南更可能适用于那些在没有明确用户请求时就采取主动动作的产品，比如发送通知。
:::

:::bi

Guideline 5 “Match relevant social norms” and Guideline 6 “Mitigate social biases” had some of the most reported instances of “does not apply”. Examination of these instances revealed that in some cases participants firmly believed these guidelines were not relevant for the products they were testing while other participants reported either applications or violations of these guidelines in those same product categories. For example, one participant reported about one of the navigation products tested that “information is not subject to biases, unless users are biased against fastest route”. However, a different participant was able to identify a violation of this guideline for the same product category “Regards the ‘Walking’ transport there’s no way to set an average walking speed. [The product] assumes users to be healthy.” Similarly, one participant reported about one of the voice assistants we tested that “Nothing in this interaction had any social biases that it could reinforce.”, while another stated about the same product that “While it’s nice that a male voice is given as an option, the default [voice assistant] voice is female, which reinforces stereotypical gender roles that presume a secretary or receptionist is female.” Some participants, however, had no trouble identifying bias: "I typed in ’black’ in the search bar and it came back with images of me as well as my niece [...] it saw a black face and used that as its frame of reference for all pictures, then returned all pictures of me and my family without images of other black spaces in an environment".

:::zh

指南 5 “符合相关的社会规范” 和指南 6 “减少社会偏见” 的 “不适用” 报告也很多。检查这些实例后发现，有些参与者坚信这些指南与他们测试的产品无关，而另一些参与者在同样的产品类别里报告了指南的应用或违背。例如，一位参与者谈到其中一款导航产品时说：“信息本身不会带偏见，除非用户对最快路线有偏见。” 但另一位参与者能在同一产品类别里找出这条指南的违背：“关于 ‘步行’ 这种出行方式，没有办法设置平均步行速度。这个产品假设用户都是健康的。” 同样，一位参与者谈到我们测试的其中一个语音助手时说：“这次交互里没有任何可能被强化的社会偏见。” 而另一位参与者谈到同一款产品时说：“虽然提供一个男声选项是好事，但 [语音助手] 默认的声音是女声，这强化了秘书或前台由女性担任的刻板性别角色。” 不过，有些参与者识别偏见毫无困难：“我在搜索栏里输入 ‘black’，返回的有我，也有我侄女 […] 它识别到一张黑人的脸，并以此为参照来处理所有照片，然后返回的全是我和我家人的照片，没有其他黑人出现在环境里的照片。”
:::

:::bi

Guidelines 5 and 6 were noted as the least clear by our participants in their (see Figure 2), with several participants remarking about the difficulty of imagining social norms beyond their own or recognizing potential sources of bias (e.g., “Hard for a designer to implement, because it requires them to think outside of their own social context”, “Doesn’t apply to me but to potential other people.”, and “This is hard to measure. Who defines what is undesirable and unfair?”). These assessments suggest that a diverse set of evaluators may be necessary to effectively recognize or apply these guidelines in practice. Alternatively, designers may need specific training or tools to recognize social norms and biases. GenderMag[5], a method for identifying gender biases in user interfaces, is one such tool, but further work is needed in this area.

:::zh

参与者认为指南 5 和指南 6 最不清晰（见图 2）。几位参与者提到，很难想象超出自身文化的社会规范，也很难识别潜在的偏见来源（例如 “设计师很难落实，因为这要求他们跳出自己的社会语境去想。” “这条对我不适用，但对其他潜在的人适用。” 以及 “这很难衡量。谁来决定什么是不受欢迎和不公平的？”）。这些评价表明，要让这些指南在实践中被有效识别或应用，可能需要多元的评估者。另一种可能是，设计师需要专门的训练或工具来识别社会规范和偏见。GenderMag [5] 就是一种识别界面性别偏见的方法，但这一领域还需要更多工作。
:::

:::bi

Clarity and Clarifications. Figure 2 presents clarity ratings for all guidelines. To identify guidelines in need of further clarification, we reviewed these ratings and the 56 misinterpretations explained in the section Adjustments and Misinterpretations. We noted guidelines as needing further clarification when errors were determined to be systematic, which we defined as having four or more instances confused with another guideline or having multiple participants making similar comments about clarity. From this analysis, we identified and addressed the following issues:

:::zh

清晰度与澄清。图 2 给出了所有指南的清晰度评分。为了找出需要进一步澄清的指南，我们回顾了这些评分，以及 “调整与误解” 一节里说明的 56 次误解。当错误被判定为系统性时，我们就把这条指南标为需要进一步澄清。系统性的定义是：与另一条指南混淆的实例达到四个或以上，或者有多位参与者对清晰度给出类似评论。通过这项分析，我们识别并处理了以下问题：
:::

:::figure
![Figure 2: Subjective evaluations by study participants about the clarity of the 18 AI design guidelines.](./images/amershi-guidelines/fig-02.png)

Figure 2: Subjective evaluations by study participants about the clarity of the 18 AI design guidelines.

:::zh
图 2：18 条指南的清晰度评分，颜色从深蓝（非常清晰）过渡到深红（非常困惑）。G7，G8，G9 这类具体到动作的指南最清晰，G5，G6 这类涉及社会规范与偏见的指南最不清晰，这和正文里 “最难区分” 的讨论对得上。
:::
:::

:::bi

Guidelines 1, 2, and 11 (originally phrased as “Make capabilities clear”, “Set expectations of quality” and “Make explanations of behavior available”) had 13 misinterpreted instances (5 between Guidelines 1 and 2; 8 between Guidelines 1 and 11) and several comments about these being hard to differentiate (e.g., one participant commented on Guideline 2 that “I don’t know what is different between this guideline and the guideline #1”). To clarify, we revised these guidelines using parallel language while emphasizing the intended differences (Guideline 1 is about what the system can do, Guideline 2 is about how well the system can do it, and Guideline 11 is about explaining why something happened, after the fact).

:::zh

指南 1，2 和 11（原来的措辞分别是 “让能力清晰”，“设定质量期望” 和 “让行为的解释可获取”）共有 13 次被误解（指南 1 与 2 之间 5 次，指南 1 与 11 之间 8 次），还有若干评论说它们很难区分（例如一位参与者评论指南 2 时说：“我不知道这条指南和指南 1 有什么区别。”）。为了澄清，我们用一致的句式改写了这几条指南，同时强调它们本来的差异：指南 1 说的是系统能做什么，指南 2 说的是系统做得多好，指南 11 说的是事后解释为什么发生了某件事。
:::

:::bi

Guideline 4 (originally phrased as “Show contextually relevant information. Display information about the user’s inferred goals and attention during interaction.”) was confused with Guideline 13 (originally phrased as “Learn from user behavior. Personalize the experience based on the user’s past actions”) six times. Examination revealed that most of these errors were due to “preferences” and “personalization” being considered as “relevant context”. To clarify, we rephrased these guidelines as in Table 1, emphasizing the difference between a user’s “current context” (e.g., “current task and environment”) and personalization which we intended to mean learning about preferences “over time”.

:::zh

指南 4（原来的措辞是 “展示上下文相关的信息。展示关于用户在交互中推断出的目标和注意力的信息。”）与指南 13（原来的措辞是 “从用户行为中学习。根据用户过去的行为来个性化体验。”）被混淆了六次。检查发现，大多数错误是因为 “偏好” 和 “个性化” 被当成了 “相关上下文”。为了澄清，我们按表 1 改写了这两条指南，强调用户的 “当前上下文”（例如 “当前任务与环境”）与个性化之间的区别，后者我们想表达的是 “随时间推移” 学习偏好。
:::

:::bi

Guidelines 3 and 4 (originally phrased as “Time services based on context” and “Show contextually relevant information”) were confused with each other in four instances. Several participants commented that this was because what is displayed and when it is displayed are often related (e.g., “provide the right information at the right time” and “The time when I’m specifically looking for DP to HDMI cable should be the most ideal time to recommend possible variations in DP to HDMI”). However, we decided to keep these guidelines separate to avoid conjunctions and updated Guideline 3 to use the same language of “current task and environment” as Guideline 4.

:::zh

指南 3 和指南 4（原来的措辞是 “根据上下文安排服务的时机” 和 “展示上下文相关的信息”）被相互混淆了四次。几位参与者评论说，这是因为展示什么与什么时候展示往往相关（例如 “在合适的时间提供合适的信息”，以及 “当我专门在找 DP 转 HDMI 线的时候，应该就是推荐各种 DP 转 HDMI 方案最理想的时机”）。不过，为了避免使用连词，我们决定让这两条指南保持独立，并把指南 3 更新为使用与指南 4 相同的 “当前任务与环境” 这一措辞。
:::

:::bi

Guideline 12 (originally phrased as “Maintain working memory”) was confused with Guideline 13 (“Learn from user behavior”) seven times, seemingly because the term “memory” was being interpreted as something that happens over time. To clarify, we revised these guidelines as in Table 1 to emphasize the difference between maintaining short term memory of recent interactions and learning behaviors over time.

:::zh

指南 12（原来的措辞是 “维护工作记忆”）与指南 13（“从用户行为中学习”）被混淆了七次，原因似乎是 “记忆” 这个词被理解成了随时间推移发生的事情。为了澄清，我们按表 1 改写了这些指南，强调维护近期交互的短期记忆与随时间学习行为之间的区别。
:::

:::bi

Guidelines 15 and 17 (originally phrased as “Encourage feedback” and “Provide global controls”, respectively) were confused six times, seemingly because the difference between local (or instance-level) feedback and global feedback (e.g., settings that impact behaviors on all instances) was still unclear despite introducing the term “global” after our first heuristic evaluation in Phase 2. We therefore revised these Guidelines as in Table 1 to further emphasize that Guideline 15 is about granular feedback that happens during a specific interaction, while Guideline 17 is about global customization of behaviors.

:::zh

指南 15 和指南 17（原来的措辞分别是 “鼓励反馈” 和 “提供全局控制”）被混淆了六次，原因似乎是局部（或实例层面）反馈与全局反馈之间的区别仍然不清楚，尽管我们在第二阶段第一次启发式评估之后已经引入了 “global” 这个词。因此，我们按表 1 改写了这些指南，进一步强调指南 15 说的是特定交互过程中发生的细粒度反馈，而指南 17 说的是行为的全局定制。
:::

:::bi

These revisions resulted in the final set of guidelines presented in Table 1, which we further evaluated with experts as described in the following section.

:::zh

这些修订形成了表 1 中给出的最终版指南。随后我们请专家对它们做了进一步评估，下一节会介绍。
:::

## 第四阶段：专家评估修订版（6 Phase 4: Expert Evaluation of Revisions）

:::bi

To verify whether the revisions we proposed in the previous section improved our guidelines, we conducted an expert review. Expert reviews have been shown to be effective at identifying problems related to wording and clarity [27, 34, 43]. For this purpose, we defined experts as people who have work experience in UX/HCI and who are familiar with discount usability methods such as heuristic evaluation.

:::zh

为了验证上一节提出的修订是否改进了指南，我们做了一次专家评审。已有研究表明，专家评审在识别措辞和清晰度方面的问题是有效的 [27, 34, 43]。为此，我们把专家定义为在 UX/HCI 领域有工作经验，并且熟悉启发式评估这类廉价可用性方法的人。
:::

:::bi

We reasoned that experts with experience in applying various guidelines to design solutions would be able to assess whether our guidelines would be easy to understand and therefore to work with.

:::zh

我们推断，有把各种指南应用到设计方案上的经验的专家，应该能判断我们的指南是否容易理解，从而是否好用。
:::

:::bi

We recruited 11 experts (6 female, 5 male) from the same large company through snowball sampling. Of these experts, 6 were UX designers, 3 were UX researchers, and two were in research and product planning roles. Their length of experience working in UX or HCI was more than 20 years (1), 16-20 years (4), 11-15 years (3), and 2-5 years (3). Participants self-reported their familiarity with discount usability methods as very high (5), high (4), and medium (2).

:::zh

我们通过滚雪球抽样，从同一家大型公司招募了 11 位专家（6 位女性，5 位男性）。其中 6 位是 UX 设计师，3 位是 UX 研究员，2 位从事研究和产品规划。他们在 UX 或 HCI 领域的工作年限分布是：20 年以上（1 人），16 到 20 年（4 人），11 到 15 年（3 人），2 到 5 年（3 人）。参与者自评对廉价可用性方法的熟悉程度为：非常熟悉（5 人），熟悉（4 人），中等（2 人）。
:::

:::bi

First, we asked each expert to review the 9 revised guidelines independently. They chose, for each guideline, the version they thought was easier to understand (the old version or the version we revised after in Phase 3). Then the experts reviewed the pairs of guidelines that emerged in Phase 3 as confusing or overlapping. For each pair, we asked experts to rate whether the two guidelines mean the same thing and the difficulty of distinguishing between them. We compensated participants with a $30 gift card for an estimated time commitment of 45 minutes.

:::zh

首先，我们请每位专家独立评审 9 条修订过的指南。对每条指南，他们选出自己认为更容易理解的版本（旧版本或我们在第三阶段之后修订的版本）。然后，专家审阅了第三阶段中暴露为令人困惑或相互重叠的指南对。对每一对，我们请专家评价两条指南是否表达了同一个意思，以及区分它们的难度。我们为参与者提供了 30 美元礼品卡，按预计 45 分钟的投入来补偿。
:::

:::bi

Figure 3 shows that experts preferred the revised versions for all but Guideline 15. Revisions appear to have helped distinguish between the pairs of guidelines Phase 3 participants had trouble with, but five experts still found Guidelines 1 and 2 somewhat difficult to distinguish (Table 4). Since the revision of Guideline 15 made it easy to distinguish it from 17, we decided to keep it. Table 3 illustrates the evolution of the first two guidelines through the four phases.

:::zh

图 3 显示，除了指南 15，专家在所有指南上都更偏好修订版。修订似乎确实帮助区分了第三阶段参与者觉得难分的那些指南对，但仍有五位专家认为指南 1 和指南 2 有些难区分（表 4）。由于指南 15 的修订让它与指南 17 变得容易区分，我们决定保留这条修订。表 3 展示了前两条指南在四个阶段中的演化。
:::

:::figure
![Figure 3: Number of experts out of 11 who preferred the revised or the old version. One participant suggested their own alternative for Guideline 3.](./images/amershi-guidelines/fig-03.png)

Figure 3: Number of experts out of 11 who preferred the revised or the old version. One participant suggested their own alternative for Guideline 3.

:::zh
图 3：11 位专家里，多少人更偏好修订版（蓝色），多少人更偏好旧版（橙色）。除了指南 15，专家几乎一边倒地选了修订版，指南 3 还多了一个专家自己写的替代版本。这张图是第四阶段 “专家验证修订” 的核心证据。
:::
:::

:::bi

| Phase | Guideline wording |
| --- | --- |
| Phase 1: Consolidating guidelines | Set appropriate expectations. Set accurate expectations to give people a clear idea of what the experience is and isn’t capable of doing. |
| Phase 2: Internal evaluation | Set appropriate expectations. |
| Phase 3: User study | G1: Make capabilities clear. Help the user understand what the AI system is capable of doing.<br>G2: Set expectations of quality. Help the user understand what level of performance the AI system is capable of delivering. |
| Phase 4: Expert evaluation of revisions | G1: Make clear what the system can do. Help the user understand what the AI system is capable of doing.<br>G2: Make clear how well the system can do what it can do. Help the user understand how often the AI system may make mistakes. |

Table 3: Evolution of Guidelines 1 and 2.

| Guidelines | Meanings: Different | Distinguish: Easy | Distinguish: Hard | Distinguish: Neutral/Medium |
| --- | --- | --- | --- | --- |
| 1 & 2 | 10 | 6 | 5 | 0 |
| 1 & 11 | 11 | 6 | 2 | 3 |
| 3 & 4 | 10 | 6 | 2 | 3 |
| 4 & 13 | 11 | 9 | 1 | 1 |
| 12 & 13 | 9 | 7 | 1 | 3 |
| 15 & 17 | 10 | 9 | 1 | 1 |

Table 4: Number of experts out of 11 who rated each pair of guidelines as different in meaning and distinguishable.

:::zh

| 阶段 | 指南措辞 |
| --- | --- |
| 第一阶段：合并指南 | 设定合适的预期。设定准确的预期，让人们清楚这段体验能做什么，不能做什么。 |
| 第二阶段：内部评估 | 设定合适的预期。 |
| 第三阶段：用户研究 | G1：让能力清晰。帮助用户理解这个 AI 系统具备哪些能力。<br>G2：设定质量期望。帮助用户理解这个 AI 系统能提供什么水平的性能。 |
| 第四阶段：专家评估修订版 | G1：明确系统能做什么。帮助用户理解这个 AI 系统具备哪些能力。<br>G2：明确系统把这件事能做得多好。帮助用户理解 AI 系统出错的频率大概是多少。 |

表 3：指南 1 和指南 2 在四个阶段中的演化。

| 指南对 | 含义不同 | 容易区分 | 难以区分 | 中立/中等 |
| --- | --- | --- | --- | --- |
| 1 & 2 | 10 | 6 | 5 | 0 |
| 1 & 11 | 11 | 6 | 2 | 3 |
| 3 & 4 | 10 | 6 | 2 | 3 |
| 4 & 13 | 11 | 9 | 1 | 1 |
| 12 & 13 | 9 | 7 | 1 | 3 |
| 15 & 17 | 10 | 9 | 1 | 1 |

表 4：11 位专家中，认为每一对指南在含义上不同，且可以区分的人数。
:::

## 讨论与未来工作（7 Discussion & Future Work）

:::bi

We synthesized guidance proposed over the past 20 years about the design of human-AI interaction into a set of 18 AI usability guidelines. These guidelines were iteratively re-fined in four phases by a team of 11 researchers, and were applied or reviewed by an additional 60 designers and usability practitioners. Over the various stages of development, the guidelines were applied to AI-infused products across 10 product categories. These efforts provide evidence for the relevance of the guidelines across a wide range of common AI-infused systems. In terms of utility, we anticipate the guidelines will be useful to evaluate existing products and emerging design ideas. Our evaluation methods show that the guidelines lend themselves well to usability inspection methods such as heuristic evaluation. Future work could examine the uses and value of these guidelines at various stages of design.

:::zh

我们把过去 20 年关于人机交互设计提出的指导，综合成一套 18 条 AI 可用性指南。这些指南由一个 11 人的研究团队分四个阶段迭代修订，另有 60 位设计师和可用性从业者应用或评审过它们。在开发的不同阶段，这些指南被应用到横跨 10 个产品类别的 AI 融合产品上。这些努力为指南在广泛的常见 AI 融合系统中的相关性提供了证据。从实用性来说，我们预计这些指南能用来评估已有产品和新兴的设计想法。我们的评估方法表明，这些指南很适合启发式评估这类可用性检查方法。未来的工作可以研究这些指南在设计不同阶段中的用途和价值。
:::

:::bi

We recognize that there is a tradeoff between generality and specialization, and that these guidelines might not adequately address all types of AI-infused systems. For example, we reported that some guidelines do not directly apply to AI systems that lack graphical user interfaces (e.g., voice-based virtual assistants and activity trackers). Additional guidelines may be necessary to help designers and developers create intuitive and effective products with these properties or in these product categories. Likewise, specialized guidelines may be required in certain high-risk or highly regulated areas such as semi-autonomous vehicles, robot-assisted surgery, and financial systems. We hope the 18 guidelines presented here and their validation process stimulate and inform future research into the development of domain-specific guidance.

:::zh

我们认识到，普遍性与专门化之间存在权衡，这些指南可能无法充分覆盖所有类型的 AI 融合系统。例如，我们报告过，有些指南不直接适用于缺少图形界面的 AI 系统（例如基于语音的虚拟助手和活动追踪器）。可能需要额外的指南来帮助设计师和开发者，为具备这些属性或属于这些产品类别的产品做出直观，有效的设计。同样，在某些高风险或强监管领域，比如半自动驾驶汽车，机器人辅助手术和金融系统，可能需要专门的指南。我们希望这里给出的 18 条指南及其验证过程，能激发并启发未来对领域专用指南的开发研究。
:::

:::bi

Our work also intentionally focused on AI design guidelines that we believed could be easily evaluated by inspection of a system’s interface. For example, we excluded broad principles such as "build trust", and focused instead on specific and observable guidelines that are likely to contribute to building trust. Previous work, however, has proposed guidelines that impact the usability of AI-infused systems but must be considered when constructing the AI model. For example, we excluded Horvitz’s [17] principle of “inferring ideal action in light of costs, benefits, and uncertainties” and guidance about being “especially conservative in the beginning” because these require decisions to be made at the modeling layer of a system. We foresee the value of future work to investigate how designers and model developers can work together to effectively apply these guidelines in AI-infused systems. For example, given the expected performance of an AI model, designers may recommend specific designs that reduce costs while optimizing benefits to users (e.g., displaying multiple options to users until the performance of the AI model is improved enough to take proactive action on the user’s behalf).

:::zh

我们的工作还有意聚焦于那些我们认为可以通过检查系统界面来轻松评估的 AI 设计指南。例如，我们排除了 “建立信任” 这类宽泛原则，转而关注具体，可观察，可能有助于建立信任的指南。不过，以往的工作也提出过一些会影响 AI 融合系统可用性，但必须在构建 AI 模型时就被考虑的指南。例如，我们排除了 Horvitz [17] 的 “结合成本，收益与不确定性推断理想动作” 原则，以及 “开始时格外保守” 的建议，因为这两者需要在系统的建模层面做决策。我们预见，研究设计师和模型开发者如何协作，从而在 AI 融合系统中有效应用这些指南，是有价值的。例如，给定一个 AI 模型的预期性能，设计师可以推荐一些具体设计，在为用户优化收益的同时降低成本（例如，在 AI 模型的性能提升到足以代表用户采取主动行动之前，先向用户展示多个选项）。
:::

:::annotation

讨论节把 “我们没覆盖什么” 写得很具体：没有图形界面的系统，高风险领域，以及需要建模层配合的指南。局限写得越具体，评审越会觉得作者清楚自己在做什么。反过来，一句笼统的 “our work has limitations” 是减分的。
:::

:::bi

Our decisions to optimize for generality, and to focus on observable properties, serve as a reminder that interaction designers routinely encounter these types of trade-offs. We anticipate situations where there will be interactions and trade-offs in attempts to employ several of the guidelines. As an example, if a system uses a complex or deep model to achieve a high level of performance, it may be challenging to both convey the consequences of user actions (Guideline 16), while also actively learning from user behavior (Guideline 13). Further research is necessary to understand the implications of these potential interactions and trade-offs for the design of AI systems and to understand how designers employ these guidelines "in the wild."

:::zh

我们为普遍性和可观察属性所做的取舍，也提醒着人们，交互设计师日常就会遇到这类权衡。我们预计会出现一些情境，在其中同时采用多条指南会产生交互作用和取舍。举例来说，如果一个系统使用复杂或很深的模型来达到很高的性能，那么既要传达用户行为的后果（指南 16），又要积极从用户行为中学习（指南 13），就可能很有挑战。还需要进一步研究，才能理解这些潜在交互和取舍对 AI 系统设计的含义，以及设计师在 “真实世界” 里如何使用这些指南。
:::

:::bi

Finally, we recognize that our guidelines only begin to touch on topics of fairness and broader ethical considerations. Ethical concerns extend beyond the matching of social norms (Guideline 5) and mitigating social biases (Guideline 6). As an example, an AI system may adhere to each of these guidelines and yet impact people’s lives or livelihoods in a consequential manner. It is imperative that system designers carefully evaluate the many influences of AI technologies on people and society, and that this remains a topic of ongoing research and intense interest. Ethics-focused guidelines can be difficult to fully evaluate in a heuristic evaluation, and successful detection of problems may depend on who is performing the evaluation. Our results related to Guidelines 5 “Match relevant social norms” and 6 “Mitigate social biases” suggest that diversity among evaluators helps identify a range of issues that might be invisible to members of majority groups.

:::zh

最后，我们认识到，我们的指南只是刚开始触及公平性和更广泛的伦理议题。伦理关切不止于符合社会规范（指南 5）和减少社会偏见（指南 6）。举例来说，一个 AI 系统可能遵守了这里的每一条指南，却仍然给人们的生活或生计带来重大影响。系统设计者必须仔细评估 AI 技术对人和社会带来的多种影响，这也必须继续作为持续研究和强烈关注的话题。以伦理为中心的指南，在启发式评估里往往很难被完整评估，能否成功发现问题可能取决于由谁来评估。我们关于指南 5 “符合相关的社会规范” 和指南 6 “减少社会偏见” 的结果表明，评估者的多样性有助于发现一系列问题，而这些问题对多数群体的成员来说可能是看不见的。
:::

## 结论（8 Conclusion）

:::bi

We proposed and evaluated 18 generally applicable design guidelines for human-AI interaction. We distilled the guidelines from over 150 AI-related design recommendations and validated them through three rounds of evaluation. We are hopeful that application of these guidelines will result in better, more human-centric AI-infused systems, and that our synthesis can facilitate further research. As the current technology landscape is shifting towards the increasing inclusion of AI in computing applications, we see significant value in working to further develop and refine design guidelines for human-AI interaction.

:::zh

我们提出并评估了 18 条普遍适用的人机交互设计指南。这些指南提炼自 150 多条 AI 相关设计建议，并经过三轮评估验证。我们希望这些指南的应用能带来更好，更以人为本的 AI 融合系统，也希望我们的综合工作能推动后续研究。当前的技术格局正在走向在计算应用中更广泛地纳入 AI，我们认为，继续开发和精炼人机交互设计指南具有重要价值。
:::

## 致谢（9 Acknowledgments）

:::bi

The authors would like to acknowledge the contributions of our newest team member, Ever Zayn McDonald.

:::zh

作者感谢我们最新的团队成员 Ever Zayn McDonald 的贡献。
:::
