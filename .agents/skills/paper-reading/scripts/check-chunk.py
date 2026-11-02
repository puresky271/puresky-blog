#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""分包译文自检。

检查一对（或多对）`chunks/chunkN.md`（英文）与 `zh/chunkN.md`（中文）是否合格：

- 块号是否一一对应、有没有缺块/多块/顺序错乱
- 每块是否为空、标题层级是否一致
- `@@FIG n@@`、`$…$` 公式数量、`\\<占位符\\>` 是否原样保留
- 列表项数、引文行数是否一致
- 中文半边是否出现分号、顿号、直角引号、破折号
- 整块几乎没有汉字（疑似漏译）

用法：

    python check-chunk.py --dir _scratch/<slug> --name chunk3
    python check-chunk.py --dir _scratch/<slug> --all

退出码：0 全部通过，1 输入缺失，2 发现问题。
"""
import argparse
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BAN = {'；': '分号', '、': '顿号', '「': '直角引号', '」': '直角引号', '——': '破折号'}

BLEAD = re.compile(r'^<<<(B\d+)>>>[ \t]*$', re.M)
HEADING = re.compile(r'^(#{2,4}) ')
LIST_ITEM = re.compile(r'^- ', re.M)
QUOTE_LINE = re.compile(r'^> ', re.M)


def parse(path):
    """把 `<<<B12>>>` 分隔的文件读成 {块号: 正文}；文件不存在返回 None。"""
    if not os.path.exists(path):
        return None
    raw = open(path, encoding='utf-8').read()
    parts = BLEAD.split(raw)
    if len(parts) < 3:
        return {}
    return {parts[i]: parts[i + 1].strip('\n') for i in range(1, len(parts) - 1, 2)}


def cjk_count(text):
    return len(re.findall(r'[\u4e00-\u9fff]', text))


def check_pair(src_path, zh_path, label):
    """检查一对分包，返回 (错误列表, 统计信息或 None)。"""
    src = parse(src_path)
    if src is None:
        return ['找不到英文包 %s' % src_path], None
    zh = parse(zh_path)
    if not zh:
        return ['译文包缺失或格式不对 %s（%d 块待译）' % (zh_path, len(src))], None

    errs = []
    missing = [k for k in src if k not in zh]
    extra = [k for k in zh if k not in src]
    if missing:
        errs.append('缺块: ' + ', '.join(missing))
    if extra:
        errs.append('多出来的块: ' + ', '.join(extra))
    order_src = [k for k in src if k in zh]
    order_zh = [k for k in zh if k in src]
    if order_zh != order_src:
        errs.append('块顺序不对')

    for k, a in src.items():
        if k not in zh:
            continue
        b = zh[k]
        if not b.strip():
            errs.append('%s 是空的' % k)
            continue

        ma, mb = HEADING.match(a), HEADING.match(b)
        if ma and (not mb or ma.group(1) != mb.group(1)):
            errs.append('%s 标题层级不一致（原文 %s）' % (k, ma.group(1)))

        if '@@FIG' in a and '@@FIG' not in b:
            errs.append('%s 丢了 @@FIG 占位符' % k)

        da, db = a.replace(r'\$', '').count('$'), b.replace(r'\$', '').count('$')
        if da and da != db:
            errs.append('%s 的 $ 数量从 %d 变成 %d' % (k, a.count('$'), b.count('$')))

        if a.count('\\<') != b.count('\\<'):
            errs.append('%s 的 \\< 占位符数量对不上' % k)

        na, nb = len(LIST_ITEM.findall(a)), len(LIST_ITEM.findall(b))
        if na != nb:
            errs.append('%s 列表项 %d -> %d' % (k, na, nb))

        qa, qb = len(QUOTE_LINE.findall(a)), len(QUOTE_LINE.findall(b))
        if qa and qa != qb:
            errs.append('%s 引文行 %d -> %d' % (k, qa, qb))

        for ch, why in BAN.items():
            if ch in b:
                errs.append('%s 出现%s「%s」' % (k, why, ch))

        # 整块几乎没有汉字，且不是标题/图占位，基本就是没译
        if (cjk_count(b) < 8 and len(b) > 40
                and not b.lstrip().startswith('#') and '@@FIG' not in b):
            errs.append('%s 几乎没有汉字，疑似没译' % k)

    stat = {
        'label': label,
        'blocks': len(src),
        'done': len([k for k in src if k in zh]),
        'chars_in': sum(len(src[k]) for k in src if k in zh),
        'chars_out': sum(len(zh[k]) for k in zh),
        'cjk': sum(cjk_count(zh[k]) for k in zh),
    }
    return errs, stat


def main():
    ap = argparse.ArgumentParser(description='分包译文自检')
    ap.add_argument('--dir', required=True, help='工作目录，里面有 chunks/ 和 zh/')
    ap.add_argument('--name', help='包名，如 chunk3（可省 .md）')
    ap.add_argument('--all', action='store_true', help='检查 chunks/ 下的全部包')
    args = ap.parse_args()

    chunk_dir = os.path.join(args.dir, 'chunks')
    zh_dir = os.path.join(args.dir, 'zh')
    if not os.path.isdir(chunk_dir):
        print('找不到目录:', chunk_dir)
        return 1

    if args.all:
        names = sorted(n for n in os.listdir(chunk_dir) if n.endswith('.md'))
    elif args.name:
        name = args.name if args.name.endswith('.md') else args.name + '.md'
        names = [name]
    else:
        print('要么给 --name，要么给 --all')
        return 1

    total_errs = 0
    stats = []
    for name in names:
        label = name[:-3]
        errs, stat = check_pair(os.path.join(chunk_dir, name), os.path.join(zh_dir, name), label)
        if stat:
            stats.append(stat)
        if errs:
            total_errs += len(errs)
            print('%s: %d 个问题' % (label, len(errs)))
            for e in errs[:40]:
                print('  -', e)
        else:
            print('%s: 通过' % label)

    if stats:
        print('\n%-10s %8s %8s %10s %8s %8s' % ('包', '块数', '已译', '英文字符', '中文字符', '汉字'))
        for s in stats:
            print('%-10s %8d %8d %10d %8d %8d' % (
                s['label'], s['blocks'], s['done'], s['chars_in'], s['chars_out'], s['cjk']))

    if total_errs:
        print('\n合计 %d 个问题' % total_errs)
        return 2
    print('\n全部通过')
    return 0


if __name__ == '__main__':
    sys.exit(main())
