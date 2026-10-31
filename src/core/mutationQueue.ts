/** Serializes account changes in this tab and spaces requests without retrying failures. */
export class MutationQueue {
  private pending: Promise<unknown> = Promise.resolve();
  private nextAt = 0;

  constructor(private spacingMs = 1500) {}

  run<T>(action: () => Promise<T>): Promise<T> {
    const result = this.pending.then(async () => {
      const delay = this.nextAt - Date.now();
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      try { return await action(); }
      finally { this.nextAt = Date.now() + this.spacingMs; }
    });
    this.pending = result.catch(() => {});
    return result;
  }
}
