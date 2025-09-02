<template>
  <Milkdown />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue' // <-- 1. 确保引入 ref
import { Milkdown, useEditor } from '@milkdown/vue'
import { Crepe } from '@milkdown/crepe'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { editorViewOptionsCtx, editorViewCtx } from '@milkdown/kit/core'
import { getMarkdown, replaceAll } from '@milkdown/utils'

// 导入 Crepe 的主题和样式
import "@milkdown/crepe/theme/common/style.css";
import '@milkdown/crepe/theme/nord.css'

// --- Props and Emits ---
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
  (e: 'update:cursor', cursor: { line: number; column: number }): void
}>()

// --- 解决数据循环问题的关键 ---
// 创建一个标志位，用于防止因内部更新触发的 watch 回调
const isUpdatingFromEditor = ref(false)

// --- Milkdown Editor Setup ---
const editorRef = useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.modelValue,
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
        advancedGroup: {
          label: '高级',
          image: { label: '图片' },
          codeBlock: { label: '代码块' },
          table: { label: '表格' },
          math: { label: '数学公式' },
        },
      },
      [Crepe.Feature.CodeMirror]: {
        copyText: '复制',
        searchPlaceholder: '搜索...',
        noResultText: '无结果',
      },
      [Crepe.Feature.LinkTooltip]: {
        inputPlaceholder: '输入链接地址',
      }
    },
  })

  crepe.editor
    .config((ctx) => {
      const listener = ctx.get(listenerCtx)

      // 监听编辑器内容变化
      listener.markdownUpdated((_, markdown) => {
        // 只有当内容确实发生变化时才触发更新
        if (props.modelValue !== markdown) {
          // <-- 2. 在 emit 之前，设置标志位，表明这次更新来源于编辑器内部
          isUpdatingFromEditor.value = true
          
          emit('update:modelValue', markdown)
          emit('change', markdown)
          emit('update:stats', {
            lines: markdown.split('\n').length,
            words: markdown.trim() ? markdown.trim().split(/\s+/).length : 0,
            characters: markdown.length,
          })
        }
      })

      // 监听选区变化
      listener.selectionUpdated((ctx) => {
        const view = ctx.get(editorViewCtx)
        if (!view || !view.state) {
          return;
        }
        const cursorPos = view.state.selection.from
        const textBeforeCursor = view.state.doc.textBetween(0, cursorPos, '\n')
        const lines = textBeforeCursor.split('\n')
        emit('update:cursor', {
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
        })
      })

      // 设置只读状态
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        editable: () => !props.readonly,
      }))
    })
    .use(listener)

  return crepe
})

// --- 修正后的 watch 监听器 ---
watch(() => props.modelValue, (newValue) => {
  // <-- 3. 检查标志位
  // 如果这次更新是由编辑器内部的 emit 触发的，则忽略它，并重置标志位
  if (isUpdatingFromEditor.value) {
    isUpdatingFromEditor.value = false
    return
  }

  // 只有当更新来自于外部时（例如，程序化地改变了 prop），才执行强制更新
  const editor = editorRef.get()
  if (!editor) return

  const currentMarkdown = editor.action(getMarkdown());
  
  // 仅在内容确实不一致时才执行重写，以避免不必要的操作
  if (currentMarkdown !== newValue) {
    editor.action(replaceAll(newValue));
  }
});
</script>