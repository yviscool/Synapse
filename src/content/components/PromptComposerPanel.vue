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
        <header class="px-8 py-5 flex-shrink-0 bg-white dark:bg-[#09090b] border-b border-neutral-100 dark:border-white/5 z-10">
          <div class="flex items-center justify-between">
            <div class="min-w-0 pr-6">
              <div class="flex items-center gap-2 mb-1.5">
                 <span class="synapse-badge px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                    {{ t("content.composer.badge") }}
                 </span>
              </div>
              <h3 class="synapse-header-title text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">
                {{ promptTitle || t("content.composer.defaultTitle") }}
              </h3>
            </div>
            
            <div class="flex items-center gap-3 flex-shrink-0">
               <button
                type="button"
                class="h-10 px-4 rounded-xl text-sm font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-[#18181b] dark:text-neutral-400 dark:hover:bg-[#27272a] dark:hover:text-neutral-200 transition-all flex items-center gap-2"
                @click="$emit('close')"
              >
                <div class="i-carbon-chevron-left text-lg synapse-force-white" />
                <span class="synapse-force-white">{{ t("content.composer.collapse") }}</span>
              </button>
              
              <!-- 
                Insert Button: "Soulful" Inverted Style
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

        <div class="flex-1 min-h-0 bg-white dark:bg-[#000000] relative editor-container" :class="{ dark: isDark }">
          <MilkdownEditor
            v-if="hasMountedEditor"
            v-model="draft"
            :placeholder="t('content.composer.placeholder')"
            @update:stats="handleStatsUpdate"
            class="h-full"
          />
        </div>

        <footer class="px-8 py-3 bg-white dark:bg-[#09090b] border-t border-neutral-100 dark:border-white/5 text-xs text-neutral-400 dark:text-neutral-500 flex justify-between items-center select-none overflow-hidden">
          <div class="flex gap-2 font-medium">
            <span class="synapse-footer-text">{{ t("content.composer.appendHint") }}</span>
          </div>
          <div class="synapse-footer-badge font-mono bg-neutral-100 dark:bg-[#18181b] px-3 py-1 rounded-full text-[10px] tracking-tight synapse-footer-text flex-shrink-0">
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
.dark .synapse-composer-scope .synapse-header-title { color: #ededed !important; }

.synapse-composer-scope.dark .synapse-badge,
.dark .synapse-composer-scope .synapse-badge { 
  color: #d4d4d4 !important; 
  background: rgba(255, 255, 255, 0.1) !important;
}

.synapse-composer-scope.dark .synapse-force-white,
.dark .synapse-composer-scope .synapse-force-white { color: #a3a3a3 !important; }

.synapse-composer-scope.dark .milkdown .ProseMirror,
.dark .synapse-composer-scope .milkdown .ProseMirror { color: #ededed !important; }

/* Insert Button - High Contrast Inverted */
.synapse-insert-btn.is-enabled { 
  background-color: #171717 !important; 
  color: #ffffff !important; 
  border: 1px solid transparent;
}
.synapse-insert-btn.is-enabled:hover {
  transform: translateY(-1px);
  background-color: #000000 !important;
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3) !important;
}
.synapse-insert-btn.is-enabled:active {
  transform: translateY(0);
}

/* Dark Mode Insert Button (White on Black) */
.synapse-composer-scope.dark .synapse-insert-btn.is-enabled,
.dark .synapse-composer-scope .synapse-insert-btn.is-enabled { 
  background-color: #ededed !important; 
  color: #000000 !important; 
}
.synapse-composer-scope.dark .synapse-insert-btn.is-enabled:hover,
.dark .synapse-composer-scope .synapse-insert-btn.is-enabled:hover {
  background-color: #ffffff !important;
  box-shadow: 0 0 20px -5px rgba(255, 255, 255, 0.3) !important;
}

.synapse-insert-text, .synapse-insert-icon { color: inherit !important; }

.synapse-composer-scope.dark .synapse-footer-text,
.dark .synapse-composer-scope .synapse-footer-text { color: #737373 !important; }
</style>

<style scoped>
.composer-panel {
  background: #ffffff;
  box-shadow: 0 40px 80px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.04);
  --crepe-color-on-background: #404040;
}
:where(.dark, [data-theme='dark']) .composer-panel {
  background: #09090b; 
  box-shadow: 0 40px 80px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1);
  --crepe-color-on-background: #ededed;
}
:deep(.milkdown) { height: 100%; overflow-y: auto; padding: 0 4rem; }
:deep(.milkdown .ProseMirror) { min-height: 100%; outline: none; font-size: 1.15rem; line-height: 1.8; }
:deep(.milkdown .ProseMirror) { padding: 40px; }
:deep(.milkdown-host .milkdown) { background: transparent !important; }
:deep(::-webkit-scrollbar) { width: 6px; }
:deep(::-webkit-scrollbar-track) { background: transparent; }
:deep(::-webkit-scrollbar-thumb) { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
:where(.dark, [data-theme='dark']) :deep(::-webkit-scrollbar-thumb) { background: rgba(255, 255, 255, 0.15); }
:where(.dark, [data-theme='dark']) :deep(::-webkit-scrollbar-thumb):hover { background: rgba(255, 255, 255, 0.25); }
</style>
