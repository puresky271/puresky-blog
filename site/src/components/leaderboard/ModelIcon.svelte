<script lang="ts">
  /**
   * ModelIcon.svelte — 模型图标。
   *
   * 榜单数据里填了 icon 就出图，没填就用厂商色渐变底加名字首字母占位。
   * 厂商色来自 lib/leaderboard.ts 的 vendorColors，同一家厂商永远是同一个颜色。
   */
  import { withBase } from '@/lib/format';
  import { vendorColors } from '@/lib/leaderboard';

  let {
    vendor,
    name,
    icon,
    size = 40,
  }: { vendor: string; name: string; icon?: string; size?: number } = $props();

  const colors = $derived(vendorColors(vendor));
  const initial = $derived((name.trim().charAt(0) || '?').toUpperCase());
</script>

<span
  class="model-icon"
  style:width={`${size}px`}
  style:height={`${size}px`}
  style:font-size={`${Math.round(size * 0.42)}px`}
  aria-hidden="true"
>
  {#if icon}
    <img src={withBase(icon)} alt="" width={size} height={size} loading="lazy" decoding="async" />
  {:else}
    <span class="fallback" style:background={`linear-gradient(135deg, ${colors.from}, ${colors.to})`}>
      {initial}
    </span>
  {/if}
</span>

<style>
  .model-icon {
    display: block;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--radius-control);
    background: var(--surface-2);
  }
  .model-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* 渐变底上的字固定用白色：厂商色在亮暗两套主题下都是中等明度，白字最稳。 */
  .fallback {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: #fff;
    font-weight: 650;
    line-height: 1;
    letter-spacing: 0;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg) 10%, transparent);
  }
</style>
