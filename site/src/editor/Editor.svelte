<script lang="ts">
  /**
   * Editor.svelte — 本地文章编辑器（只在 astro dev 下的 /__editor 存在）的外壳。
   *
   * 最左边一条窄栏切换三种模式，三块面板各自挂载一次后就一直保留（切走只是隐藏），
   * 正文的光标、滚动位置、撤销历史都不会因为切模式而丢。
   *   文章   左：文章列表（Writer 旁边，可收起）  中：写作区  右：文章设置 / 大纲
   *   整理   分类、标签、系列的增删改和排序
   *   提交   勾选文件提交、看 diff、推送拉取、提交历史与撤销
   *
   * 共享状态和操作都在 store.svelte.ts。快捷键说明见 HELP。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArticle, iFolders, iGitBranch, iHouse, iKeyboard, iMoon, iSun, iX } from '@/lib/icons.generated';
  import { currentTheme, setPref } from '@/lib/theme';

  import GitPanel from './GitPanel.svelte';
  import Inspector from './Inspector.svelte';
  import Organize from './Organize.svelte';
  import PostList from './PostList.svelte';
  import { ed, type Mode } from './store.svelte';
  import Writer from './Writer.svelte';

  const HELP: [string, string][] = [
    ['Ctrl S', '保存'],
    ['Ctrl \\', '切换写作 / 分栏 / 预览'],
    ['Ctrl .', '开关文章设置'],
    ['Ctrl Shift F', '专注：收起两侧栏'],
    ['Alt 1 / 2 / 3', '文章 / 整理 / 提交'],
    ['Ctrl B / I / K / E', '加粗 / 斜体 / 链接 / 行内代码'],
    ['Ctrl Alt 2 / 3 / 4', '二 / 三 / 四级标题（0 变回正文）'],
    ['Ctrl F', '在正文里搜索替换'],
    ['Ctrl Enter', '提交说明里：提交并推送'],
    ['粘贴图片', '自动上传到文章的图片目录'],
    ['选中文字粘贴网址', '直接变成链接'],
  ];

  const MODES: { id: Mode; label: string; icon: typeof iArticle; key: string }[] = [
    { id: 'write', label: '文章', icon: iArticle, key: 'Alt+1' },
    { id: 'organize', label: '整理', icon: iFolders, key: 'Alt+2' },
    { id: 'git', label: '提交', icon: iGitBranch, key: 'Alt+3' },
  ];

  let theme = $state<'light' | 'dark'>('light');
  let help = $state(false);
  // 整理和提交面板第一次打开时才挂载，之后一直保留。
  let mounted = $state<Record<Mode, boolean>>({ write: true, organize: false, git: false });
  $effect(() => {
    mounted[ed.mode] = true;
  });

  // 界面偏好（视图、两侧栏）记在本机，下次打开还是这样。
  $effect(() => {
    void [ed.view, ed.sidebar, ed.inspector];
    ed.saveUi();
  });

  const pending = $derived(ed.git?.changes.length ?? 0);

  function pickMode(mode: Mode) {
    // 已经在「文章」里再点一次：收起或展开文章列表。
    if (mode === 'write' && ed.mode === 'write') ed.sidebar = !ed.sidebar;
    else ed.mode = mode;
  }

  function toggleFocus() {
    const open = ed.sidebar || ed.inspector;
    ed.sidebar = !open;
    ed.inspector = !open;
  }

  function toggleTheme(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPref(currentTheme() === 'dark' ? 'light' : 'dark', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  function onKey(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === 'Escape') {
      if (ed.confirmBox) ed.answer(null);
      else if (help) help = false;
      return;
    }
    if (event.altKey && !mod && ['1', '2', '3'].includes(event.key)) {
      event.preventDefault();
      ed.mode = MODES[Number(event.key) - 1]!.id;
      return;
    }
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 's' && !event.shiftKey) {
      event.preventDefault();
      void ed.save();
    } else if (event.key === '\\') {
      event.preventDefault();
      ed.view = ed.view === 'split' ? 'write' : ed.view === 'write' ? 'preview' : 'split';
    } else if (event.key === '.') {
      event.preventDefault();
      ed.inspector = !ed.inspector;
    } else if (key === 'f' && event.shiftKey) {
      event.preventDefault();
      toggleFocus();
    } else if (event.key === '/') {
      event.preventDefault();
      help = !help;
    }
  }

  onMount(() => {
    theme = currentTheme();
    const onTheme = () => (theme = currentTheme());
    window.addEventListener('theme:change', onTheme);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (ed.dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    const onFocus = () => void ed.refreshGit(true);
    window.addEventListener('focus', onFocus);

    if (import.meta.hot) {
      // Astro 在文章、config.ts 或任何服务端模块变化时，会让所有打开的页面整页刷新。编辑器自己管理数据，
      // 刷新只会丢掉光标、滚动位置和撤销历史（以前每按一次 Ctrl+S 都会这样）。
      // Vite 客户端在这个事件之后检查 payload.path：指向别的 .html 页面时就不刷新当前页。
      import.meta.hot.on('vite:beforeFullReload', (payload) => {
        payload.path = '/__editor-stays.html';
      });
      // 改了词表之后 dev server 会原地重启，Vite 客户端发现断线后会等服务回来再刷新页面。
      // 让这个监听一直不结束，客户端就停在等待里不刷新；新服务起来没有，由 store.waitForRestart 自己判断。
      import.meta.hot.on('vite:ws:disconnect', () => new Promise<void>(() => {}));
    }

    ed.loadUi();
    void (async () => {
      await ed.loadAll();
      const params = new URLSearchParams(location.search);
      const slug = params.get('post');
      if (slug) await ed.open(slug);
      else if (params.has('new')) await ed.newPost();
    })();

    return () => {
      window.removeEventListener('theme:change', onTheme);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('focus', onFocus);
    };
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="ed">
  <div class="shell">
    <nav class="rail" aria-label="模式">
      <span class="mark" aria-hidden="true"></span>
      {#each MODES as m}
        <button type="button" class="rail-btn" class:active={ed.mode === m.id} onclick={() => pickMode(m.id)} title={`${m.label}（${m.key}）`} aria-pressed={ed.mode === m.id}>
          <Icon icon={m.icon} size={20} />
          <span>{m.label}</span>
          {#if m.id === 'git' && (pending || ed.git?.ahead)}
            <i class="rail-badge" class:dot={!pending}>{pending || ''}</i>
          {/if}
        </button>
      {/each}
      <span class="rail-gap"></span>
      {#if ed.restarting}
        <span class="rail-status" title="词表改了，dev server 正在重启"><span class="ed-spinner"></span></span>
      {/if}
      <button type="button" class="ed-icon" onclick={() => (help = !help)} title="快捷键（Ctrl+/）" aria-label="快捷键"><Icon icon={iKeyboard} size={18} /></button>
      <button type="button" class="ed-icon" onclick={toggleTheme} title="切换亮暗" aria-label="切换亮暗"><Icon icon={theme === 'dark' ? iSun : iMoon} size={18} /></button>
      <a href="/" class="ed-icon" title="回到站点" aria-label="回到站点"><Icon icon={iHouse} size={18} /></a>
    </nav>

    <div class="stage">
      <div class="mode write-mode" class:with-side={ed.sidebar} class:with-inspector={ed.inspector && ed.doc} hidden={ed.mode !== 'write'}>
        {#if ed.sidebar}<PostList />{/if}
        <Writer />
        {#if ed.inspector && ed.doc}<Inspector />{/if}
      </div>
      {#if mounted.organize}
        <div class="mode" hidden={ed.mode !== 'organize'}><Organize /></div>
      {/if}
      {#if mounted.git}
        <div class="mode" hidden={ed.mode !== 'git'}><GitPanel active={ed.mode === 'git'} /></div>
      {/if}
    </div>
  </div>

  {#if help}
    <div class="ed-overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && (help = false)}>
      <div class="ed-dialog help" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="help-head">
          <h2 id="help-title">快捷键</h2>
          <button type="button" class="ed-icon" onclick={() => (help = false)} aria-label="关闭"><Icon icon={iX} size={16} /></button>
        </div>
        <dl>
          {#each HELP as [keys, what]}
            <div>
              <dt>
                {#if /^[\x20-\x7e]+$/.test(keys)}
                  {#each keys.split(' ') as k}{#if k === '/'}<span class="slash">/</span>{:else}<kbd>{k}</kbd>{/if}{/each}
                {:else}
                  {keys}
                {/if}
              </dt>
              <dd>{what}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </div>
  {/if}

  {#if ed.confirmBox}
    <div class="ed-overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && ed.answer(null)}>
      <div class="ed-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-title">
        <h2 id="cf-title">{ed.confirmBox.title}</h2>
        <p>{ed.confirmBox.text}</p>
        <div class="ed-dialog-actions">
          <button type="button" class="ed-btn" onclick={() => ed.answer(null)}>取消</button>
          {#each ed.confirmBox.choices as c}
            <button type="button" class="ed-btn {c.kind === 'ghost' ? '' : (c.kind ?? 'primary')}" onclick={() => ed.answer(c.id)}>{c.label}</button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div class="ed-toasts" aria-live="polite">
    {#each ed.toasts as t (t.id)}
      <div class="ed-toast {t.kind}">
        <span>{t.text}</span>
        {#if t.action?.href}
          <a class="ed-link" href={t.action.href} target="_blank" rel="noopener">{t.action.label}</a>
        {:else if t.action?.run}
          <button type="button" class="ed-link" onclick={() => (t.action?.run?.(), ed.dismiss(t.id))}>{t.action.label}</button>
        {/if}
        <button type="button" class="ed-icon sm" onclick={() => ed.dismiss(t.id)} aria-label="关闭"><Icon icon={iX} size={12} /></button>
      </div>
    {/each}
  </div>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 4.25rem minmax(0, 1fr);
    height: 100%;
  }

  .rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.85rem 0 0.75rem;
    border-right: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface-2) 55%, var(--surface));
  }
  .mark {
    width: 28px;
    height: 28px;
    margin-bottom: 0.6rem;
    border-radius: 9px;
    background: linear-gradient(160deg, oklch(0.86 0.08 230), var(--accent) 70%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35);
  }
  .rail-btn {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    width: 3.4rem;
    padding: 0.5rem 0 0.4rem;
    border-radius: 12px;
    font-size: 0.68rem;
    color: var(--fg-muted);
    transition:
      background-color 140ms ease,
      color 140ms ease;
  }
  .rail-btn:hover {
    color: var(--fg);
    background: var(--surface-2);
  }
  .rail-btn.active {
    color: var(--accent-strong);
    background: var(--accent-soft);
  }
  .rail-btn.active::before {
    content: '';
    position: absolute;
    left: -0.42rem;
    top: 0.6rem;
    bottom: 0.6rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--accent);
  }
  .rail-badge {
    position: absolute;
    top: 0.25rem;
    right: 0.45rem;
    min-width: 1.05rem;
    height: 1.05rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-style: normal;
    font-weight: 700;
    line-height: 1.05rem;
    color: var(--accent-fg);
    background: var(--accent);
  }
  .rail-badge.dot {
    min-width: 0.5rem;
    width: 0.5rem;
    height: 0.5rem;
    padding: 0;
    top: 0.45rem;
    right: 0.85rem;
    background: var(--warning);
  }
  .rail-gap {
    flex: 1;
  }
  .rail-status {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: var(--accent);
  }

  .stage {
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .mode {
    height: 100%;
    min-height: 0;
  }
  .mode[hidden] {
    display: none;
  }
  .write-mode {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .write-mode.with-side {
    grid-template-columns: 17rem minmax(0, 1fr);
  }
  .write-mode.with-inspector {
    grid-template-columns: minmax(0, 1fr) 21rem;
  }
  .write-mode.with-side.with-inspector {
    grid-template-columns: 17rem minmax(0, 1fr) 21rem;
  }

  .help {
    width: min(34rem, 100%);
  }
  .help-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .help dl {
    display: grid;
    gap: 0.55rem;
  }
  .help dl div {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
    font-size: 0.8125rem;
  }
  .help dt {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    color: var(--fg-muted);
  }
  .help dd {
    color: var(--fg);
  }
  .slash {
    color: var(--fg-subtle);
  }

  @media (width < 80rem) {
    .write-mode.with-side {
      grid-template-columns: 15rem minmax(0, 1fr);
    }
    .write-mode.with-inspector {
      grid-template-columns: minmax(0, 1fr) 19rem;
    }
    .write-mode.with-side.with-inspector {
      grid-template-columns: 15rem minmax(0, 1fr) 19rem;
    }
  }
</style>
