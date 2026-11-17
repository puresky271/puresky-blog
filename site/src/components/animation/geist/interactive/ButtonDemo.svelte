<script lang="ts">
  /**
   * 按钮组：三档尺寸 × 五种变体。
   *
   * 对照原站 Button 页的 Sizes、All Types and Sizes、Shapes、Rounded、Loading、Disabled 几段示例，
   * 顶部一排小开关把 loading、disabled、rounded、前后缀图标四个状态接到全部按钮上。
   */
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  const VARIANTS = [
    { id: 'default', label: '默认', cls: '' },
    { id: 'error', label: '危险', cls: 'gi-btn--error' },
    { id: 'warning', label: '警告', cls: 'gi-btn--warning' },
    { id: 'secondary', label: '次要', cls: 'gi-btn--secondary' },
    { id: 'tertiary', label: '文本', cls: 'gi-btn--tertiary' },
  ];

  const SIZES = [
    { id: 'sm', label: '小', cls: 'gi-btn--sm' },
    { id: 'md', label: '中', cls: 'gi-btn--md' },
    { id: 'lg', label: '大', cls: 'gi-btn--lg' },
  ];

  let loading = $state(false);
  let disabled = $state(false);
  let rounded = $state(false);
  let withIcons = $state(false);
  let clicks = $state(0);

  function countClick() {
    clicks += 1;
  }
</script>

<div class="gi-demo">
  <div class="gi-controls">
    <button
      type="button"
      class="gi-ctl"
      role="switch"
      aria-checked={loading}
      onclick={() => (loading = !loading)}
    >
      <span class="gi-ctl-track" aria-hidden="true"><span class="gi-ctl-knob"></span></span>
      加载中
    </button>
    <button
      type="button"
      class="gi-ctl"
      role="switch"
      aria-checked={disabled}
      onclick={() => (disabled = !disabled)}
    >
      <span class="gi-ctl-track" aria-hidden="true"><span class="gi-ctl-knob"></span></span>
      禁用
    </button>
    <button
      type="button"
      class="gi-ctl"
      role="switch"
      aria-checked={rounded}
      onclick={() => (rounded = !rounded)}
    >
      <span class="gi-ctl-track" aria-hidden="true"><span class="gi-ctl-knob"></span></span>
      圆角
    </button>
    <button
      type="button"
      class="gi-ctl"
      role="switch"
      aria-checked={withIcons}
      onclick={() => (withIcons = !withIcons)}
    >
      <span class="gi-ctl-track" aria-hidden="true"><span class="gi-ctl-knob"></span></span>
      前后缀图标
    </button>
  </div>

  <div class="gi-size-table">
    {#each SIZES as size (size.id)}
      <div class="gi-size-row">
        <span class="gi-label gi-size-name">{size.label}</span>
        <div class="gi-row">
          {#each VARIANTS as variant (variant.id)}
            <button
              type="button"
              class="gi-btn {size.cls} {variant.cls} {rounded ? 'gi-btn--rounded' : ''}"
              data-loading={loading ? 'true' : undefined}
              disabled={disabled || loading}
              onclick={countClick}
            >
              {#if loading}
                <span class="gi-spinner" aria-hidden="true"></span>
              {/if}
              {#if withIcons && !loading}
                <GiIcon name="arrow-left" />
              {/if}
              {loading ? '处理中' : variant.label}
              {#if withIcons && !loading}
                <GiIcon name="arrow-right" />
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <p class="gi-status" aria-live="polite">已点击 {clicks} 次</p>
  <p class="gi-hint">
    用上面的开关切换加载中、禁用、圆角形状和前后缀图标，按下按钮时会有一点点下沉的反馈。
  </p>
</div>

<style>
  .gi-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  .gi-size-table {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .gi-size-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .gi-size-name {
    flex-shrink: 0;
    width: 14px;
  }
</style>
