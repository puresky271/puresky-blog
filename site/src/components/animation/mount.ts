import { mount, unmount, type Component } from 'svelte';

export interface AnimationProps {
  config: Record<string, unknown>;
}

const registry: Record<string, () => Promise<Component<AnimationProps>>> = {
  kmp: async () => (await import('./KmpDemo.svelte')).default,
  'tree-traversal': async () => (await import('./TreeTraversalDemo.svelte')).default,
  'tree-levelorder': async () => (await import('./TreeLevelorderDemo.svelte')).default,
  'tree-reconstruction': async () => (await import('./TreeReconstructionDemo.svelte')).default,
  'expression-tree': async () => (await import('./ExpressionTreeDemo.svelte')).default,
  lowerbit: async () => (await import('./LowbitDemo.svelte')).default,
  'fenwick-query': async () => (await import('./FenwickQueryDemo.svelte')).default,
  'fenwick-update': async () => (await import('./FenwickUpdateDemo.svelte')).default,
  'circular-queue': async () => (await import('./CircularQueueDemo.svelte')).default,
  'avl-rotate': async () => (await import('./AvlRotationDemo.svelte')).default,
  'thread-build': async () => (await import('./ThreadBuildDemo.svelte')).default,
  'thread-traverse': async () => (await import('./ThreadTraverseDemo.svelte')).default,
  'rpn-eval': async () => (await import('./RpnEvalDemo.svelte')).default,
  // 图论那篇的遍历原理演示：DFS 看调用栈与回溯，BFS 看队列与逐层扩散。
  'graph-dfs': async () => (await import('./GraphDfsDemo.svelte')).default,
  'graph-bfs': async () => (await import('./GraphBfsDemo.svelte')).default,
  // 数据库那篇的关系模型演示：把 Artist 表拆成 relation / tuple / attribute / domain /
  // schema / instance / primary key 七个概念，按步骤圈出对应的行、列和表头。
  'relation-anatomy': async () => (await import('./RelationAnatomy.svelte')).default,
  // 排序总纲那篇的五种比较排序：同一组数据看有序区怎么长、指针怎么走。
  'sorting-trace': async () => (await import('./SortingTraceDemo.svelte')).default,
  'omakase-curve': async () => (await import('./OmakaseCurve.svelte')).default,
  'panorama-lyrics': async () => (await import('./PanoramaLyricsDemo.svelte')).default,
  'cassiopeia-stars': async () => (await import('./CassiopeiaStarLab.svelte')).default,
  // 《天妇罗：水与油的四百年》的 lieflat 四卡数据图版：油温区间、水油交替曲线、食材旬期矩阵与脂质对照。
  // 配色锁定 lieflat-charts 的 porcelain 青瓷蓝，数据在 lib/animations/tempura.ts。
  tempura: async () => (await import('./TempuraPlate.svelte')).default,
  // 精选收录《Sparks of Weight-Space Programming》里四个实验演示：原站是手写的 JS，这里按原站的交互重做成
  // Svelte，数据仍在 public/data/weight-space/ 下按需取，不进 bundle。
  'ws-teaser': async () => (await import('./WsTeaser.svelte')).default,
  'ws-traces': async () => (await import('./WsTraces.svelte')).default,
  'ws-gohand': async () => (await import('./WsGohand.svelte')).default,
  'ws-mathedit': async () => (await import('./WsMathedit.svelte')).default,
  // 精选收录《BiGym 2.0》里五个交互演示：原站是 Astro 岛脚本，这里按原站的行为重做成 Svelte。
  // 榜单、任务盘、成本散点、程序浏览器的数据在 public/data/bigym2/ 下，影像在 public/media/bigym2/。
  'bigym-film': async () => (await import('./BigymFilm.svelte')).default,
  'bigym-board': async () => (await import('./BigymBoard.svelte')).default,
  'bigym-tasks': async () => (await import('./BigymTasks.svelte')).default,
  'bigym-cost': async () => (await import('./BigymCost.svelte')).default,
  'bigym-explorer': async () => (await import('./BigymExplorer.svelte')).default,
  // 精选收录《Geist 设计系统》的复刻：组件示例快照画廊和五个基础章节演示，
  // 快照数据在 public/data/geist/ 下按分组懒加载，样式在 geist/ 目录里。
  'geist-gallery': async () => (await import('./GeistGallery.svelte')).default,
  'geist-palette': async () => (await import('./geist/foundations/GeistPalette.svelte')).default,
  'geist-type': async () => (await import('./geist/foundations/GeistType.svelte')).default,
  'geist-materials': async () => (await import('./geist/foundations/GeistMaterials.svelte')).default,
  'geist-terminal': async () => (await import('./geist/foundations/GeistTerminal.svelte')).default,
  'geist-grid': async () => (await import('./geist/foundations/GeistGrid.svelte')).default,
  // 精选收录《用 Claude Code：把投入花在刀刃上》的六个复刻演示：
  // 三张图表按原站 SVG 数据重画，三个应用演示按原站 DOM 录制重放，
  // 数据在 public/data/spending-your-effort/ 下按需取，样式在 sye/ 目录里。
  'sye-curve': async () => (await import('./sye/SyeCurve.svelte')).default,
  'sye-failures': async () => (await import('./sye/SyeFailures.svelte')).default,
  'sye-payoff': async () => (await import('./sye/SyePayoff.svelte')).default,
  'sye-builds': async () => (await import('./sye/SyeBuilds.svelte')).default,
  'sye-config': async () => (await import('./sye/SyeConfig.svelte')).default,
  'sye-phone': async () => (await import('./sye/SyePhone.svelte')).default,
  // 精选收录《对抗蒸馏》里的交互折线图：两个标签页的 Vega-Lite 图表复刻，
  // 数据在 public/data/adversarial-distillation/ 下按需取，样式在 advd/ 目录里。
  'advd-chart': async () => (await import('./advd/AdvdChart.svelte')).default,
};

const mounted = new WeakSet<Element>();

/** 挂载 root 下尚未初始化的动画，返回这一批实例的清理函数。 */
export async function mountAnimations(root: ParentNode): Promise<() => void> {
  const pending = [...root.querySelectorAll<HTMLElement>('[data-animation]')]
    .filter((element) => !mounted.has(element))
    .map(async (element) => {
      mounted.add(element);
      const type = element.dataset.animation ?? '';
      const loader = registry[type];
      if (!loader) return () => {};

      let component: Component<AnimationProps>;
      let config: AnimationProps['config'];
      try {
        config = JSON.parse(element.dataset.config ?? '{}');
        component = await loader();
      } catch {
        mounted.delete(element);
        element.textContent = '动画加载失败，请刷新后重试。';
        return () => {};
      }

      if (!element.isConnected) {
        mounted.delete(element);
        return () => {};
      }

      element.replaceChildren();
      const instance = mount(component, { target: element, props: { config } });
      return () => {
        mounted.delete(element);
        void unmount(instance);
      };
    });

  const cleanups = await Promise.all(pending);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const cleanup of cleanups) cleanup();
  };
}
