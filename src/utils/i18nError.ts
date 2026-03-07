import i18n from '@/i18n'

export interface I18nError extends Error {
  readonly isI18nError: true
  readonly i18nKey: string
  readonly i18nParams?: Record<string, unknown>
}

function attachI18nMetadata(
  error: Error,
  key: string,
  params?: Record<string, unknown>,
): I18nError {
  const i18nError = error as I18nError
  Object.defineProperty(i18nError, 'isI18nError', {
    value: true,
    enumerable: false,
  })
  Object.defineProperty(i18nError, 'i18nKey', {
    value: key,
    enumerable: false,
  })

  if (params) {
    Object.defineProperty(i18nError, 'i18nParams', {
      value: params,
      enumerable: false,
    })
  }

  return i18nError
}

export function getI18nErrorMessage(
  key: string,
  params?: Record<string, unknown>,
): string {
  if (params) {
    return i18n.global.t(key, params) as string
  }
  return i18n.global.t(key) as string
}

export function createI18nError(
  key: string,
  params?: Record<string, unknown>,
): Error {
  const error = new Error(getI18nErrorMessage(key, params))
  error.name = 'I18nError'
  return attachI18nMetadata(error, key, params)
}

export function isI18nError(error: unknown): error is I18nError {
  if (!(error instanceof Error)) return false
  const maybeI18nError = error as Partial<I18nError>
  return maybeI18nError.isI18nError === true && typeof maybeI18nError.i18nKey === 'string'
}
