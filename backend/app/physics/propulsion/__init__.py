"""
Propulsion module for SOARSim v2.0.

Provides modular propulsion system interface and implementations:
- WaterRocket: Compressed air/water rocket (v1.0)
- SolidMotor: Commercial solid rocket motors (v2.0)
- CustomThrustCurve: User-defined thrust curves with CSV import (v2.0)
"""

from app.physics.propulsion.base import PropulsionSystem, PropulsionState
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.physics.propulsion.solid_motor import SolidMotor, SolidMotorConfig
from app.physics.propulsion.custom_thrust import CustomThrustCurve, ThrustCurveConfig

__all__ = [
    "PropulsionSystem",
    "PropulsionState",
    "WaterRocket",
    "WaterRocketConfig",
    "SolidMotor",
    "SolidMotorConfig",
    "CustomThrustCurve",
    "ThrustCurveConfig",
]
