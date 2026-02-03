import pytest

@pytest.fixture
def auth_header(client):
    client.post("/auth/register", json={"email": "loguser@example.com", "password": "password"})
    res = client.post("/auth/token", data={"username": "loguser@example.com", "password": "password"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_logs_list_and_get_by_id(client, auth_header, db):
    # create agent
    agent = client.post(
        "/agents/",
        json={"name": "Log Agent", "purpose": "testing"},
        headers=auth_header,
    ).json()

    # insert log via API execution? direct insert using existing endpoints isn't exposed,
    # so create a log by hitting logs ingestion through model is not available.
    # Use DB session via fixture to insert a log.
    from app import models
    log = models.AgentExecutionLog(
        agent_id=agent["id"],
        prompt_context={"system_prompt": "s", "history": [], "user_prompt": "u"},
        raw_response="r",
        thought_process="",
        execution_time_ms=1,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # list logs
    res = client.get("/logs/", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["id"] == log.id

    # get by id
    res = client.get(f"/logs/{log.id}", headers=auth_header)
    assert res.status_code == 200
    assert res.json()["id"] == log.id


def test_logs_get_denies_other_user(client, db):
    # user A
    client.post("/auth/register", json={"email": "owner@example.com", "password": "password"})
    token_a = client.post("/auth/token", data={"username": "owner@example.com", "password": "password"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # user B
    client.post("/auth/register", json={"email": "other@example.com", "password": "password"})
    token_b = client.post("/auth/token", data={"username": "other@example.com", "password": "password"}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # create agent/log for user A
    agent = client.post(
        "/agents/",
        json={"name": "Owner Agent", "purpose": "testing"},
        headers=headers_a,
    ).json()

    from app import models
    log = models.AgentExecutionLog(
        agent_id=agent["id"],
        prompt_context={"system_prompt": "s", "history": [], "user_prompt": "u"},
        raw_response="r",
        thought_process="",
        execution_time_ms=1,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # user B cannot access user A log
    res = client.get(f"/logs/{log.id}", headers=headers_b)
    assert res.status_code == 404
