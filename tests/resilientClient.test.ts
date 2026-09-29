import { describe, expect, it } from "vitest";
import { CircuitOpenError, createResilient } from "../src/index.js";

describe("ResilientClient integration", () => {
  it("should count one execute call as one circuit failure", async () => {
    const client = createResilient({
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeout: 1000,
      },
      retry: {
        retries: 2,
        delay: 1,
      },
    });

    let attempts = 0;

    const operation = async () => {
      attempts++;
      throw new Error("Service unavailable");
    };

    await expect(client.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    expect(attempts).toBe(3);

    await expect(client.execute(operation)).rejects.toThrow(
      "Service unavailable"
    );

    expect(attempts).toBe(6);

    await expect(client.execute(operation)).rejects.toThrow(
      "Circuit breaker is open"
    );

    expect(attempts).toBe(6);
  });

  it("should recover after circuit reset", async () => {
    const client = createResilient({
      circuitBreaker: {
        failureThreshold: 1,
        resetTimeout: 20,
      },
      retry: {
        retries: 0,
      },
    });

    let shouldFail = true;

    const operation = async () => {
      if (shouldFail) {
        throw new Error("Temporary failure");
      }

      return "success";
    };

    await expect(client.execute(operation)).rejects.toThrow(
      "Temporary failure"
    );

    await expect(client.execute(operation)).rejects.toBeInstanceOf(
    CircuitOpenError
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });

    shouldFail = false;

    await expect(client.execute(operation)).resolves.toBe(
      "success"
    );
  });
});