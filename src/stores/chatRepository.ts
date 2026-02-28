import { db } from "./db";
import { createEventBus, createCommitNotifier } from "./repositoryHelpers";
import {
  queryChatMessageHits,
  upsertChatMessageSearchIndex,
  removeChatMessageSearchIndex,
} from "./chatMessageSearch";
import type {
  ChatConversation,
  ChatTag,
  ChatPlatform,
  ChatMessage,
  QueryChatsParams,
  QueryChatsResult,
  QueryChatMessageHitsParams,
  QueryChatMessageHitsResult,
} from "@/types/chat";
import { countConversationTurns } from "@/types/chat";
import { compareLocalizedText } from "@/utils/intl";

// ============================================
// Event System
// ============================================
type EventType = "chatsChanged" | "chatTagsChanged" | "allChatDataChanged";

const events = createEventBus<EventType>("allChatDataChanged");

function toDataScope(eventType: EventType): string {
  if (eventType === "chatTagsChanged") return "chat_tags";
  return "chat_conversations";
}

const withCommitNotification = createCommitNotifier("[ChatRepository]", events, toDataScope);

// ============================================
// Tag Helpers
// ============================================

async function resolveChatTagIds(
  tagNames: string[],
  directTagIds?: string[],
  fallbackTagIds: string[] = [],
): Promise<string[]> {
  const normalizedTagNames = [...new Set(
    tagNames.map((name) => name.trim()).filter(Boolean),
  )];
  if (normalizedTagNames.length === 0) {
    return Array.isArray(directTagIds) ? directTagIds : fallbackTagIds;
  }

  const tagIds: string[] = [];
  const existingTags = await db.chat_tags
    .where("name")
    .anyOf(normalizedTagNames)
    .toArray();
  const existingTagsMap = new Map(existingTags.map((tag) => [tag.name, tag.id]));

  for (const name of normalizedTagNames) {
    const existingTagId = existingTagsMap.get(name);
    if (existingTagId) {
      tagIds.push(existingTagId);
      continue;
    }

    const newTag: ChatTag = { id: crypto.randomUUID(), name };
    await db.chat_tags.add(newTag);
    tagIds.push(newTag.id);
  }

  return tagIds;
}

function toSerializableValue(
  value: unknown,
  seen: WeakMap<object, unknown>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toSerializableValue(item, seen))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Set) {
    return Array.from(value.values())
      .map((item) => toSerializableValue(item, seen))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Map) {
    const mapped: Record<string, unknown> = {};
    for (const [key, mapValue] of value.entries()) {
      const serialized = toSerializableValue(mapValue, seen);
      if (serialized !== undefined) {
        mapped[String(key)] = serialized;
      }
    }
    return mapped;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return seen.get(value);
    }

    const plainObject: Record<string, unknown> = {};
    seen.set(value, plainObject);

    for (const [key, objectValue] of Object.entries(value as Record<string, unknown>)) {
      const serialized = toSerializableValue(objectValue, seen);
      if (serialized !== undefined) {
        plainObject[key] = serialized;
      }
    }
    return plainObject;
  }

  return undefined;
}

function ensureSerializable<T>(input: T): T {
  return toSerializableValue(input, new WeakMap()) as T;
}

function createSafeConversation(data: Partial<ChatConversation>): ChatConversation {
  const now = Date.now();
  const messages = (data.messages || []) as ChatMessage[];
  return {
    id: data.id || crypto.randomUUID(),
    platform: data.platform || "other",
    externalId: data.externalId,
    title: data.title || "未命名对话",
    link: data.link,
    messages,
    starred: data.starred || false,
    tagIds: data.tagIds || [],
    note: data.note,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    collectedAt: data.collectedAt || now,
    messageCount: countConversationTurns(messages),
  };
}

// ============================================
// Public Repository API
// ============================================
export const chatRepository = {
  events,

  // == Conversations ==
  async saveConversation(
    data: Partial<ChatConversation>,
    tagNames: string[] = []
  ): Promise<{ ok: boolean; data?: ChatConversation; error?: Error }> {
    return withCommitNotification(
      ["chat_conversations", "chat_tags", "chat_message_search_index"],
      async () => {
        const sanitizedData = ensureSerializable(data);
        const existing = data.id ? await db.chat_conversations.get(data.id) : null;

        const resolvedTagIds = await resolveChatTagIds(
          tagNames,
          sanitizedData.tagIds,
          existing?.tagIds || [],
        );

        const safeConversation = createSafeConversation(existing
          ? {
              ...existing,
              ...sanitizedData,
              id: existing.id,
              createdAt: existing.createdAt,
              updatedAt: Date.now(),
              tagIds: resolvedTagIds,
            }
          : {
              ...sanitizedData,
              tagIds: resolvedTagIds,
            });

        await db.chat_conversations.put(safeConversation);
        await upsertChatMessageSearchIndex(safeConversation);

        return safeConversation;
      },
      "allChatDataChanged"
    );
  },

  async updateConversation(
    id: string,
    patch: Partial<ChatConversation>
  ): Promise<{ ok: boolean; error?: Error }> {
    const sanitizedPatch = ensureSerializable(patch);
    if (!sanitizedPatch.updatedAt) {
      sanitizedPatch.updatedAt = Date.now();
    }
    if (sanitizedPatch.messages) {
      sanitizedPatch.messageCount = countConversationTurns(sanitizedPatch.messages as ChatMessage[]);
    }
    return withCommitNotification(
      ["chat_conversations", "chat_tags", "chat_message_search_index"],
      async () => {
        await db.chat_conversations.update(id, sanitizedPatch);
        if (
          sanitizedPatch.title
          || sanitizedPatch.messages
          || sanitizedPatch.tagIds
          || typeof sanitizedPatch.starred === "boolean"
          || sanitizedPatch.createdAt
          || sanitizedPatch.collectedAt
          || sanitizedPatch.platform
        ) {
          const updated = await db.chat_conversations.get(id);
          if (updated) {
            await upsertChatMessageSearchIndex(updated);
          }
        }
      },
      "chatsChanged"
    );
  },

  async deleteConversation(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["chat_conversations", "chat_message_search_index"],
      async () => {
        await db.chat_conversations.delete(id);
        await removeChatMessageSearchIndex(id);
      },
      "chatsChanged"
    );
  },

  async deleteConversations(ids: string[]): Promise<{ ok: boolean; error?: Error }> {
    if (ids.length === 0) return { ok: true };
    return withCommitNotification(
      ["chat_conversations", "chat_message_search_index"],
      async () => {
        await db.chat_conversations.bulkDelete(ids);
        await removeChatMessageSearchIndex(ids);
      },
      "chatsChanged"
    );
  },

  async toggleStarred(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["chat_conversations", "chat_message_search_index"],
      async () => {
        const conversation = await db.chat_conversations.get(id);
        if (conversation) {
          const nextStarred = !conversation.starred;
          await db.chat_conversations.update(id, {
            starred: nextStarred,
            updatedAt: Date.now(),
          });
          await upsertChatMessageSearchIndex({
            ...conversation,
            starred: nextStarred,
            updatedAt: Date.now(),
          });
        }
      },
      "chatsChanged"
    );
  },

  // == Tags ==
  async createTag(name: string, color?: string): Promise<{ ok: boolean; data?: ChatTag; error?: Error }> {
    return withCommitNotification(
      ["chat_tags"],
      async () => {
        const existing = await db.chat_tags.where("name").equals(name).first();
        if (existing) return existing;
        const tag: ChatTag = { id: crypto.randomUUID(), name, color };
        await db.chat_tags.add(tag);
        return tag;
      },
      "chatTagsChanged"
    );
  },

  async deleteTag(id: string): Promise<{ ok: boolean; error?: Error }> {
    return withCommitNotification(
      ["chat_tags", "chat_conversations", "chat_message_search_index"],
      async () => {
        // Remove tag from all conversations
        const conversationsWithTag = await db.chat_conversations
          .where("tagIds")
          .equals(id)
          .toArray();
        for (const conv of conversationsWithTag) {
          const newTagIds = conv.tagIds.filter((t) => t !== id);
          await db.chat_conversations.update(conv.id, { tagIds: newTagIds });
          await upsertChatMessageSearchIndex({ ...conv, tagIds: newTagIds });
        }
        await db.chat_tags.delete(id);
      },
      "allChatDataChanged"
    );
  },

  // == Query ==
  async getAllTags(): Promise<ChatTag[]> {
    return db.chat_tags.toArray();
  },

  async getTagsWithCount(): Promise<Array<ChatTag & { count: number }>> {
    const [tags, conversations] = await Promise.all([
      db.chat_tags.toArray(),
      db.chat_conversations.toArray(),
    ]);

    const countMap = new Map<string, number>();
    for (const conversation of conversations) {
      for (const tagId of conversation.tagIds) {
        countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
      }
    }

    return tags.map((tag) => ({
      ...tag,
      count: countMap.get(tag.id) || 0,
    }));
  },

  async getConversationById(id: string): Promise<ChatConversation | undefined> {
    return db.chat_conversations.get(id);
  },

  async getConversationByExternalId(
    platform: ChatPlatform,
    externalId: string
  ): Promise<ChatConversation | undefined> {
    return db.chat_conversations
      .where("externalId")
      .equals(externalId)
      .and((conversation) => conversation.platform === platform)
      .first();
  },

  async queryConversations(params: QueryChatsParams = {}): Promise<QueryChatsResult> {
    const {
      searchQuery,
      platforms,
      tagIds,
      starredOnly,
      dateRange,
      sortBy = "updatedAt",
      page = 1,
      limit = 20,
    } = params;

    const offset = (page - 1) * limit;

    const hasDateRange = !!(dateRange?.start || dateRange?.end);
    const hasFilters = !!(
      searchQuery
      || starredOnly
      || hasDateRange
      || (platforms && platforms.length > 0)
      || (tagIds && tagIds.length > 0)
      || sortBy === "title"
      || sortBy === "messageCount"
    );
    if (!hasFilters) {
      const [total, conversations] = await Promise.all([
        db.chat_conversations.count(),
        db.chat_conversations
          .orderBy(sortBy)
          .reverse()
          .offset(offset)
          .limit(limit)
          .toArray(),
      ]);
      return { conversations, total };
    }

    // Build filters
    const filters: ((c: ChatConversation) => boolean)[] = [];

    if (platforms && platforms.length > 0) {
      filters.push((c) => platforms.includes(c.platform));
    }

    if (starredOnly) {
      filters.push((c) => c.starred);
    }

    if (tagIds && tagIds.length > 0) {
      filters.push((c) => tagIds.some((tagId) => c.tagIds.includes(tagId)));
    }

    if (dateRange) {
      if (dateRange.start) {
        filters.push((c) => c.createdAt >= dateRange.start!);
      }
      if (dateRange.end) {
        filters.push((c) => c.createdAt <= dateRange.end!);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filters.push((c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => {
          const content = typeof m.content === 'string' ? m.content : m.content.original
          return content.toLowerCase().includes(query)
        })
      );
    }

    // Get all matching conversations
    let conversations = await db.chat_conversations.toArray();

    if (filters.length > 0) {
      conversations = conversations.filter((c) => filters.every((f) => f(c)));
    }

    // Sort
    conversations.sort((a, b) => {
      if (sortBy === "title") {
        return compareLocalizedText(a.title, b.title);
      }
      if (sortBy === "messageCount") {
        return b.messageCount - a.messageCount;
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });

    const total = conversations.length;
    const paginatedConversations = conversations.slice(offset, offset + limit);

    return { conversations: paginatedConversations, total };
  },

  async queryMessageHits(
    params: QueryChatMessageHitsParams
  ): Promise<QueryChatMessageHitsResult> {
    return queryChatMessageHits(params);
  },

  async getPlatformCounts(): Promise<Map<ChatPlatform, number>> {
    const conversations = await db.chat_conversations.toArray();
    const countMap = new Map<ChatPlatform, number>();
    for (const conv of conversations) {
      countMap.set(conv.platform, (countMap.get(conv.platform) || 0) + 1);
    }
    return countMap;
  },

  async getStats(): Promise<{
    total: number;
    starred: number;
    platforms: Map<ChatPlatform, number>;
  }> {
    const [total, starred, platforms] = await Promise.all([
      db.chat_conversations.count(),
      db.chat_conversations.filter((conversation) => conversation.starred).count(),
      this.getPlatformCounts(),
    ]);
    return { total, starred, platforms };
  },
};
