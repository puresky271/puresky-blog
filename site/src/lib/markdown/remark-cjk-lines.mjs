/**
 * remark-cjk-lines.mjs — 去掉汉字之间的软换行。
 *
 * 中文源文件习惯在句中折行，Markdown 会把换行渲染成一个空格，
 * 于是正文里到处是「一路。 某次」这种多出来的空隙。
 * 只处理两侧都是中日文字或全角标点的换行，中英之间的换行仍然保留为空格。
 */

const CJK = /[⺀-⿿　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/;

export function remarkCjkLines() {
  return (tree) => visit(tree);
}

function firstChar(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value.charAt(0);
  return Array.isArray(node.children) && node.children.length ? firstChar(node.children[0]) : '';
}

function lastChar(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value.charAt(node.value.length - 1);
  return Array.isArray(node.children) && node.children.length ? lastChar(node.children[node.children.length - 1]) : '';
}

function visit(node) {
  if (!node || !Array.isArray(node.children)) return;
  const children = node.children;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child.type === 'text') {
      // 节点内部：汉字\n汉字
      child.value = child.value.replace(/([^\n])\n(?=[^\n])/g, (match, before, offset, whole) =>
        CJK.test(before) && CJK.test(whole.charAt(offset + 2)) ? before : match
      );
      // 节点边界：「……汉字\n」后面紧跟着以汉字开头的兄弟节点（例如 **加粗**）
      if (child.value.endsWith('\n') && CJK.test(child.value.charAt(child.value.length - 2)) && CJK.test(firstChar(children[i + 1]))) {
        child.value = child.value.slice(0, -1);
      }
      // 节点边界：前一个兄弟以汉字结尾，本节点以「\n汉字」开头
      if (child.value.startsWith('\n') && CJK.test(lastChar(children[i - 1])) && CJK.test(child.value.charAt(1))) {
        child.value = child.value.slice(1);
      }
    } else {
      visit(child);
    }
  }
}
