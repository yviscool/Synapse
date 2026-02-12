/**
 * 统一平台配置
 * 合并 Outline（DOM 选择器）和 Collect（URL 匹配、标题提取）的配置
 *
 * Outline 用：userMessage, messageText, observeTarget, scrollContainer, waitForElement, initDelay, virtualizedList
 * Collect 用：platform, urlPattern, conversationIdPattern, titleSelector
 * 共用：observeTarget（MutationObserver 监听容器）
 */

import type { ChatPlatform } from '@/types/chat'

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

export const siteConfigs: Record<string, SiteConfig> = {
  'chatgpt.com': {
    platform: 'chatgpt',
    observeTarget: 'main',
    userMessage: '[data-message-author-role="user"]',
    messageText: '.whitespace-pre-wrap',
    waitForElement: '[data-message-author-role="user"]',
    urlPattern: /chat\.openai\.com|chatgpt\.com/,
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
    urlPattern: /kimi\.(moonshot\.cn|com)\/chat\//,
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
    conversationIdPattern: /\/chat\/([a-zA-Z0-9_-]+)/,
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
  },
  'tongyi.com': {
    platform: 'other',
    observeTarget: '.scrollWrapper--G2M0l9ZP',
    userMessage: '.questionItem--UrcRIuHd',
    messageText: '.bubble--OXh8Wwa1',
    waitForElement: '.questionItem--UrcRIuHd',
    urlPattern: /tongyi\.com/,
  },
  'chat.qwen.ai': {
    platform: 'other',
    observeTarget: '#chat-message-container',
    userMessage: '.user-message',
    messageText: '.user-message-content',
    waitForElement: '.user-message',
    urlPattern: /chat\.qwen\.ai/,
  },
  'copilot.microsoft.com': {
    platform: 'copilot',
    observeTarget: '[data-content="conversation"]',
    userMessage: '[data-content="user-message"]',
    messageText: 'div[class*="whitespace-pre-wrap"]',
    waitForElement: '[data-content="user-message"]',
    urlPattern: /copilot\.microsoft\.com/,
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

/**
 * 根据当前页面 hostname 获取站点配置
 */
export function getSiteConfig(): SiteConfig | null {
  const host = window.location.hostname
  const key = Object.keys(siteConfigs).find(domain => host.includes(domain))
  return key ? siteConfigs[key] : null
}
