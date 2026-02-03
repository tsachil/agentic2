from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .routers import auth, users, agents, simulation, logs, tools
from .database import engine, Base
from .logger import logger
import time
import uuid
import json
from typing import Any, Dict, Union
import os

# Create tables only when explicitly enabled (dev-only)
if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic Platform API", version="0.1.0")

# --- Logging helpers ---
SENSITIVE_KEYS = {"password", "token", "authorization", "api_key", "apikey", "secret", "access_token", "refresh_token"}
MAX_LOG_BODY_BYTES = 10_000

def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: ("[REDACTED]" if k.lower() in SENSITIVE_KEYS else _redact_value(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact_value(v) for v in value]
    return value

def _safe_json(body: bytes) -> Union[Dict[str, Any], str]:
    try:
        parsed = json.loads(body.decode("utf-8"))
        return _redact_value(parsed)
    except Exception:
        return f"[non-json body] {body[:512]!r}"

# --- Middleware for Logging ---
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        start_time = time.time()
        
        # Log Request
        log_context = {
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else "unknown"
        }
        
        # Capture body for logging (bounded, redacted, safe)
        body_bytes = await request.body()
        async def receive():
            return {"type": "http.request", "body": body_bytes}
        request._receive = receive

        if len(body_bytes) > MAX_LOG_BODY_BYTES:
            log_context["request_body"] = f"[omitted] size={len(body_bytes)}"
        else:
            log_context["request_body"] = _safe_json(body_bytes)

        logger.info(f"Incoming Request: {request.method} {request.url.path}", extra={"extra_fields": log_context})

        response = await call_next(request)
        
        # Log Response
        process_time = (time.time() - start_time) * 1000
        
        # Capture response body? (Harder with streaming responses, skipping for safety/perf unless critical)
        # For now, logging status and time
        
        logger.info(
            f"Outgoing Response: {response.status_code}", 
            extra={
                "extra_fields": {
                    "correlation_id": correlation_id,
                    "status_code": response.status_code,
                    "process_time_ms": process_time
                }
            }
        )
        
        response.headers["X-Correlation-ID"] = correlation_id
        return response

app.add_middleware(LoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Log Ingestion Endpoint ---
from pydantic import BaseModel
class FrontendLog(BaseModel):
    level: str
    message: str
    context: dict = {}
    timestamp: str

@app.post("/logs/ingest")
async def ingest_logs(log: FrontendLog):
    """
    Ingest logs from frontend/external sources to centralize logging.
    """
    # Map frontend level to logger method
    log_func = getattr(logger, log.level.lower(), logger.info)
    
    # Merge context with standard fields (redacted)
    extra = {
        "source": "frontend",
        "correlation_id": log.context.get("correlationId"),
        "original_timestamp": log.timestamp
    }
    # Add other context fields
    for k, v in log.context.items():
        if k != "correlationId":
            extra[k] = _redact_value(v)

    log_func(log.message, extra={"extra_fields": extra})
    return {"status": "received"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(agents.router)
app.include_router(simulation.router)
app.include_router(logs.router)
app.include_router(tools.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Agentic Platform API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
