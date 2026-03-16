import enPopup from "../en/popup";

export default {
  ...enPopup,
  recentActivity: "Недавняя активность",
  noActivity: "Нет недавней активности",
  noActivityHint: "Используйте Synapse на любой AI-платформе, и ваша активность появится здесь.",
  activity: {
    usedPrompt: "Использован \"{title}\"",
    capturedChat: "Собран \"{title}\"",
    savedSnippet: "Сохранён \"{title}\"",
  },
  shortcutsTitle: "Быстрые клавиши ИИ-сайтов",
  shortcuts: {
    promptSelector: "Открыть панель промптов",
    quickSave: "Быстрое сохранение выделенного текста",
    rightClick: "Сохранить выделение",
    refillPrompt: "Заполнить предыд./след. промпт из структуры",
    restoreDraft: "Восстановить текущий черновик",
  },
  openDashboard: "Открыть панель",
  timeAgo: {
    justNow: "Только что",
    minutesAgo: "{n} мин. назад",
    hoursAgo: "{n} ч. назад",
    daysAgo: "{n} дн. назад",
  },
};
