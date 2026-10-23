import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createWebhookVerifier, WebhookError } from "../src/index.js";

const secret = "this-is-a-long-test-secret-at-least-32-bytes";
const body = JSON.stringify({ type: "payment.updated", id: "evt-1" });
function fixture(overrides = {}) {
  const claimed = new Set();
  const replayStore = {
    async claim({ key }) { if (claimed.has(key)) return false; claimed.add(key); return true; },
    async release({ key }) { claimed.delete(key); },
  };
  const verifier = createWebhookVerifier({ replayStore, clock: () => 1000, ...overrides });
  function headers(raw = body, timestamp = "1000", eventId = "evt-1", key = secret) {
    return { "x-aether-timestamp": timestamp, "x-aether-event-id": eventId, "x-aether-signature": createHmac("sha256", key).update(timestamp).update(".").update(raw).digest("hex") };
  }
  return { verifier, headers, claimed };
}

test("verifies exact raw body and processes a signed event", async () => {
  const { verifier, headers } = fixture();
  const result = await verifier.handle({ providerId: "billing", headers: headers(), rawBody: body, secret, processEvent: async ({ event }) => event.type });
  assert.deepEqual(result, { accepted: true, duplicate: false, result: "payment.updated" });
});

test("rejects bad signatures and stale timestamps", async () => {
  const { verifier, headers } = fixture();
  await assert.rejects(verifier.handle({ providerId: "billing", headers: { ...headers(), "x-aether-signature": "0".repeat(64) }, rawBody: body, secret, processEvent: async () => {} }), (e) => e.code === "invalid_signature");
  await assert.rejects(verifier.handle({ providerId: "billing", headers: headers(body, "1"), rawBody: body, secret, processEvent: async () => {} }), (e) => e.code === "stale_timestamp");
});

test("deduplicates repeated event IDs", async () => {
  const { verifier, headers } = fixture();
  let processed = 0;
  const input = { providerId: "billing", headers: headers(), rawBody: body, secret, processEvent: async () => ++processed };
  assert.equal((await verifier.handle(input)).duplicate, false);
  assert.equal((await verifier.handle(input)).duplicate, true);
  assert.equal(processed, 1);
});

test("releases replay claim if event processing fails", async () => {
  const { verifier, headers, claimed } = fixture();
  const input = { providerId: "billing", headers: headers(), rawBody: body, secret, processEvent: async () => { throw new Error("private failure"); } };
  await assert.rejects(verifier.handle(input), (e) => e.code === "event_processing_failed");
  assert.equal(claimed.size, 0);
});

test("rejects oversized payload, malformed JSON, and weak secrets", async () => {
  const { verifier, headers } = fixture({ maxBodyBytes: 20 });
  await assert.rejects(verifier.handle({ providerId: "billing", headers: headers(), rawBody: body, secret, processEvent: async () => {} }), (e) => e.code === "payload_too_large");
  const normal = fixture();
  const badBody = "{";
  await assert.rejects(normal.verifier.handle({ providerId: "billing", headers: normal.headers(badBody), rawBody: badBody, secret, processEvent: async () => {} }), (e) => e.code === "invalid_json");
  await assert.rejects(normal.verifier.handle({ providerId: "billing", headers: normal.headers(), rawBody: body, secret: "weak", processEvent: async () => {} }), (e) => e.code === "invalid_secret");
});
