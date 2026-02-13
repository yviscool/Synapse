<template>
  <div class="html-preview flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center gap-2">
        <div class="i-carbon-code text-gray-500 dark:text-gray-400"></div>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('tools.preview.title') }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="hasExternalLinks"
          @click="showDependencies = !showDependencies"
          class="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition-colors"
        >
          <div class="i-carbon-warning"></div>
          {{ t('tools.preview.externalLinks') }}
        </button>
        <button
          @click="exportHtml"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          :title="t('tools.preview.exportHtml')"
        >
          <div class="i-carbon-download"></div>
        </button>
        <button
          @click="openInCodePen"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          :title="t('tools.preview.openInCodePen')"
        >
          <div class="i-carbon-launch"></div>
        </button>
        <button
          @click="toggleFullscreen"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          :title="isFullscreen ? t('tools.preview.exitFullscreen') : t('tools.preview.fullscreen')"
        >
          <div :class="isFullscreen ? 'i-carbon-minimize' : 'i-carbon-maximize'"></div>
        </button>
      </div>
    </div>

    <!-- External links warning -->
    <div
      v-if="showDependencies && hasExternalLinks"
      class="px-3 py-2 bg-amber-50 border-b border-amber-200"
    >
      <p class="text-xs text-amber-700 mb-2">{{ t('tools.preview.externalLinksWarning') }}</p>
      <div class="text-xs text-amber-600">
        <div class="font-medium mb-1">{{ t('tools.preview.dependencies') }}:</div>
        <ul class="list-disc list-inside space-y-0.5">
          <li v-for="link in externalLinks" :key="link" class="truncate">{{ link }}</li>
        </ul>
      </div>
    </div>

    <!-- Preview iframe -->
    <div class="flex-1 relative bg-white dark:bg-gray-900" :class="{ 'fixed inset-0 z-50': isFullscreen }">
      <iframe
        ref="iframeRef"
        :srcdoc="sanitizedHtml"
        class="w-full h-full border-0"
        sandbox="allow-scripts"
        @load="onIframeLoad"
      ></iframe>

      <!-- Fullscreen close button -->
      <button
        v-if="isFullscreen"
        @click="toggleFullscreen"
        class="absolute top-4 right-4 p-2 bg-white dark:bg-gray-900 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div class="i-carbon-close text-gray-600 dark:text-gray-300"></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  content: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'dependencies-detected', links: string[]): void
}>()

const { t } = useI18n()

// Refs
const iframeRef = ref<HTMLIFrameElement | null>(null)

// State
const isFullscreen = ref(false)
const showDependencies = ref(false)
const externalLinks = ref<string[]>([])

// Detect external links in HTML
function detectExternalLinks(html: string): string[] {
  const links: string[] = []

  // Match script src
  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('data:')) {
      links.push(match[1])
    }
  }

  // Match link href (stylesheets)
  const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
  while ((match = linkRegex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('data:')) {
      links.push(match[1])
    }
  }

  // Match img src
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1] && !match[1].startsWith('data:') && (match[1].startsWith('http') || match[1].startsWith('//'))) {
      links.push(match[1])
    }
  }

  return [...new Set(links)]
}

// Computed
const hasExternalLinks = computed(() => externalLinks.value.length > 0)

const sanitizedHtml = computed(() => {
  // Wrap content in a basic HTML structure if it's not a complete document
  let html = props.content || ''

  if (!html.toLowerCase().includes('<!doctype') && !html.toLowerCase().includes('<html')) {
    html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`
  }

  return html
})

// Watch content changes
watch(() => props.content, (newContent) => {
  const links = detectExternalLinks(newContent || '')
  externalLinks.value = links
  emit('dependencies-detected', links)
}, { immediate: true })

// Methods
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

function onIframeLoad() {
  // Could add additional handling here
}

function exportHtml() {
  const blob = new Blob([props.content || ''], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title || 'snippet'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function openInCodePen() {
  // Extract CSS and JS from HTML if present
  let html = props.content || ''
  let css = ''
  let js = ''

  // Extract inline styles
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleMatch) {
    css = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n')
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  }

  // Extract inline scripts
  const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
  if (scriptMatch) {
    js = scriptMatch
      .filter(s => !s.includes('src='))
      .map(s => s.replace(/<\/?script[^>]*>/gi, ''))
      .join('\n')
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  }

  // Clean up HTML (remove doctype, html, head, body tags for CodePen)
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .trim()

  // Create CodePen form
  const data = {
    title: props.title || 'Snippet',
    html,
    css,
    js,
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = 'https://codepen.io/pen/define'
  form.target = '_blank'

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'data'
  input.value = JSON.stringify(data)

  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

// Expose methods
defineExpose({
  refresh: () => {
    if (iframeRef.value) {
      iframeRef.value.srcdoc = sanitizedHtml.value
    }
  },
})
</script>

<style scoped>
.html-preview {
  min-height: 200px;
}
</style>
