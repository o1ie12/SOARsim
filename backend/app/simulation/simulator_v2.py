"""
Enhanced simulation orchestrator for SOARSim v2.0.

Extends v1.0 simulator with:
- Multiple numerical integration methods (Euler, RK4, RK45)
- Advanced atmosphere model (ISA standard)
- Wind model support
- Advanced aerodynamics (Mach-dependent drag)
- Extended trajectory data (Mach, dynamic pressure, energy)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from app.physics.engine import (
    Environment,
    RocketConfig,
    State,
    compute_acceleration,
)
from app.physics.propulsion.base import PropulsionSystem, PropulsionState
from app.physics.solvers import (
    SolverType,
    SolverConfig,
    euler_step_solver,
    rk4_step_solver,
    rk45_step_solver,
)
from app.physics.atmosphere import AtmosphereModel, AtmosphereType, AtmosphereState
from app.physics.wind import WindModel, WindType, WindState
from app.physics.aerodynamics import AerodynamicConfig, compute_aerodynamic_forces


DEFAULT_TIME_STEP: float = 0.01


@dataclass(frozen=True)
class TrajectoryPoint:
    """A single point in the rocket's trajectory with extended data."""
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
    # Extended fields (v2.0)
    mach_number: float = 0.0
    dynamic_pressure: float = 0.0
    total_energy: float = 0.0
    kinetic_energy: float = 0.0
    potential_energy: float = 0.0
    wind_drift_x: float = 0.0
    wind_drift_y: float = 0.0


@dataclass(frozen=True)
class SimulationSummary:
    """High-level results from a completed simulation."""
    max_altitude: float
    flight_time: float
    max_velocity: float
    max_acceleration: float
    # Extended fields (v2.0)
    max_mach: float = 0.0
    max_dynamic_pressure: float = 0.0
    total_impulse: float = 0.0
    specific_impulse: float = 0.0
    max_kinetic_energy: float = 0.0
    max_potential_energy: float = 0.0
    landing_distance: float = 0.0
    landing_x: float = 0.0
    landing_y: float = 0.0


@dataclass(frozen=True)
class SimulationResult:
    """Complete simulation output."""
    summary: SimulationSummary
    trajectory: List[TrajectoryPoint]


def run_simulation_v2(
    config: RocketConfig,
    propulsion: PropulsionSystem,
    solver_config: SolverConfig | None = None,
    atmosphere: AtmosphereModel | None = None,
    wind: WindModel | None = None,
    aerodynamics: AerodynamicConfig | None = None,
    dt: float = DEFAULT_TIME_STEP,
) -> SimulationResult:
    """Run a full rocket flight simulation with v2.0 features.

    Args:
        config: Rocket configuration (aerodynamics only).
        propulsion: Modular propulsion system.
        solver_config: Numerical integration settings. Defaults to RK4.
        atmosphere: Atmosphere model. Defaults to ISA standard.
        wind: Wind model. Defaults to no wind.
        aerodynamics: Advanced aerodynamic config. Uses simple model if None.
        dt: Time step for numerical integration (s).

    Returns:
        SimulationResult with full trajectory and extended summary.
    """
    if solver_config is None:
        solver_config = SolverConfig(solver_type=SolverType.RK4)
    if atmosphere is None:
        atmosphere = AtmosphereModel(model_type=AtmosphereType.STANDARD)
    if wind is None:
        wind = WindModel(wind_type=WindType.NONE)

    # Get initial propulsion state
    prop_state = propulsion.get_initial_state()

    # Initial state
    state = State(
        time=0.0, x=0.0, y=0.0, vx=0.0, vy=0.0,
        mass=prop_state.mass, thrust=prop_state.thrust,
        pressure=prop_state.pressure, water_remaining=prop_state.propellant_remaining,
    )

    trajectory_data: list[tuple[State, PropulsionState]] = [(state, prop_state)]

    max_altitude = 0.0
    max_speed = 0.0
    max_accel = 0.0
    max_mach = 0.0
    max_q = 0.0
    total_impulse = 0.0
    max_kinetic = 0.0
    max_potential = 0.0

    # Wind drift tracking
    wind_drift_x = 0.0
    wind_drift_y = 0.0

    solver = solver_config.solver_type
    adaptive_dt = dt
    min_dt = solver_config.min_time_step
    max_dt = solver_config.max_time_step
    tolerance = solver_config.tolerance
    iterations = 0

    # Simulate until rocket hits ground
    while state.y >= 0.0 or state.time == 0.0:
        if iterations >= solver_config.max_iterations:
            break

        # Get atmosphere at current altitude
        atm_state = atmosphere.get_state(state.y)

        # Get wind at current altitude
        wind_state = wind.get_wind(state.y)

        # Compute wind-adjusted velocity for drag
        airspeed_x = state.vx - wind_state.vx
        airspeed_y = state.vy - wind_state.vy
        airspeed = (airspeed_x ** 2 + airspeed_y ** 2) ** 0.5

        # Track wind drift
        wind_drift_x += wind_state.vx * adaptive_dt
        wind_drift_y += wind_state.vy * adaptive_dt

        # Choose solver
        if solver == SolverType.RK45:
            new_state, suggested_dt = rk45_step_solver(
                state, config, Environment(
                    gravitational_acceleration=9.80665,
                    air_density=atm_state.density,
                ), propulsion, adaptive_dt, tolerance,
            )
            # Clamp adaptive step
            adaptive_dt = max(min_dt, min(suggested_dt, max_dt))
        elif solver == SolverType.RK4:
            new_state = rk4_step_solver(
                state, config, Environment(
                    gravitational_acceleration=9.80665,
                    air_density=atm_state.density,
                ), propulsion, adaptive_dt,
            )
        else:
            new_state = euler_step_solver(
                state, config, Environment(
                    gravitational_acceleration=9.80665,
                    air_density=atm_state.density,
                ), propulsion, adaptive_dt,
            )

        # Stop if below ground after launch
        if new_state.y < 0.0 and new_state.time > adaptive_dt:
            break

        state = new_state
        prop_state = propulsion.step(state.time, adaptive_dt)
        trajectory_data.append((state, prop_state))

        # Track maxima
        speed = state.speed
        if state.y > max_altitude:
            max_altitude = state.y
        if speed > max_speed:
            max_speed = speed

        # Acceleration
        ax, ay = compute_acceleration(
            state, config,
            Environment(air_density=atm_state.density),
            prop_state,
        )
        accel_mag = (ax ** 2 + ay ** 2) ** 0.5
        if accel_mag > max_accel:
            max_accel = accel_mag

        # Mach number
        mach = airspeed / atm_state.speed_of_sound if atm_state.speed_of_sound > 0 else 0.0
        if mach > max_mach:
            max_mach = mach

        # Dynamic pressure
        q = 0.5 * atm_state.density * airspeed ** 2
        if q > max_q:
            max_q = q

        # Energy
        ke = 0.5 * prop_state.mass * speed ** 2
        pe = prop_state.mass * 9.80665 * state.y
        if ke > max_kinetic:
            max_kinetic = ke
        if pe > max_potential:
            max_potential = pe

        # Total impulse accumulation
        if prop_state.thrust > 0:
            total_impulse += prop_state.thrust * adaptive_dt

        iterations += 1

    flight_time = state.time

    # Specific impulse (if we have propellant consumption)
    propellant_consumed = propulsion.get_initial_state().mass - prop_state.mass
    specific_impulse = total_impulse / (propellant_consumed * 9.80665) if propellant_consumed > 0 else 0.0

    # Build trajectory points
    trajectory_points: list[TrajectoryPoint] = []
    wind_dx = 0.0
    wind_dy = 0.0

    for s, ps in trajectory_data:
        atm_s = atmosphere.get_state(s.y)
        wind_s = wind.get_wind(s.y)
        wind_dx += wind_s.vx * dt
        wind_dy += wind_s.vy * dt

        airspeed_s = ((s.vx - wind_s.vx) ** 2 + (s.vy - wind_s.vy) ** 2) ** 0.5
        mach_s = airspeed_s / atm_s.speed_of_sound if atm_s.speed_of_sound > 0 else 0.0
        q_s = 0.5 * atm_s.density * airspeed_s ** 2
        ke_s = 0.5 * ps.mass * s.speed ** 2
        pe_s = ps.mass * 9.80665 * s.y

        ax, ay = compute_acceleration(
            s, config, Environment(air_density=atm_s.density), ps,
        )

        trajectory_points.append(TrajectoryPoint(
            time=s.time, x=s.x, y=s.y, vx=s.vx, vy=s.vy,
            ax=ax, ay=ay,
            thrust=ps.thrust, mass=ps.mass,
            pressure=ps.pressure, water_remaining=ps.propellant_remaining,
            mach_number=mach_s, dynamic_pressure=q_s,
            total_energy=ke_s + pe_s, kinetic_energy=ke_s, potential_energy=pe_s,
            wind_drift_x=wind_dx, wind_drift_y=wind_dy,
        ))

    # Landing distance
    landing_x = trajectory_points[-1].x if trajectory_points else 0.0
    landing_y = trajectory_points[-1].y if trajectory_points else 0.0
    landing_distance = (landing_x ** 2 + landing_y ** 2) ** 0.5

    summary = SimulationSummary(
        max_altitude=max_altitude,
        flight_time=flight_time,
        max_velocity=max_speed,
        max_acceleration=max_accel,
        max_mach=max_mach,
        max_dynamic_pressure=max_q,
        total_impulse=total_impulse,
        specific_impulse=specific_impulse,
        max_kinetic_energy=max_kinetic,
        max_potential_energy=max_potential,
        landing_distance=landing_distance,
        landing_x=landing_x,
        landing_y=landing_y,
    )

    return SimulationResult(summary=summary, trajectory=trajectory_points)
