# Agentic Platform - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Browser)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (Vite + TypeScript)                │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Pages:                                                              │  │
│  │  • Dashboard          • AgentBuilder      • AgentChat                │  │
│  │  • SimulationPage     • AgentInspector    • ToolLibrary               │  │
│  │  • Login              • Register                                      │  │
│  │                                                                      │  │
│  │  State Management:                                                    │  │
│  │  • Zustand (authStore) - Authentication state                        │  │
│  │                                                                      │  │
│  │  API Client:                                                          │  │
│  │  • Axios - HTTP client with interceptors                             │  │
│  │  • Correlation ID generation                                         │  │
│  │  • JWT token management                                              │  │
│  │  • Log shipping to backend                                            │  │
│  │                                                                      │  │
│  │  UI Framework:                                                        │  │
│  │  • Material UI (MUI) - Component library                             │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    │ (JSON, JWT Auth)
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                        API GATEWAY LAYER (FastAPI)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      FastAPI Application                            │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Middleware:                                                         │  │
│  │  • LoggingMiddleware - Request/response logging                     │  │
│  │  • CORSMiddleware - Cross-origin resource sharing                  │  │
│  │  • Correlation ID tracking                                          │  │
│  │                                                                      │  │
│  │  API Routes:                                                         │  │
│  │  • /auth          - Authentication (login, register, JWT)           │  │
│  │  • /users         - User management                                 │  │
│  │  • /agents        - Agent CRUD, chat sessions, execution           │  │
│  │  • /simulations   - Multi-agent simulation management               │  │
│  │  • /logs          - Execution logs (Flight Recorder)                │  │
│  │  • /tools         - Tool library management                         │  │
│  │  • /logs/ingest   - Frontend log ingestion                         │  │
│  │                                                                      │  │
│  │  Authentication:                                                     │  │
│  │  • JWT token validation                                             │  │
│  │  • Password hashing (bcrypt)                                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER (Services)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    ExecutionService                                  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Agent execution orchestration                                     │  │
│  │  • System prompt construction (personality, purpose)                 │  │
│  │  • Gemini API integration                                            │  │
│  │  • Tool calling loop (max 5 iterations)                            │  │
│  │  • Thought process extraction (<thought> tags)                      │  │
│  │  • Execution logging                                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    ToolService                                        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • Builtin tools: calculator, get_current_time                      │  │
│  │  • API tools: HTTP webhook execution                                │  │
│  │  • Dynamic URL parameter replacement                                │  │
│  │  • Tool execution with metadata tracking                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Data Models (SQLAlchemy)                          │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  • User          - User accounts, roles, authentication              │  │
│  │  • Agent         - AI agent definitions, personality config          │  │
│  │  • Tool          - Tool library (builtin & API tools)              │  │
│  │  • ChatSession   - Chat conversation sessions                       │  │
│  │  • ChatMessage   - Individual chat messages                         │  │
│  │  • Simulation    - Multi-agent simulation instances                 │  │
│  │  • SimulationMessage - Messages within simulations                 │  │
│  │  • AgentExecutionLog - Detailed execution logs (Flight Recorder)   │  │
│  │                                                                      │  │
│  │  Relationships:                                                      │  │
│  │  • User → Agents (one-to-many)                                      │  │
│  │  • Agent ↔ Tool (many-to-many)                                      │  │
│  │  • Agent → ChatSessions (one-to-many)                               │  │
│  │  • ChatSession → ChatMessages (one-to-many)                         │  │
│  │  • Agent → AgentExecutionLogs (one-to-many)                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    │ SQLAlchemy ORM
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                      DATA LAYER (PostgreSQL Database)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tables:                                                                    │
│  • users                    • agents                                       │
│  • tools                    • agent_tool_association                       │
│  • chat_sessions            • chat_messages                                 │
│  • simulations              • simulation_messages                           │
│  • agent_execution_logs                                                     │
│                                                                             │
│  Features:                                                                  │
│  • ACID transactions                                                        │
│  • Foreign key constraints                                                 │
│  • JSON columns for flexible config storage                                │
│  • Timestamps (created_at, updated_at)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐ │
│  │  Google Gemini API   │  │      Redis            │  │  External APIs  │ │
│  ├──────────────────────┤  ├──────────────────────┤  ├─────────────────┤ │
│  │ • gemini-2.0-flash   │  │ • Caching            │  │ • Webhooks      │ │
│  │ • Function calling   │  │ • Task queues        │  │ • REST APIs     │ │
│  │ • Chat completion     │  │ • Session storage    │  │ • Tool execution│ │
│  │ • System instructions │  │                      │  │                 │ │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Docker Compose Orchestration:                                              │
│  • backend    - FastAPI (port 8001)                                        │
│  • frontend   - Vite dev server (port 5174)                                │
│  • db         - PostgreSQL (port 5433)                                      │
│  • redis      - Redis (port 6380)                                          │
│  • dozzle     - Log viewer (port 8888)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

## Data Flow

### 1. User Authentication Flow
```
Browser → Frontend → /auth/login → Backend → PostgreSQL
                                    ↓
                              JWT Token → Browser (localStorage)
```

### 2. Agent Chat Execution Flow
```
Browser → Frontend → /agents/sessions/{id}/execute → Backend
                                                      ↓
                                              ExecutionService
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                   ↓
                              PostgreSQL (load agent)          Gemini API (execute)
                                    ↓                                   ↓
                              ToolService ←─────────────────────────────┘
                                    ↓
                              Execute Tools (builtin/API)
                                    ↓
                              PostgreSQL (save logs)
                                    ↓
                              Response → Frontend → Browser
```

### 3. Multi-Agent Simulation Flow
```
Browser → Frontend → /simulations → Backend
                                    ↓
                              Create Simulation
                                    ↓
                              Loop: For each agent
                                    ↓
                              ExecutionService → Gemini API
                                    ↓
                              Save messages → PostgreSQL
                                    ↓
                              Return results → Frontend
```

### 4. Tool Execution Flow
```
Agent Request → ToolService
                    ↓
            ┌───────┴───────┐
            ↓               ↓
      Builtin Tool      API Tool
            ↓               ↓
      Execute locally   HTTP Request → External API
            ↓               ↓
      Return result    Return response
            ↓               ↓
            └───────┬───────┘
                    ↓
            Log to PostgreSQL
```

### 5. Logging Flow
```
Frontend Action → Axios Interceptor → /logs/ingest → Backend
                                                      ↓
                                              Logger (JSON)
                                                      ↓
                                              stdout / Dozzle
```

## Key Technologies

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **google-genai** - Gemini API client
- **httpx** - Async HTTP client for API tools
- **bcrypt** - Password hashing
- **python-jose** - JWT handling

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Material UI** - Component library
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router** - Routing

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PostgreSQL** - Relational database
- **Redis** - Caching and queues
- **Dozzle** - Log viewer

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS middleware
- Correlation ID tracking
- Request/response logging
- Protected routes (frontend)
- Authentication middleware (backend)

## Scalability Considerations

- Async/await for non-blocking operations
- Database connection pooling
- Redis for caching and session storage
- Containerized deployment
- Stateless API design
- Tool execution timeout limits
