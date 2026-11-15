"""
1-Month-Ahead Weather and Temperature Forecasting Pipeline.

Objectives:
1. Forecast air_temperature at t+1 using weather history and seasonal encodings up to t.
2. Benchmark against:
   - Persistence Baseline: T_pred(t+1) = T_obs(t)
   - Climatology Baseline: T_pred(t+1) = Mean historical temperature for that city and month (from 2016-2023 train set).
3. Compute forecast skill score: 1 - (RMSE_model / RMSE_climatology).
"""

from typing import Dict, Any, Tuple
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("weather_forecaster")


class WeatherForecaster:
    """Builds and benchmarks 1-month-ahead autoregressive weather temperature forecasters."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.models_dir = Path("models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.climatology_table: pd.DataFrame | None = None
        self.model: Pipeline | None = None

    def prepare_forecasting_data(
        self
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Create 1-month-ahead forecasting target: target_temp_t_plus_1 = air_temperature(t+1).
        Respects strict temporal order per city.
        """
        df = pd.read_parquet("data/processed/monthly_level/uhi_monthly_features.parquet")
        df = df.sort_values(by=["city", "year", "month"]).reset_index(drop=True)

        # Target is next month's temperature within the same city
        df["target_temp_next_month"] = df.groupby("city")["air_temperature"].shift(-1).astype(np.float32)

        # Drop the very last month (2025-12) since t+1 is unobserved
        df_valid = df[df["target_temp_next_month"].notna()].copy()

        # Split chronologically
        train_df = df_valid[df_valid["year"] <= 2023].copy()
        val_df = df_valid[df_valid["year"] == 2024].copy()
        test_df = df_valid[df_valid["year"] == 2025].copy()

        # Calculate climatological monthly mean from 2016-2023 train set
        # Next month index for climatology
        train_df["next_month"] = (train_df["month"] % 12) + 1
        val_df["next_month"] = (val_df["month"] % 12) + 1
        test_df["next_month"] = (test_df["month"] % 12) + 1

        self.climatology_table = train_df.groupby(["city", "next_month"])["target_temp_next_month"].mean().reset_index()
        self.climatology_table.rename(columns={"target_temp_next_month": "climatology_temp"}, inplace=True)

        # Merge climatology baseline into val and test
        val_df = val_df.merge(self.climatology_table, on=["city", "next_month"], how="left")
        test_df = test_df.merge(self.climatology_table, on=["city", "next_month"], how="left")

        # Persistence baseline is current month's air temperature
        val_df["persistence_temp"] = val_df["air_temperature"]
        test_df["persistence_temp"] = test_df["air_temperature"]

        logger.info(
            f"Forecasting datasets ready: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}"
        )
        return train_df, val_df, test_df, self.climatology_table

    def train_and_benchmark(self) -> Dict[str, Any]:
        """Train ML forecaster and benchmark against persistence and climatology."""
        train_df, val_df, test_df, _ = self.prepare_forecasting_data()

        # Feature predictors known at time t
        feature_cols = [
            "air_temperature", "total_precipitation", "relative_humidity", "solar_radiation",
            "wind_speed", "ndvi", "month_sin", "month_cos",
            "air_temperature_lag1", "air_temperature_lag3", "air_temperature_lag12",
            "total_precipitation_lag1", "total_precipitation_lag3",
            "relative_humidity_lag1", "solar_radiation_lag1"
        ]

        X_train = train_df[feature_cols].copy()
        y_train = train_df["target_temp_next_month"].copy()

        X_test = test_df[feature_cols].copy()
        y_test = test_df["target_temp_next_month"].copy()

        # 1. Train ML Forecaster
        logger.info("Training HistGradientBoosting Weather Forecaster...")
        forecaster = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("regressor", HistGradientBoostingRegressor(max_iter=150, max_depth=6, learning_rate=0.08, random_state=42))
        ])
        forecaster.fit(X_train, y_train)
        self.model = forecaster

        # Predictions on holdout 2025 Test set
        ml_preds = forecaster.predict(X_test)
        clim_preds = test_df["climatology_temp"].values
        pers_preds = test_df["persistence_temp"].values

        # 2. Benchmark Metrics on Holdout Test Set (2025)
        def get_metrics(y_true, y_hat):
            return {
                "rmse": round(float(root_mean_squared_error(y_true, y_hat)), 4),
                "mae": round(float(mean_absolute_error(y_true, y_hat)), 4),
                "r2": round(float(r2_score(y_true, y_hat)), 4),
            }

        ml_metrics = get_metrics(y_test, ml_preds)
        clim_metrics = get_metrics(y_test, clim_preds)
        pers_metrics = get_metrics(y_test, pers_preds)

        # 3. Forecast Skill Score (improvement over climatology)
        # SS = 1 - (RMSE_ml / RMSE_clim)
        skill_score = round(float(1.0 - (ml_metrics["rmse"] / clim_metrics["rmse"])), 4)

        results = {
            "test_year": 2025,
            "sample_size": len(y_test),
            "benchmarks": {
                "Persistence_Baseline": pers_metrics,
                "Climatological_Mean_Baseline": clim_metrics,
                "ML_Forecaster_HistGB": ml_metrics,
            },
            "skill_score_vs_climatology": skill_score,
            "interpretation": f"ML model reduces forecast error by {skill_score * 100:.1f}% compared to historical climatology."
        }

        # Save model artifact
        model_out = self.models_dir / "weather_forecaster.joblib"
        joblib.dump(forecaster, model_out)

        # Save climatology table
        clim_out = self.models_dir / "climatology_reference.parquet"
        self.climatology_table.to_parquet(clim_out, index=False)

        # Save report
        rep_out = Path("reports/weather_forecast_benchmarks.json")
        with open(rep_out, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

        logger.info(f"Forecasting benchmarks complete. Skill score: {skill_score:.4f}. Report: {rep_out}")
        return results
