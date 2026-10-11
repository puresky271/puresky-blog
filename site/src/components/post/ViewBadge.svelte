<script lang="ts">
  /**
   * ViewBadge.svelte — 列表卡片上的阅读量小标（眼睛图标 + 次数）。
   *
   * 只读不上报：列表页不算浏览，进了文章页才由 ViewCount 记数。
   * 拿不到数据就什么都不显示。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { api } from '@/lib/api';
  import { formatCount } from '@/lib/format';
  import { iEye } from '@/lib/icons.generated';

  let { slug }: { slug: string } = $props();
  let views = $state<number | null>(null);

  onMount(async () => {
    try {
      const data = await api<{ views: number }>(`/api/views/${slug}`, { credentials: 'omit' });
      views = data.views;
    } catch {
      views = null;
    }
  });
</script>

{#if views !== null}
  <span class="views" aria-label="{views} 次阅读">
    <span aria-hidden="true">·</span>
    <Icon icon={iEye} size={13} />
    <span class="tabular">{formatCount(views)}</span>
  </span>
{/if}

<style>
  .views {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
</style>
