#!/usr/bin/env python3
"""extract_tokens.py — 从原站 CSS 里抽出设计令牌（亮色 / 暗色两套），生成作用域内的令牌文件。

external-snapshot-replica skill 的参考实现。要点：

- 亮色令牌通常定义在 :root / .light-theme 上，暗色在 .dark / [data-theme='dark'] 上；
  两个都命中的规则（比如 `:root, .dark, .dark-theme`）按「共享」处理，两边都生效。
- 保留原始层叠顺序：同一个变量经常在「回退块」和「现代值块」里各定义一次，
  顺序错了会把 hex 覆盖成 lab()/oklch() 回退值。
- 一条规则里最后一条声明常常没有分号，正则要写成 `[^;{}]+`，不能要求结尾 `;`。
- 输出挂在作用域根类上（--scope），暗色用站点的 [data-theme='dark'] 前缀。

用法：
  python extract_tokens.py \
    --css _scratch/<slug>/main.css \
    --light ':root' --dark '.dark' \
    --prefix --ds- --prefix --geist- --prefix --shadow- \
    --scope '.geist-demo' \
    --out site/src/components/animation/geist/tokens.css \
    --json-out _scratch/geist/tokens.json
"""

import argparse
import json
import re
from pathlib import Path


def scan_rules(css):
    """顶层规则扫描器，返回 [(selector, body)]。"""
    rules = []
    index = 0
    while True:
        brace = css.find('{', index)
        if brace < 0:
            break
        start = max(css.rfind('}', 0, brace), css.rfind('*/', 0, brace), 0)
        if start > 0:
            start += 1
        selector = css[start:brace].strip()
        if '{' in selector:
            selector = selector[selector.rfind('{') + 1:].strip()
        if selector.startswith('@'):
            index = brace + 1
            continue
        depth = 1
        cursor = brace + 1
        while cursor < len(css) and depth > 0:
            if css[cursor] == '{':
                depth += 1
            elif css[cursor] == '}':
                depth -= 1
            cursor += 1
        rules.append((selector, css[brace + 1:cursor - 1]))
        index = cursor
    return rules


def classify(selector_text, light_markers, dark_markers):
    selectors = [item.strip() for item in selector_text.split(',')]
    has_light = any(marker in selectors for marker in light_markers)
    has_dark = any(marker in selectors for marker in dark_markers)
    if has_light and has_dark:
        return 'shared'
    if has_light:
        return 'light'
    if has_dark:
        return 'dark'
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--css', nargs='+', required=True)
    parser.add_argument('--light', nargs='+', default=[':root'])
    parser.add_argument('--dark', nargs='+', default=['.dark', '.dark-theme'])
    parser.add_argument(
        '--prefix',
        default='',
        help='逗号分隔的变量前缀，不带前导 --，比如 ds-,geist-；留空则保留全部自定义属性',
    )
    parser.add_argument('--scope', default='.snapshot-root')
    parser.add_argument('--out', required=True)
    parser.add_argument('--json-out', default='')
    args = parser.parse_args()

    prefixes = tuple(
        '--' + item.strip().lstrip('-') for item in args.prefix.split(',') if item.strip()
    ) or ('--',)
    light_rules, dark_rules, shared_rules = [], [], []
    for path in args.css:
        css = Path(path).read_text(encoding='utf-8', errors='ignore')
        for selector, body in scan_rules(css):
            props = [
                (name, value.strip())
                for name, value in re.findall(r'(--[a-z0-9-]+)\s*:\s*([^;{}]+)', body)
                if name.startswith(prefixes)
            ]
            if len(props) < 3:
                continue
            kind = classify(selector, args.light, args.dark)
            if kind == 'light':
                light_rules.append(props)
            elif kind == 'dark':
                dark_rules.append(props)
            elif kind == 'shared':
                shared_rules.append(props)

    def flatten(rule_list):
        merged = {}
        for props in rule_list:
            merged.update(dict(props))
        return merged

    def format_props(props, indent='  '):
        return '\n'.join(f'{indent}{name}: {value};' for name, value in props)

    parts = [
        '/**',
        ' * 外部示例快照的设计令牌。',
        ' *',
        ' * 由 external-snapshot-replica skill 的 extract_tokens.py 从原站 CSS 抽出，',
        f' * 全部挂在 {args.scope} 下面，暗色用站点的 [data-theme=\'dark\'] 切换。',
        ' * 变量名和数值保留原站，不要手改。',
        ' */',
        '',
        f'{args.scope} {{',
    ]
    for props in light_rules:
        parts.append(format_props(props))
    for props in shared_rules:
        parts.append(format_props(props))
    parts.append('}')
    parts.append('')
    parts.append(f"[data-theme='dark'] {args.scope} {{")
    for props in dark_rules:
        parts.append(format_props(props))
    parts.append('}')
    parts.append('')

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(parts), encoding='utf-8')
    print(f'写入 {out}（亮色 {len(flatten(light_rules))} 个，暗色 {len(flatten(dark_rules))} 个，共享 {len(flatten(shared_rules))} 个）')

    if args.json_out:
        payload = {'light': flatten(light_rules + shared_rules), 'dark': flatten(dark_rules)}
        Path(args.json_out).write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'令牌 JSON 写入 {args.json_out}')


if __name__ == '__main__':
    main()
