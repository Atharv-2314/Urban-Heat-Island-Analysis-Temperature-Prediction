"""
Leakage-Safe Feature Engineering Pipeline for UHI Prediction.

Rules:
1. STRICT EXCLUSION: lst and rural_lst are strictly excluded from predictors (prevent target leakage).
2. Cyclical month encodings: sin(2*pi*month/12) and cos(2*pi*month/12).
3. Strictly forward temporal lags: lag_1, lag_3, lag_12 per city (no lookahead).
4. Morphology proxies: built_to_vegetation (ndbi - ndvi), moisture_balance (ndwi), etc.
"""

from typing import List, Dict, Any, Tuple
from pathlib import Path
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("feature_engineering")


class FeatureEngineer:
    """Constructs leakage-safe temporal, morphology, and weather features for UHI modeling."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()

    def build_cyclical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add sine and cosine cyclical representations for months (1..12)."""
        df = df.copy()
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0).astype(np.float32)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0).astype(np.float32)
        return df

    def build_morphology_proxies(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Construct urban morphology proxies:
        - built_to_vegetation_ratio: ndbi - ndvi (higher = denser concrete vs greenery)
        - vegetation_moisture_interaction: ndvi * ndwi
        - log_population_density: log1p(population_density) for variance stabilization
        """
        df = df.copy()
        df["built_veg_ratio"] = (df["ndbi"] - df["ndvi"]).astype(np.float32)
        df["veg_moisture_interaction"] = (df["ndvi"] * df["ndwi"]).astype(np.float32)
        df["log_pop_density"] = np.log1p(df["population_density"].clip(lower=0)).astype(np.float32)
        return df

    def build_temporal_lags(self, df: pd.DataFrame, lag_features: List[str] | None = None) -> pd.DataFrame:
        """
        Create strictly causal, forward-in-time lags (1-month, 3-month, 12-month) per city.
        Never shuffles time-series; respects chronological order per city.
        """
        df = df.copy()
        # Sort strictly by city, year, month
        df = df.sort_values(by=["city", "year", "month"]).reset_index(drop=True)

        target_lag_cols = lag_features or [
            "air_temperature",
            "total_precipitation",
            "relative_humidity",
            "solar_radiation",
            "wind_speed",
            "ndvi",
        ]

        # Compute lags strictly grouped by city
        for col in target_lag_cols:
            if col in df.columns:
                df[f"{col}_lag1"] = df.groupby("city")[col].shift(1).astype(np.float32)
                df[f"{col}_lag3"] = df.groupby("city")[col].shift(3).astype(np.float32)
                df[f"{col}_lag12"] = df.groupby("city")[col].shift(12).astype(np.float32)

        return df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Run complete feature engineering pipeline."""
        logger.info(f"Engineering features for {len(df)} records...")
        df_feat = self.build_cyclical_features(df)
        df_feat = self.build_morphology_proxies(df_feat)
        df_feat = self.build_temporal_lags(df_feat)

        logger.info(f"Feature engineering complete. Result columns: {len(df_feat.columns)}")
        return df_feat

    def get_feature_matrix_and_target(
        self,
        df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """
        Extract feature matrix X and target y (UHI).
        STRICT GUARANTEE: Neither 'lst' nor 'rural_lst' is included in X to prevent target leakage.
        """
        # Strict exclusion list
        leakage_forbidden = {"lst", "rural_lst", "uhi", "split", "city"}

        # Candidate feature columns
        numeric_feature_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in leakage_forbidden
            and c not in ["year", "month"]  # year and raw month excluded in favor of cyclical/lag features
        ]

        X = df[numeric_feature_cols].copy()
        y = df["uhi"].copy()

        # Final leak check assertion
        for forbidden in ["lst", "rural_lst", "uhi"]:
            if forbidden in X.columns:
                raise ValueError(f"FATAL TARGET LEAKAGE: '{forbidden}' found in feature matrix X!")

        logger.info(f"Feature matrix prepared with {X.shape[1]} predictors. Target leakage verified: ZERO.")
        return X, y, numeric_feature_cols

    def save_feature_dataset(
        self,
        input_parquet: str = "data/processed/monthly_level/uhi_monthly_clean.parquet",
        output_parquet: str = "data/processed/monthly_level/uhi_monthly_features.parquet"
    ) -> Path:
        """Load clean parquet, transform features, and persist to parquet."""
        in_path = Path(input_parquet)
        df = pd.read_parquet(in_path)
        df_feat = self.transform(df)

        out_path = Path(output_parquet)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        df_feat.to_parquet(out_path, index=False, engine="pyarrow", compression="snappy")
        logger.info(f"Saved feature dataset to: {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")
        return out_path
