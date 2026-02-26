<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h4 class="section-title">
        <span class="i-ph-sidebar-simple-bold"></span>
        {{ t('content.settings.outline') }}
      </h4>

      <div class="switch-card">
        <div class="switch-copy">
          <p class="switch-title">{{ t('content.settings.outlineRailTitle') }}</p>
          <p class="switch-desc">{{ t('content.settings.outlineRailDesc') }}</p>
        </div>
        <button
          type="button"
          class="switch-button"
          :class="{ 'is-on': outlineRailEnabled }"
          :aria-pressed="outlineRailEnabled"
          @click="toggleOutlineRail"
        >
          <span class="switch-knob"></span>
          <span class="switch-label">
            {{ outlineRailEnabled ? t('content.settings.outlineRailOn') : t('content.settings.outlineRailOff') }}
          </span>
        </button>
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MSG } from '@/utils/messaging'

const props = defineProps<{
  outlineRailEnabled?: boolean
}>()

const emit = defineEmits<{
  'update:outline-rail-enabled': [value: boolean]
}>()

const { t } = useI18n()
const outlineRailEnabled = computed(() => !!props.outlineRailEnabled)

function toggleOutlineRail() {
  emit('update:outline-rail-enabled', !outlineRailEnabled.value)
}

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

.switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--sp-item-bg, #f8fafc), color-mix(in srgb, var(--sp-item-bg, #f8fafc) 86%, #dbeafe 14%));
  border: 1px solid color-mix(in srgb, var(--sp-border, #e2e8f0) 75%, #dbeafe 25%);
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.switch-title {
  font-size: 12px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--sp-text-primary, #1e293b);
}

.switch-desc {
  font-size: 11px;
  line-height: 1.45;
  color: var(--sp-text-secondary, #64748b);
}

.switch-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  border: 1px solid var(--sp-border, #e2e8f0);
  background: color-mix(in srgb, var(--sp-toggle-bg, #cbd5e1) 70%, white 30%);
  color: var(--sp-text-secondary, #64748b);
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.switch-button.is-on {
  border-color: rgba(59, 130, 246, 0.45);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.08));
  color: #2563eb;
}

.switch-knob {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: white;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.24);
  transition: transform 0.2s ease;
}

.switch-button.is-on .switch-knob {
  transform: translateX(2px);
}

.switch-label {
  min-width: 24px;
  text-align: center;
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
