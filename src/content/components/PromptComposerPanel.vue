<template>
  <transition name="composer-slide">
    <div
      v-if="visible"
      class="fixed inset-y-0 right-0 z-2147483647 pointer-events-none flex items-center pr-6 py-8 composer-overlay"
    >
      <section
        class="pointer-events-auto h-full w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-md flex flex-col overflow-hidden composer-panel"
      >
        <header class="relative border-b border-slate-200/70 px-5 py-4 bg-gradient-to-r from-cyan-50 via-sky-50 to-emerald-50 composer-header">
          <div class="pointer-events-none absolute -left-8 top-4 h-24 w-24 rounded-full bg-cyan-300/20 blur-xl"></div>
          <div class="pointer-events-none absolute right-6 -bottom-10 h-24 w-24 rounded-full bg-emerald-300/20 blur-xl"></div>
          <div class="relative flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">{{ t("content.composer.badge") }}</p>
              <h3 class="mt-1 truncate text-lg font-semibold text-slate-900">{{ promptTitle || t("content.composer.defaultTitle") }}</h3>
              <p class="mt-1 text-xs text-slate-600">{{ t("content.composer.subtitle") }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-9 px-3 rounded-lg border border-slate-200 bg-white/80 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 composer-collapse-btn"
                :style="collapseButtonInlineStyle"
                @click="$emit('close')"
              >
                <span class="inline-flex items-center gap-1.5">
                  <span class="i-carbon-chevron-right"></span>
                  {{ t("content.composer.collapse") }}
                </span>
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-lg text-sm font-semibold text-white transition-all shadow-sm composer-insert-btn"
                :class="isInsertDisabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:brightness-110'"
                :style="insertButtonInlineStyle"
                :disabled="isInsertDisabled"
                @click="handleInsert"
              >
                <span class="inline-flex items-center gap-1.5">
                  <span class="i-carbon-arrow-right"></span>
                  {{ t("content.composer.insert") }}
                </span>
              </button>
            </div>
          </div>
        </header>

        <div class="flex-1 min-h-0 bg-white">
          <MilkdownEditor
            v-model="draft"
            :placeholder="t('content.composer.placeholder')"
            @update:stats="handleStatsUpdate"
          />
        </div>

        <footer class="border-t border-slate-200/70 bg-slate-50 px-5 py-3 flex items-center justify-between text-xs text-slate-600 composer-footer">
          <span>{{ t("content.composer.appendHint") }}</span>
          <span>{{ t("content.composer.stats", stats) }}</span>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MilkdownEditor from '@/options/components/Milkdown.vue'

defineProps<{
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
const collapseButtonInlineStyle = {
  color: '#334155',
  borderColor: 'rgba(148, 163, 184, 0.35)',
  background: 'rgba(255, 255, 255, 0.82)',
}
const insertButtonInlineStyle = computed(() => (
  isInsertDisabled.value
    ? {
        color: '#f8fafc',
        background: '#cbd5e1',
      }
    : {
        color: '#ffffff',
        background: 'linear-gradient(90deg, #0891b2, #059669)',
      }
))

function handleInsert() {
  if (isInsertDisabled.value) return
  emit('insert')
}

function handleStatsUpdate(nextStats: { lines: number; words: number; characters: number }) {
  stats.value = nextStats
}
</script>

<style scoped>
.z-2147483647 {
  z-index: 2147483647;
}

.composer-overlay {
  z-index: 2147483647;
}

.composer-panel {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 30px 100px rgba(15, 23, 42, 0.28);
}

.composer-header {
  background: linear-gradient(90deg, #ecfeff, #f0f9ff, #ecfdf5);
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  color: #0f172a;
}

.composer-header h3,
.composer-header p {
  color: #0f172a;
}

.composer-collapse-btn {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #334155;
}

.composer-footer {
  background: #f8fafc;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
  color: #334155;
}

.composer-insert-btn {
  background-image: linear-gradient(90deg, #0891b2, #059669);
  background-color: #0891b2;
  color: #fff;
}

.composer-insert-btn span {
  color: inherit !important;
}

.composer-insert-btn:disabled {
  background-image: none;
  background-color: #cbd5e1;
  color: #f8fafc;
}

.composer-slide-enter-active,
.composer-slide-leave-active {
  transition: opacity 280ms ease, transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.composer-slide-enter-from,
.composer-slide-leave-to {
  opacity: 0;
  transform: translateX(36px) scale(0.985);
}
</style>
