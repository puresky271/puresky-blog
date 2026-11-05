<script lang="ts">
  /**
   * BiGym 2.0 项目页「Every program, every seed」一节的交互程序浏览器。
   *
   * 原站是一张 6 行 session × 9 列任务的矩阵，选一格读那次 session 交上来的 policy.py，
   * 右侧用 viser 3D 回放逐个隐藏种子播放。站内没有 3D 播放能力，右侧换成一台轨迹时间轴：
   * 按原站 trace 的 steps 映射和 sets 逐步推进，滚动高亮代码里的执行行，阶段沿用 segments 的分段。
   *
   * 矩阵格子，种子按钮，阶段按钮都是原生 button，键盘可达。类名尽量沿用原站
   * （line / on / cold / seed / rec / m-cell / trace-map），样式全在 explorer.css，
   * 选择器都挂在 .bm-explorer 下面。
   */
  import { onMount, tick } from 'svelte';

  import { withBase } from '@/lib/format';

  import {
    loadJson,
    loadText,
    programUrl,
    traceUrl,
    type ExplorerData,
    type ExplorerSession,
    type TasksData,
    type TraceStep,
  } from './bigym/data';
  import './bigym/base.css';
  import './bigym/explorer.css';

  /** 时间轴推进速度，单位是 trace 步每秒。 */
  const SPEED = 30;

  /** 默认打开原站选中的那一格：reach multi-modal 的 Opus 5.5 · session 3。 */
  const START_TASK = 'reach_target_multi_modal';
  const START_SESSION = 'opus-s3';

  // 这个组件不接受配置，声明出来只是为了和 mount.ts 的 AnimationProps 对齐
  let { config = {} }: { config?: Record<string, unknown> } = $props();
  // svelte-ignore state_referenced_locally
  void config;

  const KEYWORDS = new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
    'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
    'try', 'while', 'with', 'yield',
  ]);

  /* ---------- 语法着色 ---------- */

  function escapeHtml(text: string): string {
    return text.replace(/[&<>]/g, (character) => (
      character === '&' ? '&amp;' : character === '<' ? '&lt;' : '&gt;'
    ));
  }

  function token(kind: string, text: string): string {
    return `<span class="${kind}">${escapeHtml(text)}</span>`;
  }

  /**
   * 足够读懂的 Python 词法着色：注释，字符串（含跨行三引号），关键字，数字，函数调用名，self。
   * 不做语法分析，也就不需要第三方高亮器。返回逐行 HTML，渲染时用 {@html} 贴进 .line。
   */
  function highlightPython(source: string): string[] {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const result: string[] = [];
    let triple = '';
    for (const line of lines) {
      let html = '';
      let cursor = 0;
      while (cursor < line.length) {
        if (triple) {
          const close = line.indexOf(triple, cursor);
          const end = close < 0 ? line.length : close + 3;
          html += token('tk-str', line.slice(cursor, end));
          cursor = end;
          if (close >= 0) triple = '';
          continue;
        }
        const rest = line.slice(cursor);
        if (rest.startsWith('#')) {
          html += token('tk-com', rest);
          break;
        }
        const tripleOpen = /^("""|''')/.exec(rest);
        if (tripleOpen) {
          triple = tripleOpen[1];
          html += token('tk-str', tripleOpen[1]);
          cursor += 3;
          continue;
        }
        const quoted = /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.exec(rest);
        if (quoted) {
          html += token('tk-str', quoted[0]);
          cursor += quoted[0].length;
          continue;
        }
        const word = /^[A-Za-z_]\w*/.exec(rest);
        if (word) {
          const name = word[0];
          if (name === 'self') html += token('tk-self', name);
          else if (KEYWORDS.has(name)) html += token('tk-kw', name);
          else if (/^\s*\(/.test(rest.slice(name.length))) html += token('tk-fn', name);
          else html += escapeHtml(name);
          cursor += name.length;
          continue;
        }
        const number = /^\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?/.exec(rest);
        if (number) {
          html += token('tk-num', number[0]);
          cursor += number[0].length;
          continue;
        }
        html += escapeHtml(rest[0]);
        cursor += 1;
      }
      result.push(html);
    }
    return result;
  }

  /* ---------- 状态 ---------- */

  interface RowInfo {
    index: number;
    id: string;
    model: string;
    session: string;
    first: boolean;
  }

  type Segment = TraceStep['segments'][number];

  let data = $state<ExplorerData | null>(null);
  let error = $state('');
  /** 任务 id 到场景分组（reaching / tabletop / dishwasher / counter）的映射，拿来取格子底色。 */
  let sceneOfTask = $state<Record<string, string>>({});

  let taskIndex = $state(1);
  let sessionIndex = $state(2);
  let seedIndex = $state(0);

  let code = $state('');
  let codeLines = $state<string[]>([]);
  let codeLoading = $state(false);

  let trace = $state<TraceStep | null>(null);
  let traceLoading = $state(false);
  let step = $state(0);
  let playing = $state(false);
  let seenLines = $state<Set<number>>(new Set());

  let copyLabel = $state('复制');

  let codeEl = $state<HTMLDivElement | undefined>(undefined);
  let traceMapEl = $state<HTMLButtonElement | undefined>(undefined);
  let copyTimer = 0;
  let programToken = 0;
  let traceToken = 0;
  /** 上一个已经滚过去的阶段，避免新 trace 载入时把代码从顶部拽走。 */
  let scrolledPhase = -1;

  const task = $derived(data?.tasks[taskIndex] ?? null);
  const session = $derived(task?.sessions[sessionIndex] ?? null);
  const seed = $derived(session?.seeds[seedIndex] ?? 0);
  const stepsOfSeed = $derived(session?.steps[seedIndex] ?? 0);
  const success = $derived(session ? session.outcomes[seedIndex] === '1' : false);
  const solved = $derived(session ? [...session.outcomes].filter((value) => value === '1').length : 0);

  const rows = $derived.by(() => {
    const sessions = data?.tasks[0]?.sessions ?? [];
    const list: RowInfo[] = [];
    let lastModel = '';
    sessions.forEach((item, index) => {
      const [model = '', sessionText = ''] = item.label.split(' · ');
      list.push({
        index,
        id: item.id,
        model,
        session: sessionText.replace('session ', 's'),
        first: model !== lastModel,
      });
      lastModel = model;
    });
    return list;
  });

  /**
   * 当前高亮窗口：过去 window 步里执行过的行。
   * 原站 trace 的 sets 是去重后的行号集合，steps 把每一步映射到其中一个下标，
   * 所以要先 steps 再 sets，不能拿 sets[step] 直接取。
   */
  const highlight = $derived.by(() => {
    const active = trace;
    const lines = new Set<number>();
    if (!active) return lines;
    const first = Math.max(0, step - active.window + 1);
    for (let index = first; index <= step && index < active.steps.length; index += 1) {
      const setIndex = active.steps[index];
      for (const line of active.sets[setIndex] ?? []) lines.add(line);
    }
    return lines;
  });

  /** 整段 trace 里执行过的行，用来给没被用到的行加 cold。 */
  const executed = $derived.by(() => new Set(trace ? trace.sets.flat() : []));

  const phaseIndex = $derived.by(() => {
    const active = trace;
    if (!active) return -1;
    return active.segments.findIndex(([start, end]) => start <= step && step <= end);
  });

  const currentSegment = $derived<Segment | null>(
    trace && phaseIndex >= 0 ? trace.segments[phaseIndex] : null,
  );

  const phaseMethods = $derived(
    currentSegment && currentSegment[3].length > 0
      ? currentSegment[3].map((name) => `${name}()`).join(' · ')
      : '',
  );

  /* ---------- 取数据 ---------- */

  function sceneToken(taskId: string): string {
    return `var(--bm-scene-${sceneOfTask[taskId] ?? 'tabletop'})`;
  }

  function cellRate(item: ExplorerSession): number {
    return Math.round(item.rate * 100);
  }

  function cellAria(taskName: string, item: ExplorerSession): string {
    const [model = '', sessionText = ''] = item.label.split(' · ');
    const fullName = model === 'Opus 5.5' ? 'Claude Opus 5.5' : 'GPT-6 Astra';
    const vision = item.vision ? `, ${item.vision}` : '';
    return `${fullName}, ${sessionText}, ${taskName}: ${cellRate(item)}% of 100 hidden seeds${vision}`;
  }

  function phaseTitle(segment: Segment): string {
    const names = segment[3].length > 0
      ? segment[3].map((name) => `${name}()`).join(', ')
      : 'the main loop';
    return `Steps ${segment[0]}–${segment[1]}: ${names}`;
  }

  async function loadProgram(): Promise<void> {
    const currentTask = task;
    const currentSession = session;
    if (!currentTask || !currentSession) return;
    const token = ++programToken;
    codeLoading = true;
    let text = '';
    try {
      text = await loadText(programUrl(currentTask.id, currentSession.id));
    } catch {
      text = '';
    }
    if (token !== programToken) return;
    code = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    codeLines = highlightPython(code);
    codeLoading = false;
    await tick();
    if (token === programToken && codeEl) codeEl.scrollTop = 0;
  }

  async function loadTrace(): Promise<void> {
    const currentTask = task;
    const currentSession = session;
    const currentSeed = seed;
    const token = ++traceToken;
    trace = null;
    traceLoading = false;
    playing = false;
    step = 0;
    seenLines = new Set();
    if (!currentTask || !currentSession || !currentSession.recorded.includes(currentSeed)) return;
    traceLoading = true;
    try {
      const loaded = await loadJson<TraceStep>(
        traceUrl(currentTask.id, currentSession.id, currentSeed),
      );
      if (token !== traceToken) return;
      trace = loaded;
      step = 0;
      seenLines = new Set();
    } catch {
      if (token !== traceToken) return;
      trace = null;
    } finally {
      if (token === traceToken) traceLoading = false;
    }
  }

  /* ---------- 选择 ---------- */

  function selectCell(nextTask: number, nextSession: number): void {
    if (!data || (nextTask === taskIndex && nextSession === sessionIndex)) return;
    taskIndex = nextTask;
    sessionIndex = nextSession;
    const target = data.tasks[nextTask]?.sessions[nextSession];
    let nextSeed = 0;
    if (target) {
      const first = target.recorded[0] ?? target.seeds[0];
      const at = target.seeds.indexOf(first);
      if (at >= 0) nextSeed = at;
    }
    seedIndex = nextSeed;
    trace = null;
    step = 0;
    playing = false;
    seenLines = new Set();
    scrolledPhase = -1;
    void loadProgram();
    void loadTrace();
  }

  function selectSeed(index: number): void {
    if (index === seedIndex) return;
    seedIndex = index;
    scrolledPhase = -1;
    void loadTrace();
  }

  /* ---------- 时间轴 ---------- */

  function seekTo(target: number, andPlay: boolean): void {
    const active = trace;
    if (!active) return;
    const next = Math.max(0, Math.min(active.length - 1, Math.round(target)));
    step = next;
    if (andPlay && next < active.length - 1) playing = true;
    else if (!andPlay) playing = false;
  }

  function startPlayback(): void {
    const active = trace;
    if (!active || active.length < 2) return;
    if (step >= active.length - 1) step = 0;
    playing = true;
  }

  function togglePlay(): void {
    if (playing) playing = false;
    else startPlayback();
  }

  function restart(): void {
    const active = trace;
    if (!active || active.length < 2) return;
    step = 0;
    seenLines = new Set();
    playing = true;
  }

  function onRangeInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    playing = false;
    seekTo(Number(input.value), false);
  }

  function onPhaseClick(segment: Segment): void {
    seekTo(segment[0], true);
  }

  function scrollToLine(line: number): void {
    const scroller = codeEl;
    if (!scroller || line <= 0) return;
    const row = scroller.querySelector<HTMLElement>(`.line[data-line="${line}"]`);
    if (!row) return;
    const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      top: Math.max(0, top - scroller.clientHeight * 0.28),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  function onCodeClick(event: MouseEvent): void {
    const active = trace;
    const scroller = codeEl;
    if (!active || !scroller) return;
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>('.line');
    if (!row) return;
    if (window.getSelection()?.toString()) return;
    const line = Number(row.dataset.line);
    if (!Number.isFinite(line) || !executed.has(line)) return;
    for (let index = step + 1; index < active.length; index += 1) {
      const setIndex = active.steps[index];
      if (setIndex !== undefined && active.sets[setIndex]?.includes(line)) {
        seekTo(index, true);
        return;
      }
    }
  }

  function onTraceMapClick(event: MouseEvent): void {
    const scroller = codeEl;
    const map = traceMapEl;
    if (!scroller || !map) return;
    const bounds = map.getBoundingClientRect();
    if (bounds.height <= 0) return;
    const ratio = (event.clientY - bounds.top) / bounds.height;
    scroller.scrollTo({
      top: ratio * scroller.scrollHeight - scroller.clientHeight / 2,
      behavior: 'auto',
    });
  }

  async function copyProgram(): Promise<void> {
    window.clearTimeout(copyTimer);
    try {
      await navigator.clipboard.writeText(code);
      copyLabel = '已复制';
    } catch {
      copyLabel = '复制失败';
    }
    copyTimer = window.setTimeout(() => {
      copyLabel = '复制';
    }, 1600);
  }

  /* ---------- 效果 ---------- */

  // 代码行的点击用事件委托，挂在滚动区上。onclick 写模板里会触发 a11y 警告，这里手动挂。
  $effect(() => {
    const element = codeEl;
    if (!element) return;
    element.addEventListener('click', onCodeClick);
    return () => element.removeEventListener('click', onCodeClick);
  });

  // 播放：按 SPEED 推进，走到最后一步停住。
  $effect(() => {
    if (!playing) return;
    const total = trace?.length ?? 0;
    if (total < 2) {
      playing = false;
      return;
    }
    let frame = 0;
    let last = 0;
    const advance = (now: number): void => {
      if (!last) last = now;
      const count = Math.floor(((now - last) * SPEED) / 1000);
      if (count > 0) {
        last += (count * 1000) / SPEED;
        step = Math.min(total - 1, step + count);
        if (step >= total - 1) {
          playing = false;
          return;
        }
      }
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  });

  // 迷你 trace-map 只增不减：走过的高亮行都点亮，和原站一致。
  $effect(() => {
    if (!trace) return;
    let next: Set<number> | null = null;
    for (const line of highlight) {
      if (!seenLines.has(line)) {
        next ??= new Set(seenLines);
        next.add(line);
      }
    }
    if (next) seenLines = next;
  });

  // 换阶段时把代码滚到这一段对应的行，原站用 segments 的第三个数做这件事。
  $effect(() => {
    const index = phaseIndex;
    const segment = currentSegment;
    if (index < 0 || !segment) {
      scrolledPhase = -1;
      return;
    }
    if (index === scrolledPhase) return;
    const fresh = scrolledPhase < 0;
    scrolledPhase = index;
    if (!fresh) scrollToLine(segment[2]);
  });

  /* ---------- 挂载 ---------- */

  onMount(() => {
    let cancelled = false;
    Promise.all([
      loadJson<ExplorerData>('data/bigym2/explorer.json'),
      loadJson<TasksData>('data/bigym2/tasks.json').catch(() => null),
    ])
      .then(([explorer, taskData]) => {
        if (cancelled) return;
        data = explorer;
        if (taskData) {
          const map: Record<string, string> = {};
          for (const item of taskData.core) {
            map[item.name.replace(/\s+/g, '_')] = item.group;
          }
          sceneOfTask = map;
        }
        const startTask = Math.max(0, explorer.tasks.findIndex((item) => item.id === START_TASK));
        const startSession = Math.max(
          0,
          explorer.tasks[startTask].sessions.findIndex((item) => item.id === START_SESSION),
        );
        taskIndex = startTask;
        sessionIndex = startSession;
        const start = explorer.tasks[startTask].sessions[startSession];
        const first = start.recorded[0] ?? start.seeds[0];
        seedIndex = Math.max(0, start.seeds.indexOf(first));
        void loadProgram();
        void loadTrace();
      })
      .catch(() => {
        if (!cancelled) error = '程序浏览器加载失败，请刷新页面重试。';
      });
    return () => {
      cancelled = true;
      window.clearTimeout(copyTimer);
    };
  });
</script>

<div class="bm-demo bm-explorer">
  {#if error}
    <p class="bm-explorer-msg">{error}</p>
  {:else if !data || !task || !session}
    <p class="bm-explorer-msg">程序浏览器加载中。</p>
  {:else}
    <p class="lede">
      每个格子的数字是这一版程序在 100 个隐藏种子上的成功率，颜色越深越高。选一个格子读它的程序。
    </p>

    <!-- 横向滚动的表格区域，留 tabindex 是为了键盘能滚，不是交互元素 -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="matrix-scroll"
      tabindex="0"
      role="region"
      aria-label="每个 session 在 9 个任务上的成功率，可横向滚动"
    >
      <table class="matrix">
        <caption class="sr-only">
          每个 coding agent session 在 100 个隐藏种子上的成功率。选一个格子打开它的程序。
        </caption>
        <thead>
          <tr>
            <th scope="col" class="m-agent"><span class="kicker">Session</span></th>
            {#each data.tasks as item (item.id)}
              <th scope="col">{item.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class:first={row.first}>
              <th scope="row" class="m-agent">
                <span class="m-model">{row.model}</span>
                <span class="m-n">{row.session}</span>
              </th>
              {#each data.tasks as item, taskAt (item.id)}
                {@const cellSession = item.sessions[row.index]}
                <td>
                  <button
                    type="button"
                    class="m-cell"
                    data-task={item.id}
                    data-session={cellSession.id}
                    style={`--v:${cellRate(cellSession)};--hl:${sceneToken(item.id)}`}
                    aria-pressed={taskAt === taskIndex && row.index === sessionIndex}
                    aria-label={cellAria(item.name, cellSession)}
                    onclick={() => selectCell(taskAt, row.index)}
                    title={`${cellSession.label} · ${item.name}
${cellRate(cellSession)}/100 hidden seeds · ${cellSession.lines} lines · ${cellSession.vision}`}
                  >
                    {cellRate(cellSession)}
                  </button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="picked">
      <b>{task.name}</b> · {session.label}
    </p>

    <div class="body">
      <figure class="code-panel">
        <figcaption class="bm-code-head">
          <span class="bm-file">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M5 2.25h4.6L13 5.65v8.1H5z M9.6 2.25V5.65H13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.15"
                stroke-linejoin="round"
              />
              <path d="M7 8.6 5.8 9.8 7 11" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m9.4 8.6 1.2 1.2-1.2 1.2" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            policy.py
          </span>
          <span class="bm-meta">{session.lines} lines · {session.vision}</span>
          <a
            class="bm-raw"
            href={withBase(programUrl(task.id, session.id))}
            target="_blank"
            rel="noopener"
            aria-label="以纯文本打开完整程序"
          >Raw</a>
          <button
            type="button"
            class="bm-copy"
            aria-label="复制 policy.py"
            onclick={copyProgram}
          >
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <rect x="5.5" y="5.5" width="7" height="8.5" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.15" />
              <path d="M10.5 5.5V3.9c0-.9-.6-1.4-1.4-1.4H4.4C3.6 2.5 3 3 3 3.9v6.4c0 .9.6 1.4 1.4 1.4h1.1" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" />
            </svg>
            <span>{copyLabel}</span>
          </button>
        </figcaption>

        <div class="code-wrap">
          <!-- 代码滚动区同样留 tabindex 方便键盘滚动，点击由 onMount 之后的监听器处理 -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="code"
            class:loading={codeLoading}
            class:traced={!!trace}
            bind:this={codeEl}
            tabindex="0"
            aria-label="提交的 policy.py 源码"
          >
            <pre><code>{#each codeLines as html, index (index)}<span
                  class="line"
                  data-line={index + 1}
                  class:on={!!trace && highlight.has(index + 1)}
                  class:cold={!!trace && !executed.has(index + 1)}
                >{@html html}</span>{/each}</code></pre>
          </div>
          {#if trace && codeLines.length > 0}
            <button
              type="button"
              class="trace-map"
              style={`--n:${codeLines.length}`}
              bind:this={traceMapEl}
              tabindex="-1"
              aria-label="按比例滚动代码"
              onclick={onTraceMapClick}
            >
              {#each codeLines as _, index (index)}
                <i class:on={seenLines.has(index + 1)}></i>
              {/each}
            </button>
          {/if}
        </div>
      </figure>

      <div class="side">
        <div class="player">
          <div class="rollout-meta">
            <span class="seed-num">Seed {seed}</span>
            <span class="outcome" class:ok={success} class:fail={!success}>{success ? 'Success' : 'Failure'}</span>
            <span class="step-num">{stepsOfSeed.toLocaleString('en-US')} steps</span>
          </div>

          {#if trace}
            <div class="timeline">
              <p class="tl-phase">
                {#if phaseMethods}
                  <span class="tl-methods">{phaseMethods}</span>
                {:else}
                  <span class="tl-methods">主循环</span>
                {/if}
              </p>
              <div class="tl-controls">
                <button
                  type="button"
                  class="play"
                  aria-label={playing ? '暂停' : '播放'}
                  aria-pressed={playing}
                  onclick={togglePlay}
                >
                  {#if playing}
                    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                      <rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" />
                      <rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" />
                    </svg>
                  {:else}
                    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                      <path d="M5 3.2v9.6L13 8z" fill="currentColor" />
                    </svg>
                  {/if}
                </button>
                <button type="button" class="restart" aria-label="重来" onclick={restart}>
                  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                    <path d="M3.4 6.2A5.2 5.2 0 1 1 3 9.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M3.1 3.2v3.2h3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
              <div class="tl-progress">
                <input
                  class="tl-range"
                  type="range"
                  min="0"
                  max={trace.length - 1}
                  step="1"
                  value={step}
                  style={`--p:${(step / Math.max(1, trace.length - 1)) * 100}%`}
                  aria-label="轨迹进度"
                  aria-valuetext={`${step + 1} / ${trace.length}`}
                  onpointerdown={() => { playing = false; }}
                  oninput={onRangeInput}
                />
                <span class="tl-count">{(step + 1).toLocaleString('en-US')} / {trace.length.toLocaleString('en-US')}</span>
              </div>
              <p class="tl-hint">拖动进度条，或点左侧代码里的某一行。</p>
            </div>
          {:else if traceLoading}
            <div class="timeline-empty">
              <p>正在读取轨迹。</p>
            </div>
          {:else}
            <div class="no-rec">
              <p class="no-rec-main">这枚种子没有录制回放。</p>
              <p class="no-rec-sub">原站用 3D 回放，站内不提供。</p>
            </div>
          {/if}
        </div>

        <div class="under">
          <div class="phases" role="group" aria-label="按执行到的代码切开的阶段" hidden={!trace}>
            {#each trace?.segments ?? [] as segment, index (index)}
              <button
                type="button"
                class="ph"
                data-seg={index}
                aria-pressed={index === phaseIndex}
                style={`left:${(segment[0] / trace!.length) * 100}%;width:${((segment[1] - segment[0] + 1) / trace!.length) * 100}%`}
                title={phaseTitle(segment)}
                aria-label={`从第 ${segment[0]} 步播放：${segment[3].length > 0 ? segment[3].map((name) => `${name}()`).join(', ') : 'the main loop'}`}
                onclick={() => onPhaseClick(segment)}
              ></button>
            {/each}
            {#if trace}
              <span class="ph-track" aria-hidden="true">
                <span class="ph-head" style={`transform:translateX(${(step / trace.length) * 100}%)`}><i></i></span>
              </span>
            {/if}
          </div>
          <code class="ph-methods" hidden={!trace}>{phaseMethods}</code>
        </div>

        <div class="tally">
          <div class="score">
            <span class="score-num">{solved}</span>
            <span class="score-of">/ {session.seeds.length} hidden seeds solved</span>
          </div>
          <div class="seedgrid" role="group" aria-label="每个隐藏种子的结果">
            {#each session.seeds as value, index (value)}
              {@const ok = session.outcomes[index] === '1'}
              {@const rec = session.recorded.includes(value)}
              <button
                type="button"
                class="seed"
                class:ok
                class:fail={!ok}
                class:rec
                data-seed={value}
                aria-pressed={index === seedIndex}
                aria-label={`Seed ${value}：${ok ? '成功' : '失败'}${rec ? '，有回放' : ''}`}
                onclick={() => selectSeed(index)}
              ></button>
            {/each}
          </div>
          <p class="legend">
            <span><i class="sw ok"></i>成功</span>
            <span><i class="sw fail"></i>失败</span>
            <span><i class="sw rec"></i>有回放</span>
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
