<script lang="ts">
  /**
   * LeetCodePicker.svelte — 文章设置里的力扣题目输入。算法解题笔记可以同时关联多道题，
   * 回车按顺序加进去；粘贴力扣题目链接也可以，一次贴多条（逗号、空格或换行隔开）会一起加。
   * 第一个输入框的 id 给「设置」顶部的错误列表跳转用。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iX } from '@/lib/icons.generated';

  import { ed } from './store.svelte';

  const SLUG = /^[a-z0-9-]{1,120}$/;

  let draft = $state('');
  let error = $state('');

  const chosen = $derived(ed.doc?.frontmatter.leetcodeSlugs ?? []);

  /** 从输入里拆出 slug：整条力扣链接截取 /problems/<slug>/ 那一段，剩下的照原样当 slug。 */
  function parse(text: string): string[] {
    return text
      .split(/[\s,，]+/)
      .map((part) => /leetcode\.(?:cn|com)\/problems\/([a-z0-9-]+)/i.exec(part)?.[1] ?? part)
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean);
  }

  function add() {
    const doc = ed.doc;
    if (!doc) return;
    const parts = parse(draft);
    if (!parts.length) return;
    const invalid = parts.filter((slug) => !SLUG.test(slug));
    if (invalid.length) {
      error = `slug 只能用小写字母、数字和连字符：${invalid.join('、')}`;
      return;
    }
    const current = doc.frontmatter.leetcodeSlugs ?? [];
    const next = [...current];
    for (const slug of parts) if (!next.includes(slug)) next.push(slug);
    if (next.length === current.length) {
      error = '这些题目都已经关联过了';
      draft = '';
      return;
    }
    doc.frontmatter.leetcodeSlugs = next;
    draft = '';
    error = '';
  }

  function remove(slug: string) {
    if (!ed.doc) return;
    ed.doc.frontmatter.leetcodeSlugs = (ed.doc.frontmatter.leetcodeSlugs ?? []).filter((item) => item !== slug);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !draft && chosen.length) {
      remove(chosen[chosen.length - 1]!);
    }
  }
</script>

<div class="picker">
  <div class="box">
    {#each chosen as slug}
      <span class="chip">
        {slug}
        <button type="button" onclick={() => remove(slug)} aria-label={`移除 ${slug}`} title="移除"><Icon icon={iX} size={11} /></button>
      </span>
    {/each}
    <input
      id="f-leetcode"
      class="input"
      bind:value={draft}
      onkeydown={onKey}
      oninput={() => (error = '')}
      placeholder={chosen.length ? '继续添加，回车确认' : '例如 two-sum'}
      spellcheck="false"
      autocomplete="off"
      aria-label="力扣题目 slug"
    />
  </div>
  {#if error}<p class="error">{error}</p>{/if}
</div>

<style>
  .picker {
    display: grid;
    gap: 0.35rem;
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
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--accent-strong);
    background: var(--accent-soft);
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
    min-width: 7rem;
    height: 1.6rem;
    padding: 0 0.3rem;
    border: 0;
    outline: none;
    background: none;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--fg);
  }
  .error {
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--danger);
  }
</style>
