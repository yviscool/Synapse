import {
  db,
  DEFAULT_SETTINGS,
  ensureDefaultCategories,
} from "./db";
import {
  upsertPromptSearchIndex,
  bulkUpsertPromptSearchIndex,
  removePromptSearchIndex,
  rebuildPromptSearchIndex,
} from "./promptSearch";
import { rebuildChatMessageSearchIndex } from "./chatMessageSearch";
import { createEventBus, createCommitNotifier } from "./repositoryHelpers";
import type {
  Prompt,
  PromptVersion,
  Category,
  Settings,
  Tag,
} from "@/types/prompt";
import type { Snippet, SnippetFolder, SnippetTag } from "@/types/snippet";
import type { ChatConversation, ChatTag } from "@/types/chat";
import { createSafePrompt } from "@/utils/promptUtils";

// Event system using shared factory
type EventType =
  | "promptsChanged"
  | "tagsChanged"
  | "categoriesChanged"
  | "settingsChanged"
  | "allChanged";

const events = createEventBus<EventType>("allChanged");

function toDataScope(eventType: EventType): "prompts" | "categories" | "tags" | "settings" {
  if (eventType === "categoriesChanged") return "categories";
  if (eventType === "tagsChanged") return "tags";
  if (eventType === "settingsChanged") return "settings";
  return "prompts";
}

const withCommitNotification = createCommitNotifier("[Repository]", events, toDataScope);

type BackupImportData = {
  prompts?: unknown;
  prompt_versions?: unknown;
  categories?: unknown;
  tags?: unknown;
  settings?: Partial<Settings>;
  // Snippets
  snippets?: unknown;
  snippet_folders?: unknown;
  snippet_tags?: unknown;
  // Chats
  chat_conversations?: unknown;
  chat_tags?: unknown;
};

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === "string" ? error : "Unknown repository error");
}

function getNextPromptVersionNumber(versions: PromptVersion[]): number {
  let maxVersionNumber = 0;
  let hasValidVersionNumber = false;

  for (const version of versions) {
    if (typeof version.versionNumber !== "number" || !Number.isFinite(version.versionNumber)) {
      continue;
    }
    hasValidVersionNumber = true;
    maxVersionNumber = Math.max(maxVersionNumber, version.versionNumber);
  }

  if (!hasValidVersionNumber) {
    return versions.length + 1;
  }

  return maxVersionNumber + 1;
}

function getPromptVersionLabel(versionNumber: unknown): string {
  if (typeof versionNumber !== "number" || !Number.isFinite(versionNumber)) {
    return "?";
  }
  return String(versionNumber);
}

function isSearchRelevantPatch(patch: Partial<Prompt>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(patch, "title") ||
    Object.prototype.hasOwnProperty.call(patch, "content") ||
    Object.prototype.hasOwnProperty.call(patch, "tagIds")
  );
}

// --- Public Repository API ---

export const repository = {
  events,

  // == Initialization ==
  async initializeDefaultCategories(): Promise<{
    ok: boolean;
    initialized: boolean;
    error?: Error;
  }> {
    try {
      const initialized = await ensureDefaultCategories();
      return { ok: true, initialized };
    } catch (error) {
      console.error(
        "[Repository] Failed to initialize default categories:",
        error,
      );
      return { ok: false, initialized: false, error: toError(error) };
    }
  },

  // == Prompts ==
  async updatePrompt(
    id: string,
    patch: Partial<Prompt>,
  ): Promise<{ ok: boolean; error?: Error }> {
    if (!patch.updatedAt) {
      patch.updatedAt = Date.now();
    }
    return withCommitNotification(
      ["prompts", "tags", "prompt_search_index"],
      async () => {
        await db.prompts.update(id, patch);
        if (isSearchRelevantPatch(patch)) {
          const updatedPrompt = await db.prompts.get(id);
          if (updatedPrompt) {
            await upsertPromptSearchIndex(updatedPrompt);
          }
        }
      },
      "promptsChanged",
    );
  },

  async savePrompt(
    promptData: Partial<Prompt>,
    tagNames: string[],
    changeNote?: string,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompts", "tags", "prompt_versions", "prompt_search_index"],
      async () => {
        const existingPrompt = promptData.id
          ? await db.prompts.get(promptData.id)
          : null;
        const isNewPrompt = !existingPrompt;

        // 1. Resolve Tags
        const tagIds: string[] = [];
        if (tagNames.length > 0) {
          const existingTags = await db.tags
            .where("name")
            .anyOf(tagNames)
            .toArray();
          const existingTagsMap = new Map(
            existingTags.map((t) => [t.name, t.id]),
          );
          for (const name of tagNames) {
            if (existingTagsMap.has(name)) {
              tagIds.push(existingTagsMap.get(name)!);
            } else {
              const newTag = { id: crypto.randomUUID(), name };
              await db.tags.add(newTag);
              tagIds.push(newTag.id);
            }
          }
        }

        // 2. Prepare Prompt
        const safePrompt = createSafePrompt({ ...promptData, tagIds });

        // 3. Handle Versioning with new Git-like model
        if (isNewPrompt) {
          // 首次创建：创建 v1 初始版本
          const initialVersion: PromptVersion = {
            id: crypto.randomUUID(),
            promptId: safePrompt.id!,
            versionNumber: 1,
            content: safePrompt.content,
            title: safePrompt.title,
            type: "initial",
            note: changeNote || undefined,
            createdAt: Date.now(),
          };
          await db.prompt_versions.add(initialVersion);
        } else {
          // 编辑已有 Prompt：如果内容变化则创建新版本
          const originalPrompt = existingPrompt;
          if (originalPrompt && originalPrompt.content !== safePrompt.content) {
            // 获取当前最大版本号（兼容旧数据：旧版本可能没有 versionNumber 字段）
            const allVersions = await db.prompt_versions
              .where("promptId")
              .equals(safePrompt.id!)
              .toArray();
            const nextVersionNumber = getNextPromptVersionNumber(allVersions);

            const newVersion: PromptVersion = {
              id: crypto.randomUUID(),
              promptId: safePrompt.id!,
              versionNumber: nextVersionNumber,
              content: safePrompt.content, // 保存【新内容】
              title: safePrompt.title,
              type: "edit",
              note: changeNote || undefined,
              createdAt: Date.now(),
            };
            await db.prompt_versions.add(newVersion);
          }
        }

        // 4. Add or Update Prompt
        if (!isNewPrompt) {
          safePrompt.updatedAt = Date.now();
        }

        await db.prompts.put(safePrompt);
        await upsertPromptSearchIndex(safePrompt);
      },
      "allChanged", // Use allChanged to ensure tags and prompts are updated everywhere
    );
  },

  async deletePrompt(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompts", "prompt_versions", "prompt_search_index"],
      async () => {
        await db.prompts.delete(id);
        await db.prompt_versions.where("promptId").equals(id).delete();
        await removePromptSearchIndex(id);
      },
      "promptsChanged",
    );
  },

  async mergePrompts(
    promptsToImport: Prompt[],
    targetCategoryIds: string[],
    additionalTagsFromModal: string[],
  ): Promise<{
    ok: boolean;
    data?: { importedCount: number; skippedCount: number };
    error?: Error;
  }> {
    return withCommitNotification(
      ["prompts", "tags", "prompt_search_index"],
      async () => {
        const existingTitles = new Set(
          (await db.prompts.toArray()).map((p) => p.title),
        );
        const newPrompts: Prompt[] = [];
        const allTagNames = new Set<string>();
        additionalTagsFromModal.forEach((t) => allTagNames.add(t));
        promptsToImport.forEach((p) => {
          if (Array.isArray(p.tagIds)) {
            p.tagIds.forEach((tagName) => allTagNames.add(String(tagName)));
          }
        });
        const tagNameToIdMap = new Map<string, string>();
        const tagNamesArray = [...allTagNames];
        if (tagNamesArray.length > 0) {
          const existingTags = await db.tags
            .where("name")
            .anyOf(tagNamesArray)
            .toArray();
          existingTags.forEach((tag) => tagNameToIdMap.set(tag.name, tag.id));
          for (const name of tagNamesArray) {
            if (!tagNameToIdMap.has(name)) {
              const newTag = { id: crypto.randomUUID(), name };
              await db.tags.add(newTag);
              tagNameToIdMap.set(name, newTag.id);
            }
          }
        }
        for (const p of promptsToImport) {
          if (!p.title || existingTitles.has(p.title)) {
            continue;
          }
          const tagIdsFromFile: string[] = [];
          if (Array.isArray(p.tagIds)) {
            p.tagIds.forEach((tagName) => {
              const id = tagNameToIdMap.get(String(tagName));
              if (id) tagIdsFromFile.push(id);
            });
          }
          const tagIdsFromModal: string[] = additionalTagsFromModal
            .map((name) => tagNameToIdMap.get(name))
            .filter(Boolean) as string[];
          const finalTagIds = [
            ...new Set([...tagIdsFromFile, ...tagIdsFromModal]),
          ];
          const newPrompt = createSafePrompt({
            title: p.title,
            content: p.content,
            categoryIds: targetCategoryIds,
            tagIds: finalTagIds,
            favorite: false,
          });
          newPrompt.id = crypto.randomUUID();
          newPrompts.push(newPrompt);
          existingTitles.add(newPrompt.title);
        }
        if (newPrompts.length > 0) {
          await db.prompts.bulkAdd(newPrompts);
          await bulkUpsertPromptSearchIndex(newPrompts);
        }
        return {
          importedCount: newPrompts.length,
          skippedCount: promptsToImport.length - newPrompts.length,
        };
      },
      "allChanged",
    );
  },

  // == Categories ==
  async addCategory(
    category: Pick<Category, "name" | "icon">,
  ): Promise<{ ok: boolean; error?: Error }> {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      sort: 0,
    };
    return withCommitNotification(
      ["categories"],
      () => db.categories.add(newCategory),
      "categoriesChanged",
    );
  },

  async updateCategory(
    id: string,
    patch: Partial<Category>,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["categories"],
      () => db.categories.update(id, patch),
      "categoriesChanged",
    );
  },

  async deleteCategory(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["categories", "prompts"],
      async () => {
        await db.categories.delete(id);
        // Prompts are now un-categorized instead of being deleted.
        const promptsToUpdate = await db.prompts
          .where("categoryIds")
          .equals(id)
          .toArray();
        const updates = promptsToUpdate.map((prompt) => ({
          key: prompt.id,
          changes: {
            categoryIds: prompt.categoryIds.filter((catId) => catId !== id),
          },
        }));
        if (updates.length > 0) {
          await db.prompts.bulkUpdate(updates);
        }
      },
      "allChanged",
    );
  },

  async deletePromptsByCategory(
    categoryId: string,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompts", "prompt_versions", "prompt_search_index"],
      async () => {
        const promptsToDelete = await db.prompts
          .where("categoryIds")
          .equals(categoryId)
          .toArray();
        if (promptsToDelete.length === 0) return;

        const promptIds = promptsToDelete.map((p) => p.id);
        await db.prompts.bulkDelete(promptIds);
        await db.prompt_versions.where("promptId").anyOf(promptIds).delete();
        await removePromptSearchIndex(promptIds);
      },
      "allChanged",
    );
  },

  async deleteCategoryAndPrompts(
    categoryId: string,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["categories", "prompts", "prompt_versions", "prompt_search_index"],
      async () => {
        // First, delete the prompts and their versions
        const promptsToDelete = await db.prompts
          .where("categoryIds")
          .equals(categoryId)
          .toArray();
        if (promptsToDelete.length > 0) {
          const promptIds = promptsToDelete.map((p) => p.id);
          await db.prompts.bulkDelete(promptIds);
          await db.prompt_versions.where("promptId").anyOf(promptIds).delete();
          await removePromptSearchIndex(promptIds);
        }
        // Then, delete the category itself
        await db.categories.delete(categoryId);
      },
      "allChanged",
    );
  },

  async deletePromptsByTagsInCategory(
    categoryId: string,
    tagIds: string[],
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompts", "prompt_versions", "prompt_search_index"],
      async () => {
        if (tagIds.length === 0) return;

        const promptsToDelete = await db.prompts
          .where("categoryIds")
          .equals(categoryId)
          .filter((prompt) =>
            tagIds.some((tagId) => prompt.tagIds.includes(tagId)),
          )
          .toArray();

        if (promptsToDelete.length === 0) return;

        const promptIds = promptsToDelete.map((p) => p.id);
        await db.prompts.bulkDelete(promptIds);
        await db.prompt_versions.where("promptId").anyOf(promptIds).delete();
        await removePromptSearchIndex(promptIds);
      },
      "allChanged",
    );
  },

  async updateCategoryOrder(
    categories: Category[],
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["categories"],
      () => db.categories.bulkPut(categories),
      "categoriesChanged",
    );
  },

  // == Tags ==
  // findOrCreateTags is now internal to savePrompt

  // == Versions ==
  /**
   * 应用历史版本：创建一个新版本（type: revert），内容为目标版本的内容
   * 这是 Git-like 模型：历史永远向前，恢复操作实际上是创建新版本
   */
  async applyVersion(
    promptId: string,
    versionId: string,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompts", "prompt_versions", "prompt_search_index"],
      async () => {
        const versionToApply = await db.prompt_versions.get(versionId);
        if (!versionToApply || versionToApply.promptId !== promptId)
          throw new Error("版本不存在或不匹配");

        const prompt = await db.prompts.get(promptId);
        if (!prompt) throw new Error("Prompt 不存在");

        // 获取当前最大版本号（兼容旧数据：旧版本可能没有 versionNumber 字段）
        const allVersions = await db.prompt_versions
          .where("promptId")
          .equals(promptId)
          .toArray();
        const nextVersionNumber = getNextPromptVersionNumber(allVersions);
        const targetVersionNumber = getPromptVersionLabel(versionToApply.versionNumber);

        // 安全获取 title：如果旧版本没有 title，回退到当前 prompt 的 title
        const safeTitle = versionToApply.title || prompt.title;

        // 创建新版本（type: revert），内容为目标版本的内容
        const revertVersion: PromptVersion = {
          id: crypto.randomUUID(),
          promptId: promptId,
          versionNumber: nextVersionNumber,
          content: versionToApply.content,
          title: safeTitle,
          type: "revert",
          note: `恢复到 v${targetVersionNumber}`,
          createdAt: Date.now(),
        };
        await db.prompt_versions.add(revertVersion);

        // 更新 Prompt 内容为目标版本内容（title 仅在目标版本有值时才更新）
        await db.prompts.update(promptId, {
          content: versionToApply.content,
          ...(versionToApply.title ? { title: versionToApply.title } : {}),
          updatedAt: Date.now(),
        });

        const updatedPrompt = await db.prompts.get(promptId);
        if (updatedPrompt) {
          await upsertPromptSearchIndex(updatedPrompt);
        }
      },
      "promptsChanged",
    );
  },

  async deleteVersion(
    versionId: string,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["prompt_versions"],
      async () => {
        const version = await db.prompt_versions.get(versionId);
        if (!version) throw new Error("版本不存在");

        const versions = await db.prompt_versions
          .where("promptId")
          .equals(version.promptId)
          .toArray();
        if (versions.length <= 1) throw new Error("不能删除最后一个版本");

        await db.prompt_versions.delete(versionId);
      },
      "promptsChanged",
    );
  },

  // == Settings ==
  async setSettings(settings: Settings): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["settings"],
      () => db.settings.put(settings),
      "settingsChanged",
    );
  },

  // == Data Management ==
  async importDataFromBackup(
    importedData: BackupImportData,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      [
        db.prompts,
        db.prompt_versions,
        db.categories,
        db.tags,
        db.settings,
        db.prompt_search_index,
        db.snippets,
        db.snippet_folders,
        db.snippet_tags,
        db.chat_conversations,
        db.chat_tags,
        db.chat_message_search_index,
      ],
      async () => {
        const currentSettings = await db.settings.get("global");

        // --- Prompts ---
        await db.prompts.clear();
        await db.prompt_versions.clear();
        await db.categories.clear();
        await db.tags.clear();
        await db.prompt_search_index.clear();
        if (Array.isArray(importedData.prompts)) {
          await db.prompts.bulkPut(importedData.prompts as Prompt[]);
        }
        if (Array.isArray(importedData.prompt_versions)) {
          await db.prompt_versions.bulkPut(importedData.prompt_versions as PromptVersion[]);
        }
        if (Array.isArray(importedData.categories)) {
          await db.categories.bulkPut(importedData.categories as Category[]);
        }
        if (Array.isArray(importedData.tags)) {
          await db.tags.bulkPut(importedData.tags as Tag[]);
        }

        // --- Snippets ---
        await db.snippets.clear();
        await db.snippet_folders.clear();
        await db.snippet_tags.clear();
        if (Array.isArray(importedData.snippets)) {
          await db.snippets.bulkPut(importedData.snippets as Snippet[]);
        }
        if (Array.isArray(importedData.snippet_folders)) {
          await db.snippet_folders.bulkPut(importedData.snippet_folders as SnippetFolder[]);
        }
        if (Array.isArray(importedData.snippet_tags)) {
          await db.snippet_tags.bulkPut(importedData.snippet_tags as SnippetTag[]);
        }

        // --- Chats ---
        await db.chat_conversations.clear();
        await db.chat_tags.clear();
        await db.chat_message_search_index.clear();
        if (Array.isArray(importedData.chat_conversations)) {
          await db.chat_conversations.bulkPut(importedData.chat_conversations as ChatConversation[]);
        }
        if (Array.isArray(importedData.chat_tags)) {
          await db.chat_tags.bulkPut(importedData.chat_tags as ChatTag[]);
        }

        // --- Settings ---
        const settingsToApply: Settings = {
          ...DEFAULT_SETTINGS,
          ...(importedData.settings || {}),
          id: "global",
        };
        if (currentSettings) {
          settingsToApply.syncEnabled = currentSettings.syncEnabled;
          settingsToApply.syncProvider = currentSettings.syncProvider;
          settingsToApply.userProfile = currentSettings.userProfile;
          settingsToApply.lastSyncTimestamp = currentSettings.lastSyncTimestamp;
        }
        await db.settings.put(settingsToApply);

        // --- Rebuild search indexes ---
        await rebuildPromptSearchIndex();
        await rebuildChatMessageSearchIndex();
      },
      "allChanged",
    );
  },

  async resetAllData(): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      [
        db.prompts,
        db.prompt_versions,
        db.categories,
        db.tags,
        db.settings,
        db.prompt_search_index,
        db.snippets,
        db.snippet_folders,
        db.snippet_tags,
        db.chat_conversations,
        db.chat_tags,
        db.chat_message_search_index,
      ],
      async () => {
        const currentSettings = await db.settings.get("global");

        // --- Prompts ---
        await db.prompts.clear();
        await db.prompt_versions.clear();
        await db.categories.clear();
        await db.tags.clear();
        await db.prompt_search_index.clear();

        // --- Snippets ---
        await db.snippets.clear();
        await db.snippet_folders.clear();
        await db.snippet_tags.clear();

        // --- Chats ---
        await db.chat_conversations.clear();
        await db.chat_tags.clear();
        await db.chat_message_search_index.clear();

        // --- Settings ---
        await db.settings.clear();
        const newSettings: Settings = {
          ...DEFAULT_SETTINGS,
          id: "global",
        };
        if (currentSettings) {
          newSettings.syncEnabled = currentSettings.syncEnabled;
          newSettings.syncProvider = currentSettings.syncProvider;
          newSettings.userProfile = currentSettings.userProfile;
          newSettings.lastSyncTimestamp = currentSettings.lastSyncTimestamp;
        }
        await db.settings.put(newSettings);
      },
      "allChanged",
    );
  },
};
