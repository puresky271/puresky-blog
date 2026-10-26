export const LOWBIT_LIMITS = { min: 1, max: 255 } as const;

export type LowbitPhase = 'start' | 'invert' | 'negative' | 'and' | 'subtract' | 'done';

export interface LowbitStep {
  phase: LowbitPhase;
  description: string;
}

export interface LowbitTrace {
  value: number;
  bits: string[];
  complementBits: string[];
  negativeBits: string[];
  lowbitBits: string[];
  nextBits: string[];
  lowbit: number;
  next: number;
  lowestBitIndex: number;
  steps: LowbitStep[];
}

function toBits(value: number) {
  return value.toString(2).padStart(8, '0').split('');
}

export function createLowbitTrace(value: number): LowbitTrace {
  if (!Number.isInteger(value) || value < LOWBIT_LIMITS.min || value > LOWBIT_LIMITS.max) {
    throw new Error(`请输入 ${LOWBIT_LIMITS.min} 到 ${LOWBIT_LIMITS.max} 之间的整数。`);
  }

  const bits = toBits(value);
  const complement = (~value) & 0xff;
  const negative = (-value) & 0xff;
  const lowbit = value & -value;
  const next = value - lowbit;
  const lowestBitIndex = bits.findLastIndex((bit) => bit === '1');
  const bitPosition = bits.length - lowestBitIndex - 1;
  const binary = bits.join('');
  const negativeBinary = toBits(negative).join('');
  const lowbitBinary = toBits(lowbit).join('');

  const steps: LowbitStep[] = [
    {
      phase: 'start',
      description: `从 x = ${value} 开始，它的 8 位二进制是 ${binary}。最低位的 1 位于第 ${bitPosition} 位，位权是 ${lowbit}。`,
    },
    {
      phase: 'invert',
      description: `先按位取反：0 变 1，1 变 0。原数最低位 1 的右侧全是 0，取反后这些位置全是 1。`,
    },
    {
      phase: 'negative',
      description: `补码中 -x = ~x + 1。给取反结果加 1，得到 ${negativeBinary}，也就是 -${value} 的低 8 位。`,
    },
    {
      phase: 'and',
      description: `逐位计算 x & -x：${binary} & ${negativeBinary} = ${lowbitBinary}。只有最低位的 1 被保留，所以 lowbit(${value}) = ${lowbit}。`,
    },
    {
      phase: 'subtract',
      description: `从 x 中减去 lowbit(x)：${value} - ${lowbit} = ${next}。这会清除最低位的 1，得到树状数组查询中的下一个下标。`,
    },
    {
      phase: 'done',
      description: next === 0
        ? `下一个下标是 0，前缀查询到此结束。`
        : `一次跳跃完成：${value} → ${next}。继续执行 x -= x & -x，直到下标变为 0。`,
    },
  ];

  return {
    value,
    bits,
    complementBits: toBits(complement),
    negativeBits: toBits(negative),
    lowbitBits: toBits(lowbit),
    nextBits: toBits(next),
    lowbit,
    next,
    lowestBitIndex,
    steps,
  };
}
