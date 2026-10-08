/**
 * remark-callout.mjs — 把 GitHub 风格的提示块语法转成带 class 的 blockquote。
 *
 *   > [!NOTE]
 *   > 正文
 *
 * 支持 NOTE / TIP / IMPORTANT / WARNING / CAUTION。
 * 不引第三方插件是因为需求就这么点，而且要控制输出的 class 名对上 global.css。
 */

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
  };

  node.children.unshift({
    type: 'paragraph',
    data: {
      hName: 'p',
      hProperties: { className: ['callout-title'] },
    },
    children: [{ type: 'text', value: label }],
  });
}
