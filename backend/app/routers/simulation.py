from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session, subqueryload
from typing import List, Tuple, Optional
from .. import database, models, schemas, auth, execution

router = APIRouter(
    prefix="/simulations",
    tags=["Simulations"]
)

@router.post("/", response_model=schemas.SimulationResponse)
def create_simulation(
    sim_data: schemas.SimulationCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify agents exist and belong to user
    agents = db.query(models.Agent).filter(
        models.Agent.id.in_(sim_data.agent_ids),
        models.Agent.owner_id == current_user.id
    ).all()
    
    if len(agents) != len(sim_data.agent_ids):
        raise HTTPException(status_code=400, detail="One or more agents not found")

    new_sim = models.Simulation(
        name=sim_data.name,
        agent_ids=sim_data.agent_ids,
        owner_id=current_user.id
    )
    db.add(new_sim)
    db.commit()
    db.refresh(new_sim)

    # Add initial system message/topic
    initial_msg = models.SimulationMessage(
        simulation_id=new_sim.id,
        sender_id="system",
        sender_name="System",
        content=f"Topic: {sim_data.initial_topic}"
    )
    db.add(initial_msg)
    db.commit()
    db.refresh(new_sim)
    
    return new_sim

@router.get("/", response_model=List[schemas.SimulationResponse])
def get_simulations(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Eagerly load messages to avoid N+1 problem
    sims = db.query(models.Simulation).options(subqueryload(models.Simulation.messages)).filter(
        models.Simulation.owner_id == current_user.id
    ).order_by(models.Simulation.updated_at.desc()).all()
    return sims

@router.get("/{sim_id}", response_model=schemas.SimulationResponse)
def get_simulation(
    sim_id: str, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    sim = db.query(models.Simulation).filter(
        models.Simulation.id == sim_id,
        models.Simulation.owner_id == current_user.id
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim

def get_simulation_context(db: Session, sim_id: str, user_id: int) -> Tuple[Optional[models.Simulation], Optional[models.Agent], List[models.SimulationMessage]]:
    sim = db.query(models.Simulation).filter(
        models.Simulation.id == sim_id,
        models.Simulation.owner_id == user_id
    ).first()

    if not sim:
        return None, None, []

    # Simple Round-Robin Logic
    # 1. Get last message to see who spoke
    last_msg = db.query(models.SimulationMessage).filter(
        models.SimulationMessage.simulation_id == sim_id
    ).order_by(models.SimulationMessage.created_at.desc()).first()

    # 2. Determine next agent
    next_agent_id = sim.agent_ids[0]
    if last_msg and last_msg.sender_id in sim.agent_ids:
        try:
            current_idx = sim.agent_ids.index(last_msg.sender_id)
            next_agent_id = sim.agent_ids[(current_idx + 1) % len(sim.agent_ids)]
        except ValueError:
            pass # Default to first agent
            
    agent = db.query(models.Agent).filter(models.Agent.id == next_agent_id).first()
    
    # 3. Construct context from previous messages
    # We'll take the last 10 messages for context
    recent_messages = db.query(models.SimulationMessage).filter(
        models.SimulationMessage.simulation_id == sim_id
    ).order_by(models.SimulationMessage.created_at.asc()).limit(10).all()
    
    return sim, agent, recent_messages

def save_simulation_message(db: Session, sim_id: str, agent_id: str, agent_name: str, content: str) -> models.SimulationMessage:
    new_msg = models.SimulationMessage(
        simulation_id=sim_id,
        sender_id=agent_id,
        sender_name=agent_name,
        content=content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.post("/{sim_id}/step", response_model=schemas.SimulationMessageResponse)
async def step_simulation(
    sim_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    sim, agent, recent_messages = await run_in_threadpool(get_simulation_context, db, sim_id, current_user.id)

    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    if not agent:
         # Should not happen if logic is correct but safe handling
         raise HTTPException(status_code=500, detail="Could not determine next agent")

    # Format history for the agent
    history_prompt = "Conversation History:\n" + "".join(
        f"{msg.sender_name}: {msg.content}\n" for msg in recent_messages
    )
    
    # Execution
    # We treat the history as the user prompt context
    response_text = await execution.execution_service.execute_agent_async(
        agent, 
        user_prompt=f"{history_prompt}\nResponse as {agent.name}:",
        history=[] # We provide context in the prompt itself for multi-agent simulation for simplicity
    )
    
    # 4. Save response
    new_msg = await run_in_threadpool(
        save_simulation_message,
        db,
        sim.id,
        agent.id,
        agent.name,
        response_text
    )
    
    return new_msg
