/**
 * FIG4 录制重放引擎。
 *
 * 录制数据是「初始 DOM 快照 + 按时间排序的最小变更补丁流」（结构见 recorder.mjs / build.mjs）。
 * 这里把快照建成真实 DOM，然后按播放头把 `at <= 当前时间` 的补丁逐条应用：
 *
 *   a 改属性 / x 改文本 / v 改输入值 / s 改滚动位置
 *   i 插入子树 / r 删除节点 / m 移动节点
 *
 * 暂停就是停住播放头，继续就是从播放头接着跑。跳到某一步先在数据里找到该步的时间点，
 * 重置 DOM 后把到达那个时间点的补丁一次性应用完（快进不需要逐帧）。
 */

export interface SnapshotNode {
  /** 节点 id（补丁流里引用节点用） */
  i: number;
  /** 标签名（元素节点） */
  t?: string;
  /** 文本内容（文本节点） */
  x?: string;
  /** 属性 */
  a?: Record<string, string>;
  /** 子节点 */
  c?: SnapshotNode[];
  /** input / textarea / select 的值（select 存 selectedIndex） */
  v?: string;
  /** 滚动位置 [scrollTop, scrollLeft] */
  s?: [number, number];
}

export interface ReplayOp {
  /** 补丁类型 */
  o: 'a' | 'x' | 'v' | 's' | 'r' | 'i' | 'm';
  /** 时间点（毫秒） */
  at: number;
  /** 目标节点 id */
  i?: number;
  /** 插入时的父节点 id */
  p?: number;
  /** 插入 / 移动时的参照节点 id，null 表示插到末尾 */
  b?: number | null;
  /** 属性名 */
  k?: string;
  /** 通用值 */
  v?: string;
  /** 滚动位置 */
  top?: number;
  left?: number;
  /** 插入的子树快照 */
  n?: SnapshotNode;
}

export interface ReplayData {
  v: number;
  level: string;
  /** 一轮演示总时长（毫秒） */
  dur: number;
  /** 11 步各自的开始时间（毫秒） */
  steps: number[];
  /** 初始 DOM（.efx-vp 节点） */
  root: SnapshotNode;
  ops: ReplayOp[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'text',
  'tspan',
  'g',
  'defs',
  'use',
  'symbol',
  'marker',
  'clippath',
  'lineargradient',
  'radialgradient',
  'stop',
  'mask',
  'pattern',
  'filter',
  'fegaussianblur',
  'foreignobject',
  'textpath',
]);

export class DomReplay {
  private host: HTMLElement;
  private data: ReplayData;
  private nodes = new Map<number, Node>();
  private cursor = 0;
  private rootEl: Element | null = null;

  constructor(host: HTMLElement, data: ReplayData) {
    this.host = host;
    this.data = data;
    this.reset();
  }

  get duration(): number {
    return this.data.dur;
  }

  get steps(): number[] {
    return this.data.steps;
  }

  /** 清空并重建初始 DOM。 */
  reset(): void {
    if (this.rootEl) this.rootEl.remove();
    this.nodes.clear();
    this.cursor = 0;
    this.rootEl = this.build(this.data.root) as Element;
    this.host.appendChild(this.rootEl);
  }

  /** 卸载：把建出来的 DOM 从容器里拿走。 */
  destroy(): void {
    this.rootEl?.remove();
    this.rootEl = null;
    this.nodes.clear();
    this.cursor = 0;
  }

  /** 跳到指定时间点（重置后快进补丁）。 */
  seek(time: number): void {
    this.reset();
    this.applyUntil(time);
  }

  /** 应用所有 at <= time 的补丁。返回实际播放头（不超过总时长）。 */
  applyUntil(time: number): number {
    const ops = this.data.ops;
    while (this.cursor < ops.length && ops[this.cursor].at <= time) {
      this.apply(this.nodes, ops[this.cursor]);
      this.cursor += 1;
    }
    return Math.max(0, Math.min(time, this.data.dur));
  }

  /** 当前时间点落在第几步（0 起）。 */
  stepAt(time: number): number {
    let index = 0;
    for (let i = 0; i < this.data.steps.length; i += 1) {
      if (this.data.steps[i] <= time + 1) index = i;
    }
    return index;
  }

  private build(snapshot: SnapshotNode, parentIsSvg = false, nodes = this.nodes): Node {
    if (snapshot.x !== undefined) {
      const text = document.createTextNode(snapshot.x);
      nodes.set(snapshot.i, text);
      return text;
    }
    const tag = snapshot.t ?? 'div';
    const isSvg = parentIsSvg || tag === 'svg' || SVG_TAGS.has(tag.toLowerCase());
    const element = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    if (snapshot.a) {
      for (const [name, value] of Object.entries(snapshot.a)) element.setAttribute(name, value);
    }
    if (snapshot.c) {
      for (const child of snapshot.c) element.appendChild(this.build(child, isSvg, nodes));
    }
    if (snapshot.v !== undefined) this.setNodeValue(element, snapshot.v);
    if (snapshot.s) {
      element.scrollTop = snapshot.s[0];
      element.scrollLeft = snapshot.s[1];
    }
    nodes.set(snapshot.i, element);
    return element;
  }

  private setNodeValue(node: Node, value: string): void {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) node.value = value;
    else if (node instanceof HTMLSelectElement) node.selectedIndex = Number(value);
  }

  private apply(nodes: Map<number, Node>, op: ReplayOp): void {
    if (op.o === 'i') {
      const parent = op.p === undefined ? null : nodes.get(op.p);
      if (!parent || !op.n) return;
      const child = this.build(op.n, parent instanceof Element && parent.namespaceURI === SVG_NS, nodes);
      const ref = op.b == null ? null : (nodes.get(op.b) ?? null);
      if (ref && ref.parentNode === parent) parent.insertBefore(child, ref);
      else parent.appendChild(child);
      return;
    }
    if (op.i === undefined) return;
    const node = nodes.get(op.i);
    if (!node) return;
    if (op.o === 'a') {
      if (!(node instanceof Element) || op.k === undefined) return;
      if (op.v === undefined) node.removeAttribute(op.k);
      else node.setAttribute(op.k, op.v);
      return;
    }
    if (op.o === 'x') {
      if (node.nodeType === Node.TEXT_NODE) (node as Text).data = op.v ?? '';
      else node.textContent = op.v ?? '';
      return;
    }
    if (op.o === 'v') {
      this.setNodeValue(node, op.v ?? '');
      return;
    }
    if (op.o === 's') {
      if (node instanceof Element) {
        node.scrollTop = op.top ?? 0;
        node.scrollLeft = op.left ?? 0;
      }
      return;
    }
    if (op.o === 'r') {
      node.parentNode?.removeChild(node);
      this.forget(nodes, node);
      return;
    }
    if (op.o === 'm') {
      const parent = node.parentNode;
      if (!parent) return;
      const ref = op.b == null ? null : (nodes.get(op.b) ?? null);
      parent.insertBefore(node, ref && ref.parentNode === parent ? ref : null);
    }
  }

  /** 节点被删掉后把它的子树从 id 映射里清掉（补丁不会再引用它们）。 */
  private forget(nodes: Map<number, Node>, node: Node): void {
    for (const [id, candidate] of nodes) {
      if (candidate === node) {
        nodes.delete(id);
        break;
      }
    }
    for (const child of node.childNodes) this.forget(nodes, child);
  }
}
