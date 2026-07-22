"""Tests for SOARSim v2.0 API endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from app.physics.propulsion.water_rocket import ATMOSPHERIC_PRESSURE

client = TestClient(app)


def make_request(**overrides) -> dict:
    body = {
        "rocket": {"dragCoefficient": 0.45, "crossSectionalArea": 0.008},
        "propulsion": {
            "type": "water",
            "dryMass": 0.15,
            "bottleVolume": 0.002,
            "waterVolume": 0.0007,
            "initialPressure": 400000,
            "nozzleDiameter": 0.013,
        },
        "launch": {"angle": 75},
    }
    for key, value in overrides.items():
        if "." in key:
            parts = key.split(".")
            d = body
            for p in parts[:-1]:
                d = d[p]
            d[parts[-1]] = value
        else:
            body[key] = value
    return body


class TestSimulateEndpoint:

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.1"

    def test_successful_simulation(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        assert response.status_code == 200
        data = response.json()
        summary = data["summary"]
        assert summary["maxAltitude"] > 0
        assert summary["flightTime"] > 0
        assert summary["maxVelocity"] > 0
        assert summary["maxAcceleration"] > 0
        assert len(data["trajectory"]) > 50

    def test_response_has_propulsion_fields(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        point = response.json()["trajectory"][0]
        assert "thrust" in point
        assert "mass" in point
        assert "pressure" in point
        assert "waterRemaining" in point

    def test_camel_case_response(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        data = response.json()
        assert "maxAltitude" in data["summary"]
        assert "waterRemaining" in data["trajectory"][0]

    def test_missing_rocket_field_rejected(self):
        body = make_request()
        del body["rocket"]["dragCoefficient"]
        response = client.post("/api/simulate", json=body)
        assert response.status_code == 422

    def test_missing_propulsion_field_rejected(self):
        body = make_request()
        del body["propulsion"]["bottleVolume"]
        response = client.post("/api/simulate", json=body)
        assert response.status_code == 422

    def test_negative_pressure_rejected(self):
        body = make_request(**{"propulsion.initialPressure": -100})
        response = client.post("/api/simulate", json=body)
        assert response.status_code == 422

    def test_higher_pressure_gives_higher_altitude(self):
        body_low = make_request(**{"propulsion.initialPressure": 200000})
        body_high = make_request(**{"propulsion.initialPressure": 600000})
        resp_low = client.post("/api/simulate", json=body_low)
        resp_high = client.post("/api/simulate", json=body_high)
        assert resp_high.json()["summary"]["maxAltitude"] > resp_low.json()["summary"]["maxAltitude"]

    def test_mass_decreases_throughout_burn(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        trajectory = response.json()["trajectory"]
        burn_phase = [p for p in trajectory if p["thrust"] > 0]
        if len(burn_phase) >= 2:
            assert burn_phase[-1]["mass"] < burn_phase[0]["mass"]

    def test_pressure_drops_during_flight(self):
        body = make_request(**{"propulsion.initialPressure": 400000})
        response = client.post("/api/simulate", json=body)
        trajectory = response.json()["trajectory"]
        assert trajectory[0]["pressure"] > ATMOSPHERIC_PRESSURE
        assert trajectory[-1]["pressure"] <= ATMOSPHERIC_PRESSURE + 100

    def test_water_remaining_starts_at_one(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        assert response.json()["trajectory"][0]["waterRemaining"] == 1.0

    def test_water_remaining_ends_at_zero(self):
        body = make_request()
        response = client.post("/api/simulate", json=body)
        assert response.json()["trajectory"][-1]["waterRemaining"] == 0.0
