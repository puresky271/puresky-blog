/**
 * rehype-external-links.mjs — 站外链接新开标签页，并补上 rel。
 *
 * 只认 http(s) 开头且不是本站来源的链接。站内相对路径和锚点不动。
 */

export function rehypeExternalLinks() {
  return (tree) => visit(tree);
}

function visit(node) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'element' && node.tagName === 'a') {
    const href = node.properties?.href;
    if (typeof href === 'string' && /^https?:\/\//.test(href)) {
      node.properties.target = '_blank';
      node.properties.rel = ['noopener', 'noreferrer'];
      const className = node.properties.className ?? [];
      node.properties.className = [...(Array.isArray(className) ? className : [className]), 'is-external'];
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child);
  }
}
