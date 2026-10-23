# Dependencies and Contracts — aether-ai-integrations

## Direct dependencies
aether-ai-tools, aether-ai-auth, and aether-ai-security; aether-ai-mcp only for connectors that explicitly use MCP.

## Contracts
- Connector ID/version, declared scopes, supported operations, data classification, and rate limits.
- Credential references, never raw secrets in public configuration or logs.
- Explicit timeout, retry, idempotency, cancellation, and webhook verification behavior.
- Stable safe errors and correlation IDs.

## Security boundary
No connector may accept client-provided tenant/role/approval metadata as authority. Resource authorization is checked at execution time and external output remains untrusted.
