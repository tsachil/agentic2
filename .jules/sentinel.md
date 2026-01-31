# Sentinel Journal

This journal documents CRITICAL security learnings, vulnerabilities, and patterns found in the codebase.

## Format
## YYYY-MM-DD - [Title]
**Vulnerability:** [What you found]
**Learning:** [Why it existed]
**Prevention:** [How to avoid next time]

## 2024-05-23 - Syntax Error Masking Security Verification
**Vulnerability:** A `SyntaxError` ('await' outside async function) in `backend/app/execution.py` prevented the application from starting.
**Learning:** This syntax error was not caught because tests were not running in CI, and it masked the ability to verify security fixes or even run the app. Security tools cannot run on broken code.
**Prevention:** Enforce pre-commit hooks or CI checks that run `python -m compileall .` or linters to catch syntax errors before code is merged.

## 2024-05-23 - Overly Permissive CORS Default
**Vulnerability:** `backend/app/main.py` defaulted to `allow_origins=["*"]`.
**Learning:** Development defaults (allowing all) were deployed to production code paths without environment checks.
**Prevention:** Use environment variables for sensitive configuration like CORS origins, and default to restricted values (or fail safe) rather than open ones.
