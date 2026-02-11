// src/outline/site-configs.ts

// 定义配置对象的类型，确保一致性
export interface SiteConfig {
  userMessage: string;
  messageText: string;
  observeTarget: string;
  scrollContainer?: string | Window;
  waitForElement?: string;
  initDelay?: number;
// ★ 新增：为虚拟化列表提供专门的选择器
  virtualizedList?: {
    scrollBarButton: string; // 指向滚动条上的按钮
    titleAttribute: string;  // 按钮上存储标题的属性 (例如 'aria-label')
    idLinkAttribute: string; // 按钮上存储目标ID的属性 (例如 'aria-controls')
  };
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
  'aistudio.google.com': {
    userMessage: '[data-turn-role="User"]',
    messageText: '.user-chunk',
    observeTarget: 'ms-autoscroll-container',
    scrollContainer: 'ms-autoscroll-container',
    waitForElement: '[data-turn-role="User"] .user-chunk',
    initDelay: 500, // ★ 建议添加一个延迟，确保滚动条按钮加载完毕
    // ★ 新增：激活虚拟化列表扫描模式
    virtualizedList: {
      scrollBarButton: 'ms-prompt-scrollbar button[aria-controls^="turn-"]',
      titleAttribute: 'aria-label',
      idLinkAttribute: 'aria-controls',
    },
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
    observeTarget: '#messages-container',
    scrollContainer: '#messages-container',
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
  'longcat.chat': {
    userMessage: '.user-message',
    messageText: '.user-text',
    observeTarget: '.message-list',
    scrollContainer: '.page-content',
    waitForElement: '.user-message .user-text',
  },
  'chat.inceptionlabs.ai': {
    userMessage: '.user-message',
    messageText: '.user-message p',
    observeTarget: '#messages-container',
    waitForElement: '.user-message',
  },
  'grok.com': {
    userMessage: 'div.group.items-end[id^="response-"]',
    messageText: '.response-content-markdown .whitespace-pre-wrap',
    observeTarget: 'div.overflow-y-auto.scrollbar-gutter-stable',
    waitForElement: 'div.group.items-end[id^="response-"]',
  },
  'agent.minimaxi.com': {
    userMessage: 'div[data-msg-id]:has(.sent)',
    messageText: '.message-content .text-pretty',
    observeTarget: '#message-container',
    scrollContainer: '#message-container',
    waitForElement: 'div[data-msg-id]',
  },
} as const;
