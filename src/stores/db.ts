import Dexie, { type Table } from "dexie";
import type { Prompt, PromptVersion, Category, Tag, Settings } from "@/types/prompt";
import type { Snippet, SnippetFolder, SnippetTag, SnippetSearchIndex } from "@/types/snippet";
import type { ChatConversation, ChatTag, ChatSearchIndex } from "@/types/chat";
import { getDefaultCategories } from "@/utils/categoryUtils";

export interface PromptSearchIndex {
  promptId: string;
  tokens: string[];
  titleTokens: string[];
  tagTokens: string[];
  updatedAt: number;
}

export class APMDB extends Dexie {
  prompts!: Table<Prompt, string>;
  prompt_versions!: Table<PromptVersion, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  settings!: Table<Settings, string>;
  prompt_search_index!: Table<PromptSearchIndex, string>;
  // Snippet tables
  snippets!: Table<Snippet, string>;
  snippet_folders!: Table<SnippetFolder, string>;
  snippet_tags!: Table<SnippetTag, string>;
  snippet_search_index!: Table<SnippetSearchIndex, string>;
  // Chat tables
  chat_conversations!: Table<ChatConversation, string>;
  chat_tags!: Table<ChatTag, string>;
  chat_search_index!: Table<ChatSearchIndex, string>;

  constructor() {
    super("apm");
    this.version(1).stores({
      prompts: "id, title, tagIds, updatedAt, favorite, createdAt",
      prompt_versions: "id, promptId, createdAt",
      categories: "id, name, sort, icon",
      tags: "id, name",
      settings: "id",
    });
    this.version(2).stores({
      prompts:
        "id, title, *categoryIds, *tagIds, updatedAt, favorite, createdAt",
    });
    this.version(3).stores({
      prompts:
        "id, title, *categoryIds, *tagIds, updatedAt, favorite, createdAt",
      prompt_versions: "id, promptId, createdAt",
      categories: "id, name, sort, icon",
      tags: "id, name",
      settings: "id",
      prompt_search_index: "&promptId, *tokens, *titleTokens, *tagTokens, updatedAt",
    });
    // Version 4: Add snippet tables
    this.version(4).stores({
      prompts:
        "id, title, *categoryIds, *tagIds, updatedAt, favorite, createdAt",
      prompt_versions: "id, promptId, createdAt",
      categories: "id, name, sort, icon",
      tags: "id, name",
      settings: "id",
      prompt_search_index: "&promptId, *tokens, *titleTokens, *tagTokens, updatedAt",
      snippets: "id, title, language, folderId, *tagIds, starred, updatedAt, createdAt, usedAt, useCount",
      snippet_folders: "id, name, parentId, order, createdAt",
      snippet_tags: "id, name",
      snippet_search_index: "&snippetId, *tokens, *titleTokens, *tagTokens, updatedAt",
    });
    // Version 5: Add chat tables
    this.version(5).stores({
      prompts:
        "id, title, *categoryIds, *tagIds, updatedAt, favorite, createdAt",
      prompt_versions: "id, promptId, createdAt",
      categories: "id, name, sort, icon",
      tags: "id, name",
      settings: "id",
      prompt_search_index: "&promptId, *tokens, *titleTokens, *tagTokens, updatedAt",
      snippets: "id, title, language, folderId, *tagIds, starred, updatedAt, createdAt, usedAt, useCount",
      snippet_folders: "id, name, parentId, order, createdAt",
      snippet_tags: "id, name",
      snippet_search_index: "&snippetId, *tokens, *titleTokens, *tagTokens, updatedAt",
      chat_conversations: "id, platform, externalId, title, *tagIds, starred, updatedAt, createdAt, collectedAt, messageCount",
      chat_tags: "id, name",
      chat_search_index: "&conversationId, *tokens, *titleTokens, *tagTokens, updatedAt",
    });
  }
}

export const db = new APMDB();

export const DEFAULT_SETTINGS: Settings = {
  id: "global",
  hotkeyOpen: "Alt+K",
  enableSlash: true,
  enableSites: {},
  panelPos: null,
  theme: "auto",
  outlineEnabled: true,
  locale: "system",
  syncEnabled: false,
};

export async function getSettings(): Promise<Settings> {
  let s = await db.settings.get("global");
  if (!s) {
    s = { ...DEFAULT_SETTINGS };
    await db.settings.put(s);
  } else if (!s.locale) {
    const lang = navigator.language.toLowerCase();
    s.locale = lang.startsWith("zh") ? "zh-CN" : "en";
    await db.settings.put(s);
  }
  return s;
}

export async function ensureDefaultCategories(): Promise<boolean> {
  const existingCategories = await db.categories.toArray();
  if (existingCategories.length === 0) {
    const defaultCategories = getDefaultCategories();
    await db.categories.bulkPut(defaultCategories);
    return true;
  }
  return false;
}
