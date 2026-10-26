import { parseDocument } from 'yaml';

/**
 * 把受限的内置动画容器转成客户端组件的挂载点。
 *
 *   :::animation kmp
 *   text: aabaabaafa
 *   pattern: aabaaf
 *   :::
 *
 * 文章仍然只是 Markdown，配置只能是 YAML 数据，不支持任意脚本或组件名。
 */

const OPEN = /^:::\s*animation\s+([a-z][a-z0-9-]*)\s*$/;
const INLINE = /^:::\s*animation\s+([a-z][a-z0-9-]*)\s*\n([\s\S]*?)\n:::+\s*$/;
const CLOSE = /^:::+\s*$/;

const LABELS = {
  kmp: 'KMP 字符串匹配',
  'tree-traversal': '二叉树深度优先遍历',
  'tree-levelorder': '二叉树层序遍历',
  'tree-reconstruction': '重建二叉树',
  'expression-tree': '根据中缀表达式构建二叉树',
};

const EMPTY_CONFIG_OK = new Set(['tree-levelorder', 'expression-tree']);

const VALIDATORS = {
  kmp: () => null,
  'tree-traversal': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'order' && key !== 'method');
    if (unknown.length > 0) return `遍历动画不支持配置项：${unknown.join('、')}。`;
    if (!['preorder', 'inorder', 'postorder'].includes(config.order)) {
      return 'order 只能是 preorder、inorder 或 postorder。';
    }
    if (!['recursive', 'iterative'].includes(config.method)) {
      return 'method 只能是 recursive 或 iterative。';
    }
    return null;
  },
  'tree-levelorder': (config) => (Object.keys(config).length === 0
    ? null
    : '层序遍历动画不需要配置项。'),
  'tree-reconstruction': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'order');
    if (unknown.length > 0) return `重建动画不支持配置项：${unknown.join('、')}。`;
    if (!['preorder', 'postorder'].includes(config.order)) {
      return '重建动画的 order 只能是 preorder 或 postorder。';
    }
    return null;
  },
  'expression-tree': (config) => (Object.keys(config).length === 0
    ? null
    : '表达式建树动画不需要配置项。'),
};

const TYPES = new Set(Object.keys(LABELS));

function isMarker(node, pattern) {
  return (
    node?.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0].type === 'text' &&
    pattern.test(node.children[0].value.trim())
  );
}

function parseConfig(source) {
  if (!source.trim()) return null;
  const document = parseDocument(source.replace(/\r/g, ''));
  if (document.errors.length > 0) return null;
  const config = document.toJS();
  return config && typeof config === 'object' && !Array.isArray(config) ? config : null;
}

function configSource(nodes) {
  if (nodes.length !== 1 || nodes[0].type !== 'paragraph') return '';
  return nodes[0].children
    .filter((child) => child.type === 'text')
    .map((child) => child.value)
    .join('\n');
}

function message(text, error = false) {
  return {
    type: 'animationMessage',
    data: {
      hName: 'aside',
      hProperties: { className: error ? ['animation-error'] : ['animation-fallback'] },
    },
    children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }],
  };
}

function buildAnimation(type, source) {
  if (!TYPES.has(type)) return message(`未知动画类型：${type}`);
  const config = source.trim()
    ? parseConfig(source)
    : EMPTY_CONFIG_OK.has(type)
      ? {}
      : null;
  if (!config) return message('动画配置应为一段合法的 YAML 对象。', true);
  const problem = VALIDATORS[type]?.(config);
  if (problem) return message(problem, true);
  return {
    type: 'animation',
    data: {
      hName: 'div',
      hProperties: {
        className: ['animation-demo'],
        'data-animation': type,
        'data-config': JSON.stringify(config),
      },
    },
    children: [message(`动画演示：${LABELS[type]}。启用 JavaScript 后可播放、暂停和单步查看。`)],
  };
}

export function remarkAnimation() {
  return (tree) => {
    walk(tree);

    function walk(node) {
      if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        const current = children[i];
        const text = current?.type === 'paragraph' && current.children.length === 1 && current.children[0].type === 'text'
          ? current.children[0].value.trim()
          : '';
        const inline = text.match(INLINE);
        if (inline) {
          children.splice(i, 1, buildAnimation(inline[1], inline[2]));
          continue;
        }

        const match = text.match(OPEN);
        if (!match) {
          walk(current);
          continue;
        }

        let end = i + 1;
        while (end < children.length && !isMarker(children[end], CLOSE)) end++;
        if (end === children.length) continue;
        const source = configSource(children.slice(i + 1, end));
        children.splice(i, end - i + 1, buildAnimation(match[1], source));
      }
    }
  };
}
