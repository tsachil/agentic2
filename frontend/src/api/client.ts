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
}

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

// Simulation API
export interface SimulationMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  content: string;
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

export const getSimulation = async (id: string) => {
  const response = await apiClient.get<Simulation>(`/simulations/${id}`);
  return response.data;
};

export const stepSimulation = async (id: string) => {
  const response = await apiClient.post<SimulationMessage>(`/simulations/${id}/step`);
  return response.data;
};
