<script lang="ts">
  /**
   * 分页：上一页、页码、下一页，点页码切换当前页。
   *
   * 页码按钮带 aria-current="page"，到首尾时上一页或下一页自动禁用；
   * 原站的分页是上一篇和下一篇导航，这里按文章需求改成带页码的版本。
   */
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const TOTAL = 5;
  let page = $state(3);

  function go(next: number) {
    page = Math.min(TOTAL, Math.max(1, next));
  }
</script>

<div class="gi-demo">
  <nav class="gi-pagination" aria-label="分页">
    <button
      type="button"
      class="gi-page"
      disabled={page === 1}
      aria-label="上一页"
      onclick={() => go(page - 1)}
    >
      <GiIcon name="chevron-left" />
      上一页
    </button>

    {#each Array.from({ length: TOTAL }, (_, index) => index + 1) as number (number)}
      <button
        type="button"
        class="gi-page"
        aria-current={page === number ? 'page' : undefined}
        aria-label={`第 ${number} 页`}
        onclick={() => go(number)}
      >
        {number}
      </button>
    {/each}

    <button
      type="button"
      class="gi-page"
      disabled={page === TOTAL}
      aria-label="下一页"
      onclick={() => go(page + 1)}
    >
      下一页
      <GiIcon name="chevron-right" />
    </button>
  </nav>

  <p class="gi-hint">点击页码或上一页、下一页切换，当前页会反色高亮，到首页和末页时对应按钮自动禁用。</p>
</div>
