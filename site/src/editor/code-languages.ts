import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

export const CODE_PRESETS = [
  ['ts', 'TypeScript'], ['tsx', 'TSX'], ['js', 'JavaScript'], ['jsx', 'JSX'],
  ['python', 'Python'], ['java', 'Java'], ['c', 'C'], ['cpp', 'C++'], ['go', 'Go'], ['rust', 'Rust'],
  ['bash', 'Bash'], ['powershell', 'PowerShell'], ['json', 'JSON'], ['yaml', 'YAML'],
  ['toml', 'TOML'], ['sql', 'SQL'], ['html', 'HTML'], ['css', 'CSS'],
  ['xml', 'XML'], ['markdown', 'Markdown'], ['diff', 'Diff'], ['text', '纯文本'],
] as const;

const aliases = new Map([
  ['mjs', 'js'], ['cjs', 'js'], ['node', 'js'], ['javascript', 'js'],
  ['mts', 'ts'], ['cts', 'ts'], ['typescript', 'ts'], ['python3', 'python'], ['py', 'python'],
  ['golang', 'go'], ['rs', 'rust'], ['c++', 'cpp'], ['cc', 'cpp'], ['cxx', 'cpp'], ['hpp', 'cpp'],
  ['h', 'c'], ['cs', 'csharp'], ['c#', 'csharp'], ['ps1', 'powershell'], ['pwsh', 'powershell'],
  ['shell', 'bash'], ['yml', 'yaml'], ['htm', 'html'], ['svg', 'xml'], ['md', 'markdown'],
]);

export function normalizeCodeLanguage(info: string) {
  const label = info.trim().split(/\s+/, 1)[0].toLowerCase();
  return aliases.get(label) ?? label;
}

export function codeLanguage(info: string) {
  const label = normalizeCodeLanguage(info);
  return LanguageDescription.matchLanguageName(languages, label, false)
    ?? LanguageDescription.matchFilename(languages, `snippet.${label}`)
    ?? null;
}
