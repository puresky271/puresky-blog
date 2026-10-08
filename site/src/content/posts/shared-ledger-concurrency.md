---
title: 五个角色共吃一份 10MB 的 JSON，八月它把我坑了三次
description: 多个进程共写一份世界账本，生成是分钟级、写入是秒级。八月的三次事故：把日程当集合合并、旧进程覆写引发全天生成无限重做、真正的瓶颈是没人计数的发布提交。最后收口到发布 CAS 加同一临界区内 rebase。
pubDate: 2026-09-28
category: engineering
tags: ['世界模拟', '并发', '可观测性', '排障复盘']
---

我这个项目里有一份 `world_ledger.json`，五个角色每天几点在哪干什么、世界发生过什么，全在里面。它是唯一的真相。

写它的东西有五类：`chat_server`（每个请求都可能 ensure_active_plan、投影世界状态）、town 的 tick driver（每 30 分钟推一次世界）、一个独立的 plan-gen 进程（一天一次全天生成，**要跑 4 到 5 分钟**）、kairos 的夜间整理和晨间发布、还有我散在各个工作树里的脚本。

保护只有两样：进程内的 `threading.Lock`，和一把**只保护存盘那一瞬间**的文件锁。没有全局版本号，没有事务，没有任何「世界提交点」。

最要命的是时间尺度错配：**生成是分钟级的，写入是秒级和请求级的。**任何「先读个基线、算几分钟再写回去」的流程，在这个形态下必然撞上基线漂移。八月那两周，它换了三张脸坑我：把一份日程当成集合去合并（8/18）；旧进程覆写让全天生成一天跑了三遍（8/26）；以及我盯错了瓶颈，真正卡住自动发布的是没人计数的发布提交（8/31）。最后收口在发布的 CAS 和同一个临界区里的 rebase。而世界级的提交点，我到今天还没建。

## 第一次（8/18）：我把一份日程当成集合去合并

根因是我为了「让写入更安全」而加的一个清单。commit `3bc230bc`（8/16，标题 `fix: harden ledger writes and add runtime module tests`）引入 `_LEDGER_MERGE_KEYS`，顺手把 `plans` 也塞了进去：

```python
_LEDGER_MERGE_KEYS = ("events", "plans", "mailbox", "runtime", "joints", "meta") + _LEDGER_DAILY_HOLDER_KEYS
```

对比之前的稳定版 `b5e4cb56`（8/12）：`_save_ledger` 只写当前 payload，不做 fresh-read merge，`plans[*]` 由 `_make_agent_plan_in_ledger` **整体替换**。

新合并会递归进到 `plans[char]` 里，再把 `steps` 这种 list 交给 `_merge_ledger_sequences`，**而它是追加语义**。我写了个纯内存、不落盘的复现：

```python
_merge_ledger_sequences(base=[old_8_16], local=[new_8_18], current=[old_8_16])
# -> [old_8_16, new_8_18]      # 盘上还是旧的，于是新旧叠一起
```

同一步骤被反复追加。当天的现场：五人各 80～99 步（正常 16～20 步）、`time_overlap` 命中 145 条、同一个 step id 挂着好几个 status。

修法是把语义写进函数名和 docstring，让下一个想改它的人先愣一下：

```python
def _merge_active_plan_changes(base, local, current) -> dict:
    """Three-way merge character plans as atomic snapshots, never list deltas."""
```

已经坏掉的数据只能手工去重。

> [!TIP]
> 这条可以直接搬走：一个 list 到底是**集合**（可以并、顺序无所谓，比如 `events`）还是**快照**（必须整体换，比如某个角色的当日 `steps`），要由数据的主人声明，不能让通用深合并去猜类型。`3bc230bc` 犯的错就是给所有 list 统一套了追加语义：它在 `events` 上是对的，在 `plans` 上是灾难。

## 第二次（8/26）：全天生成一天跑了三遍，而且我没抓住是谁干的

时间线（JST）：

| 时间 | 发生了什么 |
| --- | --- |
| 08-25 23:52:24 | 首次发布 8/26 的 plan，五人 active 原子写入，`active_plans_synchronized=True` |
| 08-26 凌晨 | 某个旧进程用内存里那份账本 `_save_ledger` 覆写了磁盘，首次发布的 active 丢了；**爱音退化成一个裸对象 `{"steps":[2026-07-06T17:00 那一步]}`** |
| 05:43:39 | 我手动同种子重跑后发布成功，rev=`5b5675bd…` |
| 05:43～16:33 | **爱音第一次在白天被覆写回古董（覆写者没抓到）** |
| 16:33:41 | 触发全天生成（trigger 是 `lazy_active_plan`） |
| 16:39:59 | 发布成功，rev=`71232cb4…`，五人 active 全写入 |
| 16:39～17:30 | **又被覆写第三次** |
| 19:03:34 | 再次触发全天生成，`status=generating` 写盘 |
| 19:03:36 | 这个进程**死在第一个 seed 调用上**（`seed.start` 之后一行日志都没有） |

### 我那道防重复生成的守卫，变成了无限重做的发动机

生成入口有一道短路检查 `_published_plan_bundle_is_complete`：「今天已经发好了就别再生成」。它要求四条同时成立，其中第四条是 `validate_active_plan_batch`：要看每个 `plans[char]` 的 `source_date_key` / `source_revision` 是不是等于当天发布的那个。

爱音那份是 7 月 6 号的裸对象，**它连元数据字段都没有**。所以第四条恒假，短路恒不触发。于是：

```text
爱音的 active 被覆写成古董 → bundle 判不完整（五人 active 不齐）
  → 任何进程碰到爱音都走 _ensure_active_plan_in_ledger（聊天请求、tick 都算）
  → 日期不匹配 → decision=rebuild
  → 内存缓存里没有 → 持久化 bundle 也被判不完整
  → 从内存 pop 掉当天的 llm_daily_trees / plans / plan_generation
  → 全天生成约 5 分钟，烧掉 LLM 额度
  → 发布（五人 active 全写）→ 爱音再被覆写 → 回到第一行
```

最阴的一条是：**「任何碰到爱音的操作」都会触发重建。**有人给她发条消息、tick 走到她、别的角色查她的位置，全都算。这个循环不需要外部故障来驱动，正常流量就是它的燃料。

### 另外两个附带伤害

**`status=generating` 会把状态永久锁死。**生成一启动就把 `generating` 写盘，进程中途死了，盘上就永久停在那。于是**就算我把爱音的 active 修好，第三条也过不了**，修复必须连元数据一起恢复。这是所有长任务状态机的通病：没有超时自愈，崩一次就把门锁死。

**磁盘坏了但有些进程内存里还是好的，这个分裂态会误导你。**17:30 / 17:49 / 18:14 那三次 rebuild 都**没有**触发全天生成，走的是从持久化 raw batch 重装配。原因是那几个进程手里拿着发布前加载好的完整内存账本，而 `_make_agent_plan_in_ledger` 检查的是**传进去的那个内存 ledger，不是磁盘**。同一时刻，磁盘上是古董，某些进程内存里是完整版。**只看任何一边都会得出错误结论。**

### 我怎么缩小嫌疑范围的，以及没能闭合的那部分

能把某个角色的 plan 从磁盘删掉或替换的路径，都集中在 `_save_ledger` 的三方合并里。我列了四条：

| 路径 | 条件 | 判断 |
| --- | --- | --- |
| A. 删除规则 | 角色不在进程内存 + 在 baseline + 磁盘等于 baseline → `merged.pop(char)` | 代码存在，能产生「爱音缺失」的中间态 |
| B. 没有 save_base 的联合写 | 进程账本里没 `_LEDGER_SAVE_BASE_KEY`（比如发布事务后 `staged.pop(save_base)`，或 `_new_ledger()` 造出来的），代码就是 `{**current, **local}`，local **无条件**覆盖磁盘 | **最可疑** |
| C. identity 裁决降级 | `local_replaced and not current_replaced` → local 胜 | 需要进程加载到新发布后本地仍被换成退化版 |
| D. 发布事务 | CAS + 原子写 + 五人全写 | **已验证安全**，不可能丢爱音 |

能确认的：发布链路原子且完整，覆写一定发生在常规 `_save_ledger`（A/B/C 之一或组合）。

确认不了的：到底是谁。我的推测是「一个凌晨前启动、内存里带着前夜损坏状态的长驻进程，周期性保存账本」。证据是 `world_ledger.prev1.json` 和 `prev2.json` 的 **md5 完全相同**（`4aa010bf…`）。轮转语义能反推出「保存 X 把爱音覆成古董，紧接着保存 Y 写出完全一样的内容」，**这是周期性无条件保存的特征**。但排查时点所有 python 进程都死了，没法锁定是哪个进程、走的哪条分支。

这份诚实留着：**循环我切断了，覆写者到今天没抓到。**同类覆写两天里发生了三次。

### 修好之后堵上的那条缝

紧急修复是纯确定性重建、不调模型：备份 → 从 prev1 恢复元数据 → 用**发布时同一套装配路径**重建爱音的 active → **写盘前先验**五人合同通过 + bundle 完整 → 原子写 + prev 轮转 → 写完之后**重新从盘上读回来**独立复核（爱音 18 步 / 素世 17 / 灯 20 / 立希 20 / 乐奈 19，全部 `src=20260826 rev=71232cb4`）。

后来把 B 那条路堵上了，函数名起得挺直白：

```python
def _merge_active_plan_without_baseline(local, current) -> dict:
    """Freshly constructed ledgers historically used ``{**current, **local}``,
    which let a long-lived stale process overwrite a published, revisioned
    snapshot with a revisionless legacy object."""
    if current_identity != ("", "", 0) and local_identity == ("", "", 0):
        continue            # 零元数据的退化版不许覆写有 revision 的已发布快照
    if current_date and local_date and local_date < current_date:
        continue            # 旧日期不许覆写新日期
```

## 第三次（8/31）：我以为瓶颈是质量门禁，其实是我根本没看发布

修完之后回看我那份事故报告：**五条发现全部成立，但优先级跟真实数据不符，而且我漏掉两件更要命的事。**

**漏掉第一件：8/31 不是意外，是常态。**把 `plan_generation` 翻出来数一遍：过去 14 天（08-18～08-31）**只有 2 天 published**，11 天 failed，1 天卡在 generating。两次成功**都有我人工介入**。自动发布成功率接近 0。

**漏掉第二件：失败最多的一类不是质量门禁，是发布提交。**

```text
publish/candidate_publish_rejected   7 次
candidate_publish_failed             2 次   → 合 9
quality_gate_recovery                6 次
```

我那份报告完全没检查 publish 这条路。**这件事是三起里最值得讲的：你能观测到什么，就会以为问题出在哪里。**我整个月都围着质量门禁转，因为那是唯一有计数的地方。

### 「一次瞬时故障吃掉一整天」是三层叠出来的

| 层 | 原本 | 改后 |
| --- | --- | --- |
| 冷却时长 | 任何失败都写 `max(次日逻辑日界, now+24h)`，**下限 24 小时** | 按失败阶段分级：publish 那条约 **17 分钟**，其余保持整天 |
| 尝试消耗 | `failed` 也算已消耗，而且**只有 `generating` 有逃生口** | 加了「过期瞬时失败可重新 claim」 |
| 运行时兜底 | 逃生口**只对 `status=="published"` 开**，`failed` 走不进去 | 过期瞬时失败同样放行 fallback |

第三层正是日志里那 62 次 `fallback_raw=true` 却 `attempt_consumed_blocked=true` 的来源。

**冷却分级的判据我很满意：**publish 失败是**基线竞态**，当天内容本身合格，稍后重试通常就成；quality / contract / raw 失败是**候选自身的属性**，重复生成只是空转规划模型。前者该快重试，后者该冷却一天。用同一个 24 小时处理这两类，等于让一次无关的锁竞争毁掉一整天的自动发布。

### 重试成功了，然后我把结果扔了

11:01:20 那次重试的日志：

```text
segment.done   retry  parsed_chars={爱音:8, 素世:8, 灯:8, 立希:8, 乐奈:8}  outcome=invalid_leg_windows
segment.retry_done  retry={全部 0}   best={立希:7}   improved=false
plan_gen.end   ok=false  reason=impl_returned_None
```

**重试其实把五个人的 8 步全补上了。**但 `_generate_plan_segment` 在重试路径里发现自己还有 leg 越界时（`_is_retry=True`，已经不能再重试），执行的是 `return {}`，把刚生成好的完整结果全丢掉。外层只能退回初稿（立希 7 步），整段拒绝。

而越界的内容是素世 step 0 两条 leg 结束于 70 分和 80 分、上限 60 分。**一个纯算术问题。**

改法是 clamp：`duration = limit - offset`，起点已经在窗口末之后的 leg 直接丢弃。leg 时长本来就是模型估的，压回窗口的语义损失可以忽略。**但保留第一次重试**：第一次越界照旧重试，因为新一次可能给出更好的 leg，clamp 只在最后一次收口。这条边界是靠已有测试 `test_overlong_leg_windows_retry_then_accept_valid_segment` 暴露并保住的。

**「走到不能重试的分支就返回空」是我会再犯的错。它不是失败，是放弃。**

### 我以为有三轮重试，实际是 0 轮

审阅器的恢复循环里有两个 `break`（一个捕 `DailyPlanReviewContractError`，一个捕 `Exception`）。**任何审阅器故障都直接跳出整个循环。**「最多三轮」只在「审阅器跑完了但 findings 没清干净」时才生效；截断、JSON 语法错、白名单违规这三种，实际拿到的重试次数是 **0**。

恢复失败的真实分布（从账本里挖的）：`reviewer_unavailable` **9** 次、`findings_remain` 6、`quality_gate_failed` 6、`recovered` 6、`edit_rejected` 3、`recovered_by_segment` 1。

那 9 次 `reviewer_unavailable` 拆开是：审阅 LLM 试图编辑 `start_jst`（不在白名单）导致整个 contract 校验失败 3 次；输出 JSON 语法错 2 次；**`cross_character` scope 输出被截断** 2 次；编辑前 `before` 值已漂 2 次。

改了四条：

1. 瞬时故障改成 `continue`，消耗剩下轮次。
2. 只有永久故障（凭证缺失、客户端构造不出来、SSOT 不可用）才提前退出，这三类重试多少次都一样。
3. 截断此前**零重试**，且同上限重试只会再截断一次，现在给一次**抬倍预算**（上限 24k）。
4. 合同 retry 的资格从「循环下标」改成**独立标志**，否则截断消耗掉第 0 次尝试会连带把合同 retry 一起丢了。

`edit_rejected` **我故意留着 break**：「no applicable exact edits」意思是审阅器认为没什么可改，再问同一问题只会得到同一答案。**不是所有 break 都该改成 continue。**

还有一个「靠异常侥幸工作」的例子：`_ensure_active_plan_in_ledger` 里 `_in_flight` 只在 else 分支赋值却被无条件读，`_stale_published=True` 时抛 `UnboundLocalError`，被外面的 `except` 吞掉，打印成「fallback detection error」。结果**我在 08-19 加的 stale-published 逃生口一直靠这个异常侥幸生效**，同时绕过了 in-flight 防抖和「每天只 force rebuild 一次」两道防 livelock 的闸。

> [!WARNING]
> 一个被宽 except 吞掉的异常路径，可能正在侥幸地做对，同时也侥幸地绕过你其他所有保护。

### 18 条规则全是 error，而「小瑕疵可以忍」在我代码里无处安放

18 条质量规则全部 `severity="error"`，`valid` 沾一条 error 就是 False，模块里**没有任何 env flag**。产品上我一直觉得「轻微瑕疵进已发布计划可以」，但代码里没地方表达。

而历史上真正触发过恢复的只有四种 code，全是表述层面：`japanese_kana_residue` 26 次（**恢复后仍残留 17 次**）、`unexplained_destination_revisit` 10、`weather_realtime_residue` 4、`companion_not_reciprocal` 1。

8 条降成 advisory，判据一句话：**带着它发布，运行时仍然能给出结构上可消费、不违反 canon 的一天。**保持阻塞的是 `sleep_step_missing`、`bt_projection_failed`、`wrong_exam_subject`、`wrong_school_ownership` 这类。

三个细节值得抄：

- **降级只在一个出口做**（`_normalize_finding_severity`），18 处构造点照旧写默认 `error`。新加规则时，边界不会跟着构造点漂。
- **advisory 不能隐形**：加了 `candidate.quality_advisory` 遥测加一行控制台输出，否则计划一边无声变差、一边日志干净。
- **堵了一个降级自己引入的回归**：`_recover_kana_residue_deterministic` 原本只在 `not valid` 时跑。假名那条降级之后，只剩假名的候选变成 valid，于是**它跳过了本来能修好它的确定性修复**，直接把残留发出去。改成无条件跑（纯词表查找，成本可忽略）。**放宽门禁会让门禁下游的修复路径失效**，因为那些路径的触发条件本来就是「门禁失败了」。做任何严重度降级，都要重新查一遍哪些修复挂在 `not valid` 分支里。

顺带，「17 次残留」的机制也挖出来了：替换表是固定词表，表里没有的专名重跑多少次都修不掉。现在 `_recover_kana_residue_deterministic` 会把仍含假名的字段连同原文经 `candidate.kana_table_gap` 报出来，**这是我知道该往词表补哪条所需的唯一信息**。另外 43 条归档 finding 的 `field` 全是 `None`，既看不出哪个字段残留，修复也只能整个 step 重跑词表，所以 `_audit_language` 改成逐字段判定并写进 `field`。

最后一条是产品判断：`companion_not_reciprocal`（`灯[5] names 爱音, but no overlapping reciprocal step exists`）降 warn。**单向提及在现实里也会发生**：灯想着爱音，爱音在做别的事，不值得为它废掉一整天日程。我没用「确定性摘除单向提及」，因为那样必须连带剔除 `pending_companion_memories`（这些记忆是发布之后才写的），否则记忆里会留下「计划里根本不存在的同行事件」。

## 收口：发布的 CAS，以及在同一个临界区里 rebase

那 9 次 publish 失败，成因就是开头那个尺度错配。

`base_state_token` 是基于生成时**内存里**那份账本算的，提交时比的是**盘上重读**的状态。生成要 4-5 分钟，这期间只要有任何进程调过一次 `_save_ledger`（tick、别的 session、kairos），盘上的 `joints` / `plan_generation` / `plans` 就变了。而 `_PLAN_CANDIDATE_IN_FLIGHT` 是**进程内**标志，跨进程完全无效；文件锁只护存盘那一瞬间，护不住那 5 分钟。7 次 `candidate_publish_rejected` **全部**由 `lazy_active_plan` 触发（被用户消息带起来的），形状完全吻合。

第二个原因是我自己把 token 定得太宽：`observed_joint_keys` 包含候选行为树里**读到的所有** joint id，不只是它要写的。于是一个跟本次毫无关系的 joint 被 tick 改一下，就判成冲突。原来的处理是冲突直接 `return None`，调用方立刻记 failed + 24 小时冷却，**零重试**。

### 收窄 token，但两侧必须由同一个函数算

```python
def _plan_token_joint_keys(joint_delta) -> set[str]:
    """Joint keys the publish CAS token guards.

    SSOT for both token computations (generation side and commit side); they
    must agree exactly or every publish would conflict. Only joints the
    candidate actually replaces are guarded ...
    """
    return {str(key) for key in joint_delta}
```

docstring 里那句「must agree exactly or every publish would conflict」是我踩过之后加的。**生成侧和提交侧必须调用同一个函数推 token。**两边各写一遍，只要在一个边界情况上不同，症状就是「每一次发布都冲突」，**而这个症状看起来像并发太激烈，完全不像两处代码不一致。**这是我这个月最喜欢的一个 bug 形状。

### 冲突了不重试，直接判断能不能 rebase

冲突是在持有双锁时发现的，**循环重试毫无意义（持锁期间状态不会变）**，所以就在同一个临界区里判定。`_plan_publish_rebase_refusal` 的默认方向是 fail closed：

```python
"""A CAS conflict only means the guarded baseline moved. That is usually
unrelated churn (a tick advancing runtime, another session touching a joint),
which is safe to rebase onto. The one case that must never be rebased is
another writer having already published a *different* complete plan for this
date — overwriting it would silently destroy their work.

Fails closed: anything this function cannot positively prove safe refuses.
"""
if not isinstance(current, dict): return "fresh ledger payload is not an object"
if not candidate_revision:        return "candidate has no revision"
if entry_status == "published" and published_revision != candidate_revision:
    ...
    # 一条 published 但 bundle 不完整的记录，属于 2026-08-19 那次 stale-published
    # 的故障形态；修好它恰恰就是本次发布应该被允许做的事。
    if _published_plan_bundle_is_complete(current, date_key, ring_today=ring_today):
        return f"a different complete revision {published_revision[:12]} is already published"
return ""
```

两点：

一是**唯一拒绝 rebase 的情况是「别人已经发布了另一个完整版本」**，那属于会毁掉别人的工作；其余都是无关噪声，该 rebase。

二是那段注释体现的东西：**要区分故障形态，而不是区分状态值。**「published 但 bundle 不完整」字面上也是「已有 published」，但它是需要被这次发布修掉的旧故障，不该成为拒绝理由。能写下这条豁免，靠的是我把 8 月 19 号那次的形状记住了。

rebase 通过的条件是：**用盘上最新的 joints 重跑一遍阻塞级质量门禁**。

### 收窄让出去的保护，得在同一批里补回来

收窄 token 意味着「无关 joint 漂移不再算冲突」，代价是少了一层保护。这个账必须当次结清，不然就是把安全性换成可用性：

> 行为树对 joint board 的陈旧由两道独立检查接住——`_audit_bt_projection` 把每棵树对照 joint board 展平（`bt_projection_failed` / `bt_step_count_mismatch` / `bt_step_drift` 都保持阻塞），并且发布前用**最新的 board** 重跑一遍质量门禁。

而且这条论证**是被测试钉住的**，不是留在我文档里的一句话：`test_publish_refuses_rebase_when_fresh_joints_break_quality`。

> [!IMPORTANT]
> 「我推理过它是安全的」和「有一条测试会在它不安全时变红」是两件事。

顺手还核了一件：rebase 被拒时，调用方记失败**不会**覆写已发布的记录。`_write_plan_generation_entry` 本来就有守卫，拒绝用非 published 的条目覆盖一个完整的 published bundle。

## 验证，和那个我没测的格子

| 项目 | 结果 |
| --- | --- |
| plan / town 聚焦回归 | **301 passed, 79 subtests**（15 个测试文件） |
| `test_time_source_guard` | 5 passed（改 `town_sim.py` 必跑） |
| 提示词 diff 门禁 | `plan_gen_prompt` 与 `cognitive_prompt` **逐字节一致**，三批各跑一次 |
| 新写的测试 | `test_plan_publish_cas_rebase.py` 15 项、`test_plan_transient_recovery.py` 24 项、`AdvisorySeverityBoundaryTests`（钉死阻塞/建议边界，防止无声漂走）、审阅器恢复 5 例 |

**没做的是**真实跑一次端到端：那会消耗当天唯一的生成机会，并写进生产账本。真实效果只能按上线指标看：

- `published` 占比（基线 2/14）
- `candidate.outcome` 里 `candidate_ready` 的比例
- `candidate.publish_cas_conflict` 的 `decision` 分布（`rebased` 应远多于 `refused`）
- `candidate.quality_advisory` 的 code 分布：**advisory 的意义是不阻塞发布，不是允许质量长期变差**，某 code 一直高发就该回去修根因

## 还有一个我一直没建的东西：世界的提交点

我调研过「世界级原子提交边界」，结论是**没实施**。`grep WorldCommit|world_revision|WorldProposal` 在所有 `.py` 里零命中，那份调研自己的状态写着「调查完成，尚未实施」。

原来列的八个缺口，老实版：

| 缺口                             | 现在                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| 没有全局 revision                | 还在                                                                         |
| 读失败会造出一个空世界           | **部分收敛**：已有 prev1/prev2 回退和 fail-closed                            |
| `shutil.copy2` 的非原子 fallback | 还在                                                                         |
| 只有进程内的锁                   | 还在（发布事务用了进程锁 + 文件锁 + fresh-read + CAS，但没有跨进程全局仲裁） |
| raw / active / cache 可能分叉    | 还在                                                                         |
| 跨 SQLite 和 JSON 双写           | 还在                                                                         |
| 幂等只扫最近 1200 条事件         | 还在                                                                         |
| 快照是浅拷贝                     | **部分解决**（被零拷贝那套覆盖）                                             |

这三批修的是「生成出来的候选能不能稳定发布」，**不是**「这个世界到底有没有提交点」。这两件事的差距，就是修症状和消结构的差距。这张表我留着，是因为「我修了三次 bug」很容易让人以为已经解决了。

## 如果只记三句

1. 生成窗口是分钟级、写入是秒级，你的乐观并发一定会冲突。先设计 rebase，再设计重试。
2. token 必须由两侧共用的那一个函数推导。它不一致时的症状是「每次发布都冲突」，看起来像并发问题。
3. 你能数到什么，你就以为问题在那里。八月那阵子我能数的只有质量门禁，于是我花了一整个月以为瓶颈是质量门禁。
