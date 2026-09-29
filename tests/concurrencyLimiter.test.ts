import { describe, expect, it, vi } from "vitest";
import { ConcurrencyLimiter } from "../src/core/ConcurrencyLimiter.js";

describe("ConcurrencyLimiter", () => {
  it("should execute immediately when a slot is available", async () => {
    const limiter = new ConcurrencyLimiter({ limit: 2 });

    const result = await limiter.run(async () => "success");

    expect(result).toBe("success");
  });

  it("should not exceed the concurrency limit", async () => {
    const limiter = new ConcurrencyLimiter({ limit: 2 });

    let active = 0;
    let maxActive = 0;

    const operation = async () => {
      active++;
      maxActive = Math.max(maxActive, active);

      await new Promise((resolve) => setTimeout(resolve, 20));

      active--;

      return "done";
    };

    await Promise.all([
      limiter.run(operation),
      limiter.run(operation),
      limiter.run(operation),
      limiter.run(operation),
    ]);

    expect(maxActive).toBe(2);
  });

  it("should process queued operations in FIFO order", async () => {
    const limiter = new ConcurrencyLimiter({ limit: 1 });

    const order: number[] = [];

    const operation = (id: number) =>
      limiter.run(async () => {
        order.push(id);

        await new Promise((resolve) => setTimeout(resolve, 10));

        return id;
      });

    await Promise.all([
      operation(1),
      operation(2),
      operation(3),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("should reject when the queue limit is exceeded", async () => {
    const limiter = new ConcurrencyLimiter({
      limit: 1,
      queueLimit: 1,
    });

    let release!: () => void;

    const first = limiter.run(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve("first");
        })
    );

    const second = limiter.run(async () => "second");

    const third = limiter.run(async () => "third");

    await expect(third).rejects.toThrow();

    release();

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
  });

  it("should release the slot when an operation fails", async () => {
    const limiter = new ConcurrencyLimiter({ limit: 1 });

    const failing = limiter.run(async () => {
      throw new Error("failure");
    });

    await expect(failing).rejects.toThrow("failure");

    const result = await limiter.run(async () => "success");

    expect(result).toBe("success");
  });
});