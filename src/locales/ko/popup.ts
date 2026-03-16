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
  shortcutsTitle: "AI 사이트 단축키",
  shortcuts: {
    promptSelector: "프롬프트 패널 열기",
    quickSave: "선택한 텍스트 빠른 저장",
    rightClick: "선택 영역 저장",
    refillPrompt: "개요에서 이전/다음 프롬프트 다시 채우기",
    restoreDraft: "현재 초안 복구",
  },
  openDashboard: "대시보드 열기",
  timeAgo: {
    justNow: "방금",
    minutesAgo: "{n}분 전",
    hoursAgo: "{n}시간 전",
    daysAgo: "{n}일 전",
  },
};
