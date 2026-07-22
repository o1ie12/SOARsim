"""Pytest configuration for SOARSim backend tests."""

import pytest


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Use asyncio as the async backend for pytest-asyncio."""
    return "asyncio"
