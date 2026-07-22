"""
Wind model for SOARSim v2.0.

Supports:
- Constant wind (uniform speed and direction)
- Layered wind (different conditions at different altitude bands)
- Altitude-varying wind (continuous profile)
- Wind drift prediction
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class WindType(Enum):
    """Supported wind model types."""
    NONE = "none"
    CONSTANT = "constant"
    LAYERED = "layered"
    ALTITUDE_VARYING = "altitude_varying"


@dataclass(frozen=True)
class WindState:
    """Wind conditions at a given altitude."""
    speed: float        # m/s (horizontal component magnitude)
    direction: float    # degrees from north (0=N, 90=E, 180=S, 270=W)
    vertical: float     # m/s (positive = updraft, negative = downdraft)
    turbulence: float   # intensity (0 = laminar, 1 = high turbulence)

    @property
    def vx(self) -> float:
        """Wind velocity in x-direction (East-West)."""
        dir_rad = math.radians(self.direction)
        return self.speed * math.sin(dir_rad)

    @property
    def vy(self) -> float:
        """Wind velocity in y-direction (North-South)."""
        dir_rad = math.radians(self.direction)
        return self.speed * math.cos(dir_rad)


@dataclass(frozen=True)
class WindLayer:
    """A single wind layer for layered wind model."""
    min_altitude: float   # m
    max_altitude: float   # m
    speed: float          # m/s
    direction: float      # degrees from north
    turbulence: float = 0.0


@dataclass(frozen=True)
class AltitudeWindPoint:
    """A single point in an altitude-varying wind profile."""
    altitude: float   # m
    speed: float      # m/s
    direction: float  # degrees from north


@dataclass(frozen=True)
class WindDriftResult:
    """Wind drift prediction for a trajectory."""
    total_drift_x: float    # m (accumulated x-drift)
    total_drift_y: float    # m (accumulated y-drift)
    max_drift_x: float      # m (maximum x-drift during flight)
    max_drift_y: float      # m (maximum y-drift during flight)
    drift_at_apogee: float  # m (drift at maximum altitude)


class WindModel:
    """Configurable wind model for the simulator."""

    def __init__(
        self,
        wind_type: WindType = WindType.NONE,
        constant_speed: float = 0.0,
        constant_direction: float = 0.0,
        layers: list[WindLayer] | None = None,
        altitude_profile: list[AltitudeWindPoint] | None = None,
    ) -> None:
        self.wind_type = wind_type
        self.constant_speed = constant_speed
        self.constant_direction = constant_direction
        self.layers = layers or []
        self.altitude_profile = altitude_profile or []

    def get_wind(self, altitude: float) -> WindState:
        """Get wind conditions at the given altitude.

        Args:
            altitude: Altitude above ground level (m).

        Returns:
            WindState with wind speed, direction, and vertical component.
        """
        if self.wind_type == WindType.NONE:
            return WindState(speed=0.0, direction=0.0, vertical=0.0, turbulence=0.0)

        if self.wind_type == WindType.CONSTANT:
            return WindState(
                speed=self.constant_speed,
                direction=self.constant_direction,
                vertical=0.0,
                turbulence=0.0,
            )

        if self.wind_type == WindType.LAYERED:
            for layer in self.layers:
                if layer.min_altitude <= altitude <= layer.max_altitude:
                    return WindState(
                        speed=layer.speed,
                        direction=layer.direction,
                        vertical=0.0,
                        turbulence=layer.turbulence,
                    )
            # Default to first layer if altitude is outside all ranges
            if self.layers:
                first = self.layers[0]
                return WindState(
                    speed=first.speed,
                    direction=first.direction,
                    vertical=0.0,
                    turbulence=first.turbulence,
                )
            return WindState(speed=0.0, direction=0.0, vertical=0.0, turbulence=0.0)

        if self.wind_type == WindType.ALTITUDE_VARYING:
            return self._interpolate_wind(altitude)

        return WindState(speed=0.0, direction=0.0, vertical=0.0, turbulence=0.0)

    def _interpolate_wind(self, altitude: float) -> WindState:
        """Interpolate wind conditions from altitude profile."""
        if not self.altitude_profile:
            return WindState(speed=0.0, direction=0.0, vertical=0.0, turbulence=0.0)

        # Clamp to profile range
        alt = max(self.altitude_profile[0].altitude, min(altitude, self.altitude_profile[-1].altitude))

        # Find bounding indices
        idx = 0
        for i, p in enumerate(self.altitude_profile):
            if p.altitude <= alt:
                idx = i

        if idx >= len(self.altitude_profile) - 1:
            idx = len(self.altitude_profile) - 2

        p0 = self.altitude_profile[idx]
        p1 = self.altitude_profile[idx + 1]

        if p1.altitude == p0.altitude:
            frac = 0.0
        else:
            frac = (alt - p0.altitude) / (p1.altitude - p0.altitude)

        speed = p0.speed + frac * (p1.speed - p0.speed)
        # Handle direction wrapping (e.g., 350° to 10° should interpolate through 0°)
        dir_diff = p1.direction - p0.direction
        if dir_diff > 180:
            dir_diff -= 360
        elif dir_diff < -180:
            dir_diff += 360
        direction = (p0.direction + frac * dir_diff) % 360

        return WindState(speed=speed, direction=direction, vertical=0.0, turbulence=0.0)

    def compute_drift(
        self,
        trajectory_altitudes: list[float],
        trajectory_times: list[float],
        dt: float,
    ) -> WindDriftResult:
        """Compute wind drift for a simulated trajectory.

        Integrates wind velocity over time to estimate landing drift.

        Args:
            trajectory_altitudes: Altitude at each time step.
            trajectory_times: Time at each time step.
            dt: Time step size.

        Returns:
            WindDriftResult with drift statistics.
        """
        if self.wind_type == WindType.NONE:
            return WindDriftResult(
                total_drift_x=0, total_drift_y=0,
                max_drift_x=0, max_drift_y=0, drift_at_apogee=0,
            )

        drift_x = 0.0
        drift_y = 0.0
        max_drift_x = 0.0
        max_drift_y = 0.0
        drift_at_apogee = 0.0
        max_alt = 0.0

        for i, (alt, t) in enumerate(zip(trajectory_altitudes, trajectory_times)):
            wind = self.get_wind(alt)
            drift_x += wind.vx * dt
            drift_y += wind.vy * dt

            abs_x = abs(drift_x)
            abs_y = abs(drift_y)
            if abs_x > max_drift_x:
                max_drift_x = abs_x
            if abs_y > max_drift_y:
                max_drift_y = abs_y

            if alt > max_alt:
                max_alt = alt
                drift_at_apogee = math.sqrt(drift_x ** 2 + drift_y ** 2)

        return WindDriftResult(
            total_drift_x=drift_x,
            total_drift_y=drift_y,
            max_drift_x=max_drift_x,
            max_drift_y=max_drift_y,
            drift_at_apogee=drift_at_apogee,
        )
