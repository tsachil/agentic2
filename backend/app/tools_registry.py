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

    async def execute_tool(self, tool_model: Any, arguments: Dict[str, Any]) -> str:
        if tool_model.type == "builtin":
            return await self._execute_builtin(tool_model.name, arguments)
        elif tool_model.type == "api":
            return await self._execute_api(tool_model.configuration, arguments)
        else:
            return f"Error: Unknown tool type {tool_model.type}"

    async def _execute_builtin(self, name: str, arguments: Dict[str, Any]) -> str:
        func = self.builtin_tools.get(name)
        if not func:
            return f"Error: Builtin tool {name} not found"
        try:
            return await func(**arguments) if asyncio.iscoroutinefunction(func) else func(**arguments)
        except Exception as e:
            return f"Error executing builtin tool {name}: {str(e)}"

    async def _execute_api(self, config: Dict[str, Any], arguments: Dict[str, Any]) -> str:
        url = config.get("url")
        method = config.get("method", "GET").upper()
        headers = config.get("headers", {})

        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, params=arguments, headers=headers, timeout=10.0)
                else:
                    response = await client.post(url, json=arguments, headers=headers, timeout=10.0)
                
                response.raise_for_status()
                return json.dumps(response.json())
            except Exception as e:
                return f"Error calling API tool: {str(e)}"

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
