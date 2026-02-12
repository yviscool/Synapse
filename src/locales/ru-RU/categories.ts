import enCategories from "../en/categories";

export default {
  ...enCategories,
  defaultCategories: {
    ...enCategories.defaultCategories,
    creative: "Креатив",
    image: "Изображения",
    writing: "Письмо",
    coding: "Кодинг",
    analysis: "Аналитика",
    marketing: "Маркетинг",
    education: "Обучение",
    roleplay: "Ролевая игра",
    lifestyle: "Лайфстайл",
    translation: "Перевод",
    other: "Другое",
  },
  all: "Все категории",
};
