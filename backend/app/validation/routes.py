"""Validation API routes for SOARSim v2.0.

Provides REST endpoints for:
    - Uploading and managing real flight data
    - Validating simulations against real flights
    - Retrieving flight history

These routes are separate from the simulation routes to maintain
clean module boundaries. The validation module consumes simulation
outputs but does not depend on the simulation internals.
"""

from __future__ import annotations

import csv
import io
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.physics.engine import RocketConfig
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.schemas.models import (
    CreateFlightRequest,
    FlightDataRecord,
    FlightHistoryResponse,
    FlightDataResponse,
    SimulateRequest,
    ValidateRequest,
    ValidateResponse,
    ValidationSummary,
    SimulateResponse,
)
from app.simulation.simulator import run_simulation
from app.validation.comparison import compare_flights
from app.validation.flight_data import FlightData, FlightDataStore
from app.validation.metrics import percent_error

router = APIRouter(prefix="/api", tags=["validation"])

# In-memory store for v0.3
_store = FlightDataStore()


# ── CSV Parsing Helper ─────────────────────────────────────────────


def _parse_csv_measurements(csv_content: str) -> dict:
    """Parse a CSV upload and extract averaged measurement values.

    Supports CSVs with columns like: time, altitude, velocity, acceleration.
    Returns averaged values suitable for comparison.

    Args:
        csv_content: Raw CSV string content.

    Returns:
        Dictionary with parsed measurement values.
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(reader)

    if not rows:
        return {}

    result: dict = {}

    # Try to extract max values from time-series data
    col_map = {
        "altitude": "max_altitude",
        "alt": "max_altitude",
        "height": "max_altitude",
        "velocity": "max_velocity",
        "vel": "max_velocity",
        "speed": "max_velocity",
        "time": "flight_time",
        "duration": "flight_time",
    }

    for csv_col, field_name in col_map.items():
        values = []
        for row in rows:
            if csv_col in row:
                try:
                    val = float(row[csv_col])
                    values.append(val)
                except (ValueError, TypeError):
                    pass

        if values:
            if field_name == "flight_time":
                result[field_name] = max(values)
            else:
                result[field_name] = max(values)

    return result


# ── Flight Data Endpoints ──────────────────────────────────────────


@router.post(
    "/flights",
    response_model=FlightDataResponse,
    summary="Create a new flight data record",
    description="Upload real flight data from a rocket launch, either manually or via CSV.",
)
async def create_flight(request: CreateFlightRequest) -> FlightDataResponse:
    """Create a new flight data record.

    Accepts manual measurements or CSV data. CSV data is parsed to
    extract max values (altitude, velocity, flight time).

    Args:
        request: Flight data to store.

    Returns:
        The created flight record with assigned ID.
    """
    record = FlightData(
        notes=request.notes,
        flight_time=request.flightTime,
        max_altitude=request.maxAltitude,
        max_velocity=request.maxVelocity,
        landing_distance=request.landingDistance,
        launch_angle=request.launchAngle,
        pressure=request.pressure,
        water_volume=request.waterVolume,
        rocket_mass=request.rocketMass,
        source=request.source,
        csv_raw=request.csvRaw,
    )

    # Parse CSV if provided
    if request.csvRaw:
        parsed = _parse_csv_measurements(request.csvRaw)
        if record.max_altitude is None and "max_altitude" in parsed:
            record.max_altitude = parsed["max_altitude"]
        if record.max_velocity is None and "max_velocity" in parsed:
            record.max_velocity = parsed["max_velocity"]
        if record.flight_time is None and "flight_time" in parsed:
            record.flight_time = parsed["flight_time"]
        record.source = "csv"

    stored = _store.add(record)

    return FlightDataResponse(
        flight=FlightDataRecord(
            id=stored.id,
            date=stored.date,
            notes=stored.notes,
            flightTime=stored.flight_time,
            maxAltitude=stored.max_altitude,
            maxVelocity=stored.max_velocity,
            landingDistance=stored.landing_distance,
            launchAngle=stored.launch_angle,
            pressure=stored.pressure,
            waterVolume=stored.water_volume,
            rocketMass=stored.rocket_mass,
            source=stored.source,
        )
    )


@router.get(
    "/flights",
    response_model=FlightHistoryResponse,
    summary="List all flight data records",
    description="Retrieve all stored flight data records, newest first.",
)
async def list_flights() -> FlightHistoryResponse:
    """List all stored flight data records.

    Returns:
        List of flight records, ordered by date (newest first).
    """
    records = _store.list_all()
    flights = [
        FlightDataRecord(
            id=r.id,
            date=r.date,
            notes=r.notes,
            flightTime=r.flight_time,
            maxAltitude=r.max_altitude,
            maxVelocity=r.max_velocity,
            landingDistance=r.landing_distance,
            launchAngle=r.launch_angle,
            pressure=r.pressure,
            waterVolume=r.water_volume,
            rocketMass=r.rocket_mass,
            source=r.source,
        )
        for r in records
    ]
    return FlightHistoryResponse(flights=flights, total=len(flights))


@router.get(
    "/flights/{flight_id}",
    response_model=FlightDataResponse,
    summary="Get a specific flight data record",
    description="Retrieve a single flight data record by its ID.",
)
async def get_flight(flight_id: str) -> FlightDataResponse:
    """Get a specific flight data record.

    Args:
        flight_id: The unique identifier of the flight record.

    Returns:
        The flight record.

    Raises:
        HTTPException: If the flight record is not found.
    """
    record = _store.get(flight_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found")

    return FlightDataResponse(
        flight=FlightDataRecord(
            id=record.id,
            date=record.date,
            notes=record.notes,
            flightTime=record.flight_time,
            maxAltitude=record.max_altitude,
            maxVelocity=record.max_velocity,
            landingDistance=record.landing_distance,
            launchAngle=record.launch_angle,
            pressure=record.pressure,
            waterVolume=record.water_volume,
            rocketMass=record.rocket_mass,
            source=record.source,
        )
    )


@router.delete(
    "/flights/{flight_id}",
    summary="Delete a flight data record",
    description="Remove a flight data record from history.",
)
async def delete_flight(flight_id: str) -> dict:
    """Delete a flight data record.

    Args:
        flight_id: The unique identifier.

    Returns:
        Status confirmation.
    """
    if not _store.delete(flight_id):
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found")
    return {"status": "deleted", "id": flight_id}


# ── Validation Endpoint ────────────────────────────────────────────


@router.post(
    "/validate",
    response_model=ValidateResponse,
    summary="Validate a simulation against real flight data",
    description="Run a simulation and compare its predictions against recorded flight measurements.",
)
async def validate(request: ValidateRequest) -> ValidateResponse:
    """Validate a simulation against a real flight.

    Runs the simulation with the provided parameters, then compares
    the predicted results against the stored flight data measurements.
    Generates deterministic engineering notes about model accuracy.

    Args:
        request: Contains simulation parameters and a flight ID to compare against.

    Returns:
        Full validation results with per-metric comparison, accuracy score, and notes.

    Raises:
        HTTPException: If the flight record is not found or simulation fails.
    """
    # Retrieve the flight data
    flight_record = _store.get(request.flightId)
    if flight_record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Flight {request.flightId} not found. Upload flight data first.",
        )

    try:
        # Run the simulation
        water_config = WaterRocketConfig(
            dry_mass=request.simulation.propulsion.dryMass,
            bottle_volume=request.simulation.propulsion.bottleVolume,
            water_volume=request.simulation.propulsion.waterVolume,
            initial_pressure=request.simulation.propulsion.initialPressure,
            nozzle_diameter=request.simulation.propulsion.nozzleDiameter,
        )
        propulsion = WaterRocket(water_config)
        rocket_config = RocketConfig(
            drag_coefficient=request.simulation.rocket.dragCoefficient,
            cross_sectional_area=request.simulation.rocket.crossSectionalArea,
            launch_angle=request.simulation.launch.angle,
        )
        result = run_simulation(rocket_config, propulsion)

        # Build simulation summary for comparison
        sim_summary = {
            "maxAltitude": result.summary.max_altitude,
            "flightTime": result.summary.flight_time,
            "maxVelocity": result.summary.max_velocity,
            "maxAcceleration": result.summary.max_acceleration,
        }

        # Compare against real data
        comparison = compare_flights(
            predicted_altitude=result.summary.max_altitude,
            predicted_flight_time=result.summary.flight_time,
            predicted_velocity=result.summary.max_velocity,
            flight=flight_record,
        )

        # Build metric error summaries for the response
        alt_err = None
        time_err = None
        vel_err = None
        for m in comparison.metrics:
            if m.metric_name == "Maximum Altitude" and m.pct_error is not None:
                alt_err = m.pct_error
            elif m.metric_name == "Flight Time" and m.pct_error is not None:
                time_err = m.pct_error
            elif m.metric_name == "Maximum Velocity" and m.pct_error is not None:
                vel_err = m.pct_error

        return ValidateResponse(
            flight=FlightDataRecord(
                id=flight_record.id,
                date=flight_record.date,
                notes=flight_record.notes,
                flightTime=flight_record.flight_time,
                maxAltitude=flight_record.max_altitude,
                maxVelocity=flight_record.max_velocity,
                landingDistance=flight_record.landing_distance,
                launchAngle=flight_record.launch_angle,
                pressure=flight_record.pressure,
                waterVolume=flight_record.water_volume,
                rocketMass=flight_record.rocket_mass,
                source=flight_record.source,
            ),
            simulation={
                "maxAltitude": result.summary.max_altitude,
                "flightTime": result.summary.flight_time,
                "maxVelocity": result.summary.max_velocity,
                "maxAcceleration": result.summary.max_acceleration,
            },
            metrics=[
                {
                    "metricName": m.metric_name,
                    "predicted": m.predicted,
                    "actual": m.actual,
                    "absError": m.abs_error,
                    "pctError": m.pct_error,
                    "unit": m.unit,
                }
                for m in comparison.metrics
            ],
            summary={
                "overallAccuracy": comparison.overall_accuracy,
                "altitudeError": alt_err,
                "flightTimeError": time_err,
                "velocityError": vel_err,
            },
            notes=comparison.notes,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")
