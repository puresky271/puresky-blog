<script lang="ts">
  /**
   * BiGym 2.0 项目页的开篇影像。
   *
   * 原站是整屏 hero 的背景：两路 video 接力播放家务演示片段，每一帧先采样到一块小画布，
   * 再按 ASCII 字符或 4×4 Bayer 抖动重新画到显示画布上，鼠标划过会把字符或像素块推开再弹回。
   * 这里按原站脚本（_scratch/bigym2/interact/scripts/BenchHero.pretty.js）逐段搬过来，
   * 改成文章里的横幅形态，去掉了原站的 ?fx 调参面板。
   */
  import { onMount } from 'svelte';
  import { withBase } from '@/lib/format';
  import { dataUrl, loadJson, mediaUrl, type FilmData } from './bigym/data';
  import './bigym/base.css';
  import './bigym/film.css';

  let { config = {} }: { config?: Record<string, unknown> } = $props();

  // 开篇影像没有配置项。在 effect 里读一次，既让挂载层传进来的 config 有响应式身份，
  // 又不会触发「只取了初始值」的编译警告。
  $effect(() => {
    void config;
  });

  /* ── 原站参数：两套滤镜的初始值，调色板，字符梯度，抖动矩阵 ── */

  type FilterId = 'ascii' | 'dither';
  type PaletteId = 'original' | 'meadow' | 'blue' | 'amber' | 'lavender' | 'mono';
  type InkTone = 'shadows' | 'highlights';

  interface FilterSettings {
    mask: number;
    palette: PaletteId;
    inkTone: InkTone;
    strength: number;
    size: number;
    spacing: number;
  }

  interface FilmSettings {
    filter: FilterId;
    ascii: FilterSettings;
    dither: FilterSettings;
  }

  const FILTER_PRESETS: Record<FilterId, FilterSettings> = {
    ascii: { mask: 90, palette: 'original', inkTone: 'shadows', strength: 100, size: 37, spacing: 0 },
    dither: { mask: 88, palette: 'original', inkTone: 'shadows', strength: 100, size: 15, spacing: 0 },
  };

  // 调色板是原站写死的数据，四档从暗到亮，不跟站内主题走。
  const PALETTES: Record<Exclude<PaletteId, 'original'>, readonly [string, string, string, string]> = {
    meadow: ['#2B361F', '#677D45', '#AEBA78', '#E5E1BD'],
    blue: ['#192A4D', '#326AC5', '#A2C2F1', '#EDF3FC'],
    amber: ['#3C200F', '#A74C15', '#EF9A46', '#F7E7CA'],
    lavender: ['#292144', '#6552AB', '#B3A5E4', '#F0ECFB'],
    mono: ['#151515', '#575757', '#A6A6A6', '#ECECEC'],
  };

  // 每次页面加载从 original 加五套里随机抽一套，和原站一致。
  const PALETTE_IDS: PaletteId[] = ['original', 'meadow', 'blue', 'amber', 'lavender', 'mono'];
  const RAMP_STOPS = [0, 0.4, 0.74, 1];
  // 17 级字符梯度，下标 0 到 16，索引时用 Math.round(level * 16)。
  const GLYPHS = '  .,:;-=+xX08S#&@';
  const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  const PREROLL_LEAD = 0.15;
  // 换主题时旧帧淡出的时长，原站实测是 150ms 线性。
  const FADE_MS = 150;
  // 原站里 hero 的段序就是这两条对，轮流和 contact 拼成一轮。
  const FALLBACK_PAIRS = [
    ['plate', 'cup'],
    ['cupboard', 'blocks'],
    ['reach', 'dishwasher'],
  ];

  const lerp = (value: number, from: number, to: number): number => from + ((to - from) * value) / 100;
  const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
  const smooth = (value: number): number => value * value * (3 - 2 * value);
  const luminance = (red: number, green: number, blue: number): number =>
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const hexRgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  function context2d(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
    const context = canvas.getContext('2d', options);
    if (!context) throw new Error('Canvas 2D 上下文不可用。');
    return context;
  }

  /** 亮度到调色板的查表，original 返回 null 表示不换色。 */
  function paletteLut(palette: PaletteId): Uint8ClampedArray | null {
    if (palette === 'original') return null;
    const colors = PALETTES[palette].map(hexRgb);
    const lut = new Uint8ClampedArray(768);
    for (let index = 0; index < 256; index++) {
      const value = index / 255;
      let stop = 0;
      while (stop < 2 && value > RAMP_STOPS[stop + 1]) stop++;
      const mix = (value - RAMP_STOPS[stop]) / (RAMP_STOPS[stop + 1] - RAMP_STOPS[stop]);
      for (let channel = 0; channel < 3; channel++) {
        lut[index * 3 + channel] =
          colors[stop][channel] + (colors[stop + 1][channel] - colors[stop][channel]) * mix;
      }
    }
    return lut;
  }

  function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const delta = max - Math.min(r, g, b);
    let hue = 0;
    if (delta) {
      hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    }
    const degrees = hue * 60 < 0 ? hue * 60 + 360 : hue * 60;
    return [degrees, max ? delta / max : 0, max];
  }

  function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
    const chroma = lightness * saturation;
    const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const base = lightness - chroma;
    const [r, g, b] =
      hue < 60
        ? [chroma, second, 0]
        : hue < 120
          ? [second, chroma, 0]
          : hue < 180
            ? [0, chroma, second]
            : hue < 240
              ? [0, second, chroma]
              : hue < 300
                ? [second, 0, chroma]
                : [chroma, 0, second];
    return [(r + base) * 255, (g + base) * 255, (b + base) * 255];
  }

  /** mask 值转成顶部渐变遮罩的三段 alpha，暗色下整体压到 0.66。 */
  function maskAlpha(mask: number, dark: boolean): [number, number, number] {
    const stops = dark ? [44, 20, 50] : [54, 20, 38];
    const factor = dark ? 0.66 : 1;
    const curve = (stop: number): number =>
      (factor * (mask <= 50 ? stop * (mask / 50) ** 1.08 : stop + (100 - stop) * ((mask - 50) / 50) ** 1.08)) / 100;
    return [curve(stops[0]), curve(stops[1]), curve(stops[2])];
  }

  /** 原站的默认设置：dither 模式，共通值覆盖两套预设，调色板随机。 */
  function makeSettings(): FilmSettings {
    const palette = PALETTE_IDS[Math.floor(Math.random() * PALETTE_IDS.length)];
    const common = { mask: 88, strength: 76, size: 5, spacing: 0, palette };
    return {
      filter: 'dither',
      ascii: { ...FILTER_PRESETS.ascii, ...common },
      dither: { ...FILTER_PRESETS.dither, ...common },
    };
  }

  /**
   * film.json 里是原站的 /media/hero/xxx.mp4 路径，站内文件在 public/media/bigym2/hero/ 下。
   * mediaUrl 负责拼 bigym2 前缀，这里只把原站前缀剥掉。三种写法都能落到位。
   */
  function clipSrc(path: string): string {
    const clean = path.replace(/^\/+/, '');
    const inner = clean.startsWith('media/') ? clean.slice('media/'.length) : clean;
    return inner.startsWith('bigym2/') ? withBase(inner) : mediaUrl(inner);
  }

  function pairList(data: FilmData): string[][] {
    const pairs = data.pairs.filter(
      (pair) => pair.length >= 2 && pair.every((clip) => clip in data.clips),
    );
    return pairs.length > 0 ? pairs : FALLBACK_PAIRS.filter((pair) => pair.every((clip) => clip in data.clips));
  }

  /* ── 渲染器：采样视频帧，按当前滤镜画到显示画布 ── */

  interface ParticleField {
    cols: number;
    rows: number;
    ox: Float32Array;
    oy: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    live: Set<number>;
  }

  class FilmRenderer {
    readonly ptr = { x: 0, y: 0, vx: 0, vy: 0, on: false, fresh: 0 };
    dark: boolean;

    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly sample = document.createElement('canvas');
    private readonly sctx: CanvasRenderingContext2D;
    private readonly small = document.createElement('canvas');
    private readonly last = document.createElement('canvas');
    private readonly settings: FilmSettings;
    private readonly bound = new WeakSet<HTMLVideoElement>();
    private readonly cleanups: (() => void)[] = [];
    private readonly resizeObserver: ResizeObserver;
    private readonly intersectionObserver: IntersectionObserver;
    private source: HTMLVideoElement;
    private running: HTMLVideoElement | null = null;
    private frameKind: 'rvfc' | 'raf' | null = null;
    private frameHandle = 0;
    private timer = 0;
    private visible = true;
    private parts: ParticleField | null = null;
    private moving = false;
    private settling = false;
    private disposed = false;
    private fadePending = false;
    private fadeFrom = 0;

    constructor(canvas: HTMLCanvasElement, source: HTMLVideoElement, settings: FilmSettings, dark: boolean) {
      this.canvas = canvas;
      this.source = source;
      this.settings = settings;
      this.dark = dark;
      this.ctx = context2d(canvas);
      this.sctx = context2d(this.sample, { willReadFrequently: true });
      this.resizeObserver = new ResizeObserver(() => this.request());
      this.resizeObserver.observe(canvas);
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.visible = entries[0]?.isIntersecting ?? false;
        if (this.visible) this.loop();
      });
      this.intersectionObserver.observe(canvas);
      this.bind(source);
    }

    /** 视频换源后要在 play 和 loadeddata 上重新拉起绘制循环。 */
    private bind(video: HTMLVideoElement): void {
      if (this.bound.has(video)) return;
      this.bound.add(video);
      const onPlay = (): void => {
        if (video === this.source) this.loop();
      };
      const onLoaded = (): void => {
        if (video === this.source) this.request();
      };
      video.addEventListener('play', onPlay);
      video.addEventListener('loadeddata', onLoaded);
      this.cleanups.push(() => {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('loadeddata', onLoaded);
      });
    }

    setVideo(video: HTMLVideoElement): void {
      if (video === this.source) return;
      this.bind(video);
      this.source = video;
      this.loop();
      this.draw();
    }

    /** 指针坐标用画布的 CSS 像素，速度做一次和原站一样的低通平滑。 */
    pointer(x: number, y: number): void {
      const ptr = this.ptr;
      if (ptr.on) {
        ptr.vx = 0.6 * ptr.vx + 0.4 * (x - ptr.x);
        ptr.vy = 0.6 * ptr.vy + 0.4 * (y - ptr.y);
      }
      ptr.x = x;
      ptr.y = y;
      ptr.on = true;
      ptr.fresh = 2;

      const video = this.source;
      if (video.paused) {
        if (this.settling) return;
        this.settling = true;
        const step = (): void => {
          this.draw();
          if (this.moving) requestAnimationFrame(step);
          else this.settling = false;
        };
        requestAnimationFrame(step);
      }
    }

    /** 尺寸变化和视频加载都用 72ms 防抖重画一次。 */
    request(): void {
      if (this.disposed) return;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.draw(), 72);
    }

    /** 把当前画面存一份旧帧，下一帧画出来以后 150ms 内线性淡出。换主题前调用。 */
    capture(): void {
      const { width, height } = this.canvas;
      if (!width || !height) return;
      this.last.width = width;
      this.last.height = height;
      context2d(this.last).drawImage(this.canvas, 0, 0);
      this.fadePending = true;
    }

    private loop(): void {
      const video = this.source;
      if (this.running === video) return;
      this.running = video;
      const step = (): void => {
        if (this.disposed || this.running !== video) return;
        if (video.paused || video.ended || !this.visible) {
          this.running = null;
          this.frameKind = null;
          return;
        }
        this.draw();
        if (typeof video.requestVideoFrameCallback === 'function') {
          this.frameKind = 'rvfc';
          this.frameHandle = video.requestVideoFrameCallback(step);
        } else {
          this.frameKind = 'raf';
          this.frameHandle = requestAnimationFrame(step);
        }
      };
      step();
    }

    dispose(): void {
      this.disposed = true;
      window.clearTimeout(this.timer);
      if (this.frameKind === 'rvfc') this.source.cancelVideoFrameCallback(this.frameHandle);
      else if (this.frameKind === 'raf') cancelAnimationFrame(this.frameHandle);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      for (const cleanup of this.cleanups) cleanup();
      this.cleanups.length = 0;
      this.running = null;
    }

    /**
     * 抖动粒子：指针附近按速度往外推，弹簧拉回原位，回弹到足够小就从活动表里删掉。
     * 返回被推开的像素块列表，画完底图后按新位置补画。
     */
    private scatter(
      data: Uint8ClampedArray,
      cols: number,
      rows: number,
      cell: number,
      colorAt: (column: number, row: number) => [number, number, number],
    ): number[] {
      let parts = this.parts;
      if (!parts || parts.cols !== cols || parts.rows !== rows) {
        const size = cols * rows;
        parts = this.parts = {
          cols,
          rows,
          ox: new Float32Array(size),
          oy: new Float32Array(size),
          vx: new Float32Array(size),
          vy: new Float32Array(size),
          live: new Set<number>(),
        };
      }

      const noise = (x: number, y: number): number => {
        const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return value - Math.floor(value);
      };
      const ptr = this.ptr;
      const radius = 60 / cell;

      if (ptr.on && ptr.fresh > 0) {
        ptr.fresh--;
        const speed = Math.hypot(ptr.vx, ptr.vy);
        if (speed > 0.6) {
          const px = ptr.x / cell;
          const py = ptr.y / cell;
          const ux = ptr.vx / speed;
          const uy = ptr.vy / speed;
          const force = Math.min(speed, 36) / cell;
          for (let row = Math.max(0, Math.floor(py - radius)); row < Math.min(rows, Math.ceil(py + radius)); row++) {
            for (let col = Math.max(0, Math.floor(px - radius)); col < Math.min(cols, Math.ceil(px + radius)); col++) {
              const dx = col + 0.5 - px;
              const dy = row + 0.5 - py;
              const distance = Math.hypot(dx, dy);
              if (distance >= radius) continue;
              const index = row * cols + col;
              const falloff = (1 - distance / radius) ** 1.6;
              const nx = dx / (distance || 1);
              const ny = dy / (distance || 1);
              const sign = Math.sign(nx * uy - ny * ux) || 1;
              const push = (0.35 + 0.5 * noise(index, 1)) * falloff * force;
              parts.vx[index] +=
                ux * push + -ny * sign * push * 0.45 + nx * push * 0.2 + (noise(index, 2) - 0.5) * push * 0.5;
              parts.vy[index] +=
                uy * push + nx * sign * push * 0.45 + ny * push * 0.2 + (noise(index, 3) - 0.5) * push * 0.5;
              parts.live.add(index);
            }
          }
        }
        ptr.vx *= 0.8;
        ptr.vy *= 0.8;
      }

      if (!parts.live.size) {
        this.moving = false;
        return [];
      }

      const displaced: number[] = [];
      const active: number[] = [];
      for (const index of parts.live) {
        const spring = 0.16 + 0.14 * noise(index, 4);
        const damping = 0.66 + 0.12 * noise(index, 5);
        parts.vx[index] = (parts.vx[index] - parts.ox[index] * spring) * damping;
        parts.vy[index] = (parts.vy[index] - parts.oy[index] * spring) * damping;
        parts.ox[index] = clamp(parts.ox[index] + parts.vx[index], -22, 22);
        parts.oy[index] = clamp(parts.oy[index] + parts.vy[index], -22, 22);
        if (
          Math.abs(parts.ox[index]) + Math.abs(parts.oy[index]) +
          Math.abs(parts.vx[index]) + Math.abs(parts.vy[index]) < 0.12
        ) {
          parts.ox[index] = 0;
          parts.oy[index] = 0;
          parts.vx[index] = 0;
          parts.vy[index] = 0;
          parts.live.delete(index);
          continue;
        }
        active.push(index);
      }

      for (const index of active) {
        const offset = index * 4;
        const col = index % cols;
        const row = Math.floor(index / cols);
        // 先记下被推开的块该画在哪，画什么颜色，再把原位置的像素改成底图锚色挖掉。
        displaced.push(
          Math.round((col + parts.ox[index]) * cell),
          Math.round((row + parts.oy[index]) * cell),
          data[offset],
          data[offset + 1],
          data[offset + 2],
        );
        const color = colorAt(col, row);
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
      }

      this.moving = parts.live.size > 0;
      return displaced;
    }

    draw(): void {
      if (this.disposed) return;
      const video = this.source;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      if (!videoWidth || !videoHeight) return;
      // 换主题后先等新视频出第一帧，别让空白帧盖掉旧画面，淡入从这一帧开始算。
      if (this.fadePending && video.readyState < 2) return;

      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // DPR 封顶 1.6，长边不超过 2048。
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6, 2048 / Math.max(rect.width, rect.height));
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      const config = this.settings[this.settings.filter];
      const strength = config.strength / 100;

      // 采样画布长边固定 480 像素，比例和显示区一致。
      const sampleScale = 480 / Math.max(rect.width, rect.height);
      const sampleWidth = Math.max(1, Math.round(rect.width * sampleScale));
      const sampleHeight = Math.max(1, Math.round(rect.height * sampleScale));
      if (this.sample.width !== sampleWidth || this.sample.height !== sampleHeight) {
        this.sample.width = sampleWidth;
        this.sample.height = sampleHeight;
      }

      const cover = Math.max(sampleWidth / videoWidth, sampleHeight / videoHeight);
      this.sctx.fillStyle = '#fff';
      this.sctx.fillRect(0, 0, sampleWidth, sampleHeight);
      this.sctx.drawImage(
        video,
        (sampleWidth - videoWidth * cover) / 2,
        (sampleHeight - videoHeight * cover) / 2,
        videoWidth * cover,
        videoHeight * cover,
      );

      const image = this.sctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = image.data;
      const lut = paletteLut(config.palette);
      if (lut) {
        for (let index = 0; index < data.length; index += 4) {
          const offset = Math.round(luminance(data[index], data[index + 1], data[index + 2]) * 255) * 3;
          data[index] = lut[offset];
          data[index + 1] = lut[offset + 1];
          data[index + 2] = lut[offset + 2];
        }
        this.sctx.putImageData(image, 0, 0);
      }

      const sampleAt = (x: number, y: number): [number, number, number] => {
        const col = Math.min(sampleWidth - 1, Math.max(0, Math.floor(x * sampleScale)));
        const row = Math.min(sampleHeight - 1, Math.max(0, Math.floor(y * sampleScale)));
        const offset = (row * sampleWidth + col) * 4;
        return [data[offset], data[offset + 1], data[offset + 2]];
      };

      // 取 8% 到 92% 分位的亮度，当这一帧的明暗范围。
      const columns = Math.round(Math.sqrt((12000 * sampleWidth) / sampleHeight));
      const rows = Math.round(12000 / columns);
      const tones: number[] = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const x = Math.floor(((column + 0.5) / columns) * sampleWidth);
          const y = Math.floor(((row + 0.5) / rows) * sampleHeight);
          const offset = (y * sampleWidth + x) * 4;
          tones.push(luminance(data[offset], data[offset + 1], data[offset + 2]));
        }
      }
      if (!tones.length) return;
      tones.sort((a, b) => a - b);
      const low = tones[Math.floor(tones.length * 0.08)];
      const high = tones[Math.floor(tones.length * 0.92)];

      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      const veil = (): void => {
        const [top, middle, bottom] = maskAlpha(config.mask, this.dark);
        const color = this.dark ? '13,15,16' : '255,255,255';
        const gradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
        gradient.addColorStop(0, `rgba(${color},${top})`);
        gradient.addColorStop(0.42, `rgba(${color},${middle})`);
        gradient.addColorStop(1, `rgba(${color},${bottom})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      };

      if (this.settings.filter === 'ascii') {
        ctx.imageSmoothingEnabled = true;
        if (lut) {
          ctx.drawImage(this.sample, 0, 0, cssWidth, cssHeight);
        } else {
          const scale = Math.max(cssWidth / videoWidth, cssHeight / videoHeight);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, cssWidth, cssHeight);
          ctx.drawImage(
            video,
            (cssWidth - videoWidth * scale) / 2,
            (cssHeight - videoHeight * scale) / 2,
            videoWidth * scale,
            videoHeight * scale,
          );
        }
        veil();

        const fontSize = Math.round(Math.min(lerp(config.size, 7, 24), cssWidth < 720 ? 22 : 24));
        ctx.font = `${fontSize}px "Geist Mono Variable", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let widest = 0;
        for (const glyph of GLYPHS) widest = Math.max(widest, ctx.measureText(glyph).width);
        const at = ctx.measureText('@');
        const glyphHeight = at.actualBoundingBoxAscent + at.actualBoundingBoxDescent || fontSize;
        const stepX = Math.max(lerp(config.spacing, 8, 24), widest * 1.08);
        const stepY = Math.max(lerp(config.spacing, 9, 26), glyphHeight * 1.12, fontSize * 1.04);
        const shadows = config.inkTone === 'shadows';
        const span = high - low;
        const baseMix = 0.72 + 0.14 * strength;
        const lift = 0.22 * strength;
        const norm = 1 - 0.08 * strength;

        for (let y = stepY / 2; y < cssHeight; y += stepY) {
          for (let x = stepX / 2; x < cssWidth; x += stepX) {
            const [red, green, blue] = sampleAt(x, y);
            const tone = luminance(red, green, blue);
            const ink = shadows ? 1 - tone : tone;
            const band = span < 0.025 ? ink : clamp(shadows ? (high - tone) / span : (tone - low) / span);
            const level = clamp((ink * (1 - baseMix) + band * baseMix - lift) / (norm - lift));
            const shaped = level * (1 - strength) + smooth(level) * strength;
            if (shaped <= 0.02) continue;
            const glyph = GLYPHS[Math.round(shaped * 16)];
            if (glyph === ' ') continue;

            let [hue, saturation, lightness] = rgbToHsl(red, green, blue);
            lightness += (1 - lightness) * (0.24 + 0.18 * strength + 0.24 * shaped);
            saturation = clamp(saturation * (1.16 + 0.2 * strength));
            const [paintRed, paintGreen, paintBlue] = hslToRgb(hue, saturation, lightness);
            const alpha = clamp((0.12 + 0.7 * shaped) * (0.72 + 0.28 * strength), 0.06, 0.94);
            ctx.fillStyle = `rgba(${paintRed | 0},${paintGreen | 0},${paintBlue | 0},${alpha})`;
            ctx.fillText(glyph, x, y);
          }
        }
      } else {
        const block = Math.max(2, Math.round(Math.min(lerp(config.size, 2, 9), cssWidth < 720 ? 7 : 9)));
        const spacing = Math.max(1, Math.round(lerp(config.spacing, 1, 4)));
        const levels = Math.max(2, Math.round(lerp(config.strength, 8, 2)));
        const mix = lerp(config.strength, 0.32, 1);
        const boost = 1.06 + 0.18 * strength;
        const cols = Math.ceil(cssWidth / block);
        const rowsCount = Math.ceil(cssHeight / block);
        if (this.small.width !== cols || this.small.height !== rowsCount) {
          this.small.width = cols;
          this.small.height = rowsCount;
        }
        const smallCtx = context2d(this.small);
        const frame = smallCtx.createImageData(cols, rowsCount);
        const pixels = frame.data;

        const thresholdAt = (column: number, row: number): number =>
          (BAYER[Math.floor(row / spacing) % 4][Math.floor(column / spacing) % 4] + 0.5) / 16;
        const quantize = (value: number, threshold: number): number => {
          const limited = clamp(value, 0, 255);
          const scaled = (limited / 255) * (levels - 1);
          const base = Math.floor(scaled);
          const level = Math.min(levels - 1, base + Number(scaled - base > threshold));
          return limited + ((level / (levels - 1)) * 255 - limited) * mix;
        };

        for (let row = 0; row < rowsCount; row++) {
          for (let column = 0; column < cols; column++) {
            const [red, green, blue] = sampleAt((column + 0.5) * block, (row + 0.5) * block);
            const tone = 0.299 * red + 0.587 * green + 0.114 * blue;
            const threshold = thresholdAt(column, row);
            const offset = (row * cols + column) * 4;
            pixels[offset] = quantize(tone + (red - tone) * boost, threshold);
            pixels[offset + 1] = quantize(tone + (green - tone) * boost, threshold);
            pixels[offset + 2] = quantize(tone + (blue - tone) * boost, threshold);
            pixels[offset + 3] = 255;
          }
        }

        // 被推开的块要重新按它所在位置的抖动阈值上色，所以先取画布角落的颜色当锚点。
        const anchor = sampleAt(3, 3);
        const anchorTone = 0.299 * anchor[0] + 0.587 * anchor[1] + 0.114 * anchor[2];
        const anchorColor: [number, number, number] = [
          anchorTone + (anchor[0] - anchorTone) * boost,
          anchorTone + (anchor[1] - anchorTone) * boost,
          anchorTone + (anchor[2] - anchorTone) * boost,
        ];
        const displaced = this.scatter(pixels, cols, rowsCount, block, (column, row) => {
          const threshold = thresholdAt(column, row);
          return [
            quantize(anchorColor[0], threshold),
            quantize(anchorColor[1], threshold),
            quantize(anchorColor[2], threshold),
          ];
        });

        smallCtx.putImageData(frame, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.small, 0, 0, cols * block, rowsCount * block);
        for (let index = 0; index < displaced.length; index += 5) {
          ctx.fillStyle = `rgb(${displaced[index + 2] | 0},${displaced[index + 3] | 0},${displaced[index + 4] | 0})`;
          ctx.fillRect(displaced[index], displaced[index + 1], block, block);
        }
        veil();
      }

      // 换主题的交叉淡入：capture() 存了旧帧，这里把旧帧按 1 - t/150 叠回去。
      if (this.fadePending) {
        this.fadePending = false;
        this.fadeFrom = performance.now();
      }
      const elapsed = performance.now() - this.fadeFrom;
      if (elapsed < FADE_MS && this.last.width && this.last.height) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - elapsed / FADE_MS;
        ctx.drawImage(this.last, 0, 0, width, height);
        ctx.globalAlpha = 1;
        // 视频在播时由 rVFC 接着画。暂停时（reduced motion）要自己续帧，直到淡完。
        if (this.source.paused) {
          requestAnimationFrame(() => {
            if (!this.disposed) this.draw();
          });
        }
      }
    }
  }

  /* ── 播放器：两路视频接力，轮次按 [pair[0], pair[1], contact] 循环 ── */

  class FilmPlayer {
    readonly layer: FilmRenderer;

    private readonly clips: FilmData['clips'];
    private readonly paused: boolean;
    private readonly pairs: string[][];
    private readonly cleanups: (() => void)[] = [];
    private rounds: string[][] = [];
    private roundIndex = 0;
    private stepIndex = 0;
    private preroll = false;
    private dark: boolean;
    private frame = 0;
    private stopped = false;
    private front: HTMLVideoElement;
    private back: HTMLVideoElement;

    constructor(
      front: HTMLVideoElement,
      back: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      data: FilmData,
      paused: boolean,
      dark: boolean,
    ) {
      this.front = front;
      this.back = back;
      this.clips = data.clips;
      this.paused = paused;
      this.dark = dark;
      this.pairs = pairList(data);
      if (!this.pairs.length) throw new Error('film.json 没有可用的剪辑对。');

      this.load(this.front, this.clip(0, 0));
      this.load(this.back, this.clip(...this.after(0, 0)));
      this.layer = new FilmRenderer(canvas, this.front, makeSettings(), dark);

      const onLoaded = (): void => {
        if (!this.paused && !this.stopped) void this.front.play().catch(() => undefined);
      };
      this.front.addEventListener('loadeddata', onLoaded, { once: true });
      this.cleanups.push(() => this.front.removeEventListener('loadeddata', onLoaded));

      // reduced motion 下视频不播，只靠 renderer 的 loadeddata 画一帧静态画面，不跑 rAF。
      if (!this.paused) {
        const tick = (): void => {
          if (this.stopped) return;
          this.tick();
          this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
      }
    }

    /** 每一轮随机决定那一对片段要不要反过来播。 */
    private round(index: number): string[] {
      while (this.rounds.length <= index) {
        const pair = [...this.pairs[this.rounds.length % this.pairs.length]];
        if (Math.random() < 0.5) pair.reverse();
        this.rounds.push([...pair, 'contact']);
      }
      return this.rounds[index];
    }

    private clip(round = this.roundIndex, step = this.stepIndex): string {
      return this.round(round)[step];
    }

    private after(round: number, step: number): [number, number] {
      return step < 2 ? [round, step + 1] : [round + 1, 0];
    }

    private url(id: string): string {
      const clip = this.clips[id];
      if (!clip) return '';
      return clipSrc(this.dark ? clip.dark : clip.light);
    }

    private load(video: HTMLVideoElement, id: string, time = 0): void {
      video.pause();
      const src = this.url(id);
      if (!src) return;
      if (video.dataset.src !== src) {
        video.src = src;
        video.dataset.src = src;
      }
      video.currentTime = time;
    }

    private tick(): void {
      const video = this.front;
      const duration = video.duration;
      if (this.paused || !duration || !Number.isFinite(duration)) return;
      if (!this.preroll && video.currentTime >= duration - PREROLL_LEAD) {
        this.preroll = true;
        void this.back.play().catch(() => undefined);
      }
      if (this.preroll && (video.ended || video.currentTime >= duration - 0.01)) this.cut();
    }

    /** 前后台交换，旧的那路去载入下一段，画布切到新的前台视频。 */
    private cut(): void {
      const old = this.front;
      this.front = this.back;
      this.back = old;
      [this.roundIndex, this.stepIndex] = this.after(this.roundIndex, this.stepIndex);
      this.preroll = false;
      if (this.front.paused && !this.paused) void this.front.play().catch(() => undefined);
      this.layer.setVideo(this.front);
      this.load(old, this.clip(...this.after(this.roundIndex, this.stepIndex)));
    }

    /** 换主题只换视频源，当前播放时间点不动。 */
    setDark(dark: boolean): void {
      if (dark === this.dark) return;
      // 先把旧主题的画面拍下来，新画面出来以后由 renderer 在 150ms 内淡出它。
      this.layer.capture();
      this.dark = dark;
      this.layer.dark = dark;
      const front = this.front;
      const time = front.currentTime;
      this.preroll = false;
      this.load(front, this.clip(), time);
      if (!this.paused) void front.play().catch(() => undefined);
      this.load(this.back, this.clip(...this.after(this.roundIndex, this.stepIndex)));
      this.layer.request();
    }

    pointer(x: number, y: number): void {
      this.layer.pointer(x, y);
    }

    pointerOff(): void {
      this.layer.ptr.on = false;
    }

    redraw(): void {
      this.layer.request();
    }

    destroy(): void {
      this.stopped = true;
      cancelAnimationFrame(this.frame);
      this.front.pause();
      this.back.pause();
      this.layer.dispose();
      for (const cleanup of this.cleanups) cleanup();
      this.cleanups.length = 0;
    }
  }

  /* ── 挂载 ── */

  let stageEl: HTMLDivElement;
  let frontEl: HTMLVideoElement;
  let backEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let failed = $state(false);

  const isDark = (): boolean => document.documentElement.dataset.theme === 'dark';

  onMount(() => {
    let disposed = false;
    let player: FilmPlayer | null = null;
    let themeObserver: MutationObserver | null = null;
    let onTheme: (() => void) | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = stageEl;
    const canvas = canvasEl;
    const front = frontEl;
    const back = backEl;

    const onPointerMove = (event: PointerEvent): void => {
      if (!player) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        player.pointerOff();
        return;
      }
      player.pointer(x, y);
    };
    const onPointerLeave = (): void => player?.pointerOff();

    // 指针事件只挂在 stage 上，不往 document 上冒，页面滚动和选中文字都不受影响。
    if (!reduced) {
      stage.addEventListener('pointermove', onPointerMove);
      stage.addEventListener('pointerleave', onPointerLeave);
    }

    loadJson<FilmData>(dataUrl('film.json'))
      .then((data) => {
        if (disposed) return;
        try {
          player = new FilmPlayer(front, back, canvas, data, reduced, isDark());
        } catch {
          failed = true;
          return;
        }
        // 站内切主题会同时改 <html data-theme> 并派发 theme:change，两条都接。
        themeObserver = new MutationObserver(() => player?.setDark(isDark()));
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        onTheme = (): void => player?.setDark(isDark());
        window.addEventListener('theme:change', onTheme);
        // ASCII 用的是等宽字体，字体加载完字宽会变，再重画一次。
        void document.fonts.ready.then(() => {
          if (!disposed) player?.redraw();
        });
      })
      .catch(() => {
        if (!disposed) failed = true;
      });

    return () => {
      disposed = true;
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      themeObserver?.disconnect();
      if (onTheme) window.removeEventListener('theme:change', onTheme);
      player?.destroy();
      player = null;
    };
  });
</script>

<div class="bm-demo">
  <div class="bm-stage" bind:this={stageEl}>
    <video class="bm-vid" bind:this={frontEl} muted playsinline preload="auto" aria-hidden="true"></video>
    <video class="bm-vid" bind:this={backEl} muted playsinline preload="auto" aria-hidden="true"></video>
    <canvas bind:this={canvasEl} aria-hidden="true"></canvas>
    {#if failed}
      <p class="bm-fallback">开篇影像加载失败，请刷新后重试。</p>
    {/if}
  </div>
  <p class="bm-sr">循环播放六段家务演示，画面被实时渲染成字符或点阵；移动鼠标会推开画面。</p>
</div>
