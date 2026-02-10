export default {
  title: "Code Snippets",

  // Sidebar
  sidebar: {
    all: "All",
    starred: "Starred",
    recent: "Recent",
    uncategorized: "Uncategorized",
    folders: "Folders",
    tags: "Tags",
    newFolder: "New Folder",
    newSnippet: "New Snippet",
    clearAll: "Clear",
    clearTags: "Clear all tag filters",
    noTags: "No tags yet",
  },

  // List
  list: {
    empty: "No snippets yet",
    emptyHint: "Click the button above to create your first snippet",
    searchPlaceholder: "Search snippets...",
    sortBy: "Sort by",
    sortOptions: {
      updatedAt: "Updated",
      createdAt: "Created",
      title: "Title",
      usedAt: "Last used",
      useCount: "Use count",
    },
    filterByLanguage: "Filter by language",
    clearFilters: "Clear filters",
    items: "{count} snippets",
  },

  // Editor
  editor: {
    titlePlaceholder: "Enter snippet title...",
    contentPlaceholder: "Enter code here...",
    language: "Language",
    tags: "Tags",
    tagsPlaceholder: "Type tag and press Enter",
    folder: "Folder",
    noFolder: "Uncategorized",
    starred: "Starred",
    save: "Save",
    copy: "Copy",
    download: "Download file",
    copySuccess: "Copied to clipboard",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this snippet? This action cannot be undone.",
    preview: "Preview",
    edit: "Edit",
    charCount: "{count} characters",
    lineCount: "{count} lines",
    lastUsed: "Last used",
    useCount: "Use count",
    never: "Never",
    times: "{count} times",
  },

  // Preview
  preview: {
    title: "HTML Preview",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    externalLinks: "External links detected",
    externalLinksWarning: "This HTML contains external resource links that may not load properly in the extension.",
    exportHtml: "Export HTML",
    openInCodePen: "Open in CodePen",
    dependencies: "External Dependencies",
  },

  // Folder
  folder: {
    rename: "Rename",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this folder? Snippets inside will be moved to Uncategorized.",
    newSubfolder: "New Subfolder",
    moveTo: "Move to",
    maxDepthWarning: "Folders support up to 3 levels of nesting",
    namePlaceholder: "Folder name",
  },

  // Tag
  tag: {
    manage: "Manage Tags",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this tag?",
    rename: "Rename",
    color: "Color",
  },

  // Languages
  languages: {
    html: "HTML",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    rust: "Rust",
    go: "Go",
    css: "CSS",
    json: "JSON",
    markdown: "Markdown",
    sql: "SQL",
    shell: "Shell",
    yaml: "YAML",
    text: "Plain Text",
  },

  // Toast messages
  toast: {
    saveSuccess: "Snippet saved successfully",
    saveFailed: "Failed to save",
    deleteSuccess: "Deleted successfully",
    deleteFailed: "Failed to delete",
    copySuccess: "Copied to clipboard",
    copyFailed: "Failed to copy",
    folderCreated: "Folder created successfully",
    folderDeleted: "Folder deleted successfully",
    tagDeleted: "Tag deleted successfully",
    movedToFolder: "Moved to folder",
  },
};
