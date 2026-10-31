import { RateLimitedError, type LookupResult, type XGateway } from "../core/gateway";

// X's public web-client token, the same one x.com's own pages send.
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
// Last known AboutAccountQuery id; X rotates these, so the live one is read from its scripts.
const FALLBACK_ABOUT_QUERY_ID = "XRqGa7EeokUU5kppkh13EA";
const ABOUT_QUERY_PATTERN = /queryId:"([A-Za-z0-9_-]+)",operationName:"AboutAccountQuery"/;

/** The real X, reached with the signed-in user's own session. */
export function xApi(doc: Document): XGateway {
  let aboutQueryId: Promise<string> | undefined;

  const csrf = () => /(?:^|;\s*)ct0=([^;]+)/.exec(doc.cookie)?.[1] ?? "";
  const headers = (extra: Record<string, string> = {}) => ({
    authorization: `Bearer ${BEARER}`,
    "x-csrf-token": csrf(),
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-active-user": "yes",
    ...extra,
  });

  async function findAboutQueryId(): Promise<string> {
    const sources = [...doc.querySelectorAll<HTMLScriptElement>("script[src]")]
      .map((s) => s.src)
      .filter((src) => src.includes("abs.twimg.com"));
    for (const src of sources) {
      try {
        const m = ABOUT_QUERY_PATTERN.exec(await (await fetch(src)).text());
        if (m) return m[1];
      } catch {
        // Try the next script.
      }
    }
    return FALLBACK_ABOUT_QUERY_ID;
  }

  function rateLimitReset(res: Response) {
    const reset = Number(res.headers.get("x-rate-limit-reset"));
    return reset ? reset * 1000 : Date.now() + 15 * 60 * 1000;
  }

  async function lookupOnce(handle: string, queryId: string) {
    const variables = encodeURIComponent(JSON.stringify({ screenName: handle }));
    return fetch(`https://x.com/i/api/graphql/${queryId}/AboutAccountQuery?variables=${variables}`, {
      headers: headers(),
      credentials: "include",
    });
  }

  async function post(path: string, handle: string) {
    const res = await fetch(`https://x.com/i/api/1.1/${path}`, {
      method: "POST",
      headers: headers({ "content-type": "application/x-www-form-urlencoded" }),
      credentials: "include",
      body: new URLSearchParams({ screen_name: handle }),
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return !!body && typeof body === "object" && "screen_name" in body;
  }

  return {
    async lookupRegion(handle): Promise<LookupResult> {
      aboutQueryId ??= findAboutQueryId();
      let res = await lookupOnce(handle, await aboutQueryId);
      if (res.status === 400 || res.status === 404) {
        // Query id went stale: look it up again once.
        aboutQueryId = findAboutQueryId();
        res = await lookupOnce(handle, await aboutQueryId);
      }
      if (res.status === 429) throw new RateLimitedError(rateLimitReset(res));
      if (!res.ok) throw new Error(`AboutAccountQuery ${res.status}`);
      const json = await res.json();
      const about = json?.data?.user_result_by_screen_name?.result?.about_profile ?? {};
      const accurateFlag = about.location_accurate ?? about.created_country_accurate;
      const remaining = res.headers.get("x-rate-limit-remaining");
      return {
        basedIn: typeof about.account_based_in === "string" && about.account_based_in ? about.account_based_in : null,
        accurate: accurateFlag !== false,
        remaining: remaining === null ? undefined : Number(remaining),
        resetAt: rateLimitReset(res),
      };
    },

    async isFollowing(handle) {
      const res = await fetch(
        `https://x.com/i/api/1.1/friendships/show.json?target_screen_name=${encodeURIComponent(handle)}`,
        { headers: headers(), credentials: "include" },
      );
      if (!res.ok) throw new Error(`friendships/show ${res.status}`);
      return !!(await res.json())?.relationship?.source?.following;
    },

    block: (handle) => post("blocks/create.json", handle),
    unblock: (handle) => post("blocks/destroy.json", handle),
  };
}
