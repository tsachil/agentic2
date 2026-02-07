"""
Test to ensure no N+1 query regressions in agent endpoints.
"""
import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session
from app import models, database

@pytest.fixture
def create_agents_with_tools(client, db):
    # Register a user and get token
    user_data = {"email": "perf@example.com", "password": "password", "full_name": "Perf User"}
    client.post("/auth/register", json=user_data)
    login_res = client.post("/auth/token", data={"username": "perf@example.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create 5 agents
    agent_ids = []
    for i in range(5):
        agent_res = client.post("/agents/", json={"name": f"Agent {i}", "purpose": "Test"}, headers=headers)
        agent_id = agent_res.json()["id"]
        agent_ids.append(agent_id)

    # Create 2 tools
    tool_res1 = client.post("/tools/", json={"name": "tool1", "description": "d1", "type": "builtin"}, headers=headers)
    tool_id1 = tool_res1.json()["id"]

    tool_res2 = client.post("/tools/", json={"name": "tool2", "description": "d2", "type": "builtin"}, headers=headers)
    tool_id2 = tool_res2.json()["id"]

    # Assign tools to agents
    for agent_id in agent_ids:
        client.post(f"/agents/{agent_id}/tools/{tool_id1}", headers=headers)
        client.post(f"/agents/{agent_id}/tools/{tool_id2}", headers=headers)

    return headers

def test_n_plus_1_agents(client, db, create_agents_with_tools):
    headers = create_agents_with_tools

    # We need to capture queries on the engine.
    # Since `db` is a session, `db.get_bind()` returns the engine.

    engine = db.get_bind()
    query_count = 0

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        nonlocal query_count
        # print(f"Query: {statement}")
        query_count += 1

    event.listen(engine, "before_cursor_execute", before_cursor_execute)

    try:
        # Perform the request
        response = client.get("/agents/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
        assert len(data[0]["tools"]) == 2
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)

    print(f"\nQuery count: {query_count}")

    # Expected queries without optimization:
    # 1. Select user (auth dependency)
    # 2. Select agents (limit/offset)
    # 3. For each agent (5 agents), select tools (Lazy load) -> 5 queries
    # Total ~ 7 queries.

    # Asserting <= 5 confirms N+1 behavior is fixed
    # Expect 2 queries (1 agents, 1 tools) + 1 auth user = 3 queries.
    assert query_count <= 5, f"Expected optimized queries (<=5), but got {query_count}"
