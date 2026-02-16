/**
 * 大纲工具函数
 *
 * 手术记录：
 * 原 getIntelligentIcon 使用 Levenshtein 模糊匹配、权重衰减、PreKeyword 预编译正则等机制（~360 行）。
 * 删除原因：图标选择是锦上添花功能，用户对准确度感知阈值极低。
 * 简单的 includes 匹配覆盖 90%+ 场景，剩余回退默认图标完全可接受。
 */

/* ===========================
   图标定义
   =========================== */
const ICONS = {
  default:     'i-ph-chat-teardrop-text',
  question:    'i-ph-question',
  code:        'i-ph-code',
  debug:       'i-ph-bug',
  deploy:      'i-ph-cloud-arrow-up',
  security:    'i-ph-shield-check',
  terminal:    'i-ph-terminal-window',
  storage:     'i-ph-database',
  network:     'i-ph-globe-hemisphere-west',
  performance: 'i-ph-gauge',
  refine:      'i-ph-rocket-launch',
  compare:     'i-ph-scales',
  translate:   'i-carbon-language',
  format:      'i-ph-file-code',
  summarize:   'i-ph-note-pencil',
  explain:     'i-ph-book-open',
  chart:       'i-ph-chart-bar',
  structure:   'i-ph-tree-structure',
  brainstorm:  'i-ph-lightbulb',
  create:      'i-ph-sparkle',
  write:       'i-ph-pencil-line',
  edit:        'i-ph-pen',
  learn:       'i-ph-student',
  design:      'i-ph-paint-brush',
  analyze:     'i-ph-magnifying-glass',
  email:       'i-ph-envelope-simple',
  report:      'i-ph-presentation-chart',
  research:    'i-ph-flask',
  math:        'i-ph-function',
  image:       'i-ph-image',
} as const

/* ===========================
   关键词 → 图标映射（按优先级排序，先匹配先返回）
   =========================== */
// PLACEHOLDER_KEYWORD_MAP
const KEYWORD_ICON_MAP: [string[], string][] = [
  // 高优先级：领域特定
  [['部署', '发布', '上线', 'deploy', 'publish', 'release'], ICONS.deploy],
  [['调试', 'debug', '修复bug', 'troubleshoot', 'fix error'], ICONS.debug],
  [['命令行', 'shell', 'bash', 'powershell', 'zsh', 'terminal'], ICONS.terminal],
  [['安全', '漏洞', '加密', 'xss', 'security', 'vulnerability', 'encrypt'], ICONS.security],
  [['写邮件', 'email', 'draft an email', 'write an email'], ICONS.email],
  [['数据库', 'sql', 'redis', 'mysql', 'postgres', 'mongodb', 'database'], ICONS.storage],
  [['翻译', 'translate', '译文', '翻译成'], ICONS.translate],
  [['图表', '可视化', 'chart', 'graph', 'visualize', 'plot'], ICONS.chart],
  [['数学', '公式', '方程', 'math', 'equation', 'calculus'], ICONS.math],
  [['图片', '图像', 'image', 'photo', '照片'], ICONS.image],

  // 中优先级：动作类
  [['优化', '改进', '重构', 'optimize', 'improve', 'refactor', 'enhance'], ICONS.refine],
  [['比较', '对比', '区别', 'vs', 'compare', 'contrast', 'pros and cons'], ICONS.compare],
  [['格式化', '转换', 'format', 'convert', 'to json', 'to yaml'], ICONS.format],
  [['总结', '概括', '摘要', 'summarize', 'summary', 'tldr'], ICONS.summarize],
  [['大纲', '结构', '目录', '架构', 'outline', 'structure', 'plan'], ICONS.structure],
  [['报告', '周报', '月报', 'ppt', 'report', 'presentation'], ICONS.report],
  [['学习', '教程', '指南', '教我', 'tutorial', 'guide'], ICONS.learn],
  [['设计', 'ui', 'ux', '配色', 'logo', 'design'], ICONS.design],
  [['研究', '论文', 'research', 'paper'], ICONS.research],

  // 低优先级：通用动作
  [['解释', '说明', '什么是', 'explain', 'what is'], ICONS.explain],
  [['修改', '编辑', '校对', '改写', 'edit', 'revise', 'proofread'], ICONS.edit],
  [['想法', '头脑风暴', 'brainstorm', 'ideas'], ICONS.brainstorm],
  [['分析', '审查', 'analyze', 'examine', 'review'], ICONS.analyze],
  [['代码', '编程', '实现', '函数', '算法', 'code', 'program', 'implement', '```'], ICONS.code],
  [['生成', '创作', 'generate', 'compose'], ICONS.create],
  [['写', '编写', 'write'], ICONS.write],
  [['性能', '速度', 'performance', 'latency', 'benchmark'], ICONS.performance],
  [['网络', 'api', 'http', 'websocket', 'network'], ICONS.network],
]

/**
 * 根据标题和内容匹配最合适的图标
 * 简单的 includes 匹配，按优先级排序，先命中先返回
 */
export function getIntelligentIcon(title: string, content: string = ''): string {
  const text = (title + ' ' + content.slice(0, 200)).toLowerCase()

  for (const [keywords, icon] of KEYWORD_ICON_MAP) {
    if (keywords.some(k => text.includes(k))) return icon
  }

  // 降级：疑问句
  if (/[?？]/.test(text) || /如何|怎么|how|what|why/.test(text)) {
    return ICONS.question
  }

  return ICONS.default
}

/* ===========================
   智能截断（中文友好）
   =========================== */
export function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  const slice = text.substring(0, maxLength)

  // 优先在中文标点处截断
  const cnPuncIdx = Math.max(
    slice.lastIndexOf('。'),
    slice.lastIndexOf('！'),
    slice.lastIndexOf('？'),
  )
  if (cnPuncIdx > maxLength * 0.5) {
    return text.substring(0, cnPuncIdx + 1)
  }

  // 英文句点
  let cutIndex = slice.lastIndexOf('. ')
  if (cutIndex > maxLength * 0.6) {
    return text.substring(0, cutIndex + 1)
  }

  // 空格处截断
  cutIndex = slice.lastIndexOf(' ')
  if (cutIndex > maxLength * 0.6) {
    return text.substring(0, cutIndex) + '…'
  }

  return text.substring(0, maxLength - 1) + '…'
}
