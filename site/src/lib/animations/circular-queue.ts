/**
 * circular-queue.ts — 循环队列判空与判满的三种方法，预生成不可变步骤快照。
 *
 * 三种方法共用同一套入队出队动作，区别只在判定条件：
 * flag 另设标志位，count 统计元素个数，sacrifice 牺牲一个存储单元。
 * 播放定时器只负责移动步骤指针，不碰算法内部状态。
 */

export const CIRCULAR_QUEUE_CAPACITY = 5;

export const CIRCULAR_QUEUE_METHODS = ['flag', 'count', 'sacrifice'] as const;
export type CircularQueueMethod = (typeof CIRCULAR_QUEUE_METHODS)[number];

export type QueueVerdict = 'empty' | 'full' | 'normal';
export type QueueAction = 'init' | 'enqueue' | 'dequeue' | 'reject';

export interface CircularQueueStep {
  /** 本步做了什么 */
  action: QueueAction;
  /** 阶段名，显示在步骤说明左侧 */
  phase: string;
  /** 中文解释 */
  description: string;
  front: number;
  rear: number;
  count: number;
  flag: 0 | 1;
  /** 每个格子里存的元素，空位是 null */
  slots: (number | null)[];
  verdict: QueueVerdict;
  /** 命中的判定条件 */
  formula: string;
  /** 刚写入或刚取走的格子，用来点亮 */
  activeSlot: number | null;
  /** 牺牲法报满时留空的格子 */
  idleSlot: number | null;
}

export const CIRCULAR_QUEUE_METHOD_INFO: Record<
  CircularQueueMethod,
  { title: string; empty: string; full: string; meta: string }
> = {
  flag: {
    title: '另设标志位',
    empty: 'front == rear 且 flag == 0',
    full: 'front == rear 且 flag == 1',
    meta: 'flag 记录最近一次是入队还是出队',
  },
  count: {
    title: '统计元素个数',
    empty: 'count == 0',
    full: `count == ${CIRCULAR_QUEUE_CAPACITY}`,
    meta: 'count 记录队列里实际有多少个元素',
  },
  sacrifice: {
    title: '牺牲一个存储单元',
    empty: 'front == rear',
    full: `(rear + 1) % ${CIRCULAR_QUEUE_CAPACITY} == front`,
    meta: '永远留一格不放元素，最多存 4 个',
  },
};

export function createCircularQueueTrace(method: CircularQueueMethod): CircularQueueStep[] {
  const size = CIRCULAR_QUEUE_CAPACITY;
  const info = CIRCULAR_QUEUE_METHOD_INFO[method];
  const slots: (number | null)[] = Array.from({ length: size }, () => null);
  const steps: CircularQueueStep[] = [];

  let front = 0;
  let rear = 0;
  let count = 0;
  let flag: 0 | 1 = 0;

  function isEmpty() {
    if (method === 'flag') return front === rear && flag === 0;
    if (method === 'count') return count === 0;
    return front === rear;
  }

  function isFull() {
    if (method === 'flag') return front === rear && flag === 1;
    if (method === 'count') return count === size;
    return (rear + 1) % size === front;
  }

  function verdict(): QueueVerdict {
    if (isEmpty()) return 'empty';
    if (isFull()) return 'full';
    return 'normal';
  }

  function formula(current: QueueVerdict) {
    if (current === 'empty') return `${info.empty}，成立`;
    if (current === 'full') return `${info.full}，成立`;
    return '两条判定条件都不成立';
  }

  function record(
    action: QueueAction,
    phase: string,
    description: string,
    activeSlot: number | null = null,
  ) {
    const current = verdict();
    steps.push({
      action,
      phase,
      description,
      front,
      rear,
      count,
      flag,
      slots: [...slots],
      verdict: current,
      formula: formula(current),
      activeSlot,
      idleSlot: method === 'sacrifice' && current === 'full' ? rear : null,
    });
  }

  const initText =
    method === 'flag'
      ? `front = rear = 0，flag 先归 0，表示上一次操作是出队。此时 ${info.empty}，队列为空。`
      : method === 'count'
        ? `front = rear = 0，count 归 0。此时 ${info.empty}，队列为空。`
        : `front = rear = 0。此时 ${info.empty}，队列为空，${size} 个格子全空着。`;
  record('init', '初始化', initText);

  function enqueue(value: number) {
    if (isFull()) {
      record(
        'reject',
        '入队失败',
        `${value} 想进来，但此时 ${info.full}，队列已满，这一格写不进去。`,
      );
      return;
    }
    const written = rear;
    slots[written] = value;
    rear = (rear + 1) % size;
    count += 1;
    flag = 1;
    const full = isFull();
    record(
      'enqueue',
      '入队',
      `把 ${value} 写进 ${written} 号格，这一格点亮，rear 挪到 ${rear}。${
        full ? `此时 ${info.full}，队列满了。` : ''
      }`,
      written,
    );
  }

  function dequeue() {
    if (isEmpty()) return;
    const read = front;
    const value = slots[read];
    slots[read] = null;
    front = (front + 1) % size;
    count -= 1;
    flag = 0;
    const empty = isEmpty();
    record(
      'dequeue',
      '出队',
      `从 ${read} 号格取走 ${value}，这一格熄灭，front 挪到 ${front}。${
        empty ? `此时 ${info.empty}，队列又空了。` : ''
      }`,
      read,
    );
  }

  if (method === 'sacrifice') {
    // 只能放 4 个元素，第 5 个会被判满挡住，出队腾出一格之后才能绕回来
    for (const value of [0, 1, 2, 3]) enqueue(value);
    enqueue(4);
    dequeue();
    enqueue(4);
    while (!isEmpty()) dequeue();
  } else {
    for (const value of [0, 1, 2, 3, 4]) enqueue(value);
    while (!isEmpty()) dequeue();
  }

  return steps;
}
