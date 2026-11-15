"""
Tests for 1-Month-Ahead Weather Forecasting and Baseline Benchmarks.
"""

from pathlib import Path
import json
import pytest
import joblib
import numpy as np

from src.models.forecaster import WeatherForecaster


@pytest.fixture
def forecaster():
    return WeatherForecaster()


def test_prepare_forecasting_data_integrity(forecaster):
    """Verify forecasting dataset preparation respects chronological sequence."""
    train_df, val_df, test_df, clim_table = forecaster.prepare_forecasting_data()

    assert len(train_df) == 4032
    assert len(val_df) == 504
    assert len(test_df) == 462  # 42 cities * 11 months (December has no t+1)

    assert "target_temp_next_month" in train_df.columns
    assert "climatology_temp" in test_df.columns
    assert "persistence_temp" in test_df.columns
    assert len(clim_table) == 42 * 12  # 504 city-month climate averages


def test_forecasting_training_and_benchmarks(forecaster):
    """Verify forecaster trains, benchmarks against persistence and climatology, and outputs report."""
    results = forecaster.train_and_benchmark()

    assert "benchmarks" in results
    benchmarks = results["benchmarks"]
    assert "Persistence_Baseline" in benchmarks
    assert "Climatological_Mean_Baseline" in benchmarks
    assert "ML_Forecaster_HistGB" in benchmarks

    # Check metrics existence
    for b_name in benchmarks:
        assert benchmarks[b_name]["rmse"] > 0
        assert benchmarks[b_name]["r2"] > 0.5  # Seasonal temperatures have high R2

    # Verify model and report artifacts exist
    assert (Path("models") / "weather_forecaster.joblib").exists()
    assert (Path("models") / "climatology_reference.parquet").exists()
    assert (Path("reports") / "weather_forecast_benchmarks.json").exists()
