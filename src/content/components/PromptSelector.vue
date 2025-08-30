<template>
  <div class="fixed inset-0 z-2147483646 flex items-start justify-center pointer-events-none">
    <div class="mt-10 w-[min(900px,92vw)] rounded-xl shadow-2xl border border-gray-200 bg-white dark:bg-[#0b1220] pointer-events-auto">
      <div class="p-3 border-b border-gray-200/70 flex items-center gap-3">
        <input
          v-model="query"
          placeholder="搜索标题/内容/标签..."
          class="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-transparent"
          @keydown.stop
        />
        <div class="text-sm text-gray-500">共 {{ prompts.length }} 个提示</div>
      </div>

      <div class="px-3 py-2 flex flex-wrap gap-2">
        <button
          v-for="c in categories"
          :key="c"
          @click="$emit('update:selectedCategory', c)"
          :class="[
            'px-3 py-1 rounded-lg text-sm border transition-colors',
            c===selectedCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-transparent border-gray-200 hover:bg-gray-50'
          ]"
        >
          {{ c || '未分类' }}
        </button>
      </div>

      <div ref="scrollContainer" class="max-h-[60vh] overflow-y-auto p-3 grid gap-2">
        <div
          v-for="(p, i) in prompts"
          :key="p.id"
          @click="$emit('select', p)"
          :class="[
            'p-3 rounded-lg border cursor-pointer group transition-colors',
            i===highlightIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 hover:bg-gray-50'
          ]"
          title="回车插入，Ctrl+C 复制"
        >
          <div class="flex items-start justify-between">
            <div class="font-semibold truncate mr-2">{{ p.title }}</div>
            <button
              class="px-2 py-1 rounded-md text-xs bg-gray-100 hover:bg-gray-200"
              @click.stop="$emit('copy', p)"
            >
              复制
            </button>
          </div>
          <div class="mt-1 text-gray-600 text-sm line-clamp-2">{{ preview(p.content) }}</div>
          <div class="mt-2 flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md text-xs bg-blue-100 text-blue-700">{{ p.categoryName }}</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="t in p.tags"
                :key="t"
                class="px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700"
              >
                {{ t }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-2 text-xs text-gray-500 border-t border-gray-200 flex items-center justify-between">
        <div>↑/↓ 导航 · Tab 切换分类 · Enter 插入 · Ctrl+C 复制 · Esc 关闭</div>
        <button class="px-2 py-1 hover:bg-gray-100 rounded" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PromptDTO } from '@/utils/messaging'

const props = defineProps<{
  prompts: PromptDTO[]
  categories: string[]
  selectedCategory: string
  highlightIndex: number
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'select', p: PromptDTO): void
  (e: 'copy', p: PromptDTO): void
  (e: 'close'): void
  (e: 'update:selectedCategory', v: string): void
  (e: 'update:searchQuery', v: string): void
}>()

const query = computed({
  get: () => props.searchQuery,
  set: (v: string) => emit('update:searchQuery', v),
})

function preview(s: string) {
  const t = s || ''
  return t.length > 140 ? t.slice(0, 140) + '…' : t
}

const scrollContainer = ref<HTMLElement | null>(null)

function scrollToItem(index: number) {
  if (!scrollContainer.value) return
  const itemEl = scrollContainer.value.children[index] as HTMLElement
  if (itemEl) {
    itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

defineExpose({
  scrollToItem,
})
</script>

<style scoped>
.z-2147483646 { z-index: 2147483646; }
</style>