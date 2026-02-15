import enPopup from "../en/popup";

export default {
  ...enPopup,
  recentActivity: "最近のアクティビティ",
  noActivity: "最近のアクティビティはありません",
  noActivityHint: "AIプラットフォームでSynapseを使用すると、ここにアクティビティが表示されます。",
  activity: {
    usedPrompt: "「{title}」を使用",
    capturedChat: "「{title}」を収集",
    savedSnippet: "「{title}」を保存",
  },
  shortcuts: {
    promptSelector: "プロンプト選択",
    quickSave: "クイック保存",
    rightClick: "選択を保存",
  },
  openDashboard: "ダッシュボードを開く",
  timeAgo: {
    justNow: "たった今",
    minutesAgo: "{n} 分前",
    hoursAgo: "{n} 時間前",
    daysAgo: "{n} 日前",
  },
};
