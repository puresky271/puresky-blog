/**
 * BiGym 2.0 项目页交互演示的共用数据层。
 *
 * 原站把榜单、任务盘、成本散点、程序浏览器、开篇影像五块的配置都内联在 HTML 里，
 * 或者由构建脚本写进 data-* 属性。这里抽成 public/data/bigym2/ 下的 JSON 和纯文本，
 * 组件挂载时才取，不进 bundle。视频和海报在 public/media/bigym2/ 下。
 *
 * 数据全部逐字来自 bigym2.github.io（抓取与清洗脚本见 _scratch/bigym2/），
 * 数字、文案、顺序都不改。
 */

import { withBase } from '@/lib/format';

/* ---------- 取数据 ---------- */

const cache = new Map<string, Promise<unknown>>();

/** 同一份 JSON 只取一次；切 tab、换任务时不重复请求。 */
export function loadJson<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached) return cached as Promise<T>;
  const pending = fetch(withBase(path)).then((response) => {
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  });
  cache.set(path, pending);
  return pending as Promise<T>;
}

/** 代码是纯文本（原站给的是 shiki 高亮后的 HTML，这里只要文字，自己画行号和语法色）。 */
const textCache = new Map<string, Promise<string>>();

export function loadText(path: string): Promise<string> {
  const cached = textCache.get(path);
  if (cached) return cached;
  const pending = fetch(withBase(path)).then((response) => {
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.text();
  });
  textCache.set(path, pending);
  return pending;
}

export const dataUrl = (name: string): string => withBase(`data/bigym2/${name}`);
export const mediaUrl = (name: string): string => withBase(`media/bigym2/${name}`);
export const programUrl = (task: string, session: string): string => `data/bigym2/programs/${task}__${session}.txt`;
export const traceUrl = (task: string, session: string, seed: number): string =>
  `data/bigym2/traces/${task}__${session}__${seed}.json`;

/* ---------- 榜单 ---------- */

export type ViewId = 'all' | 'core' | 'ext';

export interface BoardBar {
  key: string;
  aria: string;
  /** 形如 `--c: var(--series-opus); --h: 86.5%`，拆成颜色和高度用。 */
  style: string;
  short: boolean;
  name: string;
  kind: string;
  value: string;
}

export interface BoardName {
  lines: string[];
  text: string;
  effort: string;
  color: string;
  logo: boolean;
}

export interface BoardView {
  chartStyle: string;
  ticks: { bottom: string; label: string }[];
  bars: BoardBar[];
  names: BoardName[];
  leftNote: string | null;
}

export interface BoardData {
  sets: { id: ViewId; label: string; lede: string; pressed: string }[];
  views: Record<ViewId, BoardView>;
  /** 原站的 “Updated 31 October 2026.” */
  updated?: string;
  ledeBefore?: string;
  ledeAfter?: string;
}

export interface TableCell {
  v: string;
  p: string;
  hi: boolean;
  title: string;
}

export interface TableRow {
  label: string;
  kind: string;
  cells: TableCell[];
  mean: string | null;
}

export interface TableView {
  h3: string[];
  subs: string[];
  scenes: { label: string; style: string }[];
  tasks: { name: string; instruction: string }[];
  rows: TableRow[];
}

export type TableData = Record<ViewId, TableView>;

/* ---------- 成本散点 ---------- */

export interface CostPoint {
  name: string;
  effort: string;
  score: string;
  cost: string;
  x: string;
  y: string;
  aria: string;
}

export interface CostSeries {
  id: string;
  style: string;
  points: CostPoint[];
  pathD: string | null;
}

export interface CostView {
  viewBox: string;
  x0: string;
  axisY: string;
  aria: string;
  grid: { dash: boolean; x1: string; x2: string; y1: string; y2: string }[];
  ticks: { x: string; y: string; anchor: string; text: string }[];
  axis: string[];
  labels: { id: string; x: string; y: string; anchor: string; text: string; style: string }[];
  series: CostSeries[];
  sub: string;
}

export type CostData = Record<ViewId, CostView>;

/* ---------- 任务盘 ---------- */

export interface BmTask {
  name: string;
  scene: string;
  group: 'reaching' | 'tabletop' | 'dishwasher' | 'counter';
  instruction: string;
  video: string;
  poster: string;
}

export type TasksData = Record<ViewId, BmTask[]>;

/* ---------- 程序浏览器 ---------- */

export interface ExplorerSession {
  id: string;
  label: string;
  rate: number;
  vision: string;
  lines: number;
  seeds: number[];
  /** 100 个字符，'1' 表示成功。 */
  outcomes: string;
  /** 100 个种子各自的仿真步数。 */
  steps: number[];
  /** 有本地回放（原站是 3D 录像）的种子。 */
  recorded: number[];
}

export interface ExplorerTask {
  id: string;
  name: string;
  sessions: ExplorerSession[];
}

export interface ExplorerData {
  tasks: ExplorerTask[];
}

/** 原站 trace：每一步执行了哪些代码行，以及按函数切开的阶段。 */
export interface TraceStep {
  v: number;
  window: number;
  length: number;
  success: boolean;
  /** 去重后的行号集合，每个元素是一组同时执行的行号（从 1 开始）。 */
  sets: number[][];
  /** 长度等于 length，把每一步映射到 sets 的下标。 */
  steps: number[];
  segments: [number, number, number, string[]][];
}

/* ---------- 开篇影像 ---------- */

export interface FilmData {
  clips: Record<string, { light: string; dark: string }>;
  pairs: string[][];
}

/* ---------- 小工具 ---------- */

/** 从 `--c: var(--series-opus); --h: 86.5%` 里取一个值。 */
export function styleValue(style: string | undefined, name: string): string {
  const match = (style ?? '').match(new RegExp(`${name}\\s*:\\s*([^;]+)`));
  return match ? match[1].trim() : '';
}

export function formatInt(value: number): string {
  return value.toLocaleString('en-US');
}

/** 原站把任务名写成英文短语，标题栏用的是首字母大写的展示名。 */
export function titleCase(text: string): string {
  return text.replace(/\b[a-z]/g, (character) => character.toUpperCase());
}
