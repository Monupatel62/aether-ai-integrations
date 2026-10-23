export interface WebhookVerificationOptions {
  /** Current Unix time in seconds; injectable for deterministic tests. */
  readonly nowSeconds?: number;
  /** Maximum permitted clock skew in seconds. Defaults to 300. */
  readonly toleranceSeconds?: number;
}

/**
 * Verify a generic HMAC-SHA256 webhook signature over: ASCII(timestamp + ".") + raw body.
 * Provider-specific signature formats may differ; use this only after a connector ADR confirms
 * the exact signed bytes/header grammar. This does not prevent replay without a durable event store.
 */
export async function verifyWebhookHmacSha256(
  rawBody: Uint8Array,
  timestampSeconds: number,
  signatureHex: string,
  secret: Uint8Array,
  options: WebhookVerificationOptions = {}
): Promise<boolean> {
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const toleranceSeconds = options.toleranceSeconds ?? 300;
  if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds < 0 ||
      !Number.isSafeInteger(nowSeconds) || nowSeconds < 0 ||
      !Number.isInteger(toleranceSeconds) || toleranceSeconds < 1 || toleranceSeconds > 3600) {
    return false;
  }
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;
  if (!(rawBody instanceof Uint8Array) || rawBody.byteLength > 5 * 1024 * 1024) return false;
  if (!(secret instanceof Uint8Array) || secret.byteLength < 32 || secret.byteLength > 4096) return false;
  if (!/^[a-f0-9]{64}$/i.test(signatureHex)) return false;

  const prefix = new TextEncoder().encode(`${timestampSeconds}.`);
  const signed = new Uint8Array(prefix.byteLength + rawBody.byteLength);
  signed.set(prefix, 0);
  signed.set(rawBody, prefix.byteLength);

  try {
    const secretCopy = Uint8Array.from(secret);
    const signedCopy = Uint8Array.from(signed);
    const key = await crypto.subtle.importKey("raw", secretCopy.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedCopy.buffer as ArrayBuffer));
    const supplied = hexToBytes(signatureHex);
    return constantTimeEqual(digest, supplied);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let i = 0; i < left.byteLength; i++) difference |= left[i]! ^ right[i]!;
  return difference === 0;
}
