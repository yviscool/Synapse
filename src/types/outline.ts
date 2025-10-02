// src/types/outline.ts

export interface OutlineItem {
  id: number;      // 使用 index作为 key
  title: string;
  icon: string;
  element: Element; // 保留对原始元素的引用，用于滚动
}