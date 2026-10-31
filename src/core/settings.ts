import { countryFromBasedIn } from "./countries";

export interface RegionRule {
  id: string;
  name: string;
  enabled: boolean;
  /** ISO country codes. */
  countries: string[];
  /** Broad Region names exactly as X shows them, e.g. "South Asia". */
  broadRegions: string[];
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
    return this.store.get<boolean>("paused", false);
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

  exempt() {
    return this.store.get<Record<string, ExemptReason>>("exempt", {});
  }
  async exemptReason(handle: string) {
    return (await this.exempt())[handleKey(handle)];
  }
  async setExempt(handle: string, reason: ExemptReason | null) {
    const all = await this.exempt();
    if (reason) all[handleKey(handle)] = reason;
    else delete all[handleKey(handle)];
    await this.store.set("exempt", all);
  }

  log() {
    return this.store.get<BlockLogEntry[]>("log", []);
  }
  async addLog(entry: BlockLogEntry) {
    const log = await this.log();
    log.push(entry);
    await this.store.set("log", log);
  }
  async markUnblocked(handle: string) {
    const log = await this.log();
    for (const e of log) if (handleKey(e.handle) === handleKey(handle)) e.undone = true;
    await this.store.set("log", log);
  }
  async isBlocked(handle: string) {
    return (await this.log()).some((e) => !e.undone && handleKey(e.handle) === handleKey(handle));
  }
}

/** The first enabled rule the region falls under, or null. Ignores accuracy and Pause. */
export function matchingRule(rules: RegionRule[], basedIn: string | null): RegionRule | null {
  if (!basedIn) return null;
  const country = countryFromBasedIn(basedIn);
  const broad = basedIn.trim().toLowerCase();
  return (
    rules.find(
      (r) =>
        r.enabled &&
        (country
          ? r.countries.includes(country.code)
          : r.broadRegions.some((b) => b.toLowerCase() === broad)),
    ) ?? null
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
      return key in got ? (got[key] as typeof fallback) : fallback;
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
