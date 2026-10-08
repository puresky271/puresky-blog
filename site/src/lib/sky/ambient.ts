/**
 * ambient.ts — 站点的「天色」：此刻是一天里的哪一段、外面是什么天气。
 *
 * 结果写在 <html data-phase data-weather> 上，并广播 ambient:change：
 *   CSS 用属性选择器切换 hero 天空底色，粒子场切换形态，时钟卡显示天气。
 *
 * 地点固定为 config.ts 里的 WEATHER（沈阳），访客看到的是作者那边的天。
 * 首屏的值由 Base.astro 的内联脚本按该时区的钟点（或会话缓存）先给一个，避免闪烁；
 * 这里再异步向 Open-Meteo 取真实天气覆盖。
 *
 * 预览：地址栏加 ?sky=dusk&weather=rain 可以强制任意组合，?sky=auto 恢复。
 */

import {
  fetchWeather,
  phaseByClock,
  phaseNow,
  type SkyPhase,
  type WeatherKind,
  type WeatherReport,
} from '@shared/weather';

import { WEATHER } from '@/config';

export interface Ambient {
  phase: SkyPhase;
  weather: WeatherKind;
  intensity: number;
  report: WeatherReport | null;
  /** 地址栏强制指定的预览组合。 */
  preview: boolean;
}

const CACHE_KEY = 'ambient-report';
const PREVIEW_KEY = 'ambient-preview';
const CACHE_TTL = 20 * 60 * 1000;

export const PHASES: SkyPhase[] = ['dawn', 'day', 'dusk', 'night'];
export const WEATHERS: WeatherKind[] = ['clear', 'cloudy', 'overcast', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];

export const PHASE_LABEL: Record<SkyPhase, string> = { dawn: '破晓', day: '白天', dusk: '黄昏', night: '夜晚' };

/** 降水类天气的默认强度，预览时用。 */
const DEFAULT_INTENSITY: Partial<Record<WeatherKind, number>> = { drizzle: 0.35, rain: 0.7, snow: 0.7, thunder: 0.9 };

let state: Ambient = fromDom();
let started = false;

function fromDom(): Ambient {
  if (typeof document === 'undefined') {
    return { phase: 'day', weather: 'clear', intensity: 0, report: null, preview: false };
  }
  const root = document.documentElement;
  const phase = (PHASES as string[]).includes(root.dataset.phase ?? '') ? (root.dataset.phase as SkyPhase) : 'day';
  const weather = (WEATHERS as string[]).includes(root.dataset.weather ?? '')
    ? (root.dataset.weather as WeatherKind)
    : 'clear';
  return { phase, weather, intensity: Number(root.dataset.intensity ?? 0), report: null, preview: false };
}

export function getAmbient(): Ambient {
  return state;
}

function apply(next: Ambient): void {
  const changed =
    next.phase !== state.phase || next.weather !== state.weather || next.intensity !== state.intensity || next.report !== state.report;
  state = next;
  const root = document.documentElement;
  root.dataset.phase = next.phase;
  root.dataset.weather = next.weather;
  root.dataset.intensity = String(next.intensity);
  if (changed) window.dispatchEvent(new CustomEvent<Ambient>('ambient:change', { detail: next }));
}

function readPreview(): { phase: SkyPhase; weather: WeatherKind } | null {
  const params = new URLSearchParams(location.search);
  const sky = params.get('sky');
  const weather = params.get('weather');
  try {
    if (sky === 'auto') {
      sessionStorage.removeItem(PREVIEW_KEY);
      return null;
    }
    if (sky || weather) {
      const value = {
        phase: (PHASES as string[]).includes(sky ?? '') ? (sky as SkyPhase) : state.phase,
        weather: (WEATHERS as string[]).includes(weather ?? '') ? (weather as WeatherKind) : 'clear',
      };
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(value));
      return value;
    }
    const saved = sessionStorage.getItem(PREVIEW_KEY);
    return saved ? (JSON.parse(saved) as { phase: SkyPhase; weather: WeatherKind }) : null;
  } catch {
    return null;
  }
}

function readCache(): WeatherReport | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as WeatherReport;
    return Date.now() - new Date(report.fetchedAt).getTime() < CACHE_TTL ? report : null;
  } catch {
    return null;
  }
}

function fromReport(report: WeatherReport): Ambient {
  return {
    phase: phaseNow(report),
    weather: report.kind,
    intensity: report.intensity,
    report,
    preview: false,
  };
}

async function loadReport(): Promise<WeatherReport | null> {
  try {
    return await fetchWeather({ latitude: WEATHER.latitude, longitude: WEATHER.longitude }, WEATHER.name);
  } catch {
    return null;
  }
}

/** 天气接口不可用时，按固定地点所在时区的钟点估算时段。 */
function clockPhase(): SkyPhase {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WEATHER.timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return phaseByClock(get('hour') + get('minute') / 60);
}

export async function refreshAmbient(force = false): Promise<void> {
  const preview = readPreview();
  if (preview) {
    apply({ ...preview, intensity: DEFAULT_INTENSITY[preview.weather] ?? 0, report: state.report, preview: true });
    return;
  }

  const cached = force ? null : readCache();
  if (cached) {
    apply(fromReport(cached));
    return;
  }

  const report = await loadReport();
  if (report) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(report));
    } catch {
      // 存不进去只是下次要重新取。
    }
    apply(fromReport(report));
  } else {
    // 天气完全拿不到时只按钟点走，天气当作晴。
    apply({ phase: clockPhase(), weather: 'clear', intensity: 0, report: null, preview: false });
  }
}

/** 启动一次：立即刷新，之后每 5 分钟按日出日落重算 phase，缓存过期时重新取天气。 */
export function startAmbient(): void {
  if (started) return;
  started = true;
  void refreshAmbient();
  setInterval(() => void refreshAmbient(), 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refreshAmbient();
  });
}
