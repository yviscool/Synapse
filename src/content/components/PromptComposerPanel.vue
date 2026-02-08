<template>
  <transition name="book-page">
    <div
      v-show="visible"
      class="fixed inset-0 z-2147483647 pointer-events-none flex items-start justify-center composer-overlay"
    >
      <section
        class="pointer-events-auto relative mt-[clamp(2.8rem,6vh,4.2rem)] flex h-[min(80vh,780px)] max-h-[80vh] flex-col overflow-hidden rounded-[24px] border composer-panel"
      >
        <header class="relative px-6 py-4 composer-header">
          <div class="pointer-events-none absolute -left-14 top-6 h-28 w-28 rounded-full bg-cyan-300/18 blur-2xl" />
          <div class="pointer-events-none absolute right-8 -bottom-14 h-28 w-28 rounded-full bg-emerald-300/18 blur-2xl" />
          <div class="relative flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold tracking-[0.14em] uppercase composer-badge">{{ t("content.composer.badge") }}</p>
              <h3 class="mt-1 truncate text-lg font-semibold composer-title">{{ promptTitle || t("content.composer.defaultTitle") }}</h3>
              <p class="mt-1 text-xs composer-subtitle">{{ t("content.composer.subtitle") }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-9 px-3 rounded-xl text-sm font-medium transition-all composer-action composer-collapse-btn"
                @click="$emit('close')"
              >
                <span class="inline-flex items-center gap-1.5">
                  <span class="i-carbon-chevron-left" />
                  {{ t("content.composer.collapse") }}
                </span>
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm composer-action composer-insert-btn"
                :class="{ 'is-disabled': isInsertDisabled }"
                :disabled="isInsertDisabled"
                @click="handleInsert"
              >
                <span class="inline-flex items-center gap-1.5">
                  <span class="i-carbon-arrow-right" />
                  {{ t("content.composer.insert") }}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div class="flex-1 min-h-0 composer-editor">
          <MilkdownEditor
            v-if="hasMountedEditor"
            v-model="draft"
            :placeholder="t('content.composer.placeholder')"
            @update:stats="handleStatsUpdate"
          />
        </div>

        <footer class="px-6 py-3 flex items-center justify-between text-xs composer-footer">
          <span>{{ t("content.composer.appendHint") }}</span>
          <span>{{ t("content.composer.stats", stats) }}</span>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MilkdownEditor from '@/options/components/Milkdown.vue'

const props = defineProps<{
  visible: boolean
  promptTitle: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert'): void
}>()

const draft = defineModel<string>({ required: true })
const { t } = useI18n()

const stats = ref({
  lines: 1,
  words: 0,
  characters: 0,
})

const isInsertDisabled = computed(() => !draft.value.trim())
const hasMountedEditor = ref(false)

watch(
  () => props.visible,
  (next) => {
    if (next) hasMountedEditor.value = true
  },
  { immediate: true },
)

function handleInsert() {
  if (isInsertDisabled.value) return
  emit('insert')
}

function handleStatsUpdate(nextStats: { lines: number; words: number; characters: number }) {
  stats.value = nextStats
}
</script>

<style>
.z-2147483647 {
  z-index: 2147483647;
}

.composer-overlay {
  z-index: 2147483647;
}

.composer-panel {
  --book-spine-width: clamp(60px, 6.4vw, 74px);
  --book-content-width: min(920px, 82vw);
  --book-gap: 8px;
  width: var(--book-content-width);
  transform: translateX(calc((var(--book-spine-width) + var(--book-gap)) * 0.5));
  transform-origin: left center;
  background:
    linear-gradient(156deg, rgba(255, 255, 255, 0.97), rgba(246, 249, 252, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow:
    0 30px 92px rgba(15, 23, 42, 0.26),
    0 10px 28px rgba(15, 23, 42, 0.12);
  contain: layout paint style;
  will-change: transform, opacity;
}

.composer-panel::before {
  content: "";
  position: absolute;
  left: -12px;
  top: 8px;
  bottom: 8px;
  width: 12px;
  border-radius: 10px 0 0 10px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.04));
}

.composer-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.composer-header {
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  background: linear-gradient(90deg, #ecfeff, #f0f9ff, #ecfdf5);
}

.composer-badge {
  color: rgba(51, 65, 85, 0.8);
}

.composer-title {
  color: #0f172a;
}

.composer-subtitle {
  color: rgba(51, 65, 85, 0.88);
}

.composer-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.35);
  transition:
    transform 200ms ease,
    background 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.composer-action:hover {
  transform: translateY(-1px);
}

.composer-collapse-btn {
  background: rgba(255, 255, 255, 0.85);
  color: #334155;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.composer-editor {
  background: rgba(255, 255, 255, 0.84);
  overflow: hidden;
}

.composer-footer {
  background: rgba(248, 250, 252, 0.9);
  border-top: 1px solid rgba(148, 163, 184, 0.3);
  color: #334155;
}

.composer-insert-btn {
  background-image: linear-gradient(90deg, #0891b2, #059669);
  background-color: #0891b2;
  border-color: transparent;
  color: #fff;
  box-shadow: 0 12px 24px rgba(8, 145, 178, 0.32);
}

.composer-insert-btn span {
  color: inherit !important;
}

.composer-insert-btn.is-disabled {
  background-image: none;
  background-color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.3);
  color: #f8fafc;
  box-shadow: none;
  cursor: not-allowed;
}

.book-page-enter-active,
.book-page-leave-active {
  transition: opacity 300ms ease;
}

.book-page-enter-from,
.book-page-leave-to {
  opacity: 0;
}

.book-page-enter-active .composer-panel,
.book-page-leave-active .composer-panel {
  transition:
    opacity 360ms ease,
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}

.book-page-enter-from .composer-panel,
.book-page-leave-to .composer-panel {
  opacity: 0;
  transform: translateX(calc((var(--book-spine-width) + var(--book-gap)) * 0.5 + 36px)) scale(0.992);
}

:where(.dark, [data-theme='dark']) .composer-panel {
  background: linear-gradient(156deg, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.9));
  border-color: rgba(148, 163, 184, 0.22);
  box-shadow:
    0 40px 100px rgba(2, 6, 23, 0.7),
    0 14px 36px rgba(2, 6, 23, 0.55);
}

:where(.dark, [data-theme='dark']) .composer-panel::before {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.2));
}

:where(.dark, [data-theme='dark']) .composer-panel::after {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

:where(.dark, [data-theme='dark']) .composer-header {
  border-bottom-color: rgba(148, 163, 184, 0.2);
  background: linear-gradient(90deg, rgba(15, 118, 110, 0.18), rgba(14, 116, 144, 0.12), rgba(6, 95, 70, 0.2));
}

:where(.dark, [data-theme='dark']) .composer-badge {
  color: rgba(203, 213, 225, 0.78);
}

:where(.dark, [data-theme='dark']) .composer-title {
  color: rgba(248, 250, 252, 0.96);
}

:where(.dark, [data-theme='dark']) .composer-subtitle {
  color: rgba(203, 213, 225, 0.8);
}

:where(.dark, [data-theme='dark']) .composer-collapse-btn {
  background: rgba(15, 23, 42, 0.58);
  border-color: rgba(148, 163, 184, 0.24);
  color: rgba(226, 232, 240, 0.92);
  box-shadow: none;
}

:where(.dark, [data-theme='dark']) .composer-editor {
  background: rgba(15, 23, 42, 0.65);
}

:where(.dark, [data-theme='dark']) .composer-footer {
  background: rgba(15, 23, 42, 0.72);
  border-top-color: rgba(148, 163, 184, 0.2);
  color: rgba(203, 213, 225, 0.78);
}

:where(.dark, [data-theme='dark']) .composer-insert-btn {
  box-shadow: 0 16px 30px rgba(6, 182, 212, 0.24);
}

:where(.dark, [data-theme='dark']) .composer-editor .milkdown::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.7);
}

:where(.dark, [data-theme='dark']) .composer-editor .milkdown::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.86);
}

.composer-editor .milkdown {
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.composer-editor .milkdown .ProseMirror {
  min-height: 100%;
  height: auto;
  box-sizing: border-box;
}

.composer-editor .milkdown::-webkit-scrollbar {
  width: 8px;
}

.composer-editor .milkdown::-webkit-scrollbar-track {
  background: transparent;
}

.composer-editor .milkdown::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.55);
  border-radius: 9999px;
}

.composer-editor .milkdown::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.72);
}

@media (max-width: 960px) {
  .composer-panel {
    --book-content-width: min(90vw, 760px);
  }
}
</style>
