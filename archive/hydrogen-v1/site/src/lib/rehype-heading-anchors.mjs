/**
 * rehype-heading-anchors.mjs — 给 h2/h3/h4 加 id 和锚点链接。
 *
 * 目录（TOC）用 Astro 内置的 headings 数据，这里只负责让标题本身可被链接。
 * 锚点符号用 # 而不是链条图标，因为它是纯文本、不需要引图标库、
 * 也不会在 RSS 里变成一个坏掉的 svg。
 */

const HEADINGS = new Set(['h2', 'h3', 'h4']);

export function rehypeHeadingAnchors() {
  return (tree) => {
    const used = new Set();
    visit(tree, used);
  };
}

function visit(node, used) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'element' && HEADINGS.has(node.tagName)) {
    decorate(node, used);
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child, used);
  }
}

function decorate(node, used) {
  node.properties = node.properties ?? {};

  let id = typeof node.properties.id === 'string' ? node.properties.id : slugify(textOf(node));
  if (!id) return;

  // 同名标题去重，否则锚点会互相抢。
  if (used.has(id)) {
    let suffix = 2;
    while (used.has(`${id}-${suffix}`)) suffix += 1;
    id = `${id}-${suffix}`;
  }
  used.add(id);
  node.properties.id = id;

  node.children.unshift({
    type: 'element',
    tagName: 'a',
    properties: {
      href: `#${id}`,
      className: ['heading-anchor'],
      'aria-label': '链接到本节',
    },
    children: [{ type: 'text', value: '#' }],
  });
}

function textOf(node) {
  if (node.type === 'text') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}

/**
 * slug 生成。保留 CJK 字符，因为本站正文是中文，
 * 剥掉汉字会让所有中文标题的锚点退化成 section-1 / section-2。
 */
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s　]+/g, '-')
    .replace(/[^\w一-鿿぀-ヿ-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
