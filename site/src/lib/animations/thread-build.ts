/**
 * 线索二叉树的线索化过程：中序、先序、后序三种次序的不可变步骤快照。
 *
 * 树、结点坐标和虚线需要绕开的控制点都写死在这里，组件只负责按快照画图。
 * 线索化的结果只取决于访问次序和原树里哪些指针是空的，所以三种次序共用同一套改指针规则。
 */

export type ThreadOrder = 'inorder' | 'preorder' | 'postorder';

export type ThreadPhase =
  | 'init'
  | 'visit'
  | 'thread-left'
  | 'thread-right'
  | 'advance'
  | 'link-last'
  | 'link-head'
  | 'finish'
  | 'done';

export interface ThreadNodePos {
  id: string;
  label: string;
  x: number;
  y: number;
}

export const HEAD_ID = 'head';

/** 动画画布尺寸，组件按这个尺寸算虚线两端的缩进。 */
export const THREAD_CANVAS = { width: 680, height: 440 };

/** 中序和先序带上了头结点，后序不带头结点，所以后序裁掉画布顶部一段。 */
export const THREAD_VIEWBOX_WITH_HEAD = '0 0 680 440';
export const THREAD_VIEWBOX_HEADLESS = '0 88 680 352';

export const THREAD_NODES: ThreadNodePos[] = [
  { id: HEAD_ID, label: '头', x: 340, y: 44 },
  { id: 'A', label: 'A', x: 340, y: 132 },
  { id: 'B', label: 'B', x: 200, y: 216 },
  { id: 'C', label: 'C', x: 480, y: 216 },
  { id: 'D', label: 'D', x: 110, y: 300 },
  { id: 'E', label: 'E', x: 390, y: 300 },
  { id: 'F', label: 'F', x: 560, y: 300 },
  { id: 'G', label: 'G', x: 215, y: 384 },
];

export const TREE_NODE_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** 原树里的孩子指针，画图时始终保留。 */
export const TREE_EDGES: Array<[string, string]> = [
  ['A', 'B'],
  ['A', 'C'],
  ['B', 'D'],
  ['C', 'E'],
  ['C', 'F'],
  ['D', 'G'],
];

export const TREE_LEFT: Record<string, string | undefined> = {
  A: 'B',
  B: 'D',
  C: 'E',
  D: undefined,
  E: undefined,
  F: undefined,
  G: undefined,
};

export const TREE_RIGHT: Record<string, string | undefined> = {
  A: 'C',
  B: undefined,
  C: 'F',
  D: 'G',
  E: undefined,
  F: undefined,
  G: undefined,
};

export interface ThreadPoint {
  cx: number;
  cy: number;
}

export interface ThreadEdge {
  id: string;
  from: string;
  to: string;
  /** 曲线控制点，缺省时走直线。 */
  curve?: ThreadPoint;
}

export interface ThreadTagState {
  ltag: number;
  rtag: number;
}

export interface ThreadStep {
  order: ThreadOrder;
  phase: ThreadPhase;
  /** 当前正在访问的结点。 */
  focus: string | null;
  /** pre 前驱指针，可能指向头结点，也可能为空。 */
  pre: string | null;
  /** 截至这一步已经生成的全部线索。 */
  threads: ThreadEdge[];
  /** 每个结点的标志位快照。 */
  tags: Record<string, ThreadTagState>;
  /** 已经访问过的结点，按访问顺序排列。 */
  visited: string[];
  /** 这一步新长出来的线索，画面上短暂加粗。 */
  fresh: string | null;
  description: string;
}

export interface ThreadTrace {
  order: ThreadOrder;
  hasHead: boolean;
  steps: ThreadStep[];
  visitOrder: string[];
  threadCount: number;
  nodeIds: string[];
}

export const ORDER_LABELS: Record<ThreadOrder, string> = {
  inorder: '中序',
  preorder: '先序',
  postorder: '后序',
};

/**
 * 需要绕开结点的几条长虚线：头结点和最后一个结点之间来回两条，中序里 D 到头的左线索，
 * 先序里 G 到 C 的后继线索。控制点把曲线推到结点外侧。
 */
const CURVES: Record<ThreadOrder, Record<string, ThreadPoint>> = {
  inorder: {
    'D-l': { cx: 58, cy: 138 },
    'F-r': { cx: 636, cy: 118 },
    'head-r': { cx: 664, cy: 176 },
  },
  preorder: {
    'G-r': { cx: 318, cy: 338 },
    'F-r': { cx: 636, cy: 118 },
    'head-r': { cx: 664, cy: 176 },
  },
  postorder: {},
};

function collectOrder(order: ThreadOrder, id: string | undefined, out: string[]): void {
  if (!id) return;
  const left = TREE_LEFT[id];
  const right = TREE_RIGHT[id];
  if (order === 'preorder') {
    out.push(id);
    collectOrder(order, left, out);
    collectOrder(order, right, out);
    return;
  }
  if (order === 'inorder') {
    collectOrder(order, left, out);
    out.push(id);
    collectOrder(order, right, out);
    return;
  }
  collectOrder(order, left, out);
  collectOrder(order, right, out);
  out.push(id);
}

function cloneTags(tags: Record<string, ThreadTagState>): Record<string, ThreadTagState> {
  const copy: Record<string, ThreadTagState> = {};
  for (const [id, value] of Object.entries(tags)) copy[id] = { ...value };
  return copy;
}

export function createThreadTrace(order: ThreadOrder): ThreadTrace {
  const visitOrder: string[] = [];
  collectOrder(order, 'A', visitOrder);

  const hasHead = order !== 'postorder';
  const orderLabel = ORDER_LABELS[order];
  let pre: string | null = hasHead ? HEAD_ID : null;

  const threads: ThreadEdge[] = [];
  const tags: Record<string, ThreadTagState> = {};
  for (const id of TREE_NODE_IDS) tags[id] = { ltag: 0, rtag: 0 };
  if (hasHead) tags[HEAD_ID] = { ltag: 0, rtag: 1 };

  const visited: string[] = [];
  const steps: ThreadStep[] = [];

  function snapshot(
    phase: ThreadPhase,
    focus: string | null,
    description: string,
    fresh: string | null = null,
  ): void {
    steps.push({
      order,
      phase,
      focus,
      pre,
      threads: threads.map((edge) => ({ ...edge })),
      tags: cloneTags(tags),
      visited: [...visited],
      fresh,
      description,
    });
  }

  if (hasHead) {
    snapshot(
      'init',
      HEAD_ID,
      `先把头结点的 lchild 指向根结点 A，rtag 置 1 表示 rchild 当线索用，然后让 pre 指向头结点，开始${orderLabel}线索化。`,
    );
  } else {
    snapshot(
      'init',
      'A',
      `后序线索树不带头结点，先把 pre 置空，再从根结点 A 开始${orderLabel}线索化。`,
    );
  }

  for (const id of visitOrder) {
    const left = TREE_LEFT[id];
    const right = TREE_RIGHT[id];
    visited.push(id);

    if (pre === null) {
      snapshot('visit', id, `访问 ${id}，pre 还是空的。${id} 是第一个结点，没有前驱可以指，左指针先保持空。`);
    } else if (pre === HEAD_ID) {
      snapshot('visit', id, `访问 ${id}，pre 停在头结点。`);
    } else {
      snapshot('visit', id, `访问 ${id}，pre 停在 ${pre}。`);
    }

    if (!left && pre !== null) {
      const edge: ThreadEdge = {
        id: `${id}-l`,
        from: id,
        to: pre,
        curve: CURVES[order][`${id}-l`],
      };
      threads.push(edge);
      tags[id].ltag = 1;
      snapshot(
        'thread-left',
        id,
        `${id} 没有左孩子，把 lchild 改成指向${pre === HEAD_ID ? '头结点' : ` ${pre} `}的前驱线索，ltag 置 1。`,
        edge.id,
      );
    }

    if (pre !== null && pre !== HEAD_ID && !TREE_RIGHT[pre]) {
      const edge: ThreadEdge = {
        id: `${pre}-r`,
        from: pre,
        to: id,
        curve: CURVES[order][`${pre}-r`],
      };
      threads.push(edge);
      tags[pre].rtag = 1;
      snapshot(
        'thread-right',
        id,
        `pre 停在 ${pre}，${pre} 的右指针空着，把 rchild 改成指向 ${id} 的后继线索，rtag 置 1。`,
        edge.id,
      );
    }

    void right;
    pre = id;
    snapshot('advance', id, `pre 后移到 ${id}。`);
  }

  if (hasHead) {
    const last = visitOrder[visitOrder.length - 1];
    const lastEdge: ThreadEdge = {
      id: `${last}-r`,
      from: last,
      to: HEAD_ID,
      curve: CURVES[order][`${last}-r`],
    };
    threads.push(lastEdge);
    tags[last].rtag = 1;
    snapshot(
      'link-last',
      last,
      `${orderLabel}遍历结束，pre 停在最后一个结点 ${last}。把 ${last} 的 rchild 指向头结点，rtag 置 1。`,
      lastEdge.id,
    );

    const headEdge: ThreadEdge = {
      id: 'head-r',
      from: HEAD_ID,
      to: last,
      curve: CURVES[order]['head-r'],
    };
    threads.push(headEdge);
    snapshot(
      'link-head',
      last,
      `头结点的 rchild 指向最后一个结点 ${last}，这样从最后一个结点也能顺着线索回到头结点。`,
      headEdge.id,
    );
  } else {
    snapshot(
      'finish',
      'A',
      '后序遍历结束，pre 停在根结点 A。A 的右指针还指向右孩子 C，不是空的，所以后序线索树不接头结点，根结点的右指针留给孩子。',
    );
  }

  snapshot(
    'done',
    null,
    `线索化完成，一共生成 ${threads.length} 条线索，原来空着的指针都指向了前驱或后继。`,
  );

  return {
    order,
    hasHead,
    steps,
    visitOrder,
    threadCount: threads.length,
    nodeIds: [...TREE_NODE_IDS],
  };
}
