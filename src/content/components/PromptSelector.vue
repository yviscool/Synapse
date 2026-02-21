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
      <div class="px-5 py-4 flex-shrink-0 bg-white/80 dark:bg-[#09090b]/90 backdrop-blur-md z-10 border-b border-black/5 dark:border-white/5">
        <div class="relative flex items-center group">
          <div class="absolute left-3.5 text-neutral-400 group-focus-within:text-neutral-600 dark:text-neutral-500 dark:group-focus-within:text-neutral-300 transition-colors">
            <div class="i-carbon-search text-lg synapse-icon-muted" />
          </div>
          <input
            ref="searchInput"
            v-model="query"
            :placeholder="t('content.searchPlaceholder')"
            class="synapse-input w-full bg-neutral-100/50 dark:bg-[#18181b] hover:bg-neutral-100 dark:hover:bg-[#27272a] focus:bg-white dark:focus:bg-[#09090b] border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-[14px] outline-none transition-all duration-300 font-medium shadow-sm focus:shadow-md placeholder:font-normal"
          />
          <button
            v-if="!props.isComposerVisible"
            @click="$emit('close')"
            class="absolute right-3 p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            :title="t('content.closeTip')"
          >
            <div class="i-carbon-close text-lg synapse-icon-muted" />
          </button>
        </div>
      </div>

      <!-- Categories -->
      <div
        v-if="!isSearchMode"
        class="px-5 pb-2 pt-2 flex-shrink-0 bg-white/60 dark:bg-[#09090b]/60 backdrop-blur-sm overflow-x-auto no-scrollbar mask-gradient-right"
      >
        <div class="flex gap-2">
          <button
            v-for="c in categories"
            :key="c"
            @click="selectedCategoryModel = c"
            class="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase transition-all duration-300 border whitespace-nowrap synapse-category-btn"
            :class="[
              c === selectedCategoryModel ? 'is-active' : '',
            ]"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <!-- Prompts List -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto px-3 py-2 scroll-smooth custom-scrollbar bg-[#FAFAFA] dark:bg-[#000000]">
        <div v-if="prompts.length > 0" class="grid gap-1.5 pb-4">
          <article
            v-for="(p, i) in promptCards"
            :key="p.id"
            @click="$emit('select', p)"
            class="group relative p-3.5 rounded-xl cursor-pointer border transition-all duration-200 synapse-prompt-item"
            :class="[
              i === highlightIndex ? 'is-active' : '',
            ]"
          >
            <!-- Content -->
            <div class="flex justify-between items-start gap-3">
              <div class="min-w-0 flex-1">
                <h3
                  class="font-semibold text-[14px] leading-tight truncate mb-1 synapse-title"
                  v-html="p.highlightedTitle"
                />
                <div
                  class="text-[13px] leading-relaxed line-clamp-2 synapse-content opacity-80"
                  v-html="p.highlightedContent"
                />
              </div>
            </div>

            <!-- Footer / Meta -->
            <div class="mt-2.5 flex items-center justify-between text-[11px] synapse-meta">
              <div class="flex items-center gap-3">
                 <div v-if="p.categoryName" class="flex items-center gap-1.5 opacity-60">
                  <div class="i-carbon-folder synapse-icon-muted text-[10px]" />
                  <span class="truncate max-w-[80px] synapse-meta-text font-medium">{{ p.categoryName }}</span>
                </div>
              </div>
              
               <!-- Quick Actions (Visible on hover/active) -->
               <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button
                    class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
                    @click.stop="$emit('copy', p)"
                    :title="t('content.copy')"
                  >
                    <div class="i-carbon-copy text-xs synapse-icon-muted" />
                  </button>
                   <div class="i-carbon-arrow-right text-neutral-300 dark:text-neutral-600 synapse-icon-muted text-xs" />
               </div>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-if="prompts.length === 0 && !isLoading" class="h-full flex flex-col items-center justify-center synapse-meta-text pb-20">
          <div class="i-ph-magnifying-glass text-4xl mb-3 opacity-10" />
          <p class="text-xs font-medium opacity-40">{{ t('content.noMatch') }}</p>
        </div>
        
        <!-- Loader -->
        <div ref="loaderRef" class="py-4 flex justify-center opacity-0 transition-opacity duration-300" :class="{ 'opacity-100': isLoading }">
           <div class="i-carbon-circle-dash w-4 h-4 animate-spin text-neutral-400" />
        </div>
      </div>

      <!-- Status Bar -->
      <footer class="synapse-footer px-5 py-2 bg-white dark:bg-[#09090b] border-t border-neutral-100 dark:border-white/5 text-[10px] font-medium flex justify-between items-center select-none overflow-hidden">
        <div class="flex gap-4 whitespace-nowrap synapse-footer-text opacity-50">
           <span><b class="font-bold">↑↓</b> {{ t('content.navTip') }}</span>
           <span v-if="!props.isComposerVisible && !isSearchMode"><b class="font-bold">Tab</b> {{ t('content.categoryTip') }}</span>
        </div>
        <div class="flex-shrink-0 synapse-footer-text opacity-40 font-mono">
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
const isSearchMode = computed(() => query.value.trim().length > 0)

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
/* Light Mode Defaults */
.synapse-selector-root .synapse-title,
.synapse-selector-root .synapse-input {
  color: #171717 !important;
}
.synapse-selector-root .synapse-input::placeholder {
  color: #a3a3a3 !important;
}
.synapse-selector-root .synapse-content,
.synapse-selector-root .synapse-meta-text,
.synapse-selector-root .synapse-footer-text {
  color: #525252 !important;
}
.synapse-selector-root .synapse-icon-muted {
  color: #a3a3a3 !important;
}

/* Dark Mode Overrides - The "Masterpiece" Logic */
.synapse-selector-root.dark .synapse-title,
.synapse-selector-root.dark .synapse-input,
.dark .synapse-selector-root .synapse-title,
.dark .synapse-selector-root .synapse-input {
  color: #ededed !important; /* Neutral-100: Crisp White */
}
.synapse-selector-root.dark .synapse-input::placeholder,
.dark .synapse-selector-root .synapse-input::placeholder {
  color: #525252 !important; /* Neutral-600 */
}

.synapse-selector-root.dark .synapse-content,
.synapse-selector-root.dark .synapse-meta-text,
.synapse-selector-root.dark .synapse-footer-text,
.dark .synapse-selector-root .synapse-content {
  color: #a3a3a3 !important; /* Neutral-400 */
}

.synapse-selector-root.dark .synapse-icon-muted,
.dark .synapse-selector-root .synapse-icon-muted {
  color: #737373 !important; /* Neutral-500 */
}

/* Category Buttons */
.synapse-category-btn {
  color: #737373 !important;
  border-color: transparent !important;
  background-color: transparent !important;
}
.synapse-category-btn:hover {
  background-color: rgba(0,0,0,0.05) !important;
  color: #171717 !important;
}
.synapse-category-btn.is-active {
  background-color: #171717 !important; /* Neutral-900 */
  color: #ffffff !important;
}

/* Dark Mode Categories */
.synapse-selector-root.dark .synapse-category-btn,
.dark .synapse-selector-root .synapse-category-btn {
  color: #737373 !important;
}
.synapse-selector-root.dark .synapse-category-btn:hover,
.dark .synapse-selector-root .synapse-category-btn:hover {
  background-color: rgba(255,255,255,0.1) !important;
  color: #ededed !important;
}
.synapse-selector-root.dark .synapse-category-btn.is-active,
.dark .synapse-selector-root .synapse-category-btn.is-active {
  background-color: #ededed !important; /* Neutral-100 */
  color: #171717 !important; /* Neutral-900 */
}

/* Dark Mode Highlight Mark */
.synapse-selector-root.dark mark,
.dark .synapse-selector-root mark {
  background-color: rgba(250, 204, 21, 0.4) !important; /* Yellow-400 */
  color: #fefce8 !important; /* Yellow-50 */
  text-decoration: none;
  padding: 1px 3px;
  border-radius: 3px;
}
</style>

<style scoped>
.prompt-selector-panel {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
}
:where(.dark, [data-theme='dark']) .prompt-selector-panel {
  background: #09090b; /* Zinc/Neutral 950 - Deepest Black */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.synapse-prompt-item { 
  background: transparent; 
  border-color: transparent; 
}
.synapse-prompt-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.synapse-prompt-item.is-active { 
  background: #ffffff; 
  border-color: rgba(0, 0, 0, 0.08); 
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); 
}

:where(.dark, [data-theme='dark']) .synapse-prompt-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
:where(.dark, [data-theme='dark']) .synapse-prompt-item.is-active { 
  background: #18181b; /* Neutral-900 */
  border-color: rgba(255, 255, 255, 0.1); 
  box-shadow: none;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { border-radius: 4px; background-color: rgba(0, 0, 0, 0.1); }
:where(.dark, [data-theme='dark']) .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); }

.mask-gradient-right { mask-image: linear-gradient(to right, black 90%, transparent 100%); }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Enhanced Highlight Mark */
:deep(mark) {
  background-color: rgba(253, 224, 71, 0.3); /* Yellow-300 transparent */
  color: inherit !important;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
