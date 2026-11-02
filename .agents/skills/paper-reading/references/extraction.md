# 抽取：把论文 HTML 拆成块

配套 `SKILL.md` 第 2 步。脚本放 `_scratch/<slug>/extract.py`。

## 先探查，再写选择器

不同来源的 HTML 结构差别很大，先花两分钟看清楚再动手：

```python
# _scratch/<slug>/inspect.py
import re
from collections import Counter

html = open('_scratch/<slug>/paper.html', encoding='utf-8').read()
body = re.search(r'(?s)<article[^>]*>(.*)</article>', html)
print('article', bool(body), len(body.group(1)) if body else len(html))
body = body.group(1) if body else html

c = Counter()
for tag, cls in re.findall(r'<(p|div|section|figure|figcaption|blockquote|ul|li|h[1-6]|math|cite)\b[^>]*class="([^"]*)"', body):
    for one in cls.split():
        c[(tag, one)] += 1
for (tag, one), n in c.most_common(45):
    print(f'{n:5d}  <{tag} class={one}>')
```

要确认的五件事：

1. 正文容器（`<article>` / `<main>` / `<div class="ltx_page_main">`）。
2. 段落标签：LaTeXML 是 `div.ltx_para` 包 `p.ltx_p`。
3. 标题层级：`section.ltx_section` / `ltx_subsection` / `ltx_subsubsection` 里各一个 `h2/h3/h4`，编号在 `span.ltx_tag` 里。
4. 图的形态：`figure.ltx_figure` + `figcaption`；arXiv 上基本是 PNG，Transformer Circuits 上大量是可交互 SVG。
5. 公式：LaTeXML 的 `<math alttext="…">` 里直接是 LaTeX。

## LaTeXML（arXiv 官方 / ar5iv）选择器

| 目标 | 选择器 |
| --- | --- |
| 标题 | `article > h1.ltx_title_document` |
| 作者 | `span.ltx_personname` |
| 摘要 | `div.ltx_abstract`（含 `h6` 标题和若干 `p.ltx_p`） |
| 一级到三级小节 | `section.ltx_section` / `ltx_subsection` / `ltx_subsubsection` |
| 附录 | `section.ltx_appendix`（标题是里面自带的 `h2`） |
| 段落 | `p.ltx_p`（外面通常包一层 `div.ltx_para`） |
| 列表 | `ul.ltx_itemize` / `ol.ltx_enumerate`，条目 `li.ltx_item` |
| 引文块 | `blockquote.ltx_quote`（提示词模板、智能体台词、种子记忆都在这里） |
| 图 | `figure.ltx_figure` + `figcaption.ltx_caption` |
| 脚注 | `span.ltx_note.ltx_role_footnote` |
| 参考文献 | `section.ltx_bibliography`（整节跳过） |

## 抽取器骨架

```python
# _scratch/<slug>/extract.py
import json, re, sys
from lxml import html as LH

RAW = '_scratch/<slug>/paper.html'
OUT_SRC = '_scratch/<slug>/source.md'
OUT_META = '_scratch/<slug>/meta.json'

SPACE_RE = re.compile(r'[ \t\u00a0]+')
SKIP_CLASS = {'ltx_nodisplay', 'ltx_note_name'}
# 正文里当表情用的小图（论文自定义的标记，按站点补表）
EMOJI = {'book.png': '\U0001F4D6', 'pencil.png': '\u270F\uFE0F',
         'laptop.png': '\U0001F4BB', 'envelope.png': '\u2709\uFE0F'}

def cls(el): return el.get('class') or ''
def text_of(el): return ''.join(el.itertext())

def inline(el):
    out = []
    def walk(node):
        if node.text:
            out.append(node.text.replace('$', r'\$'))
        for ch in node:
            c = cls(ch)
            if ch.tag == 'math':
                alt = (ch.get('alttext') or text_of(ch)).strip()
                out.append('$' + alt + '$')
            elif ch.tag == 'br':
                out.append('\n')
            elif ch.tag in ('cite', 'a'):
                out.append(text_of(ch))                       # 作者年份原样留文字
            elif ch.tag == 'img':
                base = (ch.get('src') or '').rsplit('/', 1)[-1]
                out.append(EMOJI.get(base, ''))
            elif ch.tag in ('em', 'i') or 'ltx_font_italic' in c:
                tag = '*' + text_of(ch).strip() + '*'
                if ch.find('.//br') is not None:
                    tag += ' '                                # 斜体后面接答案，别粘在一起
                out.append(tag)
            elif ch.tag in ('b', 'strong') or 'ltx_font_bold' in c:
                out.append('**' + text_of(ch).strip() + '**')
            elif 'ltx_font_typewriter' in c:
                out.append('`' + text_of(ch).strip() + '`')
            elif 'ltx_role_footnote' in c:
                content = ch.find('.//span[@class="ltx_note_content"]')
                ftxt = note_text(content) if content is not None else ''
                out.append(' (Footnote: ' + re.sub(r'^\d+\s*', '', ftxt).strip() + ') ')
            elif 'ltx_tag' in c:
                pass                                          # 编号和项目符号自己生成
            elif SKIP_CLASS & set(c.split()):
                pass
            else:
                walk(ch)
            if ch.tail:
                out.append(ch.tail.replace('$', r'\$'))
    walk(el)
    s = ''.join(out)
    s = SPACE_RE.sub(' ', s)
    s = s.replace('---', '\u2014')                            # 有的文档不把 --- 转成破折号
    s = re.sub(r' *\n *', '\n', s)
    s = re.sub(r'\s+([,.;:!?])', r'\1', s)
    s = re.sub(r'\(\s+', '(', s)
    s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'(?<!\\)<([^<>\n]{1,80}?)>', r'\\<\1\\>', s)   # 占位符转义
    return s.strip()

def note_text(node):
    """脚注正文：去掉编号，保留链接；链接文字不是 URL 时把 href 补在后面。

    注意不能直接删节点——被删元素的 tail 一起没了，正文会整段消失。
    """
    buf = []
    def rec(n):
        if n.text: buf.append(n.text)
        for c in n:
            c2 = cls(c)
            skip = ('ltx_note_mark' in c2 or 'ltx_tag_note' in c2
                    or bool(SKIP_CLASS & set(c2.split())))
            if not skip:
                if c.tag == 'a':
                    label = re.sub(r'\s+', ' ', text_of(c)).strip()
                    href = c.get('href') or ''
                    buf.append(label)
                    if href.startswith('http') and href != label:
                        buf.append(' (%s)' % href)
                elif c.tag == 'br':
                    buf.append(' ')
                else:
                    rec(c)
            if c.tail: buf.append(c.tail)
    rec(node)
    s = re.sub(r'\s+', ' ', ''.join(buf))
    return re.sub(r'\s+([,.;:!?])', r'\1', s).strip()

blocks, figures, state = [], [], {'n': 0, 'fig': 0}

def add(kind, text, **kw):
    b = {'id': 'B%d' % state['n'], 'kind': kind, 'text': text}
    b.update(kw); blocks.append(b); state['n'] += 1
    return b

def heading(el, level):
    num = ''
    for sp in el.iter('span'):
        c = cls(sp)
        if 'ltx_tag' in c and 'ltx_tag_item' not in c:
            num = text_of(sp).strip(); break
    title = text_of(el).strip()
    if num and title.startswith(num):
        title = title[len(num):].strip()
    add('h', re.sub(r'\s+', ' ', title).strip(), level=level, num=num.rstrip('.').strip())

def emit_quote(el):
    paras = []
    for p in el.findall('.//p'):
        t = inline(p).strip()
        if t: paras.append(t)
    if not paras: return
    # 引文里不留内联代码和加粗，说话人单独加粗
    lines = []
    for para in paras:
        para = para.replace('`', '').replace('**', '')
        for line in para.split('\n'):
            line = line.strip()
            if not line: continue
            m = re.match(r"^([A-Z][A-Za-z’' .]{0,24}):\s*", line)
            if m:
                line = '**%s**: ' % m.group(1).strip() + line[m.end():]
            lines.append(line)
    add('quote', '\n\n'.join(lines))

def emit_figure(el):
    state['fig'] += 1
    n = state['fig']
    img = el.find('.//img')
    cap_el = el.find('.//figcaption')
    cap = inline(cap_el) if cap_el is not None else ''
    cap = re.sub(r'^Figure\s+\d+\.?\s*', '', cap).strip()
    figures.append({'fig': n, 'src': img.get('src') if img is not None else '',
                    'caption_en': cap})
    add('fig', '@@FIG %d@@' % n, fig=n)

def emit(node):
    for ch in node:
        if ch.tag is None: continue
        c, t = cls(ch), ch.tag
        if 'ltx_bibliography' in c:
            continue
        if t in ('h2', 'h3', 'h4'):
            heading(ch, int(t[1]))          # 只在这里出标题，别在 section 分支里再出一遍
        elif t == 'p' and 'ltx_p' in c:
            txt = inline(ch)
            if txt: add('p', txt)
        elif t in ('ul', 'ol'):
            items = []
            for li in ch.findall('./li'):
                body = inline(li).replace('\n', ' ')
                items.append('- ' + body.strip())
            if items: add('ul', '\n'.join(items))
        elif t == 'blockquote':
            emit_quote(ch)
        elif t == 'figure':
            emit_figure(ch)
        elif t == 'div' and 'ltx_abstract' in c:
            add('h', 'Abstract', level=2)
            for p in ch.findall('./p'):
                txt = inline(p)
                if txt: add('p', txt)
        elif t in ('section', 'div', 'span'):
            emit(ch)

doc = LH.parse(RAW).getroot()
article = doc.find('.//article') or doc.find('.//main') or doc.getroot()
title_el = article.find('./h1')
title = re.sub(r'\s+', ' ', text_of(title_el)).strip() if title_el is not None else ''
authors = [re.sub(r'\s+', ' ', text_of(p)).strip()
           for p in article.findall('.//span[@class="ltx_personname"]')]
emit(article)

parts = []
for b in blocks:
    if b['kind'] == 'h':
        parts.append('#' * b['level'] + ' ' + b['text'])
    elif b['kind'] == 'quote':
        parts.append('\n\n'.join('> ' + p.replace('\n', '\n> ') for p in b['text'].split('\n\n')))
    else:
        parts.append(b['text'])
open(OUT_SRC, 'w', encoding='utf-8').write('\n\n'.join(parts) + '\n')
json.dump({'title': title, 'authors': authors, 'blocks': blocks, 'figures': figures},
          open(OUT_META, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('blocks', len(blocks), 'figures', len(figures), 'title', title)
```

跑完打印一遍标题清单核对层级，比翻 `source.md` 快：

```python
for b in blocks:
    if b['kind'] == 'h':
        print('  ' * (b['level'] - 2) + f"{b['id']:>4} h{b['level']} [{b.get('num','')}] {b['text']}")
```

## 踩过的坑（按出现频率排）

1. **标题重复两遍**：在 `section` 分支里手动调了 `heading()`，又不小心让通用 `h2` 分支也处理了一次。
   只保留一处：让 `h2/h3/h4` 分支统一处理，`section` 分支只负责递归。
2. **脚注正文丢掉后半段**：用 `copy.deepcopy` 删节点会把被删元素的 `tail` 一起删掉，
   而 LaTeXML 的脚注正文常常正好在那个 `tail` 里。改成遍历时跳过、但照样收集 `tail`（见 `note_text`）。
3. **脚注变成「22 正文」**：`sup.ltx_note_mark` 和 `span.ltx_tag_note` 都带着编号，两处都要跳过。
4. **图号、章节号和正文对不上**：编号在 `span.ltx_tag` 里，而且 `ltx_tag_item`（项目符号）
   也是 `ltx_tag`，选的时候要排除。
5. **正文里 `<` 之后的文字全没了**：用正则 `<[^>]+>` 去标签会在数学表达式（`a < b`）上断掉。
   用 DOM 解析，并且把占位符 `\<name\>` 转义。
6. **金额消失**：正文里的 `$` 会被当成行内公式起点，文字节点里的 `$` 要转义成 `\$`。
7. **行内公式与原句粘连**：`at a rate of$15.00` 这类是清理正则把空格吃掉了。别对 `$` 两侧做 `\s+` 清理。
8. **表情符号丢失**：论文常把 🔖✏️💻 这类小图做成 `<img>` 塞在段落里，抽取时被当成装饰丢掉，
   句子就成了「会显示为，而……显示为。」。按文件名补一张映射表。
9. **行间公式没渲染**：LaTeXML 的 `<p><d-math block>…</d-math></p>` 会被当成段落文本抽出来。
   单独认这种结构，转成 `$$\n…\n$$`，并且中英两半都写同一份 LaTeX。
10. **`<br>` 变成空格把台词连成一句**：引文里 `<br>` 是换人说话，转成 `\n` 再拆段；
    但列表项里的 `<br>` 只是换行，展平成一个空格。

## 其他来源

**Transformer Circuits（transformer-circuits.pub）**：正文在 `d-article` 里，公式是
`<d-math block>`（行间）/ `<d-math>`（行内），图多是可交互 SVG，必须截图。段落、标题结构
比 LaTeXML 干净，把上面表格里的 `ltx_*` 换成对应的 `d-*` 即可，公式转换单独写一段。

**会议论文的 PDF 版**：`pdftotext -layout` 出来的文字层没有段落边界、公式全是碎片，
不建议做逐段对照。要么找到 HTML 版，要么只写导读式精选收录。

## 体检

抽完先跑一遍，四项全绿再进入翻译：

```python
bad = []
for b in blocks:
    t = b['text']
    if not t.strip(): bad.append((b['id'], 'EMPTY'))
    if re.search(r'<[a-zA-Z/][^>]*>', t): bad.append((b['id'], 'RAW_TAG ' + t[:60]))
    if '  ' in t: bad.append((b['id'], 'DOUBLE_SPACE'))
    if re.search(r'\s+[,.;:!?]', t): bad.append((b['id'], 'SPACE_BEFORE_PUNCT'))
    if t.replace(r'\$', '').count('$') % 2: bad.append((b['id'], 'ODD_DOLLAR'))
print('问题块', len(bad))
for x in bad[:40]: print(' ', x)
```

`RAW_TAG` 里如果只剩已经转义的 `\<...\>`，是误报，可以放过。
