<script lang="ts">
  /**
   * Editor.svelte — 本地文章编辑器（只在 astro dev 下的 /__editor 存在）。
   *
   *   左栏   文章列表：搜索、按已发布 / 草稿筛选；底部是 Git 状态，「提交并推送」把文章目录的改动推到 GitHub。
   *   中间   标题和摘要直接写在正文上方；工具栏 + CodeMirror；写作 / 分栏 / 预览三种视图，预览走站点同一条渲染管线。
   *   右栏   文章设置：链接、日期、分类、标签（受控词表，带联想）、系列、开关；不合规的地方实时列出，有错误时不让保存，
   *          因为一篇 frontmatter 不合规的文章会让整个文章集合加载失败。
   *
   * 快捷键：Ctrl/⌘+S 保存，Ctrl/⌘+B / I / K / E 加粗 / 斜体 / 链接 / 行内代码，Ctrl/⌘+\ 切换视图，Ctrl/⌘+. 开关设置栏。
   * 没保存的内容每隔一会儿存一份到 localStorage，意外关掉页面后打开同一篇会提示恢复。
   */
  import { onMount, tick } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowSquareOut,
    iArrowsClockwise,
    iArticle,
    iCheck,
    iCircleDashed,
    iCode,
    iEye,
    iGitBranch,
    iHouse,
    iImage,
    iLightbulb,
    iLink,
    iListBullets,
    iMagnifyingGlass,
    iMinus,
    iMoon,
    iPaperPlaneTilt,
    iPencilSimple,
    iPlus,
    iQuotes,
    iSlidersHorizontal,
    iSun,
    iTerminalWindow,
    iTrash,
    iWarning,
    iX,
  } from '@/lib/icons.generated';
  import { currentTheme, setPref } from '@/lib/theme';

  import CodeEditor from './CodeEditor.svelte';
  import { api, type Frontmatter, type GitStatus, type PostSummary } from './client';

  interface Category {
    id: string;
    label: string;
    blurb: string;
  }
  interface TagGroup {
    id: string;
    label: string;
    blurb: string;
  }
  interface Tag {
    name: string;
    slug: string;
    group: string;
    blurb: string;
  }

  let { categories, tagGroups, tags }: { categories: Category[]; tagGroups: TagGroup[]; tags: Tag[] } = $props();

  type View = 'write' | 'split' | 'preview';
  interface Doc {
    slug: string;
    /** 文件里现在的 slug；新文章为 null。改了 slug 保存时据此改名。 */
    previousSlug: string | null;
    isNew: boolean;
    frontmatter: Frontmatter;
    body: string;
  }
  interface Issue {
    field: string;
    text: string;
    level: 'error' | 'warn';
  }

  const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
  const DRAFT_KEY = 'puresky-editor:draft:';

  let posts = $state<PostSummary[]>([]);
  let doc = $state<Doc | null>(null);
  let savedSnapshot = $state('');
  let saving = $state(false);
  let savedAt = $state<number | null>(null);
  let view = $state<View>('split');
  let inspector = $state(true);
  let query = $state('');
  let filter = $state<'all' | 'published' | 'draft'>('all');
  let previewHtml = $state('');
  let previewError = $state('');
  let previewBusy = $state(false);
  let cursor = $state({ line: 1, col: 1, lines: 1 });
  let git = $state<GitStatus | null>(null);
  let gitBusy = $state(false);
  let publishOpen = $state(false);
  let commitMessage = $state('');
  let gitLog = $state('');
  let confirmBox = $state<{ title: string; text: string; ok: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  let toasts = $state<{ id: number; kind: 'ok' | 'error' | 'info'; text: string }[]>([]);
  let restore = $state<{ savedAt: number; doc: Doc } | null>(null);
  let tagQuery = $state('');
  let tagOpen = $state(false);
  let theme = $state<'light' | 'dark'>('light');

  let editor = $state<ReturnType<typeof CodeEditor>>();
  let previewEl = $state<HTMLElement>();
  let titleEl = $state<HTMLTextAreaElement>();
  let fileInput = $state<HTMLInputElement>();

  // ── 派生 ───────────────────────────────────────────────────────────────────

  /**
   * 用来判断「有没有改过」的快照。frontmatter 先规整一遍：Svelte 的双向绑定会把 undefined 的字段写回成
   * false 或空字符串，这些和「没写」是一回事，不能算改动。
   */
  const DEFAULT_FALSE = ['featured', 'draft', 'commentsOff', 'mayBeStale'];
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
  const snapshot = (d: Doc | null) => (d ? JSON.stringify({ s: d.slug, f: normalized(d.frontmatter), b: d.body }) : '');
  const dirty = $derived(doc ? snapshot(doc) !== savedSnapshot : false);

  const counts = $derived.by(() => {
    const body = doc?.body ?? '';
    const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~[\]()!|-]/g, ' ');
    const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
    const latin = text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9]+/g)?.length ?? 0;
    return { words: cjk + latin, minutes: Math.max(1, Math.round(cjk / 380 + latin / 220)) };
  });

  const issues = $derived.by<Issue[]>(() => {
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
    if (!categories.some((c) => c.id === fm.category)) list.push({ field: 'category', text: '选一个分类', level: 'error' });
    const unknown = chosen.filter((t) => !tags.some((x) => x.name === t));
    if (unknown.length) list.push({ field: 'tags', text: `词表里没有：${unknown.join('、')}`, level: 'error' });
    if (chosen.length > 6) list.push({ field: 'tags', text: '标签最多 6 个', level: 'error' });
    else if (chosen.length < 3) list.push({ field: 'tags', text: '建议 3 到 5 个标签', level: 'warn' });
    if (fm.series && !fm.seriesOrder) list.push({ field: 'series', text: '设了系列，最好也给个序号', level: 'warn' });
    if (!doc.body.trim()) list.push({ field: 'body', text: '正文还是空的', level: 'warn' });
    return list;
  });
  const errors = $derived(issues.filter((i) => i.level === 'error'));

  const visiblePosts = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter === 'draft' && !p.draft) return false;
      if (filter === 'published' && p.draft) return false;
      if (!q) return true;
      return [p.title, p.slug, p.description, ...p.tags].some((s) => s.toLowerCase().includes(q));
    });
  });

  const tagSuggestions = $derived.by(() => {
    const chosen = new Set(doc?.frontmatter.tags ?? []);
    const q = tagQuery.trim().toLowerCase();
    return tagGroups
      .map((g) => ({
        ...g,
        tags: tags.filter((t) => t.group === g.id && !chosen.has(t.name) && (!q || t.name.toLowerCase().includes(q) || t.slug.includes(q))),
      }))
      .filter((g) => g.tags.length > 0);
  });

  const categoryLabel = (id: string | null | undefined) => categories.find((c) => c.id === id)?.label ?? '未分类';

  // ── 通用 ───────────────────────────────────────────────────────────────────

  let toastId = 0;
  function toast(kind: 'ok' | 'error' | 'info', text: string) {
    const id = ++toastId;
    toasts = [...toasts, { id, kind, text }];
    setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 2600);
  }

  function ask(title: string, text: string, ok: string, danger = false): Promise<boolean> {
    return new Promise((resolve) => (confirmBox = { title, text, ok, danger, resolve }));
  }

  function answer(value: boolean) {
    confirmBox?.resolve(value);
    confirmBox = null;
  }

  function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function relative(ms: number): string {
    const diff = (Date.now() - ms) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return new Date(ms).toLocaleDateString('zh-CN');
  }

  // ── 列表与打开 ─────────────────────────────────────────────────────────────

  async function loadList() {
    try {
      posts = await api.list();
    } catch (error) {
      toast('error', `读取文章列表失败：${(error as Error).message}`);
    }
  }

  function setDoc(next: Doc, keepSnapshot = false) {
    doc = next;
    if (!keepSnapshot) savedSnapshot = snapshot(next);
    previewHtml = '';
    previewError = '';
    editor?.load(next.body);
    void schedulePreview(0);
  }

  async function open(slug: string) {
    if (doc && slug === doc.previousSlug) return;
    if (dirty && !(await ask('放弃未保存的修改？', '当前文章有没保存的改动，切换后会丢失（本地草稿仍会保留一份）。', '放弃并切换', true))) return;
    try {
      const file = await api.read(slug);
      setDoc({ slug: file.slug, previousSlug: file.slug, isNew: false, frontmatter: { tags: [], ...file.frontmatter }, body: file.body });
      savedAt = file.mtime;
      history.replaceState(null, '', `?post=${encodeURIComponent(file.slug)}`);
      checkLocalDraft();
    } catch (error) {
      toast('error', (error as Error).message);
    }
  }

  async function newPost() {
    if (dirty && !(await ask('放弃未保存的修改？', '当前文章有没保存的改动，新建后会丢失（本地草稿仍会保留一份）。', '放弃并新建', true))) return;
    const date = today();
    let slug = `post-${date.replace(/-/g, '')}`;
    for (let i = 2; posts.some((p) => p.slug === slug); i += 1) slug = `post-${date.replace(/-/g, '')}-${i}`;
    setDoc({
      slug,
      previousSlug: null,
      isNew: true,
      frontmatter: { title: '', description: '', pubDate: date, category: 'essays', tags: [], draft: true },
      body: '',
    });
    savedAt = null;
    inspector = true;
    history.replaceState(null, '', '?new');
    await tick();
    titleEl?.focus();
  }

  // ── 保存与删除 ─────────────────────────────────────────────────────────────

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

  async function save() {
    if (!doc || saving) return;
    if (errors.length) {
      inspector = true;
      toast('error', `还有 ${errors.length} 个问题：${errors[0]!.text}`);
      return;
    }
    saving = true;
    try {
      const result = await api.save({
        slug: doc.slug,
        previousSlug: doc.isNew ? null : doc.previousSlug,
        frontmatter: cleaned(doc.frontmatter),
        body: doc.body,
        create: doc.isNew,
      });
      const oldKey = DRAFT_KEY + (doc.previousSlug ?? 'new');
      if (result.body !== doc.body) {
        doc.body = result.body;
        editor?.load(result.body);
      }
      doc.previousSlug = result.slug;
      doc.isNew = false;
      savedSnapshot = snapshot(doc);
      savedAt = Date.now();
      try {
        localStorage.removeItem(oldKey);
        localStorage.removeItem(DRAFT_KEY + result.slug);
      } catch {
        // 写不了 localStorage 也不影响保存。
      }
      history.replaceState(null, '', `?post=${encodeURIComponent(result.slug)}`);
      toast('ok', '已保存');
      await Promise.all([loadList(), refreshGit()]);
    } catch (error) {
      toast('error', `保存失败：${(error as Error).message}`);
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!doc) return;
    if (doc.isNew) {
      doc = null;
      return;
    }
    const title = doc.frontmatter.title || doc.slug;
    if (!(await ask(`删除《${title}》？`, '文件和它的图片目录会从磁盘上删掉。提交之前还能用 git 找回。', '删除', true))) return;
    try {
      await api.remove(doc.previousSlug!);
      toast('ok', '已删除');
      doc = null;
      savedSnapshot = '';
      history.replaceState(null, '', location.pathname);
      await Promise.all([loadList(), refreshGit()]);
    } catch (error) {
      toast('error', (error as Error).message);
    }
  }

  // ── 本地草稿 ───────────────────────────────────────────────────────────────

  let draftTimer = 0;
  $effect(() => {
    if (!doc || !dirty) return;
    const key = DRAFT_KEY + (doc.previousSlug ?? 'new');
    const payload = JSON.stringify({ savedAt: Date.now(), doc: $state.snapshot(doc) });
    clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(key, payload);
      } catch {
        // 存不下就算了。
      }
    }, 1200);
  });

  function checkLocalDraft() {
    restore = null;
    if (!doc) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY + (doc.previousSlug ?? 'new'));
      if (!raw) return;
      const entry = JSON.parse(raw) as { savedAt: number; doc: Doc };
      if (snapshot(entry.doc) !== savedSnapshot) restore = entry;
    } catch {
      // 草稿坏了就当没有。
    }
  }

  function applyRestore() {
    if (!restore) return;
    setDoc(restore.doc, true);
    restore = null;
    toast('info', '已恢复本地草稿，记得保存');
  }

  function dropRestore() {
    if (!doc) return;
    try {
      localStorage.removeItem(DRAFT_KEY + (doc.previousSlug ?? 'new'));
    } catch {
      // 忽略。
    }
    restore = null;
  }

  // ── 预览 ───────────────────────────────────────────────────────────────────

  let previewTimer = 0;
  let previewToken = 0;
  async function schedulePreview(delay = 320) {
    clearTimeout(previewTimer);
    if (!doc || view === 'write') return;
    const token = ++previewToken;
    previewTimer = window.setTimeout(async () => {
      if (!doc) return;
      previewBusy = true;
      try {
        const { html } = await api.preview(doc.slug, doc.body);
        if (token !== previewToken) return;
        previewHtml = html;
        previewError = '';
        await tick();
        enhancePreview();
      } catch (error) {
        if (token === previewToken) previewError = (error as Error).message;
      } finally {
        if (token === previewToken) previewBusy = false;
      }
    }, delay);
  }

  $effect(() => {
    void doc?.body;
    void view;
    void schedulePreview();
  });

  /** 和站点一样，把代码块包成带标题栏的「窗」。 */
  function enhancePreview() {
    previewEl?.querySelectorAll<HTMLPreElement>('pre:not([data-enhanced])').forEach((pre) => {
      pre.dataset.enhanced = '';
      const block = document.createElement('div');
      block.className = 'code-block';
      const head = document.createElement('div');
      head.className = 'code-head';
      const lang = pre.dataset.language;
      head.innerHTML = `<span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="code-lang">${lang && lang !== 'plaintext' ? lang : 'text'}</span>`;
      pre.replaceWith(block);
      block.append(head, pre);
    });
  }

  function syncScroll(ratio: number) {
    if (view !== 'split' || !previewEl) return;
    previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight);
  }

  // ── 图片 ───────────────────────────────────────────────────────────────────

  async function uploadImage(file: File): Promise<string> {
    if (!doc) throw new Error('没有打开的文章');
    try {
      const { path } = await api.upload(doc.slug, file);
      toast('ok', '图片已上传');
      return path;
    } catch (error) {
      toast('error', `图片上传失败：${(error as Error).message}`);
      throw error;
    }
  }

  function onPickFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length) editor?.pickImages(files);
  }

  // ── 标签 ───────────────────────────────────────────────────────────────────

  function addTag(name: string) {
    if (!doc) return;
    const current = doc.frontmatter.tags ?? [];
    if (current.includes(name) || current.length >= 6) return;
    doc.frontmatter.tags = [...current, name];
    tagQuery = '';
  }

  function removeTag(name: string) {
    if (!doc) return;
    doc.frontmatter.tags = (doc.frontmatter.tags ?? []).filter((t) => t !== name);
  }

  function onTagKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = tagSuggestions[0]?.tags[0];
      if (first) addTag(first.name);
    } else if (event.key === 'Backspace' && !tagQuery && doc?.frontmatter.tags?.length) {
      removeTag(doc.frontmatter.tags[doc.frontmatter.tags.length - 1]!);
    } else if (event.key === 'Escape') {
      tagOpen = false;
    }
  }

  // ── Git ────────────────────────────────────────────────────────────────────

  async function refreshGit() {
    try {
      git = await api.git();
    } catch (error) {
      git = null;
      toast('error', `读取 Git 状态失败：${(error as Error).message}`);
    }
  }

  function defaultMessage(): string {
    const changes = git?.changes ?? [];
    const titleOf = (file: string) => {
      const slug = file.replace(/\.(md|mdx)$/, '');
      return posts.find((p) => p.slug === slug)?.title ?? slug;
    };
    const postsChanged = changes.filter((c) => /\.(md|mdx)$/.test(c.file) && !c.file.includes('/'));
    const added = postsChanged.filter((c) => c.code === '??' || c.code === 'A').map((c) => `《${titleOf(c.file)}》`);
    const removed = postsChanged.filter((c) => c.code === 'D').map((c) => c.file.replace(/\.(md|mdx)$/, ''));
    const updated = postsChanged.filter((c) => !['??', 'A', 'D'].includes(c.code)).map((c) => `《${titleOf(c.file)}》`);
    const parts = [
      added.length ? `新增${added.join('')}` : '',
      updated.length ? `更新${updated.join('')}` : '',
      removed.length ? `删除 ${removed.join('、')}` : '',
    ].filter(Boolean);
    return parts.length ? `文章：${parts.join('，')}` : '文章：更新图片';
  }

  async function openPublish() {
    if (dirty && !(await ask('先保存当前文章？', '当前文章还有没保存的改动，提交只会包含已经保存到磁盘的内容。', '保存后继续'))) return;
    if (dirty) await save();
    await refreshGit();
    commitMessage = defaultMessage();
    gitLog = '';
    publishOpen = true;
  }

  async function publish() {
    if (gitBusy) return;
    gitBusy = true;
    gitLog = '正在提交并推送……';
    try {
      const result = await api.publish(commitMessage);
      gitLog = result.log;
      git = result.status;
      toast('ok', '已推送到 GitHub');
    } catch (error) {
      gitLog = (error as Error).message;
      toast('error', '推送失败，看一下日志');
    } finally {
      gitBusy = false;
    }
  }

  async function pull() {
    if (gitBusy) return;
    gitBusy = true;
    try {
      const result = await api.pull();
      git = result.status;
      toast('ok', '已和远端同步');
      await loadList();
    } catch (error) {
      toast('error', `同步失败：${(error as Error).message}`);
    } finally {
      gitBusy = false;
    }
  }

  // ── 生命周期 ───────────────────────────────────────────────────────────────

  function toggleTheme(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPref(currentTheme() === 'dark' ? 'light' : 'dark', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  function onKey(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === 'Escape') {
      if (confirmBox) answer(false);
      else if (publishOpen && !gitBusy) publishOpen = false;
      return;
    }
    if (!mod) return;
    if (event.key === 's') {
      event.preventDefault();
      void save();
    } else if (event.key === '\\') {
      event.preventDefault();
      view = view === 'split' ? 'write' : view === 'write' ? 'preview' : 'split';
    } else if (event.key === '.') {
      event.preventDefault();
      inspector = !inspector;
    }
  }

  onMount(() => {
    theme = currentTheme();
    const onTheme = () => (theme = currentTheme());
    window.addEventListener('theme:change', onTheme);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    const onFocus = () => void refreshGit();
    window.addEventListener('focus', onFocus);

    void (async () => {
      await Promise.all([loadList(), refreshGit()]);
      const params = new URLSearchParams(location.search);
      const slug = params.get('post');
      if (slug) await open(slug);
      else if (params.has('new')) await newPost();
    })();

    return () => {
      window.removeEventListener('theme:change', onTheme);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('focus', onFocus);
    };
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="app" class:with-inspector={inspector && doc}>
  <!-- ── 左栏 ── -->
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div class="min-w-0">
        <p class="brand-name">puresky 编辑器</p>
        <p class="brand-sub">只在本机可见</p>
      </div>
      <a href="/" class="icon-btn ml-auto" title="回到站点" aria-label="回到站点"><Icon icon={iHouse} size={16} /></a>
      <button type="button" class="icon-btn" onclick={toggleTheme} title="切换亮暗" aria-label="切换亮暗">
        <Icon icon={theme === 'dark' ? iSun : iMoon} size={16} />
      </button>
    </div>

    <button type="button" class="new-btn" onclick={newPost}>
      <Icon icon={iPlus} size={16} />新文章
    </button>

    <label class="search">
      <Icon icon={iMagnifyingGlass} size={15} />
      <input type="search" placeholder="搜索标题、链接、标签" bind:value={query} />
    </label>

    <div class="filters" role="tablist" aria-label="筛选">
      {#each [['all', '全部'], ['published', '已发布'], ['draft', '草稿']] as [id, label]}
        <button
          type="button"
          role="tab"
          aria-selected={filter === id}
          onclick={() => (filter = id as typeof filter)}
        >
          {label}
          <span class="tabular">{id === 'all' ? posts.length : id === 'draft' ? posts.filter((p) => p.draft).length : posts.filter((p) => !p.draft).length}</span>
        </button>
      {/each}
    </div>

    <ul class="post-list">
      {#each visiblePosts as p (p.slug)}
        <li>
          <button type="button" class="post-item" class:active={doc?.previousSlug === p.slug} onclick={() => open(p.slug)}>
            <span class="post-title">
              {#if doc?.previousSlug === p.slug && dirty}<span class="dirty-dot" title="有未保存的修改"></span>{/if}
              {p.title}
            </span>
            <span class="post-meta">
              {p.pubDate ?? '无日期'}<span class="sep">·</span>{categoryLabel(p.category)}<span class="sep">·</span>{p.words.toLocaleString('zh-CN')} 字
              {#if p.draft}<span class="badge draft">草稿</span>{/if}
              {#if p.featured}<span class="badge">精选</span>{/if}
              {#if p.error}<span class="badge danger" title={p.error}>出错</span>{/if}
            </span>
          </button>
        </li>
      {:else}
        <li class="empty-list">{posts.length ? '没有匹配的文章' : '还没有文章'}</li>
      {/each}
    </ul>

    <div class="git-card">
      <div class="git-head">
        <Icon icon={iGitBranch} size={15} />
        <span class="font-mono">{git?.branch ?? '…'}</span>
        {#if git?.upstream}
          <span class="git-sync tabular" title="领先 / 落后远端的提交数">↑{git.ahead} ↓{git.behind}</span>
        {/if}
        <button type="button" class="icon-btn ml-auto" onclick={pull} disabled={gitBusy} title="从远端拉取（git pull --rebase）" aria-label="从远端拉取">
          <Icon icon={iArrowsClockwise} size={15} />
        </button>
      </div>
      <p class="git-line">
        {#if !git}
          读取中
        {:else if git.changes.length}
          {git.changes.length} 项改动待提交
        {:else if git.ahead}
          {git.ahead} 个提交待推送
        {:else}
          文章目录没有改动
        {/if}
      </p>
      {#if git?.last}
        <p class="git-last" title={git.last.subject}><span class="font-mono">{git.last.hash}</span> {git.last.subject} · {git.last.when}</p>
      {/if}
      <button type="button" class="publish-btn" onclick={openPublish} disabled={gitBusy || (!git?.changes.length && !git?.ahead && !dirty)}>
        <Icon icon={iPaperPlaneTilt} size={15} />提交并推送
      </button>
    </div>
  </aside>

  <!-- ── 中间 ── -->
  <main class="main">
    {#if doc}
      <header class="topbar">
        <div class="crumbs">
          <Icon icon={iArticle} size={15} />
          <span class="font-mono truncate">/posts/{doc.slug}/</span>
          {#if saving}
            <span class="state"><span class="spinner"></span>保存中</span>
          {:else if dirty}
            <span class="state unsaved"><Icon icon={iCircleDashed} size={13} />未保存</span>
          {:else if savedAt}
            <span class="state saved"><Icon icon={iCheck} size={13} />已保存 · {relative(savedAt)}</span>
          {/if}
        </div>
        <div class="seg" role="tablist" aria-label="视图">
          {#each [['write', '写作', iPencilSimple], ['split', '分栏', iSlidersHorizontal], ['preview', '预览', iEye]] as [id, label, icon]}
            <button type="button" role="tab" aria-selected={view === id} onclick={() => (view = id as View)} title={`${label}（Ctrl+\\ 切换）`}>
              <Icon icon={icon as typeof iEye} size={14} /><span>{label}</span>
            </button>
          {/each}
        </div>
        <div class="actions">
          {#if !doc.isNew}
            <a class="icon-btn" href={`/posts/${doc.previousSlug}/`} target="_blank" rel="noopener" title="在站点里打开" aria-label="在站点里打开">
              <Icon icon={iArrowSquareOut} size={16} />
            </a>
          {/if}
          <button type="button" class="icon-btn" class:on={inspector} onclick={() => (inspector = !inspector)} title="文章设置（Ctrl+.）" aria-label="文章设置">
            <Icon icon={iSlidersHorizontal} size={16} />
          </button>
          <button type="button" class="save-btn" onclick={save} disabled={saving || (!dirty && !doc.isNew)} title="保存（Ctrl+S）">
            {doc.isNew ? '创建' : '保存'}
            <kbd>Ctrl S</kbd>
          </button>
        </div>
      </header>

      {#if restore}
        <div class="restore">
          <Icon icon={iWarning} size={15} />
          <span>发现一份没保存的本地草稿（{relative(restore.savedAt)}）。</span>
          <button type="button" class="link-btn" onclick={applyRestore}>恢复</button>
          <button type="button" class="link-btn muted" onclick={dropRestore}>丢弃</button>
        </div>
      {/if}

      {#if view !== 'preview'}
        <div class="toolbar" role="toolbar" aria-label="格式">
          <button type="button" onclick={() => editor?.prefix('## ')} title="二级标题">H2</button>
          <button type="button" onclick={() => editor?.prefix('### ')} title="三级标题">H3</button>
          <span class="tb-sep"></span>
          <button type="button" class="b" onclick={() => editor?.wrap('**', '**', '加粗')} title="加粗（Ctrl+B）">B</button>
          <button type="button" class="i" onclick={() => editor?.wrap('*', '*', '斜体')} title="斜体（Ctrl+I）">I</button>
          <button type="button" class="s" onclick={() => editor?.wrap('~~', '~~', '删除线')} title="删除线">S</button>
          <button type="button" onclick={() => editor?.wrap('`', '`', 'code')} title="行内代码（Ctrl+E）"><Icon icon={iCode} size={15} /></button>
          <button type="button" onclick={() => editor?.wrap('[', '](https://)', '链接文字')} title="链接（Ctrl+K）"><Icon icon={iLink} size={15} /></button>
          <span class="tb-sep"></span>
          <button type="button" onclick={() => editor?.prefix('> ')} title="引用"><Icon icon={iQuotes} size={15} /></button>
          <button type="button" onclick={() => editor?.prefix('- ')} title="无序列表"><Icon icon={iListBullets} size={15} /></button>
          <button type="button" onclick={() => editor?.prefix('1. ')} title="有序列表">1.</button>
          <button type="button" onclick={() => editor?.prefix('- [ ] ')} title="任务列表">☐</button>
          <span class="tb-sep"></span>
          <button type="button" onclick={() => editor?.insert('```ts\n\n```', true)} title="代码块"><Icon icon={iTerminalWindow} size={15} /></button>
          <button type="button" onclick={() => editor?.insert('| 列 | 列 |\n| --- | --- |\n|  |  |', true)} title="表格">表</button>
          <button type="button" onclick={() => editor?.insert('> [!NOTE]\n> ', true)} title="提示块（NOTE / TIP / IMPORTANT / WARNING / CAUTION）"><Icon icon={iLightbulb} size={15} /></button>
          <button type="button" onclick={() => editor?.insert('---', true)} title="分隔线"><Icon icon={iMinus} size={15} /></button>
          <button type="button" onclick={() => fileInput?.click()} title="插入图片（也可以直接粘贴或拖进来）"><Icon icon={iImage} size={15} /></button>
          <input bind:this={fileInput} type="file" accept="image/*" multiple hidden onchange={onPickFiles} />
        </div>
      {/if}

      <div class="workspace" data-view={view}>
        <section class="pane write" hidden={view === 'preview'}>
          <div class="head-fields">
            <textarea
              bind:this={titleEl}
              class="title-input"
              rows="1"
              placeholder="标题"
              bind:value={doc.frontmatter.title}
              oninput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
            ></textarea>
            <textarea class="desc-input" rows="2" placeholder="一句话摘要：讲清楚问题和结论（10 到 200 字）" bind:value={doc.frontmatter.description}></textarea>
          </div>
          <div class="cm-host">
            <CodeEditor
              bind:this={editor}
              initial={doc.body}
              onchange={(value) => doc && (doc.body = value)}
              oncursor={(pos) => (cursor = pos)}
              onscrollratio={syncScroll}
              onimage={uploadImage}
            />
          </div>
        </section>

        {#if view !== 'write'}
          <section class="pane preview" bind:this={previewEl}>
            <div class="preview-inner">
              <h1 class="pv-title">{doc.frontmatter.title || '未命名'}</h1>
              {#if doc.frontmatter.description}<p class="pv-lead">{doc.frontmatter.description}</p>{/if}
              {#if previewError}
                <p class="pv-error"><Icon icon={iWarning} size={15} />{previewError}</p>
              {/if}
              <div class="prose pv-body" class:busy={previewBusy}>{@html previewHtml}</div>
            </div>
          </section>
        {/if}
      </div>

      <footer class="statusbar">
        <span class="tabular">{counts.words.toLocaleString('zh-CN')} 字</span>
        <span>约 {counts.minutes} 分钟</span>
        <span class="tabular">第 {cursor.line} 行，第 {cursor.col} 列 · 共 {cursor.lines} 行</span>
        <button type="button" class="issues" class:has-error={errors.length} onclick={() => (inspector = true)}>
          {#if errors.length}
            <Icon icon={iWarning} size={13} />{errors.length} 个问题
          {:else if issues.length}
            {issues.length} 条建议
          {:else}
            <Icon icon={iCheck} size={13} />可以发布
          {/if}
        </button>
      </footer>
    {:else}
      <div class="welcome">
        <span class="welcome-mark" aria-hidden="true"></span>
        <h1>写点什么吧</h1>
        <p>从左边选一篇文章继续写，或者新建一篇。保存后站点会立即热更新，写完用「提交并推送」发到 GitHub。</p>
        <button type="button" class="new-btn big" onclick={newPost}><Icon icon={iPlus} size={17} />新文章</button>
        <dl class="shortcuts">
          <div><dt><kbd>Ctrl</kbd> <kbd>S</kbd></dt><dd>保存</dd></div>
          <div><dt><kbd>Ctrl</kbd> <kbd>\</kbd></dt><dd>切换写作 / 分栏 / 预览</dd></div>
          <div><dt><kbd>Ctrl</kbd> <kbd>.</kbd></dt><dd>开关文章设置</dd></div>
          <div><dt><kbd>Ctrl</kbd> <kbd>B</kbd> <kbd>I</kbd> <kbd>K</kbd></dt><dd>加粗 / 斜体 / 链接</dd></div>
          <div><dt><kbd>Ctrl</kbd> <kbd>F</kbd></dt><dd>在正文里搜索</dd></div>
          <div><dt>粘贴图片</dt><dd>自动上传到文章的图片目录</dd></div>
        </dl>
      </div>
    {/if}
  </main>

  <!-- ── 右栏：文章设置 ── -->
  {#if doc && inspector}
    <aside class="inspector" aria-label="文章设置">
      <div class="ins-head">
        <p>文章设置</p>
        <button type="button" class="icon-btn" onclick={() => (inspector = false)} aria-label="关闭"><Icon icon={iX} size={15} /></button>
      </div>

      {#if issues.length}
        <ul class="issue-list">
          {#each issues as issue}
            <li class={issue.level}><Icon icon={iWarning} size={13} />{issue.text}</li>
          {/each}
        </ul>
      {/if}

      <div class="field">
        <label for="f-slug">链接</label>
        <div class="slug-input" class:invalid={!SLUG.test(doc.slug)}>
          <span>/posts/</span>
          <input id="f-slug" bind:value={doc.slug} spellcheck="false" autocomplete="off" />
          <span>/</span>
        </div>
        <p class="hint">小写字母、数字、连字符。发布后尽量别改，改了旧链接会失效。</p>
      </div>

      <div class="field two">
        <div>
          <label for="f-pub">发布日期</label>
          <input id="f-pub" type="date" bind:value={doc.frontmatter.pubDate} />
        </div>
        <div>
          <label for="f-upd">更新日期</label>
          <div class="with-btn">
            <input id="f-upd" type="date" bind:value={doc.frontmatter.updatedDate} />
            <button type="button" class="mini" onclick={() => doc && (doc.frontmatter.updatedDate = today())}>今天</button>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="label">分类</span>
        <div class="cats" role="radiogroup" aria-label="分类">
          {#each categories as c}
            <button type="button" role="radio" aria-checked={doc.frontmatter.category === c.id} class="cat" onclick={() => doc && (doc.frontmatter.category = c.id)} title={c.blurb}>
              <span class="cat-label">{c.label}</span>
              <span class="cat-blurb">{c.blurb}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="field">
        <span class="label">标签 <span class="hint-inline">{doc.frontmatter.tags?.length ?? 0} / 6，建议 3 到 5 个</span></span>
        <div class="tag-box">
          {#each doc.frontmatter.tags ?? [] as name}
            <span class="tag-chip">
              #{name}
              <button type="button" onclick={() => removeTag(name)} aria-label={`移除 ${name}`}><Icon icon={iX} size={11} /></button>
            </span>
          {/each}
          <input
            class="tag-input"
            placeholder={(doc.frontmatter.tags?.length ?? 0) >= 6 ? '已满' : '输入以筛选'}
            bind:value={tagQuery}
            onfocus={() => (tagOpen = true)}
            onblur={() => setTimeout(() => (tagOpen = false), 150)}
            onkeydown={onTagKey}
            disabled={(doc.frontmatter.tags?.length ?? 0) >= 6}
          />
        </div>
        {#if tagOpen && tagSuggestions.length}
          <div class="tag-pop">
            {#each tagSuggestions as group}
              <p class="pop-group">{group.label}</p>
              <div class="pop-tags">
                {#each group.tags as tag}
                  <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => addTag(tag.name)} title={tag.blurb}>#{tag.name}</button>
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="field two">
        <div>
          <label for="f-series">系列</label>
          <input id="f-series" bind:value={doc.frontmatter.series} placeholder="可选" />
        </div>
        <div>
          <label for="f-order">序号</label>
          <input id="f-order" type="number" min="1" bind:value={doc.frontmatter.seriesOrder} placeholder="1" />
        </div>
      </div>

      <div class="field">
        <span class="label">选项</span>
        <div class="switches">
          {#each [['draft', '草稿', '不出现在线上站点，本地仍能预览'], ['featured', '精选', '首页和列表里带星标'], ['commentsOff', '关闭评论', ''], ['mayBeStale', '可能过时', '文章顶部提示读者留意时效']] as [key, label, hint]}
            <label class="switch">
              <input type="checkbox" bind:checked={doc.frontmatter[key] as boolean} />
              <span class="track" aria-hidden="true"><span class="knob"></span></span>
              <span class="switch-text">{label}{#if hint}<small>{hint}</small>{/if}</span>
            </label>
          {/each}
        </div>
      </div>

      <div class="field">
        <label for="f-cover">封面图（可选）</label>
        <input id="f-cover" bind:value={doc.frontmatter.cover} placeholder="./images/…" />
      </div>

      <div class="danger-zone">
        <button type="button" class="danger-btn" onclick={remove}>
          <Icon icon={iTrash} size={15} />{doc.isNew ? '放弃这篇' : '删除文章'}
        </button>
      </div>
    </aside>
  {/if}
</div>

<!-- 提交并推送 -->
{#if publishOpen}
  <div class="overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && !gitBusy && (publishOpen = false)}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pub-title">
      <h2 id="pub-title"><Icon icon={iPaperPlaneTilt} size={17} />提交并推送到 GitHub</h2>
      <p class="dialog-sub">
        只提交文章目录（site/src/content/posts）里的改动，然后 <code>git push</code>{#if git?.branch} 到 <span class="font-mono">{git.branch}</span>{/if}。
        {#if git?.remote}<a href={git.remote} target="_blank" rel="noopener" class="link">{git.remote.replace('https://github.com/', '')}</a>{/if}
      </p>
      {#if git?.changes.length}
        <ul class="change-list">
          {#each git.changes as change}
            <li>
              <span class="code code-{change.code === '??' ? 'A' : change.code[0]}">{change.code === '??' ? '新' : change.code === 'D' ? '删' : change.code === 'A' ? '新' : '改'}</span>
              <span class="font-mono truncate">{change.file}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="dialog-sub">没有新的改动{#if git?.ahead}，会把本地已有的 {git.ahead} 个提交推上去{/if}。</p>
      {/if}
      <label class="field">
        <span class="label">提交说明</span>
        <textarea rows="2" bind:value={commitMessage}></textarea>
      </label>
      {#if gitLog}<pre class="git-log">{gitLog}</pre>{/if}
      <div class="dialog-actions">
        <button type="button" class="ghost" onclick={() => (publishOpen = false)} disabled={gitBusy}>关闭</button>
        <button type="button" class="primary" onclick={publish} disabled={gitBusy || !commitMessage.trim()}>
          {#if gitBusy}<span class="spinner"></span>{/if}提交并推送
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- 确认框 -->
{#if confirmBox}
  <div class="overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && answer(false)}>
    <div class="dialog small" role="alertdialog" aria-modal="true" aria-labelledby="cf-title">
      <h2 id="cf-title">{confirmBox.title}</h2>
      <p class="dialog-sub">{confirmBox.text}</p>
      <div class="dialog-actions">
        <button type="button" class="ghost" onclick={() => answer(false)}>取消</button>
        <button type="button" class={confirmBox.danger ? 'danger' : 'primary'} onclick={() => answer(true)}>{confirmBox.ok}</button>
      </div>
    </div>
  </div>
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast {t.kind}">{t.text}</div>
  {/each}
</div>

<style>
  .app {
    display: grid;
    grid-template-columns: 17.5rem minmax(0, 1fr);
    height: 100dvh;
    background: var(--bg);
    color: var(--fg);
  }
  .app.with-inspector {
    grid-template-columns: 17.5rem minmax(0, 1fr) 20rem;
  }

  /* ── 左栏 ── */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    padding: 0.9rem 0.75rem 0.75rem;
    border-right: 1px solid var(--line);
    background: var(--surface);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0 0.25rem;
  }
  .brand-mark {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: linear-gradient(160deg, oklch(0.86 0.08 230), var(--accent) 70%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35);
  }
  .brand-name {
    font-size: 0.875rem;
    font-weight: 650;
  }
  .brand-sub {
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .new-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 2.35rem;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--accent-fg);
    background: var(--accent);
    box-shadow: 0 8px 20px -12px var(--accent);
    transition:
      background-color 160ms ease,
      transform 160ms var(--ease-out-expo);
  }
  .new-btn:hover {
    background: var(--accent-strong);
  }
  .new-btn:active {
    transform: scale(0.98);
  }
  .new-btn.big {
    height: 2.75rem;
    padding-inline: 1.4rem;
    border-radius: 999px;
    margin-top: 1.5rem;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    height: 2.2rem;
    padding-inline: 0.7rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--fg-subtle);
    transition: border-color 160ms ease;
  }
  .search:focus-within {
    border-color: color-mix(in oklab, var(--accent) 55%, var(--line));
  }
  .search input {
    flex: 1;
    min-width: 0;
    background: none;
    border: 0;
    outline: none;
    font-size: 0.8125rem;
    color: var(--fg);
  }
  .filters {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .filters button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    height: 1.75rem;
    border-radius: 8px;
    font-size: 0.75rem;
    color: var(--fg-muted);
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }
  .filters button span {
    color: var(--fg-subtle);
    font-size: 0.7rem;
  }
  .filters button[aria-selected='true'] {
    background: var(--surface);
    color: var(--fg);
    box-shadow: var(--shadow-sm);
  }
  .post-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-inline: -0.25rem;
    padding-inline: 0.25rem;
  }
  .post-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    width: 100%;
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
    text-align: left;
    transition: background-color 140ms ease;
  }
  .post-item:hover {
    background: var(--surface-2);
  }
  .post-item.active {
    background: color-mix(in oklab, var(--accent) 10%, var(--surface));
    box-shadow: inset 2.5px 0 0 var(--accent);
  }
  .post-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
    font-weight: 550;
    line-height: 1.45;
    color: var(--fg);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .post-item.active .post-title {
    color: var(--accent-strong);
  }
  .dirty-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 0.3rem;
    border-radius: 999px;
    background: var(--warning);
    vertical-align: 0.1em;
  }
  .post-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.15rem 0.3rem;
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .sep {
    opacity: 0.6;
  }
  .badge {
    padding: 0 0.4rem;
    border-radius: 999px;
    font-size: 0.65rem;
    line-height: 1.5;
    color: var(--accent-strong);
    background: var(--accent-soft);
  }
  .badge.draft {
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 14%, transparent);
  }
  .badge.danger {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 14%, transparent);
  }
  .empty-list {
    padding: 2rem 0.5rem;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--fg-subtle);
  }
  .git-card {
    display: grid;
    gap: 0.4rem;
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--bg);
  }
  .git-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .git-head .icon-btn {
    width: 1.75rem;
    height: 1.75rem;
  }
  .git-sync {
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .git-line {
    font-size: 0.8125rem;
    font-weight: 550;
  }
  .git-last {
    font-size: 0.7rem;
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .publish-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 2.1rem;
    margin-top: 0.2rem;
    border-radius: 9px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fg);
    background: var(--surface-2);
    border: 1px solid var(--line-strong);
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }
  .publish-btn:hover:not(:disabled) {
    color: var(--accent-fg);
    background: var(--accent);
    border-color: transparent;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* ── 中间 ── */
  .main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    height: 3.25rem;
    padding: 0 0.9rem 0 1.1rem;
    border-bottom: 1px solid var(--line);
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    flex: 1;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .state {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.3rem;
    height: 1.5rem;
    padding-inline: 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    background: var(--surface-2);
  }
  .state.unsaved {
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 12%, transparent);
  }
  .state.saved {
    color: var(--success);
    background: color-mix(in oklab, var(--success) 10%, transparent);
  }
  .seg {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--surface-2);
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    height: 1.75rem;
    padding-inline: 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--fg-muted);
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }
  .seg button[aria-selected='true'] {
    color: var(--fg);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .icon-btn.on {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.1rem;
    padding: 0 0.6rem 0 0.95rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--accent-fg);
    background: var(--accent);
    transition: background-color 160ms ease;
  }
  .save-btn:hover:not(:disabled) {
    background: var(--accent-strong);
  }
  .save-btn kbd {
    padding: 0.05rem 0.35rem;
    border-radius: 5px;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    background: rgb(255 255 255 / 0.2);
  }
  .restore {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1.1rem;
    font-size: 0.8125rem;
    color: var(--fg);
    background: color-mix(in oklab, var(--warning) 12%, var(--bg));
    border-bottom: 1px solid color-mix(in oklab, var(--warning) 30%, var(--line));
  }
  .link-btn {
    font-weight: 600;
    color: var(--accent);
  }
  .link-btn.muted {
    color: var(--fg-muted);
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 0.4rem 0.8rem;
    border-bottom: 1px solid var(--line);
  }
  .toolbar button {
    display: inline-grid;
    place-items: center;
    min-width: 2rem;
    height: 2rem;
    padding-inline: 0.35rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fg-muted);
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }
  .toolbar button:hover {
    color: var(--fg);
    background: var(--surface-2);
  }
  .toolbar .b {
    font-weight: 800;
  }
  .toolbar .i {
    font-style: italic;
    font-family: Georgia, serif;
  }
  .toolbar .s {
    text-decoration: line-through;
  }
  .tb-sep {
    width: 1px;
    height: 1.1rem;
    margin-inline: 0.35rem;
    background: var(--line);
  }

  .workspace {
    flex: 1;
    display: grid;
    min-height: 0;
  }
  .workspace[data-view='split'] {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .pane {
    min-height: 0;
    min-width: 0;
  }
  .pane[hidden] {
    display: none;
  }
  .write {
    display: flex;
    flex-direction: column;
  }
  .head-fields {
    width: 100%;
    max-width: 46rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 0.25rem;
  }
  .workspace[data-view='split'] .write {
    border-right: 1px solid var(--line);
  }
  .title-input,
  .desc-input {
    display: block;
    width: 100%;
    resize: none;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--fg);
  }
  .title-input {
    font-size: 1.75rem;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.02em;
    field-sizing: content;
  }
  .desc-input {
    margin-top: 0.45rem;
    font-family: var(--font-serif);
    font-size: 0.98rem;
    font-weight: 600;
    line-height: 1.7;
    color: var(--fg-muted);
    field-sizing: content;
  }
  .title-input::placeholder,
  .desc-input::placeholder {
    color: var(--fg-subtle);
    opacity: 0.7;
  }
  .cm-host {
    flex: 1;
    min-height: 0;
    padding-inline: 1.25rem;
  }
  .preview {
    overflow-y: auto;
    background: color-mix(in oklab, var(--surface) 60%, var(--bg));
  }
  .preview-inner {
    max-width: 46rem;
    margin: 0 auto;
    padding: 1.5rem 1.75rem 30vh;
  }
  .pv-title {
    font-size: 1.85rem;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .pv-lead {
    margin-top: 0.7rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--line);
    font-family: var(--font-serif);
    font-weight: 600;
    line-height: 1.75;
    color: color-mix(in oklab, var(--fg) 78%, var(--fg-muted));
  }
  .pv-body {
    margin-top: 1.5rem;
    transition: opacity 200ms ease;
  }
  .pv-body.busy {
    opacity: 0.75;
  }
  .pv-error {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1rem;
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
    font-size: 0.8125rem;
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 10%, transparent);
  }
  .statusbar {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    height: 2rem;
    padding-inline: 1.1rem;
    border-top: 1px solid var(--line);
    font-size: 0.72rem;
    color: var(--fg-subtle);
  }
  .issues {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: auto;
    color: var(--success);
  }
  .issues.has-error {
    color: var(--danger);
  }

  .welcome {
    display: grid;
    place-content: center;
    justify-items: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
  }
  .welcome-mark {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: linear-gradient(160deg, oklch(0.86 0.08 230), var(--accent) 70%);
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.35),
      0 18px 40px -16px var(--accent);
  }
  .welcome h1 {
    margin-top: 1.25rem;
    font-size: 1.6rem;
    font-weight: 700;
  }
  .welcome p {
    max-width: 30rem;
    margin-top: 0.6rem;
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--fg-muted);
  }
  .shortcuts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem 2rem;
    margin-top: 2.25rem;
    text-align: left;
    font-size: 0.8rem;
    color: var(--fg-muted);
  }
  .shortcuts div {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .shortcuts dt {
    min-width: 6.5rem;
  }
  kbd {
    display: inline-block;
    padding: 0.05rem 0.4rem;
    border-radius: 5px;
    border: 1px solid var(--line-strong);
    border-bottom-width: 2px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--fg);
    background: var(--surface);
  }

  /* ── 右栏 ── */
  .inspector {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
    min-height: 0;
    overflow-y: auto;
    padding: 0.9rem 1rem 1.5rem;
    border-left: 1px solid var(--line);
    background: var(--surface);
  }
  .ins-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    font-weight: 650;
  }
  .issue-list {
    display: grid;
    gap: 0.35rem;
  }
  .issue-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    border-radius: 9px;
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .issue-list li :global(svg) {
    margin-top: 0.15rem;
  }
  .issue-list .error {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 9%, transparent);
  }
  .issue-list .warn {
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 10%, transparent);
  }
  .field {
    position: relative;
    display: grid;
    gap: 0.4rem;
  }
  .field.two {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .field.two > div {
    display: grid;
    gap: 0.4rem;
  }
  .field label,
  .label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fg-muted);
  }
  .hint,
  .hint-inline {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--fg-subtle);
  }
  .field input:not([type='checkbox']),
  .field textarea {
    width: 100%;
    min-width: 0;
    height: 2.15rem;
    padding: 0 0.65rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--fg);
    font-size: 0.8125rem;
    outline: none;
    transition: border-color 160ms ease;
  }
  .field textarea {
    height: auto;
    padding: 0.5rem 0.65rem;
    resize: vertical;
    line-height: 1.6;
  }
  .field input:focus,
  .field textarea:focus {
    border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
  }
  .slug-input {
    display: flex;
    align-items: center;
    height: 2.15rem;
    padding-inline: 0.65rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--bg);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  .slug-input:focus-within {
    border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
  }
  .slug-input.invalid {
    border-color: var(--danger);
  }
  .field .slug-input input {
    flex: 1;
    height: auto;
    padding: 0 0.1rem;
    border: 0;
    background: none;
    font-family: inherit;
    font-size: inherit;
    color: var(--fg);
  }
  .with-btn {
    display: flex;
    gap: 0.3rem;
  }
  .mini {
    flex-shrink: 0;
    padding-inline: 0.5rem;
    border-radius: 8px;
    font-size: 0.7rem;
    color: var(--accent);
    background: var(--accent-soft);
  }
  .cats {
    display: grid;
    gap: 0.35rem;
  }
  .cat {
    display: grid;
    gap: 0.1rem;
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    text-align: left;
    transition:
      border-color 160ms ease,
      background-color 160ms ease;
  }
  .cat:hover {
    border-color: var(--line-strong);
  }
  .cat[aria-checked='true'] {
    border-color: color-mix(in oklab, var(--accent) 55%, var(--line));
    background: color-mix(in oklab, var(--accent) 8%, var(--surface));
  }
  .cat-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .cat[aria-checked='true'] .cat-label {
    color: var(--accent-strong);
  }
  .cat-blurb {
    font-size: 0.7rem;
    line-height: 1.5;
    color: var(--fg-subtle);
  }
  .tag-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    min-height: 2.4rem;
    padding: 0.3rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
  }
  .tag-box:focus-within {
    border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    height: 1.6rem;
    padding: 0 0.25rem 0 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--accent-strong);
    background: var(--accent-soft);
  }
  .tag-chip button {
    display: grid;
    place-items: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 999px;
  }
  .tag-chip button:hover {
    background: color-mix(in oklab, var(--accent) 20%, transparent);
  }
  .field .tag-input {
    flex: 1;
    min-width: 5rem;
    height: 1.6rem;
    padding: 0 0.3rem;
    border: 0;
    background: none;
  }
  .tag-pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 5;
    max-height: 16rem;
    overflow-y: auto;
    padding: 0.5rem 0.6rem 0.6rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }
  .pop-group {
    margin: 0.35rem 0 0.3rem;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--fg-subtle);
  }
  .pop-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .pop-tags button {
    height: 1.6rem;
    padding-inline: 0.55rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--fg-muted);
    transition:
      color 140ms ease,
      border-color 140ms ease,
      background-color 140ms ease;
  }
  .pop-tags button:hover {
    color: var(--accent);
    border-color: color-mix(in oklab, var(--accent) 45%, var(--line));
    background: color-mix(in oklab, var(--accent) 6%, transparent);
  }
  .switches {
    display: grid;
    gap: 0.55rem;
  }
  .switch {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    cursor: pointer;
  }
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    position: relative;
    flex-shrink: 0;
    width: 2.1rem;
    height: 1.2rem;
    margin-top: 0.05rem;
    border-radius: 999px;
    background: var(--surface-3);
    transition: background-color 180ms ease;
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(1.2rem - 4px);
    height: calc(1.2rem - 4px);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
    transition: transform 220ms var(--ease-spring);
  }
  .switch input:checked + .track {
    background: var(--accent);
  }
  .switch input:checked + .track .knob {
    transform: translateX(0.9rem);
  }
  .switch input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .switch-text {
    display: grid;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
  .switch-text small {
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .danger-zone {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .danger-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2rem;
    padding-inline: 0.8rem;
    border-radius: 9px;
    font-size: 0.8rem;
    color: var(--danger);
    transition: background-color 160ms ease;
  }
  .danger-btn:hover {
    background: color-mix(in oklab, var(--danger) 10%, transparent);
  }

  /* ── 弹窗 ── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: grid;
    place-items: center;
    padding: 1rem;
    background: oklch(0.15 0.03 262 / 0.45);
    backdrop-filter: blur(4px);
    animation: fade-in 160ms ease;
  }
  .dialog {
    display: grid;
    gap: 0.9rem;
    width: min(34rem, 100%);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    padding: 1.35rem 1.4rem 1.2rem;
    border-radius: var(--radius-card);
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    animation: rise 260ms var(--ease-out-expo);
  }
  .dialog.small {
    width: min(26rem, 100%);
  }
  .dialog h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.05rem;
    font-weight: 650;
  }
  .dialog-sub {
    font-size: 0.8125rem;
    line-height: 1.65;
    color: var(--fg-muted);
  }
  .dialog-sub code {
    padding: 0.05rem 0.35rem;
    border-radius: 5px;
    font-size: 0.75rem;
    background: var(--surface-2);
  }
  .change-list {
    display: grid;
    gap: 0.2rem;
    max-height: 11rem;
    overflow-y: auto;
    padding: 0.5rem;
    border-radius: 10px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .change-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
  }
  .change-list .code {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 5px;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--warning);
    background: color-mix(in oklab, var(--warning) 14%, transparent);
  }
  .change-list .code-A {
    color: var(--success);
    background: color-mix(in oklab, var(--success) 14%, transparent);
  }
  .change-list .code-D {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 14%, transparent);
  }
  .git-log {
    max-height: 12rem;
    overflow: auto;
    padding: 0.7rem 0.8rem;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.6;
    white-space: pre-wrap;
    color: var(--fg-muted);
    background: var(--code-bg);
    border: 1px solid var(--code-line);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .dialog-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2.2rem;
    padding-inline: 1rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .dialog-actions .ghost {
    color: var(--fg-muted);
    border: 1px solid var(--line-strong);
  }
  .dialog-actions .ghost:hover:not(:disabled) {
    background: var(--surface-2);
  }
  .dialog-actions .primary {
    color: var(--accent-fg);
    background: var(--accent);
  }
  .dialog-actions .danger {
    color: #fff;
    background: var(--danger);
  }

  .toasts {
    position: fixed;
    right: 1rem;
    bottom: 2.75rem;
    z-index: var(--z-toast);
    display: grid;
    gap: 0.4rem;
    justify-items: end;
  }
  .toast {
    max-width: 24rem;
    padding: 0.55rem 0.9rem;
    border-radius: 10px;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--fg);
    background: var(--surface);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-md);
    animation: rise 240ms var(--ease-out-expo);
  }
  .toast.ok {
    border-color: color-mix(in oklab, var(--success) 40%, var(--line));
  }
  .toast.error {
    color: var(--danger);
    border-color: color-mix(in oklab, var(--danger) 45%, var(--line));
  }

  .spinner {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 999px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: spin 700ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
  }

  @media (width < 70rem) {
    .app.with-inspector {
      grid-template-columns: 15rem minmax(0, 1fr) 18rem;
    }
    .seg button span {
      display: none;
    }
  }
</style>
