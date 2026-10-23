# Project Specification — aether-ai-integrations

## Purpose
First-party connectors for external services, scoped credential handoff, webhook verification, data mapping, and disconnect/revoke behavior.

## Scope
- Connector registry, least-privilege OAuth scopes, token lifecycle, webhook verification, rate limits, retries, outbound network policy, and external-data normalization.
- Keep each connector's capabilities and data access explicit and versioned.
- Provide disconnect, revoke, and failure-recovery behavior.

## Out of scope
Canonical identity/membership authority, generic agent orchestration, and third-party business logic beyond the connector contract.

## Acceptance criteria
- Each connector declares minimum scopes, data classes, endpoints, limits, and supported actions.
- External input is treated as untrusted and validated before internal use.
- Credentials are isolated by tenant/connection and revocable.

## Status
Documentation only; no connector source, package manifest, tests, or CI workflow was found in the inspected default-branch tree.
