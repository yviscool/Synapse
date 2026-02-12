export default {
  title: "设置",
  sort: {
    label: "排序方式",
    updatedAt: "最近更新",
    createdAt: "创建时间",
    byTitle: "标题排序",
  },
  language: {
    title: "语言",
    localeNames: {
      zhCN: "中文",
      en: "English",
      jaJP: "日本語",
      ruRU: "Русский",
    },
    followSystem: "跟随系统",
    currentSystem: "当前系统语言为 {lang}",
  },
  sync: {
    title: "云同步",
    status: {
      enabled: "同步已开启",
      connected: "已连接",
      syncing: "同步中...",
      syncNow: "立即同步",
      disconnect: "断开连接",
      disconnecting: "断开中...",
      lastSync: "最后同步于: {time}",
      justNow: "刚刚同步",
      minutesAgo: "{minutes} 分钟前同步",
      hoursAgo: "{hours} 小时前同步",
      daysAgo: "{days} 天前同步",
      never: "从未同步",
    },
    toast: {
      uploaded: "本地数据已上传到云端。",
      downloaded: "已从云端拉取最新数据。",
      upToDate: "本地与云端已是最新状态。",
      skippedEmpty: "本地暂无可同步数据，已跳过首次空备份。",
    },
    enable: {
      title: "给你的灵感一个永恒的家",
      description: "启用云同步，在所有设备间无缝创作，永不丢失。",
      button: "启用云同步",
      provider: "由 Google Drive 提供安全支持",
    },
    confirmation: {
      enable:
        "即将跳转到 Google 进行授权，以允许 Synapse 在您的 Google Drive 中创建专属应用文件夹来存放备份数据。我们不会访问您的任何其他文件。",
      disconnect:
        "确定要断开云同步吗？您的数据将保留在云端，但此设备将不再同步。",
      restore: "确定要从此版本恢复吗？当前设备上的所有数据都将被覆盖。",
      deleteBackup: "确定要永久删除此云端备份吗？此操作不可撤销。",
    },
  },
  data: {
    title: "数据保险箱",
    backup: {
      title: "云端时光机",
      description:
        "这里会列出您最近在云端的10个备份版本。您可以随时恢复到任一版本。",
      refresh: "刷新列表",
      noHistory: "暂无云端备份记录。",
      restore: "恢复",
      download: "下载",
      delete: "删除",
    },
    local: {
      title: "本地快照",
      description: "创建完整的本地备份，让您高枕无忧。您也可以从备份文件恢复。",
      create: "创建快照",
      import: "从文件导入",
      invalidFileError: "无效的备份文件格式",
    },
    danger: {
      title: "危险操作",
      description: "此操作将从您的浏览器中删除所有本地数据，且无法撤销。",
      button: "清空所有数据",
      confirm: "为确认此操作，请输入 'DELETE'",
      confirmPlaceholder: "输入 DELETE 以确认",
      confirmButton: "永久删除",
    },
  },
};
