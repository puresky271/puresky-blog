/**
 * snapshot.ts — 外部站点示例快照的公共工具。
 *
 * 做「外部文章 1:1 复刻」时常见的四件事都收在这里，文章自己只需要写一个薄薄的画廊组件：
 *
 * 1. 按组懒加载 JSON（loadSnapshotJson / fetchSnapshotJson），数据放 public/data/<name>/。
 * 2. 清理并渲染抓下来的示例 HTML：自闭合标签展开（normalizeSnapshotHtml）、
 *    站内媒体路径补 base（fixSnapshotMedia）。
 * 3. 判断示例是不是空壳：React Suspense 之类客户端渲染的示例，静态快照里只剩 template 占位，
 *    文章里要跳过或给提示，不能留一张空卡片（probeSnapshotHtml / isSnapshotRenderedBlank）。
 * 4. 给静态快照补交互状态：原站常用 React Aria 一类库往元素上挂 data-hover / data-pressed /
 *    data-focus 属性，CSS 再按属性出样式。快照是死 HTML，这里用事件委托把属性模拟出来
 *    （setupSnapshotInteractions），再挂载手写的可交互版本（mountInteractiveComponents）。
 *
 * 这些函数只做 DOM 操作，不依赖具体站点；Geist 那套演示是第一个使用者。
 */

import { mount, tick, unmount, type Component } from 'svelte';

import { withBase } from './format';

/* ---------------------------------------------------------------- 数据类型 */

export interface SnapshotSection {
  /** 原站小节标题（英文） */
  heading: string;
  /** 译文小节标题 */
  headingZh: string;
  /** 示例区的 HTML 快照 */
  html: string;
  /** Show code 里的示例代码，画廊不渲染，留给文章正文用 */
  code?: string;
}

export interface SnapshotComponent {
  slug: string;
  title: string;
  titleZh: string;
  descZh?: string;
  sections: SnapshotSection[];
}

export interface SnapshotGroupData {
  group: string;
  components: SnapshotComponent[];
}

/* ---------------------------------------------------------------- 数据加载 */

const jsonCache = new Map<string, Promise<unknown>>();

/** 读 public/data 下的 JSON，同一次会话里只请求一次（站内路径会补 base）。 */
export function loadSnapshotJson<T>(path: string): Promise<T> {
  let pending = jsonCache.get(path);
  if (!pending) {
    pending = fetch(withBase(path)).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    });
    jsonCache.set(path, pending);
  }
  return pending as Promise<T>;
}

/** 重试时绕开模块级缓存：失败过的 promise 留在缓存里，再调只会立刻拿到同一个错误。 */
export async function fetchSnapshotJson<T>(path: string): Promise<T> {
  const response = await fetch(withBase(path));
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return (await response.json()) as T;
}

/* ---------------------------------------------------------------- 示例 HTML */

/** HTML 里允许自闭合的空元素；其余标签的自闭合写法要展开成成对标签。 */
export const SNAPSHOT_VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * 快照里空 div / span 常序列化成 `<div .../>`。直接塞进 innerHTML / {@html} 的话，
 * HTML 解析器会把它当成没闭合的开始标签，把后面的兄弟节点全吞进去
 * （遇到过一次 spinner 的七个圆点被嵌套成一百多个元素，横向撑到两千多万像素）。
 */
export function normalizeSnapshotHtml(html: string): string {
  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/>/g,
    (whole, tag: string, attrs: string) =>
      SNAPSHOT_VOID_TAGS.has(tag.toLowerCase()) ? whole : `<${tag}${attrs}></${tag}>`
  );
}

/**
 * 快照里的图片路径是站内绝对路径（比如 /media/<name>/...），部署到子路径时要补 base。
 * prefix 用来限定只改这一套演示的图片，避免动到正文里的其它图。
 */
export function fixSnapshotMedia(root: ParentNode, prefix = '/media/'): void {
  for (const img of root.querySelectorAll<HTMLImageElement>('img')) {
    const src = img.getAttribute('src');
    if (!src || !src.startsWith(prefix)) continue;
    img.setAttribute('src', withBase(src));
  }
}

/* ---------------------------------------------------------------- 空壳判断 */

/** 有这些元素就说明渲染后肯定看得见东西，不用再离屏实测。 */
export const SNAPSHOT_CONTENT_SELECTOR =
  'img[src], svg, button, input, textarea, select, kbd, progress, canvas, iframe';

/** 原站可交互元素的标记：普通 button、role=button，或站点自己标的 data-* 钩子。 */
export const SNAPSHOT_INTERACTIVE_SELECTOR =
  'button, [role="button"], [data-snapshot-interactive]';

export interface SnapshotProbe {
  /** 去掉空白后的文字长度 */
  textLength: number;
  /** 有按钮、图标、输入框这类不用实测就看得见的元素 */
  explicit: boolean;
  /** Suspense 占位 template 的数量 */
  placeholders: number;
}

/** 便宜初判：有文字，或者有按钮、图标、输入框这类肯定看得见的元素。 */
export function probeSnapshotHtml(html: string): SnapshotProbe {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const body = parsed.body;
  return {
    textLength: (body.textContent ?? '').replace(/\s+/g, '').length,
    explicit: Boolean(body.querySelector(SNAPSHOT_CONTENT_SELECTOR)),
    placeholders: body.querySelectorAll('template').length,
  };
}

/** video 有源文件或封面才算有内容，没搬视频时只剩一个空壳。 */
export function hasPlayableVideo(scope: ParentNode): boolean {
  for (const video of scope.querySelectorAll('video')) {
    if (video.getAttribute('src') || video.getAttribute('poster') || video.querySelector('source[src]')) {
      return true;
    }
  }
  return false;
}

/**
 * 离屏实测一个渲染出来的示例块是不是真的空白。
 * 骨架屏、状态点这类内容画在空 div 的背景或伪元素上，只看标签和文字会误判，所以做了这一层。
 */
export function isSnapshotRenderedBlank(wrapper: HTMLElement): boolean {
  // 量不到排版（比如画廊在隐藏的 tab 里）就不下空白的结论
  if (wrapper.getBoundingClientRect().width < 10) return false;

  for (const element of [wrapper, ...wrapper.querySelectorAll<HTMLElement>('*')]) {
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;

    if (element instanceof HTMLVideoElement) {
      if (element.getAttribute('src') || element.getAttribute('poster') || element.querySelector('source[src]')) {
        return false;
      }
      continue;
    }
    if (/^(IMG|SVG|CANVAS|IFRAME|INPUT|TEXTAREA|SELECT|BUTTON|PROGRESS|KBD)$/.test(element.tagName)) {
      return false;
    }

    const style = getComputedStyle(element);
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') return false;
    if (style.backgroundImage !== 'none') return false;
    if (style.boxShadow !== 'none') return false;
    if (Number.parseFloat(style.borderTopWidth) > 0 || Number.parseFloat(style.borderLeftWidth) > 0) {
      return false;
    }
    // 骨架屏这类内容画在伪元素上
    for (const pseudo of ['::before', '::after'] as const) {
      const pseudoStyle = getComputedStyle(element, pseudo);
      if (!pseudoStyle.content || pseudoStyle.content === 'none' || pseudoStyle.content === 'normal') continue;
      if (pseudoStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || pseudoStyle.backgroundImage !== 'none') {
        return false;
      }
    }
  }
  return true;
}

/** 粗筛 + 离屏实测，返回真正能展示的 section。 */
export function filterRenderableSections(
  sections: SnapshotSection[],
  mountPoint: HTMLElement,
  bodyClass: string
): SnapshotSection[] {
  const judged = sections.map((section) => {
    const probe = probeSnapshotHtml(section.html);
    // 带 Suspense 占位的 section 一律实测：只剩下尺寸文字标签的也要算空壳
    const fastKeep = probe.placeholders === 0 && (probe.textLength >= 2 || probe.explicit);
    return { section, keep: fastKeep };
  });
  const suspicious = judged.filter((entry) => !entry.keep);
  if (!suspicious.length) return sections;
  if (!mountPoint.isConnected) return sections;

  const host = document.createElement('div');
  host.className = 'snapshot-measure';
  host.setAttribute('aria-hidden', 'true');
  mountPoint.appendChild(host);

  try {
    const wrappers = suspicious.map((entry) => {
      const wrapper = document.createElement('div');
      wrapper.className = bodyClass;
      wrapper.innerHTML = entry.section.html;
      host.appendChild(wrapper);
      return wrapper;
    });
    wrappers.forEach((wrapper, index) => {
      suspicious[index].keep = !isSnapshotRenderedBlank(wrapper);
    });
  } finally {
    host.remove();
  }

  return judged.filter((entry) => entry.keep).map((entry) => entry.section);
}

/* ---------------------------------------------------------------- 交互状态 */

export interface SnapshotInteractionOptions {
  /** 可交互元素选择器，默认 SNAPSHOT_INTERACTIVE_SELECTOR。 */
  selector?: string;
  /** 触发 pointerdown 时忽略的修饰键，默认只响应鼠标左键。 */
  ignoreDisabled?: boolean;
}

/**
 * 模拟 React Aria 的交互状态：指针进入 / 按下 / 聚焦时给元素挂 data-hover / data-pressed /
 * data-focus 属性，原站 CSS 里的 `data-hover:` 这类变体就会生效。返回清理函数。
 */
export function setupSnapshotInteractions(
  root: HTMLElement,
  options: SnapshotInteractionOptions = {}
): () => void {
  const selector = options.selector ?? SNAPSHOT_INTERACTIVE_SELECTOR;

  const closestInteractive = (event: Event): HTMLElement | null => {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>(selector);
  };

  /** pointerover 会冒泡，指针在目标内部的子元素之间移动不算重新进入。 */
  const entersFromOutside = (element: HTMLElement, event: Event): boolean => {
    const related = (event as PointerEvent).relatedTarget;
    return !(related instanceof Node && element.contains(related));
  };

  const handlePointerOver = (event: Event): void => {
    const element = closestInteractive(event);
    if (!element || !entersFromOutside(element, event)) return;
    element.setAttribute('data-hover', 'true');
  };

  const handlePointerOut = (event: Event): void => {
    const element = closestInteractive(event);
    if (!element || !entersFromOutside(element, event)) return;
    element.removeAttribute('data-hover');
  };

  let pressedElement: HTMLElement | null = null;

  const handlePointerDown = (event: Event): void => {
    if ((event as PointerEvent).button !== 0) return;
    const element = closestInteractive(event);
    if (!element) return;
    if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') return;
    pressedElement = element;
    element.setAttribute('data-pressed', 'true');
  };

  /** 幂等：指针移出画廊再松手时靠 window 上的监听兜底。 */
  const clearPressed = (): void => {
    pressedElement?.removeAttribute('data-pressed');
    pressedElement = null;
  };

  let focusedElement: HTMLElement | null = null;

  const handleFocusIn = (event: Event): void => {
    const element = closestInteractive(event);
    if (!element || element === focusedElement) return;
    focusedElement?.removeAttribute('data-focus');
    focusedElement = element;
    element.setAttribute('data-focus', 'true');
  };

  const handleFocusOut = (event: Event): void => {
    if (!focusedElement) return;
    const related = (event as FocusEvent).relatedTarget;
    if (related instanceof Node && focusedElement.contains(related)) return;
    focusedElement.removeAttribute('data-focus');
    focusedElement = null;
  };

  root.addEventListener('pointerover', handlePointerOver);
  root.addEventListener('pointerout', handlePointerOut);
  root.addEventListener('pointerdown', handlePointerDown);
  root.addEventListener('pointerup', clearPressed);
  root.addEventListener('pointercancel', clearPressed);
  root.addEventListener('focusin', handleFocusIn);
  root.addEventListener('focusout', handleFocusOut);
  // 按下后指针移出根节点再松开时，pointerup 不会冒泡到根节点
  window.addEventListener('pointerup', clearPressed);
  window.addEventListener('pointercancel', clearPressed);
  window.addEventListener('blur', clearPressed);

  return () => {
    root.removeEventListener('pointerover', handlePointerOver);
    root.removeEventListener('pointerout', handlePointerOut);
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointerup', clearPressed);
    root.removeEventListener('pointercancel', clearPressed);
    root.removeEventListener('focusin', handleFocusIn);
    root.removeEventListener('focusout', handleFocusOut);
    window.removeEventListener('pointerup', clearPressed);
    window.removeEventListener('pointercancel', clearPressed);
    window.removeEventListener('blur', clearPressed);
  };
}

/* ---------------------------------------------------------------- 懒加载与挂载 */

/**
 * 元素进视口（可提前 rootMargin）后执行一次 callback，返回清理函数。
 * 不支持 IntersectionObserver 的环境直接执行。
 */
export function whenInViewport(
  element: HTMLElement,
  callback: () => void,
  rootMargin = '0px 0px 300px 0px'
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => {};
  }

  let observer: IntersectionObserver | undefined = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      observer = undefined;
      callback();
    },
    { rootMargin }
  );
  observer.observe(element);

  return () => {
    observer?.disconnect();
    observer = undefined;
  };
}

export interface InteractiveMountOptions {
  /** 挂载容器上的 data 属性名，值对应注册表里的 key。 */
  attribute: string;
  /** slug → 动态 import 组件 */
  registry: Record<string, () => Promise<Component<{ config: Record<string, unknown> }>>>;
  /** 挂载时传给组件的 props */
  props?: Record<string, unknown>;
  /** 加载或挂载失败时的文案，默认「可交互版本加载失败。」 */
  errorText?: string;
  /** 每次挂载完成后对子树做一次后处理，比如补图片 base */
  afterMount?: (target: HTMLElement) => void;
}

/**
 * 把注册表里的手写可交互组件挂到对应的占位容器上。
 * 单个组件加载 / 挂载失败只影响它自己，返回的清理函数统一卸载已挂载的实例。
 */
export async function mountInteractiveComponents(
  root: HTMLElement,
  options: InteractiveMountOptions
): Promise<() => void> {
  const targetSelector = `[data-${options.attribute}]`;
  const valueOf = (target: HTMLElement): string => target.getAttribute(`data-${options.attribute}`) ?? '';
  const targets = [...root.querySelectorAll<HTMLElement>(targetSelector)];
  if (!targets.length) return () => {};

  const slugs = [...new Set(targets.map(valueOf))];
  const loaded = new Map<string, Component<{ config: Record<string, unknown> }>>();

  await Promise.all(
    slugs
      .filter((slug) => slug && slug in options.registry)
      .map(async (slug) => {
        try {
          loaded.set(slug, await options.registry[slug]());
        } catch {
          // 单个组件加载失败只影响它自己
        }
      })
  );

  const instances = new Map<HTMLElement, ReturnType<typeof mount>>();
  for (const target of targets) {
    if (!target.isConnected) continue;
    const slug = valueOf(target);
    const component = loaded.get(slug);
    if (!component) {
      target.textContent = options.errorText ?? '可交互版本加载失败。';
      continue;
    }
    if (instances.has(target)) continue;
    try {
      target.replaceChildren();
      const instance = mount(component, { target, props: { config: options.props ?? {} } });
      instances.set(target, instance);
      options.afterMount?.(target);
    } catch {
      target.textContent = options.errorText ?? '可交互版本加载失败。';
    }
  }

  await tick();

  return () => {
    for (const [element, instance] of instances) {
      instances.delete(element);
      void unmount(instance);
    }
  };
}
