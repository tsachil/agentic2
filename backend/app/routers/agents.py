from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth, execution

router = APIRouter(
    prefix="/agents",
    tags=["Agents"]
)

@router.post("/{agent_id}/execute", response_model=schemas.ChatResponse)
async def execute_agent(
    agent_id: str, 
    request: schemas.PromptRequest, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Save User Message
    user_msg = models.ChatMessage(agent_id=agent_id, role="user", content=request.prompt)
    db.add(user_msg)
    
    # Execute
    # We fetch full history from DB + current prompt to maintain context
    db_history = db.query(models.ChatMessage).filter(models.ChatMessage.agent_id == agent_id).order_by(models.ChatMessage.created_at.asc()).all()
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in db_history]
    
    response_text = await execution.execution_service.execute_agent(agent, request.prompt, history_dicts)
    
    # Save Assistant Message
    assistant_msg = models.ChatMessage(agent_id=agent_id, role="assistant", content=response_text)
    db.add(assistant_msg)
    db.commit()
    
    return {"response": response_text}

@router.get("/{agent_id}/history", response_model=List[schemas.ChatMessageResponse])
def get_agent_history(
    agent_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    messages = db.query(models.ChatMessage).filter(models.ChatMessage.agent_id == agent_id).order_by(models.ChatMessage.created_at.asc()).all()
    return messages

@router.post("/", response_model=schemas.AgentResponse)
def create_agent(agent: schemas.AgentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_agent = models.Agent(
        **agent.model_dump(),
        owner_id=current_user.id
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@router.get("/", response_model=List[schemas.AgentResponse])
def read_agents(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    agents = db.query(models.Agent).filter(models.Agent.owner_id == current_user.id).offset(skip).limit(limit).all()
    return agents

@router.get("/{agent_id}", response_model=schemas.AgentResponse)
def read_agent(agent_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=schemas.AgentResponse)
def update_agent(agent_id: str, agent_update: schemas.AgentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    update_data = agent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_agent, key, value)
    
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if db_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db.delete(db_agent)
    db.commit()
    return None
