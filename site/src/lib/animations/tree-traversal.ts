import { EXAMPLE_TREE, TREE_NODES, type TreeNode } from './tree-example';

export type TraversalOrder = 'preorder' | 'inorder' | 'postorder';
export type TraversalMethod = 'recursive' | 'iterative';

export type TraversalPhase =
  | 'enter'
  | 'visit'
  | 'descend'
  | 'return'
  | 'push'
  | 'pop'
  | 'go-right'
  | 'done';

export type FrameStage = 'visit' | 'left' | 'right' | 'return' | 'pending';

export interface TreeFrame {
  id: string;
  /** 递归帧表示函数执行到哪一步；迭代帧统一为 pending。 */
  stage: FrameStage;
}

export interface TraversalStep {
  order: TraversalOrder;
  method: TraversalMethod;
  phase: TraversalPhase;
  /** 当前步骤最值得关注的结点。 */
  focus: string | null;
  /** 当前步骤对应的树边，用于在图上高亮走向。 */
  activeEdge: [string, string] | null;
  /** 递归法为调用栈，迭代法为显式栈，栈顶在数组末尾。 */
  stack: TreeFrame[];
  /** 截至当前步骤已经访问过的结点，按访问顺序排列。 */
  visitOrder: string[];
  description: string;
}

export interface TraversalTrace {
  order: TraversalOrder;
  method: TraversalMethod;
  steps: TraversalStep[];
  /** 完整访问序列，用来撑开进度条的固定槽位。 */
  result: string[];
}

export function createTraversalTrace(order: TraversalOrder, method: TraversalMethod): TraversalTrace {
  if (method === 'iterative') {
    if (order === 'inorder') return buildInorderIterative();
    if (order === 'postorder') return buildPostorderIterative();
    return buildPreorderIterative();
  }

  if (order === 'inorder') return buildInorderRecursive();
  if (order === 'postorder') return buildPostorderRecursive();
  return buildPreorderRecursive();
}

function buildPreorderRecursive(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'preorder',
      method: 'recursive',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  function walk(node: TreeNode, parent: TreeNode | null) {
    const nextStage: FrameStage = node.left ? 'left' : node.right ? 'right' : 'return';
    stack.push({ id: node.id, stage: nextStage });
    visitOrder.push(node.id);

    const sides: string[] = [];
    if (node.left) sides.push('左');
    if (node.right) sides.push('右');
    const plan = sides.length === 0
      ? `${node.id} 没有子结点，访问后直接返回`
      : `先访问 ${node.id}，再依次处理${sides.join('、')}子树`;
    record(
      'enter',
      node.id,
      parent
        ? `调用 preorder(${node.id})：${plan}`
        : `从根结点开始，调用 preorder(${node.id})：${plan}`,
    );

    if (node.left) {
      record(
        'descend',
        node.left.id,
        `${node.id} 的左孩子是 ${node.left.id}，进入左子树`,
        [node.id, node.left.id],
      );
      walk(node.left, node);
    }

    const frame = stack[stack.length - 1];
    if (node.right) {
      frame.stage = 'right';
      const note = node.left
        ? `${node.id} 的左子树访问完毕，进入右子树`
        : `${node.id} 没有左子树，直接进入右子树`;
      record(
        'descend',
        node.right.id,
        `${note}，调用 preorder(${node.right.id})`,
        [node.id, node.right.id],
      );
      walk(node.right, node);
    } else {
      frame.stage = 'return';
    }

    frame.stage = 'return';
    stack.pop();
    if (parent) {
      record(
        'return',
        parent.id,
        `${node.id} 的子树访问完毕，返回父结点 ${parent.id}`,
        [node.id, parent.id],
      );
    } else {
      record('done', null, `根结点 ${node.id} 的子树全部访问完毕，先序遍历结束`);
    }
  }

  walk(EXAMPLE_TREE, null);
  return { order: 'preorder', method: 'recursive', steps, result: [...visitOrder] };
}

function buildInorderRecursive(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'inorder',
      method: 'recursive',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  function walk(node: TreeNode, parent: TreeNode | null) {
    const left = node.left;
    stack.push({
      id: node.id,
      stage: left ? 'left' : node.right ? 'right' : 'return',
    });

    if (left) {
      record('enter', node.id, `调用 inorder(${node.id})：先进入左子树 ${left.id}`);
      record(
        'descend',
        left.id,
        `${node.id} 的左孩子是 ${left.id}，进入左子树`,
        [node.id, left.id],
      );
      walk(left, node);

      const frame = stack[stack.length - 1];
      frame.stage = 'visit';
      visitOrder.push(node.id);
      record('visit', node.id, `回到 ${node.id}，左子树已经访问完，访问 ${node.id}`);
    } else {
      visitOrder.push(node.id);
      record(
        'enter',
        node.id,
        `调用 inorder(${node.id})：${node.id} 没有左子树，直接访问 ${node.id}`,
      );
    }

    const frame = stack[stack.length - 1];
    if (node.right) {
      frame.stage = 'right';
      record(
        'descend',
        node.right.id,
        `${node.id} 的右孩子是 ${node.right.id}，进入右子树`,
        [node.id, node.right.id],
      );
      walk(node.right, node);
    }

    frame.stage = 'return';
    stack.pop();
    if (parent) {
      record(
        'return',
        parent.id,
        `${node.id} 的子树访问完毕，返回父结点 ${parent.id}`,
        [node.id, parent.id],
      );
    } else {
      record('done', null, `根结点 ${node.id} 的子树全部访问完毕，中序遍历结束`);
    }
  }

  walk(EXAMPLE_TREE, null);
  return { order: 'inorder', method: 'recursive', steps, result: [...visitOrder] };
}

function buildPostorderRecursive(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'postorder',
      method: 'recursive',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  function walk(node: TreeNode, parent: TreeNode | null) {
    const left = node.left;
    const right = node.right;
    const leaf = !left && !right;
    stack.push({
      id: node.id,
      stage: left ? 'left' : right ? 'right' : 'return',
    });

    if (leaf) {
      visitOrder.push(node.id);
      record(
        'enter',
        node.id,
        `调用 postorder(${node.id})：${node.id} 没有子结点，直接访问 ${node.id}`,
      );
    } else if (left) {
      record('enter', node.id, `调用 postorder(${node.id})：先进入左子树 ${left.id}`);
      record(
        'descend',
        left.id,
        `${node.id} 的左孩子是 ${left.id}，进入左子树`,
        [node.id, left.id],
      );
      walk(left, node);
    } else {
      record(
        'enter',
        node.id,
        `调用 postorder(${node.id})：${node.id} 没有左子树，先进入右子树 ${right!.id}`,
      );
    }

    if (right) {
      const frame = stack[stack.length - 1];
      frame.stage = 'right';
      const note = left
        ? `${node.id} 的左子树访问完毕，进入右子树`
        : `${node.id} 没有左子树，进入右子树`;
      record('descend', right.id, `${note} ${right.id}`, [node.id, right.id]);
      walk(right, node);
    }

    if (!leaf) {
      const frame = stack[stack.length - 1];
      frame.stage = 'visit';
      visitOrder.push(node.id);
      const note = left && right
        ? `左、右子树都访问完毕，最后访问 ${node.id}`
        : left
          ? `左子树访问完毕，${node.id} 没有右子树，最后访问 ${node.id}`
          : `右子树访问完毕，最后访问 ${node.id}`;
      record('visit', node.id, note);
    }

    const frame = stack[stack.length - 1];
    frame.stage = 'return';
    stack.pop();
    if (parent) {
      record(
        'return',
        parent.id,
        `${node.id} 的子树访问完毕，返回父结点 ${parent.id}`,
        [node.id, parent.id],
      );
    } else {
      record('done', null, `根结点 ${node.id} 的子树全部访问完毕，后序遍历结束`);
    }
  }

  walk(EXAMPLE_TREE, null);
  return { order: 'postorder', method: 'recursive', steps, result: [...visitOrder] };
}

function buildPreorderIterative(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'preorder',
      method: 'iterative',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  stack.push({ id: EXAMPLE_TREE.id, stage: 'pending' });
  record('push', EXAMPLE_TREE.id, '把根结点 a 压入栈，栈顶就是下一步要访问的结点');

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const id = frame.id;
    const node = TREE_NODES.get(id)!;
    visitOrder.push(id);
    record('pop', id, `弹出栈顶 ${id} 并访问它，把 ${id} 追加到访问序列末尾`);

    if (node.right) {
      stack.push({ id: node.right.id, stage: 'pending' });
      record(
        'push',
        node.right.id,
        `${id} 有右孩子，先把右孩子 ${node.right.id} 压入栈，它会晚一些被访问`,
        [id, node.right.id],
      );
    }

    if (node.left) {
      stack.push({ id: node.left.id, stage: 'pending' });
      record(
        'push',
        node.left.id,
        `${id} 有左孩子，再把左孩子 ${node.left.id} 压入栈，它位于栈顶，下一次先被访问`,
        [id, node.left.id],
      );
    }
  }

  record('done', null, '栈已经为空，先序遍历结束');
  return { order: 'preorder', method: 'iterative', steps, result: [...visitOrder] };
}

function buildInorderIterative(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];
  let cur: TreeNode | null = EXAMPLE_TREE;

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'inorder',
      method: 'iterative',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      const node: TreeNode = cur;
      const next: TreeNode | null = node.left ?? null;
      stack.push({ id: node.id, stage: 'pending' });
      record(
        'push',
        node.id,
        next
          ? `把 ${node.id} 压入栈，继续向左孩子 ${next.id} 走`
          : `把 ${node.id} 压入栈，${node.id} 没有左孩子`,
        next ? [node.id, next.id] : null,
      );
      cur = next;
    }

    const frame = stack.pop()!;
    const node = TREE_NODES.get(frame.id)!;
    visitOrder.push(frame.id);
    record('pop', frame.id, `左边走到头，弹出栈顶 ${frame.id} 并访问`);

    if (node.right) {
      cur = node.right;
      record(
        'go-right',
        cur.id,
        `${frame.id} 有右孩子，cur 转向右子树 ${cur.id}`,
        [frame.id, cur.id],
      );
    } else {
      cur = null;
    }
  }

  record('done', null, '栈已经为空，中序遍历结束');
  return { order: 'inorder', method: 'iterative', steps, result: [...visitOrder] };
}

function buildPostorderIterative(): TraversalTrace {
  const steps: TraversalStep[] = [];
  const stack: TreeFrame[] = [];
  const visitOrder: string[] = [];
  let cur: TreeNode | null = EXAMPLE_TREE;
  let last: string | null = null;

  function record(
    phase: TraversalPhase,
    focus: string | null,
    description: string,
    activeEdge: [string, string] | null = null,
  ) {
    steps.push({
      order: 'postorder',
      method: 'iterative',
      phase,
      focus,
      activeEdge,
      stack: stack.map((frame) => ({ ...frame })),
      visitOrder: [...visitOrder],
      description,
    });
  }

  while (cur !== null || stack.length > 0) {
    while (cur !== null) {
      const node: TreeNode = cur;
      const next: TreeNode | null = node.left ?? null;
      stack.push({ id: node.id, stage: 'pending' });
      record(
        'push',
        node.id,
        next
          ? `把 ${node.id} 压入栈，继续向左孩子 ${next.id} 走`
          : `把 ${node.id} 压入栈，${node.id} 没有左孩子`,
        next ? [node.id, next.id] : null,
      );
      cur = next;
    }

    const peek = stack[stack.length - 1];
    const node = TREE_NODES.get(peek.id)!;
    if (node.right && node.right.id !== last) {
      cur = node.right;
      record(
        'go-right',
        cur.id,
        `${peek.id} 的右子树还没访问，cur 转向 ${cur.id}`,
        [peek.id, cur.id],
      );
    } else {
      stack.pop();
      visitOrder.push(peek.id);
      last = peek.id;
      record(
        'pop',
        peek.id,
        node.right
          ? `右子树已经访问完，弹出栈顶 ${peek.id} 并访问，last 更新为 ${peek.id}`
          : `${peek.id} 没有右子树，弹出栈顶 ${peek.id} 并访问，last 更新为 ${peek.id}`,
      );
    }
  }

  record('done', null, '栈已经为空，后序遍历结束');
  return { order: 'postorder', method: 'iterative', steps, result: [...visitOrder] };
}
