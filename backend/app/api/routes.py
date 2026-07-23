"""API routes for SOARSim v2.0.

Provides the REST endpoints for running rocket simulations.
Uses modular propulsion with water rocket physics.
"""

from fastapi import APIRouter, HTTPException

from app.physics.engine import RocketConfig
from app.physics.propulsion.water_rocket import WaterRocket, WaterRocketConfig
from app.schemas.models import SimulateRequest, SimulateResponse
from app.simulation.simulator_v2 import run_simulation_v2

router = APIRouter(prefix="/api", tags=["simulation"])


@router.post(
    "/simulate",
    response_model=SimulateResponse,
    summary="Run a water rocket flight simulation",
    description="Simulate a water rocket launch using physics-based numerical integration "
    "with variable thrust and variable mass. Returns summary metrics and full trajectory data.",
)
async def simulate(request: SimulateRequest) -> SimulateResponse:
    """Execute a water rocket flight simulation.

    Args:
        request: Rocket configuration and simulation parameters.

    Returns:
        Simulation results including summary metrics and trajectory data.

    Raises:
        HTTPException: If the simulation fails for any reason.
    """
    try:
        # Build propulsion config (propulsion params only)
        water_config = WaterRocketConfig(
            dry_mass=request.propulsion.dryMass,
            bottle_volume=request.propulsion.bottleVolume,
            water_volume=request.propulsion.waterVolume,
            initial_pressure=request.propulsion.initialPressure,
            nozzle_diameter=request.propulsion.nozzleDiameter,
        )

        # Create propulsion system
        propulsion = WaterRocket(water_config)

        # Build rocket config (aerodynamics only)
        rocket_config = RocketConfig(
            drag_coefficient=request.rocket.dragCoefficient,
            cross_sectional_area=request.rocket.crossSectionalArea,
            launch_angle=request.launch.angle,
        )

        # Run the simulation (v2.5: using v2 simulator for extended trajectory fields)
        result = run_simulation_v2(rocket_config, propulsion)

        # Convert to response model
        return SimulateResponse(
            summary={
                "maxAltitude": result.summary.max_altitude,
                "flightTime": result.summary.flight_time,
                "maxVelocity": result.summary.max_velocity,
                "maxAcceleration": result.summary.max_acceleration,
                "maxMach": result.summary.max_mach,
                "maxDynamicPressure": result.summary.max_dynamic_pressure,
                "totalImpulse": result.summary.total_impulse,
                "specificImpulse": result.summary.specific_impulse,
                "maxKineticEnergy": result.summary.max_kinetic_energy,
                "maxPotentialEnergy": result.summary.max_potential_energy,
                "landingDistance": result.summary.landing_distance,
                "landingX": result.summary.landing_x,
                "landingY": result.summary.landing_y,
            },
            trajectory=[
                {
                    "time": p.time,
                    "x": p.x,
                    "y": p.y,
                    "vx": p.vx,
                    "vy": p.vy,
                    "ax": p.ax,
                    "ay": p.ay,
                    "thrust": p.thrust,
                    "mass": p.mass,
                    "pressure": p.pressure,
                    "waterRemaining": p.water_remaining,
                    "machNumber": p.mach_number,
                    "dynamicPressure": p.dynamic_pressure,
                    "totalEnergy": p.total_energy,
                    "kineticEnergy": p.kinetic_energy,
                    "potentialEnergy": p.potential_energy,
                }
                for p in result.trajectory
            ],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
