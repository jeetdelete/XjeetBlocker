import { RateLimitedError, type LookupResult, type XGateway } from "../src/core/gateway";

export interface FakeAccount {
  basedIn?: string | null;
  accurate?: boolean;
  followed?: boolean;
}

/** A stand-in for X: accounts, a lookup allowance, and the user's block list. */
export class FakeX implements XGateway {
  lookups: string[] = [];
  blocked = new Set<string>();
  /** When false, X accepts block requests but silently ignores them. */
  confirmBlocks = true;
  allowance = Infinity;
  resetAt = 0;

  constructor(public accounts: Record<string, FakeAccount> = {}) {}

  /** How long each lookup takes to answer. */
  lookupDelayMs = 0;

  async lookupRegion(handle: string): Promise<LookupResult> {
    if (this.allowance <= 0) throw new RateLimitedError(this.resetAt);
    this.allowance--;
    this.lookups.push(handle);
    if (this.lookupDelayMs) await new Promise((r) => setTimeout(r, this.lookupDelayMs));
    const a = this.accounts[handle] ?? {};
    return { basedIn: a.basedIn ?? null, accurate: a.accurate ?? true };
  }
  async isFollowing(handle: string) {
    return !!this.accounts[handle]?.followed;
  }
  async block(handle: string) {
    if (!this.confirmBlocks) return false;
    this.blocked.add(handle);
    return true;
  }
  async unblock(handle: string) {
    this.blocked.delete(handle);
    return true;
  }
}

/** Markup shaped like X's timeline post. */
export function post(author: string, opts: { repostedBy?: string; quoting?: string } = {}) {
  const ctx = opts.repostedBy
    ? `<a href="/${opts.repostedBy}"><span data-testid="socialContext">${opts.repostedBy} reposted</span></a>`
    : "";
  const quote = opts.quoting
    ? `<div role="link"><div data-testid="User-Name"><a href="/${opts.quoting}">${opts.quoting}</a><a href="/${opts.quoting}">@${opts.quoting}</a></div><p>quoted text</p></div>`
    : "";
  return `<article data-testid="tweet">${ctx}<div data-testid="User-Name"><a href="/${author}">${author}</a><a href="/${author}">@${author}</a></div><div data-testid="tweetText">hello</div>${quote}</article>`;
}

export function userCell(handle: string) {
  return `<div data-testid="UserCell"><div data-testid="User-Name"><a href="/${handle}">@${handle}</a></div></div>`;
}
