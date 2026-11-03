---
title: 'B 树：把树压矮一点'
description: 'B 树是一种多路平衡查找树，一个节点里放一组有序的键，孩子数量也远多于两个，适合一次读一整页的磁盘存储。'
pubDate: 2026-10-30
category: technology
tags: ['树', 'B 树']
series: '数据结构笔记'
seriesOrder: 15
draft: true
subcategory: 'data-structures'
---

B 树和前面讲的二叉查找树和 AVL 树最大的区别是：一个节点里不只放一个键，而是放一组有序的键，孩子数量也远多于两个。节点里能放的键越多，同样数量的数据需要的层数就越少，访问磁盘的次数也就越少。

<!-- 待写：阶与节点结构，查找，插入与分裂，删除与合并，2-3 树作为低阶特例，按页大小估算 fan-out。 -->
