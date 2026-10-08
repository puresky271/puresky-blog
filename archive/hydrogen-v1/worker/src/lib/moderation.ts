/**
 * moderation.ts — 评论审核。
 *
 * 两层：先跑确定性规则，规则拦不住的再问模型。
 *
 * 顺序很重要。规则层便宜、可预测、可解释，能挡掉绝大多数垃圾（链接轰炸、
 * 重复字符、纯广告词）。模型层贵、有延迟、判断不稳定，只用来处理
 * 规则表达不了的语义问题。反过来先问模型会又慢又不可控。
 */

import type { Env } from '../types.ts';

export interface ModerationVerdict {
  action: 'approve' | 'hold' | 'reject';
  by: 'rule' | 'model' | 'default';
  reason: string;
  score: number | null;
}

/** 链接数量上限。超过就送审，不直接拒 —— 正常讨论也可能贴好几个链接。 */
const MAX_LINKS = 3;

/** 常见的垃圾特征。命中就直接拒，不浪费模型调用。 */
const HARD_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(?:viagra|cialis|casino|porn|xxx)\b/i, reason: '命中垃圾关键词' },
  { pattern: /(.)\1{24,}/u, reason: '重复字符轰炸' },
  { pattern: /(?:https?:\/\/[^\s]+){6,}/i, reason: '链接数量异常' },
];

/** 需要送审但不直接拒的特征。 */
const HOLD_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /<\s*script/i, reason: '包含脚本标签' },
  { pattern: /\[url=/i, reason: 'BBCode 链接，常见于垃圾评论' },
];

function countLinks(body: string): number {
  return (body.match(/https?:\/\//gi) ?? []).length;
}

/**
 * 规则层。返回 null 表示规则没意见，交给下一层。
 */
export function ruleVerdict(body: string): ModerationVerdict | null {
  for (const { pattern, reason } of HARD_REJECT_PATTERNS) {
    if (pattern.test(body)) {
      return { action: 'reject', by: 'rule', reason, score: null };
    }
  }

  for (const { pattern, reason } of HOLD_PATTERNS) {
    if (pattern.test(body)) {
      return { action: 'hold', by: 'rule', reason, score: null };
    }
  }

  if (countLinks(body) > MAX_LINKS) {
    return {
      action: 'hold',
      by: 'rule',
      reason: `链接数 ${countLinks(body)} 超过 ${MAX_LINKS}`,
      score: null,
    };
  }

  return null;
}

/**
 * 模型层。用 Workers AI 判一次。
 *
 * 三个防护：
 *   1. 输出只接受固定的三个词，任何其他输出当作「无法判定」。
 *   2. 无法判定时送审，不放行 —— 审核失败应该偏保守。
 *   3. 模型调用失败也送审，同理。
 */
export async function modelVerdict(env: Env, body: string): Promise<ModerationVerdict> {
  const prompt = [
    '你是一个评论审核器。判断下面这条博客评论是否应该公开显示。',
    '这是一个技术博客，讨论编程、系统设计、AI 工程。',
    '',
    '判定标准：',
    '- SAFE：正常的讨论、提问、反馈、批评，哪怕语气不客气',
    '- SPAM：广告、推广、无关链接、无意义刷屏',
    '- ABUSE：人身攻击、仇恨言论、露骨内容',
    '',
    '只输出一个词：SAFE、SPAM 或 ABUSE。',
    '',
    '评论内容：',
    body.slice(0, 1500),
  ].join('\n');

  try {
    const response = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 8,
      temperature: 0,
    })) as { response?: string };

    const raw = (response.response ?? '').trim().toUpperCase();

    if (raw.startsWith('SAFE')) {
      return { action: 'approve', by: 'model', reason: 'SAFE', score: 1 };
    }
    if (raw.startsWith('SPAM')) {
      return { action: 'reject', by: 'model', reason: 'SPAM', score: 0 };
    }
    if (raw.startsWith('ABUSE')) {
      return { action: 'reject', by: 'model', reason: 'ABUSE', score: 0 };
    }

    // 模型给了预期外的输出。不当成放行，也不当成拒绝。
    return {
      action: 'hold',
      by: 'model',
      reason: `模型输出无法解析：${raw.slice(0, 40)}`,
      score: null,
    };
  } catch (error) {
    return {
      action: 'hold',
      by: 'model',
      reason: `模型调用失败：${error instanceof Error ? error.message : '未知错误'}`,
      score: null,
    };
  }
}

/**
 * 完整审核流程。
 *
 * MODERATION_ENABLED 关掉时直接放行，方便本地开发 ——
 * 但线上默认是开的，而且开关只影响是否调用审核，
 * 不影响规则层的硬拒（垃圾评论无论如何都不该进库）。
 */
export async function moderate(env: Env, body: string): Promise<ModerationVerdict> {
  const rule = ruleVerdict(body);

  // 规则层的硬拒无条件生效。
  if (rule?.action === 'reject') return rule;

  if (env.MODERATION_ENABLED !== 'true') {
    return { action: 'approve', by: 'default', reason: '审核未启用', score: null };
  }

  if (rule) return rule;

  return modelVerdict(env, body);
}
