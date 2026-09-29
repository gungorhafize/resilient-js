export type BackoffStrategy = "fixed" | "exponential";

export type CircuitBreakerState =
  | "closed"
  | "open"
  | "half-open";

export interface RetryContext {
  attempt: number;
  retries: number;
  elapsedTime: number;
  error: unknown;
}

export interface RetryOptions {
  retries?: number;
  backoff?: BackoffStrategy;
  delay?: number;
  jitter?: boolean;
  shouldRetry?: (context: RetryContext) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
}

export type ResilienceEvent =
  | {
      type: "retry";
      attempt: number;
      retries: number;
      delay: number;
      error: unknown;
      timestamp: number;
    }
  | {
      type: "timeout";
      timeout: number;
      timestamp: number;
    }
  | {
      type: "circuit-open";
      failureCount: number;
      timestamp: number;
    }
  | {
      type: "circuit-half-open";
      timestamp: number;
    }
  | {
      type: "circuit-closed";
      timestamp: number;
    }
  | {
      type: "fallback";
      error: unknown;
      timestamp: number;
    };

export interface ResilientOptions {
  timeout?: number;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
  fallback?: (error: unknown) => unknown | Promise<unknown>;
  onEvent?: (event: ResilienceEvent) => void;
}

export interface ResilientClient {
  execute<T>(
    operation: (signal: AbortSignal) => Promise<T>
  ): Promise<T>;
}