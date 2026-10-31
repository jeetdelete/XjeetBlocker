/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore, Settings } from "../src/core/settings";
import html from "../src/popup/index.html?raw";

let settings: Settings;
let data: Record<string, unknown>;

beforeEach(async () => {
  vi.resetModules();
  document.documentElement.innerHTML = html;
  data = {};
  vi.stubGlobal("chrome", { storage: { local: {
    get: async (key: string | null) => key === null ? structuredClone(data) : key in data ? { [key]: structuredClone(data[key]) } : {},
    set: async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); },
    remove: async (key: string) => { delete data[key]; },
  } } });
  // The same data is used by the actual popup's chromeStore and these assertions.
  const store = memoryStore();
  store.get = async <T>(key: string, fallback: T): Promise<T> => structuredClone(key in data ? data[key] as T : fallback);
  store.set = async (key, value) => { data[key] = structuredClone(value); };
  settings = new Settings(store);
  await settings.saveRules([{ id: "list", name: "My list", enabled: true, countries: ["IN"], broadRegions: [] }]);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
  await import("../src/popup/popup");
  await vi.waitFor(() => expect(document.querySelectorAll(".rule-card")).toHaveLength(1));
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function button(text: string) {
  return [...document.querySelectorAll("button")].find((b) => b.textContent === text)!;
}

function selectCsv(text: string) {
  button("Import CSV").click();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [{ size: text.length, text: async () => text }] });
  input.dispatchEvent(new Event("change"));
}

describe("popup rule lists", () => {
  it("imports into the selected rule, preserves countries, merges handles and can clear the list", async () => {
    selectCsv("handle,country,region\n@SAM,United States,United States\n");
    await vi.waitFor(() => expect(document.getElementById("list-status")!.textContent).toContain("Loaded 1 accounts"));
    expect((await settings.rules())[0]).toMatchObject({
      countries: ["IN"], accounts: [{ handle: "sam", country: "United States", region: "United States" }],
    });
    expect(await settings.region("sam")).toBeUndefined();
    selectCsv("handle,country,region\nsam,,South Asia\nravi,,South Asia\n");
    await vi.waitFor(() => expect(document.getElementById("list-status")!.textContent).toContain("2 listed in total"));
    expect((await settings.rules())[0].accounts).toHaveLength(2);
    button("Clear list").click();
    await vi.waitFor(() => expect(document.getElementById("list-status")!.textContent).toContain("Cleared"));
    expect((await settings.rules())[0]).toMatchObject({ countries: ["IN"], accounts: [] });
  });

  it("shows invalid-file feedback without changing the rule", async () => {
    const before = await settings.rules();
    selectCsv("handle,country,region\ninvalid/handle,India,India\n");
    await vi.waitFor(() => expect(document.getElementById("list-status")!.textContent).toContain("invalid X handle"));
    expect(await settings.rules()).toEqual(before);
  });

  it("leaves the rule unchanged when the import confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    selectCsv("handle,country,region\nsam,,\n");
    await vi.waitFor(() => expect(document.querySelector('input[type="file"]')).toBeNull());
    expect((await settings.rules())[0].accounts).toBeUndefined();
  });

  it("downloads a CSV for the selected rule", async () => {
    let downloaded = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    button("Export CSV").click();
    await vi.waitFor(() => expect(downloaded).toBe("My-list-accounts.csv"));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});
