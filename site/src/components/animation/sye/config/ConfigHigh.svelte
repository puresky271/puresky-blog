<script lang="ts">
  /**
   * 高档 effort 的 /config 重设计（原站 chunks/1h4yeay_uf4au.js）。
   *
   * 完整的 Claude Code 终端外观：设置页签、面包屑、列表、底部说明行。
   * 首屏四个固定设置，下面是七个分组、「已修改的设置」和「打开 settings.json」。
   * 枚举设置进 picker 子页，主题在 picker 里上下移动会实时换终端配色。
   * 进入视口后依次演示五段操作（Vim 模式、搜索、换主题、看已修改、关闭）。
   */

  import {
    HIGH_BY_ID,
    HIGH_GROUP_MAP,
    HIGH_GROUPS,
    HIGH_SETTINGS,
    type HighGroup,
    type HighSetting,
  } from './high';
  import { createDemoRunner, type DemoStep } from './script';

  let { active = false }: { active?: boolean } = $props();

  type Screen = 'root' | 'group' | 'changed' | 'search' | 'picker';

  interface Frame {
    screen: Screen;
    group?: string;
    id?: string;
    idx: number;
    off: number;
  }

  type HighRow =
    | { k: string; type: 'setting'; s: HighSetting }
    | { k: string; type: 'group'; g: HighGroup }
    | { k: string; type: 'changed'; n: number }
    | { k: string; type: 'file' }
    | { k: string; type: 'option'; o: string; s: HighSetting }
    | { k: string; type: 'sep' };

  interface Flash {
    text: string;
    warn: boolean;
  }

  interface HighState {
    values: Record<string, string | boolean>;
    sessionStart: Record<string, string | boolean>;
    stack: Frame[];
    query: string;
    flash: Flash | null;
    preview: string | null;
    closed: boolean;
    summary: string;
    pulse: string | null;
  }

  function makeValues(): Record<string, string | boolean> {
    const values: Record<string, string | boolean> = {};
    for (const setting of HIGH_SETTINGS) {
      values[setting.id] = setting.init !== undefined ? setting.init : setting.def;
    }
    return values;
  }

  function makeState(): HighState {
    const values = makeValues();
    return {
      values,
      sessionStart: { ...values },
      stack: [{ screen: 'root', idx: 0, off: 0 }],
      query: '',
      flash: null,
      preview: null,
      closed: false,
      summary: '',
      pulse: null,
    };
  }

  let panel = $state<HighState>(makeState());
  let stopped = $state(false);
  let tourName = $state<string | null>(null);
  let termEl = $state<HTMLDivElement>();

  let tourKeys: string[] = [];
  let tourTimer: number | undefined;

  const frame = (): Frame => panel.stack[panel.stack.length - 1];

  const changedList = (): HighSetting[] =>
    HIGH_SETTINGS.filter((setting) => !setting.managed && panel.values[setting.id] !== setting.def);

  const isChanged = (setting: HighSetting): boolean =>
    !setting.managed && panel.values[setting.id] !== setting.def;

  function groupChanged(group: HighGroup): boolean {
    return HIGH_SETTINGS.some((setting) => setting.g === group.id && isChanged(setting));
  }

  function valueText(setting: HighSetting): string {
    if (setting.type === 'bool') return panel.values[setting.id] ? '开' : '关';
    return String(panel.values[setting.id]);
  }

  function searchRows(query: string): HighRow[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const scored: { score: number; order: number; row: HighRow }[] = [];
    HIGH_SETTINGS.forEach((setting, order) => {
      const label = setting.label.toLowerCase();
      const groupLabel = HIGH_GROUP_MAP[setting.g].label.toLowerCase();
      let score = -1;
      if (label.startsWith(needle)) score = 0;
      else if (label.includes(needle)) score = 1;
      else if ((setting.kw ?? '').includes(needle)) score = 2;
      else if (groupLabel.includes(needle)) score = 3;
      else if (setting.desc.toLowerCase().includes(needle)) score = 4;
      else if (
        setting.type === 'enum' &&
        (setting.options ?? []).some((option) => option.toLowerCase().includes(needle))
      ) {
        score = 5;
      }
      if (score >= 0) {
        scored.push({ score, order, row: { k: `s:${setting.id}`, type: 'setting', s: setting } });
      }
    });
    scored.sort((a, b) => a.score - b.score || a.order - b.order);
    return scored.map((item) => item.row);
  }

  function buildRows(): HighRow[] {
    const current = frame();
    switch (current.screen) {
      case 'root': {
        const rows: HighRow[] = [];
        for (const setting of HIGH_SETTINGS.filter((item) => item.pinned)) {
          rows.push({ k: `s:${setting.id}`, type: 'setting', s: setting });
        }
        rows.push({ k: 'sep1', type: 'sep' });
        for (const group of HIGH_GROUPS) {
          rows.push({ k: `g:${group.id}`, type: 'group', g: group });
        }
        rows.push({ k: 'sep2', type: 'sep' });
        const changed = changedList().length;
        if (changed > 0) rows.push({ k: 'changed', type: 'changed', n: changed });
        rows.push({ k: 'file', type: 'file' });
        return rows;
      }
      case 'group':
        return HIGH_SETTINGS.filter((setting) => setting.g === current.group).map((setting) => ({
          k: `s:${setting.id}`,
          type: 'setting',
          s: setting,
        }));
      case 'changed':
        return changedList().map((setting) => ({
          k: `s:${setting.id}`,
          type: 'setting',
          s: setting,
        }));
      case 'search':
        return searchRows(panel.query);
      case 'picker': {
        const setting = HIGH_BY_ID[current.id ?? ''];
        if (!setting) return [];
        return (setting.options ?? []).map((option) => ({
          k: `o:${option}`,
          type: 'option',
          o: option,
          s: setting,
        }));
      }
      default:
        return [];
    }
  }

  const rows = $derived(buildRows());
  const flat = $derived(
    rows.filter((row): row is Exclude<HighRow, { type: 'sep' }> => row.type !== 'sep'),
  );

  /** 选中行看得见的窗口（原站超过 16 行才开 14 行的窗）。 */
  const windowInfo = $derived.by(() => {
    const all = rows;
    const current = frame();
    const maxIdx = Math.max(0, flat.length - 1);
    const idx = Math.max(0, Math.min(maxIdx, current.idx));
    const positions: number[] = [];
    let seen = 0;
    all.forEach((row, absolute) => {
      if (row.type === 'sep') return;
      positions[seen] = absolute;
      seen += 1;
    });
    const position = positions[idx] ?? all.length - 1;
    const overflow = all.length > 16;
    let offset = 0;
    if (overflow) {
      offset = Math.max(0, Math.min(current.off, all.length - 14));
      if (position < offset) offset = position;
      if (position >= offset + 14) offset = position - 14 + 1;
      offset = Math.max(0, Math.min(offset, all.length - 14));
    }
    const visible = all.slice(offset, offset + (overflow ? 14 : all.length));
    const selOf = new Map(positions.map((absolute, order) => [absolute, order]));
    return {
      entries: visible.map((row, order) => ({
        row,
        selIdx: row.type === 'sep' ? -1 : (selOf.get(offset + order) ?? -1),
      })),
      above: offset,
      below: all.length - offset - visible.length,
      overflow,
      idx,
    };
  });

  const currentRow = $derived(flat[windowInfo.idx]);

  const termClass = $derived.by(() => {
    const theme = String(panel.preview ?? panel.values.theme ?? '深色');
    return (
      'term' +
      (/浅色|Light/.test(theme) ? ' t-light' : '') +
      (/色盲|colorblind/.test(theme) ? ' t-cb' : '') +
      (/ANSI/.test(theme) ? ' t-ansi' : '')
    );
  });

  const crumb = $derived.by((): { text: string; dim: boolean }[] | null => {
    const current = frame();
    if (current.screen === 'root') {
      return [{ text: `⌕ 输入以搜索 ${HIGH_SETTINGS.length} 项设置`, dim: true }];
    }
    if (current.screen === 'search') return null;
    const parts: { text: string; dim: boolean }[] = [{ text: '配置 › ', dim: true }];
    if (current.screen === 'picker') {
      const setting = HIGH_BY_ID[current.id ?? ''];
      if (setting) {
        parts.push({ text: `${HIGH_GROUP_MAP[setting.g].label} › `, dim: true });
        parts.push({ text: setting.label, dim: false });
      }
    } else if (current.screen === 'group') {
      parts.push({ text: HIGH_GROUP_MAP[current.group ?? '']?.label ?? '', dim: false });
    } else {
      parts.push({ text: '已修改的设置', dim: false });
    }
    return parts;
  });

  const footer = $derived.by((): { text: string; cls: string } => {
    if (panel.flash) {
      return { text: panel.flash.text, cls: panel.flash.warn ? 'fg-warn' : 'fg-focus' };
    }
    const current = frame();
    const row = currentRow;
    if (current.screen === 'search' && !row) {
      return { text: `没有匹配“${panel.query.trim()}”的设置。`, cls: '' };
    }
    if (current.screen === 'changed' && !row) {
      return { text: '所有设置都回到了默认值。', cls: '' };
    }
    if (!row) return { text: '', cls: '' };
    switch (row.type) {
      case 'setting':
        return { text: row.s.desc, cls: '' };
      case 'group': {
        const labels = HIGH_SETTINGS.filter((setting) => setting.g === row.g.id).map((setting) =>
          setting.label.replace(/^.*› /, ''),
        );
        return {
          text:
            labels.slice(0, 4).join('，') +
            (labels.length > 4 ? `，等 ${labels.length - 4} 项` : ''),
          cls: '',
        };
      }
      case 'changed':
        return { text: '所有非默认的设置。选默认选项可以单独重置。', cls: '' };
      case 'file':
        return { text: '更新通道、工作树基础引用、会话回顾等高级键在这里。', cls: '' };
      case 'option':
        return {
          text: row.s.id === 'theme' ? `正在预览 ${row.o}。` : row.s.desc,
          cls: '',
        };
      default:
        return { text: '', cls: '' };
    }
  });

  function focusTerm(): void {
    termEl?.focus({ preventScroll: true });
  }

  function pulse(id: string): void {
    panel.pulse = id;
    window.setTimeout(() => {
      if (panel.pulse === id) panel.pulse = null;
    }, 520);
  }

  function syncPreview(): void {
    const current = frame();
    if (current.screen !== 'picker' || current.id !== 'theme') {
      panel.preview = null;
      return;
    }
    panel.preview = HIGH_BY_ID.theme.options?.[current.idx] ?? null;
  }

  function move(step: number): void {
    const current = frame();
    if (current.screen === 'picker') {
      const setting = HIGH_BY_ID[current.id ?? ''];
      const total = setting?.options?.length ?? 1;
      current.idx = (current.idx + step + total) % total;
      syncPreview();
      panel.flash = null;
      return;
    }
    const target = current.idx + step;
    if (target >= 0 && target < flat.length) current.idx = target;
    syncPreview();
    panel.flash = null;
  }

  function reopen(): void {
    panel.closed = false;
    panel.stack = [{ screen: 'root', idx: 0, off: 0 }];
    panel.query = '';
    panel.flash = null;
    panel.preview = null;
    panel.sessionStart = { ...panel.values };
  }

  function activate(): void {
    if (panel.closed) {
      reopen();
      return;
    }
    const current = frame();
    const idx = Math.max(0, Math.min(flat.length - 1, current.idx));
    current.idx = idx;
    const row = flat[idx];
    if (!row) return;
    if (row.type === 'setting') {
      const setting = row.s;
      if (setting.managed) {
        panel.flash = { text: '这项由你的组织托管，不能在这里修改。', warn: true };
        return;
      }
      if (setting.type === 'bool') {
        panel.values[setting.id] = !panel.values[setting.id];
        pulse(setting.id);
        panel.flash = null;
        return;
      }
      const options = setting.options ?? [];
      const index = Math.max(0, options.indexOf(String(panel.values[setting.id])));
      panel.stack.push({ screen: 'picker', id: setting.id, idx: index, off: 0 });
      syncPreview();
      panel.flash = null;
      return;
    }
    if (row.type === 'group') {
      panel.stack.push({ screen: 'group', group: row.g.id, idx: 0, off: 0 });
      panel.flash = null;
      panel.preview = null;
      return;
    }
    if (row.type === 'changed') {
      panel.stack.push({ screen: 'changed', idx: 0, off: 0 });
      panel.flash = null;
      return;
    }
    if (row.type === 'file') {
      panel.flash = { text: '正在编辑器里打开 ~/.claude/settings.json…', warn: false };
      return;
    }
    if (row.type === 'option') {
      panel.values[row.s.id] = row.o;
      panel.preview = null;
      panel.stack.pop();
      pulse(row.s.id);
      panel.flash = null;
    }
  }

  function escape(): void {
    const current = frame();
    if (current.screen === 'picker') {
      panel.preview = null;
      panel.stack.pop();
      return;
    }
    if (current.screen === 'search') {
      panel.query = '';
      panel.stack.pop();
      return;
    }
    if (panel.stack.length > 1) {
      panel.stack.pop();
      return;
    }
    const summary = HIGH_SETTINGS.filter(
      (setting) => panel.values[setting.id] !== panel.sessionStart[setting.id],
    ).map((setting) => `${setting.label}：${valueText(setting)}`);
    panel.summary = summary.length > 0 ? summary.join(' · ') : '没有改动';
    panel.closed = true;
  }

  /** 模拟一次按键，键盘、鼠标和自动演示都走这里。 */
  function press(key: string): void {
    if (panel.closed) {
      if (key === 'Enter') reopen();
      return;
    }
    const current = frame();
    panel.flash = null;
    switch (key) {
      case 'ArrowUp':
        move(-1);
        return;
      case 'ArrowDown':
        move(1);
        return;
      case 'Enter':
        activate();
        return;
      case 'Escape':
        escape();
        return;
      case 'Backspace':
        if (current.screen === 'search') {
          panel.query = panel.query.slice(0, -1);
          current.idx = 0;
          current.off = 0;
          if (!panel.query) panel.stack.pop();
        }
        return;
      case ' ':
        if (current.screen !== 'search') activate();
        return;
      default:
        if (key.length !== 1 || current.screen === 'picker') return;
        if (current.screen !== 'search') {
          panel.stack.push({ screen: 'search', idx: 0, off: 0 });
        }
        panel.query += key;
        frame().idx = 0;
        frame().off = 0;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const keys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Backspace'];
    if (!keys.includes(event.key) && event.key.length !== 1) return;
    event.preventDefault();
    event.stopPropagation();
    stopped = true;
    press(event.key);
  }

  function onScreenClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    stopped = true;
    focusTerm();
    if (panel.closed) {
      reopen();
      return;
    }
    const rowEl = target.closest<HTMLElement>('[data-i]');
    if (!rowEl) return;
    const index = Number(rowEl.dataset.i ?? 0);
    if (index < 0) return;
    frame().idx = index;
    syncPreview();
    activate();
  }

  /* ---------- 自动演示 ---------- */

  const TOUR_KEYS: Record<string, string[]> = {
    vim: ['goto:s:editor', 'Enter', 'goto:o:Vim', 'Enter'],
    search: ['type:bell', 'Enter', 'goto:o:自动', 'Enter', 'Escape'],
    theme: ['goto:s:theme', 'Enter', 'goto:o:深色', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'Enter'],
    changed: ['goto:changed', 'Enter', 'goto:s:tips', 'Enter', 'Escape'],
    close: ['Escape'],
  };
  const TOUR_NAMES = ['vim', 'search', 'theme', 'changed', 'close'];

  function stopTour(): void {
    if (tourTimer !== undefined) window.clearTimeout(tourTimer);
    tourTimer = undefined;
    tourKeys = [];
    tourName = null;
  }

  function stopDemo(): void {
    stopped = true;
    stopTour();
  }

  function tourTick(): void {
    if (!tourKeys.length) {
      tourName = null;
      return;
    }
    const head = tourKeys[0];
    if (head.startsWith('goto:')) {
      const key = head.slice(5);
      const target = flat.findIndex((row) => row.k === key);
      const current = frame().idx;
      if (target < 0 || target === current) {
        tourKeys.shift();
        tourTick();
        return;
      }
      press(target > current ? 'ArrowDown' : 'ArrowUp');
    } else {
      tourKeys.shift();
      press(head);
    }
    tourTimer = window.setTimeout(tourTick, 420);
  }

  function startTour(name: string): void {
    stopTour();
    if (panel.closed) reopen();
    panel.stack = [{ screen: 'root', idx: 0, off: 0 }];
    panel.query = '';
    panel.preview = null;
    panel.flash = null;
    if (name === 'changed' && panel.values.tips === HIGH_BY_ID.tips.def) {
      panel.values.tips = !HIGH_BY_ID.tips.def;
    }
    if (name === 'search' && panel.values.notifChannel === '自动') {
      panel.values.notifChannel = '终端响铃';
    }
    const queue: string[] = [];
    for (const key of TOUR_KEYS[name] ?? []) {
      if (key.startsWith('type:')) queue.push(...key.slice(5));
      else queue.push(key);
    }
    tourName = name;
    tourKeys = queue;
    tourTimer = window.setTimeout(tourTick, 450);
  }

  const demoSteps: DemoStep[] = TOUR_NAMES.map((name) => ({
    run: () => startTour(name),
    busy: () => tourName === name,
    hold: 1500,
  }));

  $effect(() => {
    if (!active || stopped) {
      stopTour();
      return;
    }
    return createDemoRunner(demoSteps, () => stopped);
  });
</script>

<div class="efc-high" data-active={active ? 'true' : 'false'}>
  <div class="stage">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={termEl}
      class={termClass}
      tabindex="0"
      role="application"
      aria-label="配置界面的可交互终端外观"
      onkeydown={onKeydown}
      onclick={onScreenClick}
      onpointerdown={() => {
        stopDemo();
        termEl?.focus({ preventScroll: true });
      }}
    >
      <div class="tbar">
        <div class="dots"><i></i><i></i><i></i></div>
        <div class="ttl">~/code/app — claude</div>
      </div>
      <div class="screen">
        {#if panel.closed}
          <div class="ln"><span class="dimtxt">&gt;</span> /config</div>
          <div class="ln" style="white-space: pre-wrap">
            <span class="dimtxt">  ⎿  </span>{panel.summary}
          </div>
          <div class="list"></div>
          <div class="ln" style="cursor: pointer">
            <span class="dimtxt">&gt;</span> <span class="caret"> </span><span class="faint">/config</span>
          </div>
          <div class="foot">按 Enter 再次运行建议的 /config。</div>
        {:else}
          <div class="ln tabs">
            <span class="fg-accent b">设置</span>{'  '}<span class="dimtxt">状态</span>{'  '}<span
              class="on">配置</span
            >{'  '}<span class="dimtxt">用量</span>{'  '}<span class="dimtxt">统计</span>
          </div>
          <div class="ln">
            {#if crumb === null}
              <span class="fg-focus">⌕</span> {panel.query}<span class="caret"> </span>
            {:else}
              {#each crumb as part, index (index)}
                {#if part.dim}<span class="dimtxt">{part.text}</span>{:else}<span class="b">{part.text}</span>{/if}
              {/each}
            {/if}
          </div>
          <div class="ln"> </div>
          <div class="list">
            {#if windowInfo.overflow}
              <div class="ln faint">
                {windowInfo.above > 0 ? `  ↑ 上方还有 ${windowInfo.above} 行` : ' '}
              </div>
            {/if}
            {#each windowInfo.entries as entry (entry.row.k)}
              {#if entry.row.type === 'sep'}
                <div class="ln"> </div>
              {:else}
                {@const row = entry.row}
                <div
                  class="efc-high-row{entry.selIdx === windowInfo.idx ? ' focus' : ''}{row.type ===
                  'setting' && row.s.managed
                    ? ' locked'
                    : ''}"
                  data-i={entry.selIdx}
                >
                  <span class="ptr">❯</span>
                  <span class={row.type === 'option' ? 'mk fg-focus' : 'mk'}>
                    {#if row.type === 'setting'}
                      {isChanged(row.s) ? '●' : ''}
                    {:else if row.type === 'group'}
                      {groupChanged(row.g) ? '●' : ''}
                    {:else if row.type === 'option'}
                      {row.o === panel.values[row.s.id] ? '●' : ''}
                    {/if}
                  </span>
                  <span class="lab">
                    {#if row.type === 'setting'}
                      {row.s.label}
                    {:else if row.type === 'group'}
                      {row.g.label}
                    {:else if row.type === 'changed'}
                      已修改的设置
                    {:else if row.type === 'file'}
                      打开 settings.json
                    {:else}
                      {row.o}
                    {/if}
                  </span>
                  <span
                    class={row.type === 'setting'
                      ? 'val' +
                        (row.s.type === 'bool' ? (panel.values[row.s.id] ? ' on' : ' off') : '') +
                        (row.s.managed ? ' dim' : '') +
                        (panel.pulse === row.s.id ? ' pulse' : '')
                      : row.type === 'option'
                        ? 'val' + (row.o === row.s.def ? ' dim' : '')
                        : 'val dim'}
                  >
                    {#if row.type === 'setting'}
                      {valueText(row.s)}
                    {:else if row.type === 'group' || row.type === 'file'}
                      ›
                    {:else if row.type === 'changed'}
                      {row.n}  ›
                    {:else}
                      {row.o === row.s.def ? '默认' : ''}
                    {/if}
                  </span>
                  <span class="tag">
                    {#if row.type === 'setting' && frame().screen === 'search'}
                      {HIGH_GROUP_MAP[row.s.g].label}
                    {/if}
                  </span>
                </div>
              {/if}
            {/each}
            {#if windowInfo.overflow}
              <div class="ln faint">
                {windowInfo.below > 0 ? `  ↓ 下方还有 ${windowInfo.below} 行` : ' '}
              </div>
            {/if}
          </div>
          <div class="foot">
            {#if footer.cls}<span class={footer.cls}>{footer.text}</span>{:else}{footer.text}{/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
