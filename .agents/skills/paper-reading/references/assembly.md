# 拼装：块序列 → 中英对照正文

配套 `SKILL.md` 第 5 步。脚本放 `_scratch/<slug>/assemble.py`。

拼装只做一件事：把 `meta.json` 的英文块、`zh/chunkN.md` 的中文块、图注和注解按顺序接起来。
所有判断（哪块是标题、哪块是图、注解挂哪）都来自数据，不靠手写。

## 输入

- `meta.json`：`blocks`（`id` / `kind` / `level` / `num` / `fig`）、`figures`（`fig` / `caption_en`）、`title`、`authors`
- `zh/chunk1.md …`：`<<<B12>>>` 分隔的中文块
- `captions-zh.json`：`{"1": "图 1：…"}`
- `annotations.json`：`[{"after": "B11", "text": "…"}, …]`
- `preamble.md`：frontmatter + `:::source` + `> [!NOTE]` 编者按，手写

## 骨架

```python
# _scratch/<slug>/assemble.py
import json, os, re, sys

ROOT = '_scratch/<slug>'
OUT = 'site/src/content/posts/<slug>.md'
IMG_DIR = './images/<slug>'

meta = json.load(open(os.path.join(ROOT, 'meta.json'), encoding='utf-8'))
blocks, figures = meta['blocks'], meta['figures']
caps = json.load(open(os.path.join(ROOT, 'captions-zh.json'), encoding='utf-8'))
anns = json.load(open(os.path.join(ROOT, 'annotations.json'), encoding='utf-8'))

# 1) 读所有译文包，按块号合并
zh = {}
for name in sorted(os.listdir(os.path.join(ROOT, 'zh'))):
    if not name.endswith('.md'): continue
    raw = open(os.path.join(ROOT, 'zh', name), encoding='utf-8').read()
    parts = re.split(r'^<<<(B\d+)>>>[ \t]*$', raw, flags=re.M)
    for i in range(1, len(parts) - 1, 2):
        zh[parts[i]] = parts[i + 1].strip('\n')

missing = [b['id'] for b in blocks if b['id'] not in zh]
if missing:
    sys.exit('还缺这些块：' + ', '.join(missing))

ann = {}
for a in anns:
    ann.setdefault(a['after'], []).append(a['text'])

def strip_hashes(s):
    return re.sub(r'^\s*#{1,6}\s*', '', s).strip()

def heading(b):
    lvl = b['level']
    en = b['text'].strip().rstrip(':').strip()
    z = strip_hashes(zh[b['id']]).rstrip('：:').strip()
    num = (b.get('num') or '').strip()
    if num.startswith('Appendix'):              # 附录标题带字母，方便按引用找
        return '%s 附录 %s：%s（%s）' % ('#' * lvl, num.split()[-1], z, en)
    if not z or z == en:
        return '%s %s' % ('#' * lvl, en)
    return '%s %s（%s）' % ('#' * lvl, z, en)

def as_quote(text):
    """整块只出一个引用框：段间用一行裸 > 接起来，不要用空行（会散成一排框）。"""
    text = '\n'.join(re.sub(r'^\s*>\s?', '', ln) for ln in text.split('\n'))
    text = re.sub(r'\n{3,}', '\n\n', text)
    paras = [p.strip('\n') for p in text.split('\n\n') if p.strip()]
    return '\n>\n'.join(
        '\n'.join(('> ' + ln) if ln.strip() else '>' for ln in p.split('\n'))
        for p in paras
    )

def bilingual(b):
    en = b['text'].strip('\n')
    zt = zh[b['id']].strip('\n')
    if b['kind'] == 'quote':
        en, zt = as_quote(en), as_quote(zt)
    # 前后都空一行：容器标记才不会被懒续行吞掉，$$ 行间公式才认得出
    return ':::bi\n\n%s\n\n:::zh\n\n%s\n:::' % (en, zt)

def figure(b):
    n = b['fig']
    f = next(x for x in figures if x['fig'] == n)
    alt = re.sub(r'\s+', ' ', f['caption_en'])[:80].replace('*', '')
    return (':::figure\n'
            '![%s](%s/fig-%02d.png)\n\n'
            'Figure %d: %s\n\n'
            ':::zh\n%s\n:::\n:::' % (alt, IMG_DIR, n, n, f['caption_en'], caps[str(n)]))

body = [open(os.path.join(ROOT, 'preamble.md'), encoding='utf-8').read().strip()]
for b in blocks:
    if b['kind'] == 'h':
        body.append(heading(b))
    elif b['kind'] == 'fig':
        body.append(figure(b))
    else:
        body.append(bilingual(b))
    for note in ann.get(b['id'], []):
        body.append(':::annotation\n%s\n:::' % note.strip())

text = re.sub(r'\n{3,}', '\n\n', '\n\n'.join(body) + '\n')
open(OUT, 'w', encoding='utf-8').write(text)

print('写出', OUT, len(text), '字符')
print('bi %d  figure %d  annotation %d  h2 %d  h3 %d' % (
    text.count(':::bi'), text.count(':::figure'), text.count(':::annotation'),
    len(re.findall(r'(?m)^## ', text)), len(re.findall(r'(?m)^### ', text))))
```

## 拼装规则

**标题在容器外面。** `:::bi` 只包正文段落。标题写成 `## 中文（English）`，读者在两种语言下都看到同一个标题，字数统计也不会把标题算两遍。

**附录标题带字母。** `## 附录 A：架构优化（Architecture Optimizations）`。正文里的 `Appendix A` 引用靠这个找。

**不要给标题加编号。** 站点的目录会自动编号（第一章是 `1.`，第一小节是 `1.1`），自己再写一遍会变成 `1. 3. 引言`。原文编号的跨节引用（`§4.1`）保留在正文里，编者按里说明两者不一定对齐。

**`:::bi` 前后空行。** 标记和正文贴在一起会被段落懒续行吞掉；里面放 `$$` 行间公式时，公式前后也要各空一行。

**引文整块一个框。** 论文里的提示词模板、台词、种子记忆都是 `blockquote`。段与段之间用一行裸 `>` 接，不要用空行——用空行会散成一排各自错开的引用框。

**图注。** 英文照抄（去掉 `Figure N.` 前缀，前缀由模板补），中文以「图 N：」开头。图注中文写「该看哪里」，不重复英文。

**注解挂具体块。** `annotations.json` 用 `after` 指块号，插在该块后面。一般十六到二十条：每个「值得停一下」的地方挂一条，不要每段都挂，也不要集中堆在末尾。

**行间公式中英两半写同一份 LaTeX。** 不要给中文侧换符号，读者切回英文时要看到一模一样的式子。

## 自检

拼完先看四个数，和 `meta.json` 对：

- `:::bi` 数 = 段落 + 列表 + 引文块数
- `:::figure` 数 = 图数
- `:::annotation` 数 = 注解条数
- 标题数 = h2 + h3 + h4 数

再看页面（`SKILL.md` 第 6 步）：`__ASTRO_IMAGE_` 必须为 0，否则先 `astro dev --force` 重启。

## 常见返工

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 标题变成 `## ## 引言` | 译文块自己带了井号，拼装又补了一次 | 拼装时 `strip_hashes()`，或者分包时告诉译者别加 |
| 引文散成一排框 | 段间用了空行 | `as_quote()` 用裸 `>` 接 |
| 行间公式变成行内 | `:::bi` 后紧跟 `$$`，被并进同一段 | 公式前后各空一行，输出模板固定 `:::bi\n\n…\n\n:::zh\n\n…\n:::` |
| 字数翻倍 | 标题或图注漏在容器外，或者把英文也算进去了 | 字数只算中文半边（`stripBilingualEnglish`） |
| 图号错位 | 抽图时顺序和图注的 `Figure N` 不一致 | 以 `figcaption` 里的编号为准，别按 DOM 顺序重编 |
| 附录标题找不到 | 只写了中文、没写字母前缀 | `附录 A：…` 和正文引用对齐 |
