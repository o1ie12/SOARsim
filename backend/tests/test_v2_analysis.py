"""
Comprehensive tests for SOARSim v2.0 analysis modules.
"""

import pytest
import math

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
from app.analysis.config_builder import build_configs, compute_landing_distance


DEFAULT_CONFIG = {
    "dryMass": 0.15,
    "bottleVolume": 0.002,
    "waterVolume": 0.0007,
    "pressure": 400000,
    "nozzleDiameter": 0.013,
    "dragCoefficient": 0.45,
    "crossSectionalArea": 0.008,
    "launchAngle": 75,
}


# ══════════════════════════════════════════════════════════════════
# STATISTICS TESTS
# ══════════════════════════════════════════════════════════════════


class TestStatistics:

    def test_descriptive_basic(self):
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        stats = compute_descriptive(values)
        assert stats.count == 5
        assert stats.mean == 3.0
        assert stats.min == 1.0
        assert stats.max == 5.0
        assert stats.median == 3.0

    def test_descriptive_empty(self):
        stats = compute_descriptive([])
        assert stats.count == 0

    def test_descriptive_single(self):
        stats = compute_descriptive([5.0])
        assert stats.count == 1
        assert stats.mean == 5.0
        assert stats.std == 0.0

    def test_descriptive_variance(self):
        values = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
        stats = compute_descriptive(values)
        assert abs(stats.mean - 5.0) < 0.01
        assert stats.std > 0

    def test_confidence_interval(self):
        values = [10.0, 12.0, 11.0, 13.0, 9.0, 10.0, 11.0, 12.0]
        ci = compute_confidence_interval(values, 0.95)
        assert ci.lower < ci.mean < ci.upper
        assert ci.confidence_level == 0.95

    def test_confidence_interval_empty(self):
        ci = compute_confidence_interval([], 0.95)
        assert ci.mean == 0

    def test_histogram(self):
        values = list(range(100))
        hist = compute_histogram(values, 10)
        assert len(hist.bins) == 11  # 10 bins = 11 edges
        assert len(hist.counts) == 10
        assert sum(hist.counts) == 100

    def test_histogram_empty(self):
        hist = compute_histogram([], 10)
        assert len(hist.bins) == 0

    def test_histogram_single_value(self):
        hist = compute_histogram([5.0, 5.0, 5.0], 10)
        assert sum(hist.counts) == 3


# ══════════════════════════════════════════════════════════════════
# PARAMETER SWEEP TESTS
# ══════════════════════════════════════════════════════════════════


class TestParameterSweep:

    def test_sweep_pressure(self):
        values = [200000, 400000, 600000]
        result = run_parameter_sweep("pressure", values, DEFAULT_CONFIG)
        assert len(result.points) == 3
        assert result.parameter_name == "pressure"
        assert result.unit == "Pa"
        # Higher pressure should give higher altitude
        assert result.points[2].max_altitude > result.points[0].max_altitude

    def test_sweep_statistics(self):
        values = [200000, 400000, 600000]
        result = run_parameter_sweep("pressure", values, DEFAULT_CONFIG)
        assert result.statistics.best_altitude_value > 0
        assert result.statistics.mean_altitude > 0
        assert result.statistics.sensitivity > 0  # Positive sensitivity

    def test_sweep_water_volume(self):
        values = [0.0003, 0.0007, 0.0011]
        result = run_parameter_sweep("waterVolume", values, DEFAULT_CONFIG)
        assert len(result.points) == 3

    def test_sweep_launch_angle(self):
        values = [45, 60, 75, 90]
        result = run_parameter_sweep("launchAngle", values, DEFAULT_CONFIG)
        assert len(result.points) == 4

    def test_sweep_nozzle_diameter(self):
        values = [0.008, 0.013, 0.018]
        result = run_parameter_sweep("nozzleDiameter", values, DEFAULT_CONFIG)
        assert len(result.points) == 3

    def test_sweep_parameters_list(self):
        assert "pressure" in SWEEP_PARAMETER_RANGES
        assert "waterVolume" in SWEEP_PARAMETER_RANGES
        assert "launchAngle" in SWEEP_PARAMETER_RANGES
        assert "nozzleDiameter" in SWEEP_PARAMETER_RANGES

    def test_sweep_units(self):
        assert PARAMETER_UNITS["pressure"] == "Pa"
        assert PARAMETER_UNITS["waterVolume"] == "m³"


# ══════════════════════════════════════════════════════════════════
# MONTE CARLO TESTS
# ══════════════════════════════════════════════════════════════════


class TestMonteCarlo:

    def test_basic_monte_carlo(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=5.0),
            ParameterTolerance(name="dryMass", nominal=0.15, tolerance_pct=2.0),
        ]
        result = run_monte_carlo(tolerances, n_runs=100, seed=42)
        assert result.n_runs == 100
        assert len(result.runs) == 100

    def test_monte_carlo_statistics(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=10.0),
        ]
        result = run_monte_carlo(tolerances, n_runs=200, seed=42)
        assert result.altitude_stats.count == 200
        assert result.altitude_stats.mean > 0
        assert result.altitude_stats.std > 0
        assert result.altitude_ci.lower < result.altitude_ci.mean < result.altitude_ci.upper

    def test_monte_carlo_reproducibility(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=5.0),
        ]
        r1 = run_monte_carlo(tolerances, n_runs=50, seed=42)
        r2 = run_monte_carlo(tolerances, n_runs=50, seed=42)
        assert r1.altitude_stats.mean == r2.altitude_stats.mean

    def test_monte_carlo_distributions(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=5.0, distribution="normal"),
            ParameterTolerance(name="dryMass", nominal=0.15, tolerance_pct=2.0, distribution="triangular"),
        ]
        result = run_monte_carlo(tolerances, n_runs=100, seed=42)
        assert result.n_runs == 100

    def test_monte_carlo_landing_dispersion(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=5.0),
            ParameterTolerance(name="launchAngle", nominal=75.0, tolerance_pct=2.0),
        ]
        result = run_monte_carlo(tolerances, n_runs=100, seed=42)
        assert result.landing_dispersion.circular_error_probability >= 0

    def test_monte_carlo_single_tolerance(self):
        tolerances = [
            ParameterTolerance(name="pressure", nominal=400000, tolerance_pct=10.0),
        ]
        result = run_monte_carlo(tolerances, n_runs=50, seed=42)
        assert result.n_runs == 50


# ══════════════════════════════════════════════════════════════════
# DESIGN OF EXPERIMENTS TESTS
# ══════════════════════════════════════════════════════════════════


class TestDesignOfExperiments:

    def test_full_factorial_basic(self):
        factors = [
            FactorLevel(name="pressure", levels=[200000, 400000]),
            FactorLevel(name="waterVolume", levels=[0.0005, 0.0009]),
        ]
        result = run_full_factorial(factors, DEFAULT_CONFIG)
        assert result.total_runs == 4  # 2 × 2
        assert result.design_type == "full_factorial"

    def test_full_factorial_three_levels(self):
        factors = [
            FactorLevel(name="pressure", levels=[200000, 400000, 600000]),
        ]
        result = run_full_factorial(factors, DEFAULT_CONFIG)
        assert result.total_runs == 3

    def test_full_factorial_ranking(self):
        factors = [
            FactorLevel(name="pressure", levels=[200000, 400000, 600000]),
        ]
        result = run_full_factorial(factors, DEFAULT_CONFIG)
        # Best should have highest pressure
        best = result.points[result.best_index]
        assert best.rank == 1

    def test_full_factorial_best_is_rank_1(self):
        factors = [
            FactorLevel(name="pressure", levels=[200000, 600000]),
            FactorLevel(name="waterVolume", levels=[0.0004, 0.0010]),
        ]
        result = run_full_factorial(factors, DEFAULT_CONFIG)
        # Find the point with rank 1
        rank_1 = [p for p in result.points if p.rank == 1]
        assert len(rank_1) == 1

    def test_full_factorial_response_surface(self):
        factors = [
            FactorLevel(name="pressure", levels=[200000, 400000]),
        ]
        result = run_full_factorial(factors, DEFAULT_CONFIG)
        assert "pressure" in result.response_surface
        assert "maxAltitude" in result.response_surface
        assert len(result.response_surface["maxAltitude"]) == 2


# ══════════════════════════════════════════════════════════════════
# CONFIG BUILDER TESTS
# ══════════════════════════════════════════════════════════════════


class TestConfigBuilder:

    def test_build_water_rocket(self):
        rocket_config, propulsion = build_configs(DEFAULT_CONFIG, "water")
        assert propulsion.get_initial_state().mass > 0

    def test_build_solid_motor(self):
        params = {
            "motorDesignation": "C6-5",
            "dryMass": 0.15,
        }
        rocket_config, propulsion = build_configs(params, "solid")
        assert propulsion.get_initial_state().mass > 0.15

    def test_compute_landing_distance(self):
        class MockPoint:
            def __init__(self, x, y):
                self.x = x
                self.y = y

        trajectory = [MockPoint(0, 0), MockPoint(10, 5)]
        dist = compute_landing_distance(trajectory)
        assert abs(dist - math.sqrt(125)) < 0.01

    def test_compute_landing_distance_empty(self):
        assert compute_landing_distance([]) == 0.0
