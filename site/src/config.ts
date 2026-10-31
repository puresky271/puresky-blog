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

/** 力扣账号与快照配置。用户名用于公开 GraphQL 查询，不保存登录态。 */
export const LEETCODE = {
  username: 'puresky271',
  profileUrl: 'https://leetcode.cn/u/puresky271/',
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

/** 文章一级分类。id 进 URL，改了会断链，只增不改。 */
export const CATEGORIES = [
  { id: 'technology', label: '技术', blurb: 'AI 系统、软件工程和日常开发工具。' },
  { id: 'algorithms', label: '算法解题', blurb: '算法题的思路、证明、复杂度和实现。代码风格因人而异，题解代码以力扣官方题解为准。' },
  { id: 'essays', label: '随笔', blurb: '学习、生活和 AI 时代里的一些想法。' },
  { id: 'literature', label: '文学创作', blurb: '小说、诗歌、散文与其他文学创作。' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

/** 二级分类。category 与 categoryId 的组合在构建期校验。 */
export const SUBCATEGORIES = [
  { id: 'ai-llm', category: 'technology', label: 'AI 与大模型', blurb: '模型行为、角色系统和 AI 应用。' },
  { id: 'context-prompt', category: 'technology', label: '上下文与提示词', blurb: '提示词、上下文装配和检索。' },
  { id: 'system-engineering', category: 'technology', label: '系统工程', blurb: '性能、并发、缓存、可观测性和可靠性。' },
  { id: 'frontend-tools', category: 'technology', label: '前端与工具', blurb: '界面、浏览器、Git 和开发工具。' },
  { id: 'data-structures', category: 'technology', label: '数据结构', blurb: '数据结构的概念、实现与应用。' },
  { id: 'technology-unclassified', category: 'technology', label: '待归类', blurb: '暂时无法确定子类的技术文章。' },
  { id: 'arrays-strings', category: 'algorithms', label: '数组与字符串', blurb: '数组、字符串和双指针问题。' },
  { id: 'linked-lists-trees', category: 'algorithms', label: '链表与树', blurb: '链表、二叉树和递归结构。' },
  { id: 'hash-stack-queue', category: 'algorithms', label: '哈希与栈队列', blurb: '哈希表、栈、队列和单调结构。' },
  { id: 'binary-search-sorting', category: 'algorithms', label: '二分与排序', blurb: '二分答案、排序和区间处理。' },
  { id: 'dynamic-programming', category: 'algorithms', label: '动态规划', blurb: '状态设计、转移和优化。' },
  { id: 'graph-theory', category: 'algorithms', label: '图论', blurb: '图遍历、最短路、并查集和拓扑排序。' },
  { id: 'greedy-backtracking', category: 'algorithms', label: '贪心与回溯', blurb: '贪心证明、搜索和剪枝。' },
  { id: 'mathematics', category: 'algorithms', label: '数学', blurb: '数论、组合、几何和模拟。' },
  { id: 'algorithms-unclassified', category: 'algorithms', label: '待归类', blurb: '暂时无法确定子类的算法文章。' },
  { id: 'learning-growth', category: 'essays', label: '学习成长', blurb: '学习方法、成长和学生生活。' },
  { id: 'ai-and-people', category: 'essays', label: 'AI 与人', blurb: 'AI 时代里人的位置、责任和关系。' },
  { id: 'life-observation', category: 'essays', label: '生活观察', blurb: '日常生活里的观察和记录。' },
  { id: 'essays-unclassified', category: 'essays', label: '待归类', blurb: '暂时无法确定子类的随笔。' },
  { id: 'literature-unclassified', category: 'literature', label: '待归类', blurb: '暂时无法确定子类的文学创作。' },
] as const;

export type SubcategoryId = (typeof SUBCATEGORIES)[number]['id'];
export const SUBCATEGORY_IDS = SUBCATEGORIES.map((c) => c.id) as [SubcategoryId, ...SubcategoryId[]];
export const SUBCATEGORIES_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, SUBCATEGORIES.filter((item) => item.category === category.id)])
) as unknown as Record<CategoryId, readonly (typeof SUBCATEGORIES)[number][]>;

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
  { id: 'algo', label: '算法', blurb: '解题的技法与题型，给题解文章用。' },
  { id: 'dsa', label: '数据结构', blurb: '数据结构本身的概念与实现，给知识讲解文章用，和算法技法分开。' },
  { id: 'kind', label: '体裁', blurb: '文章是怎么写的：复盘、实验、踏查还是随想。' },
  { id: 'model', label: '模型印象', blurb: '模型榜单用的标签：这个模型擅长什么、哪里不行。文章里也能用。' },
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
  { name: 'TypeScript', slug: 'typescript', group: 'tech', blurb: 'TypeScript 语言与类型工程。' },
  { name: 'Astro', slug: 'astro', group: 'tech', blurb: 'Astro 框架与岛屿架构。' },
  { name: 'Svelte', slug: 'svelte', group: 'tech', blurb: 'Svelte 组件与响应式。' },
  { name: 'CSS', slug: 'css', group: 'tech', blurb: '样式、布局与设计令牌。' },
  { name: 'Node.js', slug: 'nodejs', group: 'tech', blurb: 'Node.js 运行时与工具链。' },
  { name: 'Cloudflare', slug: 'cloudflare', group: 'tech', blurb: 'Workers、KV、D1、R2 等边缘平台能力。' },
  { name: 'GitHub Actions', slug: 'github-actions', group: 'tech', blurb: 'workflow、定时任务与 CI/CD 实践。' },
  { name: 'Docker', slug: 'docker', group: 'tech', blurb: '容器与镜像。' },
  { name: 'Linux', slug: 'linux', group: 'tech', blurb: 'Linux 系统与服务器运维。' },
  { name: '命令行', slug: 'cli', group: 'tech', blurb: '终端、shell 与命令行工具。' },
  { name: '数据库', slug: 'database', group: 'tech', blurb: 'SQL、索引与数据建模。' },
  { name: '测试', slug: 'testing', group: 'tech', blurb: '单元测试、集成测试与断言设计。' },
  { name: 'MCP', slug: 'mcp', group: 'tech', blurb: 'Model Context Protocol 的配置与接入。' },
  { name: 'Agent', slug: 'agent', group: 'tech', blurb: '编码 Agent 与自主任务执行。' },
  { name: 'Claude Code', slug: 'claude-code', group: 'tech', blurb: 'Claude Code 的配置与用法。' },
  { name: 'Codex', slug: 'codex', group: 'tech', blurb: 'Codex 的配置与用法。' },
  { name: 'AI 编程', slug: 'ai-coding', group: 'tech', blurb: '用 AI 辅助写代码的工作流。' },
  { name: 'MATLAB', slug: 'matlab', group: 'tech', blurb: 'MATLAB 语言与工具箱。' },
  { name: 'Simulink', slug: 'simulink', group: 'tech', blurb: 'Simulink 建模与仿真。' },
  { name: 'PyTorch', slug: 'pytorch', group: 'tech', blurb: '关于PyTorch的相关知识' },
  // 算法
  { name: '双指针', slug: 'two-pointers', group: 'algo', blurb: '对撞、快慢与分离指针。' },
  { name: '滑动窗口', slug: 'sliding-window', group: 'algo', blurb: '可变与定长窗口的维护。' },
  { name: '前缀和', slug: 'prefix-sum', group: 'algo', blurb: '前缀和与差分。' },
  { name: '二分查找', slug: 'binary-search', group: 'algo', blurb: '二分位置与二分答案。' },
  { name: '排序', slug: 'sorting', group: 'algo', blurb: '排序作为前置处理或问题本身。' },
  { name: '贪心', slug: 'greedy', group: 'algo', blurb: '局部最优与交换论证。' },
  { name: '回溯', slug: 'backtracking', group: 'algo', blurb: '搜索、剪枝与撤销。' },
  { name: '分治', slug: 'divide-and-conquer', group: 'algo', blurb: '拆分、递归与合并。' },
  { name: '动态规划', slug: 'dynamic-programming', group: 'algo', blurb: '状态设计、转移与优化。' },
  { name: '深度优先搜索', slug: 'dfs', group: 'algo', blurb: 'DFS 遍历与其变形。' },
  { name: '广度优先搜索', slug: 'bfs', group: 'algo', blurb: 'BFS 分层与最短路。' },
  { name: '记忆化搜索', slug: 'memoization', group: 'algo', blurb: '自顶向下的 DP 写法。' },
  { name: '位运算', slug: 'bit-manipulation', group: 'algo', blurb: '位掩码与状态压缩。' },
  { name: '单调栈', slug: 'monotonic-stack', group: 'algo', blurb: '下一个更大元素这一类。' },
  { name: '拓扑排序', slug: 'topological-sort', group: 'algo', blurb: '入度、出度与依赖顺序。' },
  { name: '最短路', slug: 'shortest-path', group: 'algo', blurb: 'Dijkstra、Bellman-Ford 与 Floyd。' },
  { name: '数学', slug: 'math', group: 'algo', blurb: '数论、组合与数学观察。' },
  { name: '模拟', slug: 'simulation', group: 'algo', blurb: '按题意直接实现过程。' },
  { name: '复杂度分析', slug: 'complexity', group: 'algo', blurb: '时间与空间复杂度的估算。' },
  { name: '递归', slug: 'recursion', group: 'algo', blurb: '用递归思想求解算法题的方法' },
  { name: '字符串匹配', slug: 'string-matching', group: 'algo', blurb: 'KMP 等在主串中查找模式串的算法。' },
  // 数据结构
  { name: '数组', slug: 'array', group: 'dsa', blurb: '连续存储与随机访问。' },
  { name: '字符串', slug: 'string', group: 'dsa', blurb: '字符串的表示与处理。' },
  { name: '链表', slug: 'linked-list', group: 'dsa', blurb: '指针串联的线性结构。' },
  { name: '栈', slug: 'stack', group: 'dsa', blurb: '后进先出。' },
  { name: '队列', slug: 'queue', group: 'dsa', blurb: '先进先出与双端队列。' },
  { name: '哈希表', slug: 'hash-table', group: 'dsa', blurb: '散列、冲突与查找。' },
  { name: '堆', slug: 'heap', group: 'dsa', blurb: '优先队列与堆化。' },
  { name: '树', slug: 'tree', group: 'dsa', blurb: '父子关系、遍历与树高。' },
  { name: '二叉树', slug: 'binary-tree', group: 'dsa', blurb: '遍历、递归与树的形态。' },
  { name: '二叉搜索树', slug: 'bst', group: 'dsa', blurb: '有序性与查找维护。' },
  { name: 'B 树', slug: 'b-tree', group: 'dsa', blurb: '多路平衡查找树。' },
  { name: 'B+ 树', slug: 'b-plus-tree', group: 'dsa', blurb: '数据落在叶子的多路查找树。' },
  { name: '红黑树', slug: 'red-black-tree', group: 'dsa', blurb: '自平衡与旋转。' },
  { name: '字典树', slug: 'trie', group: 'dsa', blurb: '前缀树与逐位存储。' },
  { name: '图', slug: 'graph', group: 'dsa', blurb: '邻接表、邻接矩阵与图的表示。' },
  { name: '并查集', slug: 'union-find', group: 'dsa', blurb: '路径压缩与按秩合并。' },
  { name: '树状数组', slug: 'fenwick-tree', group: 'dsa', blurb: '区间和的轻量维护。' },
  { name: '线段树', slug: 'segment-tree', group: 'dsa', blurb: '区间查询与懒惰标记。' },
  { name: '迭代', slug: 'iteration', group: 'dsa', blurb: '按步推进、循环求解，和递归互为对照。' },
  // 体裁
  { name: '排障复盘', slug: 'postmortem', group: 'kind', blurb: '一个具体问题从发现、定位到修好的完整过程。' },
  { name: '实验', slug: 'experiment', group: 'kind', blurb: '带对照和数字的实验记录。' },
  { name: '踏查', slug: 'fieldwork', group: 'kind', blurb: '去现场看、记、再写进系统。' },
  { name: '方法论', slug: 'methodology', group: 'kind', blurb: '从多次踩坑里沉淀下来的做法。' },
  { name: '反思', slug: 'reflection', group: 'kind', blurb: '不那么技术的想法。' },
  // 模型印象（模型榜单用，文章里也可以用来给自己的判断打标）
  { name: '日常主力', slug: 'daily-driver', group: 'model', blurb: '会长期留在默认入口里的那种。' },
  { name: '代码', slug: 'coding', group: 'model', blurb: '写代码、改仓库、读报错这类活。' },
  { name: '中文', slug: 'chinese', group: 'model', blurb: '中文表达自然，不是翻译腔。' },
  { name: '写作', slug: 'writing', group: 'model', blurb: '文字表达自然，长文读起来不端着。' },
  { name: '长上下文', slug: 'long-context', group: 'model', blurb: '塞进去一大坨材料还能记住。' },
  { name: '工具调用', slug: 'tool-use', group: 'model', blurb: '函数调用、结构化输出稳定。' },
  { name: '多模态', slug: 'multimodal', group: 'model', blurb: '看图、截图、图表读得懂。' },
  { name: '强推理', slug: 'strong-reasoning', group: 'model', blurb: '难题肯想、步骤站得住。' },
  { name: '便宜', slug: 'cheap', group: 'model', blurb: '价格低到可以随手用。' },
  { name: '快', slug: 'fast', group: 'model', blurb: '首字和出字都利索。' },
  { name: '慢', slug: 'slow', group: 'model', blurb: '等它出结果要有点耐心。' },
  { name: '贵', slug: 'pricey', group: 'model', blurb: '用之前要先算一下账。' },
  { name: '稳定', slug: 'stable', group: 'model', blurb: '同样的提示词，结果不会一天一个样。' },
  { name: '创意', slug: 'creative', group: 'model', blurb: '写东西的时候敢往意外处走。' },
] as const satisfies readonly { name: string; slug: string; group: TagGroupId; blurb: string }[];

export type TagName = (typeof TAGS)[number]['name'];
export const TAG_NAMES = TAGS.map((t) => t.name) as [TagName, ...TagName[]];

/*
 * 系列：半受控词表。
 *
 * 文章 frontmatter 的 series 还是自由字符串（新建系列直接在文章里写名字），
 * 这里登记的名字会进编辑器的自动补全，防止「热题100 / 热题 100」这种漂移。
 */
export const SERIES = [
  { name: '记忆系统工程笔记', blurb: '长期记忆系统的设计、踩坑与迭代。' },
  { name: 'AI 时代手记', blurb: 'AI 时代里学习、工作和生活的一些记录。' },
  { name: '力扣热题 100', blurb: '力扣热题 100 的题解。' },
  { name: '数据结构笔记', blurb: '数据结构的概念与实现讲解。' },
  { name: 'GitHub Actions 笔记', blurb: 'GitHub Actions 的用法与自动化实践。' },
] as const;

/** 每页文章数。 */
export const POSTS_PER_PAGE = 12;

/** 中文平均阅读速度，字/分钟。 */
export const CJK_CHARS_PER_MINUTE = 380;
/** 西文平均阅读速度，词/分钟。 */
export const LATIN_WORDS_PER_MINUTE = 220;
