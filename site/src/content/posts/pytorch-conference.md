---
title: 世界 PyTorch 大会：开源 AI 社区的年度聚会
description: '2026 年的 PyTorch 大会在圣何塞办了两天，三千五百多人到场。这一年大会第一次铺到三个洲，巴黎和上海各办一场，年底东京和北京还有 PyTorch Day，是开源 AI 社区每年一次的线下聚会。'
pubDate: 2026-11-10
category: essays
subcategory: ai-and-people
tags: ['PyTorch', 'AI 与人', '软件工程', '反思']
series: AI 时代手记
seriesOrder: 5
cover: './images/pytorch-conference/keynote-auditorium.jpg'
coverAlt: 'PyTorch 大会 2026 的主会场，从观众席望向舞台'
---

十月二十日到二十一日，2026 年的 PyTorch 大会北美场在圣何塞会展中心连开两天。三千五百多名参会者从一千多家组织赶来，一百多场 session，一百四十四场海报展示，四百多位讲者，把日程排得满满当当。[^1][^2]

对做深度学习的人来说，PyTorch 大会不是一个陌生的名字。它是 PyTorch 基金会的旗舰活动，也是开源 AI 社区一年里最重要的大型线下聚会之一。从这个会里能看到的，不只是一次框架更新，还有整个开源 AI 技术栈正在往哪里走。

## 它到底是一个什么会

这场会的全称是 PyTorch Conference North America 2026，主办方是 PyTorch 基金会。这个基金会是 Linux Foundation 下面的中立组织，管着 PyTorch，也管着 vLLM，DeepSpeed，Ray，Helion 和 Safetensors 这几个项目。[^3]

开幕前一天的 Day 0（10 月 19 日）排了工作坊，PyTorch Associate 培训，LF AI & Data Summit，Jupyter Day，还有几场厂商办的动手课。[^1]

形式还是技术会议的老样子：主舞台的 keynote，分会场的专题分享，海报区，展台。但把它只当成技术会议，会漏掉一半。会场里还有 Community Expo，有 Birds of a Feather 的圆桌，有 Demo Theater 的现场演示，有把维护者请到桌前坐下的 Meet the Developers，有 Women & Non-Binary in PyTorch 的午餐会。有人排队等 Philip Kiely 签那本《Inference Engineering》，晚上的 Flare Party 有酒和 Pub Trivia 知识问答，第二天的 AI Community Bash 请来了 De La Soul。[^1]

一个开源项目的大会，最后总要落到这些看起来和技术无关的事情上。代码是在时区之间异步写出来的，人却需要一年一次在同一个屋檐下同步一次。它一半是技术会议，一半是社区年会。

:::photo wide
![圣何塞会场的社区展区，展台之间挤满了参会者](./images/pytorch-conference/community-expo-hall.jpg)

圣何塞会场的社区展区。图片：PyTorch Foundation
:::

## 一场会是怎么长大的

把时间往回拨，这场会并不是一直这么大。

它的前身是 PyTorch Developer Conference 和 Developer Day。据当时参会者的记录，2019 年 10 月，第二届 Developer Conference 在旧金山办，PyTorch 1.3 就是在那一届发布的。2020 年和 2021 年，活动改到线上，名字也换成了 Developer Day。[^4]

2022 年 12 月 2 日，改名之后的第一届 PyTorch Conference 在新奥尔良办，是 NeurIPS 的卫星活动，线下名额靠申请，其余全部线上直播。官方在那次公告里说，改名是为了翻开新的一章，把整个社区都装进来。[^5]

那一年 9 月 12 日，Linux Foundation 在都柏林宣布成立 PyTorch 基金会，创始成员是 AMD，AWS，Google Cloud，Meta，Microsoft Azure 和 NVIDIA，项目的治理从由一家公司主导，变成由中立基金会托管。[^6]

然后是几年连续的增长。2023 年 10 月 16 日到 17 日，大会在旧金山湾区的 Burlingame 办，官方预告里说，那一届会重点展示 PyTorch 2.1。[^7] 2024 年 9 月 18 日到 19 日，旧金山的 Fort Mason Center，接近一千五百人。[^8]

2025 年 10 月 22 日到 23 日，旧金山 Moscone West，三千四百三十二人，来自一千零二十六个组织，二十二场 keynote，一百零三场 session，一百一十三场海报展示。Ray 在这一年加入了基金会，Dell 和 Qualcomm 成为 Premier 会员。会场里还牵来了几只美洲驼（llama），官方说法是它们用 PyTorch 训练过，专门负责和参会者自拍。[^9]

2026 年，大会搬到圣何塞。

四年时间，从一场邀请制的卫星会，长成了三千多人的旗舰大会。时任基金会执行董事的 Matt White 在 2026 年 2 月的卸任信里写道，他们从一场大约三百人的会议起步，后来在旧金山迎来了三千多名参与者。[^10] 这场会的“世界性”，第一层是规模。

但真正让它变成世界大会的，是 2026 年的另一次扩张。

## 世界不止一个会场

2026 年，PyTorch 大会第一次铺到了三个洲。

四月七日和八日，第一届 PyTorch Conference Europe 在巴黎办，六百多人到场。Helion 和 Safetensors 在这一场正式成为基金会托管项目，ExecuTorch 也被并进 PyTorch Core。[^11]

九月八日和九日，PyTorch Conference China 在上海办，和 KubeCon + CloudNativeCon，OpenInfra Summit 同期，主题是 Open Source for the AI Era，阿里云，蚂蚁集团和寒武纪在这一场加入了基金会。[^12] 十月，大会回到北美主场。

:::photo row
![巴黎会场的主题演讲](./images/pytorch-conference/europe-paris-2026.jpg)
![上海会场的主题演讲](./images/pytorch-conference/china-shanghai-2026.jpg)
![圣何塞会场的主题演讲](./images/pytorch-conference/keynotes-stage.jpg)

2026 年的三个会场，从左到右：巴黎，上海，圣何塞。上海场与 OpenInfra Summit Asia 同期举办。图片：PyTorch Foundation
:::

三场大会之外，基金会在各地还有单日的 PyTorch Day：二月的班加罗尔，十一月的首尔，十二月的东京和北京。[^13][^14] 班加罗尔那场有四百六十人到场。[^15]

同一套项目，同一套议程框架，落到不同地方，长出来的重点并不一样。上海场里，华为讲昇腾和 PyTorch，寒武纪讲 device-agnostic 的多后端基础设施。巴黎场里，围绕 EU AI Act 的合规讨论和欧洲的数据主权问题占了不小的篇幅。[^11] 这些题目在圣何塞不是没有，但不会以同样的比重出现。

“世界性”的第二层，不是把同一份议程复制到三个城市，而是让每个地方的硬件生态和监管环境，都能在同一个项目里被看见。地理上的世界和硬件上的世界，在这一届大会上叠在了一起。

## 台上讲的是芯片，也是语法

:::photo right 40%
![PyTorch 基金会执行董事 Mark Collier 在 2026 年大会舞台上](./images/pytorch-conference/mark-collier-portrait.jpg)

Mark Collier 在 2026 年大会舞台上。图片：PyTorch Foundation
:::

回到圣何塞的主舞台。这一届的主题叫 Accelerating Open Intelligence Together，基金会执行董事 Mark Collier 的开场把话说得很直接：PyTorch 基金会想做的，是让模型能在任何一块芯片上训练，在任何一朵云上服务，给任何一种 agent 用。[^1]

于是 keynote 和会期发布放在一起，像一张芯片地图。Google 和 Meta 一起做的 TorchTPU，是一个原生的 TPU 后端，支持 eager 执行和 torch.compile，训练侧的 TorchTitan，推理侧的 vLLM 和 SGLang，编排侧的 Ray，都已经做过验证。AWS 在会期宣布 TorchNeuron 开放 public beta，跑在 Trainium 上。[^1]

会期发布里还有几条硬件线。IBM 的 torch-spyre 把 Inductor 的决策翻译成 Spyre 能执行的程序。AMD 在十月二十一日更新了 FlyDSL，为 MI350 系列 GPU 接上优化过的 kernel。Arm 把 ExecuTorch 带进了 Cortex-M 微控制器。Qualcomm 的 Chris Lattner 则在 keynote 里讲 MAX 和 Mojo 怎么扩展 PyTorch。[^1]

训练和推理方面也有更新。TorchTitan 扩了模型支持，还通过 TitanRL 把强化学习放回同一套模型实现里。Helion 接入 NVIDIA 的 CompileIQ，把编译器的控制项加进 kernel 自动调优的搜索空间。vLLM 和 DeepSpeed 各自更新了推理和训练的进展。Zephon 演示了弹性数据加载：一个十亿参数的模型，从十六张卡的 checkpoint 换到八张，三十二张，六十四张继续训练，每个 global batch 的 SHA-256 都和原来一致。[^1]

最能说明问题的是 Shopify 的 Cody Mazza-Anthony 讲的那个案例。他们用 PyTorch 和 vLLM 搭了一个持续学习的闭环，每天把生产环境里的失败压进模型权重，堆出来的效果超过了直接使用前沿模型，服务的成本降了百分之九十六。[^1]

大会结束一周之后，PyTorch 2.15 正式发布，由五百八十三位贡献者提交了三千一百一十七个 commit，从 2.14 算起。[^16] 台上讲的方向，很快就变成了版本号里的改动。

把这些放在一起看，大会的关键词已经从“更好用的框架”变成了“任何芯片，任何云，任何 agent”。可以说，PyTorch 在研究者的工作里已经成了默认选项。接下来的问题是，它能不能成为模型和硬件之间的那层共同语法。Meta 和 Lightning AI 的人在 2025 年写过一篇文章，标题就叫“PyTorch：AI 的开放语言”，说的其实是同一件事。[^17]

Mark Collier 在宣布九家新会员时说：“当参与者，项目和组织越多地一起协作，开放系统就学得越快，收益也会复利式累积。”[^18] 这句话大概可以概括整场大会的基调。

## 主舞台之外

技术议程之外，这场大会还有另一半内容，属于人和人之间。

一百四十四场海报展示，大多是社区自己交上来的作业。它们不全是论文里的结果，更多是性能优化，端侧部署，agent 工作流这些一线问题：某个模型在特定硬件上怎么再快一点，某个框架在真实业务里怎么少踩一个坑。海报区的好处是可以直接找到做事的人，问一句“你们后来是怎么解决的”。[^1]

Meet the Developers 把这种聊天变得正式了一点。维护者坐在桌前，参会者可以带着问题坐下来聊一会儿。Birds of a Feather 的圆桌更像临时的兴趣小组，聊到哪算哪。Demo Theater 全天都有现场演示，展台前常常围满人。[^1]

Contributor Awards 是大会专门为社区贡献者留出的环节。2026 年的获奖名单里，有杰出大使 Jiho Kim，有新人 Jiangyun Zhu 和 Johannes Zeiser，有 Superhero Thomas Ortner，还有三位 Innovator。[^1] 这些名字平时藏在 commit 和 review 里，一年一次被念出来。开源社区用这种方式提醒所有人，项目是具体的人一点点做出来的。

:::photo wide
![2026 年 PyTorch Contributor Awards 的获奖者在台上合影](./images/pytorch-conference/contributor-awards.jpg)

2026 年 PyTorch Contributor Awards 的获奖者。图片：PyTorch Foundation
:::

这些环节不产生论文，也不发布版本，却是社区信任的来源。

:::photo left 38%
![会场走廊里戴着火焰图案渔夫帽的参会者](./images/pytorch-conference/flare-hats-portrait.jpg)

会场走廊里戴着火焰渔夫帽的参会者。图片：PyTorch Foundation
:::

在走廊里叫住维护者问上的那几分钟，Birds of a Feather 桌上临时冒出来的争论，排队时和陌生人搭上的话，都是录播拍不到的部分。这些没有被安排进议程的时刻，同样是大会的内容。

:::photo wide
![AI Community Bash 上的 De La Soul 演出，台下观众举着手臂](./images/pytorch-conference/de-la-soul-bash.jpg)

大会第二天的 AI Community Bash，De La Soul 在台上。图片：PyTorch Foundation
:::

## 2027 年，圣何塞

大会结束之后，官网挂出了下一届的日期：2027 年 10 月 6 日到 7 日，圣何塞。[^1]

回顾 2026 年，PyTorch 大会从一场北美会议变成了一张覆盖三个洲的网：年初的班加罗尔，四月的巴黎，九月的上海，十月的圣何塞，年底的东京和北京。同一套项目，同一套工具，被不同地区的硬件生态和开发社区各自接住，再反馈回同一个上游。

这也是开源大会和产品发布会不一样的地方。产品发布会宣布的是下一步要卖什么，开源大会摊开的是一群人正在做什么。芯片，编译器，训练，推理，模型，还有刚入门的人，一年一次在同一个日程表上对一次位置。

图片来源：封面与巴黎会场的照片来自 PyTorch Foundation 的官方 Flickr 账号 pytorchevents，按 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 协议使用，图片经过裁剪，缩放与压缩。其余现场照片取自 PyTorch Foundation 的官方博客与活动页，页面未标注授权协议，版权归 PyTorch Foundation 所有，这里仅作非商业的介绍使用。

[^1]: PyTorch Foundation，[《PyTorch Conference North America 2026: Accelerating Open Intelligence Together》](https://pytorch.org/blog/pytorch-conference-north-america-2026-accelerating-open-intelligence-together/)，2026-10-22。
[^2]: Linux Foundation Events，[《PyTorch Conference North America》活动页](https://events.linuxfoundation.org/pytorch-conference-north-america/)与[完整日程页](https://events.linuxfoundation.org/pytorch-conference-north-america/program/schedule/)，访问于 2026-11-10。
[^3]: [PyTorch Foundation 官网](https://pytorch.org/foundation/)，访问于 2026-11-10。
[^4]: Gradient Flow，[《Notes from the Second PyTorch Developer Conference》](https://gradientflow.com/notes-from-the-second-pytorch-developer-conference/)，2019-10-10。PyTorch Foundation，[《PyTorch Developer Day 2020》](https://pytorch.org/blog/pytorch-developer-day-2020/)，2020-11-01，以及[《PyTorch Developer Day 2021》](https://pytorch.org/blog/pytorch-developer-day-2021/)，2021-08-23。PyTorch 1.3 的发布见 [GitHub v1.3.0](https://github.com/pytorch/pytorch/releases/tag/v1.3.0)，2019-10-10。
[^5]: PyTorch Foundation，[《Announcing PyTorch Conference 2022》](https://pytorch.org/blog/announcing-pytorch-conference-2022/)，2022-09-26。
[^6]: The Linux Foundation，[《Meta Transitions PyTorch to the Linux Foundation》](https://www.linuxfoundation.org/press/press-release/meta-transitions-pytorch-to-the-linux-foundation)，2022-09-12。
[^7]: PyTorch Foundation，[《PyTorch Conference 2023: Join us in San Francisco October 16-17》](https://pytorch.org/blog/pytorch-conference-2023/)，2023-05-16。
[^8]: PyTorch Foundation，[《PyTorch Conference 2024 Recap: On Fire》](https://pytorch.org/blog/pytorch-conference-2024-recap/)，2024-10-02。
[^9]: PyTorch Foundation，[《Accelerating the Future of Open Source AI: PyTorch Conference 2025 Recap》](https://pytorch.org/blog/pytorch-conference-2025-recap/)，2025-11-12。
[^10]: PyTorch Foundation，[《PyTorch Foundation: The Next Chapter Together》](https://pytorch.org/blog/pytorch-foundation-the-next-chapter-together/)，2026-02-11。
[^11]: PyTorch Foundation，[《PyTorch Conference Europe 2026: A Landmark Moment for Open Source AI in Paris》](https://pytorch.org/blog/pytorch-conference-europe-2026-a-landmark-moment-for-open-source-ai-in-paris/)，2026-04-15。
[^12]: PyTorch Foundation，[《PyTorch Conference China 2026: Advancing the Open Source AI Stack》](https://pytorch.org/blog/pytorch-conference-china-2026-advancing-the-open-source-ai-stack/)，2026-09-09。
[^13]: PyTorch Foundation，[《PyTorch Day Japan 2026 Comes to Tokyo on December 10》](https://pytorch.org/blog/pytorch-day-japan-2026-comes-to-tokyo/)，2026-09-17。
[^14]: PyTorch Day China 与 PyTorch Day Korea 的日期和地点见[北京活动页](https://pytorch.org/event/pytorch-day-china-2026/)与[首尔活动页](https://pytorch.org/event/pytorch-day-korea-2026/)。
[^15]: PyTorch Foundation，[《PyTorch Day India 2026 Recap》](https://pytorch.org/blog/pytorch-day-india-2026-recap/)，2026-02-10。
[^16]: PyTorch Foundation，[《PyTorch 2.15 Release Blog》](https://pytorch.org/blog/pytorch-2-15-release-blog/)，2026-10-28。
[^17]: Joe Spisak，Luca Antiga，[《PyTorch: The Open Language of AI》](https://pytorch.org/blog/pytorch-the-open-language-of-ai/)，2025-05-07。
[^18]: PyTorch Foundation，[《PyTorch Foundation Welcomes Nine New Members as Momentum Builds Around Open Source AI Center of Gravity》](https://pytorch.org/blog/pytorch-foundation-welcomes-nine-new-members-as-momentum-builds-around-open-source-ai-center-of-gravity/)，2026-10-20。
