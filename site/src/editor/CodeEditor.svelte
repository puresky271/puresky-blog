<script lang="ts">
  /**
   * CodeEditor.svelte — 基于 CodeMirror 6 的 Markdown 编辑区。
   *
   * 正文用无衬线（写中文更舒服），行内代码和代码块用等宽；代码块按语言高亮（language-data 按需加载）。
   * 列表回车自动续写、Tab 缩进、Ctrl+F 搜索；粘贴或拖进图片会调用 onimage 上传并插入 Markdown。
   * 颜色全部走站点的 CSS 变量，亮暗主题切换时编辑器跟着变，不需要重建。
   *
   * 对外的方法（bind:this 后调用）：load 换文档（清空撤销历史）、wrap / prefix / insert 给工具栏用、focus。
   */
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
  import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
  import { languages } from '@codemirror/language-data';
  import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
  import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
  import {
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightSpecialChars,
    keymap,
    placeholder,
  } from '@codemirror/view';
  import { tags as t } from '@lezer/highlight';
  import { onMount } from 'svelte';

  let {
    initial = '',
    onchange,
    oncursor,
    onscrollratio,
    onimage,
  }: {
    /** 挂载时的初始内容；之后换文章用 load()。 */
    initial?: string;
    onchange: (value: string) => void;
    oncursor?: (pos: { line: number; col: number; lines: number }) => void;
    onscrollratio?: (ratio: number) => void;
    onimage?: (file: File) => Promise<string>;
  } = $props();

  let host = $state<HTMLDivElement>();
  let view: EditorView | null = null;

  const highlight = HighlightStyle.define([
    { tag: t.heading1, fontSize: '1.42em', fontWeight: '700', color: 'var(--fg)' },
    { tag: t.heading2, fontSize: '1.24em', fontWeight: '700', color: 'var(--fg)' },
    { tag: t.heading3, fontSize: '1.1em', fontWeight: '650', color: 'var(--fg)' },
    { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '650', color: 'var(--fg)' },
    { tag: t.strong, fontWeight: '700', color: 'var(--fg)' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: 'var(--accent)' },
    { tag: t.url, color: 'var(--fg-subtle)' },
    { tag: t.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.9em', color: 'var(--accent-strong)' },
    { tag: t.quote, color: 'var(--fg-muted)' },
    { tag: [t.processingInstruction, t.contentSeparator], color: 'var(--cm-mark)' },
    { tag: t.list, color: 'var(--fg)' },
    { tag: t.meta, color: 'var(--cm-mark)' },
    // 代码块里的语言
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: 'var(--cm-keyword)' },
    { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--cm-string)' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--cm-comment)', fontStyle: 'italic' },
    { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--cm-number)' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--cm-function)' },
    { tag: [t.typeName, t.className, t.namespace], color: 'var(--cm-type)' },
    { tag: [t.propertyName, t.attributeName], color: 'var(--cm-property)' },
    { tag: [t.tagName], color: 'var(--cm-keyword)' },
  ]);

  const theme = EditorView.theme({
    '&': { height: '100%', color: 'var(--fg)', backgroundColor: 'transparent', fontSize: '15.5px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-sans)', lineHeight: '1.85', overflow: 'auto' },
    '.cm-content': { padding: '8px 0 40vh', caretColor: 'var(--accent)', maxWidth: '46rem', margin: '0 auto' },
    '.cm-line': { padding: '0 4px' },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--accent)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in oklab, var(--accent) 22%, transparent) !important',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--accent) 4%, transparent)' },
    '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)' },
    '.cm-placeholder': { color: 'var(--fg-subtle)' },
    '.cm-panels': { backgroundColor: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--line)' },
    '.cm-panels-top': { borderBottom: '1px solid var(--line)' },
    '.cm-search': { fontFamily: 'var(--font-sans)', fontSize: '13px', padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
    '.cm-search input, .cm-search button': { fontFamily: 'inherit', fontSize: '13px' },
    '.cm-textfield': { border: '1px solid var(--line-strong)', borderRadius: '8px', padding: '3px 8px', background: 'var(--bg)', color: 'var(--fg)' },
    '.cm-button': { backgroundImage: 'none', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--fg)', padding: '3px 10px' },
    '.cm-searchMatch': { backgroundColor: 'color-mix(in oklab, var(--warning) 30%, transparent)' },
    '.cm-searchMatch-selected': { backgroundColor: 'color-mix(in oklab, var(--warning) 55%, transparent)' },
  });

  async function insertImages(files: File[], at?: number) {
    if (!view || !onimage) return;
    for (const file of files) {
      const pos = at ?? view.state.selection.main.head;
      const token = `![上传中：${file.name || '图片'}…]()`;
      view.dispatch({ changes: { from: pos, insert: token }, selection: { anchor: pos + token.length } });
      try {
        const path = await onimage(file);
        const alt = (file.name || '图片').replace(/\.[a-z0-9]+$/i, '');
        replaceToken(token, `![${alt}](${path})`);
      } catch (error) {
        replaceToken(token, '');
        throw error;
      }
    }
  }

  function replaceToken(token: string, text: string) {
    if (!view) return;
    const index = view.state.doc.toString().indexOf(token);
    if (index >= 0) view.dispatch({ changes: { from: index, to: index + token.length, insert: text } });
  }

  function extensions(): Extension[] {
    return [
      history(),
      drawSelection(),
      dropCursor(),
      highlightSpecialChars(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      indentOnInput(),
      bracketMatching(),
      EditorState.allowMultipleSelections.of(true),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
      syntaxHighlighting(highlight),
      search({ top: true }),
      placeholder('从这里开始写。支持 Markdown，粘贴或拖进图片会自动上传。'),
      keymap.of([
        { key: 'Mod-b', run: () => (wrap('**', '**', '加粗'), true) },
        { key: 'Mod-i', run: () => (wrap('*', '*', '斜体'), true) },
        { key: 'Mod-k', run: () => (wrap('[', '](https://)', '链接文字'), true) },
        { key: 'Mod-e', run: () => (wrap('`', '`', 'code'), true) },
        indentWithTab,
        ...searchKeymap,
        ...historyKeymap,
        ...defaultKeymap,
      ]),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onchange(update.state.doc.toString());
        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          oncursor?.({ line: line.number, col: head - line.from + 1, lines: update.state.doc.lines });
        }
      }),
      EditorView.domEventHandlers({
        paste(event) {
          const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
          if (!files.length) return false;
          event.preventDefault();
          void insertImages(files);
          return true;
        },
        drop(event, v) {
          const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
          if (!files.length) return false;
          event.preventDefault();
          const pos = v.posAtCoords({ x: event.clientX, y: event.clientY }) ?? undefined;
          void insertImages(files, pos);
          return true;
        },
        scroll(_event, v) {
          const el = v.scrollDOM;
          const max = el.scrollHeight - el.clientHeight;
          onscrollratio?.(max > 0 ? el.scrollTop / max : 0);
          return false;
        },
      }),
    ];
  }

  onMount(() => {
    view = new EditorView({ parent: host!, state: EditorState.create({ doc: initial, extensions: extensions() }) });
    oncursor?.({ line: 1, col: 1, lines: view.state.doc.lines });
    return () => view?.destroy();
  });

  /** 换一篇文章：整个状态重建，撤销历史不会跨文章。 */
  export function load(doc: string) {
    if (!view) return;
    view.setState(EditorState.create({ doc, extensions: extensions() }));
    view.scrollDOM.scrollTop = 0;
    oncursor?.({ line: 1, col: 1, lines: view.state.doc.lines });
  }

  /** 用 before / after 包住选区；没有选区时插入占位文字并选中它。 */
  export function wrap(before: string, after: string, fallback = '') {
    if (!view) return;
    const state = view.state;
    view.dispatch(
      state.changeByRange((range) => {
        const text = state.sliceDoc(range.from, range.to) || fallback;
        // 已经被同样的符号包着时，再按一次就是取消。
        if (
          range.from >= before.length &&
          state.sliceDoc(range.from - before.length, range.from) === before &&
          state.sliceDoc(range.to, range.to + after.length) === after
        ) {
          return {
            changes: [
              { from: range.from - before.length, to: range.from },
              { from: range.to, to: range.to + after.length },
            ],
            range: EditorSelection.range(range.from - before.length, range.to - before.length),
          };
        }
        return {
          changes: { from: range.from, to: range.to, insert: `${before}${text}${after}` },
          range: EditorSelection.range(range.from + before.length, range.from + before.length + text.length),
        };
      })
    );
    view.focus();
  }

  /** 给选中的每一行加（或去掉）行首前缀，例如 "> "、"- "、"## "。 */
  export function prefix(mark: string) {
    if (!view) return;
    const state = view.state;
    const changes: { from: number; to?: number; insert?: string }[] = [];
    const seen = new Set<number>();
    for (const range of state.selection.ranges) {
      for (let pos = range.from; pos <= range.to; ) {
        const line = state.doc.lineAt(pos);
        if (!seen.has(line.number)) {
          seen.add(line.number);
          const heading = /^#{1,6}\s/.exec(line.text);
          if (line.text.startsWith(mark)) changes.push({ from: line.from, to: line.from + mark.length });
          else if (heading && mark.startsWith('#')) changes.push({ from: line.from, to: line.from + heading[0].length, insert: mark });
          else changes.push({ from: line.from, insert: mark });
        }
        pos = line.to + 1;
      }
    }
    view.dispatch({ changes });
    view.focus();
  }

  /** 在光标处插入一段文字（独占几行的块会自动补上前后空行）。 */
  export function insert(text: string, block = false) {
    if (!view) return;
    const state = view.state;
    const { from, to } = state.selection.main;
    let insertText = text;
    if (block) {
      const before = state.sliceDoc(Math.max(0, from - 2), from);
      const lead = from === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      insertText = `${lead}${text}\n`;
    }
    view.dispatch({ changes: { from, to, insert: insertText }, selection: { anchor: from + insertText.length } });
    view.focus();
  }

  export function pickImages(files: File[]) {
    void insertImages(files);
  }

  export function focus() {
    view?.focus();
  }
</script>

<div class="code-editor" bind:this={host}></div>

<style>
  .code-editor {
    height: 100%;
    min-height: 0;
    /* 代码块里的语法色，亮暗各一套。 */
    --cm-mark: color-mix(in oklab, var(--accent) 45%, var(--fg-subtle));
    --cm-keyword: #cf222e;
    --cm-string: #0a3069;
    --cm-comment: #6e7781;
    --cm-number: #0550ae;
    --cm-function: #8250df;
    --cm-type: #953800;
    --cm-property: #0550ae;
  }
  :global([data-theme='dark']) .code-editor {
    --cm-keyword: #f47067;
    --cm-string: #96d0ff;
    --cm-comment: #768390;
    --cm-number: #6cb6ff;
    --cm-function: #dcbdfb;
    --cm-type: #f69d50;
    --cm-property: #6cb6ff;
  }
  .code-editor :global(.cm-editor) {
    height: 100%;
  }
</style>
