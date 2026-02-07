<template>
  <div ref="rootRef" class="h-full w-full" />
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { getMarkdown, replaceAll } from '@milkdown/utils'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import "@/options/styles/milkdown-no-latex.css"
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
      [Crepe.Feature.Latex]: false,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ImageBlock]: true,
    },
    featureConfigs: {
      placeholder: {
        text: props.placeholder,
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
