import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { xApi } from "../src/content/xApi";

beforeEach(() => { document.head.innerHTML = ""; });
afterEach(() => vi.unstubAllGlobals());
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("X API security boundaries", () => {
  it("fetches query metadata only from the exact HTTPS X asset host, without credentials or redirects", async () => {
    for (const src of ["https://evil.example/abs.twimg.com.js", "https://abs.twimg.com.evil.example/a.js", "http://abs.twimg.com/a.js", "https://abs.twimg.com:8443/a.js", "https://abs.twimg.com/responsive-web/client-web/main.js"]) {
      const script = document.createElement("script"); script.src = src; document.head.append(script);
    }
    const fetcher = vi.fn(async (url: string) => url.startsWith("https://abs.twimg.com/")
      ? new Response('queryId:"safe_query",operationName:"AboutAccountQuery"')
      : json({ data: { user_result_by_screen_name: { result: { about_profile: { account_based_in: "India" } } } } }));
    vi.stubGlobal("fetch", fetcher);
    await xApi(document).lookupRegion("sam");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://abs.twimg.com/responsive-web/client-web/main.js",
      expect.stringContaining("https://x.com/i/api/graphql/safe_query/"),
    ]);
    expect(fetcher).toHaveBeenNthCalledWith(1, expect.any(String), expect.objectContaining({ credentials: "omit", redirect: "error" }));
  });

  it.each([{}, { relationship: { source: {} } }, { relationship: { source: { following: "false" } } }])("fails closed when following protection cannot be verified", async (body) => {
    vi.stubGlobal("fetch", vi.fn(async () => json(body)));
    await expect(xApi(document).isFollowing("sam")).rejects.toThrow();
  });

  it("requires a block response naming the requested account", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ screen_name: "someone_else", blocking: true })));
    expect(await xApi(document).block("sam")).toBe(false);
  });

  it("rejects invalid account handles before any network request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(xApi(document).unblock("bad/handle")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not follow authenticated API redirects", async () => {
    const fetcher = vi.fn(async () => json({ screen_name: "sam", blocking: true })); vi.stubGlobal("fetch", fetcher);
    expect(await xApi(document).block("sam")).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error" }));
  });

  it("does not report a block or unblock as successful without the expected blocking state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ screen_name: "sam" })));
    expect(await xApi(document).block("sam")).toBe(false);
    expect(await xApi(document).unblock("sam")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => json({ screen_name: "sam", blocking: false })));
    expect(await xApi(document).unblock("sam")).toBe(true);
  });
});
