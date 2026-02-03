from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from .models import UserRole, AgentStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Agent Schemas
class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    purpose: Optional[str] = None
    personality_config: Optional[dict] = Field(default_factory=dict)
    
class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: str
    owner_id: int
    status: AgentStatus
    created_at: datetime
    updated_at: Optional[datetime]
    tools: List['ToolResponse'] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)

# Tool Schemas
class ToolBase(BaseModel):
    name: str
    description: str
    type: str
    parameter_schema: Dict[str, Any] = Field(default_factory=dict)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

class ToolCreate(ToolBase):
    pass

class ToolResponse(ToolBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PromptRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: str
    tool_calls: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class ChatSessionBase(BaseModel):
    name: str

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionResponse(ChatSessionBase):
    id: str
    agent_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime
    tool_calls: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)

# Simulation Schemas
class SimulationMessageBase(BaseModel):
    sender_id: str
    sender_name: str
    content: str

class SimulationMessageCreate(SimulationMessageBase):
    pass

class SimulationMessageResponse(SimulationMessageBase):
    id: int
    created_at: datetime
    tool_calls: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)

class SimulationBase(BaseModel):
    name: str
    agent_ids: List[str]

class SimulationCreate(SimulationBase):
    initial_topic: str

class SimulationResponse(SimulationBase):
    id: str
    status: str
    created_at: datetime
    messages: List[SimulationMessageResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)

# Log Schemas
class AgentExecutionLogBase(BaseModel):
    agent_id: str
    session_id: Optional[str] = None
    simulation_id: Optional[str] = None
    prompt_context: Dict[str, Any]
    raw_response: str
    thought_process: Optional[str] = None
    execution_time_ms: int

class AgentExecutionLogCreate(AgentExecutionLogBase):
    pass

class AgentExecutionLogResponse(AgentExecutionLogBase):
    id: str
    created_at: datetime
    tool_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class ToolExecutionLog(BaseModel):
    tool_name: str
    agent_id: str
    input_args: Dict[str, Any]
    output_result: str
    request_url: Optional[str] = None
    created_at: datetime
    execution_time_ms: int = 0
