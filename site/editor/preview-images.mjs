/** 在 Astro 把图片转成构建占位符之前，接上编辑器的本地图片读取接口。 */
export function rehypePreviewImages() {
  return (tree) => visit(tree);
}

function visit(node) {
  if (node.type === 'element' && node.tagName === 'img' && typeof node.properties?.src === 'string') {
    const src = node.properties.src;
    if (src && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(src)) {
      let rel = src;
      try {
        rel = decodeURI(src);
      } catch {
        // 无效转义交给图片接口按原路径处理。
      }
      node.properties.src = `/__editor/api/asset?p=${encodeURIComponent(rel)}`;
    }
  }
  for (const child of node.children ?? []) visit(child);
}
