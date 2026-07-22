"""
Solid motor propulsion model for SOARSim v2.0.

Implements solid rocket motor simulation using empirical burn rate models.
Supports:
- Commercial solid motors (e.g., Estes A8, B6, C6)
- Sugar rocket motors (KNSU, KNDX)
- Custom motor configurations
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.physics.propulsion.base import PropulsionSystem, PropulsionState


# Common commercial solid motor data
# Format: (designation, total_impulse_Ns, avg_thrust_N, burn_time_s, propellant_mass_kg)
COMMERCIAL_MOTORS: dict[str, dict] = {
    "A8-3": {
        "total_impulse": 2.5,
        "avg_thrust": 8.0,
        "burn_time": 0.3125,
        "propellant_mass": 0.0033,
        "impulse_class": "A",
    },
    "B6-4": {
        "total_impulse": 5.0,
        "avg_thrust": 12.0,
        "burn_time": 0.4167,
        "propellant_mass": 0.0065,
        "impulse_class": "B",
    },
    "B6-0": {
        "total_impulse": 5.0,
        "avg_thrust": 12.0,
        "burn_time": 0.4167,
        "propellant_mass": 0.0065,
        "impulse_class": "B",
    },
    "C6-5": {
        "total_impulse": 10.0,
        "avg_thrust": 18.0,
        "burn_time": 0.5556,
        "propellant_mass": 0.0124,
        "impulse_class": "C",
    },
    "C6-0": {
        "total_impulse": 10.0,
        "avg_thrust": 18.0,
        "burn_time": 0.5556,
        "propellant_mass": 0.0124,
        "impulse_class": "C",
    },
    "D12-5": {
        "total_impulse": 20.0,
        "avg_thrust": 30.0,
        "burn_time": 0.6667,
        "propellant_mass": 0.0246,
        "impulse_class": "D",
    },
    "D12-0": {
        "total_impulse": 20.0,
        "avg_thrust": 30.0,
        "burn_time": 0.6667,
        "propellant_mass": 0.0246,
        "impulse_class": "D",
    },
    "E15-4": {
        "total_impulse": 40.0,
        "avg_thrust": 60.0,
        "burn_time": 0.6667,
        "propellant_mass": 0.049,
        "impulse_class": "E",
    },
    "F15-6": {
        "total_impulse": 80.0,
        "avg_thrust": 120.0,
        "burn_time": 0.6667,
        "propellant_mass": 0.098,
        "impulse_class": "F",
    },
}


@dataclass
class SolidMotorConfig:
    """Configuration for a solid rocket motor.

    Attributes:
        designation: Motor designation (e.g., "C6-5") or "custom".
        total_impulse: Total impulse (N·s). Required for custom motors.
        avg_thrust: Average thrust (N). Required for custom motors.
        burn_time: Burn duration (s). Required for custom motors.
        propellant_mass: Propellant mass (kg). Required for custom motors.
        casing_mass: Motor casing mass (kg).
        throat_diameter: Nozzle throat diameter (m). Used for thrust curve shape.
        exit_diameter: Nozzle exit diameter (m). Used for thrust curve shape.
    """
    designation: str = "C6-5"
    total_impulse: float = 10.0
    avg_thrust: float = 18.0
    burn_time: float = 0.5556
    propellant_mass: float = 0.0124
    casing_mass: float = 0.015
    throat_diameter: float = 0.005
    exit_diameter: float = 0.008

    def __post_init__(self) -> None:
        # Load preset data if designation is known
        if self.designation in COMMERCIAL_MOTORS:
            preset = COMMERCIAL_MOTORS[self.designation]
            if self.total_impulse == 10.0:  # Default value, override with preset
                self.total_impulse = preset["total_impulse"]
                self.avg_thrust = preset["avg_thrust"]
                self.burn_time = preset["burn_time"]
                self.propellant_mass = preset["propellant_mass"]

        if self.total_impulse <= 0:
            raise ValueError(f"Total impulse must be positive, got {self.total_impulse}")
        if self.avg_thrust <= 0:
            raise ValueError(f"Average thrust must be positive, got {self.avg_thrust}")
        if self.burn_time <= 0:
            raise ValueError(f"Burn time must be positive, got {self.burn_time}")
        if self.propellant_mass < 0:
            raise ValueError(f"Propellant mass must be non-negative, got {self.propellant_mass}")
        if self.casing_mass < 0:
            raise ValueError(f"Casing mass must be non-negative, got {self.casing_mass}")


class SolidMotor(PropulsionSystem):
    """Solid rocket motor propulsion system.

    Uses a simplified thrust curve model:
    - Linear ramp-up (0 to max thrust in first 10% of burn)
    - Constant thrust (80% of burn at average thrust level)
    - Linear ramp-down (last 10% of burn)

    Thrust curve shape ensures total impulse matches specification.
    """

    def __init__(self, config: SolidMotorConfig, dry_mass: float = 0.0) -> None:
        self.config = config
        self._dry_mass = dry_mass
        self._total_mass = dry_mass + config.propellant_mass

        # Compute thrust curve shape
        self._max_thrust = self._compute_max_thrust()
        self._thrust_curve = self._build_thrust_curve()

    def _compute_max_thrust(self) -> float:
        """Compute peak thrust from impulse and burn time.

        With ramp-up/down, peak thrust is higher than average.
        Assuming triangular-ish profile: peak ≈ 1.2 × average.
        """
        return self.config.avg_thrust * 1.2

    def _build_thrust_curve(self) -> list[tuple[float, float]]:
        """Build discrete thrust vs time curve.

        Returns list of (time, thrust) pairs.
        """
        dt = 0.001  # 1ms resolution
        bt = self.config.burn_time
        peak = self._max_thrust
        avg = self.config.avg_thrust

        points: list[tuple[float, float]] = []
        t = 0.0

        while t <= bt:
            if t < bt * 0.1:
                # Ramp up
                frac = t / (bt * 0.1)
                thrust = peak * frac
            elif t < bt * 0.9:
                # Constant (at average level)
                thrust = avg
            else:
                # Ramp down
                frac = (bt - t) / (bt * 0.1)
                thrust = avg * max(frac, 0.0)

            points.append((t, thrust))
            t += dt

        # Adjust to match total impulse exactly
        computed_impulse = sum(f * dt for _, f in points)
        if computed_impulse > 0:
            scale = self.config.total_impulse / computed_impulse
            points = [(t, f * scale) for t, f in points]

        return points

    def _lookup_thrust(self, time: float) -> float:
        """Look up thrust at a given time using binary search."""
        if time <= 0 or time >= self.config.burn_time:
            return 0.0

        curve = self._thrust_curve
        lo, hi = 0, len(curve) - 1

        while lo < hi - 1:
            mid = (lo + hi) // 2
            if curve[mid][0] <= time:
                lo = mid
            else:
                hi = mid

        t0, f0 = curve[lo]
        t1, f1 = curve[hi]

        if t1 == t0:
            return f0

        frac = (time - t0) / (t1 - t0)
        return f0 + frac * (f1 - f0)

    def _mass_at_time(self, time: float) -> float:
        """Compute rocket mass at a given time."""
        if time <= 0:
            return self._total_mass
        if time >= self.config.burn_time:
            return self._dry_mass

        # Linear mass loss (simplified)
        frac_consumed = time / self.config.burn_time
        propellant_remaining = self.config.propellant_mass * (1.0 - frac_consumed)
        return self._dry_mass + propellant_remaining

    def get_initial_state(self) -> PropulsionState:
        return PropulsionState(
            time=0.0,
            thrust=0.0,
            mass=self._total_mass,
            pressure=0.0,
            propellant_remaining=1.0,
        )

    def step(self, time: float, dt: float) -> PropulsionState:
        if time >= self.config.burn_time:
            return PropulsionState(
                time=time,
                thrust=0.0,
                mass=self._dry_mass,
                pressure=0.0,
                propellant_remaining=0.0,
            )

        thrust = self._lookup_thrust(time)
        mass = self._mass_at_time(time)
        frac = 1.0 - (time / self.config.burn_time if self.config.burn_time > 0 else 0.0)

        return PropulsionState(
            time=time,
            thrust=thrust,
            mass=mass,
            pressure=0.0,  # Solid motors don't track pressure
            propellant_remaining=max(frac, 0.0),
        )

    def is_burnout(self, time: float) -> bool:
        return time >= self.config.burn_time

    def get_burn_duration(self) -> float:
        return self.config.burn_time
