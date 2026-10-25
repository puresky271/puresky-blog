<script lang="ts">
  import { tick } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iCaretDown, iCheck } from '@/lib/icons.generated';

  interface Option { value: string; label: string }
  let {
    options,
    value,
    label,
    onchange,
  }: {
    options: Option[];
    value: string;
    label: string;
    onchange: (value: string) => void;
  } = $props();

  const id = $props.id();
  let root = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let open = $state(false);
  let active = $state(0);
  const selected = $derived(options.find((option) => option.value === value) ?? options[0]);

  $effect(() => {
    if (!open || !root) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root!.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  });

  function close(focus = false) {
    open = false;
    if (focus) trigger?.focus();
  }

  async function openMenu() {
    if (open) { close(); return; }
    active = Math.max(0, options.findIndex((option) => option.value === value));
    open = true;
    await tick();
    root?.querySelector<HTMLButtonElement>(`[data-index="${active}"]`)?.focus();
  }

  function choose(index: number) {
    onchange(options[index].value);
    close(true);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); void openMenu(); }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Tab') { close(); return; }
    if (event.key === 'Enter') { event.preventDefault(); choose(active); return; }
    const next = event.key === 'ArrowDown' ? active + 1
      : event.key === 'ArrowUp' ? active - 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? options.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    active = Math.max(0, Math.min(options.length - 1, next));
    root?.querySelector<HTMLButtonElement>(`[data-index="${active}"]`)?.focus();
  }
</script>

<div class="select" bind:this={root}>
  <button
    bind:this={trigger}
    type="button"
    class="trigger"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={id}
    onclick={openMenu}
    onkeydown={onKeyDown}
  >
    <span>{selected.label}</span><span class="chevron" class:open><Icon icon={iCaretDown} size={12} /></span>
  </button>
  {#if open}
    <div class="menu" {id} role="listbox" aria-label={label} tabindex="-1" onkeydown={onKeyDown}>
      {#each options as option, index}
        <button
          type="button"
          role="option"
          data-index={index}
          aria-selected={option.value === value}
          tabindex={index === active ? 0 : -1}
          onfocus={() => (active = index)}
          onclick={() => choose(index)}
        >
          <span>{option.label}</span>{#if option.value === value}<Icon icon={iCheck} size={14} />{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .select { position: relative; }
  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: 4.75rem;
    height: 2.25rem;
    padding: 0 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    background: var(--surface);
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    transition: border-color 160ms ease, background-color 160ms ease;
  }
  .trigger:hover, .trigger[aria-expanded='true'] { border-color: color-mix(in oklab, var(--accent) 45%, var(--line)); background: var(--surface-2); }
  .chevron { color: var(--fg-subtle); transition: transform 180ms var(--ease-out-expo); }
  .chevron.open { transform: rotate(180deg); }
  .menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + 0.4rem);
    z-index: var(--z-raised);
    width: 7.5rem;
    padding: 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: 11px;
    background: var(--surface);
    box-shadow: var(--shadow-md);
    transform-origin: bottom right;
    animation: enter 140ms var(--ease-out-expo);
  }
  .menu button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 2rem;
    padding: 0 0.55rem;
    border-radius: 7px;
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .menu button:hover, .menu button:focus { outline: none; background: var(--surface-2); color: var(--fg); }
  .menu button[aria-selected='true'] { color: var(--accent-strong); background: var(--accent-soft); }
  @keyframes enter { from { opacity: 0; transform: translateY(4px) scale(0.98); } }
  @media (prefers-reduced-motion: reduce) { .menu { animation: none; } .chevron { transition: none; } }
</style>
