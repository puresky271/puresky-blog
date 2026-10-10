/**
 * client.ts — 编辑器前端调用 /__editor/api 的封装。每个请求都带 x-puresky-editor 头（后端靠它挡跨站请求）。
 */

export interface PostSummary {
  slug: string;
  ext: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  pubDate: string | null;
  updatedDate: string | null;
  series: string | null;
  seriesOrder: number | null;
  cover: string | null;
  draft: boolean;
  archived: boolean;
  featured: boolean;
  words: number;
  mtime: number;
  error: string | null;
}

export type Frontmatter = Record<string, unknown> & {
  title?: string;
  description?: string;
  pubDate?: string;
  updatedDate?: string;
  category?: string;
  tags?: string[];
  series?: string;
  seriesOrder?: number;
  cover?: string;
  coverAlt?: string;
  featured?: boolean;
  draft?: boolean;
  archived?: boolean;
  commentsOff?: boolean;
  mayBeStale?: boolean;
};

export interface PostFile {
  slug: string;
  ext: string;
  frontmatter: Frontmatter;
  body: string;
  mtime: number;
}

export interface Category {
  id: string;
  label: string;
  blurb: string;
}
export interface TagGroup {
  id: string;
  label: string;
  blurb: string;
}
export interface Tag {
  name: string;
  slug: string;
  group: string;
  blurb: string;
}
export interface Vocab {
  categories: Category[];
  tagGroups: TagGroup[];
  tags: Tag[];
  /** 每个分类 / 标签被多少篇文章用着。 */
  usage: { categories: Record<string, number>; tags: Record<string, number> };
}

export type VocabOp =
  | { kind: 'category' | 'group'; action: 'create'; item: Category | TagGroup }
  | { kind: 'category' | 'group'; action: 'update'; id: string; item: Omit<Category, 'id'> }
  | { kind: 'category' | 'group'; action: 'delete'; id: string }
  | { kind: 'category' | 'group'; action: 'move'; id: string; delta: number }
  | { kind: 'tag'; action: 'create'; item: Tag }
  | { kind: 'tag'; action: 'update'; name: string; item: Omit<Tag, 'slug'> }
  | { kind: 'tag'; action: 'delete'; name: string }
  | { kind: 'tag'; action: 'move'; name: string; delta: number };

export type SeriesOp = { action: 'order'; name: string; slugs: string[] } | { action: 'rename'; from: string; to: string };

/** 批量操作改到的文章：新的 frontmatter 和文件修改时间，用来同步正在编辑的那一篇。 */
export interface ChangedPost {
  slug: string;
  frontmatter: Frontmatter;
  mtime: number;
}

export interface GitChange {
  /** 相对仓库根的路径，提交和看 diff 都用它。 */
  path: string;
  /** git status 的原始两位状态码。 */
  xy: string;
  code: 'A' | 'M' | 'D';
  kind: 'post' | 'image' | 'config' | 'other';
  slug: string | null;
  /** 相对文章目录的路径（config.ts 就是 config.ts）。 */
  name: string;
  added: number | null;
  removed: number | null;
}

export interface Commit {
  hash: string;
  short: string;
  subject: string;
  when: string;
  files: { code: 'A' | 'M' | 'D'; path: string; kind: GitChange['kind']; slug: string | null; name: string }[];
  /** 没有上游分支时为 null。 */
  pushed?: boolean | null;
  head?: boolean;
}

export interface GitStatus {
  branch: string | null;
  upstream: boolean;
  ahead: number;
  behind: number;
  changes: GitChange[];
  last: { hash: string; subject: string; when: string } | null;
  remote: string | null;
  /** 要推送的提交（不限于文章目录）。 */
  unpushed: Commit[];
}

export interface DiffResult {
  path: string;
  binary: boolean;
  /** 是图片时，相对文章目录的路径，可以经 asset 接口预览。 */
  image: string | null;
  deleted: boolean;
  /** 从第一个 @@ 开始的统一 diff 文本。 */
  text: string;
}

export class ApiError extends Error {
  readonly status: number;
  /** 后端给的错误种类：conflict（文件在别处被改过）、exists、offline（连不上 dev server）。 */
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const BASE = '/__editor/api';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'x-puresky-editor': '1', ...(init.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError('连不上 dev server，它可能正在重启', 0, 'offline');
  }
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) {
    const { error, code } = data as { error?: string; code?: string };
    throw new ApiError(error ?? `HTTP ${response.status}`, response.status, code);
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const api = {
  ping: () => call<{ ok: true; boot: string }>('/ping'),
  list: () => call<{ posts: PostSummary[] }>('/posts').then((r) => r.posts),
  read: (slug: string) => call<PostFile>(`/post?slug=${encodeURIComponent(slug)}`),
  save: (payload: { slug: string; previousSlug?: string | null; frontmatter: Frontmatter; body: string; create?: boolean; baseMtime?: number | null; force?: boolean }) =>
    post<{ slug: string; ext: string; mtime: number; body: string; frontmatter: Frontmatter }>('/post', payload),
  remove: (slug: string) => call<{ ok: true }>(`/post?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  preview: (slug: string, body: string) => post<{ html: string; headings: { depth: number; slug: string; text: string }[] }>('/preview', { slug, body }),
  upload: (slug: string, file: File) =>
    call<{ path: string }>(`/upload?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(file.name || 'image.png')}`, {
      method: 'POST',
      body: file,
      headers: { 'content-type': 'application/octet-stream' },
    }),
  vocab: () => call<Vocab>('/vocab'),
  /** restart：config.ts 真的变了，dev server 马上会重启；boot 是这次请求时的服务实例，用来判断重启完成没有。 */
  vocabOp: (op: VocabOp) => post<{ vocab: Vocab; changed: ChangedPost[]; restart: boolean; boot: string }>('/vocab', op),
  series: (op: SeriesOp) => post<{ changed: ChangedPost[] }>('/series', op),
  git: () => call<GitStatus>('/git'),
  diff: (path: string) => call<DiffResult>(`/git/diff?path=${encodeURIComponent(path)}`),
  log: () => call<{ commits: Commit[]; undo: { ok: boolean; reason: string } }>('/git/log'),
  commit: (message: string, files: string[]) => post<{ log: string; hash: string | null; status: GitStatus }>('/git/commit', { message, files }),
  push: () => post<{ log: string; status: GitStatus }>('/git/push', {}),
  pull: () => post<{ log: string; status: GitStatus }>('/git/pull', {}),
  undo: () => post<{ message: string; status: GitStatus }>('/git/undo', {}),
};

/** 文章目录里的图片（./images/…）在编辑器里经 asset 接口显示。 */
export function assetUrl(rel: string): string {
  return `${BASE}/asset?p=${encodeURIComponent(rel.startsWith('./') ? rel : `./${rel}`)}`;
}
