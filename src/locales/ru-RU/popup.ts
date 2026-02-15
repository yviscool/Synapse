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
  shortcuts: {
    promptSelector: "Выбор промпта",
    quickSave: "Быстрое сохранение",
    rightClick: "Сохранить выделение",
  },
  openDashboard: "Открыть панель",
  timeAgo: {
    justNow: "Только что",
    minutesAgo: "{n} мин. назад",
    hoursAgo: "{n} ч. назад",
    daysAgo: "{n} дн. назад",
  },
};
