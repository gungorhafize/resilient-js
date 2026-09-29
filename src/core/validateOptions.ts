import type { ResilientOptions } from "../types/index.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export function validateOptions(options: ResilientOptions): void {
 if (
    options.fallback !== undefined &&
    typeof options.fallback !== "function"
  ) {
    throw new ConfigurationError(
      "fallback must be a function"
    );
  }
  if (options.timeout !== undefined) {
    if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
      throw new ConfigurationError(
        "timeout must be a positive finite number"
      );
    }
  }

  if (options.retry !== undefined) {
    const { retries, delay } = options.retry;

    if (retries !== undefined) {
      if (!Number.isInteger(retries) || retries < 0) {
        throw new ConfigurationError(
          "retry.retries must be a non-negative integer"
        );
      }
    }

    if (delay !== undefined) {
      if (!Number.isFinite(delay) || delay < 0) {
        throw new ConfigurationError(
          "retry.delay must be a non-negative finite number"
        );
      }
    }
  }

  if (options.circuitBreaker !== undefined) {
    const { failureThreshold, resetTimeout } =
      options.circuitBreaker;

    if (
      !Number.isInteger(failureThreshold) ||
      failureThreshold <= 0
    ) {
      throw new ConfigurationError(
        "circuitBreaker.failureThreshold must be a positive integer"
      );
    }

    if (
      !Number.isFinite(resetTimeout) ||
      resetTimeout <= 0
    ) {
      throw new ConfigurationError(
        "circuitBreaker.resetTimeout must be a positive finite number"
      );
    }
  }

    if (options.concurrency !== undefined) {
    const { limit, queueLimit } = options.concurrency;

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new ConfigurationError(
        "concurrency.limit must be a positive integer"
      );
    }

    if (
      queueLimit !== undefined &&
      (!Number.isInteger(queueLimit) || queueLimit < 0)
    ) {
      throw new ConfigurationError(
        "concurrency.queueLimit must be a non-negative integer"
      );
    }
  }
}