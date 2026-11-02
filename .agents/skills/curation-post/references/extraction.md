# 摘录：把外部长文拆成块，再拼回双语文档

配套 `SKILL.md` 第 2、3、5 步。所有脚本都放在 `_scratch/<slug>/` 下（该目录已 gitignore），
不要往仓库里塞一次性工具。

## 1. 先探查页面结构

不熟的站点先打印一遍块级标签和 class 频次，按结果定选择器，别凭感觉写。

```python
# _scratch/<slug>/inspect.py
import re, sys
from collections import Counter

html = open('_scratch/<slug>/page.html', encoding='utf-8').read()
body = re.search(r'(?s)<article[^>]*>(.*)</article>', html)
body = body.group(1) if body else html

c = Counter()
for tag, cls in re.findall(r'<(p|div|section|ul|ol|li|figure|blockquote|h[1-6])\b[^>]*class="([^"]*)"', body):
    for one in cls.split():
        c[(tag, one)] += 1
for (tag, one), n in c.most_common(40):
    print(f'{n:5d}  <{tag} class={one}>')

print('段落数', len(re.findall(r'<p\b', body)))
print('图片数', len(re.findall(r'<img\b', body)))
```

一眼要能看出三件事：正文容器是谁（`<article>` / `<main>` / 某个固定 class）、段落标签是什么、
图片是 `<img>` 还是 SVG/画布（后者只能截图）。

## 2. 块级抽取器

用 lxml 走 DOM，不要用正则去标签。正则版会吃掉 `<` 后面的正文（`0 ≤ a < 100` 断在 `<` 上），
也会把行内公式、脚注、行内斜体一起扔掉。

```python
# _scratch/<slug>/extract.py
import json, re, sys
from lxml import html as LH

RAW = '_scratch/<slug>/page.html'
OUT_SRC = '_scratch/<slug>/source.md'
OUT_META = '_scratch/<slug>/meta.json'
SPACE_RE = re.compile(r'[ \t\u00a0]+')

def cls(el): return el.get('class') or ''
def text_of(el): return ''.join(el.itertext())

def inline(el):
    """DOM → 行内 markdown。规则见下面的「行内转换」。"""
    out = []
    def walk(node):
        if node.text:
            out.append(node.text.replace('$', r'\$'))   # 正文里的美元符号要转义
        for ch in node:
            c = cls(ch)
            if ch.tag == 'math':
                alt = (ch.get('alttext') or text_of(ch)).strip()
                out.append('$' + alt + '$')
            elif ch.tag == 'br':
                out.append('\n')
            elif ch.tag == 'cite':
                out.append(text_of(ch))                  # 作者年份引用原样留文字
            elif ch.tag == 'img':
                pass                                     # 表情/图标类小图见「行内转换」
            elif ch.tag in ('em', 'i') or 'font_italic' in c:
                out.append('*' + text_of(ch).strip() + '*')
            elif ch.tag in ('b', 'strong') or 'font_bold' in c:
                out.append('**' + text_of(ch).strip() + '**')
            elif 'font_typewriter' in c:
                out.append('`' + text_of(ch).strip() + '`')
            else:
                walk(ch)
            if ch.tail:
                out.append(ch.tail.replace('$', r'\$'))
    walk(el)
    s = ''.join(out)
    s = SPACE_RE.sub(' ', s)
    s = re.sub(r' *\n *', '\n', s)
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)
    s = re.sub(r'\(\s+', '(', s)
    s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'(?<!\\)<([^<>\n]{1,80}?)>', r'\\<\1\\>', s)   # 占位符转义
    return s.strip()

blocks, figures, state = [], [], {'n': 0, 'fig': 0}

def add(kind, text, **kw):
    b = {'id': 'B%d' % state['n'], 'kind': kind, 'text': text}
    b.update(kw)
    blocks.append(b)
    state['n'] += 1
    return b

def heading(el):
    lvl = int(el.tag[1])
    add('h', re.sub(r'\s+', ' ', text_of(el)).strip(), level=lvl)

def emit(node):
    for ch in node:
        if ch.tag is None:
            continue
        t, c = ch.tag, cls(ch)
        if t in ('h2', 'h3', 'h4'):
            heading(ch)
        elif t == 'p' and re.search(r'\bp\b', c):
            txt = inline(ch)
            if txt: add('p', txt)
        elif t in ('ul', 'ol'):
            items = []
            for li in ch.findall('./li'):
                body = inline(li).replace('\n', ' ')
                items.append('- ' + body.strip())
            if items: add('ul', '\n'.join(items))
        elif t == 'blockquote':
            paras = [inline(p).strip() for p in ch.findall('.//p')]
            paras = [p for p in paras if p]
            if paras: add('quote', '\n\n'.join(paras))
        elif t == 'figure':
            state['fig'] += 1
            n = state['fig']
            img = ch.find('.//img')
            cap = ch.find('.//figcaption')
            cap = inline(cap) if cap is not None else ''
            figures.append({'fig': n, 'src': img.get('src') if img is not None else '',
                            'caption_en': re.sub(r'\s+', ' ', cap).strip()})
            add('fig', '@@FIG %d@@' % n, fig=n)
        elif t in ('div', 'section', 'article', 'main'):
            emit(ch)

doc = LH.parse(RAW).getroot()
root = doc.find('.//article') or doc.find('.//main') or doc
emit(root)

parts = []
for b in blocks:
    if b['kind'] == 'h':
        parts.append('#' * b['level'] + ' ' + b['text'])
    elif b['kind'] == 'quote':
        parts.append('\n\n'.join('> ' + p for p in b['text'].split('\n\n')))
    else:
        parts.append(b['text'])
open(OUT_SRC, 'w', encoding='utf-8').write('\n\n'.join(parts) + '\n')
json.dump({'blocks': blocks, 'figures': figures},
          open(OUT_META, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('blocks', len(blocks), 'figures', len(figures))
```

### 行内转换规则

| 原文 DOM | 输出 | 说明 |
| --- | --- | --- |
| `<math alttext="…">` | `$…$` | 优先用 `alttext`，没有就用 `<annotation encoding="application/x-tex">` 里的 LaTeX |
| `<cite>` / 作者年份链接 | 纯文字（`(Card et al., 1983)`） | 括号在 cite 外面，保留文字就自然带括号 |
| `<em>` / 斜体 span | `*…*` | |
| `<b>` / 粗体 span | `**…**` | |
| 等宽 span | `` `…` `` | |
| `<br>` | `\n` | 引文里一个 `<br>` 就是一轮发言 |
| `<img>`（小图标、表情） | 映射成 unicode 表情，或删 | 正文里当表情用的小图常被漏掉，抽出后要人工扫一眼句子通不通 |
| 脚注 | `（脚注：…）` 就地插进去 | 先把 `sup` 编号和 `ltx_tag_note` 那类标签去掉，否则会变成「22 正文」 |
| 占位符 `<name>` | `\<name\>` | ASCII 尖括号在 Markdown 里会被当 HTML 吃掉，必须转义 |
| 正文里的单个 `$` | `\$` | 金额、变量名之类，不转义会被当成行内公式起点 |

抽完先跑一遍体检，确认没有空块、原始标签、双空格、奇数个 `$`：

```python
for b in blocks:
    t = b['text']
    if not t.strip(): print(b['id'], 'EMPTY')
    if re.search(r'<[a-zA-Z/][^>]*>', t): print(b['id'], 'RAW_TAG', t[:80])
    if t.replace(r'\$', '').count('$') % 2: print(b['id'], 'ODD_DOLLAR')
```

## 3. 下载并缩放原图

```python
# _scratch/<slug>/fetch-figs.py
import json, os, sys, time, urllib.request
from PIL import Image

BASE = 'https://<站点>/path/to/'
OUT = 'site/src/content/posts/images/<slug>'
MAXW = 1800
os.makedirs(OUT, exist_ok=True)

def fetch(url, attempts=5):
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except Exception:
            time.sleep(1.5 * (i + 1))
    raise

meta = json.load(open('_scratch/<slug>/meta.json', encoding='utf-8'))
for f in meta['figures']:
    dst = os.path.join(OUT, 'fig-%02d.png' % f['fig'])
    src = f['src'] if f['src'].startswith('http') else BASE + f['src']
    tmp = '_scratch/<slug>/raw-%02d' % f['fig']
    open(tmp, 'wb').write(fetch(src))
    im = Image.open(tmp)
    w, h = im.size
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGB')
    if w > MAXW:
        im = im.resize((MAXW, round(h * MAXW / w)), Image.LANCZOS)
    im.save(dst, optimize=True)
    print('fig%02d %dx%d -> %.2f MB' % (f['fig'], w, h, os.path.getsize(dst) / 1048576))
```

失败重试要留着，arxiv 和不少博客都会偶发 SSL 断开。

## 4. 交互图截图（只能截图的场合）

```js
// _scratch/<slug>/shoot-figs.mjs
import { chromium } from 'file:///C:/Users/16019/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';

const CHROME = 'C:/Users/16019/AppData/Local/Programs/ChromiumForTesting/chrome-win/chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('<原文 url>', { waitUntil: 'networkidle', timeout: 120000 });

// 关键：原图自带的图注先藏掉，否则拼出来双图注
await page.addStyleTag({ content: 'figure figcaption { display: none !important; }' });

const figs = page.locator('figure');
for (let i = 0; i < await figs.count(); i++) {
  const f = figs.nth(i);
  await f.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);          // 等交互组件画完
  await f.screenshot({ path: `site/src/content/posts/images/<slug>/fig-${String(i + 1).padStart(2, '0')}.png` });
}
await browser.close();
```

- playwright-core 只在本机 npx 缓存里（路径见上），别往 `package.json` 里加依赖。
- 布局塌了（宽度 0、元素叠在一起）的图，先 `page.addStyleTag` 强制给容器宽度、改成两列网格再拍。
- 可拖动的交互图只能拍默认状态，图注里要写一句「原文这张图可以拖动，这里只截了默认状态」。

## 5. 拼装

```python
# _scratch/<slug>/assemble.py
import json, re, sys

ROOT = '_scratch/<slug>'
OUT = 'site/src/content/posts/<slug>.md'
meta = json.load(open(f'{ROOT}/meta.json', encoding='utf-8'))
zh = json.load(open(f'{ROOT}/zh.json', encoding='utf-8'))     # {'B0': '中文', ...}
caps = json.load(open(f'{ROOT}/captions-zh.json', encoding='utf-8'))

def heading(b):
    lvl = b['level']
    en = b['text'].strip().rstrip(':')
    z = zh[b['id']].strip()
    z = re.sub(r'^\s*#{1,6}\s*', '', z).rstrip('：:').strip()   # 译文里可能带了井号
    return '%s %s（%s）' % ('#' * lvl, z, en)

def figure(b):
    n = b['fig']
    cap = next(f['caption_en'] for f in meta['figures'] if f['fig'] == n)
    return (':::figure\n'
            '![中文 alt](./images/<slug>/fig-%02d.png)\n\n'
            '%s\n\n'
            ':::zh\n%s\n:::\n:::' % (n, cap, caps[str(n)]))

def bilingual(b):
    return ':::bi\n\n%s\n\n:::zh\n\n%s\n:::' % (b['text'].strip(), zh[b['id']].strip())

body = [open(f'{ROOT}/preamble.md', encoding='utf-8').read().strip()]
for b in meta['blocks']:
    if b['kind'] == 'h':
        body.append(heading(b))
    elif b['kind'] == 'fig':
        body.append(figure(b))
    else:
        body.append(bilingual(b))
    for note in annotations.get(b['id'], []):          # 注解挂在具体块后面
        body.append(':::annotation\n%s\n:::' % note.strip())

text = '\n\n'.join(body) + '\n'
text = re.sub(r'\n{3,}', '\n\n', text)
open(OUT, 'w', encoding='utf-8').write(text)
print('写出', OUT, len(text), '字符')
```

要点：

- 标题一律**放在容器外面**，中文在前、英文括注在后，`## 中文（English）`。
- `:::bi` 和正文之间空一行；容器里放 `$$` 行间公式时，公式前后也要空一行。
- 引文块整块只出一个引用框：段与段之间用一行裸 `>` 接起来，不要用空行（用空行会变成一排左框错开的独立引用块）。
- 图注中文那半以「图 N：」开头。
- 拼完再跑一遍统计：`:::bi` 对数、`:::figure` 张数、`:::annotation` 条数，和 `meta.json` 对一遍。

## 6. 页面结构核对

dev server 起来后，直接抓 HTML 数一遍，比肉眼看快：

```python
import re, urllib.request
html = urllib.request.urlopen('http://localhost:4321/posts/<slug>/').read().decode('utf-8')
for name, pat in {
    'bi-en': r'class="bi-en"', 'bi-zh': r'class="bi-zh"',
    'figure': r'class="paper-figure"', 'annotation': r'callout-annotation',
    'img': r'<img[^>]+src="/_image/', 'placeholder': r'__ASTRO_IMAGE_',
    'katex': r'\bkatex\b', 'toggle': r'paper-lang',
}.items():
    print('%-12s %d' % (name, len(re.findall(pat, html))))
```

`placeholder` 必须为 0。不为 0 就是第 3 步说的图片元数据没重扫，`astro dev --force` 重启。
