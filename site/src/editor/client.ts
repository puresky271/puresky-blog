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
  draft: boolean;
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

export interface GitStatus {
  branch: string | null;
  upstream: boolean;
  ahead: number;
  behind: number;
  changes: { code: string; file: string }[];
  last: { hash: string; subject: string; when: string } | null;
  remote: string | null;
}

const BASE = '/__editor/api';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'x-puresky-editor': '1', ...(init.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}), ...init.headers },
  });
  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
  return data as T;
}

export const api = {
  list: () => call<{ posts: PostSummary[] }>('/posts').then((r) => r.posts),
  read: (slug: string) => call<PostFile>(`/post?slug=${encodeURIComponent(slug)}`),
  save: (payload: { slug: string; previousSlug?: string | null; frontmatter: Frontmatter; body: string; create?: boolean }) =>
    call<{ slug: string; ext: string; mtime: number; body: string }>('/post', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (slug: string) => call<{ ok: true }>(`/post?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  preview: (slug: string, body: string) =>
    call<{ html: string; headings: { depth: number; slug: string; text: string }[] }>('/preview', { method: 'POST', body: JSON.stringify({ slug, body }) }),
  upload: (slug: string, file: File) =>
    call<{ path: string }>(`/upload?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(file.name || 'image.png')}`, {
      method: 'POST',
      body: file,
      headers: { 'content-type': 'application/octet-stream' },
    }),
  git: () => call<GitStatus>('/git'),
  publish: (message: string) => call<{ log: string; status: GitStatus }>('/git/publish', { method: 'POST', body: JSON.stringify({ message }) }),
  pull: () => call<{ log: string; status: GitStatus }>('/git/pull', { method: 'POST', body: '{}' }),
};
