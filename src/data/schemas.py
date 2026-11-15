"""
Schema contracts and data validation models for City-Month and Sampled Grid datasets.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd


@dataclass
class CityMonthRecord:
    """Schema contract for a single city-month observation."""
    city: str
    year: int
    month: int
    climate_group: str
    latitude: float
    longitude: float
    air_temperature: float
    lst: Optional[float]
    rural_lst: Optional[float]
    uhi: Optional[float]
    ndvi: Optional[float]
    ndbi: Optional[float]
    ndwi: Optional[float]
    population_density: Optional[float]
    wind_speed: Optional[float]
    relative_humidity: Optional[float]
    solar_radiation: Optional[float]
    total_precipitation: Optional[float]
    chirps_rainfall: Optional[float]
    split: str

    @classmethod
    def validate_row(cls, row: pd.Series) -> "CityMonthRecord":
        """Validate and construct a record from a pandas series."""
        # Check strict physical & logical types
        year = int(row["year"])
        month = int(row["month"])
        if not (2016 <= year <= 2025):
            raise ValueError(f"Year {year} outside study scope 2016-2025.")
        if not (1 <= month <= 12):
            raise ValueError(f"Month {month} invalid.")

        lat = float(row["latitude"])
        lon = float(row["longitude"])
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            raise ValueError(f"Coordinates ({lat}, {lon}) out of global bounds.")

        def safe_float(val: Any) -> Optional[float]:
            if pd.isna(val) or val is None:
                return None
            return float(val)

        return cls(
            city=str(row["city"]),
            year=year,
            month=month,
            climate_group=str(row["climate_group"]),
            latitude=lat,
            longitude=lon,
            air_temperature=float(row["Air_Temperature"]),
            lst=safe_float(row.get("LST")),
            rural_lst=safe_float(row.get("Rural_LST")),
            uhi=safe_float(row.get("UHI")),
            ndvi=safe_float(row.get("NDVI")),
            ndbi=safe_float(row.get("NDBI")),
            ndwi=safe_float(row.get("NDWI")),
            population_density=safe_float(row.get("Population_Density")),
            wind_speed=safe_float(row.get("Wind_Speed")),
            relative_humidity=safe_float(row.get("Relative_Humidity_Approx")),
            solar_radiation=safe_float(row.get("Solar_Radiation_MJ_m2")),
            total_precipitation=safe_float(row.get("ERA5_Total_Precipitation_mm")),
            chirps_rainfall=safe_float(row.get("CHIRPS_Rainfall_mm")),
            split=str(row.get("split", "train")),
        )


@dataclass
class PixelGridRecord:
    """Schema contract for a single sampled ~1 km grid point observation."""
    city: str
    year: int
    month: int
    climate_group: str
    latitude: float
    longitude: float
    air_temperature: float
    lst: Optional[float]
    uhi: Optional[float]
    ndvi: Optional[float]
    ndbi: Optional[float]
    ndwi: Optional[float]
    population_density: Optional[float]
    wind_speed: Optional[float]
    relative_humidity: Optional[float]
    solar_radiation: Optional[float]
    rainfall: Optional[float]
    split: str

    @classmethod
    def validate_row(cls, row: pd.Series, lat: float, lon: float) -> "PixelGridRecord":
        """Validate and construct a sampled ~1 km grid record."""
        year = int(row["Year"])
        month = int(row["Month"])
        if not (2016 <= year <= 2025):
            raise ValueError(f"Year {year} outside study scope 2016-2025.")
        if not (1 <= month <= 12):
            raise ValueError(f"Month {month} invalid.")

        def safe_float(val: Any) -> Optional[float]:
            if pd.isna(val) or val is None:
                return None
            return float(val)

        return cls(
            city=str(row["City"]),
            year=year,
            month=month,
            climate_group=str(row["Climate_Group"]),
            latitude=lat,
            longitude=lon,
            air_temperature=float(row["Air_Temperature"]),
            lst=safe_float(row.get("LST")),
            uhi=safe_float(row.get("UHI")),
            ndvi=safe_float(row.get("NDVI")),
            ndbi=safe_float(row.get("NDBI")),
            ndwi=safe_float(row.get("NDWI")),
            population_density=safe_float(row.get("Population_Density")),
            wind_speed=safe_float(row.get("Wind_Speed")),
            relative_humidity=safe_float(row.get("Relative_Humidity")),
            solar_radiation=safe_float(row.get("Solar_Radiation")),
            rainfall=safe_float(row.get("ERA5_Rainfall")),
            split=str(row.get("Split", "train")),
        )
