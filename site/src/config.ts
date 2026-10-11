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
    '青空的个人博客。',
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
  role: '大二在读，个人开发者',
  /** 首页 hero 的一句话自我介绍。控制在 20 字左右。 */
  intro: '“即使迷茫，也要继续前进”',
  /** 名片背面和关于页的关注方向。 */
  focus: ['记忆系统', '角色模拟', '地理与时空', 'Agent开发'],
  /** 公开联系邮箱。留空则名片和关于页不显示邮箱。 */
  email: '',
  location: '',
} as const;

/**
 * GitHub 账号。首页面板、动态页、项目页的实时数据都从这里取。
 * repo 用于在文章底部生成「查看源文件 / 修改历史」链接。
 */
export const GITHUB = {
  username: 'puresky271',
  repo: 'puresky271/puresky-blog',
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
  playlistId: '8385925605',
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
export const API_BASE: string = import.meta.env.PUBLIC_API_BASE ?? 'https://api.pureskyblog.dpdns.org';

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
  { id: 'memory', label: '记忆', blurb: '角色记得什么、知道什么，信息怎么在她们之间流动。' },
  { id: 'world', label: '时空', blurb: '地理、时间与环境：让角色真的身处某个地方、某个时刻。' },
  { id: 'persona', label: '人格', blurb: '人格、语气与内心：同一个角色怎么在每一轮都还是她。' },
  { id: 'engineering', label: '工程', blurb: '延迟、并发、提示词装配，把系统跑稳的那些事。' },
  { id: 'essays', label: '随想', blurb: 'AI 时代里的一些想法，不那么技术。' },
  { id: 'tools', label: '工具', blurb: '开发人员日常会使用到的那些玩意' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

/*
 * 标签：受控词表。
 *
 * 分类回答「这篇属于哪个大方向」（一篇只有一个），标签回答「这篇涉及哪些具体的东西」（一篇三到五个）。
 * 文章只能用这里声明过的标签，写了未声明的标签构建直接失败（见 content.config.ts）：
 * 自由标签迟早会长出「prompt / 提示词 / Prompt」三个并存的版本，词表能把这件事挡在构建期。
 * 新增标签：在对应分组里加一条，slug 进 URL，只增不改。
 */
export const TAG_GROUPS = [
  { id: 'topic', label: '主题', blurb: '文章在讨论的对象。' },
  { id: 'tech', label: '技术', blurb: '用到的方法、模型和工具。' },
  { id: 'kind', label: '体裁', blurb: '文章是怎么写的：复盘、实验、踏查还是随想。' },
] as const;

export type TagGroupId = (typeof TAG_GROUPS)[number]['id'];

export const TAGS = [
  // 主题
  { name: '角色扮演', slug: 'roleplay', group: 'topic', blurb: 'AI RP：让角色成为能延续下去的个体，而不是一问一答的聊天框。' },
  { name: '记忆系统', slug: 'memory-system', group: 'topic', blurb: '长期记忆的写入、召回、整理与遗忘。' },
  { name: '多智能体', slug: 'multi-agent', group: 'topic', blurb: '多个角色之间的信息流动、传话与协作。' },
  { name: '世界模拟', slug: 'world-sim', group: 'topic', blurb: '世界状态、日程与时间推进，角色活在一个会自己转的世界里。' },
  { name: '地理', slug: 'geography', group: 'topic', blurb: '位置、路线与空间关系。' },
  { name: '时间', slug: 'time', group: 'topic', blurb: '时段、日程与角色对时间的感知。' },
  { name: '环境感知', slug: 'perception', group: 'topic', blurb: '角色怎么知道自己周围是什么：天气、室内外、声音与光。' },
  { name: '人格一致性', slug: 'persona', group: 'topic', blurb: '同一个角色在长对话、多轮重建之后还是她自己。' },
  { name: 'AI 与人', slug: 'ai-and-people', group: 'topic', blurb: 'AI 时代里人的位置：工作、学习、陪伴与责任。' },
  { name: '学习', slug: 'learning', group: 'topic', blurb: '作为学生，在答案触手可及的时代怎么学。' },
  // 技术
  { name: 'LLM', slug: 'llm', group: 'tech', blurb: '大语言模型本身的行为与边界。' },
  { name: '提示词', slug: 'prompt', group: 'tech', blurb: '提示词的装配、版本与调试。' },
  { name: '上下文工程', slug: 'context-engineering', group: 'tech', blurb: '有限的上下文窗口里放什么、怎么放。' },
  { name: '检索', slug: 'retrieval', group: 'tech', blurb: '召回、排序、分词与向量检索。' },
  { name: '推理模型', slug: 'reasoning', group: 'tech', blurb: '带显式推理通道的模型，以及怎么用好它。' },
  { name: '评测', slug: 'evaluation', group: 'tech', blurb: '怎么量化「好了没有」：指标、对照实验与回归测试。' },
  { name: '可观测性', slug: 'observability', group: 'tech', blurb: '日志、追踪与审计：看见系统实际在做什么。' },
  { name: '性能', slug: 'performance', group: 'tech', blurb: '延迟、吞吐与成本。' },
  { name: '并发', slug: 'concurrency', group: 'tech', blurb: '多个写入者、锁与数据一致性。' },
  { name: '缓存', slug: 'cache', group: 'tech', blurb: '缓存什么、何时失效、谁是权威数据源。' },
  { name: 'Python', slug: 'python', group: 'tech', blurb: 'Python 生态与运行环境。' },
  { name: '前端', slug: 'frontend', group: 'tech', blurb: '界面、交互与浏览器。' },
  { name: '版本管理', slug: 'version-control', group: 'tech', blurb: '开发时的文件/环境等的版本管理' },
  { name: 'git', slug: 'git', group: 'tech', blurb: '关于git的各种知识' },
  { name: 'github', slug: 'github', group: 'tech', blurb: 'github的各种知识' },
  { name: '规范性', slug: 'normative', group: 'tech', blurb: '开发时的规范性标准' },
  { name: '自动化', slug: 'automation', group: 'tech', blurb: '' },
  // 体裁
  { name: '排障复盘', slug: 'postmortem', group: 'kind', blurb: '一个具体问题从发现、定位到修好的完整过程。' },
  { name: '实验', slug: 'experiment', group: 'kind', blurb: '带对照和数字的实验记录。' },
  { name: '踏查', slug: 'fieldwork', group: 'kind', blurb: '去现场看、记、再写进系统。' },
  { name: '方法论', slug: 'methodology', group: 'kind', blurb: '从多次踩坑里沉淀下来的做法。' },
  { name: '反思', slug: 'reflection', group: 'kind', blurb: '不那么技术的想法。' },
] as const satisfies readonly { name: string; slug: string; group: TagGroupId; blurb: string }[];

export type TagName = (typeof TAGS)[number]['name'];
export const TAG_NAMES = TAGS.map((t) => t.name) as [TagName, ...TagName[]];

/** 每页文章数。 */
export const POSTS_PER_PAGE = 12;

/** 中文平均阅读速度，字/分钟。 */
export const CJK_CHARS_PER_MINUTE = 380;
/** 西文平均阅读速度，词/分钟。 */
export const LATIN_WORDS_PER_MINUTE = 220;
