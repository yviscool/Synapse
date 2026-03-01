<template>
  <transition
    enter-active-class="transition-all duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]"
    enter-from-class="opacity-0 -translate-y-3 scale-[0.96]"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-220 ease-out"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 -translate-y-2 scale-[0.98]"
  >
    <div class="synapse-toast-host fixed top-6 left-1/2 z-[2147483647] w-full -translate-x-1/2 px-3 pointer-events-none">
      <div
        class="synapse-toast-shell pointer-events-auto"
        :class="type === 'success' ? 'is-success' : 'is-error'"
        :role="type === 'error' ? 'alert' : 'status'"
        :aria-live="type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="synapse-toast-icon">
          <div v-if="type === 'success'" class="i-carbon-checkmark-filled"></div>
          <div v-else class="i-carbon-warning-filled"></div>
        </div>

        <p class="synapse-toast-message">{{ message }}</p>

        <button
          type="button"
          class="synapse-toast-close"
          aria-label="Close notification"
          @click="$emit('close')"
        >
          <div class="i-carbon-close"></div>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message: string
  type?: 'success' | 'error'
}>(), {
  type: 'success',
})

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
.synapse-toast-host {
  display: flex;
  justify-content: center;
}

.synapse-toast-shell {
  --toast-rgb: 16 185 129;
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: min(92vw, 560px);
  min-height: 56px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.92));
  box-shadow:
    0 22px 46px -24px rgba(15, 23, 42, 0.52),
    0 6px 12px -6px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px) saturate(135%);
  overflow: hidden;
}

.synapse-toast-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(125% 125% at 0% 0%, rgba(var(--toast-rgb), 0.22) 0%, rgba(var(--toast-rgb), 0) 58%);
  pointer-events: none;
}

.synapse-toast-shell::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--toast-rgb), 0) 0%, rgba(var(--toast-rgb), 0.86) 50%, rgba(var(--toast-rgb), 0) 100%);
}

.synapse-toast-shell.is-success {
  --toast-rgb: 16 185 129;
}

.synapse-toast-shell.is-error {
  --toast-rgb: 225 29 72;
}

.synapse-toast-icon {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: rgb(var(--toast-rgb));
  background: rgba(var(--toast-rgb), 0.14);
  box-shadow: inset 0 0 0 1px rgba(var(--toast-rgb), 0.24);
}

.synapse-toast-message {
  position: relative;
  z-index: 1;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.42;
  letter-spacing: 0.01em;
  word-break: break-word;
}

.synapse-toast-close {
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: rgba(71, 85, 105, 0.76);
  background: transparent;
  transition: background-color 160ms ease, color 160ms ease, transform 120ms ease;
}

.synapse-toast-close:hover {
  color: #0f172a;
  background: rgba(148, 163, 184, 0.2);
}

.synapse-toast-close:active {
  transform: scale(0.92);
}

/* Dark mode support, including shadow-host data-theme. */
:where(.dark, [data-theme='dark']) .synapse-toast-shell {
  border-color: rgba(148, 163, 184, 0.24);
  background: linear-gradient(145deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.92));
  box-shadow:
    0 26px 58px -24px rgba(0, 0, 0, 0.74),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

:where(.dark, [data-theme='dark']) .synapse-toast-message {
  color: rgba(248, 250, 252, 0.95);
}

:where(.dark, [data-theme='dark']) .synapse-toast-close {
  color: rgba(148, 163, 184, 0.84);
}

:where(.dark, [data-theme='dark']) .synapse-toast-close:hover {
  color: rgba(248, 250, 252, 0.95);
  background: rgba(148, 163, 184, 0.24);
}

@media (max-width: 480px) {
  .synapse-toast-shell {
    min-height: 52px;
    padding: 9px 10px;
    gap: 10px;
  }

  .synapse-toast-message {
    font-size: 12px;
  }
}

:deep([class^="i-"]) {
  display: block;
  line-height: 1;
  font-size: 18px;
}
</style>
