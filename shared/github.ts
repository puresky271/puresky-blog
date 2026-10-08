/**
 * github.ts — GitHub 数据的抓取与归一化。
 *
 * site 构建期（生成首屏快照）和 worker 运行时（定时刷新）共用这一份实现，
 * 保证首屏的数据和刷新后的数据是同一个形状、同一套文案。
 *
 * 数据来源分两档：
 *   有 token：GraphQL 拿贡献日历、个人状态、仓库（含语言颜色）。
 *   无 token：REST 拿资料和仓库，贡献日历从公开的 contributions 页面解析。
 * 每一块独立失败，拿到多少用多少，不因为一块挂了让整个面板空掉。
 */

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  createdAt: string;
}

export interface GitHubStatus {
  emoji: string | null;
  message: string | null;
  busy: boolean;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionCalendar {
  total: number;
  /** 按周分组，每周从周日开始。第一周和最后一周可能不满 7 天。 */
  weeks: ContributionDay[][];
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
  topics: string[];
  archived: boolean;
}

export type GitHubEventKind =
  | 'push'
  | 'pr'
  | 'review'
  | 'issue'
  | 'comment'
  | 'star'
  | 'fork'
  | 'create'
  | 'delete'
  | 'release'
  | 'public'
  | 'other';

export interface GitHubEvent {
  id: string;
  kind: GitHubEventKind;
  repo: string;
  repoUrl: string;
  title: string;
  detail: string | null;
  url: string;
  createdAt: string;
}

export interface GitHubLanguage {
  name: string;
  color: string;
  /** 以该语言为主语言的仓库数。 */
  repos: number;
}

export interface GitHubOverview {
  username: string;
  fetchedAt: string;
  source: 'graphql' | 'rest';
  user: GitHubUser | null;
  status: GitHubStatus | null;
  calendar: ContributionCalendar | null;
  repos: GitHubRepo[];
  events: GitHubEvent[];
  languages: GitHubLanguage[];
  totals: { stars: number; forks: number };
}

export interface GitHubFetchOptions {
  token?: string;
  userAgent: string;
  /** 单个请求超时。默认 8 秒。 */
  timeoutMs?: number;
  /** 补取提交信息的推送事件数量上限。每条一个请求，所以要克制。 */
  enrichPushes?: number;
}

const API = 'https://api.github.com';

/**
 * REST 模式下没有语言颜色，用 linguist 的常见值兜底。
 * 只收录个人项目里常见的那些，没收录的显示成中性灰。
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#663399',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Shell: '#89e051',
  PowerShell: '#012456',
  Lua: '#000080',
  Dart: '#00B4AB',
  Ruby: '#701516',
  PHP: '#4F5D95',
  MATLAB: '#e16737',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
  MDX: '#fcb32c',
};

const FALLBACK_LANGUAGE_COLOR = '#8b949e';

export async function fetchGitHubOverview(
  username: string,
  options: GitHubFetchOptions
): Promise<GitHubOverview> {
  const ctx = new Ctx(options);

  const graph = options.token ? ctx.graphql(username) : Promise.resolve(null);

  const [userResult, graphResult, reposResult, eventsResult] = await Promise.allSettled([
    ctx.rest<RestUser>(`/users/${encodeURIComponent(username)}`),
    graph,
    options.token
      ? Promise.resolve(null)
      : ctx.rest<RestRepo[]>(
          `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&per_page=100`
        ),
    ctx.rest<RestEvent[]>(`/users/${encodeURIComponent(username)}/events/public?per_page=60`),
  ]);

  const user = userResult.status === 'fulfilled' ? normalizeUser(userResult.value) : null;
  const graphData = graphResult.status === 'fulfilled' ? graphResult.value : null;

  let calendar: ContributionCalendar | null = graphData?.calendar ?? null;
  if (!calendar) {
    // GraphQL 不可用时退回解析公开页面。这个页面不需要登录，也不占 API 配额。
    calendar = await ctx.scrapeCalendar(username).catch(() => null);
  }

  let repos: GitHubRepo[] = graphData?.repos ?? [];
  if (!graphData && reposResult.status === 'fulfilled' && reposResult.value) {
    repos = reposResult.value.filter((r) => !r.fork).map(normalizeRestRepo);
  }

  const rawEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
  const events = await ctx.normalizeEvents(rawEvents, options.enrichPushes ?? 4);

  return {
    username,
    fetchedAt: new Date().toISOString(),
    source: graphData ? 'graphql' : 'rest',
    user,
    status: graphData?.status ?? null,
    calendar,
    repos,
    events,
    languages: summarizeLanguages(repos),
    totals: {
      stars: repos.reduce((sum, r) => sum + r.stars, 0),
      forks: repos.reduce((sum, r) => sum + r.forks, 0),
    },
  };
}

// ── 请求上下文 ───────────────────────────────────────────────────────────────

class Ctx {
  constructor(private readonly options: GitHubFetchOptions) {}

  private headers(accept = 'application/vnd.github+json'): Record<string, string> {
    const headers: Record<string, string> = {
      accept,
      'user-agent': this.options.userAgent,
      'x-github-api-version': '2022-11-28',
    };
    if (this.options.token) headers.authorization = `Bearer ${this.options.token}`;
    return headers;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async rest<T>(path: string): Promise<T> {
    const response = await this.request(`${API}${path}`, { headers: this.headers() });
    if (!response.ok) throw new Error(`GitHub REST ${path} → ${response.status}`);
    return (await response.json()) as T;
  }

  async graphql(login: string): Promise<GraphResult | null> {
    const response = await this.request(`${API}/graphql`, {
      method: 'POST',
      headers: { ...this.headers('application/json'), 'content-type': 'application/json' },
      body: JSON.stringify({ query: GRAPH_QUERY, variables: { login } }),
    });
    if (!response.ok) throw new Error(`GitHub GraphQL → ${response.status}`);

    const payload = (await response.json()) as { data?: { user?: GraphUser | null } };
    const node = payload.data?.user;
    if (!node) return null;

    const weeks = node.contributionsCollection.contributionCalendar.weeks.map((week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: GRAPH_LEVELS[day.contributionLevel] ?? 0,
      }))
    );

    return {
      calendar: {
        total: node.contributionsCollection.contributionCalendar.totalContributions,
        weeks,
      },
      status: node.status
        ? {
            emoji: node.status.emojiHTML ? stripTags(node.status.emojiHTML) || null : null,
            message: node.status.message || null,
            busy: node.status.indicatesLimitedAvailability,
          }
        : null,
      repos: node.repositories.nodes
        .filter((r) => !r.isFork)
        .map((r) => ({
          name: r.name,
          fullName: r.nameWithOwner,
          description: r.description,
          url: r.url,
          homepage: r.homepageUrl || null,
          language: r.primaryLanguage?.name ?? null,
          languageColor: r.primaryLanguage?.color ?? null,
          stars: r.stargazerCount,
          forks: r.forkCount,
          pushedAt: r.pushedAt,
          topics: r.repositoryTopics.nodes.map((t) => t.topic.name),
          archived: r.isArchived,
        })),
    };
  }

  async scrapeCalendar(login: string): Promise<ContributionCalendar | null> {
    const response = await this.request(
      `https://github.com/users/${encodeURIComponent(login)}/contributions`,
      { headers: { accept: 'text/html', 'user-agent': this.options.userAgent } }
    );
    if (!response.ok) return null;
    return parseContributionsHtml(await response.text());
  }

  async normalizeEvents(raw: RestEvent[], enrichLimit: number): Promise<GitHubEvent[]> {
    const seenPushes = new Set<number>();
    const events: GitHubEvent[] = [];
    const pushesToEnrich: { event: GitHubEvent; repo: string; sha: string }[] = [];

    for (const event of raw) {
      // 同一次推送会以多条事件出现，按 push_id 去重。
      if (event.type === 'PushEvent' && typeof event.payload.push_id === 'number') {
        if (seenPushes.has(event.payload.push_id)) continue;
        seenPushes.add(event.payload.push_id);
      }

      const normalized = normalizeEvent(event);
      if (!normalized) continue;
      events.push(normalized);

      if (
        event.type === 'PushEvent' &&
        !normalized.detail &&
        typeof event.payload.head === 'string' &&
        pushesToEnrich.length < enrichLimit
      ) {
        pushesToEnrich.push({ event: normalized, repo: event.repo.name, sha: event.payload.head });
      }

      if (events.length >= 30) break;
    }

    // 2025 年起公开事件里的 PushEvent 不再带提交列表，只剩 head sha。
    // 对最近几条单独取一次提交信息，其余的只显示分支名。
    await Promise.allSettled(
      pushesToEnrich.map(async ({ event, repo, sha }) => {
        const commit = await this.rest<{ commit: { message: string } }>(
          `/repos/${repo}/commits/${sha}`
        );
        event.detail = firstLine(commit.commit.message);
      })
    );

    return events;
  }
}

// ── 归一化 ───────────────────────────────────────────────────────────────────

function normalizeUser(raw: RestUser): GitHubUser {
  return {
    login: raw.login,
    name: raw.name || null,
    avatarUrl: raw.avatar_url,
    url: raw.html_url,
    bio: raw.bio || null,
    company: raw.company || null,
    location: raw.location || null,
    blog: raw.blog || null,
    followers: raw.followers,
    following: raw.following,
    publicRepos: raw.public_repos,
    createdAt: raw.created_at,
  };
}

function normalizeRestRepo(raw: RestRepo): GitHubRepo {
  return {
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    url: raw.html_url,
    homepage: raw.homepage || null,
    language: raw.language,
    languageColor: raw.language ? (LANGUAGE_COLORS[raw.language] ?? FALLBACK_LANGUAGE_COLOR) : null,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    pushedAt: raw.pushed_at,
    topics: raw.topics ?? [],
    archived: raw.archived,
  };
}

function normalizeEvent(event: RestEvent): GitHubEvent | null {
  const repo = event.repo.name;
  const repoUrl = `https://github.com/${repo}`;
  const p = event.payload;
  const base = { id: event.id, repo, repoUrl, createdAt: event.created_at, detail: null };

  switch (event.type) {
    case 'PushEvent': {
      const branch = refName(p.ref);
      const commits = Array.isArray(p.commits) ? p.commits : [];
      const last = commits[commits.length - 1];
      return {
        ...base,
        kind: 'push',
        title: commits.length > 1 ? `推送 ${commits.length} 个提交到 ${branch}` : `推送到 ${branch}`,
        detail: last?.message ? firstLine(last.message) : null,
        url: p.head ? `${repoUrl}/commit/${p.head}` : repoUrl,
      };
    }
    case 'PullRequestEvent': {
      const pr = p.pull_request;
      if (!pr) return null;
      const verb =
        p.action === 'closed' ? (pr.merged ? '合并' : '关闭') : p.action === 'reopened' ? '重新打开' : '发起';
      return {
        ...base,
        kind: 'pr',
        title: `${verb} PR #${pr.number}`,
        detail: pr.title ?? null,
        url: pr.html_url ?? repoUrl,
      };
    }
    case 'PullRequestReviewEvent': {
      const pr = p.pull_request;
      if (!pr) return null;
      return {
        ...base,
        kind: 'review',
        title: `评审 PR #${pr.number}`,
        detail: pr.title ?? null,
        url: p.review?.html_url ?? pr.html_url ?? repoUrl,
      };
    }
    case 'IssuesEvent': {
      const issue = p.issue;
      if (!issue) return null;
      const verb = p.action === 'closed' ? '关闭' : p.action === 'reopened' ? '重新打开' : '提出';
      return {
        ...base,
        kind: 'issue',
        title: `${verb} issue #${issue.number}`,
        detail: issue.title ?? null,
        url: issue.html_url ?? repoUrl,
      };
    }
    case 'IssueCommentEvent': {
      const issue = p.issue;
      if (!issue) return null;
      return {
        ...base,
        kind: 'comment',
        title: `评论 #${issue.number}`,
        detail: p.comment?.body ? truncate(firstLine(p.comment.body), 90) : (issue.title ?? null),
        url: p.comment?.html_url ?? issue.html_url ?? repoUrl,
      };
    }
    case 'WatchEvent':
      return { ...base, kind: 'star', title: 'Star 了仓库', url: repoUrl };
    case 'ForkEvent':
      return {
        ...base,
        kind: 'fork',
        title: 'Fork 了仓库',
        url: p.forkee?.html_url ?? repoUrl,
      };
    case 'CreateEvent': {
      if (p.ref_type === 'repository') {
        return { ...base, kind: 'create', title: '创建仓库', detail: p.description ?? null, url: repoUrl };
      }
      const label = p.ref_type === 'tag' ? '标签' : '分支';
      return { ...base, kind: 'create', title: `创建${label} ${p.ref ?? ''}`.trim(), url: repoUrl };
    }
    case 'DeleteEvent': {
      const label = p.ref_type === 'tag' ? '标签' : '分支';
      return { ...base, kind: 'delete', title: `删除${label} ${p.ref ?? ''}`.trim(), url: repoUrl };
    }
    case 'ReleaseEvent': {
      const release = p.release;
      if (!release) return null;
      return {
        ...base,
        kind: 'release',
        title: `发布 ${release.tag_name}`,
        detail: release.name && release.name !== release.tag_name ? release.name : null,
        url: release.html_url ?? repoUrl,
      };
    }
    case 'PublicEvent':
      return { ...base, kind: 'public', title: '公开了仓库', url: repoUrl };
    default:
      return null;
  }
}

function summarizeLanguages(repos: GitHubRepo[]): GitHubLanguage[] {
  const counts = new Map<string, GitHubLanguage>();
  for (const repo of repos) {
    if (!repo.language || repo.archived) continue;
    const entry = counts.get(repo.language) ?? {
      name: repo.language,
      color: repo.languageColor ?? FALLBACK_LANGUAGE_COLOR,
      repos: 0,
    };
    entry.repos += 1;
    counts.set(repo.language, entry);
  }
  return [...counts.values()].sort((a, b) => b.repos - a.repos).slice(0, 6);
}

/**
 * 解析 github.com/users/:login/contributions 返回的 HTML 片段。
 *
 * 每天是一个带 data-date / data-level 的 td，具体次数在通过 for 关联的 tool-tip 里。
 * 属性顺序 GitHub 改过不止一次，所以逐个属性取，不依赖顺序。
 */
export function parseContributionsHtml(html: string): ContributionCalendar | null {
  const tooltips = new Map<string, number>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g)) {
    const target = attr(match[1] ?? '', 'for');
    if (!target) continue;
    const count = /^(\d[\d,]*)\s+contribution/.exec((match[2] ?? '').trim());
    tooltips.set(target, count?.[1] ? Number(count[1].replace(/,/g, '')) : 0);
  }

  const days: ContributionDay[] = [];
  for (const match of html.matchAll(/<td\b([^>]*\bdata-date="[^"]+"[^>]*)>/g)) {
    const attrs = match[1] ?? '';
    const date = attr(attrs, 'data-date');
    if (!date) continue;
    const level = Math.min(4, Math.max(0, Number(attr(attrs, 'data-level') ?? 0))) as ContributionDay['level'];
    const id = attr(attrs, 'id');
    days.push({ date, level, count: id ? (tooltips.get(id) ?? 0) : 0 });
  }

  if (days.length === 0) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));

  const weeks: ContributionDay[][] = [];
  for (const day of days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    const last = weeks[weeks.length - 1];
    if (weekday === 0 || !last) weeks.push([day]);
    else last.push(day);
  }

  const totalMatch = /([\d,]+)\s+contributions?\s+in the last year/.exec(html);
  const total = totalMatch?.[1]
    ? Number(totalMatch[1].replace(/,/g, ''))
    : days.reduce((sum, d) => sum + d.count, 0);

  return { total, weeks };
}

// ── 小工具 ───────────────────────────────────────────────────────────────────

function attr(source: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(source);
  return match?.[1] ?? null;
}

function refName(ref: unknown): string {
  return typeof ref === 'string' ? ref.replace(/^refs\/(heads|tags)\//, '') : 'main';
}

function firstLine(text: string): string {
  return (text.split('\n')[0] ?? '').trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

// ── 原始响应类型 ─────────────────────────────────────────────────────────────

interface RestUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

interface RestRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  topics?: string[];
  fork: boolean;
  archived: boolean;
}

interface RestEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  // payload 形状随事件类型变化，这里只声明用得到的字段。
  payload: {
    push_id?: number;
    ref?: string;
    ref_type?: string;
    head?: string;
    description?: string;
    action?: string;
    commits?: { message: string }[];
    pull_request?: { number: number; title?: string; html_url?: string; merged?: boolean };
    review?: { html_url?: string };
    issue?: { number: number; title?: string; html_url?: string };
    comment?: { body?: string; html_url?: string };
    forkee?: { html_url?: string };
    release?: { tag_name: string; name?: string; html_url?: string };
  };
}

interface GraphUser {
  status: { emojiHTML: string | null; message: string | null; indicatesLimitedAvailability: boolean } | null;
  contributionsCollection: {
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
    };
  };
  repositories: {
    nodes: {
      name: string;
      nameWithOwner: string;
      description: string | null;
      url: string;
      homepageUrl: string | null;
      stargazerCount: number;
      forkCount: number;
      pushedAt: string;
      isFork: boolean;
      isArchived: boolean;
      primaryLanguage: { name: string; color: string | null } | null;
      repositoryTopics: { nodes: { topic: { name: string } }[] };
    }[];
  };
}

interface GraphResult {
  calendar: ContributionCalendar;
  status: GitHubStatus | null;
  repos: GitHubRepo[];
}

const GRAPH_LEVELS: Record<string, ContributionDay['level']> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const GRAPH_QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      status {
        emojiHTML
        message
        indicatesLimitedAvailability
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        nodes {
          name
          nameWithOwner
          description
          url
          homepageUrl
          stargazerCount
          forkCount
          pushedAt
          isFork
          isArchived
          primaryLanguage {
            name
            color
          }
          repositoryTopics(first: 5) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
`;
