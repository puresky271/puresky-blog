<script lang="ts">
/**
 * FIG4：给了详细 interview spec 之后，四档 effort 生成的手机应用 IRON LOG。
 *
 * 四档应用本身是原站的 React 程序（每执行一个演示动作就整屏重建一次 DOM），逐行移植不现实，
 * 这里用「录制重放」：_scratch/spending-your-effort/phone/recorder.mjs 在应用挂载前装录像机，
 * 录下初始 DOM、MutationObserver 变更序列和每帧采样的输入值 / 滚动位置，build.mjs 压成
 * 「初始 DOM + 最小变更补丁流」，本组件按时间轴把补丁逐条应用回去（引擎在 phone/replay.ts）。
 *
 * 播放器和控件与录制数据分开实现：四档标签页、11 个步骤圆点、上一步 / 下一步、播放 / 暂停。
 * 步骤边界用录制时从 .efx-dots[aria-current] 记下的时间点。
 */
import { onMount } from 'svelte';
import { withBase } from '@/lib/format';
import { DomReplay } from './phone/replay';
import type { ReplayData } from './phone/replay';
import './base.css';
import './phone/phone.css';
import './phone/extra.css';

type LevelId = 'low' | 'medium' | 'high' | 'max';

interface LevelDef {
  id: LevelId;
  label: string;
  minutes: string;
}

const LEVELS: LevelDef[] = [
  { id: 'low', label: '低档', minutes: '16 分钟' },
  { id: 'medium', label: '中档', minutes: '22 分钟' },
  { id: 'high', label: '高档', minutes: '33 分钟' },
  { id: 'max', label: '最高档', minutes: '79 分钟' },
];

/** 录制时原站 11 个步骤的顺序，只用来给圆点写 aria-label */
const STEP_NAMES = ['今日', '选择模板', '开始训练', '记录一组', '连续记录', '训练小结', '已保存', '进度', '饮食', '身体', '设置'];
const STEP_COUNT = STEP_NAMES.length;
const LOOP_DELAY = 1600;
const FADE_TIME = 260;

let { config = {} }: { config?: Record<string, unknown> } = $props();

// 没有配置项。读一次，既让挂载层传进来的 config 有响应式身份，又不触发编译警告。
$effect(() => {
  void config;
});

let rootEl: HTMLDivElement;
let stageEl: HTMLDivElement;
let screenEl: HTMLDivElement;

let current = $state<LevelId>('low');
let stepIndex = $state(0);
let playing = $state(false);
let ready = $state(false);
let failed = $state(false);
let fading = $state(false);
let scale = $state('0.8');

let replay: DomReplay | null = null;
const cache = new Map<LevelId, ReplayData>();
let generation = 0;
let head = 0;
let startHead = 0;
let startedAt = 0;
let rafId = 0;
let loopTimer = 0;
let visible = true;
let firstSeen = false;
let reduceMotion = false;

/** 手机屏幕按舞台尺寸算 --s（和原站同一套公式）。 */
function measure(): void {
  if (!stageEl) return;
  const rect = stageEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const next = Math.max(0.45, Math.min(1.15, (rect.height - 26) / 812, (rect.width - 26) / 375));
  scale = next.toFixed(4);
}

function stopClock(): void {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

function startClock(): void {
  stopClock();
  startHead = head;
  startedAt = performance.now();
  rafId = requestAnimationFrame(tick);
}

function tick(): void {
  rafId = 0;
  if (!replay || !playing) return;
  const time = Math.min(replay.duration, startHead + (performance.now() - startedAt));
  head = replay.applyUntil(time);
  const step = replay.stepAt(head);
  if (step !== stepIndex) stepIndex = step;
  if (time >= replay.duration) {
    playing = false;
    scheduleLoop();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

/** 一轮走完：原站会淡出重播，这里照做（减弱动效时停在最后一步）。 */
function scheduleLoop(): void {
  if (reduceMotion) return;
  window.clearTimeout(loopTimer);
  loopTimer = window.setTimeout(() => {
    if (!replay || !visible) return;
    fading = true;
    loopTimer = window.setTimeout(() => {
      head = 0;
      replay?.seek(0);
      stepIndex = 0;
      fading = false;
      playing = true;
      startClock();
    }, FADE_TIME);
  }, LOOP_DELAY);
}

function setPlaying(next: boolean): void {
  if (next === playing) return;
  if (next && !ready) return;
  playing = next;
  if (next) startClock();
  else stopClock();
}

function jumpTo(step: number): void {
  if (!replay) return;
  const target = Math.max(0, Math.min(STEP_COUNT - 1, step));
  stopClock();
  window.clearTimeout(loopTimer);
  fading = false;
  head = replay.steps[target] ?? 0;
  replay.seek(head);
  stepIndex = target;
  playing = true;
  startClock();
}

function previous(): void {
  jumpTo(stepIndex - 1);
}

function next(): void {
  jumpTo(stepIndex + 1);
}

function togglePlay(): void {
  if (head >= (replay?.duration ?? 0) && !playing) {
    jumpTo(0);
    return;
  }
  setPlaying(!playing);
}

async function load(level: LevelId): Promise<ReplayData> {
  const cached = cache.get(level);
  if (cached) return cached;
  const response = await fetch(withBase(`/data/spending-your-effort/phone/level-${level}.json`));
  if (!response.ok) throw new Error(`level-${level}.json: ${response.status}`);
  const result = (await response.json()) as ReplayData;
  cache.set(level, result);
  return result;
}

async function selectLevel(level: LevelId): Promise<void> {
  if (level === current) return;
  const ticket = ++generation;
  current = level;
  failed = false;
  playing = false;
  stopClock();
  window.clearTimeout(loopTimer);
  fading = true;
  try {
    const result = await load(level);
    if (ticket !== generation) return;
    mountReplay(result);
    fading = false;
    ready = true;
    if (firstSeen && !reduceMotion) {
      playing = true;
      startClock();
    }
  } catch {
    if (ticket !== generation) return;
    failed = true;
    fading = false;
  }
}

function mountReplay(result: ReplayData): void {
  replay?.destroy();
  stepIndex = 0;
  // 没进入视野前先停在第一步，手机不至于是一块空屏
  head = result.steps[0] ?? 0;
  replay = new DomReplay(screenEl, result);
  replay.seek(head);
}

function onKeydown(event: KeyboardEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || !rootEl?.contains(target)) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    previous();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    next();
  } else if (event.key === ' ') {
    if (target.closest('button')) return;
    event.preventDefault();
    togglePlay();
  }
}

onMount(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resizeObserver = new ResizeObserver(measure);
  if (stageEl) resizeObserver.observe(stageEl);
  measure();

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !firstSeen) {
        firstSeen = true;
        if (ready && !reduceMotion && !playing) setPlaying(true);
      }
      if (!visible) stopClock();
      else if (playing && !rafId) startClock();
    },
    { threshold: 0.15 },
  );
  if (rootEl) intersectionObserver.observe(rootEl);

  const ticket = ++generation;
  load('low')
    .then((result) => {
      if (ticket !== generation) return;
      mountReplay(result);
      ready = true;
      if (firstSeen && !reduceMotion) setPlaying(true);
    })
    .catch(() => {
      if (ticket === generation) failed = true;
    });

  return () => {
    generation += 1;
    stopClock();
    window.clearTimeout(loopTimer);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    replay?.destroy();
    replay = null;
  };
});
</script>

<!-- 演示区用 toolbar 语义：左右方向键切步骤、空格播放暂停，和工具栏的方向键惯例一致 -->
<div
  class="sye-demo sye-phone"
  bind:this={rootEl}
  tabindex="0"
  role="toolbar"
  aria-label="从 interview spec 生成的健身应用演示"
  onkeydown={onKeydown}
>
  <div class="fig-tabs eff-levels inline-tags" role="group" aria-label="投入档位">
    {#each LEVELS as level (level.id)}
      <button type="button" aria-pressed={current === level.id} onclick={() => selectLevel(level.id)}>
        <span class="lv">{level.label}</span><span class="tg">({level.minutes})</span>
      </button>
    {/each}
  </div>

  <div class="efx-stage" bind:this={stageEl}>
    <div class="efx-phone" style={`--s: ${scale}`}>
      <div class="efx-screen" bind:this={screenEl} aria-busy={!ready}>
        <div class="efx-fade" class:on={fading}></div>
        {#if !ready}
          <p class="sye-phone-note">{failed ? '演示加载失败，请刷新重试' : '演示加载中'}</p>
        {/if}
      </div>
    </div>
  </div>

  <div class="efx-ctrl">
    <button type="button" class="efx-word" onclick={previous} aria-label="上一步：回到上一个演示步骤">上一步</button>
    <div class="efx-dots">
      {#each STEP_NAMES as name, index (name)}
        <button
          type="button"
          aria-label={`第 ${index + 1} 步：${name}`}
          aria-current={stepIndex === index}
          onclick={() => jumpTo(index)}
        ></button>
      {/each}
    </div>
    <button type="button" class="efx-word" onclick={next} aria-label="下一步：进入下一个演示步骤">下一步</button>
    <button type="button" class="efx-word pp" onclick={togglePlay} aria-label={playing ? '暂停演示' : '播放演示'}>
      {playing ? '暂停' : '播放'}
    </button>
  </div>
</div>
