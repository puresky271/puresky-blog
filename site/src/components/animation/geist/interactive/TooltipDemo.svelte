<script lang="ts">
  /**
   * 提示气泡：悬停或聚焦按钮 400 毫秒后，上方浮出带小三角的气泡，淡入显示。
   *
   * 气泡用 fixed 定位，避免被画廊卡片的 overflow: hidden 裁掉；
   * 显示期间滚动页面就收起，免得和触发按钮错位。
   */
  import { onDestroy } from 'svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const TIP = '保存草稿后可以随时回到这里继续编辑，不会影响已经发布的版本。';
  const uid = $props.id();
  let visible = $state(false);
  let below = $state(false);
  let pos = $state({ left: 0, top: 0 });
  let triggerEl = $state<HTMLButtonElement>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function place() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const half = 140;
    const left = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half);
    /* 上方空间不够就放到按钮下面，箭头跟着换到气泡顶部 */
    below = rect.top < 56;
    pos = { left, top: below ? rect.bottom + 8 : rect.top - 8 };
  }

  function show() {
    if (visible) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      place();
      visible = true;
    }, 400);
  }

  function hide() {
    clearTimeout(timer);
    visible = false;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible) {
      event.preventDefault();
      hide();
    }
  }

  $effect(() => {
    if (!visible) return;
    const onScrollOrResize = () => hide();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  });

  onDestroy(() => clearTimeout(timer));
</script>

<div class="gi-demo">
  <button
    bind:this={triggerEl}
    type="button"
    class="gi-btn gi-btn--md gi-btn--secondary"
    aria-describedby={visible ? `gi-${uid}-tip` : undefined}
    onmouseenter={show}
    onmouseleave={hide}
    onfocus={show}
    onblur={hide}
    onkeydown={onKeydown}
  >
    悬停或聚焦查看提示
  </button>

  {#if visible}
    <div
      id={`gi-${uid}-tip`}
      class="gi-tooltip {below ? 'gi-tooltip--below' : ''}"
      role="tooltip"
      style="left:{pos.left}px; top:{pos.top}px"
    >
      {TIP}
    </div>
  {/if}

  <p class="gi-hint">
    把鼠标移到按钮上，或者用 Tab 键聚焦，400 毫秒后上方会出现带小三角的提示，按 Esc 可以提前收起。
  </p>
</div>
