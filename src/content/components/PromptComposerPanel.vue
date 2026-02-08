<template>
  <transition
    enter-active-class="transition duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
    enter-from-class="opacity-0 translate-x-8 scale-95"
    enter-to-class="opacity-100 translate-x-0 scale-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="opacity-100 translate-x-0 scale-100"
    leave-to-class="opacity-0 translate-x-8 scale-95"
  >
    <div
      v-show="visible"
      class="fixed inset-0 z-[2147483647] pointer-events-none flex items-center justify-center font-sans synapse-composer-scope"
      :class="{ dark: isDark }"
    >
      <section
        class="pointer-events-auto relative flex flex-col w-[min(1170px,90vw)] h-[min(800px,85vh)] overflow-hidden rounded-2xl shadow-3xl composer-panel ml-4"
      >
        <header class="px-8 py-5 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 z-10">
          <div class="flex items-center justify-between">
            <div class="min-w-0 pr-6">
              <div class="flex items-center gap-2 mb-1.5">
                 <span class="synapse-badge px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400 border border-cyan-100/50 dark:border-transparent">
                    {{ t("content.composer.badge") }}
                 </span>
              </div>
              <h3 class="synapse-header-title text-xl font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                {{ promptTitle || t("content.composer.defaultTitle") }}
              </h3>
            </div>
            
            <div class="flex items-center gap-3 flex-shrink-0">
               <button
                type="button"
                class="h-10 px-4 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                @click="$emit('close')"
              >
                <div class="i-carbon-chevron-left text-lg synapse-force-white" />
                <span class="synapse-force-white">{{ t("content.composer.collapse") }}</span>
              </button>
              
              <!-- 
                CRITICAL CHANGE: 按钮永远保持 is-enabled 状态
                无论是否有内容，都允许用户点击
              -->
              <button
                type="button"
                class="h-10 px-6 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 synapse-insert-btn is-enabled"
                @click="$emit('insert')"
              >
                <span class="synapse-insert-text">{{ t("content.composer.insert") }}</span>
                <div class="i-carbon-arrow-right text-lg synapse-insert-icon" />
              </button>
            </div>
          </div>
        </header>

        <div class="flex-1 min-h-0 bg-white dark:bg-slate-950 relative editor-container" :class="{ dark: isDark }">
          <MilkdownEditor
            v-if="hasMountedEditor"
            v-model="draft"
            :placeholder="t('content.composer.placeholder')"
            @update:stats="handleStatsUpdate"
            class="h-full"
          />
        </div>

        <footer class="px-8 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex justify-between items-center select-none overflow-hidden">
          <div class="flex gap-2 font-medium">
            <span class="synapse-footer-text">{{ t("content.composer.appendHint") }}</span>
          </div>
          <div class="synapse-footer-badge font-mono bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1 rounded-full text-[10px] tracking-tight synapse-footer-text flex-shrink-0">
            {{ t("content.composer.stats", stats) }}
          </div>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MilkdownEditor from '@/options/components/Milkdown.vue'

const props = defineProps<{
  visible: boolean
  promptTitle: string
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert'): void
}>()

const draft = defineModel<string>({ required: true })
const { t } = useI18n()

const stats = ref({ lines: 1, words: 0, characters: 0 })
const hasMountedEditor = ref(false)

watch(() => props.visible, (v) => { if (v) hasMountedEditor.value = true }, { immediate: true })

function handleStatsUpdate(nextStats: any) {
  stats.value = nextStats
}
</script>

<style>
/* Global recovery for dark mode elements */
.synapse-composer-scope.dark .synapse-header-title,
.dark .synapse-composer-scope .synapse-header-title { color: #ffffff !important; }

.synapse-composer-scope.dark .synapse-force-white,
.dark .synapse-composer-scope .synapse-force-white { color: #cbd5e1 !important; }

.synapse-composer-scope.dark .milkdown .ProseMirror,
.dark .synapse-composer-scope .milkdown .ProseMirror { color: #f1f5f9 !important; }

/* Insert Button - Always Active Design */
.synapse-insert-btn.is-enabled { 
  background-color: #0f172a !important; 
  color: #ffffff !important; 
}
.synapse-insert-btn.is-enabled:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.2) !important;
}
.synapse-insert-btn.is-enabled:active {
  transform: translateY(0);
}

.synapse-composer-scope.dark .synapse-insert-btn.is-enabled,
.dark .synapse-composer-scope .synapse-insert-btn.is-enabled { 
  background-color: #ffffff !important; 
  color: #0f172a !important; 
}

.synapse-insert-text, .synapse-insert-icon { color: inherit !important; }

.synapse-composer-scope.dark .synapse-footer-text,
.dark .synapse-composer-scope .synapse-footer-text { color: #94a3b8 !important; }
</style>

<style scoped>
.composer-panel {
  background: #ffffff;
  box-shadow: 0 40px 80px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.04);
  --crepe-color-on-background: #475569;
}
:where(.dark, [data-theme='dark']) .composer-panel {
  background: #0f172a; 
  box-shadow: 0 40px 80px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
  --crepe-color-on-background: #f1f5f9;
}
:deep(.milkdown) { height: 100%; overflow-y: auto; padding: 3rem 4rem; }
:deep(.milkdown .ProseMirror) { min-height: 100%; outline: none; font-size: 1.15rem; line-height: 1.8; }
:deep(.milkdown-host .milkdown) { background: transparent !important; }
:deep(::-webkit-scrollbar) { width: 6px; }
:deep(::-webkit-scrollbar-track) { background: transparent; }
:deep(::-webkit-scrollbar-thumb) { background: rgba(148, 163, 184, 0.25); border-radius: 10px; }
:where(.dark, [data-theme='dark']) :deep(::-webkit-scrollbar-thumb) { background: rgba(148, 163, 184, 0.4); }
</style>
