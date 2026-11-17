<script lang="ts">
  /**
   * Geist 终端主题演示。
   *
   * 一个终端窗口按 180ms 一行回放命令和输出，标题栏里可以单独切 Vercel Light / Dark，
   * 窗口下面是一张 16 色 ANSI 调色板，带色块、色值和对比度。
   *
   * 数据在 public/data/geist/foundations/terminal.json。demo 行里混进了页面导语和路径行，
   * 这里按内容重新归类（提示符 / 命令 / diff / warning / error / 测试通过 / 摘要），
   * 路径行已经在标题栏里，不再重复回放。
   */
  import { onMount } from 'svelte';

  import { loadGeistJson } from '../data';

  import '../base.css';
  import '../utilities.css';
  import './common.css';
  import './terminal.css';

  interface DemoLine {
    kind: string;
    text: string;
  }

  interface AnsiColor {
    name: string;
    normal: { hex: string; contrast: string; bg: string };
    bright: { hex: string; contrast: string; bg: string };
  }

  interface TerminalData {
    demo: DemoLine[];
    palette: AnsiColor[];
    background: string;
  }

  type Theme = 'light' | 'dark';
  type Status = 'loading' | 'ready' | 'error';
  type Tone =
    | 'arrow'
    | 'cmd'
    | 'del'
    | 'mod'
    | 'plain'
    | 'dim'
    | 'warning'
    | 'warnbold'
    | 'pass'
    | 'info'
    | 'file'
    | 'hl';

  interface Part {
    text: string;
    tone: Tone;
  }

  interface Row {
    key: string;
    gap: number;
    parts: Part[];
  }

  /** 调色板名字的中文类别，取自 _scratch/geist/zh/terminal.md 里的表。 */
  const ANSI_ZH: Record<string, string> = {
    BlackNeutral: '黑（中性）',
    RedFailure: '红（失败）',
    GreenSuccess: '绿（成功）',
    AmberWarning: '琥珀（警告）',
    BlueInformation: '蓝（信息）',
    PurpleAccent: '紫（强调）',
    'TealSecondary accent': '青绿（次要强调）',
    WhiteNeutral: '白（中性）',
  };

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // 目前没有配置项；在 effect 里读一下，既保留后续扩展的口子，也避开 state_referenced_locally 警告
  $effect(() => {
    void config;
  });

  let localTheme: Theme = $state('light');
  let windowTheme: Theme = $state('light');
  let status: Status = $state('loading');
  let data: TerminalData | null = $state(null);
  let rows: Row[] = $state([]);
  let visible = $state(0);
  let playing = $state(false);

  let timer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;
  let reducedMotion = false;

  const playLabel = $derived(playing ? '播放中' : visible >= rows.length && rows.length > 0 ? '重播' : '播放');

  onMount(() => {
    localTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    windowTheme = localTheme;
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void load();
    return () => {
      destroyed = true;
      stop();
    };
  });

  async function load(): Promise<void> {
    try {
      data = await loadGeistJson<TerminalData>('/data/geist/foundations/terminal.json');
      if (destroyed) return;
      rows = buildRows(data.demo);
      status = 'ready';
      play();
    } catch {
      if (!destroyed) status = 'error';
    }
  }

  /** 把 demo 行按内容重新归类，顺便去掉导语和路径行、给换组的地方加间距。 */
  function buildRows(demo: DemoLine[]): Row[] {
    const result: Row[] = [];
    let lastGroup = '';
    for (const line of demo) {
      const text = line.text.trim();
      if (!text) continue;
      // 第一行是页面导语，第二行是工作目录和分支，后者已经写进标题栏
      if (text.startsWith('Color themes for your terminal')) continue;
      if (text === '~/vercel/website main' || text === '~/vercel/website') continue;

      let parts: Part[];
      let group = 'plain';
      const arrow = text.match(/^▲\s*(.*)$/);
      const diff = text.match(/^([DM])\s+(.*)$/);

      if (arrow) {
        parts = [{ text: '▲ ', tone: 'arrow' }, { text: arrow[1], tone: 'cmd' }];
        group = 'command';
      } else if (diff) {
        parts = [
          { text: diff[1], tone: diff[1] === 'D' ? 'del' : 'mod' },
          { text: ` ${diff[2]}`, tone: 'cmd' },
        ];
        group = 'diff';
      } else if (/^[\w./-]+\.(?:jsx?|tsx?|css|md)$/.test(text)) {
        parts = [{ text, tone: 'file' }];
        group = 'file';
      } else if (text.startsWith('✔')) {
        const match = text.match(/^(✔\s*[^(]+?)(\s*\([^)]+\))?$/);
        parts = match
          ? [{ text: match[1], tone: 'pass' }, ...(match[2] ? [{ text: ' ' + match[2], tone: 'dim' as Tone }] : [])]
          : [{ text, tone: 'pass' }];
        group = 'test';
      } else if (text.startsWith('✖')) {
        parts = [{ text, tone: 'warnbold' }];
        group = 'test';
      } else if (text.startsWith('﹣')) {
        const match = text.match(/^(﹣.*?)(\s*#\s.*)$/);
        parts = match
          ? [{ text: match[1], tone: 'dim' }, { text: match[2], tone: 'hl' }]
          : [{ text, tone: 'dim' }];
        group = 'test';
      } else if (/^(tests|pass|skipped|duration_ms)\b/.test(text)) {
        parts = [{ text, tone: 'info' }];
        group = 'summary';
      } else if (/^\d+:\d+\s+warning\s+/.test(text)) {
        const match = text.match(/^(\S+)\s+(warning)\s+(.*?)(?:\s+(\S+))?$/);
        parts = match
          ? [
              { text: match[1], tone: 'dim' },
              { text: '  ', tone: 'plain' },
              { text: 'warning', tone: 'warning' },
              { text: `  ${match[3]}  `, tone: 'plain' },
              ...(match[4] ? [{ text: match[4], tone: 'dim' as Tone }] : []),
            ]
          : [{ text, tone: 'plain' }];
        group = 'lint';
      } else {
        parts = [{ text, tone: 'plain' }];
        group = 'plain';
      }

      // 不同小组之间留一点空隙，和原站的终端预览一致
      let gap = 0;
      if (result.length > 0 && group !== lastGroup) {
        if (group === 'command') gap = 12;
        else if (group === 'file' || group === 'lint') gap = 8;
        else if (group === 'test' || group === 'summary') gap = 12;
      }
      result.push({ key: `row-${result.length}`, gap, parts });
      lastGroup = group;
    }
    return result;
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    playing = false;
  }

  /** 从头播放；系统开了减少动态效果就一次性铺完。 */
  function play(): void {
    stop();
    visible = 0;
    if (rows.length === 0) return;
    if (reducedMotion) {
      visible = rows.length;
      return;
    }
    visible = 1;
    playing = true;
    timer = setInterval(() => {
      if (visible >= rows.length) {
        stop();
        return;
      }
      visible += 1;
      if (visible >= rows.length) stop();
    }, 180);
  }

  function setTheme(theme: Theme): void {
    localTheme = theme;
    windowTheme = theme;
  }

  /** 调色板里的颜色名是驼峰写法，拆成带空格的英文名。 */
  function ansiName(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
</script>

<div class="gf-root" data-theme={localTheme}>
  <div class="geist-demo snapshot-root">
    <div class="gf-toolbar">
      <div class="gf-toolbar-title">
        <span class="gf-toolbar-label">终端主题</span>
        <span class="gf-toolbar-zh">逐行回放命令与输出，窗口可单独切 Vercel 亮暗</span>
      </div>
      <div class="gf-toolbar-right">
        <button type="button" class="gf-btn gf-btn--primary" disabled={playing} onclick={play}>
          <svg class="gf-btn__icon" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 1.6v8.8L10.4 6z" fill="currentColor" />
          </svg>
          {playLabel}
        </button>
        <div class="gf-seg" role="group" aria-label="演示亮暗主题">
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'light'}
            onclick={() => setTheme('light')}>亮</button>
          <button
            type="button"
            class="gf-seg-btn"
            aria-pressed={localTheme === 'dark'}
            onclick={() => setTheme('dark')}>暗</button>
        </div>
      </div>
    </div>

    {#if status === 'loading'}
      <div class="gf-state"><span class="gf-spinner"></span>终端数据加载中</div>
    {:else if status === 'error'}
      <div class="gf-state gf-state--error">终端数据加载失败，请刷新后重试。</div>
    {:else if data}
      <div class="gf-terminal">
        <div class="gf-term-window" data-window-theme={windowTheme}>
          <div class="gf-term-bar">
            <span class="gf-term-dots" aria-hidden="true">
              <i class="gf-term-dot gf-term-dot--red"></i>
              <i class="gf-term-dot gf-term-dot--yellow"></i>
              <i class="gf-term-dot gf-term-dot--green"></i>
            </span>
            <span class="gf-term-title">~/vercel/website main</span>
            <div class="gf-seg gf-seg--small gf-term-theme" role="group" aria-label="终端窗口主题">
              <button
                type="button"
                class="gf-seg-btn"
                aria-pressed={windowTheme === 'light'}
                onclick={() => (windowTheme = 'light')}
              ><span class="gf-term-vlabel">Vercel </span>Light</button>
              <button
                type="button"
                class="gf-seg-btn"
                aria-pressed={windowTheme === 'dark'}
                onclick={() => (windowTheme = 'dark')}
              ><span class="gf-term-vlabel">Vercel </span>Dark</button>
            </div>
          </div>
          <div class="gf-term-body">
            <div class="gf-term-lines">
              {#each rows.slice(0, visible) as row, index (row.key)}
                <div class="gf-term-line" style:margin-top={index === 0 ? 0 : `${row.gap}px`}>
                  {#each row.parts as part (part.text + part.tone)}<span class="gf-term-{part.tone}">{part.text}</span>{/each}
                </div>
              {/each}
              {#if visible >= rows.length && rows.length > 0}
                <div class="gf-term-line gf-term-line--tail">
                  <span class="gf-term-arrow">▲ </span><span class="gf-term-cursor" aria-hidden="true"></span>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="gf-ansi">
          <div class="gf-ansi-head">
            <h3 class="gf-ansi-title">16 色 ANSI 调色板</h3>
            <span class="gf-ansi-note">Vercel Light 配色，对比度按 #FBFBFA 背景测得</span>
          </div>
          <div class="gf-ansi-table">
            <div class="gf-ansi-row gf-ansi-row--head" aria-hidden="true">
              <span class="gf-ansi-label">颜色</span>
              <span>普通</span>
              <span>亮色</span>
            </div>
            {#each data.palette as color (color.name)}
              <div class="gf-ansi-row">
                <span class="gf-ansi-label">
                  <span class="gf-ansi-name">{ansiName(color.name)}</span>
                  <span class="gf-ansi-zh">{ANSI_ZH[color.name] ?? ''}</span>
                </span>
                <span class="gf-ansi-cell">
                  <span
                    class="gf-ansi-swatch"
                    style:color={color.normal.hex}
                    style:background-color={color.normal.bg}>Aa</span>
                  <code class="gf-ansi-hex">{color.normal.hex}</code>
                  <span class="gf-ansi-contrast">{color.normal.contrast}</span>
                </span>
                <span class="gf-ansi-cell">
                  <span
                    class="gf-ansi-swatch"
                    style:color={color.bright.hex}
                    style:background-color={color.bright.bg}>Aa</span>
                  <code class="gf-ansi-hex">{color.bright.hex}</code>
                  <span class="gf-ansi-contrast">{color.bright.contrast}</span>
                </span>
              </div>
            {/each}
          </div>
        </div>

        <p class="gf-note gf-term-note">
          终端里的语义色沿用 Geist：报错用红，成功用绿，警告用琥珀，信息用蓝。深色主题用纯黑底配 #EDEDED 主文本。
        </p>
      </div>
    {/if}
  </div>
</div>
