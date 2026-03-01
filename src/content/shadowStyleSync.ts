/**
 * Shadow DOM 样式同步
 *
 * content script 构建产物会将 <style> 注入到 document.head，
 * 此模块负责将属于插件的样式迁移到 shadow root 内部。
 */

const STYLE_MARKERS = [
  '.z-2147483646',
  '.z-2147483647',
  '.prompt-selector-panel',
  '.composer-panel',
  '.milkdown-host',
  '.synapse-toast-host',
  '.synapse-toast-shell',
  '.synapse-confirm-overlay',
  '.synapse-confirm-shell',
  '--crepe-color-background',
]

function isOwnedStyle(styleNode: HTMLStyleElement): boolean {
  if ((styleNode as HTMLElement).dataset.synapseShadowStyle === '1') return true
  const cssText = styleNode.textContent || ''
  return STYLE_MARKERS.some((marker) => cssText.includes(marker))
}

export function setupShadowStyles(shadowRoot: ShadowRoot): () => void {
  let observer: MutationObserver | null = null

  function moveOwnedStyleToShadow(styleNode: HTMLStyleElement) {
    if (!isOwnedStyle(styleNode)) return
    if (styleNode.parentNode === shadowRoot) return
    ;(styleNode as HTMLElement).dataset.synapseShadowStyle = '1'
    shadowRoot.appendChild(styleNode)
  }

  // 迁移已有样式
  const head = document.head
  if (head) {
    Array.from(head.querySelectorAll('style')).forEach(moveOwnedStyleToShadow)
  }

  // 监听新增样式
  if (head) {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLStyleElement) {
            moveOwnedStyleToShadow(node)
          }
        })
      }
    })
    observer.observe(head, { childList: true, subtree: true })
  }

  return () => {
    observer?.disconnect()
    observer = null
  }
}
