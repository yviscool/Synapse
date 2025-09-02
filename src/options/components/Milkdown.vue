<template>
  <Milkdown />
</template>

<script setup lang="ts">
import { Milkdown, useEditor } from '@milkdown/vue'
import { Crepe, CrepeFeature } from '@milkdown/crepe'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { editorViewOptionsCtx, editorViewCtx } from '@milkdown/kit/core'

// 导入 Crepe 的主题和样式
import "@milkdown/crepe/theme/common/style.css";
// import "@milkdown/crepe/theme/frame.css";
import '@milkdown/crepe/theme/nord.css'
// import '@milkdown/crepe/theme/nord-dark.css'

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

// --- Milkdown Editor Setup ---
useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.modelValue,
    // features: {
    //   [CrepeFeature.Latex]: true,
    // },
    featureConfigs: {
      placeholder: {
        text: props.placeholder,
      },
      [Crepe.Feature.BlockEdit]: {
        // -- 文本类型组 --
        textGroup: {
          label: '文本', // 该组的标题
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
        // -- 列表类型组 --
        listGroup: {
          label: '列表',
          bulletList: { label: '无序列表' },
          orderedList: { label: '有序列表' },
          taskList: { label: '任务列表' },
        },
        // -- 高级类型组 --
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
        if (props.modelValue !== markdown) {
          // 更新 v-model
          emit('update:modelValue', markdown)
          emit('change', markdown)
          // 发送统计数据
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
        // 这可以防止在编辑器初始化或销毁的边缘情况下发生崩溃。
        if (!view || !view.state) {
          return;
        }
        const cursorPos = view.state.selection.from
        const textBeforeCursor = view.state.doc.textBetween(0, cursorPos, '\n')
        const lines = textBeforeCursor.split('\n')
        // 发送光标位置
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

</script>