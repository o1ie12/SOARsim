"""
Simulation orchestrator for SOARSim v0.2.

Runs the physics engine forward in time and produces a full trajectory
from launch until the rocket returns to the ground.

v0.2 changes:
- Uses modular propulsion system interface
- Tracks variable mass, thrust, pressure, and water remaining
- Computes max acceleration
- Stores propulsion state during simulation to avoid redundant calls
"""

from dataclasses import dataclass
from typing import List

from app.physics.engine import (
    Environment,
    RocketConfig,
    State,
    compute_acceleration,
    euler_step,
)
from app.physics.propulsion.base import PropulsionSystem, PropulsionState

# Default simulation parameters
DEFAULT_TIME_STEP: float = 0.01  # seconds


@dataclass(frozen=True)
class TrajectoryPoint:
    """A single point in the rocket's trajectory with full state data."""

    time: float
    x: float
    y: float
    vx: float
    vy: float
    ax: float
    ay: float
    thrust: float
    mass: float
    pressure: float
    water_remaining: float


@dataclass(frozen=True)
class SimulationSummary:
    """High-level results from a completed simulation."""

    max_altitude: float
    flight_time: float
    max_velocity: float
    max_acceleration: float


@dataclass(frozen=True)
class SimulationResult:
    """Complete simulation output."""

    summary: SimulationSummary
    trajectory: List[TrajectoryPoint]


def run_simulation(
    config: RocketConfig,
    propulsion: PropulsionSystem,
    env: Environment | None = None,
    dt: float = DEFAULT_TIME_STEP,
) -> SimulationResult:
    """Run a full rocket flight simulation using modular propulsion.

    Uses Euler integration to step the physics forward from launch (t=0)
    until the rocket returns to ground level (y <= 0).

    Args:
        config: Rocket configuration (aerodynamics only).
        propulsion: Modular propulsion system.
        env: Physical environment. Defaults to Earth sea-level conditions.
        dt: Time step for numerical integration (s).

    Returns:
        A SimulationResult containing summary metrics and trajectory data.
    """
    if env is None:
        env = Environment()

    # Get initial propulsion state
    prop_state = propulsion.get_initial_state()

    # Initial state: at origin, zero velocity
    state = State(
        time=0.0,
        x=0.0,
        y=0.0,
        vx=0.0,
        vy=0.0,
        mass=prop_state.mass,
        thrust=prop_state.thrust,
        pressure=prop_state.pressure,
        water_remaining=prop_state.propellant_remaining,
    )

    # Accumulate trajectory with propulsion data captured during simulation
    # to avoid redundant propulsion.step() calls
    trajectory_data: list[tuple[State, PropulsionState]] = [(state, prop_state)]

    max_altitude = 0.0
    max_speed = 0.0
    max_accel = 0.0

    # Simulate until the rocket hits the ground
    while state.y >= 0.0 or state.time == 0.0:
        state = euler_step(state, config, env, propulsion, dt)

        # Stop if we've gone below ground after having been airborne
        if state.y < 0.0 and state.time > dt:
            break

        # Capture propulsion state once per step
        prop_state = propulsion.step(state.time, dt)
        trajectory_data.append((state, prop_state))

        # Track maxima
        if state.y > max_altitude:
            max_altitude = state.y
        if state.speed > max_speed:
            max_speed = state.speed

        # Compute acceleration magnitude for max tracking
        ax, ay = compute_acceleration(state, config, env, prop_state)
        accel_mag = (ax**2 + ay**2) ** 0.5
        if accel_mag > max_accel:
            max_accel = accel_mag

    flight_time = state.time

    # Convert to trajectory points using already-captured data
    trajectory_points: list[TrajectoryPoint] = []
    for s, ps in trajectory_data:
        ax, ay = compute_acceleration(s, config, env, ps)
        trajectory_points.append(
            TrajectoryPoint(
                time=s.time,
                x=s.x,
                y=s.y,
                vx=s.vx,
                vy=s.vy,
                ax=ax,
                ay=ay,
                thrust=ps.thrust,
                mass=ps.mass,
                pressure=ps.pressure,
                water_remaining=ps.propellant_remaining,
            )
        )

    summary = SimulationSummary(
        max_altitude=max_altitude,
        flight_time=flight_time,
        max_velocity=max_speed,
        max_acceleration=max_accel,
    )

    return SimulationResult(summary=summary, trajectory=trajectory_points)
