"""
Analysis API routes for SOARSim v2.0.

Provides REST endpoints for:
    - Parameter sweeps
    - Monte Carlo uncertainty analysis
    - Design of Experiments
    - Optimization
    - Thrust curve management
    - Statistics
"""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, HTTPException

from app.analysis.sweeps import (
    run_parameter_sweep,
    SWEEP_PARAMETER_RANGES,
    PARAMETER_UNITS,
)
from app.analysis.monte_carlo import (
    run_monte_carlo,
    ParameterTolerance,
)
from app.analysis.experiments import (
    run_full_factorial,
    FactorLevel,
)
from app.analysis.statistics import (
    compute_descriptive,
    compute_confidence_interval,
    compute_histogram,
)
from app.physics.propulsion.custom_thrust import parse_thrust_curve_csv, ThrustCurvePoint

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


# ══════════════════════════════════════════════════════════════════
# PARAMETER SWEEP
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/sweep",
    summary="Run a parameter sweep",
    description="Vary one parameter across multiple simulations and return comparison data.",
)
async def parameter_sweep(request: dict) -> dict:
    """Execute a parameter sweep.

    Request body:
    {
        "parameter": "pressure",
        "values": [200000, 400000, 600000, 800000],
        "baseConfig": {
            "dryMass": 0.15,
            "bottleVolume": 0.002,
            "waterVolume": 0.0007,
            "nozzleDiameter": 0.013,
            "dragCoefficient": 0.45,
            "crossSectionalArea": 0.008,
            "launchAngle": 75
        }
    }
    """
    param_name = request.get("parameter", "")
    values = request.get("values", [])
    base_config = request.get("baseConfig", {})

    if not param_name:
        raise HTTPException(status_code=400, detail="Parameter name is required")
    if not values or len(values) < 2:
        raise HTTPException(status_code=400, detail="At least 2 values required")
    if param_name not in SWEEP_PARAMETER_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid parameter: {param_name}. Valid: {list(SWEEP_PARAMETER_RANGES.keys())}",
        )

    try:
        result = run_parameter_sweep(param_name, values, base_config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sweep failed: {e}")

    return {
        "parameterName": result.parameter_name,
        "parameterUnit": result.unit,
        "parameterValues": result.parameter_values,
        "results": [
            {
                "parameterValue": p.parameter_value,
                "maxAltitude": p.max_altitude,
                "flightTime": p.flight_time,
                "maxVelocity": p.max_velocity,
                "maxAcceleration": p.max_acceleration,
                "maxDynamicPressure": p.max_dynamic_pressure,
                "landingDistance": p.landing_distance,
            }
            for p in result.points
        ],
        "statistics": {
            "bestIndex": result.statistics.best_altitude_index,
            "bestValue": result.statistics.best_altitude_value,
            "meanAltitude": result.statistics.mean_altitude,
            "stdAltitude": result.statistics.std_altitude,
            "minAltitude": result.statistics.min_altitude,
            "maxAltitude": result.statistics.max_altitude,
            "sensitivity": result.statistics.sensitivity,
        },
    }


@router.get(
    "/sweep/parameters",
    summary="List available sweep parameters",
    description="Returns the list of parameters that can be swept with their ranges and units.",
)
async def list_sweep_parameters() -> dict:
    """List available sweep parameters."""
    return {
        "parameters": [
            {
                "name": name,
                "unit": PARAMETER_UNITS.get(name, ""),
                "min": range_vals[0],
                "max": range_vals[1],
                "default": range_vals[2],
            }
            for name, range_vals in SWEEP_PARAMETER_RANGES.items()
        ]
    }


# ══════════════════════════════════════════════════════════════════
# MONTE CARLO ANALYSIS
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/montecarlo",
    summary="Run Monte Carlo uncertainty analysis",
    description="Run N simulations with random parameter perturbations to quantify uncertainty.",
)
async def monte_carlo_analysis(request: dict) -> dict:
    """Execute Monte Carlo uncertainty analysis."""
    tolerances_raw = request.get("tolerances", [])
    n_runs = request.get("nRuns", 1000)
    seed = request.get("seed", None)
    threshold = request.get("altitudeThreshold", 50.0)

    if not tolerances_raw:
        raise HTTPException(status_code=400, detail="At least one tolerance is required")
    if n_runs < 1:
        raise HTTPException(status_code=400, detail="nRuns must be >= 1")
    if n_runs > 10000:
        raise HTTPException(status_code=400, detail="nRuns cannot exceed 10,000 for performance")

    tolerances = []
    for t in tolerances_raw:
        tolerances.append(ParameterTolerance(
            name=t.get("name", ""),
            nominal=t.get("nominal", 0),
            tolerance_pct=t.get("tolerancePct", 5.0),
            distribution=t.get("distribution", "uniform"),
        ))

    try:
        result = run_monte_carlo(
            tolerances, n_runs=n_runs, seed=seed,
            altitude_threshold=threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monte Carlo analysis failed: {e}")

    return {
        "nRuns": result.n_runs,
        "tolerances": [
            {"name": t.name, "nominal": t.nominal, "tolerancePct": t.tolerance_pct, "distribution": t.distribution}
            for t in result.tolerances
        ],
        "altitudeStats": {
            "count": result.altitude_stats.count, "mean": result.altitude_stats.mean,
            "std": result.altitude_stats.std, "min": result.altitude_stats.min,
            "max": result.altitude_stats.max, "median": result.altitude_stats.median,
            "q25": result.altitude_stats.q25, "q75": result.altitude_stats.q75,
        },
        "altitudeCI": {
            "mean": result.altitude_ci.mean, "lower": result.altitude_ci.lower,
            "upper": result.altitude_ci.upper, "confidenceLevel": result.altitude_ci.confidence_level,
        },
        "flightTimeStats": {"mean": result.flight_time_stats.mean, "std": result.flight_time_stats.std,
                            "min": result.flight_time_stats.min, "max": result.flight_time_stats.max},
        "velocityStats": {"mean": result.velocity_stats.mean, "std": result.velocity_stats.std,
                          "min": result.velocity_stats.min, "max": result.velocity_stats.max},
        "landingDispersion": {
            "meanX": result.landing_dispersion.mean_x, "meanY": result.landing_dispersion.mean_y,
            "stdX": result.landing_dispersion.std_x, "stdY": result.landing_dispersion.std_y,
            "circularErrorProbability": result.landing_dispersion.circular_error_probability,
            "maxRange": result.landing_dispersion.max_range, "minRange": result.landing_dispersion.min_range,
        },
        "probabilityAboveThreshold": result.probability_above_threshold,
        "runs": [
            {"runIndex": r.run_index, "parameters": r.parameters, "maxAltitude": r.max_altitude,
             "flightTime": r.flight_time, "maxVelocity": r.max_velocity, "landingDistance": r.landing_distance}
            for r in result.runs[:100]
        ],
    }


# ══════════════════════════════════════════════════════════════════
# DESIGN OF EXPERIMENTS
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/experiments/full-factorial",
    summary="Run full factorial experiment",
    description="Test every combination of factor levels.",
)
async def full_factorial_experiment(request: dict) -> dict:
    """Execute a full factorial Design of Experiments."""
    factors_raw = request.get("factors", [])
    base_config = request.get("baseConfig", {})

    if not factors_raw:
        raise HTTPException(status_code=400, detail="At least one factor is required")

    factors = []
    for f in factors_raw:
        levels = f.get("levels", [])
        if len(levels) < 2:
            raise HTTPException(status_code=400, detail=f"Factor '{f.get('name')}' must have at least 2 levels")
        factors.append(FactorLevel(name=f.get("name", ""), levels=levels, unit=f.get("unit", "")))

    total = 1
    for f in factors:
        total *= len(f.levels)
    if total > 10000:
        raise HTTPException(status_code=400, detail=f"Too many combinations ({total}). Max 10,000.")

    try:
        result = run_full_factorial(factors, base_config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Experiment failed: {e}")

    return {
        "designType": result.design_type, "totalRuns": result.total_runs,
        "bestIndex": result.best_index, "worstIndex": result.worst_index,
        "factors": [{"name": f.name, "levels": f.levels, "unit": f.unit} for f in result.factors],
        "points": [
            {"runIndex": p.run_index, "parameters": p.parameters, "maxAltitude": p.max_altitude,
             "flightTime": p.flight_time, "maxVelocity": p.max_velocity,
             "landingDistance": p.landing_distance, "rank": p.rank}
            for p in result.points
        ],
    }


# ══════════════════════════════════════════════════════════════════
# OPTIMIZATION
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/optimize",
    summary="Optimize a design parameter",
    description="Find the optimal value of a parameter to maximize/minimize a metric.",
)
async def optimize_design(request: dict) -> dict:
    """Optimize a parameter using golden section search.

    Request body:
    {
        "parameter": "pressure",
        "metric": "maxAltitude",
        "objective": "maximize",
        "bounds": [50000, 1000000],
        "baseConfig": { ... }
    }
    """
    from app.analysis.sweeps import _build_water_rocket_config
    from app.physics.engine import RocketConfig
    from app.simulation.simulator import run_simulation

    param_name = request.get("parameter", "")
    metric = request.get("metric", "maxAltitude")
    objective = request.get("objective", "maximize")
    bounds = request.get("bounds", [50000, 1000000])
    base_config = request.get("baseConfig", {})
    max_iterations = request.get("maxIterations", 50)

    if not param_name:
        raise HTTPException(status_code=400, detail="Parameter name is required")
    if len(bounds) != 2 or bounds[0] >= bounds[1]:
        raise HTTPException(status_code=400, detail="Invalid bounds: must be [min, max] with min < max")

    def evaluate(value: float) -> float:
        params = dict(base_config)
        params[param_name] = value
        from app.analysis.config_builder import build_configs
        rocket_config, propulsion = build_configs(params, "water")
        result = run_simulation(rocket_config, propulsion)
        metrics = {
            "maxAltitude": result.summary.max_altitude,
            "flightTime": result.summary.flight_time,
            "maxVelocity": result.summary.max_velocity,
            "maxAcceleration": result.summary.max_acceleration,
        }
        return metrics.get(metric, 0.0)

    # Golden section search
    phi = (1 + 5**0.5) / 2
    a, b = float(bounds[0]), float(bounds[1])
    c = b - (b - a) / phi
    d = a + (b - a) / phi

    evaluations = []

    for i in range(max_iterations):
        fc = evaluate(c)
        fd = evaluate(d)
        evaluations.append({"value": c, "metric": fc})
        evaluations.append({"value": d, "metric": fd})

        if objective == "maximize":
            if fc > fd:
                b = d
            else:
                a = c
        else:
            if fc < fd:
                b = d
            else:
                a = c

        c = b - (b - a) / phi
        d = a + (b - a) / phi

        if abs(b - a) < 1e-6:
            break

    optimal_value = (a + b) / 2
    optimal_metric = evaluate(optimal_value)

    return {
        "parameter": param_name,
        "metric": metric,
        "objective": objective,
        "optimalValue": optimal_value,
        "optimalMetric": optimal_metric,
        "iterations": len(evaluations) // 2,
        "converged": abs(b - a) < 1e-6,
    }


# ══════════════════════════════════════════════════════════════════
# THRUST CURVE
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/thrustcurve",
    summary="Parse and validate a thrust curve",
    description="Upload a CSV thrust curve and get parsed/validated data back.",
)
async def parse_thrust_curve(request: dict) -> dict:
    """Parse a CSV thrust curve.

    Request body:
    {
        "csvContent": "time,thrust\\n0.0,0.0\\n0.1,50.0\\n0.2,0.0",
        "propellantMass": 0.05,
        "casingMass": 0.015
    }
    """
    csv_content = request.get("csvContent", "")
    propellant_mass = request.get("propellantMass", 0.05)
    casing_mass = request.get("casingMass", 0.015)

    if not csv_content:
        raise HTTPException(status_code=400, detail="CSV content is required")

    try:
        points = parse_thrust_curve_csv(csv_content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    total_impulse = sum(
        (points[i].thrust + points[i - 1].thrust) / 2 * (points[i].time - points[i - 1].time)
        for i in range(1, len(points))
    )

    burn_duration = points[-1].time - points[0].time if points else 0
    max_thrust = max(p.thrust for p in points) if points else 0
    avg_thrust = total_impulse / burn_duration if burn_duration > 0 else 0

    return {
        "points": [{"time": p.time, "thrust": p.thrust} for p in points],
        "totalImpulse": total_impulse,
        "burnDuration": burn_duration,
        "maxThrust": max_thrust,
        "avgThrust": avg_thrust,
        "propellantMass": propellant_mass,
        "casingMass": casing_mass,
    }


# ══════════════════════════════════════════════════════════════════
# STATISTICS
# ══════════════════════════════════════════════════════════════════


@router.post(
    "/statistics",
    summary="Compute statistics for a dataset",
    description="Compute descriptive statistics, confidence intervals, and histograms.",
)
async def compute_statistics(request: dict) -> dict:
    """Compute statistics for a list of values."""
    values = request.get("values", [])
    if not values:
        raise HTTPException(status_code=400, detail="Values list is required")

    confidence_level = request.get("confidenceLevel", 0.95)
    n_bins = request.get("nBins", 20)

    desc = compute_descriptive(values)
    ci = compute_confidence_interval(values, confidence_level)
    hist = compute_histogram(values, n_bins)

    return {
        "descriptive": {
            "count": desc.count, "mean": desc.mean, "std": desc.std, "variance": desc.variance,
            "min": desc.min, "max": desc.max, "median": desc.median,
            "q25": desc.q25, "q75": desc.q75, "iqr": desc.iqr,
            "skewness": desc.skewness, "kurtosis": desc.kurtosis,
        },
        "confidenceInterval": {
            "mean": ci.mean, "lower": ci.lower, "upper": ci.upper,
            "confidenceLevel": ci.confidence_level,
        },
        "histogram": {"bins": hist.bins, "counts": hist.counts, "density": hist.density},
    }
