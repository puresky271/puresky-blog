<script lang="ts">
  /**
   * CassiopeiaStarLab.svelte — 仙后座五曜：三维光年纵深、北天极周日寻星与恒星物理对比交互观测台。
   *
   * 专为《仙后座的五颗主星》随笔打造的定制交互组件，不套用算法步进外壳。
   * 支持三种整台形态或嵌入单模视图（由 YAML config.view 决定）：
   *   1. depth（三维纵深）：拖动观测倾角滑块（0° 地球仰视投影 -> 90° 银河侧面剖面），
   *      亲眼看见扁平的 W 折线在 55 光年到 550 光年的深空里散开成五级纵深阶梯；支持切换西方星座连线与中国古星官（王良、策、阁道）。
   *   2. polar（北极星罗盘）：拨动季节与观测时刻（或开启星轨自动旋转），演示仙后座与北斗七星隔着北极星的跷跷板拱极运动，
   *      以及用仙后座两侧张角延伸线锁定北极星的几何寻星法。
   *   3. physics（恒星实验室）：将五颗主星与太阳放在同一张赫罗图温标与赤道自转剖面上，对比 43 倍太阳半径的红巨星王良四、
   *      每秒 432 公里甩出等离子圆盘的壳层星“策”以及扁球形的王良一。
   */
  import {
    CASSIOPEIA_STARS,
    EXTRA_ASTERISM_STARS,
    type CassiopeiaStar,
  } from '@/lib/animations/cassiopeia-stars';

  import type { AnimationProps } from './mount';

  const { config = {} }: AnimationProps = $props();

  type LabTab = 'depth' | 'polar' | 'physics';
  type CultureOverlay = 'both' | 'western' | 'chinese';

  const lockedView = $derived.by<LabTab | null>(() => {
    const v = config.view;
    if (v === 'depth' || v === 'polar' || v === 'physics') return v;
    return null;
  });

  let activeTab = $state<LabTab>('depth');
  $effect(() => {
    if (lockedView) activeTab = lockedView;
  });

  /** 当前选中的主星下标（默认选中正中央最传奇的 γ Cas“策”，index=2） */
  let selectedIdx = $state(2);
  const activeStar = $derived<CassiopeiaStar>(CASSIOPEIA_STARS[selectedIdx] ?? CASSIOPEIA_STARS[2]);

  // ── 视角一：三维纵深状态 ──
  /** 0 = 地球夜空平面投影 (0°)，100 = 银河侧面光年纵深剖面 (90°) */
  let depthPitch = $state(0);
  let cultureMode = $state<CultureOverlay>('both');
  let depthTweenFrame = 0;

  function animateDepthTo(target: number) {
    cancelAnimationFrame(depthTweenFrame);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      depthPitch = target;
      return;
    }
    const startVal = depthPitch;
    const diff = target - startVal;
    if (Math.abs(diff) < 0.5) {
      depthPitch = target;
      return;
    }
    let startTime = 0;
    const duration = 560;
    const step = (now: number) => {
      startTime ||= now;
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - p) ** 3;
      depthPitch = Math.round((startVal + diff * eased) * 10) / 10;
      if (p < 1) depthTweenFrame = requestAnimationFrame(step);
    };
    depthTweenFrame = requestAnimationFrame(step);
  }

  /**
   * 计算每颗恒星在当前倾角 t (0..1) 下的 SVG 坐标 (viewBox 0 0 960 400)。
   * t = 0 时呈现天球上的标准 W 折线；
   * t = 1 时 Y 轴按真实距离（0 ~ 600 光年）从底部地球观测点向上展开，呈现三维纵深落差。
   */
  const tRatio = $derived(depthPitch / 100);

  const projectedStars = $derived(
    CASSIOPEIA_STARS.map((star, idx) => {
      // 平面态 Y (132..260)，纵深态 Y：底部 342 代表 0 ly，顶部 58 代表 600 ly
      const depthY = 342 - (star.distanceLy / 600) * 284;
      const x = star.skyX;
      const y = star.skyY * (1 - tRatio) + depthY * tRatio;
      // 视觉半径：平面态按视星等，纵深态逐渐反映真实绝对光度
      const appRadius = Math.max(5.5, 11.8 - (star.apparentMag - 2.0) * 3.4);
      const absRadius = Math.max(6.2, 8.2 - star.absoluteMag * 1.35);
      const r = appRadius * (1 - tRatio * 0.65) + absRadius * (tRatio * 0.65);
      return {
        star,
        idx,
        x,
        y,
        depthY,
        r,
      };
    })
  );

  const wPolylinePoints = $derived(projectedStars.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

  // ── 视角二：北天极周日视运动与寻星罗盘状态 ──
  /** 旋转角度（度）：0° 对应 11 月秋夜 21:00（仙后座高悬北极星正上方呈 M 形，北斗在下方贴近地平） */
  let skyAngle = $state(0);
  let showGuideLines = $state(true);
  let showBigDipper = $state(true);

  const SEASON_PRESETS = [
    { label: '仲秋 · 11月 21:00', angle: 0, note: '仙后座高悬天顶偏北呈 M 形，北斗七星沉在北方低空' },
    { label: '隆冬 · 2月 21:00', angle: 90, note: '仙后座转至北极星西侧竖立，北斗七星从东北方升起' },
    { label: '暮春 · 5月 21:00', angle: 180, note: '仙后座落入北极星正下方呈端正的 W 形，北斗高悬天顶' },
    { label: '盛夏 · 8月 21:00', angle: 270, note: '仙后座从东北方重新爬升，与西沉的北斗隔极相望' },
  ] as const;

  const currentSeasonNote = $derived.by(() => {
    const norm = ((skyAngle % 360) + 360) % 360;
    if (norm < 45 || norm >= 315) return '秋夜视角：卡西欧佩亚王后头朝下悬在北极星正上方，折线呈“M”形。';
    if (norm >= 45 && norm < 135) return '冬夜视角：仙后座转到北极星左侧（西侧），像一张侧立的折椅。';
    if (norm >= 135 && norm < 225) return '春夜视角：仙后座转到北极星正下方，呈现最标准的字母“W”形。';
    return '夏夜视角：仙后座位于北极星右侧（东北方），正沿着银河缓步升起。';
  });

  /**
   * 北天极罗盘本地坐标（以北极星 (0, 0) 为圆心，秋夜 0° 时仙后座在上方 y < 0，北斗在下方 y > 0）
   */
  const POLAR_CAS = [
    { id: 'beta', label: '王良一 β', x: -76, y: -116, color: '#fff3d6', r: 5.8 },
    { id: 'alpha', label: '王良四 α', x: -38, y: -146, color: '#ffb464', r: 6.2 },
    { id: 'gamma', label: '策 γ', x: -2, y: -120, color: '#8ec5ff', r: 6.0 },
    { id: 'delta', label: '阁道三 δ', x: 36, y: -142, color: '#dceaff', r: 5.4 },
    { id: 'epsilon', label: '阁道二 ε', x: 78, y: -108, color: '#a3c9ff', r: 4.6 },
  ] as const;

  const POLAR_DIPPER = [
    { name: '天枢', x: -28, y: 120 },
    { name: '天璇', x: -34, y: 150 },
    { name: '天玑', x: 4, y: 156 },
    { name: '天权', x: 12, y: 128 },
    { name: '玉衡', x: 42, y: 122 },
    { name: '开阳', x: 72, y: 112 },
    { name: '摇光', x: 104, y: 124 },
  ] as const;

  // ── 视角三：恒星物理实验室状态 ──
  let compareWithSun = $state(true);

  function selectStar(index: number) {
    selectedIdx = index;
  }

  function onDepthKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectedIdx = (selectedIdx + CASSIOPEIA_STARS.length - 1) % CASSIOPEIA_STARS.length;
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectedIdx = (selectedIdx + 1) % CASSIOPEIA_STARS.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      depthPitch = Math.min(100, depthPitch + 10);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      depthPitch = Math.max(0, depthPitch - 10);
    }
  }
</script>

<section class="cas-lab" aria-label="仙后座五颗主星交互观测台">
  <!-- 顶部标题与模式切换栏 -->
  <header class="cas-header">
    <div class="cas-brand">
      <span class="cas-badge">CASSIOPEIA · 仙后座五曜</span>
      <h3 class="cas-title">
        {#if activeTab === 'depth'}
          三维光年纵深与中西星官解构
        {:else if activeTab === 'polar'}
          北天极周日视运动与几何寻星罗盘
        {:else}
          五曜恒星物理、自转扁率与光谱实验室
        {/if}
      </h3>
    </div>

    {#if !lockedView}
      <div class="cas-tabs" role="tablist" aria-label="观测台模式切换">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'depth'}
          onclick={() => (activeTab = 'depth')}
        >
          1 · 三维光年纵深
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'polar'}
          onclick={() => (activeTab = 'polar')}
        >
          2 · 拱极周日罗盘
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'physics'}
          onclick={() => (activeTab = 'physics')}
        >
          3 · 恒星物理剖面
        </button>
      </div>
    {/if}
  </header>

  <!-- ════════════════════════════════════════════════════════════════
       模式 1：三维光年纵深与中西星官（0° 仰视投影 <-> 90° 银河剖面）
       ════════════════════════════════════════════════════════════════ -->
  {#if activeTab === 'depth'}
    <div class="cas-toolbar">
      <div class="slider-group">
        <label for="cas-depth-slider" class="slider-label">
          <span>空间观测倾角</span>
          <strong class="tabular">{Math.round(depthPitch * 0.9)}°</strong>
          <span class="slider-hint">
            {depthPitch < 15
              ? '（地球夜空二维投影 · 经典 W 折线）'
              : depthPitch > 85
                ? '（银河侧面三维纵深 · 跨越 495 光年）'
                : '（正在剥离二维视差错觉…）'}
          </span>
        </label>
        <div class="slider-row">
          <button
            type="button"
            class="preset-chip"
            class:active={depthPitch < 5}
            onclick={() => animateDepthTo(0)}
          >
            地球仰视 (0°)
          </button>
          <input
            id="cas-depth-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            bind:value={depthPitch}
            aria-label="调整三维观测倾角，从 0 度地球平面投影切换到 90 度光年距离纵深"
          />
          <button
            type="button"
            class="preset-chip"
            class:active={depthPitch > 95}
            onclick={() => animateDepthTo(100)}
          >
            光年纵深 (90°)
          </button>
        </div>
      </div>

      <div class="overlay-group" role="group" aria-label="星图文化图层">
        <span class="group-caption">星象连线：</span>
        <button
          type="button"
          class="preset-chip"
          class:active={cultureMode === 'both'}
          onclick={() => (cultureMode = 'both')}
        >中西叠印</button>
        <button
          type="button"
          class="preset-chip"
          class:active={cultureMode === 'western'}
          onclick={() => (cultureMode = 'western')}
        >西方 W 折线</button>
        <button
          type="button"
          class="preset-chip"
          class:active={cultureMode === 'chinese'}
          onclick={() => (cultureMode = 'chinese')}
        >中国三官（王良/策/阁道）</button>
      </div>
    </div>

    <div
      class="canvas-wrap"
      role="region"
      tabindex="0"
      aria-label="仙后座五颗主星空间分布图，按左右方向键切换恒星，上下方向键调节空间倾角"
      onkeydown={onDepthKeydown}
    >
      <svg viewBox="0 0 960 400" class="sky-svg">
        <defs>
          <radialGradient id="cas-sky-bg" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stop-color="#111a2e" />
            <stop offset="65%" stop-color="#0a1020" />
            <stop offset="100%" stop-color="#060913" />
          </radialGradient>
          <linearGradient id="cas-milkyway" x1="0%" y1="75%" x2="100%" y2="20%">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.03" />
            <stop offset="45%" stop-color="#93c5fd" stop-opacity="0.11" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.04" />
          </linearGradient>
          <filter id="cas-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- 深空底色与银河淡带 -->
        <rect width="960" height="400" rx="12" fill="url(#cas-sky-bg)" />
        <path
          d="M -20 310 Q 320 190 540 165 T 980 95 L 980 235 Q 580 265 310 355 L -20 390 Z"
          fill="url(#cas-milkyway)"
          opacity={1 - tRatio * 0.65}
        />

        <!-- 背景微光恒星点缀 -->
        <g fill="#cbd5e1" opacity={0.35 - tRatio * 0.15}>
          <circle cx="82" cy="64" r="1" />
          <circle cx="195" cy="52" r="1.2" />
          <circle cx="342" cy="78" r="0.9" />
          <circle cx="412" cy="308" r="1.1" />
          <circle cx="520" cy="68" r="1.3" />
          <circle cx="695" cy="88" r="1" />
          <circle cx="775" cy="296" r="1.2" />
          <circle cx="888" cy="254" r="0.9" />
          <circle cx="122" cy="294" r="1.1" />
          <circle cx="615" cy="128" r="0.8" />
        </g>

        <!-- 平面态（tRatio < 0.45）：显示天球赤经/赤纬淡网格 -->
        {#if tRatio < 0.6}
          <g opacity={(1 - tRatio * 1.6) * 0.28} stroke="#475569" stroke-width="1" stroke-dasharray="4 6">
            <line x1="60" y1="110" x2="900" y2="110" />
            <line x1="60" y1="200" x2="900" y2="200" />
            <line x1="60" y1="290" x2="900" y2="290" />
            <text x="72" y="103" fill="#94a3b8" font-size="10" stroke="none" font-family="var(--font-mono)">Dec +62°</text>
            <text x="72" y="193" fill="#94a3b8" font-size="10" stroke="none" font-family="var(--font-mono)">Dec +59°</text>
            <text x="72" y="283" fill="#94a3b8" font-size="10" stroke="none" font-family="var(--font-mono)">Dec +56°</text>
          </g>
        {/if}

        <!-- 纵深态（tRatio > 0.08）：显示光年距离标尺与地球观测基线 -->
        {#if tRatio > 0.05}
          <g opacity={Math.min(1, tRatio * 1.25)}>
            {#each [0, 100, 200, 300, 400, 500, 600] as ly (ly)}
              {@const yPos = 342 - (ly / 600) * 284}
              <line
                x1="78"
                y1={yPos}
                x2="912"
                y2={yPos}
                stroke={ly === 0 ? '#38bdf8' : '#334155'}
                stroke-width={ly === 0 ? 1.5 : 1}
                stroke-dasharray={ly === 0 ? 'none' : '3 5'}
                opacity={ly === 0 ? 0.65 : 0.55}
              />
              <text
                x="68"
                y={yPos + 4}
                text-anchor="end"
                fill={ly === 0 ? '#7dd3fc' : '#94a3b8'}
                font-size="10.5"
                font-family="var(--font-mono)"
              >
                {ly === 0 ? '地球 0 ly' : `${ly} ly`}
              </text>
            {/each}

            <!-- 底部地球观测视线束与标尺说明 -->
            {#each projectedStars as p (p.star.id)}
              <line
                x1={p.x}
                y1="342"
                x2={p.x}
                y2={p.y}
                stroke={p.star.color}
                stroke-width={p.idx === selectedIdx ? 2 : 1.1}
                stroke-dasharray="3 4"
                opacity={p.idx === selectedIdx ? 0.85 : 0.38}
              />
              <!-- 地球基线上的投影锚点 -->
              <circle cx={p.x} cy="342" r="3" fill="#38bdf8" opacity="0.7" />
            {/each}
          </g>
        {/if}

        <!-- 中国古代星官辅星与连线（在平面态下清晰显示，随三维倾角增大渐隐以免遮挡主星纵深标尺） -->
        {#if cultureMode === 'chinese' || cultureMode === 'both'}
          {@const cnOpacity = Math.max(0.15, 1 - tRatio * 0.82)}
          <g opacity={cnOpacity}>
            <!-- 王良五星车驾连线：β(0) - κ - η - α(1) - λ -->
            <polyline
              points={`${projectedStars[0].x},${projectedStars[0].y} 242,82 266,192 ${projectedStars[1].x},${projectedStars[1].y} 214,238 ${projectedStars[0].x},${projectedStars[0].y}`}
              fill="none"
              stroke="#fbbf24"
              stroke-width="1.4"
              stroke-dasharray="5 4"
              opacity="0.75"
            />
            {#each EXTRA_ASTERISM_STARS.wangliang as s (s.name)}
              <circle cx={s.x} cy={s.y} r="3.2" fill="#fde68a" opacity={1 - tRatio * 0.7} />
              <text
                x={s.x}
                y={s.y - 8}
                text-anchor="middle"
                fill="#fcd34d"
                font-size="10"
                opacity={1 - tRatio * 0.85}
              >{s.name}</text>
            {/each}

            <!-- 阁道六星飞栈连线：ι - ε(4) - δ(3) - θ - ν - ο -->
            <polyline
              points={`928,112 ${projectedStars[4].x},${projectedStars[4].y} ${projectedStars[3].x},${projectedStars[3].y} 582,318 504,342 438,364`}
              fill="none"
              stroke="#34d399"
              stroke-width="1.5"
              stroke-dasharray="5 4"
              opacity="0.78"
            />
            {#each EXTRA_ASTERISM_STARS.gedao as s (s.name)}
              <circle cx={s.x} cy={s.y} r="3.2" fill="#6ee7b7" opacity={1 - tRatio * 0.7} />
              <text
                x={s.x + 8}
                y={s.y + 4}
                fill="#6ee7b7"
                font-size="10"
                opacity={1 - tRatio * 0.85}
              >{s.name}</text>
            {/each}

            <!-- 星官区域古风铭牌 -->
            {#if tRatio < 0.45}
              <g opacity={1 - tRatio * 2.2}>
                <rect x="116" y="42" width="124" height="22" rx="6" fill="#451a03" fill-opacity="0.72" stroke="#f59e0b" stroke-width="0.8" />
                <text x="178" y="57" text-anchor="middle" fill="#fde68a" font-size="11" font-weight="600">【王良】四马御车</text>

                <rect x="414" y="88" width="108" height="22" rx="6" fill="#172554" fill-opacity="0.78" stroke="#60a5fa" stroke-width="0.8" />
                <text x="468" y="103" text-anchor="middle" fill="#bfdbfe" font-size="11" font-weight="600">【策】御马金鞭</text>

                <rect x="676" y="294" width="136" height="22" rx="6" fill="#064e3b" fill-opacity="0.75" stroke="#34d399" stroke-width="0.8" />
                <text x="744" y="309" text-anchor="middle" fill="#a7f3d0" font-size="11" font-weight="600">【阁道】紫微飞栈</text>
              </g>
            {/if}
          </g>
        {/if}

        <!-- 西方经典 W 折线 -->
        {#if cultureMode === 'western' || cultureMode === 'both'}
          <polyline
            points={wPolylinePoints}
            fill="none"
            stroke="#93c5fd"
            stroke-width={2.4 - tRatio * 0.7}
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity={0.88 - tRatio * 0.25}
          />
        {/if}

        <!-- 五颗主星本体与交互热区 -->
        {#each projectedStars as item (item.star.id)}
          {@const isSelected = item.idx === selectedIdx}
          <g
            class="star-node"
            class:selected={isSelected}
            transform={`translate(${item.x}, ${item.y})`}
            onclick={() => selectStar(item.idx)}
            role="button"
            tabindex="-1"
            aria-label={`查看 ${item.star.zhName}（${item.star.bayer}，距离 ${item.star.distanceLy} 光年）`}
          >
            <!-- 点击热区 -->
            <circle r="28" fill="transparent" />

            <!-- 选中呼吸光圈 -->
            {#if isSelected}
              <circle
                r={item.r + 11}
                fill="none"
                stroke={item.star.color}
                stroke-width="1.5"
                stroke-dasharray="3 3"
                class="pulse-ring"
              />
            {/if}

            <!-- 恒星外晕与星芒十字 -->
            <circle r={item.r * 1.95} fill={item.star.glowColor} opacity={isSelected ? 0.36 : 0.2} filter="url(#cas-glow)" />
            <line x1={-item.r * 2.1} y1="0" x2={item.r * 2.1} y2="0" stroke={item.star.color} stroke-width="1" opacity="0.65" />
            <line x1="0" y1={-item.r * 2.1} x2="0" y2={item.r * 2.1} stroke={item.star.color} stroke-width="1" opacity="0.65" />

            <!-- 恒星核心 -->
            <circle
              r={item.r}
              fill={item.star.color}
              stroke="#ffffff"
              stroke-width={isSelected ? 2 : 1}
            />

            <!-- 恒星名称与实时参数标签 -->
            <g transform={`translate(0, ${item.idx % 2 === 1 && tRatio < 0.4 ? 26 : -18})`}>
              <text
                text-anchor="middle"
                fill="#f8fafc"
                font-size="13"
                font-weight="700"
              >
                {item.star.zhName} ({item.star.greek})
              </text>
              <text
                y="15"
                text-anchor="middle"
                fill={isSelected ? '#7dd3fc' : '#94a3b8'}
                font-size="10.5"
                font-family="var(--font-mono)"
              >
                {tRatio > 0.3
                  ? `${item.star.distanceLy} ly · MV ${item.star.absoluteMag > 0 ? '+' : ''}${item.star.absoluteMag}`
                  : `${item.star.enName} · ${item.star.apparentMag}m`}
              </text>
            </g>
          </g>
        {/each}

        <!-- 右上角状态角标 -->
        <text x="936" y="28" text-anchor="end" fill="#94a3b8" font-size="11" font-family="var(--font-mono)">
          {tRatio < 0.15
            ? 'VIEW: SKY PROJECTION (RA 00h09m → 01h54m)'
            : tRatio > 0.85
              ? 'VIEW: GALACTIC RADIAL DEPTH (54.7 ly → 550 ly)'
              : `VIEW: 3D OBLIQUE PARALLAX (${Math.round(depthPitch * 0.9)}°)`}
        </text>
      </svg>
    </div>

  <!-- ════════════════════════════════════════════════════════════════
       模式 2：北天极周日视运动与寻星罗盘（W 与 M 的四季转换 + 北极星几何定位）
       ════════════════════════════════════════════════════════════════ -->
  {:else if activeTab === 'polar'}
    <div class="cas-toolbar">
      <div class="slider-group">
        <label for="cas-angle-slider" class="slider-label">
          <span>周日 / 四季星空旋转角</span>
          <strong class="tabular">{Math.round(skyAngle)}°</strong>
          <span class="slider-hint">{currentSeasonNote}</span>
        </label>
        <div class="slider-row">
          <input
            id="cas-angle-slider"
            type="range"
            min="0"
            max="360"
            step="1"
            bind:value={skyAngle}
            aria-label="拨动北天极星空旋转角度，观察仙后座在 M 形与 W 形之间的周日与四季变化"
          />
          <div class="season-btns">
            {#each SEASON_PRESETS as preset (preset.label)}
              <button
                type="button"
                class="preset-chip"
                class:active={Math.abs(skyAngle - preset.angle) < 12}
                onclick={() => (skyAngle = preset.angle)}
              >
                {preset.label.split(' · ')[0]}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="overlay-group">
        <button
          type="button"
          class="preset-chip"
          class:active={showGuideLines}
          onclick={() => (showGuideLines = !showGuideLines)}
        >
          寻极几何辅助线
        </button>
        <button
          type="button"
          class="preset-chip"
          class:active={showBigDipper}
          onclick={() => (showBigDipper = !showBigDipper)}
        >
          对照北斗七星
        </button>
      </div>
    </div>

    <div class="canvas-wrap">
      <svg viewBox="0 0 960 400" class="sky-svg">
        <rect width="960" height="400" rx="12" fill="url(#cas-sky-bg)" />

        <!-- 左侧：北天极旋转星盘 (中心 290, 196) -->
        <g transform="translate(290, 196)">
          <!-- 拱极周日轨迹同心圆 -->
          <circle r="168" fill="none" stroke="#1e293b" stroke-width="1.2" />
          <circle r="132" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="4 5" />
          <circle r="76" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="2 4" />

          <!-- 方位标 -->
          <text x="0" y="-175" text-anchor="middle" fill="#64748b" font-size="10.5" font-family="var(--font-mono)">天顶方向 (S)</text>
          <text x="0" y="185" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-family="var(--font-mono)">北方地平线 (N)</text>
          <text x="-182" y="4" text-anchor="end" fill="#64748b" font-size="10.5" font-family="var(--font-mono)">东 (E)</text>
          <text x="182" y="4" text-anchor="start" fill="#64748b" font-size="10.5" font-family="var(--font-mono)">西 (W)</text>

          <!-- 随地球自转/季节逆时针旋转的天球图层 -->
          <g transform={`rotate(${-skyAngle})`}>
            <!-- 仙后座寻北极星的几何夹角延长线 -->
            {#if showGuideLines}
              <!-- β-α 与 ε-δ 两侧外翼反向交汇，打开开口直指北极星 (0,0) -->
              <line
                x1="-38"
                y1="-146"
                x2="0"
                y2="0"
                stroke="#f59e0b"
                stroke-width="1.3"
                stroke-dasharray="4 4"
                opacity="0.75"
              />
              <line
                x1="36"
                y1="-142"
                x2="0"
                y2="0"
                stroke="#f59e0b"
                stroke-width="1.3"
                stroke-dasharray="4 4"
                opacity="0.75"
              />
              <line
                x1="-2"
                y1="-120"
                x2="0"
                y2="0"
                stroke="#38bdf8"
                stroke-width="1.5"
                stroke-dasharray="3 4"
                opacity="0.9"
              />
            {/if}

            <!-- 仙后座 W 折线 -->
            <polyline
              points={POLAR_CAS.map((s) => `${s.x},${s.y}`).join(' ')}
              fill="none"
              stroke="#93c5fd"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            {#each POLAR_CAS as s, idx (s.id)}
              <g
                class="star-node"
                transform={`translate(${s.x}, ${s.y})`}
                onclick={() => selectStar(idx)}
              >
                <circle r="14" fill="transparent" />
                {#if idx === selectedIdx}
                  <circle r={s.r + 5} fill="none" stroke={s.color} stroke-width="1.4" />
                {/if}
                <circle r={s.r} fill={s.color} stroke="#fff" stroke-width="1" />
                <text
                  transform={`rotate(${skyAngle})`}
                  y="-10"
                  text-anchor="middle"
                  fill="#e2e8f0"
                  font-size="10"
                  font-weight="600"
                >{s.label.split(' ')[0]}</text>
              </g>
            {/each}

            <!-- 北斗七星（与仙后座隔北极星遥遥相对） -->
            {#if showBigDipper}
              <g opacity="0.82">
                <polyline
                  points={POLAR_DIPPER.map((d) => `${d.x},${d.y}`).join(' ')}
                  fill="none"
                  stroke="#64748b"
                  stroke-width="1.8"
                />
                <!-- 天璇 -> 天枢延长 5 倍指北极星 -->
                {#if showGuideLines}
                  <line
                    x1="-34"
                    y1="150"
                    x2="0"
                    y2="0"
                    stroke="#94a3b8"
                    stroke-width="1.2"
                    stroke-dasharray="3 4"
                    opacity="0.7"
                  />
                {/if}
                {#each POLAR_DIPPER as d (d.name)}
                  <circle cx={d.x} cy={d.y} r="3.6" fill="#cbd5e1" />
                {/each}
                <text
                  x="25"
                  y="148"
                  transform={`rotate(${skyAngle}, 25, 148)`}
                  text-anchor="middle"
                  fill="#94a3b8"
                  font-size="10.5"
                >北斗七星</text>
              </g>
            {/if}
          </g>

          <!-- 圆心：北极星 Polaris（勾陈一） -->
          <circle r="11" fill="#fde047" opacity="0.22" />
          <circle r="5.5" fill="#fef08a" stroke="#ffffff" stroke-width="1.5" />
          <text x="12" y="4" fill="#fef08a" font-size="11.5" font-weight="700">北极星 (勾陈一)</text>
        </g>

        <!-- 右侧：北天指极几何原理说明卡 -->
        <g transform="translate(535, 44)">
          <rect width="390" height="312" rx="10" fill="#0f172a" fill-opacity="0.85" stroke="#1e293b" />
          <text x="22" y="34" fill="#f8fafc" font-size="14" font-weight="700">为什么仙后座有时是 M，有时是 W？</text>
          <text x="22" y="60" fill="#94a3b8" font-size="11.5">
            五颗主星的赤纬都在 +56° 至 +63° 之间，距离北天极不足 34°。
          </text>
          <text x="22" y="80" fill="#94a3b8" font-size="11.5">
            在中国绝大部分地区（北纬 34° 以北），它们终年不会落入地平线，
          </text>
          <text x="22" y="100" fill="#94a3b8" font-size="11.5">
            而是像钟表指针一样围绕北极星每天逆时针旋转一圈：
          </text>

          <line x1="22" y1="118" x2="368" y2="118" stroke="#1e293b" />

          <circle cx="32" cy="142" r="4" fill="#ffb464" />
          <text x="44" y="146" fill="#e2e8f0" font-size="12" font-weight="600">秋冬之交（10月 ~ 12月 夜晚）</text>
          <text x="44" y="166" fill="#94a3b8" font-size="11">
            北斗七星沉在北方地平线附近，容易被山峦或楼房遮挡。此时仙后座
          </text>
          <text x="44" y="184" fill="#94a3b8" font-size="11">
            恰好升至北极星正上方，呈醒目的“M”形，接替北斗成为寻北路标。
          </text>

          <circle cx="32" cy="214" r="4" fill="#8ec5ff" />
          <text x="44" y="218" fill="#e2e8f0" font-size="12" font-weight="600">仙后座几何锁极法</text>
          <text x="44" y="238" fill="#94a3b8" font-size="11">
            将两端外翼（王良一至王良四、阁道二至阁道三）向开口前方延伸交汇，
          </text>
          <text x="44" y="256" fill="#94a3b8" font-size="11">
            由交点穿过中央“策（γ）”向开口正前方延伸约 5 倍折线深度，即达北极星。
          </text>

          <rect x="22" y="272" width="346" height="26" rx="6" fill="#172554" fill-opacity="0.65" />
          <text x="34" y="289" fill="#93c5fd" font-size="10.5" font-family="var(--font-mono)">
            当前天球姿态：{SEASON_PRESETS.find((p) => Math.abs(skyAngle - p.angle) < 45)?.note ?? currentSeasonNote}
          </text>
        </g>
      </svg>
    </div>

  <!-- ════════════════════════════════════════════════════════════════
       模式 3：五曜恒星物理剖面（体积尺度、表面温标与高速自转扁球体）
       ════════════════════════════════════════════════════════════════ -->
  {:else}
    <div class="cas-toolbar">
      <div class="slider-group">
        <span class="slider-label">
          <span>恒星天体物理与赤道扁率实验室</span>
          <span class="slider-hint">（点击任意恒星对比其与太阳的温度、体积及离心变形）</span>
        </span>
      </div>
      <div class="overlay-group">
        <button
          type="button"
          class="preset-chip"
          class:active={compareWithSun}
          onclick={() => (compareWithSun = !compareWithSun)}
        >
          显示太阳 (1 R☉ / 5,778 K) 参照
        </button>
      </div>
    </div>

    <div class="canvas-wrap">
      <svg viewBox="0 0 960 400" class="sky-svg">
        <rect width="960" height="400" rx="12" fill="url(#cas-sky-bg)" />

        <!-- 左半区：五颗主星真实半径与自转扁球比例排队 -->
        <text x="32" y="34" fill="#f8fafc" font-size="13.5" font-weight="700">
          1 · 恒星真实半径与赤道离心隆起对比（单位：太阳半径 R☉）
        </text>
        <text x="32" y="54" fill="#94a3b8" font-size="11">
          王良四（α）膨胀至 43.1 R☉；而居中的“策（γ）”因每秒 432 公里极速自转，赤道被甩成扁球并抛射出高温电离气体环。
        </text>

        <!-- 基线 -->
        <line x1="32" y1="228" x2="572" y2="228" stroke="#334155" stroke-width="1" stroke-dasharray="3 4" />

        <!-- 太阳参照点 -->
        {#if compareWithSun}
          <g transform="translate(64, 228)">
            <circle r="3.2" fill="#fde047" />
            <text y="24" text-anchor="middle" fill="#fde047" font-size="10.5" font-weight="600">太阳</text>
            <text y="38" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="var(--font-mono)">1.0 R☉</text>
          </g>
        {/if}

        {#each CASSIOPEIA_STARS as star, idx (star.id)}
          {@const cx = 148 + idx * 98}
          {@const eqR = star.id === 'alpha' ? 56 : Math.max(11, star.radiusSolar * 2.5)}
          {@const polR = eqR * (star.polarRadiusSolar / star.radiusSolar)}
          {@const isSel = idx === selectedIdx}
          <g
            class="star-node"
            transform={`translate(${cx}, 228)`}
            onclick={() => selectStar(idx)}
          >
            <rect x="-46" y="-85" width="92" height="165" fill="transparent" />
            {#if isSel}
              <ellipse
                rx={eqR + 8}
                ry={polR + 8}
                fill="none"
                stroke={star.color}
                stroke-width="1.4"
                stroke-dasharray="3 3"
              />
            {/if}

            <!-- 策 (γ Cas) 专属的赤道抛射气体盘 (Decretion disk) -->
            {#if star.id === 'gamma'}
              <ellipse
                rx={eqR * 1.95}
                ry={polR * 0.38}
                fill="none"
                stroke="#60a5fa"
                stroke-width="4"
                opacity="0.45"
                filter="url(#cas-glow)"
              />
              <ellipse
                rx={eqR * 1.75}
                ry={polR * 0.26}
                fill="none"
                stroke="#e0f2fe"
                stroke-width="1.3"
                opacity="0.85"
              />
            {/if}

            <!-- 恒星椭圆体（真实还原赤道与极半径之比） -->
            <ellipse
              rx={eqR}
              ry={polR}
              fill={star.color}
              fill-opacity={isSel ? 0.95 : 0.78}
              stroke="#ffffff"
              stroke-width={isSel ? 2 : 1}
            />

            <text y={Math.max(58, polR + 20)} text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">
              {star.zhName}
            </text>
            <text y={Math.max(58, polR + 20) + 16} text-anchor="middle" fill="#7dd3fc" font-size="10" font-family="var(--font-mono)">
              {star.radiusSolar} R☉
            </text>
            <text y={Math.max(58, polR + 20) + 30} text-anchor="middle" fill="#94a3b8" font-size="9.5" font-family="var(--font-mono)">
              {star.rotationKmS} km/s
            </text>
          </g>
        {/each}

        <!-- 右半区：表面有效温度与光度对数坐标（简易赫罗图） -->
        <g transform="translate(604, 28)">
          <rect width="328" height="344" rx="10" fill="#0f172a" fill-opacity="0.88" stroke="#1e293b" />
          <text x="18" y="28" fill="#f8fafc" font-size="13" font-weight="700">2 · 光谱色温与光度位置 (H-R 图)</text>
          <text x="18" y="46" fill="#94a3b8" font-size="10.5">横轴：表面温度（左热右冷）· 纵轴：光度 L☉</text>

          <!-- H-R 图坐标框 (x: 42..304, y: 68..296) -->
          <line x1="42" y1="296" x2="306" y2="296" stroke="#475569" stroke-width="1.2" />
          <line x1="42" y1="68" x2="42" y2="296" stroke="#475569" stroke-width="1.2" />

          <!-- 纵轴光度刻度 -->
          {#each [
            { label: '10⁵ L☉', y: 78 },
            { label: '10³ L☉', y: 150 },
            { label: '10¹ L☉', y: 222 },
            { label: '1 L☉', y: 278 },
          ] as tick (tick.label)}
            <line x1="42" y1={tick.y} x2="304" y2={tick.y} stroke="#1e293b" stroke-dasharray="2 3" />
            <text x="38" y={tick.y + 3} text-anchor="end" fill="#64748b" font-size="9" font-family="var(--font-mono)">
              {tick.label}
            </text>
          {/each}

          <!-- 横轴温度刻度（左高右低：30,000K -> 4,000K） -->
          {#each [
            { label: '25,000K (B)', x: 66 },
            { label: '10,000K (A)', x: 156 },
            { label: '6,500K (F)', x: 222 },
            { label: '4,500K (K)', x: 282 },
          ] as tTick (tTick.label)}
            <text x={tTick.x} y="314" text-anchor="middle" fill="#64748b" font-size="8.8" font-family="var(--font-mono)">
              {tTick.label}
            </text>
          {/each}

          {#if compareWithSun}
            <circle cx="242" cy="278" r="4" fill="#fde047" />
            <text x="242" y="268" text-anchor="middle" fill="#fde047" font-size="9.5">太阳 (G2V)</text>
          {/if}

          <!-- 绘制五颗星在 H-R 图上的位置 -->
          {#each CASSIOPEIA_STARS as s, idx (s.id)}
            {@const hrX =
              s.id === 'gamma'
                ? 68
                : s.id === 'epsilon'
                  ? 118
                  : s.id === 'delta'
                    ? 192
                    : s.id === 'beta'
                      ? 218
                      : 282}
            {@const hrY = 278 - Math.log10(s.luminositySolar) * 36}
            <g
              class="star-node"
              transform={`translate(${hrX}, ${hrY})`}
              onclick={() => selectStar(idx)}
            >
              <circle r="14" fill="transparent" />
              {#if idx === selectedIdx}
                <circle r="10" fill="none" stroke={s.color} stroke-width="1.5" />
              {/if}
              <circle r="5.5" fill={s.color} stroke="#fff" stroke-width="1" />
              <text
                y={s.id === 'delta' ? 16 : -9}
                text-anchor="middle"
                fill="#f8fafc"
                font-size="10"
                font-weight="600"
              >{s.zhName}</text>
            </g>
          {/each}

          <text x="174" y="334" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="var(--font-mono)">
            当前选中：{activeStar.zhName} · {activeStar.temperatureK.toLocaleString()} K · {activeStar.luminositySolar.toLocaleString()} L☉
          </text>
        </g>
      </svg>
    </div>
  {/if}

  <!-- 底部五曜快速切换胶囊与当前恒星深度档案卡 -->
  <div class="cas-selector" role="tablist" aria-label="选择仙后座五颗主星查看详细档案">
    {#each CASSIOPEIA_STARS as star, idx (star.id)}
      <button
        type="button"
        role="tab"
        class="star-pill"
        class:active={idx === selectedIdx}
        aria-selected={idx === selectedIdx}
        onclick={() => selectStar(idx)}
      >
        <span class="star-dot" style={`background:${star.color};box-shadow:0 0 8px ${star.glowColor}`}></span>
        <span class="pill-zh">{star.zhName}</span>
        <span class="pill-bayer">{star.bayer}</span>
        <span class="pill-dist tabular">{star.distanceLy} ly</span>
      </button>
    {/each}
  </div>

  <!-- 当前选中主星的双栏详尽档案 -->
  <footer class="cas-dossier" aria-live="polite">
    <div class="dossier-head">
      <div class="dossier-title-group">
        <span class="dossier-swatch" style={`background:${activeStar.color}`}></span>
        <h4 class="dossier-name">
          {activeStar.zhName}
          <small>{activeStar.bayer} · {activeStar.enName}</small>
        </h4>
        <span class="dossier-tag">{activeStar.zhAsterism}</span>
        <span class="dossier-tag">{activeStar.evolutionStage}</span>
      </div>
      <p class="dossier-headline">{activeStar.headline}</p>
    </div>

    <div class="dossier-metrics">
      <div class="metric-cell">
        <span class="m-label">距离地球</span>
        <strong class="m-val tabular">{activeStar.distanceLy} ± {activeStar.distanceErr} 光年</strong>
        <span class="m-sub">视差法折合 {activeStar.distancePc} 秒差距</span>
      </div>
      <div class="metric-cell">
        <span class="m-label">视星等 / 绝对星等</span>
        <strong class="m-val tabular">{activeStar.apparentMag}m / {activeStar.absoluteMag > 0 ? '+' : ''}{activeStar.absoluteMag}M</strong>
        <span class="m-sub">{activeStar.magNote}</span>
      </div>
      <div class="metric-cell">
        <span class="m-label">光谱型与表面温度</span>
        <strong class="m-val tabular">{activeStar.spectralType} · {activeStar.temperatureK.toLocaleString()} K</strong>
        <span class="m-sub">{activeStar.tempNote}</span>
      </div>
      <div class="metric-cell">
        <span class="m-label">物理尺度与自转</span>
        <strong class="m-val tabular">{activeStar.radiusSolar} R☉ · {activeStar.luminositySolar.toLocaleString()} L☉</strong>
        <span class="m-sub">质量 {activeStar.massSolar} M☉ · 自转 {activeStar.rotationKmS} km/s</span>
      </div>
    </div>

    <div class="dossier-prose">
      <div class="prose-col">
        <span class="col-kicker">天体物理画像</span>
        <p>{activeStar.summary}</p>
      </div>
      <div class="prose-col">
        <span class="col-kicker">中西星象与文献考据（{activeStar.enMeaning}）</span>
        <p>{activeStar.lore}</p>
      </div>
    </div>
  </footer>
</section>

<style>
  .cas-lab {
    --ink: var(--cat-essays, var(--accent));
    margin-block: 1.8rem;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 88%, var(--bg));
    font-family: var(--font-sans);
    overflow: hidden;
  }

  .cas-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem 1rem;
    padding: 0.85rem 1.1rem;
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface-2) 50%, transparent);
  }
  .cas-brand {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .cas-badge {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--ink);
  }
  .cas-title {
    margin: 0 !important;
    padding: 0 !important;
    font-family: var(--font-serif);
    font-size: 1.02rem !important;
    font-weight: 800;
    color: var(--fg);
  }

  .cas-tabs {
    display: inline-flex;
    flex-wrap: wrap;
    padding: 3px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--surface);
    gap: 2px;
  }
  .cas-tabs button {
    height: 1.75rem;
    padding-inline: 0.7rem;
    border-radius: 7px;
    font-size: 0.75rem;
    color: var(--fg-muted);
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }
  .cas-tabs button:hover {
    color: var(--fg);
  }
  .cas-tabs button[aria-selected='true'] {
    background: var(--surface-2);
    color: var(--fg);
    font-weight: 600;
  }

  /* 工具控制条 */
  .cas-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.2rem;
    padding: 0.75rem 1.1rem;
    border-bottom: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 60%, transparent);
  }
  .slider-group {
    flex: 1 1 20rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .slider-label {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--fg);
  }
  .slider-label strong {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink);
  }
  .slider-hint {
    font-size: 0.73rem;
    color: var(--fg-muted);
  }
  .slider-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem;
  }
  .slider-row input[type='range'] {
    flex: 1 1 10rem;
    accent-color: var(--ink);
    cursor: pointer;
  }
  .season-btns {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .overlay-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .group-caption {
    font-size: 0.73rem;
    color: var(--fg-subtle);
  }
  .preset-chip {
    height: 1.65rem;
    padding-inline: 0.6rem;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: var(--surface);
    font-size: 0.72rem;
    color: var(--fg-muted);
    transition:
      border-color 140ms ease,
      background-color 140ms ease,
      color 140ms ease;
  }
  .preset-chip:hover {
    border-color: var(--line-strong);
    color: var(--fg);
  }
  .preset-chip.active {
    border-color: color-mix(in oklab, var(--ink) 55%, var(--line));
    background: color-mix(in oklab, var(--ink) 12%, var(--surface));
    color: var(--fg);
    font-weight: 600;
  }

  /* 星空画布区 */
  .canvas-wrap {
    padding: 0.75rem 0.9rem 0.5rem;
    outline: none;
  }
  @media (width < 42rem) {
    .canvas-wrap {
      overflow-x: auto;
      overscroll-behavior-x: contain;
    }
  }
  .canvas-wrap:focus-visible {
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  .sky-svg {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 10px;
    user-select: none;
  }
  @media (width < 42rem) {
    .sky-svg {
      min-width: 38rem;
    }
  }

  .star-node {
    cursor: pointer;
  }
  .pulse-ring {
    animation: cas-spin 10s linear infinite;
    transform-origin: center;
  }
  @keyframes cas-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 五曜切换胶囊条 */
  .cas-selector {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.45rem;
    padding: 0.5rem 0.9rem 0.75rem;
  }
  @media (width < 42rem) {
    .cas-selector {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .star-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    border-radius: 9px;
    border: 1px solid var(--line);
    background: var(--surface);
    text-align: left;
    transition:
      border-color 150ms ease,
      background-color 150ms ease,
      transform 150ms ease;
  }
  .star-pill:hover {
    border-color: var(--line-strong);
  }
  .star-pill.active {
    border-color: color-mix(in oklab, var(--ink) 65%, var(--line));
    background: color-mix(in oklab, var(--ink) 9%, var(--surface));
  }
  .star-dot {
    width: 0.58rem;
    height: 0.58rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .pill-zh {
    font-family: var(--font-serif);
    font-size: 0.84rem;
    font-weight: 800;
    color: var(--fg);
  }
  .pill-bayer {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-subtle);
  }
  .pill-dist {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--fg-muted);
  }

  /* 底部主星档案卡 */
  .cas-dossier {
    padding: 0.95rem 1.1rem 1.1rem;
    border-top: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface-2) 38%, var(--surface));
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .dossier-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.45rem 1rem;
  }
  .dossier-title-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
  }
  .dossier-swatch {
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 999px;
  }
  .dossier-name {
    margin: 0 !important;
    font-family: var(--font-serif);
    font-size: 1.08rem !important;
    font-weight: 800;
    color: var(--fg);
  }
  .dossier-name small {
    margin-left: 0.35rem;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: 500;
    color: var(--fg-muted);
  }
  .dossier-tag {
    padding: 0.1rem 0.48rem;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--surface);
    font-size: 0.69rem;
    color: var(--fg-muted);
  }
  .dossier-headline {
    margin: 0 !important;
    text-indent: 0 !important;
    font-family: var(--font-serif);
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--ink);
  }

  .dossier-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
  }
  @media (width < 48rem) {
    .dossier-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .metric-cell {
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 0.14rem;
  }
  .m-label {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    color: var(--fg-subtle);
  }
  .m-val {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--fg);
  }
  .m-sub {
    font-size: 0.68rem;
    color: var(--fg-muted);
    line-height: 1.35;
  }

  .dossier-prose {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }
  @media (width < 42rem) {
    .dossier-prose {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .prose-col {
    padding: 0.65rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in oklab, var(--surface) 75%, transparent);
  }
  .col-kicker {
    display: block;
    margin-bottom: 0.28rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    font-weight: 600;
    color: var(--fg-subtle);
  }
  .prose-col p {
    margin: 0 !important;
    text-indent: 0 !important;
    text-align: left !important;
    font-size: 0.8rem;
    line-height: 1.68;
    color: var(--fg-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse-ring {
      animation: none;
    }
  }
</style>
