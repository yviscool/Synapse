import { db } from "./db";
import { MSG } from "@/utils/messaging";
import type { Dexie, Transaction } from "dexie";

// ============================================
// Generic Event Bus Factory
// ============================================
type Handler = (data?: any) => void;

export interface EventBus<T extends string> {
  on(type: T, handler: Handler): void;
  off(type: T, handler: Handler): void;
  emit(type: T, evt?: any): void;
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
    emit(type: T, evt?: any) {
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
  return async function withCommitNotification(
    tables: (keyof typeof db | Dexie.Table)[],
    operation: (trans: Transaction) => Promise<any>,
    eventType: T,
    eventData?: any,
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
      console.error(
        `[${logTag}] Error during transaction for event '${eventType}':`,
        error,
      );
      return { ok: false, error };
    }
  };
}
