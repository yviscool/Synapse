<template>
  <div class="settings-container">
    <!-- 导入导出功能 -->
    <div class="import-export-section mb-6 p-4 border rounded-lg bg-gray-50">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">数据管理</h3>
      <div class="flex gap-4 flex-wrap">
        <button
          @click="exportData"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          导出配置
        </button>
        <div class="relative">
          <input
            ref="importInput"
            type="file"
            accept=".json"
            @change="importData"
            class="hidden"
          >
          <button
            @click="importInput?.click()"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            导入配置
          </button>
        </div>
        <button
          @click="resetSettings"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          重置设置
        </button>
      </div>
    </div>

    <!-- 基础设置 -->
    <div class="basic-settings mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">基础设置</h3>
      
      <div class="setting-item mb-4">
        <label class="flex items-center gap-2">
          <input
            v-model="settings.autoSave"
            type="checkbox"
            class="rounded"
          >
          <span>自动保存</span>
        </label>
        <p class="text-sm text-gray-600 mt-1">编辑时自动保存更改</p>
      </div>

      <div class="setting-item mb-4">
        <label class="flex items-center gap-2">
          <input
            v-model="settings.darkMode"
            type="checkbox"
            class="rounded"
          >
          <span>深色模式</span>
        </label>
        <p class="text-sm text-gray-600 mt-1">使用深色主题</p>
      </div>

      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">默认语言</span>
        </label>
        <select
          v-model="settings.defaultLanguage"
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
          <option value="ja-JP">日本語</option>
        </select>
      </div>

      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">字体大小</span>
        </label>
        <input
          v-model.number="settings.fontSize"
          type="range"
          min="12"
          max="20"
          class="w-full"
        >
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>12px</span>
          <span>{{ settings.fontSize }}px</span>
          <span>20px</span>
        </div>
      </div>
    </div>

    <!-- 编辑器设置 -->
    <div class="editor-settings mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">编辑器设置</h3>
      
      <div class="setting-item mb-4">
        <label class="flex items-center gap-2">
          <input
            v-model="settings.wordWrap"
            type="checkbox"
            class="rounded"
          >
          <span>自动换行</span>
        </label>
      </div>

      <div class="setting-item mb-4">
        <label class="flex items-center gap-2">
          <input
            v-model="settings.lineNumbers"
            type="checkbox"
            class="rounded"
          >
          <span>显示行号</span>
        </label>
      </div>

      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">编辑器主题</span>
        </label>
        <select
          v-model="settings.editorTheme"
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="default">默认</option>
          <option value="dark">深色</option>
          <option value="monokai">Monokai</option>
          <option value="github">GitHub</option>
        </select>
      </div>

      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">缩进大小</span>
        </label>
        <select
          v-model.number="settings.indentSize"
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
          <option :value="8">8 空格</option>
        </select>
      </div>
    </div>

    <!-- 快捷键设置 -->
    <div class="shortcuts-settings mb-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">快捷键设置</h3>
      
      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">保存快捷键</span>
        </label>
        <input
          v-model="settings.shortcuts.save"
          type="text"
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Ctrl+S"
        >
      </div>

      <div class="setting-item mb-4">
        <label class="block mb-2">
          <span class="text-sm font-medium">搜索快捷键</span>
        </label>
        <input
          v-model="settings.shortcuts.search"
          type="text"
          class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Ctrl+F"
        >
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="save-section pt-4 border-t">
      <button
        @click="saveSettings"
        class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        :disabled="saving"
      >
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useUI } from '@/stores/ui'
import { db } from '@/stores/db'

const { showToast, askConfirm } = useUI()

// 设置数据结构
const settings = reactive({
  autoSave: true,
  darkMode: false,
  defaultLanguage: 'zh-CN',
  fontSize: 14,
  wordWrap: true,
  lineNumbers: true,
  editorTheme: 'default',
  indentSize: 2,
  shortcuts: {
    save: 'Ctrl+S',
    search: 'Ctrl+F'
  }
})

const saving = ref(false)
const importInput = ref<HTMLInputElement>()

// 加载设置
const loadSettings = async () => {
  try {
    const result = await chrome.storage.sync.get('appSettings')
    if (result.appSettings) {
      Object.assign(settings, result.appSettings)
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = async () => {
  saving.value = true
  try {
    await chrome.storage.sync.set({ appSettings: settings })
    showToast('设置已保存', 'success')
  } catch (error) {
    console.error('保存设置失败:', error)
  } finally {
    saving.value = false
  }
}

// 导出配置
const exportData = async () => {
  try {
    const prompts = await db.prompts.toArray();
    const prompt_versions = await db.prompt_versions.toArray();
    const categories = await db.categories.toArray();
    const tags = await db.tags.toArray();
    const appSettings = (await chrome.storage.sync.get('appSettings')).appSettings;

    const exportObject = {
      prompts,
      prompt_versions,
      categories,
      tags,
      settings: appSettings,
      exportTime: new Date().toISOString(),
      version: '1.1.0' 
    };

    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `apm-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据导出成功', 'success');
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast('导出失败，请重试', 'error');
  }
}

// 导入配置
const importData = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const importedData = JSON.parse(text)
    
    if (!importedData.prompts && !importedData.settings) {
      throw new Error('无效的备份文件格式')
    }

    const confirmed = await askConfirm('导入数据将覆盖现有所有数据和设置，此操作不可撤销。是否继续？', { type: 'danger' })
    if (!confirmed) return

    await db.transaction('rw', db.prompts, db.prompt_versions, db.categories, db.tags, async () => {
      if (importedData.prompts) {
        await db.prompts.clear();
        await db.prompts.bulkPut(importedData.prompts);
      }
      if (importedData.prompt_versions) {
        await db.prompt_versions.clear();
        await db.prompt_versions.bulkPut(importedData.prompt_versions);
      }
      if (importedData.categories) {
        await db.categories.clear();
        await db.categories.bulkPut(importedData.categories);
      }
      if (importedData.tags) {
        await db.tags.clear();
        await db.tags.bulkPut(importedData.tags);
      }
    });

    if (importedData.settings) {
      await chrome.storage.sync.set({ appSettings: importedData.settings });
      Object.assign(settings, importedData.settings);
    }

    showToast('数据导入成功！页面将刷新。', 'success')
    
    setTimeout(() => {
      window.location.reload()
    }, 1500)

  } catch (error) {
    console.error('导入数据失败:', error)
    showToast(`导入失败: ${(error as Error).message}`, 'error')
  }
  
  if (importInput.value) {
    importInput.value.value = ''
  }
}

// 重置设置
const resetSettings = async () => {
  const confirmed = await askConfirm('确定要重置所有设置吗？此操作不可撤销。', { type: 'danger' })
  if (!confirmed) return

  try {
    // 重置为默认值
    Object.assign(settings, {
      autoSave: true,
      darkMode: false,
      defaultLanguage: 'zh-CN',
      fontSize: 14,
      wordWrap: true,
      lineNumbers: true,
      editorTheme: 'default',
      indentSize: 2,
      shortcuts: {
        save: 'Ctrl+S',
        search: 'Ctrl+F'
      }
    })
    
    await saveSettings()
    showToast('设置已重置', 'success')
  } catch (error) {
    console.error('重置设置失败:', error)
    showToast('重置失败，请重试', 'error')
  }
}

// 监听设置变化，自动保存
watch(settings, () => {
  if (settings.autoSave) {
    saveSettings()
  }
}, { deep: true })

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})

// 暴露给父组件的方法
defineExpose({
  saveSettings,
  loadSettings,
  exportData,
  importData,
  resetSettings
})
</script>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.setting-item {
  padding: 12px 0;
}

.setting-item label {
  cursor: pointer;
}

.import-export-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.save-section {
  background: #f9fafb;
  margin: 20px -20px -20px -20px;
  padding: 20px;
}

input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

input[type="range"] {
  accent-color: #3b82f6;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

select, input[type="text"] {
  transition: border-color 0.2s, box-shadow 0.2s;
}

select:focus, input[type="text"]:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>