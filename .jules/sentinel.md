## 2024-10-27 - [Overly Permissive CORS Configuration]
**Vulnerability:** The application was configured to allow Cross-Origin Resource Sharing (CORS) from any origin (`*`). This could allow malicious websites to make authenticated requests to the API on behalf of users.
**Learning:** Hardcoding security configurations like `allow_origins=["*"]` during development can easily leak into production if not guarded by environment variables.
**Prevention:** Always use environment variables to control security policies like CORS. Set strict defaults (e.g., localhost) and override in deployment, rather than defaulting to permissive `*`.
