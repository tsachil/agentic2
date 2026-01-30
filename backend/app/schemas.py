from pydantic import BaseModel, EmailStr, ConfigDict
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
    personality_config: Optional[dict] = {}
    
class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: str
    owner_id: int
    status: AgentStatus
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class PromptRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str

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
    messages: List[SimulationMessageResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
