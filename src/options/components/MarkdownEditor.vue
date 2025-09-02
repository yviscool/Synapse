<template>
  <div class="flex flex-col h-full ">
    <div class="flex-1 overflow-y-auto">
      <MilkdownProvider>
        <MilkdownEditorCore v-model="model" :placeholder="props.placeholder" :readonly="props.readonly"
          @change="handleChange" @update:stats="stats = $event" @update:cursor="cursorPosition = $event" />
      </MilkdownProvider>
    </div>

    <div
      class="flex items-center gap-6 px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
      <span>{{ stats.lines }} 行</span>
      <span>{{ stats.words }} 词</span>
      <span>{{ stats.characters }} 字符</span>
      <span v-if="cursorPosition">
        行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditorCore from './Milkdown.vue'

interface Props {
  placeholder?: string
  readonly?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  placeholder: '开始编写你的 Prompt...',
  readonly: false
})
const emit = defineEmits<{ (e: 'change', value: string): void }>()
const cursorPosition = ref<{ line: number; column: number } | null>(null)

const model = defineModel<string>({ required: true })

const stats = ref({
  lines: model.value.split('\n').length,
  words: model.value.trim() ? model.value.trim().split(/\s+/).length : 0,
  characters: model.value.length
})


const handleChange = (value: string) => {
  emit('change', value)
}

</script>

<style>
.milkdown .ProseMirror {
  /* 移除这里的 padding 样式！让 Crepe 主题自己控制 */
  height: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
}

/* 高亮当前行 */
.cm-activeLineGutter {
  /*优先级更高*/
  background-color: #006fff1c !important;
}

.cm-editor {
  /* 优先级更高 */
  font-size: 16px !important;
  line-height: 1.6 !important;
  font-weight: bold !important;
}

.milkdown {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  background: #ffffff;
}
</style>