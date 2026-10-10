/**
 * store.svelte.ts — 编辑器各部分共享的状态和操作。
 *
 * 左栏的文章列表、中间的写作区、右栏的文章设置、整理面板、Git 面板都读写这一份：
 * 文章列表、词表、Git 状态、正在编辑的文章，以及轻提示和确认框。
 * 打开 / 保存 / 删除 / 一键发布、改词表、改系列这些会动到不止一个面板的操作也都在这里。
 */

import { api, ApiError, type ChangedPost, type Frontmatter, type GitChange, type GitStatus, type PostSummary, type SeriesOp, type Vocab, type VocabOp } from './client';

export type Mode = 'write' | 'organize' | 'git';
export type View = 'write' | 'split' | 'preview';

export interface Doc {
  slug: string;
  /** 文件里现在的 slug；新文章为 null。改了 slug 保存时据此改名。 */
  previousSlug: string | null;
  /** 打开时的 slug。改过名的文章发布时，旧文件的删除也算这一篇的改动。 */
  openedAs: string | null;
  isNew: boolean;
  frontmatter: Frontmatter;
  body: string;
  /** 磁盘上文件的修改时间。保存时据此发现文件在编辑器之外被改过。新文章为 null。 */
  mtime: number | null;
}

export interface Issue {
  field: string;
  text: string;
  level: 'error' | 'warn';
}

/** CodeEditor 对外的方法，写作区挂载后注册进来，工具栏、大纲、图片上传都通过它操作正文。 */
export interface CodeEditorHandle {
  load(doc: string): void;
  wrap(before: string, after: string, fallback?: string): void;
  prefix(mark: string): void;
  insert(text: string, block?: boolean): void;
  heading(level: number): void;
  codeBlock(lang: string): void;
  callout(kind: string): void;
  footnote(): void;
  pickImages(files: File[]): void;
  jumpTo(line: number): void;
  undo(): void;
  redo(): void;
  focus(): void;
}

interface ToastAction {
  label: string;
  href?: string;
  run?: () => void;
}
interface Toast {
  id: number;
  kind: 'ok' | 'error' | 'info';
  text: string;
  action?: ToastAction;
}
interface Choice {
  id: string;
  label: string;
  kind?: 'primary' | 'danger' | 'ghost';
}
interface ConfirmBox {
  title: string;
  text: string;
  choices: Choice[];
  resolve: (id: string | null) => void;
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const DRAFT_KEY = 'puresky-editor:draft:';
const UI_KEY = 'puresky-editor:ui';
const DEFAULT_FALSE = ['featured', 'draft', 'archived', 'commentsOff', 'mayBeStale'];

/**
 * 用来判断「有没有改过」的快照。frontmatter 先规整一遍：Svelte 的双向绑定会把 undefined 的字段写回成
 * false 或空字符串，这些和「没写」是一回事，不能算改动。
 */
function normalized(fm: Frontmatter): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(fm).sort()) {
    const value = fm[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (DEFAULT_FALSE.includes(key) && value === false) continue;
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}
const snapshot = (d: Doc) => JSON.stringify({ s: d.slug, f: normalized(d.frontmatter), b: d.body });

/** 去掉空值、整理类型，再交给后端序列化。 */
function cleaned(fm: Frontmatter): Frontmatter {
  const out: Frontmatter = {};
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const v = value.trim();
      if (v) out[key] = v;
    } else if (Array.isArray(value)) {
      if (value.length) out[key] = [...value];
    } else out[key] = value;
  }
  if (out.seriesOrder !== undefined) out.seriesOrder = Number(out.seriesOrder) || undefined;
  return out;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function relative(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return new Date(ms).toLocaleDateString('zh-CN');
}

export function countText(body: string) {
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~[\]()!|-]/g, ' ');
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length ?? 0;
  return { words: cjk + latin, minutes: Math.max(1, Math.round(cjk / 380 + latin / 220)) };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class EditorStore {
  // ── 界面 ─────────────────────────────────────────────────────────────────
  mode = $state<Mode>('write');
  sidebar = $state(true);
  inspector = $state(true);
  inspectorTab = $state<'settings' | 'outline'>('settings');
  view = $state<View>('split');
  organizeTab = $state<'categories' | 'tags' | 'series'>('categories');
  /** 从文章设置跳到「整理 → 系列」时要选中的系列。 */
  seriesFocus = $state<string | null>(null);
  /** 最近一次 Git 操作的输出，在提交面板里显示。 */
  gitLog = $state('');

  // ── 数据 ─────────────────────────────────────────────────────────────────
  posts = $state<PostSummary[]>([]);
  vocab = $state<Vocab>({ categories: [], tagGroups: [], tags: [], usage: { categories: {}, tags: {} } });
  git = $state<GitStatus | null>(null);
  /** 改了词表、dev server 正在重启。这期间不能保存，写作不受影响。 */
  restarting = $state(false);
  gitBusy = $state(false);

  // ── 正在编辑的文章 ───────────────────────────────────────────────────────
  doc = $state<Doc | null>(null);
  /** 换文章时加一，写作区据此重置预览。 */
  docVersion = $state(0);
  saved = $state('');
  saving = $state(false);
  savedAt = $state<number | null>(null);
  publishing = $state(false);
  restore = $state<{ savedAt: number; doc: Doc } | null>(null);
  cursor = $state({ line: 1, col: 1, lines: 1, selected: 0 });
  cm: CodeEditorHandle | null = null;
  /** 预览滚到第 index 个标题（写作区注册，大纲调用）。 */
  revealHeading: ((index: number) => void) | null = null;

  dirty = $derived(this.doc ? snapshot(this.doc) !== this.saved : false);

  issues = $derived.by<Issue[]>(() => {
    const doc = this.doc;
    if (!doc) return [];
    const fm = doc.frontmatter;
    const list: Issue[] = [];
    const title = String(fm.title ?? '').trim();
    const description = String(fm.description ?? '').trim();
    const chosen = fm.tags ?? [];
    if (!SLUG.test(doc.slug)) list.push({ field: 'slug', text: '链接只能用小写字母、数字和连字符', level: 'error' });
    if (!title) list.push({ field: 'title', text: '还没有标题', level: 'error' });
    else if (title.length > 80) list.push({ field: 'title', text: `标题超过 80 字（现在 ${title.length}）`, level: 'error' });
    if (description.length < 10) list.push({ field: 'description', text: '摘要至少 10 个字', level: 'error' });
    else if (description.length > 200) list.push({ field: 'description', text: `摘要超过 200 字（现在 ${description.length}）`, level: 'error' });
    if (!fm.pubDate) list.push({ field: 'pubDate', text: '缺少发布日期', level: 'error' });
    if (this.vocab.categories.length && !this.vocab.categories.some((c) => c.id === fm.category)) list.push({ field: 'category', text: '选一个分类', level: 'error' });
    const unknown = this.vocab.tags.length ? chosen.filter((t) => !this.vocab.tags.some((x) => x.name === t)) : [];
    if (unknown.length) list.push({ field: 'tags', text: `词表里没有：${unknown.join('、')}`, level: 'error' });
    if (chosen.length > 6) list.push({ field: 'tags', text: '标签最多 6 个', level: 'error' });
    else if (chosen.length < 3) list.push({ field: 'tags', text: '建议 3 到 5 个标签', level: 'warn' });
    if (fm.cover && !String(fm.cover).startsWith('./')) list.push({ field: 'cover', text: '封面要用文章目录里的图片（./images/…）', level: 'error' });
    if (fm.series) {
      if (!fm.seriesOrder) list.push({ field: 'series', text: '设了系列，最好也给个序号', level: 'warn' });
      else {
        const twin = this.posts.find((p) => p.slug !== doc.previousSlug && p.series === fm.series && p.seriesOrder === Number(fm.seriesOrder));
        if (twin) list.push({ field: 'series', text: `序号 ${fm.seriesOrder} 和《${twin.title}》重复了`, level: 'warn' });
      }
    }
    if (!doc.body.trim()) list.push({ field: 'body', text: '正文还是空的', level: 'warn' });
    return list;
  });
  errors = $derived(this.issues.filter((i) => i.level === 'error'));

  /** 当前文章离 GitHub 还差哪一步：没保存 / 没提交 / 没推送 / 已同步。 */
  docSync = $derived.by<'unsaved' | 'uncommitted' | 'unpushed' | 'synced' | 'unknown' | null>(() => {
    if (!this.doc) return null;
    if (this.doc.isNew || this.dirty) return 'unsaved';
    if (!this.git) return 'unknown';
    if (this.relatedChanges(this.git).length) return 'uncommitted';
    if (this.git.ahead) return 'unpushed';
    return 'synced';
  });

  // ── 轻提示和确认框 ───────────────────────────────────────────────────────
  toasts = $state<Toast[]>([]);
  confirmBox = $state<ConfirmBox | null>(null);
  #toastId = 0;

  toast(kind: Toast['kind'], text: string, action?: ToastAction) {
    const id = ++this.#toastId;
    this.toasts = [...this.toasts, { id, kind, text, action }];
    setTimeout(() => this.dismiss(id), kind === 'error' ? 7000 : action ? 5000 : 2600);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  choose(title: string, text: string, choices: Choice[]): Promise<string | null> {
    return new Promise((resolve) => (this.confirmBox = { title, text, choices, resolve }));
  }

  async ask(title: string, text: string, ok: string, danger = false): Promise<boolean> {
    return (await this.choose(title, text, [{ id: 'ok', label: ok, kind: danger ? 'danger' : 'primary' }])) === 'ok';
  }

  answer(id: string | null) {
    this.confirmBox?.resolve(id);
    this.confirmBox = null;
  }

  // ── 读取 ─────────────────────────────────────────────────────────────────

  async loadPosts() {
    try {
      this.posts = await api.list();
    } catch (error) {
      this.toast('error', `读取文章列表失败：${message(error)}`);
    }
  }

  async loadVocab() {
    try {
      this.vocab = await api.vocab();
    } catch (error) {
      this.toast('error', `读取分类和标签失败：${message(error)}`);
    }
  }

  async refreshGit(quiet = false) {
    try {
      this.git = await api.git();
    } catch (error) {
      this.git = null;
      if (!quiet) this.toast('error', `读取 Git 状态失败：${message(error)}`);
    }
  }

  loadAll() {
    return Promise.all([this.loadPosts(), this.loadVocab(), this.refreshGit(true)]);
  }

  // ── 打开与新建 ───────────────────────────────────────────────────────────

  setDoc(next: Doc, keepSnapshot = false) {
    this.doc = next;
    if (!keepSnapshot) this.saved = snapshot(next);
    this.docVersion += 1;
    this.cm?.load(next.body);
  }

  async confirmLeave(action: string): Promise<boolean> {
    if (!this.dirty) return true;
    return this.ask('放弃未保存的修改？', `当前文章有没保存的改动，${action}后会丢失（本地草稿仍会保留一份）。`, `放弃并${action}`, true);
  }

  async open(slug: string) {
    this.mode = 'write';
    if (this.doc && slug === this.doc.previousSlug) return;
    if (!(await this.confirmLeave('切换'))) return;
    try {
      const file = await api.read(slug);
      this.setDoc({ slug: file.slug, previousSlug: file.slug, openedAs: file.slug, isNew: false, frontmatter: { tags: [], ...file.frontmatter }, body: file.body, mtime: file.mtime });
      this.savedAt = file.mtime;
      history.replaceState(null, '', `?post=${encodeURIComponent(file.slug)}`);
      this.checkLocalDraft();
    } catch (error) {
      this.toast('error', message(error));
    }
  }

  async newPost() {
    this.mode = 'write';
    if (!(await this.confirmLeave('新建'))) return false;
    const date = today();
    let slug = `post-${date.replace(/-/g, '')}`;
    for (let i = 2; this.posts.some((p) => p.slug === slug); i += 1) slug = `post-${date.replace(/-/g, '')}-${i}`;
    const category = this.vocab.categories.some((c) => c.id === 'essays') ? 'essays' : (this.vocab.categories[0]?.id ?? '');
    this.setDoc({ slug, previousSlug: null, openedAs: null, isNew: true, frontmatter: { title: '', description: '', pubDate: date, category, tags: [], draft: true }, body: '', mtime: null });
    this.savedAt = null;
    this.restore = null;
    this.inspector = true;
    this.inspectorTab = 'settings';
    history.replaceState(null, '', '?new');
    return true;
  }

  close() {
    this.doc = null;
    this.saved = '';
    this.restore = null;
    history.replaceState(null, '', location.pathname);
  }

  // ── 保存与删除 ───────────────────────────────────────────────────────────

  /** 保存到磁盘。成功返回 true。 */
  async save(force = false): Promise<boolean> {
    const doc = this.doc;
    if (!doc || this.saving) return false;
    if (this.restarting) {
      this.toast('info', 'dev server 正在重启，稍等一下再保存');
      return false;
    }
    if (this.errors.length) {
      this.inspector = true;
      this.inspectorTab = 'settings';
      this.toast('error', `还有 ${this.errors.length} 个问题：${this.errors[0]!.text}`);
      return false;
    }
    this.saving = true;
    try {
      const result = await api.save({
        slug: doc.slug,
        previousSlug: doc.isNew ? null : doc.previousSlug,
        frontmatter: cleaned(doc.frontmatter),
        body: doc.body,
        create: doc.isNew,
        baseMtime: doc.mtime,
        force,
      });
      const oldKey = DRAFT_KEY + (doc.previousSlug ?? 'new');
      if (result.body !== doc.body) {
        doc.body = result.body;
        this.cm?.load(result.body);
      }
      if (result.frontmatter.cover !== doc.frontmatter.cover) doc.frontmatter.cover = result.frontmatter.cover as string | undefined;
      doc.previousSlug = result.slug;
      doc.isNew = false;
      doc.mtime = result.mtime;
      this.saved = snapshot(doc);
      this.savedAt = Date.now();
      try {
        localStorage.removeItem(oldKey);
        localStorage.removeItem(DRAFT_KEY + result.slug);
      } catch {
        // 写不了 localStorage 也不影响保存。
      }
      history.replaceState(null, '', `?post=${encodeURIComponent(result.slug)}`);
      this.toast('ok', '已保存');
      await Promise.all([this.loadPosts(), this.refreshGit(true)]);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'conflict') return this.resolveConflict();
      this.toast('error', `保存失败：${message(error)}`);
      return false;
    } finally {
      this.saving = false;
    }
  }

  /** 文件在编辑器之外被改过：让用户选覆盖，还是丢掉这边的修改、载入磁盘上的版本。 */
  private async resolveConflict(): Promise<boolean> {
    const doc = this.doc;
    if (!doc) return false;
    const pick = await this.choose('文件在别处被改过', '打开这篇之后，磁盘上的文件被别的程序（或者 git）改过了。用编辑器里的内容覆盖它，还是丢掉这边的修改、载入磁盘上的版本？', [
      { id: 'reload', label: '载入磁盘版本', kind: 'ghost' },
      { id: 'force', label: '覆盖', kind: 'danger' },
    ]);
    if (pick === 'force') {
      this.saving = false;
      return this.save(true);
    }
    if (pick === 'reload' && doc.previousSlug) {
      const file = await api.read(doc.previousSlug);
      this.setDoc({ ...doc, slug: file.slug, frontmatter: { tags: [], ...file.frontmatter }, body: file.body, mtime: file.mtime });
      this.toast('info', '已载入磁盘上的版本');
    }
    return false;
  }

  async remove() {
    const doc = this.doc;
    if (!doc) return;
    if (doc.isNew) {
      this.close();
      return;
    }
    const title = doc.frontmatter.title || doc.slug;
    if (!(await this.ask(`删除《${title}》？`, '文章文件和它的图片目录会从磁盘上删掉。文章提交之前还能用 git 找回，图片不在仓库里，删了就找不回了。只想让它从列表里消失，可以改成「归档」。', '删除', true))) return;
    try {
      await api.remove(doc.previousSlug!);
      this.toast('ok', '已删除');
      this.close();
      await Promise.all([this.loadPosts(), this.refreshGit(true)]);
    } catch (error) {
      this.toast('error', message(error));
    }
  }

  // ── 本地草稿 ─────────────────────────────────────────────────────────────

  draftKey(doc: Doc) {
    return DRAFT_KEY + (doc.previousSlug ?? 'new');
  }

  checkLocalDraft() {
    this.restore = null;
    if (!this.doc) return;
    try {
      const raw = localStorage.getItem(this.draftKey(this.doc));
      if (!raw) return;
      const entry = JSON.parse(raw) as { savedAt: number; doc: Doc };
      if (snapshot(entry.doc) !== this.saved) this.restore = entry;
    } catch {
      // 草稿坏了就当没有。
    }
  }

  applyRestore() {
    if (!this.restore || !this.doc) return;
    // 草稿里的 mtime 是当时的，沿用现在文件的，冲突检测才准确。
    this.setDoc({ ...this.restore.doc, mtime: this.doc.mtime, openedAs: this.doc.openedAs }, true);
    this.restore = null;
    this.toast('info', '已恢复本地草稿，记得保存');
  }

  dropRestore() {
    if (!this.doc) return;
    try {
      localStorage.removeItem(this.draftKey(this.doc));
    } catch {
      // 忽略。
    }
    this.restore = null;
  }

  // ── 批量改动后同步正在编辑的文章 ─────────────────────────────────────────

  /**
   * 整理面板改了系列、标签改了名，后端会直接改文章文件。正在编辑的那篇如果被改到：
   * 没有未保存的修改就整体换成新的 frontmatter；有的话只把这几个字段合进来，正文和别的字段保留。
   * 两种情况都更新文件修改时间，免得下次保存被当成外部改动。
   */
  applyChanged(changed: ChangedPost[], rename?: { from: string; to: string }) {
    const doc = this.doc;
    if (!doc || !doc.previousSlug) return;
    const hit = changed.find((c) => c.slug === doc.previousSlug);
    if (!hit) return;
    const wasDirty = this.dirty;
    const saved = JSON.parse(this.saved) as { s: string; f: Record<string, unknown>; b: string };
    saved.f = normalized(hit.frontmatter);
    this.saved = JSON.stringify(saved);
    doc.mtime = hit.mtime;
    if (!wasDirty) {
      doc.frontmatter = { tags: [], ...hit.frontmatter };
      return;
    }
    for (const key of ['series', 'seriesOrder'] as const) {
      if (hit.frontmatter[key] === undefined) delete doc.frontmatter[key];
      else (doc.frontmatter as Record<string, unknown>)[key] = hit.frontmatter[key];
    }
    if (rename) doc.frontmatter.tags = (doc.frontmatter.tags ?? []).map((t) => (t === rename.from ? rename.to : t));
  }

  // ── 词表和系列 ───────────────────────────────────────────────────────────

  /**
   * 改词表。config.ts 一变 dev server 就会重启（两三秒），重启之后内容集合才按新词表校验，
   * 所以这里等到新的服务实例起来再刷新数据。等待期间写作不受影响，只是暂时不能保存。
   */
  async vocabOp(op: VocabOp): Promise<boolean> {
    if (this.restarting) {
      this.toast('info', '上一个改动还在应用中，稍等一下');
      return false;
    }
    try {
      const result = await api.vocabOp(op);
      this.vocab = result.vocab;
      const rename = op.kind === 'tag' && op.action === 'update' && op.name !== op.item.name ? { from: op.name, to: op.item.name } : undefined;
      this.applyChanged(result.changed, rename);
      if (result.restart) await this.waitForRestart(result.boot);
      await this.loadAll();
      return true;
    } catch (error) {
      this.toast('error', message(error));
      return false;
    }
  }

  private async waitForRestart(boot: string) {
    this.restarting = true;
    const deadline = Date.now() + 60_000;
    try {
      while (Date.now() < deadline) {
        await sleep(400);
        try {
          if ((await api.ping()).boot !== boot) return;
        } catch {
          // 重启中，连不上是正常的。
        }
      }
      this.toast('error', 'dev server 一分钟内没有重启完，看一下终端里的输出');
    } finally {
      this.restarting = false;
    }
  }

  async seriesOp(op: SeriesOp): Promise<boolean> {
    try {
      const { changed } = await api.series(op);
      this.applyChanged(changed);
      await Promise.all([this.loadPosts(), this.refreshGit(true)]);
      return true;
    } catch (error) {
      this.toast('error', message(error));
      return false;
    }
  }

  // ── Git ──────────────────────────────────────────────────────────────────

  /**
   * 和当前文章有关的改动：它的文件（含改名前的旧文件），以及 config.ts（文章可能用了新建的标签）。
   * 文章图片已经 gitignore，不会出现在改动里；万一有以前提交过的图片，也按 slug 算进这一篇。
   */
  relatedChanges(status: GitStatus): GitChange[] {
    const doc = this.doc;
    if (!doc) return [];
    const slugs = new Set([doc.slug, doc.previousSlug, doc.openedAs].filter(Boolean));
    return status.changes.filter((c) => (c.slug && slugs.has(c.slug)) || c.kind === 'config');
  }

  titleOf(slug: string) {
    return this.posts.find((p) => p.slug === slug)?.title ?? slug;
  }

  /** 按改动自动写提交说明：文章：新增《A》，更新《B》；词表：更新分类与标签。 */
  commitMessage(changes: GitChange[]): string {
    const bySlug = new Map<string, GitChange[]>();
    for (const c of changes) if (c.slug) bySlug.set(c.slug, [...(bySlug.get(c.slug) ?? []), c]);
    const added: string[] = [];
    const updated: string[] = [];
    const removed: string[] = [];
    for (const [slug, list] of bySlug) {
      const file = list.find((c) => c.kind === 'post');
      if (file?.code === 'A') added.push(`《${this.titleOf(slug)}》`);
      else if (file?.code === 'D') removed.push(slug);
      else updated.push(`《${this.titleOf(slug)}》${file ? '' : '的图片'}`);
    }
    const parts = [added.length ? `新增${added.join('')}` : '', updated.length ? `更新${updated.join('')}` : '', removed.length ? `删除 ${removed.join('、')}` : ''].filter(Boolean);
    const config = changes.some((c) => c.kind === 'config');
    const posts = parts.length ? `文章：${parts.join('，')}` : '';
    if (posts && config) return `${posts}；词表：更新分类与标签`;
    return posts || (config ? '词表：更新分类与标签' : '文章：更新');
  }

  commitUrl(hash: string | null) {
    return hash && this.git?.remote?.startsWith('https://github.com/') ? `${this.git.remote}/commit/${hash}` : undefined;
  }

  /** 提交勾选的文件；push 为 true 时接着推送。成功返回 true，输出写进 gitLog。 */
  async commit(files: string[], msg: string, push: boolean): Promise<boolean> {
    if (this.gitBusy) return false;
    this.gitBusy = true;
    this.gitLog = push ? '正在提交并推送……' : '正在提交……';
    let log = '';
    try {
      const committed = await api.commit(msg, files);
      log = committed.log;
      this.git = committed.status;
      if (push) {
        const pushed = await api.push();
        log += `\n${pushed.log}`;
        this.git = pushed.status;
      }
      this.gitLog = log;
      const href = this.commitUrl(committed.hash);
      this.toast('ok', push ? '已提交并推送到 GitHub' : '已提交，还没推送', push && href ? { label: '在 GitHub 上看', href } : undefined);
      return true;
    } catch (error) {
      this.gitLog = [log, message(error)].filter(Boolean).join('\n');
      this.toast('error', push && log ? '提交成功，推送失败，看一下日志' : '提交失败，看一下日志');
      await this.refreshGit(true);
      return false;
    } finally {
      this.gitBusy = false;
    }
  }

  async gitAction(kind: 'push' | 'pull') {
    if (this.gitBusy) return;
    this.gitBusy = true;
    this.gitLog = kind === 'push' ? '正在推送……' : '正在拉取……';
    try {
      const result = kind === 'push' ? await api.push() : await api.pull();
      this.git = result.status;
      this.gitLog = result.log;
      this.toast('ok', kind === 'push' ? '已推送到 GitHub' : '已和远端同步');
      if (kind === 'pull') await this.loadAll();
    } catch (error) {
      this.gitLog = message(error);
      this.toast('error', kind === 'push' ? '推送失败，看一下日志' : '拉取失败，看一下日志');
    } finally {
      this.gitBusy = false;
    }
  }

  /** 撤销最近一次（还没推送的）提交，改动回到待提交状态。返回原来的提交说明。 */
  async undoCommit(): Promise<string | null> {
    if (this.gitBusy) return null;
    if (!(await this.ask('撤销最近一次提交？', '提交会被撤掉，里面的改动回到「待提交」，文件内容不变。', '撤销提交'))) return null;
    this.gitBusy = true;
    try {
      const result = await api.undo();
      this.git = result.status;
      this.gitLog = `$ git reset --soft HEAD~1\n已撤销：${result.message}`;
      this.toast('ok', '已撤销，改动回到了待提交');
      return result.message;
    } catch (error) {
      this.toast('error', message(error));
      return null;
    } finally {
      this.gitBusy = false;
    }
  }

  /**
   * 一键发布当前文章：先保存，再提交这篇的文件（加上 config.ts 的改动），然后推送。
   * 提交说明自动生成；别的文章的改动不受影响，留在提交面板里。
   */
  async publishCurrent() {
    const doc = this.doc;
    if (!doc || this.publishing || this.gitBusy) return;
    if ((this.dirty || doc.isNew) && !(await this.save())) return;
    this.publishing = true;
    this.gitBusy = true;
    let log = '';
    try {
      const status = await api.git();
      this.git = status;
      const files = this.relatedChanges(status);
      if (!files.length && !status.ahead) {
        this.toast('info', '这篇已经在 GitHub 上了，没有要发布的改动');
        return;
      }
      let hash: string | null = null;
      if (files.length) {
        const committed = await api.commit(this.commitMessage(files), files.map((c) => c.path));
        log = committed.log;
        hash = committed.hash;
      }
      const pushed = await api.push();
      log += `${log ? '\n' : ''}${pushed.log}`;
      this.git = pushed.status;
      this.gitLog = log;
      const href = this.commitUrl(hash);
      this.toast('ok', doc.frontmatter.draft ? '已推送（这篇还是草稿，线上看不到）' : '已发布到 GitHub', href ? { label: '看提交', href } : undefined);
    } catch (error) {
      this.gitLog = [log, message(error)].filter(Boolean).join('\n');
      this.toast('error', '发布没有完成', { label: '看日志', run: () => (this.mode = 'git') });
      await this.refreshGit(true);
    } finally {
      this.publishing = false;
      this.gitBusy = false;
    }
  }

  // ── 界面偏好 ─────────────────────────────────────────────────────────────

  loadUi() {
    try {
      const ui = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') as Partial<Record<string, unknown>>;
      if (ui.view === 'write' || ui.view === 'split' || ui.view === 'preview') this.view = ui.view;
      if (typeof ui.sidebar === 'boolean') this.sidebar = ui.sidebar;
      if (typeof ui.inspector === 'boolean') this.inspector = ui.inspector;
    } catch {
      // 读不到就用默认值。
    }
  }

  saveUi() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ view: this.view, sidebar: this.sidebar, inspector: this.inspector }));
    } catch {
      // 存不下就算了。
    }
  }
}

export const ed = new EditorStore();
