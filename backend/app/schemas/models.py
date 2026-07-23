"""
Pydantic schemas for SOARSim v2.0 validation API.

Extends v2.0 schemas with validation-specific request/response models.
All fields use camelCase for frontend compatibility.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional


class CamelCaseModel(BaseModel):
    """Base model with camelCase aliasing for all fields."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


# ── Simulation Request (reused from v0.2) ──────────────────────────


class RocketParams(CamelCaseModel):
    dragCoefficient: float = Field(..., ge=0, le=2.0)
    crossSectionalArea: float = Field(..., gt=0, le=0.1)


class WaterRocketPropulsion(CamelCaseModel):
    type: str = Field("water")
    dryMass: float = Field(..., gt=0, le=10.0)
    bottleVolume: float = Field(..., gt=0, le=0.01)
    waterVolume: float = Field(..., ge=0, le=0.01)
    initialPressure: float = Field(..., ge=0, le=2_000_000)
    nozzleDiameter: float = Field(..., gt=0, le=0.05)


class LaunchParams(CamelCaseModel):
    angle: float = Field(..., ge=0, le=90)


class SimulateRequest(CamelCaseModel):
    rocket: RocketParams
    propulsion: WaterRocketPropulsion
    launch: LaunchParams


class TrajectoryPoint(CamelCaseModel):
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
    waterRemaining: float
    machNumber: float = 0.0
    dynamicPressure: float = 0.0
    totalEnergy: float = 0.0
    kineticEnergy: float = 0.0
    potentialEnergy: float = 0.0


class SimulationSummary(CamelCaseModel):
    maxAltitude: float
    flightTime: float
    maxVelocity: float
    maxAcceleration: float
    maxMach: float = 0.0
    maxDynamicPressure: float = 0.0
    totalImpulse: float = 0.0
    specificImpulse: float = 0.0
    maxKineticEnergy: float = 0.0
    maxPotentialEnergy: float = 0.0
    landingDistance: float = 0.0
    landingX: float = 0.0
    landingY: float = 0.0


class SimulateResponse(CamelCaseModel):
    summary: SimulationSummary
    trajectory: list[TrajectoryPoint]


# ── Flight Data (v0.3) ─────────────────────────────────────────────


class FlightDataRecord(CamelCaseModel):
    """A real flight measurement record."""

    id: str = Field(..., description="Unique flight record ID")
    date: str = Field(..., description="Launch date/time ISO format")
    notes: str = Field("", description="Free-text launch notes")

    # Measured results
    flightTime: Optional[float] = Field(None, ge=0, description="Measured flight time (s)")
    maxAltitude: Optional[float] = Field(None, ge=0, description="Measured max altitude (m)")
    maxVelocity: Optional[float] = Field(None, ge=0, description="Measured max velocity (m/s)")
    landingDistance: Optional[float] = Field(None, ge=0, description="Landing distance (m)")

    # Launch configuration
    launchAngle: Optional[float] = Field(None, ge=0, le=90, description="Launch angle (°)")
    pressure: Optional[float] = Field(None, ge=0, description="Initial pressure (Pa)")
    waterVolume: Optional[float] = Field(None, ge=0, description="Water volume (m³)")
    rocketMass: Optional[float] = Field(None, gt=0, description="Rocket mass (kg)")

    # Source
    source: str = Field("manual", description="Data source: csv, manual, sensor")


class CreateFlightRequest(CamelCaseModel):
    """Request to create a new flight data record."""

    notes: str = ""
    flightTime: Optional[float] = Field(None, ge=0)
    maxAltitude: Optional[float] = Field(None, ge=0)
    maxVelocity: Optional[float] = Field(None, ge=0)
    landingDistance: Optional[float] = Field(None, ge=0)
    launchAngle: Optional[float] = Field(None, ge=0, le=90)
    pressure: Optional[float] = Field(None, ge=0)
    waterVolume: Optional[float] = Field(None, ge=0)
    rocketMass: Optional[float] = Field(None, gt=0)
    source: str = "manual"
    csvRaw: Optional[str] = Field(None, description="Raw CSV content if uploaded")


class FlightDataResponse(CamelCaseModel):
    """Response containing a single flight data record."""
    flight: FlightDataRecord


class FlightHistoryResponse(CamelCaseModel):
    """Response containing a list of flight data records."""
    flights: list[FlightDataRecord]
    total: int


# ── Validation (v0.3) ──────────────────────────────────────────────


class MetricComparison(CamelCaseModel):
    """Comparison result for a single metric."""
    metricName: str
    predicted: float
    actual: float
    absError: float
    pctError: Optional[float]
    unit: str


class ValidateRequest(CamelCaseModel):
    """Request to validate a simulation against real flight data."""
    simulation: SimulateRequest
    flightId: str = Field(..., description="ID of the flight data record to compare against")


class ValidationSummary(CamelCaseModel):
    """Summary of validation results."""
    overallAccuracy: float = Field(..., ge=0, le=1, description="Overall accuracy score (0-1)")
    altitudeError: Optional[float] = Field(None, description="Altitude percent error")
    flightTimeError: Optional[float] = Field(None, description="Flight time percent error")
    velocityError: Optional[float] = Field(None, description="Velocity percent error")


class ValidateResponse(CamelCaseModel):
    """Response containing full validation results."""
    flight: FlightDataRecord
    simulation: SimulationSummary
    metrics: list[MetricComparison]
    summary: ValidationSummary
    notes: list[str]
