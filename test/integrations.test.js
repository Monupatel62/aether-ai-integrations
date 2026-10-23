import test from "node:test";
import assert from "node:assert/strict";
import { createIntegrationRegistry, IntegrationError } from "../src/index.js";

const principal = { id: "user-1", tenantId: "tenant-a" };
const definition = { id: "calendar.read", requiredScopes: ["calendar.read"], validateInput: (v) => v && typeof v.calendarId === "string", validateOutput: (v) => v && Array.isArray(v.events), invoke: async () => ({ events: [] }) };
function fixture(overrides = {}) {
  const registry = createIntegrationRegistry({
    authorize: async () => true,
    resolveCredentials: async () => ({ tenantId: "tenant-a", scopes: ["calendar.read"], accessToken: "secret" }),
    timeoutMs: 100,
    ...overrides,
  });
  registry.register(definition);
  return registry;
}

test("invokes a registered integration with a scoped connection", async () => {
  const registry = fixture();
  const result = await registry.invoke({ principal, integrationId: "calendar.read", connectionId: "connection-1", input: { calendarId: "primary" } });
  assert.deepEqual(result.output, { events: [] });
  assert.equal("credentials" in result, false);
});

test("fails closed on authorization and credential scope mismatch", async () => {
  await assert.rejects(fixture({ authorize: async () => false }).invoke({ principal, integrationId: "calendar.read", connectionId: "connection-1", input: { calendarId: "primary" } }), (e) => e.code === "forbidden");
  await assert.rejects(fixture({ resolveCredentials: async () => ({ tenantId: "tenant-a", scopes: [] }) }).invoke({ principal, integrationId: "calendar.read", connectionId: "connection-1", input: { calendarId: "primary" } }), (e) => e.code === "insufficient_connection_scopes");
  await assert.rejects(fixture({ resolveCredentials: async () => ({ tenantId: "tenant-b", scopes: ["calendar.read"] }) }).invoke({ principal, integrationId: "calendar.read", connectionId: "connection-1", input: { calendarId: "primary" } }), IntegrationError);
});

test("rejects invalid input, unknown integration, and missing principal", async () => {
  const registry = fixture();
  await assert.rejects(registry.invoke({ integrationId: "calendar.read", connectionId: "c", input: {} }), (e) => e.code === "unauthenticated");
  await assert.rejects(registry.invoke({ principal, integrationId: "unknown", connectionId: "c", input: {} }), (e) => e.code === "integration_not_found");
  await assert.rejects(registry.invoke({ principal, integrationId: "calendar.read", connectionId: "c", input: {} }), (e) => e.code === "invalid_input");
});

test("normalizes integration exceptions and enforces timeout", async () => {
  const broken = fixture();
  broken.register({ ...definition, id: "broken", invoke: async () => { throw new Error("secret provider data"); } });
  await assert.rejects(broken.invoke({ principal, integrationId: "broken", connectionId: "c", input: { calendarId: "primary" } }), (e) => e.code === "invocation_failed" && !e.message.includes("secret"));
  const slow = fixture({ timeoutMs: 10 });
  slow.register({ ...definition, id: "slow", invoke: () => new Promise(() => {}) });
  await assert.rejects(slow.invoke({ principal, integrationId: "slow", connectionId: "c", input: { calendarId: "primary" } }), (e) => e.code === "timeout");
});

test("lists only integration metadata, never credentials", async () => {
  const registry = fixture();
  assert.deepEqual(registry.list(), [{ id: "calendar.read", requiredScopes: ["calendar.read"] }]);
});


test("bounds authorization and credential resolution before invocation", async () => {
  const authTimeout = fixture({ timeoutMs: 5, authorize: () => new Promise(() => {}) });
  await assert.rejects(authTimeout.invoke({ principal, integrationId: "calendar.read", connectionId: "c", input: { calendarId: "primary" } }), (e) => e.code === "authorization_unavailable");
  const credentialTimeout = fixture({ timeoutMs: 5, resolveCredentials: () => new Promise(() => {}) });
  await assert.rejects(credentialTimeout.invoke({ principal, integrationId: "calendar.read", connectionId: "c", input: { calendarId: "primary" } }), (e) => e.code === "credentials_unavailable");
});
