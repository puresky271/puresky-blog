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
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    background: var(--surface);
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.88rem;
    font-weight: 600;
    transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, color 180ms ease;
  }
  .data-cell.small { width: 1.9rem; height: 2.35rem; border-color: transparent; background: transparent; font-size: 0.75rem; }
  .data-cell[data-state='current'] { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 10%, transparent); color: var(--accent-strong); }
  .data-cell[data-state='matched'] { border-color: color-mix(in oklab, var(--success) 38%, var(--line)); background: color-mix(in oklab, var(--success) 10%, var(--surface)); }
  .data-cell[data-state='mismatch'] { border-color: var(--danger); background: color-mix(in oklab, var(--danger) 10%, var(--surface)); color: var(--danger); }
  .data-cell[data-state='found'] { border-color: var(--success); background: color-mix(in oklab, var(--success) 15%, var(--surface)); color: var(--success); }
  .small[data-state='current'] { border-color: color-mix(in oklab, var(--accent) 22%, transparent); box-shadow: none; }
  .pointer { position: absolute; left: 50%; transform: translateX(-50%); color: var(--accent); font-family: var(--font-mono); font-size: 0.65rem; font-style: normal; font-weight: 700; }
  .pointer.top { bottom: calc(100% + 0.3rem); }
  .pointer.bottom { top: calc(100% + 0.3rem); }
  .value { line-height: 1; }
  @media (prefers-reduced-motion: reduce) { .data-cell { transition: none; } }
</style>
