## 2026-02-03 - [Permissive CORS Configuration]
**Vulnerability:** The backend was configured with `allow_origins=["*"]` and `allow_credentials=True`, which is a security risk allowing potential Cross-Site Request Forgery (CSRF) or unauthorized cross-origin access.
**Learning:** Developers often default to `*` for convenience during development, but this must be strictly restricted in production. Hardcoding `*` overrides environment variables designed to control this.
**Prevention:** Use `os.getenv("ALLOWED_ORIGINS")` to dynamically configure CORS policies and validate that it defaults to safe values (e.g., localhost) rather than `*`.

## 2026-02-08 - [Unvalidated Tool URL Configuration (SSRF)]
**Vulnerability:** The `ToolService` executed HTTP requests to arbitrary URLs defined in `Tool` configurations without validation, allowing Server-Side Request Forgery (SSRF) attacks against internal services (e.g., localhost, metadata endpoints).
**Learning:** The application allows users to define custom API tools, which inherently risks SSRF if not strictly controlled. Trusting user-defined configuration for backend-initiated requests is a critical flaw in agentic architectures.
**Prevention:** Implement strict URL validation that parses the hostname, resolves it to an IP address, and blocks private/loopback ranges (RFC 1918) before making any request. Use a deny-list approach for internal IPs.
