---
title: 'B+ 树：把数据都放到叶子上'
description: 'B+ 树是 B 树的变种，内部节点只负责指路，数据全部下沉到叶子层，叶子之间再用链表串起来，范围查询非常快。'
pubDate: 2026-10-31
category: technology
tags: ['树', 'B+ 树']
series: '数据结构笔记'
seriesOrder: 16
draft: true
subcategory: 'data-structures'
---

B+ 树是 B 树的一个变种，最大的改动是把数据全部下沉到叶子层，内部节点只负责指路，叶子之间再用链表串起来。这样范围查询只要顺着叶子链表走，不必反复回到上层。

<!-- 待写：节点结构，与 B 树的对比，范围查询，以及数据库索引为什么选 B+ 树。 -->
