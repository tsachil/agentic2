## 2025-02-18 - [Secure CORS Configuration]
**Vulnerability:** Application was configured with `allow_origins=["*"]` in `backend/app/main.py`, allowing any website to make authenticated requests to the API (CSRF/Data Leakage risk).
**Learning:** Hardcoded "dev-only" configurations like wildcard CORS often persist into production or are overlooked. Explicit configuration is critical.
**Prevention:** Always use environment variables (e.g., `ALLOWED_ORIGINS`) to control CORS policies, and default to a safe list (e.g., localhost) or fail secure, rather than using `*`.
