## 2026-01-30 - N+1 Query in Simulation List
**Learning:** The `get_simulations` endpoint was suffering from a classic N+1 query problem because the `SimulationResponse` Pydantic model includes a list of messages, but the SQLAlchemy query for `Simulation` was not eagerly loading them. This resulted in a separate query for each simulation to fetch its messages, causing poor performance as the number of simulations grew.
**Action:** Used `subqueryload` in the SQLAlchemy query to fetch all related messages in a single additional query, reducing the complexity from O(N) to O(1) database round trips. Always check Pydantic models for nested relationships and ensure corresponding eager loading is implemented in the query.

## 2026-02-03 - Missing Indexes on Foreign Keys
**Learning:** Foreign keys in SQLAlchemy models do not automatically create indexes in many databases (like Postgres). Missing indexes on `ChatMessage.session_id` caused O(N) full table scans when fetching chat history, which is a critical path operation.
**Action:** Always explicitly set `index=True` on foreign key columns in SQLAlchemy models that are frequently used for filtering or joining (e.g., `session_id`, `user_id`, `agent_id`).

## 2026-02-06 - N+1 Query in Agents List
**Learning:** The `read_agents` endpoint had an N+1 query issue because the `AgentResponse` schema includes `tools`, but the query wasn't eager loading them. This caused 1 query for agents + N queries for tools (one per agent).
**Action:** Used `subqueryload(models.Agent.tools)` to fetch all related tools in a single extra query, reducing total queries from N+1 to 2. Always check response schemas for nested relationships and use eager loading.
