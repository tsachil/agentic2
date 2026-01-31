import pytest
import pytest_asyncio
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers import simulation

# Import fixtures from conftest implicitly

@pytest_asyncio.fixture
async def async_client(db):
    from app.database import get_db
    from app.tests.conftest import TestingSessionLocal

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides = {}

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

@pytest.mark.asyncio
async def test_concurrent_step_simulation_performance(async_client, client, auth_token, agents):
    # Setup: Create a simulation
    agent_ids = [a["id"] for a in agents]
    sim = client.post(
        "/simulations/",
        json={"name": "Perf Sim", "agent_ids": agent_ids, "initial_topic": "Start"},
        headers={"Authorization": f"Bearer {auth_token}"}
    ).json()

    sim_id = sim["id"]

    # Mock objects to return
    mock_sim = MagicMock()
    mock_sim.id = sim_id
    mock_sim.agent_ids = agent_ids

    mock_agent = MagicMock()
    mock_agent.id = agent_ids[0]
    mock_agent.name = "Alice"

    mock_msg = MagicMock()
    mock_msg.sender_name = "User"
    mock_msg.content = "History"

    # Mock execute_agent_async to be instant
    with patch("app.execution.ExecutionService.execute_agent_async", new_callable=AsyncMock) as mock_execute, \
         patch("app.routers.simulation.get_simulation_context") as mock_get_context, \
         patch("app.routers.simulation.save_simulation_message") as mock_save:

        mock_execute.return_value = "Response"

        def slow_get_context(*args, **kwargs):
            time.sleep(0.1) # Simulate 100ms latency
            return mock_sim, mock_agent, [mock_msg]

        def slow_save(*args, **kwargs):
            time.sleep(0.1) # Simulate 100ms latency
            # Return a mock message that looks like schemas.SimulationMessageResponse
            ret_msg = MagicMock()
            ret_msg.id = 123
            ret_msg.simulation_id = sim_id
            ret_msg.sender_id = mock_agent.id
            ret_msg.sender_name = mock_agent.name
            ret_msg.content = "Response"
            ret_msg.created_at = "2024-01-01T00:00:00"
            return ret_msg

        mock_get_context.side_effect = slow_get_context
        mock_save.side_effect = slow_save

        start_time = time.time()

        # Run 5 concurrent requests
        # Note: We need to use valid auth headers
        headers = {"Authorization": f"Bearer {auth_token}"}

        tasks = []
        for _ in range(5):
            tasks.append(async_client.post(f"/simulations/{sim_id}/step", headers=headers))

        responses = await asyncio.gather(*tasks)

        end_time = time.time()
        duration = end_time - start_time

        print(f"\nDuration for 5 requests: {duration:.4f}s")

        for r in responses:
            if r.status_code != 200:
                print(f"Error: {r.status_code} - {r.text}")
            assert r.status_code == 200

        # Analysis:
        # Each request does: get_context (0.1s) + execute (0s) + save (0.1s) = 0.2s latency.
        # 5 requests.
        # If Serial (blocking): 5 * 0.2 = 1.0s.
        # If Concurrent (threadpool): ~0.2s + overhead.

        assert duration < 0.8
        return duration
