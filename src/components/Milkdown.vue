<template>
  <div ref="rootRef" class="milkdown-host h-full w-full" />
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { getMarkdown, replaceAll } from '@milkdown/utils'
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import "@/styles/milkdown-theme.css"
import '@milkdown/crepe/theme/nord.css'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'update:stats', stats: { lines: number; words: number; characters: number }): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const crepeRef = shallowRef<Crepe | null>(null)
const isUpdatingFromEditor = ref(false)
const isEditorReady = ref(false)

let statsEmitTimer: ReturnType<typeof setTimeout> | null = null
let pendingStatsMarkdown = props.modelValue

type MarkdownListener = {
  markdownUpdated: (callback: (...args: unknown[]) => void) => void
}

function isMarkdownListener(value: unknown): value is MarkdownListener {
  if (!value || typeof value !== 'object') return false
  return typeof (value as MarkdownListener).markdownUpdated === 'function'
}

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
  if (!isEditorReady.value) return
  if (props.modelValue === markdown) return
  isUpdatingFromEditor.value = true
  emit('update:modelValue', markdown)
  emit('change', markdown)
  scheduleStatsEmit(markdown)
}

function getCurrentMarkdown(): string {
  const crepe = crepeRef.value
  if (!crepe) return props.modelValue || ''
  return crepe.editor.action(getMarkdown())
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
        searchPlaceholder: t('common.milkdown.searchLanguage'),
        copyText: t('chat.detail.copy'),
        noResultText: t('common.milkdown.noResult'),
        previewToggleText: (previewOnlyMode: boolean) =>
          previewOnlyMode ? t('common.edit') : t('common.milkdown.hide'),
        previewLabel: t('common.milkdown.preview'),
      },
      [Crepe.Feature.BlockEdit]: {
        textGroup: {
          label: t('common.milkdown.groups.text'),
          text: { label: t('common.milkdown.text.body') },
          h1: { label: t('common.milkdown.text.h1') },
          h2: { label: t('common.milkdown.text.h2') },
          h3: { label: t('common.milkdown.text.h3') },
          h4: { label: t('common.milkdown.text.h4') },
          h5: { label: t('common.milkdown.text.h5') },
          h6: { label: t('common.milkdown.text.h6') },
          quote: { label: t('common.milkdown.text.quote') },
          divider: { label: t('common.milkdown.text.divider') },
        },
        listGroup: {
          label: t('common.milkdown.groups.list'),
          bulletList: { label: t('common.milkdown.list.bullet') },
          orderedList: { label: t('common.milkdown.list.ordered') },
          taskList: { label: t('common.milkdown.list.task') },
        },
        advancedGroup: {
          label: t('common.milkdown.groups.advanced'),
          image: { label: t('common.milkdown.advanced.image'), icon: 'image' },
          codeBlock: { label: t('common.milkdown.advanced.codeBlock'), icon: 'code' },
          table: { label: t('common.milkdown.advanced.table'), icon: 'table' },
          math: { label: t('common.milkdown.advanced.math'), icon: 'math' },
        },
      },
      [Crepe.Feature.ImageBlock]: {
        inlineUploadButton: t('common.milkdown.image.inlineUpload'),
        inlineUploadPlaceholderText: t('common.milkdown.image.pasteUrl'),
        blockUploadButton: t('common.milkdown.image.blockUpload'),
        blockConfirmButton: `${t('common.milkdown.image.confirm')} ⏎`,
        blockCaptionPlaceholderText: t('common.milkdown.image.captionPlaceholder'),
        blockUploadPlaceholderText: t('common.milkdown.image.pasteUrl'),
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: t('common.milkdown.linkPlaceholder'),
      },
    },
  })

  crepe.on((listener: unknown) => {
    if (!isMarkdownListener(listener)) return
    listener.markdownUpdated((...args: unknown[]) => {
      const markdown = extractMarkdownFromListenerArgs(args)
      if (markdown == null) return
      handleEditorMarkdownUpdate(markdown)
    })
  })

  await crepe.create()
  crepe.setReadonly(Boolean(props.readonly))
  crepeRef.value = crepe
  const expectedMarkdown = props.modelValue || ''
  const currentMarkdown = crepe.editor.action(getMarkdown())
  if (currentMarkdown !== expectedMarkdown) {
    crepe.editor.action(replaceAll(expectedMarkdown))
  }
  isEditorReady.value = true
  emitStats(crepe.editor.action(getMarkdown()))
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
  isEditorReady.value = false
  const crepe = crepeRef.value
  crepeRef.value = null
  if (!crepe) return
  try {
    await crepe.destroy()
  } catch (error) {
    console.error('Failed to destroy crepe editor:', error)
  }
})

defineExpose({
  getCurrentMarkdown,
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
