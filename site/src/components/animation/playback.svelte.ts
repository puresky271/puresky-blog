export function createPlayback(total: () => number) {
  let index = $state(0);
  let playing = $state(false);
  let speed = $state(1);
  const atEnd = $derived(index >= total() - 1);

  $effect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (atEnd) playing = false;
      else index++;
    }, 900 / speed);
    return () => window.clearInterval(timer);
  });

  function goTo(value: number) {
    playing = false;
    index = Math.max(0, Math.min(total() - 1, value));
  }

  return {
    get index() { return index; },
    get playing() { return playing; },
    get speed() { return speed; },
    set speed(value: number) { speed = value; },
    get atEnd() { return atEnd; },
    goTo,
    previous() { goTo(index - 1); },
    next() { goTo(index + 1); },
    reset() { goTo(0); },
    toggle() {
      if (atEnd) index = 0;
      playing = !playing;
    },
  };
}

export type Playback = ReturnType<typeof createPlayback>;
