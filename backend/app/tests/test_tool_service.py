import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.tools_registry import ToolService

@pytest.mark.asyncio
async def test_execute_tool_unknown_type():
    service = ToolService()
    tool_model = MagicMock()
    tool_model.type = "weird"
    result, meta = await service.execute_tool(tool_model, {})
    assert "Unknown tool type" in result
    assert meta == {}

@pytest.mark.asyncio
async def test_execute_builtin_missing_tool():
    service = ToolService()
    result = await service._execute_builtin("does_not_exist", {})
    assert "not found" in result

@pytest.mark.asyncio
async def test_execute_api_error_path():
    service = ToolService()
    config = {"url": "https://api.example.com/fail", "method": "GET"}
    arguments = {"q": "x"}

    mock_client = AsyncMock()
    mock_client.get.side_effect = Exception("boom")
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result, meta = await service._execute_api(config, arguments)

    assert "Error calling API tool" in result
    assert meta["method"] == "GET"
