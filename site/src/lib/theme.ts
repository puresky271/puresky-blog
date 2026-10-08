/**
 * theme.ts — 亮/暗主题。
 *
 * 偏好三态：light / dark / system。存 localStorage，读不到就当 system。
 * 首屏的主题由 Base.astro 里的内联脚本在绘制前设置，这里负责之后的切换。
 *
 * 切换时广播 theme:change 事件，粒子场、播放器之类需要重绘的组件监听它。
 */

export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getPref(): ThemePref {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function resolve(pref: ThemePref): Theme {
  if (pref === 'system') return media().matches ? 'dark' : 'light';
  return pref;
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
}

let switching = false;

/**
 * 设置偏好。传入 origin 时从该点画圆展开新主题（支持 View Transition 的浏览器），
 * 否则直接切换。
 *
 * 圆形揭示的做法和 DansBlog / mygo_chat 的 circle-reveal 一致，三件事缺一不可：
 *   1. 切换期间 <html> 带 theme-vt：关掉所有 CSS 过渡（包括 <html> 自己的天色变量过渡），
 *      新快照才是「已经切好」的样子，而不是圆圈里再慢慢变色；
 *   2. 同时去掉所有 view-transition-name：导航高亮、播放器这些带名字的元素会各自成组做交叉淡入，
 *      不受圆形裁剪，看起来就是「圆圈揭开了页面，但有几块自己闪了一下」；
 *   3. 去掉 backdrop-filter：毛玻璃让两次整页快照的光栅化慢一大截，点击后会顿一下。
 * 圆的动画用 CSS @keyframes（global.css 的 theme-reveal）驱动，参数经自定义属性传入，
 * 比 element.animate({ pseudoElement }) 在各版本 Chromium 上都更稳，不会丢掉开头那段。
 */
export function setPref(pref: ThemePref, origin?: { x: number; y: number }): void {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // 隐私模式下写不进去，本次会话内仍然生效。
  }

  window.dispatchEvent(new CustomEvent('theme:pref', { detail: { pref } }));

  const next = resolve(pref);
  if (next === currentTheme()) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origin || reduced || !document.startViewTransition || switching) {
    apply(next);
    return;
  }

  const root = document.documentElement;
  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  root.style.setProperty('--reveal-x', `${origin.x}px`);
  root.style.setProperty('--reveal-y', `${origin.y}px`);
  root.style.setProperty('--reveal-r', `${Math.ceil(radius)}px`);

  switching = true;
  root.classList.add('theme-vt');
  const transition = document.startViewTransition(() => apply(next));
  transition.finished
    .catch(() => undefined)
    .finally(() => {
      switching = false;
      root.classList.remove('theme-vt');
      root.style.removeProperty('--reveal-x');
      root.style.removeProperty('--reveal-y');
      root.style.removeProperty('--reveal-r');
    });
}

/** 跟随系统时，系统主题变化要同步过来。只需注册一次。 */
let watching = false;
export function watchSystemTheme(): void {
  if (watching) return;
  watching = true;
  media().addEventListener('change', () => {
    if (getPref() === 'system') apply(resolve('system'));
  });
}
