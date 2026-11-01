/**
 * reading-prefs.ts — 文章页的阅读偏好：正文字体（非衬线/衬线）和字号（小/标准/大）。
 *
 * 偏好存 localStorage，同时写到 <html data-read-font> / <html data-read-size>，
 * 正文排版（prose.css）按这两个属性换字体和字号。首屏由 Base.astro 的内联脚本在绘制前写好，
 * 这里负责之后的切换、站内跳转后的补写和界面同步。
 *
 * 键名和 Base.astro 里的内联脚本各写一份，改这里要同步改那边。
 */

export type ReadFont = 'sans' | 'serif';
export type ReadSize = 'sm' | 'md' | 'lg';

export const FONT_KEY = 'read-font';
export const SIZE_KEY = 'read-size';

export function getFont(): ReadFont {
  try {
    return localStorage.getItem(FONT_KEY) === 'serif' ? 'serif' : 'sans';
  } catch {
    return 'sans';
  }
}

export function getSize(): ReadSize {
  try {
    const value = localStorage.getItem(SIZE_KEY);
    return value === 'sm' || value === 'lg' ? value : 'md';
  } catch {
    return 'md';
  }
}

/** 把当前偏好写回 <html>。切换时和每次站内跳转后都要调用。 */
export function applyReadingPrefs(): void {
  const root = document.documentElement;
  root.dataset.readFont = getFont();
  root.dataset.readSize = getSize();
}

export function setFont(font: ReadFont): void {
  try {
    // 默认档不写 localStorage：以后调整默认值时，没主动改过的人自动跟着变。
    if (font === 'sans') localStorage.removeItem(FONT_KEY);
    else localStorage.setItem(FONT_KEY, font);
  } catch {
    // 隐私模式下写不进去，本次会话内仍然生效。
  }
  applyReadingPrefs();
}

export function setSize(size: ReadSize): void {
  try {
    if (size === 'md') localStorage.removeItem(SIZE_KEY);
    else localStorage.setItem(SIZE_KEY, size);
  } catch {
    // 同上。
  }
  applyReadingPrefs();
}
