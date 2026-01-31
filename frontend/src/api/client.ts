import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const checkHealth = async () => {
  const response = await apiClient.get('/');
  return response.data;
};

// Agent API
export interface Agent {
  id: string;
  name: string;
  description?: string;
  purpose?: string;
  personality_config?: {
    formality?: number;
    verbosity?: number;
    creativity?: number;
    empathy?: number;
    assertiveness?: number;
  };
  status: string;
  created_at: string;
  tools?: Tool[];
}

// Tool API
export interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'builtin' | 'api';
  parameter_schema: any;
  configuration: any;
  is_active: boolean;
  created_at: string;
}

export interface ToolCreate {
  name: string;
  description: string;
  type: 'builtin' | 'api';
  parameter_schema: any;
  configuration: any;
}

export const getTools = async () => {
  const response = await apiClient.get<Tool[]>('/tools/');
  return response.data;
};

export const createTool = async (tool: ToolCreate) => {
  const response = await apiClient.post<Tool>('/tools/', tool);
  return response.data;
};

export const updateTool = async (id: string, tool: ToolCreate) => {
  const response = await apiClient.put<Tool>(`/tools/${id}`, tool);
  return response.data;
};

export const deleteTool = async (id: string) => {
  await apiClient.delete(`/tools/${id}`);
};

export const seedTools = async () => {
  await apiClient.post('/tools/seed');
};

export const addToolToAgent = async (agentId: string, toolId: string) => {
  await apiClient.post(`/agents/${agentId}/tools/${toolId}`);
};

export const removeToolFromAgent = async (agentId: string, toolId: string) => {
  await apiClient.delete(`/agents/${agentId}/tools/${toolId}`);
};

export const getAgentTools = async (agentId: string) => {
  const response = await apiClient.get<Tool[]>(`/agents/${agentId}/tools`);
  return response.data;
};

export interface ToolExecutionLog {
  tool_name: string;
  agent_id: string;
  input_args: any;
  output_result: string;
  created_at: string;
  execution_time_ms: number;
}

export const getToolLogs = async (toolId: string) => {
  const response = await apiClient.get<ToolExecutionLog[]>(`/tools/${toolId}/logs`);
  return response.data;
};

export const testTool = async (toolId: string, arguments_payload: any) => {
  const response = await apiClient.post<{result: string}>(`/tools/${toolId}/test`, arguments_payload);
  return response.data;
};

export interface AgentCreate {
  name: string;
  description?: string;
  purpose?: string;
  personality_config?: {
    formality?: number;
    verbosity?: number;
    creativity?: number;
    empathy?: number;
    assertiveness?: number;
  };
}

export const getAgents = async () => {
  const response = await apiClient.get<Agent[]>('/agents/');
  return response.data;
};

export const getAgent = async (id: string) => {
  const response = await apiClient.get<Agent>(`/agents/${id}`);
  return response.data;
};

export const createAgent = async (agent: AgentCreate) => {
  const response = await apiClient.post<Agent>('/agents/', agent);
  return response.data;
};

export const updateAgent = async (id: string, agent: AgentCreate) => {
  const response = await apiClient.put<Agent>(`/agents/${id}`, agent);
  return response.data;
};

export const deleteAgent = async (id: string) => {
  await apiClient.delete(`/agents/${id}`);
};

export const executeAgent = async (id: string, prompt: string, history: {role: string, content: string}[]) => {
  const response = await apiClient.post<{response: string}>(`/agents/${id}/execute`, {
    prompt,
    history
  });
  return response.data;
};

export const getAgentHistory = async (id: string) => {
  const response = await apiClient.get<{role: string, content: string}[]>(`/agents/${id}/history`);
  return response.data;
};

// Session API
export interface ChatSession {
  id: string;
  agent_id: string;
  name: string;
  created_at: string;
}

export const createSession = async (agentId: string) => {
  const response = await apiClient.post<ChatSession>(`/agents/${agentId}/sessions`);
  return response.data;
};

export const getSessions = async (agentId: string) => {
  const response = await apiClient.get<ChatSession[]>(`/agents/${agentId}/sessions`);
  return response.data;
};

export const executeSessionChat = async (sessionId: string, prompt: string) => {
  const response = await apiClient.post<{response: string, tool_calls?: any[]}>(`/agents/sessions/${sessionId}/execute`, {
    prompt
  });
  return response.data;
};

export const getSessionHistory = async (sessionId: string) => {
  const response = await apiClient.get<{role: string, content: string, tool_calls?: any[]}[]>(`/agents/sessions/${sessionId}/history`);
  return response.data;
};

// Simulation API
export interface SimulationMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  content: string;
  tool_calls?: any[];
  created_at: string;
}

export interface Simulation {
  id: string;
  name: string;
  status: string;
  messages: SimulationMessage[];
  agent_ids: string[];
}

export const createSimulation = async (name: string, agent_ids: string[], initial_topic: string) => {
  const response = await apiClient.post<Simulation>('/simulations/', {
    name,
    agent_ids,
    initial_topic
  });
  return response.data;
};

export const getSimulations = async () => {
  const response = await apiClient.get<Simulation[]>('/simulations/');
  return response.data;
};

export const getSimulation = async (id: string) => {
  const response = await apiClient.get<Simulation>(`/simulations/${id}`);
  return response.data;
};

export const stepSimulation = async (id: string) => {
  const response = await apiClient.post<SimulationMessage>(`/simulations/${id}/step`);
  return response.data;
};

// Logs API
export interface AgentExecutionLog {
  id: string;
  agent_id: string;
  session_id?: string;
  simulation_id?: string;
  prompt_context: {
    system_prompt: string;
    history: {role: string, content: string}[];
    user_prompt: string;
  };
  raw_response: string;
  thought_process?: string;
  tool_events?: {
    tool: string;
    input: any;
    output: string;
  }[];
  execution_time_ms: number;
  created_at: string;
}

export const getLogs = async (params?: { agent_id?: string; simulation_id?: string; session_id?: string; skip?: number; limit?: number }) => {
  const response = await apiClient.get<AgentExecutionLog[]>('/logs/', { params });
  return response.data;
};

export const getLog = async (id: string) => {
  const response = await apiClient.get<AgentExecutionLog>(`/logs/${id}`);
  return response.data;
};
