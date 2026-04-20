import type { RepositionStrategyName, StrategyName } from "../types";

export type AppEvents = {
  "scenario-change": { id: string };
  "strategy-change": { which: "a" | "b"; strategy: StrategyName };
  "reposition-change": { which: "a" | "b"; strategy: RepositionStrategyName };
  "compare-toggle": { compare: boolean };
  "seed-change": { seed: string };
  "overrides-change": { needsReset: boolean };
  "reset-requested": Record<string, never>;
  toast: { text: string };
};

type Handler<T> = (payload: T) => void;

export function createBus(): {
  emit: <K extends keyof AppEvents>(event: K, payload: AppEvents[K]) => void;
  on: <K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>) => () => void;
} {
  const handlers = new Map<string, Set<Handler<unknown>>>();
  return {
    emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
      const set = handlers.get(event);
      if (set) for (const fn of set) fn(payload);
    },
    on<K extends keyof AppEvents>(event: K, handler: Handler<AppEvents[K]>): () => void {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as Handler<unknown>);
      return () => {
        set.delete(handler as Handler<unknown>);
      };
    },
  };
}
