<script lang="ts">
  /**
   * GitHubWidgets.svelte — 首页的两张 GitHub 卡片：贡献概览、最近动态。
   *
   * 一个岛屿渲染两张卡（astro-island 默认 display: contents，不影响外层网格），
   * 这样两张卡共用一次刷新请求，数据也一定是同一时刻的。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import ContributionGraph from '@/components/github/ContributionGraph.svelte';
  import ActivityList from '@/components/github/ActivityList.svelte';
  import { formatCount, formatRelative, withBase } from '@/lib/format';
  import { githubLive, type GitHubSlice } from '@/lib/github-live.svelte';
  import { iArrowRight, iArrowUpRight, iGitCommit, iGithubLogo } from '@/lib/icons.generated';

  let { snapshot, username }: { snapshot: GitHubSlice | null; username: string } = $props();

  // 只用首屏快照做一次初始化，之后的数据由 refresh() 更新，所以这里有意只读初始值。
  // svelte-ignore state_referenced_locally
  githubLive.seed(snapshot);
  const data = $derived(githubLive.data);

  let now = $state<Date | null>(null);
  onMount(() => {
    now = new Date();
    void githubLive.refresh().then(() => (now = new Date()));
  });

  const stats = $derived(
    data
      ? [
          { label: '过去一年贡献', value: data.calendar?.total ?? 0 },
          { label: '公开仓库', value: githubLive.repoCount },
          { label: '获得 Star', value: data.totals.stars },
          { label: '关注者', value: data.user?.followers ?? 0 },
        ]
      : []
  );
</script>

<article class="card gh-card area-github">
  <header class="flex items-center justify-between gap-3">
    <span class="widget-label"><Icon icon={iGithubLogo} size={15} />GitHub</span>
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 font-mono text-[0.8125rem] text-fg-muted transition-colors hover:text-fg"
    >
      @{username}<Icon icon={iArrowUpRight} size={13} />
    </a>
  </header>

  {#if data?.status?.message || data?.status?.emoji}
    <p class="status">
      {#if data.status.emoji}<span aria-hidden="true">{data.status.emoji}</span>{/if}
      <span class="truncate">{data.status.message ?? ''}</span>
      {#if data.status.busy}<span class="busy">忙碌中</span>{/if}
    </p>
  {/if}

  {#if data?.calendar}
    <div class="mt-4">
      <ContributionGraph calendar={data.calendar} />
    </div>
  {:else if data}
    <p class="empty">贡献日历这次没拉到，GitHub 可能在限流。</p>
  {/if}

  {#if data}
    <dl class="stats">
      {#each stats as stat}
        <div>
          <dt>{stat.label}</dt>
          <dd class="tabular">{formatCount(stat.value)}</dd>
        </div>
      {/each}
    </dl>
  {:else}
    <div class="empty-block">
      <p>GitHub 数据暂时拉不到。</p>
      <a class="link" href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">直接去主页看</a>
    </div>
  {/if}

  {#if data}
    <p class="freshness" title={new Date(data.fetchedAt).toLocaleString('zh-CN')}>
      <span class="live-dot" class:on={githubLive.status === 'live'} aria-hidden="true"></span>
      {#if githubLive.status === 'live'}
        实时数据
      {:else if githubLive.status === 'refreshing'}
        正在刷新
      {:else}
        数据更新于 {now ? formatRelative(data.fetchedAt, now) : '构建时'}
      {/if}
    </p>
  {/if}
</article>

<article class="card gh-card area-activity">
  <header class="flex items-center justify-between">
    <span class="widget-label"><Icon icon={iGitCommit} size={15} />最近动态</span>
    <a href={withBase('/activity/')} class="more">全部<Icon icon={iArrowRight} size={13} /></a>
  </header>
  <div class="mt-4">
    {#if data?.events.length}
      <ActivityList events={data.events} limit={5} dense />
    {:else if data}
      <p class="empty">最近没有公开动态。</p>
    {:else}
      <div class="space-y-4">
        {#each [80, 65, 72] as width}
          <div class="flex gap-3">
            <div class="skeleton h-7 w-7 !rounded-full"></div>
            <div class="flex-1 space-y-2">
              <div class="skeleton h-3.5" style="width: {width}%"></div>
              <div class="skeleton h-3 w-1/2"></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</article>

<style>
  .gh-card {
    padding: 1.25rem;
    min-width: 0;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    max-width: 100%;
    margin-top: 0.85rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    font-size: 0.8125rem;
    color: var(--fg);
  }
  .busy {
    flex-shrink: 0;
    font-size: 0.6875rem;
    color: var(--warning);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  @media (width >= 40rem) {
    .stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  .stats dt {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .stats dd {
    margin-top: 0.15rem;
    font-size: 1.375rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--fg);
  }
  .freshness {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1rem;
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  /* 表示数据新鲜度的真实状态：实时拉到为蓝，快照为灰。 */
  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--fg-subtle);
  }
  .live-dot.on {
    background: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent);
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.8125rem;
    color: var(--fg-muted);
    transition: color 160ms ease;
  }
  .more:hover {
    color: var(--accent);
  }
  .empty {
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--fg-muted);
  }
  .empty-block {
    display: grid;
    place-items: center;
    gap: 0.5rem;
    min-height: 9rem;
    font-size: 0.875rem;
    color: var(--fg-muted);
  }
</style>
