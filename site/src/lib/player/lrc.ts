/**
 * lrc.ts — LRC 歌词解析。
 *
 * 网易云的歌词有几个需要处理的地方：
 *   一行可能有多个时间戳（副歌复用）；
 *   开头几行是「作词 : xxx」之类的署名，和歌词放在一起滚动很碍事；
 *   有的歌词顶部是 JSON 格式的元信息行；
 *   翻译是另一份 LRC，需要按时间戳对齐合并。
 */

export interface LrcLine {
  /** 秒。 */
  time: number;
  text: string;
  translation?: string;
}

const TIME = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const CREDIT =
  /^(作词|作曲|编曲|词|曲|制作人|制作|监制|混音|母带|和声|吉他|贝斯|鼓|键盘|弦乐|录音|出品|发行|企划|统筹|OP|SP|Lyrics|Composer|Arranger|Producer)\s*[:：]/i;

function parse(source: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    if (raw.startsWith('{')) continue;
    const stamps = [...raw.matchAll(TIME)];
    if (stamps.length === 0) continue;
    const text = raw.replace(TIME, '').trim();
    for (const stamp of stamps) {
      const fraction = stamp[3] ? Number(stamp[3].padEnd(3, '0')) / 1000 : 0;
      lines.push({ time: Number(stamp[1]) * 60 + Number(stamp[2]) + fraction, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function parseLrc(lrc: string, tlrc = ''): LrcLine[] {
  const lines = parse(lrc).filter((line) => line.text && !CREDIT.test(line.text));
  if (!tlrc) return lines;

  // 翻译的时间戳和原文大多完全一致，偶尔差几十毫秒，按最近的匹配。
  const translations = parse(tlrc).filter((line) => line.text);
  let cursor = 0;
  for (const line of lines) {
    while (cursor < translations.length - 1 && translations[cursor + 1].time <= line.time + 0.05) cursor += 1;
    const candidate = translations[cursor];
    if (candidate && Math.abs(candidate.time - line.time) < 0.3 && candidate.text !== line.text) {
      line.translation = candidate.text;
    }
  }
  return lines;
}

/** 当前应该高亮的行。提前 0.2 秒，让高亮和歌声对得更齐。二分查找。 */
export function lineAt(lines: LrcLine[], seconds: number): number {
  const target = seconds + 0.2;
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
