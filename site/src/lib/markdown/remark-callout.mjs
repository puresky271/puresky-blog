/**
 * remark-callout.mjs — 把 GitHub 风格的提示块语法转成带 class 的 aside。
 *
 *   > [!NOTE]
 *   > 正文
 *
 * 支持 NOTE / TIP / IMPORTANT / WARNING / CAUTION。
 * 输出的结构是 <aside class="callout callout-<kind>">，左边一枚手绘图标（见 callout-card.mjs），
 * 正文跟在其后。「说明 / 提示」这些汉字标签不放出来占版面，只留在 aside 的 aria-label 里给读屏软件；
 * 视觉上的类型靠图标形状和类型色区分（样式在 prose.css 的提示块一段）。
 * 不引第三方插件和图标库，是因为需求就这么点，而且图标要统一线宽、统一圆头圆角。
 */

import { calloutIconNode } from './callout-card.mjs';

const ALERT_TYPES = {
  note: '说明',
  tip: '提示',
  important: '重点',
  warning: '注意',
  caution: '警告',
};

const ALERT_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

export function remarkCallout() {
  return (tree) => {
    visit(tree);
  };
}

function visit(node) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'blockquote' && Array.isArray(node.children) && node.children.length > 0) {
    transformBlockquote(node);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child);
  }
}

function transformBlockquote(node) {
  const firstParagraph = node.children[0];
  if (firstParagraph?.type !== 'paragraph') return;
  if (!Array.isArray(firstParagraph.children) || firstParagraph.children.length === 0) return;

  const firstText = firstParagraph.children[0];
  if (firstText?.type !== 'text') return;

  const match = firstText.value.match(ALERT_PATTERN);
  if (!match) return;

  const kind = match[1].toLowerCase();
  const label = ALERT_TYPES[kind];
  if (!label) return;

  // 把标记本身从正文里摘掉。
  firstText.value = firstText.value.replace(match[0], '');
  if (firstText.value.length === 0) {
    firstParagraph.children.shift();
  }
  if (firstParagraph.children.length === 0) {
    node.children.shift();
  }

  node.data = node.data ?? {};
  node.data.hName = 'aside';
  node.data.hProperties = {
    className: ['callout', `callout-${kind}`],
    role: kind === 'caution' || kind === 'warning' ? 'alert' : 'note',
    ariaLabel: label,
  };

  node.children.unshift(calloutIconNode(kind));
}
