"""
SOARSim Backend — FastAPI Application.

Entry point for the rocket flight simulation API server.

Run with:
    uvicorn main:app --reload
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.validation.routes import router as validation_router
from app.workspace.routes import router as workspace_router
from app.analysis.routes import router as analysis_router

app = FastAPI(
    title="SOARSim API",
    description="Physics-Based Rocket Flight Simulator — Backend API",
    version="2.0.1",
)

# CORS configuration — origins from environment or sensible defaults
# In production, set CORS_ORIGINS to the frontend URL (comma-separated).
# For Docker Compose, the frontend accesses via http://localhost:3000.
# For Render, set CORS_ORIGINS to your frontend Render URL.
_cors_env = os.environ.get("CORS_ORIGINS", "")
if _cors_env:
    allowed_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    # Default when running locally without the env var
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# Credentials can't be used with a wildcard origin per the CORS spec
_cors_allow_creds = "*" not in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=_cors_allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(validation_router)
app.include_router(workspace_router)
app.include_router(analysis_router)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    """Health check endpoint.

    Returns:
        A simple status response indicating the API is running.
    """
    return {"status": "healthy", "version": "2.0.1"}
