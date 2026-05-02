import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBestStars,
  clearCode,
  loadBestStars,
  loadCode,
  saveBestStars,
  saveCode,
} from "../features/quest";

// Vitest runs in node by default, so `localStorage` isn't a global.
// Install a minimal in-memory shim on `globalThis` and tear it down
// after each test — matches the storage module's `globalThis.localStorage`
// lookup path without pulling in a full DOM (jsdom / happy-dom).

type MutableStorage = Storage;

function makeMemStorage(): MutableStorage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
  };
}

const KEY_PREFIX = "quest:code:v1:";

// DOM lib types declare `localStorage` as always defined on the global
// scope; cast through `unknown` so we can install / delete it cleanly
// for the unavailable-storage tests without redeclaring the global.
type LocalStorageHolder = { localStorage?: Storage };

let mem: MutableStorage;

beforeEach(() => {
  mem = makeMemStorage();
  (globalThis as unknown as LocalStorageHolder).localStorage = mem;
});

afterEach(() => {
  delete (globalThis as unknown as LocalStorageHolder).localStorage;
  vi.restoreAllMocks();
});

describe("quest: storage", () => {
  it("loadCode returns null for an unset stage", () => {
    expect(loadCode("first-floor")).toBeNull();
  });

  it("saveCode then loadCode round-trips", () => {
    saveCode("first-floor", "sim.pushDestination(0, 1);");
    expect(loadCode("first-floor")).toBe("sim.pushDestination(0, 1);");
  });

  it("clearCode removes a saved entry", () => {
    saveCode("first-floor", "x");
    clearCode("first-floor");
    expect(loadCode("first-floor")).toBeNull();
  });

  it("entries are namespaced under quest:code:v1:", () => {
    saveCode("listen-up", "abc");
    expect(mem.getItem(`${KEY_PREFIX}listen-up`)).toBe("abc");
  });

  it("different stage ids do not collide", () => {
    saveCode("a", "alpha");
    saveCode("b", "beta");
    expect(loadCode("a")).toBe("alpha");
    expect(loadCode("b")).toBe("beta");
  });

  it("rejects entries larger than the per-stage cap", () => {
    // Cap is 50KB; a 60KB string must not write.
    const huge = "x".repeat(60_000);
    saveCode("big", huge);
    expect(loadCode("big")).toBeNull();
  });

  it("accepts entries up to the per-stage cap", () => {
    const big = "y".repeat(50_000);
    saveCode("ok", big);
    expect(loadCode("ok")).toBe(big);
  });

  it("saveCode swallows setItem errors (private mode / quota)", () => {
    const setSpy = vi.spyOn(mem, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => {
      saveCode("first-floor", "code");
    }).not.toThrow();
    expect(setSpy).toHaveBeenCalled();
  });

  it("loadCode swallows getItem errors", () => {
    vi.spyOn(mem, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(loadCode("first-floor")).toBeNull();
  });

  it("clearCode swallows removeItem errors", () => {
    vi.spyOn(mem, "removeItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => {
      clearCode("first-floor");
    }).not.toThrow();
  });

  it("loadCode returns null when localStorage is unavailable", () => {
    delete (globalThis as unknown as LocalStorageHolder).localStorage;
    expect(loadCode("first-floor")).toBeNull();
  });

  it("saveCode is a no-op when localStorage is unavailable", () => {
    delete (globalThis as unknown as LocalStorageHolder).localStorage;
    expect(() => {
      saveCode("first-floor", "code");
    }).not.toThrow();
  });
});

describe("quest: bestStars", () => {
  it("loadBestStars returns 0 for an unset stage", () => {
    expect(loadBestStars("first-floor")).toBe(0);
  });

  it("saveBestStars then loadBestStars round-trips for each tier", () => {
    saveBestStars("a", 1);
    expect(loadBestStars("a")).toBe(1);
    saveBestStars("b", 2);
    expect(loadBestStars("b")).toBe(2);
    saveBestStars("c", 3);
    expect(loadBestStars("c")).toBe(3);
  });

  it("entries are namespaced under quest:bestStars:v1:", () => {
    saveBestStars("listen-up", 2);
    expect(mem.getItem("quest:bestStars:v1:listen-up")).toBe("2");
  });

  it("never regresses a higher score with a lower one", () => {
    saveBestStars("x", 3);
    saveBestStars("x", 1);
    expect(loadBestStars("x")).toBe(3);
  });

  it("equal score is a no-op (storage write is skipped)", () => {
    saveBestStars("x", 2);
    const setSpy = vi.spyOn(mem, "setItem");
    saveBestStars("x", 2);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("clearBestStars removes the stored entry", () => {
    saveBestStars("x", 3);
    clearBestStars("x");
    expect(loadBestStars("x")).toBe(0);
  });

  it("malformed entries read as 0", () => {
    mem.setItem("quest:bestStars:v1:bad", "not-a-number");
    expect(loadBestStars("bad")).toBe(0);
  });

  it("out-of-range entries read as 0", () => {
    mem.setItem("quest:bestStars:v1:bad", "9");
    expect(loadBestStars("bad")).toBe(0);
    mem.setItem("quest:bestStars:v1:bad", "-1");
    expect(loadBestStars("bad")).toBe(0);
  });

  it("loadBestStars returns 0 when localStorage is unavailable", () => {
    delete (globalThis as unknown as LocalStorageHolder).localStorage;
    expect(loadBestStars("any")).toBe(0);
  });

  it("saveBestStars swallows setItem errors", () => {
    vi.spyOn(mem, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => {
      saveBestStars("any", 3);
    }).not.toThrow();
  });
});
