<template>
  <!-- Overlay with blur and transition -->
  <div
    class="fixed inset-0 z-2147483646 flex items-start justify-center pointer-events-none backdrop-blur-sm transition-opacity duration-300"
    :class="isMounted ? 'opacity-100' : 'opacity-0'"
  >
    <!-- Main panel with animation, refined styling -->
    <div
      class="mt-16 w-[min(800px,90vw)] max-h-[80vh] rounded-xl shadow-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#18181c]/80 pointer-events-auto flex flex-col transform transition-all duration-300"
      :class="isMounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
    >
      <!-- Header with Search and Close button -->
      <div class="p-3 border-b border-black/10 dark:border-white/10 flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 flex items-center gap-3 px-3 border border-gray-300/70 dark:border-gray-700/70 rounded-lg bg-white dark:bg-gray-900/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div class="i-carbon-search text-gray-400 flex-shrink-0" />
          <input
            ref="searchInput"
            v-model="query"
            placeholder="搜索提示..."
            class="w-full py-2 outline-none bg-transparent"
            @keydown.stop
          />
        </div>
        <button
          class="p-2 rounded-full hover:bg-gray-500/10 transition-colors flex-shrink-0"
          @click="$emit('close')"
          title="关闭 (Esc)"
        >
          <div class="i-carbon-close text-xl" />
        </button>
      </div>

      <!-- Categories -->
      <div class="px-3 py-2 border-b border-black/10 dark:border-white/10 flex flex-wrap gap-2 flex-shrink-0">
        <button
          v-for="c in categories"
          :key="c"
          @click="selectedCategoryModel = c"
          :class="[
            'px-3 py-1 rounded-lg text-sm border transition-colors',
            c === selectedCategoryModel
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white/50 dark:bg-transparent border-gray-300/70 dark:border-gray-700/70 hover:bg-gray-500/10 hover:border-gray-400/50',
          ]"
        >
          {{ c || '未分类' }}
        </button>
      </div>

      <!-- Prompt List -->
      <div ref="scrollContainer" class="overflow-y-auto p-3 grid gap-3">
        <template v-if="prompts.length > 0">
          <div
            v-for="(p, i) in prompts"
            :key="p.id"
            @click="$emit('select', p)"
            :class="[
              'p-4 rounded-lg border cursor-pointer group transition-all duration-150',
              i === highlightIndex
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-lg'
                : 'border-gray-300/50 dark:border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-500/5',
            ]"
            title="回车使用"
          >
            <div class="flex items-start justify-between">
              <div class="font-semibold text-base text-gray-800 dark:text-gray-100 truncate mr-4">
                {{ p.title }}
              </div>
              <button
                class="p-2 rounded-full text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-500/10 flex-shrink-0"
                @click.stop="$emit('copy', p)"
                title="复制 (Ctrl+C)"
              >
                <div class="i-carbon-copy text-lg" />
              </button>
            </div>
            <div class="mt-1 text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {{ preview(p.content) }}
            </div>
            <div class="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
              <div class="flex items-center gap-1.5">
                <div class="i-carbon-folder" />
                <span>{{ p.categoryName || '未分类' }}</span>
              </div>
              <div v-if="p.tags?.length" class="flex items-center gap-1.5">
                <div class="i-carbon-tag" />
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="t in p.tags"
                    :key="t"
                    class="px-1.5 py-0.5 rounded-md bg-gray-200/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300"
                  >
                    {{ t }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-if="prompts.length === 0 && !isLoading" class="text-center py-10 text-gray-500">
          没有找到匹配的提示
        </div>
        <!-- Sentinel for infinite scroll -->
        <div ref="loaderRef" class="h-1"></div>
      </div>

      <!-- Footer -->
      <div
        class="p-2 text-xs text-gray-400 dark:text-gray-600 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-shrink-0"
      >
        <div>
          <span class="font-semibold">↑</span>/<span class="font-semibold">↓</span> 导航
          <span class="mx-2">·</span>
          <span class="font-semibold">Tab</span> 切换分类
        </div>
        <div class="text-gray-500">
          <span v-if="isLoading && prompts.length > 0" class="flex items-center gap-1">
            <div class="i-carbon-circle-dash w-4 h-4 animate-spin"></div>
            加载中...
          </span>
          <span v-else>
            共 {{ prompts.length }} / {{ totalPrompts }} 个提示
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useFocus, useVModel } from '@vueuse/core'
import type { PromptDTO } from '@/utils/messaging'

const props = defineProps<{
  prompts: PromptDTO[]
  categories: string[]
  selectedCategory: string
  highlightIndex: number
  searchQuery: string
  isLoading: boolean
  hasMore: boolean
  totalPrompts: number
}>()

const emit = defineEmits<{
  (e: 'select', p: PromptDTO): void
  (e: 'copy', p: PromptDTO): void
  (e: 'close'): void
  (e: 'update:selectedCategory', v: string): void
  (e: 'update:searchQuery', v: string): void
  (e: 'load-more'): void
}>()

const searchInput = ref<HTMLInputElement | null>(null)
useFocus(searchInput, { initialValue: true })

const query = useVModel(props, 'searchQuery', emit)
const selectedCategoryModel = useVModel(props, 'selectedCategory', emit)

const isMounted = ref(false)
const loaderRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  setTimeout(() => { isMounted.value = true }, 10)

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && props.hasMore && !props.isLoading) {
        emit('load-more')
      }
    },
    { threshold: 0.5 },
  )

  watch(loaderRef, (newEl, oldEl) => {
    if (oldEl) observer?.unobserve(oldEl)
    if (newEl) observer?.observe(newEl)
  }, { immediate: true })
})

onUnmounted(() => {
  observer?.disconnect()
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
.z-2147483646 {
  z-index: 2147483646;
}
</style>