<template>
  <div v-if="visible" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="$emit('update:visible', false)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" @click.stop>
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold text-gray-900">导入并合并 Prompts</h2>
        <p class="text-sm text-gray-600 mt-1">将文件中的 Prompts 批量添加到您的收藏中。</p>
      </div>

      <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        <!-- Step 1: File Upload -->
        <div class="p-4 rounded-lg" :class="promptsCount > 0 ? 'bg-green-50 border-green-200 border' : 'bg-gray-50'">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg" :class="promptsCount > 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'">
              1
            </div>
            <h3 class="text-lg font-semibold text-gray-800">第一步：选择文件</h3>
            <div v-if="promptsCount > 0" class="i-carbon-checkmark-outline text-green-600 text-2xl ml-auto"></div>
          </div>
          <div class="pl-11 mt-3">
            <div @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop"
                 :class="['mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md', isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300']">
              <div class="space-y-1 text-center">
                <div class="i-carbon-upload text-4xl mx-auto text-gray-400"></div>
                <div class="flex text-sm text-gray-600">
                  <label for="file-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                    <span>上传文件</span>
                    <input id="file-upload" ref="fileInput" type="file" accept=".json" class="sr-only" @change="handleFileChange">
                  </label>
                  <p class="pl-1">或拖拽文件到此处</p>
                </div>
                <p class="text-xs text-gray-500">仅支持 .json 文件</p>
              </div>
            </div>
            <div class="mt-3 flex justify-between items-center">
              <div class="text-sm text-gray-700">
                <span v-if="fileName">已选择: <span class="font-semibold">{{ fileName }}</span> (包含 {{ promptsCount }} 条 prompts)</span>
                <span v-else>尚未选择文件。</span>
              </div>
              <a href="#" @click.prevent="downloadTemplate" class="text-sm text-blue-600 hover:underline">需要范本？下载模板</a>
            </div>
          </div>
        </div>

        <!-- Step 2: Category Selection -->
        <div class="p-4 rounded-lg" :class="{'opacity-50': promptsCount === 0}">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg" :class="targetCategoryIds.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'">
              2
            </div>
            <h3 class="text-lg font-semibold text-gray-800">第二步：关联分类 (可多选)</h3>
             <div v-if="targetCategoryIds.length > 0" class="i-carbon-checkmark-outline text-blue-600 text-2xl ml-auto"></div>
          </div>
          <div class="pl-11 mt-3 space-y-2">
            <p class="text-sm text-gray-500">为所有导入的 Prompt 指定至少一个分类。</p>
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
            <h3 class="text-lg font-semibold text-gray-800">第三步：添加额外标签 (可选)</h3>
          </div>
           <div class="pl-11 mt-3 space-y-2">
            <p class="text-sm text-gray-500">为这次导入的所有 Prompt 添加统一的标签，便于追踪。</p>
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
                placeholder="添加标签后回车..."
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
          取消
        </button>
        <button @click="executeMerge" :disabled="!canMerge" :title="!canMerge ? '请先选择文件并至少关联一个分类' : '开始合并'" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isMerging ? '正在合并...' : `合并 ${promptsCount} 条 Prompts` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Category, Prompt } from '@/types/prompt'
import { mergePrompts } from '@/stores/db'
import { useUI } from '@/stores/ui'

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

async function processFile(file: File) {
  if (!file.name.endsWith('.json')) {
    showToast('请选择一个 .json 文件', 'error')
    return
  }

  fileName.value = file.name
  // Do not reset selections, allow user to use the same selections for a new file
  promptsToImport.value = []

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (!data.prompts || !Array.isArray(data.prompts)) {
      throw new Error('无效的文件格式，未找到 "prompts" 数组。')
    }
    promptsToImport.value = data.prompts
    if (promptsCount.value === 0) {
      showToast('文件中没有找到可导入的 Prompt。', 'error')
      fileName.value = ''
    }
  } catch (error) {
    showToast(`文件解析失败: ${(error as Error).message}`, 'error')
    fileName.value = ''
  }
}

async function executeMerge() {
  if (!canMerge.value) return

  isMerging.value = true
  try {
    const result = await mergePrompts(promptsToImport.value, targetCategoryIds.value, additionalTags.value)
    showToast(`合并完成！新增 ${result.importedCount} 条，跳过 ${result.skippedCount} 条重复项。`, 'success')
    emit('merged')
    emit('update:visible', false)
  } catch (error) {
    showToast(`合并失败: ${(error as Error).message}`, 'error')
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
