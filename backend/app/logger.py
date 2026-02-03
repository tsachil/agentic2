import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
        }
        
        # Add extra fields if they exist in the record
        if hasattr(record, "extra_fields"):
            log_obj.update(record.extra_fields)
            
        # Add exception info if present
        if record.exc_info:
            log_obj["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)

def setup_logger(name: str = "agentic_platform") -> logging.Logger:
    logger = logging.getLogger(name)
    
    # clear existing handlers
    if logger.handlers:
        logger.handlers.clear()
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    return logger

logger = setup_logger()
