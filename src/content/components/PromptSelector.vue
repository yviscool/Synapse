<template>
  <div
    class="fixed inset-0 z-2147483646 flex items-start justify-center pointer-events-none transition-opacity duration-400 prompt-selector-overlay"
    :class="isMounted ? 'opacity-100' : 'opacity-0'"
  >
    <section
      class="relative pointer-events-auto mt-[clamp(2.8rem,6vh,4.2rem)] flex h-[min(80vh,780px)] max-h-[80vh] flex-col overflow-hidden rounded-[26px] border prompt-selector-panel"
      :class="[
        { 'is-mounted': isMounted, 'is-composer-visible': !!props.isComposerVisible },
      ]"
    >
      <div class="prompt-spine" :class="{ 'is-visible': props.isComposerVisible }">
        <div class="prompt-spine-glow" />
        <button
          class="prompt-spine-close"
          @click="$emit('close')"
          :title="t('content.closeTip')"
        >
          <div class="i-carbon-close text-lg" />
        </button>
        <div class="prompt-spine-title">
          {{ props.activePromptTitle || t("content.composer.defaultTitle") }}
        </div>
      </div>

      <div class="prompt-selector-body" :class="{ 'is-hidden': props.isComposerVisible }">
        <div class="px-4 py-3 border-b prompt-selector-divider flex items-center gap-3 flex-shrink-0">
          <div class="flex-1 flex items-center gap-3 px-3 rounded-xl border prompt-search-box">
            <div class="i-carbon-search text-[18px] text-slate-500/70 dark:text-white/70 flex-shrink-0" />
            <input
              ref="searchInput"
              v-model="query"
              :placeholder="t('content.searchPlaceholder')"
              class="w-full py-2.5 outline-none bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400/80 dark:placeholder:text-white/50"
            />
          </div>
        </div>

        <div class="px-4 py-2.5 border-b prompt-selector-divider flex flex-wrap gap-2.5 flex-shrink-0">
          <button
            v-for="c in categories"
            :key="c"
            @click="selectedCategoryModel = c"
            :class="[
              'px-3.5 py-1.5 rounded-full text-xs border transition-all duration-200 prompt-category-chip',
              c === selectedCategoryModel
                ? 'is-active bg-cyan-600 text-white border-cyan-600 shadow-[0_8px_24px_rgba(8,145,178,0.35)]'
                : 'bg-white/72 dark:bg-white/4 border-slate-300/60 dark:border-white/15 text-slate-700 dark:text-white/78 hover:bg-slate-100/95 dark:hover:bg-white/8 hover:-translate-y-[1px]',
            ]"
          >
            {{ c }}
          </button>
        </div>

        <div ref="scrollContainer" class="flex-1 overflow-y-auto px-4 py-3 grid auto-rows-max gap-3 custom-scrollbar">
          <template v-if="prompts.length > 0">
            <article
              v-for="(p, i) in promptCards"
              :key="p.id"
              @click="$emit('select', p)"
              :class="[
                'p-4 rounded-2xl border cursor-pointer group transition-all duration-220 min-w-0 prompt-item',
                i === highlightIndex
                  ? 'is-active'
                  : '',
              ]"
              :title="t('content.useWithEnter')"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div
                    class="font-semibold text-[15px] text-slate-800 dark:text-white truncate prompt-item-title"
                    v-html="p.highlightedTitle"
                  />
                </div>
                <button
                  class="p-2 rounded-full text-slate-500 dark:text-white/74 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-900/5 dark:hover:bg-white/10 flex-shrink-0"
                  @click.stop="$emit('copy', p)"
                  :title="t('content.copy')"
                >
                  <div class="i-carbon-copy text-lg" />
                </button>
              </div>
              <div
                class="mt-1.5 text-slate-600 dark:text-white/70 text-sm line-clamp-2 leading-relaxed prompt-item-content"
                v-html="p.highlightedContent"
              />
              <div class="mt-3.5 flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-white/60 prompt-item-meta">
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
                      class="px-1.5 py-0.5 rounded-md bg-slate-200/72 dark:bg-white/9 text-slate-600 dark:text-white/76 prompt-item-tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </template>

          <div v-if="prompts.length === 0 && !isLoading" class="text-center py-12 text-slate-500 dark:text-white/70">
            {{ t('content.noMatch') }}
          </div>
          <div ref="loaderRef" class="h-1"></div>
        </div>

        <footer class="px-4 py-2.5 text-xs prompt-selector-divider border-t flex items-center justify-between flex-shrink-0 text-slate-500 dark:text-white/65">
          <div>
            <span class="font-semibold">↑</span>/<span class="font-semibold">↓</span> {{ t('content.navTip') }}
            <span class="mx-2">·</span>
            <span class="font-semibold">Tab</span> {{ t('content.categoryTip') }}
          </div>
          <div class="text-slate-500 dark:text-white/55">
            <span v-if="isLoading && prompts.length > 0" class="flex items-center gap-1">
              <div class="i-carbon-circle-dash w-4 h-4 animate-spin" />
              {{ t('common.loading') }}
            </span>
            <span v-else>
              {{ t('content.total', { total: totalPrompts }) }}
            </span>
          </div>
        </footer>
      </div>

      <button
        v-if="!props.isComposerVisible"
        class="absolute top-3 right-3 p-2 rounded-full text-slate-600 dark:text-white/72 hover:bg-slate-900/8 dark:hover:bg-white/10 transition-colors flex-shrink-0"
        @click="$emit('close')"
        :title="t('content.closeTip')"
      >
        <div class="i-carbon-close text-xl" />
      </button>
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

<style>
.z-2147483646 {
  z-index: 2147483646;
}

.prompt-selector-overlay {
  z-index: 2147483646;
}

.prompt-selector-panel {
  --book-height: min(80vh, 780px);
  --book-spine-width: clamp(60px, 6.4vw, 74px);
  --book-content-width: min(920px, 82vw);
  --book-gap: 8px;
  width: min(840px, 90vw);
  background:
    radial-gradient(110% 120% at 0% 0%, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0) 48%),
    linear-gradient(146deg, rgba(255, 255, 255, 0.97), rgba(246, 249, 252, 0.92));
  border-color: rgba(148, 163, 184, 0.38);
  box-shadow:
    0 28px 74px rgba(15, 23, 42, 0.22),
    0 8px 22px rgba(15, 23, 42, 0.08);
  transform: translateY(16px) scale(0.972);
  opacity: 0;
  contain: layout paint style;
  will-change: width, transform, opacity;
  transition:
    width 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 300ms ease,
    box-shadow 280ms ease,
    border-radius 360ms ease,
    opacity 260ms ease;
}

.prompt-selector-panel.is-mounted {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.prompt-selector-panel.is-mounted.is-composer-visible {
  width: var(--book-spine-width);
  transform: translateX(calc((var(--book-content-width) + var(--book-gap)) * -0.5)) scale(1);
  border-radius: 18px;
  box-shadow:
    0 22px 62px rgba(15, 23, 42, 0.26),
    inset -1px 0 0 rgba(255, 255, 255, 0.72);
}

.prompt-selector-divider {
  border-color: rgba(148, 163, 184, 0.3);
}

.prompt-search-box {
  border-color: rgba(148, 163, 184, 0.38);
  background: rgba(255, 255, 255, 0.75);
}

.prompt-search-box:focus-within {
  border-color: rgba(8, 145, 178, 0.52);
  box-shadow: 0 0 0 2px rgba(8, 145, 178, 0.16);
}

.prompt-selector-body {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  transition:
    opacity 260ms ease,
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.prompt-selector-body.is-hidden {
  opacity: 0;
  transform: translateX(-16px) scale(0.992);
  pointer-events: none;
}

.prompt-spine {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 12px 8px;
  opacity: 0;
  transform: translateX(12px);
  pointer-events: none;
  transition: opacity 320ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.prompt-spine.is-visible {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.prompt-spine-glow {
  position: absolute;
  inset: 10% 16% 10% 12%;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.3), rgba(14, 116, 144, 0.06));
  filter: blur(12px);
}

.prompt-spine-close {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  color: rgba(30, 41, 59, 0.9);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.35);
  transition: transform 180ms ease, background 180ms ease;
}

.prompt-spine-close:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.92);
}

.prompt-spine-title {
  position: relative;
  z-index: 1;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 12px;
  letter-spacing: 0.12em;
  font-weight: 700;
  max-height: calc(100% - 64px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(15, 23, 42, 0.82);
}

.prompt-item {
  border-color: rgba(148, 163, 184, 0.28);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.72));
}

.prompt-item:hover {
  transform: translateY(-2px);
  border-color: rgba(8, 145, 178, 0.38);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
}

.prompt-item.is-active {
  border-color: rgba(14, 116, 144, 0.72);
  background: linear-gradient(145deg, rgba(207, 250, 254, 0.95), rgba(236, 254, 255, 0.86));
  box-shadow:
    0 16px 36px rgba(8, 145, 178, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply rounded-full bg-slate-400/55 dark:bg-slate-500/45;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-500/70 dark:bg-slate-400/65;
}

.prompt-selector-panel mark {
  background-color: rgb(253 230 138 / 0.7);
  color: inherit;
  border-radius: 3px;
  padding: 0 2px;
}

.prompt-selector-panel strong,
.prompt-selector-panel em {
  color: inherit;
}

:where(.dark, [data-theme='dark']) .prompt-selector-panel {
  background:
    radial-gradient(120% 130% at 0% 0%, rgba(8, 145, 178, 0.2) 0%, rgba(8, 145, 178, 0) 55%),
    linear-gradient(158deg, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.88));
  border-color: rgba(148, 163, 184, 0.2);
  box-shadow:
    0 34px 82px rgba(2, 6, 23, 0.66),
    0 12px 30px rgba(2, 6, 23, 0.5);
}

:where(.dark, [data-theme='dark']) .prompt-selector-divider {
  border-color: rgba(148, 163, 184, 0.2);
}

:where(.dark, [data-theme='dark']) .prompt-search-box {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.5);
}

:where(.dark, [data-theme='dark']) .prompt-item {
  border-color: rgba(148, 163, 184, 0.18);
  background: linear-gradient(146deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.54));
}

:where(.dark, [data-theme='dark']) .prompt-item:hover {
  border-color: rgba(6, 182, 212, 0.46);
  box-shadow: 0 18px 38px rgba(2, 6, 23, 0.48);
}

:where(.dark, [data-theme='dark']) .prompt-item.is-active {
  border-color: rgba(8, 145, 178, 0.74);
  background: linear-gradient(146deg, rgba(15, 118, 110, 0.28), rgba(30, 41, 59, 0.78));
  box-shadow:
    0 20px 40px rgba(6, 182, 212, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

:where(.dark, [data-theme='dark']) .prompt-item-title {
  color: rgba(248, 250, 252, 0.97) !important;
}

:where(.dark, [data-theme='dark']) .prompt-item-content {
  color: rgba(226, 232, 240, 0.82) !important;
}

:where(.dark, [data-theme='dark']) .prompt-item-meta {
  color: rgba(203, 213, 225, 0.72) !important;
}

:where(.dark, [data-theme='dark']) .prompt-item-tag {
  color: rgba(226, 232, 240, 0.85) !important;
}

:where(.dark, [data-theme='dark']) .prompt-category-chip {
  color: rgba(226, 232, 240, 0.9) !important;
}

:where(.dark, [data-theme='dark']) .prompt-category-chip.is-active {
  color: rgba(255, 255, 255, 0.98) !important;
  border-color: rgba(8, 145, 178, 0.9) !important;
}

:where(.dark, [data-theme='dark']) .prompt-spine-close {
  color: rgba(241, 245, 249, 0.9);
  background: rgba(15, 23, 42, 0.64);
  border-color: rgba(148, 163, 184, 0.26);
}

:where(.dark, [data-theme='dark']) .prompt-spine-title {
  color: rgba(226, 232, 240, 0.9);
}

:where(.dark, [data-theme='dark']) .prompt-selector-panel mark {
  background-color: rgb(56 189 248 / 0.34);
}

@media (max-width: 960px) {
  .prompt-selector-panel {
    --book-content-width: min(90vw, 760px);
  }
}
</style>
