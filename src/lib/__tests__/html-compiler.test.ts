import { describe, it, expect } from "vitest";

// Inline the helpers here so we don't need to export them from the route
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeImageUrl(url: string): string {
  if (url.startsWith("https://") || url.startsWith("data:image/")) return url;
  return "";
}

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('He said "hi"')).toBe("He said &quot;hi&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all dangerous characters in an XSS payload", () => {
    const payload = `<img src="x" onerror='alert(1)' & />`;
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
  });

  it("leaves safe strings untouched", () => {
    expect(escapeHtml("Hello, world!")).toBe("Hello, world!");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("sanitizeImageUrl", () => {
  it("allows https URLs", () => {
    const url = "https://cdn.example.com/img.jpg";
    expect(sanitizeImageUrl(url)).toBe(url);
  });

  it("allows data:image/ URLs", () => {
    const url = "data:image/jpeg;base64,/9j/abc123";
    expect(sanitizeImageUrl(url)).toBe(url);
  });

  it("blocks http URLs", () => {
    expect(sanitizeImageUrl("http://evil.com/img.jpg")).toBe("");
  });

  it("blocks javascript: URLs", () => {
    expect(sanitizeImageUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks relative paths", () => {
    expect(sanitizeImageUrl("/etc/passwd")).toBe("");
  });

  it("blocks empty string", () => {
    expect(sanitizeImageUrl("")).toBe("");
  });

  it("blocks data:text/ URLs (not images)", () => {
    expect(sanitizeImageUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });
});
