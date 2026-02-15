import enTools from "../en/tools";

export default {
  ...enTools,
  title: "Фрагменты кода",

  sidebar: {
    all: "Все",
    starred: "Избранное",
    recent: "Недавние",
    uncategorized: "Без категории",
    folders: "Папки",
    tags: "Теги",
    newFolder: "Новая папка",
    newSnippet: "Новый фрагмент",
    clearAll: "Очистить",
    clearTags: "Очистить все фильтры тегов",
    noTags: "Тегов пока нет",
  },

  list: {
    empty: "Фрагментов пока нет",
    emptyHint: "Нажмите кнопку выше, чтобы создать первый фрагмент",
    searchPlaceholder: "Поиск фрагментов...",
    sortBy: "Сортировка",
    sortOptions: {
      updatedAt: "Обновлено",
      createdAt: "Создано",
      title: "Заголовок",
      usedAt: "Последнее использование",
      useCount: "Количество использований",
    },
    filterByLanguage: "Фильтр по языку",
    clearFilters: "Очистить фильтры",
    items: "{count} фрагментов",
  },

  editor: {
    titlePlaceholder: "Введите название фрагмента...",
    contentPlaceholder: "Введите код...",
    language: "Язык",
    tags: "Теги",
    tagsPlaceholder: "Введите тег и нажмите Enter",
    folder: "Папка",
    noFolder: "Без категории",
    starred: "Избранное",
    save: "Сохранить",
    copy: "Копировать",
    download: "Скачать файл",
    copySuccess: "Скопировано в буфер обмена",
    delete: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить этот фрагмент? Это действие нельзя отменить.",
    preview: "Предпросмотр",
    edit: "Редактировать",
    charCount: "{count} символов",
    lineCount: "{count} строк",
    lastUsed: "Последнее использование",
    useCount: "Количество использований",
    never: "Никогда",
    times: "{count} раз",
  },

  preview: {
    title: "Предпросмотр HTML",
    fullscreen: "Полный экран",
    exitFullscreen: "Выйти из полного экрана",
    externalLinks: "Обнаружены внешние ссылки",
    externalLinksWarning: "Этот HTML содержит внешние ресурсы, которые могут не загрузиться в расширении.",
    exportHtml: "Экспорт HTML",
    openInCodePen: "Открыть в CodePen",
    dependencies: "Внешние зависимости",
  },

  folder: {
    rename: "Переименовать",
    delete: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить эту папку? Фрагменты будут перемещены в Без категории.",
    newSubfolder: "Новая подпапка",
    moveTo: "Переместить в",
    maxDepthWarning: "Папки поддерживают до 3 уровней вложенности",
    namePlaceholder: "Название папки",
  },

  tag: {
    manage: "Управление тегами",
    delete: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить этот тег?",
    rename: "Переименовать",
    color: "Цвет",
  },

  languages: {
    ...enTools.languages,
    text: "Текст",
  },

  toast: {
    saveSuccess: "Фрагмент сохранён",
    saveFailed: "Ошибка сохранения",
    deleteSuccess: "Успешно удалено",
    deleteFailed: "Ошибка удаления",
    copySuccess: "Скопировано в буфер обмена",
    copyFailed: "Ошибка копирования",
    folderCreated: "Папка создана",
    folderDeleted: "Папка удалена",
    tagDeleted: "Тег удалён",
    movedToFolder: "Перемещено в папку",
  },
};
