import type { OutlineStrategy } from '../../site-configs'
import type { OutlineItem } from '../types'
import { scanDeepSeekOutline } from './deepseek'

export type OutlineScanStrategy = (target: HTMLElement | null) => OutlineItem[]

export const outlineStrategies: Record<OutlineStrategy, OutlineScanStrategy> = {
  deepseek: scanDeepSeekOutline,
}
