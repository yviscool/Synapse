import { computed, onScopeDispose, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { chatRepository } from "@/stores/chatRepository";
import { useQueuedFetchController } from "@/options/composables/useQueuedFetchController";
import type {
  ChatConversation,
  ChatMessageHit,
  ChatTag,
  ChatPlatform,
} from "@/types/chat";

type SortBy = "updatedAt" | "createdAt" | "collectedAt" | "title" | "messageCount";

const PAGE_SIZE = 10

interface UseChatQueryOptions {
  onLoadError?: () => void;
}

export function useChatQuery(options: UseChatQueryOptions = {}) {
  const { onLoadError } = options;

  // Data
  const conversations = ref<ChatConversation[]>([]);
  const messageHits = ref<ChatMessageHit[]>([]);
  const tags = ref<Array<ChatTag & { count: number }>>([]);
  const platformCounts = ref<Map<ChatPlatform, number>>(new Map());

  // Filters
  const searchQuery = ref("");
  const searchQueryDebounced = refDebounced(searchQuery, 300);
  const selectedPlatforms = ref<ChatPlatform[]>([]);
  const selectedTagIds = ref<string[]>([]);
  const showStarredOnly = ref(false);
  const sortBy = ref<SortBy>("updatedAt");
  const dateRange = ref<{ start?: number; end?: number }>({});

  // Pagination
  const totalConversations = ref(0);
  const totalMessageHits = ref(0);
  const currentPage = ref(1);
  const isLoading = ref(false);
  const isSearchMode = computed(() => !!searchQueryDebounced.value.trim());
  const hasMore = computed(() => {
    if (isSearchMode.value) {
      return messageHits.value.length < totalMessageHits.value;
    }
    return conversations.value.length < totalConversations.value;
  });

  const fetchController = useQueuedFetchController(isLoading);

  // Build fetch state key for deduplication
  function buildFetchStateKey() {
    return JSON.stringify({
      page: currentPage.value,
      mode: isSearchMode.value ? "message" : "conversation",
      sortBy: sortBy.value,
      starredOnly: showStarredOnly.value,
      searchQuery: searchQueryDebounced.value,
      platforms: selectedPlatforms.value,
      tagIds: selectedTagIds.value,
      dateRange: dateRange.value,
    });
  }

  async function fetchConversations() {
    try {
      await fetchController.runWithStateGuard(
        buildFetchStateKey,
        async () => {
          if (isSearchMode.value) {
            const result = await chatRepository.queryMessageHits({
              page: currentPage.value,
              limit: PAGE_SIZE,
              searchQuery: searchQueryDebounced.value,
              starredOnly: showStarredOnly.value,
              platforms: selectedPlatforms.value.length > 0 ? selectedPlatforms.value : undefined,
              tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
              dateRange: (dateRange.value.start || dateRange.value.end) ? dateRange.value : undefined,
            });
            return { mode: "search" as const, result };
          }

          const result = await chatRepository.queryConversations({
            page: currentPage.value,
            limit: PAGE_SIZE,
            sortBy: sortBy.value,
            starredOnly: showStarredOnly.value,
            platforms: selectedPlatforms.value.length > 0 ? selectedPlatforms.value : undefined,
            tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
            dateRange: (dateRange.value.start || dateRange.value.end) ? dateRange.value : undefined,
          });
          return { mode: "conversation" as const, result };
        },
        (payload) => {
          if (payload.mode === "search") {
            if (currentPage.value === 1) {
              messageHits.value = payload.result.hits;
            } else {
              messageHits.value.push(...payload.result.hits);
            }
            totalMessageHits.value = payload.result.total;
            return;
          }

          if (currentPage.value === 1) {
            conversations.value = payload.result.conversations;
            messageHits.value = [];
          } else {
            conversations.value.push(...payload.result.conversations);
          }
          totalConversations.value = payload.result.total;
          totalMessageHits.value = 0;
        },
      );
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      onLoadError?.();
    }
  }

  async function refetchFromFirstPage() {
    currentPage.value = 1;
    totalConversations.value = 0;
    totalMessageHits.value = 0;
    conversations.value = [];
    messageHits.value = [];
    await fetchConversations();
  }

  async function loadMore() {
    if (hasMore.value && !isLoading.value) {
      currentPage.value++;
      await fetchConversations();
    }
  }

  async function refreshTags() {
    try {
      tags.value = await chatRepository.getTagsWithCount();
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }

  async function refreshPlatformCounts() {
    try {
      platformCounts.value = await chatRepository.getPlatformCounts();
    } catch (error) {
      console.error("Failed to fetch platform counts:", error);
    }
  }

  async function refreshAll() {
    await Promise.all([refreshTags(), refreshPlatformCounts()]);
    await refetchFromFirstPage();
  }

  // Selection helpers
  function togglePlatform(platform: ChatPlatform) {
    const index = selectedPlatforms.value.indexOf(platform);
    if (index > -1) {
      selectedPlatforms.value.splice(index, 1);
    } else {
      selectedPlatforms.value.push(platform);
    }
  }

  function clearPlatformSelection() {
    selectedPlatforms.value = [];
  }

  function toggleTag(tagId: string) {
    const index = selectedTagIds.value.indexOf(tagId);
    if (index > -1) {
      selectedTagIds.value.splice(index, 1);
    } else {
      selectedTagIds.value.push(tagId);
    }
  }

  function clearTagSelection() {
    selectedTagIds.value = [];
  }

  function setDateRange(start?: number, end?: number) {
    dateRange.value = { start, end };
  }

  function clearDateRange() {
    dateRange.value = {};
  }

  function changeSortBy(value: SortBy) {
    sortBy.value = value;
  }

  // Watch for filter changes
  watch(
    [
      searchQueryDebounced,
      selectedPlatforms,
      selectedTagIds,
      showStarredOnly,
      sortBy,
      dateRange,
    ],
    () => {
      refetchFromFirstPage();
    },
    { deep: true }
  );

  // Listen for data changes
  const handleAllChatDataChanged = () => {
    void refreshAll();
  };
  const handleChatsChanged = () => {
    void refetchFromFirstPage();
    void refreshPlatformCounts();
  };
  const handleChatTagsChanged = () => {
    void refreshTags();
  };

  chatRepository.events.on("allChatDataChanged", handleAllChatDataChanged);
  chatRepository.events.on("chatsChanged", handleChatsChanged);
  chatRepository.events.on("chatTagsChanged", handleChatTagsChanged);

  onScopeDispose(() => {
    chatRepository.events.off("allChatDataChanged", handleAllChatDataChanged);
    chatRepository.events.off("chatsChanged", handleChatsChanged);
    chatRepository.events.off("chatTagsChanged", handleChatTagsChanged);
  });

  return {
    // Data
    conversations,
    messageHits,
    tags,
    platformCounts,

    // Filters
    searchQuery,
    searchQueryDebounced,
    selectedPlatforms,
    selectedTagIds,
    showStarredOnly,
    sortBy,
    dateRange,
    isSearchMode,

    // Pagination
    totalConversations,
    totalMessageHits,
    currentPage,
    isLoading,
    hasMore,

    // Actions
    fetchConversations,
    refetchFromFirstPage,
    loadMore,
    refreshTags,
    refreshPlatformCounts,
    refreshAll,
    togglePlatform,
    clearPlatformSelection,
    toggleTag,
    clearTagSelection,
    setDateRange,
    clearDateRange,
    changeSortBy,
  };
}
