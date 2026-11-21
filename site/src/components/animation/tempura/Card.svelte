<script lang="ts">
  /**
   * Card.svelte — lieflat 风图版卡片的统一骨架。
   *
   * 四件套：结论式标题、副标题（图例与单位写在这里，用 · 分隔）、图、来源行（全大写加字距）。
   * 卡片本身不带底色、边框和阴影，直接排在随笔纸面上，靠留白分卡。
   * 标题带 tf-title 类，靠 plate.css 的更高优先级压掉随笔 h2 的章节线。
   */
  import type { Snippet } from 'svelte';

  interface Props {
    /** 结论式标题，写结论不写图型名 */
    title: string;
    /** 图例、单位、时间范围 */
    sub: string;
    /** 来源行，全大写加字距 */
    src: string;
    /** 通栏卡跨两列 */
    wide?: boolean;
    /** 重播入场动画 */
    replay?: () => void;
    children: Snippet;
  }

  let { title, sub, src, wide = false, replay, children }: Props = $props();
</script>

<article class="tf-card" class:tf-wide={wide}>
  <h2 class="tf-title">{title}</h2>
  <p class="tf-sub">{sub}</p>
  <div class="tf-plot">
    {@render children()}
  </div>
  <div class="tf-foot">
    <p class="tf-src">{src}</p>
    {#if replay}
      <button type="button" class="tf-replay" aria-label="重播这张图的入场动画" onclick={replay}>重播</button>
    {/if}
  </div>
</article>
