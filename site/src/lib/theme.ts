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

/**
 * 设置偏好。传入 origin 时从该点画圆展开新主题（支持 View Transition 的浏览器），
 * 否则直接切换。
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
  if (!origin || reduced || !document.startViewTransition) {
    apply(next);
    return;
  }

  const root = document.documentElement;
  root.classList.add('is-theme-switching');
  const transition = document.startViewTransition(() => apply(next));

  const radius = Math.hypot(
    Math.max(origin.x, innerWidth - origin.x),
    Math.max(origin.y, innerHeight - origin.y)
  );

  transition.ready
    .then(() =>
      root.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        {
          duration: 560,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      ).finished
    )
    .catch(() => undefined)
    .finally(() => root.classList.remove('is-theme-switching'));
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
