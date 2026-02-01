import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, users, agents, simulation, logs, tools
from .database import engine, Base

# Create tables (For dev only - use Alembic in prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic Platform API", version="0.1.0")

# Configure CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(agents.router)
app.include_router(simulation.router)
app.include_router(logs.router)
app.include_router(tools.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Agentic Platform API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
