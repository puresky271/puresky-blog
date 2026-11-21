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
  lowerbit: '取出二进制最低位的 1',
  'fenwick-query': '树状数组查询前缀和',
  'fenwick-update': '树状数组单点更新',
  'circular-queue': '循环队列判空与判满',
  'avl-rotate': 'AVL 树的右旋与左旋',
  'thread-build': '线索二叉树的线索化',
  'thread-traverse': '遍历线索二叉树',
  'rpn-eval': '逆波兰表达式求值',
  'graph-dfs': '图的深度优先遍历：一条路走到黑',
  'graph-bfs': '图的广度优先遍历：一层一层向外扩散',
  'relation-anatomy': '解剖关系模型的一张表',
  'sorting-trace': '七种比较排序的推进过程',
  'omakase-curve': '一席 Omakase 的风味递进弧线',
  'panorama-lyrics': '《端程山》双版本歌词对照与音画联动',
  'cassiopeia-stars': '仙后座五颗主星的三维光年纵深与天体物理观测台',
  tempura: '天妇罗的油温区间、水油交替、食材旬期与脂质对照图版',
  'ws-teaser': '权重空间编程开场三格',
  'ws-traces': '模型读权重与写权重的完整记录',
  'ws-gohand': '从零写出的围棋网络的逐步改进',
  'ws-mathedit': '直接改权重提升数学能力',
  'bigym-film': 'BiGym 2.0 开篇影像',
  'bigym-board': '人形机器人家务任务榜单',
  'bigym-tasks': '20 个任务与真人演示',
  'bigym-cost': '成功率与单次会话成本',
  'bigym-explorer': '每个程序在每个隐藏种子上的结果',
  'geist-gallery': 'Geist 组件示例画廊',
  'geist-palette': 'Geist 色彩系统',
  'geist-type': 'Geist 字阶与字体',
  'geist-materials': 'Geist 材质层级',
  'geist-terminal': 'Geist 终端主题',
  'geist-grid': 'Geist 网格系统',
  // 精选收录《用 Claude Code：把投入花在刀刃上》的六个复刻演示。
  'sye-curve': 'Terminal-Bench 3.0 的投入程度曲线',
  'sye-failures': 'Terminal-Bench 3.0 每次尝试的失败原因方阵',
  'sye-payoff': '各类任务的通过率与投入程度',
  'sye-builds': '一句话提示词在四个投入档位下生成的健身应用',
  'sye-config': 'Claude Code 配置菜单在四个投入档位下的重设计',
  'sye-phone': '按访谈规格生成的健身应用与十一步演示',
  // 精选收录《对抗蒸馏》里那张两个标签页的交互折线图。
  'advd-chart': '两个网络安全基准上的推理轨迹蒸馏对比',
};

/** 精选收录里那篇文章的 trace 数据集：值就是 public/data/weight-space/traces/ 下的文件名。 */
const WS_TRACES = new Set([
  'exp1_games',
  'exp1_diffusion',
  'exp3_language',
  'exp3_car',
  'exp4_write',
  'exp5_sycophancy',
  'exp8_math',
]);

const EMPTY_CONFIG_OK = new Set([
  'tree-levelorder',
  'expression-tree',
  'rpn-eval',
  'graph-dfs',
  'graph-bfs',
  'relation-anatomy',
  'omakase-curve',
  'panorama-lyrics',
  'cassiopeia-stars',
  'tempura',
  'ws-teaser',
  'ws-gohand',
  'bigym-film',
  'bigym-board',
  'bigym-tasks',
  'bigym-cost',
  'bigym-explorer',
  'geist-palette',
  'geist-type',
  'geist-materials',
  'geist-terminal',
  'geist-grid',
  'sye-curve',
  'sye-failures',
  'sye-payoff',
  'sye-builds',
  'sye-config',
  'sye-phone',
  'advd-chart',
]);

/** 这六个演示都不需要配置项，写了配置直接报错。 */
const syeNoConfig = (config) => (Object.keys(config).length === 0
  ? null
  : '这个演示不需要配置项。');

const VALIDATORS = {
  kmp: () => null,
  'geist-gallery': (config) => {
    const allowed = new Set(['actions', 'inputs', 'choices', 'data', 'feedback', 'overlays', 'containers']);
    const unknown = Object.keys(config).filter((key) => key !== 'group');
    if (unknown.length > 0) return `组件画廊不支持配置项：${unknown.join('、')}。`;
    if (!allowed.has(config.group)) {
      return 'group 只能是 actions、inputs、choices、data、feedback、overlays 或 containers。';
    }
    return null;
  },
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
  lowerbit: (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'value');
    if (unknown.length > 0) return `lowbit 动画不支持配置项：${unknown.join('、')}。`;
    if (!Number.isInteger(config.value) || config.value < 1 || config.value > 255) {
      return 'lowbit 动画的 value 只能是 1 到 255 之间的整数。';
    }
    return null;
  },
  'fenwick-query': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'index');
    if (unknown.length > 0) return `前缀和动画不支持配置项：${unknown.join('、')}。`;
    if (!Number.isInteger(config.index) || config.index < 1 || config.index > 14) {
      return '前缀和动画的 index 只能是 1 到 14 之间的整数。';
    }
    return null;
  },
  'fenwick-update': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'index' && key !== 'delta');
    if (unknown.length > 0) return `单点更新动画不支持配置项：${unknown.join('、')}。`;
    if (!Number.isInteger(config.index) || config.index < 1 || config.index > 14) {
      return '单点更新动画的 index 只能是 1 到 14 之间的整数。';
    }
    if (!Number.isInteger(config.delta) || config.delta < -9 || config.delta > 9 || config.delta === 0) {
      return '单点更新动画的 delta 只能是 -9 到 9 之间的非零整数。';
    }
    return null;
  },
  'circular-queue': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'method');
    if (unknown.length > 0) return `循环队列动画不支持配置项：${unknown.join('、')}。`;
    if (!['flag', 'count', 'sacrifice'].includes(config.method)) {
      return '循环队列动画的 method 只能是 flag、count 或 sacrifice。';
    }
    return null;
  },
  'avl-rotate': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'kind');
    if (unknown.length > 0) return `旋转动画不支持配置项：${unknown.join('、')}。`;
    if (!['left', 'right', 'lr', 'rl'].includes(config.kind)) {
      return '旋转动画的 kind 只能是 left、right、lr 或 rl。';
    }
    return null;
  },
  'thread-build': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'order');
    if (unknown.length > 0) return `线索化动画不支持配置项：${unknown.join('、')}。`;
    if (!['inorder', 'preorder', 'postorder'].includes(config.order)) {
      return '线索化动画的 order 只能是 inorder、preorder 或 postorder。';
    }
    return null;
  },
  'thread-traverse': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'order');
    if (unknown.length > 0) return `遍历动画不支持配置项：${unknown.join('、')}。`;
    if (!['inorder', 'preorder', 'postorder'].includes(config.order)) {
      return '遍历动画的 order 只能是 inorder、preorder 或 postorder。';
    }
    return null;
  },
  'rpn-eval': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'tokens');
    if (unknown.length > 0) return `逆波兰求值演示不支持配置项：${unknown.join('、')}。`;
    if (config.tokens !== undefined && typeof config.tokens !== 'string') {
      return '逆波兰求值演示的 tokens 需为空格分隔的字符串，例如 3 4 2 * +。';
    }
    if (typeof config.tokens === 'string') {
      // remark-smartypants 会把配置里的直引号改成弯引号，拆词前统一当空白处理，
      // 这样写成 tokens: 3 4 2 * + 或者 tokens: "3 4 2 * +" 都能正常识别。
      const normalized = config.tokens.replace(/[“”‘’"'`]/g, ' ').trim();
      if (!normalized) return '逆波兰求值演示的 tokens 不能为空。';
      if (normalized.length > 120) return '逆波兰求值演示的 tokens 过长。';
      const tokens = normalized.split(/\s+/);
      if (tokens.length > 24) return '逆波兰求值演示的 tokens 最多 24 个元素。';
      for (const token of tokens) {
        if (!/^-?\d+$/.test(token) && !['+', '-', '*', '/'].includes(token)) {
          return `逆波兰求值演示的 tokens 里包含无法识别的元素 ${token}，只能是整数或 +、-、*、/。`;
        }
      }
    }
    return null;
  },
  'graph-dfs': (config) => (Object.keys(config).length === 0
    ? null
    : 'DFS 演示不需要配置项。'),
  'graph-bfs': (config) => (Object.keys(config).length === 0
    ? null
    : 'BFS 演示不需要配置项。'),
  'relation-anatomy': (config) => (Object.keys(config).length === 0
    ? null
    : '关系模型解剖演示不需要配置项。'),
  'sorting-trace': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'algo');
    if (unknown.length > 0) return `排序动画不支持配置项：${unknown.join('、')}。`;
    if (!['selection', 'insertion', 'bubble', 'shell', 'heap', 'merge', 'quick'].includes(config.algo)) {
      return '排序动画的 algo 只能是 selection、insertion、bubble、shell、heap、merge 或 quick。';
    }
    return null;
  },
  'omakase-curve': (config) => (Object.keys(config).length === 0
    ? null
    : '味觉曲线演示不需要配置项。'),
  'cassiopeia-stars': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'view');
    if (unknown.length > 0) return `仙后座观测台不支持配置项：${unknown.join('、')}。`;
    if (config.view !== undefined && !['depth', 'polar', 'physics'].includes(String(config.view))) {
      return 'view 只能是 depth、polar 或 physics。';
    }
    return null;
  },
  tempura: (config) => (Object.keys(config).length === 0
    ? null
    : '天妇罗数据图版不需要配置项。'),
  'panorama-lyrics': (config) => {
    const allowed = new Set(['lines', 'stanza', 'title']);
    const unknown = Object.keys(config).filter((key) => !allowed.has(key));
    if (unknown.length > 0) return `歌词对照演示不支持配置项：${unknown.join('、')}。`;
    if (config.lines !== undefined) {
      const lineStr = String(config.lines).trim();
      if (!/^\d+(?:\s*[-–~]\s*\d+)?$/.test(lineStr)) {
        return 'lines 需为形如 "16-19" 或 "1" 的行号范围。';
      }
    }
    if (config.stanza !== undefined && !['verse-1', 'chorus-1', 'verse-2', 'chorus-2', 'bridge', 'outro'].includes(String(config.stanza))) {
      return 'stanza 只能是 verse-1、chorus-1、verse-2、chorus-2、bridge 或 outro。';
    }
    if (config.title !== undefined && (typeof config.title !== 'string' || config.title.length > 80)) {
      return 'title 需为不超过 80 字的字符串。';
    }
    return null;
  },
  'ws-teaser': (config) => (Object.keys(config).length === 0
    ? null
    : '开篇三格演示不需要配置项。'),
  'ws-traces': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'figure' && key !== 'setup');
    if (unknown.length > 0) return `推理记录演示不支持配置项：${unknown.join('、')}。`;
    if (!WS_TRACES.has(config.figure)) {
      return `推理记录演示的 figure 只能是 ${[...WS_TRACES].join('、')} 之一。`;
    }
    if (config.setup !== undefined && typeof config.setup !== 'boolean') {
      return '推理记录演示的 setup 只能是 true 或 false。';
    }
    return null;
  },
  'ws-gohand': (config) => (Object.keys(config).length === 0
    ? null
    : '围棋演示不需要配置项。'),
  'ws-mathedit': (config) => {
    const unknown = Object.keys(config).filter((key) => key !== 'figure');
    if (unknown.length > 0) return `数学编辑演示不支持配置项：${unknown.join('、')}。`;
    if (!['bench', 'traj'].includes(config.figure)) {
      return '数学编辑演示的 figure 只能是 bench 或 traj。';
    }
    return null;
  },
  'bigym-film': (config) => (Object.keys(config).length === 0
    ? null
    : '开篇影像不需要配置项。'),
  'bigym-board': (config) => (Object.keys(config).length === 0
    ? null
    : '榜单演示不需要配置项。'),
  'bigym-tasks': (config) => (Object.keys(config).length === 0
    ? null
    : '任务盘演示不需要配置项。'),
  'bigym-cost': (config) => (Object.keys(config).length === 0
    ? null
    : '成本散点演示不需要配置项。'),
  'bigym-explorer': (config) => (Object.keys(config).length === 0
    ? null
    : '程序浏览器不需要配置项。'),
  'sye-curve': syeNoConfig,
  'sye-failures': syeNoConfig,
  'sye-payoff': syeNoConfig,
  'sye-builds': syeNoConfig,
  'sye-config': syeNoConfig,
  'sye-phone': syeNoConfig,
  'advd-chart': (config) => (Object.keys(config).length === 0
    ? null
    : '这个图表不需要配置项。'),
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
    children: [message(type.startsWith('ws-') || type.startsWith('bigym-') || type.startsWith('geist-') || type.startsWith('sye-') || type.startsWith('advd-') || type === 'tempura'
      ? `交互演示：${LABELS[type]}。启用 JavaScript 后可以切换、展开和播放。`
      : `动画演示：${LABELS[type]}。启用 JavaScript 后可以播放，可以暂停，也可以单步查看。`)],
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
          children.splice(i, 1, { ...buildAnimation(inline[1], inline[2]), position: current.position });
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
        const startPoint = current.position?.start;
        const endPoint = children[end].position?.end;
        const position = startPoint && endPoint ? { start: startPoint, end: endPoint } : current.position;
        children.splice(i, end - i + 1, { ...buildAnimation(match[1], source), position });
      }
    }
  };
}
