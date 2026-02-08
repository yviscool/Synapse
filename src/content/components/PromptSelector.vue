<template>
  <div
    class="fixed inset-0 z-[2147483646] flex items-center justify-center pointer-events-none transition-opacity duration-300 prompt-selector-overlay font-sans synapse-theme-scope"
    :class="[isMounted ? 'opacity-100' : 'opacity-0', { dark: isDark }]"
  >
    <!-- Main Panel -->
    <section
      class="synapse-selector-root relative pointer-events-auto flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] prompt-selector-panel"
      :class="[
        isMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4',
        props.isComposerVisible ? 'w-[320px] h-[min(800px,85vh)] mr-2' : 'w-[720px] h-[min(640px,80vh)]',
        { dark: isDark }
      ]"
    >
      <!-- Header: Search -->
      <div class="px-6 py-5 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-black/5 dark:border-white/5">
        <div class="relative flex items-center group">
          <div class="absolute left-3 text-slate-400 group-focus-within:text-slate-600 dark:text-slate-300 transition-colors">
            <div class="i-carbon-search text-xl synapse-icon-muted" />
          </div>
          <input
            ref="searchInput"
            v-model="query"
            :placeholder="t('content.searchPlaceholder')"
            class="synapse-input w-full bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-black border border-transparent focus:border-cyan-500/30 rounded-xl py-3 pl-11 pr-4 text-[15px] outline-none transition-all duration-300 font-medium shadow-inner"
          />
          <button
            v-if="!props.isComposerVisible"
            @click="$emit('close')"
            class="absolute right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            :title="t('content.closeTip')"
          >
            <div class="i-carbon-close text-lg synapse-icon-muted" />
          </button>
        </div>
      </div>

      <!-- Categories -->
      <div class="px-6 pb-2 pt-3 flex-shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm overflow-x-auto no-scrollbar mask-gradient-right">
        <div class="flex gap-2">
          <button
            v-for="c in categories"
            :key="c"
            @click="selectedCategoryModel = c"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border whitespace-nowrap synapse-category-btn"
            :class="[
              c === selectedCategoryModel ? 'is-active' : '',
            ]"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <!-- Prompts List -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto px-4 py-2 scroll-smooth custom-scrollbar bg-slate-50/50 dark:bg-[#0B0F19]/50">
        <div v-if="prompts.length > 0" class="grid gap-2 pb-4">
          <article
            v-for="(p, i) in promptCards"
            :key="p.id"
            @click="$emit('select', p)"
            class="group relative p-4 rounded-xl cursor-pointer border transition-all duration-200 synapse-prompt-item"
            :class="[
              i === highlightIndex ? 'is-active' : '',
            ]"
          >
            <!-- Content -->
            <div class="flex justify-between items-start gap-3">
              <div class="min-w-0 flex-1">
                <h3
                  class="font-semibold text-[15px] leading-tight truncate mb-1 synapse-title"
                  v-html="p.highlightedTitle"
                />
                <div
                  class="text-sm leading-relaxed line-clamp-2 synapse-content"
                  v-html="p.highlightedContent"
                />
              </div>
            </div>

            <!-- Footer / Meta -->
            <div class="mt-3 flex items-center justify-between text-xs synapse-meta">
              <div class="flex items-center gap-3">
                 <div v-if="p.categoryName" class="flex items-center gap-1.5 opacity-80">
                  <div class="i-carbon-folder synapse-icon-muted" />
                  <span class="truncate max-w-[80px] synapse-meta-text">{{ p.categoryName }}</span>
                </div>
              </div>
              
               <!-- Quick Actions (Visible on hover/active) -->
               <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button
                    class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    @click.stop="$emit('copy', p)"
                    :title="t('content.copy')"
                  >
                    <div class="i-carbon-copy text-sm synapse-icon-muted" />
                  </button>
                   <div class="i-carbon-arrow-right text-slate-300 dark:text-slate-600 synapse-icon-muted" />
               </div>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-if="prompts.length === 0 && !isLoading" class="h-full flex flex-col items-center justify-center synapse-meta-text pb-20">
          <div class="i-ph-magnifying-glass text-4xl mb-3 opacity-20" />
          <p class="text-sm font-medium">{{ t('content.noMatch') }}</p>
        </div>
        
        <!-- Loader -->
        <div ref="loaderRef" class="py-4 flex justify-center opacity-0 transition-opacity duration-300" :class="{ 'opacity-100': isLoading }">
           <div class="i-carbon-circle-dash w-5 h-5 animate-spin text-slate-400" />
        </div>
      </div>

      <!-- Status Bar -->
      <footer class="synapse-footer px-6 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800 text-[11px] font-medium flex justify-between items-center select-none overflow-hidden">
        <div class="flex gap-3 whitespace-nowrap synapse-footer-text">
           <span><b class="font-bold">↑↓</b> {{ t('content.navTip') }}</span>
           <span v-if="!props.isComposerVisible"><b class="font-bold">Tab</b> {{ t('content.categoryTip') }}</span>
        </div>
        <div class="flex-shrink-0 synapse-footer-text">
           {{ t('content.total', { total: totalPrompts }) }}
        </div>
      </footer>
    </section>
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
  isComposerVisible?: boolean
  activePromptTitle?: string
  isDark?: boolean
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
  // Staggered animation trigger
  setTimeout(() => { isMounted.value = true }, 50)

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && props.hasMore && !props.isLoading) {
        emit('load-more')
      }
    },
    { threshold: 0.1 },
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
  const gridContainer = scrollContainer.value.firstElementChild
  if (!gridContainer) return
  
  const itemEl = gridContainer.children[index] as HTMLElement
  if (itemEl) {
    itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

defineExpose({
  scrollToItem,
})
</script>

<style>
/* 亮色默认 */
.synapse-selector-root .synapse-title,
.synapse-selector-root .synapse-input {
  color: #1e293b !important;
}
.synapse-selector-root .synapse-input::placeholder {
  color: #94a3b8 !important;
}
.synapse-selector-root .synapse-content,
.synapse-selector-root .synapse-meta-text,
.synapse-selector-root .synapse-footer-text {
  color: #64748b !important;
}

/* 暗色强制转白 - 增强搜索可见度 */
.synapse-selector-root.dark .synapse-title,
.synapse-selector-root.dark .synapse-input,
.dark .synapse-selector-root .synapse-title,
.dark .synapse-selector-root .synapse-input {
  color: #ffffff !important; /* 纯白 */
}
.synapse-selector-root.dark .synapse-input::placeholder,
.dark .synapse-selector-root .synapse-input::placeholder {
  color: #cbd5e1 !important; /* 更亮的提示文字 Slate-300 */
}

.synapse-selector-root.dark .synapse-content,
.synapse-selector-root.dark .synapse-meta-text,
.synapse-selector-root.dark .synapse-footer-text,
.dark .synapse-selector-root .synapse-content {
  color: #cbd5e1 !important;
}

/* 图标转白 */
.synapse-selector-root.dark .synapse-icon-muted,
.dark .synapse-selector-root .synapse-icon-muted {
  color: #cbd5e1 !important;
}

/* 分类按钮 */
.synapse-category-btn {
  color: #64748b !important;
}
.synapse-category-btn.is-active {
  background-color: #0f172a !important;
  color: #ffffff !important;
}
.synapse-selector-root.dark .synapse-category-btn.is-active,
.dark .synapse-selector-root .synapse-category-btn.is-active {
  background-color: #f8fafc !important;
  color: #0f172a !important;
}
</style>

<style scoped>
.prompt-selector-panel {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
}
:where(.dark, [data-theme='dark']) .prompt-selector-panel {
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.synapse-prompt-item { background: rgba(255, 255, 255, 0.4); border-color: transparent; }
.synapse-prompt-item.is-active { background: #ffffff; border-color: rgba(6, 182, 212, 0.3); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
:where(.dark, [data-theme='dark']) .synapse-prompt-item { background: rgba(30, 41, 59, 0.4); }
:where(.dark, [data-theme='dark']) .synapse-prompt-item.is-active { background: rgba(30, 41, 59, 1); border-color: rgba(6, 182, 212, 0.5); }
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-thumb { border-radius: 10px; background-color: rgba(156, 163, 175, 0.3); }
.mask-gradient-right { mask-image: linear-gradient(to right, black 95%, transparent 100%); }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Enhanced Highlight Mark for Dark Mode */
:deep(mark) {
  background-color: rgba(6, 182, 212, 0.2);
  color: inherit !important;
  border-radius: 2px;
  padding: 0 1px;
}
.dark :deep(mark), [data-theme='dark'] :deep(mark) {
   background-color: #fde047 !important; /* Vibrant Amber/Yellow */
   color: #000000 !important; /* High contrast black text */
   font-weight: 600;
   box-shadow: 0 0 8px rgba(253, 224, 71, 0.3);
}
</style>