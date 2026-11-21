/**
 * reveal.svelte.ts — 天妇罗四卡图版的统一入场控制。
 *
 * 规则来自 lieflat-charts：滚入视野才播、点击重播、（系统要求减少动态时）降级。
 * 只维护一个 run 布尔值。重播时先关掉、下一帧挂回来，CSS 动画会从头再来一遍。
 */
export function createChartReveal() {
  let run = $state(false);
  let node: HTMLElement | undefined;

  function replay() {
    run = false;
    requestAnimationFrame(() => {
      // 读一次布局，确保移除类名已经生效，CSS 动画才会重新开始。
      if (node) void node.offsetWidth;
      run = true;
    });
  }

  /** 绑到图区容器上，进入视野后播放一次。 */
  function observe(target: HTMLElement) {
    node = target;
    // 系统要求减少动态时直接给出静态画面，不闪一下再定格。
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      run = true;
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      run = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run = true;
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(target);
    return () => io.disconnect();
  }

  return {
    get run() {
      return run;
    },
    replay,
    observe,
  };
}
