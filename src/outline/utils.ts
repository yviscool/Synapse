/**
 * 轻量版智能意图识别（单一图标输出）——适合浏览器插件
 *
 * 设计目标：准确、快速、无外部依赖，支持中英混合输入与小幅错拼容错。
 */

/* ===========================
   A. 图标库（保持你原来的定义）
   =========================== */
export const ICONS = {
  default:    'i-ph-chat-teardrop-text',
  question:   'i-ph-question',
  help:       'i-ph-info',
  search:     'i-ph-binoculars',
  analyze:    'i-ph-magnifying-glass',
  compare:    'i-ph-scales',
  brainstorm: 'i-ph-lightbulb',
  code:       'i-ph-code',
  debug:      'i-ph-bug',
  refine:     'i-ph-rocket-launch',
  security:   'i-ph-shield-check',
  format:     'i-ph-file-code',
  structure:  'i-ph-tree-structure',
  terminal:   'i-ph-terminal-window',
  storage:    'i-ph-database',
  deploy:     'i-ph-cloud-arrow-up',
  network:    'i-ph-globe-hemisphere-west',
  performance:'i-ph-gauge',
  chart:      'i-ph-chart-bar',
  finance:    'i-ph-currency-circle-dollar',
  legal:      'i-ph-gavel',
  report:     'i-ph-presentation-chart',
  seo:        'i-ph-megaphone',
  strategy:   'i-ph-path',
  management: 'i-ph-users-three',
  marketing:  'i-mdi-bullhorn-outline',
  create:     'i-ph-sparkle',
  summarize:  'i-ph-note-pencil',
  explain:    'i-ph-book-open',
  translate:  'i-carbon-language',
  edit:       'i-ph-pen',
  style:      'i-mdi-palette-swatch',
  write:      'i-ph-pencil-line',
  story:      'i-ph-book-bookmark',
  research:   'i-ph-flask',
  learn:      'i-ph-student',
  paper:      'i-ph-article',
  math:       'i-ph-function',
  design:     'i-ph-paint-brush',
  image:      'i-ph-image',
  video:      'i-ph-video-camera',
  audio:      'i-ph-speaker-high',
  health:     'i-ph-heartbeat',
  travel:     'i-ph-airplane-takeoff',
  food:       'i-ph-bowl-food',
  social:     'i-ph-users',
  email:      'i-ph-envelope-simple',
};

/* ===========================
   B. 意图基因（保留你的列表，但做了轻微数据结构预处理）
   =========================== */

export interface IntentDNA {
  icon: string;
  weight: number;
  keywords: string[];
}

/**
 * NOTE:
 *  - 保持原始关键词语料，但插件初始化时会对其进行规范化和预编译正则。
 */
export const ICON_INTENT_DNA_MAP: IntentDNA[] = [
  { icon: ICONS.deploy,   weight: 10, keywords: ['部署', '发布', '上线', 'deploy', 'publish', 'release', 'vercel', 'netlify', 'aws lambda'] },
  { icon: ICONS.debug,    weight: 10, keywords: ['调试', 'debug', '修复bug', 'troubleshoot', '错误排查', 'fix error', 'stack trace', '堆栈'] },
  { icon: ICONS.legal,    weight: 10, keywords: ['法律', '合同', '条款', '协议', 'nda', '保密协议', 'legal', 'contract', 'terms', 'agreement', 'gdpr', 'compliance'] },
  { icon: ICONS.terminal, weight: 10, keywords: ['命令行', '脚本', 'shell', 'bash', 'powershell', 'zsh', 'command line', 'script'] },
  { icon: ICONS.security, weight: 10, keywords: ['安全', '漏洞', '加密', 'cve', 'xss', '注入', 'security', 'vulnerability', 'encrypt', 'password', 'owasp'] },
  { icon: ICONS.seo,      weight: 10, keywords: ['seo', '搜索引擎优化', 'meta description', 'title tag', 'keyword density'] },
  { icon: ICONS.email,    weight: 10, keywords: ['写邮件', '写一封邮件', 'email', 'draft an email', 'write an email'] },

  { icon: ICONS.refine,   weight: 8, keywords: ['优化', '改进', '改善', '润色', '重构', '提升', '变得更好', 'optimize', 'improve', 'refine', 'enhance', 'polish', 'refactor', 'streamline'] },
  { icon: ICONS.compare,  weight: 8, keywords: ['比较', '对比', '区别', '异同', 'vs', '优缺点', '权衡', 'compare', 'contrast', 'pros and cons'] },
  { icon: ICONS.finance,  weight: 8, keywords: ['财务', '金融', '预算', '股票', '财报', '投资', '经济', 'finance', 'budget', 'stock'] },
  { icon: ICONS.translate,weight: 8, keywords: ['翻译', 'translate', '译文', 'interpret', '翻译成', 'in english'] },
  { icon: ICONS.format,   weight: 8, keywords: ['格式化', '转换', 'format', 'convert', '转成', 'to json', 'to yaml'] },
  { icon: ICONS.storage,  weight: 8, keywords: ['数据库', 'sql', 'nosql', 'redis', 'mysql', 'postgres', 'mongodb', 'database', 'storage', 'query'] },
  { icon: ICONS.summarize,weight: 8, keywords: ['总结', '概括', '摘要', '要点', 'tldr', 'summarize', 'summary'] },

  { icon: ICONS.chart,    weight: 6, keywords: ['图表', '可视化', '画图', '绘制', '数据图', 'chart', 'graph', 'visualize', 'plot'] },
  { icon: ICONS.report,   weight: 6, keywords: ['报告', '周报', '月报', '报表', 'ppt', '幻灯片', 'presentation', 'deck', 'report'] },
  { icon: ICONS.structure,weight: 6, keywords: ['大纲', '结构', '目录', '步骤', '规划', '架构', 'outline', 'structure', 'plan'] },
  { icon: ICONS.marketing,weight: 6, keywords: ['营销', '推广', '广告', '文案', 'marketing', 'copywriting', 'campaign'] },
  { icon: ICONS.strategy, weight: 6, keywords: ['策略', '战略', '方案', '方法论', '商业模式', 'strategy'] },
  { icon: ICONS.learn,    weight: 6, keywords: ['学习', '教程', '指南', '教我', 'tutor', 'tutorial', 'guide'] },
  { icon: ICONS.health,   weight: 6, keywords: ['健康', '健身', '医疗', '食谱', '减肥', 'health', 'fitness'] },
  { icon: ICONS.travel,   weight: 6, keywords: ['旅行', '旅游', '行程', '攻略', 'itinerary', 'trip plan'] },

  { icon: ICONS.explain,  weight: 4, keywords: ['解释', '说明', '阐述', '什么是', 'explain', 'elaborate', 'what is'] },
  { icon: ICONS.edit,     weight: 4, keywords: ['修改', '编辑', '修正', '校对', '改写', 'edit', 'revise', 'proofread'] },
  { icon: ICONS.brainstorm,weight:4, keywords:['想法', '点子', '头脑风暴', 'brainstorm', 'ideas'] },
  { icon: ICONS.style,    weight: 4, keywords: ['风格', '设计', 'ui', 'ux', '配色', 'logo'] },
  { icon: ICONS.story,    weight: 4, keywords: ['故事', '小说', '剧本', '情节', 'story'] },
  { icon: ICONS.social,   weight: 4, keywords: ['推特', '微博', '小红书', 'twitter', 'post', 'social media'] },

  { icon: ICONS.code,     weight: 2, keywords: ['代码', '编程', '实现', '函数', '算法', 'code', 'program', 'implement'] },
  { icon: ICONS.analyze,  weight: 2, keywords: ['分析', '研究', '审查', 'analyze', 'examine', 'review'] },
  { icon: ICONS.create,   weight: 1, keywords: ['生成', '创作', 'compose', 'generate'] },
  { icon: ICONS.write,    weight: 1, keywords: ['写', '编写', 'write'] },
];

/* ===========================
   C. 配置常量（便于在插件设置里暴露给用户）
   =========================== */
const TITLE_BOOST = 1.4;         // 标题匹配系数（>1）
const DECAY_BASE = 0.85;         // 同一图标内重复匹配的衰减基数（越小越快衰减）
const FUZZY_WEIGHT_FACTOR = 0.45; // 模糊匹配的权重率（比精确匹配小）
const FUZZY_MAX_DIST = 2;        // 模糊匹配最大编辑距离上限（实际会根据关键词长度缩放）
const MIN_SCORE_THRESHOLD = 4;   // 置信度阈值，低于该值走降级逻辑（问答/帮助/默认）
const MAX_KEYWORDS_CHECK = 300;  // 安全上限：一次最多处理多少关键词（防止超长规则表或攻击文本）

/* ===========================
   D. 预处理：把关键词做成可快速匹配的对象（在模块加载时执行）
   =========================== */

type PreKeyword = {
  raw: string;
  normalized: string;
  isChinese: boolean;
  regex?: RegExp; // 用于精确匹配（英文使用 \b，中文使用简单子串或字符类）
};

type PreRule = {
  icon: string;
  weight: number;
  keywords: PreKeyword[];
};

const isChineseChar = (s: string) => /[\u4E00-\u9FFF]/.test(s);

function normalizeForMatch(s: string): string {
  if (!s) return '';
  // 把全角标点转半角，最小化差异，并小写化
  const fullToHalfMap: { [k: string]: string } = {
    '：': ':', '，': ',', '。': '.', '！': '!', '？': '?', '（': '(', '）': ')', '【': '[', '】': ']',
    '「': '"', '」': '"', '“': '"', '”': '"', '　': ' ', '、': ',', '；': ';'
  };
  s = s.replace(/[：，。！？（）【】「」“”　、；]/g, ch => fullToHalfMap[ch] ?? ch);
  return s.trim().toLowerCase();
}

const PRE_RULES: PreRule[] = ICON_INTENT_DNA_MAP.map(rule => {
  const klist = rule.keywords.slice(0, MAX_KEYWORDS_CHECK).map(k => {
    const norm = normalizeForMatch(k);
    const isCn = isChineseChar(norm);
    let regex: RegExp | undefined;
    try {
      if (!isCn) {
        // 英文 / 拉丁词：用单词边界匹配，支持 unicode letters (u flag)
        // 但有些关键词 contain spaces like 'title tag' -> escape and \b won't match spaces; we use a more relaxed approach
        const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // if keyword contains spaces, allow word boundary at ends but internal spaces allowed
        if (/\s/.test(escaped)) {
          regex = new RegExp(`\\b${escaped}\\b`, 'iu');
        } else {
          regex = new RegExp(`\\b${escaped}\\b`, 'iu');
        }
      } else {
        // 中文：我们不会加 \b，直接通过 indexOf 检查或 create a non-anchored regex
        const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, 'u');
      }
    } catch (e) {
      regex = undefined;
    }
    return { raw: k, normalized: norm, isChinese: isCn, regex };
  });
  return { icon: rule.icon, weight: rule.weight, keywords: klist };
});

/* ===========================
   E. 工具函数：Levenshtein（带早停的优化）
   说明：用于对短英文词进行轻度模糊匹配。中文不使用。
   =========================== */
function levenshteinLimited(a: string, b: string, maxDist: number): number {
  // early checks
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  if (a === b) return 0;

  let la = a.length, lb = b.length;
  // ensure la <= lb
  if (la > lb) {
    [a, b] = [b, a];
    [la, lb] = [lb, la];
  }

  let prev = new Array(la + 1);
  let cur = new Array(la + 1);
  for (let i = 0; i <= la; i++) prev[i] = i;

  for (let j = 1; j <= lb; j++) {
    cur[0] = j;
    let minCur = cur[0];
    const bj = b.charAt(j - 1);
    for (let i = 1; i <= la; i++) {
      const cost = a.charAt(i - 1) === bj ? 0 : 1;
      cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + cost);
      if (cur[i] < minCur) minCur = cur[i];
    }
    if (minCur > maxDist) return maxDist + 1; // early stop
    [prev, cur] = [cur, prev];
  }
  return prev[la];
}

/* ===========================
   F. 主入口：getIntelligentIcon
   输入：title, content（可选）
   输出：最匹配的图标字符串（ICON CSS 类）
   =========================== */

/**
 * 判断是否为代码块的 heuristics（保留你的原始行为）
 */
function looksLikeCode(content: string): boolean {
  if (!content) return false;
  const t = content.trim();
  if (t.startsWith('```') || t.startsWith('<code') || /<\/?pre>/i.test(t)) return true;
  return false;
}

/**
 * getIntelligentIcon
 */
export function getIntelligentIcon(title: string, content: string = ''): string {
  const titleNorm = normalizeForMatch(title || '');
  const bodyNorm = normalizeForMatch(content ? content.substring(0, 200) : '');

  // 结构化检查：代码块直接判定
  if (looksLikeCode(content)) return ICONS.code;

  // scores & bookkeeping
  const scores: Map<string, number> = new Map();
  const perIconMatchCount: Map<string, number> = new Map(); // 用于衰减

  // small utility
  function addScore(icon: string, delta: number) {
    const cur = scores.get(icon) || 0;
    scores.set(icon, cur + delta);
  }

  // 遍历规则
  for (const rule of PRE_RULES) {
    for (const pk of rule.keywords) {
      if (!pk.normalized) continue;

      // 决定衰减基数（按 icon）
      const count = perIconMatchCount.get(rule.icon) || 0;
      const decay = Math.pow(DECAY_BASE, count);

      // 1) 优先标题精确匹配
      let matched = false;
      try {
        if (pk.regex && pk.regex.test(titleNorm)) {
          addScore(rule.icon, rule.weight * TITLE_BOOST * decay);
          perIconMatchCount.set(rule.icon, count + 1);
          matched = true;
          continue;
        }
      } catch (_) { /* ignore regex errors */ }

      // 2) 内容精确匹配
      try {
        if (pk.regex && pk.regex.test(bodyNorm)) {
          addScore(rule.icon, rule.weight * decay);
          perIconMatchCount.set(rule.icon, count + 1);
          matched = true;
          continue;
        }
      } catch (_) { /* ignore */ }

      // 3) 对英文短词做模糊容错（轻度）
      if (!matched && !pk.isChinese) {
        // pick representative tokens from title and body words
        // only attempt fuzzy if the keyword is short-ish
        const klen = pk.normalized.length;
        const maxDist = Math.min(FUZZY_MAX_DIST, Math.max(1, Math.floor(klen * 0.25)));
        // check words in title & body
        const words = (titleNorm + ' ' + bodyNorm).match(/\p{L}+/gu) || [];
        for (const w of words) {
          if (Math.abs(w.length - pk.normalized.length) > maxDist) continue;
          const dist = levenshteinLimited(w, pk.normalized, maxDist);
          if (dist <= maxDist) {
            // Give lower weight for fuzzy; but earlier title matches would have matched exactly
            addScore(rule.icon, rule.weight * FUZZY_WEIGHT_FACTOR * decay);
            perIconMatchCount.set(rule.icon, count + 1);
            matched = true;
            break;
          }
        }
      }

      // 4) 中文或长词的简单子串检查（降级）
      if (!matched && pk.isChinese) {
        if (titleNorm.includes(pk.normalized)) {
          addScore(rule.icon, rule.weight * TITLE_BOOST * decay);
          perIconMatchCount.set(rule.icon, count + 1);
          matched = true;
        } else if (bodyNorm.includes(pk.normalized)) {
          addScore(rule.icon, rule.weight * decay);
          perIconMatchCount.set(rule.icon, count + 1);
          matched = true;
        }
      }
    }
  }

  // 决策：找最高分图标
  let bestIcon = '';
  let bestScore = 0;
  // tie-breaker：记录最大单个规则权重命中（倾向更“强”的意图）
  const iconMaxRuleWeight: Map<string, number> = new Map();

  // Compute iconMaxRuleWeight for tie-breaker
  for (const rule of PRE_RULES) {
    const existing = iconMaxRuleWeight.get(rule.icon) || 0;
    if (rule.weight > existing) iconMaxRuleWeight.set(rule.icon, rule.weight);
  }

  for (const [icon, sc] of scores.entries()) {
    if (sc > bestScore) {
      bestScore = sc;
      bestIcon = icon;
    } else if (sc === bestScore && sc > 0) {
      // tie-breaker: choose icon with higher base weight
      const curBestW = iconMaxRuleWeight.get(bestIcon) || 0;
      const challengerW = iconMaxRuleWeight.get(icon) || 0;
      if (challengerW > curBestW) {
        bestIcon = icon;
      }
    }
  }

  // 置信度阈值与优雅降级
  if (bestScore >= MIN_SCORE_THRESHOLD) {
    return bestIcon || ICONS.default;
  }

  // 降级逻辑：是否为疑问、请求帮助等
  const ctx = (titleNorm + ' ' + bodyNorm).trim();
  if (/\b(help|如何|怎么办|帮助|怎么|how|what|why|when|who)\b/i.test(ctx) || /[?？]/.test(ctx)) {
    return ICONS.question;
  }
  if (/\b(帮助|求助|需要|assist|please help)\b/i.test(ctx)) {
    return ICONS.help;
  }

  return ICONS.default;
}

/* ===========================
   G. 智能截断（中文友好优化）
   =========================== */
export function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  const slice = text.substring(0, maxLength);

  // 优先在中文标点处截断
  const cnPuncIdx = Math.max(
    slice.lastIndexOf('。'),
    slice.lastIndexOf('！'),
    slice.lastIndexOf('？')
  );
  if (cnPuncIdx > maxLength * 0.5) {
    return text.substring(0, cnPuncIdx + 1);
  }

  // 再找英文句点（". "）
  let cutIndex = slice.lastIndexOf('. ');
  if (cutIndex > maxLength * 0.6) {
    return text.substring(0, cutIndex + 1);
  }

  // 在空格处截断（保持完整单词）
  cutIndex = slice.lastIndexOf(' ');
  if (cutIndex > maxLength * 0.6) {
    return text.substring(0, cutIndex) + '…';
  }

  // 最后硬截断（保留一个省略号）
  return text.substring(0, maxLength - 1) + '…';
}


