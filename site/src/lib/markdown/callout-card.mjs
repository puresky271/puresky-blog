/**
 * callout-card.mjs — 提示块卡片共用的那枚图标。
 *
 * remark-callout.mjs（> [!NOTE] 一类的引用块）和 remark-paper.mjs（:::annotation 批注）
 * 都产出同一套卡片，只是类型不同。类型色的定义在 prose.css 的提示块一段，这里只管图标：
 * 24×24 描边画法，线宽 2，圆头圆角，颜色由 CSS 的 currentColor 决定。
 *
 * 六种图标都手绘，不引图标库：
 *   note        圆圈里一个 i
 *   tip         灯泡（照文章页参考图画的：灯泡主体 / 灯座 / 左上一道高光）
 *   important   圆圈里的感叹号
 *   warning     三角警示牌
 *   caution     八边形停止牌
 *   annotation  一支铅笔（批注），顶端一道短线分出笔尾
 */

const ICONS = {
  note: ['M12 2.9a9.1 9.1 0 1 0 0 18.2 9.1 9.1 0 0 0 0-18.2Z', 'M12 11.1v5.3', 'M12 7.4h.01'],
  tip: [
    'M12 2.9c-3.6 0-6.5 2.9-6.5 6.4 0 1.8.8 3.4 2 4.6 1.2 1.1 2 2.4 2.1 3.8h4.8c.1-1.4.9-2.7 2.1-3.8 1.2-1.2 2-2.8 2-4.6 0-3.5-2.9-6.4-6.5-6.4Z',
    'M9.9 17.7v2.1c0 1.2.9 2.2 2.1 2.2s2.1-1 2.1-2.2v-2.1',
    'M8.9 9.1c.2-1.3 1.1-2.3 2.3-2.7',
  ],
  important: ['M12 2.9a9.1 9.1 0 1 0 0 18.2 9.1 9.1 0 0 0 0-18.2Z', 'M12 7.4v5.6', 'M12 16.7h.01'],
  warning: ['M12 3.4 21.4 19.6H2.6Z', 'M12 9.3v4.6', 'M12 17.2h.01'],
  caution: ['M9.3 3.1h5.4l6.2 6.2v5.4l-6.2 6.2H9.3l-6.2-6.2V9.3Z', 'M12 7.5v5.4', 'M12 16.7h.01'],
  annotation: [
    'M4.4 19.6l.9-3.8L16.9 4.2a2 2 0 0 1 2.8 0l.1.1a2 2 0 0 1 0 2.8L8.2 18.7l-3.8.9Z',
    'M15.2 5.7l3.1 3.1',
  ],
};

const ICON_PROPS = {
  className: ['callout-icon'],
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ariaHidden: 'true',
  focusable: 'false',
};

/**
 * 图标写成一个空段落，靠 data.hName / data.hChildren 换成 <svg>，这样不用拼原始 HTML 字符串。
 * 注意别让它变成「空段落」被别的插件清掉：remark-local-images.mjs 里有「删空段落」的清理，
 * 那边只删掉过图片的段落，不会再误伤这里。
 */
export function calloutIconNode(kind) {
  const paths = ICONS[kind];
  if (!paths) throw new Error(`[callout-card] 未知的提示块类型：${kind}`);
  return {
    type: 'paragraph',
    data: {
      hName: 'svg',
      hProperties: ICON_PROPS,
      hChildren: paths.map((d) => ({
        type: 'element',
        tagName: 'path',
        properties: { d },
        children: [],
      })),
    },
    children: [],
  };
}
