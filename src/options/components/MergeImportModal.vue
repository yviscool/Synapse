<template>
  <div v-if="visible" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="$emit('update:visible', false)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" @click.stop>
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold text-gray-900">{{ t('categories.mergeImportModal.title') }}</h2>
        <p class="text-sm text-gray-600 mt-1">{{ t('categories.mergeImportModal.description') }}</p>
      </div>

      <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        <!-- Step 1: File Upload -->
        <div class="p-4 rounded-lg" :class="promptsCount > 0 ? 'bg-green-50 border-green-200 border' : 'bg-gray-50'">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg" :class="promptsCount > 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'">
              1
            </div>
            <h3 class="text-lg font-semibold text-gray-800">{{ t('categories.mergeImportModal.step1Title') }}</h3>
            <div v-if="promptsCount > 0" class="i-carbon-checkmark-outline text-green-600 text-2xl ml-auto"></div>
          </div>
          <div class="pl-11 mt-3">
            <div @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop"
                 :class="['mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md', isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300']">
              <div class="space-y-1 text-center">
                <div class="i-carbon-upload text-4xl mx-auto text-gray-400"></div>
                <div class="flex text-sm text-gray-600">
                  <label for="file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                    <span>{{ t('categories.mergeImportModal.uploadLabel') }}</span>
                    <input id="file-upload" ref="fileInput" type="file" accept=".json" class="sr-only" @change="handleFileChange">
                  </label>
                  <p class="pl-1">{{ t('categories.mergeImportModal.dragDrop') }}</p>
                </div>
                <p class="text-xs text-gray-500">{{ t('categories.mergeImportModal.fileTypeHint') }}</p>
              </div>
            </div>
            <div class="mt-3 flex justify-between items-center">
              <div class="text-sm text-gray-700">
                <span v-if="fileName">{{ t('categories.mergeImportModal.fileSelected', { fileName, count: promptsCount }) }}</span>
                <span v-else>{{ t('categories.mergeImportModal.noFileSelected') }}</span>
              </div>
              <a href="#" @click.prevent="downloadTemplate" class="text-sm text-blue-600 hover:underline">{{ t('categories.mergeImportModal.downloadTemplate') }}</a>
            </div>
          </div>
        </div>

        <!-- Step 2: Category Selection -->
        <div class="p-4 rounded-lg" :class="{'opacity-50': promptsCount === 0}">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg" :class="targetCategoryIds.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'">
              2
            </div>
            <h3 class="text-lg font-semibold text-gray-800">{{ t('categories.mergeImportModal.step2Title') }}</h3>
             <div v-if="targetCategoryIds.length > 0" class="i-carbon-checkmark-outline text-blue-600 text-2xl ml-auto"></div>
          </div>
          <div class="pl-11 mt-3 space-y-2">
            <p class="text-sm text-gray-500">{{ t('categories.mergeImportModal.step2Description') }}</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label v-for="category in availableCategories" :key="category.id" 
                     :class="['flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors', targetCategoryIds.includes(category.id) ? 'bg-blue-100 border-blue-400' : 'bg-white hover:bg-gray-50']">
                <input type="checkbox" :value="category.id" v-model="targetCategoryIds" :disabled="promptsCount === 0"
                       class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <div v-if="category.icon" :class="category.icon"></div>
                <span class="text-sm font-medium text-gray-800">{{ category.name }}</span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Step 3: Tagging -->
        <div class="p-4 rounded-lg" :class="{'opacity-50': promptsCount === 0}">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-gray-300 text-gray-600">
              3
            </div>
            <h3 class="text-lg font-semibold text-gray-800">{{ t('categories.mergeImportModal.step3Title') }}</h3>
          </div>
           <div class="pl-11 mt-3 space-y-2">
            <p class="text-sm text-gray-500">{{ t('categories.mergeImportModal.step3Description') }}</p>
            <div class="w-full px-3 py-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap items-center gap-2" :class="{'opacity-50': promptsCount === 0}">
              <span
                v-for="tag in additionalTags"
                :key="tag"
                class="flex items-center gap-1.5 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium"
              >
                {{ tag }}
                <button @click="removeTag(tag)" :disabled="promptsCount === 0" class="text-blue-600 hover:text-blue-800 -mr-1 rounded-full hover:bg-blue-200">
                  <div class="i-carbon-close text-xs"></div>
                </button>
              </span>
              <input
                v-model="tagInputLocal"
                type="text"
                class="flex-1 bg-transparent outline-none min-w-[120px] h-8"
                :placeholder="t('categories.mergeImportModal.tagInputPlaceholder')"
                :disabled="promptsCount === 0"
                @keydown.enter.prevent="addCurrentTag"
                @keydown.backspace="handleTagBackspace"
              >
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 flex justify-end items-center gap-4 rounded-b-2xl">
        <button @click="$emit('update:visible', false)" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          {{ t('categories.mergeImportModal.cancel') }}
        </button>
        <button @click="executeMerge" :disabled="!canMerge" :title="!canMerge ? t('categories.mergeImportModal.disabledMergeTooltip') : t('categories.mergeImportModal.mergeTooltip')" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isMerging ? t('categories.mergeImportModal.mergingButton') : t('categories.mergeImportModal.mergeButton', { count: promptsCount }) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Category, Prompt } from '@/types/prompt'
import { repository } from '@/stores/repository'
import { useUI } from '@/stores/ui'
import { useModal } from '@/composables/useModal'

const props = defineProps<{
  visible: boolean
  availableCategories: Category[]
  activeCategories: string[]
  activeTags: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'merged'): void
}>()

const { showToast } = useUI()

const isOpen = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})
useModal(isOpen, () => { isOpen.value = false })

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const promptsToImport = ref<Prompt[]>([])
const targetCategoryIds = ref<string[]>([])
const additionalTags = ref<string[]>([])
const tagInputLocal = ref('')
const isMerging = ref(false)
const isDragging = ref(false)

const promptsCount = computed(() => promptsToImport.value.length)
const canMerge = computed(() => promptsCount.value > 0 && targetCategoryIds.value.length > 0 && !isMerging.value)

function resetState() {
  fileName.value = ''
  promptsToImport.value = []
  targetCategoryIds.value = []
  additionalTags.value = []
  tagInputLocal.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

watch(() => props.visible, (newValue) => {
  if (newValue) {
    resetState()

    // Context-aware pre-filling
    if (props.activeCategories.length > 0) {
      targetCategoryIds.value = [...props.activeCategories]
    }
    if (props.activeTags.length > 0) {
      additionalTags.value = [...props.activeTags]
    }
  }
})


function onDragOver() {
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    processFile(file)
  }
}

const { t } = useI18n()

async function processFile(file: File) {
  if (!file.name.endsWith('.json')) {
    showToast(t('categories.mergeImportModal.toast.selectJson'), 'error')
    return
  }

  fileName.value = file.name
  // Do not reset selections, allow user to use the same selections for a new file
  promptsToImport.value = []

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data.prompts || !Array.isArray(data.prompts)) {
      throw new Error(t('categories.mergeImportModal.toast.invalidFormat'))
    }
    promptsToImport.value = data.prompts
    if (promptsCount.value === 0) {
      showToast(t('categories.mergeImportModal.toast.noPromptsInFile'), 'error')
      fileName.value = ''
    }
  } catch (error) {
    showToast(t('categories.mergeImportModal.toast.parseError', { error: (error as Error).message }), 'error')
    fileName.value = ''
  }
}

async function executeMerge() {
  if (!canMerge.value) return

  isMerging.value = true
  try {
    const result = await repository.mergePrompts(promptsToImport.value, targetCategoryIds.value, additionalTags.value)
    if (result.ok && result.data) {
      showToast(t('categories.mergeImportModal.toast.mergeSuccess', { importedCount: result.data.importedCount, skippedCount: result.data.skippedCount }), 'success')
      emit('merged')
      emit('update:visible', false)
    } else {
      throw result.error || new Error(t('categories.mergeImportModal.toast.unknownError'))
    }
  } catch (error) {
    showToast(t('categories.mergeImportModal.toast.mergeFailed', { error: (error as Error).message }), 'error')
  } finally {
    isMerging.value = false
  }
}

function addCurrentTag() {
  const name = tagInputLocal.value.trim()
  if (!name) return
  if (!additionalTags.value.includes(name)) {
    additionalTags.value.push(name)
  }
  tagInputLocal.value = ''
}

function removeTag(tagToRemove: string) {
  additionalTags.value = additionalTags.value.filter(t => t !== tagToRemove)
}

function handleTagBackspace() {
  if (tagInputLocal.value === '' && additionalTags.value.length > 0) {
    additionalTags.value.pop()
  }
}

function downloadTemplate() {
  const template = {
    "version": "2.0.0",
    "exportTime": new Date().toISOString(),
    "prompts": [
      {
        "title": "生成一张小狗的油画",
        "content": "A detailed oil painting of a small, fluffy puppy sitting in a field of wildflowers, impressionist style, warm sunlight.",
        "categoryIds": ["creation"],
        "tagIds": ["midjourney", "image-generation"]
      },
      {
        "title": "撰写一封营销邮件",
        "content": "Write a marketing email for a new productivity app. The email should be friendly, concise, and highlight three key features: AI-powered scheduling, cross-device sync, and focus mode. Include a clear call-to-action button."
      }
    ]
  }
  const dataStr = JSON.stringify(template, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prompts-template.json'
  a.click()
  URL.revokeObjectURL(url)
}


</script>
