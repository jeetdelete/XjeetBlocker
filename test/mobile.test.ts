import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore, Settings } from "../src/core/settings";
import { userscriptStore, type UserscriptStorage } from "../src/mobile/store";
import { mountMobilePanel } from "../src/mobile/panel";

beforeEach(() => { document.body.replaceChildren(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function manager(): UserscriptStorage {
  const values = new Map<string, unknown>([["another-script:key", "private"]]);
  return {
    async getValue<T>(key: string, fallback?: T): Promise<T> { return structuredClone(values.has(key) ? values.get(key) as T : fallback as T); },
    async setValue(key, value) { values.set(key, structuredClone(value)); },
    async deleteValue(key) { values.delete(key); },
    async listValues() { return [...values.keys()]; },
  };
}

describe("mobile storage", () => {
  it("persists settings through the manager, enumerates only its own keys and never uses X localStorage", async () => {
    const api = manager();
    const first = new Settings(userscriptStore(api));
    expect(await first.paused()).toBe(true);
    await first.setPaused(false);
    await first.setExempt("sam", "never-block");
    await first.putRegion("sam", { basedIn: "United States", accurate: true, fetchedAt: 1 });
    await first.addLog({ handle: "sam", at: 1, reason: { kind: "hand" } });
    const second = new Settings(userscriptStore(api));
    expect(await second.paused()).toBe(false);
    expect(await second.exemptReason("sam")).toBe("never-block");
    expect(Object.keys(await second.regions())).toEqual(["sam"]);
    expect(await second.log()).toHaveLength(1);
    expect(await userscriptStore(api).entries("another-script:")).toEqual({});
    await userscriptStore(api).remove("region:sam");
    expect(await second.region("sam")).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });
});

describe("mobile settings panel", () => {
  it("opens and closes touch controls, persists Pause and edits rules without Chrome APIs", async () => {
    vi.stubGlobal("chrome", undefined);
    const settings = new Settings(memoryStore());
    const mobile = mountMobilePanel(settings, vi.fn(async () => true));
    expect(mobile.host.shadowRoot).toBeNull();
    expect(mobile.panel.hidden).toBe(true);
    expect(mobile.panel.querySelectorAll("script")).toHaveLength(0);
    mobile.launcher.click();
    await vi.waitFor(() => expect(mobile.panel.querySelectorAll(".rule-card")).toHaveLength(3));
    expect(mobile.panel.hidden).toBe(false);
    expect(mobile.launcher.getAttribute("aria-expanded")).toBe("true");
    const pause = mobile.panel.querySelector<HTMLInputElement>("#pause")!;
    expect(pause.checked).toBe(true);
    pause.checked = false; pause.dispatchEvent(new Event("change"));
    await vi.waitFor(async () => expect(await settings.paused()).toBe(false));
    mobile.panel.querySelector<HTMLButtonElement>("#new-rule")!.click();
    await vi.waitFor(() => expect(mobile.panel.querySelector<HTMLElement>("#editor")!.hidden).toBe(false));
    mobile.panel.querySelector<HTMLInputElement>("#rule-name")!.value = "Mobile rule";
    mobile.panel.querySelector<HTMLButtonElement>("#save-rule")!.click();
    await vi.waitFor(async () => expect((await settings.rules()).some((rule) => rule.name === "Mobile rule")).toBe(true));
    mobile.close.click();
    expect(mobile.panel.hidden).toBe(true);
  });

  it("imports and exports a CSV inside the mobile panel with the shared rule controls", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const settings = new Settings(memoryStore());
    const mobile = mountMobilePanel(settings, vi.fn(async () => true));
    mobile.launcher.click();
    await vi.waitFor(() => expect(mobile.panel.querySelectorAll(".rule-card")).toHaveLength(3));
    const card = mobile.panel.querySelector(".rule-card")!;
    const findButton = (label: string) => [...card.querySelectorAll("button")].find((button) => button.textContent === label)!;
    findButton("Import CSV").click();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    const input = mobile.panel.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [{ text: async () => "handle,country,region\nsam,United States,United States\n" }] });
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(async () => expect((await settings.rules())[0].accounts?.[0].handle).toBe("sam"));
    let downloaded = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function(this: HTMLAnchorElement) { downloaded = this.download; });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:mobile-test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const exportBtn = [...mobile.panel.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Export CSV")!;
    exportBtn.click();
    await vi.waitFor(() => expect(downloaded).toBe("India-accounts.csv"));
  });
});
