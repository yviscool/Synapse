export const MSG = {
  OPEN_PANEL: 'APM/OPEN_PANEL',
  INSERT_PROMPT: 'APM/INSERT_PROMPT',
  APPLY_SETTINGS: 'APM/APPLY_SETTINGS',
  DOWNLOAD_FILE: 'APM/DOWNLOAD_FILE',
} as const

export type MessageType = typeof MSG[keyof typeof MSG]

export interface RuntimeMessage<T = any> {
  type: MessageType
  data?: T
}