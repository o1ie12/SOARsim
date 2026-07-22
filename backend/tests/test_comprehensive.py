"""Comprehensive test suite for SOARSim v2.0.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from app.physics.engine import (
    Environment,
    RocketConfig,
    State,
    compute_acceleration,
    compute_drag_force,
    euler_step,
)
from app.physics.propulsion.water_rocket import (
    ATMOSPHERIC_PRESSURE,
    WATER_DENSITY,
    WaterRocket,
    WaterRocketConfig,
)
from app.simulation.simulator import run_simulation


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def default_water_rocket_config():
    return WaterRocketConfig(
        dry_mass=0.15,
        bottle_volume=0.002,
        water_volume=0.0007,
        initial_pressure=400000,
        nozzle_diameter=0.013,
    )


@pytest.fixture
def default_rocket_config():
    return RocketConfig(
        drag_coefficient=0.45,
        cross_sectional_area=0.008,
        launch_angle=75,
    )


@pytest.fixture
def valid_request_body():
    return {
        "rocket": {
            "dragCoefficient": 0.45,
            "crossSectionalArea": 0.008,
        },
        "propulsion": {
            "type": "water",
            "dryMass": 0.15,
            "bottleVolume": 0.002,
            "waterVolume": 0.0007,
            "initialPressure": 400000,
            "nozzleDiameter": 0.013,
        },
        "launch": {
            "angle": 75,
        },
    }


# ── Config Validation Tests ────────────────────────────────────────


class TestWaterRocketConfigValidation:

    def test_valid_config_accepted(self, default_water_rocket_config):
        assert default_water_rocket_config.dry_mass == 0.15

    def test_negative_dry_mass_rejected(self):
        with pytest.raises(ValueError, match="Dry mass must be positive"):
            WaterRocketConfig(dry_mass=-0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=0.013)

    def test_zero_dry_mass_rejected(self):
        with pytest.raises(ValueError, match="Dry mass must be positive"):
            WaterRocketConfig(dry_mass=0, bottle_volume=0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=0.013)

    def test_negative_bottle_volume_rejected(self):
        with pytest.raises(ValueError, match="Bottle volume must be positive"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=-0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=0.013)

    def test_negative_water_volume_rejected(self):
        with pytest.raises(ValueError, match="Water volume must be non-negative"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=-0.001, initial_pressure=400000, nozzle_diameter=0.013)

    def test_water_exceeds_bottle_rejected(self):
        with pytest.raises(ValueError, match="must be less than"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.002, initial_pressure=400000, nozzle_diameter=0.013)

    def test_negative_pressure_rejected(self):
        with pytest.raises(ValueError, match="Initial pressure must be non-negative"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=-100000, nozzle_diameter=0.013)

    def test_zero_nozzle_rejected(self):
        with pytest.raises(ValueError, match="Nozzle diameter must be positive"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=0)

    def test_negative_nozzle_rejected(self):
        with pytest.raises(ValueError, match="Nozzle diameter must be positive"):
            WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=-0.01)


# ── Propulsion Physics Tests ───────────────────────────────────────


class TestWaterRocketPhysics:

    def test_initial_mass_includes_water(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state = rocket.get_initial_state()
        expected_mass = 0.15 + WATER_DENSITY * 0.0007
        assert abs(state.mass - expected_mass) < 0.001

    def test_initial_pressure_is_atmospheric_plus_gauge(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state = rocket.get_initial_state()
        expected = ATMOSPHERIC_PRESSURE + 400000
        assert abs(state.pressure - expected) < 1.0

    def test_thrust_zero_at_start(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state = rocket.get_initial_state()
        assert state.thrust == 0.0

    def test_thrust_positive_during_burn(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state = rocket.step(0.01, 0.001)
        assert state.thrust > 0

    def test_mass_decreases_during_burn(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state_1 = rocket.step(0.01, 0.001)
        state_2 = rocket.step(0.05, 0.001)
        assert state_2.mass < state_1.mass

    def test_pressure_decreases_during_burn(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        state_1 = rocket.step(0.01, 0.001)
        state_2 = rocket.step(0.05, 0.001)
        assert state_2.pressure < state_1.pressure

    def test_burn_duration_positive(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        assert rocket.get_burn_duration() > 0

    def test_burn_duration_increases_with_water(self):
        less = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0003, initial_pressure=400000, nozzle_diameter=0.013))
        more = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0010, initial_pressure=400000, nozzle_diameter=0.013))
        assert more.get_burn_duration() > less.get_burn_duration()

    def test_higher_pressure_gives_higher_thrust(self):
        low = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=200000, nozzle_diameter=0.013))
        high = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=600000, nozzle_diameter=0.013))
        state_low = low.step(0.01, 0.001)
        state_high = high.step(0.01, 0.001)
        assert state_high.thrust > state_low.thrust

    def test_pressure_reaches_atmospheric_after_burn(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        burn_time = rocket.get_burn_duration()
        state = rocket.step(burn_time + 0.1, 0.001)
        assert abs(state.pressure - ATMOSPHERIC_PRESSURE) < 1.0

    def test_is_burnout(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        burn_time = rocket.get_burn_duration()
        assert not rocket.is_burnout(0.0)
        assert rocket.is_burnout(burn_time + 0.1)

    def test_zero_water_no_thrust(self):
        rocket = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0, initial_pressure=400000, nozzle_diameter=0.013))
        state = rocket.step(0.01, 0.001)
        assert state.thrust == 0.0

    def test_mass_at_burnout_equals_dry_mass(self, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        burn_time = rocket.get_burn_duration()
        state = rocket.step(burn_time + 0.1, 0.001)
        assert abs(state.mass - 0.15) < 0.001


# ── Physics Engine Tests ───────────────────────────────────────────


class TestPhysicsEngineVariableMass:

    def test_drag_force_increases_with_speed_squared(self):
        f1 = compute_drag_force(5.0, 0.45, 0.008, 1.225)
        f2 = compute_drag_force(10.0, 0.45, 0.008, 1.225)
        assert abs(f2 / f1 - 4.0) < 0.01

    def test_drag_force_zero_at_zero_speed(self):
        f = compute_drag_force(0.0, 0.45, 0.008, 1.225)
        assert f == 0.0

    def test_acceleration_uses_propulsion_mass(self):
        config = RocketConfig(drag_coefficient=0.45, cross_sectional_area=0.008, launch_angle=75)
        env = Environment()
        rocket = WaterRocket(WaterRocketConfig(dry_mass=0.15, bottle_volume=0.002, water_volume=0.0007, initial_pressure=400000, nozzle_diameter=0.013))
        prop_state = rocket.step(0.01, 0.001)
        state = State(time=0.01, x=0.0, y=0.0, vx=0.0, vy=0.0, mass=prop_state.mass, thrust=prop_state.thrust, pressure=prop_state.pressure, water_remaining=prop_state.propellant_remaining)
        ax, ay = compute_acceleration(state, config, env, prop_state)
        assert ay > 0


# ── API Integration Tests ──────────────────────────────────────────


class TestSimulateAPI:

    def test_successful_simulation(self, client, valid_request_body):
        response = client.post("/api/simulate", json=valid_request_body)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "trajectory" in data
        summary = data["summary"]
        assert summary["maxAltitude"] > 0
        assert summary["flightTime"] > 0
        assert summary["maxVelocity"] > 0
        assert summary["maxAcceleration"] > 0

    def test_response_has_propulsion_fields(self, client, valid_request_body):
        response = client.post("/api/simulate", json=valid_request_body)
        data = response.json()
        point = data["trajectory"][0]
        assert "thrust" in point
        assert "mass" in point
        assert "pressure" in point
        assert "waterRemaining" in point

    def test_missing_rocket_field(self, client, valid_request_body):
        del valid_request_body["rocket"]["dragCoefficient"]
        response = client.post("/api/simulate", json=valid_request_body)
        assert response.status_code == 422

    def test_missing_propulsion_field(self, client, valid_request_body):
        del valid_request_body["propulsion"]["bottleVolume"]
        response = client.post("/api/simulate", json=valid_request_body)
        assert response.status_code == 422

    def test_negative_pressure_rejected(self, client, valid_request_body):
        valid_request_body["propulsion"]["initialPressure"] = -100000
        response = client.post("/api/simulate", json=valid_request_body)
        assert response.status_code == 422

    def test_higher_pressure_increases_altitude(self, client, valid_request_body):
        response_low = client.post("/api/simulate", json=valid_request_body)
        valid_request_body["propulsion"]["initialPressure"] = 600000
        response_high = client.post("/api/simulate", json=valid_request_body)
        alt_low = response_low.json()["summary"]["maxAltitude"]
        alt_high = response_high.json()["summary"]["maxAltitude"]
        assert alt_high > alt_low

    def test_mass_decreases_throughout_burn(self, client, valid_request_body):
        response = client.post("/api/simulate", json=valid_request_body)
        trajectory = response.json()["trajectory"]
        burn_points = [p for p in trajectory if p["thrust"] > 0]
        if len(burn_points) >= 2:
            assert burn_points[-1]["mass"] < burn_points[0]["mass"]

    def test_water_remaining_starts_at_one(self, client, valid_request_body):
        response = client.post("/api/simulate", json=valid_request_body)
        first_point = response.json()["trajectory"][0]
        assert first_point["waterRemaining"] == 1.0

    def test_water_remaining_ends_at_zero(self, client, valid_request_body):
        response = client.post("/api/simulate", json=valid_request_body)
        last_point = response.json()["trajectory"][-1]
        assert last_point["waterRemaining"] == 0.0

    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"


# ── Full Simulation Integration ────────────────────────────────────


class TestFullSimulation:

    def test_simulation_completes(self, default_rocket_config, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        result = run_simulation(default_rocket_config, rocket)
        assert len(result.trajectory) > 100
        assert result.summary.max_altitude > 0
        assert result.summary.flight_time > 0
        assert result.summary.max_velocity > 0
        assert result.summary.max_acceleration > 0

    def test_trajectory_points_have_all_fields(self, default_rocket_config, default_water_rocket_config):
        rocket = WaterRocket(default_water_rocket_config)
        result = run_simulation(default_rocket_config, rocket)
        for point in result.trajectory:
            assert hasattr(point, "time")
            assert hasattr(point, "thrust")
            assert hasattr(point, "mass")
            assert hasattr(point, "pressure")
            assert hasattr(point, "water_remaining")
