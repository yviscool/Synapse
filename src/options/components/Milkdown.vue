<template>
  <Milkdown />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue' // <-- 1. 确保引入 ref
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
    features: {
 
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


// 1. 预览历史版本 (Previewing a Historical Version)
// 2. 恢复某个版本 (Restoring a Version)
// 3. 删除正在预览的版本 (Deleting the Previewed Version)
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


// ----------------------------------------------------------------
// [!!] KERNEL-LEVEL FIX: 修复编辑器只读状态切换延迟的问题
// ----------------------------------------------------------------
//
// **根本原因 (The Root Cause):**
// Milkdown (底层是 ProseMirror) 活在它自己的世界里，它不是一个原生的 Vue 组件。
// 它不会神奇地对你传进来的 `props.readonly` 的变化做出响应式更新。
// 初始化时设置的 `editable: () => !props.readonly` 就像一个懒惰的门卫，
// 它只在有人（比如用户点击）敲门时才去检查一下通行证 (`props.readonly`)。
// 当你通过程序改变通行证状态时，门卫并不知道，它还在打盹。
// 这就是为什么你需要疯狂点击才能“唤醒”它——你在强制它重新检查。这是愚蠢且不可靠的。
//
// **解决方案 (The Solution):**
// 我们不能依赖这种隐式的、不可靠的行为。我们必须发送一个明确的命令。
// 这个 `watch` 就是我们的“硬件中断处理器”。当 `props.readonly` 这个“信号线”
// 电平发生变化时，这个处理器就会被触发，并立即、强制地去更新编辑器的“硬件状态”。
//
watch(() => props.readonly, (isReadonly) => {
  const editor = editorRef.get();
  // 防御性编程：如果编辑器实例还没准备好，什么也别做。
  if (!editor) return;

  // `editor.action()` 是与编辑器状态交互的唯一正确、安全的方式。
  // 它能确保你的所有操作都在一个原子性的事务中完成。把它想象成一个“系统调用”。
  editor.action(ctx => {
    // 从上下文中获取 ProseMirror 最底层的视图实例 (EditorView)。
    // 我们要直接操作这个“设备驱动”。
    const view = ctx.get(editorViewCtx);
    if (!view) return;

    // 这是整个修复的核心。`view.setProps` 是 ProseMirror 提供的底层 API，
    // 用来强制更新视图的配置。我们不再请求，而是**命令**它：
    // “你的 'editable' 状态现在必须是这个新值。立即生效。”
    view.setProps({
      editable: () => !isReadonly
    });

    // --- 用户体验不是可选项，而是核心功能 ---
    // 如果我们刚刚将编辑器从“只读”切换到“可编辑”，那么用户的唯一意图就是要开始输入。
    // 不要再让他们多点击一次。我们直接把光标给他们。
    if (!isReadonly) {
      // `nextTick`至关重要。它能确保我们是在 DOM 真正更新完毕、
      // 编辑器已经切换到可编辑状态之后，才去尝试聚焦。
      // 否则，你可能会尝试去聚焦一个逻辑上还不存在或未准备好的东西，从而导致失败。
      // 这是一种避免“竞争条件”的经典做法。
      nextTick(() => {
        view.focus();
      });
    }
  });
}, {
  // `immediate: true` 选项确保了这个 watch 处理器在组件挂载后会立即执行一次。
  // 这可以保证编辑器的初始状态总是正确的，防止当 prompt 一开始就是只读时出现 bug。
  // 它统一了初始设置和后续更新的行为。
  immediate: true
});
</script>