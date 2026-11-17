/**
 * 高档 effort 的 /config 重设计：完整的 Claude Code 外观。
 *
 * 原站数据在 assets/1h4yeay_uf4au.js 里。首屏固定四个常用设置，下面七个分组
 * 子页，另有「已修改的设置」和「打开 settings.json」两个入口，搜索跨全部设置。
 * 枚举设置进入 picker 子页，主题在 picker 里移动就会实时预览。
 * 这里只做数据，界面和交互在 ConfigHigh.svelte。
 */

export type HighSettingType = 'enum' | 'bool';

export interface HighSetting {
  id: string;
  /** 所属分组 id */
  g: string;
  label: string;
  type: HighSettingType;
  options?: string[];
  def: string | boolean;
  /** 演示初始值，和 def 不同时表示一开始就偏离默认 */
  init?: string | boolean;
  /** 首屏固定列出 */
  pinned?: boolean;
  /** 由组织托管，不能改 */
  managed?: boolean;
  desc: string;
  kw?: string;
}

export interface HighGroup {
  id: string;
  label: string;
}

export const HIGH_GROUPS: HighGroup[] = [
  { id: 'appearance', label: '外观' },
  { id: 'model', label: '模型' },
  { id: 'behavior', label: '行为' },
  { id: 'features', label: '功能' },
  { id: 'notifications', label: '通知' },
  { id: 'connections', label: '连接' },
  { id: 'plugins', label: '插件' },
];

export const HIGH_SETTINGS: HighSetting[] = [
  /* ---------- 外观 ---------- */
  {
    id: 'theme',
    g: 'appearance',
    label: '主题',
    type: 'enum',
    options: ['深色', '浅色', '深色（色盲友好）', '浅色（色盲友好）', '深色（ANSI）', '浅色（ANSI）'],
    def: '深色',
    pinned: true,
    desc: '整个界面的配色。随着光标移动，列表会预览每一种。',
    kw: 'color colour dark light',
  },
  {
    id: 'language',
    g: 'appearance',
    label: '语言',
    type: 'enum',
    options: ['默认（英语）', '西班牙语', '法语', '德语', '日语', '韩语', '葡萄牙语'],
    def: '默认（英语）',
    desc: 'Claude 回复使用的语言。',
    kw: 'locale',
  },
  {
    id: 'reduceMotion',
    g: 'appearance',
    label: '减少动效',
    type: 'bool',
    def: false,
    desc: '用静态指示器代替旋转动画和闪光。',
    kw: 'animation spinner accessibility',
  },
  {
    id: 'timeFormat',
    g: 'appearance',
    label: '时间格式',
    type: 'enum',
    options: ['跟随系统', '12 小时制', '24 小时制'],
    def: '跟随系统',
    desc: '记录和底部时间里时间的写法。',
    kw: 'clock',
  },
  {
    id: 'timestamps',
    g: 'appearance',
    label: '消息时间戳',
    type: 'bool',
    def: false,
    desc: '在每条消息旁显示时间。',
    kw: 'time clock',
  },
  {
    id: 'tips',
    g: 'appearance',
    label: '显示提示',
    type: 'bool',
    def: true,
    init: false,
    desc: 'Claude 工作时在旋转指示器下方偶尔显示提示。',
    kw: 'hints',
  },
  {
    id: 'turnDuration',
    g: 'appearance',
    label: '显示回合耗时',
    type: 'bool',
    def: true,
    desc: '显示每个回合花了多久。',
    kw: 'time timing',
  },
  {
    id: 'prStatus',
    g: 'appearance',
    label: '显示 PR 状态',
    type: 'bool',
    def: true,
    desc: '在底部显示当前分支的拉取请求。',
    kw: 'github pull request footer',
  },
  {
    id: 'progressBar',
    g: 'appearance',
    label: '终端进度条',
    type: 'bool',
    def: true,
    desc: '在终端标签页或程序坞图标里显示进度。',
    kw: 'tab dock',
  },
  {
    id: 'autoScroll',
    g: 'appearance',
    label: '自动滚动',
    type: 'bool',
    def: true,
    desc: '有新输出流式出现时自动跟随。',
    kw: 'scroll',
  },
  /* ---------- 模型 ---------- */
  {
    id: 'model',
    g: 'model',
    label: '模型',
    type: 'enum',
    options: ['默认（Opus）', 'Opus', 'Sonnet', 'Haiku'],
    def: '默认（Opus）',
    pinned: true,
    desc: '新回合使用的模型。和 /model 一样。',
    kw: 'opus sonnet haiku',
  },
  {
    id: 'fast',
    g: 'model',
    label: '快速模式',
    type: 'bool',
    def: false,
    desc: '同一个模型更快输出。',
    kw: 'speed',
  },
  {
    id: 'thinking',
    g: 'model',
    label: '思考',
    type: 'bool',
    def: true,
    desc: '让 Claude 回答前先思考。',
    kw: 'reasoning extended',
  },
  {
    id: 'outputStyle',
    g: 'model',
    label: '输出风格',
    type: 'enum',
    options: ['默认', '解释型', '学习型'],
    def: '默认',
    desc: 'Claude 工作时解释多少。',
    kw: 'explain learning',
  },
  {
    id: 'autoContinue',
    g: 'model',
    label: '上限后继续',
    type: 'bool',
    def: false,
    desc: '到达用量上限时继续工作而不是暂停。',
    kw: 'limit usage quota',
  },
  /* ---------- 行为 ---------- */
  {
    id: 'permissionMode',
    g: 'behavior',
    label: '权限模式',
    type: 'enum',
    options: ['编辑前询问', '接受编辑', '计划', '自动'],
    def: '编辑前询问',
    pinned: true,
    desc: '会话开始时 Claude 不经询问可以做什么。',
    kw: 'permissions allow ask auto plan',
  },
  {
    id: 'autoPlan',
    g: 'behavior',
    label: '计划阶段自动模式',
    type: 'bool',
    def: true,
    desc: '在计划模式下应用自动模式权限。',
    kw: 'permissions plan',
  },
  {
    id: 'autoCompact',
    g: 'behavior',
    label: '自动压缩',
    type: 'bool',
    def: true,
    desc: '上下文窗口填满时总结较早的内容。',
    kw: 'context compaction',
  },
  {
    id: 'editor',
    g: 'behavior',
    label: '编辑器模式',
    type: 'enum',
    options: ['普通', 'Vim'],
    def: '普通',
    pinned: true,
    desc: '输入框的按键绑定。',
    kw: 'vim keys keyboard input',
  },
  {
    id: 'copyOnSelect',
    g: 'behavior',
    label: '选中即复制',
    type: 'bool',
    def: false,
    desc: '选中文字后立即复制到剪贴板。',
    kw: 'clipboard',
  },
  {
    id: 'promptSuggestions',
    g: 'behavior',
    label: '提示词建议',
    type: 'bool',
    def: true,
    desc: '回合结束时建议下一句提示。',
    kw: 'suggest',
  },
  {
    id: 'questionTimeout',
    g: 'behavior',
    label: '问题自动继续',
    type: 'enum',
    options: ['从不', '1 分钟后', '5 分钟后', '15 分钟后'],
    def: '从不',
    desc: '不回答 Claude 的问题时，按它的最佳猜测继续。',
    kw: 'timeout question',
  },
  {
    id: 'verbose',
    g: 'behavior',
    label: '详细输出',
    type: 'bool',
    def: false,
    desc: '在记录里显示完整的工具输出。',
    kw: 'debug logs',
  },
  /* ---------- 功能 ---------- */
  {
    id: 'agentsView',
    g: 'features',
    label: '智能体视图',
    type: 'bool',
    def: false,
    desc: '会话开始时打开智能体视图。',
    kw: 'subagents background',
  },
  {
    id: 'workflows',
    g: 'features',
    label: '动态工作流',
    type: 'bool',
    def: true,
    desc: '让 Claude 为大型任务运行多步骤工作流。',
    kw: 'workflow',
  },
  {
    id: 'artifacts',
    g: 'features',
    label: '产物',
    type: 'bool',
    def: true,
    desc: '让 Claude 发布可以在浏览器打开的页面。',
    kw: 'html page',
  },
  {
    id: 'goals',
    g: 'features',
    label: 'Claude 提出的目标',
    type: 'bool',
    def: true,
    desc: '让 Claude 为长任务建议目标。',
    kw: 'goal',
  },
  {
    id: 'checkpoints',
    g: 'features',
    label: '回退代码',
    type: 'bool',
    def: true,
    desc: '给文件拍快照，让 /rewind 撤销 Claude 的修改。',
    kw: 'checkpoints undo rewind',
  },
  {
    id: 'chrome',
    g: 'features',
    label: 'Chrome 中的 Claude',
    type: 'bool',
    def: false,
    desc: '让 Claude 在每个会话里使用你的浏览器。',
    kw: 'browser chrome',
  },
  /* ---------- 通知 ---------- */
  {
    id: 'notifChannel',
    g: 'notifications',
    label: '本地通知',
    type: 'enum',
    options: ['自动', '终端响铃', 'iTerm2', '系统', '关闭'],
    def: '自动',
    init: '终端响铃',
    desc: 'Claude 在这台电脑上如何提醒你。',
    kw: 'bell alert sound notify',
  },
  {
    id: 'pushInput',
    g: 'notifications',
    label: '需要输入时推送',
    type: 'bool',
    def: true,
    desc: 'Claude 等你时通知你的手机。',
    kw: 'mobile phone push',
  },
  {
    id: 'pushDecide',
    g: 'notifications',
    label: 'Claude 判断时推送',
    type: 'bool',
    def: false,
    desc: 'Claude 觉得你会想知道时通知你的手机。',
    kw: 'mobile phone push',
  },
  /* ---------- 连接 ---------- */
  {
    id: 'autoConnectIde',
    g: 'connections',
    label: '自动连接 IDE',
    type: 'bool',
    def: true,
    desc: '从外部终端启动时连接正在运行的 IDE。',
    kw: 'vscode jetbrains ide',
  },
  {
    id: 'autoInstallIde',
    g: 'connections',
    label: '自动安装 IDE 扩展',
    type: 'bool',
    def: true,
    init: false,
    managed: true,
    desc: '由你的组织设置。',
    kw: 'vscode jetbrains ide extension',
  },
  {
    id: 'diffTool',
    g: 'connections',
    label: '差异工具',
    type: 'enum',
    options: ['自动', '终端', 'IDE'],
    def: '自动',
    desc: '提议的文件改动在哪里显示。',
    kw: 'diff ide',
  },
  {
    id: 'remoteControl',
    g: 'connections',
    label: '远程控制',
    type: 'bool',
    def: false,
    desc: '让每个会话都能从 claude.ai 和手机访问。',
    kw: 'mobile web remote',
  },
  {
    id: 'crossSession',
    g: 'connections',
    label: '其他会话的消息',
    type: 'bool',
    def: true,
    desc: '让你的其他会话给这个会话发消息。',
    kw: 'inbox sessions',
  },
  {
    id: 'apiKey',
    g: 'connections',
    label: '使用自定义 API 密钥',
    type: 'bool',
    def: false,
    desc: '用 ANTHROPIC_API_KEY 里的密钥代替登录态。',
    kw: 'api key auth login',
  },
  /* ---------- 插件 ---------- */
  {
    id: 'fmtWidth',
    g: 'plugins',
    label: 'formatter › 行宽',
    type: 'enum',
    options: ['80', '100', '120'],
    def: '100',
    desc: '来自 formatter 插件。',
    kw: 'plugin',
  },
  {
    id: 'fmtSave',
    g: 'plugins',
    label: 'formatter › 保存时格式化',
    type: 'bool',
    def: true,
    desc: '来自 formatter 插件。',
    kw: 'plugin',
  },
  {
    id: 'ticketProject',
    g: 'plugins',
    label: 'ticket-sync › 项目',
    type: 'enum',
    options: ['无', 'WEB', 'API', 'INFRA'],
    def: '无',
    desc: '来自 ticket-sync 插件。',
    kw: 'plugin',
  },
];

export const HIGH_BY_ID: Record<string, HighSetting> = Object.fromEntries(
  HIGH_SETTINGS.map((item) => [item.id, item]),
);

export const HIGH_GROUP_MAP: Record<string, HighGroup> = Object.fromEntries(
  HIGH_GROUPS.map((item) => [item.id, item]),
);
