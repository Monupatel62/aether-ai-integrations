# Technical Design — aether-ai-integrations

## Connector manifest
Proposed fields: connector_id, version, provider, operations, required_scopes, input/output schema references, data classification, allowed destinations, timeout, rate-limit policy, idempotency support, and revocation behavior.

## Credential lifecycle
Store only a credential reference in application records. Encrypt credentials at rest using the approved secret system; limit access to the connector worker; rotate/revoke and audit access. Never return tokens to models or tools.

## Network and payload safety
Enforce destination allowlists and block loopback, link-local, private, and metadata IP targets unless a reviewed connector explicitly requires them. Revalidate redirects. Bound response size and treat external HTML/text as untrusted.

## Open decisions
Credential vault, OAuth library, worker isolation, and outbound egress implementation require ADRs.
