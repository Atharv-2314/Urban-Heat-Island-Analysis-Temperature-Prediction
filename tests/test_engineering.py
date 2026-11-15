"""
Tests for Leakage-Safe Feature Engineering Pipeline.
"""

from pathlib import Path
import pytest
import pandas as pd
import numpy as np

from src.features.engineering import FeatureEngineer


@pytest.fixture
def engineer():
    return FeatureEngineer()


@pytest.fixture
def sample_clean_df():
    return pd.read_parquet("data/processed/monthly_level/uhi_monthly_clean.parquet")


def test_cyclical_features(engineer, sample_clean_df):
    """Verify sine and cosine cyclical representations for months are strictly within [-1, 1]."""
    df_cyc = engineer.build_cyclical_features(sample_clean_df)
    assert "month_sin" in df_cyc.columns
    assert "month_cos" in df_cyc.columns
    assert df_cyc["month_sin"].between(-1.0, 1.0).all()
    assert df_cyc["month_cos"].between(-1.0, 1.0).all()

    # In June (month 6), sin(2*pi*6/12) = sin(pi) ~ 0, cos(pi) = -1
    june = df_cyc[df_cyc["month"] == 6].iloc[0]
    assert june["month_sin"] == pytest.approx(0.0, abs=1e-5)
    assert june["month_cos"] == pytest.approx(-1.0, abs=1e-5)


def test_morphology_proxies(engineer, sample_clean_df):
    """Verify built-to-vegetation and log population density calculations."""
    df_morph = engineer.build_morphology_proxies(sample_clean_df)
    assert "built_veg_ratio" in df_morph.columns
    assert "veg_moisture_interaction" in df_morph.columns
    assert "log_pop_density" in df_morph.columns
    assert (df_morph["log_pop_density"] >= 0).all()


def test_temporal_lags_forward_causal(engineer, sample_clean_df):
    """Verify lag features are computed forward in time per city without lookahead."""
    df_lags = engineer.build_temporal_lags(sample_clean_df)
    assert "air_temperature_lag1" in df_lags.columns
    assert "air_temperature_lag3" in df_lags.columns
    assert "air_temperature_lag12" in df_lags.columns

    # For any city's first record (2016-01), lag1 must be NaN (no future lookahead)
    first_row = df_lags[(df_lags["city"] == "Ahmedabad") & (df_lags["year"] == 2016) & (df_lags["month"] == 1)]
    assert np.isnan(first_row["air_temperature_lag1"].values[0])


def test_target_leakage_prohibition(engineer, sample_clean_df):
    """CRITICAL: Ensure neither LST nor Rural_LST is in feature matrix X."""
    df_feat = engineer.transform(sample_clean_df)
    X, y, cols = engineer.get_feature_matrix_and_target(df_feat)

    assert "lst" not in X.columns
    assert "rural_lst" not in X.columns
    assert "uhi" not in X.columns
    assert "lst" not in cols
    assert "rural_lst" not in cols


def test_feature_dataset_parquet_exists(engineer):
    """Verify saved feature parquet file exists and has correct columns."""
    p = engineer.save_feature_dataset()
    assert p.exists()
    df = pd.read_parquet(p)
    assert len(df) == 5040
    assert "built_veg_ratio" in df.columns
    assert "month_sin" in df.columns
