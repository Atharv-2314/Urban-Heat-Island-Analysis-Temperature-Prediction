"""
Unit Tests for Rolling Window Fold Generation, Training, Evaluation, Robustness, and Comparative Analysis (Milestones 24–28).
"""

from pathlib import Path
import json
import pytest
import pandas as pd
import numpy as np
import joblib

from src.models.rolling_validation import (
    RollingWindowGenerator,
    RollingFoldConfig,
    RollingWindowModelTrainer,
)
from src.models.rolling_evaluator import (
    RollingWindowEvaluator,
    compute_mbe,
)
from src.models.rolling_robustness import (
    RollingRobustnessAnalyzer,
    get_season_name,
)
from src.models.rolling_comparative import (
    ComparativeAnalysisPipeline,
)


@pytest.fixture
def features_df():
    return pd.read_parquet("data/processed/monthly_level/uhi_monthly_features.parquet")


@pytest.fixture
def generator():
    return RollingWindowGenerator()


def test_rolling_folds_configuration(generator):
    """Verify that exactly 4 folds are configured with correct 5-yr train and 1-yr val."""
    configs = generator.get_fold_configs()
    assert len(configs) == 4

    expected = [
        (1, [2016, 2017, 2018, 2019, 2020], [2021]),
        (2, [2017, 2018, 2019, 2020, 2021], [2022]),
        (3, [2018, 2019, 2020, 2021, 2022], [2023]),
        (4, [2019, 2020, 2021, 2022, 2023], [2024]),
    ]

    for cfg, (exp_id, exp_train, exp_val) in zip(configs, expected):
        assert cfg.fold_id == exp_id
        assert cfg.train_years == exp_train
        assert cfg.val_years == exp_val


def test_rolling_folds_integrity_and_exclusion_of_2025(generator):
    """Verify that test year 2025 is excluded and train strictly precedes validation."""
    generator.validate_fold_integrity()

    for fold in generator.get_fold_configs():
        assert 2025 not in fold.train_years
        assert 2025 not in fold.val_years
        assert max(fold.train_years) < min(fold.val_years)
        assert set(fold.train_years).isdisjoint(set(fold.val_years))


def test_split_fold_execution(generator, features_df):
    """Verify row counts and city coverage across all folds."""
    folds_dict = generator.generate_all_folds(features_df)
    assert len(folds_dict) == 4

    for fold_id, data in folds_dict.items():
        train_df = data["train"]
        val_df = data["val"]

        assert len(train_df) == 2520, f"Fold {fold_id} train rows mismatch"
        assert len(val_df) == 504, f"Fold {fold_id} val rows mismatch"

        assert train_df["city"].nunique() == 42
        assert val_df["city"].nunique() == 42


def test_save_fold_metadata(generator, features_df, tmp_path):
    """Verify metadata JSON serialization and correctness."""
    temp_gen = RollingWindowGenerator(output_dir=tmp_path)
    meta_path = temp_gen.save_fold_metadata(features_df)

    assert meta_path.exists()
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["number_of_folds"] == 4
    assert meta["untouched_test_year"] == [2025]
    assert len(meta["folds"]) == 4

    fold_1 = meta["folds"]["fold_1"]
    assert fold_1["actual_train_rows"] == 2520
    assert fold_1["actual_val_rows"] == 504
    assert fold_1["train_cities"] == 42
    assert fold_1["val_cities"] == 42


def test_fold_wise_model_training_and_artifacts(tmp_path, features_df):
    """Verify fold training pipeline on Fold 1 with artifact persistence and non-leakage."""
    out_dir = tmp_path / "results"
    mod_dir = tmp_path / "models"
    trainer = RollingWindowModelTrainer(output_dir=out_dir, models_dir=mod_dir)

    train_df, val_df = trainer.generator.split_fold(features_df, fold_id=1)
    models, val_preds_df = trainer.train_fold(fold_id=1, train_df=train_df, val_df=val_df)

    expected_models = ["Ridge_Regression", "Random_Forest", "Hist_Gradient_Boosting"]
    for m in expected_models:
        assert m in models
        model_file = mod_dir / "fold_1" / f"{m.lower()}.joblib"
        assert model_file.exists(), f"Model file missing: {model_file}"
        loaded = joblib.load(model_file)
        assert hasattr(loaded, "predict")

    val_clean_count = val_df["uhi"].notna().sum()
    assert len(val_preds_df) == val_clean_count
    assert "pred_ridge_regression" in val_preds_df.columns
    assert "pred_random_forest" in val_preds_df.columns
    assert "pred_hist_gradient_boosting" in val_preds_df.columns
    assert "uhi_true" in val_preds_df.columns
    assert "fold_id" in val_preds_df.columns
    assert (val_preds_df["fold_id"] == 1).all()

    assert not val_preds_df["pred_random_forest"].isna().any()
    assert not val_preds_df["pred_hist_gradient_boosting"].isna().any()


def test_rolling_evaluator_metrics_and_stability(tmp_path):
    """Verify calculation of MAE, RMSE, R2, MBE, and cross-fold stability metrics."""
    evaluator = RollingWindowEvaluator(results_dir=tmp_path)

    mock_data = []
    for f_id, yr in [(1, 2021), (2, 2022)]:
        np.random.seed(42 + f_id)
        y_t = np.random.normal(2.0, 1.0, 50)
        p_ridge = y_t + np.random.normal(0.2, 0.5, 50)
        p_rf = y_t + np.random.normal(0.05, 0.3, 50)
        p_hgb = y_t + np.random.normal(0.02, 0.28, 50)

        for i in range(50):
            mock_data.append({
                "fold_id": f_id,
                "year": yr,
                "uhi_true": y_t[i],
                "pred_ridge_regression": p_ridge[i],
                "pred_random_forest": p_rf[i],
                "pred_hist_gradient_boosting": p_hgb[i],
            })

    mock_df = pd.DataFrame(mock_data)
    pred_file = tmp_path / "mock_preds.parquet"
    mock_df.to_parquet(pred_file, index=False)

    report = evaluator.run_comprehensive_evaluation(predictions_path=pred_file)

    assert "folds_summary" in report
    assert "stability_metrics" in report
    assert "best_overall_model" in report

    for m in ["Ridge_Regression", "Random_Forest", "Hist_Gradient_Boosting"]:
        assert m in report["stability_metrics"]
        s = report["stability_metrics"][m]
        assert "mean_rmse" in s
        assert "std_rmse" in s
        assert "mean_mae" in s
        assert "mean_mbe" in s
        assert "best_validation_year" in s
        assert "worst_validation_year" in s
        assert "pct_folds_outperform_baseline" in s

    assert (tmp_path / "rolling_evaluation_metrics.json").exists()
    assert (tmp_path / "rolling_evaluation_metrics.csv").exists()
    assert (tmp_path / "rolling_stability_summary.csv").exists()


def test_rolling_robustness_analyzer(tmp_path):
    """Verify global, regional, climate, and seasonal robustness analysis."""
    analyzer = RollingRobustnessAnalyzer(results_dir=tmp_path)

    actual_preds = Path("data/processed/rolling_results/all_folds_predictions.parquet")
    assert actual_preds.exists()

    report = analyzer.run_all_robustness_analyses(predictions_path=actual_preds)

    assert report["cities_evaluated"] == 42
    assert report["indian_cities_count"] == 24
    assert report["international_cities_count"] == 18
    assert report["climate_groups_evaluated"] >= 10
    assert len(report["top_error_cities_hgb"]) > 0
    assert len(report["lowest_error_cities_hgb"]) > 0
    assert len(report["top_error_climate_groups_hgb"]) > 0

    for fname in [
        "rolling_city_robustness.csv",
        "rolling_regional_robustness.csv",
        "rolling_climate_robustness.csv",
        "rolling_seasonal_robustness.csv",
        "rolling_temporal_trajectory.csv",
        "rolling_robustness_summary.json",
    ]:
        fpath = tmp_path / fname
        assert fpath.exists(), f"Missing robustness file: {fpath}"


def test_comparative_analysis_pipeline(tmp_path):
    """Verify comparative analysis between fixed chronological split and rolling window."""
    # Run comparative pipeline on real generated outputs
    pipeline = ComparativeAnalysisPipeline(
        results_dir="data/processed/rolling_results",
        fixed_metrics_path="reports/model_metrics.json",
    )
    insights = pipeline.run_comparative_analysis()

    assert "model_rankings_consistent" in insights
    assert insights["model_rankings_consistent"] is True
    assert "ranking_fixed_test_2025" in insights
    assert "ranking_rolling_window_mean" in insights
    assert len(insights["key_observations"]) == 4

    # Check generated files
    csv_file = Path("data/processed/rolling_results/fixed_vs_rolling_comparison.csv")
    json_file = Path("data/processed/rolling_results/fixed_vs_rolling_comparison.json")
    assert csv_file.exists()
    assert json_file.exists()

    df = pd.read_csv(csv_file)
    assert len(df) == 3
    assert set(df["model"]) == {"Hist_Gradient_Boosting", "Random_Forest", "Ridge_Regression"}
    # Rank 1 must be Hist_Gradient_Boosting under both regimes
    hgb_row = df[df["model"] == "Hist_Gradient_Boosting"].iloc[0]
    assert hgb_row["rank_fixed_test"] == 1
    assert hgb_row["rank_rolling_mean"] == 1
