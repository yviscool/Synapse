(() => {
  const BRIDGE_KEY = '__synapseFrameDomBridgeInstalled__'
  const REQ_TYPE = 'synapse:frame-dom-collect'
  const RES_TYPE = 'synapse:frame-dom-result'
  const READY_TYPE = 'synapse:frame-dom-ready'

  if (window[BRIDGE_KEY]) return
  window[BRIDGE_KEY] = true

  // 通知父窗口 bridge 已就绪，便于上层调试/排查注入问题
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        __synapseBridge: true,
        type: READY_TYPE,
        payload: { url: window.location.href },
      }, '*')
    }
  } catch {
    // ignore
  }

  const DEFAULT_SELECTORS = [
    '#extended-response-markdown-content',
    '[data-test-id="message-content"] .markdown-main-panel',
    'main article',
    'article',
    'main',
  ]

  function normalizeText(text, maxLength) {
    if (!text) return ''

    let normalized = String(text)
      .replace(/\u200B/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (typeof maxLength === 'number' && maxLength > 0 && normalized.length > maxLength) {
      normalized = normalized.slice(0, maxLength)
    }

    return normalized
  }

  function collectSnapshot(payload) {
    const selectors = Array.isArray(payload?.selectors) && payload.selectors.length > 0
      ? payload.selectors
      : DEFAULT_SELECTORS
    const maxLength = Number(payload?.maxLength) > 0 ? Number(payload.maxLength) : 160000
    const maxHtmlLength = Number(payload?.maxHtmlLength) > 0 ? Number(payload.maxHtmlLength) : 400000

    let root = null
    for (const selector of selectors) {
      root = document.querySelector(selector)
      if (root) break
    }
    if (!root) root = document.body

    const clone = root.cloneNode(true)
    clone.querySelectorAll('script, style, noscript, template, svg, canvas, button').forEach((el) => el.remove())

    const heading = document.querySelector('h1, h2, h3')
    const title = normalizeText(
      heading?.textContent || document.title || '',
      400,
    )

    const text = normalizeText(clone.textContent || '', maxLength)
    let html = String(clone.innerHTML || '').trim()
    if (html.length > maxHtmlLength) html = html.slice(0, maxHtmlLength)
    return {
      title,
      content: text,
      html,
      url: window.location.href,
    }
  }

  window.addEventListener('message', (event) => {
    const data = event?.data
    if (!data || data.__synapseBridge !== true) return
    if (data.type !== REQ_TYPE || !data.requestId) return

    const response = {
      __synapseBridge: true,
      type: RES_TYPE,
      requestId: data.requestId,
      payload: collectSnapshot(data.payload || {}),
    }

    try {
      if (event.source && typeof event.source.postMessage === 'function') {
        event.source.postMessage(response, '*')
        return
      }
    } catch {
      // ignore
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(response, '*')
    }
  }, true)
})()
