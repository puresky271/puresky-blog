#!/usr/bin/env python3
"""build_group_json.py — 把 extracted/*.json 整理成画廊用的分组 JSON。

external-snapshot-replica skill 的参考实现。做四件事：

1. 把示例按分组落到 public/data/<name>/<group>.json，一个分组一个文件（画廊按组懒加载）。
2. 清理示例 HTML：`p/ul/ol/li/标题` 换成 `div`（别被文章正文 .prose 排版命中）、
   去抓取时加的 `_demo_card` 之类的临时属性、把链接打上 data-<name>-link。
3. 把外部图片换成本地占位（--placeholder）：真人头像、第三方品牌 logo 一律脱敏。
4. 用 source/<slug>.md + zh/<slug>.md 的块编号给每个示例配上中文小标题、组件中文名和简介。

用法：
  python build_group_json.py \
    --manifest _scratch/<slug>/groups.json \
    --extracted _scratch/<slug>/extracted \
    --out site/public/data/geist \
    --name geist \
    --source _scratch/<slug>/source \
    --zh _scratch/<slug>/zh \
    --placeholder avatars \
    --media-prefix /media/geist/

groups.json：
{
  "actions": ["button", "copy-button"],
  "inputs": ["input"]
}
"""

import argparse
import json
import re
from pathlib import Path

from lxml import html as lhtml, etree

TRANSFORM_TAGS = {'p', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
DROP_ATTRS = {'_demo_card', '_demo_root', 'data-testid', 'data-react-aria-pressable'}


def placeholder_svg(name, prefix, media_dir, kind='avatar'):
    """生成一个纯色底加首字母的占位图，脱敏用。"""
    letter = (name[:1] or 'U').upper()
    colors = ['#0070f7', '#7928ca', '#ff0080', '#f5a623', '#50e3c2', '#28a948', '#e00', '#9f00f4']
    color = colors[sum(ord(char) for char in name) % len(colors)]
    radius = '"' if kind == 'avatar' else 'rx="12"'
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect width="64" height="64" {radius} fill="{color}"/>'
        '<text x="32" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"'
        f' font-size="28" font-weight="600" fill="#fff">{letter}</text></svg>'
    )
    safe = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or 'item'
    relative = f'{kind}s/{safe}.svg'
    target = media_dir / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(svg, encoding='utf-8')
    return f'{prefix}{relative}'


def rewrite_media(fragment, placeholder_kind, prefix, media_dir):
    """把示例里的外链图片换成本地占位图。"""
    for match in list(re.finditer(r'(?:src|poster)="([^"]+)"', fragment)):
        url = match.group(1)
        if url.startswith(prefix):
            continue
        if 'avatar' in url or 'gravatar' in url or 'githubusercontent' in url:
            name = 'user'
            found = re.search(r'[?&](?:amp;)?u=([^&]+)', url)
            if found:
                name = found.group(1)
            fragment = fragment.replace(url, placeholder_svg(name, prefix, media_dir, 'avatar'))
        elif '/_next/static/' in url and '/media/' in url and (-1 != url.find('logo-')):
            base = url.rsplit('/', 1)[-1]
            found = re.match(r'logo-([a-z-]+)', base)
            fragment = fragment.replace(
                url, placeholder_svg(found.group(1) if found else 'brand', prefix, media_dir, 'logo'))
        elif url.endswith(('.mp4', '.webm')):
            fragment = fragment.replace(url, '')
    return fragment


def clean_fragment(fragment, placeholder_kind, prefix, media_dir):
    fragment = rewrite_media(fragment, placeholder_kind, prefix, media_dir)
    wrapper = lhtml.fragment_fromstring(fragment, create_parent='div')
    for element in wrapper.iter():
        if not isinstance(element.tag, str):
            continue
        tag = element.tag.lower()
        if tag in TRANSFORM_TAGS:
            element.tag = 'div'
            if tag == 'a':
                element.set(f'data-{placeholder_kind}-link', '')
        elif tag == 'a':
            element.set(f'data-{placeholder_kind}-link', '')
        for attr in list(element.attrib):
            if attr in DROP_ATTRS:
                del element.attrib[attr]
    return ''.join(etree.tostring(child, encoding='unicode') for child in wrapper)


def parse_markdown_blocks(path):
    """解析 source/zh 的 `## BLOCK <id> [kind]` 格式，返回 [(id, kind, body)]。"""
    if not path.exists():
        return []
    blocks, current, kind, body = [], None, None, []
    for line in path.read_text(encoding='utf-8').splitlines():
        match = re.match(r'^## (?:NOTE after )?BLOCK (\w+)(?: \[(\w+)\])?', line)
        if match:
            if current is not None:
                blocks.append((current, kind, '\n'.join(body).strip()))
            current, kind, body = match.group(1), match.group(2) or 'p', []
        elif current is not None:
            body.append(line)
    if current is not None:
        blocks.append((current, kind, '\n'.join(body).strip()))
    return blocks


def load_translations(slug, source_dir, zh_dir):
    source_blocks = parse_markdown_blocks(source_dir / f'{slug}.md')
    zh_blocks = parse_markdown_blocks(zh_dir / f'{slug}.md')
    zh_by_id = {block_id: body for block_id, _kind, body in zh_blocks}
    title_id = next((block_id for block_id, kind, _ in source_blocks if kind == 'title'), None)
    desc_id = next((block_id for block_id, kind, _ in source_blocks if kind == 'desc'), None)
    headings = {
        body.strip(): zh_by_id.get(block_id, '').strip()
        for block_id, kind, body in source_blocks
        if kind in ('h2', 'h3', 'h4')
    }
    return {
        'titleZh': zh_by_id.get(title_id, '').strip(),
        'descZh': zh_by_id.get(desc_id, '').strip(),
    }, headings


def build_component(slug, extracted_dir, source_dir, zh_dir, placeholder_kind, prefix, media_dir):
    data = json.loads((extracted_dir / f'{slug}.json').read_text(encoding='utf-8'))
    translated, headings = load_translations(slug, source_dir, zh_dir)
    sections, last_heading = [], ''
    for block in data.get('blocks', []):
        if block['kind'] in ('h2', 'h3', 'h4'):
            last_heading = block.get('text', '')
            continue
        if block['kind'] != 'demo':
            continue
        html = clean_fragment(block.get('demo_html') or '', placeholder_kind, prefix, media_dir)
        if not html.strip():
            continue
        sections.append({
            'heading': last_heading,
            'headingZh': headings.get(last_heading, ''),
            'html': html,
            'code': block.get('code') or '',
        })
    return {
        'slug': slug,
        'title': data.get('title', slug),
        'titleZh': translated.get('titleZh', ''),
        'descZh': translated.get('descZh', ''),
        'sections': sections,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True, help='分组 → 页面 slug 列表的 JSON')
    parser.add_argument('--extracted', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--name', default='snapshot', help='data-<name>-link 里的名字')
    parser.add_argument('--source', default='')
    parser.add_argument('--zh', default='')
    parser.add_argument('--placeholder', default='geist', help='占位图与 data 属性的前缀')
    parser.add_argument('--media-prefix', default='/media/snapshot/')
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    media_dir = Path('site/public') / args.media_prefix.strip('/')

    for group, slugs in manifest.items():
        components = [
            build_component(
                slug,
                Path(args.extracted),
                Path(args.source or args.extracted),
                Path(args.zh or args.extracted),
                args.placeholder,
                args.media_prefix,
                media_dir,
            )
            for slug in slugs
        ]
        payload = {'group': group, 'components': components}
        target = out_dir / f'{group}.json'
        target.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{group:12s} components={len(components):2d} size={target.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
