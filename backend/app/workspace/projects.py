"""
Project Management for SOARSim v0.5.

Handles .soarsim project files — portable bundles containing rockets,
simulation history, validation history, and reports.

Also provides the comparison engine for side-by-side rocket analysis.

Design decisions:
    - .soarsim files are JSON with a clear schema
    - Projects are self-contained: all data travels together
    - Comparison is deterministic: no randomness, no external calls
    - Comparison metrics are weighted by engineering significance
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.workspace.history import HistoryStore, SimulationRecord, ValidationRecord
from app.workspace.rocket_library import RocketDesign, RocketLibrary

DEFAULT_DATA_DIR = Path.home() / ".soarsim" / "workspace"


@dataclass
class Project:
    """A portable SOARSim project bundle."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = "Untitled Project"
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    modified_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "0.5"

    rockets: list[dict] = field(default_factory=list)
    simulations: list[dict] = field(default_factory=list)
    validations: list[dict] = field(default_factory=list)
    reports: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> Project:
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})


class ProjectManager:
    """Manages .soarsim project files for export and import."""

    def __init__(
        self,
        rocket_lib: Optional[RocketLibrary] = None,
        history: Optional[HistoryStore] = None,
        data_dir: Optional[Path] = None,
    ) -> None:
        self._data_dir = data_dir or DEFAULT_DATA_DIR
        self._projects_dir = self._data_dir / "projects"
        self._projects_dir.mkdir(parents=True, exist_ok=True)
        self._rocket_lib = rocket_lib or RocketLibrary(self._data_dir)
        self._history = history or HistoryStore(self._data_dir)

    def export_project(
        self,
        rocket_ids: list[str],
        name: str = "Untitled Project",
        description: str = "",
    ) -> Optional[dict]:
        """Export selected rockets and their history into a portable project file.

        Args:
            rocket_ids: List of rocket IDs to include.
            name: Project name.
            description: Project description.

        Returns:
            Portable project dict, or None if no valid rockets found.
        """
        rockets = []
        simulations = []
        validations = []

        for rid in rocket_ids:
            rocket = self._rocket_lib.get(rid)
            if rocket is not None:
                rockets.append(rocket.to_dict())
                # Gather simulations linked to this rocket
                sims = self._history.list_simulations(rocket_id=rid)
                simulations.extend([s.to_dict() for s in sims])

        if not rockets:
            return None

        project = Project(
            name=name,
            description=description,
            rockets=rockets,
            simulations=simulations,
            validations=validations,
        )

        return {
            "soarsim_version": "0.5",
            "export_type": "project",
            "exported_at": datetime.now().isoformat(),
            "project": project.to_dict(),
        }

    def import_project(self, data: dict) -> Optional[Project]:
        """Import a project from a portable .soarsim file.

        Creates new IDs for all entities to avoid conflicts.

        Args:
            data: The exported project dict.

        Returns:
            The imported Project, or None if data is invalid.
        """
        if data.get("export_type") != "project":
            return None
        project_data = data.get("project")
        if not project_data:
            return None

        project = Project.from_dict(project_data)
        project.id = uuid.uuid4().hex[:12]
        project.created_at = datetime.now().isoformat()
        project.modified_at = datetime.now().isoformat()

        # Import rockets with new IDs
        imported_rockets = []
        for rocket_data in project.rockets:
            rocket = RocketDesign.from_dict(rocket_data)
            rocket.id = uuid.uuid4().hex[:12]
            rocket.created_at = datetime.now().isoformat()
            rocket.modified_at = datetime.now().isoformat()
            self._rocket_lib._save(rocket)
            imported_rockets.append(rocket.to_dict())
        project.rockets = imported_rockets

        # Import simulations
        imported_sims = []
        for sim_data in project.simulations:
            sim = SimulationRecord.from_dict(sim_data)
            sim.id = uuid.uuid4().hex[:12]
            self._history.save_simulation(sim)
            imported_sims.append(sim.to_dict())
        project.simulations = imported_sims

        return project

    def list_projects(self) -> list[dict]:
        """List all saved project files.

        Returns:
            List of project summary dicts, newest first.
        """
        projects = []
        for path in self._projects_dir.glob("*.json"):
            try:
                with open(path) as f:
                    data = json.load(f)
                if data.get("export_type") == "project":
                    projects.append(data)
            except (json.JSONDecodeError, KeyError):
                continue
        projects.sort(key=lambda p: p.get("exported_at", ""), reverse=True)
        return projects

    def save_project(self, project_data: dict) -> str:
        """Save a project file to disk.

        Returns:
            The project ID.
        """
        project_id = project_data.get("project", {}).get("id", uuid.uuid4().hex[:12])
        path = self._projects_dir / f"{project_id}.json"
        with open(path, "w") as f:
            json.dump(project_data, f, indent=2)
        return project_id


@dataclass(frozen=True)
class ComparisonMetric:
    """A single metric in a rocket comparison."""

    metric_name: str
    unit: str
    values: dict[str, float]  # rocket_id -> value
    best_rocket_id: Optional[str] = None  # which rocket performs best


@dataclass
class ComparisonResult:
    """Full comparison result for multiple rockets."""

    rocket_ids: list[str]
    rocket_names: dict[str, str]
    metrics: list[ComparisonMetric]
    summary_notes: list[str]


def compare_rockets(
    designs: list[RocketDesign],
    simulation_results: Optional[dict[str, dict]] = None,
) -> ComparisonResult:
    """Compare multiple rocket designs side-by-side.

    If simulation_results are provided, compares actual performance.
    Otherwise, compares design parameters.

    Args:
        designs: List of RocketDesigns to compare.
        simulation_results: Optional dict of rocket_id -> simulation summary.

    Returns:
        ComparisonResult with metrics and notes.
    """
    rocket_ids = [d.id for d in designs]
    rocket_names = {d.id: d.name for d in designs}
    metrics: list[ComparisonMetric] = []
    notes: list[str] = []

    if simulation_results:
        # Compare actual simulation performance
        metric_defs = [
            ("Maximum Altitude", "maxAltitude", "m", True),
            ("Maximum Velocity", "maxVelocity", "m/s", True),
            ("Flight Time", "flightTime", "s", True),
            ("Maximum Acceleration", "maxAcceleration", "m/s²", True),
        ]

        for label, key, unit, higher_is_better in metric_defs:
            values = {}
            for rid in rocket_ids:
                if rid in simulation_results and key in simulation_results[rid]:
                    values[rid] = simulation_results[rid][key]

            if values:
                best = max(values, key=values.get) if higher_is_better else min(values, key=values.get)
                metrics.append(ComparisonMetric(
                    metric_name=label, unit=unit, values=values, best_rocket_id=best
                ))
    else:
        # Compare design parameters
        param_defs = [
            ("Drag Coefficient", "drag_coefficient", "Cd", False),
            ("Cross-Sectional Area", "cross_sectional_area", "cm²", False),
            ("Dry Mass", "dry_mass", "kg", False),
            ("Bottle Volume", "bottle_volume", "L", True),
            ("Water Volume", "water_volume", "L", True),
            ("Initial Pressure", "initial_pressure", "bar", True),
            ("Nozzle Diameter", "nozzle_diameter", "mm", True),
            ("Launch Angle", "launch_angle", "°", False),
        ]

        for label, attr, unit, _ in param_defs:
            values = {}
            for d in designs:
                val = getattr(d, attr, None)
                if val is not None:
                    # Convert to display units
                    if attr == "cross_sectional_area":
                        val = val * 10000  # m² to cm²
                    elif attr == "bottle_volume" or attr == "water_volume":
                        val = val * 1000  # m³ to L
                    elif attr == "initial_pressure":
                        val = val / 100000  # Pa to bar
                    elif attr == "nozzle_diameter":
                        val = val * 1000  # m to mm
                    values[d.id] = val
            if values:
                metrics.append(ComparisonMetric(
                    metric_name=label, unit=unit, values=values
                ))

    # Generate summary notes
    if len(designs) < 2:
        notes.append("Select at least two rockets for a meaningful comparison.")
    else:
        notes.append(f"Comparing {len(designs)} rocket designs.")
        if simulation_results:
            notes.append("Comparison based on simulation results.")
        else:
            notes.append("Comparison based on design parameters. Run simulations to compare performance.")

    return ComparisonResult(
        rocket_ids=rocket_ids,
        rocket_names=rocket_names,
        metrics=metrics,
        summary_notes=notes,
    )
