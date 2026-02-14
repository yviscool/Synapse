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

      // Only apply "( ... )" fallback on non-math parts to avoid nested delimiters.
      const parts = normalizedSegment.split(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+\$)/g)
      return parts
        .map((part, partIndex) => {
          if (partIndex % 2 === 1) return part
          return part.replace(/\(([^()\n]{1,180})\)/g, (raw: string, formula: string, offset: number, source: string) => {
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
      if (MERMAID_LANGS.has(normalizedLang)) {
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
        if (MERMAID_LANGS.has(normalizedLang)) {
          return `<div class="mermaid">${escapeHtml(text).trim()}</div>\n`
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
export function setMarkdownCodeCopyLabels(labels: { copy: string; copied: string }) {
  codeCopyLabel = labels.copy || 'Copy'
  codeCopiedLabel = labels.copied || 'Copied'
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

type MermaidModule = typeof import('mermaid')

let mermaidModulePromise: Promise<MermaidModule> | null = null
let mermaidInitialized = false

async function loadMermaid(): Promise<MermaidModule> {
  mermaidModulePromise ??= import('mermaid')
  return mermaidModulePromise
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

  try {
    const mermaid = (await loadMermaid()).default
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
      })
      mermaidInitialized = true
    }
    await mermaid.run({
      nodes,
      suppressErrors: true,
    })
  } catch {
    // Ignore Mermaid render failures and keep raw diagram source visible.
  }
}
