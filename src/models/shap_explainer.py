"""
SHAP Feature Attributions and Explainability Engine for UHI Regression.

Computes:
1. TreeSHAP values on holdout 2025 Test set for global feature importances.
2. Directional beeswarm impacts (e.g. positive vs negative contribution to UHI).
3. Non-linear interaction analysis between vegetation (NDVI) and weather (wind, humidity).
4. Persists SHAP summary tables and individual city waterfalls for dashboard visualization.
"""

from typing import Dict, Any, List
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np
import shap

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.features.engineering import FeatureEngineer

logger = get_logger("shap_explainability")


class UHIExplainer:
    """Computes and analyzes SHAP values for the champion UHI regression model."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.champion_path = Path("models/champion_uhi_model.joblib")
        if not self.champion_path.exists():
            raise FileNotFoundError(f"Champion model not found at: {self.champion_path}")
        self.pipeline = joblib.load(self.champion_path)
        self.imputer = self.pipeline.named_steps["imputer"]
        self.regressor = self.pipeline.named_steps["regressor"]
        self.feature_cols: List[str] = []

    def compute_test_shap_values(self) -> Tuple[np.ndarray, pd.DataFrame, pd.DataFrame]:
        """
        Compute TreeSHAP values for all observations in the 2025 holdout test set.
        Returns:
            shap_values: ndarray of shape (N, D)
            X_test_imputed: pd.DataFrame of shape (N, D)
            test_meta: metadata with city, month, and climate_group
        """
        logger.info("Loading 2025 holdout test set for SHAP attribution...")
        test_df = pd.read_parquet("data/processed/splits/test_2025.parquet")
        test_valid = test_df[test_df["uhi"].notna()].copy()

        fe = FeatureEngineer(self.config)
        X_test, y_test, feature_cols = fe.get_feature_matrix_and_target(test_valid)
        self.feature_cols = feature_cols

        X_imputed_array = self.imputer.transform(X_test)
        X_imputed = pd.DataFrame(X_imputed_array, columns=feature_cols, index=test_valid.index)

        logger.info(f"Computing TreeSHAP values across {len(X_imputed)} test records...")
        explainer = shap.TreeExplainer(self.regressor)
        shap_values = explainer.shap_values(X_imputed)

        test_meta = test_valid[["city", "year", "month", "climate_group", "uhi"]].copy()
        test_meta["predicted_uhi"] = self.pipeline.predict(X_test)

        return shap_values, X_imputed, test_meta

    def summarize_global_feature_importance(
        self,
        shap_values: np.ndarray,
        feature_cols: List[str]
    ) -> pd.DataFrame:
        """
        Compute mean absolute SHAP value per feature:
        mean(|SHAP|) indicates global model reliance on each biophysical predictor.
        """
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        importance_df = pd.DataFrame({
            "feature": feature_cols,
            "mean_abs_shap": mean_abs_shap
        }).sort_values(by="mean_abs_shap", ascending=False).reset_index(drop=True)

        return importance_df

    def analyze_interactions(
        self,
        shap_values: np.ndarray,
        X_imputed: pd.DataFrame,
        feature_a: str = "ndvi",
        feature_b: str = "wind_speed"
    ) -> Dict[str, Any]:
        """
        Analyze non-linear interaction effect between vegetation and weather.
        E.g., Does tree cooling (NDVI SHAP impact) increase or decrease under high wind speed?
        """
        if feature_a not in X_imputed.columns or feature_b not in X_imputed.columns:
            return {}

        col_a_idx = X_imputed.columns.get_loc(feature_a)
        shap_a = shap_values[:, col_a_idx]
        val_b = X_imputed[feature_b].values

        # Stratify by median wind speed
        median_b = float(np.median(val_b))
        low_b_mask = val_b <= median_b
        high_b_mask = val_b > median_b

        return {
            "feature_a": feature_a,
            "feature_b": feature_b,
            "mean_shap_a_at_low_b": float(np.mean(shap_a[low_b_mask])),
            "mean_shap_a_at_high_b": float(np.mean(shap_a[high_b_mask])),
            "median_feature_b_threshold": median_b,
            "scientific_takeaway": (
                f"When {feature_b} is low (<= {median_b:.2f}), {feature_a} SHAP impact averages "
                f"{np.mean(shap_a[low_b_mask]):.3f}; when high, it shifts to {np.mean(shap_a[high_b_mask]):.3f}."
            )
        }

    def generate_and_save_shap_artifacts(self, output_dir: str = "reports") -> Path:
        """Generate and serialize complete SHAP interpretability suite."""
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / "shap_explainability.json"

        shap_values, X_imputed, test_meta = self.compute_test_shap_values()
        importance_df = self.summarize_global_feature_importance(shap_values, self.feature_cols)

        # Non-linear interaction analysis: NDVI with Wind Speed and Humidity
        ndvi_wind_interaction = self.analyze_interactions(shap_values, X_imputed, "ndvi", "wind_speed")
        ndvi_humidity_interaction = self.analyze_interactions(shap_values, X_imputed, "ndvi", "relative_humidity")

        # Save individual city-level SHAP contributions to Parquet for dashboard waterfall plots
        shap_df = pd.DataFrame(shap_values, columns=[f"shap_{c}" for c in self.feature_cols])
        full_shap_export = pd.concat([test_meta.reset_index(drop=True), shap_df], axis=1)

        parquet_out = Path("data/processed/monthly_level/uhi_shap_values_2025.parquet")
        full_shap_export.to_parquet(parquet_out, index=False)

        report_data = {
            "top_10_global_drivers": importance_df.head(10).to_dict(orient="records"),
            "interactions": {
                "ndvi_wind": ndvi_wind_interaction,
                "ndvi_humidity": ndvi_humidity_interaction,
            },
            "saved_shap_parquet": str(parquet_out.name),
            "records_analyzed": len(full_shap_export),
        }

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        logger.info(f"SHAP Explainability report and Parquet saved to: {report_file}")
        return report_file
