/**
 * consts.ts — 站点级常量。
 */

export const SITE = {
  /** 站点显示名。 */
  title: "puresky's blog",
  /** 主题代号。整套视觉语言的来源。 */
  theme: 'Hydrogen',
  /** 元素符号，出现在 logo 和 favicon 上。 */
  symbol: 'H',
  atomicNumber: 1,
  author: 'puresky',
  description:
    '一个人的工程日志。写记忆系统、角色一致性、地理模拟，以及把这些东西真的跑起来之间发生的事。',
  lang: 'zh-CN',
  locale: 'zh_CN',
  /** 时区，用于格式化日期。 */
  timeZone: 'Asia/Shanghai',
} as const;

/** 后端 API 根地址。评论、浏览数、反应都走这里。 */
export const API_BASE =
  import.meta.env.PUBLIC_API_BASE ?? 'https://api.hydrogen.puresky.dev';

/** GitHub OAuth 的 client id。公开值，不是密钥。 */
export const GITHUB_CLIENT_ID = import.meta.env.PUBLIC_GITHUB_CLIENT_ID ?? '';

export const NAV_LINKS = [
  { href: '/posts/', label: '全部文章' },
  { href: '/shells/', label: '能级' },
  { href: '/spectrum/', label: '光谱' },
  { href: '/cloud/', label: '电子云' },
  { href: '/projects/', label: '项目' },
  { href: '/isotopes/', label: '同位素' },
  { href: '/about/', label: '关于' },
] as const;

export const SOCIAL_LINKS = [
  { href: 'https://github.com/puresky', label: 'GitHub', handle: '@puresky' },
] as const;

/** 每页文章数。 */
export const POSTS_PER_PAGE = 12;

/** 中文平均阅读速度，字/分钟。用于估算阅读时长。 */
export const CJK_CHARS_PER_MINUTE = 340;
/** 西文平均阅读速度，词/分钟。 */
export const LATIN_WORDS_PER_MINUTE = 220;
