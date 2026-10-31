import { RateLimitedError, type LookupResult } from "./gateway";

export interface LookupQueueOptions {
  lookup(handle: string): Promise<LookupResult>;
  /** Whether the account is still on screen; ones that are not get dropped. */
  wanted(handle: string): boolean;
  onResult(handle: string, result: LookupResult): void;
  /** Called when lookups pause for X's limit, with when they resume. */
  onPause?(until: number): void;
  now(): number;
  spacingMs?: number;
  /** Lookups kept back from X's allowance so X itself keeps working. */
  reserve?: number;
}

/**
 * One lookup at a time, spaced out, newest request first, pausing when X's
 * allowance runs low or X says the limit is reached.
 */
export class LookupQueue {
  private pending: string[] = [];
  /** Accounts being looked up or already answered; never queued again. */
  private handled = new Set<string>();
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pausedUntil = 0;
  private spacingMs: number;
  private reserve: number;

  constructor(private opts: LookupQueueOptions) {
    this.spacingMs = opts.spacingMs ?? 2000;
    this.reserve = opts.reserve ?? 5;
  }

  request(handle: string) {
    if (this.handled.has(handle.toLowerCase())) return;
    const i = this.pending.indexOf(handle);
    if (i !== -1) this.pending.splice(i, 1);
    this.pending.push(handle);
    this.schedule(0);
  }

  private schedule(delay: number) {
    if (this.running || this.timer) return;
    const wait = Math.max(delay, this.pausedUntil - this.opts.now());
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.pump();
    }, wait);
  }

  /** When lookups resume, or 0 if they are not paused. */
  waitingUntil() {
    return this.pausedUntil > this.opts.now() ? this.pausedUntil : 0;
  }

  private pause(until: number) {
    this.pausedUntil = until;
    this.opts.onPause?.(until);
  }

  private async pump() {
    let handle: string | undefined;
    while ((handle = this.pending.pop()) !== undefined && !this.opts.wanted(handle));
    if (handle === undefined) return;
    this.running = true;
    this.handled.add(handle.toLowerCase());
    try {
      const result = await this.opts.lookup(handle);
      if (result.remaining !== undefined && result.resetAt && result.remaining <= this.reserve) {
        this.pause(result.resetAt);
      }
      this.opts.onResult(handle, result);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        this.pause(err.resetAt);
        this.handled.delete(handle.toLowerCase());
        this.pending.push(handle);
      } else {
        this.handled.delete(handle.toLowerCase());
        console.warn("[X Region Blocker] lookup failed", handle, err);
      }
    } finally {
      this.running = false;
    }
    if (this.pending.length) this.schedule(this.spacingMs);
  }
}
