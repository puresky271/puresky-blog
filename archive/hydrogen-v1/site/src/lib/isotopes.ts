/**
 * isotopes.ts — 友链分层的唯一真源（氢的同位素）。
 *
 * 氢有三种天然同位素，它们的物理性质刚好对应三种友链关系：
 *
 *   ¹H 氕 protium    0 中子   稳定          丰度 99.9885%
 *   ²H 氘 deuterium  1 中子   稳定          丰度 0.0115%
 *   ³H 氚 tritium    2 中子   β⁻ 衰变，半衰期 12.32 年
 *
 * 氚会衰变这件事被当真用了：标为 tritium 的友链带一个「加入日期」，
 * 界面会按 12.32 年半衰期算出它的剩余活度。活度掉到阈值以下时，
 * 说明这条链很久没有互动了，该复查是不是已经死链。
 * 这不是装饰性的比喻，是一个真的会到期的提醒机制。
 */

/** 氚的半衰期，单位年。IUPAC 2017 评定值。 */
export const TRITIUM_HALF_LIFE_YEARS = 12.32;

export type IsotopeId = 'protium' | 'deuterium' | 'tritium';

export interface IsotopeMeta {
  id: IsotopeId;
  /** 质量数 A。 */
  massNumber: number;
  neutrons: number;
  symbol: string;
  /** 中文名。 */
  name: string;
  /** 拉丁名。 */
  latinName: string;
  /** 天然丰度，百分比。氚是宇生痕量，不给固定丰度。 */
  abundancePercent: number | null;
  stable: boolean;
  halfLifeYears: number | null;
  /** 这一档友链是什么关系。 */
  meaning: string;
}

export const ISOTOPES: Record<IsotopeId, IsotopeMeta> = {
  protium: {
    id: 'protium',
    massNumber: 1,
    neutrons: 0,
    symbol: '¹H',
    name: '氕',
    latinName: 'protium',
    abundancePercent: 99.9885,
    stable: true,
    halfLifeYears: null,
    meaning: '长期来往的人。不需要靠链接维持的那种。',
  },
  deuterium: {
    id: 'deuterium',
    massNumber: 2,
    neutrons: 1,
    symbol: '²H',
    name: '氘',
    latinName: 'deuterium',
    abundancePercent: 0.0115,
    stable: true,
    halfLifeYears: null,
    meaning: '同行。读彼此写的东西，偶尔交换意见。',
  },
  tritium: {
    id: 'tritium',
    massNumber: 3,
    neutrons: 2,
    symbol: '³H',
    name: '氚',
    latinName: 'tritium',
    abundancePercent: null,
    stable: false,
    halfLifeYears: TRITIUM_HALF_LIFE_YEARS,
    meaning: '新加入，还在观察。会按半衰期提醒我复查是否成了死链。',
  },
};

export const ISOTOPE_IDS = Object.keys(ISOTOPES) as [IsotopeId, ...IsotopeId[]];

export interface FriendLink {
  name: string;
  url: string;
  /** 一句话介绍，不超过 40 字。 */
  blurb: string;
  isotope: IsotopeId;
  /** 建立友链的日期，ISO 格式。氚档用它算剩余活度。 */
  since: string;
  avatar?: string;
  /** 最近一次确认对方站点还活着的日期。 */
  lastChecked?: string;
}

export interface DecayState {
  /** 已经过去的年数。 */
  elapsedYears: number;
  /** 剩余活度 N/N₀ = 2^(−t/t½)，范围 0..1。 */
  remainingActivity: number;
  /** 经过了几个半衰期。 */
  halfLivesElapsed: number;
  /** 活度低于 0.85 时建议复查这条链是否还活着。 */
  needsReview: boolean;
}

/**
 * 放射性衰变定律：N(t) = N₀ · 2^(−t/t½)。
 *
 * `now` 可注入，让快照测试拿到确定值。
 */
export function decayState(since: string, now: Date = new Date()): DecayState {
  const start = new Date(since);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`友链的 since 字段不是合法日期："${since}"`);
  }
  const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
  const elapsedYears = Math.max(0, (now.getTime() - start.getTime()) / MS_PER_YEAR);
  const halfLivesElapsed = elapsedYears / TRITIUM_HALF_LIFE_YEARS;
  const remainingActivity = Math.pow(2, -halfLivesElapsed);
  return {
    elapsedYears,
    remainingActivity,
    halfLivesElapsed,
    needsReview: remainingActivity < 0.85,
  };
}

/** 稳定同位素恒定满活度；氚按衰变律算。 */
export function activityFor(link: FriendLink, now: Date = new Date()): DecayState | null {
  return ISOTOPES[link.isotope].stable ? null : decayState(link.since, now);
}

export function formatActivity(state: DecayState): string {
  return `${(state.remainingActivity * 100).toFixed(1)}%`;
}

/** 按同位素分组，顺序固定为 氕 → 氘 → 氚。 */
export function groupByIsotope(links: readonly FriendLink[]): Array<{
  isotope: IsotopeMeta;
  links: FriendLink[];
}> {
  return ISOTOPE_IDS.map((id) => ({
    isotope: ISOTOPES[id],
    links: links.filter((link) => link.isotope === id),
  })).filter((group) => group.links.length > 0);
}

/**
 * 核素图上的位置：横轴中子数 N，纵轴质子数 Z。
 * 氢的 Z 恒为 1，所以三个同位素在图上是一条水平线，N = 0, 1, 2。
 */
export function nuclideChartPosition(isotope: IsotopeMeta): { z: number; n: number } {
  return { z: 1, n: isotope.neutrons };
}
