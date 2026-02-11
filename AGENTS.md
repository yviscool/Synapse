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
