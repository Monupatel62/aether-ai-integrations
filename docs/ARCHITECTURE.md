# Architecture — aether-ai-integrations

## Boundary
This repository adapts external services to Aether-owned tool/integration contracts. It does not grant authorization; every action is checked against current Aether policy.

## Flow
1. Resolve an authorized connection and minimum required scopes.
2. Load credentials from the approved secret boundary.
3. Validate request, destination, and connector-specific constraints.
4. Execute with timeout, rate limit, and idempotency where supported.
5. Normalize response and redact external payloads before returning or logging.

## Reliability
Use bounded retries only for retry-safe operations. Verify webhook signatures and replay windows. Fail closed when credentials or authorization state cannot be verified.
