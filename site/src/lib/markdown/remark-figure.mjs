/**
 * remark-figure.mjs — 正文图片的图注和随笔里的图片排版。
 *
 * 1. 单独成段的一张图（`![图注](src)` 前后都空行）包成 figure，alt 就是看得见的图注：
 *
 *      <figure class="figure"><img alt="图注"><figcaption>图注</figcaption></figure>
 *
 *    alt 是 image / 图片 / 一串哈希这类占位词时只包 figure 不出图注，免得页面上冒出一行「image」。
 *
 * 2. :::photo 容器控制图片怎么摆，主要给随笔用：
 *
 *      :::photo right 40%
 *      ![书店里一整面墙的 AI 书](./images/x/books.jpg)
 *      :::
 *
 *    第一个参数是位置：left / right 浮在段落一侧让文字绕排（宽度默认 42%，可写 25% 到 60%），
 *    wide 比正文栏宽一些（只在随笔版式里生效，别的版式就是满宽），
 *    row 把多张图排成一条等高的横条，放不下时横向滑动；
 *    不写参数就是居中的普通图，容器里放了多张图时自动当 row。
 *    图注默认取图片的 alt；容器里图片后面写一段文字的话，用这段文字当整组的图注。
 *
 *    row 的输出比别的排法多一层包裹和两个圆形切换按钮：
 *
 *      <div class="photo-strip-wrap">
 *        <div class="photo-strip" role="group" aria-label="图片列表" tabindex="0">…</div>
 *        <button class="photo-nav prev" aria-label="上一张图片"><span class="chevron"></span></button>
 *        <button class="photo-nav next" aria-label="下一张图片"><span class="chevron"></span></button>
 *      </div>
 *
 *    按钮本身不带行为，横滑、触摸和按图吸附仍由 .photo-strip 自己负责。点击滚动和按钮可用状态
 *    在 lib/photo-strip.ts 里接上（文章页由 PostEnhance.astro 初始化）。没有 JS 时 prose.css 不显示
 *    按钮，触摸和触控板照样能滑。chevron 是 CSS 画的箭头，不用字符图标。
 *
 * 图片节点保持 mdast image 不动，Astro 收集和优化图片时按节点类型找图，包在 figure 里照样会换成 _astro 资源。
 * 要排在 remark-local-images 之后：缺图被摘掉以后，空出来的 :::photo 整个不输出。
 * 不引第三方插件，理由同 remark-callout.mjs：输出结构要和 prose.css 对上。
 */

const OPEN = /^:::\s*photo(?:\s+(.*))?$/i;
const CLOSE = /^:::+\s*$/;
/** 嵌套容器的开标记，用来给闭合标记计数（:::photo 里一般不会再套别的容器，计数只是保险）。 */
const ANY_OPEN = /^:::+\s*[a-z][a-z0-9-]*\b/i;
const LAYOUTS = new Set(['left', 'right', 'wide', 'row']);
const WIDTH = /^(\d{1,3})%$/;
const WIDTH_RANGE = [25, 60];

/**
 * 不能当图注的 alt：空的，image / img / 图片 / 截图 / screenshot 加可选编号，
 * 一串哈希（微信、QQ 存下来的文件名），或者带扩展名的文件名。
 */
const PLACEHOLDER = /^(?:(?:image|img|pic|photo|picture|screenshot|图片|图像|截图|配图)[\s_-]*\d*|[0-9a-f_-]{12,}|.+\.(?:png|jpe?g|gif|webp|avif|svg))$/i;

export function isPlaceholderAlt(alt) {
  const text = (alt ?? '').trim();
  return text === '' || PLACEHOLDER.test(text);
}

function markerText(node) {
  if (node?.type !== 'paragraph' || node.children.length !== 1) return '';
  const child = node.children[0];
  return child.type === 'text' ? child.value.trim() : '';
}

/** 段落里只有图片（中间可以夹着空白和换行）时返回这些图片，否则返回 null。 */
function imagesOnly(paragraph) {
  if (paragraph?.type !== 'paragraph') return null;
  const images = [];
  for (const child of paragraph.children) {
    if (child.type === 'image') images.push(child);
    else if (child.type === 'break' || (child.type === 'text' && !child.value.trim())) continue;
    else return null;
  }
  return images.length > 0 ? images : null;
}

function caption(children) {
  return { type: 'figureCaption', data: { hName: 'figcaption' }, children };
}

function altCaption(image) {
  return isPlaceholderAlt(image.alt) ? null : caption([{ type: 'text', value: image.alt.trim() }]);
}

function figure(className, children, extra = {}) {
  return {
    type: 'figureBlock',
    data: { hName: 'figure', hProperties: { className, ...extra } },
    children,
  };
}

/** 单张图：figure > img + figcaption。 */
function plainFigure(image) {
  const cap = altCaption(image);
  return figure(['figure'], cap ? [image, cap] : [image]);
}

/** row 的切换按钮。箭头是 CSS 用两条边框转出来的（prose.css 的 .photo-nav .chevron），不用字符图标。 */
function navButton(kind) {
  return {
    type: 'photoNav',
    data: {
      hName: 'button',
      hProperties: {
        type: 'button',
        className: ['photo-nav', kind],
        'aria-label': kind === 'prev' ? '上一张图片' : '下一张图片',
      },
    },
    children: [
      {
        type: 'photoChevron',
        data: { hName: 'span', hProperties: { className: ['chevron'], 'aria-hidden': 'true' } },
        children: [],
      },
    ],
  };
}

/**
 * row 横条：.photo-strip-wrap 里一条可横滑的 .photo-strip 加两个按钮。
 * tabindex 让键盘也能聚焦这条图，左右方向键在 photo-strip.ts 里接到翻页上。
 */
function photoRow(images) {
  const strip = {
    type: 'figureStrip',
    data: {
      hName: 'div',
      hProperties: {
        className: ['photo-strip'],
        role: 'group',
        'aria-label': '图片列表',
        tabindex: '0',
      },
    },
    children: images,
  };
  return {
    type: 'photoStripWrap',
    data: { hName: 'div', hProperties: { className: ['photo-strip-wrap'] } },
    children: [strip, navButton('prev'), navButton('next')],
  };
}

/** 解析 `:::photo right 40%` 的参数。认不出的写法打警告，按默认处理。 */
function parseArgs(raw, warn) {
  const result = { layout: '', width: '' };
  for (const token of (raw ?? '').trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase();
    if (LAYOUTS.has(lower)) {
      result.layout = lower;
      continue;
    }
    const width = lower.match(WIDTH);
    if (width) {
      const value = Number(width[1]);
      if (value >= WIDTH_RANGE[0] && value <= WIDTH_RANGE[1]) result.width = `${value}%`;
      else warn(`:::photo 的宽度 ${token} 超出 ${WIDTH_RANGE[0]}% 到 ${WIDTH_RANGE[1]}%，按默认宽度处理。`);
      continue;
    }
    warn(`:::photo 不认识参数 ${token}，可用的是 left / right / wide / row 和 25% 到 60% 的宽度。`);
  }
  return result;
}

/** 论文对照里用来切中英两半的 `:::zh`，在 :::photo 里没有意义，见到就丢掉。 */
const ZH_MARKER = /^:::+\s*zh\s*$/i;

function photoFigure(args, body, warn) {
  const images = [];
  const captions = [];
  /*
   * 内层容器（:::animation、:::tabs、套着的 :::photo…）在 :::photo 里没有意义：
   * 只按顶层算，连内层的内容一起跳过，免得标记被摊平成图注里的字面量「:::animation kmp:::」。
   * 找到就警告一次，方便作者发现自己套错了。
   */
  let nested = 0;
  let nestedWarned = false;
  for (const node of body) {
    const text = markerText(node);
    if (nested > 0) {
      if (CLOSE.test(text)) nested -= 1;
      else if (ANY_OPEN.test(text) && !ZH_MARKER.test(text)) nested += 1;
      continue;
    }
    if (text && (ZH_MARKER.test(text) || CLOSE.test(text))) continue;
    if (text && ANY_OPEN.test(text)) {
      if (!nestedWarned) {
        warn(':::photo 里不支持再套容器，这个内层容器的内容不输出。');
        nestedWarned = true;
      }
      nested = 1;
      continue;
    }
    const found = imagesOnly(node);
    if (found) images.push(...found);
    else captions.push(node);
  }
  if (images.length === 0) {
    warn(':::photo 里没有找到可用的图片，整个容器不输出。');
    return null;
  }

  let layout = args.layout || (images.length > 1 ? 'row' : '');
  if (images.length > 1 && layout !== 'row') {
    warn(`:::photo ${layout} 里放了 ${images.length} 张图，多张图只能排成 row，已按 row 处理。`);
    layout = 'row';
  }
  if (args.width && layout !== 'left' && layout !== 'right') {
    warn(':::photo 的宽度只对 left / right 生效。');
  }

  // 容器里自己写的文字优先；只有一张图又没写文字时，退回到 alt。
  const cap = captions.length > 0
    ? caption(captions.flatMap((node) => (node.type === 'paragraph' ? node.children : [node])))
    : images.length === 1 ? altCaption(images[0]) : null;

  const extra = {};
  if (layout) extra['data-layout'] = layout;
  // 宽度只对 left / right 生效（上面已经警告过），别的排法不写这个变量，免得和警告自相矛盾。
  if (args.width && (layout === 'left' || layout === 'right')) extra.style = `--photo-w: ${args.width}`;

  const media = layout === 'row' ? [photoRow(images)] : images;
  return figure(['figure', 'photo'], cap ? [...media, cap] : media, extra);
}

/** 从 children[start] 的开标记往下找配对的闭合标记，按嵌套层数计数。 */
function findClose(children, start) {
  let depth = 1;
  for (let i = start + 1; i < children.length; i += 1) {
    const text = markerText(children[i]);
    if (!text) continue;
    if (CLOSE.test(text)) {
      depth -= 1;
      if (depth === 0) return i;
    } else if (ANY_OPEN.test(text) && !ZH_MARKER.test(text)) {
      depth += 1;
    }
  }
  return -1;
}

/** 已经是图的块（论文对照的 :::figure、刚包好的 figure）不再往里走。 */
const SKIP = new Set(['paperFigure', 'figureBlock']);

export function remarkFigure() {
  return (tree, file) => {
    const name = file?.path ? file.path.split(/[\\/]/).pop() : '未知文件';
    const warn = (message) => console.warn(`[remark-figure] ${name}：${message}`);
    walk(tree);

    function walk(node) {
      if (!node || !Array.isArray(node.children) || SKIP.has(node.type)) return;
      const children = node.children;
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        const open = markerText(child).match(OPEN);
        if (open) {
          const end = findClose(children, i);
          if (end < 0) {
            warn(':::photo 没有找到闭合的 :::，这个容器原样保留。');
            continue;
          }
          const result = photoFigure(parseArgs(open[1], warn), children.slice(i + 1, end), warn);
          // 图全被 remark-local-images 摘掉了（干净 clone 的构建）或者容器里本来就没有图：
          // photoFigure 会打一条 warning，这里整个容器不输出。
          children.splice(i, end - i + 1, ...(result ? [result] : []));
          if (!result) i -= 1;
          continue;
        }

        const images = imagesOnly(child);
        if (images && images.length === 1) {
          children[i] = plainFigure(images[0]);
          continue;
        }
        walk(child);
      }
    }
  };
}
