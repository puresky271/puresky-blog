/**
 * photo.ts — :::photo 容器的语法解析和光标上下文。
 *
 * 编辑器工具栏的「图片容器」按钮组和参数面板用这里：判断光标在不在某个 :::photo 里、
 * 读出当前的位置和宽度、生成开标记那一行。规则和 src/lib/markdown/remark-figure.mjs 对齐
 *（那边负责渲染，这边负责编辑）：
 *   位置是 left / right / wide / row，不写就是居中的普通图；
 *   宽度只对 left / right 生效，25% 到 60%，不写时 prose.css 里按 42% 处理；
 *   一个容器里放多张图时只能横排 row。
 *
 * 这个文件是纯函数，不碰 CodeMirror 也不认识 Svelte，方便单独看语法逻辑。
 */

export type PhotoLayout = '' | 'left' | 'right' | 'wide' | 'row';

/** 面板和提示里的中文名，和 remark-figure.mjs 的注释一致。 */
export const PHOTO_LABELS: Record<PhotoLayout, string> = {
  left: '左浮',
  right: '右浮',
  wide: '加宽',
  row: '横排',
  '': '普通',
};

/** 预设按钮的顺序：先浮动的两种，再整块的和普通图。 */
export const PHOTO_PRESETS: PhotoLayout[] = ['left', 'right', 'wide', 'row', ''];

export const PHOTO_WIDTH_MIN = 25;
export const PHOTO_WIDTH_MAX = 60;
/** 开标记没写宽度时 prose.css 的 --photo-w 默认值，面板回填用它。 */
export const PHOTO_WIDTH_DEFAULT = 42;
/** 没有选区时插入的骨架用的宽度。 */
export const PHOTO_SKELETON_WIDTH = 40;

/** 光标所在 :::photo 容器的现状，工具栏的参数面板据此回填。 */
export interface PhotoContext {
  /** 光标在某个 :::photo 容器里（包括开标记和闭合标记这两行）。 */
  inside: boolean;
  layout: PhotoLayout;
  /** 生效宽度：开标记写了就用写的，没写就是默认值 42。 */
  width: number;
  /** 开标记里明确写了宽度。 */
  widthSet: boolean;
  /** 容器里的图片张数，多张图只能用横排。 */
  images: number;
  /** 开标记在第几行（1 起），不在容器里是 0。 */
  line: number;
  /** 开标记那一行的原文。 */
  marker: string;
  /** 现有写法的问题，面板里直接显示。 */
  issues: string[];
}

export const NO_PHOTO: PhotoContext = {
  inside: false,
  layout: '',
  width: PHOTO_WIDTH_DEFAULT,
  widthSet: false,
  images: 0,
  line: 0,
  marker: '',
  issues: [],
};

export interface PhotoContainer {
  /** 开标记所在行，0 起。 */
  openLine: number;
  /** 闭合标记所在行，0 起；-1 表示写到文末都没闭合。 */
  closeLine: number;
  layout: PhotoLayout;
  /** 开标记里写的宽度，没写是 null。 */
  width: number | null;
  images: number;
  issues: string[];
  marker: string;
}

const OPEN = /^:::+\s*photo(?:\s+(.*))?$/i;
const CLOSE = /^:::+\s*$/;
const ANY_OPEN = /^:::+\s*([a-z][a-z0-9-]*)\b/i;
/** :::bi 里的 :::zh 是切换中英的分界行，不算嵌套容器，和 remark-paper 一致。 */
const ZH_SWITCH = /^:::+\s*zh\s*$/i;
/** 宽度和 remark-figure.mjs 一样只认两位数字加百分号。 */
const WIDTH = /^(\d{2})%$/;
/** Markdown 图片。行内图片才能这样数，多行的写法本来也不合法。 */
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;

/** 开标记的容器名（小写），不是开标记返回 null。 */
function openName(text: string): string | null {
  const match = ANY_OPEN.exec(text);
  return match ? match[1]!.toLowerCase() : null;
}

function stackPhoto(stack: { name: string; line: number }[]): number {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i]!.name === 'photo') return stack[i]!.line;
  }
  return -1;
}

/** 数一段文字里有几张 Markdown 图片。 */
export function countImages(text: string): number {
  return text.match(IMAGE)?.length ?? 0;
}

/** 宽度收进 25 到 60 的整数。 */
export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return PHOTO_WIDTH_DEFAULT;
  return Math.min(PHOTO_WIDTH_MAX, Math.max(PHOTO_WIDTH_MIN, Math.round(width)));
}

/** 生成开标记那一行；宽度只对 left / right 写，别的排法写了渲染时也会忽略。 */
export function photoMarker(layout: PhotoLayout, width?: number | null): string {
  const parts = [':::photo'];
  if (layout) parts.push(layout);
  if (width !== null && width !== undefined && (layout === 'left' || layout === 'right')) parts.push(`${clampWidth(width)}%`);
  return parts.join(' ');
}

/** 解析 `:::photo right 40%` 的参数。认不出的写法记进 issues，和 remark-figure 的警告一一对应。 */
function parseMarker(marker: string): { layout: PhotoLayout; width: number | null; issues: string[] } | null {
  const open = OPEN.exec(marker);
  if (!open) return null;
  let layout: PhotoLayout = '';
  let width: number | null = null;
  const issues: string[] = [];
  for (const token of (open[1] ?? '').trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase();
    if (lower === 'left' || lower === 'right' || lower === 'wide' || lower === 'row') {
      if (layout && layout !== lower) issues.push(`位置写了两个（${layout} 和 ${lower}），渲染时以 ${lower} 为准。`);
      layout = lower;
      continue;
    }
    const match = WIDTH.exec(lower);
    if (match) {
      const value = Number(match[1]);
      if (value >= PHOTO_WIDTH_MIN && value <= PHOTO_WIDTH_MAX) width = value;
      else issues.push(`宽度 ${token} 超出 ${PHOTO_WIDTH_MIN}% 到 ${PHOTO_WIDTH_MAX}%，渲染时按默认宽度处理。`);
      continue;
    }
    issues.push(`参数 ${token} 不认识，可用的是 left / right / wide / row 和 25% 到 60% 的宽度。`);
  }
  if (width !== null && layout !== 'left' && layout !== 'right') {
    issues.push(`宽度只对${PHOTO_LABELS.left}和${PHOTO_LABELS.right}生效，现在写了 ${width}%，渲染时会被忽略。`);
  }
  return { layout, width, issues };
}

/**
 * 找光标所在的 :::photo 容器。光标在开标记这一行时目标就是这个容器；
 * 在闭合标记或容器内容里时取最近一层没闭合的 :::photo。不在容器里返回 null。
 */
export function findPhotoContainer(doc: string, pos: number): PhotoContainer | null {
  const lines = doc.split('\n');
  let index = 0;
  let offset = 0;
  while (index < lines.length - 1 && pos > offset + lines[index]!.length) {
    offset += lines[index]!.length + 1;
    index += 1;
  }
  const current = (lines[index] ?? '').trim();

  // 先把光标之前的容器开合记到栈里，光标所在这一行按几种情况单独判断。
  const stack: { name: string; line: number }[] = [];
  for (let i = 0; i < index; i += 1) {
    const text = lines[i]!.trim();
    if (!text) continue;
    if (CLOSE.test(text)) {
      stack.pop();
      continue;
    }
    const name = openName(text);
    if (name && !ZH_SWITCH.test(text)) stack.push({ name, line: i });
  }

  let openLine = -1;
  if (current) {
    if (CLOSE.test(current)) {
      // 光标在这一行闭合标记上：改的是它闭合的那个容器。
      const top = stack[stack.length - 1];
      openLine = top?.name === 'photo' ? top.line : stackPhoto(stack);
    } else {
      const name = openName(current);
      // 光标在开标记上：photo 就是这一行，别的容器则看外面那一层。
      openLine = name ? (name === 'photo' ? index : stackPhoto(stack)) : stackPhoto(stack);
    }
  } else {
    // 空白行在容器里也算在容器里。
    openLine = stackPhoto(stack);
  }
  if (openLine < 0) return null;

  const marker = (lines[openLine] ?? '').trim();
  const parsed = parseMarker(marker);
  if (!parsed) return null;

  // 往下找配对的闭合标记，按嵌套层数计数（和 remark-figure.mjs 的 findClose 一致）。
  let closeLine = -1;
  let depth = 1;
  for (let i = openLine + 1; i < lines.length; i += 1) {
    const text = lines[i]!.trim();
    if (!text) continue;
    if (CLOSE.test(text)) {
      depth -= 1;
      if (depth === 0) {
        closeLine = i;
        break;
      }
      continue;
    }
    if (openName(text) && !ZH_SWITCH.test(text)) depth += 1;
  }

  let images = 0;
  const end = closeLine < 0 ? lines.length : closeLine;
  for (let i = openLine + 1; i < end; i += 1) images += countImages(lines[i]!);

  const issues = [...parsed.issues];
  if (images > 1 && (parsed.layout === 'left' || parsed.layout === 'right')) {
    issues.push(`容器里有 ${images} 张图，${PHOTO_LABELS[parsed.layout]}只能放一张，渲染时会按横排处理。`);
  }
  return { openLine, closeLine, layout: parsed.layout, width: parsed.width, images, issues, marker };
}
