import type {
  ResilienceEvent,
  ResilientClient as ResilientClientInterface,
  ResilientOptions,
} from "../types/index.js";

import { CircuitBreaker } from "./CircuitBreaker.js";
import { TimeoutError } from "../errors/TimeoutError.js";
import { executeWithRetry } from "./retry.js";
import { validateOptions } from "./validateOptions.js";

class ResilientClient implements ResilientClientInterface {
  private readonly circuitBreaker?: CircuitBreaker;

  constructor(private readonly options: ResilientOptions = {}) {
    validateOptions(options);

    if (options.circuitBreaker) {
  this.circuitBreaker = new CircuitBreaker(
    options.circuitBreaker,
    this.emitEvent.bind(this)
  );
}
  }
  private emitEvent(event: ResilienceEvent): void {
    this.options.onEvent?.(event);
  }
  async execute<T>(
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  try {
    const executeOperation = () =>
    executeWithRetry(
        (signal) => this.executeWithTimeout(operation, signal),
        this.options.retry,
        this.emitEvent.bind(this)
    );

    if (this.circuitBreaker) {
      return await this.circuitBreaker.execute(
        executeOperation
      );
    }

    return await executeOperation();
  } catch (error) {
    if (this.options.fallback) {
  this.emitEvent({
    type: "fallback",
    error,
    timestamp: Date.now(),
  });

  return (await this.options.fallback(error)) as T;
}

    throw error;
  }
}

  private async executeWithTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    parentSignal: AbortSignal
  ): Promise<T> {
    if (this.options.timeout === undefined) {
      return operation(parentSignal);
    }

    const timeout = this.options.timeout;
    const controller = new AbortController();

    const abortOperation = () => {
      controller.abort(parentSignal.reason);
    };

    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", abortOperation, {
        once: true,
      });
    }

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timer);
        parentSignal.removeEventListener(
          "abort",
          abortOperation
        );
      };

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;

        
        const error = new TimeoutError(timeout);

        this.emitEvent({
        type: "timeout",
        timeout,
        timestamp: Date.now(),
        });

        controller.abort(error);
        cleanup();

        reject(error);
      }, timeout);

      operation(controller.signal)
        .then((result) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          resolve(result);
        })
        .catch((error) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          reject(error);
        });
    });
  }
}

export function createResilient(
  options: ResilientOptions = {}
): ResilientClientInterface {
  return new ResilientClient(options);
}