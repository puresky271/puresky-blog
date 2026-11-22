---
title: 'vLLM：从显存分页到大模型推理服务'
description: '从一次生成请求出发，认识 vLLM 如何管理 KV Cache，调度并发请求并提供兼容 OpenAI 的接口，也看看部署、性能测量与阅读源码时应该从哪里入手。'
pubDate: 2026-11-10
category: technology
tags: ['LLM', '性能', '缓存', 'Python', '软件工程']
draft: true
subcategory: 'ai-llm'
---

把一个大语言模型跑起来，和把它变成一项可供很多人同时使用的服务，是两种不同的工作。

前者关心模型能否加载，能否生成一段文字。后者还要回答：几十个请求同时到来时，显存放得下吗？一个长提示词会不会让其他用户等很久？相同的系统提示词能不能少算几次？模型占满一张卡以后，怎么使用多张卡？

[vLLM](https://github.com/vllm-project/vllm) 就是围绕这些问题成长起来的开源项目。它最初由加州大学伯克利分校 Sky Computing Lab 发起，如今由社区共同维护，使用 Apache 2.0 许可证。项目把自己定位为高吞吐，节省显存的大模型推理与服务引擎。它不是一个可以直接聊天的模型，也不是训练模型的框架，而是让已有模型更有效地完成推理的一层基础设施。

这篇文章从请求的实际旅程出发，介绍 vLLM 的核心设计，使用方式和工程边界。内容依据 2026 年 11 月查阅的官方仓库与文档整理，接口和硬件支持会随版本变化，部署时应以对应版本的文档为准。

## 一次生成请求，到底在消耗什么

用户提交一段文本后，模型先把它切成 token，再计算每层注意力所需的中间结果。这个处理输入的阶段通常叫 **prefill**。随后模型一次生成一个或一组新 token，直到遇到停止条件，这个阶段叫 **decode**。

两段工作的资源特征不同。长输入的 prefill 要处理很多 token，计算量大。decode 每次向前走一小步，却要反复读取已经生成的上下文，常常更受显存带宽和并发组织方式影响。实际瓶颈会随着模型，硬件和请求长度改变。

为了避免每生成一个 token 就从头重算历史，推理引擎会保存注意力机制中的 key 和 value，也就是 **KV Cache**。对常见的 Transformer 注意力结构，可以用下面的式子粗略估计一个序列的缓存大小：

```text
KV Cache 字节数 ≈ 2 × 层数 × token 数 × KV 头数 × 每个头的维度 × 每个元素字节数
```

系数 2 来自 key 和 value 各一份。例如，一个 32 层模型使用 8 个 KV 头，每个头 128 维，以 2 字节保存一个元素，那么每个 token 的缓存约为 128 KiB。单条 8192 token 的序列约需 1 GiB。这个例子不包含模型权重，运行时工作区和其他开销，也不适用于所有混合架构。分组查询注意力，多卡切分和缓存量化都会改变具体数字。

因此，一个模型能装进显存，不代表服务就能容纳足够多的并发请求。权重之外的缓存会随着上下文和活跃请求增长，而每条请求又会在不同时间结束。这就是 vLLM 着力解决的问题。

## PagedAttention：让 KV Cache 按块生长

vLLM 最广为人知的设计是 **PagedAttention**。它借鉴操作系统虚拟内存的思想，把一条序列的 KV Cache 拆分成固定大小的逻辑块，再通过块表映射到不必连续的物理显存块。

```text
请求 A 的逻辑块：  A0  A1  A2
                     ↓   ↓   ↓
物理缓存块：        [A1] [B0] [A0] [空闲] [A2]
```

当请求产生新 token 时，引擎可以按需申请块。请求结束后，块可以归还并交给其他请求。这减少了为每条请求预留一大段连续空间造成的浪费，也降低了外部碎片带来的限制。块内部仍可能有未使用空间，块表和管理本身也有成本，因此它不是“没有显存浪费”。

这种设计还让共享成为可能。例如多个输出分支拥有同一段前缀时，可以共享对应缓存块，在分支继续写入时再处理写时复制。自动前缀缓存也建立在块级缓存管理之上，但具体共享条件和生命周期要看相应功能与版本。

PagedAttention 解决的是 **KV Cache 如何存放和访问**。它与 FlashAttention 一类关注高效执行注意力计算的 kernel 并不完全是同一个层次，不能简单当成互斥选项。vLLM 可以根据模型与硬件选择不同的注意力后端。

这项工作的原始论文是 [Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)。论文中的吞吐提升是在特定模型，硬件和负载下测得的，不能直接当作所有部署的性能承诺。

## 连续批处理：让请求在运行中进出

普通批处理会把一批请求凑齐后一起运行。如果其中某条请求很快结束，另一条却生成很长的回答，计算资源就可能被长请求拖住。

**连续批处理**把调度粒度推进到生成过程：在一次调度迭代结束后，已完成的请求可以离开，新请求可以进入。引擎不必等整批请求全部完成才接纳下一批。这对于到达时间和输出长度各不相同的在线流量尤其重要。

当前 V1 架构的调度器按 token 预算安排每一步的工作。长输入可以拆成多个片段，也就是 **chunked prefill**。这样可以把部分 prefill 和正在进行的 decode 工作放进后续调度步骤，减少单个超长输入独占计算的机会。预算怎么配置会影响首 token 延迟与已在生成中的请求之间的取舍，并不存在对所有流量都最优的一组数字。

这些机制也不是免费午餐。并发过高时，请求可能在队列里等待，KV Cache 不足还可能触发抢占和重计算。吞吐上去了，单个用户的延迟未必也会下降。

## 前缀缓存：相同的开头不必反复计算

很多应用的请求拥有重复的开头：系统提示词，一段固定文档，或者不断追加的对话历史。**Automatic Prefix Caching** 可以在满足条件时复用已经计算过的前缀 KV Cache，减少重复的 prefill 工作。

它有几个容易忽略的边界。

第一，复用关注的是经过分词后的相同前缀。把时间戳或随机请求 ID 放到最前面，哪怕后面有一大段共同文本，也可能让共享前缀变短。第二，复用以缓存块为单位，未形成可复用完整块的尾部仍可能需要计算。第三，缓存会受到容量和淘汰策略影响，相同请求不是永远都会命中。第四，它主要减少重复输入的计算，不会让每一步 decode 自动消失。

如果应用依赖这种优化，可以先固定提示词模板，把经常变化的内容尽量放在稳定内容之后，再用实际服务的指标比较命中前后的首 token 延迟。多租户场景还应核对对应版本的缓存隔离与安全配置，不要把性能上的共享等同于天然的数据隔离。

## 从入口到 GPU：V1 的请求路径

理解代码之前，可以先把 vLLM 想成几个分工不同的部分。下面以在线服务的典型 V1 架构为例：

```text
客户端
  ↓ HTTP 请求与流式响应
API Server：解析请求，分词与输入处理
  ↓
Engine Core：维护请求状态，调度 token，管理 KV Cache
  ↓
Worker：加载模型，在设备上执行前向计算
  ↓
结果逐步返回客户端
```

官方架构文档描述了多进程实现：API Server 负责 HTTP 与输入处理，Engine Core 运行调度器并管理缓存，GPU Worker 执行模型。数据并行时还会出现额外的协调进程。进程数量取决于并行配置，CPU 内存和核心数也因此需要一起规划，不能只看 GPU。

离线场景则可以通过 Python 的 `LLM` 类直接提交一批输入，不需要自己启动 HTTP 服务。在线和离线入口面向的使用方式不同，但都围绕模型执行，调度和缓存组织工作。

## 快速上手：先跑通离线推理

下面以 Linux 和 NVIDIA GPU 为例。官方快速开始当前列出 Python 3.11 至 3.14，并推荐使用 `uv`。安装前先确认驱动，GPU 架构和对应版本的 [安装文档](https://docs.vllm.ai/en/latest/getting_started/installation/) 相互兼容。其他平台可能需要单独的安装方式或硬件插件，不能直接照搬 CUDA 命令。

```bash
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm --torch-backend=auto
vllm download-kernels
```

最后一条命令预先下载可用的编译后 kernel，减少部分硬件首次启动时的等待。安装包和模型都需要网络访问。生产环境应固定经过验证的 vLLM，模型和依赖版本，而不是长期依赖浮动的最新版本。

先使用官方示例中的小模型运行离线批量生成：

```python
from vllm import LLM, SamplingParams

prompts = [
    "The capital of France is",
    "A useful way to learn a new programming language is",
]

llm = LLM(model="facebook/opt-125m")
params = SamplingParams(temperature=0.8, top_p=0.95, max_tokens=64)
outputs = llm.generate(prompts, params)

for output in outputs:
    print("输入:", output.prompt)
    print("输出:", output.outputs[0].text)
```

第一次运行可能下载模型权重。示例模型小，方便理解接口，但生成质量不能代表现代指令模型。换成聊天模型时要注意：`llm.generate()` 不会自动替你套用聊天模板，可以先用 tokenizer 应用模板，或者使用适合消息列表的 `llm.chat()`。模型仓库中的 `generation_config.json` 也可能影响默认采样参数，比较实验时应明确记录配置。

## 启动兼容 OpenAI 的服务

在线服务可以使用官方快速开始里的指令模型：

```bash
vllm serve Qwen/Qwen2.5-1.5B-Instruct
```

默认监听本机的 8000 端口。另开一个终端，可以用 OpenAI Python SDK 请求它。安装客户端的命令是 `pip install openai`：

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-1.5B-Instruct",
    messages=[{"role": "user", "content": "用两句话解释 KV Cache。"}],
    max_tokens=128,
    temperature=0.2,
)
print(response.choices[0].message.content)
```

这里的 `EMPTY` 是 SDK 所需的占位值，默认本地示例并没有因此启用认证。部署到共享网络时，需要配置服务端 API key，并结合反向代理，访问控制和网络隔离保护服务。兼容 OpenAI 接口也不意味着所有参数和端点都与某个托管服务完全一致，工具调用，结构化输出等能力还取决于模型，解析器和 vLLM 版本。

## 不止文本生成：项目还提供什么

vLLM 已经从最初围绕文本生成的服务引擎扩展成覆盖多种工作负载的平台。官方仓库列出了以下能力，但每项能力的可用范围都需要结合模型与硬件核对。

- **多模态输入**：支持一部分视觉语言等模型，图片和其他媒体还会带来加载与预处理开销。
- **Embedding 与排序**：部分模型可以用于向量表示，分类或检索等任务，使用前应确认模型和接口类型。
- **结构化输出与工具调用**：可约束输出格式，也支持部分模型的工具调用解析。格式正确不等于内容真实或工具调用一定安全。
- **量化**：通过较低精度表示权重或缓存，减少显存占用。精度损失，吞吐变化和 kernel 支持需要在目标任务上实测。
- **推测解码**：先提出候选 token，再由目标模型验证。效果取决于候选接受率，额外模型成本和负载条件，并非所有场景都更快。
- **多 LoRA 服务**：在基础模型上服务不同适配器，具体支持范围和资源成本随模型架构变化。
- **分布式推理**：提供张量并行，流水线并行，数据并行及专家并行等方式。它们解决的资源与吞吐问题不同，通信开销也不同。

硬件方面，项目覆盖 NVIDIA，AMD，Intel 等设备以及 CPU，并有 TPU，昇腾和 Apple Silicon 等生态插件。支持某一类硬件并不代表每个模型，每项优化都能在其上运行。应先查看 [支持的模型](https://docs.vllm.ai/en/latest/models/supported_models/) 与对应硬件文档。

## 性能调优：先测用户体验，再看利用率

部署推理服务时，很容易只盯着每秒 token 数，但这一个数字不足以描述体验。

| 指标 | 回答的问题 |
| --- | --- |
| 首 token 延迟（TTFT） | 用户从发出请求到看到第一个 token 等了多久 |
| token 间延迟（ITL） | 流式输出过程中，相邻 token 的间隔有多长 |
| 请求端到端延迟 | 一次请求从提交到完整结束需要多久 |
| 吞吐量 | 单位时间完成多少请求，或处理多少输入与输出 token |
| 排队时间与缓存占用 | 系统是算不过来，还是在等待调度或显存 |

比较时要固定模型与量化方式，硬件，输入长度分布，输出长度分布和请求到达速率。报告平均值之外，也应该关注 P95 或 P99 延迟，因为排队问题往往先体现在尾部。并发数从低到高逐步增加，可以观察吞吐何时趋于平稳，以及延迟从哪里开始明显上升。

调参可以从几个方向入手：

1. **模型能否放下**：检查权重精度，最大上下文长度和可用于 KV Cache 的显存。不要仅凭权重大小估算全部需求。
2. **请求是否有真实的共同前缀**：检查提示词拼装和缓存指标，避免在最前面插入每次变化的字段。
3. **长输入是否影响其他请求**：观察 TTFT 与 token 间延迟，结合 chunked prefill 和调度预算做对照实验。
4. **并行是否值得**：张量并行可以把模型切到多张卡，但跨卡通信也会增加成本。模型放得下一张卡时，多卡不一定让单请求更快。
5. **瓶颈是否真的在 GPU**：分词，多模态预处理，网络，CPU 核心数和磁盘加载都可能限制整体服务。

常用配置包括 `--max-model-len`，`--gpu-memory-utilization`，`--max-num-seqs`，`--max-num-batched-tokens` 和 `--tensor-parallel-size`。参数含义和默认值可能变化，先看所用版本的 `vllm serve --help` 和[优化文档](https://docs.vllm.ai/en/latest/configuration/optimization/)。一次只改变少量变量，再用相同负载复测，比照搬别人的配置更可靠。

## 什么时候适合使用 vLLM

当你有可用的模型权重，希望自建兼容常见客户端的推理服务，流量里存在并发请求或长上下文，并且愿意承担 GPU 与服务运维工作时，vLLM 很值得评估。它尤其适合需要控制模型版本，数据路径和部署环境的团队。

但它也有明确边界。它不会让模型凭空具备更好的知识或推理能力，不负责替应用设计提示词与业务权限，也不能自动解决幻觉。对于只想在个人电脑上偶尔运行一个小模型的人，面向桌面设备的一体化工具可能更省事。对于没有合适硬件或运维资源的团队，托管 API 也可能是更合适的选择。

选型时还需要确认模型自身的许可证，权重访问条件和商用限制。vLLM 的 Apache 2.0 许可证不自动覆盖你加载的所有模型权重。

## 想读源码，从哪里开始

项目更新很快，最好在阅读时固定一个 commit。下面的路径对应官方 V1 架构文档提供的入口，目录可能随版本调整：

1. 从 [Python 离线入口](https://github.com/vllm-project/vllm/blob/main/vllm/entrypoints/llm.py) 看 `LLM` 如何接收输入与生成参数。
2. 从 [命令行入口](https://github.com/vllm-project/vllm/blob/main/vllm/entrypoints/cli/main.py) 进入 `vllm serve`，再沿在线 API 路径理解请求解析。
3. 阅读 [Engine Core](https://github.com/vllm-project/vllm/blob/main/vllm/v1/engine/core.py) 与 [调度器](https://github.com/vllm-project/vllm/blob/main/vllm/v1/core/sched/scheduler.py)，观察等待队列，token 预算和请求状态如何衔接。
4. 跟进 [GPU Worker](https://github.com/vllm-project/vllm/blob/main/vllm/v1/worker/gpu_worker.py)，理解设备初始化，模型加载和执行边界。
5. 带着一个具体问题阅读测试和设计文档，例如“缓存块何时分配与释放”或“长 prefill 如何与 decode 竞争预算”。

最有收获的读法，是把一次请求的生命周期串起来。HTTP 请求进入服务后，经过分词和模板，变成待调度的 token。引擎为它安排计算与缓存，设备执行模型，再把产生的 token 一步步送回客户端。这样再看分页，批处理和并行，就能知道每个优化究竟改变了哪一段工作。

## 参考资料

- [vLLM GitHub 仓库](https://github.com/vllm-project/vllm)
- [官方快速开始](https://docs.vllm.ai/en/latest/getting_started/quickstart/)
- [V1 架构概览](https://docs.vllm.ai/en/latest/design/arch_overview/)
- [PagedAttention 论文](https://arxiv.org/abs/2309.06180)
- [自动前缀缓存设计](https://docs.vllm.ai/en/latest/design/prefix_caching/)
- [性能与优化配置](https://docs.vllm.ai/en/latest/configuration/optimization/)
- [支持的模型](https://docs.vllm.ai/en/latest/models/supported_models/)
