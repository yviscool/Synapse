import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import markedKatex from 'marked-katex-extension'
import hljs from 'highlight.js/lib/core'

// Register languages commonly seen in AI chat conversations
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import dart from 'highlight.js/lib/languages/dart'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import nginx from 'highlight.js/lib/languages/nginx'
import lua from 'highlight.js/lib/languages/lua'
import r from 'highlight.js/lib/languages/r'
import scala from 'highlight.js/lib/languages/scala'
import graphql from 'highlight.js/lib/languages/graphql'
import wasm from 'highlight.js/lib/languages/wasm'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('jsx', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('dart', dart)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rb', ruby)
hljs.registerLanguage('php', php)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('zsh', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('svg', html)
hljs.registerLanguage('vue', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('docker', dockerfile)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('r', r)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('gql', graphql)
hljs.registerLanguage('wasm', wasm)

const MERMAID_LANGS = new Set(['mermaid', 'mmd'])
let codeCopyLabel = 'Copy'
let codeCopiedLabel = 'Copied'
let mermaidChartLabel = 'Chart'
let mermaidCodeLabel = 'Code'
let mermaidCopyLabel = 'Copy'
let mermaidDownloadLabel = 'Download'
let mermaidFullscreenLabel = 'Fullscreen'
const CODE_LANG_LABELS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  sh: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  yml: 'YAML',
  yaml: 'YAML',
  md: 'Markdown',
  markdown: 'Markdown',
  cpp: 'C++',
  csharp: 'C#',
  cs: 'C#',
  gql: 'GraphQL',
}

function normalizeLang(lang?: string): string {
  return (lang || '').trim().split(/\s+/, 1)[0].toLowerCase()
}

function looksLikeMermaidSource(source: string): boolean {
  const trimmed = source.trim()
  return /^(?:graph\s|flowchart\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|quadrantChart|sankey|xychart|block-beta|packet-beta|architecture-beta|kanban)/i.test(trimmed)
}

function normalizeMermaidSource(source: string): string {
  return source
    .replace(/<\/?span\b[^>]*>/gi, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .trim()
}

function getCodeLangLabel(lang: string): string {
  if (!lang) return 'Text'
  const known = CODE_LANG_LABELS[lang]
  if (known) return known
  return lang.charAt(0).toUpperCase() + lang.slice(1)
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeMathDelimiters(content: string): string {
  if (!content) return content

  // Keep fenced code blocks untouched.
  const segments = content.split(/(```[\s\S]*?```)/g)
  return segments
    .map((segment, index) => {
      if (index % 2 === 1) return segment
      const normalizedSegment = segment
        // \[ ... \] or \[ ... ] -> $$ ... $$
        .replace(/\\\[([\s\S]*?)\\?\]/g, (_, formula: string) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
        // \( ... \) -> $ ... $
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula: string) => `$${formula.trim()}$`)
        // Ensure $$ delimiters are on their own lines (e.g. $$content\n...$$ → $$\ncontent\n...\n$$)
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, inner: string) => {
          if (!inner.includes('\n')) return `$$${inner}$$`
          return `\n\n$$\n${inner.trim()}\n$$\n\n`
        })
        // Promote $...$ containing \begin{env} or multi-line LaTeX commands to display math $$...$$
        .replace(/(?<!\$)\$(?!\$)((?:[^$])*?\\[a-zA-Z]+(?:[^$])*?)\$(?!\$)/g, (match, formula: string) => {
          // \begin{...}...\end{...} is always display math
          if (/\\begin\{/.test(formula)) return `\n\n$$\n${formula.trim()}\n$$\n\n`
          if (!formula.includes('\n')) return match
          return `\n\n$$\n${formula.trim()}\n$$\n\n`
        })

      // Only apply "( ... )" fallback and bare \begin{} wrapping on non-math parts.
      const parts = normalizedSegment.split(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+\$)/g)
      return parts
        .map((part, partIndex) => {
          if (partIndex % 2 === 1) return part
          // Wrap bare \begin{env}...\end{env} (no $ delimiters) as display math
          let processed = part.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
            return `\n\n$$\n${match.trim()}\n$$\n\n`
          })
          return processed.replace(/\(([^()\n]{1,180})\)/g, (raw: string, formula: string, offset: number, source: string) => {
            // Preserve markdown link syntax: [text](url)
            if (offset > 0 && source[offset - 1] === ']') return raw
            const normalized = formula.trim()
            if (!normalized) return raw

            const hasMathCommand = /\\[a-zA-Z]+/.test(normalized)
            const hasPowerOrSubscript = /[_^]/.test(normalized)
            const hasMathOperators = /[=+\-*/<>]|\\times|\\div|\\cdot/.test(normalized)
            const hasAbsPattern = /^\|[^|]+\|(?:\s*[=<>].*)?$/.test(normalized)

            if (hasMathCommand || hasPowerOrSubscript || (hasMathOperators && /[a-zA-Z0-9]/.test(normalized)) || hasAbsPattern) {
              return `$${normalized}$`
            }
            return raw
          })
        })
        .join('')
    })
    .join('')
}

/**
 * Pre-configured Marked instance with syntax highlighting via highlight.js.
 * Shared across all markdown rendering (chat messages, version diffs, etc.)
 */
export const markedWithHighlight = new Marked(
  markedKatex({
    throwOnError: false,
    strict: 'ignore',
    nonStandard: true,
  }),
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const normalizedLang = normalizeLang(lang)
      const maybeMermaid = looksLikeMermaidSource(normalizeMermaidSource(code))
      if (MERMAID_LANGS.has(normalizedLang)) {
        return code
      }
      if (
        (!normalizedLang || normalizedLang === 'text' || normalizedLang === 'plaintext')
        && maybeMermaid
      ) {
        return code
      }
      if (normalizedLang && hljs.getLanguage(normalizedLang)) {
        return hljs.highlight(code, { language: normalizedLang }).value
      }
      // Auto-detect for unlabeled code blocks
      return hljs.highlightAuto(code).value
    },
  }),
  {
    breaks: true,
    gfm: true,
    renderer: {
      code({ text, lang, escaped }) {
        const normalizedLang = normalizeLang(lang)
        const normalizedMermaidSource = normalizeMermaidSource(text)
        const shouldRenderMermaid = MERMAID_LANGS.has(normalizedLang)
          || (
            (!normalizedLang || normalizedLang === 'text' || normalizedLang === 'plaintext')
            && looksLikeMermaidSource(normalizedMermaidSource)
          )

        if (shouldRenderMermaid) {
          const source = escapeHtml(normalizedMermaidSource)
          return `<div class="md-mermaid-block">
  <div class="md-mermaid-banner">
    <div class="md-mermaid-tabs">
      <button type="button" class="md-mermaid-tab md-mermaid-tab--active" data-md-mermaid-tab="chart">${mermaidChartLabel}</button>
      <button type="button" class="md-mermaid-tab" data-md-mermaid-tab="code">${mermaidCodeLabel}</button>
    </div>
    <div class="md-mermaid-actions">
      <button type="button" class="md-mermaid-action" data-md-mermaid-action="copy" title="${mermaidCopyLabel}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button type="button" class="md-mermaid-action" data-md-mermaid-action="download" title="${mermaidDownloadLabel}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
      <button type="button" class="md-mermaid-action" data-md-mermaid-action="preview" title="${mermaidFullscreenLabel}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>
    </div>
  </div>
  <div class="md-mermaid-chart"><div class="mermaid">${source}</div></div>
  <div class="md-mermaid-source" style="display:none"><pre><code class="hljs language-mermaid">${source}\n</code></pre></div>
</div>\n`
        }
        const langLabel = getCodeLangLabel(normalizedLang)
        const className = normalizedLang ? `hljs language-${escapeHtml(normalizedLang)}` : 'hljs'
        return `<div class="md-code-block">
  <div class="md-code-block-banner">
    <span class="md-code-block-lang">${escapeHtml(langLabel)}</span>
    <button type="button" class="md-code-block-copy" data-md-code-copy>${escapeHtml(codeCopyLabel)}</button>
  </div>
  <pre><code class="${className}">${escaped ? text : escapeHtml(text)}\n</code></pre>
</div>`
      },
    },
  },
)

/**
 * Render markdown string to HTML with syntax highlighting.
 */
export function renderMarkdown(content: string): string {
  try {
    return markedWithHighlight.parse(normalizeMathDelimiters(content)) as string
  } catch {
    return content.replace(/\n/g, '<br>')
  }
}

/**
 * Set i18n labels for markdown code copy button.
 */
export function setMarkdownCodeCopyLabels(labels: {
  copy: string
  copied: string
  mermaidChart?: string
  mermaidCode?: string
  mermaidCopy?: string
  mermaidDownload?: string
  mermaidFullscreen?: string
}) {
  codeCopyLabel = labels.copy || 'Copy'
  codeCopiedLabel = labels.copied || 'Copied'
  if (labels.mermaidChart) mermaidChartLabel = labels.mermaidChart
  if (labels.mermaidCode) mermaidCodeLabel = labels.mermaidCode
  if (labels.mermaidCopy) mermaidCopyLabel = labels.mermaidCopy
  if (labels.mermaidDownload) mermaidDownloadLabel = labels.mermaidDownload
  if (labels.mermaidFullscreen) mermaidFullscreenLabel = labels.mermaidFullscreen
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') return
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

/**
 * Handle markdown code copy button clicks in rendered HTML.
 * Returns true when the click target is a markdown copy button.
 */
export async function handleMarkdownCodeCopyClick(event: Event): Promise<boolean> {
  const target = event.target as Element | null
  const copyButton = target?.closest<HTMLElement>('[data-md-code-copy]')
  if (!copyButton) return false

  event.preventDefault()
  event.stopPropagation()

  const block = copyButton.closest('.md-code-block')
  const codeEl = block?.querySelector('pre code')
  const content = codeEl?.textContent?.replace(/\n$/, '') || ''
  if (!content) return true

  try {
    await copyText(content)
    copyButton.textContent = codeCopiedLabel
    copyButton.dataset.copied = 'true'
    window.setTimeout(() => {
      copyButton.textContent = codeCopyLabel
      delete copyButton.dataset.copied
    }, 1200)
  } catch {
    // Ignore copy failures.
  }

  return true
}

/**
 * Handle mermaid block toolbar interactions (tab switch, copy, download, fullscreen).
 * Returns true when the click target is a mermaid toolbar element.
 */
export async function handleMermaidBlockClick(event: Event): Promise<boolean> {
  const target = event.target as Element | null

  // ── Tab switch ──
  const tab = target?.closest<HTMLElement>('[data-md-mermaid-tab]')
  if (tab) {
    event.preventDefault()
    event.stopPropagation()
    const block = tab.closest('.md-mermaid-block')
    if (!block) return true
    const mode = tab.dataset.mdMermaidTab // 'chart' | 'code'
    block.querySelectorAll<HTMLElement>('[data-md-mermaid-tab]').forEach((t) => {
      t.classList.toggle('md-mermaid-tab--active', t.dataset.mdMermaidTab === mode)
    })
    const chart = block.querySelector<HTMLElement>('.md-mermaid-chart')
    const source = block.querySelector<HTMLElement>('.md-mermaid-source')
    if (chart) chart.style.display = mode === 'chart' ? '' : 'none'
    if (source) source.style.display = mode === 'code' ? '' : 'none'
    return true
  }

  // ── Action buttons ──
  const action = target?.closest<HTMLElement>('[data-md-mermaid-action]')
  if (!action) return false

  event.preventDefault()
  event.stopPropagation()
  const block = action.closest('.md-mermaid-block')
  if (!block) return true
  const kind = action.dataset.mdMermaidAction

  if (kind === 'copy') {
    const source = block.querySelector('.md-mermaid-source code')?.textContent?.replace(/\n$/, '') || ''
    if (source) {
      try {
        await copyText(source)
      } catch { /* ignore */ }
    }
    return true
  }

  if (kind === 'download') {
    const svg = block.querySelector<SVGSVGElement>('.mermaid svg')
    if (svg) {
      const serializer = new XMLSerializer()
      const svgStr = serializer.serializeToString(svg)
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mermaid-diagram.svg'
      a.click()
      URL.revokeObjectURL(url)
    }
    return true
  }

  if (kind === 'preview') {
    const svg = block.querySelector<SVGSVGElement>('.mermaid svg')
    if (svg) openMermaidPreview(svg)
    return true
  }

  return true
}

/**
 * Open a fullscreen image-preview overlay for a mermaid SVG.
 * Supports mouse-wheel zoom and a close button.
 */
function openMermaidPreview(sourceSvg: SVGSVGElement): void {
  // Clone the SVG so the original stays untouched
  const svg = sourceSvg.cloneNode(true) as SVGSVGElement
  svg.style.cssText = ''
  svg.removeAttribute('style')

  let scale = 1
  const MIN_SCALE = 0.1
  const MAX_SCALE = 10

  // ── Overlay ──
  const overlay = document.createElement('div')
  overlay.className = 'md-mermaid-preview-overlay'

  // ── Close button ──
  const closeBtn = document.createElement('button')
  closeBtn.className = 'md-mermaid-preview-close'
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

  // ── SVG container ──
  const container = document.createElement('div')
  container.className = 'md-mermaid-preview-container'
  container.appendChild(svg)

  overlay.appendChild(closeBtn)
  overlay.appendChild(container)
  document.body.appendChild(overlay)

  function applyTransform() {
    svg.style.transform = `scale(${scale})`
  }

  function close() {
    window.removeEventListener('keydown', onKey, true)
    overlay.remove()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); close() }
  }

  // Wheel zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta))
    applyTransform()
  }, { passive: false })

  // Click backdrop to close
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close()
  })

  closeBtn.addEventListener('click', close)
  window.addEventListener('keydown', onKey, true)
}

type MermaidModule = typeof import('mermaid')

let mermaidModulePromise: Promise<MermaidModule> | null = null

async function loadMermaid(): Promise<MermaidModule> {
  mermaidModulePromise ??= import('mermaid')
  return mermaidModulePromise
}

function detectDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark'
}

/**
 * Lazy-render Mermaid diagrams in an already rendered markdown container.
 */
export async function renderMermaidInElement(container: ParentNode | null | undefined): Promise<void> {
  if (!container || typeof window === 'undefined') return

  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])'),
  )
  if (nodes.length === 0) return

  // 保存原始源码，供主题切换时重新渲染
  nodes.forEach((node) => {
    if (!node.getAttribute('data-mermaid-source')) {
      node.setAttribute('data-mermaid-source', node.textContent || '')
    }
  })

  try {
    const mermaid = (await loadMermaid()).default
    mermaid.initialize({
      startOnLoad: false,
      theme: detectDarkMode() ? 'dark' : 'default',
    })
    await mermaid.run({
      nodes,
      suppressErrors: true,
    })
  } catch {
    // Ignore Mermaid render failures and keep raw diagram source visible.
  }
}

/**
 * Re-render already processed Mermaid diagrams (e.g. after theme switch).
 */
export async function reRenderMermaidInElement(container: ParentNode | null | undefined): Promise<void> {
  if (!container || typeof window === 'undefined') return

  const processed = Array.from(
    container.querySelectorAll<HTMLElement>('.mermaid[data-processed]'),
  )
  if (processed.length === 0) return

  // 还原源码，清除已渲染状态
  for (const node of processed) {
    const source = node.getAttribute('data-mermaid-source')
    if (source) {
      node.removeAttribute('data-processed')
      node.innerHTML = ''
      node.textContent = source
    }
  }

  await renderMermaidInElement(container)
}
