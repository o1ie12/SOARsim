"""
Parameter sweep engine for SOARSim v2.0.

Allows users to vary one parameter across multiple simulations,
generating comparison data with summary statistics.

Supported sweep parameters:
- pressure: Initial pressure (Pa)
- waterVolume: Water volume (m³)
- launchAngle: Launch angle (degrees)
- nozzleDiameter: Nozzle diameter (m)
- dryMass: Dry mass (kg)
- dragCoefficient: Drag coefficient
- crossSectionalArea: Cross-sectional area (m²)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.physics.engine import Environment, RocketConfig, State, compute_acceleration
from app.physics.propulsion.base import PropulsionSystem
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.simulation.simulator import run_simulation, SimulationResult, SimulationSummary

# Map of sweep parameter names to their (min, max, default) in SI units
SWEEP_PARAMETER_RANGES: dict[str, tuple[float, float, float]] = {
    "pressure": (50_000, 1_000_000, 400_000),
    "waterVolume": (0.0001, 0.0015, 0.0007),
    "launchAngle": (10.0, 90.0, 75.0),
    "nozzleDiameter": (0.005, 0.025, 0.013),
    "dryMass": (0.05, 1.0, 0.15),
    "bottleVolume": (0.001, 0.005, 0.002),
    "dragCoefficient": (0.1, 1.5, 0.45),
    "crossSectionalArea": (0.001, 0.05, 0.008),
}


@dataclass
class SweepPoint:
    """Result of a single sweep point."""
    parameter_value: float
    max_altitude: float
    flight_time: float
    max_velocity: float
    max_acceleration: float
    max_dynamic_pressure: float = 0.0
    max_mach: float = 0.0
    landing_distance: float = 0.0


@dataclass
class SweepResult:
    """Complete parameter sweep result."""
    parameter_name: str
    parameter_values: list[float]
    points: list[SweepPoint]
    statistics: SweepStatistics
    unit: str = ""


@dataclass
class SweepStatistics:
    """Summary statistics across all sweep points."""
    best_altitude_index: int
    best_altitude_value: float
    mean_altitude: float
    std_altitude: float
    min_altitude: float
    max_altitude: float
    sensitivity: float  # Normalized sensitivity: dY/dX * X/Y


# Parameter units for display
PARAMETER_UNITS: dict[str, str] = {
    "pressure": "Pa",
    "waterVolume": "m³",
    "launchAngle": "°",
    "nozzleDiameter": "m",
    "dryMass": "kg",
    "bottleVolume": "m³",
    "dragCoefficient": "",
    "crossSectionalArea": "m²",
}


def _build_water_rocket_config(
    base_config: dict[str, Any],
    sweep_param: str,
    sweep_value: float,
) -> WaterRocketConfig:
    """Build a WaterRocketConfig with one parameter overridden."""
    from app.analysis.config_builder import build_configs
    params = dict(base_config)
    params[sweep_param] = sweep_value
    _, propulsion = build_configs(params, "water")
    return propulsion.config  # type: ignore


def _compute_max_dynamic_pressure(trajectory: list, air_density: float) -> float:
    """Compute maximum dynamic pressure from trajectory."""
    max_q = 0.0
    for point in trajectory:
        speed_sq = point.vx ** 2 + point.vy ** 2
        q = 0.5 * air_density * speed_sq
        if q > max_q:
            max_q = q
    return max_q


def run_parameter_sweep(
    sweep_param: str,
    values: list[float],
    base_config: dict[str, Any],
    env: Environment | None = None,
) -> SweepResult:
    """Run a parameter sweep across the given values.

    Args:
        sweep_param: Name of the parameter to sweep (e.g., "pressure").
        values: List of parameter values to test.
        base_config: Base simulation configuration dict with all other parameters.
        env: Environment model. Defaults to sea-level constant atmosphere.

    Returns:
        SweepResult with all simulation results and statistics.
    """
    if env is None:
        env = Environment()

    points: list[SweepPoint] = []

    for val in values:
        # Build configs for this sweep point
        water_config = _build_water_rocket_config(base_config, sweep_param, val)
        propulsion = WaterRocket(water_config)

        rocket_config = RocketConfig(
            drag_coefficient=base_config.get("dragCoefficient", 0.45),
            cross_sectional_area=base_config.get("crossSectionalArea", 0.008),
            launch_angle=base_config.get("launchAngle", 75.0),
        )

        result = run_simulation(rocket_config, propulsion, env=env)

        # Compute landing distance
        landing_distance = 0.0
        if result.trajectory:
            last = result.trajectory[-1]
            landing_distance = (last.x ** 2 + last.y ** 2) ** 0.5

        points.append(SweepPoint(
            parameter_value=val,
            max_altitude=result.summary.max_altitude,
            flight_time=result.summary.flight_time,
            max_velocity=result.summary.max_velocity,
            max_acceleration=result.summary.max_acceleration,
            max_dynamic_pressure=_compute_max_dynamic_pressure(
                result.trajectory, env.air_density
            ),
            landing_distance=landing_distance,
        ))

    # Compute statistics
    altitudes = [p.max_altitude for p in points]
    best_idx = max(range(len(altitudes)), key=lambda i: altitudes[i])
    mean_alt = sum(altitudes) / len(altitudes) if altitudes else 0.0
    variance = sum((a - mean_alt) ** 2 for a in altitudes) / len(altitudes) if altitudes else 0.0
    std_alt = variance ** 0.5

    # Sensitivity: dY/dX * X/Y (normalized)
    sensitivity = 0.0
    if len(values) >= 2 and mean_alt > 0:
        x_mean = sum(values) / len(values)
        if x_mean > 0:
            delta_y = altitudes[-1] - altitudes[0]
            delta_x = values[-1] - values[0]
            if abs(delta_x) > 1e-12:
                sensitivity = (delta_y / delta_x) * (x_mean / mean_alt)

    stats = SweepStatistics(
        best_altitude_index=best_idx,
        best_altitude_value=altitudes[best_idx] if altitudes else 0.0,
        mean_altitude=mean_alt,
        std_altitude=std_alt,
        min_altitude=min(altitudes) if altitudes else 0.0,
        max_altitude=max(altitudes) if altitudes else 0.0,
        sensitivity=sensitivity,
    )

    return SweepResult(
        parameter_name=sweep_param,
        parameter_values=values,
        points=points,
        statistics=stats,
        unit=PARAMETER_UNITS.get(sweep_param, ""),
    )
