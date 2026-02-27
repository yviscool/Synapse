import { db } from "./db";
import {
  getMessageContent,
  type ChatConversation,
  type ChatMessage,
  type ChatMessageHit,
  type ChatMessageSearchIndex,
  type QueryChatMessageHitsParams,
  type QueryChatMessageHitsResult,
} from "@/types/chat";
import {
  collectSearchTokens,
  normalizeSearchText,
} from "@/utils/searchIndexUtils";

const SEARCH_MAX_QUERY_TOKENS = 12;
const SEARCH_MAX_MESSAGE_TOKENS = 384;
const SEARCH_MAX_MESSAGE_CONTENT_LENGTH = 4000;
const CJK_TOKEN_RE = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u;
const CHAT_MESSAGE_INDEX_TOKENIZER_VERSION = 2;

let ensureSearchIndexPromise: Promise<void> | null = null;
let hasVerifiedSearchIndex = false;

function isCjkToken(token: string): boolean {
  return CJK_TOKEN_RE.test(token);
}

function extractQueryTokens(query: string): string[] {
  const normalizedQuery = normalizeSearchText(query);
  const rawTokens = collectSearchTokens(query, SEARCH_MAX_QUERY_TOKENS);
  if (normalizedQuery.length === 1) {
    return [...new Set(rawTokens)].filter(Boolean);
  }
  return rawTokens.filter((token) => isCjkToken(token) || token.length >= 2);
}

function isSearchableMessage(message: ChatMessage): boolean {
  if (message.isDeleted) return false;
  const content = getMessageContent(message).trim();
  return content.length > 0;
}

function countSearchableMessages(conversation: ChatConversation): number {
  return conversation.messages.filter(isSearchableMessage).length;
}

function buildChatMessageSearchIndexRecord(
  conversation: ChatConversation,
  message: ChatMessage,
  messageIndex: number,
): ChatMessageSearchIndex | null {
  if (!isSearchableMessage(message)) return null;

  const content = getMessageContent(message)
    .trim()
    .slice(0, SEARCH_MAX_MESSAGE_CONTENT_LENGTH);
  if (!content) return null;

  const normalizedContent = normalizeSearchText(content);
  const normalizedTitle = normalizeSearchText(conversation.title || "");
  const tokens = collectSearchTokens(content, SEARCH_MAX_MESSAGE_TOKENS, {
    includeWordPrefixes: true,
  });

  return {
    id: `${conversation.id}:${messageIndex}`,
    conversationId: conversation.id,
    platform: conversation.platform,
    role: message.role,
    messageIndex,
    messageId: message.id,
    title: conversation.title,
    content,
    normalizedTitle,
    normalizedContent,
    tokens,
    tagIds: conversation.tagIds || [],
    starred: !!conversation.starred,
    createdAt: conversation.createdAt || 0,
    updatedAt: conversation.updatedAt || Date.now(),
    collectedAt: conversation.collectedAt || conversation.createdAt || 0,
    tokenizerVersion: CHAT_MESSAGE_INDEX_TOKENIZER_VERSION,
  };
}

function buildConversationMessageSearchIndexRecords(
  conversation: ChatConversation,
): ChatMessageSearchIndex[] {
  const records: ChatMessageSearchIndex[] = [];

  conversation.messages.forEach((message, messageIndex) => {
    const record = buildChatMessageSearchIndexRecord(conversation, message, messageIndex);
    if (record) {
      records.push(record);
    }
  });

  return records;
}

async function ensureChatMessageSearchIndexReady(): Promise<void> {
  if (hasVerifiedSearchIndex) {
    return;
  }

  if (ensureSearchIndexPromise) {
    await ensureSearchIndexPromise;
    return;
  }

  ensureSearchIndexPromise = (async () => {
    const [conversations, indexCount, sampleRecord] = await Promise.all([
      db.chat_conversations.toArray(),
      db.chat_message_search_index.count(),
      db.chat_message_search_index.limit(1).first(),
    ]);
    const expectedIndexCount = conversations.reduce(
      (sum, conversation) => sum + countSearchableMessages(conversation),
      0,
    );

    if (expectedIndexCount === 0) {
      if (indexCount > 0) {
        await db.chat_message_search_index.clear();
      }
      hasVerifiedSearchIndex = true;
      return;
    }

    const indexVersionMatches = sampleRecord?.tokenizerVersion === CHAT_MESSAGE_INDEX_TOKENIZER_VERSION;
    if (indexCount !== expectedIndexCount || !indexVersionMatches) {
      await rebuildChatMessageSearchIndex(conversations);
    }

    hasVerifiedSearchIndex = true;
  })();

  try {
    await ensureSearchIndexPromise;
  } finally {
    ensureSearchIndexPromise = null;
  }
}

export async function upsertChatMessageSearchIndex(
  conversation: ChatConversation,
): Promise<void> {
  if (!conversation.id) return;

  const records = buildConversationMessageSearchIndexRecords(conversation);
  await removeChatMessageSearchIndex(conversation.id);

  if (records.length > 0) {
    await db.chat_message_search_index.bulkPut(records);
  }
}

export async function removeChatMessageSearchIndex(
  conversationIds: string | string[],
): Promise<void> {
  const ids = [...new Set(Array.isArray(conversationIds) ? conversationIds : [conversationIds])]
    .filter(Boolean);
  if (ids.length === 0) return;

  if (ids.length === 1) {
    await db.chat_message_search_index.where("conversationId").equals(ids[0]).delete();
    return;
  }

  await db.chat_message_search_index.where("conversationId").anyOf(ids).delete();
}

export async function rebuildChatMessageSearchIndex(
  conversationsInput?: ChatConversation[],
): Promise<void> {
  const conversations = conversationsInput || await db.chat_conversations.toArray();
  const records = conversations.flatMap((conversation) =>
    buildConversationMessageSearchIndexRecords(conversation),
  );

  await db.chat_message_search_index.clear();
  if (records.length > 0) {
    await db.chat_message_search_index.bulkPut(records);
  }
}

function matchesFilters(
  row: ChatMessageSearchIndex,
  params: QueryChatMessageHitsParams,
): boolean {
  if (params.platforms && params.platforms.length > 0 && !params.platforms.includes(row.platform)) {
    return false;
  }

  if (params.starredOnly && !row.starred) {
    return false;
  }

  if (params.tagIds && params.tagIds.length > 0) {
    const hasMatchedTag = params.tagIds.some((tagId) => row.tagIds.includes(tagId));
    if (!hasMatchedTag) return false;
  }

  if (params.dateRange?.start && row.createdAt < params.dateRange.start) {
    return false;
  }

  if (params.dateRange?.end && row.createdAt > params.dateRange.end) {
    return false;
  }

  return true;
}

function buildSearchScore(
  row: ChatMessageSearchIndex,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  let score = 0;
  const tokenSet = new Set(row.tokens);

  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      score += 4;
    }
  }

  if (row.normalizedContent.includes(normalizedQuery)) {
    score += 14;
  }

  if (row.normalizedTitle.includes(normalizedQuery)) {
    score += 6;
  }

  if (row.role === "assistant") {
    score += 1;
  }

  return score;
}

function toMessageHit(row: ChatMessageSearchIndex, score: number): ChatMessageHit {
  return {
    id: row.id,
    conversationId: row.conversationId,
    platform: row.platform,
    role: row.role,
    messageIndex: row.messageIndex,
    title: row.title,
    content: row.content,
    tagIds: row.tagIds,
    starred: row.starred,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    collectedAt: row.collectedAt,
    score,
  };
}

export async function queryChatMessageHits(
  params: QueryChatMessageHitsParams,
): Promise<QueryChatMessageHitsResult> {
  const {
    searchQuery,
    page = 1,
    limit = 20,
  } = params;

  const normalizedQuery = normalizeSearchText(searchQuery || "");
  if (!normalizedQuery) {
    return { hits: [], total: 0 };
  }

  await ensureChatMessageSearchIndexReady();

  const queryTokens = extractQueryTokens(normalizedQuery);
  const candidateRows = queryTokens.length > 0
    ? await db.chat_message_search_index
      .where("tokens")
      .anyOf(queryTokens)
      .distinct()
      .toArray()
    : await db.chat_message_search_index.toArray();

  if (candidateRows.length === 0) {
    return { hits: [], total: 0 };
  }

  const scoredHits: ChatMessageHit[] = [];
  for (const row of candidateRows) {
    if (!matchesFilters(row, params)) {
      continue;
    }

    const score = buildSearchScore(row, normalizedQuery, queryTokens);
    if (score <= 0) {
      continue;
    }

    scoredHits.push(toMessageHit(row, score));
  }

  scoredHits.sort((a, b) =>
    b.score - a.score
    || b.updatedAt - a.updatedAt
    || b.collectedAt - a.collectedAt,
  );

  // 每个对话仅保留最佳命中，避免同一会话刷屏
  const dedupedHits: ChatMessageHit[] = [];
  const seenConversationIds = new Set<string>();
  for (const hit of scoredHits) {
    if (seenConversationIds.has(hit.conversationId)) {
      continue;
    }
    seenConversationIds.add(hit.conversationId);
    dedupedHits.push(hit);
  }

  const offset = (page - 1) * limit;
  return {
    hits: dedupedHits.slice(offset, offset + limit),
    total: dedupedHits.length,
  };
}
