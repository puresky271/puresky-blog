<script lang="ts">
  /**
   * 中档 effort 的 /config 重设计（原站 chunks/3e_nhrupds886.js）。
   *
   * 比低档多了一套像 Claude Code 的壳：窗口标题栏、`> /config` 回显、带搜索框的
   * 设置盒子。首页只放 8 个常用设置，其余收进六个分组子页和「已修改的设置」页，
   * 枚举设置展开成子菜单。进入视口后会自己演示搜索、进分组、开子菜单、重置一圈。
   */

  import {
    MEDIUM_BY_ID,
    MEDIUM_GROUPS,
    MEDIUM_GROUP_NAME,
    MEDIUM_SETTINGS,
    type MediumSetting,
  } from './medium';
  import { createDemoRunner, type DemoStep } from './script';

  let { active = false }: { active?: boolean } = $props();

  type ListRow =
    | { kind: 'setting'; s: MediumSetting; tag?: string }
    | { kind: 'nav'; label: string; count: number; page: string }
    | { kind: 'gap' };

  interface Panel {
    values: Record<string, string | boolean>;
    page: string;
    cursor: number;
    offset: number;
    editing: { id: string; index: number } | null;
    flash: string;
    back: { page: string; cursor: number }[];
    q: string;
  }

  /** 原站重置值的函数：先全部回默认，再把 model 和 verbose 拨到演示用的值。 */
  function makeValues(): Record<string, string | boolean> {
    const values: Record<string, string | boolean> = {};
    for (const setting of MEDIUM_SETTINGS) values[setting.id] = setting.def;
    values.model = 'Opus 5.5';
    values.verbose = true;
    return values;
  }

  function makeState(): Panel {
    return {
      values: makeValues(),
      page: 'home',
      cursor: 0,
      offset: 0,
      editing: null,
      flash: '',
      back: [],
      q: '',
    };
  }

  let panel = $state<Panel>(makeState());
  let stopped = $state(false);
  let termEl = $state<HTMLDivElement>();
  let inputEl = $state<HTMLInputElement>();

  const isChanged = (setting: MediumSetting): boolean => panel.values[setting.id] !== setting.def;

  function valueText(setting: MediumSetting): string {
    if (setting.type === 'bool') return panel.values[setting.id] ? '开' : '关';
    return String(panel.values[setting.id]);
  }

  function homeRows(): ListRow[] {
    const rows: ListRow[] = MEDIUM_SETTINGS.filter((item) => item.essential).map((item) => ({
      kind: 'setting',
      s: item,
    }));
    rows.push({ kind: 'gap' });
    for (const group of MEDIUM_GROUPS) {
      rows.push({
        kind: 'nav',
        label: group.name,
        count: MEDIUM_SETTINGS.filter((item) => item.group === group.id && !item.essential).length,
        page: `group:${group.id}`,
      });
    }
    const changed = MEDIUM_SETTINGS.filter(isChanged).length;
    if (changed > 0) {
      rows.push({ kind: 'nav', label: '已修改的设置', count: changed, page: 'changed' });
    }
    return rows;
  }

  function groupRows(page: string): ListRow[] {
    if (page === 'changed') {
      return MEDIUM_SETTINGS.filter(isChanged).map((item) => ({
        kind: 'setting',
        s: item,
        tag: MEDIUM_GROUP_NAME[item.group],
      }));
    }
    const group = page.slice(6);
    return MEDIUM_SETTINGS.filter((item) => item.group === group && !item.essential).map((item) => ({
      kind: 'setting',
      s: item,
    }));
  }

  function buildList(): ListRow[] {
    const query = panel.q.trim().toLowerCase();
    if (query) {
      return MEDIUM_SETTINGS.filter((item) =>
        `${item.label} ${item.desc} ${MEDIUM_GROUP_NAME[item.group]}`.toLowerCase().includes(query),
      ).map((item) => ({ kind: 'setting', s: item, tag: MEDIUM_GROUP_NAME[item.group] }));
    }
    if (panel.page === 'home') return homeRows();
    return groupRows(panel.page);
  }

  const list = $derived(buildList());

  /** 可选中行的下标（gap 只是空行，光标不能停）。 */
  function selectableIndexes(rows: ListRow[]): number[] {
    const indexes: number[] = [];
    rows.forEach((row, index) => {
      if (row.kind !== 'gap') indexes.push(index);
    });
    return indexes;
  }

  function cursorOf(rows: ListRow[]): number {
    const indexes = selectableIndexes(rows);
    if (indexes.length === 0) return -1;
    let cursor = Math.max(0, Math.min(rows.length - 1, panel.cursor));
    if (!indexes.includes(cursor)) {
      cursor = indexes.find((index) => index >= cursor) ?? indexes[indexes.length - 1];
    }
    return cursor;
  }

  const view = $derived.by(() => {
    const rows = list;
    const editingOptions = panel.editing
      ? (MEDIUM_BY_ID[panel.editing.id]?.options?.length ?? 0)
      : 0;
    const cap = Math.max(4, 14 - editingOptions);
    const cursor = cursorOf(rows);
    let offset = Math.max(0, Math.min(panel.offset, Math.max(0, rows.length - cap)));
    if (cursor >= 0) {
      if (cursor < offset) offset = cursor;
      if (cursor >= offset + cap) offset = cursor - cap + 1;
      offset = Math.max(0, Math.min(offset, Math.max(0, rows.length - cap)));
    }
    return { cursor, offset, cap, end: Math.min(rows.length, offset + cap) };
  });

  const current = $derived(view.cursor >= 0 ? list[view.cursor] : undefined);

  const title = $derived.by(() => {
    const query = panel.q.trim();
    if (query) {
      const total = list.length;
      return { text: '设置', crumb: `› ${total} 条结果` };
    }
    if (panel.page === 'home') return { text: '设置', crumb: '' };
    const name = panel.page === 'changed' ? '已修改的设置' : MEDIUM_GROUP_NAME[panel.page.slice(6)];
    return { text: '设置', crumb: `› ${name}` };
  });

  const footer = $derived.by(() => {
    if (panel.flash) return { flash: true, text: panel.flash };
    const row = current;
    if (!row) return { flash: false, text: '' };
    if (row.kind === 'setting') {
      const def = row.s.type === 'bool' ? (row.s.def ? '开' : '关') : String(row.s.def);
      return {
        flash: false,
        text: isChanged(row.s) ? `${row.s.desc} 默认值：${def}。` : row.s.desc,
      };
    }
    if (row.kind === 'nav') {
      const labels = groupRows(row.page)
        .filter((item): item is Extract<ListRow, { kind: 'setting' }> => item.kind === 'setting')
        .map((item) => item.s.label);
      const head = labels.slice(0, 4).join('，');
      return { flash: false, text: labels.length > 4 ? `${head}，等 ${labels.length} 项` : head };
    }
    return { flash: false, text: '' };
  });

  function focusTerm(): void {
    termEl?.focus({ preventScroll: true });
  }

  function focusSearch(): void {
    inputEl?.focus({ preventScroll: true });
  }

  function normalize(): ListRow[] {
    const rows = buildList();
    panel.cursor = cursorOf(rows);
    return rows;
  }

  function move(step: number): void {
    if (panel.editing) {
      const setting = MEDIUM_BY_ID[panel.editing.id];
      const total = setting.options?.length ?? 1;
      panel.editing.index = (panel.editing.index + step + total) % total;
      return;
    }
    const rows = normalize();
    const indexes = selectableIndexes(rows);
    const cursor = cursorOf(rows);
    const position = indexes.indexOf(cursor);
    const next = indexes[Math.max(0, Math.min(indexes.length - 1, position + step))];
    if (next !== undefined) panel.cursor = next;
    panel.flash = '';
  }

  function activate(): void {
    const rows = normalize();
    const cursor = cursorOf(rows);
    panel.cursor = cursor;
    const row = rows[cursor];
    if (panel.editing) {
      const setting = MEDIUM_BY_ID[panel.editing.id];
      const option = setting.options?.[panel.editing.index];
      if (option !== undefined) panel.values[setting.id] = option;
      panel.editing = null;
      panel.flash = `${setting.label} 设为 ${option ?? ''}`;
      return;
    }
    if (!row) return;
    if (row.kind === 'nav') {
      panel.back.push({ page: panel.page, cursor: panel.cursor });
      panel.page = row.page;
      panel.cursor = 0;
      panel.offset = 0;
      panel.flash = '';
      return;
    }
    if (row.kind !== 'setting') return;
    const setting = row.s;
    if (setting.type === 'bool') {
      panel.values[setting.id] = !panel.values[setting.id];
      panel.flash = `${setting.label} ${panel.values[setting.id] ? '已开启' : '已关闭'}`;
      return;
    }
    const index = Math.max(0, setting.options?.indexOf(String(panel.values[setting.id])) ?? 0);
    panel.editing = { id: setting.id, index };
    panel.flash = '';
  }

  function escape(): void {
    if (panel.editing) {
      panel.editing = null;
      return;
    }
    if (panel.q) {
      panel.q = '';
      panel.cursor = 0;
      panel.offset = 0;
      focusTerm();
      return;
    }
    const previous = panel.back.pop();
    if (previous) {
      panel.page = previous.page;
      panel.cursor = previous.cursor;
      panel.offset = 0;
      panel.flash = '';
      return;
    }
    panel.flash = '在这里按 Esc 会关闭 /config 回到提示符。';
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    markStopped();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        return;
      case 'Enter':
        event.preventDefault();
        activate();
        return;
      case 'Escape':
        event.preventDefault();
        escape();
        return;
      default:
        // 焦点还在终端上时，随便敲一个字符就转去搜索框（原站同款）
        if (event.target !== inputEl && event.key.length === 1) focusSearch();
    }
  }

  function onSearchInput(event: Event): void {
    panel.q = (event.currentTarget as HTMLInputElement).value;
    panel.editing = null;
    panel.cursor = 0;
    panel.offset = 0;
    panel.flash = '';
  }

  function onRowClick(index: number): void {
    panel.editing = null;
    panel.cursor = index;
    focusTerm();
    activate();
  }

  function onOptionClick(index: number): void {
    if (!panel.editing) return;
    panel.editing.index = index;
    focusTerm();
    activate();
  }

  /* ---------- 自动演示 ---------- */

  function resetValues(): void {
    panel.values = makeValues();
  }

  /** 对应原站的 y()：回首页，再按场景预置光标并触发。 */
  function demo(kind: 'search' | 'group' | 'enum' | 'reset'): void {
    if (kind === 'reset') resetValues();
    panel.page = 'home';
    panel.cursor = 0;
    panel.offset = 0;
    panel.editing = null;
    panel.back = [];
    panel.flash = '';
    panel.q = '';
    if (kind === 'search') {
      panel.q = '通知';
      return;
    }
    if (kind === 'group' || kind === 'enum') {
      const rows = buildList();
      const index = rows.findIndex((row) =>
        kind === 'group'
          ? row.kind === 'nav' && row.page === 'group:connections'
          : row.kind === 'setting' && row.s.id === 'theme',
      );
      if (index >= 0) panel.cursor = index;
      activate();
      // 原站先在首页选中目标再触发，触发后仍停在该组页或子菜单
      if (kind === 'enum') panel.cursor = 0;
    }
  }

  const demoSteps: DemoStep[] = [
    { run: () => demo('search'), hold: 2800 },
    { run: () => demo('group'), hold: 2800 },
    { run: () => demo('enum'), hold: 2800 },
    { run: () => demo('reset'), hold: 1600 },
  ];

  $effect(() => {
    if (!active || stopped) return;
    return createDemoRunner(demoSteps, () => stopped);
  });

  function markStopped(): void {
    stopped = true;
  }
</script>

<div class="efc-medium" data-active={active ? 'true' : 'false'}>
  <div class="stage">
    <!-- 终端整屏是一个可聚焦的区域，键盘和点击都由它统一接管 -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={termEl}
      class="term"
      tabindex="0"
      role="application"
      aria-label="可交互的配置菜单外观"
      onkeydown={onKeydown}
      onpointerdown={() => {
        markStopped();
        termEl?.focus({ preventScroll: true });
      }}
    >
      <div class="term-bar">
        <i></i><i></i><i></i>
        <span>claude — ~/code/my-app</span>
      </div>
      <div class="screen">
        <div class="prompt-echo">&gt; /config</div>
        <div class="box">
          <div class="head">
            <div class="title">
              {title.text}{#if title.crumb}<span class="crumb"> {title.crumb}</span>{/if}
            </div>
            <label class="efc-medium-search">
              <span>⌕</span>
              <input
                bind:this={inputEl}
                autocomplete="off"
                spellcheck={false}
                placeholder="输入以搜索"
                value={panel.q}
                oninput={onSearchInput}
              />
            </label>
          </div>
          <div
            class="list"
            role="listbox"
            tabindex="-1"
            aria-label="设置列表"
            onpointerdown={() => inputEl?.blur()}
          >
            {#if list.length === 0}
              <div class="empty">
                {panel.q.trim()
                  ? `没有匹配“${panel.q.trim()}”的设置`
                  : '还没有改动过默认值。'}
              </div>
            {/if}
            {#if view.offset > 0}
              <div class="more">↑ 还有 {view.offset} 条</div>
            {/if}
            {#each list.slice(view.offset, view.end) as row, offsetIndex (row.kind === 'gap' ? 'gap' : row.kind === 'nav' ? row.page : row.s.id)}
              {@const index = view.offset + offsetIndex}
              {#if row.kind === 'gap'}
                <div class="gap"></div>
              {:else}
                <!-- svelte-ignore a11y_interactive_supports_focus, a11y_click_events_have_key_events -->
                <div
                  class="efc-medium-row{index === view.cursor ? ' sel' : ''}{row.kind === 'nav'
                    ? ' efc-medium-nav'
                    : ''}"
                  role="button"
                  onclick={() => onRowClick(index)}
                  onpointerdown={() => inputEl?.blur()}
                >
                  <span class="ptr">{index === view.cursor ? '›' : ' '}</span>
                  {#if row.kind === 'nav'}
                    <span class="label">{row.label}</span>
                    <span class="val">{row.count}  ›</span>
                  {:else}
                    <span class="label">{row.s.label}</span>
                    {#if row.tag}<span class="tag">{row.tag}</span>{/if}
                    <span class="val{row.s.type === 'bool' && panel.values[row.s.id] ? ' on' : ''}">
                      {valueText(row.s)}
                    </span>
                    <span class="dot">{isChanged(row.s) ? '•' : ' '}</span>
                  {/if}
                </div>
                {#if panel.editing && row.kind === 'setting' && row.s.id === panel.editing.id}
                  {#each row.s.options ?? [] as option, optionIndex (option)}
                    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                    <div
                      class="opt{optionIndex === panel.editing.index ? ' sel' : ''}"
                      onclick={() => onOptionClick(optionIndex)}
                    >
                      <span class="mk">{optionIndex === panel.editing.index ? '›' : ' '}</span>
                      <span>
                        {option}{option === panel.values[row.s.id] ? '  ✓' : ''}
                      </span>
                    </div>
                  {/each}
                {/if}
              {/if}
            {/each}
            {#if view.end < list.length}
              <div class="more">↓ 还有 {list.length - view.end} 条</div>
            {/if}
          </div>
          <div class="foot">
            {#if footer.flash}
              <span class="flash">{footer.text}</span>
            {:else}
              {footer.text}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
