import { DFS_EDGES, DFS_NODE_MAP, DFS_NODES } from './graph-dfs';

export type BfsPhase = 'start' | 'dequeue' | 'enqueue' | 'done';

export interface BfsStep {
  phase: BfsPhase;
  /** 出队时是当前结点，入队时是刚发现的孩子。 */
  focus: string | null;
  /** 这一步新访问的结点。 */
  fresh: string | null;
  /** 发现孩子时经过的树边。 */
  activeEdge: [string, string] | null;
  /** 队列内容，队头在数组开头。 */
  queue: string[];
  /** 截至这一步的访问顺序。 */
  visitOrder: string[];
  /** 当前焦点所在的层，从 1 开始。 */
  level: number | null;
  description: string;
}

export interface BfsTrace {
  steps: BfsStep[];
  nodeIds: string[];
  result: string[];
}

export const BFS_NODES = DFS_NODES;
export const BFS_EDGES = DFS_EDGES;

const LEVELS = new Map([
  ['A', 1],
  ['B', 2],
  ['C', 2],
  ['D', 2],
  ['E', 3],
  ['F', 3],
  ['G', 3],
  ['I', 3],
  ['K', 3],
]);

const DEQUEUE_NOTES: Record<string, string> = {
  A: '队头 A 出队并访问。接下来按 B，C，D 的顺序发现它的孩子，让它们依次排到队尾。',
  B: '队头 B 出队并访问。C 和 D 还排在前面，所以先把第 2 层处理完，再轮到 B 的孩子。',
  C: '队头 C 出队并访问。C 没有孩子，队列继续向前，不会回头走到别的分支。',
  D: '队头 D 出队并访问。到这里第 2 层全部处理完，D 的孩子 I 和 K 排到第 3 层的队尾。',
  E: '队头 E 出队并访问。E 是叶子，没有新结点需要入队。',
  F: '队头 F 出队并访问。同一层的结点仍按入队先后依次处理。',
  G: '队头 G 出队并访问。B 的三个孩子已经全部访问过了。',
  I: '队头 I 出队并访问。它是 D 先发现的孩子，所以排在 K 前面。',
  K: '队头 K 出队并访问。队列已经空了，所有能到达的结点都访问完毕。',
};

const ENQUEUE_NOTES: Record<string, string> = {
  B: '发现 A 的第一个孩子 B，把它标成已发现并入队。B 位于第 2 层。',
  C: '发现 A 的第二个孩子 C，排到 B 后面。先入队的 B 会先出队。',
  D: '发现 A 的最后一个孩子 D，第 2 层的三个结点现在都在队列里。',
  E: '发现 B 的第一个孩子 E，排到 C 和 D 后面，不会插到它们前面。',
  F: '发现 B 的第二个孩子 F，继续排到队尾。',
  G: '发现 B 的最后一个孩子 G。此时队列是 C，D，E，F，G。',
  I: '发现 D 的第一个孩子 I，排在 E，F，G 后面。',
  K: '发现 D 的最后一个孩子 K，第 3 层的五个结点已经全部入队。',
};

/** 与 DFS 演示共用同一棵树，按“出队一个，发现的孩子依次入队”生成完整步骤。 */
export function createBfsTrace(): BfsTrace {
  const steps: BfsStep[] = [];
  const queue: string[] = [];
  const visitOrder: string[] = [];
  const discovered = new Set<string>();

  function record(
    phase: BfsPhase,
    focus: string | null,
    fresh: string | null,
    activeEdge: [string, string] | null,
    description: string,
  ) {
    steps.push({
      phase,
      focus,
      fresh,
      activeEdge,
      queue: [...queue],
      visitOrder: [...visitOrder],
      level: focus ? (LEVELS.get(focus) ?? null) : null,
      description,
    });
  }

  queue.push('A');
  discovered.add('A');
  record('start', 'A', null, null, '从 A 出发，把它标成已发现并入队。A 是第 1 层唯一的结点。');

  while (queue.length > 0) {
    const id = queue.shift()!;
    visitOrder.push(id);
    record('dequeue', id, id, null, DEQUEUE_NOTES[id]);

    for (const child of DFS_NODE_MAP.get(id)!.children) {
      if (discovered.has(child)) continue;
      discovered.add(child);
      queue.push(child);
      record('enqueue', child, null, [id, child], ENQUEUE_NOTES[child]);
    }
  }

  record('done', null, null, null, '队列空了，BFS 结束。访问顺序是 A，B，C，D，E，F，G，I，K。');

  return {
    steps,
    nodeIds: BFS_NODES.map((node) => node.id),
    result: [...visitOrder],
  };
}
