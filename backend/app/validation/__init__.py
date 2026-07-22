"""
Validation module for SOARSim v0.3.

Provides flight data management, comparison metrics, and engineering
analysis for validating simulation predictions against real launches.

Modules:
    flight_data: FlightData model and in-memory storage
    metrics: Statistical error metrics (RMSE, MAE, percent error)
    comparison: Comparison engine and engineering note generator
"""

from app.validation.flight_data import FlightData, FlightDataStore
from app.validation.metrics import (
    absolute_error,
    percent_error,
    rmse,
    mean_absolute_error,
    max_difference,
)
from app.validation.comparison import (
    ComparisonResult,
    compare_flights,
    generate_engineering_notes,
)

__all__ = [
    "FlightData",
    "FlightDataStore",
    "absolute_error",
    "percent_error",
    "rmse",
    "mean_absolute_error",
    "max_difference",
    "ComparisonResult",
    "compare_flights",
    "generate_engineering_notes",
]
