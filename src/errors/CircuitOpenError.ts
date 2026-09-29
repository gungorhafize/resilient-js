export class CircuitOpenError extends Error {
  constructor() {
    super("Circuit breaker is open");

    this.name = "CircuitOpenError";

    Object.setPrototypeOf(this, CircuitOpenError.prototype);
  }
}