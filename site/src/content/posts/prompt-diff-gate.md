---
title: 我给提示词做了版本控制，因为它根本没有源文件
description: 角色提示词拼完约 51000 字符，却不在仓库里。我把它当成没有源文件的编译产物，改动前后各 dump 一份逐场景 diff：27 个固定场景、冻结运行时状态、基线不能事后补造，以及一次伪装成代码问题的配置漂移。
pubDate: 2026-10-08
category: engineering
tags: ['角色扮演', '提示词', '上下文工程', '评测', '方法论']
---

我这个项目的角色提示词，拼完之后实测约 51000 字符。它由二十多个来源在运行时装配出来：人格卡、记忆召回结果、当前世界的状态帧、认知层的判断、近期对话原文、这一轮的回复预算……

问题很简单：**这 51000 字符不在仓库里。**git 能 diff 的是那几千行装配代码，diff 不了一点「模型实际看到了什么」。

而我改动的恰恰是装配逻辑。改一行排序键、给某个块加一句话，我回答不了这几个问题：

- 五个角色、三种模式（单聊 / 她主动开口 / 群聊）下，块的顺序变了吗？
- 那段话有没有从「事实区」漂到「猜台区」？
- 公开访客（guest）那条路径里，我自己的私有记忆有没有因此混进认知层？
- 当前那条用户消息还在最后一个位置吗？
- **本来不该受影响的那些场景，有没有跟着变？**

前四个读代码回答不了。第五个单元测试回答不了：单测断言的是「函数返回了什么」，不是「拼完之后长什么样」。

后来我干脆把它当成一个没有源文件的编译产物来处理：**每次改动之前先 dump 一份全量，改完再 dump 一份，diff 这两个 dump。**这条现在是项目里的红线，写在 AGENTS.md 里。

## 规矩里最烦人但最值钱的那半句

规矩是这样：

```powershell
py -X utf8 scripts\dump_cognitive_prompt.py --project-root . --label before_<改动名>
# 改代码
py -X utf8 scripts\dump_cognitive_prompt.py --project-root . --label after_<改动名>
git diff --no-index -- _offline_smoke_out\cognitive_prompt_before_<改动名>.json `
                       _offline_smoke_out\cognitive_prompt_after_<改动名>.json
```

`git diff --no-index` 在有差异时返回 1，这是正常的，不是失败。产物落在 gitignore 的 `_offline_smoke_out/`，不进仓库：它们是证据，不是代码。

红线里还有半句，是我一开始最不愿意遵守的：

> [!IMPORTANT]
> 禁止在代码已经改完之后，从同一个 checkout 补造 before 和 after。

我以为这是流程洁癖。后来算了一下，它是物理约束。

before 需要的是「改动前的代码 × 改动前的运行时状态」这一组配对。代码能 checkout 回去，**数据回不去**：`memory_core.db`（690MB）和 `world_ledger.json` 都是 gitignore 的活状态，这期间被跑着的进程持续重写。从改后的 checkout 重跑一遍当基线，你会拿到一份混合品：diff 里同时混着你的改动和这两个月数据的漂移，两个来源分不开。

所以这条规矩的价值不在于「流程严谨」，而在于它强制你在改动落地之前就把基线钉住。它确实打断了我「先写完再验证」的舒适流程，你得为一个还没定的 label 名字先跑一次 dump。这个别扭是设计的一部分。

## 27 个场景不是随便抽的

`dump_cognitive_prompt.py` 里 `SCENARIOS` 现在有 27 条（我记得文档还写着 12，那是滞后的）。每条钉死三样东西：用户输入的文本、喂给她的记忆夹具、以及一个 JST 时刻。

设计依据不是「对话要多样」，而是「这条装配路径上有几个判定分支」。举几条我知道很有用的：

| 场景 | 它在盯什么 |
| --- | --- |
| `neutral_no_memory` | 普通闲聊**不该**冒出任何记忆指令或无端延长，这是「虚假记忆注入」的哨兵 |
| `raw_memory_rows_ignored` | 给了原始 `memory_rows` 但没有 `selected_surface_rows` 时，认知层必须拒绝拿它构造证据 |
| `guest_memory_isolation` | 访客路径要从整个 pre-brain 输入里移除我的私有记忆，relationship lens / user model / brain semantic 都不许进 |
| `memory_posture_*` 八条 | 记忆的置信姿态按年龄分级，动一条阈值这八条会同时给出答案 |
| `low_energy_s1` / `deep_night_long_high_energy` | S1/S2 分流和回复预算 |
| `outdoor_pilot_zoshigaya` / `transit_pilot_toden` / `indoor_pilot_ring` | 室外 / 通勤 / 室内三条地理注入 |

一次 dump 27 个场景，比我为这 27 条分支各写一个单测便宜得多，而且**它测的是合成结果**，这正好是我唯一真正关心的东西。

## 真正麻烦的是让它每次都一样

固定文本只解决了一半。**运行时状态一直在动**：一个常驻的 `chat_server` 每几十秒就会写一次记忆库和世界账本，tick 推进日程、KAIROS 夜里整理、聊天触发记忆写入、town 的邮箱投影。所以我 14:00 跑的 before 和 14:20 跑的 after，代码一字不改也不会一样。

现在的 patch 清单大概是这样，每一行都对应一个曾经真的把我坑过的不确定来源：

```python
with (
    patch("builtins.open", side_effect=_open_without_debug_log),
    patch.object(mygo_module.os.path, "isfile", side_effect=_isfile_without_runtime_state),
    patch.object(mygo_module, "_mem_sqlite_enabled", return_value=False),
    patch.object(mygo_module, "_fetch_pending_gossip_rows",
        side_effect=lambda character, limit=3, **_: _fixture_pending_gossip_rows(
            fixture_memory, character, limit)),
    patch.object(mygo_module, "_build_spatiotemporal_constraints", return_value={}),
    patch.object(mygo_module, "_build_town_projection_prompt_block", return_value=""),
    patch.object(mygo_module, "_build_schedule_departure_hint", return_value=""),
    patch.object(mygo_module, "_get_onebot_pure_mode", return_value=False),
    patch.object(mygo_module, "_to_jst_datetime", side_effect=_fixed_jst_datetime),
):
```

`_build_town_projection_prompt_block` 那条我要单独说一下：它不是为了输出稳定，是为了**别写我的生产库**。这个函数在拼提示词的过程中会去调 `sync_projection_to_legacy` → `record_town_mailbox`，直接往 `shared_info` 表写行。也就是说，光是「看一眼她这轮的提示词」就改变了系统状态。这种路径必须显式关掉，否则你连观测都是破坏性的。

另外 `FIXTURE_MEMORY` 是模块级夹具，每个场景可以用 `memory_patch` 覆盖局部字段；`now_dt` 按场景给，没给的回落 `2026-07-24 19:00`。

## diff 出来我要看六件事

文档里我写死了一句：**不能只检查 dump 文件生成了。**必须逐场景确认：

1. **块顺序。**`<cognitive-workspace transient="true">` 必须在事实/证据之后、近期原文之前；`<turn-reply-guidance>` 必须在当前那条 user 消息的末尾，成为最后一个语义单元。
2. **事实和推测的边界。**这是最危险的一维。我的系统有条底线是「没有证据的位置不许断言」，一段本该标成「计划」的文字如果被拼进「当前状态」，模型就会言之凿凿地说错。
3. **隐私隔离。**guest 场景不许出现我的私有记忆；`【认知执行约束】` 属于执行层，不能落进可缓存的人格块。
4. **预算。**整段 prompt 上限 32000，认知 workspace 的槽位 S1=3 / S2=4。
5. **当前用户消息和回复目标的位置。**尾块被顶掉，对角色扮演质量的伤害是直接的。
6. **无关场景零漂移。**一个只影响群聊的改动不该让单聊场景的字节发生变化。这一维是唯一能抓到「意外副作用」的。

第 6 条靠人眼最守不住：27 个场景乘 6 个维度，我不可能每次扫完。所以把它写成了代码。

## 把「零漂移」写成断言

数据层的批量改动（比如给 pilot 场景补 POI 数据）有专门的门禁 `pilot_v1_5_prompt_gate.py`，22 项改前改后的断言。上面第 1、5、6 维在里面是这样的：

```python
check("current_user_is_tail_before",
      bool(before_messages) and before_messages[-1].get("role") == "user"
      and user_text in str(before_messages[-1].get("content", "")))
check("current_user_is_tail_after", ...)
check("tag_order_stable", _tag_order(before_messages) == _tag_order(after_messages))
for tag in PROTECTED_TAGS:
    check(f"protected_{tag}_stable", left == right, f"before={len(left)} after={len(right)}")
check("non_pilot_messages_zero_drift", before_messages == after_messages)
check("non_pilot_stable_sources_zero_drift", before_stable_sources == after_stable_sources)
```

`non_pilot_messages_zero_drift` 是里面最狠的一条：它要求**没受本次影响的场景，messages 数组逐字相等**。任何「顺带变了一点」都跑不掉。

### 门禁自己也欠过账

这套门禁自己也欠过账，我觉得值得讲：**它被加过两次 volatile 豁免**（`26e6ab75` / `2a029b1e`）。豁免本身可能有道理，但结果是它实际守的东西比名字暗示的少。同类问题还有两处：`pilot_v1_5_prompt_gate.py` 里**不含空间投影这个维度**；`test_scene_frame_shadow_diff.py` 名字里写着 V1.5 shadow 对拍，实际是 **v2 侧的 G0↔HTN 对拍**。

我现在要求的规矩就一条：**每个门禁必须写清楚它守什么、不守什么。**覆盖面清单比覆盖率数字有用得多。

## 我总共有 36 个 dump 脚本，这不是我乐意

一个脚本管不住全链路，因为不同改动落在不同的装配路径上。`scripts/` 里现在躺着 **36 个** `dump_*.py`。常用的分工是这样：

| 我改了什么 | 该跑哪个 | diff 允许出现什么 |
| --- | --- | --- |
| `cognition/`、`turn_agents/`、两个 façade、认知装配 | `dump_cognitive_prompt.py`（27 场景） | 只有相关场景变，无关场景逐字一致 |
| `pet_prompt_registry.py` 的输出层（含 `<part>` 包裹那套） | `dump_pet_compose.py` | **只许 `<part>` 包裹行和 summary 元信息**变，块顺序、块内容、workspace moved 集合零漂移 |
| `chat_server.py` 最终 system prompt 的追加边界（人格卡、guest 隔离、sticker 追回、legacy 杂项、降级内置 prompt、群聊后缀、自治场景块） | `dump_full_persona_prompt.py` | 只许 `<part>` 包裹行和头部字符数变化；覆盖 dev legacy / dev workspace / guest 三场景 |
| 日程生成的 prompt | `dump_plan_gen_prompt.py` | 20 行固定日型 prompt 逐字一致 |
| 记忆 / 日程工具的 workspace | `dump_memory_tool_workspace.py` + `dump_schedule_tool_workspace.py`，各跑一遍带 `--inject-tool-records` | 关闭态逐字节零漂移；注入态最多新增三条状态行（昨日没有年度事件时仍是两条）加 `[日程查询]` 事实 |
| 别的一些专项 | `dump_turn_fact_prompt.py`、`dump_daily_continuity_prompt.py`、`dump_fact_validity_prompt.py`、`dump_cluster_workspace_gate.py`、`dump_group_chat_prompt.py`、`dump_multi_room_fact_gate.py`、`dump_scene_engine_prompt.py`、`dump_turn_reply_guidance.py` | 各自那块 |

还有一个真运行时版本 `dump_live_chat_prompt.py`：它从活会话和当前世界状态里 dump 完整的 messages 数组，专门用来回答「她这一轮提示词里到底有什么」「那条日程到底进没进」。我用它定位现象，用固定场景版做改前改后。

36 个确实多。但它对应的现实是：我的提示词有三十多个不同的装配路径，而每加一条新路径，我就需要一个能盯住它的东西。**这些脚本的存在不是为了测试覆盖率，是因为我读代码读不出来。**

> [!TIP]
> 真正重要的习惯是：动手之前先想清楚「我这次改动落在哪条装配路径上」，再选 dump。选错的后果不是没有输出，而是拿到一份毫无检测力的绿。

## 有一次 diff 出现 12 行差异，跟我的改动一点关系没有

这是最值得抄的一段。

某次改完之后跑认知门禁，before/after 出现 **12 行差异，而且是双向的**：有的场景多一行，有的场景少一行。这个形状不可能是我那次改动造成的（我是纯逻辑修顺序）。

排查走了三步：

1. **同一个目录连跑两次 → 逐字节一致。**先证明 dump 本身是确定的，把随机性排除掉。
2. **怀疑基线那个 worktree 缺运行时数据。**它没有 `memory_core.db`、没有 `world_ledger.json`、没有 `daily_journal/`。我用硬链接把库挂过去（跨盘失败之后干脆把 worktree 建到 D 盘）+ 拷小文件 → **差异还在**。
3. **真因：worktree 缺 `.streamlit/secrets.toml`。**而差异内容正好是 D1 主观置信姿态的文案，那一串是由 `MEM_SUBJECTIVE_POSTURE_ENABLE` 门控的。把 secrets 补齐 → **逐字节一致**。

我从这里学到三件事：

- **跨 worktree 做提示词对比时，`secrets.toml`、`memory_core.db`、`world_ledger.json`、`daily_journal/` 全都是 gitignore 的**，必须一一对齐。不对齐的话，**配置差异会伪装成提示词漂移**，而它看起来完全就是代码问题，是最消耗我时间的一类假阳性。
- `--project-root` 这个参数同时决定代码路径和数据路径（脚本内部 `os.chdir` + `sys.path.insert`），**没法只换一边**。想「A 的代码配 B 的数据」做不到，只能整套对齐。
- **双向差异本身就是「环境不一致」的指纹。**纯增量改动不会让一部分场景变多、另一部分变少。这个形状值得记进症状表，比记任何具体原因都耐用。

## 这些工具不是只读的，我一直没解决

前面说过 `_build_town_projection_prompt_block` 会在拼提示词的时候写 `shared_info`。我在 dump 脚本里 patch 掉了它，但那次 patch 只覆盖了 `_dump_dev_memory_prompts` 内部的路径，而默认模式根本不调那个函数。

证据留得很明确：10 月 5 号 22:32:47，生产库里落了一条 `mailbox_attempt {"items":3,"content_dedup_skipped":3}`（角色爱音）。当时并发跑着 after-dump 和回归测试两个新代码进程，没法唯一归因给谁，但**两边都具备写入路径**。

所以现在的说法只能是：**跑一次门禁应当被当成一次写操作**。要么加临时库隔离，要么承认它脏，在低峰跑。我还没做隔离，这是笔欠账。

另一个副作用更有意思：**门禁会理直气壮地给出无意义的绿。**「认知 dump 不覆盖 compose 输出层」这句话，我是踩过一次才写进文档的：我改了 `<part>` 包裹的逻辑，认知 dump 全绿，而实际拼出来的东西已经变了。反方向的例子也有一条：gossip 读取分层那次，27 个场景逐 key 一模一样，看着像「我的改动没生效」，其实是它压根不渲染那个 box。

> [!WARNING]
> 因此我在汇报格式里硬性加了一条：给出 dump 的路径和 diff 结论，不要只说「跑过门禁、全绿」。一条不附带覆盖范围说明的绿，等于没跑。

## 如果你想在自己项目里抄这套

按投入产出从高到低：

1. **先把「改动前先 dump」这一条规矩定下来，脚本可以很糙。**我第一个版本只 dump 单个角色的一段 system prompt，照样救了我。规矩的价值全在「动手之前就把基线钉住」这一件事上。
2. **场景一超过三个，就必须有「无关场景逐字相等」的断言。**人眼 review 立刻成为瓶颈，而漂移恰恰藏在你以为无关的那些场景里。这条最容易实现，收益最高。
3. **把你依赖的 gitignore 运行时文件列一张清单**：配置、数据库、世界状态、日志派生文件。上面那次假阳性排查浪费的时间，全是在补这张清单。
4. **每个门禁写一句「它不覆盖什么」。**这比覆盖率数字诚实。
5. **用变异自证。**把修复反向改回去，确认测试能红。做不到这一步，你根本不知道它是检测器还是装饰。
6. **把这些工具当成写操作对待。**别假装它们是只读的。

## 一句收尾

提示词是这类系统真正的行为定义，而它在版本控制里根本不存在：仓库里存的是那几千行装配代码，不是那 51000 字符。

我做这套东西，就是在给这个没有源文件的产物造一个可以 diff 的替身。它的价值不在跑得多快，而在一个很朴素的约束上：**只有你在动手之前就留下了基线，这个替身才存在。**事后补，补出来的不是基线，是你想让它们差出来的那个东西。
