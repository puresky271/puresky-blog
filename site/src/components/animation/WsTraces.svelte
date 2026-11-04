<script lang="ts">
  /**
   * 精选收录里的七个「模型推理记录」卡片：标签页、提示词气泡、答案带、推理盒。
   *
   * 结构和交互照原站 traces.js 复刻，卡片内容是拼好的 HTML，由 traces-render.ts 负责，
   * 这里只管取数据、折成一行、Setup 面板和版本切换。原站的样式类名（.tp-*）原样沿用，
   * 全部挂在 .ws-demo 下面，样式在 ws/traces.css。
   */
  import { onMount } from 'svelte';

  import { loadJson, loadSetup, type SetupText } from './ws/data';
  import { hydrateCard, renderCard, type TraceData } from './ws/traces-render';
  import './ws/traces.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  // 这两个从配置里来，挂载后不会再变；用 $derived 读，避免 Svelte 的「只捕获初始值」告警
  const figure = $derived(String(config.figure ?? ''));
  const wantsSetup = $derived(config.setup !== false);

  let setupEl = $state<HTMLDetailsElement>();
  let stage = $state<HTMLDivElement>();
  let data = $state<TraceData | null>(null);
  let setup = $state<SetupText | undefined>(undefined);
  let error = $state('');
  let index = $state(0);
  let unfolded = $state(false);

  let cleanupCard: (() => void) | null = null;

  function closeSetup(event: Event): void {
    const panel = setupEl;
    if (!panel?.open) return;
    if (event instanceof KeyboardEvent) {
      if (event.key === 'Escape') panel.open = false;
      return;
    }
    const target = event.target as Node | null;
    if (target && !panel.contains(target)) panel.open = false;
  }

  onMount(() => {
    let cancelled = false;
    loadJson<TraceData>(`/data/weight-space/traces/${figure}.json`)
      .then((json) => {
        if (!cancelled) data = json;
      })
      .catch(() => {
        if (!cancelled) error = '这张卡片的数据没能加载，刷新页面再试一次。';
      });
    if (wantsSetup) {
      loadSetup(figure)
        .then((text) => {
          if (!cancelled) setup = text;
        })
        .catch(() => {
          /* 没拿到 Setup 文案就只留按钮，不拦卡片 */
        });
    }
    document.addEventListener('click', closeSetup);
    document.addEventListener('keydown', closeSetup);
    return () => {
      cancelled = true;
      document.removeEventListener('click', closeSetup);
      document.removeEventListener('keydown', closeSetup);
    };
  });

  // 数据到位（以及切标签、展开折叠卡）之后，把卡片画进 stage。fold 的卡片第一次展开才画。
  $effect(() => {
    const host = stage;
    const current = data;
    if (!host || !current) return;
    if (current.fold && !unfolded) return;

    cleanupCard?.();
    host.innerHTML = renderCard(current, index);
    cleanupCard = hydrateCard(host, current, index, (next) => {
      index = next;
    });

    return () => {
      cleanupCard?.();
      cleanupCard = null;
    };
  });

  function toggleWhole(event: Event): void {
    if ((event.currentTarget as HTMLDetailsElement).open) unfolded = true;
  }
</script>

<div class="ws-demo ws-traces" class:has-setup={wantsSetup}>
  {#if wantsSetup}
    <details class="ws-setup" bind:this={setupEl}>
      <summary>Setup</summary>
      {#if setup}
        <div class="ws-setup-body">
          <div class="bi-en" lang="en">
            <ul>
              {#each setup.en as entry}<li>{@html entry}</li>{/each}
            </ul>
          </div>
          <div class="bi-zh">
            <ul>
              {#each setup.zh as entry}<li>{@html entry}</li>{/each}
            </ul>
          </div>
        </div>
      {/if}
    </details>
  {/if}

  {#if error}
    <p class="ws-traces-error">{error}</p>
  {:else if data}
    {#if data.fold}
      <details class="tp-whole" ontoggle={toggleWhole}>
        <summary>
          <span class="tp-wshow">查看提示词和 Astra 的回答</span>
          <span class="tp-whide">收起提示词和 Astra 的回答</span>
        </summary>
        <div class="tp-wbody" bind:this={stage}></div>
      </details>
    {:else}
      <div class="tp-stage" bind:this={stage}></div>
    {/if}
  {/if}
</div>
