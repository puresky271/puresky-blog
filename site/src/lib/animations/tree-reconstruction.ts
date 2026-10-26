export type ReconstructionOrder = 'preorder' | 'postorder';
export type ReconstructionPhase = 'select-root' | 'split' | 'attach' | 'descend' | 'complete' | 'done';
export type SequenceRange = [number, number];

export interface ReconstructionTask {
  root: string;
  side: '整棵树' | '左子树' | '右子树';
}

export interface ReconstructionStep {
  phase: ReconstructionPhase;
  root: string | null;
  sourceRootIndex: number | null;
  inorderRootIndex: number | null;
  sourceRange: SequenceRange | null;
  inorderRange: SequenceRange | null;
  leftRange: SequenceRange | null;
  rightRange: SequenceRange | null;
  placedIds: string[];
  placedEdges: Array<[string, string]>;
  activeEdge: [string, string] | null;
  callStack: ReconstructionTask[];
  description: string;
}

export interface ReconstructionTrace {
  order: ReconstructionOrder;
  source: string[];
  inorder: string[];
  steps: ReconstructionStep[];
}

const INORDER = ['d', 'b', 'e', 'a', 'f', 'c', 'g'];
const SOURCES = {
  preorder: ['a', 'b', 'd', 'e', 'c', 'f', 'g'],
  postorder: ['d', 'e', 'b', 'f', 'g', 'c', 'a'],
};

function emptyRange(start: number, end: number): SequenceRange | null {
  return start > end ? null : [start, end];
}

function rangeText(range: SequenceRange | null, sequence: string[]) {
  return range ? sequence.slice(range[0], range[1] + 1).join(' ') : '空';
}

export function createReconstructionTrace(order: ReconstructionOrder): ReconstructionTrace {
  const source = SOURCES[order];
  const steps: ReconstructionStep[] = [];
  const placedIds: string[] = [];
  const placedEdges: Array<[string, string]> = [];
  const callStack: ReconstructionTask[] = [];

  function record(
    phase: ReconstructionPhase,
    description: string,
    state: Omit<ReconstructionStep, 'phase' | 'placedIds' | 'placedEdges' | 'callStack' | 'description'>,
  ) {
    steps.push({
      ...state,
      phase,
      placedIds: [...placedIds],
      placedEdges: placedEdges.map((edge) => [...edge]),
      callStack: callStack.map((task) => ({ ...task })),
      description,
    });
  }

  function walk(
    sourceRange: SequenceRange,
    inorderRange: SequenceRange,
    parent: string | null,
    side: ReconstructionTask['side'],
  ) {
    const sourceRootIndex = order === 'preorder' ? sourceRange[0] : sourceRange[1];
    const root = source[sourceRootIndex];
    const inorderRootIndex = INORDER.indexOf(root, inorderRange[0]);
    const leftCount = inorderRootIndex - inorderRange[0];
    const rightCount = inorderRange[1] - inorderRootIndex;
    const leftRange = emptyRange(inorderRange[0], inorderRootIndex - 1);
    const rightRange = emptyRange(inorderRootIndex + 1, inorderRange[1]);
    const leftSource = order === 'preorder'
      ? emptyRange(sourceRange[0] + 1, sourceRange[0] + leftCount)
      : emptyRange(sourceRange[0], sourceRange[0] + leftCount - 1);
    const rightSource = order === 'preorder'
      ? emptyRange(sourceRange[0] + leftCount + 1, sourceRange[1])
      : emptyRange(sourceRange[1] - rightCount, sourceRange[1] - 1);

    const base = {
      root,
      sourceRootIndex,
      inorderRootIndex,
      sourceRange,
      inorderRange,
      leftRange,
      rightRange,
      activeEdge: null,
    };
    callStack.push({ root, side });
    record(
      'select-root',
      `${order === 'preorder' ? '先序区间首元素' : '后序区间末元素'}是 ${root}，把它确定为${side}的根`,
      base,
    );
    record(
      'split',
      `中序里的 ${root} 把当前区间分成左子树「${rangeText(leftRange, INORDER)}」和右子树「${rangeText(rightRange, INORDER)}」`,
      base,
    );

    placedIds.push(root);
    const activeEdge: [string, string] | null = parent ? [parent, root] : null;
    if (parent) placedEdges.push([parent, root]);
    record(
      'attach',
      parent ? `把 ${root} 接到 ${parent} 的${side === '左子树' ? '左侧' : '右侧'}` : `把 ${root} 放在重建树的根部`,
      { ...base, activeEdge },
    );

    if (leftSource && leftRange) {
      record(
        'descend',
        `先重建 ${root} 的左子树，对应${order === 'preorder' ? '先序' : '后序'}区间「${rangeText(leftSource, source)}」`,
        { ...base, sourceRange: leftSource, inorderRange: leftRange, leftRange: null, rightRange: null },
      );
      walk(leftSource, leftRange, root, '左子树');
    }

    if (rightSource && rightRange) {
      record(
        'descend',
        `${leftSource ? '左子树已经完成，接着' : '没有左子树，直接'}重建 ${root} 的右子树`,
        { ...base, sourceRange: rightSource, inorderRange: rightRange, leftRange: null, rightRange: null },
      );
      walk(rightSource, rightRange, root, '右子树');
    }

    record(
      'complete',
      `${root} 的左右子树都已处理完，以 ${root} 为根的子树重建完成`,
      base,
    );
    callStack.pop();
  }

  walk([0, source.length - 1], [0, INORDER.length - 1], null, '整棵树');
  record('done', '所有结点都已放到正确的位置，二叉树重建完成', {
    root: null,
    sourceRootIndex: null,
    inorderRootIndex: null,
    sourceRange: null,
    inorderRange: null,
    leftRange: null,
    rightRange: null,
    activeEdge: null,
  });

  return { order, source: [...source], inorder: [...INORDER], steps };
}
