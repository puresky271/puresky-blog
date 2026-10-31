<script lang="ts">
  /**
   * ModelDrawer.svelte — 模型详情抽屉。
   *
   * 桌面从右侧滑出约 420px，移动端从底部弹出（最高 85vh）。
   * 用自己的固定遮罩加面板实现而不是原生 <dialog>：移动端底部弹层的形态和
   * --z-modal 这一档层级都要自己控制。打开时锁页面滚动、Esc 关闭、
   * 点遮罩关闭、关闭后把焦点还给触发元素。
   */
  import { onMount, tick } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { iArrowUpRight, iX } from '@/lib/icons.generated';
  import { reviewParagraphs, SCORE_KEYS, SCORE_LABELS, tierName, tierVar } from '@/lib/leaderboard';
  import type { RankedModel } from '@/lib/leaderboard';

  import ModelIcon from './ModelIcon.svelte';

  let { model, onclose }: { model: RankedModel | null; onclose: () => void } = $props();

  let panel = $state<HTMLElement>();
  let closeButton = $state<HTMLButtonElement>();

  const opened = $derived(model !== null);

  const scoreRows = $derived.by(() => {
    const current = model;
    if (!current) return [];
    return SCORE_KEYS.flatMap((key) => {
      const value = current.subscores[key];
      return value === undefined ? [] : [{ key, label: SCORE_LABELS[key], value }];
    });
  });

  const paragraphs = $derived.by(() => (model ? reviewParagraphs(model.review) : []));

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // 打开时锁住页面滚动，关闭时恢复滚动并把焦点还给触发元素。
  $effect(() => {
    if (!opened) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void tick().then(() => closeButton?.focus());
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  });

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!model) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onclose();
        return;
      }
      // Tab 焦点圈在抽屉里，不跑到背后的页面上。
      if (event.key !== 'Tab' || !panel) return;
      const list = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if model}
  {@const current = model}
  <div class="drawer-root" style={`--tier: ${tierVar(current.tier)}`}>
    <button
      type="button"
      class="backdrop"
      aria-label="关闭模型详情"
      tabindex="-1"
      onclick={onclose}
    ></button>

    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-drawer-title"
      bind:this={panel}
    >
      <header class="head">
        <div class="head-row">
          <ModelIcon vendor={current.vendor} name={current.name} icon={current.icon} size={46} />
          <div class="head-copy">
            <h2 id="model-drawer-title" class="name">{current.name}</h2>
            <p class="vendor">{current.vendor}</p>
            <span class="tier-chip">{tierName(current.tier)}</span>
          </div>
          <button
            type="button"
            class="icon-btn close"
            bind:this={closeButton}
            onclick={onclose}
            aria-label="关闭详情"
          >
            <Icon icon={iX} size={18} />
          </button>
        </div>
        <p class="blurb">{current.blurb}</p>
      </header>

      <div class="body">
        <section class="block">
          <h3 class="label">价格</h3>
          <dl class="stats">
            <div class="stat">
              <dt>输入</dt>
              <dd>{current.priceInLabel}</dd>
            </div>
            <div class="stat">
              <dt>输出</dt>
              <dd>{current.priceOutLabel}</dd>
            </div>
          </dl>
          <p class="hint">单位是美元 / 百万 token。价格数据来自 OpenRouter。</p>
        </section>

        <dl class="facts">
          <div>
            <dt>上下文长度</dt>
            <dd>{current.contextLabel}</dd>
          </div>
          <div>
            <dt>发布日期</dt>
            <dd>{current.releasedLabel}</dd>
          </div>
        </dl>

        <section class="block">
          <h3 class="label">分项评分</h3>
          {#if scoreRows.length}
            <ul class="scores">
              {#each scoreRows as row (row.key)}
                <li class="score">
                  <span class="score-label">{row.label}</span>
                  <span class="score-value tabular">{row.value}</span>
                  <span class="score-track" aria-hidden="true">
                    <span class="score-fill" style:width={`${row.value}%`}></span>
                  </span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="hint">还没有分项评分。</p>
          {/if}
        </section>

        {#if current.tags.length}
          <section class="block">
            <h3 class="label">标签</h3>
            <ul class="tags">
              {#each current.tags as tag}<li class="chip">{tag}</li>{/each}
            </ul>
          </section>
        {/if}

        <section class="block">
          <h3 class="label">点评</h3>
          <div class="review">
            {#each paragraphs as paragraph, index (index)}<p>{paragraph}</p>{/each}
          </div>
        </section>

        {#if current.useCase}
          <section class="block">
            <h3 class="label">使用场景</h3>
            <p class="use-case">{current.useCase}</p>
          </section>
        {/if}
      </div>

      {#if current.link}
        <footer class="foot">
          <a class="btn btn-primary" href={current.link} target="_blank" rel="noopener noreferrer">
            在 OpenRouter 查看
            <Icon icon={iArrowUpRight} size={15} />
          </a>
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .drawer-root {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: color-mix(in oklab, var(--bg) 60%, transparent);
    backdrop-filter: blur(4px);
    animation: veil-in 220ms ease;
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(26.25rem, 100%);
    height: 100%;
    overflow: hidden;
    border-left: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    animation: drawer-in 320ms var(--ease-out-expo);
  }

  @keyframes veil-in {
    from {
      opacity: 0;
    }
  }
  @keyframes drawer-in {
    from {
      transform: translateX(100%);
    }
  }
  @keyframes sheet-in {
    from {
      transform: translateY(100%);
    }
  }

  .head {
    flex-shrink: 0;
    padding: 1.1rem 1.25rem 0.9rem;
    border-bottom: 1px solid var(--line);
  }
  .head-row {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
  }
  .head-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    min-width: 0;
  }
  .name {
    font-size: 1.125rem;
    font-weight: 650;
    line-height: 1.35;
    letter-spacing: -0.01em;
    color: var(--fg);
  }
  .vendor {
    font-size: 0.8125rem;
    color: var(--fg-muted);
  }
  .tier-chip {
    display: inline-flex;
    align-items: center;
    height: 1.5rem;
    margin-top: 0.2rem;
    padding-inline: 0.6rem;
    border: 1px solid color-mix(in oklab, var(--tier) 42%, transparent);
    border-radius: 999px;
    background: color-mix(in oklab, var(--tier) 18%, var(--surface-2));
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--fg);
  }
  .close {
    margin: -0.35rem -0.45rem 0 0;
  }
  .blurb {
    margin-top: 0.8rem;
    font-size: 0.875rem;
    line-height: 1.65;
    color: var(--fg-muted);
  }

  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1.25rem;
    min-height: 0;
    padding: 1.1rem 1.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .block {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .label {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--fg-subtle);
  }
  .hint {
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--fg-subtle);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .stat {
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--surface-2);
  }
  .stat dt {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .stat dd {
    margin: 0.1rem 0 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    padding-block: 0.85rem;
    border-block: 1px solid var(--line);
  }
  .facts dt {
    font-size: 0.75rem;
    color: var(--fg-muted);
  }
  .facts dd {
    margin: 0.1rem 0 0;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
  }

  .scores {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .score {
    display: grid;
    grid-template-columns: 3.5rem 2.25rem minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .score-label {
    color: var(--fg-muted);
  }
  .score-value {
    font-weight: 600;
    color: var(--fg);
    text-align: right;
  }
  .score-track {
    height: 0.375rem;
    overflow: hidden;
    border-radius: 999px;
    background: color-mix(in oklab, var(--fg) 12%, transparent);
  }
  .score-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--tier);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .review {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .review p {
    font-size: 0.9375rem;
    line-height: 1.8;
    color: var(--fg);
  }
  .use-case {
    padding-left: 0.8rem;
    border-left: 2px solid color-mix(in oklab, var(--tier) 55%, transparent);
    font-size: 0.9375rem;
    line-height: 1.8;
    color: var(--fg-muted);
  }

  .foot {
    flex-shrink: 0;
    padding: 0.9rem 1.25rem calc(0.9rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line);
  }
  .foot .btn {
    width: 100%;
  }

  /* 移动端：底部弹层，最高 85vh。 */
  @media (width < 48rem) {
    .drawer-root {
      align-items: flex-end;
    }
    .panel {
      width: 100%;
      height: auto;
      max-height: 85vh;
      border-left: 0;
      border-top: 1px solid var(--line);
      border-radius: var(--radius-card) var(--radius-card) 0 0;
      animation: sheet-in 340ms var(--ease-out-expo);
    }
  }

  /* 关掉动画偏好时不做滑入，抽屉直接出现。 */
  @media (prefers-reduced-motion: reduce) {
    .backdrop,
    .panel {
      animation: none;
    }
  }
</style>
