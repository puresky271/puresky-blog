<script lang="ts">
  /**
   * ModelCard.svelte — 榜单里的一张模型卡片。
   *
   * 只有传了 onselect 才渲染成 button：没有点击行为时渲染成 div，
   * 免得页面上出现按了没反应、还会被 Tab 停留的假按钮。
   */
  import type { RankedModel } from '@/lib/leaderboard';

  import ModelIcon from './ModelIcon.svelte';

  let {
    model,
    onselect,
    compact = false,
  }: { model: RankedModel; onselect?: (id: string) => void; compact?: boolean } = $props();
</script>

{#snippet body()}
  <span class="head">
    <ModelIcon vendor={model.vendor} name={model.name} icon={model.icon} size={compact ? 28 : 38} />
    <span class="copy">
      <span class="name">{model.name}</span>
      <span class="vendor">{model.vendor}</span>
    </span>
  </span>
  <span class="prices">
    <span class="price">
      <span class="price-label">输入</span>
      <span class="price-value">{model.priceInLabel}</span>
    </span>
    <span class="price">
      <span class="price-label">输出</span>
      <span class="price-value">{model.priceOutLabel}</span>
    </span>
  </span>
{/snippet}

{#if onselect}
  <button
    type="button"
    class="card card-link model-card"
    class:compact
    onclick={() => onselect(model.id)}
    aria-haspopup="dialog"
  >
    {@render body()}
  </button>
{:else}
  <div class="card model-card" class:compact>
    {@render body()}
  </div>
{/if}

<style>
  .model-card {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    width: 100%;
    height: 100%;
    padding: 0.85rem 0.95rem;
    text-align: left;
    color: var(--fg);
  }
  .compact {
    gap: 0.5rem;
    padding: 0.7rem 0.8rem;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }
  .name {
    overflow: hidden;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .compact .name {
    font-size: 0.875rem;
  }
  .vendor {
    overflow: hidden;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--fg-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .prices {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .price {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .price-label {
    color: var(--fg-muted);
  }
  .price-value {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
  }
</style>
