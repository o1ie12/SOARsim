"""
SOARSim Backend — FastAPI Application.

Entry point for the rocket flight simulation API server.

Run with:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.validation.routes import router as validation_router
from app.workspace.routes import router as workspace_router
from app.analysis.routes import router as analysis_router

app = FastAPI(
    title="SOARSim API",
    description="Physics-Based Rocket Flight Simulator — Backend API",
    version="2.0.0",
)

# Allow cross-origin requests from the frontend development server
# In production, restrict this to the actual frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
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
    return {"status": "healthy", "version": "2.0.0"}
