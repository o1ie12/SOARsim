"""Workspace API routes for SOARSim v1.0.

Provides REST endpoints for:
    - Rocket library CRUD (create, read, update, delete, duplicate, search)
    - Simulation history (auto-save, list, filter, search)
    - Validation history (list, filter)
    - Project export/import (.soarsim files)
    - Comparison mode (side-by-side rocket analysis)
    - Engineering reports (generate, export, list)
    - Dashboard data (recent activity summary)
    - Tags management
    - Search across all entities

Design decisions:
    - All storage is local JSON files (no database, no user accounts)
    - Routes are organized by domain, not HTTP method
    - Response models match frontend TypeScript interfaces
    - Error responses use consistent format
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.workspace.history import HistoryStore, SimulationRecord, ValidationRecord
from app.workspace.projects import ProjectManager, compare_rockets
from app.workspace.reports import ReportGenerator
from app.workspace.rocket_library import RocketLibrary

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

# ── Initialize stores ─────────────────────────────────────────────

_data_dir = Path.home() / ".soarsim" / "workspace"
rocket_lib = RocketLibrary(_data_dir)
history = HistoryStore(_data_dir)
projects = ProjectManager(rocket_lib, history, _data_dir)
reports = ReportGenerator(_data_dir)


# ══════════════════════════════════════════════════════════════════
# ROCKET LIBRARY
# ══════════════════════════════════════════════════════════════════


@router.get("/rockets", summary="List all rockets")
async def list_rockets(
    query: Optional[str] = None,
    tags: Optional[str] = None,
    favorites: bool = False,
) -> dict:
    """List all rocket designs with optional filtering."""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    rockets = rocket_lib.search(query=query, tags=tag_list, favorites_only=favorites)
    return {"rockets": [r.to_dict() for r in rockets], "total": len(rockets)}


@router.post("/rockets", summary="Create a new rocket")
async def create_rocket(data: dict) -> dict:
    """Create a new rocket design."""
    rocket = rocket_lib.create(
        name=data.get("name", "Untitled Rocket"),
        description=data.get("description", ""),
        tags=data.get("tags", []),
        drag_coefficient=data.get("dragCoefficient", 0.45),
        cross_sectional_area=data.get("crossSectionalArea", 0.008),
        propulsion_type=data.get("propulsionType", "water"),
        dry_mass=data.get("dryMass", 0.15),
        bottle_volume=data.get("bottleVolume", 0.002),
        water_volume=data.get("waterVolume", 0.0007),
        initial_pressure=data.get("initialPressure", 400000),
        nozzle_diameter=data.get("nozzleDiameter", 0.013),
        launch_angle=data.get("launchAngle", 75),
    )
    return {"rocket": rocket.to_dict()}


@router.get("/rockets/{rocket_id}", summary="Get a rocket")
async def get_rocket(rocket_id: str) -> dict:
    """Get a specific rocket design."""
    rocket = rocket_lib.get(rocket_id)
    if rocket is None:
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return {"rocket": rocket.to_dict()}


@router.put("/rockets/{rocket_id}", summary="Update a rocket")
async def update_rocket(rocket_id: str, data: dict) -> dict:
    """Update fields on a rocket design."""
    # Map camelCase frontend fields to snake_case
    field_map = {
        "name": "name",
        "description": "description",
        "tags": "tags",
        "dragCoefficient": "drag_coefficient",
        "crossSectionalArea": "cross_sectional_area",
        "propulsionType": "propulsion_type",
        "dryMass": "dry_mass",
        "bottleVolume": "bottle_volume",
        "waterVolume": "water_volume",
        "initialPressure": "initial_pressure",
        "nozzleDiameter": "nozzle_diameter",
        "launchAngle": "launch_angle",
    }
    updates = {}
    for frontend_key, backend_key in field_map.items():
        if frontend_key in data:
            updates[backend_key] = data[frontend_key]

    rocket = rocket_lib.update(rocket_id, **updates)
    if rocket is None:
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return {"rocket": rocket.to_dict()}


@router.delete("/rockets/{rocket_id}", summary="Delete a rocket")
async def delete_rocket(rocket_id: str) -> dict:
    """Delete a rocket design."""
    if not rocket_lib.delete(rocket_id):
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return {"status": "deleted", "id": rocket_id}


@router.post("/rockets/{rocket_id}/duplicate", summary="Duplicate a rocket")
async def duplicate_rocket(rocket_id: str, data: dict = None) -> dict:
    """Create a copy of a rocket design."""
    new_name = (data or {}).get("name")
    rocket = rocket_lib.duplicate(rocket_id, new_name=new_name)
    if rocket is None:
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return {"rocket": rocket.to_dict()}


@router.post("/rockets/{rocket_id}/favorite", summary="Toggle favorite")
async def toggle_favorite(rocket_id: str) -> dict:
    """Toggle the favorite status of a rocket."""
    rocket = rocket_lib.toggle_favorite(rocket_id)
    if rocket is None:
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return {"rocket": rocket.to_dict()}


@router.get("/rockets/{rocket_id}/export", summary="Export a rocket")
async def export_rocket(rocket_id: str) -> dict:
    """Export a rocket design as a portable dict."""
    data = rocket_lib.export_rocket(rocket_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Rocket {rocket_id} not found")
    return data


@router.post("/rockets/import", summary="Import a rocket")
async def import_rocket(data: dict) -> dict:
    """Import a rocket design from a portable dict."""
    rocket = rocket_lib.import_rocket(data)
    if rocket is None:
        raise HTTPException(status_code=400, detail="Invalid rocket data")
    return {"rocket": rocket.to_dict()}


@router.get("/tags", summary="List all tags")
async def list_tags() -> dict:
    """Get all unique tags across all rockets."""
    return {"tags": rocket_lib.get_all_tags()}


# ══════════════════════════════════════════════════════════════════
# SIMULATION HISTORY
# ══════════════════════════════════════════════════════════════════


@router.post("/simulations", summary="Save a simulation record")
async def save_simulation(data: dict) -> dict:
    """Save a simulation run to history."""
    record = SimulationRecord(
        rocket_id=data.get("rocketId"),
        rocket_name=data.get("rocketName", "Untitled"),
        request=data.get("request", {}),
        max_altitude=data.get("maxAltitude", 0),
        max_velocity=data.get("maxVelocity", 0),
        max_acceleration=data.get("maxAcceleration", 0),
        flight_time=data.get("flightTime", 0),
        weather=data.get("weather", {}),
        tags=data.get("tags", []),
        notes=data.get("notes", ""),
    )
    saved = history.save_simulation(record)
    return {"simulation": saved.to_dict()}


@router.get("/simulations", summary="List simulation history")
async def list_simulations(
    rocket_id: Optional[str] = None,
    tags: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List simulation records with optional filters."""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    records = history.list_simulations(
        rocket_id=rocket_id,
        tags=tag_list,
        query=query,
        limit=limit,
        offset=offset,
    )
    return {
        "simulations": [r.to_dict() for r in records],
        "total": history.count_simulations(),
    }


@router.delete("/simulations/{sim_id}", summary="Delete a simulation")
async def delete_simulation(sim_id: str) -> dict:
    """Delete a simulation record."""
    if not history.delete_simulation(sim_id):
        raise HTTPException(status_code=404, detail=f"Simulation {sim_id} not found")
    return {"status": "deleted", "id": sim_id}


# ══════════════════════════════════════════════════════════════════
# VALIDATION HISTORY
# ══════════════════════════════════════════════════════════════════


@router.post("/validations", summary="Save a validation record")
async def save_validation(data: dict) -> dict:
    """Save a validation run to history."""
    record = ValidationRecord(
        simulation_id=data.get("simulationId"),
        flight_id=data.get("flightId"),
        predicted=data.get("predicted", {}),
        actual=data.get("actual", {}),
        metrics=data.get("metrics", []),
        summary=data.get("summary", {}),
        notes=data.get("notes", []),
    )
    saved = history.save_validation(record)
    return {"validation": saved.to_dict()}


@router.get("/validations", summary="List validation history")
async def list_validations(
    simulation_id: Optional[str] = None,
    flight_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """List validation records with optional filters."""
    records = history.list_validations(
        simulation_id=simulation_id,
        flight_id=flight_id,
        limit=limit,
        offset=offset,
    )
    return {
        "validations": [r.to_dict() for r in records],
        "total": history.count_validations(),
    }


@router.delete("/validations/{val_id}", summary="Delete a validation")
async def delete_validation(val_id: str) -> dict:
    """Delete a validation record."""
    if not history.delete_validation(val_id):
        raise HTTPException(status_code=404, detail=f"Validation {val_id} not found")
    return {"status": "deleted", "id": val_id}


# ══════════════════════════════════════════════════════════════════
# COMPARISON
# ══════════════════════════════════════════════════════════════════


@router.post("/compare", summary="Compare rocket designs")
async def compare(data: dict) -> dict:
    """Compare multiple rocket designs side-by-side."""
    rocket_ids = data.get("rocketIds", [])
    if len(rocket_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 rockets required for comparison")

    designs = []
    for rid in rocket_ids:
        rocket = rocket_lib.get(rid)
        if rocket is None:
            raise HTTPException(status_code=404, detail=f"Rocket {rid} not found")
        designs.append(rocket)

    result = compare_rockets(designs)
    return {
        "rocketIds": result.rocket_ids,
        "rocketNames": result.rocket_names,
        "metrics": [
            {
                "metricName": m.metric_name,
                "unit": m.unit,
                "values": m.values,
                "bestRocketId": m.best_rocket_id,
            }
            for m in result.metrics
        ],
        "summaryNotes": result.summary_notes,
    }


# ══════════════════════════════════════════════════════════════════
# PROJECTS (.soarsim files)
# ══════════════════════════════════════════════════════════════════


@router.post("/projects/export", summary="Export a project")
async def export_project(data: dict) -> dict:
    """Export selected rockets and history into a .soarsim project file."""
    rocket_ids = data.get("rocketIds", [])
    name = data.get("name", "Untitled Project")
    description = data.get("description", "")

    result = projects.export_project(rocket_ids, name=name, description=description)
    if result is None:
        raise HTTPException(status_code=400, detail="No valid rockets found for export")
    return result


@router.post("/projects/import", summary="Import a project")
async def import_project(data: dict) -> dict:
    """Import a .soarsim project file."""
    result = projects.import_project(data)
    if result is None:
        raise HTTPException(status_code=400, detail="Invalid project data")
    return {"project": result.to_dict()}


@router.get("/projects", summary="List saved projects")
async def list_projects() -> dict:
    """List all saved project files."""
    return {"projects": projects.list_projects()}


# ══════════════════════════════════════════════════════════════════
# ENGINEERING REPORTS
# ══════════════════════════════════════════════════════════════════


@router.post("/reports", summary="Generate an engineering report")
async def generate_report(data: dict) -> dict:
    """Generate a new engineering report from simulation data."""
    report = reports.create_report(
        rocket_name=data.get("rocketName", "Untitled"),
        rocket_id=data.get("rocketId"),
        simulation_request=data.get("simulationRequest", {}),
        simulation_summary=data.get("simulationSummary", {}),
        trajectory=data.get("trajectory"),
        validation=data.get("validation"),
        notes=data.get("notes"),
    )
    return {"report": report.to_dict()}


@router.get("/reports", summary="List reports")
async def list_reports() -> dict:
    """List all saved engineering reports."""
    all_reports = reports.list_reports()
    return {"reports": [r.to_dict() for r in all_reports], "total": len(all_reports)}


@router.get("/reports/{report_id}", summary="Get a report")
async def get_report(report_id: str) -> dict:
    """Get a specific report."""
    report = reports.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return {"report": report.to_dict()}


@router.get("/reports/{report_id}/html", summary="Export report as HTML")
async def export_report_html(report_id: str) -> HTMLResponse:
    """Export a report as self-contained HTML for printing to PDF."""
    report = reports.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    html = reports.export_html(report)
    return HTMLResponse(content=html)


@router.get("/reports/{report_id}/markdown", summary="Export report as Markdown")
async def export_report_markdown(report_id: str) -> dict:
    """Export a report as Markdown."""
    report = reports.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return {"markdown": reports.export_markdown(report)}


@router.delete("/reports/{report_id}", summary="Delete a report")
async def delete_report(report_id: str) -> dict:
    """Delete a report."""
    if not reports.delete_report(report_id):
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return {"status": "deleted", "id": report_id}


# ══════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════


@router.get("/dashboard", summary="Get dashboard data")
async def get_dashboard() -> dict:
    """Get summary data for the home dashboard."""
    rockets = rocket_lib.list_all()
    simulations = history.list_simulations(limit=10)
    validations = history.list_validations(limit=10)
    all_reports = reports.list_reports()

    return {
        "recentRockets": [r.to_dict() for r in rockets[:6]],
        "recentSimulations": [s.to_dict() for s in simulations[:6]],
        "recentValidations": [v.to_dict() for v in validations[:6]],
        "recentReports": [r.to_dict() for r in all_reports[:6]],
        "favoriteRockets": [r.to_dict() for r in rockets if r.is_favorite][:6],
        "stats": {
            "totalRockets": len(rockets),
            "totalSimulations": history.count_simulations(),
            "totalValidations": history.count_validations(),
            "totalReports": len(all_reports),
        },
    }


# ══════════════════════════════════════════════════════════════════
# GLOBAL SEARCH
# ══════════════════════════════════════════════════════════════════


@router.get("/search", summary="Search across all entities")
async def global_search(q: str = "") -> dict:
    """Search across rockets, simulations, validations, and reports."""
    if not q.strip():
        return {"rockets": [], "simulations": [], "validations": [], "reports": []}

    ql = q.lower()

    # Search rockets
    matching_rockets = [
        r.to_dict() for r in rocket_lib.search(query=q)
    ]

    # Search simulations
    all_sims = history.list_simulations(limit=1000)
    matching_sims = [
        s.to_dict() for s in all_sims
        if ql in s.rocket_name.lower() or ql in s.notes.lower()
    ]

    # Search reports
    all_reports = reports.list_reports()
    matching_reports = [
        r.to_dict() for r in all_reports
        if ql in r.title.lower() or ql in r.rocket_name.lower()
    ]

    return {
        "rockets": matching_rockets[:20],
        "simulations": matching_sims[:20],
        "reports": matching_reports[:20],
    }
