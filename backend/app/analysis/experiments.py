"""
Design of Experiments (DoE) module for SOARSim v2.0.

Supports engineering experiments with full factorial and fractional factorial
designs. Automatically runs every parameter combination and generates
summary tables highlighting best-performing designs.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass, field
from typing import Any

from app.physics.engine import Environment
from app.simulation.simulator import run_simulation
from app.analysis.config_builder import build_configs, compute_landing_distance


@dataclass
class FactorLevel:
    """A single factor (parameter) with its test levels."""
    name: str
    levels: list[float]
    unit: str = ""


@dataclass
class ExperimentPoint:
    """Result of a single experiment run."""
    run_index: int
    parameters: dict[str, float]
    max_altitude: float
    flight_time: float
    max_velocity: float
    max_acceleration: float
    landing_distance: float
    rank: int = 0  # Rank by primary metric (1 = best)


@dataclass
class ExperimentResult:
    """Complete Design of Experiments result."""
    factors: list[FactorLevel]
    design_type: str  # "full_factorial" or "fractional"
    points: list[ExperimentPoint]
    best_index: int
    worst_index: int
    total_runs: int
    response_surface: dict[str, list[float]]  # Factor values -> response values


def run_full_factorial(
    factors: list[FactorLevel],
    base_config: dict[str, Any] | None = None,
    env: Environment | None = None,
) -> ExperimentResult:
    """Run a full factorial experiment.

    Tests every combination of factor levels.

    Args:
        factors: List of FactorLevel defining the factors and their levels.
        base_config: Base configuration (non-swept parameters stay at defaults).
        env: Environment model. Defaults to sea-level constant atmosphere.

    Returns:
        ExperimentResult with all runs ranked by max altitude.
    """
    if env is None:
        env = Environment()
    if base_config is None:
        base_config = {}

    # Generate all combinations
    level_lists = [f.levels for f in factors]
    combinations = list(itertools.product(*level_lists))

    points: list[ExperimentPoint] = []

    for idx, combo in enumerate(combinations):
        params = dict(base_config)
        for factor, value in zip(factors, combo):
            params[factor.name] = value

        try:
            rocket_config, propulsion = build_configs(params, "water")
            result = run_simulation(rocket_config, propulsion, env=env)

            points.append(ExperimentPoint(
                run_index=idx,
                parameters=params,
                max_altitude=result.summary.max_altitude,
                flight_time=result.summary.flight_time,
                max_velocity=result.summary.max_velocity,
                max_acceleration=result.summary.max_acceleration,
                landing_distance=compute_landing_distance(result.trajectory),
            ))
        except Exception:
            # Skip failed runs
            continue

    # Rank by max altitude (1 = best)
    sorted_indices = sorted(range(len(points)), key=lambda i: points[i].max_altitude, reverse=True)
    for rank, idx in enumerate(sorted_indices, 1):
        points[idx].rank = rank

    best_idx = sorted_indices[0] if sorted_indices else 0
    worst_idx = sorted_indices[-1] if sorted_indices else 0

    # Build response surface data
    response_surface: dict[str, list[float]] = {}
    for f in factors:
        response_surface[f.name] = [p.parameters.get(f.name, 0) for p in points]
    response_surface["maxAltitude"] = [p.max_altitude for p in points]
    response_surface["flightTime"] = [p.flight_time for p in points]
    response_surface["rank"] = [p.rank for p in points]

    return ExperimentResult(
        factors=factors,
        design_type="full_factorial",
        points=points,
        best_index=best_idx,
        worst_index=worst_idx,
        total_runs=len(points),
        response_surface=response_surface,
    )


def run_fractional_factorial(
    factors: list[FactorLevel],
    base_config: dict[str, Any] | None = None,
    env: Environment | None = None,
    resolution: int = 3,
) -> ExperimentResult:
    """Run a fractional factorial experiment.

    Uses a subset of the full factorial design for efficiency.

    Args:
        factors: List of FactorLevel (each must have exactly 2 levels for fractional design).
        base_config: Base configuration.
        env: Environment model.
        resolution: Design resolution (3 or 4). Higher = less confounding.

    Returns:
        ExperimentResult with fractional design runs.
    """
    if env is None:
        env = Environment()
    if base_config is None:
        base_config = {}

    # Select subset of combinations
    all_combos = list(itertools.product(*[f.levels for f in factors]))

    if len(all_combos) > 4:
        selected = []
        for i, combo in enumerate(all_combos):
            if i % 2 == 0 or resolution >= 4:
                selected.append(combo)
        combinations = selected
    else:
        combinations = all_combos

    points: list[ExperimentPoint] = []

    for idx, combo in enumerate(combinations):
        params = dict(base_config)
        for factor, value in zip(factors, combo):
            params[factor.name] = value

        try:
            rocket_config, propulsion = build_configs(params, "water")
            result = run_simulation(rocket_config, propulsion, env=env)

            points.append(ExperimentPoint(
                run_index=idx,
                parameters=params,
                max_altitude=result.summary.max_altitude,
                flight_time=result.summary.flight_time,
                max_velocity=result.summary.max_velocity,
                max_acceleration=result.summary.max_acceleration,
                landing_distance=compute_landing_distance(result.trajectory),
            ))
        except Exception:
            continue

    # Rank by max altitude
    sorted_indices = sorted(range(len(points)), key=lambda i: points[i].max_altitude, reverse=True)
    for rank, idx in enumerate(sorted_indices, 1):
        points[idx].rank = rank

    best_idx = sorted_indices[0] if sorted_indices else 0
    worst_idx = sorted_indices[-1] if sorted_indices else 0

    response_surface: dict[str, list[float]] = {}
    for f in factors:
        response_surface[f.name] = [p.parameters.get(f.name, 0) for p in points]
    response_surface["maxAltitude"] = [p.max_altitude for p in points]
    response_surface["flightTime"] = [p.flight_time for p in points]
    response_surface["rank"] = [p.rank for p in points]

    return ExperimentResult(
        factors=factors,
        design_type="fractional_factorial",
        points=points,
        best_index=best_idx,
        worst_index=worst_idx,
        total_runs=len(points),
        response_surface=response_surface,
    )
