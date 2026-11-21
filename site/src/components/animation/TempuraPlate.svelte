<script lang="ts">
  /**
   * TempuraPlate.svelte — 《天妇罗：水与油的四百年》的 lieflat 四卡数据图版。
   *
   * 严格按 lieflat-charts 的 porcelain 青瓷蓝重做，整块图版由四张卡组成，每张卡一个独立结论：
   *   1. 油温区间：鱼贝往 180 度走，根菜停在 160 度（F12 Dumbbell Queue，半宽）
   *   2. 水出油进：衣的含水率与吸油率随炸制时间的变化（F2 Hairline Line，半宽）
   *   3. 食材旬期矩阵：八种食材跨十二个月的旬期错峰（L4 Arc Matrix，通栏）
   *   4. 脂质对比：天妇罗的含油量只有炸猪排的一半（F1 Rung Bars，通栏）
   *
   * 图版不套外层容器，卡片直接排在随笔纸面上；两列网格，通栏卡跨两列，移动端单列。
   * 配色锁定 porcelain 的单色相蓝阶，明度即数据；数据全部来自 lib/animations/tempura.ts。
   * 这个演示不需要配置项，config 不参与渲染，只为和共享挂载层的 AnimationProps 对齐。
   */
  import './tempura/plate.css';
  import type { AnimationProps } from './mount';

  import LipidBars from './tempura/LipidBars.svelte';
  import OilTempDumbbell from './tempura/OilTempDumbbell.svelte';
  import SeasonArcMatrix from './tempura/SeasonArcMatrix.svelte';
  import WaterOilCurve from './tempura/WaterOilCurve.svelte';

  const _props: AnimationProps = $props();
</script>

<section class="tempura-plate" aria-label="天妇罗四卡数据图版">
  <div class="tf-grid">
    <OilTempDumbbell />
    <WaterOilCurve />
    <SeasonArcMatrix />
    <LipidBars />
  </div>
</section>
