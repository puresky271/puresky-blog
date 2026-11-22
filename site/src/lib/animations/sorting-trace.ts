/**
 * sorting-trace.ts — 七种比较排序的推进过程，预生成不可变步骤快照。
 *
 * 选择、插入、冒泡、希尔、堆、归并、快速排序都拿同一组默认数据，方便读者横向比较：
 * 有序区怎么长出来，指针怎么走，比较和移动各花了多少次。
 * 每一步只记录画一帧需要的状态，播放定时器只负责移动步骤指针，不碰算法内部状态。
 */

export const SORTING_ALGOS = [
  'selection',
  'insertion',
  'bubble',
  'shell',
  'heap',
  'merge',
  'quick',
] as const;
export type SortingAlgo = (typeof SORTING_ALGOS)[number];

/** 七种算法共用的默认数据。 */
export const SORTING_DEFAULT_VALUES: readonly number[] = Object.freeze([5, 2, 8, 1, 9, 3, 7, 4]);

/** createSortingTrace 接受自定义数组时的限制，主要给自测和将来扩展用。 */
export const SORTING_VALUE_LIMITS = Object.freeze({
  minLength: 1,
  maxLength: 12,
  min: 0,
  max: 99,
});

export interface SortingAlgoInfo {
  /** 算法名，显示在卡片标题里 */
  title: string;
  /** 一句话说明推进方式 */
  brief: string;
  best: string;
  average: string;
  worst: string;
  space: string;
  stable: boolean;
}

export const SORTING_ALGO_INFO: Record<SortingAlgo, SortingAlgoInfo> = {
  selection: {
    title: '选择排序',
    brief: '每一轮从无序区里挑出最小值，换到有序区的末尾，有序区一次长一格。',
    best: 'O(n²)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
  },
  insertion: {
    title: '插入排序',
    brief: '左边始终握着一副已经排好的牌，每一轮把当前元素往前插到正确位置，遇到更小的就停。',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
  },
  bubble: {
    title: '冒泡排序',
    brief: '每一轮比较相邻两个元素，大的往右冒，一轮结束最大值固定到末尾，某一轮没有交换就整体有序。',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
  },
  shell: {
    title: '希尔排序',
    brief: '按不断减半的增量把元素分组做插入排序，远处的小元素一次跳过很多格，增量缩到 1 时收尾。',
    best: 'O(n log n)',
    average: '视增量序列',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
  },
  heap: {
    title: '堆排序',
    brief: '先把整个数组调整成大顶堆，再反复把堆顶换到堆区末尾，堆区缩小后让新堆顶下沉。',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
  },
  merge: {
    title: '归并排序',
    brief: '把数组对半切到底，再用两个读指针把两段有序的区间合并回一个更大的有序区间。',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
  },
  quick: {
    title: '快速排序',
    brief: '取一个基准挖出坑，左右指针交替扫描把小的挪到左边，基准归位后再递归处理两段。',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n)',
    stable: false,
  },
};

export type SortingBandTone = 'sorted' | 'idle' | 'active' | 'heap';

/** 画面上方的一条区间标注，比如有序区、堆区、左半右半。 */
export interface SortingBand {
  from: number;
  to: number;
  label: string;
  tone: SortingBandTone;
}

/** 一个指针标签，指向数组的某个下标。 */
export interface SortingPointer {
  index: number;
  label: string;
}

export interface SortingStep {
  /** 阶段名，显示在步骤说明左侧 */
  phase: string;
  /** 当前这一步的中文说明 */
  description: string;
  /** 当前数组快照 */
  values: readonly number[];
  /** 已经确定有序的闭区间 */
  sortedRanges: ReadonlyArray<readonly [number, number]>;
  bands: readonly SortingBand[];
  /** 正在比较的下标 */
  comparing: readonly number[];
  /** 正在交换或写入的下标 */
  moving: readonly number[];
  /** 快排挖坑法里当前空着的坑 */
  hole: number | null;
  /** 取出来拿在手里的值，插入排序是 key，快排是基准 */
  held: { label: string; value: number } | null;
  pointers: readonly SortingPointer[];
  comparisons: number;
  moves: number;
  /** 堆排序当前有效堆的大小，其他算法是 null */
  heapSize: number | null;
  /** 希尔排序当前的增量，其他算法是 null */
  gap: number | null;
  /** 归并排序的辅助数组，其他算法是 null */
  aux: readonly (number | null)[] | null;
  /** 归并排序当前正在合并的闭区间，其他算法是 null */
  mergeRange: readonly [number, number] | null;
  /** 当前写进辅助数组的下标 */
  auxIndex: number | null;
}

export interface SortingTrace {
  algo: SortingAlgo;
  info: SortingAlgoInfo;
  values: readonly number[];
  steps: readonly SortingStep[];
}

interface RecordInput {
  phase: string;
  description: string;
  bands: readonly SortingBand[];
  comparing?: readonly number[];
  moving?: readonly number[];
  hole?: number | null;
  held?: { label: string; value: number } | null;
  pointers?: readonly SortingPointer[];
  heapSize?: number | null;
  gap?: number | null;
  mergeRange?: readonly [number, number] | null;
  auxIndex?: number | null;
}

function numbersText(values: readonly number[]) {
  return values.join('，');
}

function uniqueIndices(indices: readonly number[]) {
  return indices.filter((index, position) => indices.indexOf(index) === position);
}

function freezeStep(step: SortingStep): SortingStep {
  const sortedRanges = step.sortedRanges.map((range) => Object.freeze([range[0], range[1]] as [number, number]));
  return Object.freeze({
    ...step,
    values: Object.freeze([...step.values]),
    sortedRanges: Object.freeze(sortedRanges),
    bands: Object.freeze(step.bands.map((band) => Object.freeze({ ...band }))),
    comparing: Object.freeze([...step.comparing]),
    moving: Object.freeze([...step.moving]),
    pointers: Object.freeze(step.pointers.map((pointer) => Object.freeze({ ...pointer }))),
    aux: step.aux === null ? null : Object.freeze([...step.aux]),
  });
}

/** 把区间并进有序区间集合里，重叠的就合成一段，相邻但不相交的保留两条。 */
function mergeSortedRanges(ranges: ReadonlyArray<readonly [number, number]>, from: number, to: number) {
  if (from > to) return ranges.map((range) => [range[0], range[1]] as [number, number]);
  const all: Array<[number, number]> = [...ranges.map((range) => [range[0], range[1]] as [number, number]), [from, to]];
  all.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const merged: Array<[number, number]> = [];
  for (const range of all) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

interface Builder {
  readonly a: number[];
  readonly n: number;
  readonly steps: SortingStep[];
  readonly aux: (number | null)[] | null;
  readonly comparisons: number;
  readonly moves: number;
  record(input: RecordInput): void;
  addSorted(from: number, to: number): void;
  addComparison(count?: number): void;
  addMove(count?: number): void;
  clearAux(): void;
}

function createBuilder(algo: SortingAlgo, initialValues: readonly number[]): Builder {
  const a = [...initialValues];
  const n = a.length;
  const steps: SortingStep[] = [];
  const aux = algo === 'merge' ? Array.from({ length: n }, () => null as number | null) : null;
  let comparisons = 0;
  let moves = 0;
  let sortedRanges: ReadonlyArray<readonly [number, number]> = [];
  const defaultHeapSize = algo === 'heap' ? n : null;

  function addSorted(from: number, to: number) {
    sortedRanges = mergeSortedRanges(sortedRanges, from, to);
  }

  function record(input: RecordInput) {
    const step: SortingStep = {
      phase: input.phase,
      description: input.description,
      values: [...a],
      sortedRanges,
      bands: input.bands,
      comparing: uniqueIndices(input.comparing ?? []),
      moving: uniqueIndices(input.moving ?? []),
      hole: input.hole ?? null,
      held: input.held ?? null,
      pointers: input.pointers ?? [],
      comparisons,
      moves,
      heapSize: input.heapSize === undefined ? defaultHeapSize : input.heapSize,
      gap: input.gap ?? null,
      aux: aux === null ? null : [...aux],
      mergeRange: input.mergeRange ?? null,
      auxIndex: input.auxIndex ?? null,
    };
    steps.push(freezeStep(step));
  }

  function clearAux() {
    if (!aux) return;
    for (let index = 0; index < aux.length; index += 1) aux[index] = null;
  }

  return {
    a,
    n,
    steps,
    aux,
    get comparisons() {
      return comparisons;
    },
    get moves() {
      return moves;
    },
    record,
    addSorted,
    addComparison(count = 1) {
      comparisons += count;
    },
    addMove(count = 1) {
      moves += count;
    },
    clearAux,
  };
}

/** 片段版的区间标注：前缀已经有序，后面是还没处理的部分。 */
function prefixBands(n: number, prefix: number): SortingBand[] {
  const bands: SortingBand[] = [];
  if (prefix > 0) bands.push({ from: 0, to: prefix - 1, label: '有序区', tone: 'sorted' });
  if (prefix < n) bands.push({ from: prefix, to: n - 1, label: '待排序区', tone: 'idle' });
  return bands;
}

function sortedBands(n: number): SortingBand[] {
  return [{ from: 0, to: n - 1, label: '已排序', tone: 'sorted' }];
}

function buildSelectionTrace(builder: Builder) {
  const { a, n } = builder;
  builder.record({
    phase: '准备',
    description: `待排序的数组是 ${numbersText(a)}。选择排序每一轮都在无序区里找最小值，再把它换到无序区的第一个位置，左侧有序区每次长一格。`,
    bands: prefixBands(n, 0),
  });

  for (let i = 0; i < n - 1; i += 1) {
    let min = i;
    builder.record({
      phase: `第 ${i + 1} 轮`,
      description: `第 ${i + 1} 轮从下标 ${i} 开始，先假定 a[${i}] = ${a[i]} 是最小的，min 先记住 ${i}。`,
      pointers: [
        { index: i, label: 'i' },
        { index: min, label: 'min' },
      ],
      bands: prefixBands(n, i),
    });

    for (let j = i + 1; j < n; j += 1) {
      builder.addComparison();
      const previousMin = min;
      const value = a[j];
      const smaller = value < a[min];
      if (smaller) min = j;
      builder.record({
        phase: '比较',
        description: smaller
          ? `比较 a[${j}] = ${value} 和当前最小值 a[${previousMin}] = ${a[previousMin]}。${value} 更小，min 改记 ${j}。`
          : `比较 a[${j}] = ${value} 和当前最小值 a[${previousMin}] = ${a[previousMin]}。${value} 不比 ${a[previousMin]} 小，min 不动。`,
        comparing: [j, previousMin],
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j' },
          { index: min, label: 'min' },
        ],
        bands: prefixBands(n, i),
      });
    }

    if (min !== i) {
      const smallest = a[min];
      const displaced = a[i];
      [a[i], a[min]] = [a[min], a[i]];
      builder.addMove(2);
      builder.addSorted(0, i);
      builder.record({
        phase: '交换归位',
        description: `把最小值 ${smallest} 和下标 ${i} 上的 ${displaced} 交换。${smallest} 落到下标 ${i}，有序区扩展到 0 到 ${i}。`,
        moving: [i, min],
        pointers: [{ index: i, label: 'i' }],
        bands: prefixBands(n, i + 1),
      });
    } else {
      builder.addSorted(0, i);
      builder.record({
        phase: '无需交换',
        description: `下标 ${i} 上的 ${a[i]} 已经是最小值，不用交换。有序区扩展到 0 到 ${i}。`,
        pointers: [{ index: i, label: 'i' }],
        bands: prefixBands(n, i + 1),
      });
    }
  }

  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
  });
}

function buildInsertionTrace(builder: Builder) {
  const { a, n } = builder;
  builder.record({
    phase: '准备',
    description: `待排序的数组是 ${numbersText(a)}。插入排序把左边看成一堆已经排好的牌，每一轮把下标 i 的元素取出来拿在手里，往左边的牌里插。`,
    bands: prefixBands(n, 1),
    pointers: [{ index: 1, label: '轮次' }],
  });

  for (let i = 1; i < n; i += 1) {
    const key = a[i];
    const held = { label: 'key', value: key };
    builder.record({
      phase: `第 ${i} 轮`,
      description: `第 ${i} 轮把 a[${i}] = ${key} 取出来拿在手里，下标 0 到 ${i - 1} 这一段已经有序。`,
      held,
      pointers: [{ index: i, label: '轮次' }],
      bands: prefixBands(n, i),
    });

    let j = i - 1;
    while (j >= 0) {
      builder.addComparison();
      const value = a[j];
      if (value > key) {
        a[j + 1] = a[j];
        builder.addMove();
        builder.record({
          phase: '比较并后移',
          description: `a[${j}] = ${value} 比手里的 ${key} 大，把它后移到下标 ${j + 1}，给 ${key} 腾位置。`,
          comparing: [j],
          moving: [j, j + 1],
          held,
          pointers: [
            { index: j, label: 'j' },
            { index: j + 1, label: '空位' },
          ],
          bands: prefixBands(n, i),
        });
        j -= 1;
        continue;
      }
      builder.record({
        phase: '遇到更小的',
        description: `a[${j}] = ${value} 不比手里的 ${key} 大，再往左也不会更大，${key} 就放到下标 ${j + 1}。`,
        comparing: [j],
        held,
        pointers: [
          { index: j, label: 'j' },
          { index: j + 1, label: '空位' },
        ],
        bands: prefixBands(n, i),
      });
      break;
    }

    a[j + 1] = key;
    builder.addMove();
    builder.addSorted(0, i);
    builder.record({
      phase: '放入 key',
      description:
        j < 0
          ? `手里的 ${key} 比左边所有元素都小，放到下标 0。有序区扩展到 0 到 ${i}。`
          : `把 ${key} 放到下标 ${j + 1}，它左边的元素都不比它大。有序区扩展到 0 到 ${i}。`,
      moving: [j + 1],
      bands: prefixBands(n, i + 1),
    });
  }

  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
  });
}

/** 冒泡的色条：右侧已经沉下去的后缀是有序区，左边还在冒泡。 */
function bubbleBands(n: number, sortedFrom: number): SortingBand[] {
  if (sortedFrom <= 0) return [{ from: 0, to: n - 1, label: '已排序', tone: 'sorted' }];
  if (sortedFrom >= n) return [{ from: 0, to: n - 1, label: '待排序区', tone: 'idle' }];
  return [
    { from: 0, to: sortedFrom - 1, label: '待排序区', tone: 'idle' },
    { from: sortedFrom, to: n - 1, label: '已排序区', tone: 'sorted' },
  ];
}

function buildBubbleTrace(builder: Builder) {
  const { a, n } = builder;
  builder.record({
    phase: '准备',
    description: `待排序的数组是 ${numbersText(a)}。冒泡排序每一轮从前往后比较相邻两个元素，左边的比右边大就交换，一轮下来当前最大的元素被推到末尾，有序区从右往左长。`,
    bands: bubbleBands(n, n),
  });

  let sortedFrom = n;
  for (let round = 0; round < n - 1; round += 1) {
    const end = n - 1 - round;
    let hasSwapped = false;
    for (let j = 0; j < end; j += 1) {
      builder.addComparison();
      const left = a[j];
      const right = a[j + 1];
      if (left > right) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        builder.addMove(2);
        hasSwapped = true;
        builder.record({
          phase: '相邻交换',
          description: `比较 a[${j}] = ${left} 和 a[${j + 1}] = ${right}。${left} 比 ${right} 大，交换它们，大的元素往右冒一格。`,
          comparing: [j, j + 1],
          moving: [j, j + 1],
          pointers: [
            { index: j, label: 'j' },
            { index: j + 1, label: 'j+1' },
          ],
          bands: bubbleBands(n, sortedFrom),
        });
      } else {
        builder.record({
          phase: '相邻比较',
          description: `比较 a[${j}] = ${left} 和 a[${j + 1}] = ${right}。${left} 不大于 ${right}，不交换，继续往右比。`,
          comparing: [j, j + 1],
          pointers: [
            { index: j, label: 'j' },
            { index: j + 1, label: 'j+1' },
          ],
          bands: bubbleBands(n, sortedFrom),
        });
      }
    }

    if (!hasSwapped) {
      sortedFrom = 0;
      builder.addSorted(0, n - 1);
      builder.record({
        phase: '提前结束',
        description: `第 ${round + 1} 轮从前往后比完，这一轮没有发生交换，说明剩下的前缀已经整体有序，后面的轮次不用再比了，冒泡排序提前结束。`,
        bands: bubbleBands(n, 0),
      });
      break;
    }

    sortedFrom = end;
    builder.addSorted(sortedFrom, n - 1);
    builder.record({
      phase: `第 ${round + 1} 轮结束`,
      description: `第 ${round + 1} 轮结束，这一轮最大的元素 ${a[end]} 冒到下标 ${end}，后面的区域固定下来。`,
      pointers: [{ index: end, label: '已定' }],
      bands: bubbleBands(n, sortedFrom),
    });
  }

  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
  });
}

/** 希尔的色条：整段都还在按当前增量分组处理。 */
function shellBands(n: number, gap: number): SortingBand[] {
  return [{ from: 0, to: n - 1, label: `增量 ${gap}`, tone: 'active' }];
}

function buildShellTrace(builder: Builder) {
  const { a, n } = builder;
  builder.record({
    phase: '准备',
    description: `待排序的数组是 ${numbersText(a)}。希尔排序先取数组长度的一半当增量，把下标差为增量的元素看成一组，对每组做插入排序，然后增量减半，一直缩到 1。`,
    bands: prefixBands(n, 0),
  });

  for (let gap = Math.floor(n / 2); gap >= 1; gap = Math.floor(gap / 2)) {
    const lastGap = gap === 1;
    builder.record({
      phase: `增量 ${gap}`,
      description: lastGap
        ? '增量缩到 1，所有元素都在同一组里，这一轮就是普通的插入排序，做完整个数组就有序了。'
        : `增量是 ${gap}，把下标差为 ${gap} 的元素看成一组，例如下标 0，${gap}，${Math.min(2 * gap, n - 1)} 在同一组。每组各做一次插入排序，远处的小元素可以一次跳过 ${gap} 格，逆序对减少得比普通插入排序快。`,
      bands: shellBands(n, gap),
      gap,
    });

    for (let i = gap; i < n; i += 1) {
      const key = a[i];
      const held = { label: 'key', value: key };
      builder.record({
        phase: `处理下标 ${i}`,
        description: `增量是 ${gap}，处理下标 ${i} 的元素 ${key}。同一组里它前面 ${gap} 个位置是下标 ${i - gap}，把 ${key} 取出来，在组内往前插。`,
        held,
        pointers: [{ index: i, label: '轮次' }],
        bands: shellBands(n, gap),
        gap,
      });

      let j = i - gap;
      while (j >= 0) {
        builder.addComparison();
        const value = a[j];
        if (value > key) {
          a[j + gap] = a[j];
          builder.addMove();
          builder.record({
            phase: '组内后移',
            description: `组内比较 a[${j}] = ${value} 和手里的 ${key}。${value} 比 ${key} 大，把它后移 ${gap} 格到下标 ${j + gap}，给 ${key} 让路。`,
            comparing: [j],
            moving: [j, j + gap],
            held,
            pointers: [
              { index: j, label: 'j' },
              { index: j + gap, label: '空位' },
            ],
            bands: shellBands(n, gap),
            gap,
          });
          j -= gap;
          continue;
        }
        builder.record({
          phase: '组内停下',
          description: `组内比较 a[${j}] = ${value} 和手里的 ${key}。${value} 不比 ${key} 大，${key} 就放在下标 ${j + gap}。`,
          comparing: [j],
          held,
          pointers: [
            { index: j, label: 'j' },
            { index: j + gap, label: '空位' },
          ],
          bands: shellBands(n, gap),
          gap,
        });
        break;
      }

      a[j + gap] = key;
      builder.addMove();
      builder.record({
        phase: '放入组内',
        description:
          j < 0
            ? `手里的 ${key} 在这一组里已经是最小的，放到下标 ${j + gap}，这一组从头开始有序。`
            : `把 ${key} 放到下标 ${j + gap}，它在组内前面的元素都不比它大。`,
        moving: [j + gap],
        bands: shellBands(n, gap),
        gap,
      });
    }
  }

  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
  });
}

function heapBands(n: number, heapSize: number): SortingBand[] {
  const bands: SortingBand[] = [];
  if (heapSize > 0) bands.push({ from: 0, to: heapSize - 1, label: '堆区', tone: 'heap' });
  if (heapSize < n) bands.push({ from: heapSize, to: n - 1, label: '已排序区', tone: 'sorted' });
  return bands;
}

function buildHeapTrace(builder: Builder) {
  const { a, n } = builder;
  const firstParent = Math.floor(n / 2) - 1;

  function siftDown(root: number, size: number, heapSize: number) {
    let parent = root;
    for (;;) {
      const left = parent * 2 + 1;
      const right = left + 1;
      if (left >= size) {
        builder.record({
          phase: '下沉结束',
          description: `下标 ${parent} 没有孩子，下沉到这里停止。`,
          pointers: [{ index: parent, label: '父' }],
          bands: heapBands(n, heapSize),
          heapSize,
        });
        return;
      }

      let child = left;
      if (right < size) {
        builder.addComparison();
        if (a[right] > a[left]) child = right;
        builder.record({
          phase: '比较孩子',
          description: `下标 ${parent} 的两个孩子是 a[${left}] = ${a[left]} 和 a[${right}] = ${a[right]}。${
            child === right
              ? `右孩子 ${a[right]} 更大，选它当要比较的大孩子。`
              : `左孩子 ${a[left]} 更大，选它当要比较的大孩子。`
          }`,
          comparing: [left, right],
          pointers: [
            { index: parent, label: '父' },
            { index: left, label: '左子' },
            { index: right, label: '右子' },
          ],
          bands: heapBands(n, heapSize),
          heapSize,
        });
      }

      builder.addComparison();
      const parentValue = a[parent];
      const childValue = a[child];
      const childText =
        right < size
          ? `大孩子 a[${child}] = ${childValue}`
          : `仅有的左孩子 a[${left}] = ${childValue}`;
      if (childValue > parentValue) {
        [a[parent], a[child]] = [a[child], a[parent]];
        builder.addMove(2);
        builder.record({
          phase: '交换下沉',
          description: `孩子 a[${child}] = ${childValue} 比父亲 a[${parent}] = ${parentValue} 大，交换它们。父亲下沉到下标 ${child}，继续看下面的子树。`,
          moving: [parent, child],
          pointers: [{ index: child, label: '父' }],
          bands: heapBands(n, heapSize),
          heapSize,
        });
        parent = child;
        continue;
      }

      builder.record({
        phase: '无需交换',
        description: `${childText} 不比父亲 a[${parent}] = ${parentValue} 大，这个子树已经满足大顶堆性质，下沉结束。`,
        comparing: [parent, child],
        pointers: [
          { index: parent, label: '父' },
          { index: child, label: '子' },
        ],
        bands: heapBands(n, heapSize),
        heapSize,
      });
      return;
    }
  }

  builder.record({
    phase: '准备建堆',
    description:
      firstParent >= 0
        ? `数组是 ${numbersText(a)}。把它看成一棵完全二叉树，下标 p 的左孩子是 2p + 1，右孩子是 2p + 2。从最后一个非叶结点 ${firstParent} 开始，自底向上把每棵子树调整成大顶堆。`
        : `数组是 ${numbersText(a)}。只有一个元素，它本身就是一棵大顶堆。`,
    bands: heapBands(n, n),
    heapSize: n,
    pointers: [{ index: Math.max(firstParent, 0), label: '起点' }],
  });

  for (let node = firstParent; node >= 0; node -= 1) {
    builder.record({
      phase: '调整子树',
      description: `以 a[${node}] = ${a[node]} 为根调整这棵子树，把它和孩子里更大的那个比较。`,
      pointers: [{ index: node, label: '根' }],
      bands: heapBands(n, n),
      heapSize: n,
    });
    siftDown(node, n, n);
  }

  builder.record({
    phase: '堆建成',
    description: `整个数组已经满足大顶堆性质，堆顶 a[0] = ${a[0]} 是全局最大值。下面反复把堆顶换到堆区末尾，堆区缩一格，再让新堆顶往下沉。`,
    pointers: [{ index: 0, label: '堆顶' }],
    bands: heapBands(n, n),
    heapSize: n,
  });

  for (let end = n - 1; end >= 1; end -= 1) {
    const top = a[0];
    const last = a[end];
    [a[0], a[end]] = [a[end], a[0]];
    builder.addMove(2);
    builder.addSorted(end, n - 1);
    builder.record({
      phase: '堆顶归位',
      description: `堆顶 ${top} 是当前堆里的最大值，把它和堆区最后一个元素 ${last} 交换。${top} 落到下标 ${end}，这个位置从此固定。堆区缩小到 0 到 ${end - 1}，新堆顶是 ${last}。`,
      moving: [0, end],
      pointers: [{ index: end, label: '已定' }],
      bands: heapBands(n, end),
      heapSize: end,
    });
    siftDown(0, end, end);
  }

  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
    heapSize: 0,
  });
}

function buildMergeTrace(builder: Builder) {
  const { a, n } = builder;
  const auxBuffer = builder.aux;
  if (!auxBuffer) throw new Error('归并排序需要辅助数组。');
  // 下面两个嵌套函数声明在 TS 眼里可能在窄化之前被调用，闭包里收不到 null 检查，
  // 所以先落到一个类型已收窄的局部变量上。
  const aux = auxBuffer;

  builder.record({
    phase: '准备',
    description: `数组是 ${numbersText(a)}。归并排序先把数组一直对半切，切到每段只剩一个元素，再把这些小段两两合并成有序的大段。`,
    bands: prefixBands(n, 0),
  });

  function merge(lo: number, mid: number, hi: number) {
    builder.clearAux();
    const halfBands: SortingBand[] = [
      { from: lo, to: mid, label: '左半', tone: 'active' },
      { from: mid + 1, to: hi, label: '右半', tone: 'active' },
    ];
    builder.record({
      phase: '开始合并',
      description: `合并区间 ${lo} 到 ${hi}。左半是 ${lo} 到 ${mid}，右半是 ${mid + 1} 到 ${hi}，两半各自已经有序。用两个读指针从头比较，把更小的先写进辅助数组。`,
      pointers: [
        { index: lo, label: '左读' },
        { index: mid + 1, label: '右读' },
      ],
      bands: halfBands,
      mergeRange: [lo, hi],
    });

    let i = lo;
    let j = mid + 1;
    let k = lo;
    while (i <= mid && j <= hi) {
      builder.addComparison();
      const takeLeft = a[i] <= a[j];
      const picked = takeLeft ? a[i] : a[j];
      aux[k] = picked;
      builder.addMove();
      builder.record({
        phase: '合并输出',
        description: `比较左半的 a[${i}] = ${a[i]} 和右半的 a[${j}] = ${a[j]}。${
          takeLeft ? '左边的不更大，先取左边的' : '右边的更小，先取右边的'
        } ${picked}，写进辅助数组下标 ${k}。`,
        comparing: [i, j],
        pointers: [
          { index: i, label: '左读' },
          { index: j, label: '右读' },
        ],
        bands: halfBands,
        mergeRange: [lo, hi],
        auxIndex: k,
      });
      if (takeLeft) i += 1;
      else j += 1;
      k += 1;
    }

    while (i <= mid) {
      aux[k] = a[i];
      builder.addMove();
      builder.record({
        phase: '左半剩余',
        description: `右半已经取完，把左半剩下的 a[${i}] = ${a[i]} 依次写进辅助数组下标 ${k}。`,
        comparing: [i],
        pointers: [{ index: i, label: '左读' }],
        bands: halfBands,
        mergeRange: [lo, hi],
        auxIndex: k,
      });
      i += 1;
      k += 1;
    }

    while (j <= hi) {
      aux[k] = a[j];
      builder.addMove();
      builder.record({
        phase: '右半剩余',
        description: `左半已经取完，把右半剩下的 a[${j}] = ${a[j]} 依次写进辅助数组下标 ${k}。`,
        comparing: [j],
        pointers: [{ index: j, label: '右读' }],
        bands: halfBands,
        mergeRange: [lo, hi],
        auxIndex: k,
      });
      j += 1;
      k += 1;
    }

    const writeBands: SortingBand[] = [{ from: lo, to: hi, label: '写回中', tone: 'active' }];
    for (let t = lo; t <= hi; t += 1) {
      a[t] = aux[t] as number;
      builder.addMove();
      const last = t === hi;
      if (last) builder.addSorted(lo, hi);
      builder.record({
        phase: '写回主数组',
        description: last
          ? `把辅助数组下标 ${t} 的 ${aux[t]} 写回主数组下标 ${t}。区间 ${lo} 到 ${hi} 合并完成，这一段已经有序。`
          : `把辅助数组下标 ${t} 的 ${aux[t]} 写回主数组下标 ${t}。`,
        moving: [t],
        bands: writeBands,
        mergeRange: [lo, hi],
      });
    }
  }

  function mergeSort(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    mergeSort(lo, mid);
    mergeSort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  mergeSort(0, n - 1);
  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
    mergeRange: [0, n - 1],
  });
}

function buildQuickTrace(builder: Builder) {
  const { a, n } = builder;

  builder.record({
    phase: '准备',
    description: `数组是 ${numbersText(a)}。快速排序每一轮取一个基准，把比它小的往左放，比它大的往右放，基准落到最终位置之后再递归处理左右两段。`,
    bands: prefixBands(n, 0),
  });

  function quickSort(lo: number, hi: number) {
    if (lo > hi) return;
    if (lo === hi) {
      builder.addSorted(lo, hi);
      builder.record({
        phase: '单个元素',
        description: `区间 ${lo} 到 ${hi} 只剩一个元素 ${a[lo]}，它自然有序，不用再分区。`,
        pointers: [{ index: lo, label: '单元素' }],
        bands: [{ from: lo, to: hi, label: '单元素', tone: 'active' }],
      });
      return;
    }

    const rangeBands: SortingBand[] = [{ from: lo, to: hi, label: '分区范围', tone: 'active' }];
    const pivot = a[lo];
    const held = { label: '基准', value: pivot };
    let i = lo;
    let j = hi;
    let hole = lo;

    builder.record({
      phase: '挖坑取基准',
      description: `处理区间 ${lo} 到 ${hi}，取最左边的 ${pivot} 当基准并把它挖出来，下标 ${lo} 成了第一个坑。左指针 i 放在 ${lo}，右指针 j 放在 ${hi}。`,
      hole,
      held,
      pointers: [
        { index: i, label: 'i' },
        { index: j, label: 'j' },
      ],
      bands: rangeBands,
    });

    while (i < j) {
      while (i < j) {
        builder.addComparison();
        const position = j;
        const value = a[position];
        if (value >= pivot) {
          j -= 1;
          builder.record({
            phase: '右指针左移',
            description: `比较 a[${position}] = ${value} 和基准 ${pivot}。${value} 不比基准小，右指针 j 从 ${position} 挪到 ${j}。`,
            comparing: [position],
            hole,
            held,
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
            ],
            bands: rangeBands,
          });
        } else {
          break;
        }
      }
      if (i >= j) break;

      builder.addMove();
      const rightValue = a[j];
      const rightHole = hole;
      a[rightHole] = rightValue;
      hole = j;
      builder.record({
        phase: '右边填坑',
        description: `a[${j}] = ${rightValue} 比基准 ${pivot} 小，把它填进下标 ${rightHole} 的坑。${j} 号位置变成新坑，换左指针往右扫描。`,
        moving: [rightHole],
        hole,
        held,
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j' },
        ],
        bands: rangeBands,
      });

      while (i < j) {
        builder.addComparison();
        const position = i;
        const value = a[position];
        if (value <= pivot) {
          i += 1;
          builder.record({
            phase: '左指针右移',
            description: `比较 a[${position}] = ${value} 和基准 ${pivot}。${value} 不比基准大，左指针 i 从 ${position} 挪到 ${i}。`,
            comparing: [position],
            hole,
            held,
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
            ],
            bands: rangeBands,
          });
        } else {
          break;
        }
      }
      if (i >= j) break;

      builder.addMove();
      const leftValue = a[i];
      const leftHole = hole;
      a[leftHole] = leftValue;
      hole = i;
      builder.record({
        phase: '左边填坑',
        description: `a[${i}] = ${leftValue} 比基准 ${pivot} 大，把它填进下标 ${leftHole} 的坑。${i} 号位置变成新坑，换右指针往左扫描。`,
        moving: [leftHole],
        hole,
        held,
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j' },
        ],
        bands: rangeBands,
      });
    }

    a[hole] = pivot;
    builder.addMove();
    builder.addSorted(hole, hole);
    builder.record({
      phase: '基准归位',
      description: `左右指针在 ${hole} 碰面，把基准 ${pivot} 放进这个坑。${hole} 号位置从此固定，左边的元素都不比基准大，右边的元素都不比基准小。`,
      moving: [hole],
      pointers: [{ index: hole, label: '基准' }],
      bands: [],
    });

    quickSort(lo, hole - 1);
    quickSort(hole + 1, hi);
  }

  quickSort(0, n - 1);
  builder.addSorted(0, n - 1);
  builder.record({
    phase: '完成',
    description: `排序结束，数组按升序排好了：${numbersText(a)}。一共比较了 ${builder.comparisons} 次，移动了 ${builder.moves} 次元素。`,
    bands: sortedBands(n),
  });
}

function normalizeValues(values: readonly number[]): number[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('排序数组不能为空。');
  }
  if (values.length > SORTING_VALUE_LIMITS.maxLength) {
    throw new Error(`排序数组最多 ${SORTING_VALUE_LIMITS.maxLength} 个元素。`);
  }
  return values.map((value) => {
    if (!Number.isInteger(value)) {
      throw new Error('排序数组里只能放整数。');
    }
    if (value < SORTING_VALUE_LIMITS.min || value > SORTING_VALUE_LIMITS.max) {
      throw new Error(`排序数组里的元素只能是 ${SORTING_VALUE_LIMITS.min} 到 ${SORTING_VALUE_LIMITS.max} 之间的整数。`);
    }
    return value;
  });
}

const TRACE_BUILDERS: Record<SortingAlgo, (builder: Builder) => void> = {
  selection: buildSelectionTrace,
  insertion: buildInsertionTrace,
  bubble: buildBubbleTrace,
  shell: buildShellTrace,
  heap: buildHeapTrace,
  merge: buildMergeTrace,
  quick: buildQuickTrace,
};

/**
 * 生成某种排序的完整步骤快照。
 * values 是可选的自定义数组，不传就用七种算法共用的默认数据。
 */
export function createSortingTrace(
  algo: SortingAlgo,
  values: readonly number[] = SORTING_DEFAULT_VALUES,
): SortingTrace {
  if (!(SORTING_ALGOS as readonly string[]).includes(algo)) {
    throw new Error(`未知的排序算法：${String(algo)}。`);
  }
  const algorithm = algo as SortingAlgo;
  const normalized = normalizeValues(values);
  const builder = createBuilder(algorithm, normalized);
  TRACE_BUILDERS[algorithm](builder);
  return Object.freeze({
    algo: algorithm,
    info: Object.freeze({ ...SORTING_ALGO_INFO[algorithm] }),
    values: Object.freeze([...normalized]),
    steps: Object.freeze(builder.steps),
  });
}
