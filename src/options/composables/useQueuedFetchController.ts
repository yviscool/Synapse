import type { Ref } from "vue";

interface QueuedFetchController {
  run: (task: () => Promise<void>) => Promise<void>;
  runWithStateGuard: <T>(
    getStateKey: () => string,
    task: () => Promise<T>,
    onResolved: (result: T) => Promise<void> | void,
  ) => Promise<void>;
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

  async function runWithStateGuard<T>(
    getStateKey: () => string,
    task: () => Promise<T>,
    onResolved: (result: T) => Promise<void> | void,
  ) {
    await run(async () => {
      const fetchStateKey = getStateKey();
      const result = await task();

      if (fetchStateKey !== getStateKey()) {
        requestRefetch();
        return;
      }

      await onResolved(result);
    });
  }

  function requestRefetch() {
    hasPendingRefetch = true;
  }

  return {
    run,
    runWithStateGuard,
    requestRefetch,
  };
}
