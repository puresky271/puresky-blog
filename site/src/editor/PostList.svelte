<script lang="ts">
  /**
   * PostList.svelte — 文章模式的左栏：新建、搜索、按状态筛选（公开 / 草稿 / 归档）、文章列表。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iMagnifyingGlass, iPlus } from '@/lib/icons.generated';

  import { ed } from './store.svelte';

  type Filter = 'all' | 'public' | 'draft' | 'archived';
  const FILTERS: [Filter, string][] = [
    ['all', '全部'],
    ['public', '公开'],
    ['draft', '草稿'],
    ['archived', '归档'],
  ];

  let query = $state('');
  let filter = $state<Filter>('all');

  const statusOf = (p: { draft: boolean; archived: boolean }): Filter => (p.draft ? 'draft' : p.archived ? 'archived' : 'public');
  const count = (f: Filter) => (f === 'all' ? ed.posts.length : ed.posts.filter((p) => statusOf(p) === f).length);

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return ed.posts.filter((p) => {
      if (filter !== 'all' && statusOf(p) !== filter) return false;
      if (!q) return true;
      return [p.title, p.slug, p.description, p.series ?? '', ...p.tags].some((s) => s.toLowerCase().includes(q));
    });
  });

  const categoryLabel = (id: string | null) => ed.vocab.categories.find((c) => c.id === id)?.label ?? '未分类';
</script>

<aside class="side">
  <button type="button" class="ed-btn primary new" onclick={() => ed.newPost()}><Icon icon={iPlus} size={16} />新文章</button>

  <label class="search">
    <Icon icon={iMagnifyingGlass} size={15} />
    <input type="search" placeholder="搜索标题、链接、标签、系列" bind:value={query} />
  </label>

  <div class="ed-seg fill" role="tablist" aria-label="按状态筛选">
    {#each FILTERS as [id, label]}
      <button type="button" role="tab" aria-selected={filter === id} onclick={() => (filter = id)}>
        {label}<span class="n tabular">{count(id)}</span>
      </button>
    {/each}
  </div>

  <ul class="list">
    {#each visible as p (p.slug)}
      {@const active = ed.doc?.previousSlug === p.slug}
      <li>
        <button type="button" class="item" class:active onclick={() => ed.open(p.slug)}>
          <span class="title">
            {#if active && ed.dirty}<span class="dirty" title="有未保存的修改"></span>{/if}
            {p.title}
          </span>
          <span class="meta">
            <span class="tabular">{p.pubDate ?? '无日期'}</span><span class="sep">·</span>{categoryLabel(p.category)}<span class="sep">·</span><span class="tabular">{p.words.toLocaleString('zh-CN')} 字</span>
          </span>
          {#if p.draft || p.archived || p.featured || p.series || p.error}
            <span class="badges">
              {#if p.draft}<span class="ed-badge warn">草稿</span>{/if}
              {#if p.archived}<span class="ed-badge muted">已归档</span>{/if}
              {#if p.featured}<span class="ed-badge">精选</span>{/if}
              {#if p.series}<span class="ed-badge muted" title={p.series}>{p.series}{p.seriesOrder ? ` · ${p.seriesOrder}` : ''}</span>{/if}
              {#if p.error}<span class="ed-badge danger" title={p.error}>出错</span>{/if}
            </span>
          {/if}
        </button>
      </li>
    {:else}
      <li class="ed-empty">{ed.posts.length ? '没有匹配的文章' : '还没有文章'}</li>
    {/each}
  </ul>
</aside>

<style>
  .side {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    min-height: 0;
    padding: 0.85rem 0.7rem 0.5rem;
    border-right: 1px solid var(--line);
    background: var(--surface);
  }
  .new {
    height: 2.3rem;
    border-radius: 10px;
    box-shadow: 0 8px 20px -12px var(--accent);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    height: 2.15rem;
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
    border: 0;
    outline: none;
    background: none;
    font-size: 0.8125rem;
    color: var(--fg);
  }
  .ed-seg button {
    padding-inline: 0.3rem;
  }
  .n {
    margin-left: 0.15rem;
    font-size: 0.66rem;
    color: var(--fg-subtle);
  }
  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-inline: -0.25rem;
    padding-inline: 0.25rem;
  }
  .item {
    display: grid;
    gap: 0.22rem;
    width: 100%;
    padding: 0.55rem 0.6rem;
    border-radius: 10px;
    text-align: left;
    transition: background-color 140ms ease;
  }
  .item:hover {
    background: var(--surface-2);
  }
  .item.active {
    background: color-mix(in oklab, var(--accent) 10%, var(--surface));
    box-shadow: inset 2.5px 0 0 var(--accent);
  }
  .title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.8125rem;
    font-weight: 550;
    line-height: 1.45;
  }
  .item.active .title {
    color: var(--accent-strong);
  }
  .dirty {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 0.3rem;
    border-radius: 999px;
    background: var(--warning);
    vertical-align: 0.1em;
  }
  .meta {
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .sep {
    margin-inline: 0.25rem;
    opacity: 0.6;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    min-width: 0;
  }
  .badges .ed-badge {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
