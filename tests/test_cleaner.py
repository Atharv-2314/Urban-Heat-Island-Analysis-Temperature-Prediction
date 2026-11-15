"""
Tests for DataCleaner and Parquet transformation pipeline.
"""

from pathlib import Path
import pytest
import pandas as pd
import numpy as np

from src.data.cleaner import DataCleaner
from src.data.validator import DataValidator


@pytest.fixture
def cleaner():
    return DataCleaner()


def test_clean_monthly_removes_cloud_glitches(cleaner):
    """Verify that cloud-glitched temperatures (< -50 C) are turned to NaN and UHI is recalculated."""
    df_raw = pd.DataFrame({
        "city": ["Kolkata", "Ahmedabad"],
        "year": [2016, 2016],
        "month": [8, 8],
        "climate_group": ["Tropical_Monsoon", "Hot_Desert_SemiArid"],
        "latitude": [22.5, 23.0],
        "longitude": [88.3, 72.5],
        "air_temperature": [30.0, 32.0],
        "lst": [-122.9, 36.5],  # Kolkata has sensor glitch
        "rural_lst": [-122.9, 34.0],
        "uhi": [0.0, 2.5],
        "total_precipitation": [200.0, 50.0],
        "wind_speed": [2.5, 3.0],
    })

    df_cleaned = cleaner.clean_monthly_data(df_raw)
    assert np.isnan(df_cleaned.loc[0, "lst"])
    assert np.isnan(df_cleaned.loc[0, "rural_lst"])
    assert np.isnan(df_cleaned.loc[0, "uhi"])

    # Normal row untouched
    assert df_cleaned.loc[1, "lst"] == pytest.approx(36.5, 0.1)
    assert df_cleaned.loc[1, "uhi"] == pytest.approx(2.5, 0.1)


def test_processed_monthly_parquet_integrity():
    """Verify the saved processed monthly parquet file exists, has 5040 rows, and 0 corrupt values."""
    parquet_path = Path("data/processed/monthly_level/uhi_monthly_clean.parquet")
    assert parquet_path.exists()

    df = pd.read_parquet(parquet_path)
    assert len(df) == 5040
    assert df["city"].nunique() == 42

    # Verify no temperature values < -50 or > 70
    valid_lst = df["lst"].dropna()
    assert (valid_lst >= -50.0).all() and (valid_lst <= 70.0).all()

    valid_rural = df["rural_lst"].dropna()
    assert (valid_rural >= -50.0).all() and (valid_rural <= 70.0).all()

    # Verify validator on cleaned data has no temperature warnings
    validator = DataValidator()
    res = validator.check_temperature_bounds(df)
    assert res["status"] == "PASSED"
    assert res["lst_glitch_count"] == 0
    assert res["rural_lst_glitch_count"] == 0


def test_processed_pixel_parquets_exist():
    """Verify all 42 city pixel grid parquet files exist."""
    pixel_dir = Path("data/processed/pixel_level")
    parquet_files = list(pixel_dir.glob("*.parquet"))
    assert len(parquet_files) == 42
