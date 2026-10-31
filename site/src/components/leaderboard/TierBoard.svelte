<script lang="ts">
  /**
   * TierBoard.svelte — 五档榜单。
   *
   * 页面和编辑器预览共用这一个组件：只负责按档位分组渲染，
   * 选中哪张卡、点了之后干什么都由外部决定。
   */
  import { groupByTier, tierVar } from '@/lib/leaderboard';
  import type { RankedModel } from '@/lib/leaderboard';

  import ModelCard from './ModelCard.svelte';

  let {
    items,
    selectedId,
    onselect,
  }: { items: RankedModel[]; selectedId?: string; onselect?: (id: string) => void } = $props();

  const groups = $derived(groupByTier(items));
</script>

<div class="board">
  {#each groups as group (group.tier.id)}
    <section
      class="tier"
      style={`--tier: ${tierVar(group.tier.id)}`}
      aria-labelledby={`tier-${group.tier.id}`}
    >
      <div class="tier-head">
        <span class="tier-badge" aria-hidden="true">{group.items.length}</span>
        <div class="tier-copy">
          <h2 id={`tier-${group.tier.id}`} class="tier-name">
            {group.tier.name}
            <span class="sr-only">，{group.items.length} 个模型</span>
          </h2>
          <p class="tier-blurb">{group.tier.blurb}</p>
        </div>
      </div>

      {#if group.items.length}
        <ul class="tier-cards">
          {#each group.items as item (item.id)}
            <li class="slot" class:selected={selectedId === item.id}>
              <ModelCard model={item} {onselect} />
            </li>
          {/each}
        </ul>
      {:else}
        <p class="tier-empty">这一档还没有模型。</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .tier {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 1rem;
    border: 1px solid color-mix(in oklab, var(--tier) 22%, var(--line));
    border-radius: var(--radius-card);
    background: color-mix(in oklab, var(--tier) 6%, var(--surface));
  }

  .tier-head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    min-width: 0;
  }
  /* 档位色块：数字用反色，亮暗两套主题下都够清楚。 */
  .tier-badge {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    min-width: 2.5rem;
    height: 2.5rem;
    padding-inline: 0.4rem;
    border-radius: var(--radius-control);
    background: color-mix(in oklab, var(--tier) 64%, var(--fg));
    color: var(--bg);
    font-size: 1.0625rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .tier-copy {
    min-width: 0;
  }
  .tier-name {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--fg);
  }
  .tier-blurb {
    margin-top: 0.15rem;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--fg-muted);
  }

  .tier-empty {
    padding: 0.5rem 0.25rem;
    font-size: 0.8125rem;
    color: var(--fg-subtle);
  }

  /*
   * 移动端：档内横向滑动，卡片固定宽度并且吸附到左缘。
   * 负外边距让滑动区顶到档位面板两边，内边距留出阴影的空间。
   */
  .tier-cards {
    display: flex;
    gap: 0.75rem;
    margin-inline: -1rem;
    padding: 0.25rem 1rem 0.35rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scroll-padding-inline: 1rem;
  }
  .slot {
    flex: 0 0 15.5rem;
    border-radius: var(--radius-card);
    scroll-snap-align: start;
  }
  .slot.selected {
    box-shadow: 0 0 0 2px var(--tier);
  }

  /* 桌面：左档位块右卡片区，卡片网格自动换行。 */
  @media (width >= 48rem) {
    .tier {
      display: grid;
      grid-template-columns: minmax(12rem, 15rem) minmax(0, 1fr);
      align-items: start;
      gap: 1.25rem;
      padding: 1.25rem;
    }
    .tier-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
      margin-inline: 0;
      padding: 0;
      overflow: visible;
    }
    .slot {
      flex: initial;
    }
  }
</style>
