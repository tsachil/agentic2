import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Tool

# Setup DB connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/agentic_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_tool_schema():
    db = SessionLocal()
    try:
        tool = db.query(Tool).filter(Tool.name == "bank_customer_transactions").first()
        if tool:
            print(f"Tool Found: {tool.name}")
            print(f"Schema: {tool.parameter_schema}")
        else:
            print("Tool 'bank_customer_transactions' not found.")
            
        # List all tools and their schema types
        print("\nAll Tools:")
        tools = db.query(Tool).all()
        for t in tools:
            schema_type = t.parameter_schema.get("type", "MISSING")
            print(f"- {t.name}: type={schema_type}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_tool_schema()

