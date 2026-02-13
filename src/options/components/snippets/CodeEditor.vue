<template>
  <div class="code-editor" :class="{ 'is-readonly': readonly }">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/80">
      <div class="flex items-center gap-2">
        <select
          v-model="localLanguage"
          class="text-xs px-1.5 py-0.5 border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          :disabled="readonly"
        >
          <option v-for="lang in supportedLanguages" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>{{ t('tools.editor.lineCount', { count: lineCount }) }}</span>
        <span class="text-gray-300">|</span>
        <span>{{ t('tools.editor.charCount', { count: charCount }) }}</span>
      </div>
    </div>

    <!-- Monaco Editor container -->
    <div ref="editorContainer" class="editor-container flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import * as monaco from 'monaco-editor'
import type { SnippetLanguage } from '@/types/snippet'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: SnippetLanguage
  readonly?: boolean
  placeholder?: string
  isDark?: boolean
}>(), {
  modelValue: '',
  language: 'text',
  readonly: false,
  placeholder: '',
  isDark: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:language', value: SnippetLanguage): void
}>()

const { t } = useI18n()

// Refs
const editorContainer = ref<HTMLDivElement | null>(null)
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null)

// State
const localLanguage = ref<SnippetLanguage>(props.language)
const isUpdatingFromProp = ref(false)

// Language mapping from our types to Monaco language IDs
const languageMap: Record<SnippetLanguage, string> = {
  html: 'html',
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  rust: 'rust',
  go: 'go',
  css: 'css',
  json: 'json',
  markdown: 'markdown',
  sql: 'sql',
  shell: 'shell',
  yaml: 'yaml',
  text: 'plaintext',
}

const supportedLanguages = computed(() => [
  { value: 'html', label: t('tools.languages.html') },
  { value: 'javascript', label: t('tools.languages.javascript') },
  { value: 'typescript', label: t('tools.languages.typescript') },
  { value: 'python', label: t('tools.languages.python') },
  { value: 'rust', label: t('tools.languages.rust') },
  { value: 'go', label: t('tools.languages.go') },
  { value: 'css', label: t('tools.languages.css') },
  { value: 'json', label: t('tools.languages.json') },
  { value: 'markdown', label: t('tools.languages.markdown') },
  { value: 'sql', label: t('tools.languages.sql') },
  { value: 'shell', label: t('tools.languages.shell') },
  { value: 'yaml', label: t('tools.languages.yaml') },
  { value: 'text', label: t('tools.languages.text') },
])

// Computed
const lineCount = computed(() => {
  return editor.value?.getModel()?.getLineCount() || 1
})

const charCount = computed(() => {
  return editor.value?.getValue()?.length || 0
})

function getMonacoTheme(isDark: boolean): 'github-light' | 'github-dark' {
  return isDark ? 'github-dark' : 'github-light'
}

// Initialize Monaco Editor
onMounted(() => {
  if (!editorContainer.value) return

  // 定义 GitHub Light 主题
  monaco.editor.defineTheme('github-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '6f42c1' },
      { token: 'function', foreground: '6f42c1' },
      { token: 'variable', foreground: 'e36209' },
      { token: 'tag', foreground: '22863a' },
      { token: 'attribute.name', foreground: '6f42c1' },
      { token: 'attribute.value', foreground: '032f62' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorLineNumber.foreground': '#959da5',
      'editorLineNumber.activeForeground': '#24292e',
      'editor.selectionBackground': '#c8e1ff',
      'editor.inactiveSelectionBackground': '#e8eaed',
    }
  })

  // 定义 GitHub Dark 主题
  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'd2a8ff' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'ffa657' },
      { token: 'tag', foreground: '8bbcff' },
      { token: 'attribute.name', foreground: 'd2a8ff' },
      { token: 'attribute.value', foreground: 'a5d6ff' },
    ],
    colors: {
      'editor.background': '#0b1220',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#101a2c',
      'editorLineNumber.foreground': '#6e7681',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editor.selectionBackground': '#1f3b62',
      'editor.inactiveSelectionBackground': '#1a2437',
    }
  })

  editor.value = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: languageMap[localLanguage.value],
    theme: getMonacoTheme(Boolean(props.isDark)),
    readOnly: props.readonly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    tabSize: 2,
    insertSpaces: true,
    automaticLayout: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderLineHighlight: 'line',
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 8, bottom: 8 },
  })

  // 监听内容变化
  editor.value.onDidChangeModelContent(() => {
    if (isUpdatingFromProp.value) return
    const value = editor.value?.getValue() || ''
    emit('update:modelValue', value)
  })
})

// Cleanup
onUnmounted(() => {
  editor.value?.dispose()
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getValue() !== newValue) {
    isUpdatingFromProp.value = true
    editor.value.setValue(newValue)
    isUpdatingFromProp.value = false
  }
})

watch(() => props.language, (newValue) => {
  localLanguage.value = newValue
})

watch(() => props.readonly, (newValue) => {
  editor.value?.updateOptions({ readOnly: newValue })
})

watch(() => props.isDark, (newValue) => {
  monaco.editor.setTheme(getMonacoTheme(Boolean(newValue)))
})

// Watch for language changes
watch(localLanguage, (newValue) => {
  emit('update:language', newValue)
  const model = editor.value?.getModel()
  if (model) {
    monaco.editor.setModelLanguage(model, languageMap[newValue])
  }
})

// Expose methods
defineExpose({
  focus: () => editor.value?.focus(),
  getContent: () => editor.value?.getValue() || '',
  getEditor: () => editor.value,
})
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  min-height: 150px;
}

:global(.dark .code-editor),
:global([data-theme='dark'] .code-editor) {
  background: #0b1220;
}
</style>
