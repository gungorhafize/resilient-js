import { describe, expect, it } from "vitest";
import { createResilient } from "../src/index.js";

describe("retry", () => {
  it("should retry a failed operation", async () => {
    const client = createResilient({
      retry: {
        retries: 2,
        delay: 1,
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
    expect(attempts).toBe(3);
  });

  it("should throw after retries are exhausted", async () => {
    const client = createResilient({
      retry: {
        retries: 2,
        delay: 1,
      },
    });

    let attempts = 0;

    await expect(
      client.execute(async () => {
        attempts++;
        throw new Error("Permanent failure");
      })
    ).rejects.toThrow("Permanent failure");

    expect(attempts).toBe(3);
  });

  it("should not retry when retries is zero", async () => {
    const client = createResilient({
      retry: {
        retries: 0,
      },
    });

    let attempts = 0;

    await expect(
      client.execute(async () => {
        attempts++;
        throw new Error("Failure");
      })
    ).rejects.toThrow("Failure");

    expect(attempts).toBe(1);
  });

  it("should respect shouldRetry", async () => {
  const client = createResilient({
    retry: {
      retries: 3,
      delay: 1,

    shouldRetry: ({ attempt, error, elapsedTime }) => {
    expect(attempt).toBe(1);
    expect(error).toBeInstanceOf(Error);
    expect(elapsedTime).toBeGreaterThanOrEqual(0);

    return false;
    },
    },
  });

  let attempts = 0;

  await expect(
    client.execute(async () => {
      attempts++;
      throw new Error("Do not retry");
    })
  ).rejects.toThrow("Do not retry");

  expect(attempts).toBe(1);
});

it("should retry when timeout occurs", async () => {
  const client = createResilient({
    timeout: 10,
    retry: {
      retries: 2,
      delay: 1,
    },
  });

  let attempts = 0;

  const result = await client.execute(
    (signal) =>
      new Promise<string>((resolve, reject) => {
        attempts++;

        signal.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });

        if (attempts < 3) {
          setTimeout(() => resolve("late"), 50);
          return;
        }

        setTimeout(() => resolve("success"), 1);
      })
  );

  expect(result).toBe("success");
  expect(attempts).toBe(3);
});
});