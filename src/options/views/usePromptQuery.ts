import { computed, ref, watch, type Ref } from "vue";
import { refDebounced } from "@vueuse/core";
import { db } from "@/stores/db";
import { queryPrompts, type PromptWithMatches } from "@/stores/promptSearch";
import type { Tag } from "@/types/prompt";
import { parseQuery } from "@/utils/queryParser";

type SortBy = "updatedAt" | "createdAt" | "title";

const PAGE_SIZE = 20;

interface UsePromptQueryOptions {
  tags: Ref<Tag[]>;
  onLoadError: () => void;
}

export function usePromptQuery({
  tags,
  onLoadError,
}: UsePromptQueryOptions) {
  const prompts = ref<PromptWithMatches[]>([]);
  const availableTags = ref<Tag[]>([]);
  const searchQuery = ref("");
  const searchQueryDebounced = refDebounced(searchQuery, 300);
  const plainSearchQuery = ref("");
  const parsedCategoryNames = ref<string[]>([]);
  const parsedTagNames = ref<string[]>([]);
  const selectedCategories = ref<string[]>([]);
  const selectedTags = ref<string[]>([]);
  const showFavoriteOnly = ref(false);
  const sortBy = ref<SortBy>("updatedAt");
  const totalPrompts = ref(0);
  const currentPage = ref(1);
  const isLoading = ref(false);
  const hasMore = computed(() => prompts.value.length < totalPrompts.value);
  let hasPendingRefetch = false;

  function resolveActiveFilters() {
    const categoryIds = [...selectedCategories.value];
    const categoryNames = [...parsedCategoryNames.value];
    const tagNames = parsedTagNames.value.length
      ? parsedTagNames.value
      : (selectedTags.value
          .map((id) => tags.value.find((item) => item.id === id)?.name)
          .filter(Boolean) as string[]);

    return { categoryIds, categoryNames, tagNames };
  }

  function buildFetchStateKey() {
    const { categoryIds, categoryNames, tagNames } = resolveActiveFilters();
    return JSON.stringify({
      page: currentPage.value,
      sortBy: sortBy.value,
      favoriteOnly: showFavoriteOnly.value,
      searchQuery: plainSearchQuery.value,
      categoryIds,
      categoryNames,
      tagNames,
    });
  }

  async function fetchPrompts() {
    if (isLoading.value) {
      hasPendingRefetch = true;
      return;
    }

    isLoading.value = true;
    const fetchStateKey = buildFetchStateKey();
    const { categoryIds, categoryNames, tagNames } = resolveActiveFilters();

    try {
      const { prompts: newPrompts, total } = await queryPrompts({
        page: currentPage.value,
        limit: PAGE_SIZE,
        sortBy: sortBy.value,
        favoriteOnly: showFavoriteOnly.value,
        searchQuery: plainSearchQuery.value,
        categoryIds,
        categoryNames,
        tagNames,
      });

      if (fetchStateKey !== buildFetchStateKey()) {
        hasPendingRefetch = true;
        return;
      }

      if (currentPage.value === 1) {
        prompts.value = newPrompts;
      } else {
        prompts.value.push(...newPrompts);
      }
      totalPrompts.value = total;
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
      onLoadError();
    } finally {
      isLoading.value = false;
      if (hasPendingRefetch) {
        hasPendingRefetch = false;
        await fetchPrompts();
      }
    }
  }

  async function refetchFromFirstPage() {
    currentPage.value = 1;
    totalPrompts.value = 0;
    prompts.value = [];
    await fetchPrompts();
  }

  async function refreshAvailableTags() {
    const categoryIds = selectedCategories.value;
    if (categoryIds.length === 0) {
      availableTags.value = [];
      selectedTags.value = [];
      return;
    }

    try {
      const relevantPrompts = await db.prompts
        .where("categoryIds")
        .anyOf(categoryIds)
        .toArray();
      const tagIdSet = new Set<string>();
      relevantPrompts.forEach((prompt) => {
        prompt.tagIds.forEach((tagId) => tagIdSet.add(tagId));
      });

      availableTags.value = tags.value.filter((tag) => tagIdSet.has(tag.id));
      selectedTags.value = selectedTags.value.filter((tagId) =>
        tagIdSet.has(tagId),
      );
    } catch (error) {
      console.error("Failed to refresh available tags:", error);
      availableTags.value = [];
      selectedTags.value = [];
    }
  }

  function toggleCategory(categoryId: string) {
    if (categoryId === "") {
      selectedCategories.value = [];
    } else {
      const index = selectedCategories.value.indexOf(categoryId);
      if (index > -1) {
        selectedCategories.value.splice(index, 1);
      } else {
        selectedCategories.value.push(categoryId);
      }
    }
    selectedTags.value = [];
  }

  function toggleTag(tagId: string) {
    if (tagId === "") {
      selectedTags.value = [];
      return;
    }

    const index = selectedTags.value.indexOf(tagId);
    if (index > -1) {
      selectedTags.value.splice(index, 1);
    } else {
      selectedTags.value.push(tagId);
    }
  }

  function changeSortBy(value: SortBy) {
    sortBy.value = value;
  }

  watch(searchQueryDebounced, (newQuery) => {
    const { text, categoryNames, tagNames } = parseQuery(newQuery);
    plainSearchQuery.value = text;
    parsedCategoryNames.value = categoryNames;
    parsedTagNames.value = tagNames;

    if (categoryNames.length > 0 && selectedCategories.value.length > 0) {
      selectedCategories.value = [];
    }
    if (tagNames.length > 0 && selectedTags.value.length > 0) {
      selectedTags.value = [];
    }
  });

  watch(
    [
      plainSearchQuery,
      selectedCategories,
      selectedTags,
      parsedCategoryNames,
      parsedTagNames,
      showFavoriteOnly,
      sortBy,
    ],
    () => {
      refetchFromFirstPage();
    },
    { deep: true },
  );

  watch(
    selectedCategories,
    () => {
      refreshAvailableTags();
    },
    { deep: true },
  );

  watch(tags, () => {
    if (selectedCategories.value.length > 0) {
      refreshAvailableTags();
    }
  });

  return {
    prompts,
    availableTags,
    searchQuery,
    searchQueryDebounced,
    selectedCategories,
    selectedTags,
    showFavoriteOnly,
    sortBy,
    currentPage,
    isLoading,
    hasMore,
    fetchPrompts,
    refetchFromFirstPage,
    toggleCategory,
    toggleTag,
    changeSortBy,
  };
}
