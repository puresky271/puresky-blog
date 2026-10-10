<script lang="ts">
  /**
   * Organize.svelte — 整理面板，管三样东西，都直接写回 config.ts / 文章文件。
   *
   *   分类   新建、改名、改说明、排序、删除（还有文章在用的不让删）。id 进 URL，建好后不能改。
   *   标签   按分组排；新建、改名、换分组、改说明、组内排序、删除（有文章在用的不让删）。slug 进 URL，建好后不能改。
   *          改名会同时把文章里的旧名换掉。
   *   系列   新建、改名、解散；把文章拖进 / 拖出系列，在系列里拖动调整顺序（seriesOrder 从 1 重排）。
   *
   * 改词表会让 dev server 重启几秒（见 store.vocabOp），期间这里会禁用、写作不受影响。
   */
  import { untrack } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iCaretDown, iCaretUp, iDotsSixVertical, iPencilSimple, iPlus, iTrash, iX } from '@/lib/icons.generated';

  import type { Category, TagGroup, Tag } from './client';
  import { ed } from './store.svelte';

  type Tab = 'categories' | 'tags' | 'series';
  const TABS: [Tab, string][] = [
    ['categories', '分类'],
    ['tags', '标签'],
    ['series', '系列'],
  ];
  const emptyForm = { label: '', id: '', blurb: '' };

  // ── 表单状态 ───────────────────────────────────────────────────────────────
  let catDraft = $state<{ label: string; id: string; blurb: string } | null>(null);
  let tagDraft = $state<{ name: string; slug: string; group: string; blurb: string } | null>(null);
  let seriesDraft = $state('');
  let editingCat = $state<string | null>(null);
  let editingTag = $state<string | null>(null);
  let renaming = $state<string | null>(null);
  let renameValue = $state('');
  let busy = $state(false);

  // ── 系列拖拽 ───────────────────────────────────────────────────────────────
  let dragSlug = $state<string | null>(null);
  let overSlug = $state<string | null>(null);

  const series = $derived.by(() => {
    const map = new Map<string, { slug: string; title: string; order: number }[]>();
    for (const p of ed.posts) {
      if (!p.series) continue;
      const list = map.get(p.series) ?? [];
      list.push({ slug: p.slug, title: p.title, order: p.seriesOrder ?? 0 });
      map.set(p.series, list);
    }
    return [...map.entries()].map(([name, posts]) => ({ name, posts: posts.sort((a, b) => a.order - b.order) }));
  });

  $effect(() => {
    // 文章设置里的「在整理里调整顺序」跳过来时要选中对应的系列，只做一次。
    if (ed.seriesFocus && ed.mode === 'organize') {
      const found = untrack(() => series.find((s) => s.name === ed.seriesFocus));
      if (found) {
        untrack(() => {
          editingTag = null;
          editingCat = null;
          selectedSeries = found.name;
        });
      }
      ed.seriesFocus = null;
    }
  });

  let selectedSeries = $state<string | null>(null);

  /** 串行跑一次改动：改词表 / 改系列期间禁用按钮。返回 fn 的结果，给调用方判断成功没有。 */
  async function op(fn: () => Promise<boolean>): Promise<boolean> {
    if (busy || ed.restarting) return false;
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  }

  // ── 分类 ───────────────────────────────────────────────────────────────────

  function catMove(id: string, delta: number) {
    void op(() => ed.vocabOp({ kind: 'category', action: 'move', id, delta }));
  }
  function catDelete(id: string, label: string) {
    void op(async () => {
      if (await ed.ask(`删除分类「${label}」？`, '有文章在用的分类删不掉；没被用到的会直接删掉，id 就再也用不了了。', '删除', true)) {
        await ed.vocabOp({ kind: 'category', action: 'delete', id });
      }
      return true;
    });
  }
  function catSave(id: string) {
    const draft = catDraft;
    if (!draft || !draft.label.trim() || !draft.blurb.trim()) return;
    void op(() => ed.vocabOp({ kind: 'category', action: 'update', id, item: { label: draft.label.trim(), blurb: draft.blurb.trim() } })).then((ok) => ok && (catDraft = null));
  }
  function catCreate() {
    const draft = catDraft;
    if (!draft || !draft.label.trim() || !draft.id.trim() || !draft.blurb.trim()) return;
    void op(() => ed.vocabOp({ kind: 'category', action: 'create', item: { id: draft.id.trim(), label: draft.label.trim(), blurb: draft.blurb.trim() } })).then((ok) => ok && (catDraft = null));
  }

  // ── 标签 ───────────────────────────────────────────────────────────────────

  function tagMove(name: string, delta: number) {
    void op(() => ed.vocabOp({ kind: 'tag', action: 'move', name, delta }));
  }
  function tagDelete(name: string) {
    void op(async () => {
      if (await ed.ask(`删除标签「#${name}」？`, '有文章在用的标签删不掉；没被用到的会直接删掉。', '删除', true)) {
        await ed.vocabOp({ kind: 'tag', action: 'delete', name });
      }
      return true;
    });
  }
  function tagSave(name: string) {
    const draft = tagDraft;
    if (!draft || !draft.name.trim()) return;
    void op(() => ed.vocabOp({ kind: 'tag', action: 'update', name, item: { name: draft.name.trim(), group: draft.group, blurb: draft.blurb.trim() } })).then((ok) => ok && (tagDraft = null));
  }
  function tagCreate() {
    const draft = tagDraft;
    if (!draft || !draft.name.trim() || !draft.slug.trim()) return;
    void op(() => ed.vocabOp({ kind: 'tag', action: 'create', item: { name: draft.name.trim(), slug: draft.slug.trim(), group: draft.group, blurb: draft.blurb.trim() } })).then((ok) => ok && (tagDraft = null));
  }

  function useCount(key: keyof typeof ed.vocab.usage, id: string) {
    return ed.vocab.usage[key][id] ?? 0;
  }

  // ── 系列 ───────────────────────────────────────────────────────────────────

  function seriesCreate() {
    const name = seriesDraft.trim();
    if (!name) return;
    void op(async () => {
      const ok = await ed.seriesOp({ action: 'order', name, slugs: [] });
      if (ok) {
        seriesDraft = '';
        selectedSeries = name;
        ed.toast('ok', `已新建系列「${name}」，把文章拖进来吧`);
      }
      return ok;
    });
  }
  function seriesRename(from: string) {
    renaming = from;
    renameValue = from;
  }
  function seriesRenameSave() {
    const from = renaming;
    const to = renameValue.trim();
    if (!from || !to || to === from) {
      renaming = null;
      return;
    }
    void op(async () => {
      const ok = await ed.seriesOp({ action: 'rename', from, to });
      if (ok && selectedSeries === from) selectedSeries = to;
      return ok;
    });
    renaming = null;
  }
  function seriesRemovePost(name: string, slug: string) {
    const list = series.find((s) => s.name === name);
    if (!list) return;
    void op(() => ed.seriesOp({ action: 'order', name, slugs: list.posts.filter((p) => p.slug !== slug).map((p) => p.slug) }));
  }
  function seriesDissolve(name: string) {
    void op(async () => {
      if (await ed.ask(`解散系列「${name}」？`, '文章都还在，只是不再属于这个系列、序号也清掉。', '解散', true)) {
        await ed.seriesOp({ action: 'order', name, slugs: [] });
      }
      return true;
    });
  }

  function dropOnSeries(name: string) {
    const slug = dragSlug;
    if (!slug) return;
    const list = series.find((s) => s.name === name);
    if (!list || list.posts.some((p) => p.slug === slug)) return;
    void op(() => ed.seriesOp({ action: 'order', name, slugs: [...list.posts.map((p) => p.slug), slug] }));
    dragSlug = null;
  }

  function dropIntoList(name: string) {
    const from = dragSlug;
    const over = overSlug;
    if (!from || !over || from === over) return;
    const list = series.find((s) => s.name === name);
    if (!list) return;
    const slugs = list.posts.map((p) => p.slug);
    const at = slugs.indexOf(over);
    slugs.splice(slugs.indexOf(from), 1);
    slugs.splice(at, 0, from);
    void op(() => ed.seriesOp({ action: 'order', name, slugs }));
    dragSlug = null;
  }
</script>

<div class="org">
  <header class="head">
    <h1>整理</h1>
    <div class="ed-seg" role="tablist">
      {#each TABS as [id, label]}
        <button type="button" role="tab" aria-selected={ed.organizeTab === id} onclick={() => (ed.organizeTab = id)}>{label}</button>
      {/each}
    </div>
    {#if ed.restarting}
      <span class="restarting" title="词表改了，dev server 正在重启"><span class="ed-spinner"></span>正在重启</span>
    {/if}
  </header>

  {#if ed.organizeTab === 'categories'}
    <div class="panel">
      <p class="intro">分类是文章的大方向，一篇一个。id 进 URL（/categories/id/），建好后不能改。</p>
      <ul class="rows">
        {#each ed.vocab.categories as c, i}
          <li>
            <span class="drag" aria-hidden="true"><Icon icon={iDotsSixVertical} size={16} /></span>
            <div class="moves">
              <button type="button" class="ed-icon sm" onclick={() => catMove(c.id, -1)} disabled={i === 0 || busy} aria-label="上移"><Icon icon={iCaretUp} size={13} /></button>
              <button type="button" class="ed-icon sm" onclick={() => catMove(c.id, 1)} disabled={i === ed.vocab.categories.length - 1 || busy} aria-label="下移"><Icon icon={iCaretDown} size={13} /></button>
            </div>
            {#if editingCat === c.id && catDraft}
              <div class="edit">
                <input class="ed-input" bind:value={catDraft.label} placeholder="名称" />
                <input class="ed-input" bind:value={catDraft.blurb} placeholder="说明" />
                <button type="button" class="ed-btn sm primary" onclick={() => catSave(c.id)} disabled={busy}>保存</button>
                <button type="button" class="ed-icon sm" onclick={() => ((editingCat = null), (catDraft = null))} aria-label="取消"><Icon icon={iX} size={13} /></button>
              </div>
            {:else}
              <div class="info">
                <p class="label"><span class="font-mono id">{c.id}</span> <b>{c.label}</b> <span class="ed-badge muted tabular">{useCount('categories', c.id)} 篇</span></p>
                <p class="blurb">{c.blurb}</p>
              </div>
              <button type="button" class="ed-icon sm" onclick={() => ((editingCat = c.id), (catDraft = { label: c.label, id: c.id, blurb: c.blurb }))} title="编辑" aria-label={`编辑 ${c.label}`}><Icon icon={iPencilSimple} size={13} /></button>
              <button type="button" class="ed-icon sm danger" onclick={() => catDelete(c.id, c.label)} disabled={useCount('categories', c.id) > 0 || busy} title={useCount('categories', c.id) ? '还有文章在用' : '删除'} aria-label={`删除 ${c.label}`}><Icon icon={iTrash} size={13} /></button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if catDraft && editingCat === null}
        <div class="new-form">
          <input class="ed-input" bind:value={catDraft.label} placeholder="名称，例如 工具" />
          <input class="ed-input mono" bind:value={catDraft.id} placeholder="id，例如 tools" spellcheck="false" />
          <input class="ed-input" bind:value={catDraft.blurb} placeholder="说明：分类页顶部会显示" />
          <button type="button" class="ed-btn primary" onclick={catCreate} disabled={busy || !catDraft.label.trim() || !catDraft.id.trim() || !catDraft.blurb.trim()}>新建</button>
          <button type="button" class="ed-icon" onclick={() => (catDraft = null)} aria-label="取消"><Icon icon={iX} size={14} /></button>
        </div>
      {:else if catDraft === null}
        <button type="button" class="add" onclick={() => (catDraft = { ...emptyForm })} disabled={busy}><Icon icon={iPlus} size={15} />新建分类</button>
      {/if}
    </div>
  {:else if ed.organizeTab === 'tags'}
    <div class="panel">
      <p class="intro">标签管「涉及哪些具体的东西」，一篇三到五个。slug 进 URL（/tags/slug/），建好后不能改。</p>
      {#each ed.vocab.tagGroups as g}
        {@const tags = ed.vocab.tags.filter((t) => t.group === g.id)}
        <section class="group">
          <h2>{g.label} <span class="ed-badge muted tabular">{tags.length}</span></h2>
          <ul class="rows">
            {#each tags as t, i}
              <li>
                <span class="drag" aria-hidden="true"><Icon icon={iDotsSixVertical} size={16} /></span>
                <div class="moves">
                  <button type="button" class="ed-icon sm" onclick={() => tagMove(t.name, -1)} disabled={i === 0 || busy} aria-label="上移"><Icon icon={iCaretUp} size={13} /></button>
                  <button type="button" class="ed-icon sm" onclick={() => tagMove(t.name, 1)} disabled={i === tags.length - 1 || busy} aria-label="下移"><Icon icon={iCaretDown} size={13} /></button>
                </div>
                {#if editingTag === t.name && tagDraft}
                  <div class="edit">
                    <input class="ed-input" bind:value={tagDraft.name} placeholder="名字" />
                    <select class="ed-input" bind:value={tagDraft.group}>
                      {#each ed.vocab.tagGroups as grp}<option value={grp.id}>{grp.label}</option>{/each}
                    </select>
                    <input class="ed-input" bind:value={tagDraft.blurb} placeholder="说明" />
                    <button type="button" class="ed-btn sm primary" onclick={() => tagSave(t.name)} disabled={busy}>保存</button>
                    <button type="button" class="ed-icon sm" onclick={() => ((editingTag = null), (tagDraft = null))} aria-label="取消"><Icon icon={iX} size={13} /></button>
                  </div>
                {:else}
                  <div class="info">
                    <p class="label">#{t.name} <span class="ed-badge muted tabular">{useCount('tags', t.name)} 篇</span></p>
                    {#if t.blurb}<p class="blurb">{t.blurb}</p>{/if}
                    <p class="font-mono id">slug: {t.slug}</p>
                  </div>
                  <button type="button" class="ed-icon sm" onclick={() => ((editingTag = t.name), (tagDraft = { name: t.name, slug: t.slug, group: t.group, blurb: t.blurb }))} title="编辑" aria-label={`编辑 ${t.name}`}><Icon icon={iPencilSimple} size={13} /></button>
                  <button type="button" class="ed-icon sm danger" onclick={() => tagDelete(t.name)} disabled={useCount('tags', t.name) > 0 || busy} title={useCount('tags', t.name) ? '还有文章在用' : '删除'} aria-label={`删除 ${t.name}`}><Icon icon={iTrash} size={13} /></button>
                {/if}
              </li>
            {/each}
          </ul>
          {#if tagDraft && tagDraft.group === g.id && editingTag === null}
            <div class="new-form">
              <input class="ed-input" bind:value={tagDraft.name} placeholder="名字，例如 检索增强" />
              <input class="ed-input mono" bind:value={tagDraft.slug} placeholder="slug，例如 rag" spellcheck="false" />
              <input class="ed-input" bind:value={tagDraft.blurb} placeholder="说明（可选）" />
              <button type="button" class="ed-btn primary" onclick={tagCreate} disabled={busy || !tagDraft.name.trim() || !tagDraft.slug.trim()}>新建</button>
              <button type="button" class="ed-icon" onclick={() => (tagDraft = null)} aria-label="取消"><Icon icon={iX} size={14} /></button>
            </div>
          {:else}
            <button type="button" class="add group-add" onclick={() => (tagDraft = { name: '', slug: '', group: g.id, blurb: '' })} disabled={busy}><Icon icon={iPlus} size={14} />在「{g.label}」里新建标签</button>
          {/if}
        </section>
      {/each}
    </div>
  {:else}
    <div class="panel series-panel">
      <p class="intro">系列把文章串成一条线，序号从 1 开始。把文章拖进系列、在系列里拖动调顺序，拖到下面「未加入系列」就是移出来。</p>
      <div class="columns">
        <div class="col">
          <h2>系列</h2>
          {#each series as s}
            <button type="button" class="series-card" class:selected={selectedSeries === s.name} onclick={() => (selectedSeries = selectedSeries === s.name ? null : s.name)} ondragover={(e) => { e.preventDefault(); overSlug = s.name; }} ondrop={(e) => { e.preventDefault(); dropOnSeries(s.name); }}>
              <span class="sname">{s.name}</span>
              <span class="ed-badge muted tabular">{s.posts.length} 篇</span>
            </button>
          {/each}
          {#if !series.length}<p class="ed-empty">还没有系列。</p>{/if}
          <div class="new-form">
            <input class="ed-input" bind:value={seriesDraft} placeholder="新系列的名字" onkeydown={(e) => e.key === 'Enter' && seriesCreate()} />
            <button type="button" class="ed-btn primary" onclick={seriesCreate} disabled={busy || !seriesDraft.trim()}>新建</button>
          </div>
        </div>
        <div class="col">
          {#if selectedSeries && series.find((s) => s.name === selectedSeries)}
            {@const s = series.find((x) => x.name === selectedSeries)!}
            {#if renaming === s.name}
              <div class="rename-row">
                <input class="ed-input" bind:value={renameValue} onkeydown={(e) => e.key === 'Enter' && seriesRenameSave()} />
                <button type="button" class="ed-btn sm primary" onclick={seriesRenameSave} disabled={busy}>保存</button>
                <button type="button" class="ed-icon sm" onclick={() => (renaming = null)} aria-label="取消"><Icon icon={iX} size={13} /></button>
              </div>
            {:else}
              <h2>{s.name}
                <span class="h-actions">
                  <button type="button" class="ed-btn sm quiet" onclick={() => seriesRename(s.name)} disabled={busy}>改名</button>
                  <button type="button" class="ed-btn sm quiet del" onclick={() => seriesDissolve(s.name)} disabled={busy}>解散</button>
                </span>
              </h2>
            {/if}
            <p class="ed-hint">拖动调整顺序，或者把文章拖进来。序号会自动从 1 重排。</p>
            <ol class="series-list">
              {#each s.posts as p, i}
                <li
                  draggable="true"
                  ondragstart={(e) => { dragSlug = p.slug; e.dataTransfer?.setData('text/plain', p.slug); }}
                  ondragover={(e) => { e.preventDefault(); overSlug = p.slug; }}
                  ondragend={() => ((dragSlug = null), (overSlug = null))}
                  ondrop={(e) => { e.preventDefault(); dropIntoList(s.name); }}
                  class:over={overSlug === p.slug}
                >
                  <Icon icon={iDotsSixVertical} size={15} />
                  <span class="n tabular">{i + 1}</span>
                  <span class="t">{p.title}</span>
                  <button type="button" class="ed-icon sm" onclick={() => seriesRemovePost(s.name, p.slug)} title="移出系列" aria-label={`把 ${p.title} 移出系列`}><Icon icon={iX} size={13} /></button>
                </li>
              {/each}
              {#if !s.posts.length}<li class="ed-empty drop-hint">把左边的文章拖到这里，或者从下面拖上来。</li>{/if}
            </ol>
            <h2 class="loose">未加入系列的文章</h2>
            <ul class="loose-list">
              {#each ed.posts.filter((p) => !p.series) as p}
                <li draggable="true" ondragstart={(e) => { dragSlug = p.slug; e.dataTransfer?.setData('text/plain', p.slug); }} ondragend={() => (dragSlug = null)}>
                  <Icon icon={iDotsSixVertical} size={15} /><span class="t">{p.title}</span><span class="ed-hint">{p.pubDate ?? ''}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="ed-empty">点一个系列看它的文章，拖动调整顺序。也可以从「文章」的右栏里直接给当前文章选系列。</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .org {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 3.25rem;
    padding: 0 1.2rem;
    border-bottom: 1px solid var(--line);
  }
  .head h1 {
    font-size: 1rem;
    font-weight: 700;
  }
  .restarting {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--accent);
  }
  .panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-width: 52rem;
    width: 100%;
    margin: 0 auto;
    padding: 1.4rem 2rem 4rem;
  }
  .intro {
    margin-bottom: 1.2rem;
    font-size: 0.8125rem;
    line-height: 1.65;
    color: var(--fg-muted);
  }
  .rows {
    display: grid;
    gap: 0.4rem;
  }
  .rows li {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.55rem;
    border-radius: 11px;
    border: 1px solid var(--line);
    background: var(--surface);
  }
  .drag {
    color: var(--fg-subtle);
  }
  .moves {
    display: flex;
    flex-direction: column;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.1rem;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
  }
  .label b {
    font-weight: 650;
  }
  .id {
    font-size: 0.7rem;
    color: var(--fg-subtle);
  }
  .blurb {
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--fg-subtle);
  }
  .edit {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .new-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }
  .new-form .ed-input {
    flex: 1;
  }
  .add {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2.1rem;
    margin-top: 0.6rem;
    padding-inline: 0.9rem;
    border-radius: 999px;
    border: 1px dashed var(--line-strong);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fg-muted);
  }
  .add:hover {
    color: var(--accent);
    border-color: color-mix(in oklab, var(--accent) 50%, var(--line));
  }
  .group {
    margin-top: 1.4rem;
  }
  .group h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
  }
  .group-add {
    margin-top: 0.5rem;
  }

  .series-panel {
    max-width: 60rem;
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 2rem;
    align-items: start;
  }
  .col {
    display: grid;
    gap: 0.4rem;
    min-width: 0;
  }
  .col > h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.2rem 0 0.4rem;
    font-size: 0.9rem;
    font-weight: 700;
  }
  .h-actions {
    display: flex;
    gap: 0.3rem;
  }
  .rename-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.2rem 0 0.4rem;
  }
  .series-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--surface);
    text-align: left;
    transition:
      border-color 140ms ease,
      background-color 140ms ease;
  }
  .series-card:hover,
  .series-card.selected {
    border-color: color-mix(in oklab, var(--accent) 45%, var(--line));
    background: color-mix(in oklab, var(--accent) 6%, var(--surface));
  }
  .series-card.selected {
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .sname {
    font-weight: 600;
    font-size: 0.85rem;
  }
  .series-list {
    display: grid;
    gap: 0.2rem;
  }
  .series-list li,
  .loose-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.55rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: grab;
  }
  .series-list li:active,
  .loose-list li:active {
    cursor: grabbing;
  }
  .series-list li.over {
    border-color: var(--accent);
    border-top-width: 2px;
  }
  .series-list .n {
    width: 1.2rem;
    text-align: right;
    color: var(--fg-subtle);
  }
  .t {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8125rem;
  }
  .loose {
    margin-top: 1.6rem;
  }
  .loose-list {
    display: grid;
    gap: 0.2rem;
  }
  .drop-hint {
    cursor: default;
    color: var(--fg-subtle);
    border-style: dashed;
  }
  .del {
    color: var(--danger);
  }
  @media (width < 70rem) {
    .columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
