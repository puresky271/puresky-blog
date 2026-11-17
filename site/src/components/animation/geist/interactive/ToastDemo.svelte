<script lang="ts">
  /**
   * 轻提示：点按钮在演示区右上角堆叠 toast，3 秒自动消失，也能手动关。
   *
   * 原站 Toast 页默认只给一个 Show Toast 按钮，在浏览器右下角弹提示；
   * 这里为了嵌在文章里改成画在演示区右侧，并加上标题和描述两行。
   */
  import { onDestroy } from 'svelte';
  import GiIcon from './GiIcon.svelte';
  import './interactive.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => {
    void config;
  });

  interface ToastItem {
    id: number;
    title: string;
    desc: string;
    leaving: boolean;
  }

  const MESSAGES = [
    { title: '草稿已保存', desc: '改动已经同步到云端，可以稍后继续编辑。' },
    { title: '部署已触发', desc: '新的构建正在排队，完成后会收到通知。' },
    { title: '链接已复制', desc: '预览地址已经放进剪贴板。' },
  ];

  let toasts = $state<ToastItem[]>([]);
  let nextId = 0;
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function remove(id: number) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    toasts = toasts.filter((toast) => toast.id !== id);
  }

  function dismiss(id: number) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    const toast = toasts.find((item) => item.id === id);
    if (!toast || toast.leaving) return;
    toast.leaving = true;
    timers.set(
      id,
      setTimeout(() => remove(id), 180),
    );
  }

  function push() {
    const id = nextId;
    nextId += 1;
    const message = MESSAGES[id % MESSAGES.length];
    for (const old of toasts.slice(0, Math.max(0, toasts.length - 2))) {
      const timer = timers.get(old.id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(old.id);
      }
    }
    toasts = [...toasts, { id, title: message.title, desc: message.desc, leaving: false }].slice(-3);
    timers.set(
      id,
      setTimeout(() => dismiss(id), 3000),
    );
  }

  onDestroy(() => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  });
</script>

<div class="gi-demo">
  <div class="gi-toast-stage">
    <button type="button" class="gi-btn gi-btn--md" onclick={push}>显示提示</button>

    <div class="gi-toast-layer">
      {#each toasts as toast (toast.id)}
        <div class="gi-toast {toast.leaving ? 'gi-toast--leave' : ''}" role="status">
          <span class="gi-toast-icon" aria-hidden="true"><GiIcon name="check" /></span>
          <div class="gi-toast-main">
            <p class="gi-toast-title">{toast.title}</p>
            <p class="gi-toast-desc">{toast.desc}</p>
          </div>
          <button
            type="button"
            class="gi-toast-close"
            aria-label="关闭这条提示"
            onclick={() => dismiss(toast.id)}
          >
            <GiIcon name="x" />
          </button>
        </div>
      {/each}
    </div>
  </div>

  <p class="gi-hint">
    点按钮在右侧堆叠轻提示，最多同时三条，3 秒后自动消失，也可以点提示右上角的叉提前关掉。
  </p>
</div>
