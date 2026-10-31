/**
 * models.ts — 构建期的 OpenRouter 模型目录快照。
 *
 * 榜单 json 里只有主观评价，价格、上下文长度、发布日期都从这份目录里按 model id 匹配。
 * 抓取失败不能拖垮构建：缓存里上一次的结果先用着，实在没有就返回 null，页面把价格显示成「—」。
 *
 * 缓存位置和 GitHub / 网易云快照一致（node_modules/.cache/puresky），
 * 开发模式下六小时内直接复用，免得每次热更新都打一遍 OpenRouter。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Catalog, CatalogEntry, CatalogSnapshot } from './leaderboard';

const CACHE_DIR = path.resolve('node_modules/.cache/puresky');
const CACHE_KEY = 'openrouter-models';
const DEV_TTL_MS = 6 * 60 * 60 * 1000;
const ENDPOINT = 'https://openrouter.ai/api/v1/models';

/** OpenRouter 的厂商前缀 → 展示名。没登记的按前缀首字母大写兜底。 */
const VENDOR_BY_PREFIX: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
  'meta-llama': 'Meta',
  deepseek: 'DeepSeek',
  moonshotai: 'MoonshotAI',
  minimax: 'MiniMax',
  nvidia: 'NVIDIA',
  mistralai: 'Mistral',
  qwen: 'Qwen',
  'z-ai': 'Z.ai',
  stepfun: 'StepFun',
  inclusionai: 'inclusionAI',
  reflection: 'Reflection',
  'particle-ai': 'Particle AI',
  xai: 'xAI',
  cohere: 'Cohere',
  amazon: 'Amazon',
  microsoft: 'Microsoft',
};

function vendorOf(id: string, name: string): string {
  const prefix = id.split('/')[0] ?? '';
  const known = VENDOR_BY_PREFIX[prefix];
  if (known) return known;
  // OpenRouter 的 name 一般写成「厂商: 模型名」，兜底就从里面取。
  const fromName = name.split(':')[0]?.trim();
  if (fromName && fromName !== name) return fromName;
  return prefix ? prefix[0].toUpperCase() + prefix.slice(1) : '未知';
}

/** OpenRouter 的价格是「每 token」的字符串，这里换算成「美元 / 百万 token」。 */
function perMillion(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(raw) || raw < 0) return undefined;
  return Math.round(raw * 1_000_000 * 1e6) / 1e6;
}

function toEntry(raw: unknown): CatalogEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id : '';
  if (!id) return null;
  const name = typeof item.name === 'string' && item.name ? item.name : id;
  const pricing = (item.pricing ?? {}) as Record<string, unknown>;
  const created = typeof item.created === 'number' && item.created > 0 ? new Date(item.created * 1000).toISOString().slice(0, 10) : undefined;
  const contextLength = typeof item.context_length === 'number' && item.context_length > 0 ? item.context_length : undefined;

  return {
    id,
    name,
    vendor: vendorOf(id, name),
    contextLength,
    created,
    priceIn: perMillion(pricing.prompt),
    priceOut: perMillion(pricing.completion),
  };
}

async function fetchCatalog(): Promise<Catalog> {
  const response = await fetch(ENDPOINT, {
    headers: { accept: 'application/json', 'user-agent': 'puresky-blog-build' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`OpenRouter 返回 ${response.status}`);
  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) throw new Error('OpenRouter 返回的 data 不是数组');

  const models: Catalog = {};
  for (const raw of payload.data) {
    const entry = toEntry(raw);
    if (entry) models[entry.id] = entry;
  }
  if (Object.keys(models).length === 0) throw new Error('OpenRouter 返回了空目录');
  return models;
}

async function cachedCatalog(): Promise<CatalogSnapshot | null> {
  const file = path.join(CACHE_DIR, `${CACHE_KEY}.json`);

  let previous: CatalogSnapshot | null = null;
  try {
    const raw = JSON.parse(await readFile(file, 'utf8')) as { at: number; value: CatalogSnapshot };
    if (import.meta.env.DEV && Date.now() - raw.at < DEV_TTL_MS) return raw.value;
    previous = raw.value;
  } catch {
    // 没有缓存或者缓存坏了，往下走正常抓取。
  }

  try {
    const models = await fetchCatalog();
    const value: CatalogSnapshot = { fetchedAt: new Date().toISOString(), models };
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, JSON.stringify({ at: Date.now(), value }));
    return value;
  } catch (error) {
    console.warn(`[models] OpenRouter 目录抓取失败${previous ? '，沿用上次的结果' : ''}：${(error as Error).message}`);
    return previous;
  }
}

let catalogPromise: Promise<CatalogSnapshot | null> | null = null;

/** 构建期的模型目录。同一进程里只抓一次。 */
export function getModelCatalog(): Promise<CatalogSnapshot | null> {
  catalogPromise ??= cachedCatalog();
  return catalogPromise;
}
