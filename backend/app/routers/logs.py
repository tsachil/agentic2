from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/logs",
    tags=["Logs"]
)

@router.get("/", response_model=List[schemas.AgentExecutionLogResponse])
def read_logs(
    skip: int = 0, 
    limit: int = 50, 
    agent_id: Optional[str] = None,
    simulation_id: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.AgentExecutionLog)
    
    # Filter by ownership (via agent)
    query = query.join(models.Agent).filter(models.Agent.owner_id == current_user.id)
    
    if agent_id:
        query = query.filter(models.AgentExecutionLog.agent_id == agent_id)
    if simulation_id:
        query = query.filter(models.AgentExecutionLog.simulation_id == simulation_id)
    if session_id:
        query = query.filter(models.AgentExecutionLog.session_id == session_id)
        
    logs = query.order_by(models.AgentExecutionLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs

@router.get("/{log_id}", response_model=schemas.AgentExecutionLogResponse)
def read_log(
    log_id: str, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    log = db.query(models.AgentExecutionLog).join(models.Agent).filter(
        models.AgentExecutionLog.id == log_id,
        models.Agent.owner_id == current_user.id
    ).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    return log
