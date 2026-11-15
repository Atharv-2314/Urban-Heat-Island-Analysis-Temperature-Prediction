"""
Tests for Urban Planning Counterfactual "What-If" Simulator.
"""

from pathlib import Path
import json
import pytest
import pandas as pd

from src.models.simulator import CounterfactualSimulator


@pytest.fixture
def simulator():
    return CounterfactualSimulator()


def test_simulate_city_intervention_bounds(simulator):
    """Verify single city simulation applies bounds, updates proxies, and computes cooling."""
    sim = simulator.simulate_city_intervention(
        city_name="Ahmedabad",
        delta_ndvi=0.20,
        delta_ndbi=-0.20,
        delta_ndwi=0.05
    )

    assert sim["city"] == "Ahmedabad"
    assert "mean_cooling_celsius" in sim
    assert "monthly_breakdown" in sim
    assert len(sim["monthly_breakdown"]) == 12  # 12 months in 2025 test set
    assert -5.0 < sim["mean_cooling_celsius"] < 5.0


def test_simulate_city_intervention_invalid_city(simulator):
    """Verify invalid city name raises ValueError."""
    with pytest.raises(ValueError):
        simulator.simulate_city_intervention(city_name="AtlantisCity")


def test_simulate_all_cities(simulator):
    """Verify all 42 cities are evaluated in standard policy scenario."""
    df_sim = simulator.simulate_all_cities(delta_ndvi=0.10, delta_ndbi=-0.10, delta_ndwi=0.0)

    assert len(df_sim) == 42
    assert "city" in df_sim.columns
    assert "mean_cooling_celsius" in df_sim.columns
    assert (df_sim["mean_cooling_celsius"].abs() < 10.0).all()


def test_simulation_report_and_parquet(simulator):
    """Verify JSON report and parquet benchmark table are properly generated."""
    rep_path = simulator.generate_simulation_report()
    assert rep_path.exists()

    parquet_path = Path("data/processed/monthly_level/uhi_simulation_benchmarks.parquet")
    assert parquet_path.exists()

    with open(rep_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "scenario" in data
    assert "global_average_cooling_celsius" in data
    assert "top_cooling_beneficiaries" in data
    assert len(data["top_cooling_beneficiaries"]) == 5
