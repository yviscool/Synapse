import type { SnippetLanguage } from '@/types/snippet'

/**
 * Ordered list of snippet language keys.
 * Used by both SnippetEditor and SnippetList to build language option lists.
 */
export const SNIPPET_LANGUAGES: SnippetLanguage[] = [
  'html', 'css', 'scss', 'less',
  'javascript', 'typescript', 'python', 'java',
  'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'dart', 'lua', 'r', 'scala',
  'sql', 'shell', 'json', 'yaml', 'xml',
  'markdown', 'dockerfile', 'graphql', 'diff', 'text',
]

/**
 * Tailwind CSS classes for language badge colors.
 */
export const LANGUAGE_COLORS: Record<SnippetLanguage, string> = {
  html: 'bg-orange-100 text-orange-700',
  css: 'bg-purple-100 text-purple-700',
  scss: 'bg-pink-100 text-pink-700',
  less: 'bg-purple-100 text-purple-700',
  javascript: 'bg-yellow-100 text-yellow-700',
  typescript: 'bg-blue-100 text-blue-700',
  python: 'bg-blue-100 text-blue-700',
  java: 'bg-red-100 text-red-700',
  c: 'bg-slate-100 text-slate-700',
  cpp: 'bg-slate-100 text-slate-700',
  csharp: 'bg-violet-100 text-violet-700',
  go: 'bg-sky-100 text-sky-700',
  rust: 'bg-orange-100 text-orange-800',
  ruby: 'bg-red-100 text-red-700',
  php: 'bg-indigo-100 text-indigo-700',
  swift: 'bg-orange-100 text-orange-700',
  kotlin: 'bg-violet-100 text-violet-700',
  dart: 'bg-sky-100 text-sky-700',
  lua: 'bg-blue-100 text-blue-800',
  r: 'bg-blue-100 text-blue-700',
  scala: 'bg-red-100 text-red-800',
  sql: 'bg-indigo-100 text-indigo-700',
  shell: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  json: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  yaml: 'bg-red-100 text-red-700',
  xml: 'bg-orange-100 text-orange-700',
  markdown: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  dockerfile: 'bg-sky-100 text-sky-700',
  graphql: 'bg-pink-100 text-pink-700',
  diff: 'bg-green-100 text-green-700',
  text: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
}

/**
 * File extension mapping for download.
 */
export const LANGUAGE_EXTENSIONS: Record<SnippetLanguage, string> = {
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  scala: 'scala',
  sql: 'sql',
  shell: 'sh',
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  markdown: 'md',
  dockerfile: 'Dockerfile',
  graphql: 'graphql',
  diff: 'diff',
  text: 'txt',
}
