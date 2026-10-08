/**
 * config.ts — 站点级配置。
 *
 * 换人、换账号、换歌单都只改这一个文件。
 * 页面和组件不应该自己写死任何个人信息。
 */

export const SITE = {
  /** 站点名。出现在导航、标题后缀和 RSS 里。 */
  title: 'puresky',
  description:
    '一个人的工程日志。写记忆系统、角色一致性、地理模拟，以及把这些东西真的跑起来之间发生的事。',
  lang: 'zh-CN',
  locale: 'zh_CN',
  /** 作者所在时区。日期格式化和时钟的「作者本地时间」都用它。 */
  timeZone: 'Asia/Shanghai',
  /** 博客开始的年份，页脚版权用。 */
  since: 2026,
} as const;

export const AUTHOR = {
  name: 'puresky',
  /** 名片和关于页用的一句话身份。 */
  role: '开发者',
  /** 首页 hero 的一句话自我介绍。控制在 20 字左右。 */
  intro: '写记忆系统和角色模拟，也写把它们跑起来时踩过的坑。',
  /** 名片背面和关于页的关注方向。 */
  focus: ['记忆系统', '角色模拟', '地理与时空', '前端工程'],
  /** 公开联系邮箱。留空则名片和关于页不显示邮箱。 */
  email: '',
  location: '',
} as const;

/**
 * GitHub 账号。首页面板、动态页、项目页的实时数据都从这里取。
 * repo 用于在文章底部生成「查看源文件 / 修改历史」链接。
 */
export const GITHUB = {
  username: 'puresky',
  repo: 'puresky/puresky-blog',
  branch: 'main',
  /** 文章源文件相对仓库根的目录。 */
  contentPath: 'site/src/content/posts',
} as const;

/**
 * 网易云音乐歌单。
 * 打开歌单网页，地址里 playlist?id= 后面那串数字就是 id。
 * 默认值是网易云官方的「飙升榜」，换成自己的歌单即可。
 */
export const MUSIC = {
  playlistId: '19723756',
  /** 播放器默认音量，0 到 1。 */
  defaultVolume: 0.6,
} as const;

/**
 * 首页天色与天气跟着这个地点走：hero 的天空底色、粒子形态、插画昼夜版本、时钟卡的天气。
 * 一天的四段（破晓 / 白天 / 黄昏 / 夜晚）按这里的日出日落划分，所以访客看到的是作者那边的天。
 */
export const WEATHER = {
  name: '沈阳',
  latitude: 41.81,
  longitude: 123.43,
  /** 天气接口拿不到时，按这个时区的钟点估算时段。 */
  timeZone: 'Asia/Shanghai',
} as const;

/** 后端 API 根地址。评论、浏览数、GitHub 刷新、歌词都走这里。 */
export const API_BASE: string = import.meta.env.PUBLIC_API_BASE ?? 'https://api.puresky.dev';

export const NAV_LINKS = [
  { href: '/posts/', label: '文章', match: ['/posts/', '/tags/', '/categories/'] },
  { href: '/archive/', label: '归档', match: ['/archive/'] },
  { href: '/projects/', label: '项目', match: ['/projects/'] },
  { href: '/gallery/', label: '画廊', match: ['/gallery/'] },
  { href: '/activity/', label: '动态', match: ['/activity/'] },
  { href: '/about/', label: '关于', match: ['/about/', '/friends/', '/card/'] },
] as const;

export const SOCIAL_LINKS: readonly { label: string; href: string; icon: string }[] = [
  { label: 'GitHub', href: `https://github.com/${GITHUB.username}`, icon: 'github' },
  { label: 'RSS', href: '/rss.xml', icon: 'rss' },
];

/** 文章分类。id 进 URL，改了会断链，只增不改。 */
export const CATEGORIES = [
  { id: 'engineering', label: '工程日志', blurb: '具体问题的排查和修复过程。' },
  { id: 'systems', label: '系统设计', blurb: '架构取舍，以及为什么这样拆。' },
  { id: 'cognition', label: '认知与模型', blurb: '记忆、检索、角色一致性。' },
  { id: 'essays', label: '随笔', blurb: '不那么技术的东西。' },
  { id: 'field-notes', label: '田野笔记', blurb: '现场记录和调研。' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

/** 每页文章数。 */
export const POSTS_PER_PAGE = 12;

/** 中文平均阅读速度，字/分钟。 */
export const CJK_CHARS_PER_MINUTE = 380;
/** 西文平均阅读速度，词/分钟。 */
export const LATIN_WORDS_PER_MINUTE = 220;
