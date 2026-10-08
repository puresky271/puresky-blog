<script lang="ts">
  /**
   * ActivityList.svelte — GitHub 动态列表。
   *
   * 相对时间只在客户端算：构建时算出的「3 天前」部署一周后就是错的。
   * 服务端先输出绝对日期，挂载后换成相对时间。
   */
  import { onMount } from 'svelte';

  import type { GitHubEvent } from '@shared/github';

  import Icon from '@/components/ui/Icon.svelte';
  import { formatMonthDay, formatRelative } from '@/lib/format';
  import {
    iBookBookmark,
    iChatCenteredText,
    iCheckCircle,
    iCircleDashed,
    iGitBranch,
    iGitCommit,
    iGitFork,
    iGitMerge,
    iGitPullRequest,
    iGlobe,
    iStar,
    iTagSimple,
    iTrash,
    type IconData,
  } from '@/lib/icons.generated';

  let {
    events,
    limit = events.length,
    dense = false,
  }: { events: GitHubEvent[]; limit?: number; dense?: boolean } = $props();

  let now = $state<Date | null>(null);
  onMount(() => {
    now = new Date();
    const timer = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(timer);
  });

  function iconOf(event: GitHubEvent): IconData {
    switch (event.kind) {
      case 'push':
        return iGitCommit;
      case 'pr':
        return event.title.startsWith('合并') ? iGitMerge : iGitPullRequest;
      case 'review':
        return iGitPullRequest;
      case 'issue':
        return event.title.startsWith('关闭') ? iCheckCircle : iCircleDashed;
      case 'comment':
        return iChatCenteredText;
      case 'star':
        return iStar;
      case 'fork':
        return iGitFork;
      case 'create':
        return event.title === '创建仓库' ? iBookBookmark : iGitBranch;
      case 'delete':
        return iTrash;
      case 'release':
        return iTagSimple;
      case 'public':
        return iGlobe;
      default:
        return iGitCommit;
    }
  }

  const shortRepo = (repo: string) => repo.split('/')[1] ?? repo;
  const shown = $derived(events.slice(0, limit));
</script>

<ol class="activity" class:dense>
  {#each shown as event (event.id)}
    <li>
      <span class="icon" data-kind={event.kind}><Icon icon={iconOf(event)} size={15} /></span>
      <div class="min-w-0 flex-1">
        <p class="line">
          <a href={event.url} target="_blank" rel="noopener noreferrer" class="title">{event.title}</a>
          <a href={event.repoUrl} target="_blank" rel="noopener noreferrer" class="repo">{shortRepo(event.repo)}</a>
        </p>
        {#if event.detail}
          <p class="detail">{event.detail}</p>
        {/if}
      </div>
      <time class="time" datetime={event.createdAt} title={new Date(event.createdAt).toLocaleString('zh-CN')}>
        {now ? formatRelative(event.createdAt, now) : formatMonthDay(event.createdAt)}
      </time>
    </li>
  {/each}
</ol>

<style>
  .activity {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .activity.dense {
    gap: 0.75rem;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
  }
  .icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--fg-muted);
  }
  .icon[data-kind='star'] {
    color: var(--warning);
  }
  .icon[data-kind='pr'],
  .icon[data-kind='release'] {
    color: var(--accent);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.4rem;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .title {
    color: var(--fg);
    font-weight: 500;
  }
  .title:hover {
    color: var(--accent);
  }
  .repo {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .repo:hover {
    color: var(--fg);
  }
  .detail {
    margin-top: 0.1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .time {
    flex-shrink: 0;
    padding-top: 0.15rem;
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
</style>
