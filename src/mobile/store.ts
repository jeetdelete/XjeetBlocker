import type { KeyValueStore } from "../core/settings";

export interface UserscriptStorage {
  getValue<T>(key: string, fallback?: T): Promise<T>;
  setValue(key: string, value: unknown): Promise<unknown>;
  deleteValue(key: string): Promise<unknown>;
  listValues(): Promise<string[]>;
}

/** Manager-owned storage: never expose account lists or exemptions in X's localStorage. */
export function userscriptStore(api: UserscriptStorage): KeyValueStore {
  const namespace = "xjeetblocker:";
  return {
    async get<T>(key: string, fallback: T) { return api.getValue(namespace + key, fallback); },
    async set(key, value) { await api.setValue(namespace + key, value); },
    async remove(key) { await api.deleteValue(namespace + key); },
    async entries<T>(prefix: string) {
      const keys = (await api.listValues()).filter((key) => key.startsWith(namespace + prefix));
      return Object.fromEntries(await Promise.all(keys.map(async (key) => [
        key.slice(namespace.length), await api.getValue<T>(key),
      ])));
    },
  };
}
