<script lang="ts">
  /**
   * 滑块：拖动或者用键盘调整 0 到 100 的音量，右侧实时显示数值。
   *
   * 轨道上按下指针就能跳值，拖动过程用 setPointerCapture 接住移动事件；
   * 键盘支持左右和上下方向键、PageUp / PageDown、Home / End，步长 1 和 10。
   */
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const MIN = 0;
  const MAX = 100;

  let value = $state(40);
  let trackEl = $state<HTMLDivElement>();
  let dragging = $state(false);

  const percent = $derived(((value - MIN) / (MAX - MIN)) * 100);

  function clamp(next: number) {
    return Math.min(MAX, Math.max(MIN, Math.round(next)));
  }

  function updateFromPointer(event: PointerEvent) {
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    value = clamp(MIN + ratio * (MAX - MIN));
  }

  function onPointerDown(event: PointerEvent) {
    event.preventDefault();
    dragging = true;
    trackEl?.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    updateFromPointer(event);
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    if (trackEl?.hasPointerCapture(event.pointerId)) trackEl.releasePointerCapture(event.pointerId);
  }

  function onKeydown(event: KeyboardEvent) {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    if (event.key === 'Home') {
      event.preventDefault();
      value = MIN;
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      value = MAX;
      return;
    }
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    value = clamp(value + step);
  }
</script>

<div class="gi-demo">
  <div class="gi-slider-row">
    <span class="gi-slider-label" id="gi-slider-label">音量</span>
    <div
      bind:this={trackEl}
      class="gi-slider"
      role="slider"
      tabindex="0"
      aria-labelledby="gi-slider-label"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={value}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onkeydown={onKeydown}
    >
      <div class="gi-slider-track" aria-hidden="true">
        <div class="gi-slider-fill" style="width:{percent}%"></div>
      </div>
      <div class="gi-slider-thumb" style="left:{percent}%"></div>
    </div>
    <span class="gi-slider-value">{value}</span>
  </div>

  <p class="gi-hint">
    按住滑块或者点轨道上的任意位置拖动，数值会实时更新，聚焦后也可以用左右方向键微调、PageUp 和 PageDown 一次调十格。
  </p>
</div>
