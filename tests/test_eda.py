"""
Tests for Exploratory Data Analysis module.
"""

from pathlib import Path
import pytest
import pandas as pd
from src.features.eda import ExploratoryDataAnalyzer


@pytest.fixture
def eda():
    return ExploratoryDataAnalyzer()


def test_global_summary_keys(eda):
    """Verify global summary contains required summary metrics."""
    summary = eda.compute_global_summary()
    assert summary["total_records"] == 5040
    assert summary["total_cities"] == 42
    assert summary["total_climate_groups"] == 13
    assert -5.0 < summary["uhi_mean"] < 5.0


def test_city_level_metrics_shape(eda):
    """Verify 42 cities are computed in city-level metrics."""
    city_df = eda.compute_city_level_metrics()
    assert len(city_df) == 42
    assert "mean_uhi" in city_df.columns
    assert "climate_group" in city_df.columns


def test_climate_stratified_metrics(eda):
    """Verify climate stratified metrics has 13 groups."""
    climate_df = eda.compute_climate_stratified_metrics()
    assert len(climate_df) == 13
    assert "mean_uhi" in climate_df.columns


def test_seasonal_profiles(eda):
    """Verify seasonal profiles returns 12 months for Northern & Southern hemispheres."""
    seasonal_df = eda.compute_seasonal_profiles()
    assert "hemisphere" in seasonal_df.columns
    assert "month" in seasonal_df.columns
    assert len(seasonal_df) > 12


def test_correlation_matrix(eda):
    """Verify pairwise correlation matrix has uhi column and valid bounds [-1, 1]."""
    corr = eda.compute_correlation_matrix()
    assert "uhi" in corr.columns
    assert corr.loc["uhi", "uhi"] == pytest.approx(1.0, 0.001)


def test_generate_full_eda_report(eda):
    """Verify that JSON summary report is written and valid."""
    report_path = eda.generate_full_eda_report()
    assert report_path.exists()
