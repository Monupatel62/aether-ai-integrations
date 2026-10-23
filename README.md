# aether-ai-integrations

**Status:** Initial signed-webhook verification boundary implemented on a feature branch. No external provider integration is configured.

## Implemented

- [Webhook verifier](src/index.js): HMAC-SHA256 over the exact raw body, timestamp freshness checks, constant-time signature comparison, bounded payloads, event ID replay protection, and safe processing errors.
- [Unit tests](test/integrations.test.js): valid signatures, tampering, stale timestamps, duplicate events, replay-claim release, malformed JSON, and weak secrets.
- Dependency-free Node.js package with Node 20/22 CI.

## Security limitations

- Secrets must be obtained from a trusted secret manager and rotated; no secret is stored in this repository.
- Replay storage must implement atomic claim/release with durable semantics.
- The provider must document its signature format; this implementation's x-aether-* headers are an Aether contract, not universal vendor compatibility.
- Production use still requires TLS, provider-specific signature adapters, durable event processing/outbox semantics, audit metadata, and operational alerting.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
