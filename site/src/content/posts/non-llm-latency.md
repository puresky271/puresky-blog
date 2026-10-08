---
title: 用户等了我 55 秒，其中 45 秒跟模型一点关系没有
description: 一轮对话 55 秒，所有模型调用加起来只占 8 到 12 秒。剩下的时间花在每轮上百次全量反序列化 10MB 的世界账本，而账本能长到 10MB，是因为只会追加的合并语义让清理逻辑静默失效。
pubDate: 2026-09-26
category: engineering
tags: ['世界模拟', '性能', '缓存', '可观测性', '排障复盘']
---

有人跟我说「回复太慢了」。我去翻了当天的记录，一轮对话从她发消息到回复送达，实测：

| 时间          | 等了多久                       |
| ------------- | ------------------------------ |
| 17:15         | 143 秒（放着没动之后的第一轮） |
| 17:19 / 17:21 | 61 / 57 秒                     |
| 17:38         | 59 秒                          |
| 18:04 / 18:09 | 62 / 55 秒                     |

第一反应当然是「模型慢」。我这轮 prompt 有两万四千多个 token，用 deepseek，看起来太顺理成章了。

结果一算账，所有 LLM 调用加起来只解释 8 到 12 秒：`fact_validity` 那一步 1-5 秒、主回复的质量链 5-8 秒、Live2D 打情绪标签 1.2 秒。

**剩下的 45 到 50 秒，发生在主模型被调用之前。**用户消息 18:09:03 进来，`fact_validity` 结束是 18:09:50，这 47 秒里几乎没有一次 LLM 调用。花掉它们的是我自己写的代码：每轮上百次全量反序列化一份 10MB 的世界账本，而账本能涨到 10MB，是因为清理逻辑被合并语义静默废掉了。

## 我是怎么把这三本账分开的

如果你也在做 LLM 应用，我建议你先确认自己能回答这三个问题，再谈优化。

### 第一本：这一轮到底花了多久

也就是时间花在哪两个事件之间。我用的是聊天记录档案里服务端的时间戳，`timestamp`（用户消息）配 `delivered_at_ms`（回复送达）。**关键就在两个都必须是服务端时钟。**我一开始用日志文本里的时间推，前端时钟偏移加上 mock 时间源的偏移，量级错了。

### 第二本：这里面有多少是模型调用

`/api/llm/cache_stats` 里留着最近 100 次调用的 label、tokens 和结束时间戳，能复原每一轮的调用序列和间隔。有了它才能算出「总账减去模型账还剩多少」，也就才知道该不该继续查。

### 第三本：剩下的时间 CPU 在干什么

```powershell
py-spy record --pid <PID> --rate 200 --duration 90 --format speedscope
```

采了 9749 个样本，0 错误，火焰图我留着。

顺手还有一条排除法值得记：给 deepseek 发一个最小补全，0.2 秒回来了。**「服务商现在不可用」这个假设，0.2 秒就能证伪，但它在我脑子里停留了一整个下午。**

## 真正卡住的那一步，是我自己加的一个「优化」

火焰图上最粗的那一行是 `_ledger_disk_cache_read`，里面就是 `pickle.loads`，**self-time 27.1%，大约 11 秒**。

事情是这样的。2026 年 9 月 21 号，因为读世界账本太慢，我加了一层磁盘缓存，设计是「命中之后也返回一份私有副本」。

这个决定当时看完全对：调用方拿到的是自己的对象，随便改都不会污染缓存，也不会跨轮串数据。**它是一个正确的隔离决策，被我放在了错误的访问频度上。**

「返回私有副本」的实现方式是每次命中都把整个对象图反序列化一遍。世界账本从 6.8MB 长到 10.3MB 之后，单次是 44 毫秒。

那一次对话要读多少遍呢？拼 prompt 的时候这些函数都在读它，而且大部分是在五人循环里：`_build_schedule_grounding_bundle`、`_plan_runtime_status`、`resolve_character_street_location`、`project_world_state`、`peek_live_spatial_state`、`get_world_ledger_snapshot`、`_build_live_spatial_state_impl`、`get_active_canon_joint_location`……十多个入口乘五个角色，我估算是**每轮 100 到 250 次全量反序列化**。

`get_world_ledger_snapshot` 自己的 docstring 里写着「spatial sampling 最多 480 次/turn」。这行字是我 5 月份写的。

**对，这是同一个坑我第二次掉进去。**2026 年 5 月 17 号就出过一次，当时我留了个探针环境变量 `WORLD_CTX_TRACE=1`，然后处理方式是「加缓存」，治标。它没有回答「为什么会扇出到几百次」这个真正的问题。四个月后，同一个访问模式把我新加的缓存变成了新的瓶颈。

还有一层放大：后台的 `_save_ledger` 在拼 prompt 期间也会发生（其中 `project_world_state` 每次调用都 save 一次），文件 mtime 一翻，我那单槽缓存就失效，于是重新 `json.loads` 10.3MB（9.8%）+ 重新 pickle（8.8%）+ prev 轮转的复制。**读得慢的同时，缓存还一直在失效。**

## 账本凭什么长到 10MB：我的清理逻辑是假的

events 有 14560 条、5.0MB，其中 **89% 是每个 tick 都要写的 `plan_progress` / `state_change` 位置心跳**，大约每天 2150 条。

系统里明明有 `run_entropy_cleanup` 在删旧 events。它不生效的原因在三方合并里：

```python
# _merge_ledger_sequences 只会"追加"
# 当 local == base 或者 added == 空集时，直接返回 current（盘上的现值）
```

清理删掉了旧 events → `local` 是 `base` 的子集、`added` 是空 → 合并返回盘上的 `current` → **删除被合并复活了**。

同样失效的还有 mailbox 修剪、`processed_tick_ids` 截断、ephemeral joint 的 `joint_ids` 截断（后两个另有 finalize 和容量兜底，风险小些）。

> [!WARNING]
> 这条坑要单独强调，因为它在监控上完全看不出来：清理函数正常返回、日志正常打、体积稳步上涨。一个只会追加的合并语义，能让所有修剪逻辑静默地变成空操作。

顺带还有一个纯算法问题：

```python
[item for item in local if item not in base]   # 逐元素 dict 相等比较，O(n²)
```

14k 条 events 的时候，每个 tick 存盘都要秒级。它和上面那个是乘法关系：写一次慢，mtime 翻，于是读更慢。

## 剩下的零头也一起记着

- bge-m3 稠密编码占约 12%（kairos、fact workspace、journal 各自把同一个 query 编码了一遍）。
- `deepcopy` 约 13%（合并基线、workspace 的 kwargs）。
- Live2D 的 `live2d_annotator` 1.2 秒**挂在送达的关键路径上**。
- `quality_chain_empty_retry` 当天触发率 10-30%：模型把回复烧进了 reasoning 通道导致正文是空，只能关掉 thinking 重试，一次加 1 秒到几十秒。17:31 那轮第一次调用产出了 1620 个 completion token，然后判空。

## 修法：让读的人共享，让写的人自己拷

```python
# _LEDGER_DISK_CACHE 现在钉住那个已经物化好的 dict（不再存 pickle）
# _load_ledger() / load_town_ledger() 命中时返回：全进程共享的同一个对象，约定只读
# 校验还是 (path, mtime_ns, size)：任何写入翻了 mtime 就自动失效
def _load_ledger_mutable() -> dict:   # 写的人专用，返回私有 deepcopy
```

读路径零拷贝，一次物化整轮复用。写的人走另一个入口拿私有副本。**写是按 tick 频率跑的（30 分钟一次），读是每秒几百次，这两个频率差四个数量级，所以只有一边需要拷贝。**这个不对称是整套方案能成立的根本原因，不是我的技巧。

失效校验我保留了，所以外部进程写入照样会自动回落重新读盘，不会因为共享对象读到过期世界。缓存刷新的时候加了 `decouple=True`，快照不跟写者的工作副本共享嵌套引用。

### 漏网的写点用守卫兜

```python
# _save_ledger 里做 identity 检查
# 发现传进来的对象就是当前那份共享快照 → 打 [Ledger] SAFETY 告警（带堆栈）
# 然后自动 deepcopy 继续跑，不断生产写路径
```

这里是**告警而不是报错**。我的理由是：漏网写点应该越早发现越好，但为一个漏网点把生产写入打断，代价不成比例。运维手册就一句：看到 `[Ledger] SAFETY: shared snapshot passed to _save_ledger`，去把堆栈里那个调用点迁到 `_load_ledger_mutable()`。

### 两个开关分开留

出问题时能定位到具体是哪一步的决定错了：

| 开关                       | 语义                                          |
| -------------------------- | --------------------------------------------- |
| `TOWN_LEDGER_DISK_CACHE=0` | 完全不用缓存，每次读盘解析                    |
| `TOWN_LEDGER_ZERO_COPY=0`  | 用缓存但命中退回 deepcopy，等价于改动前的行为 |

## 「没人会改它吧」不算依据，所以我把 223 个调用点全过了一遍

只读共享对象最大的风险，是某处写了 `ledger["plans"][c]["steps"].append(...)`，直接把共享的那份改了。这种东西 code review 抓不干净、测试也测不全：它表现为沉默的数据串台，而不是异常。

所以做了全量分类：

```text
全仓 223 个 _load_ledger / load_town_ledger 调用点，逐一分类。
写侧只有 14 处生产站点，全部迁移：
  town_sim 内部 6（append_world_event、run_entropy_cleanup、plan ensure 入口、
                   project_world_state、run_town_cycle_tick、catch_up_town_cycle）
  chat_server 3（启动 sweep、ReplyValidator 两处）
  kairos_scheduler 2（夜猫 roll、晨间发布）
  kairos_brief 1、developer_skill_executor 1、scripts 1
其中两处 mutate-without-save（kairos_brief、developer_skill_executor 的
  _project_world_state_in_ledger）一起迁。
pilots 25 处、mygo 6 处、multi_room_geography 3 处等都是只读 → 零拷贝直接受益。
测试侧 18 处写点同步迁移（否则守卫告警的噪声会把生产信号埋掉）。
```

三件事值得说：

1. **写点比我想的少得多（14/223）。**这是「共享只读」能成立的前提。但在分类之前你不知道，我是分完才敢确定的。
2. **`mutate-without-save` 是最阴的一类。**它改了内存对象却从来不落盘，看起来「没有写副作用」，但在共享快照下它污染的是整个进程的视图。必须专门找。
3. **测试也得迁。**不迁的话我每跑一次测试就刷一堆 `[Ledger] SAFETY`，生产里真出问题时我根本看不见。这条不是洁癖，是为了让告警保持有意义。

## 给合并开一条删除通道，顺便把保留期定成能算的数

```python
ledger["_ledger_replace_keys"] = ["events"]   # 列在里面的 merge key 跳过三方合并，整段用 local 覆盖
# 调用方必须持 _TOWN_LEDGER_LOCK，覆盖 load → mutate → save 整个生命周期
```

约束写在了调用点上：目前唯一用户就是 `run_entropy_cleanup`。**默认合并不传播删除这条规矩，是上面那个坑的直接后果**：谁要删，谁显式声明，而且必须在锁里走完整个来回。

events 分级保留：

```text
心跳类（plan_progress / state_change）        24 小时
语义类（char_interaction / user_interaction /
        agent_message / joint_*）              7 天
```

**24 小时不是我拍的感觉。**依据是：全站最深的读者窗口是 `project_world_state` 的 last-800 条，大约相当于 9 小时，24 小时留了 2.5 倍余量。

> [!TIP]
> 这个做法可以推广：事件的保留期应该由「最深的那个读者要往回看多远」决定，而不是由「我觉得多久之前的数据没人用了」决定。前者可算，后者会拍错，拍错的结果要么丢数据，要么白膨胀。

另外两个决定：

- 删之前先归档到 `world_ledger.events_archive/YYYY-MM.jsonl`（按月分卷、只追加）。**归档写失败的话就不动账本**：清理可以延后，数据丢了不可逆，所以这里的默认方向不该偏向「把清理任务做完」。
- added 的计算改用 `_ledger_sequence_key` 集合判定（跟已有的 `seen` 用同一个 canonical key），语义没变，O(n²) 变成 O(n)。

## 一次性瘦身的执行和对账

```text
先备份到 _backups/ledger_slim_20260924/
events 14776 → 2856（11920 条归档进 2026-09.jsonl，三账一致：2856 + 11920 = 14776）
mailbox 清 357 条
账本 10.4MB → 5.0MB
plans / llm_daily_trees（29 天）/ runtime / joints 完整性逐项核对，无失
```

那行「三账一致」值得单独说：**它不证明数据语义是对的，但它是唯一能在删完之后立刻发现「少了一批或者重了一批」的检查，而成本是一行加法。**任何批量删除前后都该有这一行。

清理也不用我维持：kairos 的每日健康检查里已经在调 `run_entropy_cleanup`，重启之后 24 小时窗口自动生效。

## 验证矩阵里有一格我没测，我把它留着

| 检查 | 结果 |
| --- | --- |
| 提示词门禁（红线要求） | 改前改后 **27 个场景零 diff** |
| 新写的单测 | `test_ledger_zero_copy.py` 7 项（共享身份 / 失效 / 隔离 / 守卫 / 回合并发 / 两个开关）、`test_ledger_entropy_archive.py` 3 项（分级保留+归档、fail closed、空账本） |
| 存量回归 | ledger 相关 147 项、plan 管线 200 项、time_source 门禁 6 项，全过，且一条 `[Ledger] SAFETY` 都没有 |
| **线上到底多快** | **还没测。要等服务重启。** |

最后一行不能因为「测试全绿」就划掉。

> [!IMPORTANT]
> 这次改的是延迟，而所有自动化测试验证的是正确性。提示词零 diff 只说明「模型看到的东西没变」，不说明「变快了」。后者只能靠重启之后跑一次。

```powershell
curl -o NUL -w "%{time_total}s" http://127.0.0.1:8765/api/debug/prompt_breakdown/%E7%81%AF
```

旧代码基线是 21-53 秒，预期 1-3 秒。同时 stdout 里不该出现 SAFETY。

关于重启，这里还有一条我踩过两次的：**改了 `secrets.toml` 必须重启。**我本机出现过 secrets 20:40 写入、8765 进程 19:50 启动，而生产代码里没有 `clear_secret_cache()` 的调用，于是「配置里已经开了」和「进程里实际是关的」同时成立。**看配置不等于看行为**，这条我以为我懂了，其实是在别的地方才真懂。

## 还没做完的，都有明确的下一步

1. **把 `live2d_annotator` 挪出送达的关键路径**（约 1.2 秒/轮）：先送文本，情绪标签异步补。
2. **empty_retry 的触发率在涨**（当天 10-30%，9 月 14 号记录是约 1/40）：怀疑是 deepseek-flash 的行为漂了，要观察，可能要考虑第一轮就直接关 thinking 做个 A/B。
3. `project_world_state` 每次调用都 `_save_ledger`（缓存失效的源头之一）：加 dirty 检查降频。
4. `llm_daily_plans`（0.62MB 的 legacy 镜像）和 `llm_daily_trees` 双写：确认没有旧读者之后退役镜像。
5. bge-m3 一次对话里同一个 query 被编码好几遍：按 `(query, model)` 做轮级缓存。
6. 更大的方向是世界状态的读写收口 + 迁移到 SQLite。这次的「只读快照 + 显式写入口」跟那个方向兼容，可以当成它的前一步。

## 五条我真的记住了的

1. **LLM 应用的延迟要分三本账：总账、模型账、CPU 账。**少任何一本，你都会在「模型慢」上浪费半天。三本账的公共前提是**同一个时钟源**。
2. **一定要有一个能反复触发、又不弄脏状态的入口。**没有它，profile 只是一次随机采样，不是测量。加一个 `/api/debug/*` 通常比你想象的便宜，我这个已经有好几年了，这次全靠它。
3. **「缓存命中返回私有副本」在高读频下就等于「每次都全量反序列化」。**隔离是必要的，但它有单价。当调用次数是每轮几百次、对象是 10MB 的时候，解法不是再加一层缓存，而是换共享语义 + 给写的人单独一个入口。
4. **只会追加的合并语义会让所有修剪逻辑静默失效。**自查方法很简单：如果你的存储里有一个 list 在单调增长，而代码里存在一个清理它的函数，**先怀疑那个函数没生效**，而不是怀疑清理频率不够。给它开一条显式删除通道（并要求持锁走完整个生命周期）是治本。
5. **保留期由最深的读者决定；批量删除要加一行和的对账；不可逆的操作，默认方向应该偏向「什么都不做」。**

最后再回到 17:15 那轮的 143 秒。里面大部分是冷启动的解析和生成，跟这次修复只有一部分关系。但 18:09 那轮的 55 秒里，45 秒是我自己写的代码在读一份我自己写到 10MB 的 JSON。

用户等到的是 55 秒。她不会知道那 45 秒里没有任何一次模型调用，也不该需要知道。
