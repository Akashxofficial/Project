import { describe, it, expect, beforeEach, vi } from "vitest";
import { limiter } from "./rateLimiter";

describe("RateLimiter client class", () => {
  beforeEach(() => {
    limiter.reset();
    vi.useFakeTimers();
  });

  it("should initialize requests array as empty", () => {
    expect(limiter.getQueuedCount()).toBe(0);
  });

  it("should allow requests up to the maxRequests limit", () => {
    // Our imported limiter has a default of 10 requests per minute
    for (let i = 0; i < 10; i++) {
      expect(limiter.isAllowed()).toBe(true);
    }
    expect(limiter.getQueuedCount()).toBe(10);
  });

  it("should deny the 11th request inside the same time window", () => {
    for (let i = 0; i < 10; i++) {
      limiter.isAllowed();
    }
    // The 11th request must be denied
    expect(limiter.isAllowed()).toBe(false);
    expect(limiter.getQueuedCount()).toBe(10); // remains capped
  });

  it("should calculate correct retryAfter duration in seconds", () => {
    const startTime = Date.now();
    limiter.isAllowed(); // First request
    
    for (let i = 0; i < 9; i++) {
      limiter.isAllowed();
    }
    
    // Triggered 10 allowed requests
    expect(limiter.isAllowed()).toBe(false);

    // Fast-forward 10 seconds (10000ms)
    vi.advanceTimersByTime(10000);

    const retryAfter = limiter.getRetryAfter();
    // 60 seconds - 10 seconds elapsed = 50 seconds remaining
    expect(retryAfter).toBeLessThanOrEqual(50);
    expect(retryAfter).toBeGreaterThanOrEqual(49);
  });

  it("should allow request after time window expires", () => {
    for (let i = 0; i < 10; i++) {
      limiter.isAllowed();
    }
    expect(limiter.isAllowed()).toBe(false);

    // Fast-forward full time window (60001ms)
    vi.advanceTimersByTime(60001);

    // Should allow again
    expect(limiter.isAllowed()).toBe(true);
  });

  it("should reset request cache correctly", () => {
    for (let i = 0; i < 5; i++) {
      limiter.isAllowed();
    }
    expect(limiter.getQueuedCount()).toBe(5);

    limiter.reset();
    expect(limiter.getQueuedCount()).toBe(0);
  });
});
