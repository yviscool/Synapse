import { db } from "./db";
import {
  upsertSnippetSearchIndex,
  bulkUpsertSnippetSearchIndex,
  removeSnippetSearchIndex,
} from "./snippetSearch";
import { createEventBus, createCommitNotifier } from "./repositoryHelpers";
import type {
  Snippet,
  SnippetFolder,
  SnippetTag,
  QuerySnippetsParams,
  QuerySnippetsResult,
} from "@/types/snippet";
import { compareLocalizedText } from "@/utils/intl";

// Event system using shared factory
type EventType =
  | "snippetsChanged"
  | "foldersChanged"
  | "snippetTagsChanged"
  | "allSnippetDataChanged";

const events = createEventBus<EventType>("allSnippetDataChanged");

function toDataScope(eventType: EventType): string {
  if (eventType === "foldersChanged") return "snippet_folders";
  if (eventType === "snippetTagsChanged") return "snippet_tags";
  return "snippets";
}

const withCommitNotification = createCommitNotifier("[SnippetRepository]", events, toDataScope);

function isSearchRelevantPatch(patch: Partial<Snippet>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(patch, "title") ||
    Object.prototype.hasOwnProperty.call(patch, "content") ||
    Object.prototype.hasOwnProperty.call(patch, "tagIds")
  );
}

function createSafeSnippet(data: Partial<Snippet>): Snippet {
  const now = Date.now();
  return {
    id: data.id || crypto.randomUUID(),
    title: data.title || "",
    content: data.content || "",
    language: data.language || "text",
    folderId: data.folderId ?? null,
    tagIds: data.tagIds || [],
    starred: data.starred || false,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    usedAt: data.usedAt ?? null,
    useCount: data.useCount || 0,
    dependencies: data.dependencies,
  };
}

async function listSiblingFolders(parentId: string | null): Promise<SnippetFolder[]> {
  if (parentId === null) {
    return db.snippet_folders.filter((folder) => folder.parentId === null).toArray();
  }
  return db.snippet_folders.where("parentId").equals(parentId).toArray();
}

// ============================================
// Public Repository API
// ============================================

export const snippetRepository = {
  events,

  // == Snippets ==
  async saveSnippet(
    snippetData: Partial<Snippet>,
    tagNames: string[],
  ): Promise<{ ok: boolean; data?: Snippet; error?: Error }> {
    return withCommitNotification(
      ["snippets", "snippet_tags", "snippet_search_index"],
      async () => {
        // 1. Resolve Tags
        const tagIds: string[] = [];
        if (tagNames.length > 0) {
          const existingTags = await db.snippet_tags
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
              const newTag: SnippetTag = { id: crypto.randomUUID(), name };
              await db.snippet_tags.add(newTag);
              tagIds.push(newTag.id);
            }
          }
        }

        // 2. Prepare Snippet
        const safeSnippet = createSafeSnippet({ ...snippetData, tagIds });

        // 3. Check if update or create
        const existingSnippet = snippetData.id
          ? await db.snippets.get(snippetData.id)
          : null;

        if (existingSnippet) {
          safeSnippet.updatedAt = Date.now();
          safeSnippet.createdAt = existingSnippet.createdAt;
        }

        // 4. Save snippet
        await db.snippets.put(safeSnippet);
        await upsertSnippetSearchIndex(safeSnippet);

        return safeSnippet;
      },
      "allSnippetDataChanged",
    );
  },

  async updateSnippet(
    id: string,
    patch: Partial<Snippet>,
  ): Promise<{ ok: boolean; error?: Error }> {
    if (!patch.updatedAt) {
      patch.updatedAt = Date.now();
    }
    return withCommitNotification(
      ["snippets", "snippet_tags", "snippet_search_index"],
      async () => {
        await db.snippets.update(id, patch);
        if (isSearchRelevantPatch(patch)) {
          const updatedSnippet = await db.snippets.get(id);
          if (updatedSnippet) {
            await upsertSnippetSearchIndex(updatedSnippet);
          }
        }
      },
      "snippetsChanged",
    );
  },

  async deleteSnippet(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippets", "snippet_search_index"],
      async () => {
        await db.snippets.delete(id);
        await removeSnippetSearchIndex(id);
      },
      "snippetsChanged",
    );
  },

  async deleteSnippets(ids: string[]): Promise<{ ok: boolean; error?: Error }> {
    if (ids.length === 0) return { ok: true };
    return withCommitNotification(
      ["snippets", "snippet_search_index"],
      async () => {
        await db.snippets.bulkDelete(ids);
        await removeSnippetSearchIndex(ids);
      },
      "snippetsChanged",
    );
  },

  async toggleStarred(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippets"],
      async () => {
        const snippet = await db.snippets.get(id);
        if (snippet) {
          await db.snippets.update(id, {
            starred: !snippet.starred,
            updatedAt: Date.now(),
          });
        }
      },
      "snippetsChanged",
    );
  },

  async recordUsage(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippets"],
      async () => {
        const snippet = await db.snippets.get(id);
        if (snippet) {
          await db.snippets.update(id, {
            usedAt: Date.now(),
            useCount: (snippet.useCount || 0) + 1,
          });
        }
      },
      "snippetsChanged",
    );
  },

  async moveSnippetToFolder(
    snippetId: string,
    folderId: string | null,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippets"],
      async () => {
        await db.snippets.update(snippetId, {
          folderId,
          updatedAt: Date.now(),
        });
      },
      "snippetsChanged",
    );
  },

  // == Folders ==
  async createFolder(
    data: Pick<SnippetFolder, "name" | "parentId">,
  ): Promise<{ ok: boolean; data?: SnippetFolder; error?: Error }> {
    // Validate max depth (3 levels)
    if (data.parentId) {
      const parent = await db.snippet_folders.get(data.parentId);
      if (parent?.parentId) {
        const grandparent = await db.snippet_folders.get(parent.parentId);
        if (grandparent?.parentId) {
          return { ok: false, error: new Error("Maximum folder depth (3 levels) exceeded") };
        }
      }
    }

    return withCommitNotification(
      ["snippet_folders"],
      async () => {
        // Get max order for siblings
        const siblings = await listSiblingFolders(data.parentId ?? null);
        const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), -1);

        const folder: SnippetFolder = {
          id: crypto.randomUUID(),
          name: data.name,
          parentId: data.parentId,
          order: maxOrder + 1,
          createdAt: Date.now(),
        };
        await db.snippet_folders.add(folder);
        return folder;
      },
      "foldersChanged",
    );
  },

  async updateFolder(
    id: string,
    patch: Partial<SnippetFolder>,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippet_folders"],
      async () => {
        await db.snippet_folders.update(id, patch);
      },
      "foldersChanged",
    );
  },

  async deleteFolder(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippet_folders", "snippets"],
      async () => {
        // Get all descendant folder IDs
        const allFolderIds = [id];
        const queue = [id];
        while (queue.length > 0) {
          const parentId = queue.shift()!;
          const children = await db.snippet_folders
            .where("parentId")
            .equals(parentId)
            .toArray();
          for (const child of children) {
            allFolderIds.push(child.id);
            queue.push(child.id);
          }
        }

        // Move snippets in deleted folders to uncategorized
        for (const folderId of allFolderIds) {
          await db.snippets
            .where("folderId")
            .equals(folderId)
            .modify({ folderId: null });
        }

        // Delete all folders
        await db.snippet_folders.bulkDelete(allFolderIds);
      },
      "allSnippetDataChanged",
    );
  },

  async moveFolder(
    id: string,
    newParentId: string | null,
  ): Promise<{ ok: boolean; error?: Error }> {
    // Validate: can't move to self or descendant
    if (newParentId === id) {
      return { ok: false, error: new Error("Cannot move folder to itself") };
    }

    // Check if newParentId is a descendant of id
    if (newParentId) {
      let current = await db.snippet_folders.get(newParentId);
      while (current) {
        if (current.parentId === id) {
          return { ok: false, error: new Error("Cannot move folder to its descendant") };
        }
        current = current.parentId
          ? await db.snippet_folders.get(current.parentId)
          : undefined;
      }
    }

    // Validate max depth
    if (newParentId) {
      let depth = 1;
      let parent = await db.snippet_folders.get(newParentId);
      while (parent?.parentId) {
        depth++;
        parent = await db.snippet_folders.get(parent.parentId);
      }
      // Check depth of subtree being moved
      const getMaxSubtreeDepth = async (folderId: string): Promise<number> => {
        const children = await db.snippet_folders
          .where("parentId")
          .equals(folderId)
          .toArray();
        if (children.length === 0) return 0;
        const childDepths = await Promise.all(
          children.map((c) => getMaxSubtreeDepth(c.id)),
        );
        return 1 + Math.max(...childDepths);
      };
      const subtreeDepth = await getMaxSubtreeDepth(id);
      if (depth + 1 + subtreeDepth > 3) {
        return { ok: false, error: new Error("Maximum folder depth (3 levels) exceeded") };
      }
    }

    return withCommitNotification(
      ["snippet_folders"],
      async () => {
        // Get max order for new siblings
        const siblings = await listSiblingFolders(newParentId ?? null);
        const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), -1);

        await db.snippet_folders.update(id, {
          parentId: newParentId,
          order: maxOrder + 1,
        });
      },
      "foldersChanged",
    );
  },

  async reorderFolders(
    folders: Array<{ id: string; order: number }>,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippet_folders"],
      async () => {
        for (const { id, order } of folders) {
          await db.snippet_folders.update(id, { order });
        }
      },
      "foldersChanged",
    );
  },

  // == Tags ==
  async createTag(name: string, color?: string): Promise<{ ok: boolean; data?: SnippetTag; error?: Error }> {
    return withCommitNotification(
      ["snippet_tags"],
      async () => {
        const existing = await db.snippet_tags.where("name").equals(name).first();
        if (existing) {
          return existing;
        }
        const tag: SnippetTag = {
          id: crypto.randomUUID(),
          name,
          color,
        };
        await db.snippet_tags.add(tag);
        return tag;
      },
      "snippetTagsChanged",
    );
  },

  async updateTag(
    id: string,
    patch: Partial<SnippetTag>,
  ): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippet_tags"],
      async () => {
        await db.snippet_tags.update(id, patch);
      },
      "snippetTagsChanged",
    );
  },

  async deleteTag(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["snippet_tags", "snippets", "snippet_search_index"],
      async () => {
        // Remove tag from all snippets
        const snippetsWithTag = await db.snippets
          .where("tagIds")
          .equals(id)
          .toArray();
        for (const snippet of snippetsWithTag) {
          const newTagIds = snippet.tagIds.filter((t) => t !== id);
          await db.snippets.update(snippet.id, { tagIds: newTagIds });
          await upsertSnippetSearchIndex({ ...snippet, tagIds: newTagIds });
        }
        // Delete the tag
        await db.snippet_tags.delete(id);
      },
      "allSnippetDataChanged",
    );
  },

  // == Query ==
  async getAllFolders(): Promise<SnippetFolder[]> {
    return db.snippet_folders.orderBy("order").toArray();
  },

  async getAllTags(): Promise<SnippetTag[]> {
    return db.snippet_tags.toArray();
  },

  async getTagsWithCount(): Promise<Array<SnippetTag & { count: number }>> {
    const tags = await db.snippet_tags.toArray();
    const result: Array<SnippetTag & { count: number }> = [];
    for (const tag of tags) {
      const count = await db.snippets
        .where("tagIds")
        .equals(tag.id)
        .count();
      result.push({ ...tag, count });
    }
    return result;
  },

  async querySnippets(params: QuerySnippetsParams = {}): Promise<QuerySnippetsResult> {
    const {
      searchQuery,
      folderId,
      tagIds,
      languages,
      starredOnly,
      sortBy = "updatedAt",
      page = 1,
      limit = 20,
    } = params;

    const offset = (page - 1) * limit;

    // Build base query
    let collection = db.snippets.toCollection();

    // Apply filters
    const filters: ((s: Snippet) => boolean)[] = [];

    if (folderId !== undefined) {
      filters.push((s) => s.folderId === folderId);
    }

    if (starredOnly) {
      filters.push((s) => s.starred);
    }

    if (tagIds && tagIds.length > 0) {
      filters.push((s) => tagIds.every((tagId) => s.tagIds.includes(tagId)));
    }

    if (languages && languages.length > 0) {
      filters.push((s) => languages.includes(s.language));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filters.push((s) =>
        s.title.toLowerCase().includes(query) ||
        s.content.toLowerCase().includes(query)
      );
    }

    // Get all matching snippets
    let snippets = await collection.toArray();

    if (filters.length > 0) {
      snippets = snippets.filter((s) => filters.every((f) => f(s)));
    }

    // Sort
    snippets.sort((a, b) => {
      if (sortBy === "title") {
        return compareLocalizedText(a.title, b.title);
      }
      if (sortBy === "usedAt") {
        return (b.usedAt || 0) - (a.usedAt || 0);
      }
      if (sortBy === "useCount") {
        return b.useCount - a.useCount;
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });

    const total = snippets.length;
    const paginatedSnippets = snippets.slice(offset, offset + limit);

    return { snippets: paginatedSnippets, total };
  },

  async getSnippetById(id: string): Promise<Snippet | undefined> {
    return db.snippets.get(id);
  },

  async getRecentSnippets(limit: number = 10): Promise<Snippet[]> {
    return db.snippets
      .orderBy("usedAt")
      .reverse()
      .filter((s) => s.usedAt !== null)
      .limit(limit)
      .toArray();
  },

  async getSnippetCountByFolder(): Promise<Map<string | null, number>> {
    const snippets = await db.snippets.toArray();
    const countMap = new Map<string | null, number>();
    for (const snippet of snippets) {
      const folderId = snippet.folderId;
      countMap.set(folderId, (countMap.get(folderId) || 0) + 1);
    }
    return countMap;
  },
};
