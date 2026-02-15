import enChat from "../en/chat";

export default {
  ...enChat,
  title: "채팅 기록",

  platforms: {
    all: "모든 플랫폼",
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
    other: "기타",
  },

  sidebar: {
    all: "전체",
    starred: "즐겨찾기",
    tags: "태그",
    clearTags: "태그 필터 지우기",
    noTags: "태그가 없습니다",
    conversations: "{count}개 대화",
  },

  list: {
    empty: "대화가 없습니다",
    emptyHint: "AI 플랫폼에서 수집한 대화가 여기에 표시됩니다",
    searchPlaceholder: "대화 검색...",
    sortBy: "정렬",
    sortOptions: {
      updatedAt: "업데이트순",
      createdAt: "생성순",
      collectedAt: "수집순",
      title: "제목순",
      messageCount: "메시지 수",
    },
    messages: "{count}개 메시지",
    collected: "수집됨",
  },

  detail: {
    noSelection: "대화를 선택하여 상세 내용을 확인하세요",
    messages: "메시지",
    note: "메모",
    notePlaceholder: "메모 추가...",
    tags: "태그",
    tagsPlaceholder: "태그 입력 후 Enter",
    link: "원본 링크",
    openLink: "원본 대화 열기",
    thinking: "사고 과정",
    editTitle: "제목 편집",
    thinkingLabel: "사고",
    thinkingTime: "{seconds}초",
    edit: "편집",
    copy: "복사",
    copied: "복사됨",
    mermaidChart: "차트",
    mermaidCode: "코드",
    mermaidCopy: "복사",
    mermaidDownload: "다운로드",
    mermaidFullscreen: "전체 화면",
    deleteMessage: "메시지 삭제",
    edited: "편집됨",
    user: "사용자",
  },

  actions: {
    star: "즐겨찾기",
    unstar: "즐겨찾기 해제",
    export: "내보내기",
    delete: "삭제",
    deleteConfirm: "이 대화를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    batchDelete: "일괄 삭제",
    batchDeleteConfirm: "선택한 {count}개 대화를 삭제하시겠습니까?",
    selectAll: "전체 선택",
    deselectAll: "선택 해제",
    collect: "대화 수집",
  },

  export: {
    title: "대화 내보내기",
    format: "형식",
    preview: "미리보기",
    formats: {
      json: "JSON",
      markdown: "Markdown",
      txt: "일반 텍스트",
      html: "HTML",
    },
    options: {
      includeMetadata: "메타데이터 포함",
      includeTimestamps: "타임스탬프 포함",
      includeThinking: "사고 과정 포함",
    },
    download: "다운로드",
    copy: "내용 복사",
  },

  roles: {
    user: "사용자",
    assistant: "어시스턴트",
    system: "시스템",
  },

  toast: {
    saveSuccess: "저장 완료",
    saveFailed: "저장 실패",
    deleteSuccess: "삭제 완료",
    deleteFailed: "삭제 실패",
    exportSuccess: "내보내기 완료",
    exportFailed: "내보내기 실패",
    copySuccess: "클립보드에 복사됨",
    copyFailed: "복사 실패",
    starAdded: "즐겨찾기에 추가됨",
    starRemoved: "즐겨찾기에서 제거됨",
    collectSuccess: "수집 완료",
    collectFailed: "수집 실패",
  },

  outline: {
    title: "개요",
    empty: "질문이 없습니다",
  },

  empty: {
    title: "AI 대화 수집을 시작하세요",
    description: "ChatGPT, Claude, Gemini 등 주요 AI 플랫폼을 지원합니다",
    features: {
      collect: "원클릭 대화 수집",
      manage: "통합 멀티 플랫폼 관리",
      search: "전문 검색으로 빠른 접근",
      export: "다양한 형식으로 내보내기 및 공유",
    },
  },
};
