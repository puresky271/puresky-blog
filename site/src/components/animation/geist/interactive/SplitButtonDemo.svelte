<script lang="ts">
  /**
   * 拆分按钮：主按钮加右侧下拉箭头。
   *
   * 原站 SplitButton 页的第一段示例：主操作在左边，附加操作收进右边的菜单，
   * 菜单里的第一项和主操作同名。这里主按钮点一次计数加一，菜单项选中后关闭。
   */
  import { tick } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const ITEMS = ['保存并关闭', '保存并发布', '另存为草稿'];

  let saves = $state(0);
  let open = $state(false);
  let selected = $state('');
  let pos = $state({ top: 0, left: 0 });
  let toggleEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();

  function place() {
    if (!toggleEl) return;
    const rect = toggleEl.getBoundingClientRect();
    const width = 200;
    const height = ITEMS.length * 36 + 21;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    /* 下面放不下就翻到触发按钮上方，避免菜单跑出视口 */
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
    open = true;
    await tick();
    menuEl?.querySelector<HTMLButtonElement>('.gi-menu-item')?.focus();
  }

  function choose(item: string) {
    selected = item;
    open = false;
    toggleEl?.focus();
  }

  function close(focusTrigger = false) {
    open = false;
    if (focusTrigger) toggleEl?.focus();
  }

  function onMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      close(true);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...(menuEl?.querySelectorAll<HTMLButtonElement>('.gi-menu-item') ?? [])];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? index + 1
        : event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : items.length - 1;
    items[(next + items.length) % items.length]?.focus();
  }

  /* 打开时：点外面收起，滚动和缩放时重新贴住触发按钮，避免浮层错位 */
  $effect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuEl?.contains(target) && !toggleEl?.contains(target)) open = false;
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
  <div class="gi-split-row">
    <div class="gi-split">
      <button type="button" class="gi-btn gi-btn--md" onclick={() => (saves += 1)}>保存</button>
      <button
        bind:this={toggleEl}
        type="button"
        class="gi-btn gi-btn--md gi-split-toggle"
        aria-label="更多保存选项"
        aria-haspopup="menu"
        aria-expanded={open}
        onclick={toggleMenu}
      >
        <GiIcon name="chevron-down" />
      </button>
    </div>
    <span class="gi-value">已保存 {saves} 次</span>
  </div>

  {#if open}
    <div
      bind:this={menuEl}
      class="gi-popover gi-popover--fixed"
      role="menu"
      tabindex="-1"
      aria-label="保存选项"
      style="top:{pos.top}px; left:{pos.left}px; width:200px"
      onkeydown={onMenuKeydown}
    >
      {#each ITEMS as item (item)}
        <button type="button" class="gi-menu-item" role="menuitem" onclick={() => choose(item)}>
          {item}
        </button>
      {/each}
    </div>
  {/if}

  <p class="gi-status" aria-live="polite">{selected ? `已选择：${selected}` : ''}</p>
  <p class="gi-hint">点左侧主按钮计数加一，点右侧箭头展开菜单，Esc 或点击外面收起。</p>
</div>

<style>
  .gi-split-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
</style>
