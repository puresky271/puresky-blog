<script lang="ts">
  /**
   * LeetCodeCard.svelte — 力扣提交热力卡。数据是构建期快照（scripts/sync-leetcode.mjs
   * 定时生成），没有运行时刷新；快照还是空壳（fetchedAt 为空）时显示占位文案。
   */
  import { LEETCODE } from '@/config';
  import type { LeetCodeSubmissionCalendar } from '@/lib/leetcode';

  import SubmissionGraph from './SubmissionGraph.svelte';

  let { calendar }: { calendar: LeetCodeSubmissionCalendar } = $props();
</script>

<section class="card p-5" aria-labelledby="leetcode-title">
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <h2 id="leetcode-title" class="font-semibold text-fg">力扣提交</h2>
    <a class="meta hover:text-accent" href={LEETCODE.profileUrl} target="_blank" rel="noopener noreferrer">@{LEETCODE.username}</a>
  </div>
  {#if calendar.fetchedAt}
    <p class="mt-1 text-sm text-fg-muted">
      过去一年 <span class="tabular text-fg">{calendar.total.toLocaleString('zh-CN')}</span> 次提交 · 更新于 {new Date(calendar.fetchedAt).toLocaleDateString('zh-CN')}
    </p>
    <div class="mt-4"><SubmissionGraph {calendar} /></div>
  {:else}
    <p class="mt-3 text-sm text-fg-muted">提交热力数据将在首次同步后显示。</p>
  {/if}
</section>
