import type { ConcurrencyOptions } from "../types/index.js";

interface QueueItem {
  operation: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export class ConcurrencyLimiter {
  private readonly limit: number;
  private readonly queueLimit?: number;

  private activeCount = 0;
  private readonly queue: QueueItem[] = [];

  constructor(options: ConcurrencyOptions) {
    this.limit = options.limit;
    this.queueLimit = options.queueLimit;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.limit) {
      return this.execute(operation);
    }

    if (
      this.queueLimit !== undefined &&
      this.queue.length >= this.queueLimit
    ) {
      throw new Error("Concurrency queue limit exceeded");
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        operation: async () => operation(),
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
  }

  private async execute<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    this.activeCount++;

    try {
      return await operation();
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.activeCount >= this.limit) {
      return;
    }

    const item = this.queue.shift();

    if (!item) {
      return;
    }

    this.execute(item.operation)
      .then(item.resolve)
      .catch(item.reject);
  }
}