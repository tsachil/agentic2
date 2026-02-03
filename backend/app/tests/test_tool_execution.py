import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.tools_registry import tool_service

@pytest.mark.asyncio
async def test_execute_api_dynamic_params():
    # Setup
    config = {
        "url": "https://api.example.com/users/{user_id}/posts/{post_id}",
        "method": "GET"
    }
    arguments = {
        "user_id": 123,
        "post_id": "abc-456",
        "limit": 10
    }
    
    # Mock httpx response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "success"}
    mock_response.raise_for_status.return_value = None

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result, metadata = await tool_service._execute_api(config, arguments)
    
    # Assertions
    expected_url = "https://api.example.com/users/123/posts/abc-456"
    expected_params = {"limit": 10}
    
    mock_client.get.assert_called_once()
    call_args = mock_client.get.call_args
    assert call_args[0][0] == expected_url
    assert call_args[1]['params'] == expected_params
    assert result == '{"data": "success"}'
    assert metadata["url"] == expected_url
    assert metadata["method"] == "GET"

@pytest.mark.asyncio
async def test_execute_api_dynamic_params_post():
    # Setup
    config = {
        "url": "https://api.example.com/items/{id}",
        "method": "POST"
    }
    arguments = {
        "id": 99,
        "name": "New Item"
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_response.json.return_value = {"id": 99, "status": "created"}
    mock_response.raise_for_status.return_value = None
    
    mock_client = AsyncMock()
    mock_client.post.return_value = mock_response
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("httpx.AsyncClient", return_value=mock_client):
        result, metadata = await tool_service._execute_api(config, arguments)
    
    expected_url = "https://api.example.com/items/99"
    expected_json = {"name": "New Item"}
    
    mock_client.post.assert_called_once()
    call_args = mock_client.post.call_args
    assert call_args[0][0] == expected_url
    assert call_args[1]['json'] == expected_json
    
    assert result == '{"id": 99, "status": "created"}'
    assert metadata["url"] == expected_url
    assert metadata["method"] == "POST"
