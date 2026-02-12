export default {
  title: "Settings",
  language: {
    title: "Language",
    localeNames: {
      zhCN: "中文",
      en: "English",
      jaJP: "日本語",
      ruRU: "Русский",
    },
    followSystem: "Follow System",
    currentSystem: "Current system language is {lang}",
  },
  sort: {
    label: "Sort By",
    updatedAt: "Recently Updated",
    createdAt: "Created Time",
    byTitle: "Title",
  },
  sync: {
    title: "Cloud Sync",
    status: {
      enabled: "Sync Enabled",
      connected: "Connected",
      syncing: "Syncing...",
      syncNow: "Sync Now",
      disconnect: "Disconnect",
      disconnecting: "Disconnecting...",
      lastSync: "Last sync: {time}",
      justNow: "Just now",
      minutesAgo: "{minutes} mins ago",
      hoursAgo: "{hours} hours ago",
      daysAgo: "{days} days ago",
      never: "Never",
    },
    toast: {
      uploaded: "Local data has been uploaded to the cloud.",
      downloaded: "Latest data has been pulled from the cloud.",
      upToDate: "Local and cloud data are already up to date.",
      skippedEmpty: "No local data to sync. Skipped creating an empty initial backup.",
    },
    enable: {
      title: "A forever home for your inspiration",
      description:
        "Enable cloud sync to create seamlessly across all your devices, never losing a thing.",
      button: "Enable Cloud Sync",
      provider: "Securely powered by Google Drive",
    },
    confirmation: {
      enable:
        "You are about to be redirected to Google to authorize Synapse to create a dedicated app folder in your Google Drive for storing backup data. We will not access any of your other files.",
      disconnect:
        "Are you sure you want to disconnect cloud sync? Your data will remain in the cloud, but this device will no longer sync.",
      restore:
        "Are you sure you want to restore from this version? All data on this device will be overwritten.",
      deleteBackup:
        "Are you sure you want to permanently delete this cloud backup? This action cannot be undone.",
    },
  },
  data: {
    title: "Data Vault",
    backup: {
      title: "Cloud Time Machine",
      description:
        "Here are your 10 most recent cloud backups. You can restore to any version at any time.",
      refresh: "Refresh List",
      noHistory: "No cloud backup history yet.",
      restore: "Restore",
      download: "Download",
      delete: "Delete",
    },
    local: {
      title: "Local Snapshot",
      description:
        "Create a full local backup for peace of mind. You can also restore from a backup file.",
      create: "Create Snapshot",
      import: "Import from File",
      invalidFileError: "Invalid backup file format",
    },
    danger: {
      title: "Danger Zone",
      description:
        "This action will delete all local data from your browser and cannot be undone.",
      button: "Clear All Data",
      confirm: "To confirm this action, please type 'DELETE'",
      confirmPlaceholder: "Type DELETE to confirm",
      confirmButton: "Permanently Delete",
    },
  },
};
