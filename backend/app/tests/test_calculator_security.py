import pytest
from app.tools_registry import tool_service

@pytest.mark.asyncio
async def test_calculator_dos_protection():
    # Test length limit
    long_expression = "1" * 301
    result = tool_service._calculator(long_expression)
    assert "Error" in result and ("length" in result.lower() or "too long" in result.lower())

    # Test exponentiation block
    dos_expression = "10**100"
    result = tool_service._calculator(dos_expression)
    assert "Error" in result and "exponentiation" in result.lower()

    # Test valid expression
    valid_expression = "1+1"
    result = tool_service._calculator(valid_expression)
    assert result == "2"

    # Test valid large number but not exponentiation
    large_mult = "999999*999999"
    result = tool_service._calculator(large_mult)
    assert result == str(999999*999999)
