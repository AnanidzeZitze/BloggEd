import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, safeDecrypt } from "../encrypt";

const TEST_KEY = "a".repeat(64); // 64-char hex = valid 32-byte key

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("encrypt / decrypt", () => {
  it("round-trips a simple string", () => {
    const plaintext = "hello world";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("round-trips a long API key", () => {
    const key = "AIzaSy" + "x".repeat(33);
    expect(decrypt(encrypt(key))).toBe(key);
  });

  it("round-trips unicode content", () => {
    const text = "日本語テスト 🔑";
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it("produces different ciphertext on each call (random IV)", () => {
    const c1 = encrypt("same");
    const c2 = encrypt("same");
    expect(c1).not.toBe(c2);
  });

  it("ciphertext has three colon-separated parts", () => {
    const parts = encrypt("test").split(":");
    expect(parts).toHaveLength(3);
  });

  it("throws on tampered ciphertext (authentication tag mismatch)", () => {
    const [iv, tag, enc] = encrypt("secret").split(":");
    const tampered = `${iv}:${tag}:${Buffer.from("corrupted").toString("base64")}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY");
    process.env.ENCRYPTION_KEY = saved;
  });

  it("throws when ENCRYPTION_KEY is wrong length", () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY");
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });
});

describe("safeDecrypt", () => {
  it("returns null for null input", () => {
    expect(safeDecrypt(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(safeDecrypt(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(safeDecrypt("")).toBeNull();
  });

  it("decrypts a properly encrypted value", () => {
    const plain = "my-api-key";
    expect(safeDecrypt(encrypt(plain))).toBe(plain);
  });

  it("passes through a plain string without colons (legacy unencrypted value)", () => {
    expect(safeDecrypt("plaintextvalue")).toBe("plaintextvalue");
  });

  it("returns as-is when decryption fails on a colon-containing string", () => {
    const broken = "abc:def:ghi";
    expect(safeDecrypt(broken)).toBe(broken);
  });
});
