(() => {
  const currentScript = document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null

  const CMD_EVENT = currentScript?.dataset?.cmdEvent || 'synapse:qwen-intl-bridge-command'
  const DATA_EVENT = currentScript?.dataset?.dataEvent || 'synapse:qwen-intl-bridge-data'
  const BRIDGE_KEY = currentScript?.dataset?.bridgeKey || '__synapseQwenIntlBridgeInstalled__'
  const READY_EVENT = currentScript?.dataset?.readyEvent || 'synapse:qwen-intl-bridge-ready'

  const globalWindow = window
  if (globalWindow[BRIDGE_KEY]) return
  globalWindow[BRIDGE_KEY] = true
  globalWindow.dispatchEvent(new CustomEvent(READY_EVENT))

  const state = {
    token: '',
    mode: '',
    objectUrlTextMap: new Map(),
  }

  const emit = (text, type) => {
    if (!state.token || !state.mode) return
    globalWindow.dispatchEvent(new CustomEvent(DATA_EVENT, {
      detail: {
        token: state.token,
        mode: state.mode,
        type,
        text: typeof text === 'string' ? text : '',
      },
    }))
  }

  const maybeDecodeDataText = (href) => {
    if (!href || !href.startsWith('data:text/plain')) return ''
    const idx = href.indexOf(',')
    if (idx < 0) return ''
    const meta = href.slice(0, idx).toLowerCase()
    const payload = href.slice(idx + 1)
    try {
      if (meta.includes(';base64')) {
        try {
          return decodeURIComponent(escape(atob(payload)))
        } catch {
          return atob(payload)
        }
      }
      return decodeURIComponent(payload)
    } catch {
      return ''
    }
  }

  const emitFromHref = (href, source) => {
    if (state.mode !== 'download' || !state.token) return false
    if (!href) return false

    if (href.startsWith('blob:')) {
      const text = state.objectUrlTextMap.get(href)
      if (typeof text === 'string' && text.trim()) {
        emit(text, source || 'download-blob')
        return true
      }
      return false
    }

    if (href.startsWith('data:text/plain')) {
      const text = maybeDecodeDataText(href)
      if (text.trim()) {
        emit(text, source || 'download-data')
        return true
      }
    }

    return false
  }

  globalWindow.addEventListener(CMD_EVENT, (event) => {
    const detail = event && event.detail ? event.detail : {}
    if (detail.cmd === 'arm') {
      state.token = detail.token || ''
      state.mode = detail.mode || ''
      return
    }
    if (detail.cmd === 'disarm') {
      state.token = ''
      state.mode = ''
    }
  }, true)

  document.addEventListener('copy', (event) => {
    if (state.mode !== 'copy' || !state.token) return
    const text = event && event.clipboardData ? event.clipboardData.getData('text/plain') : ''
    if (text && text.trim()) emit(text, 'copy-event')
  }, true)

  if (navigator.clipboard && navigator.clipboard.writeText) {
    const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = async (text) => {
      if (state.mode === 'copy' && state.token && text && String(text).trim()) {
        emit(String(text), 'clipboard-write')
      }
      return await originalWriteText(text)
    }
  }

  const originalCreateObjectURL = URL.createObjectURL.bind(URL)
  URL.createObjectURL = (obj) => {
    const url = originalCreateObjectURL(obj)
    try {
      if (obj && typeof obj.text === 'function') {
        Promise.resolve(obj.text()).then((text) => {
          if (typeof text === 'string') {
            state.objectUrlTextMap.set(url, text)
          }
        }).catch(() => {})
      }
    } catch {
      // ignore
    }
    return url
  }

  const originalAnchorClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function(...args) {
    try {
      const href = this.getAttribute('href') || this.href || ''
      emitFromHref(href, 'anchor-click')
    } catch {
      // ignore
    }
    return originalAnchorClick.apply(this, args)
  }

  document.addEventListener('click', (event) => {
    const target = event && event.target ? event.target : null
    const anchor = target && target.closest ? target.closest('a[href], a[download]') : null
    if (!anchor) return
    const href = anchor.getAttribute('href') || anchor.href || ''
    emitFromHref(href, 'dom-click')
  }, true)
})()
