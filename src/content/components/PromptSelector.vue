<template>
  <div
    class="fixed inset-0 z-2147483646 flex items-start justify-center pointer-events-none transition-opacity duration-300"
    :class="isMounted ? 'opacity-100' : 'opacity-0'"
  >
    <div
      class="relative mt-16 w-[min(800px,90vw)] max-h-[80vh] rounded-xl shadow-2xl border border-black/10 dark:border-white/30 bg-white/80 dark:bg-[#202127]/90 pointer-events-auto flex flex-col transform transition-all duration-300"
      :class="isMounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
    >
      <!-- Header / Search -->
      <div class="p-3 border-b border-black/10 dark:border-white/30 flex items-center gap-3 flex-shrink-0">
        <div class="flex-1 flex items-center gap-3 px-3 border border-gray-300/70 dark:border-white/30 rounded-lg bg-white dark:bg-white/5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div class="i-carbon-search text-gray-400 dark:text-white/80 flex-shrink-0" />
          <input
            ref="searchInput"
            v-model="query"
            :placeholder="t('content.searchPlaceholder')"
            class="w-full py-2 outline-none bg-transparent text-gray-800/100 dark:text-white/100 dark:placeholder-white/70"
          />
        </div>
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
              ? 'bg-blue-600/100 text-white/100 border-blue-600'
              : 'bg-white/50 dark:bg-transparent border-gray-300/70 dark:border-white/30 hover:bg-gray-500/10 dark:hover:bg-white/10 dark:hover:border-white/20 text-gray-800/100 dark:text-white/85',
          ]"
        >
          {{ c }}
        </button>
      </div>

      <!-- Scrollable Content -->
      <!-- FIX: Added 'custom-scrollbar' class to enable styling -->
      <div ref="scrollContainer" class="overflow-y-auto p-3 grid gap-3 custom-scrollbar">
        <template v-if="prompts.length > 0">
          <div
            v-for="(p, i) in promptCards"
            :key="p.id"
            @click="$emit('select', p)"
            :class="[
              'p-4 rounded-lg border cursor-pointer group transition-all duration-150 min-w-0',
              i === highlightIndex
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 shadow-lg'
                : 'border-gray-300/50 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/60 hover:bg-gray-500/5 dark:hover:bg-white/[0.03]',
            ]"
            :title="t('content.useWithEnter')"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div
                  class="font-semibold text-base text-gray-800/100 dark:text-white/100 truncate"
                  v-html="p.highlightedTitle"
                />
              </div>
              <button
                class="p-2 rounded-full text-gray-500 dark:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-500/10 dark:hover:bg-white/10 flex-shrink-0"
                @click.stop="$emit('copy', p)"
                :title="t('content.copy')"
              >
                <div class="i-carbon-copy text-lg" />
              </button>
            </div>
            <div
              class="mt-1 text-gray-600/100 dark:text-white/80 text-sm line-clamp-2"
              v-html="p.highlightedContent"
            />
            <div class="mt-3 flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500/100 dark:text-white/70">
              <div v-if="p.categoryName" class="flex items-center gap-1.5">
                <div class="i-carbon-folder" />
                <span>{{ p.categoryName }}</span>
              </div>
              <div v-if="p.tags?.length" class="flex items-center gap-1.5">
                <div class="i-carbon-tag" />
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in p.tags"
                    :key="tag"
                    class="px-1.5 py-0.5 rounded-md bg-gray-200/70 dark:bg-white/10 text-gray-600/100 dark:text-white/80"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="prompts.length === 0 && !isLoading" class="text-center py-10 text-gray-500/100 dark:text-white/80">
          {{ t('content.noMatch') }}
        </div>
        <div ref="loaderRef" class="h-1"></div>
      </div>

      <!-- Footer -->
      <div class="p-2 text-xs text-gray-400/100 dark:text-white/70 border-t border-black/10 dark:border-white/30 flex items-center justify-between flex-shrink-0">
        <div>
          <span class="font-semibold">↑</span>/<span class="font-semibold">↓</span> {{ t('content.navTip') }}
          <span class="mx-2">·</span>
          <span class="font-semibold">Tab</span> {{ t('content.categoryTip') }}
        </div>
        <div class="text-gray-500/100 dark:text-gray-400/100">
          <span v-if="isLoading && prompts.length > 0" class="flex items-center gap-1">
            <div class="i-carbon-circle-dash w-4 h-4 animate-spin"></div>
            {{ t('common.loading') }}
          </span>
          <span v-else>
            {{ t('content.total', { total: totalPrompts }) }}
          </span>
        </div>
      </div>
      
      <!-- Close Button -->
      <button
        class="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-500/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
        @click="$emit('close')"
        :title="t('content.closeTip')"
      >
        <div class="i-carbon-close text-xl text-gray-600/100 dark:text-white/80" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useFocus, useVModel } from '@vueuse/core'
import type { PromptDTO } from '@/utils/messaging'
import { generateHighlightedHtml, generateHighlightedPreviewHtml } from '@/utils/highlighter'
import type { FuseResultMatch } from 'fuse.js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  prompts: (PromptDTO & { matches?: readonly FuseResultMatch[] })[]
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

type PromptCardView = PromptDTO & {
  matches?: readonly FuseResultMatch[]
  highlightedTitle: string
  highlightedContent: string
}

const promptCards = computed<PromptCardView[]>(() => {
  return props.prompts.map((prompt) => ({
    ...prompt,
    highlightedTitle: generateHighlightedHtml(prompt.title, prompt.matches, 'title'),
    highlightedContent: generateHighlightedPreviewHtml(prompt.content, prompt.matches, 'content', 260),
  }))
})

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

const scrollContainer = ref<HTMLElement | null>(null)

function scrollToItem(index: number) {
  if (!scrollContainer.value) return
  const itemEl = scrollContainer.value.children[index] as HTMLElement
  if (itemEl) {
    itemEl.scrollIntoView({ block: 'nearest', behavior: 'auto' })
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

/* FIX: Added custom scrollbar styles with dark mode support */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gray-300/50 dark:bg-gray-600/50 rounded-full;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400/70 dark:bg-gray-500/70;
}


:deep(mark) {
  background-color: rgb(253 230 138 / 0.7); /* yellow-200/70 */
  color: inherit;
  border-radius: 3px;
  padding: 0 2px;
}
.dark :deep(mark) {
  background-color: rgb(59 130 246 / 0.3); /* blue-500/30 */
}
:deep(strong), :deep(em) {
  color: inherit;
}
</style>
