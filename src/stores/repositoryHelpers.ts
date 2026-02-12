import { db } from "./db";
import { MSG } from "@/utils/messaging";
import type { Dexie, Transaction } from "dexie";

// ============================================
// Generic Event Bus Factory
// ============================================
type Handler = (data?: unknown) => void;

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === "string" ? error : "Unknown repository error");
}

export interface EventBus<T extends string> {
  on(type: T, handler: Handler): void;
  off(type: T, handler: Handler): void;
  emit(type: T, evt?: unknown): void;
}

export function createEventBus<T extends string>(allEventName: T): EventBus<T> {
  const allEvents = new Map<T, Handler[]>();

  return {
    on(type: T, handler: Handler) {
      const handlers = allEvents.get(type);
      if (handlers) {
        handlers.push(handler);
      } else {
        allEvents.set(type, [handler]);
      }
    },
    off(type: T, handler: Handler) {
      const handlers = allEvents.get(type);
      if (handlers) {
        handlers.splice(handlers.indexOf(handler) >>> 0, 1);
      }
    },
    emit(type: T, evt?: unknown) {
      (allEvents.get(type) || []).forEach((handler) => handler(evt));
      if (type !== allEventName) {
        (allEvents.get(allEventName) || []).forEach((handler) => handler(evt));
      }
    },
  };
}

// ============================================
// Generic Commit Notification Wrapper
// ============================================
export function createCommitNotifier<T extends string>(
  logTag: string,
  eventBus: EventBus<T>,
  scopeMapper: (eventType: T) => string,
) {
  return async function withCommitNotification<TResult = void>(
    tables: (keyof typeof db | Dexie.Table)[],
    operation: (trans: Transaction) => Promise<TResult>,
    eventType: T,
    eventData?: unknown,
  ) {
    try {
      const result = await db.transaction(
        "rw",
        tables as Dexie.Table[],
        async (trans) => {
          const opResult = await operation(trans);

          trans.on("complete", async () => {
            console.log(
              `[${logTag}] Transaction completed. Emitting '${eventType}'.`,
            );
            eventBus.emit(eventType, eventData);
            chrome.runtime.sendMessage({
              type: MSG.DATA_UPDATED,
              data: {
                scope: scopeMapper(eventType),
                version: Date.now().toString(),
              },
            });
          });

          trans.on("error", (err) => {
            console.error(`[${logTag}] Transaction failed.`, err);
          });

          return opResult;
        },
      );
      return { ok: true, data: result };
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error(
        `[${logTag}] Error during transaction for event '${eventType}':`,
        normalizedError,
      );
      return { ok: false, error: normalizedError };
    }
  };
}
