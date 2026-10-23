# aether-ai-integrations

Aether AI repository for First-party connectors for external services and secure credential handoff.

## Status

Initial generic webhook HMAC verification utility is in review. No provider connector, credential vault, outbound network policy, or production integration is implemented.

## Initial implementation

The draft package verifies HMAC-SHA256 over timestamp + dot + raw request bytes, with a bounded clock-skew window, body-size cap, minimum secret length, and constant-time digest comparison. Provider-specific signature schemes may differ; confirm the exact signed bytes and header grammar in an ADR before use. Replay prevention requires a durable event-ID store and is not implemented here.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md) — mission, boundaries, dependencies, contracts, security, tests, and implementation gates.
- [Aether AI platform architecture](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/MASTER_ARCHITECTURE.md)
- [Master repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)

## Working rules

- Keep this repository within its documented ownership boundary.
- Do not commit secrets, credentials, production data, or unreviewed generated code.
- Version public contracts and document breaking changes.
- Use synthetic or sanitized data in tests.
- Update the master catalog when ownership or cross-repository contracts change.

## Repository documents

- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Research and licenses](docs/RESEARCH_AND_LICENSES.md)
- [Technical design](docs/TECHNICAL_DESIGN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Engineering standard](docs/ENGINEERING_STANDARD.md)
- [Work log](docs/WORKLOG.md)
