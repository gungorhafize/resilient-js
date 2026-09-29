import { describe, expect, it, vi } from "vitest";
import { createResilient } from "../src/index.js";

describe("events", () => {
  it("should emit retry events", async () => {
    const events: Array<{ type: string }> = [];

    const client = createResilient({
      retry: {
        retries: 2,
        delay: 1,
      },
      onEvent: (event) => {
        events.push(event);
      },
    });

    let attempts = 0;

    const result = await client.execute(async () => {
      attempts++;

      if (attempts < 3) {
        throw new Error("Temporary failure");
      }

      return "success";
    });

    expect(result).toBe("success");

    expect(
      events.filter((event) => event.type === "retry")
    ).toHaveLength(2);
  });

  it("should emit timeout events", async () => {
    const events: Array<{ type: string }> = [];

    const client = createResilient({
      timeout: 10,
      onEvent: (event) => {
        events.push(event);
      },
    });

    await expect(
      client.execute(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("late"), 50);
          })
      )
    ).rejects.toThrow("Operation timed out after 10ms");

    expect(
      events.filter((event) => event.type === "timeout")
    ).toHaveLength(1);
  });

  it("should emit fallback events", async () => {
    const events: Array<{ type: string }> = [];

    const client = createResilient({
      fallback: () => "fallback",
      onEvent: (event) => {
        events.push(event);
      },
    });

    await expect(
      client.execute(async () => {
        throw new Error("Service unavailable");
      })
    ).resolves.toBe("fallback");

    expect(
      events.filter((event) => event.type === "fallback")
    ).toHaveLength(1);
  });

  it("should emit circuit lifecycle events", async () => {
  vi.useFakeTimers();

  const events: Array<{ type: string }> = [];

  const client = createResilient({
    circuitBreaker: {
      failureThreshold: 1,
      resetTimeout: 1000,
    },
    onEvent: (event) => {
      events.push(event);
    },
  });

  await expect(
    client.execute(async () => {
      throw new Error("Failure");
    })
  ).rejects.toThrow("Failure");

  expect(
    events.some((event) => event.type === "circuit-open")
  ).toBe(true);

  vi.advanceTimersByTime(1000);

  // Circuit'ın half-open durumuna geçmesini tetikler.
  await expect(
    client.execute(async () => "success")
  ).resolves.toBe("success");

  expect(
    events.some(
      (event) => event.type === "circuit-half-open"
    )
  ).toBe(true);

  expect(
    events.some(
      (event) => event.type === "circuit-closed"
    )
  ).toBe(true);

  vi.useRealTimers();
});
});