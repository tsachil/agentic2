import pytest
from unittest.mock import patch, AsyncMock
from app import models

@pytest.fixture
def auth_header(client):
    client.post("/auth/register", json={"email": "tooluser@example.com", "password": "password"})
    res = client.post("/auth/token", data={"username": "tooluser@example.com", "password": "password"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_seed_tools(client, auth_header):
    response = client.post("/tools/seed", headers=auth_header)
    assert response.status_code == 200
    assert response.json() == {"message": "Built-in tools seeded"}

    # Verify tools were created
    response = client.get("/tools/", headers=auth_header)
    assert response.status_code == 200
    tools = response.json()
    assert len(tools) >= 2
    tool_names = [t['name'] for t in tools]
    assert "get_current_time" in tool_names
    assert "calculator" in tool_names

def test_create_tool(client, auth_header):
    tool_data = {
        "name": "get_weather",
        "description": "Get the weather for a location.",
        "type": "api",
        "parameter_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"}
            },
            "required": ["location"]
        },
        "configuration": {
            "url": "https://api.weather.com",
            "method": "GET"
        }
    }
    response = client.post("/tools/", json=tool_data, headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "get_weather"
    
    # Test duplicate name
    response = client.post("/tools/", json=tool_data, headers=auth_header)
    assert response.status_code == 400

def test_update_tool(client, auth_header):
    # First, create a tool
    tool_data = {"name": "tool_to_update", "description": "Original", "type": "api", "parameter_schema": {}, "configuration": {}}
    res = client.post("/tools/", json=tool_data, headers=auth_header).json()
    tool_id = res['id']
    
    # Now, update it
    update_data = {"name": "tool_is_updated", "description": "Updated Description", "type": "api", "parameter_schema": {}, "configuration": {}}
    response = client.put(f"/tools/{tool_id}", json=update_data, headers=auth_header)
    assert response.status_code == 200
    assert response.json()["description"] == "Updated Description"
    assert response.json()["name"] == "tool_is_updated"

def test_delete_tool(client, auth_header):
    # First, create a tool
    tool_data = {"name": "to_delete", "description": "...", "type": "api", "parameter_schema": {}, "configuration": {}}
    res = client.post("/tools/", json=tool_data, headers=auth_header).json()
    tool_id = res['id']
    
    # Delete it
    response = client.delete(f"/tools/{tool_id}", headers=auth_header)
    assert response.status_code == 204
    
    # Verify it's gone
    response = client.get("/tools/", headers=auth_header)
    tool_names = [t['name'] for t in response.json()]
    assert "to_delete" not in tool_names

def test_agent_tool_assignment(client, auth_header):
    # Create an agent
    agent_res = client.post("/agents/", json={"name": "Tool Agent", "purpose": "Testing"}, headers=auth_header).json()
    agent_id = agent_res['id']
    
    # Seed tools and get one
    client.post("/tools/seed", headers=auth_header)
    tools = client.get("/tools/", headers=auth_header).json()
    calculator_tool = next(t for t in tools if t['name'] == 'calculator')
    tool_id = calculator_tool['id']

    # Assign tool
    response = client.post(f"/agents/{agent_id}/tools/{tool_id}", headers=auth_header)
    assert response.status_code == 200

    # Verify assignment
    agent = client.get(f"/agents/{agent_id}", headers=auth_header).json()
    assert len(agent['tools']) == 1
    assert agent['tools'][0]['name'] == 'calculator'

    # Unassign tool
    response = client.delete(f"/agents/{agent_id}/tools/{tool_id}", headers=auth_header)
    assert response.status_code == 200
    
    # Verify unassignment
    agent = client.get(f"/agents/{agent_id}", headers=auth_header).json()
    assert len(agent['tools']) == 0

@patch("app.tools_registry.tool_service.execute_tool", new_callable=AsyncMock)
def test_test_tool_endpoint(mock_execute, client, auth_header):
    mock_execute.return_value = ('{"result": "mocked"}', {"url": "http://test.com"})
    
    # Get a tool id
    client.post("/tools/seed", headers=auth_header)
    tools = client.get("/tools/", headers=auth_header).json()
    tool_id = tools[0]['id']

    response = client.post(f"/tools/{tool_id}/test", json={"arg1": "value1"}, headers=auth_header)
    assert response.status_code == 200
    assert response.json() == {"result": '{"result": "mocked"}', "metadata": {"url": "http://test.com"}}
    mock_execute.assert_called_once()

def test_tool_logs_include_prompt_context_events(client, auth_header, db):
    # Create tool
    tool_data = {
        "name": "audit_tool",
        "description": "Audit tool",
        "type": "api",
        "parameter_schema": {"type": "object", "properties": {}},
        "configuration": {"url": "https://api.example.com", "method": "GET"}
    }
    tool = client.post("/tools/", json=tool_data, headers=auth_header).json()

    # Create agent
    agent = client.post("/agents/", json={"name": "Logger Agent", "purpose": "Testing"}, headers=auth_header).json()

    # Insert log with tool_events inside prompt_context
    log = models.AgentExecutionLog(
        agent_id=agent["id"],
        prompt_context={
            "system_prompt": "test",
            "history": [],
            "user_prompt": "test",
            "tool_events": [
                {
                    "tool": tool["name"],
                    "input": {"q": "1"},
                    "output": "ok",
                    "metadata": {"url": "https://api.example.com"}
                }
            ]
        },
        raw_response="raw",
        thought_process="",
        execution_time_ms=12
    )
    db.add(log)
    db.commit()

    response = client.get(f"/tools/{tool['id']}/logs", headers=auth_header)
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 1
    assert logs[0]["tool_name"] == tool["name"]
    assert logs[0]["request_url"] == "https://api.example.com"
