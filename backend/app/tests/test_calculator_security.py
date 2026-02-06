import pytest
from app.tools_registry import tool_service
from collections import namedtuple

ToolModel = namedtuple("ToolModel", ["type", "name", "configuration"])
ToolModel.__new__.__defaults__ = (None,) * len(ToolModel._fields)

@pytest.mark.asyncio
async def test_calculator_security_blocks_dos():
    tool = ToolModel(type="builtin", name="calculator")

    # Test 1: Exponentiation blocked
    result, _ = await tool_service.execute_tool(
        tool,
        {"expression": "2**10"}
    )
    assert "Error: Exponentiation is not allowed" in result

    # Test 2: Length limit
    long_expr = "1+" * 200 + "1" # 401 chars
    result, _ = await tool_service.execute_tool(
        tool,
        {"expression": long_expr}
    )
    assert "Error: Expression too long" in result

    # Test 3: Regular math still works
    result, _ = await tool_service.execute_tool(
        tool,
        {"expression": "10+10*2"}
    )
    assert result == "30"

@pytest.mark.asyncio
async def test_calculator_invalid_chars():
    tool = ToolModel(type="builtin", name="calculator")
    result, _ = await tool_service.execute_tool(
        tool,
        {"expression": "import os"}
    )
    assert "Error: Invalid characters" in result
