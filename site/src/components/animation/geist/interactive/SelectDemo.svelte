<script lang="ts">
  /**
   * 选择器：像原生 select 一样点开选项列表，选中项打勾，支持键盘操作。
   *
   * 触发按钮带 aria-haspopup="listbox"，展开后焦点进到选项上，
   * 上下方向键移动、Home 和 End 跳首尾、Enter 确认、Esc 关闭并把焦点还给按钮。
   */
  import { tick } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const OPTIONS = ['Next.js', 'SvelteKit', 'Astro', 'Nuxt', 'Remix'];

  let value = $state('Astro');
  let open = $state(false);
  let active = $state(2);
  let pos = $state({ top: 0, left: 0, width: 240 });
  let triggerEl = $state<HTMLButtonElement>();
  let listEl = $state<HTMLDivElement>();

  function place() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = OPTIONS.length * 36 + 12;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    /* 下面放不下就翻到触发按钮上方 */
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    pos = { top, left, width };
  }

  async function toggle() {
    if (open) {
      open = false;
      return;
    }
    place();
    active = Math.max(0, OPTIONS.indexOf(value));
    open = true;
    await tick();
    focusActive();
  }

  function focusActive() {
    listEl?.querySelector<HTMLButtonElement>(`[data-option="${active}"]`)?.focus();
  }

  async function move(step: number) {
    active = (active + step + OPTIONS.length) % OPTIONS.length;
    await tick();
    focusActive();
  }

  function choose(index: number) {
    value = OPTIONS[index] ?? value;
    active = index;
    open = false;
    triggerEl?.focus();
  }

  function closeToList() {
    open = false;
    triggerEl?.focus();
  }

  function onTriggerKeydown(event: KeyboardEvent) {
    if (open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      void toggle();
    }
  }

  function onListKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeToList();
      return;
    }
    if (event.key === 'Tab') {
      open = false;
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      void move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : OPTIONS.length - 1;
      void tick().then(focusActive);
    }
  }

  $effect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!listEl?.contains(target) && !triggerEl?.contains(target)) open = false;
    };
    const follow = () => place();
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  });
</script>

<div class="gi-demo">
  <div class="gi-select">
    <button
      bind:this={triggerEl}
      type="button"
      class="gi-select-trigger"
      aria-haspopup="listbox"
      aria-expanded={open}
      onclick={toggle}
      onkeydown={onTriggerKeydown}
    >
      <span class="gi-select-value">{value}</span>
      <span class="gi-select-chevron" aria-hidden="true"><GiIcon name="chevron-down" /></span>
    </button>

    {#if open}
      <div
        bind:this={listEl}
        class="gi-popover gi-popover--fixed"
        role="listbox"
        aria-label="选择框架"
        tabindex="-1"
        style="top:{pos.top}px; left:{pos.left}px; width:{pos.width}px"
        onkeydown={onListKeydown}
      >
        {#each OPTIONS as option, index (option)}
          <button
            type="button"
            class="gi-select-option"
            role="option"
            data-option={index}
            aria-selected={value === option}
            tabindex={active === index ? 0 : -1}
            onclick={() => choose(index)}
          >
            {option}
            {#if value === option}
              <span class="gi-select-check" aria-hidden="true"><GiIcon name="check" /></span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <p class="gi-hint">
    点字段展开选项列表，选中项右侧带对勾，上下方向键选择、Enter 确认、Esc 关闭。
  </p>
</div>
