#!/usr/bin/env python3
"""extract_demos.py — 从抓下来的外部文档页里抽正文块、示例卡片和 Show code 代码。

这是 external-snapshot-replica skill 的参考实现：默认值按 Next.js + Tailwind 的文档页调，
别的站点改 config.json 里的选择器就能用，不要直接魔改脚本正文。

依赖：lxml

用法：
  python extract_demos.py --config _scratch/<slug>/config.json

config.json 示例：

{
  "pagesDir": "_scratch/geist/pages",
  "outDir": "_scratch/geist/extracted",
  "mainSelector": "main",
  "showCodeTexts": ["show code"],
  "cardClassHints": ["bg-background-100", "border-gray-alpha-400"],
  "demoAreaClassHints": ["overflow-x-auto"],
  "junkPrefixes": ["Was this helpful", "Give feedback", "supported.", "Send"],
  "transform": { "toDiv": ["p", "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"] }
}

产出 outDir/<page>.json：

{
  "slug": "button",
  "title": "Button",
  "description": "...",
  "blocks": [
    {"kind": "h2", "text": "Sizes"},
    {"kind": "p", "text": "..."},
    {"kind": "demo", "demo_html": "<div .../>", "code": "..."}
  ],
  "demo_count": 10,
  "code_count": 10,
  "codes": ["..."]
}
"""

import argparse
import json
import re
from pathlib import Path

from lxml import html as lhtml, etree

# RSC payload 里示例代码可能被双重转义（反引号和 ${} 前面是两个反斜杠）。
# 抓取阶段先换成占位符，避免正则把代码在第一个模板字面量处截断。
PLACEHOLDER_TICK = '\x01'
PLACEHOLDER_DOLLAR = '\x02'

DEFAULT_JUNK = [
    'Was this helpful', 'Give feedback', 'supported.', 'Send',
    'Previous', 'Next', 'Foundations', 'Components',
]


def norm(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def text_of(element):
    return norm(element.text_content())


def serialize(element):
    return etree.tostring(element, encoding='unicode', method='html')


def decode_rsc(value):
    return (
        value.replace('\\x01', '`')
        .replace('\\x02', '$')
        .replace('\\n', '\n')
        .replace('\\"', '"')
        .replace('\\u003c', '<')
        .replace('\\u003e', '>')
        .replace('\\u0026', '&')
        .replace('\\u0027', "'")
        .replace('\\\\', '\\')
    )


def extract_codes(raw):
    raw = raw.replace('\\\\`', '\\x01').replace('\\\\$', '\\x02')
    pattern = re.compile(r'__rawString__:`((?:[^`\\]|\\.)*)`', re.S)
    return [decode_rsc(match.group(1)) for match in pattern.finditer(raw)]


def find_demo_card(button, hints):
    element = button.getparent()
    while element is not None:
        classes = element.get('class') or ''
        if all(hint in classes for hint in hints):
            return element
        element = element.getparent()
    return None


def find_demo_area(card, area_hints, footer_hints):
    for child in card:
        if child.tag != 'div':
            continue
        classes = child.get('class') or ''
        if any(hint in classes for hint in area_hints):
            return child[0] if len(child) else child
    for child in card:
        if child.tag != 'div':
            continue
        classes = child.get('class') or ''
        if any(hint in classes for hint in footer_hints) or child.get('data-state'):
            continue
        return child
    return None


def parse_page(path, config):
    raw = path.read_text(encoding='utf-8', errors='ignore')
    document = lhtml.parse(str(path))
    body = document.getroot().find('body')
    main = body.find('.//' + config['mainSelector'])
    if main is None:
        return None

    title_el = main.find('.//h1')
    title = text_of(title_el) if title_el is not None else ''
    description = ''
    if title_el is not None and title_el.getnext() is not None and title_el.getnext().tag == 'p':
        description = text_of(title_el.getnext())

    # 示例卡片：按「Show code」按钮定位 footer，再往上找卡片外壳
    show_texts = [t.lower() for t in config.get('showCodeTexts', ['show code'])]
    cards = []
    seen = set()
    for button in main.iter('button'):
        label = text_of(button).lower()
        if not any(text in label for text in show_texts):
            continue
        card = find_demo_card(button, config.get('cardClassHints', []))
        if card is None or id(card) in seen:
            continue
        seen.add(id(card))
        area = find_demo_area(
            card,
            config.get('demoAreaClassHints', ['overflow-x-auto']),
            config.get('footerClassHints', ['bg-background-200']),
        )
        cards.append((card, area if area is not None else card))

    codes = extract_codes(raw)

    for card, _area in cards:
        for element in card.iter():
            if isinstance(element.tag, str):
                element.set('_demo_card', '1')
        card.set('_demo_root', '1')

    junk_prefixes = tuple(config.get('junkPrefixes', DEFAULT_JUNK))
    blocks = []

    def push(kind, **kwargs):
        item = {'kind': kind}
        item.update(kwargs)
        blocks.append(item)

    def content_root():
        for child in main:
            if child.tag in ('div', 'section') and child.find('.//h1') is not None:
                return child
        for element in main.iter():
            if element.tag == 'h1':
                return element.getparent()
        return main

    def walk(element):
        if element.get('_demo_root'):
            for index, (card, area) in enumerate(cards):
                if card is element:
                    push(
                        'demo',
                        demo_html=serialize(area),
                        code=codes[index] if index < len(codes) else None,
                        card_class=card.get('class'),
                    )
                    return
            return
        if element.get('_demo_card'):
            return
        tag = element.tag if isinstance(element.tag, str) else ''
        if tag in ('script', 'style', 'svg', 'path', 'noscript', 'h1'):
            return
        if tag in ('h2', 'h3', 'h4'):
            push('h' + tag[1], text=text_of(element), id=element.getparent().get('id'))
            return
        if tag == 'p':
            text = text_of(element)
            if text:
                push('p', text=text, html=serialize(element))
            return
        if tag in ('ul', 'ol'):
            items = [{'text': text_of(li), 'html': serialize(li)} for li in element.findall('li')]
            if items:
                push(tag, items=items)
            return
        if tag == 'pre':
            push('pre', text=element.text_content())
            return
        if tag == 'table':
            rows = []
            for row in element.iter('tr'):
                cells = [text_of(cell) for cell in row]
                if any(cells):
                    rows.append(cells)
            push('table', rows=rows, html=serialize(element))
            return
        if tag in ('img', 'video'):
            push(tag, src=element.get('src'), alt=element.get('alt'),
                 poster=element.get('poster'), html=serialize(element))
            return
        if tag == 'blockquote':
            push('blockquote', text=text_of(element), html=serialize(element))
            return
        for child in element.iterchildren():
            walk(child)

    root = content_root()
    if root is not None:
        walk(root)

    return {
        'slug': path.stem,
        'title': title,
        'description': description,
        'blocks': blocks,
        'demo_count': len(cards),
        'code_count': len(codes),
        'codes': codes,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True, help='config.json 路径')
    args = parser.parse_args()

    config = json.loads(Path(args.config).read_text(encoding='utf-8'))
    pages_dir = Path(config['pagesDir'])
    out_dir = Path(config['outDir'])
    out_dir.mkdir(parents=True, exist_ok=True)

    stats = []
    for path in sorted(pages_dir.glob('*.html')):
        try:
            data = parse_page(path, config)
        except Exception as error:  # noqa: BLE001 — 单页失败不阻断整批
            print(f'ERROR {path.name}: {error}')
            continue
        if data is None:
            print(f'NOMAIN {path.name}')
            continue
        (out_dir / f'{path.stem}.json').write_text(
            json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        stats.append((path.stem, len(data['blocks']), data['demo_count'], data['code_count']))

    for slug, blocks, demos, codes in stats:
        flag = '' if demos == codes else '  <-- demo/code 数量不一致，检查选择器'
        print(f'{slug:30s} blocks={blocks:3d} demos={demos:2d} codes={codes:2d}{flag}')


if __name__ == '__main__':
    main()
