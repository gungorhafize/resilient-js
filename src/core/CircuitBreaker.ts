import type {
  CircuitBreakerOptions,
  CircuitBreakerState,
  ResilienceEvent,
} from "../types/index.js";

import { CircuitOpenError } from "../errors/CircuitOpenError.js";

export class CircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failureCount = 0;
  private openedAt: number | undefined;
  private halfOpenInProgress = false;
constructor(
  private readonly options: CircuitBreakerOptions,
  private readonly onEvent?: (event: ResilienceEvent) => void
) {}

  getState(): CircuitBreakerState {
   if (
  this.state === "open" &&
  this.openedAt !== undefined &&
  Date.now() - this.openedAt >= this.options.resetTimeout
) {
  this.state = "half-open";

  this.onEvent?.({
    type: "circuit-half-open",
    timestamp: Date.now(),
  });
}

    return this.state;
  }

 async execute<T>(operation: () => Promise<T>): Promise<T> {
  const state = this.getState();

  if (state === "open") {
    throw new CircuitOpenError();
  }

  if (state === "half-open") {
    if (this.halfOpenInProgress) {
      throw new CircuitOpenError();
    }

    this.halfOpenInProgress = true;
  }

  try {
    const result = await operation();

    this.onSuccess();

    return result;
  } catch (error) {
    this.onFailure();

    throw error;
  } finally {
    if (state === "half-open") {
      this.halfOpenInProgress = false;
    }
  }
}

  private onSuccess(): void {
  const wasOpen =
    this.state === "open" ||
    this.state === "half-open";

  this.failureCount = 0;
  this.state = "closed";
  this.openedAt = undefined;
  this.halfOpenInProgress = false;

  if (wasOpen) {
    this.onEvent?.({
      type: "circuit-closed",
      timestamp: Date.now(),
    });
  }
}

  private onFailure(): void {
  this.failureCount++;

  if (this.failureCount >= this.options.failureThreshold) {
    this.state = "open";
    this.openedAt = Date.now();

    this.onEvent?.({
      type: "circuit-open",
      failureCount: this.failureCount,
      timestamp: Date.now(),
    });
  }
}
}