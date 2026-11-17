/**
 * 最高档 effort 的 /config 重设计：连真实会话记录一起画出来的完整提案。
 *
 * 原站数据在 assets/01f5-oqh6el64.pretty.js 里。终端下半部是配置面板，首屏是
 * 模型、投入档位、快速模式、权限模式、主题五个顶部设置，下面是六个分组和
 * 「已修改的设置」，搜索跨全部设置并高亮命中片段，选择类设置展开 picker。
 * 主题在 picker 里移动会实时改终端配色。进入视口后依次演示六段操作。
 */

export interface MaxOption {
  v: string;
  label: string;
  desc?: string;
  glyph?: string;
  /** 主题选项对应的终端配色 data-t 值 */
  t?: string;
}

export type MaxSettingType = 'choice' | 'toggle' | 'moved';

export interface MaxSetting {
  id: string;
  /** 所属分组 */
  g: string;
  label: string;
  /** 叙述里用的名字，不带标签前缀 */
  name?: string;
  type: MaxSettingType;
  value?: string | boolean;
  def?: string | boolean;
  desc?: string;
  kw?: string;
  options?: MaxOption[];
  unsetLabel?: string;
  plugin?: string;
  moved?: string;
  preview?: boolean;
}

export interface MaxGroup {
  id: string;
  label: string;
  desc: string;
}

const opt = (v: string, label: string, desc?: string, glyph?: string): MaxOption => ({
  v,
  label,
  desc,
  glyph,
});

export const MAX_GROUPS: MaxGroup[] = [
  {
    id: 'behavior',
    label: '行为',
    desc: '输出风格、思考、语言、自动压缩等 9 项',
  },
  {
    id: 'interface',
    label: '界面',
    desc: 'Vim 模式、详细输出、提示、时间格式等 11 项',
  },
  {
    id: 'notifications',
    label: '通知',
    desc: '终端提醒、手机推送，以及终端标签页里的进度',
  },
  {
    id: 'connections',
    label: '连接',
    desc: '编辑器、Chrome、远程控制，以及云端会话',
  },
  {
    id: 'features',
    label: '功能',
    desc: '智能体视图、检查点、工作流、产物等 9 项',
  },
  {
    id: 'plugins',
    label: '插件',
    desc: 'model-router 和 agents-md 声明的设置',
  },
];

export const MAX_GROUP_LABEL: Record<string, string> = Object.fromEntries(
  MAX_GROUPS.map((group) => [group.id, group.label]),
);

export const MAX_GROUP_DESC: Record<string, string> = Object.fromEntries(
  MAX_GROUPS.map((group) => [group.id, group.desc]),
);

const THEME_OPTIONS: MaxOption[] = [
  { v: 'auto', label: '自动', desc: '跟随终端的浅色或深色背景', t: 'dark' },
  { v: 'dark', label: '深色', desc: '浅色文字配深色背景', t: 'dark' },
  { v: 'light', label: '浅色', desc: '深色文字配浅色背景', t: 'light' },
  {
    v: 'dark-daltonized',
    label: '深色 · 色盲友好',
    desc: '用蓝色和橙色代替绿色和红色',
    t: 'dark-daltonized',
  },
  {
    v: 'light-daltonized',
    label: '浅色 · 色盲友好',
    desc: '用蓝色和橙色代替绿色和红色',
    t: 'light-daltonized',
  },
  {
    v: 'dark-ansi',
    label: '深色 · ANSI 配色',
    desc: '只用终端自带的 16 色',
    t: 'dark-ansi',
  },
  {
    v: 'light-ansi',
    label: '浅色 · ANSI 配色',
    desc: '只用终端自带的 16 色',
    t: 'light-ansi',
  },
];

export const MAX_THEME_T: Record<string, string> = Object.fromEntries(
  THEME_OPTIONS.map((option) => [option.v, option.t ?? 'dark']),
);

export const MAX_SETTINGS: MaxSetting[] = [
  /* ---------- 顶部 ---------- */
  {
    id: 'model',
    g: 'top',
    label: '模型',
    type: 'choice',
    value: 'opus5',
    def: 'opus5',
    desc: '回答你的 Claude 模型。也可以用 /model 切换。',
    kw: 'opus sonnet haiku llm',
    options: [
      opt('opus5', 'Opus 5', '能力最强，适合复杂工作'),
      opt('sonnet5', 'Sonnet 5', '快速且有能力，适合日常编码'),
      opt('haiku45', 'Haiku 4.5', '最快，适合快速提问'),
    ],
  },
  {
    id: 'effort',
    g: 'top',
    label: '投入档位',
    type: 'choice',
    value: 'medium',
    def: 'medium',
    desc: 'Claude 每次回复投入多少。越高越慢越深。',
    kw: 'reasoning thinking depth /effort',
    options: [
      opt('low', '低档', '最快回复，思考最少', '○'),
      opt('medium', '中档', '速度与深度平衡', '◐'),
      opt('high', '高档', '思考更久并检查工作', '●'),
      opt('xhigh', '超高档', '用于难题。更慢', '◉'),
      opt('max', '最高档', '思考不设上限。最慢', '◈'),
    ],
  },
  {
    id: 'fast',
    g: 'top',
    label: '快速模式',
    type: 'toggle',
    value: false,
    def: false,
    desc: 'Opus 5 更快回复，按更高费率计费。和 /fast 一样。',
    kw: 'speed quick /fast',
  },
  {
    id: 'permissionMode',
    g: 'top',
    label: '权限模式',
    type: 'choice',
    value: 'auto',
    def: 'manual',
    desc: 'Claude 不经询问可以做什么。新会话从这个模式开始。',
    kw: 'permissions ask approve accept edits plan auto bypass',
    options: [
      opt('manual', '手动', '编辑文件或运行命令前询问'),
      opt('acceptEdits', '接受编辑', '不询问就编辑文件，运行命令前询问'),
      opt('plan', '计划', '只读并规划，批准前不做改动'),
      opt('auto', '自动', '自己批准安全操作，危险操作前询问'),
    ],
  },
  {
    id: 'theme',
    g: 'top',
    label: '主题',
    type: 'choice',
    value: 'auto',
    def: 'auto',
    preview: true,
    desc: '整个界面的配色。在选项上移动会依次预览。',
    kw: 'dark light color colour colorblind daltonized ansi appearance /theme',
    options: THEME_OPTIONS,
  },
  /* ---------- 行为 ---------- */
  {
    id: 'outputStyle',
    g: 'behavior',
    label: '输出风格',
    type: 'choice',
    value: 'default',
    def: 'default',
    desc: 'Claude 如何书写回复。可以在 .claude/output-styles 里添加自己的。',
    kw: 'tone concise explanatory learning proactive /output-style',
    options: [
      opt('default', '默认', 'Claude 处理软件工作的标准风格'),
      opt('proactive', '主动', '立即行动，少打断，更偏好行动而不是规划'),
      opt('concise', '简洁', '先给结果的简短回复'),
      opt('explanatory', '解释型', '解释它的实现选择和代码库模式'),
      opt('learning', '学习型', '暂停下来让你自己写一小段代码'),
    ],
  },
  {
    id: 'thinking',
    g: 'behavior',
    label: '思考',
    type: 'toggle',
    value: true,
    def: true,
    desc: '让 Claude 回答前先思考难题。',
    kw: 'reasoning extended',
  },
  {
    id: 'language',
    g: 'behavior',
    label: '语言',
    type: 'choice',
    value: 'en',
    def: 'en',
    desc: 'Claude 写回复使用的语言。',
    kw: 'locale translate',
    options: [
      opt('en', '英语'),
      opt('es', '西班牙语'),
      opt('fr', '法语'),
      opt('de', '德语'),
      opt('ja', '日语'),
      opt('ko', '韩语'),
      opt('pt', '葡萄牙语'),
      opt('zh', '中文'),
    ],
  },
  {
    id: 'autoCompact',
    g: 'behavior',
    label: '自动压缩',
    type: 'toggle',
    value: false,
    def: true,
    desc: '上下文窗口填满时自动总结对话。',
    kw: 'context compaction summarize window',
  },
  {
    id: 'precompute',
    g: 'behavior',
    label: '预先计算压缩',
    type: 'toggle',
    value: true,
    def: true,
    desc: '提前准备压缩摘要，让压缩瞬间完成。',
    kw: 'context compact experimental',
  },
  {
    id: 'goals',
    g: 'behavior',
    label: 'Claude 提出的目标',
    name: 'Claude 提出的目标',
    type: 'choice',
    value: 'auto',
    def: 'auto',
    desc: 'Claude 是否能为会话提出目标，以及是否先询问。',
    kw: '/goal objective',
    options: [
      opt('auto', '自动', 'Claude 决定什么时候先询问再设定目标'),
      opt('alwaysAsk', '总是询问', '每个提出的目标都要你批准'),
      opt('disabled', '关闭', 'Claude 不提出目标。/goal 仍然可用'),
    ],
  },
  {
    id: 'questionTimeout',
    g: 'behavior',
    label: '问题等待',
    type: 'choice',
    value: '60s',
    def: 'never',
    desc: 'Claude 的问题等你多久后自己继续。',
    kw: 'auto-continue idle away',
    options: [
      opt('never', '从不', '问题会一直等到你回答'),
      opt('60s', '1 分钟'),
      opt('5m', '5 分钟'),
      opt('10m', '10 分钟'),
    ],
  },
  {
    id: 'usageLimit',
    g: 'behavior',
    label: '上限后恢复',
    name: '上限后恢复',
    type: 'toggle',
    value: true,
    def: true,
    desc: '用量上限重置后自动接着做。',
    kw: 'quota rate limit continue',
  },
  {
    id: 'flagged',
    g: 'behavior',
    label: '被标记的消息',
    type: 'choice',
    value: 'unset',
    def: 'unset',
    unsetLabel: '还没问过',
    desc: '安全审查标记一条消息时，切换模型还是先问你。',
    kw: 'refusal fallback safety',
    options: [
      opt('switch', '切换模型', '自动在另一个模型上重试这条消息'),
      opt('ask', '每次询问', '切换模型前先问'),
    ],
  },
  {
    id: 'planAuto',
    g: 'behavior',
    label: '计划阶段自动模式',
    type: 'toggle',
    value: true,
    def: true,
    desc: '在计划模式下，让自动模式批准安全操作而不是询问。',
    kw: 'permissions plan',
  },
  /* ---------- 界面 ---------- */
  {
    id: 'vim',
    g: 'interface',
    label: 'Vim 模式',
    type: 'toggle',
    value: false,
    def: false,
    desc: '用 Vim 按键编辑输入。',
    kw: 'editor keybindings normal insert',
  },
  {
    id: 'verbose',
    g: 'interface',
    label: '详细输出',
    type: 'toggle',
    value: false,
    def: false,
    desc: '显示完整工具输出而不是简短摘要。',
    kw: 'details debug',
  },
  {
    id: 'defaultView',
    g: 'interface',
    label: '默认视图',
    type: 'choice',
    value: 'transcript',
    def: 'transcript',
    desc: '新会话默认打开的视图。',
    kw: 'chat transcript brief',
    options: [
      opt('transcript', '完整记录', '每条消息和每次工具调用'),
      opt('chat', '对话', '聚焦对话的压缩视图'),
    ],
  },
  {
    id: 'tips',
    g: 'interface',
    label: '提示',
    type: 'toggle',
    value: true,
    def: true,
    desc: 'Claude 工作时在旋转指示器下方显示一条提示。',
    kw: 'hints spinner',
  },
  {
    id: 'turnDuration',
    g: 'interface',
    label: '回合耗时',
    type: 'toggle',
    value: true,
    def: true,
    desc: '回复结束时显示花了多久。',
    kw: 'time elapsed',
  },
  {
    id: 'timeFormat',
    g: 'interface',
    label: '时间格式',
    type: 'choice',
    value: 'auto',
    def: 'auto',
    desc: '时间的写法：跟随语言环境、12 小时制、24 小时制，或 UTC。',
    kw: 'clock',
    options: [
      opt('auto', '自动', '跟随你的语言环境'),
      opt('12h', '12 小时制'),
      opt('24h', '24 小时制'),
      opt('utc', '24 小时制 UTC'),
    ],
  },
  {
    id: 'timestamps',
    g: 'interface',
    label: '消息时间戳',
    type: 'toggle',
    value: false,
    def: false,
    desc: '显示每条消息发送的时间。',
    kw: 'clock experimental',
  },
  {
    id: 'prStatus',
    g: 'interface',
    label: 'PR 状态',
    type: 'toggle',
    value: true,
    def: true,
    desc: '在提示符下方显示当前分支的拉取请求。',
    kw: 'pull request github footer',
  },
  {
    id: 'reduceMotion',
    g: 'interface',
    label: '减少动效',
    type: 'toggle',
    value: false,
    def: false,
    desc: '关闭闪光、旋转动画和其他动效。',
    kw: 'animation accessibility',
  },
  {
    id: 'autoScroll',
    g: 'interface',
    label: '自动滚动',
    type: 'toggle',
    value: true,
    def: true,
    desc: '新输出流式出现时保持最新内容可见。只在全屏时生效。',
    kw: 'follow',
  },
  {
    id: 'copyOnSelect',
    g: 'interface',
    label: '选中即复制',
    type: 'toggle',
    value: true,
    def: true,
    desc: '用鼠标选中文字后立即复制。只在全屏时生效。',
    kw: 'clipboard mouse',
  },
  /* ---------- 通知 ---------- */
  {
    id: 'alerts',
    g: 'notifications',
    label: '终端提醒',
    type: 'choice',
    value: 'auto',
    def: 'auto',
    desc: 'Claude 需要你时终端如何引起你的注意。',
    kw: 'notifications bell sound notify',
    options: [
      opt('auto', '自动', '为你的终端选择最合适的方式'),
      opt('iterm2', 'iTerm2'),
      opt('bell', '终端响铃'),
      opt('iterm2bell', 'iTerm2 和响铃'),
      opt('kitty', 'Kitty'),
      opt('ghostty', 'Ghostty'),
      opt('off', '关闭'),
    ],
  },
  {
    id: 'pushNeeds',
    g: 'notifications',
    label: 'Claude 需要你时推送',
    name: 'Claude 需要你时推送',
    type: 'toggle',
    value: false,
    def: false,
    desc: 'Claude 等你时给手机上的 Claude 应用发推送。',
    kw: 'phone mobile notification app',
  },
  {
    id: 'pushDone',
    g: 'notifications',
    label: 'Claude 完成时推送',
    name: 'Claude 完成时推送',
    type: 'toggle',
    value: false,
    def: false,
    desc: '让 Claude 完成你该看的事情时发推送。',
    kw: 'phone mobile notification app',
  },
  {
    id: 'progress',
    g: 'notifications',
    label: '终端标签页进度',
    type: 'toggle',
    value: true,
    def: true,
    desc: 'Claude 工作时在终端标签页或程序坞图标里显示进度。',
    kw: 'progress bar',
  },
  /* ---------- 连接 ---------- */
  {
    id: 'ideConnect',
    g: 'connections',
    label: '连接 IDE',
    name: '连接 IDE',
    type: 'toggle',
    value: false,
    def: false,
    desc: '在外部终端运行 Claude 时启动就连接 IDE。',
    kw: 'vscode jetbrains cursor auto-connect',
  },
  {
    id: 'lastReply',
    g: 'connections',
    label: '编辑器里看上一条回复',
    type: 'toggle',
    value: false,
    def: false,
    desc: '在外部编辑器里打开输入框时显示 Claude 上一条回复。',
    kw: 'ide external',
  },
  {
    id: 'chrome',
    g: 'connections',
    label: 'Chrome 中的 Claude',
    name: 'Chrome 中的 Claude',
    type: 'toggle',
    value: true,
    def: false,
    desc: '让 Claude 通过 Claude in Chrome 扩展使用 Chrome。',
    kw: 'browser web',
  },
  {
    id: 'remoteControl',
    g: 'connections',
    label: '远程控制',
    name: '远程控制',
    type: 'toggle',
    value: false,
    def: false,
    desc: '让每个会话都能从 claude.ai 和 Claude 应用访问。',
    kw: 'phone mobile web',
  },
  {
    id: 'cloudSettings',
    g: 'connections',
    label: '云端会话共享设置',
    name: '云端会话共享设置',
    type: 'toggle',
    value: false,
    def: false,
    desc: '把这台电脑的设置发给你从这里启动的云端会话。',
    kw: 'remote web sync',
  },
  {
    id: 'unattended',
    g: 'connections',
    label: '云端会话下发的命令',
    type: 'choice',
    value: 'unset',
    def: 'unset',
    unsetLabel: '还没问过',
    desc: '让自动模式下的云端会话在你离开时在这里运行命令。',
    kw: 'unattended remote consent',
    options: [
      opt('declined', '不允许', '云端会话不能在这台电脑上运行命令'),
      opt('accepted', '允许', '自动模式下的云端会话可以在这里运行命令'),
    ],
  },
  {
    id: 'otherSessions',
    g: 'connections',
    label: '其他会话的消息',
    type: 'choice',
    value: 'default',
    def: 'default',
    desc: '其他会话发给这个会话的消息会怎样。',
    kw: 'cross-session inbox',
    options: [
      opt('default', '跟随权限模式', '权限模式会询问时就询问'),
      opt('accept', '接受', '立即送达'),
      opt('hold', '暂存', '留到你批准'),
      opt('refuse', '拒绝', '丢弃'),
    ],
  },
  {
    id: 'promptTimeout',
    g: 'connections',
    label: '远程提示超时',
    type: 'choice',
    value: '5m',
    def: '5m',
    desc: '发到手机或网页的提示在取消前等多久。',
    kw: 'dialog expiry',
    options: [
      opt('60s', '1 分钟'),
      opt('5m', '5 分钟'),
      opt('10m', '10 分钟'),
      opt('never', '从不'),
    ],
  },
  /* ---------- 功能 ---------- */
  {
    id: 'agentsView',
    g: 'features',
    label: '智能体视图',
    type: 'choice',
    value: 'on',
    def: 'on',
    desc: '一个视图看所有正在运行的智能体。',
    kw: 'background agents',
    options: [
      opt('off', '关闭'),
      opt('on', '开启', '需要时从提示符打开'),
      opt('start', '启动时打开', '新会话打开智能体视图'),
    ],
  },
  {
    id: 'checkpoints',
    g: 'features',
    label: '检查点',
    type: 'toggle',
    value: true,
    def: true,
    desc: 'Claude 编辑时保存文件快照，方便回退代码改动。',
    kw: 'rewind undo restore',
  },
  {
    id: 'workflows',
    g: 'features',
    label: '动态工作流',
    type: 'toggle',
    value: true,
    def: true,
    desc: '让 Claude 为大型任务运行多智能体工作流。对新会话生效。',
    kw: 'agents',
  },
  {
    id: 'workflowSize',
    g: 'features',
    label: '工作流规模',
    type: 'choice',
    value: 'medium',
    def: 'medium',
    desc: 'Claude 启动工作流时瞄准的规模。',
    kw: 'dynamic',
    options: [
      opt('unrestricted', '不限制'),
      opt('small', '小'),
      opt('medium', '中'),
      opt('large', '大'),
    ],
  },
  {
    id: 'ultracode',
    g: 'features',
    label: 'ultracode 关键词',
    type: 'toggle',
    value: false,
    def: false,
    desc: '在提示里说“ultracode”，就以超高档投入把它当工作流运行。',
    kw: 'trigger',
  },
  {
    id: 'artifacts',
    g: 'features',
    label: '产物',
    type: 'toggle',
    value: true,
    def: true,
    desc: '让 Claude 发布可以打开和分享的页面。对新会话生效。',
    kw: 'pages publish',
  },
  {
    id: 'promptSuggestions',
    g: 'features',
    label: '提示词建议',
    type: 'toggle',
    value: true,
    def: true,
    desc: 'Claude 完成回复后建议下一句提示。',
    kw: 'autocomplete',
  },
  {
    id: 'feedbackDrafts',
    g: 'features',
    label: 'Claude 起草的反馈',
    name: 'Claude 起草的反馈',
    type: 'choice',
    value: 'notify',
    def: 'notify',
    desc: '让 Claude 替你起草关于 Claude Code 的反馈，供你查看和发送。',
    kw: 'bug report',
    options: [
      opt('notify', '通知', '有草稿时告诉你'),
      opt('quiet', '安静', '草稿等着你但不提醒'),
      opt('off', '关闭', 'Claude 不起草反馈'),
    ],
  },
  {
    id: 'teammateMode',
    g: 'features',
    label: '队友模式',
    type: 'choice',
    value: 'inproc',
    def: 'auto',
    desc: '队友在哪里运行：tmux 面板、iTerm2 面板，或这个进程内部。',
    kw: 'experimental',
    options: [
      opt('auto', '自动'),
      opt('tmux', 'tmux'),
      opt('iterm2', 'iTerm2 面板'),
      opt('inproc', '进程内'),
    ],
  },
  /* ---------- 插件 ---------- */
  {
    id: 'mrClassify',
    g: 'plugins',
    plugin: 'model-router',
    label: '分类第一条提示',
    name: '第一条提示分类',
    type: 'toggle',
    value: true,
    desc: '来自 model-router：分类每个会话的第一条提示来选档位。',
  },
  {
    id: 'mrTier',
    g: 'plugins',
    plugin: 'model-router',
    label: '默认档位',
    name: 'model-router 默认档位',
    type: 'choice',
    value: 'max',
    desc: '来自 model-router：第一条提示没分类时使用的档位。',
    options: [opt('low', '低档'), opt('medium', '中档'), opt('high', '高档'), opt('max', '最高档')],
  },
  {
    id: 'amdInstructions',
    g: 'plugins',
    plugin: 'agents-md',
    label: '项目说明文件',
    name: 'agents-md 项目说明',
    type: 'choice',
    value: 'either',
    desc: '来自 agents-md：Claude 在项目里读取哪些说明文件。',
    options: [
      opt('claude', 'CLAUDE.md'),
      opt('agents', 'AGENTS.md'),
      opt('either', 'CLAUDE.md 或 AGENTS.md'),
    ],
  },
  /* ---------- 移到 settings.json 的项 ---------- */
  {
    id: 'mAutoUpdates',
    g: 'moved',
    label: '自动更新通道',
    type: 'moved',
    moved: 'autoUpdatesChannel',
    kw: 'update upgrade latest stable',
  },
  {
    id: 'mWorktree',
    g: 'moved',
    label: '工作树基础引用',
    type: 'moved',
    moved: 'worktree.baseRef',
    kw: 'git branch head fresh',
  },
  {
    id: 'mGitignore',
    g: 'moved',
    label: '文件选择器遵循 .gitignore',
    type: 'moved',
    moved: 'respectGitignore',
    kw: 'git ignore files',
  },
  {
    id: 'mCopy',
    g: 'moved',
    label: '跳过 /copy 选择器',
    type: 'moved',
    moved: 'copyFullResponse',
    kw: 'clipboard',
  },
  {
    id: 'mRecap',
    g: 'moved',
    label: '会话回顾',
    type: 'moved',
    moved: 'awaySummaryEnabled',
    kw: 'summary away',
  },
];

export const MAX_BY_ID: Record<string, MaxSetting> = Object.fromEntries(
  MAX_SETTINGS.map((setting) => [setting.id, setting]),
);

/** 顶部固定的五个设置。 */
export const MAX_TOP = MAX_SETTINGS.filter((setting) => setting.g === 'top');

/** 演示用的初始值（原站 h 表）。 */
export function maxInitialValues(): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const setting of MAX_SETTINGS) {
    if (setting.value !== undefined) values[setting.id] = setting.value;
    else if (setting.def !== undefined) values[setting.id] = setting.def;
  }
  return values;
}
