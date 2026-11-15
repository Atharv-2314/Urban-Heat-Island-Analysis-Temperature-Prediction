"""
Urban Planning Counterfactual "What-If" Simulator.

Simulates the cooling impact of urban greening, albedo enhancement, and water retention:
- Delta NDVI in [+0.00, +0.30] (Green canopy expansion, urban forests, green roofs)
- Delta NDBI in [-0.30, +0.00] (Cool roofs, reflective pavements, permeable roads)
- Delta NDWI in [+0.00, +0.20] (Retention basins, urban wetlands, fountains)

Mathematical formulation:
Delta UHI = f(X_modified) - f(X_baseline)
Subject to physical constraints:
-1.0 <= NDVI, NDBI, NDWI <= +1.0
Automatically updates composite morphology proxies (built_veg_ratio, veg_moisture_interaction).
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.features.engineering import FeatureEngineer

logger = get_logger("simulator")


class CounterfactualSimulator:
    """Simulates urban cooling interventions on city thermal profiles."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.model_path = Path("models/champion_uhi_model.joblib")
        if not self.model_path.exists():
            raise FileNotFoundError(f"Champion model not found at: {self.model_path}")
        self.model = joblib.load(self.model_path)
        self.fe = FeatureEngineer(self.config)

    def simulate_city_intervention(
        self,
        city_name: str,
        delta_ndvi: float = 0.10,
        delta_ndbi: float = -0.10,
        delta_ndwi: float = 0.05,
        dataset_path: str = "data/processed/splits/test_2025.parquet"
    ) -> Dict[str, Any]:
        """
        Simulate urban greening/cooling policy for a specific city:
        1. Select recent records for city.
        2. Apply biophysical policy shifts with strict clipping to [-1.0, 1.0].
        3. Recalculate composite morphology proxies:
           - built_veg_ratio = ndbi - ndvi
           - veg_moisture_interaction = ndvi * ndwi
        4. Predict UHI before vs. after.
        5. Return mean temperature reduction (Delta UHI), cooling percentage, and month-by-month changes.
        """
        df = pd.read_parquet(dataset_path)
        city_mask = df["city"].str.lower() == city_name.strip().lower()
        if not city_mask.any():
            raise ValueError(f"City '{city_name}' not found in dataset.")

        city_data = df[city_mask].copy()

        # Extract baseline feature matrix
        X_base, _, _ = self.fe.get_feature_matrix_and_target(city_data)
        baseline_pred = self.model.predict(X_base)

        # Build modified counterfactual dataframe
        city_modified = city_data.copy()
        city_modified["ndvi"] = (city_modified["ndvi"] + delta_ndvi).clip(-1.0, 1.0)
        city_modified["ndbi"] = (city_modified["ndbi"] + delta_ndbi).clip(-1.0, 1.0)
        city_modified["ndwi"] = (city_modified["ndwi"] + delta_ndwi).clip(-1.0, 1.0)

        # Update composite proxies
        city_modified["built_veg_ratio"] = (city_modified["ndbi"] - city_modified["ndvi"]).astype(np.float32)
        city_modified["veg_moisture_interaction"] = (city_modified["ndvi"] * city_modified["ndwi"]).astype(np.float32)

        X_mod, _, _ = self.fe.get_feature_matrix_and_target(city_modified)
        counterfactual_pred = self.model.predict(X_mod)

        delta_uhi = counterfactual_pred - baseline_pred  # negative value means cooling
        mean_cooling = float(-delta_uhi.mean())           # positive value indicates temperature drop

        monthly_breakdown = []
        for i, row in city_data.reset_index().iterrows():
            monthly_breakdown.append({
                "month": int(row["month"]),
                "baseline_uhi": round(float(baseline_pred[i]), 3),
                "counterfactual_uhi": round(float(counterfactual_pred[i]), 3),
                "cooling_effect_celsius": round(float(-delta_uhi[i]), 3),
            })

        return {
            "city": city_name,
            "climate_group": str(city_data["climate_group"].iloc[0]),
            "interventions": {
                "delta_ndvi_greening": delta_ndvi,
                "delta_ndbi_albedo": delta_ndbi,
                "delta_ndwi_water": delta_ndwi,
            },
            "mean_cooling_celsius": round(mean_cooling, 3),
            "max_cooling_celsius": round(float(-delta_uhi.max()), 3),
            "min_cooling_celsius": round(float(-delta_uhi.min()), 3),
            "monthly_breakdown": monthly_breakdown,
            "policy_summary": (
                f"Implementing +{delta_ndvi*100:.0f}% green canopy and {delta_ndbi*100:.0f}% cool roofs "
                f"in {city_name} is associated with an average cooling of {mean_cooling:.2f} C."
            )
        }

    def simulate_all_cities(
        self,
        delta_ndvi: float = 0.15,
        delta_ndbi: float = -0.15,
        delta_ndwi: float = 0.05
    ) -> pd.DataFrame:
        """Run standard city-wide greening policy simulation across all 42 cities."""
        config_cities = list(self.config.get("cities", {}).keys())
        logger.info(f"Running urban cooling simulation across {len(config_cities)} cities...")

        results = []
        for city in config_cities:
            try:
                sim = self.simulate_city_intervention(
                    city_name=city,
                    delta_ndvi=delta_ndvi,
                    delta_ndbi=delta_ndbi,
                    delta_ndwi=delta_ndwi
                )
                results.append({
                    "city": sim["city"],
                    "climate_group": sim["climate_group"],
                    "mean_cooling_celsius": sim["mean_cooling_celsius"],
                    "max_cooling_celsius": sim["max_cooling_celsius"],
                })
            except Exception as e:
                logger.warning(f"Simulation failed for {city}: {e}")

        df_sim = pd.DataFrame(results).sort_values(by="mean_cooling_celsius", ascending=False).reset_index(drop=True)
        return df_sim

    def generate_simulation_report(self, output_dir: str = "reports") -> Path:
        """Export counterfactual simulation results and benchmark table."""
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / "counterfactual_simulation.json"

        # Standard scenario: Moderate greening (+15% NDVI, -15% NDBI, +5% NDWI)
        all_cities_sim = self.simulate_all_cities(delta_ndvi=0.15, delta_ndbi=-0.15, delta_ndwi=0.05)

        # Highlight sample cities
        sample_cities = ["Ahmedabad", "Delhi", "London", "Tokyo", "Madrid"]
        city_details = {}
        for c in sample_cities:
            city_details[c] = self.simulate_city_intervention(c, delta_ndvi=0.15, delta_ndbi=-0.15, delta_ndwi=0.05)

        report_data = {
            "scenario": {
                "name": "Moderate Green & Cool Roofs Policy",
                "delta_ndvi": 0.15,
                "delta_ndbi": -0.15,
                "delta_ndwi": 0.05,
            },
            "global_average_cooling_celsius": round(float(all_cities_sim["mean_cooling_celsius"].mean()), 3),
            "top_cooling_beneficiaries": all_cities_sim.head(5).to_dict(orient="records"),
            "least_cooling_beneficiaries": all_cities_sim.tail(5).to_dict(orient="records"),
            "sample_city_profiles": city_details,
        }

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        # Save table to parquet for dashboard simulator page
        parquet_out = Path("data/processed/monthly_level/uhi_simulation_benchmarks.parquet")
        all_cities_sim.to_parquet(parquet_out, index=False)

        logger.info(f"Counterfactual simulation report saved to: {report_file}")
        return report_file
