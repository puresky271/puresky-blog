/**
 * 线索二叉树的遍历：中序、先序顺着后继走，后序顺着前驱倒着走。
 *
 * 树、线索和标志位都直接取 createThreadTrace 最后一步的快照，保证遍历演示
 * 用的就是前面线索化动画造出来的那棵线索树。
 */

import {
  createThreadTrace,
  HEAD_ID,
  TREE_LEFT,
  TREE_RIGHT,
  type ThreadEdge,
  type ThreadOrder,
  type ThreadTagState,
} from './thread-build';

export interface ThreadTrail {
  from: string;
  to: string;
  /** 这一步走的是孩子指针（实线）还是线索（虚线）。 */
  kind: 'child' | 'thread';
}

export type TraversePhase = 'start' | 'descend' | 'visit' | 'done';

export interface TraverseStep {
  order: ThreadOrder;
  /** 当前指针 p 停在哪个结点。 */
  focus: string | null;
  /** 到达当前结点走的那条线。 */
  trail: ThreadTrail | null;
  /** 截至这一步已经访问（后序是已经收集）的结点。 */
  visited: string[];
  phase: TraversePhase;
  description: string;
}

export interface TraverseTrace {
  order: ThreadOrder;
  hasHead: boolean;
  /** 后序是倒着走、最后再翻过来。 */
  reverse: boolean;
  steps: TraverseStep[];
  /** 最终输出顺序。 */
  visitOrder: string[];
  nodeIds: string[];
  threads: ThreadEdge[];
  tags: Record<string, ThreadTagState>;
}

export function createTraverseTrace(order: ThreadOrder): TraverseTrace {
  const build = createThreadTrace(order);
  const finalStep = build.steps[build.steps.length - 1];
  const tags = finalStep.tags;
  const threads = finalStep.threads;

  const steps: TraverseStep[] = [];
  const visited: string[] = [];

  function push(
    focus: string | null,
    trail: ThreadTrail | null,
    phase: TraversePhase,
    description: string,
    visit = false,
  ): void {
    if (visit && focus) visited.push(focus);
    steps.push({ order, focus, trail, visited: [...visited], phase, description });
  }

  /** ltag 或 rtag 是 1 时，指针里存的是线索，目标要从已经建好的线索里取。 */
  function threadTarget(p: string, side: 'l' | 'r'): string | null {
    const edge = threads.find((item) => item.id === `${p}-${side}`);
    return edge ? edge.to : null;
  }

  if (order === 'inorder') {
    push('A', null, 'start', '从头结点的 lchild 拿到根 A，先顺着左孩子一路往左下，找中序的第一个结点。');
    let p = 'A';
    while (TREE_LEFT[p]) {
      const next = TREE_LEFT[p]!;
      const first = !TREE_LEFT[next];
      push(
        next,
        { from: p, to: next, kind: 'child' },
        first ? 'visit' : 'descend',
        first
          ? `${p} 的左孩子是 ${next}，${next} 没有左孩子，它就是中序的第一个结点，访问 ${next}。`
          : `${p} 的 ltag 是 0，往左孩子 ${next} 走。`,
        first,
      );
      p = next;
    }

    while (true) {
      if (tags[p].rtag === 1) {
        const next = threadTarget(p, 'r')!;
        if (next === HEAD_ID) {
          push(
            HEAD_ID,
            { from: p, to: next, kind: 'thread' },
            'done',
            `${p} 的 rtag 是 1，rchild 是后继线索，指向头结点，遍历结束。`,
          );
          break;
        }
        push(
          next,
          { from: p, to: next, kind: 'thread' },
          'visit',
          `${p} 的 rtag 是 1，rchild 是指向后继的线索，顺着虚线直接跳到后继 ${next}，访问 ${next}。`,
          true,
        );
        p = next;
        continue;
      }

      // rtag 是 0：进右子树，再一路往左下找后继
      let cur = TREE_RIGHT[p]!;
      let trail: ThreadTrail = { from: p, to: cur, kind: 'child' };
      let firstArrival = true;
      while (true) {
        const child = TREE_LEFT[cur];
        if (!child) {
          push(
            cur,
            trail,
            'visit',
            firstArrival
              ? `${p} 的 rtag 是 0，右孩子 ${cur} 没有左孩子，${cur} 就是后继，访问 ${cur}。`
              : `${p} 的 rtag 是 0，右子树一路往左下，${cur} 没有左孩子，它就是后继，访问 ${cur}。`,
            true,
          );
          p = cur;
          break;
        }
        push(
          cur,
          trail,
          'descend',
          firstArrival
            ? `${p} 的 rtag 是 0，要进右子树找最左下的结点，先走到右孩子 ${cur}。`
            : `${cur} 有左孩子 ${child}，继续往左下走。`,
        );
        trail = { from: cur, to: child, kind: 'child' };
        cur = child;
        firstArrival = false;
      }
    }
  } else if (order === 'preorder') {
    push('A', null, 'start', '先序的第一个结点就是根 A，访问 A。', true);
    let p = 'A';

    while (true) {
      let next: string;
      let kind: 'child' | 'thread';
      let rule: string;

      if (tags[p].ltag === 0) {
        next = TREE_LEFT[p]!;
        kind = 'child';
        rule = `${p} 有左孩子，ltag 是 0，后继就是左孩子 ${next}。`;
      } else if (tags[p].rtag === 0) {
        next = TREE_RIGHT[p]!;
        kind = 'child';
        rule = `${p} 没有左孩子，rtag 是 0，后继是右孩子 ${next}。`;
      } else {
        next = threadTarget(p, 'r')!;
        kind = 'thread';
        rule = `${p} 的 ltag 和 rtag 都是 1，rchild 是后继线索，顺着虚线跳到 ${next}。`;
      }

      if (next === HEAD_ID) {
        push(
          HEAD_ID,
          { from: p, to: next, kind },
          'done',
          `${p} 的 rchild 是指向头结点的线索，遍历结束。`,
        );
        break;
      }

      push(next, { from: p, to: next, kind }, 'visit', `${rule} 访问 ${next}。`, true);
      p = next;
    }
  } else {
    push(
      'A',
      null,
      'start',
      '后序线索树不带头结点，根 A 就是后序的最后一个结点。先收集 A，再顺着前驱倒着走。',
      true,
    );
    let p = 'A';

    while (true) {
      let prev: string | null;
      let kind: 'child' | 'thread';
      let rule: string;

      if (tags[p].rtag === 0) {
        prev = TREE_RIGHT[p]!;
        kind = 'child';
        rule = `${p} 的 rtag 是 0，前驱就是右孩子 ${prev}。`;
      } else if (tags[p].ltag === 0) {
        prev = TREE_LEFT[p]!;
        kind = 'child';
        rule = `${p} 没有右孩子，ltag 是 0，前驱是左孩子 ${prev}。`;
      } else {
        prev = threadTarget(p, 'l');
        kind = 'thread';
        rule = prev
          ? `${p} 的 ltag 和 rtag 都是 1，lchild 是前驱线索，顺着虚线跳到 ${prev}。`
          : '';
      }

      if (!prev) {
        push(
          null,
          null,
          'done',
          `${p} 的 lchild 是空的，没有前驱可以走了。把倒着收集的顺序反过来，就是后序序列。`,
        );
        break;
      }

      push(prev, { from: p, to: prev, kind }, 'visit', `${rule} 收集 ${prev}。`, true);
      p = prev;
    }
  }

  const reverse = order === 'postorder';
  return {
    order,
    hasHead: build.hasHead,
    reverse,
    steps,
    visitOrder: reverse ? [...visited].reverse() : [...visited],
    nodeIds: [...build.nodeIds],
    threads,
    tags,
  };
}
