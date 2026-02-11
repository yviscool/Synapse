/**
 * 适配器管理器
 * 根据当前页面 URL 自动选择合适的适配器
 */

import type { PlatformAdapter, CollectResult } from './adapters/base'
import { ChatGPTAdapter } from './adapters/chatgpt'
import { ClaudeAdapter } from './adapters/claude'
import { DeepSeekAdapter } from './adapters/deepseek'
import { GeminiAdapter } from './adapters/gemini'
import { AIStudioAdapter } from './adapters/aistudio'
import { KimiAdapter } from './adapters/kimi'
import { DoubaoAdapter } from './adapters/doubao'
import { GenericAdapter } from './adapters/generic'
import type { ChatPlatform } from '@/types/chat'
import { detectPlatformFromUrl } from '@/utils/chatPlatform'

// 所有适配器实例
const adapters: PlatformAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new DeepSeekAdapter(),
  new GeminiAdapter(),
  new AIStudioAdapter(),
  new KimiAdapter(),
  new DoubaoAdapter(),
]

// 通用适配器作为后备
const genericAdapter = new GenericAdapter()

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
      platform: detectPlatformFromUrl(window.location.href) || null,
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
