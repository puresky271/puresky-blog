export type ExpressionPhase = 'operand' | 'open' | 'operator' | 'close' | 'reduce' | 'done';

export interface ExpressionNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ExpressionStep {
  phase: ExpressionPhase;
  tokenIndex: number | null;
  processed: number;
  operatorStack: string[];
  nodeStack: string[];
  visibleIds: string[];
  edges: Array<[string, string]>;
  focus: string | null;
  activeEdges: Array<[string, string]>;
  description: string;
}

export interface ExpressionTrace {
  tokens: string[];
  nodes: ExpressionNode[];
  root: string;
  steps: ExpressionStep[];
}

const NODES: ExpressionNode[] = [
  { id: 'root', label: '*', x: 280, y: 48 },
  { id: 'plus', label: '+', x: 155, y: 140 },
  { id: 'minus', label: '-', x: 405, y: 140 },
  { id: 'three', label: '3', x: 75, y: 238 },
  { id: 'four', label: '4', x: 235, y: 238 },
  { id: 'two', label: '2', x: 325, y: 238 },
  { id: 'one', label: '1', x: 485, y: 238 },
];
const NODE_BY_TOKEN: Record<string, string> = { '1': 'one', '2': 'two', '3': 'three', '4': 'four' };
const NODE_BY_OPERATOR: Record<string, string> = { '+': 'plus', '-': 'minus', '*': 'root' };
const LABELS = new Map(NODES.map((node) => [node.id, node.label]));

function precedence(operator: string) {
  return operator === '+' || operator === '-' ? 1 : 2;
}

export function createExpressionTrace(): ExpressionTrace {
  const tokens = ['(', '3', '+', '4', ')', '*', '(', '2', '-', '1', ')'];
  const steps: ExpressionStep[] = [];
  const operatorStack: string[] = [];
  const nodeStack: string[] = [];
  const visibleIds: string[] = [];
  const edges: Array<[string, string]> = [];

  function record(
    phase: ExpressionPhase,
    tokenIndex: number | null,
    processed: number,
    focus: string | null,
    description: string,
    activeEdges: Array<[string, string]> = [],
  ) {
    steps.push({
      phase,
      tokenIndex,
      processed,
      operatorStack: [...operatorStack],
      nodeStack: [...nodeStack],
      visibleIds: [...visibleIds],
      edges: edges.map((edge) => [...edge]),
      focus,
      activeEdges: activeEdges.map((edge) => [...edge]),
      description,
    });
  }

  function reduce(tokenIndex: number | null, processed: number) {
    const operator = operatorStack.pop()!;
    const right = nodeStack.pop()!;
    const left = nodeStack.pop()!;
    const id = NODE_BY_OPERATOR[operator];
    visibleIds.push(id);
    const activeEdges: Array<[string, string]> = [[id, left], [id, right]];
    edges.push(...activeEdges);
    nodeStack.push(id);
    record(
      'reduce',
      tokenIndex,
      processed,
      id,
      `弹出运算符 ${operator}、右子树 ${LABELS.get(right)} 和左子树 ${LABELS.get(left)}，合并为以 ${operator} 为根的新子树`,
      activeEdges,
    );
  }

  tokens.forEach((token, index) => {
    if (NODE_BY_TOKEN[token]) {
      const id = NODE_BY_TOKEN[token];
      visibleIds.push(id);
      nodeStack.push(id);
      record('operand', index, index + 1, id, `读到操作数 ${token}，创建叶结点并压入子树栈`);
      return;
    }

    if (token === '(') {
      operatorStack.push(token);
      record('open', index, index + 1, null, '读到左括号，把它压入运算符栈，阻止括号外的运算符提前归约');
      return;
    }

    if (token === ')') {
      while (operatorStack.at(-1) !== '(') reduce(index, index);
      operatorStack.pop();
      record('close', index, index + 1, nodeStack.at(-1) ?? null, '括号内的表达式已经归约完成，弹出左括号');
      return;
    }

    while (
      operatorStack.length > 0
      && operatorStack.at(-1) !== '('
      && precedence(operatorStack.at(-1)!) >= precedence(token)
    ) {
      reduce(index, index);
    }
    operatorStack.push(token);
    record('operator', index, index + 1, null, `读到运算符 ${token}，栈顶没有需要优先归约的运算，把它压入运算符栈`);
  });

  while (operatorStack.length > 0) reduce(null, tokens.length);
  record('done', null, tokens.length, nodeStack[0], '运算符栈和子树栈都已归约完毕，根结点 * 对应整个表达式');

  return { tokens, nodes: NODES.map((node) => ({ ...node })), root: nodeStack[0], steps };
}
