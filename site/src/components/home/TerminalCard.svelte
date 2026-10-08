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
   */
  import { onMount } from 'svelte';

  import quotes from '@/data/quotes.json';
  import { WEATHER } from '@/config';
  import { postPath } from '@/lib/format';
  import { githubLive } from '@/lib/github-live.svelte';
  import { player } from '@/lib/player/store.svelte';
  import { getAmbient, PHASE_LABEL, startAmbient } from '@/lib/sky/ambient';
  import { eraseText, holdFor, sleep, typeText, type Token } from '@/lib/typewriter';

  interface Entry {
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
  let phase = $state<'command' | 'output' | 'hold' | 'idle'>('idle');
  let root = $state<HTMLElement>();

  const prompt = $derived(`${user}@sky`);
  let quoteIndex = Math.floor(Math.random() * quotes.length);
  let channel = 0;

  function nextEntry(): Entry {
    const channels: (() => Entry | null)[] = [
      () => {
        const q = quotes[quoteIndex++ % quotes.length];
        return { command: 'fortune', output: q.text, note: `- ${q.author}` };
      },
      () => (latest ? { command: 'cat ~/posts/latest.md | head -1', output: latest.title, href: postPath(latest.id) } : null),
      () => {
        const event = githubLive.data?.events[0];
        if (!event) return { command: 'git log -1', output: '最近没有公开的提交。' };
        const repo = event.repo.split('/')[1] ?? event.repo;
        return { command: 'git log -1 --oneline', output: `${event.title} · ${repo}`, note: event.detail ?? undefined, href: event.url };
      },
      () => {
        const ambient = getAmbient();
        const report = ambient.report;
        const weather = report && !ambient.preview ? `${report.label}${report.temperature !== null ? ` ${report.temperature}°C` : ''}，` : '';
        return { command: `weather ${WEATHER.name}`, output: `${weather}${PHASE_LABEL[ambient.phase]}` };
      },
      () => {
        if (!player.started || !player.track) return null;
        return { command: 'now-playing', output: `${player.track.name} - ${player.track.artists.join(' / ')}` };
      },
    ];
    // 轮流取，跳过当前没有内容的频道。
    for (let i = 0; i < channels.length; i += 1) {
      const entry = channels[channel++ % channels.length]();
      if (entry) return entry;
    }
    return { command: 'echo', output: 'hello' };
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
        phase = 'output';
        if (!(await eraseText(entry.output, (v) => (output = v), current))) return;
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
  <div class="bar" aria-hidden="true">
    <span class="dots"><i></i><i></i><i></i></span>
    <span class="path">~/{user}/status</span>
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
      {/if}{#if phase === 'output' || phase === 'hold'}<span class="caret" class:typing={phase === 'output'}></span>{/if}
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
  .dots {
    display: flex;
    gap: 6px;
  }
  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--line-strong);
  }
  .dots i:first-child {
    background: color-mix(in oklab, var(--accent) 70%, var(--line-strong));
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
    .caret.typing {
      animation: none;
      opacity: 0.72;
    }
  }
</style>
