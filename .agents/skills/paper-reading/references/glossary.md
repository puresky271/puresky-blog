# 术语对照表

论文精读里反复出现的词。开译前先照着定一遍，同一篇里一个词只有一种译法；遇到新词随手补进来，
下次直接复用。**人名、机构名、模型名、数据集名、代码标识符、论文标题一律保留英文**，
中文里首次出现可以在后面加英文括注，之后不再加。

## 模型与训练

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| large language model (LLM) | 大语言模型（LLM） | 首次括注，之后写「大语言模型」 |
| base model | 基座模型 | |
| pre-training / post-training | 预训练 / 后训练 | |
| fine-tuning | 微调 | |
| instruction tuning | 指令微调 | |
| alignment | 对齐 | |
| interpretability | 可解释性 | |
| activation | 激活 | 名词，不要译成「激活值」来回混用 |
| representation | 表征 | |
| feature | 特征 | |
| circuit | 回路 | |
| residual stream | 残差流 | |
| attention | 注意力 | |
| token | token | 不译 |
| vocabulary | 词表 | |
| embedding | 嵌入 | |
| logit | logit | 不译；logit lens 译「logit 透镜」 |
| prompt | 提示词 | |
| context window | 上下文窗口 | |
| chain of thought | 思维链 | |
| scratchpad | 草稿纸 | |
| sampling / temperature | 采样 / 温度 | |
| benchmark | 基准测试 | |
| evaluation | 评测 | |
| ablation | 消融 | |
| baseline | 基线 | |
| ground truth | 标准答案 | 视语境，也可「真值」 |

## 智能体与社会模拟

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| agent | 智能体 | 不要用「代理」；proxy 才是「代理」 |
| generative agents | 生成式智能体 | |
| simulacra | 拟像 | |
| believability / believable | 可信度 / 可信的 | |
| memory stream | 记忆流 | |
| retrieval | 检索 | |
| recency / importance / relevance | 新近度 / 重要性 / 相关性 | 检索打分的三个维度 |
| reflection | 反思 | 名词和动词同形 |
| planning | 计划 | 名词 plan 也是「计划」，模块名一样 |
| affordance | 可供性 | |
| sandbox | 沙盒 | |
| emergent behavior | 涌现行为 | |
| persona | 人设 | |
| inner voice | 内心独白 | |
| avatar | 形象 | |
| dialogue | 对话 | |
| information diffusion | 信息扩散 | |
| coordination | 协调 | |
| relationship memory | 关系记忆 | |
| crowdworker | 众包工作者 | |
| evaluator | 评估者 | |
| seed memory | 种子记忆 | |
| status（物体） | 状态 | |
| action / behavior | 动作 / 行为 | 两个词不要混用 |

## 全局工作空间与意识

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| access consciousness | 通路意识 | |
| phenomenal consciousness | 现象意识 | |
| global workspace | 全局工作空间 | |
| workspace-like | 类工作空间 | |
| broadcast | 广播 | |
| verbal report | 言语报告 | |
| verbalizable | 可言语化的 | |
| Jacobian lens (J-lens) | 雅可比透镜（J 透镜） | 首次中文加括注 |
| logit lens | logit 透镜 | 保持 logit 不译 |
| linearized effect | 线性化影响 | |
| probe | 探针 | |
| steering | 引导 | |
| top-down control | 自上而下的控制 | |

## 统计与实验

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| effect size | 效应量 | |
| standardized effect size | 标准化效应量 | |
| confidence interval | 置信区间 | |
| Kruskal-Wallis test | Kruskal-Wallis 检验 | 检验名保留英文 |
| p-value | p 值 | |
| mean / median | 均值 / 中位数 | |
| standard deviation | 标准差 | |
| within-subjects design | 被试内设计 | |
| pairwise comparison | 两两比较 | |
| rank rating | 排名评分 | |
| TrueSkill | TrueSkill | 评分系统名，不译 |

## 固定译名（专有名词）

| 英文 | 中文 |
| --- | --- |
| The Sims | 《模拟人生》 |
| Smallville | Smallville（不译） |
| Claude / GPT-4 / Llama | 保留原样 |
| Anthropic / OpenAI / DeepMind | 保留原样 |
| Transformer Circuits Thread | Transformer Circuits（保留，首次可加「线程」） |
| arXiv | arXiv |
| UIST / NeuriPS / ICML | 会议名保留缩写 |

## 风格提醒

- 英文那一半一个字都不改：不改时态、不统一拼写、不删长句、不把 `—` 改成 `-`。
- 中文那一半不用分号、顿号、直角引号和破折号；原文的破折号拆成冒号、逗号或另起一句。
- 作者年份引用原样保留英文，包括里面的英文分号，那不是中文标点违规。
- 公式、占位符（`\<name\>`、`[fill in]`）、代码标识符保持原样。
