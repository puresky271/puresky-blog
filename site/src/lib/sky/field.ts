/**
 * field.ts — 天空粒子场。
 *
 * 两个互相独立的输入：
 *   主题（亮 / 暗）：只决定配色深浅，保证粒子在当前底色上看得见又不抢文字；
 *   场景（时段 + 天气）：决定粒子长什么样、怎么动。
 *
 * 形态：
 *   白天、破晓、黄昏且无降水   风：粒子沿平滑流场漂移，拖一小段弯曲的尾迹
 *   夜晚且无降水               星：缓慢漂移、各自闪烁；晴夜偶尔划过流星
 *   雨 / 毛毛雨 / 雷雨         雨丝：斜着落下，强度决定密度和速度；雷雨偶尔一下很轻的闪光
 *   雪                         雪片：缓慢下落、左右摇摆
 *   多云 / 阴 / 雾 / 降水      在上面任一形态之下叠一层缓慢漂移的柔云，云量随天气变化
 *
 * 指针靠近会把粒子推开并带起一点涡旋，点击空白处迸出一小簇，都是对操作的反馈。
 *
 * 性能：粒子数按面积算并有上限；DPR 最多到 2；所有柔光（星点、雪片、云）都用预渲染贴图；
 * 不可见时由调用方 stop()，不在后台空转。
 */

import type { SkyPhase, WeatherKind } from '@shared/weather';

export type Theme = 'light' | 'dark';

export interface Scene {
  phase: SkyPhase;
  weather: WeatherKind;
  /** 0 到 1，降水强度。 */
  intensity: number;
}

export interface SkyOptions {
  /** 每万平方像素的基础粒子数。 */
  density?: number;
  maxParticles?: number;
  interactive?: boolean;
  /** 只画一帧静态画面（减少动态效果时）。 */
  still?: boolean;
}

type Mode = 'wind' | 'stars' | 'rain' | 'snow';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0.35 到 1，越大越「近」：更快、更亮、更大。 */
  depth: number;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
  freq: number;
  tone: number;
  /** 风的尾迹：最近几帧的位置，环形缓冲。 */
  trail?: Float32Array;
  trailHead?: number;
  burst?: boolean;
}

interface Cloud {
  x: number;
  y: number;
  r: number;
  vx: number;
  alpha: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/*
 * 调色板，按主题分。数值来自 global.css 的令牌换算成 sRGB：
 * 亮色主题下用深一些的蓝，暗色主题下用浅蓝和近白。canvas 不一定认 oklch()，所以直接写 rgb。
 */
const INK: Record<Theme, { line: string[]; star: string[]; rain: string; snow: string; cloud: string; flash: string }> = {
  light: {
    line: ['18, 109, 218', '74, 150, 236', '128, 182, 242'],
    star: ['18, 109, 218', '74, 150, 236', '110, 130, 170'],
    rain: '52, 104, 178',
    // 浅色天空上纯白的雪和云都看不见，用偏蓝的灰白。
    snow: '132, 164, 210',
    cloud: '214, 226, 242',
    flash: '255, 255, 255',
  },
  dark: {
    line: ['236, 242, 252', '128, 196, 252', '176, 192, 222'],
    star: ['236, 242, 252', '128, 196, 252', '176, 192, 222'],
    rain: '176, 204, 240',
    snow: '240, 246, 255',
    cloud: '120, 140, 176',
    flash: '210, 225, 255',
  },
};

/** 各天气的云量，0 到 1。 */
const CLOUD_COVER: Record<WeatherKind, number> = {
  clear: 0,
  cloudy: 0.45,
  overcast: 0.85,
  fog: 1,
  drizzle: 0.65,
  rain: 0.8,
  snow: 0.55,
  thunder: 0.95,
};

const TAU = Math.PI * 2;
const TRAIL = 7;

export class SkyField {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly opts: Required<SkyOptions>;
  private particles: Particle[] = [];
  private clouds: Cloud[] = [];
  private meteors: Meteor[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private time = 0;
  private nextMeteor = 0;
  private nextFlash = 0;
  private flash = 0;
  private running = false;
  private theme: Theme;
  private scene: Scene;
  private mode: Mode = 'wind';
  private sprites = new Map<string, HTMLCanvasElement>();
  private pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    theme: Theme,
    scene: Scene,
    options: SkyOptions = {}
  ) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('canvas 2d 不可用');
    this.ctx = ctx;
    this.theme = theme;
    this.scene = scene;
    this.mode = modeOf(scene);
    this.opts = {
      density: options.density ?? 1.2,
      maxParticles: options.maxParticles ?? 320,
      interactive: options.interactive ?? true,
      still: options.still ?? false,
    };
    this.resize();
  }

  // ── 生命周期 ───────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    if (this.opts.still) {
      this.render(0);
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy(): void {
    this.stop();
    this.particles = [];
    this.clouds = [];
    this.meteors = [];
  }

  setTheme(theme: Theme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.sprites.clear();
    if (this.opts.still) this.render(0);
  }

  setScene(scene: Scene): void {
    const nextMode = modeOf(scene);
    const modeChanged = nextMode !== this.mode;
    const cloudChanged = CLOUD_COVER[scene.weather] !== CLOUD_COVER[this.scene.weather];
    this.scene = scene;
    this.mode = nextMode;
    // 形态变了整场重铺；只是强度变了就按新的目标数量增减。
    if (modeChanged) this.particles = [];
    this.populate();
    if (cloudChanged) this.populateClouds();
    if (this.opts.still) this.render(0);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const sx = this.width ? width / this.width : 1;
    const sy = this.height ? height / this.height : 1;
    this.width = width;
    this.height = height;
    // 尺寸变化时按比例挪动已有粒子，而不是整场重新随机。
    for (const p of this.particles) {
      p.x *= sx;
      p.y *= sy;
      this.resetTrail(p);
    }
    for (const c of this.clouds) {
      c.x *= sx;
      c.y *= sy;
    }
    this.populate();
    this.populateClouds();
    if (this.opts.still) this.render(0);
  }

  // ── 指针 ───────────────────────────────────────────────────────────────────

  pointerMove(x: number, y: number): void {
    if (!this.opts.interactive) return;
    if (this.pointer.active) {
      this.pointer.vx = x - this.pointer.x;
      this.pointer.vy = y - this.pointer.y;
    }
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
  }

  pointerLeave(): void {
    this.pointer.active = false;
    this.pointer.vx = 0;
    this.pointer.vy = 0;
  }

  burst(x: number, y: number, count = 22): void {
    if (!this.opts.interactive || this.opts.still) return;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU + Math.random() * 0.4;
      const speed = 1.6 + Math.random() * 2.6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        depth: 0.7 + Math.random() * 0.3,
        size: 1 + Math.random() * 1.4,
        life: 0,
        maxLife: 50 + Math.random() * 40,
        phase: Math.random() * TAU,
        freq: 0,
        tone: Math.floor(Math.random() * 2),
        burst: true,
      });
    }
  }

  // ── 粒子数量 ───────────────────────────────────────────────────────────────

  private target(): number {
    const area = (this.width * this.height) / 10000;
    const cover = CLOUD_COVER[this.scene.weather];
    const factor = {
      // 云越厚，风里的光尘和夜里的星星越少。
      wind: 1 - cover * 0.6,
      stars: 1.1 * (1 - cover * 0.85),
      rain: 0.9 + this.scene.intensity * 1.6,
      snow: 0.7 + this.scene.intensity * 1.1,
    }[this.mode];
    return Math.min(this.opts.maxParticles, Math.max(this.mode === 'stars' ? 8 : 24, Math.round(area * this.opts.density * factor)));
  }

  private populate(): void {
    const steady = this.particles.filter((p) => !p.burst);
    const bursts = this.particles.filter((p) => p.burst);
    const target = this.target();
    while (steady.length < target) steady.push(this.spawn(true));
    this.particles = [...steady.slice(0, target), ...bursts];
  }

  private populateClouds(): void {
    const cover = CLOUD_COVER[this.scene.weather];
    const count = Math.round(cover * (4 + this.width / 220));
    const fog = this.scene.weather === 'fog';
    this.clouds = Array.from({ length: count }, () => {
      const r = (fog ? 180 : 110) + Math.random() * (fog ? 220 : 160);
      return {
        x: Math.random() * (this.width + r * 2) - r,
        // 雾贴着下半部分，云飘在上半部分。
        y: fog ? this.height * (0.45 + Math.random() * 0.6) : this.height * (Math.random() * 0.55),
        r,
        vx: (0.04 + Math.random() * 0.1) * (Math.random() < 0.8 ? 1 : -1),
        alpha: (fog ? 0.32 : 0.22) + Math.random() * 0.25 * cover,
      };
    });
  }

  private spawn(anywhere: boolean): Particle {
    const depth = 0.35 + Math.random() ** 1.6 * 0.65;
    const p: Particle = {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: 0,
      vy: 0,
      depth,
      size: 0.6 + depth * 1.5 + (Math.random() < 0.06 ? 1.2 : 0),
      life: anywhere ? Math.random() * 400 : 0,
      maxLife: 380 + Math.random() * 520,
      phase: Math.random() * TAU,
      freq: 0.4 + Math.random() * 1.6,
      tone: Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2,
    };

    if (this.mode === 'rain') {
      const speed = (9 + this.scene.intensity * 7) * (0.55 + depth * 0.6);
      p.vy = speed;
      p.vx = -speed * 0.2;
      // 新雨滴从顶部上方进场；初次铺满时可以出现在任意高度。
      if (!anywhere) {
        p.y = -20 - Math.random() * 60;
        p.x = Math.random() * (this.width + this.height * 0.2);
      }
      p.maxLife = Infinity;
    } else if (this.mode === 'snow') {
      p.vy = (0.35 + Math.random() * 0.5) * (0.5 + depth);
      p.size = 1.2 + depth * 2.6;
      if (!anywhere) p.y = -10 - Math.random() * 40;
      p.maxLife = Infinity;
    } else if (this.mode === 'wind') {
      p.trail = new Float32Array(TRAIL * 2);
      p.trailHead = 0;
      this.resetTrail(p);
    }
    return p;
  }

  private resetTrail(p: Particle): void {
    if (!p.trail) return;
    for (let i = 0; i < TRAIL; i += 1) {
      p.trail[i * 2] = p.x;
      p.trail[i * 2 + 1] = p.y;
    }
  }

  // ── 模拟 ───────────────────────────────────────────────────────────────────

  /** 流场角度。几个低频正弦叠加，足够平滑，比噪声函数便宜得多。 */
  private flow(x: number, y: number): number {
    const t = this.time;
    return (
      Math.sin(x * 0.0021 + t * 0.00011) +
      Math.cos(y * 0.0026 - t * 0.00009) +
      Math.sin((x + y) * 0.0011 + t * 0.00006)
    );
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    // 切回标签页时 dt 可能很大，钳住防止粒子瞬移。
    const dt = Math.min(50, now - this.last) / 16.667;
    this.last = now;
    this.time += dt * 16.667;
    this.step(dt);
    this.render(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    const pointer = this.pointer;
    pointer.vx *= 0.9;
    pointer.vy *= 0.9;
    const radius = 150;

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life += dt;

      if (p.burst) {
        p.vx *= 0.94;
        p.vy *= 0.94;
      } else if (this.mode === 'wind' || this.mode === 'stars') {
        const day = this.mode === 'wind';
        // 风整体往右上方吹；夜里几乎静止，只有极慢的漂移。
        const angle = (day ? -0.32 : -0.15) + this.flow(p.x, p.y) * (day ? 0.3 : 0.9);
        const speed = (day ? 0.85 : 0.08) * (0.45 + p.depth);
        // 向流场速度靠拢而不是直接赋值，被指针推开后会平滑回到流里。
        p.vx += (Math.cos(angle) * speed - p.vx) * 0.04 * dt;
        p.vy += (Math.sin(angle) * speed - p.vy) * 0.04 * dt;
      } else if (this.mode === 'snow') {
        p.vx = Math.sin(this.time * 0.0012 * p.freq + p.phase) * 0.45 * p.depth;
      }

      if (pointer.active && this.mode !== 'rain') {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < radius * radius && dist2 > 1) {
          const dist = Math.sqrt(dist2);
          const falloff = (1 - dist / radius) ** 2;
          const push = falloff * 0.55 * dt;
          // 径向推开 + 切向带一点旋转 + 顺着指针移动方向带一点。
          const ox = (dx / dist) * push - (dy / dist) * push * 0.6 + pointer.vx * falloff * 0.02;
          const oy = (dy / dist) * push + (dx / dist) * push * 0.6 + pointer.vy * falloff * 0.02;
          if (this.mode === 'snow') {
            p.x += ox * 6;
            p.y += oy * 6;
          } else {
            p.vx += ox;
            p.vy += oy;
          }
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.trail) {
        p.trailHead = ((p.trailHead ?? 0) + 1) % TRAIL;
        p.trail[p.trailHead * 2] = p.x;
        p.trail[p.trailHead * 2 + 1] = p.y;
      }

      const out =
        p.x < -40 || p.x > this.width + 40 || p.y > this.height + 30 || (p.y < -80 && this.mode !== 'rain' && this.mode !== 'snow');
      if (p.life > p.maxLife || out) {
        if (p.burst) this.particles.splice(i, 1);
        else this.particles[i] = this.spawn(false);
      }
    }

    for (const c of this.clouds) {
      c.x += c.vx * dt;
      if (c.vx > 0 && c.x - c.r > this.width) c.x = -c.r;
      if (c.vx < 0 && c.x + c.r < 0) c.x = this.width + c.r;
    }

    if (this.mode === 'stars' && this.scene.weather === 'clear') this.stepMeteors(dt);
    if (this.scene.weather === 'thunder') this.stepFlash(dt);
  }

  private stepMeteors(dt: number): void {
    if (this.time > this.nextMeteor) {
      this.nextMeteor = this.time + 7000 + Math.random() * 9000;
      if (this.meteors.length < 2) {
        const fromLeft = Math.random() < 0.5;
        const speed = 9 + Math.random() * 5;
        const angle = fromLeft ? 0.42 + Math.random() * 0.25 : Math.PI - 0.42 - Math.random() * 0.25;
        this.meteors.push({
          x: fromLeft ? Math.random() * this.width * 0.5 : this.width * (0.5 + Math.random() * 0.5),
          y: Math.random() * this.height * 0.35,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 40 + Math.random() * 25,
        });
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i -= 1) {
      const m = this.meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life += dt;
      if (m.life > m.maxLife) this.meteors.splice(i, 1);
    }
  }

  /** 雷雨的闪光：很轻、间隔 9 到 20 秒，远低于光敏安全阈值（每秒 3 次）。 */
  private stepFlash(dt: number): void {
    if (this.time > this.nextFlash) {
      this.nextFlash = this.time + 9000 + Math.random() * 11000;
      this.flash = 1;
    }
    this.flash = Math.max(0, this.flash - 0.05 * dt);
  }

  // ── 绘制 ───────────────────────────────────────────────────────────────────

  private envelope(p: Particle): number {
    if (!Number.isFinite(p.maxLife)) return 1;
    const t = p.life / p.maxLife;
    if (t < 0.12) return t / 0.12;
    if (t > 0.75) return Math.max(0, (1 - t) / 0.25);
    return 1;
  }

  private render(now: number): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.clouds.length) this.drawClouds();

    if (this.mode === 'wind') this.drawWind();
    else if (this.mode === 'stars') this.drawStars(now);
    else if (this.mode === 'rain') this.drawRain();
    else this.drawSnow();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(${INK[this.theme].flash}, ${(this.theme === 'dark' ? 0.16 : 0.22) * this.flash})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private drawClouds(): void {
    const sprite = this.sprite('cloud', INK[this.theme].cloud, [
      [0, 1],
      [0.5, 0.55],
      [1, 0],
    ]);
    for (const c of this.clouds) {
      this.ctx.globalAlpha = c.alpha;
      // 云是扁的：横向拉宽一倍。
      this.ctx.drawImage(sprite, c.x - c.r * 1.4, c.y - c.r * 0.6, c.r * 2.8, c.r * 1.2);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawWind(): void {
    const { ctx } = this;
    const colors = INK[this.theme].line;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of this.particles) {
      const alpha = this.envelope(p) * (p.burst ? 0.75 : 0.16 + p.depth * 0.38);
      if (alpha < 0.01) continue;
      ctx.strokeStyle = `rgba(${colors[p.tone]}, ${alpha})`;
      ctx.lineWidth = p.size * 0.75;
      ctx.beginPath();
      if (p.trail) {
        // 从最旧的点画到最新的点。
        for (let k = 1; k <= TRAIL; k += 1) {
          const idx = (((p.trailHead ?? 0) + k) % TRAIL) * 2;
          if (k === 1) ctx.moveTo(p.trail[idx], p.trail[idx + 1]);
          else ctx.lineTo(p.trail[idx], p.trail[idx + 1]);
        }
      } else {
        ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  private drawStars(now: number): void {
    const { ctx } = this;
    const dark = this.theme === 'dark';
    // 暗色主题下星点用加色混合发光；亮色主题下是浅底上的深色小点，普通叠加即可。
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (const p of this.particles) {
      const twinkle = p.burst ? 1 : 0.55 + 0.45 * Math.sin(now * 0.001 * p.freq + p.phase);
      const alpha = this.envelope(p) * twinkle * (p.burst ? 0.9 : (dark ? 0.25 : 0.18) + p.depth * (dark ? 0.6 : 0.45));
      if (alpha < 0.02) continue;
      const color = INK[this.theme].star[p.tone];
      const sprite = this.sprite(`star-${p.tone}`, color, [
        [0, 1],
        [0.18, 0.9],
        [0.4, 0.22],
        [1, 0],
      ]);
      const size = p.size * (p.depth > 0.85 ? 5.2 : 3.6) * (dark ? 1 : 0.8);
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    for (const m of this.meteors) {
      const t = m.life / m.maxLife;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const tail = 14;
      const head = INK[this.theme].star[0];
      const gradient = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
      gradient.addColorStop(0, `rgba(${head}, ${0.85 * fade})`);
      gradient.addColorStop(1, `rgba(${head}, 0)`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawRain(): void {
    const { ctx } = this;
    const color = INK[this.theme].rain;
    ctx.lineCap = 'round';
    for (const p of this.particles) {
      const alpha = p.burst ? 0.6 * this.envelope(p) : 0.1 + p.depth * 0.32;
      ctx.strokeStyle = `rgba(${color}, ${alpha})`;
      ctx.lineWidth = p.burst ? p.size : 0.6 + p.depth * 0.7;
      const len = p.burst ? 3 : 1.6 + p.depth * 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
      ctx.stroke();
    }
  }

  private drawSnow(): void {
    const { ctx } = this;
    const sprite = this.sprite('snow', INK[this.theme].snow, [
      [0, 1],
      [0.45, 0.85],
      [1, 0],
    ]);
    for (const p of this.particles) {
      const alpha = (p.burst ? 0.8 * this.envelope(p) : 0.35 + p.depth * 0.55) * (this.theme === 'dark' ? 1 : 0.95);
      const size = p.size * 2.2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** 径向柔光贴图，按「名字 + 颜色」缓存。换主题时清空重建。 */
  private sprite(name: string, rgb: string, stops: [number, number][]): HTMLCanvasElement {
    const key = `${name}:${rgb}`;
    const cached = this.sprites.get(key);
    if (cached) return cached;
    const size = name === 'cloud' ? 128 : 32;
    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d')!;
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [offset, alpha] of stops) gradient.addColorStop(offset, `rgba(${rgb}, ${alpha})`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    this.sprites.set(key, sprite);
    return sprite;
  }
}

function modeOf(scene: Scene): Mode {
  if (scene.weather === 'rain' || scene.weather === 'drizzle' || scene.weather === 'thunder') return 'rain';
  if (scene.weather === 'snow') return 'snow';
  return scene.phase === 'night' ? 'stars' : 'wind';
}
