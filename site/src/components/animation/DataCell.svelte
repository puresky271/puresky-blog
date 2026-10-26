<script lang="ts">
  let {
    value,
    state = 'idle',
    pointer,
    pointerPosition = 'top',
    small = false,
  }: {
    value: string | number;
    state?: 'idle' | 'current' | 'matched' | 'mismatch' | 'found';
    pointer?: string;
    pointerPosition?: 'top' | 'bottom';
    small?: boolean;
  } = $props();
</script>

<span class="data-cell" class:small data-state={state}>
  <span class="value">{value}</span>
  {#if pointer}<i class="pointer {pointerPosition}">{pointer}</i>{/if}
</span>

<style>
  .data-cell {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--cell-size, 2.5rem);
    height: var(--cell-size, 2.5rem);
    border: 1px solid var(--anim-line, var(--line));
    border-radius: 6px;
    background: transparent;
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.92rem;
    font-weight: 600;
    transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, color 180ms ease;
  }
  .data-cell.small { width: 1.9rem; height: 2.2rem; border-color: transparent; font-size: 0.78rem; }
  .data-cell[data-state='current'] { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 16%, var(--surface)); box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 13%, transparent); color: var(--accent-strong); }
  .data-cell[data-state='matched'] { border-color: color-mix(in oklab, var(--success) 55%, var(--anim-line)); background: color-mix(in oklab, var(--success) 10%, transparent); color: var(--fg); }
  .data-cell[data-state='mismatch'] { border-color: var(--danger); background: color-mix(in oklab, var(--danger) 13%, var(--surface)); color: var(--danger); }
  .data-cell[data-state='found'] { border-color: var(--success); background: color-mix(in oklab, var(--success) 16%, var(--surface)); color: var(--success); }
  .small[data-state='current'] { border-color: transparent; border-bottom-color: var(--accent); box-shadow: none; background: transparent; }
  .pointer { position: absolute; left: 50%; transform: translateX(-50%); color: var(--accent-strong); font-family: var(--font-mono); font-size: 0.68rem; font-style: normal; font-weight: 700; white-space: nowrap; }
  .pointer.top { bottom: calc(100% + 0.3rem); }
  .pointer.bottom { top: calc(100% + 0.3rem); }
  .value { line-height: 1; }
  @media (prefers-reduced-motion: reduce) { .data-cell { transition: none; } }
</style>
