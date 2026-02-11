import type { ChatPlatform, PlatformConfig } from "@/types/chat";

/**
 * AI 平台配置
 * 包含平台名称、图标、颜色和 URL 匹配规则
 */
export const PLATFORM_CONFIGS: Record<ChatPlatform, PlatformConfig> = {
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "i-simple-icons-openai",
    color: "#10a37f",
    urlPatterns: [/chat\.openai\.com/, /chatgpt\.com/],
  },
  claude: {
    id: "claude",
    name: "Claude",
    icon: "i-simple-icons-anthropic",
    color: "#d97706",
    urlPatterns: [/claude\.ai/],
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    icon: "i-simple-icons-google",
    color: "#4285f4",
    urlPatterns: [/gemini\.google\.com/, /bard\.google\.com/],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    icon: "i-carbon-machine-learning-model",
    color: "#0066ff",
    urlPatterns: [/chat\.deepseek\.com/],
  },
  kimi: {
    id: "kimi",
    name: "Kimi",
    icon: "i-carbon-chat-bot",
    color: "#6366f1",
    urlPatterns: [/kimi\.moonshot\.cn/],
  },
  doubao: {
    id: "doubao",
    name: "豆包",
    icon: "i-carbon-bot",
    color: "#ff6b6b",
    urlPatterns: [/doubao\.com/, /www\.doubao\.com/],
  },
  yuanbao: {
    id: "yuanbao",
    name: "腾讯元宝",
    icon: "i-carbon-ai-status",
    color: "#07c160",
    urlPatterns: [/yuanbao\.tencent\.com/],
  },
  grok: {
    id: "grok",
    name: "Grok",
    icon: "i-simple-icons-x",
    color: "#000000",
    urlPatterns: [/grok\.x\.ai/, /x\.com\/i\/grok/],
  },
  copilot: {
    id: "copilot",
    name: "Copilot",
    icon: "i-simple-icons-microsoft",
    color: "#0078d4",
    urlPatterns: [/copilot\.microsoft\.com/],
  },
  other: {
    id: "other",
    name: "其他",
    icon: "i-carbon-chat",
    color: "#6b7280",
    urlPatterns: [],
  },
};

/**
 * 获取平台配置
 */
export function getPlatformConfig(platform: ChatPlatform): PlatformConfig {
  return PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.other;
}

/**
 * 获取所有平台列表
 */
export function getAllPlatforms(): PlatformConfig[] {
  return Object.values(PLATFORM_CONFIGS);
}

/**
 * 根据 URL 检测平台
 */
export function detectPlatformFromUrl(url: string): ChatPlatform {
  for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
    if (config.urlPatterns.some((pattern) => pattern.test(url))) {
      return platform as ChatPlatform;
    }
  }
  return "other";
}

/**
 * 格式化平台名称
 */
export function formatPlatformName(platform: ChatPlatform): string {
  return getPlatformConfig(platform).name;
}

/**
 * 获取平台图标类名
 */
export function getPlatformIcon(platform: ChatPlatform): string {
  return getPlatformConfig(platform).icon;
}

/**
 * 获取平台颜色
 */
export function getPlatformColor(platform: ChatPlatform): string {
  return getPlatformConfig(platform).color;
}
