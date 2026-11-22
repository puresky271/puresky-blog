---
title: '插值查找：按值猜位置'
description: '二分查找每次都取区间中点，插值查找则按值离两端的远近去估一个位置，数据均匀时平均只要 O(log log n) 次比较，本文从公式推导讲到 Java 与 C++ 实现。'
pubDate: 2026-11-20
category: technology
tags: ['插值查找', '二分查找', '复杂度分析', '数学']
series: '平衡树与索引笔记'
seriesOrder: 7
subcategory: 'data-structures'
---

在上一篇[二分查找如此简单](/posts/post-20261118/)里，每次比较都取区间中点 `mid = left + (right - left) / 2`。这个中点只跟下标有关，和 `target` 的值本身没有任何关系。

插值查找多问一句：如果这些数在区间里分布得比较均匀，那 `target` 大概会落在哪个位置。它不取中点，而是按 `target` 离两端有多远来估一个位置去试。这个算法最早由 W. W. Peterson 在 1957 年提出[^1]，可以看成二分查找家族里一个"按值猜位置"的变体。

## 核心公式

$$
pos = low + \frac{(target - arr[low]) \times (high - low)}{arr[high] - arr[low]}
$$

这个公式本质是在做一次线性插值。把下标看成横轴，把值看成纵轴，假设点 $(low, arr[low])$ 和 $(high, arr[high])$ 之间连成一条直线，那么 $target$ 在这条直线上对应的横坐标就是 $pos$。

<figure class="figure">
<svg viewBox="0 0 560 300" width="100%" fill="currentColor" role="img" aria-label="插值查找公式的几何意义。横轴是下标，从 0 到 7，纵轴是值，从 10 到 80。low 点在下标 0 值 10 处，high 点在下标 7 值 80 处，两点连成一条虚线直线。target 等于 50，从纵轴 50 处向右画水平虚线交到这条直线上，再竖直投影到横轴，落点正是下标 4。" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto">
<g font-family="var(--font-sans)">
<text x="280" y="22" text-anchor="middle" font-size="14" font-weight="700" style="fill:var(--accent-strong)">公式的几何意义：把下标当横轴，把值当纵轴</text>
<line x1="56" y1="60" x2="56" y2="240" stroke="var(--line-strong)" stroke-width="1.4"/>
<line x1="56" y1="240" x2="500" y2="240" stroke="var(--line-strong)" stroke-width="1.4"/>
<line x1="50" y1="60" x2="56" y2="60" stroke="var(--line-strong)" stroke-width="1.4"/>
<line x1="50" y1="240" x2="56" y2="240" stroke="var(--line-strong)" stroke-width="1.4"/>
<text x="44" y="64" text-anchor="end" font-size="11" font-family="var(--font-mono)" style="fill:var(--fg-muted)">80</text>
<text x="44" y="244" text-anchor="end" font-size="11" font-family="var(--font-mono)" style="fill:var(--fg-muted)">10</text>
<line x1="56" y1="240" x2="56" y2="246" stroke="var(--line-strong)" stroke-width="1.4"/>
<line x1="500" y1="240" x2="500" y2="246" stroke="var(--line-strong)" stroke-width="1.4"/>
<text x="56" y="260" text-anchor="middle" font-size="11" font-family="var(--font-mono)" style="fill:var(--fg-muted)">0</text>
<text x="500" y="260" text-anchor="middle" font-size="11" font-family="var(--font-mono)" style="fill:var(--fg-muted)">7</text>
<line x1="56" y1="240" x2="500" y2="60" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>
<circle cx="56" cy="240" r="4" style="fill:var(--accent)"/>
<circle cx="500" cy="60" r="4" style="fill:var(--accent)"/>
<text x="66" y="236" text-anchor="start" font-size="10.5" font-family="var(--font-mono)" style="fill:var(--accent-strong)">arr[low] = 10</text>
<text x="492" y="52" text-anchor="end" font-size="10.5" font-family="var(--font-mono)" style="fill:var(--accent-strong)">arr[high] = 80</text>
<line x1="56" y1="137" x2="310" y2="137" stroke="var(--success)" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round"/>
<line x1="310" y1="137" x2="310" y2="240" stroke="var(--success)" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round"/>
<circle cx="310" cy="137" r="3.5" style="fill:var(--success)"/>
<text x="44" y="133" text-anchor="end" font-size="11" font-family="var(--font-mono)" style="fill:var(--accent-strong)">target = 50</text>
<text x="310" y="282" text-anchor="middle" font-size="12" font-family="var(--font-mono)" style="fill:var(--success)">pos = 4</text>
</g>
</svg>
<figcaption style="max-width:560px;margin-left:auto;margin-right:auto">把 target 沿虚线投到下标轴上，落点就是公式算出的 pos。</figcaption>
</figure>

### 公式是怎么来的

把 $(low, arr[low])$ 和 $(high, arr[high])$ 看成平面上的两个点，过这两点的那条直线斜率是：

$$
k = \frac{arr[high] - arr[low]}{high - low}
$$

直线上横坐标为 $pos$ 的那个点，纵坐标恰好是 $target$，所以它也满足这条直线的斜率：

$$
\frac{target - arr[low]}{pos - low} = \frac{arr[high] - arr[low]}{high - low}
$$

把 $pos$ 解出来，就是开头那个公式：

$$
pos = low + \frac{(target - arr[low]) \times (high - low)}{arr[high] - arr[low]}
$$

换句话说，插值查找先假设"值随下标线性增长"，再按这个假设反推出 `target` 应该在哪个下标。数据真的接近线性时，这个猜测很准，数据歪得厉害时，这个假设就靠不住。

## 一个例子

数据越均匀，$pos$ 离真正的答案越近，常常一步就能命中。拿数组 `[10, 20, 30, 40, 50, 60, 70, 80]` 找 `target = 50` 来说，代入公式一步就落在下标 4，正好命中：

<figure class="figure">
<svg viewBox="0 0 560 190" width="100%" fill="currentColor" role="img" aria-label="插值查找的数组图解，数组 10 20 30 40 50 60 70 80，下标 0 到 7，目标值 50。low 在下标 0，high 在下标 7。按公式 pos 等于 0 加 50 减 10 乘 7 除以 80 减 10，结果等于 4。下标 4 的值是 50，正好等于 target，一步命中。" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto">
<g font-family="var(--font-sans)">
<text x="280" y="20" text-anchor="middle" font-size="14" font-weight="700" style="fill:var(--accent-strong)">按值估位置：一步命中</text>
<rect x="44" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="70" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">10</text><text x="70" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">0</text>
<rect x="104" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="130" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">20</text><text x="130" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">1</text>
<rect x="164" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="190" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">30</text><text x="190" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">2</text>
<rect x="224" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="250" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">40</text><text x="250" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">3</text>
<rect x="284" y="34" width="52" height="44" rx="9" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.8"/><text x="310" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">50</text><text x="310" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--accent-strong)">4</text>
<rect x="344" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="370" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">60</text><text x="370" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">5</text>
<rect x="404" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="430" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">70</text><text x="430" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">6</text>
<rect x="464" y="34" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="490" y="60" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">80</text><text x="490" y="92" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">7</text>
<line x1="70" y1="102" x2="490" y2="102" stroke="var(--accent)" stroke-width="2.5" opacity="0.55" stroke-linecap="round"/>
<line x1="70" y1="97" x2="70" y2="107" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<line x1="490" y1="97" x2="490" y2="107" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<text x="70" y="118" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">low</text>
<text x="490" y="118" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">high</text>
<line x1="310" y1="102" x2="310" y2="110" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"/>
<text x="310" y="124" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--success)">pos = 4</text>
<text x="280" y="150" text-anchor="middle" font-size="12.5" font-family="var(--font-mono)" style="fill:var(--fg)">pos = 0 + (50 - 10) × 7 / (80 - 10) = 4</text>
<text x="280" y="172" text-anchor="middle" font-size="12.5" style="fill:var(--fg)">arr[4] = 50 == target，一步命中</text>
</g>
</svg>
<figcaption style="max-width:560px;margin-left:auto;margin-right:auto">数组 10 到 80 分布均匀，按公式一次就落在下标 4。</figcaption>
</figure>

## 逐步图解

猜不中也是常态。拿同一个数组找 `target = 45`：第一轮按公式估出下标 3，一看那里是 40，比 45 小，于是把 `low` 推到 4。第二轮再估，算出下标 4，那里是 50，又比 45 大，于是把 `high` 收到 3。这时 `low` 已经越过 `high`，区间空了，说明 45 根本不在数组里。

<figure class="figure">
<svg viewBox="0 0 560 510" width="100%" fill="currentColor" role="img" aria-label="插值查找逐步图解，数组 10 20 30 40 50 60 70 80，下标 0 到 7，目标值 45。第一轮 low 等于 0，high 等于 7，按公式 pos 等于 0 加 45 减 10 乘 7 除以 80 减 10，等于 3，arr 3 等于 40 小于 45，low 推到 4。第二轮 low 等于 4，high 等于 7，pos 等于 4 加 45 减 50 乘 3 除以 80 减 50，等于 4，arr 4 等于 50 大于 45，high 收到 3。此时 low 大于 high，循环结束，返回负 1，未找到。" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto">
<g font-family="var(--font-sans)">
<text x="280" y="20" text-anchor="middle" font-size="14" font-weight="700" style="fill:var(--accent-strong)">猜不中怎么办：两轮之后仍未找到</text>
<text x="50" y="82" text-anchor="end" font-size="14" style="fill:var(--accent-strong)">①</text>
<rect x="44" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="70" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">10</text><text x="70" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">0</text>
<rect x="104" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="130" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">20</text><text x="130" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">1</text>
<rect x="164" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="190" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">30</text><text x="190" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">2</text>
<rect x="224" y="50" width="52" height="44" rx="9" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.8"/><text x="250" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">40</text><text x="250" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--accent-strong)">3</text>
<rect x="284" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="310" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">50</text><text x="310" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">4</text>
<rect x="344" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="370" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">60</text><text x="370" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">5</text>
<rect x="404" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="430" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">70</text><text x="430" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">6</text>
<rect x="464" y="50" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="490" y="76" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">80</text><text x="490" y="108" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">7</text>
<line x1="70" y1="118" x2="490" y2="118" stroke="var(--accent)" stroke-width="2.5" opacity="0.55" stroke-linecap="round"/>
<line x1="70" y1="113" x2="70" y2="123" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<line x1="490" y1="113" x2="490" y2="123" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<text x="70" y="134" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">low</text>
<text x="490" y="134" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">high</text>
<line x1="250" y1="118" x2="250" y2="126" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"/>
<text x="250" y="148" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--success)">pos = 3</text>
<text x="280" y="166" text-anchor="middle" font-size="12.5" font-family="var(--font-mono)" style="fill:var(--fg)">low = 0，high = 7，pos = 0 + (45 - 10) × 7 / (80 - 10) = 3</text>
<text x="280" y="184" text-anchor="middle" font-size="12.5" style="fill:var(--fg)">arr[3] = 40 < 45，low = pos + 1 = 4</text>
<text x="50" y="252" text-anchor="end" font-size="14" style="fill:var(--accent-strong)">②</text>
<g opacity="0.3"><rect x="44" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="70" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">10</text><text x="70" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">0</text></g>
<g opacity="0.3"><rect x="104" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="130" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">20</text><text x="130" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">1</text></g>
<g opacity="0.3"><rect x="164" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="190" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">30</text><text x="190" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">2</text></g>
<g opacity="0.3"><rect x="224" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="250" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">40</text><text x="250" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">3</text></g>
<rect x="284" y="220" width="52" height="44" rx="9" style="fill:var(--accent-soft);stroke:var(--accent)" stroke-width="1.8"/><text x="310" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">50</text><text x="310" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--accent-strong)">4</text>
<rect x="344" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="370" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">60</text><text x="370" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">5</text>
<rect x="404" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="430" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">70</text><text x="430" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">6</text>
<rect x="464" y="220" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="490" y="246" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">80</text><text x="490" y="278" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">7</text>
<line x1="310" y1="288" x2="490" y2="288" stroke="var(--accent)" stroke-width="2.5" opacity="0.55" stroke-linecap="round"/>
<line x1="310" y1="283" x2="310" y2="293" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<line x1="490" y1="283" x2="490" y2="293" stroke="var(--accent)" stroke-width="2.5" opacity="0.55"/>
<text x="310" y="304" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">low</text>
<text x="490" y="304" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--accent-strong)">high</text>
<line x1="310" y1="288" x2="310" y2="296" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"/>
<text x="310" y="318" text-anchor="middle" font-size="10" font-weight="600" font-family="var(--font-mono)" style="fill:var(--success)">pos = 4</text>
<text x="280" y="336" text-anchor="middle" font-size="12.5" font-family="var(--font-mono)" style="fill:var(--fg)">low = 4，high = 7，pos = 4 + (45 - 50) × 3 / (80 - 50) = 4</text>
<text x="280" y="354" text-anchor="middle" font-size="12.5" style="fill:var(--fg)">arr[4] = 50 > 45，high = pos - 1 = 3</text>
<text x="50" y="414" text-anchor="end" font-size="14" style="fill:var(--success)">结果</text>
<g opacity="0.3"><rect x="44" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="70" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">10</text><text x="70" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">0</text></g>
<g opacity="0.3"><rect x="104" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="130" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">20</text><text x="130" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">1</text></g>
<g opacity="0.3"><rect x="164" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="190" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">30</text><text x="190" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">2</text></g>
<g opacity="0.3"><rect x="224" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="250" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">40</text><text x="250" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">3</text></g>
<g opacity="0.3"><rect x="284" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="310" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">50</text><text x="310" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">4</text></g>
<g opacity="0.3"><rect x="344" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="370" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">60</text><text x="370" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">5</text></g>
<g opacity="0.3"><rect x="404" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="430" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">70</text><text x="430" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">6</text></g>
<g opacity="0.3"><rect x="464" y="392" width="52" height="44" rx="9" style="fill:var(--surface-2);stroke:var(--line-strong)" stroke-width="1.2"/><text x="490" y="418" text-anchor="middle" font-size="16" font-weight="600" font-family="var(--font-mono)" style="fill:var(--fg)">80</text><text x="490" y="450" text-anchor="middle" font-size="10" font-family="var(--font-mono)" style="fill:var(--fg-subtle)">7</text></g>
<text x="280" y="470" text-anchor="middle" font-size="12.5" style="fill:var(--fg)">low = 4 > high = 3，循环结束，返回 -1，未找到</text>
</g>
</svg>
<figcaption style="max-width:560px;margin-left:auto;margin-right:auto">猜不中就把区间往一边收，和二分查找一样，只是猜的位置不同。</figcaption>
</figure>

## 复杂度

平均情况下，对均匀分布的有序表，插值查找的比较次数是 $O(\log \log n)$[^2]，比二分查找的 $O(\log n)$ 更快。但它不是稳赢的：当数据分布很不均匀时，$pos$ 可能一直偏到区间边上，最坏退化成 $O(n)$，和顺序查找一样。

$O(\log \log n)$ 是个渐进结论，每轮多出来的乘法和除法也有常数开销。数据规模不够大时，它未必跑得过简单利落的二分查找。真正能拉开差距的，是键值大体均匀，一次比较成本又高的场景。

## 和二分查找对比

| 对比 | 二分查找 | 插值查找 |
| :--- | :--- | :--- |
| 猜的位置 | 下标区间的中点 | 按值离两端的比例插值出的位置 |
| 和值有关吗 | 无关，只看下标 | 有关，依赖值的大小和分布 |
| 平均比较次数 | $O(\log n)$ | $O(\log \log n)$ |
| 最坏比较次数 | $O(\log n)$ | $O(n)$ |
| 前提 | 数组有序 | 数组有序且分布大体均匀 |

## 什么时候用插值查找

对内存里的普通有序数组，二分查找的 $O(\log n)$ 已经足够快，而且它不挑数据，是最省心的默认选择。插值查找适合键值近似线性分布，比较成本高，数据量又大到 $\log \log n$ 和 $\log n$ 拉开差距的场景，比如按编号连续的电话号码和字典序条目这类数据[^3]。反过来，如果键分布明显不均，比如只有几个超大值和一大片密集小值，$pos$ 会反复偏到区间边上，这时就老老实实用二分。

## 核心代码

和二分查找几乎一样，只换 `pos` 那一行：

:::tabs

```java
class Solution {
    public int interpolationSearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        // 先保证 target 落在当前区间内，pos 才不会越界
        while (low <= high && target >= arr[low] && target <= arr[high]) {
            if (arr[low] == arr[high]) {
                return target == arr[low] ? low : -1;   // 区间里只剩同一个值，避免除以 0
            }
            // 核心公式：按值离两端的比例估一个下标
            int pos = low + (target - arr[low]) * (high - low) / (arr[high] - arr[low]);
            if (arr[pos] == target) {
                return pos;
            }
            if (arr[pos] < target) {
                low = pos + 1;
            } else {
                high = pos - 1;
            }
        }
        return -1;
    }
}
```

```cpp
class Solution {
public:
    int interpolationSearch(vector<int>& arr, int target) {
        int low = 0;
        int high = (int)arr.size() - 1;
        // 先保证 target 落在当前区间内，pos 才不会越界
        while (low <= high && target >= arr[low] && target <= arr[high]) {
            if (arr[low] == arr[high]) {
                return target == arr[low] ? low : -1;   // 区间里只剩同一个值，避免除以 0
            }
            // 核心公式：按值离两端的比例估一个下标
            int pos = low + (target - arr[low]) * (high - low) / (arr[high] - arr[low]);
            if (arr[pos] == target) {
                return pos;
            }
            if (arr[pos] < target) {
                low = pos + 1;
            } else {
                high = pos - 1;
            }
        }
        return -1;
    }
};
```

:::

和二分查找唯一的区别就在 `mid` 那一行：`mid = left + (right - left) / 2` 换成了按比例估位置的 `pos`，剩下的收缩逻辑一模一样。Java 的 `arr.length` 换成 C++ 的 `(int)arr.size()`，这个坑和二分查找里完全一样。

循环条件里多出的 `target >= arr[low] && target <= arr[high]` 不是装饰，它保证 `target` 真的落在当前区间内，`pos` 才不会被算到 `[low, high]` 外面去。`if (arr[low] == arr[high])` 那一行处理的是区间里只剩同一个值的退化情况，不判的话 `arr[high] - arr[low]` 会除以零。

还有一个溢出点：`(target - arr[low]) * (high - low)` 这两个因子的乘积可能超出 `int`。考试里数组规模有限一般没事，真要严谨就把乘出来的中间量声明成 C++ 的 `long long` 或 Java 的 `long`。

## 变体与延伸

插值查找还有不少变体。1985 年 Santoro 与 Sidney 提出了 interpolation-binary search，在插值步和二分步之间切换，试图兼得二分查找的最坏保证和插值查找的平均速度[^4]。Knuth 在《The Art of Computer Programming》第三卷第 6.2.1 节把插值查找和二分查找放在一起讨论，想继续深入可以从那里读起[^1]。

[^1]: W. W. Peterson 1957 年发表的《Addressing for Random-Access Storage》（IBM Journal of Research and Development，第 1 卷第 2 期）最早描述了插值查找，见 [ACM 数字图书馆](https://dl.acm.org/doi/10.1147/rd.12.0130)。Knuth 在《The Art of Computer Programming》第三卷《Sorting and Searching》第 6.2.1 节也讨论了它。

[^2]: 平均情况 $O(\log \log n)$ 的严格分析见 Andrew C. Yao 与 F. Frances Yao 的《The Complexity of Searching an Ordered Random Table》（FOCS 1976）。[NIST 算法词典](https://xlinux.nist.gov/dads/HTML/interpolationSearch.html)的词条也收录了这个结论。

[^3]: 插值查找的综述和常见变体见[维基百科的 Interpolation search 词条](https://en.wikipedia.org/wiki/Interpolation_search)。

[^4]: N. Santoro 与 J. B. Sidney，《Interpolation-Binary Search》，Information Processing Letters，第 20 卷，1985 年，179–181，见 [dblp](https://dblp.org/rec/journals/ipl/SantoroS85.html)。
