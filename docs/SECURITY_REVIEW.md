# Security Review — aether-ai-integrations

Status: review checklist; no implementation or test evidence is present.

## Threats
overbroad OAuth scopes, token leakage, webhook spoofing/replay, SSRF, malicious external content, and unintended external side effects.

## Required controls
- [ ] Minimum OAuth scopes and per-connection tenant isolation.
- [ ] Secret manager, rotation/revocation, and no credential logging.
- [ ] Signed webhook verification, timestamp tolerance, and replay defense.
- [ ] SSRF-safe outbound requests and redirect revalidation.
- [ ] Input/output schemas, payload/timeout limits, and rate limiting.
- [ ] Current authorization and approval check at execution time.

## Required tests
Test OAuth scope boundaries, token revocation, webhook signature failure/replay, SSRF blocking, rate limits, external outage/retry behavior, and secret redaction. Use provider sandboxes and synthetic records only.
