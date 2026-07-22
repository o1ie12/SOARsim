"""
Flight data management for SOARSim v0.3.

Defines the FlightData model for real rocket launch measurements
and an in-memory store for persisting flight history during a session.

Design decisions:
    - FlightData is a dataclass, not a Pydantic model, so it stays
      independent of API serialization concerns.
    - FlightDataStore is in-memory for v0.3. Future versions may
      persist to SQLite or a database.
    - All optional fields allow partial data uploads (e.g., user
      only measured altitude and flight time).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class FlightData:
    """Real-world flight measurement data from a rocket launch.

    All physical quantities use SI units. Fields are optional because
    users may not measure every quantity on every launch.

    Attributes:
        id: Unique identifier for this flight record.
        date: Date/time of the launch.
        notes: Free-text notes about the launch conditions.

        # Measured flight results
        flight_time: Measured total flight duration (s).
        max_altitude: Measured maximum altitude (m).
        max_velocity: Measured maximum velocity (m/s).
        landing_distance: Horizontal distance from launch to landing (m).

        # Launch configuration (what the user set)
        launch_angle: Launch angle from horizontal (degrees).
        pressure: Initial gauge pressure in the bottle (Pa).
        water_volume: Volume of water propellant (m³).
        rocket_mass: Total rocket mass at launch (kg).

        # Source
        source: How the data was obtained ("csv", "manual", "sensor").
        csv_raw: Raw CSV content if uploaded.
    """

    # Identity
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    date: str = field(default_factory=lambda: datetime.now().isoformat())
    notes: str = ""

    # Measured flight results
    flight_time: Optional[float] = None
    max_altitude: Optional[float] = None
    max_velocity: Optional[float] = None
    landing_distance: Optional[float] = None

    # Launch configuration
    launch_angle: Optional[float] = None
    pressure: Optional[float] = None
    water_volume: Optional[float] = None
    rocket_mass: Optional[float] = None

    # Source tracking
    source: str = "manual"
    csv_raw: Optional[str] = None


class FlightDataStore:
    """In-memory store for flight data records.

    Provides simple CRUD operations. In v0.3 this is session-persistent
    (data lives until the server restarts). Future versions should
    add SQLite or database persistence.

    Thread-safety note: For a single-user educational tool, a plain
    dict is sufficient. A production system would use a database.
    """

    def __init__(self) -> None:
        self._records: dict[str, FlightData] = {}

    def add(self, record: FlightData) -> FlightData:
        """Store a flight data record.

        Args:
            record: The flight data to store.

        Returns:
            The stored record (with id assigned if new).
        """
        self._records[record.id] = record
        return record

    def get(self, record_id: str) -> Optional[FlightData]:
        """Retrieve a flight data record by ID.

        Args:
            record_id: The unique identifier.

        Returns:
            The record if found, None otherwise.
        """
        return self._records.get(record_id)

    def list_all(self) -> list[FlightData]:
        """Return all stored records, newest first.

        Returns:
            List of all flight data records.
        """
        return sorted(
            self._records.values(),
            key=lambda r: r.date,
            reverse=True,
        )

    def delete(self, record_id: str) -> bool:
        """Delete a flight data record.

        Args:
            record_id: The unique identifier.

        Returns:
            True if deleted, False if not found.
        """
        if record_id in self._records:
            del self._records[record_id]
            return True
        return False

    def count(self) -> int:
        """Return the number of stored records."""
        return len(self._records)
