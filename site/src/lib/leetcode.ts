/** 力扣静态快照的类型与轻量查询。快照由 scripts/sync-leetcode.mjs 生成。 */

import questions from '@/data/leetcode/questions.json';
import calendar from '@/data/leetcode/submission-calendar.json';

export interface LeetCodeQuestion {
  slug: string;
  questionId: string;
  frontendId: string;
  title: string;
  titleCn: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string;
  topicTags: { name: string; slug: string }[];
  acRate: number | null;
  url: string;
  fetchedAt: string;
}

export interface LeetCodeSubmissionCalendar {
  username: string;
  fetchedAt: string;
  total: number;
  days: { timestamp: number; date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
}

/** 提交日历快照。JSON 导入推不出 level 的字面量联合类型，在这里收窄一次。 */
export const submissionCalendar = calendar as LeetCodeSubmissionCalendar;

export function questionOf(slug: string): LeetCodeQuestion | undefined {
  return (questions as LeetCodeQuestion[]).find((question) => question.slug === slug);
}

/**
 * 按 frontmatter 里的顺序取多道题的元数据。快照每天才刷新一次，
 * 刚关联上的题可能还不在里面，这时 question 为 undefined，页面回落到 slug 本身。
 */
export function questionsOf(slugs: string[]): { slug: string; question?: LeetCodeQuestion }[] {
  return slugs.map((slug) => ({ slug, question: questionOf(slug) }));
}

export function levelForCount(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
}
