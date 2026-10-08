<script lang="ts">
  /**
   * ActivityView.svelte — GitHub 动态页的主体。首屏是构建期快照，挂载后从 worker 刷新。
   */
  import { onMount } from 'svelte';

  import type { GitHubOverview } from '@shared/github';

  import Icon from '@/components/ui/Icon.svelte';
  import { formatCount, formatDate, formatRelative } from '@/lib/format';
  import { githubLive } from '@/lib/github-live.svelte';
  import { iArrowUpRight, iBuildings, iGitFork, iGithubLogo, iGlobe, iMapPin, iStar } from '@/lib/icons.generated';

  import ActivityList from './ActivityList.svelte';
  import ContributionGraph from './ContributionGraph.svelte';

  let { snapshot, username }: { snapshot: GitHubOverview | null; username: string } = $props();

  // 只用首屏快照做一次初始化，之后的数据由 refresh() 更新，所以这里有意只读初始值。
  // svelte-ignore state_referenced_locally
  githubLive.seed(snapshot);
  const data = $derived(githubLive.data as GitHubOverview | null);
  let now = $state<Date | null>(null);

  onMount(() => {
    now = new Date();
    void githubLive.refresh().then(() => (now = new Date()));
  });

  const repos = $derived(
    data && 'repos' in data ? [...data.repos].filter((r) => !r.archived).sort((a, b) => b.stars - a.stars || b.pushedAt.localeCompare(a.pushedAt)).slice(0, 8) : []
  );
  const totalLangRepos = $derived(data?.languages.reduce((n, l) => n + l.repos, 0) ?? 0);
</script>

{#if !data}
  <div class="empty card">
    <Icon icon={iGithubLogo} size={28} class="text-fg-subtle" />
    <p>GitHub 数据暂时拉不到。</p>
    <a class="link" href={`https://github.com/${username}`} target="_blank" rel="noopener noreferrer">直接去 GitHub 主页</a>
  </div>
{:else}
  <section class="card profile">
    {#if data.user}
      <img src={`${data.user.avatarUrl}${data.user.avatarUrl.includes('?') ? '&' : '?'}s=144`} alt="" width="72" height="72" class="avatar" />
    {/if}
    <div class="min-w-0 flex-1">
      <h2 class="text-xl font-semibold text-fg">{data.user?.name ?? username}</h2>
      <p class="font-mono text-sm text-fg-muted">@{username}</p>
      {#if data.status?.message}
        <p class="status">{#if data.status.emoji}<span aria-hidden="true">{data.status.emoji}</span>{/if}{data.status.message}</p>
      {/if}
      {#if data.user?.bio}<p class="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{data.user.bio}</p>{/if}
      <p class="facts">
        {#if data.user?.company}<span><Icon icon={iBuildings} size={14} />{data.user.company}</span>{/if}
        {#if data.user?.location}<span><Icon icon={iMapPin} size={14} />{data.user.location}</span>{/if}
        {#if data.user?.blog}<a href={data.user.blog.startsWith('http') ? data.user.blog : `https://${data.user.blog}`} target="_blank" rel="noopener noreferrer"><Icon icon={iGlobe} size={14} />{data.user.blog.replace(/^https?:\/\//, '')}</a>{/if}
        {#if data.user?.createdAt}<span>加入于 {formatDate(data.user.createdAt)}</span>{/if}
      </p>
    </div>
    <dl class="numbers">
      <div><dt>关注者</dt><dd class="tabular">{formatCount(data.user?.followers ?? 0)}</dd></div>
      <div><dt>关注</dt><dd class="tabular">{formatCount(data.user?.following ?? 0)}</dd></div>
      <div><dt>公开仓库</dt><dd class="tabular">{formatCount(data.user?.publicRepos ?? 0)}</dd></div>
      <div><dt>获得 Star</dt><dd class="tabular">{formatCount(data.totals.stars)}</dd></div>
    </dl>
  </section>

  <section class="card mt-5 p-5" aria-labelledby="graph-title">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="graph-title" class="font-semibold text-fg">
        过去一年 <span class="tabular">{formatCount(data.calendar?.total ?? 0)}</span> 次贡献
      </h2>
      <p class="meta" title={new Date(data.fetchedAt).toLocaleString('zh-CN')}>
        {githubLive.status === 'live' ? '实时数据' : `数据更新于 ${now ? formatRelative(data.fetchedAt, now) : '构建时'}`}
      </p>
    </div>
    <div class="mt-4">
      {#if data.calendar}
        <ContributionGraph calendar={data.calendar} cell={12} />
      {:else}
        <p class="text-sm text-fg-muted">贡献日历这次没拉到。</p>
      {/if}
    </div>

    {#if data.languages.length}
      <div class="mt-6 border-t border-line pt-5">
        <h3 class="text-sm font-medium text-fg">常用语言</h3>
        <div class="langbar" role="img" aria-label={data.languages.map((l) => `${l.name} ${l.repos} 个仓库`).join('，')}>
          {#each data.languages as lang}
            <span style="flex: {lang.repos}; background: {lang.color}" title={`${lang.name} · ${lang.repos} 个仓库`}></span>
          {/each}
        </div>
        <ul class="langs">
          {#each data.languages as lang}
            <li>
              <span class="dot" style="background: {lang.color}"></span>
              <span class="text-fg">{lang.name}</span>
              <span class="tabular text-fg-subtle">{Math.round((lang.repos / totalLangRepos) * 100)}%</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
    <section class="card p-5" aria-labelledby="events-title">
      <h2 id="events-title" class="font-semibold text-fg">最近动态</h2>
      <div class="mt-4">
        {#if data.events.length}
          <ActivityList events={data.events} />
        {:else}
          <p class="text-sm text-fg-muted">最近没有公开动态。</p>
        {/if}
      </div>
    </section>

    <section class="card p-5" aria-labelledby="repos-title">
      <h2 id="repos-title" class="font-semibold text-fg">仓库</h2>
      {#if repos.length}
        <ul class="mt-3 divide-y divide-line">
          {#each repos as repo (repo.fullName)}
            <li>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" class="repo">
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate font-medium text-fg">{repo.name}</span>
                  <Icon icon={iArrowUpRight} size={13} class="shrink-0 text-fg-subtle" />
                </span>
                {#if repo.description}<span class="desc">{repo.description}</span>{/if}
                <span class="meta flex flex-wrap items-center gap-x-3">
                  {#if repo.language}<span class="inline-flex items-center gap-1.5"><span class="dot" style="background: {repo.languageColor ?? 'var(--fg-subtle)'}"></span>{repo.language}</span>{/if}
                  <span class="inline-flex items-center gap-1"><Icon icon={iStar} size={13} />{formatCount(repo.stars)}</span>
                  <span class="inline-flex items-center gap-1"><Icon icon={iGitFork} size={13} />{formatCount(repo.forks)}</span>
                  <span>{now ? formatRelative(repo.pushedAt, now) : formatDate(repo.pushedAt)}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mt-3 text-sm text-fg-muted">还没有公开仓库。</p>
      {/if}
    </section>
  </div>
{/if}

<style>
  .empty {
    display: grid;
    place-items: center;
    gap: 0.6rem;
    padding: 4rem 1rem;
    color: var(--fg-muted);
  }
  .profile {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1.25rem 1.5rem;
    padding: 1.5rem;
  }
  .avatar {
    width: 72px;
    height: 72px;
    border-radius: 999px;
    background: var(--surface-2);
    box-shadow: 0 0 0 3px var(--surface), 0 0 0 4px var(--line);
  }
  .status {
    display: inline-flex;
    gap: 0.4rem;
    margin-top: 0.6rem;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    font-size: 0.8125rem;
    color: var(--fg);
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin-top: 0.75rem;
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .facts > :global(*) {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .facts a:hover {
    color: var(--accent);
  }
  .numbers {
    display: grid;
    grid-template-columns: repeat(4, auto);
    gap: 1.5rem;
  }
  @media (width < 40rem) {
    .numbers {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }
  }
  .numbers dt {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .numbers dd {
    margin-top: 0.15rem;
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--fg);
  }
  .langbar {
    display: flex;
    gap: 2px;
    height: 8px;
    margin-top: 0.75rem;
    border-radius: 999px;
    overflow: hidden;
  }
  .langs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin-top: 0.75rem;
    font-size: 0.8125rem;
  }
  .langs li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }
  .repo {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem 0;
  }
  .repo:hover .font-medium {
    color: var(--accent);
  }
  .desc {
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--fg-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
