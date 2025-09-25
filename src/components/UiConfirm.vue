<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="finalCloseOnClickOutside ? onCancel() : null"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
      <div class="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div class="text-xl" :class="finalType === 'danger' ? 'text-red-600' : 'text-blue-600'">
          <div class="i-carbon-warning-filled"></div>
        </div>
        <h3 class="text-lg font-semibold text-gray-900">{{ finalTitle }}</h3>
      </div>

      <div class="p-6 text-gray-700 whitespace-pre-line">
        {{ message }}
      </div>

      <div class="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
        <button
          @click="onCancel"
          class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        >
          <div class="i-carbon-close"></div>
          {{ finalCancelText }}
        </button>
        <button
          @click="onConfirm"
          class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200"
          :class="finalType === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg'"
        >
          <div class="i-carbon-checkmark"></div>
          {{ finalConfirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useModal } from '@/composables/useModal'
import { computed } from 'vue'
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

const finalTitle = computed(() => props.title ?? t('common.confirm'))
const finalConfirmText = computed(() => props.confirmText ?? t('common.confirm'))
const finalCancelText = computed(() => props.cancelText ?? t('common.cancel'))
const finalType = computed(() => props.type ?? 'default')
const finalCloseOnClickOutside = computed(() => props.closeOnClickOutside ?? false)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
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

useModal(isOpen, onCancel)
</script>