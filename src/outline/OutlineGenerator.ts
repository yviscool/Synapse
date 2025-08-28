import { BaseOutlineGenerator } from './BaseOutlineGenerator';
// ==================== 特定网站的实现类 ====================

/**
 * ChatGPT 大纲生成器
 * 适配 ChatGPT 网站的特定选择器和行为
 */
class ChatGPTOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '[data-message-author-role="user"]',
                messageText: '.whitespace-pre-wrap',
                observeTarget: 'main'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '[data-message-author-role="user"]'
            }
        });
    }
}

/**
 * Gemini 大纲生成器
 * 适配 Google Gemini 网站的特定选择器和行为
 */
class GeminiOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: 'user-query',
                messageText: '.query-text',
                observeTarget: 'chat-window'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: 'user-query .query-text'
            }
        });
    }

    init(isUrlChange = false) {
        const runLogic = () => {
            if (isUrlChange) {
                setTimeout(() => super.run(true), 500);
            } else {
                super.run(false);
            }
        };

        // 等待 Gemini 特定元素加载
        if (document.querySelector('chat-window')) {
            runLogic();
            return;
        }

        const geminiObserver = new MutationObserver((mutations, observer) => {
            if (document.querySelector('chat-window')) {
                observer.disconnect();
                runLogic();
            }
        });

        geminiObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

/**
 * DeepSeek 大纲生成器
 * 适配 DeepSeek 网站的特定选择器和行为
 */
class DeepSeekOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.dad65929 > div:nth-child(odd)',
                messageText: 'div[class*="message_message__"]',
                observeTarget: '.dad65929'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.dad65929 > div:nth-child(odd)'
            }
        });
    }
}

/**
 * Kimi 大纲生成器
 * 适配 Kimi 网站的特定选择器和行为
 */
class KimiOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.chat-content-item-user',
                messageText: '.user-content',
                observeTarget: '.chat-content-list'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.chat-content-item-user'
            }
        });
    }
}

/**
 * 百川 AI 大纲生成器
 * 适配百川 AI 网站的特定选择器和行为，包含特殊的修复逻辑
 */
class BaichuanOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '[data-type="prompt-item"]',
                messageText: '.prompt-text-item',
                observeTarget: 'div[class*="mx-auto"][class*="space-y-"]'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '[data-type="prompt-item"]'
            }
        });
    }

    init(isUrlChange = false) {
        // 百川 AI 需要额外的延迟来处理对话切换
        if (isUrlChange) {
            setTimeout(() => super.run(true), 500);
        } else {
            super.run(false);
        }
    }
}

/**
 * 元宝 AI 大纲生成器
 * 适配腾讯元宝网站的特定选择器和行为
 */
class YuanbaoOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.agent-chat__list__item--human',
                messageText: '.hyc-content-text',
                observeTarget: '.agent-chat__list__content'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.agent-chat__list__item--human'
            }
        });
    }

    init(isUrlChange = false) {
        if (isUrlChange) {
            setTimeout(() => super.run(true), 500);
        } else {
            super.run(false);
        }
    }
}

/**
 * 通义千问大纲生成器 (旧版)
 * 适配阿里通义千问网站的特定选择器和行为
 */
class TongyiOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.questionItem--UrcRIuHd',
                messageText: '.bubble--OXh8Wwa1',
                observeTarget: '.scrollWrapper--G2M0l9ZP'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.questionItem--UrcRIuHd'
            }
        });
    }
}

/**
 * Qwen/通义千问 (新版) 大纲生成器
 * 适配阿里通义千问新域名 (chat.qwen.ai) 的特定选择器和行为
 */
class QwenOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.user-message',
                messageText: '.user-message-content',
                observeTarget: '#chat-message-container'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.user-message'
            }
        });
    }
}

/**
 * Copilot 大纲生成器
 * 适配微软 Copilot 网站的特定选择器和行为
 */
class CopilotOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '[data-content="user-message"]',
                messageText: 'div[class*="whitespace-pre-wrap"]',
                observeTarget: '[data-content="conversation"]'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '[data-content="user-message"]'
            }
        });
    }
}

/**
 * Mistral AI 大纲生成器
 * 适配 Mistral AI 网站的特定选择器和行为
 */
class MistralOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: 'div.group:has(>div>div.ms-auto)',
                messageText: 'span.whitespace-pre-wrap',
                observeTarget: 'div.mx-auto.flex.min-h-full'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: 'div.group:has(>div>div.ms-auto)'
            }
        });
    }
}

/**
 * Z.ai (智谱清言) 大纲生成器
 * 适配 Z.ai (chat.z.ai) 网站的特定选择器和行为
 */
class ZaiOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                // 修正 1: 将用户消息的定义扩大为整个消息组 (group),
                // 这能更准确地匹配到动态添加到页面的节点。
                userMessage: 'div.group:has(.user-message)',

                // 修正 2: 对应地, 在消息组 (group) 内部查找真正的文本气泡。
                messageText: '.user-message div[class*="rounded-xl"]',

                // 修正 3: 将监视目标改为 'body', 这是最稳妥的方式,
                // 可以确保监听到页面上任何位置的 DOM 变动, 从而避免遗漏。
                observeTarget: 'body',
            },
            options: {
                waitForContentLoaded: true,
                // contentReadySelector 也应与 userMessage 保持一致。
                contentReadySelector: 'div.group:has(.user-message)'
            }
        });
    }
}

/**
 * OpenAI Router 大纲生成器
 */
class OpenRouterOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                userMessage: '.group.justify-end', // 用户消息容器
                messageText: '.min-w-0',          // 消息文本容器
                observeTarget: '.flex-1.min-h-0.w-full.overflow-y-auto', // 观察目标
                scrollContainer: '.flex-1.min-h-0.w-full.overflow-y-auto' // 滚动容器
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: '.group.justify-end .min-w-0'
            }
        });
    }
}

/**
 * 豆包 大纲生成器
 */
class DoubaoOutlineGenerator extends BaseOutlineGenerator {
    constructor() {
        super({
            selectors: {
                // 用户消息容器
                userMessage: 'div[data-testid="send_message"]',
                // 消息文本内容
                messageText: 'div[data-testid="message_text_content"]',
                // 观察目标（整个聊天区域）
                observeTarget: 'div.inter-jQQQ8P',
                // 滚动容器
                scrollContainer: 'div.flex-1.min-h-0.w-full.overflow-y-auto'
            },
            options: {
                waitForContentLoaded: true,
                contentReadySelector: 'div[data-testid="send_message"]'
            }
        });
    }
}


/**
 * 主函数
 * 根据当前网站域名选择合适的大纲生成器并初始化
 */
function main() {
    // 网站域名到生成器类的映射
    const generators = {
        'chatgpt.com': ChatGPTOutlineGenerator,
        'gemini.google.com': GeminiOutlineGenerator,
        'chat.deepseek.com': DeepSeekOutlineGenerator,
        'kimi.com': KimiOutlineGenerator,
        'ying.baichuan-ai.com': BaichuanOutlineGenerator,
        'yuanbao.tencent.com': YuanbaoOutlineGenerator,
        'tongyi.com': TongyiOutlineGenerator,
        'chat.qwen.ai': QwenOutlineGenerator, // 新增支持
        'copilot.microsoft.com': CopilotOutlineGenerator,
        'chat.mistral.ai': MistralOutlineGenerator,
        'chat.z.ai': ZaiOutlineGenerator,
        'openrouter.ai': OpenRouterOutlineGenerator,
        'www.doubao.com': DoubaoOutlineGenerator,
    };

    const currentHost = window.location.hostname;

    // 查找匹配的生成器并初始化
    for (const [domain, GeneratorClass] of Object.entries(generators)) {
        if (currentHost.includes(domain)) {
            try {
                new GeneratorClass().init();
                console.log(`✨ 对话大纲生成器已为 ${domain} 启动`);
            } catch (error) {
                console.error(`❌ 对话大纲生成器启动失败:`, error);
            }
            break;
        }
    }
}

// 页面加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}