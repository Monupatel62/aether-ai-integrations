const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export class IntegrationError extends Error {
  constructor(code, message = "Integration operation failed") { super(message); this.name = "IntegrationError"; this.code = code; }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value) { return typeof value === "string" && ID.test(value) && value.trim() === value; }
function safeError(code) { return new IntegrationError(code); }
async function boundedCall(fn, context, timeoutMs, code) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(safeError(code)); }, timeoutMs); });
  try { return await Promise.race([Promise.resolve().then(() => fn({ ...context, signal: controller.signal })), timeout]); }
  finally { clearTimeout(timer); }
}

export function createIntegrationRegistry({ authorize, resolveCredentials, timeoutMs = 15_000, maxInputBytes = 65_536, maxOutputBytes = 262_144 }) {
  if (typeof authorize !== "function" || typeof resolveCredentials !== "function") throw new TypeError("Authorization and credential resolver are required");
  for (const [key, value] of Object.entries({ timeoutMs, maxInputBytes, maxOutputBytes })) if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${key} must be a positive integer`);
  if (timeoutMs > 120_000 || maxInputBytes > 1_048_576 || maxOutputBytes > 4_194_304) throw new TypeError("Configured limits exceed supported maxima");
  const integrations = new Map();

  return Object.freeze({
    register(definition) {
      if (!isRecord(definition) || !validId(definition.id) || integrations.has(definition.id)) throw new TypeError("Integration definition is invalid or duplicated");
      if (!Array.isArray(definition.requiredScopes) || definition.requiredScopes.some((scope) => !validId(scope))) throw new TypeError("requiredScopes must be valid identifiers");
      if (typeof definition.validateInput !== "function" || typeof definition.validateOutput !== "function" || typeof definition.invoke !== "function") throw new TypeError("Integration must provide input/output validators and invoke function");
      integrations.set(definition.id, Object.freeze({
        id: definition.id, requiredScopes: Object.freeze([...new Set(definition.requiredScopes)]),
        validateInput: definition.validateInput, validateOutput: definition.validateOutput, invoke: definition.invoke,
      }));
      return this;
    },
    list() { return Object.freeze([...integrations.values()].map(({ id, requiredScopes }) => Object.freeze({ id, requiredScopes }))); },
    async invoke({ principal, integrationId, connectionId, input, signal } = {}) {
      if (!isRecord(principal) || !validId(principal.id) || !validId(principal.tenantId)) throw safeError("unauthenticated");
      if (!validId(integrationId) || !validId(connectionId)) throw safeError("invalid_request");
      const integration = integrations.get(integrationId);
      if (!integration) throw safeError("integration_not_found");
      let size;
      try { size = Buffer.byteLength(JSON.stringify(input)); } catch { throw safeError("invalid_input"); }
      if (size > maxInputBytes) throw safeError("input_too_large");
      let inputValid = false;
      try { inputValid = integration.validateInput(input) === true; } catch { inputValid = false; }
      if (!inputValid) throw safeError("invalid_input");

      let allowed = false;
      try { allowed = (await boundedCall(authorize, { principal, action: "integration:invoke", integrationId, connectionId, requiredScopes: integration.requiredScopes }, timeoutMs, "authorization_timeout")) === true; }
      catch { throw safeError("authorization_unavailable"); }
      if (!allowed) throw safeError("forbidden");

      let credentials;
      try { credentials = await boundedCall(resolveCredentials, { principal, integrationId, connectionId, requiredScopes: integration.requiredScopes }, timeoutMs, "credentials_timeout"); }
      catch { throw safeError("credentials_unavailable"); }
      if (!isRecord(credentials) || credentials.tenantId !== principal.tenantId || !Array.isArray(credentials.scopes)
        || integration.requiredScopes.some((scope) => !credentials.scopes.includes(scope))) throw safeError("insufficient_connection_scopes");

      if (signal?.aborted) throw safeError("aborted");
      const controller = new AbortController();
      const onAbort = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", onAbort, { once: true });
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const output = await Promise.race([
          Promise.resolve().then(() => integration.invoke(input, { credentials, signal: controller.signal, tenantId: principal.tenantId })),
          new Promise((_, reject) => {
            const rejectOnAbort = () => reject(safeError(signal?.aborted ? "aborted" : "timeout"));
            if (controller.signal.aborted) rejectOnAbort();
            else controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
          }),
        ]);
        let outputSize;
        try { outputSize = Buffer.byteLength(JSON.stringify(output)); } catch { throw safeError("invalid_output"); }
        if (outputSize > maxOutputBytes) throw safeError("output_too_large");
        let outputValid = false;
        try { outputValid = integration.validateOutput(output) === true; } catch { outputValid = false; }
        if (!outputValid) throw safeError("invalid_output");
        return Object.freeze({ integrationId, output });
      } catch (error) {
        if (error instanceof IntegrationError) throw error;
        if (controller.signal.aborted) throw safeError(signal?.aborted ? "aborted" : "timeout");
        throw safeError("invocation_failed");
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      }
    },
  });
}
