<template>
  <div class="settings-panel">
    <!-- 采集设置 -->
    <div class="settings-section">
      <h4 class="section-title">
        <span class="i-ph-download-simple-bold"></span>
        {{ t('content.settings.collectTitle') }}
      </h4>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{{ t('content.settings.defaultMode') }}</span>
          <span class="setting-desc">{{ t('content.settings.defaultModeDesc') }}</span>
        </div>
        <select v-model="settings.defaultMode" class="setting-select">
          <option value="manual">{{ t('content.settings.manual') }}</option>
          <option value="realtime">{{ t('content.settings.realtime') }}</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{{ t('content.settings.autoStart') }}</span>
          <span class="setting-desc">{{ t('content.settings.autoStartDesc') }}</span>
        </div>
        <button
          class="toggle-btn"
          :class="{ active: settings.autoStart }"
          @click="settings.autoStart = !settings.autoStart"
        >
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </button>
      </div>
    </div>

    <!-- 显示设置 -->
    <div class="settings-section">
      <h4 class="section-title">
        <span class="i-ph-eye-bold"></span>
        {{ t('content.settings.displayTitle') }}
      </h4>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{{ t('content.settings.showOutline') }}</span>
          <span class="setting-desc">{{ t('content.settings.showOutlineDesc') }}</span>
        </div>
        <button
          class="toggle-btn"
          :class="{ active: settings.showOutline }"
          @click="settings.showOutline = !settings.showOutline"
        >
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">{{ t('content.settings.position') }}</span>
          <span class="setting-desc">{{ t('content.settings.positionDesc') }}</span>
        </div>
        <select v-model="settings.position" class="setting-select">
          <option value="right">{{ t('content.settings.right') }}</option>
          <option value="left">{{ t('content.settings.left') }}</option>
        </select>
      </div>
    </div>

    <!-- 关于 -->
    <div class="settings-section">
      <h4 class="section-title">
        <span class="i-ph-info-bold"></span>
        {{ t('content.settings.about') }}
      </h4>

      <div class="about-info">
        <div class="about-row">
          <span>{{ t('content.settings.version') }}</span>
          <span class="version-badge">v1.0.0</span>
        </div>
        <div class="about-row">
          <a
            href="#"
            @click.prevent="openOptions"
            class="open-settings-link"
          >
            <span class="i-ph-gear-bold"></span>
            {{ t('content.settings.openSettings') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const settings = reactive({
  defaultMode: 'manual' as 'manual' | 'realtime',
  autoStart: false,
  showOutline: true,
  position: 'right' as 'right' | 'left',
})

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('panelSettings')
    if (result.panelSettings) {
      Object.assign(settings, result.panelSettings)
    }
  } catch (e) {
    // ignore
  }
}

watch(settings, async (newSettings) => {
  try {
    await chrome.storage.local.set({ panelSettings: { ...newSettings } })
  } catch (e) {
    // ignore
  }
}, { deep: true })

function openOptions() {
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
}

loadSettings()
</script>

<style scoped>
.settings-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-text-tertiary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title span {
  font-size: 13px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--sp-item-bg, #f8fafc);
  border-radius: 10px;
  transition: background 0.15s ease;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--sp-text-primary, #1e293b);
}

.setting-desc {
  font-size: 11px;
  color: var(--sp-text-tertiary, #94a3b8);
}

.setting-select {
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--sp-border, #e2e8f0);
  border-radius: 6px;
  background: var(--sp-select-bg, white);
  color: var(--sp-text-secondary, #475569);
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
}

.setting-select:focus {
  border-color: #3b82f6;
}

/* 开关按钮 */
.toggle-btn {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.toggle-track {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--sp-toggle-bg, #cbd5e1);
  border-radius: 11px;
  transition: background 0.2s ease;
}

.toggle-btn.active .toggle-track {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(18px);
}

/* 关于信息 */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--sp-item-bg, #f8fafc);
  border-radius: 10px;
}

.about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--sp-text-secondary, #64748b);
}

.version-badge {
  color: #3b82f6;
  font-weight: 500;
}

.open-settings-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;
}

.open-settings-link:hover {
  color: #2563eb;
}
</style>
