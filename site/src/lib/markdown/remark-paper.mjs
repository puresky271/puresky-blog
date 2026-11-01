/**
 * remark-paper.mjs — 论文解读文章的「中英逐段对照」容器。
 *
 *   :::bi
 *   英文原文，可以带行内公式 $z_t$、链接、加粗、列表、代码块、行间公式和表格。
 *
 *   :::zh
 *   对应的中文译文。
 *   :::
 *
 *   :::figure
 *   ![Figure 5](./images/world-models/fig-05.png)
 *   Figure 5. Flow diagram of a Variational Autoencoder (VAE).
 *
 *   :::zh
 *   图 5. 变分自编码器（VAE）的流程图。
 *   :::
 *   :::
 *
 *   :::annotation
 *   我的注解，中英两种模式下都显示，输出成和提示块（> [!NOTE]）一样的卡片。
 *   :::
 *
 *   :::source
 *   - 论文：World Models（David Ha, Jürgen Schmidhuber，2018）
 *   :::
 *
 * :::bi 和 :::figure 用 :::zh 切成原文和译文两半，输出成 .bi-en / .bi-zh 两个块，
 * 由 prose.css 按 <html data-paper-lang> 用 display 切换；没有 JS 时默认显示中文译文，正文照常可读。
 *
 * 标记不必前后都空行。Markdown 会把 `:::bi` 和紧跟的普通文字并成一段；表格会把紧跟的 `:::`
 * 当成一行表格数据；列表和引用更麻烦，没空行隔开的 `:::` 会通过懒续行吞进最后一段里。
 * 所以先做一遍 mdast 规整：把挤在段落里的标记行拆成独立段落，再把「从第一个标记开始」的那一截
 * 从列表、引用里提回顶层。标记在源文里都是顶格写的块级标记，本来就不该待在这些块里面。
 *
 * 找闭合标记时按 depth 计数，容器里再套 :::tabs / :::annotation / :::animation 这类写法
 * 不会提前收尾（它们的闭合 ::: 会先抵掉自己那一层）。:figure 的 :::zh 后面多写一个 ::: 也当冗余吞掉。
 * 标记缺失、对不上或者 :::figure 的第一个块不是图片时原样保留，只打一条警告，不吞掉作者写的内容。
 * 不引第三方插件，理由同 remark-callout.mjs：输出结构要和 prose.css、Astro 的图片处理对上。
 */

import { calloutIconNode } from './callout-card.mjs';

const CLOSE = /^:::+\s*$/;
const OPEN = /^:::\s*([a-z][a-z0-9-]*)\b/i;
/** 一整行都是标记：`:::`、`::::`、`:::bi`、`:::animation kmp`。 */
const MARKER_LINE = /^ {0,3}(:{3,}\s*(?:[a-z][a-z0-9-]*(?:\s+[^\n]*)?)?)\s*$/i;
const TRANSLATE = 'zh';
const KINDS = new Set(['bi', 'figure', 'annotation', 'source']);
/** 会把标记吞进自己内部的块：懒续行只发生在段落里，列表、列表项、引用是常见的外壳。 */
const NESTED = new Set(['list', 'listItem', 'blockquote']);

/** 标记段落的文本；不是「单独成段的 :::…」就返回空串。 */
function markerText(node) {
  if (node?.type !== 'paragraph' || node.children.length !== 1) return '';
  const child = node.children[0];
  return child.type === 'text' ? child.value.trim() : '';
}

function openName(text) {
  const match = text.match(OPEN);
  return match ? match[1].toLowerCase() : '';
}

function isClose(node) {
  return CLOSE.test(markerText(node));
}

function isMarkerParagraph(node) {
  return node?.type === 'paragraph' && MARKER_LINE.test(markerText(node));
}

/** 只去掉首尾的空行和空白，段内内容不动（汉字间的软换行留给 remark-cjk-lines）。 */
function trimEdges(children) {
  while (children.length > 0) {
    const first = children[0];
    if (first.type !== 'text') break;
    first.value = first.value.replace(/^\n+/, '');
    if (first.value) break;
    children.shift();
  }
  while (children.length > 0) {
    const last = children[children.length - 1];
    if (last.type !== 'text') break;
    last.value = last.value.replace(/\s+$/, '');
    if (last.value) break;
    children.pop();
  }
  return children;
}

/**
 * 把一个段落里挤着的标记行拆成独立段落，其余内容原样保留（行内公式、加粗、链接都不动）。
 * 只在行首认标记，所以正文里句中的 `:::` 不会被误拆；代码围栏是 code 节点，不经过这里。
 */
function splitParagraph(paragraph) {
  if (!paragraph.children.some((child) => child.type === 'text' && child.value.includes(':::'))) {
    return [paragraph];
  }
  const pieces = [];
  let buffer = [];
  // 下一个字符是否落在段落行首；标记只在这个位置才算数。
  let lineStart = true;

  const flush = () => {
    trimEdges(buffer);
    if (buffer.length > 0) pieces.push({ type: 'paragraph', children: buffer });
    buffer = [];
  };

  for (const child of paragraph.children) {
    if (child.type !== 'text') {
      buffer.push(child);
      lineStart = false;
      continue;
    }
    const lines = child.value.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const atLineStart = i === 0 ? lineStart : true;
      const last = i === lines.length - 1;
      const line = lines[i];
      if (atLineStart && MARKER_LINE.test(line)) {
        flush();
        pieces.push({ type: 'paragraph', children: [{ type: 'text', value: line.trim() }] });
        continue;
      }
      buffer.push({ type: 'text', value: last ? line : `${line}\n` });
    }
    lineStart = lines.length > 1 && lines[lines.length - 1] === '';
  }

  flush();
  return pieces;
}

/** 表格会把紧跟其后的 `:::` 当成一行只有一格的表数据，这里把它还原成标记段落。 */
function takeTailTableMarker(table) {
  const last = table.children?.[table.children.length - 1];
  if (!last || last.type !== 'tableRow' || last.children.length !== 1) return null;
  const cell = last.children[0];
  if (cell?.type !== 'tableCell' || cell.children.length !== 1) return null;
  const text = cell.children[0];
  if (text?.type !== 'text') return null;
  const value = text.value.trim();
  if (!MARKER_LINE.test(value)) return null;
  table.children.pop();
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

/**
 * 规整整棵树，返回「本该属于外层、却被懒续行吞进当前块尾部」的节点。
 * 标记是顶格的块级写法，所以这些节点要一层层往外传，直到落在顶层（或容器该在的那一层）。
 */
function hoistMarkers(node) {
  if (!node || !Array.isArray(node.children)) return [];
  const nested = NESTED.has(node.type);
  const next = [];
  let escaped = [];

  const place = (nodes) => {
    if (nodes.length === 0) return;
    if (nested) escaped = [...escaped, ...nodes];
    else next.push(...nodes);
  };

  for (const child of node.children) {
    if (child.type === 'paragraph') {
      const pieces = splitParagraph(child);
      // 从第一个标记开始的那一截属于外层；前面的正文继续留在当前层。
      const cut = pieces.findIndex(isMarkerParagraph);
      next.push(...(cut < 0 ? pieces : pieces.slice(0, cut)));
      place(cut < 0 ? [] : pieces.slice(cut));
      continue;
    }
    const inner = hoistMarkers(child);
    next.push(child);
    place(inner);
    if (child.type === 'table') {
      for (let marker = takeTailTableMarker(child); marker; marker = takeTailTableMarker(child)) {
        place([marker]);
      }
    }
  }

  node.children = next;
  return escaped;
}

/**
 * 从 children[start] 的开标记往下找这一层的闭合标记。
 * depth 是「还有几层没闭合」；只有最外层的 :::zh 才当译文分隔线，
 * 嵌套容器里的 :::zh 属于它自己那层，直接算进 depth。
 * 找不到闭合返回 null，交给调用方原样保留。
 */
function findClose(children, start) {
  let depth = 1;
  let separator = -1;
  for (let i = start + 1; i < children.length; i += 1) {
    const text = markerText(children[i]);
    if (!text) continue;
    if (CLOSE.test(text)) {
      depth -= 1;
      if (depth === 0) {
        // 有的作者会把 :::zh 也单独闭合一次，写成两个 :::；多出来的那几个吞掉，别留在正文里。
        // tail 只影响要删掉多少个节点，取内容的两段仍然到第一个闭合为止。
        let tail = 0;
        while (isClose(children[i + 1 + tail])) tail += 1;
        return { separator, end: i, tail };
      }
      continue;
    }
    const name = openName(text);
    if (!name) continue;
    if (depth === 1 && name === TRANSLATE) {
      if (separator < 0) separator = i;
      continue;
    }
    depth += 1;
  }
  return null;
}

/**
 * 语言半边：原文档的块原样塞进去，只换一层 div。
 * lang 属性让屏幕阅读器和断词知道这里是英文还是中文。
 */
function languageBlock(className, lang, children) {
  return {
    type: 'paperBlock',
    data: { hName: 'div', hProperties: { className: [className], lang } },
    children,
  };
}

/** 卡片标题。文案是插件生成的不是正文，所以不走 CJK 去换行那一套。 */
function cardTitle(className, text) {
  return {
    type: 'paperCardTitle',
    data: { hName: 'p', hProperties: { className: [className] } },
    children: [{ type: 'text', value: text }],
  };
}

function buildBi(en, zh) {
  return {
    type: 'paperBi',
    data: { hName: 'div', hProperties: { className: ['paper-bi'] } },
    children: [
      languageBlock('bi-en', 'en', en),
      languageBlock('bi-zh', 'zh-CN', zh),
    ],
  };
}

/**
 * :::figure 的正文拆成图片和英文图注。
 * 图片节点保持 mdast image 不动：Astro 的 remarkCollectImages 和 rehypeImages
 * 都按节点类型找图，放在 figure 里照样会被换成优化后的 _astro 资源。
 * 图片和图注写在同一段里（没空行）也能用：图片取出来，段里剩下的行内内容当图注开头。
 */
function splitFigure(body) {
  const first = body[0];
  if (first?.type !== 'paragraph') return null;
  const at = first.children.findIndex((child) => child.type === 'image');
  if (at < 0) return null;
  const image = first.children[at];
  const rest = trimEdges(
    first.children.filter((child, index) => index !== at && !(child.type === 'text' && !child.value.trim()))
  );
  const caption = [...(rest.length > 0 ? [{ type: 'paragraph', children: rest }] : []), ...body.slice(1)];
  return { image, caption };
}

function buildFigure(image, en, zh) {
  return {
    type: 'paperFigure',
    data: { hName: 'figure', hProperties: { className: ['paper-figure'] } },
    children: [
      image,
      {
        type: 'paperCaption',
        data: { hName: 'figcaption' },
        children: [
          languageBlock('bi-en', 'en', en),
          languageBlock('bi-zh', 'zh-CN', zh),
        ],
      },
    ],
  };
}

/** :::annotation 和 :::source 是两种卡片。annotation 归到提示块那一族（和 > [!NOTE] 同一个卡片样式）。 */
function buildCard(kind, children) {
  if (kind === 'annotation') {
    return {
      type: 'paperNote',
      data: {
        hName: 'aside',
        hProperties: {
          className: ['callout', 'callout-annotation'],
          role: 'note',
          ariaLabel: '注解',
        },
      },
      children: [calloutIconNode('annotation'), ...children],
    };
  }

  return {
    type: 'paperSource',
    data: {
      hName: 'aside',
      hProperties: { className: ['paper-source'] },
    },
    children: [cardTitle('paper-source-title', '原文来源'), ...children],
  };
}

export function remarkPaper() {
  return (tree, file) => {
    // 警告里带上文件名：构建日志里一眼能看出是哪篇文章的标记写错了。
    const name = file?.path ? file.path.split(/[\\/]/).pop() : '未知文件';
    const warn = (message) => console.warn(`[remark-paper] ${name}：${message}`);

    hoistMarkers(tree);
    transform(tree, warn);
  };
}

function transform(root, warn) {
  walk(root);

  function walk(node) {
    if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
    const children = node.children;
    for (let i = 0; i < children.length; i += 1) {
      const kind = openName(markerText(children[i]));
      if (!KINDS.has(kind)) {
        walk(children[i]);
        continue;
      }

      const span = findClose(children, i);
      if (!span) {
        warn(`:::${kind} 没有找到闭合的 :::，这个容器原样保留。`);
        continue;
      }

      // 两种双语容器缺 :::zh 时没有译文可显示，宁可留出原始标记让作者看见。
      if (span.separator < 0 && (kind === 'bi' || kind === 'figure')) {
        warn(`:::${kind} 里缺少 :::zh 译文块，这个容器原样保留。`);
        continue;
      }

      let result;
      if (kind === 'bi') {
        result = buildBi(
          children.slice(i + 1, span.separator),
          children.slice(span.separator + 1, span.end)
        );
      } else if (kind === 'figure') {
        const parts = splitFigure(children.slice(i + 1, span.separator));
        if (!parts) {
          warn(':::figure 的第一个块应该是一张图片，这个容器原样保留。');
          continue;
        }
        result = buildFigure(parts.image, parts.caption, children.slice(span.separator + 1, span.end));
      } else {
        result = buildCard(kind, children.slice(i + 1, span.end));
      }

      children.splice(i, span.end - i + 1 + span.tail, result);
      // 容器里可能还套着别的论文容器（比如 :::bi 里放 :::annotation），接着往里走。
      walk(result);
    }
  }
}
