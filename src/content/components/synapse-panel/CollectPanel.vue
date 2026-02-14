<template>
  <div class="collect-panel">
    <!-- 平台识别卡片 -->
    <div
      v-if="platformInfo"
      class="platform-card"
      :style="platformCardStyle"
    >
      <div class="platform-icon-wrap" :style="{ color: platformInfo.color }">
        <img
          v-if="platformInfo.iconUrl"
          :src="platformInfo.iconUrl"
          alt=""
          class="w-5 h-5 rounded object-cover"
        />
        <span v-else :class="platformInfo.icon" class="text-xl"></span>
      </div>
      <div class="platform-name" :style="{ color: 'var(--sp-text-primary)' }">{{ platformInfo.name }}</div>
    </div>

    <!-- 脉搏区域：消息计数 -->
    <div class="pulse-section" :style="{ background: 'var(--sp-item-bg)' }">
      <div
        class="pulse-count"
        :style="{ color: isSyncing ? '#3b82f6' : 'var(--sp-text-primary)' }"
      >
        {{ syncState.messageCount }}
      </div>
      <div class="pulse-label">{{ t('content.collect.messages') }}</div>

      <!-- 状态行 -->
      <div class="status-line" :style="{ color: 'var(--sp-text-secondary)' }">
        <span
          class="status-dot"
          :class="statusDotClass"
        ></span>
        <span class="status-text">{{ statusText }}</span>
        <span v-if="lastSyncTime !== '--'" class="status-time" :style="{ color: 'var(--sp-text-tertiary)' }">· {{ lastSyncTime }}</span>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="action-section">
      <!-- 主按钮 -->
      <button
        class="main-btn"
        :class="{ syncing: isSyncing }"
        :disabled="isSyncing || !canSync"
        @click="handleManualCollect"
      >
        <span v-if="isSyncing" class="i-ph-circle-notch-bold animate-spin"></span>
        <span v-else class="i-ph-download-simple-bold"></span>
        <span>{{ isSyncing ? t('content.collect.syncing') : t('content.collect.collectNow') }}</span>
      </button>

      <!-- 同步开关 -->
      <div class="sync-toggle-row" :style="{ background: 'var(--sp-item-bg)' }">
        <div class="sync-toggle-label" :style="{ color: 'var(--sp-text-secondary)' }">
          <span class="i-ph-arrows-clockwise-bold text-sm" :style="{ color: 'var(--sp-text-tertiary)' }"></span>
          <span>{{ t('content.collect.realtimeSync') }}</span>
        </div>
        <button
          class="toggle-btn"
          :class="{ active: isEnabled }"
          :disabled="!canSync"
          @click="handleToggle"
        >
          <span class="toggle-track" :style="!isEnabled ? { background: 'var(--sp-toggle-bg)' } : {}">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>
    </div>

    <!-- 查看详情 -->
    <button
      class="detail-btn"
      :style="{
        borderColor: 'var(--sp-border)',
        color: 'var(--sp-text-secondary)',
      }"
      :disabled="syncState.messageCount === 0"
      @click="handleViewDetail"
    >
      <span class="i-ph-eye-bold text-sm"></span>
      <span>{{ t('content.collect.viewDetail') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SyncEngineInstance } from './useSyncEngine'
import { getCurrentPlatformInfo } from '@/content/collect'
import { getPlatformConfig, getPlatformIconUrl } from '@/content/site-configs'
import { MSG } from '@/utils/messaging'

const { t, locale } = useI18n()

const props = defineProps<{
  syncEngine: SyncEngineInstance
}>()

const emit = defineEmits<{
  'sync-status-change': [status: 'idle' | 'syncing' | 'success' | 'error']
  viewDetail: []
}>()

// 直接使用父组件传入的同步引擎
const {
  syncState,
  isEnabled,
  isSyncing,
  canSync,
  toggle,
  manualSync,
} = props.syncEngine

// 同步状态变化时通知父组件
watch(() => syncState.value.status, (status) => {
  emit('sync-status-change', status)
})

// 平台信息
const platformInfo = computed(() => {
  const info = getCurrentPlatformInfo()
  if (!info.platform) return null
  const config = getPlatformConfig(info.platform)
  return {
    id: info.platform,
    name: config.name,
    icon: config.icon,
    iconUrl: getPlatformIconUrl(config),
    color: config.color,
  }
})

// 平台卡片样式（使用 inline style 避免 scoped .dark 问题）
const platformCardStyle = computed<CSSProperties>(() => {
  if (!platformInfo.value) return {}
  const c = platformInfo.value.color
  return {
    background: `linear-gradient(135deg, color-mix(in srgb, ${c} 10%, var(--sp-settings-bg, white)) 0%, color-mix(in srgb, ${c} 18%, var(--sp-settings-bg, white)) 100%)`,
    borderColor: `color-mix(in srgb, ${c} 22%, transparent)`,
  }
})

// 状态圆点样式
const statusDotClass = computed(() => {
  switch (syncState.value.status) {
    case 'syncing': return 'syncing'
    case 'success': return 'success'
    case 'error': return 'error'
    default: return isEnabled.value ? 'active' : 'idle'
  }
})

// 状态文字
const statusText = computed(() => {
  switch (syncState.value.status) {
    case 'syncing': return t('content.collect.status.syncing')
    case 'success': return t('content.collect.status.success')
    case 'error': return t('content.collect.status.error')
    default: return isEnabled.value
      ? t('content.collect.status.watching')
      : t('content.collect.status.paused')
  }
})

// 最后同步时间
const lastSyncTime = computed(() => {
  if (!syncState.value.lastSyncAt) return '--'
  const diff = Date.now() - syncState.value.lastSyncAt
  if (diff < 60000) return t('content.collect.justNow')
  if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('content.collect.minutesAgo')}`
  return new Date(syncState.value.lastSyncAt).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  })
})

// 事件处理
function handleToggle() {
  toggle()
}

async function handleManualCollect() {
  await manualSync()
}

function handleViewDetail() {
  chrome.runtime.sendMessage({ type: MSG.OPEN_OPTIONS, data: { view: 'chat' } })
  emit('viewDetail')
}
</script>

<style scoped>
.collect-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
}

/* 平台识别卡片 */
.platform-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid transparent;
}

.platform-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sp-select-bg, white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.platform-name {
  font-size: 15px;
  font-weight: 600;
}

/* 脉搏区域 */
.pulse-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px 16px;
  border-radius: 14px;
}

.pulse-count {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s ease;
}

.pulse-label {
  font-size: 12px;
  color: var(--sp-text-tertiary, #94a3b8);
  margin-top: 4px;
  font-weight: 500;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.idle { background: #94a3b8; }
.status-dot.active { background: #10b981; animation: pulse-dot 2s infinite; }
.status-dot.syncing { background: #3b82f6; animation: pulse-dot 1s infinite; }
.status-dot.success { background: #10b981; }
.status-dot.error { background: #ef4444; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.status-text {
  font-weight: 500;
}

/* 操作区域 */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
}

.main-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.main-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.main-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-btn.syncing {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
}

/* 同步开关行 */
.sync-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
}

.sync-toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}

/* 开关按钮 */
.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-track {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.toggle-btn.active .toggle-track {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

/* 查看详情按钮 */
.detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.detail-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
