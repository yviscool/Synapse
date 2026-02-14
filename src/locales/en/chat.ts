export default {
  title: "Chat History",

  // Platforms
  platforms: {
    all: "All Platforms",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    deepseek: "DeepSeek",
    kimi: "Kimi",
    doubao: "Doubao",
    qianwen: "Qwen",
    yuanbao: "Tencent Yuanbao",
    grok: "Grok",
    copilot: "Copilot",
    other: "Other",
  },

  // Sidebar
  sidebar: {
    all: "All",
    starred: "Starred",
    tags: "Tags",
    clearTags: "Clear tag filters",
    noTags: "No tags yet",
    conversations: "{count} conversations",
  },

  // List
  list: {
    empty: "No conversations yet",
    emptyHint: "Collected conversations from AI platforms will appear here",
    searchPlaceholder: "Search conversations...",
    sortBy: "Sort by",
    sortOptions: {
      updatedAt: "Updated",
      createdAt: "Created",
      collectedAt: "Collected",
      title: "Title",
      messageCount: "Messages",
    },
    messages: "{count} messages",
    collected: "Collected",
  },

  // Detail
  detail: {
    noSelection: "Select a conversation to view details",
    messages: "Messages",
    note: "Note",
    notePlaceholder: "Add a note...",
    tags: "Tags",
    tagsPlaceholder: "Type tag and press Enter",
    link: "Original Link",
    openLink: "Open original conversation",
    thinking: "Thinking Process",
    editTitle: "Edit title",
    thinkingLabel: "Thought",
    thinkingTime: "{seconds}s",
    edit: "Edit",
    copy: "Copy",
    deleteMessage: "Delete message",
    edited: "Edited",
    user: "User",
  },

  // Actions
  actions: {
    star: "Star",
    unstar: "Unstar",
    export: "Export",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this conversation? This action cannot be undone.",
    batchDelete: "Batch Delete",
    batchDeleteConfirm: "Are you sure you want to delete {count} selected conversations?",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    collect: "Collect Chat",
  },

  // Export
  export: {
    title: "Export Conversation",
    format: "Format",
    preview: "Preview",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "Plain Text",
      html: "HTML",
    },
    options: {
      includeMetadata: "Include metadata",
      includeTimestamps: "Include timestamps",
      includeThinking: "Include thinking process",
    },
    download: "Download",
    copy: "Copy Content",
  },

  // Message roles
  roles: {
    user: "User",
    assistant: "Assistant",
    system: "System",
  },

  // Toast messages
  toast: {
    saveSuccess: "Saved successfully",
    saveFailed: "Failed to save",
    deleteSuccess: "Deleted successfully",
    deleteFailed: "Failed to delete",
    exportSuccess: "Exported successfully",
    exportFailed: "Failed to export",
    copySuccess: "Copied to clipboard",
    copyFailed: "Failed to copy",
    starAdded: "Added to starred",
    starRemoved: "Removed from starred",
    collectSuccess: "Collected successfully",
    collectFailed: "Failed to collect",
  },

  // Outline
  outline: {
    title: "Outline",
    empty: "No questions yet",
  },

  // Empty state
  empty: {
    title: "Start collecting your AI conversations",
    description: "Supports ChatGPT, Claude, Gemini and other major AI platforms",
    features: {
      collect: "One-click conversation collection",
      manage: "Unified multi-platform management",
      search: "Full-text search for quick access",
      export: "Multi-format export and sharing",
    },
  },
};
