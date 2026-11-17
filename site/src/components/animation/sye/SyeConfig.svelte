<script lang="ts">
  /**
   * 精选收录《用 Claude Code：把投入花在刀刃上》的 FIG3：
   * Claude Code 的 /config 菜单在低档、中档、高档、最高档 effort 下的重设计。
   *
   * 原站是一条横向滑动的 rail，四屏各是一个独立的 React 懒加载 chunk，选中哪一屏
   * 才挂载哪一屏，切走的屏会多留 500ms（让滑动过渡看得见）再卸载。这里保持同样的
   * 结构：四屏按需渲染，rail 用 --i 位移过渡，同一时间只有当前屏能交互。
   * 每屏进入视口后自己演示一遍，用户碰过就停（在各屏组件里处理）。
   */

  import ConfigHigh from './config/ConfigHigh.svelte';
  import ConfigLow from './config/ConfigLow.svelte';
  import ConfigMax from './config/ConfigMax.svelte';
  import ConfigMedium from './config/ConfigMedium.svelte';

  import './base.css';
  import './config/config.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  const LEVELS = ['低档', '中档', '高档', '最高档'];
  const SLOT_LABELS = [
    '低档投入档位的配置界面重设计',
    '中档投入档位的配置界面重设计',
    '高档投入档位的配置界面重设计',
    '最高档投入档位的配置界面重设计',
  ];

  let level = $state(0);
  let seen = $state(false);
  let visible = $state(false);
  let figure = $state<HTMLDivElement>();

  /** 每屏的挂载序号，null 表示已卸载（和原站的 m 数组同一套逻辑）。 */
  let mounted = $state<(number | null)[]>([0, null, null, null]);
  let counter = 0;
  let timer: number | undefined;

  $effect(() => {
    const element = figure;
    if (!element) return;
    // 组件进入过视口之后才懒挂载第一屏
    const seenObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) seen = true;
      },
      { rootMargin: '200px' },
    );
    const visibleObserver = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
    });
    seenObserver.observe(element);
    visibleObserver.observe(element);
    return () => {
      seenObserver.disconnect();
      visibleObserver.disconnect();
    };
  });

  $effect(() => () => {
    if (timer !== undefined) window.clearTimeout(timer);
  });

  function select(index: number): void {
    if (index === level) return;
    level = index;
    counter += 1;
    const id = counter;
    mounted = mounted.map((value, slot) => (slot === index ? id : value));
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const current = level;
      mounted = mounted.map((value, slot) => (slot === current ? value : null));
    }, 500);
  }

  function onTabKeydown(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + LEVELS.length) % LEVELS.length;
    select(next);
    figure?.querySelectorAll<HTMLButtonElement>('.fig-tabs > button')[next]?.focus();
  }

  const tabsActive = (index: number): boolean => index === level;
</script>

<div class="sye-demo sye-config" bind:this={figure} data-config={Object.keys(config).length > 0 ? 'true' : undefined}>
  <div class="fig-tabs eff-levels inline-tags" role="radiogroup" aria-label="投入档位">
    {#each LEVELS as label, index (label)}
      <button
        type="button"
        role="radio"
        aria-checked={tabsActive(index)}
        tabindex={tabsActive(index) ? 0 : -1}
        onclick={() => select(index)}
        onkeydown={(event) => onTabKeydown(event, index)}
      >
        <span class="lv">{label}</span>
      </button>
    {/each}
  </div>
  <div class="efx-view">
    <div class="efx-rail" style={`--i: ${level}`}>
      {#each LEVELS as _, index (index)}
        <div
          class="efx-slot"
          role="group"
          aria-label={SLOT_LABELS[index]}
          aria-hidden={index !== level}
          inert={index !== level}
        >
          {#if seen && mounted[index] !== null}
            {#if index === 0}
              <ConfigLow />
            {:else if index === 1}
              <ConfigMedium active={visible && index === level} />
            {:else if index === 2}
              <ConfigHigh active={visible && index === level} />
            {:else}
              <ConfigMax active={visible && index === level} />
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
