/**
 * leaderboard.ts — 模型榜单的数据契约与展示辅助。
 *
 * 页面在构建期读这份数据，编辑器在浏览器里编辑同一份数据，
 * 所以这里不能碰 astro:content、node:fs 之类的构建期模块，也不能引 zod 之外的重东西。
 * 校验用下面手写的 parseLeaderboard，报错写清楚是哪一条模型的哪个字段。
 *
 * 数据文件：src/data/leaderboard.json（结构见 LeaderboardFile）。
 * 价格、上下文长度、发布日期不在文件里，由 lib/models.ts 在构建期从 OpenRouter 合并进来。
 */

import { TAG_NAMES, type TagName } from '@/config';

/** 数据文件相对 site 根目录的路径。编辑器和构建期都用它。 */
export const LEADERBOARD_FILE = 'src/data/leaderboard.json';

/** 五档，顺序就是页面从上到下的顺序：夯 → 拉完了。id 只增不改。 */
export const TIERS = [
  { id: 'hang', name: '夯', blurb: '闭眼冲。当下最顺手的一档，新模型出来也先拿它当基准。' },
  { id: 'elite', name: '人上人', blurb: '很强，有明显长处，但没有到无脑选的地步。' },
  { id: 'mid', name: '中规中矩', blurb: '够用，不出错，也不惊喜。' },
  { id: 'npc', name: 'NPC', blurb: '能用，但跟谁都差不多，下次想不起来打开它。' },
  { id: 'trash', name: '拉完了', blurb: '别用。贵、慢，或者答得离谱。' },
] as const;

export type TierId = (typeof TIERS)[number]['id'];
export const TIER_IDS = TIERS.map((tier) => tier.id) as [TierId, ...TierId[]];

/** 分项评分。键只进数据文件，标签给抽屉里的评分条用。 */
export const SCORE_KEYS = ['coding', 'writing', 'reasoning', 'multimodal', 'value'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export const SCORE_LABELS: Record<ScoreKey, string> = {
  coding: '编程',
  writing: '写作',
  reasoning: '推理',
  multimodal: '多模态',
  value: '性价比',
};

export type ModelStatus = 'active' | 'retired';

/** 榜单里的一条模型。id 用 OpenRouter 的 model id，同时当深链锚点和价格匹配的键。 */
export interface LeaderboardModel {
  id: string;
  name: string;
  vendor: string;
  tier: TierId;
  /** 档内顺序，小的在前。拖拽换位置时重排这一列。 */
  order: number;
  /** 自备图标的路径，例如 /models/icons/gpt-6.1-terra.svg。留空用厂商色加首字母占位。 */
  icon?: string;
  tags: TagName[];
  subscores: Partial<Record<ScoreKey, number>>;
  /** 一句话结论，卡片和抽屉头部用。 */
  blurb: string;
  /** 点评正文，纯文本，空行分段。抽屉正文区渲染。 */
  review: string;
  /** 适合谁、不适合谁。 */
  useCase?: string;
  link?: string;
  /** 发布日期，OpenRouter 抓不到时手填，格式 YYYY-MM-DD。 */
  releasedAt?: string;
  /** 入榜日期，格式 YYYY-MM-DD。 */
  addedAt: string;
  status: ModelStatus;
  retiredAt?: string;
}

export interface LeaderboardFile {
  /** 最后一次人工修改的日期，YYYY-MM-DD。 */
  updatedAt: string;
  models: LeaderboardModel[];
}

/** OpenRouter 抓来的一条模型信息，只留页面用得到的。 */
export interface CatalogEntry {
  id: string;
  name: string;
  vendor: string;
  /** 上下文长度，token。 */
  contextLength?: number;
  /** 首次出现的日期，YYYY-MM-DD。 */
  created?: string;
  /** 输入价，美元 / 百万 token。 */
  priceIn?: number;
  /** 输出价，美元 / 百万 token。 */
  priceOut?: number;
}

export type Catalog = Record<string, CatalogEntry>;
export interface CatalogSnapshot {
  fetchedAt: string;
  models: Catalog;
}

/** 合并抓取信息之后的一行，页面和编辑器预览都渲染这个。 */
export interface RankedModel extends LeaderboardModel {
  catalog: CatalogEntry | null;
  /** 已格式化的价格文案：$3、$0.25、免费、—。 */
  priceInLabel: string;
  priceOutLabel: string;
  /** 1M、128K，抓不到时是 —。 */
  contextLabel: string;
  /** 发布日期，YYYY-MM-DD。 */
  releasedLabel: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function needString(value: unknown, where: string, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`[leaderboard] ${where} 的 ${field} 必须是非空字符串`);
  return value.trim();
}

function optionalString(value: unknown, where: string, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`[leaderboard] ${where} 的 ${field} 必须是字符串`);
  return value.trim() || undefined;
}

function needDate(value: unknown, where: string, field: string): string {
  const text = needString(value, where, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`[leaderboard] ${where} 的 ${field} 要写成 YYYY-MM-DD`);
  return text;
}

/**
 * 校验并归一化 leaderboard.json。
 * 校验失败直接抛错：构建期抛错就是构建失败，编辑器保存前也会先跑一遍。
 */
export function parseLeaderboard(raw: unknown): LeaderboardFile {
  if (!isRecord(raw)) throw new Error('[leaderboard] 顶层必须是一个对象');
  const updatedAt = needDate(raw.updatedAt, '文件', 'updatedAt');
  if (!Array.isArray(raw.models)) throw new Error('[leaderboard] models 必须是数组');

  const knownTags = new Set<string>(TAG_NAMES);
  const seen = new Set<string>();
  const models = raw.models.map((item, index): LeaderboardModel => {
    const where = `第 ${index + 1} 条模型`;
    if (!isRecord(item)) throw new Error(`[leaderboard] ${where} 必须是对象`);
    const id = needString(item.id, where, 'id');
    if (seen.has(id)) throw new Error(`[leaderboard] ${where} 的 id 重复：${id}`);
    seen.add(id);
    if (/\s/.test(id)) throw new Error(`[leaderboard] ${where} 的 id 不能带空格`);

    const tier = needString(item.tier, where, 'tier');
    if (!(TIER_IDS as readonly string[]).includes(tier)) {
      throw new Error(`[leaderboard] ${where} 的 tier 只能是 ${TIER_IDS.join(' / ')}，现在写的是 ${tier}`);
    }

    if (!Array.isArray(item.tags)) throw new Error(`[leaderboard] ${where} 的 tags 必须是数组`);
    const tags = item.tags.map((tag) => {
      if (typeof tag !== 'string' || !knownTags.has(tag)) {
        throw new Error(`[leaderboard] ${where} 的标签「${String(tag)}」不在 config.ts 的 TAGS 里`);
      }
      return tag as TagName;
    });

    const subscores: Partial<Record<ScoreKey, number>> = {};
    if (item.subscores !== undefined) {
      if (!isRecord(item.subscores)) throw new Error(`[leaderboard] ${where} 的 subscores 必须是对象`);
      for (const key of SCORE_KEYS) {
        const value = item.subscores[key];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
          throw new Error(`[leaderboard] ${where} 的 subscores.${key} 必须是 0 到 100 的数字`);
        }
        subscores[key] = Math.round(value);
      }
    }

    const status = optionalString(item.status, where, 'status') ?? 'active';
    if (status !== 'active' && status !== 'retired') throw new Error(`[leaderboard] ${where} 的 status 只能是 active / retired`);

    const order = item.order;
    if (typeof order !== 'number' || !Number.isFinite(order)) throw new Error(`[leaderboard] ${where} 的 order 必须是数字`);

    return {
      id,
      name: needString(item.name, where, 'name'),
      vendor: needString(item.vendor, where, 'vendor'),
      tier: tier as TierId,
      order,
      icon: optionalString(item.icon, where, 'icon'),
      tags,
      subscores,
      blurb: needString(item.blurb, where, 'blurb'),
      review: needString(item.review, where, 'review'),
      useCase: optionalString(item.useCase, where, 'useCase'),
      link: optionalString(item.link, where, 'link'),
      releasedAt: item.releasedAt === undefined ? undefined : needDate(item.releasedAt, where, 'releasedAt'),
      addedAt: needDate(item.addedAt, where, 'addedAt'),
      status,
      retiredAt: item.retiredAt === undefined ? undefined : needDate(item.retiredAt, where, 'retiredAt'),
    };
  });

  return { updatedAt, models };
}

/** 新建一条空模型的默认值。编辑器「加入榜单」时用。 */
export function emptyModel(id: string, name: string, vendor: string, tier: TierId, order: number): LeaderboardModel {
  return {
    id,
    name,
    vendor,
    tier,
    order,
    tags: [],
    subscores: {},
    blurb: '',
    review: '',
    addedAt: todayISO(),
    status: 'active',
  };
}

/** 今天，按本机时区算成 YYYY-MM-DD。 */
export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 价格文案。抓取价是每 token 的字符串，模型里已经换算成美元 / 百万 token。
 * 0 显示「免费」，抓不到显示「—」。
 */
export function formatPrice(price?: number | null): string {
  if (price === undefined || price === null || !Number.isFinite(price) || price < 0) return '—';
  if (price === 0) return '免费';
  const decimals = price >= 1 ? 2 : price >= 0.01 ? 3 : 4;
  const text = price.toFixed(decimals).replace(/\.?0+$/, '');
  return `$${text}`;
}

/** 上下文长度：1048576 → 1M，128000 → 128K。 */
export function formatContext(tokens?: number | null): string {
  if (tokens === undefined || tokens === null || !Number.isFinite(tokens) || tokens <= 0) return '—';
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M`;
  return `${Math.round(tokens / 1000)}K`;
}

/** 档位名。查不到时原样返回，方便坏数据在页面上现形。 */
export function tierName(id: TierId): string {
  return TIERS.find((tier) => tier.id === id)?.name ?? id;
}

/** 档位颜色令牌名，组件里用 `var(--tier-hang)` 这种写法。 */
export function tierVar(id: TierId): string {
  return `var(--tier-${id})`;
}

/** 深链锚点：model id 里的 / 和 . 换成 -，能直接放进 location.hash。 */
export function anchorOf(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 厂商色相。认识的厂商给固定色相，不认识的按名字散列，保证同一个厂商颜色不变。 */
const VENDOR_HUES: Record<string, number> = {
  OpenAI: 158,
  Anthropic: 28,
  Google: 250,
  Meta: 215,
  DeepSeek: 245,
  MoonshotAI: 275,
  MiniMax: 10,
  NVIDIA: 95,
  Mistral: 40,
  Qwen: 195,
  'Z.ai': 300,
  StepFun: 220,
  inclusionAI: 320,
  Reflection: 260,
  'Particle AI': 175,
};

export function vendorHue(vendor: string): number {
  const fixed = VENDOR_HUES[vendor];
  if (fixed !== undefined) return fixed;
  let hash = 0;
  for (const char of vendor) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  return hash;
}

/** 厂商色渐变的两端，占位图标和卡片细描边用。 */
export function vendorColors(vendor: string): { from: string; to: string } {
  const hue = vendorHue(vendor);
  return {
    from: `oklch(0.68 0.15 ${hue})`,
    to: `oklch(0.52 0.16 ${(hue + 42) % 360})`,
  };
}

/** 把抓取信息合并进榜单条目。catalog 为空时价格显示 —，页面照常渲染。 */
export function resolveModel(model: LeaderboardModel, catalog: Catalog | null): RankedModel {
  const entry = catalog?.[model.id] ?? null;
  return {
    ...model,
    catalog: entry,
    priceInLabel: formatPrice(entry?.priceIn),
    priceOutLabel: formatPrice(entry?.priceOut),
    contextLabel: formatContext(entry?.contextLength),
    releasedLabel: model.releasedAt ?? entry?.created ?? '—',
  };
}

export function resolveModels(models: LeaderboardModel[], catalog: Catalog | null): RankedModel[] {
  return models.map((model) => resolveModel(model, catalog));
}

/** 按五档顺序把在榜模型分组，档内按 order 升序，order 相同按名字。 */
export function groupByTier(models: RankedModel[]): { tier: (typeof TIERS)[number]; items: RankedModel[] }[] {
  return TIERS.map((tier) => ({
    tier,
    items: models
      .filter((model) => model.status === 'active' && model.tier === tier.id)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN')),
  }));
}

/** 已下榜的模型，最近下榜的在前。 */
export function retiredModels(models: RankedModel[]): RankedModel[] {
  return models
    .filter((model) => model.status === 'retired')
    .sort((a, b) => (b.retiredAt ?? '').localeCompare(a.retiredAt ?? '') || a.name.localeCompare(b.name, 'zh-CN'));
}

/** 点评正文按空行分段，抽屉里逐段渲染。 */
export function reviewParagraphs(review: string): string[] {
  return review
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
