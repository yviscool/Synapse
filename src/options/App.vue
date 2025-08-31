<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <!-- 现代化头部 -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div class="i-carbon-ai-results text-2xl text-blue-600"></div>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Synapse</h1>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">{{ prompts.length }} 个 Prompts</span>
            <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">{{ categories.length }} 个分类</span>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button @click="showSettings = true" class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <div class="i-carbon-settings"></div>
            <span>设置</span>
          </button>
          <button @click="showCategoryManager = true" class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300">
            <div class="i-carbon-folder"></div>
            <span>分类管理</span>
          </button>
          <button @click="createNewPrompt" class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105">
            <div class="i-carbon-add"></div>
            <span>新建 Prompt</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 优化的搜索和过滤区域 -->
      <div class="mb-8 space-y-6">
        <div class="flex justify-center">
          <div class="relative w-full max-w-2xl">
            <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg i-carbon-search z-45"></div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索 Prompts 标题或内容..."
              class="w-full pl-12 pr-12 py-4 text-lg border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            >
            <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <div class="i-carbon-close"></div>
            </button>
          </div>
        </div>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-6 flex-wrap">
            <!-- Category Filters -->
            <div class="flex items-center justify-start gap-2 flex-wrap">
              <button
                @click="toggleCategory('')"
                :class="['flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors', selectedCategories.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 hover:bg-gray-50']"
              >
                <div class="i-ph-books"></div>
                <span>全部分类</span>
              </button>
              <button
                v-for="category in availableCategories"
                :key="category.id"
                @click="toggleCategory(category.id)"
                :class="['flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors', selectedCategories.includes(category.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 hover:bg-gray-50']"
              >
                <div v-if="category.icon" :class="[category.icon]"></div>
                <span>{{ category.name }}</span>
              </button>
            </div>

            <!-- Sort and Favorite Filters -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-3">
                <label class="text-sm font-medium text-gray-600 whitespace-nowrap">排序:</label>
                <select v-model="sortBy" class="px-4 py-2 h-10 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="updatedAt">最近更新</option>
                  <option value="createdAt">创建时间</option>
                  <option value="title">标题排序</option>
                </select>
              </div>
              <button 
                @click="showFavoriteOnly = !showFavoriteOnly" 
                :class="['flex items-center gap-2 px-4 py-2 h-10 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors', { 'bg-blue-100 border-blue-300 text-blue-700': showFavoriteOnly }]"
              >
                <div class="i-carbon-favorite"></div>
                <span>仅收藏</span>
              </button>
            </div>
          </div>

          <!-- Tag Filters -->
          <div v-if="selectedCategories.length > 0 && availableTags.length > 0" class="flex items-center justify-center gap-2 flex-wrap border-t border-gray-200 pt-4">
            <button
              @click="toggleTag('')"
              :class="['px-3 py-1 text-sm rounded-md transition-colors', selectedTags.length === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
            >
              全部
            </button>
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              @click="toggleTag(tag.id)"
              :class="['px-3 py-1 text-sm rounded-md transition-colors', selectedTags.includes(tag.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 美化的 Prompt 网格 -->
      <div class="min-h-96">
        <div v-if="filteredPrompts.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-6">
            <div class="i-carbon-document-blank text-6xl text-gray-300"></div>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">暂无 Prompts</h3>
          <p class="text-gray-600 mb-6 max-w-md">
            {{ searchQuery ? '没有找到匹配的 Prompts' : '开始创建你的第一个 AI Prompt 吧！' }}
          </p>
          <button v-if="!searchQuery" @click="createNewPrompt" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <div class="i-carbon-add"></div>
            创建 Prompt
          </button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="prompt in filteredPrompts"
            :key="prompt.id"
            class="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-lg transition-transform duration-200 hover:-translate-y-1"
            @dblclick="editPrompt(prompt)"
            title="双击编辑"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">{{ prompt.title }}</h3>
                <div class="flex items-center gap-3 text-sm text-gray-500">
                  <span class="card-date">{{ formatDate(prompt.updatedAt) }}</span>

                </div>
              </div>
              
              <div class="flex items-center gap-1 relative">
                <button 
                  @click.stop="toggleFavorite(prompt)" 
                  @dblclick.stop
                  :class="['p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors', { 'text-yellow-500 hover:text-yellow-600': prompt.favorite }]"
                  :title="prompt.favorite ? '取消收藏' : '收藏'"
                >
                  <div :class="prompt.favorite ? 'i-carbon-favorite-filled' : 'i-carbon-favorite'"></div>
                </button>
                <button
                  @click.stop="menuOpenId = menuOpenId === prompt.id ? null : prompt.id"
                  @dblclick.stop
                  class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="更多"
                >
                  <div class="i-carbon-overflow-menu-horizontal"></div>
                </button>
                <div
                  v-if="menuOpenId === prompt.id"
                  class="absolute right-0 top-10 z-10 w-28 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                >
                  <button
                    @click.stop="editPrompt(prompt); menuOpenId = null"
                    class="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <div class="i-carbon-edit"></div>
                    <span>编辑</span>
                  </button>
                  <button
                    @click.stop="deletePrompt(prompt.id); menuOpenId = null"
                    class="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    <div class="i-carbon-trash-can"></div>
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <p class="text-gray-600 leading-relaxed line-clamp-3" @dblclick.stop>{{ getPreview(prompt.content) }}</p>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-wrap">
                <span 
                  v-for="categoryId in prompt.categoryIds" 
                  :key="categoryId" 
                  class="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                >
                  {{ getCategoryName(categoryId) }}
                </span>
                <span 
                  v-for="tagId in prompt.tagIds" 
                  :key="tagId" 
                  class="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-100 text-green-800"
                >
                  {{ getTagNames([tagId])[0] }}
                </span>
              </div>
              <button
                @click.stop="copyPrompt(prompt)"
                @dblclick.stop
                :class="['flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors', copiedId === prompt.id ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700']"
                title="复制内容"
              >
                <div :class="copiedId === prompt.id ? 'i-carbon-checkmark' : 'i-carbon-copy'"></div>
                <span>{{ copiedId === prompt.id ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 现代化编辑模态框 -->
    <div v-if="editingPrompt" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="closeEditor">
      <div 
        class="bg-white rounded-2xl shadow-2xl max-h-[100vh] overflow-hidden w-full" 
        :class="{ 'max-w-6xl': !showVersionHistory, 'max-w-7xl': showVersionHistory }" 
        @click.stop
      >
        <div class="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div class="flex-1">
            <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div class="i-carbon-edit"></div>
              {{ editingPrompt.id ? '编辑 Prompt' : '新建 Prompt' }}
            </h2>
            <div class="text-sm text-gray-500 mt-1" v-if="editingPrompt.id">
              ID: {{ editingPrompt.id }}
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              v-if="editingPrompt.id" 
              @click="showVersionHistory = !showVersionHistory" 
              :class="['p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors', { 'text-blue-600 bg-blue-100': showVersionHistory }]"
              title="版本历史"
            >
              <div class="i-carbon-time"></div>
            </button>
            <button @click="closeEditor" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors">
              <div class="i-carbon-close"></div>
            </button>
          </div>
        </div>
        
        <div class="flex">
          <!-- 版本历史面板 -->
          <div v-if="showVersionHistory && editingPrompt.id" class="w-80 border-l border-gray-200">
            <VersionHistory
              :prompt-id="editingPrompt.id"
              :current-version-id="editingPrompt.currentVersionId"
              :current-content="editingPrompt.content || ''"
              @version-restored="handleVersionRestored"
              @version-deleted="handleVersionDeleted"
            />
          </div>
      
          <div class="flex-1 flex overflow-hidden">
            <!-- 左侧元数据面板 -->
            <div class="w-96 border-r border-gray-200 p-4 flex flex-col space-y-4 overflow-y-auto">
              <h3 class="text-lg font-semibold text-gray-800 tracking-wide">元数据</h3>
              
              <div class="space-y-5">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input
                    v-model="editingPrompt.title"
                    type="text"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="为你的 Prompt 起个好名字..."
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">分类 (可多选)</label>
                  <div class="w-full p-2 border border-gray-200 rounded-lg flex flex-wrap gap-2">
                    <button
                      v-for="category in availableCategories"
                      :key="category.id"
                      @click="toggleCategoryForEdit(category.id)"
                      :class="[
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                        selectedCategoriesForEdit.includes(category.id)
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                      ]"
                    >
                      {{ category.name }}
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">标签</label>
                  <div class="w-full px-3 py-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap items-center gap-2">
                    <span
                      v-for="tag in editingTags"
                      :key="tag"
                      class="flex items-center gap-1.5 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium"
                    >
                      {{ tag }}
                      <button @click="removeTag(tag)" class="text-blue-600 hover:text-blue-800 -mr-1 rounded-full hover:bg-blue-200">
                        <div class="i-carbon-close text-xs"></div>
                      </button>
                    </span>
                    <input
                      v-model="tagInput"
                      type="text"
                      class="flex-1 bg-transparent outline-none min-w-[80px] h-8"
                      placeholder="添加标签后回车..."
                      @keydown.enter.prevent="addCurrentTag"
                      @keydown.backspace="handleTagBackspace"
                    >
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">变更说明</label>
                  <input
                    v-model="changeNote"
                    type="text"
                    class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="描述本次修改的内容 (可选)..."
                  >
                </div>
                
                <div>
                  <label class="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" v-model="editingPrompt.favorite" class="rounded text-blue-600 focus:ring-blue-500">
                    <span class="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <div class="i-carbon-favorite"></div>
                      标记为收藏
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- 右侧编辑器区域 -->
            <div class="flex-1 flex flex-col p-4 space-y-2 bg-gray-50/50">
              <label class="block text-sm font-medium text-gray-700">Prompt 内容</label>
              <div class="h-[70vh] relative border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-white flex flex-col">
                <MarkdownEditor
                  v-model="editingPrompt.content"
                  placeholder="在这里编写你的 AI Prompt..."
                  @change="handleContentChange"
                />
              </div>
            </div>
          </div>

        </div>
        
        <div class="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-500">
            <span v-if="editingPrompt.content">
              {{ editingPrompt.content.length }} 字符
            </span>
          </div>
          <div class="flex items-center gap-3">
            <button @click="closeEditor" class="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50">
              <div class="i-carbon-close"></div>
              取消
            </button>
            <button @click="savePrompt" class="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg">
              <div class="i-carbon-save"></div>
              保存 Prompt
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <div v-if="showSettings" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="showSettings = false">
      <div class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-4xl w-full" @click.stop>
        <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div class="flex-1">
            <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div class="i-carbon-settings"></div>
              设置
            </h2>
          </div>
          <button @click="showSettings = false" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors">
            <div class="i-carbon-close"></div>
          </button>
        </div>
        
        <div class="max-h-[70vh] overflow-y-auto">
          <Settings />
        </div>
      </div>
    </div>

    <!-- 优化的分类管理模态框 -->
    <div v-if="showCategoryManager" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="showCategoryManager = false">
      <div class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-xl w-full" @click.stop>
        <div class="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <h2 class="flex items-center gap-3 text-lg font-semibold text-gray-800">
            <div class="i-carbon-folder-details-reference text-xl"></div>
            分类管理
          </h2>
          <button @click="showCategoryManager = false" class="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors">
            <div class="i-carbon-close"></div>
          </button>
        </div>
        
        <div class="p-6">
          <!-- 添加新分类 -->
          <div class="grid grid-cols-3 gap-3 mb-6">
            <input 
              v-model="newCategoryName" 
              type="text" 
              placeholder="新分类名称..." 
              class="col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
            <input 
              v-model="newCategoryIcon"
              type="text" 
              placeholder="图标 (e.g. i-carbon-cat)" 
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
            <button @click="addCategory" class="col-span-3 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow hover:shadow-md">
              <div class="i-carbon-add"></div>
              <span>添加新分类</span>
            </button>
          </div>

          <!-- 分类列表 -->
          <div class="space-y-2 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
            <div v-for="category in categories" :key="category.id" class="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors">
              
              <!-- 编辑状态 -->
              <template v-if="editingCategoryId === category.id">
                <div class="flex-1 w-0 flex gap-2">
                  <input 
                    v-model="editingCategoryName"
                    type="text"
                    class="flex-1 px-2 py-1 border border-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                    @keyup.enter="saveCategoryEdit"
                    @keyup.esc="cancelCategoryEdit"
                    v-focus
                  >
                  <input 
                    v-model="editingCategoryIcon"
                    type="text"
                    placeholder="图标"
                    class="flex-1 px-2 py-1 border border-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                    @keyup.enter="saveCategoryEdit"
                    @keyup.esc="cancelCategoryEdit"
                  >
                </div>
                <div class="flex items-center gap-2 ml-4">
                  <button @click="saveCategoryEdit" title="保存" class="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                    <div class="i-carbon-checkmark"></div>
                  </button>
                  <button @click="cancelCategoryEdit" title="取消" class="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                    <div class="i-carbon-close"></div>
                  </button>
                </div>
              </template>

              <!-- 显示状态 -->
              <template v-else>
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div v-if="category.icon" :class="[category.icon, 'text-lg text-gray-600']"></div>
                  <div class="flex-1">
                    <div class="font-medium text-gray-800 truncate">{{ category.name }}</div>
                    <div class="text-sm text-gray-500">
                      {{ prompts.filter(p => p.categoryIds?.includes(category.id)).length }} 个 Prompts
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button @click="editCategory(category)" title="编辑" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                    <div class="i-carbon-edit"></div>
                  </button>
                  <button @click="deleteCategory(category.id)" title="删除" class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                    <div class="i-carbon-trash-can"></div>
                  </button>
                </div>
              </template>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全局 UI 组件 -->
    <UiToast
      v-if="ui.toast"
      :message="ui.toast.message"
      :type="ui.toast.type"
      @close="hideToast"
    />
    <UiConfirm
      v-model="ui.confirm.visible"
      :message="ui.confirm.message"
      :type="ui.confirm.type"
      @confirm="handleConfirm(true)"
      @cancel="handleConfirm(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ui, useUI } from '@/stores/ui'
import { db } from '@/stores/db'
import { MSG } from '@/utils/messaging'
import type { Prompt, Category, Tag } from '@/types/prompt'
import { nanoid } from 'nanoid'
import { createSafePrompt, validatePrompt, clonePrompt } from '@/utils/promptUtils'
import { createVersion, getLatestVersion } from '@/utils/versionUtils'
import MarkdownEditor from '@/options/components/MarkdownEditor.vue'
import VersionHistory from '@/options/components/VersionHistory.vue'
import Settings from './components/Settings.vue'

const { showToast, askConfirm, handleConfirm, hideToast } = useUI()

// 自定义 v-focus 指令
const vFocus = {
  mounted: (el: HTMLInputElement) => {
    el.focus()
  }
}

// 响应式数据
const prompts = ref<Prompt[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const selectedTags = ref<string[]>([])
const showFavoriteOnly = ref(false)
const sortBy = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
const editingPrompt = ref<Partial<Prompt> | null>(null)
const selectedCategoriesForEdit = ref<string[]>([])
const editingTags = ref<string[]>([])
const tagInput = ref('')
const showCategoryManager = ref(false)
const newCategoryName = ref('')
const newCategoryIcon = ref('')
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref<string>('')
const editingCategoryIcon = ref<string>('')
const showVersionHistory = ref(true)
const changeNote = ref('')
const hasContentChanged = ref(false)
const showSettings = ref(false)
const menuOpenId = ref<string | null>(null)
const copiedId = ref<string | null>(null)

// 计算属性
const getTagNames = (tagIds: string[]): string[] => {
  return tagIds.map(id => tags.value.find(t => t.id === id)?.name || '').filter(Boolean)
}

const filteredPrompts = computed(() => {
  let filtered = prompts.value
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p => {
      const tagNames = getTagNames(p.tagIds).join(' ').toLowerCase()
      return p.title.toLowerCase().includes(query) ||
             p.content.toLowerCase().includes(query) ||
             tagNames.includes(query)
    })
  }
  
  // 分类过滤
  if (selectedCategories.value.length > 0) {
    filtered = filtered.filter(p => 
      p.categoryIds && selectedCategories.value.some(catId => p.categoryIds.includes(catId))
    )
  }

  // 标签过滤
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter(p =>
      p.tagIds && selectedTags.value.every(tagId => p.tagIds.includes(tagId))
    )
  }
  
  // 收藏过滤
  if (showFavoriteOnly.value) {
    filtered = filtered.filter(p => p.favorite)
  }
  
  // 排序
  return filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'createdAt':
        return b.createdAt - a.createdAt
      case 'updatedAt':
      default:
        return b.updatedAt - a.updatedAt
    }
  })
})

const availableCategories = computed(() => {
  return categories.value.sort((a: Category, b: Category) => (a.sort || 0) - (b.sort || 0))
})

const availableTags = computed(() => {
  if (selectedCategories.value.length === 0) {
    return []
  }
  
  const tagIds = new Set<string>()
  prompts.value.forEach(p => {
    if (p.categoryIds.some(catId => selectedCategories.value.includes(catId))) {
      p.tagIds.forEach(tagId => tagIds.add(tagId))
    }
  })
  
  return tags.value.filter(t => tagIds.has(t.id))
})

function toggleCategory(categoryId: string) {
  const index = selectedCategories.value.indexOf(categoryId)
  if (categoryId === '') {
    selectedCategories.value = []
  } else if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryId)
  }
  selectedTags.value = [] // Reset tags when category changes
}

function toggleTag(tagId: string) {
  if (tagId === '') {
    selectedTags.value = []
    return
  }
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

// 操作函数
async function loadPrompts() {
  try {
    console.log('Attempting to load prompts...');
    const allPrompts = await db.prompts.toArray();
    console.log(`Loaded ${allPrompts.length} prompts from DB:`, JSON.parse(JSON.stringify(allPrompts)));
    
    if (allPrompts.length === 0) {
      console.warn('db.prompts.toArray() returned an empty array. If you see data in IndexedDB via DevTools, this might indicate a schema or connection issue.');
    }

    prompts.value = allPrompts.map(prompt => ({
      ...prompt,
      categoryIds: Array.isArray(prompt.categoryIds) ? prompt.categoryIds : [],
      tagIds: Array.isArray(prompt.tagIds) ? prompt.tagIds : [],
      favorite: Boolean(prompt.favorite),
      createdAt: Number(prompt.createdAt),
      updatedAt: Number(prompt.updatedAt)
    }));
  } catch (error) {
    console.error('Failed to load prompts:', error);
    showToast('加载 Prompts 失败', 'error');
  }
}

async function loadCategories() {
  try {
    console.log('Attempting to load categories...');
    const allCategories = await db.categories.toArray();
    console.log(`Loaded ${allCategories.length} categories from DB:`, JSON.parse(JSON.stringify(allCategories)));
    categories.value = allCategories;
    
    if (categories.value.length === 0) {
      console.log('No categories found, creating default set...');
      const defaultCategories: Category[] = [
        { id: 'work', name: '工作', sort: 1, icon: 'i-mdi-work' },
        { id: 'coding', name: '编程', sort: 2, icon: 'i-carbon-code' },
        { id: 'study', name: '学习', sort: 3, icon: 'i-carbon-book' },
        { id: 'writing', name: '写作', sort: 4, icon: 'i-carbon-pen' },
        { id: 'creation', name: '创作', sort: 5, icon: 'i-carbon-idea' },
        { id: 'teaching', name: '教学', sort: 6, icon: 'i-carbon-presentation-file' },
        { id: 'yijing', name: '易经', sort: 7, icon: 'i-simple-icons:taichilang' },
        { id: 'life', name: '生活', sort: 8, icon: 'i-carbon-home' },
        { id: 'other', name: '其他', sort: 9, icon: 'i-mdi-question-mark-circle' },
      ];

      await db.categories.bulkPut(defaultCategories);
      categories.value = defaultCategories;
      console.log('Default categories created and loaded.');
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
    showToast('加载 Categories 失败', 'error');
  }
}

async function loadTags() {
  try {
    console.log('Attempting to load tags...');
    const allTags = await db.tags.toArray();
    console.log(`Loaded ${allTags.length} tags from DB:`, JSON.parse(JSON.stringify(allTags)));
    tags.value = allTags;
  } catch (error) {
    console.error('Failed to load tags:', error);
    showToast('加载 Tags 失败', 'error');
  }
}

function getCategoryName(categoryId: string): string {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.name || categoryId
}

function getTagsString(tagIds: string[]): string {
  return getTagNames(tagIds).join(', ')
}

function createNewPrompt() {
  editingPrompt.value = createSafePrompt({
    title: '',
    content: '',
    favorite: false,
    categoryIds: [],
    tagIds: []
  })
  selectedCategoriesForEdit.value = []
  editingTags.value = []
  tagInput.value = ''
}

function editPrompt(prompt: Prompt) {
  editingPrompt.value = clonePrompt(prompt)
  selectedCategoriesForEdit.value = prompt.categoryIds || []
  editingTags.value = getTagNames(prompt.tagIds || [])
  tagInput.value = ''
}

async function toggleFavorite(prompt: Prompt) {
  try {
    const updatedPrompt = createSafePrompt({
      ...prompt,
      favorite: !prompt.favorite,
      updatedAt: Date.now()
    })
    
    await db.prompts.put(updatedPrompt)
    await loadPrompts()
    showToast(updatedPrompt.favorite ? '已添加到收藏' : '已取消收藏', 'success')
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    showToast('操作失败', 'error')
  }
}

async function savePrompt() {
  if (!editingPrompt.value || !editingPrompt.value.title?.trim()) {
    showToast('请输入标题', 'error')
    return
  }
  
  try {
    // Handle tags
    const tagNames = editingTags.value.map(t => t.trim()).filter(Boolean)
    const tagIds: string[] = []
    if (tagNames.length > 0) {
      const existingTags = await db.tags.where('name').anyOf(tagNames).toArray()
      
      for (const name of tagNames) {
        const existingTag = existingTags.find(t => t.name === name)
        if (existingTag) {
          tagIds.push(existingTag.id)
        } else {
          const newTag = { id: nanoid(), name }
          await db.tags.put(newTag)
          tagIds.push(newTag.id)
        }
      }
      await loadTags() // Reload tags to include new ones
    }

    const isNewPrompt = !editingPrompt.value.id
    const now = Date.now()
    
    const promptData = {
      ...editingPrompt.value,
      categoryIds: selectedCategoriesForEdit.value,
      tagIds,
      updatedAt: now
    }
    
    if (!promptData.id) {
      promptData.id = nanoid()
      promptData.createdAt = now
    }

    const safePrompt = createSafePrompt(promptData)
    
    const validationError = validatePrompt(safePrompt)
    if (validationError) {
      showToast(`数据验证失败: ${validationError}`, 'error')
      return
    }
    
    if (!isNewPrompt && hasContentChanged.value) {
      const version = await createVersion(
        safePrompt.id,
        safePrompt.content,
        changeNote.value || '内容更新',
        safePrompt.currentVersionId
      )
      safePrompt.currentVersionId = version.id
    }
    
    await db.prompts.put(safePrompt)
    await loadPrompts()
    closeEditor()
    showToast('保存成功', 'success')

    // Notify background about the update
    chrome.runtime.sendMessage({
      type: MSG.DATA_UPDATED,
      data: { scope: 'prompts', version: Date.now().toString() },
    })
    
  } catch (error) {
    console.error('Failed to save prompt:', error)
    showToast(`保存失败: ${(error as Error).message}`, 'error')
  }
}

async function deletePrompt(id: string) {
  const ok = await askConfirm('确定要删除这个 Prompt 吗？', { type: 'danger' })
  if (!ok) return
  try {
    await db.prompts.delete(id)
    await loadPrompts()
    showToast('删除成功', 'success')
    // Notify background about the update
    chrome.runtime.sendMessage({
      type: MSG.DATA_UPDATED,
      data: { scope: 'prompts', version: Date.now().toString() },
    })
  } catch (error) {
    console.error('Failed to delete prompt:', error)
    showToast('删除失败', 'error')
  }
}

async function copyPrompt(prompt: Prompt) {
  try {
    await navigator.clipboard.writeText(prompt.content)
    copiedId.value = prompt.id
    setTimeout(() => {
      if (copiedId.value === prompt.id) copiedId.value = null
    }, 1500)
    showToast('已复制到剪贴板', 'success')
  } catch (error) {
    console.error('Failed to copy prompt:', error)
    showToast('复制失败', 'error')
  }
}

function closeEditor() {
  editingPrompt.value = null
  selectedCategoriesForEdit.value = []
  editingTags.value = []
  tagInput.value = ''
  showVersionHistory.value = true
  changeNote.value = ''
  hasContentChanged.value = false
}

function handleContentChange() {
  hasContentChanged.value = true
}

function handleVersionRestored(version: any) {
  if (editingPrompt.value) {
    editingPrompt.value.content = version.content
    editingPrompt.value.currentVersionId = version.id
    hasContentChanged.value = true
  }
  showToast('版本已恢复', 'success')
}

function handleVersionDeleted(versionId: string) {
  showToast('版本已删除', 'success')
}

function toggleCategoryForEdit(categoryId: string) {
  const index = selectedCategoriesForEdit.value.indexOf(categoryId)
  if (index > -1) {
    selectedCategoriesForEdit.value.splice(index, 1)
  } else {
    selectedCategoriesForEdit.value.push(categoryId)
  }
}

function addCurrentTag() {
  const tagName = tagInput.value.trim()
  if (tagName && !editingTags.value.includes(tagName)) {
    editingTags.value.push(tagName)
  }
  tagInput.value = ''
}

function removeTag(tagToRemove: string) {
  editingTags.value = editingTags.value.filter(tag => tag !== tagToRemove)
}

function handleTagBackspace() {
  if (tagInput.value === '' && editingTags.value.length > 0) {
    editingTags.value.pop()
  }
}

// 分类管理功能
async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) {
    showToast('请输入分类名称', 'error')
    return
  }
  
  try {
    const category: Category = {
      id: nanoid(),
      name,
      icon: newCategoryIcon.value.trim(),
      sort: (categories.value.length > 0 ? Math.max(...categories.value.map(c => c.sort || 0)) : 0) + 1
    }
    
    await db.categories.put(category)
    await loadCategories()
    newCategoryName.value = ''
    newCategoryIcon.value = ''
    showToast('分类添加成功', 'success')
    chrome.runtime.sendMessage({
      type: MSG.DATA_UPDATED,
      data: { scope: 'categories', version: Date.now().toString() },
    })
  } catch (error) {
    console.error('Failed to add category:', error)
    showToast('添加分类失败', 'error')
  }
}

function editCategory(category: Category) {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
  editingCategoryIcon.value = category.icon ?? ''
}

function cancelCategoryEdit() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
  editingCategoryIcon.value = ''
}

async function saveCategoryEdit() {
  const id = editingCategoryId.value
  const name = editingCategoryName.value.trim()
  const icon = editingCategoryIcon.value.trim()

  if (!id || !name) {
    cancelCategoryEdit()
    return
  }
  
  const originalCategory = categories.value.find(c => c.id === id)
  if (originalCategory && (originalCategory.name !== name || originalCategory.icon !== icon)) {
    await updateCategory(id, { name, icon })
  }
  cancelCategoryEdit()
}

async function updateCategory(id: string, data: { name: string, icon?: string }) {
  try {
    const category = categories.value.find(c => c.id === id)
    if (category) {
      await db.categories.update(id, data)
      await loadCategories()
      showToast('分类更新成功', 'success')
      chrome.runtime.sendMessage({
        type: MSG.DATA_UPDATED,
        data: { scope: 'categories', version: Date.now().toString() },
      })
    }
  } catch (error) {
    console.error('Failed to update category:', error)
    showToast('更新分类失败', 'error')
  }
}

async function deleteCategory(id: string) {
  const ok = await askConfirm('确定要删除这个分类吗？相关的 Prompts 不会被删除。', { type: 'danger' })
  if (!ok) return
  try {
    await db.categories.delete(id)
    await loadCategories()
    showToast('分类删除成功', 'success')
    chrome.runtime.sendMessage({
      type: MSG.DATA_UPDATED,
      data: { scope: 'categories', version: Date.now().toString() },
    })
  } catch (error) {
    console.error('Failed to delete category:', error)
    showToast('删除分类失败', 'error')
  }
}

function getPreview(content: string): string {
  return content.length > 150 ? content.substring(0, 150) + '...' : content
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}

// 全局键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (editingPrompt.value) {
      closeEditor()
    } else if (showCategoryManager.value) {
      showCategoryManager.value = false
    } else if (showSettings.value) {
      showSettings.value = false
    } else if (menuOpenId.value) {
      menuOpenId.value = null
    }
  }
}

// 生命周期
onMounted(async () => {
  try {
    await db.open()
    console.log('Database connection successful.')
    // Load data only after DB is confirmed open
    loadPrompts()
    loadCategories()
    loadTags()
  }
  catch (error) {
    console.error('Failed to open database:', error)
    showToast('数据库连接失败，请检查控制台获取详细信息。', 'error')
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
</style>