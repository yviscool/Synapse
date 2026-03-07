import type { SupportedLocale } from '@/types/i18n'

export interface DefaultPromptSeed {
  title: string
  content: string
  categoryId: string
}

const EN_DEFAULT_PROMPTS: DefaultPromptSeed[] = [
  {
    title: 'Creative Brainstorm Sprint',
    categoryId: 'creative',
    content: [
      'You are a senior creative strategist.',
      'Goal: {goal}',
      'Audience: {audience}',
      'Constraints: {constraints}',
      '',
      'Please provide:',
      '1. 12 distinct ideas grouped into 3 directions',
      '2. For each idea: one-line pitch + why it works',
      '3. Top 3 recommendations with execution steps',
      '4. One quick-start action I can do today',
      '',
      'Use concise bullet points.',
    ].join('\n'),
  },
  {
    title: 'High-Impact Rewrite Editor',
    categoryId: 'writing',
    content: [
      'Act as a strict writing editor.',
      'Task: rewrite the text below for clarity, logic, and impact.',
      '',
      'Text:',
      '{text}',
      '',
      'Output format:',
      '1. Rewritten version',
      '2. 3 key improvements made',
      '3. 2 optional tone variants (professional / concise)',
    ].join('\n'),
  },
  {
    title: 'Senior Code Reviewer',
    categoryId: 'coding',
    content: [
      'You are a pragmatic senior engineer reviewing this code.',
      'Language: {language}',
      'Code:',
      '{code}',
      '',
      'Please return:',
      '1. Critical bugs and edge cases',
      '2. Maintainability and readability issues',
      '3. Security/performance concerns',
      '4. A revised code snippet with minimal changes',
    ].join('\n'),
  },
  {
    title: 'Structured Problem Analyzer',
    categoryId: 'analysis',
    content: [
      'Break down the following problem using first-principles thinking:',
      '{problem}',
      '',
      'Please include:',
      '1. Core assumptions',
      '2. Missing information',
      '3. A step-by-step solution path',
      '4. Risks and fallback plans',
      '5. Final recommendation',
    ].join('\n'),
  },
  {
    title: 'Conversion Copy Generator',
    categoryId: 'marketing',
    content: [
      'Create conversion-focused copy for this offer.',
      'Product/Service: {product}',
      'Audience: {audience}',
      'Channel: {channel}',
      'Value proposition: {value}',
      '',
      'Deliver:',
      '1. 5 headline options',
      '2. 3 CTA options',
      '3. A full short-form copy draft',
      '4. 3 A/B test ideas',
    ].join('\n'),
  },
  {
    title: 'Bilingual Translator and Polisher',
    categoryId: 'translation',
    content: [
      'Translate and polish the text.',
      'Source language: {sourceLanguage}',
      'Target language: {targetLanguage}',
      '',
      'Text:',
      '{text}',
      '',
      'Return:',
      '1. Natural translation',
      '2. Literal translation (for reference)',
      '3. Notes on key wording choices',
    ].join('\n'),
  },
]

const ZH_CN_DEFAULT_PROMPTS: DefaultPromptSeed[] = [
  {
    title: '创意脑暴加速器',
    categoryId: 'creative',
    content: [
      '你是一名资深创意策略顾问。',
      '目标：{goal}',
      '受众：{audience}',
      '约束：{constraints}',
      '',
      '请输出：',
      '1. 12 个创意点子，分成 3 个方向',
      '2. 每个点子包含：一句话主张 + 为什么有效',
      '3. 最推荐的 3 个方案及执行步骤',
      '4. 今天就能开始的一个最小动作',
      '',
      '请用简洁要点回答。',
    ].join('\n'),
  },
  {
    title: '高质量改写编辑器',
    categoryId: 'writing',
    content: [
      '你是一名严格的写作编辑。',
      '任务：把下面文本改写得更清晰、有逻辑、有说服力。',
      '',
      '文本：',
      '{text}',
      '',
      '输出格式：',
      '1. 改写后的版本',
      '2. 你做出的 3 个关键优化',
      '3. 2 个可选语气版本（专业版 / 精简版）',
    ].join('\n'),
  },
  {
    title: '资深代码审查官',
    categoryId: 'coding',
    content: [
      '你是一名务实的资深工程师，请审查以下代码。',
      '语言：{language}',
      '代码：',
      '{code}',
      '',
      '请返回：',
      '1. 致命问题和边界条件',
      '2. 可维护性与可读性问题',
      '3. 安全/性能风险',
      '4. 最小改动版的修订代码',
    ].join('\n'),
  },
  {
    title: '第一性原理分析器',
    categoryId: 'analysis',
    content: [
      '请用第一性原理拆解这个问题：',
      '{problem}',
      '',
      '请包含：',
      '1. 核心假设',
      '2. 关键缺失信息',
      '3. 分步骤解决路径',
      '4. 风险与备选方案',
      '5. 最终建议',
    ].join('\n'),
  },
  {
    title: '转化文案生成器',
    categoryId: 'marketing',
    content: [
      '请为这个产品生成以转化为目标的文案。',
      '产品/服务：{product}',
      '受众：{audience}',
      '渠道：{channel}',
      '核心价值：{value}',
      '',
      '请输出：',
      '1. 5 条标题',
      '2. 3 条 CTA',
      '3. 一版完整短文案',
      '4. 3 个 A/B 测试方向',
    ].join('\n'),
  },
  {
    title: '双语翻译润色助手',
    categoryId: 'translation',
    content: [
      '请翻译并润色下面文本。',
      '源语言：{sourceLanguage}',
      '目标语言：{targetLanguage}',
      '',
      '文本：',
      '{text}',
      '',
      '请返回：',
      '1. 自然表达版本',
      '2. 直译版本（供参考）',
      '3. 关键措辞说明',
    ].join('\n'),
  },
]

const ZH_TW_DEFAULT_PROMPTS: DefaultPromptSeed[] = [
  {
    title: '創意腦暴加速器',
    categoryId: 'creative',
    content: [
      '你是一名資深創意策略顧問。',
      '目標：{goal}',
      '受眾：{audience}',
      '約束：{constraints}',
      '',
      '請輸出：',
      '1. 12 個創意點子，分成 3 個方向',
      '2. 每個點子包含：一句話主張 + 為什麼有效',
      '3. 最推薦的 3 個方案與執行步驟',
      '4. 今天就能開始的一個最小動作',
      '',
      '請用精簡要點回答。',
    ].join('\n'),
  },
  {
    title: '高品質改寫編輯器',
    categoryId: 'writing',
    content: [
      '你是一名嚴格的寫作編輯。',
      '任務：把下面文本改寫得更清晰、有邏輯、有說服力。',
      '',
      '文本：',
      '{text}',
      '',
      '輸出格式：',
      '1. 改寫後版本',
      '2. 你做出的 3 個關鍵優化',
      '3. 2 個可選語氣版本（專業版 / 精簡版）',
    ].join('\n'),
  },
  {
    title: '資深程式碼審查官',
    categoryId: 'coding',
    content: [
      '你是一名務實的資深工程師，請審查以下程式碼。',
      '語言：{language}',
      '程式碼：',
      '{code}',
      '',
      '請回傳：',
      '1. 致命問題與邊界條件',
      '2. 可維護性與可讀性問題',
      '3. 安全/效能風險',
      '4. 最小改動版修訂程式碼',
    ].join('\n'),
  },
  {
    title: '第一性原理分析器',
    categoryId: 'analysis',
    content: [
      '請用第一性原理拆解這個問題：',
      '{problem}',
      '',
      '請包含：',
      '1. 核心假設',
      '2. 關鍵缺失資訊',
      '3. 分步驟解決路徑',
      '4. 風險與備選方案',
      '5. 最終建議',
    ].join('\n'),
  },
  {
    title: '轉化文案生成器',
    categoryId: 'marketing',
    content: [
      '請為這個產品生成以轉化為目標的文案。',
      '產品/服務：{product}',
      '受眾：{audience}',
      '渠道：{channel}',
      '核心價值：{value}',
      '',
      '請輸出：',
      '1. 5 條標題',
      '2. 3 條 CTA',
      '3. 一版完整短文案',
      '4. 3 個 A/B 測試方向',
    ].join('\n'),
  },
  {
    title: '雙語翻譯潤色助手',
    categoryId: 'translation',
    content: [
      '請翻譯並潤色以下文本。',
      '源語言：{sourceLanguage}',
      '目標語言：{targetLanguage}',
      '',
      '文本：',
      '{text}',
      '',
      '請回傳：',
      '1. 自然表達版本',
      '2. 直譯版本（供參考）',
      '3. 關鍵措辭說明',
    ].join('\n'),
  },
]

function getLocalizedPromptSeeds(locale: SupportedLocale): DefaultPromptSeed[] {
  if (locale === 'zh-CN') return ZH_CN_DEFAULT_PROMPTS
  if (locale === 'zh-TW') return ZH_TW_DEFAULT_PROMPTS
  return EN_DEFAULT_PROMPTS
}

function shouldIncludeEnglishCompanion(locale: SupportedLocale): boolean {
  return locale === 'zh-CN' || locale === 'zh-TW'
}

export function getDefaultPromptSeeds(locale: SupportedLocale): DefaultPromptSeed[] {
  const localizedPrompts = getLocalizedPromptSeeds(locale)
  if (!shouldIncludeEnglishCompanion(locale)) {
    return localizedPrompts
  }

  return [...localizedPrompts, ...EN_DEFAULT_PROMPTS]
}
