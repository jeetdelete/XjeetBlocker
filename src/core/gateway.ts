/** Everything the extension asks of X. Tests replace it with a fake X. */
export interface XGateway {
  lookupRegion(handle: string): Promise<LookupResult>;
  isFollowing(handle: string): Promise<boolean>;
  /** Resolves true only when X confirmed the block. */
  block(handle: string): Promise<boolean>;
  unblock(handle: string): Promise<boolean>;
}

export interface LookupResult {
  basedIn: string | null;
  accurate: boolean;
  /** X's remaining lookup allowance, when it reports one. */
  remaining?: number;
  resetAt?: number;
}

export class RateLimitedError extends Error {
  constructor(public resetAt: number) {
    super(`X rate limit reached until ${new Date(resetAt).toISOString()}`);
  }
}
