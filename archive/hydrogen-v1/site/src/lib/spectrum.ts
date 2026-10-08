/**
 * spectrum.ts — 主题分类的唯一真源。
 *
 * 每个分类 = 氢原子的一条真实发射谱线。分类的颜色不是设计选择，
 * 是那条谱线的波长经 Dan Bruton 算法转出来的 sRGB。
 *
 * 为什么这样映射说得通：玻尔模型里电子从 n_hi 落到 n_lo 会放出一个光子，
 * 光子波长由里德伯公式决定。文章的分层（shells.ts）用的是同一批能级，
 * 所以「一篇文章从 n=3 降到 n=2」这件事，在本站的语义里就是
 * 「它属于 Hα 这个分类」。分层和分类是同一个物理过程的两个投影，
 * 不是两套并行的分类法。
 */

import {
  falseColourWavelengthNm,
  isVisible,
  rgbToHex,
  seriesLimitNm,
  transitionEnergyEv,
  transitionWavelengthNm,
  vacuumToAirNm,
  wavelengthToRgb,
  type Rgb,
} from './physics.ts';

/** 谱系。莱曼在紫外、巴尔末在可见光、帕申在红外。 */
export type SeriesName = 'lyman' | 'balmer' | 'paschen';

export interface SeriesMeta {
  name: SeriesName;
  /** 该系跃迁的终态主量子数。 */
  nLow: number;
  label: string;
  band: string;
  /**
   * 不可见谱系需要伪彩色。sourceBand 是该系的真实波长跨度（系限到第一条线），
   * targetBand 是借用的可见波段。映射是线性的，不是手挑颜色。
   */
  falseColour?: {
    sourceBand: readonly [number, number];
    targetBand: readonly [number, number];
  };
}

/**
 * 一个谱系的真实波长跨度：从系限（最短，n_hi→∞）到 α 线（最长，n_hi=n_lo+1）。
 * 从物理量算而不是写死，这样改了里德伯常数或约化质量修正，伪彩色映射会跟着走。
 */
function seriesSpan(nLow: number): readonly [number, number] {
  return [seriesLimitNm(nLow), transitionWavelengthNm(nLow, nLow + 1)];
}

export const SERIES: Record<SeriesName, SeriesMeta> = {
  lyman: {
    name: 'lyman',
    nLow: 1,
    label: '莱曼系',
    band: '紫外',
    // 莱曼系在 91nm 到 122nm，整段都在紫外。借用可见光紫端显示。
    falseColour: { sourceBand: seriesSpan(1), targetBand: [400, 430] },
  },
  balmer: {
    name: 'balmer',
    nLow: 2,
    label: '巴尔末系',
    band: '可见光',
  },
  paschen: {
    name: 'paschen',
    nLow: 3,
    label: '帕申系',
    band: '红外',
    // 帕申系在 821nm 到 1876nm，整段都在近红外。借用可见光橙端显示。
    falseColour: { sourceBand: seriesSpan(3), targetBand: [645, 600] },
  },
};

export interface CategoryDefinition {
  /** URL slug，也是 frontmatter 里 category 字段的取值。 */
  id: string;
  /** 谱线记号，例如 Hα。 */
  line: string;
  series: SeriesName;
  /** 跃迁的初态主量子数。终态由 series.nLow 决定。 */
  nHigh: number;
  title: string;
  /** 一句话说明这个分类收什么，不超过 30 字。 */
  blurb: string;
}

/**
 * 五个分类：巴尔末系前四条真色谱线 + 一条帕申系伪彩色谱线。
 *
 * 只取巴尔末前四条是有原因的：巴尔末系往系限（364.6nm）挤，
 * Hε 之后的谱线颜色几乎分辨不出来，硬塞第五条会让两个分类
 * 在界面上看起来是同一个颜色。第五个分类改用帕申系并明确标为伪彩色，
 * 比伪造一条可见谱线诚实。
 */
export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  {
    id: 'engineering',
    line: 'Hα',
    series: 'balmer',
    nHigh: 3,
    title: '工程日志',
    blurb: '把一个想法拆到能跑起来之间发生的事',
  },
  {
    id: 'systems',
    line: 'Hβ',
    series: 'balmer',
    nHigh: 4,
    title: '系统设计',
    blurb: '边界、契约、真源，以及它们怎么腐烂',
  },
  {
    id: 'cognition',
    line: 'Hγ',
    series: 'balmer',
    nHigh: 5,
    title: '认知与模型',
    blurb: '记忆、上下文、角色一致性的工程实现',
  },
  {
    id: 'essays',
    line: 'Hδ',
    series: 'balmer',
    nHigh: 6,
    title: '随笔',
    blurb: '不打算得出结论的那部分思考',
  },
  {
    id: 'field-notes',
    line: 'Paα',
    series: 'paschen',
    nHigh: 4,
    title: '现场记录',
    blurb: '踏查、翻车、以及事后才看懂的细节',
  },
];

export interface Category extends CategoryDefinition {
  seriesMeta: SeriesMeta;
  /** 真空发射波长（nm）。里德伯公式直出。 */
  wavelengthNm: number;
  /** 标准空气中的波长（nm）。光谱表上印的是这个值，UI 两个都显示。 */
  airWavelengthNm: number;
  /** 光子能量（eV）。 */
  photonEv: number;
  /** 屏幕上用于渲染这条谱线的波长。可见谱线等于真实波长，不可见的是伪彩色映射值。 */
  renderWavelengthNm: number;
  /** 是否落在人眼可见范围内。false 时 UI 必须标注 false colour。 */
  visible: boolean;
  lineRgb: Rgb;
  /** 谱线真色。只用于 1px 发射线、色点这类小面积标记。 */
  lineHex: string;
  /** CSS 变量名前缀，例如 --spec-engineering。 */
  cssVar: string;
}

function buildCategory(definition: CategoryDefinition): Category {
  const seriesMeta = SERIES[definition.series];
  const wavelengthNm = transitionWavelengthNm(seriesMeta.nLow, definition.nHigh);
  const photonEv = transitionEnergyEv(seriesMeta.nLow, definition.nHigh);
  const visible = isVisible(wavelengthNm);

  const renderWavelengthNm = visible
    ? wavelengthNm
    : falseColourWavelengthNm(
        wavelengthNm,
        seriesMeta.falseColour?.sourceBand ?? [wavelengthNm, wavelengthNm],
        seriesMeta.falseColour?.targetBand ?? [550, 550]
      );

  const lineRgb = wavelengthToRgb(renderWavelengthNm);

  return {
    ...definition,
    seriesMeta,
    wavelengthNm,
    airWavelengthNm: vacuumToAirNm(wavelengthNm),
    photonEv,
    renderWavelengthNm,
    visible,
    lineRgb,
    lineHex: rgbToHex(lineRgb),
    cssVar: `--spec-${definition.id}`,
  };
}

export const CATEGORIES: readonly Category[] = CATEGORY_DEFINITIONS.map(buildCategory);

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function requireCategory(id: string): Category {
  const category = CATEGORY_BY_ID.get(id);
  if (!category) {
    throw new Error(
      `未知分类 "${id}"。合法取值：${CATEGORIES.map((c) => c.id).join(', ')}。` +
        `新增分类要在 spectrum.ts 里声明一条真实谱线，不要直接在 frontmatter 里造。`
    );
  }
  return category;
}

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

/**
 * 光谱条的排布位置：把波长映射到 0..1，短波在左、长波在右，
 * 和真实的分光计读出方向一致。
 */
export function spectrumPosition(category: Category): number {
  const wavelengths = CATEGORIES.map((c) => c.renderWavelengthNm);
  const min = Math.min(...wavelengths);
  const max = Math.max(...wavelengths);
  if (max === min) return 0.5;
  return (category.renderWavelengthNm - min) / (max - min);
}

/** 波长格式化：可见谱线给两位小数，红外的量级大给一位。 */
export function formatWavelength(nm: number): string {
  return nm >= 1000 ? `${nm.toFixed(1)} nm` : `${nm.toFixed(2)} nm`;
}

/** 跃迁记号，例如 "n=3 → 2"。 */
export function formatTransition(category: Category): string {
  return `n=${category.nHigh} → ${category.seriesMeta.nLow}`;
}
