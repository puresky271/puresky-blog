/**
 * 图的深度优先遍历（DFS）演示数据。
 *
 * 文章里的例子是一棵一般树：A 连着 B C D，B 连着 E F G，D 连着 I K。
 * 这里预生成一套不可变步骤快照，组件只负责按快照画图，播放器不会改动算法内部状态。
 */

export interface DfsNode {
  id: string;
  x: number;
  y: number;
  /** 孩子的顺序就是 DFS 尝试的顺序。 */
  children: string[];
}

export interface DfsEdge {
  key: string;
  from: string;
  to: string;
}

export interface DfsStackFrame {
  id: string;
  /** 下一个要探索的孩子下标。等于孩子数量时表示这一层已经探完。 */
  next: number;
}

export type DfsPhase = 'start' | 'descend' | 'backtrack' | 'done';

export interface DfsStep {
  phase: DfsPhase;
  /** 这一步结束后站在哪个结点。 */
  current: string | null;
  /** 这一步新访问的结点，用来触发结点亮起。 */
  fresh: string | null;
  /** 这一步移动的边。下探是父到子，回溯是子到父。 */
  activeEdge: [string, string] | null;
  /** 截至这一步的访问顺序。 */
  visitOrder: string[];
  /** 从根到 current 的路径，也就是当前递归栈里的结点。 */
  path: string[];
  /** 递归调用栈，栈顶在数组末尾。 */
  stack: DfsStackFrame[];
  description: string;
}

export interface DfsTrace {
  root: string;
  steps: DfsStep[];
  nodeIds: string[];
  /** 完整访问顺序。 */
  result: string[];
}

/** 树在 SVG 里的画布尺寸。结点坐标是 viewBox 坐标。 */
export const DFS_VIEWBOX = { width: 440, height: 330 } as const;

/**
 * 结点布局照着文章里的图摆：A 在顶上，B C D 是第二层，B 的三个孩子和 D 的两个孩子在最下面。
 * 坐标取了整数，缩放时不容易出现半像素的模糊边。
 */
export const DFS_NODES: DfsNode[] = [
  { id: 'A', x: 220, y: 46, children: ['B', 'C', 'D'] },
  { id: 'B', x: 128, y: 152, children: ['E', 'F', 'G'] },
  { id: 'C', x: 220, y: 152, children: [] },
  { id: 'D', x: 320, y: 152, children: ['I', 'K'] },
  { id: 'E', x: 60, y: 268, children: [] },
  { id: 'F', x: 128, y: 268, children: [] },
  { id: 'G', x: 196, y: 268, children: [] },
  { id: 'I', x: 298, y: 268, children: [] },
  { id: 'K', x: 374, y: 268, children: [] },
];

export const DFS_NODE_MAP = new Map(DFS_NODES.map((node) => [node.id, node]));

export const DFS_EDGES: DfsEdge[] = DFS_NODES.flatMap((node) =>
  node.children.map((child) => ({ key: `${node.id}>${child}`, from: node.id, to: child })),
);

export const DFS_TOTAL = DFS_NODES.length;

const ROOT = 'A';

const ROOT_NOTE = '从根结点 A 出发，先访问 A。A 连着 B，C，D 三个结点，把它们记在栈里，挑第一个往下走。';

const DESCEND_NOTES: Record<string, string> = {
  'A>B': 'A 的第一个邻居 B 还没访问，沿着 A 到 B 的边走，访问 B。',
  'B>E': 'B 有三个孩子，先挑最左边的 E，继续深入，访问 E。',
  'B>F': 'B 的 E 已经探完了，现在从 B 走下一个孩子 F，访问 F。',
  'B>G': 'B 只剩最后一个孩子 G 没走，深入 G，访问 G。',
  'A>C': 'A 的下一个邻居 C 还没访问，深入 C，访问 C。',
  'A>D': 'A 只剩最后一个邻居 D 没走，深入 D，访问 D。',
  'D>I': 'D 有两个孩子，先走左边的 I，访问 I。',
  'D>K': 'D 还剩右边的 K 没走，深入 K，访问 K。',
};

const BACKTRACK_NOTES: Record<string, string> = {
  'E>B': 'E 没有别的邻居，这条支路走到黑了。沿着原路退回 B，看看 B 还有没有没走的分支。',
  'F>B': 'F 也没有邻居，同样退回 B。',
  'G>B': 'G 是死路，退回 B。',
  'B>A': 'B 的三个孩子全部走完了，B 这边再没有新路，退回 A。',
  'C>A': 'C 没有邻居，退回 A。',
  'I>D': 'I 没有邻居，退回 D。',
  'K>D': 'K 是死路，退回 D。',
  'D>A': 'D 的孩子也全部走完了，退回 A。',
};

const DONE_NOTE = '栈空了，A 下面每一条路都走到底又退回来了。DFS 结束，访问顺序是 A，B，E，F，G，C，D，I，K。';

/**
 * 生成一遍完整的 DFS 步骤。
 *
 * 每一步只记录“画面需要什么”：站在哪，走过哪些边，栈里留了哪些分叉点，访问到谁。
 * 递归的写法在纸面上是函数调用，这里显式维护一个栈，记录每一层还有哪个孩子没试。
 */
export function createDfsTrace(): DfsTrace {
  const steps: DfsStep[] = [];
  const visitOrder: string[] = [];
  const stack: DfsStackFrame[] = [];
  const path: string[] = [];

  function record(
    phase: DfsPhase,
    activeEdge: [string, string] | null,
    fresh: string | null,
    description: string,
  ) {
    steps.push({
      phase,
      current: path.at(-1) ?? null,
      fresh,
      activeEdge,
      visitOrder: [...visitOrder],
      path: [...path],
      stack: stack.map((frame) => ({ ...frame })),
      description,
    });
  }

  function walk(id: string, parent: string | null) {
    visitOrder.push(id);
    path.push(id);
    stack.push({ id, next: 0 });

    const node = DFS_NODE_MAP.get(id)!;
    record(
      parent ? 'descend' : 'start',
      parent ? [parent, id] : null,
      id,
      parent ? (DESCEND_NOTES[`${parent}>${id}`] ?? `深入 ${id}，访问 ${id}。`) : ROOT_NOTE,
    );

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      stack[stack.length - 1].next = index;
      walk(child, id);

      // 孩子已经访问完并弹出，回到这一层：把分叉点的指针挪到下一个孩子，记一次回溯。
      stack[stack.length - 1].next = index + 1;
      record('backtrack', [child, id], null, BACKTRACK_NOTES[`${child}>${id}`] ?? `从 ${child} 退回 ${id}。`);
    }

    stack.pop();
    path.pop();
  }

  walk(ROOT, null);
  record('done', null, null, DONE_NOTE);

  return {
    root: ROOT,
    steps,
    nodeIds: DFS_NODES.map((node) => node.id),
    result: [...visitOrder],
  };
}
