<template>
    <div
        v-if="visible"
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        @click.self="onCancel"
    >
        <div
            class="bg-white/95 backdrop-blur-xl dark:bg-gray-800/95 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden"
        >
            <div
                class="flex items-center justify-between p-5 border-b border-gray-200/80 dark:border-gray-700/80"
            >
                <h2
                    class="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                    <div
                        class="i-carbon-trash-can text-xl text-orange-500"
                    ></div>
                    {{ t("categories.batchDeleteModal.title") }}
                </h2>
                <button
                    @click="onCancel"
                    class="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-full hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors"
                >
                    <div class="i-carbon-close"></div>
                </button>
            </div>

            <div class="p-6 space-y-6 flex-1 overflow-y-auto">
                <!-- 1. Category Selector -->
                <div class="space-y-3">
                    <label
                        for="category-select"
                        class="block font-semibold text-gray-900 dark:text-gray-100"
                        >{{ t("categories.batchDeleteModal.step1") }}</label
                    >
                    <select
                        id="category-select"
                        v-model="selectedCategoryId"
                        class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 transition-shadow"
                    >
                        <option disabled value="">
                            {{
                                t(
                                    "categories.batchDeleteModal.selectCategoryPlaceholder",
                                )
                            }}
                        </option>
                        <option
                            v-for="category in categories"
                            :key="category.id"
                            :value="category.id"
                        >
                            {{ category.name }}
                        </option>
                    </select>
                </div>

                <div
                    v-if="isLoading"
                    class="flex justify-center items-center p-8"
                >
                    <div
                        class="i-carbon-circle-dash w-8 h-8 animate-spin text-blue-500"
                    ></div>
                </div>

                <!-- 2. Deletion Options -->
                <div v-if="selectedCategoryId && !isLoading" class="space-y-4">
                    <label
                        class="block font-semibold text-gray-900 dark:text-gray-100"
                        >{{ t("categories.batchDeleteModal.step2") }}</label
                    >

                    <!-- Tab-like buttons -->
                    <div
                        class="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-gray-700"
                    >
                        <button
                            @click="deletionMode = 'all'"
                            class="flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200"
                            :class="
                                deletionMode === 'all'
                                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            "
                        >
                            {{ t("categories.batchDeleteModal.deleteAll") }}
                        </button>
                        <button
                            @click="deletionMode = 'byTag'"
                            class="flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200"
                            :class="
                                deletionMode === 'byTag'
                                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            "
                        >
                            {{ t("categories.batchDeleteModal.deleteByTag") }}
                        </button>
                    </div>

                    <!-- Tag Selector for 'byTag' mode -->
                    <div v-if="deletionMode === 'byTag'" class="pt-2">
                        <p
                            v-if="tagsInCategory.length === 0"
                            class="text-sm text-center text-gray-500 py-4"
                        >
                            {{ t("categories.batchDeleteModal.noTags") }}
                        </p>
                        <div v-else class="space-y-3">
                            <p
                                class="text-sm font-medium text-gray-700 dark:text-gray-300"
                                v-html="
                                    t(
                                        'categories.batchDeleteModal.selectTagsLabel',
                                    )
                                "
                            ></p>
                            <div
                                class="max-h-36 overflow-y-auto flex flex-wrap gap-2 pt-1"
                            >
                                <label
                                    v-for="tag in tagsInCategory"
                                    :key="tag.id"
                                    class="flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 text-sm border"
                                    :class="
                                        selectedTagIds.includes(tag.id)
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                                    "
                                >
                                    <input
                                        type="checkbox"
                                        :value="tag.id"
                                        v-model="selectedTagIds"
                                        class="sr-only"
                                    />
                                    <span class="i-carbon-tag mr-1.5"></span>
                                    <span>{{ tag.name }}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Preview -->
                <div v-if="selectedCategoryId && !isLoading" class="space-y-3">
                    <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                        {{ t("categories.batchDeleteModal.step3") }}
                    </h4>
                    <div
                        class="min-h-[8rem] max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-1"
                    >
                        <template v-if="affectedPrompts.length > 0">
                            <p
                                v-for="prompt in affectedPrompts"
                                :key="prompt.id"
                                class="text-sm text-gray-800 dark:text-gray-300 truncate animate-fade-in"
                            >
                                • {{ prompt.title }}
                            </p>
                        </template>
                        <div
                            v-else
                            class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm"
                        >
                            {{ previewMessage }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div
                class="flex items-center justify-end gap-3 p-5 border-t border-gray-200/80 dark:border-gray-700/80"
            >
                <span
                    class="text-sm text-gray-600 dark:text-gray-400 mr-auto"
                    v-html="
                        t('categories.batchDeleteModal.summary', {
                            count: affectedPrompts.length,
                        })
                    "
                ></span>
                <button
                    @click="onCancel"
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-gray-700 dark:text-gray-200"
                >
                    {{ t("categories.batchDeleteModal.cancel") }}
                </button>
                <button
                    @click="handleDelete"
                    :disabled="!isDeleteButtonEnabled"
                    class="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all shadow hover:shadow-md disabled:shadow-none disabled:cursor-not-allowed text-white"
                    :class="
                        isDeleteButtonEnabled
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-400 dark:bg-gray-600'
                    "
                >
                    <div
                        v-if="isProcessing"
                        class="i-carbon-circle-dash animate-spin"
                    ></div>
                    <div v-else class="i-carbon-trash-can"></div>
                    {{ t("categories.batchDeleteModal.confirm") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category, Prompt, Tag } from "@/types/prompt";
import { db } from "@/stores/db";
import { repository } from "@/stores/repository";
import { useUI } from "@/stores/ui";

const props = defineProps<{
    visible: boolean;
    categories: Category[];
}>();

const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "updated"): void;
}>();

const { t, locale } = useI18n();
const { showToast, askConfirm } = useUI();

const selectedCategoryId = ref("");
const deletionMode = ref<"all" | "byTag">("all");
const promptsInCategory = ref<Prompt[]>([]);
const tagsInCategory = ref<Tag[]>([]);
const selectedTagIds = ref<string[]>([]);
const isLoading = ref(false);
const isProcessing = ref(false);

const selectedCategoryName = computed(
    () =>
        props.categories.find((c) => c.id === selectedCategoryId.value)?.name ||
        "",
);

const affectedPrompts = computed(() => {
    if (!selectedCategoryId.value) return [];
    if (deletionMode.value === "all") {
        return promptsInCategory.value;
    }
    if (deletionMode.value === "byTag") {
        if (selectedTagIds.value.length === 0) return [];
        return promptsInCategory.value.filter((p) =>
            selectedTagIds.value.some((tagId) => p.tagIds.includes(tagId)),
        );
    }
    return [];
});

const isDeleteButtonEnabled = computed(() => {
    return !isProcessing.value && affectedPrompts.value.length > 0;
});

const previewMessage = computed(() => {
    if (deletionMode.value === "all")
        return t("categories.batchDeleteModal.previewMessage.noPrompts");
    if (deletionMode.value === "byTag") {
        return selectedTagIds.value.length === 0
            ? t("categories.batchDeleteModal.previewMessage.selectTags")
            : t("categories.batchDeleteModal.previewMessage.noMatch");
    }
    return "";
});

watch(selectedCategoryId, async (newId) => {
    resetSelectionState();
    if (!newId) return;

    isLoading.value = true;
    try {
        const prompts = await db.prompts
            .where("categoryIds")
            .equals(newId)
            .toArray();
        promptsInCategory.value = prompts;

        if (prompts.length > 0) {
            const tagIds = new Set(prompts.flatMap((p) => p.tagIds));
            if (tagIds.size > 0) {
                tagsInCategory.value = await db.tags
                    .where("id")
                    .anyOf([...tagIds])
                    .toArray();
            }
        }
    } catch (error) {
        console.error("Failed to fetch data for category:", error);
        showToast(t("categories.batchDeleteModal.loadFailed"), "error");
    } finally {
        isLoading.value = false;
    }
});

function resetSelectionState() {
    deletionMode.value = "all";
    promptsInCategory.value = [];
    tagsInCategory.value = [];
    selectedTagIds.value = [];
}

function resetAllState() {
    selectedCategoryId.value = "";
    isProcessing.value = false;
    isLoading.value = false;
    resetSelectionState();
}

function onCancel() {
    emit("update:visible", false);
    resetAllState();
}

async function handleDelete() {
    if (!isDeleteButtonEnabled.value) return;

    const promptCount = affectedPrompts.value.length;
    let confirmMessage = "";
    let result: { ok: boolean; error?: Error };

    if (deletionMode.value === "all") {
        confirmMessage = t("categories.batchDeleteModal.confirmMessageAll", {
            count: promptCount,
            categoryName: selectedCategoryName.value,
        });
    } else {
        // byTag
        const selectedTags = tagsInCategory.value
            .filter((t) => selectedTagIds.value.includes(t.id))
            .map((t) => t.name);
        confirmMessage = t("categories.batchDeleteModal.confirmMessageByTag", {
            count: promptCount,
            categoryName: selectedCategoryName.value,
            tags: selectedTags.join(", "),
        });
    }

    const confirm = await askConfirm(confirmMessage, { type: "danger" });
    if (!confirm) return;

    isProcessing.value = true;
    try {
        if (deletionMode.value === "all") {
            result = await repository.deletePromptsByCategory(
                selectedCategoryId.value,
            );
        } else {
            // byTag
            result = await repository.deletePromptsByTagsInCategory(
                selectedCategoryId.value,
                selectedTagIds.value,
            );
        }

        if (result.ok) {
            showToast(
                t("categories.batchDeleteModal.deleteSuccess"),
                "success",
            );
            emit("updated");
            onCancel();
        } else {
            throw (
                result.error ||
                new Error(t("categories.batchDeleteModal.operationFailedError"))
            );
        }
    } catch (error) {
        console.error("Deletion failed:", error);
        showToast(
            t("categories.batchDeleteModal.deleteFailedWithError", {
                error: (error as Error).message,
            }),
            "error",
        );
    } finally {
        isProcessing.value = false;
    }
}
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
