import { EXAMPLE_TREE, TREE_LEVELS, TREE_NODES } from './tree-example';

export type LevelorderPhase = 'enqueue' | 'visit' | 'done';

export interface LevelorderStep {
  phase: LevelorderPhase;
  /** 当前步骤最值得关注的结点。 */
  focus: string | null;
  /** 当前步骤对应的树边，用于在图上高亮走向。 */
  activeEdge: [string, string] | null;
  /** 队列内容，队头在数组开头，队尾在数组末尾。 */
  queue: string[];
  /** 截至当前步骤已经访问过的结点，按访问顺序排列。 */
  visitOrder: string[];
  /** 当前焦点结点所在的层，从 1 开始；结束步骤为 null。 */
  level: number | null;
  description: string;
}

export interface LevelorderTrace {
  steps: LevelorderStep[];
  /** 完整访问序列，用来撑开进度条的固定槽位。 */
  result: string[];
}

export function createLevelorderTrace(): LevelorderTrace {
  const steps: LevelorderStep[] = [];
  const queue: string[] = [];
  const visitOrder: string[] = [];

  function record(
    phase: LevelorderPhase,
    focus: string | null,
    activeEdge: [string, string] | null,
    level: number | null,
    description: string,
  ) {
    steps.push({
      phase,
      focus,
      activeEdge,
      queue: [...queue],
      visitOrder: [...visitOrder],
      level,
      description,
    });
  }

  queue.push(EXAMPLE_TREE.id);
  record('enqueue', EXAMPLE_TREE.id, null, 1, '把根结点 a 入队，开始第 1 层');

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = TREE_NODES.get(id)!;
    const level = TREE_LEVELS.get(id)!;
    visitOrder.push(id);
    record('visit', id, null, level, `队头 ${id} 出队并访问，这是第 ${level} 层`);

    if (node.left) {
      queue.push(node.left.id);
      record(
        'enqueue',
        node.left.id,
        [id, node.left.id],
        TREE_LEVELS.get(node.left.id)!,
        `${id} 的左孩子 ${node.left.id} 入队，排到队尾`,
      );
    }

    if (node.right) {
      queue.push(node.right.id);
      record(
        'enqueue',
        node.right.id,
        [id, node.right.id],
        TREE_LEVELS.get(node.right.id)!,
        `${id} 的右孩子 ${node.right.id} 入队，排到队尾`,
      );
    }
  }

  record('done', null, null, null, '队列已经为空，层序遍历结束');
  return { steps, result: [...visitOrder] };
}
