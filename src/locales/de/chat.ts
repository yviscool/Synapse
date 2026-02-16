import enChat from "../en/chat";

export default {
  ...enChat,
  title: "Chatverlauf",

  platforms: {
    all: "Alle Plattformen",
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
    other: "Sonstige",
  },

  sidebar: {
    all: "Alle",
    starred: "Favoriten",
    tags: "Tags",
    clearTags: "Tag-Filter löschen",
    noTags: "Noch keine Tags",
    conversations: "{count} Unterhaltungen",
  },

  list: {
    empty: "Noch keine Unterhaltungen",
    emptyHint: "Gesammelte Unterhaltungen von KI-Plattformen erscheinen hier",
    searchPlaceholder: "Unterhaltungen suchen...",
    sortBy: "Sortieren nach",
    sortOptions: {
      updatedAt: "Aktualisiert",
      createdAt: "Erstellt",
      collectedAt: "Gesammelt",
      title: "Titel",
      messageCount: "Nachrichten",
    },
    messages: "{count} Nachrichten",
    collected: "Gesammelt",
  },

  detail: {
    noSelection: "Wählen Sie eine Unterhaltung aus",
    messages: "Nachrichten",
    note: "Notiz",
    notePlaceholder: "Notiz hinzufügen...",
    tags: "Tags",
    tagsPlaceholder: "Tag eingeben und Enter drücken",
    link: "Originallink",
    openLink: "Originalunterhaltung öffnen",
    thinking: "Denkprozess",
    editTitle: "Titel bearbeiten",
    thinkingLabel: "Gedanke",
    thinkingTime: "{seconds}s",
    edit: "Bearbeiten",
    copy: "Kopieren",
    copied: "Kopiert",
    mermaidChart: "Diagramm",
    mermaidCode: "Code",
    mermaidCopy: "Kopieren",
    mermaidDownload: "Herunterladen",
    mermaidFullscreen: "Vollbild",
    deleteMessage: "Nachricht löschen",
    edited: "Bearbeitet",
    user: "Benutzer",
  },

  actions: {
    star: "Favorit",
    unstar: "Entfernen",
    export: "Exportieren",
    delete: "Löschen",
    deleteConfirm: "Möchten Sie diese Unterhaltung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    batchDelete: "Stapellöschung",
    batchDeleteConfirm: "Möchten Sie {count} ausgewählte Unterhaltungen wirklich löschen?",
    selectAll: "Alle auswählen",
    deselectAll: "Auswahl aufheben",
    collect: "Chat sammeln",
  },

  export: {
    title: "Unterhaltung exportieren",
    format: "Format",
    preview: "Vorschau",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "Klartext",
      html: "HTML",
    },
    options: {
      includeMetadata: "Metadaten einschließen",
      includeTimestamps: "Zeitstempel einschließen",
      includeThinking: "Denkprozess einschließen",
    },
    download: "Herunterladen",
    copy: "Inhalt kopieren",
  },

  roles: {
    user: "Benutzer",
    assistant: "Assistent",
    system: "System",
  },

  toast: {
    saveSuccess: "Erfolgreich gespeichert",
    saveFailed: "Speichern fehlgeschlagen",
    deleteSuccess: "Erfolgreich gelöscht",
    deleteFailed: "Löschen fehlgeschlagen",
    exportSuccess: "Erfolgreich exportiert",
    exportFailed: "Export fehlgeschlagen",
    copySuccess: "In Zwischenablage kopiert",
    copyFailed: "Kopieren fehlgeschlagen",
    starAdded: "Zu Favoriten hinzugefügt",
    starRemoved: "Aus Favoriten entfernt",
    collectSuccess: "Erfolgreich gesammelt",
    collectFailed: "Sammeln fehlgeschlagen",
  },

  outline: {
    title: "Gliederung",
    empty: "Noch keine Fragen",
  },

  empty: {
    title: "Beginnen Sie mit dem Sammeln Ihrer KI-Unterhaltungen",
    description: "Unterstützt ChatGPT, Claude, Gemini und andere große KI-Plattformen",
    features: {
      collect: "Unterhaltungen mit einem Klick sammeln",
      manage: "Einheitliche plattformübergreifende Verwaltung",
      search: "Volltextsuche für schnellen Zugriff",
      export: "Export und Teilen in mehreren Formaten",
    },
    supportedPlatforms: "Unterstützte Plattformen:",
  },
};
