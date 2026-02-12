import type { ChatConversation, ChatTag, ChatSearchIndex } from "@/types/chat";
import { db } from "./db";
import {
  fetchTagNameMap as fetchTagNameMapGeneric,
  buildSearchIndexRecord,
} from "@/utils/searchIndexUtils";

function fetchChatTagNameMap(tagIds?: string[]): Promise<Map<string, string>> {
  return fetchTagNameMapGeneric(db.chat_tags, tagIds);
}

function buildChatSearchIndexRecord(
  conversation: ChatConversation,
  tagNameMap: Map<string, string>,
): ChatSearchIndex {
  const messageContent = conversation.messages
    .map((m) => (typeof m.content === "string" ? m.content : m.content.original))
    .join(" ")
    .slice(0, 8000);

  return buildSearchIndexRecord({
    id: conversation.id,
    idField: "conversationId",
    title: conversation.title,
    content: messageContent,
    tagIds: conversation.tagIds,
    tagNameMap,
    updatedAt: conversation.updatedAt || Date.now(),
  }) as unknown as ChatSearchIndex;
}

export async function rebuildChatSearchIndex(): Promise<void> {
  const [conversations, tags] = await Promise.all([
    db.chat_conversations.toArray(),
    db.chat_tags.toArray(),
  ]);
  const tagNameMap = new Map(tags.map((tag: ChatTag) => [tag.id, tag.name]));
  const records = conversations.map((conv) =>
    buildChatSearchIndexRecord(conv, tagNameMap),
  );
  await db.chat_search_index.clear();
  if (records.length > 0) {
    await db.chat_search_index.bulkPut(records);
  }
}
