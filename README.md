# Agentic Platform

The Agentic Platform is a full-stack application for creating, managing, and observing AI agents. It provides a flexible framework for multi-agent simulations, chat interactions, and extending agent capabilities with custom tools.

## Features

*   **Agent Management**: Create, configure, and manage multiple AI agents with distinct personalities and goals.
*   **Chat Interface**: Interact directly with your agents in a persistent chat session.
*   **Multi-Agent Simulation**: Run autonomous simulations where multiple agents interact with each other based on an initial topic.
*   **Tool Library & Function Calling**:
    *   Extend agent capabilities with **builtin tools** (e.g., Calculator) or custom **API tools** (webhooks).
    *   Create, edit, and manage all tools in a central library.
    *   Assign specific tools to each agent.
    *   Test tool functionality with a live testing modal.
*   **Flight Recorder (Execution Logs)**:
    *   A detailed, real-time log of all agent activities.
    *   Inspect the agent's full chain-of-thought, tool calls (with inputs/outputs), and final responses.
    *   Provides a tabular view with searching and sorting for easy analysis.
*   **Tool Usage History**: View a complete log of all historical calls for each specific tool.

## Architecture

The platform is built with a modern web stack:

*   **Backend**:
    *   **Framework**: FastAPI (Python)
    *   **Database**: PostgreSQL
    *   **ORM**: SQLAlchemy
    *   **AI Integration**: `google-genai` for function calling and chat completion.
    *   **Async**: `asyncio` for non-blocking execution.
*   **Frontend**:
    *   **Framework**: React (Vite)
    *   **UI Library**: Material UI (MUI)
    *   **State Management**: Zustand
    *   **API Client**: Axios
*   **Containerization**: Docker & Docker Compose for a unified development environment.

## Getting Started

### Prerequisites

*   Docker and Docker Compose
*   A Google Gemini API Key

### Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd agentic2
    ```

2.  **Configure Environment**:
    *   Create a `.env` file in the root of the project.
    *   Add your Gemini API key to it:
        ```
        GOOGLE_API_KEY=your_api_key_here
        ```

3.  **Run the Application**:
    ```bash
    docker-compose up -d --build
    ```
    This will build the backend and frontend containers and start the database and Redis services.

4.  **Access the Application**:
    *   **Frontend**: `http://localhost:5173`
    *   **Backend API Docs**: `http://localhost:8000/docs`

5.  **Seed Initial Data**:
    *   Navigate to the **Tools** page in the UI.
    *   Click **"Seed Built-in Tools"** to populate the library with the default `calculator` and `get_current_time` tools.

## How to Use

1.  **Register an Account**: Create a user on the registration page.
2.  **Create an Agent**: Go to the Dashboard and create your first agent. Configure its name, purpose, and personality.
3.  **Add Tools**:
    *   Navigate to the **Tools** page.
    *   Click **"Create Custom Tool (API)"** to define a new tool that calls an external webhook.
    *   Go to your agent's **Manage** page and enable the tools you want it to use.
4.  **Chat with the Agent**: Start a new chat session and test its capabilities, including its ability to use the tools you've assigned.
5.  **Run a Simulation**: From the dashboard, select two or more agents, provide an initial topic, and start a simulation to see them interact.
6.  **Inspect Behavior**: Go to the **Flight Recorder** page to see a detailed, searchable log of every action your agents take.
