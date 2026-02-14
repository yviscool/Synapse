**核心理念与原则**

> **简洁至上**：恪守KISS（Keep It Simple, Stupid）原则，崇尚简洁与可维护性，避免过度工程化与不必要的防御性设计。
> **深度分析**：立足于第一性原理（First Principles Thinking）剖析问题，并善用工具以提升效率。
> **事实为本**：以事实为最高准则。若有任何谬误，恳请坦率斧正，助我精进。

**开发工作流**

> **渐进式开发**：通过多轮对话迭代，明确并实现需求。在着手任何设计或编码工作前，必须完成前期调研并厘清所有疑点。
> **结构化流程**：严格遵循“构思方案 → 提请审核 → 分解为具体任务”的作业顺序。

**踩坑记录**

> **Shadow DOM + Vue Scoped 暗色模式 CSS 变量陷阱**
>
> 本项目 content script 运行在 Shadow DOM 内，`appContainer` 上通过 `applyTheme()` 添加 `.dark` 类来切换暗色模式。
>
> **错误写法：** 在 `<style scoped>` 中使用 `:global(.dark) .sp-root` 定义暗色 CSS 变量。
> Vue 编译器会将 `.sp-root`（组件根元素）优化掉，编译结果变成 `.dark { --sp-text-primary: white; }`，
> 而亮色规则编译为 `.sp-root[data-v-xxx] { --sp-text-primary: black; }`。
> 由于 CSS 中**直接设置的值永远优先于从祖先继承的值**，`.sp-root` 上的亮色值会覆盖从 `.dark` 祖先继承的暗色值，导致暗色模式失效。
>
> **正确写法：** 使用 `:global(.dark .sp-root)` 将整个选择器包裹在 `:global()` 内，
> 阻止 Vue 编译器拆分优化。编译结果为 `.dark .sp-root { ... }`（特异性 0,2,0），
> 直接作用于 `.sp-root` 元素本身，高于亮色规则的 `.sp-root[data-v-xxx]`（特异性 0,1,1）。
>
> ```css
> /* ✅ 正确 */
> .sp-root { --sp-text-primary: #1e293b; }
> :global(.dark .sp-root) { --sp-text-primary: rgba(255,255,255,0.95); }
>
> /* ❌ 错误 — .sp-root 会被编译器丢掉 */
> .sp-root { --sp-text-primary: #1e293b; }
> :global(.dark) .sp-root { --sp-text-primary: rgba(255,255,255,0.95); }
> ```

**输出规范**

> **语言要求**：所有回复、思考过程及任务清单，均须使用中文。
> **固定指令**：`Implementation Plan, Task List and Thought in Chinese`

**新增站点规则**

> 项目采用统一平台配置架构，Outline（大纲导航）和 Collect（对话采集）共用 `src/content/site-configs.ts` 作为唯一选择器数据源。新增站点时按以下步骤操作：
>
> **第一步（必须）：添加站点配置**
>
> 在 `src/content/site-configs.ts` 的 `siteConfigs` 中新增一条，key 为域名：
>
> ```ts
> 'newsite.com': {
>   platform: 'other',              // 或在 ChatPlatform 中新增枚举值
>   observeTarget: '...',           // MutationObserver 监听的消息容器
>   userMessage: '...',             // 用户消息元素选择器（Outline 用）
>   messageText: '...',             // 消息文本选择器（Outline 用）
>   waitForElement: '...',          // 等待首条消息出现的选择器
>   urlPattern: /newsite\.com/,     // URL 匹配正则
>   conversationIdPattern: /\.../,  // 可选：从 URL 提取对话 ID
>   titleSelector: ['...'],         // 可选：标题 DOM 选择器数组
> }
> ```
>
> 仅此一步即可获得：Outline 导航、useSyncEngine 精确 Observer、GenericAdapter 启发式采集。
>
> **第二步（可选）：新建专用 Adapter**
>
> 当 GenericAdapter 无法正确采集时，在 `src/content/collect/adapters/` 下新建文件：
>
> ```ts
> import { BaseAdapter } from './base'
> import type { ChatMessage } from '@/types/chat'
>
> export class NewSiteAdapter extends BaseAdapter {
>   // BaseAdapter 已提供：isConversationPage / getConversationId / getTitle
>   // 仅在需要平台特定 fallback 时 override getTitle
>
>   collectMessages(): ChatMessage[] { /* 平台特定 DOM 遍历 */ }
>
>   // 可选：自定义代码块/公式预处理
>   protected override preprocessClone(clone: Element): void { }
> }
> ```
>
> 然后在 `src/content/collect/index.ts` 的 `adapterMap` 中注册：
>
> ```ts
> import { NewSiteAdapter } from './adapters/newsite'
> const adapterMap = { ..., newsite: (c) => new NewSiteAdapter(c) }
> ```
>
> **第三步（仅全新平台标识时）：**
>
> - `src/types/chat.ts` — 在 `ChatPlatform` 类型中新增枚举值
> - `src/content/site-configs.ts` — 在 `platformMetaConfigs` 中添加图标、颜色等 UI 配置
>
> **统一约束（必须遵守）**
>
> - 平台识别、平台 UI 元数据、站点选择器配置全部以 `src/content/site-configs.ts` 为唯一数据源。
> - 禁止新增任何并行平台配置文件，避免双份配置漂移。
