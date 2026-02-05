## 2026-02-03 - [Permissive CORS Configuration]
**Vulnerability:** The backend was configured with `allow_origins=["*"]` and `allow_credentials=True`, which is a security risk allowing potential Cross-Site Request Forgery (CSRF) or unauthorized cross-origin access.
**Learning:** Developers often default to `*` for convenience during development, but this must be strictly restricted in production. Hardcoding `*` overrides environment variables designed to control this.
**Prevention:** Use `os.getenv("ALLOWED_ORIGINS")` to dynamically configure CORS policies and validate that it defaults to safe values (e.g., localhost) rather than `*`.

## 2026-03-01 - [Unsafe Calculator Evaluation]
**Vulnerability:** The backend `calculator` tool used `eval()` with a character whitelist. While the whitelist was strict (`0123456789+-*/(). `), `eval` is fundamentally unsafe and difficult to sandbox perfectly against DoS or subtle injection attacks.
**Learning:** Even with whitelists, `eval` usage flags security audits and creates a risk surface. AST-based evaluation using `ast.parse` and recursive node visiting is a robust, standard library-only alternative that strictly defines executable logic without the risks of `eval`.
**Prevention:** Replace `eval()` with a custom AST evaluator that explicitly allows only specific node types (e.g., `BinOp`, `UnaryOp`, `Constant`) and rejects everything else by default.
