---
title: 为了让角色不再瞎猜天气，我半年里重写了六代环境感知
description: 从无窗房间里「看到阴天」的幻觉开始，环境感知半年重写了六代。每一代的死法、七种反复出现的失效模式，以及从「求模型别瞎说」到「没证据的话系统不许说」的收束。
pubDate: 2026-10-03
category: world
tags: ['环境感知', '地理', '世界模拟', '上下文工程', '方法论']
---

2026 年 4 月 19 号，乐奈跟我说她看到今天阴天。问题是她那时在一个没有窗户的房间里。

这条幻觉是我这半年全部工作的起点。到 10 月初，「角色怎么感知自己周围的环境」这件事在我仓库里被重写了**六代**，跨越 1531 个 commit。每一代都死于不同的原因，有些死法我现在还会犯。

回头看，六代其实被同一个矛盾推着走：

> [!IMPORTANT]
> 角色说出口的每一句环境细节，至少要和世界状态一样准，而且我得能证明它。

这六代最后把一个东西从「求模型别瞎说」挪到了「没有证据的话系统不许说」：前者靠提示词，后者靠状态机。

## 六代速览

| 代 | 时间 | 角色眼里的世界 | 死因 |
| --- | --- | --- | --- |
| 一 前地理 | 03-26～03-28 | 6 个通用名词 | 被下一代取代 |
| 二 geo_life「数字东京」 | 03-28～05-09 | 街区级约 13 个点，**零经纬度** | prompt 注入整段删除 |
| 三 Pilot V1 | 04-20～07-28 | POI 级：五档感知环 + 室内到楼层房间物件 | 内容沿用至今，骨架被换 |
| 四 Pilot V1.5 | 07-28～09-13 | 内容一字未改，套上结构化骨架 | **生产全量启用，但结构化字段不进 prompt** |
| 五 运动真相 P0 | 09-13～09-30 | 位置从「采样推断」改成「活动 leg 直接投影」 | 被第六代吸收并降级 |
| 六 v2 场景引擎 | 07-24 研究 / 09-30 混合路线 | 驻留窗口 + 事件序列 + 完成事实 | **进行中** |

## 第一代：坐标早就有了，但我没用它

仓库最早的可见提交（03-26 02:31）一次性把所有家当带进来了：`town_sim.py`、`scene_data.py`、`spot_coordinates.py`、`character_profiles.py`，其中 `home_coords` **出生就存在**。

但那时候「她在哪」是由 `_pick_plan_step_title(hour)` 决定的，返回值是六个词之一：家里 / 学校 / 练习室 / 路上 / 食堂 / 房间。

也就是说：**我有坐标，但我拿它当日程文案用，不当空间事实用。**现在看这个不算笨，只是那一版根本没有「感知」这个需求，那时还没人问她窗外是什么。

## 第二代：驱动我做「数字东京」的，其实是两份自相矛盾的设定

诞生提交是 03-28 的 `c23aa8b7`，加了 `geo_life_data.py`（1007 行）和 `geo_life_sim.py`（470 行），往提示词里注入一个叫【地理生活】的段落，后来（`592f6ffc`，03-30）改名【数字东京】。

它的直接动机**不是加功能，是修 bug**：五个角色的 `home_area` 和 `commute_route` 在好几个地方各写各的，互相矛盾。爱音一会儿是「世田谷区 / 小田急线」，一会儿是「東池袋 / 都電荒川線」。我想用一个唯一的数据源把这件事压住。

天花板很快就撞上了，而且低得离谱：

- **`geo_life_data.py` 全文零 lat/lng。**角色眼里的世界是「约 13 个街区点」，没有米级尺度。**两个角色相距 10 米还是 2 公里，我无从判断。**
- 唯一的逐日变化是 `md5(角色+日期)` 定种子的食物轮换，加上 5 档静态人流文案。

它死在 05-09 的 `855cdf77`：提示词里「数字东京」整段删除，注释写的理由是「与 pilot block 重复且互相矛盾」。这条注释到今天还在。

**但它没有真的停止运行。**我原先在文档里写它「无运行时调用方」，这个说法不准确，后来订正了：`_build_digital_tokyo_scene_bundle` → `geo_life_sim.build_digital_tokyo_scene` **到今天每一轮都还在被调用**。只是产物三条出口全断了：返回值没人用、`sess["_last_digital_tokyo_scene"]` 没人读、`prompt_compact` 在 `mygo.py` 里零命中。

准确的说法是：**这是一个「每轮都算、产物无消费方」的僵尸计算。**它还留着 30 多个测试。

这个模式我后面还会再见到三次。

## 第三代：Pilot V1，精度是被幻觉一路逼出来的

出生是 04-20 的 `884085c5`（RiNG Phase 2.2 完結 + 43 个 NPC），`pilots/` 目录第一次出现，`pilot_ring_livehouse.py` 一上来就 4732 行。同日 `7230c339` 加了室内路径图，让「角色不再瞬移」。

这一代的感知粒度是**故意不对称的**。

**室内细到物件。**每个 POI 的字段包括 `room_type / has_windows / window_facing / occlusion_factor / indoor_ambient{visual,auditory,olfactory,tactile} / visibility_radius_m / objects[].state_variations / character_traces`。

物件状态变体是硬性需求，不是炫技：RiNG 那套鼓组必须有 `pre_rehearsal / mid_rehearsal / post_rehearsal` 三种状态，空调有三态。同时立了条内容红线：`character_traces` 只准写五类静态事实（归属 / 职责 / 物理痕迹 / 历史印记 / 缺席），**严禁行为动词**，因为一旦写了「她总会来看一眼那台空调」，模型就会编造她去了。

**室外粗到球形。**只有路径 progress + 五档同心感知环（5 / 20 / 50 / 100 / 350 米，后来加了 2000 米的名录档），haversine 加 bearing 算出八方位。**纯球形检测：无遮挡、无街道图、无门牌。**

顺带说一下这五档环的来历。我早期写过三份图形学味很重的设计稿（`final_project_perception_rings.md`、`perception_vs_graphics_pipeline.md`、`unity_perception_rings.md`，全是 gitignore 的本地稿，没有 commit 历史，所以引用时不能给 hash）。思路是把图形学的 shadowcasting 和坐标空间变换**同构映射**成「感官衰减环 + 相对于观察者的方位」。里面有一条我至今觉得想得很清楚：**明确放弃 ray casting**，原文理由是「输出是 token 不是像素，文本可以自然表达层次」。

### 这一代最重要的决定，代价也是最大的

05-02 的 `a972ea40`（我自己叫它 Phase C.5b）做了个结构决定：**把 pilot 的室内块从 system prompt 迁到用户消息末尾的 fence**，system 侧只留一个粗粒度锚点。动机是 KV cache。

这个决定的结果是：到今天我的 `pet_prompt_registry.py` 里**grep 不到任何 pilot block**，环境感知成了「旁路注入」，不在主装配链上。

然后代价立刻来了。从 `a972ea40` 到 `855cdf77`（05-09）这七天里，`run_pre_reply_agents` 拼好的 `<schedule-context>` / `<pilot-indoor>` / `<memory-base>` **三个 fence 在主对话路径被完全丢弃**：只 consume 了 `prompt_blocks`，那三个没人拿。它们只在 auto_greet / idle / short_silence 三条 inline 路径生效。

**我精心搭的环境感知，在主路径上静默消失了整整七天，而角色看起来还是在聊天气、聊地点。**因为她聊的是 system prompt 里那个粗锚点加模型自己的想象。`chat_server` 里那段现场注释就是这个补丁留下的。

### 两条到今天还生效的红线

- **无窗 POI 一律不得描写外面天气。**就是 4 月 19 号乐奈那条「阴天」换来的。
- **通用感官层和地点感官层不许并存。**`sensory_context.py` 04-13 接进 `mygo.py`，05-18（`c9840bb0`）被删，理由原文是「pilot 的 indoor_ambient + 季节物候完全覆盖」。删掉之后它只剩 2 个 `_test_*.py` 在调用，生产零消费，**于是它变成了后来被我反复误读的「死代码」，有一次我还差点把它当功能缺失重新接回去。**

## 第四代：我搭了一整套骨架，然后一个字段都没用

07-28 的 `68bd834e` 起了这一代，内容是 activity compiler + HTN G1 + G2 world graph + topology v2.1。**注意这其实是第六代（v2）的契约**，V1.5 只是复用它。

动机很实在：V1 那时候有 1300 行的 dispatch 高塔、每个 pilot 模块各自一套时间源，以及散文没法断言。

六组件的落地形态：`pilot_v1_meta.py`（自省元数据）、`pilots/time_source.py`（只有 25 行的薄 shim）、`presence_engine.py`（6 类确定性运动模式，取代关键词启发式）、`scene_adapter.py`（V1 → SceneFrame 桥接）、`pilot_dispatch.py` + `pilot_dispatch_gates.py`（370 行的 resolver 顶掉那 1300 行高塔）、`pilot_overlay.py`。

**然后是最难看的一段：这一代没有新增任何角色能感知到的内容。**

更进一步，SceneFrame 的 `percepts` / `placements` / `canon.visible_traces` / `place.topology` 这四个字段**根本不进角色 prompt 正文**。我去 grep 过 `turn_context_workspace.py`，对这四个字段零引用。感官散文仍然来自 legacy pilot block，因为 `scene_adapter.py:506-514` 那里无条件用 legacy 文本覆盖了 v2 renderer 的输出，**v2 的 renderer 在 V1.5 路径上白跑一趟。**`emissions` 从计划那天起就是空数组。

我花了六周搭结构化骨架，模型看到的东西一个字没变。

不过我也不想把它说成纯浪费：**这一代真正的产出是工程能力。**五级 feature flag 链 + 81 个 slug 的白名单、`pilot_v1_5_prompt_gate.py`（22 项改前改后断言）、`diff_pilot_v1_shadow.py`（7 场景对拍）、批量升级工具。V1 时代一个等价物都没有。**我后面能安全地动数据，全靠这一代搭的这批工具。**

### 一段让所有「考古」都不可信的 git 史

还有一段 git 史实我必须记着：那批 08-19 到 08-29 的提交，**不是 HEAD 的祖先**。我对 `d2436490`、`a20090a6`、`3c9e3cc9`、`614c5d52`、`d854125d` 等 12 个 hash 逐个跑 `git merge-base --is-ancestor`，全部返回非 0。这批文件在本线的**唯一引入点**是 `1e08810c`（2026-08-30 19:29），标题就叫 `chore: land concurrent-session WIP snapshot (branch mixup recovery)`，804 个文件、+324003 / −368099。

**任何「按 commit 追溯 V1.5 早期设计」的做法都会踩空。**而且文档里引的行号在 HEAD 上已经漂了。

### 同期的另一条线：日程地点选择

`destination_selector.py` 的 readiness 谓词 → 最多 5 个候选链 → `affordance_selector.py` 的 `allowed_poi_ids` manifest 闸门 → 7/14/30 天冷却。它顶掉了 V1 那套「手工黑名单 + 非上课日随机抽 1 条 outing hint + 事后用关键词反推」。这个我后来一直开着（`TOWN_PLAN_DESTINATION_SELECTION_MODE=active`）。

## 第五代：同一条「在路上」有三种说法

事件形态很具体。修复前，2026-09-13 19:00 的 `/api/character-status/灯` 返回目的地 `zoshigaya reien` + 状态 `staying`。而她当时正在走的 leg 是「蕎麦店 → 杂司谷霊園 步行」。

**她人在路上，接口说她已经到了，还在「停留」。**同一条 moving leg 我有三种说法：起点、起点到终点的路上、step 的目的地。

根因不是哪条链算错了，是**四条空间推导链并行，而我参照系找错了地方**。leg 本身是可靠的，错在「用前后的采样去猜中间那段」。

改法是在 `_build_live_spatial_state_impl` 里，canon joint 分支之后、legacy resolver 之前，插入一个 active typed leg 分支，产出 `truth_source="active_leg_projection"` 和一个 `location_display`。下游四个消费者分别接：town_sim、chat_server（**只有在这个 truth_source 时**才覆盖 legacy 的街道 resolver）、以及 webapp 的三处显示。全落在一次提交 `113216ae`：17 文件、+1051 −98，外加 282 行的 `test_pilot_v1_5_motion_p0.py`。

09-30 的 `fbf92e8c` 把它降成了 `_LEGACY_POSITION_SOURCES`。**这是六代里最干净的一次「被下一代吸收并降级」**：它的投影思路活着，只是权威让给了下一代的执行快照。

残留一处挺难受：契约文档里承诺的 `_apply_live_spatial_overlay` **不读 `location_display`**，它自己又造了一遍「从 A 去 B 的路上」。我 SSOT 声明了但没接上。而 `pilot_v1_5_prompt_gate.py` 只守 `PILOT_V1_*` 和 SceneFrame 那几个场景，**不含空间投影这个维度**，所以这个残留我的门禁看不见。

## 第六代：不迁全域，只让 v2 拿住「驻留窗口」

它要回答的问题是：**日程能承诺「去 RiNG 练习」，但没人能证明她真的进了哪间练习室、待了多久。**

### 三次路线转弯

这三次必须分清，因为我自己一度把它们混成一件事：

1. **09-22 G0 接线收口。**显式发布与执行事务用进程锁 + 文件锁 + CAS；per-turn tick 和后台 `_town_tick_driver_loop` 经 `run_scheduled_dynamic_actions` 推进**已配置**的候选（未配置不执行）；规则确定性 provider `dynamic_interaction_policy.py`（**不调 LLM**）注册；rendezvous 到场门禁；room 绑定与 Home/Chat/multi_room 的快照消费接线。我当时判断「代码层清零、剩下的全是数据」，**这个判断只对 G0 范围成立。**
2. **09-24 搁置。**`PILOT_V2_PACKAGE_DIRS` 没启用，原因就是数据覆盖不足：11 个包全集中在池袋西 / 目白 / 高田馬場，13 条 micro-area 映射只有 1 条成立而且没有 affordance，营业和 wait 数据也不够。
3. **09-30 场景混合路线。**这是用户拍板的一次转向，我觉得也是最对的一次：**不要求把 V1.5 全域的街区迁到 v2**，改成边界明确的混合。**V1.5 保留宏观日程、通勤和场外运行，v2 只拥有显式准入的驻留窗口与场所内事件**（五个人的家 + RiNG + 三所学校，落成 10 个包）。

权威交接链是这样一条：

```text
V1.5 宏观日程 / 当前驻留 leg
  → 明确场所与活动映射 + 真实位置检查点
  → SceneWindow 准入 + HTN 编译 + CAS 发布
  → v2 事件执行 / 独立快照 / 完成事实
  → 受限的 suffix 重编或真实出口
  → 释放所有权
  → 交还 V1.5
```

### 核心契约里我满意的四条

- **配置门 fail-closed，五个开关缺一不可**：`PILOT_V2_PACKAGE_DIRS` + `PILOT_V2_SCENE_CONFIG` + `HTN_COMPILER_ENABLED_PILOTS` + `HTN_COMPILER_ENABLED_ROOT_TASKS` + `HTN_COMPILER_SHADOW_ONLY=0`。
- **不从自由文本创造活动或替代目的地。**`activities[].field` 只允许 `activity_kind` / `activity_family` / `school_activity_id` 这三个字段的**精确相等**匹配。
- **只有真实跑完的最终 phase 才提交声明效果。**`runtime.htn_effect_receipts` 是幂等回执，`htn_effect_facts` 是按角色归属的完成事实；失败、跳过、被抢占、没跑完的 phase 一律不算完成。
- **出口必须由一个真实完成的移动事件来证明。**来不及或者不可达就保留 `blocked` 状态，**不许跳回 legacy 位置**。`runtime.scene_windows` 记 `active/exiting/blocked/released` 这个所有权状态机。

最后一条是这六代下来的收束：**没有证据的位置不许断言**，从「劝模型别猜」变成了一次可以被违反、也可以被测试拒绝的状态机。

### 验收数字，和它掩盖的东西

验收数字：显式活动 × 角色 **70/70 准入并且在窗口内抵达出口**；保存下来的日程做隔离回放 **105 个窗口 → 47 released / 48 走 V1.5 兜底 / 10 sleep+transit，零 `admission_rejected` 和 `exit_blocked`**；联合回归 35 文件 669 测试 + 988 subtest。

**但「10 包已启用」给人的印象比真实覆盖好太多。**把上面那场回放按场所拆开看：`ring_livehouse` released 24、`hanasakigawa` 7 released / 8 legacy、`haneoka` 9 / 3、`tsukinomori` 3 / 3。**而五个家里基本全是 V1.5 兜底**：爱音 0/7、立希 1/9、素世 1/6、灯 1/8、乐奈 1/4。

> [!NOTE]
> 我把这行数据留在文章里，是因为「总通过率」和「每个场景各通过多少」是两种完全不同的真相，而我只在被打过一次之后才开始看后者。

## 七种我自己反复犯的错

这六代走下来，重复出现的失效模式我数出来七个。它们已经变成我的检查表：

**F1 数据写了但没人读。**`sensory_context.py` 删掉注入之后躺在库里；V1.5 SceneFrame 的 `percepts/traces/topology` 不进 prompt；`emissions` 恒空；`geo_life_sim` 每轮白算；一个审计脚本名字叫 `audit_runtime_injection_contracts` 但盯错了对象。**教训：交付「结构化」必须同时交付「消费者 + 断言」，否则等于没做。**

**F2 双份事实。**五人的 `home_area`/`commute_route`（第二代就是这么起因的）；`character_profiles` 和 pilot 模块各写一遍；v1 五档环和 v2 四 band 并存；路径 A 和路径 B 并存。**跨层复制必然漂，这就是为什么 canon SSOT 那条红线一直存在。**

**F3 静默丢弃、静默失败。**三个 fence 在主路径丢了七天；pilot 的感知代码里到处是 `try/except: pass`，静默失败率我到现在没有量化。**光做 dump 不够，需要「注入面的断言」。**

**F4 配置和进程错位。**本机 `secrets.toml` 20:40 写入、8765 进程 19:50 启动，生产代码里没有 `clear_secret_cache()` 调用。**「配置里开了」和「进程里是开的」是两件事，改完必须重启并复验。**

**F5 分支混线导致历史不连续。**`1e08810c` 那个 804 文件的 WIP 快照就是证据。**按 commit 追溯会踩空，文档里的行号会漂。**

**F6 文档和实现漂。**活动状态下的感知半径缩放（×0.8 / ×1.2）文档有代码没有；`at_hand` 的 `touchable` 前置和 `force_include=True` 对不上；pilot 模块数我在三个地方写了 26 / 65 / 81，实测是 registry 加载 85 个模块、白名单 81 个 slug。**那四份感知设计稿是 gitignored 的本地稿，引用时不能给 hash。**

**F7 门禁自己名不符实。**prompt gate 被加过两次 volatile 豁免（`26e6ab75` / `2a029b1e`）；`pilot_v1_5_prompt_gate.py` 不含空间投影维度；`test_scene_frame_shadow_diff.py` 名字叫 V1.5 对拍，实际是 v2 侧 G0↔HTN 对拍。**门禁要写清楚「守什么、不守什么」，否则它会给你一份假的安心。**

## 三条我原本看不见的主线

把六代横着摆，有三条线一直在动。

### 粒度线

6 个名词 → 街区约 13 点（无坐标）→ POI 五档环 + 房间物件 → 加拓扑 / 门态 / 物件状态变体 → 驻留窗口 + 事件序列 + 完成事实。

**这条线每一次跃迁都由幻觉事故推动，从来没有一次是「我想更丰富」推动的。**无窗房间猜天气（04-19）→ 街区描述和 pilot 打架（05-09 删数字东京）→ 室内串台（05-28）→ 出门少去一点（09-01 场景准入）→ 移动段提前到达（09-13 P0）→ 「宣称入场但没有证据」（09-30 场景所有权）。**这套系统的精度是被错误逼出来的。**

### 注入位置线

system prompt 段 → 用户消息末尾的 fence → workspace 里的 typed frame。每一步的动机和代价都很清楚：

| 时期        | 位置                  | 为什么                            | 代价                                 |
| ----------- | --------------------- | --------------------------------- | ------------------------------------ |
| 第二代      | system prompt 段      | 直接                              | 和 pilot 块重复矛盾，整段被删        |
| 第三代      | user 末尾 fence       | 对 KV cache 友好，system 只留粗锚 | 主路径静默丢了七天                   |
| 第四 / 六代 | workspace typed frame | 结构化、可断言、可上门禁          | 两条路径并存，而且**没有一致性门禁** |

这条线本质是 **KV cache 和「权威性」之间的持续拉扯**。省 token 的位置正好是最容易被模型当成背景知识吞掉的位置。到今天我的生产走路径 B（`TURN_CONTEXT_WORKSPACE_ENABLED` 默认开），但路径 A 还在，两条的语义等价性**没有任何门禁**。

### 真源线

采样推断（前后插值）→ 纯函数投影（active leg，单向写）→ 执行状态机（`runtime_event_states` + `scene_checkpoint` + `released`）。三步都在收紧同一句话。现在这句规矩散落在系统各处，形态是这些文案：`位置依据：SceneFrame 结构化场景`、`之后计划（尚未发生）`、`当时计划（不代表已发生）`、`标为背景或计划的内容不等于此刻正在发生`、`交互边界：{peer} 不在现场…`、家里那条「（推定）」标记。

## 现在同时跑着的三层，和我还没做完的账

2026-10-02 那天我做了个盘点，现实是三样东西同时在跑：

1. **场外（V1.5 主导）**：81 个 pilot 模块 + 81 个 slug 的 SceneFrame 白名单 + 目的地选择器 active + 缝合 active。位置由 plan leg 和 `active_leg_projection`（已降级为 legacy）给。
2. **场景内（v2 主导，10 包）**：SceneWindow 准入 + HTN 编译 + CAS 发布 + 执行快照 + 真实出口。`runtime_event_states` 是移动权威。
3. **prompt 侧（workspace 平面）**：六层真源汇进 `<current-state-frame>` 和 `<pilot-environment-state>`。角色「此刻能直接感知」的部分其实极窄，其余全带着「背景 / 计划 / 不代表已发生」的标签。

欠的账，我一条条对着代码核过，不是修辞：

- v2 真实覆盖率远低于包数量给人的印象。
- 两所学校的 catalog 活动有 3 个没有 binding 入口。
- `eat.meal` 这个 root task 在羽丘那份 catalog 里用冒号、其余 9 份用点号，而 secrets 白名单两种拼写我都写了。**清理时很容易误删，然后羽丘的午餐准入会静默失效。**
- 包目录名和 `pilot_key` 系统性不同名（10 对里有 6 对不同），新人一定会混。
- guest 隔离少了纵深：`action_snapshot` 不在 `_CONTEXT_PRIVATE_SOURCE_KEYS` 里，只靠生产端单点判断。
- v1 五档和 v2 四 band 的等价性没门禁，而 `50/100` 合并进 `near` 依赖每一条 observation 都老实写 `range_m`。
- 室内拓扑 v2 那份文档自己写着「设计草案」。
- NPC 在场的真源不唯一（`_NPC_HOURLY_POI` 只覆盖 1 个人），而且环境 NPC 是 25% 随机的。**同一个问题问两次可能得到不同答案，复盘很难。**

## 一句收尾

如果有人问我「半年六代值不值」，我会说：第二代那 5000 多行没有经纬度的数据肯定是不值的，第四代那六个不进 prompt 的字段也是不值单独存在的。但这六代把一个东西从「求模型别瞎说」挪到了「没有证据的话系统不许说」：前者靠提示词，后者靠状态机。

而推动每一次挪动的，都不是我想做得更好，是她又说了什么根本不可能看见的东西。
