"""
Automated Exploratory Data Analysis (EDA) engine and report generator.
"""

from pathlib import Path
from typing import Dict, Any
import json
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("eda")


class ExploratoryDataAnalyzer:
    """Performs temporal, geospatial, and biophysical exploratory analysis on UHI datasets."""

    def __init__(self, data_path: str = "data/processed/monthly_level/uhi_monthly_clean.parquet"):
        self.config = load_config()
        self.data_path = Path(data_path)
        if not self.data_path.exists():
            raise FileNotFoundError(f"Clean dataset not found at: {self.data_path}")
        self.df = pd.read_parquet(self.data_path)

    def compute_global_summary(self) -> Dict[str, Any]:
        """Compute key dataset distributions and high-level health metrics."""
        uhi_valid = self.df["uhi"].dropna()
        lst_valid = self.df["lst"].dropna()

        return {
            "total_records": len(self.df),
            "total_cities": int(self.df["city"].nunique()),
            "total_climate_groups": int(self.df["climate_group"].nunique()),
            "uhi_mean": float(uhi_valid.mean()),
            "uhi_median": float(uhi_valid.median()),
            "uhi_std": float(uhi_valid.std()),
            "uhi_min": float(uhi_valid.min()),
            "uhi_max": float(uhi_valid.max()),
            "lst_mean": float(lst_valid.mean()),
            "lst_min": float(lst_valid.min()),
            "lst_max": float(lst_valid.max()),
            "missing_thermal_percent": float((self.df["lst"].isna().sum() / len(self.df)) * 100),
        }

    def compute_city_level_metrics(self) -> pd.DataFrame:
        """Compute mean, std, min, and max UHI and LST per city."""
        city_metrics = self.df.groupby("city").agg(
            climate_group=("climate_group", "first"),
            latitude=("latitude", "first"),
            longitude=("longitude", "first"),
            mean_uhi=("uhi", "mean"),
            median_uhi=("uhi", "median"),
            std_uhi=("uhi", "std"),
            min_uhi=("uhi", "min"),
            max_uhi=("uhi", "max"),
            mean_lst=("lst", "mean"),
            mean_air_temp=("air_temperature", "mean"),
            mean_ndvi=("ndvi", "mean"),
            mean_ndbi=("ndbi", "mean"),
            valid_observation_count=("uhi", "count"),
        ).reset_index()

        city_metrics = city_metrics.sort_values(by="mean_uhi", ascending=False)
        return city_metrics

    def compute_climate_stratified_metrics(self) -> pd.DataFrame:
        """Analyze UHI intensity aggregated across Köppen climate classes."""
        climate_metrics = self.df.groupby("climate_group").agg(
            city_count=("city", "nunique"),
            total_observations=("uhi", "count"),
            mean_uhi=("uhi", "mean"),
            std_uhi=("uhi", "std"),
            median_uhi=("uhi", "median"),
            mean_air_temp=("air_temperature", "mean"),
            mean_precipitation=("total_precipitation", "mean"),
            mean_ndvi=("ndvi", "mean"),
        ).reset_index().sort_values(by="mean_uhi", ascending=False)

        return climate_metrics

    def compute_seasonal_profiles(self) -> pd.DataFrame:
        """Analyze month-by-month UHI progression globally and by hemisphere."""
        df_seasonal = self.df.copy()
        df_seasonal["hemisphere"] = np.where(df_seasonal["latitude"] >= 0, "Northern", "Southern")

        seasonal = df_seasonal.groupby(["hemisphere", "month"]).agg(
            mean_uhi=("uhi", "mean"),
            mean_lst=("lst", "mean"),
            mean_air_temp=("air_temperature", "mean"),
            mean_ndvi=("ndvi", "mean"),
        ).reset_index()

        return seasonal

    def compute_correlation_matrix(self) -> pd.DataFrame:
        """Calculate pairwise correlation among numeric biophysical predictors and UHI."""
        cols = [
            "uhi", "air_temperature", "ndvi", "ndbi", "ndwi",
            "population_density", "wind_speed", "relative_humidity",
            "solar_radiation", "total_precipitation"
        ]
        available_cols = [c for c in cols if c in self.df.columns]
        return self.df[available_cols].corr()

    def generate_full_eda_report(self, output_dir: str = "reports") -> Path:
        """Generate comprehensive JSON summary report for dashboard and documentation."""
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        report_file = out_dir / "eda_summary.json"

        global_stats = self.compute_global_summary()
        city_df = self.compute_city_level_metrics()
        climate_df = self.compute_climate_stratified_metrics()
        corr_matrix = self.compute_correlation_matrix()

        # Identify top UHI hotspots vs cool-islands (UCI)
        hotspots = city_df.head(5)[["city", "climate_group", "mean_uhi"]].to_dict(orient="records")
        cool_islands = city_df.tail(5)[["city", "climate_group", "mean_uhi"]].to_dict(orient="records")

        report_data = {
            "global_summary": global_stats,
            "top_hotspot_cities": hotspots,
            "top_cool_island_cities": cool_islands,
            "climate_group_summary": climate_df.to_dict(orient="records"),
            "correlations_with_uhi": corr_matrix["uhi"].to_dict(),
        }

        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        logger.info(f"EDA Summary report saved to: {report_file}")
        return report_file
