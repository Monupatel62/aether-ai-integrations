import { describe, expect, it } from "vitest";
import { verifyWebhookHmacSha256 } from "../src/index.js";

async function signatureFor(body: Uint8Array, timestamp: number, secret: Uint8Array): Promise<string> {
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

describe("generic webhook HMAC verifier", () => {
  it("accepts a valid signature over timestamp and raw body", async () => {
    const body = new TextEncoder().encode('{"event":"synthetic"}');
    const secret = new TextEncoder().encode("0123456789abcdef0123456789abcdef");
    const signature = await signatureFor(body, 1000, secret);
    await expect(verifyWebhookHmacSha256(body, 1000, signature, secret, { nowSeconds: 1001 })).resolves.toBe(true);
  });

  it("rejects body tampering, stale timestamps, and malformed signatures", async () => {
    const body = new TextEncoder().encode("original");
    const changed = new TextEncoder().encode("tampered");
    const secret = new TextEncoder().encode("0123456789abcdef0123456789abcdef");
    const signature = await signatureFor(body, 1000, secret);
    await expect(verifyWebhookHmacSha256(changed, 1000, signature, secret, { nowSeconds: 1000 })).resolves.toBe(false);
    await expect(verifyWebhookHmacSha256(body, 1000, signature, secret, { nowSeconds: 2000 })).resolves.toBe(false);
    await expect(verifyWebhookHmacSha256(body, 1000, "invalid", secret, { nowSeconds: 1000 })).resolves.toBe(false);
  });

  it("rejects weak secrets and oversized bodies", async () => {
    const body = new Uint8Array([1, 2, 3]);
    await expect(verifyWebhookHmacSha256(body, 1000, "a".repeat(64), new Uint8Array(8), { nowSeconds: 1000 })).resolves.toBe(false);
    await expect(verifyWebhookHmacSha256(new Uint8Array(5 * 1024 * 1024 + 1), 1000, "a".repeat(64), new Uint8Array(32), { nowSeconds: 1000 })).resolves.toBe(false);
  });
});
