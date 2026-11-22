"""
Climate-Stratified Model Evaluation and Vulnerability Risk Scoring.

Objectives:
1. Evaluate regression performance across Köppen climate classes on holdout 2025 Test set.
2. Implement climate-stratified UHI vulnerability risk scoring:
   - Stratified percentile rankings within climate biomes to avoid biome bias
   - Composite risk index combining UHI intensity, population exposure, and low vegetation buffer
"""

from typing import Dict, Any, List
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.features.engineering import FeatureEngineer

logger = get_logger("risk_scoring")


class ClimateEvaluatorAndRiskScorer:
    """Evaluates models across climate groups and computes stratified vulnerability scores."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.champion_path = Path("models/champion_uhi_model.joblib")
        if not self.champion_path.exists():
            raise FileNotFoundError(f"Champion model not found at: {self.champion_path}")
        self.model = joblib.load(self.champion_path)

    def evaluate_stratified_performance(self) -> pd.DataFrame:
        """
        Evaluate champion UHI regression model across all climate groups on 2025 holdout test set.
        """
        test_df = pd.read_parquet("data/processed/splits/test_2025.parquet")
        test_valid = test_df[test_df["uhi"].notna()].copy()

        fe = FeatureEngineer(self.config)
        X_test, y_test, _ = fe.get_feature_matrix_and_target(test_valid)
        test_valid["predicted_uhi"] = self.model.predict(X_test)
        test_valid["residual"] = test_valid["uhi"] - test_valid["predicted_uhi"]

        stratified_records = []
        for cg, group in test_valid.groupby("climate_group"):
            y_t = group["uhi"].values
            y_p = group["predicted_uhi"].values
            rmse = float(root_mean_squared_error(y_t, y_p))
            mae = float(mean_absolute_error(y_t, y_p))
            r2 = float(r2_score(y_t, y_p)) if len(y_t) > 1 and np.var(y_t) > 1e-4 else np.nan

            stratified_records.append({
                "climate_group": str(cg),
                "sample_count": len(group),
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "r2": round(r2, 4) if not np.isnan(r2) else None,
                "mean_observed_uhi": round(float(y_t.mean()), 4),
                "mean_predicted_uhi": round(float(y_p.mean()), 4),
            })

        stratified_df = pd.DataFrame(stratified_records).sort_values(by="sample_count", ascending=False)
        return stratified_df

    def compute_climate_stratified_risk_scores(self) -> pd.DataFrame:
        """
        Compute tiered UHI vulnerability risk scoring:
        - Within each climate group, calculate percentile rank of UHI intensity (prevents desert bias).
        - Factor in population density exposure and vegetative canopy deficit (1 - NDVI).
        - Composite Score:
            Risk_Score = 0.50 * UHI_Percentile + 0.30 * Pop_Percentile + 0.20 * Canopy_Deficit_Percentile
        - Categorize into: Low, Moderate, High, Extreme risk tiers.
        """
        df = pd.read_parquet("data/processed/monthly_level/uhi_monthly_clean.parquet")

        # Aggregate at the city level
        city_summary = df.groupby("city", as_index=False).agg(
            climate_group=("climate_group", "first"),
            latitude=("latitude", "first"),
            longitude=("longitude", "first"),
            mean_uhi=("uhi", "mean"),
            max_uhi=("uhi", "max"),
            mean_air_temp=("air_temperature", "mean"),
            mean_pop_density=("population_density", "mean"),
            mean_ndvi=("ndvi", "mean"),
            mean_ndbi=("ndbi", "mean"),
        )

        city_summary["canopy_deficit"] = (1.0 - city_summary["mean_ndvi"]).clip(lower=0.0)

        # Compute transform percentiles without dropping original columns
        city_summary["uhi_percentile"] = city_summary.groupby("climate_group")["mean_uhi"].rank(pct=True)
        city_summary["pop_percentile"] = city_summary.groupby("climate_group")["mean_pop_density"].rank(pct=True)
        city_summary["canopy_percentile"] = city_summary.groupby("climate_group")["canopy_deficit"].rank(pct=True)

        # Composite Vulnerability Risk Index [0 to 100]
        city_summary["vulnerability_score"] = (
            (0.50 * city_summary["uhi_percentile"] +
             0.30 * city_summary["pop_percentile"] +
             0.20 * city_summary["canopy_percentile"]) * 100.0
        ).round(1)

        # Classify into 4 risk tiers
        bins = [0, 30, 60, 80, 100]
        labels = ["Low Risk", "Moderate Risk", "High Risk", "Extreme Risk"]
        city_summary["risk_tier"] = pd.cut(city_summary["vulnerability_score"], bins=bins, labels=labels, include_lowest=True).astype(str)

        scored_df = city_summary.sort_values(by="vulnerability_score", ascending=False).reset_index(drop=True)
        return scored_df

    def generate_risk_report(self, output_dir: str = "reports") -> Path:
        """Export climate-stratified evaluation and city vulnerability risk scores."""
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / "climate_stratified_risk.json"

        stratified_perf = self.evaluate_stratified_performance()
        risk_scores = self.compute_climate_stratified_risk_scores()

        report_data = {
            "climate_stratified_performance": stratified_perf.to_dict(orient="records"),
            "top_vulnerable_cities": risk_scores.head(10)[[
                "city", "climate_group", "vulnerability_score", "risk_tier", "mean_uhi", "mean_pop_density"
            ]].to_dict(orient="records"),
            "tier_distribution": risk_scores["risk_tier"].value_counts().to_dict(),
            "city_risk_scores": risk_scores.to_dict(orient="records"),
        }

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        # Save risk scores table to parquet for dashboard consumption
        parquet_out = Path("data/processed/monthly_level/uhi_city_risk_scores.parquet")
        risk_scores.to_parquet(parquet_out, index=False)

        logger.info(f"Climate stratified evaluation and risk report saved to: {report_file}")
        return report_file
