"""
Tests for 10-Point Scientific Data Validation Pipeline.
"""

import pytest
import pandas as pd
import numpy as np
from src.data.validator import DataValidator
from src.data.loader import load_raw_monthly_data


@pytest.fixture
def monthly_df():
    """Load monthly dataset for testing."""
    return load_raw_monthly_data()


@pytest.fixture
def validator():
    """Initialize validator instance."""
    return DataValidator()


def test_validation_completeness(validator, monthly_df):
    """Check 1: 5,040 rows."""
    res = validator.check_completeness(monthly_df)
    assert res["status"] == "PASSED"
    assert res["actual_rows"] == 5040


def test_validation_coordinates(validator, monthly_df):
    """Check 2: Coordinates within global ranges."""
    res = validator.check_coordinate_bounds(monthly_df)
    assert res["status"] == "PASSED"


def test_validation_cloud_missingness(validator, monthly_df):
    """Check 4: Verify zero-imputation ban (no 0 C in LST/Rural_LST)."""
    res = validator.check_cloud_missingness(monthly_df)
    assert res["status"] == "PASSED"
    assert res["zero_lst_count"] == 0
    assert res["zero_rural_lst_count"] == 0
    assert res["unobserved_nan_lst_count"] > 0


def test_validation_spectral_indices(validator, monthly_df):
    """Check 5: NDVI, NDBI, NDWI between -1.0 and 1.0."""
    res = validator.check_spectral_indices(monthly_df)
    assert res["status"] == "PASSED"


def test_validation_precipitation(validator, monthly_df):
    """Check 6: Total precipitation >= 0."""
    res = validator.check_precipitation(monthly_df)
    assert res["status"] == "PASSED"


def test_validation_wind_speed(validator, monthly_df):
    """Check 7: Wind speed >= 0."""
    res = validator.check_wind_speed(monthly_df)
    assert res["status"] == "PASSED"


def test_validation_duplicates(validator, monthly_df):
    """Check 8: Zero duplicates by city, year, month."""
    res = validator.check_duplicates(monthly_df)
    assert res["status"] == "PASSED"


def test_validation_city_climate_consistency(validator, monthly_df):
    """Check 9: Exact 42 cities with consistent climate tags."""
    res = validator.check_city_climate_consistency(monthly_df)
    assert res["status"] == "PASSED"
    assert res["total_cities"] == 42


def test_validation_temporal_monotonicity(validator, monthly_df):
    """Check 10: Chronological sequence."""
    res = validator.check_temporal_monotonicity(monthly_df)
    assert res["status"] == "PASSED"


def test_run_all_checks(validator, monthly_df):
    """Run full 10-point check suite."""
    all_passed, results = validator.run_all_checks(monthly_df)
    assert len(results) == 10
    # Temperature check detects cloud-glitches (LST < -50C) flagged as WARNING for Milestone 5 cleaning
    assert results["check_3_physical_temperature_bounds"]["status"] in ["PASSED", "WARNING"]
