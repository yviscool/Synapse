import enTools from "../en/tools";

export default {
  ...enTools,
  title: "코드 스니펫",

  sidebar: {
    all: "전체",
    starred: "즐겨찾기",
    recent: "최근",
    uncategorized: "미분류",
    folders: "폴더",
    tags: "태그",
    newFolder: "새 폴더",
    newSnippet: "새 스니펫",
    clearAll: "지우기",
    clearTags: "태그 필터 모두 지우기",
    noTags: "태그가 없습니다",
  },

  list: {
    empty: "스니펫이 없습니다",
    emptyHint: "위 버튼을 클릭하여 첫 번째 스니펫을 만드세요",
    searchPlaceholder: "스니펫 검색...",
    sortBy: "정렬",
    sortOptions: {
      updatedAt: "업데이트순",
      createdAt: "생성순",
      title: "제목순",
      usedAt: "최근 사용순",
      useCount: "사용 횟수순",
    },
    filterByLanguage: "언어별 필터",
    clearFilters: "필터 지우기",
    items: "{count}개 스니펫",
  },

  editor: {
    titlePlaceholder: "스니펫 제목 입력...",
    contentPlaceholder: "코드를 입력하세요...",
    language: "언어",
    tags: "태그",
    tagsPlaceholder: "태그 입력 후 Enter",
    folder: "폴더",
    noFolder: "미분류",
    starred: "즐겨찾기",
    save: "저장",
    copy: "복사",
    download: "파일 다운로드",
    copySuccess: "클립보드에 복사됨",
    delete: "삭제",
    deleteConfirm: "이 스니펫을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    preview: "미리보기",
    edit: "편집",
    charCount: "{count}자",
    lineCount: "{count}줄",
    lastUsed: "최근 사용",
    useCount: "사용 횟수",
    never: "없음",
    times: "{count}회",
  },

  preview: {
    title: "HTML 미리보기",
    fullscreen: "전체 화면",
    exitFullscreen: "전체 화면 종료",
    externalLinks: "외부 링크 감지됨",
    externalLinksWarning: "이 HTML에는 확장 프로그램에서 제대로 로드되지 않을 수 있는 외부 리소스가 포함되어 있습니다.",
    exportHtml: "HTML 내보내기",
    openInCodePen: "CodePen에서 열기",
    dependencies: "외부 종속성",
  },

  folder: {
    rename: "이름 변경",
    delete: "삭제",
    deleteConfirm: "이 폴더를 삭제하시겠습니까? 내부 스니펫은 미분류로 이동됩니다.",
    newSubfolder: "새 하위 폴더",
    moveTo: "이동",
    maxDepthWarning: "폴더는 최대 3단계까지 중첩할 수 있습니다",
    namePlaceholder: "폴더 이름",
  },

  tag: {
    manage: "태그 관리",
    delete: "삭제",
    deleteConfirm: "이 태그를 삭제하시겠습니까?",
    rename: "이름 변경",
    color: "색상",
  },

  languages: {
    ...enTools.languages,
    text: "일반 텍스트",
  },

  toast: {
    saveSuccess: "스니펫 저장 완료",
    saveFailed: "저장 실패",
    deleteSuccess: "삭제 완료",
    deleteFailed: "삭제 실패",
    copySuccess: "클립보드에 복사됨",
    copyFailed: "복사 실패",
    folderCreated: "폴더 생성 완료",
    folderDeleted: "폴더 삭제 완료",
    tagDeleted: "태그 삭제 완료",
    movedToFolder: "폴더로 이동됨",
  },
};
