export class TimeoutError extends Error {
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Operation timed out after ${timeout}ms`);

    this.name = "TimeoutError";
    this.timeout = timeout;

    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}