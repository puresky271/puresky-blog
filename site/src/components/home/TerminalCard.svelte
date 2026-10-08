<script lang="ts">
  /**
   * TerminalCard.svelte — 首页的打字机终端。
   *
   * 不是装饰：每一条都是站点此刻的真实状态，轮流打出来：
   *   fortune            一句名言（src/data/quotes.json）
   *   cat latest.md      最新一篇文章的标题，打完变成链接
   *   git log -1         最近一次 GitHub 公开动态
   *   weather 沈阳       此刻的天气与时段
   *   now-playing        正在播放的歌（没在播放时跳过这一条）
   *
   * 先打命令，再打输出，停留一会儿后删掉输出，换下一条。不在视口或标签页隐藏时暂停。
   * 减少动态效果时不逐字打，直接显示，每 8 秒换一条。
   *
   * 标题栏是三盏状态灯（参照 mygo_chat 首页输入栏）：每条内容属于一类，亮对应的那盏。
   *   words  蓝   一句话（名言）
   *   site   青   站内（最新文章、正在播放）
   *   live   绿   实时（GitHub 动态、天气）
   * 亮着的灯打字时快速脉动，停留时慢呼吸，擦除时熄下去；右侧路径跟着换成这一条的来处。
   */
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  import quotes from '@/data/quotes.json';
  import { WEATHER } from '@/config';
  import { postPath } from '@/lib/format';
  import { githubLive } from '@/lib/github-live.svelte';
  import { player } from '@/lib/player/store.svelte';
  import { getAmbient, PHASE_LABEL, startAmbient } from '@/lib/sky/ambient';
  import { eraseText, holdFor, sleep, typeText, type Token } from '@/lib/typewriter';

  type Kind = 'words' | 'site' | 'live';

  interface Entry {
    kind: Kind;
    /** 标题栏右侧显示的「来处」。 */
    path: string;
    command: string;
    output: string;
    /** 输出下方的小字，例如名言的出处。 */
    note?: string;
    href?: string;
  }

  let { latest, user }: { latest: { id: string; title: string } | null; user: string } = $props();

  let command = $state('');
  let output = $state('');
  let note = $state('');
  let href = $state<string | undefined>(undefined);
  let phase = $state<'command' | 'output' | 'hold' | 'erase' | 'idle'>('idle');
  let kind = $state<Kind | null>(null);
  let path = $state('');
  let root = $state<HTMLElement>();

  const prompt = $derived(`${user}@sky`);
  let quoteIndex = Math.floor(Math.random() * quotes.length);
  let channel = 0;

  function nextEntry(): Entry {
    const channels: (() => Entry | null)[] = [
      () => {
        const q = quotes[quoteIndex++ % quotes.length];
        return { kind: 'words', path: '~/fortune', command: 'fortune', output: q.text, note: `- ${q.author}` };
      },
      () =>
        latest
          ? { kind: 'site', path: '~/posts/latest.md', command: 'cat ~/posts/latest.md | head -1', output: latest.title, href: postPath(latest.id) }
          : null,
      () => {
        const event = githubLive.data?.events[0];
        if (!event) return { kind: 'live', path: `~/github/${user}`, command: 'git log -1', output: '最近没有公开的提交。' };
        const repo = event.repo.split('/')[1] ?? event.repo;
        return {
          kind: 'live',
          path: `~/github/${repo}`,
          command: 'git log -1 --oneline',
          output: `${event.title} · ${repo}`,
          note: event.detail ?? undefined,
          href: event.url,
        };
      },
      () => {
        const ambient = getAmbient();
        const report = ambient.report;
        const weather = report && !ambient.preview ? `${report.label}${report.temperature !== null ? ` ${report.temperature}°C` : ''}，` : '';
        return { kind: 'live', path: '~/sky/shenyang', command: `weather ${WEATHER.name}`, output: `${weather}${PHASE_LABEL[ambient.phase]}` };
      },
      () => {
        if (!player.started || !player.track) return null;
        return {
          kind: 'site',
          path: '~/player/now-playing',
          command: 'now-playing',
          output: `${player.track.name} - ${player.track.artists.join(' / ')}`,
        };
      },
    ];
    // 轮流取，跳过当前没有内容的频道。
    for (let i = 0; i < channels.length; i += 1) {
      const entry = channels[channel++ % channels.length]();
      if (entry) return entry;
    }
    return { kind: 'words', path: '~', command: 'echo', output: 'hello' };
  }

  onMount(() => {
    startAmbient();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let token: Token = { cancelled: false };
    let visible = true;

    async function run(current: Token) {
      while (!current.cancelled) {
        const entry = nextEntry();
        href = undefined;
        note = '';
        kind = entry.kind;
        path = entry.path;
        if (reduced) {
          command = entry.command;
          output = entry.output;
          note = entry.note ?? '';
          href = entry.href;
          phase = 'hold';
          if (!(await sleep(8000, current))) return;
          continue;
        }
        command = '';
        output = '';
        phase = 'command';
        if (!(await typeText(entry.command, (v) => (command = v), current, 0.7))) return;
        if (!(await sleep(320, current))) return;
        phase = 'output';
        if (!(await typeText(entry.output, (v) => (output = v), current))) return;
        note = entry.note ?? '';
        href = entry.href;
        phase = 'hold';
        if (!(await sleep(holdFor(entry.output), current))) return;
        note = '';
        href = undefined;
        phase = 'erase';
        if (!(await eraseText(entry.output, (v) => (output = v), current))) return;
        phase = 'idle';
        if (!(await sleep(260, current))) return;
      }
    }

    function restart() {
      token.cancelled = true;
      token = { cancelled: false };
      void run(token);
    }

    const io = new IntersectionObserver(([e]) => {
      const now = e.isIntersecting;
      if (now && !visible && !document.hidden) restart();
      if (!now) token.cancelled = true;
      visible = now;
    });
    io.observe(root!);
    const onVisibility = () => {
      if (document.hidden) token.cancelled = true;
      else if (visible) restart();
    };
    document.addEventListener('visibilitychange', onVisibility);
    void run(token);

    return () => {
      token.cancelled = true;
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<div class="terminal card" bind:this={root} aria-label="站点状态">
  <div class="bar" aria-hidden="true" data-kind={kind} data-phase={phase}>
    <span class="lights">
      <i class="light words"></i><i class="light site"></i><i class="light live"></i>
    </span>
    {#key path}
      <span class="path" in:fade={{ duration: 260 }}>{path || `~/${user}/status`}</span>
    {/key}
  </div>
  <div class="screen" aria-live="polite" aria-atomic="true">
    <p class="line">
      <span class="prompt">{prompt}</span><span class="sep">:~$</span>
      <span class="cmd">{command}</span>{#if phase === 'command'}<span class="caret typing"></span>{/if}
    </p>
    <p class="out">
      {#if href && phase === 'hold'}
        <a {href} class="out-link" target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{output}</a>
      {:else}
        {output}
      {/if}{#if phase === 'output' || phase === 'hold' || phase === 'erase'}<span class="caret" class:typing={phase !== 'hold'}></span>{/if}
    </p>
    {#if note}<p class="note">{note}</p>{/if}
  </div>
</div>

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-mono);
    background: color-mix(in oklab, var(--surface) 88%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 2.4rem;
    padding-inline: 0.9rem;
    border-bottom: 1px solid var(--line);
  }
  /* 三盏状态灯。熄着时是一点淡淡的颜色，亮的那盏带一圈光晕并呼吸。 */
  .lights {
    display: flex;
    gap: 7px;
  }
  .light {
    --c: var(--accent);
    position: relative;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: linear-gradient(180deg, color-mix(in oklab, var(--c) 70%, white), var(--c));
    opacity: 0.22;
    filter: saturate(0.6);
    transform: scale(0.9);
    transition:
      opacity 260ms ease,
      filter 260ms ease,
      transform 360ms var(--ease-spring);
  }
  .light.site {
    --c: oklch(0.72 0.12 210);
  }
  .light.live {
    --c: oklch(0.72 0.15 158);
  }
  .light::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    background: radial-gradient(closest-side, color-mix(in oklab, var(--c) 55%, transparent), transparent);
    opacity: 0;
  }
  .bar[data-kind='words'] .words,
  .bar[data-kind='site'] .site,
  .bar[data-kind='live'] .live {
    opacity: 1;
    filter: none;
    transform: scale(1);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.35);
  }
  /* 停留：慢呼吸。 */
  .bar[data-kind='words'][data-phase='hold'] .words::after,
  .bar[data-kind='site'][data-phase='hold'] .site::after,
  .bar[data-kind='live'][data-phase='hold'] .live::after {
    animation: halo 2.4s ease-in-out infinite;
  }
  /* 打字：快速脉动。 */
  .bar[data-kind='words']:is([data-phase='command'], [data-phase='output']) .words::after,
  .bar[data-kind='site']:is([data-phase='command'], [data-phase='output']) .site::after,
  .bar[data-kind='live']:is([data-phase='command'], [data-phase='output']) .live::after {
    animation: halo 760ms ease-in-out infinite;
  }
  /* 擦除和换条的间隙：灯熄下去一半。 */
  .bar:is([data-phase='erase'], [data-phase='idle']) .light {
    opacity: 0.45;
    transform: scale(0.94);
  }
  @keyframes halo {
    0%,
    100% {
      opacity: 0.15;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.25);
    }
  }
  .path {
    font-size: 0.75rem;
    color: var(--fg-subtle);
  }
  /* 固定高度：输出长短变化时卡片不跳。 */
  .screen {
    height: 10.5rem;
    padding: 1rem 1.1rem;
    font-size: 0.8625rem;
    line-height: 1.75;
    overflow: hidden;
  }
  .line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .prompt {
    color: var(--accent);
  }
  .sep {
    margin-right: 0.6em;
    color: var(--fg-subtle);
  }
  .cmd {
    color: var(--fg);
  }
  .out {
    margin-top: 0.5rem;
    color: var(--fg);
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    line-height: 1.75;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .out-link {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklab, var(--accent) 45%, transparent);
    text-underline-offset: 0.22em;
  }
  .out-link:hover {
    color: var(--accent);
  }
  .note {
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* 块状光标：打字时硬闪，停留时呼吸。 */
  .caret {
    display: inline-block;
    width: 0.5em;
    height: 1.05em;
    margin-left: 2px;
    vertical-align: -0.15em;
    background: var(--accent);
    animation: breathe 2.4s ease-in-out infinite;
  }
  .caret.typing {
    animation: blink 900ms steps(1, end) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  @keyframes breathe {
    0%,
    100% {
      opacity: 0.32;
    }
    50% {
      opacity: 0.96;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .caret,
    .caret.typing,
    .light::after {
      animation: none !important;
      opacity: 0.72;
    }
  }
</style>
