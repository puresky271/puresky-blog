---
title: 'BiGym 2.0：人形机器人做家务，来比比看谁更能写出那套程序'
description: '帝国理工的 BiGym 2.0 把一台 Unitree G1 放进 MuJoCo 的 20 个家务任务里，让编码代理看一条真人演示，写一个 policy.py，再在 100 个隐藏种子上评分。这篇是项目页的中英对照收录，含论文成果一节。'
pubDate: 2026-11-05
author: 'Zexi Zhang 等'
category: curation
tags: ['具身智能', '评测', 'Agent', '强化学习']
featured: true
draft: true
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是伦敦帝国理工学院（Imperial College London）BiGym 2.0 项目页的中文翻译与导读，原文在 <https://bigym2.github.io/>，作者是 Zexi Zhang，Zecheng Zhu，Zidong Chen，Zulkhuu Tuya 和 Stephen James，配套论文见 [arXiv:2610.07594](https://arxiv.org/abs/2610.07594)。项目页没有写发布日期，只说榜单更新于 2026 年 10 月 31 日。页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文最能说明问题的是几块可以点的图：首屏把机器人演示实时渲染成字符和点阵，榜单能切 20 个任务，9 个 core，11 个 extended 三种口径，任务盘指着哪个任务就播哪段真人演示，成本图能指着读数值，程序浏览器能翻出每次 session 交上来的程序。这五块都按原站的行为做成了站内组件，其余以文字和表格呈现。论文成果集中写在“论文成果”一节，只摘摘要，主结果表和结论，不逐段翻译论文全文。四张图用的是论文原图，图下加了一行中文小字。注解是我的编辑判断，不属于原文。版权归原作者所有，译文只作学习交流之用。

**TL;DR**

- 20 个家务任务，一台 Unitree G1，两条腿交给冻结的 GR00T-WBC，被测的只有上半身。
- 学出来的策略和编码代理同场比：VLA 微调（π0.5）九任务均分 75.0 最高，Claude Opus 5.5 和 GPT-6 Astra 写程序拿到 61.0 和 64.5，压过所有 demo-driven RL。
- 代理只看一条真人演示，拿到 101,000 个环境步，交一个 `policy.py`，在 100 个隐藏种子上评分。
- 三个任务每个种子初态相同，程序只能拿 0 或 100。
- cross-workspace stacking 仍然没解，π0.5 在 pick-box 上只有 19%。

:::animation bigym-film
:::

## 这个基准测什么（What BiGym 2.0 measures）

:::bi
BiGym 2.0 evaluates AI agents on their ability to control a humanoid robot. For each household task, an agent watches one demonstration and writes the program that drives a Unitree G1. Its score is the share of hidden episodes that program completes.

:::zh
BiGym 2.0 评测 AI 智能体控制人形机器人的能力。每个家务任务里，智能体看一条演示，写出驱动 Unitree G1 的程序。它的分数是这套程序跑完的隐藏回合占比。
:::

:::figure
![图 1：20 个家务任务](./images/bigym2/fig-01.jpg)

**Figure 1:** BiGym 2.0: Auditing learned and agent-developed household manipulation on a walking humanoid. The suite evaluates data-driven policies and coding agents across 20 tasks spanning reaching, tabletop, dishwasher and kitchen-counter scenes. Tasks test hand choice, bimanual coordination, articulated fixtures, multi-object transport and cross-workspace block stacking. Human demonstrations, learned policies and agent programs execute through the same frozen whole-body controller, evaluating manipulation reliability under dynamic balance and footfall disturbances.

:::zh
图 1：20 个任务按场景排成四行，从上到下是伸手，桌面，洗碗机和厨房台面。看同一台 G1 在“站着伸手”和“弯腰往洗碗机里放盘子”之间的姿态跨度，也看每格底下的任务名。这张图是全文唯一能一眼看清任务集合的一张。
:::
:::

:::figure
![图 2：每个任务 reset 后和最后一帧的样子](./images/bigym2/fig-04.jpg)

**Figure A1:** The 20 tasks of BiGym 2.0. MuJoCo renders of one demonstration per task: the state after reset (left) and the final frame (right). The coloured rule above each pair marks the scene family, as in Fig. 1. The final frame marks the success criterion: the 5 cm tolerance sphere for reaching, the object's recorded displacement for placement tasks and the measured joint extent against its threshold for articulated fixtures. Table A1 gives the full predicates.

:::zh
图 2：每个任务一对画面，左边是 reset 之后，右边是最后一帧，彩色横线标场景家族。最后一帧就是成功判据的样子：伸手任务看 5 厘米容差球，放置任务看物体走出去多远，带铰链的家具看关节走到哪。20 个任务的判据都要保持 1 秒才算数。
:::
:::

:::bi
A Unitree G1 with two-finger grippers performs 20 household tasks in MuJoCo. A frozen lower-body controller, NVIDIA's GR00T-WBC, runs inside every environment step and keeps the robot balanced and walking. Your policy commands the base, the 14 arm joints and the two grippers. Each task has 60 human VR demonstrations. Learned policies and coding agents are scored on the same 100 evaluation seeds.

:::zh
一台带二指夹爪的 Unitree G1 在 MuJoCo 里做 20 个家务任务。冻结的下肢控制器 NVIDIA GR00T-WBC 走在本环境的每一步里，负责让机器人站稳和走路。被测策略只指挥底盘，14 个手臂关节和两个夹爪。每个任务有 60 条真人 VR 演示。学出来的策略和编码代理在同一批 100 个评测种子上评分。
:::

:::figure
![图 3：从 BiGym 到 BiGym 2.0](./images/bigym2/fig-02.jpg)

**Figure 2:** From BiGym to BiGym 2.0. (a) BiGym offers full-joint control, but its released demonstrations use the mobile-bimanual mode shown: four increments set the H1 pelvis pose while the legs follow height-conditioned kinematic trajectories. (b) BiGym 2.0 interprets four commands as velocity and height references. Frozen GR00T-WBC policies [1] map them to leg and waist joint targets at 50 Hz, with the feet supporting the robot; G1 also supports torso pitch. The same controller governs VR demonstration collection, evaluation and reset. Dashed boxes mark three onboard cameras and their recorded views from one dual-reaching episode at the policy input resolution, 84×84. The panels are not to relative scale. Arm and gripper commands are omitted.

:::zh
图 3：左边是旧的 BiGym，H1 的腿按高度播放动画轨迹，骨盆位置靠四条指令直接摆。右边是 BiGym 2.0，四条指令变成速度和高度参考，冻结的 GR00T-WBC 把它们翻译成腿和腰的关节目标，脚真的撑住身体，G1 还能低头俯身。虚线框标出三路机载相机，右图是同一段双手伸手演示在这三路里录到的 84×84 画面。两边不是同一比例，手臂和夹爪指令没画。
:::
:::

:::annotation
下肢是所有人共享的黑盒，这一点决定了榜单该怎么读。学出来的策略，写程序的 agent，采演示的真人，都跑同一个 GR00T-WBC，分数差异因此只反映上半身那十六个自由度的差别，不用为走路的不确定性买单。代价是摔倒算失败，这是所有方法共同的隐性天花板。
:::

:::bi
The suite provides 60 successful demonstrations for each of the 20 tasks, 1,200 episodes in total. Each non-VLA learned-policy checkpoint is evaluated on 100 episodes with seeds 620 000+i.

:::zh
20 个任务每个给 60 条成功演示，一共 1,200 条。非 VLA 的学出来的策略，每个 checkpoint 在 100 个种子上评测，种子是 620 000+i。
:::

:::annotation
100 个评测种子是公开写死的 620000 到 620099，只对 agent 隐藏。dishwasher_close，wall_cupboard_open，wall_cupboard_close 三个任务每个种子的初态都一样，所以程序只能拿 0 或 100，榜单里那几列整齐的 0 和 100 不是巧合。
:::

## 榜单（Leaderboard）

:::bi
Mean success over the 9 core tasks, 3 independent sessions per task, 100 hidden episodes per final program. Updated 31 October 2026.

:::zh
9 个 core 任务的平均成功率。每个任务 3 个独立 session，每个最终程序跑 100 个隐藏回合。榜单更新于 2026 年 10 月 31 日。
:::

:::animation bigym-board
:::

:::bi
Each reasoning effort we ran is its own bar. On the 9 core tasks the learned policies of the paper join the board, trained on 60 demonstrations per task where an agent sees one; their numbers are the paper's. Cost is every token of a session at the provider's list price.

:::zh
同一个模型跑了几档思考强度就是几根柱子，不替你挑一档。9 个 core 任务的视图里，论文里的学出来的策略也上榜，它们每任务用 60 条演示训练，而 agent 只看一条。这几个数字取自论文。成本按服务商报价单逐 token 计。
:::

:::bi
dishwasher_close, wall_cupboard_open, wall_cupboard_close start from the same state on every seed, so a program scores 0 or 100 on them. Randomised starts come with the next version of the board.

:::zh
关洗碗机，开壁橱，关壁橱三个任务每个种子的初态都一样，所以程序在上面只能拿 0 或 100。随机初态要等下一版榜单。
:::

:::annotation
榜单和论文的 Table II 差一点点：在线榜单给 Opus 5.5 六十点六，Astra 六十四点五，论文表里是六十一和六十五。差在重打分的口径，读的时候以论文为准，榜单当补充。
:::

### 逐任务成功率（Success by task）

:::animation bigym-tasks
:::

:::annotation
任务盘上的每一项都贴着一段真人 VR 演示，指上去就在中间的圆里播，按住不放会加速到两到四倍。这张表说明均分掩盖了什么：π0.5 总分最高，但在 pick-box 上只有 19，ACT 是 61，Opus 5.5 是 71。
:::

### 成本曲线（A score is a point on a cost curve）

:::bi
Mean success against what one session costs at list price, log scale. A model run at several efforts is one line through its points.

:::zh
纵轴是平均成功率，横轴是跑一次 session 在服务商报价单上的花费，对数刻度。同一个模型跑了几档思考强度，就是一条线穿过的那几个点。
:::

:::animation bigym-cost
:::

:::annotation
成本是 token 账单，不是算力账单。DeepSeek V4.1 Flash 一 session 六毛四，GPT-6 Astra 十块九五，Claude Opus 5.5 十四块五五，Claude Sonnet 5.5 二十六块二九。最贵的单次 session 是三十一块二三，最便宜的六毛四，差了近五十倍，而分数只差五十一点九个百分点。
:::

## 每个程序，每个种子（Every program, every seed）

:::bi
What an agent hands in is a program you can read. Pick a cell to see the one a session submitted and replay it on each hidden seed: Claude Opus 5.5 and GPT-6 Astra on the 9 core tasks, as in the paper. More of both on [the paper's page](https://bigym2.github.io/paper/#explorer).

:::zh
智能体交出来的是一段能读的程序。选一个格子，看某次 session 提交的那一版，再在每一个隐藏种子上回放它。这里是 Claude Opus 5.5 和 GPT-6 Astra 在 9 个 core 任务上的结果，和论文一致。两人的更多程序在论文页上。
:::

:::figure
![图 4：agent 从一条演示开始写程序](./images/bigym2/fig-03.jpg)

**Figure 3:** Coding-agent development from a single demonstration. The agent receives three synchronised camera views of one human demonstration and onboard camera access, developing a program under the strict interface within a shared interaction budget. The frozen program is evaluated on 100 hidden seeds, with ten episodes repeated to check deterministic outcomes.

:::zh
图 4：中间那条进度条就是 101,000 步的预算。agent 拿到一条演示的三路画面和机载相机，在 strict 接口下写程序，写的过程本身要花环境步。程序冻结后跑 100 个隐藏种子，其中前十集重跑一遍查确定性。
:::
:::

:::bi
The task statement is one sentence naming what to do and to which object. It says nothing about positions, sizes or the success tolerance. The demonstration is one human demo rendered from the robot's own cameras (head, left_wrist, right_wrist) at 84×84 and 25 fps. There is no outside camera, for the agent or for the policy. The budget is 101,000 environment steps. A reset costs 200 steps (the controller warm-up) plus the steps of the episode. The server refuses the step that would exceed the budget.

:::zh
任务说明只有一句话，讲清做什么，对哪个物体，不含位置，尺寸和成功容差。演示只有一条，用机器人自己的三路相机渲染，84×84，25 fps。agent 和策略都没有外部相机。预算是 101,000 个环境步，一次 reset 记 200 步（控制器预热）加这一集的步数，超出预算的那一步会被服务器拒绝。
:::

:::annotation
把这段和榜单对照着看：agent 只有一条 84×84 的演示，学出来的策略每任务有六十条，两者上同一张 9 core 榜。这条不对称是论文刻意保留的，它想知道“只给一条示范”的程序能到什么位置，而不是把 agent 的示范补齐到和学出来的策略一样多。
:::

:::bi
The score is the success rate over the 100 hidden seeds of the [evaluation protocol](https://bigym2.github.io/docs/official_configuration.html#evaluation-protocol). Nothing the agent reports about its own performance is used. A fall is a failure. After the 100 evaluation episodes, the first 10 are rerun (`--spot-check N`) and must give identical per-episode success. The policy is hand-written control with no learned component: no network, regression or lookup table fitted to data. The policy may use numpy, scipy, OpenCV, pillow and the standard library.

:::zh
分数是这套程序在 100 个隐藏种子上的成功率，agent 自报的任何性能都不采信。摔倒算失败。100 集跑完把前 10 集重跑一遍，逐集结果必须完全一致。策略必须是手写控制，不许有学出来的成分，不许有拟合数据的网络，回归或查找表。允许用 numpy，scipy，OpenCV，pillow 和标准库。
:::

:::animation bigym-explorer
:::

:::annotation
这里和原站有出入。原站每个种子点开是一段 viser 三维回放，站内没有这个播放器，于是改成一条可以拖的时间轴：播放时按 trace 点亮程序里正在执行的那几行，阶段条标出这一段跑的是哪个函数。种子网格，阶段，行高亮，分数和“这枚种子没有录制回放”都是原站的逻辑。
:::

## 程序说明了什么（What the programs show）

:::bi
From reading all 420 final programs.

:::zh
读完全部 420 份最终程序之后。
:::

### 它记得这台机器人（It remembers the robot.）

:::bi
21 of its 27 core programs solve inverse kinematics with arm offsets it never measured, equal to the model file's.

:::zh
它的 27 个 core 程序里有 21 个用自己从没测过的连杆偏置换算逆运动学，数值和模型文件里的对得上。
:::

`0.10022 · 0.24778 · 0.1032 · 0.080518 m`

### 但它记的是公开的那台 G1（But the public G1, not this one.）

:::bi
Both write 0.046 m for the last wrist link. The G1 here has 0.051 m, a value no session ever saw.

:::zh
两个 agent 给最后一段腕连杆都写了 0.046 米。这里这台 G1 是 0.051 米，这个值没有任何一次 session 见过。
:::

`remembered 0.046 m · simulated 0.051 m`

### 它从像素干活（It works from pixels.）

:::bi
24 of its 27 core programs servo on wrist-camera pixel errors with scripted poses. The 4 of 60 that use its remembered arm geometry score 0–15%.

:::zh
它的 27 个 core 程序里有 24 个靠着腕部相机的像素误差做伺服，姿态是脚本写死的。60 份里只有 4 份用上了它记住的手臂几何，分数在 0 到 15%。
:::

### 高思考强度反而早收工（At high effort it stops early.）

:::bi
Its sessions last 16 minutes against GPT-6.1 Sol's 46. At max effort its core score goes from 28.6% to 49.1%.

:::zh
它的 session 平均 16 分钟，GPT-6.1 Sol 是 46 分钟。拉到最高思考强度，它的 core 分数从 28.6% 升到 49.1%。
:::

:::annotation
四条里最值得看的是第二条：0.046 和 0.051 的差。前者是 Unitree 公开的 G1 运动学，后者是仿真里这台。模型把公开参数背了出来，于是“看起来懂机器人”和“真的看过这台机器人”分开了。这恰好是榜单想测，却又最难自动化的一部分。
:::

## 论文成果（What the paper reports）

:::bi
Humanoid household manipulation requires the arms to act while the body balances, steps and changes posture. We present BiGym 2.0, an adaptation of BiGym for the Unitree G1 across 20 household tasks using a unified whole-body controller for demonstration and evaluation. The suite provides 60 native human virtual-reality demonstrations per task with synchronised multi-camera views and full-body execution records.

:::zh
人形机器人的家务操作要求手臂动作的同时身体在平衡，迈步，改变姿态。我们提出 BiGym 2.0，把 BiGym 改造成 Unitree G1 上的 20 个家务任务，用同一个全身控制器做演示采集和评测。20 个任务各提供 60 条原生真人 VR 演示，多相机视角同步，带完整全身执行记录。
:::

:::bi
With the same onboard views, proprioception and whole-body controller for every method, vision-language-action fine-tuning has the highest nine-task mean, and agent-developed programs outperform every demo-driven reinforcement learning baseline on this mean and lead on bimanual reaching.

:::zh
所有方法用的机载视角，本体感觉和全身控制器都相同。VLA 微调的九任务均分最高，agent 写出来的程序在这个均分上压过所有 demo-driven RL 基线，并且在双手伸手任务上领先。
:::

| 任务 | π0.5（VLA） | ACT（模仿） | DP（模仿） | CQN-AS（demo RL） | DrQ-v2+（demo RL） | DEAS（demo RL） | Opus 5.5（agent） | Astra（agent） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pick box | 19 | 61 ± 4 | 10 ± 3 | 48 ± 2 | 0 ± 0 | 14 ± 3 | 71 ± 16 | 54 ± 22 |
| Reach multi-modal | 90 | 81 ± 1 | 84 ± 1 | 19 ± 16 | 0 ± 0 | 79 ± 2 | 100 ± 0 | 89 ± 7 |
| Reach dual | 58 | 30 ± 0 | 27 ± 0 | 3 ± 1 | 0 ± 0 | 34 ± 1 | 78 ± 10 | 89 ± 7 |
| Drawer close | 100 | 100 ± 0 | 100 ± 0 | 100 ± 0 | 99 ± 0 | 100 ± 0 | 100 ± 0 | 99 ± 1 |
| Drawer open | 99 | 92 ± 0 | 98 ± 0 | 89 ± 2 | 0 ± 0 | 79 ± 4 | 99 ± 1 | 99 ± 1 |
| Move plate | 65 | 60 ± 1 | 62 ± 4 | 48 ± 3 | 0 ± 0 | 27 ± 3 | 20 ± 2 | 14 ± 11 |
| Move two plates | 68 | 39 ± 0 | 18 ± 4 | 21 ± 3 | 0 ± 0 | 2 ± 1 | 15 ± 4 | 16 ± 11 |
| Dishwasher close | 79 | 93 ± 5 | 51 ± 2 | 78 ± 1 | 0 ± 0 | 27 ± 3 | 33 ± 33 | 100 ± 0 |
| Dishwasher load cups | 92 | 56 ± 3 | 51 ± 0 | 47 ± 7 | 0 ± 0 | 6 ± 2 | 28 ± 27 | 21 ± 4 |
| **Mean** | **75** | **68** | **56** | **50** | **11** | **41** | **61** | **65** |

*表 1：九个代表任务上的成功率（%）。ACT，DP，CQN-AS，DrQ-v2+ 和 DEAS 是三次训练运行的均值加减标准误，每次运行取最后五个 checkpoint，每个 100 回合。π0.5 每任务只跑一次，五个 checkpoint 各 50 回合。两个 coding agent 是三次独立开发 session，程序冻结后各跑 100 回合，误差是 session 之间的标准误。*

:::bi
Vision-language-action fine-tuning attains the highest nine-task mean and leads plate and cup transport; agent-developed programs lead on bimanual reaching, where a program can control each arm separately. Cross-workspace stacking remains open, π0.5 stays low on pick-box, and multi-object transport remains difficult for imitation learning, demo-driven reinforcement learning and agent-developed policies.

:::zh
VLA 微调拿到最高的九任务均分，领先盘子和杯子的搬运。agent 写出来的程序在双手伸手任务上领先，因为程序可以分别控制两条手臂。cross-workspace stacking 仍然没解，π0.5 在 pick-box 上偏低，多物体搬运对模仿学习，demo-driven RL 和 agent 程序都难。
:::

:::annotation
这张表最容易被误读的是误差棒。Opus 5.5 在关洗碗机上是 33 ± 33，Astra 在 pick-box 上是 54 ± 22，这不是训练不稳定，而是三个 session 里常常只有一个找到了能用的策略（100 / 0 / 0）。所以 agent 那一列读的是“开发阶段多大概率找到可用程序”，不是“这套方法的上限”。
:::

## 常见问题（Questions）

### 这些数字和论文是什么关系？（How do these numbers relate to the paper?）

:::bi
The paper reports the 9 core tasks: the “9 core” view of the board, where the learned policies sit beside the agents. The live board adds 11 extended tasks and models released since.

:::zh
论文报的是 9 个 core 任务，对应榜单里“9 core”那档，学出来的策略和 agent 并排。在线榜单又加了 11 个 extended 任务和之后发布的模型。
:::

### 为什么有的模型出现两次？（Why are some models shown at two efforts?）

:::bi
Smaller models gain a lot from a higher reasoning effort, frontier models little. We show every effort we ran and join them, rather than pick one.

:::zh
小模型把思考强度拉高能涨不少，前沿模型涨得少。我们跑了哪几档就都列出来，用线连起来，不替你挑一档。
:::

### agent 拿到了什么？（What does an agent get?）

:::bi
One demonstration video, the robot's head and wrist cameras at 84×84, its joint readings, and 101,000 simulation steps per session. No inverse kinematics, no calibration, no external camera.

:::zh
一条演示视频，机器人头部和两个手腕的 84×84 相机，关节读数，以及每个 session 101,000 个仿真步。没有逆运动学，没有标定，没有外部相机。
:::

### 怎么加一个模型？（How do I add a model?）

:::bi
Email its results on every task, with the final programs and session logs, to jesse.zhang25@imperial.ac.uk. We re-score the programs on our evaluation seeds before listing them, and can run a model ourselves if you prefer: all 20 tasks, 3 sessions each, in its maker's own coding harness.

:::zh
把每任务的结果，最终程序和 session 日志发邮件到 jesse.zhang25@imperial.ac.uk。上榜前我们会在自己的评测种子上重新打分，也可以由我们代跑：20 个任务，每任务 3 个 session，在它自己家的 coding harness 里跑。
:::

## 引用（The paper）

:::bi
BiGym 2.0: Benchmarking Learned and Agent-Developed Policies for Humanoid Household Manipulation. The paper's own page has the demonstrations, the agent protocol and every program.

:::zh
BiGym 2.0：Benchmarking Learned and Agent-Developed Policies for Humanoid Household Manipulation。论文页里有演示，agent 协议和全部程序。
:::

```bibtex
@article{zhang2026bigym2,
  title   = {BiGym 2.0: Benchmarking Learned and Agent-Developed Policies for Humanoid Household Manipulation},
  author  = {Zhang, Zexi and Zhu, Zecheng and Chen, Zidong and Tuya, Zulkhuu and James, Stephen},
  journal = {arXiv preprint arXiv:2610.07594},
  year    = {2026}
}
```

:::bi
BiGym 2.0 builds on [BiGym](https://github.com/NeuracoreAI/bigym) by Chernyadev et al. The lower-body controller is NVIDIA's [GR00T-WBC](https://github.com/NVlabs/GR00T-WholeBodyControl).

:::zh
BiGym 2.0 建在 Chernyadev 等人的 BiGym 之上。下肢控制器是 NVIDIA 的 GR00T-WBC。
:::
