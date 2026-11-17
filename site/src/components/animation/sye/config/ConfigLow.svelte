<script lang="ts">
  /**
   * 低档 effort 的 /config 重设计（原站 chunks/0yesba79f8ukb.js）。
   *
   * 一屏草图：六个标签页、一组设置项、一个搜索框。键盘上下移、Enter 或空格改值、
   * 左右切标签页、Esc 关掉 /config。打字就是搜索，Esc 先清搜索再关闭。
   * 中文标签比英文短，纵向对齐靠 flex 两端对齐保持。
   */

  import { LOW_TABS, type LowSetting } from './low';

  interface Row {
    setting: LowSetting;
    tabIndex: number;
    settingIndex: number;
    tabName: string;
  }

  /** 所有设置平铺一份，搜索时跨标签页匹配。 */
  const rows: Row[] = LOW_TABS.flatMap((tab, tabIndex) =>
    tab.settings.map((setting, settingIndex) => ({
      setting,
      tabIndex,
      settingIndex,
      tabName: tab.name,
    })),
  );

  function initialValues(): (boolean | number)[][] {
    return LOW_TABS.map((tab) =>
      tab.settings.map((setting) => (setting.kind === 'bool' ? (setting.value ?? false) : 0)),
    );
  }

  const defaults = initialValues();
  let values = $state<(boolean | number)[][]>(initialValues());
  let tab = $state(0);
  let cur = $state(0);
  let query = $state('');
  let closed = $state(false);

  let termEl = $state<HTMLDivElement>();

  const list = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.filter((row) => row.tabIndex === tab);
    return rows.filter((row) => `${row.setting.label} ${row.setting.desc}`.toLowerCase().includes(q));
  });

  const changedCount = $derived.by(() => {
    let count = 0;
    for (let t = 0; t < values.length; t++) {
      for (let i = 0; i < values[t].length; i++) {
        if (values[t][i] !== defaults[t][i]) count += 1;
      }
    }
    return count;
  });

  const helpText = $derived(list[cur]?.setting.desc ?? '');

  // 列表变短时把光标夹回范围（原站也是在渲染前做这一步）
  $effect(() => {
    const total = list.length;
    if (total === 0) {
      cur = 0;
    } else if (cur >= total) {
      cur = total - 1;
    }
  });

  function valueText(setting: LowSetting, tabIndex: number, settingIndex: number): string {
    const value = values[tabIndex][settingIndex];
    if (setting.kind === 'bool') return value ? '开' : '关';
    return setting.options?.[value as number] ?? '';
  }

  function toggleCurrent(): void {
    const row = list[cur];
    if (!row) return;
    const { setting, tabIndex, settingIndex } = row;
    const value = values[tabIndex][settingIndex];
    if (setting.kind === 'bool') {
      values[tabIndex][settingIndex] = !value;
      return;
    }
    const total = setting.options?.length ?? 1;
    values[tabIndex][settingIndex] = ((value as number) + 1) % total;
  }

  function switchTab(step: number): void {
    tab = (tab + step + LOW_TABS.length) % LOW_TABS.length;
    cur = 0;
  }

  /** 返回 true 表示这个键被消费了。原站的键盘处理也是这套顺序。 */
  function handleKey(event: KeyboardEvent): boolean {
    if (event.metaKey || event.ctrlKey || event.altKey) return false;

    if (closed) {
      if (event.key !== 'Enter') return false;
      closed = false;
      return true;
    }

    const total = Math.max(list.length, 1);
    switch (event.key) {
      case 'ArrowDown':
        cur = (cur + 1) % total;
        return true;
      case 'ArrowUp':
        cur = (cur - 1 + total) % total;
        return true;
      case 'ArrowRight':
        if (query) return false;
        switchTab(1);
        return true;
      case 'ArrowLeft':
        if (query) return false;
        switchTab(-1);
        return true;
      case 'Enter':
      case ' ':
        if (event.key === ' ' && query) return false;
        toggleCurrent();
        return true;
      case 'Escape':
        if (query) {
          query = '';
          cur = 0;
        } else {
          closed = true;
        }
        return true;
      case 'Backspace':
        query = query.slice(0, -1);
        cur = 0;
        return true;
      default:
        if (event.key.length !== 1) return false;
        query += event.key;
        cur = 0;
        return true;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!handleKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  /** 点哪一行就选中并改值，点标签页就切过去（原站同款）。 */
  function onTermClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (closed) {
      closed = false;
      return;
    }

    const tabEl = target.closest<HTMLElement>('[data-tab]');
    if (tabEl) {
      query = '';
      tab = Number(tabEl.dataset.tab ?? 0);
      cur = 0;
      return;
    }

    const itemEl = target.closest<HTMLElement>('.item');
    if (!itemEl) return;
    const index = Number(itemEl.dataset.i ?? 0);
    if (index === cur) toggleCurrent();
    cur = index;
  }
</script>

<div class="efc-low">
  <div class="stage">
    <!-- 终端整屏是一个可聚焦的区域，键盘和点击都由它统一接管 -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={termEl}
      class="term"
      tabindex="0"
      role="application"
      aria-label="可交互的配置菜单草图"
      onkeydown={onKeydown}
      onpointerdown={() => termEl?.focus({ preventScroll: true })}
      onclick={onTermClick}
    >
      {#if closed}
        <div class="efc-low-row dim">
          {'> '}<span class="acc">/config</span> 按 Enter 重新打开
        </div>
      {:else}
        <div class="efc-low-row"><span class="acc b">设置</span></div>
        <div class="efc-low-row tabs">
          {#each LOW_TABS as item, index (item.name)}
            {#if index > 0}{' '}{/if}
            <span class={query || index !== tab ? 'dim' : 'on'} data-tab={index}>
              {' '}{item.name}{' '}
            </span>
          {/each}
        </div>
        <div class="efc-low-row">
          {#if query}
            <span class="acc">⌕</span>
            {' '}{query}<span class="acc">▏</span>
          {:else}
            <span class="dim">⌕ 输入以搜索</span>
          {/if}
        </div>
        <div class="efc-low-row"> </div>
        {#if list.length === 0}
          <div class="efc-low-row dim"> 没有匹配的设置。</div>
        {/if}
        {#each list as row, index (`${row.tabIndex}/${row.setting.label}`)}
          <div
            class="item{index === cur ? ' cur' : ''}{values[row.tabIndex][row.settingIndex] !==
            defaults[row.tabIndex][row.settingIndex]
              ? ' changed'
              : ''}"
            data-i={index}
          >
            <span>
              <span class={index === cur ? 'acc' : 'dim'}>{index === cur ? '›' : ' '}</span>
              {' '}<span class="lbl">{row.setting.label}</span>
              {#if query}{'  '}<span class="dim">{row.tabName}</span>{/if}
            </span>
            <span class={row.setting.kind === 'bool' && values[row.tabIndex][row.settingIndex] ? 'ok' : ''}>
              {valueText(row.setting, row.tabIndex, row.settingIndex)}
            </span>
          </div>
        {/each}
        <div class="help">{helpText}</div>
        <div class="efc-low-row dim">
          {#if changedCount > 0}
            <span class="acc">•</span> {changedCount} 项已修改
          {:else}
            全部为默认
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
