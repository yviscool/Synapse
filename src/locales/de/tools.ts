import enTools from "../en/tools";

export default {
  ...enTools,
  title: "Code-Snippets",

  sidebar: {
    all: "Alle",
    starred: "Favoriten",
    recent: "Kürzlich",
    uncategorized: "Unkategorisiert",
    folders: "Ordner",
    tags: "Tags",
    newFolder: "Neuer Ordner",
    newSnippet: "Neues Snippet",
    clearAll: "Löschen",
    clearTags: "Alle Tag-Filter löschen",
    noTags: "Noch keine Tags",
  },

  list: {
    empty: "Noch keine Snippets",
    emptyHint: "Klicken Sie oben, um Ihr erstes Snippet zu erstellen",
    searchPlaceholder: "Snippets suchen...",
    sortBy: "Sortieren nach",
    sortOptions: {
      updatedAt: "Aktualisiert",
      createdAt: "Erstellt",
      title: "Titel",
      usedAt: "Zuletzt verwendet",
      useCount: "Nutzungshäufigkeit",
    },
    filterByLanguage: "Nach Sprache filtern",
    clearFilters: "Filter löschen",
    items: "{count} Snippets",
  },

  editor: {
    titlePlaceholder: "Snippet-Titel eingeben...",
    contentPlaceholder: "Code hier eingeben...",
    language: "Sprache",
    tags: "Tags",
    tagsPlaceholder: "Tag eingeben und Enter drücken",
    folder: "Ordner",
    noFolder: "Unkategorisiert",
    starred: "Favorit",
    save: "Speichern",
    copy: "Kopieren",
    download: "Datei herunterladen",
    copySuccess: "In Zwischenablage kopiert",
    delete: "Löschen",
    deleteConfirm: "Möchten Sie dieses Snippet wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    preview: "Vorschau",
    edit: "Bearbeiten",
    charCount: "{count} Zeichen",
    lineCount: "{count} Zeilen",
    lastUsed: "Zuletzt verwendet",
    useCount: "Nutzungshäufigkeit",
    never: "Nie",
    times: "{count} Mal",
  },

  preview: {
    title: "HTML-Vorschau",
    fullscreen: "Vollbild",
    exitFullscreen: "Vollbild beenden",
    externalLinks: "Externe Links erkannt",
    externalLinksWarning: "Dieses HTML enthält externe Ressourcen, die in der Erweiterung möglicherweise nicht korrekt geladen werden.",
    exportHtml: "HTML exportieren",
    openInCodePen: "In CodePen öffnen",
    dependencies: "Externe Abhängigkeiten",
  },

  folder: {
    rename: "Umbenennen",
    delete: "Löschen",
    deleteConfirm: "Möchten Sie diesen Ordner wirklich löschen? Snippets darin werden nach Unkategorisiert verschoben.",
    newSubfolder: "Neuer Unterordner",
    moveTo: "Verschieben nach",
    maxDepthWarning: "Ordner unterstützen bis zu 3 Verschachtelungsebenen",
    namePlaceholder: "Ordnername",
  },

  tag: {
    manage: "Tags verwalten",
    delete: "Löschen",
    deleteConfirm: "Möchten Sie diesen Tag wirklich löschen?",
    rename: "Umbenennen",
    color: "Farbe",
  },

  languages: {
    ...enTools.languages,
    text: "Klartext",
  },

  toast: {
    saveSuccess: "Snippet erfolgreich gespeichert",
    saveFailed: "Speichern fehlgeschlagen",
    deleteSuccess: "Erfolgreich gelöscht",
    deleteFailed: "Löschen fehlgeschlagen",
    copySuccess: "In Zwischenablage kopiert",
    copyFailed: "Kopieren fehlgeschlagen",
    folderCreated: "Ordner erfolgreich erstellt",
    folderDeleted: "Ordner erfolgreich gelöscht",
    tagDeleted: "Tag erfolgreich gelöscht",
    movedToFolder: "In Ordner verschoben",
  },
};
