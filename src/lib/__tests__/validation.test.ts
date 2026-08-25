import { describe, it, expect } from "vitest";
import { sanitize, sanitizeField, validateEmail, validateUrl, validateYear } from "../validation";

describe("sanitize", () => {
  it("strips HTML tags", () => {
    expect(sanitize("<script>alert('xss')</script>hello")).toBe("hello");
  });

  it("strips event handlers", () => {
    expect(sanitize('<img src=x onerror="alert(1)">')).toBe("");
  });

  it("allows plain text", () => {
    expect(sanitize("John Smith")).toBe("John Smith");
  });

  it("trims whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});

describe("sanitizeField", () => {
  it("truncates to field-specific max length", () => {
    const long = "a".repeat(500);
    expect(sanitizeField("fullName", long).length).toBe(200);
  });

  it("allows normal-length input", () => {
    expect(sanitizeField("bio", "A short bio")).toBe("A short bio");
  });

  it("strips HTML from fields", () => {
    expect(sanitizeField("bio", "<b>bold</b> text")).toBe("bold text");
  });

  it("handles unknown fields with default 1000 limit", () => {
    const long = "a".repeat(2000);
    expect(sanitizeField("customField", long).length).toBe(1000);
  });
});

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(validateEmail("testexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(validateEmail("test@")).toBe(false);
  });

  it("accepts empty (optional field)", () => {
    expect(validateEmail("")).toBe(true);
  });
});

describe("validateUrl", () => {
  it("accepts valid URL", () => {
    expect(validateUrl("https://example.com")).toBe(true);
  });

  it("accepts empty string (optional)", () => {
    expect(validateUrl("")).toBe(true);
  });

  it("rejects invalid URL", () => {
    expect(validateUrl("not a url")).toBe(false);
  });
});

describe("validateYear", () => {
  it("accepts valid year", () => {
    expect(validateYear(1990)).toBe(true);
  });

  it("accepts empty/null (optional)", () => {
    expect(validateYear(null)).toBe(true);
    expect(validateYear(undefined)).toBe(true);
    expect(validateYear("")).toBe(true);
  });

  it("rejects 0", () => {
    expect(validateYear(0)).toBe(false);
  });

  it("rejects negative", () => {
    expect(validateYear(-5)).toBe(false);
  });

  it("rejects non-integer", () => {
    expect(validateYear(1990.5)).toBe(false);
  });
});
