# 技术栈使用指南

## 项目概述
基于 Chrome Extension 的前端项目，使用现代化的 CSS 框架和构建工具。

## 核心技术栈

### UnoCSS 配置
项目使用 UnoCSS 作为原子化 CSS 框架，配置了以下预设：

#### 1. presetWind4
- **功能**: 提供 Tailwind CSS v4 兼容的工具类
- **使用**: 
  ```html
  <div class="flex items-center justify-center p-4 bg-blue-500 text-white">
    内容居中的蓝色卡片
  </div>
  ```

#### 2. presetIcons
- **功能**: 支持图标类名，直接使用图标
- **使用**:
  ```html
  <!-- 使用 Iconify 图标 -->
  <div class="i-carbon-home text-2xl"></div>
  <div class="i-mdi-account text-lg text-blue-500"></div>
  ```

#### 3. presetAttributify
- **功能**: 属性化模式，将工具类写在 HTML 属性中
- **使用**:
  ```html
  <!-- 传统方式 -->
  <div class="bg-red-500 text-white p-4 rounded-lg"></div>
  
  <!-- 属性化方式 -->
  <div bg="red-500" text="white" p="4" rounded="lg"></div>
  ```

#### 4. presetTypography
- **功能**: 提供排版相关的工具类
- **使用**:
  ```html
  <article class="prose prose-lg">
    <h1>标题</h1>
    <p>段落内容会自动应用合适的排版样式</p>
  </article>
  ```

### 转换器配置

#### transformerDirectives
- **功能**: 支持 @apply 等 CSS 指令
- **使用**:
  ```css
  .custom-button {
    @apply bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600;
  }
  ```

## 最佳实践

### 1. 样式组织
```html
<!-- 推荐：使用属性化模式提高可读性 -->
<button 
  bg="blue-500 hover:blue-600" 
  text="white" 
  px="4" 
  py="2" 
  rounded="md"
  transition="colors"
>
  按钮
</button>
```

### 2. 图标使用
```html
<!-- 常用图标示例 -->
<div class="i-carbon-user"></div>          <!-- 用户图标 -->
<div class="i-carbon-settings"></div>      <!-- 设置图标 -->
<div class="i-carbon-close"></div>         <!-- 关闭图标 -->
```

### 5. Shiki 代码高亮

#### 基础配置
```typescript
import { getHighlighter } from 'shiki'

const highlighter = await getHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['javascript', 'typescript', 'vue', 'css', 'json']
})
```

#### Vue 组件中使用
```vue
<template>
  <div v-html="highlightedCode" class="code-block"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHighlighter } from 'shiki'

const highlightedCode = ref('')

onMounted(async () => {
  const highlighter = await getHighlighter({
    themes: ['github-dark'],
    langs: ['typescript']
  })
  
  const code = `const greeting = "Hello World"`
  highlightedCode.value = highlighter.codeToHtml(code, {
    lang: 'typescript',
    theme: 'github-dark'
  })
})
</script>
```

#### 最佳实践
1. **主题切换支持**
```typescript
// 支持明暗主题切换
const getTheme = () => isDark.value ? 'github-dark' : 'github-light'

const highlightCode = (code: string, lang: string) => {
  return highlighter.codeToHtml(code, {
    lang,
    theme: getTheme()
  })
}
```

2. **性能优化**
```typescript
// 预加载常用语言
const COMMON_LANGS = ['javascript', 'typescript', 'vue', 'css']

// 懒加载不常用语言
const loadLanguage = async (lang: string) => {
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    await highlighter.loadLanguage(lang)
  }
}
```

## 开发建议

1. **优先使用属性化模式** - 提高代码可读性
2. **合理使用图标预设** - 减少图标资源加载
3. **利用排版预设** - 保持文本样式一致性
5. **Shiki 代码高亮** - 提供专业的语法高亮体验

## 常用工具类速查

| 功能 | 类名示例 | 属性化写法 |
|------|----------|------------|
| 布局 | `flex items-center` | `flex items="center"` |
| 间距 | `p-4 m-2` | `p="4" m="2"` |
| 颜色 | `bg-blue-500 text-white` | `bg="blue-500" text="white"` |
| 圆角 | `rounded-lg` | `rounded="lg"` |
| 阴影 | `shadow-md` | `shadow="md"` |

这套配置为 Chrome Extension 开发提供了灵活且高效的样式解决方案。