import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def auth_token(client):
    client.post("/auth/register", json={"email": "sim@example.com", "password": "pass", "full_name": "Sim User"})
    res = client.post("/auth/token", data={"username": "sim@example.com", "password": "pass"})
    return res.json()["access_token"]

@pytest.fixture
def agents(client, auth_token):
    # Create 2 agents
    a1 = client.post("/agents/", json={"name": "Alice", "purpose": "Chat"}, headers={"Authorization": f"Bearer {auth_token}"}).json()
    a2 = client.post("/agents/", json={"name": "Bob", "purpose": "Chat"}, headers={"Authorization": f"Bearer {auth_token}"}).json()
    return [a1, a2]

def test_create_simulation(client, auth_token, agents):
    agent_ids = [a["id"] for a in agents]
    response = client.post(
        "/simulations/",
        json={
            "name": "Test Sim",
            "agent_ids": agent_ids,
            "initial_topic": "Hello World"
        },
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Sim"
    assert len(data["messages"]) == 1 # System message

@patch("app.execution.ExecutionService.execute_agent", new_callable=AsyncMock)
def test_step_simulation(mock_execute, client, auth_token, agents):
    # Setup sim
    agent_ids = [a["id"] for a in agents]
    sim = client.post(
        "/simulations/",
        json={"name": "Step Sim", "agent_ids": agent_ids, "initial_topic": "Start"},
        headers={"Authorization": f"Bearer {auth_token}"}
    ).json()
    
    # Mock LLM response
    mock_execute.return_value = "This is a mocked response."
    
    # Step
    response = client.post(
        f"/simulations/{sim['id']}/step",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "This is a mocked response."
    
    # Verify retrieval order
    get_res = client.get(f"/simulations/{sim['id']}", headers={"Authorization": f"Bearer {auth_token}"})
    messages = get_res.json()["messages"]
    assert len(messages) == 2 # System + Response
    assert messages[0]["sender_id"] == "system"
    assert messages[1]["sender_id"] in agent_ids

def test_list_simulations(client, auth_token, agents):
    agent_ids = [a["id"] for a in agents]
    
    # Create two sims
    client.post("/simulations/", json={"name": "Sim 1", "agent_ids": agent_ids, "initial_topic": "T1"}, headers={"Authorization": f"Bearer {auth_token}"})
    client.post("/simulations/", json={"name": "Sim 2", "agent_ids": agent_ids, "initial_topic": "T2"}, headers={"Authorization": f"Bearer {auth_token}"})
    
    response = client.get("/simulations/", headers={"Authorization": f"Bearer {auth_token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [s["name"] for s in data]
    assert "Sim 1" in names
    assert "Sim 2" in names
