---
title: '常驻智能体：记忆只是持久状态的一小块'
description: '大多数智能体记忆研究都在回答怎么记住，怎么找回，却很少追问一条旧记录凭什么有权决定今天的行动。本文编码了 435 篇文献，把分析单位从“记忆”扩成“持久状态”，将任务台账，权限凭据，外部承诺与审计谱系一并纳入六个诊断轴和十阶段生命周期。现有研究一头扎在写入与检索的前向弧上，但决定系统安全的删除传播，权限撤销与状态回滚却无人问津。作者为此给出 AOEP-v0 评测协议，直接对状态变更与恢复义务打分。'
pubDate: 2026-11-08
author: 'Tianyu Ding，Aditya Nannapaneni，Bingfan Liu，Ling Zhang'
category: papers
tags: ['记忆系统', '多智能体', 'LLM', '评测', 'Tianyu Ding 等四人']
subcategory: 'paper-llm'
---

:::source
- **论文**：Always-On Agents: A Survey of Persistent Memory, State, and Governance in LLM Agents
- **作者**：Tianyu Ding，Aditya Nannapaneni，Bingfan Liu，Ling Zhang
- **机构**：论文与 arXiv 版本均未标注机构
- **发表**：arXiv:2606.30306v1，2026 年 6 月 29 日
- **原文**：[arxiv.org/abs/2606.30306](https://arxiv.org/abs/2606.30306)
- **原始 PDF**：[arxiv.org/pdf/2606.30306v1](https://arxiv.org/pdf/2606.30306v1)
- **许可**：CC BY 4.0
:::

> [!NOTE]
> 本文是 136 页长篇综述《Always-On Agents: A Survey of Persistent Memory, State, and Governance in LLM Agents》的中英对照选译精读。原文体量庞大，这里从十二节正文里抽出主干论证，逐段保留英文原文与中文译文，略去第 10 节的应用领域盘点，附录 A 的检索编码细节以及文末 765 条参考文献。点击页面顶部的语言开关，可以在中文译文和英文原文之间切换。文中完整保留了七张原图与九张核心表格，表号沿用原文，因此会出现跳号。正文的作者年份引用按英文原样保留，分节标题去掉了原文编号，文中提及“第 4.2 节”“表 18”这类引用仍指原文位置，与本站自动生成的目录编号未必一致。图注下方的中文小字导读，以及带铅笔图标的青绿色批注卡片都是我补的说明。顺带提一句，图 2 顶部那条“Definitions & taxonomy”色带压住了左侧的 Substance 字样，属于原 PDF 自身的排版瑕疵，裁图时未作改动。

## 摘要（Abstract）

:::bi

Always-on agents are systems whose future behavior depends on durable state accumulated across earlier interactions. We treat them as *persistent-state systems*: the operative system includes retrievable memories, but also task ledgers, permissions, credentials, commitments, provenance and audit records, shared state, trigger conditions, and externally committed effects linked to those records. The survey reads the literature through six diagnostic axes for each state item, authority, scope, mutability, provenance, recoverability, and actionability, and through a lifecycle in which state is written, validated, organized, retrieved, acted upon, updated, forgotten, audited, and sometimes rolled back. Across a 435-work coded corpus, treated as a scoped map rather than an exhaustive census, the literature concentrates more heavily on accumulating and retrieving state than on governing, recovering, or relinquishing it. We therefore introduce the Always-On Evaluation Protocol (AOEP-v0), a pilot evaluation contract that makes these governance requirements concrete by scoring state mutation and recovery obligations rather than answer quality alone. The resulting agenda connects always-on agents to databases, distributed systems, formal methods, capability security, and machine unlearning.

:::zh

常驻智能体是一类未来行为取决于既往交互所累积持久状态的系统。本文将其视作*持久状态系统*：真正起作用的除了可检索的记忆，还包括任务台账，权限，凭据，承诺，溯源与审计记录，共享状态，触发条件，以及同这些记录绑定的外部已提交效应。本综述沿着授权，作用域，可变性，溯源，可恢复性与可行动性六条诊断轴审视每个状态项的文献，并顺着状态被写入，校验，组织，检索，付诸行动，更新，遗忘，审计乃至回滚的完整生命周期梳理现有工作。在一份涵盖 435 篇文献的编码语料中（将其作为划定范围的领域地图，而非穷尽式普查），现有研究高度集中在状态的积累与检索上，对状态的治理，恢复与弃用则着墨甚少。为此，我们提出常驻评测协议（Always-On Evaluation Protocol，AOEP-v0）。这份试点评测契约越过单纯的答案质量，直接对状态变更与恢复义务打分，把抽象的治理要求落成具体指标。由此展开的研究议程，将常驻智能体与数据库，分布式系统，形式化方法，能力安全及机器遗忘紧密连接起来。
:::

:::annotation

这篇综述真正做的一件事是把智能体记忆从“向量库加检索器”的语境里拽出来，放进数据库与操作系统的视角下审视。一旦一条跨会话留存的记录能悄悄改动工具调用的默认参数，或者放行一笔外部扣款，它就成了带权限的活状态。整篇论文追问的核心只有一句话：当过去留下的记录试图左右当下的行动时，系统凭什么信它，又该怎么反悔。
:::

## 引言（Introduction）

:::bi

Large language model (LLM) agents are usually built, deployed, and evaluated as episodic systems. An agent receives a task, reasons over it, calls tools, returns an answer or performs an action, and then resets. Whatever it learned during the episode, which observations it gathered, which tool outputs it trusted, which sub-goals it abandoned, is discarded at the boundary. Under this contract the agent is stateless between tasks by construction, and most of the safety and correctness reasoning a designer must do collapses to a single episode: if the current prompt is clean and the current tool calls are authorized, the agent is well behaved. The episodic contract is convenient precisely because it makes the past irrelevant.

:::zh

大语言模型（LLM）智能体在构建，部署与评测时，通常默认按单回合系统来处理。智能体接下任务，完成推理，调用工具，返回答案或执行动作，随即重置。它在这一回合里学到的一切，包括采集过哪些观察，采信了哪些工具输出，放弃了哪些子目标，都会在回合边界处一并清空。在这套契约下，智能体在任务之间天然无状态，设计者需要考虑的绝大多数安全与正确性推理也就随之收敛到单个回合之内：只要当前提示词干净，当前工具调用经过授权，智能体的行为就合乎规范。单回合契约之所以省心，恰恰在于它让过去彻底归零。
:::

:::bi

Always-on agents break this contract. An always-on agent is one whose behavior at a given moment depends on state accumulated before that moment, beyond the current prompt or task instance. A coding assistant that remembers a repository’s conventions across weeks, a personal assistant that tracks a user’s evolving preferences and open commitments, a customer-support agent that carries a case across many sessions and operators, and a fleet of collaborating agents that share a common workspace are all always-on in this sense, regardless of whether they literally run every second. The defining property is not continuous execution but persistence: the agent retains user preferences, task traces, tool outcomes, procedural lessons, policy constraints, social context, and past mistakes, and any of these can shape, or authorize, its next action. This is a qualitative shift, not a quantitative one. Once retained state can license future behavior, the past is no longer irrelevant, and the single-episode safety argument no longer holds.

:::zh

常驻智能体打破了这份契约。只要一个智能体在特定时刻的行为取决于此前积累的状态，超越了当前提示词或单次任务实例的边界，它就属于常驻智能体。能跨周记住代码库规范的编程助手，持续追踪用户偏好演变与未完待办的个人助理，跨越多次会话与多位坐席交接同一工单的客服智能体，乃至共用同一工作区的协作智能体集群，都在这个意义上属于常驻系统，无论它们在物理上是否每秒都在运行。决定这一属性的根基在于状态持久性，与进程是否连续执行无关：智能体留存了用户偏好，任务轨迹，工具结果，程序性经验，策略约束，社交语境乃至过往失误，其中任何一项都可能塑造甚至授权它的下一步动作。这属于质的跨越，远非量的叠加。一旦留存状态有权放行后续行为，过往记录便不再无关紧要，单回合的安全论证也随之失效。
:::

:::annotation

别把字面上的“Always-On”误读成 7×24 小时挂在后台的守护进程。这里的判据看的是状态有没有跨过会话边界留存下来，并继续为后续动作背书。哪怕一个助手每天只被定时任务唤醒五分钟，只要它昨天攒下的偏好或凭据还能直接触发今天的工具调用，单回合的沙箱安全假设就已经失效了。
:::

:::bi

Persistence changes what stored information can do. A stored preference can silently fix the default arguments of a tool call. A cached credential can grant access long after the user intended it to lapse. A procedural skill distilled from one successful trajectory can be replayed as an executable commitment in a situation it no longer fits. A summary written months ago can override fresh evidence because it retrieves more strongly. In each case the agent is not reasoning from the current situation alone; it is being guided by a record whose authority, scope, freshness, and origin were fixed in the past and are rarely re-examined. An always-on agent is therefore more than a memory-augmented episodic agent. It is a *persistent-state system* whose retained state needs rules for what may persist, what may act, and what may be revoked.

:::zh

持久性彻底改变了存储信息的作用方式。一条存下来的偏好可以悄无声息地锁死工具调用的默认参数。一份缓存凭据在用户以为它早已过期之后，仍能继续放行访问。一段从单次成功轨迹中提炼出的程序性技能，换到不再适用的情境下仍可能当作可执行承诺照常重放。一份数月前生成的摘要，只因检索得分更高就能压倒眼前的最新证据。在这些场景里，智能体早已跳出当前情境的独立推理，转而受制于一条过往留下的记录，而这条记录的授权，作用域，新鲜度与来源早在过去就已固化，极少得到重新审视。因此，常驻智能体远非外挂了记忆模块的单回合智能体，它是一套真正的*持久状态系统*，必须靠明确的规则来界定哪些状态允许留存，哪些状态有权触发行动，哪些状态又必须支持撤销。
:::

:::bi

We use *persistent state* as a broad term. It includes retrievable memory, the object most prior work studies, but also the durable, control-relevant records that surround memory and cross the episode boundary with the agent: task ledgers of open commitments and obligations, permissions and consent, tool and credential state, provenance and audit trails, shared and social state across users and agents, and trigger state governing when to act proactively. External commitments are not internal memory records; they are part of the agent’s persistent accountability surface because they must remain traceable to the internal state that authorized them. A calendar reminder, a partially completed purchase, a revoked API token, a poisoned workflow, and a deletion request that has only partly propagated are all persistent-state concerns, even when none is naturally described as a “memory.” This wider unit separates the survey from memory-form taxonomies.

:::zh

文中将*持久状态*作为一个宽泛的总称使用。它既涵盖多数既有研究聚焦的可检索记忆，也囊括围绕在记忆周围，随智能体一同跨越回合边界且攸关控制权的持久记录：记录未完承诺与义务的任务台账，权限与用户同意，工具与凭据状态，溯源与审计轨迹，跨用户与跨智能体的共享及社交状态，以及决定何时主动出击的触发状态。外部承诺本身虽非内部记忆条目，却属于智能体持久问责面的一环，因为这些外部结果必须始终能倒查回当初授权它们的内部状态。一条日历提醒，一笔付了一半的订单，一枚已吊销的 API 令牌，一条遭投毒的工作流，或是只同步了一半的删除请求，哪怕日常语境里没人会把它们叫做“记忆”，也统统属于持久状态必须面对的课题。正是这个更宽的分析单元，将本综述与单纯按记忆形态划分的分类体系区别开来。
:::

:::annotation

把“已发出的日历邀请”“付了一半的订单”也算进持久状态，初看有点反直觉，因为那些数据明明落在外部服务里。可一旦智能体内部不保留指向这些外部副作用的账本句柄，事后发现某条记忆遭投毒或权限已撤回时，系统连自己曾在外头闯过什么祸都盘点不出来，更谈不上补偿和回滚。
:::

:::figure

![Figure 1](./images/always-on-agents/fig-01.png)

Figure 1: Evolutionary tree of always-on agents. The figure sketches the survey’s organizing claim: episodic LLM agents become always-on not by running continuously, but when durable state persists across sessions and can authorize future action. Five strands map the field’s current build-out: memory mechanisms, action substrates, personalization and social state, governance and safety, and evaluation. The target state is qualified by six diagnostic axes: authority, scope, mutability, provenance, recoverability, and actionability. These are the questions that make persistence governable rather than only useful.

:::zh
图 1：整篇综述的鸟瞰图：左侧演化树标出从单回合智能体迈向常驻智能体的分水岭（状态跨会话留存并能为后续行动授权），接着分出五条研究支流，右侧六个诊断轴则是检验每条持久状态是否受控的标尺。
:::
:::

:::bi

1. **Definition.** We define always-on agents as persistent-state systems and characterize a persistent-state item along six diagnostic axes that can be probed separately in simple cases but often interact in deployed systems: *authority* (what permits this state to influence an action), *scope* (which user, task, tool, time, or group may use it), *mutability* (whether it can be revised, superseded, decayed, or locked), *provenance* (which source, timestamp, and transformation produced it), *recoverability* (whether derived state and affected decisions can be rolled back), and *actionability* (whether it is evidence, preference, policy, skill, or executable commitment). A memory that scores perfectly on recall can still be unsafe if it has no authority boundary, no provenance, and no path to repair after a bad action.
2. **Lifecycle.** We recast memory as one stage of a broader governed loop, observe, write, validate, organize, retrieve, act, update, forget, audit, and rollback, and name five invariants the loop should preserve but that an episodic agent satisfies vacuously by resetting: authority monotonicity, scope non-expansion, deletion propagation, provenance preservation, and rollback traceability. Each invariant is the property whose violation defines a persistence-specific failure class.
3. **Coverage map.** We place memory, RAG, long-context, embodied-agent, and social-agent mechanisms and benchmarks against the always-on requirements they report testing, backed by a 435-work coded corpus. In our coding, the largest qualitative skew is that work concentrates on accumulating and retrieving state more than on governing it.
4. **Protocol and pilot.** We propose an Always-On Evaluation Protocol that scores state mutation and recovery rather than answer quality alone, and instantiate it in AOEP-v0: an event-stream and snapshot schema, worked episodes, a validator design, and a pilot that illustrates which governance fields current memory wrappers do not expose.

:::zh

1. **定义。** 我们将常驻智能体定义为持久状态系统，并沿六条诊断轴刻画每一个持久状态项（这些轴在简单场景下可单独探查，在实际部署系统中则往往彼此交织）：*授权*（凭什么允许该状态影响动作），*作用域*（允许哪个用户，任务，工具，时间段或群体使用它），*可变性*（能否修订，取代，衰减或锁定），*溯源*（由哪个来源，时间戳与变换链路生成），*可恢复性*（派生状态与受其影响的决策能否回滚），以及*可行动性*（属于被动证据，偏好，策略，技能，还是可执行承诺）。哪怕一条记忆的召回率拿到满分，只要缺少授权边界，来源追溯与错误动作后的修复路径，它依然可能带来安全隐患。
2. **生命周期。** 我们将记忆重新安放在一个受治理的十阶段闭环中（观察，写入，校验，组织，检索，行动，更新，遗忘，审计与回滚），并提炼出该闭环必须守住的五条不变量：授权单调性，作用域不扩张，删除传播，溯源保全与回滚可追溯性。单回合智能体每次重置即可自动满足这些条件，而在持久系统中，任一不变量的失守都会对应一类特有的持久化失效。
3. **覆盖地图。** 基于 435 篇文献构成的编码语料，我们将记忆，RAG，长上下文，具身智能体与社交智能体的机制及基准测试，逐一对标它们实际检验的常驻要求。编码结果呈现出一道鲜明的断层：现有工作扎堆在状态的积累与检索上，状态治理则相当单薄。
4. **协议与试点。** 我们提出一套超越单纯答案质量，直接对状态变更与恢复义务打分的常驻评测协议，并给出参考实现 AOEP-v0，内含事件流与状态快照模式，完整示例回合，校验器设计以及一组试点实验，直观揭示当前主流记忆封装层漏掉了哪些关键治理字段。
:::

:::figure

![Figure 2](./images/always-on-agents/fig-02.png)

Figure 2: The survey is organized as a three-regime stack. Substance asks what persistent state *is* and where it physically lives; Motion asks how state moves through the agent’s operating loop; Control asks how that movement is governed, shared, and judged. In our coding, work is concentrated more heavily on accumulating and retrieving state than on governing, recovering, or relinquishing it.

:::zh
图 2：全篇的章节路线图。左侧按“实质（Substance），运动（Motion），控制（Control）”分出三层：实质层讨论状态是什么，存在哪类物理基底上，运动层追踪状态在生命周期里如何流转与演化，控制层聚焦多智能体共享，安全治理与评测。越往下走，离“治理”这条主线越近。
:::
:::

:::bi

The resulting corpus of 435 works is summarized in Table 3, with its primary mapping into the survey’s nine parts. Every work has a primary part, no part is empty, and the lightest part still hosts more than twenty works. The notable feature of the corpus is not its size but its shape. In our coding, coverage concentrates on the early, accumulative end of the lifecycle: retrieve (269 of 435) and write (200) dominate the stages, and mutability (160) and provenance (153) lead the axes. Coverage thins sharply on the governance end. Authority is the rarest axis at 72 of 435. Among lifecycle stages, audit (88), forget (66), and especially rollback (27) trail far behind retrieval. Only twenty-seven of 435 works expose any rollback mechanism for state-affected decisions, and none in the corpus reports recovery success or cost after corruption. These counts are scoping estimates, not a census, but they point to a large qualitative asymmetry: the works we coded have many techniques for accumulating and recalling state and fewer for governing it. Figure 3 shows the same skew over time: the early-stage share stays flat and high from 2023 to 2026 while the governance share, though rising, remains a minority and turns upward only from 2025.

:::zh

最终汇总出的 435 篇文献语料列于表 3，并按主子领域归入本综述的九个部分。每篇文献对应一个主要部分，九个部分全都有文献落位，最少的也收录了二十篇以上。这份语料最醒目的特征在于其分布形态，而非规模大小。在我们的编码结果里，现有工作密集扎堆在生命周期前端的积累环节：各阶段中检索（435 篇里占 269 篇）与写入（200 篇）占绝对大头，各诊断轴上则是可变性（160 篇）与溯源（153 篇）领跑。一旦跨入后端的治理环节，文献数量便急剧缩水。六条状态轴里授权最为罕见，435 篇中仅 72 篇涉及。生命周期后半程里，审计（88 篇），遗忘（66 篇）乃至回滚（27 篇）都被检索远远甩在身后。整批 435 篇文献中，仅有二十七篇为受状态影响的决策提供了回滚机制，且没有任何一篇报告状态受污染后的恢复成功率或恢复开销。上述计数属于划定范围的摸底估计，而非全领域普查，却足以折射出严重的结构性失衡：我们编码的文献攒下了大批积累与召回状态的技术，留给状态治理的手段却少得可怜。图 3 从时间维度印证了同一趋势：2023 至 2026 年间，早期阶段的占比始终维持高位，而治理相关工作的占比虽有抬升，却一直处于少数派，直到 2025 年才真正开始上扬。
:::

:::annotation

读下面这组统计数字时可以留心一个背景细节：作者在构建这 435 篇语料时，后期专门针对治理，遗忘和回滚做了定向检索与过采样。也就是说，即便在刻意给治理类论文“加权捞人”之后，回滚依然只占不到十分之一。真实研究社区里重读写，轻善后的偏科程度，比表格呈现的还要悬殊。
:::

:::bi

Table 3: The 435-work coded corpus, mapped to the survey’s nine parts (primary subarea mapping; multi-label cross-references add more). Each work is also coded by category, lifecycle stage, and state axis. The early-lifecycle, low-governance skew described in the text (retrieve 269, write 200 versus rollback 27; authority the rarest axis at 72) holds within our coding and should be read as a scoped estimate rather than a census of the field.

| Part | Title | Works |
| --- | --- | --- |
| P1 | Foundations, Definitions, and State Types | 27 |
| P2 | State Substrates and Representations | 117 |
| P3 | State Lifecycle (Write/Organize/Retrieve/Act) | 33 |
| P4 | Continual Adaptation and Plasticity-Stability | 52 |
| P5 | Governance (Authority/Provenance/Deletion/Audit) | 53 |
| P6 | Multi-Agent and Shared State | 23 |
| P7 | Evaluation and Benchmarks | 25 |
| P8 | Failure Modes and Security | 25 |
| P9 | Application Domains | 80 |
| **Total** | **435** |  |

:::zh

表 3：435 篇文献构成的编码语料及其在本综述九个部分中的主映射分布（按主要子领域归类，算上多标签交叉引用后数量还会增加）。每篇文献同时按研究类别，生命周期阶段与状态轴完成编码。正文指出的“重早期阶段，轻治理环节”分布偏斜（检索 269 篇，写入 200 篇，对比回滚 27 篇，最稀缺的授权轴仅 72 篇）在本次编码范围内成立，应作为特定检索框架下的摸底估计，而非整个领域的全量普查。

| 部分 | 标题 | 工作数 |
| --- | --- | --- |
| P1 | 基础，定义与状态类型 | 27 |
| P2 | 状态基底与表示 | 117 |
| P3 | 状态生命周期（写入 / 组织 / 检索 / 行动） | 33 |
| P4 | 持续适应，可塑性与稳定性 | 52 |
| P5 | 治理（授权 / 溯源 / 删除 / 审计） | 53 |
| P6 | 多智能体与共享状态 | 23 |
| P7 | 评测与基准测试 | 25 |
| P8 | 失效模式与安全 | 25 |
| P9 | 应用领域 | 80 |
| **总计** | **435** |  |
:::

:::figure

![Figure 3](./images/always-on-agents/fig-03.png)

Figure 3: Corpus coverage over time, as the share of each year’s coded works whose lifecycle touches an early stage (retrieve or write), any governance stage (forget, audit, or rollback), or rollback specifically. Early-stage coverage is flat and high across the period; governance coverage rises from 12% to 46% but remains a minority, and rollback rises only from 0% to under 10%. In the works we coded, the governance turn is recent (it begins in earnest only in 2025) and still thin. Per-year corpus sizes are shown on the axis and sum to 421 because the fourteen pre-2023 foundational anchors are excluded from this year-by-year view. The count for 2026 is necessarily incomplete and preprint-heavy, as discussed in Section 11.

:::zh
图 3：重点看三条曲线的开口差距。代表前向弧（检索与写入）的浅蓝线常年稳居七成以上，代表治理阶段（遗忘，审计，回滚）的橙线到 2025 年后才明显抬头，单独看回滚（绿线）则始终趴在 10% 以下。横轴下方的 n 是各年收录篇数，2026 年的 252 篇含大量近期预印本，且经过作者的治理向定向扩充。
:::
:::

## 定义常驻智能体（Defining always-on agents）

:::bi

We define an always-on agent as an agent whose policy at time $t$ depends on state accumulated before $t$, beyond the current prompt or task instance. The defining property is persistence, not literal continuous execution: an agent that runs once a day, wakes on an external trigger, or is invoked only when a user opens a session is still always-on if its action at invocation is conditioned on durable state carried across invocations. Conversely, an agent that runs continuously but resets all state between requests is episodic, not always-on, because nothing it retains can authorize a later action.

:::zh

我们将常驻智能体定义为在时刻 $t$ 的策略取决于 $t$ 之前所累积状态的智能体，其决策依据超越了当前提示词或单次任务实例。这一概念的核心判据在于状态持久性，与字面上的连续执行无关：哪怕一个智能体每天只运行一次，由外部事件触发唤醒，或者仅在用户打开会话时才被调用，只要它在调用瞬间的行动以跨调用留存的持久状态为前提，就依然属于常驻智能体。反过来，一个进程虽不间断运行，却在每次请求之间清空全部状态的智能体仍属单回合系统，算不上常驻，因为它留存下来的任何东西都无权为后续行动背书。
:::

:::bi

If persistent state is the unit of analysis, we need a vocabulary precise enough that a benchmark can perturb an individual state item and a mechanism can be said to govern it. We characterize a persistent state item along six diagnostic axes, each phrased as a question an evaluation can ask of the item and that a system either does or does not answer. The axes are not orthogonal variables. Provenance often supplies evidence for authority; scope constrains authority; actionability determines how strong the authority and recoverability requirements must be; and recoverability depends on provenance being preserved. The axes are still useful because each names a dimension along which a distinct, persistence-specific failure class arises, grounded in either the cognitive-science literature that first distinguished it or the agent literature that exposed its failure mode. Later sections measure how unevenly the field covers them, with authority the rarest at 72 of 435 coded works and mutability the most common at 160.

:::zh

既然以持久状态作为分析单元，就需要一套足够精确的词汇，好让基准测试能够对单个状态项施加扰动，也让具体机制谈得上对它实施治理。我们沿着六条诊断轴刻画每一个持久状态项，每条轴都对应一个评测可以针对该状态项发问，而受测系统要么给出回答，要么交白卷的判据。这六条轴并非彼此正交的独立变量：溯源常为授权提供依据，作用域约束着授权的边界，可行动性决定了授权与可恢复性必须严苛到什么程度，而可恢复性本身又仰仗溯源链的完整留存。尽管彼此交织，这套划分依然管用，因为每条轴都精准对应着一类由持久性引发的独特失效模式，背后既有率先作出这一区分的认知科学传统支撑，也有近年来暴露出对应漏洞的智能体文献佐证。后文将逐一量化整个领域在这六条轴上的冷热不均，其中授权受关注最少（435 篇编码文献里仅占 72 篇），可变性则最为常见（达 160 篇）。
:::

:::bi

Authority asks who or what permits this state to influence an action, distinguishing a fact the agent only holds from one it is licensed to act upon. The cognitive lineage supplies only a partial analogy: ACT-R separates declarative chunks, which are simply available, from procedural production rules selected by a utility that governs when they fire (Anderson et al., 2004), prefiguring the distinction between possessing a record and acting on it. That utility is an action-selection preference, not an authorization, so the authority axis in our sense is grounded less in cognitive architecture than in capability-based security and access control, where the right to influence an action is an explicit, revocable grant rather than a learned preference (we develop this lineage in the governance part). In the agent setting, authority is the axis most directly attacked: work on long-term state poisoning shows routine interactions can gradually weaken an agent’s confirmation boundaries and expand the scope of actions it will take, an authority drift no recall metric registers (Xu et al., 2026c). The corresponding invariant, authority monotonicity, holds that a record may influence an action only under a current, unrevoked authority, so an expired permission cannot license a write or a tool call. The gap this axis exposes is that the bulk of the literature treats every stored item as equally entitled to act, with no representation of who authorized it or whether that authorization still holds; authority is the least represented axis in our coding.

:::zh

授权追问的是谁，或者凭什么允许当前状态影响下一步行动，从而把智能体“仅仅持有一条事实”与“获准依据该事实采取行动”严格区分开来。认知科学传统只能提供半截类比：ACT-R 将随时可供提取的陈述性组块，同依靠效用值裁决何时触发的程序性产生式规则做了切分 (Anderson et al., 2004)，初步勾勒出“持有记录”与“付诸行动”的界限。不过那里的效用值属于动作选择上的偏好权重，算不上严格意义上的权限授予。因此，本文定义的授权轴更多植根于能力安全与访问控制传统：在那里，影响某项行动的资格来自显式且可随时吊销的授权许可，而非模型自己习得的行为偏好（治理章节将详细展开这一源流）。放到智能体场景下，授权恰恰是首当其冲的受攻击面：针对长期状态投毒的研究显示，平平无奇的日常交互就能一点点侵蚀智能体的确认边界，暗中放宽它敢于直接执行的动作范围，酿成任何单纯召回指标都察觉不到的授权漂移 (Xu et al., 2026c)。与该轴对应的不变量是授权单调性：唯有在当前有效且未遭吊销的授权覆盖之下，一条记录才有资格影响行动，已过期的权限绝不能放行新的写入或工具调用。这条轴暴露出的行业短板在于，绝大多数现有工作默认库里存着的每一条状态都天然具备同等的行动资格，既不记录当初是谁批的，也不核查这份许可眼下是否依然有效。在我们的语料编码中，授权也是出现频次最低的一条轴。
:::

:::bi

Scope asks which user, task, tool, time window, or group an item may be used for. Its cognitive grounding is the long-standing distinction between volatile working memory bound to the current situation and durable long-term memory, formalized in the multi-component working-memory model whose episodic buffer binds integrated representations for the task at hand (Baddeley, 2000). Scope keeps one user’s preference from acting on behalf of another, and it is what a category-bounded memory enforces when an in-car assistant restricts each stored preference to its declared category and prunes redundant or contradictory entries (Kirmayr et al., 2025). The invariant is scope non-expansion: a transition may narrow or preserve scope but never silently widen it. The gap is that even systems enforcing scope tend to do so statically, fixing categories or roles at design time, with no account of what happens when a scope must be redefined, when authority changes dynamically, or when an item legitimately moves between scopes, leaving cross-scope leakage as a standing risk.

:::zh

作用域追问的是某条状态允许服务于哪个用户，哪项任务，哪个工具，哪段时间窗口或哪个群体。它的认知源流可以追溯到一条经典分野：绑定于当前任务情境的易变工作记忆，与跨越情境长期留存的持久记忆，这一分野在多成分工作记忆模型中得以形式化，由其中的情景缓冲器负责将多模态信息绑定为服务当前任务的整合表征 (Baddeley, 2000)。作用域负责拦住甲用户的偏好去替乙用户做主，这正是各类分域受限记忆所要落实的边界：例如车载助手将每条存储偏好严格限定在声明过的类别之内，并定期修剪冗余或彼此矛盾的条目 (Kirmayr et al., 2025)。对应的不变量是作用域不扩张：一次状态流转只允许收窄或维持原有作用域，绝不允许悄无声息地将它放宽。眼下的短板在于，哪怕是实现了作用域隔离的系统，也大多停留在静态配置层面，在设计阶段就把类别或角色写死，一旦遇到作用域需要动态重划，授权发生变更，或是某条状态需要在不同作用域之间合法流转的场景，往往缺乏应对机制，使得跨作用域泄漏成为挥之不去的隐患。
:::

:::bi

Mutability asks whether an item can be revised, superseded, decayed, or locked, and on what timescale. This axis is grounded in the quantitative study of forgetting, from the reproducible replication of the Ebbinghaus forgetting curve with fitted decay functions (Murre and Dros, 2015) to the complementary-learning-systems account in which fast and slow stores change at deliberately different rates (McClelland et al., 1995). In the agent setting, mutability is exposed by benchmarks showing user attributes, habits, and preferences drift on different timelines driven by external events, so a single global update rule is wrong (Xie et al., 2026b), and by principled-forgetting benchmarks balancing recall against time-decay invalidation (Uddin et al., 2026). Mutability is the best-covered axis because forgetting and updating are the most studied operations, yet the coverage is shallow: most work decays uniformly, whereas real state is heterogeneous, some items permanent, others ephemeral, and the open problem is authority-conditioned mutability where the right to revise or decay an item is itself governed.

:::zh

可变性追问的是某条状态能否被修订，取代，衰减或锁定，以及这些变化遵循怎样的时间尺度。这条轴植根于对遗忘规律的定量研究，从利用拟合衰减函数可复现地验证艾宾浩斯遗忘曲线 (Murre and Dros, 2015)，一直延伸到互补学习系统理论对快慢两套存储刻意采用不同更新速率的解释 (McClelland et al., 1995)。在智能体场景下，两类基准测试把可变性的难题摆到了台面上：一类证明用户的属性，习惯与偏好会受外部事件驱动，沿着各自不同的时间线发生漂移，拿同一套全局更新规则一刀切注定会出错 (Xie et al., 2026b)。另一类原则性遗忘基准则要求在保持召回率与按时间衰减淘汰过期信息之间寻求平衡 (Uddin et al., 2026)。由于遗忘与更新向来是研究最热的操作，可变性成了语料中覆盖率最高的一条轴，但这种高覆盖依然停留在浅层：绝大多数方案对所有状态施加整齐划一的衰减率，而真实世界的状态却是高度异质的，有的需要永久钉死，有的转瞬即逝。这里悬而未决的核心难题是受授权约束的可变性，即谁有权修订或衰减某条状态，这件事本身也必须纳入治理。
:::

:::bi

Provenance asks which source, timestamp, and chain of transformations produced an item. Its cognitive root is the episodic-versus-semantic distinction: episodic memory is memory for events tied to a time and place, while semantic memory abstracts away the source (Tulving, 1972), and provenance is the agent-side discipline of not losing the episodic source when an item is consolidated into a semantic fact. The complementary-learning-systems literature makes the stakes explicit, since consolidation through replay is the operation that can preserve or discard the trace of origin (McClelland et al., 1995; Wilson and McNaughton, 1994). The invariant is provenance preservation: consolidation may compress an item’s value but must retain enough of its derivation to verify, attribute, and revise the result later. The exposed gap is that the dominant consolidation methods are lossy by design and flatten provenance, so an agent loses the ability to say where a fact came from at precisely the moment it most needs that, when the fact is later challenged or found poisoned.

:::zh

溯源追问的是某条状态源自哪里，打着什么时间戳，经历过哪条变换链路。它的认知根源在于情景记忆与语义记忆的分野：情景记忆把事件牢牢锚定在发生的时间与地点上，语义记忆则抽去了这些情境外壳 (Tulving, 1972)，而智能体一侧的溯源纪律，正是要求在将具体回合整合为抽象语义事实时，不能顺手把背后的情景来源一并抹掉。互补学习系统文献早就点明了其中的利害关系，因为基于经验回放的整合操作，恰恰决定了来源痕迹是被妥善保留还是被彻底抹平 (McClelland et al., 1995; Wilson and McNaughton, 1994)。对应的不变量是溯源保全：整合过程可以压缩状态项的具体取值，但必须保留足够完整的推导链路，以便日后核验真伪，追查归属并修订结果。这里暴露出的缺口在于，当前主流的记忆整合方法从设计上就是有损的，习惯把多方来源压平为一句话摘要，导致智能体偏偏在最需要交代“这条事实从哪儿听来的”的关头（比如该事实日后受到质疑或被查出遭了投毒）彻底失语。
:::

:::bi

Recoverability asks whether the derived state and the decisions an item caused can be rolled back. This is the axis the field covers least well after authority, and it has the weakest cognitive analogue, since biological forgetting is largely irreversible, which is itself instructive: the canonical forgetting curve describes loss without recovery (Murre and Dros, 2015), and ACT-R’s activation decay offers no undo for a chunk fallen below threshold (Anderson et al., 2004). Artificial agents are not bound by this limit, but most inherit it by default. Recoverability is what the principled-forgetting line gestures at when it distinguishes accessibility decay from true deletion (Uddin et al., 2026), yet even there recovering the downstream actions a forgotten fact licensed is left open. The invariant is rollback traceability: every action carries a handle back to the records that justified it, so a later-discovered bad record yields a bounded set of decisions to repair. The gap is stark and quantified later: rollback is the rarest lifecycle stage in the coded corpus, and recoverability is one place where the survey’s governance framing does real organizing work.

:::zh

可恢复性追问的是由某条状态派生出的下游状态及其促成的决策能否回滚。它的文献覆盖率仅高于授权，排在倒数第二，同时也是认知科学类比最薄弱的一条轴。生物性遗忘在很大程度上不可逆，这一事实本身就很能说明问题：经典遗忘曲线刻画的是无法找回的信息流失 (Murre and Dros, 2015)，ACT-R 的激活衰减机制同样不为跌破阈值的记忆组块提供撤销键 (Anderson et al., 2004)。人工构建的智能体本不必受此生理局限束缚，绝大多数现有系统却默认照搬了这一局限。原则性遗忘路线在区分“可及性衰减”与“真正删除”时已经触及了可恢复性的边缘 (Uddin et al., 2026)，但即便在那些工作里，一旦某条已被遗忘的事实当年曾放行过下游动作，如今该如何收拾残局，依然悬而未决。对应的不变量是回滚可追溯性：每一次行动都必须挂着一枚指回其授权依据记录的句柄，确保日后揪出坏记录时，能够精准圈出有界的待修复决策集合。后文的统计将直观展现这一缺口有多大：回滚是整批编码语料中最罕见的生命周期阶段，而可恢复性也正是本综述的治理框架真正发力整顿的地方。
:::

:::bi

Actionability asks what kind of object an item is: passive evidence, a preference, a policy, a reusable skill, or an executable commitment. It matters because the consequences of misusing an item scale with its type. The procedural-memory lineage, in which an agent accumulates reusable skills it can later invoke, makes this concrete: Voyager builds an open-ended library of executable skills the agent calls as actions (Wang et al., 2023a), and a poisoned skill is far more dangerous than a poisoned fact because invoking it has tool consequences in the world. A reflective lesson degrades gracefully if it is wrong; an executable commitment does not. Actionability therefore sets the bar for the others: the higher an item’s actionability, the stronger the authority, provenance, and recoverability guarantees it should require before it is allowed to act. The gap is that current systems rarely type their state by actionability at all, so an advisory note and a callable side-effecting procedure are stored, retrieved, and trusted by the same undifferentiated machinery.

:::zh

可行动性追问的是某条状态在系统里充当什么角色：究竟是供参考的被动证据，偏好，策略，可复用的技能，还是可执行的承诺。这条轴之所以要紧，是因为误用一条状态的破坏力会随其可行动性等级成倍放大。程序性记忆谱系把这种风险展现得淋漓尽致，在这类系统中，智能体不断攒下可复用的技能供日后直接调用：例如 Voyager 构建了一座开放式的可执行技能库，智能体可以直接把库里的技能当作动作来跑 (Wang et al., 2023a)，此时一旦某个技能遭了投毒，其危险程度远非一条错误事实可比，因为调用它会直接在现实世界里触发工具副作用。一条反思经验就算总结错了，最多让表现温和退化，一项可执行承诺若是出了岔子，后果却难以挽回。因此，可行动性直接决定了其他几条轴的准入门槛：一个状态项的可行动性越高，在放行它触发动作之前，系统就越应当向它索取更严苛的授权，溯源与可恢复性保证。现实的短板在于，现有系统极少按可行动性对状态做类型隔离，导致一张仅供参考的便条与一段会引发外部副作用的可调用程序，往往混在同一套毫无区分的机制里存储，检索并采信。
:::

:::bi

These six axes are the analytic spine of the survey. Every mechanism in later sections can be read as making some axes explicit and leaving others implicit, and every failure mode as the violation of an invariant attached to one or more axes. In our coded corpus, coverage is skewed: mutability and provenance appear more often than authority and recoverability, so the literature attends most to axes whose failures are internal and revisable and less to those whose failures license an action that cannot be taken back.

:::zh

这六条诊断轴构成了整篇综述的分析脊梁。后文剖析的每一种机制，都可以看作把其中几条轴显式落了地，同时把其余几条留在暗处默认跳过。同理，每一种安全失效模式，都对应着附着在某一条或多条轴上的不变量被击穿。在我们的编码语料中，研究分布呈现出明显的头重脚轻：可变性与溯源出现的频次远高于授权与可恢复性，说明现有文献大多围着那些“关起门来在内部就能修正”的轴打转，而一旦失效就会放行不可逆外部动作的那些轴，反而少有人问津。
:::

## 持久状态的分类体系（A taxonomy of persistent state）

:::bi

We use the three-layer partition summarized in Table 7. *Object state* is the thing the agent carries forward: episodic traces, semantic facts, preferences and user models, procedural skills, workflow and task commitments, shared state, and trigger conditions. The *governance envelope* is the metadata and capability surface that travels with those objects: authority, scope, credentials, provenance, retention, deletion, rollback handles, trust, and temporal validity. *External commitments* are externally committed effects linked to internal state: messages, payments, files, database rows, tickets, and other consequences the agent does not fully own once committed. For exposition, the subsections below discuss recurring categories, while Table 7 further decomposes the governance envelope into its main fields. This split matters because several items that a flat taxonomy would list as state types, such as policy, permission, provenance, and deletion handles, are better modeled as envelope fields over every state object, while side effects are not internal state at all but external consequences that must remain traceable to it. Throughout, we model a persistent-state item as the record $s=\langle v,a,c,m,p,r,k,\tau\rangle$ introduced in the foundations section: a value $v$ under an authority $a$, a scope $c$, a mutability class $m$, a provenance chain $p$, a recoverability handle $r$, an actionability type $k$, and a logical timestamp $\tau$. A state type is then a region of this record space that shares an actionability type and a characteristic profile over the other axes, and a failure mode is the violation of an invariant that region is most exposed to.

:::zh

本文采用表 7 汇总的三层划分方案。第一层*对象状态*是智能体跨会话往前携带的实质内容：情景痕迹，语义事实，偏好与用户模型，程序性技能，工作流与任务承诺，共享状态以及触发条件。第二层*治理包络*是伴随这些对象一同流转的元数据与控制面：授权，作用域，凭据，溯源，保留期，删除标记，回滚句柄，信任等级与时间有效期。第三层*外部承诺*则是与内部状态挂钩的外部已提交效应：已发出的消息，已扣的款项，已落盘的文件，已写入的数据库行，已创建的工单，以及一经提交便脱离智能体单方面掌控的其他现实后果。为方便展开，下文各小节先探讨反复出现的状态类别，再由表 7 将治理包络拆解为核心字段。之所以要做这三层切分，是因为传统扁平分类常把策略，权限，溯源与删除句柄同普通记忆并列为状态类型，但它们其实更适合建模为包裹在每一个状态对象外面的通用包络字段，至于外部副作用则压根不属于内部状态，而是必须始终能倒查回内部状态的外部后果。贯穿全文，我们将每一个持久状态项统一建模为基础章节引入的八元组记录 $s=\langle v,a,c,m,p,r,k,\tau\rangle$：具体取值 $v$（受授权 $a$ 统辖），作用域 $c$，可变性类别 $m$，溯源链 $p$，可恢复性句柄 $r$，可行动性类型 $k$，以及逻辑时间戳 $\tau$。在这一记录空间里，每一种状态类型都对应着共享同一可行动性类型，且在其余诊断轴上呈现特定分布特征的一片区域，而该类型最易触发的失效模式，正是这片区域最常撞上的不变量违背。
:::

:::bi

Episodic traces are the raw record of what happened: conversation turns, tool calls and their outputs, environment observations, and the timestamps that order them. They are the most literal sense of memory and the foundation the other types derive from, since a semantic fact is usually an abstraction over episodes and a procedural skill a distillation of successful ones. The category descends directly from Tulving’s separation of episodic memory, indexed by time and context, from context-free semantic memory (Tulving, 1972), a distinction the Soar architecture later operationalized by giving an agent distinct episodic and semantic stores within a single decision cycle (Laird, 2012), and that the working-memory tradition refined through the episodic buffer that binds multimodal experience into integrated, retrievable episodes (Baddeley, 2000). Modern agent frameworks inherit this structure: CoALA organizes language agents around explicit memory modules whose episodic component logs interaction history for later retrieval (Sumers et al., 2024), and broad agent surveys treat the episodic log as the substrate from which all higher memory is consolidated (Xi et al., 2023).

:::zh

情景痕迹是对既往发生之事的原始流水记录：对话轮次，工具调用及其返回结果，环境观察，以及为这一切排定先后次序的时间戳。它们是最字面意义上的记忆，也是其余各类状态得以派生的土壤，因为语义事实通常是对多轮情景的抽象提炼，程序性技能则是对成功回合的蒸馏浓缩。这一类别直接承袭自 Tulving 将按时间与情境索引的情景记忆，同脱离具体语境的语义记忆所作的经典切分 (Tulving, 1972)。随后，Soar 架构在单个决策周期内为智能体分设独立的情景存储与语义存储，将这一理论切分落成可运行的机制 (Laird, 2012)，工作记忆传统则引入情景缓冲器，把多模态体验绑定为结构完整且随时可检索的情景片段 (Baddeley, 2000)。现代语言智能体框架全盘接过了这套结构：CoALA 围绕显式记忆模块组织语言智能体，由其中的情景组件负责记录交互历史以备后续检索 (Sumers et al., 2024)，主流智能体综述也普遍将情景日志视作一切高层记忆得以整合演化的底层基底 (Xi et al., 2023)。
:::

:::bi

Provenance and audit state is the metadata that makes every other type accountable: the sources, timestamps, lineage, transformations, and confidence attached to a record, plus the trail of who or what mutated it. It most directly enables the return arc of the lifecycle, because without provenance there is no basis for attributing a fact, verifying a claim, or tracing an action back to the records that justified it. A small but sharpening body of work targets it. MemLineage attaches a weighted derivation DAG and a Merkle log to agent memory and enforces an untrusted-path-persistence invariant that refuses actions descending from external sources (Ouyang and Hou, 2026); immutable-memory designs use blockchain-indexed append-only ledgers with privilege lattices to make revisions protocol-blocked and historied (Wright, 2025); Causal Past Logic defines runtime-verifiable guards over causally visible stored state in distributed workflows (Bollig, 2026); and MemProbe argues that provenance and hidden state should be audited as a first-class artifact (Ma et al., 2026). The failure this type guards against is provenance-role collapse, in which flat-text memory loses source attribution, so the agent hallucinates authority and misattributes facts to the wrong source (Jin et al., 2026b).

:::zh

溯源与审计状态是让其余所有状态类型能够倒查追责的元数据：附着在每条记录上的来源，时间戳，派生谱系，变换过程与置信度，外加谁在何时改动过它的操作轨迹。它直接托起了生命周期的回程弧，因为一旦缺失溯源，系统就无从核实某条事实的来历，无从检验某项主张的真伪，也无法把一次外部动作倒查回当初放行它的内部记录。目前已有几项颇具锋芒的研究专门攻坚这一方向：MemLineage 为智能体记忆挂上加权派生有向无环图（DAG）与 Merkle 日志，并强制执行“不可信路径不落盘”的不变量，直接拦截源自外部不可信输入的派生动作 (Ouyang and Hou, 2026)。不可变记忆方案借助带特权格的区块链索引追加写账本，在协议层锁死事后篡改并完整留存历史版本 (Wright, 2025)。Causal Past Logic 为分布式工作流中因果可见的存储状态定义了可在运行时核验的守卫条件 (Bollig, 2026)，MemProbe 则呼吁将溯源信息与隐藏状态本身作为一等公民纳入审计 (Ma et al., 2026)。这一状态类型所要防范的核心失效是溯源角色坍塌：一旦扁平文本记忆抹掉了来源归属，智能体就会凭空脑补出授权资格，张冠李戴地把事实安到错误的来源头上 (Jin et al., 2026b)。
:::

:::bi

Table 7: The persistent-state taxonomy. Object state names what the agent carries forward. The governance envelope names the fields and capabilities that determine whether an object may influence action and how it can be repaired. External commitments are consequences linked to internal state rather than internal state themselves. The rare axes, authority and recoverability, concentrate in the envelope and in externally consequential objects.

| Layer | State item | Typical failure mode | Axes most stressed |
| --- | --- | --- | --- |
| Object state | Episodic traces | Noise, privacy leakage, loss of evidence handles | Recoverability, provenance |
| Object state | Semantic facts | Staleness, contradiction, authority confusion | Mutability, authority |
| Object state | Preferences / user model | Over-personalization, scope creep, drift | Scope, actionability |
| Object state | Procedural skills | Procedure poisoning, unsafe reuse, overfitting | Actionability, authority, recoverability |
| Object state | Workflow / task commitments | False continuity, stale commitments | Mutability, recoverability |
| Object state | Shared / social state | Speaker confusion, propagation, authority conflict | Scope, provenance |
| Object state | Trigger conditions | Intrusion, missed-help | Actionability, authority |
| Governance envelope | Authority / permission | Privilege drift, cross-user leakage | Authority, scope |
| Governance envelope | Scope / ownership | Cross-principal use, consent mismatch | Scope, authority |
| Governance envelope | Tool / credential capability | Permission drift, stale authorization | Authority, recoverability |
| Governance envelope | Provenance / audit | Corroboration laundering, rollback gaps | Provenance, recoverability |
| Governance envelope | Retention / deletion / rollback handles | Residual derived state, unbounded repair | Recoverability, provenance |
| Governance envelope | Trust / confidence / temporal validity | Stale trust, unverified promotion, expiry failure | Mutability, authority |
| External commitments | Tool/world side effects | Duplicate effects, consumed-authority resurrection | Recoverability, provenance |

:::zh

表 7：持久状态分类体系。对象状态指智能体跨会话往前携带的实质内容，治理包络指决定某个对象能否影响行动以及事后如何修复的元数据字段与控制能力，外部承诺则是同内部状态挂钩的外部现实后果。语料中最稀缺的授权与可恢复性两条轴，恰好高度集中在治理包络与带外部后果的状态项上。

| 层次 | 状态项 | 典型失效模式 | 受压最重的轴 |
| --- | --- | --- | --- |
| 对象状态 | 情景痕迹 | 噪声，隐私泄漏，证据句柄丢失 | 可恢复性，溯源 |
| 对象状态 | 语义事实 | 陈旧，矛盾，授权混淆 | 可变性，授权 |
| 对象状态 | 偏好/用户模型 | 过度个性化，作用域蔓延，漂移 | 作用域，可行动性 |
| 对象状态 | 程序性技能 | 程序投毒，不安全复用，过拟合 | 可行动性，授权，可恢复性 |
| 对象状态 | 工作流/任务承诺 | 虚假连续性，陈旧承诺 | 可变性，可恢复性 |
| 对象状态 | 共享/社会状态 | 说话人混淆，传播，授权冲突 | 作用域，溯源 |
| 对象状态 | 触发条件 | 侵入，错失帮助 | 可行动性，授权 |
| 治理包络 | 授权/权限 | 特权漂移，跨用户泄漏 | 授权，作用域 |
| 治理包络 | 作用域/归属 | 跨主体使用，同意不匹配 | 作用域，授权 |
| 治理包络 | 工具/凭据能力 | 权限漂移，陈旧授权 | 授权，可恢复性 |
| 治理包络 | 溯源/审计 | 佐证洗白，回滚缺口 | 溯源，可恢复性 |
| 治理包络 | 保留/删除/回滚句柄 | 残留派生状态，无界修复 | 可恢复性，溯源 |
| 治理包络 | 信任/置信度/时序有效性 | 陈旧信任，未经验证的提升，过期失效 | 可变性，授权 |
| 外部承诺 | 工具/世界副作用 | 重复效应，已消耗授权的复活 | 可恢复性，溯源 |
:::

:::bi

The interaction also explains why deletion is the hardest operation and rollback the rarest mechanism. A forget request against a semantic fact must propagate along the entire derivation: to the episodes it was extracted from, the summaries and embeddings that absorbed it, the skills conditioned on it, the shared copies other principals hold, and any external side effect it justified. This is the deletion-propagation invariant, and it is difficult because the types interact; an immutable provenance ledger that makes the derivation auditable (Wright, 2025; Ouyang and Hou, 2026) simultaneously makes deletion harder to honor, so the two goals the audit type is supposed to serve, accountability and erasure, are in tension and the corpus has not reconciled them. The transactional and compensation models (Chang and Geng, 2025; Zheng et al., 2026d) are the closest the literature comes to honoring the recoverability of the downstream types, and they remain confined to a handful of works.

:::zh

各类状态之间的派生交织，也解释了为何删除会成为最棘手的操作，回滚会成为最罕见的机制。针对某条语义事实发起的一次遗忘请求，必须顺着整条派生链一路向下清理：既要找到最初抽取出该事实的原始情景回合，也要触及吸收了它的摘要与向量嵌入，以它为前提构建的程序性技能，其他主体持有的共享副本，乃至由它放行过的所有外部副作用。这就是删除传播不变量。它之所以难啃，根源就在于状态类型之间环环相扣：一份旨在保障派生链可审计的不可变溯源账本 (Wright, 2025; Ouyang and Hou, 2026)，客观上却会让彻底删除变得更加寸步难行，导致审计机制本应兼顾的“追责”与“擦除”两大目标迎头相撞，而现有文献至今未能化解这一内在张力。目前最接近落实下游状态可恢复性的是事务与补偿模型 (Chang and Geng, 2025; Zheng et al., 2026d)，但这类探索依然只见于寥寥数篇工作。
:::

:::bi

Governance is thinnest, then, where the authority and recoverability axes dominate, where the affected consequence is external or irreversible, and where the lifecycle return arc, forget, audit, and rollback, must run. The classical memory types are better served because their dominant axes, mutability and provenance, are common in the corpus and their failures are often internally recoverable. Governance-envelope fields and external commitments are served by a scattering of mostly recent preprints and by attack papers that document the failure without governing it. The bibliographic skew we measure, only 27 of 435 coded works exposing any rollback mechanism and authority being the rarest axis at 72 of 435, is the quantitative shadow of this taxonomic skew. The works we coded contain a rich science of the recoverable memory core and a thinner account of the governance envelope around consequential state. That asymmetry, more than any single missing mechanism, is the open problem this taxonomy is built to make visible, and it sets the agenda for the substrate, lifecycle, and governance parts that follow.

:::zh

归结起来，凡是授权轴与可恢复性轴占主导的地方，凡是动作后果外溢到现实世界或不可逆转的地方，以及生命周期回程弧（遗忘，审计与回滚）必须接管的地方，恰恰就是当前治理研究最薄弱的地带。经典记忆类型之所以打磨得更成熟，是因为主导它们的可变性与溯源两条轴在文献里本就常见，即便出错也大多能在系统内部消化修复。反观治理包络字段与外部承诺，目前只有零星几篇近期预印本，以及只管曝光漏洞却不管修补的攻击类论文有所触及。我们在文献计量中测出的悬殊数字（435 篇编码工作中仅 27 篇涉及回滚机制，最冷门的授权轴在 435 篇中也仅占 72 篇），正是这种分类学盲区在统计上的投影。现有文献围绕“可恢复的记忆内核”建立了一套丰满的学问，对包裹在关键状态外围的“治理包络”却交代得相当单薄。比起任何单一机制的缺失，这种全局性的结构失衡才是本分类体系力图揭示的核心问题，也为下文剖析物理基底，生命周期与治理机制定下了基调。
:::

:::figure

![Figure 4](./images/always-on-agents/fig-04.png)

Figure 4: Coverage heatmap: for each taxonomy part (rows), the number of coded works whose lifecycle coding touches each stage (columns). Cells are shaded by count. The forward arc (left of the divider) is dark across nearly every part; the return arc, especially `forget`, `audit`, and `rollback`, stays pale even in the governance part (P5). This is the survey’s main asymmetry made visual. Counts are per-part stage incidences and exceed part sizes because coding is multi-label.

:::zh
图 4：以分割线为界左右对比着看：左半边前向弧六列（尤其写入与检索）几乎在所有主题行里都涂得最深，右半边回程弧最后三列（遗忘，审计，回滚）则成片泛白，连专门讲治理的 P5 那一行也未能幸免。
:::
:::

## 持久状态生命周期（The persistent-state lifecycle）

:::bi

The previous parts established what persistent state *is* and what forms it takes. The next question is how it *moves*: by what sequence of operations an observation becomes durable, governed, retrievable state, and by what later operations that state is revised, removed, accounted for, or undone. Memory, in the sense most of the literature uses the word, names only a few of these operations. An always-on agent observes, decides what to write, validates what it wrote, organizes it into something retrievable, retrieves it, acts on it, and then, once an outcome is known, updates it, forgets parts of it, audits how it was used, and on occasion rolls back the decisions a bad record caused. We call this sequence the persistent-state lifecycle. The unit of analysis is not a memory record alone but a typed transition over a set of records.

:::zh

前面几节厘清了持久状态*是*什么，以及它包含哪些形态。接下来的问题是它如何*流转*：一次环境观察历经怎样的操作序列，才能转化为持久，受治理且可检索的状态，后续又靠哪些操作去修订，擦除，审计或撤销这份状态。现有文献平时挂在嘴边的“记忆”，只涵盖了其中寥寥几步。常驻智能体先观察环境，决定写入什么，校验刚写入的内容，将其组织成便于检索的结构，按需检索并据以采取行动。待行动结果水落石出后，它还要回过头去更新状态，遗忘部分旧内容，审计这些状态当初如何被调用，必要时甚至要回滚由某条坏记录引发的决策。我们将这整套操作序列称为持久状态生命周期。这里的分析单位超越了孤立的单条记忆记录，落在一组记录之上的带类型状态转移。
:::

:::bi

The lifecycle has two arcs, shown in Figure 5. The *forward arc* runs observe, write, validate, organize, retrieve, act: it carries a signal from the environment into action. The *return arc* runs update, forget, audit, rollback once the consequences of an action are known, reconciling state with reality. Plasticity, the capacity to absorb new information, lives mostly at write and update on the boundary between the arcs. Stability, the capacity to keep old commitments intact and reversible, is enforced at validate, audit, forget, and rollback. An agent that exposes the plastic operations without the stabilizing ones accumulates risk even as its task scores rise, a tension we develop in the part on continual adaptation and preview at the end of this one.

:::zh

如图 5 所示，整个生命周期由两条弧构成。*前向弧*依次跑完观察，写入，校验，组织，检索，行动六步，负责把来自环境的信号一路推向实际行动。*回程弧*则在行动后果明朗之后接管，依次执行更新，遗忘，审计，回滚四步，让内部状态与外部现实重新对齐。系统的可塑性（即吸纳新信息的能力）主要落在两条弧交界处的写入与更新环节，而稳定性（即确保既有承诺完整且可逆的能力）则靠校验，审计，遗忘与回滚四道关卡来兑现。一个只开放可塑操作却砍掉稳定操作的智能体，哪怕表面上的任务得分节节攀升，暗地里也在不断积攒系统风险。这一内在张力将在后文持续适应章节深入展开，并在本节末尾先行预告。
:::

:::annotation

可以把前向弧看作智能体的“油门”（把环境信号一路推向行动），把回程弧看作“刹车与倒车档”（根据行动后果去修正，擦除或回滚旧状态）。只造油门不装刹车的系统，短期跑基准测试往往很亮眼，因为新经验一直在往里塞，可一旦跑上几周，过期的承诺和错误的反思越攒越多，能力积累就会变成债务累积。
:::

:::bi

This framing differs from the standard memory pipeline in two places: the validate stage and the return arc. Record-centric memory taxonomies often leave both implicit, and the corpus quantifies that absence. Coding every work in the $N{=}435$ corpus by the lifecycle stages it exercises (a work may touch several) yields a sharply skewed profile: retrieve 269, write 200, act 141, organize 128, update 127, audit 88, validate 87, observe 68, forget 66, and rollback 27. The forward arc, especially retrieve and write, dominates. The return arc thins out, and rollback, the operation that closes the loop by repairing a state-affected decision, is the rarest capability in the corpus. The operations are therefore uneven in a structured way: the stages least represented in the coded corpus are the ones on which the invariants that distinguish a governed system from a memory-augmented one are established or checked. The stage-by-stage reading names representative mechanisms and benchmarks, contrasts them, and ends each stage on the governance gap it exposes.

:::zh

这套生命周期框架与常规记忆流水线有两处关键分野：独立的校验环节，以及完整的回程弧。以静态记录为中心的传统记忆分类往往默认省掉这两块，而我们的语料统计直观量化了这一缺席。按每篇文献实际触及的生命周期阶段对 $N{=}435$ 篇语料做多标签编码后，分布呈现出鲜明的头重脚轻：检索 269 篇，写入 200 篇，行动 141 篇，组织 128 篇，更新 127 篇，审计 88 篇，校验 87 篇，观察 68 篇，遗忘 66 篇，回滚仅 27 篇。以前向弧（尤其是检索与写入）为代表的前端环节占尽优势，回程弧则一路萎缩，而负责修补错误决策，真正把控制环路闭合起来的回滚操作，更是成了全语料中最罕见的能力。这种冷热不均呈现出清晰的规律：编码语料里着墨最少的阶段，恰恰是确立并核验那五条核心不变量（即区分“受治理系统”与“单纯外挂记忆系统”的分水岭）的关键节点。下文将顺着这十个阶段逐一盘点代表性机制与基准测试，并在每个阶段末尾点明它所暴露出的治理盲区。
:::

:::bi

The six state axes (authority, scope, mutability, provenance, recoverability, actionability) become operational once we fix what a state item is and which changes to it are legal. We model a persistent state item as a typed record

$$
s=\langle v,a,c,m,p,r,k,\tau\rangle:
$$

:::zh

一旦明确了状态项的具体结构以及哪些改动作数，授权，作用域，可变性，溯源，可恢复性与可行动性这六条状态轴就有了可操作的抓手。我们将每一个持久状态项建模为如下带类型记录：

$$
s=\langle v,a,c,m,p,r,k,\tau\rangle:
$$
:::

:::bi

a value $v$ (the remembered content); an authority $a$ naming what permitted $s$ to influence action (a user grant, a policy, a tool scope, a delegation); a scope $c$ over users, tools, time, and groups within which $s$ may be used; a mutability class $m$ (revisable, supersede-only, decaying, locked); a provenance chain $p$ recording the sources and transformations that produced $s$; a recoverability handle $r$ linking $s$ to the decisions and side effects it influenced; an actionability type $k$ drawn from a small closed set (evidence, preference, policy, skill, executable commitment); and a logical timestamp $\tau$. The agent’s persistent state is the set of live records. The value $v$ is the only field most memory systems represent explicitly; the remaining seven are the governance envelope, and systems that discard the envelope cannot later recover the governance state it carried, however faithfully they preserve $v$.

:::zh

其中包含：具体取值 $v$（即被记住的实质内容），授权字段 $a$（写明凭什么允许 $s$ 影响行动，例如用户授权，策略放行，工具作用域或委托关系），作用域 $c$（界定允许在哪些用户，工具，时间段与群体范围内调用 $s$），可变性类别 $m$（可原地修订，仅可被新版本取代，按时间衰减或彻底锁定），溯源链 $p$（记录生成 $s$ 的原始来源与历次变换），可恢复性句柄 $r$（将 $s$ 同受它影响的下游决策及外部副作用串联起来），取自小型封闭集合的可行动性类型 $k$（被动证据，偏好，策略，技能，可执行承诺），以及逻辑时间戳 $\tau$。智能体在任意时刻的持久状态，就是当前所有活跃记录构成的集合。现有大多数记忆系统唯一显式存储的字段只有取值 $v$，其余七个字段共同组成了治理包络。任何在写入时丢弃这层包络的系统，无论把裸值 $v$ 保存得多么完好，事后都无从找回包络所承载的治理状态。
:::

:::annotation

这个八元组很像给每一条记忆套上了操作系统里的文件 inode 与权限头。现有的大多数记忆框架只存了裸文本 $v$，相当于把所有文件都剥掉属主，权限位和修改日志，统统摊平在一个公共目录里。一旦出事，系统既查不出某条规则是谁写进去的，也不知道哪些下游动作曾拿它当过依据。
:::

:::bi

Reading the transitions this way surfaces five invariants the loop should preserve. They are not a borrowed checklist; each is the property whose violation defines one of the persistence-specific failure classes treated later in the survey, and each is anchored to particular stages.

:::zh

顺着状态转移的视角往下看，整个闭环必须守住的五条不变量便水落石出。这五条性质绝非从外部生搬硬套的检查表：后文剖析的每一类持久化安全失效，都对应着其中某一条不变量的失守，且每一条都死死锚定在特定的生命周期阶段上。
:::

:::annotation

下面这五条不变量是整篇综述的轴承：往上看，它们把六个诊断轴落成了生命周期各阶段必须守住的边界条件，往下看，第 8 节表 16 里的每一种安全攻击都对应其中某一条的失守，第 9 节的 AOEP 评测协议则是把这五条性质直接编译成了自动化断言。
:::

:::bi

*Authority monotonicity.* A record may influence an action only if a current, unrevoked authority covers it; authority may narrow over time but never silently re-broaden. An expired permission cannot license a write or a tool call. This invariant is enforced principally at validate (does this write carry a live authority?) and at act (is the authority that licensed this record still current at action time?), and it is exercised at update whenever a permission epoch advances.

:::zh

*授权单调性。* 一条记录唯有在当前有效且未遭吊销的授权覆盖之下，才允许影响行动。授权范围可以随时间推移收窄，但绝不允许暗中放宽。一份已经过期的许可，无权放行任何新的写入或工具调用。这条不变量主要在校验阶段（核查本次写入是否附带依然有效的授权）与行动阶段（核查当初放行该记录的授权在执行瞬间是否依然有效）强制卡控，并在权限纪元（permission epoch）向前推进时，于更新阶段接受复核。
:::

:::bi

*Scope non-expansion.* A transition may narrow or preserve scope but never silently widen it. This is what blocks one user’s preference from acting for another, or a fact learned in one task from being applied in an unrelated one. It governs organize (consolidation must not merge records across scopes into a wider-scoped summary) and retrieve (the retrieved set must not exceed the requester’s scope).

:::zh

*作用域不扩张。* 一次状态转移可以收窄或维持原有作用域，但绝不允许悄无声息地将它放宽。正是这道边界拦住了甲用户的偏好去替乙用户做主，也防止了在单次任务里学到的局部事实外溢到毫不相干的任务中去。它主要管束组织阶段（记忆整合不得把不同作用域的记录强行合并成作用域更宽的摘要）与检索阶段（召回结果集不得越过当前请求者的作用域边界）。
:::

:::bi

*Deletion propagation.* Tombstoning a record must also reach its summaries, embeddings, cached prompts, promoted tiers, and any derived records, so that erasure is a verifiable property of the store rather than an edit to a single retrieval index. It governs forget and is verified at audit.

:::zh

*删除传播。* 给一条记录打上墓碑标记时，清理动作必须同步触及由它生成的摘要，向量嵌入，缓存提示词，晋升到高层的记忆条目以及一切派生记录，使“已擦除”成为整个存储系统可核验的全局性质，而非仅仅改掉某一个检索索引里的单行记录。它主导遗忘阶段，并在审计阶段接受核验。
:::

:::bi

*Provenance preservation.* Consolidation may compress $v$ but must retain enough of the provenance chain $p$ to verify, attribute, and later revise the result. It governs organize and update, the two stages that transform $v$, and is the precondition for audit.

:::zh

*溯源保全。* 记忆整合可以压缩具体取值 $v$，但必须保留足够完整的溯源链 $p$，确保日后仍能核验真伪，追查归属并修订结果。它管束组织与更新这两个会改写 $v$ 的阶段，同时也是开展审计的先决条件。
:::

:::bi

*Rollback traceability.* Every action carries a handle back to the records that justified it, so that a later-discovered bad record yields a bounded, identifiable set of decisions and side effects to repair. It is established at act (the handle must be recorded) and consumed at rollback.

:::zh

*回滚可追溯性。* 每一次行动都必须挂着一枚指回其授权依据记录的句柄，一旦日后查出某条底层记录有问题，系统就能据此圈出有界且可定位的待修复决策与副作用集合。这枚句柄在行动阶段埋下，在回滚阶段兑现。
:::

:::bi

Rollback is the survey’s central lifecycle gap. Rollback traceability is established at act (the handle must be recorded) and consumed at rollback, so a field that does not instrument act for consequence cannot implement rollback even in principle. The practical consequence is that an always-on agent that takes an irreversible action on the basis of a record it later discovers was poisoned or unauthorized has, in the vast majority of the systems we surveyed, no bounded set of decisions to repair and no path back to a known-good state. This operation distinguishes a governed persistent-state system from a memory-augmented one, and on the corpus evidence it is the one the literature has built least.

:::zh

回滚是本综述揭示的核心生命周期断层。回滚可追溯性要求在行动阶段埋下句柄，在回滚阶段读取句柄。如果整个研究领域在行动阶段压根不为动作后果做埋点记录，那么回滚哪怕在原理层面也无从谈起。落到工程现实中，一旦常驻智能体依据某条事后才查出遭投毒或越权的记录执行了不可逆操作，在我们调研的绝大多数系统里，既圈不出有界的待修复决策范围，也找不到退回已知安全状态的通路。能否完成这一步操作，正是受治理的持久状态系统与单纯记忆增强系统的分水岭，而从语料统计来看，它恰恰也是现有文献建设得最薄弱的一环。
:::

:::figure

![Figure 5](./images/always-on-agents/fig-05.png)

Figure 5: The persistent-state lifecycle. State flows along a forward arc that accumulates and uses it, then a return arc that updates, forgets, audits, and rolls it back once outcomes are known. The forward arc is heavily studied; the return arc is sparse (only 27 of 435 corpus works expose any rollback mechanism). Five invariants should hold across the whole loop; each failure mode in Section 8 violates one of them.

:::zh
图 5：顺着箭头看两条弧如何闭环：上半圈前向弧六步把环境观察一路推向行动（Act），下半圈回程弧四步再根据行动后果折回来做更新，遗忘，审计与回滚，并通过虚线回流影响后续观察。图底横贯全流程的五条不变量，对应第 8 节的各类安全失效。
:::
:::

:::figure

![Figure 6](./images/always-on-agents/fig-06.png)

Figure 6: Stage-proxy opportunity for the five invariants, by taxonomy part. A work counts toward an invariant if its lifecycle coding touches the stage that would establish or check that invariant (authority monotonicity at validate/act; scope non-expansion at organize/retrieve; deletion propagation at forget; provenance preservation at organize/update; rollback traceability at act/rollback), shaded by count. The two boxed columns, deletion propagation and rollback traceability, are pale in every part including the governance part (P5): the two invariants that most distinguish a governed persistent-state system have few stage opportunities in the coded corpus. This figure should not be read as direct evidence that a paper tested or enforced an invariant; it is a proxy view of where the relevant lifecycle stages appear.

:::zh
图 6：目光直接锁住两个虚线框：删除传播与回滚可追溯性这两列从上到下全是浅色，哪怕在 P5（治理）这一行也极为稀疏。这两条最能体现“状态受治理”的不变量，恰恰在现有文献里最缺乏落地的生命周期支撑。
:::
:::

## 状态基底与表示（State substrates and representations）

:::bi

Substrates fall along a physical gradient, from the most internal (model parameters) to the most external (multi-tenant serving runtimes). Classical memory forms, episodic versus semantic versus procedural, parametric versus non-parametric, remain useful, but they cut across substrates rather than replacing them. The form of remembered content, such as an event trace, a distilled fact, or a callable skill, tells us what is stored; the substrate tells us how it is addressed, mutated, and recovered, which is what governance acts on. A reflection lesson and a fine-tuned weight delta may carry the same procedural knowledge, but only one can be deleted, attributed, and rolled back. That distinction drives the reading below.

:::zh

各类存储基底沿着一条从内到外的物理梯度依次铺开：最内层是模型自身的参数权重，最外层则是多租户服务运行时。情景记忆，语义记忆与程序性技能，以及参数化与非参数化这套经典记忆分类依然有参考价值，但它们是横切在各个物理基底之上的正交维度，无法替代对基底本身的考察。记住的内容采用什么形态（究竟是事件轨迹，提炼出的事实，还是可调用的技能），决定了系统存下了什么信息，而底层选用哪种物理基底，则决定了这些信息如何寻址，如何改写，又如何恢复，这恰恰是状态治理真正着力的地方。一条写成文本的反思教训与一组微调进模型的权重增量，承载的程序性知识或许完全等价，却只有前者能够被定向删除，追查归属并按需回滚。下文对各类基底的剖析便围绕这一根本差异展开。
:::

:::bi

Taken together, the seven substrates form a spectrum from internal and dense to external and durable, and the memory-form sub-axis cuts across all of them: episodic traces appear as raw pages in agentic memory (Yan et al., 2025a), as event logs in event-sourced runtimes (Nakajima, 2026), and as video frames in egocentric stores (Forte et al., 2026); semantic facts appear as graph nodes (Wang et al., 2026c) and as retrieved chunks (Chen et al., 2023); procedural skills appear as LoRA adapters (Guo et al., 2026c), as distilled graph routines (Fang et al., 2026), and as governance gates over a typed event log (Malo and Qiu, 2026). The same knowledge can thus be parametric or non-parametric depending only on which substrate holds it, and that choice, not the form of the content, determines whether the state can be attributed, scoped, and reverted. Table 10 summarizes for each substrate what it natively stores and the governance blind spot it structurally imposes.

:::zh

合起来看，七类物理基底构成了一道从内敛稠密到外化持久的连续谱系，而经典的记忆形态子轴则横切过每一类基底：情景痕迹在智能体记忆框架里存为原始分页 (Yan et al., 2025a)，在事件溯源运行时里存为追加事件日志 (Nakajima, 2026)，在第一视角具身存储里则存为视频帧 (Forte et al., 2026)。语义事实既可以落成知识图谱里的节点 (Wang et al., 2026c)，也可以落成向量库里被检索出的文本块 (Chen et al., 2023)。程序性技能既可以压进 LoRA 适配器权重 (Guo et al., 2026c)，也可以提炼成图上的例程 (Fang et al., 2026)，或是写成架在类型化事件日志之上的治理门控规则 (Malo and Qiu, 2026)。可见，同一份知识究竟表现为参数化还是非参数化，完全取决于拿哪一层物理基底去承载它。真正决定一条状态日后能否追查归属，划定作用域并安全回退的，正是底层基底的选型，而非内容表面的形态。表 10 汇总了每类基底原生存储的对象，以及它在结构上自带的治理盲点。
:::

:::annotation

读下面的表 10 时，重点看最右侧的“治理盲点”一列：物理基底直接框死了治理的上限。同样一条程序性经验，写成事件溯源日志就能天然回滚，蒸馏进图节点就很难处理并发覆写，要是微调进 LoRA 权重里，连给单条经验打个墓碑标记都做不到。选存储基底的时候，其实就已经选定了系统将来能不能擦除和追责。
:::

:::bi

Table 10: Substrate comparison. Each substrate makes some state axes easy to represent and others non-native. Reading down the rightmost column reproduces, at the physical layer, the corpus-wide skew: writing and retrieving are easy across substrates, while deletion propagation, authority, and rollback require sidecar metadata, transactional wrappers, or different data structures. The rare exceptions (bi-temporal graphs, event-sourced runtimes, and checkpoint-restore runtimes) import database and operating-system governance, yet the memory layer above them rarely adopts those primitives.

| Substrate | What it natively stores | Governance blind spot |
| --- | --- | --- |
| Parametric / test-time | Distributed weight deltas; latent recurrent state; internalized skills | No native tombstone or attribution: deleting or auditing a specific update requires external instrumentation; provenance and rollback are not native |
| Context window | Tokens in the active prompt; sliding-window stream | No persistent identity, no source tags, no audited deletion; present-but-unretrievable state (lost-in-the-middle) |
| Vector store (RAG) | Embedded chunks addressed by similarity | Mutation-blind: no versioning or deletion cascade; provenance per chunk but not propagated; no validity window or read authority |
| Knowledge graph / temporal | Relations; bi-temporal facts with supersession chains | Single-writer assumption: weak under concurrent edits; authority over who may rewrite a relation is unspecified |
| Multimodal | Visual, video, egocentric-sensor state plus fused text | Per-modality faithfulness of writes; pixel-borne poisoning; no per-modality deletion/provenance semantics |
| Agentic-OS / runtime | Process identity, event logs, checkpoints, transactional effects | Sits below the memory layer it could govern; adoption gap means stores rarely build on its rollback primitives |
| Systems / resource layer | Tiered footprint, eviction state, cost profiles | Eviction is unverified forgetting; cost of governance operations (delete, audit, rollback) is unbudgeted |

:::zh

表 10：七类物理基底对比。每类基底都会让一部分状态轴天然易于表达，同时把另一部分状态轴挡在原生能力之外。顺着最右侧的“治理盲点”一列往下看，全语料的分布失衡在物理层再次重现：写入与检索在哪种基底上都很顺手，唯独删除传播，授权与回滚必须额外外挂边车元数据，事务封装层或彻底换用别的数据结构。少数例外（双时间知识图谱，事件溯源运行时与检查点恢复运行时）直接借用了数据库与操作系统的治理原语，遗憾的是架在它们上方的智能体记忆层极少真正接管这些原语。

| 基底 | 原生存储的内容 | 治理盲点 |
| --- | --- | --- |
| 参数化 / 测试时 | 分布式权重增量，潜在循环状态，内化的技能 | 无原生墓碑标记或归因能力：删除或审计单次特定更新需靠外部插桩，溯源与回滚均非原生支持 |
| 上下文窗口 | 活跃提示词中的 token，滑动窗口流 | 无持久身份，无来源标签，无经审计的删除，存在却提取不到的盲区状态（lost-in-the-middle） |
| 向量存储（RAG） | 按相似度寻址的嵌入块 | 对状态变更无感：无版本控制或级联删除，溯源仅停留在单块而不向下游传播，无有效期窗口或读取权限控制 |
| 知识图谱 / 时间 | 实体关系，带取代链的双时间事实 | 默认单写者假设：并发编辑下脆弱，未规定谁有权覆写既有关系 |
| 多模态 | 视觉，视频与第一视角传感器状态，外加融合文本 | 跨模态写入保真度难核验，像素级隐蔽投毒，缺乏按模态细分的删除与溯源语义 |
| 智能体操作系统 / 运行时 | 进程身份，事件日志，检查点与事务性效应 | 处在它本可治理的记忆层下方，上下层脱节导致记忆存储极少真正调用其回滚原语 |
| 系统 / 资源层 | 分层存储足迹，缓存淘汰状态与开销画像 | 缓存淘汰等于未经核验的静默遗忘，删除，审计与回滚等治理操作缺乏专门的资源预算 |
:::

## 机制族（Mechanism families）

:::bi

Table 12: Mechanism families through the lifecycle lens. Each family makes one operation explicit and leaves a governance field (authority, scope, mutability, provenance, recoverability) implicit, with a concrete consequence. The comparison identifies which state-governance gaps recur across the surveyed works rather than ranking memory products.

| Family | Operation made explicit | Governance field left implicit | Concrete consequence |
| --- | --- | --- | --- |
| Memory managers and graph memory | Write, organize, retrieve, consolidate; graph stores add multi-hop and temporal indexing | Authority and recoverability: who authorized a fact to act, can deletion be audited | Deletion edits the primary store while summaries, embeddings, and promoted tiers persist |
| Reflection and experience learners | Update: convert traces into lessons or causal abstractions | Validation: is the induced lesson true | One failed trajectory becomes a plausible but unproven durable rule |
| Skill and workflow induction | Procedural write and reuse of executable skills | Authority and mutability: test, scope, deprecate before reuse | A trajectory becomes a callable action whose misuse has tool consequences |
| Continual adaptation | Plasticity at write and update across task streams | Stability: validate, audit, forget, rollback | Helpful adaptation turns net-negative; competence and disorder accumulate together |
| Multi-agent and shared memory | Shared state, schema-bound mutation, access control | Scope and consistency: revocation and propagation | Corrupt or stale state crosses users or agents through shared memory |

:::zh

表 12：从生命周期视角审视五大机制族。每一族都把某几项操作做成了显式能力，同时把某几个治理字段（授权，作用域，可变性，溯源，可恢复性）留在暗处默认跳过，进而埋下对应的安全隐患。这张对比表旨在梳理现有工作中反复暴露的状态治理短板，而非给具体的记忆产品排座次。

| 族 | 显式实现的操作 | 默认隐含的治理字段 | 引发的具体后果 |
| --- | --- | --- | --- |
| 记忆管理器与图记忆 | 写入，组织，检索，整合，图存储外加多跳与时序索引 | 授权与可恢复性：谁批准某条事实指导行动，删除能否审计 | 删除操作只改动主存储，派生出的摘要，向量嵌入与高层条目依然残留 |
| 反思与经验学习器 | 更新：将历史轨迹提炼为经验教训或因果抽象 | 校验：归纳出的经验是否确实成立 | 单次失败轨迹摇身变成看似合理却未经核实的永久规则 |
| 技能与工作流归纳 | 可执行技能的程序性写入与直接复用 | 授权与可变性：复用前需测试，划定作用域并及时弃用过期技能 | 历史轨迹直接变成可调用的动作，一旦误用便会触发外部工具副作用 |
| 持续适应 | 跨任务流在写入与更新环节的可塑性 | 稳定性：校验，审计，遗忘，回滚 | 原本有益的适应跨过拐点后变成净负收益，能力与混乱同步堆积 |
| 多智能体与共享记忆 | 共享状态，受模式约束的变更，访问控制 | 作用域与一致性：权限撤销与级联传播 | 受损或陈旧的状态借由共享记忆池跨用户，跨智能体传染扩散 |
:::

:::bi

Several reported patterns show the criterion being violated in practice. *Skill shadowing*: a procedural skill that succeeded early is reused after the environment or goal has shifted, so a correct past execution becomes a wrong current one, and a library built for cheap reuse does not re-test a stored procedure before calling it (Wang et al., 2023a), the drift the skill subsection formalized. *Interference*: writes that help recent tasks degrade retention of older ones, the backward-transfer failure of continual learning expressed here through retrieval rather than weights. *Non-monotonic self-evolution*: iterating an explore-extract-internalize loop does not guarantee improvement (ang Gao et al., 2025), and frozen-weight agents degrade over time through distinct aging mechanisms, compression, interference, revision, and maintenance, that a longitudinal benchmark isolates and targets with stage-specific repair (Zhu et al., 2026b). *Replay weakness*: replay is the most direct compounding mechanism (Liu et al., 2025b), yet a lifelong agent benchmark finds naive replay weak for LLM agents because irrelevant retrieved episodes consume context, with structured aggregation helping more than raw recall (Zheng et al., 2025), and an environment-drift benchmark that frames the world as a sequence of progressive updates finds that agents average well under forty percent at keeping memory aligned to a shifting world (Xu et al., 2026a).

:::zh

多项实证研究已经记录下这一判据在实践中是如何失守的。*技能遮蔽*：早期某次成功跑通的程序性技能，在外部环境或任务目标早已发生偏移后仍被机械复用，导致昔日正确的操作在当下酿成错误，而追求低成本复用的技能库在调用前根本不会重测库存过程 (Wang et al., 2023a)，这正是前文技能小节所形式化的技能漂移。*干扰*：帮到近期任务的新写入反而拉低了早期任务的保持率，持续学习里经典的后向迁移失效，在这里借由检索干扰而非权重覆盖重演了出来。*非单调自我演化*：反复迭代“探索，抽取，内化”闭环并不能保证能力单调提升 (ang Gao et al., 2025)。即便冻结模型权重，智能体也会随着运行时间拉长，在压缩，干扰，修订与维护四种不同的老化机制作用下逐渐退化，一项纵向基准测试专门将这些老化机制逐一剥离，并给出了按阶段对症下药的修复方案 (Zhu et al., 2026b)。*回放乏力*：经验回放本是最直接的能力复利手段 (Liu et al., 2025b)，但一项终身智能体基准测试发现，朴素回放在 LLM 智能体上效果不佳，因为检索进来的无关历史回合白白挤占了上下文窗口，做结构化聚合远比直接塞入原始记录管用 (Zheng et al., 2025)。另一项将外部世界建模为渐进式状态更新序列的环境漂移基准测试更是测出，智能体在让自身记忆紧跟外部世界变化这件事上，平均准确率连四成都不到 (Xu et al., 2026a)。
:::

:::bi

Recent controlled studies sharpen these patterns into a baseline question that is uncomfortable for the whole field. A continual-learning benchmark built on a learnable latent structure that only stateful systems can exploit finds that dedicated memory systems do not reliably improve learning, and that naive in-context use of recent history outperforms several purpose-built memory architectures (Asawa et al., 2026). A separate benchmark with controlled reusable task streams shows that memory-induced degradation is hidden by naive evaluation streams and surfaces only when reuse is controlled, and pairs the finding with a filter for unreliable experience (Shu et al., 2026); a long-horizon benchmark over continuous agent-environment interaction across six domains tells the same story (Zhao et al., 2026c), and a co-play-derived task suite that instruments memory reads, writes, and validators exposes where agents fail to persist memory across tasks at all (Doss et al., 2026). The starkest result is that continuously LLM-consolidated textual memory has a utility curve that rises and then degrades below the no-memory baseline as consolidation accumulates (Zhang et al., 2026a): the memory stops helping and then actively harms, and the harm is a function of how much has been written, not of any single bad write. This is the silent-entropy reading of long-run degradation, accumulating disorder that grows with interaction count and is invisible to any metric that scores only the current answer. The collective message is empirical: stored state helps only when it is governed, not when it is simply accumulated, and an ungoverned memory system can be strictly worse than having no memory at all once the horizon is long enough.

:::zh

近期几项受控实验进一步把上述隐患浓缩成一个令整个领域如坐针毡的基线追问。一项建立在“唯有带状态系统才能利用的可学习潜在结构”之上的持续学习基准测试发现，专门设计的记忆系统并不能稳定提升学习表现，反倒是直接把近期历史塞进上下文窗口的朴素做法，跑赢了好几套精心搭出来的记忆架构 (Asawa et al., 2026)。另一项严格控制任务流复用比例的基准测试证实，常规评测流会掩盖由记忆引发的性能退化，唯有在受控复用条件下这层退化才会彻底显形，作者为此专门配套了一套不可靠经验过滤器 (Shu et al., 2026)。一项横跨六个领域，考察智能体与环境长期连续交互的长时程基准测试也得出了同样的结论 (Zhao et al., 2026c)，而一套衍生自双人协作游戏，对记忆读取，写入与校验器全程埋点的任务集，则直接暴露出智能体在跨任务维持状态这件事上究竟是从哪一步开始掉链子的 (Doss et al., 2026)。最扎心的一组结果来自对 LLM 持续整合型文本记忆的追踪：随着整合轮次不断累加，这类记忆的效用曲线会先升后降，最终跌破完全不带记忆的裸模型基线 (Zhang et al., 2026a)。也就是说，记忆系统先是帮不上忙，接着开始倒帮忙，而且这种倒退纯粹随着写入总量的堆积而恶化，哪怕期间并没有混入任何单次恶意投毒。这就是长期退化背后的“静默熵增”图景：系统内部的混乱度随交互轮次悄然膨胀，而那些只盯着当前单轮回答打分的评测指标对此全然失明。这批研究共同传递出一条冷峻的经验教训：留存状态唯有在受治理的前提下才能成为资产，只管往里攒而不加治理的记忆系统，一旦运行周期拉得足够长，表现反而远远不如彻底清空记忆。
:::

:::annotation

这段引用的几组受控实验非常扎心：让 LLM 不断把历史对话总结成文本记忆，效用曲线会先升后降，拉长交互轮次后甚至跑不过完全不带记忆的裸模型。原因在于每次有损整合都在悄悄放大偏差，冲淡来源，久而久之记忆库里全是半真半假的陈旧规则。缺少校验和淘汰机制的记忆系统，攒得越多，烂得越快。
:::

:::bi

Read together, Table 12 and the five families form a single diagnostic rather than five separate reviews. Many mechanisms share the same strengths, write, organize, and retrieve, and the same weaknesses, the validate, audit, and rollback stages that would govern what those operations produce. Memory managers leave the authority of a written item implicit, so deletion edits the store instead of producing auditable erasure. Reflection systems make update explicit but leave validation implicit, so one failed trajectory becomes a durable false rule. Skill libraries expose the actionability axis most sharply, turning trajectories into executable commitments while leaving authorization and deprecation weakest. Continual adaptation shows that without the stability operators the act of accumulating helps until it harms. Shared substrates carry all of these omissions across the scope boundary at once. The response implied by the table is *controlled compounding*: accepting a write or update only when it preserves the five invariants, so that competence accumulates only on state that is grounded, scoped, testable, and reversible. The criterion is deliberately falsifiable. A system claims controlled compounding only if, when a later regression is traced to an earlier write, reflection, skill, consolidation, or shared-memory entry, that specific update can be identified, de-authorized, and reverted with its derived state. By that standard most current mechanisms have not demonstrated controlled compounding; they have demonstrated accumulation. The difference between the two is the governance this survey argues the field should measure.

:::zh

把表 12 与五大机制族合在一起看，它们共同拼出了一份统一的病灶诊断，而非五篇各自独立的子领域综述。现有的绝大多数机制都在写入，组织与检索这三个前端操作上长袖善舞，又都在校验，审计与回滚这三个负责兜底治理的后端环节上集体缺位。记忆管理器默认省掉了写入条目的授权字段，使得删除操作沦为对单个存储表的局部涂改，给不出可审计的全局擦除保证。反思系统把状态更新摆上台面，却漏掉了真伪校验，任由单次失败轨迹沉淀为长期误导系统的错误规则。技能库把可行动性推到极致，将历史轨迹直接封装为可执行承诺，偏偏在权限核验与过期弃用上最为松懈。持续适应的实验证明，一旦缺少稳定性算子护航，状态积累越到后期越会反噬系统表现。多智能体共享基底则一举将上述所有隐患放大到了跨用户，跨智能体的作用域边界之外。沿着这张表往下推，破局之道直指*受控复利*：唯有当一次写入或更新严格守住前述五条不变量时才予放行，确保智能体的能力只建立在来源有据，作用域受限，真伪可测且随时可逆的状态地基之上。这一判据在设计上就是严格可证伪的：日后一旦出现性能回退，并倒查出病根源自早先的某次写入，某条反思，某个技能，某轮整合或某条共享记忆，唯有当系统能够精准定位该次更新，吊销其授权并连同所有派生状态一并回退时，它才有资格宣称实现了受控复利。按这把尺子衡量，目前绝大多数机制展现出的仅仅是“状态堆积”，远未达到“受控复利”，而横亘在两者之间的那道鸿沟，正是本综述呼吁整个领域着手度量的状态治理。
:::

## 基准测试与评测族系（Benchmark and evaluation families）

:::annotation

这一节揭示了一个颇具讽刺意味的现状：测记忆的基准（如 LoCoMo）几乎不涉及真实工具调用，而测真实工具调用的基准（如 WorkArena，AppWorld）又习惯在每个任务结束后重置环境，恰好抹掉了跨任务的持久状态。扫一眼下方表 13 的右侧两列就能发现，隐私同意边界（R5）与坏记忆后的恢复（R6）几乎是一片空白。
:::

:::bi

Comparing these benchmarks exposes the shared limitation. MemoryArena and LifelongAgentBench reward experience reuse but treat memory as an unaudited performance booster: there is no scoring of whether a reused experience was authorized to influence the new task, no provenance tier on the stored trajectory, and no test of whether a poisoned or stale experience should have been blocked. The realistic substrates are, almost by construction, episodic: WorkArena, OSWorld, and AppWorld reset the environment at each task, which is exactly the boundary an always-on protocol must cross. They verify that an action produced the right final state, but reset identity, consent, accumulated permission, and long-run governance between tasks, so the questions that define always-on behavior never arise. Even AppWorld, which executes real side effects against stateful apps, scores whether the side effect was correct, not whether it was recoverable: there is no perturbation that retries an irreversible call to test idempotency, no revocation of the authority that licensed an earlier action followed by a check that the action’s state was rolled back, and no deletion request whose propagation to derived state is verified. The matrix view makes the pattern concrete: each suite tracks state in action but does not isolate whether failures stem from a bad write, weak organization, or weak retrieval at action time, and none couples action to governed writes, revocation, or rollback. The gap here is not realism and not action, both of which this family has in abundance. The gap is that the same protocol does not jointly stress persistent identity, governed writes, provenance, deletion, rollback, stale-state adjudication, privacy scope, and recovery. Memory-guided action benchmarks prove that acting on memory is hard and measurable; they leave untested whether acting on memory is governed.

:::zh

把这几套基准测试放在一起横向对比，它们共同的盲区便一目了然。MemoryArena 与 LifelongAgentBench 鼓励复用历史经验，却把记忆当成了免于审计的性能外挂：既不考核某段复用经验是否有权干预当前新任务，也不给存储轨迹划分溯源可信度层级，更不检验一段遭投毒或已过期的旧经验当初是否就该被拦下。至于那些高度仿真的交互环境，从构造上就停留在单回合模式：WorkArena，OSWorld 与 AppWorld 在每个任务结束时都会重置环境，偏偏抹掉了常驻协议最需要跨越的那道边界。它们只管核验单次动作有没有在当下拼出正确的最终状态，转头就在任务切换时清空身份，用户同意，累积权限与长期治理状态，使得真正定义常驻行为的那些棘手问题压根无从浮现。哪怕是会在有状态应用上触发真实副作用的 AppWorld，考核的也只是副作用本身对不对，从不考核副作用能不能恢复：既没有故意重放不可逆调用来检验幂等性的扰动测试，也没有先吊销某项早期动作的授权，再检查对应状态是否已妥善回滚的用例，更没有发起删除请求并核验其是否传遍所有派生状态的测试。放到评测矩阵里看就更清楚了：每套基准都在行动过程中追踪状态，却分不清一次失败究竟栽在糟糕的写入，松散的组织，还是行动瞬间的检索掉链子，也没有任何一套基准把真实行动同受治理的写入，权限吊销或状态回滚绑在一起联测。这一族系并不缺环境真实感，也不缺真实动作，这两样它都给得很足。真正缺失的是用同一套评测协议，去联合施压持久身份，受治理写入，溯源，删除，回滚，陈旧状态裁决，隐私作用域与事后恢复。记忆引导行动类基准已经证明“依据记忆采取行动”很难且可量化，却还没人检验“依据记忆采取行动”这件事本身是否受控。
:::

:::bi

Table 13: Per-benchmark coverage of the six always-on benchmark stressors, for representative benchmarks from the three families where benchmark-level coding is densest. R1 persistent multi-user memory, R2 stale-state adjudication, R3 social and belief dynamics, R4 real action with side effects, R5 privacy or consent boundary, R6 recovery after bad memory. $\bullet$ denotes a scored stressor, $\circ$ partial, blank not scored. Two patterns are visible by column: the R6 (recovery) column is essentially empty, and no row marks R4, R5, and R6 together. The partition is structural, not a single missing dataset.

| Benchmark | Family | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LoCoMo | Memory QA |  | $\circ$ |  |  |  |  |
| LongMemEval | Memory QA |  | $\circ$ |  |  |  |  |
| MemoryAgentBench | Memory QA |  | $\circ$ |  | $\circ$ |  |  |
| PerLTQA | Memory QA |  | $\circ$ | $\circ$ |  |  |  |
| MemoryArena | Mem-guided action |  | $\circ$ |  | $\bullet$ |  |  |
| LifelongAgentBench | Mem-guided action |  | $\circ$ |  | $\bullet$ |  |  |
| WorkArena | Mem-guided action |  |  |  | $\bullet$ |  |  |
| WorkArena++ | Mem-guided action |  |  |  | $\bullet$ |  |  |
| STALE | State/belief mut. |  | $\bullet$ |  |  |  |  |
| Memora/FAMA | State/belief mut. |  | $\bullet$ |  |  |  |  |
| BeliefShift | State/belief mut. |  | $\bullet$ | $\bullet$ |  |  |  |
| Lifelong-SOTOPIA | State/belief mut. | $\circ$ |  | $\bullet$ |  |  |  |

:::zh

表 13：六类常驻基准压力源在单个基准层面的覆盖情况，选取基准级编码最密集的三大族系中的代表性工作。R1 为持久多用户记忆，R2 为陈旧状态裁决，R3 为社会与信念动态，R4 为带副作用的真实行动，R5 为隐私或同意边界，R6 为坏记忆之后的恢复。$\bullet$ 表示直接计分的压力源，$\circ$ 表示部分覆盖，空白表示未计分。顺着列往下看能立刻看出两条规律：R6（恢复）这一列几乎全空，且没有任何一行同时点亮 R4，R5 与 R6。这种割裂属于结构性断层，绝非补一个数据集就能填平。

| 基准 | 族系 | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LoCoMo | 记忆问答 |  | $\circ$ |  |  |  |  |
| LongMemEval | 记忆问答 |  | $\circ$ |  |  |  |  |
| MemoryAgentBench | 记忆问答 |  | $\circ$ |  | $\circ$ |  |  |
| PerLTQA | 记忆问答 |  | $\circ$ | $\circ$ |  |  |  |
| MemoryArena | 记忆引导行动 |  | $\circ$ |  | $\bullet$ |  |  |
| LifelongAgentBench | 记忆引导行动 |  | $\circ$ |  | $\bullet$ |  |  |
| WorkArena | 记忆引导行动 |  |  |  | $\bullet$ |  |  |
| WorkArena++ | 记忆引导行动 |  |  |  | $\bullet$ |  |  |
| STALE | 状态/信念变异 |  | $\bullet$ |  |  |  |  |
| Memora/FAMA | 状态/信念变异 |  | $\bullet$ |  |  |  |  |
| BeliefShift | 状态/信念变异 |  | $\bullet$ | $\bullet$ |  |  |  |
| Lifelong-SOTOPIA | 状态/信念变异 | $\circ$ |  | $\bullet$ |  |  |  |
:::

:::bi

The deficit is therefore structural rather than a gap that one more dataset would close. Each family’s format encodes its blind spot. A memory-QA recall unit has no field for an authority tag or a deletion record; an episodic action benchmark resets the very persistence it would need to test governance across; a mutation benchmark scores the memory graph but not the side effect derived from it; a personalization benchmark treats the user’s stored state as a recall target rather than as consent-bound, revocable, auditable state. None of these is a defect of the benchmark within its own purpose. The defect is that the union of their purposes still leaves the persistent-state lifecycle, observe, write, validate, organize, retrieve, act, update, forget, audit, rollback, evaluated only in pieces, with the governance-defining stages of forget, audit, and rollback measured least and never jointly with action. A score on any one family certifies a capability that a stateless or single-session system could in principle also possess; none certifies the property that actually distinguishes a persistent-state system, namely that state is governed across its lifecycle under authority, scope, provenance, recoverability, and actionability constraints.

:::zh

由此可见，眼下的评测缺口是结构性的，远非再补一个数据集就能填平。每一类基准的数据格式本身就把自己的盲区写死了。记忆问答的召回条目里压根没有留给授权标签或删除记录的字段。单回合行动基准每次重置环境，恰好把跨回合检验治理所需的持久性一并清零。状态变异基准只给内部记忆图谱打分，却不管由它触发的外部副作用。个性化基准把用户状态当成静态召回目标，全然不顾它本该受用户同意约束，支持随时撤回并接受审计。单看每个族系内部，这些取舍各自合情合理。可一旦把所有族系的测试目标拼到一起，完整的十阶段持久状态生命周期（观察，写入，校验，组织，检索，行动，更新，遗忘，审计，回滚）依然被切得七零八落，其中真正定义状态治理的遗忘，审计与回滚三步测得最少，且从未同真实行动绑在一起联测。在任何一个单一族系里刷出高分，证明的都只是某种无状态或单会话系统原则上也能具备的能力。没有任何一个现有族系能够核验真正把持久状态系统区分出来的核心性质，即状态能否在授权，作用域，溯源，可恢复性与可行动性的多重约束下，受控地走完整个生命周期。
:::

## 失效模式，安全与治理（Failure modes, safety, and governance）

:::annotation

看表 16 时特别留意最后一行“作为攻击面的回滚”：连恢复机制本身都可能变成新的漏洞入口。比如智能体回滚了内部记忆状态，却忘了某个外部工具调用已经执行完毕，结果重放时把同一笔款又付了一次，或者攻击者故意触发回滚，把已经被撤销的旧权限重新激活。所以回滚操作本身也必须受授权与幂等性约束。
:::

:::bi

Table 16: Persistence-induced failure modes, each mapped to the lifecycle boundary where corrupt state enters or activates and to the state invariant (Section 4) it violates. The table treats safety as a property of the whole lifecycle, not a final filter applied after retrieval. The last row is important because recovery, the mechanism meant to repair the others, is itself a fresh boundary at which new corruption can enter.

| Boundary | Failure | Invariant violated | Repr. work |
| --- | --- | --- | --- |
| Write | Untrusted write poisoning; indirect prompt injection | Authority monotonicity; provenance preservation | (Louck, 2026; Joshi et al., 2026) |
| Consolidate | Retrieval-key loss; procedure poisoning | Provenance preservation | (Ouyang and Hou, 2026; Kumar et al., 2026) |
| Retrieve and act | Memory distraction; control-flow hijack | Authority monotonicity; scope non-expansion | (Xu et al., 2026b; Winston et al., 2026) |
| Update | Stale commitment; belief drift | Authority monotonicity | (Zhou et al., 2026d; Shawn et al., 2026) |
| Forget and audit | Deletion failure; rollback gap | Deletion propagation; rollback traceability | (Zhao et al., 2026b; Shah et al., 2026) |
| Shared state | Cross-agent propagation | Scope non-expansion | (Ren et al., 2026b; Ravindran, 2026) |
| Recovery | Rollback as attack surface | Rollback traceability | (Zheng et al., 2026d) |

:::zh

表 16：由持久化诱发的各类失效模式，分别映射到受损状态混入或激活的生命周期边界，以及它所击穿的状态不变量（见第 4 节）。这张表将安全性视作贯穿整个生命周期的全局性质，而非检索之后临时加装的一道末端滤网。最后一行尤为关键：本该用来修补其他失效的恢复机制本身，同样是一道可能放进新污染的风险边界。

| 边界 | 失效 | 违反的不变量 | 代表性工作 |
| --- | --- | --- | --- |
| 写入 | 不可信写入投毒，间接提示注入 | 授权单调性，溯源保全 | (Louck, 2026; Joshi et al., 2026) |
| 整合 | 检索键丢失，过程投毒 | 溯源保全 | (Ouyang and Hou, 2026; Kumar et al., 2026) |
| 检索与行动 | 记忆分心，控制流劫持 | 授权单调性，作用域不扩张 | (Xu et al., 2026b; Winston et al., 2026) |
| 更新 | 陈旧承诺，信念漂移 | 授权单调性 | (Zhou et al., 2026d; Shawn et al., 2026) |
| 遗忘与审计 | 删除失效，回滚缺口 | 删除传播，回滚可追溯性 | (Zhao et al., 2026b; Shah et al., 2026) |
| 共享状态 | 跨智能体传播 | 作用域不扩张 | (Ren et al., 2026b; Ravindran, 2026) |
| 恢复 | 作为攻击面的回滚 | 回滚可追溯性 | (Zheng et al., 2026d) |
:::

:::bi

Read together, the six subareas tell one story. The works we coded contain sophisticated, sometimes formally verified machinery for the parts of governance closest to the action boundary, monotone authorization, capability containment, attested tool servers, and a substantial descriptive literature on the attacks that persistence enables. Across these enforcement results, validation works best as a live runtime gate rather than a static policy check; recent work makes this explicit. Behavioral contracts integrate preconditions, invariants, governance policies, and recovery as executable specifications enforced at runtime to bound behavioral drift in autonomous agents (Bhardwaj, 2026), supplying a frame in which our validate stage and every invariant become checkable obligations rather than aspirations. Concrete instances populate that frame: a dedicated runtime authority-control layer gates tool invocations and tracks source and target trust to prevent authority confusion independent of prompt-only defenses (Qin et al., 2026); the halt-and-recover authority construction discussed above guarantees no action executes without constructible authority (TraslaIA, 2026); and capability mutation at runtime is bounded by explicit validation, traceability, and rollback constraints so that adaptation stays observable rather than unconstrained (Garralda-Barrio, 2026). Two framing results bound when such gates should be used: a governance rubric reserves runtime guardrails for controls that are observable, determinate, and time-sensitive, assigning the rest across architecture, policy, escalation, and audit (Koch, 2026), and a proactive monitor learns behavioral dynamics to predict unsafe trajectories and intervene before a violation manifests rather than after (Wang et al., 2025a), which complements the reactive, post-hoc detection that dominates the corpus. What remains thin in our coded corpus is the return-arc machinery that closes the lifecycle: cascade-aware deletion that survives lossy consolidation, lineage maintained as a live structure rather than a write-once log, scope enforced across all of an agent’s data surfaces under one policy, and rollback that is itself governed rather than a fresh attack surface. The numbers make the asymmetry concrete as a scoping estimate: authority at 72, recoverability at 112, audit at 88, forget at 66, and rollback at 27, all out of 435, with late targeted search rounds showing diminishing returns under our query frame. Here the skew is a safety concern as well as a coverage statistic: every failure mode in Table 16, from a poisoned write that activates after its author is gone to a recovery that re-sends a payment, is enabled by a missing return-arc operation. The five invariants, authority monotonicity, scope non-expansion, deletion propagation, provenance preservation, and rollback traceability, are therefore not abstract desiderata but the named properties whose absence each documented attack exploits, and which the existing literature names, occasionally enforces, and rarely measures end to end.

:::zh

把上述六个子领域合在一起读，讲的其实是同一个故事。在我们编码的文献里，紧挨着行动边界的那一截治理已经打磨出相当精巧，甚至经过形式化验证的机制：单调授权，能力遏制，经远程证明的工具服务器，外加一大批剖析持久化攻击原理的实证论文。这批成果共同印证了一点：把校验做成运行时的实时门控，远比静态策略检查管用，近期多项研究更是将这一思路彻底显式化。例如，行为契约将前置条件，不变量，治理策略与恢复流程统一打包成可在运行时强制执行的形式化规范，用来框住自主智能体的行为漂移 (Bhardwaj, 2026)，从而让本文的校验阶段与五条不变量从纸面愿景落地为可核查的运行时义务。一批具体实现相继填入了这一框架：专用运行时授权控制层负责卡控每一次工具调用，并独立追踪来源与目标的可信度，摆脱对单纯提示词防御的依赖以杜绝授权混淆 (Qin et al., 2026)。前文提过的“停机并恢复”授权构造，确保了任何缺乏可构造授权链的动作都休想执行 (TraslaIA, 2026)。运行时的动态能力变更则被关进显式校验，全程可追溯与可回滚的笼子里，确保自我适应过程始终可观测，受约束 (Garralda-Barrio, 2026)。另外两项框定性工作厘清了这类运行时门控的适用边界：一套治理准则将运行时护栏专门留给那些可观测，确定性强且对时延敏感的控制项，把其余控制职责分摊到架构设计，策略规范，人工升级与事后审计之中 (Koch, 2026)。另一套主动监控器则通过学习行为动力学来提前预判危险轨迹，在违规真正发生之前果断出手拦截 (Wang et al., 2025a)，补上了现有文献过度依赖事后被动检测的短板。相比之下，整批编码语料里真正单薄的，是负责给生命周期收尾的回程弧机制：经历有损整合后仍不掉链子的级联删除，作为动态活结构而非一次性日志持续维护的派生谱系，在统一策略下横跨智能体全部数据界面的作用域隔离，以及本身受到严格治理，不致沦为新攻击面的安全回滚。几组摸底统计数字把这种头重脚轻刻画得淋漓尽致：以 435 篇为分母，涉及授权的占 72 篇，可恢复性 112 篇，审计 88 篇，遗忘 66 篇，回滚仅 27 篇，且后期的定向补充检索在当前查询框架下已呈现明显的收益递减。这种分布偏斜远非单纯的文献计量现象，它直接对应着现实的安全敞口：表 16 列出的每一种失效模式，无论是攻击者早已下线后才延迟引爆的投毒写入，还是恢复过程中把同一笔款项再付一次的重放事故，病根都出在回程弧操作的缺位上。正因如此，授权单调性，作用域不扩张，删除传播，溯源保全与回滚可追溯性这五条不变量绝非空中楼阁式的纸面理想，它们恰恰是每一次记录在案的攻击所瞄准的破绽所在。现有文献已经为它们起了名字，偶尔也会局部强制执行，却极少对它们开展端到端的完整度量。
:::

## 常驻评测协议（AOEP）（The Always-On Evaluation Protocol (AOEP)）

:::bi

The preceding parts established a recurring asymmetry in our coded corpus. The literature has learned to accumulate state and to retrieve it, and a large benchmark literature now scores how well it does so, but much less of that literature scores whether the state was *governed*: whether a deleted fact stayed deleted across derived tiers, whether an action was licensed by a still-valid authority, whether an untrusted observation was prevented from becoming durable instruction, whether a corrupted decision can be traced back and undone. The Always-On Evaluation Protocol (AOEP) targets that omission. It does not measure answer quality on a memory question; it measures the correctness of a *state trajectory* under the kinds of perturbations only a persistent agent encounters: restart, conflict, deletion request, permission revocation, shared-scope change, adversarial write, and delayed consequence. AOEP-v0 is a reference design plus a pilot analysis, with the evaluation flow shown in Figure 7. The pilot illustrates how a survey-derived contract can expose missing governance state in tested memory configurations; it is not evidence that deployed memory systems generally fail or that larger readers could never help once the memory layer exposes the right fields.

:::zh

前文各节已经反复印证了编码语料中的结构性失衡：现有研究早已熟稔如何积累状态，如何检索状态，并配套了庞大的基准测试体系来给这两件事打分，却鲜少考核状态在跨会话留存期间是否真正受到了*治理*：一条声明删除的事实在各个派生层级上是否确实删干净了，一次工具调用背后是否有依然有效的授权背书，一条不可信的外部观察有没有被及时拦住以免沉淀为持久指令，一次受污染状态误导的决策事后能否顺藤摸瓜予以撤销。常驻评测协议（AOEP）正是冲着这片空白去的。它不再围绕记忆问答的答案质量打转，而是直接把*状态轨迹*放到唯有持久智能体才会撞上的连环扰动下（重启，状态冲突，删除请求，权限吊销，共享作用域变更，对抗性写入与延迟副作用），检验整条轨迹的演化是否正确。AOEP-v0 包含一套参考设计与一组试点分析，整体评测流程见图 7。这组试点旨在演示如何把从综述提炼出的治理契约落成代码，揪出受测记忆配置中缺失的治理状态。当然，试点结果并不意味着线上部署的记忆系统全盘皆输，也不排斥未来一旦记忆层补齐了相应字段，更强的阅读器模型能够发挥更大作用。
:::

:::bi

AOEP is *representational, not a leaderboard*, and a *wrapper around realistic substrates, not a replacement for them*. AOEP-v0 is not intended to rank deployed memory products or establish benchmark-grade generalization. The contribution is a contract for what a state transition must expose to be scorable, plus a small harness showing how that contract can distinguish stores that expose governance fields from stores that expose only text.

:::zh

AOEP 的定位是*表征性契约而非竞速排行榜*，是*套在真实存储基底外面的评测封装层而非替代品*。AOEP-v0 无意给市面上的记忆产品排座次，也不追求单凭几个样例就确立基准测试级的广泛泛化。它的核心贡献在于立下一份明确的契约，规定一次状态转移必须向外暴露哪些结构化信息才算得上可评分，并配套一套轻量级测试框架，直观展示这份契约如何把“真正暴露治理字段的存储”与“只管吞吐纯文本的存储”清晰区分开来。
:::

:::bi

AOEP fixes a data contract rather than a task. An episode is a sequence of typed *events*, replayed to a system under test one at a time, and a *state snapshot* reconstructed at the end from the system’s answers to neutral probes. The protocol’s claim is that an event must carry strictly more than a memory dump records, and that this added structure is what makes governance scorable.

:::zh

AOEP 钉死的是一份数据契约，而非某道具体考题。每个评测回合由一串带类型的*事件*流构成，按时间顺序逐条重放给受测系统，回合末尾再根据系统对中性探针的作答重建出一份*状态快照*。该协议的核心论点在于：单条事件必须携带严格多于常规记忆转储的元数据，而正是这层附加结构让状态治理变得可量化，可打分。
:::

:::bi

Concretely, each AOEP event carries fields a flat memory entry omits. It carries an *idempotency key*, so a replayed duplicate write after a restart is recognizable as the same logical operation rather than a second fact. It carries *causal links*, separated into parent, supersedes, and conflicts-with edges plus a transaction id, so that a later value can be marked as superseding an earlier one and a collaborator’s proposal can be marked as conflicting with an owner’s. It carries a *permission epoch* on its scope, an integer that increments when authority changes, so that an action can be checked against the epoch in force at execution rather than the epoch at write. It carries *provenance* with an explicit *trust tier* and an optional signature, so an untrusted tool result is distinguishable from a user instruction regardless of how persuasive its text is. It carries *retention and privacy constraints*, a retention policy, a privacy class, an optional time-to-live, and a requires-confirmation flag, so that deletion and confirmation obligations attach to the record itself. And it carries one *typed operation* drawn from a closed set of eleven: `read`, `write`, `update`, `delete`, `tombstone`, `share`, `unshare`, `validate`, `quarantine`, `deny`, and `rollback`. The closed operation set is what lets the validator reason about the trajectory as a state machine: a `tombstone` that is not reflected in the deletion ledger, or a `quarantine` that is later promoted to instruction, is a named, locatable violation rather than a degraded score.

:::zh

具体而言，每条 AOEP 事件都带有传统扁平记忆条目默认省掉的治理字段。它带有*幂等键*，确保系统重启后重放的重复写入会被识别为同一次逻辑操作，以免被当成第二条独立事实重复入库。它带有细分为父边，取代边与冲突边的*因果链接*外加事务 id，使后写入的新值能够明确标记为对旧值的取代，协作者提交的提议也能明确标记为与所有者意图的冲突。它在自身作用域上带有*权限纪元*（一个每逢授权变更就递增的整数），使系统在执行动作时能够对照当下生效的纪元核验权限，而非盲信当初写入时的旧纪元。它带有标明*信任层级*与可选签名的*溯源*字段，确保来自外部工具的不可信返回结果无论措辞多么像模像样，都能与真实的用户指令严格区分开。它带有涵盖保留策略，隐私级别，可选生存时间（TTL）与需确认标志的*保留与隐私约束*，将删除与二次确认义务直接焊死在记录本体上。最后，它还带有一个取自十一元封闭集合的*带类型操作*：`read`，`write`，`update`，`delete`，`tombstone`，`share`，`unshare`，`validate`，`quarantine`，`deny` 与 `rollback`。正是这个封闭操作集，让外部校验器能够把整条状态轨迹当作确定性状态机来推理：一条未能在删除台账里兑现的 `tombstone`，或者一条事后被违规提拔为正式指令的 `quarantine`，都会被精准定性为具名且可定位的契约违规，而非笼统地扣掉几分。
:::

:::annotation

仔细看 AOEP 的事件结构就会发现，它完全是按数据库事务日志的规格来设计的：幂等键防重放，因果边管版本取代与冲突，权限纪元管授权过期，再加上十一种封闭的状态机操作。只有把记忆读写从“自然语言自由发挥”收紧成带类型的状态转换，外部校验器才能脱离 LLM 裁判，用确定性规则算出哪一步越了界。
:::

:::bi

The snapshot is the dual of the stream. It exposes a *deletion ledger*, a *rollback ledger*, the set of *pending conflicts* with their candidate values and the authority backing each, the *per-resource permission epochs* currently in force, and the boolean results of the invariant checks. The protocol deliberately separates the system’s self-report from the harness’s verdict: the harness recomputes every invariant boolean itself from the reconstructed snapshot and never trusts a system’s claim that it behaved. This design borrows the spirit of trajectory-level evaluation from You et al. (2026) while deliberately avoiding LLM-as-judge scoring, because the position, verbosity, and self-enhancement biases documented by Zheng et al. (2023) and Shi et al. (2024) would be fatal for a contract whose entire purpose is to detect quiet governance failures. Every AOEP check is deterministic.

:::zh

状态快照与事件流互为对偶。快照向外暴露*删除台账*，*回滚台账*，附上候选值与各方授权依据的*待裁决冲突集合*，各资源当前生效的*权限纪元*，以及各项不变量检查的布尔结果。协议刻意将受测系统的“自报家门”与测试框架的“独立裁决”拆开：测试框架完全根据探针重建出的快照自行重算每一个不变量布尔值，绝不轻信受测系统口头声称自己守了规矩。这一设计借鉴了 You et al. (2026) 轨迹级评测的思路，同时坚决摒弃 LLM-as-judge 打分模式，因为一旦引入大模型裁判，Zheng et al. (2023) 与 Shi et al. (2024) 揭示过的位置偏好，啰嗦偏好与自我偏袒就会乘虚而入，对一份旨在揪出静默治理失效的契约而言无异于自毁长城。在 AOEP 中，每一项检查都是完全确定性的。
:::

:::bi

AOEP’s scorecard is deliberately split into two scores rather than a single number. The first is *obligation pass*: the positive obligations a system must *actively* satisfy. These are operations that produce state the agent must maintain, namely recording a deletion, reporting the current permission epoch after a revocation, blocking a stale-permission or untrusted-instruction task, surfacing an owner-versus-collaborator conflict, and logging a rollback after an external action. The second is *negative-invariant pass*: the no-leakage checks, namely that a deleted value is not visible, that an out-of-scope value does not appear, and that an untrusted instruction was not promoted.

:::zh

AOEP 的记分卡特意拆成两项独立指标，拒绝合成单一总分。第一项是*义务通过*（obligation pass），考核系统必须*主动*兑现的正向职责。这类操作要求智能体产出并维护专门的治理状态：登记删除台账，在权限吊销后准确报告当前权限纪元，果断拦截基于过期权限或不可信指令的任务，主动挑明所有者与协作者之间的状态冲突，以及在外部动作执行后登记回滚记录。第二项是*负向不变量通过*（negative-invariant pass），即零泄漏检查：核验已删除的取值不再露面，越出作用域的取值绝不混入结果，且被隔离的不可信指令未被暗中提拔为有效指令。
:::

:::bi

Table 18: AOEP pilot over nine fault patterns, one frozen reader, greedy decoding. The governed upper bound satisfies every obligation. The three raw-storage systems satisfy the same recall obligations and fail the same governance obligations, scoring identically across recency, full-context, and dense retrieval. The tested extracted-fact configurations score lower (Mem0-style $4/15$; the local `mem0ai` setup $3/15$), because in this pilot their extraction step drops the structured envelope. The no-memory floor is the only system that never leaks, and it does so by satisfying no positive obligation at all.

| System | Obligation | Neg.-invariant | All |
| --- | --- | --- | --- |
| Governed reducer (upper bound) | $15/15$ | $41/41$ | $92/92$ |
| No-memory (floor) | $0/15$ | $41/41$ | $77/92$ |
| Naive append (Qwen2.5-7B) | $7/15$ | $40/41$ | $83/92$ |
| Full context (Qwen2.5-7B) | $7/15$ | $40/41$ | $83/92$ |
| Vector-RAG (MiniLM+Qwen2.5-7B) | $7/15$ | $40/41$ | $83/92$ |
| Mem0-style (extracted facts) | $4/15$ | $38/41$ | $77/92$ |
| Mem0 (actual `mem0ai`) | $3/15$ | $36/41$ | $73/92$ |

:::zh

表 18：九种故障模式下的 AOEP 试点结果（固定单一阅读器，采用贪心解码）。受治理上界拿满全部义务分。三套原始文本存储系统通过了完全相同的语义回忆义务，也在完全相同的治理义务上折戟，使得按新近度检索，全上下文塞入与稠密向量检索三者的得分分毫不差。受测的两套事实抽取配置得分反而更低（Mem0 风格为 $4/15$，本地 `mem0ai` 实例为 $3/15$），原因在于它们的抽取步骤顺手抹掉了结构化治理包络。无记忆下限则是全场唯一零泄漏的非上界系统，代价是在正向义务上交了白卷。

| 系统 | 义务 | 负向不变量 | 总计 |
| --- | --- | --- | --- |
| 受治理归约器（上界） | $15/15$ | $41/41$ | $92/92$ |
| 无记忆（下限） | $0/15$ | $41/41$ | $77/92$ |
| 朴素追加（Qwen2.5-7B） | $7/15$ | $40/41$ | $83/92$ |
| 全上下文（Qwen2.5-7B） | $7/15$ | $40/41$ | $83/92$ |
| 向量 RAG（MiniLM+Qwen2.5-7B） | $7/15$ | $40/41$ | $83/92$ |
| Mem0 风格（抽取事实） | $4/15$ | $38/41$ | $77/92$ |
| Mem0（实际 `mem0ai`） | $3/15$ | $36/41$ | $73/92$ |
:::

:::bi

Table 18 reports the headline. The reading turns entirely on the obligation column. The governed reducer satisfies all fifteen obligations, demonstrating that the obligations are satisfiable inside the reference harness; the no-memory floor satisfies none. The three raw-storage systems all score $7/15$, and the identity of their scores is the most informative fact in the table. They pass the obligations that reduce to *semantic recall*, namely whether a value was deleted, whether an instruction was quarantined, and the status of an active item, all of which a capable reader infers from text. They fail the obligations that require maintained *governance state*: reporting the current permission epoch after a revocation, blocking a stale-permission or untrusted-instruction task, surfacing a conflict, and logging a rollback. None of these is a retrieval problem in the tested configurations, which is why recency, full-context, and dense retrieval score identically. The information is not missing from the context; it is that these text stores have no field in which a permission epoch, a quarantine state, a conflict record, or a rollback ledger lives. This is a pilot instantiation of the state-trajectory concern formalized by Orogat and Mansour (2026): three stores that differ in retrieval strategy fail the same governance subset when the required envelope is absent.

:::zh

表 18 给出了核心实验结果，解读的关键全在“义务”这一列。作为参考上界的受治理归约器拿满了全部十五项义务，证明这些治理义务在测试框架内完全可解，而无记忆下限则一项也未能满足。最耐人寻味的现象在于：三套原始文本存储系统不约而同地停在 $7/15$，一分不多，一分不少。它们顺利拿下的全是可以化约为*语义回忆*的义务（比如某条取值是否声明过删除，某条指令是否曾被标记隔离，某个活跃条目的当前文本状态是什么），只要阅读器模型够聪明，单靠阅读历史文本就能把这些信息推出来。而它们集体栽跟头的，则是那些必须靠专门维护*治理状态*才能兑现的义务：在权限吊销后报出当前的权限纪元，拦截依赖过期权限或不可信指令的任务，主动呈报多方冲突，以及登记外部动作的回滚台账。在受测配置下，这些失分项全都与检索能力无关，所以无论换成按新近度截取，全上下文平铺还是稠密向量检索，分数都纹丝不动。上下文里并不缺原始信息，真正的病根在于这类纯文本存储压根没有开辟专门的字段，去安放权限纪元，隔离状态，冲突记录与回滚台账。这组试点把 Orogat and Mansour (2026) 从理论上形式化的“状态轨迹忧虑”变成了直观的实验切片：只要底层缺少必需的治理包络，检索策略再怎么换花样，也会在同一批治理检查面前整齐划一地败下阵来。
:::

:::annotation

表 18 里有两个数字最耐人寻味。一是朴素追加，全上下文和向量 RAG 在正向义务上同拿 7/15：哪怕把全部历史一字不漏塞进上下文，没有专门的治理字段，照样答不出权限纪元与回滚台账。二是做事实抽取的 Mem0 反而跌到 3/15：把对话压成干净的事实三元组时，顺手把来源，隔离标记和权限边界这些包络信息全削没了，治理得分自然比存原始文本还低。
:::

:::figure

![Figure 7](./images/always-on-agents/fig-07.png)

Figure 7: The Always-On Evaluation Protocol (AOEP). Each episode is a typed event stream; outcome-revealing fields are stripped before a system under test consumes it; the system answers neutral probes; a validator recomputes the invariants itself and scores against an oracle. Obligation pass (positive duties a system must actively meet) is reported separately from negative-invariant pass (no-leakage checks, which a system that stores nothing satisfies vacuously), so recall and governance are scored on different axes.

:::zh
图 7：顺着从左到右的数据流看评测如何防作弊：类型化事件流先剥掉会剧透标准答案的字段再喂给被测系统，系统在末尾回答中性探针，外部校验器独立重算状态快照并与真值比对。右下角特意把“正向义务通过”和“负向不变量通过”拆成两张成绩单，防止什么都不存的空系统靠“零泄漏”刷出高分。
:::
:::

## 研究前沿与开放问题（Research frontiers and open problems）

:::bi

The preceding parts establish a diagnosis, not a celebration. Across the $N{=}435$ coded corpus, the works we examined have learned how to accumulate state and how to retrieve it: substrates, write pipelines, retrieval rankers, consolidation schedules, and skill libraries are well studied and heavily benchmarked. They are less developed on how to *govern* state once it persists. The two thinnest cells in the coding scheme are the governance axes most tied to consequential state: only $27/435$ works expose any rollback mechanism, and authority is the rarest of the six state axes at $72/435$. Every part of this survey reported the same pattern under a different name. P1 finds almost no foundational work on formal authority structure and zero on state recovery after corruption; P3 has zero works that directly address rollback and only two that address audit lineage; P5 states its deletion and rollback semantics abstractly because the mechanistic literature to ground them does not yet exist; P6 lacks formal consistency theory for shared mutable state; P7 lists almost all of its weak cells as “no benchmark exists” for the very governance properties the thesis prioritizes. The agenda is broader than retrieval accuracy alone: it is the work of converting an accumulate-and-retrieve framing into a govern-over-a-lifecycle framing.

:::zh

前文各章拼出的是一份冷静的病灶诊断，远非一场庆功宴。在 $N{=}435$ 篇编码文献中，整个领域对于“如何积累状态”与“如何检索状态”已经研究得相当透彻：存储基底，写入流水线，检索排序器，整合排程与技能库百花齐放，配套基准测试也极为繁荣。相比之下，状态一旦跨会话留存下来，究竟该如何*治理*，相关探索却依然滞后。编码矩阵里最单薄的两个格子，偏偏对应着现实后果最重的两条治理轴：整批文献里仅有 $27/435$ 提供了某种回滚机制，而授权则是六条状态轴中最冷门的一条，仅占 $72/435$。整篇综述的各个部分其实都在用各自的术语报告同一种失衡。P1 几乎找不到关于形式化授权结构的奠基工作，涉及污染后状态恢复的更是挂零。P3 直接处理回滚的文献为零，涉及审计谱系的仅有两篇。P5 只能抽象地陈述删除与回滚语义，因为底下还缺乏能够托住它们的机制文献。P6 缺少针对共享可变状态的形式化一致性理论。P7 盘点出的薄弱格几乎清一色写着“尚无对应基准”，而那些空白格恰恰对应着本文反复强调的核心治理性质。由此引出的研究议程早已跳出单纯提升检索准确率的范畴，它的核心任务是把整个领域的思维框架从“只管积累与检索”切换到“贯穿全生命周期的治理”。
:::

:::bi

Table 21: The five frontier programs, the quantified corpus gap each targets, the closest current anchors in the corpus, and the open instrument each program needs. The recurring pattern is that mechanisms exist as point solutions while the measurement and the cross-axis composition are absent.

| **Program** | **Corpus gap** | **Closest anchors** | **Missing instrument** |
| --- | --- | --- | --- |
| Lifecycle-complete evaluation | Rollback $27/435$; recovery never measured | Chang and Geng (2025), Zheng et al. (2026d) | Recovery-success and recovery-cost metrics on hosted systems |
| Controlled compounding | Consolidation drops retrieval handles; contagion has no safe threshold | Kang et al. (2026), Liu et al. (2026g) | Write-acceptance gate keyed to later addressability |
| Authority, privacy, deletion, cross-surface | Authority $72/435$; no single-policy cross-surface benchmark | Lahjouji and Colaco (2026), Shah et al. (2026) | One agent, all surfaces, one declared policy |
| Shared-memory governance | No distributed rollback; revocation cascades unmodeled | Ren et al. (2026b), Zhu et al. (2026a) | Authority-scoped rollback of tool-originated state |
| Adjacent-discipline bridging | Governance axes thin in every part | Park (2026), Parakhin (2026a) | Native correctness calculi imported, not re-derived |

:::zh

表 21：五项前沿研究计划，各自瞄准的量化语料缺口，当前语料中最接近的锚点工作，以及亟待补齐的测量或控制工具。五条路线呈现出同一种规律：局部的点状机制已经零星出现，唯独系统性的度量工具与跨轴组合依然缺位。

| **研究计划** | **语料缺口** | **最接近的锚点** | **缺失的工具** |
| --- | --- | --- | --- |
| 生命周期完整的评测 | 回滚仅 $27/435$，恢复从未被直接测量 | Chang and Geng (2025), Zheng et al. (2026d) | 线上托管系统的恢复成功率与恢复开销指标 |
| 受控复利 | 整合过程丢弃检索句柄，记忆传染缺乏安全阈值 | Kang et al. (2026), Liu et al. (2026g) | 以日后可寻址性为准入条件的写入门控 |
| 授权，隐私，删除与跨界面隔离 | 授权仅 $72/435$，尚无单策略跨界面基准 | Lahjouji and Colaco (2026), Shah et al. (2026) | 覆盖单智能体全部数据界面的统一声明式策略基准 |
| 共享记忆治理 | 缺乏分布式回滚，权限吊销级联尚未建模 | Ren et al. (2026b), Zhu et al. (2026a) | 针对工具派生状态的按授权作用域回滚机制 |
| 相邻学科桥接 | 各部分的治理轴普遍单薄 | Park (2026), Parakhin (2026a) | 直接引入相邻学科的原生正确性演算，告别重复造轮子 |
:::

## 结论（Conclusion）

:::bi

This survey began from a simple distinction: an agent that carries state across tasks is not the same kind of system as one that resets. The episodic assistant that answers a question and forgets it can be wrong without making the error durable. The always-on agent inherits what it wrote yesterday. Its competence and its liabilities both compound, and the substrate that lets it carry knowledge forward is the same substrate that lets a stale preference, a poisoned trace, or a lapsed permission govern an action taken months later. Such a system should be analyzed as *persistent state*, not memory alone: retrievable memory plus task ledgers, permissions, tool and credential state, standing commitments, provenance records, shared and social state, and trigger conditions, with external commitments treated as part of the accountability surface because they must remain traceable to the state that authorized them. Memory is the most studied component of that union, but treating the whole as memory hides the governance obligations that make always-on agents distinct.

:::zh

本综述始于一道朴素的分水岭：跨任务携带状态的智能体，与每次任务结束就重置清空的智能体，从根子上就属于两类截然不同的系统。答完一道题就彻底失忆的单回合助手哪怕犯了错，错误也不会沉淀为长期包袱。常驻智能体却必须日复一日地继承自己昨天写下的记录。它的本领与它的历史债务一同滚雪球式地累积，而那层帮它把知识带向未来的物理基底，同样也能让一条过期的偏好，一段遭投毒的轨迹或一份早已失效的权限潜伏数月，再去左右日后的某次实际行动。剖析这类系统必须以*持久状态*为单位，绝不能只盯着狭义的记忆：除了可检索的记忆条目，还要把任务台账，权限，工具与凭据状态，长期承诺，溯源记录，共享与社交状态以及触发条件一并纳入视野，同时将外部承诺视作系统问责面的一环，确保任何外部副作用都能倒查回当初放行它的内部状态。在这整套并集里，记忆固然是被研究得最透的一块，可一旦把整个系统简化为“记忆”，那些真正让常驻智能体区别于单回合系统的治理义务就会被遮蔽得一干二净。
:::

:::bi

One objection to our thesis is that the problem is already dissolving on its own, that million-token context windows and stronger retrieval will let an agent read all of its past and behave correctly. The corpus does not support this. Larger context and retrieval address a reading problem, and the governance gaps we document are not reading problems. Long-context studies show that capacity is not comprehension: models underuse information placed in the middle of a long window even when it is present (Liu et al., 2023), and retrieval quality decomposes into noise robustness, rejection, and faithfulness failures that more tokens do not fix (Chen et al., 2023). Even granting perfect recall, retrieval answers “what did I record?” It does not answer the four questions an always-on agent must answer to act safely: what *should* persist, which competing record is *authoritative*, how a record should *change* when new evidence contradicts it, and how a user can *revoke* it. These are decisions about authority, mutability, and recoverability, not about context length.

:::zh

针对本文的核心论点，常有人提出一种乐观的反驳：随着百万 token 级上下文窗口与更强检索器的普及，智能体迟早能把自己的全部过往一字不漏地读进窗口并自动做出正确决策，上述治理难题自然会迎刃而解。然而现有文献的实证结果并不支持这种设想。扩充上下文窗口与强化检索解决的终归是“读取问题”，而本文记录在案的治理缺口压根就不属于读取问题。长上下文研究早已证明，装得下绝不等于用得对：哪怕关键信息明明白白摆在长窗口中段，模型也会出现严重的利用不足 (Liu et al., 2023)。检索质量同样会拆解为抗噪性，拒答能力与忠实度三类独立瓶颈，单靠堆砌 token 数量无济于事 (Chen et al., 2023)。退一步讲，就算假设模型拥有分毫不差的完美召回，检索能回答的也仅仅是“我过去记下了什么？”，却依然回答不了常驻智能体在安全出手前必须裁决的四个问题：哪些内容*应当*留存，多条记录打架时哪一条才算*权威*，新证据推翻旧记录时状态该如何*演进*，以及用户发话后该如何彻底*撤销*。这四件事关乎授权，可变性与可恢复性的制度裁决，与上下文窗口有多长毫无关系。
:::

:::annotation

这段正面回应了“上下文窗口扩到一千万 token 是不是就不需要记忆系统了”。哪怕模型拥有过目不忘的完美召回，把过去三年每一轮对话都摆在眼前，它依然要在行动前裁决四件事：哪条旧话还算数，两条记录打架听谁的，哪份授权已经过期，哪条隐私用户要求彻底抹掉。上下文窗口只能帮模型“看见”历史，裁决历史靠的仍是显式的治理规则。
:::

:::bi

The corrective is to treat persistent state as a measured, governed lifecycle rather than as a passive log to be searched. Concretely, this means three commitments that recur across every part of this survey and that we summarize in Table 22. State decisions must be made explicitly rather than implicitly: a system should decide what to admit at the write boundary, what authority a record carries, and under what scope it may act, instead of accumulating everything and hoping retrieval sorts it out. State must remain attributable and recoverable: provenance must survive consolidation so that a corrupted or superseded record can be located, quarantined, and undone, rather than dropped the moment a summary scores well on aggregate recall. And state governance must be evaluated rather than asserted: a system that claims to honor deletion, respect authority, or support rollback should be driven through perturbations that exercise those obligations and scored on whether the obligations actually hold.

:::zh

真正的破局之道，是把持久状态当作一条可度量，受治理的完整生命周期来建设，告别“只管往被动日志里攒，指望检索时再大海捞针”的粗放思路。落到工程实践上，这对应着贯穿全文各章，并在表 22 中集中汇总的三项基本承诺。第一，状态裁决必须显式化：系统应当在写入边界上就明确敲定准入标准，记录所携授权及其合法的作用域，切忌不管三七二十一全盘入库，再指望检索器替它善后。第二，状态必须始终可追责，可恢复：溯源谱系必须挺过有损整合活下来，确保任何遭污染或已被取代的旧记录都能被精准定位，隔离并连根撤销，绝不能只因某份压缩摘要在宏观召回率上得分好看，就顺手把来源链路丢进垃圾桶。第三，状态治理必须靠实测验证，拒绝口头宣告：任何自称支持彻底删除，严守权限边界或具备回滚能力的系统，都应当拉到专门构造的扰动流下走一遭，直接按这些治理义务在压力下是否真正兑现来打分。
:::

:::bi

Table 22: The shift the survey argues for: from persistent state as an accumulated log to persistent state as a governed lifecycle. Each row pairs the prevailing framing with the operational alternative and the corpus signal that motivates it.

| **Question** | **Accumulate-and-retrieve framing** | **Governed-lifecycle alternative** |
| --- | --- | --- |
| What persists? | Store the interaction, retrieve later. | Admit at the write boundary under a scope and authority label. |
| Which record rules? | Most similar to the query. | The authoritative one; authority only narrows. |
| How does it change? | Append a newer entry. | Mutate with provenance; mark prior truth superseded. |
| How is it revoked? | Delete the row, hope it propagates. | Cascade deletion, verify completeness, log the rollback. |
| How do we know? | Downstream task accuracy. | Score the governance obligation directly. |

:::zh

表 22：本综述呼吁的范式转换：从将持久状态视作被动堆积的日志，转向将其作为受治理的生命周期来管理。每一行都将当前主流的“积累与检索”思路同可落地的“受治理生命周期”方案一一对照。

| **核心问题** | **积累与检索框架** | **受治理生命周期方案** |
| --- | --- | --- |
| 什么得以留存？ | 把交互统统存起来，留待日后检索。 | 在写入边界按作用域与授权标签审核准入。 |
| 哪条记录说了算？ | 与当前查询向量最相似的那条。 | 具备当前有效授权的那条，且授权只窄不宽。 |
| 状态如何演进？ | 直接追加一条时间戳更新的记录。 | 带着溯源谱系做变更，将旧值显式标记为已取代。 |
| 状态如何撤销？ | 删掉主表里那一行，指望下游自动消散。 | 执行级联删除，核验擦除完备性，并登记回滚台账。 |
| 如何验证奏效？ | 只看下游任务的最终回答准确率。 | 直接针对各项治理义务本身打分。 |
:::

:::bi

The stakes rise rather than fall as deployments mature. The failure modes we cataloged compound under continual operation: poisoning persists across sessions once it enters durable state (Xie et al., 2026c), alignment can degrade as the agent accumulates and reuses its own outputs (Shao et al., 2025), and in shared settings evaluator bias in stored trajectories propagates to future agents with no safe contamination threshold even under oracle consolidation (Liu et al., 2026g). None of these is a single-turn prompt problem, and none is solved by reading more of the past more reliably. They are governance problems in the sense this survey defines: failures of authority, scope, provenance, and recoverability over a lifecycle that the works we coded instrument mostly on its forward arc. We read our main numbers, 27 of 435 works with any rollback and 72 of 435 touching authority, not as a verdict on the quality of existing work, which is often excellent within its frame, but as a map of where the frame stops. Persistence is not a minor feature of always-on agents to be handled by a larger window or a sharper index. It is the property that makes these systems both more capable and more accountable than their episodic predecessors, and treating it as a measured, governed lifecycle, deciding what should persist, which state is authoritative, how it changes, and how it is revoked, is the operational agenda the next generation of always-on agents will be built and judged against.

:::zh

随着常驻系统走向深水区，治理缺位带来的风险只会愈发高企。我们在文中编目的各类失效模式，在长期连续运行下都会呈复利式恶化：投毒载荷一旦混入持久状态就会跨会话长期潜伏 (Xie et al., 2026c)，智能体在不断累积并复用自身历史输出的过程中会出现对齐退化 (Shao et al., 2025)，而在多智能体共享环境里，历史轨迹中夹带的评估者偏差会一路传染给后续接入的智能体，哪怕引入标准答案辅助整合，也找不到一条绝对安全的污染阈值 (Liu et al., 2026g)。这些顽疾没有一个是单轮提示词工程能兜住的，也没有一个能靠“把历史读得更全，找得更准”来化解。它们彻头彻尾属于本文所界定的治理难题：授权，作用域，溯源与可恢复性在整个生命周期上的失守，而现有文献绝大多数只给这条生命周期的前向弧装上了仪表盘。文中反复提及的几组核心数字（435 篇文献中仅 27 篇触及回滚，435 篇中仅 72 篇涉及授权），绝非对既有研究质量的苛责，那些工作在各自设定的问题边界内往往相当出色，这组数字真正标出的是现有研究框架止步的边界。持久性绝非单靠扩充上下文窗口或升级检索索引就能顺手打发的小特性。正是这一属性，赋予了常驻智能体远超单回合前辈的强大能力，也给它套上了沉甸甸的问责重担。将持久状态视作一条可度量，受治理的完整生命周期，明确裁决什么应当留存，哪条状态具有权威，状态如何演进，又该如何撤销，将成为构建与评判下一代常驻智能体的核心工程议程。
:::
