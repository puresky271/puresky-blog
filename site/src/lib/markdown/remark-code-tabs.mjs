/**
 * remark-code-tabs.mjs — 多语言代码选项卡。
 *
 *   :::tabs
 *   ```java
 *   ...
 *   ```
 *   ```c
 *   ...
 *   ```
 *   :::
 *
 * 把容器里相邻的围栏代码块合成一组选项卡。标签取围栏信息串后的第一个 meta 词
 * （```java Solution 显示为 Solution），没有 meta 就用语言名。
 * 输出是 radio + label 的结构，切换在 prose.css 里纯 CSS 实现，没有 JS 也能用；
 * 容器里只允许放代码块（至少两个），混了别的内容就原样保留，不做转换。
 * 不引第三方插件，理由同 remark-callout.mjs。
 */

const OPEN = /^:::\s*tabs\s*$/;
const CLOSE = /^:::+\s*$/;

/** 没有 meta 时的标签名。大小写按各语言的惯用写法，而不是简单首字母大写。 */
const LANG_LABELS = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  kotlin: 'Kotlin',
  swift: 'Swift',
  csharp: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  lua: 'Lua',
  r: 'R',
  scala: 'Scala',
  bash: 'Bash',
  shell: 'Shell',
  sql: 'SQL',
  matlab: 'MATLAB',
  text: 'Text',
  plaintext: 'Text',
};

function isMarker(node, pattern) {
  return (
    node?.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0].type === 'text' &&
    pattern.test(node.children[0].value.trim())
  );
}

function tabLabel(code) {
  const meta = (code.meta ?? '').trim().split(/\s+/)[0];
  if (meta) return meta;
  const lang = (code.lang ?? '').toLowerCase();
  return LANG_LABELS[lang] ?? (lang ? lang[0].toUpperCase() + lang.slice(1) : 'Text');
}

function leaf(hName, hProperties) {
  return { type: 'codeTabLeaf', data: { hName, hProperties }, children: [] };
}

export function remarkCodeTabs() {
  return (tree) => {
    // 选项卡组的 id 在同一篇文档里要唯一，计数器跟着这次转换走。
    let group = 0;
    walk(tree);

    function walk(node) {
      if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        if (!isMarker(children[i], OPEN)) {
          walk(children[i]);
          continue;
        }
        let end = i + 1;
        while (end < children.length && !isMarker(children[end], CLOSE)) end++;
        const inner = children.slice(i + 1, end);
        const closed = end < children.length;
        // 只有「全是代码块、至少两个、有闭合标记」才转换，否则原样留下。
        if (!closed || inner.length < 2 || inner.some((item) => item.type !== 'code')) {
          i = end;
          continue;
        }
        children.splice(i, end - i + 1, buildTabs(inner, ++group));
      }
    }

    function buildTabs(codes, id) {
      const name = `code-tabs-${id}`;
      const inputs = codes.map((_, i) =>
        leaf('input', {
          type: 'radio',
          name,
          id: `${name}-${i}`,
          className: ['code-tab-radio'],
          ...(i === 0 ? { checked: true } : {}),
        })
      );
      const bar = leaf('nav', { className: ['code-tabs-bar'], 'aria-label': '代码语言' });
      bar.children = codes.map((code, i) => ({
        type: 'codeTabLabel',
        data: { hName: 'label', hProperties: { htmlFor: `${name}-${i}` } },
        children: [{ type: 'text', value: tabLabel(code) }],
      }));
      const panels = codes.map((code) => ({
        type: 'codeTabPanel',
        data: { hName: 'div', hProperties: { className: ['code-tab-panel'] } },
        children: [code],
      }));
      return {
        type: 'codeTabs',
        data: { hName: 'div', hProperties: { className: ['code-tabs'] } },
        children: [...inputs, bar, ...panels],
      };
    }
  };
}
