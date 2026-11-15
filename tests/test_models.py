"""
Tests for Machine Learning UHI Regression Modeling.
"""

from pathlib import Path
import json
import joblib
import pytest
import numpy as np

from src.models.train_regression import UHIRegressionPipeline


@pytest.fixture
def pipeline():
    return UHIRegressionPipeline()


def test_prepare_data_no_leakage(pipeline):
    """Verify that training and evaluation feature matrices contain 0 target leakage."""
    X_train, y_train, X_val, y_val, X_test, y_test = pipeline.prepare_data()

    for forbidden in ["lst", "rural_lst", "uhi"]:
        assert forbidden not in X_train.columns
        assert forbidden not in X_val.columns
        assert forbidden not in X_test.columns

    assert len(X_train) == 3768
    assert len(X_val) == 480
    assert len(X_test) == 489


def test_models_definition(pipeline):
    """Verify candidate models dictionary contains Ridge, Random Forest, and Gradient Boosting."""
    models = pipeline.get_models()
    assert "Ridge_Regression" in models
    assert "Random_Forest" in models
    assert "Hist_Gradient_Boosting" in models


def test_model_training_and_artifacts(pipeline):
    """Verify end-to-end model training, evaluation metrics, and persisted artifacts."""
    results = pipeline.train_and_evaluate_all()

    assert "best_model" in results
    assert results["best_model"] in ["Random_Forest", "Hist_Gradient_Boosting", "Ridge_Regression"]

    # Verify metrics
    for model_name in ["Ridge_Regression", "Random_Forest", "Hist_Gradient_Boosting"]:
        val_res = results[model_name]["validation_2024"]
        test_res = results[model_name]["test_2025"]
        assert val_res["rmse"] > 0
        assert test_res["rmse"] > 0
        assert test_res["mae"] > 0

    # Verify model artifact files exist
    assert (Path("models") / "champion_uhi_model.joblib").exists()
    assert (Path("models") / "feature_columns.json").exists()
    assert (Path("reports") / "model_metrics.json").exists()

    # Verify champion model can be loaded and predict on a sample
    champion = joblib.load("models/champion_uhi_model.joblib")
    with open("models/feature_columns.json", "r") as f:
        features = json.load(f)

    dummy_sample = np.zeros((1, len(features)))
    prediction = champion.predict(dummy_sample)
    assert len(prediction) == 1
    assert -30.0 < prediction[0] < 50.0
