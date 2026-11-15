"""
Tests for Climate-Stratified Performance Evaluation and Risk Scoring.
"""

from pathlib import Path
import json
import pytest
import pandas as pd

from src.models.risk_scoring import ClimateEvaluatorAndRiskScorer


@pytest.fixture
def scorer():
    return ClimateEvaluatorAndRiskScorer()


def test_stratified_performance_evaluation(scorer):
    """Verify performance is evaluated across climate groups in the test set."""
    strat_df = scorer.evaluate_stratified_performance()
    assert isinstance(strat_df, pd.DataFrame)
    assert len(strat_df) > 0
    assert "climate_group" in strat_df.columns
    assert "rmse" in strat_df.columns
    assert "mae" in strat_df.columns


def test_climate_stratified_risk_scores_structure(scorer):
    """Verify all 42 cities receive climate-stratified vulnerability scores and tiers."""
    risk_df = scorer.compute_climate_stratified_risk_scores()
    assert len(risk_df) == 42
    assert "vulnerability_score" in risk_df.columns
    assert "risk_tier" in risk_df.columns

    # Verify score bounds [0, 100]
    assert (risk_df["vulnerability_score"] >= 0).all()
    assert (risk_df["vulnerability_score"] <= 100).all()

    # Verify all tiers are populated
    valid_tiers = {"Low Risk", "Moderate Risk", "High Risk", "Extreme Risk"}
    assert set(risk_df["risk_tier"].unique()).issubset(valid_tiers)


def test_risk_report_and_parquet_generation(scorer):
    """Verify JSON report and parquet table are generated."""
    rep_path = scorer.generate_risk_report()
    assert rep_path.exists()

    parquet_path = Path("data/processed/monthly_level/uhi_city_risk_scores.parquet")
    assert parquet_path.exists()

    with open(rep_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert "climate_stratified_performance" in data
    assert "top_vulnerable_cities" in data
    assert len(data["top_vulnerable_cities"]) == 10
