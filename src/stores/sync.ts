/**
 * Cloud Synchronization Service
 *
 * This service manages the entire lifecycle of syncing data with a cloud provider.
 */
import { db, getSettings, setSettings } from '@/stores/db'
import * as gdrive from '@/utils/googleDriveApi'
import { searchService } from '@/services/SearchService'
import { MSG } from '@/utils/messaging'


const MAX_BACKUPS_TO_KEEP = 10;

class SyncManager {
  private isSyncing = false

  /**
   * Enables cloud sync with the chosen provider.
   */
  async enableSync(provider: 'google-drive'): Promise<void> {
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
      await setSettings(newSettings)
      await this.triggerSync(true) // Force upload on first sync
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
    await setSettings(newSettings)
  }

  /**
   * Triggers the main sync process.
   */
  async triggerSync(forceUpload = false): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress.')
      return
    }

    this.isSyncing = true
    try {
      const settings = await getSettings()
      if (!settings.syncEnabled || settings.syncProvider !== 'google-drive') {
        throw new Error('Sync is not enabled or provider is not Google Drive.')
      }

      const remoteFiles = await gdrive.listBackupFiles();
      const latestRemoteFile = remoteFiles.length > 0 ? remoteFiles[0] : null;

      const localTimestamp = settings.lastSyncTimestamp || 0
      const remoteTimestamp = latestRemoteFile ? new Date(latestRemoteFile.modifiedTime).getTime() : 0

      if (forceUpload || !latestRemoteFile) {
        console.log('Forcing upload or no remote backup found. Creating new backup...')
        await this.uploadLocalData()
      } else if (localTimestamp > remoteTimestamp) {
        console.log('Local data is newer. Uploading to cloud...')
        await this.uploadLocalData()
      } else if (remoteTimestamp > localTimestamp) {
        console.log('Remote data is newer. Downloading from cloud...')
        await this.downloadRemoteData(latestRemoteFile.id)
        await searchService.buildIndex()
      } else {
        console.log('Local and remote data are in sync.')
      }

      await this.pruneOldBackups();
      await setSettings({ lastSyncTimestamp: new Date().getTime() })

    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Gathers all local data and uploads it to the cloud as a new version.
   */
  private async uploadLocalData(): Promise<void> {
    const exportObject = {
      prompts: await db.prompts.toArray(),
      prompt_versions: await db.prompt_versions.toArray(),
      categories: await db.categories.toArray(),
      tags: await db.tags.toArray(),
      settings: await getSettings(),
    }
    await gdrive.uploadNewBackup(exportObject)
  }

  /**
   * Downloads remote data and replaces local data.
   */
  private async downloadRemoteData(fileId: string): Promise<void> {
    const importedData = await gdrive.downloadBackupFile(fileId)
    // @ts-ignore
    await db.transaction('rw', [db.prompts, db.prompt_versions, db.categories, db.tags, db.settings], async () => {
      if (importedData.prompts) {
        await db.prompts.clear()
        await db.prompts.bulkPut(importedData.prompts)
      }
      if (importedData.prompt_versions) {
        await db.prompt_versions.clear()
        await db.prompt_versions.bulkPut(importedData.prompt_versions)
      }
      if (importedData.categories) {
        await db.categories.clear()
        await db.categories.bulkPut(importedData.categories)
      }
      if (importedData.tags) {
        await db.tags.clear()
        await db.tags.bulkPut(importedData.tags)
      }
      if (importedData.settings) {
        // Preserve local sync settings while applying the rest
        const currentSettings = await getSettings();
        const newSettings = { ...importedData.settings, ...{
          syncEnabled: currentSettings.syncEnabled,
          syncProvider: currentSettings.syncProvider,
          userProfile: currentSettings.userProfile,
        }};
        await db.settings.put(newSettings)
      }
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

  async restoreFromCloudBackup(fileId:string) {
    await this.downloadRemoteData(fileId)
    // Manually trigger a search index rebuild after restoring data.
    await chrome.runtime.sendMessage({ type: MSG.REBUILD_INDEX })
    await setSettings({ lastSyncTimestamp: new Date().getTime() })
  }

  async downloadCloudBackup(fileId: string) {
    return gdrive.downloadBackupFile(fileId);
  }
}

export const syncManager = new SyncManager();
