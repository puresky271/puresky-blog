/**
 * photo-strip.ts — :::photo row 横条的左右切换按钮。
 *
 * 结构由 lib/markdown/remark-figure.mjs 输出：
 *
 *   <div class="photo-strip-wrap">
 *     <div class="photo-strip" role="group" aria-label="图片列表" tabindex="0">…</div>
 *     <button class="photo-nav prev" type="button" aria-label="上一张图片">…</button>
 *     <button class="photo-nav next" type="button" aria-label="下一张图片">…</button>
 *   </div>
 *
 * 样式在 prose.css 的「横排」一段。按钮默认是隐藏的，这里确认图条真的能横滑之后才给包裹层
 * 挂上 data-photo-nav 把按钮露出来；图条本身不动，触摸滑动、滚动吸附和原生横向滚动都还是它的。
 *
 * 渐进增强：没有 JS 时按钮不出现，滚动条也隐去了，但触摸、触控板、键盘仍能横向浏览，内容不丢。
 * 文章页由 PostEnhance.astro 调用；编辑器预览里只有排版，没有脚本增强。
 */

/** 到达两端的容差：scrollLeft 和宽高都是小数，吸附之后也可能差零点几像素。 */
const EDGE = 1;

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight']);

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 每张图在滚动内容里的起点。用滚动容器的边界当基准，滚动位置本身会变，不能拿 offsetLeft 直接算。 */
function imageStarts(strip: HTMLElement): number[] {
  const base = strip.getBoundingClientRect().left - strip.scrollLeft;
  return [...strip.querySelectorAll<HTMLImageElement>('img')].map((img) => img.getBoundingClientRect().left - base);
}

/** 翻一页：滚到下一张图的吸附位置，没有下一张就滚到底。 */
function step(strip: HTMLElement, direction: 1 | -1): void {
  const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
  const offset = strip.scrollLeft;
  const starts = imageStarts(strip);

  let target: number;
  if (direction > 0) {
    const hit = starts.find((start) => start > offset + EDGE);
    target = hit ?? max;
  } else {
    const hit = [...starts].reverse().find((start) => start < offset - EDGE);
    target = hit ?? 0;
  }
  target = Math.min(Math.max(target, 0), max);
  if (Math.abs(target - offset) < 1) return;

  strip.scrollTo({ left: target, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * strip / prev / next 是查到的非空元素，作为参数传进来，闭包里不用再做判空。
 */
function enhance(
  wrap: HTMLElement,
  strip: HTMLElement,
  prev: HTMLButtonElement,
  next: HTMLButtonElement,
): () => void {
  // 标记一下，重复调用（比如翻页后重新初始化）不会接两遍。
  wrap.dataset.photoReady = '';

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  /** 刷新按钮状态：整条图放得下时两个都藏着，到端点的那侧禁用。 */
  function update(): void {
    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const scrollable = max > EDGE;
    if (scrollable) wrap.dataset.photoNav = '';
    else delete wrap.dataset.photoNav;

    prev.disabled = !scrollable || strip.scrollLeft <= EDGE;
    next.disabled = !scrollable || strip.scrollLeft >= max - EDGE;
  }

  const onPrev = () => step(strip, -1);
  const onNext = () => step(strip, 1);
  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);

  // 聚焦图条或按钮时，左右方向键翻一张。到端点时不拦，交给浏览器的原生横向滚动。
  const onKey = (event: KeyboardEvent) => {
    if (!ARROW_KEYS.has(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target as Node | null;
    if (!target || !(strip.contains(target) || prev.contains(target) || next.contains(target))) return;
    const forward = event.key === 'ArrowRight';
    if ((forward ? next : prev).disabled) return;
    event.preventDefault();
    step(strip, forward ? 1 : -1);
  };
  wrap.addEventListener('keydown', onKey);
  strip.addEventListener('scroll', schedule, { passive: true });

  // 字号、窗口宽度和图条宽度变化都会改可滚动量。
  const observer = new ResizeObserver(schedule);
  observer.observe(strip);

  // 没有写死宽高的图（远程图）加载完才能算准 scrollWidth。
  const unlistenImages: Array<() => void> = [];
  for (const img of strip.querySelectorAll<HTMLImageElement>('img')) {
    if (img.complete) continue;
    const onLoad = () => update();
    img.addEventListener('load', onLoad);
    unlistenImages.push(() => img.removeEventListener('load', onLoad));
  }

  update();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    strip.removeEventListener('scroll', schedule);
    wrap.removeEventListener('keydown', onKey);
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    for (const off of unlistenImages) off();
    prev.disabled = false;
    next.disabled = false;
    delete wrap.dataset.photoNav;
    delete wrap.dataset.photoReady;
  };
}

/** 给一个包裹层接上按钮，返回清理函数；结构不全时返回 null。 */
function setupWrap(wrap: HTMLElement): (() => void) | null {
  const strip = wrap.querySelector<HTMLElement>('.photo-strip');
  const prev = wrap.querySelector<HTMLButtonElement>('.photo-nav.prev');
  const next = wrap.querySelector<HTMLButtonElement>('.photo-nav.next');
  if (!strip || !prev || !next) return null;
  return enhance(wrap, strip, prev, next);
}

/**
 * 给 root 里所有还没接过的 :::photo row 接上按钮，返回清理函数。
 * 框架无关，文章页和以后别的地方都能直接调。
 */
export function setupPhotoStrip(root: ParentNode = document): () => void {
  const cleanups: Array<() => void> = [];
  root.querySelectorAll<HTMLElement>('.photo-strip-wrap').forEach((wrap) => {
    if (wrap.dataset.photoReady !== undefined) return;
    const teardown = setupWrap(wrap);
    if (teardown) cleanups.push(teardown);
  });

  return () => {
    for (const teardown of cleanups) teardown();
    cleanups.length = 0;
  };
}