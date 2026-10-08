/**
 * weather.ts — 天气与天色。
 *
 * 位置固定（见 site/src/config.ts 的 WEATHER），浏览器直接请求。
 * 数据源是 Open-Meteo：免费、无需 key、支持 CORS。
 *
 * 输出两样东西给页面用：
 *   phase   一天里的哪一段（破晓 / 白天 / 黄昏 / 夜晚），按当地日出日落算；
 *   weather 归一化后的天气类别和强度，驱动粒子形态和天空底色。
 */

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export type WeatherKind = 'clear' | 'cloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export interface WeatherReport {
  kind: WeatherKind;
  /** 0 到 1，降水类天气的强弱。 */
  intensity: number;
  /** 中文描述，例如「小雨」。 */
  label: string;
  /** 摄氏度，整数。 */
  temperature: number | null;
  phase: SkyPhase;
  place: string;
  /** 当地日出日落（一天中的第几分钟）和 UTC 偏移（秒），让客户端随时间推移自己重算 phase。 */
  sun: { sunrise: number; sunset: number; utcOffset: number } | null;
  fetchedAt: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** WMO 天气代码 → 类别、强度、中文描述。 */
export function describeWeatherCode(code: number): Pick<WeatherReport, 'kind' | 'intensity' | 'label'> {
  switch (code) {
    case 0:
      return { kind: 'clear', intensity: 0, label: '晴' };
    case 1:
      return { kind: 'clear', intensity: 0, label: '晴间少云' };
    case 2:
      return { kind: 'cloudy', intensity: 0, label: '多云' };
    case 3:
      return { kind: 'overcast', intensity: 0, label: '阴' };
    case 45:
    case 48:
      return { kind: 'fog', intensity: 0, label: '雾' };
    case 51:
    case 53:
    case 55:
      return { kind: 'drizzle', intensity: 0.3 + (code - 51) * 0.08, label: '毛毛雨' };
    case 56:
    case 57:
      return { kind: 'drizzle', intensity: 0.4, label: '冻毛毛雨' };
    case 61:
    case 80:
      return { kind: 'rain', intensity: 0.45, label: code === 80 ? '阵雨' : '小雨' };
    case 63:
    case 81:
      return { kind: 'rain', intensity: 0.72, label: code === 81 ? '阵雨' : '中雨' };
    case 65:
    case 82:
      return { kind: 'rain', intensity: 1, label: code === 82 ? '强阵雨' : '大雨' };
    case 66:
    case 67:
      return { kind: 'rain', intensity: 0.6, label: '冻雨' };
    case 71:
    case 85:
      return { kind: 'snow', intensity: 0.4, label: code === 85 ? '阵雪' : '小雪' };
    case 73:
      return { kind: 'snow', intensity: 0.7, label: '中雪' };
    case 75:
    case 86:
      return { kind: 'snow', intensity: 1, label: '大雪' };
    case 77:
      return { kind: 'snow', intensity: 0.35, label: '米雪' };
    case 95:
      return { kind: 'thunder', intensity: 0.85, label: '雷阵雨' };
    case 96:
    case 99:
      return { kind: 'thunder', intensity: 1, label: '雷暴' };
    default:
      return { kind: 'cloudy', intensity: 0, label: '多云' };
  }
}

/** 用报告里的日出日落数据算「此刻」的 phase。报告是一小时前取的也没关系，日出日落一天内不变。 */
export function phaseNow(report: Pick<WeatherReport, 'sun' | 'phase'>, now = Date.now()): SkyPhase {
  if (!report.sun) return report.phase;
  const local = new Date(now + report.sun.utcOffset * 1000);
  return phaseBySun(local.getUTCHours() * 60 + local.getUTCMinutes(), report.sun.sunrise, report.sun.sunset);
}

/** 没有日出日落数据时按钟点粗分。 */
export function phaseByClock(hour: number): SkyPhase {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19.5) return 'dusk';
  return 'night';
}

/**
 * 按日出日落划分。日出前后各 45 分钟算破晓，日落前后各 45 分钟算黄昏。
 * 参数都是「当地一天中的第几分钟」。
 */
export function phaseBySun(nowMinutes: number, sunriseMinutes: number, sunsetMinutes: number): SkyPhase {
  const band = 45;
  if (Math.abs(nowMinutes - sunriseMinutes) <= band) return 'dawn';
  if (Math.abs(nowMinutes - sunsetMinutes) <= band) return 'dusk';
  if (nowMinutes > sunriseMinutes && nowMinutes < sunsetMinutes) return 'day';
  return 'night';
}

interface OpenMeteoResponse {
  utc_offset_seconds: number;
  current?: { temperature_2m: number; weather_code: number };
  daily?: { sunrise: string[]; sunset: string[] };
}

/** "2026-10-08T05:57" → 357 */
function minutesOf(localIso: string | undefined): number | null {
  const match = localIso ? /T(\d{2}):(\d{2})/.exec(localIso) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export async function fetchWeather(
  coords: Coordinates,
  place: string,
  timeoutMs = 6000
): Promise<WeatherReport> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', coords.latitude.toFixed(2));
  url.searchParams.set('longitude', coords.longitude.toFixed(2));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let data: OpenMeteoResponse;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Open-Meteo → ${response.status}`);
    data = (await response.json()) as OpenMeteoResponse;
  } finally {
    clearTimeout(timer);
  }

  const described = describeWeatherCode(data.current?.weather_code ?? 2);

  // 当地此刻是一天中的第几分钟：UTC 时间加上当地偏移。
  const local = new Date(Date.now() + data.utc_offset_seconds * 1000);
  const nowMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const sunrise = minutesOf(data.daily?.sunrise?.[0]);
  const sunset = minutesOf(data.daily?.sunset?.[0]);
  const phase =
    sunrise !== null && sunset !== null ? phaseBySun(nowMinutes, sunrise, sunset) : phaseByClock(nowMinutes / 60);

  return {
    ...described,
    temperature: data.current ? Math.round(data.current.temperature_2m) : null,
    phase,
    place,
    sun: sunrise !== null && sunset !== null ? { sunrise, sunset, utcOffset: data.utc_offset_seconds } : null,
    fetchedAt: new Date().toISOString(),
  };
}
