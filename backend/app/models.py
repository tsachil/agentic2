from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SqEnum, Text, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
from .database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"

class ToolType(str, enum.Enum):
    BUILTIN = "builtin"
    API = "api"

# Many-to-Many link
agent_tool_association = Table(
    'agent_tool_association',
    Base.metadata,
    Column('agent_id', String, ForeignKey('agents.id'), primary_key=True),
    Column('tool_id', String, ForeignKey('tools.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SqEnum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    agents = relationship("Agent", back_populates="owner")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    purpose = Column(Text)
    
    # Configuration JSON fields
    personality_config = Column(JSON, default={})
    knowledge_config = Column(JSON, default={})
    capabilities = Column(JSON, default=[])
    
    status = Column(SqEnum(AgentStatus), default=AgentStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    version = Column(Integer, default=1)

    owner = relationship("User", back_populates="agents")
    tools = relationship("Tool", secondary=agent_tool_association, back_populates="agents")

class Tool(Base):
    __tablename__ = "tools"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    type = Column(SqEnum(ToolType), default=ToolType.BUILTIN)
    
    # JSON Schema for parameters
    parameter_schema = Column(JSON, default={})
    
    # Configuration (URL, Method, Headers for API tools)
    configuration = Column(JSON, default={})
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    agents = relationship("Agent", secondary=agent_tool_association, back_populates="tools")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    status = Column(String, default="active") # active, paused, completed
    agent_ids = Column(JSON) # List of agent IDs participating
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    messages = relationship("SimulationMessage", back_populates="simulation", cascade="all, delete-orphan", order_by="SimulationMessage.created_at")

class SimulationMessage(Base):
    __tablename__ = "simulation_messages"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(String, ForeignKey("simulations.id"), index=True)
    sender_id = Column(String) # Agent ID or 'user'
    sender_name = Column(String)
    content = Column(Text)
    tool_calls = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    simulation = relationship("Simulation", back_populates="messages")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("agents.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String) # E.g., "Chat started at..." or summary
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String) # 'user' or 'assistant'
    content = Column(Text)
    tool_calls = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")

class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, ForeignKey("agents.id"), index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=True)
    simulation_id = Column(String, ForeignKey("simulations.id"), nullable=True)
    
    prompt_context = Column(JSON)  # Stores system prompt, history, user input
    raw_response = Column(Text)    # Full raw response from LLM
    thought_process = Column(Text) # Extracted chain of thought
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    agent = relationship("Agent")

    @property
    def tool_events(self):
        return self.prompt_context.get("tool_events", []) if self.prompt_context else []
