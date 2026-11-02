/**
 * code-collapse.ts — 长代码块的折叠。
 *
 * 超过 COLLAPSE_AFTER 行的代码块默认只露出前 COLLAPSED_LINES 行，下方一条「展开全部」。
 * 行数按代码文本里的换行算，不用量高度，所以阅读偏好换字号之后收起的仍是这么多行。
 *
 * 结构：<div class="code-collapse"><pre class="is-collapsed">…</pre><button class="code-toggle">…</button></div>
 * 样式在 prose.css 的「长代码块」一段。折叠是渐进增强：没有 JS 时不会包这一层，代码照常全部显示。
 *
 * 文章的 PostEnhance.astro 和编辑器预览的 Writer.svelte 共用这一份，别各写一套。
 */
import { iCaretDown } from '@/lib/icons.generated';

/** 超过这么多行才收起。短代码块保持原样，不出现多余的按钮。 */
const COLLAPSE_AFTER = 24;
/** 收起时露出多少行，写进 pre 的 --code-lines，prose.css 按它算 max-height。 */
const COLLAPSED_LINES = 16;

const svg = (icon: { size: number; body: string }) =>
  `<svg width="12" height="12" viewBox="0 0 ${icon.size} ${icon.size}" aria-hidden="true">${icon.body}</svg>`;

/** 代码块的行数：shiki 每行一个 <span class="line">，文本里靠换行分开。 */
function countLines(pre: HTMLPreElement): number {
  const text = (pre.querySelector('code') ?? pre).textContent ?? '';
  return text.replace(/\n+$/, '').split('\n').length;
}

/**
 * 给一个 <pre> 装上折叠。太短的块直接跳过，重复调用也安全。
 * 调用时 <pre> 已经由调用方包进窗口（.code-block / 选项卡面板）也没关系。
 */
export function setupCodeCollapse(pre: HTMLPreElement): void {
  if (pre.dataset.collapse !== undefined) return;
  const lines = countLines(pre);
  if (lines <= COLLAPSE_AFTER) return;
  pre.dataset.collapse = '';
  pre.style.setProperty('--code-lines', String(COLLAPSED_LINES));

  const shell = document.createElement('div');
  shell.className = 'code-collapse';
  pre.replaceWith(shell);
  shell.append(pre);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-toggle';
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML =
    `<span class="code-toggle-label">展开全部</span>` +
    `<span class="code-toggle-meta">共 ${lines} 行</span>` +
    `<span class="code-toggle-icon">${svg(iCaretDown)}</span>`;
  shell.append(button);

  const label = button.querySelector('.code-toggle-label') as HTMLElement;

  const setCollapsed = (collapsed: boolean) => {
    pre.classList.toggle('is-collapsed', collapsed);
    shell.classList.toggle('is-collapsed', collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    label.textContent = collapsed ? '展开全部' : '收起';
  };

  button.addEventListener('click', () => {
    const collapse = !pre.classList.contains('is-collapsed');
    setCollapsed(collapse);
    // 收起后代码块骤然变矮，视图会落在块后面的正文上，把块首拉回来。
    if (collapse && shell.getBoundingClientRect().top < 0) {
      shell.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });

  setCollapsed(true);
}
