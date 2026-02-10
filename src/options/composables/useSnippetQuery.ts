import { computed, ref, watch, type Ref } from "vue";
import { refDebounced } from "@vueuse/core";
import { snippetRepository } from "@/stores/snippetRepository";
import type {
  Snippet,
  SnippetFolder,
  SnippetTag,
  SnippetLanguage,
  SpecialFolderType,
} from "@/types/snippet";

type SortBy = "updatedAt" | "createdAt" | "title" | "usedAt" | "useCount";

const PAGE_SIZE = 20;

interface UseSnippetQueryOptions {
  onLoadError?: () => void;
}

export function useSnippetQuery(options: UseSnippetQueryOptions = {}) {
  const { onLoadError } = options;

  // Data
  const snippets = ref<Snippet[]>([]);
  const folders = ref<SnippetFolder[]>([]);
  const tags = ref<Array<SnippetTag & { count: number }>>([]);

  // Filters
  const searchQuery = ref("");
  const searchQueryDebounced = refDebounced(searchQuery, 300);
  const selectedFolderId = ref<string | null | undefined>(undefined); // undefined = all
  const specialFolder = ref<SpecialFolderType>("all");
  const selectedTagIds = ref<string[]>([]);
  const selectedLanguages = ref<SnippetLanguage[]>([]);
  const showStarredOnly = ref(false);
  const sortBy = ref<SortBy>("updatedAt");

  // Pagination
  const totalSnippets = ref(0);
  const currentPage = ref(1);
  const isLoading = ref(false);
  const hasMore = computed(() => snippets.value.length < totalSnippets.value);

  let hasPendingRefetch = false;

  // Folder tree helpers
  const folderTree = computed(() => {
    const map = new Map<string | null, SnippetFolder[]>();
    for (const folder of folders.value) {
      const parentId = folder.parentId;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(folder);
    }
    // Sort each level by order
    for (const children of map.values()) {
      children.sort((a, b) => a.order - b.order);
    }
    return map;
  });

  const rootFolders = computed(() => folderTree.value.get(null) || []);

  function getChildFolders(parentId: string): SnippetFolder[] {
    return folderTree.value.get(parentId) || [];
  }

  function getFolderDepth(folderId: string): number {
    let depth = 0;
    let current = folders.value.find((f) => f.id === folderId);
    while (current?.parentId) {
      depth++;
      current = folders.value.find((f) => f.id === current!.parentId);
    }
    return depth;
  }

  // Build fetch state key for deduplication
  function buildFetchStateKey() {
    return JSON.stringify({
      page: currentPage.value,
      sortBy: sortBy.value,
      starredOnly: showStarredOnly.value,
      searchQuery: searchQueryDebounced.value,
      folderId: selectedFolderId.value,
      specialFolder: specialFolder.value,
      tagIds: selectedTagIds.value,
      languages: selectedLanguages.value,
    });
  }

  async function fetchSnippets() {
    if (isLoading.value) {
      hasPendingRefetch = true;
      return;
    }

    isLoading.value = true;
    const fetchStateKey = buildFetchStateKey();

    try {
      // Determine folder filter based on special folder
      let folderId: string | null | undefined = selectedFolderId.value;
      let starredOnly = showStarredOnly.value;

      if (specialFolder.value === "starred") {
        starredOnly = true;
        folderId = undefined;
      } else if (specialFolder.value === "uncategorized") {
        folderId = null;
      } else if (specialFolder.value === "all") {
        folderId = undefined;
      }
      // For "recent", we'll handle it differently

      let result;
      if (specialFolder.value === "recent") {
        const recentSnippets = await snippetRepository.getRecentSnippets(PAGE_SIZE * currentPage.value);
        result = {
          snippets: recentSnippets.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE),
          total: recentSnippets.length,
        };
      } else {
        result = await snippetRepository.querySnippets({
          page: currentPage.value,
          limit: PAGE_SIZE,
          sortBy: sortBy.value,
          starredOnly,
          searchQuery: searchQueryDebounced.value || undefined,
          folderId,
          tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
          languages: selectedLanguages.value.length > 0 ? selectedLanguages.value : undefined,
        });
      }

      if (fetchStateKey !== buildFetchStateKey()) {
        hasPendingRefetch = true;
        return;
      }

      if (currentPage.value === 1) {
        snippets.value = result.snippets;
      } else {
        snippets.value.push(...result.snippets);
      }
      totalSnippets.value = result.total;
    } catch (error) {
      console.error("Failed to fetch snippets:", error);
      onLoadError?.();
    } finally {
      isLoading.value = false;
      if (hasPendingRefetch) {
        hasPendingRefetch = false;
        await fetchSnippets();
      }
    }
  }

  async function refetchFromFirstPage() {
    currentPage.value = 1;
    totalSnippets.value = 0;
    snippets.value = [];
    await fetchSnippets();
  }

  async function loadMore() {
    if (hasMore.value && !isLoading.value) {
      currentPage.value++;
      await fetchSnippets();
    }
  }

  async function refreshFolders() {
    try {
      folders.value = await snippetRepository.getAllFolders();
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }

  async function refreshTags() {
    try {
      tags.value = await snippetRepository.getTagsWithCount();
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }

  async function refreshAll() {
    await Promise.all([refreshFolders(), refreshTags()]);
    await refetchFromFirstPage();
  }

  // Selection helpers
  function selectFolder(folderId: string | null) {
    specialFolder.value = "all";
    selectedFolderId.value = folderId;
  }

  function selectSpecialFolder(type: SpecialFolderType) {
    specialFolder.value = type;
    selectedFolderId.value = undefined;
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

  function toggleLanguage(language: SnippetLanguage) {
    const index = selectedLanguages.value.indexOf(language);
    if (index > -1) {
      selectedLanguages.value.splice(index, 1);
    } else {
      selectedLanguages.value.push(language);
    }
  }

  function clearLanguageSelection() {
    selectedLanguages.value = [];
  }

  function changeSortBy(value: SortBy) {
    sortBy.value = value;
  }

  // Watch for filter changes
  watch(
    [
      searchQueryDebounced,
      selectedFolderId,
      specialFolder,
      selectedTagIds,
      selectedLanguages,
      showStarredOnly,
      sortBy,
    ],
    () => {
      refetchFromFirstPage();
    },
    { deep: true },
  );

  // Listen for data changes
  snippetRepository.events.on("allSnippetDataChanged", () => {
    refreshAll();
  });

  snippetRepository.events.on("snippetsChanged", () => {
    refetchFromFirstPage();
  });

  snippetRepository.events.on("foldersChanged", () => {
    refreshFolders();
  });

  snippetRepository.events.on("snippetTagsChanged", () => {
    refreshTags();
  });

  return {
    // Data
    snippets,
    folders,
    tags,
    folderTree,
    rootFolders,
    getChildFolders,
    getFolderDepth,

    // Filters
    searchQuery,
    searchQueryDebounced,
    selectedFolderId,
    specialFolder,
    selectedTagIds,
    selectedLanguages,
    showStarredOnly,
    sortBy,

    // Pagination
    totalSnippets,
    currentPage,
    isLoading,
    hasMore,

    // Actions
    fetchSnippets,
    refetchFromFirstPage,
    loadMore,
    refreshFolders,
    refreshTags,
    refreshAll,
    selectFolder,
    selectSpecialFolder,
    toggleTag,
    clearTagSelection,
    toggleLanguage,
    clearLanguageSelection,
    changeSortBy,
  };
}
