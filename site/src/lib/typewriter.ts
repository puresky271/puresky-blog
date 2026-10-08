/**
 * typewriter.ts — 打字机节奏引擎。
 *
 * 节奏参数沿用 mygo_chat 首页问候语的那一套：匀速里夹着小停顿，读起来像真人在打字。
 *   每字 34ms，每到第 6 / 11 个字额外顿 86ms；
 *   句末标点后停 170ms，逗号类停 92ms；
 *   删除每字 42ms，标点再加 22ms，每 7 个字加 18ms。
 *
 * 文本按码位切分（Array.from），中文和 emoji 都不会被切成半个字符。
 * 每次调用带一个取消令牌：组件卸载或切换内容时置 cancelled，旧的循环立刻停下，不会和新循环抢着写。
 */

export interface Token {
  cancelled: boolean;
}

const TYPE_MS = 34;
const STUTTER_MS = 86;
const SENTENCE_PAUSE_MS = 170;
const CLAUSE_PAUSE_MS = 92;
const ERASE_MS = 42;
const ERASE_PUNCT_MS = 22;
const ERASE_STUTTER_MS = 18;

const SENTENCE_END = /[。！？!?…]/;
const CLAUSE_END = /[，、；：,.;:]/;

export function sleep(ms: number, token: Token): Promise<boolean> {
  return new Promise((resolve) => {
    if (token.cancelled) return resolve(false);
    setTimeout(() => resolve(!token.cancelled), ms);
  });
}

function typeDelay(char: string, index: number, speed: number): number {
  let delay = TYPE_MS;
  if ((index + 1) % 11 === 0 || (index + 1) % 6 === 0) delay += STUTTER_MS;
  if (SENTENCE_END.test(char)) delay += SENTENCE_PAUSE_MS;
  else if (CLAUSE_END.test(char)) delay += CLAUSE_PAUSE_MS;
  return delay * speed;
}

function eraseDelay(char: string, index: number): number {
  let delay = ERASE_MS;
  if (SENTENCE_END.test(char) || CLAUSE_END.test(char)) delay += ERASE_PUNCT_MS;
  if ((index + 1) % 7 === 0) delay += ERASE_STUTTER_MS;
  return delay;
}

/**
 * 逐字打出 text。每打一个字调用一次 onUpdate(当前已打出的部分)。
 * 被取消时返回 false。speed 是节奏倍率，1 为原速，命令行这种短文本可以快一点。
 */
export async function typeText(
  text: string,
  onUpdate: (value: string) => void,
  token: Token,
  speed = 1
): Promise<boolean> {
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 1) {
    if (token.cancelled) return false;
    onUpdate(chars.slice(0, i + 1).join(''));
    if (!(await sleep(typeDelay(chars[i], i, speed), token))) return false;
  }
  return true;
}

/** 从尾部逐字删掉 text。 */
export async function eraseText(text: string, onUpdate: (value: string) => void, token: Token): Promise<boolean> {
  const chars = Array.from(text);
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (token.cancelled) return false;
    onUpdate(chars.slice(0, i).join(''));
    if (!(await sleep(eraseDelay(chars[i], chars.length - 1 - i), token))) return false;
  }
  return true;
}

/** 打完之后停留多久：5 秒起，超过 30 字的部分每字加 55ms，最多 8 秒。 */
export function holdFor(text: string): number {
  return Math.min(8000, 5000 + Math.max(0, Array.from(text).length - 30) * 55);
}
