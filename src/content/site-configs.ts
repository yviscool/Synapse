/**
 * 统一平台配置
 * 合并 Outline（DOM 选择器）和 Collect（URL 匹配、标题提取）的配置
 *
 * Outline 用：userMessage, messageText, observeTarget, scrollContainer, waitForElement, initDelay, virtualizedList
 * Collect 用：platform, urlPattern, conversationIdPattern, titleSelector
 * 共用：observeTarget（MutationObserver 监听容器）
 */

import type { ChatPlatform, PlatformConfig } from '@/types/chat'

export interface SiteConfig {
  // --- 共用 ---
  platform: ChatPlatform
  observeTarget: string

  // --- Outline 用 ---
  userMessage: string
  messageText: string
  scrollContainer?: string | Window
  waitForElement?: string
  initDelay?: number
  virtualizedList?: {
    scrollBarButton: string
    titleAttribute: string
    idLinkAttribute: string
  }

  // --- Collect 用 ---
  urlPattern: RegExp
  conversationIdPattern?: RegExp
  titleSelector?: string[]
}

type PlatformMetaConfig = Omit<PlatformConfig, 'urlPatterns'>

/**
 * 平台 UI 元数据（唯一来源）
 */
export const platformMetaConfigs: Record<ChatPlatform, PlatformMetaConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: 'i-simple-icons-openai',
    iconUrl: 'https://chatgpt.com/favicon.ico',
    color: '#10a37f',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    icon: 'i-simple-icons-anthropic',
    color: '#d97706',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    icon: 'i-simple-icons-google',
    iconUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg',
    color: '#4285f4',
  },
  aistudio: {
    id: 'aistudio',
    name: 'AI Studio',
    icon: 'i-simple-icons-google',
    iconUrl: 'https://www.gstatic.com/aistudio/ai_studio_favicon_2_32x32.png',
    color: '#4285f4',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'i-ri-deepseek-fill',
    color: '#0066ff',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    icon: 'i-carbon-chat-bot',
    iconUrl: 'https://kimi.com/favicon.ico',
    color: '#6366f1',
  },
  doubao: {
    id: 'doubao',
    name: '豆包',
    icon: 'i-carbon-bot',
    iconUrl: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/samantha/logo-icon-white-bg.png',
    color: '#ff6b6b',
  },
  qianwen: {
    id: 'qianwen',
    name: '千问',
    icon: 'i-carbon-chat-bot',
    iconUrl: 'https://assets.alicdn.com/g/qwenweb/qwen-chat-fe/0.2.7/favicon.png',
    color: '#ff6a00',
  },
  yuanbao: {
    id: 'yuanbao',
    name: '腾讯元宝',
    icon: 'i-carbon-ai-status',
    iconUrl: 'https://yuanbao.tencent.com/favicon.ico',
    color: '#07c160',
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    icon: 'i-simple-icons-x',
    iconUrl: 'https://grok.com/images/favicon.svg',
    color: '#000000',
  },
  copilot: {
    id: 'copilot',
    name: 'Copilot',
    icon: 'i-simple-icons-microsoft',
    iconUrl: 'https://copilot.microsoft.com/static/cmc/favicon.ico',
    color: '#0078d4',
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    icon: 'i-carbon-chat-bot',
    iconUrl: 'https://agent.minimaxi.com/assets/logo/favicon_v2.png?v=4',
    color: '#6c5ce7',
  },
  zai: {
    id: 'zai',
    name: '智谱清言',
    icon: 'i-carbon-chat-bot',
    iconUrl: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    color: '#1a73e8',
  },
  other: {
    id: 'other',
    name: '其他',
    icon: 'i-carbon-chat',
    color: '#6b7280',
  },
}

export const siteConfigs: Record<string, SiteConfig> = {
  'chatgpt.com': {
    platform: 'chatgpt',
    observeTarget: 'main',
    userMessage: '[data-message-author-role="user"]',
    messageText: '.whitespace-pre-wrap',
    waitForElement: '[data-message-author-role="user"]',
    urlPattern: /chatgpt\.com/,
    conversationIdPattern: /\/c\/([a-f0-9-]+)/,
    titleSelector: [
      'nav [data-testid="history-item"].bg-token-sidebar-surface-secondary div[class*="truncate"]',
    ],
  },
  'claude.ai': {
    platform: 'claude',
    observeTarget: '[data-testid="conversation-turn-list"]',
    userMessage: '[data-testid="user-message"]',
    messageText: '.whitespace-pre-wrap',
    waitForElement: '[data-testid="user-message"]',
    urlPattern: /claude\.ai\/chat\//,
    conversationIdPattern: /\/chat\/([a-f0-9-]+)/,
    titleSelector: ['[data-testid="chat-menu-trigger"]'],
  },
  'gemini.google.com': {
    platform: 'gemini',
    observeTarget: 'chat-window',
    userMessage: 'user-query',
    messageText: '.query-text',
    waitForElement: 'user-query .query-text',
    urlPattern: /gemini\.google\.com\/app/,
    conversationIdPattern: /\/app\/([a-zA-Z0-9_-]+)/,
    titleSelector: [
      '[data-test-id="conversation-title"]',
      '.conversation-title',
    ],
  },
  'aistudio.google.com': {
    platform: 'aistudio',
    observeTarget: 'ms-autoscroll-container',
    scrollContainer: 'ms-autoscroll-container',
    userMessage: '[data-turn-role="User"]',
    messageText: '.user-chunk',
    waitForElement: '[data-turn-role="User"] .user-chunk',
    initDelay: 500,
    virtualizedList: {
      scrollBarButton: 'ms-prompt-scrollbar button[aria-controls^="turn-"]',
      titleAttribute: 'aria-label',
      idLinkAttribute: 'aria-controls',
    },
    urlPattern: /aistudio\.google\.com/,
    conversationIdPattern: /\/prompts\/([a-zA-Z0-9_-]+)/,
    titleSelector: ['h1.mode-title'],
  },
  'chat.deepseek.com': {
    platform: 'deepseek',
    observeTarget: '.dad65929',
    userMessage: '.dad65929 > div:nth-child(odd)',
    messageText: 'div[class*="message_message__"]',
    waitForElement: '.dad65929 > div:nth-child(odd)',
    urlPattern: /chat\.deepseek\.com/,
    conversationIdPattern: /\/a\/chat\/s\/([a-zA-Z0-9]+)/,
    titleSelector: ['.afa34042'],
  },
  'kimi.com': {
    platform: 'kimi',
    observeTarget: '.chat-content-list',
    scrollContainer: '.chat-detail-main',
    userMessage: '.chat-content-item-user',
    messageText: '.user-content',
    waitForElement: '.chat-content-item-user',
    urlPattern: /kimi\.com\/chat\//,
    conversationIdPattern: /\/chat\/([a-f0-9-]+)/,
    titleSelector: ['.chat-header-content h2'],
  },
  'www.doubao.com': {
    platform: 'doubao',
    observeTarget: '[data-testid="message-list"]',
    userMessage: 'div[data-testid="send_message"]',
    messageText: 'div[data-testid="message_text_content"]',
    waitForElement: 'div[data-testid="send_message"]',
    urlPattern: /doubao\.com/,
    conversationIdPattern: /\/chat\/([a-zA-Z0-9]+)/,
    titleSelector: ['.flex.justify-center .truncate'],
  },
  'grok.com': {
    platform: 'grok',
    observeTarget: 'div.overflow-y-auto.scrollbar-gutter-stable',
    userMessage: 'div.group.items-end[id^="response-"]',
    messageText: '.response-content-markdown .whitespace-pre-wrap',
    waitForElement: 'div.group.items-end[id^="response-"]',
    urlPattern: /grok\.com/,
    conversationIdPattern: /(?:\/(?:chat|c|conversation)\/|[?&](?:conversation(?:Id)?|chatId|threadId)=)([a-zA-Z0-9_-]+)/i,
  },
  'agent.minimaxi.com': {
    platform: 'minimax',
    observeTarget: '#message-container',
    scrollContainer: '#message-container',
    userMessage: 'div[data-msg-id]:has(.sent)',
    messageText: '.message-content .text-pretty',
    waitForElement: 'div[data-msg-id]',
    urlPattern: /agent\.minimaxi\.com\/chat/,
  },
  'chat.z.ai': {
    platform: 'zai',
    observeTarget: '#messages-container',
    scrollContainer: '#messages-container',
    userMessage: 'div.group:has(.user-message)',
    messageText: '.user-message div[class*="rounded-xl"]',
    waitForElement: 'div.group:has(.user-message)',
    urlPattern: /chat\.z\.ai/,
    conversationIdPattern: /\/chat\/([^/?]+)/,
  },
  'ying.baichuan-ai.com': {
    platform: 'other',
    observeTarget: 'div[class*="mx-auto"][class*="space-y-"]',
    userMessage: '[data-type="prompt-item"]',
    messageText: '.prompt-text-item',
    waitForElement: '[data-type="prompt-item"]',
    urlPattern: /ying\.baichuan-ai\.com/,
  },
  'yuanbao.tencent.com': {
    platform: 'yuanbao',
    observeTarget: '.agent-chat__list__content',
    userMessage: '.agent-chat__list__item--human',
    messageText: '.hyc-content-text',
    waitForElement: '.agent-chat__list__item--human',
    urlPattern: /yuanbao\.tencent\.com/,
    conversationIdPattern: /\/chat\/[^/]+\/([a-f0-9-]{36})(?:[/?#]|$)/i,
  },
  'tongyi.com': {
    platform: 'other',
    observeTarget: '.scrollWrapper--G2M0l9ZP',
    userMessage: '.questionItem--UrcRIuHd',
    messageText: '.bubble--OXh8Wwa1',
    waitForElement: '.questionItem--UrcRIuHd',
    urlPattern: /tongyi\.com/,
  },
  'qianwen.com': {
    platform: 'qianwen',
    observeTarget: '#qwen-message-list-area, .message-list-scroll-container, [class^="mainContent-"], [class*=" mainContent-"]',
    scrollContainer: '.message-list-scroll-container',
    userMessage: '[class^="questionItem-"], [class*=" questionItem-"]',
    messageText: '[class^="bubble-"], [class*=" bubble-"]',
    waitForElement: '[class^="questionItem-"], [class*=" questionItem-"]',
    urlPattern: /qianwen\.com/,
  },
  'chat.qwen.ai': {
    platform: 'qianwen',
    observeTarget: '#chat-message-container',
    scrollContainer: '#chat-messages-scroll-container',
    userMessage: '.qwen-chat-message-user',
    messageText: '.chat-user-message .user-message-content',
    waitForElement: '.qwen-chat-message-user .user-message-content',
    urlPattern: /chat\.qwen\.ai/,
  },
  'copilot.microsoft.com': {
    platform: 'copilot',
    observeTarget: '[data-content="conversation"]',
    userMessage: '[role="article"][class*="group/user-message"]',
    messageText: '[data-content="user-message"]',
    waitForElement: '[data-content="user-message"]',
    urlPattern: /copilot\.microsoft\.com/,
    conversationIdPattern: /\/(?:chats|chat|conversation|conversations)\/([a-zA-Z0-9-]+)/i,
  },
  'chat.mistral.ai': {
    platform: 'other',
    observeTarget: 'div.mx-auto.flex.min-h-full',
    userMessage: 'div.group:has(>div>div.ms-auto)',
    messageText: 'span.whitespace-pre-wrap',
    waitForElement: 'div.group:has(>div>div.ms-auto)',
    urlPattern: /chat\.mistral\.ai/,
  },
  'openrouter.ai': {
    platform: 'other',
    observeTarget: '.flex-1.min-h-0.w-full.overflow-y-auto',
    scrollContainer: '.flex-1.min-h-0.w-full.overflow-y-auto',
    userMessage: '.group.justify-end',
    messageText: '.min-w-0',
    waitForElement: '.group.justify-end .min-w-0',
    urlPattern: /openrouter\.ai/,
  },
  'longcat.chat': {
    platform: 'other',
    observeTarget: '.message-list',
    scrollContainer: '.page-content',
    userMessage: '.user-message',
    messageText: '.user-text',
    waitForElement: '.user-message .user-text',
    urlPattern: /longcat\.chat/,
  },
  'chat.inceptionlabs.ai': {
    platform: 'other',
    observeTarget: '#messages-container',
    userMessage: '.user-message',
    messageText: '.user-message p',
    waitForElement: '.user-message',
    urlPattern: /chat\.inceptionlabs\.ai/,
  },
}

function isHostMatch(host: string, domain: string): boolean {
  const normalizedHost = host.trim().toLowerCase()
  const normalizedDomain = domain.trim().toLowerCase()
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`)
}

function getBestMatchedDomain(host: string): string | null {
  let matched: string | null = null

  for (const domain of Object.keys(siteConfigs)) {
    if (!isHostMatch(host, domain)) continue
    if (!matched || domain.length > matched.length) {
      matched = domain
    }
  }

  return matched
}

/**
 * 根据 hostname 获取站点配置
 */
export function getSiteConfigByHostname(hostname: string): SiteConfig | null {
  const matchedDomain = getBestMatchedDomain(hostname)
  return matchedDomain ? siteConfigs[matchedDomain] : null
}

/**
 * 根据 URL 获取站点配置
 */
export function getSiteConfigByUrl(url: string): SiteConfig | null {
  try {
    const parsed = new URL(url)
    return getSiteConfigByHostname(parsed.hostname)
  } catch {
    return null
  }
}

/**
 * 根据当前页面 hostname 获取站点配置
 */
export function getSiteConfig(): SiteConfig | null {
  return getSiteConfigByHostname(window.location.hostname)
}

function createPlatformPatternRecord(): Record<ChatPlatform, RegExp[]> {
  return (Object.keys(platformMetaConfigs) as ChatPlatform[]).reduce((acc, platform) => {
    acc[platform] = []
    return acc
  }, {} as Record<ChatPlatform, RegExp[]>)
}

function mergeUniquePatterns(patterns: RegExp[]): RegExp[] {
  const seen = new Set<string>()
  const result: RegExp[] = []

  for (const pattern of patterns) {
    const key = `${pattern.source}/${pattern.flags}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(pattern)
  }

  return result
}

function buildPlatformPatternsFromSites(): Record<ChatPlatform, RegExp[]> {
  const grouped = createPlatformPatternRecord()
  for (const config of Object.values(siteConfigs)) {
    grouped[config.platform].push(config.urlPattern)
  }
  for (const platform of Object.keys(grouped) as ChatPlatform[]) {
    grouped[platform] = mergeUniquePatterns(grouped[platform])
  }
  return grouped
}

const platformPatterns = buildPlatformPatternsFromSites()

/**
 * 平台配置（由 siteConfigs 自动派生 URL 规则）
 */
export const platformConfigs: Record<ChatPlatform, PlatformConfig> = (
  Object.keys(platformMetaConfigs) as ChatPlatform[]
).reduce((acc, platform) => {
  acc[platform] = {
    ...platformMetaConfigs[platform],
    urlPatterns: platformPatterns[platform],
  }
  return acc
}, {} as Record<ChatPlatform, PlatformConfig>)

export function getPlatformConfig(platform: ChatPlatform): PlatformConfig {
  return platformConfigs[platform] || platformConfigs.other
}

export function getAllPlatforms(): PlatformConfig[] {
  return Object.values(platformConfigs)
}

export function detectPlatformFromUrl(url: string): ChatPlatform {
  const config = getSiteConfigByUrl(url)
  return config?.platform || 'other'
}

export function isIconUrl(icon?: string): boolean {
  if (!icon) return false
  return /^(https?:\/\/|data:image\/|chrome-extension:\/\/|blob:|\/)/i.test(icon.trim())
}

export function getPlatformIconUrl(platform: ChatPlatform | PlatformConfig): string | null {
  const cfg = typeof platform === 'string' ? getPlatformConfig(platform) : platform
  if (cfg.iconUrl?.trim()) return cfg.iconUrl.trim()
  return isIconUrl(cfg.icon) ? cfg.icon.trim() : null
}
