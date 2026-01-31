import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, users, agents, simulation
from .database import engine, Base

# Create tables (For dev only - use Alembic in prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic Platform API", version="0.1.0")

# Configure CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the Agentic Platform API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
