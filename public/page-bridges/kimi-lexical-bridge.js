(() => {
  const currentScript = document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null

  const CMD_EVENT = currentScript?.dataset?.cmdEvent || 'synapse:kimi-lexical-bridge-command'
  const DATA_EVENT = currentScript?.dataset?.dataEvent || 'synapse:kimi-lexical-bridge-data'
  const READY_EVENT = currentScript?.dataset?.readyEvent || 'synapse:kimi-lexical-bridge-ready'
  const BRIDGE_KEY = currentScript?.dataset?.bridgeKey || '__synapseKimiLexicalBridgeInstalled__'

  const globalWindow = window
  if (globalWindow[BRIDGE_KEY]) return
  globalWindow[BRIDGE_KEY] = true

  const normalizeText = (text) => String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .trimEnd()

  const readRootText = (root) => {
    if (!(root instanceof HTMLElement)) return ''
    return root.innerText || root.textContent || ''
  }

  const createSerializedEditorState = (text) => {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
    const children = (lines.length ? lines : ['']).map((line) => ({
      children: line
        ? [{
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: line,
            type: 'text',
            version: 1,
          }]
        : [],
      direction: null,
      format: '',
      indent: 0,
      textFormat: 0,
      textStyle: '',
      type: 'paragraph',
      version: 1,
    }))

    return {
      root: {
        children,
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
  }

  const findActiveLexicalRoot = () => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (active) {
      const activeRoot = active.closest('[data-lexical-editor="true"]')
      if (activeRoot instanceof HTMLElement) return activeRoot
    }

    const direct = document.querySelector('[data-lexical-editor="true"].chat-input-editor')
    if (direct instanceof HTMLElement) return direct

    const fallback = document.querySelector('[data-lexical-editor="true"]')
    return fallback instanceof HTMLElement ? fallback : null
  }

  const emit = (detail) => {
    globalWindow.dispatchEvent(new CustomEvent(DATA_EVENT, { detail }))
  }

  globalWindow.addEventListener(CMD_EVENT, (event) => {
    const detail = event && event.detail ? event.detail : {}
    if (detail.cmd !== 'replace-history-input') return

    const token = detail.token || ''
    const expectedText = normalizeText(detail.text || '')
    const serializedState = createSerializedEditorState(detail.text || '')
    const root = findActiveLexicalRoot()

    if (!root) {
      emit({ token, ok: false, reason: 'root-miss', text: '' })
      return
    }

    const editor = root.__lexicalEditor
    if (!editor || typeof editor.parseEditorState !== 'function' || typeof editor.setEditorState !== 'function') {
      emit({ token, ok: false, reason: 'editor-miss', text: readRootText(root) })
      return
    }

    try {
      const editorState = editor.parseEditorState(serializedState)
      root.focus()
      editor.setEditorState(editorState, { tag: 'history-merge' })
      if (typeof editor.focus === 'function') {
        editor.focus(undefined, { defaultSelection: 'rootEnd' })
      } else {
        root.focus()
      }

      const appliedText = normalizeText(readRootText(root))
      emit({
        token,
        ok: appliedText === expectedText,
        reason: appliedText === expectedText ? 'ok' : 'mismatch',
        text: appliedText,
      })
    } catch (error) {
      emit({
        token,
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        text: normalizeText(readRootText(root)),
      })
    }
  }, true)

  globalWindow.dispatchEvent(new CustomEvent(READY_EVENT))
})()
