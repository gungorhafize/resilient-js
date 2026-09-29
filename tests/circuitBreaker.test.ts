import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "../src/core/CircuitBreaker.js";
import { CircuitOpenError } from "../src/index.js";

describe("CircuitBreaker", () => {
  it("should start in closed state", () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    expect(breaker.getState()).toBe("closed");
  });

  it("should open after failure threshold is reached", async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    const operation = async () => {
      throw new Error("Service unavailable");
    };

    await expect(breaker.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    expect(breaker.getState()).toBe("closed");

    await expect(breaker.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    expect(breaker.getState()).toBe("closed");

    await expect(breaker.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    expect(breaker.getState()).toBe("open");
  });

  it("should reject immediately when circuit is open", async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
    });

    const operation = vi.fn(async () => {
      throw new Error("Service unavailable");
    });

    await expect(breaker.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    await expect(breaker.execute(operation)).rejects.toBeInstanceOf(
    CircuitOpenError
    );

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("should move from open to half-open after reset timeout", async () => {
    vi.useFakeTimers();

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error("Failure");
      })
    ).rejects.toThrow("Failure");

    expect(breaker.getState()).toBe("open");

    vi.advanceTimersByTime(1000);

    expect(breaker.getState()).toBe("half-open");

    vi.useRealTimers();
  });

  it("should close after a successful half-open request", async () => {
    vi.useFakeTimers();

    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error("Failure");
      })
    ).rejects.toThrow("Failure");

    vi.advanceTimersByTime(1000);

    expect(breaker.getState()).toBe("half-open");

    const result = await breaker.execute(async () => {
      return "success";
    });

    expect(result).toBe("success");
    expect(breaker.getState()).toBe("closed");

    vi.useRealTimers();
  });

  it("should allow only one probe request in half-open state", async () => {
  vi.useFakeTimers();

  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeout: 1000,
  });

  await expect(
    breaker.execute(async () => {
      throw new Error("Initial failure");
    })
  ).rejects.toThrow("Initial failure");

  vi.advanceTimersByTime(1000);

  expect(breaker.getState()).toBe("half-open");

  let resolveProbe!: () => void;

  const probe = breaker.execute(
    () =>
      new Promise<string>((resolve) => {
        resolveProbe = () => resolve("success");
      })
  );

  await expect(
    breaker.execute(async () => "second request")
  ).rejects.toBeInstanceOf(CircuitOpenError);

  resolveProbe();

  await expect(probe).resolves.toBe("success");

  expect(breaker.getState()).toBe("closed");

  vi.useRealTimers();
});

});