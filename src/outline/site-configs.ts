// src/outline/site-configs.ts

// 定义配置对象的类型，确保一致性
export interface SiteConfig {
  userMessage: string;
  messageText: string;
  observeTarget: string;
  scrollContainer?: string | Window;
  waitForElement?: string;
  initDelay?: number;
}

// 导出一个不可变的配置映射
export const siteConfigs: { [key: string]: SiteConfig } = {
  'chatgpt.com': {
    userMessage: '[data-message-author-role="user"]',
    messageText: '.whitespace-pre-wrap',
    observeTarget: 'main',
    waitForElement: '[data-message-author-role="user"]',
  },
  'gemini.google.com': {
    userMessage: 'user-query',
    messageText: '.query-text',
    observeTarget: 'chat-window',
    waitForElement: 'user-query .query-text',
  },
  'chat.deepseek.com': {
    userMessage: '.dad65929 > div:nth-child(odd)',
    messageText: 'div[class*="message_message__"]',
    observeTarget: '.dad65929',
    waitForElement: '.dad65929 > div:nth-child(odd)',
  },
  'kimi.com': {
    userMessage: '.chat-content-item-user',
    messageText: '.user-content',
    observeTarget: '.chat-content-list',
    waitForElement: '.chat-content-item-user',
    scrollContainer: '.chat-detail-main',
  },
  'ying.baichuan-ai.com': {
    userMessage: '[data-type="prompt-item"]',
    messageText: '.prompt-text-item',
    observeTarget: 'div[class*="mx-auto"][class*="space-y-"]',
    waitForElement: '[data-type="prompt-item"]',
  },
  'yuanbao.tencent.com': {
    userMessage: '.agent-chat__list__item--human',
    messageText: '.hyc-content-text',
    observeTarget: '.agent-chat__list__content',
    waitForElement: '.agent-chat__list__item--human',
  },
  'tongyi.com': {
    userMessage: '.questionItem--UrcRIuHd',
    messageText: '.bubble--OXh8Wwa1',
    observeTarget: '.scrollWrapper--G2M0l9ZP',
    waitForElement: '.questionItem--UrcRIuHd',
  },
  'chat.qwen.ai': {
    userMessage: '.user-message',
    messageText: '.user-message-content',
    observeTarget: '#chat-message-container',
    waitForElement: '.user-message',
  },
  'copilot.microsoft.com': {
    userMessage: '[data-content="user-message"]',
    messageText: 'div[class*="whitespace-pre-wrap"]',
    observeTarget: '[data-content="conversation"]',
    waitForElement: '[data-content="user-message"]',
  },
  'chat.mistral.ai': {
    userMessage: 'div.group:has(>div>div.ms-auto)',
    messageText: 'span.whitespace-pre-wrap',
    observeTarget: 'div.mx-auto.flex.min-h-full',
    waitForElement: 'div.group:has(>div>div.ms-auto)',
  },
  'chat.z.ai': {
    userMessage: 'div.group:has(.user-message)',
    messageText: '.user-message div[class*="rounded-xl"]',
    observeTarget: 'body',
    waitForElement: 'div.group:has(.user-message)',
  },
  'openrouter.ai': {
    userMessage: '.group.justify-end',
    messageText: '.min-w-0',
    observeTarget: '.flex-1.min-h-0.w-full.overflow-y-auto',
    scrollContainer: '.flex-1.min-h-0.w-full.overflow-y-auto',
    waitForElement: '.group.justify-end .min-w-0',
  },
  'www.doubao.com': {
    userMessage: 'div[data-testid="send_message"]',
    messageText: 'div[data-testid="message_text_content"]',
    observeTarget: '[data-testid="message-list"]',
    waitForElement: 'div[data-testid="send_message"]',
  },
} as const;