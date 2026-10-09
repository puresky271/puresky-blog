/**
 * github-live.svelte.ts — GitHub 数据的运行时刷新。
 *
 * 页面首屏渲染的是构建期快照；组件挂载后调 refresh()，从 worker 取最新数据替换。
 * 同一页上多个组件共用一次请求（首页的 GitHub 卡和动态卡）。
 */

import type { GitHubOverview } from '@shared/github';

import { api } from '@/lib/api';

/** 首页只需要快照的一部分，裁掉仓库列表之类的大字段再序列化进页面。 */
export type GitHubSlice = Pick<GitHubOverview, 'username' | 'fetchedAt' | 'user' | 'status' | 'calendar' | 'events' | 'totals' | 'languages'> & {
  repoCount: number;
};

class GitHubLive {
  data = $state<GitHubOverview | GitHubSlice | null>(null);
  status = $state<'snapshot' | 'refreshing' | 'live' | 'stale'>('snapshot');

  #request: Promise<void> | null = null;

  /** 用快照初始化。已经有更新的数据时不覆盖。 */
  seed(snapshot: GitHubOverview | GitHubSlice | null): void {
    if (!this.data || (snapshot && snapshot.fetchedAt > this.data.fetchedAt)) this.data = snapshot;
  }

  refresh(): Promise<void> {
    this.#request ??= (async () => {
      this.status = 'refreshing';
      try {
        const fresh = await api<GitHubOverview>('/api/github/overview', { timeoutMs: 12000 });
        if (!fresh?.username) throw new Error('GitHub 数据格式不对');
        this.data = merge(this.data, fresh);
        // 有块没拉到时页面上一部分还是旧数据，不能标成实时。
        this.status = fresh.missing?.length ? 'stale' : 'live';
      } catch {
        this.status = 'stale';
        // 失败后允许下次再试。
        this.#request = null;
      }
    })();
    return this.#request;
  }

  get repoCount(): number {
    const data = this.data;
    if (!data) return 0;
    if ('repoCount' in data) return data.repoCount;
    return data.user?.publicRepos ?? data.repos.length;
  }
}

/**
 * 把刷新结果并进手里的数据。worker 标为 missing 的块（这次没拉到、它那边也没有旧值可补）
 * 保留手里的值，不让一次限流把首屏快照冲成空的。这时整体的更新时间也按旧数据算。
 */
function merge(prev: GitHubOverview | GitHubSlice | null, fresh: GitHubOverview): GitHubOverview | GitHubSlice {
  const missing = new Set(fresh.missing ?? []);
  if (!prev || missing.size === 0) return fresh;

  const merged: GitHubOverview = {
    ...fresh,
    fetchedAt: prev.fetchedAt,
    user: missing.has('user') ? prev.user : fresh.user,
    status: missing.has('status') ? prev.status : fresh.status,
    calendar: missing.has('calendar') ? prev.calendar : fresh.calendar,
    events: missing.has('events') ? prev.events : fresh.events,
  };
  if (!missing.has('repos')) return merged;

  // 语言和 Star 总数由仓库列表算出，仓库没拉到时一起沿用旧值。
  merged.repos = 'repos' in prev ? prev.repos : [];
  merged.languages = prev.languages;
  merged.totals = prev.totals;
  return 'repoCount' in prev ? { ...merged, repoCount: prev.repoCount } : merged;
}

export const githubLive = new GitHubLive();
