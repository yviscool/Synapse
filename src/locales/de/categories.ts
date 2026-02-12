import enCategories from "../en/categories";

export default {
  ...enCategories,
  defaultCategories: {
    ...enCategories.defaultCategories,
    creative: "Kreativ",
    image: "Bild",
    writing: "Schreiben",
    coding: "Programmierung",
    analysis: "Analyse",
    marketing: "Marketing",
    education: "Bildung",
    roleplay: "Rollenspiel",
    lifestyle: "Lifestyle",
    translation: "Übersetzung",
    other: "Sonstiges",
  },
  all: "Alle Kategorien",
  settings: "Kategorie-Einstellungen",
  manage: "Kategorien verwalten",
  importMerge: "Import/Zusammenführen",
  batchDelete: "Stapellöschung",
  title: "Organisiere deine Inspirationen",
  createPlaceholder: "Neue Kategorie erstellen…",
  iconTooltip: "Symbol auswählen",
  add: "Hinzufügen",
  changeIconTooltip: "Symbol ändern",
  saveTooltip: "Speichern",
  cancelTooltip: "Abbrechen",
  promptCount: "{count} Prompts",
  editTooltip: "Bearbeiten",
  deleteTooltip: "Löschen",
  searchIconPlaceholder: "Symbole suchen…",
  addSuccess: "Kategorie hinzugefügt",
  addFailed: "Hinzufügen fehlgeschlagen",
  updateSuccess: "Kategorie aktualisiert",
  updateFailed: "Aktualisierung fehlgeschlagen",
  deleteConfirm:
    "Möchten Sie diese Kategorie löschen? Die zugehörigen Prompts werden nicht gelöscht.",
  deleteSuccess: "Kategorie gelöscht",
  deleteFailed: "Löschen fehlgeschlagen",
  orderUpdateSuccess: "Reihenfolge aktualisiert",
  orderUpdateFailed: "Reihenfolge konnte nicht aktualisiert werden",
  batchDeleteModal: {
    title: "Prompts stapelweise löschen",
    step1: "Schritt 1: Kategorie auswählen",
    selectCategoryPlaceholder: "Bitte wählen Sie eine Kategorie",
    step2: "Schritt 2: Löschbereich auswählen",
    deleteAll: "Alle löschen",
    deleteByTag: "Nach Tag löschen",
    noTags: "Keine filterbaren Tags in dieser Kategorie.",
    selectTagsLabel:
      "Tags auswählen (Prompts mit <strong>einem</strong> der ausgewählten Tags werden gelöscht):",
    step3: "Schritt 3: Ergebnisse anzeigen",
    previewMessage: {
      noPrompts: "Keine Prompts in dieser Kategorie.",
      selectTags:
        "Bitte wählen Sie mindestens einen Tag für die Vorschau.",
      noMatch: "Keine Prompts mit den ausgewählten Tags gefunden.",
    },
    summary: "<strong>{count}</strong> Prompts werden gelöscht",
    cancel: "Abbrechen",
    confirm: "Löschen bestätigen",
    loadFailed: "Kategoriedaten konnten nicht geladen werden",
    confirmMessageAll:
      'Möchten Sie wirklich alle {count} Prompts in der Kategorie „{categoryName}" löschen? Die Kategorie selbst bleibt erhalten. Diese Aktion ist unwiderruflich.',
    confirmMessageByTag:
      'Möchten Sie wirklich {count} Prompts in der Kategorie „{categoryName}" mit den Tags [{tags}] löschen? Diese Aktion ist unwiderruflich.',
    deleteSuccess: "Erfolgreich gelöscht",
    deleteFailed: "Löschen fehlgeschlagen",
    deleteFailedWithError: "Löschen fehlgeschlagen: {error}",
    operationFailedError: "Löschvorgang fehlgeschlagen",
  },
  mergeImportModal: {
    title: "Prompts importieren und zusammenführen",
    description:
      "Prompts aus einer Datei in Ihre Sammlung importieren.",
    step1Title: "Schritt 1: Datei auswählen",
    uploadLabel: "Datei hochladen",
    dragDrop: "oder per Drag & Drop",
    fileTypeHint: "Nur .json-Dateien werden unterstützt",
    fileSelected: "Ausgewählt: {fileName} ({count} Prompts)",
    noFileSelected: "Noch keine Datei ausgewählt.",
    downloadTemplate: "Vorlage benötigt? Vorlage herunterladen",
    step2Title: "Schritt 2: Kategorien zuordnen (Mehrfachauswahl)",
    step2Description:
      "Weisen Sie allen importierten Prompts mindestens eine Kategorie zu.",
    step3Title: "Schritt 3: Zusätzliche Tags (optional)",
    step3Description:
      "Fügen Sie allen Prompts aus diesem Import gemeinsame Tags hinzu.",
    tagInputPlaceholder: "Tag hinzufügen und Tab oder Enter drücken…",
    cancel: "Abbrechen",
    mergeButton: "{count} Prompts zusammenführen",
    mergingButton: "Wird zusammengeführt…",
    mergeTooltip: "Zusammenführung starten",
    disabledMergeTooltip:
      "Bitte wählen Sie zuerst eine Datei und ordnen Sie mindestens eine Kategorie zu",
    toast: {
      selectJson: "Bitte wählen Sie eine .json-Datei",
      invalidFormat:
        'Ungültiges Dateiformat, „prompts"-Array nicht gefunden.',
      noPromptsInFile:
        "Keine importierbaren Prompts in der Datei gefunden.",
      parseError: "Datei konnte nicht analysiert werden: {error}",
      mergeSuccess:
        "Zusammenführung abgeschlossen! {importedCount} hinzugefügt, {skippedCount} Duplikate übersprungen.",
      unknownError:
        "Unbekannter Fehler beim Zusammenführen",
      mergeFailed: "Zusammenführung fehlgeschlagen: {error}",
    },
  },
};
