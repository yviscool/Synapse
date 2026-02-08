<template>
  <div ref="rootRef" class="milkdown-host h-full w-full" />
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { getMarkdown, replaceAll } from '@milkdown/utils'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import "@/options/styles/milkdown-theme.css"
import '@milkdown/crepe/theme/nord.css'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'update:stats', stats: { lines: number; words: number; characters: number }): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const crepeRef = shallowRef<Crepe | null>(null)
const isUpdatingFromEditor = ref(false)

let statsEmitTimer: ReturnType<typeof setTimeout> | null = null
let pendingStatsMarkdown = props.modelValue

function emitStats(markdown: string) {
  emit('update:stats', {
    lines: markdown.split('\n').length,
    words: markdown.trim() ? markdown.trim().split(/\s+/).length : 0,
    characters: markdown.length,
  })
}

function scheduleStatsEmit(markdown: string) {
  pendingStatsMarkdown = markdown
  if (statsEmitTimer) return
  statsEmitTimer = setTimeout(() => {
    statsEmitTimer = null
    emitStats(pendingStatsMarkdown)
  }, 120)
}

function clearStatsTimer() {
  if (!statsEmitTimer) return
  clearTimeout(statsEmitTimer)
  statsEmitTimer = null
}

function extractMarkdownFromListenerArgs(args: unknown[]): string | null {
  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === 'string') {
      return args[i] as string
    }
  }
  return null
}

function handleEditorMarkdownUpdate(markdown: string) {
  if (props.modelValue === markdown) return
  isUpdatingFromEditor.value = true
  emit('update:modelValue', markdown)
  emit('change', markdown)
  scheduleStatsEmit(markdown)
}

onMounted(async () => {
  if (!rootRef.value) return

  const crepe = new Crepe({
    root: rootRef.value,
    defaultValue: props.modelValue,
    features: {
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ImageBlock]: true,
    },
    featureConfigs: {
      placeholder: {
        text: props.placeholder,
      },
      [Crepe.Feature.Latex]: {
        katexOptions: {
          throwOnError: false,
          displayMode: true,
          strict: false,
        },
      },
      [Crepe.Feature.CodeMirror]: {
        searchPlaceholder: '搜索语言',
        copyText: '复制',
        noResultText: '无匹配结果',
        previewToggleText: (previewOnlyMode: boolean) =>
          previewOnlyMode ? '编辑' : '隐藏',
        previewLabel: '预览',
      },
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: '文本',
          text: { label: '正文' },
          h1: { label: '一级标题' },
          h2: { label: '二级标题' },
          h3: { label: '三级标题' },
          h4: { label: '四级标题' },
          h5: { label: '五级标题' },
          h6: { label: '六级标题' },
          quote: { label: '引用' },
          divider: { label: '分割线' },
        },
        listGroup: {
          label: '列表',
          bulletList: { label: '无序列表' },
          orderedList: { label: '有序列表' },
          taskList: { label: '任务列表' },
        },
        advancedGroup: {
          label: '高级',
          image: { label: '图片', icon: 'image' },
          codeBlock: { label: '代码块', icon: 'code' },
          table: { label: '表格', icon: 'table' },
          math: { label: '数学公式', icon: 'math' },
        },
      },
      [Crepe.Feature.ImageBlock]: {
        inlineUploadButton: '上传',
        inlineUploadPlaceholderText: '或粘贴图片链接',
        blockUploadButton: '上传文件',
        blockConfirmButton: '确认 ⏎',
        blockCaptionPlaceholderText: '输入图片说明',
        blockUploadPlaceholderText: '或粘贴图片链接',
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: '输入链接地址',
      },
    },
  })

  crepe.on((listener: any) => {
    listener.markdownUpdated((...args: unknown[]) => {
      const markdown = extractMarkdownFromListenerArgs(args)
      if (markdown == null) return
      handleEditorMarkdownUpdate(markdown)
    })
  })

  await crepe.create()
  crepe.setReadonly(Boolean(props.readonly))
  crepeRef.value = crepe
  emitStats(props.modelValue || '')
})

watch(
  () => props.modelValue,
  (newValue) => {
    const crepe = crepeRef.value
    if (!crepe) return

    if (isUpdatingFromEditor.value) {
      isUpdatingFromEditor.value = false
      return
    }

    const currentMarkdown = crepe.editor.action(getMarkdown())
    if (currentMarkdown !== newValue) {
      crepe.editor.action(replaceAll(newValue || ''))
      // 内容切换后滚动到顶部
      requestAnimationFrame(() => {
        rootRef.value?.querySelector('.milkdown')?.scrollTo({ top: 0, behavior: 'instant' })
      })
    }
  },
)

watch(
  () => props.readonly,
  (isReadonly) => {
    crepeRef.value?.setReadonly(Boolean(isReadonly))
  },
  { immediate: true },
)

onBeforeUnmount(async () => {
  clearStatsTimer()
  const crepe = crepeRef.value
  crepeRef.value = null
  if (!crepe) return
  try {
    await crepe.destroy()
  } catch (error) {
    console.error('Failed to destroy crepe editor:', error)
  }
})
</script>

<style>
.milkdown-host {
  height: 100%;
  min-height: 0;
}

.milkdown-host .milkdown {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background: var(--crepe-color-background);
  color: var(--crepe-color-on-background);
}

.milkdown-host .milkdown .ProseMirror {
  min-height: 100%;
  height: auto;
  box-sizing: border-box;
  overflow-wrap: break-word;
}

.milkdown-host .milkdown::-webkit-scrollbar {
  width: 6px;
}

.milkdown-host .milkdown::-webkit-scrollbar-track {
  background: transparent;
}

.milkdown-host .milkdown::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 9999px;
}

.milkdown-host .milkdown::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 
  Masterpiece Theme Definition
  Neutral / Obsidian Palette
  No more Slate Blue
*/
.dark .milkdown-host .milkdown,
[data-theme='dark'] .milkdown-host .milkdown {
  --crepe-color-background: #000000;      /* Pure Black */
  --crepe-color-on-background: #ededed;   /* Neutral 100 */
  --crepe-color-surface: #09090b;         /* Neutral 950 */
  --crepe-color-surface-low: #18181b;     /* Neutral 900 */
  --crepe-color-on-surface: #e5e5e5;      /* Neutral 200 */
  --crepe-color-on-surface-variant: #a3a3a3; /* Neutral 400 */
  --crepe-color-outline: #525252;         /* Neutral 600 */
  --crepe-color-primary: #ededed;         /* White Primary */
  --crepe-color-secondary: #262626;       /* Neutral 800 */
  --crepe-color-on-secondary: #ffffff;
  --crepe-color-inverse: #ededed;
  --crepe-color-on-inverse: #171717;
  --crepe-color-inline-code: #e5e5e5;
  --crepe-color-error: #f87171;
  --crepe-color-hover: #171717;           /* Subtle Hover */
  --crepe-color-selected: #262626;        /* Subtle Selection */
  --crepe-color-inline-area: #18181b;     /* Code block bg */
  color-scheme: dark;
}

:where(.dark, [data-theme='dark']) .milkdown-host .milkdown::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

:where(.dark, [data-theme='dark']) .milkdown-host .milkdown::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
