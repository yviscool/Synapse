import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoEnvironmentShape = {
  getWorker: (_moduleId: string, label: string) => Worker
}

type MonacoGlobalScope = typeof globalThis & {
  MonacoEnvironment?: MonacoEnvironmentShape
}

let configured = false

function createWorkerByLabel(label: string): Worker {
  if (label === 'json') return new jsonWorker()
  if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
  if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
  if (label === 'typescript' || label === 'javascript') return new tsWorker()
  return new editorWorker()
}

export function ensureMonacoEnvironment(): void {
  if (configured) return
  const scope = globalThis as MonacoGlobalScope
  scope.MonacoEnvironment = {
    getWorker: (_moduleId, label) => createWorkerByLabel(label),
  }
  configured = true
}
