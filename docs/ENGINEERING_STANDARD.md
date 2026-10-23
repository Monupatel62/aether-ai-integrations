# Engineering Standard — aether-ai-integrations

- Implement each provider behind a narrow, typed connector interface.
- Keep scopes/capabilities explicit; deny unlisted operations by default.
- Treat provider responses and webhook bodies as untrusted input.
- Apply timeouts, rate limits, and operation-aware retries.
- Redact credentials and sensitive external payloads from logs.
- Test revocation and replay defenses with synthetic fixtures.
- Keep provider API/version/terms and upgrade notes documented.
- Never enable real external side effects in tests by default.
