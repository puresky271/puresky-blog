#!/usr/bin/env node
/**
 * audit_replica.mjs — 外部示例复刻的验收脚本（external-snapshot-replica skill 的参考实现）。
 *
 * 检查：控制台和页面异常、数据/媒体/字体的失败请求、每个分组的卡片数和图片、
 * 可交互版本挂载数、悬停状态属性、桌面/手机宽度是否横向溢出、语言开关是否生效。
 *
 * 用法：
 *   node audit_replica.mjs --url http://localhost:4321/posts/<slug>/ \
 *     --animation geist-gallery --groups groups.json --out _scratch/<slug>/audit
 *
 * groups.json 里是分组配置数组，直接给 article 里 :::animation 的 data-config，
 * 用来定位每个画廊：
 *   [{"group":"actions"},{"group":"inputs"},{"group":"choices"}]
 *
 * 依赖：playwright-core（用本机 npx 缓存里的那份，别往 package.json 加依赖）。
 */

import { chromium } from 'file:///C:/Users/16019/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name, fallback = '') => {
  const hit = args.find((item) => item.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const URL = flag('url');
const ANIMATION = flag('animation', 'geist-gallery');
const GROUPS_FILE = flag('groups');
const OUT = flag('out', '_scratch/replica-audit');
const CHROME = flag('chrome', 'C:/Users/16019/AppData/Local/Programs/ChromiumForTesting/chrome-win/chrome.exe');
const MOBILE_WIDTH = Number(flag('mobile', '390'));
/** 组件卡片选择器，和画廊渲染时用的类名保持一致 */
const CARD_SELECTOR = flag('card', '.geist-card');
/** 手写可交互版本的根节点选择器 */
const INTERACTIVE_SELECTOR = flag('interactive', '.gi-demo, [data-snapshot-interactive]');

if (!URL) {
  console.error('缺少 --url');
  process.exit(2);
}

const groups = GROUPS_FILE ? JSON.parse(readFileSync(GROUPS_FILE, 'utf8')) : [];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const page = await context.newPage();

const problems = [];
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  // 本地 worker 没启动这类跟页面无关的请求失败不算问题
  if (text.includes('CONNECTION_REFUSED')) return;
  problems.push(`[console] ${text.slice(0, 200)}`);
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message.slice(0, 200)}`));
page.on('requestfailed', (request) => {
  const url = request.url();
  if (/\/(data|media|fonts)\//.test(url)) problems.push(`[requestfailed] ${url}`);
});
page.on('response', (response) => {
  const url = response.url();
  if (response.status() >= 400 && /\/(data|media|fonts)\//.test(url)) {
    problems.push(`[${response.status()}] ${url}`);
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(1200);

const results = [];
for (const config of groups) {
  const selector = `.animation-demo[data-animation="${ANIMATION}"][data-config*="${config.group}"]`;
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), selector);
  // 逐段滚动触发懒加载
  for (let step = 0; step < 6; step += 1) {
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 700));
  }
  await page.waitForTimeout(1400);

  const info = await page.evaluate(({ sel, group, cardSelector, interactiveSelector }) => {
    const root = document.querySelector(sel);
    if (!root) return { group, error: '找不到画廊' };
    const cards = [...root.querySelectorAll(cardSelector)];
    const images = [...root.querySelectorAll('img')];
    return {
      group,
      cards: cards.length,
      interactive: root.querySelectorAll(interactiveSelector).length,
      images: images.length,
      brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).length,
      emptyNotes: [...root.querySelectorAll('*')]
        .filter((el) => el.children.length === 0 && /静态快照|依赖客户端/.test(el.textContent || '')).length,
    };
  }, {
    sel: selector,
    group: config.group,
    cardSelector: CARD_SELECTOR,
    interactiveSelector: INTERACTIVE_SELECTOR,
  });
  results.push(info);
  await page.screenshot({ path: `${OUT}/${config.group}.png` });
}

// 悬停状态
const hover = await page.evaluate((animation) => {
  const root = document.querySelector(`.animation-demo[data-animation="${animation}"]`);
  const button = root?.querySelector('button');
  if (!button) return { supported: false };
  button.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  const on = button.hasAttribute('data-hover');
  button.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  return { supported: true, works: on, cleared: !button.hasAttribute('data-hover') };
}, ANIMATION);

// 溢出检查
const widths = [1440, MOBILE_WIDTH];
const overflow = [];
for (const width of widths) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(600);
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  overflow.push({ width, ...size, ok: size.scrollWidth <= size.clientWidth + 1 });
}

// 语言开关（有 :::bi 才有）
const langToggle = await page.evaluate(() => {
  const button = document.querySelector('button[data-option="en"]');
  if (!button) return { present: false };
  button.click();
  return { present: true };
});
await page.waitForTimeout(400);
const langState = await page.evaluate(() => ({
  lang: document.documentElement.dataset.paperLang,
  englishVisible: (() => {
    const block = document.querySelector('.bi-en');
    return block ? getComputedStyle(block).display !== 'none' : null;
  })(),
}));

await browser.close();

const report = { url: URL, results, hover, overflow, langToggle, langState, problems: [...new Set(problems)] };
console.log(JSON.stringify(report, null, 1));

const failed = problems.length > 0
  || results.some((item) => item.error || item.brokenImages > 0)
  || overflow.some((item) => !item.ok);
process.exit(failed ? 1 : 0);
