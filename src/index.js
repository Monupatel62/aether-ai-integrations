import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class WebhookError extends Error {
  constructor(code, message = "Webhook rejected") { super(message); this.name = "WebhookError"; this.code = code; }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function toBuffer(rawBody) {
  if (typeof rawBody === "string") return Buffer.from(rawBody, "utf8");
  if (rawBody instanceof Uint8Array) return Buffer.from(rawBody);
  throw new WebhookError("invalid_body");
}
function safeEqualHex(expected, supplied) {
  if (typeof supplied !== "string" || !/^[0-9a-f]{64}$/i.test(supplied)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(supplied, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verify signed webhooks over the exact raw body before parsing JSON.
 * Secret retrieval and replay-store durability/atomicity are caller responsibilities.
 */
export function createWebhookVerifier({ replayStore, clock = () => Math.floor(Date.now() / 1000), maxBodyBytes = 1_048_576, maxClockSkewSeconds = 300, replayTtlSeconds = 86_400 }) {
  if (!replayStore || typeof replayStore.claim !== "function" || typeof replayStore.release !== "function") throw new TypeError("Replay store must provide atomic claim and release");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1 || maxBodyBytes > 10_485_760) throw new TypeError("maxBodyBytes is invalid");
  if (!Number.isSafeInteger(maxClockSkewSeconds) || maxClockSkewSeconds < 1 || maxClockSkewSeconds > 3600) throw new TypeError("maxClockSkewSeconds is invalid");
  if (!Number.isSafeInteger(replayTtlSeconds) || replayTtlSeconds < maxClockSkewSeconds || replayTtlSeconds > 604_800) throw new TypeError("replayTtlSeconds is invalid");

  return Object.freeze({
    async handle({ providerId, headers, rawBody, secret, processEvent } = {}) {
      if (typeof providerId !== "string" || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(providerId)) throw new WebhookError("invalid_provider");
      if (typeof processEvent !== "function") throw new TypeError("processEvent callback is required");
      if (typeof secret !== "string" || Buffer.byteLength(secret) < 32) throw new WebhookError("invalid_secret");
      const body = toBuffer(rawBody);
      if (body.byteLength > maxBodyBytes) throw new WebhookError("payload_too_large");
      const timestampText = headers?.["x-aether-timestamp"];
      const signature = headers?.["x-aether-signature"];
      const eventId = headers?.["x-aether-event-id"];
      if (typeof timestampText !== "string" || !/^\d{1,12}$/.test(timestampText)) throw new WebhookError("invalid_timestamp");
      if (typeof eventId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(eventId)) throw new WebhookError("invalid_event_id");
      const timestamp = Number(timestampText);
      if (!Number.isSafeInteger(timestamp) || Math.abs(clock() - timestamp) > maxClockSkewSeconds) throw new WebhookError("stale_timestamp");

      const expected = createHmac("sha256", secret).update(timestampText).update(".").update(body).digest("hex");
      if (!safeEqualHex(expected, signature)) throw new WebhookError("invalid_signature");
      let event;
      try { event = JSON.parse(body.toString("utf8")); } catch { throw new WebhookError("invalid_json"); }
      if (!isRecord(event)) throw new WebhookError("invalid_event");

      const replayKey = `${providerId}:${eventId}`;
      let claimed;
      try { claimed = await replayStore.claim({ key: replayKey, ttlSeconds: replayTtlSeconds }); }
      catch { throw new WebhookError("replay_store_unavailable"); }
      if (claimed !== true) return Object.freeze({ accepted: true, duplicate: true });

      try {
        const result = await processEvent({ providerId, eventId, event, bodySha256: createHash("sha256").update(body).digest("hex") });
        return Object.freeze({ accepted: true, duplicate: false, result });
      } catch {
        try { await replayStore.release({ key: replayKey }); } catch { /* alerting/reconciliation required */ }
        throw new WebhookError("event_processing_failed");
      }
    },
  });
}
