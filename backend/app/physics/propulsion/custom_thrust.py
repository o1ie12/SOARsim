"""
Custom thrust curve propulsion model for SOARSim v2.0.

Allows users to upload or define custom thrust curves (e.g., from
motor test data or manufacturer specifications). The simulator
interpolates the thrust curve and applies it to the flight simulation.
"""

from __future__ import annotations

import csv
import io
import math
from dataclasses import dataclass

from app.physics.propulsion.base import PropulsionSystem, PropulsionState


@dataclass
class ThrustCurvePoint:
    """A single point on a thrust curve."""
    time: float    # seconds
    thrust: float  # Newtons


@dataclass
class ThrustCurveConfig:
    """Configuration for a custom thrust curve motor.

    Attributes:
        points: List of (time, thrust) data points.
        propellant_mass: Total propellant mass (kg).
        casing_mass: Motor casing mass (kg).
        dry_mass: Additional dry mass (kg) beyond casing.
    """
    points: list[ThrustCurvePoint]
    propellant_mass: float = 0.05
    casing_mass: float = 0.015
    dry_mass: float = 0.0

    @property
    def total_impulse(self) -> float:
        """Compute total impulse by trapezoidal integration."""
        if len(self.points) < 2:
            return 0.0
        impulse = 0.0
        for i in range(1, len(self.points)):
            dt = self.points[i].time - self.points[i - 1].time
            avg_thrust = (self.points[i].thrust + self.points[i - 1].thrust) / 2.0
            impulse += avg_thrust * dt
        return impulse

    @property
    def burn_duration(self) -> float:
        """Total burn duration from the thrust curve."""
        if not self.points:
            return 0.0
        return self.points[-1].time - self.points[0].time

    @property
    def max_thrust(self) -> float:
        """Maximum thrust value."""
        if not self.points:
            return 0.0
        return max(p.thrust for p in self.points)


def parse_thrust_curve_csv(csv_content: str) -> list[ThrustCurvePoint]:
    """Parse a CSV thrust curve file.

    Expected CSV format:
        time,thrust
        0.0,0.0
        0.1,50.0
        ...

    Args:
        csv_content: Raw CSV string content.

    Returns:
        List of ThrustCurvePoint sorted by time.

    Raises:
        ValueError: If CSV format is invalid.
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    points: list[ThrustCurvePoint] = []

    for row in reader:
        try:
            time_val = float(row.get("time", row.get("Time", "0")))
            thrust_val = float(row.get("thrust", row.get("Thrust", "0")))
            points.append(ThrustCurvePoint(time=time_val, thrust=thrust_val))
        except (ValueError, KeyError) as e:
            raise ValueError(f"Invalid CSV row: {row} — {e}")

    if not points:
        raise ValueError("No valid data points found in CSV")

    # Sort by time
    points.sort(key=lambda p: p.time)
    return points


class CustomThrustCurve(PropulsionSystem):
    """Custom thrust curve propulsion system.

    Interpolates user-provided thrust data to compute thrust at any time.
    Uses linear interpolation between data points.
    """

    def __init__(self, config: ThrustCurveConfig) -> None:
        self.config = config
        self._total_mass = config.dry_mass + config.casing_mass + config.propellant_mass
        self._dry_mass = config.dry_mass + config.casing_mass

        # Validate thrust curve
        if not config.points:
            raise ValueError("Thrust curve must have at least one data point")
        if config.propellant_mass < 0:
            raise ValueError("Propellant mass must be non-negative")

    def _lookup_thrust(self, time: float) -> float:
        """Look up thrust at a given time using linear interpolation."""
        points = self.config.points

        if not points:
            return 0.0

        # Before first point or after last point
        if time <= points[0].time:
            return points[0].thrust
        if time >= points[-1].time:
            return 0.0  # After burnout

        # Binary search for the bounding interval
        lo, hi = 0, len(points) - 1
        while lo < hi - 1:
            mid = (lo + hi) // 2
            if points[mid].time <= time:
                lo = mid
            else:
                hi = mid

        p0 = points[lo]
        p1 = points[hi]

        if p1.time == p0.time:
            return p0.thrust

        # Linear interpolation
        frac = (time - p0.time) / (p1.time - p0.time)
        return p0.thrust + frac * (p1.thrust - p0.thrust)

    def _mass_at_time(self, time: float) -> float:
        """Compute rocket mass at a given time (linear interpolation)."""
        bt = self.config.burn_duration
        if bt <= 0:
            return self._dry_mass

        if time <= 0:
            return self._total_mass
        if time >= bt:
            return self._dry_mass

        # Linear mass loss
        frac_consumed = time / bt
        propellant_remaining = self.config.propellant_mass * (1.0 - frac_consumed)
        return self._dry_mass + propellant_remaining

    def get_initial_state(self) -> PropulsionState:
        return PropulsionState(
            time=0.0,
            thrust=self._lookup_thrust(0.0),
            mass=self._total_mass,
            pressure=0.0,
            propellant_remaining=1.0,
        )

    def step(self, time: float, dt: float) -> PropulsionState:
        bt = self.config.burn_duration
        if time >= bt and bt > 0:
            return PropulsionState(
                time=time,
                thrust=0.0,
                mass=self._dry_mass,
                pressure=0.0,
                propellant_remaining=0.0,
            )

        thrust = self._lookup_thrust(time)
        mass = self._mass_at_time(time)
        frac = 1.0 - (time / bt if bt > 0 else 0.0)

        return PropulsionState(
            time=time,
            thrust=thrust,
            mass=mass,
            pressure=0.0,
            propellant_remaining=max(min(frac, 1.0), 0.0),
        )

    def is_burnout(self, time: float) -> bool:
        return time >= self.config.burn_duration

    def get_burn_duration(self) -> float:
        return self.config.burn_duration
