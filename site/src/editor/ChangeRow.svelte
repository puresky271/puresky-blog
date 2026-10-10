<script lang="ts">
  /**
   * ChangeRow.svelte — 提交面板里的一行改动：勾选它要不要提交，双击或点右边的按钮看 diff。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowsClockwise, iFileImage, iFileText } from '@/lib/icons.generated';

  import type { GitChange } from './client';

  let {
    c,
    checked,
    oncheck,
    viewing,
    onshow,
    label,
  }: {
    c: GitChange;
    checked: boolean;
    oncheck: () => void;
    viewing: boolean;
    onshow: () => void;
    label: string;
  } = $props();
</script>

<button type="button" class="change" class:checked class:open={viewing} onclick={oncheck} ondblclick={onshow} title={c.path}>
  <input class="ed-check" type="checkbox" checked={checked} onclick={(e) => e.stopPropagation()} onchange={oncheck} tabindex="-1" />
  <span class="ed-code {c.code}">{c.code === 'A' ? '新' : c.code === 'D' ? '删' : '改'}</span>
  {#if c.kind === 'image'}<Icon icon={iFileImage} size={14} class="fileicon" />{:else if c.kind === 'config' || c.kind === 'post'}<Icon icon={iFileText} size={14} class="fileicon" />{/if}
  <span class="name">{label}</span>
  {#if c.kind === 'image'}<span class="ed-hint">{c.added != null ? '+' : ''}{c.added ?? ''}</span>{/if}
  <span class="ed-icon sm view" role="button" tabindex="0" onclick={(e) => { e.stopPropagation(); onshow(); }} onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onshow(); } }} title="看 diff" aria-label="看 diff"><Icon icon={iArrowsClockwise} size={12} /></span>
</button>

<style>
  .change {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    width: 100%;
    padding: 0.35rem 0.4rem;
    border-radius: 9px;
    text-align: left;
    transition: background-color 120ms ease;
  }
  .change:hover {
    background: var(--surface-2);
  }
  .change.checked {
    background: color-mix(in oklab, var(--accent) 6%, transparent);
  }
  .change.open {
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .fileicon {
    color: var(--fg-subtle);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8rem;
  }
  .view {
    opacity: 0;
    color: var(--fg-subtle);
  }
  .change:hover .view {
    opacity: 1;
  }
</style>
