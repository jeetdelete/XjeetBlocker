import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unblock = vi.hoisted(() => vi.fn(async () => true));
vi.mock("../src/content/app", () => ({ startApp: () => ({ unblock }) }));
let listener: (message: unknown, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => boolean | void;
beforeEach(async () => {
  vi.resetModules(); unblock.mockClear();
  vi.stubGlobal("chrome", { runtime: {
    id: "extension-id", getURL: (path: string) => `chrome-extension://extension-id/${path}`,
    onMessage: { addListener: (fn: typeof listener) => { listener = fn; } },
  } });
  await import("../src/content/main");
});
afterEach(() => vi.unstubAllGlobals());

describe("popup message authorization", () => {
  it("rejects requests from content pages and other senders", () => {
    for (const sender of [{ id: "extension-id", url: "https://x.com/home" }, { id: "other-id", url: "chrome-extension://extension-id/index.html" }]) {
      listener({ type: "unblock", handle: "sam" }, sender, vi.fn());
    }
    expect(unblock).not.toHaveBeenCalled();
  });
  it("rejects malformed handles even from the popup", () => {
    listener({ type: "unblock", handle: "bad/handle" }, { id: "extension-id", url: "chrome-extension://extension-id/index.html" }, vi.fn());
    expect(unblock).not.toHaveBeenCalled();
  });
  it("accepts a valid unblock request from this extension's popup", async () => {
    const reply = vi.fn();
    expect(listener({ type: "unblock", handle: "sam" }, { id: "extension-id", url: "chrome-extension://extension-id/index.html" }, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith(true));
    expect(unblock).toHaveBeenCalledWith("sam");
  });
});
