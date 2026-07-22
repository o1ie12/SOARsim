"""
SOARSim v0.5 Workspace Module.

Provides rocket library management, project storage, simulation history,
validation history, and engineering report generation.

Design decisions:
    - All persistence uses local JSON files (no user accounts, no database)
    - Workspace is independent from the simulation engine
    - Clean separation between storage and physics
"""
