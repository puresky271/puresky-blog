---
title: '要怎么最轮椅地理解四大链表指针操作核心形式'
description: '是的孩子们，我科研成功了。让我提供我自己对于链表指针操作的理解，让你不再烦恼到底要怎么推演节点状态和链表关系的变化，从此打爆绝大部分关于迭代的链表算法题。'
pubDate: 2026-11-14
category: technology
tags: ['链表', '迭代', '学习']
series: '线性结构笔记'
seriesOrder: 5
subcategory: 'data-structures'
leetcodeSlugs: ['reverse-linked-list', 'swap-nodes-in-pairs']
---

>ok这一篇不废话，直接上来就放核弹
>
> **链表上的每一步操作，拆开看都只在玩两种东西。**
>
> * **圆圈**：内存里的一个真实节点（`ListNode`）。图里统一画成圆形节点。
> * **指针变量** `p` `q`：指着某个圆圈的“游标”或者“标签”。改它不会改变链表结构。
> * **`->next`**：节点圆圈自己长出来的箭头。改它才会真正改变链表结构。
>
> 看图的约定：**实线箭头**是节点自己长出来的 `next`，**虚线箭头**是指针变量指向哪里。改链时被改动的那条实线箭头会加粗标蓝。指针颜色上 `p` 和 `curr` 是蓝，`q` 和 `next` 是绿，`prev` 是橙。
>
> 代码同时给了 C++ 和 Java 两版，可以按需要切换：两种语言在这里只差 `ListNode*` 和 `ListNode`、`->` 和 `.`、`nullptr` 和 `null`。


## 第一部分：四种直观形式

让我们直接甩口诀并把最常用的四种写法各画一遍。

### ① 第一种形式：新建指针 `ListNode* p = x;`

搞一个新的指针变量 `p`，让它指向 `x` 当前所在的那个圆圈（`x` 本身不动）。


<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="形式一：新建指针。情况一 x 指向节点 1，p 和 x 一起指过去。情况二 x 为空，p 和 x 都悬空指向 null" style="max-width:760px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s1-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s1-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
<marker id="s1-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
</defs>
<text x="150" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">情况 1：x 指向节点 1</text>
<text x="540" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">情况 2：x == nullptr</text>
<line x1="380" y1="40" x2="380" y2="200" style="stroke:var(--line);stroke-width:1"/>
<circle cx="150" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="150" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<rect x="98.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="115" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="115" y1="100.0" x2="150" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s1-ar1)"/>
<rect x="168.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="185" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">x</text><line x1="185" y1="100.0" x2="150" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s1-ar2)"/>
<line x1="172" y1="150" x2="198" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s1-ar3)"/>
<text x="232" y="155" text-anchor="middle" font-size="16" style="fill:var(--fg-muted)">…</text>
<rect x="518.0" y="138.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="540" y="154" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<rect x="488.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="505" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="505" y1="100.0" x2="540" y2="138" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s1-ar1)"/>
<rect x="558.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="575" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">x</text><line x1="575" y1="100.0" x2="540" y2="138" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s1-ar2)"/>
<text x="540" y="198" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">悬空，不指向任何圆圈</text>
</svg>

**边界前提**：没有特殊限制，`x` 可以为空。

### ② 第二种形式：移动指针 `p = q;`

把原来就有的指针 `p`，挪到 `q` 所在的位置，但是不动 `q`，也不改变任何圆圈之间的连接关系。


<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="形式二：移动指针。操作前 p 指向 A，q 指向 B。操作后 p 挪到 B，和 q 一起指向 B，A 原地不动" style="max-width:760px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s2-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s2-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="150" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">操作前</text>
<text x="540" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">操作后</text>
<line x1="380" y1="40" x2="380" y2="200" style="stroke:var(--line);stroke-width:1"/>
<circle cx="140" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="140" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<circle cx="320" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="320" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">B</text>
<rect x="123.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="140" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="140" y1="100.0" x2="140" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s2-ar1)"/>
<rect x="303.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="320" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="320" y1="100.0" x2="320" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s2-ar2)"/>
<circle cx="500" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="500" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<circle cx="680" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="680" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">B</text>
<rect x="633.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="650" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="650" y1="100.0" x2="680" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s2-ar1)"/>
<rect x="693.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="710" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="710" y1="100.0" x2="680" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s2-ar2)"/>
</svg>

常见的变体是 `p = p->next;`：遍历链表时把 `p` 挪到自己下一个圆圈的位置，这本质也是形式 ②。但因为这一步右边读的是字段，所以操作前 `p` 不能为空，这条红线在待会的第二部分会专门说。

**边界前提**：`q` 可以为空。若写 `p = p->next`，操作前 `p` 不能为空。

### ③ 第三种形式：修改后继指向 `p->next = q;`

把 `p` 所指的那个圆圈长出来的箭头摘下来，改放到 `q` 所在的那个圆圈的位置（`p` 和 `q` 本身不动）。


<svg viewBox="0 0 760 230" width="100%" role="img" aria-label="形式三：修改后继指向。情况一 A 的 next 接到 B。情况二 q 为空，A 的 next 接到 null，断尾" style="max-width:760px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s3-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s3-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="150" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">情况 1：q 指向节点 B</text>
<text x="540" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">情况 2：q == nullptr，断尾</text>
<line x1="380" y1="40" x2="380" y2="200" style="stroke:var(--line);stroke-width:1"/>
<circle cx="140" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="140" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<circle cx="320" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="320" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">B</text>
<line x1="162" y1="150" x2="298" y2="150" style="stroke:var(--accent);opacity:1" stroke-width="2.4" marker-end="url(#s3-ar1)"/>
<rect x="123.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="140" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="140" y1="100.0" x2="140" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s3-ar1)"/>
<rect x="303.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="320" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="320" y1="100.0" x2="320" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s3-ar2)"/>
<circle cx="500" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="500" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<rect x="658.0" y="138.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="680" y="154" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="522" y1="150" x2="658" y2="150" style="stroke:var(--accent);opacity:1" stroke-width="2.4" marker-end="url(#s3-ar1)"/>
<rect x="483.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="500" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="500" y1="100.0" x2="500" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s3-ar1)"/>
<rect x="663.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="680" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="680" y1="100.0" x2="680" y2="138" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s3-ar2)"/>
</svg>

**边界前提**：`p` 绝对不能为 `nullptr`。空指针没有圆圈，长不出箭头，访问会报错。`q` 可以为空。

### ④ 第四种形式（补充）：对接后继指向 `p->next = q->next;`

把 `p` 所指圆圈长出来的箭头，接到 `q` 所指圆圈后面跟着的那个圆圈上，也就是让 `p` 和 `q` 共享同一个“下一跳”。`p` `q` 以及 `q->next` 都不动。


<svg viewBox="0 0 920 270" width="100%" role="img" aria-label="形式四：对接后继指向。通用场景 A 的 next 直接连向 B 后面的 C。删除节点特例 A 跳过 B 连上 C" style="max-width:920px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s4-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s4-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s4-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="210" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">通用场景：A 的 next 接向 B 后面的 C</text>
<text x="680" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">删除节点：A 跳过 B 直接连上 C</text>
<line x1="460" y1="40" x2="460" y2="220" style="stroke:var(--line);stroke-width:1"/>
<circle cx="120" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="120" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<circle cx="250" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="250" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">B</text>
<circle cx="380" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="380" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">C</text>
<line x1="272" y1="150" x2="358" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s4-ar1)"/>
<path d="M 142 150 Q 250 206 358 150" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s4-ar2)"/>
<rect x="103.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="120" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="120" y1="100.0" x2="120" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s4-ar2)"/>
<rect x="233.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="250" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="250" y1="100.0" x2="250" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s4-ar3)"/>
<text x="250" y="226" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">A 长出来的箭头连向 B 后面的 C</text>
<circle cx="560" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="560" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">A</text>
<circle cx="680" cy="150" r="22" style="fill:none;stroke:var(--line-strong);stroke-width:2" stroke-dasharray="4 3"/><text x="680" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:var(--fg-muted)">B</text>
<circle cx="800" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="800" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">C</text>
<line x1="702" y1="150" x2="778" y2="150" style="stroke:currentColor;opacity:0.4" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#s4-ar1)"/>
<path d="M 582 150 Q 680 94 778 150" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s4-ar2)"/>
<rect x="543.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="560" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="560" y1="100.0" x2="560" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s4-ar2)"/>
<rect x="663.0" y="76.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="680" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="680" y1="100.0" x2="680" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s4-ar3)"/>
<text x="680" y="226" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">A 跳过 B 连上 C，B 被从链表里剔除</text>
</svg>

**边界前提**：`p` 和 `q` 都绝对不能为 `nullptr`（两个都要找各自长出来的箭头）。但 `q->next` 可以为 `nullptr`，此时相当于让 `p->next` 指向空。

### 速查对比表

| 形式 | 语法 | 改的是谁 | 链表结构变了吗 | 判空红线（绝对不能为 null） |
| :--- | :--- | :--- | :--- | :--- |
| ① 新建 | `ListNode* p = x` | 新变量 `p` | 不变 | 无 |
| ② 移动 | `p = q` | 旧变量 `p` | 不变 | 无（若写 `p = p->next` 则 `p` 不为空） |
| ③ 改链 | `p->next = q` | `p` 所在节点的 `next` | 改变 | `p` 不能为空 |
| ④ 接链 | `p->next = q->next` | `p` 所在节点的 `next` | 改变 | `p` 和 `q` 都不能为空 |

### C++ 和 Java 的写法对照

Java 没有指针符号，`ListNode*` 写成 `ListNode`，`->` 写成 `.`，`nullptr` 写成 `null`。四种形式原样搬过去就是了：


:::tabs
```cpp
ListNode* p = x;        // ① 新建
p = q;                  // ② 移动
p->next = q;            // ③ 改链
p->next = q->next;      // ④ 接链
```

```java
ListNode p = x;         // ① 新建
p = q;                  // ② 移动
p.next = q;             // ③ 改链
p.next = q.next;        // ④ 接链
```
:::


## 第二部分：底层原理

这四个形式看起来是四种写法，但说白了背后其实只有两个问题：**这一步在写谁，以及这一步在读谁。**

- **写谁**：写的是指针变量，还是 `next` 字段。前者结构不变，后者结构改变
- **读谁**：右边是变量（或空指针），还是要读 `p->next` 这类字段。前者不用判空，后者源节点必须非空

让我们把四个形式按这两个维度摆进一张表：


<svg viewBox="0 0 900 530" width="100%" role="img" aria-label="四种形式背后的两个维度：写谁乘读谁。写指针变量结构不变，写 next 字段结构改变，读变量不用判空，读字段源要判空" style="max-width:900px;height:auto;margin:0 auto;display:block">
<defs>

</defs>
<text x="450" y="32" text-anchor="middle" font-size="15" style="fill:currentColor">四个形式背后是两个维度：写谁 × 读谁</text>
<rect x="166" y="120" width="310" height="58" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.4"/>
<rect x="476" y="120" width="310" height="58" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.4"/>
<text x="321.0" y="144" text-anchor="middle" font-size="13.5" style="fill:currentColor">读变量（不用判空）</text>
<text x="321.0" y="164" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">右边是变量或空指针</text>
<text x="631.0" y="144" text-anchor="middle" font-size="13.5" style="fill:currentColor">读字段（源要判空）</text>
<text x="631.0" y="164" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">右边是 p->next 这类</text>
<rect x="16" y="190" width="150" height="150" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.4"/>
<text x="91.0" y="253.0" text-anchor="middle" font-size="13.5" style="fill:currentColor">写指针变量</text>
<text x="91.0" y="275.0" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">结构不变</text>
<rect x="166" y="190" width="310" height="150" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.6"/>
<rect x="476" y="190" width="310" height="150" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.6"/>
<rect x="16" y="352" width="150" height="150" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.4"/>
<text x="91.0" y="415.0" text-anchor="middle" font-size="13.5" style="fill:currentColor">写 next 字段</text>
<text x="91.0" y="437.0" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">结构改变</text>
<rect x="166" y="352" width="310" height="150" rx="8" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.6"/>
<rect x="476" y="352" width="310" height="150" rx="8" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.6"/>
<text x="321.0" y="254.0" text-anchor="middle" font-size="14" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">ListNode* p = x</text>
<text x="321.0" y="276.0" text-anchor="middle" font-size="14" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p = q</text>
<text x="321.0" y="326" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">① 新建 / ② 移动</text>
<text x="631.0" y="265.0" text-anchor="middle" font-size="14" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p = p->next</text>
<text x="631.0" y="326" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">遍历时的那一步</text>
<text x="321.0" y="427.0" text-anchor="middle" font-size="14" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p->next = q</text>
<text x="321.0" y="488" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">③ 改链</text>
<text x="631.0" y="427.0" text-anchor="middle" font-size="14" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p->next = q->next</text>
<text x="631.0" y="488" text-anchor="middle" font-size="11.5" style="fill:var(--fg-muted)">④ 接链</text>
</svg>

### 第一组：① 和 ② —— 写的是指针变量

① 和 ② 的共同点是：**被改的那个东西是 `p` 这个指针变量，不是任何节点的 `next`。** 所以它们只换游标，链表结构一根头发都不动。

区别只在一个是“生新标签”，一个是“挪旧标签”：


:::tabs
```cpp
ListNode* p = x;   // ① 新建：给新变量赋初值
p = q;             // ② 移动：给旧变量重新赋值
```

```java
ListNode p = x;    // ① 新建：给新变量赋初值
p = q;             // ② 移动：给旧变量重新赋值
```
:::


从内存的角度看，两句都是“把一个地址写进一个指针槽”，本质上同一类操作。① 的“边界前提：无”只对右边是变量或空指针成立。右边一旦写成 `q->next` 这种字段，那就滑到第二张表里去了。

### 第二组：③ 和 ④ —— 写的是 next 字段

③ 和 ④ 的共同点是：**被改的那个东西是某个节点长出来的 `next` 箭头，所以链表结构真的变了。** 它们都要求 `p` 非空，因为空指针没有圆圈，也就没有箭头可改。

区别在右边读的是谁：


:::tabs
```cpp
p->next = q;        // ③ 读变量：q 本身，可以为空
p->next = q->next;  // ④ 读字段：还要读 q 的 next，q 不能为空
```

```java
p.next = q;         // ③ 读变量：q 本身，可以为空
p.next = q.next;    // ④ 读字段：还要读 q 的 next，q 不能为空
```
:::


### 藏起来的那一格：`p = p->next`

表里右上角那格是四个形式里最容易漏掉的：**写变量，读字段。** 它横跨两组，写的是指针变量（结构不变），读的却是 `p->next`（所以 `p` 必须非空）。遍历链表时满屏都是这一句，它其实就是形式 ② 的一个“读字段”变体。Java 里写作 `p = p.next`。

> [!WARNING]
> **改写 `next` 之前，先把还需要的旧下一跳存下来。** ③ 和 ④ 都会把某个节点长出来的箭头换掉，换掉之后原来的箭头就没了。反转链表第一行 `next = curr->next` 干的就是这件事，插入的“先 ④ 后 ③”也是同一句话的另一种写法。

## 第三部分：常见操作

有了“写谁 × 读谁”这张表，链表里最常见的几个动作都能一句一句对上号。

### 遍历：`p = p->next`


<svg viewBox="0 0 860 344" width="100%" role="img" aria-label="遍历：p 等于 p 的 next。操作前 p 指向 1，读 p 的 next 得到 2，操作后 p 指向 2，链表结构不变" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s6-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s6-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="14" style="fill:currentColor">遍历：p = p->next —— 读 p->next，再写进 p，结构不变</text>
<line x1="0" y1="48" x2="860" y2="48" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="84" text-anchor="start" font-size="13" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p = p->next;</text>
<text x="16" y="106" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动（读字段）</text>
<circle cx="310" cy="136" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="141" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="136" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="141" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="530" cy="136" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="141" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="618.0" y="124.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="140" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="136" x2="398" y2="136" style="stroke:var(--accent);opacity:1" stroke-width="2.2" marker-end="url(#s6-ar1)"/>
<line x1="442" y1="136" x2="508" y2="136" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s6-ar2)"/>
<line x1="552" y1="136" x2="618" y2="136" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s6-ar2)"/>
<rect x="293.0" y="62.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="310" y="78.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="310" y1="86.0" x2="310" y2="114" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s6-ar1)"/>
<text x="365" y="188" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">p->next 读到这里：得到 2</text>
<line x1="0" y1="212" x2="860" y2="212" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="248" text-anchor="start" font-size="13" style="fill:var(--fg-muted)">操作后</text>
<text x="16" y="270" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">p 挪到了下一个圆圈</text>
<circle cx="310" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="530" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="618.0" y="288.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="304" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="300" x2="398" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s6-ar2)"/>
<line x1="442" y1="300" x2="508" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s6-ar2)"/>
<line x1="552" y1="300" x2="618" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s6-ar2)"/>
<rect x="403.0" y="226.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="420" y1="250.0" x2="420" y2="278" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s6-ar1)"/>
</svg>

遍历就是不停地把“下一个圆圈”读出来再写进 `p`。结构始终不变，唯一的红线是每一步 `p` 都必须非空，所以循环条件是 `p != nullptr`。


:::tabs
```cpp
for (ListNode* p = head; p != nullptr; p = p->next) {
    // 处理 p 指向的节点
}
```

```java
for (ListNode p = head; p != null; p = p.next) {
    // 处理 p 指向的节点
}
```
:::


### 插入：在 `p` 后面插一个新节点

插入一个新节点要靠 `new` 先把节点造出来，再把它接进链表。整个动作是 ① 加 ④ 加 ③：先用 ① 新建，再用 ④ 把新节点接到 `p` 原来的下一跳，最后用 ③ 让 `p` 指向新节点。


<svg viewBox="0 0 860 500" width="100%" role="img" aria-label="插入：在节点 1 后面插入新节点 X。先用 new 新建节点，再让它的 next 接上 p 的 next，最后让 p 的 next 接到新节点" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s7-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s7-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="14" style="fill:currentColor">插入：在节点 1 后面插入新节点 X（用 new 新建）</text>
<text x="16" y="78" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">ListNode* node = new ListNode(val);</text>
<text x="16" y="100" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">node-&gt;next = p-&gt;next;</text>
<text x="16" y="124" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建 + ④ 接链</text>
<circle cx="310" cy="180" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="185" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="180" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="185" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="530" cy="180" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="185" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="618.0" y="168.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="184" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="180" x2="398" y2="180" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<line x1="442" y1="180" x2="508" y2="180" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<line x1="552" y1="180" x2="618" y2="180" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<rect x="293.0" y="106.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="310" y="122.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="310" y1="130.0" x2="310" y2="158" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s7-ar2)"/>
<circle cx="365" cy="280" r="22" style="fill:var(--accent);stroke:var(--accent);stroke-width:2"/><text x="365" y="285" text-anchor="middle" font-size="15" font-weight="600" style="fill:var(--accent-fg)">X</text>
<line x1="365" y1="258" x2="420" y2="202" style="stroke:var(--accent);stroke-width:1.8" stroke-dasharray="4 3" marker-end="url(#s7-ar2)"/>
<rect x="276.6" y="268.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="300" y="284.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">node</text>
<line x1="0" y1="320" x2="860" y2="320" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="356" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">p-&gt;next = node;</text>
<text x="16" y="380" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<circle cx="310" cy="425" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="430" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="425" r="22" style="fill:var(--accent);stroke:var(--accent);stroke-width:2"/><text x="420" y="430" text-anchor="middle" font-size="15" font-weight="600" style="fill:var(--accent-fg)">X</text>
<circle cx="530" cy="425" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="430" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="425" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="430" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="413.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="429" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="425" x2="398" y2="425" style="stroke:var(--accent);opacity:1" stroke-width="2.2" marker-end="url(#s7-ar2)"/>
<line x1="442" y1="425" x2="508" y2="425" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<line x1="552" y1="425" x2="618" y2="425" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<line x1="662" y1="425" x2="728" y2="425" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s7-ar1)"/>
<rect x="293.0" y="351.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="310" y="367.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="310" y1="375.0" x2="310" y2="403" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s7-ar2)"/>
<text x="430" y="480" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">顺序不能反：先 ④ 再 ③，否则 1 到 2 的旧箭头就丢了</text>
</svg>

先把新节点 `node` 的 `next` 接上 `p->next`，再让 `p` 的 `next` 接到 `node`。顺序反了会先把 `1 → 2` 这条旧箭头毁掉，后面就没法接 `2` 了。


:::tabs
```cpp
ListNode* node = new ListNode(val);   // ① 新建：先 new 出一个新节点
node->next = p->next;                 // ④ 接链：新节点接上 p 原来的下一跳
p->next = node;                       // ③ 改链：再让 p 指向新节点
```

```java
ListNode node = new ListNode(val);    // ① 新建：先 new 出一个新节点
node.next = p.next;                   // ④ 接链：新节点接上 p 原来的下一跳
p.next = node;                        // ③ 改链：再让 p 指向新节点
```
:::


### 删除：删掉 `p` 后面的节点


<svg viewBox="0 0 860 300" width="100%" role="img" aria-label="删除：删掉节点 2。操作前 p 在 1，q 等于 p 的 next 也就是 2。操作后 1 的 next 直接接到 3，2 被剔除" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s8-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s8-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s8-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="28" text-anchor="middle" font-size="14" style="fill:currentColor">删除：删掉节点 2（④ 接链：p->next = p->next->next）</text>
<text x="16" y="76" text-anchor="start" font-size="13" style="fill:var(--fg-muted)">操作前</text>
<text x="16" y="98" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">q = p->next，先记住要删的 2</text>
<circle cx="310" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="530" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="618.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="120" x2="398" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s8-ar1)"/>
<line x1="442" y1="120" x2="508" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s8-ar1)"/>
<line x1="552" y1="120" x2="618" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s8-ar1)"/>
<rect x="293.0" y="46.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="310" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="310" y1="70.0" x2="310" y2="98" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s8-ar2)"/>
<rect x="403.0" y="46.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="420" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">q</text><line x1="420" y1="70.0" x2="420" y2="98" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s8-ar3)"/>
<line x1="0" y1="158" x2="860" y2="158" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="194" text-anchor="start" font-size="13" style="fill:var(--fg-muted)">操作后</text>
<text x="16" y="216" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">p->next = p->next->next</text>
<circle cx="310" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="420" cy="238" r="22" style="fill:none;stroke:var(--line-strong);stroke-width:2" stroke-dasharray="4 3"/><text x="420" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:var(--fg-muted)">2</text>
<circle cx="530" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="618.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="442" y1="238" x2="508" y2="238" style="stroke:currentColor;opacity:0.4" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#s8-ar1)"/>
<path d="M 332 238 Q 420 182 508 238" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s8-ar2)"/>
<rect x="293.0" y="164.0" width="34.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="310" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">p</text><line x1="310" y1="188.0" x2="310" y2="216" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s8-ar2)"/>
</svg>

删节点是 ④ 的直接应用：`p->next = p->next->next`。右边连读两个字段，所以 `p` 和 `p->next` 都要非空。更稳妥的写法是先 ① 把要删的节点记下来，C++ 里顺便释放内存，Java 交给垃圾回收。


:::tabs
```cpp
ListNode* q = p->next;        // ① 新建：记住要删的节点
p->next = p->next->next;      // ④ 接链：跳过 q，直接连到 q 的下一跳
delete q;                     // 释放内存，Java 不用写这句
```

```java
ListNode q = p.next;          // ① 新建：记住要删的节点
p.next = p.next.next;         // ④ 接链：跳过 q，直接连到 q 的下一跳
// Java 有垃圾回收，不用手动释放
```
:::


### 拼接：把 B 接到 A 的尾巴


<svg viewBox="0 0 860 300" width="100%" role="img" aria-label="拼接：把 B 接到 A 的尾巴。操作前 A 是 1 到 2，B 是 3 到 4。操作后 tailA 的 next 接到 headB，变成 1 到 2 到 3 到 4" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s9-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s9-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s9-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
<marker id="s9-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
</defs>
<text x="430" y="28" text-anchor="middle" font-size="14" style="fill:currentColor">拼接：把 B 接到 A 的尾巴（③ 改链：tailA->next = headB）</text>
<text x="16" y="76" text-anchor="start" font-size="13" style="fill:var(--fg-muted)">操作前</text>
<text x="16" y="98" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">两条分开的链</text>
<circle cx="200" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="200" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="310" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<line x1="222" y1="120" x2="288" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<rect x="282.5" y="46.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">tailA</text><line x1="310" y1="70.0" x2="310" y2="98" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s9-ar2)"/>
<circle cx="420" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="530" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<line x1="442" y1="120" x2="508" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<rect x="618.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="552" y1="120" x2="618" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<rect x="392.5" y="46.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="420" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">headB</text><line x1="420" y1="70.0" x2="420" y2="98" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s9-ar3)"/>
<line x1="0" y1="158" x2="860" y2="158" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="194" text-anchor="start" font-size="13" style="fill:var(--fg-muted)">操作后</text>
<text x="16" y="216" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">tailA->next = headB</text>
<circle cx="200" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="200" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="310" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="420" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="530" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="618.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="640" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="222" y1="238" x2="288" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<line x1="332" y1="238" x2="398" y2="238" style="stroke:var(--accent);opacity:1" stroke-width="2.2" marker-end="url(#s9-ar4)"/>
<line x1="442" y1="238" x2="508" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<line x1="552" y1="238" x2="618" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s9-ar1)"/>
<rect x="282.5" y="164.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">tailA</text><line x1="310" y1="188.0" x2="310" y2="216" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s9-ar2)"/>
<rect x="392.5" y="164.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="420" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">headB</text><line x1="420" y1="188.0" x2="420" y2="216" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s9-ar3)"/>
</svg>

拼接是 ③ 的最朴素用法：让 A 尾节点的 `next` 指向 B 的头节点。只改了一个节点的 `next`，两条链就合成一条。如果 A 是空的，结果就是 B 自己，所以要单独处理 `tailA == nullptr` 这个特例。


:::tabs
```cpp
if (tailA == nullptr) {
    return headB;             // A 为空，B 就是结果
}
tailA->next = headB;          // ③ 改链：A 的尾巴接上 B 的头
return headA;
```

```java
if (tailA == null) {
    return headB;             // A 为空，B 就是结果
}
tailA.next = headB;           // ③ 改链：A 的尾巴接上 B 的头
return headA;
```
:::


## 第四部分：反转链表的三次迭代

四种形式单独看都很简单，真正的价值在组合。反转链表的迭代写法，循环体四行正好对应四种形式：


:::tabs
```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr != nullptr) {
        ListNode* next = curr->next;   // ① 新建：先记住下一跳
        curr->next = prev;             // ③ 改链：让 curr 掉头
        prev = curr;                   // ② 移动：prev 往前走一格
        curr = next;                   // ② 移动：curr 往前走一格
    }
    return prev;
}
```

```java
ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode next = curr.next;     // ① 新建：先记住下一跳
        curr.next = prev;              // ③ 改链：让 curr 掉头
        prev = curr;                   // ② 移动：prev 往前走一格
        curr = next;                   // ② 移动：curr 往前走一格
    }
    return prev;
}
```
:::


`next` 先用 ① 把 `curr` 的下一跳记下来，然后 `curr->next` 用 ③ 掉头指向 `prev`，最后 `prev` 和 `curr` 用 ② 各往前挪一格。下面拿 `1 → 2 → 3 → null` 走一遍。


<svg viewBox="0 0 860 200" width="100%" role="img" aria-label="反转链表初始状态：prev 为空，curr 等于 head 指向 1，链表是 1 到 2 到 3 到 null" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s10-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s10-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s10-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">初始：prev = nullptr，curr = head（指向 1）</text>
<rect x="278.0" y="118.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="300" y="134" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="410" cy="130" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="410" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="520" cy="130" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="520" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="630" cy="130" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="630" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="718.0" y="118.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="740" y="134" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="432" y1="130" x2="498" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s10-ar1)"/>
<line x1="542" y1="130" x2="608" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s10-ar1)"/>
<line x1="652" y1="130" x2="718" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s10-ar1)"/>
<rect x="276.6" y="56.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="300" y="72.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="300" y1="80.0" x2="300" y2="118" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s10-ar2)"/>
<rect x="386.6" y="56.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="410" y="72.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="410" y1="80.0" x2="410" y2="108" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s10-ar3)"/>
</svg>

### 第 1 次迭代


<svg viewBox="0 0 860 518" width="100%" role="img" aria-label="反转链表第 1 次迭代的四步：先新建 next，再改 curr 的 next，再移动 prev，最后移动 curr" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s11-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s11-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s11-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s11-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="28" text-anchor="middle" font-size="14" style="fill:currentColor">第 1 次迭代</text>
<text x="16" y="92" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">ListNode* next = curr->next;</text>
<text x="16" y="114" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建</text>
<rect x="288.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="442" y1="120" x2="508" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<line x1="552" y1="120" x2="618" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<line x1="662" y1="120" x2="728" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<rect x="286.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="310" y1="70.0" x2="310" y2="108" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar2)"/>
<rect x="396.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="420" y1="70.0" x2="420" y2="98" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar3)"/>
<rect x="506.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="530" y1="70.0" x2="530" y2="98" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar4)"/>
<line x1="0" y1="158" x2="860" y2="158" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="210" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr->next = prev;</text>
<text x="16" y="232" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<rect x="288.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="398" y1="238" x2="332" y2="238" style="stroke:var(--accent);opacity:1" stroke-width="2.4" marker-end="url(#s11-ar3)"/>
<line x1="552" y1="238" x2="618" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<line x1="662" y1="238" x2="728" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<rect x="286.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="310" y1="188.0" x2="310" y2="226" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar2)"/>
<rect x="396.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="420" y1="188.0" x2="420" y2="216" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar3)"/>
<rect x="506.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="530" y1="188.0" x2="530" y2="216" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar4)"/>
<line x1="0" y1="276" x2="860" y2="276" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="328" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">prev = curr;</text>
<text x="16" y="350" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="398" y1="356" x2="332" y2="356" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar3)"/>
<line x1="552" y1="356" x2="618" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<line x1="662" y1="356" x2="728" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<rect x="372.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="396" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="396" y1="306.0" x2="420" y2="334" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar2)"/>
<rect x="420.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="444" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="444" y1="306.0" x2="420" y2="334" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar3)"/>
<rect x="506.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="530" y1="306.0" x2="530" y2="334" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar4)"/>
<line x1="0" y1="394" x2="860" y2="394" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="446" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr = next;</text>
<text x="16" y="468" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="398" y1="474" x2="332" y2="474" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar3)"/>
<line x1="552" y1="474" x2="618" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<line x1="662" y1="474" x2="728" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s11-ar1)"/>
<rect x="396.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="424.0" x2="420" y2="452" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar2)"/>
<rect x="506.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="530" y1="424.0" x2="530" y2="452" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s11-ar3)"/>
</svg>

### 第 2 次迭代


<svg viewBox="0 0 860 518" width="100%" role="img" aria-label="反转链表第 2 次迭代的四步：先新建 next，再改 curr 的 next，再移动 prev，最后移动 curr" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s12-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s12-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s12-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s12-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="28" text-anchor="middle" font-size="14" style="fill:currentColor">第 2 次迭代</text>
<text x="16" y="92" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">ListNode* next = curr->next;</text>
<text x="16" y="114" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建</text>
<rect x="288.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="398" y1="120" x2="332" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<line x1="552" y1="120" x2="618" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<line x1="662" y1="120" x2="728" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<rect x="396.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="70.0" x2="420" y2="98" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar2)"/>
<rect x="506.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="530" y1="70.0" x2="530" y2="98" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar3)"/>
<rect x="616.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="640" y1="70.0" x2="640" y2="98" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar4)"/>
<line x1="0" y1="158" x2="860" y2="158" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="210" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr->next = prev;</text>
<text x="16" y="232" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<rect x="288.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="508" y1="238" x2="442" y2="238" style="stroke:var(--accent);opacity:1" stroke-width="2.4" marker-end="url(#s12-ar3)"/>
<line x1="398" y1="238" x2="332" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<line x1="662" y1="238" x2="728" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<rect x="396.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="188.0" x2="420" y2="216" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar2)"/>
<rect x="506.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="530" y1="188.0" x2="530" y2="216" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar3)"/>
<rect x="616.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="640" y1="188.0" x2="640" y2="216" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar4)"/>
<line x1="0" y1="276" x2="860" y2="276" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="328" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">prev = curr;</text>
<text x="16" y="350" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="508" y1="356" x2="442" y2="356" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar3)"/>
<line x1="398" y1="356" x2="332" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<line x1="662" y1="356" x2="728" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<rect x="482.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="506" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="506" y1="306.0" x2="530" y2="334" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar2)"/>
<rect x="530.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="554" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="554" y1="306.0" x2="530" y2="334" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar3)"/>
<rect x="616.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="640" y1="306.0" x2="640" y2="334" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar4)"/>
<line x1="0" y1="394" x2="860" y2="394" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="446" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr = next;</text>
<text x="16" y="468" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="508" y1="474" x2="442" y2="474" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar3)"/>
<line x1="398" y1="474" x2="332" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<line x1="662" y1="474" x2="728" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s12-ar1)"/>
<rect x="506.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="530" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="530" y1="424.0" x2="530" y2="452" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar2)"/>
<rect x="616.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="640" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="640" y1="424.0" x2="640" y2="452" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s12-ar3)"/>
</svg>

### 第 3 次迭代


<svg viewBox="0 0 860 518" width="100%" role="img" aria-label="反转链表第 3 次迭代的四步：先新建 next，再改 curr 的 next，再移动 prev，最后移动 curr" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s13-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s13-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s13-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s13-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="28" text-anchor="middle" font-size="14" style="fill:currentColor">第 3 次迭代</text>
<text x="16" y="92" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">ListNode* next = curr->next;</text>
<text x="16" y="114" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建</text>
<rect x="288.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="120" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="125" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="108.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="124" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="398" y1="120" x2="332" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<line x1="508" y1="120" x2="442" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<line x1="662" y1="120" x2="728" y2="120" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<rect x="506.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="530" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="530" y1="70.0" x2="530" y2="98" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar2)"/>
<rect x="616.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="640" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="640" y1="70.0" x2="640" y2="98" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar3)"/>
<rect x="726.6" y="46.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="750" y="62.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="750" y1="70.0" x2="750" y2="108" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar4)"/>
<line x1="0" y1="158" x2="860" y2="158" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="210" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr->next = prev;</text>
<text x="16" y="232" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<rect x="288.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="238" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="243" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="226.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="242" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="618" y1="238" x2="552" y2="238" style="stroke:var(--accent);opacity:1" stroke-width="2.4" marker-end="url(#s13-ar3)"/>
<line x1="508" y1="238" x2="442" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<line x1="398" y1="238" x2="332" y2="238" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<rect x="506.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="530" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="530" y1="188.0" x2="530" y2="216" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar2)"/>
<rect x="616.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="640" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="640" y1="188.0" x2="640" y2="216" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar3)"/>
<rect x="726.6" y="164.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="750" y="180.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="750" y1="188.0" x2="750" y2="226" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar4)"/>
<line x1="0" y1="276" x2="860" y2="276" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="328" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">prev = curr;</text>
<text x="16" y="350" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="356" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="361" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="344.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="360" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="618" y1="356" x2="552" y2="356" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar3)"/>
<line x1="508" y1="356" x2="442" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<line x1="398" y1="356" x2="332" y2="356" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<rect x="592.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="616" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="616" y1="306.0" x2="640" y2="334" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar2)"/>
<rect x="640.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="664" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="664" y1="306.0" x2="640" y2="334" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar3)"/>
<rect x="726.6" y="282.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="750" y="298.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">next</text><line x1="750" y1="306.0" x2="750" y2="344" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar4)"/>
<line x1="0" y1="394" x2="860" y2="394" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="446" text-anchor="start" font-size="12.5" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">curr = next;</text>
<text x="16" y="468" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">② 移动</text>
<rect x="288.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="310" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="420" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="474" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="479" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="728.0" y="462.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="478" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="618" y1="474" x2="552" y2="474" style="stroke:var(--accent);opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar3)"/>
<line x1="508" y1="474" x2="442" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<line x1="398" y1="474" x2="332" y2="474" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s13-ar1)"/>
<rect x="616.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="640" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="640" y1="424.0" x2="640" y2="452" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar2)"/>
<rect x="726.6" y="400.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="750" y="416.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="750" y1="424.0" x2="750" y2="462" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s13-ar3)"/>
</svg>

循环在 `curr == nullptr` 时退出，这时 `prev` 正好停在新链表的头上：


<svg viewBox="0 0 860 200" width="100%" role="img" aria-label="反转链表最终状态：prev 指向 3，链表变成 3 到 2 到 1 到 null，curr 为空，返回 prev" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s14-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s14-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s14-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">循环结束：curr == nullptr，返回 prev</text>
<rect x="278.0" y="118.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="300" y="134" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<circle cx="410" cy="130" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="410" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="520" cy="130" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="520" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="630" cy="130" r="22" style="fill:var(--accent);stroke:var(--accent);stroke-width:2"/><text x="630" y="135" text-anchor="middle" font-size="15" font-weight="600" style="fill:var(--accent-fg)">3</text>
<rect x="718.0" y="118.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="740" y="134" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="608" y1="130" x2="542" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s14-ar1)"/>
<line x1="498" y1="130" x2="432" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s14-ar1)"/>
<line x1="388" y1="130" x2="322" y2="130" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s14-ar1)"/>
<rect x="606.6" y="56.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="630" y="72.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="630" y1="80.0" x2="630" y2="108" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s14-ar2)"/>
<rect x="716.6" y="56.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="740" y="72.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">curr</text><line x1="740" y1="80.0" x2="740" y2="118" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s14-ar3)"/>
</svg>

归根结底一句话：**先记住下一跳，再掉头，再一起往前走。** 只要我们分清“指针变量”和“节点长出来的 next 箭头”，那么链表题里的指针操作都能照着这四种形式拆解。

## 另：两两交换链表中的节点（力扣 24）

题目：给你一个链表，两两交换其中相邻的节点，并返回交换后链表的头节点。要求不能只改节点里的值，必须真的动指针。

拿 `1 → 2 → 3 → 4 → null` 来说，结果应该是 `2 → 1 → 4 → 3 → null`。

每轮需要盯住三个节点：`prev` 是上一对换完之后的尾巴，`first` 和 `second` 是这一对。交换一对其实就是三步改链加一次移动：


:::tabs
```cpp
prev->next = second;          // ③ 改链：prev 先跳过 first
first->next = second->next;   // ④ 接链：first 接上 second 原来的下一跳
second->next = first;         // ③ 改链：second 掉头指向 first
prev = first;                 // ② 移动：prev 挪到这一对的尾巴
```

```java
prev.next = second;           // ③ 改链：prev 先跳过 first
first.next = second.next;     // ④ 接链：first 接上 second 原来的下一跳
second.next = first;          // ③ 改链：second 掉头指向 first
prev = first;                 // ② 移动：prev 挪到这一对的尾巴
```
:::


这三步的顺序不能乱。第一步只是让 `prev` 改指 `second`，`1 → 2` 还在，所以后面还能读到 `second->next`。如果先把 `second->next` 改成 `first`，这个旧箭头就丢了，`first->next` 也就接不到 3 了。

完整代码用一个 dummy 哨兵，把“头节点也要被换走”这个特例抹掉：


:::tabs
```cpp
ListNode* swapPairs(ListNode* head) {
    ListNode dummy(0, head);
    ListNode* prev = &dummy;
    while (prev->next != nullptr && prev->next->next != nullptr) {
        ListNode* first = prev->next;        // ① 新建
        ListNode* second = first->next;      // ① 新建
        prev->next = second;                 // ③ 改链
        first->next = second->next;          // ④ 接链
        second->next = first;                // ③ 改链
        prev = first;                        // ② 移动
    }
    return dummy.next;
}
```

```java
ListNode swapPairs(ListNode head) {
    ListNode dummy = new ListNode(0, head);
    ListNode prev = dummy;
    while (prev.next != null && prev.next.next != null) {
        ListNode first = prev.next;          // ① 新建
        ListNode second = first.next;        // ① 新建
        prev.next = second;                  // ③ 改链
        first.next = second.next;            // ④ 接链
        second.next = first;                 // ③ 改链
        prev = first;                        // ② 移动
    }
    return dummy.next;
}
```
:::


先看初始状态：


<svg viewBox="0 0 860 215" width="100%" role="img" aria-label="力扣 24 初始状态：dummy 哨兵指向 1，prev 指向 dummy，链表是 1 到 2 到 3 到 4 到 null" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s15-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s15-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">初始：dummy 哨兵指向 1，prev 指向 dummy</text>
<circle cx="200" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="200" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">D</text>
<circle cx="305" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="305" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="410" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="410" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="515" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="515" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="620" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="620" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="703.0" y="128.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="725" y="144" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="222" y1="140" x2="283" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s15-ar1)"/>
<line x1="327" y1="140" x2="388" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s15-ar1)"/>
<line x1="432" y1="140" x2="493" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s15-ar1)"/>
<line x1="537" y1="140" x2="598" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s15-ar1)"/>
<line x1="642" y1="140" x2="703" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s15-ar1)"/>
<rect x="176.6" y="66.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="200" y="82.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="200" y1="90.0" x2="200" y2="118" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s15-ar2)"/>
<text x="430" y="196" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">dummy 是栈上的哨兵节点，帮我们抹掉“头节点也要被换走”这个特例</text>
</svg>

### 第 1 对：交换 1 和 2


<svg viewBox="0 0 860 660" width="100%" role="img" aria-label="力扣 24 第一对：交换 1 和 2。四步分别是新建 first 和 second，prev 指向 second，first 接上 second 的后继，second 掉头指向 first" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s16-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s16-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s16-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s16-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="26" text-anchor="middle" font-size="14" style="fill:currentColor">第 1 对：交换 1 和 2（prev 还指着 dummy）</text>
<text x="16" y="66" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">first = prev->next;  second = first->next;</text>
<text x="16" y="88" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建</text>
<circle cx="310" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">D</text>
<circle cx="420" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<line x1="332" y1="150" x2="398" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<line x1="442" y1="150" x2="508" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<line x1="552" y1="150" x2="618" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<rect x="286.6" y="76.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="310" y1="100.0" x2="310" y2="128" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar2)"/>
<rect x="392.5" y="76.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="420" y1="100.0" x2="420" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar3)"/>
<rect x="498.4" y="76.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="530" y1="100.0" x2="530" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar4)"/>
<text x="690" y="157" font-size="18" text-anchor="middle" style="fill:var(--fg-muted)">…</text>
<line x1="0" y1="190" x2="860" y2="190" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="216" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">prev->next = second;</text>
<text x="16" y="238" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<circle cx="310" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">D</text>
<circle cx="420" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<path d="M 332 300 Q 420 244 508 300" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s16-ar3)"/>
<line x1="442" y1="300" x2="508" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<line x1="552" y1="300" x2="618" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<rect x="286.6" y="226.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="310" y1="250.0" x2="310" y2="278" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar2)"/>
<rect x="392.5" y="226.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="420" y1="250.0" x2="420" y2="278" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar3)"/>
<rect x="498.4" y="226.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="530" y1="250.0" x2="530" y2="278" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar4)"/>
<text x="690" y="307" font-size="18" text-anchor="middle" style="fill:var(--fg-muted)">…</text>
<line x1="0" y1="340" x2="860" y2="340" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="366" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">first->next = second->next;</text>
<text x="16" y="388" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">④ 接链</text>
<circle cx="310" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">D</text>
<circle cx="420" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<path d="M 332 450 Q 420 394 508 450" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<path d="M 442 450 Q 530 358 618 450" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s16-ar3)"/>
<line x1="552" y1="450" x2="618" y2="450" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<rect x="286.6" y="376.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="310" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="310" y1="400.0" x2="310" y2="428" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar2)"/>
<rect x="392.5" y="376.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="420" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="420" y1="400.0" x2="420" y2="428" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar3)"/>
<rect x="498.4" y="376.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="530" y1="400.0" x2="530" y2="428" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar4)"/>
<text x="690" y="457" font-size="18" text-anchor="middle" style="fill:var(--fg-muted)">…</text>
<line x1="0" y1="490" x2="860" y2="490" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="516" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">second->next = first;  prev = first;</text>
<text x="16" y="538" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链 + ② 移动</text>
<circle cx="310" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">D</text>
<circle cx="420" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="640" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<path d="M 332 600 Q 420 544 508 600" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<path d="M 442 600 Q 530 508 618 600" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s16-ar1)"/>
<line x1="508" y1="600" x2="442" y2="600" style="stroke:var(--accent);opacity:0.55" stroke-width="2.4" marker-end="url(#s16-ar3)"/>
<rect x="396.6" y="526.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="542.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="550.0" x2="420" y2="578" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar2)"/>
<rect x="498.4" y="526.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="530" y="542.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="530" y1="550.0" x2="530" y2="578" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s16-ar4)"/>
<text x="690" y="607" font-size="18" text-anchor="middle" style="fill:var(--fg-muted)">…</text>
<text x="430" y="640" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">这一对换完，prev 停在 1，继续用同样的办法处理 3 和 4</text>
</svg>

### 第 2 对：交换 3 和 4


<svg viewBox="0 0 860 660" width="100%" role="img" aria-label="力扣 24 第二对：交换 3 和 4。此时链头已经是 2 到 1，prev 指向 1" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s17-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
<marker id="s17-ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--warning)"/></marker>
<marker id="s17-ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--accent)"/></marker>
<marker id="s17-ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:var(--success)"/></marker>
</defs>
<text x="430" y="26" text-anchor="middle" font-size="14" style="fill:currentColor">第 2 对：交换 3 和 4（此时前面已经变成 2 → 1）</text>
<text x="16" y="66" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">first = prev->next;  second = first->next;</text>
<text x="16" y="88" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">① 新建</text>
<circle cx="310" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="420" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="640" cy="150" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="155" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="728.0" y="138.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="154" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="332" y1="150" x2="398" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="442" y1="150" x2="508" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="552" y1="150" x2="618" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="662" y1="150" x2="728" y2="150" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<rect x="396.6" y="76.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="100.0" x2="420" y2="128" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar2)"/>
<rect x="502.5" y="76.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="530" y1="100.0" x2="530" y2="128" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar3)"/>
<rect x="608.4" y="76.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="92.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="640" y1="100.0" x2="640" y2="128" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar4)"/>
<line x1="0" y1="190" x2="860" y2="190" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="216" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">prev->next = second;</text>
<text x="16" y="238" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链</text>
<circle cx="310" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="420" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="640" cy="300" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="305" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="728.0" y="288.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="304" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<path d="M 442 300 Q 530 244 618 300" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s17-ar3)"/>
<line x1="332" y1="300" x2="398" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="552" y1="300" x2="618" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="662" y1="300" x2="728" y2="300" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<rect x="396.6" y="226.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="250.0" x2="420" y2="278" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar2)"/>
<rect x="502.5" y="226.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="530" y1="250.0" x2="530" y2="278" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar3)"/>
<rect x="608.4" y="226.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="242.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="640" y1="250.0" x2="640" y2="278" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar4)"/>
<line x1="0" y1="340" x2="860" y2="340" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="366" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">first->next = second->next;</text>
<text x="16" y="388" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">④ 接链</text>
<circle cx="310" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="420" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="640" cy="450" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="455" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="728.0" y="438.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="454" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<path d="M 442 450 Q 530 394 618 450" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<path d="M 552 450 Q 640 358 728 450" fill="none" style="stroke:var(--accent)" stroke-width="2.4" marker-end="url(#s17-ar3)"/>
<line x1="332" y1="450" x2="398" y2="450" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="662" y1="450" x2="728" y2="450" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<rect x="396.6" y="376.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="420" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="420" y1="400.0" x2="420" y2="428" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar2)"/>
<rect x="502.5" y="376.0" width="55.0" height="24" rx="7" style="fill:var(--surface);stroke:var(--accent);stroke-width:1.5"/><text x="530" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--accent)">first</text><line x1="530" y1="400.0" x2="530" y2="428" style="stroke:var(--accent);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar3)"/>
<rect x="608.4" y="376.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="392.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="640" y1="400.0" x2="640" y2="428" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar4)"/>
<line x1="0" y1="490" x2="860" y2="490" style="stroke:var(--line);stroke-width:1"/>
<text x="16" y="516" text-anchor="start" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:currentColor">second->next = first;  prev = first;</text>
<text x="16" y="538" text-anchor="start" font-size="12" font-weight="600" style="fill:var(--accent)">③ 改链 + ② 移动</text>
<circle cx="310" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="310" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="420" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="420" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="530" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="530" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<circle cx="640" cy="600" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="640" y="605" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<rect x="728.0" y="588.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="750" y="604" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<path d="M 442 600 Q 530 544 618 600" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<path d="M 552 600 Q 640 508 728 600" fill="none" style="stroke:currentColor" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<line x1="618" y1="600" x2="552" y2="600" style="stroke:var(--accent);opacity:0.55" stroke-width="2.4" marker-end="url(#s17-ar3)"/>
<line x1="332" y1="600" x2="398" y2="600" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s17-ar1)"/>
<rect x="506.6" y="526.0" width="46.8" height="24" rx="7" style="fill:var(--surface);stroke:var(--warning);stroke-width:1.5"/><text x="530" y="542.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--warning)">prev</text><line x1="530" y1="550.0" x2="530" y2="578" style="stroke:var(--warning);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar2)"/>
<rect x="608.4" y="526.0" width="63.2" height="24" rx="7" style="fill:var(--surface);stroke:var(--success);stroke-width:1.5"/><text x="640" y="542.0" text-anchor="middle" font-size="12.5" font-weight="600" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--success)">second</text><line x1="640" y1="550.0" x2="640" y2="578" style="stroke:var(--success);stroke-width:1.6" stroke-dasharray="4 3" marker-end="url(#s17-ar4)"/>
<text x="430" y="640" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">4 后面是 null，这一对换完循环就结束了</text>
</svg>

循环结束，返回 `dummy.next`：


<svg viewBox="0 0 860 215" width="100%" role="img" aria-label="力扣 24 最终状态：链表变成 2 到 1 到 4 到 3 到 null" style="max-width:860px;height:auto;margin:0 auto;display:block">
<defs>
<marker id="s18-ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" style="fill:currentColor"/></marker>
</defs>
<text x="430" y="30" text-anchor="middle" font-size="13" style="fill:var(--fg-muted)">最终：dummy.next 就是答案，2 → 1 → 4 → 3 → null</text>
<circle cx="250" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="250" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">2</text>
<circle cx="360" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="360" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">1</text>
<circle cx="470" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="470" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">4</text>
<circle cx="580" cy="140" r="22" style="fill:var(--accent-soft);stroke:var(--accent);stroke-width:2"/><text x="580" y="145" text-anchor="middle" font-size="15" font-weight="600" style="fill:currentColor">3</text>
<rect x="668.0" y="128.0" width="44" height="24" rx="8" style="fill:var(--surface-2);stroke:var(--line-strong);stroke-width:1.5"/><text x="690" y="144" text-anchor="middle" font-size="12" font-family="ui-monospace,'Cascadia Mono','SFMono-Regular',Consolas,monospace" style="fill:var(--fg-muted)">null</text>
<line x1="272" y1="140" x2="338" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s18-ar1)"/>
<line x1="382" y1="140" x2="448" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s18-ar1)"/>
<line x1="492" y1="140" x2="558" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s18-ar1)"/>
<line x1="602" y1="140" x2="668" y2="140" style="stroke:currentColor;opacity:0.55" stroke-width="1.6" marker-end="url(#s18-ar1)"/>
<text x="430" y="196" text-anchor="middle" font-size="12" style="fill:var(--fg-muted)">返回 dummy.next，也就是新的头节点 2</text>
</svg>

每轮结束 `prev` 都停在刚换完那一对的尾巴上，下一轮从它的 `next` 继续。dummy 的存在让第一轮也有一个“上一对的尾巴”可用，不用单独处理头节点。

## 关联练习

- [206. 反转链表](https://leetcode.cn/problems/reverse-linked-list/)：第四部分演示的就是它的迭代写法。
- [24. 两两交换链表中的节点](https://leetcode.cn/problems/swap-nodes-in-pairs/)：加练部分演示的就是它的迭代写法。

两道题都是“先记住下一跳，再改链”，区别只是每轮改几条箭头。

还等什么，快去试试看这个轮椅思路吧！
