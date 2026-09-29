import { describe, expect, it } from "vitest";
import { ConfigurationError, createResilient } from "../src/index.js";

describe("configuration", () => {
  it("should reject a negative timeout", () => {
    expect(() =>
      createResilient({
        timeout: -100,
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject a zero timeout", () => {
    expect(() =>
      createResilient({
        timeout: 0,
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject a non-finite timeout", () => {
    expect(() =>
      createResilient({
        timeout: Infinity,
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject negative retries", () => {
    expect(() =>
      createResilient({
        retry: {
          retries: -1,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject fractional retries", () => {
    expect(() =>
      createResilient({
        retry: {
          retries: 1.5,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject negative delay", () => {
    expect(() =>
      createResilient({
        retry: {
          delay: -10,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject non-finite delay", () => {
    expect(() =>
      createResilient({
        retry: {
          delay: Infinity,
        },
      })
    ).toThrow(ConfigurationError);
  });

    it("should reject a zero concurrency limit", () => {
    expect(() =>
      createResilient({
        concurrency: {
          limit: 0,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject a negative concurrency limit", () => {
    expect(() =>
      createResilient({
        concurrency: {
          limit: -1,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject a fractional concurrency limit", () => {
    expect(() =>
      createResilient({
        concurrency: {
          limit: 1.5,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should reject a negative queue limit", () => {
    expect(() =>
      createResilient({
        concurrency: {
          limit: 2,
          queueLimit: -1,
        },
      })
    ).toThrow(ConfigurationError);
  });

  it("should accept zero queue limit", () => {
    expect(() =>
      createResilient({
        concurrency: {
          limit: 2,
          queueLimit: 0,
        },
      })
    ).not.toThrow();
  });


  it("should accept a valid configuration", () => {
    expect(() =>
      createResilient({
        timeout: 5000,
        retry: {
          retries: 3,
          delay: 100,
          backoff: "exponential",
          jitter: true,
        },
      })
    ).not.toThrow();
  });
});