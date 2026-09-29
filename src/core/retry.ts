import type {
  ResilienceEvent,
  RetryOptions,
} from "../types/index.js";

const DEFAULT_RETRIES = 0;
const DEFAULT_DELAY = 100;
const DEFAULT_BACKOFF = "fixed";

export async function executeWithRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {},
  onEvent?: (event: ResilienceEvent) => void
): Promise<T> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const delay = options.delay ?? DEFAULT_DELAY;
  const backoff = options.backoff ?? DEFAULT_BACKOFF;

  let attempt = 0;
  const startTime = Date.now();

  while (true) {
    const controller = new AbortController();

    try {
      return await operation(controller.signal);
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      const retryAttempt = attempt + 1;

      const shouldRetry = options.shouldRetry
        ? options.shouldRetry({
            attempt: retryAttempt,
            retries,
            elapsedTime: Date.now() - startTime,
            error,
          })
        : true;

      if (!shouldRetry) {
        throw error;
      }

      attempt++;

      const waitTime = calculateDelay(
        delay,
        attempt,
        backoff,
        options.jitter ?? false
      );

      onEvent?.({
        type: "retry",
        attempt,
        retries,
        delay: waitTime,
        error,
        timestamp: Date.now(),
        });

      await sleep(waitTime);
    }
  }
}

export function calculateDelay(
  delay: number,
  attempt: number,
  backoff: "fixed" | "exponential",
  jitter: boolean
): number {
  const baseDelay =
    backoff === "exponential"
      ? delay * 2 ** (attempt - 1)
      : delay;

  if (!jitter) {
    return baseDelay;
  }

  return Math.floor(Math.random() * baseDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}