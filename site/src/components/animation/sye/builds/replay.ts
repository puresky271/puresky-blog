/**
 * 录制重放引擎：把 recorder.mjs 录下来的「初始 DOM + 带时间戳的变更序列」按时间轴重放。
 *
 * 数据格式（public/data/spending-your-effort/builds/level-*.json）：
 *   html  初始快照，递归的 [id, tag, attrs, children]，文本节点是 [id, '#', text]
 *   ops   变更序列，每条是 [t, type, ...]：
 *           0 add     [t, 0, parentId, beforeId|null, 快照子树]
 *           1 remove  [t, 1, id]
 *           2 attr    [t, 2, id, name, value|null]
 *           3 text    [t, 3, id, text]
 *           4 value   [t, 4, id, value]（input / textarea 的 property）
 *           5 select  [t, 5, id, selectedIndex]
 *           6 checked [t, 6, id, 0|1]
 *           7 scroll  [t, 7, id, scrollTop, scrollLeft]
 *   dur   这一档演示本身的时长（不含原站演示结束后等 1400ms 再切档的停顿）
 *
 * 时间轴用 performance.now()，暂停时把已播位置存下来，继续时平移基准时间。
 * 断点重播、切档都是重建 DOM 再从头播。
 */

export type RecTextNode = [id: number, tag: '#', text: string];
export type RecElementNode = [
  id: number,
  tag: string,
  attrs: Record<string, string>,
  children: RecNode[],
];
export type RecNode = RecTextNode | RecElementNode;

export type RecOp = [t: number, type: number, ...rest: (number | string | null | RecNode)[]];

export interface BuildData {
  v: number;
  level: string;
  dur: number;
  lastOp: number;
  html: RecElementNode;
  ops: RecOp[];
}

export interface ReplayHooks {
  /** 一次演示播完时回调（暂停在最后一帧） */
  onEnd?: () => void;
  /** 每次重建 DOM 后回调，参数是重建出来的 .efx-pad 根元素 */
  onBuild?: (root: Element) => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const MATH_NS = 'http://www.w3.org/1998/Math/MathML';

/** 根元素是 .efx-pad；它里面有一个 .efx-dvp，缩放由外层组件按容器宽度设置 */
export interface ReplayPlayer {
  play: () => void;
  pause: () => void;
  replay: () => void;
  /** 重建 DOM 并停在第一帧（减弱动效时用） */
  reset: () => void;
  /** 跳到指定毫秒（测试和调试用），跳过头会直接算播完 */
  seek: (ms: number) => void;
  /** 按录制数据里的节点 id 取重建出来的 DOM 节点（测试和调试用） */
  nodeFor: (id: number) => Node | null;
  destroy: () => void;
  readonly playing: boolean;
  readonly done: boolean;
  readonly root: Element | null;
}

export function createReplay(host: HTMLElement, data: BuildData, hooks: ReplayHooks = {}): ReplayPlayer {
  const nodes: Node[] = [];
  let raf = 0;
  let playing = false;
  let done = false;
  let base = 0;
  let pos = 0;
  let opIndex = 0;
  let root: Element | null = null;

  const childNsOf = (parent: Node | null): string | null => {
    if (!parent || !(parent instanceof Element)) return null;
    const ns = parent.namespaceURI;
    if (ns === SVG_NS) return parent.localName === 'foreignObject' ? null : SVG_NS;
    if (ns === MATH_NS) return MATH_NS;
    return null;
  };

  const buildNode = (rec: RecNode, parentNs: string | null): Node => {
    if (rec[1] === '#') {
      // 联合类型在这里收窄不到文本节点（tag 是 string），显式取出文本内容
      const text = document.createTextNode(rec[2] as string);
      nodes[rec[0]] = text;
      return text;
    }
    let ns = parentNs;
    if (!ns && rec[1] === 'svg') ns = SVG_NS;
    if (!ns && rec[1] === 'math') ns = MATH_NS;
    const el = ns ? document.createElementNS(ns, rec[1]) : document.createElement(rec[1]);
    const attrs = (rec[2] as Record<string, string> | undefined) || {};
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    nodes[rec[0]] = el;
    const childNs = ns === SVG_NS && rec[1] === 'foreignObject' ? null : ns;
    for (const child of rec[3] || []) el.appendChild(buildNode(child, childNs));
    return el;
  };

  const applyOp = (op: RecOp) => {
    const type = op[1] as number;
    if (type === 0) {
      const parent = nodes[op[2] as number];
      const beforeId = op[3];
      const node = buildNode(op[4] as RecNode, childNsOf(parent));
      if (!parent) return;
      if (beforeId === null || beforeId === undefined) parent.appendChild(node);
      else {
        const before = nodes[beforeId as number];
        if (before && before.parentNode === parent) parent.insertBefore(node, before);
        else parent.appendChild(node);
      }
    } else if (type === 1) {
      const node = nodes[op[2] as number];
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } else if (type === 2) {
      const el = nodes[op[2] as number];
      if (!el || !(el instanceof Element)) return;
      const name = op[3] as string;
      const value = op[4];
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, String(value));
    } else if (type === 3) {
      const node = nodes[op[2] as number];
      if (node && node.nodeType === 3) (node as Text).data = String(op[3]);
    } else if (type === 4) {
      const el = nodes[op[2] as number];
      if (el && 'value' in el) (el as HTMLInputElement).value = String(op[3]);
    } else if (type === 5) {
      const el = nodes[op[2] as number];
      if (el && el instanceof HTMLSelectElement) el.selectedIndex = Number(op[3]);
    } else if (type === 6) {
      const el = nodes[op[2] as number];
      if (el && 'checked' in el) (el as HTMLInputElement).checked = op[3] === 1;
    } else if (type === 7) {
      const el = nodes[op[2] as number];
      if (el && el instanceof Element) {
        el.scrollTop = Number(op[3]);
        el.scrollLeft = Number(op[4]);
      }
    }
  };

  const applyUntil = (target: number) => {
    while (opIndex < data.ops.length && data.ops[opIndex][0] <= target) {
      applyOp(data.ops[opIndex]);
      opIndex += 1;
    }
  };

  const buildDom = () => {
    nodes.length = 0;
    opIndex = 0;
    root = buildNode(data.html, null) as Element;
    host.replaceChildren(root);
    // 四档应用都按亮色演示录的：强制亮色，避免站内暗色主题把应用配色换掉
    for (const app of root.querySelectorAll('.efa-low, .efa-medium, .efa-high, .efa-max')) {
      app.setAttribute('data-theme', 'light');
    }
    applyUntil(0);
    hooks.onBuild?.(root);
  };

  const stopFrame = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const finish = () => {
    playing = false;
    done = true;
    stopFrame();
    hooks.onEnd?.();
  };

  const tick = () => {
    if (!playing) return;
    const now = performance.now();
    const target = now - base;
    applyUntil(target);
    if (target >= data.dur && opIndex >= data.ops.length) {
      pos = data.dur;
      finish();
      return;
    }
    pos = target;
    raf = requestAnimationFrame(tick);
  };

  const play = () => {
    if (playing) return;
    if (done) {
      replay();
      return;
    }
    base = performance.now() - pos;
    playing = true;
    raf = requestAnimationFrame(tick);
  };

  const pause = () => {
    if (!playing) return;
    const target = performance.now() - base;
    applyUntil(target);
    pos = target;
    playing = false;
    stopFrame();
  };

  const replay = () => {
    stopFrame();
    playing = false;
    done = false;
    pos = 0;
    buildDom();
    play();
  };

  const reset = () => {
    stopFrame();
    playing = false;
    done = false;
    pos = 0;
    buildDom();
  };

  const seek = (target: number) => {
    stopFrame();
    playing = false;
    applyUntil(target);
    pos = Math.min(target, data.dur);
    if (opIndex >= data.ops.length && pos >= data.dur) {
      done = true;
      hooks.onEnd?.();
    }
  };

  const destroy = () => {
    stopFrame();
    playing = false;
    nodes.length = 0;
    host.replaceChildren();
    root = null;
  };

  reset();

  return {
    play,
    pause,
    replay,
    reset,
    seek,
    nodeFor: (id: number) => nodes[id] ?? null,
    destroy,
    get playing() {
      return playing;
    },
    get done() {
      return done;
    },
    get root() {
      return root;
    },
  };
}
