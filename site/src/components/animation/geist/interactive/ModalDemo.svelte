<script lang="ts">
  /**
   * 模态框：卡片直接画在演示区中间，不用 fixed 全屏，方便嵌在文章里。
   *
   * 打开时背景压暗、卡片从 0.96 倍缩放进来；Esc 或点遮罩关闭，
   * Tab 键只在三个按钮之间循环，关掉后焦点回到触发按钮。
   */
  import { tick } from 'svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const uid = $props.id();
  let open = $state(false);
  let overlayEl = $state<HTMLDivElement>();
  let dialogEl = $state<HTMLDivElement>();
  let opener = $state<HTMLButtonElement>();

  async function show() {
    open = true;
    await tick();
    dialogEl?.querySelector<HTMLButtonElement>('button')?.focus();
  }

  async function close() {
    open = false;
    await tick();
    opener?.focus();
  }

  function onDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void close();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...(dialogEl?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* 点遮罩关闭：监听挂在 document 上，避免给 div 挂点击处理器 */
  $effect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === overlayEl) void close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  });
</script>

<div class="gi-demo">
  <div class="gi-modal-stage">
    {#if open}
      <div bind:this={overlayEl} class="gi-modal-overlay">
        <div
          bind:this={dialogEl}
          class="gi-modal"
          role="dialog"
          tabindex="-1"
          aria-modal="true"
          aria-labelledby={`gi-${uid}-title`}
          aria-describedby={`gi-${uid}-desc`}
          onkeydown={onDialogKeydown}
        >
          <h3 id={`gi-${uid}-title`} class="gi-modal-title">删除这个项目？</h3>
          <p id={`gi-${uid}-desc`} class="gi-modal-desc">
            项目里的部署记录和预览环境会一起删除，这个操作不可撤销。
          </p>
          <div class="gi-modal-foot">
            <button type="button" class="gi-btn gi-btn--md gi-btn--secondary" onclick={close}>
              取消
            </button>
            <button type="button" class="gi-btn gi-btn--md gi-btn--tertiary" onclick={close}>
              稍后处理
            </button>
            <button type="button" class="gi-btn gi-btn--md gi-btn--error" onclick={close}>
              删除项目
            </button>
          </div>
        </div>
      </div>
    {:else}
      <button bind:this={opener} type="button" class="gi-btn gi-btn--md" onclick={show}>
        打开模态框
      </button>
    {/if}
  </div>

  <p class="gi-hint">
    点按钮打开卡片式模态框，打开时卡片会缩放进入，按 Esc 或点遮罩关闭，Tab 键在三个按钮之间循环。
  </p>
</div>

<style>
  .gi-modal-stage {
    min-height: 340px;
  }
</style>
