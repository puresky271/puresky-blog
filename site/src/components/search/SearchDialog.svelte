<script lang="ts">
  /**
   * SearchDialog.svelte — 全站搜索。
   *
   * 索引由 Pagefind 在构建后生成，查询完全在浏览器里跑，不需要后端。
   * 用原生 <dialog>：焦点圈定、Esc 关闭、背景不可交互都由浏览器保证。
   *
   * 唤起方式：Ctrl/⌘+K、/ 键、或点任何带 data-search-open 的元素。
   */
  import { onMount, tick } from 'svelte';
  import { navigate } from 'astro:transitions/client';

  import Icon from '@/components/ui/Icon.svelte';
  import { withBase } from '@/lib/format';
  import {
    iArrowElbowDownRight,
    iArticle,
    iCalendarBlank,
    iGitCommit,
    iIdentificationCard,
    iMagnifyingGlass,
    iTag,
    iX,
  } from '@/lib/icons.generated';

  interface Result {
    url: string;
    title: string;
    excerpt: string;
  }

  interface Pagefind {
    options(opts: Record<string, unknown>): Promise<void>;
    debouncedSearch(query: string, opts?: object, ms?: number): Promise<{
      results: { data(): Promise<{ url: string; meta: { title?: string }; excerpt: string }> }[];
    } | null>;
  }

  let dialog = $state<HTMLDialogElement>();
  let input = $state<HTMLInputElement>();
  let query = $state('');
  let results = $state<Result[]>([]);
  let active = $state(0);
  let status = $state<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  /** 打开过一次之后才去加载索引，没用到搜索的访客不下载它。 */
  let opened = $state(false);

  let pagefind: Pagefind | null = null;

  const shortcuts = [
    { href: '/posts/', label: '全部文章', icon: iArticle },
    { href: '/archive/', label: '归档', icon: iCalendarBlank },
    { href: '/tags/', label: '标签', icon: iTag },
    { href: '/activity/', label: 'GitHub 动态', icon: iGitCommit },
    { href: '/card/', label: '名片', icon: iIdentificationCard },
  ];

  async function loadPagefind(): Promise<Pagefind | null> {
    if (pagefind) return pagefind;
    try {
      const url = withBase('/pagefind/pagefind.js');
      pagefind = (await import(/* @vite-ignore */ url)) as Pagefind;
      await pagefind.options({ baseUrl: import.meta.env.BASE_URL, excerptLength: 28 });
      return pagefind;
    } catch {
      status = 'unavailable';
      return null;
    }
  }

  async function open() {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    opened = true;
    await tick();
    input?.focus();
    input?.select();
  }

  function close() {
    dialog?.close();
  }

  async function search(value: string) {
    const engine = await loadPagefind();
    if (!engine) return;
    if (!value.trim()) {
      results = [];
      status = 'idle';
      return;
    }
    status = 'loading';
    const found = await engine.debouncedSearch(value, {}, 160);
    // debouncedSearch 在被新输入取代时返回 null。
    if (!found) return;
    const data = await Promise.all(found.results.slice(0, 8).map((r) => r.data()));
    results = data.map((d) => ({ url: d.url, title: d.meta.title ?? d.url, excerpt: d.excerpt }));
    active = 0;
    status = 'ready';
  }

  function go(url: string) {
    close();
    void navigate(url);
  }

  function onInputKey(event: KeyboardEvent) {
    const count = query.trim() ? results.length : shortcuts.length;
    if (event.key === 'ArrowDown') {
      active = (active + 1) % Math.max(1, count);
    } else if (event.key === 'ArrowUp') {
      active = (active - 1 + count) % Math.max(1, count);
    } else if (event.key === 'Enter') {
      const target = query.trim() ? results[active]?.url : withBase(shortcuts[active]?.href ?? '/');
      if (target) go(target);
    } else {
      return;
    }
    event.preventDefault();
    dialog?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  $effect(() => {
    if (opened) void search(query);
  });

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as Element).closest('input, textarea, [contenteditable="true"]');
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (dialog?.open) close();
        else void open();
      } else if (event.key === '/' && !typing && !dialog?.open) {
        event.preventDefault();
        void open();
      }
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest('[data-search-open]')) void open();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  });
</script>

<dialog
  bind:this={dialog}
  class="search"
  aria-label="搜索"
  onclick={(e) => {
    // 点在 dialog 自身（也就是遮罩区域）上时关闭。
    if (e.target === dialog) close();
  }}
>
  <div class="box card">
    <div class="field">
      <Icon icon={iMagnifyingGlass} size={18} class="text-fg-subtle" />
      <input
        bind:this={input}
        bind:value={query}
        type="search"
        placeholder="搜索文章标题和正文"
        aria-label="搜索关键词"
        autocomplete="off"
        spellcheck="false"
        onkeydown={onInputKey}
      />
      <button type="button" class="icon-btn -mr-1" onclick={close} aria-label="关闭搜索">
        <Icon icon={iX} size={17} />
      </button>
    </div>

    <div class="body">
      {#if status === 'unavailable'}
        <p class="hint">
          搜索索引在构建时生成。开发模式下没有索引，运行 <code>npm run build</code> 后用
          <code>npm run preview</code> 预览即可搜索。
        </p>
      {:else if !query.trim()}
        <p class="group-label">快速前往</p>
        <ul>
          {#each shortcuts as item, i}
            <li>
              <a
                href={withBase(item.href)}
                class="item"
                data-index={i}
                data-active={active === i}
                onclick={(e) => {
                  e.preventDefault();
                  go(withBase(item.href));
                }}
                onmouseenter={() => (active = i)}
              >
                <Icon icon={item.icon} size={16} class="text-fg-subtle" />
                <span>{item.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      {:else if status === 'loading' && results.length === 0}
        <div class="space-y-3 p-3">
          {#each [60, 85, 70] as width}
            <div class="skeleton h-4" style="width: {width}%"></div>
          {/each}
        </div>
      {:else if results.length === 0}
        <p class="hint">没有找到和「{query}」相关的内容。换个词试试，或者去<a class="link" href={withBase('/tags/')} onclick={close}>标签页</a>看看。</p>
      {:else}
        <ul>
          {#each results as result, i (result.url)}
            <li>
              <a
                href={result.url}
                class="item result"
                data-index={i}
                data-active={active === i}
                onclick={(e) => {
                  e.preventDefault();
                  go(result.url);
                }}
                onmouseenter={() => (active = i)}
              >
                <span class="flex items-center gap-2 font-medium text-fg">
                  <Icon icon={iArticle} size={15} class="text-fg-subtle" />
                  <span class="truncate">{result.title}</span>
                </span>
                <span class="excerpt">{@html result.excerpt}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <footer>
      <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
      <span><kbd><Icon icon={iArrowElbowDownRight} size={11} /></kbd> 打开</span>
      <span><kbd>Esc</kbd> 关闭</span>
    </footer>
  </div>
</dialog>

<style>
  .search {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    height: 100%;
    margin: 0;
    padding: 12vh 16px 16px;
    background: transparent;
    border: 0;
    color: inherit;
  }
  .search::backdrop {
    background: color-mix(in oklab, var(--bg) 55%, transparent);
    backdrop-filter: blur(6px);
  }
  .search[open] .box {
    animation: pop 260ms var(--ease-out-expo);
  }
  .search[open]::backdrop {
    animation: fade 200ms ease;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.98);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  .box {
    max-width: 600px;
    margin-inline: auto;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--line);
  }
  .field input {
    flex: 1;
    min-width: 0;
    height: 2.25rem;
    background: transparent;
    font-size: 1rem;
    color: var(--fg);
    outline: none;
  }
  .field input::placeholder {
    color: var(--fg-muted);
  }
  .field input::-webkit-search-cancel-button {
    display: none;
  }

  .body {
    max-height: min(56vh, 460px);
    overflow-y: auto;
    padding: 0.5rem;
    overscroll-behavior: contain;
  }
  .group-label {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.7rem;
    border-radius: var(--radius-control);
    font-size: 0.9375rem;
    color: var(--fg);
  }
  .item.result {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  .item[data-active='true'] {
    background: var(--surface-2);
  }
  .excerpt {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--fg-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .excerpt :global(mark) {
    background: transparent;
    color: var(--accent-strong);
    font-weight: 600;
  }
  .hint {
    padding: 2.5rem 1rem;
    text-align: center;
    font-size: 0.875rem;
    line-height: 1.8;
    color: var(--fg-muted);
  }
  .hint code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    padding: 0.1em 0.35em;
    border-radius: 5px;
    background: var(--surface-2);
  }

  footer {
    display: flex;
    gap: 1rem;
    padding: 0.6rem 1rem;
    border-top: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  footer kbd {
    display: inline-grid;
    place-items: center;
    min-width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.2rem;
    padding-inline: 0.25rem;
    border-radius: 5px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    font-family: var(--font-mono);
    font-size: 0.6875rem;
  }
  @media (width < 40rem) {
    footer {
      display: none;
    }
  }
</style>
