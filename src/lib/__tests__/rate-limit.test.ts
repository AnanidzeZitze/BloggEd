import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("returns { limited: false } when limiter is null (no Redis configured)", async () => {
    const result = await checkRateLimit(null, "user-123");
    expect(result).toEqual({ limited: false });
  });

  it("returns { limited: false } when limiter is null regardless of env vars", async () => {
    const result = await checkRateLimit(null, "user-456");
    expect(result.limited).toBe(false);
  });
});
