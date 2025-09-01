<template>
  <div class="flex flex-col h-full border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800">
    <div class="flex items-center gap-1 p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:border-gray-600 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-800">
      <div class="flex items-center gap-1 mr-3 pr-3 border-r border-gray-300">
        <button @click="insertMarkdown('**', '**')" title="粗体" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-text-bold"></div>
        </button>
        <button @click="insertMarkdown('*', '*')" title="斜体" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-text-italic"></div>
        </button>
        <button @click="insertMarkdown('`', '`')" title="行内代码" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-code"></div>
        </button>
      </div>
      
      <div class="flex items-center gap-1 mr-3 pr-3 border-r border-gray-300">
        <button @click="insertMarkdown('# ', '')" title="标题" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-text-heading"></div>
        </button>
        <button @click="insertMarkdown('- ', '')" title="列表" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-list"></div>
        </button>
        <button @click="insertMarkdown('> ', '')" title="引用" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-quotes"></div>
        </button>
      </div>
      
      <div class="flex items-center gap-1 mr-3 pr-3 border-r border-gray-300">
        <button @click="insertLink" title="链接" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-link"></div>
        </button>
        <button @click="insertCodeBlock" title="代码块" class="p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700">
          <div class="i-carbon-code-reference"></div>
        </button>
      </div>
      
      <div class="flex items-center gap-1 ml-auto">
        <button 
          @click="togglePreview" 
          :class="['p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700', { 'bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-800 dark:text-blue-200': showPreview }]" 
          title="预览"
        >
          <div class="i-carbon-view"></div>
        </button>
        <button 
          @click="toggleSplit" 
          :class="['p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700', { 'bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-800 dark:text-blue-200': splitView }]" 
          title="分屏"
        >
          <div class="i-carbon-split-screen"></div>
        </button>
      </div>
    </div>
    
    <div class="flex-1 flex overflow-hidden">
      <!-- 编辑器区域 -->
      <div v-if="!showPreview || splitView" class="flex-1 flex flex-col">
        <textarea
          ref="textareaRef"
          v-model="localContent"
          :readonly="readonly"
          @input="handleInput"
          @keydown="handleKeydown"
          class="flex-1 p-4 border-0 resize-none font-mono text-sm bg-white focus:outline-none dark:bg-gray-800 dark:text-gray-100"
          :class="{ 'bg-gray-50 dark:bg-gray-800/50': readonly }"
          :placeholder="placeholder"
          spellcheck="false"
          style="line-height: 1.6; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;"
        ></textarea>
      </div>
      
      <!-- 预览区域 -->
      <div v-if="showPreview" class="flex-1 overflow-y-auto border-l border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
        <div class="p-6 prose prose-sm max-w-none bg-white m-4 rounded-lg shadow-sm dark:bg-gray-800" v-html="renderedContent"></div>
      </div>
    </div>
    
    <!-- 状态栏 -->
    <div class="flex items-center gap-6 px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
      <span class="flex items-center gap-1">{{ stats.lines }} 行</span>
      <span class="flex items-center gap-1">{{ stats.words }} 词</span>
      <span class="flex items-center gap-1">{{ stats.characters }} 字符</span>
      <span v-if="cursorPosition" class="flex items-center gap-1">
        行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { marked } from 'marked'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '开始编写你的 Prompt...',
  readonly: false
})

const emit = defineEmits<Emits>()

// 响应式数据
const textareaRef = ref<HTMLTextAreaElement>()
const localContent = ref(props.modelValue)
const showPreview = ref(false)
const splitView = ref(false)
const cursorPosition = ref<{ line: number; column: number } | null>(null)

// 计算属性
const stats = computed(() => {
  const content = localContent.value
  const lines = content.split('\n').length
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const characters = content.length
  
  return { lines, words, characters }
})

const renderedContent = computed(() => {
  if (!localContent.value) return ''
  
  try {
    // 配置 marked 选项
    marked.setOptions({
      breaks: true,
      gfm: true
    })
    
    // 简单处理代码块
    let content = localContent.value
    content = content.replace(/```(\w*)([\s\S]*?)```/g, (match: string, lang: string, code: string) => {
      return `<pre class="code-block language-${lang || 'text'}"><code>${escapeHtml(code)}</code></pre>`
    })
    
    return marked(content)
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return '<p>预览渲染错误</p>'
  }
})

// 监听器
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localContent.value) {
    localContent.value = newValue
  }
})

watch(localContent, (newValue) => {
  emit('update:modelValue', newValue)
  emit('change', newValue)
})

// 方法
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function handleInput() {
  updateCursorPosition()
}

function handleKeydown(event: KeyboardEvent) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  // Tab 键处理
  if (event.key === 'Tab') {
    event.preventDefault()
    insertAtCursor('  ')
    return
  }
  
  // Ctrl/Cmd + 快捷键
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault()
        insertMarkdown('**', '**')
        break
      case 'i':
        event.preventDefault()
        insertMarkdown('*', '*')
        break
      case 'k':
        event.preventDefault()
        insertLink()
        break
      case 'Enter':
        event.preventDefault()
        togglePreview()
        break
    }
  }
  
  // 自动补全
  if (event.key === 'Enter') {
    handleAutoComplete()
  }
  
  nextTick(() => {
    updateCursorPosition()
  })
}

function insertAtCursor(text: string) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = localContent.value.substring(0, start)
  const after = localContent.value.substring(end)
  
  localContent.value = before + text + after
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + text.length, start + text.length)
  })
}

function insertMarkdown(prefix: string, suffix: string) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = localContent.value.substring(start, end)
  
  const before = localContent.value.substring(0, start)
  const after = localContent.value.substring(end)
  
  const newText = prefix + selectedText + suffix
  localContent.value = before + newText + after
  
  nextTick(() => {
    textarea.focus()
    if (selectedText) {
      textarea.setSelectionRange(start, start + newText.length)
    } else {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length)
    }
  })
}

function insertLink() {
  const url = prompt('请输入链接地址:')
  if (url) {
    const text = prompt('请输入链接文本:', url)
    insertMarkdown(`[${text || url}](`, ')')
  }
}

function insertCodeBlock() {
  const language = prompt('请输入编程语言 (可选):') || ''
  insertAtCursor(`\n\`\`\`${language}\n\n\`\`\`\n`)
}

function handleAutoComplete() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const cursorPos = textarea.selectionStart
  const lines = localContent.value.substring(0, cursorPos).split('\n')
  const currentLine = lines[lines.length - 1]
  
  // 列表自动补全
  const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/)
  if (listMatch) {
    const indent = listMatch[1]
    const marker = listMatch[2]
    
    if (currentLine.trim() === marker) {
      // 空列表项，删除并退出列表
      const lineStart = cursorPos - currentLine.length
      localContent.value = localContent.value.substring(0, lineStart) + 
                          localContent.value.substring(cursorPos)
      return
    }
    
    // 继续列表
    const nextMarker = marker.match(/\d+/) ? 
      `${parseInt(marker) + 1}.` : marker
    insertAtCursor(`\n${indent}${nextMarker} `)
  }
}

function updateCursorPosition() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localContent.value.substring(0, cursorPos)
  const lines = textBeforeCursor.split('\n')
  
  cursorPosition.value = {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

function togglePreview() {
  // If we are in split view, this button acts as an "exit" to editor-only.
  if (splitView.value) {
    splitView.value = false
    showPreview.value = false
    return
  }
  // Otherwise, it toggles between editor-only and preview-only.
  showPreview.value = !showPreview.value
}

function toggleSplit() {
  // This button toggles between editor-only and split-view.
  if (splitView.value) {
    splitView.value = false
    showPreview.value = false
  } else {
    splitView.value = true
    showPreview.value = true
  }
}
</script>

<style scoped>
</style>