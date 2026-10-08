<script lang="ts">
  /**
   * StageArt.svelte — 舞台的插画模式。
   *
   * 横版图铺满舞台；有夜晚版本时按天色（data-phase=night）显示夜晚版本。
   * 多张图时左右箭头、键盘方向键、触摸滑动都能切换，换图用 3D 卡片飞出飞入（节奏取自 mygo_chat 的切歌动画）。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { iCaretLeft, iCaretRight } from '@/lib/icons.generated';

  import type { StageImage } from './types';

  let { images, index = $bindable(0) }: { images: StageImage[]; index?: number } = $props();

  let outgoing = $state<{ image: StageImage; dir: 1 | -1; key: number } | null>(null);
  let incomingDir = $state<1 | -1 | 0>(0);
  let swapKey = 0;
  let timer = 0;

  const current = $derived(images[index]);

  function go(dir: 1 | -1) {
    if (images.length < 2) return;
    clearTimeout(timer);
    outgoing = { image: images[index], dir, key: ++swapKey };
    incomingDir = dir;
    index = (index + dir + images.length) % images.length;
    timer = window.setTimeout(() => {
      outgoing = null;
      incomingDir = 0;
    }, 800);
  }

  // 触摸滑动：横向位移超过 40px 且大于纵向位移才算，避免和页面滚动冲突。
  let start: { x: number; y: number } | null = null;
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    start = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: PointerEvent) {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }

</script>

{#snippet picture(image: StageImage, eager: boolean)}
  <img class="art-img" class:has-night={!!image.srcNight} src={image.src} alt={image.alt} width={image.width} height={image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  {#if image.srcNight}
    <img class="art-img art-night" src={image.srcNight} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />
  {/if}
{/snippet}

<!-- 触摸滑动切换只是左右箭头按钮的补充，键盘用户用箭头按钮操作。 -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="art"
  role="group"
  aria-roledescription="轮播"
  aria-label="插画"
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
>
  {#if outgoing}
    {#key outgoing.key}
      <div class="layer swap-out" style="--dir: {outgoing.dir}" aria-hidden="true">
        {@render picture(outgoing.image, false)}
      </div>
    {/key}
  {/if}
  {#key current.id}
    <div class="layer" class:swap-in={incomingDir !== 0} style="--dir: {incomingDir || 1}">
      {@render picture(current, true)}
    </div>
  {/key}

  {#if images.length > 1}
    <button type="button" class="arrow prev" onclick={() => go(-1)} aria-label="上一张">
      <Icon icon={iCaretLeft} size={20} />
    </button>
    <button type="button" class="arrow next" onclick={() => go(1)} aria-label="下一张">
      <Icon icon={iCaretRight} size={20} />
    </button>
  {/if}
</div>

<style>
  .art {
    position: absolute;
    inset: 0;
    perspective: 1200px;
    touch-action: pan-y;
    outline: none;
  }
  .layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    backface-visibility: hidden;
  }
  .art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .art-night {
    display: none;
  }
  :global([data-phase='night']) .art-img.has-night {
    display: none;
  }
  :global([data-phase='night']) .art-night {
    display: block;
  }

  /*
   * 3D 换图。--dir 为 1 表示下一张（旧图往左飞），-1 表示上一张（镜像）。
   * 780ms、cubic-bezier(0.16, 0.9, 0.14, 1)，新图在 58% 处过冲一点再回位。
   */
  .swap-out {
    z-index: 1;
    animation: art-out 780ms cubic-bezier(0.16, 0.9, 0.14, 1) forwards;
    transform-origin: calc(50% - var(--dir) * 50%) 50%;
  }
  .swap-in {
    z-index: 2;
    animation: art-in 780ms cubic-bezier(0.16, 0.9, 0.14, 1);
  }
  @keyframes art-out {
    to {
      transform: translateX(calc(var(--dir) * -44%)) rotateY(calc(var(--dir) * 15deg)) rotateZ(calc(var(--dir) * -1deg)) scale(0.955);
      opacity: 0;
    }
  }
  @keyframes art-in {
    from {
      transform: translateX(calc(var(--dir) * 22%)) rotateY(calc(var(--dir) * -9deg)) scale(1.018);
      opacity: 0.58;
    }
    58% {
      transform: translateX(calc(var(--dir) * -1.6%)) rotateY(0deg) scale(1);
      opacity: 1;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .swap-out {
      animation: none;
      opacity: 0;
    }
    .swap-in {
      animation: none;
    }
  }

  .arrow {
    position: absolute;
    top: 50%;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-top: -1.375rem;
    border-radius: 999px;
    color: #fff;
    background: rgb(10 14 22 / 0.32);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.16);
    opacity: 0;
    transform: scale(0.88);
    transition:
      opacity 200ms ease,
      transform 340ms cubic-bezier(0.16, 0.9, 0.14, 1),
      background-color 160ms ease;
  }
  .prev {
    left: 1rem;
  }
  .next {
    right: 1rem;
  }
  .art:hover .arrow,
  .art:focus-within .arrow {
    opacity: 1;
    transform: scale(1);
  }
  .arrow:hover {
    background: rgb(10 14 22 / 0.5);
    transform: scale(1.04);
  }
  .arrow:active {
    transform: scale(0.9);
  }
  @media (hover: none) {
    .arrow {
      opacity: 0.85;
      transform: scale(0.9);
    }
  }
</style>
