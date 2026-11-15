"""
Tests for SHAP Feature Attributions and Model Explainability.
"""

from pathlib import Path
import json
import pytest
import numpy as np
import pandas as pd

from src.models.shap_explainer import UHIExplainer


@pytest.fixture
def explainer():
    return UHIExplainer()


def test_compute_test_shap_values(explainer):
    """Verify TreeSHAP computation produces correct matrix dimensions and metadata."""
    shap_vals, X_imp, meta = explainer.compute_test_shap_values()

    assert isinstance(shap_vals, np.ndarray)
    assert shap_vals.shape[0] == len(meta)
    assert shap_vals.shape[1] == len(X_imp.columns)
    assert len(shap_vals) == 489
    assert "city" in meta.columns
    assert "predicted_uhi" in meta.columns


def test_global_feature_importance(explainer):
    """Verify global feature importance rankings are sorted descending."""
    shap_vals, X_imp, _ = explainer.compute_test_shap_values()
    imp_df = explainer.summarize_global_feature_importance(shap_vals, list(X_imp.columns))

    assert len(imp_df) == len(X_imp.columns)
    assert "mean_abs_shap" in imp_df.columns
    # Check monotonic descending
    assert (imp_df["mean_abs_shap"].diff().dropna() <= 0.0001).all()


def test_interaction_analysis(explainer):
    """Verify non-linear interaction calculation between NDVI and wind speed."""
    shap_vals, X_imp, _ = explainer.compute_test_shap_values()
    interaction = explainer.analyze_interactions(shap_vals, X_imp, "ndvi", "wind_speed")

    assert "mean_shap_a_at_low_b" in interaction
    assert "mean_shap_a_at_high_b" in interaction
    assert "median_feature_b_threshold" in interaction


def test_shap_artifacts_and_parquet_generation(explainer):
    """Verify JSON report and full SHAP parquet file are saved."""
    rep_path = explainer.generate_and_save_shap_artifacts()
    assert rep_path.exists()

    parquet_path = Path("data/processed/monthly_level/uhi_shap_values_2025.parquet")
    assert parquet_path.exists()

    df_shap = pd.read_parquet(parquet_path)
    assert len(df_shap) == 489
    assert "shap_relative_humidity" in df_shap.columns
    assert "city" in df_shap.columns
