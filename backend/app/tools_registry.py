import httpx
import json
import asyncio
from typing import Dict, Any, Callable
from datetime import datetime

class ToolService:
    def __init__(self):
        self.builtin_tools: Dict[str, Callable] = {
            "get_current_time": self._get_current_time,
            "calculator": self._calculator
        }

    async def execute_tool(self, tool_model: Any, arguments: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        if tool_model.type == "builtin":
            result = await self._execute_builtin(tool_model.name, arguments)
            return result, {}
        elif tool_model.type == "api":
            return await self._execute_api(tool_model.configuration, arguments)
        else:
            return f"Error: Unknown tool type {tool_model.type}", {}

    async def _execute_builtin(self, name: str, arguments: Dict[str, Any]) -> str:
        func = self.builtin_tools.get(name)
        if not func:
            return f"Error: Builtin tool {name} not found"
        try:
            return await func(**arguments) if asyncio.iscoroutinefunction(func) else func(**arguments)
        except Exception as e:
            return f"Error executing builtin tool {name}: {str(e)}"

    async def _execute_api(self, config: Dict[str, Any], arguments: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        url = config.get("url")
        method = config.get("method", "GET").upper()
        headers = config.get("headers", {})

        # Handle Dynamic URL Parameters (e.g. https://api.com/users/{id})
        # We replace placeholders in the URL with values from arguments
        # and remove those values from the arguments sent in the body/query.
        request_args = arguments.copy()
        
        # Check for any argument keys used as placeholders in the URL
        for key, value in arguments.items():
            placeholder = "{" + key + "}"
            if placeholder in url:
                url = url.replace(placeholder, str(value))
                if key in request_args:
                    del request_args[key]
        
        metadata = {"url": url, "method": method}

        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, params=request_args, headers=headers, timeout=10.0)
                else:
                    response = await client.post(url, json=request_args, headers=headers, timeout=10.0)
                
                response.raise_for_status()
                return json.dumps(response.json()), metadata
            except Exception as e:
                return f"Error calling API tool: {str(e)}", metadata

    # --- Builtin Tool Implementations ---
    
    def _get_current_time(self, format: str = "%Y-%m-%d %H:%M:%S") -> str:
        return datetime.now().strftime(format)

    def _calculator(self, expression: str) -> str:
        # Note: In production, use a safer math evaluator
        try:
            # Basic validation
            if not all(c in "0123456789+-*/(). " for c in expression):
                return "Error: Invalid characters in expression"
            return str(eval(expression, {"__builtins__": {}}, {}))
        except Exception as e:
            return f"Error calculating: {str(e)}"

tool_service = ToolService()
