"""
Chronological Rolling Window Validation Module for UHI Modeling (Phase 7 - Milestones 24 & 25).

Implements:
- 5-year fixed-width rolling training window followed by a 1-year validation window.
- 4 Chronological Folds:
  * Fold 1: Train 2016-2020 | Val 2021
  * Fold 2: Train 2017-2021 | Val 2022
  * Fold 3: Train 2018-2022 | Val 2023
  * Fold 4: Train 2019-2023 | Val 2024
- Strict guardrails:
  * Strict temporal monotonicity (train strictly precedes validation).
  * Future observations strictly barred from training windows.
  * 2025 is strictly preserved as the untouched holdout test set (excluded from all rolling folds).
  * Imputers, scalers, and regressors fit strictly on the respective training window.
  * Zero target leakage (lst and rural_lst excluded).
  * Artifacts and fold-wise predictions exported to data/processed/rolling_results/.
"""

from typing import Dict, Any, List, Tuple
from pathlib import Path
import json
from dataclasses import dataclass, asdict
import joblib
import pandas as pd
import numpy as np

from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.features.engineering import FeatureEngineer

logger = get_logger("rolling_validation")


@dataclass
class RollingFoldConfig:
    fold_id: int
    train_years: List[int]
    val_years: List[int]
    train_rows_expected: int = 2520  # 42 cities * 5 years * 12 months
    val_rows_expected: int = 504    # 42 cities * 1 year * 12 months


class RollingWindowGenerator:
    """Generates and manages 5-year rolling training and 1-year validation folds."""

    FOLD_SPECS = [
        {"fold_id": 1, "train_years": list(range(2016, 2021)), "val_years": [2021]},
        {"fold_id": 2, "train_years": list(range(2017, 2022)), "val_years": [2022]},
        {"fold_id": 3, "train_years": list(range(2018, 2023)), "val_years": [2023]},
        {"fold_id": 4, "train_years": list(range(2019, 2024)), "val_years": [2024]},
    ]

    UNTOUCHED_TEST_YEARS = [2025]

    def __init__(self, config: Dict[str, Any] | None = None, output_dir: str | Path = "data/processed/rolling_results"):
        self.config = config or load_config()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.folds = [RollingFoldConfig(**spec) for spec in self.FOLD_SPECS]

    def get_fold_configs(self) -> List[RollingFoldConfig]:
        """Return list of rolling fold configurations."""
        return self.folds

    def validate_fold_integrity(self) -> None:
        """
        Verify strict temporal ordering and check that 2025 is excluded.
        Raises AssertionError if any guardrail is violated.
        """
        for fold in self.folds:
            train_set = set(fold.train_years)
            val_set = set(fold.val_years)

            # 1. Train and Val must not overlap
            assert train_set.isdisjoint(val_set), f"Fold {fold.fold_id}: Train and Val overlap!"

            # 2. Strict temporal ordering: max(train) < min(val)
            assert max(fold.train_years) < min(fold.val_years), (
                f"Fold {fold.fold_id}: Temporal leakage detected! max(train) >= min(val)"
            )

            # 3. 5-year train, 1-year val
            assert len(fold.train_years) == 5, f"Fold {fold.fold_id}: Train years must be 5."
            assert len(fold.val_years) == 1, f"Fold {fold.fold_id}: Val years must be 1."

            # 4. Strict exclusion of 2025
            for test_year in self.UNTOUCHED_TEST_YEARS:
                assert test_year not in train_set, f"Fold {fold.fold_id}: Test year {test_year} found in train!"
                assert test_year not in val_set, f"Fold {fold.fold_id}: Test year {test_year} found in val!"

        logger.info("Fold configuration integrity verified successfully: 4 folds, 0 leakage, 2025 untouched.")

    def split_fold(self, df: pd.DataFrame, fold_id: int) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Extract train and validation sets for a specific fold from a DataFrame with a 'year' column.
        Guarantees chronological consistency and strict non-inclusion of 2025.
        """
        fold = next((f for f in self.folds if f.fold_id == fold_id), None)
        if fold is None:
            raise ValueError(f"Fold ID {fold_id} not found. Valid IDs: {[f.fold_id for f in self.folds]}")

        if "year" not in df.columns:
            raise KeyError("DataFrame must contain 'year' column for temporal splitting.")

        train_mask = df["year"].isin(fold.train_years)
        val_mask = df["year"].isin(fold.val_years)

        train_df = df[train_mask].copy().sort_values(by=["city", "year", "month"]).reset_index(drop=True)
        val_df = df[val_mask].copy().sort_values(by=["city", "year", "month"]).reset_index(drop=True)

        logger.info(
            f"Fold {fold_id} extracted: Train ({min(fold.train_years)}-{max(fold.train_years)}) = {len(train_df)} rows, "
            f"Val ({fold.val_years[0]}) = {len(val_df)} rows."
        )
        return train_df, val_df

    def generate_all_folds(self, df: pd.DataFrame) -> Dict[int, Dict[str, pd.DataFrame]]:
        """Extract all 4 rolling folds into a structured dictionary."""
        self.validate_fold_integrity()
        folds_dict = {}
        for fold in self.folds:
            train_df, val_df = self.split_fold(df, fold.fold_id)
            folds_dict[fold.fold_id] = {
                "train": train_df,
                "val": val_df,
                "config": fold,
            }
        return folds_dict

    def save_fold_metadata(self, df: pd.DataFrame | None = None) -> Path:
        """Save fold definitions and dataset stats to JSON in data/processed/rolling_results/."""
        self.validate_fold_integrity()
        metadata: Dict[str, Any] = {
            "strategy": "5-Year Fixed-Width Rolling Window with 1-Year Validation",
            "untouched_test_year": self.UNTOUCHED_TEST_YEARS,
            "number_of_folds": len(self.folds),
            "folds": {},
        }

        for fold in self.folds:
            fold_info = {
                "fold_id": fold.fold_id,
                "training_period": f"{min(fold.train_years)}–{max(fold.train_years)}",
                "training_years": fold.train_years,
                "validation_period": f"{fold.val_years[0]}",
                "validation_years": fold.val_years,
                "expected_train_rows": fold.train_rows_expected,
                "expected_val_rows": fold.val_rows_expected,
            }

            if df is not None:
                train_mask = df["year"].isin(fold.train_years)
                val_mask = df["year"].isin(fold.val_years)
                fold_info["actual_train_rows"] = int(train_mask.sum())
                fold_info["actual_val_rows"] = int(val_mask.sum())
                fold_info["train_cities"] = int(df.loc[train_mask, "city"].nunique())
                fold_info["val_cities"] = int(df.loc[val_mask, "city"].nunique())

            metadata["folds"][f"fold_{fold.fold_id}"] = fold_info

        meta_path = self.output_dir / "rolling_folds_metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Saved rolling fold metadata to {meta_path}")
        return meta_path


class RollingWindowModelTrainer:
    """Trains regression models independently across chronological rolling folds (Milestone 25)."""

    def __init__(
        self,
        config: Dict[str, Any] | None = None,
        output_dir: str | Path = "data/processed/rolling_results",
        models_dir: str | Path = "models/rolling_folds",
    ):
        self.config = config or load_config()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.generator = RollingWindowGenerator(config=self.config, output_dir=self.output_dir)
        self.feature_engineer = FeatureEngineer(self.config)

    def get_candidate_models(self) -> Dict[str, Pipeline]:
        """
        Build candidate regression pipelines.
        Each pipeline encapsulates its own imputer and scaler fitted strictly on the fold training set.
        """
        preprocessor = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])

        tree_imputer = SimpleImputer(strategy="median")

        return {
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
                    n_jobs=-1,
                )),
            ]),
            "Hist_Gradient_Boosting": Pipeline([
                ("imputer", tree_imputer),
                ("regressor", HistGradientBoostingRegressor(
                    max_iter=150,
                    max_depth=8,
                    learning_rate=0.08,
                    random_state=42,
                )),
            ]),
        }

    def train_fold(
        self,
        fold_id: int,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
    ) -> Tuple[Dict[str, Pipeline], pd.DataFrame]:
        """
        Train all candidate models independently on a fold's 5-year training portion.
        Filters out missing target 'uhi' values.
        Returns:
            - Dict of fitted pipelines
            - Predictions DataFrame for the validation year with true and predicted UHI
        """
        # Filter valid target rows
        train_clean = train_df[train_df["uhi"].notna()].copy()
        val_clean = val_df[val_df["uhi"].notna()].copy()

        X_train, y_train, feature_cols = self.feature_engineer.get_feature_matrix_and_target(train_clean)
        X_val, y_val, _ = self.feature_engineer.get_feature_matrix_and_target(val_clean)

        logger.info(
            f"[Fold {fold_id}] Training on {len(X_train)} samples, validating on {len(X_val)} samples. "
            f"Features: {len(feature_cols)}."
        )

        models = self.get_candidate_models()
        fold_models_dir = self.models_dir / f"fold_{fold_id}"
        fold_models_dir.mkdir(parents=True, exist_ok=True)

        # Base validation prediction table preserving spatial metadata
        pred_cols = ["city", "year", "month", "latitude", "longitude", "country", "climate_group"]
        existing_cols = [c for c in pred_cols if c in val_clean.columns]
        val_preds_df = val_clean[existing_cols].copy().reset_index(drop=True)
        val_preds_df["fold_id"] = fold_id
        val_preds_df["uhi_true"] = y_val.values

        for model_name, pipeline in models.items():
            logger.info(f"[Fold {fold_id}] Fitting {model_name}...")
            pipeline.fit(X_train, y_train)

            # Predict on validation year
            y_pred = pipeline.predict(X_val)
            pred_col_name = f"pred_{model_name.lower()}"
            val_preds_df[pred_col_name] = np.round(y_pred, 4)

            # Persist fold model artifact
            model_filename = fold_models_dir / f"{model_name.lower()}.joblib"
            joblib.dump(pipeline, model_filename)

        # Save feature column list for this fold
        with open(fold_models_dir / "feature_columns.json", "w", encoding="utf-8") as f:
            json.dump(feature_cols, f, indent=2)

        return models, val_preds_df

    def train_all_folds(
        self,
        features_path: str | Path = "data/processed/monthly_level/uhi_monthly_features.parquet",
    ) -> pd.DataFrame:
        """
        Execute leakage-safe fold-wise training for all 4 rolling window folds.
        Saves individual fold predictions and returns a consolidated predictions DataFrame.
        """
        logger.info("Starting Milestone 25: Leakage-Safe Fold-Wise Model Training...")
        features_df = pd.read_parquet(features_path)
        self.generator.save_fold_metadata(features_df)

        folds_dict = self.generator.generate_all_folds(features_df)
        all_val_preds = []

        for fold_id, fold_data in folds_dict.items():
            _, val_preds_df = self.train_fold(
                fold_id=fold_id,
                train_df=fold_data["train"],
                val_df=fold_data["val"],
            )

            # Save fold-specific predictions parquet
            fold_pred_path = self.output_dir / f"fold_{fold_id}_predictions.parquet"
            val_preds_df.to_parquet(fold_pred_path, index=False)
            logger.info(f"[Fold {fold_id}] Saved predictions ({len(val_preds_df)} rows) to {fold_pred_path}")
            all_val_preds.append(val_preds_df)

        # Save consolidated predictions parquet across all 4 folds (2,016 total rows: 4 * 504)
        consolidated_df = pd.concat(all_val_preds, ignore_index=True)
        consolidated_path = self.output_dir / "all_folds_predictions.parquet"
        consolidated_df.to_parquet(consolidated_path, index=False)
        logger.info(f"Consolidated 4-fold predictions ({len(consolidated_df)} rows) saved to {consolidated_path}")

        return consolidated_df


def train_rolling_folds(
    features_path: str | Path = "data/processed/monthly_level/uhi_monthly_features.parquet",
    output_dir: str | Path = "data/processed/rolling_results",
    models_dir: str | Path = "models/rolling_folds",
) -> pd.DataFrame:
    """Convenience function to run fold-wise training pipeline."""
    trainer = RollingWindowModelTrainer(output_dir=output_dir, models_dir=models_dir)
    return trainer.train_all_folds(features_path=features_path)


def generate_and_save_folds(
    features_path: str | Path = "data/processed/monthly_level/uhi_monthly_features.parquet",
    output_dir: str | Path = "data/processed/rolling_results",
) -> Path:
    """Convenience runner to load feature dataset and export fold metadata."""
    features_df = pd.read_parquet(features_path)
    generator = RollingWindowGenerator(output_dir=output_dir)
    generator.validate_fold_integrity()
    meta_path = generator.save_fold_metadata(features_df)
    return meta_path


if __name__ == "__main__":
    train_rolling_folds()
