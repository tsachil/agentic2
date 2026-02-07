## 2026-02-03 - [Permissive CORS Configuration]
**Vulnerability:** The backend was configured with `allow_origins=["*"]` and `allow_credentials=True`, which is a security risk allowing potential Cross-Site Request Forgery (CSRF) or unauthorized cross-origin access.
**Learning:** Developers often default to `*` for convenience during development, but this must be strictly restricted in production. Hardcoding `*` overrides environment variables designed to control this.
**Prevention:** Use `os.getenv("ALLOWED_ORIGINS")` to dynamically configure CORS policies and validate that it defaults to safe values (e.g., localhost) rather than `*`.

## 2026-02-04 - [Calculator Tool DoS Vulnerability]
**Vulnerability:** The calculator tool used `eval()` with a whitelist that allowed `*` and `0-9`, but failed to block `**` (exponentiation). This allowed an attacker (or agent) to execute `10**100` or larger, causing immediate CPU/Memory exhaustion (DoS).
**Learning:** Character whitelisting for `eval` is insufficient if the allowed characters can form operators that trigger resource exhaustion.
**Prevention:** Explicitly block dangerous operators (like `**`) and enforce strict length limits on inputs to `eval` or similar dynamic execution functions.
