import enCategories from "../en/categories";

export default {
  ...enCategories,
  defaultCategories: {
    ...enCategories.defaultCategories,
    creative: "창의",
    image: "이미지",
    writing: "글쓰기",
    coding: "코딩",
    analysis: "분석",
    marketing: "마케팅",
    education: "교육",
    roleplay: "롤플레잉",
    lifestyle: "라이프스타일",
    translation: "번역",
    other: "기타",
  },
  all: "모든 카테고리",
};
