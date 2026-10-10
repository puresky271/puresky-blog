<script lang="ts">
  /**
   * Writer.svelte — 文章模式的中间栏。
   *
   *   顶栏     链接、保存状态、写作 / 分栏 / 预览、保存、一键发布（保存 → 提交这篇 → 推送）
   *   工具栏   见 Toolbar.svelte
   *   正文     标题和摘要直接写在正文上方；CodeMirror；预览走站点同一条渲染管线
   *   状态栏   字数、阅读时间、选中字数、行列、问题数
   *
   * 没保存的内容每隔一会儿存一份到 localStorage，意外关掉页面后打开同一篇会提示恢复。
   */
  import { tick, untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import {
    iArrowSquareOut,
    iCheck,
    iCircleDashed,
    iCloudArrowUp,
    iCornersIn,
    iCornersOut,
    iEye,
    iFloppyDisk,
    iPencilSimple,
    iPlus,
    iSidebarSimple,
    iSlidersHorizontal,
    iWarning,
  } from '@/lib/icons.generated';

  import { api } from './client';
  import CodeEditor from './CodeEditor.svelte';
  import { countText, ed, relative, type View } from './store.svelte';
  import Toolbar from './Toolbar.svelte';

  const VIEWS: [View, string, typeof iEye][] = [
    ['write', '写作', iPencilSimple],
    ['split', '分栏', iSlidersHorizontal],
    ['preview', '预览', iEye],
  ];

  let editor = $state<ReturnType<typeof CodeEditor>>();
  let previewEl = $state<HTMLElement>();
  let titleEl = $state<HTMLTextAreaElement>();
  let previewHtml = $state('');
  let previewError = $state('');
  let previewBusy = $state(false);

  $effect(() => {
    ed.cm = editor ?? null;
    return () => (ed.cm = null);
  });

  const counts = $derived(countText(ed.doc?.body ?? ''));
  const focusMode = $derived(!ed.sidebar && !ed.inspector);

  const publish = $derived.by(() => {
    switch (ed.docSync) {
      case 'synced':
        return { label: '已发布', hint: '这篇的最新版本已经在 GitHub 上了', done: true };
      case 'unpushed':
        return { label: '推送', hint: '已经提交，还没推送到 GitHub', done: false };
      default:
        return { label: '发布', hint: '保存、提交这篇（连同分类标签的改动），再推送到 GitHub', done: false };
    }
  });

  // ── 换文章 ─────────────────────────────────────────────────────────────────

  $effect(() => {
    void ed.docVersion;
    untrack(() => {
      previewHtml = '';
      previewError = '';
      if (ed.doc?.isNew) void tick().then(() => titleEl?.focus());
    });
  });

  // ── 预览 ───────────────────────────────────────────────────────────────────

  let previewTimer = 0;
  let previewToken = 0;
  function schedulePreview(delay = 320) {
    clearTimeout(previewTimer);
    const doc = ed.doc;
    if (!doc || ed.view === 'write') return;
    const token = ++previewToken;
    const { slug, body } = doc;
    previewTimer = window.setTimeout(async () => {
      previewBusy = true;
      try {
        const { html } = await api.preview(slug, body);
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

  // 换了文章立刻渲染，边写边改时稍等一下再渲染。
  let lastVersion = -1;
  $effect(() => {
    void ed.doc?.body;
    void ed.view;
    const version = ed.docVersion;
    schedulePreview(version !== lastVersion ? 0 : 320);
    lastVersion = version;
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
    if (ed.view !== 'split' || !previewEl) return;
    previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight);
  }

  // 大纲点到第 index 个标题时，预览也滚到那里。
  $effect(() => {
    ed.revealHeading = (index) => {
      const heading = previewEl?.querySelectorAll<HTMLElement>('.pv-body :is(h1, h2, h3, h4, h5, h6)')[index];
      if (heading && previewEl) previewEl.scrollTo({ top: heading.offsetTop - 16, behavior: 'smooth' });
    };
    return () => (ed.revealHeading = null);
  });

  // ── 本地草稿 ───────────────────────────────────────────────────────────────

  let draftTimer = 0;
  $effect(() => {
    const doc = ed.doc;
    if (!doc || !ed.dirty) return;
    const key = ed.draftKey(doc);
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

  // ── 图片 ───────────────────────────────────────────────────────────────────

  async function uploadImage(file: File): Promise<string> {
    if (!ed.doc) throw new Error('没有打开的文章');
    try {
      const { path } = await api.upload(ed.doc.slug, file);
      ed.toast('ok', '图片已保存到本机（不进仓库）');
      return path;
    } catch (error) {
      ed.toast('error', `图片上传失败：${(error as Error).message}`);
      throw error;
    }
  }

  function toggleFocus() {
    ed.sidebar = focusMode;
    ed.inspector = focusMode;
  }
</script>

{#if ed.doc}
  {@const doc = ed.doc}
  <main class="writer">
    <header class="top">
      <button type="button" class="ed-icon" class:on={ed.sidebar} onclick={() => (ed.sidebar = !ed.sidebar)} title="文章列表" aria-label="文章列表">
        <Icon icon={iSidebarSimple} size={17} />
      </button>
      <div class="crumbs">
        <span class="path font-mono">/posts/{doc.slug}/</span>
        {#if ed.saving}
          <span class="state"><span class="ed-spinner"></span>保存中</span>
        {:else if ed.dirty || doc.isNew}
          <span class="state unsaved"><Icon icon={iCircleDashed} size={13} />{doc.isNew ? '新文章，未保存' : '未保存'}</span>
        {:else if ed.savedAt}
          <span class="state saved"><Icon icon={iCheck} size={13} />已保存 · {relative(ed.savedAt)}</span>
        {/if}
      </div>

      <div class="ed-seg" role="tablist" aria-label="视图">
        {#each VIEWS as [id, label, icon]}
          <button type="button" role="tab" aria-selected={ed.view === id} onclick={() => (ed.view = id)} title={`${label}（Ctrl+\\ 切换）`}>
            <Icon {icon} size={14} /><span class="seg-label">{label}</span>
          </button>
        {/each}
      </div>

      <div class="actions">
        {#if !doc.isNew}
          <a class="ed-icon" href={`/posts/${doc.previousSlug}/`} target="_blank" rel="noopener" title="在站点里打开" aria-label="在站点里打开"><Icon icon={iArrowSquareOut} size={17} /></a>
        {/if}
        <button type="button" class="ed-icon" onclick={toggleFocus} title="专注：收起两侧栏（Ctrl+Shift+F）" aria-label="专注模式" aria-pressed={focusMode}>
          <Icon icon={focusMode ? iCornersIn : iCornersOut} size={17} />
        </button>
        <button type="button" class="ed-icon" class:on={ed.inspector} onclick={() => (ed.inspector = !ed.inspector)} title="文章设置（Ctrl+.）" aria-label="文章设置">
          <Icon icon={iSlidersHorizontal} size={17} />
        </button>
        <button type="button" class="ed-btn" onclick={() => ed.save()} disabled={ed.saving || ed.restarting || (!ed.dirty && !doc.isNew)} title="保存（Ctrl+S）">
          <Icon icon={iFloppyDisk} size={15} />{doc.isNew ? '创建' : '保存'}
        </button>
        <button type="button" class="ed-btn primary" onclick={() => ed.publishCurrent()} disabled={publish.done || ed.publishing || ed.gitBusy || ed.restarting} title={publish.hint}>
          {#if ed.publishing}<span class="ed-spinner"></span>发布中{:else}<Icon icon={publish.done ? iCheck : iCloudArrowUp} size={15} />{publish.label}{/if}
        </button>
      </div>
    </header>

    {#if ed.restore}
      <div class="ed-banner warn">
        <Icon icon={iWarning} size={15} />
        <span>发现一份没保存的本地草稿（{relative(ed.restore.savedAt)}）。</span>
        <button type="button" class="ed-link" onclick={() => ed.applyRestore()}>恢复</button>
        <button type="button" class="ed-link muted" onclick={() => ed.dropRestore()}>丢弃</button>
      </div>
    {/if}
    {#if ed.restarting}
      <div class="ed-banner info"><span class="ed-spinner"></span>正在应用新的分类和标签：dev server 重启中，几秒后就能保存。写作不受影响。</div>
    {/if}

    {#if ed.view !== 'preview'}<Toolbar />{/if}

    <div class="workspace" data-view={ed.view}>
      <section class="pane write" hidden={ed.view === 'preview'}>
        <div class="head-fields">
          <textarea bind:this={titleEl} id="f-title" class="title-input" rows="1" placeholder="标题" bind:value={doc.frontmatter.title}></textarea>
          <textarea id="f-desc" class="desc-input" rows="2" placeholder="一句话摘要：讲清楚问题和结论（10 到 200 字）" bind:value={doc.frontmatter.description}></textarea>
        </div>
        <div class="cm-host">
          <CodeEditor
            bind:this={editor}
            initial={doc.body}
            onchange={(value) => ed.doc && (ed.doc.body = value)}
            oncursor={(pos) => (ed.cursor = pos)}
            onscrollratio={syncScroll}
            onimage={uploadImage}
          />
        </div>
      </section>

      {#if ed.view !== 'write'}
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

    <footer class="status">
      <span class="tabular">{counts.words.toLocaleString('zh-CN')} 字</span>
      <span>约 {counts.minutes} 分钟</span>
      {#if ed.cursor.selected}<span class="tabular">选中 {ed.cursor.selected} 字</span>{/if}
      <span class="tabular">第 {ed.cursor.line} 行，第 {ed.cursor.col} 列 · 共 {ed.cursor.lines} 行</span>
      <button
        type="button"
        class="issues"
        class:bad={ed.errors.length}
        onclick={() => {
          ed.inspector = true;
          ed.inspectorTab = 'settings';
        }}
      >
        {#if ed.errors.length}
          <Icon icon={iWarning} size={13} />{ed.errors.length} 个问题
        {:else if ed.issues.length}
          {ed.issues.length} 条建议
        {:else}
          <Icon icon={iCheck} size={13} />可以发布
        {/if}
      </button>
    </footer>
  </main>
{:else}
  <main class="welcome">
    <span class="welcome-mark" aria-hidden="true"></span>
    <h1>写点什么吧</h1>
    <p>从左边选一篇文章继续写，或者新建一篇。保存后站点会立即热更新；写完点右上角的「发布」，这篇就提交并推送到 GitHub 了。</p>
    <button type="button" class="ed-btn primary big" onclick={() => ed.newPost()}><Icon icon={iPlus} size={17} />新文章</button>
    <p class="welcome-tip">分类、标签、系列在左侧「整理」里管理；要挑着提交、看改了什么，去「提交」。按 <kbd>Ctrl</kbd> <kbd>/</kbd> 看全部快捷键。</p>
  </main>
{/if}

<style>
  .writer {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    height: 3.25rem;
    padding: 0 0.8rem 0 0.6rem;
    border-bottom: 1px solid var(--line);
  }
  .crumbs {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .actions .ed-btn {
    margin-left: 0.15rem;
  }
  .ed-link.muted {
    color: var(--fg-muted);
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
    min-width: 0;
    min-height: 0;
  }
  .pane[hidden] {
    display: none;
  }
  .write {
    display: flex;
    flex-direction: column;
  }
  .workspace[data-view='split'] .write {
    border-right: 1px solid var(--line);
  }
  .head-fields {
    width: 100%;
    max-width: 46rem;
    margin: 0 auto;
    padding: 1.4rem 1.25rem 0.25rem;
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
    field-sizing: content;
  }
  .title-input {
    font-size: 1.7rem;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .desc-input {
    margin-top: 0.45rem;
    font-family: var(--font-serif);
    font-size: 0.98rem;
    font-weight: 600;
    line-height: 1.7;
    color: var(--fg-muted);
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
    padding: 1.4rem 1.75rem 30vh;
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
  .status {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    height: 2rem;
    padding-inline: 1.1rem;
    border-top: 1px solid var(--line);
    font-size: 0.72rem;
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
  }
  .issues {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: auto;
    color: var(--success);
  }
  .issues.bad {
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
  .welcome .big {
    height: 2.7rem;
    margin-top: 1.5rem;
    padding-inline: 1.4rem;
    font-size: 0.875rem;
  }
  .welcome .welcome-tip {
    margin-top: 2rem;
    font-size: 0.8rem;
    color: var(--fg-subtle);
  }

  @media (width < 96rem) {
    .seg-label {
      display: none;
    }
  }
</style>
