import { describe, expect, it, vi } from "vitest";
import { calculateDelay } from "../src/core/retry.js";

describe("backoff", () => {
  it("should use fixed delay", () => {
    expect(calculateDelay(100, 1, "fixed", false)).toBe(100);
    expect(calculateDelay(100, 2, "fixed", false)).toBe(100);
    expect(calculateDelay(100, 3, "fixed", false)).toBe(100);
  });

  it("should use exponential backoff", () => {
    expect(calculateDelay(100, 1, "exponential", false)).toBe(100);
    expect(calculateDelay(100, 2, "exponential", false)).toBe(200);
    expect(calculateDelay(100, 3, "exponential", false)).toBe(400);
    expect(calculateDelay(100, 4, "exponential", false)).toBe(800);
  });

  it("should apply full jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(calculateDelay(100, 1, "fixed", true)).toBe(50);
    expect(calculateDelay(100, 2, "exponential", true)).toBe(100);

    vi.restoreAllMocks();
  });

  it("should keep jitter within the base delay", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const result = calculateDelay(100, 3, "exponential", true);

    expect(result).toBe(396);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(400);

    vi.restoreAllMocks();
  });
});