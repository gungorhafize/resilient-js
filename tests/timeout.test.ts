import { describe, expect, it } from "vitest";
import { createResilient } from "../src/index.js";

describe("timeout", () => {
  it("should return the result when operation completes in time", async () => {
    const client = createResilient({
      timeout: 100,
    });

    const result = await client.execute(
      () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("success"), 10);
        })
    );

    expect(result).toBe("success");
  });

  it("should reject when operation exceeds timeout", async () => {
    const client = createResilient({
      timeout: 20,
    });

    await expect(
      client.execute(
        () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("success"), 100);
          })
      )
    ).rejects.toThrow("Operation timed out after 20ms");
  });

  it("should abort the operation when timeout is reached", async () => {
    const client = createResilient({
      timeout: 20,
    });

    let aborted = false;

    await expect(
      client.execute(
        (signal) =>
          new Promise<string>((resolve, reject) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              reject(new Error("Operation aborted"));
            });

            setTimeout(() => {
              resolve("success");
            }, 100);
          })
      )
    ).rejects.toThrow("Operation timed out after 20ms");

    expect(aborted).toBe(true);
  });

  it("should allow retry after a timeout", async () => {
    const client = createResilient({
      timeout: 20,
      retry: {
        retries: 2,
        delay: 1,
      },
    });

    let attempts = 0;
    let abortedAttempts = 0;

    const result = await client.execute(
      (signal) =>
        new Promise<string>((resolve, reject) => {
          attempts++;

          signal.addEventListener("abort", () => {
            abortedAttempts++;
            reject(new Error("Operation aborted"));
          });

          if (attempts === 3) {
            setTimeout(() => resolve("success"), 5);
          } else {
            setTimeout(() => resolve("too late"), 100);
          }
        })
    );

    expect(result).toBe("success");
    expect(attempts).toBe(3);
    expect(abortedAttempts).toBe(2);
  });
});