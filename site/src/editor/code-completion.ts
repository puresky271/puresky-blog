import {
  completeFromList,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

import { normalizeCodeLanguage } from './code-languages';

export function fencedCodeAt(state: EditorState, pos: number) {
  let node = syntaxTree(state).resolve(pos, -1);
  while (node.name !== 'FencedCode' && node.parent) node = node.parent;
  if (node.name !== 'FencedCode' && pos < state.doc.length) {
    node = syntaxTree(state).resolve(pos, 1);
    while (node.name !== 'FencedCode' && node.parent) node = node.parent;
  }
  return node.name === 'FencedCode' ? node : null;
}

export function codeBodyAt(state: EditorState, pos: number) {
  const fence = fencedCodeAt(state, pos);
  if (!fence || state.doc.lineAt(pos).number === state.doc.lineAt(fence.from).number) return null;
  const closing = fence.lastChild;
  if (closing?.name === 'CodeMark' && pos >= state.doc.lineAt(closing.from).from) return null;
  for (let node = syntaxTree(state).resolveInner(pos, -1); node.from >= fence.from && node.parent; node = node.parent) {
    if (/Comment|String|RegExp/.test(node.name) && (pos < node.to || /Comment/.test(node.name))) return null;
  }
  return fence;
}

const common = {
  js: 'Array Map Set Object String Number Math JSON Promise console undefined null true false const let function return if else for while class new',
  ts: 'Array Map Set Object String Number Math JSON Promise console interface type extends implements readonly string number boolean unknown never const let function return if else for while class new',
  python: 'print len range enumerate zip sorted sum min max abs any all isinstance list dict set tuple str int float bool ListNode TreeNode None True False def class return if elif else for while in import from',
  java: 'String StringBuilder List ArrayList Map HashMap Set HashSet Arrays Collections Math System Integer Long Queue Deque ArrayDeque PriorityQueue public private static final class new int boolean return if else for while',
  cpp: 'std vector string unordered_map map unordered_set set array pair tuple queue deque stack priority_queue sort lower_bound upper_bound swap size_t auto const int bool void using namespace return if else for while',
  c: 'printf scanf malloc calloc realloc free memcpy memset strlen strcmp NULL size_t int char long double void struct typedef const return if else for while',
};

const members = new Map<string, string>([
  ['Array', 'length at concat entries every filter find findIndex flat flatMap forEach includes indexOf join map pop push reduce reverse shift slice some sort splice unshift'],
  ['String', 'length at charAt endsWith includes indexOf replace slice split startsWith substring toLowerCase toUpperCase trim'],
  ['Map', 'size clear delete entries forEach get has keys set values'],
  ['Set', 'size add clear delete entries forEach has values'],
  ['Math', 'abs ceil floor max min pow random round sqrt trunc'],
  ['JSON', 'parse stringify'],
  ['console', 'debug error info log table warn'],
  ['ListNode', 'val next'],
  ['TreeNode', 'val left right'],
  ['list', 'append clear copy count extend index insert pop remove reverse sort'],
  ['dict', 'clear copy fromkeys get items keys pop popitem setdefault update values'],
  ['set', 'add clear difference discard intersection pop remove union update'],
  ['str', 'capitalize count endswith find format index join lower replace split startswith strip upper'],
  ['vector', 'size empty front back begin end at clear erase insert push_back pop_back emplace_back reserve resize'],
  ['string', 'size empty length front back find substr append c_str clear'],
  ['unordered_map', 'size empty begin end at clear contains count emplace erase find insert'],
  ['ArrayList', 'add addAll clear contains get indexOf isEmpty remove set size sort toArray'],
  ['HashMap', 'clear containsKey containsValue entrySet get getOrDefault isEmpty keySet put putIfAbsent remove size values'],
  ['Arrays', 'asList binarySearch copyOf equals fill sort stream toString'],
  ['Collections', 'binarySearch max min reverse shuffle sort'],
  ['System', 'arraycopy currentTimeMillis err in nanoTime out'],
  ['System.out', 'print printf println'],
  ['std', 'array deque lower_bound map max min pair priority_queue queue reverse set sort stack string swap tuple unordered_map unordered_set upper_bound vector'],
]);
for (const [alias, name] of [['List', 'ArrayList'], ['HashSet', 'Set'], ['map', 'unordered_map']]) {
  members.set(alias, members.get(name)!);
}

function options(names: string, type: string): Completion[] {
  return names ? names.split(' ').map((label) => ({ label, type })) : [];
}

const properties = new Set(['length', 'size', 'val', 'left', 'right', 'next', 'in', 'out', 'err']);
const controlWords = /^(?:if|else|for|while|switch|catch|with|return|throw|new|case|yield|import|package|using)$/;

function completeCode(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context;
  const fence = codeBodyAt(state, pos);
  const info = fence?.getChild('CodeInfo');
  if (!fence || !info) return null;
  const closing = fence.lastChild;
  const language = normalizeCodeLanguage(state.sliceDoc(info.from, info.to));
  const kind = language === 'jsx' || language === 'js' ? 'js' : language === 'tsx' || language === 'ts' ? 'ts' : language;
  if (!Object.hasOwn(common, kind)) return null;
  const word = context.matchBefore(/[\w$]*/);
  const from = word?.from ?? pos;
  const access = state.sliceDoc(state.doc.lineAt(pos).from, from).match(/([\w$]+(?:\.[\w$]+)*)(?:\?\.|\.|->|::)$/);
  if (!access && from === pos && !context.explicit) return null;

  const start = state.doc.lineAt(fence.from).to + 1;
  const end = closing?.name === 'CodeMark' ? state.doc.lineAt(closing.from).from : fence.to;
  const tokens = kind === 'python'
    ? /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|#[^\r\n]*/g
    : /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\])*`/g;
  const source = state.sliceDoc(start, end).replace(tokens, (token) => token.replace(/[^\r\n]/g, ' '));
  const declarations = new Map<string, Completion>();
  const types = new Map<string, string>();
  const classFields = new Map<string, Completion>();
  const objectFields = new Map<string, Completion[]>();
  const add = (label: string, type: string, declaredType?: string) => {
    declarations.set(label, { label, type, boost: 2 });
    if (declaredType) types.set(label, declaredType);
  };
  const before = source.slice(0, from - start);

  if (kind === 'js' || kind === 'ts' || kind === 'python') {
    for (const match of before.matchAll(/\b(?:const|let|var)\s+([\w$]+)(?:\s*:\s*([\w$]+)(\[\])?(?:<[^>\n]+>)?)?\s*(?:=\s*(?:new\s+([\w$]+)|([\[{])|([^\n;]*?=>)))?/g)) {
      add(match[1], match[6] ? 'function' : 'variable', match[3] || match[5] === '[' ? 'Array' : match[2] ?? match[4]);
    }
    for (const match of before.matchAll(/(?:^|[\r\n;])\s*([A-Za-z_$][\w$]*)\s*(?::\s*([\w$]+))?\s*=(?!=)\s*(?:([\[{])|(?:new\s+)?([A-Za-z_$][\w$]*)\s*\()?/g)) {
      add(match[1], 'variable', match[2] ?? match[4] ?? (match[3] === '[' ? 'list' : match[3] === '{' ? 'dict' : undefined));
    }
    for (const match of source.matchAll(/\b(function|def|class|interface)\s+([\w$]+)/g)) {
      add(match[2], match[1] === 'class' || match[1] === 'interface' ? 'class' : 'function');
    }
    for (const match of before.matchAll(/\b(?:function\s+|def\s+)?([\w$]+)\s*\(([^()\n]*)\)\s*(?:\{|:|=>)/g)) {
      if (controlWords.test(match[1])) continue;
      for (const param of match[2].split(',')) {
        const declaration = /^\s*(?:\.{3}|\*{1,2})?([\w$]+)(?:\s*:\s*([\w$]+)(\[\])?)?/.exec(param);
        if (declaration) add(declaration[1], 'variable', declaration[3] ? 'Array' : declaration[2]);
      }
    }
    if (kind !== 'python') {
      for (const match of before.matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*\{([^{}]*)\}/g)) {
        const fields = [...match[2].matchAll(/(?:^|,)\s*([\w$]+)\s*(?=[:(,]|$)/g)]
          .map((field) => ({ label: field[1], type: match[2][field.index + field[0].length] === '(' ? 'method' : 'property' }));
        objectFields.set(match[1], fields);
      }
    }
    for (const match of source.matchAll(/\b(?:this|self)\.([\w$]+)\s*=(?!=)/g)) {
      classFields.set(match[1], { label: match[1], type: 'property' });
    }
    for (const match of source.matchAll(/^\s*(?:async\s+)?(?:def\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?:\{|:)/gm)) {
      if (!controlWords.test(match[1])) {
        classFields.set(match[1], { label: match[1], type: 'method' });
      }
    }
    for (const match of source.matchAll(/^[ \t]*(?:(?:public|protected|private|static|readonly)\s+)*([\w$]+)\??\s*:\s*[\w$]+(?:\[\])?\s*(?=[=;\n])/gm)) {
      if (!controlWords.test(match[1])) classFields.set(match[1], { label: match[1], type: 'property' });
    }
  } else {
    const pattern = /\b(?:std::)?([A-Za-z_]\w*)(?:\s*<[^;{}\n]+?>)?(?:\[\])?(?:\s*[*&][*&\s]*|\s+)([A-Za-z_]\w*)\s*(?=[(,;)=\[{])/g;
    for (const match of source.matchAll(pattern)) {
      const [, type, label] = match;
      if (controlWords.test(type)) continue;
      const isMethod = source[match.index + match[0].length] === '(';
      if (isMethod || match.index < from - start) add(label, isMethod ? 'function' : 'variable', type);
      classFields.set(label, { label, type: isMethod ? 'method' : 'property' });
    }
  }

  if (access) {
    const receiver = access[1];
    const memberNames = members.get(types.get(receiver) ?? receiver);
    const result = receiver === 'this' || receiver === 'self'
      ? [...classFields.values()]
      : objectFields.get(receiver) ?? options(memberNames ?? '', 'method').map((option) =>
        properties.has(option.label) && !/^(?:vector|string|ArrayList|List|HashMap|HashSet|map|unordered_map)$/.test(types.get(receiver) ?? receiver)
          ? { ...option, type: 'property' }
          : option);
    return result.length ? { from, options: result, validFor: /^[\w$]*$/ } : null;
  }

  const defaults = options(common[kind as keyof typeof common], 'keyword').filter(({ label }) => !declarations.has(label));
  return { from, options: [...declarations.values(), ...defaults], validFor: /^[\w$]*$/ };
}

export async function fencedCodeCompletion(context: CompletionContext): Promise<CompletionResult | null> {
  if (!codeBodyAt(context.state, context.pos)) return null;
  const custom = completeCode(context);
  const line = context.state.sliceDoc(context.state.doc.lineAt(context.pos).from, context.pos);
  if (/(?:\.|->|::)[\w$]*$/.test(line)) return custom;
  const sources = context.state.languageDataAt<CompletionSource | readonly Completion[]>('autocomplete', context.pos, -1);
  const results = await Promise.all(sources.map((source) =>
    typeof source === 'function' ? source(context) : completeFromList(source)(context)));
  const native = results.find((result) => result && (!custom || result.from === custom.from));
  if (!custom || !native) return custom ?? native ?? null;
  const completions = new Map(custom.options.map((option) => [option.label, option]));
  for (const option of native.options) {
    if (!completions.has(option.label)) completions.set(option.label, option);
  }
  return { ...custom, options: [...completions.values()] };
}
