import { db } from "./db";
import { createEventBus, createCommitNotifier } from "./shared";
import {
  collectSearchTokens,
  SEARCH_MAX_TOKENS,
} from "./searchIndexUtils";
import type {
  ChatConversation,
  ChatTag,
  ChatSearchIndex,
  ChatPlatform,
  QueryChatsParams,
  QueryChatsResult,
} from "@/types/chat";

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
// Search Index Functions
// ============================================

async function fetchChatTagNameMap(tagIds?: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueTagIds = [...new Set(tagIds || [])].filter(Boolean);
  const tags = uniqueTagIds.length
    ? await db.chat_tags.where("id").anyOf(uniqueTagIds).toArray()
    : await db.chat_tags.toArray();
  tags.forEach((tag) => map.set(tag.id, tag.name));
  return map;
}

function buildChatSearchIndexRecord(
  conversation: ChatConversation,
  tagNameMap: Map<string, string>
): ChatSearchIndex {
  const tagText = conversation.tagIds
    .map((tagId) => tagNameMap.get(tagId))
    .filter(Boolean)
    .join(" ");

  const messageContent = conversation.messages
    .map((m) => m.content)
    .join(" ")
    .slice(0, 8000);

  const titleTokens = collectSearchTokens(conversation.title, 256);
  const contentTokens = collectSearchTokens(messageContent, 1024);
  const tagTokens = collectSearchTokens(tagText, 128);

  const mergedTokenSet = new Set<string>([
    ...titleTokens,
    ...contentTokens,
    ...tagTokens,
  ]);
  const tokens = [...mergedTokenSet].slice(0, SEARCH_MAX_TOKENS);
  const tokenSet = new Set(tokens);

  return {
    conversationId: conversation.id,
    tokens,
    titleTokens: titleTokens.filter((token) => tokenSet.has(token)),
    tagTokens: tagTokens.filter((token) => tokenSet.has(token)),
    updatedAt: conversation.updatedAt || Date.now(),
  };
}

async function upsertChatSearchIndex(
  conversation: ChatConversation,
  tagNameMap?: Map<string, string>
): Promise<void> {
  if (!conversation.id) return;
  const resolvedTagMap = tagNameMap || (await fetchChatTagNameMap(conversation.tagIds));
  const record = buildChatSearchIndexRecord(conversation, resolvedTagMap);
  await db.chat_search_index.put(record);
}

async function removeChatSearchIndex(conversationIds: string | string[]): Promise<void> {
  const ids = Array.isArray(conversationIds) ? conversationIds : [conversationIds];
  if (ids.length === 0) return;
  await db.chat_search_index.bulkDelete(ids);
}

// ============================================
// Helper Functions
// ============================================
function createSafeConversation(data: Partial<ChatConversation>): ChatConversation {
  const now = Date.now();
  return {
    id: data.id || crypto.randomUUID(),
    platform: data.platform || "other",
    externalId: data.externalId,
    title: data.title || "未命名对话",
    link: data.link,
    messages: data.messages || [],
    starred: data.starred || false,
    tagIds: data.tagIds || [],
    note: data.note,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    collectedAt: data.collectedAt || now,
    messageCount: data.messages?.length || 0,
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
  ): Promise<{ ok: boolean; data?: ChatConversation; error?: any }> {
    return withCommitNotification(
      ["chat_conversations", "chat_tags", "chat_search_index"],
      async () => {
        // 1. Resolve Tags
        const tagIds: string[] = [];
        if (tagNames.length > 0) {
          const existingTags = await db.chat_tags
            .where("name")
            .anyOf(tagNames)
            .toArray();
          const existingTagsMap = new Map(existingTags.map((t) => [t.name, t.id]));
          for (const name of tagNames) {
            if (existingTagsMap.has(name)) {
              tagIds.push(existingTagsMap.get(name)!);
            } else {
              const newTag: ChatTag = { id: crypto.randomUUID(), name };
              await db.chat_tags.add(newTag);
              tagIds.push(newTag.id);
            }
          }
        }

        // 2. Prepare Conversation
        const safeConversation = createSafeConversation({ ...data, tagIds });

        // 3. Check if update or create
        const existing = data.id ? await db.chat_conversations.get(data.id) : null;
        if (existing) {
          safeConversation.updatedAt = Date.now();
          safeConversation.createdAt = existing.createdAt;
        }

        // 4. Save
        await db.chat_conversations.put(safeConversation);
        await upsertChatSearchIndex(safeConversation);

        return safeConversation;
      },
      "allChatDataChanged"
    );
  },

  async updateConversation(
    id: string,
    patch: Partial<ChatConversation>
  ): Promise<{ ok: boolean; error?: any }> {
    if (!patch.updatedAt) {
      patch.updatedAt = Date.now();
    }
    if (patch.messages) {
      patch.messageCount = patch.messages.length;
    }
    return withCommitNotification(
      ["chat_conversations", "chat_search_index"],
      async () => {
        await db.chat_conversations.update(id, patch);
        if (patch.title || patch.messages || patch.tagIds) {
          const updated = await db.chat_conversations.get(id);
          if (updated) {
            await upsertChatSearchIndex(updated);
          }
        }
      },
      "chatsChanged"
    );
  },

  async deleteConversation(id: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ["chat_conversations", "chat_search_index"],
      async () => {
        await db.chat_conversations.delete(id);
        await removeChatSearchIndex(id);
      },
      "chatsChanged"
    );
  },

  async deleteConversations(ids: string[]): Promise<{ ok: boolean; error?: any }> {
    if (ids.length === 0) return { ok: true };
    return withCommitNotification(
      ["chat_conversations", "chat_search_index"],
      async () => {
        await db.chat_conversations.bulkDelete(ids);
        await removeChatSearchIndex(ids);
      },
      "chatsChanged"
    );
  },

  async toggleStarred(id: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ["chat_conversations"],
      async () => {
        const conversation = await db.chat_conversations.get(id);
        if (conversation) {
          await db.chat_conversations.update(id, {
            starred: !conversation.starred,
            updatedAt: Date.now(),
          });
        }
      },
      "chatsChanged"
    );
  },

  // == Tags ==
  async createTag(name: string, color?: string): Promise<{ ok: boolean; data?: ChatTag; error?: any }> {
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

  async deleteTag(id: string): Promise<{ ok: boolean; error?: any }> {
    return withCommitNotification(
      ["chat_tags", "chat_conversations", "chat_search_index"],
      async () => {
        // Remove tag from all conversations
        const conversationsWithTag = await db.chat_conversations
          .where("tagIds")
          .equals(id)
          .toArray();
        for (const conv of conversationsWithTag) {
          const newTagIds = conv.tagIds.filter((t) => t !== id);
          await db.chat_conversations.update(conv.id, { tagIds: newTagIds });
          await upsertChatSearchIndex({ ...conv, tagIds: newTagIds });
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
    const tags = await db.chat_tags.toArray();
    const result: Array<ChatTag & { count: number }> = [];
    for (const tag of tags) {
      const count = await db.chat_conversations.where("tagIds").equals(tag.id).count();
      result.push({ ...tag, count });
    }
    return result;
  },

  async getConversationById(id: string): Promise<ChatConversation | undefined> {
    return db.chat_conversations.get(id);
  },

  async getConversationByExternalId(
    platform: ChatPlatform,
    externalId: string
  ): Promise<ChatConversation | undefined> {
    return db.chat_conversations
      .where({ platform, externalId })
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
        return a.title.localeCompare(b.title, "zh-CN");
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
      db.chat_conversations.where("starred").equals(1).count(),
      this.getPlatformCounts(),
    ]);
    return { total, starred, platforms };
  },
};
