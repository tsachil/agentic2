from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import re
from .. import database, models, schemas, auth, tools_registry

router = APIRouter(
    prefix="/tools",
    tags=["Tools"]
)

@router.get("/", response_model=List[schemas.ToolResponse])
def read_tools(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Tool).all()

@router.post("/{tool_id}/test")
async def test_tool(
    tool_id: str, 
    arguments: dict,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    tool = db.query(models.Tool).filter(models.Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    result = await tools_registry.tool_service.execute_tool(tool, arguments)
    return {"result": result}

@router.post("/", response_model=schemas.ToolResponse)
def create_tool(tool: schemas.ToolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Simple check for duplicates
    existing = db.query(models.Tool).filter(models.Tool.name == tool.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tool name already exists")
    
    # Enforce valid JSON Schema
    tool_data = tool.model_dump()
    if not tool_data.get("parameter_schema"):
        tool_data["parameter_schema"] = {"type": "object", "properties": {}}
        
    new_tool = models.Tool(**tool_data)
    db.add(new_tool)
    db.commit()
    db.refresh(new_tool)
    return new_tool

@router.put("/{tool_id}", response_model=schemas.ToolResponse)
def update_tool(tool_id: str, tool_update: schemas.ToolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_tool = db.query(models.Tool).filter(models.Tool.id == tool_id).first()
    if not db_tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    # Check for name collision if name is changed
    if tool_update.name != db_tool.name:
        existing = db.query(models.Tool).filter(models.Tool.name == tool_update.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tool name already exists")

    # Enforce valid JSON Schema
    tool_data = tool_update.model_dump()
    if not tool_data.get("parameter_schema"):
        tool_data["parameter_schema"] = {"type": "object", "properties": {}}

    for key, value in tool_data.items():
        setattr(db_tool, key, value)

    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tool(tool_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    tool = db.query(models.Tool).filter(models.Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    db.delete(tool)
    db.commit()
    return None

@router.post("/seed")
def seed_tools(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Add initial built-in tools
    builtin_tools = [
        {
            "name": "get_current_time",
            "description": "Get the current time in a specific format.",
            "type": "builtin",
            "parameter_schema": {
                "type": "object",
                "properties": {
                    "format": {
                        "type": "string",
                        "description": "Optional strftime format string."
                    }
                }
            }
        },
        {
            "name": "calculator",
            "description": "Evaluate a mathematical expression. Supports basic operators like +, -, *, /, (, ).",
            "type": "builtin",
            "parameter_schema": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate."
                    }
                },
                "required": ["expression"]
            }
        }
    ]

    for t_data in builtin_tools:
        existing = db.query(models.Tool).filter(models.Tool.name == t_data["name"]).first()
        if not existing:
            tool = models.Tool(**t_data)
            db.add(tool)
    
    db.commit()
    return {"message": "Built-in tools seeded"}

@router.get("/{tool_id}/logs", response_model=List[schemas.ToolExecutionLog])
def get_tool_logs(tool_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    tool = db.query(models.Tool).filter(models.Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    # Query last 200 logs to scan for tool usage
    # Optimization: In prod, use JSON containment query or separate table
    logs = db.query(models.AgentExecutionLog).order_by(models.AgentExecutionLog.created_at.desc()).limit(200).all()
    
    # Sanitize tool name to match what is sent to/from Gemini
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', tool.name)
    
    tool_logs = []
    for log in logs:
        prompt_context = log.prompt_context or {}
        tool_events = prompt_context.get("tool_events", [])
        
        for event in tool_events:
            # Check both original name (just in case) and safe name
            if event.get("tool") == tool.name or event.get("tool") == safe_name:
                tool_logs.append({
                    "tool_name": tool.name,
                    "agent_id": log.agent_id,
                    "input_args": event.get("input", {}),
                    "output_result": str(event.get("output", "")),
                    "created_at": log.created_at,
                    "execution_time_ms": log.execution_time_ms
                })
    
    return tool_logs
