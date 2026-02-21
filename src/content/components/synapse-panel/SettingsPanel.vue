<template>
  <div class="settings-panel">
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
import { useI18n } from 'vue-i18n'
import { MSG } from '@/utils/messaging'

const { t } = useI18n()

function openOptions() {
  chrome.runtime.sendMessage({ type: MSG.OPEN_OPTIONS })
}
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
