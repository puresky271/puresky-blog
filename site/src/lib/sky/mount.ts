/**
 * mount.ts — 把页面上的 canvas[data-sky] 挂成粒子场。
 *
 * 在 astro:page-load 时调用（首次加载和每次站内跳转都会触发），
 * 在 astro:before-swap 时把当前页的粒子场全部拆掉，不让旧页面的动画循环残留。
 */

import { currentTheme } from '@/lib/theme';

import { getAmbient, startAmbient, type Ambient } from './ambient';
import { SkyField } from './field';

interface Mounted {
  field: SkyField;
  cleanup: () => void;
}

const mounted = new Set<Mounted>();

export function mountSkyFields(): void {
  startAmbient();
  const canvases = document.querySelectorAll<HTMLCanvasElement>('canvas[data-sky]:not([data-sky-ready])');
  canvases.forEach((canvas) => {
    canvas.dataset.skyReady = '';
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    let field: SkyField;
    try {
      const ambient = getAmbient();
      field = new SkyField(
        canvas,
        currentTheme(),
        { phase: ambient.phase, weather: ambient.weather, intensity: ambient.intensity },
        {
          density: Number(canvas.dataset.density || 1.2) * (coarse ? 0.7 : 1),
          interactive: canvas.dataset.interactive !== 'false' && !coarse,
          still,
        }
      );
    } catch {
      return;
    }

    // 指针事件挂在宿主元素上：canvas 本身 pointer-events: none，不挡下面的链接和按钮。
    const host = canvas.closest<HTMLElement>('[data-sky-host]') ?? canvas.parentElement!;
    let visible = false;

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      field.pointerMove(event.clientX - rect.left, event.clientY - rect.top);
    };
    const onLeave = () => field.pointerLeave();
    const onDown = (event: PointerEvent) => {
      // 点在链接、按钮、输入框上时不迸粒子，那是用户在做别的事。
      if ((event.target as Element).closest('a, button, input, textarea, select, [role="button"]')) return;
      const rect = canvas.getBoundingClientRect();
      field.burst(event.clientX - rect.left, event.clientY - rect.top);
    };
    const onTheme = (event: Event) => {
      field.setTheme((event as CustomEvent<{ theme: 'light' | 'dark' }>).detail.theme);
    };
    const onAmbient = (event: Event) => {
      const { phase, weather, intensity } = (event as CustomEvent<Ambient>).detail;
      field.setScene({ phase, weather, intensity });
    };
    const onVisibility = () => {
      if (document.hidden) field.stop();
      else if (visible) field.start();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) field.start();
      else field.stop();
    });
    io.observe(canvas);

    let resizeFrame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => field.resize());
    });
    ro.observe(canvas);

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('theme:change', onTheme);
    window.addEventListener('ambient:change', onAmbient);
    document.addEventListener('visibilitychange', onVisibility);

    mounted.add({
      field,
      cleanup: () => {
        io.disconnect();
        ro.disconnect();
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        host.removeEventListener('pointerdown', onDown);
        window.removeEventListener('theme:change', onTheme);
        window.removeEventListener('ambient:change', onAmbient);
        document.removeEventListener('visibilitychange', onVisibility);
      },
    });
  });
}

export function unmountSkyFields(): void {
  for (const entry of mounted) {
    entry.field.destroy();
    entry.cleanup();
  }
  mounted.clear();
}
