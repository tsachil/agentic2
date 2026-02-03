import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { v4 as uuidv4 } from 'uuid';

const MAX_LOG_STRING = 500;
const redactKeys = new Set(['password', 'token', 'authorization', 'api_key', 'apikey', 'secret', 'access_token', 'refresh_token']);

const scrubValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    Object.keys(value).forEach((k) => {
      out[k] = redactKeys.has(k.toLowerCase()) ? '[REDACTED]' : scrubValue(value[k]);
    });
    return out;
  }
  if (typeof value === 'string') {
    return value.length > MAX_LOG_STRING ? `${value.slice(0, MAX_LOG_STRING)}...` : value;
  }
  return value;
};

const summarizePayload = (data: any) => {
  if (!data) return undefined;
  if (typeof data === 'string') return `${data.length} chars`;
  if (Array.isArray(data)) return `array(${data.length})`;
  if (typeof data === 'object') return `keys(${Object.keys(data).length})`;
  return typeof data;
};

// Simple Log Bridge
const shipLog = (level: 'info' | 'error' | 'debug', message: string, context: any) => {
    // Prevent infinite loop: Don't log the log shipping itself
    if (context.url && context.url.includes('/logs/ingest')) return;

    // Use sendBeacon or simple fetch without waiting for response to avoid blocking
    // We construct the payload manually to avoid using the interceptor-laden client
    const payload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context: scrubValue(context)
    };

    fetch(`${baseURL}/logs/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Failed to ship log", err));
};

apiClient.interceptors.request.use((config) => {
    // Generate Correlation ID if missing
    if (!config.headers['X-Correlation-ID']) {
        config.headers['X-Correlation-ID'] = uuidv4();
    }

    // Ship Log
    shipLog('info', `API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        correlationId: config.headers['X-Correlation-ID'],
        method: config.method,
        url: config.url,
        data: summarizePayload(config.data)
    });
    
    // Console fallback
    console.debug('API Request:', config.method?.toUpperCase(), config.url, config.data);
    
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        shipLog('info', `API Response: ${response.status} ${response.config.url}`, {
            correlationId: response.config.headers['X-Correlation-ID'],
            status: response.status,
            url: response.config.url,
            data: summarizePayload(response.data)
        });

        console.debug('API Response:', response.status, response.config.url, response.data);
        return response;
    },
    (error) => {
        const correlationId = error.config?.headers['X-Correlation-ID'];
        
        if (error.response) {
            shipLog('error', `API Error Response: ${error.response.status}`, {
                correlationId,
                status: error.response.status,
                data: summarizePayload(error.response.data)
            });
            console.error('API Error Response:', error.response.status, error.response.data);
        } else {
            shipLog('error', `API Error: ${error.message}`, { correlationId });
            console.error('API Error:', error.message);
        }
        return Promise.reject(error);
    }
);

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
  request_url?: string;
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
