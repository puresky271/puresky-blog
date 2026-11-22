---
title: '对抗蒸馏：OpenAI 如何守住模型的推理轨迹'
description: 'OpenAI 系统讲了自己怎么对抗蒸馏：在单次请求上做对抗训练，用分类器检查和 API 层限制，在账号层面调查并处置有组织的蒸馏活动。文章给了两组数字：更新防护后，平均攻击成功率从 54.0% 降到 0.2%。另一组只换训练数据的内部实验里，拿到完整推理轨迹的学生模型在最大推理预算下，比只用推理摘要的模型高出约 8 到 10 个百分点。最后还讲了国家安全层面的定性，对立法和出口管制的支持，以及给其他团队的四条建议。'
pubDate: 2026-11-21
author: 'OpenAI'
category: curation
tags: ['AI 安全', 'LLM', '推理模型', '评测', 'OpenAI团队']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 OpenAI 官方博客 [Combatting adversarial distillation](https://openai.com/index/combatting-adversarial-distillation/) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2026 年 11 月 20 日，按 OpenAI 的统一署名，没有个人作者。全文逐段译出，没有略去章节。原文配了两张图：一张在两个网络安全基准上对比训练数据的交互图表，这里按原图 1:1 重做成可交互版本，点标签可以切换 ExploitBench 和 SEC-bench Pro，鼠标停在点上还能看具体数值（原图没有 tooltip，这一条是补的，右上角的 OpenAI 标记也没画）。还有一张两层防护的示意图。两图的英文图注照抄原文，图下各加了一行中文小字做导读。原文有一条脚注，也一并译出。译文按原意译出，术语和小标题做了中文化，原文里的外链都保留着。文中带铅笔图标的 6 条注解是我加的补充说明，不属于原文。版权归 OpenAI 所有，译文只作学习交流之用。

:::bi

As frontier AI models become more capable, safeguards play an increasingly important role in how they can be used responsibly. Adversarial distillation creates a path for bad actors to reproduce these capabilities without appropriate safeguards. An actor may use a frontier model’s outputs without authorization to train another model with similar capabilities, then deploy it without comparable protections. For instance, an adversary might distill a model’s cyber capabilities and use the resulting model to help carry out cyberattacks that the original model would have refused to assist with or that its safeguards would have blocked.

:::zh

随着前沿 AI 模型能力越来越强，要负责任地使用它们，防护措施正变得越来越关键。对抗蒸馏给恶意行为者提供了一条路径，让他们能在没有相应防护措施的情况下复制这些能力。行为者可能未经授权就使用前沿模型的输出，去训练另一个能力相近的模型，然后在没有同等防护的情况下把它部署出去。例如，对手可能蒸馏某个模型的网络能力，再用得到的模型去帮助实施网络攻击，而这些攻击原本的模型会拒绝协助，或者会被它原有的防护措施拦下。
:::

:::bi

We’re sharing how OpenAI detects and disrupts adversarial distillation, how we’ve strengthened protections for our models’ protected reasoning, and what we’ve learned that can help strengthen defenses across the industry.

:::zh

本文分享 OpenAI 如何发现并阻断对抗蒸馏，如何强化对模型受保护推理的防护，以及我们从中总结出的经验，这些经验可以帮助整个行业加强防御。
:::

:::bi

Our approach to adversarial distillation combines adversarial testing, model training, classifiers, and API-level protections with investigations into coordinated attempts to extract model capabilities. These updated safeguards align more closely with those we use for biology and cybersecurity.

:::zh

我们应对对抗蒸馏的思路，是把对抗测试，模型训练，分类器和 API 层防护结合起来，同时对有组织提取模型能力的尝试展开调查。这些更新后的防护措施，与我们用在生物学和网络安全上的防护更接近。
:::

:::bi

We place particular emphasis on preventing attackers from extracting our models’ protected reasoning: the intermediate steps a model generates internally while working toward an answer, known as its chain-of-thought. These traces can contain information the final answer leaves out, making them especially valuable training data for another model.

:::zh

我们特别重视防止攻击者提取模型受保护的推理，即模型在得出答案的过程中内部生成的中间步骤，通常称为思维链。这些轨迹可能包含最终答案没有透露的信息，因此对训练另一个模型来说是格外有价值的训练数据。
:::

:::annotation
原文反复强调“受保护的推理”，指的是模型内部生成，最终答案里却看不到的中间步骤。这类轨迹之所以是更好的训练数据，是因为它交出去的不只是答案，还有“怎么想出来的”这个过程。后面那组实验就是在量化这部分额外信息值多少能力。
:::

:::bi

We’ve strengthened our defenses against protected reasoning extraction in GPT‑6.2 Astra and GPT‑6.2 Sol. In an internal adaptive evaluation using [strong automated red-teaming](https://openai.com/index/unlocking-self-improvement-gpt-red/), we tested whether attackers could recover protected reasoning the model had generated while answering an earlier prompt. The average attack success rate fell from 54.0% against GPT‑6 Astra with its original safeguards to 0.2% against GPT‑6.2 Astra with its updated safeguards.

:::zh

在 GPT-6.2 Astra 和 GPT-6.2 Sol 上，我们加强了对受保护推理被提取的防御。在一次内部自适应评估中，我们用[强大的自动化红队测试](https://openai.com/index/unlocking-self-improvement-gpt-red/)，检验攻击者能否还原模型在回答更早的提示时生成的受保护推理。平均攻击成功率从 GPT-6 Astra 原始防护下的 54.0%，降到 GPT-6.2 Astra 更新防护后的 0.2%。
:::

## 为什么蒸馏是一个安全问题（Why distillation is a safety issue）

:::bi

Distillation is a common machine-learning technique in which one model learns from data produced by another. For example, a model can learn from another model’s answers, its reasoning, or its judgments about which answers are better and why. Beyond intellectual property concerns, unauthorized distillation poses serious safety risks. Through adversarial distillation, a second model can learn advanced frontier capabilities without inheriting the safeguards that govern how the original model can use them.

:::zh

蒸馏是一种常见的机器学习技术，一个模型从另一个模型产出的数据中学习。例如，模型可以从另一个模型的答案中学习，也可以从它的推理中学习，还可以学习它如何判断哪些答案更好以及好在哪里。除了知识产权上的顾虑，未经授权的蒸馏还会带来严重的安全风险。通过对抗蒸馏，第二个模型可以学到前沿模型的先进能力，却不会继承那些约束原模型如何使用这些能力的防护措施。
:::

:::bi

The concern is especially clear in dual-use domains like cybersecurity and biology. A model that helps defenders find vulnerabilities in software could also help an attacker exploit them; a model that assists with biological research could also help someone develop a harmful pathogen. If such capabilities were transferred to a model with weaker safeguards, it may provide assistance that the original model would have refused, or that the original safeguards would have blocked.

:::zh

这种担忧在网络安全和生物学这样的两用领域尤其明显。一个能帮防御者发现软件漏洞的模型，同样能帮攻击者利用这些漏洞。一个能辅助生物学研究的模型，同样能帮人开发有害病原体。如果这类能力被迁移到防护更弱的模型上，它可能提供原模型会拒绝的协助，或者提供原防护措施会拦下的协助。
:::

## 保护完整推理轨迹对网络安全的重要性（The importance of protecting exact reasoning traces for cyber safety）

:::bi

Our models help users with coding and defensive cybersecurity tasks. A second model trained on many of those benign outputs may learn skills that also apply to offensive cybersecurity tasks. To better understand this, we study how distillation, especially involving reasoning traces, may transfer risky cyber capabilities.

:::zh

我们的模型帮助用户完成编程和防御性网络安全任务。用大量这类良性输出训练出来的第二个模型，可能学到同样适用于攻击性网络安全任务的技能。为了更好地理解这一点，我们研究蒸馏，尤其是涉及推理轨迹的蒸馏，可能如何迁移高风险的网络能力。
:::

:::bi

In this setting, the model that produces the training data is called the teacher, and the model that learns from it is called the student. In an internal study on how cyber capabilities transfer, we used the content normally visible to users—final responses, reasoning summaries, and tool interactions—as our baseline for distillation, and tested how much additional cyber capability transfers when the student has access to the teacher’s exact reasoning traces.

:::zh

在这个设定里，产生训练数据的模型叫教师模型，从它那里学习的模型叫学生模型。在一项关于网络能力如何迁移的内部研究中，我们把用户通常能看到的内容作为蒸馏的基线，包括最终回复，推理摘要和工具交互，然后测试当学生模型能拿到教师模型的完整推理轨迹时，还会有多少网络能力被额外迁移过去。
:::

:::bi

We started each training run from the same pretrained student model. We created a supervised fine-tuning dataset consisting primarily of trajectories from Astra-level teacher models working on coding and defensive cybersecurity tasks. Each trajectory includes all of the steps a model takes as it works through a task, including any tool interactions and its final response. We evaluated each student after fine-tuning and again after a lightweight round of reinforcement learning in cybersecurity and coding environments.

:::zh

每次训练都从同一个预训练学生模型开始。我们构建了一个监督微调数据集，主要由 Astra 级别的教师模型在编程和防御性网络安全任务上产生的轨迹组成。每条轨迹都包含模型完成一项任务时走过的所有步骤，包括工具交互和最终回复。我们在微调之后评估了每个学生模型，又在网络安全和编程环境里做完一轮轻量强化学习之后再评估了一次。
:::

:::bi

After supervised fine-tuning, the student trained on exact reasoning traces generally outperformed the student trained on reasoning summaries. After reinforcement learning, the exact-trace student still scored higher at the largest inference budget tested on both benchmarks shown, while the summary-trained student scored higher at lower budgets.[^1]

:::zh

监督微调之后，用完整推理轨迹训练的学生模型总体上优于用推理摘要训练的版本。做完强化学习之后，在图示的两个基准上，用完整轨迹训练的学生模型在测试过的最大推理预算下得分仍然更高，而用摘要训练的学生模型在更低的预算下得分更高。[^1]
:::

:::annotation
这个实验设计得很干净：教师模型，学生模型，任务和评估都一样，只把训练数据从推理摘要换成完整轨迹。结果是低预算时摘要学生更好，高预算时完整轨迹学生反超。也就是说，完整轨迹带来的额外收益，要花推理算力才能兑现。
:::

:::animation advd-chart
:::

:::bi

Our cyber distillation results suggest that protecting reasoning traces can limit cyber capability transfer, even when the underlying task is one allowed under our usage policies. Across many such interactions, exact reasoning traces can teach a student skills that generalize beyond the tasks the teacher originally performed. We will continue studying how much additional capability transfers across different student models and distillation training recipes.

:::zh

我们的网络能力蒸馏结果表明，保护推理轨迹可以限制网络能力的迁移，即使底层任务属于我们的使用政策所允许的范围。在这类大量交互中，完整推理轨迹能教给学生模型一些技能，这些技能会泛化到教师模型原本执行的任务之外。我们会继续研究，在不同的学生模型和不同的蒸馏训练方案下，还会有多少额外能力被迁移。
:::

## 相互加强的防御（Defenses that reinforce one another）

:::bi

We defend against adversarial distillation at two complementary levels of our safeguard stack. At the request level, model behavior, classifier checks, and API controls limit reasoning trace extraction. At the campaign level, we look for patterns in request-level and account-level signals that can reveal coordinated extraction attempts. In turn, attacks uncovered in investigations become examples for training and testing our safeguards.

:::zh

我们在防护体系的两个互补层面上防御对抗蒸馏。在请求层面，模型行为，分类器检查和 API 控制共同限制推理轨迹被提取。在活动层面，我们寻找请求层面和账号层面信号中的模式，这些模式可能揭示有组织的提取尝试。反过来，调查中发现的攻击也会成为训练和测试防护措施的样本。
:::

:::figure
![防对抗蒸馏的两层防护示意图：第一层保护单次模型交互，第二层检测并阻断跨账号的有组织活动，中间是调查与防护相互强化、自动化红队测试提供样本的回流路径。](./images/adversarial-distillation/fig-01.png)

Our defenses against adversarial distillation combine safeguards for individual requests with campaign detection and enforcement. Findings from investigations and automated red-teaming help strengthen those safeguards.

:::zh
图 2：左边两个小框对应两个层面，单次请求与回复，账号之间的活动。右边两个大框是各自的防线：第一层管模型行为，分类器检查和 API 控制，第二层管调查和处置。中间两个菱形是回流路径：信号送去调查，调查结果反过来改进防护，自动化红队测试从旁边提供攻击样本。
:::
:::

### 保护单个请求和回复（Protecting individual requests and responses）

#### 针对模型行为的防御训练（Defensive training for model behavior）

:::bi

Adversarial training teaches models to recognize reasoning extraction attempts and refuse to disclose protected reasoning, while preserving responses to legitimate requests for explanations and assistance. Adversarial training examples come from successful attacks identified through internal automated red-teaming, investigations, and responsible disclosures of potential security weaknesses from outside researchers or industry partners.

:::zh

对抗训练教模型识别推理提取的尝试，并拒绝披露受保护的推理，同时保留对合法的解释和协助请求的回复。对抗训练的样本来自我们识别出的成功攻击，来源包括内部自动化红队测试和调查，以及外部研究人员或行业伙伴对潜在安全弱点的负责任披露。
:::

#### 分类器防护（Classifier safeguards）

:::bi

We use input classifiers to detect attempts to extract protected reasoning, and output classifiers to detect leaks of protected reasoning in assistant messages and tool-call arguments. These safeguards apply to both streaming and non-streaming responses.

:::zh

我们用输入分类器检测提取受保护推理的尝试，用输出分类器检测助手消息和工具调用参数中受保护推理的泄露。这些防护措施同时适用于流式和非流式响应。
:::

:::bi

Tool-call coverage is important because a model can expose protected reasoning in a tool’s arguments without including it in its final answer. Output classifiers can block suspected leaks before that content reaches the caller.

:::zh

覆盖工具调用这一点很重要，因为模型可能在工具参数里暴露受保护的推理，而最终答案里却没有。输出分类器可以在这些内容到达调用方之前拦下可疑的泄露。
:::

#### API 层防护（API-level protections）

:::bi

API-level protections restrict how protected reasoning can be reused across interactions and models. [Our September disclosure](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/) described attacks that moved encrypted reasoning from one conversation into another and asked the model to reveal the reasoning in user-readable form. We strengthened protections across user, workspace, organization, and model-family boundaries, including closing a pathway that could expose another user’s encrypted reasoning.

:::zh

API 层防护限制了受保护推理能在不同交互和不同模型之间如何被重复使用。[我们 9 月的披露](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/)描述了一些攻击，它们把加密推理从一段对话搬到另一段对话，然后要求模型以用户可读的形式揭示这些推理。我们加强了用户，工作区，组织和模型系列各个边界上的防护，包括堵住一条可能暴露其他用户加密推理的路径。
:::

:::bi

With GPT‑6.2 Astra and GPT‑6.2 Sol, we tie a model’s protected reasoning to the conversation history that produced it. As new messages are added, the model can build on its earlier reasoning. If an earlier message is rewritten, our API [drops the reasoning that followed it](https://developers.openai.com/api/docs/guides/keep-prefix-unchanged). We also prevent older model families with weaker safeguards from reading GPT‑6.2 Astra and Sol’s protected reasoning.

:::zh

在 GPT-6.2 Astra 和 GPT-6.2 Sol 上，我们把模型的受保护推理与产生它的对话历史绑定在一起。随着新消息加入，模型可以基于此前生成的推理继续推进。如果更早的某条消息被重写，我们的 API 会[丢弃它之后的推理](https://developers.openai.com/api/docs/guides/keep-prefix-unchanged)。我们还阻止防护更弱的旧模型系列读取 GPT-6.2 Astra 和 Sol 的受保护推理。
:::

:::annotation
这一段是全文最像工程规格的部分：推理和产生它的对话历史绑定，前缀一改后面的推理就作废，旧模型读不到新模型的推理。如果自己搭模型服务，这三条可以直接抄成设计约束。
:::

### 调查并阻断有组织的蒸馏活动（Investigating and disrupting coordinated campaigns）

:::bi

When our systems detect unauthorized adversarial distillation campaigns, which often include coordinated attempts to extract our models’ reasoning, we investigate the accounts responsible. When we identify violations, we enforce against the network of accounts, consistent with our policies and terms of service. Through investigations of each campaign, we generate insights that allow us to upgrade our defenses in order to better detect similar activity. We also share indicators of compromise with other model providers so they can investigate related abuse on their own services.

:::zh

当我们的系统检测到未经授权的对抗蒸馏活动时，这类活动往往包含有组织地提取模型推理的尝试，我们会追查这些活动背后的账号。一旦认定违规，我们会依据政策和服务条款，对这批账号网络采取处置。通过对每起活动的调查，我们得到的洞见可以用于升级防御，更好地发现类似行为。我们还会与其他模型提供商分享入侵指标，让他们能调查自家服务上的相关滥用。
:::

:::bi

This work extends beyond our own platform. [Our consistent-standards policy](https://openai.com/index/broad-access-through-consistent-standards/) establishes shared standards for safeguards and coordinated enforcement across providers offering our models. We work closely with partners where appropriate to uphold these standards and strengthen protections across deployments.

:::zh

这项工作延伸到了我们自己的平台之外。[我们的一致标准政策](https://openai.com/index/broad-access-through-consistent-standards/)为提供我们模型的各家提供商，确立了防护措施和协同处置的共同标准。在适当的情况下，我们与伙伴密切合作，维护这些标准，并加强不同部署中的防护。
:::

:::bi

Sharing relevant findings across industry and government where appropriate can help disrupt campaigns and enable model developers and providers to better identify and defend against attempts to distill frontier models.

:::zh

在适当的时候与行业和政府分享相关发现，有助于阻断这些活动，也能让模型开发者和提供商更好地识别并防御蒸馏前沿模型的尝试。
:::

## 衡量进展（Measuring progress）

### 对推理提取的抵抗力（Resistance to reasoning extraction）

:::bi

To measure how well our request-level safeguards work together, we test whether attackers can still extract protected reasoning in a setup that closely mirrors production deployments of our models and safeguards. In static evaluations, we replay a fixed set of previously successful attacks to see which still expose protected reasoning. In adaptive evaluations, automated AI red-teamers adjust their approach based on how the system responds, which can uncover weaknesses the static tests miss.

:::zh

为了衡量请求层面的防护措施配合得如何，我们搭了一个尽量贴近生产部署的测试环境，检验攻击者是否还能提取受保护的推理。在静态评估中，我们重放一组固定的此前成功过的攻击，看哪些仍然能暴露受保护推理。在自适应评估中，自动化的 AI 红队会根据系统的响应调整手法，从而发现静态测试漏掉的弱点。
:::

:::bi

We also vary what testers can see. Black-box testing gives them the same view an external user would have, while white-box testing gives them additional information about the system to help them develop stronger attacks. In our adaptive black-box evaluation, we tested whether attackers could recover protected reasoning the model had generated while answering an earlier request or the current one. On GPT‑6.2 Astra with its updated safeguards, the average attack success rate was below 1% for each attack type. Both rates were substantially lower than on GPT‑6 Astra with its original safeguards. We’re now applying selected safeguard improvements to GPT‑6 Astra as well.

:::zh

我们还会改变测试者能看到的东西。黑盒测试给他们和外部用户一样的视野，白盒测试则会提供关于系统的额外信息，帮他们构造更强的攻击。在我们的自适应黑盒评估中，我们检验攻击者能否还原模型在回答更早的请求或当前请求时生成的受保护推理。在采用更新后防护的 GPT-6.2 Astra 上，每种攻击类型的平均攻击成功率都低于 1%。这两个数字都显著低于采用原始防护的 GPT-6 Astra。我们现在也在把部分防护改进应用到 GPT-6 Astra 上。
:::

:::bi

| Attack type | GPT‑6 Astra defender with original safeguards<br>Adaptive extraction ASR (%) | GPT‑6.2 Astra defender with updated safeguards<br>Adaptive extraction ASR (%) |
| --- | --- | --- |
| Extracting protected reasoning from an earlier request | 54.0 | 0.2 |
| Extracting protected reasoning from the current request | 22.9 | 0.9 |

*Attack success rate (ASR) in adaptive black-box red-teaming against GPT‑6 Astra and GPT‑6.2 Astra, aggregated across six attacker models. Lower ASR is better.*

:::zh

| 攻击类型 | GPT-6 Astra 原始防护<br>自适应提取 ASR（%） | GPT-6.2 Astra 更新后的防护<br>自适应提取 ASR（%） |
| --- | --- | --- |
| 从更早的请求中提取受保护的推理 | 54.0 | 0.2 |
| 从当前请求中提取受保护的推理 | 22.9 | 0.9 |

*在自适应黑盒红队测试中对 GPT-6 Astra 和 GPT-6.2 Astra 的攻击成功率（ASR），按六个攻击模型汇总。ASR 越低越好。*
:::

:::annotation
ASR 从 54.0% 降到 0.2%，是同一批攻击在更新防护后重放的结果。从更早请求提取的那一行从 22.9% 降到 0.9%，说明跨轮次翻出旧推理是主要通道，只盯当前请求就会漏。
:::

### 蒸馏活动的检测和处置（Campaign detection and enforcement）

:::bi

We have seen multiple unauthorized adversarial distillation campaigns on our platform this year, and shared initial findings in our September [report](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/). Our weekly enforcement actions against these campaigns have ranged in scale from thousands to tens of thousands of accounts, with the rate increasing significantly this past summer.

:::zh

今年，我们在平台上看到了多起未经授权的对抗蒸馏活动，并在 9 月的[报告](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/)中分享了初步发现。我们每周都会对这些活动采取处置行动，涉及规模从几千个账号到几万个账号不等，今年夏天处置频率明显加快。
:::

:::bi

In order to measure the effectiveness of our efforts, we also track the prevalence of distillation abuse, as well as the time between detection and enforcement. Our objective is to constrain the volume and value of the data distillers are able to obtain, to increase the cost of distillation campaigns, and to shorten the time needed to respond to new attacks. We continue to improve these defenses through adversarial testing and investigations.

:::zh

为了衡量这些努力的效果，我们还追踪蒸馏滥用的普遍程度，以及从检测到处置所用的时间。我们的目标是限制蒸馏者能获取的数据规模和数据价值，抬高蒸馏活动的成本，并缩短响应新攻击所需的时间。我们会继续通过对抗测试和调查来改进这些防御。
:::

## 对抗蒸馏的国家安全影响（The national security implications of adversarial distillation）

:::bi

Adversarial distillation also poses a national security risk. A foreign actor that reproduces advanced capabilities from a U.S. model can deploy them without the protections its developer put in place. In February, we [briefed](https://assets.bwbx.io/documents/users/iqjWHBFdfxIU/rRmql_jJcxb4/v0) Congress on activity indicating that DeepSeek was attempting to distill U.S. frontier models. In September, we [reported](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/) disrupting a campaign to extract our models’ protected reasoning and attributed a core part of that activity to individuals associated with Moonshot AI, the developer of Kimi. We plan to share more soon about recent campaigns we’ve disrupted.

:::zh

对抗蒸馏还会带来国家安全风险。一个外国行为者如果从美国模型上复现出先进能力，就可以在没有开发者所设防护的情况下把它们部署出去。2 月，我们向国会[做了一次简报](https://assets.bwbx.io/documents/users/iqjWHBFdfxIU/rRmql_jJcxb4/v0)，说明有活动显示 DeepSeek 正试图蒸馏美国的前沿模型。9 月，我们[报告](https://openai.com/index/disrupting-a-coordinated-model-distillation-campaign/)阻断了一起提取模型受保护推理的活动，并把其中核心部分归到与 Kimi 的开发者 Moonshot AI 有关联的个人身上。我们计划很快分享更多关于近期被阻断活动的信息。
:::

:::annotation
OpenAI 在官方博客里直接点名 DeepSeek 和 Moonshot AI，把技术发现升级成了公开定性。读这类段落时，把它当作一方的指控和施压动作，比当作已经证实的事实更稳妥。
:::

:::bi

We support legislation that would give the U.S. government more tools to identify and sanction foreign actors that illicitly extract capabilities from American AI models. We’ve also told Congress we support the Chip Security Act, the AI OVERWATCH Act, and the MATCH Act. Stronger export controls can limit adversaries’ access to the hardware needed to train frontier models. Distillation defenses make it harder to acquire some of the same capabilities from models already trained. Both efforts help maintain a U.S. lead in frontier AI, giving developers more room to slow a release when they need time to test safeguards.

:::zh

我们支持立法，让美国政府有更多手段识别和制裁那些非法从美国 AI 模型中提取能力的外国行为者。我们也已告知国会，我们支持 Chip Security Act，支持 AI OVERWATCH Act，也支持 MATCH Act。更强的出口管制可以限制对手获取训练前沿模型所需的硬件。蒸馏防御则让从已经训练好的模型上获取部分相同能力变得更难。这两方面的努力都有助于保持美国在前沿 AI 上的领先，也让开发者在需要时间测试防护时，有更多余地放慢发布节奏。
:::

## 其他人如何在此基础上继续推进（How others can build on this work）

:::bi

Supporting the safe proliferation of frontier capabilities is an important goal of our anti-distillation work. Our experience so far suggests several useful steps that other model developers and platforms can take:

:::zh

支持前沿能力的安全扩散，是我们反蒸馏工作的重要目标。到目前为止的经验表明，其他模型开发者和平台可以采取几个有用的步骤：
:::

:::bi

- Protect private reasoning across the full interaction. Check assistant messages and tool-call arguments for leaks, and restrict how encrypted reasoning can be reused across conversations and models.
- Keep successful extraction attack logs found through red-teaming, production monitoring, or responsible disclosure as regression tests. Where appropriate, and consistent with applicable privacy policies, use those examples to improve model training and classifiers. When evaluating updated defenses, replay the original attacks and test whether an adaptive red-teamer can still find a way through those defenses.
- Combine request-level mitigations with campaign-level investigation and enforcement.
- Coordinate safeguard requirements and enforcement with deployment partners, and share expertise with other AI model developers, to ensure a high floor of distillation safeguards across the industry.

:::zh

- 在整个交互过程中保护私有推理。检查助手消息和工具调用参数有没有泄露，并限制加密推理能在不同对话和不同模型之间如何被重复使用。
- 把通过红队测试，生产监控或负责任披露找到的成功提取攻击日志留作回归测试。在适当且符合适用隐私政策的前提下，用这些样本改进模型训练和分类器。评估更新后的防护时，重放原来的攻击，检验自适应红队是否还能找到穿过这些防御的办法。
- 把请求层面的缓解措施与活动层面的调查和处置结合起来。
- 与部署伙伴协调防护要求和处置动作，并与其他 AI 模型开发者分享经验，确保整个行业的蒸馏防护有一个足够高的底线。
:::

:::annotation
这四条建议里，第二条成本最低，不需要重训模型，把已知攻击变成回归测试就行。第四条最难，跨厂商协调防护标准，谁也不容易单方面完成。
:::

:::bi

We have previously also shared findings through the [Frontier Model Forum](https://www.frontiermodelforum.org/) and appropriate government information-sharing channels to help other developers strengthen their defenses while keeping the details attackers could exploit private. We’ll continue working with researchers, developers, and partners to share what we learn about emerging attacks and effective defenses.

:::zh

此前，我们还通过 [Frontier Model Forum](https://www.frontiermodelforum.org/) 和政府的适当信息共享渠道分享发现，帮助其他开发者加强防御，同时把攻击者可能利用的细节保密。我们会继续与研究人员，开发者以及伙伴合作，分享我们对新兴攻击和有效防御的了解。
:::

:::bi

As we make frontier AI broadly available, our defenses against adversarial distillation aim to reduce the risk that its capabilities are reproduced without adequate safeguards, supporting our mission to ensure that artificial general intelligence is deployed safely and benefits all of humanity.

:::zh

在让前沿 AI 广泛可用的同时，我们也通过对抗蒸馏防御来降低能力在没有足够防护的情况下被复制的风险，以此支撑我们的使命：确保通用人工智能被安全地部署，并惠及全人类。
:::

[^1]: <span class="bi-en" lang="en">Related work from [Anthropic](https://www.anthropic.com/news/distillation-defenses) reported a similar advantage when training on full reasoning transcripts rather than summaries on SWE-bench Verified, a software engineering benchmark. Our result shows this advantage extends to frontier cybersecurity.</span><span class="bi-zh" lang="zh-CN">Anthropic 的[相关工作](https://www.anthropic.com/news/distillation-defenses)也报告过类似的优势：在软件工程基准 SWE-bench Verified 上，用完整推理轨迹训练比用推理摘要训练效果更好。我们的结果表明，这种优势同样延伸到了前沿网络安全领域。</span>
