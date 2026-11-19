import { diffChars } from 'diff';

import { HttpError } from './http.mjs';

const prettierParsers = new Map([
  ['js', 'babel'], ['jsx', 'babel'], ['ts', 'typescript'], ['tsx', 'typescript'],
  ['json', 'json'], ['jsonc', 'jsonc'], ['json5', 'json5'],
  ['html', 'html'], ['css', 'css'], ['scss', 'scss'], ['less', 'less'],
  ['yaml', 'yaml'], ['markdown', 'markdown'],
]);

const clangLanguages = new Set(['c', 'cpp', 'java', 'csharp']);
const indentWidth = 4;
const clangStyle = JSON.stringify({
  BasedOnStyle: 'Google',
  IndentWidth: indentWidth,
  ContinuationIndentWidth: indentWidth,
  UseTab: 'Never',
  AccessModifierOffset: -indentWidth,
  AllowShortFunctionsOnASingleLine: 'None',
  SortIncludes: 'Never',
});

async function formatSnippet(language, source) {
  const parser = prettierParsers.get(language);
  if (parser) {
    const { format } = await import('prettier');
    const filepath = language === 'ts' ? 'snippet.ts' : language === 'tsx' ? 'snippet.tsx' : undefined;
    return format(source, { parser, filepath, tabWidth: indentWidth, useTabs: false, embeddedLanguageFormatting: 'off' });
  }
  if (clangLanguages.has(language)) {
    const { format } = await import('@wasm-fmt/clang-format');
    const extension = language === 'csharp' ? 'cs' : language;
    return format(source, `snippet.${extension}`, clangStyle);
  }
  if (language === 'python') {
    const { format } = await import('@wasm-fmt/ruff_fmt');
    return format(source, 'snippet.py', { indent_width: indentWidth, indent_style: 'space' });
  }
  if (language === 'bash' || language === 'sh') {
    const { format } = await import('@wasm-fmt/shfmt');
    return format(source, `snippet.${language}`, { indent: indentWidth });
  }
  if (language === 'go') {
    const { format } = await import('@wasm-fmt/gofmt');
    return format(source);
  }
  throw new HttpError(422, `“${language || '无语言标记'}”代码块暂不支持格式化`);
}

function describeLines(lines) {
  const code = [];
  const nonblank = [];
  let offset = 0;
  for (const [index, line] of lines.entries()) {
    const text = line.replace(/\s/g, '');
    if (!text) continue;
    nonblank.push({ index, offset });
    code.push(text);
    offset += text.length;
  }
  return { code: code.join(''), nonblank };
}

function preserveBlankLines(source, formatted) {
  const sourceLines = source.split('\n');
  if (sourceLines.every((line) => line.trim())) return formatted;

  const formattedLines = formatted.split('\n');
  const before = describeLines(sourceLines);
  const after = describeLines(formattedLines);
  if (!after.nonblank.length) return source;
  const required = new Map([
    [after.nonblank[0].index, before.nonblank[0].index],
    [formattedLines.length, sourceLines.length - 1 - before.nonblank.at(-1).index],
  ]);

  const interior = before.nonblank.slice(1).flatMap((line, i) => {
    const count = line.index - before.nonblank[i].index - 1;
    return count ? [{ offset: line.offset, count }] : [];
  });
  if (interior.length) {
    // 忽略排版空白比对正文，换行、换缩进或增减分号时仍能找到原来空行两侧的代码。
    const changes = diffChars(before.code, after.code, { timeout: 250 });
    if (!changes) return source;
    const positions = new Int32Array(before.code.length).fill(-1);
    const lineAt = new Uint32Array(after.code.length);
    for (const [i, line] of after.nonblank.entries()) {
      lineAt.fill(line.index, line.offset, after.nonblank[i + 1]?.offset ?? after.code.length);
    }
    let oldOffset = 0;
    let newOffset = 0;
    for (const change of changes) {
      const length = change.value.length;
      if (!change.added && !change.removed) {
        for (let i = 0; i < length; i++) positions[oldOffset + i] = newOffset + i;
      }
      if (!change.added) oldOffset += length;
      if (!change.removed) newOffset += length;
    }

    for (const gap of interior) {
      let left = gap.offset - 1;
      let right = gap.offset;
      while (left >= 0 && positions[left] < 0) left--;
      while (right < positions.length && positions[right] < 0) right++;
      if (left < 0 || right === positions.length) return source;
      const previousLine = lineAt[positions[left]];
      const nextLine = lineAt[positions[right]];
      // 格式化器合并了原本分开的代码行时，保留原文，避免盲目切开新结果。
      if (previousLine >= nextLine) return source;
      required.set(nextLine, (required.get(nextLine) ?? 0) + gap.count);
    }
  }

  const result = [];
  for (let i = 0; i <= formattedLines.length; i++) {
    const count = required.get(i) ?? 0;
    let present = 0;
    while (present < count && i > present && !formattedLines[i - present - 1].trim()) present++;
    for (let gap = present; gap < count; gap++) result.push('');
    if (i < formattedLines.length) result.push(formattedLines[i]);
  }
  return result.join('\n');
}

export async function formatCode(language, source) {
  if (typeof language !== 'string' || typeof source !== 'string') throw new HttpError(400, '无效的代码块');
  if (!source.trim()) return source;
  const code = source.replace(/\r\n?/g, '\n');
  try {
    const formatted = (await formatSnippet(language, code)).replace(/\r\n?/g, '\n').replace(/\n$/, '');
    return preserveBlankLines(code, formatted) + '\n';
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, error instanceof Error ? error.message : String(error));
  }
}
