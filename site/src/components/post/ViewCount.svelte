<script lang="ts">
  /**
   * ViewCount.svelte — 浏览数。
   *
   * 每个会话每篇只上报一次（sessionStorage 记一下），刷新不重复计。
   * 服务端另有按天的访客去重，这里只是少发无意义的请求。拿不到就什么都不显示。
   */
  import { onMount } from 'svelte';

  import { api } from '@/lib/api';
  import { formatCount } from '@/lib/format';

  let { slug }: { slug: string } = $props();
  let views = $state<number | null>(null);

  onMount(async () => {
    const key = `viewed:${slug}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === '1';
    } catch {
      // 读不到就当没看过。
    }
    try {
      const data = await api<{ views: number }>(`/api/views/${slug}`, {
        method: seen ? 'GET' : 'POST',
        credentials: 'omit',
      });
      views = data.views;
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        // 存不进去只是下次会多报一次，服务端还会去重。
      }
    } catch {
      views = null;
    }
  });
</script>

{#if views !== null}
  <span aria-hidden="true">·</span>
  <span class="tabular">{formatCount(views)} 次阅读</span>
{/if}
