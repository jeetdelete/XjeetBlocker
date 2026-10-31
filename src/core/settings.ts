import { countryFromBasedIn } from "./countries";

export interface RuleAccount {
  handle: string;
  country: string;
  region: string;
}

export interface RegionRule {
  id: string;
  name: string;
  enabled: boolean;
  /** ISO country codes. */
  countries: string[];
  /** Broad Region names exactly as X shows them, e.g. "South Asia". */
  broadRegions: string[];
  /** Explicit accounts imported by the user; location fields are unverified CSV metadata. */
  accounts?: RuleAccount[];
}

export interface RegionInfo {
  /** X's "Account based in" text; null is an Unknown Region. */
  basedIn: string | null;
  /** False when X warns the region may be inaccurate (VPN, proxy). */
  accurate: boolean;
  fetchedAt: number;
}

export type ExemptReason = "never-block" | "unblocked";

export type BlockReason =
  | { kind: "hand" }
  | { kind: "rule"; ruleId: string; ruleName: string; basedIn: string };

export interface BlockLogEntry {
  handle: string;
  at: number;
  reason: BlockReason;
  undone?: boolean;
}

export interface KeyValueStore {
  get<T>(key: string, fallback: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  /** Every stored value whose key starts with the prefix. */
  entries<T>(prefix: string): Promise<Record<string, T>>;
}

const REGION_PREFIX = "region:";


export const DEFAULT_RULES: RegionRule[] = [
  { id: "india", name: "India", enabled: true, countries: ["IN"], broadRegions: [] },
  { id: "pakistan", name: "Pakistan", enabled: true, countries: ["PK"], broadRegions: [] },
  { id: "nigeria", name: "Nigeria", enabled: true, countries: ["NG"], broadRegions: [] },
];

export const handleKey = (handle: string) => handle.toLowerCase();

/** Typed access to everything the extension remembers. Shared by the page and the popup. */
export class Settings {
  constructor(private store: KeyValueStore) {}

  rules() {
    return this.store.get<RegionRule[]>("rules", DEFAULT_RULES);
  }
  saveRules(rules: RegionRule[]) {
    return this.store.set("rules", rules);
  }

  paused() {
    return this.store.get<boolean>("paused", true);
  }
  setPaused(paused: boolean) {
    return this.store.set("paused", paused);
  }

  /** Every remembered region, by lower-case handle. */
  async regions() {
    const all = await this.store.entries<RegionInfo>(REGION_PREFIX);
    return Object.fromEntries(Object.entries(all).map(([k, v]) => [k.slice(REGION_PREFIX.length), v]));
  }
  /** The cached region, kept permanently once looked up. */
  region(handle: string): Promise<RegionInfo | undefined> {
    return this.store.get<RegionInfo | undefined>(REGION_PREFIX + handleKey(handle), undefined);
  }
  /** Each account is stored under its own key, so saves never overwrite each other. */
  putRegion(handle: string, info: RegionInfo) {
    return this.store.set(REGION_PREFIX + handleKey(handle), info);
  }

  /** Moves regions saved by earlier versions, which kept them all in one record. */
  async migrateRegions() {
    const legacy = await this.store.get<Record<string, RegionInfo> | null>("regions", null);
    if (!legacy) return;
    for (const [handle, info] of Object.entries(legacy)) {
      if (!(await this.store.get(REGION_PREFIX + handle, null))) await this.putRegion(handle, info);
    }
    await this.store.remove("regions");
  }

  async exempt() {
    const legacy = await this.store.get<Record<string, ExemptReason>>("exempt", {});
    const all = new Map(Object.entries(legacy));
    const current = await this.store.entries<ExemptReason | null>("exempt:");
    for (const [key, value] of Object.entries(current)) {
      const handle = key.slice("exempt:".length);
      if (value) all.set(handle, value);
      else all.delete(handle);
    }
    return Object.fromEntries(all);
  }
  async exemptReason(handle: string) {
    const all = await this.exempt();
    const key = handleKey(handle);
    return Object.hasOwn(all, key) ? all[key] : undefined;
  }
  async setExempt(handle: string, reason: ExemptReason | null) {
    // One key per account avoids lost exemptions from concurrent writes in other tabs.
    await this.store.set("exempt:" + handleKey(handle), reason);
  }

  private async logEntries() {
    const legacy = await this.store.get<BlockLogEntry[]>("log", []);
    const current = await this.store.entries<BlockLogEntry>("log:");
    // Stable legacy keys let newer undone flags override old records without destructive migration.
    return { ...Object.fromEntries(legacy.map((entry, i) => [`log:legacy:${i}`, entry])), ...current };
  }
  async log() {
    return Object.values(await this.logEntries()).sort((a, b) => a.at - b.at);
  }
  async addLog(entry: BlockLogEntry) {
    await this.store.set("log:" + crypto.randomUUID(), entry);
  }
  async markUnblocked(handle: string) {
    const log = await this.logEntries();
    await Promise.all(Object.entries(log)
      .filter(([, entry]) => handleKey(entry.handle) === handleKey(handle))
      .map(([key, entry]) => this.store.set(key, { ...entry, undone: true })));
  }
  async isBlocked(handle: string) {
    return (await this.log()).some((e) => !e.undone && handleKey(e.handle) === handleKey(handle));
  }
}

/** The first enabled rule matching the region or an explicitly listed handle. Ignores accuracy and Pause. */
export function matchingRule(rules: RegionRule[], basedIn: string | null, handle?: string): RegionRule | null {
  const country = countryFromBasedIn(basedIn ?? "");
  const broad = basedIn?.trim().toLowerCase();
  return (
    rules.find((rule) => {
      if (!rule.enabled) return false;
      if (handle && rule.accounts?.some((a) => handleKey(a.handle) === handleKey(handle))) return true;
      return country
        ? rule.countries.includes(country.code)
        : rule.broadRegions.some((b) => b.toLowerCase() === broad);
    }) ?? null
  );
}

export function memoryStore(initial: Record<string, unknown> = {}): KeyValueStore {
  const data = new Map(Object.entries(structuredClone(initial)));
  return {
    async get<T>(key: string, fallback: T) {
      return structuredClone(data.has(key) ? (data.get(key) as T) : fallback);
    },
    async set(key, value) {
      data.set(key, structuredClone(value));
    },
    async remove(key) {
      data.delete(key);
    },
    async entries<T>(prefix: string) {
      return Object.fromEntries(
        [...data].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v) as T]),
      );
    },
  };
}

export function chromeStore(): KeyValueStore {
  return {
    async get(key, fallback) {
      const got = await chrome.storage.local.get(key);
      return Object.hasOwn(got, key) ? (got[key] as typeof fallback) : fallback;
    },
    async set(key, value) {
      await chrome.storage.local.set({ [key]: value });
    },
    async remove(key) {
      await chrome.storage.local.remove(key);
    },
    async entries<T>(prefix: string) {
      const all = await chrome.storage.local.get(null);
      return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(prefix))) as Record<string, T>;
    },
  };
}
