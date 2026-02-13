/**
 * 适配器管理器
 * 根据统一 SiteConfig 自动选择合适的适配器
 */

import type { PlatformAdapter, CollectResult, CollectOptions } from './adapters/base'
import type { SiteConfig } from '../site-configs'
import { getSiteConfig } from '../site-configs'
import { ChatGPTAdapter } from './adapters/chatgpt'
import { ClaudeAdapter } from './adapters/claude'
import { DeepSeekAdapter } from './adapters/deepseek'
import { GeminiAdapter } from './adapters/gemini'
import { AIStudioAdapter } from './adapters/aistudio'
import { KimiAdapter } from './adapters/kimi'
import { DoubaoAdapter } from './adapters/doubao'
import { GrokAdapter } from './adapters/grok'
import { MiniMaxAdapter } from './adapters/minimax'
import { ZAIAdapter } from './adapters/zai'
import { GenericAdapter } from './adapters/generic'
import type { ChatPlatform } from '@/types/chat'
import { detectPlatformFromUrl } from '@/utils/chatPlatform'

const adapterMap: Record<string, (config: SiteConfig) => PlatformAdapter> = {
  chatgpt: (c) => new ChatGPTAdapter(c),
  claude: (c) => new ClaudeAdapter(c),
  deepseek: (c) => new DeepSeekAdapter(c),
  gemini: (c) => new GeminiAdapter(c),
  aistudio: (c) => new AIStudioAdapter(c),
  kimi: (c) => new KimiAdapter(c),
  doubao: (c) => new DoubaoAdapter(c),
  grok: (c) => new GrokAdapter(c),
  minimax: (c) => new MiniMaxAdapter(c),
  zai: (c) => new ZAIAdapter(c),
}

/**
 * 获取当前页面的适配器
 */
export function getAdapter(): PlatformAdapter | null {
  const config = getSiteConfig()
  if (!config) return null

  const factory = adapterMap[config.platform]
  const adapter = factory ? factory(config) : new GenericAdapter(config)

  return adapter.isConversationPage() ? adapter : null
}

/**
 * 检查当前页面是否支持采集
 */
export function canCollect(): boolean {
  return getAdapter() !== null
}

/**
 * 执行采集（支持异步适配器，如 Gemini 需要等待 Angular 渲染）
 */
export async function collect(options?: CollectOptions): Promise<CollectResult> {
  const adapter = getAdapter()

  if (!adapter) {
    return {
      success: false,
      error: '当前页面不支持采集，请在 AI 对话页面使用此功能',
    }
  }

  return await adapter.collect(options)
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
