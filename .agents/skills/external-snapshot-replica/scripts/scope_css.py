#!/usr/bin/env python3
"""scope_css.py — 把原站 CSS 里演示实际用到的规则筛出来，统一加上作用域前缀。

external-snapshot-replica skill 的参考实现。原站通常是 Tailwind 4 + CSS Modules 的组合：
  - @layer utilities 里是工具类（只需要示例 HTML 实际用到的）
  - @layer components 里是组件类（用得少，整份收）
  - 图层外还有手写的组件类（同样按用到的类过滤）
  - CSS Modules 的哈希类（整份收）

依赖：tinycss2（pip install tinycss2）

用法：
  python scope_css.py \
    --css _scratch/<slug>/main.css _scratch/<slug>/dup.css \
    --modules _scratch/<slug>/modules.css \
    --demos _scratch/<slug>/extracted \
    --scope '.geist-demo.geist-demo' \
    --out site/src/components/animation/geist/utilities.css

说明：
- --scope 写两遍根类，特异性是 (0,2,0)，工具类规则会变成 (0,3,0)，
  刚好压过演示自己的元素重置；具体到某个站点时按根节点的类名改。
- @keyframes / @property / @media / @supports 的结构会原样保留。
- 选择器里带 :root / :host / html / body 的规则直接丢弃，它们属于整页而不是演示。
"""

import argparse
import json
import re
from pathlib import Path

import tinycss2

SKIP_AT = {'font-face', 'font-feature-values', 'counter-style', 'page', 'charset', 'import'}


def css_escape(class_name):
    out = []
    for char in class_name:
        if char.isalnum() or char in '-_':
            out.append(char)
        else:
            out.append('\\' + char)
    return ''.join(out)


def split_selectors(prelude):
    parts, depth, current = [], 0, ''
    for char in prelude:
        if char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        if char == ',' and depth == 0:
            parts.append(current.strip())
            current = ''
        else:
            current += char
    if current.strip():
        parts.append(current.strip())
    return [part for part in parts if part]


def collect_classes(demos_dir, extra_json=None):
    used = set()
    for path in sorted(Path(demos_dir).glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        for block in data.get('blocks', []):
            if block.get('kind') != 'demo':
                continue
            for match in re.finditer(r'class="([^"]*)"', block.get('demo_html') or ''):
                used.update(match.group(1).split())
    if extra_json:
        for item in json.loads(Path(extra_json).read_text(encoding='utf-8')):
            used.add(item)
    return used


class ClassMatcher:
    def __init__(self, classes):
        self.by_escaped = {css_escape(name): name for name in classes}
        alternatives = sorted(self.by_escaped, key=len, reverse=True)
        self.pattern = re.compile(
            r'\.(' + '|'.join(re.escape(item) for item in alternatives) + r')(?![\w\-])'
        ) if alternatives else None

    def matches(self, selector_text):
        return bool(self.pattern and self.pattern.search(selector_text))


def parse_file(path):
    css = Path(path).read_text(encoding='utf-8', errors='ignore')
    return tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True)


def collect_layer_rules(rules, layer_name):
    out = []
    for rule in rules:
        if rule.type == 'at-rule' and rule.lower_at_keyword == 'layer':
            name = tinycss2.serialize(rule.prelude).strip()
            if not rule.content:
                continue
            inner = tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True)
            if name == layer_name:
                out.extend(inner)
            else:
                out.extend(collect_layer_rules(inner, layer_name))
    return out


def walk_rules(rules, context=()):
    for rule in rules:
        if rule.type == 'at-rule':
            keyword = rule.lower_at_keyword
            if keyword in ('media', 'supports', 'container'):
                inner = tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True)
                yield from walk_rules(inner, context + ((keyword, tinycss2.serialize(rule.prelude).strip()),))
            elif keyword == 'layer':
                if rule.content:
                    inner = tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True)
                    yield from walk_rules(inner, context)
            elif keyword in ('keyframes', '-webkit-keyframes'):
                yield ('keyframes', rule, context)
            elif keyword == 'property':
                yield ('property', rule, context)
            elif keyword in SKIP_AT:
                continue
            continue
        if rule.type == 'qualified-rule':
            prelude = tinycss2.serialize(rule.prelude).strip()
            if prelude:
                yield ('style', (prelude, tinycss2.serialize(rule.content).strip()), context)


def walk_unlayered(rules, context=()):
    """图层之外的规则：@layer 整块跳过，@media/@supports 递归。"""
    for rule in rules:
        if rule.type == 'at-rule':
            keyword = rule.lower_at_keyword
            if keyword in ('media', 'supports', 'container'):
                inner = tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True)
                yield from walk_unlayered(inner, context + ((keyword, tinycss2.serialize(rule.prelude).strip()),))
            elif keyword in ('keyframes', '-webkit-keyframes'):
                yield ('keyframes', rule, context)
            elif keyword == 'property':
                yield ('property', rule, context)
            continue
        if rule.type == 'qualified-rule':
            prelude = tinycss2.serialize(rule.prelude).strip()
            if prelude:
                yield ('style', (prelude, tinycss2.serialize(rule.content).strip()), context)


def scope_selector(selector, scope):
    if any(token in selector for token in (':root', ':host')):
        return None
    if selector.lstrip().startswith(('html', 'body')):
        return None
    return f'{scope} {selector}'


class Emitter:
    def __init__(self, parts, scope):
        self.parts = parts
        self.scope = scope
        self.seen = set()
        self.count = 0

    def emit(self, kind, payload, context):
        indent = '  ' * len(context)
        if kind == 'style':
            prelude, content = payload
            selectors = [item for item in (scope_selector(sel, self.scope) for sel in split_selectors(prelude)) if item]
            if not selectors:
                return
            key = ('style', prelude, content)
            if key in self.seen:
                return
            self.seen.add(key)
            body = f'{", ".join(selectors)} {{ {content} }}'
        elif kind in ('keyframes', 'property'):
            prelude = tinycss2.serialize(payload.prelude).strip()
            content = tinycss2.serialize(payload.content).strip()
            key = (kind, prelude, content)
            if key in self.seen:
                return
            self.seen.add(key)
            body = f'@{kind} {prelude} {{ {content} }}'
        else:
            return
        for keyword, prelude in context:
            self.parts.append(f'{indent}@{keyword} {prelude} {{')
        self.parts.append(indent + body)
        for _ in context:
            self.parts.append(indent[:-2] + '}' if indent else '}')
        self.count += 1


def emit_filtered(emitter, rules, matcher, keep_all=False):
    for kind, payload, context in walk_rules(rules):
        if kind == 'style' and not keep_all and not matcher.matches(payload[0]):
            continue
        emitter.emit(kind, payload, context)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--css', nargs='+', default=[], help='原站主 CSS 文件')
    parser.add_argument('--modules', nargs='*', default=[], help='CSS Modules 文件（整份收）')
    parser.add_argument('--demos', required=True, help='extracted/*.json 目录')
    parser.add_argument('--extra-classes', default='', help='额外要保留的 class JSON 数组')
    parser.add_argument('--utility-layers', default='utilities,components')
    parser.add_argument('--scope', default='.snapshot-root.snapshot-root')
    parser.add_argument('--out', required=True)
    parser.add_argument('--title', default='外部示例快照的工具类与组件类')
    args = parser.parse_args()

    used = collect_classes(args.demos, args.extra_classes or None)
    matcher = ClassMatcher(used)
    print(f'收集到 {len(used)} 个 class')

    main_rule_lists = [parse_file(path) for path in args.css]
    module_rule_lists = [parse_file(path) for path in args.modules]

    parts = [
        '/**',
        f' * {args.title}。',
        ' *',
        ' * 由 external-snapshot-replica skill 的 scope_css.py 生成。',
        f' * 作用域前缀：{args.scope}（特异度按 0,3,0 设计，压过演示自己的元素重置）。',
        ' * 数值一律保留原站，不要手改，改了就和截图对不上。',
        ' */',
        '',
    ]
    emitter = Emitter(parts, args.scope)

    layers = [name.strip() for name in args.utility_layers.split(',') if name.strip()]
    for layer_name in layers:
        for rules in main_rule_lists:
            emit_filtered(emitter, collect_layer_rules(rules, layer_name), matcher,
                          keep_all=(layer_name == 'components'))

    # 图层外的组件类
    for rules in main_rule_lists:
        emit_filtered(emitter, rules, matcher)

    # CSS Modules：整份收
    for rules in module_rule_lists:
        for kind, payload, context in walk_rules(rules):
            emitter.emit(kind, payload, context)
        for kind, payload, context in walk_unlayered(rules):
            emitter.emit(kind, payload, context)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text('\n'.join(parts) + '\n', encoding='utf-8')
    print(f'写入 {out_path}（{emitter.count} 条规则，{out_path.stat().st_size / 1024:.0f} KB）')


if __name__ == '__main__':
    main()
