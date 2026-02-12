import enCategories from "../en/categories";

export default {
  ...enCategories,
  defaultCategories: {
    ...enCategories.defaultCategories,
    creative: "Kreativ",
    image: "Bild",
    writing: "Schreiben",
    coding: "Programmierung",
    analysis: "Analyse",
    marketing: "Marketing",
    education: "Bildung",
    roleplay: "Rollenspiel",
    lifestyle: "Lifestyle",
    translation: "Übersetzung",
    other: "Sonstiges",
  },
  all: "Alle Kategorien",
};
