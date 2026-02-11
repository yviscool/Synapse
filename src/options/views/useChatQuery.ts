import { computed, ref, watch } from "vue";
import { refDebounced } from "@vueuse/core";
import { chatRepository } from "@/stores/chatRepository";
import type {
  ChatConversation,
  ChatTag,
  ChatPlatform,
} from "@/types/chat";

type SortBy = "updatedAt" | "createdAt" | "collectedAt" | "title" | "messageCount";

const PAGE_SIZE = 20;

interface UseChatQueryOptions {
  onLoadError?: () => void;
}

export function useChatQuery(options: UseChatQueryOptions = {}) {
  const { onLoadError } = options;

  // Data
  const conversations = ref<ChatConversation[]>([]);
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
  const currentPage = ref(1);
  const isLoading = ref(false);
  const hasMore = computed(() => conversations.value.length < totalConversations.value);

  let hasPendingRefetch = false;

  // Build fetch state key for deduplication
  function buildFetchStateKey() {
    return JSON.stringify({
      page: currentPage.value,
      sortBy: sortBy.value,
      starredOnly: showStarredOnly.value,
      searchQuery: searchQueryDebounced.value,
      platforms: selectedPlatforms.value,
      tagIds: selectedTagIds.value,
      dateRange: dateRange.value,
    });
  }

  async function fetchConversations() {
    if (isLoading.value) {
      hasPendingRefetch = true;
      return;
    }

    isLoading.value = true;
    const fetchStateKey = buildFetchStateKey();

    try {
      const result = await chatRepository.queryConversations({
        page: currentPage.value,
        limit: PAGE_SIZE,
        sortBy: sortBy.value,
        starredOnly: showStarredOnly.value,
        searchQuery: searchQueryDebounced.value || undefined,
        platforms: selectedPlatforms.value.length > 0 ? selectedPlatforms.value : undefined,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
        dateRange: (dateRange.value.start || dateRange.value.end) ? dateRange.value : undefined,
      });

      if (fetchStateKey !== buildFetchStateKey()) {
        hasPendingRefetch = true;
        return;
      }

      if (currentPage.value === 1) {
        conversations.value = result.conversations;
      } else {
        conversations.value.push(...result.conversations);
      }
      totalConversations.value = result.total;
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      onLoadError?.();
    } finally {
      isLoading.value = false;
      if (hasPendingRefetch) {
        hasPendingRefetch = false;
        await fetchConversations();
      }
    }
  }

  async function refetchFromFirstPage() {
    currentPage.value = 1;
    totalConversations.value = 0;
    conversations.value = [];
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
  chatRepository.events.on("allChatDataChanged", () => {
    refreshAll();
  });

  chatRepository.events.on("chatsChanged", () => {
    refetchFromFirstPage();
    refreshPlatformCounts();
  });

  chatRepository.events.on("chatTagsChanged", () => {
    refreshTags();
  });

  return {
    // Data
    conversations,
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

    // Pagination
    totalConversations,
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
