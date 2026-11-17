<script lang="ts">
  /**
   * 下拉菜单：点按钮弹出菜单，菜单项带图标，含禁用项和分隔线。
   *
   * 键盘按 ARIA menu 的约定写：上下方向键移动焦点，Home 和 End 跳到首尾，
   * Enter 由按钮原生触发，Esc 收起并把焦点还给触发按钮，点外面也会收起。
   */
  import { tick } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const ITEMS = [
    { id: 'edit', label: '编辑项目', icon: 'pencil' },
    { id: 'copy', label: '复制链接', icon: 'link' },
    { id: 'archive', label: '归档项目', icon: 'archive', disabled: true },
    { id: 'delete', label: '删除项目', icon: 'trash', danger: true, divider: true },
  ];

  const uid = $props.id();
  let open = $state(false);
  let active = $state(0);
  let selected = $state('');
  let pos = $state({ top: 0, left: 0 });
  let triggerEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();

  const enabled = $derived(ITEMS.filter((item) => !item.disabled));

  function place() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = 200;
    const height = ITEMS.length * 36 + 21;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    /* 下面放不下就翻到触发按钮上方 */
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    pos = { top, left };
  }

  async function toggleMenu() {
    if (open) {
      open = false;
      return;
    }
    place();
    active = 0;
    open = true;
    await tick();
    focusActive();
  }

  function focusActive() {
    const target = enabled[active];
    if (!target) return;
    menuEl?.querySelector<HTMLButtonElement>(`[data-item="${target.id}"]`)?.focus();
  }

  async function move(step: number) {
    active = (active + step + enabled.length) % enabled.length;
    await tick();
    focusActive();
  }

  function choose(item: { id: string; label: string }) {
    selected = item.label;
    open = false;
    triggerEl?.focus();
  }

  function closeToTrigger() {
    open = false;
    triggerEl?.focus();
  }

  function onMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeToTrigger();
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
      active = event.key === 'Home' ? 0 : enabled.length - 1;
      void tick().then(focusActive);
    }
  }

  $effect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuEl?.contains(target) && !triggerEl?.contains(target)) open = false;
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
  <button
    bind:this={triggerEl}
    type="button"
    class="gi-btn gi-btn--md"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={`gi-${uid}-menu`}
    onclick={toggleMenu}
  >
    操作
    <span class="gi-trigger-chevron"><GiIcon name="chevron-down" /></span>
  </button>

  {#if open}
    <div
      bind:this={menuEl}
      id={`gi-${uid}-menu`}
      class="gi-popover gi-popover--fixed"
      role="menu"
      tabindex="-1"
      aria-label="项目操作"
      style="top:{pos.top}px; left:{pos.left}px; width:200px"
      onkeydown={onMenuKeydown}
    >
      {#each ITEMS as item (item.id)}
        {#if item.divider}
          <div class="gi-menu-sep" role="separator"></div>
        {/if}
        <button
          type="button"
          class="gi-menu-item {item.danger ? 'gi-menu-item--danger' : ''}"
          role="menuitem"
          data-item={item.id}
          data-active={enabled[active]?.id === item.id ? 'true' : undefined}
          disabled={item.disabled}
          onclick={() => choose(item)}
        >
          <span class="gi-menu-icon"><GiIcon name={item.icon} /></span>
          {item.label}
        </button>
      {/each}
    </div>
  {/if}

  <p class="gi-status" aria-live="polite">{selected ? `已选择：${selected}` : ''}</p>
  <p class="gi-hint">
    点按钮展开菜单，上下方向键选择、Enter 确认，Esc 或点击外面关闭，带锁的归档项被禁用。
  </p>
</div>

<style>
  .gi-trigger-chevron {
    display: inline-flex;
    margin-left: 2px;
  }
</style>
