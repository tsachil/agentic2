## 2026-01-30 - N+1 Query in Simulation List
**Learning:** The `get_simulations` endpoint was suffering from a classic N+1 query problem because the `SimulationResponse` Pydantic model includes a list of messages, but the SQLAlchemy query for `Simulation` was not eagerly loading them. This resulted in a separate query for each simulation to fetch its messages, causing poor performance as the number of simulations grew.
**Action:** Used `subqueryload` in the SQLAlchemy query to fetch all related messages in a single additional query, reducing the complexity from O(N) to O(1) database round trips. Always check Pydantic models for nested relationships and ensure corresponding eager loading is implemented in the query.

## 2026-05-24 - N+1 Query in Agent List
**Learning:** The `read_agents` endpoint exhibited an N+1 query issue where fetching a list of agents triggered individual queries for their `tools` relationship. This confirms that relationships in Pydantic response models (like `AgentResponse.tools`) must be eagerly loaded in SQLAlchemy queries.
**Action:** Applied `subqueryload(models.Agent.tools)` to the query. Future endpoints returning lists of objects with relationships should be audited for this pattern during development.
