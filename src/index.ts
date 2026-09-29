export { createResilient } from "./core/ResilientClient.js";
export { CircuitBreaker } from "./core/CircuitBreaker.js";

export { TimeoutError } from "./errors/TimeoutError.js";
export { ConfigurationError } from "./errors/ConfigurationError.js";
export { CircuitOpenError } from "./errors/CircuitOpenError.js";

export type {
  BackoffStrategy,
  CircuitBreakerOptions,
  CircuitBreakerState,
  RetryContext,
  RetryOptions,
  ResilienceEvent,
  ResilientOptions,
  ResilientClient,
} from "./types/index.js";