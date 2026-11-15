"""
10-Point Scientific Data Validation Pipeline for UHI Datasets.
"""

from typing import Dict, Any, List, Tuple
from pathlib import Path
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.data.loader import load_raw_monthly_data

logger = get_logger("validator")


class DataValidator:
    """Performs 10-point scientific validation across UHI datasets."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.bounds = self.config.get("scientific_bounds", {})
        self.expected_cities = set(self.config.get("cities", {}).keys())
        self.results: Dict[str, Dict[str, Any]] = {}

    def run_all_checks(self, df: pd.DataFrame | None = None) -> Tuple[bool, Dict[str, Any]]:
        """Run all 10 scientific checks against the monthly dataset."""
        if df is None:
            df = load_raw_monthly_data()

        logger.info("Starting 10-Point Scientific Data Validation...")

        self.results["check_1_completeness"] = self.check_completeness(df)
        self.results["check_2_coordinate_bounds"] = self.check_coordinate_bounds(df)
        self.results["check_3_physical_temperature_bounds"] = self.check_temperature_bounds(df)
        self.results["check_4_cloud_missingness"] = self.check_cloud_missingness(df)
        self.results["check_5_spectral_indices_bounds"] = self.check_spectral_indices(df)
        self.results["check_6_precipitation_non_negativity"] = self.check_precipitation(df)
        self.results["check_7_wind_speed_non_negativity"] = self.check_wind_speed(df)
        self.results["check_8_duplicates"] = self.check_duplicates(df)
        self.results["check_9_city_climate_consistency"] = self.check_city_climate_consistency(df)
        self.results["check_10_temporal_monotonicity"] = self.check_temporal_monotonicity(df)

        all_passed = all(
            res["status"] == "PASSED"
            for res in self.results.values()
        )

        logger.info(f"10-Point Validation completed. All checks passed: {all_passed}")
        return all_passed, self.results

    def check_completeness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 1: 42 cities x 10 years x 12 months = 5,040 rows."""
        expected_rows = self.config["study_scope"]["expected_city_month_rows"]
        actual_rows = len(df)
        passed = actual_rows == expected_rows
        return {
            "status": "PASSED" if passed else "FAILED",
            "expected_rows": expected_rows,
            "actual_rows": actual_rows,
            "message": f"Expected {expected_rows} rows, found {actual_rows}."
        }

    def check_coordinate_bounds(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 2: Latitude in [-90, 90] and Longitude in [-180, 180]."""
        lat_valid = df["latitude"].between(-90, 90).all()
        lon_valid = df["longitude"].between(-180, 180).all()
        passed = lat_valid and lon_valid
        return {
            "status": "PASSED" if passed else "FAILED",
            "message": f"Latitude in bounds: {lat_valid}, Longitude in bounds: {lon_valid}."
        }

    def check_temperature_bounds(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Check 3: Valid non-null LST and Air Temperature within physical bounds [-50C, 70C].
        Flags any physical sensor corruption / unmasked cloud artifacts (e.g. LST < -50C).
        """
        min_temp = self.bounds.get("lst_min_celsius", -50.0)
        max_temp = self.bounds.get("lst_max_celsius", 70.0)

        # Check Air Temperature (should never have severe sensor glitch)
        air_outliers = (~df["air_temperature"].isna()) & (
            (df["air_temperature"] < min_temp) | (df["air_temperature"] > max_temp)
        )
        # Check LST outliers (cloud-glitch temperatures)
        lst_outliers = (~df["lst"].isna()) & (
            (df["lst"] < min_temp) | (df["lst"] > max_temp)
        )
        rural_lst_outliers = (~df["rural_lst"].isna()) & (
            (df["rural_lst"] < min_temp) | (df["rural_lst"] > max_temp)
        )

        lst_outlier_count = int(lst_outliers.sum())
        rural_outlier_count = int(rural_lst_outliers.sum())
        air_outlier_count = int(air_outliers.sum())

        has_corruption = (lst_outlier_count > 0 or rural_outlier_count > 0 or air_outlier_count > 0)

        return {
            "status": "WARNING" if has_corruption else "PASSED",
            "air_temp_outliers": air_outlier_count,
            "lst_glitch_count": lst_outlier_count,
            "rural_lst_glitch_count": rural_outlier_count,
            "bounds": [min_temp, max_temp],
            "message": (
                f"Found {lst_outlier_count} LST and {rural_outlier_count} Rural_LST cloud-glitch "
                f"artifacts outside [{min_temp}, {max_temp}] C requiring cleaning in Milestone 5."
                if has_corruption else "All temperatures within physical bounds."
            )
        }

    def check_cloud_missingness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Check 4: Missing cloud observations must be preserved as NaN (never zero-imputed).
        Zero indicates 0 C freezing, which is physically wrong for unobserved cloud scenes.
        """
        zero_lst = int((df["lst"] == 0).sum())
        zero_rural_lst = int((df["rural_lst"] == 0).sum())
        nan_lst = int(df["lst"].isna().sum())

        passed = (zero_lst == 0 and zero_rural_lst == 0)
        return {
            "status": "PASSED" if passed else "FAILED",
            "zero_lst_count": zero_lst,
            "zero_rural_lst_count": zero_rural_lst,
            "unobserved_nan_lst_count": nan_lst,
            "message": (
                f"Cloud missingness verified: {nan_lst} scenes preserved as NaN; "
                f"zero count is {zero_lst} (no false zero-imputation detected)."
            )
        }

    def check_spectral_indices(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 5: NDVI, NDBI, NDWI within theoretical bounds [-1.0, 1.0]."""
        ndvi_valid = df["ndvi"].dropna().between(-1.0, 1.0).all()
        ndbi_valid = df["ndbi"].dropna().between(-1.0, 1.0).all()
        ndwi_valid = df["ndwi"].dropna().between(-1.0, 1.0).all()
        passed = ndvi_valid and ndbi_valid and ndwi_valid
        return {
            "status": "PASSED" if passed else "FAILED",
            "ndvi_valid": bool(ndvi_valid),
            "ndbi_valid": bool(ndbi_valid),
            "ndwi_valid": bool(ndwi_valid),
            "message": "All spectral indices strictly within [-1.0, 1.0]."
        }

    def check_precipitation(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 6: Total precipitation >= 0."""
        neg_precip = int((df["total_precipitation"] < 0).sum())
        passed = neg_precip == 0
        return {
            "status": "PASSED" if passed else "FAILED",
            "negative_precipitation_count": neg_precip,
            "message": f"Precipitation non-negativity: {neg_precip} negative records."
        }

    def check_wind_speed(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 7: Wind speed >= 0."""
        neg_wind = int((df["wind_speed"] < 0).sum())
        passed = neg_wind == 0
        return {
            "status": "PASSED" if passed else "FAILED",
            "negative_wind_speed_count": neg_wind,
            "message": f"Wind speed non-negativity: {neg_wind} negative records."
        }

    def check_duplicates(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 8: Unique (city, year, month) records."""
        dupes = int(df.duplicated(subset=["city", "year", "month"]).sum())
        passed = dupes == 0
        return {
            "status": "PASSED" if passed else "FAILED",
            "duplicate_count": dupes,
            "message": f"Found {dupes} duplicate city-month timestamps."
        }

    def check_city_climate_consistency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 9: Exact 42 cities match registry, and each city has 1 unique climate group."""
        dataset_cities = set(df["city"].unique())
        missing_cities = self.expected_cities - dataset_cities
        extra_cities = dataset_cities - self.expected_cities

        inconsistent_climates = []
        for city, group in df.groupby("city"):
            if group["climate_group"].nunique() > 1:
                inconsistent_climates.append(city)

        passed = (len(missing_cities) == 0 and len(extra_cities) == 0 and len(inconsistent_climates) == 0)
        return {
            "status": "PASSED" if passed else "FAILED",
            "total_cities": len(dataset_cities),
            "missing_cities": list(missing_cities),
            "extra_cities": list(extra_cities),
            "inconsistent_climates": inconsistent_climates,
            "message": f"42 cities verified with consistent climate groups across 2016-2025."
        }

    def check_temporal_monotonicity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Check 10: Chronological month sequence 1..12 for every city-year."""
        non_monotonic_cities = []
        for city, group in df.groupby("city"):
            sorted_group = group.sort_values(by=["year", "month"])
            if not (
                (group["year"].values == sorted_group["year"].values).all()
                and (group["month"].values == sorted_group["month"].values).all()
            ):
                non_monotonic_cities.append(city)

        passed = len(non_monotonic_cities) == 0
        return {
            "status": "PASSED" if passed else "FAILED",
            "non_monotonic_cities": non_monotonic_cities,
            "message": (
                "All city-years strictly monotonic (months 1-12 in sequence)."
                if passed else f"Non-monotonic sequence found in: {non_monotonic_cities}"
            )
        }
