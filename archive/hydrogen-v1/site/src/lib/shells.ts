/**
 * shells.ts — 文章分层的唯一真源（玻尔模型）。
 *
 * 文章按主量子数 n 分层。n 越小，束缚能越深，文章越核心。
 * 每层的容量是 2n²，来自泡利不相容原理，不是编辑口味：
 *
 *   n=1  K 壳   容量 2    −13.61 eV
 *   n=2  L 壳   容量 8    −3.40 eV
 *   n=3  M 壳   容量 18   −1.51 eV
 *   n=4  N 壳   容量 32   −0.85 eV
 *
 * 这条约束是故意当真的。K 壳只有两个位置，意味着整个博客只允许两篇
 * 「基态」文章。想放第三篇，就得先把一篇挤到 L 壳去。构建时会校验，
 * 超了直接让 build 失败，而不是打个 warning 混过去。
 */

import { levelEnergyEv, shellCapacity, shellLetter, transitionEnergyEv } from './physics.ts';

export interface ShellDefinition {
  n: number;
  title: string;
  /** 一句话说明这一层收什么。 */
  blurb: string;
}

export const SHELL_DEFINITIONS: readonly ShellDefinition[] = [
  {
    n: 1,
    title: '基态',
    blurb: '如果只读两篇，读这两篇。定义这个博客在做什么。',
  },
  {
    n: 2,
    title: '主线',
    blurb: '完整成型的长文。有论点、有证据、结论我自己也认。',
  },
  {
    n: 3,
    title: '记录',
    blurb: '一个具体问题从卡住到解决的过程。结论可能过期。',
  },
  {
    n: 4,
    title: '碎片',
    blurb: '还没长成文章的观察。会被合并、改写，或者删掉。',
  },
];

export interface Shell extends ShellDefinition {
  letter: string;
  capacity: number;
  /** 束缚能（eV），负值。越负越难被替代。 */
  bindingEnergyEv: number;
  /** 从本层跃迁到更内一层放出的光子能量（eV）。n=1 没有更内层，为 null。 */
  emissionToInnerEv: number | null;
}

export const SHELLS: readonly Shell[] = SHELL_DEFINITIONS.map((definition) => ({
  ...definition,
  letter: shellLetter(definition.n),
  capacity: shellCapacity(definition.n),
  bindingEnergyEv: levelEnergyEv(definition.n),
  emissionToInnerEv:
    definition.n > 1 ? transitionEnergyEv(definition.n - 1, definition.n) : null,
}));

const SHELL_BY_N = new Map(SHELLS.map((s) => [s.n, s]));

export function getShell(n: number): Shell | undefined {
  return SHELL_BY_N.get(n);
}

export function requireShell(n: number): Shell {
  const shell = SHELL_BY_N.get(n);
  if (!shell) {
    throw new Error(
      `未定义的能级 n=${n}。合法取值：${SHELLS.map((s) => s.n).join(', ')}。` +
        `要加新层就在 shells.ts 里声明，容量会自动按 2n² 算。`
    );
  }
  return shell;
}

export const SHELL_NUMBERS = SHELLS.map((s) => s.n);
export const MIN_SHELL = Math.min(...SHELL_NUMBERS);
export const MAX_SHELL = Math.max(...SHELL_NUMBERS);

export interface OccupancyReport {
  n: number;
  letter: string;
  occupied: number;
  capacity: number;
  /** 占用率 0..1，用于渲染壳层的填充程度。 */
  ratio: number;
  overfilled: boolean;
  remaining: number;
}

export function shellOccupancy(n: number, occupied: number): OccupancyReport {
  const shell = requireShell(n);
  return {
    n,
    letter: shell.letter,
    occupied,
    capacity: shell.capacity,
    ratio: Math.min(1, occupied / shell.capacity),
    overfilled: occupied > shell.capacity,
    remaining: Math.max(0, shell.capacity - occupied),
  };
}

/**
 * 构建期硬门：任一层超容就抛错。
 * 违反 2n² 不是样式问题，是这个博客的组织原则被破坏了，所以让 build 失败。
 */
export function assertShellCapacity(counts: ReadonlyMap<number, number>): void {
  const violations: string[] = [];
  for (const shell of SHELLS) {
    const occupied = counts.get(shell.n) ?? 0;
    if (occupied > shell.capacity) {
      violations.push(
        `n=${shell.n}（${shell.letter} 壳）容量 ${shell.capacity}，实际 ${occupied} 篇，超出 ${
          occupied - shell.capacity
        } 篇`
      );
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `壳层超容，违反 2n²：\n  ${violations.join('\n  ')}\n` +
        `处理办法是把文章降到外层（frontmatter 的 shell 字段调大），不是改容量常数。`
    );
  }
}

/** 束缚能格式化，保留两位小数并带符号。 */
export function formatBindingEnergy(ev: number): string {
  return `${ev.toFixed(2)} eV`;
}

/**
 * 壳层半径（相对值）：玻尔模型里 r_n = n²·a₀。
 * 用于把壳层画成同心圆时确定半径比例。
 */
export function shellRadiusRatio(n: number): number {
  return (n * n) / (MAX_SHELL * MAX_SHELL);
}
