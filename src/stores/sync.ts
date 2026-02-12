/**
 * Cloud Synchronization Service
 *
 * This service manages the entire lifecycle of syncing data with a cloud provider.
 */
import { db, getSettings } from '@/stores/db'
import { rebuildPromptSearchIndex } from '@/stores/promptSearch'
import { getDefaultCategories } from '@/utils/categoryUtils'
import { repository } from '@/stores/repository'
import * as gdrive from '@/utils/googleDriveApi'
import type { Category, Prompt, PromptVersion, Settings, Tag } from '@/types/prompt'


const MAX_BACKUPS_TO_KEEP = 10;

type SyncAction = 'uploaded' | 'downloaded' | 'noop' | 'skipped-empty'

export interface SyncRunResult {
  action: SyncAction
}

interface SyncPayload {
  prompts: Prompt[]
  prompt_versions: PromptVersion[]
  categories: Category[]
  tags: Tag[]
  settings: Settings
}

type BackupImportData = {
  prompts?: Prompt[]
  prompt_versions?: PromptVersion[]
  categories?: Category[]
  tags?: Tag[]
  settings?: Partial<Settings>
}

class SyncManager {
  private isSyncing = false

  /**
   * Enables cloud sync with the chosen provider.
   */
  async enableSync(provider: 'google-drive'): Promise<SyncRunResult> {
    if (provider !== 'google-drive') {
      throw new Error('Only Google Drive is supported at the moment.')
    }

    try {
      const profile = await gdrive.getUserProfile()
      const newSettings = {
        syncEnabled: true,
        syncProvider: provider,
        userProfile: {
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        },
      }
      const currentSettings = await getSettings()
      await repository.setSettings({ ...currentSettings, ...newSettings })
      return await this.triggerSync()
    } catch (error) {      
      console.error('Failed to enable sync:', error)
      // Rollback settings if enabling sync fails
      await this.disconnect()
      throw error // re-throw to be caught by UI
    }
  }

  /**
   * Disables cloud sync and clears related settings.
   */
  async disconnect(): Promise<void> {
    const newSettings = {
      syncEnabled: false,
      syncProvider: undefined,
      userProfile: undefined,
      lastSyncTimestamp: undefined,
    }
    const currentSettings = await getSettings()
    await repository.setSettings({ ...currentSettings, ...newSettings })
  }

  /**
   * Triggers the main sync process.
   */
  async triggerSync(forceUpload = false): Promise<SyncRunResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress.')
      return { action: 'noop' }
    }

    this.isSyncing = true
    try {
      const settings = await getSettings()
      if (!settings.syncEnabled || settings.syncProvider !== 'google-drive') {
        throw new Error('Sync is not enabled or provider is not Google Drive.')
      }

      const [remoteFiles, localPayload] = await Promise.all([
        gdrive.listBackupFiles(),
        this.buildLocalSyncPayload(),
      ])
      const latestRemoteFile = remoteFiles.length > 0 ? remoteFiles[0] : null;
      const hasMeaningfulLocalData = this.hasMeaningfulLocalData(localPayload)

      const localTimestamp = settings.lastSyncTimestamp || 0
      const remoteTimestamp = latestRemoteFile ? new Date(latestRemoteFile.modifiedTime).getTime() : 0

      if (forceUpload) {
        if (!hasMeaningfulLocalData) {
          console.log('Local data is empty. Skipping forced empty backup.')
          return { action: 'skipped-empty' }
        }
        console.log('Forcing upload to cloud...')
        await this.uploadLocalData(localPayload)
        await this.pruneOldBackups();
        await this.updateLastSyncTimestamp()
        return { action: 'uploaded' }
      }

      if (!latestRemoteFile) {
        if (!hasMeaningfulLocalData) {
          console.log('No remote backup and no meaningful local data. Skipping initial empty backup.')
          return { action: 'skipped-empty' }
        }
        console.log('No remote backup found. Uploading local data...')
        await this.uploadLocalData(localPayload)
        await this.pruneOldBackups();
        await this.updateLastSyncTimestamp()
        return { action: 'uploaded' }
      }

      if (localTimestamp > remoteTimestamp) {
        if (!hasMeaningfulLocalData) {
          console.log('Local data is empty. Skipping upload of empty snapshot.')
          return { action: 'skipped-empty' }
        }
        console.log('Local data is newer. Uploading to cloud...')
        await this.uploadLocalData(localPayload)
        await this.pruneOldBackups();
        await this.updateLastSyncTimestamp()
        return { action: 'uploaded' }
      }

      if (remoteTimestamp > localTimestamp) {
        console.log('Remote data is newer. Downloading from cloud...')
        await this.downloadRemoteData(latestRemoteFile.id)
        await this.updateLastSyncTimestamp()
        return { action: 'downloaded' }
      }

      console.log('Local and remote data are in sync.')
      await this.updateLastSyncTimestamp()
      return { action: 'noop' }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Gathers all local data and uploads it to the cloud as a new version.
   */
  private async uploadLocalData(exportObject?: SyncPayload): Promise<void> {
    const payload = exportObject || await this.buildLocalSyncPayload()
    if (!this.hasMeaningfulLocalData(payload)) {
      console.log('Skip uploading empty backup payload.')
      return
    }
    await gdrive.uploadNewBackup(payload)
  }

  private async buildLocalSyncPayload(): Promise<SyncPayload> {
    const [prompts, prompt_versions, categories, tags, settings] = await Promise.all([
      db.prompts.toArray(),
      db.prompt_versions.toArray(),
      db.categories.toArray(),
      db.tags.toArray(),
      getSettings(),
    ])
    return { prompts, prompt_versions, categories, tags, settings }
  }

  private isDefaultOnlyCategoryState(categories: Category[]): boolean {
    const defaults = getDefaultCategories()
    if (categories.length !== defaults.length) {
      return false
    }

    const defaultMap = new Map(defaults.map(category => [category.id, category]))
    for (const category of categories) {
      const defaultCategory = defaultMap.get(category.id)
      if (!defaultCategory) {
        return false
      }
      if (
        category.sort !== defaultCategory.sort
        || category.icon !== defaultCategory.icon
      ) {
        return false
      }
    }

    return true
  }

  private hasMeaningfulLocalData(payload: SyncPayload): boolean {
    if (
      payload.prompts.length > 0
      || payload.prompt_versions.length > 0
      || payload.tags.length > 0
    ) {
      return true
    }

    return !this.isDefaultOnlyCategoryState(payload.categories)
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const currentSettings = await getSettings()
    await repository.setSettings({ ...currentSettings, lastSyncTimestamp: Date.now() })
  }

  /**
   * Downloads remote data and replaces local data.
   */
  private async downloadRemoteData(fileId: string): Promise<void> {
    const importedData = await gdrive.downloadBackupFile<BackupImportData>(fileId)
    if (!importedData || typeof importedData !== 'object') {
      throw new Error('Invalid backup payload from cloud.')
    }

    const prompts = Array.isArray(importedData.prompts) ? importedData.prompts : []
    const promptVersions = Array.isArray(importedData.prompt_versions) ? importedData.prompt_versions : []
    const categories = Array.isArray(importedData.categories) ? importedData.categories : []
    const tags = Array.isArray(importedData.tags) ? importedData.tags : []
    const importedSettings = importedData.settings && typeof importedData.settings === 'object'
      ? importedData.settings
      : null

    await db.transaction('rw', [db.prompts, db.prompt_versions, db.categories, db.tags, db.settings, db.prompt_search_index], async () => {
      await db.prompts.clear()
      if (prompts.length > 0) {
        await db.prompts.bulkPut(prompts)
      }

      await db.prompt_versions.clear()
      if (promptVersions.length > 0) {
        await db.prompt_versions.bulkPut(promptVersions)
      }

      await db.categories.clear()
      if (categories.length > 0) {
        await db.categories.bulkPut(categories)
      }

      await db.tags.clear()
      if (tags.length > 0) {
        await db.tags.bulkPut(tags)
      }

      const currentSettings = await getSettings();
      const newSettings = {
        ...currentSettings,
        ...(importedSettings || {}),
        syncEnabled: currentSettings.syncEnabled,
        syncProvider: currentSettings.syncProvider,
        userProfile: currentSettings.userProfile,
      };
      await db.settings.put(newSettings)

      await rebuildPromptSearchIndex()
    })
  }

  /**
   * Deletes old backups, keeping only the most recent ones.
   */
  private async pruneOldBackups(): Promise<void> {
    const remoteFiles = await gdrive.listBackupFiles();
    if (remoteFiles.length > MAX_BACKUPS_TO_KEEP) {
      const filesToDelete = remoteFiles.slice(MAX_BACKUPS_TO_KEEP);
      console.log(`Pruning ${filesToDelete.length} old backups...`);
      for (const file of filesToDelete) {
        await gdrive.deleteFile(file.id);
      }
    }
  }

  // --- Methods for UI --- 

  async listCloudBackups() {
    return gdrive.listBackupFiles();
  }

  async restoreFromCloudBackup(fileId: string) {
    const data = await this.downloadCloudBackup(fileId);
    const { ok, error } = await repository.importDataFromBackup(data);
    if (!ok) {
      throw error;
    }
  }

  async downloadCloudBackup(fileId: string) {
    return gdrive.downloadBackupFile<BackupImportData>(fileId);
  }

  async deleteCloudBackup(fileId: string) {
    return gdrive.deleteFile(fileId);
  }
}

export const syncManager = new SyncManager();
