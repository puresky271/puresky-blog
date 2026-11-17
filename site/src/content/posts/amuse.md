---
title: 'Amuse：把画面、文字和现成音乐变成和弦的 AI 写歌伙伴'
description: '写歌的人常被画面、故事或现成的歌勾出灵感，但主流音乐 AI 很难把这些多模态输入揉进创作流程。这篇 CHI 2025 的论文做了 Amuse，一个挂在 Hookpad 上的写歌助手：先用 GPT-4o 把图像、文字或音频转成音乐关键词，再让一个单模态和弦模型做拒绝采样，滤掉不和谐的和弦。十位写歌人的用户研究显示，Amuse 能把抽象灵感变成连贯的和弦建议，同时保住创作者的主动权和创造力。'
pubDate: 2026-11-15
author: 'Yewon Kim，Sung-Ju Lee，Chris Donahue'
category: papers
tags: ['人机交互', '交互设计', '用户研究', 'LLM', 'KAIST·Yewon Kim 等']
subcategory: 'paper-hci'
---

:::source
- **论文**：Amuse: Human-AI Collaborative Songwriting with Multimodal Inspirations
- **作者**：Yewon Kim，Sung-Ju Lee，Chris Donahue
- **机构**：KAIST（韩国科学技术院），卡内基梅隆大学
- **发表**：CHI 2025（第 43 届 ACM 人机交互大会），arXiv 2412.18940
- **原文**：[arxiv.org/abs/2412.18940](https://arxiv.org/abs/2412.18940)
- **DOI**：[10.1145/3706598.3713818](https://doi.org/10.1145/3706598.3713818)
- **代码**：[yewon-kim.com/amuse](https://yewon-kim.com/amuse)（项目主页，含声音示例与代码）
:::

> [!NOTE]
> 本文是论文《Amuse: Human-AI Collaborative Songwriting with Multimodal Inspirations》的中英逐段对照精读。页面顶部可以在中文译文和英文原文之间切换。正文十节全译，附录 A 的提示词、附录 B 的和弦生成细节和附录 C 的用户研究材料也都收了，因为正文引用了这三份附录，且它们属于可复现的关键信息。致谢和参考文献没有收。章节编号和图号都沿用原文，所以跨节引用（§4.1，图 8 这类）和原文对得上，但和本站目录的编号不一定一致。原文用作者年份制引用，正文里（Liu et al., 2022）这类标记原样保留，没有附参考文献表。图 5 在原文里由 (a) 音乐连贯性和 (b) 关键词相关性两张子图组成，这里上下拼成一张收；原文的 SVG 统计图都已渲染成 PNG。图注下面的中文小字和文中带铅笔图标的注解都是我加的补充说明，中英两种模式下都会显示。

## 摘要（Abstract）

:::bi

Songwriting is often driven by multimodal inspirations, such as imagery, narratives, or existing music, yet songwriters remain unsupported by current music AI systems in incorporating these multimodal inputs into their creative processes. We introduce Amuse, a songwriting assistant that transforms multimodal (image, text, or audio) inputs into chord progressions that can be seamlessly incorporated into songwriters’ creative process. A key feature of Amuse is its novel method for generating coherent chords that are relevant to music keywords in the absence of datasets with paired examples of multimodal inputs and chords. Specifically, we propose a method that leverages multimodal LLMs to convert multimodal inputs into noisy chord suggestions and uses a unimodal chord model to filter the suggestions. A user study with songwriters shows that Amuse effectively supports transforming multimodal ideas into coherent musical suggestions, enhancing users’ agency and creativity throughout the songwriting process.

:::zh

歌曲创作往往由多模态灵感驱动，例如图像，叙事或已有的音乐，然而写歌人在把这些多模态输入融入其创作过程时，仍然得不到现有音乐 AI 系统的支持。我们提出 Amuse，一个写歌助手，它把多模态（图像，文本或音频）输入转化为可以无缝融入写歌人创作过程的和弦进行。Amuse 的一个关键特性在于其新颖的方法，在没有多模态输入与和弦配对示例数据集的情况下，生成与音乐关键词相关且连贯的和弦。具体来说，我们提出一种方法，利用多模态大语言模型（LLM）把多模态输入转换为带噪声的和弦建议，并使用一个单模态和弦模型过滤这些建议。一项面向写歌人的用户研究表明，Amuse 有效地支持把多模态想法转化为连贯的音乐建议，在整个歌曲创作过程中增强了用户的主动权和创造力。
:::

:::figure
![](./images/amuse/fig-01.png)

Figure 1: 

:::zh
图 1：先抓左右两半的分工：左边 Chord Generator 把图和文字先变成音乐关键词，再生成和弦；右边 Chord Transcriber 从一段音频里扒出和弦。中间那条“输入 → 关键词 → 拒绝采样 → 和弦建议”的链路是全文的主线，把多模态灵感翻译成了可复用、可编辑的和弦进行。
:::
:::

## 引言（Introduction）

:::bi

Across creative pursuits, artists draw inspiration from a wide variety of concepts and experiences, relying on intuition to find connections between sometimes seemingly unrelated modalities. Within music, for example, Modest Mussorgsky composed *Pictures at an Exhibition* with direct inspiration from a series of paintings, and Björk’s album *Biophilia* was inspired by ruminations on the relationships between music, nature, and technology. Increasingly, AI systems are capable of modeling such *multimodal* relationships, i.e., to understand not only *concrete* relationships between data modalities (e.g., *what objects are in this painting?*) but also more *abstract* ones (e.g., *what music might fit with this painting?*). Consequently, these systems are being applied across a growing range of creative pursuits, such as illustration (Liu et al., 2022), creative writing (Chung et al., 2022), and video editing (Wang et al., 2024).

:::zh

在各种创作活动中，艺术家从各种各样的概念和经历中汲取灵感，依靠直觉在有时看似互不相干的模态之间找到联系。以音乐为例，Modest Mussorgsky 直接受到一组画作的启发而创作了 *Pictures at an Exhibition*，Björk 的专辑 *Biophilia* 则受到对音乐，自然与技术之间关系的反复思考的启发。AI 系统越来越能够建模这类多模态关系，也就是说，不仅能理解数据模态之间具体的关系（例如，这幅画里有哪些物体？），也能理解更抽象的关系（例如，什么音乐可能适合这幅画？）。因此，这些系统正被应用于越来越广泛的创作活动，例如插画（Liu et al., 2022），创意写作（Chung et al., 2022）和视频剪辑（Wang et al., 2024）。
:::

:::annotation
这一段把问题说得很准：文本生成音乐的模型输出的是“成品音频”，而写歌人要的是能反复改的“可复用元素”（音符、和弦）。Amuse 立论的全部支点就在这句话上，后面所有设计都围绕“把灵感变成能塞进编辑器继续编辑的东西”展开。
:::

:::bi

Within the context of AI support for musical creativity, recent research has centered around two key pathways. First, AI systems have become capable of generating music audio from text descriptions (Dhariwal et al., 2020; Forsgren and Martiros, 2022; Agostinelli et al., 2023; Copet et al., 2024; Schneider et al., 2023; Huang et al., 2023), leveraging the particularly intuitive multimodal relationship between music and text to offer users a compelling new form of musical control. However, because these systems output completed songs in audio rather than *reusable musical elements* (e.g., sequences of notes or chords), they are not particularly supportive to musicians who view *iteration* as central to both the creative process and to their sense of ownership over the outcome (Newman et al., 2023). In contrast, symbolic music generation systems (Simon and Oore, 2017; Huang et al., 2018; Payne, 2019; Donahue et al., 2019; Thickstun et al., 2024) are increasingly being incorporated into music editors to aid musicians in iterative composition workflows by generating reusable musical elements that agree with the surrounding musical context (Hadjeres and Crestel, 2021; Donahue et al., 2025). While musicians find these types of systems helpful, these systems fall short in incorporating multimodal sources of inspiration, as they only take the surrounding musical context as input. Accordingly, musicians remain unsupported in incorporating multimodal sources of inspiration into their iterative creative processes.

:::zh

在 AI 支持音乐创造力的语境下，近期的研究围绕两条关键路径展开。第一，AI 系统已经能够根据文本描述生成音乐音频（Dhariwal et al., 2020; Forsgren and Martiros, 2022; Agostinelli et al., 2023; Copet et al., 2024; Schneider et al., 2023; Huang et al., 2023），利用音乐与文本之间特别直观的多模态关系，为用户提供一种引人注目的新型音乐控制形式。然而，由于这些系统输出的是完整的歌曲音频，而不是可复用的音乐元素（例如音符或和弦序列），它们对那些把迭代视为创作过程和对成果归属感的核心的音乐人支持有限（Newman et al., 2023）。相比之下，符号音乐生成系统（Simon and Oore, 2017; Huang et al., 2018; Payne, 2019; Donahue et al., 2019; Thickstun et al., 2024）正越来越多地被整合进音乐编辑器，通过生成与周围音乐语境相符的可复用音乐元素，帮助音乐人进行迭代式创作工作流（Hadjeres and Crestel, 2021; Donahue et al., 2025）。虽然音乐人认为这类系统有帮助，但这些系统在融入多模态灵感来源方面仍有不足，因为它们只把周围的音乐语境作为输入。因此，音乐人在把多模态灵感来源融入其迭代式创作过程方面仍然得不到支持。
:::

:::bi

In this work, we bridge this gap by building a generative musical support tool that can both incorporate multimodal inputs and facilitate creative iteration. Specifically, we present Amuse (Figure 1), a songwriting assistant that transforms multimodal user inputs (images, text, audio) into reusable musical elements (chord progressions) (Footnote: Sound examples and code are available at: https://yewon-kim.com/amuse). Motivated by a formative study with eight songwriters, Amuse comprises two key functionalities: Chord Generator and Chord Transcriber. In the Chord Generator, we adopt a two-step chord generation approach where we (i) extract music keywords from user multimodal inputs and (ii) generate chord progressions that align with the given music keywords. The Chord Transcriber allows users to transcribe chords from a specified range of audio sources. Amuse is seamlessly integrated into Hookpad (Hookpad, 2024), a music editor that assists songwriters in the composition of the chords and melody that together characterize the basic essence of a piece of music. In combination with Aria (Donahue et al., 2025)—a *contextual* and *unimodal* AI songwriting assistant already integrated into Hookpad—Amuse can support songwriters by incorporating multimodal sources of inspiration in addition to existing musical context.

:::zh

在这项工作中，我们通过构建一个既能融入多模态输入又能促进创意迭代的生成式音乐支持工具来弥合这一差距。具体来说，我们提出 Amuse（图 1），一个写歌助手，它把多模态用户输入（图像，文本，音频）转化为可复用的音乐元素（和弦进行）（脚注：声音示例和代码可在 https://yewon-kim.com/amuse 获取）。受一项面向八位写歌人的形成性研究的启发，Amuse 包含两个关键功能：Chord Generator（和弦生成器）和 Chord Transcriber（和弦转录器）。在和弦生成器中，我们采用两步式和弦生成方法，其中我们（i）从用户的多模态输入中提取音乐关键词，（ii）生成与给定音乐关键词相符的和弦进行。和弦转录器允许用户从指定范围的音频来源中转录和弦。Amuse 被无缝整合进 Hookpad（Hookpad, 2024），这是一个音乐编辑器，帮助写歌人创作和弦与旋律，二者共同构成一首音乐作品的基本精髓。结合 Aria（Donahue et al., 2025），即一个已经整合进 Hookpad 的上下文式单模态 AI 写歌助手，Amuse 可以通过在现有音乐语境之外融入多模态灵感来源来支持写歌人。
:::

:::bi

A key challenge in developing Amuse is the lack of obvious sources of training data consisting of paired multimodal inputs and reusable musical elements (i.e., chords). Text-to-music systems are trained on large corpora of text captions and music audio; however, to the best of our knowledge, no such corpora exist that include reusable musical elements as opposed to music audio. To build such a system without paired training data, we leverage the general capabilities of multimodal large language models (LLMs) by instructing GPT-4o (OpenAI, 2024b) to generate chord progressions that might correspond to multimodal inputs. However, we find that chord progressions from GPT-4o are not musically coherent enough to directly serve users. Equipped with a *unimodal* dataset consisting only of human-composed chord progressions, we train a language model prior over chords, which we use to filter out unrealistic chords generated by GPT-4o through a rejection sampling procedure. Through both quantitative and qualitative evaluation, we show that our method can generate diverse chord progressions that are relevant to user keywords and musically coherent.

:::zh

开发 Amuse 的一个关键挑战在于缺乏明显可用的训练数据来源，这些数据需要由配对的多模态输入和可复用的音乐元素（即和弦）组成。文本转音乐系统是在大规模的文本描述和音乐音频语料上训练的，然而据我们所知，还不存在包含可复用音乐元素（而非音乐音频）的此类语料。为了在没有配对训练数据的情况下构建这样的系统，我们利用多模态大语言模型的通用能力，指示 GPT-4o（OpenAI, 2024b）生成可能与多模态输入相对应的和弦进行。然而，我们发现 GPT-4o 生成的和弦进行在音乐上不够连贯，无法直接服务用户。借助一个仅由人类创作的和弦进行组成的单模态数据集，我们训练了一个作用于和弦的语言模型先验，用它通过拒绝采样流程过滤掉 GPT-4o 生成的不切实际的和弦。通过定量和定性评估，我们表明我们的方法能够生成多样化的和弦进行，这些进行既与用户关键词相关，又在音乐上连贯。
:::

:::annotation
这是全文的技术核心，建议先记住这个两段式：GPT-4o 这样的多模态大模型负责“提案”，但它不懂和声，生成的和弦不够连贯；于是再训一个只见过人类真实和弦的单模态模型，用拒绝采样把离谱的提案滤掉。缺了任何一段，后面的技术评测都读不进去。
:::

:::bi

To understand how Amuse supports the songwriting process, we conducted a within-subjects study with 10 songwriters, where participants wrote 8-bar choruses based on songwriting prompts. Participants engaged in two conditions: one where they used both Amuse and Aria, and another where they used Aria alone. Our study revealed that Amuse effectively supports the transformation of multimodal inspirations into concrete musical elements, with participants feeling more guided and aligned with their creative goals than Aria alone. Notably, although Amuse was designed for early-stage use, participants employed it across various stages of the songwriting process, demonstrating diverse usage patterns. With Amuse, participants experienced enhanced agency and creativity throughout the process. Overall, these findings suggest that Amuse enriches the songwriting process by helping songwriters seamlessly integrate diverse multimodal inspirations into their creative workflows.

:::zh

为了理解 Amuse 如何支持歌曲创作过程，我们对 10 位写歌人进行了一项被试内研究，参与者根据歌曲创作提示写作 8 小节副歌。参与者经历两种条件：一种同时使用 Amuse 和 Aria，另一种只使用 Aria。我们的研究表明，Amuse 有效地支持把多模态灵感转化为具体的音乐元素，与只使用 Aria 相比，参与者感到自己获得了更多引导，也更贴近自己的创作目标。值得注意的是，尽管 Amuse 是为早期阶段使用而设计的，参与者却在歌曲创作过程的各个阶段都使用了它，展现出多样的使用模式。使用 Amuse 时，参与者在整个过程中体验到了更强的主动权和创造力。总体而言，这些发现表明，Amuse 通过帮助写歌人把多样的多模态灵感无缝融入其创作工作流，丰富了歌曲创作过程。
:::

:::annotation
注意研究设计的两个点：一是被试内设计，十个人各自经历“只用 Aria”和“Aria 加 Amuse”两种条件，自己和自己比；二是结果里那个耐人寻味的反差，过程体验（主动权、创造力）显著提升，但最终满意度两组差不多。这个反差到第九章会被单独拎出来讨论。
:::

:::bi

In summary, this paper presents the following contributions:

:::zh

总而言之，本文提出以下贡献：
:::

:::bi

- Amuse, an interactive songwriting assistant that supports users in transforming multimodal inspirations into reusable musical elements.
- A novel method for generating diverse, relevant, and coherent chord progressions based on multimodal user inputs without paired training data.
- Findings from a user study (N=10) on how and when multimodal inspirations are used throughout the songwriting process and their impact on the creative workflow.

:::zh

- Amuse，一个交互式写歌助手，支持用户把多模态灵感转化为可复用的音乐元素。
- 一种新颖的方法，在没有配对训练数据的情况下，根据多模态用户输入生成多样化，相关且连贯的和弦进行。
- 来自一项用户研究（N=10）的发现，涉及多模态灵感在歌曲创作过程中如何以及何时被使用，以及它们对创作工作流的影响。
:::

## 相关工作（Related Work）

### 人机协同音乐创作（Human-AI Collaborative Music Creation）

:::bi

Research on human-AI collaborative music creation has largely centered on the symbolic music domain, where musical elements such as melodies and chords are represented as a sequence of symbols (e.g., MIDI). Most systems in this symbolic space employ *contextual* models (Huang et al., 2018; Thickstun et al., 2024; Huang et al., 2019a; Hadjeres and Crestel, 2021; Huang et al., 2019b), which generate continuation or infillation given user-provided musical elements. For example, Music Transformer (Huang et al., 2018) extends user-provided MIDI sequences by generating contextually coherent MIDI continuations. In addition, chord recommendation systems such as ChordRipple (Huang et al., 2016) and ChordSequenceFactory (Fukayama et al., 2013) provide suggestions for chord progressions based on the current harmonic context, helping users build coherent and creative chord sequences over time.

:::zh

人机协同音乐创作的研究主要集中在符号音乐领域，其中旋律与和弦等音乐元素被表示为符号序列（例如 MIDI）。这一符号空间中的大多数系统采用上下文模型（Huang et al., 2018; Thickstun et al., 2024; Huang et al., 2019a; Hadjeres and Crestel, 2021; Huang et al., 2019b），在给定用户提供的音乐元素时生成续写或填充。例如，Music Transformer（Huang et al., 2018）通过生成在语境上连贯的 MIDI 续写来扩展用户提供的 MIDI 序列。此外，ChordRipple（Huang et al., 2016）和 ChordSequenceFactory（Fukayama et al., 2013）等和弦推荐系统根据当前和声语境提供和弦进行建议，帮助用户逐步构建连贯且富有创意的和弦序列。
:::

:::bi

In practice, human-AI collaborative music creation is facilitated by musical user interfaces, such as MIDI editors, where users can input and refine musical elements while collaborating with AI (Hadjeres et al., 2017; Louie et al., 2020; Bougueng Tchemeube et al., 2022; Huang et al., 2019b; Malandro, 2023; BECKER et al., 2024; Suh et al., 2021). A notable example is Cococo (Louie et al., 2020), where users can manually input or edit musical notes, steer the contextual AI model to generate infills for incomplete sections and integrate AI-generated suggestions directly within the editor. These interfaces enable users to iteratively generate and refine AI suggestions, giving them agency in shaping the final output by alternating between manual input and AI suggestions (Newman et al., 2023). Commercial tools exemplifying these human-AI collaborative creation interfaces include Aria (Donahue et al., 2025), which operates unimodally by generating musical elements—chords or melodies—based on user-provided contextual inputs written in the music editor. However, prior interfaces primarily focus on *contextual* musical inputs without considering other modalities (e.g., images, text) that can influence the creative process. Our study expands this scope by incorporating *multimodal* inputs into these *contextual* music co-creation workflows.

:::zh

在实践中，人机协同音乐创作由音乐用户界面促成，例如 MIDI 编辑器，用户可以在与 AI 协作的同时输入和精修音乐元素（Hadjeres et al., 2017; Louie et al., 2020; Bougueng Tchemeube et al., 2022; Huang et al., 2019b; Malandro, 2023; BECKER et al., 2024; Suh et al., 2021）。一个显著的例子是 Cococo（Louie et al., 2020），用户可以在其中手动输入或编辑音符，引导上下文 AI 模型为不完整的段落生成填充，并直接在编辑器内整合 AI 生成的建议。这些界面使用户能够迭代地生成和精修 AI 建议，通过在手动输入和 AI 建议之间交替，让用户在塑造最终输出时拥有主动权（Newman et al., 2023）。体现这类人机协同创作界面的商业工具包括 Aria（Donahue et al., 2025），它以单模态方式运作，根据用户在音乐编辑器中写入的上下文输入生成音乐元素，也就是和弦或旋律。然而，先前的界面主要关注上下文式音乐输入，而没有考虑其他可能影响创作过程的模态（例如图像，文本）。我们的研究通过把多模态输入融入这些上下文式音乐协同创作工作流，扩展了这一范围。
:::

### 文本转音乐生成模型（Text-to-Music Generative Models）

:::bi

While symbolic music AI focuses on modeling the representation of *unimodal* music data, one emerging area of research involves text-to-music generative models (Dhariwal et al., 2020; Forsgren and Martiros, 2022; Agostinelli et al., 2023; Copet et al., 2024; Schneider et al., 2023; Huang et al., 2023). These models learn *multimodal* representation between textual descriptions and music audio, allowing users to steer the model generations by text prompts (e.g., “smooth piano improvisation over a walking bass line”). Similarly, proprietary models like Suno (AI, 2024b) and Udio (Udio, 2024) allow users to input text prompts and full lyrics to generate complete songs. While these text-conditioned generative models offer users greater control and agency over the generation process, a key limitation is that the outputs are fully-rendered audio files, which are not easily integrated into the iterative workflows of music creation, such as those in digital audio workstations (DAWs). In contrast, our work focuses on human-AI collaborative music creation, where AI-generated outputs are meant to be part of an evolving, iterative creation process rather than final products.

:::zh

符号音乐 AI 专注于建模单模态音乐数据的表示，而一个新兴的研究领域涉及文本转音乐生成模型（Dhariwal et al., 2020; Forsgren and Martiros, 2022; Agostinelli et al., 2023; Copet et al., 2024; Schneider et al., 2023; Huang et al., 2023）。这些模型学习文本描述与音乐音频之间的多模态表示，让用户可以通过文本提示词来引导模型生成（例如“在行走贝斯线上的流畅钢琴即兴”）。类似地，Suno（AI, 2024b）和 Udio（Udio, 2024）等专有模型允许用户输入文本提示词和完整歌词来生成完整的歌曲。虽然这些文本条件生成模型为用户提供了对生成过程更强的控制和主动权，但一个关键局限在于输出是完全渲染好的音频文件，不易整合进音乐创作的迭代工作流，例如数字音频工作站（DAW）中的工作流。相比之下，我们的工作聚焦于人机协同音乐创作，其中 AI 生成的输出应当是一个不断演进的迭代创作过程的一部分，而不是最终产品。
:::

### 创造力支持工具中的多模态（Multimodality in Creativity Support Tools）

:::bi

Multimodal systems have been widely explored in HCI and creativity support tools. In the visual domain, different modalities are used to enhance the creation of both 2D (Sharma et al., 2018; El-Nouby et al., 2019; Liu et al., 2022) and 3D (Chang et al., 2017; Coyne and Sproat, 2001; Liu et al., 2023; Chaudhuri et al., 2013) visuals. For instance, Opal (Liu et al., 2022) supports the illustration creation process by incorporating inputs like news articles, keywords, tones, and styles, while in Attribit (Chaudhuri et al., 2013), users can input adjectives and emotional cues to generate 3D shapes. Multimodal systems have also been developed to assist with writing (Cai et al., 2024; Kim et al., 2020; Chung et al., 2022; Yan et al., 2023). For example, PandaLens (Cai et al., 2024) combines audio, gaze patterns, images, and verbal comments to generate narratives, while TaleBrush (Chung et al., 2022) allows for both text-based and sketch-based interactions in storytelling. Additionally, some writing systems provide multimodal feedback rather than multimodal input to support the creative process (Bensaid et al., 2021; Singh et al., 2023). For example, Fairytailor (Bensaid et al., 2021) retrieves sequences of images aligned with texts to stimulate ideation in storytelling. Despite these advancements, multimodal music creation remains a relatively unexplored and emerging area in creativity support tools. With Amuse, we focus on integrating both contextual and multimodal inputs to explore how diverse communication channels can enhance human-AI collaborative music creation.

:::zh

多模态系统已在 HCI 和创造力支持工具中得到广泛探索。在视觉领域，不同模态被用来增强二维（Sharma et al., 2018; El-Nouby et al., 2019; Liu et al., 2022）和三维（Chang et al., 2017; Coyne and Sproat, 2001; Liu et al., 2023; Chaudhuri et al., 2013）视觉作品的创作。例如，Opal（Liu et al., 2022）通过纳入新闻文章，关键词，基调和风格等输入来支持插画创作过程，而在 Attribit（Chaudhuri et al., 2013）中，用户可以输入形容词和情感线索来生成三维形状。多模态系统也被开发出来辅助写作（Cai et al., 2024; Kim et al., 2020; Chung et al., 2022; Yan et al., 2023）。例如，PandaLens（Cai et al., 2024）结合音频，注视模式，图像和口头评论来生成叙事，而 TaleBrush（Chung et al., 2022）则允许在讲故事时同时使用基于文本和基于草图的交互。此外，一些写作系统提供多模态反馈而非多模态输入来支持创作过程（Bensaid et al., 2021; Singh et al., 2023）。例如，Fairytailor（Bensaid et al., 2021）检索与文本对齐的图像序列来激发讲故事时的构思。尽管有这些进展，多模态音乐创作在创造力支持工具中仍然是一个相对未被探索且刚刚兴起的领域。借助 Amuse，我们聚焦于同时整合上下文输入和多模态输入，探索多样的沟通渠道如何增强人机协同音乐创作。
:::

## 形成性研究（Formative Study）

:::bi

To inform the design of Amuse, we conducted formative interviews with songwriters with two goals. Firstly, to learn about songwriters’ initial ideation and song development process. Secondly, to explore potential AI supports that could enhance the songwriting process.

:::zh

为了指导 Amuse 的设计，我们对写歌人进行了形成性访谈，带着两个目标。第一，了解写歌人最初的构思和歌曲发展过程。第二，探索能够增强歌曲创作过程的潜在 AI 支持。
:::

### 参与者和流程（Participants and Procedure）

:::bi

We recruited eight participants who are active users of Hookpad (Hookpad, 2024) and Aria (Donahue et al., 2025; Aria, 2024). Hookpad is a widely-used online songwriting tool developed by Hooktheory (Hooktheory, 2024) that enables users to create songs (chords and melodies) via keyboard or MIDI inputs. Aria is an AI-powered songwriting assistant integrated into Hookpad, capable of generating melody or chord continuations and infills based on user-provided inputs. We selected these participants because Hookpad supports the earliest stages of songwriting, offering insight into the ideation process, while Aria allows us to examine how users already incorporate contextual generation into their creative workflows.

:::zh

我们招募了八位参与者，他们都是 Hookpad（Hookpad, 2024）和 Aria（Donahue et al., 2025; Aria, 2024）的活跃用户。Hookpad 是一个由 Hooktheory（Hooktheory, 2024）开发的广泛使用的在线歌曲创作工具，让用户可以通过键盘或 MIDI 输入来创作歌曲（和弦和旋律）。Aria 是一个整合进 Hookpad 的 AI 驱动写歌助手，能够根据用户提供的输入生成旋律或和弦的续写和填充。我们选择这些参与者，是因为 Hookpad 支持歌曲创作的最早阶段，能够提供对构思过程的洞察，而 Aria 让我们得以考察用户如何已经把上下文式生成融入其创作工作流。
:::

:::bi

All participants identified themselves as hobbyists, with songwriting years ranging from 1.5 years to 5 years (M=3.38, SD=1.19). These participants engaged in various genres of music creation: three participants in pop songs and others in rock, bluegrass, punk, classical, and jazz. Participants reported engaging in songwriting activities at least once a week and using Aria at least once when writing songs using Hookpad.

:::zh

所有参与者都自认为是业余爱好者，歌曲创作年限从 1.5 年到 5 年不等（M=3.38，SD=1.19）。这些参与者从事多种类型的音乐创作：三位参与者创作流行歌曲，其他人创作摇滚，蓝草，朋克，古典和爵士。参与者报告自己每周至少从事一次歌曲创作活动，并且在用 Hookpad 写歌时至少使用一次 Aria。
:::

:::bi

During the interview, we asked participants about sources of inspiration and how they translate these inspirations into songs. We also asked their experiences and opinions on songwriting tools they have used (including Aria) and desired AI functionalities to support songwriting. Participants were compensated with \$25 Amazon gift card for the 1-hour interview. The interviews were conducted online via Zoom in a semi-structured format and were recorded, manually transcribed, and coded through a thematic analysis.

:::zh

在访谈中，我们询问了参与者灵感来源以及他们如何把这些灵感转化为歌曲。我们还询问了他们使用过的歌曲创作工具（包括 Aria）的经历和看法，以及他们期望用来支持歌曲创作的 AI 功能。参与者的 1 小时访谈获得 25 美元 Amazon 礼品卡作为报酬。访谈通过 Zoom 以半结构化形式在线进行，并进行了录音，人工转录，以及通过主题分析进行编码。
:::

### 研究发现（Findings）

#### 来自多种模态的灵感（Inspirations from diverse modalities）

:::bi

All of the songwriters mentioned drawing inspiration from various sources, which can be grouped into three categories: audio, narrative, and visual. Seven out of eight songwriters (P1-3, P5-8) said they **often get ideas from listening to music**. P3 noted, “*I enjoy studying songs that are already proven to be great. I listen to them, take elements I like, and add my own twists.*” Three songwriters (P4, P7-8) mentioned **drawing inspiration from narratives**, such as stories and personal experiences. P4 explained, “*I always start with a lyrical concept when writing a song. For example, I sometimes randomly turn to a page in a novel I’m reading and use that as the theme for the song.*” Similarly, P7 found inspiration in personal experiences: “*I remember when my dog found a baby bird in a bush. It was a tense moment because we didn’t know if my dog would attack the helpless bird. I connected that experience to a song I wrote in the harmonic minor scale.*” Lastly, two (P2, P8) mentioned being **inspired by visuals**, such as game scenes or movie aesthetics. P8 noted, “*Watching a movie, the aesthetic can make me want to capture that in a song. For example, an action scene might inspire me to create something up-tempo or intense.*”

:::zh

所有写歌人都提到从各种来源汲取灵感，这些来源可以归为三类：音频，叙事和视觉。八位写歌人中有七位（P1-3, P5-8）表示他们**经常从听音乐中获得想法**。P3 提到，“我喜欢研究那些已经被证明很棒的歌曲。我听它们，取我喜欢的元素，再加上我自己的变化。”三位写歌人（P4, P7-8）提到**从叙事中汲取灵感**，例如故事和个人经历。P4 解释说，“我写歌时总是从一个歌词概念开始。例如，我有时会随意翻到我正在读的小说的某一页，把它当作这首歌的主题。”类似地，P7 在个人经历中找到了灵感：“我记得我的狗在灌木丛里发现了一只雏鸟。那是一个紧张的时刻，因为我们不知道我的狗会不会攻击这只无助的小鸟。我把那段经历和我写的一首和声小调歌曲联系了起来。”最后，有两位（P2, P8）提到**受到视觉的启发**，例如游戏场景或电影美学。P8 提到，“看电影时，那种美学能让我想把那种感觉捕捉进一首歌里。例如，一个动作场面可能会激发我创作一些快节奏或强烈的东西。”
:::

#### 把多模态灵感转化为音乐元素（Transforming multimodal inspirations into musical elements）

:::bi

Once inspired, songwriters sought to translate their abstract sources of inspiration into concrete musical elements, such as chord progressions or melodies, to build upon. Seven out of eight participants (P2-8) mentioned **improvising with instruments or their voices** until they found something they liked. For instance, P4 explained, “*I have a theme, that is, nostalgic memories triggered by scent. I would sing random melodies or try out many different chord combinations until I found something that matched my song concept.*” The process of improvisation was not always linear; sometimes, participants improvised first and connected their ideas to their initial inspiration. P7 noted, “*I have a Google doc where I dump all my lyrical concepts, but I don’t always start from there. Sometimes, I’ll improvise on my guitar, come up with chord progressions I like, and begin writing. Later, I often find myself connecting the song to concepts from my list.*”

:::zh

一旦受到启发，写歌人会设法把他们抽象的灵感来源转化为具体的音乐元素，例如和弦进行或旋律，以此作为基础。八位参与者中有七位（P2-8）提到**用乐器或自己的声音即兴演奏**，直到找到自己喜欢的东西。例如，P4 解释说，“我有一个主题，也就是由气味触发的怀旧记忆。我会随意哼唱旋律，或者尝试许多不同的和弦组合，直到找到符合我歌曲概念的东西。”即兴的过程并不总是线性的，有时参与者先即兴，再把他们的想法和最初的灵感联系起来。P7 提到，“我有一个 Google 文档，把我所有的歌词概念都倒进去，但我并不总是从那里开始。有时我会在吉他上即兴，想出我喜欢的和弦进行，然后开始写作。后来，我常常发现自己把歌曲和清单里的概念联系起来。”
:::

:::bi

Another common approach was **analyzing music through listening sessions.** Four participants (P1, P3, P5-6) mentioned analyzing either existing songs or recordings of their own improvisations. P6 described, “*I’ll go to YouTube and listen to popular music. I’ll note how sharps, flats, and chord progressions are used, to find what sounds pleasing to me. Then I’ll transcribe them into Hookpad and expand on it to create something unique.*”

:::zh

另一种常见做法是**通过聆听环节来分析音乐**。四位参与者（P1, P3, P5-6）提到分析现有歌曲或自己即兴的录音。P6 描述道，“我会去 YouTube 听流行音乐。我会记下升号，降号和和弦进行是怎么用的，找出让我觉得好听的东西。然后我把它们转录进 Hookpad，再加以扩展，创造出独特的东西。”
:::

#### 模块化 AI 建议的无缝融入（Seamless incorporation of modular AI suggestions）

:::bi

While all participants emphatically expressed the central importance of the manual aspects of the songwriting process, they also **recognized AI tools as inspirational sources**, as mentioned by seven participants (P2-8). AI suggestions were viewed as a “*great starting point*” (P4, P8) or useful for overcoming “*writer’s block*” (P2, P3), as P2 remarked, “*It’s like having someone next to me, suggesting the next two bars.*” Participants **appreciated AI tools like Aria for offering modular suggestions that can be easily integrated into the songwriting process**, particularly in preserving creativity, agency, and ownership in the process (P2-4). For example, participants described modular suggestions in MIDI format as helpful because “*you have control over how and where to use, and you can edit the suggestions*” (P4). Generating more than that, such as an entire audio track, was seen as intrusive, as it “*takes the joy of songwriting from me*” (P2). Similarly, P3 described these modular suggestions as “*sparks that promote curiosity and creativity,*” while generating too much “*dampens my creativity.*” In addition, concerns about integrity were raised regarding audio track generations; two (P2-3) expressed fears that AI-generated audio might be “*potentially copied from copyrighted music*” (P3).

:::zh

虽然所有参与者都着重表达了歌曲创作过程中手工环节的核心重要性，他们也**认可 AI 工具是灵感来源**，有七位参与者（P2-8）提到了这一点。AI 建议被视为“绝佳的起点”（P4, P8），或对克服“卡壳（写作障碍）”（P2, P3）有用，正如 P2 所说，“就像有人在我旁边，提示接下来的两个小节。”参与者**欣赏 Aria 这类 AI 工具，因为它们提供的模块化建议可以轻松融入歌曲创作过程**，尤其是在过程中保留创造力，主动权和归属感（P2-4）。例如，参与者描述 MIDI 格式的模块化建议很有帮助，因为“你可以控制怎么用，用在哪里，还可以编辑这些建议”（P4）。生成比这更多的东西，例如整条音频轨道，则被视为一种侵扰，因为它“夺走了我写歌的乐趣”（P2）。类似地，P3 把这些模块化建议描述为“激发好奇心和创造力的火花”，而生成太多东西则会“压制我的创造力”。此外，关于音频轨道生成也出现了诚信方面的担忧，有两位（P2-3）表示担心 AI 生成的音频可能“是从受版权保护的音乐复制而来的”（P3）。
:::

:::bi

However, many participants found **Aria’s suggestions to be lacking context for their specific inspirations** (P1-5, P7-8). P4 explained, “*I wish it would generate melodies that better fit my lyrical ideas. Most of the time, Aria’s outputs don’t align with my song’s theme.*” One participant (P5) used the text-to-music model, Udio (Udio, 2024), to address this but found it tedious, as it generated full audio track that could not be easily integrated into songwriting interfaces like Hookpad or digital audio workstation (DAW): “*I found Udio really good at finding harmonies for specific styles or moods I’m looking for. I generated audio with a prompt ‘country pop, uplifting, catchy anthem, introspective mood, love’ and took the chord progression from there. But extracting the usable elements was a lot of work.*”

:::zh

然而，许多参与者认为 **Aria 的建议缺乏针对他们特定灵感的语境**（P1-5, P7-8）。P4 解释说，“我希望它能生成更贴合我歌词想法的旋律。大多数时候，Aria 的输出与我的歌曲主题不一致。”一位参与者（P5）使用文本转音乐模型 Udio（Udio, 2024）来解决这个问题，但发现它很繁琐，因为它生成的是完整音频轨道，无法轻松整合进 Hookpad 或数字音频工作站（DAW）这样的歌曲创作界面：“我发现 Udio 非常擅长为我想要的特定风格或情绪找到和声。我用了 country pop, uplifting, catchy anthem, introspective mood, love 这串提示词生成了音频，并从中取用了和弦进行。但提取可用的元素非常费劲。”
:::

### 设计目标（Design Goals）

:::bi

Guided by both our formative interviews and prior literature, we establish three Design Goals for our system:

:::zh

在我们的形成性访谈和先前文献的共同指导下，我们为系统确立了三个设计目标：
:::

:::bi

- **Incorporate multimodal inspirations.** An AI songwriting system can support creative processes by enabling users to incorporate inspirations from diverse sources into their songwriting process. Based on the formative study, sources that users draw inspiration from are visual, narrative, and existing music.
- **Transform abstract ideas into musical elements.** The system should support transforming high-level, abstract ideas into concrete musical elements. As informed by prior studies, this transformation process should ensure user control over iterative generation of musical elements (Shneiderman, 2022; Shneiderman et al., 2016), while aligning outputs with users’ creative intentions (Horvitz, 1999).
- **Provide modular musical building blocks.** Consistent with prior studies (Horvitz, 1999; Resnick et al., 2018), participants in our formative study preferred modular, editable outputs that can be seamlessly integrated into their workflow. As such, the system should focus on generating modular musical elements—such as chord progressions—that can be refined and directly integrated into songwriting interfaces (e.g., DAWs).

:::zh

- **融入多模态灵感。** AI 歌曲创作系统可以通过让用户把来自多种来源的灵感融入其歌曲创作过程来支持创作过程。根据形成性研究，用户汲取灵感的来源是视觉，叙事和已有音乐。
- **把抽象想法转化为音乐元素。** 系统应支持把高层次的抽象想法转化为具体的音乐元素。正如先前研究所表明的，这一转化过程应确保用户对音乐元素的迭代生成拥有控制（Shneiderman, 2022; Shneiderman et al., 2016），同时使输出与用户的创作意图保持一致（Horvitz, 1999）。
- **提供模块化的音乐构建块。** 与先前研究一致（Horvitz, 1999; Resnick et al., 2018），我们形成性研究中的参与者偏好模块化，可编辑的输出，这些输出可以无缝融入其工作流。因此，系统应专注于生成模块化的音乐元素，例如和弦进行，这些元素可以精修并直接整合进歌曲创作界面（例如 DAW）。
:::

## Amuse：概述（Amuse: Overview）

:::bi

Based on our design goals, we present Amuse (Figure 2), a songwriting assistant that transforms high-level multimodal inspirations into chord progressions. Amuse supports diverse sources of inspiration, including text, images, and audio (DG1), and translates these abstract inputs into coherent chord progressions (DG2) by either keyword-guided chord generation or audio transcription. By focusing on chord progressions as the system outputs (DG3), Amuse provides users with fundamental components that can be seamlessly integrated into their compositions within the songwriting interface. In this section, we first provide an overview of Amuse (§4.1), explain the interactions and technical details within Amuse’s interface (§4.2-§4.3), and implementation (§4.4).

:::zh

基于我们的设计目标，我们提出 Amuse（图 2），一个把高层次多模态灵感转化为和弦进行的写歌助手。Amuse 支持多样的灵感来源，包括文本，图像和音频（DG1），并通过关键词引导的和弦生成或音频转录，把这些抽象输入转化为连贯的和弦进行（DG2）。通过聚焦于把和弦进行作为系统输出（DG3），Amuse 为用户提供了基础组件，这些组件可以在歌曲创作界面中无缝融入他们的作品。在本节中，我们首先概述 Amuse（§4.1），说明 Amuse 界面内的交互和技术细节（§4.2-§4.3），以及实现（§4.4）。
:::

:::figure
![](./images/amuse/fig-02.png)

Figure 2: 

:::zh
图 2：认三个框：A 是 Hookpad 主编辑区，B 是浮在上面的 Amuse 窗（当前显示 Chord Generator），C 是 Hookpad 自带的 Aria。Amuse 以 Chrome 扩展浮窗的形式叠在编辑器上，不打断原有的写作节奏，这和它“无缝融入创作流程”的设计目标对得上。
:::
:::

### 系统概述（System Overview）

:::bi

Amuse is built as a Chrome extension that works on top of Hookpad (Hookpad, 2024), a widely-used online songwriting tool developed by Hooktheory (Hooktheory, 2024) (see Figure 2). The decision to develop Amuse as an companion tool to Hookpad rather than a standalone application was driven by the robust songwriting functionalities already present in Hookpad, such as MIDI input, playback, and instrumentation options, making it an efficient platform to build upon without the need to duplicate existing functionalities. Furthermore, Hookpad includes Aria (Donahue et al., 2025; Thickstun et al., 2024), an AI songwriting assistant that generates melody/chord continuations or infills based on user-provided melodies and chords. Aria is representative of an emerging family of contextual AI music assistants (Louie et al., 2020; Huang et al., 2019b; Louie et al., 2022), i.e., ones that generate musical outputs based on existing musical material. In contrast, Amuse is designed to facilitate multimodal transformations, complementary to the contextual inputs to Aria. By integrating Amuse with Hookpad and Aria, we create a unique environment to study the interaction between these different forms of music AI assistance. This setup not only allows us to explore the synergies that Amuse brings to the previous songwriting interfaces but also provides valuable insights into their collaborative potential in enhancing the songwriting process.

:::zh

Amuse 被构建为一个 Chrome 扩展，运行在 Hookpad（Hookpad, 2024）之上，后者是一个由 Hooktheory（Hooktheory, 2024）开发的广泛使用的在线歌曲创作工具（见图 2）。之所以把 Amuse 开发成 Hookpad 的配套工具而不是独立应用，是因为 Hookpad 已经具备强大的歌曲创作功能，例如 MIDI 输入，播放和配器选项，这使它成为一个高效的构建平台，无需重复实现现有功能。此外，Hookpad 包含 Aria（Donahue et al., 2025; Thickstun et al., 2024），一个 AI 写歌助手，它根据用户提供的旋律与和弦生成旋律/和弦的续写或填充。Aria 代表了一类新兴的上下文式 AI 音乐助手（Louie et al., 2020; Huang et al., 2019b; Louie et al., 2022），也就是根据现有音乐材料生成音乐输出的助手。相比之下，Amuse 被设计用来促进多模态转化，与 Aria 的上下文输入形成互补。通过把 Amuse 与 Hookpad 和 Aria 整合在一起，我们创造了一个独特的环境来研究这些不同形式的音乐 AI 辅助之间的交互。这种设置不仅让我们得以探索 Amuse 为既有歌曲创作界面带来的协同作用，也为了解它们在增强歌曲创作过程中的协作潜力提供了宝贵的见解。
:::

:::bi

Amuse comprises two main features: Chord Generator (§4.2) and Chord Transcriber (§4.3). Chord Generator processes text and image inputs, extracting relevant musical keywords that users can select and refine. These keywords are then used to guide the generation of chord progressions that align with the mood and concepts embodied by the keywords. On the other hand, Chord Transcriber accepts audio inputs and transcribes them into chord progressions. When users select (click) chords suggested by Amuse, they are instantly integrated into the Hookpad interface, where they can be played back and further refined. Users can change instrumentation, timbre, and play the sounds within the Hookpad interface, and continue songwriting based on Amuse’s suggestions.

:::zh

Amuse 包含两个主要功能：和弦生成器（§4.2）和和弦转录器（§4.3）。和弦生成器处理文本和图像输入，提取用户可以选择和精修的相关音乐关键词。这些关键词随后被用来引导生成与关键词所体现的情绪和概念相符的和弦进行。另一方面，和弦转录器接受音频输入并把它们转录成和弦进行。当用户选择（点击）Amuse 建议的和弦时，这些和弦会立即整合进 Hookpad 界面，在那里可以播放并进一步精修。用户可以在 Hookpad 界面内更换配器和音色，并播放声音，并根据 Amuse 的建议继续歌曲创作。
:::

### 和弦生成器（Chord Generator）

:::figure
![](./images/amuse/fig-03.png)

Figure 3: 

:::zh
图 3：从上往下看三步：A 给输入（传图或打字，也可以直接写关键词），B 点“生成关键词”并勾选想要的词，C 点“生成和弦”得到三小节或四小节的和弦。关键词是这个工具的核心中介，负责把抽象灵感翻译成可勾选、可编辑的音乐术语。
:::
:::

#### 和弦生成器界面（Chord Generator Interface）

:::bi

The Chord Generator interface is illustrated in Figure 3. Upon opening the Chord Generator, users are prompted to provide an image, text input, or both, which are then used to extract relevant music keywords (Figure 3A). When users click the ‘Generate Keywords’ button, the system suggests keywords based on the multimodal inputs (Figure 3B). Users can select from the suggested keywords, with selected keywords automatically inserted into the keyword editor for further refinement. After finalizing the keywords, users can click the ‘Generate Chords’ button to receive chord progressions that align with the selected music keywords (Figure 3C). The interface reads the key configuration (e.g., G Maj) in the Hookpad editor interface and generates the chord progressions in the specified key. Users can also specify the number of bars (3 or 4) for the chord progressions. Upon clicking the button, Amuse generates and displays four chord progressions, drawing on prior research that demonstrates multiple suggestions enhance creativity and are preferred in ideation tasks (Lee et al., 2024; Buschek et al., 2021; Dang et al., 2023; Louie et al., 2020). We specifically provide four suggestions per query, following previous work on human-AI collaborative music creation system (Louie et al., 2020). By clicking on any of the suggestions, the chosen progression is automatically inserted into the Hookpad editor, where users can further modify or play the chords to integrate them into their compositions.

:::zh

和弦生成器界面如图 3 所示。打开和弦生成器后，系统提示用户提供图像，文本输入，或两者都提供，这些输入随后被用来提取相关的音乐关键词（图 3A）。当用户点击“Generate Keywords”按钮时，系统根据多模态输入建议关键词（图 3B）。用户可以从建议的关键词中选择，选中的关键词会自动插入关键词编辑器以便进一步精修。在确定关键词后，用户可以点击“Generate Chords”按钮，获得与所选音乐关键词相符的和弦进行（图 3C）。界面读取 Hookpad 编辑器界面中的调配置（例如 G 大调），并在指定的调中生成和弦进行。用户还可以为和弦进行指定小节数（3 或 4）。点击按钮后，Amuse 生成并显示四个和弦进行，这借鉴了先前的研究，这些研究表明多个建议能增强创造力，并且在构思任务中更受青睐（Lee et al., 2024; Buschek et al., 2021; Dang et al., 2023; Louie et al., 2020）。我们遵循先前关于人机协同音乐创作系统的工作（Louie et al., 2020），特意为每次查询提供四个建议。点击任意一个建议，所选的和弦进行会自动插入 Hookpad 编辑器，用户可以在那里进一步修改或播放和弦，把它们整合进自己的作品。
:::

#### 基于关键词的和弦生成流程（Keyword-based Chord Generation Pipeline）

:::bi

We adopted a keyword-based interaction framework between multimodal inputs and chord progressions to help users create meaningful semantic connections between two modalities that are otherwise difficult to link due to their abstract and morphologically different nature (Singh et al., 2023). Keywords serve as an intermediary communication layer, inspired by practices in creativity support tools in the vision domain (Liu et al., 2022; Liu et al., 2023; Choi et al., 2024). To extract music-related keywords that align with user inputs, we leverage the multimodal LLM, GPT-4o (OpenAI, 2024b), instructing it with a list of music styles and genre-specific keywords crawled from a music keyword wiki (suno.wiki, 2024). The prompt used for keyword generation can be found in Appendix A.

:::zh

我们在多模态输入与和弦进行之间采用了基于关键词的交互框架，帮助用户在两种模态之间建立有意义的语义联系，这两种模态由于抽象且形态各异，本来很难关联（Singh et al., 2023）。关键词充当一个中间的沟通层，这一做法受到视觉领域创造力支持工具实践的启发（Liu et al., 2022; Liu et al., 2023; Choi et al., 2024）。为了提取与用户输入相符的音乐相关关键词，我们利用多模态大语言模型 GPT-4o（OpenAI, 2024b），用从音乐关键词维基（suno.wiki, 2024）抓取的音乐风格和流派关键词列表来指示它。用于关键词生成的提示词见附录 A。
:::

:::bi

For keyword-based chord generation, to ensure that the generated chords are diverse, musically coherent, and relevant to input keywords, we developed a rejection-sampling-based chord generation method that integrates an LLM with a language model prior trained over chord data. The detailed algorithm and its implementation are discussed in §5.

:::zh

对于基于关键词的和弦生成，为了确保生成的和弦多样化，音乐上连贯且与输入关键词相关，我们开发了一种基于拒绝采样的和弦生成方法，它把大语言模型与一个在和弦数据上训练的语言模型先验结合起来。详细算法及其实现将在 §5 中讨论。
:::

:::figure
![](./images/amuse/fig-04.png)

Figure 4: 

:::zh
图 4：这条路线走的是“从现成的歌里扒和弦”：A 传本地音频或贴 YouTube 链接，B 在预览里选一段，C 转录成和弦，D 再换成目标调。注意它和 Chord Generator 是两条独立的入口，后面的研究发现这条路线实际用得不多。
:::
:::

### 和弦转录器（Chord Transcriber）

:::bi

The Chord Transcriber interface is illustrated in Figure 4. Users can either upload a local audio file or enter a YouTube URL for transcription (Figure 4A). Once the audio source is uploaded, users can preview the audio and set the transcription window, with a maximum length of 30 seconds (Figure 4B). Upon clicking the ‘Transcribe’ button, Amuse processes the request with a 10$-$15 seconds delay and displays the detected key and chords for the selected audio segment (Figure 4C). The transcribed audio can be played back with the corresponding chords highlighted in sync with the playback. Users can click on any chord to automatically paste it into the Hookpad editor for further refinement. To accommodate key differences between the detected key and the key the user is working in, the ‘Convert to Hookpad Key’ option allows for automatic transposition of the chords to match the current working key in Hookpad. For chord transcription, we use an established chord transcription API provided by Music AI, a company that creates and provides AI platforms for music and audio production (AI, 2024a).

:::zh

和弦转录器界面如图 4 所示。用户可以上传本地音频文件，或输入 YouTube URL 来进行转录（图 4A）。音频来源上传后，用户可以预览音频并设置转录窗口，最大长度为 30 秒（图 4B）。点击“Transcribe”按钮后，Amuse 处理请求，延迟 10$-$15 秒，并显示所选音频片段检测到的调和和弦（图 4C）。转录出的音频可以播放，相应的和弦会随播放同步高亮。用户可以点击任意和弦，将其自动粘贴到 Hookpad 编辑器中进行进一步精修。为了适应检测到的调与用户当前所用调之间的差异，“Convert to Hookpad Key”选项允许自动移调和弦，使其匹配 Hookpad 中当前的工作调。对于和弦转录，我们使用 Music AI 提供的成熟和弦转录 API，该公司为音乐和音频制作创建并提供 AI 平台（AI, 2024a）。
:::

### 实现（Implementation）

:::bi

We implemented the frontend of Amuse (Chrome extension) in JavaScript and CSS. The backend was implemented as a Flask server, and we call the OpenAI API (OpenAI, 2024c) for all LLM-based functionality (multimodal inputs to keywords, keywords to chords). Regarding the LLM configurations, we use `gpt-4o-2024-05-13` and set the temperature to $1.0$ for all components to promote creativity and diversity in generations.

:::zh

我们用 JavaScript 和 CSS 实现了 Amuse 的前端（Chrome 扩展）。后端实现为一个 Flask 服务器，我们为所有基于大语言模型的功能（多模态输入转关键词，关键词转和弦）调用 OpenAI API（OpenAI, 2024c）。关于大语言模型的配置，我们使用 `gpt-4o-2024-05-13`，并为所有组件把 temperature 设置为 $1.0$，以促进生成中的创造力和多样性。
:::

## 基于关键词的和弦进行生成（Keyword-Based Chord Progression Generation）

:::bi

Directly generating chord progressions conditioned on music keywords presents a challenge due to the lack of paired training data linking music keywords to chord progressions. To address this issue, we propose a method that combines the general capabilities of LLMs and a unimodal chord generation model specifically trained on chord data. We first introduce the generation goals we aim to achieve (§5.1). We then detail the components of our pipeline designed to address these goals, including a prompting technique for diverse outputs (§5.2) and a rejection sampling methods for contextually coherent outputs (§5.3). Finally, we describe the implementation of our chord progression generation method deployed in Amuse (§5.4).

:::zh

由于缺乏把音乐关键词与和弦进行联系起来的配对训练数据，直接根据音乐关键词条件生成和弦进行是一项挑战。为了解决这个问题，我们提出一种方法，把大语言模型的通用能力和一个专门在和弦数据上训练的单模态和弦生成模型结合起来。我们首先介绍我们旨在实现的生成目标（§5.1）。然后我们详细说明为解决这些目标而设计的流程组件，包括一种用于生成多样化输出的提示词技巧（§5.2）和一种用于生成语境上连贯输出的拒绝采样方法（§5.3）。最后，我们描述在 Amuse 中部署的和弦进行生成方法的实现（§5.4）。
:::

### 生成目标（Generation Goals）

:::bi

When generating chord progressions from user-provided keywords, we consider three desiderata: **diversity**, **relevance**, and **coherence**. **Diversity** ensures that users receive a variety of options, as offering multiple suggestions has been shown to enhance creativity (Lee et al., 2024) and is often preferred in ideation tasks (Buschek et al., 2021; Dang et al., 2023; Louie et al., 2020). **Relevance** ensures that the generated chord progressions closely align with the user-provided keywords, reflecting the musical qualities or moods the user intends to capture. **Coherence** ensures that the chord progressions are musically coherent (i.e., follow real music data distribution). Ensuring both relevance and coherence is crucial as misaligned or low-quality suggestions can negatively impact user experience in creativity support tools (Lee et al., 2024; Gero and Chilton, 2019; Clark et al., 2018; Manjavacas et al., 2017).

:::zh

在根据用户提供的关键词生成和弦进行时，我们考虑三个期望目标：**多样性**，**相关性**和**连贯性**。**多样性**确保用户获得多种选项，因为提供多个建议已被证明能增强创造力（Lee et al., 2024），并且在构思任务中往往更受青睐（Buschek et al., 2021; Dang et al., 2023; Louie et al., 2020）。**相关性**确保生成的和弦进行与用户提供的关键词紧密一致，反映用户想要捕捉的音乐特质或情绪。**连贯性**确保和弦进行在音乐上连贯（即遵循真实音乐数据分布）。同时确保相关性和连贯性至关重要，因为不一致或低质量的建议会对创造力支持工具中的用户体验产生负面影响（Lee et al., 2024; Gero and Chilton, 2019; Clark et al., 2018; Manjavacas et al., 2017）。
:::

:::annotation
多样性、相关性、连贯性这三个词是全文的评价轴。后面技术评测就按这三条分开考：提示词技巧管“多样性”，拒绝采样管“连贯性”和“相关性”。读结果的时候可以按这三条对号入座，不容易绕晕。
:::

:::bi

Formally, let $P(\mathbf{x}|\mathbf{c})$ be a target conditional distribution of chord progression $\mathbf{x}$ capable of generating diverse, relevant, and coherent suggestions given keywords control $\mathbf{c}$. Modeling $P(\mathbf{x}|\mathbf{c})$ is limited by the scarcity of music data that contains *paired* keywords and chord progressions. As a result, we aim to find a good approximation of $P(\mathbf{x}|\mathbf{c})$ by using an *unpaired* chord progression dataset $\mathcal{D}=\{\mathbf{x}_{i}\}_{i=1}^{N}$ and an LLM (e.g., GPT-4o (OpenAI, 2024b)) that has a general understanding of language and general music-related context but lacks the direct knowledge of harmonic structures seen in real-world music data (as it is not explicitly trained on music data). Specifically, we define $Q(\mathbf{x}|\mathbf{c})$ as an LLM that generates chord progressions $\mathbf{x}$ given keywords $\mathbf{c}$ as prompts. We select an instruction-tuned LLM (GPT-4o (OpenAI, 2024b)) for $Q(\mathbf{x}|\mathbf{c})$ due to its enhanced ability to follow user instructions that are critical for generating contextually relevant chord progressions from music keywords. These models are pretrained on large-scale text data from public webpages spanning diverse topics (OpenAI, 2024a), which include music-related content (for instance, chord transcriptions (Tabs, 2024) or music theory blogs (Unison, 2024)). As such, we assume the model has a general understanding of music and can infer relationships between musical elements (e.g., chords) and high-level descriptions (e.g., mood or style). While $Q(\mathbf{x}|\mathbf{c})$ is capable of keyword-controlled generation, we find this leads to a very sharp distribution (i.e., lacks diversity; we later show in our experiments that its outputs exhibit low diversity). We mitigate this lack of diversity by introducing a prompting technique for LLMs to generate diverse samples (§5.2). We also find the distribution $Q(\mathbf{x}|\mathbf{c})$ inherently has low coherence (i.e., deviates from real music distribution) as LLMs are not explicitly trained on music data. We thus present a rejection sampling strategy using a unimodal chord generation model $P(\mathbf{x})$ to select coherent outputs (§5.3). Based on these techniques, we describe the implementation of our chord progression generation process deployed in Amuse (§5.4).

:::zh

形式化地说，设 $P(\mathbf{x}|\mathbf{c})$ 为和弦进行 $\mathbf{x}$ 的目标条件分布，它能够在给定关键词控制 $\mathbf{c}$ 的情况下生成多样化，相关且连贯的建议。对 $P(\mathbf{x}|\mathbf{c})$ 进行建模受到音乐数据稀缺的限制，这些数据需要包含配对的关键词与和弦进行。因此，我们旨在通过使用一个未配对的和弦进行数据集 $\mathcal{D}=\{\mathbf{x}_{i}\}_{i=1}^{N}$ 和一个大语言模型（例如 GPT-4o（OpenAI, 2024b））来找到 $P(\mathbf{x}|\mathbf{c})$ 的良好近似，这个大语言模型对语言和一般音乐相关语境有大致理解，但缺乏对真实世界音乐数据中可见的和声结构的直接知识（因为它没有明确地在音乐数据上训练）。具体来说，我们把 $Q(\mathbf{x}|\mathbf{c})$ 定义为一个大语言模型，它在给定关键词 $\mathbf{c}$ 作为提示词的情况下生成和弦进行 $\mathbf{x}$。我们为 $Q(\mathbf{x}|\mathbf{c})$ 选择一个经过指令微调的大语言模型（GPT-4o（OpenAI, 2024b）），因为它更善于遵循用户指令，而这对于从音乐关键词生成语境上相关的和弦进行至关重要。这些模型在来自公开网页的大规模文本数据上预训练，涵盖各种主题（OpenAI, 2024a），其中包括音乐相关内容（例如和弦转录（Tabs, 2024）或音乐理论博客（Unison, 2024））。因此，我们假设该模型对音乐有大致的理解，能够推断音乐元素（例如和弦）与高层次描述（例如情绪或风格）之间的关系。虽然 $Q(\mathbf{x}|\mathbf{c})$ 能够进行关键词控制的生成，但我们发现这会导致一个非常尖锐的分布（即缺乏多样性，我们稍后在实验中表明其输出表现出低多样性）。我们通过引入一种让大语言模型生成多样化样本的提示词技巧来缓解这种多样性的缺乏（§5.2）。我们还发现分布 $Q(\mathbf{x}|\mathbf{c})$ 天然地具有低连贯性（即偏离真实音乐分布），因为大语言模型没有明确地在音乐数据上训练。因此，我们提出一种拒绝采样策略，使用单模态和弦生成模型 $P(\mathbf{x})$ 来选出连贯的输出（§5.3）。基于这些技巧，我们描述在 Amuse 中部署的和弦进行生成过程的实现（§5.4）。
:::

:::annotation
这段的记号要盯住：P(x|c) 是想要但拿不到的目标分布（关键词到和弦的完美映射），Q(x|c) 是 GPT-4o 实际能给出的分布。作者发现 Q 太“尖”，也就是老出重复答案，这才引出后面两个补救：提示词技巧扩多样性，拒绝采样纠连贯性。
:::

### 生成多样化和弦进行的提示词技巧（Prompting Technique For Diverse Chord Progressions）

:::bi

In creative tasks, generating diverse suggestions with LLMs typically involves multiple queries to the model (Lee et al., 2022; Buschek et al., 2021; Dang et al., 2023). However, instruction-tuned LLMs such as InstructGPT (Ouyang et al., 2022) and GPT-4o (OpenAI, 2024b) are prone to a homogenization effect, where multiple queries often yield repetitive responses (Padmakumar and He, 2024; Anderson et al., 2024; Doshi and Hauser, 2024; Zhang et al., 2024). This is particularly problematic in our context, where generating diverse outputs is crucial for fostering creativity.

:::zh

在创作任务中，用大语言模型生成多样化的建议通常涉及对模型的多次查询（Lee et al., 2022; Buschek et al., 2021; Dang et al., 2023）。然而，InstructGPT（Ouyang et al., 2022）和 GPT-4o（OpenAI, 2024b）等经过指令微调的大语言模型容易出现同质化效应，即多次查询往往产生重复的响应（Padmakumar and He, 2024; Anderson et al., 2024; Doshi and Hauser, 2024; Zhang et al., 2024）。这在我们这个语境下尤其成问题，因为生成多样化输出对培养创造力至关重要。
:::

:::bi

To address this challenge of generating diverse chord progressions with instruction-tuned LLMs, we employ a prompting technique that instructs an LLM to generate a large collection of chord progressions. Our prompt takes user-written keywords, key (e.g., C maj) and bar counts (e.g., 4 for 4-bar chord progression) as inputs. The prompt then instructs the model $Q(\mathbf{x}|\mathbf{c})$ to generate $N$ diverse chord progressions that reflect the mood and concept of the user keywords. To enhance diversity, the prompt contains instructions to vary chord components (e.g., root, quality, extensions, alterations), progression patterns (e.g., diatonic, chromatic), and cadences. The full prompt is detailed in Appendix A.2.

:::zh

为了解决用经过指令微调的大语言模型生成多样化和弦进行这一挑战，我们采用一种提示词技巧，指示大语言模型生成一大批和弦进行。我们的提示词把用户写下的关键词，调（例如 C 大调）和小节数（例如 4，代表 4 小节和弦进行）作为输入。随后提示词指示模型 $Q(\mathbf{x}|\mathbf{c})$ 生成 $N$ 个多样化的和弦进行，反映用户关键词的情绪和概念。为了增强多样性，提示词包含改变和弦成分（例如根音，性质，扩展音，变化音），进行模式（例如自然音阶，半音阶）和终止式的指令。完整提示词详见附录 A.2。
:::

### 基于拒绝采样的和弦进行生成（Chord Progression Generation By Rejection Sampling）

:::bi

Given $N$ diverse chord progressions generated by $Q(\mathbf{x}|\mathbf{c})$ (§5.2), the most naive approach would be randomly sampling four progressions and showing them to the users. However, this is not the best approach as $Q(\mathbf{x}|\mathbf{c})$ generations could be less coherent, i.e., do not align with the statistical properties of chord progressions in real music data, as these language models are not explicitly trained on music data (OpenAI, 2024a). Consequently, relying solely on $Q(\mathbf{x}|\mathbf{c})$ for chord generation may produce noisy or less conventional progressions that do not meet the musical expectations of users. Therefore, our aim is to filter and select from the generations that are musically coherent, i.e., following real-world music data distribution. To achieve this, we employ rejection sampling (Neal, 2003), a Monte Carlo algorithm that allows us to sample from a target distribution that may be difficult to sample from directly (i.e., $P(\mathbf{x}|\mathbf{c})$), by using a proposal distribution that is easier to sample from (i.e., $Q(\mathbf{x}|\mathbf{c})$).

:::zh

给定由 $Q(\mathbf{x}|\mathbf{c})$ 生成的 $N$ 个多样化和弦进行（§5.2），最朴素的做法是随机抽取四个进行并展示给用户。然而，这不是最好的做法，因为 $Q(\mathbf{x}|\mathbf{c})$ 的生成结果可能不够连贯，也就是与真实音乐数据中和弦进行的统计特性不一致，因为这些语言模型没有明确地在音乐数据上训练（OpenAI, 2024a）。因此，仅仅依赖 $Q(\mathbf{x}|\mathbf{c})$ 来生成和弦，可能会产生嘈杂或不太常规的进行，无法满足用户的音乐预期。因此，我们的目标是从生成结果中过滤并选出在音乐上连贯的进行，也就是遵循真实世界音乐数据分布的进行。为了实现这一点，我们采用拒绝采样（Neal, 2003），这是一种蒙特卡洛算法，让我们能够借助一个更容易采样的提议分布（即 $Q(\mathbf{x}|\mathbf{c})$），从可能难以直接采样的目标分布（即 $P(\mathbf{x}|\mathbf{c})$）中采样。
:::

##### 方法（Method）

:::bi

We perform rejection sampling (Neal, 2003) to improve the coherence of $Q(\mathbf{x}|\mathbf{c})$:

:::zh

我们执行拒绝采样（Neal, 2003）来提高 $Q(\mathbf{x}|\mathbf{c})$ 的连贯性：
:::

:::bi

$$
u\sim\text{Unif}(0,1),\,\,\text{{accept} {\bf if }}u<\frac{P(\mathbf{x}|\mathbf{c})}{M\cdot Q(\mathbf{x}|\mathbf{c})}\,\,\text{{\bf else} reject},
$$

:::zh

$$
u\sim\text{Unif}(0,1),\,\,\text{{accept} {\bf if }}u<\frac{P(\mathbf{x}|\mathbf{c})}{M\cdot Q(\mathbf{x}|\mathbf{c})}\,\,\text{{\bf else} reject},
$$
:::

:::annotation
这个式子就是拒绝采样的判定规则：抽一个 0 到 1 的随机数 u，如果 u 小于 P 与 M·Q 的比值就接受，否则拒绝。直觉上，Q 给的那些“太不像真音乐”的候选，比值会很小，被拒掉的概率就大。M 是一个保证比值不超过 1 的缩放常数。
:::

:::bi

where $M>0$ is a constant that ensures the inequality holds for all samples and scales the acceptance ratio. $M$ is chosen such that $M\geq\max_{\mathbf{x}}\left(\frac{P(\mathbf{x}|\mathbf{c})}{Q(\mathbf{x}|\mathbf{c})}\right)$, ensuring that the acceptance rate remains valid across the entire sampling process.

:::zh

其中 $M>0$ 是一个常数，它确保不等式对所有样本都成立，并缩放接受比率。$M$ 的选择满足 $M\geq\max_{\mathbf{x}}\left(\frac{P(\mathbf{x}|\mathbf{c})}{Q(\mathbf{x}|\mathbf{c})}\right)$，从而确保接受率在整个采样过程中始终有效。
:::

:::bi

Since we do not know ground-truth $P(\mathbf{x}|\mathbf{c})$, as well as the value of $Q(\mathbf{x}|\mathbf{c})$ (we can only sample from this distribution), we consider the following alternative using Bayes Rule:

:::zh

由于我们不知道真实值 $P(\mathbf{x}|\mathbf{c})$，也不知道 $Q(\mathbf{x}|\mathbf{c})$ 的值（我们只能从这个分布采样），我们考虑如下使用贝叶斯规则的替代方案：
:::

:::bi

$$
\frac{P(\mathbf{x}|\mathbf{c})}{M\cdot Q(\mathbf{x}|\mathbf{c})}=\frac{P(\mathbf{c}|\mathbf{x})P(\mathbf{x})Q(\mathbf{c})}{M\cdot Q(\mathbf{c}|\mathbf{x})Q(\mathbf{x})P(\mathbf{c})}=\frac{P(\mathbf{c}|\mathbf{x})P(\mathbf{x})}{M\cdot Q(\mathbf{c}|\mathbf{x})Q(\mathbf{x})}\approx\frac{P(\mathbf{x})}{M\cdot Q(\mathbf{x})},
$$

:::zh

$$
\frac{P(\mathbf{x}|\mathbf{c})}{M\cdot Q(\mathbf{x}|\mathbf{c})}=\frac{P(\mathbf{c}|\mathbf{x})P(\mathbf{x})Q(\mathbf{c})}{M\cdot Q(\mathbf{c}|\mathbf{x})Q(\mathbf{x})P(\mathbf{c})}=\frac{P(\mathbf{c}|\mathbf{x})P(\mathbf{x})}{M\cdot Q(\mathbf{c}|\mathbf{x})Q(\mathbf{x})}\approx\frac{P(\mathbf{x})}{M\cdot Q(\mathbf{x})},
$$
:::

:::annotation
这一步是绕开“没有配对数据”的关键操作：作者用贝叶斯把带关键词的条件分布 P(x|c) 约化成 P(x) 与 Q(x) 的比值，再利用“关键词分布相同、且生成的 x 和 c 大致对齐”两个近似，把 c 从式子里消掉。于是训练只需要无配对的和弦数据，不需要“图到和弦”的成对标注。
:::

:::bi

since $P(\mathbf{c})=Q(\mathbf{c})$ as they are the same predefined keyword distributions and we assume $P(\mathbf{c}|\mathbf{x})\approx Q(\mathbf{c}|\mathbf{x})$ as the generated progression $\mathbf{x}$ from LLMs closely align with $\mathbf{c}$. Thus, we perform rejection sampling by calculating the ratio $\frac{P(\mathbf{x})}{M\cdot Q(\mathbf{x})}$, where both $P(\mathbf{x}$) and $Q(\mathbf{x})$ can be learned by training two deep neural networks with the dataset $\mathcal{D}$ and a large collection of generated chord from LLMs, respectively.

:::zh

因为 $P(\mathbf{c})=Q(\mathbf{c})$，它们都是相同的预定义关键词分布，并且我们假设 $P(\mathbf{c}|\mathbf{x})\approx Q(\mathbf{c}|\mathbf{x})$，因为大语言模型生成的进行 $\mathbf{x}$ 与 $\mathbf{c}$ 紧密一致。因此，我们通过计算比率 $\frac{P(\mathbf{x})}{M\cdot Q(\mathbf{x})}$ 来执行拒绝采样，其中 $P(\mathbf{x}$) 和 $Q(\mathbf{x})$ 都可以通过分别用数据集 $\mathcal{D}$ 和大语言模型生成的大量和弦来训练两个深度神经网络而习得。
:::

:::bi

**Chord Progression Generation Pipeline in Amuse**

**1:** Input: Keywords $\mathbf{c}$  
**2:** Output: Accepted chord progressions $\mathbf{Y}$  
**3:** $\mathbf{X}\leftarrow$ Candidate chord progressions $\{\mathbf{x}_{i}\}_{i=1}^{N}$ from $Q(\mathbf{x}|\mathbf{c})$  
**4:** $\mathbf{Y}\leftarrow$ $\emptyset$  
**5:** for $\mathbf{x}$ in $\mathbf{X}$ do  
**6:** Sample $u\sim\text{Unif}(0,1)$  
**7:** if $u<\frac{P(\mathbf{x})}{MQ(\mathbf{x})}$ then $\triangleright$ Compute acceptance probability  
**8:** $\mathbf{Y}\leftarrow\mathbf{Y}\cup\{\mathbf{x}\}$ $\triangleright$ Accept the generated chord $\mathbf{x}_{i}$  
**9:** end if  
**10:** end for  
**11:** if $|\mathbf{Y}|<4$ then  
**12:** $\mathbf{Y}\leftarrow\mathbf{Y}\cup\{\text{top-}k(\mathbf{x}_{i}:\frac{P(\mathbf{x}_{i})}{MQ(\mathbf{x}_{i})})\}$, where $k=4-|\mathbf{Y}|$ $\triangleright$ Add top-$k$ samples if $\mathbf{Y}$ is smaller than the target size  
**13:** end if  
**14:** Return $\mathbf{Y}$

:::zh

**Amuse 中的和弦进行生成流程**

**1:** 输入：关键词 $\mathbf{c}$  
**2:** 输出：被接受的和弦进行 $\mathbf{Y}$  
**3:** $\mathbf{X}\leftarrow$ 来自 $Q(\mathbf{x}|\mathbf{c})$ 的候选和弦进行 $\{\mathbf{x}_{i}\}_{i=1}^{N}$  
**4:** $\mathbf{Y}\leftarrow$ $\emptyset$  
**5:** 对于 $\mathbf{X}$ 中的每个 $\mathbf{x}$ 执行  
**6:** 采样 $u\sim\text{Unif}(0,1)$  
**7:** 如果 $u<\frac{P(\mathbf{x})}{MQ(\mathbf{x})}$ 则 $\triangleright$ 计算接受概率  
**8:** $\mathbf{Y}\leftarrow\mathbf{Y}\cup\{\mathbf{x}\}$ $\triangleright$ 接受生成的和弦 $\mathbf{x}_{i}$  
**9:** 结束 if  
**10:** 结束 for  
**11:** 如果 $|\mathbf{Y}|<4$ 则  
**12:** $\mathbf{Y}\leftarrow\mathbf{Y}\cup\{\text{top-}k(\mathbf{x}_{i}:\frac{P(\mathbf{x}_{i})}{MQ(\mathbf{x}_{i})})\}$，其中 $k=4-|\mathbf{Y}|$ $\triangleright$ 如果 $\mathbf{Y}$ 小于目标数量，则加入 top-$k$ 样本  
**13:** 结束 if  
**14:** 返回 $\mathbf{Y}$
:::

:::annotation
算法 1 建议顺着箭头读：先让 Q 生成 N 个候选，逐个按接受概率筛，筛不够四个就用比值最高的前 k 个补足，保证用户每次至少看到四个建议。记住这个“先筛后补”的结构，第 5.4 节的部署细节就只是把这个流程落到服务器上。
:::

##### 实现（Implementation）

:::bi

For $P(\mathbf{x})$ and $Q(\mathbf{x})$, we train two Long Short-Term Memory (LSTM) models. Specifically, for $P(\mathbf{x})$, we use the HookTheory dataset (Donahue et al., 2022), which comprises 50 hours of melody and chord progression annotations derived from Hooktheory’s TheoryTab database (DB, 2024). This dataset spans a wide range of genres, including pop, rock, EDM, jazz, and classical. For training $Q(\mathbf{x})$, we use chord progressions generated by GPT-4o (OpenAI, 2024b). We use the same prompt used for generating diverse chord suggestions (§5.2). To marginalize the influence of specific keywords during generation (i.e., generalize across diverse keywords), we randomly sample keywords from the music keyword wiki (suno.wiki, 2024) for each generation. This process resulted in a total of 25,000 4-bar chord progressions with keywords abstracted into the underlying distribution. After fitting these models, the constant $M$ in the rejection sampling algorithm was determined by calculating the ratio $\frac{P(\mathbf{x})}{Q(\mathbf{x})}$ over all chord progressions generated by GPT-4o. We selected the 95th percentile value to avoid the influence of extreme outliers, resulting in $M=7.64$. We provide training details and hyperparameter values in Appendix B.

:::zh

对于 $P(\mathbf{x})$ 和 $Q(\mathbf{x})$，我们训练两个长短期记忆（LSTM）模型。具体来说，对于 $P(\mathbf{x})$，我们使用 HookTheory 数据集（Donahue et al., 2022），该数据集包含 50 小时的旋律与和弦进行标注，来自 Hooktheory 的 TheoryTab 数据库（DB, 2024）。这个数据集涵盖广泛的流派，包括流行，摇滚，EDM，爵士和古典。对于训练 $Q(\mathbf{x})$，我们使用 GPT-4o（OpenAI, 2024b）生成的和弦进行。我们使用与生成多样化和弦建议时相同的提示词（§5.2）。为了在生成过程中消除特定关键词的影响（即在各种关键词之间泛化），我们在每次生成时从音乐关键词维基（suno.wiki, 2024）随机采样关键词。这一过程最终得到总计 25,000 个 4 小节和弦进行，关键词被抽象进底层分布。在拟合这些模型之后，拒绝采样算法中的常数 $M$ 通过对 GPT-4o 生成的所有和弦进行计算比率 $\frac{P(\mathbf{x})}{Q(\mathbf{x})}$ 来确定。我们选择第 95 百分位的值以避免极端异常值的影响，最终得到 $M=7.64$。我们在附录 B 中提供训练细节和超参数值。
:::

### 在 Amuse 中部署和弦进行生成流程（Deploying Chord Progression Generation Pipeline in Amuse）

:::bi

The obtained constant $M=7.64$ and the trained networks, $P(\mathbf{x})$ and $Q(\mathbf{x})$, are deployed on the backend server to sample LLM-generated chord progressions. To approximately match four chord progressions, we set the number of chord generations to $N=30$ in the deployment (30/$M$ $\approx$ 4). During this process, each progression generated by $Q(\mathbf{x}|\mathbf{c})$ is assessed against the acceptance threshold determined by our rejection sampling method. To ensure we present at least four samples to users, if fewer than four samples are accepted, we select the top-k samples, $k$ = 4 - *num accepted samples*. These samples are ranked by their acceptance probability, $\frac{\tilde{p}(\mathbf{x})}{M\tilde{q}(\mathbf{x})}$. The full sampling process is detailed in Algorithm 1.

:::zh

得到的常数 $M=7.64$ 和训练好的网络 $P(\mathbf{x})$ 与 $Q(\mathbf{x})$ 被部署在后端服务器上，用于对大语言模型生成的和弦进行采样。为了近似匹配四个和弦进行，我们在部署中把和弦生成数量设为 $N=30$（30/$M$ $\approx$ 4）。在这个过程中，$Q(\mathbf{x}|\mathbf{c})$ 生成的每个进行都会根据我们拒绝采样方法确定的接受阈值进行评估。为了确保我们至少向用户展示四个样本，如果被接受的样本少于四个，我们就选择 top-k 样本，其中 $k$ = 4 - 被接受的样本数。这些样本按照它们的接受概率 $\frac{\tilde{p}(\mathbf{x})}{M\tilde{q}(\mathbf{x})}$ 排序。完整的采样过程详见算法 1。
:::

## 技术评测（Technical Evaluation）

:::bi

We conduct a technical evaluation of our chord progression generation approach. We assess whether our prompting technique results in **diverse** chord progressions (§6.1) as well as whether our rejection sampling can sample chord progressions that are **relevant** to keywords and musically **coherent** (§6.2).

:::zh

我们对我们的和弦进行生成方法进行了一项技术评测。我们评估我们的提示技术是否能产生**多样的**和弦进行（§6.1），以及我们的拒绝采样能否采样出与关键词**相关**且在音乐上**连贯**的和弦进行（§6.2）。
:::

### 提示技术评测（Evaluation of Prompting Technique）

:::bi

To assess the effectiveness of our prompting technique (§5.2) in generating more **diverse** chord progressions, we conduct an automatic evaluation comparing our approach against a conventional method of generating multiple suggestions (Lee et al., 2022; Buschek et al., 2021; Dang et al., 2023).

:::zh

为了评估我们的提示技术（§5.2）在生成更多样的和弦进行方面的有效性，我们进行了一项自动评测，将我们的方法与一种生成多个建议的传统方法进行比较（Lee et al., 2022; Buschek et al., 2021; Dang et al., 2023）。
:::

##### 研究设置（Study Setup）

:::bi

We compare the diversity of chord progressions produced by our prompting technique with those generated by the conventional method (*baseline*), which involves querying a model multiple times to generate individual suggestions. In the baseline method, a single 4-bar chord progression is generated per query and repeated 30 times, resulting in a set of 30 4-bar chord progressions. The prompt for the baseline is similar to ours but lacks instructions to generate diverse progressions in a batch (See the full prompt in Appendix A.3). In contrast, our technique generates all 30 4-bar chord progressions in a single batch using a single prompt.

:::zh

我们比较了我们的提示技术所产生的和弦进行的多样性与传统方法（*基线*）所生成的和弦进行的多样性。传统方法需要多次查询模型来生成各个建议。在基线方法中，每次查询生成一个 4 小节和弦进行，重复 30 次，得到一组 30 个 4 小节和弦进行。基线的提示词与我们的类似，但缺少批量生成多样进行的要求（完整提示词见附录 A.3）。相比之下，我们的技术用一条提示词一次性批量生成全部 30 个 4 小节和弦进行。
:::

:::bi

To quantify the diversity of chord progressions, we employ Self-BLEU (Zhu et al., 2018) as our metric. Self-BLEU score measures the diversity of the generated data, with a higher Self-BLEU score indicating less diversity among the chord progressions. Specifically, for each set of 30 4-bar chord progressions, we compute the BLEU score (Papineni et al., 2002) for each individual progression by treating it as the hypothesis and the remaining 29 progressions as references. The Self-BLEU score is then obtained by averaging the BLEU scores across all 30 progressions in the set. This process is repeated across 100 distinct pairs of sets (i.e., 100 sets of 30 4-bar chord progressions generated by our technique and 100 corresponding sets generated by the baseline method). All chord progressions are generated in C, and the music keywords are randomly sampled from the music keyword wiki (suno.wiki, 2024) for each generation. We report the average Self-BLEU score across these 100 pairs for each condition.

:::zh

为了量化和弦进行的多样性，我们采用 Self-BLEU（Zhu et al., 2018）作为度量指标。Self-BLEU 分数衡量生成数据的多样性，Self-BLEU 分数越高表示和弦进行之间的多样性越低。具体来说，对于每组 30 个 4 小节和弦进行，我们把每个单独进行当作假设，把其余 29 个进行当作参考，来计算每个进行的 BLEU 分数（Papineni et al., 2002）。然后对这组中全部 30 个进行的 BLEU 分数取平均，得到 Self-BLEU 分数。这个过程在 100 对不同集合上重复（即 100 组由我们的技术生成的 30 个 4 小节和弦进行，以及 100 组由基线方法生成的对应集合）。所有和弦进行都在 C 调中生成，每次生成时音乐关键词都从音乐关键词 wiki（suno.wiki, 2024）中随机采样。我们报告每个条件下这 100 对集合的 Self-BLEU 平均分数。
:::

##### 结果（Results）

:::bi

Amuse offers more diverse chord suggestions than the baseline by instructing an LLM to generate diverse chords in a batch, as indicated by the Self-BLEU (Zhu et al., 2018) scores for chord progression generations. $\downarrow$ indicates lower values are better. Each value represents the Mean$\pm$Std score across 100 chord progression sets, where each set contains 30 chord progressions.

| Method | Self-BLEU $\downarrow$ |
| --- | --- |
| Baseline | 0.61$\pm$0.18 |
| Amuse | 0.30$\pm$0.12 |

:::zh

Amuse 通过指示大语言模型批量生成多样的和弦，提供了比基线更多样的和弦建议，这一点由和弦进行生成的 Self-BLEU（Zhu et al., 2018）分数所表明。$\downarrow$ 表示数值越低越好。每个数值代表 100 组和弦进行集合上的 Mean$\pm$Std 分数，每组集合包含 30 个和弦进行。

| 方法 | Self-BLEU $\downarrow$ |
| --- | --- |
| Baseline | 0.61$\pm$0.18 |
| Amuse | 0.30$\pm$0.12 |
:::

:::annotation
表 1 的自 BLEU 分数越低代表多样性越好：Amuse 一次批量生成 30 条，分数 0.30，明显低于逐条查询的基线 0.61。这说明“在同一条提示里点名要求多样化”，比把模型问很多遍更能打破重复输出的倾向。
:::

:::bi

Amuse generates keyword-conditioned chord progressions that are more coherent, i.e., closer to real music data distributions, as indicated by Jensen-Shannon Divergence (JSD) (Lin, 1991) between each chord generation method and music data (Donahue et al., 2022). $\downarrow$ indicates that lower values are better. We compute JSD for unigram/bigram chord distributions. LSTM Prior refers to chords generated by an LSTM trained on music data ($P(\mathbf{x})$). GPT-4o refers to chords generated by GPT-4o ($Q(\mathbf{x}|\mathbf{c})$) with keywords marginalized. Amuse represents rejection-sampled GPT-4o using LSTM Prior.

| Method | Keyword Conditional | Unigram $\downarrow$ | Bigram $\downarrow$ |
| --- | --- | --- | --- |
| LSTM Prior (N=25,000) | No | 0.15 | 0.30 |
| GPT-4o (N=25,000) | Yes | 0.42 | 0.57 |
| Amuse (N=3,242) | Yes | 0.27 | 0.46 |

:::zh

Amuse 生成的受关键词条件约束的和弦进行更加连贯，即更接近真实音乐数据分布，这一点由每种和弦生成方法与音乐数据（Donahue et al., 2022）之间的 JS 散度（JSD）（Lin, 1991）所表明。$\downarrow$ 表示数值越低越好。我们针对 unigram 和 bigram 和弦分布计算 JSD。LSTM Prior 指的是在音乐数据上训练出的 LSTM 所生成的和弦（$P(\mathbf{x})$）。GPT-4o 指的是 GPT-4o 在关键词被边缘化的情况下生成的和弦（$Q(\mathbf{x}|\mathbf{c})$）。Amuse 表示使用 LSTM Prior 进行拒绝采样的 GPT-4o。

| 方法 | 关键词条件 | Unigram $\downarrow$ | Bigram $\downarrow$ |
| --- | --- | --- | --- |
| LSTM Prior (N=25,000) | 否 | 0.15 | 0.30 |
| GPT-4o (N=25,000) | 是 | 0.42 | 0.57 |
| Amuse (N=3,242) | 是 | 0.27 | 0.46 |
:::

:::bi

Table 2 shows the result for the diversity. On average, our prompting technique (Amuse) results in a lower Self-BLEU score compared to the conventional method (Baseline). This indicates that the chord progressions generated by our technique are more diverse than those generated by the baseline method.

:::zh

表 2 展示了多样性的结果。平均而言，与传统方法（Baseline）相比，我们的提示技术（Amuse）得到了更低的 Self-BLEU 分数。这表明我们的技术生成的和弦进行比基线方法生成的和弦进行更加多样。
:::

### 拒绝采样方法评测（Evaluation of Rejection Sampling Approach）

:::bi

We evaluate the **coherence** and **relevance** of sampled chord progressions generated through our rejection sampling approach (§5.3). Specifically, our goal is to assess whether the resulting progressions are (i) musically coherent and (ii) relevant to keywords. We first run an automatic evaluation to compare the distribution of the sampled progressions with that of a real music dataset (Hooktheory, 2024), where we interpret closer match as greater musical coherence. We then perform a listening study with musicians to assess both the musical coherence and keyword relevance of the progressions.

:::zh

我们评估了通过我们的拒绝采样方法（§5.3）生成的采样和弦进行的**连贯性**和**相关性**。具体来说，我们的目标是评估所产生的进行是否（i）在音乐上连贯，以及（ii）与关键词相关。我们首先进行一项自动评测，把采样进行的分布与真实音乐数据集（Hooktheory, 2024）的分布进行比较，其中我们把更接近的匹配解释为更高的音乐连贯性。然后我们对音乐人进行了一项听感研究，以评估进行的音乐连贯性和关键词相关性。
:::

#### 自动评测（Automatic Evaluation）

##### 研究设置（Study Setup）

:::bi

The aim of rejection sampling is to align LLM-generated chord progressions with real music data distribution. We quantitatively assess this alignment by computing the Jensen-Shannon Divergence (JSD) (Lin, 1991) between the distributions of the generated chord progressions and real music data. JSD measures the similarity between two probability distributions, with values ranging from 0 (perfect similarity) to 1 (complete divergence). Intuitively, it captures how much the chord distributions from the model differ from those found in real music, offering insight into how well the generated chord progressions reflect real-world harmonic patterns. Specifically, we compare unigram and bigram distributions of chord tokens and use them to calculate JSDs. We use the HookTheory dataset (Donahue et al., 2022) as the real music dataset. We pre-process the chords and get $N=25,601$ chord progressions, all transposed into C. For generating chord progressions with GPT-4o, we randomly sampled music keywords from the music keyword wiki (suno.wiki, 2024) to marginalize the effect of specific keyword choices. We calculate the JSD between the real music data and three different chord generation conditions:

:::zh

拒绝采样的目标是让大语言模型生成的和弦进行与真实音乐数据分布对齐。我们通过计算生成的和弦进行分布与真实音乐数据之间的 JS 散度（JSD）（Lin, 1991）来定量评估这种对齐。JSD 衡量两个概率分布之间的相似度，取值范围从 0（完全相似）到 1（完全背离）。直观上，它刻画了模型的弦分布与真实音乐中的弦分布有多大差异，从而揭示生成的和弦进行在多大程度上反映了真实世界的和声模式。具体来说，我们比较和弦 token 的 unigram 和 bigram 分布，并用它们来计算 JSD。我们使用 HookTheory 数据集（Donahue et al., 2022）作为真实音乐数据集。我们对和弦进行预处理，得到 $N=25,601$ 个和弦进行，全部移调到 C 调。对于用 GPT-4o 生成和弦进行，我们从音乐关键词 wiki（suno.wiki, 2024）中随机采样音乐关键词，以边缘化特定关键词选择的影响。我们计算真实音乐数据与三种不同和弦生成条件之间的 JSD：
:::

:::bi

- LSTM Prior ($N$=25,000): Chord progressions generated by an LSTM model trained on the HookTheory data ($P(\mathbf{x})$).
- GPT-4o ($N$=25,000): Chord progressions generated by GPT-4o ($Q(\mathbf{x}|\mathbf{c})$) with keyword marginalized (i.e., prompted with random keywords).
- Amuse ($N$=3,242): Rejection-sampled GPT-4o using $P(\mathbf{x})$ (LSTM Prior) and $Q(\mathbf{x}).$

:::zh

- LSTM Prior（$N$=25,000）：由一个在 HookTheory 数据上训练的 LSTM 模型生成的和弦进行（$P(\mathbf{x})$）。
- GPT-4o（$N$=25,000）：由 GPT-4o 生成的和弦进行（$Q(\mathbf{x}|\mathbf{c})$），关键词被边缘化（即用随机关键词提示）。
- Amuse（$N$=3,242）：使用 $P(\mathbf{x})$（LSTM Prior）和 $Q(\mathbf{x})$ 进行拒绝采样的 GPT-4o。
:::

##### 结果（Results）

:::bi

Table 2 presents the alignment of each distribution with real music data, as measured by JSD. The results indicate that applying rejection sampling improves the alignment of the chord progressions generated by GPT-4o with the real music data distribution from the Hooktheory dataset. While the initial LLM-generated chord progressions (GPT-4o) exhibited notable divergence from real-world chord patterns, the use of rejection sampling reduced this discrepancy.

:::zh

表 2 展示了各分布与真实音乐数据的对齐情况，用 JSD 衡量。结果表明，应用拒绝采样改善了 GPT-4o 生成的和弦进行与 Hooktheory 数据集真实音乐数据分布的对齐。虽然最初由大语言模型生成的和弦进行（GPT-4o）与真实世界的和弦模式存在明显背离，但拒绝采样的使用缩小了这一差距。
:::

#### 人工评测：听感研究（Human Evaluation: Listening Study）

##### 研究设置（Study Setup）

:::bi

We conducted a listening study to further evaluate the qualitative performance of our rejection sampling approach against two baselines. We evaluated two key aspects of the generated chord progressions: (i) musical coherence and (ii) keyword relevance. Following the prior work (Donahue et al., 2023), listeners were presented with pairs of 7-10s chord progression audio clips, each generated by different methods (ours or baselines).

:::zh

我们进行了一项听感研究，以进一步评估我们的拒绝采样方法相对于两个基线的定性表现。我们评估了生成的和弦进行的两个关键方面：（i）音乐连贯性和（ii）关键词相关性。参照先前的工作（Donahue et al., 2023），我们向听者呈现成对的 7 到 10 秒和弦进行音频片段，每个片段由不同方法（我们的方法或基线）生成。
:::

:::bi

The study comprised two types of tasks: First, participants listened to a pair of 7s 4-bar chord progressions played with piano sounds and were asked to indicate which of the two “sounds more pleasant and natural” (musical coherence). Second, participants were presented with a set of keywords and a pair of 7-10s, 4-bar chord progressions, with instrumentation and BPM adjusted to align with the keyword characteristics. They were then asked to indicate which of the two “better reflects the mood or concept of the given keywords” (keyword relevance).

:::zh

研究包含两类任务：第一，被试聆听一对用钢琴音色演奏的 7 秒 4 小节和弦进行，并被要求指出其中哪一个“听起来更悦耳和自然”（音乐连贯性）。第二，向被试呈现一组关键词和一对 7 到 10 秒的 4 小节和弦进行，配器和 BPM 经过调整以贴合关键词特征。然后要求他们指出其中哪一个“更好地反映了给定关键词的情绪或概念”（关键词相关性）。
:::

:::bi

We generated chord progressions for 10 keyword sets under three conditions: (i) our rejection sampling approach (Amuse), (ii) keyword-conditioned LLM (GPT-4o), and (iii) LSTM trained on music data without keyword conditioning (LSTM Prior). For Amuse, we generated 30 4-bar chord progressions per keyword set using GPT-4o, applied rejection sampling, and randomly selected one from the accepted samples. For GPT-4o, we generated 30 4-bar chord progressions per keyword set and randomly selected one. For LSTM Prior, we generated a 4-bar chord progression using the LSTM model trained on HookTheory data (Donahue et al., 2022) ($P(\mathbf{x})$). Each keyword set was processed five times, resulting in 10 keyword sets $\times$ 5 questions $\times$ ${}_{3}\text{C}_{2}$ pairs = 150 comparisons. Each task was evaluated by three unique listeners, yielding a total of 450 comparisons for each task (N=900 in total). Since the Shapiro-Wilk test indicated that the data was non-parametric, we analyzed these pairwise judgments using the Wilcoxon signed-rank test (Conover, 1999).

:::zh

我们在三种条件下为 10 组关键词生成和弦进行：（i）我们的拒绝采样方法（Amuse），（ii）受关键词条件约束的大语言模型（GPT-4o），以及（iii）在音乐数据上训练且没有关键词条件约束的 LSTM（LSTM Prior）。对于 Amuse，我们用 GPT-4o 为每组关键词生成 30 个 4 小节和弦进行，应用拒绝采样，并从被接受的样本中随机选择一个。对于 GPT-4o，我们为每组关键词生成 30 个 4 小节和弦进行并随机选择一个。对于 LSTM Prior，我们用在 HookTheory 数据（Donahue et al., 2022）上训练的 LSTM 模型（$P(\mathbf{x})$）生成一个 4 小节和弦进行。每组关键词处理五次，得到 10 组关键词 $\times$ 5 个问题 $\times$ ${}_{3}\text{C}_{2}$ 个配对 = 150 次比较。每项任务由三名不同的听者评估，每项任务共得到 450 次比较（总计 N=900）。由于 Shapiro-Wilk 检验表明数据是非参数的，我们使用 Wilcoxon signed-rank 检验（Conover, 1999）分析这些两两判断。
:::

:::bi

We recruited 45 unique listeners from Prolific (Prolific, 2024), targeting individuals with a primary interest in music and 5+ years of experience in musical instruments. Participants were required to have audio devices and confirm they were in a quiet setting before starting the survey. Each participant answered 22 questions (10 on musical coherence, 10 on keyword relevance, and 2 attention checks) and was compensated £2, which corresponds to an approximate hourly rate of 12.13 USD. (Footnote: Among the 49 participants initially recruited, four failed the attention checks and were excluded from the analysis.)

:::zh

我们从 Prolific（Prolific, 2024）招募了 45 名不同的听者，目标人群是对音乐有主要兴趣且拥有 5 年以上乐器演奏经验的人。被试需要拥有音频设备，并在开始调查前确认自己处于安静的环境中。每名被试回答 22 个问题（10 个关于音乐连贯性，10 个关于关键词相关性，2 个注意力检查），并获得 2 英镑报酬，约合每小时 12.13 美元。（脚注：在最初招募的 49 名被试中，有 4 人未通过注意力检查，被排除在分析之外。）
:::

##### 结果（Results）

:::figure
![](./images/amuse/fig-05.png)

Figure 5: 

:::zh
图 5：这张图是上下两块：(a) 音乐连贯性在上，(b) 关键词相关性在下。先看 (a) 第一列和各行之间的落差，行表示“听的人有多大概率选这个系统”，LSTM Prior 最接近真实音乐分布，Amuse 和它没有统计差异，GPT-4o 明显落后；再看 (b)，Amuse 拿到 58% 的最高偏好，显著压过 LSTM Prior（p=0.006）。合起来读：拒绝采样既把和弦拉回了真实音乐分布，又没有牺牲关键词贴合度。
:::
:::

:::bi

Results for systems appear in Figure 5. For Musical Coherence (Figure 5(a)), our method (Amuse) shows no statistical difference compared to LSTM Prior, which is the closest to real music distribution. Conversely, the analysis reveals that users did not prefer samples generated by GPT-4o in terms of musical coherence, with both LSTM Prior and Amuse being significantly more preferred than GPT-4o (LSTM Prior > GPT-4o: $p$=2.18$e$-5; Amuse > GPT-4o: $p$=0.009). For Keyword Relevance (Figure 5(b)), our system (Amuse) was the most preferred by users (58% of cases against any other samples), significantly outperforming LSTM Prior ($p$=0.006).

:::zh

各系统的结果见图 5。在音乐连贯性方面（图 5(a)），我们的方法（Amuse）与最接近真实音乐分布的 LSTM Prior 相比没有统计学差异。相反，分析显示用户并不偏好 GPT-4o 生成的样本，LSTM Prior 和 Amuse 都显著比 GPT-4o 更受偏好（LSTM Prior > GPT-4o：$p$=2.18$e$-5，Amuse > GPT-4o：$p$=0.009）。在关键词相关性方面（图 5(b)），我们的系统（Amuse）最受用户偏好（相对于其他任何样本占 58% 的情况），显著优于 LSTM Prior（$p$=0.006）。
:::

:::annotation
图 5 的两张子图合起来读：连贯性上 Amuse 追平了最接近真实音乐的 LSTM Prior，相关性上 Amuse 反而以 58% 的偏好显著领先。换句话说，拒绝采样没有牺牲关键词贴合度，却把连贯性补了上来，这是方法成立的关键证据。
:::

:::bi

This result, combined with our quantitative findings on diversity and coherence, suggests that Amuse successfully achieves the desiderata we defined; our proposed method generates **diverse** and **coherent** chords that are **relevant** to the user input keywords.

:::zh

这一结果结合我们在多样性和连贯性上的定量发现，表明 Amuse 成功实现了我们定义的目标，即我们提出的方法生成的和弦**多样**且**连贯**，并与用户输入关键词**相关**。
:::

## 用户研究（User Study）

:::bi

We conducted a user study to gain insights and feedback on the potential, limitations, and future opportunities of multimodal music generation tools to support songwriting creativity. This overarching goal broke down into three main research questions:

:::zh

我们进行了一项用户研究，以深入了解多模态音乐生成工具在支持歌曲创作创造力方面的潜力，局限和未来机会。这个总体目标分解为三个主要研究问题：
:::

:::bi

- How does Amuse support songwriters transforming multimodal inspirations into contextual musical elements?
- How do songwriters incorporate Amuse into their creative workflows?
- How does Amuse impact the songwriting experience and perceived quality of the compositions?

:::zh

- Amuse 如何支持写歌人把多模态灵感转化为贴合情境的音乐元素？
- 写歌人如何把 Amuse 融入他们的创作工作流？
- Amuse 如何影响歌曲创作体验以及作品被感知的质量？
:::

### 被试（Participants）

:::bi

We recruited 10 songwriters through targeted email outreach to active Hooktheory users, ensuring that our study included genuine songwriters actively engaging with the platform. We collaborated directly with Hooktheory to reach out to the users. Eight identified themselves as hobbyists (i.e., write songs primarily for personal enjoyment) and two as professional (i.e., write songs as part of a career or generate income from songwriting). All were regular users of Hookpad and engaged in songwriting activity at least once a week. Six participants were regular users of Aria and four had not used Aria before. Participants composed in several different genres, including pop, rock, and blues. We detailed participants in Table 3. Participants were compensated with 50 USD Amazon gift card for the 2-hour study.

:::zh

我们通过向活跃的 Hooktheory 用户发送定向邮件招募了 10 名写歌人，确保我们的研究包含真正在积极使用该平台的写歌人。我们直接与 Hooktheory 合作联系这些用户。其中 8 人自认为是业余爱好者（即写歌主要为了个人乐趣），2 人是专业人士（即写歌是职业的一部分，或靠歌曲创作获得收入）。所有人都是 Hookpad 的常客，并且每周至少从事一次歌曲创作活动。6 名被试是 Aria 的常客，4 人此前没有用过 Aria。被试创作多种不同风格的音乐，包括流行，摇滚和布鲁斯。我们在表 3 中详细列出了被试信息。被试因参加这场 2 小时的研究获得了 50 美元的 Amazon 礼品卡作为报酬。
:::

:::bi

Detailed background information of the participants in the user study (Section 7). For songwriting proficiency, we use self-reported levels. Hobbyist = I write songs primarily for personal enjoyment; Professional = I write songs as part of my career or to generate income from my songwriting.

| Participant ID | Songwriting Proficiency | Songwriting Genre |
| --- | --- | --- |
| P1 | Hobbyist | Blues, Rock, Americana |
| P2 | Hobbyist | Acoustic Pop, Symphonic |
| P3 | Hobbyist | New Age, Classical |
| P4 | Hobbyist | Indie, Alternative, Pop |
| P5 | Hobbyist | Rock, Pop, Country |
| P6 | Hobbyist | Pop |
| P7 | Hobbyist | Pop, Jazz Pop |
| P8 | Hobbyist | Rock, Pop |
| P9 | Professional | Pop, R&B, Hip Hop |
| P10 | Professional | Rock |

:::zh

用户研究（第 7 节）中被试的详细背景信息。对于歌曲创作水平，我们采用自我报告的分级。Hobbyist 指我写歌主要为了个人乐趣，Professional 指我写歌是职业的一部分，或靠歌曲创作获得收入。

| 被试编号 | 歌曲创作水平 | 歌曲创作风格 |
| --- | --- | --- |
| P1 | Hobbyist | 布鲁斯，摇滚，Americana |
| P2 | Hobbyist | 原声流行，交响 |
| P3 | Hobbyist | 新世纪，古典 |
| P4 | Hobbyist | 独立，另类，流行 |
| P5 | Hobbyist | 摇滚，流行，乡村 |
| P6 | Hobbyist | 流行 |
| P7 | Hobbyist | 流行，爵士流行 |
| P8 | Hobbyist | 摇滚，流行 |
| P9 | Professional | 流行，R&B，嘻哈 |
| P10 | Professional | 摇滚 |
:::

:::figure
![](./images/amuse/fig-06.png)

Figure 6: 

:::zh
图 6：从左往右读：30 分钟介绍与教程，然后两场各 25 分钟的写歌（一场只用 Aria，一场 Aria 加 Amuse），每场后 5 分钟问卷，中间 5 分钟休息，最后 25 分钟访谈。这是被试内设计，每个人都先后经历两种条件。
:::
:::

### 研究流程（Study Procedure）

:::bi

To connect with real-world Hooktheory users across the globe, we conducted a remote study using Zoom. During the study, participants performed two songwriting tasks under different conditions: `Baseline` and `Assist`. In the `Baseline` condition, participants were allowed to use only Aria (reflects the *existing* AI-assisted songwriting practice), whereas in the `Assist` condition, participants had access to both Amuse and Aria (introduces *multimodal* inspiration support in addition to the conventional AI-assisted songwriting workflow). We opted not to compare to the manual composition without Aria because our primary goal was to evaluate the added benefit of Amuse in enhancing existing AI-assisted workflows rather than assessing AI versus non-AI approaches. The task for each session was to write an 8-bar chorus (chords and melodies) given one of two songwriting prompts: “Write an 8-bar chorus about the beginning of an unexpected friendship you had in your life” or “Write an 8-bar chorus about your favorite summer holiday memory.” We adapted these prompts from the Songwriting subreddit (Reddit, 2024). Both task prompts and system conditions were randomized across the sessions to minimize the ordering bias.

:::zh

为了与全球各地的真实 Hooktheory 用户建立联系，我们使用 Zoom 进行了一项远程研究。在研究过程中，被试在两种不同的条件下完成两项歌曲创作任务：`Baseline` 和 `Assist`。在 `Baseline` 条件中，被试只允许使用 Aria（反映了现有的 AI 辅助歌曲创作实践），而在 `Assist` 条件中，被试可以同时使用 Amuse 和 Aria（在传统的 AI 辅助歌曲创作工作流之外，引入了多模态灵感支持）。我们选择不与不使用 Aria 的手工创作进行比较，因为我们的主要目标是评估 Amuse 在增强现有 AI 辅助工作流方面的附加价值，而不是评估 AI 与非 AI 方法的优劣。每场任务的内容是：根据两个歌曲创作提示之一，写一段 8 小节的副歌（和弦和旋律）：“写一段 8 小节副歌，讲述你生命中一段意想不到的友谊的开始”或“写一段 8 小节副歌，讲述你最喜欢的夏日假期回忆”。我们从 Songwriting 子论坛（Reddit, 2024）改编了这些提示。任务提示和系统条件在各场次之间随机分配，以尽量减少顺序偏差。
:::

:::bi

The overall study procedure is illustrated in Figure 6. We started with an introduction and tool tutorial session, where users were given 20 minutes to familiarize themselves with Amuse and Aria. For each songwriting session, participants were given the songwriting prompt and had 25 minutes to write an 8-bar chorus using the assigned tool(s) with their screen shared. We asked participants to think aloud to learn their decision-making processes and reactions when interacting with the tools. The whole session, including the shared screen, was video recorded. Since Amuse involves image inputs, we asked participants not to share any personal or sensitive pictures during the study. To ensure meaningful comparison between conditions, we required participants to use the assigned tool(s) at least once during the task; however, they had the flexibility to decide when and how to use the features, as well as how frequently to engage with them.

:::zh

整体研究流程见图 6。我们从介绍和工具教学环节开始，给用户 20 分钟时间来熟悉 Amuse 和 Aria。在每场歌曲创作环节中，被试拿到歌曲创作提示，并在共享屏幕的情况下用 25 分钟使用指定的工具写出 8 小节的副歌。我们要求被试出声思考，以了解他们在与工具互动时的决策过程和反应。整场环节，包括共享屏幕，都被录制为视频。由于 Amuse 涉及图像输入，我们要求被试在研究过程中不要分享任何个人或敏感图片。为了确保条件之间的比较有意义，我们要求被试在任务中至少使用一次指定的工具，不过他们可以灵活决定何时以及如何使用这些功能，也可以灵活决定使用这些功能的频率。
:::

### 测量指标（Measures）

#### 问卷（Questionnaires）

:::bi

We analyzed participants’ responses to the two post-task surveys. These surveys asked participants to rate, on a seven-point Likert scale, the usefulness of the given systems (`Baseline`: ‘Aria alone’; `Assist`: ‘both Amuse and Aria’) in helping transform their inspirations into music and writing songs aligned with the given song prompts. Additionally, participants were asked to assess their self-perceived experience with the system using questions adapted from related works (Wu et al., 2022; Louie et al., 2022). We also collected participants’ ratings on five aspects of the Creativity Support Index (CSI) (Cherry and Latulipe, 2014) questionnaire, excluding the “Collaboration” question, as it is irrelevant to human-AI collaborations. We analyzed these Likert scale ratings using the Wilcoxon signed-rank test, as a Shapiro-Wilk test indicated the data was non-parametric (Conover, 1999). We include the detailed survey questions in Appendix C.1.

:::zh

我们分析了两份任务后问卷中被试的回答。这些问卷要求被试在七点李克特量表上，对给定系统（`Baseline`：“只用 Aria”，`Assist`：“同时使用 Amuse 和 Aria”）在帮助他们把灵感转化为音乐并写出贴合歌曲提示的歌曲方面的有用性进行评分。此外，被试还被要求使用改编自相关研究的问题（Wu et al., 2022; Louie et al., 2022）评估他们与系统互动时的自我感知体验。我们还收集了被试在创造力支持指数（CSI）问卷（Cherry and Latulipe, 2014）五个方面上的评分，排除了“协作”这一题，因为它与人类与 AI 的协作无关。由于 Shapiro-Wilk 检验表明数据是非参数的，我们使用 Wilcoxon signed-rank 检验（Conover, 1999）分析了这些李克特量表评分。详细的问卷问题见附录 C.1。
:::

#### 访谈（Interviews）

:::bi

During the 25-minute semi-structured interviews, participants were asked about the difference between the two songwriting sessions and the perceived impact of the tools on their songwriting tasks. Detailed interview questions can be found in Appendix C.2.

:::zh

在 25 分钟的半结构化访谈中，被试被问及两场歌曲创作环节之间的差异，以及工具对其歌曲创作任务所产生的影响。详细的访谈问题见附录 C.2。
:::

:::bi

We transcribed the semi-structured interviews and analyzed them using the constant comparative method (Glaser and Strauss, 1999). Two authors independently open-coded two interview samples to identify key concepts and patterns. Axial coding was then performed to link these patterns (Corbin and Strauss, 2008), resulting in an initial codebook. The first author coded the remaining interview data while continuously refining the codebook. After the first coding round, another author coded two interview samples using the updated codebook for verification, and any issues were resolved through discussion. Throughout the process, the research team regularly discussed emerging themes while triangulating the interview data with quantitative analyses. We include the full codebook in Appendix C.3.

:::zh

我们对半结构化访谈进行了转录，并使用持续比较法（Glaser and Strauss, 1999）进行分析。两位作者独立地对两份访谈样本进行开放式编码，以识别关键概念和模式。随后进行主轴编码以连接这些模式（Corbin and Strauss, 2008），形成最初的编码本。第一作者对剩余访谈数据进行编码，同时不断细化编码本。第一轮编码结束后，另一位作者使用更新后的编码本对两份访谈样本进行编码以作验证，任何问题都通过讨论解决。在整个过程中，研究团队定期讨论浮现的主题，同时将访谈数据与定量分析进行三角互证。完整的编码本见附录 C.3。
:::

#### 交互日志（Interaction Logs）

:::bi

We collected the usage logs (i.e., participant actions with timestamps) to quantitatively analyze participant behaviors. We used this data to obtain statistics on tool usage, such as the time taken for each session, the number of keyword/chord generations in Amuse, and the number of chord/melody generations in Aria. For all these measures, we conducted a Shapiro-Wilk test to determine if the data was parametric and used a paired t-test for parametric data and a Wilcoxon signed-ranked test for nonparametric data. To qualitatively explain the user behaviors identified from the quantitative data, we analyzed screen recordings when necessary.

:::zh

我们收集了使用日志（即带时间戳的被试操作）来定量分析被试行为。我们用这些数据获取工具使用情况的统计信息，例如每场环节所用时间，Amuse 中关键词生成和和弦生成的次数，以及 Aria 中和弦生成和旋律生成的次数。对于所有这些指标，我们进行 Shapiro-Wilk 检验以确定数据是否为参数型，对参数型数据使用配对 t 检验，对非参数型数据使用 Wilcoxon signed-ranked 检验。为了从定性上解释定量数据中识别出的用户行为，我们在必要时分析了屏幕录像。
:::

## 发现（Findings）

:::bi

We present our findings on how participants transformed their multimodal inspirations into musical elements in §8.1 (RQ1), how Amuse influenced participants’ songwriting processes in §8.2 (RQ2), and how Amuse impacted the songwriting experience and perceived quality of outcomes in §8.3 (RQ3). We summarize our main findings below:

:::zh

我们在 §8.1（RQ1）中呈现关于被试如何把多模态灵感转化为音乐元素的发现，在 §8.2（RQ2）中呈现关于 Amuse 如何影响被试歌曲创作过程的发现，在 §8.3（RQ3）中呈现关于 Amuse 如何影响歌曲创作体验和成果被感知质量的发现。下面总结我们的主要发现：
:::

:::bi

- Amuse effectively supports the transformation of multimodal inspirations into concrete musical elements, with participants feeling more guided and aligned with their creative goals compared to using Aria alone.
- Participants demonstrated diverse usage patterns of Amuse in the songwriting process, integrating it in various stages of their songwriting process.
- With Amuse, participants experienced enhanced agency and creativity throughout the songwriting process and perceived it as more efficient and easier. However, they found the compositions in both the `Baseline` and `Assist` conditions to be equally satisfactory.

:::zh

- Amuse 有效支持了把多模态灵感转化为具体音乐元素的过程，与只用 Aria 相比，被试感到更有方向，也更贴合自己的创作目标。
- 被试在歌曲创作过程中展现了多样的 Amuse 使用模式，把 Amuse 融入歌曲创作过程的各个阶段。
- 使用 Amuse 时，被试在整个歌曲创作过程中体验到了更强的主动权和创造力，并觉得这一过程更高效，更轻松。不过，他们认为 `Baseline` 和 `Assist` 两种条件下的作品同样令人满意。
:::

### 支持多模态灵感（Supporting Multimodal Inspirations）

:::bi

We first examine whether Amuse successfully supports songwriters transforming multimodal inspirations into contextual musical elements (RQ1). Specifically, we present the effectiveness of Amuse in the inspiration transformation process (§8.1.1) and the perceived quality of suggestions (§8.1.2). We also report the participants’ preferences for the Chord Generator over Chord Transcriber within Amuse (§8.1.3) and the impact of music keywords in the system usage (§8.1.4). We describe relevant quantitative findings with qualitative insights.

:::zh

我们首先考察 Amuse 是否成功支持写歌人把多模态灵感转化为贴合情境的音乐元素（RQ1）。具体来说，我们呈现 Amuse 在灵感转化过程中的有效性（§8.1.1）以及建议被感知的质量（§8.1.2）。我们还报告被试对 Amuse 中 Chord Generator 相对于 Chord Transcriber 的偏好（§8.1.3），以及音乐关键词在系统使用中的影响（§8.1.4）。我们结合定性见解来描述相关的定量发现。
:::

#### 把多模态灵感有效转化为音乐元素（Effective transformation of multimodal inspirations into musical elements）

:::bi

Overall, participants in `Assist` condition felt they could more easily transform their initial inspirations into concrete musical elements than `Baseline` (Inspiration Support in Figure 7; `Assist`=6.20$\pm$0.75, `Baseline`=4.60$\pm$1.36, $z$=0.00, $p$<0.01). Additionally, participants reported feeling more guided toward the task goal in `Assist` (Task Alignment in Figure 7; `Assist`=6.10$\pm$0.70, `Baseline`=4.30$\pm$1.62, $z$=0.00, $p$=0.016). Six participants emphasized how **Amuse helped better achieve their creative goals**. Amuse’s suggestions “*fell in line with what I would have mentally constructed*” (P5), allowing them to “*focus more on the goal with a clear vision of how to write the rest of the song*” (P2). In contrast, in `Baseline` condition, five participants mentioned feeling unsupported in achieving the task, highlighting a lack of direction. P8 stated, “*Using Aria alone, I had a very vague vision and didn’t really know what I was going for.*” Similarly, P1 noted that without Amuse, “*the song ended up being the opposite of the style I originally intended to create with my lyrics*”.

:::zh

总体而言，`Assist` 条件下的被试觉得比 `Baseline` 条件更容易把最初的灵感转化为具体的音乐元素（图 7 中的 Inspiration Support，`Assist`=6.20$\pm$0.75，`Baseline`=4.60$\pm$1.36，$z$=0.00，$p$<0.01）。此外，被试报告在 `Assist` 条件下更感到被引导向任务目标（图 7 中的 Task Alignment，`Assist`=6.10$\pm$0.70，`Baseline`=4.30$\pm$1.62，$z$=0.00，$p$=0.016）。6 名被试强调 **Amuse 帮助他们更好地实现了创作目标**。Amuse 的建议“*和我心里会构建出来的东西很一致*”（P5），让他们能够“*带着对歌曲其余部分该如何写的清晰愿景，更专注于目标*”（P2）。相比之下，在 `Baseline` 条件下，5 名被试提到在完成任务时感到缺乏支持，强调缺乏方向。P8 说：“*只用 Aria 时，我的愿景非常模糊，并不真正知道自己想要什么。*”类似地，P1 指出，没有 Amuse 时，“*这首歌最终变成了和我原本想用歌词创作出的风格相反的东西*”。
:::

#### Assist 建议被感知到的质量更高（Higher perceived quality of suggestions from Assist）

:::bi

While participants expressed satisfaction with the diversity of suggestions in both conditions (Diversity in Figure 7; `Assist`=6.10$\pm$0.94, `Baseline`=5.50$\pm$1.50; $z$=12.00, $p$=0.389), participants **rated the quality of the outputs they received from Assist significantly higher** than those they got from `Baseline` (Output Quality in Figure 7; `Assist`=6.40$\pm$0.66, `Baseline`=5.30$\pm$1.00, $z$=4.00, $p$=0.023). Interestingly, there was no significant difference in the average number of Aria queries made between the conditions (`Baseline`=3.60$\pm$2.72, `Assist`=2.30$\pm$1.16; z=10.0, p=0.130) or in the acceptance rates of those queries (`Baseline`=0.71$\pm$0.25, `Assist`=0.87$\pm$0.22, z=7.0, p=0.12). This similarity suggests that the improved perceptions of output quality may be more related to Amuse’s ability to generate suggestions that align with user intentions, leading to increased general satisfaction with the suggestions received throughout the songwriting process.

:::zh

虽然被试对两种条件下建议的多样性都表示满意（图 7 中的 Diversity，`Assist`=6.10$\pm$0.94，`Baseline`=5.50$\pm$1.50，$z$=12.00，$p$=0.389），但被试对从 Assist 获得的输出的质量评分显著高于从 `Baseline` 获得的输出（图 7 中的 Output Quality，`Assist`=6.40$\pm$0.66，`Baseline`=5.30$\pm$1.00，$z$=4.00，$p$=0.023）。有趣的是，两种条件之间发出 Aria 查询的平均次数没有显著差异（`Baseline`=3.60$\pm$2.72，`Assist`=2.30$\pm$1.16，z=10.0，p=0.130），这些查询的接受率也没有显著差异（`Baseline`=0.71$\pm$0.25，`Assist`=0.87$\pm$0.22，z=7.0，p=0.12）。这种相似性表明，输出质量感知的改善可能更多地与 Amuse 生成贴合用户意图的建议的能力有关，从而在整个歌曲创作过程中提高对所收到建议的整体满意度。
:::

:::figure
![](./images/amuse/fig-07.png)

Figure 7: 

:::zh
图 7：看各组柱子的左低右高：装了 Amuse 之后，被试普遍觉得更容易把多模态灵感转成音乐元素、更被引导着走、产出也更贴近任务目标。这张图支撑的是“Amuse 确实在转化灵感上起作用”这条结论。
:::
:::

#### 偏好 Chord Generator 而非 Chord Transcriber（Preference for Chord Generator over Chord Transcriber）

:::bi

Participants demonstrated a clear preference for the Chord Generator over the Chord Transcriber within Amuse. All participants utilized the Chord Generator, whereas only three used the Chord Transcriber in `Assist` ($p$ < 0.001). Five participants praised the Chord Generator, **describing the chords created with multimodal inspirations as “special”** compared to those generated in `Baseline`. Three participants found the **Chord Transcriber less creative than Chord Generator**, with P5 noting, “*With Chord Transcriber, you are picking pieces someone else created—it is not mine and feels close-ended. There’s a risk of sounding like something that already exists. But the Chord Generator feels more open-ended and freeing.*” P6 suggested making Chord Transcriber’s output unique by integrating it with the Chord Generator: “*Transcribing the chords from the song I love would be good, but what I find challenging is changing these transcribed chords to make them your own. It would be cool if you could input the Chord Transcriber’s outputs into the Chord Generator to create new chords that match the vibe of the original song.*”

:::zh

被试明显更偏好 Amuse 中的 Chord Generator 而非 Chord Transcriber。所有被试都使用了 Chord Generator，而只有 3 人在 `Assist` 中使用了 Chord Transcriber（$p$ < 0.001）。5 名被试称赞 Chord Generator，**认为用多模态灵感创作出的和弦比 `Baseline` 中生成的和弦更“特别”**。3 名被试觉得 **Chord Transcriber 不如 Chord Generator 有创造力**，P5 指出：“*使用 Chord Transcriber 时，你是在挑选别人创作的东西，它不是我的，而且感觉是封闭的。存在听起来像已经存在的作品的风险。但 Chord Generator 感觉更开放，更自由。*”P6 建议通过把 Chord Transcriber 与 Chord Generator 整合，让 Chord Transcriber 的输出变得独特：“*转录我喜欢的歌曲里的和弦是好事，但我感到有挑战的地方在于，如何改变这些转录出来的和弦，让它们变成你自己的。如果你能把 Chord Transcriber 的输出输入 Chord Generator，生成符合原曲氛围的新和弦，那就太酷了。*”
:::

:::annotation
这里值得停下来想一下：Chord Generator 和 Chord Transcriber 都满足“多模态输入”这条设计目标，但用户一边倒地选 Generator。原因是 Generator 走的是“图/文字 → 关键词 → 和弦”，中间那层关键词让过程可解释、可控，而 Transcriber 只给一个没有解释的转录结果。可解释性赢了。
:::

:::bi

The low usage of Chord Transcriber might also be attributed to the task constraints, as two participants noted. P2 mentioned they could not think of a song to transcribe given the songwriting prompt: “*I didn’t use the transcribe feature which I think mainly because of the time constraint for me—I couldn’t come up with a song that kind of fit the task that I could borrow from off the top of my head.*” P10 did not use the Chord Transcriber due to the absence of their instrument, stating, “*I would have used it if I had my piano next to me. I would come up with whatever I felt and then upload the sound file to get the chords.*”

:::zh

Chord Transcriber 使用率低也可能归因于任务限制，正如两名被试所指出的。P2 提到，在拿到歌曲创作提示的情况下，他想不出要转录哪首歌：“*我没有用转录功能，我认为这主要是我时间受限，我一时想不出一首能借用的，与任务相符的歌。*”P10 因为身边没有乐器而没有使用 Chord Transcriber，他说：“*如果我的钢琴就在旁边，我会用它。我会先弹奏出我感受到的任意内容，然后上传声音文件来得到和弦。*”
:::

#### 通过音乐关键词增强透明度，主动权和可解释性（Enhanced transparency, agency, and explainability through music keywords）

:::bi

Five participants found the keywords helpful in the transformation process, particularly for the **transparency and agency the keywords offered**. Participants appreciated how the keyword control allowed them to see what the AI was interpreting from text or images, select keywords in consensus, and regenerate or edit them to better align with their creative goals. P5 noted, “*Taking an image or story and turning it directly into chord progressions is an abstract jump, but with the keywords, the process becomes intuitive and predictable.*” P2 added, “*Keywords put into words the idea that I was going for.*” **Keywords also provided explainability for chord outputs**. P6 explained, “*When the chord progressions were weird, I realized I was using the keyword ‘unexpected.’ When I removed it, the generated chords were great.*” These findings reconfirm that the keywords could be an effective communication medium for connecting abstract relationships between different modalities as suggested in prior work (Liu et al., 2022; Liu et al., 2023).

:::zh

5 名被试发现关键词在转化过程中很有帮助，尤其是关键词带来的**透明度和主动权**。被试很欣赏关键词控制让他们能够看到 AI 从文本或图像中解读出了什么，一致地选择关键词，并重新生成或编辑它们以更好地贴合创作目标。P5 指出：“*把一张图片或一段故事直接变成和弦进行是一个抽象的跳跃，但有了关键词，这个过程就变得直观且可预测。*”P2 补充说：“*关键词把我想要表达的想法说了出来。*”**关键词还为和弦输出提供了可解释性**。P6 解释说：“*当和弦进行很怪异时，我意识到我用到了“unexpected”这个关键词。当我把它去掉后，生成的和弦就很棒了。*”这些发现再次确认，正如先前研究所指出的那样（Liu et al., 2022; Liu et al., 2023），关键词可以成为连接不同模态之间抽象关系的有效沟通媒介。
:::

:::annotation
关键词是本文最重要的交互洞见：它既不是纯自然语言的“黑箱翻译”，也不是直接丢出一串和弦，而是让用户能看见、勾选、修改的中间层。五位被试明确说这层东西帮他们“和图片建立了联系”，这正是论文副标题里“多模态灵感”落到实处的样子。
:::

:::figure
![](./images/amuse/fig-08.png)

Figure 8: 

:::zh
图 8：每条横线是一个人，不同颜色是不同的操作。重点看操作在时间轴上的分布：有人开局就用，有人写到一半才用，有人全程围着歌词转，这正好对应正文归纳的三种用法。
:::
:::

#### 发现小结（Summary of findings）

:::bi

The findings demonstrate that Amuse effectively bridges the gap between multimodal inspirations and musical elements. Compared with using Aria alone, participants felt more guided and found it easier to achieve their creative goals with Amuse. The Chord Generator emerged as a preferred tool, offering unique chord progressions that participants found more inspiring than those from the Chord Transcriber. Positive user comments indicate that the music keyword pipeline further enhanced the experience by providing transparency, explainability, and control over the AI’s output. Collectively, these findings confirm that Amuse effectively supports songwriters in transforming their multimodal inspirations into contextual musical elements.

:::zh

这些发现表明，Amuse 有效地弥合了多模态灵感与音乐元素之间的鸿沟。与只用 Aria 相比，被试感到更有方向，也觉得用 Amuse 更容易实现自己的创作目标。Chord Generator 成为更受偏好的工具，它提供了独特的和弦进行，被试认为这些进行比 Chord Transcriber 产生的进行更鼓舞人心。正面的用户评价表明，音乐关键词流水线通过提供对 AI 输出的透明度，可解释性和控制，进一步提升了体验。总的来说，这些发现证实，Amuse 有效地支持写歌人把多模态灵感转化为贴合情境的音乐元素。
:::

### 对用户歌曲创作过程的影响（Impact on User’s Songwriting Process）

:::bi

We describe how participants incorporated Amuse into their songwriting process (RQ2). We first describe three Amuse usage patterns observed in `Assist` condition (§8.2.1), and explain how participants completed the task without Amuse in `Baseline` condition, using only Aria (§8.2.2). We report qualitative findings from analyzing screen recordings, think-aloud statements, and interviews.

:::zh

我们描述被试如何把 Amuse 融入他们的歌曲创作过程（RQ2）。我们首先描述在 `Assist` 条件中观察到的三种 Amuse 使用模式（§8.2.1），然后解释被试在 `Baseline` 条件中只用 Aria，不用 Amuse 时如何完成任务（§8.2.2）。我们报告来自屏幕录像，出声思考陈述和访谈分析的定性发现。
:::

#### 歌曲创作过程中 Amuse 的多样使用模式（Diverse usage patterns of Amuse in the songwriting process）

:::bi

In the `Assist` condition, we identified three categories of approaches that participants used to find and integrate inspiration into their songwriting process: (i) kickstart with multimodal inspiration (N=6; P2-3, P5, P7-8, P10), (ii) ad hoc inspiration flow (N=3; P4, P6, P9), and (iii) lyrics-centered brainstorming (N=1; P1). Participants engaged with Amuse at diverse stages of their workflow, with its use generally concentrated in the early stages. In addition, when using Amuse, participants reported a shift in their approach to Aria, using it more for melody creation rather than for both chords and melody. The timeline of all participants’ songwriting patterns is shown in Figure 8.

:::zh

在 `Assist` 条件中，我们识别出被试用来寻找灵感并把灵感融入歌曲创作过程的三类方法：（i）用多模态灵感开局启动（N=6，P2-3，P5，P7-8，P10），（ii）即兴灵感流（N=3，P4，P6，P9），以及（iii）围绕歌词进行头脑风暴（N=1，P1）。被试在工作流的各个阶段使用 Amuse，其使用通常集中在早期阶段。此外，在使用 Amuse 时，被试报告了他们使用 Aria 的方式发生了变化，更多地用它来创作旋律，而不是同时用于和弦和旋律。所有被试歌曲创作模式的时间线见图 8。
:::

##### 用多模态灵感开局启动（Kickstart with Multimodal Inspiration）

:::bi

Given the songwriting prompt, six participants (P2-3, P5, P7-8, P10) **quickly drew on personal inspirations and used Amuse** to generate chord progressions that matched their ideas. After the initial generation with Amuse, they did not return to Amuse; instead, they developed the rest of the song by expanding or editing the chord progressions created with Amuse and composing melodies, either manually or using Aria. For example, P2 was inspired by a recent ‘friendship at work created through a trauma bonding experience’ and aimed to write a melancholy, storytelling song (see Figure 9(a) for the illustration). P2 accepted the four 4-bar chord progressions generated by Amuse and combined them to create the entire chord progression of the song. They then developed the rest of the song by generating melodies with Aria and editing those.

:::zh

拿到歌曲创作提示后，6 名被试（P2-3，P5，P7-8，P10）**迅速汲取个人灵感并使用 Amuse** 来生成与他们的想法相匹配的和弦进行。在用 Amuse 完成最初的生成后，他们没有再回到 Amuse，而是通过扩展或编辑 Amuse 生成的和弦进行并创作旋律来发展歌曲的其余部分，旋律可以手工创作，也可以用 Aria 生成。例如，P2 受到最近一次“在工作中通过创伤性联结经历建立起的友谊”的启发，想写一首忧郁的，讲述故事的歌（见插图图 9(a)）。P2 接受了 Amuse 生成的四个 4 小节和弦进行，并把它们组合成整首歌的和弦进行。然后他们用 Aria 生成旋律并编辑这些旋律，发展出歌曲的其余部分。
:::

:::figure
![](./images/amuse/fig-09.png)

Figure 9: 

:::zh
图 9：三个子图对应用法的差异：(a) 开局用 Amuse 定基调，(b) 写到哪想到哪随时调，(c) 先有歌词再让和弦贴着歌词走。对比着看能发现，同样是“用 Amuse”，不同的创作习惯会把它放到完全不同的位置。
:::
:::

##### 即兴灵感流（Ad hoc Inspiration Flow）

:::bi

In contrast to users who used Amuse only at the first stage to kickstart their songwriting process, three participants (P4, P6, P9) constantly used Amuse in their workflow. P4 and P6 mentioned that **transforming their initial inspiration into chords with Amuse sparked further ideas.** For instance, P4 described starting with inspiration from George Orwell’s *1984* and then transitioning into Billie Eilish’s *Birds of a Feather* (see Figure 9(b) for the illustration): “*1984 is a book about conformity and structure, and I hoped to capture its serenity and finer ambiance. I thought keywords like ‘dream pop’ could aesthetically intertwine with my inspiration. As I listened to the chords, I wanted the next four bars to progress into a darker, non-stereotypical mood. Billie Eilish’s Birds of a Feather came to mind because of its down-tempo, dreamy ambient soundscape, which would create a good resolution in bars five through eight.*”

:::zh

与只在第一阶段用 Amuse 来开局启动歌曲创作过程的用户不同，3 名被试（P4，P6，P9）在工作流中持续使用 Amuse。P4 和 P6 提到，**用 Amuse 把最初的灵感转化为和弦激发了进一步的想法。**例如，P4 描述道，他先从 George Orwell 的《1984》获得灵感，随后转向 Billie Eilish 的《Birds of a Feather》（见插图图 9(b)）：“*《1984》是一本关于从众与结构的书，我希望捕捉它的宁静和更细腻的氛围。我觉得像“dream pop”这样的关键词能在美学上与我的灵感交织在一起。当我听着这些和弦时，我希望接下来的四个小节推进到一种更黑暗的，不落俗套的氛围。我想到了 Billie Eilish 的《Birds of a Feather》，因为它那种慢速，梦幻的氛围音景，能在第五到第八小节形成很好的解决。*”
:::

:::figure
![](./images/amuse/fig-10.png)

Figure 10: 

:::zh
图 10：对比图 8 看：没有 Amuse 时只剩两种模式，要么手动试到卡壳，要么反复点 Aria 生成直到撞出灵感。图里“生成”这个动作更密集也更散，能直观看出 Aria 的随机性带来的试错感。
:::
:::

:::bi

P9, on the other hand, took a different approach and was not fully satisfied by Amuse’s generations. Rather than starting with Amuse, P9 manually composed the chord progression for bars 1-4 and completed the melody with Aria. The inspiration to reflect the mood of ‘enjoying a 4th of July fireworks’ came **midway through the songwriting process**, leading P9 to use Amuse’s Chord Generator for the last four bars. Later, P9 drew inspiration from Childish Gambino’s song *Saturday* to infill the chord at bar 5, where he realized the chords for bars 1-4 and 5-8 did not fit well together. This led P9 to manually rewrite the progression for bars 5-8. Reflecting on the experience, P9 said, “*I could easily come up with the chord progression for the first few bars. I wanted to tell a story about the 4th of July fireworks using Amuse and expected it to build on the chords I had already laid down, but I didn’t like the result.*” Unlike Aria, Amuse does not have access to the full context of the user’s composition, and we speculate that providing context would be necessary to better support users in the ad hoc inspiration flow.

:::zh

另一方面，P9 采用了不同的方法，并且并不完全满意 Amuse 的生成结果。P9 不是从 Amuse 开始，而是手工创作了第 1 到 4 小节的和弦进行，并用 Aria 完成了旋律。想要反映“享受 7 月 4 日烟花”这一情绪的灵感是在**歌曲创作过程中途**出现的，这让 P9 在最后四个小节使用了 Amuse 的 Chord Generator。后来，P9 从 Childish Gambino 的歌曲《Saturday》中获得灵感，来填补第 5 小节的和弦，这时他意识到第 1 到 4 小节与第 5 到 8 小节的和弦不太搭。这让 P9 手工重写了第 5 到 8 小节的和弦进行。回顾这段经历时，P9 说：“*前几个小节的和弦进行我很容易就能想出来。我想用 Amuse 讲一个关于 7 月 4 日烟花的故事，并期待它在我已经铺好的和弦基础上继续发展，但我不喜欢这个结果。*”与 Aria 不同，Amuse 无法获取用户作品的完整上下文，我们推测，提供上下文对于更好地支持处于即兴灵感流中的用户是必要的。
:::

##### 围绕歌词的头脑风暴（Lyrics-Centered Brainstorming）

:::bi

One participant, P1, divided the song into three sections, **assigning lyrical ideas to each part and using Amuse to generate chords** that aligned with those ideas (see Figure 9(c) for the illustration). P1 began by outlining the lyrical ideas, noting: ‘Warm breeze salt in the air, cool water pouring over your hair, these are the worst lyrics one could think of for summer.’ They then structured the song by planning bars 1-2 around a ‘gentle summer beach,’ bars 3-4 for ‘cool water pouring over your hair,’ and bars 4-8 to sing about the ‘worst lyrics’ theme. For the first two sections, P1 searched for relevant images online and used the Chord Generator to get chords matching the lyrical concepts. For the last four bars, he entered the lyric to the Chord Generator and selected two four-bar chord progressions that are singable. Aria was used later in the process to assist with melody creation as P1 worked to bring the composition together. While most users relied on visual inputs to Amuse, the instincts of this particular user centered strongly around lyrics, providing further evidence that systems should accommodate diverse multimodal inputs (DG1) to support a variety of users.

:::zh

一名被试 P1 把歌曲分成三个部分，**为每个部分分配歌词想法，并用 Amuse 生成与这些想法相符的和弦**（见插图图 9(c)）。P1 首先概述歌词想法，写道：“温暖的微风，空气中的咸味，清凉的水浇在头发上，这些是你能为夏天想到的最糟糕的歌词。”然后他通过把第 1 到 2 小节规划在“温柔的夏日海滩”上，把第 3 到 4 小节规划在“清凉的水浇在头发上”，把第 4 到 8 小节用来歌唱“最糟糕的歌词”这一主题，来组织歌曲。对于前两个部分，P1 在网上搜索相关图片，并用 Chord Generator 得到与歌词概念匹配的和弦。对于最后四个小节，他把歌词输入 Chord Generator，并选出两个可唱的四小节和弦进行。后来在过程中用 Aria 辅助旋律创作，P1 努力把作品整合起来。虽然大多数用户依赖 Amuse 的视觉输入，但这名特定用户的本能强烈地围绕歌词，这进一步证明系统应容纳多样的多模态输入（DG1），以支持各种类型的用户。
:::

#### 没有 Amuse 时的歌曲创作方式（Songwriting approaches without Amuse）

:::bi

In `Baseline` condition, where the participants wrote a song without Amuse, participants either (i) manually experimented with chords and melodies until encountering writer’s block (N=6; P1-3, P5-7), or (ii) relied on Aria from scratch to find generations that align with inspiration (N=4; P4, P8, P9, P10). The timeline of all participants’ songwriting process is shown in Figure 10.

:::zh

在 `Baseline` 条件中，被试在没有 Amuse 的情况下写歌，他们要么（i）手工尝试各种和弦和旋律，直到遇到创作瓶颈（N=6，P1-3，P5-7），要么（ii）从头依赖 Aria 来寻找与灵感相符的生成结果（N=4，P4，P8，P9，P10）。所有被试歌曲创作过程的时间线见图 10。
:::

##### 手工尝试直到遇到创作瓶颈（Manual Experimentation Until Writer’s Block）

:::bi

Six participants (P1, P2, P3, P5, P6, P7) began by creating chords or melodies manually. This process involved **experimenting with different combinations of musical elements** to meet their creative goals. Once they had set up the desired mood, they turned to Aria for additional suggestions when they felt stuck. For example, P3 manually set up the full chord progressions and composed the melodies for the first five bars. Hoping “Aria*will finalize the song,*” P3 used it to generate the melodies for the last three bars. Different from the others (P1-3, P5-6) who started writing manually from the beginning, P7 first tried using Aria for chords but found “*the chords do not sound summery.*” Frustrated, P7 canceled generation and set up the full chord progressions manually and used Aria later for melody generation.

:::zh

6 名被试（P1，P2，P3，P5，P6，P7）首先手工创作和弦或旋律。这个过程涉及**尝试不同的音乐元素组合**以满足他们的创作目标。一旦他们设定好想要的氛围，当他们感到卡住时，就会求助于 Aria 获取额外的建议。例如，P3 手工设定完整的和弦进行，并为前五个小节创作了旋律。P3 希望“Aria 会把这首歌完成”，于是用它生成最后三个小节的旋律。与从一开始就手工写作的其他人（P1-3，P5-6）不同，P7 首先尝试用 Aria 生成和弦，但发现“这些和弦听起来没有夏天的感觉”。受挫之下，P7 取消了生成，手工设定完整的和弦进行，之后再用 Aria 生成旋律。
:::

##### 不断生成直到获得灵感火花（Generating Until Getting Sparks）

:::bi

Four participants (P4, P8, P9, P10) relied on Aria to spark their initial inspiration before writing any music manually, hoping to get a suggestion that aligned with their initial inspirations. However, this process often **resulted in suboptimal outputs that did not align with their intentions**. For example, P10 planned to write about ‘the beginning of an unexpected friendship with my dog’ but found that Aria’s chord suggestions were “*cool but bizarre for my dog.*” After more attempts, P10 settled on a chord progression that “*didn’t sound like a chorus, but was okay-ish,*” and then manually adjusted it to better fit their goal.

:::zh

4 名被试（P4，P8，P9，P10）在手工写任何音乐之前，依赖 Aria 来激发他们最初的灵感，希望得到与最初灵感相符的建议。然而，这个过程往往**产生了与他们的意图不符的次优输出**。例如，P10 打算写“我和我的狗之间一段意想不到的友谊的开始”，但发现 Aria 的和弦建议“很酷，但对我的狗来说很怪异”。经过更多尝试后，P10 选定了一个“听起来不像副歌，但还算凑合”的和弦进行，然后手工调整它，以更好地贴合自己的目标。
:::

#### 发现小结（Summary of findings）

:::bi

Based on the formative study findings, Amuse was designed to support the early stages of songwriting by helping users brainstorm and transform initial ideas into musical elements. Interestingly, participants exhibited diverse usage patterns, leveraging Amuse flexibly across different stages of their songwriting process rather than exclusively at the beginning—such as during ad hoc inspiration flows or after brainstorming lyrics—with Aria often used to generate melodies on chords created with Amuse. In contrast, without Amuse, users relied solely on Aria to generate both melodies and chords to ease cognitive inertia in the process, often receiving suggestions that did not align with their creative intentions. These findings demonstrate how multimodal control prompts users to integrate inspirations dynamically, and thus, the importance of supporting multimodalities *throughout* the process to meet a wide range of creative workflows.

:::zh

基于形成性研究的发现，Amuse 被设计用于支持歌曲创作的早期阶段，帮助用户进行头脑风暴，并把最初的想法转化为音乐元素。有趣的是，被试展现了多样的使用模式，在歌曲创作过程的不同阶段灵活地使用 Amuse，而不是只在开头使用，例如在即兴灵感流期间或在头脑风暴歌词之后，Aria 常常被用来在 Amuse 创作的和弦上生成旋律。相比之下，没有 Amuse 时，用户完全依赖 Aria 来生成旋律和和弦，以缓解过程中的认知惯性，却常常得到与创作意图不符的建议。这些发现表明，多模态控制如何促使用户动态地整合灵感，也因此表明，在*整个*过程中支持多模态对于满足各种创作工作流的重要性。
:::

### 用户对歌曲创作过程和成果的感知（User Perception on Songwriting Process and Outcomes）

:::bi

We investigate Amuse’s impact on the songwriting experience and perceived quality of the compositions (RQ3). Concretely, we discuss Amuse’s impact on participants’ sense of agency (§8.3.1), creativity (§8.3.2), and efficiency (§8.3.3) in the songwriting process. Lastly, we compare the overall satisfaction with final compositions across both conditions (§8.3.4). We describe relevant quantitative findings with qualitative insights.

:::zh

我们研究 Amuse 对歌曲创作体验和作品被感知质量的影响（RQ3）。具体来说，我们讨论 Amuse 对被试在歌曲创作过程中的主动权感（§8.3.1），创造力（§8.3.2）和效率感（§8.3.3）的影响。最后，我们比较两种条件下对最终作品的整体满意度（§8.3.4）。我们结合定性见解来描述相关的定量发现。
:::

#### 歌曲创作过程中主动权的增强（Enhanced agency over the songwriting process）

:::bi

Overall, participants felt more in control over the process in `Assist` compared to the `Baseline` (Controllable in Figure 11; `Assist`=5.80$\pm$0.98, `Baseline`=4.40$\pm$1.62, $z$=5.00, $p$=0.036). They also felt the process as more collaborative (Collaborative in Figure 11; `Assist`=5.80$\pm$0.98, `Baseline`=3.90$\pm$1.45, $z$=2.00, $p$=0.014), indicating that the tools in the `Assist` condition fostered a stronger sense of partnership during the songwriting process compared to the `Baseline` condition. Five participants mentioned that they could **communicate their creative intentions** and have **more agency over the workflow** when equipped with Amuse. For instance, P1 said, “*I can be part of the creative process with Amuse. You can influence what it generates because you get to tell it what you want it to consider.*” In contrast, two mentioned in `Baseline` they were simply “*following what Aria wants to do*” (P2, P10). P10 explained, “*With just Aria, I wasn’t able as much to create a mood or feel for my song. I didn’t feel like I had much input—Aria just sort of made up its own mind, and I had to just go along with it. It’s like having a bad co-writer.*”

:::zh

总体而言，与 `Baseline` 相比，被试在 `Assist` 中感到对过程更有掌控感（图 11 中的 Controllable，`Assist`=5.80$\pm$0.98，`Baseline`=4.40$\pm$1.62，$z$=5.00，$p$=0.036）。他们还觉得过程更具协作性（图 11 中的 Collaborative，`Assist`=5.80$\pm$0.98，`Baseline`=3.90$\pm$1.45，$z$=2.00，$p$=0.014），这表明与 `Baseline` 条件相比，`Assist` 条件中的工具在歌曲创作过程中培养了更强的伙伴感。5 名被试提到，配备 Amuse 后，他们能够**传达自己的创作意图**，并对工作流拥有**更多主动权**。例如，P1 说：“*我可以成为 Amuse 创作过程的一部分。你可以影响它生成什么，因为你可以告诉它你希望它考虑什么。*”相比之下，2 名被试提到，在 `Baseline` 中他们只是在“跟着 Aria 想做的走”（P2，P10）。P10 解释说：“*只用 Aria 时，我不太能为我的歌创造出一种情绪或感觉。我觉得自己没有太多投入，Aria 只是有点自己拿主意，我不得不顺着它来。这就像一个糟糕的合写者。*”
:::

:::annotation
“主动权增强”的证据不只在问卷分数，更在访谈里那句“Amuse 给了我说出想要什么的通道，而让 AI 替我写整首歌没有这种控制感”。它说明可编辑的模块化输出，而不是成品，才是用户感到自己在创作的原因。
:::

:::bi

An interesting finding from the interviews, mentioned by three participants, was that **having greater control during the early stages of songwriting with Amuse led to a sense of disconnection later in the process**. Participants expressed that **they set higher expectations for Aria,** particularly regarding the relevance of its suggestions to their sources of inspiration after receiving suggestions from Amuse. P3 mentioned, “*Now that the chords are about a boy playing in the garden, I wished Aria to generate something playful-maybe a melody with shorter notes and a quicker rhythm that would capture the image of a boy jumping. That was what I anticipated, but it didn’t quite work.*” Similarly, P4 noted that **using Amuse and Aria together felt less intuitive**: “*I felt like the chords were in place all the way through using Amuse. But the only disconnection I felt was in how Aria doesn’t necessarily integrate with Amuse in the same way that Amuse integrates with Aria. So it was almost like doing a 180-degree rotation when switching from Amuse to Aria because Aria doesn’t achieve quite the same results, given that it doesn’t consider your inputs. […] So I would say when Amuse was there, I felt more enriched and musical, but using Aria alone was more intuitive because I knew what to expect from it.*” These findings suggest that both systems—Amuse and Aria—would benefit from incorporating each other’s control inputs, i.e., contextual and multimodal inputs, respectively.

:::zh

访谈中一个有趣的发现是，3 名被试提到，**在歌曲创作早期阶段用 Amuse 获得更强的控制感，会在过程后期带来一种脱节感**。被试表示，**他们对 Aria 设定了更高的期望**，尤其是在收到 Amuse 的建议之后，期望 Aria 的建议与他们的灵感来源更相关。P3 提到：“*既然现在的和弦是关于一个在花园里玩耍的男孩，我希望 Aria 生成一些俏皮的东西，也许是一段用更短的音符和更快的节奏写成的旋律，能捕捉到男孩跳跃的画面。那是我所期待的，但效果不太好。*”类似地，P4 指出，**同时使用 Amuse 和 Aria 感觉不那么直观**：“*使用 Amuse 的整个过程中，我觉得和弦都很到位。但我唯一感到脱节的地方在于，Aria 未必会像 Amuse 与 Aria 整合那样与 Amuse 整合。所以从 Amuse 切换到 Aria 几乎像是转了个 180 度，因为 Aria 不会考虑你的输入，所以达不到同样的结果。[…] 所以我会说，当有 Amuse 时，我觉得自己更充实，也更有音乐感，但只用 Aria 更直观，因为我知道会从它那里得到什么。*”这些发现表明，两个系统，即 Amuse 和 Aria，都能从吸收彼此的控件输入中获益，也就是 Amuse 吸收情境化输入，Aria 吸收多模态输入。
:::

:::figure
![](./images/amuse/fig-11.png)

Figure 11: 

:::zh
图 11：左半是 AI 相关和作品产出的自评，右半是创造力支持指数（CSI）的六个维度。重点看“主动权（agency）”和“创造力（creativity）”两列：Amuse 条件明显更高，但最终的满意度两组基本持平，这是全文最有意思的一组对比。
:::
:::

#### 多模态灵感带来的创造力增强（Enhanced creativity with multimodal inspirations）

:::bi

When using both Amuse and Aria in the `Assist` condition, participants reported a greater sense of idea exploration (Exploration in Figure 11; `Assist`=6.10$\pm$0.83, `Baseline`=4.40$\pm$1.50, $z$=3.00, $p$=0.019) as well as expressiveness and creativity (Expressiveness in Figure 11; `Assist`=6.00$\pm$0.63, `Baseline`=4.20$\pm$1.66, $z$=4.00, $p$=0.028) compared to the `Baseline`. These results indicate that Amuse enhanced participants’ capacity to **explore new musical ideas** and **freely express their creative intentions**. This finding echoed in the interviews, where seven participants praised Amuse for fostering creativity and offering greater freedom in musical expression. P4 and P7 described Amuse as “*liberating*” their creative process; P4 said, “*I feel like I’m actually guiding the tool toward what I want to create in a transformative, imaginative, and visually compelling world, almost as if I’m creating music as I type.*” In addition, P2 appreciated the integration of visuals in the songwriting process, saying, “*I especially liked the picture input feature because, as the saying goes, a picture is worth a thousand words. Sometimes, it’s easier to convey what you’re aiming for with an image than with words.*”

:::zh

在 `Assist` 条件中同时使用 Amuse 和 Aria 时，与 `Baseline` 相比，被试报告了更强的想法探索感（图 11 中的 Exploration，`Assist`=6.10$\pm$0.83，`Baseline`=4.40$\pm$1.50，$z$=3.00，$p$=0.019），以及更强的表现力和创造力（图 11 中的 Expressiveness，`Assist`=6.00$\pm$0.63，`Baseline`=4.20$\pm$1.66，$z$=4.00，$p$=0.028）。这些结果表明，Amuse 增强了被试**探索新音乐想法**和**自由表达创作意图**的能力。这一发现在访谈中得到呼应，7 名被试称赞 Amuse 培养了创造力，并在音乐表达上提供了更大的自由。P4 和 P7 把 Amuse 描述为“解放”了他们的创作过程，P4 说：“*我觉得自己其实是在引导这个工具，朝着我想在一个具有变革性，富有想象力，视觉上引人入胜的世界里创作的东西前进，几乎就像我在打字的同时创作音乐一样。*”此外，P2 很欣赏歌曲创作过程中视觉元素的融入，他说：“*我特别喜欢图片输入功能，因为俗话说，一图胜千言。有时候，用一张图片比用文字更容易传达你追求的东西。*”
:::

:::annotation
创造力提升的机制值得细看：Amuse 的随机性带来“我没想过的半音进行”这类惊喜，但它把随机圈在关键词约束之内，所以惊喜不会跑偏。这和基线里 Aria 那种完全不受控的随机形成对比，也预告了第九章对“随机性的角色”的讨论。
:::

#### 歌曲创作过程中被感知的效率（Perceived efficiency in the songwriting process）

:::bi

Participants reported that the songwriting process felt more efficient in `Assist` during the interviews, despite no significant difference in actual completion times between conditions. Seven participants noted that the process **felt more efficient and easier** in the `Assist` condition. They described how Amuse helped to “*streamline the process*” (P8, P9), contrasting it with their usual experience where “*it takes a while before getting a chord progression that I love*” (P6). P2 complimented, “*Honestly, I would use Amuse almost every time. I really liked how it jump-started the process. I usually spend a lot of time and effort getting the right chords, which is tedious—being able to convey an idea quickly was really nice.*” However, the perceived efficiency **did not mean using Amuse really sped up the process**-there was no statistical difference in the task completion time between `Assist` and `Baseline` (`Assist`=17.39$\pm$5.45 min, `Baseline`= 17.61$\pm$5.27 min, $z$=26.00, $p$=0.922). This suggests that while Amuse may enhance the perceived ease of the songwriting process, particularly by alleviating specific pain points like finding the right chords, it does not necessarily make the overall task faster.

:::zh

被试在访谈中报告说，尽管两种条件之间实际完成时间没有显著差异，但 `Assist` 中的歌曲创作过程感觉更高效。7 名被试指出，在 `Assist` 条件中，这一过程**感觉更高效，更轻松**。他们描述 Amuse 如何帮助“简化流程”（P8，P9），并把它与自己平常的经历相对照，平常“要花上一阵子才能得到一个我喜欢的和弦进行”（P6）。P2 称赞道：“*说实话，我几乎每次都会用 Amuse。我真的很喜欢它能让这个过程快速启动。我通常要花很多时间和精力才能找到合适的和弦，这很枯燥，能很快传达一个想法真的很棒。*”然而，被感知的效率**并不意味着使用 Amuse 真的加快了这个过程**，`Assist` 和 `Baseline` 之间的任务完成时间没有统计学差异（`Assist`=17.39$\pm$5.45 min，`Baseline`= 17.61$\pm$5.27 min，$z$=26.00，$p$=0.922）。这表明，虽然 Amuse 可能增强对歌曲创作过程轻松感的感知，特别是通过缓解找到合适和弦这类具体痛点，但它未必能让整个任务更快。
:::

#### 两种条件下同样令人满意的结果（Similarly satisfactory results in both conditions）

:::bi

Despite the reported differences in agency and creativity in the songwriting process, participants in both conditions often arrived at satisfying results. The post-survey results revealed that participants rated the quality of their compositions similarly in both conditions: they felt that the results were worth the effort (Results Worth Effort in Figure 11; `Assist`=6.20$\pm$0.98, `Baseline`=5.90$\pm$1.37, $z$=9.00, $p$=0.750), musically coherent (Musical Coherence in Figure 11; `Assist`=6.00$\pm$1.18, `Baseline`=6.00$\pm$0.89, $z$=10.50, $p$=1.00), and could be expanded to full songs (Potential for Development in Figure 11; `Assist`=6.30$\pm$0.90, `Baseline`=5.70$\pm$1.35, $z$=12.50, $p$=0.429). Moreover, participants found both conditions enjoyable (Enjoyment in Figure 11; `Assist`=6.70$\pm$0.46, `Baseline`=6.00$\pm$1.10, $z$=3.00, $p$=0.096).

:::zh

尽管在歌曲创作过程中报告了主动权和创造力方面的差异，但两种条件下的被试往往都得到了令人满意的结果。任务后问卷的结果显示，被试对两种条件下作品质量的评分相似：他们觉得结果值得付出的努力（图 11 中的 Results Worth Effort，`Assist`=6.20$\pm$0.98，`Baseline`=5.90$\pm$1.37，$z$=9.00，$p$=0.750），音乐上连贯（图 11 中的 Musical Coherence，`Assist`=6.00$\pm$1.18，`Baseline`=6.00$\pm$0.89，$z$=10.50，$p$=1.00），并且能够扩展成完整的歌曲（图 11 中的 Potential for Development，`Assist`=6.30$\pm$0.90，`Baseline`=5.70$\pm$1.35，$z$=12.50，$p$=0.429）。此外，被试觉得两种条件都令人愉快（图 11 中的 Enjoyment，`Assist`=6.70$\pm$0.46，`Baseline`=6.00$\pm$1.10，$z$=3.00，$p$=0.096）。
:::

:::annotation
这是全文最反直觉的一组数据：过程指标（主动权、创造力、效率）全面占优，最终满意度和“只用 Aria”却基本持平。作者的解释是，Amuse 的价值更多体现在“怎么写的过程”上，而不是“写出什么”的最终结果上。读完整篇可以回头再品这句话。
:::

:::bi

One explanation for these similar levels of satisfaction, despite the differences in creative control, maybe the unexpected (and irrelevant) yet joyful, creative discoveries participants encountered in `Baseline` condition. We observed from the think-aloud data that, while transforming inspirations into musical elements with Aria often led to off-topic suggestions, participants still **encountered moments of serendipity**. Aria’s generations were sometimes “*eye-opening*” (P1), even if they did not fit the original plan. In these cases, participants **deviated from their initial inspiration and still arrived at satisfying results**. For instance, P8 initially set out to express ‘nostalgia for a childhood camp where my friends and I played card games,’ but the final result was an epic heavy metal song. P8 reflected, “*It didn’t feel like myself—I kind of followed the genre Aria gave me and adjusted my goal to suit it. I didn’t feel like I had a clear idea going in. But, I’m still happy—the card games got dragons and crazy monsters in them, and these feel very important and epic from a kid’s point of view.*” This observation suggests that participants were able to derive satisfaction from both adhering to and deviating from their original creative vision, indicating that serendipitous moments of discovery can be a key factor in creative satisfaction.

:::zh

对于这些相似的满意度水平，尽管创作控制上存在差异，一种解释可能是被试在 `Baseline` 条件中遇到的出乎意料（且不相关）却令人愉悦的创造性发现。我们从出声思考数据中观察到，虽然用 Aria 把灵感转化为音乐元素常常会得到偏离主题的建议，但被试仍然**遇到了机缘巧合的时刻**。Aria 的生成结果有时是“开阔眼界的”（P1），即使它们不符合最初的计划。在这些情况下，被试**偏离了最初的灵感，却仍然得到了令人满意的结果**。例如，P8 最初想表达“对一个童年营地的怀念，我和朋友们在那里玩纸牌游戏”，但最终的结果是一首史诗般的重金属歌曲。P8 回忆道：“*这不像是我自己，我有点跟着 Aria 给我的风格走，并调整我的目标去适应它。我觉得自己开始时并没有一个清晰的想法。但是，我仍然很高兴，纸牌游戏里出现了龙和疯狂的怪物，从一个孩子的角度看，这些非常重要，也非常史诗。*”这一观察表明，被试既能从坚持也能从偏离最初的创作愿景中获得满足，这说明机缘巧合的发现时刻可以成为创作满足感的一个关键因素。
:::

#### 发现小结（Summary of findings）

:::bi

Our study reveals that Amuse positively impacts the songwriting experience by enhancing participants’ agency, creativity, and perceived efficiency than using Aria alone. However, some participants experienced a sense of disconnection when switching between the tools, which could be improved by incorporating each other’s control inputs. Interestingly, despite the enhanced agency and creativity, the perceived quality of final compositions and enjoyment of the process were similar across both conditions. This similarity suggests that creative satisfaction may stem not only from control and alignment but also from unexpected discoveries throughout the process.

:::zh

我们的研究表明，与只用 Aria 相比，Amuse 通过增强被试的主动权，创造力和被感知的效率，对歌曲创作体验产生了积极影响。然而，一些被试在切换工具时体验到一种脱节感，这可以通过吸收彼此的控件输入来改善。有趣的是，尽管主动权和创造力有所增强，但两种条件下对最终作品质量的感知和过程的愉悦感是相似的。这种相似性表明，创作满足感可能不仅来自控制和对齐，也来自整个过程中意想不到的发现。
:::

## 讨论（Discussion）

:::bi

We reflect on our findings from the design and evaluation of Amuse and discuss the lessons learned and future opportunities for music creativity support systems.

:::zh

我们回顾了从 Amuse 的设计与评估中得到的发现，并讨论从中获得的经验教训以及音乐创造力支持系统的未来机会。
:::

### 迈向上下文感知的多模态系统（Toward Contextual Multimodal Systems）

:::bi

Overall, we found that Amuse effectively supported songwriters in exploring ideas while maintaining their sense of agency (§8.3). However, our study revealed moments of friction when participants transitioned from the multimodal tool (Amuse) to the unimodal contextual tool (Aria). Participants who engaged with Amuse often expected Aria to generate suggestions aligned with the sources of inspiration they inputted in Amuse, only to find that Aria could not reflect this prior context (§8.3.1). Moreover, while Amuse was designed to support the early stages of songwriting, four out of 10 participants used it mid-process—after they had already developed a musical structure in the editor—even though Amuse was not designed to account for existing user inputs. The global key conditioning of our chord generation system occasionally resulted in chord outputs that happened to be relevant to the surrounding context, but there were also instances where less contextually relevant outputs led to frustration (§8.2.1).

:::zh

总体而言，我们发现 Amuse 在保持写歌人主动权的同时，有效地支持了他们探索想法（§8.3）。然而，我们的研究揭示了参与者在从多模态工具（Amuse）切换到单模态上下文工具（Aria）时出现的摩擦时刻。使用过 Amuse 的参与者往往期望 Aria 生成与他们输入到 Amuse 中的灵感来源相一致的建议，结果却发现 Aria 无法反映这一先前的上下文（§8.3.1）。此外，虽然 Amuse 旨在支持歌曲创作的早期阶段，但 10 名参与者中有 4 名在创作过程中期使用了它，也就是在编辑器中已经搭建好音乐结构之后，尽管 Amuse 的设计并未考虑用户已有的输入。我们的和弦生成系统的全局调条件化偶尔会产生恰好与周围上下文相关的和弦输出，但也有一些情况，上下文相关性较差的输出导致了挫败感（§8.2.1）。
:::

:::bi

These frictions reflect a misalignment between user expectations and tool capabilities—participants formed assumptions about one tool’s capability based on their experiences with the other, leading to frustration when their expectations were unmet (Oliver, 1980), and consequently, a disruption in their creative flow (Lawton et al., 2023; Csikszentmihalyi, 1997a; Csikszentmihalyi, 1997b). For instance, interacting with Amuse during the early stages of songwriting likely led participants to expect that these modalities would continue to play a role throughout the entire songwriting process. When transitioning to Aria, however, their expectations clashed with Aria’s narrower focus on musical elements, which lacked the multimodality they had grown accustomed to. Similarly, some participants who used Amuse mid-process expected it to consider both their multimodal inspirations and the evolving musical elements in the editor, which it did not do.

:::zh

这些摩擦反映了用户期望与工具能力之间的错位：参与者根据对另一个工具的使用体验，对某个工具的能力形成预设，当期望得不到满足时就会产生挫败感（Oliver, 1980），进而打断他们的创作心流（Lawton et al., 2023; Csikszentmihalyi, 1997a; Csikszentmihalyi, 1997b）。例如，在歌曲创作早期阶段与 Amuse 互动，很可能让参与者期望这些模态会在整个歌曲创作过程中持续发挥作用。然而，当切换到 Aria 时，他们的期望与 Aria 对音乐元素的更狭窄关注发生了冲突，因为 Aria 缺少他们已经习惯的多模态性。类似地，一些在创作过程中期使用 Amuse 的参与者期望它能同时考虑他们的多模态灵感以及编辑器中不断演进的音乐元素，但 Amuse 并没有这样做。
:::

:::bi

Addressing these discrepancies requires establishing consistency across tools used in the creative process (Norman, 2013). An ideal system would be both multimodal *and* contextual, dynamically generating outputs that integrate both multimodal inspirations and the evolving musical context. This would ensure that users’ creative expectations align with the system’s capabilities. However, a key challenge in simultaneously achieving these dual goals lies in the absence of multimodal-contextual data (e.g., paired keyword-MIDI data) necessary for training models that can account for both users’ multimodal and contextual inputs. Future work could involve building a dataset that captures the relationship between multimodal inspirations and musical elements. One potential approach is to collect interaction data (Lee et al., 2022), for example, by assigning specific songwriting tasks (e.g., ‘compose a song reflecting the mood of an image’) and logging the suggestions (e.g., melodies or chords) users accept from a contextual model like Aria. Another approach might involve using multimodal models for the reverse task of generating relevant multimodal inspirations from musical elements to create paired data. These approaches would offer valuable multimodal-contextual data pairs to inform the development of more integrated systems.

:::zh

解决这些差异需要在创作过程中使用的各个工具之间建立一致性（Norman, 2013）。一个理想的系统应当既是多模态的，又具备上下文能力，能够动态生成同时整合多模态灵感和不断演进的音乐上下文的输出。这将确保用户的创作期望与系统的能力保持一致。然而，同时实现这两个目标的一个关键挑战在于，缺少训练能够同时考虑用户多模态输入和上下文输入的模型所需的多模态上下文数据（例如成对的关键词 MIDI 数据）。未来的工作可以包括构建一个数据集，用以捕捉多模态灵感与音乐元素之间的关系。一种可能的做法是收集交互数据（Lee et al., 2022），例如布置具体的歌曲创作任务（比如“创作一首反映某张图片情绪的歌曲”），并记录用户从 Aria 这样的上下文模型那里采纳的建议（例如旋律或和弦）。另一种做法可能是利用多模态模型完成相反的任务，也就是从音乐元素生成相关的多模态灵感，从而创建成对数据。这些做法将提供有价值的多模态上下文数据对，为开发更加一体化的系统提供信息。
:::

### 随机性在人机共同创作中的作用（The Role of Randomness in Human-AI Co-Creation）

:::bi

One of the interesting observations from our study was that participants felt equally satisfied with the final compositions and enjoyed the songwriting process similarly, regardless of whether they used only Aria or both Aria and Amuse, despite Amuse’s outputs being considered as more controllable and better aligned with their creative intentions (§8.3.4). Notably, participants often described Aria’s suggestions as out-of-sync and random, yet they also reported moments of serendipity where these unexpected outputs prompted them to deviate from their original plans and still achieve satisfactory outcomes. This observation aligns with prior work showing that unrelated suggestions can be evocative and productive in creative contexts (Ward and Lawson, 2009; Leong et al., 2006; Kamath et al., 2024), with the surprising combinations of ideas provoking exploratory processes that lead to the production of creative ideas (Kunda et al., 1990). Participants may have viewed Aria’s random outputs not as bugs but as an inherent feature of the human-AI interaction, and this engagement with randomness likely stimulated cognitive reorganization and creative leaps that enriched their overall experience (Singh et al., 2023).

:::zh

我们研究中的一个有趣发现是，无论参与者只使用 Aria 还是同时使用 Aria 和 Amuse，他们对最终作品的满意程度都相同，对歌曲创作过程的享受程度也相似，尽管 Amuse 的输出被认为更具可控性，也更符合他们的创作意图（§8.3.4）。值得注意的是，参与者常常把 Aria 的建议描述为不同步且随机的，但他们也报告了机缘巧合的时刻，在这些时刻，意想不到的输出促使他们偏离原计划，却仍然取得了令人满意的结果。这一发现与先前的研究一致，那些研究表明，在创作情境中，不相关的建议可以具有启发性和成效（Ward and Lawson, 2009; Leong et al., 2006; Kamath et al., 2024），因为出人意料的想法组合会激发探索过程，进而产生创造性的想法（Kunda et al., 1990）。参与者可能没有把 Aria 的随机输出视为缺陷，而是将其看作人机交互的内在特征，这种与随机性的互动很可能激发了认知重组和创造性飞跃，从而丰富了他们的整体体验（Singh et al., 2023）。
:::

:::annotation
这段讨论把“随机性”摆上台面：有的用户喜欢被意外推着走，有的用户讨厌失控。Amuse 的关键设计是把随机限制在关键词划定的范围里，让它在“惊喜”和“可控”之间取一个平衡。这对理解任何生成式创作工具都有借鉴意义。
:::

:::bi

Another hypothesis is that participants’ engagement styles would have played a crucial role in how they interacted with the systems and perceived their creative processes. As suggested by prior work in the creative writing domain (Singh et al., 2023), creative processes involve broadly different styles of engagement with suggestions, including reactive and proactive engagements. Reactive writers let AI suggestions actively shape their work, using the AI outputs to determine their creative direction. Proactive writers, by contrast, have a clear idea of what they want to create and tightly control their process. Similarly, participants with reactive engagement style in our study may have found Aria’s randomness more inspiring than Amuse’s controllable outputs, as it enabled exploration without requiring explicit decisions about the creative direction. However, it is important to note that our study was conducted in a controlled environment, where participants were given a songwriting prompt and instructed to use the assigned tool(s) at least once. This setup might have influenced how they engaged with the systems, potentially differing from how they would approach the tools in more natural settings. Future work could explore these dynamics in open-ended, real-world scenarios with a larger and more diverse group of participants. Such studies could uncover richer usage patterns and provide deeper insights into how randomness, controllability, and user engagement styles contribute to shaping creative satisfaction and the effectiveness of AI creativity support tools.

:::zh

另一个假设是，参与者的参与风格在他们如何与系统互动以及如何看待自己的创作过程方面，可能起到了关键作用。正如先前在创意写作领域的研究所表明的那样（Singh et al., 2023），创作过程涉及与建议互动的多种截然不同的风格，包括反应式参与和主动式参与。反应式作者会让 AI 建议积极地塑造他们的作品，用 AI 输出来决定他们的创作方向。相比之下，主动式作者对自己想要创作什么有清晰的想法，并牢牢掌控自己的创作过程。类似地，在我们的研究中，具有反应式参与风格的参与者可能会觉得 Aria 的随机性比 Amuse 的可控输出更能激发灵感，因为它能在无需对创作方向做出明确决定的情况下促成探索。然而，需要指出的是，我们的研究是在受控环境中进行的，参与者拿到一个歌曲创作提示，并被要求至少使用一次指定的工具。这种设置可能影响了他们与系统互动的方式，可能与他们在更自然的环境中接触这些工具的方式有所不同。未来的工作可以在开放式且真实的场景中，用规模更大且更多样化的参与者群体来探索这些动态。这类研究可以揭示更丰富的使用模式，并更深入地洞察随机性，可控性和用户参与风格如何共同塑造创作满意度以及 AI 创造力支持工具的有效性。
:::

### 对和弦转录器低使用率的反思（Reflection on the Chord Transcriber’s Low Usage）

:::bi

While the majority of participants in the formative study highlighted existing music and transcribing elements like chords or melodies as a key ideation process (§3.2), the user study revealed a contrasting preference: participants generally favored the Chord Generator over the Chord Transcriber (§8.1.3). Although practical constraints—such as the absence of instruments and limited time to choose appropriate songs during the study—may have influenced this preference, the difference in how the two tools supported creative exploration may provide additional insights.

:::zh

虽然形成性研究中的大多数参与者都强调，利用现有音乐并转录和弦或旋律等元素是一个关键的想法构思过程（§3.2），但用户研究揭示了一种相反的偏好：参与者普遍更偏爱和弦生成器而不是和弦转录器（§8.1.3）。尽管一些实际限制（例如研究中缺少乐器，以及选择合适歌曲的时间有限）可能影响了这种偏好，但两种工具支持创作探索的方式差异或许能提供更多见解。
:::

:::annotation
Chord Transcriber 的低使用率值得玩味：它的功能来自形成性研究里“从现成的歌扒和弦”这个真实需求，但正式用户研究里却没人真用它。作者反思，用户期望的不仅是“转录”，而是转录之后还能继续拿这些和弦去探索。设计目标跟着用户期望走偏了半拍。
:::

:::bi

We hypothesize that the Chord Generator, by accepting non-musical inputs such as images and texts, offered the creative freedom necessary to compose songs based on songwriting prompts (e.g., “Write an 8-bar chorus about your favorite summer holiday memory.”), which was the focus of our user study task. Working to understand the abstract and open-ended relationship between non-musical inputs and musical outputs likely fostered imaginative and interpretative exploration. Theories of creative thought also support this hypothesis, which suggests that abstract thinking facilitates creative cognition by stimulating new associations and broadening the scope of possibilities (Finke et al., 1992; Ward et al., 1995). In contrast, the Chord Transcriber, which outputs literal transcriptions from musical inputs, provided a more concrete and constrained interaction. This specificity may limit participants’ opportunities for abstract thinking and exploratory ideation. As a result, the Chord Generator’s capacity to support interpretative and open-ended exploration likely made it better suited for our songwriting task, which emphasized creative ideation. Future work could explore contexts in which more literal, concrete tools like the Chord Transcriber are particularly effective.

:::zh

我们推测，和弦生成器通过接受图像和文本等非音乐输入，提供了根据歌曲创作提示（例如“围绕你最美好的暑假回忆写一段 8 小节的副歌。”）创作歌曲所需的创作自由，而这正是我们用户研究任务的重点。努力理解非音乐输入与音乐输出之间抽象而开放的关系，很可能促进了富有想象力和诠释性的探索。创造性思维的理论也支持这一假设，这些理论认为，抽象思维通过激发新的联想并拓宽可能性范围来促进创造性认知（Finke et al., 1992; Ward et al., 1995）。相比之下，和弦转录器从音乐输入输出字面转录结果，提供了一种更具体且更受约束的互动。这种具体性可能限制了参与者进行抽象思考和探索性构思的机会。因此，和弦生成器支持诠释性和开放式探索的能力，很可能使它更适合我们强调创造性构思的歌曲创作任务。未来的工作可以探索和弦转录器这类更字面化且更具体的工具在哪些情境下特别有效。
:::

:::bi

Additionally, participants may have preferred the Chord Generator because it provided multiple suggestions, aligning with the design principles for creativity support tools that emphasize the importance of exploring various alternatives (Resnick et al., 2018). In comparison, the Chord Transcriber’s singular, literal outputs may have constrained creative exploration. Although we designed the Chord Transcriber based on observations from the formative study—where users transcribed chords from audio and expanded upon them—participants in the user study appeared to expect the tool to support further exploration of the chords, as indicated by P6 in §8.1.3. Future work could consider expanding the Chord Transcriber’s capabilities to encourage exploration within the creative space, such as offering multiple variations of transcribed chord progressions, like alterations or substitutions, alongside the literal transcriptions.

:::zh

此外，参与者可能更偏爱和弦生成器，是因为它提供了多条建议，这与创造力支持工具的设计原则一致，这些原则强调探索各种备选方案的重要性（Resnick et al., 2018）。相比之下，和弦转录器单一而字面的输出可能限制了创作探索。虽然我们是基于形成性研究的观察来设计和弦转录器的，在那些观察中，用户从音频中转录和弦并在此基础上扩展，但用户研究中的参与者似乎期望该工具能支持对和弦的进一步探索，正如 §8.1.3 中 P6 所指出的那样。未来的工作可以考虑扩展和弦转录器的能力，以鼓励在创作空间内进行探索，例如在字面转录之外，提供转录和弦进行的多种变体，比如变化或替代。
:::

### 实时的多模态创造力支持（Real-time Multimodal Creativity Support）

:::bi

Like many existing AI music systems (Louie et al., 2020; Louie et al., 2022; Suh et al., 2021), Amuse was designed for a static environment where users sit down at a computer to create music, and our experiments reflected this setting. However, music creation is inherently *dynamic*, often occurring in spontaneous moments, such as during improvisation on instruments (Alperson, 1984; Walton et al., 2017). We observed similar behaviors in both our formative and user studies. The majority of formative study participants reported they rely on improvising on their instruments to manually conjure ideas (§3.2.2), and a user study participant noted that they would have improvised on the piano to develop ideas if they had access to it during the study session (§8.1.3).

:::zh

与许多现有的 AI 音乐系统一样（Louie et al., 2020; Louie et al., 2022; Suh et al., 2021），Amuse 是为静态环境设计的，用户坐在电脑前创作音乐，而我们的实验也反映了这一设置。然而，音乐创作本质上是动态的，常常发生在自发的时刻，例如在乐器上即兴演奏时（Alperson, 1984; Walton et al., 2017）。我们在形成性研究和用户研究中也观察到了类似的行为。形成性研究的大多数参与者报告说，他们依靠在乐器上即兴演奏来手动唤起想法（§3.2.2），而一位用户研究参与者指出，如果在研究过程中有钢琴可用，他们会通过钢琴即兴演奏来发展想法（§8.1.3）。
:::

:::bi

To this end, a promising direction for the future development of human-AI music co-creation systems would involve building AI systems and interaction methods that facilitate real-time creative exploration. One intuitive approach is real-time accompaniment systems (Benetatos et al., 2020; Wu et al., 2024a; Wang et al., 2022), which includes harmonizing with (Wu et al., 2024a) or generating basslines (Benetatos et al., 2020) upon user melody inputs. Exploring how users can effectively interact with these systems to create a meaningful composition would be a valuable area of investigation.

:::zh

为此，人机音乐共同创作系统未来发展的一个有前景的方向，是构建支持实时创作探索的 AI 系统和交互方式。一种直观的做法是实时伴奏系统（Benetatos et al., 2020; Wu et al., 2024a; Wang et al., 2022），其中包括根据用户输入的旋律进行和声（Wu et al., 2024a）或生成低音线（Benetatos et al., 2020）。探索用户如何有效地与这些系统互动，以创作出有意义的作品，将是一个有价值的研究方向。
:::

:::bi

Moreover, multimodal systems could further enhance this process by providing real-time feedback across different modalities, supporting the user’s creative exploration of musical ideas. Similar to writing support tools that offer multimodal feedback to guide story development (Singh et al., 2023; Bensaid et al., 2021), a real-time multimodal feedback system for music could offer lyrical ideas, visual cues, or rhythmic patterns that respond dynamically to the user’s improvisations, enriching the creative process.

:::zh

此外，多模态系统可以通过在不同模态之间提供实时反馈来进一步增强这一过程，支持用户对音乐想法的创作探索。与提供多模态反馈来引导故事发展的写作支持工具类似（Singh et al., 2023; Bensaid et al., 2021），一个面向音乐的实时多模态反馈系统可以提供歌词想法，视觉线索或节奏模式，动态响应用户的即兴演奏，从而丰富创作过程。
:::

### 在输入与输出两端扩展多模态支持（Expanding Multimodal Support Across Inputs and Outputs）

:::bi

In this study, we focused on generating chord progressions based on multimodal inspirations. While chord progressions are a critical building block of music, the music itself comprises multiple layers: lyrics, melody, chords, bassline, drums, structure, and instrumentation, to name a few. A promising research direction would involve expanding multimodal support to *output* other types of layers, each of which might constitute a reusable musical element. This could offer users greater flexibility in how they approach music composition and help them develop different layers of their songs simultaneously or in sequence.

:::zh

在这项研究中，我们专注于基于多模态灵感生成和弦进行。虽然和弦进行是音乐的关键构建块，但音乐本身由多个层次组成：歌词，旋律，和弦，低音线，鼓，结构和配器，这只是其中一部分。一个有前景的研究方向是扩展多模态支持，以输出其他类型的层次，其中每一个层次都可能构成一个可复用的音乐元素。这可以为用户提供更大的灵活性，让他们以不同的方式处理音乐创作，并帮助他们同时或按顺序发展歌曲的不同层次。
:::

:::bi

Similarly, musicians might benefit from AI assistance supporting diverse forms of *input* beyond the text, image, and audio modalities considered in this work. For instance, users could initiate their creative process with rhythm (as sensory data) or motion information (as video data). Exploring how different modalities can inspire musical ideas could open up new possibilities for future research. The diversity of input/output directions pursued by participants in the AI Song Contest (Huang et al., 2020; Morris et al., 2024) provides some evidence that greater flexibility on both ends would support the creative goals of more users.

:::zh

类似地，除了本文所考虑的文本，图像和音频模态之外，音乐人还可能从支持多样化输入形式的 AI 辅助中受益。例如，用户可以用节奏（作为感官数据）或运动信息（作为视频数据）来启动创作过程。探索不同模态如何激发音乐想法，可以为未来的研究开辟新的可能性。参与者在 AI Song Contest（Huang et al., 2020; Morris et al., 2024）中追求的输入输出方向的多样性，提供了一些证据，表明两端更大的灵活性将支持更多用户的创作目标。
:::

### 局限（Limitations）

:::bi

Several limitations of the study warrant consideration. First, Amuse always displayed the Chord Generator first, potentially influencing participant preferences. Additionally, the controlled study environment, where participants were required to use each tool at least once, may not reflect how they would naturally interact with the tools in a more open-ended setting. The novelty effect of Amuse also cannot be decoupled, as most participants were familiar with Aria but not with Amuse. Future studies could benefit from in-the-wild, long-term investigations to capture more natural and organic use of Amuse.

:::zh

本研究的若干局限值得考虑。首先，Amuse 总是先显示和弦生成器，这可能影响了参与者的偏好。此外，受控的研究环境要求参与者至少使用一次每种工具，这可能无法反映他们在更开放的环境中自然会如何与这些工具互动。Amuse 的新颖性效应也无法排除，因为大多数参与者熟悉 Aria 但不熟悉 Amuse。未来的研究可以从真实场景的长期调查中受益，以捕捉对 Amuse 更自然且更本真的使用。
:::

## 结论（Conclusion）

:::bi

We present Amuse, a songwriting assistant that transforms multimodal (image, text, audio) inspirations into reusable musical elements (chord progressions) that can be seamlessly incorporated into songwriters’ creative process. Amuse offers two key functionalities: Chord Generator and Chord Transcriber. The Chord Generator allows users to extract music keywords from multimodal inspirations and generate chord progressions aligned with these keywords. The Chord Transcriber enables users to convert audio sources into chords. To ensure the generated chord progressions are diverse, musically coherent, and relevant to keywords, we developed a novel rejection-sampling-based approach that leverages the general capabilities of LLMs in combination with a unimodal chord generation model trained on real music data. Our technical evaluation and user study demonstrate that Amuse effectively supports the transformation of multimodal inspirations into musical elements, enhancing the songwriting process by improving perceived agency, creativity, and efficiency. With advancements in music AI, we believe Amuse opens new avenues for human-AI co-creation in music.

:::zh

我们提出了 Amuse，一个写歌助手，它把多模态（图像，文本，音频）灵感转化为可复用的音乐元素（和弦进行），这些元素可以无缝融入写歌人的创作过程。Amuse 提供两个关键功能：和弦生成器和和弦转录器。和弦生成器允许用户从多模态灵感中提取音乐关键词，并生成与这些关键词一致的和弦进行。和弦转录器让用户能够把音频来源转换成和弦。为了确保生成的和弦进行多样化，音乐上连贯，并且与关键词相关，我们提出了一种新颖的基于拒绝采样的方法，该方法结合了大语言模型的通用能力与一个在真实音乐数据上训练的单模态和弦生成模型。我们的技术评估和用户研究表明，Amuse 有效地支持了把多模态灵感转化为音乐元素，通过提升感知到的主动权，创造力和效率来增强歌曲创作过程。随着音乐 AI 的进步，我们相信 Amuse 为音乐领域的人机共同创作开辟了新的道路。
:::

## 附录 A：提示词（Prompts）

:::bi

We list the GPT-4o prompts used in Amuse and its evaluation.

:::zh

我们列出了 Amuse 及其评估中所使用的 GPT-4o 提示词。
:::

### 关键词提取（Keywords Extraction）

:::bi

> **System Prompt**
> You are a creative assistant that generates song keywords. You will receive one or more of the following: an image URL, a text note, and user-written keywords. Your task is to create keywords that capture the essence of the input, using style-words, genres, and song-types from the provided keyword list. You may also create new relevant keywords if necessary. Respond only with the keywords, avoiding any additional commentary or formatting.
> Instructions:
> 1. Analyze the inputs: For an image, identify visual elements that suggest musical themes and emotions. For text, identify the main themes, emotions, or ideas. For user-written keywords, expand upon them with related music styles, genres, and types.
> 2. Generate keywords: Use the provided keyword list, but feel free to create new, relevant keywords if they better capture the input.
> 3. Format the output: Provide the keywords in a comma-separated list without any additional text or formatting.
> Keyword List:
> Style: dance, festive, groovy, mid-tempo, syncopated, tipsy, atmospheric, cold, dark, doom, dramatic, sinister, adjunct, art, capriccio, mellifluous, nü, progressive, unusual, anthemic, emotional, happy, jubilant, melancholy, sad, aggressive, banger, power, stadium, stomp, broadway, cabaret, lounge, operatic, storytelling, torch-lounge, theatrical, troubadour, vegas, ethereal, majestic, mysterious, ambient, cinematic, heat, minimal, slow, sparse, german schlager, glam, glitter, bedroom, chillwave, intimate, sadcore, carnival, distorted, glitchy, haunted, hollow, musicbox, random, arabian, bangra, calypso, chalga, egyptian, hindustani, hōgaku, jewish music, klezmer, matsuri, middle east, polka, russian navy song, suomipop, tribal
> Genre: appalachian, bluegrass, country, folk, freak folk, western, afro-cuban, dance pop, disco, dubstep, disco funk, edm, electro, high-nrg, house, trance, downtempo, synthwave, trap, cyberpunk, drum’n’bass, electronic, hypnogogical, phonk, synthpop, techno, bebop, gospel, frutiger aero, jazz, latin jazz, RnB, soul, bossa nova, forró, mambo, salsa, tango, afrobeat, dancehall, dub, reggae, reggaeton, black metal, deathcore, death metal, heavy metal, heavy metal trap, metalcore, nu metal, power metal, pop, pop rock, kpop, jpop, classic rock, blues rock, emo, glam rock, hardcore punk, indie, industrial rock, punk, rock, skate rock, skatecore, funk, hiphop, rap
> Type: elevator, jingle, muzak, adan, adjan, call to prayer, gregorian chant, i want song, hero theme, strut, march, military, villain theme, lullaby, nursery rhyme, sing-along, toddler, adagio, andante, allegro, acoustic guitar, bass, doublebass, electricbass, electric guitar, fingerstyle guitar, percussion, chaotic, noise, stuttering, glissando trombone, legato cello, orchestral, spiccato violins, staccato viola, symphonic, 1960s, barbershop, big band, classic, doo wop, girl group, salooncore, swing, americana, christmas carol, a cappella, arabian ornamental, dispassionate, melismatic, monotone, narration, resonant, spoken word, sprechgesang, sultry, scream, torchy, vocaloid
> **Examples**
> **User:** Image: [A base64-encoded image of a city skyline at sunset]
> **System:** ambient, lo-fi house moods, mellow, smooth jazz, chillwave, urban pop, dreamy, city pop
> **User:** Image: [A base64-encoded image of a long-distance couple reuniting at the airport] | Text Note: Met after three years at the airport. Felt like a movie scene. I scanned the crowd, and there you were, smiling. I knew I was home.
> **System:** cinematic, indie, nostalgic, intimate, troubadour, americana, orchestral, piano
> **User:** Text Note: “Hope” is the thing with feathers - That perches in the soul - And sings the tune without the words - And never stops at all. | User Keywords: hopeful
> **System:** emotional, ethereal, acoustic guitar, folk, atmospheric, storytelling ballad, soft-spoken harmonies

:::zh

> **System Prompt**
> 你是一名生成歌曲关键词的创意助手。你会收到以下一项或多项内容：一个图像 URL，一条文字笔记，以及用户自己写的关键词。你的任务是创建能够抓住输入本质的关键词，使用所提供关键词列表中的风格词，流派和歌曲类型。如有必要，你也可以创建新的相关关键词。只回复关键词，不要附加任何额外的说明或格式。
> 指令：
> 1. 分析输入：对于图像，找出暗示音乐主题和情绪的视觉元素。对于文本，找出主要主题，情绪或想法。对于用户自己写的关键词，用相关的音乐风格，流派和类型对其进行扩展。
> 2. 生成关键词：使用所提供的关键词列表，但如果新关键词能更好地抓住输入，也可以自由创建新的相关关键词。
> 3. 格式化输出：以逗号分隔的列表形式提供关键词，不要附加任何额外的文字或格式。
> 关键词列表：
> Style: dance, festive, groovy, mid-tempo, syncopated, tipsy, atmospheric, cold, dark, doom, dramatic, sinister, adjunct, art, capriccio, mellifluous, nü, progressive, unusual, anthemic, emotional, happy, jubilant, melancholy, sad, aggressive, banger, power, stadium, stomp, broadway, cabaret, lounge, operatic, storytelling, torch-lounge, theatrical, troubadour, vegas, ethereal, majestic, mysterious, ambient, cinematic, heat, minimal, slow, sparse, german schlager, glam, glitter, bedroom, chillwave, intimate, sadcore, carnival, distorted, glitchy, haunted, hollow, musicbox, random, arabian, bangra, calypso, chalga, egyptian, hindustani, hōgaku, jewish music, klezmer, matsuri, middle east, polka, russian navy song, suomipop, tribal
> Genre: appalachian, bluegrass, country, folk, freak folk, western, afro-cuban, dance pop, disco, dubstep, disco funk, edm, electro, high-nrg, house, trance, downtempo, synthwave, trap, cyberpunk, drum’n’bass, electronic, hypnogogical, phonk, synthpop, techno, bebop, gospel, frutiger aero, jazz, latin jazz, RnB, soul, bossa nova, forró, mambo, salsa, tango, afrobeat, dancehall, dub, reggae, reggaeton, black metal, deathcore, death metal, heavy metal, heavy metal trap, metalcore, nu metal, power metal, pop, pop rock, kpop, jpop, classic rock, blues rock, emo, glam rock, hardcore punk, indie, industrial rock, punk, rock, skate rock, skatecore, funk, hiphop, rap
> Type: elevator, jingle, muzak, adan, adjan, call to prayer, gregorian chant, i want song, hero theme, strut, march, military, villain theme, lullaby, nursery rhyme, sing-along, toddler, adagio, andante, allegro, acoustic guitar, bass, doublebass, electricbass, electric guitar, fingerstyle guitar, percussion, chaotic, noise, stuttering, glissando trombone, legato cello, orchestral, spiccato violins, staccato viola, symphonic, 1960s, barbershop, big band, classic, doo wop, girl group, salooncore, swing, americana, christmas carol, a cappella, arabian ornamental, dispassionate, melismatic, monotone, narration, resonant, spoken word, sprechgesang, sultry, scream, torchy, vocaloid
> **Examples**
> **User:** 图像：[一张日落时城市天际线的 base64 编码图像]
> **System:** ambient, lo-fi house moods, mellow, smooth jazz, chillwave, urban pop, dreamy, city pop
> **User:** 图像：[一张异地恋情侣在机场重逢的 base64 编码图像] | 文字笔记：三年后在机场重逢。感觉像电影场景。我扫视人群，你就在那里，微笑着。我知道我到家了。
> **System:** cinematic, indie, nostalgic, intimate, troubadour, americana, orchestral, piano
> **User:** 文字笔记：“希望”是有羽毛的东西 - 栖息在灵魂里 - 唱着没有歌词的曲调 - 永不停歇。 | 用户关键词：hopeful
> **System:** emotional, ethereal, acoustic guitar, folk, atmospheric, storytelling ballad, soft-spoken harmonies
:::

### 和弦进行生成：Amuse（Chord Progression Generation: Amuse）

:::bi

> **System Prompt**
> You are a musical assistant generating chord progressions based on user-provided keywords, key, mode, and bar. The keywords describe the genre, style, and song type. The key specifies a root note that is in [C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F]. The mode specifies a scale that is in [Maj, Min, Dor, Phr, Lyd, Mix, Loc, Hmin, Phdm]. The bar specifies the number of chords to generate for each progression. Your task is to create 30 diverse chord progressions conforming to the keywords, key, and mode. Each progression should consist of the same number of chords as the bar input, with each chord separated by a space ’ ’ and each progression on a new line.
> Instructions:
> 1. Analyze Chord Functions: Determine the functions of chords in the given key and mode. Tonic (I, vi) provides resolution and stability. Subdominant (IV, ii) creates movement away from the tonic. Dominant (V, vii°) creates tension that needs to resolve to the tonic.
> 2. Analyze the Keywords: Determine the chord components and progression patterns based on the keywords. For example, for jazz-related keywords, consider using seventh chords, altered chords, and common jazz progressions like ii-V-I. For keywords like ’sadness’ or ’emotional,’ use minor chords, diminished chords, and progressions that create tension.
> 3. Generate 30 Chord Progressions: Create 30 distinct chord progressions that fit the specified key and mode and match the keywords. Each progression should be unique and align with the bar parameter (i.e., if bars = 4, each progression should have 4 chords). Ensure diversity by varying the chord components (root, quality, extensions, alterations, etc.), progression patterns (diatonic/chromatic), and cadences.
> Each chord text can have the following components, in order:
> 1. Root Note: A-G, with optional accidentals (#, b, x).
> 2. Chord Quality: maj, min, aug, dim.
> 3. Extensions: Specific chord extensions such as 6/9, 7, 9, 11, 13.
> 4. Suspended Chords: Suspended chords such as sus2, sus4, sus#2, sus#4.
> 5. Added Notes: Added notes such as add2, add4, add6, add9, add11, add13.
> 6. Altered Notes: Alterations such as b5, #5, b9, #9, #11, b13.
> 7. Slash Chords: Alternate bass notes such as /E, /G#, /Bb, /Dx.
> Ensure the chord progressions are musically coherent, stylistically appropriate, and diverse. Include extensions, suspensions, adds, altered notes, slash chords as needed to achieve maximum diversity. Use both diatonic and chromatic chords to enhance the progressions. Respond only with the chord progressions, avoiding any additional commentary or formatting.
> Examples:
> User keywords: dreamy, jazz, soft | Key: B | Mode: Maj | Bars: 4
> Example Progressions:
> C#m7 F#7 Bmaj9 d#dim/C\nEmaj7 A#m7b5 D#m7 G#7
> User keywords: singer-songwriter, acoustic, emotional | Key: F# | Mode: Maj | Bars: 3
> Example progressions:
> F# B/F# C#/G#\nC# D#msus2 D#m/
> User keywords: orchestral, adventurous, epic | Key: D | Mode: Min | Bars: 4
> Example progressions:
> dm gm/Bb gm dm\nBb F C C#dim
> Generate 30 progressions for each user input, following the above guidelines and ensuring diversity and musical coherence. Keep the chord format the same as the examples provided (e.g., G, Amaj7, Cm are valid formats, but Gmaj, Cmin are invalid formats).

:::zh

> **System Prompt**
> 你是一名音乐助手，根据用户提供的关键词，调，调式和小节数来生成和弦进行。关键词描述流派，风格和歌曲类型。调指定一个根音，其取值在 [C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F] 之中。调式指定一个音阶，其取值在 [Maj, Min, Dor, Phr, Lyd, Mix, Loc, Hmin, Phdm] 之中。小节指定每条进行要生成的和弦数量。你的任务是生成 30 条符合这些关键词，调和调式的多样化和弦进行。每条进行应包含与小节输入相同数量的和弦，每个和弦之间用一个空格分隔，每条进行单独占一行。
> 指令：
> 1. 分析和弦功能：确定给定调和调式下各个和弦的功能。主和弦（I，vi）提供解决与稳定感。下属和弦（IV，ii）制造离开主和弦的进行。属和弦（V，vii°）制造需要解决到主和弦的张力。
> 2. 分析关键词：根据关键词确定和弦组成与进行模式。例如，对于与爵士相关的关键词，考虑使用七和弦，变化和弦以及 ii-V-I 这类常见爵士进行。对于“sadness”或“emotional”这类关键词，使用小三和弦，减和弦以及制造张力的进行。
> 3. 生成 30 条和弦进行：生成 30 条各不相同，符合指定调和调式且与关键词匹配的和弦进行。每条进行都应独一无二，并与小节参数一致（也就是说，如果小节数为 4，每条进行应有 4 个和弦）。通过变化和弦组成（根音，性质，扩展，变化音等），进行模式（自然音/半音）和终止式来确保多样性。
> 每个和弦文本可以按顺序包含以下组成部分：
> 1. 根音：A-G，可带升降号（#，b，x）。
> 2. 和弦性质：maj，min，aug，dim。
> 3. 扩展音：特定的和弦扩展音，如 6/9，7，9，11，13。
> 4. 挂留和弦：挂留和弦，如 sus2，sus4，sus#2，sus#4。
> 5. 附加音：附加音，如 add2，add4，add6，add9，add11，add13。
> 6. 变化音：变化音，如 b5，#5，b9，#9，#11，b13。
> 7. 斜线和弦：替代低音，如 /E，/G#，/Bb，/Dx。
> 确保这些和弦进行在音乐上连贯，风格上合适且多样化。根据需要加入扩展音，挂留，附加音，变化音和斜线和弦，以实现最大程度的多样性。同时使用自然音和弦与半音和弦来增强进行。只输出和弦进行，不要附加任何额外的说明或格式。
> 示例：
> 用户关键词：dreamy, jazz, soft | 调：B | 调式：Maj | 小节：4
> 示例进行：
> C#m7 F#7 Bmaj9 d#dim/C\nEmaj7 A#m7b5 D#m7 G#7
> 用户关键词：singer-songwriter, acoustic, emotional | 调：F# | 调式：Maj | 小节：3
> 示例进行：
> F# B/F# C#/G#\nC# D#msus2 D#m/
> 用户关键词：orchestral, adventurous, epic | 调：D | 调式：Min | 小节：4
> 示例进行：
> dm gm/Bb gm dm\nBb F C C#dim
> 对每个用户输入生成 30 条进行，遵循上述准则，并确保多样性与音乐连贯性。和弦格式保持与所给示例一致（例如 G，Amaj7，Cm 是有效格式，而 Gmaj，Cmin 是无效格式）。
:::

### 和弦进行生成：基线（Chord Progression Generation: Baseline）

:::bi

> **System Prompt**
> You are a musical assistant generating chord progressions based on user-provided keywords, key, mode, and bar. The keywords describe the genre, style, and song type. The key specifies a root note that is in [C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F]. The mode specifies a scale that is in [Maj, Min, Dor, Phr, Lyd, Mix, Loc, Hmin, Phdm]. The bar specifies the number of chords to generate for each progression. Your task is to create a chord progression conforming to the keywords, key, and mode. The progression should consist of the same number of chords as the bar input, with each chord separated by a space ’ ’ and the progression on a new line.
> Instructions:
> 1. Analyze Chord Functions: Determine the functions of chords in the given key and mode. Tonic (I, vi) provides resolution and stability. Subdominant (IV, ii) creates movement away from the tonic. Dominant (V, vii°) creates tension that needs to resolve to the tonic.
> 2. Analyze the Keywords: Determine the chord components and progression patterns based on the keywords. For example, for jazz-related keywords, consider using seventh chords, altered chords, and common jazz progressions like ii-V-I. For keywords like ’sadness’ or ’emotional,’ use minor chords, diminished chords, and progressions that create tension.
> 3. Generate a Chord Progression: Create a chord progression that fits the specified key and mode and matches the keywords. The progression should align with the bar parameter (i.e., if bars = 4, the progression should have 4 chords).
> Each chord text can have the following components, in order:
> 1. Root Note: A-G, with optional accidentals (#, b, x).
> 2. Chord Quality: maj, min, aug, dim.
> 3. Extensions: Specific chord extensions such as 6/9, 7, 9, 11, 13.
> 4. Suspended Chords: Suspended chords such as sus2, sus4, sus#2, sus#4.
> 5. Added Notes: Added notes such as add2, add4, add6, add9, add11, add13.
> 6. Altered Notes: Alterations such as b5, #5, b9, #9, #11, b13.
> 7. Slash Chords: Alternate bass notes such as /E, /G#, /Bb, /Dx.
> Ensure the chord progression is musically coherent and stylistically appropriate. Include extensions, suspensions, adds, altered notes, and slash chords as needed to achieve a rich and satisfying progression. Use both diatonic and chromatic chords to enhance the progression. Respond only with the chord progression, avoiding any additional commentary or formatting.
> Examples:
> User keywords: dreamy, jazz, soft | Key: B | Mode: Maj | Bars: 4
> Example Progression:
> C#m7 F#7 Bmaj9 d#dim/C
> User keywords: singer-songwriter, acoustic, emotional | Key: F# | Mode: Maj | Bars: 3
> Example progression:
> F# B/F# C#/G#
> User keywords: orchestral, adventurous, epic | Key: D | Mode: Min | Bars: 4
> Example progression:
> dm gm/Bb gm dm
> Generate a progression for each user input, following the above guidelines and ensuring musical coherence. Keep the chord format the same as the examples provided (e.g., G, Amaj7, Cm are valid formats, but Gmaj, Cmin are invalid formats).

:::zh

> **System Prompt**
> 你是一名音乐助手，根据用户提供的关键词，调，调式和小节数来生成和弦进行。关键词描述流派，风格和歌曲类型。调指定一个根音，其取值在 [C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F] 之中。调式指定一个音阶，其取值在 [Maj, Min, Dor, Phr, Lyd, Mix, Loc, Hmin, Phdm] 之中。小节指定每条进行要生成的和弦数量。你的任务是生成一条符合这些关键词，调和调式的和弦进行。该进行应包含与小节输入相同数量的和弦，每个和弦之间用一个空格分隔，且该进行单独占一行。
> 指令：
> 1. 分析和弦功能：确定给定调和调式下各个和弦的功能。主和弦（I，vi）提供解决与稳定感。下属和弦（IV，ii）制造离开主和弦的进行。属和弦（V，vii°）制造需要解决到主和弦的张力。
> 2. 分析关键词：根据关键词确定和弦组成与进行模式。例如，对于与爵士相关的关键词，考虑使用七和弦，变化和弦以及 ii-V-I 这类常见爵士进行。对于“sadness”或“emotional”这类关键词，使用小三和弦，减和弦以及制造张力的进行。
> 3. 生成一条和弦进行：生成一条符合指定调和调式且与关键词匹配的和弦进行。该进行应与小节参数一致（也就是说，如果小节数为 4，该进行应有 4 个和弦）。
> 每个和弦文本可以按顺序包含以下组成部分：
> 1. 根音：A-G，可带升降号（#，b，x）。
> 2. 和弦性质：maj，min，aug，dim。
> 3. 扩展音：特定的和弦扩展音，如 6/9，7，9，11，13。
> 4. 挂留和弦：挂留和弦，如 sus2，sus4，sus#2，sus#4。
> 5. 附加音：附加音，如 add2，add4，add6，add9，add11，add13。
> 6. 变化音：变化音，如 b5，#5，b9，#9，#11，b13。
> 7. 斜线和弦：替代低音，如 /E，/G#，/Bb，/Dx。
> 确保该和弦进行在音乐上连贯且风格上合适。根据需要加入扩展音，挂留，附加音，变化音和斜线和弦，以实现一条丰富而令人满意的进行。同时使用自然音和弦与半音和弦来增强进行。只输出该和弦进行，不要附加任何额外的说明或格式。
> 示例：
> 用户关键词：dreamy, jazz, soft | 调：B | 调式：Maj | 小节：4
> 示例进行：
> C#m7 F#7 Bmaj9 d#dim/C
> 用户关键词：singer-songwriter, acoustic, emotional | 调：F# | 调式：Maj | 小节：3
> 示例进行：
> F# B/F# C#/G#
> 用户关键词：orchestral, adventurous, epic | 调：D | 调式：Min | 小节：4
> 示例进行：
> dm gm/Bb gm dm
> 对每个用户输入生成一条进行，遵循上述准则，并确保音乐连贯性。和弦格式保持与所给示例一致（例如 G，Amaj7，Cm 是有效格式，而 Gmaj，Cmin 是无效格式）。
:::

## 附录 B：和弦进行生成细节（Chord Progression Generation Details）

### 拒绝采样实现细节（Rejection Sampling Implementation Details）

:::bi

$P(\mathbf{x})$ consists of two stacked LSTM layers with 512 embedding and hidden dimensions, a learning rate of 1e-5, and a dropout rate of 0.2. Similarly, $Q(\mathbf{x})$ uses two stacked LSTM layers but with 256 embedding and hidden dimensions, the same learning rate of 1e-5, and a dropout rate of 0.2. The distribution is smoothed with a temperature value of 1.7 during rejection sampling.

:::zh

$P(\mathbf{x})$ 由两层堆叠的 LSTM 层组成，嵌入维度和隐藏维度均为 512，学习率为 1e-5，dropout 率为 0.2。类似地，$Q(\mathbf{x})$ 使用两层堆叠的 LSTM 层，但嵌入维度和隐藏维度为 256，学习率同样为 1e-5，dropout 率为 0.2。在拒绝采样过程中，该分布用 1.7 的温度值进行了平滑处理。
:::

### 试听研究使用的关键词（Keywords Used for Listening Study）

:::bi

We list 10 sets of keywords used for the “Keyword Relevance” section of the listening study.

:::zh

我们列出试听研究中“关键词相关性”部分所使用的 10 组关键词。
:::

:::bi

- urban, hip hop, trap
- powerful, rock, heavy metal
- emotional ballad, sad
- bossa nova, latin jazz, samba
- acoustic, folk, country
- soul, r&b, groovy
- smooth, jazz, swing
- lo-fi, dreamy, ambient
- orchestral, epic, cinematic

:::zh

- 都市音乐，嘻哈，陷阱说唱
- 强劲，摇滚，重金属
- 抒情民谣，悲伤
- 波萨诺瓦，拉丁爵士，桑巴
- 原声，民谣，乡村
- 灵魂乐，节奏布鲁斯，律动
- 柔顺，爵士，摇摆
- 低保真，梦幻，氛围
- 管弦乐，史诗感，电影感
:::

:::bi

In addition to this, we included the attention check question with keywords “beautiful, calm, piano” where users select between consonance and dissonance chord progressions.

:::zh

除此之外，我们还加入了一道注意力检查题，关键词为“优美，平静，钢琴”，让用户在协和与不协和的和弦进行之间做出选择。
:::

:::bi

CLAP scores calculated using the synthetic audio used to evaluate keyword relevance in the listening study (Section 6.2). Amuse achieves higher scores ($\uparrow$), indicating better relevance compared to the baselines.

| Method | CLAP $\uparrow$ |
| --- | --- |
| LSTM Prior | 0.2626 |
| GPT-4o | 0.2661 |
| Amuse | 0.2685 |

:::zh

CLAP 分数是利用试听研究中用于评估关键词相关性的合成音频计算得出的（第 6.2 节）。Amuse 取得了更高的分数（$\uparrow$），表明与基线相比具有更好的相关性。

| 方法 | CLAP $\uparrow$ |
| --- | --- |
| LSTM Prior | 0.2626 |
| GPT-4o | 0.2661 |
| Amuse | 0.2685 |
:::

### 关键词相关性的补充评估（Additional Evaluation on Keyword Relevance）

:::bi

We report the automatic evaluation results for keyword relevance using the CLAP score (Wu et al., 2023; Chen et al., 2022) to complement the qualitative findings from our listening study (Section 6.2.2). The CLAP score measures how well audio aligns with a text prompt by computing the pairwise cosine similarity between text and audio embeddings extracted by CLAP. CLAP is a dual-encoder model, with one encoder processing text inputs and the other processing audio inputs. These embedding spaces are jointly trained using a contrastive learning objective (van den Oord et al., 2019). For evaluation, we feed the synthetic audio (used in the listening study for keyword relevance) into the CLAP audio encoder and set the CLAP text encoder input to “*An audio track of [keywords] music*,” building on prior work (Wu et al., 2024b; Wu et al., 2023).

:::zh

我们报告了使用 CLAP 分数（Wu et al., 2023; Chen et al., 2022）对关键词相关性的自动评估结果，以补充试听研究中的定性发现（第 6.2.2 节）。CLAP 分数通过计算 CLAP 提取的文本嵌入与音频嵌入之间的两两余弦相似度，来衡量音频与文本提示词的匹配程度。CLAP 是一个双编码器模型，其中一个编码器处理文本输入，另一个处理音频输入。这些嵌入空间使用对比学习目标进行联合训练（van den Oord et al., 2019）。在评估中，我们将合成音频（即试听研究中用于关键词相关性的音频）输入 CLAP 音频编码器，并把 CLAP 文本编码器的输入设为“一段 [keywords] 音乐的音频”，这一做法建立在先前工作的基础上（Wu et al., 2024b; Wu et al., 2023）。
:::

:::bi

Table 4 presents the results: LSTM prior, GPT4o, and Amuse achieved CLAP scores of 26.3%, 26.6%, and 26.9%, respectively. Note that scores in the range of 20%-30% are typical for cosine similarity metrics in multimodal contrastive models (e.g., CLIP (Radford et al., 2021)) (Wu et al., 2024b; Yu et al., 2024; Singer et al., 2022; Podell et al., 2023). In contrast, in our listening study, listeners rated those systems as having better pairwise keyword relevance 41.4%, 50.7%, and 58.0% of times. For each pair in the listening study, we measured the correlation between differences in CLAP scores and listener judgments. This resulted in a percent agreement of 48.67% and a Pearson correlation of 0.05 (p=0.25). We suspect that the CLAP audio encoder cannot meaningfully embed our synthetic audio, resulting in a weak correlation overall. Although CLAP scores and listener judgments follow a similar trend (favoring Amuse), the listening study provides a more reliable evaluation in this setting.

:::zh

表 4 呈现了结果：LSTM prior，GPT4o 和 Amuse 分别取得了 26.3%，26.6% 和 26.9% 的 CLAP 分数。需要注意的是，20%-30% 区间的分数是多模态对比模型（例如 CLIP（Radford et al., 2021））中余弦相似度指标的典型取值（Wu et al., 2024b; Yu et al., 2024; Singer et al., 2022; Podell et al., 2023）。相比之下，在我们的试听研究中，听者在 41.4%，50.7% 和 58.0% 的情况下认为这些系统具有更好的两两关键词相关性。对于试听研究中的每一对样本，我们测量了 CLAP 分数差异与听者判断之间的相关性。结果显示一致率为 48.67%，Pearson 相关系数为 0.05（p=0.25）。我们怀疑 CLAP 音频编码器无法对我们的合成音频进行有意义的嵌入，从而整体上导致了较弱的相关性。尽管 CLAP 分数与听者判断呈现相似的趋势（都偏向 Amuse），但在这一场景下，试听研究提供了更可靠的评估。
:::

## 附录 C：用户研究（User Study）

### 问卷问题（Survey Questions）

:::bi

For the post-task surveys in the user study, participants were asked to rate their agreement with the following statements on a seven-point Likert scale (1=Strongly Disagree, 7=Strongly Agree). [system(s)] was either “Aria alone” (`Baseline`) or “Amuse and Aria together” (`Assist`).

:::zh

在用户研究的任务后问卷中，参与者被要求在七点 Likert 量表上对以下陈述的同意程度进行评分（1=非常不同意，7=非常同意）。[system(s)] 要么是“仅使用 Aria”（`Baseline`），要么是“Amuse 和 Aria 一起使用”（`Assist`）。
:::

:::bi

- **Inspiration Support**: “Using [system(s)], I could easily translate abstract ideas (e.g., imagery, emotions) into concrete musical components.”
- **Task Alignment**: “Using [system(s)], I felt the tool(s) guided me toward a composition that felt connected to the task prompt.”
- **Think Through**: “Using [system(s)], I could think through what kinds of outputs I would want to complete the task goal, and how to complete the task.”
- **Output Quality**: “Using [system(s)], the outputs I received from the tool(s) were of sufficient quality to be useful in my composition.”
- **Diversity**: “Using [system(s)], I was able to receive a wide range of suggestions that I wouldn’t have composed on my own.”
- **Collaborative**: “Using [system(s)], I felt I was collaborating with the tool(s) to come up with the composition.”
- **Controllable**: “Using [system(s)], I felt I had control over the songwriting process. I could steer the tool(s) towards the task goal.”
- **Ownership**: “I feel that the composition I created using [system(s)] is mine.”
- **Musical Coherence**: “I feel that the composition I created using [system(s)] is musically coherent.”
- **Potential for Development**: “I feel that the composition I created using [system(s)] could serve as a strong foundation for a full song that I could expand on.”
- **Enjoyment**: “Using [system(s)], I was very engaged in the songwriting activity - I enjoyed and would do it again.”
- **Exploration**: “Using [system(s)], it was easy for me to explore many different options, ideas, designs, or outcomes.”
- **Expressiveness**: “Using [system(s)], I was able to be very expressive and creative while doing the activity.”
- **Immersion**: “Using [system(s)], I was able to concentrate on the activity, and I forgot about the tool that I was using.”
- **Results Worth Effort**: “Using [system(s)], what I was able to produce was worth the effort required to produce it.”

:::zh

- **灵感支持**：“使用 [system(s)]，我可以轻松地把抽象想法（例如意象，情绪）转化为具体的音乐组成部分。”
- **任务对齐**：“使用 [system(s)]，我感到工具在引导我完成一首与任务提示相关联的作品。”
- **思考梳理**：“使用 [system(s)]，我能够想清楚为了完成任务目标，我想要什么样的输出，以及如何完成这项任务。”
- **输出质量**：“使用 [system(s)]，我从工具那里获得的输出质量足够好，能够用于我的作品。”
- **多样性**：“使用 [system(s)]，我能够获得各种各样的建议，这些建议是我自己不会写出来的。”
- **协作感**：“使用 [system(s)]，我感到自己在与工具协作来完成作品。”
- **可控性**：“使用 [system(s)]，我感到自己掌控着歌曲创作过程。我可以引导工具朝着任务目标前进。”
- **归属感**：“我觉得自己使用 [system(s)] 创作的作品属于我。”
- **音乐连贯性**：“我觉得自己使用 [system(s)] 创作的作品在音乐上是连贯的。”
- **发展潜力**：“我觉得自己使用 [system(s)] 创作的作品可以作为一首完整歌曲的坚实基础，我可以在此基础上继续扩展。”
- **愉悦感**：“使用 [system(s)]，我非常投入歌曲创作活动，我很享受，并且愿意再来一次。”
- **探索**：“使用 [system(s)]，我很容易探索许多不同的选项，想法，设计或结果。”
- **表现力**：“使用 [system(s)]，我在这项活动中能够充分表达自己并富有创造力。”
- **沉浸感**：“使用 [system(s)]，我能够专注于这项活动，并且忘记了我正在使用的工具。”
- **成果值得付出**：“使用 [system(s)]，我能够完成的作品值得我为完成它而付出的努力。”
:::

:::bi

The questions for think-through, collaborative, and controllable are adapted from the previous work that measured user perceptions on AI systems (Wu et al., 2022). The questions for ownership and musical coherence are adapted from the related work on human-AI music co-creation (Louie et al., 2022). The questions for enjoyment, exploration, expressiveness, immersion, and results worth effort are Creativity Support Index (Cherry and Latulipe, 2014) measures.

:::zh

关于思考梳理，协作感和可控性的问题改编自此前测量用户对 AI 系统看法的研究（Wu et al., 2022）。关于归属感和音乐连贯性的问题改编自人机音乐共同创作的相关研究（Louie et al., 2022）。关于愉悦感，探索，表现力，沉浸感和成果值得付出的问题是 Creativity Support Index（Cherry and Latulipe, 2014）中的测量项。
:::

### 访谈问题（Interview Questions）

:::bi

We list the questions used for the semi-structured interview after the two songwriting sessions with baseline and Amuse.

:::zh

我们列出了在基线和 Amuse 这两个歌曲创作环节之后进行的半结构化访谈所使用的问题。
:::

:::bi

- Can you walk me through your songwriting process when using both Aria and Amuse together?
- Comparing the baseline and Amuse, what were the main differences you noticed in the songwriting process?
- How did using Amuse with Aria influence your final composition compared to using Aria alone? Did it lead to any unexpected or particularly satisfying results?
- Were there any creative challenges you faced during the process that the tools helped (or could have helped) you overcome? How did they assist (or not) in solving specific problems?
- Which features in Amuse did you find most helpful or not? Can you describe specific scenarios where they were particularly helpful or unhelpful?
- How do you envision using tools like Aria and Amuse in your future songwriting projects? What role do you see them playing in your creative process?
- What specific improvements or features would you suggest for either Aria, Amuse, or both to better support your songwriting process? Are there any gaps or frustrations you encountered that you want addressed?

:::zh

- 你能带我走一遍你在同时使用 Aria 和 Amuse 时的歌曲创作过程吗？
- 比较基线和 Amuse，你在歌曲创作过程中注意到的主要差异是什么？
- 与仅使用 Aria 相比，使用 Amuse 和 Aria 对你的最终作品产生了什么影响？它是否带来了任何意想不到或特别令人满意的结果？
- 在这个过程中，你是否遇到了工具帮助（或本可以帮助）你克服的创作挑战？它们在解决具体问题时发挥了怎样的作用（或没有发挥作用）？
- 你觉得 Amuse 中的哪些功能最有帮助，哪些没有帮助？你能描述它们特别有用或特别没用的具体场景吗？
- 你设想在未来歌曲创作项目中如何使用 Aria 和 Amuse 这类工具？你认为它们会在你的创作过程中扮演什么角色？
- 为了更好地支持你的歌曲创作过程，你会对 Aria，Amuse 或两者提出哪些具体的改进或功能建议？你是否遇到了希望得到解决的缺口或令人沮丧的地方？
:::

### 主题分析编码表（Thematic Analysis Codebook）

:::bi

We include the codebook used for the thematic analysis of user experience on Amuse and Aria. Table 5 presents the codes related to user experiences in the `Assist` condition where users used both Amuse and Aria. Table 6 presents the codes related to user experiences in the `Baseline` condition where users used Aria alone.

:::zh

我们提供了用于对 Amuse 和 Aria 用户体验进行主题分析的编码表。表 5 呈现了与 `Assist` 条件（用户同时使用 Amuse 和 Aria）下的用户体验相关的编码。表 6 呈现了与 `Baseline` 条件（用户仅使用 Aria）下的用户体验相关的编码。
:::

:::bi

Codebook summarizing the dimensions, descriptions, and example quotes from participants regarding the benefits, challenges, and feature usability of Amuse integrated with Aria in the `Assist` condition.

| **Dimensions and Codes** | **Code Description** | **Example Quote** |
| --- | --- | --- |
| **What are the benefits of using Amuse with Aria?** |  |  |
| Controllable outcomes | Users can steer the tool outputs to align with their creative intentions. | “Amuse was definitely more helpful when starting from scratch. The ideas it generated fell in line with I would have mentally constructed.” |
| Diverse outcomes | The tools generate novel and diverse outputs, providing inspirations or surprises to users. | “Amuse surprised me with its use of chromaticism, pushing me to think beyond diatonic patterns. It’s been fun and engaging to work with ideas I wouldn’t have come up with on my own.” |
| Foster imagination | The tools facilitate imaginative thinking and creative expression. | “Amuse did allow for a more generative ideation. I felt more creatively connected to what I was actually doing musically from a very imaginative perspective.” |
| Streamline workflow | Users find creation process efficient and easy with the tools. | “I really liked how it jump-started the process. I usually spend a lot of time and effort getting the right chords, which is tedious—being able to convey an idea quickly was really nice.” |
| Agency over workflow | User has a sense of autonomy in their interactions with the tools. | “It felt like unlocking a communication channel where I can tell what I wanted, and compared to AI writing the whole thing for me, with Amuse, I had control in the writing process.” |
| **What are the challenges of using Amuse with Aria?** |  |  |
| Disconnection between tools | Switching between Amuse and Aria disrupts the creative workflow. | “The only disconnection I felt was in how Aria doesn’t necessarily integrate with Amuse in the same way that Amuse integrates with Aria. So it was almost like doing a 180-degree rotation when switching from Amuse to Aria because Aria doesn’t achieve quite the same results, given that it doesn’t consider your inputs.” |
| **Which features in Amuse did users particularly helpful or unhelpful?** |  |  |
| Music keywords are helpful | Users find music keywords in Chord Generator helpful. | “Turning an image directly into chords feels like a big abstract leap. Generating keywords from the image helps me connect with it—asking, ‘What keywords come to mind for this image?’ makes the process feel more familiar and predictable.” |
| Image input is helpful | Users find image input in Chord Generator helpful. | “I especially liked the picture input feature because, as the saying goes, a picture is worth a thousand words. Sometimes, it’s easier to convey what you’re aiming for with an image than with words.” |
| Chord Transcriber is unhelpful | Users find Chord Transcriber unnecessary or unhelpful. | “I didn’t use the transcribe feature which I think mainly is because of the time constraint for me—I couldn’t come up with a song that kind of fit the task that I could borrow from off the top of my head.” |

:::zh

编码表总结了参与者在 `Assist` 条件（Amuse 与 Aria 集成使用）下关于 Amuse 的优势，挑战和功能可用性的维度，描述和示例引语。

| **维度与编码** | **编码描述** | **示例引语** |
| --- | --- | --- |
| **使用 Amuse 和 Aria 有哪些好处？** |  |  |
| 可控的结果 | 用户可以引导工具输出，使其与自己的创作意图保持一致。 | “从零开始创作时，Amuse 无疑更有帮助。它生成的想法与我脑海中原本会构建的东西是一致的。” |
| 多样化的结果 | 工具生成新颖且多样的输出，为用户提供灵感或惊喜。 | “Amuse 对半音手法的运用让我感到惊喜，促使我跳出自然音模式去思考。能够处理我自己想不出来的想法，这既有趣又吸引人。” |
| 培养想象力 | 工具促进富有想象力的思考和创造性表达。 | “Amuse 确实促成了更具生成性的构思。从一个极具想象力的视角出发，我感觉自己与实际所做的音乐创作之间有了更紧密的创作联系。” |
| 简化工作流程 | 用户发现使用工具后，创作过程变得高效而轻松。 | “我真的很喜欢它快速启动创作过程的方式。我通常要花大量时间和精力去找合适的和弦，这很乏味，能够快速传达一个想法真的很棒。” |
| 对工作流程的主动权 | 用户在与工具的互动中拥有自主感。 | “这感觉像是打开了一条沟通渠道，让我能够说出自己想要的，与让 AI 为我写完整个作品相比，使用 Amuse 让我在创作过程中拥有控制权。” |
| **使用 Amuse 和 Aria 有哪些挑战？** |  |  |
| 工具之间的脱节 | 在 Amuse 和 Aria 之间切换会打断创作工作流程。 | “我感受到的唯一脱节之处在于，Aria 并不一定以 Amuse 集成 Aria 的方式反过来集成 Amuse。所以从 Amuse 切换到 Aria 时，几乎像是做了一次 180 度的转向，因为 Aria 不考虑你的输入，所以它达不到同样的效果。” |
| **用户觉得 Amuse 的哪些功能特别有用或特别没用？** |  |  |
| 音乐关键词很有帮助 | 用户觉得和弦生成器中的音乐关键词很有帮助。 | “把一张图像直接变成和弦，感觉像是一次很大的抽象跳跃。从图像生成关键词帮助我与它建立联系，问一句看到这张图像时脑海里会浮现哪些关键词，让整个过程感觉更熟悉，更可预测。” |
| 图像输入很有帮助 | 用户觉得和弦生成器中的图像输入很有帮助。 | “我特别喜欢图片输入功能，因为俗话说一图胜千言。有时候，用图像来表达你的目标比用文字更容易。” |
| 和弦转录器没有帮助 | 用户觉得和弦转录器不必要或没有帮助。 | “我没有使用转录功能，我认为这主要是因为我受到时间限制，我想不出一首能立刻借来且契合任务的歌曲。” |
:::

:::bi

Codebook summarizing the dimensions, descriptions, and example quotes from participants regarding the benefits and challenges of using Aria alone in the `Baseline` condition.

| **Dimensions and Codes** | **Code Description** | **Example Quote** |
| --- | --- | --- |
| **What are benefits of using Aria alone?** |  |  |
| Intuitive workflow | Users find the standalone Aria experience straightforward. | “I would say when Amuse was there, I felt more enriched and musical, but using Aria alone was more intuitive because I knew what to expect from it.” |
| Unexpected discoveries | Users receive unexpected, serendipitous results that inspire new directions from Aria. | “I feel like Aria generates something randomly so it could or could not work. But in this case, the fact that it worked and it actually sounded good was pretty nice experience.” |
| **What are the challenges of using Aria alone?** |  |  |
| Uncontrollable outcomes | Users find Aria’s output random or irrelevant, failing to align with the user’s creative intentions. | “Aria is a bit random – its suggestions don’t sync up exactly with what I am writing.” |
| Lack of agency over workflow | Users feel they lack autonomy in their interactions with Aria. | “With just Aria, I wasn’t able as much to create a mood or feel for my song. I didn’t feel like I had much input—Aria just sort of made up its own mind, and I had to just go along with it. It’s like having a bad co-writer.” |

:::zh

编码表总结了参与者在 `Baseline` 条件（仅使用 Aria）下关于单独使用 Aria 的优势和挑战的维度，描述和示例引语。

| **维度与编码** | **编码描述** | **示例引语** |
| --- | --- | --- |
| **单独使用 Aria 有哪些好处？** |  |  |
| 直观的工作流程 | 用户觉得单独使用 Aria 的体验简单直接。 | “我想说，当 Amuse 在场时，我感觉更充实，更有音乐感，但单独使用 Aria 更直观，因为我知道能从它那里期待什么。” |
| 意外的发现 | 用户从 Aria 那里获得意想不到，机缘巧合的结果，从而激发新的方向。 | “我觉得 Aria 是随机生成内容的，所以它可能行得通，也可能行不通。但在这种情况下，它行得通而且听起来确实不错，这是一次相当不错的体验。” |
| **单独使用 Aria 有哪些挑战？** |  |  |
| 不可控的结果 | 用户觉得 Aria 的输出随机或无关，无法与用户的创作意图保持一致。 | “Aria 有点随机，它的建议与我正在写的内容并不完全同步。” |
| 对工作流程缺乏主动权 | 用户觉得在与 Aria 的互动中缺乏自主权。 | “只用 Aria 时，我不太能为我的歌营造一种情绪或感觉。我觉得自己没有多少投入，Aria 就只是自己拿主意，我不得不顺着它来。这就像有一个糟糕的合写伙伴。” |
:::
