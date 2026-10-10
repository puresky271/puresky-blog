<script lang="ts">
  /**
   * TagPicker.svelte — 文章设置里的标签输入。只能从词表里选（写了词表外的标签整个文章集合会加载失败），
   * 输入的词词表里没有时，可以就地新建：填好 slug 和分组，写进 config.ts，再加到这篇上。
   * 键盘：↑ ↓ 选择，回车添加，退格删掉最后一个，Esc 收起。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iPlus, iX } from '@/lib/icons.generated';

  import { ed } from './store.svelte';

  const MAX = 6;

  let query = $state('');
  let open = $state(false);
  let active = $state(0);
  let creating = $state<{ name: string; slug: string; group: string; blurb: string } | null>(null);
  let busy = $state(false);

  const chosen = $derived(ed.doc?.frontmatter.tags ?? []);
  const full = $derived(chosen.length >= MAX);

  const groups = $derived.by(() => {
    const picked = new Set(chosen);
    const q = query.trim().toLowerCase();
    return ed.vocab.tagGroups
      .map((g) => ({
        ...g,
        tags: ed.vocab.tags.filter((t) => t.group === g.id && !picked.has(t.name) && (!q || t.name.toLowerCase().includes(q) || t.slug.includes(q))),
      }))
      .filter((g) => g.tags.length > 0);
  });
  const flat = $derived(groups.flatMap((g) => g.tags));
  const canCreate = $derived(query.trim().length > 0 && !ed.vocab.tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()));

  $effect(() => {
    void query;
    active = 0;
  });

  function add(name: string) {
    const doc = ed.doc;
    if (!doc) return;
    const current = doc.frontmatter.tags ?? [];
    if (current.includes(name) || current.length >= MAX) return;
    doc.frontmatter.tags = [...current, name];
    query = '';
  }

  function remove(name: string) {
    if (ed.doc) ed.doc.frontmatter.tags = (ed.doc.frontmatter.tags ?? []).filter((t) => t !== name);
  }

  /** 英文、数字直接转成 slug；中文名留空让人自己起，免得生成一串拼音缩写。 */
  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function startCreate() {
    const name = query.trim();
    creating = { name, slug: /^[\x20-\x7e]+$/.test(name) ? slugify(name) : '', group: ed.vocab.tagGroups[0]?.id ?? '', blurb: '' };
    open = false;
  }

  async function create() {
    if (!creating || busy) return;
    busy = true;
    const item = { ...creating, name: creating.name.trim(), slug: creating.slug.trim() };
    const ok = await ed.vocabOp({ kind: 'tag', action: 'create', item });
    busy = false;
    if (!ok) return;
    creating = null;
    add(item.name);
    ed.toast('ok', `已新建标签「${item.name}」`);
  }

  function onKey(event: KeyboardEvent) {
    const total = flat.length + (canCreate ? 1 : 0);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open = true;
      if (total) active = (active + (event.key === 'ArrowDown' ? 1 : -1) + total) % total;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active < flat.length && flat[active]) add(flat[active]!.name);
      else if (canCreate) startCreate();
    } else if (event.key === 'Backspace' && !query && chosen.length) {
      remove(chosen[chosen.length - 1]!);
    } else if (event.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="picker">
  <div class="box">
    {#each chosen as name}
      <span class="chip" class:unknown={!ed.vocab.tags.some((t) => t.name === name)}>
        #{name}
        <button type="button" onclick={() => remove(name)} aria-label={`移除 ${name}`}><Icon icon={iX} size={11} /></button>
      </span>
    {/each}
    <input
      id="f-tags"
      class="input"
      placeholder={full ? '已满' : '输入筛选，或新建'}
      bind:value={query}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 150)}
      onkeydown={onKey}
      disabled={full}
      autocomplete="off"
    />
  </div>

  {#if open && (flat.length || canCreate)}
    <div class="pop">
      {#each groups as group}
        <p class="pop-group">{group.label}</p>
        <div class="pop-tags">
          {#each group.tags as tag}
            <button type="button" class:active={flat[active] === tag} onmousedown={(e) => e.preventDefault()} onclick={() => add(tag.name)} title={tag.blurb}>#{tag.name}</button>
          {/each}
        </div>
      {/each}
      {#if canCreate}
        <button type="button" class="create" class:active={active === flat.length} onmousedown={(e) => e.preventDefault()} onclick={startCreate}>
          <Icon icon={iPlus} size={13} />新建标签「{query.trim()}」
        </button>
      {/if}
    </div>
  {/if}

  {#if creating}
    <div class="form">
      <p class="form-title">新建标签</p>
      <div class="grid2">
        <label class="f">
          <span class="ed-label">名字</span>
          <input class="ed-input" bind:value={creating.name} />
        </label>
        <label class="f">
          <span class="ed-label">slug</span>
          <input class="ed-input mono" bind:value={creating.slug} placeholder="例如 agent" spellcheck="false" />
        </label>
      </div>
      <label class="f">
        <span class="ed-label">分组</span>
        <select class="ed-input" bind:value={creating.group}>
          {#each ed.vocab.tagGroups as g}<option value={g.id}>{g.label}</option>{/each}
        </select>
      </label>
      <label class="f">
        <span class="ed-label">说明（可选）</span>
        <input class="ed-input" bind:value={creating.blurb} placeholder="一句话说清这个标签管什么" />
      </label>
      <p class="ed-hint">slug 进 URL（/tags/slug/），建好后不能改。会写进 config.ts，dev server 随后自动重启几秒。</p>
      <div class="form-actions">
        <button type="button" class="ed-btn sm quiet" onclick={() => (creating = null)} disabled={busy}>取消</button>
        <button type="button" class="ed-btn sm primary" onclick={create} disabled={busy || !creating.name.trim() || !creating.slug.trim()}>
          {#if busy}<span class="ed-spinner"></span>{/if}新建并加上
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .picker {
    position: relative;
    display: grid;
    gap: 0.5rem;
  }
  .box {
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
  .box:focus-within {
    border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
  }
  .chip {
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
  .chip.unknown {
    color: var(--danger);
    background: color-mix(in oklab, var(--danger) 12%, transparent);
  }
  .chip button {
    display: grid;
    place-items: center;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 999px;
  }
  .chip button:hover {
    background: color-mix(in oklab, currentColor 18%, transparent);
  }
  .input {
    flex: 1;
    min-width: 6rem;
    height: 1.6rem;
    padding: 0 0.3rem;
    border: 0;
    outline: none;
    background: none;
    font-size: 0.8125rem;
    color: var(--fg);
  }
  .pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: var(--z-raised);
    max-height: 17rem;
    overflow-y: auto;
    padding: 0.4rem 0.6rem 0.6rem;
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
  .pop-tags button:hover,
  .pop-tags button.active {
    color: var(--accent);
    border-color: color-mix(in oklab, var(--accent) 45%, var(--line));
    background: color-mix(in oklab, var(--accent) 6%, transparent);
  }
  .create {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    margin-top: 0.55rem;
    padding: 0.45rem 0.55rem;
    border-radius: 8px;
    border: 1px dashed color-mix(in oklab, var(--accent) 45%, var(--line));
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--accent);
  }
  .create:hover,
  .create.active {
    background: color-mix(in oklab, var(--accent) 7%, transparent);
  }
  .form {
    display: grid;
    gap: 0.55rem;
    padding: 0.75rem;
    border-radius: 12px;
    border: 1px solid color-mix(in oklab, var(--accent) 35%, var(--line));
    background: color-mix(in oklab, var(--accent) 4%, var(--surface));
  }
  .form-title {
    font-size: 0.8125rem;
    font-weight: 650;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .f {
    display: grid;
    gap: 0.3rem;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
</style>
