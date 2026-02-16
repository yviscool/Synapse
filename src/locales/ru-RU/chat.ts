import enChat from "../en/chat";

export default {
  ...enChat,
  title: "История чатов",

  platforms: {
    all: "Все платформы",
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
    other: "Другие",
  },

  sidebar: {
    all: "Все",
    starred: "Избранное",
    tags: "Теги",
    clearTags: "Очистить фильтр тегов",
    noTags: "Тегов пока нет",
    conversations: "{count} диалогов",
  },

  list: {
    empty: "Диалогов пока нет",
    emptyHint: "Собранные диалоги с AI-платформ появятся здесь",
    searchPlaceholder: "Поиск диалогов...",
    sortBy: "Сортировка",
    sortOptions: {
      updatedAt: "Обновлено",
      createdAt: "Создано",
      collectedAt: "Собрано",
      title: "Заголовок",
      messageCount: "Сообщения",
    },
    messages: "{count} сообщений",
    collected: "Собрано",
  },

  detail: {
    noSelection: "Выберите диалог для просмотра",
    messages: "Сообщения",
    note: "Заметка",
    notePlaceholder: "Добавить заметку...",
    tags: "Теги",
    tagsPlaceholder: "Введите тег и нажмите Enter",
    link: "Оригинальная ссылка",
    openLink: "Открыть оригинальный диалог",
    thinking: "Процесс мышления",
    editTitle: "Редактировать заголовок",
    thinkingLabel: "Мысль",
    thinkingTime: "{seconds}с",
    edit: "Редактировать",
    copy: "Копировать",
    copied: "Скопировано",
    mermaidChart: "Диаграмма",
    mermaidCode: "Код",
    mermaidCopy: "Копировать",
    mermaidDownload: "Скачать",
    mermaidFullscreen: "Полный экран",
    deleteMessage: "Удалить сообщение",
    edited: "Изменено",
    user: "Пользователь",
  },

  actions: {
    star: "В избранное",
    unstar: "Из избранного",
    export: "Экспорт",
    delete: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить этот диалог? Это действие нельзя отменить.",
    batchDelete: "Массовое удаление",
    batchDeleteConfirm: "Вы уверены, что хотите удалить {count} выбранных диалогов?",
    selectAll: "Выбрать все",
    deselectAll: "Снять выделение",
    collect: "Собрать чат",
  },

  export: {
    title: "Экспорт диалога",
    format: "Формат",
    preview: "Предпросмотр",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "Текст",
      html: "HTML",
    },
    options: {
      includeMetadata: "Включить метаданные",
      includeTimestamps: "Включить временные метки",
      includeThinking: "Включить процесс мышления",
    },
    download: "Скачать",
    copy: "Копировать содержимое",
  },

  roles: {
    user: "Пользователь",
    assistant: "Ассистент",
    system: "Система",
  },

  toast: {
    saveSuccess: "Успешно сохранено",
    saveFailed: "Ошибка сохранения",
    deleteSuccess: "Успешно удалено",
    deleteFailed: "Ошибка удаления",
    exportSuccess: "Успешно экспортировано",
    exportFailed: "Ошибка экспорта",
    copySuccess: "Скопировано в буфер обмена",
    copyFailed: "Ошибка копирования",
    starAdded: "Добавлено в избранное",
    starRemoved: "Удалено из избранного",
    collectSuccess: "Успешно собрано",
    collectFailed: "Ошибка сбора",
  },

  outline: {
    title: "Содержание",
    empty: "Вопросов пока нет",
  },

  empty: {
    title: "Начните собирать ваши AI-диалоги",
    description: "Поддержка ChatGPT, Claude, Gemini и других AI-платформ",
    features: {
      collect: "Сбор диалогов в один клик",
      manage: "Единое управление несколькими платформами",
      search: "Полнотекстовый поиск для быстрого доступа",
      export: "Экспорт и обмен в нескольких форматах",
    },
    supportedPlatforms: "Поддерживаемые платформы:",
  },
};
