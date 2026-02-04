## 2026-02-03 - [Permissive CORS Configuration]
**Vulnerability:** The backend was configured with `allow_origins=["*"]` and `allow_credentials=True`, which is a security risk allowing potential Cross-Site Request Forgery (CSRF) or unauthorized cross-origin access.
**Learning:** Developers often default to `*` for convenience during development, but this must be strictly restricted in production. Hardcoding `*` overrides environment variables designed to control this.
**Prevention:** Use `os.getenv("ALLOWED_ORIGINS")` to dynamically configure CORS policies and validate that it defaults to safe values (e.g., localhost) rather than `*`.

## 2026-02-04 - [Timing Attack in Login Endpoint]
**Vulnerability:** The login endpoint exhibited a timing side-channel vulnerability where the response time for an invalid username was significantly faster than for a valid username with an incorrect password.
**Learning:** Database lookups are much faster than cryptographic password verification (e.g., bcrypt). Returning early when a user is not found exposes this timing difference, allowing username enumeration.
**Prevention:** Implement constant-work logic in authentication flows. Always perform a password verification operation (using a dummy hash if necessary) regardless of whether the user exists.
