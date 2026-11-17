<script lang="ts">
  /**
   * 最高档 effort 的 /config 重设计（原站 chunks/01f5-oqh6el64.pretty.js）。
   *
   * 一屏 24 行的终端：上半部是一次真实会话的记录，下半部是配置面板。面板里
   * 首屏五个顶部设置，下面是六个分组和「已修改的设置」。搜索跨全部设置并高亮
   * 命中片段，选择类设置展开 picker，主题在 picker 里移动会实时换终端配色。
   * 进入视口后依次演示六段操作（Vim 模式、主题、搜 dark、settings.json 项、
   * 已修改的设置、关闭），最后重置。
   */

  import {
    MAX_BY_ID,
    MAX_GROUPS,
    MAX_GROUP_DESC,
    MAX_GROUP_LABEL,
    MAX_SETTINGS,
    MAX_THEME_T,
    MAX_TOP,
    maxInitialValues,
    type MaxSetting,
  } from './max';
  import { createDemoRunner, type DemoStep } from './script';

  let { active = false }: { active?: boolean } = $props();

  interface Part {
    t: string;
    c?: string;
  }

  type MaxRow =
    | { k: string; kind: 'setting'; s: MaxSetting; showGroup?: boolean }
    | { k: string; kind: 'group'; id: string }
    | { k: string; kind: 'changed' }
    | { k: string; kind: 'sep' }
    | { k: string; kind: 'option'; i: number; s: MaxSetting };

  type MaxItemRow = Exclude<MaxRow, { kind: 'sep' }>;

  type MaxLine =
    | { k: string; kind: 'line'; cls: string; parts: Part[] }
    | {
        k: string;
        kind: 'row';
        cls: string;
        dataI: number;
        selected: boolean;
        width: number;
        label: Part[];
        parts: Part[];
        group?: string;
      };

  interface MaxState {
    values: Record<string, string | boolean>;
    openValues: Record<string, string | boolean>;
    order: string[];
    view: string;
    cur: Record<string, number>;
    q: string;
    picker: { id: string; cur: number } | null;
    changedIds: string[];
    note: string | null;
    closed: boolean;
    lastSummary: string[];
    t: string;
  }

  function makeState(): MaxState {
    const values = maxInitialValues();
    return {
      values,
      openValues: { ...values },
      order: [],
      view: 'home',
      cur: { home: 0 },
      q: '',
      picker: null,
      changedIds: [],
      note: null,
      closed: false,
      lastSummary: [],
      t: MAX_THEME_T[String(values.theme)] ?? 'dark',
    };
  }

  let panel = $state<MaxState>(makeState());
  let stopped = $state(false);
  let scenarioName = $state<string | null>(null);
  let termEl = $state<HTMLDivElement>();

  let scenarioKeys: string[] = [];
  let scenarioTimer: number | undefined;
  let noteTimer: number | undefined;

  const viewKey = (): string => (panel.picker ? 'picker' : panel.q ? 'search' : panel.view);

  const isChanged = (setting: MaxSetting): boolean =>
    setting.def !== undefined &&
    setting.g !== 'moved' &&
    setting.g !== 'plugins' &&
    panel.values[setting.id] !== setting.def;

  const changedIds = (): string[] =>
    MAX_SETTINGS.filter(
      (setting) =>
        setting.g !== 'moved' &&
        setting.g !== 'plugins' &&
        setting.def !== undefined &&
        panel.values[setting.id] !== setting.def,
    ).map((setting) => setting.id);

  function valueLabel(setting: MaxSetting): string {
    const value = panel.values[setting.id];
    if (setting.type === 'toggle') return value ? '开' : '关';
    if (setting.type === 'moved') return 'settings.json';
    const option = (setting.options ?? []).find((item) => item.v === value);
    if (!option) return setting.unsetLabel ?? '';
    return option.glyph ? `${option.glyph} ${option.label}` : option.label;
  }

  function searchTokens(): string[] {
    return panel.q.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function searchRows(): MaxRow[] {
    const tokens = searchTokens();
    if (tokens.length === 0) return [];
    const scored: { score: number; order: number; row: MaxRow }[] = [];
    MAX_SETTINGS.forEach((setting, order) => {
      const label = setting.label.toLowerCase();
      const optionLabels = (setting.options ?? []).map((item) => item.label.toLowerCase()).join(' ');
      const extra = [
        setting.plugin ?? '',
        setting.kw ?? '',
        valueLabel(setting),
        setting.moved ? `settings.json ${setting.moved}` : '',
      ]
        .join(' ')
        .toLowerCase();
      const haystack = `${label} ${optionLabels} ${extra} ${(setting.desc ?? '').toLowerCase()}`;
      let score = 0;
      for (const token of tokens) {
        if (!haystack.includes(token)) {
          score = -1;
          break;
        }
        if (label.startsWith(token)) score += 60;
        else if (new RegExp(`(^|[\\s\\-/(.])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(label)) {
          score += 45;
        } else if (label.includes(token)) score += 30;
        else if (optionLabels.includes(token) || extra.includes(token)) score += 15;
        else score += 5;
      }
      if (score > 0) {
        scored.push({
          score: score - 2 * (setting.g === 'moved' ? 1 : 0),
          order: order + 100,
          row: { k: `s:${setting.id}`, kind: 'setting', s: setting, showGroup: true },
        });
      }
    });
    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    return scored.map((item) => item.row);
  }

  function buildRows(): MaxRow[] {
    if (panel.picker) {
      const setting = MAX_BY_ID[panel.picker.id];
      return (setting.options ?? []).map((option, index) => ({
        k: `o:${setting.id}:${option.v}`,
        kind: 'option',
        i: index,
        s: setting,
      }));
    }
    if (panel.q) return searchRows();
    if (panel.view === 'home') {
      const rows: MaxRow[] = MAX_TOP.map((setting) => ({
        k: `s:${setting.id}`,
        kind: 'setting',
        s: setting,
      }));
      rows.push({ k: 'sep', kind: 'sep' });
      for (const group of MAX_GROUPS) rows.push({ k: `g:${group.id}`, kind: 'group', id: group.id });
      rows.push({ k: 'changed', kind: 'changed' });
      return rows;
    }
    if (panel.view === 'changed') {
      return panel.changedIds.map((id) => {
        const setting = MAX_BY_ID[id];
        return { k: `s:${id}`, kind: 'setting', s: setting, showGroup: true };
      });
    }
    return MAX_SETTINGS.filter((setting) => setting.g === panel.view).map((setting) => ({
      k: `s:${setting.id}`,
      kind: 'setting',
      s: setting,
    }));
  }

  const rows = $derived(buildRows());

  function normalizeCursor(all: MaxRow[], raw: number): number {
    if (all.length === 0) return 0;
    let index = Math.max(0, Math.min(all.length - 1, raw));
    if (all[index]?.kind === 'sep') index = index + 1 < all.length ? index + 1 : index - 1;
    return Math.max(0, index);
  }

  const cursor = $derived(
    panel.picker
      ? Math.max(0, Math.min(rows.length - 1, panel.picker.cur))
      : normalizeCursor(rows, panel.cur[viewKey()] ?? 0),
  );
  const currentRow = $derived(rows[cursor]);

  const helpText = $derived.by(() => {
    if (panel.note) return panel.note;
    if (panel.picker) {
      const setting = MAX_BY_ID[panel.picker.id];
      const option = setting.options?.[panel.picker.cur];
      return option?.desc || setting.desc || '';
    }
    const row = currentRow;
    if (!row) return '';
    if (row.kind === 'option') return row.s.options?.[row.i]?.desc || row.s.desc || '';
    if (row.kind === 'group') return MAX_GROUP_DESC[row.id] ?? '';
    if (row.kind === 'changed') {
      const total = changedIds().length;
      return total > 0 ? `与默认值不同的 ${total} 项设置，都在这一处。` : '所有设置都是默认值。';
    }
    if (row.kind === 'setting') {
      if (row.s.type === 'moved') {
        return `现在写在 settings.json 的“${row.s.moved}”。按 Enter 在编辑器里打开。`;
      }
      return row.s.desc ?? '';
    }
    return '';
  });

  const helpLines = $derived(helpText ? wrapText(helpText, 76, 2) : []);

  const titleLine = $derived.by((): MaxLine | null => {
    if (panel.picker || panel.q || panel.view === 'home') return null;
    const label = panel.view === 'changed' ? '已修改的设置' : (MAX_GROUP_LABEL[panel.view] ?? '');
    return { k: 'title', kind: 'line', cls: 'ln pl', parts: [{ t: label, c: 'b' }] };
  });

  /** 面板可见的行数：24 行里扣掉固定头部、标题和帮助。 */
  const rowCapacity = $derived(
    Math.max(1, 24 - 4 - (titleLine ? 1 : 0) - (helpText ? 1 + helpLines.length : 0)),
  );

  const windowStart: Record<string, number> = {};

  const windowInfo = $derived.by(() => {
    const all = rows;
    const key = viewKey();
    if (all.length <= rowCapacity) {
      windowStart[key] = 0;
      return { start: 0, end: all.length, above: 0, below: 0 };
    }
    let offset = Math.min(windowStart[key] ?? 0, all.length - 1);
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + rowCapacity) offset = cursor - rowCapacity + 1;
    offset = Math.max(0, Math.min(offset, all.length - rowCapacity));
    windowStart[key] = offset;
    return {
      start: offset,
      end: Math.min(all.length, offset + rowCapacity),
      above: offset,
      below: all.length - offset - rowCapacity,
    };
  });

  function displayWidth(text: string): number {
    let width = 0;
    for (const char of Array.from(text)) width += char.charCodeAt(0) > 255 ? 2 : 1;
    return width;
  }

  function highlight(text: string, tokens: string[]): Part[] {
    if (tokens.length === 0) return [{ t: text }];
    const lower = text.toLowerCase();
    const marks = new Array(text.length).fill(false);
    for (const token of tokens) {
      let from = 0;
      while (token && from < lower.length) {
        const at = lower.indexOf(token, from);
        if (at < 0) break;
        for (let i = at; i < at + token.length; i++) marks[i] = true;
        from = at + token.length;
      }
    }
    const parts: Part[] = [];
    let current = '';
    let currentMark = false;
    const push = () => {
      if (current) parts.push(currentMark ? { t: current, c: 'hl' } : { t: current });
      current = '';
    };
    for (let i = 0; i < text.length; i++) {
      if (marks[i] !== currentMark) {
        push();
        currentMark = marks[i];
      }
      current += text[i];
    }
    push();
    return parts;
  }

  function rowLine(row: MaxItemRow, index: number, selected: boolean, labelWidth: number): MaxLine {
    const tokens = panel.q ? searchTokens() : [];
    const parts: Part[] = [];
    let label: Part[] = [];
    let group = '';
    if (row.kind === 'group') {
      label = highlight(MAX_GROUP_LABEL[row.id] ?? '', tokens);
      parts.push({ t: '', c: 'vt' }, { t: ' ›', c: 'chev' });
    } else if (row.kind === 'changed') {
      label = highlight('已修改的设置', tokens);
      const total = changedIds().length;
      if (total > 0) parts.push({ t: String(total), c: 'vt' }, { t: ' ›', c: 'chev' });
      else parts.push({ t: '无', c: 'vt off' });
    } else if (row.kind === 'option') {
      const option = row.s.options?.[row.i];
      if (option) {
        label = option.glyph
          ? [{ t: `${option.glyph} ${option.label}` }]
          : [{ t: option.label }];
        if (option.v === panel.values[row.s.id]) {
          label.push({ t: ' ' }, { t: '✔', c: 'ok' });
        }
        if (option.v === row.s.def) parts.push({ t: '默认', c: 'vt off' });
        else parts.push({ t: '', c: 'vt' });
      }
    } else if (row.kind === 'setting') {
      const setting = row.s;
      label = highlight(setting.label, tokens);
      if (setting.plugin) label.push({ t: ` · ${setting.plugin}`, c: 'd' });
      const value = panel.values[setting.id];
      if (setting.type === 'toggle') {
        parts.push({ t: value ? '开' : '关', c: `vt${value ? '' : ' off'}` });
      } else if (setting.type === 'moved') {
        parts.push({ t: 'settings.json', c: 'vt off' }, { t: ' ›', c: 'chev' });
      } else {
        const option = (setting.options ?? []).find((item) => item.v === value);
        if (option) {
          parts.push(
            { t: option.glyph ? `${option.glyph} ${option.label}` : option.label, c: 'vt' },
            { t: ' ›', c: 'chev' },
          );
        } else {
          parts.push({ t: setting.unsetLabel ?? '', c: 'vt off' }, { t: ' ›', c: 'chev' });
        }
      }
      if (row.showGroup) group = MAX_GROUP_LABEL[setting.g] ?? '';
    }
    return {
      k: `r:${row.k}`,
      kind: 'row',
      cls: `ln pl efc-max-row${selected ? ' sel' : ''}`,
      dataI: index,
      selected,
      width: labelWidth,
      label,
      parts,
      group: group || undefined,
    };
  }

  function buildConfigLines(): MaxLine[] {
    const lines: MaxLine[] = [];
    lines.push({ k: 'prule', kind: 'line', cls: 'ln prule', parts: [] });
    lines.push({
      k: 'tabs',
      kind: 'line',
      cls: 'ln pl',
      parts: [
        { t: '设置', c: 'b a' },
        { t: '  ' },
        { t: ' 状态 ' },
        { t: ' ' },
        { t: ' 配置 ', c: 'inv' },
        { t: ' 用量 ' },
        { t: ' 统计 ' },
      ],
    });
    lines.push({ k: 'b0', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] });
    if (panel.picker) {
      const setting = MAX_BY_ID[panel.picker.id];
      lines.push({ k: 'hd', kind: 'line', cls: 'ln pl', parts: [{ t: setting.label, c: 'b' }] });
    } else if (panel.q) {
      lines.push({
        k: 'hd',
        kind: 'line',
        cls: 'ln pl fx',
        parts: [
          { t: '⌕ ', c: 'd' },
          { t: panel.q },
          { t: ' ', c: 'cur' },
          { t: `${rows.length} 条结果`, c: 'd push' },
        ],
      });
    } else {
      lines.push({ k: 'hd', kind: 'line', cls: 'ln pl', parts: [{ t: '⌕ 搜索设置…', c: 'd' }] });
    }
    if (titleLine) lines.push(titleLine);
    const visible = rows.slice(windowInfo.start, windowInfo.end);
    let labelWidth = 0;
    for (const row of rows) {
      if (row.kind === 'sep') continue;
      let length = 0;
      if (row.kind === 'group') length = displayWidth(MAX_GROUP_LABEL[row.id] ?? '');
      else if (row.kind === 'changed') length = displayWidth('已修改的设置');
      else if (row.kind === 'option') {
        const option = row.s.options?.[row.i];
        length = displayWidth(option ? (option.glyph ? `${option.glyph} ${option.label}` : option.label) : '') + 2;
      } else {
        length = displayWidth(row.s.label) + (row.s.plugin ? displayWidth(` · ${row.s.plugin}`) : 0);
      }
      if (length > labelWidth) labelWidth = length;
    }
    const width = Math.min(labelWidth + 3, panel.q ? 36 : 44);
    if (windowInfo.above > 0) {
      lines.push({
        k: 'above',
        kind: 'line',
        cls: 'ln pl d',
        parts: [{ t: `↑ ${windowInfo.above} 行在上方` }],
      });
    }
    visible.forEach((row, order) => {
      const index = windowInfo.start + order;
      if (row.kind === 'sep') {
        lines.push({ k: `sep:${index}`, kind: 'line', cls: 'ln', parts: [{ t: ' ' }] });
        return;
      }
      lines.push(rowLine(row, index, index === cursor, width));
    });
    if (windowInfo.below > 0) {
      lines.push({
        k: 'below',
        kind: 'line',
        cls: 'ln pl d',
        parts: [{ t: `↓ ${windowInfo.below} 行在下方` }],
      });
    }
    if (rows.length === 0) {
      if (panel.q) {
        lines.push({
          k: 'none',
          kind: 'line',
          cls: 'ln pl',
          parts: [{ t: `没有匹配“${panel.q}”的设置`, c: 'd i' }],
        });
      } else if (panel.view === 'changed') {
        lines.push({
          k: 'none',
          kind: 'line',
          cls: 'ln pl',
          parts: [{ t: '所有设置都在默认值。', c: 'd i' }],
        });
      }
    }
    if (helpLines.length > 0) {
      lines.push({ k: 'hb', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] });
      helpLines.forEach((text, index) => {
        lines.push({ k: `h${index}`, kind: 'line', cls: 'ln pl d', parts: [{ t: text }] });
      });
    }
    return lines;
  }

  function transcriptLines(): MaxLine[] {
    return [
      {
        k: 't0',
        kind: 'line',
        cls: 'ln umsg',
        parts: [{ t: '> ', c: 'd' }, { t: 'fetchUser 在网络不稳定时会失败，加上重试' }],
      },
      { k: 't1', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] },
      {
        k: 't2',
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: '⏺', c: 'gl' },
          { t: '我会把请求包进带指数退避的重试循环。' },
        ],
      },
      { k: 't3', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] },
      {
        k: 't4',
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: '⏺', c: 'gl ok' },
          { t: 'Update', c: 'b' },
          { t: '(src/api/users.ts)' },
        ],
      },
      {
        k: 't5',
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: '⎿', c: 'ind5 d' },
          { t: '更新 src/api/users.ts，新增 18 行，删除 4 行', c: 'd' },
        ],
      },
      { k: 't6', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] },
      {
        k: 't7',
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: '⏺', c: 'gl ok' },
          { t: 'Bash', c: 'b' },
          { t: '(bun test users)' },
        ],
      },
      {
        k: 't8',
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: '⎿', c: 'ind5 d' },
          { t: '12 通过，0 失败', c: 'd' },
        ],
      },
      { k: 't9', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] },
      {
        k: 't10',
        kind: 'line',
        cls: 'ln',
        parts: [{ t: '⏺', c: 'gl' }, { t: '为 fetchUser() 加上指数退避，并更新了两个调用点。' }],
      },
      { k: 't11', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] },
    ];
  }

  function buildClosedLines(): MaxLine[] {
    const summary = panel.lastSummary.length > 0 ? panel.lastSummary.join(' · ') : '没有改动';
    const wrapped = wrapText(summary, 74, 5);
    const lines: MaxLine[] = [...transcriptLines()];
    lines.push({ k: 'cmd', kind: 'line', cls: 'ln umsg', parts: [{ t: '> ', c: 'd' }, { t: '/config' }] });
    wrapped.forEach((text, index) => {
      lines.push({
        k: `sum${index}`,
        kind: 'line',
        cls: 'ln',
        parts: [
          { t: index === 0 ? '⎿' : '', c: 'ind5 d' },
          { t: text, c: panel.lastSummary.length > 0 ? undefined : 'd' },
        ],
      });
    });
    lines.push({ k: 'cb', kind: 'line', cls: 'ln', parts: [{ t: ' ' }] });
    lines.push({ k: 'hr1', kind: 'line', cls: 'ln hr', parts: [] });
    lines.push({
      k: 'reopen',
      kind: 'row',
      cls: 'ln efc-max-row',
      dataI: -1,
      selected: false,
      width: 0,
      label: [{ t: '/config' }],
      parts: [],
    });
    lines.push({ k: 'hr2', kind: 'line', cls: 'ln hr', parts: [] });
    const effort = MAX_BY_ID.effort.options?.find((option) => option.v === panel.values.effort);
    lines.push({
      k: 'foot',
      kind: 'line',
      cls: 'ln fx',
      parts: [
        { t: '  ? 查看快捷键', c: 'd' },
        {
          t: `${effort?.glyph ?? ''} ${effort?.label ?? ''} · /effort  `,
          c: 'd push',
        },
      ],
    });
    return lines;
  }

  const lines = $derived.by(() => {
    const all = panel.closed ? buildClosedLines() : [...transcriptLines(), ...buildConfigLines()];
    return all.slice(Math.max(0, all.length - 24));
  });

  /* ---------- 操作 ---------- */

  function syncTheme(value: string | boolean | undefined): void {
    panel.t = MAX_THEME_T[String(value)] ?? 'dark';
  }

  function setCursor(index: number): void {
    const key = viewKey();
    if (panel.picker) {
      panel.picker.cur = index;
      const setting = MAX_BY_ID[panel.picker.id];
      if (setting.preview) syncTheme(setting.options?.[index]?.v);
    } else {
      panel.cur[key] = index;
    }
  }

  function setValue(setting: MaxSetting, value: string | boolean): void {
    if (panel.values[setting.id] === value) return;
    panel.values[setting.id] = value;
    if (!panel.order.includes(setting.id)) panel.order.push(setting.id);
    if (setting.id === 'theme') syncTheme(value);
  }

  function closePicker(): void {
    if (!panel.picker) return;
    const setting = MAX_BY_ID[panel.picker.id];
    panel.picker = null;
    if (setting.preview) syncTheme(panel.values[setting.id]);
  }

  function openPane(): void {
    panel.closed = false;
    panel.view = 'home';
    panel.cur = { home: 0 };
    panel.q = '';
    panel.picker = null;
    panel.note = null;
    panel.order = [];
    panel.openValues = { ...panel.values };
    syncTheme(panel.values.theme);
  }

  function changeSummary(setting: MaxSetting): string {
    const name =
      setting.name ?? `${setting.label.charAt(0).toLowerCase()}${setting.label.slice(1)}`;
    if (setting.type === 'toggle') {
      return `${panel.values[setting.id] ? '开启' : '关闭'} ${name}`;
    }
    const option = (setting.options ?? []).find((item) => item.v === panel.values[setting.id]);
    return `把 ${name} 设为 ${option?.label ?? ''}`;
  }

  function closePane(): void {
    closePicker();
    panel.q = '';
    panel.note = null;
    panel.lastSummary = panel.order
      .filter((id) => panel.values[id] !== panel.openValues[id])
      .map((id) => changeSummary(MAX_BY_ID[id]));
    panel.closed = true;
  }

  function activate(): void {
    if (panel.closed) {
      openPane();
      return;
    }
    const row = rows[cursor];
    if (!row) return;
    if (panel.picker) {
      const setting = MAX_BY_ID[panel.picker.id];
      const option = setting.options?.[panel.picker.cur];
      closePicker();
      if (option) setValue(setting, option.v);
      syncTheme(panel.values[setting.id]);
      return;
    }
    if (row.kind === 'group') {
      panel.q = '';
      panel.view = row.id;
      panel.cur[row.id] = 0;
      return;
    }
    if (row.kind === 'changed') {
      panel.q = '';
      panel.changedIds = changedIds();
      panel.view = 'changed';
      panel.cur.changed = 0;
      return;
    }
    if (row.kind !== 'setting') return;
    const setting = row.s;
    if (setting.type === 'toggle') {
      setValue(setting, !panel.values[setting.id]);
      return;
    }
    if (setting.type === 'choice') {
      const index = (setting.options ?? []).findIndex((option) => option.v === panel.values[setting.id]);
      panel.picker = { id: setting.id, cur: index < 0 ? 0 : index };
      return;
    }
    panel.note = `正在编辑器里打开 ~/.claude/settings.json 的“${setting.moved}”…`;
    if (noteTimer !== undefined) window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => {
      panel.note = null;
    }, 3200);
  }

  function move(step: number): void {
    const rowList = rows;
    if (rowList.length === 0) return;
    let index = panel.picker
      ? Math.max(0, Math.min(rowList.length - 1, panel.picker.cur))
      : normalizeCursor(rowList, panel.cur[viewKey()] ?? 0);
    index += step;
    while (rowList[index] && rowList[index].kind === 'sep') index += step;
    if (index < 0 || index >= rowList.length) return;
    setCursor(index);
  }

  function escape(): void {
    if (panel.picker) {
      closePicker();
      return;
    }
    if (panel.q) {
      panel.q = '';
      return;
    }
    if (panel.view !== 'home') {
      panel.view = 'home';
      return;
    }
    closePane();
  }

  /** 一次按键，键盘和自动演示共用。 */
  function press(key: string): void {
    if (panel.closed) {
      if (key === 'Enter') openPane();
      return;
    }
    if (panel.note && key !== 'Enter') panel.note = null;
    switch (key) {
      case 'Up':
        move(-1);
        return;
      case 'Down':
        move(1);
        return;
      case 'Enter':
        activate();
        return;
      case 'Escape':
        escape();
        return;
      case 'Backspace':
        if (panel.q) {
          panel.q = panel.q.slice(0, -1);
          panel.cur.search = 0;
        }
        return;
      default:
        if (key.length === 1 && !panel.picker) {
          if (!panel.q && (key === ' ' || key === '/')) return;
          panel.q += key;
          panel.cur.search = 0;
        }
    }
  }

  function mapKey(key: string, shift: boolean): string | null {
    switch (key) {
      case 'ArrowUp':
        return 'Up';
      case 'ArrowDown':
        return 'Down';
      case 'ArrowLeft':
        return 'Left';
      case 'ArrowRight':
        return 'Right';
      case 'Enter':
        return 'Enter';
      case 'Escape':
        return 'Escape';
      case 'Backspace':
        return 'Backspace';
      case 'Tab':
        return shift ? null : 'Tab';
      default:
        return key && key.length === 1 ? key : null;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.altKey) return;
    if (event.ctrlKey) {
      if (event.key === 'c' || event.key === 'd') {
        event.preventDefault();
        stopDemo();
        if (!panel.closed) closePane();
      }
      return;
    }
    const key = mapKey(event.key, event.shiftKey);
    if (!key || key === 'Left' || key === 'Right' || key === 'Tab') return;
    event.preventDefault();
    event.stopPropagation();
    stopDemo();
    press(key);
  }

  function onScreenClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    stopDemo();
    if (panel.closed) {
      if (target.closest('[data-reopen]')) openPane();
      termEl?.focus({ preventScroll: true });
      return;
    }
    const rowEl = target.closest<HTMLElement>('.efc-max-row');
    if (rowEl) {
      const index = Number(rowEl.dataset.i ?? 0);
      if (index >= 0) {
        setCursor(index);
        activate();
      }
    }
    termEl?.focus({ preventScroll: true });
  }

  /* ---------- 自动演示 ---------- */

  const SCENARIOS: Record<string, { keys: string[]; delay: number }> = {
    vim: { keys: ['v', 'i', 'm', 'Enter'], delay: 330 },
    theme: {
      keys: [
        'Down',
        'Down',
        'Down',
        'Down',
        'Enter',
        'Down',
        'Down',
        'Down',
        'Down',
        'Down',
        'Escape',
      ],
      delay: 520,
    },
    dark: { keys: ['d', 'a', 'r', 'k'], delay: 330 },
    moved: { keys: ['g', 'i', 't', 'i', 'g', 'n', 'o', 'r', 'e', 'Enter'], delay: 260 },
    changed: { keys: [...Array(11).fill('Down'), 'Enter'], delay: 190 },
    close: { keys: ['Down', 'Down', 'Enter', 'Escape'], delay: 480 },
  };
  const SCENARIO_NAMES = ['vim', 'theme', 'dark', 'moved', 'changed', 'close'];

  function stopScenario(): void {
    if (scenarioTimer !== undefined) window.clearTimeout(scenarioTimer);
    scenarioTimer = undefined;
    scenarioKeys = [];
    scenarioName = null;
  }

  function stopDemo(): void {
    stopped = true;
    stopScenario();
  }

  function scenarioTick(): void {
    if (!scenarioKeys.length) {
      scenarioName = null;
      return;
    }
    const key = scenarioKeys.shift() ?? '';
    press(key);
    const delay = SCENARIOS[scenarioName ?? '']?.delay ?? 330;
    scenarioTimer = window.setTimeout(scenarioTick, delay);
  }

  function startScenario(name: string): void {
    stopScenario();
    if (panel.closed) openPane();
    else {
      closePicker();
      panel.q = '';
      panel.view = 'home';
      panel.cur.home = 0;
      panel.note = null;
    }
    scenarioName = name;
    scenarioKeys = [...(SCENARIOS[name]?.keys ?? [])];
    scenarioTimer = window.setTimeout(scenarioTick, 380);
  }

  const demoSteps: DemoStep[] = [
    ...SCENARIO_NAMES.map((name) => ({
      run: () => startScenario(name),
      busy: () => scenarioName === name,
      hold: 2000,
    })),
    {
      run: () => {
        panel.values = maxInitialValues();
        openPane();
      },
      hold: 1200,
    },
  ];

  $effect(() => {
    if (!active || stopped) {
      stopScenario();
      return;
    }
    return createDemoRunner(demoSteps, () => stopped);
  });

  $effect(() => () => {
    if (scenarioTimer !== undefined) window.clearTimeout(scenarioTimer);
    if (noteTimer !== undefined) window.clearTimeout(noteTimer);
  });

  function wrapText(text: string, limit: number, maxLines: number): string[] {
    const lines: string[] = [];
    let current = '';
    let width = 0;
    for (const char of Array.from(text)) {
      const size = char.charCodeAt(0) > 255 ? 2 : 1;
      if (width + size > limit && current) {
        lines.push(current);
        current = '';
        width = 0;
      }
      current += char;
      width += size;
    }
    if (current) lines.push(current);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] += '…';
      return kept;
    }
    return lines;
  }
</script>

<div class="efc-max" data-active={active ? 'true' : 'false'}>
  <div class="__stage">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={termEl}
      class="term term-p"
      tabindex="0"
      role="application"
      data-t={panel.t}
      aria-label="配置界面提案。上下移动，Enter 修改或打开，Escape 后退，打字搜索。"
      onkeydown={onKeydown}
      onclick={onScreenClick}
      onpointerdown={() => {
        stopDemo();
        termEl?.focus({ preventScroll: true });
      }}
    >
      <div class="screen">
        {#each lines as line (line.k)}
          {#if line.kind === 'row'}
            <div class={line.cls} data-i={line.dataI}>
              <span class="p">{line.selected ? '❯' : ''}</span>
              <span class="l" style={`width: ${line.width}ch`}>
                {#each line.label as part, index (index)}<span class={part.c}>{part.t}</span>{/each}
              </span>
              <span class="v">
                {#each line.parts as part, index (index)}<span class={part.c}>{part.t}</span>{/each}
              </span>
              {#if line.group}<span class="g">{line.group}</span>{/if}
            </div>
          {:else}
            <div class={line.cls}>
              {#each line.parts as part, index (index)}<span class={part.c}>{part.t}</span>{/each}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>
