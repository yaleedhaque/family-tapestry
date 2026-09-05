import { describe, expect, it } from "vitest";
import { safePath } from "../safe-path";

describe("safePath", () => {
  it("keeps a plain same-origin path", () => {
    expect(safePath("/timeline")).toBe("/timeline");
    expect(safePath("/person/abc123")).toBe("/person/abc123");
    expect(safePath("/")).toBe("/");
  });

  it("blocks protocol-relative URLs", () => {
    expect(safePath("//evil.com")).toBe("/");
    expect(safePath("//evil.com/steal")).toBe("/");
  });

  it("blocks absolute and backslash variants", () => {
    expect(safePath("https://evil.com")).toBe("/");
    expect(safePath("https://evil.com/steal")).toBe("/");
    expect(safePath("/\\evil.com")).toBe("/");
  });

  it("falls back for null / undefined / empty with a custom fallback", () => {
    expect(safePath(null)).toBe("/");
    expect(safePath(undefined)).toBe("/");
    expect(safePath("")).toBe("/");
    expect(safePath(null, "/timeline")).toBe("/timeline");
  });
});