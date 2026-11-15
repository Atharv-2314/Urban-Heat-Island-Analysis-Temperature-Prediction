"""
Data cleaning and Parquet transformation pipeline for UHI datasets.
"""

from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config
from src.data.loader import load_raw_monthly_data, parse_geojson_coordinates

logger = get_logger("cleaner")


class DataCleaner:
    """Cleans raw/interim datasets and transforms them into optimized Parquet files."""

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or load_config()
        self.bounds = self.config.get("scientific_bounds", {})
        self.min_temp = self.bounds.get("lst_min_celsius", -50.0)
        self.max_temp = self.bounds.get("lst_max_celsius", 70.0)

    def clean_monthly_data(self, df: pd.DataFrame | None = None) -> pd.DataFrame:
        """
        Clean the City-Month dataset:
        1. Replace unmasked cloud sensor artifacts (temperatures outside [-50C, 70C]) with NaN.
        2. Recalculate UHI = LST - Rural_LST whenever either thermal term was corrupted.
        3. Enforce proper data types.
        4. Preserve true missing cloud gaps as NaN (never zero-imputed).
        """
        if df is None:
            df = load_raw_monthly_data()

        logger.info(f"Cleaning monthly dataset ({len(df)} rows)...")
        df_clean = df.copy()

        # Identify temperature corruptions (e.g. -123 C cloud glitched LST)
        lst_corrupt = (df_clean["lst"] < self.min_temp) | (df_clean["lst"] > self.max_temp)
        rural_corrupt = (df_clean["rural_lst"] < self.min_temp) | (df_clean["rural_lst"] > self.max_temp)

        corrupt_lst_count = int(lst_corrupt.sum())
        corrupt_rural_count = int(rural_corrupt.sum())

        logger.info(
            f"Sanitizing cloud-glitch thermal artifacts: {corrupt_lst_count} LST, "
            f"{corrupt_rural_count} Rural_LST -> replaced with NaN."
        )

        df_clean.loc[lst_corrupt, "lst"] = np.nan
        df_clean.loc[rural_corrupt, "rural_lst"] = np.nan

        # Recalculate UHI to guarantee UHI = LST - Rural_LST
        # If either is NaN, UHI becomes NaN
        df_clean["uhi"] = df_clean["lst"] - df_clean["rural_lst"]

        # Drop GEE internal columns not needed for modeling or app
        cols_to_drop = [col for col in ["system:index", ".geo"] if col in df_clean.columns]
        if cols_to_drop:
            df_clean = df_clean.drop(columns=cols_to_drop)

        # Enforce downcasting for memory optimization
        int_cols = ["year", "month", "Population_Epoch", "Urban_Valid_LST_Pixel_Count", "Rural_Valid_LST_Pixel_Count"]
        for col in int_cols:
            if col in df_clean.columns:
                df_clean[col] = pd.to_numeric(df_clean[col], downcast="integer")

        float_cols = df_clean.select_dtypes(include=["float64"]).columns
        for col in float_cols:
            df_clean[col] = pd.to_numeric(df_clean[col], downcast="float")

        logger.info(f"Monthly cleaning complete. Result shape: {df_clean.shape}")
        return df_clean

    def save_monthly_parquet(self, df: pd.DataFrame | None = None, output_path: str | None = None) -> Path:
        """Save cleaned monthly dataset to compressed Parquet."""
        df_clean = self.clean_monthly_data(df)
        out = Path(output_path or self.config["paths"]["processed_monthly_parquet"])
        out.parent.mkdir(parents=True, exist_ok=True)

        df_clean.to_parquet(out, index=False, engine="pyarrow", compression="snappy")
        logger.info(f"Saved clean monthly dataset to Parquet: {out} ({out.stat().st_size / 1024:.1f} KB)")
        return out

    def clean_and_convert_pixel_data(
        self,
        city_name: str,
        input_csv_path: Path,
        output_dir: Path
    ) -> Path:
        """
        Clean and convert a single city's sampled ~1 km grid dataset to Parquet:
        1. Extract latitude & longitude from .geo if needed.
        2. Replace cloud-glitch LST (< -50 C or > 70 C) with NaN.
        3. Recalculate UHI where applicable.
        4. Save to optimized Parquet with snappy compression.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        clean_city = city_name.lower().replace(" ", "")
        out_parquet = output_dir / f"uhi_grid_{clean_city}.parquet"

        df = pd.read_csv(input_csv_path)

        # Parse coordinates from .geo
        if ".geo" in df.columns and ("latitude" not in df.columns or "longitude" not in df.columns):
            coords = df[".geo"].apply(parse_geojson_coordinates)
            df["latitude"] = [c[0] for c in coords]
            df["longitude"] = [c[1] for c in coords]

        # Standardize column names
        rename_map = {
            "City": "city",
            "Year": "year",
            "Month": "month",
            "Climate_Group": "climate_group",
            "Air_Temperature": "air_temperature",
            "LST": "lst",
            "UHI": "uhi",
            "NDVI": "ndvi",
            "NDBI": "ndbi",
            "NDWI": "ndwi",
            "Population_Density": "population_density",
            "Wind_Speed": "wind_speed",
            "Relative_Humidity": "relative_humidity",
            "Solar_Radiation": "solar_radiation",
            "ERA5_Rainfall": "rainfall",
            "Split": "split",
        }
        df = df.rename(columns=rename_map)

        # Remove raw geo/index
        drop_cols = [c for c in [".geo", "system:index"] if c in df.columns]
        if drop_cols:
            df = df.drop(columns=drop_cols)

        # Sanitize sensor glitches in sampled grid LST
        glitch_mask = (df["lst"] < self.min_temp) | (df["lst"] > self.max_temp)
        df.loc[glitch_mask, "lst"] = np.nan
        df.loc[glitch_mask, "uhi"] = np.nan

        # Downcast floats and ints for maximum speed and memory savings
        for col in df.select_dtypes(include=["float64"]).columns:
            df[col] = pd.to_numeric(df[col], downcast="float")
        for col in df.select_dtypes(include=["int64"]).columns:
            df[col] = pd.to_numeric(df[col], downcast="integer")

        df.to_parquet(out_parquet, index=False, engine="pyarrow", compression="snappy")
        return out_parquet

    def process_all_pixel_data(self) -> int:
        """Batch process all 42 city-wise pixel datasets into Parquet."""
        pixel_input_dir = Path(self.config["paths"]["interim_pixel_dir"])
        pixel_output_dir = Path("data/processed/pixel_level")
        pixel_output_dir.mkdir(parents=True, exist_ok=True)

        files = sorted(pixel_input_dir.glob("UHI_*_AllYears.csv"))
        logger.info(f"Batch converting {len(files)} city grid CSVs to Parquet...")

        count = 0
        for f in files:
            # Extract city name from filename: UHI_<city>_AllYears.csv
            city_name = f.stem.replace("UHI_", "").replace("_AllYears", "")
            self.clean_and_convert_pixel_data(city_name, f, pixel_output_dir)
            count += 1

        logger.info(f"Successfully converted {count} city grid datasets to Parquet.")
        return count
