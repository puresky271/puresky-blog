/**
 * physics.ts — Hydrogen 主题的第一性原理层。
 *
 * 本站所有颜色、层级容量、标签分布都不是设计师拍脑袋定的，而是从氢原子的
 * 真实物理量推导出来。这个文件是那些量的唯一真源（SSOT）。
 * 任何视觉决策若与本文件冲突，改视觉，不改物理。
 *
 * 参考量：
 *   里德伯常数     R∞ = 1.0973731568160e7 m⁻¹（CODATA 2018）
 *   氢原子基态能量 E₁ = −13.605693122994 eV（CODATA 2018 里德伯能量）
 *   玻尔半径       a₀ = 5.29177210903e-11 m
 */

/** 里德伯常数 R∞，单位 m⁻¹。CODATA 2018。对应无限重原子核的理想情形。 */
export const RYDBERG_CONSTANT_PER_M = 1.0973731568160e7;

/** 电子与质子的质量比 m_e/m_p。CODATA 2018。 */
export const ELECTRON_PROTON_MASS_RATIO = 5.44617021487e-4;

/**
 * 氢原子的里德伯常数 R_H，单位 m⁻¹。
 *
 *   R_H = R∞ / (1 + m_e/m_p)
 *
 * 这一步约化质量修正是必须的：质子不是无限重，电子和质子绕共同质心运动。
 * 用 R∞ 算 Hα 会得到 656.11nm，用 R_H 得到 656.46nm，后者才是实测的真空波长。
 * 相差 0.35nm 看着不多，但既然本站的配色声称由物理推导，就不能在这里省。
 */
export const RYDBERG_CONSTANT_HYDROGEN_PER_M =
  RYDBERG_CONSTANT_PER_M / (1 + ELECTRON_PROTON_MASS_RATIO);

/** 里德伯能量（= 氢基态电离能），单位 eV。CODATA 2018。 */
export const RYDBERG_ENERGY_EV = 13.605693122994;

/** 玻尔半径，单位 m。CODATA 2018。 */
export const BOHR_RADIUS_M = 5.29177210903e-11;

/** 人眼可见光波长区间，单位 nm。用于判断一条谱线是否需要伪彩色。 */
export const VISIBLE_RANGE_NM = { min: 380, max: 780 } as const;

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 谱线：里德伯公式
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 里德伯公式。电子从 n_hi 跃迁到 n_lo 时发射的光子**真空**波长（nm）。
 *
 *   1/λ = R_H · (1/n_lo² − 1/n_hi²)
 *
 * 这是本站配色的来源：每个主题分类对应一条真实的氢谱线，
 * 分类的颜色就是那条谱线的真实颜色。
 *
 * 返回值是真空波长。教科书和光谱表里常见的 Hα = 656.28nm 是**空气中**的值，
 * 想对上那个数要再过一次 vacuumToAirNm()。
 */
export function transitionWavelengthNm(nLow: number, nHigh: number): number {
  if (!Number.isInteger(nLow) || !Number.isInteger(nHigh)) {
    throw new Error(`主量子数必须是整数，收到 n_lo=${nLow} n_hi=${nHigh}`);
  }
  if (nLow < 1 || nHigh <= nLow) {
    throw new Error(`需要 1 ≤ n_lo < n_hi，收到 n_lo=${nLow} n_hi=${nHigh}`);
  }
  const inverseWavelengthPerM =
    RYDBERG_CONSTANT_HYDROGEN_PER_M * (1 / (nLow * nLow) - 1 / (nHigh * nHigh));
  return (1 / inverseWavelengthPerM) * 1e9;
}

/**
 * 谱系的系限波长（nm，真空）：n_hi → ∞ 时的极限，也是该系最短波长。
 * 巴尔末系限 364.7nm，莱曼系限 91.2nm，帕申系限 820.6nm。
 */
export function seriesLimitNm(nLow: number): number {
  return (1 / (RYDBERG_CONSTANT_HYDROGEN_PER_M / (nLow * nLow))) * 1e9;
}

/**
 * 真空波长转标准空气波长（nm）。
 *
 * 用 Edlén 1966 的标准空气折射率色散公式：
 *   (n − 1)·10⁸ = 8342.13 + 2406030/(130 − σ²) + 15997/(38.9 − σ²)
 * 其中 σ = 1/λ_vac，单位 μm⁻¹。
 *
 * 为什么要有这个函数：光谱表给的是空气波长（Hα 656.28nm），
 * 里德伯公式算的是真空波长（656.46nm）。UI 上要同时显示两者，
 * 否则读者拿本站的数字去对光谱表会以为算错了。
 * 只在可见光和近红外可靠，深紫外不适用。
 */
export function vacuumToAirNm(vacuumNm: number): number {
  const sigma = 1000 / vacuumNm; // μm⁻¹
  const sigmaSquared = sigma * sigma;
  const refractivity =
    (8342.13 + 2406030 / (130 - sigmaSquared) + 15997 / (38.9 - sigmaSquared)) * 1e-8;
  return vacuumNm / (1 + refractivity);
}

/**
 * 玻尔能级能量（eV）。E_n = −E_R / n²，负值表示束缚态。
 * n 越小越负，束缚越紧 —— 这正是文章分层的物理依据：
 * n=1 的文章是这个博客的基态，最难被替代。
 */
export function levelEnergyEv(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error(`主量子数必须是 ≥1 的整数，收到 ${n}`);
  return -RYDBERG_ENERGY_EV / (n * n);
}

/**
 * 跃迁光子能量（eV）。用于在 UI 上标注一次「阅读跃迁」放出多少能量。
 */
export function transitionEnergyEv(nLow: number, nHigh: number): number {
  return levelEnergyEv(nLow) - levelEnergyEv(nHigh);
}

/**
 * 壳层容量：2n²。泡利不相容原理的直接结果。
 * K 壳 2、L 壳 8、M 壳 18、N 壳 32。
 *
 * 本站把它当成真实的编辑约束用：n=1 层最多只能放 2 篇文章。
 * 这不是我们发明的规则，所以也不打算为了多写几篇就改它。
 */
export function shellCapacity(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error(`主量子数必须是 ≥1 的整数，收到 ${n}`);
  return 2 * n * n;
}

/** 壳层的光谱学字母记号：K L M N O P Q。 */
const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'] as const;

export function shellLetter(n: number): string {
  return SHELL_LETTERS[n - 1] ?? `n${n}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 波长 → RGB
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * 波长（nm）到 sRGB 的近似转换，采用 Dan Bruton 的经典算法：
 * 分段线性的色相 + 可见光两端的强度衰减 + gamma 0.8。
 *
 * 这是把物理波长变成屏幕颜色的标准做法，不是艺术选择。
 * 380nm 以下 / 780nm 以上返回黑色，调用方应改走伪彩色路径。
 */
export function wavelengthToRgb(wavelengthNm: number): Rgb {
  const w = wavelengthNm;
  let r = 0;
  let g = 0;
  let b = 0;

  if (w >= 380 && w < 440) {
    r = -(w - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (w >= 440 && w < 490) {
    r = 0;
    g = (w - 440) / (490 - 440);
    b = 1;
  } else if (w >= 490 && w < 510) {
    r = 0;
    g = 1;
    b = -(w - 510) / (510 - 490);
  } else if (w >= 510 && w < 580) {
    r = (w - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (w >= 580 && w < 645) {
    r = 1;
    g = -(w - 645) / (645 - 580);
    b = 0;
  } else if (w >= 645 && w <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  // 可见光两端视觉响应衰减
  let intensity = 0;
  if (w >= 380 && w < 420) intensity = 0.3 + (0.7 * (w - 380)) / 40;
  else if (w >= 420 && w < 701) intensity = 1;
  else if (w >= 701 && w <= 780) intensity = 0.3 + (0.7 * (780 - w)) / 80;

  const GAMMA = 0.8;
  const channel = (value: number): number =>
    value <= 0 ? 0 : Math.round(255 * Math.pow(value * intensity, GAMMA));

  return { r: channel(r), g: channel(g), b: channel(b) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function isVisible(wavelengthNm: number): boolean {
  return wavelengthNm >= VISIBLE_RANGE_NM.min && wavelengthNm <= VISIBLE_RANGE_NM.max;
}

/**
 * 伪彩色：不可见谱线（紫外、红外）在屏幕上必须借一个可见波长来显示。
 * 天文图像用的就是这套办法，所以 UI 上会明确标 "false colour"，不假装它是真色。
 *
 * 做法是把整个不可见谱系线性映射到一段可见波段，再走同一个 Bruton 函数，
 * 而不是手挑一个好看的 hex。
 */
export function falseColourWavelengthNm(
  wavelengthNm: number,
  sourceBand: readonly [number, number],
  targetBand: readonly [number, number]
): number {
  const [sourceLow, sourceHigh] = sourceBand;
  const [targetLow, targetHigh] = targetBand;
  const clamped = Math.max(sourceLow, Math.min(sourceHigh, wavelengthNm));
  const t = (clamped - sourceLow) / (sourceHigh - sourceLow);
  return targetLow + t * (targetHigh - targetLow);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. UI 安全色派生
 * ──────────────────────────────────────────────────────────────────────────── */

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 相对亮度。 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 对比度。用于门禁：正文色必须 ≥ 4.5，大字号 ≥ 3。 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toChannel = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(toChannel(hn + 1 / 3) * 255),
    g: Math.round(toChannel(hn) * 255),
    b: Math.round(toChannel(hn - 1 / 3) * 255),
  };
}

/**
 * 从真实谱线色派生一个可读的「墨色」（ink）：保持色相，抬高明度、收敛饱和度，
 * 直到在给定背景上达到目标对比度。
 *
 * 为什么需要这一步：Hα 的真色是纯红 #ff0000，作为 1px 发射线很准确，
 * 但拿它写正文会刺眼且在浅色背景上直接不合规。所以谱线用真色，
 * 文字用派生的 ink，两者在 UI 上是不同角色，不混用。
 */
export function deriveInk(
  line: Rgb,
  background: Rgb,
  targetContrast = 4.5,
  maxSaturation = 0.86
): Rgb {
  const { h, s } = rgbToHsl(line);
  const saturation = Math.min(s, maxSaturation);
  const backgroundIsDark = relativeLuminance(background) < 0.18;

  // 暗底往亮的方向找，亮底往暗的方向找，取第一个达标的明度。
  const steps = backgroundIsDark
    ? Array.from({ length: 46 }, (_, i) => 0.5 + i * 0.01)
    : Array.from({ length: 46 }, (_, i) => 0.5 - i * 0.01);

  let fallback = hslToRgb(h, saturation, backgroundIsDark ? 0.72 : 0.3);
  for (const l of steps) {
    const candidate = hslToRgb(h, saturation, l);
    if (contrastRatio(candidate, background) >= targetContrast) return candidate;
    fallback = candidate;
  }
  return fallback;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. 电子云：氢原子径向波函数
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 氢原子径向概率密度 P(r) = r²·|R_nl(r)|²，r 以玻尔半径 a₀ 为单位。
 * 这里只写标签云需要的四个轨道，归一化常数省略（采样只需要相对形状）。
 *
 *   1s: r²·e^(−2r)
 *   2s: r²·(2 − r)²·e^(−r)
 *   2p: r⁴·e^(−r)
 *   3d: r⁶·e^(−2r/3)
 */
export type OrbitalName = '1s' | '2s' | '2p' | '3d';

export function radialProbability(orbital: OrbitalName, r: number): number {
  if (r < 0) return 0;
  switch (orbital) {
    case '1s':
      return r * r * Math.exp(-2 * r);
    case '2s': {
      const shape = 2 - r;
      return r * r * shape * shape * Math.exp(-r);
    }
    case '2p':
      return Math.pow(r, 4) * Math.exp(-r);
    case '3d':
      return Math.pow(r, 6) * Math.exp((-2 * r) / 3);
  }
}

/** 各轨道径向概率密度的最可能半径（a₀ 单位），用于把采样半径归一化到画布。 */
export const ORBITAL_PEAK_RADIUS: Record<OrbitalName, number> = {
  '1s': 1,
  '2s': 5.236, // 2s 外峰，(3+√5)
  '2p': 4,
  '3d': 9,
};

/** 采样时的半径上限，取峰值的若干倍以覆盖概率密度的尾部。 */
export const ORBITAL_SAMPLE_LIMIT: Record<OrbitalName, number> = {
  '1s': 5,
  '2s': 16,
  '2p': 14,
  '3d': 26,
};

/**
 * 角向因子 |Y_lm(θ)|²，只取本站用到的形状。
 * s 球对称、p_z 是 cos²θ 的哑铃、d_z² 是四叶。
 */
export function angularProbability(orbital: OrbitalName, cosTheta: number): number {
  switch (orbital) {
    case '1s':
    case '2s':
      return 1;
    case '2p':
      return cosTheta * cosTheta;
    case '3d': {
      const term = 3 * cosTheta * cosTheta - 1;
      return term * term;
    }
  }
}

/**
 * 用拒绝采样在给定轨道里取一个三维点，单位是 a₀。
 * `random` 可注入，方便用固定种子做确定性渲染和快照测试。
 */
export function sampleOrbitalPoint(
  orbital: OrbitalName,
  random: () => number = Math.random
): { x: number; y: number; z: number; r: number } {
  const limit = ORBITAL_SAMPLE_LIMIT[orbital];
  const peak = ORBITAL_PEAK_RADIUS[orbital];
  const radialMax = radialProbability(orbital, peak);
  const angularMax = orbital === '3d' ? 4 : 1;

  for (let attempt = 0; attempt < 512; attempt += 1) {
    const r = random() * limit;
    const cosTheta = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const density = radialProbability(orbital, r) * angularProbability(orbital, cosTheta);
    if (random() * radialMax * angularMax <= density) {
      const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
      return {
        x: r * sinTheta * Math.cos(phi),
        y: r * sinTheta * Math.sin(phi),
        z: r * cosTheta,
        r,
      };
    }
  }
  // 拒绝采样理论上不会走到这里，兜底放在峰值半径上，避免渲染出空洞。
  return { x: peak, y: 0, z: 0, r: peak };
}

/** mulberry32：小而够用的确定性 PRNG，让电子云每次构建都长一样。 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 把任意字符串折成一个稳定的 32 位种子，用于让每个标签有固定的云形。 */
export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
