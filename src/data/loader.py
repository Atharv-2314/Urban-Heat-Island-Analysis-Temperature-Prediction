"""
Data ingestion and standardization loader for City-Month and Sampled Grid datasets.
"""

from pathlib import Path
from typing import Optional, Tuple
import json
import pandas as pd
import numpy as np

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger("data_loader")


def parse_geojson_coordinates(geo_str: str) -> Tuple[float, float]:
    """
    Extract (latitude, longitude) from GeoJSON string or dictionary.
    GeoJSON coordinates standard is [longitude, latitude].
    Returns (latitude, longitude).
    """
    if pd.isna(geo_str) or not geo_str:
        return np.nan, np.nan
    try:
        if isinstance(geo_str, str):
            geo = json.loads(geo_str)
        else:
            geo = geo_str
        coords = geo.get("coordinates", [])
        if len(coords) >= 2:
            return float(coords[1]), float(coords[0])  # lat, lon
    except Exception as e:
        logger.debug(f"Failed to parse geo string: {e}")
    return np.nan, np.nan


def load_raw_monthly_data(filepath: Optional[str] = None) -> pd.DataFrame:
    """
    Load raw or interim city-month level CSV dataset with standardized column names.
    Ensures missing values in thermal readings remain NaN (never filled with zero).
    """
    config = load_config()
    target_path = Path(filepath or config["paths"]["interim_monthly_merged"])

    if not target_path.exists():
        raise FileNotFoundError(f"Monthly dataset not found at: {target_path}")

    logger.info(f"Loading city-month dataset from: {target_path}")
    df = pd.read_csv(target_path)

    # Standardize column naming
    rename_map = {
        "Air_Temperature": "air_temperature",
        "LST": "lst",
        "Rural_LST": "rural_lst",
        "UHI": "uhi",
        "NDVI": "ndvi",
        "NDBI": "ndbi",
        "NDWI": "ndwi",
        "Population_Density": "population_density",
        "Wind_Speed": "wind_speed",
        "Relative_Humidity_Approx": "relative_humidity",
        "Solar_Radiation_MJ_m2": "solar_radiation",
        "ERA5_Total_Precipitation_mm": "total_precipitation",
        "CHIRPS_Rainfall_mm": "chirps_rainfall",
    }
    df = df.rename(columns=rename_map)

    # Enforce strict types
    df["year"] = df["year"].astype(int)
    df["month"] = df["month"].astype(int)
    df["city"] = df["city"].astype(str).str.strip()
    df["climate_group"] = df["climate_group"].astype(str).str.strip()

    logger.info(f"Loaded {len(df)} records across {df['city'].nunique()} cities.")
    return df


def load_city_pixel_data(city_name: str, filepath: Optional[str] = None) -> pd.DataFrame:
    """
    Load sampled ~1 km grid points for a given city across all years.
    Standardizes coordinate columns and field names.
    """
    config = load_config()
    clean_city = city_name.lower().replace(" ", "")
    default_filename = f"UHI_{clean_city}_AllYears.csv"
    target_path = Path(filepath or Path(config["paths"]["interim_pixel_dir"]) / default_filename)

    if not target_path.exists():
        raise FileNotFoundError(f"Pixel grid dataset for '{city_name}' not found at: {target_path}")

    logger.info(f"Loading sampled ~1 km grid data for {city_name} from: {target_path}")
    df = pd.read_csv(target_path)

    # Parse coordinates from .geo if lat/lon not present
    if ".geo" in df.columns and ("latitude" not in df.columns or "longitude" not in df.columns):
        lats_lons = df[".geo"].apply(parse_geojson_coordinates)
        df["latitude"] = [x[0] for x in lats_lons]
        df["longitude"] = [x[1] for x in lats_lons]

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

    df["year"] = df["year"].astype(int)
    df["month"] = df["month"].astype(int)
    df["city"] = df["city"].astype(str).str.strip()

    logger.info(f"Loaded {len(df)} sampled grid points for {city_name}.")
    return df
