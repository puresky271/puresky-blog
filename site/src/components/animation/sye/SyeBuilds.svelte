<script lang="ts">
  /**
   * FIG2：一句话提示词在 low / medium / high / max 四个投入档位下生成的健身应用。
   *
   * 四个应用本身是原站完整的 React 应用（源码 7000+ 行），不逐行移植，改为 DOM 录制重放：
   * 由 _scratch/spending-your-effort/builds/recorder.mjs 在原站把每档的自动演示录成
   * 「初始 DOM + 带时间戳的变更序列」，数据在 public/data/spending-your-effort/builds/level-*.json，
   * 重放引擎在 ./builds/replay.ts。标签页、暂停 / 重播、播完自动切下一档都在这里实现。
   *
   * 原站的行为是「演示播完等 1.4s 再重挂当前档」，这里按文章的需要改成播完自动切下一档；
   * 那 1.4s 的停顿已经录进数据里，所以每档的节奏和原站一致。
   */
  import './base.css';
  import './builds/builds.css';
  import { createReplay, type BuildData, type ReplayPlayer } from './builds/replay';
  import { onMount } from 'svelte';
  import { withBase } from '@/lib/format';

  // 演示不需要配置项，但 registry（mount.ts）要求组件声明 config prop
  let { config = {} }: { config?: Record<string, unknown> } = $props();

  interface Level {
    key: string;
    label: string;
    tag: string;
  }

  const LEVELS: Level[] = [
    { key: 'low', label: '低档', tag: '1.5 分钟' },
    { key: 'medium', label: '中档', tag: '4 分钟' },
    { key: 'high', label: '高档', tag: '11 分钟' },
    { key: 'max', label: '最高档', tag: '67 分钟' },
  ];
  const PANEL_ID = 'sye-builds-panel';
  const TAB_ID = (key: string) => `sye-builds-tab-${key}`;
  const LEVEL_NAMES = LEVELS.map((level) => level.label).join('、');

  type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'done' | 'error';

  let figureEl = $state<HTMLElement | null>(null);
  let stageEl = $state<HTMLDivElement | null>(null);
  let current = $state(0);
  let phase = $state<Phase>('idle');

  // 非响应式的内部状态
  let player: ReplayPlayer | null = null;
  let cache = new Map<string, BuildData>();
  let inflight = new Map<string, Promise<BuildData>>();
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let nextTimer: ReturnType<typeof setTimeout> | null = null;
  let loadToken = 0;
  let started = false;
  let visible = false;
  let autoPlay = true;
  let reduceMotion = false;
  let disposed = false;
  const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  const fetchLevel = (key: string): Promise<BuildData> => {
    const hit = cache.get(key);
    if (hit) return Promise.resolve(hit);
    const pending = inflight.get(key);
    if (pending) return pending;
    const task = fetch(withBase(`/data/spending-your-effort/builds/level-${key}.json`))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<BuildData>;
      })
      .then((data) => {
        cache.set(key, data);
        inflight.delete(key);
        return data;
      })
      .catch((err) => {
        inflight.delete(key);
        throw err;
      });
    inflight.set(key, task);
    return task;
  };

  const prefetch = (index: number) => {
    if (disposed) return;
    fetchLevel(LEVELS[index].key).catch(() => {
      // 预取失败无所谓，真正切档时会再试一次
    });
  };

  /** 按 .efx-desk 的实际宽度重算 1280×800 桌面的缩放，并跟着容器尺寸变化 */
  const applyScale = (root: Element) => {
    const desk = root.querySelector<HTMLElement>('.efx-desk');
    const dvp = root.querySelector<HTMLElement>('.efx-dvp');
    if (!desk || !dvp) return;
    dvp.style.setProperty('--s', String(desk.clientWidth / 1280));
    ro?.disconnect();
    if (disposed) return;
    ro = new ResizeObserver(() => {
      const width = desk.clientWidth;
      if (width > 0) dvp.style.setProperty('--s', String(width / 1280));
    });
    ro.observe(desk);
  };

  const clearNextTimer = () => {
    if (nextTimer !== null) {
      clearTimeout(nextTimer);
      nextTimer = null;
    }
  };

  /** 一档播完：按顺序切下一档（数据里已经含原站那 1.4s 的停顿） */
  const handleEnd = () => {
    phase = 'done';
    if (!autoPlay || disposed || reduceMotion) return;
    clearNextTimer();
    nextTimer = setTimeout(() => {
      nextTimer = null;
      if (!autoPlay || disposed) return;
      selectLevel((current + 1) % LEVELS.length, true);
    }, 0);
  };

  const startPlayer = (data: BuildData, autoplay: boolean) => {
    if (!stageEl) return;
    player = createReplay(stageEl, data, {
      onEnd: handleEnd,
      onBuild: applyScale,
    });
    if (autoplay && visible) {
      player.play();
      phase = 'playing';
    } else {
      phase = 'paused';
    }
    // 预取下一档，切档时不用等
    const index = LEVELS.findIndex((level) => level.key === data.level);
    prefetch((index + 1) % LEVELS.length);
  };

  const loadLevel = async (index: number, autoplay: boolean) => {
    const token = ++loadToken;
    const level = LEVELS[index];
    phase = 'loading';
    player?.destroy();
    player = null;
    try {
      const data = await fetchLevel(level.key);
      if (token !== loadToken || disposed) return;
      startPlayer(data, autoplay);
    } catch {
      if (token !== loadToken || disposed) return;
      phase = 'error';
    }
  };

  /** 选档：点标签、键盘切换、播完自动切都走这里。点当前档会从头重播。 */
  const selectLevel = (index: number, autoplay: boolean) => {
    const sameLevel = index === current;
    if (sameLevel && player) {
      clearNextTimer();
      autoPlay = autoplay || !reduceMotion;
      player.replay();
      phase = 'playing';
      return;
    }
    current = index;
    clearNextTimer();
    autoPlay = autoplay || !reduceMotion;
    void loadLevel(index, autoPlay);
  };

  const onTabKeydown = (event: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % LEVELS.length;
    else if (event.key === 'ArrowLeft') next = (current + LEVELS.length - 1) % LEVELS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = LEVELS.length - 1;
    if (next !== current) selectLevel(next, true);
    const buttons = figureEl?.querySelectorAll<HTMLButtonElement>('.fig-tabs > button');
    buttons?.[next]?.focus();
  };

  const togglePlay = () => {
    if (!player) return;
    clearNextTimer();
    if (player.playing) {
      player.pause();
      autoPlay = false;
      phase = 'paused';
      return;
    }
    if (player.done) player.replay();
    else player.play();
    autoPlay = true;
    phase = 'playing';
  };

  const replayCurrent = () => {
    if (!player) return;
    clearNextTimer();
    player.replay();
    autoPlay = true;
    phase = 'playing';
  };

  const phaseText = $derived(
    phase === 'loading'
      ? '载入中'
      : phase === 'error'
        ? '载入失败'
        : phase === 'playing'
          ? '演示中'
          : phase === 'done'
            ? '已播完'
            : phase === 'paused'
              ? '已暂停'
              : '准备播放',
  );

  onMount(() => {
    reduceMotion = motionQuery?.matches ?? false;
    autoPlay = !reduceMotion;
    const onMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      if (reduceMotion && player?.playing) {
        player.pause();
        autoPlay = false;
        phase = 'paused';
      }
    };
    motionQuery?.addEventListener('change', onMotionChange);

    const figure = figureEl;
    if (figure) {
      // 同一时间屏幕上只放一个应用演示，滚出视口就停，回来接着播，和原站的可见性判断一致
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          visible = entry.isIntersecting;
          if (disposed) return;
          if (visible) {
            if (!started) {
              started = true;
              void loadLevel(0, !reduceMotion);
            } else if (autoPlay && player && !player.playing && !player.done) {
              player.play();
              phase = 'playing';
            }
          } else if (player?.playing) {
            player.pause();
            phase = 'paused';
          }
        },
        { rootMargin: '200px 0px' },
      );
      io.observe(figure);
    }

    return () => {
      disposed = true;
      loadToken += 1;
      clearNextTimer();
      motionQuery?.removeEventListener('change', onMotionChange);
      io?.disconnect();
      io = null;
      ro?.disconnect();
      ro = null;
      player?.destroy();
      player = null;
      cache = new Map();
      inflight = new Map();
    };
  });
</script>

<figure
  class="sye-demo sye-builds"
  aria-label="一句话提示词在四个投入档位下生成的健身应用"
  bind:this={figureEl}
>
  <div class="sye-builds-head">
    <div class="fig-tabs inline-tags" role="tablist" aria-label="投入档位">
      {#each LEVELS as level, index (level.key)}
        <button
          type="button"
          role="tab"
          id={TAB_ID(level.key)}
          aria-selected={index === current}
          aria-controls={PANEL_ID}
          tabindex={index === current ? 0 : -1}
          onclick={() => selectLevel(index, true)}
          onkeydown={onTabKeydown}
        >
          <span class="lv">{level.label}</span><span class="tg">({level.tag})</span>
        </button>
      {/each}
    </div>
    <div class="sye-builds-ctl">
      <span class="sye-builds-state" aria-hidden="true">{phaseText}</span>
      <button
        type="button"
        class="sye-builds-btn"
        aria-pressed={phase !== 'playing'}
        onclick={togglePlay}
        disabled={phase === 'loading' || phase === 'error'}
      >
        {phase === 'playing' ? '暂停' : '播放'}
      </button>
      <button
        type="button"
        class="sye-builds-btn"
        onclick={replayCurrent}
        disabled={phase === 'loading' || phase === 'error'}
      >
        重播
      </button>
    </div>
  </div>

  <div
    class="sye-builds-stage"
    id={PANEL_ID}
    role="tabpanel"
    aria-labelledby={TAB_ID(LEVELS[current].key)}
    bind:this={stageEl}
  >
    {#if phase === 'loading'}
      <p class="sye-builds-loading">正在载入{LEVELS[current].label}的演示</p>
    {:else if phase === 'error'}
      <p class="sye-builds-loading">演示数据载入失败，请刷新页面重试</p>
    {/if}
  </div>
  <span class="sye-builds-sr">依次演示 {LEVEL_NAMES} 四档的自动构建过程，可用标签页切换。</span>
</figure>
