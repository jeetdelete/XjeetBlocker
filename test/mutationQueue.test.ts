import { afterEach, describe, expect, it, vi } from "vitest";
import { MutationQueue } from "../src/core/mutationQueue";

afterEach(() => vi.useRealTimers());

describe("account change queue", () => {
  it("serializes changes and spaces them after the preceding request completes", async () => {
    vi.useFakeTimers();
    const queue = new MutationQueue(1500);
    const started: number[] = [];
    const action = () => queue.run(async () => { started.push(Date.now()); await new Promise((r) => setTimeout(r, 200)); });
    const first = action(), second = action();
    await vi.advanceTimersByTimeAsync(200);
    expect(started).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1499);
    expect(started).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(201);
    await Promise.all([first, second]);
    expect(started[1] - started[0]).toBe(1700);
  });

  it("does not retry a failed request or strand later user actions", async () => {
    const queue = new MutationQueue(0);
    const failed = vi.fn(async () => { throw new Error("Rejected"); });
    await expect(queue.run(failed)).rejects.toThrow("Rejected");
    expect(await queue.run(async () => true)).toBe(true);
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
