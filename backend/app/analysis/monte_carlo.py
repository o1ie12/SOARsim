"""
Monte Carlo uncertainty analysis for SOARSim v2.0.

Allows users to define parameter tolerances and run hundreds or thousands
of simulations with random perturbations to quantify uncertainty in
simulation results.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Any

from app.physics.engine import Environment, RocketConfig
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.simulation.simulator import run_simulation
from app.analysis.statistics import (
    DescriptiveStats,
    ConfidenceInterval,
    compute_descriptive,
    compute_confidence_interval,
)


@dataclass
class ParameterTolerance:
    """Tolerance definition for a single parameter."""
    name: str
    nominal: float
    tolerance_pct: float  # Percentage tolerance (e.g., 5.0 for ±5%)
    distribution: str = "uniform"  # "uniform", "normal", "triangular"


@dataclass
class MonteCarloRun:
    """Result of a single Monte Carlo simulation run."""
    run_index: int
    parameters: dict[str, float]
    max_altitude: float
    flight_time: float
    max_velocity: float
    max_acceleration: float
    landing_distance: float
    landing_x: float
    landing_y: float


@dataclass
class LandingDispersion:
    """Statistics for landing position dispersion."""
    mean_x: float
    mean_y: float
    std_x: float
    std_y: float
    circular_error_probability: float  # CEP: radius containing 50% of landings
    max_range: float
    min_range: float


@dataclass
class MonteCarloResult:
    """Complete Monte Carlo analysis result."""
    n_runs: int
    tolerances: list[ParameterTolerance]
    runs: list[MonteCarloRun]
    altitude_stats: DescriptiveStats
    altitude_ci: ConfidenceInterval
    flight_time_stats: DescriptiveStats
    velocity_stats: DescriptiveStats
    landing_dispersion: LandingDispersion
    probability_above_threshold: dict[str, float]  # threshold -> probability


def _sample_parameter(tolerance: ParameterTolerance, rng: random.Random) -> float:
    """Sample a parameter value based on its tolerance and distribution."""
    nom = tolerance.nominal
    pct = tolerance.tolerance_pct / 100.0
    delta = nom * pct

    if tolerance.distribution == "normal":
        # 3-sigma = delta, so sigma = delta/3
        sigma = delta / 3.0
        value = rng.gauss(nom, sigma)
    elif tolerance.distribution == "triangular":
        value = rng.triangular(nom - delta, nom + delta, nom)
    else:  # uniform
        value = rng.uniform(nom - delta, nom + delta)

    # Enforce physical constraints
    if tolerance.name in ("pressure", "dryMass", "bottleVolume", "nozzleDiameter", "dragCoefficient", "crossSectionalArea"):
        value = max(value, 1e-10)
    if tolerance.name == "waterVolume":
        value = max(value, 0.0)

    return value


def _build_configs(
    sampled: dict[str, float],
) -> tuple[RocketConfig, WaterRocketConfig]:
    """Build rocket and propulsion configs from sampled parameters."""
    water_config = WaterRocketConfig(
        dry_mass=sampled.get("dryMass", 0.15),
        bottle_volume=sampled.get("bottleVolume", 0.002),
        water_volume=sampled.get("waterVolume", 0.0007),
        initial_pressure=sampled.get("pressure", 400_000),
        nozzle_diameter=sampled.get("nozzleDiameter", 0.013),
    )
    rocket_config = RocketConfig(
        drag_coefficient=sampled.get("dragCoefficient", 0.45),
        cross_sectional_area=sampled.get("crossSectionalArea", 0.008),
        launch_angle=sampled.get("launchAngle", 75.0),
    )
    return rocket_config, water_config


def run_monte_carlo(
    tolerances: list[ParameterTolerance],
    n_runs: int = 1000,
    seed: int | None = None,
    env: Environment | None = None,
    altitude_threshold: float = 50.0,
) -> MonteCarloResult:
    """Run a Monte Carlo uncertainty analysis.

    Args:
        tolerances: List of parameter tolerances defining the uncertainty.
        n_runs: Number of simulation runs. Default 1000.
        seed: Random seed for reproducibility. None for non-deterministic.
        env: Environment model. Defaults to sea-level constant atmosphere.
        altitude_threshold: Altitude threshold for probability calculations.

    Returns:
        MonteCarloResult with full statistics and per-run data.
    """
    if env is None:
        env = Environment()
    if n_runs < 1:
        n_runs = 1

    rng = random.Random(seed)
    runs: list[MonteCarloRun] = []

    for i in range(n_runs):
        # Sample all parameters
        sampled: dict[str, float] = {}
        for t in tolerances:
            sampled[t.name] = _sample_parameter(t, rng)

        # Build configs and run simulation
        rocket_config, water_config = _build_configs(sampled)
        propulsion = WaterRocket(water_config)

        try:
            result = run_simulation(rocket_config, propulsion, env=env)
            landing_dist = 0.0
            landing_x = 0.0
            landing_y = 0.0
            if result.trajectory:
                last = result.trajectory[-1]
                landing_x = last.x
                landing_y = last.y
                landing_dist = math.sqrt(last.x ** 2 + last.y ** 2)

            runs.append(MonteCarloRun(
                run_index=i,
                parameters=sampled,
                max_altitude=result.summary.max_altitude,
                flight_time=result.summary.flight_time,
                max_velocity=result.summary.max_velocity,
                max_acceleration=result.summary.max_acceleration,
                landing_distance=landing_dist,
                landing_x=landing_x,
                landing_y=landing_y,
            ))
        except Exception:
            # Skip failed runs (e.g., invalid parameter combinations)
            continue

    if not runs:
        # Return empty result
        empty_stats = DescriptiveStats(
            count=0, mean=0, std=0, variance=0, min=0, max=0,
            median=0, q25=0, q75=0, iqr=0, skewness=0, kurtosis=0,
        )
        empty_ci = ConfidenceInterval(mean=0, lower=0, upper=0, confidence_level=0.95)
        empty_disp = LandingDispersion(
            mean_x=0, mean_y=0, std_x=0, std_y=0,
            circular_error_probability=0, max_range=0, min_range=0,
        )
        return MonteCarloResult(
            n_runs=0, tolerances=tolerances, runs=[],
            altitude_stats=empty_stats, altitude_ci=empty_ci,
            flight_time_stats=empty_stats, velocity_stats=empty_stats,
            landing_dispersion=empty_disp,
            probability_above_threshold={},
        )

    # Compute statistics
    altitudes = [r.max_altitude for r in runs]
    flight_times = [r.flight_time for r in runs]
    velocities = [r.max_velocity for r in runs]
    landing_x = [r.landing_x for r in runs]
    landing_y = [r.landing_y for r in runs]

    altitude_stats = compute_descriptive(altitudes)
    altitude_ci = compute_confidence_interval(altitudes, 0.95)
    flight_time_stats = compute_descriptive(flight_times)
    velocity_stats = compute_descriptive(velocities)

    # Landing dispersion
    mean_lx = sum(landing_x) / len(landing_x)
    mean_ly = sum(landing_y) / len(landing_y)
    std_lx = math.sqrt(sum((x - mean_lx) ** 2 for x in landing_x) / len(landing_x)) if len(landing_x) > 1 else 0
    std_ly = math.sqrt(sum((y - mean_ly) ** 2 for y in landing_y) / len(landing_y)) if len(landing_y) > 1 else 0

    # Circular Error Probability (CEP): radius containing 50% of landings
    distances = [math.sqrt(x ** 2 + y ** 2) for x, y in zip(landing_x, landing_y)]
    distances_sorted = sorted(distances)
    cep_idx = len(distances_sorted) // 2
    cep = distances_sorted[cep_idx] if distances_sorted else 0

    landing_disp = LandingDispersion(
        mean_x=mean_lx,
        mean_y=mean_ly,
        std_x=std_lx,
        std_y=std_ly,
        circular_error_probability=cep,
        max_range=max(distances) if distances else 0,
        min_range=min(distances) if distances else 0,
    )

    # Probability above threshold
    prob_above = {
        str(altitude_threshold): sum(1 for a in altitudes if a >= altitude_threshold) / len(altitudes),
    }

    return MonteCarloResult(
        n_runs=len(runs),
        tolerances=tolerances,
        runs=runs,
        altitude_stats=altitude_stats,
        altitude_ci=altitude_ci,
        flight_time_stats=flight_time_stats,
        velocity_stats=velocity_stats,
        landing_dispersion=landing_disp,
        probability_above_threshold=prob_above,
    )
