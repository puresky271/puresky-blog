export const FENWICK_VALUES = [1, 7, 3, 0, 5, 8, 3, 2, 6, 2, 1, 1, 4, 5] as const;
export const FENWICK_LIMITS = { minIndex: 1, maxIndex: FENWICK_VALUES.length, minDelta: -9, maxDelta: 9 } as const;

export interface FenwickRange {
  start: number;
  end: number;
}

export interface FenwickQueryStep {
  phase: 'start' | 'accumulate' | 'done';
  index: number;
  lowbit: number;
  range: FenwickRange | null;
  nextIndex: number;
  sum: number;
  coveredRanges: FenwickRange[];
  description: string;
}

export interface FenwickUpdateStep {
  phase: 'start' | 'update' | 'done';
  index: number;
  lowbit: number;
  range: FenwickRange | null;
  nextIndex: number;
  values: number[];
  tree: number[];
  updatedIndices: number[];
  description: string;
}

export interface FenwickQueryTrace {
  target: number;
  tree: number[];
  steps: FenwickQueryStep[];
}

export interface FenwickUpdateTrace {
  index: number;
  delta: number;
  steps: FenwickUpdateStep[];
}

export function lowbit(value: number) {
  return value & -value;
}

export function fenwickRange(index: number): FenwickRange {
  return { start: index - lowbit(index) + 1, end: index };
}

function buildTree() {
  const tree = Array<number>(FENWICK_VALUES.length + 1).fill(0);
  FENWICK_VALUES.forEach((value, offset) => {
    let index = offset + 1;
    while (index < tree.length) {
      tree[index] += value;
      index += lowbit(index);
    }
  });
  return tree;
}

function validateIndex(index: number) {
  if (!Number.isInteger(index) || index < FENWICK_LIMITS.minIndex || index > FENWICK_LIMITS.maxIndex) {
    throw new Error(`下标请输入 ${FENWICK_LIMITS.minIndex} 到 ${FENWICK_LIMITS.maxIndex} 之间的整数。`);
  }
}

export function createFenwickQueryTrace(index: number): FenwickQueryTrace {
  validateIndex(index);
  const tree = buildTree();
  const coveredRanges: FenwickRange[] = [];
  const steps: FenwickQueryStep[] = [{
    phase: 'start',
    index,
    lowbit: 0,
    range: null,
    nextIndex: index,
    sum: 0,
    coveredRanges: [],
    description: `目标是求前缀 [1, ${index}] 的和。从下标 ${index} 开始，累计和 sum = 0。`,
  }];
  let current = index;
  let sum = 0;

  while (current > 0) {
    const range = fenwickRange(current);
    const bit = lowbit(current);
    const nextIndex = current - bit;
    sum += tree[current];
    coveredRanges.push(range);
    steps.push({
      phase: 'accumulate',
      index: current,
      lowbit: bit,
      range: { ...range },
      nextIndex,
      sum,
      coveredRanges: coveredRanges.map((item) => ({ ...item })),
      description: nextIndex === 0
        ? `tree[${current}] 管辖 [${range.start}, ${range.end}]，累加 ${tree[current]} 后 sum = ${sum}。${current} - ${bit} = 0，前缀已经拼齐。`
        : `tree[${current}] 管辖 [${range.start}, ${range.end}]，累加 ${tree[current]} 后 sum = ${sum}。执行 ${current} - ${bit} = ${nextIndex}，继续求 [1, ${nextIndex}]。`,
    });
    current = nextIndex;
  }

  steps.push({
    phase: 'done',
    index: 0,
    lowbit: 0,
    range: null,
    nextIndex: 0,
    sum,
    coveredRanges: coveredRanges.map((item) => ({ ...item })),
    description: `下标到达 0，查询结束。这些区间无缝拼成 [1, ${index}]，前缀和为 ${sum}。`,
  });
  return { target: index, tree, steps };
}

export function createFenwickUpdateTrace(index: number, delta: number): FenwickUpdateTrace {
  validateIndex(index);
  if (!Number.isInteger(delta) || delta < FENWICK_LIMITS.minDelta || delta > FENWICK_LIMITS.maxDelta || delta === 0) {
    throw new Error(`增量请输入 ${FENWICK_LIMITS.minDelta} 到 ${FENWICK_LIMITS.maxDelta} 之间的非零整数。`);
  }

  const values: number[] = [...FENWICK_VALUES];
  const tree = buildTree();
  const updatedIndices: number[] = [];
  const steps: FenwickUpdateStep[] = [{
    phase: 'start',
    index,
    lowbit: 0,
    range: null,
    nextIndex: index,
    values: [...values],
    tree: [...tree],
    updatedIndices: [],
    description: `准备让 a[${index}] 增加 ${delta}。所有管辖 a[${index}] 的 tree 区间都必须同步增加 ${delta}。`,
  }];
  let current = index;

  while (current <= FENWICK_VALUES.length) {
    const range = fenwickRange(current);
    const bit = lowbit(current);
    const nextIndex = current + bit;
    values[index - 1] = FENWICK_VALUES[index - 1] + delta;
    tree[current] += delta;
    updatedIndices.push(current);
    steps.push({
      phase: 'update',
      index: current,
      lowbit: bit,
      range: { ...range },
      nextIndex,
      values: [...values],
      tree: [...tree],
      updatedIndices: [...updatedIndices],
      description: nextIndex > FENWICK_VALUES.length
        ? `tree[${current}] 管辖 [${range.start}, ${range.end}]，包含 a[${index}]，所以更新为 ${tree[current]}。下一下标 ${nextIndex} 超出数组范围。`
        : `tree[${current}] 管辖 [${range.start}, ${range.end}]，包含 a[${index}]，所以更新为 ${tree[current]}。执行 ${current} + ${bit} = ${nextIndex}，寻找更大的覆盖区间。`,
    });
    current = nextIndex;
  }

  steps.push({
    phase: 'done',
    index: current,
    lowbit: 0,
    range: null,
    nextIndex: current,
    values: [...values],
    tree: [...tree],
    updatedIndices: [...updatedIndices],
    description: `下标 ${current} 大于 n = ${FENWICK_VALUES.length}，更新结束。所有包含 a[${index}] 的区间都已增加 ${delta}。`,
  });
  return { index, delta, steps };
}
