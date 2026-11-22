/**
 * 对抗蒸馏收录文章里那张交互折线图的数据。
 *
 * 原站图表是 Vega-Lite 画的（两个标签页，每个基准 4 条线 × 8 个推理预算），
 * 规格和数值从原站 RSC payload 里原样抽出，存成 public/data 下的 JSON，
 * 组件挂载时才取，不进 bundle。数值保留 6 位小数，和原站 tooltip 的 .2f 格式对应。
 */

import { withBase } from '@/lib/format';

export interface AdvdSeries {
  id: string;
  /** 图例文字，例如「Reasoning summaries · After fine-tuning」。 */
  label: string;
  /** tooltip 第一行「Training data」。 */
  dataLabel: string;
  /** tooltip 第二行「Training stage」。 */
  stageLabel: string;
  color: 'blue' | 'yellow';
  /** SVG stroke-dasharray；'none' 是实线。 */
  dash: string;
  /** 是否实心点：强学习之后的路线是实心，微调之后是空心。 */
  filled: boolean;
  /** 8 个推理预算下的能力覆盖率。 */
  values: number[];
}

export interface AdvdBenchmark {
  id: string;
  /** 标签页上的文字。 */
  tab: string;
  /** 图内标题。 */
  title: string;
  /** 纵轴标题：ExploitBench 是 Capability coverage，SEC-bench Pro 是 Score。 */
  yTitle: string;
  /** tooltip 里能力那一行的标题。 */
  scoreTitle: string;
  series: AdvdSeries[];
}

export interface AdvdData {
  /** 横轴的 8 个推理预算（加权输出 token 数）。 */
  budgets: number[];
  benchmarks: AdvdBenchmark[];
}

const cache = new Map<string, Promise<unknown>>();

/** 同一份 JSON 只取一次。 */
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
