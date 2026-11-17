/**
 * 低档 effort 的 /config 重设计：一份能点、能敲键盘的草图。
 *
 * 原站数据在 assets/0yesba79f8ukb.js 里，六个标签页各一组设置项。
 * 每项要么是开关（bool），要么是在几个选项里循环（cycle，第 0 项是默认值）。
 * 这里只做数据，界面和交互在 ConfigLow.svelte。
 */

export type LowKind = 'bool' | 'cycle';

export interface LowSetting {
  label: string;
  kind: LowKind;
  /** bool 的默认值 */
  value?: boolean;
  /** cycle 的选项，第 0 项是默认值 */
  options?: string[];
  /** 底部帮助行显示的说明 */
  desc: string;
}

export interface LowTab {
  name: string;
  settings: LowSetting[];
}

export const LOW_TABS: LowTab[] = [
  {
    name: '常规',
    settings: [
      {
        label: '模型',
        kind: 'cycle',
        options: ['默认（推荐）', 'Opus', 'Sonnet', 'Haiku'],
        desc: '新对话使用的模型。',
      },
      {
        label: '主题',
        kind: 'cycle',
        options: ['深色', '浅色', '深色（色盲友好）', '浅色（色盲友好）'],
        desc: '终端配色主题。',
      },
      {
        label: '权限模式',
        kind: 'cycle',
        options: ['询问', '接受编辑', '计划', '自动'],
        desc: '会话开始时默认的权限模式。',
      },
      { label: '思考', kind: 'bool', value: true, desc: '让模型回答前先思考。' },
      { label: '快速模式', kind: 'bool', value: false, desc: '在支持的模型上更快输出。' },
      {
        label: '编辑器模式',
        kind: 'cycle',
        options: ['普通', 'Vim'],
        desc: '输入框的按键绑定。',
      },
      {
        label: '语言',
        kind: 'cycle',
        options: ['自动', '英语', '日语', '西班牙语'],
        desc: '回复和界面使用的语言。',
      },
      {
        label: '输出风格',
        kind: 'cycle',
        options: ['默认', '解释型', '学习型'],
        desc: '回复的书写方式。',
      },
    ],
  },
  {
    name: '显示',
    settings: [
      { label: '详细输出', kind: 'bool', value: false, desc: '在记录里显示完整的工具输出。' },
      { label: '自动滚动', kind: 'bool', value: true, desc: '有新输出时自动跟随。' },
      { label: '进度条', kind: 'bool', value: true, desc: '在终端标签页里显示进度。' },
      { label: '提示', kind: 'bool', value: true, desc: '等待时偶尔显示一条提示。' },
      { label: '回合耗时', kind: 'bool', value: false, desc: '显示每个回合花了多久。' },
      {
        label: '时间格式',
        kind: 'cycle',
        options: ['12 小时制', '24 小时制'],
        desc: '时间戳的时钟格式。',
      },
      { label: 'PR 状态', kind: 'bool', value: true, desc: '在底部显示拉取请求状态。' },
      { label: '减少动效', kind: 'bool', value: false, desc: '关闭旋转动画和动效。' },
    ],
  },
  {
    name: '输入',
    settings: [
      { label: '提示词建议', kind: 'bool', value: true, desc: '回合结束后建议下一句提示。' },
      { label: '选中即复制', kind: 'bool', value: false, desc: '选中文字后立即复制。' },
      { label: '检查点', kind: 'bool', value: true, desc: '保存可以回退的文件检查点。' },
      {
        label: '问题等待',
        kind: 'cycle',
        options: ['从不', '1 分钟', '5 分钟'],
        desc: '问题等待多久后继续。',
      },
      { label: '工作流', kind: 'bool', value: true, desc: '允许多智能体工作流。' },
      {
        label: '产物',
        kind: 'bool',
        value: true,
        desc: '让 Claude 发布可以在浏览器打开的页面。',
      },
    ],
  },
  {
    name: '连接',
    settings: [
      {
        label: '通知',
        kind: 'cycle',
        options: ['自动', '终端响铃', 'iTerm2', '关闭'],
        desc: '需要输入时用什么方式提醒你。',
      },
      { label: '推送到手机', kind: 'bool', value: false, desc: '把提醒发到手机应用。' },
      { label: '自动连接 IDE', kind: 'bool', value: true, desc: '启动时连接正在运行的 IDE。' },
      {
        label: '差异工具',
        kind: 'cycle',
        options: ['自动', '终端', 'IDE'],
        desc: '文件差异在哪里打开。',
      },
      { label: 'Chrome', kind: 'bool', value: false, desc: '让 Claude 控制 Chrome。' },
      {
        label: '远程控制',
        kind: 'bool',
        value: false,
        desc: '从其他设备继续这个会话。',
      },
    ],
  },
  {
    name: '用量',
    settings: [
      { label: '自动压缩', kind: 'bool', value: true, desc: '上下文将满时自动总结。' },
      {
        label: '上限后自动继续',
        kind: 'bool',
        value: false,
        desc: '用量上限重置后自动继续。',
      },
      { label: '上限后切换模型', kind: 'bool', value: true, desc: '到达上限时换一个模型。' },
    ],
  },
  {
    name: '高级',
    settings: [
      {
        label: '更新通道',
        kind: 'cycle',
        options: ['latest', 'stable'],
        desc: '这项设置移到 settings.json 的 autoUpdatesChannel。',
      },
      {
        label: '遵循 .gitignore',
        kind: 'bool',
        value: true,
        desc: '这项设置移到 settings.json 的 respectGitignore。',
      },
      {
        label: '复制完整回复',
        kind: 'bool',
        value: false,
        desc: '这项设置移到 settings.json 的 copyFullResponse。',
      },
      {
        label: '离开后回顾',
        kind: 'bool',
        value: true,
        desc: '这项设置移到 settings.json 的 awaySummaryEnabled。',
      },
      {
        label: '时间戳',
        kind: 'bool',
        value: false,
        desc: '实验性功能：在每条消息上显示时间。',
      },
      {
        label: '队友模式',
        kind: 'cycle',
        options: ['自动', '进程内', 'tmux'],
        desc: '实验性功能：队友如何运行。',
      },
    ],
  },
];
