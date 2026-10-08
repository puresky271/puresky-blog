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
        if (fresh?.username) this.data = fresh;
        this.status = 'live';
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

export const githubLive = new GitHubLive();
