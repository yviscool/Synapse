import Dexie, { Table } from 'dexie'
import type { Prompt, PromptVersion, Category, Tag, Settings } from '@/types/prompt'

export class APMDB extends Dexie {
  prompts!: Table<Prompt, string>
  prompt_versions!: Table<PromptVersion, string>
  categories!: Table<Category, string>
  tags!: Table<Tag, string>
  settings!: Table<Settings, string>

  constructor() {
    super('apm')
    this.version(1).stores({
      prompts: 'id, title, updatedAt, favorite, createdAt',
      prompt_versions: 'id, promptId, createdAt',
      categories: 'id, name, sort',
      tags: 'id, name',
      settings: 'id',
    })
  }
}

export const db = new APMDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  hotkeyOpen: 'Alt+K',
  enableSlash: true,
  enableSites: {},
  panelPos: null,
  theme: 'auto',
  outlineEnabled: true,
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('global')
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return s
}

export async function setSettings(patch: Partial<Settings>) {
  const cur = await getSettings()
  await db.settings.put({ ...cur, ...patch })
}