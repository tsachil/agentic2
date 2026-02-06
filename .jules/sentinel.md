## 2026-02-03 - [Permissive CORS Configuration]
**Vulnerability:** The backend was configured with `allow_origins=["*"]` and `allow_credentials=True`, which is a security risk allowing potential Cross-Site Request Forgery (CSRF) or unauthorized cross-origin access.
**Learning:** Developers often default to `*` for convenience during development, but this must be strictly restricted in production. Hardcoding `*` overrides environment variables designed to control this.
**Prevention:** Use `os.getenv("ALLOWED_ORIGINS")` to dynamically configure CORS policies and validate that it defaults to safe values (e.g., localhost) rather than `*`.

## 2026-02-06 - [Unbounded Calculator Exponentiation DoS]
**Vulnerability:** The calculator tool allowed `**` (exponentiation), enabling Denial of Service via expressions like `10**100000`.
**Learning:** Even with a strict whitelist of characters for `eval`, mathematical operations like exponentiation can be resource-intensive and cause DoS. Input length validation is also critical.
**Prevention:** When using `eval` for math, explicitly block potentially expensive operators (like `**`) and strictly limit input length. Prefer specialized math parsing libraries over `eval` where possible.
