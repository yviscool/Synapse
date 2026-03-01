<template>
  <transition name="synapse-confirm">
    <div
      v-if="modelValue"
      class="synapse-confirm-overlay fixed inset-0 z-[2147483646] flex items-center justify-center p-4"
      @click.self="handleBackdropClick"
    >
      <section
        class="synapse-confirm-shell"
        :class="finalType === 'danger' ? 'is-danger' : 'is-default'"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <header class="synapse-confirm-header">
          <div class="synapse-confirm-icon">
            <div v-if="finalType === 'danger'" class="i-carbon-warning-filled"></div>
            <div v-else class="i-carbon-help-filled"></div>
          </div>
          <h3 :id="titleId" class="synapse-confirm-title">{{ finalTitle }}</h3>
          <button
            type="button"
            class="synapse-confirm-close"
            :aria-label="finalCancelText"
            @click="onCancel"
          >
            <div class="i-carbon-close"></div>
          </button>
        </header>

        <div class="synapse-confirm-body">
          <p class="synapse-confirm-message">{{ message }}</p>
        </div>

        <footer class="synapse-confirm-actions">
          <button
            ref="cancelButtonRef"
            type="button"
            class="synapse-confirm-btn is-cancel"
            @click="onCancel"
          >
            {{ finalCancelText }}
          </button>
          <button
            ref="confirmButtonRef"
            type="button"
            class="synapse-confirm-btn is-confirm"
            @click="onConfirm"
          >
            {{ finalConfirmText }}
          </button>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'default' | 'danger'
  closeOnClickOutside?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const finalTitle = computed(() => props.title ?? t('common.confirm'))
const finalConfirmText = computed(() => props.confirmText ?? t('common.confirm'))
const finalCancelText = computed(() => props.cancelText ?? t('common.cancel'))
const finalType = computed(() => props.type ?? 'default')
const finalCloseOnClickOutside = computed(() => props.closeOnClickOutside ?? false)

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const titleId = `synapse-confirm-title-${Math.random().toString(36).slice(2, 10)}`
const cancelButtonRef = ref<HTMLButtonElement | null>(null)
const confirmButtonRef = ref<HTMLButtonElement | null>(null)

watch(() => props.modelValue, (open) => {
  if (!open) return
  nextTick(() => {
    if (finalType.value === 'danger') {
      cancelButtonRef.value?.focus()
      return
    }
    confirmButtonRef.value?.focus()
  })
})

function close() {
  isOpen.value = false
}

function onConfirm() {
  emit('confirm')
  close()
}

function onCancel() {
  emit('cancel')
  close()
}

function handleBackdropClick() {
  if (finalCloseOnClickOutside.value) {
    onCancel()
  }
}

useModal(isOpen, onCancel)
</script>

<style scoped>
.synapse-confirm-overlay {
  background: rgba(2, 6, 23, 0.52);
  backdrop-filter: blur(8px) saturate(120%);
}

.synapse-confirm-shell {
  --confirm-rgb: 37 99 235;
  --confirm-strong: #2563eb;
  --confirm-strong-hover: #1d4ed8;
  --confirm-soft: rgba(37, 99, 235, 0.14);
  --confirm-shadow: rgba(37, 99, 235, 0.42);
  width: min(92vw, 420px);
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.95));
  box-shadow:
    0 30px 70px -30px rgba(15, 23, 42, 0.56),
    0 8px 20px -12px rgba(15, 23, 42, 0.12);
  position: relative;
  overflow: hidden;
}

.synapse-confirm-shell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--confirm-rgb), 0.15) 0%, rgba(var(--confirm-rgb), 0.95) 50%, rgba(var(--confirm-rgb), 0.15) 100%);
}

.synapse-confirm-shell.is-danger {
  --confirm-rgb: 225 29 72;
  --confirm-strong: #e11d48;
  --confirm-strong-hover: #be123c;
  --confirm-soft: rgba(225, 29, 72, 0.14);
  --confirm-shadow: rgba(225, 29, 72, 0.42);
}

.synapse-confirm-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
}

.synapse-confirm-icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: rgb(var(--confirm-rgb));
  background: var(--confirm-soft);
  box-shadow: inset 0 0 0 1px rgba(var(--confirm-rgb), 0.22);
}

.synapse-confirm-title {
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.synapse-confirm-close {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 0;
  display: grid;
  place-items: center;
  color: rgba(100, 116, 139, 0.85);
  background: transparent;
  transition: background-color 160ms ease, color 160ms ease, transform 120ms ease;
}

.synapse-confirm-close:hover {
  color: #0f172a;
  background: rgba(148, 163, 184, 0.2);
}

.synapse-confirm-close:active {
  transform: scale(0.92);
}

.synapse-confirm-body {
  padding: 2px 18px 20px;
}

.synapse-confirm-message {
  margin: 0;
  white-space: pre-line;
  color: #334155;
  font-size: 14px;
  line-height: 1.62;
}

.synapse-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 18px 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(248, 250, 252, 0.74);
}

.synapse-confirm-btn {
  min-height: 38px;
  border-radius: 11px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: transform 140ms ease, background-color 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 180ms ease;
}

.synapse-confirm-btn:focus-visible,
.synapse-confirm-close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--confirm-rgb), 0.35);
}

.synapse-confirm-btn.is-cancel {
  color: #334155;
  border-color: rgba(148, 163, 184, 0.42);
  background: rgba(255, 255, 255, 0.84);
}

.synapse-confirm-btn.is-cancel:hover {
  background: rgba(241, 245, 249, 0.95);
}

.synapse-confirm-btn.is-confirm {
  color: #ffffff;
  background: linear-gradient(135deg, var(--confirm-strong) 0%, var(--confirm-strong-hover) 100%);
  box-shadow: 0 12px 24px -16px var(--confirm-shadow);
}

.synapse-confirm-btn.is-confirm:hover {
  transform: translateY(-1px);
}

.synapse-confirm-btn:active {
  transform: translateY(0);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-overlay {
  background: rgba(2, 6, 23, 0.7);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-shell {
  border-color: rgba(148, 163, 184, 0.25);
  background: linear-gradient(160deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.94));
  box-shadow:
    0 34px 72px -30px rgba(0, 0, 0, 0.78),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-title {
  color: #f8fafc;
}

:where(.dark, [data-theme='dark']) .synapse-confirm-message {
  color: rgba(226, 232, 240, 0.9);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-close {
  color: rgba(148, 163, 184, 0.86);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-close:hover {
  color: rgba(248, 250, 252, 0.95);
  background: rgba(148, 163, 184, 0.24);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-actions {
  border-top-color: rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.58);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-btn.is-cancel {
  color: rgba(226, 232, 240, 0.95);
  border-color: rgba(148, 163, 184, 0.3);
  background: rgba(30, 41, 59, 0.74);
}

:where(.dark, [data-theme='dark']) .synapse-confirm-btn.is-cancel:hover {
  background: rgba(51, 65, 85, 0.8);
}

.synapse-confirm-enter-active,
.synapse-confirm-leave-active {
  transition: opacity 220ms ease;
}

.synapse-confirm-enter-active .synapse-confirm-shell,
.synapse-confirm-leave-active .synapse-confirm-shell {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}

.synapse-confirm-enter-from,
.synapse-confirm-leave-to {
  opacity: 0;
}

.synapse-confirm-enter-from .synapse-confirm-shell,
.synapse-confirm-leave-to .synapse-confirm-shell {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

@media (max-width: 420px) {
  .synapse-confirm-actions {
    grid-template-columns: 1fr;
  }
}

:deep([class^="i-"]) {
  display: block;
  line-height: 1;
  font-size: 18px;
}
</style>
