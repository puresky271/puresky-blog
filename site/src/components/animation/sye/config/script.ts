/**
 * 自动演示的驱动器。
 *
 * 原站四个配置屏里有三屏会「自己走一遍」：等到组件进入视口后，按顺序执行一串
 * 操作，每步停留一会儿，走完从头再来，直到用户真的碰了它。这里保留同样的行为：
 * 用户在演示区里按下鼠标或按键（trusted 事件）就永久停下。
 *
 * 每个操作由屏幕组件自己提供（改自己的状态），驱动器只负责计时和循环。
 */

export interface DemoStep {
  run(): void;
  /** 这一步走完后停留多久（毫秒） */
  hold: number;
  /** 这一步是否还没播完，比如按键动画还在走 */
  busy?: () => boolean;
}

/**
 * 创建自动演示。
 *
 * @param steps 循环执行的操作列表
 * @param stopped 用户是否已经接管（true 时安静退出）
 * @returns 清理函数，组件卸载或屏幕切走时调用
 */
export function createDemoRunner(steps: DemoStep[], stopped: () => boolean): () => void {
  let disposed = false;
  const timers = new Set<number>();

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const handle = window.setTimeout(() => {
        timers.delete(handle);
        resolve();
      }, ms);
      timers.add(handle);
    });

  const wait = async (ms: number) => {
    if (disposed) return;
    await sleep(ms);
  };

  void (async () => {
    // 原站先等 900ms，等横向滑动和入场动画落定再开始
    await wait(900);
    while (!disposed && !stopped()) {
      for (const step of steps) {
        if (disposed || stopped()) return;
        step.run();
        // 等这一步的按键动画播完（最多等 8 秒，防卡死）
        let guard = 0;
        while (!disposed && !stopped() && step.busy?.() && guard < 80) {
          guard += 1;
          await wait(100);
        }
        if (disposed || stopped()) return;
        await wait(step.hold);
      }
    }
  })();

  return () => {
    disposed = true;
    for (const handle of timers) window.clearTimeout(handle);
    timers.clear();
  };
}
