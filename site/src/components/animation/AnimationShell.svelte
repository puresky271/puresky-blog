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
      <span class="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
    </div>
    {#if meta}<span class="meta">{meta}</span>{/if}
  </header>
  {#if configuration}<div class="configuration">{@render configuration()}</div>{/if}
  <div class="content">{@render children()}</div>
  <footer class="transport">{@render controls()}</footer>
</section>

<style>
  .animation-shell {
    --anim-line: var(--line);
    --anim-line-strong: color-mix(in oklab, var(--line-strong) 72%, var(--fg-muted) 28%);
    --anim-panel: var(--surface-2);
    --anim-inset: var(--surface);
    --anim-node-bg: var(--surface-2);
    --anim-edge: color-mix(in oklab, var(--line-strong) 55%, var(--fg-muted) 45%);
    --anim-muted: var(--fg-muted);

    overflow: visible;
    border: 1px solid var(--anim-line);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
    color: var(--fg);
    font-size: 0.875rem;
    line-height: 1.6;
  }
  :global([data-theme='dark']) .animation-shell {
    --anim-line: color-mix(in oklab, var(--line) 76%, var(--fg) 24%);
    --anim-line-strong: color-mix(in oklab, var(--line-strong) 42%, var(--fg) 58%);
    --anim-panel: var(--surface-2);
    --anim-inset: var(--surface-2);
    --anim-node-bg: var(--surface-3);
    --anim-edge: color-mix(in oklab, var(--line-strong) 32%, var(--fg) 68%);
    --anim-muted: color-mix(in oklab, var(--fg-subtle) 22%, var(--fg) 78%);
  }
  .shell-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    min-height: 4.75rem;
    padding: 1.05rem 1.35rem 0.95rem;
    border-bottom: 1px solid var(--anim-line);
  }
  .eyebrow {
    display: block;
    margin-bottom: 0.12rem;
    color: var(--accent-strong);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  h3 { margin: 0; font-size: 1.05rem; line-height: 1.45; letter-spacing: -0.01em; }
  .meta {
    color: var(--anim-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    white-space: nowrap;
  }
  .configuration { padding: 1rem 1.35rem; border-bottom: 1px solid var(--anim-line); }
  .content { padding: 1.35rem; }
  .transport { padding: 0.85rem 1.35rem 0.7rem; border-top: 1px solid var(--anim-line); }
  @media (width < 40rem) {
    .shell-head { min-height: 4.25rem; padding: 0.9rem 1rem 0.8rem; }
    .configuration, .content { padding: 1rem; }
    .transport { padding-inline: 0.85rem; }
    .meta { font-size: 0.62rem; }
  }
</style>
