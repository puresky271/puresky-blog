<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    eyebrow = '动画演示',
    meta,
    configuration,
    children,
    controls,
  }: {
    title: string;
    eyebrow?: string;
    meta?: string;
    configuration?: Snippet;
    children: Snippet;
    controls: Snippet;
  } = $props();
</script>

<section class="animation-shell" aria-label={`${title}交互动画`}>
  <header class="shell-head">
    <div class="heading">
      <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <div>
        <span class="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
      </div>
    </div>
    {#if meta}<span class="meta">{meta}</span>{/if}
  </header>
  {#if configuration}<div class="configuration">{@render configuration()}</div>{/if}
  <div class="content">{@render children()}</div>
  <footer class="transport">{@render controls()}</footer>
</section>

<style>
  .animation-shell {
    overflow: visible;
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    color: var(--fg);
    font-size: 0.875rem;
    line-height: 1.6;
  }
  .shell-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 4.5rem;
    padding: 0.85rem 1.15rem;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(115deg, color-mix(in oklab, var(--accent) 4%, var(--surface)), var(--surface) 60%);
    border-radius: calc(var(--radius-card) - 1px) calc(var(--radius-card) - 1px) 0 0;
  }
  .heading { display: flex; align-items: center; gap: 0.75rem; }
  .mark {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
    width: 2.25rem;
    height: 2.25rem;
    padding-bottom: 0.65rem;
    border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--line));
    border-radius: 10px;
    background: var(--accent-soft);
  }
  .mark i { width: 3px; height: 0.55rem; border-radius: 3px; background: var(--accent); }
  .mark i:nth-child(2) { height: 0.85rem; }
  .mark i:nth-child(3) { height: 0.4rem; }
  .eyebrow {
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--accent);
  }
  h3 { margin: 0.05rem 0 0; font-size: 0.98rem; line-height: 1.45; letter-spacing: -0.01em; }
  .meta {
    padding: 0.25rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in oklab, var(--surface) 80%, transparent);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-muted);
    white-space: nowrap;
  }
  .configuration { padding: 1rem 1.15rem; border-bottom: 1px solid var(--line); }
  .content { padding: 1.15rem; }
  .transport { padding: 0.85rem 1.15rem 0.75rem; border-top: 1px solid var(--line); background: var(--surface-2); border-radius: 0 0 calc(var(--radius-card) - 1px) calc(var(--radius-card) - 1px); }
  @media (width < 40rem) {
    .shell-head { padding-inline: 0.85rem; }
    .configuration, .content { padding: 0.85rem; }
    .transport { padding-inline: 0.75rem; }
    .mark { display: none; }
  }
</style>
