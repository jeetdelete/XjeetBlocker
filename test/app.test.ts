import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startApp, type App } from "../src/content/app";
import { memoryStore, Settings, type KeyValueStore } from "../src/core/settings";
import { FakeX, post, userCell } from "./fakes";

const DAY = 24 * 60 * 60 * 1000;
let x: FakeX;
let store: KeyValueStore;
let settings: Settings;
let app: App;
let clock = 1_000_000;
let visible: (el: Element) => boolean;

function show(html: string) {
  document.body.innerHTML = `<main>${html}</main>`;
}

async function start() {
  app = startApp({
    doc: document,
    gateway: x,
    store,
    now: () => clock,
    isVisible: (el) => visible(el),
    lookupSpacingMs: 100,
  });
  await settle();
}

async function settle() {
  for (let i = 0; i < 20; i++) {
    await vi.advanceTimersByTimeAsync(200);
    await app.idle();
  }
}

const badge = (handle: string) =>
  document.querySelector<HTMLElement>(`.xrb-badge[data-xrb-handle="${handle}"]`)!;
const articleOf = (handle: string) =>
  document.querySelector<HTMLElement>(`article[data-xrb-author="${handle}"]`)!;

beforeEach(() => {
  vi.useFakeTimers();
  document.head.innerHTML = "";
  x = new FakeX({
    priya: { basedIn: "India" },
    sam: { basedIn: "United States" },
    ravi: { basedIn: "South Asia" },
    vpn: { basedIn: "India", accurate: false },
    friend: { basedIn: "India", followed: true },
    ghost: { basedIn: null },
  });
  store = memoryStore();
  settings = new Settings(store);
  visible = () => true;
});

afterEach(() => {
  app?.stop();
  vi.useRealTimers();
});

describe("Region Badge", () => {
  it("shows flag and country beside the author as you scroll", async () => {
    show(post("sam"));
    await start();
    expect(badge("sam").textContent).toBe("🇺🇸 United States");
  });

  it("shows loading until the region is known", async () => {
    show(post("sam"));
    app = startApp({ doc: document, gateway: x, store, now: () => clock, isVisible: () => true });
    expect(badge("sam").textContent).toBe("…");
  });

  it("shows a grey ? for an Unknown Region and a globe for a Broad Region", async () => {
    show(post("ghost") + post("ravi"));
    await start();
    expect(badge("ghost").textContent).toBe("?");
    expect(badge("ravi").textContent).toBe("🌐 South Asia");
  });

  it("marks regions X says may be inaccurate", async () => {
    show(post("vpn"));
    await start();
    expect(badge("vpn").textContent).toBe("⚠ 🇮🇳 India");
  });

  it("badges reposters and quoted authors too", async () => {
    show(post("sam", { repostedBy: "ghost", quoting: "ravi" }));
    await start();
    expect(badge("ghost").textContent).toBe("?");
    expect(badge("ravi").textContent).toBe("🌐 South Asia");
  });

  it("remembers regions permanently, including unknown ones", async () => {
    show(post("sam"));
    await start();
    app.stop();
    show(post("sam"));
    await start();
    expect(x.lookups).toEqual(["sam"]);

    app.stop();
    clock += 5 * 365 * DAY;
    show(post("sam") + post("ghost"));
    await start();
    app.stop();
    clock += 5 * 365 * DAY;
    show(post("sam") + post("ghost"));
    await start();
    expect(x.lookups).toEqual(["sam", "ghost"]);
  });

  it("only uses remembered regions in follower lists", async () => {
    await settings.putRegion("sam", { basedIn: "United States", accurate: true, fetchedAt: clock });
    show(userCell("sam") + userCell("priya"));
    await start();
    expect(badge("sam").textContent).toBe("🇺🇸 United States");
    expect(badge("priya").textContent).toBe("");
    expect(x.lookups).toEqual([]);
  });

  it("skips lookups for accounts scrolled off screen", async () => {
    visible = (el) => el.closest("article")?.getAttribute("data-xrb-author") !== "sam";
    show(post("sam") + post("ghost"));
    await start();
    expect(x.lookups).toEqual(["ghost"]);
  });

  it("waits out X's rate limit, then carries on", async () => {
    x.allowance = 1;
    x.resetAt = clock + 60_000;
    show(post("sam") + post("ghost"));
    await start();
    expect(x.lookups).toHaveLength(1);

    x.allowance = 10;
    clock += 60_000;
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(x.lookups).toHaveLength(2);
  });
});

describe("Region Rules", () => {
  it("blocks accounts based in India by default and logs why", async () => {
    show(post("priya") + post("sam"));
    await start();
    expect([...x.blocked]).toEqual(["priya"]);
    const log = await settings.log();
    expect(log).toMatchObject([
      { handle: "priya", reason: { kind: "rule", ruleName: "India", basedIn: "India" } },
    ]);
    expect(articleOf("priya").querySelector(".xrb-blocked-line")!.textContent).toContain(
      "Blocked: @priya (India rule)",
    );
  });

  it("blocks a reposter by their own region, not the author's", async () => {
    show(post("sam", { repostedBy: "priya" }));
    await start();
    expect([...x.blocked]).toEqual(["priya"]);
  });

  it("never blocks followed, inaccurate, or Unknown Region accounts", async () => {
    show(post("friend") + post("vpn") + post("ghost"));
    await start();
    expect(x.blocked.size).toBe(0);
    expect(badge("friend").classList.contains("xrb-match")).toBe(true);
    expect(badge("vpn").classList.contains("xrb-match")).toBe(true);
    expect(badge("ghost").classList.contains("xrb-match")).toBe(false);
  });

  it("only matches a Broad Region when it was ticked itself", async () => {
    show(post("ravi"));
    await start();
    expect(x.blocked.size).toBe(0);

    app.stop();
    await settings.saveRules([
      { id: "sa", name: "South Asia", enabled: true, countries: [], broadRegions: ["South Asia"] },
    ]);
    show(post("ravi"));
    await start();
    expect([...x.blocked]).toEqual(["ravi"]);
  });

  it("does nothing while paused except highlight", async () => {
    await settings.setPaused(true);
    show(post("priya"));
    await start();
    expect(x.blocked.size).toBe(0);
    expect(badge("priya").classList.contains("xrb-match")).toBe(true);
  });

  it("ignores switched-off rules", async () => {
    await settings.saveRules([{ id: "india", name: "India", enabled: false, countries: ["IN"], broadRegions: [] }]);
    show(post("priya"));
    await start();
    expect(x.blocked.size).toBe(0);
    expect(badge("priya").classList.contains("xrb-match")).toBe(false);
  });

  it("does not log a block X never confirmed", async () => {
    x.confirmBlocks = false;
    show(post("priya"));
    await start();
    expect(await settings.log()).toEqual([]);
    expect(articleOf("priya").classList.contains("xrb-collapsed")).toBe(false);
  });

  it("never re-blocks an account the user unblocked", async () => {
    show(post("priya"));
    await start();
    await app.unblock("priya");
    expect(x.blocked.size).toBe(0);

    app.stop();
    show(post("priya"));
    await start();
    expect(x.blocked.size).toBe(0);
    expect(badge("priya").classList.contains("xrb-match")).toBe(true);
  });
});

describe("Hand Block", () => {
  it("blocks on one click with a 5-second undo", async () => {
    show(post("sam"));
    await start();
    articleOf("sam").querySelector<HTMLButtonElement>(".xrb-block")!.click();
    await settle();
    expect([...x.blocked]).toEqual(["sam"]);
    expect((await settings.log())[0]).toMatchObject({ handle: "sam", reason: { kind: "hand" } });

    document.querySelector<HTMLButtonElement>(".xrb-toast button")!.click();
    await settle();
    expect(x.blocked.size).toBe(0);
    expect(articleOf("sam").classList.contains("xrb-collapsed")).toBe(false);
  });

  it("shows the button's tooltip instantly on hover", async () => {
    show(post("sam"));
    await start();
    const btn = articleOf("sam").querySelector<HTMLButtonElement>(".xrb-block")!;
    btn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const tip = document.querySelector<HTMLElement>(".xrb-tip")!;
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toBe("Block @sam");
    btn.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    expect(tip.hidden).toBe(true);
  });

  it("toast disappears after 5 seconds", async () => {
    show(post("sam"));
    await start();
    articleOf("sam").querySelector<HTMLButtonElement>(".xrb-block")!.click();
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    expect(document.querySelector(".xrb-toast")).toBeNull();
  });

  it("Never block protects an account from Region Rules", async () => {
    await settings.saveRules([{ id: "india", name: "India", enabled: false, countries: ["IN"], broadRegions: [] }]);
    show(post("priya"));
    await start();
    articleOf("priya").querySelector<HTMLButtonElement>(".xrb-spare")!.click();
    await settle();
    app.stop();

    await settings.saveRules([{ id: "india", name: "India", enabled: true, countries: ["IN"], broadRegions: [] }]);
    show(post("priya"));
    await start();
    expect(x.blocked.size).toBe(0);
    expect(await settings.exemptReason("priya")).toBe("never-block");
  });
});

describe("Defaults and waiting", () => {
  it("blocks India, Pakistan and Nigeria out of the box", async () => {
    x.accounts.ali = { basedIn: "Pakistan" };
    x.accounts.ada = { basedIn: "Nigeria" };
    show(post("priya") + post("ali") + post("ada") + post("sam"));
    await start();
    expect([...x.blocked].sort()).toEqual(["ada", "ali", "priya"]);
  });

  it("shows ⏳ with the resume time while X's lookup limit is reached", async () => {
    x.allowance = 0;
    x.resetAt = clock + 10 * 60_000;
    show(post("sam"));
    await start();
    expect(badge("sam").textContent).toBe("⏳");
    expect(badge("sam").dataset.xrbTip).toMatch(/^Waiting for X's lookup limit; resumes at /);

    x.allowance = 10;
    clock += 10 * 60_000;
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await settle();
    expect(badge("sam").textContent).toBe("🇺🇸 United States");
  });
});

describe("Region cache", () => {
  it("looks up an account once however often it appears", async () => {
    show(post("sam") + post("ghost", { quoting: "sam" }) + post("ravi", { repostedBy: "sam" }));
    await start();
    // More of the same accounts arrive while scrolling, after their lookups started.
    document.querySelector("main")!.insertAdjacentHTML("beforeend", post("sam") + post("ghost"));
    await settle();
    expect(x.lookups.filter((h) => h === "sam")).toEqual(["sam"]);
    expect(x.lookups.filter((h) => h === "ghost")).toEqual(["ghost"]);
  });

  it("does not queue an account again while its lookup is running", async () => {
    x.lookupDelayMs = 1000;
    show(post("sam"));
    app = startApp({ doc: document, gateway: x, store, now: () => clock, isVisible: () => true, lookupSpacingMs: 100 });
    await vi.advanceTimersByTimeAsync(50);
    expect(x.lookups).toEqual(["sam"]);
    document.querySelector("main")!.insertAdjacentHTML("beforeend", post("sam"));
    await settle();
    expect(x.lookups).toEqual(["sam"]);
    expect(badge("sam").textContent).toBe("🇺🇸 United States");
  });

  it("never looks up an account it already has, across page loads", async () => {
    show(post("sam") + post("ravi"));
    await start();
    app.stop();
    clock += 29 * DAY;
    show(post("sam") + post("ravi") + post("sam"));
    await start();
    expect(x.lookups).toEqual(["ravi", "sam"]);
  });

  it("keeps every result when lookups finish close together", async () => {
    show(post("sam") + post("ravi") + post("ghost") + post("priya"));
    await start();
    expect(Object.keys(await settings.regions()).sort()).toEqual(["ghost", "priya", "ravi", "sam"]);
  });
});

describe("Region cache from earlier versions", () => {
  it("uses regions saved in the old single record without looking them up", async () => {
    store = memoryStore({
      regions: { sam: { basedIn: "United States", accurate: true, fetchedAt: clock } },
    });
    settings = new Settings(store);
    show(post("sam"));
    await start();
    expect(x.lookups).toEqual([]);
    expect(badge("sam").textContent).toBe("🇺🇸 United States");
    expect(await store.get("regions", null)).toBeNull();
  });
});
