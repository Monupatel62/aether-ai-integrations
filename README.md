# aether-ai-integrations

**Status:** Initial scoped integration registry implemented on a feature branch. No external integration or credential provider is configured.

## Implemented

- [Integration source](src/index.js): explicit integration registration, tenant-aware authorization, required-scope checks, injected credential resolution, bounded input/output, timeout/abort handling, and safe error normalization.
- [Unit tests](test/integrations.test.js): scoped invocation, authorization denial, cross-tenant credentials, insufficient scopes, invalid input, timeout, and credential-safe listing.
- Dependency-free Node.js package with Node 20/22 CI.

## Security boundaries

Credentials are supplied by an injected trusted resolver and passed only to the integration implementation; registry listing and returned results do not expose credentials. A real credential vault, token refresh, provider-specific OAuth consent, revocation, SSRF controls, egress policy, and audit logging remain required before external connections are production-ready.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
