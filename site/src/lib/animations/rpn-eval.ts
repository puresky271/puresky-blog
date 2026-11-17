export type RpnPhase = 'start' | 'operand' | 'operator' | 'done';

export interface RpnStep {
  phase: RpnPhase;
  tokenIndex: number | null;
  processed: number;
  stack: number[];
  operator: string | null;
  right: number | null;
  left: number | null;
  result: number | null;
  description: string;
}

export interface RpnTrace {
  tokens: string[];
  steps: RpnStep[];
  result: number;
}

export const RPN_LIMITS = {
  maxTokens: 24,
  minValue: -100000,
  maxValue: 100000,
  maxInputLength: 120,
} as const;

const OPERATORS = new Set(['+', '-', '*', '/']);

function isIntegerToken(token: string) {
  return /^-?\d+$/.test(token);
}

/** Java 与 C++ 的整数除法：向零截断。 */
function truncDivide(left: number, right: number) {
  const quotient = left / right;
  return quotient < 0 ? Math.ceil(quotient) : Math.floor(quotient);
}

export function createRpnTrace(input: string): RpnTrace {
  // remark-smartypants 会把配置里的直引号改成弯引号，这里统一把引号当空白丢掉，
  // 这样 3 4 2 * + 和 "3 4 2 * +" 两种写法都能识别。
  const tokens = input.replace(/[“”‘’"'`]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('请输入至少一个数字或运算符。');
  if (tokens.length > RPN_LIMITS.maxTokens) throw new Error(`最多支持 ${RPN_LIMITS.maxTokens} 个元素。`);

  for (const token of tokens) {
    if (!isIntegerToken(token) && !OPERATORS.has(token)) {
      throw new Error(`无法识别的元素 ${token}，只能是整数或 +、-、*、/。`);
    }
    if (isIntegerToken(token)) {
      const value = Number(token);
      if (!Number.isSafeInteger(value) || value < RPN_LIMITS.minValue || value > RPN_LIMITS.maxValue) {
        throw new Error(`数字 ${token} 超出 ${RPN_LIMITS.minValue} 到 ${RPN_LIMITS.maxValue} 的范围。`);
      }
    }
  }

  const steps: RpnStep[] = [];
  const stack: number[] = [];

  steps.push({
    phase: 'start',
    tokenIndex: null,
    processed: 0,
    stack: [],
    operator: null,
    right: null,
    left: null,
    result: null,
    description: `表达式是 ${tokens.join(' ')}。从左向右读，数字入栈，运算符弹出两个数算完再压回。`,
  });

  tokens.forEach((token, index) => {
    if (isIntegerToken(token)) {
      const value = Number(token);
      stack.push(value);
      steps.push({
        phase: 'operand',
        tokenIndex: index,
        processed: index + 1,
        stack: [...stack],
        operator: null,
        right: null,
        left: null,
        result: null,
        description: `读到数字 ${value}，把它压入栈中。`,
      });
      return;
    }

    if (stack.length < 2) {
      throw new Error(`读到 ${token} 时栈里不足两个操作数，这个表达式不是合法的逆波兰表达式。`);
    }
    const right = stack.pop()!;
    const left = stack.pop()!;
    let value: number;
    switch (token) {
      case '+': value = left + right; break;
      case '-': value = left - right; break;
      case '*': value = left * right; break;
      default: {
        if (right === 0) throw new Error('表达式中不能有除零运算。');
        value = truncDivide(left, right);
      }
    }
    stack.push(value);
    steps.push({
      phase: 'operator',
      tokenIndex: index,
      processed: index + 1,
      stack: [...stack],
      operator: token,
      right,
      left,
      result: value,
      description: `读到运算符 ${token}，先弹出右操作数 ${right}，再弹出左操作数 ${left}，计算 ${left} ${token} ${right} = ${value}，把结果压回栈中。`,
    });
  });

  if (stack.length !== 1) {
    throw new Error('遍历结束后栈里应该恰好剩一个结果，这个表达式不是合法的逆波兰表达式。');
  }

  const result = stack[0];
  steps.push({
    phase: 'done',
    tokenIndex: null,
    processed: tokens.length,
    stack: [result],
    operator: null,
    right: null,
    left: null,
    result,
    description: `遍历结束，栈里只剩下一个数 ${result}，这就是表达式的结果。`,
  });

  return { tokens, steps, result };
}
