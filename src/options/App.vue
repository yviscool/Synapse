<template>
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <!-- 现代化头部 -->
        <header
            class="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40"
        >
            <div
                class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
            >
                <div class="flex items-center gap-6">
                    <div class="flex items-center gap-3 -mt-1">
                        <h1
                            class="text-2xl font-bold bg-clip-text text-transparent relative inline-block"
                            style="
                                background-image: linear-gradient(
                                    135deg,
                                    #00d5ff 0%,
                                    #00a6ff 12%,
                                    #0066ff 24%,
                                    #3b3bff 34%,
                                    #6a00ff 46%,
                                    #8b00ff 56%,
                                    #ff00b8 66%,
                                    #ff1744 76%,
                                    #ff7a00 88%,
                                    #ffc107 100%
                                );
                            "
                        >
                            Synapse
                            <span
                                class="pointer-events-none absolute rounded-full bg-white"
                                style="
                                    width: 0.75rem;
                                    height: 0.75rem;
                                    top: -0.4rem;
                                    left: -0.4rem;
                                    box-shadow: 0 0 12px
                                        rgba(255, 255, 255, 0.9);
                                "
                            ></span>
                            <span
                                class="pointer-events-none absolute rounded-full bg-white"
                                style="
                                    width: 0.75rem;
                                    height: 0.75rem;
                                    bottom: -0.4rem;
                                    right: -0.4rem;
                                    box-shadow: 0 0 12px
                                        rgba(255, 255, 255, 0.9);
                                "
                            ></span>
                            <span
                                class="pointer-events-none absolute"
                                style="left: -0.6rem; bottom: -0.25rem"
                            >
                                <span
                                    class="absolute rounded-full"
                                    style="
                                        width: 0.4rem;
                                        height: 0.4rem;
                                        left: -0.2rem;
                                        bottom: 0;
                                        background-color: #5b21b6;
                                        opacity: 0.95;
                                    "
                                ></span>
                                <span
                                    class="absolute rounded-full"
                                    style="
                                        width: 0.3rem;
                                        height: 0.3rem;
                                        left: -0.55rem;
                                        bottom: 0.35rem;
                                        background-color: #7c3aed;
                                        opacity: 0.85;
                                    "
                                ></span>
                                <span
                                    class="absolute rounded-full"
                                    style="
                                        width: 0.2rem;
                                        height: 0.2rem;
                                        left: -0.8rem;
                                        bottom: 0.8rem;
                                        background-color: #a78bfa;
                                        opacity: 0.8;
                                    "
                                ></span>
                            </span>
                        </h1>
                    </div>
                    <nav class="flex items-center gap-4">
                        <router-link
                            v-for="item in menuItems"
                            :key="item.name"
                            :to="item.path"
                            custom
                            v-slot="{ href, navigate, isActive }"
                        >
                            <a
                                :href="href"
                                @click="navigate"
                                class="px-3 py-2 rounded-md text-sm transition-colors"
                                :class="isActive ? 'font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600' : 'font-medium text-gray-500 hover:text-gray-800'"
                            >
                                {{ t(item.name) }}
                            </a>
                        </router-link>
                    </nav>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        @click="showSettings = true"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        :title="t('settings.title')"
                    >
                        <div class="i-carbon-settings text-lg"></div>
                        <span class="hidden sm:inline">{{
                            t("settings.title")
                        }}</span>
                    </button>
                    <button
                        @click="createNewPrompt"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        <div class="i-carbon-add"></div>
                        <span>{{ t("prompts.new") }}</span>
                    </button>

                    <div class="w-px h-6 bg-gray-200/80 ml-3 mr-1"></div>

                    <a
                        href="https://github.com/yviscool/Synapse"
                        target="_blank"
                        rel="noopener noreferrer"
                        :title="t('common.feedback')"
                        class="p-2 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                        <div class="i-carbon-logo-github text-xl"></div>
                    </a>
                </div>
            </div>
        </header>

        <router-view />

        <!-- 设置模态框 -->
        <div
            v-if="showSettings"
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            @click="showSettings = false"
        >
            <div
                class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-4xl w-full"
                @click.stop
            >
                <div
                    class="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50"
                >
                    <div class="flex-1">
                        <h2
                            class="flex items-center gap-3 text-xl font-semibold text-gray-900"
                        >
                            <div class="i-carbon-settings"></div>
                            {{ t("settings.title") }}
                        </h2>
                    </div>
                    <button
                        @click="showSettings = false"
                        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                    >
                        <div class="i-carbon-close"></div>
                    </button>
                </div>

                <div class="max-h-[70vh] overflow-y-auto">
                    <Settings />
                </div>
            </div>
        </div>

        <!-- 全局 UI 组件 -->
        <UiToast
            v-if="ui.toast"
            :message="ui.toast.message"
            :type="ui.toast.type"
            @close="hideToast"
        />
        <UiConfirm
            v-model="ui.confirm.visible"
            :message="ui.confirm.message"
            :type="ui.confirm.type"
            @confirm="handleConfirm(true)"
            @cancel="handleConfirm(false)"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from 'vue-router';
import { ui, useUI } from "@/stores/ui";
import { getSettings } from "@/stores/db";
import { MSG, type DataUpdatedPayload } from "@/utils/messaging";
import { useModal } from "@/composables/useModal";
import Settings from "./components/Settings.vue";

const { t, locale } = useI18n();
const { handleConfirm, hideToast } = useUI();
const router = useRouter();

const menuItems = [
    { name: 'menu.prompts', path: '/prompts' },
    { name: 'menu.chat', path: '/chat' },
    { name: 'menu.tools', path: '/tools' },
];

// --- i18n & Real-time Sync ---
const systemLanguage = computed(() => {
    const lang = navigator.language.toLowerCase();
    return lang.startsWith("zh") ? "中文" : "English";
});

async function setLocale() {
    const settings = await getSettings();
    if (settings.locale === "system") {
        locale.value = systemLanguage.value === "中文" ? "zh-CN" : "en";
    } else {
        locale.value = settings.locale;
    }
}

const handleMessage = (message: { type: string; data: any }) => {
    if (message.type === MSG.DATA_UPDATED) {
        const { scope } = message.data as DataUpdatedPayload;
        if (scope === "settings") {
            console.log("Settings updated, updating locale...");
            setLocale();
        }
    }
};

const showSettings = ref(false);

useModal(showSettings, () => {
    showSettings.value = false;
});

function createNewPrompt() {
    // 如果已经在 prompts 页面且 action 是 new，则直接创建新 prompt
    if (router.currentRoute.value.name === 'prompts' && router.currentRoute.value.query.action === 'new') {
        // 触发一个事件让 Prompts 组件知道要创建新 prompt
        window.dispatchEvent(new CustomEvent('create-new-prompt'));
    } else {
        router.push({ name: 'prompts', query: { action: 'new' } });
    }
}

onMounted(async () => {
    await setLocale(); // Set initial locale
    chrome.runtime.onMessage.addListener(handleMessage);
});

onUnmounted(() => {
    chrome.runtime.onMessage.removeListener(handleMessage);
});
</script>

<style>
.is-active {
    @apply font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600;
}
</style>

<style>
html {
  overflow-y: scroll;
}
</style>