/**
 * avl-rotation.ts — AVL 树旋转的分步演示数据。
 *
 * 单旋用于 LL / RR 型失衡，双旋用于 LR / RL 型“折角”失衡。
 * 每一步都预生成固定的布局快照（结点坐标 + 边），要讲解的指针操作，
 * 角色高亮和说明文字。组件只负责渲染快照，并在相邻两套布局之间做过渡，
 * 不在这里维护播放状态。
 */

export type RotationKind = 'left' | 'right' | 'lr' | 'rl';

export interface RotationPoint {
  x: number;
  y: number;
}

/** 一条边，按父结点 → 子结点记录。 */
export type RotationEdge = readonly [string, string];

export interface RotationLayout {
  /** 结点编号 → 坐标。 */
  positions: Readonly<Record<string, RotationPoint>>;
  /** 当前布局的边。 */
  edges: readonly RotationEdge[];
}

export interface RotationRoles {
  /** 失衡结点。 */
  a: string;
  /** 单旋里是上位结点，双旋里是第一次旋转的中心。 */
  b: string;
  /** 单旋里是要换边的子树根 β，双旋里是折角点 C。 */
  c: string;
}

export interface RotationStep {
  phase: string;
  description: string;
  /** 这一步在讲哪几行伪代码（0 开始），空数组表示不讲指针操作。 */
  operators: readonly number[];
  layout: RotationLayout;
  /** 当前步骤需要高亮的角色。 */
  highlight: { a: boolean; b: boolean; c: boolean; done: boolean };
  /** 失衡结点 A 的平衡因子，直接显示在侧栏。 */
  balance: string;
}

export interface RotationTrace {
  kind: RotationKind;
  title: string;
  roles: RotationRoles;
  /** 旋转完成后占据子树根位置的结点，用来标“新的根”。 */
  finalRoot: string;
  /** 侧栏的指针操作伪代码，每一步高亮其中几行。 */
  pseudocode: readonly string[];
  /** 侧栏底部的一句提示。 */
  hint: string;
  nodeIds: readonly string[];
  steps: readonly RotationStep[];
}

const RIGHT_BEFORE: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    20: { x: 170, y: 140 },
    40: { x: 390, y: 140 },
    10: { x: 100, y: 224 },
    25: { x: 240, y: 224 },
    5: { x: 50, y: 308 },
  },
  edges: [
    ['30', '20'],
    ['30', '40'],
    ['20', '10'],
    ['20', '25'],
    ['10', '5'],
  ],
};

const RIGHT_AFTER: RotationLayout = {
  positions: {
    20: { x: 280, y: 56 },
    10: { x: 170, y: 140 },
    30: { x: 390, y: 140 },
    5: { x: 90, y: 224 },
    25: { x: 310, y: 224 },
    40: { x: 470, y: 224 },
  },
  edges: [
    ['20', '10'],
    ['20', '30'],
    ['10', '5'],
    ['30', '25'],
    ['30', '40'],
  ],
};

const LEFT_BEFORE: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    20: { x: 160, y: 140 },
    40: { x: 390, y: 140 },
    35: { x: 320, y: 224 },
    50: { x: 460, y: 224 },
    60: { x: 520, y: 308 },
  },
  edges: [
    ['30', '20'],
    ['30', '40'],
    ['40', '35'],
    ['40', '50'],
    ['50', '60'],
  ],
};

const LEFT_AFTER: RotationLayout = {
  positions: {
    40: { x: 280, y: 56 },
    30: { x: 170, y: 140 },
    50: { x: 390, y: 140 },
    20: { x: 90, y: 224 },
    35: { x: 250, y: 224 },
    60: { x: 460, y: 224 },
  },
  edges: [
    ['40', '30'],
    ['40', '50'],
    ['30', '20'],
    ['30', '35'],
    ['50', '60'],
  ],
};

/** LR 型的初始状态：A 左重，B 右重，折角在 C。 */
const LR_BEFORE: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    10: { x: 170, y: 140 },
    40: { x: 400, y: 140 },
    5: { x: 100, y: 224 },
    20: { x: 260, y: 224 },
    25: { x: 330, y: 308 },
  },
  edges: [
    ['30', '10'],
    ['30', '40'],
    ['10', '5'],
    ['10', '20'],
    ['20', '25'],
  ],
};

/** LR 型：第一次对 B 左旋后的中间状态，折角被扳成 LL。 */
const LR_MID: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    20: { x: 170, y: 140 },
    40: { x: 400, y: 140 },
    10: { x: 100, y: 224 },
    25: { x: 240, y: 224 },
    5: { x: 50, y: 308 },
  },
  edges: [
    ['30', '20'],
    ['30', '40'],
    ['20', '10'],
    ['20', '25'],
    ['10', '5'],
  ],
};

/** LR 型：再对 A 右旋后的最终状态。 */
const LR_AFTER: RotationLayout = {
  positions: {
    20: { x: 280, y: 56 },
    10: { x: 170, y: 140 },
    30: { x: 390, y: 140 },
    5: { x: 100, y: 224 },
    25: { x: 330, y: 224 },
    40: { x: 470, y: 224 },
  },
  edges: [
    ['20', '10'],
    ['20', '30'],
    ['10', '5'],
    ['30', '25'],
    ['30', '40'],
  ],
};

/** RL 型的初始状态：A 右重，B 左重，折角在 C。 */
const RL_BEFORE: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    20: { x: 160, y: 140 },
    50: { x: 400, y: 140 },
    40: { x: 330, y: 224 },
    60: { x: 470, y: 224 },
    35: { x: 270, y: 308 },
  },
  edges: [
    ['30', '20'],
    ['30', '50'],
    ['50', '40'],
    ['50', '60'],
    ['40', '35'],
  ],
};

/** RL 型：第一次对 B 右旋后的中间状态，折角被扳成 RR。 */
const RL_MID: RotationLayout = {
  positions: {
    30: { x: 280, y: 56 },
    20: { x: 160, y: 140 },
    40: { x: 400, y: 140 },
    35: { x: 330, y: 224 },
    50: { x: 460, y: 224 },
    60: { x: 520, y: 308 },
  },
  edges: [
    ['30', '20'],
    ['30', '40'],
    ['40', '35'],
    ['40', '50'],
    ['50', '60'],
  ],
};

/** RL 型：再对 A 左旋后的最终状态。 */
const RL_AFTER: RotationLayout = {
  positions: {
    40: { x: 280, y: 56 },
    30: { x: 170, y: 140 },
    50: { x: 390, y: 140 },
    20: { x: 90, y: 224 },
    35: { x: 250, y: 224 },
    60: { x: 460, y: 224 },
  },
  edges: [
    ['40', '30'],
    ['40', '50'],
    ['30', '20'],
    ['30', '35'],
    ['50', '60'],
  ],
};

const RIGHT_TRACE: RotationTrace = {
  kind: 'right',
  title: '右旋：处理 LL 型失衡',
  roles: { a: '30', b: '20', c: '25' },
  finalRoot: '20',
  pseudocode: ['B = A.left', 'A.left = B.right', 'B.right = A', 'root = B'],
  hint: 'β 原来是 B 的右子树，旋转后改挂到 A 的左边。中序序列不变，所以旋转后仍然是一棵二叉查找树。',
  nodeIds: ['30', '20', '40', '10', '25', '5'],
  steps: [
    {
      phase: '初始状态',
      description: '30 的左子树高 3，右子树高 1，平衡因子是 +2，左子树太高，需要在 30 上做一次右旋。',
      operators: [],
      layout: RIGHT_BEFORE,
      highlight: { a: true, b: false, c: false, done: false },
      balance: '+2',
    },
    {
      phase: '定位角色',
      description:
        '失衡结点记作 A = 30，它的左孩子记作 B = 20；B 的右子树 β = 25 夹在中间，旋转后要改挂到 A 的左边。',
      operators: [0],
      layout: RIGHT_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2',
    },
    {
      phase: '执行右旋',
      description:
        '先让 A.left 指向 β，再让 B.right 指向 A：B 升上去成为子树的根，A 沉下来变成 B 的右孩子，β 也跟着换了边。',
      operators: [1, 2],
      layout: RIGHT_AFTER,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2 → 0',
    },
    {
      phase: '旋转完成',
      description:
        'B = 20 成为新的根，中序遍历仍然是 5 → 10 → 20 → 25 → 30 → 40，30 和 20 的平衡因子都回到 0。',
      operators: [3],
      layout: RIGHT_AFTER,
      highlight: { a: false, b: false, c: false, done: true },
      balance: '0',
    },
  ],
};

const LEFT_TRACE: RotationTrace = {
  kind: 'left',
  title: '左旋：处理 RR 型失衡',
  roles: { a: '30', b: '40', c: '35' },
  finalRoot: '40',
  pseudocode: ['B = A.right', 'A.right = B.left', 'B.left = A', 'root = B'],
  hint: 'β 原来是 B 的左子树，旋转后改挂到 A 的右边。中序序列不变，所以旋转后仍然是一棵二叉查找树。',
  nodeIds: ['30', '20', '40', '35', '50', '60'],
  steps: [
    {
      phase: '初始状态',
      description: '30 的左子树高 1，右子树高 3，平衡因子是 −2，右子树太高，需要在 30 上做一次左旋。',
      operators: [],
      layout: LEFT_BEFORE,
      highlight: { a: true, b: false, c: false, done: false },
      balance: '−2',
    },
    {
      phase: '定位角色',
      description:
        '失衡结点记作 A = 30，它的右孩子记作 B = 40；B 的左子树 β = 35 夹在中间，旋转后要改挂到 A 的右边。',
      operators: [0],
      layout: LEFT_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2',
    },
    {
      phase: '执行左旋',
      description:
        '先让 A.right 指向 β，再让 B.left 指向 A：B 升上去成为子树的根，A 沉下来变成 B 的左孩子，β 也跟着换了边。',
      operators: [1, 2],
      layout: LEFT_AFTER,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2 → 0',
    },
    {
      phase: '旋转完成',
      description:
        'B = 40 成为新的根，中序遍历仍然是 20 → 30 → 35 → 40 → 50 → 60，40 和 30 的平衡因子都回到 0。',
      operators: [3],
      layout: LEFT_AFTER,
      highlight: { a: false, b: false, c: false, done: true },
      balance: '0',
    },
  ],
};

const LR_TRACE: RotationTrace = {
  kind: 'lr',
  title: '双旋：处理 LR 型失衡',
  roles: { a: '30', b: '10', c: '20' },
  finalRoot: '20',
  pseudocode: ['B.right = C.left', 'C.left = B', 'A.left = C.right', 'C.right = A', 'root = C'],
  hint: '先对 B 左旋把折角扳直，再对 A 右旋把 C 顶上来。两次旋转合起来，中序序列依然不变。',
  nodeIds: ['30', '10', '40', '5', '20', '25'],
  steps: [
    {
      phase: '初始状态',
      description:
        '30 的左子树高 3，右子树高 1，平衡因子是 +2。可它的左孩子 10 却右子树更高（平衡因子是 −1）。一正一负，说明插入发生在“左孩子的右子树”里，这种折角失衡叫 LR 型，一次单旋救不回来。',
      operators: [],
      layout: LR_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2',
    },
    {
      phase: '定位角色',
      description:
        '失衡结点 A = 30；A 的左孩子 B = 10；B 的右孩子 C = 20 就是折角点，两次旋转后它会成为新的根。',
      operators: [],
      layout: LR_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2',
    },
    {
      phase: '第一次：对 B 左旋',
      description:
        '先不管 A，把 B 这棵子树左旋：B.right 改指 C.left（这里是空的），再让 C.left 指回 B。C 顶到 B 的位置，折角被扳直。',
      operators: [0, 1],
      layout: LR_MID,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2',
    },
    {
      phase: '中间状态',
      description:
        '左旋之后，30 的左孩子变成了 20，20 的左边是 10，右边是 25，折角变成了 LL 型，接下来只要对 A 右旋一次。',
      operators: [],
      layout: LR_MID,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2',
    },
    {
      phase: '第二次：对 A 右旋',
      description:
        '对 A 右旋：A.left 改指 C.right（25），再让 C.right 指回 A。C 升到整棵子树的顶上，A 沉到右边。',
      operators: [2, 3],
      layout: LR_AFTER,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '+2 → 0',
    },
    {
      phase: '旋转完成',
      description:
        'C = 20 成为新的根，中序序列 5 → 10 → 20 → 25 → 30 → 40 保持不变，30 和 20 的平衡因子回到 0，整棵树重新平衡。',
      operators: [4],
      layout: LR_AFTER,
      highlight: { a: false, b: false, c: false, done: true },
      balance: '0',
    },
  ],
};

const RL_TRACE: RotationTrace = {
  kind: 'rl',
  title: '双旋：处理 RL 型失衡',
  roles: { a: '30', b: '50', c: '40' },
  finalRoot: '40',
  pseudocode: ['B.left = C.right', 'C.right = B', 'A.right = C.left', 'C.left = A', 'root = C'],
  hint: '先对 B 右旋把折角扳直，再对 A 左旋把 C 顶上来。两次旋转合起来，中序序列依然不变。',
  nodeIds: ['30', '20', '50', '40', '60', '35'],
  steps: [
    {
      phase: '初始状态',
      description:
        '30 的左子树高 1，右子树高 3，平衡因子是 −2。可它的右孩子 50 却左子树更高（平衡因子是 +1）。插入发生在“右孩子的左子树”里，这种折角失衡叫 RL 型。',
      operators: [],
      layout: RL_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2',
    },
    {
      phase: '定位角色',
      description:
        '失衡结点 A = 30；A 的右孩子 B = 50；B 的左孩子 C = 40 是折角点，两次旋转后它会成为新的根。',
      operators: [],
      layout: RL_BEFORE,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2',
    },
    {
      phase: '第一次：对 B 右旋',
      description:
        '先不管 A，把 B 这棵子树右旋：B.left 改指 C.right（这里是空的），再让 C.right 指回 B。C 顶到 B 的位置，折角被扳直。',
      operators: [0, 1],
      layout: RL_MID,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2',
    },
    {
      phase: '中间状态',
      description:
        '右旋之后，30 的右孩子变成了 40，40 的左边是 35，右边是 50，折角变成了 RR 型，接下来对 A 左旋一次即可。',
      operators: [],
      layout: RL_MID,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2',
    },
    {
      phase: '第二次：对 A 左旋',
      description:
        '对 A 左旋：A.right 改指 C.left（35），再让 C.left 指回 A。C 升到整棵子树的顶上，A 沉到左边。',
      operators: [2, 3],
      layout: RL_AFTER,
      highlight: { a: true, b: true, c: true, done: false },
      balance: '−2 → 0',
    },
    {
      phase: '旋转完成',
      description:
        'C = 40 成为新的根，中序序列 20 → 30 → 35 → 40 → 50 → 60 保持不变，30 和 40 的平衡因子回到 0，整棵树重新平衡。',
      operators: [4],
      layout: RL_AFTER,
      highlight: { a: false, b: false, c: false, done: true },
      balance: '0',
    },
  ],
};

export function createRotationTrace(kind: RotationKind): RotationTrace {
  if (kind === 'left') return LEFT_TRACE;
  if (kind === 'lr') return LR_TRACE;
  if (kind === 'rl') return RL_TRACE;
  return RIGHT_TRACE;
}
