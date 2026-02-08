import {
  db,
  DEFAULT_SETTINGS,
  ensureDefaultCategories,
  upsertPromptSearchIndex,
  bulkUpsertPromptSearchIndex,
  removePromptSearchIndex,
  rebuildPromptSearchIndex,
} from "./db";
import type {
  Prompt,
  PromptVersion,
  Category,
  Tag,
  Settings,
} from "@/types/prompt";
import { MSG } from "@/utils/messaging";
import { createSafePrompt } from "@/utils/promptUtils";
import type { Dexie, Transaction } from "dexie";

// A simple, typed event emitter (a tiny version of 'mitt')
type EventType =
  | "promptsChanged"
  | "tagsChanged"
  | "categoriesChanged"
  | "settingsChanged"
  | "allChanged";
type Handler = (data?: any) => void;
const allEvents = new Map<EventType, Handler[]>();

const events = {
  on(type: EventType, handler: Handler) {
    const handlers = allEvents.get(type);
    if (handlers) {
      handlers.push(handler);
    } else {
      allEvents.set(type, [handler]);
    }
  },
  off(type: EventType, handler: Handler) {
    const handlers = allEvents.get(type);
    if (handlers) {
      handlers.splice(handlers.indexOf(handler) >>> 0, 1);
    }
  },
  emit(type: EventType, evt?: any) {
    (allEvents.get(type) || []).forEach((handler) => {
      handler(evt);
    });
    if (type !== "allChanged") {
      (allEvents.get("allChanged") || []).forEach((handler) => {
        handler(evt);
      });
    }
  },
};

function toDataScope(eventType: EventType): "prompts" | "categories" | "tags" | "settings" {
  if (eventType === "categoriesChanged") return "categories";
  if (eventType === "tagsChanged") return "tags";
  if (eventType === "settingsChanged") return "settings";
  return "prompts";
}

function isSearchRelevantPatch(patch: Partial<Prompt>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(patch, "title") ||
    Object.prototype.hasOwnProperty.call(patch, "content") ||
    Object.prototype.hasOwnProperty.call(patch, "tagIds")
  );
}

/**
 * A wrapper for database write operations that ensures notifications are sent
 * only after the transaction is successfully committed.
 */
async function withCommitNotification(
  tables: (keyof typeof db | Dexie.Table)[],
  operation: (trans: Transaction) => Promise<any>,
  eventType: EventType,
  eventData?: any,
) {
  try {
    const result = await db.transaction(
      "rw",
      tables as Dexie.Table[],
      async (trans) => {
        const opResult = await operation(trans);

        trans.on("complete", async () => {
          console.log(
            `[Repository] Transaction completed. Emitting '${eventType}'.`,
          );
          events.emit(eventType, eventData);
          chrome.runtime.sendMessage({
            type: MSG.DATA_UPDATED,
            data: {
              scope: toDataScope(eventType),
              version: Date.now().toString(),
            },
          });
        });

        trans.on("error", (err) => {
          console.error("[Repository] Transaction failed.", err);
        });

        return opResult;
      },
    );
    return { ok: true, data: result };
  } catch (error) {
    console.error(
      `[Repository] Error during transaction for event '${eventType}':`,
      error,
    );
    return { ok: false, error };
  }
}

// --- Public Repository API ---

export const repository = {
  events,

  // == Initialization ==
  async initializeDefaultCategories(): Promise<{
    ok: boolean;
    initialized: boolean;
    error?: any;
  }> {
    try {
      const initialized = await ensureDefaultCategories();
      return { ok: true, initialized };
    } catch (error) {
      console.error(
        "[Repository] Failed to initialize default categories:",
        error,
      );
      return { ok: false, initialized: false, error };
    }
  },

  // == Prompts ==
  async updatePrompt(
    id: string,
    patch: Partial<Prompt>,
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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

            // 安全获取下一个版本号：如果旧数据没有 versionNumber，则使用数组长度+1
            const nextVersionNumber = allVersions.length > 0
              ? Math.max(...allVersions.map(v => typeof v.versionNumber === 'number' && !isNaN(v.versionNumber) ? v.versionNumber : 0)) + 1
              : 1;

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

  async deletePrompt(id: string): Promise<{ ok: boolean; error?: any }> {
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
    error?: any;
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
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ["categories"],
      () => db.categories.update(id, patch),
      "categoriesChanged",
    );
  },

  async deleteCategory(id: string): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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
  ): Promise<{ ok: boolean; error?: any }> {
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

        // 安全获取下一个版本号
        const nextVersionNumber = allVersions.length > 0
          ? Math.max(...allVersions.map(v => typeof v.versionNumber === 'number' && !isNaN(v.versionNumber) ? v.versionNumber : 0)) + 1
          : 1;

        // 安全获取目标版本号（用于 note）
        const targetVersionNumber = typeof versionToApply.versionNumber === 'number' && !isNaN(versionToApply.versionNumber)
          ? versionToApply.versionNumber
          : '?';

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
  ): Promise<{ ok: boolean; error?: any }> {
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
  async setSettings(settings: Settings): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ["settings"],
      () => db.settings.put(settings),
      "settingsChanged",
    );
  },

  // == Data Management ==
  async importDataFromBackup(
    importedData: any,
  ): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      [
        db.prompts,
        db.prompt_versions,
        db.categories,
        db.tags,
        db.settings,
        db.prompt_search_index,
      ],
      async () => {
        const currentSettings = await db.settings.get("global");
        await db.prompts.clear();
        await db.prompt_versions.clear();
        await db.categories.clear();
        await db.tags.clear();
        await db.prompt_search_index.clear();
        if (importedData.prompts)
          await db.prompts.bulkPut(importedData.prompts);
        if (importedData.prompt_versions)
          await db.prompt_versions.bulkPut(importedData.prompt_versions);
        if (importedData.categories)
          await db.categories.bulkPut(importedData.categories);
        if (importedData.tags) await db.tags.bulkPut(importedData.tags);
        const settingsToApply = importedData.settings || {
          ...DEFAULT_SETTINGS,
        };
        if (currentSettings) {
          settingsToApply.syncEnabled = currentSettings.syncEnabled;
          settingsToApply.syncProvider = currentSettings.syncProvider;
          settingsToApply.userProfile = currentSettings.userProfile;
          settingsToApply.lastSyncTimestamp = currentSettings.lastSyncTimestamp;
        }
        await db.settings.put(settingsToApply);
        await rebuildPromptSearchIndex();
      },
      "allChanged",
    );
  },

  async resetAllData(): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      [
        db.prompts,
        db.prompt_versions,
        db.categories,
        db.tags,
        db.settings,
        db.prompt_search_index,
      ],
      async () => {
        const currentSettings = await db.settings.get("global");
        await db.prompts.clear();
        await db.prompt_versions.clear();
        await db.categories.clear();
        await db.tags.clear();
        await db.settings.clear();
        await db.prompt_search_index.clear();

        const newSettings: Settings = {
          ...DEFAULT_SETTINGS,
          id: "global", // Explicitly set the key path
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
