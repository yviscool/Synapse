import zhCNCategories from "../zh-CN/categories";

export default {
  ...zhCNCategories,
  defaultCategories: {
    ...zhCNCategories.defaultCategories,
    creative: "創意",
    image: "圖像",
    writing: "寫作",
    coding: "程式",
    analysis: "分析",
    marketing: "行銷",
    education: "教育",
    roleplay: "角色扮演",
    lifestyle: "生活",
    translation: "翻譯",
    other: "其他",
  },
  all: "所有分類",
};
