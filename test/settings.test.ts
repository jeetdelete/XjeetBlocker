import { describe, expect, it } from "vitest";
import { memoryStore, Settings } from "../src/core/settings";

describe("persistent safety state", () => {
  it("retains concurrent block log writes from separate settings instances", async () => {
    const store = memoryStore();
    await Promise.all(Array.from({ length: 20 }, (_, i) => new Settings(store).addLog({
      handle: `user${i}`, at: i, reason: { kind: "hand" },
    })));
    expect(await new Settings(store).log()).toHaveLength(20);
  });

  it("retains concurrent exemptions and treats prototype-shaped handles as ordinary keys", async () => {
    const store = memoryStore();
    await Promise.all(["sam", "ravi", "__proto__", "constructor"].map((h) => new Settings(store).setExempt(h, "never-block")));
    const settings = new Settings(store);
    expect(Object.keys(await settings.exempt()).sort()).toEqual(["__proto__", "constructor", "ravi", "sam"]);
    expect(await settings.exemptReason("__proto__")).toBe("never-block");
    await settings.setExempt("__proto__", null);
    expect(await settings.exemptReason("__proto__")).toBeUndefined();
  });

  it("reads legacy logs and exemptions and keeps simultaneous unblocks", async () => {
    const settings = new Settings(memoryStore({
      log: ["sam", "ravi"].map((handle) => ({ handle, at: 1, reason: { kind: "hand" } })),
      exempt: { sam: "never-block" },
    }));
    await Promise.all([settings.markUnblocked("sam"), settings.markUnblocked("ravi")]);
    expect((await settings.log()).every((e) => e.undone)).toBe(true);
    expect(await settings.exemptReason("sam")).toBe("never-block");
    await settings.setExempt("sam", null);
    expect(await settings.exemptReason("sam")).toBeUndefined();
  });
});
