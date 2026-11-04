<script lang="ts">
  /**
   * 开篇三格 teaser：READ / FIX / IMPROVE。
   *
   * 原站是个手写 JS 脚本（_scratch/weight-space/teaser.js）：第一格把实验 1 里 Breakout 的
   * 12 行权重填进一块向上滚动的墙，第二格把自带 SMIL 动画的小车 SVG 内联进 DOM，第三格
   * 在第一次进入视野后把柱子从 7.9% 长到 48.1%。这里按同样的行为重做成 Svelte。
   */
  import { onMount } from 'svelte';
  import { assetUrl, esc, loadJson } from './ws/data';
  import './ws/teaser.css';

  interface WeightBlock {
    label: string;
    values: string[];
    marks: number[];
  }

  interface TraceItem {
    label: string;
    prompt: (string | WeightBlock)[];
    gif?: string;
  }

  interface TraceData {
    items: TraceItem[];
  }

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  // 开篇三格没有配置项。在 effect 里读一次，既让挂载层传进来的 config 有响应式身份，
  // 又不会触发「只取了初始值」的编译警告。
  $effect(() => {
    void config;
  });

  /* 第三格的刻度：满格按 62% 算（原站 data-max="62"），所以 7.9% 只有 12.7% 的高度 */
  const BAR = { from: 7.9, to: 48.1, max: 62, delay: 500, duration: 1600 };

  let root: HTMLDivElement;
  let carHost: HTMLDivElement;

  let rows = $state<WeightBlock[]>([]);
  let gif = $state('');
  let barHeight = $state(`${(BAR.from / BAR.max) * 100}%`);
  let barLabel = $state(`${BAR.from.toFixed(1)}%`);

  /* 权重行：`W1 row 3: input (0,0), channel 3` 只取冒号前那截当行名，命中的数字包成 mark */
  const rowsHtml = $derived(
    rows
      .map(
        (row) =>
          `<div class="tz-row"><span class="tz-rl">${esc(row.label.split(':')[0])}</span> ${row.values
            .map((value, index) => (row.marks.includes(index) ? `<mark>${esc(value)}</mark>` : esc(value)))
            .join(' ')}</div>`,
      )
      .join(''),
  );

  onMount(() => {
    let disposed = false;
    let frame = 0;
    let timer = 0;

    /* 第一格：Breakout 的权重墙。行复制两份，位移 -50% 时正好接上 */
    loadJson<TraceData>('/data/weight-space/traces/exp1_games.json')
      .then((data) => {
        if (disposed) return;
        const item = data.items.find((x) => x.label === 'Breakout') ?? data.items[0];
        rows = item.prompt.filter(
          (block): block is WeightBlock => typeof block === 'object' && Array.isArray(block.values),
        );
        if (item.gif) gif = assetUrl(item.gif);
      })
      .catch(() => {});

    /*
     * 第二格：小车的整段轨迹是 SVG 里的 SMIL 动画。放进 <img> 里 Chromium 不会跑，
     * 所以取回文本、DOMParser 解析后把 <svg> 内联进 DOM，动画才会动。
     */
    fetch(assetUrl('carjump_scene.svg'))
      .then((response) =>
        response.ok ? response.text() : Promise.reject(new Error(`carjump_scene.svg: ${response.status}`)),
      )
      .then((text) => {
        if (disposed || !carHost) return;
        const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = parsed.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg') return;
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('role', 'img');
        svg.setAttribute(
          'aria-label',
          '小车场景：Astra 改过的车先倒车、再冲上坡、越过红色条带落进蓝色方块，原策略的车停在坡上',
        );
        carHost.replaceChildren(document.importNode(svg, true));
      })
      .catch(() => {});

    /* 第三格：柱子和数字一起长，ease-out cubic，1.6 秒 */
    const grow = () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reduce ? 0 : BAR.duration;
      const startedAt = performance.now();
      const step = (now: number) => {
        const k = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
        const eased = 1 - (1 - k) ** 3;
        const value = BAR.from + (BAR.to - BAR.from) * eased;
        barHeight = `${(value / BAR.max) * 100}%`;
        barLabel = `${value.toFixed(1)}%`;
        if (k < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries, self) => {
        if (!entries[0]?.isIntersecting) return;
        self.disconnect();
        timer = window.setTimeout(grow, BAR.delay);
      },
      { threshold: 0.4 },
    );
    if (root) observer.observe(root);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  });
</script>

<div class="ws-demo teaser" bind:this={root}>
  <!-- 第一格：从权重里读出答案 -->
  <section class="tz-panel" aria-label="读：从权重里读出模型在玩哪个游戏">
    <div class="tz-step">Read</div>
    <div class="tz-task">Which game was this neural network trained on?</div>
    <div class="tz-vis tz-wall">
      <div class="tz-scroll">{@html rowsHtml + rowsHtml}</div>
    </div>
    <div class="tz-astra">Astra 不借助任何工具，读出了 17,253 个权重</div>
    <div class="tz-out">
      <img class="tz-gif" src={gif} alt="网络在玩 Breakout 的画面" />
      <span class="tz-big">Breakout</span>
      <span class="tz-note">置信度 99%</span>
    </div>
  </section>

  <!-- 第二格：直接改权重，把策略修好 -->
  <section class="tz-panel" aria-label="修：直接改权重把学不会的关卡修好">
    <div class="tz-step">Fix</div>
    <div class="tz-task">A trained policy never gets the car over the strip.</div>
    <div class="tz-vis tz-car" bind:this={carHost}></div>
    <div class="tz-astra">Astra 一次性改掉 3.5% 的权重</div>
    <div class="tz-out">
      <span class="tz-big">100%</span>
      <span class="tz-note">成功率，之前是 0%</span>
    </div>
  </section>

  <!-- 第三格：不训练，直接改权重提升数学成绩 -->
  <section class="tz-panel" aria-label="改：不训练直接提升数学成绩">
    <div class="tz-step">Improve</div>
    <div class="tz-task">Make Qwen3.5-0.8B better at math.</div>
    <div class="tz-vis tz-bars" aria-label={`base 7.9%，Astra 的修改 ${barLabel}`}>
      <div class="tz-col">
        <div class="tz-bar tz-bar-before" style={`height: ${(BAR.from / BAR.max) * 100}%`}>
          <span class="tz-v">7.9%</span>
        </div>
        <div class="tz-bl">base</div>
      </div>
      <div class="tz-col">
        <div class="tz-bar tz-bar-after" style={`height: ${barHeight}`}>
          <span class="tz-v">{barLabel}</span>
        </div>
        <div class="tz-bl">Astra’s edit</div>
      </div>
    </div>
    <div class="tz-astra">Astra 在 Python kernel 里直接改权重，不做任何训练</div>
    <div class="tz-out">
      <span class="tz-big">48.1%</span>
      <span class="tz-note">MATH-500 上，之前是 7.9%</span>
    </div>
  </section>
</div>
