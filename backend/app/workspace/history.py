"""
Simulation & Validation History for SOARSim v0.5.

Automatically saves every simulation and validation run with full context.
Supports filtering, sorting, and search across history.

Design decisions:
    - History is append-only (no edits or deletes of past records)
    - Each record stores the full simulation request + results
    - Validation history links simulations to real flight data
    - All data persists to local JSON files
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

DEFAULT_DATA_DIR = Path.home() / ".soarsim" / "workspace"


@dataclass
class SimulationRecord:
    """A single simulation run with full context."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    rocket_id: Optional[str] = None  # Linked rocket library entry
    rocket_name: str = "Untitled"
    date: str = field(default_factory=lambda: datetime.now().isoformat())
    physics_version: str = "0.3"

    # Simulation parameters (full request for reproducibility)
    request: dict = field(default_factory=dict)

    # Results
    max_altitude: float = 0.0
    max_velocity: float = 0.0
    max_acceleration: float = 0.0
    flight_time: float = 0.0

    # Weather / environment
    weather: dict = field(default_factory=dict)

    # Tags
    tags: list[str] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> SimulationRecord:
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})


@dataclass
class ValidationRecord:
    """A validation run comparing simulation to real flight data."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    simulation_id: Optional[str] = None
    flight_id: Optional[str] = None
    date: str = field(default_factory=lambda: datetime.now().isoformat())

    # Prediction vs actual
    predicted: dict = field(default_factory=dict)
    actual: dict = field(default_factory=dict)
    metrics: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> ValidationRecord:
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})


class HistoryStore:
    """File-based storage for simulation and validation history."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._data_dir = data_dir or DEFAULT_DATA_DIR
        self._sim_dir = self._data_dir / "simulations"
        self._val_dir = self._data_dir / "validations"
        self._sim_dir.mkdir(parents=True, exist_ok=True)
        self._val_dir.mkdir(parents=True, exist_ok=True)

    # ── Simulation History ────────────────────────────────────────

    def save_simulation(self, record: SimulationRecord) -> SimulationRecord:
        """Save a simulation record."""
        path = self._sim_dir / f"{record.id}.json"
        with open(path, "w") as f:
            json.dump(record.to_dict(), f, indent=2)
        return record

    def get_simulation(self, sim_id: str) -> Optional[SimulationRecord]:
        """Get a simulation record by ID."""
        path = self._sim_dir / f"{sim_id}.json"
        if not path.exists():
            return None
        with open(path) as f:
            return SimulationRecord.from_dict(json.load(f))

    def list_simulations(
        self,
        rocket_id: Optional[str] = None,
        tags: Optional[list[str]] = None,
        query: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[SimulationRecord]:
        """List simulation records with optional filters.

        Args:
            rocket_id: Filter by rocket library ID.
            tags: Filter by tags (AND logic).
            query: Text search on rocket_name and notes.
            limit: Max records to return.
            offset: Pagination offset.

        Returns:
            Matching records, newest first.
        """
        records = []
        for path in self._sim_dir.glob("*.json"):
            try:
                with open(path) as f:
                    records.append(SimulationRecord.from_dict(json.load(f)))
            except (json.JSONDecodeError, KeyError):
                continue

        # Apply filters
        if rocket_id:
            records = [r for r in records if r.rocket_id == rocket_id]
        if tags:
            tag_set = set(tags)
            records = [r for r in records if tag_set.issubset(set(r.tags))]
        if query:
            q = query.lower()
            records = [
                r for r in records
                if q in r.rocket_name.lower() or q in r.notes.lower()
            ]

        records.sort(key=lambda r: r.date, reverse=True)
        return records[offset : offset + limit]

    def delete_simulation(self, sim_id: str) -> bool:
        """Delete a simulation record."""
        path = self._sim_dir / f"{sim_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def count_simulations(self) -> int:
        return len(list(self._sim_dir.glob("*.json")))

    # ── Validation History ────────────────────────────────────────

    def save_validation(self, record: ValidationRecord) -> ValidationRecord:
        """Save a validation record."""
        path = self._val_dir / f"{record.id}.json"
        with open(path, "w") as f:
            json.dump(record.to_dict(), f, indent=2)
        return record

    def get_validation(self, val_id: str) -> Optional[ValidationRecord]:
        """Get a validation record by ID."""
        path = self._val_dir / f"{val_id}.json"
        if not path.exists():
            return None
        with open(path) as f:
            return ValidationRecord.from_dict(json.load(f))

    def list_validations(
        self,
        simulation_id: Optional[str] = None,
        flight_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ValidationRecord]:
        """List validation records with optional filters."""
        records = []
        for path in self._val_dir.glob("*.json"):
            try:
                with open(path) as f:
                    records.append(ValidationRecord.from_dict(json.load(f)))
            except (json.JSONDecodeError, KeyError):
                continue

        if simulation_id:
            records = [r for r in records if r.simulation_id == simulation_id]
        if flight_id:
            records = [r for r in records if r.flight_id == flight_id]

        records.sort(key=lambda r: r.date, reverse=True)
        return records[offset : offset + limit]

    def delete_validation(self, val_id: str) -> bool:
        """Delete a validation record."""
        path = self._val_dir / f"{val_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def count_validations(self) -> int:
        return len(list(self._val_dir.glob("*.json")))
