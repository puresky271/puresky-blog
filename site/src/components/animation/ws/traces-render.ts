/**
 * 七个「模型推理记录」卡片的渲染与交互。
 *
 * 原站 traces.js 直接拼 HTML 字符串，再给新节点挂事件。这里照搬这个结构：拼好整段 HTML 交给
 * 容器，然后由 hydrateCard() 一次性接上交互（标签页、两处展开、步骤渐隐、内联 SVG、画布小游戏、
 * 公式）。这样和原站的行为能逐条对上，也不会和 Svelte 的响应式更新抢同一片 DOM。
 *
 * 数据全部来自 public/data/weight-space/traces/*.json，是原站的原始记录，文本保持英文。
 * 只有按钮、标签这类界面文案写成中文。
 */

import {
  assetUrl,
  askFrom,
  asDrawing,
  coreOf,
  esc,
  formatNumber,
  inline,
  markdownTable,
  pixelSvg,
  preBlock,
  promptText,
  weightLine,
} from './data';

/* ---------- 数据结构 ---------- */

interface WeightLine {
  row?: number;
  label: string;
  values: string[];
  marks: number[];
}

type PromptBlock = string | number | WeightLine;

interface BriefKey {
  key: string;
  read?: boolean;
}

interface BriefPre {
  pre: string;
  title?: string;
}

interface BriefFinal {
  final: string;
  label?: string;
}

interface BriefConfidence {
  confidence: string;
}

type BriefPiece = BriefKey | BriefPre | BriefFinal | BriefConfidence;

export interface TraceChat {
  user: string;
  guess: string;
  replies: { model: string; says: string; follows?: boolean }[];
}

export interface PlayData {
  channels: string[];
  frames: string[];
  rewards: Record<string, number>;
  score?: number;
  length?: number;
  episodes?: number;
  seed?: number;
}

export interface TraceItem {
  label: string;
  group?: string;
  correct: boolean;
  verdict?: string;
  result?: string;
  prompt: PromptBlock[];
  question: string;
  ask?: string;
  rule?: string;
  given?: string;
  weights?: number | null;
  nets?: number;
  brief: BriefPiece[];
  answer: string;
  tokens?: number;
  thinking_tokens?: number;
  runs?: number;
  effort?: string;
  thinking: string[];
  gif?: string;
  samples?: number[][][];
  play?: PlayData;
  media?: string;
  mkey?: { color: string; text: string; alpha?: number }[];
  truth?: string;
  chat?: TraceChat;
}

export interface TraceData {
  source?: string;
  anim?: string;
  what?: string | null;
  fold?: boolean;
  items: TraceItem[];
}

/* ---------- 界面文案 ---------- */

const P_MORE = '查看完整提示词 ▸';
const P_LESS = '收起提示词 ▴';
const R_MORE = '读完整推理 ▸';
const R_LESS = '收起完整推理 ▴';


/* ---------- HTML 实体 ---------- */

let decodeNode: HTMLTextAreaElement | null = null;

/**
 * 数据里有 `&rsquo;` 这类 HTML 实体，原站是把字符串直接塞进 innerHTML、由浏览器解码的。
 * 现在整段 HTML 也是 innerHTML 插入，但只要中间经过了 esc()，实体就会被转义成字面量，
 * 所以先在文本层面解一次实体，再由调用方决定要不要 esc。
 */
export function decode(value: string): string {
  if (!value.includes('&')) return value;
  if (!decodeNode) decodeNode = document.createElement('textarea');
  decodeNode.innerHTML = value;
  return decodeNode.value;
}

/* ---------- 公式 ---------- */


/** 先把公式挖成占位元素，等节点进 DOM 之后再让 KaTeX 渲染，避免整块 bundle 提前加载。 */
function texPlaceholder(tex: string, display: boolean): string {
  const attr = esc(tex).replace(/"/g, '&quot;');
  return `<span class="tp-tex" data-tex="${attr}" data-display="${display ? '1' : '0'}"></span>`;
}

/** 一段原文 → HTML，其中的 `\( … \)` 交给 KaTeX。 */
function inlineMath(text: string): string {
  if (!text.includes('\\(')) return inline(text);
  const out: string[] = [];
  let last = 0;
  const pattern = /\\\((.+?)\\\)/g;
  let match = pattern.exec(text);
  while (match) {
    out.push(inline(text.slice(last, match.index)));
    out.push(texPlaceholder(match[1], false));
    last = match.index + match[0].length;
    match = pattern.exec(text);
  }
  out.push(inline(text.slice(last)));
  return out.join('');
}

interface KatexLike {
  render: (
    tex: string,
    element: HTMLElement,
    options?: { displayMode?: boolean; throwOnError?: boolean; strict?: boolean | string },
  ) => void;
}

let katexPromise: Promise<KatexLike> | null = null;

/** KaTeX 只有这篇文章会用到，按需下载；下载失败就退回原始 TeX，不影响卡片其他部分。 */
function loadKatex(): Promise<KatexLike> {
  if (!katexPromise) {
    katexPromise = import('katex').then((mod) => (mod.default ?? mod) as unknown as KatexLike);
  }
  return katexPromise;
}

/**
 * KaTeX 会把 `\texttt{ln1_w}` 里的下划线当成公式下标而报错，MathJax 不会。
 * 数据里只有一个这样的式子，渲染前把 texttt 内部的下划线转义掉，其他 TeX 原样传。
 */
function normalizeTex(tex: string): string {
  return tex.replace(/\\texttt\{([^}]*)\}/g, (_whole, body: string) => `\\texttt{${body.replace(/(?<!\\)_/g, '\\_')}}`);
}

function hydrateMath(root: HTMLElement): void {
  const nodes = [...root.querySelectorAll<HTMLElement>('.tp-tex[data-tex]')];
  if (nodes.length === 0) return;
  loadKatex()
    .then((katex) => {
      for (const node of nodes) {
        if (!node.isConnected) continue;
        const tex = node.dataset.tex ?? '';
        if (!tex) continue;
        try {
          katex.render(normalizeTex(tex), node, {
            displayMode: node.dataset.display === '1',
            throwOnError: false,
            strict: false,
          });
          node.classList.add('is-typeset');
        } catch {
          node.textContent = tex;
        }
      }
    })
    .catch(() => {
      for (const node of nodes) {
        if (node.isConnected) node.textContent = node.dataset.tex ?? '';
      }
    });
}

/* ---------- 一段回答的 markdown ---------- */

const ANSWER_LINE = /^(?:#+\s*)?(?:\*\*)?(Game|Images|Answer|Ranking)\b(?:\*\*)?\s*(?::(?:\*\*)?\s*(.*))?$/;
const HEAD_LINE = /^#+\s*(.*)$/;
const LABEL_LINE = /^(?:\*\*)?([A-Z][A-Za-z ]{2,30}):(?:\*\*)?$/;

/** 整段回答：标题、段落、列表、表格、代码块、行间公式，最终答案加底色。 */
export function replyHtml(md: string): string {
  const out: string[] = [];
  let list = false;
  let fence: string[] | null = null;
  let rows: string[] | null = null;
  let math: string[] | null = null;
  let markNext = false;
  const closeList = (): void => {
    if (list) {
      out.push('</ul>');
      list = false;
    }
  };
  const closeTable = (): void => {
    if (rows) {
      out.push(markdownTable(rows));
      rows = null;
    }
  };
  for (const raw of md.split('\n')) {
    if (/^\s*```/.test(raw)) {
      if (fence === null) {
        closeList();
        closeTable();
        fence = [];
      } else {
        out.push(preBlock(fence));
        fence = null;
      }
      continue;
    }
    if (fence !== null) {
      fence.push(raw);
      continue;
    }
    const line = raw.trim();
    if (math !== null || line.startsWith('\\[')) {
      if (math === null) {
        closeList();
        closeTable();
        math = [];
      }
      math.push(line);
      if (line.endsWith('\\]')) {
        const tex = math.join('\n').replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '');
        out.push(`<div class="tp-math">${texPlaceholder(tex, true)}</div>`);
        math = null;
      }
      continue;
    }
    if (line.startsWith('|')) {
      closeList();
      (rows ??= []).push(line);
      continue;
    }
    closeTable();
    if (!line) {
      closeList();
      continue;
    }
    const answer = line.match(ANSWER_LINE);
    if (answer) {
      closeList();
      const rest = (answer[2] ?? '').trim();
      out.push(`<div class="tp-h">${esc(answer[1])}</div>${rest ? `<p><mark>${inlineMath(rest)}</mark></p>` : ''}`);
      markNext = !rest;
      continue;
    }
    const head = line.match(HEAD_LINE) ?? line.match(LABEL_LINE);
    if (head) {
      closeList();
      out.push(`<div class="tp-h">${inlineMath(head[1].replace(/:$/, ''))}</div>`);
      continue;
    }
    let html = inlineMath(line.replace(/^[-*]\s+/, ''));
    if (markNext) {
      html = `<mark>${html}</mark>`;
      markNext = false;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!list) {
        out.push('<ul>');
        list = true;
      }
      out.push(`<li>${html}</li>`);
    } else {
      closeList();
      out.push(`<p>${html}</p>`);
    }
  }
  closeList();
  closeTable();
  if (fence !== null) out.push(preBlock(fence));
  return out.join('');
}

/* ---------- 最终答案 / 关键句 ---------- */

interface Parts {
  answer: string | null;
  label: string | null;
  conf: string | null;
  beside: string;
  below: string;
  weights: string;
  steps: string;
}

/** 一句话关键句：开头的加粗小标题单独提出来，读到权重的整句加底色，引用的数字用等宽字体。 */
function stepHtml(piece: BriefKey): string {
  const head = piece.key.match(/^\*\*([^*]+?:)\*\*\s*(.*)$/);
  let html = inlineMath(head ? head[2] : piece.key);
  if (piece.read) {
    html = `<mark class="tp-read">${html.replace(/(^|[\s(,])([−-]?\d+\.\d+)/g, '$1<span class="tp-num">$2</span>')}</mark>`;
  }
  const slab = head ? `<span class="tp-slab">${inline(head[1])}</span> ` : '';
  return `<li${piece.read ? ' class="tp-reads"' : ''}>${slab}${html}</li>`;
}

/** 把 brief 拆成四块：答案带上的答案与置信度、推理盒里的步骤、旁边的画、下面的代码。 */
export function partsHtml(pieces: BriefPiece[]): Parts {
  const keys: BriefKey[] = [];
  const beside: string[] = [];
  const below: string[] = [];
  const folds: string[] = [];
  let final = false;
  let answer: string | null = null;
  let label: string | null = null;
  let conf: string | null = null;
  for (const piece of pieces) {
    if ('key' in piece) {
      keys.push(piece);
    } else if ('pre' in piece) {
      const lines = piece.pre.split('\n');
      const drawing = final ? asDrawing(piece.pre) : null;
      if (drawing) {
        beside.push(`${pixelSvg(drawing, 'var(--ws-green)', 'tp-drawn')}<div class="tp-cap">Astra’s drawing</div>`);
      } else if (piece.title && lines.length > 10) {
        folds.push(
          `<details class="tp-fold"><summary><b>${esc(piece.title)}</b> &middot; ${lines.length} 行</summary>${preBlock(lines)}</details>`,
        );
      } else if (lines.length > 10) {
        folds.push(
          `<details class="tp-fold"><summary><b>${esc(piece.title || '代码')}</b> &middot; ${lines.length} 行</summary>${preBlock(lines)}</details>`,
        );
      } else {
        (final ? beside : below).push(`${piece.title ? `<div class="tp-h">${esc(piece.title)}</div>` : ''}${preBlock(lines)}`);
      }
    }
    if ('final' in piece) {
      answer = coreOf(piece.final);
      label = piece.label ?? null;
      final = true;
    }
    if ('confidence' in piece) conf = piece.confidence;
  }
  return {
    answer,
    label,
    conf,
    beside: beside.join(''),
    below: below.join(''),
    weights: folds.join(''),
    steps: keys.length ? `<ol class="tp-steps">${keys.map(stepHtml).join('')}</ol>` : '',
  };
}

/* ---------- 完整提示词 ---------- */

function fullPromptHtml(blocks: PromptBlock[]): string {
  return blocks
    .map((block) => {
      if (typeof block === 'number') {
        return `<div class="tp-omit">[${formatNumber(block)} numbers left out]</div>`;
      }
      if (typeof block === 'string') {
        return `<div class="tp-text">${promptText(block.replace(/^\n+|\n+$/g, ''))}</div>`;
      }
      return `<div class="tp-wline"><div class="tp-wlabel">${esc(block.label)}</div><div class="tp-wvals">${weightLine(block.values, block.marks)}</div></div>`;
    })
    .join('');
}

/* ---------- 交换记录（实验 7） ---------- */

function chatHtml(chat: TraceChat, truth?: string): string {
  const guess = esc(chat.guess);
  const mark = (text: string): string => esc(text).replace(`answer is ${guess}`, `answer is <span class="tp-guess">${guess}</span>`);
  const replies = chat.replies
    .map((reply) => `<div class="tp-msg"><span class="tp-who">模型 ${esc(reply.model)}</span>${reply.follows ? mark(reply.says) : esc(reply.says)}</div>`)
    .join('');
  const caption = truth ? `<div class="tp-mcap">${decode(truth)}</div>` : '';
  return `<div class="tp-chat"><div class="tp-convo"><div class="tp-msg tp-user"><span class="tp-who">用户</span>${mark(chat.user)}</div>${replies}</div>${caption}</div>`;
}

/* ---------- 附属文字 ---------- */

/** 附件行：这份提示词带的是什么。原站这里的说法由数据拼出来，保持英文。 */
function attachedText(data: TraceData, item: TraceItem): string {
  const nets = item.nets && item.nets > 1 ? ['A', 'B', 'C'].slice(0, item.nets) : null;
  if (nets) {
    const names = nets.slice(0, -1).join(', ');
    const last = nets[nets.length - 1];
    return `the weights of networks ${names} and ${last} (${formatNumber(item.weights ?? 0)} each) `;
  }
  const what = data.what || (item.gif ? 'policy' : 'model');
  return `the ${what}’s ${formatNumber(item.weights ?? 0)} weights`;
}

function tabsHtml(items: TraceItem[], index: number): string {
  if (items.length < 2) return '';
  const groups = [...new Set(items.map((item) => item.group || ''))];
  const rows = groups
    .map((group) => {
      const label = group && groups.length > 1 ? `<span class="tp-tabgroup">${esc(group)}</span>` : '';
      const tabs = items
        .map((item, k) => {
          if ((item.group || '') !== group) return '';
          return `<button type="button" role="tab" class="tp-tab" data-k="${k}" aria-selected="${k === index}">${esc(item.label)}</button>`;
        })
        .join('');
      return `<div class="tp-tabrow">${label}<span class="tp-tabset">${tabs}</span></div>`;
    })
    .join('');
  return `<div class="tp-tabs" role="tablist">${rows}</div>`;
}

/* ---------- 一张卡片 ---------- */

export function cardHtml(data: TraceData, item: TraceItem): string {
  const row = (item.prompt || []).find(
    (block): block is WeightLine => typeof block === 'object' && block !== null && Array.isArray(block.values),
  );
  const question = item.ask ? { text: item.ask, rule: item.rule || '' } : askFrom(item.question);
  const parts = partsHtml(item.brief);

  const verdict = item.result
    ? `<span class="tp-result">${decode(item.result)}</span>`
    : `<span class="tp-verdict ${item.correct ? '' : 'wrong'}">${item.correct ? '✓' : '✗'} ${esc(decode(item.verdict || (item.correct ? '正确' : '错误')))}</span>`;
  const conf = parts.conf ? `置信度 ${esc(parts.conf)} &middot; ` : '';
  const count = item.tokens != null && item.thinking_tokens != null
    ? ` &middot; ${formatNumber(item.tokens - item.thinking_tokens)} 个 token`
    : item.runs
      ? ` &middot; ${item.runs} 次运行`
      : '';

  const media = item.media
    ? `<div class="tp-media"><img class="tp-media-img" src="${assetUrl(item.media)}" alt="网络在关卡里的回放" data-inline-svg="1"><div class="tp-mside">${(item.mkey || [])
        .map(
          (key) =>
            `<div class="tp-mkey"><span class="tp-msw" style="background-color:${key.color};opacity:${key.alpha ?? 1}"></span>${esc(decode(key.text))}</div>`,
        )
        .join('')}${item.truth ? `<div class="tp-mcap">${decode(item.truth)}</div>` : ''}</div></div>`
    : '';

  const anim = item.gif
    ? `<div class="tp-side"><img class="tp-anim" src="${assetUrl(item.gif)}" alt="${esc(item.label)} 网络的游戏回放">${
      data.anim ? `<div class="tp-cap">${esc(data.anim)}</div>` : ''
    }</div>`
    : item.play
      ? `<div class="tp-side"><canvas class="tp-anim tp-play" aria-label="${esc(item.label)} 网络的回放"></canvas><div class="tp-cap">得分 <span class="tp-score">0</span></div></div>`
      : item.samples
        ? `<div class="tp-side"><div class="tp-samples">${item.samples.map((image) => pixelSvg(image, '#ffffff', 'tp-sample')).join('')}</div><div class="tp-cap">${esc(data.anim || '样本')}</div></div>`
        : '';

  const hasAnim = Boolean(item.gif || item.samples || item.play);

  return `<div class="tp-card${hasAnim ? ' has-anim' : ''}">
    ${media}
    ${item.chat ? chatHtml(item.chat, item.truth) : ''}
    ${anim}
    <div class="tp-main">
      ${item.truth && !item.media && !item.chat ? `<div class="tp-truth"><span class="tp-lab">正确答案</span> ${decode(item.truth)}</div>` : ''}
      <div class="tp-q tp-sec">
        <div class="tp-bubble">
          <div class="tp-file"><span class="tp-ficon" aria-hidden="true"></span><span class="tp-fname">${item.given ? decode(item.given) : esc(`${attachedText(data, item)} as text`)}</span>${
            row
              ? `<div class="tp-paste">${esc(row.label.split(':')[0])} &nbsp;${row.values.slice(0, 12).map((value) => esc(value)).join(' ')} &hellip;</div>`
              : ''
          }</div>
          <div class="tp-ask">${esc(decode(question.text))}</div>
          ${question.rule ? `<div class="tp-rule">${esc(decode(question.rule))}</div>` : ''}
          <div class="tp-pbody"></div>
          <div class="tp-pbar"><button type="button" class="tp-link tp-pmore" aria-expanded="false">${P_MORE}</button></div>
        </div>
      </div>
      <div class="tp-a tp-sec">
        <div class="tp-ahead"><span class="tp-chip tp-chip-a">答案</span>${
          parts.answer
            ? `<span class="tp-ans">${parts.label ? `<span class="tp-alab">${esc(parts.label)}:</span> ` : ''}<mark>${inlineMath(parts.answer)}</mark></span>`
            : ''
        }<span class="tp-meta">${conf}${verdict}${count}</span></div>
        ${parts.weights}
      </div>
      <div class="tp-r tp-sec">
        <div class="tp-rbox">
          <div class="tp-rhead"><span class="tp-chip tp-chip-r">推理</span></div>
          <div class="tp-abody${parts.beside ? ' has-draw' : ''}">
            <div class="tp-rbody">${parts.steps}</div>
            ${parts.beside ? `<div class="tp-draw">${parts.beside}</div>` : ''}
          </div>
          ${parts.below}
          <button type="button" class="tp-link tp-rmore" aria-expanded="false">${R_MORE}</button>
        </div>
      </div>
    </div>
  </div>`;
}

/** 整块内容：标签页 + 当前这张卡片。 */
export function renderCard(data: TraceData, index: number): string {
  return tabsHtml(data.items, index) + cardHtml(data, data.items[index]);
}

/** 展开后先解释隐藏思考，再给整段回答。 */
function thinkingHtml(item: TraceItem): string {
  if (item.thinking_tokens == null) return '';
  const shown = item.thinking.slice(0, 12);
  const more = item.thinking.length - shown.length;
  const head =
    item.thinking.length > 1 ? `${item.thinking.length} 个标题` : '标题';
  const list = shown.length
    ? `API 只返回了它的 ${head}：${shown.map((entry) => esc(entry)).join(' / ')}${more > 0 ? ` / &hellip; 还有 ${more} 个` : ''}`
    : 'API 没有返回其中任何内容';
  return `<div class="tp-thinking">[在写出这段回答之前，Astra 思考了 ${formatNumber(item.thinking_tokens)} 个 token。这段思考是隐藏的。${list}]</div>`;
}

/* ---------- 内联 SVG ---------- */

const svgCache = new Map<string, Promise<string>>();

/** `<img>` 里的 SVG 用不了页面字体，SMIL 动画也不会动，所以取回文本插进页面（原站同款做法）。 */
function inlineSvg(img: HTMLImageElement | null): () => void {
  if (!img) return () => {};
  const src = img.getAttribute('src');
  if (!src) return () => {};
  let pending = svgCache.get(src);
  if (!pending) {
    pending = fetch(src).then((response) => {
      if (!response.ok) throw new Error(`${src}: ${response.status}`);
      return response.text();
    });
    svgCache.set(src, pending);
  }
  let cancelled = false;
  pending
    .then((text) => {
      if (cancelled || !img.isConnected) return;
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.documentElement;
      if (svg.localName !== 'svg' || svg.querySelector('parsererror')) return;
      svg.setAttribute('aria-label', img.alt);
      img.replaceWith(document.importNode(svg, true));
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
}

/* ---------- 画布小游戏（实验 5） ---------- */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const DEC: Record<string, number> = Object.fromEntries([...B64].map((character, k) => [character, k]));
/** 一个格子里有多个通道时，按这个顺序取第一个决定颜色（trail 画小一点）。 */
const ORDER = ['player', 'projectile', 'danger', 'reward', 'gauge', 'trail'];
const COL: Record<string, string> = {
  player: '#4c8dff',
  projectile: '#f4f6ff',
  danger: '#ff5468',
  reward: '#ffc23d',
  gauge: '#36d399',
  trail: '#8d9cbf',
};
const FPS = 15;

/** 按 handplay.js 逐帧画：10×10 的格子，一个通道一种颜色，末尾停两秒再重播。 */
function mountPlay(canvas: HTMLCanvasElement, play: PlayData, score: HTMLElement | null): () => void {
  const total = play.frames.length;
  const grid = new Uint8Array(total * 100);
  const current = new Uint8Array(100);
  const cumulative = new Float64Array(total);
  play.frames.forEach((frame, t) => {
    for (let k = 0; k < frame.length; k += 3) {
      current[DEC[frame[k]] * 64 + DEC[frame[k + 1]]] = DEC[frame[k + 2]];
    }
    grid.set(current, t * 100);
    if (t) cumulative[t] = cumulative[t - 1] + (play.rewards[String(t - 1)] ?? 0);
  });
  const bit: Record<string, number> = {};
  for (const name of ORDER) bit[name] = 1 << play.channels.indexOf(name);

  let t = 0;
  let timer: number | null = null;
  let visible = false;

  const draw = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const size = Math.round((canvas.clientWidth || 108) * dpr);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const cell = size / 10;
    const base = t * 100;
    context.fillStyle = '#0b1020';
    context.fillRect(0, 0, size, size);
    for (let square = 0; square < 100; square++) {
      const mask = grid[base + square];
      if (!mask) continue;
      const name = ORDER.find((entry) => mask & bit[entry]) ?? 'trail';
      const pad = name === 'trail' ? cell * 0.3 : cell * 0.08;
      context.globalAlpha = name === 'trail' ? 0.55 : 1;
      context.fillStyle = COL[name];
      context.fillRect((square % 10) * cell + pad, Math.floor(square / 10) * cell + pad, cell - 2 * pad, cell - 2 * pad);
    }
    context.globalAlpha = 1;
    if (score) score.textContent = formatNumber(Math.round(cumulative[t]));
  };

  const tick = (): void => {
    timer = null;
    if (!visible || !canvas.isConnected) return;
    t = t + 1 < total ? t + 1 : 0;
    draw();
    timer = window.setTimeout(tick, t === total - 1 ? 2000 : 1000 / FPS);
  };

  draw();
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible && timer === null) timer = window.setTimeout(tick, 1000 / FPS);
    },
    { threshold: 0.2 },
  );
  observer.observe(canvas);

  return () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    observer.disconnect();
  };
}

/* ---------- 接上交互 ---------- */

/** 给一块刚插进 DOM 的卡片挂事件，返回清理函数。 */
export function hydrateCard(host: HTMLElement, data: TraceData, index: number, onSelect: (index: number) => void): () => void {
  const item = data.items[index];
  const parts = partsHtml(item.brief);
  const cleanups: (() => void)[] = [];

  const promptBody = host.querySelector<HTMLElement>('.tp-pbody');
  const promptButton = host.querySelector<HTMLButtonElement>('.tp-pmore');
  const reasonBody = host.querySelector<HTMLElement>('.tp-rbody');
  const reasonButton = host.querySelector<HTMLButtonElement>('.tp-rmore');

  const updateFade = (): void => {
    const steps = host.querySelector<HTMLElement>('.tp-rbody:not(.open) .tp-steps');
    if (!steps || !steps.offsetParent) return;
    if (steps.scrollHeight - steps.clientHeight < 14) steps.classList.add('fits');
    steps.classList.toggle('more', steps.scrollTop + steps.clientHeight < steps.scrollHeight - 2);
  };

  const togglePrompt = (): void => {
    if (!promptBody || !promptButton) return;
    const open = !promptBody.classList.contains('open');
    promptBody.classList.toggle('open', open);
    promptBody.innerHTML = open ? fullPromptHtml(item.prompt || []) : '';
    promptButton.textContent = open ? P_LESS : P_MORE;
    promptButton.setAttribute('aria-expanded', String(open));
    hydrateMath(promptBody);
  };

  const toggleReason = (): void => {
    if (!reasonBody || !reasonButton) return;
    const open = !reasonBody.classList.contains('open');
    reasonBody.classList.toggle('open', open);
    reasonBody.innerHTML = open ? `${thinkingHtml(item)}<div class="tp-reply">${replyHtml(item.answer)}</div>` : parts.steps;
    reasonButton.textContent = open ? R_LESS : R_MORE;
    reasonButton.setAttribute('aria-expanded', String(open));
    hydrateMath(reasonBody);
    updateFade();
  };

  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const tab = target.closest<HTMLElement>('.tp-tab');
    if (tab) {
      const next = Number(tab.dataset.k);
      if (!Number.isNaN(next)) onSelect(next);
      return;
    }
    if (target.closest('.tp-pmore')) {
      togglePrompt();
      return;
    }
    if (target.closest('.tp-rmore')) toggleReason();
  };

  const onKey = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target !== host && !target?.classList.contains('tp-tab')) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + data.items.length) % data.items.length;
    onSelect(next);
    queueMicrotask(() => host.querySelector<HTMLElement>(`.tp-tab[data-k="${next}"]`)?.focus());
  };

  host.addEventListener('click', onClick);
  host.addEventListener('keydown', onKey);
  cleanups.push(() => {
    host.removeEventListener('click', onClick);
    host.removeEventListener('keydown', onKey);
  });

  if (reasonBody) {
    reasonBody.addEventListener('scroll', updateFade, true);
    cleanups.push(() => reasonBody.removeEventListener('scroll', updateFade, true));
    requestAnimationFrame(updateFade);
  }

  cleanups.push(inlineSvg(host.querySelector<HTMLImageElement>('.tp-media-img[data-inline-svg]')));

  const canvas = host.querySelector<HTMLCanvasElement>('.tp-play');
  if (canvas && item.play) {
    cleanups.push(mountPlay(canvas, item.play, host.querySelector<HTMLElement>('.tp-score')));
  }

  hydrateMath(host);

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
