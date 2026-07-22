"""
Physics engine for SOARSim v0.2.

Provides the core physical models used in rocket flight simulation:

- Gravity: constant acceleration downward
- Quadratic drag: resistive force proportional to v^2
- Propulsion: modular interface (water rocket, solid motor, etc.)
- Euler integration: first-order numerical integration

v0.2 changes:
- Mass is now variable (comes from propulsion system)
- Thrust is dynamic (comes from propulsion system)
- Engine depends only on PropulsionSystem interface
"""

from dataclasses import dataclass
from math import cos, sin, radians

import numpy as np

from app.physics.propulsion.base import PropulsionSystem, PropulsionState

# Physical constants
GRAVITATIONAL_ACCELERATION: float = 9.80665  # m/s^2
AIR_DENSITY: float = 1.225  # kg/m^3 at sea level


@dataclass(frozen=True)
class Environment:
    """Physical environment parameters.

    Attributes:
        gravitational_acceleration: Acceleration due to gravity (m/s^2).
        air_density: Ambient air density (kg/m^3).
    """

    gravitational_acceleration: float = GRAVITATIONAL_ACCELERATION
    air_density: float = AIR_DENSITY


@dataclass(frozen=True)
class RocketConfig:
    """Rocket configuration parameters (geometry and aerodynamics only).

    Propulsion is handled separately via the PropulsionSystem interface.
    This separation enforces SOLID principles: the engine doesn't know
    what kind of motor the rocket has.

    Attributes:
        drag_coefficient: Dimensionless drag coefficient (Cd).
        cross_sectional_area: Reference cross-sectional area (m^2).
        launch_angle: Launch angle from horizontal (degrees).
    """

    drag_coefficient: float
    cross_sectional_area: float
    launch_angle: float


@dataclass(frozen=True)
class State:
    """State vector for the rocket at a given time.

    Attributes:
        time: Simulation time (s).
        x: Horizontal position (m).
        y: Vertical position (m).
        vx: Horizontal velocity (m/s).
        vy: Vertical velocity (m/s).
        mass: Current total rocket mass (kg).
        thrust: Current thrust force (N).
        pressure: Current internal pressure (Pa).
        water_remaining: Fraction of water remaining (0-1).
    """

    time: float
    x: float
    y: float
    vx: float
    vy: float
    mass: float
    thrust: float
    pressure: float
    water_remaining: float

    @property
    def speed(self) -> float:
        """Magnitude of the velocity vector (m/s)."""
        return float(np.hypot(self.vx, self.vy))


def compute_drag_force(
    speed: float,
    drag_coefficient: float,
    cross_sectional_area: float,
    air_density: float,
) -> float:
    """Compute the magnitude of quadratic drag force.

    Uses the standard drag equation:
        F_drag = 0.5 * rho * v^2 * Cd * A

    Args:
        speed: Magnitude of velocity relative to air (m/s).
        drag_coefficient: Dimensionless drag coefficient.
        cross_sectional_area: Reference area (m^2).
        air_density: Ambient air density (kg/m^3).

    Returns:
        Drag force magnitude (N). Always non-negative.
    """
    return 0.5 * air_density * speed**2 * drag_coefficient * cross_sectional_area


def compute_acceleration(
    state: State,
    config: RocketConfig,
    env: Environment,
    propulsion_state: PropulsionState,
) -> tuple[float, float]:
    """Compute the acceleration vector for the rocket.

    Forces considered:
        - Thrust: along the launch direction (from propulsion system).
        - Gravity: constant downward.
        - Drag: opposes the velocity vector, magnitude quadratic in speed.

    Note: Mass is taken from the propulsion state, not from config.
    This is the key change in v0.2 — mass varies over time.

    Args:
        state: Current rocket state.
        config: Rocket configuration parameters (aerodynamics only).
        env: Environment parameters.
        propulsion_state: Current propulsion state (provides thrust and mass).

    Returns:
        Tuple of (ax, ay) — acceleration components (m/s^2).
    """
    mass = propulsion_state.mass
    if mass <= 0:
        return 0.0, 0.0

    launch_angle_rad = radians(config.launch_angle)

    # Thrust force components (from propulsion system)
    thrust = propulsion_state.thrust
    thrust_x = thrust * cos(launch_angle_rad)
    thrust_y = thrust * sin(launch_angle_rad)

    # Drag force (opposes velocity)
    speed = state.speed
    if speed > 0.0:
        drag_magnitude = compute_drag_force(
            speed, config.drag_coefficient, config.cross_sectional_area, env.air_density
        )
        # Drag unit vector points opposite to velocity
        drag_x = -drag_magnitude * (state.vx / speed)
        drag_y = -drag_magnitude * (state.vy / speed)
    else:
        drag_x = 0.0
        drag_y = 0.0

    # Gravitational force (downward)
    gravity_y = -mass * env.gravitational_acceleration

    # Net acceleration (F = ma)
    ax = (thrust_x + drag_x) / mass
    ay = (thrust_y + drag_y + gravity_y) / mass

    return ax, ay


def euler_step(
    state: State,
    config: RocketConfig,
    env: Environment,
    propulsion: PropulsionSystem,
    dt: float,
) -> State:
    """Advance the rocket state by one Euler integration step.

    This function:
    1. Queries the propulsion system for current thrust and mass
    2. Computes acceleration from all forces
    3. Updates velocity and position using Euler integration
    4. Returns the new state with all propulsion data

    Args:
        state: Current state.
        config: Rocket configuration (aerodynamics only).
        env: Environment parameters.
        propulsion: Propulsion system interface.
        dt: Time step (s).

    Returns:
        New state after one step.
    """
    # Get propulsion state for this timestep
    prop_state = propulsion.step(state.time + dt, dt)

    ax, ay = compute_acceleration(state, config, env, prop_state)

    new_vx = state.vx + ax * dt
    new_vy = state.vy + ay * dt
    new_x = state.x + state.vx * dt
    new_y = state.y + state.vy * dt
    new_time = state.time + dt

    return State(
        time=new_time,
        x=new_x,
        y=new_y,
        vx=new_vx,
        vy=new_vy,
        mass=prop_state.mass,
        thrust=prop_state.thrust,
        pressure=prop_state.pressure,
        water_remaining=prop_state.propellant_remaining,
    )
