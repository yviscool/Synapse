import type { Ref } from "vue";

interface QueuedFetchController {
  run: (task: () => Promise<void>) => Promise<void>;
  requestRefetch: () => void;
}

export function useQueuedFetchController(
  isLoading: Ref<boolean>,
): QueuedFetchController {
  let hasPendingRefetch = false;

  async function run(task: () => Promise<void>) {
    if (isLoading.value) {
      hasPendingRefetch = true;
      return;
    }

    isLoading.value = true;
    try {
      await task();
    } finally {
      isLoading.value = false;
      if (hasPendingRefetch) {
        hasPendingRefetch = false;
        await run(task);
      }
    }
  }

  function requestRefetch() {
    hasPendingRefetch = true;
  }

  return {
    run,
    requestRefetch,
  };
}
