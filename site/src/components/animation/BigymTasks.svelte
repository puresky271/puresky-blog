<script lang="ts">
  /**
   * BiGym 2.0 任务盘：复刻原站 #board 里「Success by task」那一块。
   *
   * 两个部分：
   * 1. 左边是逐任务成功率表，每个场景一组表头，格子底色按成功率深浅。
   * 2. 右边（窄屏时在下面）是任务圆环，20 个扇形各贴一张任务缩略图，指着某个扇形，
   *    圆环中央的透镜里播它的真人演示；按住不放会加速到 2 到 5 倍。
   *
   * 几何全部按原站 SVG 的数值生成：外半径 304、内半径 206、扇形间隙 1.37 度、
   * 缩略图 200 见方、圆心到缩略图中心 255、外圈场景弧半径 316。
   */

  import { onMount } from 'svelte';

  import { loadJson, mediaUrl, styleValue, type BmTask, type TableData, type TableRow, type TasksData, type ViewId } from './bigym/data';
  import './bigym/base.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();
  $effect(() => { void config; });

  import './bigym/tasks.css';

  const CX = 350;
  const CY = 350;
  const R_OUT = 304;
  const R_IN = 206;
  const PAD = 1.37;
  const IMG_R = 255;
  const IMG_SIZE = 200;

  const SCENES: Record<string, { label: string; color: string }> = {
    reaching: { label: 'Reaching', color: 'reaching' },
    tabletop: { label: 'Table-top', color: 'tabletop' },
    dishwasher: { label: 'Dishwasher', color: 'dishwasher' },
    counter: { label: 'Kitchen counter', color: 'counter' },
  };

  const HUB_LABEL: Record<ViewId, string> = {
    all: 'household tasks',
    core: 'core tasks',
    ext: 'extended tasks',
  };

  const uid = `bm-${Math.random().toString(36).slice(2, 8)}`;

  let tasks = $state<TasksData | null>(null);
  let tables = $state<TableData | null>(null);
  let view = $state<ViewId>('core');
  let error = $state('');
  let active = $state(-1);
  let playing = $state(false);
  let caption = $state<BmTask | null>(null);
  let hint = $state(false);
  let rate = $state(0);
  let video = $state<HTMLVideoElement | null>(null);

  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let hintShown = false;
  let sped = false;
  let reduced = false;

  onMount(async () => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      const [taskData, tableData] = await Promise.all([
        loadJson<TasksData>('data/bigym2/tasks.json'),
        loadJson<TableData>('data/bigym2/table-tasks.json'),
      ]);
      tasks = taskData;
      tables = tableData;
    } catch {
      error = '任务盘加载失败，请刷新页面重试。';
    }
  });

  const list = $derived(tasks ? tasks[view] : []);
  const table = $derived(tables ? tables[view] : null);
  const pitch = $derived(list.length ? 360 / list.length : 0);

  /** 极坐标 → SVG 坐标，角度从正上方顺时针算。 */
  function point(radius: number, degrees: number): [number, number] {
    const radians = ((degrees - 90) * Math.PI) / 180;
    return [CX + radius * Math.cos(radians), CY + radius * Math.sin(radians)];
  }

  function wedge(index: number): string {
    const start = index * pitch + PAD / 2;
    const end = (index + 1) * pitch - PAD / 2;
    const [x1, y1] = point(R_OUT, start);
    const [x2, y2] = point(R_OUT, end);
    const [x3, y3] = point(R_IN, end);
    const [x4, y4] = point(R_IN, start);
    const large = end - start > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${R_OUT} ${R_OUT} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
      + `L${x3.toFixed(2)} ${y3.toFixed(2)}A${R_IN} ${R_IN} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
  }

  /** 场景弧：从这一组第一个扇形到最后一个扇形，两端各收一点，和原站一致。 */
  function rim(group: { start: number; end: number }, radius = 316): string {
    const [x1, y1] = point(radius, group.start + 0.46);
    const [x2, y2] = point(radius, group.end - 0.43);
    const large = group.end - group.start > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  /** 场景分组：按任务顺序切成连续的组，每组带首尾角度和弧中点，用来排场景标签。 */
  const groups = $derived.by(() => {
    const result: { key: string; count: number; start: number; end: number; mid: number }[] = [];
    list.forEach((task, index) => {
      const last = result[result.length - 1];
      if (last && last.key === task.group) {
        last.count += 1;
        last.end = (index + 1) * pitch - PAD / 2;
      } else {
        result.push({ key: task.group, count: 1, start: index * pitch + PAD / 2, end: (index + 1) * pitch - PAD / 2, mid: 0 });
      }
    });
    for (const group of result) {
      group.mid = (group.start + group.end) / 2;
    }
    return result;
  });

  function thumbUrl(task: BmTask): string {
    return mediaUrl(`tasks/${task.name.replace(/ /g, '_')}.jpg`);
  }

  function demoUrl(task: BmTask): string {
    return mediaUrl(`demos/${task.video.split('/').pop() ?? ''}`);
  }

  function posterUrl(task: BmTask): string {
    return mediaUrl(`demos/${task.poster.split('/').pop() ?? ''}`);
  }

  function sceneColor(style: string | undefined): string {
    return styleValue(style, '--sc').replace(/var\(--scene-/g, 'var(--bm-scene-');
  }

  function sceneOf(name: string): string {
    return SCENES[name]?.color ?? 'reaching';
  }

  /** 扇形索引 → 这张缩略图在 SVG 里的位置（200 见方，中心在扇形中线的 255 半径处）。 */
  function imageAt(index: number): { x: number; y: number } {
    const middle = index * pitch + pitch / 2;
    const [x, y] = point(IMG_R, middle);
    return { x: x - IMG_SIZE / 2, y: y - IMG_SIZE / 2 };
  }

  function play(index: number) {
    const task = list[index];
    const element = video;
    if (!task || !element) return;
    active = index;
    caption = task;
    playing = true;
    if (!hintShown) {
      hintShown = true;
      hint = true;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint = false; }, 1300);
    }
    element.poster = posterUrl(task);
    const source = demoUrl(task);
    if (!element.currentSrc.endsWith(source)) element.src = source;
    if (!reduced) element.play().catch(() => {});
  }

  function stop() {
    active = -1;
    playing = false;
    caption = null;
    rate = 0;
    sped = false;
    clearTimeout(holdTimer);
    video?.pause();
  }

  function speedUp(index: number) {
    const task = list[index];
    const element = video;
    if (!task || !element) return;
    play(index);
    const apply = () => {
      const duration = element.duration || 10;
      const speed = Math.min(4, Math.max(2, duration / 5));
      element.currentTime = 0;
      element.playbackRate = speed;
      rate = Number(speed.toFixed(1));
      sped = true;
      if (!reduced) element.play().catch(() => {});
    };
    if (element.readyState >= 1) apply();
    else element.addEventListener('loadedmetadata', apply, { once: true });
  }

  function slowDown() {
    clearTimeout(holdTimer);
    if (!sped) return;
    sped = false;
    rate = 0;
    if (video) video.playbackRate = 1;
  }

  function hold(index: number) {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => speedUp(index), 250);
  }

  /** 表格第一列原站写成「π0.5 · VLA」，方法名之外那半截用浅色小字，这里拆开。 */
  function labelOf(row: TableRow): string {
    if (!row.kind) return row.label;
    const suffix = ` · ${row.kind}`;
    return row.label.endsWith(suffix) ? row.label.slice(0, -suffix.length) : row.label;
  }

  /** 表格里 --p 是原站算好的百分比，直接拿来当混色比例。 */
  function percentOf(style: string | undefined): string {
    return styleValue(style, '--p') || '0%';
  }

  function switchTo(id: ViewId) {
    stop();
    view = id;
  }
</script>

<div class="bm-demo bm-tasks">
  {#if error}
    <p class="bm-error">{error}</p>
  {:else if !tasks || !tables || !table}
    <p class="bm-loading">任务盘加载中。</p>
  {:else}
    <div class="bm-tasks-head">
      <div class="bm-seg" role="group" aria-label="Task set">
        {#each (['all', 'core', 'ext'] as ViewId[]) as id (id)}
          <button type="button" aria-pressed={view === id} onclick={() => switchTo(id)}>
            {id === 'all' ? '20 tasks' : id === 'core' ? '9 core' : '11 extended'}
          </button>
        {/each}
      </div>
    </div>

    <div class="bm-ptrow">
      <div class="bm-scroll bm-pt-scroll">
        <table class="bm-pt">
          <thead>
            <tr class="bm-sc">
              <th scope="col"></th>
              {#each groups as group (group.key)}
                <th colspan={group.count} style={`--sc:var(--bm-scene-${sceneOf(group.key)})`}>
                  <span>{SCENES[group.key]?.label ?? group.key}</span>
                </th>
              {/each}
              <th scope="col"></th>
            </tr>
            <tr class="bm-tk">
              <th scope="col"></th>
              {#each table.tasks as task (task.name)}
                <th scope="col" title={task.instruction}><span>{task.name}</span></th>
              {/each}
              <th scope="col" class="bm-mean">mean</th>
            </tr>
          </thead>
          <tbody>
            {#each table.rows as row (row.label)}
              <tr>
                <th scope="row" class="bm-lp">{labelOf(row)}{#if row.kind}<small> · {row.kind}</small>{/if}</th>
                {#each row.cells as cell (cell.title)}
                  <td class:bm-hi={cell.hi} style={`--p:${percentOf(cell.p)}`} title={cell.title}>{cell.v}</td>
                {/each}
                <td class="bm-mean">{row.mean}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <figure class="bm-dialfig" class:bm-playing={playing}>
        <div class="bm-dial">
          <!-- 场景弧要在 defs 里先定义 path，标签用 textPath 挂在上面 -->
          <svg viewBox="0 0 700 700" role="group" aria-label={`The ${list.length} tasks, by scene`}>
            <defs>
              {#each list as task, index (task.name)}
                <clipPath id={`${uid}-clip-${index}`}>
                  <path d={wedge(index)} />
                </clipPath>
              {/each}
              {#each groups as group (group.key)}
                <path id={`${uid}-rim-${group.key}`} d={rim(group)} />
                <path id={`${uid}-label-${group.key}`} d={rim(group, 333)} />
              {/each}
            </defs>

            {#each list as task, index (task.name)}
              <g
                class="bm-slice"
                class:bm-on={active === index}
                tabindex="0"
                role="button"
                aria-label={`${task.name}: ${task.instruction}`}
                onpointerenter={() => play(index)}
                onpointerdown={() => hold(index)}
                onpointerup={() => slowDown()}
                onpointercancel={() => slowDown()}
                onpointerleave={() => slowDown()}
                onfocus={() => play(index)}
                onblur={() => stop()}
                onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); speedUp(index); } }}
                oncontextmenu={(event) => event.preventDefault()}
              >
                <image
                  href={thumbUrl(task)}
                  x={imageAt(index).x}
                  y={imageAt(index).y}
                  width={IMG_SIZE}
                  height={IMG_SIZE}
                  preserveAspectRatio="xMidYMid slice"
                  clip-path={`url(#${uid}-clip-${index})`}
                />
                <path class="bm-edge" d={wedge(index)} />
              </g>
            {/each}

            {#each groups as group (group.key)}
              <path class="bm-rim" style={`--sc:var(--bm-scene-${sceneOf(group.key)})`} d={rim(group)} />
              <text
                class="bm-rl"
                style={`--sc:var(--bm-scene-${sceneOf(group.key)})`}
                dy={Math.cos((group.mid * Math.PI) / 180) > 0 ? -2 : 14}
              >
                <textPath href={`#${uid}-label-${group.key}`} startOffset="50%" text-anchor="middle">
                  {SCENES[group.key]?.label ?? group.key} · {group.count}
                </textPath>
              </text>
            {/each}

            <circle class="bm-hub" cx={CX} cy={CY} r={R_IN - 8} />
            <text class="bm-hubn" x={CX} y={CY + 12} text-anchor="middle">{list.length}</text>
            <text class="bm-hubl" x={CX} y={CY + 52} text-anchor="middle">{HUB_LABEL[view]}</text>
          </svg>

          <div class="bm-lens">
            <video
              class="bm-demo-video"
              bind:this={video}
              muted
              loop
              playsinline
              preload="none"
              aria-hidden="true"
            ></video>
          </div>
          <span class="bm-hint" class:bm-on={hint}>按住加速</span>
        </div>

        <figcaption class="bm-dial-cap">
          {#if caption}
            <span class="bm-sc" style={`--sc:var(--bm-scene-${caption.group})`}>{caption.scene}</span>
            <b>{caption.name}</b>
            {caption.instruction}
            {#if rate}<span class="bm-rate">×{rate.toFixed(1)}</span>{/if}
          {:else}
            指到一个任务上，看它的演示。
          {/if}
        </figcaption>
      </figure>
    </div>
  {/if}
</div>
