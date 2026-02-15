import enPopup from "../en/popup";

export default {
  ...enPopup,
  recentActivity: "최근 활동",
  noActivity: "최근 활동이 없습니다",
  noActivityHint: "AI 플랫폼에서 Synapse를 사용하면 여기에 활동이 표시됩니다.",
  activity: {
    usedPrompt: "\"{title}\" 사용됨",
    capturedChat: "\"{title}\" 수집됨",
    savedSnippet: "\"{title}\" 저장됨",
  },
  shortcuts: {
    promptSelector: "프롬프트 선택기",
    quickSave: "빠른 저장",
    rightClick: "선택 저장",
  },
  openDashboard: "대시보드 열기",
  timeAgo: {
    justNow: "방금",
    minutesAgo: "{n}분 전",
    hoursAgo: "{n}시간 전",
    daysAgo: "{n}일 전",
  },
};
