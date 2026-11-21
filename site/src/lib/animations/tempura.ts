/**
 * tempura.ts — 《天妇罗：水与油的四百年》正文四卡数据图版的唯一数据源。
 *
 * 数据口径（最终版，已按 _scratch/tempura/research/data.json 复核）：
 * - oilTemps：农林水产省消费者咨询「家庭で揚げ物をする際に、どうすれば上手に揚げることができますか。」
 *   与日本植物油协会「上手に使いこなす料理のコツ」的 175 到 180℃ 口径，辻调（鱼介 175 到 180℃）
 *   与天ぷらナビ的单品温度指南（春菊 170 到 175℃、なす 180℃、さつまいも 160 到 165℃ 等），
 *   合成六档区间。
 * - fryingCurve：首尾锚点取自日本食品标准成分表 八訂増補 2023：天ぷら用バッター（01171）
 *   水分 65.5、脂质 0.5，同一バッター揚げ（01172）水分 10.2、脂质 47.7（g / 100 g）。
 *   数值放在 3 分钟处，中段按水分单调蒸发、吸油单调增加的趋势插值，是示意而不是实测时间序列；
 *   方向参照日本调理科学会 2025 年度大会研究发表要旨（DOI 10.11402/ajscs.36.0_159）。
 * - seasonMatrix：编者按天ぷらナビ《月別の天ぷら旬食材カレンダー》2026 年版、农林水产省东海农政局
 *   《東海地域産食材カレンダー》、国土交通省多言语 DB「鱧」的季节区分逐月整理的 1 到 5 分，
 *   1 分淡季、3 分当季、5 分巅峰旬，不是官方统计。
 * - lipidBars：日本食品标准成分表 八訂増補 2023 的可食部每 100 克脂質值（g / 100 g），
 *   食品编号逐条对表。八訂里没有独立的「かき揚げ」条目，本卡因此不列かき揚げ，也不拿别的编号顶替。
 *
 * 图版配色锁定 lieflat-charts 的 porcelain 青瓷蓝：明度即数据，数据元素不出现纯黑白灰。
 * 组件只读本文件，不写死数据数字；改数据只改这里。
 */

/* ══════════════════════════════════════════════════════════════
   卡 1 · 油温区间（F12 Dumbbell Queue 的区间翻译）
   ══════════════════════════════════════════════════════════════ */

export type OilTempId = 'fish' | 'meat' | 'kakiage' | 'fruitVeg' | 'leafVeg' | 'rootVeg';

export interface OilTempRange {
  id: OilTempId;
  /** 中文类目名，卡片左侧直接显示 */
  label: string;
  /** 日文名，类目名下面的小字 */
  jaLabel: string;
  /** 适宜油温区间下限，摄氏度 */
  lowC: number;
  /** 适宜油温区间上限，摄氏度 */
  highC: number;
  /** 为什么落在这个区间：含水量、厚薄与下锅时间 */
  note: string;
  /** 整版只给一个主角，主角色留给鱼介这一档 */
  hero?: boolean;
}

/** 六类常见天妇罗食材的适宜油温区间，按区间上限从高到低排列。 */
export const OIL_TEMPS: readonly OilTempRange[] = [
  {
    id: 'fish',
    label: '鱼介',
    jaLabel: '車海老・穴子',
    lowC: 175,
    highC: 180,
    note: '薄而嫩，用高温迅速封住表面，里面刚熟就出锅。',
    hero: true,
  },
  {
    id: 'meat',
    label: '肉类',
    jaLabel: '鶏・豚・牛',
    lowC: 175,
    highC: 180,
    note: '和鱼介同一档，靠高温把表面炸住，别让肉汁先跑掉。',
  },
  {
    id: 'kakiage',
    label: 'かき揚げ',
    jaLabel: '混ぜ揚げ',
    lowC: 170,
    highC: 180,
    note: '料厚、含油多，中温透心再升温上色，中央留孔给蒸汽走。',
  },
  {
    id: 'fruitVeg',
    label: '水分多的果菜',
    jaLabel: '茄子・ピーマン',
    lowC: 170,
    highC: 180,
    note: '切开的面大量出水，温度低了容易吸油，高了外焦里生。',
  },
  {
    id: 'leafVeg',
    label: '叶物与香草',
    jaLabel: '春菊・大葉',
    lowC: 170,
    highC: 175,
    note: '薄得几乎一碰就熟，高温几十秒，保住绿色和香气。',
  },
  {
    id: 'rootVeg',
    label: '根菜与薯类',
    jaLabel: '蓮根・さつまいも',
    lowC: 160,
    highC: 170,
    note: '含水多、密度高，用偏低温度慢慢把水逼出来。',
  },
];

/** 卡 1 横轴的范围与刻度步长，单位摄氏度。 */
export const OIL_TEMP_AXIS = {
  minC: 150,
  maxC: 190,
  tickC: 10,
} as const;

/* ══════════════════════════════════════════════════════════════
   卡 2 · 水出油进（F2 Hairline Line）
   ══════════════════════════════════════════════════════════════ */

export interface FryingPoint {
  id: string;
  /** 下锅后的秒数，横轴实际比例尺 */
  seconds: number;
  /** 衣的含水率，% 衣重 */
  moisturePct: number;
  /** 衣的脂质率，% 衣重 */
  lipidPct: number;
  /** 横轴刻度文案 */
  tick: string;
  /** 图上直接标读数的时间点（1 分与 3 分），数字标签必须错开 */
  callout?: boolean;
}

/**
 * 180℃ 油温下衣的含水率与脂质率随炸制时间的变化。
 * 首尾两点有成分表出处，中段是示意插值：水分单调下降，脂质单调上升。
 * 曲线取到 3 分钟为止（常见出锅点），2 分钟同样是示意插值，不对应成分表条目。
 */
export const FRYING_CURVE: readonly FryingPoint[] = [
  { id: 't0', seconds: 0, moisturePct: 65.5, lipidPct: 0.5, tick: '0 秒' },
  { id: 't10', seconds: 10, moisturePct: 57, lipidPct: 7, tick: '10 秒' },
  { id: 't60', seconds: 60, moisturePct: 33, lipidPct: 20, tick: '1 分', callout: true },
  { id: 't120', seconds: 120, moisturePct: 21.6, lipidPct: 33.9, tick: '2 分' },
  { id: 't180', seconds: 180, moisturePct: 10.2, lipidPct: 47.7, tick: '3 分', callout: true },
];

/** 卡 2 纵轴固定 0 到 80%，两条线共用同一把尺，避免双轴骗人。 */
export const FRYING_AXIS = {
  maxPct: 80,
  tickPct: 20,
  maxSeconds: 180,
} as const;

/* ══════════════════════════════════════════════════════════════
   卡 3 · 食材旬期矩阵（L4 Arc Matrix，通栏）
   ══════════════════════════════════════════════════════════════ */

export type SeasonId =
  | 'shungiku'
  | 'fukinoto'
  | 'takenoko'
  | 'kisu'
  | 'hamo'
  | 'maitake'
  | 'renkon'
  | 'satsumaimo';

export interface SeasonEntry {
  id: SeasonId;
  /** 中文名，矩阵左侧直接显示 */
  label: string;
  /** 日文名，小字 */
  jaLabel: string;
  /** 十二个月的旬期强度，1 分是淡季、5 分是巅峰旬，1 月排在前 */
  scores: readonly number[];
  /** 一句话旬期说明 */
  note: string;
}

/** 八种食材的旬期评分，1 到 5 分，数组下标 0 是 1 月。 */
export const SEASON_MATRIX: readonly SeasonEntry[] = [
  {
    id: 'shungiku',
    label: '春菊',
    jaLabel: '春菊',
    scores: [5, 4, 2, 1, 1, 1, 1, 1, 2, 2, 4, 5],
    note: '深秋到早春，霜打过的叶子最香。',
  },
  {
    id: 'fukinoto',
    label: '蕗之薹',
    jaLabel: 'ふきのとう',
    scores: [1, 5, 5, 3, 1, 1, 1, 1, 1, 1, 1, 1],
    note: '雪化之后最先冒头，二三月带一点苦。',
  },
  {
    id: 'takenoko',
    label: '竹笋',
    jaLabel: 'たけのこ',
    scores: [1, 1, 3, 5, 3, 1, 1, 1, 1, 1, 1, 1],
    note: '四月刚出土的嫩尖，过了五月就老。',
  },
  {
    id: 'kisu',
    label: '鱚',
    jaLabel: 'きす',
    scores: [1, 1, 2, 4, 5, 4, 2, 1, 1, 1, 1, 1],
    note: '春到初夏最肥，天妇罗里最清甜的一尾。',
  },
  {
    id: 'hamo',
    label: '鱧',
    jaLabel: '鱧',
    scores: [1, 1, 1, 1, 2, 4, 5, 5, 3, 2, 1, 1],
    note: '只在夏天上场，祇园祭前后最肥。',
  },
  {
    id: 'maitake',
    label: '舞茸',
    jaLabel: '舞茸',
    scores: [1, 1, 1, 1, 1, 1, 1, 2, 4, 5, 4, 2],
    note: '秋雨之后一茬接一茬，香气封在薄衣里。',
  },
  {
    id: 'renkon',
    label: '莲藕',
    jaLabel: '蓮根',
    scores: [4, 4, 3, 2, 1, 1, 1, 1, 2, 4, 5, 5],
    note: '秋末挖到冬天，脆与粉在同一个季节交界。',
  },
  {
    id: 'satsumaimo',
    label: '番薯',
    jaLabel: 'さつまいも',
    scores: [2, 2, 2, 1, 1, 1, 1, 1, 4, 5, 4, 3],
    note: '秋天挖出来，存到冬天糖化得最甜。',
  },
];

/** 旬期状态词，供读数条使用。 */
export type SeasonState = '巅峰旬' | '正当时' | '淡季';

export function seasonState(score: number): SeasonState {
  if (score >= 5) return '巅峰旬';
  if (score >= 3) return '正当时';
  return '淡季';
}

/* ══════════════════════════════════════════════════════════════
   卡 4 · 脂质对比（F1 Rung Bars，横向）
   ══════════════════════════════════════════════════════════════ */

export type LipidGroup = 'tempura' | 'reference';

export interface LipidEntry {
  id: string;
  /** 中文名，横轨左侧直接显示 */
  label: string;
  /** 日本食品标准成分表里的食品名 */
  jaLabel: string;
  /** 每 100 克可食部的脂质克数 */
  value: number;
  /** 食品成分表编号，读数条里显示，方便查原表 */
  foodCode: string;
  /** 天妇罗还是参照料理，颜色按这一维分组 */
  group: LipidGroup;
  /** 成分表里的食品名与调理方式口径 */
  note: string;
}

/** 脂质从低到高排列，横轨长度与克数严格成正比。 */
export const LIPID_BARS: readonly LipidEntry[] = [
  {
    id: 'satsumaimo-tempura',
    label: '番薯天妇罗',
    jaLabel: 'さつまいも天ぷら',
    value: 6.8,
    foodCode: '02047',
    group: 'tempura',
    note: 'さつまいも 塊根 皮つき 天ぷら 生。',
  },
  {
    id: 'ebi-tempura',
    label: '虾天妇罗',
    jaLabel: 'えび天ぷら',
    value: 10.3,
    foodCode: '10416',
    group: 'tempura',
    note: 'バナメイえび 養殖 天ぷら 生。',
  },
  {
    id: 'fried-potato',
    label: '炸薯条',
    jaLabel: 'フライドポテト',
    value: 10.6,
    foodCode: '02020',
    group: 'reference',
    note: '市販冷凍のフライドポテトを揚げたもの。',
  },
  {
    id: 'ika-tempura',
    label: '鱿鱼天妇罗',
    jaLabel: 'するめいか天ぷら',
    value: 10.8,
    foodCode: '10419',
    group: 'tempura',
    note: 'するめいか 胴 皮なし 天ぷら 生。',
  },
  {
    id: 'nasu-tempura',
    label: '茄子天妇罗',
    jaLabel: 'なす天ぷら',
    value: 14.0,
    foodCode: '06343',
    group: 'tempura',
    note: 'なす 果実 天ぷら 生。',
  },
  {
    id: 'kisu-tempura',
    label: '鱚天妇罗',
    jaLabel: 'きす天ぷら',
    value: 15.2,
    foodCode: '10400',
    group: 'tempura',
    note: 'きす 天ぷら 生。',
  },
  {
    id: 'karaage',
    label: '唐扬',
    jaLabel: 'からあげ',
    value: 18.1,
    foodCode: '11289',
    group: 'reference',
    note: 'にわとり 若どり もも 皮つき から揚げ。',
  },
  {
    id: 'tonkatsu',
    label: '炸猪排',
    jaLabel: 'とんかつ',
    value: 35.9,
    foodCode: '11276',
    group: 'reference',
    note: 'ぶた 大型種肉 ロース 脂身つき とんかつ。',
  },
];

/** 卡 4 横轴的刻度上限，取整方便读数，柱长仍从 0 起算。 */
export const LIPID_AXIS = {
  maxG: 40,
  tickG: 10,
} as const;
