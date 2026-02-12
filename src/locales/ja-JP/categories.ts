import enCategories from "../en/categories";

export default {
  ...enCategories,
  defaultCategories: {
    ...enCategories.defaultCategories,
    creative: "クリエイティブ",
    image: "画像",
    writing: "文章",
    coding: "コーディング",
    analysis: "分析",
    marketing: "マーケティング",
    education: "教育",
    roleplay: "ロールプレイ",
    lifestyle: "ライフスタイル",
    translation: "翻訳",
    other: "その他",
  },
  all: "すべてのカテゴリ",
};
