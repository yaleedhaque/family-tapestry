import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test1", 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows up to max", () => {
    const result1 = checkRateLimit("test2", 3, 60000);
    expect(result1.allowed).toBe(true);

    const result2 = checkRateLimit("test2", 3, 60000);
    expect(result2.allowed).toBe(true);

    const result3 = checkRateLimit("test2", 3, 60000);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("blocks over limit", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("test3", 3, 60000);

    const result = checkRateLimit("test3", 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("test4a", 3, 60000);

    const other = checkRateLimit("test4b", 3, 60000);
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(2);
  });
});
