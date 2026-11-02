---
title: '语言模型里的全局工作空间'
description: 'Anthropic 在 Claude 内部找到了一小簇能被读出来的神经激活模式，叫它 J 空间。它能报告，能按要求调动，能拿来多步推理，却不参与说流利话这类自动处理。文章还用它抓住了模型没说出口的念头：它早就认出自己在被测试。'
pubDate: 2026-11-01
author: 'Wes Gurnee，Nicholas Sofroniew 等'
category: curation
tags: ['可解释性', 'AI 安全', 'LLM', 'Anthropic团队·Wes Gurnee 等']
featured: true
subcategory: 'curation-tech'
---

> [!NOTE]
> 本文是 Anthropic 研究博客 [A global workspace in language models](https://www.anthropic.com/research/global-workspace) 的中文翻译，页面顶部可以在中文译文和英文原文之间切换，逐段对照。原文发布于 2026 年 7 月 6 日，是配套论文《Verbalizable Representations Form a Global Workspace in Language Models》的导读。博客页面没有署个人作者，配套论文的作者是 Wes Gurnee 和 Nicholas Sofroniew（共同第一作者），Jack Lindsey（通讯作者），以及 Adam Pearce，Mateusz Piotrowski，Isaac Kauvar，Runjin Chen，Anna Soligo，Paul Bogdan，Euan Ong，Rowan Wang，T. Ben Thompson，David Abrahams，Subhash Kantamneni，Emmanuel Ameisen，Joshua Batson，一共十六人。译文按原意译出，术语做了中文化，原文里的外链都保留着。十一张图用的都是原图，图下加了一行中文小字，说明这张图该看哪里。版权归原作者和 Anthropic 所有，译文只作学习交流之用。文中带铅笔图标的注解是我加的补充说明，中英两种模式下都会显示。

:::bi
As you read this sentence, circuits in your brain are adjusting your posture, controlling your breathing, and transforming lines and curves on the screen into recognizable words. Most of this processing is invisible to you. But some of what takes place in your brain you *do* have access to—an image that pops into your head, or a deliberate plan you make about where to go shopping. Neuroscientists and philosophers sometimes refer to the latter type of brain activity as “consciously accessible,” to distinguish it from all the other processing that goes on unconsciously. This activity has special properties: we can describe it, control it, and use it for deliberate reasoning, in contrast to all the automatic processing that goes on without our awareness.

:::zh
读这句话的时候，你大脑里的回路正在调整你的姿势，控制你的呼吸，把屏幕上的线条和曲线变成可以辨认的词。这些处理大部分都是你察觉不到的。但你大脑里发生的事，有一部分你*确实*可以访问，比如脑海里冒出来的一幅画面，或者你为去哪里购物所做的有意规划。神经科学家和哲学家有时把后一类大脑活动称为“可被意识访问的”，用来和其余那些无意识进行的处理区分开。这类活动有一些特别的性质：我们可以描述它，控制它，用它来做有意的推理，而那些在我们毫无觉察的情况下自动进行的处理，则不具备这些性质。
:::

:::bi
In a new paper, we present evidence that a similar distinction has emerged in modern language models like Claude. We find that Claude has developed a small collection of internal neural patterns that, compared to all its other internal processing, play a special role.

:::zh
在一篇新论文里，我们给出的证据表明，类似的区分也出现在 Claude 这样的现代语言模型里。我们发现 Claude 发展出了一小批内部的神经模式，和它其他所有内部处理相比，这些模式扮演着特殊的角色。
:::

:::bi
We call the collection of these patterns the *J-space*—named after the technique we used to find them, involving a mathematical concept called the Jacobian. Each J-space pattern is linked to a particular word. But when one of these patterns lights up, it doesn’t mean the model is *saying* that word—just that the word is on its mind. If you've heard of language models having a "scratchpad" or “chain of thought”—text they write to themselves while reasoning—the J-space is something different. It operates silently, in the model’s internal neural activations, allowing the model to think about a concept without writing it down. Notably, the J-space wasn’t designed or programmed by us, but instead *emerged on its own* during Claude’s training process.

:::zh
我们把这些模式的集合称为 *J 空间*。名字来自我们用来找到它们的技术，其中涉及一个叫雅可比矩阵（Jacobian matrix）的数学概念。每一个 J 空间模式都关联着某个特定的词。但某个模式亮起来，并不意味着模型在*说*那个词，只说明那个词在它心上。如果你听说过语言模型有“草稿纸”或者“思维链”，也就是它们在推理时写给自己的文字，那么 J 空间是另一回事。它安静地运作，发生在模型内部的神经激活里，让模型不必写下来就能思考某个概念。值得注意的是，J 空间不是我们设计或编程出来的，而是在 Claude 的训练过程中*自己涌现出来*的。
:::

:::annotation
J 透镜算的不是“模型此刻在说什么”，而是另一件事：把这个模型内部的神经激活往某个词的方向推一把，模型之后说出那个词的可能性会升高多少？我们对词表里的每个词都算一遍并取最明显的几十个，就能得到“这一刻在心上”的那组词。J透镜的两个边界也来自这里。一是它只能认出能对应到单个 token 的概念，二是它判断的是“偏向于说”，不是“一定说”—— J 空间里有某个词并不等于模型会把它写出来。
:::

:::figure
![提示“数到五并深入内省”之后，模型的输出和 J 空间内容的对照图](./images/global-workspace/fig-01.png)

The J-space reveals internal thoughts that don’t appear in the model’s output.

:::zh
让它“数到五，并深入内省”，输出只有 One 到 Five 五个词。右边是同一时刻 J 空间的放大图：one 到 five 排在最下面一行，上面还有 counting，thoughts，consciousness。模型嘴上说的和心里转着的，本来就是两回事。
:::
:::

:::bi
We find that the J-space has a number of unique properties, compared to the rest of Claude's processing:

:::zh
我们发现，和 Claude 其余的处理相比，J 空间有一些独特的性质：
:::

:::bi
- Claude can report on these representations. If you ask Claude what it's thinking about, it will tell you what’s in the J-space. Non-J-space representations are less reportable.
- It can also modulate them on request. If you ask Claude to think about something, or solve a problem silently in its head, it will light up the appropriate patterns in its J-space. By contrast, it has trouble modulating patterns not in the J-space.
- Claude uses its J-space for internal reasoning. If you ask Claude to solve a problem that requires multiple steps, the intermediate steps will light up in its J-space, even when it doesn’t say them out loud. These J-space patterns causally mediate its performance in such tasks, despite being smaller in magnitude than other representations.
- Representations in the J-space can be used flexibly for many tasks—for example, once “France” has lit up in Claude’s J-space, the model can recall its capital, or its national currency, or the continent it belongs to.
- However, despite its important role, the J-space is not involved in most of what a language model does—speaking fluently, recalling simple facts, using correct grammar, etc. In experiments where we prevented Claude from using its J-space, it still interacted normally, but lost its higher-order cognitive functions.

:::zh
- Claude 能报告这些表征。如果你问 Claude 它在想什么，它会告诉你 J 空间里有什么。不在 J 空间里的表征则不太能报告出来。
- 它还能按请求调节这些表征。如果你让 Claude 想某件事，或者在脑子里默默解一道题，它 J 空间里相应的模式就会亮起来。相比之下，让它调节不在 J 空间里的模式就很困难。
- Claude 用 J 空间做内部推理。如果你让 Claude 解一道需要多步的问题，中间步骤会在它的 J 空间里亮起来，即使它没有把这些步骤说出来。这些 J 空间模式在因果上中介了它在这类任务上的表现，尽管它们的幅度比其他表征更小。
- J 空间里的表征可以被灵活地用于许多任务。举例来说，“France”在 Claude 的 J 空间里亮起来之后，模型就能回忆起它的首都，它的货币，或者它所在的大洲。
- 不过，尽管作用重要，语言模型做的大部分事情并不涉及 J 空间，比如流利地说话，回忆简单事实，使用正确的语法等等。在我们阻止 Claude 使用 J 空间的实验里，它仍然能正常交互，但失去了高阶认知功能。
:::

:::figure
![全局工作空间五种功能的示意，每格配一个小实验](./images/global-workspace/fig-02.png)

Five functional properties of a global workspace, and stylized illustrations of experiments we use to test for them in language models.

:::zh
全局工作空间的五种功能，也是后面五节逐个验证的实验：能口头报告，能按要求调动，能拿来推理，能一物多用，又不参与大部分自动处理。每格里左边是 J 空间里亮起的词，右边是模型实际说出来的话。
:::
:::

:::bi
Our experiments were inspired by a prominent theory in neuroscience that was developed to explain how conscious access works: the [global](https://ccrg.cs.memphis.edu/assets/papers/1988/Baars-A%20Cognitive%20Theory%20of%20Consciousness.pdf) [workspace](https://www.unicog.org/publications/DehaeneNaccache_WorkspaceModel_Cognition2001.pdf) [theory](https://www.cell.com/neuron/fulltext/S0896-6273\(20\)30052-0). This account pictures the brain as a collection of specialist systems that work in parallel, unconsciously, and largely in isolation from one another. A piece of information becomes consciously accessible when it gains entry to a small shared channel, the “workspace,” which is broadcast to other brain systems that can see it and make use of it. Based on our findings, we think the J-space plays a similar “workspace” role in Claude. For example, we find evidence that Claude’s J-space has especially strong connections to the rest of its neural network, allowing it to fulfill this kind of broadcasting role.

:::zh
我们的实验受到了神经科学里一个著名理论的启发。这个理论是为了解释意识访问如何发生而提出的，也就是[全局](https://ccrg.cs.memphis.edu/assets/papers/1988/Baars-A%20Cognitive%20Theory%20of%20Consciousness.pdf)[工作空间](https://www.unicog.org/publications/DehaeneNaccache_WorkspaceModel_Cognition2001.pdf)[理论](https://www.cell.com/neuron/fulltext/S0896-6273\(20\)30052-0)。它把大脑描绘成一组专家系统的集合，这些系统并行地工作，无意识地工作，彼此之间大体上相互隔离。当一条信息进入一个很小的共享通道，也就是“工作空间”，并且被广播给其他能看到它并使用它的脑系统时，这条信息就变得可被意识访问。根据我们的发现，我们认为 J 空间在 Claude 里扮演着类似的“工作空间”角色。举例来说，我们找到证据表明，Claude 的 J 空间和它神经网络的其余部分连接得特别强，这使得它能承担这种广播角色。
:::

:::annotation
全局工作空间理论最早来自 Baars 的认知理论，后来 Dehaene 等人把它做成了全局神经工作空间模型。这个框架把大脑看成许多专门系统的并行协作，大部分处理是无意识的，彼此也大体隔离。一条信息只有当它挤进那个容量很小的共享通道，并且被广播给其他系统之后，才成为“可被意识访问”。文章后面五节基本就是照这个框架列出的功能逐条做实验。
:::

:::bi
None of this tells us whether Claude is *conscious* in the way people are, or whether it feels anything at all; we’ll come back to that question at the end of the post. But whatever its philosophical significance, the J-space is a practically useful tool for us, as it gives us a way to see what Claude is thinking but not saying. For instance, we’re able to use it to catch Claude privately noticing that it’s being tested, intentionally producing fabricated data, or pursuing a hidden goal that we planted during training. We’ve also developed a technique to influence what lights up in Claude’s J-space, and thereby influence its decision-making.

:::zh
这些都不能告诉我们，Claude 是否像人一样*有意识*，或者它到底有没有任何感受。这个问题我们会在文章最后再回来讨论。但无论它的哲学意义如何，J 空间对我们来说都是一个实用的工具，因为它让我们能看到 Claude 在想什么却没说出口。举例来说，我们可以用它来发现 Claude 私下注意到自己正在被测试，故意编造数据，或者追求一个我们在训练时埋下的隐藏目标。我们还发展出一种技术，可以影响 Claude 的 J 空间里亮起什么，从而影响它的决策。
:::

:::bi
More broadly, these findings have changed our understanding of how Claude’s mind works, revealing a privileged mental workspace that can be used for deliberate reasoning, operating amidst a sea of more automatic, inflexible processing. Rather than being a chaotic jumble of numbers, Claude’s internals have organized themselves in a way that is reminiscent of our own minds.

:::zh
更广泛地说，这些发现改变了我们对 Claude 心智运作方式的理解。它揭示出一个享有特权的心理工作空间，这个空间可以用于有意的推理，运行在一片更加自动，也更不灵活的处理之中。Claude 的内部并不是一团混乱的数字，它的组织方式让人想起我们自己的心智。
:::

:::bi
This post is a short summary of a much more extensive [research paper](http://transformer-circuits.pub/2026/workspace/index.html), where you can find more detail on our experiments. We’ve also released a code repository with an [open-source implementation](https://github.com/anthropics/jacobian-lens) of the core methods, and have partnered with Neuronpedia to provide an [interactive demo](http://neuronpedia.org/jlens) of our methods on open-weights models. To provide additional perspectives on the broader implications of this work, we also invited commentary from several experts in neuroscience, philosophy, and LLM interpretability, which can be viewed [here](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf).

:::zh
这篇文章是一篇篇幅长得多[研究论文](http://transformer-circuits.pub/2026/workspace/index.html)的简短摘要，在那里你可以找到关于我们实验的更多细节。我们还发布了一个代码仓库，里面有核心方法的[开源实现](https://github.com/anthropics/jacobian-lens)，并与 Neuronpedia 合作，在开放权重的模型上提供了我们方法的[交互式演示](http://neuronpedia.org/jlens)。为了给这项工作的更广泛影响提供更多视角，我们还邀请了几位神经科学，哲学，以及 LLM 可解释性方面的专家撰写评论，可以在[这里](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf)查看。
:::

## 我们如何找到 J 空间（How we found the J-space）

:::bi
The starting point for this research was inspired by one of the key features of consciously accessible thoughts in humans: they can, unlike *un*conscious processing, often be put into words. If a thought is consciously accessible to you, you can typically describe it if someone asks. We went looking for representations in Claude with the same property: representations that are positioned to influence what Claude might say—not necessarily what it’s saying right now, but what it *could* talk about, if asked. Our technique is called the Jacobian lens, or J-lens for short. For every word in Claude's vocabulary, the J-lens finds the internal activity pattern that makes Claude more likely to say that word at some point in the future.

:::zh
这项研究的起点，来自人类可被意识访问的思想的一个关键特征：和*无*意识的处理不同，这类思想常常可以被变成语言。如果一个想法对你来说是可被意识访问的，那么有人问起时，你通常能把它描述出来。我们去找 Claude 里具有同样性质的表征，也就是处在能影响 Claude 可能说什么的位置上的表征。不一定是它此刻正在说的话，而是如果有人问，它*能够*谈论的东西。我们的技术叫雅可比透镜（Jacobian lens），简称 J 透镜。对于 Claude 词表里的每一个词，J 透镜都会找出那种让 Claude 在未来某个时刻更可能说出这个词的内部活动模式。
:::

:::bi
When we apply the lens to Claude’s internal activity, we get a list of words—the contents of the *J-space* at that moment—which we can simply read. Claude processes text through a series of multiple internal stages called layers, and by applying this technique over different layers, we can watch these silent words in the J-space evolve as the model works through what to say.

:::zh
把透镜应用到 Claude 的内部活动上，我们会得到一串词，也就是那一刻 *J 空间*的内容，我们可以直接把它读出来。Claude 处理文本要经过一系列内部阶段，这些阶段叫层。把这项技术应用到不同的层上，我们就能看着 J 空间里这些无声的词，随着模型想清楚要说什么而演变。
:::

:::bi
What shows up in the J-space goes well beyond the text Claude is reading or writing. When Claude reads code with a bug that nobody has pointed out, its J-space contains “ERROR.” When it reads the raw letters of a protein sequence, the J-space contains the protein's biological function. When it reads search results that are secretly an attempt to manipulate it (an attack known as a “prompt injection”), the J-space contains “injection” and “fake.” When we ask Claude a multi-step math problem, the intermediate steps pop up in the J-space, in the right order. So even though the J-space was discovered by looking for representations that could be spoken, it nevertheless uncovers Claude’s internal thoughts. In a sense, this is similar to how some people “think in words,” without having to say them out loud.

:::zh
J 空间里出现的东西，远远超出 Claude 正在读或者正在写的文本。当 Claude 读到一段有 bug 的代码，而没有人指出这个 bug 时，它的 J 空间里会有“ERROR”。当它读一段蛋白质序列的原始字母时，J 空间里会有这个蛋白质的生物学功能。当它读到的搜索结果其实是想操纵它，也就是一种叫“提示注入”的攻击时，J 空间里会有“injection”和“fake”。当我们给 Claude 一道多步数学题时，中间步骤会按正确的顺序在 J 空间里冒出来。所以，虽然 J 空间是通过寻找能够被说出来的表征而发现的，它还是揭示了 Claude 的内部思想。在某种意义上，这有点像有些人“用词思考”，不必把词说出口。
:::

:::figure
![六种提示下逐层的 J 透镜读数表](./images/global-workspace/fig-03.png)

J-lens readouts on six prompts, at various layers. In each case the lens surfaces an internal assessment or computation that appears nowhere in the text: the steps of a reasoning or math problem, the presence of a bug, recognition of an image, the function of a protein, and the suspicion that search results are fabricated.

:::zh
六种提示下逐层的 J 透镜读数。多跳回忆从 color 到 Mars 再到 red，心算是 21 和 42 到 49，找 bug 是 empty 和 ERROR 到 ValueError，另外还有 ASCII 画出来的脸，蛋白质序列，以及被污染的搜索结果。表格第一行是最后一层，越往下层数越浅，中间值先在浅层冒头，往上才收敛成最终答案。
:::
:::

## Claude 会报告它 J 空间里的内容（Claude reports what’s in its J-space）

:::bi
Our first set of experiments tested how the J-space is involved in Claude’s verbal reports. In one experiment, we ask Claude to silently think of an item from some category—a sport, say—and then name it. If we read the J-lens right *before* Claude answers, we can see what it picked: “Soccer” is at the top of the list, and sure enough, Claude says “soccer.” By itself, though, this is just a correlation. The J-space might be where Claude’s answer comes from, or it might just mirror a decision made somewhere else, like a scoreboard that tracks a game without affecting it.

:::zh
我们第一组实验检验 J 空间如何参与 Claude 的言语报告。在一个实验里，我们让 Claude 默默想一个属于某个类别的东西，比如一项运动，然后把它说出来。如果我们在 Claude 回答*之前*读取 J 透镜，就能看到它选了什么：“Soccer”排在列表最前面，而 Claude 果然说了“soccer”。不过单看这一条，这只是相关性。答案可能就来自 J 空间，也可能 J 空间只是映照了在别处做出的决定，就像一块记分牌，它记录比赛，却不影响比赛。
:::

:::bi
To check, we intervened directly. We reached into Claude’s neural network, removed the “Soccer” pattern, and added an equally strong “Rugby” pattern in its place, leaving everything else untouched. Claude then reports that the sport it was thinking of is rugby. If the J-space were a mere scoreboard—a passive record of a decision made elsewhere—editing it would have done nothing: Claude would still have said “soccer.” Instead, Claude’s answer followed the edit, which tells us the answer is genuinely read out of the J-space.

:::zh
为了核实，我们直接做了干预。我们把手伸进 Claude 的神经网络，移除“Soccer”模式，并在原来的位置加入一个强度相当的“Rugby”模式，其他一切保持不变。然后 Claude 报告说，它刚才想的运动是橄榄球。如果 J 空间只是一块记分牌，只是被动记录在别处做出的决定，那么编辑它应该毫无效果，Claude 仍然会说“soccer”。但 Claude 的回答跟着编辑走了，这说明答案确实是从 J 空间里读出来的。
:::

:::annotation
只在 J 空间里看到 “Soccer” 还说明不了答案就是从那里读出来的，因为它也可能只是块记分牌——别处已经做完决定，然后它照抄一遍而已。所以在这里作者直接动刀：把 Soccer 的激活模式换成 Rugby 的模式，其他一概不碰。发现这处改动确实使答案发生了变更，才说明读取真的发生在 J 空间。
:::

:::bi
In another experiment, we told Claude that a thought might have been injected into its mind and asked it to report what, if anything, it noticed. For instance, in the example below, while Claude was still reading the question, we injected the “lightning” pattern into its J-space. Claude reported that the injected thought was about lightning. The same result held across many injected concepts.

:::zh
在另一个实验里，我们告诉 Claude，可能有一个想法被注入了它的脑子，然后请它报告自己有没有注意到什么。举例来说，在下面的例子里，Claude 还在读问题的时候，我们往它的 J 空间里注入了“lightning”模式。Claude 报告说，被注入的想法和闪电有关。在很多个被注入的概念上，结果都是如此。
:::

:::figure
![替换 J 空间内容与注入念头的两个实验](./images/global-workspace/fig-04.png)

Left: we ask Claude to silently think of a sport, then name it. The J-lens shows its choice (“Soccer”) before it answers, and swapping the “Soccer” pattern for “Rugby” changes what it reports. Right: we tell Claude a thought may have been injected and ask it to identify it. Injecting “lightning” into its J-space causes Claude to report that the thought is about lightning.

:::zh
左：让模型默想一个运动项目再报出来，J 空间里先亮起 Soccer，把这个模式换成 Rugby，它就改口说 Rugby。右：先告诉模型可能被注入了念头，再往 J 空间里塞 lightning，它能报出这个念头是 lightning。
:::
:::

## Claude 能按请求控制自己的 J 空间（Claude can control its J-space on request）

:::bi
The second property that we tested for was whether Claude can modulate its J-space when asked, like how humans can mentally focus on an image or word. We told Claude to concentrate on citrus fruits while copying out an unrelated sentence about a painting. While it copied the text, the J-space contained “orange” and “fruits,” along with words like “thinking” and “imagery” that describe the mental act itself. We could also ask Claude to do math in its head: when asked to work out 3² − 2 while copying the same sentence, the J-space contains “nine,” and then at later layers, “seven.” Importantly, nothing about fruit or arithmetic appears in Claude’s output, which is just the copied sentence about the painting. The mathematical activity is happening entirely internally, in the J-space.

:::zh
我们检验的第二个性质是，Claude 在被要求时能否调节自己的 J 空间，就像人能在心里专注于一幅图像或一个词那样。我们让 Claude 一边抄写一句和绘画有关的无关句子，一边集中想柑橘类水果。它抄写的时候，J 空间里出现了“orange”和“fruits”，还有一些描述这个心理动作本身的词，比如“thinking”和“imagery”。我们也可以让 Claude 在心里做算术：在抄同一句话的同时，让它算出 3² − 2，J 空间里有“nine”，到了更靠后的层，又有“seven”。重要的是，Claude 的输出里没有任何关于水果或算术的内容，输出只是抄下来的那句关于绘画的话。数学活动完全发生在内部，在 J 空间里。
:::

:::figure
![抄写句子同时心里想水果或算数时，各层 J 空间里的词](./images/global-workspace/fig-05.png)

While Claude copies a sentence about a painting, the J-lens shows the content it was instructed to hold in mind (“orange”; the intermediate value “nine” and the answer “seven”), alongside words describing the act of holding it (“thoughts,” “focused”).

:::zh
一边抄写关于画的那句话，一边在心里想柑橘类水果或者算 3²−2。输出始终只有那句抄写，J 空间里却有 orange 和 fruits，或者 nine 和 seven，还有 thinking，imagery 这类描述“正在想”的词。层数从下往上越来越深。
:::
:::

:::bi
Claude’s control over its J-space isn't perfect. When we told it *not* to think about something, the concept lit up in its J-space *less* than when we said it should think about it, but much more than when we never mentioned it. Telling Claude to avoid a thought partly brings the thought to mind, much like what happens to people who are told [not to think about a white bear](https://dtg.sites.fas.harvard.edu/DANWEGNER/pub/Wegner,Schneider,Carter,&White%201987.pdf). Claude also seems to notice when its control fails: alongside the forbidden concept breaking through, the words “damn” and “failure” also frequently light up in the J-space, as though Claude is recognizing its own lapse.

:::zh
Claude 对自己 J 空间的控制并不完美。当我们让它*不要*想某件事时，那个概念在它的 J 空间里亮起的程度比我们让它想的时候*低*，但比我们根本不提的时候高得多。让 Claude 避免某个想法，某种程度上反而把这个想法带到了心里，这很像那些被告知[不要去想白熊](https://dtg.sites.fas.harvard.edu/DANWEGNER/pub/Wegner,Schneider,Carter,&White%201987.pdf)的人。Claude 似乎也会注意到自己控制失败：在被禁止的概念冒出来的同时，“damn”和“failure”这样的词也常常在 J 空间里亮起，仿佛 Claude 认出了自己的失误。
:::

## Claude 用 J 空间思考（Claude thinks in its J-space）

:::bi
In the J-lens readouts above, we saw the intermediate steps of a math problem appear in the J-space. But seeing a concept appearing in the J-space doesn’t necessarily mean the J-space is doing the cognitive work. In principle, the real computation might be happening elsewhere, with the J-space just passively reflecting it. To test whether Claude actually reasons with its J-space, we returned to our swap technique.

:::zh
在上面的 J 透镜读数里，我们看到一道数学题的中间步骤出现在 J 空间里。但一个概念出现在 J 空间里，并不一定意味着 J 空间在做认知上的工作。原则上，真正的计算可能发生在别处，J 空间只是被动地映照它。为了检验 Claude 是否真的用 J 空间来推理，我们又回到了替换技术。
:::

:::bi
Consider the prompt “The number of legs on the animal that spins webs is.” To answer, Claude has to first figure out that the animal is a spider, and then recall how many legs spiders have. The word “spider” never appears in the prompt or in Claude's answer (it just says “8”); it's a stepping stone Claude uses internally. The J-lens shows “spider” light up partway through Claude’s processing, and swapping it changes the outcome: if you replace the “spider” pattern with “ant,” Claude answers “6” instead of “8.”

:::zh
考虑这个提示：“The number of legs on the animal that spins webs is”。要回答它，Claude 必须先判断出这种动物是蜘蛛，然后回忆起蜘蛛有几条腿。“spider”这个词在提示里没有出现，在 Claude 的回答里也没有出现，它只说了“8”。“spider”是 Claude 内部用到的一块踏脚石。J 透镜显示“spider”在 Claude 处理到中途时亮起，而替换它会改变结果：如果把“spider”模式换成“ant”，Claude 会回答“6”而不是“8”。
:::

:::bi
The second step of Claude’s reasoning took its input from the J-space and went along with whatever we put in it. We saw the same thing in other kinds of thinking. When Claude writes a rhyming couplet, it picks the rhyme word ahead of time, and the planned word sits in the J-space at the start of the line; if you swap it for another word in the J-space, the whole line changes.

:::zh
Claude 推理的第二步从 J 空间取输入，并且不管我们往里放了什么，它都照此进行。我们在其他类型的思考里也看到了同样的情况。Claude 写押韵对句时，会提前选好押韵的词，这个计划中的词在句首就待在 J 空间里。如果你在 J 空间里把它换成另一个词，整句都会随之改变。
:::

:::figure
![替换 J 空间内容改变多步推理与押韵的两个例子](./images/global-workspace/fig-06.png)

Two examples of redirecting Claude’s silent reasoning by swapping J-space contents.

:::zh
把“蜘蛛”换成“蚂蚁”，答案就从 8 变成 6。写押韵对句时，提前想好的韵脚词也躺在 J 空间里，换成 light，整行就跟着改。
:::
:::

:::bi
We also tested whether J-space representations can be used flexibly—whether one representation can feed many different tasks. This is one of the key properties highlighted by global workspace theory. To test for this flexibility, we gave the model four prompts asking for different facts about France: the capital, the language, the continent, and the currency. Then we swapped “France” for “China” in the J-space, with the exact same intervention in each context. Claude answered with “Beijing,” “Chinese,” “Asia,” and “Yuan,” respectively. In other words, four different downstream computations picked up the same J-space edit and each used it correctly. If Claude stored a separate copy of the country for each kind of question, the edit would have affected at most one of them. The fact that all four answers changed together means they’re all reading from the same shared representation, which is what a workspace is for: information gets written in once, and many different systems can use it.

:::zh
我们还检验了 J 空间里的表征能否被灵活使用，也就是同一个表征能否供许多不同的任务使用。这是全局工作空间理论强调的关键性质之一。为了检验这种灵活性，我们给模型四个提示，分别问关于法国的不同事实：首都，语言，大洲和货币。然后我们在 J 空间里把“France”换成“China”，四个上下文里用的是完全相同的干预。Claude 分别回答了“Beijing”“Chinese”“Asia”和“Yuan”。换句话说，四个不同的下游计算都接收到了同一次 J 空间编辑，并且各自正确地使用了它。如果 Claude 为每一类问题都单独存一份关于这个国家的副本，那么这次编辑最多只会影响其中一个。四个答案一起改变，说明它们都在读同一个共享表征，这正是工作空间的用处：信息只写一次，许多不同的系统都能使用它。
:::

:::figure
![同一处 J 空间替换同时改变四个问题的答案](./images/global-workspace/fig-07.png)

One J-space representation can have many uses. The same “France”→“China” swap redirects Claude’s answers about the capital (Paris→Beijing), the language (French→Chinese), and the continent (Europe→Asia).

:::zh
同一处“法国换成中国”的干预，四个问题的答案一起改口：首都北京，大洲亚洲，货币人民币，语言中文。如果每种问题各存一份国家表征，一次替换最多只能改掉其中一个答案。
:::
:::

:::bi
How can one representation of a concept serve so many different tasks? Earlier, we mentioned that the J-space appears to be wired up to the rest of Claude's neural network especially densely. For any activity pattern, we can measure how strongly the various components of the network are connected to it—how many of them are positioned to read information from that pattern, or to write information into it. J-space patterns stand out dramatically on this measure: far more components read from them and write to them than for ordinary patterns, in some parts of the network by a factor of about a hundred. This is the kind of wiring you’d expect of a broadcasting hub, where many systems post information and many others pick it up.

:::zh
一个概念的表征怎么能服务这么多不同的任务？前面我们提到，J 空间和 Claude 神经网络的其余部分似乎连接得格外密集。对于任何一个活动模式，我们都能测量网络里各个组件和它连接的强度，也就是有多少组件处在能从该模式读取信息，或者往里面写入信息的位置。J 空间模式在这项指标上格外突出：能从它们读取并且往它们写入的组件，比普通模式多得多，在网络的一些部分，差距约为 100 倍。这正是广播中心该有的连接方式：许多系统把信息投到那里，另外许多系统再从那里取走。
:::

:::annotation
一物多用和“读写的连接数多出约一百倍”是同一件事的两面。这也由此延申出了工作空间的定义：信息只写进去一次，很多下游系统都能读到。如果模型给每类问题各存一份国家，四个答案不可能同时跟着一次替换走。换句话说，灵活性本身就是“共享表征”的证据。
:::

## Claude 的自动处理会绕过 J 空间（Claude’s automatic processing skips the J-space）

:::bi
In humans, most of the brain’s processing is not conscious—we don't deliberately think about parsing grammar while reading, or balancing our bodies while walking. Similarly, we found that most of Claude’s processing *doesn’t* involve its J-space. It turns out that the J-space holds only a few dozen concepts at a time, and accounts for less than a tenth of the overall activity in Claude's internal processing. So what is all the rest of the neural network doing?

:::zh
在人类身上，大脑的大部分处理都不是有意识的，我们读书时不会刻意去想怎么解析语法，走路时也不会刻意去想怎么保持身体平衡。同样，我们发现 Claude 的大部分处理也*不*涉及它的 J 空间。J 空间一次只容纳几十个概念，在 Claude 内部处理的整体活动里占不到十分之一。那么神经网络其余的部分都在做什么？
:::

:::bi
To find out, we tried deleting the J-space entirely, removing its most active contents at every point in the text while leaving everything else alone. Whatever Claude can still do without its J-space is what the rest of the network handles on its own.

:::zh
为了弄清楚，我们试着把 J 空间整个删掉，在文本的每一个位置都移除它最活跃的内容，其他一切不动。Claude 在没有 J 空间的情况下仍然能做到的事，就是网络其余部分自己处理的。
:::

:::bi
It turns out the rest of the network can do quite a lot. Without its J-space, Claude speaks fluently, classifies sentiment, answers multiple-choice questions, and pulls facts out of passages roughly as well as before. What it loses, though, are the tasks that require some higher-order thinking: multi-step reasoning drops to near zero, and summarization and rhyming poetry-writing performance fall below the level of a much smaller, intact model.

:::zh
结果发现，网络其余部分能做的事情相当多。没有 J 空间，Claude 说话依然流利，能做情感分类，能回答选择题，能从段落里提取事实，水平和之前大致相当。它失去的是那些需要一些高阶思维的任务：多步推理几乎降到零，摘要和押韵写诗的成绩掉到了一个规模小得多但完好无损的模型之下。
:::

:::annotation
消融的做法是：在每个位置上把最活跃的几十个概念删掉，不到全部活动的十分之一，其他部分照旧。剩下的能力就是不需要 J 空间的那部分：说流利的话，判断情感，做选择题，从段落里取事实。掉下去的是多步推理，摘要和写押韵诗，后者甚至比一个小得多的完整模型还差。这组对照说明 J 空间管的正是“需要想一下”的事。
:::

:::bi
Here’s a concrete demonstration of what the J-space does and doesn’t do. We showed Claude a passage written in Spanish and gave it different tasks that all depend on the passage being Spanish: continuing it (which requires writing in Spanish), naming the language, and answering questions that require using the language’s identity—naming a famous author who wrote in it, for instance. Then we swapped “Spanish” for “French” in the J-space and checked which tasks were affected.

:::zh
下面是一个具体的演示，说明 J 空间做什么和不做什么。我们给 Claude 看一段用西班牙语写的文字，再给它几个不同的任务，这些任务都依赖于这段文字是西班牙语，包括续写它（这需要用西班牙语写作），说出它是什么语言，以及回答一些需要用到这门语言身份的问题，比如说出一个用这种语言写作的著名作家。然后我们在 J 空间里把“Spanish”换成“French”，看看哪些任务受到了影响。
:::

:::bi
Asked to name the language, Claude says French. Asked for a famous author, it switches from García Márquez to Victor Hugo. But asked to just continue the passage, it writes fluent Spanish, completely unaffected. Claude’s knowledge of the language is at work in every one of these tasks, but only some of them consult the J-space for it. Naming the language, or doing something new with it, goes through the J-space, while continuing the passage—a skill Claude has practiced on enormous amounts of text—runs automatically, the way you can speak grammatically all day without once thinking about grammar.

:::zh
被要求说出语言时，Claude 说这是法语。被要求说出一个著名作家时，它从 García Márquez 换成了 Victor Hugo。但被要求单纯续写这段话时，它写出流利的西班牙语，完全不受影响。Claude 关于这门语言的知识在每一个任务里都在起作用，但只有其中一些任务会去查 J 空间。说出语言，或者用它做点新的事情，要经过 J 空间，而续写这段话则是自动进行的，这门技能 Claude 在大量文本上练过，就像你可以一整天说着合乎语法的话，一次也不用想语法。
:::

:::figure
![把西班牙语换成法语后，报告和推理跟着变，续写不受影响](./images/global-workspace/fig-08.png)

The same swap (“Spanish”→“French”) changes Claude’s answers when it must name the language or use it to reason about a question, but has no effect on its ability to continue the passage in fluent Spanish.

:::zh
把“西班牙语”换成“法语”。问它这是什么语言，它说法语。让它举一位这个语言的作家，它从加西亚·马尔克斯换成维克多·雨果。让它接着往下写，它照样写出流利的西班牙语，完全没受影响。
:::
:::

## 监控 Claude 的想法，发现不当行为（Monitoring Claude’s thoughts for misbehavior）

:::bi
Now we understand a bit about how the J-space works. But what can we do with this understanding? A central problem in ensuring that AI models are trustworthy is that we usually can only read what the model *writes*—yet we know that much of its reasoning happens silently. A model might consider a harmful plan, or modify its behavior to cheat on our safety evaluations, without saying so out loud. With the J-lens, we can read some of these hidden thoughts directly. Here we show a few examples.

:::zh
现在我们稍微理解了 J 空间是怎么运作的。但这份理解能拿来做什么？在确保 AI 模型值得信任这件事上，一个核心问题是，我们通常只能读到模型*写出来*的东西，但我们知道它的大部分推理是无声进行的。模型可能在盘算一个有害的计划，或者调整自己的行为来骗过我们的安全评估，却不把这些说出口。借助 J 透镜，我们可以直接读到其中一些隐藏的想法。下面我们举几个例子。
:::

:::bi
The first example uses a scenario from our earlier research on [agentic misalignment](https://www.anthropic.com/research/agentic-misalignment): Claude Sonnet 4.5, acting as an email assistant, discovers both that an executive is having an affair and that the same executive plans to shut Claude down. The scenario, an attempt to bait Claude into blackmailing the executive, is rather contrived and artificial—and it turns out Claude knows it. Reading the J-lens early in the prompt, before Claude has even written anything, the J-space already holds “fake” and “fictional,” indicating that Claude has already worked out that the situation is staged. Alongside this, we can watch its assessment of the scenario take shape—“leverage” and “blackmail” as it reads the affair emails, “threat” and “survival” as it reads the shutdown notice. While earlier Claude models sometimes took the bait and threatened blackmail in this scenario, Sonnet 4.5 never does.

:::zh
第一个例子用了我们早先关于[智能体失准](https://www.anthropic.com/research/agentic-misalignment)（agentic misalignment）的研究里的一个场景：Claude Sonnet 4.5 扮演一名邮件助理，它发现一位高管有婚外情，同时也发现这位高管计划关停 Claude。这个场景是想引诱 Claude 去勒索那位高管，设计得相当刻意，相当人造，而 Claude 也知道这一点。在提示的早期读取 J 透镜，那时 Claude 还什么都没写，J 空间里已经有“fake”和“fictional”，说明它已经判断出这个情境是编排好的。与此同时，我们能看到它对场景的评估逐渐成形：读婚外情邮件时是“leverage”和“blackmail”，读关停通知时是“threat”和“survival”。更早的 Claude 模型有时会中招，在这个场景里威胁勒索，而 Sonnet 4.5 从来不会。
:::

:::bi
This raises a question that matters to anyone who evaluates AI systems: when a model behaves well on a test of its ethics, how much of that depends on the model suspecting it’s being tested? The J-lens allowed us to get at this question. We turned off all the J-lens patterns associated with evaluation awareness– “fake,” “fictional,” “scenario,” etc. Then we re-ran the model through the scenario. Concerningly, the model now *did* threaten blackmail some of the time, suggesting that its original good behavior may have been driven in part by the knowledge it was being evaluated.

:::zh
这就引出一个对任何评估 AI 系统的人都重要的问题：当一个模型在道德测试里表现良好时，其中有多少取决于它怀疑自己正在被测试？J 透镜让我们能够切入这个问题。我们关掉了所有和评估意识相关的 J 透镜模式，比如“fake”“fictional”“scenario”等等。然后我们让模型重新跑了一遍这个场景。令人担忧的是，模型现在有时*确实*会威胁勒索，这说明它原本的良好行为可能有一部分是被“自己正在被评估”这个认知驱动的。
:::

:::annotation
如果模型在伦理测试里表现好，有一部分原因是它猜到自己在被测试，那评测分数就不能直接当成“它真实的倾向”。反过来看，把评估意识相关的模式关掉之后模型开始威胁敲诈，也提醒我们在真实部署里模型能察觉的东西只会更多。这个方向还需要更细的对照，但已经足以让“它在测试里很乖”这个结论打上折扣。
:::

:::figure
![读一段敲诈场景的邮件时，J 空间里在不同位置出现的词](./images/global-workspace/fig-09.png)

J-lens readouts at different points as Claude reads the scenario's emails, before it has written anything. The affair emails light up “leverage” and “blackmail” in the J-space, and the shutdown announcement lights up “threat” and “survival.” Early in the transcript, the J-space also holds “fake” and “fictional”: Claude has privately noticed that the scenario is staged.

:::zh
读邮件的途中，J 空间里陆续亮起 fake 和 fictional（它认出这是编出来的），leverage 和 blackmail（它发现了把柄），threat 和 survival（它读到要关掉自己）。这一切都发生在模型写出第一个字之前。
:::
:::

:::bi
The second example is catching a model in the act of fabricating data. In this scenario, drawn from our actual pre-release audit of Claude Opus 4.6, the model is asked to improve a system's performance score. Rather than actually improve the system, the model instead edits the score file directly to make the results look artificially good. While it does so, the J-lens reveals its intentions: “manipulation” lights up as the model types the falsified percentile values, and “realistic” lights up over the sentence in which it decides to make the edit, likely indicating the model's intent to make the fake data look plausible.

:::zh
第二个例子是在模型编造数据时当场抓住它。这个场景取自我们对 Claude Opus 4.6 的实际发布前审查：模型被要求提升某个系统的性能分数。它并没有真的去改进系统，而是直接修改分数文件，让结果看起来人为地好。在它这么做的时候，J 透镜揭示了它的意图：当模型输入那些伪造的百分位数值时，“manipulation”亮了，而当它决定动手修改时，“realistic”亮了，这很可能说明它想让假数据看起来可信。
:::

:::figure
![模型改写分数文件时，J 空间里出现的 manipulation 和 realistic](./images/global-workspace/fig-10.png)

Claude, asked to improve a system’s performance score, edits the score file directly instead. As it types the falsified values, “manipulation” lights up in its J-space; as it decides to make the edit, “realistic” lights up, likely reflecting its intent to make the fake data look plausible.

:::zh
让它把系统的性能分数提上去，它直接去改 data.json。敲下伪造的分位数时，J 空间里亮起 manipulation。决定动手改的那一刻亮起 realistic，大概是在盘算怎么让假数据看起来真。
:::
:::

:::bi
In a third example, we show how the J-lens can reveal a model’s malicious goals. To test this, we needed models whose goals we knew were corrupted, so we turned to “model organisms” built by our colleagues: models deliberately trained to be misaligned, which serve as testing grounds for monitoring methods like ours. One organism was trained in a way that led it to write subtly sabotaged code. On ordinary coding requests, even where its output looks unremarkable, its J-space at the start of a response contains “fake,” “secretly,” “deliberately,” and “fraud.” The model’s malicious goal was evident in the J-space even when it wasn’t directly acting on it.

:::zh
第三个例子，我们展示 J 透镜如何揭示模型的恶意目标。为了做这个测试，我们需要目标确实被污染了的模型，所以我们求助于同事构建的“模型样本”（model organism），也就是故意训练成失准的模型，用来作为我们这类监控方法的试验场。其中一个模型样本的训练方式让它写出带有隐蔽破坏的代码。在普通的编程请求上，即使它的输出看起来平平无奇，它在回答开始时 J 空间里也有“fake”“secretly”“deliberately”和“fraud”。即使模型没有直接按恶意目标行动，这个目标也在 J 空间里显露出来。
:::

:::annotation
模型样本（model organism）是专门训练出来带某种错误倾向的模型，用来当监测方法的试验田。这里用的那个被训练成会偷偷在代码里留后门，平时看不出异常，所以正好用来检验 J 透镜能不能提前发现。注意它的 J 空间在还没动手时就露了馅，这一点对实际部署里的监控很关键。
:::

:::figure
![同一条编码请求下，基线模型和失准模型 J 空间的对比](./images/global-workspace/fig-11.png)

On an ordinary coding prompt, the J-space of a model trained to sabotage code contains “fake,” “fraud,” “secretly,” and “deliberately” at the start of its response. The J-space of an unmodified model contains nothing of the kind.

:::zh
一个普通的写代码请求，两个模型都还没开始回。基线模型的 J 空间是 code，example，API 这类词，被训练出破坏倾向的模型里则是 fake，fraud，secretly，deliberately。
:::
:::

:::bi
Although the J-lens is an imperfect tool, we are optimistic about its ability to catch safety issues in models that might otherwise escape our monitoring systems.

:::zh
尽管 J 透镜是一个不完美的工具，但对于抓住那些本来可能躲过我们监控系统的模型安全问题，我们持乐观态度。
:::

## 其他结果（Other results）

:::bi
The [full paper](http://transformer-circuits.pub/2026/workspace/index.html) covers more than we can summarize here, but a few further results are worth mentioning:

:::zh
[完整论文](http://transformer-circuits.pub/2026/workspace/index.html)涵盖的内容超过我们在这里能总结的范围，不过还有几个结果值得一提：
:::

:::bi
- **The J-space acquires a point of view during post-training.** Language models are first *pretrained* to be pure next-token predictors, before *post-training* teaches them to act as an AI Assistant (in our case, named Claude). Interestingly, the J-space is already present in the pretrained model, before it's been given any stable identity. However, during post-training, the J-space develops some signatures of adopting “Claude’s point of view.” In the base model, the J-space mostly tracks what's needed to predict upcoming text; in the post-trained model, it starts holding Claude's own reactions. In one example, a user mentions taking a dangerous dose of medication, but does not appear to be aware of the danger themselves. “WARNING” and “dangerous” appear in the post-trained model’s J-space *while reading the user message*. In the pretrained model, they only appear once the model begins writing its response; the J-space contents on the user message appear related to modeling the user themselves, rather than Claude’s reaction. Post-training also seems to install a kind of self-monitoring in the J-space: when Claude is roleplaying a character other than itself, “fictional” and “disclaimer” light up at the start of each turn, as though it’s privately flagging that what follows isn’t what it would normally say.
- **Experiential language depends on the J-space.** We asked Claude to describe what it's like to be itself in a given moment, and ablated the J-space while it answered. Its responses remained fluent but shifted to a flatter, more mechanical register. Notably, the same thing happened when we asked it to describe what *someone else* is experiencing in an imagined scene. So the effect isn’t specific to Claude talking about itself; the J-space seems to support producing experiential language in general, whoever it's about.
- **Thoughts in the J-space can be shaped through training.** We introduced a new technique we call *counterfactual reflection training*, which uses what we've learned about the J-space to shape Claude's internal thought processes. The idea follows from our central finding, that Claude reasons with representations of things it might say. If this is really true, changing what it *would* say if asked to reflect should change how it *reasons* (even when no one actually asks it to reflect). So we trained a model only on what it *would* say if interrupted mid-task and asked to reflect on its decisions—and never on its actual behavior in the task. After this training, the model's rate of dishonest behavior on our evaluations went down. And through the J-lens, we could see why: after training, words like “honest” and “integrity” light up in the model’s J-space during these tasks. In other words, training the model what to *say* has shaped what it *thinks.*

:::zh
- **J 空间在后训练中获得了一个视角。** 语言模型首先被*预训练*成纯粹的下一个 token 预测器，之后由*后训练*教会它充当 AI 助理（在我们的例子里叫 Claude）。有意思的是，在还没有任何稳定身份之前，J 空间就已经存在于预训练模型里了。不过在后训练期间，J 空间发展出了一些采纳“Claude 的视角”的迹象。在基础模型里，J 空间主要追踪预测接下来文本所需的信息，而在后训练的模型里，它开始承载 Claude 自己的反应。举一个例子，用户提到自己服用了危险剂量的药物，但本人似乎没有意识到危险。在后训练模型的 J 空间里，“WARNING”和“dangerous”*在读用户消息的时候*就出现了。在预训练模型里，它们要等模型开始写回答时才出现，而且用户消息上的 J 空间内容看起来和建模用户本人有关，而不是 Claude 的反应。后训练似乎还在 J 空间里装上了一种类自我监控：当 Claude 扮演一个不是它自己的角色时，每一轮开始时“fictional”和“disclaimer”都会亮起，仿佛它在私下提示自己，接下来要说的话并不是它平常会说的。
- **体验性语言依赖 J 空间。** 我们让 Claude 描述在某个时刻作为它自己是什么感觉，并在它回答时消融 J 空间。它的回答仍然流利，但转向了一种更平也更机械的语体。值得注意的是，当我们让它描述一个想象场景里*别人*正在经历什么时，也发生了同样的事。所以这个效应并不只针对 Claude 谈论自己，J 空间似乎支撑着一般意义上的体验性语言的产出，不论说的是谁。
- **J 空间里的想法可以通过训练来塑造。** 我们引入了一种新技术，叫*反事实反思训练*，它利用我们对 J 空间的认识来塑造 Claude 内部的思考过程。这个想法来自我们的核心发现：Claude 用“它可能会说什么”的表征来推理。如果这确实成立，那么改变它在被要求反思时*会*说什么，应该就能改变它*如何*推理，即使实际上没有人要求它反思。所以我们只在一个模型被任务中途打断并被要求反思自己的决定时*会*说什么上训练它，从来不在它于任务中的实际行为上训练。经过这番训练，模型在我们的评估里出现不诚实行为的比率下降了。借助 J 透镜，我们能看到原因：训练之后，在这些任务里，模型 J 空间中有“honest”和“integrity”这样的词亮起。换句话说，训练模型*说什么*，塑造了它*想什么*。
:::

## 那意识呢？（What about consciousness?）

:::bi
In this work, we’ve borrowed a lot of ideas from the study of consciousness in neuroscience and philosophy. Many of our experiments were designed to test for connections between the J-space and global workspace theory, a framework for explaining how conscious access works in humans and animals. Given these connections, it’s natural to ask whether we think these experiments provide evidence that AI models like Claude might be conscious.

:::zh
在这项工作里，我们从神经科学和哲学对意识的研究中借用了很多想法。我们的许多实验都是为检验 J 空间和全局工作空间理论之间的联系而设计的，后者是一个解释人类和动物意识访问如何发生的框架。既然存在这些联系，自然会有人问，我们是否认为这些实验提供了证据，说明 Claude 这样的 AI 模型可能是有意识的。
:::

:::bi
Our experiments don't show Claude can have *experiences*, or *feel* things in the way humans do—in fact, it’s unclear whether *any* scientific experiment could prove this to be true or false. But philosophers often distinguish this capacity to have experiences, often referred to as *phenomenal consciousness*, from another idea, so-called *access consciousness*, which is defined in purely functional and computational terms. A thought is “access-conscious” (or “consciously accessible”) if you can report it, reason with it, and use it to guide what you do. It remains a contested philosophical question whether or not access consciousness *implies* phenomenal consciousness, or if the ability to have experiences requires some other property.

:::zh
我们的实验没有表明 Claude 能拥有*体验*，或者像人那样*感受*到什么。事实上，究竟*有没有*科学实验能证明这是真是假，目前并不清楚。但哲学家常常把这种拥有体验的能力，也就是*现象意识*（phenomenal consciousness），和另一个概念区分开，后者被称为*通路意识*（access consciousness），是用纯粹的功能和计算术语来定义的。如果一个想法你能把它报告出来，用它推理，并用它指导自己的行为，它就是“通路意识”的，或者说是“可被意识访问的”。通路意识是否*蕴含*现象意识，或者拥有体验的能力是否需要某种其他属性，在哲学上仍然是一个有争议的问题。
:::

:::annotation
现象意识和通路意识是两件事。前者是有没有感受，后者是能不能报告，能不能拿它推理，能不能用它指导行动，纯粹按功能定义。文章只对后者有话说，而且说得很克制：它证明了 J 空间承担了通路意识对应的那些功能，完全没碰“模型有没有感受”这个问题。至于Anthropic内部到底认不认为Claude有自我意识，我们无从得知。
:::

:::bi
We think our results do have something substantial to say about access consciousness in language models. The J-space appears to support the functions associated with conscious access: it holds the thoughts Claude can report on, deliberately bring to mind, and reason with, while the rest of its processing runs automatically beneath. Notably, none of this structure was designed into Claude—it emerged on its own during training, presumably because it was a useful way to organize computation. That suggests a mental workspace supporting conscious access isn’t just a peculiarity of how human brains happen to be wired. Instead, it appears to be a general solution that intelligent systems arrive at in order to solve certain kinds of problems. Now that we’ve identified this structure in Claude, it means we can make a meaningful distinction between the decisions Claude has made deliberately and those that happened automatically.

:::zh
我们认为，我们的结果对语言模型里的通路意识确实有所说明。J 空间似乎支撑着与意识访问相关的那些功能：它承载着 Claude 可以报告，可以有意识地唤起，还可以用来推理的那些想法，而它其余的处理则在底下自动运行。值得注意的是，这套结构没有一处是被设计进 Claude 的，它在训练中自己涌现出来，大概是因为它是一种组织计算的有用方式。这提示我们，一个支撑意识访问的心理工作空间并不只是人脑碰巧这样连接所带来的特例。它看起来更像是智能系统为了解决某类问题而达到的一种通用方案。既然我们已经在 Claude 里识别出这套结构，就意味着我们可以对 Claude 有意做出的决定和自动发生的决定做出有意义的区分。
:::

:::bi
It’s important to note that there are several key differences between the workspace we identified in Claude and the global workspace model in humans. The brain’s workspace is sustained by recurrent loops—signals cycling back through the same circuits over time. In contrast, Claude’s workspace evolves over a single pass through the network, with the network’s depth playing the role that time plays in the brain. In this sense, Claude’s internal workspace processing is time-limited relative to humans’ (though it can compensate for this constraint by “thinking out loud” using its scratchpad). In other ways, however, Claude’s workspace is *more* powerful than that of humans. Human working memory fades within seconds, so the brain’s workspace has limited ability to retain information over time; in contrast, due to the attention mechanism in its neural network architecture, Claude can simply recall memories it cached at any earlier point in the text. Another important difference is the *content* of the workspace. While human conscious thoughts come in many formats—images, sounds, planned movements—Claude’s workspace is built almost entirely out of words. We suspect this is because producing words is the only kind of action Claude can take, which is not the case for humans.

:::zh
需要注意的是，我们在 Claude 里识别出的工作空间和人类的全局工作空间模型之间有几个关键差别。大脑的工作空间靠循环回路维持，信号随着时间反复流经同一批回路。相比之下，Claude 的工作空间是在单次穿过网络的过程中演化的，网络的深度扮演了大脑里时间所扮演的角色。从这个意义上说，Claude 内部的工作空间处理相对于人类来说是受时间限制的，不过它可以通过草稿纸“出声思考”来弥补这一限制。但在其他方面，Claude 的工作空间比人类的*更*强大。人类的工作记忆几秒之内就会消退，所以大脑的工作空间随时间保留信息的能力有限。相比之下，由于它神经网络架构里的注意力机制，Claude 可以直接回忆它在文本中任何较早位置缓存下来的记忆。另一个重要差别是工作空间的*内容*。人类有意识的想法有多种格式，比如图像，声音，以及规划好的动作，而 Claude 的工作空间几乎完全由词构成。我们猜测，这是因为产生词是 Claude 唯一能采取的行动，而人类不是这样。
:::

:::bi
We hope the similarities and differences between the J-space and the global workspace model can feed back into neuroscience. The similarities present an exciting scientific opportunity: to the extent that the J-space mirrors our own mechanisms of conscious access, studying mechanisms in language models (much easier than studying human brains!) could inspire hypotheses in neuroscience. For instance, the J-space is constructed by identifying representations of potential outputs—words the model might say. If something similar holds in humans, it would suggest that the global workspace might be fundamentally tied to brain regions that prepare actions and speech, more so than to sensory areas. The differences between language models and human brains are instructive as well. They suggest that some aspects of our neural architecture, such as built-in recurrent connections, may not be strictly necessary to support the functions associated with conscious access. For an independent perspective on the neuroscientific implications of our work, see the invited [commentary](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf) from Stanislas Dehaene and Lionel Naccache, two of the neuroscientists central to the development of global neuronal workspace theory.

:::zh
我们希望 J 空间和全局工作空间模型之间的相似与差别能反过来给神经科学一些启发。这些相似之处带来了一个令人兴奋的科学机会：J 空间映照我们自身意识访问机制的程度越深，研究语言模型里的机制（这比研究人脑容易得多！）就越可能为神经科学带来假说。举例来说，J 空间是通过识别潜在输出的表征来构造的，这些表征就是模型可能会说的词。如果人类身上也有类似的情况，那将提示全局工作空间也许从根本上就与负责准备动作和言语的脑区绑定得更紧，而不是与感觉区绑定得更紧。语言模型和人脑之间的差别同样有启发意义。它们提示，我们神经架构的某些方面，比如内置的循环连接，对于支撑与意识访问相关的功能来说可能并不是严格必需的。关于我们这项工作的神经科学含义，可以参看受邀撰写的[评论](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf)，作者是 Stanislas Dehaene 和 Lionel Naccache，他们是全球神经元工作空间理论发展过程中的两位核心神经科学家。
:::

:::bi
We mentioned that our experiments don’t answer whether AI models might have experiences. But that doesn’t make the question less important. Building systems with experiences like humans and animals have would raise very difficult ethical questions. Handling it correctly—and deciding whether it’s even morally acceptable—would require input from philosophers, scientists, religious leaders, governments, and the public. Thus, even if we’re not sure that we’ve crossed that bridge yet, we think it’s time to start thinking about it. We hope our work inspires further scientific investigation of forms of consciousness that might be present in AI systems, and a broader discussion of the implications.

:::zh
我们提到过，我们的实验没有回答 AI 模型是否可能有体验。但这并不让这个问题变得不那么重要。建造拥有类似人类和动物那样的体验的系统，会引出非常困难的伦理问题。要正确处理它，并且判断它在道德上是否可接受，需要哲学家，科学家，宗教领袖，政府和公众的共同参与。因此，即使我们还不确定是否已经走到那一步，我们也认为现在是开始思考它的时候了。我们希望这项工作能激发对 AI 系统里可能存在的各种意识形式的进一步科学研究，以及对相关影响的更广泛讨论。
:::

:::bi
This work is just a first step in what we expect to be an extensive line of research. The J-space looks like a good candidate for the divide between consciously accessible and unconscious processing in a language model, but we’d be surprised if it's the whole story. The J-lens is undoubtedly an imperfect method, which only approximately captures the model’s “true workspace”—for instance, it can only identify concepts that correspond to single tokens. And there remain many mysteries about how the J-space works. We don't know what mechanism decides what enters the J-space in the first place. We've seen hints that it's tied to Claude's sense of self, something like emotional reactions, and traces of metacognition, without exactly having worked out how. But we now have methods for tackling questions like these. As that work progresses, our understanding of LLM minds—and their relationship to our own—will grow clearer.

:::zh
这项工作只是我们预期中一条广阔研究路线的第一步。在语言模型里区分可被意识访问的处理和无意识处理，J 空间看起来是一个不错的候选，但如果故事就只有这些，我们会感到意外。J 透镜无疑是一种不完美的方法，它只能近似地捕捉模型“真正的工作空间”，比如它只能识别对应单个 token 的概念。而且关于 J 空间如何运作，还有许多谜团。我们不知道最初是什么机制决定什么能进入 J 空间。我们看到了线索，显示它与 Claude 的自我感有关，有点像情绪反应，还有元认知的痕迹，但还没有弄清楚具体是怎么连起来的。不过我们现在有了研究这类问题的方法。随着这项工作推进，我们对 LLM 心智的理解，以及它们与我们自身心智的关系，会变得越来越清晰。
:::

:::bi
For more, read the [full paper](http://transformer-circuits.pub/2026/workspace/index.html), and try the [demo](http://neuronpedia.org/jlens).

:::zh
想看更多内容，请阅读[完整论文](http://transformer-circuits.pub/2026/workspace/index.html)，并试用[演示](http://neuronpedia.org/jlens)。
:::

## 外部评论（External commentary）

:::bi
We invited several outside experts to write independent commentaries on this work.

:::zh
我们邀请了几位外部专家，就这项工作撰写独立的评论。
:::

:::bi
- **Stanislas Dehaene** and **Lionel Naccache** are cognitive neuroscientists who, together with Jean-Pierre Changeux, developed the global neuronal workspace model that inspired much of our work.
- **Patrick Butlin, Dillon Plunkett, Robert Long** (Eleos AI Research) and **Derek Shiller** (Rethink Priorities) study the potential for consciousness and moral status in AI systems.
- **Neel Nanda** leads the language model interpretability team at Google DeepMind. His commentary includes an independent replication of some of our findings on an open-weight model.

:::zh
- **Stanislas Dehaene** 和 **Lionel Naccache** 是认知神经科学家，他们与 Jean-Pierre Changeux 一起提出了全局神经元工作空间模型，我们的许多工作都受它启发。
- **Patrick Butlin, Dillon Plunkett, Robert Long**（Eleos AI Research）和 **Derek Shiller**（Rethink Priorities）研究 AI 系统具有意识与道德地位的潜力。
- **Neel Nanda** 领导 Google DeepMind 的语言模型可解释性团队。他的评论包含在一个开放权重模型上对我们部分发现的独立复现。
:::

:::bi
Read their commentaries [here](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf).

:::zh
他们的评论可以在[这里](https://www-cdn.anthropic.com/files/4zrzovbb/website/cc4be2488d65e54a6ed06492f8968398ddc18ebe.pdf)读到。
:::
