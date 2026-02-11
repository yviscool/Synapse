/**
 * 适配器管理器
 * 根据当前页面 URL 自动选择合适的适配器
 */

import type { PlatformAdapter, CollectResult } from './adapters/base'
import { ChatGPTAdapter } from './adapters/chatgpt'
import { ClaudeAdapter } from './adapters/claude'
import { DeepSeekAdapter } from './adapters/deepseek'
import { GeminiAdapter } from './adapters/gemini'
import { KimiAdapter } from './adapters/kimi'
import { GenericAdapter } from './adapters/generic'
import type { ChatPlatform } from '@/types/chat'

// 所有适配器实例
const adapters: PlatformAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new DeepSeekAdapter(),
  new GeminiAdapter(),
  new KimiAdapter(),
]

// 通用适配器作为后备
const genericAdapter = new GenericAdapter()

/**
 * 根据 URL 检测平台
 */
export function detectPlatform(url: string = window.location.href): ChatPlatform | null {
  const patterns: [RegExp, ChatPlatform][] = [
    [/chat\.openai\.com|chatgpt\.com/, 'chatgpt'],
    [/claude\.ai/, 'claude'],
    [/chat\.deepseek\.com/, 'deepseek'],
    [/gemini\.google\.com/, 'gemini'],
    [/kimi\.moonshot\.cn/, 'kimi'],
    [/doubao\.com/, 'doubao'],
    [/yuanbao\.tencent\.com/, 'yuanbao'],
    [/grok\.x\.ai|x\.com\/i\/grok/, 'grok'],
    [/copilot\.microsoft\.com/, 'copilot'],
  ]

  for (const [pattern, platform] of patterns) {
    if (pattern.test(url)) {
      return platform
    }
  }

  return null
}

/**
 * 获取当前页面的适配器
 */
export function getAdapter(): PlatformAdapter | null {
  // 先尝试专用适配器
  for (const adapter of adapters) {
    if (adapter.isConversationPage()) {
      return adapter
    }
  }

  // 尝试通用适配器
  if (genericAdapter.isConversationPage()) {
    return genericAdapter
  }

  return null
}

/**
 * 检查当前页面是否支持采集
 */
export function canCollect(): boolean {
  return getAdapter() !== null
}

/**
 * 执行采集
 */
export function collect(): CollectResult {
  const adapter = getAdapter()

  if (!adapter) {
    return {
      success: false,
      error: '当前页面不支持采集，请在 AI 对话页面使用此功能',
    }
  }

  return adapter.collect()
}

/**
 * 获取当前平台信息
 */
export function getCurrentPlatformInfo(): {
  platform: ChatPlatform | null
  canCollect: boolean
  conversationId: string | null
} {
  const adapter = getAdapter()

  if (!adapter) {
    return {
      platform: detectPlatform(),
      canCollect: false,
      conversationId: null,
    }
  }

  return {
    platform: adapter.platform,
    canCollect: true,
    conversationId: adapter.getConversationId(),
  }
}
