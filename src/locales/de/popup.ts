import enPopup from "../en/popup";

export default {
  ...enPopup,
  recentActivity: "Letzte Aktivität",
  noActivity: "Keine aktuelle Aktivität",
  noActivityHint: "Verwenden Sie Synapse auf einer KI-Plattform und Ihre Aktivitäten erscheinen hier.",
  activity: {
    usedPrompt: "\"{title}\" verwendet",
    capturedChat: "\"{title}\" gesammelt",
    savedSnippet: "\"{title}\" gespeichert",
  },
  shortcuts: {
    promptSelector: "Prompt-Auswahl",
    quickSave: "Schnellspeichern",
    rightClick: "Auswahl speichern",
  },
  openDashboard: "Dashboard öffnen",
  timeAgo: {
    justNow: "Gerade eben",
    minutesAgo: "vor {n} Min.",
    hoursAgo: "vor {n} Std.",
    daysAgo: "vor {n} Tagen",
  },
};
