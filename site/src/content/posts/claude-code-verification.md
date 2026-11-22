---
title: 'Claude Code 团队怎么考虑验证'
description: 'Claude Code 九成的代码由 Claude 编写和评审，验证于是成了能不能放心把更多活交给它的前提。这篇讲 Claude Code 团队怎么用端到端测试，属性测试和差分测试让 agent 拿得出证据来验证自己的工作，又怎么防住验证环节本身被糊弄：让改动碰不到审判它的判据，把漏掉的 bug 沉淀成规则，再用真实事故回测评审者。'
pubDate: 2026-11-18
author: 'Addy Osmani'
category: curation
tags: ['软件工程', 'Claude Code', '测试', '方法论', 'Anthropic团队·Addy Osmani']
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 工程博客 [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2026 年 11 月 16 日，作者是 Addy Osmani。译文按原意译出，术语和小标题做了中文化，原文里的外链都保留着。原文配图只有一张，用的是原图，图下加了一行中文小字，说明这张图该看哪里。版权归原作者和 Anthropic 所有，译文只作学习交流之用。文中带铅笔图标的注解是我加的补充说明，不属于原文。

:::bi

On the Claude Code team, the vast majority of our code (~90%) is written and [reviewed by Claude](https://claude.dev/blog/solving-code-review-at-anthropic/). At this scale, how we equip our agents to verify their work with evidence becomes extremely important.

:::zh

在 Claude Code 团队里，我们绝大多数代码（约 90%）由 Claude 编写，也由 [Claude 评审](https://claude.dev/blog/solving-code-review-at-anthropic/)。在这个体量上，怎么让 agent 拿得出证据来验证自己的工作，就变得极为重要。
:::

:::bi

Verification loops are the building block that lets you delegate more work to Claude. Without them, you can really only run one or two Claudes at a time, because you have to check everything yourself. With them, you can run dozens or hundreds in parallel.

:::zh

验证闭环是你把更多活交给 Claude 的基石。没有它，你一次其实只能同时跑一两个 Claude，因为所有东西都得自己检查。有了它，你可以并行跑几十个甚至几百个。
:::

:::bi

That’s because giving agents a [way to verify their output](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills) is an effective way to improve quality. In internal testing around structured file generation, having a separate grader check Claude’s work against a rubric [improved task success by up to 10 points](https://claude.com/blog/claude-managed-agents) over a standard prompting loop, with the largest gains on the hardest problems.

:::zh

因为给 agent 一条[验证自己产出的路](https://claude.com/blog/building-verification-loops-in-claude-code-with-skills)，是提升质量的有效办法。在结构化文件生成的内部测试里，让一个独立的评分器按评分标准检查 Claude 的产出，比起标准的提示词闭环，[任务成功率最多提高了 10 个百分点](https://claude.com/blog/claude-managed-agents)，并且越难的问题收益越大。
:::

:::bi

What was once expensive to verify (tests, benchmarks, specs, real end-to-end runs) is now cheap to request from an agent. Like code, agents can quickly generate tests, benchmarks, and specs. And once generated, these tests and benchmarks run as software so they can be run frequently without using many additional tokens.

:::zh

过去验证起来很贵的东西（测试，基准，规格，真实的端到端运行），现在让 agent 来做很便宜。和写代码一样，agent 能很快生成测试，基准和规格。而且一旦生成出来，这些测试和基准就是软件，可以频繁跑，不用再多花多少 token。
:::

:::bi

You can also close the verification loop by using the results to improve the agent’s performance on that task. For example, if an agent repeatedly fails a test that checks logs for user data, you can create a hook or a more explicit rule in your CLAUDE.md to avoid future issues. This (mostly) stops issues from happening again.

:::zh

你还能用验证结果反过来提升 agent 在这类任务上的表现，把闭环合上。比如某个 agent 反复在一个“检查日志里有没有用户数据”的测试上失败，你可以加一个 hook，或者在 CLAUDE.md 里写一条更明确的规则，避免以后再出现同样的问题。这（基本）能挡住问题再次发生。
:::

:::bi

So if verification is critical to producing quality code at a high velocity, what types of tests should you use and how should you apply them across your pipeline? This article answers those questions and also shares the process used by the Claude Code team.

:::zh

那么，既然验证对高速产出优质代码这么关键，该用哪几类测试，又该怎么把它们铺到整条流水线上？这篇文章回答这两个问题，也会介绍 Claude Code 团队自己的做法。
:::

## 测试并非生来平等：三类值得投入的测试（Not all tests are created equal: 3 tests worth investing in）

:::bi

No matter which test type you choose, there are a few failure modes to avoid.

:::zh

不管选哪种测试，都有几种失败模式要避开。
:::

:::bi

If your tests are flaky you’ll train the agent to run them again rather than fixing the failing code. If your tests are slow, the agent will do fewer tests across batches which can make pinpointing issues difficult. Heavier tests are best deployed before you’ve committed the changes.

:::zh

测试不稳（flaky），你就是在训练 agent 重跑一遍，而不是去修坏掉的代码。测试太慢，agent 每批能跑的测试就少，定位问题会变难。重一些的测试最好放在提交改动之前跑。
:::

:::annotation
不稳定的测试比慢测试更危险。慢只是让人少跑几轮，不稳定却会把“重跑一遍”训练成 agent 的条件反射，而重跑恰好是掩盖真问题最省事的办法。
:::

:::bi

Now, here are the three types of tests I think are most worth investing in.

:::zh

下面这三类测试，是我认为最值得投入的。
:::

### 端到端测试（E2E tests）

:::bi

If you have to focus on one test type, pick end-to-end. These tests describe real user flows like adding an item to a cart, checking out, and moving to a confirmation page.

:::zh

如果只能专注一类测试，选端到端。这类测试描述真实的用户流程，比如把商品加进购物车，结账，再跳到确认页面。
:::

:::bi

The reason E2E tests are so effective is that they are difficult to fool–either the whole feature works or it doesn't. They also have definitive done criteria and can concretely tell you what’s broken.

:::zh

端到端测试之所以有效，是因为它很难被糊弄：整个功能要么能用，要么不能用。它还有明确的完成标准，能具体告诉你哪里坏了。
:::

:::figure
![单元测试与端到端测试失败时的信息对比](./images/claude-code-verification/fig-01.png)

A unit test may show “Error: Timeout after 30 seconds,” but an end-to-end test can show a screenshot with a description of what’s broken.

:::zh
图 1：左半边是一次失败能拿到的全部信息，只有一行超时。右半边同样是失败，却留下了试跑记录，截到了灰掉的 Place order 按钮，还给了一句“支付表单没加载出来”的说明。两边的差别不在测试跑没跑，而在失败时能留下多少证据。
:::
:::

:::bi

While unit tests are faster and less flaky, it’s possible to pass them and still break the feature. This is because both the agent and the test don’t understand the full task.

:::zh

单元测试更快，也更稳定，但它可能全绿，功能照样是坏的。原因是 agent 和测试都没有理解完整任务。
:::

:::bi

With E2E tests, it is effective to give your agent hands and eyes on the real running system. You can use a skill to boot, drive, and inspect the app with tools like [CDP](https://chromedevtools.github.io/devtools-protocol/), simulators, or API harnesses.

:::zh

用端到端测试时，很有效的一种做法是让 agent 在真实运行的系统上有手也有眼。你可以写一个 skill，借 [CDP](https://chromedevtools.github.io/devtools-protocol/)，模拟器或者 API 测试台这些工具来启动，驱动并检查应用。
:::

:::bi

The feature map can serve as a guide and grading rubric for agents as they typically list features from the user’s point of view with descriptions of paths, keyboard shortcuts, selectors, and expected results.

:::zh

功能地图可以当作 agent 的向导和评分标准，因为它通常从用户视角列出功能，并写清路径，快捷键，选择器和预期结果。
:::

### 属性测试：不能破的约束（Property tests: constraints that can’t break）

:::bi

A lot of tests are based on what you thought might go wrong. Property tests look at the edge cases that people tend to miss, which is where agents often fail.

:::zh

很多测试基于“你觉得可能会出问题的地方”。属性测试看的是人们容易漏掉的边界情况，而这正是 agent 经常翻车的地方。
:::

:::bi

You start by writing a statement you think can’t fail and then use a test library ([fast-check](https://fast-check.dev/) for JS/TS, [Hypothesis](https://hypothesis.readthedocs.io/en/latest/) for Python, [proptest](https://proptest-rs.github.io/proptest/) for Rust, etc.) to generate thousands of inputs that try to prove otherwise.

:::zh

你先写一句你认为不可能出错的说法，再用测试库（JS/TS 用 [fast-check](https://fast-check.dev/)，Python 用 [Hypothesis](https://hypothesis.readthedocs.io/en/latest/)，Rust 用 [proptest](https://proptest-rs.github.io/proptest/)，等等）生成成千上万个输入，试着推翻它。
:::

:::bi

There are many properties in virtually every software project like:

:::zh

几乎每个软件项目里都有大量这类属性，例如：
:::

:::bi

- **Round-trip encoding**: “if you encode X then decode it back, you get X.” This works for parsing and serialization as well.
- **Invariants**: Things that must always be true, like “account balance can never become negative.”
- **Idempotency**: Doing an action (migration, normalization, retry) twice has the same effect as doing it once.
- **Equivalence**: Optimized code produces the same result as naive but correct code.

:::zh

- **往返编码**：把 X 编码再解码回来，应该还是 X。解析和序列化也适用。
- **不变量**：必须始终成立的事，比如账户余额永远不会变成负数。
- **幂等**：迁移，归一化，重试这类动作做两次，效果和做一次一样。
- **等价**：优化过的代码，结果应该和朴素但正确的代码一样。
:::

:::bi

Property libraries are a great way to keep agents honest by using edge cases that aren’t created with the same bias as the agent that created the original code. They are also particularly helpful for rewrites when the spec has drifted from production behavior and is no longer a reliable source for verification.

:::zh

属性测试库是让 agent 保持诚实的好办法，因为它用的边界情况不是由写原代码的那个 agent 带着同样的偏见造出来的。它对重写也特别有用，尤其是规格已经和线上行为脱节，不再能当可靠的验证依据的时候。
:::

:::annotation
写死的用例只能覆盖你想得到的输入，属性测试把输入空间交给库去随机生成，覆盖的正是人和写代码的 agent 都没想到的地方。这也正是它比多补几条手写用例更划算的原因。
:::

### 差分测试：拿旧系统当标准答案（Differential tests: the old system is the oracle）

:::bi

Differential tests are particularly effective for [large-scale migration](https://claude.com/resources/articles/ai-code-migration) use cases where functionality is expected to remain the same. For these tests, you run both the old system and the new system with the same inputs and see if you get different results. If you do, there is a bug or breaking change that needs to be fixed.

:::zh

差分测试特别适合[大规模迁移](https://claude.com/resources/articles/ai-code-migration)这类功能应当保持不变的场景。做法是让旧系统和新系统吃同一批输入，看结果有没有不同。只要有不同，就说明存在 bug 或者破坏性变更，需要修掉。
:::

:::bi

The key for differential tests is to use randomly generated inputs or a sample of production traffic. You’ll also want to normalize irrelevant factors like whitespace and keep a list of approved changes for situations where the new environment should differ from the old.

:::zh

差分测试的关键，是用随机生成的输入，或者从生产流量里采样。另外要把空白这类无关因素归一化，并维护一份“允许的变更”清单，对应那些新环境本来就该和旧环境不一样的地方。
:::

## Claude Code 团队怎么想验证这件事（How the Claude Code team thinks about verification）

:::bi

We have previously written about [how code review works at Anthropic](https://claude.dev/blog/solving-code-review-at-anthropic/), but this article aims to go deeper on how we verify our work.

:::zh

我们之前写过 [Anthropic 的代码评审怎么运作](https://claude.dev/blog/solving-code-review-at-anthropic/)，这篇想更深入地讲讲我们怎么验证自己的工作。
:::

### 验证就是把改动跑起来（Verification means running the change）

:::bi

Running the app end to end matters more than tests. You wouldn't ship an iOS change without trying it in a simulator, and the same goes for Claude.

:::zh

端到端地把应用跑起来，比写测试更重要。你不会没在模拟器里试过就发一个 iOS 改动，对 Claude 也一样。
:::

:::bi

Claude can test the whole app the way a human or QA engineer would. Ask it to use the Claude Chrome extension for web changes, an iOS or Android MCP for mobile, computer use for desktop, or to run the service locally for backend work.

:::zh

Claude 可以像人或者 QA 工程师那样把整个应用测一遍。网页的改动让它用 Claude Chrome 扩展，移动端用 iOS 或 Android 的 MCP，桌面端用 computer use，后端就让它把服务在本地跑起来。
:::

:::bi

To codify how to start the simulator or run your app, create a skill called verify. Put it in a .claude/skills/ folder in your repo, as close to the relevant code as you can, and add as many as you need. Claude knows to use the verify skill before committing changes.

:::zh

为了把“怎么启动模拟器，怎么跑应用”固定下来，写一个叫 verify 的 skill。放在仓库里的 .claude/skills/ 目录下，尽量离相关代码近一点，需要几个就写几个。Claude 知道要在提交改动之前先用 verify skill。
:::

:::bi

Then invest in making your verify skill fast and reliable. Ask Claude to iterate on it and stress test it. It's your smoke test harness, so you want it rock solid.

:::zh

然后要投入精力，让这个 verify skill 又快又稳。让 Claude 反复迭代它，压测它。它就是你的冒烟测试台，得做到极其可靠。
:::

:::bi

When you give Claude a way to smoke test its changes end to end, you get much better results. You'll see it iterate and catch real mistakes faster, the way a human would. This is how we test nearly all changes at Anthropic.

:::zh

当你给了 Claude 一个端到端冒烟测试自己改动的方式，结果会好很多。你会看到它像人一样，更快地迭代，并抓到真实的错误。Anthropic 里几乎所有改动都是这么测的。
:::

### 失败的测试需要人来接手（Failing tests require human attention）

:::bi

Nobody can read every change, so we use failures as one way to decide what needs a person. Claude runs the checks and tries to fix anything that fails. If a check is still failing after three rounds, Claude stops and brings in a human.

:::zh

没有人能读完每一个改动，所以我们把失败当成判断“哪里需要人”的一种方式。Claude 跑检查，并尝试修掉一切失败。如果一个检查三轮之后还在失败，Claude 就停下来，请人来处理。
:::

### 代码的主人自己写检查（Code owners write their own checks）

:::bi

The people who own the code write the checks for it, and refine them until they flag what the owner would flag. When a check pulls in a reviewer, it should say why, so they don't have to work it out from the diff.

:::zh

拥有代码的人为它写检查，并且一直调到它能标出“主人会标出来的问题”。当一个检查拉来评审者时，它应该说明为什么，这样评审者不用自己从 diff 里猜。
:::

### 可靠性检查按 diff 触发（Reliability checks trigger on the diff）

:::bi

We maintain a reliability checklist with 39 items, each with a trigger that can be read from a diff, a check, and the incidents or PRs behind it. One is “--resume loads old transcripts.” When session storage or message types change, we ask whether a new field loads safely, since older transcripts won’t have it.

:::zh

我们维护一份 39 条的可靠性清单，每条都配一个能从 diff 里读出来的触发条件，一项检查和它背后的线上事故或 PR。其中一条是“--resume 要能读旧的会话记录”。当会话存储或者消息类型发生变化时，我们会问这个新字段能不能安全加载，因为旧的会话记录里没有它。
:::

:::annotation
清单的价值不在条数，而在每条都能从 diff 里读出触发条件。写在本子上的“注意事项”没人会翻，能自动匹配出 3 到 10 条的清单，才会每一轮都真的被跑。
:::

:::bi

Claude reads the diff and checks only the items whose trigger matches–usually 3 to 10–so nobody has to memorize past outages.

:::zh

Claude 读 diff，只检查触发条件对上的那几条，通常是 3 到 10 条，这样没人需要背下过去的每一次事故。
:::

### 一个评审者，多轮评审（One reviewer, multiple rounds）

:::bi

We don't try to improve reviews by stacking on more reviewers. Adding a second, more expensive, reviewer on top of the primary one is often a worse approach than tuning the primary. Instead, we have a [REVIEW.md](https://code.claude.com/docs/en/code-review-customize) that says what the reviewer should pay attention to for this code.

:::zh

我们不靠堆更多评审者来提升评审质量。在主评审之上再加一个更贵的第二评审，往往不如把主评审调好。我们的做法是有一份 [REVIEW.md](https://code.claude.com/docs/en/code-review-customize)，写清针对这段代码评审应该注意什么。
:::

:::bi

We also think review and verification rounds should build on each other. We point each pass at context from earlier rounds and past failures rather than re-checking everything from scratch. It’s cheaper and finds more.

:::zh

我们还认为，评审和验证的每一轮都应该建立在前一轮上。每一轮都指向前面几轮的上下文和过去的失败，而不是从头把所有东西重新查一遍。这样更便宜，也能找到更多问题。
:::

### 改动不能修改自己的检查（Changes can't modify their own checks）

:::bi

If a change can modify the check that judges it, the check is broken. Code Review reads the REVIEW.md file from the base or default branch, [never from the pull request's changes](https://code.claude.com/docs/en/code-review-customize). The Claude Code team ensures the rules that gate changes are on a branch that the change can't modify.

:::zh

如果一个改动能改掉审判它的那道检查，这道检查就废了。Code Review 从基线分支或者默认分支读 REVIEW.md 文件，[绝不读 PR 里的改动](https://code.claude.com/docs/en/code-review-customize)。Claude Code 团队保证把关改动的规则放在这个改动碰不到的分支上。
:::

:::annotation
一个能自己改判据的门禁，等于没有门禁，因为它随时可以把“通过”的定义改宽。把 REVIEW.md 放在改动碰不到的分支上，审的就不只是代码，还有规则本身。
:::

:::bi

The Claude Code team also reserves reviews for commits. If someone's pushing while the review is happening, then the review result is no longer useful. A passing review on an out-of-date commit means nothing.

:::zh

Claude Code 团队还把评审锁定在具体的提交上。如果评审进行的时候有人还在推新提交，这次评审的结果就没用了。对一个过期的提交给出通过，等于什么也没说。
:::

:::bi

The team also runs cheap checks first. If an agent pushes before testing locally, it has spent shared review and CI time when it could have caught the bug itself. On our team, Claude runs the tests, build, and linter before opening a pull request. You can enforce this with a [hook](https://code.claude.com/docs/en/hooks) that runs the tests when Claude finishes, or a [/goal](https://code.claude.com/docs/en/goal) of a passing test suite.

:::zh

团队还先跑便宜的检查。如果一个 agent 没在本地测试就推上来，它就占用了大家共享的评审和 CI 时间，而那个 bug 本来它自己就能抓到。在我们团队，Claude 开 PR 之前要跑测试，构建和 linter。你可以用一个 [hook](https://code.claude.com/docs/en/hooks)，在 Claude 结束时跑测试，或者设一个“测试全部通过”的 [/goal](https://code.claude.com/docs/en/goal)，把这套强制起来。
:::

### 新门禁先跑观察模式（Start a new gate in observe mode）

:::bi

In our own repos, we stamp each commit with how it was verified. The stamp even includes "none" so we can query for commits that weren't verified.

:::zh

在我们自己的仓库里，每个提交都会盖上它是怎么被验证的戳。戳里甚至有“none”，这样我们能查出哪些提交根本没验证过。
:::

:::bi

We've also created a commit gate that can block a commit if the session did not contain /code-review or /verify. We've set it up with off, observe, and enforce modes.

:::zh

我们还做了一道提交门禁，如果这个会话里没有出现过 /code-review 或者 /verify，它就可以拦住提交。门禁有三档：off，observe 和 enforce。
:::

:::bi

Observe mode will log what would have been blocked, so that we can review any false positives and ensure no one is impacted.

:::zh

观察模式会把本来会被拦住的情况记进日志，方便我们复查误报，确认没有人被误伤。
:::

:::bi

Enforce mode will block the commit. Any commit can carry an explanation in its message as to why it didn't get verified. If commits have been blocked twice in the session, the next one will be allowed through so Claude doesn't get stuck – Claude Code isn't perfect.

:::zh

强制模式会真的拦住提交。任何提交都可以在提交信息里解释自己为什么没验证。如果这个会话里已经被拦过两次，下一个提交会放行，免得 Claude 卡死，Claude Code 也不是完美的。
:::

:::annotation
新门禁先跑观察模式，这一步值得抄。先看误报再决定拦不拦，比一上来就卡人稳妥得多。“被拦两次就放行”这条兜底，也说明度在哪里：门禁是为了拦住错误，不是为了把人锁死。
:::

### 拿真正重要的事来测你的检查（Test your checks on what actually matters）

:::bi

The Claude Code team also regularly reviews the reviewers. We track how many merged changes were reverted, how many changes a maintainer rejected before merging, and a size-matched subset of changes that have stayed clean.

:::zh

Claude Code 团队也会定期评审“评审者”。我们跟踪合并之后的改动有多少被回滚，多少个改动在合并前被维护者打回，以及一组体量相当，一直没出问题的改动。
:::

:::bi

This can also be done with a formal evaluation. In our [code review post](https://claude.dev/blog/solving-code-review-at-anthropic/), we described how the Code Review team has set up an evaluation based on previous incidents and reverts. They recreate the repo to the state at the time of review for each example, and provide a one-sentence answer key to what the bug was. Only findings that correctly describe the bug in question get points. They use merged and stable changes as a control to prevent over-flagging. Their tuning set is split out from the fixed test set they use to evaluate their system.

:::zh

这件事也可以用一套正式评测来做。在那篇[代码评审的文章](https://claude.dev/blog/solving-code-review-at-anthropic/)里，我们讲过 Code Review 团队怎么用过去的事故和回滚搭评测。他们为每个样例把仓库还原到评审当时的状态，并提供一句话的答案，说明那个 bug 是什么。只有正确描述了这个 bug 的发现才得分。他们用已合并且稳定的改动作对照组，防止过度报警。他们的调参集和用来评测系统的固定测试集是分开的。
:::

:::bi

They also evaluated the recall rate for raw findings, post-verification, and final review separately. This lets them see if the system is losing bugs it had already found. Any evaluation that treats all these as one end-to-end score won't capture this nuance.

:::zh

他们还分别评测了原始发现，验证之后和最终评审三个阶段的召回率。这样能看出系统有没有把已经找到的 bug 弄丢。把所有阶段合成一个端到端分数的评测，是看不出这层区别的。
:::

:::annotation
把原始发现，验证之后和最终评审的召回率分开看，是很实用的一个视角。只看端到端分数，系统在中间步骤丢掉已经找到的 bug 这件事会被完全藏起来。
:::

:::bi

In addition to validity, the other dimension we care about is how important it is to make the change. A good reviewer will catch most things that are technically correct, but people care about whether a given bug is a must-fix, a should-fix, or a nit.

:::zh

除了准不准，我们在意的另一个维度是：这个改动到底有多重要。好的评审者抓到的大多数问题，技术上都站得住脚。但人真正在意的是，这个 bug 到底属于必须修，应该修，还是只是个吹毛求疵的建议。
:::

:::bi

Code Review has this exact idea, and it will tag things as [Important, Nit or Pre-existing](https://code.claude.com/docs/en/code-review-pull-requests). The "pre-existing" tag means that the reviewer shouldn't hold the author responsible for something that was already a bug.

:::zh

Code Review 就有这个想法，它会把问题标成 [Important，Nit 或 Pre-existing](https://code.claude.com/docs/en/code-review-pull-requests)。pre-existing 这个标签的意思是，评审者不该让作者为一个本来就存在的 bug 负责。
:::

:::bi

Finally, the Claude Code team tunes recall up to the point where the next improvement would be overfitting to the eval rather than actually catching bugs.

:::zh

最后，Claude Code 团队把召回率往上调，调到那个临界点：再往上一步就只是在过拟合评测，而不是真的多抓 bug。
:::

### 把漏掉的问题变成规则（Turn misses into rules）

:::bi

In the Claude Code repo, we have two methods of turning missed cases into rules. The first is extracting patterns in human code review comments and PR reverts to identify common issues. These must occur in at least two PRs and be identifiable from a diff to be considered a potential rule. Three agents will try to disprove them, and they will be reviewed and approved by a human in a PR.

:::zh

在 Claude Code 仓库里，我们有两种把漏掉的情况变成规则的办法。第一种是从人工代码评审意见和 PR 回滚里找模式，识别共性问题。这些问题必须至少在两个 PR 里出现过，并且能从 diff 里认出来，才算候选规则。会有三个 agent 尝试证伪它，最后由人在 PR 里评审通过。
:::

:::bi

The second method is replaying three bug finders against a PR that is associated with a known incident. If at least two find the bug, it's a detectable bug. If the bug is missed on a small diff, this is a gap that is worth turning into a rule in REVIEW.md.

:::zh

第二种办法是，拿三个找 bug 的 agent 去重放一个和已知事故关联的 PR。如果至少两个找到了那个 bug，它就是一个可检出的 bug。如果这个 bug 在一段小 diff 上被漏掉，这个缺口就值得变成 REVIEW.md 里的一条规则。
:::

:::bi

Flaky tests get the same treatment. Claude can't skip them, add sleeps or retry until they pass. If it can't find the root cause, it deletes the test and writes down why.

:::zh

不稳定测试也照此处理。Claude 不能跳过它，不能加 sleep，也不能重试到它通过为止。如果找不到根因，就删掉这个测试，并写下原因。
:::

:::bi

Rules need cleaning up too. Test suites, verification steps and .md files only grow if you let them, so we tidy them up on a routine.

:::zh

规则也需要清理。测试套件，验证步骤和 .md 文件，你不拦着它们就只会越长越多，所以我们会定期整理。
:::

## 好测试带来好结果（Good tests, good results）

:::bi

We’ve found that giving your agent a way to verify its work with a strong feedback loop makes all the difference. Treat your verification layer like you would any other system. Keep it out of reach of the changes they judge, grade them against the bugs that mattered to you, and write down lessons when they miss something so that it doesn’t happen more than once, and prune those lessons so they stay worth running.

:::zh

我们发现，给 agent 一个能靠强反馈闭环验证自己工作的方式，效果会天差地别。把你的验证层当成任何一个正式系统来对待。让它碰不到它所审判的那些改动，拿真正让你在意的 bug 来给它打分，它漏掉问题时记下教训，让同一个问题不要发生第二次，并且不断修剪这些教训，让它们始终值得跑。
:::

:::bi

Do that and your job shifts from reading every diff to defining what “done” looks like and reviewing the evidence, which is what lets you run many Claudes at once.

:::zh

做到这些，你的工作就从读每一份 diff，变成定义“做完”是什么样子，然后审阅证据。也正是这样，你才能同时跑很多个 Claude。
:::
