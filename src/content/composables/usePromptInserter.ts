/**
 * 提示词插入逻辑
 *
 * 负责将提示词内容插入到 AI 平台的输入框中。
 * 包含：目标元素查找、指纹重连、重试机制、剪贴板回退。
 */
import { appendAtEnd, findActiveInput } from '@/utils/inputAdapter'

const TRACE_PREFIX = '[SynapseTrace]'

export type InsertTraceFn = (step: string, payload?: Record<string, unknown>) => void

export interface OpenerFingerprint {
  id: string
  className: string
  tagName: string
}

type InputTarget = ReturnType<typeof findActiveInput>

export function createInsertTrace(meta: Record<string, unknown>): InsertTraceFn {
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const start = performance.now()
  console.log(`${TRACE_PREFIX}[${traceId}] +0.00ms insert.begin`, meta)

  return (step, payload = {}) => {
    const elapsedMs = Number((performance.now() - start).toFixed(2))
    console.log(`${TRACE_PREFIX}[${traceId}] +${elapsedMs}ms ${step}`, payload)
  }
}

function describeTarget(target: InputTarget | null) {
  if (!target) return { exists: false }
  const el = target.el
  return {
    exists: true,
    kind: target.kind,
    id: el.id || '',
    className: el.className || '',
    isConnected: el.isConnected,
    isEditable: target.kind === 'textarea' ? !(el as HTMLTextAreaElement).readOnly : el.isContentEditable,
    rectCount: el.getClientRects().length,
  }
}

function isUsableTarget(target: InputTarget | null): target is NonNullable<InputTarget> {
  if (!target) return false
  const el = target.el
  if (!el || !el.isConnected) return false
  if (target.kind === 'textarea') {
    const textarea = el as HTMLTextAreaElement
    if (textarea.disabled || textarea.readOnly) return false
  } else if (!el.isContentEditable) {
    return false
  }
  return el.getClientRects().length > 0
}

function resolveInsertTarget(
  opener: InputTarget | null,
  fingerprint: OpenerFingerprint | null,
  selectorHints: string[],
  trace?: InsertTraceFn,
): InputTarget | null {
  trace?.('target.resolve.start', {
    opener: describeTarget(opener),
    fingerprint,
  })

  // 1. 直接使用缓存的 opener
  if (isUsableTarget(opener)) {
    trace?.('target.resolve.useOpener')
    opener!.el.focus()
    return opener
  }

  // 2. 指纹重连
  if (fingerprint) {
    const { id, className, tagName } = fingerprint
    let candidate: HTMLElement | null = null

    if (id) candidate = document.getElementById(id)

    if (!candidate && className) {
      const selector = `${tagName}.${className.split(' ').filter(c => c.trim()).join('.')}`
      try { candidate = document.querySelector(selector) } catch { /* ignore */ }
    }

    if (candidate) {
      const newTarget = candidate.tagName === 'TEXTAREA'
        ? { kind: 'textarea' as const, el: candidate as HTMLTextAreaElement }
        : { kind: 'contenteditable' as const, el: candidate }
      if (isUsableTarget(newTarget)) {
        trace?.('target.resolve.reconnected', { id: candidate.id })
        newTarget.el.focus()
        return newTarget
      }
    }
  }

  // 3. 启发式搜索
  const active = findActiveInput(selectorHints)
  if (isUsableTarget(active)) {
    trace?.('target.resolve.heuristicFound')
    active!.el.focus()
    return active
  }

  trace?.('target.resolve.none')
  return null
}

function appendToTarget(target: InputTarget, content: string, trace?: InsertTraceFn): boolean {
  if (!target) {
    trace?.('append.skip.noTarget')
    return false
  }
  trace?.('append.try', describeTarget(target))
  const ok = appendAtEnd(target, content, { trace })
  trace?.('append.done', { ok, target: describeTarget(target) })
  return ok
}

/**
 * 尝试插入内容到输入框，含重试机制
 */
export function insertWithRetry(
  content: string,
  opener: InputTarget | null,
  fingerprint: OpenerFingerprint | null,
  selectorHints: string[],
  trace?: InsertTraceFn,
): boolean {
  const primary = resolveInsertTarget(opener, fingerprint, selectorHints, trace)
  if (appendToTarget(primary, content, trace)) {
    trace?.('insert.primary.ok')
    return true
  }

  const retryTarget = findActiveInput(selectorHints)
  trace?.('insert.retry.target', describeTarget(retryTarget))
  if (!retryTarget) {
    trace?.('insert.retry.miss')
    return false
  }
  if (primary && retryTarget.el === primary.el) {
    trace?.('insert.retry.sameTarget')
    return false
  }
  const ok = appendToTarget(retryTarget, content, trace)
  trace?.('insert.retry.done', { ok })
  return ok
}
