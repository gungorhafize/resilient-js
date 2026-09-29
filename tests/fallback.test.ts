import { describe, expect, it } from "vitest";
import {
  CircuitOpenError,
  createResilient,
} from "../src/index.js";

describe("fallback", () => {
  it("should return fallback value when operation fails", async () => {
    const client = createResilient({
      retry: {
        retries: 0,
      },
      fallback: () => "fallback",
    });

    const result = await client.execute(async () => {
      throw new Error("Service unavailable");
    });

    expect(result).toBe("fallback");
  });

  it("should receive the original error", async () => {
    const originalError = new Error("Database unavailable");

    let receivedError: unknown;

    const client = createResilient({
      fallback: (error) => {
        receivedError = error;
        return "fallback";
      },
    });

    const result = await client.execute(async () => {
      throw originalError;
    });

    expect(result).toBe("fallback");
    expect(receivedError).toBe(originalError);
  });

  it("should support async fallback", async () => {
    const client = createResilient({
      fallback: async () => {
        return "async fallback";
      },
    });

    const result = await client.execute(async () => {
      throw new Error("Failure");
    });

    expect(result).toBe("async fallback");
  });

 it("should use fallback when circuit is open", async () => {
  const errors: unknown[] = [];

  const client = createResilient({
    circuitBreaker: {
      failureThreshold: 1,
      resetTimeout: 1000,
    },
    fallback: (error) => {
      errors.push(error);
      return "cached-data";
    },
  });

  await expect(
    client.execute(async () => {
      throw new Error("Service unavailable");
    })
  ).resolves.toBe("cached-data");

  expect(errors[0]).toBeInstanceOf(Error);
  expect((errors[0] as Error).message).toBe("Service unavailable");

  await expect(
    client.execute(async () => {
      throw new Error("This should not execute");
    })
  ).resolves.toBe("cached-data");

  expect(errors[1]).toBeInstanceOf(CircuitOpenError);
});

  it("should propagate fallback errors", async () => {
    const client = createResilient({
      fallback: () => {
        throw new Error("Fallback failed");
      },
    });

    await expect(
      client.execute(async () => {
        throw new Error("Original failure");
      })
    ).rejects.toThrow("Fallback failed");
  });

  it("should run fallback only after retries are exhausted", async () => {
  const client = createResilient({
    retry: {
      retries: 2,
      delay: 1,
    },
    fallback: () => "fallback",
  });

  let attempts = 0;

  const result = await client.execute(async () => {
    attempts++;
    throw new Error("Temporary failure");
  });

  expect(result).toBe("fallback");
  expect(attempts).toBe(3);
});
});