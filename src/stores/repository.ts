import { db, DEFAULT_SETTINGS } from './db'
import type { Prompt, PromptVersion, Category, Tag, Settings } from '@/types/prompt'
import { MSG } from '@/utils/messaging'
import { createSafePrompt } from '@/utils/promptUtils'
import type { Dexie, Transaction } from 'dexie'

// A simple, typed event emitter (a tiny version of 'mitt')
type EventType = 'promptsChanged' | 'tagsChanged' | 'categoriesChanged' | 'settingsChanged' | 'allChanged'
type Handler = (data?: any) => void
const allEvents = new Map<EventType, Handler[]>()

const events = {
  on(type: EventType, handler: Handler) {
    const handlers = allEvents.get(type)
    if (handlers) {
      handlers.push(handler)
    } else {
      allEvents.set(type, [handler])
    }
  },
  off(type: EventType, handler: Handler) {
    const handlers = allEvents.get(type)
    if (handlers) {
      handlers.splice(handlers.indexOf(handler) >>> 0, 1)
    }
  },
  emit(type: EventType, evt?: any) {
    (allEvents.get(type) || []).forEach((handler) => { handler(evt) });
    if (type !== 'allChanged') {
      (allEvents.get('allChanged') || []).forEach((handler) => { handler(evt) });
    }
  },
}

/**
 * A wrapper for database write operations that ensures notifications are sent
 * only after the transaction is successfully committed.
 */
async function withCommitNotification(
  tables: (keyof typeof db | Dexie.Table)[],
  operation: (trans: Transaction) => Promise<any>,
  eventType: EventType,
  eventData?: any,
) {
  try {
    const result = await db.transaction('rw', tables as Dexie.Table[], async (trans) => {
      const opResult = await operation(trans)

      trans.on('complete', async () => {
        console.log(`[Repository] Transaction completed. Emitting '${eventType}'.`)
        events.emit(eventType, eventData)

        // For large-scale changes, we now explicitly send all data to the background
        // to rebuild its index, avoiding stale data issues.
        if (eventType === 'allChanged') {
          const [prompts, tags] = await Promise.all([db.prompts.toArray(), db.tags.toArray()])
          chrome.runtime.sendMessage({
            type: MSG.REBUILD_INDEX_WITH_DATA,
            data: { prompts, tags },
          })
        } else {
          // For smaller changes, a generic update notification is sufficient.
          chrome.runtime.sendMessage({
            type: MSG.DATA_UPDATED,
            data: { scope: eventType.replace('Changed', ''), version: Date.now().toString() },
          })
        }
      })

      trans.on('error', (err) => {
        console.error('[Repository] Transaction failed.', err)
      })

      return opResult
    })
    return { ok: true, data: result }
  } catch (error) {
    console.error(`[Repository] Error during transaction for event '${eventType}':`, error)
    return { ok: false, error }
  }
}

// --- Public Repository API ---

export const repository = {
  events,

  // == Prompts ==
  async updatePrompt(id: string, patch: Partial<Prompt>): Promise<{ ok: boolean; error?: any }> {
    if (!patch.updatedAt) {
      patch.updatedAt = Date.now()
    }
    return withCommitNotification(
      ['prompts'],
      () => db.prompts.update(id, patch),
      'promptsChanged'
    )
  },

  async savePrompt(promptData: Partial<Prompt>, tagNames: string[], changeNote?: string): Promise<{ ok: boolean, error?: any }> {
    return withCommitNotification(
      ['prompts', 'tags', 'prompt_versions'],
      async () => {
        // 1. Resolve Tags
        const tagIds: string[] = []
        if (tagNames.length > 0) {
          const existingTags = await db.tags.where('name').anyOf(tagNames).toArray()
          const existingTagsMap = new Map(existingTags.map(t => [t.name, t.id]))
          for (const name of tagNames) {
            if (existingTagsMap.has(name)) {
              tagIds.push(existingTagsMap.get(name)!)
            } else {
              const newTag = { id: crypto.randomUUID(), name }
              await db.tags.add(newTag)
              tagIds.push(newTag.id)
            }
          }
        }

        // 2. Prepare Prompt
        const isNewPrompt = !promptData.id
        const safePrompt = createSafePrompt({ ...promptData, tagIds })

        // 3. Handle Versioning
        if (!isNewPrompt && promptData.content) {
          const originalPrompt = await db.prompts.get(safePrompt.id!)
          if (originalPrompt && originalPrompt.content !== promptData.content) {
            const version: PromptVersion = {
              id: crypto.randomUUID(),
              promptId: safePrompt.id!,
              content: originalPrompt.content, // Save the *old* content as a version
              note: changeNote || '内容更新',
              parentVersionId: originalPrompt.currentVersionId || null,
              createdAt: Date.now()
            }
            await db.prompt_versions.add(version)
            safePrompt.currentVersionId = version.id
          }
        }

        // 4. Add or Update Prompt
        await db.prompts.put(safePrompt)
      },
      'allChanged' // Use allChanged to ensure tags and prompts are updated everywhere
    )
  },

  async deletePrompt(id: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['prompts', 'prompt_versions'],
      async () => {
        await db.prompts.delete(id)
        await db.prompt_versions.where('promptId').equals(id).delete()
      },
      'promptsChanged'
    )
  },

  async mergePrompts(
    promptsToImport: Prompt[],
    targetCategoryIds: string[],
    additionalTagsFromModal: string[],
  ): Promise<{ ok: boolean, data?: { importedCount: number; skippedCount: number }, error?: any }> {
    return withCommitNotification(
      ['prompts', 'tags'],
      async () => {
        const existingTitles = new Set((await db.prompts.toArray()).map(p => p.title))
        const newPrompts: Prompt[] = []
        const allTagNames = new Set<string>()
        additionalTagsFromModal.forEach(t => allTagNames.add(t))
        promptsToImport.forEach((p) => {
          if (Array.isArray(p.tagIds)) {
            p.tagIds.forEach(tagName => allTagNames.add(String(tagName)))
          }
        })
        const tagNameToIdMap = new Map<string, string>()
        const tagNamesArray = [...allTagNames]
        if (tagNamesArray.length > 0) {
          const existingTags = await db.tags.where('name').anyOf(tagNamesArray).toArray()
          existingTags.forEach(tag => tagNameToIdMap.set(tag.name, tag.id))
          for (const name of tagNamesArray) {
            if (!tagNameToIdMap.has(name)) {
              const newTag = { id: crypto.randomUUID(), name }
              await db.tags.add(newTag)
              tagNameToIdMap.set(name, newTag.id)
            }
          }
        }
        for (const p of promptsToImport) {
          if (!p.title || existingTitles.has(p.title)) {
            continue
          }
          const tagIdsFromFile: string[] = []
          if (Array.isArray(p.tagIds)) {
            p.tagIds.forEach((tagName) => {
              const id = tagNameToIdMap.get(String(tagName))
              if (id) tagIdsFromFile.push(id)
            })
          }
          const tagIdsFromModal: string[] = additionalTagsFromModal.map(name => tagNameToIdMap.get(name)).filter(Boolean) as string[]
          const finalTagIds = [...new Set([...tagIdsFromFile, ...tagIdsFromModal])]
          const newPrompt = createSafePrompt({
            title: p.title,
            content: p.content,
            categoryIds: targetCategoryIds,
            tagIds: finalTagIds,
            favorite: false,
          })
          newPrompt.id = crypto.randomUUID()
          newPrompts.push(newPrompt)
          existingTitles.add(newPrompt.title)
        }
        if (newPrompts.length > 0) {
          await db.prompts.bulkAdd(newPrompts)
        }
        return {
          importedCount: newPrompts.length,
          skippedCount: promptsToImport.length - newPrompts.length,
        }
      },
      'allChanged'
    )
  },

  // == Categories ==
  async addCategory(category: Pick<Category, 'name' | 'icon'>): Promise<{ ok: boolean; error?: any }> {
    const newCategory: Category = { ...category, id: crypto.randomUUID(), sort: 0 }
    return withCommitNotification(
      ['categories'],
      () => db.categories.add(newCategory),
      'categoriesChanged'
    )
  },

  async updateCategory(id: string, patch: Partial<Category>): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['categories'],
      () => db.categories.update(id, patch),
      'categoriesChanged'
    )
  },

  async deleteCategory(id: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['categories', 'prompts'],
      async () => {
        await db.categories.delete(id)
        // Prompts are now un-categorized instead of being deleted.
        const promptsToUpdate = await db.prompts.where('categoryIds').equals(id).toArray()
        const updates = promptsToUpdate.map(prompt => ({
          key: prompt.id,
          changes: { categoryIds: prompt.categoryIds.filter(catId => catId !== id) }
        }));
        if (updates.length > 0) {
          await db.prompts.bulkUpdate(updates);
        }
      },
      'allChanged'
    )
  },

  async deletePromptsByCategory(categoryId: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['prompts', 'prompt_versions'],
      async () => {
        const promptsToDelete = await db.prompts.where('categoryIds').equals(categoryId).toArray();
        if (promptsToDelete.length === 0) return;

        const promptIds = promptsToDelete.map(p => p.id);
        await db.prompts.bulkDelete(promptIds);
        await db.prompt_versions.where('promptId').anyOf(promptIds).delete();
      },
      'allChanged'
    );
  },

  async deleteCategoryAndPrompts(categoryId: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['categories', 'prompts', 'prompt_versions'],
      async () => {
        // First, delete the prompts and their versions
        const promptsToDelete = await db.prompts.where('categoryIds').equals(categoryId).toArray();
        if (promptsToDelete.length > 0) {
          const promptIds = promptsToDelete.map(p => p.id);
          await db.prompts.bulkDelete(promptIds);
          await db.prompt_versions.where('promptId').anyOf(promptIds).delete();
        }
        // Then, delete the category itself
        await db.categories.delete(categoryId);
      },
      'allChanged'
    );
  },

  async deletePromptsByTagsInCategory(categoryId: string, tagIds: string[]): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['prompts', 'prompt_versions'],
      async () => {
        if (tagIds.length === 0) return;

        const promptsToDelete = await db.prompts
          .where('categoryIds').equals(categoryId)
          .filter(prompt => tagIds.some(tagId => prompt.tagIds.includes(tagId)))
          .toArray();
        
        if (promptsToDelete.length === 0) return;

        const promptIds = promptsToDelete.map(p => p.id);
        await db.prompts.bulkDelete(promptIds);
        await db.prompt_versions.where('promptId').anyOf(promptIds).delete();
      },
      'allChanged'
    );
  },

  async updateCategoryOrder(categories: Category[]): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['categories'],
      () => db.categories.bulkPut(categories),
      'categoriesChanged'
    )
  },

  // == Tags ==
  // findOrCreateTags is now internal to savePrompt

  // == Versions ==
  async revertToVersion(promptId: string, versionId: string, currentUnsavedContent: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['prompts', 'prompt_versions'],
      async () => {
        const versionToRestore = await db.prompt_versions.get(versionId)
        if (!versionToRestore || versionToRestore.promptId !== promptId) throw new Error('版本不存在或不匹配')

        const prompt = await db.prompts.get(promptId)
        if (!prompt) throw new Error('Prompt 不存在')

        // Create a backup of the current state before reverting
        await repository.createVersion(promptId, currentUnsavedContent, '自动备份：恢复前状态', prompt.currentVersionId)

        // Update the main prompt content
        await db.prompts.update(promptId, {
          content: versionToRestore.content,
          currentVersionId: versionId,
          updatedAt: Date.now()
        })
      },
      'promptsChanged'
    )
  },

  async deleteVersion(versionId: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['prompt_versions'],
      async () => {
        const version = await db.prompt_versions.get(versionId)
        if (!version) throw new Error('版本不存在')

        const versions = await db.prompt_versions.where('promptId').equals(version.promptId).toArray()
        if (versions.length <= 1) throw new Error('不能删除最后一个版本')

        await db.prompt_versions.delete(versionId)
      },
      'promptsChanged'
    )
  },

  // == Settings ==
  async setSettings(settings: Settings): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ['settings'],
      () => db.settings.put(settings),
      'settingsChanged'
    )
  },

  // == Data Management ==
  async importDataFromBackup(importedData: any): Promise<{ ok:boolean; error?: any }> {
    return withCommitNotification(
      [db.prompts, db.prompt_versions, db.categories, db.tags, db.settings],
      async () => {
        const currentSettings = await db.settings.get('global')
        await db.prompts.clear()
        await db.prompt_versions.clear()
        await db.categories.clear()
        await db.tags.clear()
        if (importedData.prompts) await db.prompts.bulkPut(importedData.prompts)
        if (importedData.prompt_versions) await db.prompt_versions.bulkPut(importedData.prompt_versions)
        if (importedData.categories) await db.categories.bulkPut(importedData.categories)
        if (importedData.tags) await db.tags.bulkPut(importedData.tags)
        const settingsToApply = importedData.settings || { ...DEFAULT_SETTINGS }
        if (currentSettings) {
            settingsToApply.syncEnabled = currentSettings.syncEnabled
            settingsToApply.syncProvider = currentSettings.syncProvider
            settingsToApply.userProfile = currentSettings.userProfile
            settingsToApply.lastSyncTimestamp = currentSettings.lastSyncTimestamp
        }
        await db.settings.put(settingsToApply)
      },
      'allChanged'
    )
  },

  async resetAllData(): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      [db.prompts, db.prompt_versions, db.categories, db.tags, db.settings],
      async () => {
        const currentSettings = await db.settings.get('global')
        await db.prompts.clear()
        await db.prompt_versions.clear()
        await db.categories.clear()
        await db.tags.clear()
        await db.settings.clear()

        const newSettings: Settings = {
          ...DEFAULT_SETTINGS,
          id: 'global', // Explicitly set the key path
        }
        if (currentSettings) {
            newSettings.syncEnabled = currentSettings.syncEnabled
            newSettings.syncProvider = currentSettings.syncProvider
            newSettings.userProfile = currentSettings.userProfile
            newSettings.lastSyncTimestamp = currentSettings.lastSyncTimestamp
        }
        await db.settings.put(newSettings)
      },
      'allChanged'
    )
  }
}
