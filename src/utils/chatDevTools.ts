/**
 * Chat 模块开发工具
 * 用于生成测试数据和调试
 */

import { chatRepository } from '@/stores/chatRepository'
import type { ChatConversation, ChatMessage, ChatPlatform } from '@/types/chat'

const SAMPLE_MESSAGES: Array<{ role: 'user' | 'assistant'; content: string }> = [
  { role: 'user', content: '你好，请帮我解释一下什么是 TypeScript？' },
  { role: 'assistant', content: 'TypeScript 是 JavaScript 的超集，它添加了可选的静态类型和基于类的面向对象编程。\n\n主要特点：\n1. 静态类型检查\n2. 更好的 IDE 支持\n3. 面向对象特性\n4. 编译时错误检测\n\n它最终会被编译成纯 JavaScript 代码运行。' },
  { role: 'user', content: '那 TypeScript 和 JavaScript 的主要区别是什么？' },
  { role: 'assistant', content: '主要区别包括：\n\n1. **类型系统**：TypeScript 有静态类型，JavaScript 是动态类型\n2. **编译**：TypeScript 需要编译，JavaScript 直接运行\n3. **接口**：TypeScript 支持接口定义\n4. **泛型**：TypeScript 支持泛型编程\n5. **枚举**：TypeScript 有枚举类型\n\n简单来说，TypeScript 让大型项目更容易维护。' },
]

const SAMPLE_TITLES = [
  'TypeScript 入门指南',
  'Vue 3 组合式 API 详解',
  'React Hooks 最佳实践',
  '如何优化前端性能',
  'Node.js 异步编程',
  'CSS Grid 布局教程',
  'Git 工作流程',
  'Docker 容器化部署',
  'GraphQL vs REST API',
  'WebSocket 实时通信',
]

const PLATFORMS: ChatPlatform[] = ['chatgpt', 'claude', 'gemini', 'deepseek', 'kimi']

function generateMessages(count: number): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (let i = 0; i < count; i++) {
    const sample = SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length]
    messages.push({
      id: crypto.randomUUID(),
      role: sample.role,
      content: sample.content,
      timestamp: Date.now() - (count - i) * 60000,
    })
  }
  return messages
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 生成测试对话数据
 */
export async function generateTestConversations(count: number = 10): Promise<void> {
  console.log(`[DevTools] Generating ${count} test conversations...`)

  for (let i = 0; i < count; i++) {
    const messageCount = Math.floor(Math.random() * 6) + 2
    const messages = generateMessages(messageCount)
    const platform = randomItem(PLATFORMS)
    const title = randomItem(SAMPLE_TITLES) + ` #${i + 1}`

    const conversation: Partial<ChatConversation> = {
      platform,
      title,
      messages,
      starred: Math.random() > 0.7,
      link: `https://example.com/chat/${crypto.randomUUID().slice(0, 8)}`,
      createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      collectedAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
    }

    const tags = Math.random() > 0.5 ? ['学习', '编程'].slice(0, Math.floor(Math.random() * 2) + 1) : []
    await chatRepository.saveConversation(conversation, tags)
  }

  console.log(`[DevTools] Generated ${count} test conversations successfully!`)
}

/**
 * 清除所有测试数据
 */
export async function clearAllConversations(): Promise<void> {
  console.log('[DevTools] Clearing all conversations...')
  const { conversations } = await chatRepository.queryConversations({ limit: 1000 })
  const ids = conversations.map((c) => c.id)
  await chatRepository.deleteConversations(ids)
  console.log(`[DevTools] Cleared ${ids.length} conversations.`)
}

// 仅在开发模式下暴露到全局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__chatDevTools = {
    generateTestConversations,
    clearAllConversations,
  }
}
