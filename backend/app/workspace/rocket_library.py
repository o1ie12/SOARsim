"""
Rocket Library for SOARSim v0.5.

Provides CRUD operations for managing rocket designs with tags, versioning,
and metadata. All data persists to local JSON files.

Design decisions:
    - Rockets are stored as JSON files in a data directory
    - Each rocket has a unique ID, version number, and timestamps
    - Tags enable flexible categorization (Competition, Prototype, etc.)
    - Favorites are tracked as a simple set of rocket IDs
    - No database dependency — pure file-based persistence
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


DEFAULT_DATA_DIR = Path.home() / ".soarsim" / "workspace"


@dataclass
class RocketDesign:
    """A complete rocket design with all configuration parameters."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = "Untitled Rocket"
    description: str = ""
    tags: list[str] = field(default_factory=list)

    # Rocket geometry / aerodynamics
    drag_coefficient: float = 0.45
    cross_sectional_area: float = 0.008  # m²

    # Propulsion configuration
    propulsion_type: str = "water"
    dry_mass: float = 0.15  # kg
    bottle_volume: float = 0.002  # m³ (2L)
    water_volume: float = 0.0007  # m³ (0.7L)
    initial_pressure: float = 400000  # Pa (4 bar)
    nozzle_diameter: float = 0.013  # m (13mm)

    # Launch defaults
    launch_angle: float = 75  # degrees

    # Metadata
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    modified_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: int = 1
    is_favorite: bool = False

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> RocketDesign:
        """Create from dictionary loaded from JSON."""
        # Filter out unknown keys for forward compatibility
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in known_fields}
        return cls(**filtered)

    def to_simulate_request(self) -> dict:
        """Convert to a SimulateRequest-compatible dict for the simulation API."""
        return {
            "rocket": {
                "dragCoefficient": self.drag_coefficient,
                "crossSectionalArea": self.cross_sectional_area,
            },
            "propulsion": {
                "type": self.propulsion_type,
                "dryMass": self.dry_mass,
                "bottleVolume": self.bottle_volume,
                "waterVolume": self.water_volume,
                "initialPressure": self.initial_pressure,
                "nozzleDiameter": self.nozzle_diameter,
            },
            "launch": {
                "angle": self.launch_angle,
            },
        }


class RocketLibrary:
    """File-based rocket design library with full CRUD and search.

    Stores each rocket as a JSON file in the data directory.
    Supports listing, filtering, searching, and tag management.
    """

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._data_dir = data_dir or DEFAULT_DATA_DIR
        self._rockets_dir = self._data_dir / "rockets"
        self._rockets_dir.mkdir(parents=True, exist_ok=True)

    def _rocket_path(self, rocket_id: str) -> Path:
        return self._rockets_dir / f"{rocket_id}.json"

    def create(
        self,
        name: str = "Untitled Rocket",
        description: str = "",
        tags: Optional[list[str]] = None,
        **kwargs,
    ) -> RocketDesign:
        """Create a new rocket design.

        Args:
            name: Display name for the rocket.
            description: Free-text description.
            tags: Optional list of tag strings.
            **kwargs: Additional fields to set on the rocket.

        Returns:
            The newly created RocketDesign.
        """
        rocket = RocketDesign(name=name, description=description, tags=tags or [])
        for key, value in kwargs.items():
            if hasattr(rocket, key):
                setattr(rocket, key, value)
        self._save(rocket)
        return rocket

    def get(self, rocket_id: str) -> Optional[RocketDesign]:
        """Retrieve a rocket design by ID.

        Args:
            rocket_id: The unique identifier.

        Returns:
            The RocketDesign if found, None otherwise.
        """
        path = self._rocket_path(rocket_id)
        if not path.exists():
            return None
        with open(path) as f:
            data = json.load(f)
        return RocketDesign.from_dict(data)

    def update(self, rocket_id: str, **kwargs) -> Optional[RocketDesign]:
        """Update fields on an existing rocket design.

        Automatically increments the version number and updates modified_at.

        Args:
            rocket_id: The unique identifier.
            **kwargs: Fields to update.

        Returns:
            The updated RocketDesign if found, None otherwise.
        """
        rocket = self.get(rocket_id)
        if rocket is None:
            return None
        for key, value in kwargs.items():
            if hasattr(rocket, key):
                setattr(rocket, key, value)
        rocket.version += 1
        rocket.modified_at = datetime.now().isoformat()
        self._save(rocket)
        return rocket

    def delete(self, rocket_id: str) -> bool:
        """Delete a rocket design.

        Args:
            rocket_id: The unique identifier.

        Returns:
            True if deleted, False if not found.
        """
        path = self._rocket_path(rocket_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def duplicate(self, rocket_id: str, new_name: Optional[str] = None) -> Optional[RocketDesign]:
        """Create a copy of an existing rocket design.

        Args:
            rocket_id: The unique identifier of the source rocket.
            new_name: Optional new name. Defaults to "Copy of {original}".

        Returns:
            The duplicated RocketDesign, or None if source not found.
        """
        original = self.get(rocket_id)
        if original is None:
            return None
        data = original.to_dict()
        data["id"] = uuid.uuid4().hex[:12]
        data["name"] = new_name or f"Copy of {original.name}"
        data["version"] = 1
        data["created_at"] = datetime.now().isoformat()
        data["modified_at"] = datetime.now().isoformat()
        data["is_favorite"] = False
        duplicate = RocketDesign.from_dict(data)
        self._save(duplicate)
        return duplicate

    def list_all(self) -> list[RocketDesign]:
        """Return all rocket designs, newest first.

        Returns:
            List of all rocket designs sorted by modified date.
        """
        rockets = []
        for path in self._rockets_dir.glob("*.json"):
            try:
                with open(path) as f:
                    data = json.load(f)
                rockets.append(RocketDesign.from_dict(data))
            except (json.JSONDecodeError, KeyError):
                continue  # Skip corrupted files
        rockets.sort(key=lambda r: r.modified_at, reverse=True)
        return rockets

    def search(
        self,
        query: Optional[str] = None,
        tags: Optional[list[str]] = None,
        favorites_only: bool = False,
    ) -> list[RocketDesign]:
        """Search and filter rockets.

        Args:
            query: Text search across name and description.
            tags: Filter by tags (AND logic — rocket must have ALL specified tags).
            favorites_only: If True, only return favorited rockets.

        Returns:
            Matching rocket designs, newest first.
        """
        results = self.list_all()

        if favorites_only:
            results = [r for r in results if r.is_favorite]

        if tags:
            tag_set = set(tags)
            results = [r for r in results if tag_set.issubset(set(r.tags))]

        if query:
            q = query.lower()
            results = [
                r for r in results
                if q in r.name.lower() or q in r.description.lower()
            ]

        return results

    def get_all_tags(self) -> list[str]:
        """Return all unique tags across all rockets, sorted alphabetically.

        Returns:
            Sorted list of unique tag strings.
        """
        tags = set()
        for rocket in self.list_all():
            tags.update(rocket.tags)
        return sorted(tags)

    def toggle_favorite(self, rocket_id: str) -> Optional[RocketDesign]:
        """Toggle the favorite status of a rocket.

        Args:
            rocket_id: The unique identifier.

        Returns:
            Updated RocketDesign, or None if not found.
        """
        rocket = self.get(rocket_id)
        if rocket is None:
            return None
        rocket.is_favorite = not rocket.is_favorite
        rocket.modified_at = datetime.now().isoformat()
        self._save(rocket)
        return rocket

    def export_rocket(self, rocket_id: str) -> Optional[dict]:
        """Export a rocket design as a portable dict.

        Args:
            rocket_id: The unique identifier.

        Returns:
            Dict representation, or None if not found.
        """
        rocket = self.get(rocket_id)
        if rocket is None:
            return None
        return {
            "soarsim_version": "0.5",
            "export_type": "rocket",
            "exported_at": datetime.now().isoformat(),
            "design": rocket.to_dict(),
        }

    def import_rocket(self, data: dict) -> Optional[RocketDesign]:
        """Import a rocket design from a portable dict.

        Assigns a new ID and timestamps to avoid conflicts.

        Args:
            data: Exported rocket dict.

        Returns:
            The imported RocketDesign, or None if data is invalid.
        """
        if data.get("export_type") != "rocket":
            return None
        design_data = data.get("design")
        if not design_data:
            return None
        rocket = RocketDesign.from_dict(design_data)
        # Assign new ID and timestamps
        rocket.id = uuid.uuid4().hex[:12]
        rocket.created_at = datetime.now().isoformat()
        rocket.modified_at = datetime.now().isoformat()
        rocket.version = 1
        self._save(rocket)
        return rocket

    def _save(self, rocket: RocketDesign) -> None:
        """Persist a rocket design to disk.

        Args:
            rocket: The rocket to save.
        """
        path = self._rocket_path(rocket.id)
        with open(path, "w") as f:
            json.dump(rocket.to_dict(), f, indent=2)
