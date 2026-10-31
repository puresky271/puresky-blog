<script lang="ts">
  /**
   * CandidatePool.svelte — 榜单工作台左栏的候选池。
   *
   * 数据来自 GET /leaderboard/candidates：OpenRouter 最近 30 天新出现、还没进榜单的模型。
   * 每行可以选一档再「加入榜单」，条目用 emptyModel 生成，顺序排到该档最后。
   * 抓不到 OpenRouter 时后端会返回空列表和一句 warning，这里原样显示，不给空白页。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { formatContext, formatPrice, TIERS } from '@/lib/leaderboard';
  import type { CatalogEntry, TierId } from '@/lib/leaderboard';
  import { iArrowClockwise, iPlus } from '@/lib/icons.generated';

  let {
    candidates,
    fetchedAt,
    loading,
    warning,
    onrefresh,
    onadd,
  }: {
    candidates: CatalogEntry[];
    fetchedAt: string | null;
    loading: boolean;
    warning: string | null;
    onrefresh: () => void;
    onadd: (entry: CatalogEntry, tier: TierId) => void;
  } = $props();

  /** 每行「加入榜单」时选的档位，默认放到中规中矩这一档。 */
  let pickedTiers = $state<Record<string, TierId>>({});

  const fetchedLabel = $derived(
    fetchedAt ? new Date(fetchedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : null
  );

  const tierOf = (id: string): TierId => pickedTiers[id] ?? 'mid';

  function pickTier(id: string, value: string) {
    pickedTiers = { ...pickedTiers, [id]: value as TierId };
  }
</script>

<section class="lb-sec">
  <div class="lb-sec-head">
    <h2>候选池</h2>
    <span class="lb-count">{candidates.length}</span>
    <button type="button" class="ed-btn sm quiet" onclick={onrefresh} disabled={loading}>
      {#if loading}<span class="ed-spinner"></span>{:else}<Icon icon={iArrowClockwise} size={13} />{/if}刷新候选池
    </button>
  </div>
  <p class="ed-hint">
    OpenRouter 最近 30 天新上，还没进榜单的模型。{fetchedLabel ? `目录更新于 ${fetchedLabel}。` : ''}候选池只做参考，加入后记得补一句话结论和点评。
  </p>

  {#if warning}
    <p class="lb-warn">{warning}</p>
  {/if}

  {#if loading && !candidates.length}
    <p class="ed-empty"><span class="ed-spinner"></span>正在抓候选池…</p>
  {:else if candidates.length}
    <ul class="lb-cands">
      {#each candidates as entry (entry.id)}
        <li class="lb-cand">
          <div class="lb-cand-info">
            <p class="lb-cand-name">{entry.name}</p>
            <p class="lb-cand-meta">
              {entry.vendor}{entry.created ? ` · ${entry.created}` : ''}{entry.contextLength ? ` · ${formatContext(entry.contextLength)}` : ''}
            </p>
            <p class="lb-cand-price">输入 {formatPrice(entry.priceIn)} / 输出 {formatPrice(entry.priceOut)}</p>
          </div>
          <div class="lb-cand-actions">
            <select
              class="ed-input lb-tier-select"
              value={tierOf(entry.id)}
              onchange={(event) => pickTier(entry.id, (event.currentTarget as HTMLSelectElement).value)}
              aria-label={`${entry.name} 加入哪一档`}
            >
              {#each TIERS as tier}<option value={tier.id}>{tier.name}</option>{/each}
            </select>
            <button type="button" class="ed-btn sm primary" onclick={() => onadd(entry, tierOf(entry.id))} disabled={loading}>
              <Icon icon={iPlus} size={13} />加入榜单
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="ed-empty">
      没有新模型。最近 30 天 OpenRouter 上没有出现榜单之外的新模型，等几天再来刷新。
    </p>
  {/if}
</section>
