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
  // 精选收录《Sparks of Weight-Space Programming》里四个实验演示：原站是手写的 JS，这里按原站的交互重做成
  // Svelte，数据仍在 public/data/weight-space/ 下按需取，不进 bundle。
  'ws-teaser': async () => (await import('./WsTeaser.svelte')).default,
  'ws-traces': async () => (await import('./WsTraces.svelte')).default,
  'ws-gohand': async () => (await import('./WsGohand.svelte')).default,
  'ws-mathedit': async () => (await import('./WsMathedit.svelte')).default,
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
