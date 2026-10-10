/**
 * remark-local-images.mjs — 正文里引用的本地图片不存在时，跳过这张图，而不是让整个构建失败。
 *
 * 文章图片（src/content/posts/images/）不进仓库（见 .gitignore），只在本机：
 * 本机构建、从本机部署都带着它们；从干净的 clone 构建（CI、别人 fork）时这些文件不存在，
 * Astro 找不到图会直接报错。这里把这样的图片去掉并打一条警告，和首页插画「本机有就用、没有就回退」是同一个思路。
 * 必须排在 Astro 收集图片之前（用户的 remark 插件本来就在它前面运行）。
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

const REMOTE = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

export function remarkLocalImages() {
  return (tree, file) => {
    const dir = file.path ? path.dirname(file.path) : null;
    if (dir) prune(tree, dir, file.path);
  };
}

function missing(node, dir) {
  if (node.type !== 'image' || typeof node.url !== 'string' || REMOTE.test(node.url)) return false;
  let rel = node.url;
  try {
    rel = decodeURI(rel);
  } catch {
    // 解不开就按原样找。
  }
  return !existsSync(path.resolve(dir, rel));
}

function prune(node, dir, source) {
  if (!Array.isArray(node.children)) return;
  node.children = node.children.filter((child) => {
    if (missing(child, dir)) {
      console.warn(`[remark-local-images] ${path.basename(source)}：找不到 ${child.url}，这张图跳过（文章图片不进仓库，只在本机）`);
      return false;
    }
    prune(child, dir, source);
    // 只装着这张图的段落去掉图之后成了空段落，一起删掉。
    return !(child.type === 'paragraph' && Array.isArray(child.children) && child.children.every((c) => c.type === 'text' && !c.value.trim()));
  });
}
