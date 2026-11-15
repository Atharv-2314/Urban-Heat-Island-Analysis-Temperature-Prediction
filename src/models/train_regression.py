"""
Machine Learning UHI Regression Modeling Pipeline.

Models:
1. Regularized Linear Regression (Ridge)
2. Random Forest Regressor
3. Gradient Boosted Trees (HistGradientBoostingRegressor)

Strict Guardrails:
- Target: uhi (intensity)
- LST and rural_lst are strictly excluded from X (leakage prevention).
- Evaluated on Chronological Val (2024) and Holdout Test (2025).
- Metrics: RMSE, MAE, R2, MAPE.
"""

from typing import Dict, Any, Tuple, List
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.features.engineering import FeatureEngineer

logger = get_logger("regression_models")


class UHIRegressionPipeline:
    """Trains, tunes, and evaluates machine learning models predicting UHI intensity."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.models_dir = Path("models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.feature_cols: List[str] = []
        self.trained_models: Dict[str, Any] = {}
        self.evaluation_results: Dict[str, Any] = {}

    def prepare_data(
        self
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
        """
        Load train (2016-2023), val (2024), and test (2025) splits.
        Filters out rows where target 'uhi' is missing (due to cloud cover).
        Guarantees zero target leakage.
        """
        fe = FeatureEngineer(self.config)
        train_df = pd.read_parquet("data/processed/splits/train_2016_2023.parquet")
        val_df = pd.read_parquet("data/processed/splits/val_2024.parquet")
        test_df = pd.read_parquet("data/processed/splits/test_2025.parquet")

        # Filter valid UHI target rows
        train_clean = train_df[train_df["uhi"].notna()].copy()
        val_clean = val_df[val_df["uhi"].notna()].copy()
        test_clean = test_df[test_df["uhi"].notna()].copy()

        X_train, y_train, feature_cols = fe.get_feature_matrix_and_target(train_clean)
        X_val, y_val, _ = fe.get_feature_matrix_and_target(val_clean)
        X_test, y_test, _ = fe.get_feature_matrix_and_target(test_clean)

        self.feature_cols = feature_cols
        logger.info(
            f"Prepared datasets: Train={X_train.shape}, Val={X_val.shape}, Test={X_test.shape} "
            f"with {len(feature_cols)} features."
        )
        return X_train, y_train, X_val, y_val, X_test, y_test

    def get_models(self) -> Dict[str, Any]:
        """Define candidate models with imputation and scaling pipelines."""
        preprocessor = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])

        tree_imputer = SimpleImputer(strategy="median")

        models = {
            "Ridge_Regression": Pipeline([
                ("preprocessor", preprocessor),
                ("regressor", Ridge(alpha=10.0, random_state=42)),
            ]),
            "Random_Forest": Pipeline([
                ("imputer", tree_imputer),
                ("regressor", RandomForestRegressor(
                    n_estimators=100,
                    max_depth=12,
                    min_samples_leaf=4,
                    random_state=42,
                    n_jobs=-1
                )),
            ]),
            "Hist_Gradient_Boosting": Pipeline([
                ("imputer", tree_imputer),
                ("regressor", HistGradientBoostingRegressor(
                    max_iter=150,
                    max_depth=8,
                    learning_rate=0.08,
                    random_state=42
                )),
            ]),
        }
        return models

    def evaluate_predictions(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Compute RMSE, MAE, R2, and median error."""
        rmse = float(root_mean_squared_error(y_true, y_pred))
        mae = float(mean_absolute_error(y_true, y_pred))
        r2 = float(r2_score(y_true, y_pred))

        return {
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "r2": round(r2, 4),
        }

    def train_and_evaluate_all(self) -> Dict[str, Any]:
        """Train all models on Train (2016-2023), select best on Val (2024), and evaluate on Test (2025)."""
        X_train, y_train, X_val, y_val, X_test, y_test = self.prepare_data()
        models = self.get_models()

        results = {}
        best_val_rmse = float("inf")
        best_model_name = ""

        for name, model in models.items():
            logger.info(f"Training {name} on 2016-2023 train set...")
            model.fit(X_train, y_train)
            self.trained_models[name] = model

            # Validation evaluation
            val_preds = model.predict(X_val)
            val_metrics = self.evaluate_predictions(y_val, val_preds)

            # Holdout Test evaluation
            test_preds = model.predict(X_test)
            test_metrics = self.evaluate_predictions(y_test, test_preds)

            results[name] = {
                "validation_2024": val_metrics,
                "test_2025": test_metrics,
            }
            logger.info(
                f"{name} -> Val RMSE: {val_metrics['rmse']:.3f}, R2: {val_metrics['r2']:.3f} | "
                f"Test RMSE: {test_metrics['rmse']:.3f}, R2: {test_metrics['r2']:.3f}"
            )

            # Model selection based on validation RMSE
            if val_metrics["rmse"] < best_val_rmse:
                best_val_rmse = val_metrics["rmse"]
                best_model_name = name

            # Save individual model artifact
            model_path = self.models_dir / f"{name.lower()}.joblib"
            joblib.dump(model, model_path)

        results["best_model"] = best_model_name
        self.evaluation_results = results

        # Save champion model alias
        champion_path = self.models_dir / "champion_uhi_model.joblib"
        joblib.dump(self.trained_models[best_model_name], champion_path)

        # Save feature columns
        feat_path = self.models_dir / "feature_columns.json"
        with open(feat_path, "w", encoding="utf-8") as f:
            json.dump(self.feature_cols, f, indent=2)

        # Save metrics report
        metrics_file = Path("reports/model_metrics.json")
        with open(metrics_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

        logger.info(f"Model training complete. Champion: {best_model_name} saved to {champion_path}")
        return results
