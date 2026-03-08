export type QwenIntlCodeActionType = 'copy' | 'download'

export function getQwenIntlCodeActionButton(
  block: Element,
  type: QwenIntlCodeActionType,
): HTMLElement | null {
  const iconPattern = type === 'copy' ? 'copy-right' : 'download-02'
  const icon = block.querySelector(
    `use[xlink\\:href*="${iconPattern}"], use[href*="${iconPattern}"]`,
  )
  const byIcon = icon?.closest<HTMLElement>('.qwen-markdown-code-header-action-item') || null
  if (byIcon) return byIcon

  const actions = Array.from(
    block.querySelectorAll<HTMLElement>(
      '.qwen-markdown-code-header-actions .qwen-markdown-code-header-action-item',
    ),
  )
  if (actions.length === 0) return null
  return type === 'copy' ? actions[0] : actions[1] || null
}

export function isQwenIntlSupportedDownloadHref(href: string): boolean {
  return href.startsWith('blob:') || href.startsWith('data:text/plain')
}

export function getQwenIntlSupportedDownloadAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null
  const anchor = target.closest('a[download], a[href]') as HTMLAnchorElement | null
  if (!anchor) return null
  const href = anchor.getAttribute('href') || anchor.href || ''
  return isQwenIntlSupportedDownloadHref(href) ? anchor : null
}

export async function parseQwenIntlDownloadHrefText(href: string): Promise<string | undefined> {
  if (!href) return undefined

  if (href.startsWith('blob:')) {
    try {
      return await fetch(href).then((r) => r.text())
    } catch {
      return undefined
    }
  }

  if (href.startsWith('data:text/plain')) {
    try {
      const payload = href.split(',', 2)[1] || ''
      return decodeURIComponent(payload)
    } catch {
      return undefined
    }
  }

  return undefined
}

export function createQwenIntlDownloadAnchorObserver(timeoutMs: number): {
  promise: Promise<HTMLAnchorElement | null>
  stop: () => void
} {
  let done = false
  let timer: number | undefined
  let observer: MutationObserver | null = null
  let resolvePromise: (anchor: HTMLAnchorElement | null) => void = () => {}

  const finish = (anchor: HTMLAnchorElement | null) => {
    if (done) return
    done = true
    if (timer) window.clearTimeout(timer)
    observer?.disconnect()
    observer = null
    resolvePromise(anchor)
  }

  const promise = new Promise<HTMLAnchorElement | null>((resolve) => {
    resolvePromise = resolve

    if (!document.body) {
      finish(null)
      return
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue
          const anchor = node.matches('a[download], a[href]')
            ? (node as HTMLAnchorElement)
            : node.querySelector<HTMLAnchorElement>('a[download], a[href]')
          if (!anchor) continue
          const supported = getQwenIntlSupportedDownloadAnchor(anchor)
          if (!supported) continue
          finish(supported)
          return
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    timer = window.setTimeout(() => finish(null), timeoutMs)
  })

  return { promise, stop: () => finish(null) }
}
