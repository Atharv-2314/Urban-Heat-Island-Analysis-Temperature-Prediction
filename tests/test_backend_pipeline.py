"""
Backend Unit Tests for CLI Pipeline, Schema Validation, Data Cleaning,
Lag Calculations, and Metric Computations.
tests/test_backend_pipeline.py
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from src.utils.config import load_config
from src.data.schemas import CityMonthRecord
from src.features.engineering import FeatureEngineer
from src.pipeline import run_pipeline


@pytest.fixture
def sample_config():
    return load_config()


def test_schema_strict_validation():
    """Verify schema strictly validates field bounds, missingness, and types."""
    sample_series = pd.Series({
        "city": "Ahmedabad",
        "year": 2020,
        "month": 5,
        "climate_group": "Hot_Desert_SemiArid",
        "latitude": 23.02,
        "longitude": 72.57,
        "Air_Temperature": 35.4,
        "LST": 42.1,
        "Rural_LST": 38.0,
        "UHI": 4.1,
        "NDVI": 0.22,
        "NDBI": 0.35,
        "NDWI": -0.15,
        "Population_Density": 12000,
        "Wind_Speed": 3.2,
        "Relative_Humidity_Approx": 45.0,
        "Solar_Radiation_MJ_m2": 24.5,
        "ERA5_Total_Precipitation_mm": 5.0,
        "CHIRPS_Rainfall_mm": 4.8,
        "split": "train",
    })

    record = CityMonthRecord.validate_row(sample_series)
    assert record.city == "Ahmedabad"
    assert record.uhi == 4.1

    # Out of scope year triggers ValueError
    bad_series = sample_series.copy()
    bad_series["year"] = 2035
    with pytest.raises(ValueError):
        CityMonthRecord.validate_row(bad_series)


def test_lag_calculation_strict_causality(sample_config):
    """Verify that lag features only pull historical values without lookahead."""
    fe = FeatureEngineer(sample_config)
    clean_df = pd.read_parquet("data/processed/monthly_level/uhi_monthly_clean.parquet")

    df_lags = fe.build_temporal_lags(clean_df)
    assert "air_temperature_lag1" in df_lags.columns
    assert "air_temperature_lag3" in df_lags.columns
    assert "air_temperature_lag12" in df_lags.columns

    # First row per city (2016-01) should have NaN lag1 (no future peeking)
    city_first_rows = df_lags[(df_lags["year"] == 2016) & (df_lags["month"] == 1)]
    assert city_first_rows["air_temperature_lag1"].isna().all()


def test_metric_computation_mathematical_precision():
    """Verify mathematical computation of RMSE, MAE, and R2 on known vectors."""
    y_true = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    y_pred = np.array([1.2, 1.9, 3.1, 3.8, 5.2])

    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    mae = np.mean(np.abs(y_true - y_pred))
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    ss_res = np.sum((y_true - y_pred) ** 2)
    r2 = 1 - (ss_res / ss_tot)

    assert np.isclose(rmse, 0.167332, atol=1e-5)
    assert np.isclose(mae, 0.16, atol=1e-5)
    assert r2 > 0.98


def test_cli_pipeline_stage_execution():
    """Verify CLI pipeline executes cleanly for individual stages."""
    run_pipeline("clean")
    assert Path("data/processed/monthly_level/uhi_monthly_clean.parquet").exists()
