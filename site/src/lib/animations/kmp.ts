export const KMP_LIMITS = { text: 60, pattern: 24 } as const;

export type KmpPhase = 'start' | 'compare' | 'fallback' | 'advance' | 'found' | 'not-found';

export interface KmpStep {
  phase: KmpPhase;
  i: number;
  j: number;
  offset: number;
  equal?: boolean;
  fallbackFrom?: number;
  fallbackTo?: number;
  foundStart?: number;
  description: string;
}

export interface KmpTrace {
  text: string[];
  pattern: string[];
  lps: number[];
  steps: KmpStep[];
}

export function prefixTable(pattern: string[]): number[] {
  const lps = Array<number>(pattern.length).fill(0);
  for (let i = 1, length = 0; i < pattern.length; ) {
    if (pattern[i] === pattern[length]) {
      lps[i++] = ++length;
    } else if (length > 0) {
      length = lps[length - 1];
    } else {
      lps[i++] = 0;
    }
  }
  return lps;
}

export function createKmpTrace(textInput: string, patternInput: string): KmpTrace {
  const text = Array.from(textInput);
  const pattern = Array.from(patternInput);
  if (!text.length) throw new Error('文本串不能为空。');
  if (!pattern.length) throw new Error('模式串不能为空。');
  if (text.length > KMP_LIMITS.text) throw new Error(`文本串最多 ${KMP_LIMITS.text} 个字符。`);
  if (pattern.length > KMP_LIMITS.pattern) throw new Error(`模式串最多 ${KMP_LIMITS.pattern} 个字符。`);

  const lps = prefixTable(pattern);
  const steps: KmpStep[] = [
    {
      phase: 'start',
      i: 0,
      j: 0,
      offset: 0,
      description: '从两个串的下标 0 开始比对。文本串指针 i 始终不会回退。',
    },
  ];

  let i = 0;
  let j = 0;
  let found = false;
  while (i < text.length && j < pattern.length) {
    const offset = i - j;
    const equal = text[i] === pattern[j];
    steps.push({
      phase: 'compare',
      i,
      j,
      offset,
      equal,
      description: equal
        ? `text[${i}] = ${text[i]}，pattern[${j}] = ${pattern[j]}，字符相等，两个指针一起右移。`
        : `text[${i}] = ${text[i]}，pattern[${j}] = ${pattern[j]}，字符失配。`,
    });

    if (equal) {
      i++;
      j++;
      if (j === pattern.length) {
        const foundStart = i - pattern.length;
        steps.push({
          phase: 'found',
          i: i - 1,
          j: j - 1,
          offset: foundStart,
          foundStart,
          description: `模式串全部匹配，在文本串下标 ${foundStart} 处找到第一次出现。`,
        });
        found = true;
        break;
      }
    } else if (j > 0) {
      const next = lps[j - 1];
      steps.push({
        phase: 'fallback',
        i,
        j: next,
        offset: i - next,
        fallbackFrom: j,
        fallbackTo: next,
        description: `已匹配部分的最长相等前后缀长度为 ${next}。i 保持 ${i} 不动，j 从 ${j} 回退到 ${next}，模式串右移 ${next < j ? j - next : 0} 格。`,
      });
      j = next;
    } else {
      i++;
      steps.push({
        phase: 'advance',
        i: Math.min(i, text.length - 1),
        j: 0,
        offset: i,
        description: `j 已经是 0，无法继续回退。i 右移到 ${i}，从新的起点继续比对。`,
      });
    }
  }

  if (!found) {
    steps.push({
      phase: 'not-found',
      i: Math.max(0, text.length - 1),
      j: 0,
      offset: Math.max(0, text.length - pattern.length),
      description: '文本串已经检查完毕，没有找到完整的模式串。',
    });
  }

  return { text, pattern, lps, steps };
}
