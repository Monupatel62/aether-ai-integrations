# Implementation Plan — aether-ai-integrations

## Phase 0 — connector contract
- [ ] Define connector registry, capability manifest, credential lifecycle, and scope model.
- [ ] Define SSRF/outbound network policy and webhook verification requirements.

## Phase 1 — mocked connector
- [ ] Implement a fake provider adapter with typed input/output and stable errors.
- [ ] Test scope enforcement, idempotency, timeout, redaction, and revocation.

## Phase 2 — first external integration
- [ ] Select one connector after license/security/terms review.
- [ ] Use sandbox credentials and explicitly approved endpoints only.

## Phase 3 — release gate
- [ ] Test webhook replay, SSRF, credential rotation/revocation, and provider outages.
- [ ] Document operator runbook, scopes, rate limits, and rollback.

No implementation phase is marked complete.
