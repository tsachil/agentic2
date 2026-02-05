import pytest
from app.tools_registry import tool_service

@pytest.mark.asyncio
async def test_calculator_basic_addition():
    # Test 2 + 2
    result = tool_service._calculator("2 + 2")
    assert result == "4"

@pytest.mark.asyncio
async def test_calculator_complex_expression():
    # Test (10 + 5) * 2 - 4 / 2
    # 15 * 2 - 2 = 30 - 2 = 28.0
    result = tool_service._calculator("(10 + 5) * 2 - 4 / 2")
    # eval returns floats for division typically, but lets see.
    # Python 3 / is float.
    assert result == "28.0"

@pytest.mark.asyncio
async def test_calculator_decimals():
    result = tool_service._calculator("1.5 + 2.5")
    assert result == "4.0"

@pytest.mark.asyncio
async def test_calculator_invalid_chars():
    # Test blocked characters
    result = tool_service._calculator("import os")
    assert "Error: Invalid characters" in result

@pytest.mark.asyncio
async def test_calculator_code_injection_attempt():
    # Attempt to access internals (though whitelist blocks letters)
    # The whitelist is "0123456789+-*/(). "
    # We can't really do much injection without letters.
    # But this test ensures we don't accidentally loosen the whitelist or validation.
    result = tool_service._calculator("__import__('os')")
    # New AST evaluator returns "Invalid expression node" or similar, distinct from "Invalid characters"
    assert "Error" in result and ("Invalid" in result or "Call" in result)

@pytest.mark.asyncio
async def test_calculator_syntax_error():
    result = tool_service._calculator("2 + * 2")
    assert "Error" in result
