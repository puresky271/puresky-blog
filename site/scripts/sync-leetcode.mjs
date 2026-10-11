/**
 * 从公开 LeetCode GraphQL 刷新题目元数据和最近一年提交日历。
 * 失败时保留已有快照，只有完整且可校验的数据才会写回仓库。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const questionFile = path.join(root, 'src/data/leetcode/questions.json');
const calendarFile = path.join(root, 'src/data/leetcode/submission-calendar.json');
const username = process.env.LEETCODE_USERNAME || 'puresky271';

/*
 * leetcode.cn 的 schema 和 leetcode.com 不一样，两套查询还不在同一个端点上：
 * 题目详情在 /graphql 的 question(titleSlug:)，提交日历在 /graphql/noj-go/ 的 userCalendar(userSlug:)。
 * 都实测过匿名可访问，不需要 cookie。
 */
const questionEndpoint = process.env.LEETCODE_QUESTION_URL || 'https://leetcode.cn/graphql';
const calendarEndpoint = process.env.LEETCODE_CALENDAR_URL || 'https://leetcode.cn/graphql/noj-go/';

const questionQuery = `query questionData($slug: String!) { question(titleSlug: $slug) { questionId questionFrontendId title translatedTitle difficulty topicTags { name slug } stats } }`;
const calendarQuery = `query userCalendar($userSlug: String!) { userCalendar(userSlug: $userSlug) { submissionCalendar } }`;

async function graphql(endpoint, query, variables) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'puresky-blog-leetcode-sync' }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join('; '));
  return payload.data;
}

function validCalendar(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const now = Math.floor(Date.now() / 1000);
  const start = now - 366 * 86400;
  const days = Object.entries(parsed ?? {})
    .map(([timestamp, count]) => ({ timestamp: Number(timestamp), date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10), count: Number(count) }))
    .filter((item) => Number.isInteger(item.count) && item.count >= 0 && item.timestamp >= start)
    .sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(0, ...days.map((d) => d.count));
  return { username, fetchedAt: new Date().toISOString(), total: days.reduce((sum, d) => sum + d.count, 0), days: days.map((d) => ({ ...d, level: d.count <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((d.count / max) * 4))) })) };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

const postsDir = path.join(root, 'src/content/posts');
const postFiles = (await readdir(postsDir)).filter((file) => file.endsWith('.md') || file.endsWith('.mdx'));
const slugs = [...new Set((await Promise.all(postFiles.map(async (file) => {
  const source = await readFile(path.join(postsDir, file), 'utf8');
  return /^leetcodeSlug:\s*([a-z0-9-]+)\s*$/m.exec(source)?.[1] ?? null;
}))).filter(Boolean))];
const previousCalendar = await readJson(calendarFile, { username, fetchedAt: '', total: 0, days: [] });
const fetchedAt = new Date().toISOString();

let questionFailed = false;
const questions = [];
for (const slug of slugs) {
  try {
    const item = (await graphql(questionEndpoint, questionQuery, { slug })).question;
    if (!item?.questionId) throw new Error('题目数据为空');
    const stats = JSON.parse(item.stats || '{}');
    // stats.acRate 是 "55.3%" 这样的字符串，Number() 会得到 NaN，要用 parseFloat。
    const acRate = parseFloat(stats.acRate);
    questions.push({ slug, questionId: String(item.questionId), frontendId: String(item.questionFrontendId), title: item.title, titleCn: item.translatedTitle || item.title, difficulty: item.difficulty, topicTags: item.topicTags ?? [], acRate: Number.isFinite(acRate) ? acRate : null, url: `https://leetcode.cn/problems/${slug}/`, fetchedAt });
  } catch (error) {
    questionFailed = true;
    console.warn(`[leetcode] ${slug} 刷新失败：${error.message}`);
  }
}

if (slugs.length && !questionFailed && questions.length === slugs.length) await writeFile(questionFile, `${JSON.stringify(questions, null, 2)}\n`);

try {
  const raw = (await graphql(calendarEndpoint, calendarQuery, { userSlug: username })).userCalendar?.submissionCalendar;
  if (!raw) throw new Error('提交日历为空');
  await writeFile(calendarFile, `${JSON.stringify(validCalendar(raw), null, 2)}\n`);
} catch (error) {
  console.warn(`[leetcode] 提交日历刷新失败，沿用旧快照：${error.message}`);
  await writeFile(calendarFile, `${JSON.stringify(previousCalendar, null, 2)}\n`);
}
