<script lang="ts">
  /**
   * LeaderboardView.svelte — 模型榜单页的主体（Svelte 岛屿）。
   *
   * 数据由页面在构建期算好传进来：这里只管交互（打开抽屉、hash 深链）
   * 和「已下榜」折叠区。所有 window / history 只在 onMount 和事件里碰，SSR 安全。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { formatDate, formatDateISO } from '@/lib/format';
  import { iArchive, iCaretDown } from '@/lib/icons.generated';
  import { anchorOf, retiredModels } from '@/lib/leaderboard';
  import type { RankedModel } from '@/lib/leaderboard';

  import ModelCard from './ModelCard.svelte';
  import ModelDrawer from './ModelDrawer.svelte';
  import TierBoard from './TierBoard.svelte';

  let {
    models,
    updatedAt,
    fetchedAt,
  }: { models: RankedModel[]; updatedAt: string; fetchedAt: string | null } = $props();

  let selectedId = $state<string | null>(null);

  const retired = $derived(retiredModels(models));
  const selected = $derived(models.find((model) => model.id === selectedId) ?? null);

  /** 只替换地址栏的 hash，不新增历史记录。 */
  function writeHash(hash: string | null) {
    if (typeof history === 'undefined') return;
    const path = `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`;
    try {
      history.replaceState(null, '', path);
    } catch {
      // 沙箱或特殊环境里改不了地址栏时不阻断交互。
    }
  }

  function select(id: string) {
    const model = models.find((item) => item.id === id);
    if (!model) return;
    selectedId = model.id;
    writeHash(anchorOf(model.id));
  }

  function close() {
    selectedId = null;
    writeHash(null);
  }

  onMount(() => {
    // 深链：刷新或分享进来的地址带 #锚点 时，直接打开对应模型的抽屉。
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    let target = raw;
    try {
      target = decodeURIComponent(raw);
    } catch {
      // hash 不是合法编码就按原样比。
    }
    const model = models.find((item) => anchorOf(item.id) === target);
    if (!model) return;
    selectedId = model.id;
    writeHash(anchorOf(model.id));
  });
</script>

<div class="leaderboard">
  <p class="meta meta-line">
    <span>更新于 {formatDate(updatedAt)}</span>
    <span class="sep" aria-hidden="true">·</span>
    <span>价格来自 OpenRouter{fetchedAt ? `，抓取于 ${formatDateISO(fetchedAt)}` : ''}</span>
    <span class="sep" aria-hidden="true">·</span>
    <span>点开卡片看详细评测</span>
  </p>

  <TierBoard items={models} selectedId={selectedId ?? undefined} onselect={select} />

  {#if retired.length}
    <details class="retired">
      <summary class="retired-summary">
        <Icon icon={iArchive} size={16} class="text-fg-subtle" />
        <span>已下榜</span>
        <span class="retired-count tabular">{retired.length}</span>
        <span class="retired-hint">看看为什么不用了</span>
        <span class="caret"><Icon icon={iCaretDown} size={14} /></span>
      </summary>
      <ul class="retired-list">
        {#each retired as model (model.id)}
          <li>
            <ModelCard model={model} onselect={select} compact />
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>

<ModelDrawer model={selected} onclose={close} />

<style>
  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .meta-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .sep {
    color: var(--fg-subtle);
  }

  .retired {
    margin-top: 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    background: var(--surface);
  }
  .retired-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.95rem 1.1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--fg);
    list-style: none;
    cursor: pointer;
    user-select: none;
  }
  .retired-summary::-webkit-details-marker {
    display: none;
  }
  .retired-summary:hover {
    color: var(--accent);
  }
  .retired-count {
    display: inline-grid;
    place-items: center;
    min-width: 1.5rem;
    height: 1.5rem;
    padding-inline: 0.4rem;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .retired-hint {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--fg-subtle);
  }
  .caret {
    display: inline-grid;
    place-items: center;
    color: var(--fg-subtle);
    transition: transform 200ms var(--ease-out-expo);
  }
  .retired[open] .caret {
    transform: rotate(180deg);
  }

  .retired-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.75rem;
    padding: 0 1rem 1rem;
  }

  @media (width < 40rem) {
    .retired-hint {
      display: none;
    }
  }
</style>
