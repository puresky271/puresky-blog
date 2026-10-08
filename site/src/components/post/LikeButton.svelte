<script lang="ts">
  /**
   * LikeButton.svelte — 文章点赞。
   *
   * 不需要登录，去重由 worker 按天加盐的访客哈希做（不设 cookie、不做指纹）。
   * 点下时乐观更新并迸出一圈小粒子；worker 不可用时按钮直接不显示，而不是显示一个点了没反应的按钮。
   */
  import { onMount } from 'svelte';

  import Icon from '@/components/ui/Icon.svelte';
  import { api } from '@/lib/api';
  import { formatCount } from '@/lib/format';
  import { iHeart, iHeartFill } from '@/lib/icons.generated';

  let { slug }: { slug: string } = $props();

  let count = $state(0);
  let liked = $state(false);
  let ready = $state(false);
  let popping = $state(false);
  let button = $state<HTMLButtonElement>();

  onMount(async () => {
    try {
      const data = await api<{ count: number; liked: boolean }>(`/api/likes/${slug}`, { credentials: 'omit' });
      count = data.count;
      liked = data.liked;
      ready = true;
    } catch {
      ready = false;
    }
  });

  async function like() {
    if (liked) return;
    liked = true;
    count += 1;
    popping = true;
    burst();
    setTimeout(() => (popping = false), 500);
    try {
      await api(`/api/likes/${slug}`, { method: 'POST', credentials: 'omit' });
    } catch {
      // 记不上就回滚，不假装成功。
      liked = false;
      count -= 1;
    }
  }

  /** 以按钮为中心迸出一圈小圆点。用 Web Animations，不依赖额外的 canvas。 */
  function burst() {
    if (!button || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = button;
    for (let i = 0; i < 12; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'like-dot';
      host.appendChild(dot);
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 26 + Math.random() * 18;
      dot
        .animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            {
              transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.2)`,
              opacity: 0,
            },
          ],
          { duration: 620 + Math.random() * 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        )
        .finished.then(() => dot.remove());
    }
  }
</script>

{#if ready}
  <button
    type="button"
    bind:this={button}
    class="like"
    class:liked
    class:popping
    onclick={like}
    aria-pressed={liked}
    aria-label={liked ? `已喜欢，共 ${count} 人` : `喜欢这篇文章，已有 ${count} 人`}
  >
    <span class="heart"><Icon icon={liked ? iHeartFill : iHeart} size={18} /></span>
    <span class="tabular">{formatCount(count)}</span>
  </button>
{/if}

<style>
  .like {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    height: 2.5rem;
    padding-inline: 1rem;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--fg-muted);
    font-size: 0.9375rem;
    transition:
      color 160ms ease,
      border-color 160ms ease,
      background-color 160ms ease;
  }
  .like:hover {
    color: var(--fg);
    background: var(--surface-2);
  }
  .like.liked {
    color: var(--accent-strong);
    border-color: color-mix(in oklab, var(--accent) 40%, transparent);
    background: var(--accent-soft);
    cursor: default;
  }
  .heart {
    display: grid;
    transition: transform 200ms var(--ease-spring);
  }
  .popping .heart {
    animation: pop 480ms var(--ease-spring);
  }
  @keyframes pop {
    40% {
      transform: scale(1.35);
    }
  }
  .like :global(.like-dot) {
    position: absolute;
    left: 1.55rem;
    top: 50%;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--accent);
    pointer-events: none;
  }
</style>
