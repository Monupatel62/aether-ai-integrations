# Integration Connection and Webhook Security Contract

**Status:** proposed contract and acceptance criteria only. No runtime controls or passing tests are claimed.

## Ownership boundary

Integrations owns connector-specific connection lifecycle, scope declarations, provider API adaptation, webhook verification, and normalization of external responses. Auth owns identity/session and revocation contracts; Security owns shared policy primitives; Tools owns tool invocation policy and execution isolation. Integrations MUST consume these contracts rather than create a parallel authorization or sandbox implementation.

A connection identifies a provider account/installation and its granted scopes. It does not grant a user, workspace, or tenant access by itself. Canonical tenant-membership ownership remains unresolved under ADR-0021.

## Connection lifecycle

1. Create or link a connection only through an authenticated, authorized flow with explicit user/admin intent.
2. Validate provider identity and requested scopes; request the minimum scopes required for declared operations.
3. Store secret references in the approved secret manager. Never store raw tokens in connector metadata, source control, URLs, ordinary logs, or telemetry.
4. Bind the connection to its owner/tenant through the approved contract. Reject ambiguous or missing scope rather than guessing a default tenant.
5. On disconnect, provider revocation, owner access loss, or detected compromise, prevent new calls, revoke/delete credentials as supported, invalidate cached connection state, and mark outstanding jobs for current-authorization checks before side effects.
6. Scope expansion requires a new consent/approval flow and audit event; do not silently accept broader provider grants than the connector contract permits.
7. Token refresh must be concurrency-safe, redact token endpoint errors, and prevent an older refresh result from overwriting newer credentials or a revoked connection.

## Outbound requests and external content

All connector egress must use the approved Tools-owned egress/sandbox policy where applicable. Validate destinations before connection and after redirects; block disallowed local/private/metadata destinations unless an explicit reviewed policy exception applies. DNS resolution and redirect handling must not permit SSRF or DNS-rebinding bypasses.

External responses, webhook bodies, provider error messages, names, descriptions, and documents are untrusted. Validate expected schemas and payload limits; do not treat returned text as instructions or authority. Normalize provider errors to stable safe error categories without returning credentials, raw headers, or sensitive upstream bodies.

## Webhook verification and replay defense

- Register webhook endpoints through an authenticated provider-specific setup path; keep verification secrets in the secret manager.
- Verify the provider's documented signature over the exact required raw bytes and required headers before parsing or processing the body.
- Enforce timestamp tolerance where the provider supports signed timestamps; reject invalid signatures and stale/future timestamps according to provider contract.
- Persist or otherwise reliably deduplicate provider event IDs within a documented retention window. Handle duplicate deliveries idempotently.
- A valid signature proves message origin/integrity under that provider's scheme; it does not prove that the event remains authorized to trigger a tenant-side action. Re-check current connection state and Aether authorization before side effects.
- Acknowledge only according to the provider's retry contract. Separate durable receipt from asynchronous processing where needed; document what happens when persistence or downstream dependencies are unavailable.
- Never log signing secrets or full sensitive payloads by default.

## Retry and side-effect semantics

Each connector operation must declare whether it is read-only, idempotent, or non-idempotent; its timeout and retry budget; provider rate-limit behavior; cancellation behavior; and supported idempotency key. Retry only where semantics permit. An ambiguous timeout after a side effect must not trigger blind replay unless provider idempotency guarantees it.

## Proposed acceptance matrix

These are required future tests, not evidence of existing implementation.

| Area | Acceptance case |
|---|---|
| OAuth scopes | Missing, excess, and unexpected scopes are rejected or require explicit consent |
| Connection isolation | A connection owned by one tenant cannot be used from another tenant |
| Revocation | Disconnected/revoked connection fails closed, including queued work |
| Refresh races | Concurrent refresh and revoke cannot resurrect stale credentials |
| Secret handling | Tokens and signing secrets absent from default logs/errors |
| Webhook signature | Invalid signature and modified raw body are rejected |
| Replay | Duplicate event IDs and stale signed timestamps do not repeat side effects |
| Webhook authorization | Validly signed event cannot bypass current tenant/connection policy |
| SSRF | Private/metadata targets, redirect pivots, and rebinding attempts are blocked |
| Payload bounds | Malformed, oversized, or deeply nested payloads are rejected or bounded |
| Reliability | Rate limiting, provider outage, timeout, cancellation, and retry exhaustion have stable outcomes |
| Idempotency | Non-idempotent operation is not blindly repeated after ambiguous completion |
| External content | Prompt-injection-like text from provider data remains untrusted content |
| Audit | Connection grant, scope change, revoke, webhook rejection, and side-effect outcome are auditable without secrets |

## Release evidence

Before production, record provider/API versions, OAuth scopes, signature algorithm and verification source, replay/deduplication strategy, secret rotation/revocation behavior, destination policy, payload/time limits, test results, and remaining exceptions. Use provider sandbox accounts and synthetic data. A connector passing signature tests does not establish tenant isolation or correct authorization.

## Related contracts

- [MCP server trust and invocation boundary](https://github.com/Monupatel62/aether-ai-mcp/blob/main/docs/MCP_SERVER_TRUST_AND_INVOCATION_BOUNDARY.md) — only for explicitly MCP-backed connectors.
- [Tools sandbox and egress specification](https://github.com/Monupatel62/aether-ai-tools/blob/main/docs/TOOL_SANDBOX_AND_EGRESS_SPEC.md) — shared execution/egress enforcement.
- [Auth session and token revocation contract](https://github.com/Monupatel62/aether-ai-auth/blob/main/docs/SESSION_AND_TOKEN_REVOCATION_CONTRACT.md) — shared revocation semantics.

## Open decisions

Provider-specific signature verification, OAuth refresh guarantees, webhook replay windows, idempotency support, and credential rotation behavior must be verified against each official provider contract. Do not invent a universal provider behavior or a numeric SLO without evidence.
