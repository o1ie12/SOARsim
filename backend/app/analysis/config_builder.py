"""
Shared configuration builder for SOARSim v2.0 analysis modules.

Eliminates code duplication between sweeps, experiments, and Monte Carlo
by providing a single place to build rocket and propulsion configs from
parameter dictionaries.
"""

from __future__ import annotations

from typing import Any

from app.physics.engine import RocketConfig
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.physics.propulsion.solid_motor import SolidMotor, SolidMotorConfig
from app.physics.propulsion.custom_thrust import CustomThrustCurve, ThrustCurveConfig


def build_configs(
    params: dict[str, Any],
    propulsion_type: str = "water",
) -> tuple[RocketConfig, WaterRocket | SolidMotor | CustomThrustCurve]:
    """Build rocket and propulsion configs from a parameter dictionary.

    Args:
        params: Dictionary containing all simulation parameters.
        propulsion_type: Type of propulsion system ("water", "solid", "custom").

    Returns:
        Tuple of (RocketConfig, PropulsionSystem).

    Raises:
        ValueError: If required parameters are missing or invalid.
    """
    # Build rocket config (aerodynamics)
    rocket_config = RocketConfig(
        drag_coefficient=params.get("dragCoefficient", 0.45),
        cross_sectional_area=params.get("crossSectionalArea", 0.008),
        launch_angle=params.get("launchAngle", 75.0),
    )

    # Build propulsion system based on type
    if propulsion_type == "solid":
        motor_config = SolidMotorConfig(
            designation=params.get("motorDesignation", "C6-5"),
            total_impulse=params.get("totalImpulse", 10.0),
            avg_thrust=params.get("avgThrust", 18.0),
            burn_time=params.get("burnTime", 0.5556),
            propellant_mass=params.get("propellantMass", 0.0124),
            casing_mass=params.get("casingMass", 0.015),
        )
        propulsion = SolidMotor(motor_config, dry_mass=params.get("dryMass", 0.15))
    elif propulsion_type == "custom":
        thrust_points = params.get("thrustCurve", [])
        tc_config = ThrustCurveConfig(
            points=[(p["time"], p["thrust"]) for p in thrust_points] if thrust_points else [],
            propellant_mass=params.get("propellantMass", 0.05),
            casing_mass=params.get("casingMass", 0.015),
            dry_mass=params.get("dryMass", 0.0),
        )
        propulsion = CustomThrustCurve(tc_config)
    else:
        # Default: water rocket
        water_config = WaterRocketConfig(
            dry_mass=params.get("dryMass", 0.15),
            bottle_volume=params.get("bottleVolume", 0.002),
            water_volume=params.get("waterVolume", 0.0007),
            initial_pressure=params.get("pressure", 400_000),
            nozzle_diameter=params.get("nozzleDiameter", 0.013),
        )
        propulsion = WaterRocket(water_config)

    return rocket_config, propulsion


def compute_landing_distance(trajectory: list) -> float:
    """Compute landing distance from trajectory data.

    Args:
        trajectory: List of trajectory points with x, y attributes.

    Returns:
        Landing distance in meters.
    """
    if not trajectory:
        return 0.0
    last = trajectory[-1]
    return (last.x ** 2 + last.y ** 2) ** 0.5
